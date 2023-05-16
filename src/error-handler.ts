import { Express, Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { logger } from "./utils/logger";
import { generateCorrelationId, NotFoundError } from "./utils/error";
import { AuthenticatedRequest } from "./types/express";

const errorHandler = (app: Express) => {
  // INFO: Catch unhandled requests and convert to 404
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(NotFoundError());
  });

  // INFO: Handle all errors
  app.use(
    (
      err: any,
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ) => {
      const statusCode: StatusCodes =
        err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
      res.status(statusCode);

      const message =
        statusCode < StatusCodes.INTERNAL_SERVER_ERROR
          ? <string>err.message
          : "Something unexpected happened";

      let correlation_id: string = "";
      if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
        correlation_id = generateCorrelationId();
        logger.error({ err, correlation_id });
      }

      if (!req.accepts("html")) {
        return res.status(statusCode).json({
          status: statusCode,
          message,
          correlation_id,
        });
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
    }
  );
};

export default errorHandler;
