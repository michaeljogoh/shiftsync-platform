import type { Permission, Resource } from './permissions.config';

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'staff';
  features: Permission[];
}

export interface SessionPayload {
  user: {
    id: string;
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
  };
  role: 'admin' | 'manager' | 'staff';
  permissions: Record<Resource, string[]>;
  features: Permission[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

