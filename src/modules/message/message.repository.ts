import type { Message } from '../../generated/prisma';
import { MessageType, Prisma } from '../../generated/prisma';
import { prisma } from '../../shared/services/prisma.service';
import { logger } from '../../shared/utils/logger';
import { PaginationOptions, PaginationUtils } from '../../shared/utils/pagination';

export interface SendMessageData {
  senderId: string;
  receiverId?: string;
  groupId?: string;
  conversationId?: string;
  type?: MessageType;
  content?: string | null;
  mediaUrl?: string | null;
  location?: Record<string, unknown> | null;
}

export type MessageReceiptStatus = 'DELIVERED' | 'READ';

export interface MessageReceipt {
  id: string;
  messageId: string;
  userId: string;
  status: MessageReceiptStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertReceiptData {
  messageId: string;
  userId: string;
  status: MessageReceiptStatus;
}

export class MessageRepository {
  async createDirectConversation(userAId: string, userBId: string): Promise<string> {
    const primaryUser = userAId <= userBId ? userAId : userBId;
    const secondaryUser = primaryUser === userAId ? userBId : userAId;

    const conversation = await prisma.directConversation.upsert({
      where: {
        userAId_userBId: {
          userAId: primaryUser,
          userBId: secondaryUser,
        },
      },
      create: {
        userAId: primaryUser,
        userBId: secondaryUser,
      },
      update: {},
    });

    return conversation.id;
  }

  async createMessage(data: SendMessageData): Promise<Message> {
    try {
      logger.info('Creating message', { senderId: data.senderId, receiverId: data.receiverId, groupId: data.groupId, type: data.type });
      const messageData: Prisma.MessageUncheckedCreateInput = {
        senderId: data.senderId,
        receiverId: data.receiverId ?? null,
        groupId: data.groupId ?? null,
        conversationId: data.conversationId ?? null,
        type: data.type ?? MessageType.TEXT,
        content: data.content ?? null,
        mediaUrl: data.mediaUrl ?? null,
      };

      if (data.location !== undefined) {
        messageData.location = data.location === null ? Prisma.JsonNull : (data.location as Prisma.InputJsonValue);
      }

      const message = await prisma.message.create({
        data: messageData,
      });
      logger.info('Message created', { messageId: message.id });
      return message;
    } catch (error) {
      logger.error('Failed to create message', {
        senderId: data.senderId,
        receiverId: data.receiverId,
        groupId: data.groupId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getMessages(options: {
    conversationId?: string;
    groupId?: string;
    pagination?: PaginationOptions;
  }): Promise<{ data: Message[]; pagination: ReturnType<typeof PaginationUtils.getPaginationInfo> }> {
    try {
      const paginationOptions = options.pagination
        ? PaginationUtils.validatePaginationOptions(options.pagination)
        : { page: 1, limit: 20, offset: 0 };

      const { page = 1, limit = 20, offset = 0 } = paginationOptions;

      const whereClause: Prisma.MessageWhereInput = {
        deletedAt: { equals: null },
      };

      if (options.conversationId) {
        whereClause.conversationId = options.conversationId;
      }

      if (options.groupId) {
        whereClause.groupId = options.groupId;
      }

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.message.count({ where: whereClause }),
      ]);

      const pagination = PaginationUtils.getPaginationInfo(messages, total, page, limit);
      return { data: messages, pagination };
    } catch (error) {
      logger.error('Failed to fetch messages', {
        conversationId: options.conversationId,
        groupId: options.groupId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async softDeleteMessage(messageId: string, userId: string): Promise<Message> {
    try {
      logger.info('Soft deleting message', { messageId, userId });
      const message = await prisma.message.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
        },
      });
      return message;
    } catch (error) {
      logger.error('Failed to soft delete message', { messageId, userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async findById(messageId: string): Promise<Message | null> {
    try {
      return await prisma.message.findUnique({ where: { id: messageId } });
    } catch (error) {
      logger.error('Failed to find message by id', { messageId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async upsertReceipt(data: UpsertReceiptData): Promise<MessageReceipt> {
    try {
      const receiptDelegate = (prisma as unknown as { messageReceipt: { upsert: (...args: any[]) => Promise<MessageReceipt> } }).messageReceipt;
      const receipt = await receiptDelegate.upsert({
        where: {
          messageId_userId: {
            messageId: data.messageId,
            userId: data.userId,
          },
        },
        create: {
          messageId: data.messageId,
          userId: data.userId,
          status: data.status,
        },
        update: {
          status: data.status,
        },
      });
      return receipt;
    } catch (error) {
      logger.error('Failed to upsert message receipt', {
        messageId: data.messageId,
        userId: data.userId,
        status: data.status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markDeliveredForParticipants(messageId: string, participantIds: string[]): Promise<MessageReceipt[]> {
    if (participantIds.length === 0) {
      return [];
    }

    const uniqueParticipantIds = Array.from(new Set(participantIds));

    const receiptDelegate = (prisma as unknown as { messageReceipt: { upsert: (...args: any[]) => Promise<MessageReceipt> } }).messageReceipt;

    const operations = uniqueParticipantIds.map((userId) =>
      receiptDelegate.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        create: {
          messageId,
          userId,
          status: 'DELIVERED',
        },
        update: {
          status: 'DELIVERED',
        },
      })
    );

    const receipts = await Promise.all(operations);
    return receipts as MessageReceipt[];
  }

  async updateMessage(messageId: string, data: { content?: string; editedAt?: Date; deletedAt?: Date; deletedBy?: string }): Promise<Message> {
    try {
      logger.info('Updating message', { messageId, fields: Object.keys(data) });
      const message = await prisma.message.update({
        where: { id: messageId },
        data,
      });
      logger.info('Message updated', { messageId });
      return message;
    } catch (error) {
      logger.error('Failed to update message', {
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
