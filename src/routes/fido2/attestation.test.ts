import base64 from "@hexagon/base64";
import { Express } from "express";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { test } from "tap";

import { StatusCodes } from "http-status-codes";
import { ValidationError } from "../../types/error";
import {
  testCredential1,
  testNowDate,
  testUser1,
} from "../../utils/testing/data";
import {
  createTestExpressApp,
  verifyFido2SuccessResponse,
  verifyRequest,
  verifyServerErrorFido2ServerResponse,
  verifyUserErrorFido2ServerResponse,
} from "../../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type AttestationTestExpressAppOptions = {
  withAuth?: boolean;
  suppressErrorOutput?: boolean;
};

// test objects

const testValidatedCredential = {
  ...testCredential1,
  credentialID: base64.toArrayBuffer(testCredential1.credentialID, true),
  credentialPublicKey: base64.toArrayBuffer(
    testCredential1.credentialPublicKey,
    true
  ),
};

const testRegistration = {
  registeringUser: { ...testUser1 },
  challenge: "CHALLENGE!",
};

const expressRouter = {
  post: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const logger = {
  debug: sinon.fake(),
  warn: sinon.fake(),
  info: sinon.fake(),
};
const nowFake = sinon.fake.returns(testNowDate);
const newUserStub = sinon.stub();
const fetchUserByIdStub = sinon.stub();
const fetchCredentialsByUserIdStub = sinon.stub();
const fetchUserByNameStub = sinon.stub();
const generateRegistrationOptionsStub = sinon.stub();
const beginSignupFake = sinon.fake();
const verifyRegistrationResponseStub = sinon.stub();
const registerUserStub = sinon.stub();
const signInFake = sinon.fake();
const addUserCredentialFake = sinon.fake();
const fetchCredentialByIdStub = sinon.stub();
const getReturnToStub = sinon.stub();
const getRegistrationStub = sinon.stub();

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
    dependencies["../../utils/time"] = { now: nowFake };
    dependencies["../../utils/logger"] = { logger };
    dependencies["../../services/user"] = {
      newUser: newUserStub,
      fetchUserById: fetchUserByIdStub,
      fetchCredentialsByUserId: fetchCredentialsByUserIdStub,
      fetchUserByName: fetchUserByNameStub,
      registerUser: registerUserStub,
      addUserCredential: addUserCredentialFake,
      fetchCredentialById: fetchCredentialByIdStub,
    };
    dependencies["@simplewebauthn/server"] = {
      generateRegistrationOptions: generateRegistrationOptionsStub,
      verifyRegistrationResponse: verifyRegistrationResponseStub,
    };
    dependencies["../../utils/config"] = {
      baseUrl: "https://example.com",
      companyName: "Example, Inc.",
      rpID: "example.com",
    };
    dependencies["../../utils/auth"] = {
      beginSignup: beginSignupFake,
      signIn: signInFake,
      getReturnTo: getReturnToStub,
      getRegistration: getRegistrationStub,
    };
  }

  const { default: router } = test.mock("./attestation", dependencies);

  return router;
}

function createAttestationTestExpressApp(
  test: Tap.Test,
  { withAuth, suppressErrorOutput }: AttestationTestExpressAppOptions = {}
) {
  const attestation = importModule(test, { mockModules: true });

  return createTestExpressApp({
    authSetup: withAuth
      ? {
          originalUrl: "/",
          activeUser: { ...testUser1 },
          activeCredential: { ...testCredential1 },
        }
      : undefined,
    middlewareSetup: (app) => {
      app.use(attestation);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../routes/fido2/error-handler",
      suppressErrorOutput,
    },
  });
}

function performOptionsPostRequest(app: Express): SuperTest {
  return request(app)
    .post("/options")
    .set("Content-Type", "application/json")
    .accept("application/json");
}

function performResultPostRequest(app: Express): SuperTest {
  return request(app)
    .post("/result")
    .set("Content-Type", "application/json")
    .accept("application/json");
}

// tests

test("routes/fido2/attestation", async (t) => {
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
      expressRouter.post.getCalls().map((c) => c.firstArg),
      ["/options", "/result"]
    );
  });

  t.test("POST /options", async (t) => {
    t.test("if active user session", async (t) => {
      t.test("fetches exiting user by ID", async (t) => {
        newUserStub.returns({});
        fetchUserByIdStub.resolves({});
        fetchCredentialsByUserIdStub.resolves([{ ...testCredential1 }]);

        const { app } = createAttestationTestExpressApp(t, {
          withAuth: true,
        });
        await performOptionsPostRequest(app);

        t.ok(fetchUserByIdStub.called);
        t.same(fetchUserByIdStub.firstCall.firstArg, "123abc");
      });

      t.test(
        "if user that doesn't actually exist, renders JSON with expected user error",
        async (t) => {
          newUserStub.returns({});
          fetchUserByIdStub.resolves();

          const { app } = createAttestationTestExpressApp(t, {
            withAuth: true,
          });
          const response = await performOptionsPostRequest(app);

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.BAD_REQUEST,
            "User with ID 123abc no longer exists"
          );
        }
      );

      t.test("fetches user's existing credentials", async (t) => {
        newUserStub.returns({});
        fetchUserByIdStub.resolves({});
        fetchCredentialsByUserIdStub.resolves([{ ...testCredential1 }]);

        const { app } = createAttestationTestExpressApp(t, {
          withAuth: true,
        });
        await performOptionsPostRequest(app);

        t.ok(fetchCredentialsByUserIdStub.called);
        t.equal(fetchCredentialsByUserIdStub.firstCall.firstArg, "123abc");
      });

      t.test(
        "if no credentials of existing user, render JSON with expected server error",
        async (t) => {
          newUserStub.returns({});
          fetchUserByIdStub.resolves({});
          fetchCredentialsByUserIdStub.resolves([]);

          const { app } = createAttestationTestExpressApp(t, {
            withAuth: true,
            suppressErrorOutput: true,
          });
          const response = await performOptionsPostRequest(app);

          verifyServerErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      );
    });

    t.test("if no active user session", async (t) => {
      t.test("instantiates a new user", async (t) => {
        newUserStub.returns({});

        const { app } = createAttestationTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
          displayName: "Bob User",
        });

        t.ok(newUserStub.called);
        t.equal(newUserStub.firstCall.args[0], "bob");
        t.equal(newUserStub.firstCall.args[1], "Bob User");
      });

      t.test(
        "if a validation error occurs while instantiating a user, renders JSON with expected user error",
        async (t) => {
          newUserStub.throws(
            new ValidationError("User", "username", "Sorry, can't do it")
          );

          const { app } = createAttestationTestExpressApp(t);
          const response = await performOptionsPostRequest(app);

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.BAD_REQUEST,
            "User: username: Sorry, can't do it"
          );
        }
      );

      t.test(
        "if an unknown error occurs while instantiating a user, renders JSON with expected server error",
        async (t) => {
          newUserStub.throws(new Error("BOOM!"));

          const { app } = createAttestationTestExpressApp(t, {
            suppressErrorOutput: true,
          });
          const response = await performOptionsPostRequest(app);

          verifyServerErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      );

      t.test("fetches exiting user by specified username", async (t) => {
        newUserStub.returns({});
        fetchUserByNameStub.resolves({});

        const { app } = createAttestationTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(fetchUserByNameStub.called);
        t.equal(fetchUserByNameStub.firstCall.firstArg, "bob");
      });

      t.test(
        "if user exists with same username, renders JSON with expected user error",
        async (t) => {
          newUserStub.returns({});
          fetchUserByNameStub.resolves({});

          const { app } = createAttestationTestExpressApp(t);
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.BAD_REQUEST,
            "A user with username 'bob' already exists"
          );
        }
      );
    });

    t.test("generates registration options", async (t) => {
      newUserStub.returns({});
      fetchUserByIdStub.resolves({
        id: "123abc",
        username: "bob",
        displayName: "Bob User",
      });
      fetchCredentialsByUserIdStub.resolves([{ ...testCredential1 }]);
      generateRegistrationOptionsStub.returns({});

      const { app } = createAttestationTestExpressApp(t, { withAuth: true });
      await performOptionsPostRequest(app).send({
        attestation: "platform",
      });

      t.ok(generateRegistrationOptionsStub.called);
      t.same(generateRegistrationOptionsStub.firstCall.firstArg, {
        rpName: "Example, Inc.",
        rpID: "example.com",
        userID: "123abc",
        userName: "bob",
        userDisplayName: "Bob User",
        attestationType: "platform",
        excludeCredentials: [
          {
            id: base64.toArrayBuffer(testCredential1.credentialID, true),
            type: "public-key",
            transports: testCredential1.transports
              ? [...testCredential1.transports]
              : [],
          },
        ],
      });
    });

    t.test("begins sign up", async (t) => {
      const registeringUser = {};
      newUserStub.returns(registeringUser);
      fetchUserByNameStub.resolves();
      generateRegistrationOptionsStub.returns({
        challenge: "CHALLENGE!",
      });

      const { app } = createAttestationTestExpressApp(t);
      await performOptionsPostRequest(app);

      t.ok(beginSignupFake.called);
      verifyRequest(t, beginSignupFake.firstCall.args[0], {
        url: "/options",
        method: "POST",
      });
      t.equal(beginSignupFake.firstCall.args[1], "CHALLENGE!");
      t.equal(beginSignupFake.firstCall.args[2], registeringUser);
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        const registeringUser = {};
        newUserStub.returns(registeringUser);
        fetchUserByNameStub.resolves();
        generateRegistrationOptionsStub.returns({
          challenge: "CHALLENGE!",
        });

        const { app } = createAttestationTestExpressApp(t);
        const response = await performOptionsPostRequest(app);

        verifyFido2SuccessResponse(t, response, {
          challenge: "CHALLENGE!",
        });
      }
    );
  });

  t.test("POST /result", async (t) => {
    t.test(
      "if credential ID is missing from request, renders JSON with expected user error",
      async (t) => {
        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          response: {},
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "Missing: credential ID"
        );
      }
    );

    t.test(
      "if authentication response is missing from request, renders JSON with expected user error",
      async (t) => {
        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "Missing: authentication response"
        );
      }
    );

    t.test("gets the registration state", async (t) => {
      getRegistrationStub.returns({});
      verifyRegistrationResponseStub.returns({
        registrationInfo: { ...testValidatedCredential },
      });
      fetchCredentialByIdStub.resolves({
        ...testCredential1,
        created: testNowDate,
        user: { ...testUser1 },
      });

      const { app } = createAttestationTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential1.credentialID,
        response: {},
      });

      t.ok(getRegistrationStub.called);
      verifyRequest(t, getRegistrationStub.firstCall.firstArg, {
        url: "/result",
        method: "POST",
      });
    });

    t.test(
      "if registration state is missing, renders JSON with expected user error",
      async (t) => {
        getRegistrationStub.returns(undefined);

        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
          response: {},
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "No active registration"
        );
      }
    );

    t.test("verifies registration response", async (t) => {
      getRegistrationStub.returns(testRegistration);
      verifyRegistrationResponseStub.returns({
        registrationInfo: { ...testValidatedCredential },
      });
      fetchCredentialByIdStub.resolves({
        ...testCredential1,
        created: testNowDate,
        user: { ...testUser1 },
      });

      const { app } = createAttestationTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential1.credentialID,
        response: {
          transports: ["ble", "usb"],
        },
      });

      t.ok(verifyRegistrationResponseStub.called);
      t.same(verifyRegistrationResponseStub.firstCall.firstArg, {
        response: {
          id: testCredential1.credentialID,
          response: {
            transports: ["ble", "usb"],
          },
        },
        expectedChallenge: "CHALLENGE!",
        expectedOrigin: "https://example.com",
        expectedRPID: "example.com",
      });
    });

    t.test(
      "if registration response verification fails, renders JSON with expected user error",
      async (t) => {
        getRegistrationStub.returns(testRegistration);
        const err = new Error("BOOM!");
        verifyRegistrationResponseStub.throws(err);

        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
          response: {},
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "Registration failed: BOOM!"
        );
        // test for warning log message
        t.ok(logger.warn.called);
        t.equal(logger.warn.firstCall.args[0], err);
        t.match(logger.warn.firstCall.args[1], "Registration error");
      }
    );

    t.test("if active user session", async (t) => {
      t.test("adds credential to existing user", async (t) => {
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });

        const { app } = createAttestationTestExpressApp(t, { withAuth: true });
        await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(addUserCredentialFake.called);
        t.equal(addUserCredentialFake.firstCall.args[0], "123abc");
        t.same(addUserCredentialFake.firstCall.args[1], {
          ...testCredential1,
          created: testNowDate,
        });
      });
    });

    t.test("if no active user session", async (t) => {
      t.test("registers new user with credential", async (t) => {
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        fetchCredentialByIdStub.resolves({
          ...testCredential1,
          created: testNowDate,
          user: { ...testUser1 },
        });

        const { app } = createAttestationTestExpressApp(t);
        await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(registerUserStub.called);
        t.same(registerUserStub.firstCall.args[0], { ...testUser1 });
        t.same(registerUserStub.firstCall.args[1], {
          ...testCredential1,
          created: testNowDate,
        });
      });

      t.test("fetches registered credential", async (t) => {
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        fetchCredentialByIdStub.resolves({
          ...testCredential1,
          created: testNowDate,
          user: { ...testUser1 },
        });

        const { app } = createAttestationTestExpressApp(t);
        await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(fetchCredentialByIdStub.called);
        t.equal(
          fetchCredentialByIdStub.firstCall.firstArg,
          testCredential1.credentialID
        );
      });

      t.test("performs sign-in", async (t) => {
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        const user = {};
        registerUserStub.resolves(user);
        fetchCredentialByIdStub.resolves({
          ...testCredential1,
          created: testNowDate,
          user: { ...testUser1 },
        });

        const { app } = createAttestationTestExpressApp(t);
        await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(signInFake.called);
        verifyRequest(t, signInFake.firstCall.args[0], {
          url: "/result",
          method: "POST",
        });
        t.same(signInFake.firstCall.args[1], {
          ...testCredential1,
          created: testNowDate,
          user: { ...testUser1 },
        });
      });
    });

    t.test("gets return to URL", async (t) => {
      getRegistrationStub.returns(testRegistration);
      verifyRegistrationResponseStub.returns({
        registrationInfo: { ...testValidatedCredential },
      });
      fetchCredentialByIdStub.resolves({
        ...testCredential1,
        created: testNowDate,
        user: { ...testUser1 },
      });

      const { app } = createAttestationTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential1.credentialID,
        response: {},
      });

      t.ok(getReturnToStub.called);
      verifyRequest(t, getReturnToStub.firstCall.firstArg, {
        url: "/result",
        method: "POST",
      });
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        fetchCredentialByIdStub.resolves({
          ...testCredential1,
          created: testNowDate,
          user: { ...testUser1 },
        });
        getReturnToStub.returns("/foo");

        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential1.credentialID,
          response: {},
        });

        verifyFido2SuccessResponse(t, response, {
          return_to: "/foo",
        });
      }
    );
  });
});
