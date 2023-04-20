import { test } from "tap";
import sinon from "sinon";
import request from "supertest";
import { Request, Response } from "express";

import { ViewRenderArgs, createTestExpressApp } from "./utils/testing";
import { ErrorWithStatusCode } from "./utils/error";
import * as utilsError from "./utils/error";

test("error handler", async (t) => {
  const logger = {
    error: sinon.fake(),
  };

  const { default: errorHandler } = t.mock("./error-handler", {
    "./utils/logger": { logger },
    "./utils/error": {
      ...utilsError,
      generateCorrelationId: () => "error-id",
    },
  });

  t.afterEach(() => {
    logger.error.resetHistory();
  });

  t.test("with html content", async (t) => {
    t.test("handles 404 errors", async (t) => {
      const renderArgs: ViewRenderArgs = {};
      const app = createTestExpressApp(renderArgs);
      errorHandler(app);

      const response = await request(app).get("/foo").accept("text/html");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 404);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "404");
      t.equal(options.title, "Sorry, which page?");
      t.equal(options.message, "Not Found");
      t.notOk(logger.error.called);
    });

    t.test("handles other 4** user errors", async (t) => {
      const renderArgs: ViewRenderArgs = {};
      const app = createTestExpressApp(renderArgs);
      app.get("/foo", (_req: Request, _res: Response) => {
        throw new ErrorWithStatusCode(401, "Not so fast, pal");
      });
      errorHandler(app);

      const response = await request(app).get("/foo").accept("text/html");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 401);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "error");
      t.equal(options.title, "Error");
      t.equal(options.message, "Unauthorized: Not so fast, pal");
      t.equal(options.error_status, 401);
      t.notOk(options.correlation_id);
      t.notOk(logger.error.called);
    });

    t.test("handles (and logs) 5** server errors", async (t) => {
      const renderArgs: ViewRenderArgs = {};
      const app = createTestExpressApp(renderArgs);
      const error = new Error("Boom!");
      app.get("/foo", (_req: Request, _res: Response) => {
        throw error;
      });
      errorHandler(app);

      const response = await request(app).get("/foo").accept("text/html");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 500);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "error");
      t.equal(options.title, "Error");
      t.equal(options.message, "Something unexpected happened");
      t.equal(options.error_status, 500);
      t.equal(options.correlation_id, "error-id");
      t.ok(logger.error.called);
      t.equal(logger.error.firstCall.firstArg.err, error);
      t.equal(logger.error.firstCall.firstArg.correlation_id, "error-id");
    });
  });

  t.test("with json content", async (t) => {
    t.test("handles 404 errors", async (t) => {
      const app = createTestExpressApp();
      errorHandler(app);

      const response = await request(app)
        .get("/foo")
        .accept("application/json");

      t.equal(response.status, 404);
      t.match(response.headers["content-type"], "application/json");
      const responseJson = JSON.parse(response.text);
      t.equal(responseJson.status, 404);
      t.equal(responseJson.message, "Not Found");
      t.notOk(logger.error.called);
    });

    t.test("handles other 4** user errors", async (t) => {
      const app = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw new ErrorWithStatusCode(401, "Not so fast, pal");
      });
      errorHandler(app);

      const response = await request(app)
        .get("/foo")
        .accept("application/json");

      t.equal(response.status, 401);
      t.match(response.headers["content-type"], "application/json");
      const responseJson = JSON.parse(response.text);
      t.equal(responseJson.status, 401);
      t.equal(responseJson.message, "Unauthorized: Not so fast, pal");
      t.notOk(logger.error.called);
    });

    t.test("handles (and logs) 5** server errors", async (t) => {
      const app = createTestExpressApp();
      const error = new Error("Boom!");
      app.get("/foo", (_req: Request, _res: Response) => {
        throw error;
      });
      errorHandler(app);

      const response = await request(app)
        .get("/foo")
        .accept("application/json");

      t.equal(response.status, 500);
      t.match(response.headers["content-type"], "application/json");
      const responseJson = JSON.parse(response.text);
      t.equal(responseJson.status, 500);
      t.equal(responseJson.message, "Something unexpected happened");
      t.equal(responseJson.correlation_id, "error-id");
      t.ok(logger.error.called);
      t.equal(logger.error.firstCall.firstArg.err, error);
      t.equal(logger.error.firstCall.firstArg.correlation_id, "error-id");
    });
  });
});
