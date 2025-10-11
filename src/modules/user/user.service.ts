import { User } from './user.model';

export class UserService {
  async getUser(id: number): Promise<User | null> {
    // Example: Fetch from database
    return { id, name: 'John Doe', email: 'john@example.com' };
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    // Example: Insert into database
    return { id: 1, ...userData };
  }
}
