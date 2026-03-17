'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiClient } from '@/lib/api/client/client';
import { useOnDutyStore } from '@/lib/stores/on-duty.store';
import type { LocationSummary } from '@/lib/api/server/locations';
import type { OnDutyPayload } from '@/lib/stores/on-duty.store';

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
  const data = useOnDutyStore((s) => s.data);
  const setBulk = useOnDutyStore((s) => s.setBulk);

  useEffect(() => {
    if (locations.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, OnDutyPayload> = {};
      await Promise.all(
        locations.map(async (loc) => {
          try {
            const res = await apiClient.get<{ userId: string; shiftId: string }[]>(
              `/locations/${loc.id}/on-duty`,
            );
            const onDuty = res.data;
            if (!cancelled) {
              updates[loc.id] = {
                locationId: loc.id,
                onDuty: Array.isArray(onDuty) ? onDuty : [],
                at: new Date().toISOString(),
              };
            }
          } catch {
            if (!cancelled) {
              updates[loc.id] = { locationId: loc.id, onDuty: [], at: new Date().toISOString() };
            }
          }
        }),
      );
      if (!cancelled && Object.keys(updates).length > 0) setBulk(updates);
    })();
    return () => { cancelled = true; };
  }, [locations, setBulk]);

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
      <p className="text-xs text-slate-500">Updates in real time via WebSocket (duty.update).</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => {
          const payload = data[loc.id];
          const onDuty = payload?.onDuty ?? [];
          const count = onDuty.length;

          return (
            <Card key={loc.id} className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-100">{loc.name}</CardTitle>
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <LocationClock ianaTimezone={loc.ianaTimezone} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">On duty: {count}</p>
                <ul className="space-y-2">
                  {onDuty.length === 0 && (
                    <li className="text-sm text-slate-500">No one on shift</li>
                  )}
                  {onDuty.map((a) => (
                    <li
                      key={`${a.userId}-${a.shiftId}`}
                      className="flex items-center gap-2 rounded bg-slate-800/50 px-2 py-1.5"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {a.userId.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate text-sm text-slate-200">{a.userId}</p>
                    </li>
                  ))}
                </ul>
                {payload?.at && (
                  <p className="text-[10px] text-slate-600">
                    Last update: {new Date(payload.at).toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
