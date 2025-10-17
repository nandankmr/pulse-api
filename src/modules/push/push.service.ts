import { logger } from '../../shared/utils/logger';
import { ValidationError } from '../../shared/errors/app.errors';
import { PushRepository } from './push.repository';
import type { RegisterPushTokenInput, UnregisterPushTokenInput } from './push.schema';
import { FcmService, type FcmSendResult } from './fcm.service';
import { UserRepository } from '../user/user.repository';
import type { Message } from '../../generated/prisma';

type NotifyNewMessageParams = {
  senderId: string;
  recipientIds: string[];
  message: Message;
  conversationId?: string | null;
  chatName?: string;
};

export class PushService {
  constructor(
    private readonly repository = new PushRepository(),
    private readonly fcmService = new FcmService(),
    private readonly userRepository = new UserRepository(),
  ) {}

  async registerToken(userId: string, input: RegisterPushTokenInput) {
    logger.info('Registering push token', { userId, deviceId: input.deviceId, platform: input.platform });
    const record = await this.repository.saveToken(userId, input.token, {
      deviceId: input.deviceId ?? null,
      platform: input.platform ?? null,
      appVersion: input.appVersion ?? null,
      buildNumber: input.buildNumber ?? null,
    });
    return {
      token: record.token,
      deviceId: record.deviceId,
      platform: record.platform,
    };
  }

  async unregisterToken(userId: string, input: UnregisterPushTokenInput) {
    if (!input.token && !input.deviceId) {
      throw new ValidationError('Provide either token or deviceId');
    }

    let revokedCount = 0;

    if (input.token) {
      const existing = await this.repository.findByToken(input.token);
      if (!existing || existing.userId !== userId) {
        logger.warn('Attempt to revoke push token that does not belong to user', { userId, token: input.token });
      } else {
        const result = await this.repository.revokeByToken(existing.token);
        revokedCount += result.count;
      }
    }

    if (input.deviceId) {
      const result = await this.repository.revokeByDevice(userId, input.deviceId);
      revokedCount += result.count;
    }

    logger.info('Push tokens revoked', { userId, revokedCount });

    return {
      revoked: revokedCount,
    };
  }

  async notifyNewMessage(params: NotifyNewMessageParams): Promise<void> {
    try {
      const targetIds = Array.from(new Set(params.recipientIds)).filter((id) => id !== params.senderId);
      if (!targetIds.length) {
        return;
      }

      const tokens = await this.repository.findActiveTokensByUserIds(targetIds);
      if (!tokens.length) {
        logger.debug('No active push tokens found for recipients', { messageId: params.message.id });
        return;
      }

      const tokenValues = tokens.map((record) => record.token).filter(Boolean);
      if (!tokenValues.length) {
        return;
      }

      const sender = await this.userRepository.findById(params.senderId);
      const title = this.buildNotificationTitle(params.message, sender?.name ?? undefined, params.chatName);
      const body = this.buildMessagePreview(params.message);

      const chatId = params.message.groupId ?? params.conversationId ?? params.message.conversationId ?? undefined;
      const dataPayload: Record<string, string> = {
        messageId: params.message.id,
        senderId: params.senderId,
        messageType: params.message.type,
        chatType: params.message.groupId ? 'group' : 'direct',
      };

      if (chatId) {
        dataPayload.chatId = chatId;
      }

      const result = await this.fcmService.sendMulticast({
        tokens: tokenValues,
        notification: { title, body },
        data: dataPayload,
      });

      await this.handleFcmResult(result, tokenValues, params.message.id);
    } catch (error) {
      logger.error('Failed to dispatch push notification for new message', {
        messageId: params.message.id,
        senderId: params.senderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleFcmResult(result: FcmSendResult, attemptedTokens: string[], messageId: string): Promise<void> {
    if (!result.invalidTokens.length) {
      logger.info('Push notification dispatched', {
        messageId,
        successCount: result.successCount,
        failureCount: result.failureCount,
      });
      return;
    }

    await this.repository.revokeManyTokens(result.invalidTokens);
    logger.warn('Revoked invalid FCM tokens', {
      messageId,
      invalidCount: result.invalidTokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      attempted: attemptedTokens.length,
    });
  }

  private buildNotificationTitle(message: Message, senderName?: string, chatName?: string): string {
    if (message.groupId) {
      return chatName ? `${chatName}` : 'New group message';
    }
    if (senderName) {
      return senderName;
    }
    return 'New message';
  }

  private buildMessagePreview(message: Message): string {
    if (message.type === 'IMAGE') {
      return '📷 Image';
    }
    if (message.type === 'VIDEO') {
      return '🎬 Video';
    }
    if (message.type === 'LOCATION') {
      return '📍 Location shared';
    }
    if (message.type === 'FILE') {
      return '📎 Attachment';
    }
    return message.content || 'New message';
  }
}
