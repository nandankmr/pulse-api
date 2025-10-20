import type { DecodedIdToken } from 'firebase-admin/auth';
import { UnauthorizedError } from '../errors/app.errors';
import { UserRepository } from '../../modules/user/user.repository';
import type { User } from '../../generated/prisma';

const userRepository = new UserRepository();

export async function resolveFirebaseUser(decoded: DecodedIdToken): Promise<User> {
  if (!decoded.uid) {
    throw new UnauthorizedError('Invalid Firebase ID token');
  }

  let user = await userRepository.findByFirebaseUid(decoded.uid);

  if (!user && decoded.email) {
    const existingByEmail = await userRepository.findByEmail(decoded.email);
    if (existingByEmail) {
      if (existingByEmail.firebaseUid && existingByEmail.firebaseUid !== decoded.uid) {
        throw new UnauthorizedError('Firebase UID mismatch for existing user');
      }

      if (!existingByEmail.firebaseUid) {
        user = await userRepository.attachFirebaseUid(existingByEmail.id, decoded.uid);
      } else {
        user = existingByEmail;
      }
    }
  }

  if (!user) {
    if (!decoded.email) {
      throw new UnauthorizedError('Firebase user email is required');
    }

    const displayName = decoded.name?.trim() || decoded.email.split('@')[0] || 'Firebase User';

    user = await userRepository.createFirebaseUser({
      firebaseUid: decoded.uid,
      email: decoded.email,
      name: displayName,
      avatarUrl: decoded.picture ?? null,
      emailVerified: decoded.email_verified ?? false,
    });
  } else if (decoded.email_verified && !user.verified) {
    user = await userRepository.markVerified(user.id);
  }

  return user;
}
