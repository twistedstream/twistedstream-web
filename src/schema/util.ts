import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ServerResponse } from "./fido2-server";
import { TSchema } from "@sinclair/typebox";
import { TypeCompiler, ValueError } from "@sinclair/typebox/compiler";

export function renderErrorServerResponse(
  res: Response,
  statusCode: StatusCodes,
  message: string
) {
  const response: ServerResponse = {
    status: "failed",
    errorMessage: message,
  };
  return res.status(statusCode).json(response);
}

export const validateSchema =
  (schema: TSchema) => (req: Request, res: Response, next: NextFunction) => {
    const compiler = TypeCompiler.Compile(schema);
    const errorIterator = compiler.Errors(req.body);

    let error: ValueError | undefined;
    const errors: ValueError[] = [];
    do {
      error = errorIterator.First();
      if (error) {
        errors.push(error);
      }
    } while (error);
    const errorMessages = errors.reduce((pv, cv) => {
      const delimiter = pv ? "; " : "";

      return `${pv}${delimiter}${cv.path}: ${cv.message}`;
    }, "");

    if (errorMessages) {
      return renderErrorServerResponse(
        res,
        StatusCodes.BAD_REQUEST,
        `Schema validation failed: ${errorMessages}`
      );
    }

    next();
  };
