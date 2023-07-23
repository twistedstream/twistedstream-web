import sinon from "sinon";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { testCredential1, testUser1 } from "../utils/testing/data";
import {
  assertHtmlResponse,
  assertNoUsersOrCredentials,
  assertRedirectResponse,
  assertUserAndAssociatedCredentials,
  createIntegrationTestState,
  doRegistration,
  doSignIn,
  doSignOut,
  navigatePage,
} from "../utils/testing/integration";

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Navigate, register a new user, sign out, sign in", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  // start with no registered users
  const state = createIntegrationTestState(t, [], [], []);

  t.test("Initial data state", async () => {
    // we should have no users or creds
    assertNoUsersOrCredentials(t, state);
  });

  t.test("Go to home page", async (t) => {
    const response = await navigatePage(state, "/");
    assertHtmlResponse(t, response);
  });

  t.test("Go to login page", async (t) => {
    const response = await navigatePage(state, "/login");
    assertHtmlResponse(t, response);
  });

  t.test("Go to profile page, but be challenged to authenticate", async (t) => {
    const response = await navigatePage(state, "/profile");
    assertRedirectResponse(t, response, "/login");
  });

  t.test("Go to registration page", async (t) => {
    const response = await navigatePage(state, "/register");
    assertHtmlResponse(t, response);
  });

  t.test("Register a new account", async (t) => {
    await doRegistration(t, state, testUser1, testCredential1, true);

    // we should have a new user with a new cred
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 1);
    assertUserAndAssociatedCredentials(t, state, testUser1, [testCredential1]);
  });

  t.test("Sign out", async (t) => {
    await doSignOut(t, state);
  });

  t.test("Sign in", async (t) => {
    await doSignIn(t, state, testUser1.username, testCredential1);
  });

  t.test("Go to profile page, and access content", async (t) => {
    const response = await navigatePage(state, "/profile");
    assertHtmlResponse(t, response);
  });
});
