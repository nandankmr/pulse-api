import { BaseError } from './base.error';

export class NotFoundError extends BaseError {
  statusCode = 404;
  errorCode = 'NOT_FOUND';

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

export class ValidationError extends BaseError {
  statusCode = 400;
  errorCode = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}

export class ConflictError extends BaseError {
  statusCode = 409;
  errorCode = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

export class InternalServerError extends BaseError {
  statusCode = 500;
  errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message: string = 'Internal server error') {
    super(message);
  }
}
