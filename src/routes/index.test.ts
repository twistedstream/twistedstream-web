import { test } from "tap";
import request from "supertest";
import express from "express";

import routes from "./index";

test("routes", async (t) => {
  const testApp = express();
  testApp.use(routes);

  t.test("GET /", async (t) => {
    t.test("returns 200 with expected text", async (t) => {
      const response = await request(testApp).get("/");

      t.equal(response.status, 200);
      t.match(response.headers["content-type"], "text/html");
      t.same(response.text, "Express + TypeScript Server");
    });
  });
});
