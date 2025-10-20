import admin from 'firebase-admin';
import { getFirebaseConfig } from '../../config/env.config';
import { logger } from '../utils/logger';

let initialized = false;
let disabled = false;

function ensureInitialized(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  const firebaseConfig = getFirebaseConfig();
  if (!firebaseConfig) {
    disabled = true;
    logger.warn('Firebase configuration missing. Firebase auth features are disabled.');
    return;
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
    logger.info('Firebase Admin SDK initialized.');
  }
}

export function getFirebaseAuth(): admin.auth.Auth | null {
  ensureInitialized();

  if (disabled) {
    return null;
  }

  try {
    return admin.auth();
  } catch (error) {
    logger.error('Failed to obtain Firebase auth instance', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
