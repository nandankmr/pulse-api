import type { Prisma, PrismaClient, PushToken } from '../../generated/prisma';
import { prisma } from '../../shared/services/prisma.service';

export type ActivePushToken = Pick<PushToken, 'userId' | 'token'>;
export type PushTokenRecord = PushToken;

type TokenMetadata = {
  deviceId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  buildNumber?: string | null;
};

function getPushTokenDelegate(): Prisma.PushTokenDelegate {
  const client = prisma as PrismaClient;
  const delegate = client.pushToken;
  if (!delegate) {
    throw new Error('PushToken delegate not available on Prisma client');
  }
  return delegate;
}

export class PushRepository {
  async saveToken(userId: string, token: string, metadata: TokenMetadata): Promise<PushTokenRecord> {
    const pushToken = getPushTokenDelegate();
    return pushToken.upsert({
      where: { token },
      update: {
        userId,
        deviceId: metadata.deviceId ?? null,
        platform: metadata.platform ?? null,
        appVersion: metadata.appVersion ?? null,
        buildNumber: metadata.buildNumber ?? null,
        revokedAt: null,
      },
      create: {
        userId,
        token,
        deviceId: metadata.deviceId ?? null,
        platform: metadata.platform ?? null,
        appVersion: metadata.appVersion ?? null,
        buildNumber: metadata.buildNumber ?? null,
      },
    });
  }

  async findActiveTokensByUserIds(userIds: string[]): Promise<ActivePushToken[]> {
    if (userIds.length === 0) {
      return [];
    }

    const pushToken = getPushTokenDelegate();
    const records = await pushToken.findMany({
      where: {
        userId: { in: userIds },
        revokedAt: null,
      },
      select: {
        userId: true,
        token: true,
      },
    });

    return records.map((record) => ({ userId: record.userId, token: record.token }));
  }

  async findByToken(token: string): Promise<PushTokenRecord | null> {
    const pushToken = getPushTokenDelegate();
    const record = await pushToken.findUnique({ where: { token } });
    return record ?? null;
  }

  async revokeByToken(token: string): Promise<Prisma.BatchPayload> {
    const pushToken = getPushTokenDelegate();
    return pushToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByDevice(userId: string, deviceId: string): Promise<Prisma.BatchPayload> {
    const pushToken = getPushTokenDelegate();
    return pushToken.updateMany({
      where: {
        userId,
        deviceId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeManyTokens(tokens: string[]): Promise<number> {
    if (tokens.length === 0) {
      return 0;
    }

    const pushToken = getPushTokenDelegate();
    const result = await pushToken.updateMany({
      where: {
        token: { in: tokens },
      },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }
}
