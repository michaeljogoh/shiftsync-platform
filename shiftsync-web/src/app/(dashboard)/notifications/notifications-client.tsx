'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { NotificationItem } from '@/lib/api/server/notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchNotificationsClient() {
  const { data } = await apiClient.get<NotificationItem[]>('/notifications?limit=25&offset=0');
  return data;
}

async function fetchUnreadCountClient() {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export function NotificationsClient() {
  const {
    data: notifications,
    isLoading: listLoading,
    isError: listError,
  } = useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: fetchNotificationsClient,
  });

  const { data: unreadCount, isLoading: countLoading } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: fetchUnreadCountClient,
  });

  if (listLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold text-slate-50">Notifications</h1>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold text-slate-50">Notifications</h1>
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          Failed to load notifications. Please try again.
        </div>
      </div>
    );
  }

  const list = notifications ?? [];
  const showUnreadBadge = !countLoading && (unreadCount ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Notifications</h1>
        {showUnreadBadge && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {unreadCount} unread
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-slate-100">No notifications</CardTitle>
            <CardDescription>You&apos;re all caught up.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.id}>
              <Card
                className={`border-slate-800 transition-colors ${
                  n.isRead ? 'bg-slate-900/30' : 'bg-slate-900/60'
                }`}
              >
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        {!n.isRead && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                        {n.title}
                      </CardTitle>
                      {n.body && (
                        <CardDescription className="mt-1 text-xs text-slate-400">
                          {n.body}
                        </CardDescription>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
