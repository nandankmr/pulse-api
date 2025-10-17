import admin from 'firebase-admin';
import { logger } from '../../shared/utils/logger';
import { getFirebaseConfig } from '../../config/env.config';

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

export interface MulticastPayload {
  tokens: string[];
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

export interface FcmSendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

export class FcmService {
  private initialized = false;
  private disabled = false;

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    const firebaseConfig = getFirebaseConfig();
    this.initialized = true;

    if (!firebaseConfig) {
      this.disabled = true;
      logger.warn('FCM configuration missing. Push notifications are disabled.');
      return;
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      });
      logger.info('Firebase Admin SDK initialized for push notifications');
    }
  }

  private getMessaging(): admin.messaging.Messaging | null {
    this.ensureInitialized();
    if (this.disabled) {
      return null;
    }

    try {
      return admin.messaging();
    } catch (error) {
      logger.error('Failed to obtain Firebase messaging instance', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async sendMulticast(payload: MulticastPayload): Promise<FcmSendResult> {
    if (!payload.tokens || payload.tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    const messaging = this.getMessaging();
    if (!messaging) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: payload.tokens,
        notification: payload.notification,
        data: payload.data || {},
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              'content-available': 1,
            },
          },
        },
      });

      const invalidTokens = response.responses.reduce<string[]>((acc, item, index) => {
        if (!item.success && item.error && INVALID_TOKEN_ERROR_CODES.has(item.error.code)) {
          acc.push(payload.tokens[index] || '');
        }
        return acc;
      }, []);

      if (invalidTokens.length > 0) {
        logger.warn('Detected invalid FCM tokens', { count: invalidTokens.length });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      logger.error('Failed to send push notification via FCM', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { successCount: 0, failureCount: payload.tokens.length, invalidTokens: [] };
    }
  }
}
