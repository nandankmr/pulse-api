import { ChatController } from './chat.controller';
import { createProtectedRouter } from '../../shared/middleware/auth.guard';

const router = createProtectedRouter();
const controller = new ChatController();

// Get all chats for current user
router.get('/', controller.getChats.bind(controller));

// Get specific chat by ID
router.get('/:chatId', controller.getChatById.bind(controller));

// Create new chat (DM or group)
router.post('/', controller.createChat.bind(controller));

// Get messages for a chat
router.get('/:chatId/messages', controller.getMessages.bind(controller));

// Send message in a chat
router.post('/:chatId/messages', controller.sendMessage.bind(controller));

// Edit message
router.put('/:chatId/messages/:messageId', controller.editMessage.bind(controller));

// Delete message
router.delete('/:chatId/messages/:messageId', controller.deleteMessage.bind(controller));

// Mark messages as read
router.post('/:chatId/messages/read', controller.markMessagesAsRead.bind(controller));

// Update group details
router.patch('/:chatId', controller.updateGroupDetails.bind(controller));

// Mark chat as read
router.post('/:chatId/read', controller.markChatAsRead.bind(controller));

// Delete chat
router.delete('/:chatId', controller.deleteChat.bind(controller));

// Leave group
router.post('/:chatId/leave', controller.leaveGroup.bind(controller));

// Get group members
router.get('/:chatId/members', controller.getGroupMembers.bind(controller));

// Add members to group
router.post('/:chatId/members', controller.addGroupMembers.bind(controller));

// Update member role (promote/demote)
router.patch('/:chatId/members/:memberId', controller.updateMemberRole.bind(controller));

// Remove member from group
router.delete('/:chatId/members/:memberId', controller.removeGroupMember.bind(controller));

export default router;
