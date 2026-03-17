'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import { useNotificationsStore } from '@/lib/stores/notifications.store';
import { useAuthStore } from '@/lib/stores/auth.store';

async function fetchUnread() {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

/** Syncs React Query unread count to notifications store so socket updates and badge stay in sync. */
export function NotificationsStoreSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: fetchUnread,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (data !== undefined) {
      useNotificationsStore.getState().setUnreadCount(data);
    }
  }, [data]);

  return null;
}
