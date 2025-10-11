// Environment configuration without zod for now
// TODO: Install zod and uncomment the proper validation
// import { z } from 'zod';
// import dotenv from 'dotenv';

// Load environment variables from .env file
// dotenv.config();

// Type definitions for environment variables
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  SENTRY_DSN?: string;
  NEW_RELIC_LICENSE_KEY?: string;
  API_VERSION: string;
  API_PREFIX: string;
  CACHE_TTL: number;
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
    const config: EnvironmentConfig = {
      NODE_ENV: getEnvVar('NODE_ENV', 'development') as EnvironmentConfig['NODE_ENV'],
      PORT: getEnvVar('PORT', '3000', Number),
      DATABASE_URL: getEnvVar('DATABASE_URL', 'file:./dev.db'),
      LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info') as EnvironmentConfig['LOG_LEVEL'],
      JWT_SECRET: getEnvVar('JWT_SECRET', 'your-super-secret-jwt-key-at-least-32-characters-long'),
      JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '24h'),
      API_VERSION: getEnvVar('API_VERSION', 'v1'),
      API_PREFIX: getEnvVar('API_PREFIX', '/api'),
      CACHE_TTL: getEnvVar('CACHE_TTL', '300', Number),
    };

    // Basic validation
    if (config.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    if (!config.DATABASE_URL.startsWith('file:') && !config.DATABASE_URL.startsWith('postgresql:')) {
      throw new Error('DATABASE_URL must be a valid SQLite file path or PostgreSQL connection string');
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

// Legacy config for backward compatibility
export const legacyConfig = {
  port: config.PORT,
  databaseUrl: config.DATABASE_URL,
  jwtSecret: config.JWT_SECRET,
};

export default config;

export type Config = EnvironmentConfig;
