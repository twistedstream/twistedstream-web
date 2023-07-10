export class ValidationError extends Error {
  constructor(entity: string, field: string, message: string) {
    super(`${entity}: ${field}: ${message}`);
  }

  readonly type: string = "validation";
}
