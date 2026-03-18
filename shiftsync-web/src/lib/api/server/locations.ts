import 'server-only';

import { serverFetch } from './client';

export interface LocationSummary {
  id: string;
  name: string;
  ianaTimezone: string;
}

export async function fetchLocations(params?: { token?: string }): Promise<LocationSummary[]> {
  return serverFetch<LocationSummary[]>('/locations', {
    token: params?.token,
    tags: ['locations'],
  });
}
