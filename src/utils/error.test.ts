import { test } from "tap";
import sinon from "sinon";

import {
  BadRequestError,
  ErrorWithStatusCode,
  generateCorrelationId,
  NotFoundError,
  UnauthorizedError,
  renderFido2ServerErrorResponse,
  assert,
} from "./error";
import { StatusCodes } from "http-status-codes";

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

  t.test("BadRequestError", async (t) => {
    t.test("returns expected error object", async (t) => {
      const error = BadRequestError("Dang it!");
      t.equal(error.message, "Bad Request: Dang it!");
      t.equal(error.statusCode, 400);
    });
  });

  t.test("UnauthorizedError", async (t) => {
    t.test("returns expected error object", async (t) => {
      const error = UnauthorizedError();
      t.equal(error.message, "Unauthorized");
      t.equal(error.statusCode, 401);
    });
  });

  t.test("renderFido2ServerErrorResponse", async (t) => {
    t.test("renders the expected response", async (t) => {
      const statusResponse: any = {
        json: sinon.fake(),
      };
      const res: any = {
        status: sinon.fake.returns(statusResponse),
      };

      renderFido2ServerErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "What'd you do?"
      );

      t.ok(res.status.called);
      t.equal(res.status.firstCall.firstArg, StatusCodes.BAD_REQUEST);
      t.ok(statusResponse.json.called);
      t.same(statusResponse.json.firstCall.firstArg, {
        status: "failed",
        errorMessage: "What'd you do?",
      });
    });
  });

  t.test("assert", async (t) => {
    t.test("throws if value is undefined", async (t) => {
      t.throws(() => assert(undefined), "Unexpected undefined value");
    });

    t.test("throws if value is null", async (t) => {
      t.throws(() => assert(null), "Unexpected null value");
    });

    t.test("returns real value", async (t) => {
      const value = {};

      const result = assert(value);

      t.equal(result, value);
    });
  });
});
