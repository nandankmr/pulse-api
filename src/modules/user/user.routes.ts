import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

router.get('/:id', userController.getUser.bind(userController));
router.post('/', userController.createUser.bind(userController));

export default router;
