import nodemailer from 'nodemailer';
import { getMailConfig } from '../../config/env.config';
import { logger } from '../utils/logger';

const mailConfig = getMailConfig();

const transporter = nodemailer.createTransport({
  host: mailConfig.host,
  port: mailConfig.port,
  secure: mailConfig.port === 465,
  auth: mailConfig.user
    ? {
        user: mailConfig.user,
        pass: mailConfig.password,
      }
    : undefined,
  // Add connection timeout and socket timeout to prevent hanging
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 30000,     // 30 seconds
});

export async function sendMail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const mailOptions = {
    from: mailConfig.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { to: options.to, subject: options.subject });
  } catch (error) {
    logger.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
