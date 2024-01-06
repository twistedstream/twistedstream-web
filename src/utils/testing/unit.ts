import express, { Express } from "express";
import path from "path";
import sinon from "sinon";
import { Test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

type MiddlewareSetup = (app: Express) => void;
type ErrorHandlerSetup = {
  test: Test;
  modulePath: string;
  suppressErrorOutput?: boolean;
};
type TestExpressAppOptions = {
  middlewareSetup?: MiddlewareSetup;
  errorHandlerSetup?: ErrorHandlerSetup;
};
export type ViewRenderArgs = { viewName?: string; options?: any };
type ExpressRequestExpectations = { url: string; method: "GET" | "POST" };

// helper functions

/**
 * Creates an Express object that can be used for testing
 */
export function createTestExpressApp({
  middlewareSetup,
  errorHandlerSetup,
}: TestExpressAppOptions = {}): {
  app: Express;
  renderArgs: ViewRenderArgs;
} {
  const app = express();
  const renderArgs: ViewRenderArgs = {};

  app.set("view engine", "handlebars");
  app.engine("handlebars", (viewPath: string, options: any, cb) => {
    renderArgs.viewName = path.parse(viewPath).name;
    renderArgs.options = options;

    cb(null, "ignored");
  });

  if (middlewareSetup) {
    middlewareSetup(app);
  }

  if (errorHandlerSetup) {
    const logger = {
      info: sinon.fake(),
      debug: sinon.fake(),
      error: errorHandlerSetup.suppressErrorOutput
        ? sinon.fake()
        : console.error,
    };

    // include error handler behavior, but fake the logging
    const { default: errorHandler } = errorHandlerSetup.test.mockRequire(
      errorHandlerSetup.modulePath,
      {
        "../../utils/logger": { logger },
      }
    );
    errorHandler(app);
  }

  return { app, renderArgs };
}
