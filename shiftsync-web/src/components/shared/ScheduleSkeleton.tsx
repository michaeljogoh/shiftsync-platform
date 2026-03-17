'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { getWeekRange, getDayLabel } from '@/lib/schedule-utils';

/** Skeleton for schedule calendar view: grid with placeholder shift blocks. */
export function ScheduleCalendarSkeleton({ week }: { week: string }) {
  const { start: weekStart } = getWeekRange(week);
  const dayLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => getDayLabel(weekStart, i));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[56px_1fr] border-b border-slate-700">
          <div className="border-r border-slate-700 p-1" />
          <div className="grid grid-cols-7 border-slate-700">
            {dayLabels.map((d, i) => (
              <div
                key={i}
                className="border-r border-slate-700 p-1 text-center text-xs text-slate-500 last:border-r-0"
              >
                {d.short} {d.date}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[56px_1fr]">
          <div className="border-r border-slate-700">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-8 border-b border-slate-800 p-0.5 text-[10px] text-slate-500">
                {i * 2 + 6}:00
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 * 8 }, (_, i) => (
              <div key={i} className="h-8 border-b border-r border-slate-800 last:border-r-0">
                {i % 7 === 2 && Math.floor(i / 7) === 3 && (
                  <Skeleton className="m-1 h-6 w-3/4 rounded" />
                )}
                {i % 7 === 5 && Math.floor(i / 7) === 5 && (
                  <Skeleton className="m-1 h-10 w-4/5 rounded" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for schedule list view: placeholder rows. */
export function ScheduleListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((day) => (
        <div key={day}>
          <Skeleton className="mb-2 h-5 w-24" />
          <div className="space-y-1">
            {[1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
