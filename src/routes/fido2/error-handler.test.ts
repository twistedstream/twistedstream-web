import { test } from "tap";
import sinon from "sinon";
import request from "supertest";
import { Request, Response } from "express";

import {
  createTestExpressApp,
  verifyFido2ServerErrorResponse,
} from "../../utils/testing";
import { BadRequestError } from "../../utils/error";
import * as utilsError from "../../utils/error";

test("FIDO2 error handler", async (t) => {
  const buildErrorHandlerDataStub = sinon.stub();
  const logger = {
    error: sinon.fake(),
  };

  const { default: errorHandler } = t.mock("./error-handler", {
    "../../utils/logger": { logger },
    "../../utils/error": {
      ...utilsError,
      buildErrorHandlerData: buildErrorHandlerDataStub,
    },
  });

  t.afterEach(() => {
    logger.error.resetHistory();
    buildErrorHandlerDataStub.resetHistory();
  });

  t.test("builds error handler data using the thrown error", async (t) => {
    const error = new Error("BOOM!");

    buildErrorHandlerDataStub.returns({});

    const { app } = createTestExpressApp();
    app.get("/foo", (_req: Request, _res: Response) => {
      throw error;
    });
    errorHandler(app);

    await request(app).get("/foo");

    t.ok(buildErrorHandlerDataStub.called);
    t.equal(buildErrorHandlerDataStub.firstCall.firstArg, error);
  });

  t.test("404 errors", async (t) => {
    t.test(
      "catches unhandled requests and converts them to 404 errors",
      async (t) => {
        buildErrorHandlerDataStub.returns({});

        const { app } = createTestExpressApp();
        errorHandler(app);

        await request(app).get("/foo");

        t.ok(buildErrorHandlerDataStub.called);
        t.equal(buildErrorHandlerDataStub.firstCall.firstArg.statusCode, 404);
      }
    );

    t.test("renders JSON with the expected data", async (t) => {
      buildErrorHandlerDataStub.returns({
        message: "Can't find it",
        statusCode: 404,
      });

      const { app } = createTestExpressApp();
      errorHandler(app);

      const response = await request(app).get("/foo");

      verifyFido2ServerErrorResponse(t, response, 404, "Can't find it");
    });

    t.test("does not log the error", async (t) => {
      buildErrorHandlerDataStub.returns({ statusCode: 404 });

      const { app } = createTestExpressApp();
      errorHandler(app);

      await request(app).get("/foo");

      t.notOk(logger.error.called);
    });
  });

  t.test("other 4** errors", async (t) => {
    t.test("renders JSON with the expected data", async (t) => {
      buildErrorHandlerDataStub.returns({
        message: "Really bad request",
        statusCode: 400,
        correlation_id: "",
      });

      const { app, renderArgs } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw BadRequestError("");
      });
      errorHandler(app);

      const response = await request(app).get("/foo");

      verifyFido2ServerErrorResponse(t, response, 400, "Really bad request");
    });

    t.test("does not log the error", async (t) => {
      buildErrorHandlerDataStub.returns({ statusCode: 404 });

      const { app } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw BadRequestError("");
      });
      errorHandler(app);

      await request(app).get("/foo");

      t.notOk(logger.error.called);
    });
  });

  t.test("5** errors", async (t) => {
    t.test("renders JSON with the expected data", async (t) => {
      buildErrorHandlerDataStub.returns({
        message: "What'd you do?",
        statusCode: 500,
        correlation_id: "ERROR_ID",
      });

      const { app } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw new Error("BOOM!");
      });
      errorHandler(app);

      const response = await request(app).get("/foo");

      verifyFido2ServerErrorResponse(t, response, 500, "What'd you do?");
    });

    t.test("logs the error", async (t) => {
      const error = new Error("BOOM!");
      buildErrorHandlerDataStub.returns({
        statusCode: 500,
        correlation_id: "ERROR_ID",
      });

      const { app } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw error;
      });
      errorHandler(app);

      await request(app).get("/foo");

      t.ok(logger.error.called);
      t.equal(logger.error.firstCall.firstArg.err, error);
      t.equal(logger.error.firstCall.firstArg.correlation_id, "ERROR_ID");
    });
  });
});
