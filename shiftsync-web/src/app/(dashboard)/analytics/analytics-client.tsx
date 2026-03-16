'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { LocationSummary } from '@/lib/api/server/locations';

const DEFAULT_HOURLY_RATE = 15;

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

interface SwapsClientProps {
  locations: LocationSummary[];
}

export function AnalyticsClient({ locations }: SwapsClientProps) {
  const [locationId, setLocationId] = useState<string>('');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [dateRange, setDateRange] = useState(() => getDateRange(14));
  const [fairnessLocationId, setFairnessLocationId] = useState<string>('');
  const [fairnessPeriod, setFairnessPeriod] = useState(() => getDateRange(28));

  const { data: overtime = [], isLoading: overtimeLoading } = useQuery({
    queryKey: queryKeys.analytics.overtime(locationId || undefined, weekStart),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);
      params.set('weekStart', weekStart);
      const { data } = await apiClient.get(`/analytics/overtime?${params.toString()}`);
      return data;
    },
  });

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

  const overtimeWithCost = useMemo(
    () =>
      overtime.map((row: { userId: string; name: string; projectedHours: number }) => ({
        ...row,
        overtimeHours: Math.max(0, row.projectedHours - 40),
        cost: Math.max(0, row.projectedHours - 40) * DEFAULT_HOURLY_RATE * 1.5,
      })),
    [overtime],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-50">Analytics</h1>

      <div className="flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-base">Overtime dashboard</CardTitle>
          <CardDescription>Projected hours this week (red &gt;40h, amber &gt;35h)</CardDescription>
          <input
            type="date"
            className="mt-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
            value={weekStart}
            onChange={(e) => setWeekStart(getWeekStart(new Date(e.target.value)))}
          />
        </CardHeader>
        <CardContent>
          {overtimeLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!overtimeLoading && overtimeWithCost.length === 0 && (
            <p className="text-sm text-slate-400">No staff over 35h this week.</p>
          )}
          {!overtimeLoading && overtimeWithCost.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 text-xs font-medium text-slate-400">
                <span>Staff</span>
                <span>Scheduled</span>
                <span>Overtime</span>
                <span>Est. cost</span>
              </div>
              {overtimeWithCost.map((row: { userId: string; name: string; projectedHours: number; overtimeHours: number; cost: number }) => (
                <div
                  key={row.userId}
                  className={`grid grid-cols-[1fr_80px_80px_100px] gap-2 rounded px-2 py-1 text-sm ${
                    row.projectedHours > 40 ? 'bg-red-950/30' : row.projectedHours > 35 ? 'bg-amber-950/20' : ''
                  }`}
                >
                  <span className="text-slate-200">{row.name}</span>
                  <span>{row.projectedHours}h</span>
                  <span>{row.overtimeHours > 0 ? `${row.overtimeHours}h` : '—'}</span>
                  <span>{row.cost > 0 ? `$${row.cost.toFixed(0)}` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-base">Hours distribution</CardTitle>
          <CardDescription>Total hours per staff in date range</CardDescription>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((r) => ({ ...r, startDate: e.target.value }))}
            />
            <input
              type="date"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((r) => ({ ...r, endDate: e.target.value }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {hoursLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!hoursLoading && hoursDist.length === 0 && <p className="text-sm text-slate-400">No data.</p>}
          {!hoursLoading && hoursDist.length > 0 && (
            <div className="space-y-1">
              {hoursDist.slice(0, 20).map((row: { userId: string; name: string; totalHours: number }) => (
                <div key={row.userId} className="flex items-center gap-2">
                  <div className="w-32 truncate text-sm text-slate-200">{row.name}</div>
                  <div className="h-4 flex-1 max-w-xs overflow-hidden rounded bg-slate-800">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${Math.min(100, (row.totalHours / 80) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400">{row.totalHours}h</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-base">Fairness report</CardTitle>
          <CardDescription>Premium shift ratio and fairness score</CardDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
              value={fairnessLocationId}
              onChange={(e) => setFairnessLocationId(e.target.value)}
            >
              <option value="">First location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
              value={fairnessPeriod.startDate}
              onChange={(e) => setFairnessPeriod((p) => ({ ...p, startDate: e.target.value }))}
            />
            <input
              type="date"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
              value={fairnessPeriod.endDate}
              onChange={(e) => setFairnessPeriod((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {fairnessLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!fairnessLoading && fairness && (
            <div className="space-y-3">
              <p className="text-sm">
                Fairness score: <strong className="text-slate-100">{Math.round((fairness.fairnessScore ?? 0) * 100)}%</strong>
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="py-1">Staff</th>
                    <th className="py-1">Total shifts</th>
                    <th className="py-1">Premium</th>
                    <th className="py-1">Ratio</th>
                    <th className="py-1">Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {(fairness.staff ?? []).map((s: { userId: string; name: string; totalShiftsAssigned: number; premiumShiftsAssigned: number; premiumRatio: number; flagged?: boolean }) => (
                    <tr key={s.userId} className="border-b border-slate-800">
                      <td className="py-1 text-slate-200">{s.name}</td>
                      <td className="py-1">{s.totalShiftsAssigned}</td>
                      <td className="py-1">{s.premiumShiftsAssigned}</td>
                      <td className="py-1">{(s.premiumRatio * 100).toFixed(0)}%</td>
                      <td className="py-1">{s.flagged ? '⚠️' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
