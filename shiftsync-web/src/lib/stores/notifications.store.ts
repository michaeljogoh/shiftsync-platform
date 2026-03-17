'use client';

import { create } from 'zustand';

export interface NotificationsStore {
  /** Updated by WebSocket 'notification.new'; used for badge without refetching. */
  unreadCount: number;
  /** Optimistic read tracking: IDs we've marked read but not yet confirmed. */
  pendingReadIds: Set<string>;

  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  addPendingRead: (id: string) => void;
  removePendingRead: (id: string) => void;
  /** Optimistic: decrement and add to pending (call after API confirms to remove from pending). */
  markReadOptimistic: (id: string) => void;
  clearPendingRead: (id: string) => void;
  /** After mark-all-read API success. */
  setAllRead: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  unreadCount: 0,
  pendingReadIds: new Set(),

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  incrementUnread: () =>
    set((s) => ({ unreadCount: s.unreadCount + 1 })),

  addPendingRead: (id) =>
    set((s) => {
      const next = new Set(s.pendingReadIds);
      next.add(id);
      return { pendingReadIds: next };
    }),

  removePendingRead: (id) =>
    set((s) => {
      const next = new Set(s.pendingReadIds);
      next.delete(id);
      return { pendingReadIds: next };
    }),

  markReadOptimistic: (id) =>
    set((s) => {
      const next = new Set(s.pendingReadIds);
      next.add(id);
      return {
        unreadCount: Math.max(0, s.unreadCount - 1),
        pendingReadIds: next,
      };
    }),

  clearPendingRead: (id) =>
    set((s) => {
      const next = new Set(s.pendingReadIds);
      next.delete(id);
      return { pendingReadIds: next };
    }),

  setAllRead: () =>
    set({ unreadCount: 0, pendingReadIds: new Set() }),
}));
