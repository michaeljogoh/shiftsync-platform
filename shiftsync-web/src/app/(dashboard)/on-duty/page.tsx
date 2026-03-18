import { getServerSession } from '@/lib/auth/server-session';
import { fetchLocations } from '@/lib/api/server/locations';
import { OnDutyClient } from './on-duty-client';

export default async function OnDutyPage() {
  const session = await getServerSession();
  if (!session) {
    return <div className="text-sm text-muted-foreground">Not authenticated.</div>;
  }

  let locations: Awaited<ReturnType<typeof fetchLocations>> = [];
  try {
    locations = await fetchLocations({ token: session.accessToken });
  } catch {
    // non-blocking
  }

  return <OnDutyClient locations={locations} />;
}
