import { StatusCodes, getReasonPhrase } from "http-status-codes";
import ShortUniqueId from "short-unique-id";
import { Response } from "express";

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

export const BadRequestError = (message: string) =>
  new ErrorWithStatusCode(StatusCodes.BAD_REQUEST, message);

export const UnauthorizedError = () =>
  new ErrorWithStatusCode(StatusCodes.UNAUTHORIZED);

export function renderFido2ServerErrorResponse(
  res: Response,
  statusCode: StatusCodes,
  message: string
) {
  const response = {
    status: "failed",
    errorMessage: message,
  };
  return res.status(statusCode).json(response);
}
