'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { Role } from '@/types/auth';

export interface RoleGateProps {
  role: Role | Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGate({ role, fallback = null, children }: RoleGateProps) {
  const is = useAuthStore((s) => s.is);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return is(role) ? <>{children}</> : <>{fallback}</>;
}
