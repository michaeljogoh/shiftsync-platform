'use client';

import { useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ShiftSummary } from '@/lib/api/server/shifts';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PencilIcon, UserPlusIcon, SendIcon } from 'lucide-react';

interface ScheduleListViewProps {
  shifts: ShiftSummary[];
  week: string;
  onShiftClick: (shift: ShiftSummary) => void;
  onAssign?: (shift: ShiftSummary) => void;
  onEdit?: (shift: ShiftSummary) => void;
  onPublish?: (shift: ShiftSummary) => void;
}

function formatTime(iso: string, tz?: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    timeZone: tz ?? 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(iso: string, tz?: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    timeZone: tz ?? 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function ScheduleListView({
  shifts,
  onShiftClick,
  onAssign,
  onEdit,
  onPublish,
}: ScheduleListViewProps) {
  const grouped = useMemo(() => {
    const byDate = new Map<string, Map<string, ShiftSummary[]>>();
    shifts.forEach((shift) => {
      const dateKey = shift.startAt.slice(0, 10);
      const locId = shift.locationId;
      if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
      const locMap = byDate.get(dateKey)!;
      if (!locMap.has(locId)) locMap.set(locId, []);
      locMap.get(locId)!.push(shift);
    });
    byDate.forEach((locMap) => {
      locMap.forEach((list) => list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    });
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [shifts]);

  return (
    <div className="space-y-6">
      {grouped.map(([dateKey, locMap]) => (
        <div key={dateKey}>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">
            {formatDate(dateKey + 'T12:00:00.000Z')}
          </h3>
          <div className="space-y-4">
            {Array.from(locMap.entries()).map(([locationId, list]) => (
              <div key={locationId}>
                <p className="mb-1 text-xs text-slate-500">
                  {list[0]?.location?.name ?? locationId}
                </p>
                <ul className="space-y-1">
                  {list.map((shift) => {
                    const tz = shift.location?.ianaTimezone ?? 'UTC';
                    const assigned = shift.assignments ?? [];
                    const needed = shift.headcountNeeded;
                    return (
                      <li
                        key={shift.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 transition hover:bg-slate-800/50"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => onShiftClick(shift)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100">
                              {shift.title ?? 'Untitled shift'}
                            </span>
                            <Badge
                              variant={
                                shift.status === 'published'
                                  ? 'default'
                                  : shift.status === 'draft'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="text-[10px]"
                            >
                              {shift.status}
                            </Badge>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                            <span>
                              {formatTime(shift.startAt, tz)} – {formatTime(shift.endAt, tz)}
                            </span>
                            <span>{shift.requiredSkill?.name ?? '—'}</span>
                            <span className="flex items-center gap-1">
                              {assigned.length > 0 ? (
                                assigned.slice(0, 3).map((a) => (
                                  <Avatar key={a.id} className="h-5 w-5">
                                    <AvatarFallback className="text-[10px]">
                                      {a.user
                                        ? `${a.user.firstName[0]}${a.user.lastName[0]}`
                                        : '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                ))
                              ) : (
                                <span>No one assigned</span>
                              )}
                              {assigned.length > 3 && (
                                <span className="text-slate-500">+{assigned.length - 3}</span>
                              )}
                            </span>
                            <span>
                              {assigned.length}/{needed}
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <PermissionGate require="assignments:create">
                            {onAssign && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1"
                                onClick={() => onAssign(shift)}
                              >
                                <UserPlusIcon className="size-3" />
                                Assign
                              </Button>
                            )}
                          </PermissionGate>
                          <PermissionGate require="shifts:update">
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7"
                                onClick={() => onEdit(shift)}
                              >
                                <PencilIcon className="size-3" />
                              </Button>
                            )}
                          </PermissionGate>
                          <PermissionGate require="shifts:publish">
                            {onPublish && shift.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1"
                                onClick={() => onPublish(shift)}
                              >
                                <SendIcon className="size-3" />
                                Publish
                              </Button>
                            )}
                          </PermissionGate>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
