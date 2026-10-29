import { z } from 'zod';

export const webVitalSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(32),
  value: z.number().finite(),
  rating: z.string().max(32).optional(),
  navigationType: z.string().max(32).optional(),
});

export type WebVital = z.infer<typeof webVitalSchema>;
