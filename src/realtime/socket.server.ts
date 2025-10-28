import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Application } from 'express';
import { verify } from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

import { getRealtimeConfig } from '../config/realtime.config';
import { getAuthConfig } from '../config/env.config';
import { UnauthorizedError } from '../shared/errors/app.errors';
import { logger } from '../shared/utils/logger';
import { Message, MessageType } from '../generated/prisma';
import { MessageService } from '../modules/message/message.service';
import type { SendMessageOptions } from '../modules/message/message.service';
import { presentMessage } from '../modules/message/message.presenter';
import type { EnrichedMessagePayload } from '../modules/message/message.presenter';
import { prisma } from '../shared/services/prisma.service';
import { getFirebaseAuth } from '../shared/services/firebaseAdmin.service';
import { resolveFirebaseUser } from '../shared/services/firebaseUserResolver';

export interface SocketAuthPayload {
  userId: string;
  email?: string;
  name?: string;
}

export interface SendMessagePayload {
  senderId?: string;
  receiverId?: string;
  groupId?: string;
  conversationId?: string;
  type?: MessageType;
  content?: string | null;
  mediaUrl?: string | null;
  location?: Record<string, unknown> | null;
  tempId?: string;
}

export interface MessageDeliveryAck {
  status: 'ok' | 'error';
  error?: string;
  message?: Message;
  conversationId?: string | null;
  tempId?: string;
}

export interface MessageReadPayload {
  messageId?: string;
  messageIds?: string[];
  targetUserId?: string;
  groupId?: string;
  conversationId?: string;
  readAt?: string;
}

export interface OutgoingMessageReadPayload extends MessageReadPayload {
  readerId: string;
  readAt: string;
}

export interface TypingEventPayload {
  conversationId?: string;
  targetUserId?: string;
  groupId?: string;
}

export interface OutgoingTypingPayload extends TypingEventPayload {
  userId: string;
  userName?: string;
}

export interface GroupSubscriptionPayload {
  groupId: string;
}

export interface MessageDeliveredPayload {
  messageId: string;
  participantIds: string[];
}

export interface MessageReadConfirmedPayload {
  messageId: string;
  readerId: string;
  readAt: string;
}

export interface MessageEditPayload {
  messageId: string;
  content: string;
  conversationId?: string;
  groupId?: string;
}

export interface MessageEditedPayload {
  messageId: string;
  content: string;
  editedAt: string;
  conversationId?: string | undefined;
  groupId?: string | undefined;
}

export interface MessageDeletePayload {
  messageId: string;
  conversationId?: string;
  groupId?: string;
  deleteForEveryone?: boolean;
}

export interface MessageDeletedPayload {
  messageId: string;
  deletedBy: string;
  deletedAt: string;
  deleteForEveryone: boolean;
  conversationId?: string | undefined;
  groupId?: string | undefined;
}

export interface GroupMemberEventPayload {
  groupId: string;
  userId: string;
  addedBy?: string;
  removedBy?: string;
  role?: string;
}

export interface GroupUpdatedPayload {
  groupId: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
  updatedBy: string;
}

export interface ServerToClientEvents {
  'message:new': (_payload: { message: Message | EnrichedMessagePayload; tempId?: string }) => void;
  'message:read': (_payload: OutgoingMessageReadPayload) => void;
  'message:delivered': (_payload: MessageDeliveredPayload) => void;
  'message:read:confirmed': (_payload: MessageReadConfirmedPayload) => void;
  'message:edited': (_payload: MessageEditedPayload) => void;
  'message:deleted': (_payload: MessageDeletedPayload) => void;
  'group:member:added': (_payload: GroupMemberEventPayload) => void;
  'group:member:removed': (_payload: GroupMemberEventPayload) => void;
  'group:member:role_changed': (_payload: GroupMemberEventPayload) => void;
  'group:updated': (_payload: GroupUpdatedPayload) => void;
  'presence:update': (_payload: { userId: string; status: 'online' | 'offline' }) => void;
  'presence:state': (_payload: { onlineUserIds: string[] }) => void;
  'typing:start': (_payload: OutgoingTypingPayload) => void;
  'typing:stop': (_payload: OutgoingTypingPayload) => void;
}

export interface ClientToServerEvents {
  'message:send': (_payload: SendMessagePayload, _callback: (ack: MessageDeliveryAck) => void) => void;
  'message:read': (_payload: MessageReadPayload) => void;
  'message:edit': (_payload: MessageEditPayload) => void;
  'message:delete': (_payload: MessageDeletePayload) => void;
  'typing:start': (_payload: TypingEventPayload) => void;
  'typing:stop': (_payload: TypingEventPayload) => void;
  'group:join': (_payload: GroupSubscriptionPayload) => void;
  'group:leave': (_payload: GroupSubscriptionPayload) => void;
  'presence:subscribe': () => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user?: SocketAuthPayload;
}

export type AuthedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const messageService = new MessageService();

const onlineUsers = new Map<string, Set<string>>();

function markUserOnline(userId: string, socketId: string): boolean {
  const sockets = onlineUsers.get(userId) ?? new Set<string>();
  const wasOnline = sockets.size > 0;
  sockets.add(socketId);
  onlineUsers.set(userId, sockets);
  return !wasOnline;
}

function markUserOffline(userId: string, socketId: string): boolean {
  const sockets = onlineUsers.get(userId);
  if (!sockets) {
    return false;
  }
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }
  onlineUsers.set(userId, sockets);
  return false;
}

function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

function extractToken(socket: Socket): string | null {
  const authHeader = socket.handshake.auth?.token ?? socket.handshake.headers.authorization;

  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length);
    }
    return authHeader;
  }

  if (typeof socket.handshake.query.token === 'string') {
    return socket.handshake.query.token;
  }

  return null;
}

async function authenticateSocket(socket: Socket): Promise<SocketAuthPayload> {
  const token = extractToken(socket);
  const authConfig = getAuthConfig();

  if (!token) {
    throw new UnauthorizedError('Authentication token missing');
  }

  if (authConfig.provider === 'firebase') {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      throw new UnauthorizedError('Firebase authentication not configured');
    }

    try {
      const decoded = await firebaseAuth.verifyIdToken(token, true);
      const firebaseUser = await resolveFirebaseUser(decoded);

      return {
        userId: firebaseUser.id,
        email: firebaseUser.email ?? undefined,
        name: firebaseUser.name ?? undefined,
      };
    } catch (error) {
      logger.warn('Failed to authenticate socket with Firebase token', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  }

  try {
    const decoded = verify(token, authConfig.secret);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new UnauthorizedError('Invalid authentication token');
    }

    if (!('sub' in decoded) || typeof decoded.sub !== 'string') {
      throw new UnauthorizedError('Invalid authentication token payload');
    }

    const payload: SocketAuthPayload = {
      userId: decoded.sub,
    };

    if ('email' in decoded && typeof decoded.email === 'string') {
      payload.email = decoded.email;
    }

    if ('name' in decoded && typeof decoded.name === 'string') {
      payload.name = decoded.name;
    }

    return payload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

export function createRealtimeServer(app: Application) {
  const httpServer = createServer(app);
  const realtimeConfig = getRealtimeConfig();

  const io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> = new Server(httpServer, {
    cors: {
      origin: realtimeConfig.corsOrigins,
      credentials: true,
    },
  });

  if (realtimeConfig.redisUrl) {
    const pubClient = createClient({ url: realtimeConfig.redisUrl });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (error) => logger.error('Redis (pub) connection error', { error: error.message }));
    subClient.on('error', (error) => logger.error('Redis (sub) connection error', { error: error.message }));

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.IO Redis adapter initialized', { redisUrl: realtimeConfig.redisUrl });
      })
      .catch((error) => {
        logger.error('Failed to initialize Socket.IO Redis adapter', { error: error instanceof Error ? error.message : String(error) });
      });

    io.of('/').adapter.on('error', (error) => {
      logger.error('Socket.IO adapter error', { error: error instanceof Error ? error.message : String(error) });
    });
  }

  io.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket);
      (socket as AuthedSocket).data.user = user;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on('connection', async (socket: AuthedSocket) => {
    const user = socket.data.user;
    if (!user) {
      logger.warn('Socket connected without authenticated user context', { socketId: socket.id });
      socket.disconnect(true);
      return;
    }

    logger.info('Socket connected', { userId: user.userId, socketId: socket.id });

    socket.join(`user:${user.userId}`);

    // Auto-join all user's groups
    try {
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: user.userId },
        select: { groupId: true },
      });
      
      for (const { groupId } of userGroups) {
        socket.join(`group:${groupId}`);
      }
      
      if (userGroups.length > 0) {
        logger.info('Socket auto-joined user groups', { 
          userId: user.userId, 
          groupCount: userGroups.length,
          groupIds: userGroups.map(g => g.groupId),
        });
      }
    } catch (error) {
      logger.error('Failed to auto-join user groups', { 
        userId: user.userId, 
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const becameOnline = markUserOnline(user.userId, socket.id);
    if (becameOnline) {
      io.emit('presence:update', { userId: user.userId, status: 'online' });
    }

    socket.emit('presence:state', { onlineUserIds: getOnlineUserIds() });

    socket.on('presence:subscribe', () => {
      socket.emit('presence:state', { onlineUserIds: getOnlineUserIds() });
    });

    socket.on('group:join', ({ groupId }) => {
      if (!groupId) {
        return;
      }
      socket.join(`group:${groupId}`);
      logger.info('Socket joined group room', { userId: user.userId, groupId, socketId: socket.id });
    });

    socket.on('group:leave', ({ groupId }) => {
      if (!groupId) {
        return;
      }
      socket.leave(`group:${groupId}`);
      logger.info('Socket left group room', { userId: user.userId, groupId, socketId: socket.id });
    });

    socket.on('message:send', async (payload, callback) => {
      const safeCallback = typeof callback === 'function' ? callback : () => undefined;

      if (!payload) {
        const ack: MessageDeliveryAck = {
          status: 'error',
          error: 'Invalid payload',
        };
        safeCallback(ack);
        return;
      }

      try {
        if (!payload.receiverId && !payload.groupId) {
          const ack: MessageDeliveryAck = {
            status: 'error',
            error: 'receiverId or groupId is required',
          };
          if (payload.tempId !== undefined) {
            ack.tempId = payload.tempId;
          }
          safeCallback(ack);
          return;
        }

        const sendOptions: SendMessageOptions = {
          senderId: user.userId,
          type: payload.type ?? MessageType.TEXT,
          content: payload.content ?? null,
          mediaUrl: payload.mediaUrl ?? null,
        };

        if (payload.receiverId !== undefined) {
          sendOptions.receiverId = payload.receiverId;
        }
        if (payload.groupId !== undefined) {
          sendOptions.groupId = payload.groupId;
        }
        if (payload.conversationId !== undefined) {
          sendOptions.conversationId = payload.conversationId;
        }
        if (payload.location !== undefined) {
          sendOptions.location = payload.location;
        }

        const sendResult = await messageService.sendMessage(sendOptions);
        const { message, conversationId: resolvedConversationId, participantIds } = sendResult;

        // Enrich message with sender information
        const sender = await prisma.user.findUnique({
          where: { id: message.senderId },
          select: { id: true, name: true, avatarUrl: true },
        });

        const chatId = message.groupId ?? sendResult.conversationId ?? message.conversationId;

        const enrichedMessage = presentMessage({
          message,
          sender: sender ? { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl } : null,
          receipts: sendResult.receipts,
          participantIds,
          currentUserId: user.userId,
          chatId: chatId ?? message.id,
        });

        const deliveryPayload: Parameters<ServerToClientEvents['message:new']>[0] = payload.tempId !== undefined
          ? { message: enrichedMessage, tempId: payload.tempId }
          : { message: enrichedMessage };

        // Automatically send typing:stop when message is sent
        const typingStopPayload: OutgoingTypingPayload = {
          userId: user.userId,
          userName: user.name || 'Unknown',
        };

        if (message.groupId) {
          socket.to(`group:${message.groupId}`).emit('message:new', deliveryPayload);
          socket.emit('message:new', deliveryPayload);
          // Stop typing indicator for group
          socket.to(`group:${message.groupId}`).emit('typing:stop', { ...typingStopPayload, groupId: message.groupId });
        } else if (message.receiverId) {
          io.to(`user:${message.receiverId}`).emit('message:new', deliveryPayload);
          socket.emit('message:new', deliveryPayload);
          // Stop typing indicator for DM
          io.to(`user:${message.receiverId}`).emit('typing:stop', { ...typingStopPayload, targetUserId: message.receiverId });
        }

        const successAck: MessageDeliveryAck = {
          status: 'ok',
          message,
          conversationId: resolvedConversationId ?? null,
        };
        if (payload.tempId !== undefined) {
          successAck.tempId = payload.tempId;
        }
        safeCallback(successAck);

        const deliveredPayload: MessageDeliveredPayload = {
          messageId: message.id,
          participantIds,
        };

        participantIds
          .filter((participantId) => participantId !== user.userId)
          .forEach((participantId) => {
            io.to(`user:${participantId}`).emit('message:delivered', deliveredPayload);
          });

        socket.emit('message:delivered', deliveredPayload);
      } catch (error) {
        logger.error('Failed to send message via socket', {
          userId: user.userId,
          payload,
          error: error instanceof Error ? error.message : String(error),
        });
        const errorAck: MessageDeliveryAck = {
          status: 'error',
          error: 'Failed to send message',
        };
        if (payload?.tempId !== undefined) {
          errorAck.tempId = payload.tempId;
        }
        safeCallback(errorAck);
      }
    });

    socket.on('message:read', async (payload) => {
      if (!payload) {
        return;
      }

      try {
        // Support bulk read receipts
        if (payload.messageIds && Array.isArray(payload.messageIds) && payload.messageIds.length > 0) {
          await messageService.markMultipleMessagesRead(payload.messageIds, user.userId);
          
          const computedReadAt = payload.readAt ?? new Date().toISOString();
          const readPayload: OutgoingMessageReadPayload = {
            ...payload,
            readerId: user.userId,
            readAt: computedReadAt,
          };

          if (payload.groupId) {
            socket.to(`group:${payload.groupId}`).emit('message:read', readPayload);
            socket.emit('message:read', readPayload);
          } else if (payload.targetUserId) {
            io.to(`user:${payload.targetUserId}`).emit('message:read', readPayload);
            socket.emit('message:read', readPayload);
          }
        } else if (payload.messageId) {
          // Single message read
          const markResult = await messageService.markMessageRead(payload.messageId, user.userId);

          const computedReadAt = payload.readAt ?? markResult.receipt.updatedAt.toISOString();
          const readPayload: OutgoingMessageReadPayload = {
            ...payload,
            readerId: user.userId,
            readAt: computedReadAt,
          };

          if (payload.groupId) {
            socket.to(`group:${payload.groupId}`).emit('message:read', readPayload);
            socket.emit('message:read', readPayload);
          } else if (payload.targetUserId) {
            io.to(`user:${payload.targetUserId}`).emit('message:read', readPayload);
            socket.emit('message:read', readPayload);
          }

          const confirmationPayload: MessageReadConfirmedPayload = {
            messageId: payload.messageId,
            readerId: user.userId,
            readAt: computedReadAt,
          };

          markResult.participantIds
            .filter((participantId) => participantId !== user.userId)
            .forEach((participantId) => {
              io.to(`user:${participantId}`).emit('message:read:confirmed', confirmationPayload);
            });

          socket.emit('message:read:confirmed', confirmationPayload);
        }
      } catch (error) {
        logger.error('Failed to mark message(s) as read', {
          messageId: payload.messageId,
          messageIds: payload.messageIds,
          userId: user.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on('typing:start', (payload) => {
      if (!payload) {
        return;
      }
      const typingPayload: OutgoingTypingPayload = {
        ...payload,
        userId: user.userId,
        ...(user.name && { userName: user.name }),
      };

      if (payload.groupId) {
        socket.to(`group:${payload.groupId}`).emit('typing:start', typingPayload);
      } else if (payload.targetUserId) {
        io.to(`user:${payload.targetUserId}`).emit('typing:start', typingPayload);
      }
    });

    socket.on('typing:stop', (payload) => {
      if (!payload) {
        return;
      }
      const typingPayload: OutgoingTypingPayload = {
        ...payload,
        userId: user.userId,
        ...(user.name && { userName: user.name }),
      };

      if (payload.groupId) {
        socket.to(`group:${payload.groupId}`).emit('typing:stop', typingPayload);
      } else if (payload.targetUserId) {
        io.to(`user:${payload.targetUserId}`).emit('typing:stop', typingPayload);
      }
    });

    socket.on('message:edit', async (payload) => {
      if (!payload?.messageId || !payload?.content) {
        return;
      }

      try {
        const updatedMessage = await messageService.editMessage(payload.messageId, user.userId, payload.content);

        const editedPayload: MessageEditedPayload = {
          messageId: payload.messageId,
          content: payload.content,
          editedAt: updatedMessage.editedAt?.toISOString() ?? new Date().toISOString(),
          conversationId: payload.conversationId,
          groupId: payload.groupId,
        };

        if (payload.groupId) {
          socket.to(`group:${payload.groupId}`).emit('message:edited', editedPayload);
          socket.emit('message:edited', editedPayload);
        } else if (updatedMessage.conversationId) {
          // Broadcast to conversation participants
          const conversation = await prisma.directConversation.findUnique({
            where: { id: updatedMessage.conversationId },
          });
          if (conversation) {
            const otherUserId = conversation.userAId === user.userId ? conversation.userBId : conversation.userAId;
            io.to(`user:${otherUserId}`).emit('message:edited', editedPayload);
            socket.emit('message:edited', editedPayload);
          }
        }

        logger.info('Message edited via socket', { messageId: payload.messageId, userId: user.userId });
      } catch (error) {
        logger.error('Failed to edit message via socket', {
          messageId: payload.messageId,
          userId: user.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on('message:delete', async (payload) => {
      if (!payload?.messageId) {
        return;
      }

      try {
        const deleteForEveryone = payload.deleteForEveryone ?? false;
        const deletedMessage = await messageService.deleteMessage(payload.messageId, user.userId, deleteForEveryone);

        const deletedPayload: MessageDeletedPayload = {
          messageId: payload.messageId,
          deletedBy: user.userId,
          deletedAt: deletedMessage.deletedAt?.toISOString() ?? new Date().toISOString(),
          deleteForEveryone,
          conversationId: payload.conversationId,
          groupId: payload.groupId,
        };

        if (payload.groupId) {
          socket.to(`group:${payload.groupId}`).emit('message:deleted', deletedPayload);
          socket.emit('message:deleted', deletedPayload);
        } else if (deletedMessage.conversationId) {
          // Broadcast to conversation participants
          const conversation = await prisma.directConversation.findUnique({
            where: { id: deletedMessage.conversationId },
          });
          if (conversation) {
            const otherUserId = conversation.userAId === user.userId ? conversation.userBId : conversation.userAId;
            io.to(`user:${otherUserId}`).emit('message:deleted', deletedPayload);
            socket.emit('message:deleted', deletedPayload);
          }
        }

        logger.info('Message deleted via socket', { messageId: payload.messageId, userId: user.userId, deleteForEveryone });
      } catch (error) {
        logger.error('Failed to delete message via socket', {
          messageId: payload.messageId,
          userId: user.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { userId: user.userId, socketId: socket.id, reason });

      const becameOffline = markUserOffline(user.userId, socket.id);
      if (becameOffline) {
        io.emit('presence:update', { userId: user.userId, status: 'offline' });
      }
    });
  });

  return { httpServer, io };
}
