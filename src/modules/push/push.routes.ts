import { PushController } from './push.controller';
import { createProtectedRouter } from '../../shared/middleware/auth.guard';

const router = createProtectedRouter();
const controller = new PushController();

router.post('/register', controller.register.bind(controller));
router.post('/unregister', controller.unregister.bind(controller));

export default router;
