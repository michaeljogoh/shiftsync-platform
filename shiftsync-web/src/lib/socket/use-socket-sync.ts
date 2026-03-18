'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getSocket } from '@/lib/socket';
import { useOnDutyStore } from '@/lib/stores/on-duty.store';
import { useNotificationsStore } from '@/lib/stores/notifications.store';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { RealtimeEvents } from '@/lib/socket/realtime-events';
import type { DutyUpdatePayload, AssignmentConflictPayload } from '@/types/socket';

export function useSocketSync(): void {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const handlersRegistered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      const s = getSocket();
      if (s.connected) s.disconnect();
      handlersRegistered.current = false;
      return;
    }

    const socket = getSocket();
    (socket.auth as { token?: string }).token = accessToken;

    if (!socket.connected) {
      socket.connect();
    }

    if (handlersRegistered.current) return;
    handlersRegistered.current = true;

    socket.on(RealtimeEvents.SCHEDULE_PUBLISHED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
    });
    socket.on(RealtimeEvents.SCHEDULE_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
    });
    socket.on(RealtimeEvents.SHIFT_CANCELLED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
    });
    socket.on(RealtimeEvents.ASSIGNMENT_CREATED, () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
    });
    socket.on(RealtimeEvents.ASSIGNMENT_CANCELLED, () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
    });
    socket.on(RealtimeEvents.ASSIGNMENT_CONFLICT, (payload: AssignmentConflictPayload) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
      const msg = payload?.message ?? 'Someone was just assigned to another shift.';
      toast.warning(`${msg} Open the assignment form to see alternatives.`);
    });
    socket.on(RealtimeEvents.SWAP_REQUEST_RECEIVED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
    });
    socket.on(RealtimeEvents.SWAP_STATUS_CHANGED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
    });
    socket.on(RealtimeEvents.SWAP_MANAGER_ACTION, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
    });
    socket.on(RealtimeEvents.NOTIFICATION_NEW, () => {
      useNotificationsStore.getState().incrementUnread();
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    });

    socket.on(RealtimeEvents.DUTY_UPDATE, (payload: DutyUpdatePayload) => {
      useOnDutyStore.setState((state) => ({
        data: { ...state.data, [payload.locationId]: payload },
      }));
    });

    return () => {
      socket.off(RealtimeEvents.SCHEDULE_PUBLISHED);
      socket.off(RealtimeEvents.SCHEDULE_UPDATED);
      socket.off(RealtimeEvents.SHIFT_CANCELLED);
      socket.off(RealtimeEvents.ASSIGNMENT_CREATED);
      socket.off(RealtimeEvents.ASSIGNMENT_CANCELLED);
      socket.off(RealtimeEvents.ASSIGNMENT_CONFLICT);
      socket.off(RealtimeEvents.SWAP_REQUEST_RECEIVED);
      socket.off(RealtimeEvents.SWAP_STATUS_CHANGED);
      socket.off(RealtimeEvents.SWAP_MANAGER_ACTION);
      socket.off(RealtimeEvents.NOTIFICATION_NEW);
      socket.off(RealtimeEvents.DUTY_UPDATE);
      handlersRegistered.current = false;
    };
  }, [isAuthenticated, accessToken, queryClient]);
}
