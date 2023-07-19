import { test } from "tap";
import sinon from "sinon";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import {
  assertHtmlResponse,
  assertRedirectResponse,
  assertUserAndAssociatedCredentials,
  createIntegrationTestState,
  doRegistration,
  doSignIn,
  doSignOut,
  navigatePage,
  postForm,
} from "../utils/testing/integration";
import {
  testUser,
  testCredential1,
  testCredential2,
} from "../utils/testing/unit";

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Register and manage multiple authenticators", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  // start with an already registered user
  const state = createIntegrationTestState(
    t,
    [{ ...testUser }],
    [{ ...testCredential1, userID: testUser.id }]
  );

  t.test("Initial data state", async () => {
    // we should have an existing user and cred
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 1);
  });

  t.test("Sign in with existing passkey", async (t) => {
    await doSignIn(t, state, testUser.username, testCredential1);
  });

  t.test("Go to profile page", async (t) => {
    const response = await navigatePage(state, "/profile");
    assertHtmlResponse(t, response);
  });

  t.test("Register another passkey", async (t) => {
    await doRegistration(t, state, testUser, testCredential2, false);

    // we should now have a second cred registered to the existing user
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 2);
    assertUserAndAssociatedCredentials(t, state, testUser, [
      testCredential1,
      testCredential2,
    ]);
  });

  t.test("Sign out", async (t) => {
    await doSignOut(t, state);
  });

  t.test("Sign in with new passkey", async (t) => {
    await doSignIn(t, state, testUser.username, testCredential2);
  });

  t.test("Delete original passkey", async (t) => {
    const response = await postForm(state, "/profile", {
      delete_cred: testCredential1.credentialID,
    });

    assertRedirectResponse(t, response, "/");

    // we should now have only the second cred registered to the existing user
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 1);
    assertUserAndAssociatedCredentials(t, state, testUser, [testCredential2]);
  });
});
