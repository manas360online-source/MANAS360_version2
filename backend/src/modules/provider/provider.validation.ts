import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    bio: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    approaches: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    sessionRate: z.number().int().positive().optional(),
    yearsExperience: z.number().int().min(0).optional(),
    education: z.any().optional(),
    certifications: z.any().optional(),
    isAcceptingPatients: z.boolean().optional(),
  }),
});

export const setAvailabilitySchema = z.object({
  body: z.object({
    availability: z.array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        isActive: z.boolean().optional(),
      })
    ),
  }),
});
