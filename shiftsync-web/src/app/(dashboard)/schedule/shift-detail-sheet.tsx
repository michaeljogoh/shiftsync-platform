'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  Sheet as ShiftSheetRoot,
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

interface ShiftDetailSheetProps {
  shiftId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign?: (shift: ShiftSummary) => void;
  onEdit?: (shift: ShiftSummary) => void;
  afterMutation?: () => void;
  /** Scenario 1: When true and shift is understaffed, assign modal opens automatically. */
  openAssignIfUnderstaffed?: boolean;
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
  openAssignIfUnderstaffed = false,
}: ShiftDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const hasAutoOpenedAssign = useRef(false);

  const { data: shift, isLoading } = useQuery({
    queryKey: queryKeys.shifts.detail(shiftId ?? ''),
    queryFn: () => fetchShiftDetail(shiftId!),
    enabled: open && !!shiftId,
  });

  // Scenario 1: Auto-open assign modal when shift is understaffed (e.g. from callout notification).
  useEffect(() => {
    if (!open) hasAutoOpenedAssign.current = false;
    if (!open || !shift || !onAssign || !openAssignIfUnderstaffed || hasAutoOpenedAssign.current) return;
    const assigned = shift.assignments?.length ?? 0;
    const needed = shift.headcountNeeded ?? 1;
    const slotsOpen = Math.max(0, needed - assigned);
    if (slotsOpen > 0) {
      hasAutoOpenedAssign.current = true;
      onAssign(shift);
    }
  }, [open, shift, onAssign, openAssignIfUnderstaffed]);

  return (
    <ShiftSheetRoot open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-4 sm:max-w-md">
        <SheetHeader className="p-0">
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
            {/* Scenario 1: Callout / understaffed banner with countdown */}
            {(() => {
              const assigned = shift.assignments?.length ?? 0;
              const needed = shift.headcountNeeded ?? 1;
              const slotsOpen = Math.max(0, needed - assigned);
              const startAt = shift.startAt ? new Date(shift.startAt) : null;
              const now = new Date();
              const msUntil = startAt ? startAt.getTime() - now.getTime() : 0;
              const hoursUntil = (msUntil > 0) ? msUntil / (60 * 60 * 1000) : 0;
              const countdownLabel =
                (hoursUntil >= 24)
                  ? `${Math.floor(hoursUntil / 24)} days`
                  : (hoursUntil >= 1)
                    ? `${Math.floor(hoursUntil)} hour${Math.floor(hoursUntil) !== 1 ? 's' : ''}`
                    : (hoursUntil > 0)
                      ? `${Math.max(1, Math.ceil(hoursUntil * 60))} min`
                      : null;
              if (slotsOpen > 0 && countdownLabel) {
                return (
                  <div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">
                      {slotsOpen} staff called out — {countdownLabel} until shift
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Assign a replacement below.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={shift.status === 'published' ? 'default' : 'secondary'}>
                {shift.status}
              </Badge>
              {shift.isPremium && (
                <Badge variant="outline" className="text-primary">
                  Premium
                </Badge>
              )}
              <PermissionGate require="shifts:update">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] gap-1 sm:h-7 sm:min-h-0"
                    onClick={() => onEdit(shift)}
                  >
                    <PencilIcon className="size-3" />
                    Edit
                  </Button>
                )}
              </PermissionGate>
              <PermissionGate require="assignments:create">
                {onAssign && (
                  <Button
                    size="sm"
                    className="min-h-[44px] gap-1 sm:h-7 sm:min-h-0"
                    onClick={() => onAssign(shift)}
                  >
                    <UserPlusIcon className="size-3" />
                    Assign
                  </Button>
                )}
              </PermissionGate>
            </div>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Time (location)</span>
                <p className="font-medium text-foreground">
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
                          <span className="ml-1 text-muted-foreground font-normal">{secondary}</span>
                        )}
                      </>
                    );
                  })()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Required skill</span>
                <p className="font-medium text-foreground">{shift.requiredSkill?.name ?? '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Headcount</span>
                <p className="font-medium text-foreground">
                  {(shift.assignments?.length ?? 0)} / {shift.headcountNeeded}
                </p>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
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
              <h4 className="mb-2 text-sm font-medium text-foreground">Assigned staff</h4>
              {shift.assignments?.length ? (
                <ul className="space-y-1">
                  {shift.assignments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {a.user ? `${a.user.firstName[0]}${a.user.lastName[0]}` : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">
                        {a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No one assigned yet.</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-border pt-3">
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
                <h4 className="text-sm font-medium text-foreground">Audit trail</h4>
                {shift.history?.length ? (
                  <ul className="space-y-2 text-xs">
                    {shift.history.map((h) => (
                      <li key={h.id} className="rounded border border-border bg-card px-2 py-1.5">
                        <span className="font-medium">{h.action}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          · {new Date(h.createdAt).toLocaleString()} · {h.actor?.email ?? 'System'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No history yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </ShiftSheetRoot>
  );
}
