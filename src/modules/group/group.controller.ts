import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { GroupService } from './group.service';
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  createInvitationSchema,
  joinGroupSchema,
  groupIdParamSchema,
  groupMemberParamSchema,
} from './group.schema';
import { ValidationError, UnauthorizedError } from '../../shared/errors/app.errors';
import { logger } from '../../shared/utils/logger';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware';

const groupService = new GroupService();

function formatZodError(error: ZodError): string {
  const messages = error.issues.map((issue) => issue.message).filter(Boolean);
  return messages.length > 0 ? messages.join(', ') : 'Invalid request payload';
}

export class GroupController {
  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const ownerId = authReq.user?.id;
      if (!ownerId) {
        throw new UnauthorizedError('User authentication required');
      }

      const payload = createGroupSchema.parse(req.body);
      const group = await groupService.createGroup(ownerId, {
        name: payload.name,
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
      });
      logger.info('Group created via API', { groupId: group.id, ownerId });
      res.status(201).json(group);
    } catch (error) {
      this.handleControllerError('create group', req, error);
    }
  }

  async listMyGroups(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const groups = await groupService.listUserGroups(userId);
      logger.info('Groups listed via API', { userId, count: groups.length });
      res.json({ data: groups });
    } catch (error) {
      this.handleControllerError('list groups', req, error);
    }
  }

  async getGroup(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId } = groupIdParamSchema.parse(req.params);
      const group = await groupService.getGroupById(groupId, requesterId);
      logger.info('Group retrieved via API', { groupId, requesterId });
      res.json(group);
    } catch (error) {
      this.handleControllerError('get group', req, error);
    }
  }

  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId } = groupIdParamSchema.parse(req.params);
      const payload = updateGroupSchema.parse(req.body);
      const normalizedPayload = {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
      };
      const group = await groupService.updateGroup(groupId, requesterId, normalizedPayload);
      logger.info('Group updated via API', { groupId, requesterId });
      res.json(group);
    } catch (error) {
      this.handleControllerError('update group', req, error);
    }
  }

  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId } = groupIdParamSchema.parse(req.params);
      await groupService.deleteGroup(groupId, requesterId);
      logger.info('Group deleted via API', { groupId, requesterId });
      res.status(204).send();
    } catch (error) {
      this.handleControllerError('delete group', req, error);
    }
  }

  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId } = groupIdParamSchema.parse(req.params);
      const payload = addMemberSchema.parse(req.body);
      const group = await groupService.addMember(groupId, requesterId, payload.userId, payload.role);
      logger.info('Member added via API', { groupId, requesterId, userId: payload.userId });
      res.status(201).json(group);
    } catch (error) {
      this.handleControllerError('add group member', req, error);
    }
  }

  async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId, userId } = groupMemberParamSchema.parse(req.params);
      const payload = updateMemberRoleSchema.parse(req.body);
      const group = await groupService.updateMemberRole(groupId, requesterId, userId, payload.role);
      logger.info('Member role updated via API', { groupId, requesterId, userId, role: payload.role });
      res.json(group);
    } catch (error) {
      this.handleControllerError('update group member role', req, error);
    }
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId, userId } = groupMemberParamSchema.parse(req.params);
      const group = await groupService.removeMember(groupId, requesterId, userId);
      logger.info('Member removed via API', { groupId, requesterId, userId });
      res.json(group);
    } catch (error) {
      this.handleControllerError('remove group member', req, error);
    }
  }

  async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId } = groupIdParamSchema.parse(req.params);
      const payload = createInvitationSchema.parse(req.body ?? {});
      const invitation = await groupService.createInvitation(groupId, requesterId, {
        email: payload.email,
        expiresInHours: payload.expiresInHours,
      });
      logger.info('Group invitation created via API', { groupId, requesterId, invitationId: invitation.id });
      res.status(201).json(invitation);
    } catch (error) {
      this.handleControllerError('create group invitation', req, error);
    }
  }

  async joinGroup(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const requesterId = authReq.user?.id;
      if (!requesterId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { groupId } = groupIdParamSchema.parse(req.params);
      const { token } = joinGroupSchema.parse(req.body);
      const group = await groupService.joinGroupWithToken(
        groupId,
        {
          id: requesterId,
          email: authReq.user?.email,
        },
        token,
      );
      logger.info('Group joined via invitation token', { groupId, requesterId });
      res.json(group);
    } catch (error) {
      this.handleControllerError('join group via invitation', req, error);
    }
  }

  private handleControllerError(action: string, req: Request, error: unknown): never {
    if (error instanceof ValidationError || error instanceof UnauthorizedError) {
      logger.warn(`Validation error during ${action}`, {
        path: req.path,
        message: error.message,
      });
      throw error;
    }

    if (error instanceof ZodError) {
      const message = formatZodError(error);
      logger.warn(`Zod validation error during ${action}`, { path: req.path, message });
      throw new ValidationError(message);
    }

    logger.error(`Unexpected error during ${action}`, {
      path: req.path,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
