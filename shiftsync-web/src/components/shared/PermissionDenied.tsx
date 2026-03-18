'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldXIcon } from 'lucide-react';

export function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center">
      <ShieldXIcon className="mb-3 size-10 text-destructive" />
      <p className="text-sm font-medium text-foreground">You don&apos;t have access to this.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/schedule">Go back</Link>
      </Button>
    </div>
  );
}
