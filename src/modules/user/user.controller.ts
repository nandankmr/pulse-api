import { Request, Response } from 'express';
import { UserService } from './user.service';
import { NotFoundError, ValidationError } from '../../shared/errors/app.errors';
import { logger } from '../../shared/utils/logger';
import { PaginationOptions } from '../../shared/utils/pagination';

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
      if (!req.body.name || !req.body.email) {
        logger.warn('Validation failed: Name and email are required', { providedData: req.body });
        throw new ValidationError('Name and email are required');
      }
      const user = await userService.createUser(req.body);
      logger.info('User created successfully', { userId: user.id, userEmail: user.email });
      res.status(201).json(user);
    } catch (error) {
      logger.error('Error creating user', { userData: req.body, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }
}
