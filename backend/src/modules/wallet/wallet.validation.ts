import { z } from 'zod';

export const requestPayoutSchema = z.object({
  body: z.object({
    amount: z.number().int().positive().min(100000), // Min 1000 INR in paise
  }),
});
