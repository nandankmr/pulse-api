import { Request, Response, NextFunction } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';
import { getAuthConfig } from '../../config/env.config';
import { getFirebaseAuth } from '../services/firebaseAdmin.service';
import { UnauthorizedError } from '../errors/app.errors';
import { resolveFirebaseUser } from '../services/firebaseUserResolver';

const authConfig = getAuthConfig();

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token required'));
  }

  const token = header.slice('Bearer '.length).trim();

  const isFirebaseProvider = authConfig.provider === 'firebase';

  if (isFirebaseProvider) {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      return next(new UnauthorizedError('Firebase authentication not configured'));
    }

    try {
      const decoded = await firebaseAuth.verifyIdToken(token, true);
      const authenticatedUser = await resolveFirebaseUser(decoded);
      (req as AuthenticatedRequest).user = authenticatedUser;
      return next();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return next(
        new UnauthorizedError(
          `Invalid or expired Firebase authentication token: ${message}`
        )
      );
    }
  }

  try {
    const decoded = verify(token, authConfig.secret);
    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Invalid authentication token');
    }

    const payload = decoded as JwtPayload & { email?: string };

    if (!payload.sub) {
      throw new UnauthorizedError('Invalid authentication token');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: String(payload.sub),
    };

    if (typeof payload.email === 'string') {
      authenticatedUser.email = payload.email;
    }

    (req as AuthenticatedRequest).user = authenticatedUser;

    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}
