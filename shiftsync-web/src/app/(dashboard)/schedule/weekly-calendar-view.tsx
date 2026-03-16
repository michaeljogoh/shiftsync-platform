'use client';

import { useMemo } from 'react';
import { StarIcon } from 'lucide-react';
import type { ShiftSummary } from '@/lib/api/server/shifts';
import {
  getWeekRange,
  getDayIndex,
  timeToSlotIndex,
  TOTAL_SLOTS,
  SLOTS_PER_HOUR,
  getDayLabel,
  slotIndexToLabel,
  isPremiumShift,
} from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';

interface WeeklyCalendarViewProps {
  shifts: ShiftSummary[];
  week: string;
  locationTimezone?: string;
  onShiftClick: (shift: ShiftSummary) => void;
  canDrag?: boolean;
}

function getShiftPosition(
  shift: ShiftSummary,
  weekStart: Date,
  tz: string,
): { dayIndex: number; slotStart: number; slotSpan: number } | null {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);
  const dayIndex = getDayIndex(start, weekStart);
  if (dayIndex < 0 || dayIndex > 6) return null;
  const startMinutes =
    start.getUTCHours() * 60 +
    start.getUTCMinutes() +
    (start.getUTCDate() - weekStart.getUTCDate()) * 24 * 60;
  const endMinutes =
    end.getUTCHours() * 60 +
    end.getUTCMinutes() +
    (end.getUTCDate() - weekStart.getUTCDate()) * 24 * 60;
  const slotStart = timeToSlotIndex(start.getUTCHours() * 60 + start.getUTCMinutes());
  const durationSlots = Math.max(
    1,
    Math.ceil((endMinutes - startMinutes) / (60 / SLOTS_PER_HOUR)),
  );
  const slotSpan = Math.min(durationSlots, TOTAL_SLOTS - slotStart);
  return { dayIndex, slotStart, slotSpan };
}

export function WeeklyCalendarView({
  shifts,
  week,
  locationTimezone = 'UTC',
  onShiftClick,
}: WeeklyCalendarViewProps) {
  const { start: weekStart } = getWeekRange(week);
  const dayLabels = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((i) => ({
        ...getDayLabel(weekStart, i),
        index: i,
      })),
    [weekStart, week],
  );

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, ShiftSummary[]>();
    shifts.forEach((shift) => {
      const pos = getShiftPosition(shift, weekStart, locationTimezone);
      if (!pos) return;
      const key = `${pos.dayIndex}-${pos.slotStart}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(shift);
    });
    return map;
  }, [shifts, weekStart, locationTimezone]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row: day labels */}
        <div className="grid grid-cols-[56px_1fr] border-b border-slate-700">
          <div className="border-r border-slate-700 p-1 text-xs text-slate-500" />
          <div className="grid grid-cols-7 border-slate-700">
            {dayLabels.map((d) => (
              <div
                key={d.index}
                className="border-r border-slate-700 p-1 text-center text-xs font-medium text-slate-300 last:border-r-0"
              >
                <div>{d.short}</div>
                <div className="text-slate-500">{d.date}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Time grid */}
        <div className="grid grid-cols-[56px_1fr]">
          <div className="border-r border-slate-700">
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
              <div
                key={i}
                className="h-6 border-b border-slate-800/50 pr-1 text-right text-[10px] text-slate-500"
              >
                {i % 2 === 0 ? slotIndexToLabel(i) : ''}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
              <div
                key={dayIndex}
                className="relative border-r border-slate-700 last:border-r-0"
                style={{ minHeight: TOTAL_SLOTS * 24 }}
              >
                {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="h-6 border-b border-slate-800/30"
                    data-slot={`${dayIndex}-${slotIndex}`}
                  />
                ))}
                {/* Shift blocks */}
                {shifts
                  .filter((s) => {
                    const pos = getShiftPosition(s, weekStart, locationTimezone);
                    return pos && pos.dayIndex === dayIndex;
                  })
                  .map((shift) => {
                    const pos = getShiftPosition(shift, weekStart, locationTimezone);
                    if (!pos) return null;
                    const assignedCount = shift.assignments?.length ?? 0;
                    const needed = shift.headcountNeeded;
                    const isUnder = assignedCount < needed;
                    const isOver = assignedCount > needed;
                    const premium = shift.isPremium ?? isPremiumShift(shift.startAt, locationTimezone);
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        className={cn(
                          'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded border text-left text-xs transition hover:opacity-90',
                          shift.status === 'draft' && 'border-slate-600 bg-slate-700/90 text-slate-200',
                          shift.status === 'published' &&
                            !isUnder &&
                            !isOver &&
                            'border-primary/50 bg-primary/20 text-primary-foreground',
                          shift.status === 'published' && isUnder && 'border-amber-500/60 bg-amber-500/20 text-amber-100',
                          shift.status === 'published' && isOver && 'border-blue-500/60 bg-blue-500/20 text-blue-100',
                          shift.status === 'cancelled' && 'border-slate-600 bg-slate-800/70 text-slate-400 line-through',
                        )}
                        style={{
                          top: pos.slotStart * 24,
                          height: pos.slotSpan * 24 - 2,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onShiftClick(shift);
                        }}
                      >
                        <div className="truncate px-1 font-medium">
                          {shift.title || 'Shift'}
                          {premium && (
                            <StarIcon className="ml-0.5 inline size-3 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        <div className="truncate px-1 text-[10px] opacity-90">
                          {shift.assignments?.length
                            ? shift.assignments
                                .map((a) => a.user && `${a.user.firstName} ${a.user.lastName}`)
                                .filter(Boolean)
                                .join(', ') || '—'
                            : '—'}
                        </div>
                        <div className="px-1 text-[10px] opacity-75">
                          {assignedCount}/{needed}
                        </div>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
