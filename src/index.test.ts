import { test } from "tap";
import sinon from "sinon";

test("index (server)", async (t) => {
  const httpServer = {
    listen: sinon.fake(),
  };
  const http = {
    createServer: sinon.fake.returns(httpServer),
  };
  const httpsServer = {
    listen: sinon.fake(),
  };
  const https = {
    createServer: sinon.fake.returns(httpsServer),
  };
  const app = {};
  const logger = {
    info: sinon.fake(),
  };

  const fs = {
    readFileSync: sinon.stub(),
  };
  const path = {
    resolve: sinon.stub(),
  };

  const rpID = "example.com";

  const importModule = (
    environment: "production" | "development",
    port: number,
    scheme: "http" | "https"
  ) => {
    httpServer.listen.resetHistory();
    http.createServer.resetHistory();
    httpsServer.listen.resetHistory();
    https.createServer.resetHistory();
    logger.info.resetHistory();

    const { default: server } = t.mock("./index", {
      http,
      https,
      fs,
      path,
      "./utils/config": {
        environment,
        port,
        rpID,
        baseUrl: `${scheme}://${rpID}:${port}`,
      },
      "./app": app,
      "./utils/logger": {
        logger,
      },
    });

    return server;
  };

  t.test("HTTP server", async (t) => {
    let server: any;
    t.beforeEach(() => {
      server = importModule("production", 4242, "http");
    });

    t.test("is created using HTTP module and the express app", async (t) => {
      t.ok(http.createServer.called);
      t.equal(http.createServer.firstCall.firstArg, app);
      t.equal(server, httpServer);
    });

    t.test("listens on expected port", async (t) => {
      t.ok(httpServer.listen.called);
      t.equal(httpServer.listen.firstCall.args[0], 4242);
    });

    t.test("logs when server is ready for requests", async (t) => {
      t.ok(httpServer.listen.called);
      const cb = <Function>httpServer.listen.firstCall.args[1];
      cb();

      t.same(logger.info.firstCall.firstArg, {
        port: 4242,
        rpID: "example.com",
        baseUrl: "http://example.com:4242",
      });
    });
  });

  t.test("HTTPS server", async (t) => {
    fs.readFileSync.withArgs("/root/cert/dev.key").returns("DEV_KEY");
    fs.readFileSync.withArgs("/root/cert/dev.crt").returns("DEV_CERT");
    path.resolve.withArgs("./cert/dev.key").returns("/root/cert/dev.key");
    path.resolve.withArgs("./cert/dev.crt").returns("/root/cert/dev.crt");

    let server: any;
    t.beforeEach(() => {
      server = importModule("development", 4433, "https");
    });

    t.test(
      "is created using HTTPS module, a local cert, and the express app",
      async (t) => {
        t.ok(https.createServer.called);
        t.same(https.createServer.firstCall.args[0], {
          key: "DEV_KEY",
          cert: "DEV_CERT",
        });
        t.equal(https.createServer.firstCall.args[1], app);
        t.equal(server, httpsServer);
      }
    );

    t.test("listens on expected port", async (t) => {
      t.ok(httpsServer.listen.called);
      t.equal(httpsServer.listen.firstCall.args[0], 4433);
    });

    t.test("logs when server is ready for requests", async (t) => {
      t.ok(httpsServer.listen.called);
      const cb = <Function>httpsServer.listen.firstCall.args[1];
      cb();

      t.same(logger.info.firstCall.firstArg, {
        port: 4433,
        rpID: "example.com",
        baseUrl: "https://example.com:4433",
      });
    });
  });
});
