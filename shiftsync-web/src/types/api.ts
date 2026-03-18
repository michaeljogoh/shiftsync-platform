// Minimal API surface used so far. Extend as more endpoints are wired.

export type ShiftStatus = 'draft' | 'published' | 'cancelled';

export interface Shift {
  id: string;
  locationId: string;
  requiredSkillId: string;
  title: string | null;
  startAt: string;
  endAt: string;
  headcountNeeded: number;
  editCutoffHours: number;
  status: ShiftStatus;
}

