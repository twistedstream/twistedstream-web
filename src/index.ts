// NOTE: The config import should always run first to load the environment
import { port } from "./utils/config";

import http from "http";

import app from "./app";
import { logger } from "./utils/logger";

const server = http.createServer(app);

server.listen(port, () => {
  logger.info(`Server is running at http://localhost:${port}`);
});

export default server;
