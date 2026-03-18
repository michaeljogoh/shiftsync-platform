'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { AvailabilityWindow, AvailabilityException } from '@/lib/api/server/availability';
import { validateAvailabilityWindows } from '@/lib/validations/availability';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOTS_PER_DAY = 48; // 30-min from 00:00 to 24:00

function slotToTime(slotIndex: number): string {
  const h = Math.floor(slotIndex / 2);
  const m = (slotIndex % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 2 + (m === 30 ? 1 : 0);
}

function windowsToGrid(windows: AvailabilityWindow[]): boolean[][] {
  const grid: boolean[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: SLOTS_PER_DAY }, () => false),
  );
  windows.forEach((w) => {
    const day = w.dayOfWeek;
    const start = timeToSlot(w.startTime);
    const end = timeToSlot(w.endTime);
    for (let s = start; s < end && s < SLOTS_PER_DAY; s++) {
      grid[day][s] = true;
    }
  });
  return grid;
}

function gridToWindows(grid: boolean[][]): { dayOfWeek: number; startTime: string; endTime: string }[] {
  const result: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
  for (let day = 0; day < 7; day++) {
    let start: number | null = null;
    for (let s = 0; s <= SLOTS_PER_DAY; s++) {
      const on = s < SLOTS_PER_DAY && grid[day][s];
      if (on && start === null) start = s;
      if (!on && start !== null) {
        result.push({
          dayOfWeek: day,
          startTime: slotToTime(start),
          endTime: slotToTime(s),
        });
        start = null;
      }
    }
  }
  return result;
}

interface AvailabilityEditorProps {
  userId: string;
}

export function AvailabilityEditor({ userId }: AvailabilityEditorProps) {
  const queryClient = useQueryClient();
  const [grid, setGrid] = useState<boolean[][] | null>(null);
  const [dragging, setDragging] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.availability(userId),
    queryFn: async () => {
      const { data: res } = await apiClient.get<{ windows: AvailabilityWindow[]; exceptions: AvailabilityException[] }>(
        `/users/${userId}/availability`,
      );
      return res;
    },
    enabled: !!userId,
  });

  const initialGrid = useMemo(
    () => (data?.windows ? windowsToGrid(data.windows) : null),
    [data?.windows],
  );

  const displayGrid = grid ?? initialGrid ?? Array.from({ length: 7 }, () => Array.from({ length: SLOTS_PER_DAY }, () => false));

  const handleCellClick = useCallback(
    (day: number, slot: number) => {
      setGrid((prev) => {
        const next = prev ?? initialGrid ?? displayGrid;
        const nextGrid = next.map((row, d) =>
          d === day ? row.map((v, s) => (s === slot ? !v : v)) : [...row],
        );
        return nextGrid;
      });
    },
    [initialGrid, displayGrid],
  );

  const handleCellDown = useCallback(
    (day: number, slot: number) => {
      const current = grid ?? initialGrid ?? displayGrid;
      const value = current[day][slot];
      setDragging(!value);
      setGrid((prev) => {
        const next = prev ?? initialGrid ?? displayGrid;
        const nextGrid = next.map((row, d) =>
          d === day ? row.map((v, s) => (s === slot ? !v : v)) : [...row],
        );
        return nextGrid;
      });
    },
    [grid, initialGrid, displayGrid],
  );

  const handleCellEnter = useCallback(
    (day: number, slot: number) => {
      if (dragging === null) return;
      setGrid((prev) => {
        const next = prev ?? initialGrid ?? displayGrid;
        const nextGrid = next.map((row, d) =>
          d === day ? row.map((v, s) => (s === slot ? dragging : v)) : [...row],
        );
        return nextGrid;
      });
    },
    [dragging, initialGrid, displayGrid],
  );

  const handleSave = useCallback(async () => {
    const windows = gridToWindows(displayGrid);
    const effectiveFrom = new Date().toISOString().slice(0, 10);
    const validated = validateAvailabilityWindows(windows, effectiveFrom);
    if (!validated.success) {
      const msg = validated.error.errors[0]?.message ?? 'Invalid availability window';
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      const existing = data?.windows ?? [];
      for (const w of existing) {
        await apiClient.delete(`/users/${userId}/availability/windows/${w.id}`);
      }
      for (const w of validated.data) {
        await apiClient.post(`/users/${userId}/availability/windows`, {
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
          effectiveFrom: w.effectiveFrom,
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.users.availability(userId) });
      setGrid(null);
    } catch {
      // toast or set error
    } finally {
      setSaving(false);
    }
  }, [displayGrid, data?.windows, userId, queryClient]);

  if (isLoading) {
    return <div className="text-sm text-slate-400">Loading availability…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300">
        Your availability windows are stored as time-of-day references and will be interpreted in each location&apos;s timezone. For example, 9 AM availability means 9 AM Eastern at your Eastern locations and 9 AM Pacific at your Pacific locations.
      </div>
      <p className="text-xs text-slate-500">
        Click or drag to mark available blocks (30-min slots). Save to update.
      </p>
      <div
        className="overflow-x-auto rounded border border-slate-700"
        onMouseLeave={() => setDragging(null)}
        onMouseUp={() => setDragging(null)}
      >
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800">
              <th className="w-10 border-r border-slate-700 py-1 text-left text-[10px] text-slate-500">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="min-w-[28px] border-r border-slate-700 py-1 text-center font-medium text-slate-300 last:border-r-0">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
              <tr key={slot} className="border-b border-slate-800/80">
                <td className="border-r border-slate-700 py-0.5 pl-1 text-[10px] text-slate-500">
                  {slot % 2 === 0 ? slotToTime(slot) : ''}
                </td>
                {DAYS.map((_, day) => (
                  <td key={day} className="p-0.5">
                    <button
                      type="button"
                      className={cn(
                        'block h-3 w-full min-w-[20px] rounded-sm transition last:border-r-0',
                        displayGrid[day][slot]
                          ? 'bg-primary/80 hover:bg-primary'
                          : 'bg-slate-800 hover:bg-slate-700',
                      )}
                      onClick={() => handleCellClick(day, slot)}
                      onMouseDown={() => handleCellDown(day, slot)}
                      onMouseEnter={() => handleCellEnter(day, slot)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-800 pt-2">
        <p className="text-xs text-slate-500">Exceptions: add via date picker + available/unavailable (coming soon).</p>
        <Button size="sm" className="min-h-[44px] sm:min-h-0" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save availability'}
        </Button>
      </div>
      {data?.exceptions && data.exceptions.length > 0 && (
        <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
          <p className="mb-1 text-xs font-medium text-slate-400">Exceptions</p>
          <ul className="space-y-1 text-xs text-slate-300">
            {data.exceptions.map((ex) => (
              <li key={ex.id}>
                {ex.exceptionDate} — {ex.isAvailable ? 'Available' : 'Unavailable'}
                {ex.startTime && ` ${ex.startTime}-${ex.endTime}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
