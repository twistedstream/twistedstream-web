import { IRouter, Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { logger } from "../../utils/logger";
import { buildErrorHandlerData, NotFoundError } from "../../utils/error";
import { AuthenticatedRequest } from "../../types/express";

const errorHandler = (router: IRouter) => {
  // Catch unhandled requests and convert to 404
  router.use((_req: Request, _res: Response, next: NextFunction) => {
    next(NotFoundError());
  });

  // Handle all errors
  router.use(
    (
      err: any,
      _req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ) => {
      const { message, statusCode, correlation_id } =
        buildErrorHandlerData(err);

      res.status(statusCode);

      if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
        logger.error({ err, correlation_id });
      }

      return res.status(statusCode).json({
        status: "failed",
        errorMessage: message,
        correlation_id,
      });
    }
  );
};

export default errorHandler;
