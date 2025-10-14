import { z } from 'zod';
import { GroupRole } from '../../generated/prisma';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  avatarUrl: z.string().min(1).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').nullable().optional(),
  avatarUrl: z.string().min(1).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided to update the group',
});

export const addMemberSchema = z.object({
  userId: z.string().uuid('Valid userId is required'),
  role: z.nativeEnum(GroupRole).default(GroupRole.MEMBER),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(GroupRole),
});

export const createInvitationSchema = z.object({
  email: z.string().email('Valid invitee email is required').optional(),
  expiresInHours: z
    .number()
    .int('Expiration must be an integer number of hours')
    .positive('Expiration must be greater than zero')
    .max(24 * 14, 'Expiration cannot exceed 14 days')
    .optional(),
});

export const joinGroupSchema = z.object({
  token: z.string().min(10, 'Invitation token is required'),
});

export const groupIdParamSchema = z.object({
  groupId: z.string().uuid('Valid groupId is required'),
});

export const groupMemberParamSchema = z.object({
  groupId: z.string().uuid('Valid groupId is required'),
  userId: z.string().uuid('Valid userId is required'),
});
