import express, { Express, NextFunction, Response } from "express";
import { Response as SupertestResponse } from "supertest";
import path from "path";
import querystring from "querystring";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { Authenticator, User } from "../types/user";
import { AuthenticatedRequest } from "../types/express";

type ViewRenderArgs = { viewName?: string; options?: any };
type AuthSetupArgs = {
  originalUrl: string;
  user?: User;
  credential?: Authenticator;
};

export function createTestExpressApp(): {
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

  return { app, renderArgs };
}

export function simulateAuth(app: Express, setup: AuthSetupArgs) {
  app.all(
    "*",
    (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      req.originalUrl = setup.originalUrl;
      req.user = setup.user;
      req.credential = setup.credential;

      next();
    }
  );
}

export function verifyAuthenticationRequiredResponse(
  t: Tap.Test,
  response: SupertestResponse,
  return_to: string = "/"
) {
  t.equal(response.status, 302);
  t.equal(
    response.headers.location,
    "/login?" + querystring.encode({ return_to })
  );
}
