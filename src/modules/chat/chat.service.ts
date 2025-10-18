import { prisma } from '../../shared/services/prisma.service';
import { GroupService } from '../group/group.service';
import { UserRepository } from '../user/user.repository';
import { NotFoundError, ValidationError, UnauthorizedError } from '../../shared/errors/app.errors';
import { logger } from '../../shared/utils/logger';
import { io } from '../../index';

export interface ChatResponse {
  id: string;
  name: string;
  avatar?: string | undefined;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup: boolean;
  isOnline?: boolean | undefined;
  otherUserId?: string | undefined; // For DM conversations, the ID of the other user
}

export interface CreateChatRequest {
  recipientId?: string;
  groupName?: string;
  memberIds?: string[];
}

export class ChatService {
  private groupService = new GroupService();
  private userRepository = new UserRepository();

  /**
   * Get all chats for a user (both DMs and groups)
   */
  async getUserChats(userId: string): Promise<ChatResponse[]> {
    // Get all groups the user is a member of
    const groups = await this.groupService.listUserGroups(userId);

    // Get all direct conversations
    const conversations = await prisma.directConversation.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: {
            deletedAt: null,
          },
        },
      },
    });

    const chats: ChatResponse[] = [];

    // Process groups
    for (const group of groups) {
      const lastMessage = await prisma.message.findFirst({
        where: {
          groupId: group.id,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      const unreadCount = await prisma.messageReceipt.count({
        where: {
          userId,
          message: {
            groupId: group.id,
            deletedAt: null,
            senderId: {
              not: userId, // Exclude messages sent by current user
            },
          },
          status: {
            not: 'READ',
          },
        },
      });

      chats.push({
        id: group.id,
        name: group.name,
        avatar: group.avatarUrl ?? undefined,
        lastMessage: lastMessage?.content || '',
        timestamp: lastMessage?.createdAt.toISOString() || group.createdAt.toISOString(),
        unreadCount,
        isGroup: true,
      });
    }

    // Process direct conversations
    for (const conv of conversations) {
      const otherUser = conv.userAId === userId ? conv.userB : conv.userA;
      const lastMessage = conv.messages[0];

      const unreadCount = await prisma.messageReceipt.count({
        where: {
          userId,
          message: {
            conversationId: conv.id,
            deletedAt: null,
            senderId: {
              not: userId, // Exclude messages sent by current user
            },
          },
          status: {
            not: 'READ',
          },
        },
      });

      // Check if other user is online (you can implement this based on your presence logic)
      const isOnline = false; // TODO: Implement presence check

      chats.push({
        id: conv.id,
        name: otherUser.name,
        avatar: otherUser.avatarUrl ?? undefined,
        lastMessage: lastMessage?.content || '',
        timestamp: lastMessage?.createdAt.toISOString() || conv.createdAt.toISOString(),
        unreadCount,
        isGroup: false,
        isOnline,
        otherUserId: otherUser.id, // Include the other user's ID for DM conversations
      });
    }

    // Sort by timestamp descending
    chats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return chats;
  }

  /**
   * Get a specific chat by ID
   */
  async getChatById(chatId: string, userId: string): Promise<ChatResponse> {
    // Try to find as a group first
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: {
        members: true,
      },
    });

    if (group) {
      // Verify user is a member
      const isMember = group.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new UnauthorizedError('You are not a member of this group');
      }

      const lastMessage = await prisma.message.findFirst({
        where: {
          groupId: group.id,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      const unreadCount = await prisma.messageReceipt.count({
        where: {
          userId,
          message: {
            groupId: group.id,
            deletedAt: null,
            senderId: {
              not: userId, // Exclude messages sent by current user
            },
          },
          status: {
            not: 'READ',
          },
        },
      });

      return {
        id: group.id,
        name: group.name,
        avatar: group.avatarUrl ?? undefined,
        lastMessage: lastMessage?.content || '',
        timestamp: lastMessage?.createdAt.toISOString() || group.createdAt.toISOString(),
        unreadCount,
        isGroup: true,
      };
    }

    // Try to find as a direct conversation
    const conversation = await prisma.directConversation.findUnique({
      where: { id: chatId },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: {
            deletedAt: null,
          },
        },
      },
    });

    if (conversation) {
      // Verify user is part of the conversation
      if (conversation.userAId !== userId && conversation.userBId !== userId) {
        throw new UnauthorizedError('You are not part of this conversation');
      }

      const otherUser = conversation.userAId === userId ? conversation.userB : conversation.userA;
      const lastMessage = conversation.messages[0];

      const unreadCount = await prisma.messageReceipt.count({
        where: {
          userId,
          message: {
            conversationId: conversation.id,
            deletedAt: null,
            senderId: {
              not: userId, // Exclude messages sent by current user
            },
          },
          status: {
            not: 'READ',
          },
        },
      });

      return {
        id: conversation.id,
        name: otherUser.name,
        avatar: otherUser.avatarUrl ?? undefined,
        lastMessage: lastMessage?.content || '',
        timestamp: lastMessage?.createdAt.toISOString() || conversation.createdAt.toISOString(),
        unreadCount,
        isGroup: false,
        isOnline: false, // TODO: Implement presence check
        otherUserId: otherUser.id, // Include the other user's ID for DM conversations
      };
    }

    throw new NotFoundError('Chat');
  }

  /**
   * Create a new chat (DM or group)
   */
  async createChat(userId: string, data: CreateChatRequest): Promise<ChatResponse> {
    // Create DM
    if (data.recipientId) {
      // Verify recipient exists
      const recipient = await this.userRepository.findById(data.recipientId);
      if (!recipient) {
        throw new NotFoundError('Recipient user');
      }

      // Check if conversation already exists
      const existingConv = await prisma.directConversation.findFirst({
        where: {
          OR: [
            { userAId: userId, userBId: data.recipientId },
            { userAId: data.recipientId, userBId: userId },
          ],
        },
        include: {
          userA: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          userB: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (existingConv) {
        const otherUser = existingConv.userAId === userId ? existingConv.userB : existingConv.userA;
        return {
          id: existingConv.id,
          name: otherUser.name,
          avatar: otherUser.avatarUrl ?? undefined,
          lastMessage: '',
          timestamp: existingConv.createdAt.toISOString(),
          unreadCount: 0,
          isGroup: false,
          isOnline: false,
        };
      }

      // Create new conversation
      const conversation = await prisma.directConversation.create({
        data: {
          userAId: userId,
          userBId: data.recipientId,
        },
        include: {
          userA: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          userB: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      const otherUser = conversation.userAId === userId ? conversation.userB : conversation.userA;

      logger.info('Direct conversation created', { userId, conversationId: conversation.id });

      return {
        id: conversation.id,
        name: otherUser.name,
        avatar: otherUser.avatarUrl ?? undefined,
        lastMessage: '',
        timestamp: conversation.createdAt.toISOString(),
        unreadCount: 0,
        isGroup: false,
        isOnline: false,
      };
    }

    // Create group
    if (data.groupName) {
      const group = await this.groupService.createGroup(userId, {
        name: data.groupName,
      });

      // Add additional members if provided
      if (data.memberIds && data.memberIds.length > 0) {
        const initiallyAdded: string[] = [];

        for (const memberId of data.memberIds) {
          try {
            await this.groupService.addMember(group.id, userId, memberId, 'MEMBER');
            initiallyAdded.push(memberId);
          } catch {
            logger.warn('Failed to add member to new group', { groupId: group.id, memberId });
          }
        }

        if (initiallyAdded.length > 0 && io) {
          for (const addedUserId of initiallyAdded) {
            const payload = {
              groupId: group.id,
              userId: addedUserId,
              addedBy: userId,
              role: 'MEMBER' as const,
            };

            io.to(`group:${group.id}`).emit('group:member:added', payload);
            io.to(`user:${addedUserId}`).emit('group:member:added', payload);
          }
        }
      }

      logger.info('Group chat created', { userId, groupId: group.id });

      return {
        id: group.id,
        name: group.name,
        avatar: group.avatarUrl ?? undefined,
        lastMessage: '',
        timestamp: group.createdAt.toISOString(),
        unreadCount: 0,
        isGroup: true,
      };
    }

    throw new ValidationError('Either recipientId or groupName is required');
  }

  /**
   * Mark all messages in a chat as read
   */
  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    // Check if it's a group
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (group) {
      const isMember = group.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new UnauthorizedError('You are not a member of this group');
      }

      // Mark all unread messages in this group as read
      await prisma.messageReceipt.updateMany({
        where: {
          userId,
          message: {
            groupId: chatId,
            deletedAt: null,
          },
          status: {
            not: 'READ',
          },
        },
        data: {
          status: 'READ',
          updatedAt: new Date(),
        },
      });

      logger.info('Group chat marked as read', { userId, chatId });
      return;
    }

    // Check if it's a direct conversation
    const conversation = await prisma.directConversation.findUnique({
      where: { id: chatId },
    });

    if (conversation) {
      if (conversation.userAId !== userId && conversation.userBId !== userId) {
        throw new UnauthorizedError('You are not part of this conversation');
      }

      // Mark all unread messages in this conversation as read
      await prisma.messageReceipt.updateMany({
        where: {
          userId,
          message: {
            conversationId: chatId,
            deletedAt: null,
          },
          status: {
            not: 'READ',
          },
        },
        data: {
          status: 'READ',
          updatedAt: new Date(),
        },
      });

      logger.info('Conversation marked as read', { userId, chatId });
      return;
    }

    throw new NotFoundError('Chat');
  }

  /**
   * Delete a chat (for the user)
   */
  async deleteChat(chatId: string, userId: string): Promise<void> {
    // For direct conversations, we don't actually delete, just hide for the user
    const conversation = await prisma.directConversation.findUnique({
      where: { id: chatId },
    });

    if (conversation) {
      if (conversation.userAId !== userId && conversation.userBId !== userId) {
        throw new UnauthorizedError('You are not part of this conversation');
      }

      // In a real implementation, you might want to add a "hidden" flag
      // For now, we'll just log it
      logger.info('User deleted conversation (soft delete)', { userId, chatId });
      return;
    }

    // For groups, use the existing group service
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (group) {
      await this.groupService.deleteGroup(chatId, userId);
      return;
    }

    throw new NotFoundError('Chat');
  }

  /**
   * Leave a group chat
   */
  async leaveGroup(chatId: string, userId: string): Promise<void> {
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ValidationError('You are not a member of this group');
    }

    await this.groupService.removeMember(chatId, userId, userId);
    logger.info('User left group', { userId, chatId });
  }

  /**
   * Add members to a group chat
   */
  async addGroupMembers(chatId: string, userId: string, memberIds: string[]): Promise<void> {
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    // Check if user is an admin
    const userMember = group.members.find((m) => m.userId === userId);
    if (!userMember || userMember.role !== 'ADMIN') {
      throw new UnauthorizedError('Only admins can add members');
    }

    // Add each member
    const successfullyAdded: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.groupService.addMember(chatId, userId, memberId, 'MEMBER');
        successfullyAdded.push(memberId);
      } catch {
        logger.warn('Failed to add member to group', { chatId, memberId });
      }
    }

    if (successfullyAdded.length > 0) {
      logger.info('Members added to group', { userId, chatId, count: successfullyAdded.length });

      if (io) {
        for (const addedUserId of successfullyAdded) {
          const payload = {
            groupId: chatId,
            userId: addedUserId,
            addedBy: userId,
            role: 'MEMBER' as const,
          };

          io.to(`group:${chatId}`).emit('group:member:added', payload);
          io.to(`user:${addedUserId}`).emit('group:member:added', payload);
        }
      }
    } else {
      logger.warn('No members were added to group', { userId, chatId });
    }
  }

  /**
   * Remove a member from a group chat
   */
  async removeGroupMember(chatId: string, userId: string, memberId: string): Promise<void> {
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    // Check if user is an admin
    const userMember = group.members.find((m) => m.userId === userId);
    if (!userMember || userMember.role !== 'ADMIN') {
      throw new UnauthorizedError('Only admins can remove members');
    }

    await this.groupService.removeMember(chatId, userId, memberId);
    logger.info('Member removed from group', { userId, chatId, memberId });
  }

  /**
   * Get all members of a group chat with full user details
   */
  async getGroupMembers(chatId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    // Verify user is a member
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new UnauthorizedError('You are not a member of this group');
    }

    const members = group.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatarUrl,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      isOnline: false, // TODO: Implement presence check
    }));

    return { members };
  }

  /**
   * Update group details (name, description, avatar)
   */
  async updateGroupDetails(chatId: string, userId: string, data: { name?: string; description?: string; avatar?: string }) {
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    // Check if user is an admin
    const userMember = group.members.find((m) => m.userId === userId);
    if (!userMember || userMember.role !== 'ADMIN') {
      throw new UnauthorizedError('Only admins can update group details');
    }

    const updateData: { name?: string; description?: string; avatarUrl?: string } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.avatar !== undefined) updateData.avatarUrl = data.avatar;

    const updatedGroup = await prisma.group.update({
      where: { id: chatId },
      data: updateData,
    });

    logger.info('Group details updated', { userId, chatId, fields: Object.keys(updateData) });

    return {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      avatar: updatedGroup.avatarUrl,
    };
  }

  /**
   * Promote or demote a member (change role)
   */
  async updateMemberRole(chatId: string, userId: string, memberId: string, role: 'ADMIN' | 'MEMBER') {
    const group = await prisma.group.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    // Check if user is an admin
    const userMember = group.members.find((m) => m.userId === userId);
    if (!userMember || userMember.role !== 'ADMIN') {
      throw new UnauthorizedError('Only admins can change member roles');
    }

    // Check if target member exists
    const targetMember = group.members.find((m) => m.userId === memberId);
    if (!targetMember) {
      throw new NotFoundError('Member not found in this group');
    }

    // Prevent demoting the last admin
    if (role === 'MEMBER' && targetMember.role === 'ADMIN') {
      const adminCount = group.members.filter((m) => m.role === 'ADMIN').length;
      if (adminCount <= 1) {
        throw new ValidationError('Cannot demote the last admin');
      }
    }

    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: chatId,
          userId: memberId,
        },
      },
      data: { role },
    });

    logger.info('Member role updated', { userId, chatId, memberId, newRole: role });

    return { message: 'Member role updated successfully' };
  }
}
