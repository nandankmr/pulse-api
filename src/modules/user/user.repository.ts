import { User } from '../../generated/prisma';
import { logger } from '../../shared/utils/logger';
import { PaginationOptions, PaginatedResult, PaginationUtils } from '../../shared/utils/pagination';
import { prisma } from '../../shared/services/prisma.service';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
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

  async findByEmail(email: string): Promise<User | null> {
    try {
      logger.info('Finding user by email', { userEmail: email });
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (user) {
        logger.info('User found by email', { userId: user.id, userEmail: email });
      } else {
        logger.warn('User not found by email', { userEmail: email });
      }
      return user;
    } catch (error) {
      logger.error('Error finding user by email', { userEmail: email, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    try {
      logger.info('Finding user by Firebase UID', { firebaseUid });
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
      });
      if (user) {
        logger.info('User found by Firebase UID', { userId: user.id, firebaseUid });
      } else {
        logger.warn('User not found by Firebase UID', { firebaseUid });
      }
      return user;
    } catch (error) {
      logger.error('Error finding user by Firebase UID', { firebaseUid, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async save(userData: { name: string; email: string; password?: string }): Promise<User> {
    try {
      logger.info('Saving new user', { userEmail: userData.email, userName: userData.name });
      const user = await prisma.user.create({
        data: userData,
      });
      logger.info('User saved successfully', { userId: user.id, userEmail: user.email });
      return user;
    } catch (error) {
      logger.error('Error saving user', { userEmail: userData.email, userName: userData.name, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async findAll(paginationOptions?: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      logger.info('Finding all users with pagination', { paginationOptions });

      const { page = 1, limit = 10, offset } = paginationOptions
        ? PaginationUtils.validatePaginationOptions(paginationOptions)
        : { page: 1, limit: 10, offset: 0 };

      const total = await prisma.user.count();

      const users = await prisma.user.findMany({
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

  async markVerified(id: string): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { verified: true },
      });
      logger.info('User marked as verified', { userId: id, userEmail: user.email });
      return user;
    } catch (error) {
      logger.error('Error marking user as verified', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async attachFirebaseUid(id: string, firebaseUid: string): Promise<User> {
    try {
      logger.info('Attaching Firebase UID to user', { userId: id, firebaseUid });
      const user = await prisma.user.update({
        where: { id },
        data: { firebaseUid },
      });
      logger.info('Firebase UID attached to user', { userId: id, firebaseUid });
      return user;
    } catch (error) {
      logger.error('Error attaching Firebase UID to user', { userId: id, firebaseUid, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async createFirebaseUser(input: {
    firebaseUid: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    emailVerified: boolean;
  }): Promise<User> {
    try {
      logger.info('Creating Firebase user record', { firebaseUid: input.firebaseUid, email: input.email });
      const user = await prisma.user.create({
        data: {
          firebaseUid: input.firebaseUid,
          email: input.email,
          name: input.name,
          avatarUrl: input.avatarUrl,
          verified: input.emailVerified,
        },
      });
      logger.info('Firebase user record created', { userId: user.id, firebaseUid: input.firebaseUid });
      return user;
    } catch (error) {
      logger.error('Error creating Firebase user record', {
        firebaseUid: input.firebaseUid,
        email: input.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateProfile(id: string, data: { name?: string; password?: string; avatarUrl?: string | null }): Promise<User> {
    try {
      logger.info('Updating user profile', { userId: id, fields: Object.keys(data) });
      const user = await prisma.user.update({
        where: { id },
        data,
      });
      logger.info('User profile updated successfully', { userId: id, userEmail: user.email });
      return user;
    } catch (error) {
      logger.error('Error updating user profile', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async updateAvatar(id: string, avatarUrl: string | null): Promise<User> {
    try {
      logger.info('Updating user avatar', { userId: id, avatarUrl });
      const user = await prisma.user.update({
        where: { id },
        data: { avatarUrl },
      });
      logger.info('User avatar updated successfully', { userId: id, userEmail: user.email });
      return user;
    } catch (error) {
      logger.error('Error updating user avatar', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async search(query: string, limit = 20): Promise<User[]> {
    try {
      logger.info('Searching users', { query, limit });
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
        take: limit,
      });
      logger.info('User search completed', { query, count: users.length });
      return users;
    } catch (error) {
      logger.error('Error searching users', { query, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }

  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    try {
      logger.info('Updating user password', { userId: id });
      const user = await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });
      logger.info('User password updated successfully', { userId: id });
      return user;
    } catch (error) {
      logger.error('Error updating user password', { userId: id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
  }
}
