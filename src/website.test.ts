import { test } from "tap";
import sinon from "sinon";
import { NextFunction } from "express";

test("website", async (t) => {
  const expressRouter = {
    use: sinon.fake(),
  };
  const routerFake = sinon.fake.returns(expressRouter);
  const cookieSessionMiddleware = {};
  const cookieSessionFake = sinon.fake.returns(cookieSessionMiddleware);
  const authMiddleware = {};
  const authFake = sinon.fake.returns(authMiddleware);

  const routes = {};

  const importModule = () => {
    expressRouter.use.resetHistory();
    routerFake.resetHistory();
    cookieSessionFake.resetHistory();
    authFake.resetHistory();

    const cookieSecret = "Bananas!";

    const { default: website } = t.mock("./website", {
      express: {
        Router: routerFake,
      },
      "cookie-session": cookieSessionFake,
      "./utils/config": {
        cookieSecret,
      },
      "./routes": routes,
      "./utils/auth": { auth: authFake },
    });

    return website;
  };

  t.test("is a Router instance", async (t) => {
    const website = importModule();

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(website, expressRouter);
  });

  t.test("uses cookie-session middleware", async (t) => {
    importModule();

    t.ok(cookieSessionFake.called);
    t.same(cookieSessionFake.firstCall.firstArg, {
      name: "ts-session",
      secret: "Bananas!",
      maxAge: 86400000,
    });

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.getCalls()[0].firstArg, cookieSessionMiddleware);
  });

  t.test("uses auth middleware", async (t) => {
    importModule();

    t.ok(authFake.called);
    t.equal(authFake.firstCall.args.length, 0);

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.getCalls()[1].firstArg, authMiddleware);
  });

  t.test("sets locals user to request user", async (t) => {
    importModule();

    t.ok(expressRouter.use.called);

    // test behavior of middleware function
    const req: any = { user: "bob" };
    const res: any = { locals: {} };
    const nextFake = sinon.fake();
    const middleware: (req: any, res: any, next: NextFunction) => void =
      expressRouter.use.getCalls()[2].firstArg;
    middleware(req, res, nextFake);
    t.equal(res.locals.user, req.user);
    t.ok(nextFake.called);
  });

  t.test("registers routes router", async (t) => {
    importModule();

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.getCalls()[3].firstArg, routes);
  });
});
