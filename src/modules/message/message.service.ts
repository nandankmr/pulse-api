import type { Message } from '../../generated/prisma';
import { MessageRepository, MessageReceipt, MessageReceiptStatus, SendMessageData } from './message.repository';
import { GroupRepository } from '../group/group.repository';
import { PushService } from '../push/push.service';
import { logger } from '../../shared/utils/logger';

export interface SendMessageOptions extends SendMessageData {}

export interface SendMessageResult {
  message: Message;
  conversationId: string | null;
  participantIds: string[];
  receipts: MessageReceipt[];
}

export interface MarkReadResult {
  message: Message;
  receipt: MessageReceipt;
  participantIds: string[];
}

export class MessageService {
  private readonly messageRepository = new MessageRepository();
  private readonly groupRepository = new GroupRepository();
  private readonly pushService = new PushService();

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    if (!options.receiverId && !options.groupId) {
      throw new Error('receiverId or groupId is required to send a message');
    }

    let resolvedConversationId = options.conversationId ?? null;

    if (options.receiverId && !options.groupId && !resolvedConversationId) {
      resolvedConversationId = await this.messageRepository.createDirectConversation(options.senderId, options.receiverId);
    }

    const createPayload: SendMessageData = {
      senderId: options.senderId,
    };

    if (options.receiverId !== undefined) {
      createPayload.receiverId = options.receiverId;
    }
    if (options.groupId !== undefined) {
      createPayload.groupId = options.groupId;
    }
    if (resolvedConversationId !== null) {
      createPayload.conversationId = resolvedConversationId;
    } else if (options.conversationId !== undefined) {
      createPayload.conversationId = options.conversationId;
    }
    if (options.type !== undefined) {
      createPayload.type = options.type;
    }
    if (options.content !== undefined) {
      createPayload.content = options.content;
    }
    if (options.mediaUrl !== undefined) {
      createPayload.mediaUrl = options.mediaUrl;
    }
    if (options.location !== undefined) {
      createPayload.location = options.location;
    }
    if (options.systemType !== undefined) {
      createPayload.systemType = options.systemType;
    }
    if (options.metadata !== undefined) {
      createPayload.metadata = options.metadata;
    }
    if (options.actorId !== undefined) {
      createPayload.actorId = options.actorId;
    }
    if (options.targetUserId !== undefined) {
      createPayload.targetUserId = options.targetUserId;
    }

    const message = await this.messageRepository.createMessage(createPayload);

    const participantIds = await this.collectParticipantIds(message);
    const receipts = await this.messageRepository.markDeliveredForParticipants(message.id, participantIds);

    let chatName: string | undefined;
    if (message.groupId) {
      try {
        const group = await this.groupRepository.findById(message.groupId);
        chatName = group?.name ?? undefined;
      } catch (error) {
        logger.warn('Failed to resolve group name for push notification', {
          messageId: message.id,
          groupId: message.groupId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const notificationPayload = {
      senderId: options.senderId,
      recipientIds: participantIds,
      message,
      conversationId: message.conversationId ?? resolvedConversationId ?? null,
      ...(chatName ? { chatName } : {}),
    } as Parameters<PushService['notifyNewMessage']>[0];

    void this.pushService.notifyNewMessage(notificationPayload);

    return {
      message,
      conversationId: message.conversationId ?? resolvedConversationId,
      participantIds,
      receipts,
    };
  }

  async markMessageRead(messageId: string, userId: string): Promise<MarkReadResult> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const receipt = await this.messageRepository.upsertReceipt({
      messageId,
      userId,
      status: this.getReadStatus(),
    });

    const participantIds = await this.collectParticipantIds(message);

    return {
      message,
      receipt,
      participantIds,
    };
  }

  async markDelivered(messageId: string, userIds: string[]): Promise<MessageReceipt[]> {
    if (userIds.length === 0) {
      return [];
    }

    try {
      return await this.messageRepository.markDeliveredForParticipants(messageId, userIds);
    } catch (error) {
      logger.error('Failed to mark messages delivered', {
        messageId,
        userIds,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async collectParticipantIds(message: Message): Promise<string[]> {
    const participantIds = new Set<string>();
    participantIds.add(message.senderId);

    if (message.receiverId) {
      participantIds.add(message.receiverId);
    }

    if (message.groupId) {
      try {
        const memberIds = await this.groupRepository.listMemberUserIds(message.groupId);
        memberIds.forEach((memberId) => participantIds.add(memberId));
      } catch (error) {
        logger.error('Failed to fetch group members for message participants', {
          messageId: message.id,
          groupId: message.groupId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    return Array.from(participantIds);
  }

  private getReadStatus(): MessageReceiptStatus {
    return 'READ';
  }

  async editMessage(messageId: string, userId: string, newContent: string): Promise<Message> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    if (message.deletedAt) {
      throw new Error('Cannot edit a deleted message');
    }

    // Check 15-minute time limit
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      throw new Error('Cannot edit messages older than 15 minutes');
    }

    const updatedMessage = await this.messageRepository.updateMessage(messageId, {
      content: newContent,
      editedAt: new Date(),
    });

    logger.info('Message edited', { messageId, userId });
    return updatedMessage;
  }

  async deleteMessage(messageId: string, userId: string, deleteForEveryone: boolean): Promise<Message> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    if (message.deletedAt) {
      throw new Error('Message is already deleted');
    }

    // Check 1-hour time limit for "delete for everyone"
    if (deleteForEveryone) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        throw new Error('Cannot delete for everyone after 1 hour');
      }
    }

    const updatedMessage = await this.messageRepository.updateMessage(messageId, {
      deletedAt: new Date(),
      deletedBy: userId,
    });

    logger.info('Message deleted', { messageId, userId, deleteForEveryone });
    return updatedMessage;
  }

  async markMultipleMessagesRead(messageIds: string[], userId: string): Promise<MessageReceipt[]> {
    const receipts: MessageReceipt[] = [];
    
    for (const messageId of messageIds) {
      try {
        const receipt = await this.messageRepository.upsertReceipt({
          messageId,
          userId,
          status: this.getReadStatus(),
        });
        receipts.push(receipt);
      } catch (error) {
        logger.error('Failed to mark message as read', {
          messageId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return receipts;
  }
}
