import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  // Coerce checkbox string "on"/"off" or undefined into a boolean
  rememberMe: z.coerce.boolean().optional().default(true),
});

export type LoginInput = z.infer<typeof loginSchema>;
