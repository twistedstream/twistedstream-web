import sinon from "sinon";
import request from "supertest";
import { test } from "tap";

import { StatusCodes } from "http-status-codes";
import { createTestExpressApp } from "../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockChildRoutes?: boolean;
  mockModules?: boolean;
};

// test objects

const expressRouter = {
  use: sinon.fake(),
  get: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const capturePreAuthStateFake = sinon.fake();
const signOutFake = sinon.fake();
const getRegisterableStub = sinon.stub();
const fido2Route = sinon.fake();
const profileRoute = sinon.fake();
const invitesRoute = sinon.fake();
const sharesRoute = sinon.fake();

// helpers

function importModule(
  test: Tap.Test,
  {
    mockExpress = false,
    mockChildRoutes = false,
    mockModules = false,
  }: MockOptions = {}
) {
  const { default: router } = test.mock("./index", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
  });

  return router;
}

function createIndexTestExpressApp(test: Tap.Test) {
  const router = importModule(test, {
    mockModules: true,
    mockChildRoutes: true,
  });

  return createTestExpressApp({
    middlewareSetup: (app) => {
      app.use(router);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../error-handler",
    },
  });
}

// tests

test("routes/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const index = importModule(t, {
      mockExpress: true,
      mockChildRoutes: true,
    });

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(index, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule(t, {
      mockExpress: true,
      mockChildRoutes: true,
    });

    t.same(
      expressRouter.get.getCalls().map((c) => c.firstArg),
      ["/", "/linkedin", "/twitter", "/github"]
    );
  });

  t.test("GET /", async (t) => {
    t.test("returns HTML with expected view state", async (t) => {
      const { app, renderArgs } = createIndexTestExpressApp(t);

      const response = await request(app).get("/");
      const { viewName, options } = renderArgs;

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "home");
      t.equal(options.title, "Twisted Stream Technologies");
      t.ok(Array.isArray(options.poweredBys));
      t.ok(options.poweredBys.length);
      for (const pb of options.poweredBys) {
        t.ok(pb.name);
        t.ok(pb.url);
      }
    });
  });

  t.test("GET /linkedin", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/linkedin");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "https://linkedin.com/in/test");
    });
  });

  t.test("GET /twitter", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/twitter");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "https://twitter.com/test");
    });
  });

  t.test("GET /github", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/github");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "https://github.com/test");
    });
  });
});
