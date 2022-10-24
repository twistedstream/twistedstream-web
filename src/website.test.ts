import { test } from "tap";
import sinon from "sinon";

test("website", async (t) => {
  const expressRouter = {
    use: sinon.fake(),
  };
  const routerFake = sinon.fake.returns(expressRouter);
  const routes = {};

  const importModule = () => {
    expressRouter.use.resetHistory();
    routerFake.resetHistory();

    const { default: website } = t.mock("./website", {
      express: {
        Router: routerFake,
      },
      "./routes": routes,
    });

    return website;
  };

  t.test("is an Router instance", async (t) => {
    const website = importModule();

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(website, expressRouter);
  });

  t.test("uses routes router", async (t) => {
    importModule();

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.firstCall.firstArg, routes);
  });
});
