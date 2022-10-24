import { test } from "tap";
import sinon from "sinon";
import request from "supertest";

import { app } from "./index";

test("app", async (t) => {
  const appUseFake = sinon.fake();
  const appFake = {
    use: appUseFake,
    get: sinon.fake(),
  };
  const expressFake = sinon.fake.returns(appFake);
  const expressPinoResultFake = {};
  const expressPinoFake = sinon.fake.returns(expressPinoResultFake);
  const loggerFake = {};

  const { app: mockedApp } = t.mock("./index", {
    express: expressFake,
    "express-pino-logger": expressPinoFake,
    "./utils/logger": {
      logger: loggerFake,
    },
  });

  t.test("is an Express instance", async (t) => {
    t.ok(expressFake.calledWith());
    t.equal(mockedApp, appFake);
  });

  t.test("uses express-pino-logger", async (t) => {
    t.ok(expressPinoFake.called);
    t.same(expressPinoFake.firstCall.firstArg, { logger: {} });
    t.equal(expressPinoFake.firstCall.firstArg.logger, loggerFake);

    t.ok(appUseFake.called);
    t.equal(appUseFake.firstCall.firstArg, expressPinoResultFake);
  });

  t.test("GET / returns text", async (t) => {
    // NOTE: Testing with actual Express app instance
    const response = await request(app).get("/");

    t.equal(response.status, 200);
  });
});
