import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema, refreshSchema, verifyEmailSchema, resendVerificationSchema, logoutSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './auth.schema';
import { ValidationError, UnauthorizedError } from '../../shared/errors/app.errors';
import { logger } from '../../shared/utils/logger';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware';

const authService = new AuthService();

function formatZodError(error: ZodError): string {
  const messages = error.issues.map((issue) => issue.message).filter(Boolean);
  return messages.length > 0 ? messages.join(', ') : 'Invalid request payload';
}

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = registerSchema.parse(req.body);
      const result = await authService.register(parsedBody);
      logger.info('User registered successfully via API', { userId: result.user.id, userEmail: result.user.email });
      res.status(201).json(result);
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

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = loginSchema.parse(req.body);
      const result = await authService.login(parsedBody);
      logger.info('User logged in successfully via API', { userId: result.user.id, userEmail: result.user.email });
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
  
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = refreshSchema.parse(req.body);
      const result = await authService.refresh(parsedBody);
      logger.info('Token refreshed successfully via API', { userId: result.user.id, deviceId: result.tokens.deviceId });
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

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = verifyEmailSchema.parse(req.body);
      const user = await authService.verifyEmail(parsedBody);
      logger.info('User email verified via API', { userId: user.id, userEmail: user.email });
      res.json({ user });
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

  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = resendVerificationSchema.parse(req.body);
      const result = await authService.resendVerification(parsedBody);
      logger.info('Verification code resent via API', { email: parsedBody.email });
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

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = logoutSchema.parse(req.body);
      const result = await authService.logout(parsedBody);
      logger.info('User logged out via API', { deviceId: parsedBody.deviceId });
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

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(parsedBody);
      logger.info('Password reset requested via API', { email: parsedBody.email });
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

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(parsedBody);
      logger.info('Password reset via API', { email: parsedBody.email });
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

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const parsedBody = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(userId, parsedBody);
      logger.info('Password changed via API', { userId });
      res.json(result);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError(formatZodError(error));
      }
      throw error;
    }
  }
}
