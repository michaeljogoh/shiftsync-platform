import { dehydrate } from '@tanstack/react-query';

import { getServerSession } from '@/lib/auth/server-session';
import { fetchShiftsForWeek } from '@/lib/api/server/shifts';
import { fetchLocations } from '@/lib/api/server/locations';
import { fetchSkills } from '@/lib/api/server/skills';
import { makeQueryClient } from '@/lib/tanstack-query/client';
import { queryKeys } from '@/lib/query-keys';
import { ReactQueryProvider } from '@/lib/tanstack-query/ReactQueryProvider';
import { ScheduleClient } from './schedule-client';

function getCurrentWeekISO(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { locationId?: string; week?: string };
}) {
  const session = await getServerSession();
  if (!session) {
    return <div className="text-sm text-muted-foreground">Not authenticated.</div>;
  }

  const week = searchParams.week ?? getCurrentWeekISO();
  const locationId = searchParams.locationId;

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.shifts.byLocation(locationId, week),
    queryFn: () => fetchShiftsForWeek({ locationId, week, token: session.accessToken }),
  });

  let locations: Awaited<ReturnType<typeof fetchLocations>> = [];
  let skills: Awaited<ReturnType<typeof fetchSkills>> = [];
  try {
    [locations, skills] = await Promise.all([
      fetchLocations({ token: session.accessToken }),
      fetchSkills({ token: session.accessToken }),
    ]);
  } catch {
    // Non-blocking: form will show empty dropdowns
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <ReactQueryProvider dehydratedState={dehydratedState}>
      <ScheduleClient
        locationId={locationId}
        week={week}
        locations={locations}
        skills={skills}
      />
    </ReactQueryProvider>
  );
}

