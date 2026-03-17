'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldXIcon } from 'lucide-react';

export function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
      <ShieldXIcon className="mb-3 size-10 text-amber-400" />
      <p className="text-sm font-medium text-slate-200">You don&apos;t have access to this.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/schedule">Go back</Link>
      </Button>
    </div>
  );
}
