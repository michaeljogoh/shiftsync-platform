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
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
      <FileQuestionIcon className="mb-3 size-10 text-slate-400" />
      <p className="text-sm font-medium text-slate-200">{message}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
