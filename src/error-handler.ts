import { IRouter, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { buildErrorHandlerData, NotFoundError } from "./utils/error";
import { logger } from "./utils/logger";

const errorHandler = (router: IRouter) => {
  // Catch unhandled requests and convert to 404
  router.use((_req: Request, _res: Response, next: NextFunction) => {
    next(NotFoundError());
  });

  // Handle all errors
  router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const { message, statusCode, correlation_id } = buildErrorHandlerData(err);

    res.status(statusCode);

    if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
      logger.error({ err, correlation_id });
    }

    if (statusCode === StatusCodes.NOT_FOUND) {
      return res.render("404", {
        title: "Sorry, which page?",
        message: err.message,
      });
    }

    res.render("error", {
      title: "Error",
      message,
      error_status: statusCode,
      correlation_id,
    });
  });
};

export default errorHandler;
