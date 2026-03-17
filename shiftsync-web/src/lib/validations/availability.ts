import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const availabilityWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, 'Time must be HH:MM (00:00–23:59)'),
    endTime: z.string().regex(timeRegex, 'Time must be HH:MM (00:00–23:59)'),
    effectiveFrom: z.string().date(),
    effectiveUntil: z.string().date().optional().nullable(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time for availability windows',
    path: ['endTime'],
  });

export type AvailabilityWindowInput = z.infer<typeof availabilityWindowSchema>;

/** Validate an array of windows (e.g. from grid export). */
export function validateAvailabilityWindows(
  windows: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
  effectiveFrom: string,
): z.SafeParseReturnType<AvailabilityWindowInput[], AvailabilityWindowInput[]> {
  const parsed: AvailabilityWindowInput[] = [];
  for (const w of windows) {
    const result = availabilityWindowSchema.safeParse({
      ...w,
      effectiveFrom,
    });
    if (!result.success) return result;
    parsed.push(result.data);
  }
  return { success: true, data: parsed };
}
