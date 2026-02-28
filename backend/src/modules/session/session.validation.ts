import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    providerId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    duration: z.number().int().min(30).max(120).optional(),
  }),
});

export const completeSessionSchema = z.object({
  body: z.object({
    sessionNotes: z.string().optional(),
  }),
});
