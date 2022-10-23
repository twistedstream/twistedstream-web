import { test } from "tap";
import sinon, { SinonSpy } from "sinon";

test("app", async (t) => {
  let appUseFake: SinonSpy;
  const expressApp: any = {};
  let expressFake: SinonSpy;
  const expressPinoResultFake = {};
  let expressPinoFake: SinonSpy;
  const logger: any = {};
  const website = {};
  const notFoundErrorResult = {};
  let notFoundErrorFake: SinonSpy;

  const mockModule = () => {
    appUseFake = sinon.fake();
    expressApp.use = appUseFake;
    expressFake = sinon.fake.returns(expressApp);
    expressPinoFake = sinon.fake.returns(expressPinoResultFake);
    notFoundErrorFake = sinon.fake.returns(notFoundErrorResult);
    delete logger.error;

    return t.mock("./app", {
      express: expressFake,
      "express-pino-logger": expressPinoFake,
      "./utils/logger": {
        logger,
      },
      "./website": website,
      "./utils/error": {
        NotFoundError: notFoundErrorFake,
      },
    });
  };

  t.test("is an Express instance", async (t) => {
    // NOTE: syntax to get default export of the module
    const { default: app } = mockModule();

    t.ok(expressFake.calledWith());
    t.equal(app, expressApp);
  });

  t.test("uses express-pino-logger middleware", async (t) => {
    mockModule();

    t.ok(expressPinoFake.called);
    t.same(expressPinoFake.firstCall.firstArg, { logger: {} });
    t.equal(expressPinoFake.firstCall.firstArg.logger, logger);

    t.ok(appUseFake.called);
    t.equal(appUseFake.firstCall.firstArg, expressPinoResultFake);
  });

  t.test("uses website router", async (t) => {
    mockModule();

    t.ok(appUseFake.called);
    t.equal(appUseFake.getCalls()[1].firstArg, website);
  });

  t.test("converts unhandled requests to 404 errors", async (t) => {
    const nextFake = sinon.fake();

    mockModule();
    t.ok(appUseFake.called);
    const cb = <Function>appUseFake.getCalls()[2].firstArg;
    cb(undefined, undefined, nextFake);

    t.ok(notFoundErrorFake.calledWith());
    t.ok(nextFake.called);
    t.equal(nextFake.firstCall.firstArg, notFoundErrorResult);
  });

  t.test("error handler middleware", async (t) => {
    t.test("responds with error status code", async (t) => {
      t.test("when error.statusCode", async (t) => {
        const statusFake = sinon.fake();
        const error = {
          message: "foo",
          statusCode: 404,
        };
        const res = {
          status: statusFake,
          send: sinon.fake(),
        };

        mockModule();
        t.ok(appUseFake.called);
        const cb = <Function>appUseFake.getCalls()[3].firstArg;
        cb(error, undefined, res, undefined);

        t.ok(statusFake.called);
        t.equal(statusFake.firstCall.firstArg, 404);
      });

      t.test("when error.status", async (t) => {
        const statusFake = sinon.fake();
        const error = {
          message: "foo",
          status: 404,
        };
        const res = {
          status: statusFake,
          send: sinon.fake(),
        };

        mockModule();
        t.ok(appUseFake.called);
        const cb = <Function>appUseFake.getCalls()[3].firstArg;
        cb(error, undefined, res, undefined);

        t.ok(statusFake.called);
        t.equal(statusFake.firstCall.firstArg, 404);
      });
    });

    t.test(
      "responds with 500 status code if no status code in error",
      async (t) => {
        const statusFake = sinon.fake();
        const error = {};
        const res = {
          status: statusFake,
          send: sinon.fake(),
        };

        mockModule();
        logger.error = sinon.fake();
        t.ok(appUseFake.called);
        const cb = <Function>appUseFake.getCalls()[3].firstArg;
        cb(error, undefined, res, undefined);

        t.ok(statusFake.called);
        t.equal(statusFake.firstCall.firstArg, 500);
      }
    );

    t.test(
      "responds with expected message and logs if server error",
      async (t) => {
        const sendFake = sinon.fake();
        const error = {
          message: "foo",
        };
        const res = {
          status: sinon.fake(),
          send: sendFake,
        };
        const loggerErrorFake = sinon.fake();

        mockModule();
        logger.error = loggerErrorFake;
        t.ok(appUseFake.called);
        const cb = <Function>appUseFake.getCalls()[3].firstArg;
        cb(error, undefined, res, undefined);

        t.ok(loggerErrorFake.called);
        t.equal(loggerErrorFake.firstCall.firstArg, error);
        t.ok(sendFake.called);
        t.equal(
          sendFake.firstCall.firstArg,
          "500 ERROR: Something unexpected happened"
        );
      }
    );

    t.test(
      "responds with expected message and does not log if not server error",
      async (t) => {
        const sendFake = sinon.fake();
        const error = {
          message: "foo",
          statusCode: 404,
        };
        const res = {
          status: sinon.fake(),
          send: sendFake,
        };
        const loggerErrorFake = sinon.fake();

        mockModule();
        logger.error = loggerErrorFake;
        t.ok(appUseFake.called);
        const cb = <Function>appUseFake.getCalls()[3].firstArg;
        cb(error, undefined, res, undefined);

        t.ok(loggerErrorFake.notCalled);
        t.ok(sendFake.called);
        t.equal(sendFake.firstCall.firstArg, "404 ERROR: foo");
      }
    );
  });
});
