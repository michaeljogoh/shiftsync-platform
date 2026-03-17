import { getServerSession } from '@/lib/auth/server-session';
import { fetchLocations } from '@/lib/api/server/locations';
import { AuditClient } from './audit-client';

export default async function AuditPage() {
  const session = await getServerSession();
  if (!session) {
    return <div className="text-sm text-slate-300">Not authenticated.</div>;
  }

  let locations: Awaited<ReturnType<typeof fetchLocations>> = [];
  try {
    locations = await fetchLocations({ token: session.accessToken });
  } catch {
    // non-blocking
  }

  return <AuditClient locations={locations} />;
}
