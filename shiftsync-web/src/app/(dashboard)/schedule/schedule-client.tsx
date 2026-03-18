'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import { getWeekRange, weekToStartEnd } from '@/lib/schedule-utils';
import { useUIStore } from '@/lib/stores/ui.store';
import type { ShiftSummary } from '@/lib/api/server/shifts';
import type { LocationSummary } from '@/lib/api/server/locations';
import type { SkillSummary } from '@/lib/api/server/skills';
import { FullPageError } from '@/components/shared/FullPageError';
import { PermissionDenied } from '@/components/shared/PermissionDenied';
import { NotFound } from '@/components/shared/NotFound';
import { ScheduleCalendarSkeleton, ScheduleListSkeleton } from '@/components/shared/ScheduleSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScheduleControls, type ViewMode } from './schedule-controls';
import { WeeklyCalendarView } from './weekly-calendar-view';
import { SingleDayCalendarView } from './single-day-calendar-view';
import { ScheduleListView } from './schedule-list-view';
import { ShiftDetailSheet } from './shift-detail-sheet';
import { CreateShiftForm } from './create-shift-form';
import { AssignStaffModal } from './assign-staff-modal';
import { ShiftEditModal } from './shift-edit-modal';

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

function weekStringToMonday(week: string): Date {
  const d = new Date(week + 'T12:00:00.000Z');
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
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
  const viewMode = useUIStore((s) => s.scheduleViewMode);
  const setScheduleViewMode = useUIStore((s) => s.setScheduleViewMode);
  const setActiveWeek = useUIStore((s) => s.setActiveWeek);
  const setActiveLocationFilter = useUIStore((s) => s.setActiveLocationFilter);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailShiftId, setDetailShiftId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignShift, setAssignShift] = useState<ShiftSummary | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editShift, setEditShift] = useState<ShiftSummary | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const searchParams = useSearchParams();
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(() => {
    const { start: weekStart } = getWeekRange(week);
    const today = new Date();
    const diff = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, Math.min(6, diff));
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    setActiveWeek(weekStringToMonday(week));
  }, [week, setActiveWeek]);

  useEffect(() => {
    const { start: weekStart } = getWeekRange(week);
    const today = new Date();
    const diff = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
    setMobileDayIndex((prev) => Math.max(0, Math.min(6, diff >= 0 && diff <= 6 ? diff : prev)));
  }, [week]);

  useEffect(() => {
    setActiveLocationFilter(locationId ? [locationId] : []);
  }, [locationId, setActiveLocationFilter]);

  // Scenario 1: Deep link from notification (e.g. callout) — open shift detail and auto-open assign if understaffed.
  useEffect(() => {
    const linkShiftId = searchParams.get('shiftId');
    const openAssign = searchParams.get('openAssign') === '1';
    if (linkShiftId && openAssign) {
      setDetailShiftId(linkShiftId);
      setDetailOpen(true);
    }
  }, [searchParams]);

  const { data: shifts = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.shifts.byLocation(locationId, week),
    queryFn: () => fetchShiftsClient(locationId, week),
  });

  const statusCode = (error as { response?: { status?: number } })?.response?.status;

  const setWeek = useCallback(
    (newWeek: string) => {
      setActiveWeek(weekStringToMonday(newWeek));
      const params = new URLSearchParams();
      params.set('week', newWeek);
      if (locationId) params.set('locationId', locationId);
      router.push(`${pathname ?? '/schedule'}?${params.toString()}`);
    },
    [pathname, locationId, router, setActiveWeek],
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Schedule</h1>
        </div>
        <ScheduleControls
          week={week}
          onWeekChange={setWeek}
          viewMode={viewMode}
          onViewModeChange={setScheduleViewMode}
          locationIds={locationId ? [locationId] : []}
          locations={locations}
          onAddShift={() => setCreateOpen(true)}
          onPublishWeek={() => {}}
          isPublishing={false}
          hasDrafts={false}
        />
        {viewMode === 'calendar' ? (
          <ScheduleCalendarSkeleton week={week} />
        ) : (
          <ScheduleListSkeleton />
        )}
      </div>
    );
  }

  if (isError) {
    if (statusCode === 403) {
      return <PermissionDenied />;
    }
    if (statusCode === 404) {
      return <NotFound message="No schedule found for this week." backHref="/schedule" />;
    }
    return (
      <FullPageError
        message="Failed to load shifts. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Schedule</h1>
      </div>
      <ScheduleControls
        week={week}
        onWeekChange={setWeek}
        viewMode={viewMode}
        onViewModeChange={setScheduleViewMode}
        locationIds={locationId ? [locationId] : []}
        locations={locations}
        onAddShift={() => setCreateOpen(true)}
        onPublishWeek={handlePublishWeek}
        isPublishing={publishing}
        hasDrafts={hasDrafts}
      />
      {shifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No shifts scheduled yet.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            + Add Shift
          </Button>
        </div>
      ) : viewMode === 'calendar' && isMobile ? (
        <SingleDayCalendarView
          shifts={shifts}
          week={week}
          dayIndex={mobileDayIndex}
          onDayChange={setMobileDayIndex}
          locationTimezone={firstLocationTz}
          onShiftClick={handleShiftClick}
        />
      ) : viewMode === 'calendar' ? (
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
          onEdit={(s) => {
            setEditShift(s);
            setEditOpen(true);
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
          setAssignShift(shift);
          setAssignOpen(true);
        }}
        onEdit={(shift) => {
          setDetailOpen(false);
          setEditShift(shift);
          setEditOpen(true);
        }}
        afterMutation={() =>
          queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() })
        }
        openAssignIfUnderstaffed={
          searchParams.get('openAssign') === '1' && searchParams.get('shiftId') === detailShiftId
        }
      />
      <ShiftEditModal
        shift={editShift}
        skills={skills}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditShift(null);
        }}
        afterMutation={() =>
          queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() })
        }
      />
      <AssignStaffModal
        shift={assignShift}
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignShift(null);
        }}
        afterSuccess={() =>
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
