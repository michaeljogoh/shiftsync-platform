/**
 * Auth types mirroring backend exactly.
 * Single source of truth for Role, Permission, SessionUser, Session.
 */

export type Role = 'admin' | 'manager' | 'staff';

export type Permission = string; // e.g. 'shifts:publish', 'assignments:override'

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
}

export interface Session {
  user: SessionUser;
  role: Role;
  permissions: Record<string, string[]>; // nested: { shifts: ['view','create',...] }
  features: Permission[]; // flat: ['shifts:view','shifts:create',...]
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  session: Session;
}
