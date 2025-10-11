import { User } from './user.model';

export class UserRepository {
  async findById(id: number): Promise<User | null> {
    // Example: Database query
    return { id, name: 'John Doe', email: 'john@example.com' };
  }

  async save(user: User): Promise<User> {
    // Example: Database insert/update
    return user;
  }
}
