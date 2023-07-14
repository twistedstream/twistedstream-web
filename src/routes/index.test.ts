import { test } from "tap";
import sinon from "sinon";
import request from "supertest";

import { createTestExpressApp, verifyRequest } from "../utils/testing";

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
const fido2Route = sinon.fake();
const profileRoute = sinon.fake();

// helpers

function importModule(
  test: Tap.Test,
  {
    mockExpress = false,
    mockChildRoutes = false,
    mockModules = false,
  }: MockOptions = {}
) {
  const dependencies: any = {};
  if (mockExpress) {
    dependencies.express = {
      Router: routerFake,
    };
  }
  if (mockChildRoutes) {
    dependencies["./fido2"] = fido2Route;
    dependencies["./profile"] = profileRoute;
  }
  if (mockModules) {
    dependencies["../utils/auth"] = {
      capturePreAuthState: capturePreAuthStateFake,
      signOut: signOutFake,
    };
  }

  const { default: router } = test.mock("./index", dependencies);

  return router;
}

function createIndexTestExpressApp(test: Tap.Test) {
  const index = importModule(test, {
    mockModules: true,
    mockChildRoutes: true,
  });

  return createTestExpressApp({
    middlewareSetup: (app) => {
      app.use(index);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../error-handler",
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
      [
        "/",
        "/linkedin",
        "/twitter",
        "/github",
        "/register",
        "/login",
        "/logout",
      ]
    );
  });

  t.test("registers child routes", async (t) => {
    importModule(t, {
      mockExpress: true,
      mockChildRoutes: true,
    });

    const calls = expressRouter.use.getCalls();
    t.equal(calls.length, 2);
    t.equal(calls[0].args[0], "/fido2");
    t.equal(calls[0].args[1], fido2Route);
    t.equal(calls[1].args[0], "/profile");
    t.equal(calls[1].args[1], profileRoute);
  });

  t.test("GET /", async (t) => {
    t.test("returns HTML with expected view state", async (t) => {
      const { app, renderArgs } = createIndexTestExpressApp(t);

      const response = await request(app).get("/");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 200);
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

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://linkedin.com/in/test");
    });
  });

  t.test("GET /twitter", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/twitter");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://twitter.com/test");
    });
  });

  t.test("GET /github", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/github");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://github.com/test");
    });
  });

  t.test("GET /register", async (t) => {
    t.test("captures pre-auth state", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      await request(app).get("/register");

      t.ok(capturePreAuthStateFake.called);
      verifyRequest(t, capturePreAuthStateFake.firstCall.firstArg, {
        url: "/register",
        method: "GET",
      });
    });

    t.test("renders HTML with expected view state", async (t) => {
      const { app, renderArgs } = createIndexTestExpressApp(t);

      const response = await request(app).get("/register?return_to=/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 200);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "register");
      t.equal(options.title, "Sign up");
      t.equal(options.return_to, "/foo");
    });
  });

  t.test("GET /login", async (t) => {
    t.test("captures pre-auth state", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      await request(app).get("/login");

      t.ok(capturePreAuthStateFake.called);
      verifyRequest(t, capturePreAuthStateFake.firstCall.firstArg, {
        url: "/login",
        method: "GET",
      });
    });

    t.test("renders HTML with expected view state", async (t) => {
      const { app, renderArgs } = createIndexTestExpressApp(t);

      const response = await request(app).get("/login?return_to=/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 200);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "login");
      t.equal(options.title, "Sign in");
      t.equal(options.return_to, "/foo");
    });
  });

  t.test("GET /logout", async (t) => {
    t.test("performs sign out", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      await request(app).get("/logout");

      t.ok(signOutFake.called);
      verifyRequest(t, signOutFake.firstCall.firstArg, {
        url: "/logout",
        method: "GET",
      });
    });

    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/logout");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "/");
    });
  });
});
