// Environment configuration without zod for now
// TODO: Install zod and uncomment the proper validation
// import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Type definitions for environment variables
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  MAIL_FROM: string;
  APP_URL: string;
  USER_AVATAR_STORAGE_PATH: string;
  ATTACHMENT_BASE_PATH: string;
  SENTRY_DSN?: string;
  NEW_RELIC_LICENSE_KEY?: string;
  API_VERSION: string;
  API_PREFIX: string;
  CACHE_TTL: number;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

/**
 * Get environment variable with default value and type conversion
 */
function getEnvVar(key: keyof EnvironmentConfig, defaultValue: string, converter?: (value: string) => any): any {
  const value = process.env[key] || defaultValue;
  return converter ? converter(value) : value;
}

/**
 * Validates and parses environment variables
 */
function validateEnvironment(): EnvironmentConfig {
  try {
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
    const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    const config: EnvironmentConfig = {
      NODE_ENV: getEnvVar('NODE_ENV', 'development') as EnvironmentConfig['NODE_ENV'],
      PORT: getEnvVar('PORT', '3000', Number),
      DATABASE_URL: getEnvVar('DATABASE_URL', 'file:./dev.db'),
      LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info') as EnvironmentConfig['LOG_LEVEL'],
      JWT_SECRET: getEnvVar('JWT_SECRET', 'your-super-secret-jwt-key-at-least-32-characters-long'),
      JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '24h'),
      JWT_REFRESH_EXPIRES_IN: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
      SMTP_HOST: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
      SMTP_PORT: getEnvVar('SMTP_PORT', '587', Number),
      SMTP_USER: getEnvVar('SMTP_USER', ''),
      SMTP_PASSWORD: getEnvVar('SMTP_PASSWORD', ''),
      MAIL_FROM: getEnvVar('MAIL_FROM', 'noreply@pulse-api.com'),
      APP_URL: getEnvVar('APP_URL', 'http://localhost:3000'),
      USER_AVATAR_STORAGE_PATH: getEnvVar('USER_AVATAR_STORAGE_PATH', './storage/avatars'),
      ATTACHMENT_BASE_PATH: getEnvVar('ATTACHMENT_BASE_PATH', '/api/attachments'),
      API_VERSION: getEnvVar('API_VERSION', 'v1'),
      API_PREFIX: getEnvVar('API_PREFIX', '/api'),
      CACHE_TTL: getEnvVar('CACHE_TTL', '300', Number),
      ...(firebaseProjectId ? { FIREBASE_PROJECT_ID: firebaseProjectId } : {}),
      ...(firebaseClientEmail ? { FIREBASE_CLIENT_EMAIL: firebaseClientEmail } : {}),
      ...(firebasePrivateKey ? { FIREBASE_PRIVATE_KEY: firebasePrivateKey } : {}),
    };

    // Basic validation
    if (config.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    if (!config.DATABASE_URL.startsWith('file:') && !config.DATABASE_URL.startsWith('postgres:')) {
      throw new Error('DATABASE_URL must be a valid SQLite file path or PostgreSQL connection string');
    }

    if ((config.FIREBASE_PROJECT_ID || config.FIREBASE_CLIENT_EMAIL || config.FIREBASE_PRIVATE_KEY) && (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL || !config.FIREBASE_PRIVATE_KEY)) {
      console.warn('Incomplete Firebase configuration detected. Push notifications will be disabled.');
    }

    return config;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Environment validation failed: ${err.message}`);
  }
}

/**
 * Validated environment configuration
 */
export const config = validateEnvironment();

/**
 * Environment helpers
 */
export const isDevelopment = config.NODE_ENV === 'development';
export const isStaging = config.NODE_ENV === 'staging';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

/**
 * Get database URL for Prisma (handle query parameters)
 */
export function getDatabaseUrl(): string {
  return config.DATABASE_URL;
}

/**
 * Get server configuration
 */
export function getServerConfig() {
  return {
    port: config.PORT,
    env: config.NODE_ENV,
    apiVersion: config.API_VERSION,
    apiPrefix: config.API_PREFIX,
  };
}

export function getAuthConfig() {
  return {
    accessTokenTtl: config.JWT_EXPIRES_IN,
    refreshTokenTtl: config.JWT_REFRESH_EXPIRES_IN,
    secret: config.JWT_SECRET,
  };
}

export function getMailConfig() {
  return {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    user: config.SMTP_USER,
    password: config.SMTP_PASSWORD,
    from: config.MAIL_FROM,
  };
}

export function getAppUrl(): string {
  return config.APP_URL;
}

export function getStorageConfig() {
  return {
    avatarPath: config.USER_AVATAR_STORAGE_PATH,
  };
}

/**
 * Get logging configuration
 */
export function getLoggingConfig() {
  return {
    level: config.LOG_LEVEL,
    isDevelopment: isDevelopment,
  };
}

/**
 * Get cache configuration
 */
export function getCacheConfig() {
  return {
    ttl: config.CACHE_TTL,
  };
}

export function getFirebaseConfig() {
  if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL || !config.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  return {
    projectId: config.FIREBASE_PROJECT_ID,
    clientEmail: config.FIREBASE_CLIENT_EMAIL,
    privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

// Legacy config for backward compatibility
export const legacyConfig = {
  port: config.PORT,
  databaseUrl: config.DATABASE_URL,
  jwtSecret: config.JWT_SECRET,
};

export default config;

export type Config = EnvironmentConfig;
