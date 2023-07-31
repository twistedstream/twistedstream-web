import sinon from "sinon";
import { test } from "tap";

// test objects

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
  error: sinon.fake(),
};

const fs = {
  readFileSync: sinon.stub(),
};
const path = {
  resolve: sinon.stub(),
};

const createRootUserAndInviteStub = sinon.stub();

const thenFakeHandler = sinon.fake();
const catchFake = sinon.fake();
const thenFake: any = (arg: any) => {
  thenFakeHandler(arg);
  return { catch: catchFake };
};

const rpID = "example.com";

// helpers

function importModule(
  test: Tap.Test,
  environment: "production" | "development",
  port: number,
  scheme: "http" | "https"
) {
  const { default: server } = test.mock("./server", {
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
    "./services/invite": {
      createRootUserAndInvite: createRootUserAndInviteStub,
    },
  });

  return server;
}

// tests

test("server", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("HTTP server", async (t) => {
    function importHttpServer() {
      createRootUserAndInviteStub.resolves();

      return importModule(t, "production", 4242, "http");
    }

    t.test("is created using HTTP module and the express app", async (t) => {
      const server = importHttpServer();

      t.ok(http.createServer.called);
      t.equal(http.createServer.firstCall.firstArg, app);
      t.equal(server, httpServer);
    });

    t.test("listens on expected port", async (t) => {
      const server = importHttpServer();

      t.ok(httpServer.listen.called);
      t.equal(httpServer.listen.firstCall.args[0], 4242);
    });

    t.test("logs when server is ready for requests", async (t) => {
      const server = importHttpServer();

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
    function importHttpsServer() {
      createRootUserAndInviteStub.resolves();

      return importModule(t, "development", 4433, "https");
    }

    t.test(
      "is created using HTTPS module, a local cert, and the express app",
      async (t) => {
        path.resolve.withArgs("./cert/dev.key").returns("/root/cert/dev.key");
        path.resolve.withArgs("./cert/dev.crt").returns("/root/cert/dev.crt");
        fs.readFileSync.withArgs("/root/cert/dev.key").returns("DEV_KEY");
        fs.readFileSync.withArgs("/root/cert/dev.crt").returns("DEV_CERT");

        const server = importHttpsServer();

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
      const server = importHttpsServer();

      t.ok(httpsServer.listen.called);
      t.equal(httpsServer.listen.firstCall.args[0], 4433);
    });

    t.test("logs when server is ready for requests", async (t) => {
      const server = importHttpsServer();

      t.ok(httpsServer.listen.called);
      const cb = <Function>httpsServer.listen.firstCall.args[1];
      cb();

      t.ok(logger.info.called);
      t.same(logger.info.firstCall.firstArg, {
        port: 4433,
        rpID: "example.com",
        baseUrl: "https://example.com:4433",
      });
    });
  });

  t.test("root user and invite", async (t) => {
    t.beforeEach(async () => {
      createRootUserAndInviteStub.returns({ then: thenFake });
    });

    t.test("is attempted to be created", async (t) => {
      importModule(t, "production", 4242, "http");

      t.ok(createRootUserAndInviteStub.called);
      t.ok(thenFakeHandler.called);
    });

    t.test("logs if invite is returned", async (t) => {
      importModule(t, "production", 4242, "http");
      const onFulfilled = <Function>thenFakeHandler.firstCall.firstArg;
      onFulfilled({ id: "INVITE_ID" });

      t.ok(logger.info.called);
      t.match(logger.info.firstCall.firstArg, "Root invite:");
    });

    t.test("does not log if no invite is returned", async (t) => {
      importModule(t, "production", 4242, "http");
      const onFulfilled = <Function>thenFakeHandler.firstCall.firstArg;
      onFulfilled();

      // no additional logging calls are made if first invite wasn't returned
      t.notOk(logger.info.called);
    });

    t.test("logs if error is caught", async (t) => {
      importModule(t, "production", 4242, "http");
      const onRejected = <Function>catchFake.firstCall.firstArg;
      const error = new Error("BOOM!");
      onRejected(error);

      t.ok(logger.error.called);
      t.equal(logger.error.firstCall.firstArg, error);
    });
  });
});
