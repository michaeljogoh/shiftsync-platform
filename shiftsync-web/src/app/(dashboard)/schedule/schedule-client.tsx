'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import { weekToStartEnd } from '@/lib/schedule-utils';
import type { ShiftSummary } from '@/lib/api/server/shifts';
import type { LocationSummary } from '@/lib/api/server/locations';
import type { SkillSummary } from '@/lib/api/server/skills';
import { ScheduleControls, type ViewMode } from './schedule-controls';
import { WeeklyCalendarView } from './weekly-calendar-view';
import { ScheduleListView } from './schedule-list-view';
import { ShiftDetailSheet } from './shift-detail-sheet';
import { CreateShiftForm } from './create-shift-form';

async function fetchShiftsClient(
  locationId: string | undefined,
  week: string,
): Promise<ShiftSummary[]> {
  const { startDate, endDate } = weekToStartEnd(week);
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  params.set('startDate', startDate);
  params.set('endDate', endDate);
  const { data } = await apiClient.get<ShiftSummary[]>(`/shifts?${params.toString()}`);
  return data;
}

interface ScheduleClientProps {
  locationId?: string;
  week: string;
  locations: LocationSummary[];
  skills: SkillSummary[];
}

export function ScheduleClient({
  locationId,
  week,
  locations,
  skills,
}: ScheduleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [detailShiftId, setDetailShiftId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const { data: shifts = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.shifts.byLocation(locationId, week),
    queryFn: () => fetchShiftsClient(locationId, week),
  });

  const setWeek = useCallback(
    (newWeek: string) => {
      const url = new URL(pathname ?? '/schedule');
      url.searchParams.set('week', newWeek);
      if (locationId) url.searchParams.set('locationId', locationId);
      router.push(url.pathname + url.search);
    },
    [pathname, locationId, router],
  );

  const handleShiftClick = useCallback((shift: ShiftSummary) => {
    setDetailShiftId(shift.id);
    setDetailOpen(true);
  }, []);

  const handlePublishWeek = useCallback(async () => {
    const drafts = shifts.filter((s) => s.status === 'draft');
    if (drafts.length === 0) return;
    setPublishing(true);
    try {
      await Promise.all(
        drafts.map((s) => apiClient.post(`/shifts/${s.id}/publish`)),
      );
      toast.success(`Published ${drafts.length} shift(s).`);
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
    } catch {
      toast.error('Failed to publish some shifts.');
    } finally {
      setPublishing(false);
    }
  }, [shifts, queryClient]);

  const hasDrafts = shifts.some((s) => s.status === 'draft');
  const firstLocationTz = locations[0]?.ianaTimezone ?? 'UTC';

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-800" />
        <div className="h-64 animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
        Failed to load shifts. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Schedule</h1>
      </div>
      <ScheduleControls
        week={week}
        onWeekChange={setWeek}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        locationIds={locationId ? [locationId] : []}
        locations={locations}
        onAddShift={() => setCreateOpen(true)}
        onPublishWeek={handlePublishWeek}
        isPublishing={publishing}
        hasDrafts={hasDrafts}
      />
      {viewMode === 'calendar' ? (
        <WeeklyCalendarView
          shifts={shifts}
          week={week}
          locationTimezone={firstLocationTz}
          onShiftClick={handleShiftClick}
        />
      ) : (
        <ScheduleListView
          shifts={shifts}
          week={week}
          onShiftClick={handleShiftClick}
          onAssign={(s) => {
            setDetailShiftId(s.id);
            setDetailOpen(true);
          }}
          onPublish={async (s) => {
            try {
              await apiClient.post(`/shifts/${s.id}/publish`);
              toast.success('Shift published.');
              queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
            } catch {
              toast.error('Failed to publish shift.');
            }
          }}
        />
      )}
      <ShiftDetailSheet
        shiftId={detailShiftId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAssign={(shift) => {
          setDetailOpen(false);
          setDetailShiftId(shift.id);
          setDetailOpen(true);
        }}
        afterMutation={() =>
          queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() })
        }
      />
      <CreateShiftForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        locations={locations}
        skills={skills}
        defaultLocationId={locationId}
        defaultWeek={week}
      />
    </div>
  );
}
