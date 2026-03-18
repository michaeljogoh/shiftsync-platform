'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import {
  createSwapRequestSchema,
  type CreateSwapRequestInput,
} from '@/lib/validations/swaps';

export interface AssignmentOption {
  id: string;
  shift?: { id: string; title: string | null; startAt: string };
}

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface CreateSwapRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current user's assignments (to choose which shift to swap/drop). */
  myAssignments: AssignmentOption[];
  /** For type=swap: list of target users and their assignments (e.g. same shift). */
  targetAssignments?: Array<{ userId: string; userName: string; assignmentId: string; shiftLabel: string }>;
}

export function CreateSwapRequestForm({
  open,
  onOpenChange,
  myAssignments,
  targetAssignments = [],
}: CreateSwapRequestFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateSwapRequestInput>({
    resolver: zodResolver(createSwapRequestSchema),
    defaultValues: {
      type: 'drop',
      initiatorAssignmentId: '',
      targetUserId: undefined,
      targetAssignmentId: undefined,
      initiatorNote: '',
    },
  });

  const type = watch('type');

  async function onSubmit(values: CreateSwapRequestInput) {
    try {
      await apiClient.post('/swaps', {
        type: values.type,
        initiatorAssignmentId: values.initiatorAssignmentId,
        ...(values.type === 'swap' && values.targetUserId && values.targetAssignmentId
          ? { targetUserId: values.targetUserId, targetAssignmentId: values.targetAssignmentId }
          : {}),
        ...(values.initiatorNote ? { initiatorNote: values.initiatorNote } : {}),
      });
      toast.success(values.type === 'drop' ? 'Drop request submitted' : 'Swap request submitted');
      reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Request failed';
      toast.error(message ?? 'Request failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New swap or drop request</DialogTitle>
          <DialogDescription>
            Choose an assignment to give up, and for swaps pick who will take it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" value="drop" {...register('type')} />
                <span>Drop</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="swap" {...register('type')} />
                <span>Swap</span>
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="initiatorAssignmentId">My assignment to give up</Label>
            <select
              id="initiatorAssignmentId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              {...register('initiatorAssignmentId')}
            >
              <option value="">Select assignment</option>
              {myAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.shift?.title ?? 'Shift'} · {a.shift?.startAt ? new Date(a.shift.startAt).toLocaleString() : a.id}
                </option>
              ))}
            </select>
            {errors.initiatorAssignmentId && (
              <p className="text-xs text-destructive">{errors.initiatorAssignmentId.message}</p>
            )}
          </div>

          {type === 'swap' && (
            <div className="grid gap-2">
              <Label htmlFor="targetAssignmentId">Swap with (staff + assignment)</Label>
              <select
                id="targetAssignmentId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                {...register('targetAssignmentId', {
                  onChange: (e) => {
                    const opt = targetAssignments.find((t) => t.assignmentId === e.target.value);
                    if (opt) {
                      setValue('targetUserId', opt.userId);
                    }
                  },
                })}
              >
                <option value="">Select staff / assignment</option>
                {targetAssignments.map((t) => (
                  <option key={t.assignmentId} value={t.assignmentId}>
                    {t.userName} · {t.shiftLabel}
                  </option>
                ))}
              </select>
              {errors.targetUserId && (
                <p className="text-xs text-destructive">{errors.targetUserId.message}</p>
              )}
              {errors.targetAssignmentId && (
                <p className="text-xs text-destructive">{errors.targetAssignmentId.message}</p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="initiatorNote">Note (optional)</Label>
            <textarea
              id="initiatorNote"
              className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              maxLength={500}
              {...register('initiatorNote')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
