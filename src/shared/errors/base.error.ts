export abstract class BaseError extends Error {
  abstract statusCode: number;
  abstract errorCode: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
    };
  }
}
