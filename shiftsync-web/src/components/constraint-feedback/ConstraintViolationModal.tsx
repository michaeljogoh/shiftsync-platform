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
import { AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';

export function ConstraintViolationModal() {
  const { constraintViolation, closeConstraintViolation } =
    useConstraintFeedbackStore();

  if (!constraintViolation) return null;

  const { title, reason, suggestions, onAssignUserId } = constraintViolation;

  return (
    <Dialog open={!!constraintViolation} onOpenChange={(open) => !open && closeConstraintViolation()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangleIcon className="size-5 shrink-0" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Reason:</p>
            <p className="mt-1 text-sm text-slate-200">{reason}</p>
          </div>
          {suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300">
                Suggested alternatives:
              </p>
              <ul className="mt-2 space-y-3">
                {suggestions.map((s) => {
                  const nearOT = /near OT|approaching overtime|overtime/i.test(s.reason);
                  return (
                  <li
                    key={s.userId}
                    className="rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {nearOT ? (
                          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        ) : (
                          <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        )}
                        <div>
                          <p className="font-medium text-slate-100">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.reason}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onAssignUserId(s.userId)}
                      >
                        Assign {s.name.split(' ')[0]}
                      </Button>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter showCloseButton={false} className="flex justify-end">
          <Button variant="outline" onClick={closeConstraintViolation}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
