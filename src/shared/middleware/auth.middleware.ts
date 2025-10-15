/// <reference types="multer" />
import { Request, Response, NextFunction } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';
import { getAuthConfig } from '../../config/env.config';
import { UnauthorizedError } from '../errors/app.errors';

const authConfig = getAuthConfig();

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token required');
  }

  const token = header.slice('Bearer '.length).trim();

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
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}
