export const RealtimeEvents = {
  SCHEDULE_PUBLISHED: 'schedule.published',
  SCHEDULE_UPDATED: 'schedule.updated',
  SHIFT_CANCELLED: 'shift.cancelled',
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_CANCELLED: 'assignment.cancelled',
  ASSIGNMENT_CONFLICT: 'assignment.conflict',
  SWAP_REQUEST_RECEIVED: 'swap.request_received',
  SWAP_STATUS_CHANGED: 'swap.status_changed',
  SWAP_MANAGER_ACTION: 'swap.manager_action',
  DUTY_UPDATE: 'duty.update',
  NOTIFICATION_NEW: 'notification.new',
} as const;
