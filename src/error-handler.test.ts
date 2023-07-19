import { Request, Response } from "express";
import sinon from "sinon";
import request from "supertest";
import { test } from "tap";

import * as utilsError from "./utils/error";
import { BadRequestError } from "./utils/error";
import { createTestExpressApp } from "./utils/testing/unit";

// test objects

const buildErrorHandlerDataStub = sinon.stub();
const logger = {
  error: sinon.fake(),
};

// tests

test("(root): error handler", async (t) => {
  t.beforeEach(() => {
    logger.error.resetHistory();
    buildErrorHandlerDataStub.resetHistory();
  });

  const { default: errorHandler } = t.mock("./error-handler", {
    "./utils/logger": { logger },
    "./utils/error": {
      ...utilsError,
      buildErrorHandlerData: buildErrorHandlerDataStub,
    },
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

    t.test("renders HTML with the expected view state", async (t) => {
      buildErrorHandlerDataStub.returns({ statusCode: 404 });

      const { app, renderArgs } = createTestExpressApp();
      errorHandler(app);

      const response = await request(app).get("/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 404);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "404");
      t.equal(options.title, "Sorry, which page?");
      t.equal(options.message, "Not Found");
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
    t.test("renders HTML with the expected view state", async (t) => {
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
      const { viewName, options } = renderArgs;

      t.equal(response.status, 400);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "error");
      t.equal(options.title, "Error");
      t.equal(options.message, "Really bad request");
      t.equal(options.error_status, 400);
      t.notOk(options.correlation_id);
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
    t.test("renders HTML with the expected view state", async (t) => {
      buildErrorHandlerDataStub.returns({
        message: "What'd you do?",
        statusCode: 500,
        correlation_id: "ERROR_ID",
      });

      const { app, renderArgs } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw new Error("BOOM!");
      });
      errorHandler(app);

      const response = await request(app).get("/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 500);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "error");
      t.equal(options.title, "Error");
      t.equal(options.message, "What'd you do?");
      t.equal(options.error_status, 500);
      t.equal(options.correlation_id, "ERROR_ID");
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
