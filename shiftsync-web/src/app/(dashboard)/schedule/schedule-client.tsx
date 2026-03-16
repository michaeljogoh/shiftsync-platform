'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { ShiftSummary } from '@/lib/api/server/shifts';
import type { LocationSummary } from '@/lib/api/server/locations';
import type { SkillSummary } from '@/lib/api/server/skills';
import { CreateShiftForm } from './create-shift-form';

async function fetchShiftsClient(locationId: string | undefined, week: string) {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  params.set('week', week);
  const { data } = await apiClient.get<ShiftSummary[]>(`/shifts?${params.toString()}`);
  return data;
}

interface ScheduleClientProps {
  locationId?: string;
  week: string;
  locations: LocationSummary[];
  skills: SkillSummary[];
}

export function ScheduleClient({ locationId, week, locations, skills }: ScheduleClientProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.shifts.byLocation(locationId, week),
    queryFn: () => fetchShiftsClient(locationId, week),
  });

  if (isLoading) {
    return <div className="text-sm text-slate-400">Loading shifts…</div>;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
        Failed to load shifts. Please try again.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-50">Schedule</h1>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <PlusIcon className="mr-1 size-4" />
            Add shift
          </Button>
        </div>
        <p className="text-sm text-slate-400">No shifts for this week yet.</p>
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Schedule</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <PlusIcon className="mr-1 size-4" />
          Add shift
        </Button>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((shift) => (
          <li
            key={shift.id}
            className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2"
          >
            <div>
              <p className="font-medium text-slate-100">{shift.title ?? 'Untitled shift'}</p>
              <p className="text-xs text-slate-400">
                {shift.startAt} → {shift.endAt} · status: {shift.status}
              </p>
            </div>
            <span className="text-xs text-slate-400">Headcount {shift.headcountNeeded}</span>
          </li>
        ))}
      </ul>
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

