'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import type { Permission } from '@/types/auth';

export interface PermissionGateProps {
  require: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only if the user has the required feature permission.
 * Use can() for O(1) lookup via session.features.
 */
export function PermissionGate({ require: permission, fallback = null, children }: PermissionGateProps) {
  const can = useAuthStore((s) => s.can);
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
