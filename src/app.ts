import express, { Express, Request, Response, NextFunction } from "express";
import expressPino from "express-pino-logger";
import { StatusCodes } from "http-status-codes";

import { logger } from "./utils/logger";
import website from "./website";
import { NotFoundError } from "./utils/error";

const app: Express = express();

// INFO: App-level middleware
app.use(expressPino({ logger }));

// INFO: Configure website
app.use(website);

// INFO: Catch unhandled requests and convert to 404
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(NotFoundError());
});

// INFO: Handle all errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode: StatusCodes =
    err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode);

  const message =
    statusCode < StatusCodes.INTERNAL_SERVER_ERROR
      ? <string>err.message
      : "Something unexpected happened";

  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error(err);
  }

  res.send(`${statusCode} ERROR: ${message}`);
});

export default app;
