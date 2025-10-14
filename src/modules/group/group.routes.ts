import { Router } from 'express';
import { GroupController } from './group.controller';
import { createProtectedRouter } from '../../shared/middleware/auth.guard';

const router = createProtectedRouter();
const controller = new GroupController();

router.post('/', controller.createGroup.bind(controller));
router.get('/me', controller.listMyGroups.bind(controller));
router.get('/:groupId', controller.getGroup.bind(controller));
router.patch('/:groupId', controller.updateGroup.bind(controller));
router.delete('/:groupId', controller.deleteGroup.bind(controller));

router.post('/:groupId/members', controller.addMember.bind(controller));
router.patch('/:groupId/members/:userId', controller.updateMemberRole.bind(controller));
router.delete('/:groupId/members/:userId', controller.removeMember.bind(controller));
router.post('/:groupId/invite', controller.createInvitation.bind(controller));
router.post('/:groupId/join', controller.joinGroup.bind(controller));

export default router;
