'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { LocationSummary } from '@/lib/api/server/locations';

interface OnDutyAssignment {
  userId: string;
  shiftId: string;
}

function LocationClock({ ianaTimezone }: { ianaTimezone: string }) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTimezone,
    timeStyle: 'long',
    hour12: false,
  });
  return <span className="text-lg font-mono text-slate-100">{formatter.format(now)}</span>;
}

interface OnDutyClientProps {
  locations: LocationSummary[];
}

export function OnDutyClient({ locations }: OnDutyClientProps) {
  const { data: onDutyByLocation, isLoading } = useQuery({
    queryKey: [...queryKeys.locations.all(), 'on-duty', locations.map((l) => l.id)],
    queryFn: async () => {
      const results: Record<string, OnDutyAssignment[]> = {};
      await Promise.all(
        locations.map(async (loc) => {
          try {
            const { data } = await apiClient.get<OnDutyAssignment[]>(`/locations/${loc.id}/on-duty`);
            results[loc.id] = Array.isArray(data) ? data : [];
          } catch {
            results[loc.id] = [];
          }
        }),
      );
      return results;
    },
    enabled: locations.length > 0,
    refetchInterval: 30_000,
  });

  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-50">On-Duty Dashboard</h1>
        <p className="text-sm text-slate-400">No locations available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-50">On-Duty Dashboard</h1>
      <p className="text-xs text-slate-500">Updates every 30s. Use WebSocket duty.update for real-time.</p>

      {isLoading && <div className="text-sm text-slate-400">Loading…</div>}
      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => {
            const onDuty = onDutyByLocation?.[loc.id] ?? [];
            const count = onDuty.length;
            const understaffed = false;

            return (
              <Card
                key={loc.id}
                className={`border-slate-800 bg-slate-900/50 ${understaffed ? 'border-amber-500/50 bg-amber-950/20' : ''}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">{loc.name}</CardTitle>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <LocationClock ianaTimezone={loc.ianaTimezone} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-500">On duty: {count}</p>
                  <ul className="space-y-2">
                    {onDuty.length === 0 && <li className="text-sm text-slate-500">No one on shift</li>}
                    {onDuty.map((a) => (
                      <li key={`${a.userId}-${a.shiftId}`} className="flex items-center gap-2 rounded bg-slate-800/50 px-2 py-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">{a.userId.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <p className="truncate text-sm text-slate-200">{a.userId}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500">Coming up: next shift within 1h (optional)</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
