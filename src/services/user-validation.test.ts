import { test } from "tap";

import { validateUser } from "./user-validation";

test("services/user-validation", async (t) => {
  t.test("validateUser", async (t) => {
    t.test("throws error if username is empty", async (t) => {
      t.throws(
        () =>
          validateUser({
            id: "123abc",
            username: "",
            displayName: "Bob User",
            isAdmin: false,
          }),
        {
          message: /^User: username: must match pattern: .*$/,
        }
      );
    });

    t.test("throws error if username is incorrect format", async (t) => {
      t.throws(
        () =>
          validateUser({
            id: "123abc",
            username: "b",
            displayName: "Bob User",
            isAdmin: false,
          }),
        {
          message: /^User: username: must match pattern: .*$/,
        }
      );
    });

    t.test("throws error if display name is empty", async (t) => {
      t.throws(
        () =>
          validateUser({
            id: "123abc",
            username: "bob",
            displayName: "",
            isAdmin: false,
          }),
        {
          message: /^User: displayName: must match pattern: .*$/,
        }
      );
    });

    t.test("throws error if display name is incorrect format", async (t) => {
      t.throws(
        () =>
          validateUser({
            id: "123abc",
            username: "bob",
            displayName: "B",
            isAdmin: false,
          }),
        {
          message: /^User: displayName: must match pattern: .*$/,
        }
      );
    });

    t.test("does not throw error if user is valid", async (t) => {
      t.doesNotThrow(() =>
        validateUser({
          id: "123abc",
          username: "bob",
          displayName: "Bob User",
          isAdmin: false,
        })
      );
    });
  });
});
