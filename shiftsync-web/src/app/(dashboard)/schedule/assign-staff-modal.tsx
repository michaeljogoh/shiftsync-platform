'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { ShiftSummary } from '@/lib/api/server/shifts';
import type { UserSummary } from '@/lib/api/server/users';
import {
  useConstraintFeedbackStore,
  type ConstraintViolationState,
} from '@/lib/stores/constraint-feedback.store';
import type { ConstraintErrorResponse } from '@/types/constraint-feedback';
import type { AssignmentSuccessResponse } from '@/types/constraint-feedback';
import { AxiosError } from 'axios';

interface AssignStaffModalProps {
  shift: ShiftSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  afterSuccess?: () => void;
}

async function fetchUsers(locationId?: string, skillId?: string): Promise<UserSummary[]> {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (skillId) params.set('skillId', skillId);
  const { data } = await apiClient.get<UserSummary[]>(`/users?${params.toString()}`);
  return data;
}

function isConstraintError(e: unknown): e is AxiosError<ConstraintErrorResponse> {
  return (
    e instanceof AxiosError &&
    (e.response?.status === 422 || e.response?.status === 409) &&
    typeof e.response?.data?.message === 'string'
  );
}

const SEVENTH_DAY_MESSAGE = '7th consecutive day; override requires reason';

export function AssignStaffModal({
  shift,
  open,
  onOpenChange,
  afterSuccess,
}: AssignStaffModalProps) {
  const queryClient = useQueryClient();
  const {
    showConstraintViolation,
    showOvertimeWarning,
    showConsecutiveDayOverride,
    closeConstraintViolation,
    closeOvertimeWarning,
  } = useConstraintFeedbackStore();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', 'list', shift?.locationId ?? '', shift?.requiredSkillId ?? ''],
    queryFn: () => fetchUsers(shift?.locationId, shift?.requiredSkillId),
    enabled: open && !!shift,
  });

  const runAssign = async (
    userId: string,
    opts?: { override?: boolean; overrideReason?: string },
    attemptedName?: string,
  ) => {
    if (!shift) return;
    const payload = { userId, ...opts };
    try {
      const { data } = await apiClient.post<AssignmentSuccessResponse>(
        `/shifts/${shift.id}/assignments`,
        payload,
      );
      const assignment = data.assignment;
      const warnings = data.warnings ?? [];
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.detail(shift.id) });

      const overtimeWarning = warnings.find(
        (w) => w.type === 'overtime_approaching' || w.type === 'overtime_exceeded',
      );
      if (overtimeWarning && assignment?.id) {
        const projectedHours =
          'projectedWeeklyHours' in overtimeWarning
            ? overtimeWarning.projectedWeeklyHours
            : 0;
        const estimatedCost =
          'estimatedOvertimeCost' in overtimeWarning
            ? (overtimeWarning as { estimatedOvertimeCost?: number }).estimatedOvertimeCost
            : undefined;
        const userName = users.find((u) => u.id === userId);
        const name = userName ? `${userName.firstName} ${userName.lastName}` : 'Staff';
        showOvertimeWarning({
          assignmentId: assignment.id,
          shiftId: shift.id,
          userId,
          userName: name,
          projectedWeeklyHours: projectedHours,
          limitHours: 40,
          estimatedOvertimeCost: estimatedCost,
          onUndo: async () => {
            await apiClient.delete(`/shifts/${shift.id}/assignments/${assignment.id}`);
            queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.shifts.detail(shift.id) });
            closeOvertimeWarning();
          },
        });
      }
      afterSuccess?.();
      onOpenChange(false);
    } catch (err) {
      if (!isConstraintError(err)) {
        throw err;
      }
      const body = err.response!.data;
      const message = body.message ?? 'Assignment could not be completed.';
      const suggestions = body.suggestions ?? [];
      const is7thDay = message.toLowerCase().includes('7th consecutive day');

      if (is7thDay) {
        const u = users.find((x) => x.id === userId);
        const userName = attemptedName ?? (u ? `${u.firstName} ${u.lastName}` : 'Staff');
        showConsecutiveDayOverride({
          shiftId: shift.id,
          userId,
          userName,
          onSubmitOverride: (overrideReason) =>
            runAssign(userId, { override: true, overrideReason }, userName),
        });
        return;
      }

      const title = attemptedName ? `Cannot assign ${attemptedName}` : 'Cannot assign staff';
      const state: ConstraintViolationState = {
        title,
        reason: message,
        suggestions,
        shiftId: shift.id,
        onAssignUserId: (suggestedUserId) => {
          closeConstraintViolation();
          const suggested = suggestions.find((s) => s.userId === suggestedUserId);
          runAssign(suggestedUserId, undefined, suggested?.name);
        },
      };
      showConstraintViolation(state);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Assign staff</DialogTitle>
        </DialogHeader>
        {!shift ? (
          <p className="text-sm text-slate-500">No shift selected.</p>
        ) : isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ul className="max-h-80 space-y-1 overflow-auto">
            {users.map((user) => {
              const name = `${user.firstName} ${user.lastName}`;
              const skillNames = user.skills?.map((s) => s.name).join(', ') ?? '—';
              return (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-2"
                >
                  <div>
                    <p className="font-medium text-slate-100">{name}</p>
                    <p className="text-xs text-slate-400">Skills: {skillNames}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => runAssign(user.id, undefined, name)}
                  >
                    Assign
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
