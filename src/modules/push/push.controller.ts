import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { PushService } from './push.service';
import { registerPushTokenSchema, unregisterPushTokenSchema } from './push.schema';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app.errors';

const pushService = new PushService();

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(', ') || 'Invalid payload';
}

export class PushController {
  async register(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const payload = registerPushTokenSchema.parse(req.body);
      const result = await pushService.registerToken(userId, payload);
      res.status(201).json({ token: result.token, deviceId: result.deviceId, platform: result.platform });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError(formatZodError(error));
      }
      throw error;
    }
  }

  async unregister(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const payload = unregisterPushTokenSchema.parse(req.body);
      const result = await pushService.unregisterToken(userId, payload);
      res.json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError(formatZodError(error));
      }
      throw error;
    }
  }
}
