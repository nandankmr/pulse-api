import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../errors/base.error';
import { InternalServerError } from '../errors/app.errors';
import { monitoring } from '../services/monitoring.service';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Capture error in monitoring service
  monitoring.captureException({
    error,
    request: {
      url: req.originalUrl,
      method: req.method,
      ...(req.get('User-Agent') && { userAgent: req.get('User-Agent') }),
      ...(req.ip && { ip: req.ip }),
    },
    tags: {
      errorType: error.constructor.name,
      endpoint: req.route?.path || req.path,
      method: req.method,
    },
    extra: {
      query: req.query,
      params: req.params,
      body: req.method !== 'GET' ? req.body : undefined,
      headers: req.headers,
    },
  });

  if (error instanceof BaseError) {
    logger.warn('Handled application error', {
      error: error.message,
      statusCode: error.statusCode,
    });
    res.status(error.statusCode).json(error.toJSON());
  } else {
    logger.error('Unhandled error occurred', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });
    const internalError = new InternalServerError();
    res.status(internalError.statusCode).json(internalError.toJSON());
  }
};
