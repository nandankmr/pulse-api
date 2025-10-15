export interface RealtimeConfig {
  corsOrigins: string | string[];
  redisUrl?: string;
}

function parseCorsOrigins(value: string | undefined): string | string[] {
  if (!value || value.trim() === '') {
    // In production, allow all origins if not specified
    // In development, use specific localhost origins
    if (process.env.NODE_ENV === 'production') {
      return '*'; // Allow all origins in production
    }
    
    // Default origins for development (includes Android emulator)
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
      'http://10.0.2.2:3000',
      'http://10.0.2.2:8081',
    ];
  }

  const origins = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return origins.length === 0 ? '*' : origins;
}

export function getRealtimeConfig(): RealtimeConfig {
  const config: RealtimeConfig = {
    corsOrigins: parseCorsOrigins(process.env.SOCKET_CORS_ORIGINS),
  };

  const redisUrl = process.env.SOCKET_REDIS_URL ?? process.env.REDIS_URL;
  if (redisUrl && redisUrl.trim().length > 0) {
    config.redisUrl = redisUrl;
  }

  return config;
}
