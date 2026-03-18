'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { Permission } from '@/types/auth';

export interface PermissionGateProps {
  require: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ require: permission, fallback = null, children }: PermissionGateProps) {
  const can = useAuthStore((s) => s.can);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
