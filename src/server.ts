// NOTE: The config import should always run first to load the environment
import { baseUrl, environment, port, rpID } from "./utils/config";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import fs from "fs";
import http from "http";
import https from "https";
import { Server } from "net";
import path from "path";
import app from "./app";
import { createRootUserAndInvite } from "./services/invite";
import { logger } from "./utils/logger";

let serverName: string, server: Server;
if (environment === "production") {
  // Docker: create simple HTTP server
  serverName = "HTTP";
  server = http.createServer(app);
} else {
  // local: create HTTPS server with self-signed cert
  serverName = "HTTPS";
  const certOptions = {
    key: fs.readFileSync(path.resolve("./cert/dev.key")),
    cert: fs.readFileSync(path.resolve("./cert/dev.crt")),
  };
  server = https.createServer(certOptions, app);
}

server.listen(port, () => {
  logger.info(
    {
      port,
      rpID,
      baseUrl,
    },
    `${serverName} server started`
  );
});

export default server;

createRootUserAndInvite()
  .then((firstInvite) => {
    if (firstInvite) {
      logger.info(
        {
          url: `${baseUrl}/invites/${firstInvite.id}`,
        },
        "Root invite"
      );
    }
  })
  .catch((err) => {
    logger.error(err, "Error attempting to create root user and invite.");
  });
