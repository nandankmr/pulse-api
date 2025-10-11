import { Request, Response } from 'express';
import { UserService } from './user.service';

const userService = new UserService();

export class UserController {
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getUser(Number(req.params.id));
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
