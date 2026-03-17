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
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
      <AlertCircleIcon className="mb-3 size-10 text-red-400" />
      <p className="text-sm font-medium text-slate-200">{message}</p>
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
