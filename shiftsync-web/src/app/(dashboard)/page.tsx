'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { RoleGate } from '@/components/shared/RoleGate';
import { formatShiftTimeRange } from '@/lib/format-shift-time';
import Link from 'next/link';
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  CalendarIcon,
  ClockIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color = 'default',
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
  color?: 'default' | 'warning' | 'danger';
  loading?: boolean;
}) {
  const colorClass =
    color === 'danger'
      ? 'text-destructive'
      : color === 'warning'
        ? 'text-amber-500'
        : 'text-foreground';

  const content = (
    <Card className="border-border bg-card hover:bg-muted/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`size-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardIndexPage() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const role = session?.role;

  const today = new Date();
  const weekStart = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const { data: myAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['dashboard', 'my-assignments', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{
        id: string;
        status: string;
        shift?: {
          id: string;
          title: string | null;
          startAt: string;
          endAt: string;
          status: string;
          location?: { name: string; ianaTimezone: string };
        };
      }>>(`/users/${userId}/assignments?startDate=${today.toISOString().slice(0, 10)}&endDate=${weekEndStr}`);
      return data;
    },
    enabled: !!userId,
  });

  const { data: pendingSwaps = [], isLoading: swapsLoading } = useQuery({
    queryKey: ['dashboard', 'pending-swaps'],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{ id: string; status: string; type: string }>>('/swaps?status=pending_manager');
      return data;
    },
    enabled: role === 'admin' || role === 'manager',
  });

  const { data: overtime = [], isLoading: overtimeLoading } = useQuery({
    queryKey: ['dashboard', 'overtime', weekStart],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{ userId: string; name: string; projectedHours: number }>>(
        `/analytics/overtime?weekStart=${weekStart}`,
      );
      return data;
    },
    enabled: role === 'admin' || role === 'manager',
  });

  const { data: understaffed = [], isLoading: understaffedLoading } = useQuery({
    queryKey: ['dashboard', 'understaffed'],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{ shiftId: string; title: string; needed: number; assigned: number }>>(
        `/analytics/understaffed?startDate=${today.toISOString().slice(0, 10)}&endDate=${weekEndStr}`,
      );
      return data;
    },
    enabled: role === 'admin' || role === 'manager',
  });

  const { data: mySwaps = [], isLoading: mySwapsLoading } = useQuery({
    queryKey: ['dashboard', 'my-swaps', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{ id: string; status: string; type: string }>>(`/users/${userId}/swaps`);
      return data;
    },
    enabled: !!userId && role === 'staff',
  });

  const upcomingShifts = myAssignments
    .filter((a) => a.status !== 'cancelled' && a.shift)
    .slice(0, 5);

  const overCritical = overtime.filter((o) => o.projectedHours >= 40);

  const firstName = session?.user?.firstName ?? 'there';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' · '}
          <span className="capitalize">{role}</span>
        </p>
      </div>

      {/* Manager / Admin stats */}
      <RoleGate role={['admin', 'manager']}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending approvals"
            value={pendingSwaps.length}
            icon={ArrowLeftRightIcon}
            href="/swaps"
            color={pendingSwaps.length > 0 ? 'warning' : 'default'}
            loading={swapsLoading}
          />
          <StatCard
            title="Understaffed shifts"
            value={understaffed.length}
            icon={AlertTriangleIcon}
            href="/schedule"
            color={understaffed.length > 0 ? 'danger' : 'default'}
            loading={understaffedLoading}
          />
          <StatCard
            title="At/near overtime"
            value={overtime.length}
            icon={TrendingUpIcon}
            href="/analytics"
            color={overCritical.length > 0 ? 'danger' : overtime.length > 0 ? 'warning' : 'default'}
            loading={overtimeLoading}
          />
          <StatCard
            title="My upcoming shifts"
            value={upcomingShifts.length}
            icon={CalendarIcon}
            href="/schedule"
            loading={assignmentsLoading}
          />
        </div>
      </RoleGate>

      {/* Staff stats */}
      <RoleGate role={['staff']}>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Upcoming shifts (7 days)"
            value={upcomingShifts.length}
            icon={CalendarIcon}
            href="/schedule"
            loading={assignmentsLoading}
          />
          <StatCard
            title="My pending requests"
            value={mySwaps.filter((s) => s.status === 'pending_target' || s.status === 'pending_manager').length}
            icon={ArrowLeftRightIcon}
            href="/swaps"
            loading={mySwapsLoading}
          />
        </div>
      </RoleGate>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming shifts */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My upcoming shifts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/schedule">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : upcomingShifts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No upcoming shifts this week</div>
            ) : (
              <ul className="space-y-2">
                {upcomingShifts.map((a) => {
                  const shift = a.shift!;
                  const tz = shift.location?.ianaTimezone ?? 'UTC';
                  const { primary } = formatShiftTimeRange({ startAt: shift.startAt, endAt: shift.endAt, locationTimezone: tz });
                  return (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{shift.title ?? 'Shift'}</p>
                        <p className="text-xs text-muted-foreground">{primary} · {shift.location?.name}</p>
                      </div>
                      <Badge variant={shift.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                        {shift.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Manager: understaffed shifts */}
        <RoleGate role={['admin', 'manager']}>
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangleIcon className="size-4 text-amber-500" />
                Understaffed shifts
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/schedule">Schedule</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {understaffedLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : understaffed.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">All published shifts are fully staffed</div>
              ) : (
                <ul className="space-y-2">
                  {understaffed.slice(0, 6).map((s) => (
                    <li key={s.shiftId} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                        {s.assigned}/{s.needed} filled
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </RoleGate>

        {/* Manager: overtime warnings */}
        <RoleGate role={['admin', 'manager']}>
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUpIcon className="size-4 text-amber-500" />
                Overtime risks this week
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/analytics">Analytics</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {overtimeLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : overtime.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No overtime risks this week</div>
              ) : (
                <ul className="space-y-2">
                  {overtime.map((o) => (
                    <li key={o.userId} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${o.projectedHours >= 40 ? 'border-destructive/40 bg-destructive/10' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}`}>
                      <p className="text-sm font-medium text-foreground">{o.name}</p>
                      <Badge variant={o.projectedHours >= 40 ? 'destructive' : 'outline'} className="text-xs">
                        {o.projectedHours}h
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </RoleGate>

        {/* Staff: my pending swap requests */}
        <RoleGate role={['staff']}>
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRightIcon className="size-4" />
                My requests
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/swaps">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {mySwapsLoading ? (
                <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>
              ) : mySwaps.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No active swap or drop requests</div>
              ) : (
                <ul className="space-y-2">
                  {mySwaps.slice(0, 4).map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <Badge variant="outline">{s.type}</Badge>
                      <Badge variant={s.status.startsWith('pending') ? 'default' : 'secondary'} className="text-xs">{s.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </RoleGate>
      </div>

      {/* Quick actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="min-h-[44px] sm:min-h-0">
              <Link href="/schedule"><CalendarIcon className="mr-1.5 size-3.5" />Schedule</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="min-h-[44px] sm:min-h-0">
              <Link href="/swaps"><ArrowLeftRightIcon className="mr-1.5 size-3.5" />Swaps & Drops</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="min-h-[44px] sm:min-h-0">
              <Link href="/on-duty"><ClockIcon className="mr-1.5 size-3.5" />On-Duty</Link>
            </Button>
            <RoleGate role={['admin', 'manager']}>
              <Button variant="outline" size="sm" asChild className="min-h-[44px] sm:min-h-0">
                <Link href="/staff"><UsersIcon className="mr-1.5 size-3.5" />Staff</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="min-h-[44px] sm:min-h-0">
                <Link href="/analytics"><TrendingUpIcon className="mr-1.5 size-3.5" />Analytics</Link>
              </Button>
            </RoleGate>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
