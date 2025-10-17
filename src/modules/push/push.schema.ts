import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  token: z.string().min(1, 'Device push token is required'),
  deviceId: z.string().min(1, 'Device ID must be provided').optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  appVersion: z.string().min(1).optional(),
  buildNumber: z.string().min(1).optional(),
});

export const unregisterPushTokenSchema = z
  .object({
    token: z.string().optional(),
    deviceId: z.string().optional(),
  })
  .refine((data) => Boolean(data.token || data.deviceId), {
    message: 'Provide either token or deviceId',
  });

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
export type UnregisterPushTokenInput = z.infer<typeof unregisterPushTokenSchema>;
