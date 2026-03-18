import { serverFetch } from './client';

export interface ShiftSummary {
  id: string;
  title: string | null;
  locationId: string;
  location?: { id: string; name: string; ianaTimezone?: string };
  requiredSkillId?: string;
  requiredSkill?: { id: string; name: string };
  startAt: string;
  endAt: string;
  status: 'draft' | 'published' | 'cancelled';
  headcountNeeded: number;
  editCutoffHours?: number;
  isPremium?: boolean;
  assignments?: { id: string; user?: { id: string; firstName: string; lastName: string } }[];
}

function weekToStartEnd(weekIso: string): { startDate: string; endDate: string } {
  const d = new Date(weekIso + 'T12:00:00.000Z');
  const day = d.getUTCDay();
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  const f = (x: Date) =>
    `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
  return { startDate: f(start), endDate: f(end) };
}

export async function fetchShiftsForWeek(params: {
  locationId?: string;
  locationIds?: string[];
  week: string;
  token?: string;
}): Promise<ShiftSummary[]> {
  const { startDate, endDate } = weekToStartEnd(params.week);
  const search = new URLSearchParams();
  if (params.locationId) search.set('locationId', params.locationId);
  search.set('startDate', startDate);
  search.set('endDate', endDate);

  const data = await serverFetch<ShiftSummary[]>(`/shifts?${search.toString()}`, {
    token: params.token,
    tags: ['shifts'],
  });
  return data;
}

