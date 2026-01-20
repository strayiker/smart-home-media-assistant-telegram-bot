export class DomainError extends Error {
  public readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default DomainError;
