// NOTE: The config import should always run first to load the environment
import { port, environment } from "./utils/config";

import express, { Express, Request, Response } from "express";
import expressPino from "express-pino-logger";

import { logger } from "./utils/logger";

export const app: Express = express();

app.use(expressPino({ logger }));

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

/* istanbul ignore next */
if (environment !== "test") {
  app.listen(port, () => {
    logger.info(`Server is running at http://localhost:${port}`);
  });
}
