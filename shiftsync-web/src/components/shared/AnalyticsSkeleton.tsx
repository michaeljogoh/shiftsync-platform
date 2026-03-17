'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-end gap-1 rounded-lg border border-slate-800 bg-slate-900/30 p-4" style={{ height: 200 }}>
          {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
