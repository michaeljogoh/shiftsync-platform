'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useConstraintFeedbackStore } from '@/lib/stores/constraint-feedback.store';
import { BanIcon } from 'lucide-react';

const MIN_REASON_LENGTH = 20;

export function ConsecutiveDayOverrideModal() {
  const { consecutiveDayOverride, closeConsecutiveDayOverride } =
    useConstraintFeedbackStore();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!consecutiveDayOverride) return null;

  const { userName, onSubmitOverride } = consecutiveDayOverride;
  const valid = reason.trim().length >= MIN_REASON_LENGTH;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await onSubmitOverride(reason.trim());
      closeConsecutiveDayOverride();
      setReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeConsecutiveDayOverride();
      setReason('');
    }
  };

  return (
    <Dialog open={!!consecutiveDayOverride} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <BanIcon className="size-5 shrink-0" />
            7th consecutive day — override required
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            <strong>{userName}</strong> would be working their 7th consecutive
            day. This requires documented manager approval.
          </p>
          <div>
            <label
              htmlFor="override-reason"
              className="text-sm font-medium text-muted-foreground"
            >
              Override reason:
            </label>
            <textarea
              id="override-reason"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={`Minimum ${MIN_REASON_LENGTH} characters`}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={MIN_REASON_LENGTH}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This reason will be logged in the audit trail.
            </p>
          </div>
        </div>
        <DialogFooter showCloseButton={false} className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Override & assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
