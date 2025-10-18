import type { Request, Response } from 'express';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../shared/errors/app.errors';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware';
import { logger } from '../../shared/utils/logger';
import type { PaginationOptions } from '../../shared/utils/pagination';
import { buildAttachmentUrl } from '../../config/env.config';
import { UserService } from './user.service';

const userService = new UserService();

export class UserController {
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      logger.info('Getting user', { userId });
      const user = await userService.getUser(userId);
      if (!user) {
        logger.warn('User not found', { userId });
        throw new NotFoundError('User');
      }
      logger.info('User retrieved successfully', { userId, userEmail: user.email });
      res.json(user);
    } catch (error) {
      logger.error('Error getting user', { userId: req.params.id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      // Extract pagination options from query parameters
      const paginationOptions: PaginationOptions = {};
      if (req.query.page) paginationOptions.page = Number(req.query.page);
      if (req.query.limit) paginationOptions.limit = Number(req.query.limit);

      logger.info('Getting all users with pagination', { paginationOptions, query: req.query });
      const result = await userService.getAllUsers(paginationOptions);
      logger.info('Users retrieved successfully', {
        count: result.data.length,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit
      });

      res.json(result);
    } catch (error) {
      logger.error('Error getting all users', {
        paginationOptions: req.query,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Creating user', { userEmail: req.body.email, userName: req.body.name });
      if (!req.body.name || !req.body.email || !req.body.password) {
        logger.warn('Validation failed: Name, email, and password are required', { providedData: req.body });
        throw new ValidationError('Name, email, and password are required');
      }
      const user = await userService.createUser(req.body);
      logger.info('User created successfully', { userId: user.id, userEmail: user.email });
      res.status(201).json(user);
    } catch (error) {
      logger.error('Error creating user', { userData: req.body, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id ?? (req.body.userId as string | undefined);
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { name, password, avatarUrl } = req.body;
      const updatedUser = await userService.updateProfile(userId, { name, password, avatarUrl });
      res.json(updatedUser);
    } catch (error) {
      logger.error('Error updating user profile', {
        userId: (req as AuthenticatedRequest).user?.id ?? req.body.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id ?? (req.body.userId as string | undefined);
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const body = req.body as { filename?: unknown; url?: unknown };
      let filename: string | undefined;

      if (typeof body.filename === 'string' && body.filename.trim()) {
        filename = body.filename.trim();
      } else if (typeof body.url === 'string' && body.url.trim()) {
        const segments = body.url.trim().split('/');
        filename = segments.pop() || undefined;
      }

      if (!filename) {
        throw new ValidationError('Attachment filename or url is required');
      }

      const publicUrl = buildAttachmentUrl(filename);
      const updatedUser = await userService.updateAvatar(userId, publicUrl);
      res.json(updatedUser);
    } catch (error) {
      logger.error('Error uploading user avatar', {
        userId: (req as AuthenticatedRequest).user?.id ?? req.body.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!query) {
        throw new ValidationError('Search query "q" is required');
      }

      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const users = await userService.searchUsers(query, limit);
      res.json({ data: users });
    } catch (error) {
      logger.error('Error searching users', {
        query: req.query.q,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const user = await userService.getUser(userId);
      if (!user) {
        throw new NotFoundError('User');
      }
      res.json(user);
    } catch (error) {
      logger.error('Error getting current user', {
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
