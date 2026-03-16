import { serverFetch } from './client';

export interface ShiftSummary {
  id: string;
  title: string | null;
  locationId: string;
  startAt: string;
  endAt: string;
  status: 'draft' | 'published' | 'cancelled';
  headcountNeeded: number;
}

export async function fetchShiftsForWeek(params: {
  locationId?: string;
  week: string;
  token?: string;
}): Promise<ShiftSummary[]> {
  const search = new URLSearchParams();
  if (params.locationId) search.set('locationId', params.locationId);
  search.set('week', params.week);

  return serverFetch<ShiftSummary[]>(`/shifts?${search.toString()}`, {
    token: params.token,
    tags: ['shifts'],
  });
}

