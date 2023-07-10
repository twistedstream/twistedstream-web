import { test } from "tap";
import sinon from "sinon";
import request from "supertest";
import { CredentialDeviceType } from "@simplewebauthn/typescript-types";

import {
  verifyAuthenticationRequiredResponse,
  createTestExpressApp,
} from "../utils/testing";
import { ValidationError } from "../types/error";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

const activeCredential = {
  created: new Date(2023, 1, 1),
  credentialID: "789xyz",
  credentialPublicKey: "PUB_KEY",
  counter: 42,
  aaguid: "AUTH_GUID",
  credentialDeviceType: <CredentialDeviceType>"singleDevice",
  credentialBackedUp: false,
};

test("routes/profile", async (t) => {
  const expressRouter = {
    get: sinon.fake(),
    post: sinon.fake(),
  };
  const routerFake = sinon.fake.returns(expressRouter);
  const fetchCredentialsByUserIdStub = sinon.stub();
  const updateUserStub = sinon.stub();
  const removeUserCredentialStub = sinon.stub();

  function importModule({
    mockExpress = false,
    mockModules = false,
  }: MockOptions = {}) {
    expressRouter.get.resetHistory();
    expressRouter.post.resetHistory();
    routerFake.resetHistory();
    fetchCredentialsByUserIdStub.resetHistory();
    updateUserStub.resetHistory();
    removeUserCredentialStub.resetHistory();

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

    const { default: router } = t.mock("./profile", dependencies);

    return router;
  }

  t.test("is a Router instance", async (t) => {
    const profile = importModule({ mockExpress: true });

    t.ok(routerFake.called);
    t.same(routerFake.firstCall.args, []);
    t.equal(profile, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule({ mockExpress: true });

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
      const profile = importModule();
      const { app } = createTestExpressApp({
        middlewareSetup: (app) => app.use(profile),
        errorHandlerSetup: { test: t },
      });

      const response = await request(app).get("/");
      verifyAuthenticationRequiredResponse(t, response);
    });

    t.test("renders HTML with expected view state", async (t) => {
      fetchCredentialsByUserIdStub.withArgs("123abc").resolves([
        { ...activeCredential },
        {
          credentialID: "987zyx",
          credentialDeviceType: "multiDevice",
          created: new Date(2023, 2, 1),
        },
      ]);

      const profile = importModule({ mockModules: true });
      const { app, renderArgs } = createTestExpressApp({
        authSetup: {
          originalUrl: "/",
          user: { id: "123abc", username: "bob", displayName: "Bob User" },
          credential: activeCredential,
        },
        middlewareSetup: (app) => app.use(profile),
        errorHandlerSetup: { test: t },
      });

      const response = await request(app).get("/");
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
          id: "789xyz",
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
      const profile = importModule();
      const { app } = createTestExpressApp({
        middlewareSetup: (app) => app.use(profile),
        errorHandlerSetup: { test: t },
      });

      const response = await request(app).post("/");
      verifyAuthenticationRequiredResponse(t, response);
    });

    t.test("user update", async (t) => {
      t.test(
        "renders HTML with expected user error if a validation error occurs while updating profile",
        async (t) => {
          updateUserStub.rejects(
            new ValidationError("User", "displayName", "Sorry, can't do it")
          );

          const profile = importModule({ mockModules: true });
          const { app, renderArgs } = createTestExpressApp({
            authSetup: {
              originalUrl: "/",
              user: { id: "123abc", username: "bob", displayName: "Bob User" },
              credential: activeCredential,
            },
            middlewareSetup: (app) => app.use(profile),
            errorHandlerSetup: { test: t },
          });

          const response = await request(app)
            .post("/")
            .send("update=profile&display_name=Bad+Bob");
          const { viewName, options } = renderArgs;

          t.same(updateUserStub.firstCall.args, [
            {
              id: "123abc",
              username: "bob",
              displayName: "Bad Bob",
            },
          ]);
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
        "renders HTML with expected server error if an unknown error occurs while updating profile",
        async (t) => {
          updateUserStub.rejects(new Error("BOOM!"));

          const profile = importModule({ mockModules: true });
          const { app, renderArgs } = createTestExpressApp({
            authSetup: {
              originalUrl: "/",
              user: { id: "123abc", username: "bob", displayName: "Bob User" },
              credential: activeCredential,
            },
            middlewareSetup: (app) => app.use(profile),
            errorHandlerSetup: { test: t },
          });

          const response = await request(app)
            .post("/")
            .send("update=profile&display_name=Bad+Bob");
          const { viewName, options } = renderArgs;

          t.same(updateUserStub.firstCall.args, [
            {
              id: "123abc",
              username: "bob",
              displayName: "Bad Bob",
            },
          ]);
          t.equal(response.status, 500);
          t.match(response.headers["content-type"], "text/html");
          t.equal(viewName, "error");
          t.equal(options.title, "Error");
          t.equal(options.message, "Something unexpected happened");
        }
      );

      t.test(
        "updates profile and responds with expected redirect",
        async (t) => {
          updateUserStub.resolves();

          const profile = importModule({ mockModules: true });
          const { app } = createTestExpressApp({
            authSetup: {
              originalUrl: "/",
              user: { id: "123abc", username: "bob", displayName: "Bob User" },
              credential: activeCredential,
            },
            middlewareSetup: (app) => app.use(profile),
            errorHandlerSetup: { test: t },
          });

          const response = await request(app)
            .post("/")
            .send("update=profile&display_name=Good+Bob");

          t.same(updateUserStub.firstCall.args, [
            {
              id: "123abc",
              username: "bob",
              displayName: "Good Bob",
            },
          ]);
          t.equal(response.status, 302);
          t.equal(response.headers.location, "/");
        }
      );
    });

    t.test("credential deletion", async (t) => {
      t.test(
        "renders HTML with expected user error if attempting to delete current credential",
        async (t) => {
          const profile = importModule({ mockModules: true });
          const { app, renderArgs } = createTestExpressApp({
            authSetup: {
              originalUrl: "/",
              user: { id: "123abc", username: "bob", displayName: "Bob User" },
              credential: activeCredential,
            },
            middlewareSetup: (app) => app.use(profile),
            errorHandlerSetup: { test: t },
          });

          const response = await request(app)
            .post("/")
            .send("delete_cred=789xyz");
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
        "updates profile and responds with expected redirect",
        async (t) => {
          removeUserCredentialStub.resolves();

          const profile = importModule({ mockModules: true });
          const { app } = createTestExpressApp({
            authSetup: {
              originalUrl: "/",
              user: { id: "123abc", username: "bob", displayName: "Bob User" },
              credential: activeCredential,
            },
            middlewareSetup: (app) => app.use(profile),
            errorHandlerSetup: { test: t },
          });

          const response = await request(app)
            .post("/")
            .send("delete_cred=987zxy");

          t.same(removeUserCredentialStub.firstCall.args, ["123abc", "987zxy"]);
          t.equal(response.status, 302);
          t.equal(response.headers.location, "/");
        }
      );
    });

    t.test(
      "renders HTML with expected user error if unsupported profile operation",
      async (t) => {
        const profile = importModule({ mockModules: true });
        const { app, renderArgs } = createTestExpressApp({
          authSetup: {
            originalUrl: "/",
            user: { id: "123abc", username: "bob", displayName: "Bob User" },
            credential: activeCredential,
          },
          middlewareSetup: (app) => app.use(profile),
          errorHandlerSetup: { test: t },
        });

        const response = await request(app).post("/").send("foo=bar");
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
