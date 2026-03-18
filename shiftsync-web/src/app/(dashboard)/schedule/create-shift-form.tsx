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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { queryKeys } from '@/lib/query-keys';
import { createShiftSchema, type CreateShiftInput } from '@/lib/validations/shifts';
import type { LocationSummary } from '@/lib/api/server/locations';
import type { SkillSummary } from '@/lib/api/server/skills';
import { createShiftAction } from './actions';

interface CreateShiftFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: LocationSummary[];
  skills: SkillSummary[];
  defaultLocationId?: string;
  defaultWeek?: string;
}

export function CreateShiftForm({
  open,
  onOpenChange,
  locations,
  skills,
  defaultLocationId,
  defaultWeek,
}: CreateShiftFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<CreateShiftInput>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      locationId: defaultLocationId ?? '',
      requiredSkillId: '',
      title: '',
      startAt: '',
      endAt: '',
      headcountNeeded: 1,
      editCutoffHours: 48,
    },
  });

  async function onSubmit(values: CreateShiftInput) {
    const formData = new FormData();
    formData.set('locationId', values.locationId);
    formData.set('requiredSkillId', values.requiredSkillId);
    formData.set('title', values.title);
    // datetime-local gives "YYYY-MM-DDTHH:mm"; backend accepts no-offset ISO (interpreted in location TZ)
    const startAt = values.startAt.includes(':') && values.startAt.split(':').length === 2
      ? `${values.startAt}:00`
      : values.startAt;
    const endAt = values.endAt.includes(':') && values.endAt.split(':').length === 2
      ? `${values.endAt}:00`
      : values.endAt;
    formData.set('startAt', startAt);
    formData.set('endAt', endAt);
    formData.set('headcountNeeded', String(values.headcountNeeded));
    if (values.editCutoffHours != null) formData.set('editCutoffHours', String(values.editCutoffHours));

    const result = await createShiftAction(formData);

    if (result.success) {
      toast.success('Shift created');
      reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all() });
      return;
    }

    if (result.errors && typeof result.errors === 'object') {
      for (const [field, messages] of Object.entries(result.errors)) {
        const msg = Array.isArray(messages) ? messages[0] : messages;
        if (msg) setError(field as keyof CreateShiftInput, { message: msg });
      }
    }
    if (result.error && !result.errors) {
      toast.error(result.error);
    }
    if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
      toast.error(result.error, { description: 'See suggestions in the form.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add shift</DialogTitle>
          <DialogDescription>
            Create a new shift. Times are in the location&apos;s timezone if no offset is provided.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="locationId">Location</Label>
            <select
              id="locationId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('locationId')}
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.ianaTimezone})
                </option>
              ))}
            </select>
            {errors.locationId && (
              <p className="text-xs text-destructive">{errors.locationId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="requiredSkillId">Required skill</Label>
            <select
              id="requiredSkillId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('requiredSkillId')}
            >
              <option value="">Select skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
            {errors.requiredSkillId && (
              <p className="text-xs text-destructive">{errors.requiredSkillId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Bar shift" {...register('title')} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startAt">Start (local)</Label>
              <Input
                id="startAt"
                type="datetime-local"
                {...register('startAt')}
              />
              {errors.startAt && (
                <p className="text-xs text-destructive">{errors.startAt.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endAt">End (local)</Label>
              <Input
                id="endAt"
                type="datetime-local"
                {...register('endAt')}
              />
              {errors.endAt && (
                <p className="text-xs text-destructive">{errors.endAt.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="headcountNeeded">Headcount needed</Label>
            <Input
              id="headcountNeeded"
              type="number"
              min={1}
              max={50}
              {...register('headcountNeeded', { valueAsNumber: true })}
            />
            {errors.headcountNeeded && (
              <p className="text-xs text-destructive">{errors.headcountNeeded.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
