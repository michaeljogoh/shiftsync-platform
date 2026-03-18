'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { UserSummary } from '@/lib/api/server/users';
import { formatShiftTimeRange } from '@/lib/format-shift-time';
import { RoleGate } from '@/components/shared/RoleGate';
import { AvailabilityEditor } from './availability-editor';
import {
  UserIcon,
  WrenchIcon,
  AwardIcon,
  CalendarIcon,
  ClockIcon,
  TrendingUpIcon,
  PlusIcon,
  XIcon,
  ShieldOffIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type TabId = 'profile' | 'skills' | 'certifications' | 'availability' | 'schedule' | 'overtime';

interface StaffDetailSheetProps {
  user: UserSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <UserIcon className="size-3" /> },
  { id: 'skills', label: 'Skills', icon: <WrenchIcon className="size-3" /> },
  { id: 'certifications', label: 'Certs', icon: <AwardIcon className="size-3" /> },
  { id: 'availability', label: 'Availability', icon: <CalendarIcon className="size-3" /> },
  { id: 'schedule', label: 'Schedule', icon: <ClockIcon className="size-3" /> },
  { id: 'overtime', label: 'Overtime', icon: <TrendingUpIcon className="size-3" /> },
];

export function StaffDetailSheet({ user, open, onOpenChange, onClose }: StaffDetailSheetProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<UserSummary>(`/users/${user!.id}`);
      return data;
    },
    enabled: open && !!user?.id,
  });

  const u = detail ?? user;

  const handleClose = (open: boolean) => {
    if (!open) onClose();
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex w-full flex-col p-4 sm:!max-w-md lg:!max-w-2xl overflow-hidden">
        <SheetHeader>
          {u && (
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-base">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle>{u.firstName} {u.lastName}</SheetTitle>
                <SheetDescription>{u.email}</SheetDescription>
                <Badge variant="secondary" className="mt-1">{u.role}</Badge>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex gap-1 overflow-x-auto border-b border-border pb-2 shrink-0">
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

        <div className="min-h-0 flex-1 overflow-auto py-2">
          {!u && isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {u && activeTab === 'profile' && <ProfileTab user={u} onUpdated={() => queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(u.id) })} />}
          {u && activeTab === 'skills' && <SkillsTab user={u} onUpdated={() => queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(u.id) })} />}
          {u && activeTab === 'certifications' && <CertificationsTab user={u} onUpdated={() => queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(u.id) })} />}
          {u && activeTab === 'availability' && <AvailabilityEditor userId={u.id} />}
          {u && activeTab === 'schedule' && <StaffScheduleTab userId={u.id} />}
          {u && activeTab === 'overtime' && <OvertimeTab userId={u.id} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProfileTab({ user, onUpdated }: { user: UserSummary; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      desiredHoursPerWeek: user.desiredHoursPerWeek ?? '',
    },
  });

  async function onSubmit(data: { firstName: string; lastName: string; phone: string; desiredHoursPerWeek: string | number }) {
    try {
      await apiClient.patch(`/users/${user.id}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        desiredHoursPerWeek: data.desiredHoursPerWeek ? Number(data.desiredHoursPerWeek) : null,
      });
      toast.success('Profile updated');
      setEditing(false);
      onUpdated();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update');
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">First name</label>
            <Input {...register('firstName', { required: true })} className="h-8" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Last name</label>
            <Input {...register('lastName', { required: true })} className="h-8" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <Input {...register('phone')} className="h-8" placeholder="+1 555 000 0000" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Desired hours/week</label>
          <Input {...register('desiredHoursPerWeek')} type="number" className="h-8" min={0} max={60} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSubmitting}>Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="text-foreground">{user.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Desired hrs/week</p>
          <p className="text-foreground">{user.desiredHoursPerWeek ?? '—'}</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Notifications</p>
        <p className="text-foreground">In-app: {user.notifyInApp ? 'On' : 'Off'} · Email: {user.notifyEmail ? 'On' : 'Off'}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Status</p>
        <Badge variant={user.isActive ? 'default' : 'destructive'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>
      <RoleGate role={['admin', 'manager']}>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit profile
        </Button>
      </RoleGate>
    </div>
  );
}

function SkillsTab({ user, onUpdated }: { user: UserSummary; onUpdated: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [actioning, setActioning] = useState(false);

  const { data: allSkills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ id: string; name: string }[]>('/skills');
      return data;
    },
    enabled: addOpen,
  });

  const currentSkillIds = new Set((user.skills ?? []).map((s) => s.id));
  const available = allSkills.filter((s) => !currentSkillIds.has(s.id));

  async function addSkill() {
    if (!selectedSkillId) return;
    setActioning(true);
    try {
      await apiClient.post(`/users/${user.id}/skills`, { skillId: selectedSkillId });
      toast.success('Skill added');
      setAddOpen(false);
      setSelectedSkillId('');
      onUpdated();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally {
      setActioning(false);
    }
  }

  async function removeSkill(skillId: string) {
    try {
      await apiClient.delete(`/users/${user.id}/skills/${skillId}`);
      toast.success('Skill removed');
      onUpdated();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(user.skills ?? []).map((s) => (
          <div key={s.id} className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-sm">
            <span className="text-foreground">{s.name}</span>
            <RoleGate role={['admin']}>
              <button onClick={() => removeSkill(s.id)} className="text-muted-foreground hover:text-destructive">
                <XIcon className="size-3" />
              </button>
            </RoleGate>
          </div>
        ))}
        {(!user.skills || user.skills.length === 0) && (
          <p className="text-sm text-muted-foreground">No skills assigned.</p>
        )}
      </div>
      <RoleGate role={['admin']}>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <PlusIcon className="mr-1 size-3" /> Add skill
        </Button>
      </RoleGate>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add skill</DialogTitle>
          </DialogHeader>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
          >
            <option value="">— Select skill —</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addSkill} disabled={!selectedSkillId || actioning}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CertificationsTab({ user, onUpdated }: { user: UserSummary; onUpdated: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; locationName: string } | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actioning, setActioning] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ id: string; name: string }[]>('/locations');
      return data;
    },
    enabled: addOpen,
  });

  const activeCerts = (user.locationCertifications ?? []).filter((c) => !c.revokedAt);
  const certifiedLocationIds = new Set(activeCerts.map((c) => c.locationId));
  const available = locations.filter((l) => !certifiedLocationIds.has(l.id));

  async function addCert() {
    if (!selectedLocationId) return;
    setActioning(true);
    try {
      await apiClient.post(`/users/${user.id}/certifications`, { locationId: selectedLocationId });
      toast.success('Certification added');
      setAddOpen(false);
      setSelectedLocationId('');
      onUpdated();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally {
      setActioning(false);
    }
  }

  async function revokeCert() {
    if (!revokeTarget) return;
    setActioning(true);
    try {
      await apiClient.delete(`/users/${user.id}/certifications/${revokeTarget.id}`, {
        data: { reason: revokeReason || 'Revoked by admin' },
      });
      toast.success('Certification revoked');
      setRevokeTarget(null);
      setRevokeReason('');
      onUpdated();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    } finally {
      setActioning(false);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {activeCerts.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-sm text-foreground">{c.location?.name ?? c.locationId}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Certified</Badge>
              <RoleGate role={['admin']}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => setRevokeTarget({ id: c.locationId, locationName: c.location?.name ?? c.locationId })}
                >
                  <ShieldOffIcon className="size-3" />
                </Button>
              </RoleGate>
            </div>
          </li>
        ))}
        {activeCerts.length === 0 && <p className="text-sm text-muted-foreground">No certified locations.</p>}
      </ul>

      {(user.locationCertifications ?? []).filter((c) => c.revokedAt).length > 0 && (
        <p className="text-xs text-muted-foreground">
          {(user.locationCertifications ?? []).filter((c) => c.revokedAt).length} revoked certification(s) in history.
        </p>
      )}

      <RoleGate role={['admin']}>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <PlusIcon className="mr-1 size-3" /> Add certification
        </Button>
      </RoleGate>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add location certification</DialogTitle>
          </DialogHeader>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
          >
            <option value="">— Select location —</option>
            {available.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addCert} disabled={!selectedLocationId || actioning}>Certify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke certification</DialogTitle>
            <DialogDescription>Revoke {user.firstName}&apos;s certification for {revokeTarget?.locationName}. Historical assignments are preserved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Reason for revocation"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={revokeCert} disabled={actioning}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${userId}/assignments?startDate=${startStr}&endDate=${endStr}`);
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const list = Array.isArray(assignments) ? assignments : [];

  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-muted-foreground">Upcoming and recent shifts (±2 weeks)</p>
      {list.length === 0 ? (
        <p className="text-muted-foreground">No assignments in this range.</p>
      ) : (
        <ul className="space-y-1">
          {list.slice(0, 15).map((a: {
            id: string;
            status: string;
            shift?: { title?: string; startAt?: string; endAt?: string; location?: { name?: string; ianaTimezone?: string } };
          }) => {
            const shift = a.shift;
            const timeLabel = shift?.startAt && shift?.endAt
              ? formatShiftTimeRange({ startAt: shift.startAt, endAt: shift.endAt, locationTimezone: shift.location?.ianaTimezone ?? 'UTC' }).primary
              : shift?.startAt ? new Date(shift.startAt).toLocaleString() : '—';
            return (
              <li key={a.id} className="flex items-center justify-between rounded border border-border px-2 py-1.5">
                <div>
                  <span className="text-sm text-foreground">{shift?.title ?? 'Shift'}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{timeLabel}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{a.status}</Badge>
              </li>
            );
          })}
          {list.length > 15 && <p className="text-xs text-muted-foreground">+{list.length - 15} more</p>}
        </ul>
      )}
    </div>
  );
}

function OvertimeTab({ userId }: { userId: string }) {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() - i * 7);
    return d.toISOString().slice(0, 10);
  }).reverse();

  const weekQueries = useQuery({
    queryKey: ['user-overtime-history', userId],
    queryFn: async () => {
      const results = await Promise.all(
        weeks.map(async (weekStart) => {
          try {
            const { data } = await apiClient.get<{ userId: string; name: string; projectedHours: number }[]>(
              `/analytics/overtime?weekStart=${weekStart}`,
            );
            const row = data.find((r) => r.userId === userId);
            return { weekStart, hours: row?.projectedHours ?? 0 };
          } catch {
            return { weekStart, hours: 0 };
          }
        }),
      );
      return results;
    },
    enabled: !!userId,
  });

  if (weekQueries.isLoading) return <Skeleton className="h-48 w-full" />;

  const chartData = (weekQueries.data ?? []).map((d) => ({
    week: new Date(d.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: d.hours,
  }));

  const latest = chartData[chartData.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">This week</p>
          <p className={`text-2xl font-bold ${latest?.hours >= 40 ? 'text-destructive' : latest?.hours >= 35 ? 'text-amber-500' : 'text-foreground'}`}>
            {latest?.hours ?? 0}h
          </p>
        </div>
        {latest?.hours >= 40 && (
          <Badge variant="destructive">Overtime</Badge>
        )}
        {latest?.hours >= 35 && latest.hours < 40 && (
          <Badge variant="outline" className="border-amber-400 text-amber-600">Approaching OT</Badge>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">8-week history</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 60]} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
              formatter={(v: number) => [`${v}h`, 'Hours']}
            />
            <ReferenceLine y={40} stroke="var(--destructive)" strokeDasharray="3 3" label={{ value: '40h', fontSize: 10 }} />
            <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '35h', fontSize: 10 }} />
            <Bar
              dataKey="hours"
              radius={[3, 3, 0, 0]}
              fill="hsl(var(--primary))"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
