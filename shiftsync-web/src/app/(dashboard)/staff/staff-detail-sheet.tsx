'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { UserSummary } from '@/lib/api/server/users';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { RoleGate } from '@/components/shared/RoleGate';
import { AvailabilityEditor } from './availability-editor';
import { UserIcon, WrenchIcon, AwardIcon, CalendarIcon, ClockIcon, TrendingUpIcon } from 'lucide-react';

type TabId = 'profile' | 'skills' | 'certifications' | 'availability' | 'schedule' | 'overtime';

interface StaffDetailSheetProps {
  user: UserSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

async function fetchUserDetail(id: string) {
  const { data } = await apiClient.get<UserSummary>(`/users/${id}`);
  return data;
}

async function fetchAssignments(userId: string, start: string, end: string) {
  const { data } = await apiClient.get(`/users/${userId}/assignments?startDate=${start}&endDate=${end}`);
  return data;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <UserIcon className="size-3" /> },
  { id: 'skills', label: 'Skills', icon: <WrenchIcon className="size-3" /> },
  { id: 'certifications', label: 'Certifications', icon: <AwardIcon className="size-3" /> },
  { id: 'availability', label: 'Availability', icon: <CalendarIcon className="size-3" /> },
  { id: 'schedule', label: 'Schedule', icon: <ClockIcon className="size-3" /> },
  { id: 'overtime', label: 'Overtime', icon: <TrendingUpIcon className="size-3" /> },
];

export function StaffDetailSheet({
  user,
  open,
  onOpenChange,
  onClose,
}: StaffDetailSheetProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(user?.id ?? ''),
    queryFn: () => fetchUserDetail(user!.id),
    enabled: open && !!user?.id,
  });

  const u = detail ?? user;

  const handleClose = (open: boolean) => {
    if (!open) onClose();
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          {u && (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {u.firstName[0]}
                    {u.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>
                    {u.firstName} {u.lastName}
                  </SheetTitle>
                  <SheetDescription>{u.email}</SheetDescription>
                  <Badge variant="secondary" className="mt-1">
                    {u.role}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </SheetHeader>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-2">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'secondary' : 'ghost'}
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {!u && isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {u && activeTab === 'profile' && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Desired hours per week</p>
                <p className="font-medium text-slate-100">{u.desiredHoursPerWeek ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Notifications</p>
                <p className="text-slate-200">
                  In-app: {u.notifyInApp ? 'On' : 'Off'} · Email: {u.notifyEmail ? 'On' : 'Off'}
                </p>
              </div>
              <p className="text-slate-500">Profile editing can be added here (name, email, desired hours, notification prefs).</p>
            </div>
          )}
          {u && activeTab === 'skills' && (
            <div className="space-y-3">
              <RoleGate role="admin">
                <p className="text-xs text-slate-500">Admin can add/remove skills.</p>
              </RoleGate>
              <div className="flex flex-wrap gap-2">
                {(u.skills ?? []).map((s) => (
                  <Badge key={s.id} variant="outline">
                    {s.name}
                  </Badge>
                ))}
                {(!u.skills || u.skills.length === 0) && (
                  <span className="text-slate-500">No skills assigned.</span>
                )}
              </div>
            </div>
          )}
          {u && activeTab === 'certifications' && (
            <div className="space-y-3">
              <RoleGate role="admin">
                <p className="text-xs text-slate-500">Admin can revoke with reason.</p>
              </RoleGate>
              <ul className="space-y-2">
                {(u.locationCertifications ?? [])
                  .filter((c) => !c.revokedAt)
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md bg-slate-800/50 px-2 py-1.5">
                      <span className="text-slate-200">{c.location?.name ?? c.locationId}</span>
                      <Badge variant="outline">Certified</Badge>
                    </li>
                  ))}
                {(u.locationCertifications ?? []).filter((c) => c.revokedAt).length > 0 && (
                  <li className="text-xs text-slate-500">Revocation history available.</li>
                )}
                {(!u.locationCertifications || u.locationCertifications.filter((c) => !c.revokedAt).length === 0) && (
                  <li className="text-slate-500">No certified locations.</li>
                )}
              </ul>
            </div>
          )}
          {u && activeTab === 'availability' && (
            <AvailabilityEditor userId={u.id} />
          )}
          {u && activeTab === 'schedule' && (
            <StaffScheduleTab userId={u.id} />
          )}
          {u && activeTab === 'overtime' && (
            <div className="space-y-2 text-sm text-slate-400">
              <p>Current week hours and trend chart (last 8 weeks) — Section 5.2.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StaffScheduleTab({ userId }: { userId: string }) {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const end = new Date();
  end.setDate(end.getDate() + 14);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data: assignments, isLoading } = useQuery({
    queryKey: queryKeys.users.assignments(userId, startStr, endStr),
    queryFn: () => fetchAssignments(userId, startStr, endStr),
    enabled: !!userId,
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const list = Array.isArray(assignments) ? assignments : [];
  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-500">Upcoming / past shifts</p>
      {list.length === 0 ? (
        <p className="text-slate-400">No assignments in this range.</p>
      ) : (
        <ul className="space-y-1">
          {list.slice(0, 10).map((a: { id: string; shift?: { title?: string; startAt?: string } }) => (
            <li key={a.id} className="rounded border border-slate-700 px-2 py-1 text-slate-200">
              {a.shift?.title ?? 'Shift'} · {a.shift?.startAt ? new Date(a.shift.startAt).toLocaleString() : '—'}
            </li>
          ))}
          {list.length > 10 && <p className="text-slate-500">+{list.length - 10} more</p>}
        </ul>
      )}
    </div>
  );
}
