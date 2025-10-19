import type { Message, MessageType, SystemMessageType } from '../../generated/prisma';
import type { MessageReceipt } from './message.repository';

export interface AttachmentPresenter {
  id: string;
  type: string;
  url: string;
  name?: string;
  latitude?: number;
  longitude?: number;
}

export interface EnrichedMessagePayload {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string | null;
  timestamp: string;
  isRead: boolean;
  isSent: boolean;
  type: MessageType;
  attachments: AttachmentPresenter[];
  replyTo: string | null;
  deliveredTo: string[];
  readBy: string[];
  participantIds: string[];
  editedAt?: string | null;
  deletedAt?: string | null;
  systemType?: SystemMessageType | null;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
  targetUserId?: string | null;
}

interface PresentMessageOptions {
  message: Message;
  sender?: { id: string; name?: string | null; avatarUrl?: string | null } | null;
  receipts?: MessageReceipt[];
  participantIds?: string[];
  currentUserId: string;
  chatId: string;
}

type LocationData = {
  latitude: number;
  longitude: number;
};

const extractLocationData = (location: Message['location']): LocationData | null => {
  if (!location || typeof location === 'string') {
    return null;
  }

  if (Array.isArray(location)) {
    return null;
  }

  const candidate = location as Record<string, unknown>;
  const latitude = typeof candidate.latitude === 'number' ? candidate.latitude : undefined;
  const longitude = typeof candidate.longitude === 'number' ? candidate.longitude : undefined;

  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  return { latitude, longitude };
};

const buildLocationAttachment = (messageId: string, location: Message['location']): AttachmentPresenter[] => {
  const locationData = extractLocationData(location);
  if (!locationData) {
    return [];
  }

  return [
    {
      id: `loc_${messageId}`,
      type: 'location',
      url: '',
      latitude: locationData.latitude,
      longitude: locationData.longitude,
    },
  ];
};

const buildMediaAttachment = (messageId: string, type: MessageType, mediaUrl: string | null): AttachmentPresenter[] => {
  if (!mediaUrl) {
    return [];
  }

  const normalizedType = type.toLowerCase() as Lowercase<MessageType>;

  return [
    {
      id: `media_${messageId}`,
      type: normalizedType,
      url: mediaUrl,
      name: `${normalizedType}_${messageId}`,
    },
  ];
};

const normalizeMetadata = (metadata: Message['metadata']): Record<string, unknown> | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
};

export const presentMessage = (options: PresentMessageOptions): EnrichedMessagePayload => {
  const { message, sender = null, receipts = [], participantIds = [], currentUserId, chatId } = options;

  const locationAttachment = buildLocationAttachment(message.id, message.location ?? null);
  const mediaAttachment = buildMediaAttachment(message.id, message.type, message.mediaUrl ?? null);
  const metadata = normalizeMetadata(message.metadata ?? null);

  const deliveredToSet = new Set<string>();
  const readBySet = new Set<string>();

  for (const receipt of receipts) {
    if (receipt.status === 'DELIVERED' || receipt.status === 'READ') {
      deliveredToSet.add(receipt.userId);
    }
    if (receipt.status === 'READ') {
      readBySet.add(receipt.userId);
    }
  }

  const deliveredTo = Array.from(deliveredToSet);
  const readBy = Array.from(readBySet);

  const isOwnMessage = message.senderId === currentUserId;
  const isRead = isOwnMessage || readBy.includes(currentUserId);
  const senderName = sender?.name ?? (isOwnMessage ? 'You' : 'Unknown');
  const senderAvatar = sender?.avatarUrl ?? null;
  const content = message.content ?? null;

  return {
    id: message.id,
    chatId,
    senderId: message.senderId,
    senderName,
    senderAvatar,
    content,
    timestamp: message.createdAt.toISOString(),
    isRead,
    isSent: true,
    type: message.type,
    attachments: [...mediaAttachment, ...locationAttachment],
    replyTo: null,
    deliveredTo,
    readBy,
    participantIds: Array.from(new Set(participantIds)),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
    systemType: message.systemType ?? null,
    metadata,
    actorId: message.actorId ?? null,
    targetUserId: message.targetUserId ?? null,
  };
};
