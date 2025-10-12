import { User } from './user.model';
import { logger } from '../../shared/utils/logger';
import { UserRepository } from './user.repository';
import { userCache } from '../../shared/utils/cache';
import { PaginationOptions, PaginatedResult } from '../../shared/utils/pagination';

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
        logger.info('User fetched successfully', { userId: id, userEmail: user.email, source: 'database' });
        // Cache the user for future requests
        userCache.set(cacheKey, user);
      } else {
        logger.warn('User not found', { userId: id, source: 'database' });
      }
      return user;
    } catch (error) {
      logger.error('Error fetching user from database', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async getAllUsers(paginationOptions?: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      logger.info('Fetching all users with pagination', { paginationOptions });
      const result = await userRepository.findAll(paginationOptions);
      logger.info('Users fetched successfully', { count: result.data.length, total: result.pagination.total, page: result.pagination.page, limit: result.pagination.limit });
      return result;
    } catch (error) {
      logger.error('Error fetching all users', { paginationOptions, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async createUser(userData: { name: string; email: string; password: string }): Promise<User> {
    try {
      logger.info('Creating user in database', { userEmail: userData.email, userName: userData.name });
      const user = await userRepository.save(userData);
      logger.info('User created successfully', { userId: user.id, userEmail: user.email });

      // Cache the newly created user
      const cacheKey = `user:${user.id}`;
      userCache.set(cacheKey, user);

      return user;
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
}
