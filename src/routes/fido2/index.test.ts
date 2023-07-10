import { test } from "tap";
import sinon from "sinon";

test("routes/fido2/index", async (t) => {
  const expressRouter = {
    use: sinon.fake(),
  };
  const routerFake = sinon.fake.returns(expressRouter);
  const assertionRoute = {};
  const attestationRoute = {};

  function importModule() {
    expressRouter.use.resetHistory();
    routerFake.resetHistory();

    const { default: router } = t.mock("./index", {
      express: {
        Router: routerFake,
      },
      "./assertion": assertionRoute,
      "./attestation": attestationRoute,
    });

    return router;
  }

  t.test("is a Router instance", async (t) => {
    const index = importModule();

    t.ok(routerFake.called);
    t.same(routerFake.firstCall.args, []);
    t.equal(index, expressRouter);
  });

  t.test("registers child routes", async (t) => {
    importModule();

    const calls = expressRouter.use.getCalls();
    t.equal(calls.length, 2);
    t.equal(calls[0].args[0], "/assertion");
    t.equal(calls[0].args[1], assertionRoute);
    t.equal(calls[1].args[0], "/attestation");
    t.equal(calls[1].args[1], attestationRoute);
  });
});
