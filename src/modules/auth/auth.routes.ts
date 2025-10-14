import { Router } from 'express';
import { AuthController } from './auth.controller';
import { createProtectedRouter } from '../../shared/middleware/auth.guard';

const router = Router();
const protectedRouter = createProtectedRouter();
const controller = new AuthController();

router.post('/register', controller.register.bind(controller));
router.post('/login', controller.login.bind(controller));
router.post('/refresh', controller.refresh.bind(controller));
router.post('/verify-email', controller.verifyEmail.bind(controller));
router.post('/resend-verification', controller.resendVerification.bind(controller));
router.post('/logout', controller.logout.bind(controller));
router.post('/forgot-password', controller.forgotPassword.bind(controller));
router.post('/reset-password', controller.resetPassword.bind(controller));

protectedRouter.post('/change-password', controller.changePassword.bind(controller));

router.use(protectedRouter);

export default router;
