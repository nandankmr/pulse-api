import { MessageType } from '../../generated/prisma';
import { logger } from '../../shared/utils/logger';
import { io } from '../../index';
import { MessageService } from './message.service';
import { presentMessage } from './message.presenter';
import type { SystemMessageTypeValue } from './message.repository';
import { UserRepository } from '../user/user.repository';

interface GroupSystemMessageOptions {
  groupId: string;
  actorId: string;
  systemType: SystemMessageTypeValue;
  metadata?: Record<string, unknown> | null;
  targetUserId?: string | null;
}

type MemberRoleChangeMetadata = Record<'previousRole' | 'newRole', string>;

export class SystemMessageService {
  private readonly messageService = new MessageService();
  private readonly userRepository = new UserRepository();

  async publishGroupCreated(groupId: string, actorId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      systemType: 'GROUP_CREATED',
      metadata: metadata ? { ...metadata } : null,
    });
  }

  async publishMemberAdded(groupId: string, actorId: string, targetUserId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      targetUserId,
      systemType: 'MEMBER_ADDED',
      metadata: metadata ? { ...metadata } : null,
    });
  }

  async publishMemberRemoved(groupId: string, actorId: string, targetUserId: string): Promise<void> {
    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      targetUserId,
      systemType: 'MEMBER_REMOVED',
      metadata: null,
    });
  }

  async publishMemberLeft(groupId: string, actorId: string): Promise<void> {
    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      targetUserId: actorId,
      systemType: 'MEMBER_LEFT',
      metadata: null,
    });
  }

  async publishMemberRoleChanged(groupId: string, actorId: string, targetUserId: string, metadata: MemberRoleChangeMetadata): Promise<void> {
    const systemType: SystemMessageTypeValue = metadata.newRole === 'ADMIN' ? 'MEMBER_PROMOTED' : 'MEMBER_DEMOTED';

    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      targetUserId,
      systemType,
      metadata,
    });
  }

  async publishGroupRenamed(groupId: string, actorId: string, metadata: { previousName: string; newName: string }): Promise<void> {
    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      systemType: 'GROUP_RENAMED',
      metadata,
    });
  }

  async publishGroupDescriptionUpdated(groupId: string, actorId: string, metadata: { previousDescription: string | null; newDescription: string | null }): Promise<void> {
    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      systemType: 'GROUP_DESCRIPTION_UPDATED',
      metadata,
    });
  }

  async publishGroupAvatarUpdated(groupId: string, actorId: string, metadata: { previousAvatarUrl: string | null; newAvatarUrl: string | null }): Promise<void> {
    await this.publishGroupSystemMessage({
      groupId,
      actorId,
      systemType: 'GROUP_AVATAR_UPDATED',
      metadata,
    });
  }

  private async publishGroupSystemMessage(options: GroupSystemMessageOptions): Promise<void> {
    try {
      const baseMetadata: Record<string, unknown> = options.metadata ? { ...options.metadata } : {};

      const actor = await this.userRepository.findById(options.actorId);
      if (actor) {
        baseMetadata.actorName = actor.name;
        baseMetadata.actorAvatarUrl = actor.avatarUrl ?? null;
      }

      let targetUserName: string | null = null;
      if (options.targetUserId) {
        const targetUser = await this.userRepository.findById(options.targetUserId);
        if (targetUser) {
          targetUserName = targetUser.name;
          baseMetadata.targetUserName = targetUser.name;
          baseMetadata.targetUserAvatarUrl = targetUser.avatarUrl ?? null;
        }
      }

      const metadata = Object.keys(baseMetadata).length > 0 ? baseMetadata : null;

      const result = await this.messageService.sendMessage({
        senderId: options.actorId,
        groupId: options.groupId,
        type: MessageType.TEXT,
        content: null,
        systemType: options.systemType,
        metadata,
        actorId: options.actorId,
        targetUserId: options.targetUserId ?? null,
      });

      const payload = presentMessage({
        message: result.message,
        sender: actor ? { id: actor.id, name: actor.name, avatarUrl: actor.avatarUrl } : null,
        receipts: result.receipts,
        participantIds: result.participantIds,
        currentUserId: options.actorId,
        chatId: options.groupId,
      });

      if (io) {
        io.to(`group:${options.groupId}`).emit('message:new', { message: payload });
      }

      logger.info('System message published', {
        groupId: options.groupId,
        actorId: options.actorId,
        systemType: options.systemType,
        targetUserId: options.targetUserId ?? null,
        targetUserName,
      });
    } catch (error) {
      logger.error('Failed to publish system message', {
        groupId: options.groupId,
        actorId: options.actorId,
        systemType: options.systemType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
