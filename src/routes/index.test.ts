import { test } from "tap";
import sinon from "sinon";
import request from "supertest";

import { createTestExpressApp } from "../utils/testing";
import errorHandler from "../error-handler";

type MockOptions = {
  mockExpress?: boolean;
  mockChildRoutes?: boolean;
  mockModules?: boolean;
};

test("routes/index", async (t) => {
  const expressRouter = {
    use: sinon.fake(),
    get: sinon.fake(),
  };
  const routerFake = sinon.fake.returns(expressRouter);
  const capturePreAuthStateFake = sinon.fake();
  const signOutFake = sinon.fake();
  const fido2Route = {};
  const profileRoute = {};

  function importModule({
    mockExpress = false,
    mockChildRoutes = false,
    mockModules = false,
  }: MockOptions = {}) {
    expressRouter.use.resetHistory();
    expressRouter.get.resetHistory();
    routerFake.resetHistory();
    capturePreAuthStateFake.resetHistory();
    signOutFake.resetHistory();

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

    const { default: router } = t.mock("./index", dependencies);

    return router;
  }

  t.test("is a Router instance", async (t) => {
    const index = importModule({
      mockExpress: true,
      mockChildRoutes: true,
    });

    t.ok(routerFake.called);
    t.same(routerFake.firstCall.args, []);
    t.equal(index, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule({
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
    importModule({
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
      const { app, renderArgs } = createTestExpressApp();
      const index = importModule();
      app.use(index);
      errorHandler(app);

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
      const { app } = createTestExpressApp();
      const index = importModule();
      app.use(index);
      errorHandler(app);

      const response = await request(app).get("/linkedin");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://linkedin.com/in/test");
    });
  });

  t.test("GET /twitter", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createTestExpressApp();
      const index = importModule();
      app.use(index);
      errorHandler(app);

      const response = await request(app).get("/twitter");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://twitter.com/test");
    });
  });

  t.test("GET /github", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createTestExpressApp();
      const index = importModule();
      app.use(index);
      errorHandler(app);

      const response = await request(app).get("/github");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://github.com/test");
    });
  });

  t.test("GET /register", async (t) => {
    t.test("renders HTML with expected view state", async (t) => {
      const { app, renderArgs } = createTestExpressApp();
      const index = importModule();
      app.use(index);
      errorHandler(app);

      const response = await request(app).get("/register?return_to=/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 200);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "register");
      t.equal(options.title, "Sign up");
      t.equal(options.return_to, "/foo");
    });

    t.test("captures pre-auth state", async (t) => {
      importModule({
        mockExpress: true,
        mockChildRoutes: true,
        mockModules: true,
      });

      const registerEndpoint = expressRouter.get.getCalls()[4];
      const middleware: (req: any, res: any) => void = registerEndpoint.args[1];

      const req: any = { query: {} };
      const res: any = { render: sinon.fake() };
      middleware(req, res);

      t.ok(capturePreAuthStateFake.called);
      t.equal(capturePreAuthStateFake.firstCall.firstArg, req);
    });
  });

  t.test("GET /login", async (t) => {
    t.test("renders HTML with expected view state", async (t) => {
      const { app, renderArgs } = createTestExpressApp();
      const index = importModule();
      app.use(index);
      errorHandler(app);

      const response = await request(app).get("/login?return_to=/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 200);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "login");
      t.equal(options.title, "Sign in");
      t.equal(options.return_to, "/foo");
    });

    t.test("saves return-to to session", async (t) => {
      importModule({
        mockExpress: true,
        mockChildRoutes: true,
        mockModules: true,
      });

      const loginEndpoint = expressRouter.get.getCalls()[5];
      const middleware: (req: any, res: any) => void = loginEndpoint.args[1];

      const req: any = { query: {} };
      const res: any = { render: sinon.fake() };
      middleware(req, res);

      t.ok(capturePreAuthStateFake.called);
      t.equal(capturePreAuthStateFake.firstCall.firstArg, req);
    });
  });

  t.test("GET /logout", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createTestExpressApp();
      const index = importModule();
      app.use(index);
      errorHandler(app);

      const response = await request(app).get("/logout");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "/");
    });

    t.test("performs sign out", async (t) => {
      importModule({
        mockExpress: true,
        mockChildRoutes: true,
        mockModules: true,
      });

      const logoutEndpoint = expressRouter.get.getCalls()[6];
      const middleware: (req: any, res: any) => void = logoutEndpoint.args[1];

      const req: any = { query: {} };
      const res: any = { redirect: sinon.fake() };
      middleware(req, res);

      t.ok(signOutFake.called);
      t.equal(signOutFake.firstCall.firstArg, req);
    });
  });
});
