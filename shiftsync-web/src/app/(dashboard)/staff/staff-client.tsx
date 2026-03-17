'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { UserSummary } from '@/lib/api/server/users';
import type { LocationSummary } from '@/lib/api/server/locations';
import type { SkillSummary } from '@/lib/api/server/skills';
import { FullPageError } from '@/components/shared/FullPageError';
import { PermissionDenied } from '@/components/shared/PermissionDenied';
import { StaffTableSkeleton } from '@/components/shared/StaffTableSkeleton';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StaffDetailSheet } from './staff-detail-sheet';

async function fetchUsersClient(filters: {
  role?: string;
  locationId?: string;
  skillId?: string;
}): Promise<UserSummary[]> {
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (filters.locationId) params.set('locationId', filters.locationId);
  if (filters.skillId) params.set('skillId', filters.skillId);
  const { data } = await apiClient.get<UserSummary[]>(`/users?${params.toString()}`);
  return data;
}

interface StaffClientProps {
  locations: LocationSummary[];
  skills: SkillSummary[];
}

export function StaffClient({ locations, skills }: StaffClientProps) {
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<boolean | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filters = useMemo(
    () => ({
      role: roleFilter || undefined,
      locationId: locationFilter || undefined,
      skillId: skillFilter || undefined,
    }),
    [roleFilter, locationFilter, skillFilter],
  );

  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users.all(filters),
    queryFn: () => fetchUsersClient(filters),
  });

  const statusCode = (error as { response?: { status?: number } })?.response?.status;

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return users;
    return users.filter((u) => u.isActive === activeFilter);
  }, [users, activeFilter]);

  const openDetail = (user: UserSummary) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Staff</h1>
      </div>

      <PermissionGate require="users:view" fallback={<p className="text-sm text-slate-400">You don&apos;t have permission to view the staff list.</p>}>
        <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <select
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
          <select
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          >
            <option value="">All skills</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
            value={activeFilter === 'all' ? 'all' : activeFilter ? 'active' : 'inactive'}
            onChange={(e) =>
              setActiveFilter(
                e.target.value === 'all' ? 'all' : e.target.value === 'active',
              )
            }
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {isLoading && <StaffTableSkeleton />}
        {isError && (
          <>
            {statusCode === 403 ? (
              <PermissionDenied />
            ) : (
              <FullPageError
                message={(error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to load staff. Please try again.'}
                onRetry={() => refetch()}
              />
            )}
          </>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/70">
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Staff</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Skills</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Certified locations</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Hours this week</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer border-b border-slate-800 transition hover:bg-slate-800/50"
                    onClick={() => openDetail(user)}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-100">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{user.role}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(user.skills ?? []).map((s) => (
                          <Badge key={s.id} variant="outline" className="text-xs">
                            {s.name}
                          </Badge>
                        ))}
                        {(!user.skills || user.skills.length === 0) && (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(user.locationCertifications ?? [])
                          .filter((c) => !c.revokedAt)
                          .map((c) => (
                            <Badge key={c.id} variant="outline" className="text-xs">
                              {c.location?.name ?? c.locationId}
                            </Badge>
                          ))}
                        {(!user.locationCertifications ||
                          user.locationCertifications.filter((c) => !c.revokedAt).length === 0) && (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-400">—</td>
                    <td className="px-3 py-2">
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
                <p className="text-sm font-medium text-slate-300">No staff match the filters.</p>
                <p className="mt-1 text-xs text-slate-500">Try changing filters or add staff from your admin.</p>
              </div>
            )}
          </div>
        )}
      </PermissionGate>

      <StaffDetailSheet
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
