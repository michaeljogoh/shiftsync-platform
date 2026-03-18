import { getServerSession } from '@/lib/auth/server-session';
import { fetchLocations } from '@/lib/api/server/locations';
import { fetchSkills } from '@/lib/api/server/skills';
import { StaffClient } from './staff-client';

export default async function StaffPage() {
  const session = await getServerSession();
  if (!session) {
    return <div className="text-sm text-muted-foreground">Not authenticated.</div>;
  }

  let locations: Awaited<ReturnType<typeof fetchLocations>> = [];
  let skills: Awaited<ReturnType<typeof fetchSkills>> = [];
  try {
    [locations, skills] = await Promise.all([
      fetchLocations({ token: session.accessToken }),
      fetchSkills({ token: session.accessToken }),
    ]);
  } catch {
    // Non-blocking
  }

  return (
    <StaffClient locations={locations} skills={skills} />
  );
}
