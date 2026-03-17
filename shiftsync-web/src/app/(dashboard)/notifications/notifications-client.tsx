'use client';

import { useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import { useNotificationsStore } from '@/lib/stores/notifications.store';
import { FullPageError } from '@/components/shared/FullPageError';
import type { NotificationItem } from '@/lib/api/server/notifications';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

async function fetchNotificationsPage(offset: number) {
  const { data } = await apiClient.get<NotificationItem[]>(
    `/notifications?limit=${PAGE_SIZE}&offset=${offset}`,
  );
  return data;
}

async function fetchUnreadCountClient() {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

function groupNotifications(list: NotificationItem[]): { today: NotificationItem[]; thisWeek: NotificationItem[]; older: NotificationItem[] } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const today: NotificationItem[] = [];
  const thisWeek: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  list.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d >= startOfToday) today.push(n);
    else if (d >= startOfWeek) thisWeek.push(n);
    else older.push(n);
  });

  return { today, thisWeek, older };
}

export function NotificationsClient() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: listLoading,
    isError: listError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length >= PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });

  const notifications = useMemo(
    () => (data?.pages ?? []).flat(),
    [data?.pages],
  );

  const { data: unreadCount, isLoading: countLoading } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: fetchUnreadCountClient,
  });

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      useNotificationsStore.getState().setAllRead();
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const isInitialLoading = listLoading && !data?.pages?.length;

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-50">Notifications</h1>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-50">Notifications</h1>
        <FullPageError
          message="Failed to load notifications. Please try again."
          onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })}
        />
      </div>
    );
  }

  const showUnreadBadge = !countLoading && (unreadCount ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Notifications</h1>
        <div className="flex items-center gap-2">
          {showUnreadBadge && (
            <>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {unreadCount} unread
              </span>
              <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            </>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-slate-100">You&apos;re all caught up ✓</CardTitle>
            <CardDescription>No new notifications. Check back later.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {groups.today.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Today</h2>
              <ul className="space-y-2">
                {groups.today.map((n) => (
                  <NotificationCard key={n.id} notification={n} onUpdate={() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })} />
                ))}
              </ul>
            </section>
          )}
          {groups.thisWeek.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">This week</h2>
              <ul className="space-y-2">
                {groups.thisWeek.map((n) => (
                  <NotificationCard key={n.id} notification={n} onUpdate={() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })} />
                ))}
              </ul>
            </section>
          )}
          {groups.older.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Older</h2>
              <ul className="space-y-2">
                {groups.older.map((n) => (
                  <NotificationCard key={n.id} notification={n} onUpdate={() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })} />
                ))}
              </ul>
            </section>
          )}
          <div className="flex justify-center pt-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={!hasNextPage || isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? 'Loading…' : hasNextPage ? 'Load more' : 'No more'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationCard({
  notification: n,
  onUpdate,
}: {
  notification: NotificationItem;
  onUpdate: () => void;
}) {
  const handleClick = async () => {
    if (!n.isRead) {
      try {
        await apiClient.patch(`/notifications/${n.id}/read`);
        onUpdate();
      } catch {
        // ignore
      }
    }
    if (n.referenceType && n.referenceId) {
      // Navigate to entity - could use router.push based on type
    }
  };

  return (
    <li>
      <Card
        className={`cursor-pointer border-slate-800 transition-colors hover:bg-slate-800/50 ${
          n.isRead ? 'bg-slate-900/30' : 'bg-slate-900/60'
        }`}
        onClick={handleClick}
      >
        <CardHeader className="py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-100">
                {!n.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                {n.title}
              </CardTitle>
              {n.body && (
                <CardDescription className="mt-1 text-xs text-slate-400">{n.body}</CardDescription>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </li>
  );
}
