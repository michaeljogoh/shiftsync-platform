import { z } from 'zod';

export const createShiftSchema = z
  .object({
    locationId: z.string().uuid(),
    requiredSkillId: z.string().uuid(),
    title: z.string().max(255).optional(),
    startAt: z.string().min(1, 'Start time is required'),
    endAt: z.string().min(1, 'End time is required'),
    headcountNeeded: z.coerce.number().int().min(1).max(50).default(1),
    editCutoffHours: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startAt).getTime();
      const end = new Date(data.endAt).getTime();
      return end > start;
    },
    { message: 'End time must be after start time', path: ['endAt'] },
  );

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

