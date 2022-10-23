import { test } from "tap";
import sinon, { SinonSpy } from "sinon";

test("server", async (t) => {
  let serverListenFake: SinonSpy;
  const httpServer: any = {};
  let httpCreateServerFake: SinonSpy;
  const http: any = {};
  const app = {};
  let loggerInfoFake: SinonSpy;
  const logger: any = {};

  const mockModule = () => {
    serverListenFake = sinon.fake();
    httpServer.listen = serverListenFake;
    httpCreateServerFake = sinon.fake.returns(httpServer);
    http.createServer = httpCreateServerFake;
    loggerInfoFake = sinon.fake();
    logger.info = loggerInfoFake;

    return t.mock("./index", {
      "./utils/config": {
        port: 4224,
      },
      http,
      "./app": app,
      "./utils/logger": {
        logger,
      },
    });
  };

  t.test("is created using HTTP module and the express app", async (t) => {
    const { server } = mockModule();

    t.ok(httpCreateServerFake.called);
    t.equal(httpCreateServerFake.firstCall.firstArg, app);
    t.equal(server, httpServer);
  });

  t.test("listens on expected port", async (t) => {
    mockModule();

    t.ok(serverListenFake.called);
    t.equal(serverListenFake.firstCall.args[0], 4224);
  });

  t.test("logs when server is ready for requests", async (t) => {
    mockModule();

    t.ok(serverListenFake.called);
    const cb = <Function>serverListenFake.firstCall.args[1];
    cb();

    t.match(loggerInfoFake.firstCall.firstArg, "http://localhost:4224");
  });
});
