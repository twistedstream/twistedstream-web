import { test } from "tap";
import sinon, { SinonSpy } from "sinon";

test("website", async (t) => {
  let routerFake: SinonSpy;
  const expressRouter: any = {};
  let routerUseFake: SinonSpy;
  const routes = {};

  const mockModule = () => {
    routerUseFake = sinon.fake();
    expressRouter.use = routerUseFake;
    routerFake = sinon.fake.returns(expressRouter);

    return t.mock("./website", {
      express: {
        Router: routerFake,
      },
      "./routes": routes,
    });
  };

  t.test("is an Router instance", async (t) => {
    // NOTE: syntax to get default export of the module
    const { default: website } = mockModule();

    t.ok(routerFake.calledWith());
    t.equal(website, expressRouter);
  });

  t.test("uses routes router", async (t) => {
    mockModule();

    t.ok(routerUseFake.called);
    t.equal(routerUseFake.firstCall.firstArg, routes);
  });
});
