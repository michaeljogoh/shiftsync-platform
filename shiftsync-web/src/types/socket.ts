export interface SchedulePublishedPayload {
  locationId: string;
  week: string;
}

export interface ScheduleUpdatedPayload {
  locationId: string;
  week: string;
}

export interface AssignmentCreatedPayload {
  shiftId: string;
}

export interface AssignmentCancelledPayload {
  shiftId: string;
  userId: string;
}

export interface SwapStatusChangedPayload {
  swapId: string;
  initiatorId: string;
  targetId?: string | null;
}

export interface NotificationNewPayload {
  userId: string;
}

