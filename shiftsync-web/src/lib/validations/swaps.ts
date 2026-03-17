import { z } from 'zod';

export const createSwapRequestSchema = z
  .object({
    type: z.enum(['swap', 'drop']),
    initiatorAssignmentId: z.string().uuid(),
    targetUserId: z.string().uuid().optional(),
    targetAssignmentId: z.string().uuid().optional(),
    initiatorNote: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      data.type === 'drop' ||
      (!!data.targetUserId && !!data.targetAssignmentId),
    {
      message:
        'Swap requests require a target staff member and their assignment',
    },
  );

export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>;
