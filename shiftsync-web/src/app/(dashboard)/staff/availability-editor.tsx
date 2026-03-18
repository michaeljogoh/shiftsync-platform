'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { AvailabilityWindow, AvailabilityException } from '@/lib/api/server/availability';
import { validateAvailabilityWindows } from '@/lib/validations/availability';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';

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
  const canUpdateAvailability = useAuthStore((s) => s.can('availability:update'));
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

  const handleCellDown = useCallback(
    (day: number, slot: number) => {
      if (!canUpdateAvailability) return;
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
      if (!canUpdateAvailability) return;
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
    return <div className="text-sm text-muted-foreground">Loading availability…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
        Your availability windows are stored as time-of-day references and will be interpreted in each location&apos;s timezone. For example, 9 AM availability means 9 AM Eastern at your Eastern locations and 9 AM Pacific at your Pacific locations.
      </div>
      <p className="text-xs text-muted-foreground">
        Click or drag to mark available blocks (30-min slots). Save to update.
      </p>
      <div
        className="overflow-x-auto rounded border border-border"
        onMouseLeave={() => setDragging(null)}
        onMouseUp={() => setDragging(null)}
      >
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="w-10 border-r border-border py-1 text-left text-[10px] text-muted-foreground">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="min-w-[28px] border-r border-border py-1 text-center font-medium text-foreground last:border-r-0">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
              <tr key={slot} className="border-b border-border/80">
                <td className="border-r border-border py-0.5 pl-1 text-[10px] text-muted-foreground">
                  {slot % 2 === 0 ? slotToTime(slot) : ''}
                </td>
                {DAYS.map((_, day) => (
                  <td key={day} className="p-0.5">
                    <button
                      type="button"
                      className={cn(
                        'block h-4 w-full min-w-[20px] rounded-sm transition-colors select-none last:border-r-0',
                        displayGrid[day][slot]
                          ? 'bg-primary/80 hover:bg-primary'
                          : 'bg-muted hover:bg-muted-foreground/20',
                      )}
                      onMouseDown={(e) => { e.preventDefault(); handleCellDown(day, slot); }}
                      onMouseEnter={() => handleCellEnter(day, slot)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canUpdateAvailability && (
        <div className="flex items-center justify-end border-t border-border pt-2">
          <Button size="sm" className="min-h-[44px] sm:min-h-0" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save availability'}
          </Button>
        </div>
      )}
      <ExceptionsSection userId={userId} exceptions={data?.exceptions ?? []} />
    </div>
  );
}

function ExceptionsSection({ userId, exceptions }: { userId: string; exceptions: AvailabilityException[] }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    exceptionDate: '',
    isAvailable: true,
    startTime: '',
    endTime: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  async function onAdd() {
    if (!form.exceptionDate) { toast.error('Date is required'); return; }
    setSaving(true);
    try {
      await apiClient.post(`/users/${userId}/availability/exceptions`, {
        exceptionDate: form.exceptionDate,
        isAvailable: form.isAvailable,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        reason: form.reason || null,
      });
      toast.success('Exception added');
      setAddOpen(false);
      setForm({ exceptionDate: '', isAvailable: true, startTime: '', endTime: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.availability(userId) });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add exception');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(exceptionId: string) {
    try {
      await apiClient.delete(`/users/${userId}/availability/exceptions/${exceptionId}`);
      toast.success('Exception removed');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.availability(userId) });
    } catch {
      toast.error('Failed to remove exception');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Date exceptions</p>
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setAddOpen(true)}>
          <PlusIcon className="mr-0.5 size-2.5" /> Add exception
        </Button>
      </div>
      {exceptions.length === 0 && (
        <p className="text-xs text-muted-foreground">No date-specific exceptions set.</p>
      )}
      <ul className="space-y-1">
        {exceptions.map((ex) => (
          <li key={ex.id} className="flex items-center justify-between rounded border border-border bg-muted px-2 py-1.5 text-xs">
            <div>
              <span className="font-medium text-foreground">{ex.exceptionDate}</span>
              {' — '}
              <span className={ex.isAvailable ? 'text-green-600' : 'text-destructive'}>
                {ex.isAvailable ? 'Available' : 'Unavailable'}
              </span>
              {ex.startTime && <span className="text-muted-foreground"> {ex.startTime}–{ex.endTime}</span>}
              {ex.reason && <span className="italic text-muted-foreground"> ({ex.reason})</span>}
            </div>
            <button onClick={() => onDelete(ex.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2Icon className="size-3" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add date exception</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Date *</label>
              <Input type="date" value={form.exceptionDate} onChange={(e) => setForm((f) => ({ ...f, exceptionDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Available on this date?</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={form.isAvailable ? 'yes' : 'no'}
                onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.value === 'yes' }))}
              >
                <option value="no">No — blocked (unavailable all day)</option>
                <option value="yes">Yes — available (optionally specify hours)</option>
              </select>
            </div>
            {form.isAvailable && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Start time</label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">End time</label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. doctor's appointment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={onAdd} disabled={saving}>Add exception</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
