import sinon from "sinon";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { testCredential1, testUser1 } from "../utils/testing/data";
import {
  assertHtmlResponse,
  assertRedirectResponse,
  assertUserAndAssociatedCredentials,
  createIntegrationTestState,
  doSignIn,
  navigatePage,
  postForm,
} from "../utils/testing/integration";

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Manage profile", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  // start with an already registered user
  const state = createIntegrationTestState(
    t,
    [{ ...testUser1 }],
    [{ ...testCredential1, userID: testUser1.id }]
  );

  t.test("Initial data state", async () => {
    // we should have an existing user and cred
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 1);
  });

  t.test("Sign in with existing passkey", async (t) => {
    await doSignIn(t, state, testUser1.username, testCredential1);
  });

  t.test("Go to profile page", async (t) => {
    const response = await navigatePage(state, "/profile");
    assertHtmlResponse(t, response);
  });

  t.test("Update user's profile (display name)", async (t) => {
    const response = await postForm(state, "/profile", {
      update: "profile",
      display_name: "Bob User 2",
    });

    assertRedirectResponse(t, response, "/");

    // Bob's user profile should be updated
    const newUser = { ...testUser1, displayName: "Bob User 2" };
    assertUserAndAssociatedCredentials(t, state, newUser, []);
  });
});
