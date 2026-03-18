'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestionIcon } from 'lucide-react';

interface NotFoundProps {
  message?: string;
  backHref?: string;
  backLabel?: string;
}

export function NotFound({
  message = 'This page or resource could not be found.',
  backHref = '/schedule',
  backLabel = 'Go back',
}: NotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center">
      <FileQuestionIcon className="mb-3 size-10 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
