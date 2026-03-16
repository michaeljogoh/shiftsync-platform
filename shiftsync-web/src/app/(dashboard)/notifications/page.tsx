import { dehydrate } from '@tanstack/react-query';

import { getServerSession } from '@/lib/auth/server-session';
import { fetchUnreadCount } from '@/lib/api/server/notifications';
import { makeQueryClient } from '@/lib/tanstack-query/client';
import { queryKeys } from '@/lib/query-keys';
import { ReactQueryProvider } from '@/lib/tanstack-query/ReactQueryProvider';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage() {
  const session = await getServerSession();
  if (!session) {
    return <div className="text-sm text-slate-300">Not authenticated.</div>;
  }

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => fetchUnreadCount({ token: session.accessToken }),
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <ReactQueryProvider dehydratedState={dehydratedState}>
      <NotificationsClient />
    </ReactQueryProvider>
  );
}
