import { StatusCodes, getReasonPhrase } from "http-status-codes";

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
