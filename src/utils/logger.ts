import pino from "pino";
const packageJson = require("../../package.json");

export const logger = pino({
  name: packageJson.name,
  level: process.env.LOG_LEVEL
});
