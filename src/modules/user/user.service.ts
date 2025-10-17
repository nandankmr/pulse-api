import type { User as PrismaUser } from '../../generated/prisma';
import { User } from './user.model';
import { logger } from '../../shared/utils/logger';
import { UserRepository } from './user.repository';
import { userCache } from '../../shared/utils/cache';
import { PaginationOptions, PaginatedResult } from '../../shared/utils/pagination';
import { hashPassword } from '../../shared/utils/password';
import { ConflictError, ValidationError } from '../../shared/errors/app.errors';
import { buildAvatarUrl } from '../../config/env.config';

const userRepository = new UserRepository();

/**
 * Service class for user-related business logic
 */
export class UserService {
  /**
   * Retrieves a user by their ID with caching support
   * @param id - The unique identifier of the user
   * @returns Promise resolving to the user object or null if not found
   */
  async getUser(id: string): Promise<User | null> {
    try {
      // Check cache first
      const cacheKey = `user:${id}`;
      const cachedUser = userCache.get(cacheKey);
      if (cachedUser) {
        logger.info('User retrieved from cache', { userId: id, source: 'cache' });
        return cachedUser;
      }

      logger.info('Fetching user from database', { userId: id });
      const user = await userRepository.findById(id);
      if (user) {
        const safeUser = this.sanitizeUser(user);
        logger.info('User fetched successfully', { userId: id, userEmail: safeUser.email, source: 'database' });
        // Cache the user for future requests
        userCache.set(cacheKey, safeUser);
        return safeUser;
      } else {
        logger.warn('User not found', { userId: id, source: 'database' });
      }
      return null;
    } catch (error) {
      logger.error('Error fetching user from database', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async getAllUsers(paginationOptions?: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      logger.info('Fetching all users with pagination', { paginationOptions });
      const result = await userRepository.findAll(paginationOptions);
      const sanitizedUsers = result.data.map((user) => this.sanitizeUser(user));
      logger.info('Users fetched successfully', { count: sanitizedUsers.length, total: result.pagination.total, page: result.pagination.page, limit: result.pagination.limit });
      return {
        data: sanitizedUsers,
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error('Error fetching all users', { paginationOptions, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async createUser(userData: { name: string; email: string; password: string }): Promise<User> {
    try {
      logger.info('Creating user in database', { userEmail: userData.email, userName: userData.name });
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        logger.warn('Attempted to create user with duplicate email', { userEmail: userData.email });
        throw new ConflictError('Email already in use');
      }

      const hashedPassword = await hashPassword(userData.password);
      const user = await userRepository.save({ ...userData, password: hashedPassword });
      const safeUser = this.sanitizeUser(user);
      logger.info('User created successfully', { userId: safeUser.id, userEmail: safeUser.email });

      // Cache the newly created user
      const cacheKey = `user:${safeUser.id}`;
      userCache.set(cacheKey, safeUser);

      return safeUser;
    } catch (error) {
      logger.error('Error creating user in database', { userData, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  // Method to invalidate user cache (useful for updates/deletes)
  async invalidateUserCache(id: string): Promise<void> {
    const cacheKey = `user:${id}`;
    userCache.delete(cacheKey);
    logger.info('User cache invalidated', { userId: id });
  }

  async updateProfile(userId: string, payload: { name?: string; password?: string }): Promise<User> {
    if (!payload.name && !payload.password) {
      throw new ValidationError('Please provide name or password to update');
    }

    const updateData: { name?: string; password?: string } = {};
    if (payload.name) {
      updateData.name = payload.name;
    }
    if (payload.password) {
      updateData.password = await hashPassword(payload.password);
    }

    const updatedUser = await userRepository.updateProfile(userId, updateData);
    const safeUser = this.sanitizeUser(updatedUser);
    await this.invalidateUserCache(userId);
    return safeUser;
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const updatedUser = await userRepository.updateAvatar(userId, avatarUrl);
    const safeUser = this.sanitizeUser(updatedUser);
    await this.invalidateUserCache(userId);
    return safeUser;
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const users = await userRepository.search(query, limit);
    return users.map((user) => this.sanitizeUser(user));
  }

  private sanitizeUser(user: PrismaUser): User {
    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      avatarUrl: safeUser.avatarUrl ? buildAvatarUrl(safeUser.avatarUrl) : safeUser.avatarUrl,
    };
  }
}
