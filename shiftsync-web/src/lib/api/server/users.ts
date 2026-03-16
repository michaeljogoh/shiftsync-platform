import 'server-only';

import { serverFetch } from './client';

export interface UserSkill {
  id: string;
  name: string;
}

export interface UserLocationCertification {
  id: string;
  locationId: string;
  location?: { id: string; name: string };
  revokedAt: string | null;
  revokedReason?: string | null;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'staff';
  isActive: boolean;
  desiredHoursPerWeek: string | null;
  notifyInApp: boolean;
  notifyEmail: boolean;
  skills?: UserSkill[];
  locationCertifications?: UserLocationCertification[];
  managedLocations?: { id: string; name: string }[];
}

export async function fetchUsers(params: {
  role?: 'admin' | 'manager' | 'staff';
  locationId?: string;
  skillId?: string;
  token?: string;
}): Promise<UserSummary[]> {
  const search = new URLSearchParams();
  if (params.role) search.set('role', params.role);
  if (params.locationId) search.set('locationId', params.locationId);
  if (params.skillId) search.set('skillId', params.skillId);
  return serverFetch<UserSummary[]>(`/users?${search.toString()}`, {
    token: params.token,
    tags: ['users'],
  });
}

export async function fetchUser(
  id: string,
  params?: { token?: string },
): Promise<UserSummary> {
  return serverFetch<UserSummary>(`/users/${id}`, {
    token: params?.token,
    tags: ['users', id],
  });
}
