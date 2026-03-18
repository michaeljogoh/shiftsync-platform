'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import { FullPageError } from '@/components/shared/FullPageError';
import { PermissionDenied } from '@/components/shared/PermissionDenied';
import { AnalyticsSkeleton } from '@/components/shared/AnalyticsSkeleton';
import type { LocationSummary } from '@/lib/api/server/locations';
import { AlertTriangleIcon, TrendingUpIcon, StarIcon } from 'lucide-react';

const DEFAULT_HOURLY_RATE = 15;

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

interface AnalyticsClientProps {
  locations: LocationSummary[];
}

export function AnalyticsClient({ locations }: AnalyticsClientProps) {
  const [locationId, setLocationId] = useState<string>('');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [dateRange, setDateRange] = useState(() => getDateRange(14));
  const [fairnessLocationId, setFairnessLocationId] = useState<string>('');
  const [fairnessPeriod, setFairnessPeriod] = useState(() => getDateRange(28));
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const { data: overtime = [], isLoading: overtimeLoading, isError: overtimeError, error: overtimeErr, refetch: refetchOvertime } = useQuery({
    queryKey: queryKeys.analytics.overtime(locationId || undefined, weekStart),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);
      params.set('weekStart', weekStart);
      const { data } = await apiClient.get(`/analytics/overtime?${params.toString()}`);
      return data;
    },
  });

  const statusCode = (overtimeErr as { response?: { status?: number } })?.response?.status;

  const { data: hoursDist = [], isLoading: hoursLoading } = useQuery({
    queryKey: ['analytics', 'hours', locationId || undefined, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);
      params.set('startDate', dateRange.startDate);
      params.set('endDate', dateRange.endDate);
      const { data } = await apiClient.get(`/analytics/hours-distribution?${params.toString()}`);
      return data;
    },
  });

  const locId = fairnessLocationId || (locations[0]?.id ?? '');
  const { data: fairness, isLoading: fairnessLoading } = useQuery({
    queryKey: queryKeys.analytics.fairness(locId, `${fairnessPeriod.startDate}_${fairnessPeriod.endDate}`),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('locationId', locId);
      params.set('startDate', fairnessPeriod.startDate);
      params.set('endDate', fairnessPeriod.endDate);
      const { data } = await apiClient.get(`/analytics/fairness?${params.toString()}`);
      return data;
    },
    enabled: !!locId,
  });

  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  const { data: understaffed = [], isLoading: understaffedLoading } = useQuery({
    queryKey: ['analytics', 'understaffed', locationId || undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);
      params.set('startDate', today);
      params.set('endDate', nextWeekStr);
      const { data } = await apiClient.get(`/analytics/understaffed?${params.toString()}`);
      return data;
    },
  });

  const overtimeWithCost = useMemo(
    () =>
      overtime.map((row: { userId: string; name: string; projectedHours: number }) => ({
        ...row,
        overtimeHours: Math.max(0, row.projectedHours - 40),
        cost: Math.max(0, row.projectedHours - 40) * DEFAULT_HOURLY_RATE * 1.5,
      })),
    [overtime],
  );

  if (overtimeLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (overtimeError) {
    if (statusCode === 403) return <PermissionDenied />;
    return <FullPageError message="Failed to load analytics." onRetry={() => refetchOvertime()} />;
  }

  const maxHours = Math.max(...(hoursDist as { totalHours: number }[]).map((r) => r.totalHours), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Analytics</h1>

      <div className="flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
        </select>
      </div>

      {/* Understaffed shifts */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangleIcon className="size-4 text-amber-500" />
            Understaffed shifts (next 7 days)
          </CardTitle>
          <CardDescription>Published shifts that don&apos;t have full headcount</CardDescription>
        </CardHeader>
        <CardContent>
          {understaffedLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
          ) : understaffed.length === 0 ? (
            <p className="text-sm text-muted-foreground">All shifts fully staffed.</p>
          ) : (
            <div className="space-y-2">
              {(understaffed as { shiftId: string; title: string; needed: number; assigned: number }[]).map((s) => (
                <div key={s.shiftId} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
                  <span className="text-sm font-medium text-foreground">{s.title}</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-400">{s.assigned}/{s.needed} filled</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overtime */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUpIcon className="size-4 text-destructive" />
            Overtime dashboard
          </CardTitle>
          <CardDescription>Projected hours this week. Red ≥40h, amber ≥35h.</CardDescription>
          <input
            type="date"
            className="mt-2 rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            value={weekStart}
            onChange={(e) => setWeekStart(getWeekStart(new Date(e.target.value)))}
          />
        </CardHeader>
        <CardContent>
          {overtimeWithCost.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff over 35h this week.</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={overtimeWithCost}
                  margin={{ top: 4, right: 8, left: -16, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                    formatter={(v: number, name: string) => [
                      name === 'projectedHours' ? `${v}h` : `$${v.toFixed(0)}`,
                      name === 'projectedHours' ? 'Projected hrs' : 'OT cost',
                    ]}
                  />
                  <ReferenceLine y={40} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: '40h', fontSize: 10, fill: 'var(--destructive)' }} />
                  <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '35h', fontSize: 10, fill: '#f59e0b' }} />
                  <Bar dataKey="projectedHours" radius={[4, 4, 0, 0]} name="projectedHours">
                    {overtimeWithCost.map((row: { projectedHours: number }, idx: number) => (
                      <Cell
                        key={idx}
                        fill={row.projectedHours >= 40 ? 'hsl(var(--destructive))' : row.projectedHours >= 35 ? '#f59e0b' : 'hsl(var(--primary))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-1">Staff</th>
                      <th className="py-1">Scheduled</th>
                      <th className="py-1">OT hrs</th>
                      <th className="py-1">Est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimeWithCost.map((row: { userId: string; name: string; projectedHours: number; overtimeHours: number; cost: number }) => (
                      <tr key={row.userId} className={`border-b border-border ${row.projectedHours >= 40 ? 'bg-destructive/10' : row.projectedHours >= 35 ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                        <td className="py-1.5 text-foreground">{row.name}</td>
                        <td className="py-1.5">{row.projectedHours}h</td>
                        <td className="py-1.5">{row.overtimeHours > 0 ? `${row.overtimeHours}h` : '—'}</td>
                        <td className="py-1.5">{row.cost > 0 ? `$${row.cost.toFixed(0)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hours distribution */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Hours distribution</CardTitle>
          <CardDescription>Total hours per staff in date range</CardDescription>
          <div className="mt-2 flex gap-2">
            <input type="date" className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground" value={dateRange.startDate} onChange={(e) => setDateRange((r) => ({ ...r, startDate: e.target.value }))} />
            <input type="date" className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground" value={dateRange.endDate} onChange={(e) => setDateRange((r) => ({ ...r, endDate: e.target.value }))} />
          </div>
        </CardHeader>
        <CardContent>
          {hoursLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-6 w-full rounded" />)}</div>
          ) : hoursDist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for this range.</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={Math.max(120, hoursDist.length * 24)}>
                <BarChart
                  layout="vertical"
                  data={hoursDist as { name: string; totalHours: number }[]}
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v}h`, 'Hours']} />
                  <ReferenceLine x={40} stroke="var(--destructive)" strokeDasharray="3 3" />
                  <Bar dataKey="totalHours" radius={[0, 4, 4, 0]} fill="hsl(var(--primary) / 0.7)">
                    {(hoursDist as { totalHours: number }[]).map((_: unknown, idx: number) => (
                      <Cell
                        key={idx}
                        fill={(hoursDist as { totalHours: number }[])[idx].totalHours >= 40
                          ? 'hsl(var(--destructive) / 0.7)'
                          : (hoursDist as { totalHours: number }[])[idx].totalHours >= 35
                            ? '#f59e0b99'
                            : 'hsl(var(--primary) / 0.7)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fairness */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StarIcon className="size-4 text-amber-400" />
            Fairness report
          </CardTitle>
          <CardDescription>Premium shift distribution equity across staff</CardDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={fairnessLocationId} onChange={(e) => setFairnessLocationId(e.target.value)}>
              <option value="">First location</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">All staff</option>
              {(fairness?.staff ?? []).map((s: { userId: string; name: string }) => (
                <option key={s.userId} value={s.userId}>{s.name}</option>
              ))}
            </select>
            <input type="date" className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground" value={fairnessPeriod.startDate} onChange={(e) => setFairnessPeriod((p) => ({ ...p, startDate: e.target.value }))} />
            <input type="date" className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground" value={fairnessPeriod.endDate} onChange={(e) => setFairnessPeriod((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
        </CardHeader>
        <CardContent>
          {fairnessLoading && (
            <div className="space-y-2"><Skeleton className="h-4 w-48" />{[1,2,3,4].map((i) => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
          )}
          {!fairnessLoading && fairness && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Fairness score</p>
                  <p className={`text-2xl font-bold ${fairness.fairnessScore >= 0.85 ? 'text-green-600' : fairness.fairnessScore >= 0.6 ? 'text-amber-500' : 'text-destructive'}`}>
                    {Math.round((fairness.fairnessScore ?? 0) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Team avg premium ratio</p>
                  <p className="text-lg font-semibold text-foreground">{((fairness.averagePremiumRatio ?? 0) * 100).toFixed(0)}%</p>
                </div>
              </div>

              {selectedStaffId && (() => {
                const staff = (fairness.staff ?? []).find((s: { userId: string }) => s.userId === selectedStaffId) as {
                  userId: string; name: string; totalShiftsAssigned: number; premiumShiftsAssigned: number; premiumRatio: number; deviationFromAverage: number; flagged?: boolean;
                } | undefined;
                if (!staff) return null;
                return (
                  <div className={`rounded-lg border px-3 py-2 text-sm ${staff.flagged ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-border bg-muted/30'}`}>
                    <p className="font-medium text-foreground">{staff.name}</p>
                    <p className="text-muted-foreground">Premium: {staff.premiumShiftsAssigned} / {staff.totalShiftsAssigned} shifts ({(staff.premiumRatio * 100).toFixed(0)}%)</p>
                    <p className="text-muted-foreground">Deviation: <strong className={staff.deviationFromAverage > 0.1 ? 'text-green-600' : staff.deviationFromAverage < -0.1 ? 'text-destructive' : 'text-foreground'}>{(staff.deviationFromAverage * 100).toFixed(0)}%</strong></p>
                    {staff.flagged && <Badge variant="outline" className="mt-1 border-amber-400 text-amber-600">Flagged — {staff.deviationFromAverage > 0 ? 'over-allocated premium' : 'under-allocated premium'}</Badge>}
                  </div>
                );
              })()}

              {(fairness.staff ?? []).length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={(fairness.staff ?? []).slice(0, 8).map((s: { name: string; premiumRatio: number }) => ({
                    name: s.name.split(' ')[0],
                    ratio: Math.round(s.premiumRatio * 100),
                  }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <Radar name="Premium %" dataKey="ratio" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-1">Staff</th>
                      <th className="py-1">Total shifts</th>
                      <th className="py-1">Premium</th>
                      <th className="py-1">Ratio</th>
                      <th className="py-1">vs avg</th>
                      <th className="py-1">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fairness.staff ?? []).map((s: { userId: string; name: string; totalShiftsAssigned: number; premiumShiftsAssigned: number; premiumRatio: number; deviationFromAverage?: number; flagged?: boolean }) => (
                      <tr key={s.userId} className={`border-b border-border ${s.userId === selectedStaffId ? 'bg-muted' : ''}`}>
                        <td className="py-1.5 text-foreground">{s.name}</td>
                        <td className="py-1.5">{s.totalShiftsAssigned}</td>
                        <td className="py-1.5">{s.premiumShiftsAssigned}</td>
                        <td className="py-1.5">{(s.premiumRatio * 100).toFixed(0)}%</td>
                        <td className={`py-1.5 ${(s.deviationFromAverage ?? 0) > 0 ? 'text-green-600' : (s.deviationFromAverage ?? 0) < -0.1 ? 'text-destructive' : ''}`}>
                          {s.deviationFromAverage != null ? `${(s.deviationFromAverage * 100).toFixed(0)}%` : '—'}
                        </td>
                        <td className="py-1.5">{s.flagged ? <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">⚠</Badge> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hours bar chart for selected location range */}
      {!hoursLoading && hoursDist.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Hours bar — max {maxHours.toFixed(0)}h</CardTitle>
            <CardDescription>Comparison of all staff hours in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {(hoursDist as { userId: string; name: string; totalHours: number }[]).map((row) => (
                <div key={row.userId} className="flex items-center gap-2">
                  <div className="w-28 truncate text-sm text-foreground">{row.name}</div>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${Math.min(100, (row.totalHours / maxHours) * 100)}%`,
                        background: row.totalHours >= 40 ? 'hsl(var(--destructive) / 0.7)' : row.totalHours >= 35 ? '#f59e0b99' : 'hsl(var(--primary) / 0.6)',
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm text-muted-foreground">{row.totalHours}h</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
