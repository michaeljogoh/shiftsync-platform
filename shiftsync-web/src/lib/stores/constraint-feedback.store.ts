'use client';

import { create } from 'zustand';
import type { ConstraintSuggestion } from '@/types/constraint-feedback';

export interface ConstraintViolationState {
  title: string;
  reason: string;
  suggestions: ConstraintSuggestion[];
  shiftId: string;
  onAssignUserId: (userId: string) => void;
}

export interface OvertimeWarningState {
  assignmentId: string;
  shiftId: string;
  userId: string;
  userName: string;
  projectedWeeklyHours: number;
  limitHours?: number;
  estimatedOvertimeCost?: number;
  onUndo: () => void | Promise<void>;
}

export interface ConsecutiveDayOverrideState {
  shiftId: string;
  userId: string;
  userName: string;
  onSubmitOverride: (overrideReason: string) => void;
}

interface ConstraintFeedbackStore {
  constraintViolation: ConstraintViolationState | null;
  overtimeWarning: OvertimeWarningState | null;
  consecutiveDayOverride: ConsecutiveDayOverrideState | null;

  showConstraintViolation: (state: ConstraintViolationState) => void;
  showOvertimeWarning: (state: OvertimeWarningState) => void;
  showConsecutiveDayOverride: (state: ConsecutiveDayOverrideState) => void;

  closeConstraintViolation: () => void;
  closeOvertimeWarning: () => void;
  closeConsecutiveDayOverride: () => void;
}

export const useConstraintFeedbackStore = create<ConstraintFeedbackStore>((set) => ({
  constraintViolation: null,
  overtimeWarning: null,
  consecutiveDayOverride: null,

  showConstraintViolation: (state) => set({ constraintViolation: state }),
  showOvertimeWarning: (state) => set({ overtimeWarning: state }),
  showConsecutiveDayOverride: (state) => set({ consecutiveDayOverride: state }),

  closeConstraintViolation: () => set({ constraintViolation: null }),
  closeOvertimeWarning: () => set({ overtimeWarning: null }),
  closeConsecutiveDayOverride: () => set({ consecutiveDayOverride: null }),
}));
