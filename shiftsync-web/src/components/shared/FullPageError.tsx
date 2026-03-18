'use client';

import { Button } from '@/components/ui/button';
import { AlertCircleIcon } from 'lucide-react';

interface FullPageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function FullPageError({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: FullPageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center">
      <AlertCircleIcon className="mb-3 size-10 text-destructive" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
