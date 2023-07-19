import base64 from "@hexagon/base64";
import { CredentialDeviceType } from "@simplewebauthn/typescript-types";
import crypto from "crypto";
import { Express } from "express";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { test } from "tap";

import { ValidationError } from "../types/error";
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

const testUser = {
  id: "123abc",
  username: "bob",
  displayName: "Bob User",
};

const testCredential = {
  created: new Date(2023, 1, 1),
  credentialID: base64.fromArrayBuffer(crypto.randomBytes(8).buffer, true),
  credentialPublicKey: base64.fromArrayBuffer(
    crypto.randomBytes(42).buffer,
    true
  ),
  counter: 42,
  aaguid: "AUTH_GUID",
  credentialDeviceType: <CredentialDeviceType>"singleDevice",
  credentialBackedUp: false,
};

const expressRouter = {
  get: sinon.fake(),
  post: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const fetchCredentialsByUserIdStub = sinon.stub();
const updateUserStub = sinon.stub();
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
      updateUser: updateUserStub,
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
          activeUser: { ...testUser },
          activeCredential: { ...testCredential },
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
        { ...testCredential },
        {
          credentialID: "987zyx",
          credentialDeviceType: "multiDevice",
          created: new Date(2023, 2, 1),
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
        id: "123abc",
        username: "bob",
        displayName: "Bob User",
        activePasskey: {
          id: testCredential.credentialID,
          type: "singleDevice",
          created: new Date(2023, 1, 1),
        },
        otherPasskeys: [
          {
            id: "987zyx",
            type: "multiDevice",
            created: new Date(2023, 2, 1),
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
          updateUserStub.rejects(
            new ValidationError("User", "displayName", "Sorry, can't do it")
          );

          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
          });

          const response = await performPostRequest(app).send({
            update: "profile",
            display_name: "Bad Bob",
          });
          const { viewName, options } = renderArgs;

          t.same(updateUserStub.firstCall.firstArg, {
            id: "123abc",
            username: "bob",
            displayName: "Bad Bob",
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
          updateUserStub.rejects(new Error("BOOM!"));

          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
            suppressErrorOutput: true,
          });

          const response = await performPostRequest(app).send({
            update: "profile",
            display_name: "Bad Bob",
          });
          const { viewName, options } = renderArgs;

          t.same(updateUserStub.firstCall.firstArg, {
            id: "123abc",
            username: "bob",
            displayName: "Bad Bob",
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
          updateUserStub.resolves();

          const { app } = createProfileTestExpressApp(t, { withAuth: true });

          const response = await performPostRequest(app).send({
            update: "profile",
            display_name: "Good Bob",
          });

          t.same(updateUserStub.firstCall.firstArg, {
            id: "123abc",
            username: "bob",
            displayName: "Good Bob",
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
            delete_cred: testCredential.credentialID,
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
            delete_cred: "987zxy",
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

        const response = await performPostRequest(app).send({ foo: "bar" });
        const { viewName, options } = renderArgs;

        t.equal(response.status, 400);
        t.match(response.headers["content-type"], "text/html");
        t.equal(viewName, "error");
        t.equal(options.title, "Error");
        t.equal(options.message, "Bad Request: Unsupported profile operation");
      }
    );
  });
});
