import { StatusCodes, getReasonPhrase } from "http-status-codes";
import ShortUniqueId from "short-unique-id";

type ErrorHandlerData = {
  message: string;
  statusCode: number;
  correlation_id?: string;
};

const uid = new ShortUniqueId({ length: 25 });

export class ErrorWithStatusCode extends Error {
  constructor(
    statusCode: StatusCodes,
    message: string | undefined = undefined
  ) {
    super(getReasonPhrase(statusCode) + (message ? `: ${message}` : ""));

    this.statusCode = statusCode;
  }

  readonly statusCode: StatusCodes;
}

export const NotFoundError = () =>
  new ErrorWithStatusCode(StatusCodes.NOT_FOUND);

export const BadRequestError = (message: string) =>
  new ErrorWithStatusCode(StatusCodes.BAD_REQUEST, message);

export const UnauthorizedError = () =>
  new ErrorWithStatusCode(StatusCodes.UNAUTHORIZED);

export const ForbiddenError = (message: string) =>
  new ErrorWithStatusCode(StatusCodes.FORBIDDEN, message);

export function assertValue<T>(value: T | undefined | null): T {
  if (value === undefined) {
    throw new Error("Unexpected undefined value");
  }
  if (value === null) {
    throw new Error("Unexpected null value");
  }

  return value;
}

export function buildErrorHandlerData(err: any): ErrorHandlerData {
  const statusCode: StatusCodes =
    err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;

  const message =
    statusCode < StatusCodes.INTERNAL_SERVER_ERROR
      ? <string>err.message
      : "Something unexpected happened";

  let correlation_id: string | undefined;
  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    correlation_id = uid();
  }

  return {
    message,
    statusCode,
    correlation_id,
  };
}
