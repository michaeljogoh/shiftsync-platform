'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import type { Role } from '@/types/auth';

export interface RoleGateProps {
  role: Role | Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only if the user has the required role (or one of the roles).
 */
export function RoleGate({ role, fallback = null, children }: RoleGateProps) {
  const is = useAuthStore((s) => s.is);
  return is(role) ? <>{children}</> : <>{fallback}</>;
}
