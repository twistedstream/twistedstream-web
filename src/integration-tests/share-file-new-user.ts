import sinon from "sinon";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import supertest from "supertest";
import {
  testCredential1,
  testCredential2,
  testFile1,
  testUser2,
} from "../utils/testing/data";
import {
  assertHtmlResponse,
  assertJsonResponse,
  assertRedirectResponse,
  assertUserAndAssociatedCredentials,
  createIntegrationTestState,
  doRegistration,
  doSignIn,
  doSignOut,
  navigatePage,
  postForm,
} from "../utils/testing/integration";

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Share a file to any user, new user accepts, registers, and accesses share", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  // regular user
  const username = "bob";
  const displayName = "Bob User";
  const cred1 = testCredential1();
  // admin user
  const user2 = testUser2();
  const cred2 = testCredential2();

  const file1 = testFile1();

  // start with an admin user (that can create shares)
  const state = createIntegrationTestState(t, {
    users: [user2],
    credentials: [{ ...cred2, user: user2 }],
    invites: [],
    shares: [],
    files: [file1],
  });

  t.test("Initial data state", async (t) => {
    // we should have an existing user and cred
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 1);
    t.equal(state.shares.length, 0);
  });

  t.test("Go to login page", async (t) => {
    const response = await navigatePage(state, "/login");
    assertHtmlResponse(t, response);
  });

  t.test("Sign in as admin", async (t) => {
    await doSignIn(t, state, user2.username, cred2);
  });

  t.test("Go to shares page", async (t) => {
    const response = await navigatePage(state, `/shares`);
    assertHtmlResponse(t, response);
  });

  t.test("Go to new share page", async (t) => {
    const response = await navigatePage(state, `/shares/new`);
    assertHtmlResponse(t, response);
  });

  t.test("Create a new share (for any user)", async (t) => {
    const backingUrl = `https://example.com/${file1.id}`;
    let response: supertest.Response;

    // validate
    response = await postForm(state, `/shares/new`, {
      csrf_token: state.csrfToken,
      action: "validate",
      backingUrl,
    });
    assertHtmlResponse(t, response);

    // create
    response = await postForm(state, `/shares/new`, {
      csrf_token: state.csrfToken,
      action: "create",
      backingUrl,
    });
    assertRedirectResponse(t, response, "/shares");

    // state
    t.equal(state.shares.length, 1);
  });

  t.test("Sign out", async (t) => {
    await doSignOut(t, state);
  });

  t.test("Go to share link (which renders accept form)", async (t) => {
    const share = state.shares[0];

    const response = await navigatePage(state, `/shares/${share.id}`);
    assertHtmlResponse(t, response);
  });

  t.test("Accept share", async (t) => {
    const share = state.shares[0];

    const response = await postForm(state, `/shares/${share.id}`, {
      csrf_token: state.csrfToken,
      action: "accept",
    });

    assertRedirectResponse(
      t,
      response,
      `/register?return_to=%2Fshares%2F${share.id}`
    );
  });

  t.test("Follow redirect to registration page", async (t) => {
    const response = await navigatePage(state, state.redirectUrl);
    assertHtmlResponse(t, response);
  });

  t.test("Register a new account", async (t) => {
    await doRegistration(t, state, username, displayName, cred1, true);

    // we should have a new user with a new cred
    t.equal(state.users.length, 2);
    t.equal(state.credentials.length, 2);
    assertUserAndAssociatedCredentials(t, state, username, displayName, [
      cred1,
    ]);
  });

  t.test(
    "Follow redirect back to the share link and validate content",
    async (t) => {
      const share = state.shares[0];
      const claimingUser = state.users[1];

      const response = await navigatePage(state, state.redirectUrl);
      assertJsonResponse(t, response, (json) => {
        t.equal(json.id, share.id);
        t.equal(json.claimedBy.id, claimingUser.id);
      });

      t.same(share.claimedBy, claimingUser);
    }
  );
});
