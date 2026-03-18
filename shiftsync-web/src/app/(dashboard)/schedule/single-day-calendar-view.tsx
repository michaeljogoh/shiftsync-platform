'use client';

import { useCallback, useRef, useState } from 'react';
import { StarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
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

function getShiftPosition(
  shift: ShiftSummary,
  weekStart: Date,
  _tz: string,
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

export interface SingleDayCalendarViewProps {
  shifts: ShiftSummary[];
  week: string;
  /** 0–6, Sunday–Saturday */
  dayIndex: number;
  onDayChange: (dayIndex: number) => void;
  locationTimezone?: string;
  onShiftClick: (shift: ShiftSummary) => void;
}

export function SingleDayCalendarView({
  shifts,
  week,
  dayIndex,
  onDayChange,
  locationTimezone = 'UTC',
  onShiftClick,
}: SingleDayCalendarViewProps) {
  const { start: weekStart } = getWeekRange(week);
  const dayLabel = getDayLabel(weekStart, dayIndex);
  const touchStartX = useRef<number | null>(null);

  const dayShifts = shifts.filter((s) => {
    const pos = getShiftPosition(s, weekStart, locationTimezone);
    return pos && pos.dayIndex === dayIndex;
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      const threshold = 50;
      if (diff < -threshold && dayIndex < 6) onDayChange(dayIndex + 1);
      if (diff > threshold && dayIndex > 0) onDayChange(dayIndex - 1);
    },
    [dayIndex, onDayChange],
  );

  return (
    <div
      className="touch-pan-y select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Day navigation */}
      <div className="flex items-center justify-between border-b border-border bg-card px-2 py-2">
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          onClick={() => onDayChange(Math.max(0, dayIndex - 1))}
          disabled={dayIndex === 0}
          aria-label="Previous day"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {dayLabel.short} {dayLabel.date}
        </span>
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          onClick={() => onDayChange(Math.min(6, dayIndex + 1))}
          disabled={dayIndex === 6}
          aria-label="Next day"
        >
          <ChevronRightIcon className="size-6" />
        </button>
      </div>

      {/* Single-day grid */}
      <div className="grid grid-cols-[52px_1fr] border-b border-border">
        <div className="border-r border-border">
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
            <div
              key={i}
              className="h-6 border-b border-border/50 pr-1 text-right text-[10px] text-muted-foreground"
            >
              {i % 2 === 0 ? slotIndexToLabel(i) : ''}
            </div>
          ))}
        </div>
        <div
          className="relative border-border"
          style={{ minHeight: TOTAL_SLOTS * 24 }}
        >
          {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
            <div
              key={slotIndex}
              className="h-6 border-b border-border/30"
              data-slot={`${dayIndex}-${slotIndex}`}
            />
          ))}
          {dayShifts.map((shift) => {
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
                  'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded border text-left text-xs transition hover:opacity-90 min-h-[44px] touch-manipulation',
                  shift.status === 'draft' && 'border-border bg-muted text-foreground',
                  shift.status === 'published' &&
                    !isUnder &&
                    !isOver &&
                    'border-primary/50 bg-primary/20 text-primary-foreground',
                  shift.status === 'published' && isUnder && 'border-primary/60 bg-primary/20 text-primary-foreground',
                  shift.status === 'published' && isOver && 'border-destructive/60 bg-destructive/20 text-destructive-foreground',
                  shift.status === 'cancelled' && 'border-border bg-muted/70 text-muted-foreground line-through',
                )}
                style={{
                  top: pos.slotStart * 24,
                  height: Math.max(44, pos.slotSpan * 24 - 2),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onShiftClick(shift);
                }}
              >
                <div className="truncate px-1 font-medium">
                  {shift.title || 'Shift'}
                  {premium && (
                    <StarIcon className="ml-0.5 inline size-3 fill-primary text-primary" />
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
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Swipe or tap arrows to change day</p>
    </div>
  );
}
