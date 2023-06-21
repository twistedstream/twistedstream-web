import { Response } from "express";
import { StatusCodes } from "http-status-codes";

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
