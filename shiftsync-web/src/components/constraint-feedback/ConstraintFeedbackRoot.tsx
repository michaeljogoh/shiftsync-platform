'use client';

import { ConstraintViolationModal } from './ConstraintViolationModal';
import { OvertimeWarningModal } from './OvertimeWarningModal';
import { ConsecutiveDayOverrideModal } from './ConsecutiveDayOverrideModal';

export function ConstraintFeedbackRoot() {
  return (
    <>
      <ConstraintViolationModal />
      <OvertimeWarningModal />
      <ConsecutiveDayOverrideModal />
    </>
  );
}
