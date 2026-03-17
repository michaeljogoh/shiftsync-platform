'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { ShiftSummary } from '@/lib/api/server/shifts';
import { formatShiftTimeRange } from '@/lib/format-shift-time';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PencilIcon, UserPlusIcon, HistoryIcon } from 'lucide-react';
import { useState } from 'react';

interface ShiftDetailSheetProps {
  shiftId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign?: (shift: ShiftSummary) => void;
  onEdit?: (shift: ShiftSummary) => void;
  afterMutation?: () => void;
}

interface ShiftDetailResponse extends ShiftSummary {
  assignments?: { id: string; user?: { id: string; firstName: string; lastName: string; email: string } }[];
  history?: { id: string; action: string; createdAt: string; actor?: { email: string } }[];
}

async function fetchShiftDetail(id: string) {
  const { data } = await apiClient.get<ShiftDetailResponse>(`/shifts/${id}`);
  return data;
}


export function ShiftDetailSheet({
  shiftId,
  open,
  onOpenChange,
  onAssign,
  onEdit,
  afterMutation,
}: ShiftDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const { data: shift, isLoading } = useQuery({
    queryKey: queryKeys.shifts.detail(shiftId ?? ''),
    queryFn: () => fetchShiftDetail(shiftId!),
    enabled: open && !!shiftId,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Shift details</SheetTitle>
          <SheetDescription>
            {shift ? (
              <>
                {shift.title ?? 'Untitled'} · {shift.location?.name ?? shift.locationId}
              </>
            ) : (
              'Loading…'
            )}
          </SheetDescription>
        </SheetHeader>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {!isLoading && shift && (
          <div className="flex flex-1 flex-col gap-4 overflow-auto">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={shift.status === 'published' ? 'default' : 'secondary'}>
                {shift.status}
              </Badge>
              {shift.isPremium && (
                <Badge variant="outline" className="text-amber-500">
                  Premium
                </Badge>
              )}
              <PermissionGate require="shifts:update">
                {onEdit && (
                  <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => onEdit(shift)}>
                    <PencilIcon className="size-3" />
                    Edit
                  </Button>
                )}
              </PermissionGate>
              <PermissionGate require="assignments:create">
                {onAssign && (
                  <Button size="sm" className="h-7 gap-1" onClick={() => onAssign(shift)}>
                    <UserPlusIcon className="size-3" />
                    Assign
                  </Button>
                )}
              </PermissionGate>
            </div>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-slate-500">Time (location)</span>
                <p className="font-medium text-slate-100">
                  {(() => {
                    const tz = shift.location?.ianaTimezone ?? 'UTC';
                    const { primary, secondary } = formatShiftTimeRange({
                      startAt: shift.startAt,
                      endAt: shift.endAt,
                      locationTimezone: tz,
                      showUserLocal: true,
                    });
                    return (
                      <>
                        {primary}
                        {secondary && (
                          <span className="ml-1 text-slate-500 font-normal">{secondary}</span>
                        )}
                      </>
                    );
                  })()}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Required skill</span>
                <p className="font-medium text-slate-100">{shift.requiredSkill?.name ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Headcount</span>
                <p className="font-medium text-slate-100">
                  {(shift.assignments?.length ?? 0)} / {shift.headcountNeeded}
                </p>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((shift.assignments?.length ?? 0) / shift.headcountNeeded) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-300">Assigned staff</h4>
              {shift.assignments?.length ? (
                <ul className="space-y-1">
                  {shift.assignments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 rounded-md bg-slate-800/50 px-2 py-1.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {a.user ? `${a.user.firstName[0]}${a.user.lastName[0]}` : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-200">
                        {a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No one assigned yet.</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-slate-800 pt-3">
              <Button
                variant={activeTab === 'details' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1"
                onClick={() => setActiveTab('details')}
              >
                Details
              </Button>
              <Button
                variant={activeTab === 'history' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1"
                onClick={() => setActiveTab('history')}
              >
                <HistoryIcon className="size-3" />
                History
              </Button>
            </div>
            {activeTab === 'history' && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Audit trail</h4>
                {shift.history?.length ? (
                  <ul className="space-y-2 text-xs">
                    {shift.history.map((h) => (
                      <li key={h.id} className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1.5">
                        <span className="font-medium">{h.action}</span>
                        <span className="text-slate-500">
                          {' '}
                          · {new Date(h.createdAt).toLocaleString()} · {h.actor?.email ?? 'System'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No history yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
