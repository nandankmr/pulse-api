import { MessageType } from '../../src/generated/prisma';
import type { Message } from '../../src/generated/prisma';
import { PushService } from '../../src/modules/push/push.service';

const baseMessage: Message = {
  id: 'msg-1',
  senderId: 'user-sender',
  receiverId: 'user-recipient',
  groupId: null,
  conversationId: 'conv-1',
  type: MessageType.TEXT,
  content: 'Hello there',
  mediaUrl: null,
  location: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
};

describe('PushService.notifyNewMessage', () => {
  it('skips sending when no recipient tokens are found', async () => {
    const repository = {
      findActiveTokensByUserIds: jest.fn().mockResolvedValue([]),
      revokeManyTokens: jest.fn(),
    } as any;
    const fcmService = {
      sendMulticast: jest.fn(),
    } as any;
    const userRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user-sender', name: 'Sender' }),
    } as any;

    const pushService = new PushService(repository, fcmService, userRepository);

    await pushService.notifyNewMessage({
      senderId: 'user-sender',
      recipientIds: ['user-sender'],
      message: baseMessage,
      conversationId: 'conv-1',
    });

    expect(repository.findActiveTokensByUserIds).not.toHaveBeenCalled();
    expect(fcmService.sendMulticast).not.toHaveBeenCalled();
  });

  it('sends notifications to recipients and revokes invalid tokens', async () => {
    const repository = {
      findActiveTokensByUserIds: jest.fn().mockResolvedValue([
        { userId: 'user-recipient', token: 'token-123' },
      ]),
      revokeManyTokens: jest.fn().mockResolvedValue(1),
    } as any;
    const fcmService = {
      sendMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        invalidTokens: ['token-123'],
      }),
    } as any;
    const userRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user-sender', name: 'Sender User' }),
    } as any;

    const pushService = new PushService(repository, fcmService, userRepository);

    await pushService.notifyNewMessage({
      senderId: 'user-sender',
      recipientIds: ['user-sender', 'user-recipient'],
      message: baseMessage,
      conversationId: 'conv-1',
    });

    expect(repository.findActiveTokensByUserIds).toHaveBeenCalledWith(['user-recipient']);
    expect(fcmService.sendMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['token-123'],
        notification: expect.objectContaining({ title: 'Sender User' }),
      }),
    );
    expect(repository.revokeManyTokens).toHaveBeenCalledWith(['token-123']);
  });
});
