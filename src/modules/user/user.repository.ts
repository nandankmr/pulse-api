import { PrismaClient, User } from '../../generated/prisma';
import { logger } from '../../shared/utils/logger';
import { PaginationOptions, PaginatedResult, PaginationUtils } from '../../shared/utils/pagination';

const prisma = new PrismaClient();

export class UserRepository {
  async findById(id: number): Promise<User | null> {
    try {
      logger.info('Finding user by ID', { userId: id });
      const user = await prisma.user.findUnique({
        where: { id },
      });
      if (user) {
        logger.info('User found by ID', { userId: id, userEmail: user.email });
      } else {
        logger.warn('User not found by ID', { userId: id });
      }
      return user;
    } catch (error) {
      logger.error('Error finding user by ID', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async save(userData: { name: string; email: string }): Promise<User> {
    try {
      logger.info('Saving new user', { userEmail: userData.email, userName: userData.name });
      const user = await prisma.user.create({
        data: userData,
      });
      logger.info('User saved successfully', { userId: user.id, userEmail: user.email });
      return user;
    } catch (error) {
      logger.error('Error saving user', { userData, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async findAll(paginationOptions?: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      logger.info('Finding all users with pagination', { paginationOptions });

      const { page = 1, limit = 10, offset } = paginationOptions
        ? PaginationUtils.validatePaginationOptions(paginationOptions)
        : { page: 1, limit: 10, offset: 0 };

      // Get total count
      const total = await prisma.user.count({
        where: { deletedAt: null },
      });

      // Get paginated data
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        skip: offset || 0,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const pagination = PaginationUtils.getPaginationInfo(users, total, page, limit);

      logger.info('Users retrieved successfully', { count: users.length, total, page, limit });
      return { data: users, pagination };
    } catch (error) {
      logger.error('Error finding all users', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async softDelete(id: number): Promise<User> {
    try {
      logger.info('Soft deleting user', { userId: id });
      const user = await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      logger.info('User soft deleted successfully', { userId: id, userEmail: user.email });
      return user;
    } catch (error) {
      logger.error('Error soft deleting user', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }
}  
