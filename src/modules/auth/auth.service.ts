import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { User } from '../../generated/prisma';
import { UserRepository } from '../user/user.repository';
import { prisma } from '../../shared/services/prisma.service';
import { hashPassword, comparePassword } from '../../shared/utils/password';
import { getAuthConfig, getAppUrl } from '../../config/env.config';
import { ConflictError, UnauthorizedError, ValidationError, NotFoundError } from '../../shared/errors/app.errors';
import { RegisterInput, LoginInput, RefreshInput, VerifyEmailInput, ResendVerificationInput, LogoutInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput } from './auth.schema';
import { logger } from '../../shared/utils/logger';
import { generateOtp } from '../../shared/utils/otp';
import { sendMail } from '../../shared/services/mail.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
}

interface AuthResponse {
  user: Omit<User, 'password'>;
  tokens: AuthTokens;
}

type DeviceContext = {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
};

export class AuthService {
  private userRepository = new UserRepository();
  private authConfig = getAuthConfig();
  private static readonly DEFAULT_PLATFORM = 'unknown';

  private buildDeviceContext(context: { deviceId?: string | null; deviceName?: string | null; platform?: string | null }): DeviceContext {
    const cleaned: DeviceContext = {};
    if (context.deviceId) cleaned.deviceId = context.deviceId;
    if (context.deviceName) cleaned.deviceName = context.deviceName;
    if (context.platform) cleaned.platform = context.platform;
    return cleaned;
  }

  private parseExpiresIn(ttl: string): number {
    const trimmed = ttl.trim();
    const match = trimmed.match(/^(\d+)([smhd])?$/i);
    if (!match) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : 3600;
    }

    const value = Number(match[1]);
    const unit = (match[2] || 's').toLowerCase();
    const unitMultipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (unitMultipliers[unit] ?? 1);
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    const hashedPassword = await hashPassword(input.password);
    const user = await this.userRepository.save({
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    const deviceContext = this.buildDeviceContext({
      deviceId: input.deviceId ?? null,
      deviceName: input.deviceName ?? null,
      platform: input.platform ?? null,
    });
    await this.createVerificationToken(user.id, user.email);

    const tokens = await this.issueTokens(user, deviceContext);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user || !user.password) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await comparePassword(input.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const deviceContext = this.buildDeviceContext({
      deviceId: input.deviceId ?? null,
      deviceName: input.deviceName ?? null,
      platform: input.platform ?? null,
    });
    const tokens = await this.issueTokens(user, deviceContext);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refresh(input: RefreshInput): Promise<AuthResponse> {
    let payload: JwtPayload & { type?: string;deviceId?: string };
    try {
      const decoded = verify(input.refreshToken, this.authConfig.secret);
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Invalid refresh token payload');
      }
      payload = decoded as JwtPayload & { type?: string;deviceId?: string };
    } catch (error) {
      logger.warn('Failed to verify refresh token', { error: error instanceof Error ? error.message : String(error) });
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const deviceId = input.deviceId ?? payload.deviceId ?? null;
    if (!deviceId) {
      throw new UnauthorizedError('Device context missing for refresh');
    }

    const user = await this.userRepository.findById(payload.sub as string);
    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const session = await prisma.deviceSession.findFirst({
      where: {
        userId: user.id,
        deviceId,
      },
    });

    if (!session || !session.token) {
      throw new UnauthorizedError('Invalid refresh session');
    }

    const isRefreshValid = await comparePassword(input.refreshToken, session.token);
    if (!isRefreshValid) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const deviceContext = this.buildDeviceContext({
      deviceId,
      platform: session.platform ?? null,
    });
    const tokens = await this.issueTokens(user, deviceContext);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async verifyEmail(input: VerifyEmailInput): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new NotFoundError('User');
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        token: input.otp,
        type: 'EMAIL_VERIFICATION',
      },
    });

    if (!record) {
      throw new ValidationError('Invalid verification code');
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      throw new ValidationError('Verification code has expired');
    }

    const verifiedUser = await this.userRepository.markVerified(user.id);
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    logger.info('User email verified successfully', { userId: user.id, email: user.email });
    return this.sanitizeUser(verifiedUser);
  }

  private async issueTokens(user: User, options: DeviceContext = {}): Promise<AuthTokens> {
    const deviceId = options.deviceId ?? randomUUID();

    const accessExpiresIn = this.parseExpiresIn(this.authConfig.accessTokenTtl);
    const refreshExpiresIn = this.parseExpiresIn(this.authConfig.refreshTokenTtl);

    const accessToken = sign(
      {
        sub: user.id,
        email: user.email,
      },
      this.authConfig.secret,
      { expiresIn: accessExpiresIn }
    );

    const refreshToken = sign(
      {
        sub: user.id,
        type: 'refresh',
        deviceId,
      },
      this.authConfig.secret,
      { expiresIn: refreshExpiresIn }
    );

    const refreshTokenHash = await hashPassword(refreshToken);

    const existingSession = await prisma.deviceSession.findFirst({
      where: {
        userId: user.id,
        deviceId,
      },
    });

    if (existingSession) {
      await prisma.deviceSession.update({
        where: { id: existingSession.id },
        data: {
          token: refreshTokenHash,
          lastActive: new Date(),
          platform: options.platform ?? existingSession.platform ?? AuthService.DEFAULT_PLATFORM,
        },
      });
    } else {
      await prisma.deviceSession.create({
        data: {
          userId: user.id,
          deviceId,
          platform: options.platform ?? AuthService.DEFAULT_PLATFORM,
          token: refreshTokenHash,
        },
      });
    }

    return {
      accessToken,
      refreshToken,
      deviceId,
    };
  }

  private async createVerificationToken(userId: string, email: string): Promise<void> {
    await prisma.verificationToken.deleteMany({
      where: {
        userId,
        type: 'EMAIL_VERIFICATION',
      },
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        userId,
        token: otp,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    const appUrl = getAppUrl();
    const verificationUrl = `${appUrl}/verify-email?email=${encodeURIComponent(email)}`;

    const emailHtml = `
      <p>Hi there,</p>
      <p>Your Pulse verification code is:</p>
      <h2 style="font-size: 24px; letter-spacing: 4px;">${otp}</h2>
      <p>This code will expire in 10 minutes. Enter it in the app to verify your email.</p>
      <p>If you did not create an account, you can ignore this email.</p>
      <p>Or <a href="${verificationUrl}">open the verification screen</a>.</p>
    `;

    await sendMail({
      to: email,
      subject: 'Verify your Pulse account',
      html: emailHtml,
      text: `Your Pulse verification code is ${otp}. It expires in 10 minutes.`,
    });

    logger.info('Verification OTP sent', { userId, email });
  }

  async resendVerification(input: ResendVerificationInput): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.verified) {
      throw new ValidationError('Email is already verified');
    }

    await this.createVerificationToken(user.id, user.email);
    return { message: 'Verification code sent' };
  }

  async logout(input: LogoutInput): Promise<{ message: string }> {
    const session = await prisma.deviceSession.findFirst({
      where: {
        deviceId: input.deviceId,
      },
    });

    if (!session) {
      // Session doesn't exist - user is already logged out
      logger.info('Logout attempted but session not found', { deviceId: input.deviceId });
      return { message: 'Logged out successfully' };
    }

    // Validate refresh token if session exists
    const isRefreshValid = await comparePassword(input.refreshToken, session.token ?? '');
    if (!isRefreshValid) {
      // Token is invalid, but still delete the session to ensure logout
      logger.warn('Logout with invalid refresh token - deleting session anyway', { 
        deviceId: input.deviceId,
        userId: session.userId 
      });
      await prisma.deviceSession.delete({
        where: { id: session.id },
      });
      return { message: 'Logged out successfully' };
    }

    // Valid token - delete session normally
    await prisma.deviceSession.delete({
      where: { id: session.id },
    });

    logger.info('User logged out successfully', { userId: session.userId, deviceId: input.deviceId });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      return { message: 'If the email exists, a password reset code has been sent' };
    }

    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: otp,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    const emailHtml = `
      <p>Hi ${user.name},</p>
      <p>You requested to reset your Pulse password. Your reset code is:</p>
      <h2 style="font-size: 24px; letter-spacing: 4px;">${otp}</h2>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    `;

    await sendMail({
      to: user.email,
      subject: 'Reset your Pulse password',
      html: emailHtml,
      text: `Your Pulse password reset code is ${otp}. It expires in 10 minutes.`,
    });

    logger.info('Password reset OTP sent', { userId: user.id, email: user.email });
    return { message: 'If the email exists, a password reset code has been sent' };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new ValidationError('Invalid reset code or email');
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        token: input.otp,
        type: 'PASSWORD_RESET',
      },
    });

    if (!record) {
      throw new ValidationError('Invalid reset code');
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      throw new ValidationError('Reset code has expired');
    }

    const hashedPassword = await hashPassword(input.newPassword);
    await this.userRepository.updatePassword(user.id, hashedPassword);

    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    await prisma.deviceSession.deleteMany({
      where: { userId: user.id },
    });

    logger.info('Password reset successfully', { userId: user.id, email: user.email });
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.password) {
      throw new NotFoundError('User');
    }

    const isMatch = await comparePassword(input.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(input.newPassword);
    await this.userRepository.updatePassword(user.id, hashedPassword);

    logger.info('Password changed successfully', { userId: user.id });
    return { message: 'Password changed successfully' };
  }
}
