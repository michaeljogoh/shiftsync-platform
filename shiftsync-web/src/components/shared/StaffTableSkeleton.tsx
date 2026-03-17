'use client';

import { Skeleton } from '@/components/ui/skeleton';

const ROWS = 8;

export function StaffTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 -mx-1 px-1 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-900/70">
            <th className="px-3 py-2 text-left font-medium text-slate-300">Staff</th>
            <th className="px-3 py-2 text-left font-medium text-slate-300">Role</th>
            <th className="px-3 py-2 text-left font-medium text-slate-300">Skills</th>
            <th className="px-3 py-2 text-left font-medium text-slate-300">Certified locations</th>
            <th className="px-3 py-2 text-left font-medium text-slate-300">Hours this week</th>
            <th className="px-3 py-2 text-left font-medium text-slate-300">Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROWS }, (_, i) => (
            <tr key={i} className="border-b border-slate-800">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-5 w-14 rounded" />
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-20 rounded" />
                </div>
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-5 w-24 rounded" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-4 w-10" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-5 w-14 rounded" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
