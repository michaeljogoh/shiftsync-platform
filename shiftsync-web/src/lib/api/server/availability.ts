import 'server-only';

import { serverFetch } from './client';

export interface AvailabilityWindow {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface AvailabilityException {
  id: string;
  userId: string;
  exceptionDate: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export interface AvailabilityResponse {
  windows: AvailabilityWindow[];
  exceptions: AvailabilityException[];
}

export async function fetchAvailability(
  userId: string,
  params?: { token?: string },
): Promise<AvailabilityResponse> {
  return serverFetch<AvailabilityResponse>(`/users/${userId}/availability`, {
    token: params?.token,
    tags: ['users', userId, 'availability'],
  });
}
