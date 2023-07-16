import { test } from "tap";
import sinon from "sinon";
import request, {
  Test as SuperTest,
  Response as SupertestResponse,
} from "supertest";
import { Express } from "express";
import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import base64 from "@hexagon/base64";
import crypto from "crypto";

import {
  createTestExpressApp,
  verifyFido2SuccessResponse,
  verifyRequest,
  verifyServerErrorFido2ServerResponse,
  verifyUserErrorFido2ServerResponse,
} from "../../utils/testing";
import { StatusCodes } from "http-status-codes";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type AssertionTestExpressAppOptions = {
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
  transports: <AuthenticatorTransport[]>["ble", "usb"],
  // associated with test user
  userID: testUser.id,
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
const fetchUserByNameStub = sinon.stub();
const fetchCredentialsByUsernameStub = sinon.stub();
const generateAuthenticationOptionsStub = sinon.stub();
const beginSignInFake = sinon.fake();
const getAuthenticationStub = sinon.stub();
const fetchCredentialByIdStub = sinon.stub();
const fetchUserByIdStub = sinon.stub();
const verifyAuthenticationResponseStub = sinon.stub();
const getReturnToStub = sinon.stub();
const signInFake = sinon.fake();

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
    dependencies["../../utils/logger"] = { logger };
    dependencies["../../services/user"] = {
      fetchUserByName: fetchUserByNameStub,
      fetchCredentialsByUsername: fetchCredentialsByUsernameStub,
      fetchCredentialById: fetchCredentialByIdStub,
      fetchUserById: fetchUserByIdStub,
    };
    dependencies["@simplewebauthn/server"] = {
      generateAuthenticationOptions: generateAuthenticationOptionsStub,
      verifyAuthenticationResponse: verifyAuthenticationResponseStub,
    };
    dependencies["../../utils/config"] = {
      baseUrl: "https://example.com",
      rpID: "example.com",
    };
    dependencies["../../utils/auth"] = {
      beginSignIn: beginSignInFake,
      getAuthentication: getAuthenticationStub,
      getReturnTo: getReturnToStub,
      signIn: signInFake,
    };
  }

  const { default: router } = test.mock("./assertion", dependencies);

  return router;
}

function createAssertionTestExpressApp(
  test: Tap.Test,
  { withAuth, suppressErrorOutput }: AssertionTestExpressAppOptions = {}
) {
  const attestation = importModule(test, { mockModules: true });

  return createTestExpressApp({
    authSetup: withAuth
      ? {
          originalUrl: "/",
          activeUser: testUser,
          activeCredential: testCredential,
        }
      : undefined,
    middlewareSetup: (app) => {
      app.use(attestation);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../routes/fido2/error-handler",
      suppressErrorOutput,
    },
  });
}

function verifyFailedAuthenticationFido2ErrorResponse(
  test: Tap.Test,
  response: SupertestResponse
) {
  verifyUserErrorFido2ServerResponse(
    test,
    response,
    StatusCodes.BAD_REQUEST,
    "We couldn't sign you in"
  );
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

test("routes/fido2/assertion", async (t) => {
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
    t.test(
      "if active user session, renders JSON with expected user error",
      async (t) => {
        const { app } = createAssertionTestExpressApp(t, { withAuth: true });
        const response = await performOptionsPostRequest(app).send({
          username: "bob",
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.FORBIDDEN,
          "User is already signed in"
        );
      }
    );

    t.test("if username is passed in the request", async (t) => {
      t.test("fetches user with trimmed username", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "   bob ",
        });

        t.ok(fetchUserByNameStub.called);
        t.same(fetchUserByNameStub.firstCall.firstArg, "bob");
      });

      t.test(
        "if user doesn't exist, renders JSON with expected user error",
        async (t) => {
          fetchUserByNameStub.resolves();

          const { app } = createAssertionTestExpressApp(t);
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyFailedAuthenticationFido2ErrorResponse(t, response);
          // test for warning log message
          t.ok(logger.warn.called);
          t.match(
            logger.warn.firstCall.firstArg,
            "No such user with name 'bob'"
          );
        }
      );

      t.test("fetches user's credentials with trimmed username", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "   bob ",
        });

        t.ok(fetchCredentialsByUsernameStub.called);
        t.same(fetchCredentialsByUsernameStub.firstCall.firstArg, "bob");
      });

      t.test(
        "if credentials aren't found, renders JSON with expected server error",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([]);

          const { app } = createAssertionTestExpressApp(t, {
            suppressErrorOutput: true,
          });
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyServerErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      );
    });

    t.test("does not fetch user or credentials", async (t) => {
      t.test("if no username is in request", async (t) => {
        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({});

        t.notOk(fetchUserByNameStub.called);
        t.notOk(fetchCredentialsByUsernameStub.called);
      });

      t.test("if trimmed username is empty", async (t) => {
        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({ username: "  " });

        t.notOk(fetchUserByNameStub.called);
        t.notOk(fetchCredentialsByUsernameStub.called);
      });
    });

    t.test("generates authentication options", async (t) => {
      t.test("with expected allowed credentials", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);
        generateAuthenticationOptionsStub.returns({});

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(generateAuthenticationOptionsStub.called);
        t.same(
          generateAuthenticationOptionsStub.firstCall.args[0].allowCredentials,
          [
            {
              id: base64.toArrayBuffer(testCredential.credentialID, true),
              type: "public-key",
              transports: [...testCredential.transports],
            },
          ]
        );
      });

      t.test(
        "with expected user verification passed in the request",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);
          generateAuthenticationOptionsStub.returns({});

          const { app } = createAssertionTestExpressApp(t);
          await performOptionsPostRequest(app).send({
            username: "bob",
            userVerification: "required",
          });

          t.ok(generateAuthenticationOptionsStub.called);
          t.equal(
            generateAuthenticationOptionsStub.firstCall.args[0]
              .userVerification,
            "required"
          );
        }
      );

      t.test("with expected default user verification", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);
        generateAuthenticationOptionsStub.returns({});

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(generateAuthenticationOptionsStub.called);
        t.equal(
          generateAuthenticationOptionsStub.firstCall.args[0].userVerification,
          "preferred"
        );
      });
    });

    t.test("begins sign in", async (t) => {
      t.test(
        "with expected request, challenge, and existing user",
        async (t) => {
          const existingUser = {};
          fetchUserByNameStub.resolves(existingUser);
          fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);
          generateAuthenticationOptionsStub.returns({
            challenge: "CHALLENGE!",
          });

          const { app } = createAssertionTestExpressApp(t);
          await performOptionsPostRequest(app).send({
            username: "bob",
          });

          t.ok(beginSignInFake.called);
          verifyRequest(t, beginSignInFake.firstCall.args[0], {
            url: "/options",
            method: "POST",
          });
          t.equal(beginSignInFake.firstCall.args[1], "CHALLENGE!");
          t.equal(beginSignInFake.firstCall.args[2], existingUser);
        }
      );

      t.test(
        "with expected user verification passed in the request",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);
          generateAuthenticationOptionsStub.returns({
            challenge: "CHALLENGE!",
          });

          const { app } = createAssertionTestExpressApp(t);
          await performOptionsPostRequest(app).send({
            username: "bob",
            userVerification: "required",
          });

          t.ok(beginSignInFake.called);
          t.equal(beginSignInFake.firstCall.args[3], "required");
        }
      );

      t.test("with expected default user verification", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);
        generateAuthenticationOptionsStub.returns({
          challenge: "CHALLENGE!",
        });

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(beginSignInFake.called);
        t.equal(beginSignInFake.firstCall.args[3], "preferred");
      });
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([{ ...testCredential }]);
        generateAuthenticationOptionsStub.returns({
          challenge: "CHALLENGE!",
        });

        const { app } = createAssertionTestExpressApp(t);
        const response = await performOptionsPostRequest(app).send({
          username: "bob",
        });

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
        const { app } = createAssertionTestExpressApp(t);
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

    t.test("gets the authentication state", async (t) => {
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves({ ...testCredential });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential.credentialID,
      });

      t.ok(getAuthenticationStub.called);
      verifyRequest(t, getAuthenticationStub.firstCall.firstArg, {
        url: "/result",
        method: "POST",
      });
    });

    t.test(
      "if authentication state is missing, renders JSON with expected user error",
      async (t) => {
        getAuthenticationStub.returns(undefined);

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential.credentialID,
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "No active authentication"
        );
      }
    );

    t.test("fetches active credential by ID", async (t) => {
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves({ ...testCredential });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential.credentialID,
      });

      t.ok(fetchCredentialByIdStub.called);
      t.equal(
        fetchCredentialByIdStub.firstCall.firstArg,
        testCredential.credentialID
      );
    });

    t.test(
      "if active credential doesn't exist, renders JSON with expected user error",
      async (t) => {
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves(undefined);

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential.credentialID,
        });

        verifyFailedAuthenticationFido2ErrorResponse(t, response);
        // test for warning log message
        t.ok(logger.warn.called);
        t.match(
          logger.warn.firstCall.firstArg,
          "No credential found with ID " + testCredential.credentialID
        );
      }
    );

    t.test(
      "if found credential's user doesn't match the authentication state's user, renders JSON with expected user error",
      async (t) => {
        getAuthenticationStub.returns({
          authenticatingUser: { id: "321cba" },
        });
        fetchCredentialByIdStub.resolves({ ...testCredential });

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential.credentialID,
        });

        verifyFailedAuthenticationFido2ErrorResponse(t, response);
        // test for warning log message
        t.ok(logger.warn.called);
        t.match(
          logger.warn.firstCall.firstArg,
          "Presented credential (id = " +
            testCredential.credentialID +
            ") is not associated with specified user (id = 321cba)"
        );
      }
    );

    t.test("fetches matching existing user", async (t) => {
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves({ ...testCredential });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential.credentialID,
      });

      t.ok(fetchUserByIdStub.called);
      t.equal(fetchUserByIdStub.firstCall.firstArg, testUser.id);
    });

    t.test(
      "if no matching existing user is found, renders JSON with expected server error",
      async (t) => {
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves({ ...testCredential });
        fetchUserByIdStub.resolves(undefined);

        const { app } = createAssertionTestExpressApp(t, {
          suppressErrorOutput: true,
        });
        const response = await performResultPostRequest(app).send({
          id: testCredential.credentialID,
        });

        verifyServerErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }
    );

    t.test("verifies authentication response", async (t) => {
      getAuthenticationStub.returns({
        challenge: "CHALLENGE!",
      });
      fetchCredentialByIdStub.resolves({ ...testCredential });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential.credentialID,
      });

      t.ok(verifyAuthenticationResponseStub.called);
      t.same(verifyAuthenticationResponseStub.firstCall.firstArg, {
        response: {
          id: testCredential.credentialID,
        },
        expectedChallenge: "CHALLENGE!",
        expectedOrigin: "https://example.com",
        expectedRPID: "example.com",
        authenticator: {
          ...testCredential,
          credentialID: new Uint8Array(
            base64.toArrayBuffer(testCredential.credentialID, true)
          ),
          credentialPublicKey: new Uint8Array(
            base64.toArrayBuffer(testCredential.credentialPublicKey, true)
          ),
        },
      });
    });

    t.test(
      "if authentication response verification fails, renders JSON with expected user error",
      async (t) => {
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves({ ...testCredential });
        fetchUserByIdStub.resolves({ ...testUser });
        const err = new Error("PKI sez nope");
        verifyAuthenticationResponseStub.throws(err);

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential.credentialID,
        });

        verifyFailedAuthenticationFido2ErrorResponse(t, response);
        // test for warning log message
        t.ok(logger.warn.called);
        t.equal(logger.warn.firstCall.args[0], err);
        t.match(
          logger.warn.firstCall.args[1],
          "Authentication error with user (id = " +
            testUser.id +
            ") and credential (id = " +
            testCredential.credentialID +
            ")"
        );
      }
    );

    t.test("gets return to URL", async (t) => {
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves({ ...testCredential });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential.credentialID,
      });

      t.ok(getReturnToStub.called);
      verifyRequest(t, getReturnToStub.firstCall.firstArg, {
        url: "/result",
        method: "POST",
      });
    });

    t.test("performs sign in", async (t) => {
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves(testCredential);
      fetchUserByIdStub.resolves(testUser);

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: testCredential.credentialID,
      });

      t.ok(signInFake.called);
      verifyRequest(t, signInFake.firstCall.args[0], {
        url: "/result",
        method: "POST",
      });
      t.equal(signInFake.firstCall.args[1], testUser);
      t.equal(signInFake.firstCall.args[2], testCredential);
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves({ ...testCredential });
        fetchUserByIdStub.resolves({});
        getReturnToStub.returns("/foo");

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: testCredential.credentialID,
        });

        verifyFido2SuccessResponse(t, response, {
          return_to: "/foo",
        });
      }
    );
  });
});
