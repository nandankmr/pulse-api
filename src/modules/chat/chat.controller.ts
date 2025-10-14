import type { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { MessageService } from '../message/message.service';
import type { SendMessageOptions } from '../message/message.service';
import { UserRepository } from '../user/user.repository';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../shared/errors/app.errors';
import { logger } from '../../shared/utils/logger';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware';
import { io } from '../../index';
import { prisma } from '../../shared/services/prisma.service';
import { MessageType } from '../../generated/prisma';

const chatService = new ChatService();
const messageService = new MessageService();
const userRepository = new UserRepository();

export class ChatController {
  /**
   * GET /api/chats
   * Get all chats for the current user (both DMs and groups)
   */
  async getChats(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const chats = await chatService.getUserChats(userId);
      logger.info('Chats retrieved via API', { userId, count: chats.length });
      res.json({ chats });
    } catch (error) {
      logger.error('Error getting chats', {
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/chats/:chatId
   * Get a specific chat by ID
   */
  async getChatById(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      const chat = await chatService.getChatById(chatId, userId);
      logger.info('Chat retrieved via API', { userId, chatId });
      res.json(chat);
    } catch (error) {
      logger.error('Error getting chat', {
        chatId: req.params.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * POST /api/chats
   * Create a new chat (DM or group)
   */
  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { recipientId, groupName, memberIds } = req.body;

      // Validate: either recipientId (for DM) or groupName (for group)
      if (!recipientId && !groupName) {
        throw new ValidationError('Either recipientId or groupName is required');
      }

      if (recipientId && groupName) {
        throw new ValidationError('Cannot specify both recipientId and groupName');
      }

      const chat = await chatService.createChat(userId, {
        recipientId,
        groupName,
        memberIds,
      });

      logger.info('Chat created via API', { userId, chatId: chat.id, isGroup: chat.isGroup });
      res.status(201).json({ chat });
    } catch (error) {
      logger.error('Error creating chat', {
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * POST /api/chats/:chatId/read
   * Mark all messages in a chat as read
   */
  async markChatAsRead(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      await chatService.markChatAsRead(chatId, userId);
      logger.info('Chat marked as read via API', { userId, chatId });
      res.status(204).send();
    } catch (error) {
      logger.error('Error marking chat as read', {
        chatId: req.params.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * DELETE /api/chats/:chatId
   * Delete a chat (soft delete for user)
   */
  async deleteChat(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      await chatService.deleteChat(chatId, userId);
      logger.info('Chat deleted via API', { userId, chatId });
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting chat', {
        chatId: req.params.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * POST /api/chats/:chatId/leave
   * Leave a group chat
   */
  async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      await chatService.leaveGroup(chatId, userId);
      logger.info('User left group via API', { userId, chatId });
      res.status(204).send();
    } catch (error) {
      logger.error('Error leaving group', {
        chatId: req.params.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * POST /api/chats/:chatId/members
   * Add members to a group chat
   */
  async addGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      const { memberIds } = req.body;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        throw new ValidationError('memberIds array is required and must not be empty');
      }

      await chatService.addGroupMembers(chatId, userId, memberIds);
      logger.info('Members added to group via API', { userId, chatId, count: memberIds.length });
      res.status(204).send();
    } catch (error) {
      logger.error('Error adding group members', {
        chatId: req.params.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * DELETE /api/chats/:chatId/members/:memberId
   * Remove a member from a group chat
   */
  async removeGroupMember(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId, memberId } = req.params;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      if (!memberId) {
        throw new ValidationError('Member ID is required');
      }

      await chatService.removeGroupMember(chatId, userId, memberId);
      logger.info('Member removed from group via API', { userId, chatId, memberId });
      res.status(204).send();
    } catch (error) {
      logger.error('Error removing group member', {
        chatId: req.params.chatId,
        memberId: req.params.memberId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/chats/:chatId/members
   * Get all members of a group chat
   */
  async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      const result = await chatService.getGroupMembers(chatId, userId);
      logger.info('Group members retrieved via API', { userId, chatId, count: result.members.length });
      res.json(result);
    } catch (error) {
      logger.error('Error getting group members', {
        chatId: req.params.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * PATCH /api/chats/:chatId
   * Update group details
   */
  async updateGroupDetails(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      const { name, description, avatar } = req.body;
      const result = await chatService.updateGroupDetails(chatId, userId, { name, description, avatar });
      logger.info('Group details updated via API', { userId, chatId });
      res.json(result);
    } catch (error) {
      logger.error('Error updating group details', {
        chatId: req.params.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * PATCH /api/chats/:chatId/members/:memberId
   * Promote or demote a member
   */
  async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId, memberId } = req.params;
      const { role } = req.body;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      if (!memberId) {
        throw new ValidationError('Member ID is required');
      }

      if (!role || (role !== 'ADMIN' && role !== 'MEMBER')) {
        throw new ValidationError('Valid role (ADMIN or MEMBER) is required');
      }

      const result = await chatService.updateMemberRole(chatId, userId, memberId, role);
      logger.info('Member role updated via API', { userId, chatId, memberId, role });
      res.json(result);
    } catch (error) {
      logger.error('Error updating member role', {
        chatId: req.params.chatId,
        memberId: req.params.memberId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/chats/:chatId/messages
   * Get messages for a chat with pagination
   */
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      const { limit = '50', cursor } = req.query;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      // Check if it's a group
      const group = await prisma.group.findUnique({
        where: { id: chatId },
        include: {
          members: {
            where: { userId },
          },
        },
      });

      let conversationId: string | undefined;
      let groupId: string | undefined;

      if (group) {
        // Verify user is a member
        if (group.members.length === 0) {
          throw new UnauthorizedError('You are not a member of this group');
        }
        groupId = chatId;
      } else {
        // It's a DM - verify user is part of conversation
        const conversation = await prisma.directConversation.findUnique({
          where: { id: chatId },
        });

        if (!conversation) {
          throw new NotFoundError('Chat');
        }

        if (conversation.userAId !== userId && conversation.userBId !== userId) {
          throw new UnauthorizedError('You are not part of this conversation');
        }

        conversationId = chatId;
      }

      // Fetch messages with pagination
      const limitNum = parseInt(limit as string, 10);
      
      // Build where clause
      interface MessageWhereClause {
        deletedAt: null;
        groupId?: string;
        conversationId?: string;
        id?: { lt: string };
      }
      
      const whereClause: MessageWhereClause = {
        deletedAt: null,
      };
      
      if (groupId) {
        whereClause.groupId = groupId;
      } else if (conversationId) {
        whereClause.conversationId = conversationId;
      }
      
      if (cursor) {
        whereClause.id = { lt: cursor as string };
      }
      
      const messages = await prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Format messages for frontend
      const formattedMessages = messages.reverse().map((msg) => {
        // Convert location from JSON to attachment format
        const locationAttachment = msg.location ? [{
          id: `loc_${msg.id}`,
          type: 'location' as const,
          url: '',
          latitude: (msg.location as any).latitude,
          longitude: (msg.location as any).longitude,
        }] : [];

        // Convert mediaUrl to attachment format
        const mediaAttachment = msg.mediaUrl ? [{
          id: `media_${msg.id}`,
          type: msg.type.toLowerCase() as any,
          url: msg.mediaUrl,
          name: `${msg.type.toLowerCase()}_${msg.id}`,
        }] : [];

        return {
          id: msg.id,
          chatId: chatId,
          senderId: msg.senderId,
          senderName: msg.sender?.name || 'Unknown',
          senderAvatar: msg.sender?.avatarUrl || null,
          content: msg.content || '',
          timestamp: msg.createdAt.toISOString(),
          isRead: false, // TODO: Check message receipts
          isSent: true,
          attachments: [...mediaAttachment, ...locationAttachment],
          replyTo: null,
          editedAt: msg.editedAt?.toISOString() || null,
          deletedAt: msg.deletedAt?.toISOString() || null,
        };
      });

      const hasMore = messages.length === limitNum;
      const nextCursor = hasMore && messages.length > 0 ? messages[0]?.id : undefined;

      logger.info('Messages retrieved via API', {
        userId,
        chatId,
        count: formattedMessages.length,
        hasMore,
      });

      res.json({
        messages: formattedMessages,
        hasMore,
        nextCursor,
      });
    } catch (error) {
      logger.error('Error getting messages', {
        chatId: req.params.chatId,
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * POST /api/chats/:chatId/messages
   * Send a message in a chat (DM or group)
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      const { content, mediaUrl, type, location } = req.body;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      // Content is required unless there's a location or media
      if (!content && !location && !mediaUrl) {
        throw new ValidationError('Message must have content, location, or media');
      }

      // First, check if it's a group
      const group = await prisma.group.findUnique({
        where: { id: chatId },
        include: {
          members: {
            where: { userId },
          },
        },
      });

      // Build message options based on chat type
      const messageOptions: SendMessageOptions = {
        senderId: userId,
        content: content ? content.trim() : undefined,
        type: (type || (location ? 'LOCATION' : 'TEXT')) as MessageType,
      };

      // Add mediaUrl if provided
      if (mediaUrl) {
        messageOptions.mediaUrl = mediaUrl;
      }

      // Add location if provided
      if (location) {
        messageOptions.location = location;
      }

      if (group) {
        // Verify user is a member
        if (group.members.length === 0) {
          throw new UnauthorizedError('You are not a member of this group');
        }
        messageOptions.groupId = chatId;
      } else {
        // It's a DM - get the conversation to find the other participant
        const conversation = await prisma.directConversation.findUnique({
          where: { id: chatId },
        });

        if (!conversation) {
          throw new NotFoundError('Chat');
        }

        // Verify user is part of the conversation
        if (conversation.userAId !== userId && conversation.userBId !== userId) {
          throw new UnauthorizedError('You are not part of this conversation');
        }

        // Set receiverId to the other participant
        messageOptions.receiverId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
        messageOptions.conversationId = chatId;
      }

      // Send message via message service
      const result = await messageService.sendMessage(messageOptions);

      // Get sender details
      const sender = await userRepository.findById(userId);

      // Convert location from JSON to attachment format for frontend
      const locationAttachment = result.message.location ? [{
        id: `loc_${result.message.id}`,
        type: 'location' as const,
        url: '',
        latitude: (result.message.location as any).latitude,
        longitude: (result.message.location as any).longitude,
      }] : [];

      // Convert mediaUrl to attachment format for frontend
      const mediaAttachment = result.message.mediaUrl ? [{
        id: `media_${result.message.id}`,
        type: result.message.type.toLowerCase() as any,
        url: result.message.mediaUrl,
        name: `${result.message.type.toLowerCase()}_${result.message.id}`,
      }] : [];

      // Prepare response matching frontend expectations
      const messageResponse = {
        id: result.message.id,
        chatId: chatId,
        senderId: userId,
        senderName: sender?.name || 'Unknown User',
        senderAvatar: sender?.avatarUrl || null,
        content: result.message.content,
        timestamp: result.message.createdAt.toISOString(),
        isRead: false,
        isSent: true,
        attachments: [...mediaAttachment, ...locationAttachment],
        replyTo: null,
      };

      // Broadcast to all chat participants via Socket.IO
      if (io) {
        const socketPayload = {
          message: messageResponse,
          tempId: req.body.tempId, // Support for optimistic updates
        };

        if (group) {
          // For groups, broadcast to group room
          io.to(`group:${chatId}`).emit('message:new', socketPayload);
          console.log(`📡 Broadcasting to group:${chatId}`);
        } else {
          // For DMs, send to both participants
          const conversation = await prisma.directConversation.findUnique({
            where: { id: chatId },
          });
          
          if (conversation) {
            io.to(`user:${conversation.userAId}`).emit('message:new', socketPayload);
            io.to(`user:${conversation.userBId}`).emit('message:new', socketPayload);
            console.log(`📡 Broadcasting to user:${conversation.userAId} and user:${conversation.userBId}`);
          }
        }
      }

      logger.info('Message sent via API', {
        userId,
        chatId,
        messageId: result.message.id,
        isGroup: !!group,
      });

      res.status(200).json({ message: messageResponse });
    } catch (error) {
      logger.error('Error sending message', {
        chatId: req.params.chatId,
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * PUT /api/chats/:chatId/messages/:messageId
   * Edit a message
   */
  async editMessage(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId, messageId } = req.params;
      const { content } = req.body;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      if (!messageId) {
        throw new ValidationError('Message ID is required');
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new ValidationError('Message content is required');
      }

      const updatedMessage = await messageService.editMessage(messageId, userId, content.trim());

      // Broadcast edit via Socket.IO
      if (io) {
        const editPayload = {
          messageId,
          content: content.trim(),
          editedAt: updatedMessage.editedAt?.toISOString() ?? new Date().toISOString(),
          conversationId: updatedMessage.conversationId ?? undefined,
          groupId: updatedMessage.groupId ?? undefined,
        };

        if (updatedMessage.groupId) {
          io.to(`group:${updatedMessage.groupId}`).emit('message:edited', editPayload);
        } else if (updatedMessage.conversationId) {
          const conversation = await prisma.directConversation.findUnique({
            where: { id: updatedMessage.conversationId },
          });
          if (conversation) {
            const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
            io.to(`user:${otherUserId}`).emit('message:edited', editPayload);
          }
        }
      }

      logger.info('Message edited via API', { userId, chatId, messageId });
      res.json({
        id: updatedMessage.id,
        content: updatedMessage.content,
        editedAt: updatedMessage.editedAt?.toISOString(),
      });
    } catch (error) {
      logger.error('Error editing message', {
        chatId: req.params.chatId,
        messageId: req.params.messageId,
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * DELETE /api/chats/:chatId/messages/:messageId
   * Delete a message
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId, messageId } = req.params;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      if (!messageId) {
        throw new ValidationError('Message ID is required');
      }

      const deleteForEveryone = req.body.deleteForEveryone === true;
      const deletedMessage = await messageService.deleteMessage(messageId, userId, deleteForEveryone);

      // Broadcast delete via Socket.IO
      if (io) {
        const deletePayload = {
          messageId,
          deletedBy: userId,
          deletedAt: deletedMessage.deletedAt?.toISOString() ?? new Date().toISOString(),
          deleteForEveryone,
          conversationId: deletedMessage.conversationId ?? undefined,
          groupId: deletedMessage.groupId ?? undefined,
        };

        if (deletedMessage.groupId) {
          io.to(`group:${deletedMessage.groupId}`).emit('message:deleted', deletePayload);
        } else if (deletedMessage.conversationId) {
          const conversation = await prisma.directConversation.findUnique({
            where: { id: deletedMessage.conversationId },
          });
          if (conversation) {
            const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
            io.to(`user:${otherUserId}`).emit('message:deleted', deletePayload);
          }
        }
      }

      logger.info('Message deleted via API', { userId, chatId, messageId, deleteForEveryone });
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting message', {
        chatId: req.params.chatId,
        messageId: req.params.messageId,
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * POST /api/chats/:chatId/messages/read
   * Mark messages as read
   */
  async markMessagesAsRead(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const { chatId } = req.params;
      const { messageIds } = req.body;

      if (!chatId) {
        throw new ValidationError('Chat ID is required');
      }

      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        throw new ValidationError('messageIds array is required and must not be empty');
      }

      await messageService.markMultipleMessagesRead(messageIds, userId);

      logger.info('Messages marked as read via API', { userId, chatId, count: messageIds.length });
      res.status(204).send();
    } catch (error) {
      logger.error('Error marking messages as read', {
        chatId: req.params.chatId,
        userId: (req as AuthenticatedRequest).user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
