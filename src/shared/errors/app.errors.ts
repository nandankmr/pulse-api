import { BaseError } from './base.error';

export class AppError extends BaseError {
  statusCode: number;
  errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

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
  data?: any;
  
  constructor(message: string, data?: any) {
    super(message);
    this.data = data;
  }

  toJSON() {
    const json: any = {
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
    };
    if (this.data) {
      json.data = this.data;
    }
    return json;
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict occurred') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class InternalServerError extends BaseError {
  statusCode = 500;
  errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message: string = 'Internal server error') {
    super(message);
  }
}
