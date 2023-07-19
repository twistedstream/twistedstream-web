import { test } from "tap";

import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  ErrorWithStatusCode,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  assertValue,
  buildErrorHandlerData,
} from "./error";

test("utils/error", async (t) => {
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

  t.test("ForbiddenError", async (t) => {
    t.test("returns expected error object", async (t) => {
      const error = ForbiddenError("Not a chance!");
      t.equal(error.message, "Forbidden: Not a chance!");
      t.equal(error.statusCode, 403);
    });
  });

  t.test("assertValue", async (t) => {
    t.test("throws if value is undefined", async (t) => {
      t.throws(() => assertValue(undefined), "Unexpected undefined value");
    });

    t.test("throws if value is null", async (t) => {
      t.throws(() => assertValue(null), "Unexpected null value");
    });

    t.test("returns real value", async (t) => {
      const value = {};

      const result = assertValue(value);

      t.equal(result, value);
    });
  });

  t.test("buildErrorHandlerData", async (t) => {
    t.test("status code", async (t) => {
      t.test("is extracted from the error", async (t) => {
        const result = buildErrorHandlerData(
          new ErrorWithStatusCode(StatusCodes.NOT_ACCEPTABLE)
        );

        t.equal(result.statusCode, StatusCodes.NOT_ACCEPTABLE);
      });

      t.test("defaults to an internal server error", async (t) => {
        const result = buildErrorHandlerData(new Error("BOOM!"));

        t.equal(result.statusCode, StatusCodes.INTERNAL_SERVER_ERROR);
      });
    });

    t.test("server errors", async (t) => {
      t.test("generates expected message", async (t) => {
        const result = buildErrorHandlerData(
          new ErrorWithStatusCode(StatusCodes.INTERNAL_SERVER_ERROR)
        );

        t.equal(result.message, "Something unexpected happened");
      });

      t.test("generates a correlation ID with expected format", async (t) => {
        const result = buildErrorHandlerData(
          new ErrorWithStatusCode(StatusCodes.INTERNAL_SERVER_ERROR)
        );

        t.equal(result.correlation_id?.length, 25);
      });

      t.test("generates unique correlation IDs", async (t) => {
        const result1 = buildErrorHandlerData(
          new ErrorWithStatusCode(StatusCodes.INTERNAL_SERVER_ERROR)
        );
        const result2 = buildErrorHandlerData(
          new ErrorWithStatusCode(StatusCodes.INTERNAL_SERVER_ERROR)
        );

        t.not(result1, result2);
      });
    });

    t.test("other errors", async (t) => {
      t.test("generates expected message", async (t) => {
        const result = buildErrorHandlerData(
          new ErrorWithStatusCode(
            StatusCodes.NOT_ACCEPTABLE,
            "This is a no go."
          )
        );

        t.match(result.message, "This is a no go.");
      });

      t.test("does not generate a correlation ID", async (t) => {
        const result = buildErrorHandlerData(
          new ErrorWithStatusCode(StatusCodes.NOT_ACCEPTABLE)
        );

        t.notOk(result.correlation_id);
      });
    });
  });
});
