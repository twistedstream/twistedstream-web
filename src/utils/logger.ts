import pino from "pino";
import { packageName, logLevel } from "./config";

export const logger = pino({
  name: packageName,
  level: logLevel,
});
