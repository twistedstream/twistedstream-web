import { StatusCodes, getReasonPhrase } from "http-status-codes";
import ShortUniqueId from "short-unique-id";

const uid = new ShortUniqueId({ length: 25 });

export const generateCorrelationId = (): string => {
  return uid();
};

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
