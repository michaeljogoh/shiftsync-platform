'use client';

import { ChevronLeftIcon, ChevronRightIcon, ListIcon, CalendarIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addWeeks } from '@/lib/schedule-utils';
import type { LocationSummary } from '@/lib/api/server/locations';
import { PermissionGate } from '@/components/shared/PermissionGate';

export type ViewMode = 'calendar' | 'list';

interface ScheduleControlsProps {
  week: string;
  onWeekChange: (week: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  locationIds: string[];
  locations: LocationSummary[];
  onLocationFilterChange?: (ids: string[]) => void;
  onAddShift: () => void;
  onPublishWeek?: () => void;
  isPublishing?: boolean;
  hasDrafts?: boolean;
}

export function ScheduleControls({
  week,
  onWeekChange,
  viewMode,
  onViewModeChange,
  locations,
  onAddShift,
  onPublishWeek,
  isPublishing = false,
  hasDrafts = false,
}: ScheduleControlsProps) {
  const weekDate = new Date(week + 'T12:00:00.000Z');
  const weekLabel = weekDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 sm:gap-3">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="flex items-center rounded-md border border-slate-700 bg-slate-900/50 p-0.5 sm:p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] min-w-[44px] gap-0.5 sm:h-8 sm:min-h-0 sm:min-w-0 sm:gap-1"
            onClick={() => onWeekChange(addWeeks(week, -1))}
          >
            <ChevronLeftIcon className="size-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>
          <span className="min-w-[100px] px-1.5 text-center text-xs font-medium text-slate-200 sm:min-w-[140px] sm:px-2 sm:text-sm">
            {weekLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] min-w-[44px] gap-0.5 sm:h-8 sm:min-h-0 sm:min-w-0 sm:gap-1"
            onClick={() => onWeekChange(addWeeks(week, 1))}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-h-[44px] sm:h-8"
          onClick={() => onWeekChange(new Date().toISOString().slice(0, 10))}
        >
          Today
        </Button>
        <div className="flex rounded-md border border-slate-700 bg-slate-900/50 p-0.5 sm:p-1">
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 min-h-[44px] min-w-[44px] gap-0.5 sm:h-8 sm:min-h-0 sm:min-w-0 sm:gap-1"
            onClick={() => onViewModeChange('calendar')}
          >
            <CalendarIcon className="size-4" />
            <span className="hidden sm:inline">Week</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 min-h-[44px] min-w-[44px] gap-0.5 sm:h-8 sm:min-h-0 sm:min-w-0 sm:gap-1"
            onClick={() => onViewModeChange('list')}
          >
            <ListIcon className="size-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <PermissionGate require="shifts:publish">
          {onPublishWeek && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 min-h-[44px] sm:h-8"
              onClick={onPublishWeek}
              disabled={!hasDrafts || isPublishing}
            >
              {isPublishing ? '…' : <>Publish<span className="hidden sm:inline"> week</span></>}
            </Button>
          )}
        </PermissionGate>
        <PermissionGate require="shifts:create">
          <Button size="sm" className="h-9 min-h-[44px] gap-1 sm:h-8" onClick={onAddShift}>
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">Add shift</span>
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
