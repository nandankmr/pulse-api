import { UserService } from '../../../src/modules/user/user.service';
import { UserRepository } from '../../../src/modules/user/user.repository';
import { logger } from '../../../src/shared/utils/logger';

// Mock the UserRepository
jest.mock('../../../src/modules/user/user.repository');
jest.mock('../../../src/shared/utils/logger');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
  });

  describe('getUser', () => {
    it('should return a user when found', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUserRepository.prototype.findById.mockResolvedValue(mockUser);

      const result = await userService.getUser(1);

      expect(mockLogger.info).toHaveBeenCalledWith('Fetching user from database', { userId: 1 });
      expect(mockUserRepository.prototype.findById).toHaveBeenCalledWith(1);
      expect(mockLogger.info).toHaveBeenCalledWith('User fetched successfully', { userId: 1, userEmail: 'john@example.com' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.prototype.findById.mockResolvedValue(null);

      const result = await userService.getUser(999);

      expect(mockLogger.info).toHaveBeenCalledWith('Fetching user from database', { userId: 999 });
      expect(mockUserRepository.prototype.findById).toHaveBeenCalledWith(999);
      expect(mockLogger.warn).toHaveBeenCalledWith('User not found', { userId: 999 });
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockUserRepository.prototype.findById.mockRejectedValue(error);

      await expect(userService.getUser(1)).rejects.toThrow('Database connection failed');

      expect(mockLogger.info).toHaveBeenCalledWith('Fetching user from database', { userId: 1 });
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching user from database', {
        userId: 1,
        error: 'Database connection failed',
        stack: expect.any(String)
      });
    });
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = { name: 'Jane Doe', email: 'jane@example.com' };
      const mockCreatedUser = {
        id: 2,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUserRepository.prototype.save.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(userData);

      expect(mockLogger.info).toHaveBeenCalledWith('Creating user in database', { userEmail: 'jane@example.com', userName: 'Jane Doe' });
      expect(mockUserRepository.prototype.save).toHaveBeenCalledWith(userData);
      expect(mockLogger.info).toHaveBeenCalledWith('User created successfully', { userId: 2, userEmail: 'jane@example.com' });
      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle creation errors', async () => {
      const userData = { name: 'Jane Doe', email: 'jane@example.com' };
      const error = new Error('Email already exists');

      mockUserRepository.prototype.save.mockRejectedValue(error);

      await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');

      expect(mockLogger.info).toHaveBeenCalledWith('Creating user in database', { userEmail: 'jane@example.com', userName: 'Jane Doe' });
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating user in database', {
        userData,
        error: 'Email already exists',
        stack: expect.any(String)
      });
    });
  });
});
