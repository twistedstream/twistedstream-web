import express, { Express, NextFunction, Request, Response } from "express";
import { Response as SupertestResponse } from "supertest";
import path from "path";
import querystring from "querystring";
import sinon from "sinon";
import { StatusCodes } from "http-status-codes";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { Authenticator, User } from "../types/user";
import { AuthenticatedRequest } from "../types/express";

type AuthSetup = {
  originalUrl: string;
  activeUser: User;
  activeCredential: Authenticator;
};
type MiddlewareSetup = (app: Express) => void;
type ErrorHandlerSetup = {
  test: Tap.Test;
  modulePath: string;
  suppressErrorOutput?: boolean;
};
type TestExpressAppOptions = {
  authSetup?: AuthSetup;
  middlewareSetup?: MiddlewareSetup;
  errorHandlerSetup?: ErrorHandlerSetup;
};
type ViewRenderArgs = { viewName?: string; options?: any };
type ExpressRequestExpectations = { url: string; method: "GET" | "POST" };

/**
 * Creates an Express object that can be used for testing
 */
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
        req.user = authSetup.activeUser;
        req.credential = authSetup.activeCredential;

        next();
      }
    );
  }

  if (middlewareSetup) {
    middlewareSetup(app);
  }

  if (errorHandlerSetup) {
    const logger = {
      error: errorHandlerSetup.suppressErrorOutput
        ? sinon.fake()
        : console.error,
    };

    // include error handler behavior, but fake the logging
    const { default: errorHandler } = errorHandlerSetup.test.mock(
      errorHandlerSetup.modulePath,
      {
        "../utils/logger": { logger },
      }
    );
    errorHandler(app);
  }

  return { app, renderArgs };
}

/**
 * Verifies the state of the provided Express.Request object
 */
export function verifyRequest(
  test: Tap.Test,
  req: Request,
  expectations: ExpressRequestExpectations
) {
  test.equal(req.url, expectations.url);
  test.equal(req.method, expectations.method);
  // FUTURE: additional verifications
}

/**
 * Verifies that the provided SuperTest.Response object appears to be a redirect
 * to the login endpoint
 */
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

export function verifyFido2ErrorResponse(
  test: Tap.Test,
  response: SupertestResponse,
  statusCode: number,
  errorMessage: string | RegExp
) {
  test.equal(response.statusCode, statusCode);
  test.match(response.headers["content-type"], "application/json");
  const json = JSON.parse(response.text);
  test.equal(json.status, "failed");
  test.match(json.errorMessage, errorMessage);
}

export function verifyServerErrorFido2ServerResponse(
  test: Tap.Test,
  response: SupertestResponse
) {
  verifyFido2ErrorResponse(
    test,
    response,
    StatusCodes.INTERNAL_SERVER_ERROR,
    "Something unexpected happened"
  );
}

export function verifyFido2SuccessResponse(
  test: Tap.Test,
  response: SupertestResponse,
  expectedData: any
) {
  test.equal(response.statusCode, 200);
  test.match(response.headers["content-type"], "application/json");
  const json = JSON.parse(response.text);
  test.equal(json.status, "ok");
  test.equal(json.errorMessage, "");
  test.match(json, expectedData);
}
