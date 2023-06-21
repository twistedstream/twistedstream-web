export class ValidationError extends Error {
  constructor(type: string, field: string, message: string) {
    super(`${type}: ${field}: ${message}`);
  }
}
