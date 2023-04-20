import express, { Express } from "express";
import path from "path";

export type ViewRenderArgs = { viewName?: string; options?: any };

export const createTestExpressApp = (renderArgs?: ViewRenderArgs): Express => {
  const app = express();
  app.set("view engine", "handlebars");
  app.engine("handlebars", (viewPath: string, options: any, cb) => {
    if (renderArgs) {
      renderArgs.viewName = path.parse(viewPath).name;
      renderArgs.options = options;
    }

    cb(null, "ignored");
  });

  return app;
};
