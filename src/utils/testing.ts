import express, { Express, NextFunction, Response } from "express";
import { Response as SupertestResponse } from "supertest";
import path from "path";
import querystring from "querystring";
import sinon from "sinon";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { Authenticator, User } from "../types/user";
import { AuthenticatedRequest } from "../types/express";

type AuthSetup = {
  originalUrl: string;
  user: User;
  credential: Authenticator;
};
type MiddlewareSetup = (app: Express) => void;
type ErrorHandlerSetup = { test: Tap.Test };
type TestExpressAppOptions = {
  authSetup?: AuthSetup;
  middlewareSetup?: MiddlewareSetup;
  errorHandlerSetup?: ErrorHandlerSetup;
};
type ViewRenderArgs = { viewName?: string; options?: any };

export function createTestExpressApp({
  authSetup,
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

  if (authSetup) {
    app.all(
      "*",
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.originalUrl = authSetup.originalUrl;
        req.user = authSetup.user;
        req.credential = authSetup.credential;

        next();
      }
    );
  }

  if (middlewareSetup) {
    middlewareSetup(app);
  }

  if (errorHandlerSetup) {
    // include error handler behavior, but fake the logging
    const { default: errorHandler } = errorHandlerSetup.test.mock(
      "../error-handler",
      {
        "../utils/logger": { logger: { error: sinon.fake() } },
      }
    );
    errorHandler(app);
  }

  return { app, renderArgs };
}

export function verifyAuthenticationRequiredResponse(
  test: Tap.Test,
  response: SupertestResponse,
  return_to: string = "/"
) {
  test.equal(response.status, 302);
  test.equal(
    response.headers.location,
    "/login?" + querystring.encode({ return_to })
  );
}
