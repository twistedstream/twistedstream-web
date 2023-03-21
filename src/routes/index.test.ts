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

  t.test("GET /linkedin", async (t) => {
    t.test("returns 302 with expected redirect", async (t) => {
      const renderArgs: ViewRenderArgs = {};
      const app = createTestExpressApp(renderArgs);
      app.use(routes);

      const response = await request(app).get("/linkedin");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://linkedin.com/in/test");
    });
  });

  t.test("GET /twitter", async (t) => {
    t.test("returns 302 with expected redirect", async (t) => {
      const renderArgs: ViewRenderArgs = {};
      const app = createTestExpressApp(renderArgs);
      app.use(routes);

      const response = await request(app).get("/twitter");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://twitter.com/test");
    });
  });

  t.test("GET /github", async (t) => {
    t.test("returns 302 with expected redirect", async (t) => {
      const renderArgs: ViewRenderArgs = {};
      const app = createTestExpressApp(renderArgs);
      app.use(routes);

      const response = await request(app).get("/github");

      t.equal(response.status, 302);
      t.equal(response.headers.location, "https://github.com/test");
    });
  });
});
