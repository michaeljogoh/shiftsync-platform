'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useConstraintFeedbackStore } from '@/lib/stores/constraint-feedback.store';
import { AlertTriangleIcon } from 'lucide-react';

export function OvertimeWarningModal() {
  const { overtimeWarning, closeOvertimeWarning } =
    useConstraintFeedbackStore();

  if (!overtimeWarning) return null;

  const {
    userName,
    projectedWeeklyHours,
    limitHours = 40,
    estimatedOvertimeCost,
    onUndo,
  } = overtimeWarning;

  const progressPct = Math.min(100, (projectedWeeklyHours / limitHours) * 100);

  return (
    <Dialog open={!!overtimeWarning} onOpenChange={(open) => !open && closeOvertimeWarning()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangleIcon className="size-5 shrink-0" />
            Assignment created — overtime warning
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-200">
            Adding this shift will bring <strong>{userName}</strong> to{' '}
            <strong>{projectedWeeklyHours} hours</strong> this week — approaching
            overtime.
          </p>
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Weekly hours</span>
              <span>
                {projectedWeeklyHours}h / {limitHours}h limit
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          {estimatedOvertimeCost != null && estimatedOvertimeCost > 0 && (
            <p className="text-sm text-slate-400">
              Estimated additional cost if they reach 40h: ~$
              {estimatedOvertimeCost.toFixed(2)}/hr for any hours beyond 40.
            </p>
          )}
        </div>
        <DialogFooter showCloseButton={false} className="flex justify-between sm:justify-end gap-2">
          <Button variant="outline" onClick={onUndo}>
            Undo assignment
          </Button>
          <Button onClick={closeOvertimeWarning}>OK, I understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
