import { Router } from 'express';
import { UserController } from './user.controller';
import { createProtectedRouter } from '../../shared/middleware/auth.guard';

const publicRouter = Router();
const protectedRouter = createProtectedRouter();
const userController = new UserController();

publicRouter.get('/search', userController.searchUsers.bind(userController));
publicRouter.get('/', userController.getAllUsers.bind(userController));
publicRouter.get('/:id', userController.getUser.bind(userController));
publicRouter.post('/', userController.createUser.bind(userController));

protectedRouter.get('/me', userController.getCurrentUser.bind(userController));
protectedRouter.put('/me', userController.updateProfile.bind(userController));
protectedRouter.post('/me/avatar', userController.uploadAvatar.bind(userController));

publicRouter.use(protectedRouter);

export default publicRouter;
