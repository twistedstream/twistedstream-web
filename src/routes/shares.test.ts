import { Express, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { test } from "tap";

import { Duration } from "luxon";
import { Share, User } from "../types/entity";
import {
  requiresAdmin as _requiresAdmin,
  requiresAuth as _requiresAuth,
} from "../utils/auth";
import {
  testCredential1,
  testShare1,
  testShare2,
  testShare3,
  testShare4,
  testUser1,
  testUser2,
} from "../utils/testing/data";
import {
  ViewRenderArgs,
  createTestExpressApp,
  verifyAuthenticationRequiredResponse,
  verifyHtmlErrorResponse,
  verifyRedirectResponse,
  verifyRequest,
  verifyResponse,
} from "../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type SharesTestExpressAppOptions = {
  withAuth?: boolean;
  activeUser?: User;
  originalUrl?: string;
  suppressErrorOutput?: boolean;
};

// test objects

const expressRouter = {
  get: sinon.fake(),
  post: sinon.fake(),
};
const logger = {
  info: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const claimShareStub = sinon.stub();
const createShareStub = sinon.stub();
const fetchSharesByClaimedUserIdStub = sinon.stub();
const fetchSharesByCreatedUserIdStub = sinon.stub();
const buildExpirationsStub = sinon.stub();
const getFileTypeStyleStub = sinon.stub();
const newShareStub = sinon.stub();
const authorizeRegistrationStub = sinon.stub();
const clearRegisterableFake = sinon.fake();
const getRegisterableStub = sinon.stub();
const redirectToRegisterStub = sinon.stub();
const ensureShareStub = sinon.stub();
const renderShareStub = sinon.stub();
const testShare = testShare1(testUser2());

// helpers

function importModule(
  test: Tap.Test,
  { mockExpress = false, mockModules = false }: MockOptions = {}
) {
  const { default: router } = test.mock("./shares", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
    ...(mockModules && {
      "../utils/logger": { logger },
      "../services/share": {
        claimShare: claimShareStub,
        createShare: createShareStub,
        fetchSharesByClaimedUserId: fetchSharesByClaimedUserIdStub,
        fetchSharesByCreatedUserId: fetchSharesByCreatedUserIdStub,
        newShare: newShareStub,
      },
      "../utils/auth": {
        authorizeRegistration: authorizeRegistrationStub,
        clearRegisterable: clearRegisterableFake,
        getRegisterable: getRegisterableStub,
        redirectToRegister: redirectToRegisterStub,
        requiresAdmin: _requiresAdmin,
        requiresAuth: _requiresAuth,
      },
      "../utils/share": {
        buildExpirations: buildExpirationsStub,
        getFileTypeStyle: getFileTypeStyleStub,
        ensureShare: ensureShareStub,
        renderShare: renderShareStub,
      },
    }),
  });

  return router;
}

function createSharesTestExpressApp(
  test: Tap.Test,
  {
    withAuth,
    activeUser,
    originalUrl,
    suppressErrorOutput,
  }: SharesTestExpressAppOptions = {}
) {
  const router = importModule(test, { mockModules: true });

  return createTestExpressApp({
    authSetup: withAuth
      ? {
          originalUrl: originalUrl || "/",
          activeUser: activeUser || testUser1(),
          activeCredential: testCredential1(),
        }
      : undefined,
    middlewareSetup: (app) => {
      app.use(router);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../error-handler",
      suppressErrorOutput,
    },
  });
}

function performGetSharesRequest(app: Express): SuperTest {
  return request(app).get("/");
}

function performGetNewShareRequest(app: Express): SuperTest {
  return request(app).get("/new");
}

function performPostNewShareRequest(app: Express): SuperTest {
  return request(app)
    .post("/new")
    .set("Content-Type", "application/x-www-form-urlencoded");
}

function performGetShareRequest(app: Express, shareId: string): SuperTest {
  return request(app).get(`/${shareId}`);
}

function performPostExistingShareRequest(
  app: Express,
  shareId: string
): SuperTest {
  return request(app)
    .post(`/${shareId}`)
    .set("Content-Type", "application/x-www-form-urlencoded");
}

// tests

test("routes/shares", async (t) => {
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
      ["/", "/new", "/:share_id"]
    );
    t.same(
      expressRouter.post.getCalls().map((c) => c.firstArg),
      ["/new", "/:share_id"]
    );
  });

  t.test("GET /", async (t) => {
    t.test("requires authenticated session", async (t) => {
      const { app } = createSharesTestExpressApp(t);

      const response = await performGetSharesRequest(app);

      verifyAuthenticationRequiredResponse(t, response);
    });

    t.test("renders HTML with expected view state", async (t) => {
      const user1 = testUser1();
      const user2 = testUser2();
      const share1 = testShare1(user1, user2);
      const share2 = testShare2(user1, user2);
      const share3 = testShare3(user2, user1);
      share3.toUsername = "foo";
      share3.expireDuration = Duration.fromObject({ days: 14 });
      const share4 = testShare4(user2);
      fetchSharesByClaimedUserIdStub
        .withArgs(user2.id)
        .resolves([share1, share2]);
      fetchSharesByCreatedUserIdStub
        .withArgs(user2.id)
        .resolves([share3, share4]);

      const { app, renderArgs } = createSharesTestExpressApp(t, {
        withAuth: true,
        activeUser: user2,
      });

      const response = await performGetSharesRequest(app);
      const { viewName, options } = renderArgs;

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "shares");
      t.equal(options.title, "Shares");
      t.same(options.sharesWithMe, [
        {
          title: share1.fileTitle,
          url: "/shares/" + share1.id,
          created: share1.created.toISO(),
          from: share1.createdBy.username,
          claimed: share1.claimed?.toISO(),
        },
        {
          title: share2.fileTitle,
          url: "/shares/" + share2.id,
          created: share2.created.toISO(),
          from: share2.createdBy.username,
          claimed: share2.claimed?.toISO(),
        },
      ]);
      t.same(options.sharesByMe, [
        {
          title: share3.fileTitle,
          url: "/shares/" + share3.id,
          created: share3.created.toISO(),
          to: share3.toUsername,
          expires: share3.expireDuration?.toHuman(),
          claimed: share3.claimed?.toISO(),
          claimed_by: share3.claimedBy?.username,
        },
        {
          title: share4.fileTitle,
          url: "/shares/" + share4.id,
          created: share4.created.toISO(),
          to: share4.toUsername,
          expires: share4.expireDuration?.toHuman(),
          claimed: undefined,
          claimed_by: undefined,
        },
      ]);
    });
  });

  t.test("GET /new", async (t) => {
    t.test("requires authenticated session", async (t) => {
      const { app } = createSharesTestExpressApp(t);

      const response = await performGetNewShareRequest(app);

      verifyAuthenticationRequiredResponse(t, response, "/new");
    });

    t.test("requires admin role", async (t) => {
      const { app, renderArgs } = createSharesTestExpressApp(t, {
        withAuth: true,
      });

      const response = await performGetNewShareRequest(app);

      verifyHtmlErrorResponse(
        t,
        response,
        renderArgs,
        StatusCodes.FORBIDDEN,
        "Error",
        "Requires admin role"
      );
    });

    t.test("renders HTML with expected view state", async (t) => {
      const expirations = [
        { value: "EXP1", description: "Expiration 1", selected: false },
        { value: "EXP2", description: "Expiration 2", selected: true },
      ];
      buildExpirationsStub.withArgs().returns(expirations);

      const { app, renderArgs } = createSharesTestExpressApp(t, {
        withAuth: true,
        activeUser: testUser2(),
      });

      const response = await performGetNewShareRequest(app);
      const { viewName, options } = renderArgs;

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "new_share");
      t.equal(options.title, "New share");
      t.same(options.expirations, expirations);
    });
  });

  t.test("POST /new", async (t) => {
    t.test("requires authenticated session", async (t) => {
      const { app } = createSharesTestExpressApp(t);

      const response = await performPostNewShareRequest(app);

      verifyAuthenticationRequiredResponse(t, response, "/new");
    });

    t.test("requires admin role", async (t) => {
      const { app, renderArgs } = createSharesTestExpressApp(t, {
        withAuth: true,
      });

      const response = await performPostNewShareRequest(app);

      verifyHtmlErrorResponse(
        t,
        response,
        renderArgs,
        StatusCodes.FORBIDDEN,
        "Error",
        "Requires admin role"
      );
    });

    t.test("when user is admin", async (t) => {
      const activeUser = testUser2();

      function commonPostNewTests(t: Tap.Test, action: "validate" | "create") {
        t.test("generates a new share", async (t) => {
          newShareStub.resolves({});
          const result = createSharesTestExpressApp(t, {
            withAuth: true,
            activeUser,
          });
          const { app } = result;

          await performPostNewShareRequest(app).send({
            action,
            backingUrl: "https://example.com/path",
            toUsername: "foo",
          });

          t.ok(newShareStub.called);
          t.equal(newShareStub.firstCall.args[0], activeUser);
          t.equal(newShareStub.firstCall.args[1], "https://example.com/path");
          t.equal(newShareStub.firstCall.args[2], "foo");
        });

        t.test("if specified, builds expires duration", async (t) => {
          newShareStub.resolves({});
          const result = createSharesTestExpressApp(t, {
            withAuth: true,
            activeUser,
          });
          const { app } = result;

          await performPostNewShareRequest(app).send({
            action,
            backingUrl: "https://example.com/path",
            toUsername: "foo",
            expires: "P2D",
          });

          t.ok(newShareStub.called);
          t.same(
            newShareStub.firstCall.args[3],
            Duration.fromObject({ days: 2 })
          );
        });

        t.test(
          "if not specified, defaults to undefined expires duration",
          async (t) => {
            newShareStub.resolves({});
            const result = createSharesTestExpressApp(t, {
              withAuth: true,
              activeUser,
            });
            const { app } = result;

            await performPostNewShareRequest(app).send({
              action,
              backingUrl: "https://example.com/path",
              toUsername: "foo",
            });

            t.ok(newShareStub.called);
            t.equal(newShareStub.firstCall.args[3], undefined);
          }
        );

        t.test(
          "if a validation error occurs creating the share, renders HTML with expected user error",
          async (t) => {
            newShareStub.rejects({
              type: "validation",
              field: "bar",
              fieldMessage: "Bad bar!",
            });
            const expirations = [{}];
            buildExpirationsStub.returns(expirations);
            const result = createSharesTestExpressApp(t, {
              withAuth: true,
              activeUser,
            });
            const { app, renderArgs } = result;

            const response = await performPostNewShareRequest(app).send({
              action,
              backingUrl: "https://example.com/path",
              toUsername: "foo",
              expires: "P2D",
            });
            const { viewName, options } = renderArgs;

            t.equal(response.status, StatusCodes.BAD_REQUEST);
            t.match(response.headers["content-type"], "text/html");
            t.equal(viewName, "new_share");
            t.equal(options.title, "New share");
            t.equal(options.expirations, expirations);
            t.equal(options.bar_error, "Bad bar!");
            t.equal(options.backingUrl, "https://example.com/path");
            t.equal(options.backingUrl_valid, true);
            t.equal(options.toUsername, "foo");
            t.equal(options.expires, "P2D");
          }
        );

        t.test(
          "if an unknown error occurs creating the share, renders HTML with expected server error",
          async (t) => {
            newShareStub.rejects({});
            const result = createSharesTestExpressApp(t, {
              withAuth: true,
              activeUser,
              suppressErrorOutput: true,
            });
            const { app, renderArgs } = result;

            const response = await performPostNewShareRequest(app).send({
              action,
              backingUrl: "https://example.com/path",
              toUsername: "foo",
              expires: "P2D",
            });

            verifyHtmlErrorResponse(
              t,
              response,
              renderArgs,
              StatusCodes.INTERNAL_SERVER_ERROR,
              "Error",
              "Something unexpected happened"
            );
          }
        );
      }

      t.test("when action is 'validate'", async (t) => {
        commonPostNewTests(t, "validate");

        t.test("renders HTML with the expected view state", async (t) => {
          const expireDuration = Duration.fromObject({ days: 2 });
          newShareStub.resolves({
            expireDuration: expireDuration,
            backingUrl: "https://example.com/path",
            toUsername: "foo",
            fileTitle: "Doc Title",
            documentType: "document",
          });
          const expirations = [{}];
          buildExpirationsStub.withArgs(expireDuration).returns(expirations);
          const fileTypeStyle = "doc_style";
          getFileTypeStyleStub.withArgs("document").returns(fileTypeStyle);
          const result = createSharesTestExpressApp(t, {
            withAuth: true,
            activeUser,
          });
          const { app, renderArgs } = result;

          const response = await performPostNewShareRequest(app).send({
            action: "validate",
            backingUrl: "ignored",
            toUsername: "ignored",
            expires: "ignored",
          });
          const { viewName, options } = renderArgs;

          t.equal(response.status, StatusCodes.OK);
          t.match(response.headers["content-type"], "text/html");
          t.equal(viewName, "new_share");
          t.equal(options.title, "New share");
          t.equal(options.expirations, expirations);
          t.equal(options.backingUrl, "https://example.com/path");
          t.equal(options.backingUrl_valid, true);
          t.equal(options.toUsername, "foo");
          t.equal(options.expires, "P2D");
          t.equal(options.fileTitle, "Doc Title");
          t.equal(options.documentType, "document");
          t.equal(options.fileTypeStyle, fileTypeStyle);
          t.ok(options.can_create);
        });
      });

      t.test("when action is 'create'", async (t) => {
        commonPostNewTests(t, "create");

        t.test("creates the share", async (t) => {
          const share = {};
          newShareStub.resolves(share);
          const result = createSharesTestExpressApp(t, {
            withAuth: true,
            activeUser,
          });
          const { app } = result;

          await performPostNewShareRequest(app).send({
            action: "create",
            backingUrl: "ignored",
            toUsername: "ignored",
            expires: "ignored",
          });

          t.ok(createShareStub.called);
          t.equal(createShareStub.firstCall.firstArg, share);
        });

        t.test("redirects to the shares page", async (t) => {
          newShareStub.resolves({});
          const result = createSharesTestExpressApp(t, {
            withAuth: true,
            activeUser,
          });
          const { app } = result;

          const response = await performPostNewShareRequest(app).send({
            action: "create",
            backingUrl: "ignored",
            toUsername: "ignored",
            expires: "ignored",
          });

          verifyRedirectResponse(t, response, "/shares");
        });
      });

      t.test(
        "if unsupported action, renders HTML with expected user error",
        async (t) => {
          const result = createSharesTestExpressApp(t, {
            withAuth: true,
            activeUser,
          });
          const { app, renderArgs } = result;

          const response = await performPostNewShareRequest(app).send({
            action: "foo",
          });

          verifyHtmlErrorResponse(
            t,
            response,
            renderArgs,
            StatusCodes.BAD_REQUEST,
            "Error",
            "Unsupported new share action"
          );
        }
      );
    });
  });

  t.test("GET /:share_id", async (t) => {
    t.test("ensures invite", async (t) => {
      ensureShareStub.resolves({ share: testShare, isClaimed: true });
      const { app } = createSharesTestExpressApp(t);

      await performGetShareRequest(app, testShare.id);

      t.ok(ensureShareStub.called);
      verifyRequest(t, ensureShareStub.firstCall.firstArg, {
        url: `/${testShare.id}`,
        method: "GET",
      });
    });

    t.test("when user is authenticated", async (t) => {
      const testUser = testUser2();
      let app: Express;
      let renderArgs: ViewRenderArgs;

      t.beforeEach(async () => {
        const result = createSharesTestExpressApp(t, {
          withAuth: true,
          activeUser: testUser,
        });
        app = result.app;
        renderArgs = result.renderArgs;
      });

      t.test("if claimed, renders the existing share", async (t) => {
        const share = testShare1(testUser2(), testUser1());

        ensureShareStub.resolves(share);
        renderShareStub.callsFake((res: Response, _share: Share) => {
          res.send("ignored");
        });

        await performGetShareRequest(app, share.id);

        t.ok(renderShareStub.called);

        verifyResponse(t, renderShareStub.firstCall.args[0]);
        t.equal(renderShareStub.firstCall.args[1], share);
      });

      t.test("gets registerable state", async (t) => {
        ensureShareStub.resolves(testShare);

        await performGetShareRequest(app, testShare.id);

        t.ok(getRegisterableStub.called);
        verifyRequest(t, getRegisterableStub.firstCall.firstArg, {
          url: `/${testShare.id}`,
          method: "GET",
        });
      });

      t.test("when registerable state exists", async (t) => {
        t.beforeEach(async () => {
          ensureShareStub.resolves(testShare);
          getRegisterableStub.returns({});
          renderShareStub.callsFake((res: Response, _share: Share) => {
            res.send("ignored");
          });
        });

        t.test("clears registerable state", async (t) => {
          await performGetShareRequest(app, testShare.id);

          t.ok(clearRegisterableFake.called);
          verifyRequest(t, clearRegisterableFake.firstCall.firstArg, {
            url: `/${testShare.id}`,
            method: "GET",
          });
        });

        t.test("claims the share for the current user", async (t) => {
          await performGetShareRequest(app, testShare.id);

          t.ok(claimShareStub.called);
          t.equal(claimShareStub.firstCall.args[0], testShare.id);
          t.equal(claimShareStub.firstCall.args[1], testUser);
        });

        t.test("logs the claimed share", async (t) => {
          const claimedShare = {};
          claimShareStub.resolves(claimedShare);

          await performGetShareRequest(app, testShare.id);

          t.ok(logger.info.called);
          t.equal(logger.info.firstCall.args[0], claimedShare);
          t.equal(logger.info.firstCall.args[1], "New user has claimed share");
        });

        t.test("renders the claimed share", async (t) => {
          const claimedShare = {};
          claimShareStub.resolves(claimedShare);

          await performGetShareRequest(app, testShare.id);

          t.ok(renderShareStub.called);
          verifyResponse(t, renderShareStub.firstCall.args[0]);
          t.equal(renderShareStub.firstCall.args[1], claimedShare);
        });
      });

      t.test(
        "if registerable state is missing, renders HTML with the expected view state",
        async (t) => {
          ensureShareStub.resolves(testShare);
          getRegisterableStub.returns(undefined);
          getFileTypeStyleStub
            .withArgs(testShare.documentType)
            .returns("doc_style");

          const response = await performGetShareRequest(app, testShare.id);
          const { viewName, options } = renderArgs;

          t.equal(response.status, StatusCodes.OK);
          t.match(response.headers["content-type"], "text/html");
          t.equal(viewName, "accept_share");
          t.equal(options.title, "Accept this shared file?");
          t.equal(options.share, testShare);
          t.same(options.fileTypeStyle, "doc_style");
        }
      );
    });

    t.test("when user is not authenticated", async (t) => {
      let app: Express;
      let renderArgs: ViewRenderArgs;

      t.beforeEach(async () => {
        const result = createSharesTestExpressApp(t);
        app = result.app;
        renderArgs = result.renderArgs;
      });

      t.test("if share was claimed, redirects to the login page", async (t) => {
        const share = testShare1(testUser2(), testUser1());
        ensureShareStub.resolves(share);

        const response = await performGetShareRequest(app, share.id);

        verifyAuthenticationRequiredResponse(t, response, `/${testShare.id}`);
      });

      t.test(
        "if share was intended for a specific user, redirects to the login page",
        async (t) => {
          const share = testShare1(testUser2());
          share.toUsername = "foo";
          ensureShareStub.resolves(share);

          const response = await performGetShareRequest(app, share.id);

          verifyAuthenticationRequiredResponse(t, response, `/${testShare.id}`);
        }
      );

      t.test("renders HTML with the expected view state", async (t) => {
        ensureShareStub.resolves(testShare);
        getFileTypeStyleStub
          .withArgs(testShare.documentType)
          .returns("doc_style");

        const response = await performGetShareRequest(app, testShare.id);
        const { viewName, options } = renderArgs;

        t.equal(response.status, StatusCodes.OK);
        t.match(response.headers["content-type"], "text/html");
        t.equal(viewName, "accept_share");
        t.equal(options.title, "Accept this shared file?");
        t.equal(options.share, testShare);
        t.same(options.fileTypeStyle, "doc_style");
      });
    });
  });

  t.test("POST /:share_id", async (t) => {
    t.test("ensures invite", async (t) => {
      ensureShareStub.resolves(testShare);
      const { app } = createSharesTestExpressApp(t);

      await performPostExistingShareRequest(app, testShare.id);

      t.ok(ensureShareStub.called);
      verifyRequest(t, ensureShareStub.firstCall.firstArg, {
        url: `/${testShare.id}`,
        method: "POST",
      });
    });

    t.test(
      "if share is claimed, renders HTML with expected user error",
      async (t) => {
        const share = testShare1(testUser2(), testUser1());
        ensureShareStub.resolves(share);
        const { app, renderArgs } = createSharesTestExpressApp(t);

        const response = await performPostExistingShareRequest(app, share.id);

        verifyHtmlErrorResponse(
          t,
          response,
          renderArgs,
          StatusCodes.FORBIDDEN,
          "Error",
          "This endpoint does not support an already claimed share"
        );
      }
    );

    t.test("when action is 'accept'", async (t) => {
      const action = "accept";

      t.test("when user is authenticated", async (t) => {
        const testUser = testUser2();
        let app: Express;
        let renderArgs: ViewRenderArgs;

        t.beforeEach(async () => {
          ensureShareStub.resolves(testShare);
          const result = createSharesTestExpressApp(t, {
            withAuth: true,
            activeUser: testUser,
            originalUrl: `/${testShare.id}`,
          });
          app = result.app;
          renderArgs = result.renderArgs;
        });

        t.test("clears registerable state", async (t) => {
          await performPostExistingShareRequest(app, testShare.id).send({
            action,
          });

          t.ok(clearRegisterableFake.called);
          verifyRequest(t, clearRegisterableFake.firstCall.firstArg, {
            url: `/${testShare.id}`,
            method: "POST",
          });
        });

        t.test("claims the share for the current user", async (t) => {
          await performPostExistingShareRequest(app, testShare.id).send({
            action,
          });

          t.ok(claimShareStub.called);
          t.equal(claimShareStub.firstCall.args[0], testShare.id);
          t.equal(claimShareStub.firstCall.args[1], testUser);
        });

        t.test("logs the claimed share", async (t) => {
          const claimedShare = {};
          claimShareStub.resolves(claimedShare);

          await performPostExistingShareRequest(app, testShare.id).send({
            action,
          });

          t.ok(logger.info.called);
          t.equal(logger.info.firstCall.args[0], claimedShare);
          t.equal(
            logger.info.firstCall.args[1],
            "Existing user has claimed share"
          );
        });

        t.test("redirects to get the share", async (t) => {
          const claimedShare = {};
          claimShareStub.resolves(claimedShare);

          const response = await performPostExistingShareRequest(
            app,
            testShare.id
          ).send({
            action,
          });

          // TODO: FIX
          verifyRedirectResponse(t, response, `/${testShare.id}`);
        });
      });

      t.test("when user is not authenticated", async (t) => {
        let app: Express;
        let renderArgs: ViewRenderArgs;

        t.beforeEach(async () => {
          ensureShareStub.resolves(testShare);
          redirectToRegisterStub.callsFake((_req: Request, res: Response) => {
            res.send("ignored");
          });
          const result = createSharesTestExpressApp(t);
          app = result.app;
          renderArgs = result.renderArgs;
        });

        t.test("authorizes registration", async (t) => {
          await performPostExistingShareRequest(app, testShare.id).send({
            action,
          });

          t.ok(authorizeRegistrationStub.called);
          verifyRequest(t, authorizeRegistrationStub.firstCall.args[0], {
            url: `/${testShare.id}`,
            method: "POST",
          });
          t.equal(authorizeRegistrationStub.firstCall.args[1], testShare);
        });

        t.test("redirects to register page", async (t) => {
          await performPostExistingShareRequest(app, testShare.id).send({
            action,
          });

          t.ok(redirectToRegisterStub.called);
          verifyRequest(t, redirectToRegisterStub.firstCall.args[0], {
            url: `/${testShare.id}`,
            method: "POST",
          });
          verifyResponse(t, redirectToRegisterStub.firstCall.args[1]);
        });
      });
    });

    t.test(
      "if unsupported action, renders HTML with expected user error",
      async (t) => {
        ensureShareStub.resolves(testShare);
        const { app, renderArgs } = createSharesTestExpressApp(t);

        const response = await performPostExistingShareRequest(
          app,
          testShare.id
        ).send({
          action: "foo",
        });

        verifyHtmlErrorResponse(
          t,
          response,
          renderArgs,
          StatusCodes.BAD_REQUEST,
          "Error",
          "Unsupported share response operation"
        );
      }
    );
  });
});
