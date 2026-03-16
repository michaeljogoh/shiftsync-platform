import 'server-only';

import { serverFetch } from './client';

export interface OvertimeRow {
  userId: string;
  name: string;
  projectedHours: number;
}

export interface HoursDistributionRow {
  userId: string;
  name: string;
  totalHours: number;
}

export interface FairnessRow {
  userId: string;
  name: string;
  premiumShiftsAssigned: number;
  totalShiftsAssigned: number;
  premiumRatio: number;
  deviationFromAverage?: number;
  flagged?: boolean;
}

export interface FairnessResponse {
  fairnessScore: number;
  averagePremiumRatio: number;
  standardDeviation?: number;
  staff: FairnessRow[];
}

export async function fetchOvertime(params: {
  locationId?: string;
  weekStart?: string;
  token?: string;
}): Promise<OvertimeRow[]> {
  const search = new URLSearchParams();
  if (params.locationId) search.set('locationId', params.locationId);
  if (params.weekStart) search.set('weekStart', params.weekStart);
  return serverFetch<OvertimeRow[]>(`/analytics/overtime?${search.toString()}`, {
    token: params.token,
    tags: ['analytics'],
  });
}

export async function fetchHoursDistribution(params: {
  locationId?: string;
  startDate: string;
  endDate: string;
  token?: string;
}): Promise<HoursDistributionRow[]> {
  const search = new URLSearchParams();
  if (params.locationId) search.set('locationId', params.locationId);
  search.set('startDate', params.startDate);
  search.set('endDate', params.endDate);
  return serverFetch<HoursDistributionRow[]>(`/analytics/hours-distribution?${search.toString()}`, {
    token: params.token,
    tags: ['analytics'],
  });
}

export async function fetchFairness(params: {
  locationId: string;
  startDate?: string;
  endDate?: string;
  token?: string;
}): Promise<FairnessResponse> {
  const search = new URLSearchParams();
  search.set('locationId', params.locationId);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  return serverFetch<FairnessResponse>(`/analytics/fairness?${search.toString()}`, {
    token: params.token,
    tags: ['analytics'],
  });
}
