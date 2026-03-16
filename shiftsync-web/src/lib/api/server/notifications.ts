import 'server-only';

import { serverFetch } from './client';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export async function fetchNotifications(params: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  token?: string;
}): Promise<NotificationItem[]> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  if (params.unreadOnly) search.set('unreadOnly', 'true');
  const path = `/notifications?${search.toString()}`;
  return serverFetch<NotificationItem[]>(path, {
    token: params.token,
    tags: ['notifications'],
  });
}

export async function fetchUnreadCount(params?: { token?: string }): Promise<number> {
  const res = await serverFetch<UnreadCountResponse>('/notifications/unread-count', {
    token: params?.token,
    tags: ['notifications'],
  });
  return res.count;
}
