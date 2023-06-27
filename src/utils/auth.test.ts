import { test } from "tap";
import sinon from "sinon";

import {
  capturePreAuthState,
  signIn,
  signOut,
  auth,
  requiresAuth,
} from "./auth";

test("utils/auth", async (t) => {
  t.test("capturePreAuthState", async (t) => {
    t.test("captured return_to query in session", async (t) => {
      const req: any = { query: { return_to: "/foo" } };

      capturePreAuthState(req);

      t.ok(req.session);
      t.equal(req.session.return_to, "/foo");
    });
  });

  t.test("signIn", async (t) => {
    t.test("saves authenticated identity in session", async (t) => {
      const req: any = {};
      const user: any = { id: "bob", username: "Bob User" };
      const credential: any = {};

      signIn(req, user, credential);

      t.ok(req.session);
      t.ok(req.session.authentication);
      t.same(req.session.authentication.user, {
        id: "bob",
        username: "Bob User",
      });
      t.equal(req.session.authentication.credential, credential);
      t.ok(req.session.authentication.time);
    });

    t.test("clears temp session values", async (t) => {
      const req: any = { registration: {}, return_to: "/foo" };
      const user: any = { id: "bob", username: "Bob User" };
      const credential: any = {};

      signIn(req, user, credential);

      t.ok(req.session);
      t.notOk(req.session.registration);
      t.notOk(req.session.return_to);
    });
  });

  t.test("signOut", async (t) => {
    t.test("clears the session", async (t) => {
      const req: any = { session: {} };

      signOut(req);

      t.notOk(req.session);
    });
  });

  t.test("auth", async (t) => {
    const user = {};
    const credential = {};
    const res: any = {};

    t.test("sets expected req fields if user authenticated", async (t) => {
      const req: any = {
        session: { authentication: { time: Date.now(), user, credential } },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      const middleware = auth();

      middleware(req, res, next);

      t.equal(req.user, user);
      t.equal(req.credential, credential);
      t.ok(nextCalled);
    });

    t.test(
      "does not set expected req fields if user not authenticated",
      async (t) => {
        const req: any = {};
        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        const middleware = auth();

        middleware(req, res, next);

        t.same(req, {});
        t.ok(nextCalled);
      }
    );
  });

  t.test("requiresAuth", async (t) => {
    t.test(
      "redirects to login page if user is not authenticated",
      async (t) => {
        const req: any = { originalUrl: "/foo" };
        const res: any = {
          redirect: sinon.fake(),
        };
        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        const middleware = requiresAuth();

        middleware(req, res, next);

        t.equal(res.redirect.firstCall.firstArg, "/login?return_to=%2Ffoo");
        t.notOk(nextCalled);
      }
    );

    t.test("does not redirect if user is not authenticated", async (t) => {
      const req: any = { user: {}, originalUrl: "/foo" };
      const res: any = {
        redirect: sinon.fake(),
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      const middleware = requiresAuth();

      middleware(req, res, next);

      t.notOk(res.redirect.called);
      t.ok(nextCalled);
    });
  });
});
