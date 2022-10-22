// INFO: This should always run first to load the environment
import "dotenv/config";

import express, { Express, Request, Response } from "express";
import expressPino from "express-pino-logger";

import { logger } from "./utils/logger"

const app: Express = express();
const port = process.env.PORT;

app.use(expressPino({ logger }));

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  logger.info(`Server is running at http://localhost:${port}`);
});
