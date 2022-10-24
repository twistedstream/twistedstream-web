import { test } from "tap";
import sinon from "sinon";

test("index (HTTP server)", async (t) => {
  const httpServer = {
    listen: sinon.fake(),
  };
  const http = {
    createServer: sinon.fake.returns(httpServer),
  };
  const app = {};
  const logger = {
    info: sinon.fake(),
  };

  const importModule = () => {
    httpServer.listen.resetHistory();
    http.createServer.resetHistory();
    logger.info.resetHistory();

    const { default: server } = t.mock("./index", {
      "./utils/config": {
        port: 4224,
      },
      http,
      "./app": app,
      "./utils/logger": {
        logger,
      },
    });

    return server;
  };

  t.test("is created using HTTP module and the express app", async (t) => {
    const server = importModule();

    t.ok(http.createServer.called);
    t.equal(http.createServer.firstCall.firstArg, app);
    t.equal(server, httpServer);
  });

  t.test("listens on expected port", async (t) => {
    importModule();

    t.ok(httpServer.listen.called);
    t.equal(httpServer.listen.firstCall.args[0], 4224);
  });

  t.test("logs when server is ready for requests", async (t) => {
    importModule();

    t.ok(httpServer.listen.called);
    const cb = <Function>httpServer.listen.firstCall.args[1];
    cb();

    t.match(logger.info.firstCall.firstArg, "http://localhost:4224");
  });
});
