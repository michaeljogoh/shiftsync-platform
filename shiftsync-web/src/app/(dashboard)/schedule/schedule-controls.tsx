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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-slate-700 bg-slate-900/50 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => onWeekChange(addWeeks(week, -1))}
          >
            <ChevronLeftIcon className="size-4" />
            Prev
          </Button>
          <span className="min-w-[140px] px-2 text-center text-sm font-medium text-slate-200">
            {weekLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => onWeekChange(addWeeks(week, 1))}
          >
            Next
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onWeekChange(new Date().toISOString().slice(0, 10))}
        >
          Today
        </Button>
        <div className="flex rounded-md border border-slate-700 bg-slate-900/50 p-1">
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1"
            onClick={() => onViewModeChange('calendar')}
          >
            <CalendarIcon className="size-4" />
            Week
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1"
            onClick={() => onViewModeChange('list')}
          >
            <ListIcon className="size-4" />
            List
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PermissionGate require="shifts:publish">
          {onPublishWeek && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onPublishWeek}
              disabled={!hasDrafts || isPublishing}
            >
              {isPublishing ? 'Publishing…' : 'Publish week'}
            </Button>
          )}
        </PermissionGate>
        <PermissionGate require="shifts:create">
          <Button size="sm" className="h-8 gap-1" onClick={onAddShift}>
            <PlusIcon className="size-4" />
            Add shift
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
