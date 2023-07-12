import { test } from "tap";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { Express, Response, NextFunction } from "express";
import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import base64 from "@hexagon/base64";
import crypto from "crypto";

import {
  createTestExpressApp,
  verifyFido2ServerErrorResponse,
  verifyFido2ServerSuccessResponse,
  verifyRequest,
} from "../../utils/testing";
import { ValidationError } from "../../types/error";
import { AuthenticatedRequest } from "../../types/express";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type AttestationTestExpressAppOptions = {
  withAuth?: boolean;
  withActiveRegistration?: boolean;
  suppressErrorOutput?: boolean;
  return_to?: string;
};

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
};

const testValidatedCredential = {
  ...testCredential,
  credentialID: base64.toArrayBuffer(testCredential.credentialID, true),
  credentialPublicKey: base64.toArrayBuffer(
    testCredential.credentialPublicKey,
    true
  ),
};

test("routes/fido2/attestation", async (t) => {
  const expressRouter = {
    post: sinon.fake(),
  };
  const routerFake = sinon.fake.returns(expressRouter);
  const logger = {
    debug: sinon.fake(),
    warn: sinon.fake(),
    info: sinon.fake(),
  };
  const createUserStub = sinon.stub();
  const fetchUserByIdStub = sinon.stub();
  const fetchCredentialsByUserIdStub = sinon.stub();
  const fetchUserByNameStub = sinon.stub();
  const generateRegistrationOptionsStub = sinon.stub();
  const beginSignupFake = sinon.fake();
  const verifyRegistrationResponseStub = sinon.stub();
  const registerUserStub = sinon.stub();
  const signInFake = sinon.fake();
  const addUserCredentialFake = sinon.fake();

  function importModule({
    mockExpress = false,
    mockModules = false,
  }: MockOptions = {}) {
    expressRouter.post.resetHistory();
    routerFake.resetHistory();
    logger.debug.resetHistory();
    logger.warn.resetHistory();
    logger.info.resetHistory();
    createUserStub.resetHistory();
    fetchUserByIdStub.resetHistory();
    fetchCredentialsByUserIdStub.resetHistory();
    fetchUserByNameStub.resetHistory();
    generateRegistrationOptionsStub.resetHistory();
    beginSignupFake.resetHistory();
    verifyRegistrationResponseStub.resetHistory();
    registerUserStub.resetHistory();
    signInFake.resetHistory();
    addUserCredentialFake.resetHistory();

    const dependencies: any = {};
    if (mockExpress) {
      dependencies.express = {
        Router: routerFake,
      };
    }
    if (mockModules) {
      dependencies["../../utils/logger"] = { logger };
      dependencies["../../services/user"] = {
        createUser: createUserStub,
        fetchUserById: fetchUserByIdStub,
        fetchCredentialsByUserId: fetchCredentialsByUserIdStub,
        fetchUserByName: fetchUserByNameStub,
        registerUser: registerUserStub,
        addUserCredential: addUserCredentialFake,
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
      };
    }

    const { default: router } = t.mock("./attestation", dependencies);

    return router;
  }

  function createAttestationTestExpressApp(
    test: Tap.Test,
    {
      withAuth,
      withActiveRegistration,
      suppressErrorOutput,
      return_to,
    }: AttestationTestExpressAppOptions = {}
  ) {
    const attestation = importModule({ mockModules: true });

    return createTestExpressApp({
      authSetup: withAuth
        ? {
            originalUrl: "/",
            activeUser: testUser,
            activeCredential: testCredential,
          }
        : undefined,
      middlewareSetup: (app) => {
        if (withActiveRegistration) {
          app.all(
            "*",
            (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
              req.session = {
                registration: {
                  registeringUser: testUser,
                  challenge: "CHALLENGE!",
                },
                return_to,
              };

              next();
            }
          );
        }

        app.use(attestation);
      },
      errorHandlerSetup: {
        test,
        modulePath: "../routes/fido2/error-handler",
        suppressErrorOutput,
      },
    });
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
      expressRouter.post.getCalls().map((c) => c.firstArg),
      ["/options", "/result"]
    );
  });

  t.test("POST /options", async (t) => {
    function performOptionsRequest(app: Express): SuperTest {
      return request(app)
        .post("/options")
        .set("Content-Type", "application/json")
        .accept("application/json");
    }

    t.test("instantiates a new user", async (t) => {
      createUserStub.returns({});

      const { app } = createAttestationTestExpressApp(t);
      await performOptionsRequest(app).send({
        username: "bob",
        displayName: "Bob User",
      });

      t.ok(createUserStub.called);
      t.same(createUserStub.firstCall.args, ["bob", "Bob User"]);
    });

    t.test(
      "if a validation error occurs while instantiating a user, renders JSON with expected user error",
      async (t) => {
        createUserStub.throws(
          new ValidationError("User", "username", "Sorry, can't do it")
        );

        const { app } = createAttestationTestExpressApp(t);
        const response = await performOptionsRequest(app);

        verifyFido2ServerErrorResponse(
          t,
          response,
          400,
          "User: username: Sorry, can't do it"
        );
      }
    );

    t.test(
      "if an unknown error occurs while instantiating a user, renders JSON with expected user error",
      async (t) => {
        createUserStub.throws(new Error("BOOM!"));

        const { app } = createAttestationTestExpressApp(t, {
          suppressErrorOutput: true,
        });
        const response = await performOptionsRequest(app);

        verifyFido2ServerErrorResponse(
          t,
          response,
          500,
          "Something unexpected happened"
        );
      }
    );

    t.test("if active user session", async (t) => {
      t.test("fetches exiting user by ID", async (t) => {
        createUserStub.returns({});
        fetchUserByIdStub.resolves({});
        fetchCredentialsByUserIdStub.resolves([]);

        const { app } = createAttestationTestExpressApp(t, {
          withAuth: true,
        });
        await performOptionsRequest(app);

        t.ok(fetchUserByIdStub.called);
        t.same(fetchUserByIdStub.firstCall.args, ["123abc"]);
      });

      t.test(
        "if user that doesn't actually exist, renders JSON with expected user error",
        async (t) => {
          createUserStub.returns({});
          fetchUserByIdStub.resolves();

          const { app } = createAttestationTestExpressApp(t, {
            withAuth: true,
          });
          const response = await performOptionsRequest(app);

          verifyFido2ServerErrorResponse(
            t,
            response,
            400,
            "User with ID 123abc no longer exists"
          );
        }
      );

      t.test("fetches user's existing credentials", async (t) => {
        createUserStub.returns({});
        fetchUserByIdStub.resolves({});
        fetchCredentialsByUserIdStub.resolves([]);

        const { app } = createAttestationTestExpressApp(t, {
          withAuth: true,
        });
        await performOptionsRequest(app);

        t.ok(fetchCredentialsByUserIdStub.called);
        t.same(fetchCredentialsByUserIdStub.firstCall.args, ["123abc"]);
      });
    });

    t.test("if no active user session", async (t) => {
      t.test("fetches exiting user by specified username", async (t) => {
        createUserStub.returns({});
        fetchUserByNameStub.resolves({});

        const { app } = createAttestationTestExpressApp(t);
        await performOptionsRequest(app).send({
          username: "bob",
        });

        t.ok(fetchUserByNameStub.called);
        t.same(fetchUserByNameStub.firstCall.args, ["bob"]);
      });

      t.test(
        "if user exists with same username, renders JSON with expected user error",
        async (t) => {
          createUserStub.returns({});
          fetchUserByNameStub.resolves({});

          const { app } = createAttestationTestExpressApp(t);
          const response = await performOptionsRequest(app).send({
            username: "bob",
          });

          verifyFido2ServerErrorResponse(
            t,
            response,
            400,
            "A user with username 'bob' already exists"
          );
        }
      );
    });

    t.test("generates registration options", async (t) => {
      createUserStub.returns({});
      fetchUserByIdStub.resolves({
        id: "123abc",
        username: "bob",
        displayName: "Bob User",
      });
      fetchCredentialsByUserIdStub.resolves([testCredential]);
      generateRegistrationOptionsStub.returns({});

      const { app } = createAttestationTestExpressApp(t, { withAuth: true });
      await performOptionsRequest(app).send({
        attestation: "platform",
      });

      t.ok(generateRegistrationOptionsStub.called);
      t.same(generateRegistrationOptionsStub.firstCall.args, [
        {
          rpName: "Example, Inc.",
          rpID: "example.com",
          userID: "123abc",
          userName: "bob",
          userDisplayName: "Bob User",
          attestationType: "platform",
          excludeCredentials: [
            {
              id: base64.toArrayBuffer(testCredential.credentialID, true),
              type: "public-key",
              transports: testCredential.transports,
            },
          ],
        },
      ]);
    });

    t.test("begins sign up", async (t) => {
      const registeringUser = {};
      createUserStub.returns(registeringUser);
      fetchUserByNameStub.resolves();
      generateRegistrationOptionsStub.returns({
        challenge: "CHALLENGE!",
      });

      const { app } = createAttestationTestExpressApp(t);
      await performOptionsRequest(app);

      t.ok(beginSignupFake.called);
      verifyRequest(t, beginSignupFake.firstCall.args[0], {
        url: "/options",
        method: "POST",
      });
      t.equal(beginSignupFake.firstCall.args[1], registeringUser);
      t.equal(beginSignupFake.firstCall.args[2], "CHALLENGE!");
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        const registeringUser = {};
        createUserStub.returns(registeringUser);
        fetchUserByNameStub.resolves();
        generateRegistrationOptionsStub.returns({
          challenge: "CHALLENGE!",
        });

        const { app } = createAttestationTestExpressApp(t);
        const response = await performOptionsRequest(app);

        verifyFido2ServerSuccessResponse(t, response, {
          challenge: "CHALLENGE!",
        });
      }
    );
  });

  t.test("POST /result", async (t) => {
    function performResultRequest(app: Express): SuperTest {
      return request(app)
        .post("/result")
        .set("Content-Type", "application/json")
        .accept("application/json");
    }

    t.test(
      "if credential ID is missing from request, renders JSON with expected user error",
      async (t) => {
        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultRequest(app).send({
          response: {},
        });

        verifyFido2ServerErrorResponse(
          t,
          response,
          400,
          "Missing: credential ID"
        );
      }
    );

    t.test(
      "if authentication response is missing from request, renders JSON with expected user error",
      async (t) => {
        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultRequest(app).send({
          id: testCredential.credentialID,
        });

        verifyFido2ServerErrorResponse(
          t,
          response,
          400,
          "Missing: authentication response"
        );
      }
    );

    t.test(
      "if registration state is missing from session, renders JSON with expected user error",
      async (t) => {
        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultRequest(app).send({
          id: testCredential.credentialID,
          response: {},
        });

        verifyFido2ServerErrorResponse(
          t,
          response,
          400,
          "No active registration"
        );
      }
    );

    t.test("verifies registration response", async (t) => {
      verifyRegistrationResponseStub.returns({
        registrationInfo: testValidatedCredential,
      });

      const { app } = createAttestationTestExpressApp(t, {
        withActiveRegistration: true,
      });
      await performResultRequest(app).send({
        id: testCredential.credentialID,
        response: {
          transports: ["ble", "usb"],
        },
      });

      t.ok(verifyRegistrationResponseStub.called);
      t.same(verifyRegistrationResponseStub.firstCall.firstArg, {
        response: {
          id: testCredential.credentialID,
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
        const err = new Error("BOOM!");
        verifyRegistrationResponseStub.throws(err);

        const { app } = createAttestationTestExpressApp(t, {
          withActiveRegistration: true,
        });
        const response = await performResultRequest(app).send({
          id: testCredential.credentialID,
          response: {},
        });

        verifyFido2ServerErrorResponse(
          t,
          response,
          400,
          "Registration failed: BOOM!"
        );

        // also test for warning log message
        t.ok(logger.warn.called);
        t.equal(logger.warn.firstCall.args[0], err);
        t.match(logger.warn.firstCall.args[1], "Registration error");
      }
    );

    t.test("if active user session", async (t) => {
      t.test("adds credential to existing user", async (t) => {
        verifyRegistrationResponseStub.returns({
          registrationInfo: testValidatedCredential,
        });

        const { app } = createAttestationTestExpressApp(t, {
          withAuth: true,
          withActiveRegistration: true,
        });
        await performResultRequest(app).send({
          id: testCredential.credentialID,
          response: {
            transports: ["ble", "usb"],
          },
        });

        t.ok(addUserCredentialFake.called);
        t.equal(addUserCredentialFake.firstCall.args[0], "123abc");
        t.match(addUserCredentialFake.firstCall.args[1], {
          ...testCredential,
          created: /.*/,
        });
      });
    });

    t.test("if no active user session", async (t) => {
      t.test("registers new user with credential", async (t) => {
        verifyRegistrationResponseStub.returns({
          registrationInfo: testValidatedCredential,
        });

        const { app } = createAttestationTestExpressApp(t, {
          withActiveRegistration: true,
        });
        await performResultRequest(app).send({
          id: testCredential.credentialID,
          response: {
            transports: ["ble", "usb"],
          },
        });

        t.ok(registerUserStub.called);
        t.equal(registerUserStub.firstCall.args[0], testUser);
        t.match(registerUserStub.firstCall.args[1], {
          ...testCredential,
          created: /.*/,
        });
      });

      t.test("performs sign-in", async (t) => {
        verifyRegistrationResponseStub.returns({
          registrationInfo: testValidatedCredential,
        });
        const user = {};
        registerUserStub.returns(user);

        const { app } = createAttestationTestExpressApp(t, {
          withActiveRegistration: true,
        });
        await performResultRequest(app).send({
          id: testCredential.credentialID,
          response: {
            transports: ["ble", "usb"],
          },
        });

        t.ok(signInFake.called);
        verifyRequest(t, signInFake.firstCall.args[0], {
          url: "/result",
          method: "POST",
        });
        t.equal(signInFake.firstCall.args[1], user);
        t.match(signInFake.firstCall.args[2], {
          ...testCredential,
          created: /.*/,
        });
      });
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        t.test("when return_to is not set", async (t) => {
          verifyRegistrationResponseStub.returns({
            registrationInfo: testValidatedCredential,
          });

          const { app } = createAttestationTestExpressApp(t, {
            withActiveRegistration: true,
          });
          const response = await performResultRequest(app).send({
            id: testCredential.credentialID,
            response: {},
          });

          verifyFido2ServerSuccessResponse(t, response, {
            return_to: "/",
          });
        });

        t.test("when return_to is set", async (t) => {
          verifyRegistrationResponseStub.returns({
            registrationInfo: testValidatedCredential,
          });

          const { app } = createAttestationTestExpressApp(t, {
            withActiveRegistration: true,
            return_to: "/foo",
          });
          const response = await performResultRequest(app).send({
            id: testCredential.credentialID,
            response: {},
          });

          verifyFido2ServerSuccessResponse(t, response, {
            return_to: "/foo",
          });
        });
      }
    );
  });
});
