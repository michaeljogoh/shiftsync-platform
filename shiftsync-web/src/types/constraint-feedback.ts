export interface ConstraintSuggestion {
  userId: string;
  name: string;
  reason: string;
}

export interface ConstraintErrorResponse {
  statusCode: 422 | 409;
  error: string;
  message: string;
  details?: Record<string, unknown>;
  suggestions?: ConstraintSuggestion[];
}

export interface AssignmentSuccessWarnings {
  type: 'overtime_approaching' | 'overtime_exceeded' | 'consecutive_day' | 'daily_hours' | 'headcount_exceeded';
  projectedWeeklyHours?: number;
  estimatedOvertimeCost?: number;
  dayNumber?: number;
  dailyHours?: number;
  currentCount?: number;
  headcountNeeded?: number;
}

export interface AssignmentSuccessResponse {
  assignment: { id: string; userId: string; shiftId: string };
  warnings?: AssignmentSuccessWarnings[];
}
