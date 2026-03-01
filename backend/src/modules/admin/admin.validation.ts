import { z } from 'zod';

export const approvePayoutSchema = z.object({
  body: z.object({
    transactionReference: z.string().optional(),
  }),
});

export const rejectPayoutSchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  }),
});
