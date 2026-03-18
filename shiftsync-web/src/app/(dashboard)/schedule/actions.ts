'use server';

import { revalidateTag } from 'next/cache';

import { serverFetch } from '@/lib/api/server/client';
import { createShiftSchema } from '@/lib/validations/shifts';
import type { ActionResult } from '@/types/actions';

export async function createShiftAction(formData: FormData): Promise<ActionResult<unknown>> {
  const raw = Object.fromEntries(formData);
  const parsed = createShiftSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { success: false, error: 'Validation failed', errors: fieldErrors };
  }

  try {
    const shift = await serverFetch('/shifts', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
      tags: ['shifts'],
    });

    revalidateTag('shifts');

    return { success: true, data: shift };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? 'Failed to create shift',
      details: err?.details,
      suggestions: err?.details?.suggestions ?? [],
    };
  }
}

