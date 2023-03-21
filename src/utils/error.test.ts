import { test } from "tap";

import {
  ErrorWithStatusCode,
  generateCorrelationId,
  NotFoundError,
} from "./error";

test("utils/error", async (t) => {
  t.test("generateCorrelationId", async (t) => {
    t.test("returns a 25 character string", async (t) => {
      const result = generateCorrelationId();

      t.ok(result);
      t.equal(result.length, 25);
    });

    t.test("returns a unique value on each call", async (t) => {
      const result1 = generateCorrelationId();
      const result2 = generateCorrelationId();

      t.not(result1, result2);
    });
  });

  t.test("ErrorWithStatusCode", async (t) => {
    t.test("constructor creates expected error", async (t) => {
      t.test("when message is provided", async (t) => {
        const error = new ErrorWithStatusCode(500, "foo");
        t.equal(error.message, "Internal Server Error: foo");
        t.equal(error.statusCode, 500);
      });

      t.test("when message is not provided", async (t) => {
        const error = new ErrorWithStatusCode(500);
        t.equal(error.message, "Internal Server Error");
        t.equal(error.statusCode, 500);
      });
    });
  });

  t.test("NotFoundError", async (t) => {
    t.test("returns expected error object", async (t) => {
      const error = NotFoundError();
      t.equal(error.message, "Not Found");
      t.equal(error.statusCode, 404);
    });
  });
});
