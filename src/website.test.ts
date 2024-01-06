import sinon from "sinon";
import { test, Test } from "tap";

// test objects

const expressRouter = {
  use: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const routes = {};

// helpers

function importModule(test: Test) {
  const { default: website } = test.mockRequire("./website", {
    express: {
      Router: routerFake,
    },
    "./routes": routes,
  });

  return website;
}

// tests

test("website", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const website = importModule(t);

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(website, expressRouter);
  });

  t.test("registers routes router", async (t) => {
    importModule(t);

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.firstCall.firstArg, routes);
  });
});
