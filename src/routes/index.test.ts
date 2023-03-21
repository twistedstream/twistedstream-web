import { test } from "tap";
import request from "supertest";

import routes from "./index";
import { createTestExpressApp, ViewRenderArgs } from "../utils/testing";

test("routes", async (t) => {
  t.test("GET /", async (t) => {
    t.test("returns 200 with expected text", async (t) => {
      const renderArgs: ViewRenderArgs = {};
      const app = createTestExpressApp(renderArgs);
      app.use(routes);

      const response = await request(app).get("/");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 200);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "home");
      t.equal(options.title, "Twisted Stream Technologies");
      t.ok(Array.isArray(options.poweredBys));
      t.ok(options.poweredBys.length);
      for (const pb of options.poweredBys) {
        t.ok(pb.name);
        t.ok(pb.url);
      }
    });
  });
});
