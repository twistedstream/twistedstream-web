import { Express } from "express";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { test } from "tap";

import { DateTime } from "luxon";
import { ValidationError } from "../types/error";
import { testCredential1, testUser1 } from "../utils/testing/data";
import {
  createTestExpressApp,
  verifyAuthenticationRequiredResponse,
} from "../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type ProfileTestExpressAppOptions = {
  withAuth?: boolean;
  suppressErrorOutput?: boolean;
};

// test objects

const expressRouter = {
  get: sinon.fake(),
  post: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const fetchCredentialsByUserIdStub = sinon.stub();
const modifyUserStub = sinon.stub();
const removeUserCredentialStub = sinon.stub();

// helpers

function importModule(
  test: Tap.Test,
  { mockExpress = false, mockModules = false }: MockOptions = {}
) {
  const dependencies: any = {};
  if (mockExpress) {
    dependencies.express = {
      Router: routerFake,
    };
  }
  if (mockModules) {
    dependencies["../services/user"] = {
      fetchCredentialsByUserId: fetchCredentialsByUserIdStub,
      modifyUser: modifyUserStub,
      removeUserCredential: removeUserCredentialStub,
    };
  }

  const { default: router } = test.mock("./profile", dependencies);

  return router;
}

function createProfileTestExpressApp(
  test: Tap.Test,
  { withAuth, suppressErrorOutput }: ProfileTestExpressAppOptions = {}
) {
  const profile = importModule(test, { mockModules: true });

  return createTestExpressApp({
    authSetup: withAuth
      ? {
          originalUrl: "/",
          activeUser: { ...testUser1 },
          activeCredential: { ...testCredential1 },
        }
      : undefined,
    middlewareSetup: (app) => {
      app.use(profile);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../error-handler",
      suppressErrorOutput,
    },
  });
}

function performGetRequest(app: Express): SuperTest {
  return request(app).get("/");
}

function performPostRequest(app: Express): SuperTest {
  return request(app)
    .post("/")
    .set("Content-Type", "application/x-www-form-urlencoded");
}

// tests

test("routes/profile", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const profile = importModule(t, { mockExpress: true });

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(profile, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule(t, { mockExpress: true });

    t.same(
      expressRouter.get.getCalls().map((c) => c.firstArg),
      ["/"]
    );
    t.same(
      expressRouter.post.getCalls().map((c) => c.firstArg),
      ["/"]
    );
  });

  t.test("GET /", async (t) => {
    t.test("requires authenticated session", async (t) => {
      const { app } = createProfileTestExpressApp(t);

      const response = await performGetRequest(app);
      verifyAuthenticationRequiredResponse(t, response);
    });

    t.test("renders HTML with expected view state", async (t) => {
      fetchCredentialsByUserIdStub.withArgs("123abc").resolves([
        { ...testCredential1 },
        {
          credentialID: "987zyx",
          credentialDeviceType: "multiDevice",
          created: DateTime.fromObject({
            year: 2023,
            month: 3,
            day: 1,
          }).toUTC(),
        },
      ]);

      const { app, renderArgs } = createProfileTestExpressApp(t, {
        withAuth: true,
      });

      const response = await performGetRequest(app);
      const { viewName, options } = renderArgs;

      t.equal(response.status, 200);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "profile");
      t.equal(options.title, "Profile");
      t.same(options.profile, {
        id: testUser1.id,
        created: testUser1.created,
        username: testUser1.username,
        displayName: testUser1.displayName,
        isAdmin: testUser1.isAdmin,
        activePasskey: {
          id: testCredential1.credentialID,
          type: "multiDevice",
          created: "2023-02-01T06:00:00.000Z",
        },
        otherPasskeys: [
          {
            id: "987zyx",
            type: "multiDevice",
            created: "2023-03-01T06:00:00.000Z",
          },
        ],
      });
    });
  });

  t.test("POST /", async (t) => {
    t.test("requires authenticated session", async (t) => {
      const { app } = createProfileTestExpressApp(t);

      const response = await request(app).post("/");
      verifyAuthenticationRequiredResponse(t, response);
    });

    t.test("user update", async (t) => {
      t.test(
        "if a validation error occurs while updating profile, renders HTML with expected user error",
        async (t) => {
          modifyUserStub.rejects(
            new ValidationError("User", "displayName", "Sorry, can't do it")
          );

          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
          });

          const response = await performPostRequest(app).send({
            action: "update_profile",
            display_name: "Bad Bob",
          });
          const { viewName, options } = renderArgs;

          t.same(modifyUserStub.firstCall.firstArg, {
            id: testUser1.id,
            created: testUser1.created,
            username: testUser1.username,
            displayName: "Bad Bob",
            isAdmin: testUser1.isAdmin,
          });
          t.equal(response.status, 400);
          t.match(response.headers["content-type"], "text/html");
          t.equal(viewName, "error");
          t.equal(options.title, "Error");
          t.equal(
            options.message,
            "Bad Request: User: displayName: Sorry, can't do it"
          );
        }
      );

      t.test(
        "if an unknown error occurs while updating profile, renders HTML with expected server error",
        async (t) => {
          modifyUserStub.rejects(new Error("BOOM!"));

          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
            suppressErrorOutput: true,
          });

          const response = await performPostRequest(app).send({
            action: "update_profile",
            display_name: "Bad Bob",
          });
          const { viewName, options } = renderArgs;

          t.same(modifyUserStub.firstCall.firstArg, {
            id: testUser1.id,
            created: testUser1.created,
            username: testUser1.username,
            displayName: "Bad Bob",
            isAdmin: testUser1.isAdmin,
          });
          t.equal(response.status, 500);
          t.match(response.headers["content-type"], "text/html");
          t.equal(viewName, "error");
          t.equal(options.title, "Error");
          t.equal(options.message, "Something unexpected happened");
        }
      );

      t.test(
        "if successful, updates profile and responds with expected redirect",
        async (t) => {
          modifyUserStub.resolves();

          const { app } = createProfileTestExpressApp(t, { withAuth: true });

          const response = await performPostRequest(app).send({
            action: "update_profile",
            display_name: "Good Bob",
          });

          t.same(modifyUserStub.firstCall.firstArg, {
            id: testUser1.id,
            created: testUser1.created,
            username: testUser1.username,
            displayName: "Good Bob",
            isAdmin: false,
          });
          t.equal(response.status, 302);
          t.equal(response.headers.location, "/");
        }
      );
    });

    t.test("credential deletion", async (t) => {
      t.test(
        "if attempting to delete current credential, renders HTML with expected user error",
        async (t) => {
          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
          });

          const response = await performPostRequest(app).send({
            action: "delete_cred",
            cred_id: testCredential1.credentialID,
          });
          const { viewName, options } = renderArgs;

          t.equal(response.status, 400);
          t.match(response.headers["content-type"], "text/html");
          t.equal(viewName, "error");
          t.equal(options.title, "Error");
          t.equal(
            options.message,
            "Bad Request: Cannot delete credential that was used to sign into the current session"
          );
        }
      );

      t.test(
        "if successful, updates profile and responds with expected redirect",
        async (t) => {
          removeUserCredentialStub.resolves();

          const { app } = createProfileTestExpressApp(t, { withAuth: true });

          const response = await performPostRequest(app).send({
            action: "delete_cred",
            cred_id: "987zxy",
          });

          t.equal(removeUserCredentialStub.firstCall.args[0], "123abc");
          t.equal(removeUserCredentialStub.firstCall.args[1], "987zxy");
          t.equal(response.status, 302);
          t.equal(response.headers.location, "/");
        }
      );
    });

    t.test(
      "if unsupported profile operation, renders HTML with expected user error",
      async (t) => {
        const { app, renderArgs } = createProfileTestExpressApp(t, {
          withAuth: true,
        });

        const response = await performPostRequest(app).send({
          action: "burn_toast",
        });
        const { viewName, options } = renderArgs;

        t.equal(response.status, 400);
        t.match(response.headers["content-type"], "text/html");
        t.equal(viewName, "error");
        t.equal(options.title, "Error");
        t.equal(options.message, "Bad Request: Unsupported profile action");
      }
    );
  });
});
