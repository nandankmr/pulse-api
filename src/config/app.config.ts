import { config as envConfig } from './env.config';
import { logger } from '../shared/utils/logger';

// Validate configuration on startup
try {
  logger.info('Environment configuration loaded successfully', {
    nodeEnv: envConfig.NODE_ENV,
    port: envConfig.PORT,
    logLevel: envConfig.LOG_LEVEL,
  });
} catch (error) {
  logger.error('Failed to load environment configuration', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
}

export { legacyConfig } from './env.config';
export { config } from './env.config';
