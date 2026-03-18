import { z } from 'zod';

/** True when end is on the calendar day after start (overnight shift). */
function isOvernightValid(startAt: string, endAt: string): boolean {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const startDay = start.toISOString().slice(0, 10);
  const endDay = end.toISOString().slice(0, 10);
  const nextDay = new Date(start);
  nextDay.setUTCDate(start.getUTCDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10);
  return endDay === nextDayStr;
}

export const createShiftSchema = z
  .object({
    locationId: z.string().uuid(),
    requiredSkillId: z.string().uuid(),
    title: z.string().min(1).max(255),
    startAt: z
      .string()
      .min(1, 'Start time is required')
      .transform((s) => {
        if (s.length === 16) s = `${s}:00`;
        if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) s = `${s}Z`;
        return s;
      })
      .pipe(z.string().datetime({ message: 'Invalid start datetime' })),
    endAt: z
      .string()
      .min(1, 'End time is required')
      .transform((s) => {
        if (s.length === 16) s = `${s}:00`;
        if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) s = `${s}Z`;
        return s;
      })
      .pipe(z.string().datetime({ message: 'Invalid end datetime' })),
    headcountNeeded: z.coerce.number().int().min(1).max(50),
    editCutoffHours: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startAt).getTime();
      const end = new Date(data.endAt).getTime();
      return end > start || isOvernightValid(data.startAt, data.endAt);
    },
    {
      message:
        'End time must be after start time (or next morning for overnight shifts)',
      path: ['endAt'],
    },
  );

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
