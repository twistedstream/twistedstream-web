import express, { Express } from "express";
import path from "path";

type ViewRenderArgs = { viewName?: string; options?: any };

export const createTestExpressApp = (): {
  app: Express;
  renderArgs: ViewRenderArgs;
} => {
  const app = express();
  const renderArgs: ViewRenderArgs = {};

  app.set("view engine", "handlebars");
  app.engine("handlebars", (viewPath: string, options: any, cb) => {
    renderArgs.viewName = path.parse(viewPath).name;
    renderArgs.options = options;

    cb(null, "ignored");
  });

  return { app, renderArgs };
};
