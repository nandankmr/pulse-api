import { z } from 'zod';
import { MessageType } from '../../generated/prisma';

export const chatParamsSchema = z.object({
  chatType: z.enum(['direct', 'group']),
  chatId: z.string().uuid('Valid chatId is required'),
});

export const paginationSchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((value) => (value ? Number(value) : undefined))
      .refine((value) => value === undefined || (Number.isInteger(value) && value > 0), 'Page must be a positive integer'),
    limit: z
      .string()
      .optional()
      .transform((value) => (value ? Number(value) : undefined))
      .refine((value) => value === undefined || (Number.isInteger(value) && value > 0 && value <= 100), 'Limit must be an integer between 1 and 100'),
  })
  .optional()
  .transform((value) => ({
    page: value?.page,
    limit: value?.limit,
  }));

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const sendMessageSchema = z
  .object({
    type: z.nativeEnum(MessageType).optional(),
    content: z.string().trim().max(5000).optional(),
    mediaUrl: z.string().url().optional(),
    location: locationSchema.optional(),
  })
  .refine((data) => Boolean(data.content || data.mediaUrl || data.location), {
    message: 'Message must include content, mediaUrl, or location',
  });

export const deleteMessageParamSchema = z.object({
  messageId: z.string().uuid('Valid messageId is required'),
});
