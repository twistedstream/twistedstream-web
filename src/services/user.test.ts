import sinon from "sinon";
import { test } from "tap";

// test objects

const dataProvider = {
  insertCredential: sinon.stub(),
  insertUser: sinon.stub(),
  updateUser: sinon.stub(),
  findCredentialById: sinon.stub(),
  findUserById: sinon.stub(),
  findUserByName: sinon.stub(),
  findUserCredential: sinon.stub(),
  findCredentialsByUser: sinon.stub(),
  deleteCredential: sinon.stub(),
};

const validateUserFake = sinon.fake();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./user", {
    "../data": { getProvider: () => dataProvider },
    "./user-validation": {
      validateUser: validateUserFake,
    },
  });
}

//tests

test("services/user", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fetchUserById", async (t) => {
    t.test("returns user from the database by ID", async (t) => {
      const foundUser = {};
      dataProvider.findUserById.withArgs("123abc").resolves(foundUser);

      const { fetchUserById } = importModule(t);
      const result = await fetchUserById("123abc");

      t.equal(result, foundUser);
    });
  });

  t.test("fetchUserByName", async (t) => {
    t.test("returns user from the database by name", async (t) => {
      const foundUser = {};
      dataProvider.findUserByName.withArgs("bob").resolves(foundUser);

      const { fetchUserByName } = importModule(t);
      const result = await fetchUserByName("bob");

      t.equal(result, foundUser);
    });
  });

  t.test("createUser", async (t) => {
    t.test("validates the user", async (t) => {
      const { createUser } = importModule(t);
      createUser("bob", "Bob User");

      t.ok(validateUserFake.called);
      t.match(validateUserFake.firstCall.firstArg, {
        id: /^[\S]{22}/,
        username: "bob",
        displayName: "Bob User",
      });
    });

    t.test("returns expected user with generated ID", async (t) => {
      const { createUser } = importModule(t);
      const user = createUser("bob", "Bob User");

      t.match(user, {
        id: /^[\S]{22}/,
        username: "bob",
        displayName: "Bob User",
      });
    });
  });

  t.test("registerUser", async (t) => {
    let registeringUser: any;
    let addedUser: any;

    t.beforeEach(() => {
      addedUser = {
        id: "123abc",
      };
      registeringUser = {
        id: "123abc",
        username: "bob",
        displayName: "Bob User",
      };
      dataProvider.insertUser.withArgs(registeringUser).resolves(addedUser);
    });

    t.test("validates the user", async (t) => {
      const { registerUser } = importModule(t);
      await registerUser(registeringUser, {});

      t.ok(validateUserFake.called);
      t.equal(validateUserFake.firstCall.firstArg, registeringUser);
    });

    t.test("adds the user to the database", async (t) => {
      const { registerUser } = importModule(t);
      await registerUser(registeringUser, {});

      t.ok(dataProvider.insertUser.called);
      t.equal(dataProvider.insertUser.firstCall.firstArg, registeringUser);
    });

    t.test("adds the user credential to the database", async (t) => {
      const firstCredential = {};
      const { registerUser } = importModule(t);
      await registerUser(registeringUser, firstCredential);

      t.ok(dataProvider.insertCredential.called);
      t.equal(dataProvider.insertCredential.firstCall.args[0], "123abc");
      t.equal(dataProvider.insertCredential.firstCall.args[1], firstCredential);
    });

    t.test("returns the added user", async (t) => {
      const { registerUser } = importModule(t);
      const result = await registerUser(registeringUser, {});

      t.equal(result, addedUser);
    });
  });

  t.test("modifyUser", async (t) => {
    const updatingUser = { id: "123abc" };

    t.test("validates the user", async (t) => {
      const foundUser = {};
      dataProvider.findUserById.withArgs("123abc").resolves(foundUser);

      const { modifyUser } = importModule(t);
      await modifyUser(updatingUser);

      t.ok(validateUserFake.called);
      t.equal(validateUserFake.firstCall.firstArg, updatingUser);
    });

    t.test("throws error if user doesn't exist", async (t) => {
      dataProvider.findUserById.withArgs("123abc").resolves();

      const { modifyUser } = importModule(t);
      t.rejects(() => modifyUser(updatingUser), {
        message: "User with ID 123abc does not exist.",
      });
    });

    t.test("updates the user in the database", async (t) => {
      const foundUser = {};
      dataProvider.findUserById.withArgs("123abc").resolves(foundUser);

      const { modifyUser } = importModule(t);
      await modifyUser(updatingUser);

      t.ok(dataProvider.updateUser.called);
      t.equal(dataProvider.updateUser.firstCall.firstArg, updatingUser);
    });
  });

  t.test("fetchCredentialById", async (t) => {
    t.test("returns credential from the database by ID", async (t) => {
      const foundCredential = {};
      dataProvider.findCredentialById
        .withArgs("xyz789")
        .resolves(foundCredential);

      const { fetchCredentialById } = importModule(t);
      const result = await fetchCredentialById("xyz789");

      t.equal(result, foundCredential);
    });
  });

  t.test("fetchCredentialsByUserId", async (t) => {
    t.test("returns credentials from the database by user ID", async (t) => {
      const foundCredentials = [{}, {}];
      dataProvider.findCredentialsByUser
        .withArgs("123abc")
        .resolves(foundCredentials);

      const { fetchCredentialsByUserId } = importModule(t);
      const result = await fetchCredentialsByUserId("123abc");

      t.equal(result, foundCredentials);
    });
  });

  t.test("fetchCredentialsByUsername", async (t) => {
    t.test("gets user by name from database", async (t) => {
      const foundUser = {};
      dataProvider.findUserByName.withArgs("bob").resolves(foundUser);

      const { fetchCredentialsByUsername } = importModule(t);
      await fetchCredentialsByUsername("bob");

      t.ok(dataProvider.findUserByName.called);
      t.equal(dataProvider.findUserByName.firstCall.firstArg, "bob");
    });

    t.test(
      "returns user's credentials from database if one was found",
      async (t) => {
        const foundUser = { id: "123abc" };
        dataProvider.findUserByName.withArgs("bob").resolves(foundUser);
        const foundCredentials = [{}, {}];
        dataProvider.findCredentialsByUser
          .withArgs("123abc")
          .resolves(foundCredentials);

        const { fetchCredentialsByUsername } = importModule(t);
        const result = await fetchCredentialsByUsername("bob");

        t.equal(result, foundCredentials);
      }
    );

    t.test(
      "returns no credentials from database if no user was found",
      async (t) => {
        dataProvider.findUserByName.withArgs("bob").resolves();

        const { fetchCredentialsByUsername } = importModule(t);
        const result = await fetchCredentialsByUsername("bob");

        t.notOk(dataProvider.findCredentialsByUser.called);
        t.same(result, []);
      }
    );
  });

  t.test("addUserCredential", async (t) => {
    t.test(
      "throws error if credential is already associated with the user",
      async (t) => {
        dataProvider.findUserCredential
          .withArgs("123abc", "xyz789")
          .resolves({});

        const { addUserCredential } = importModule(t);
        t.rejects(
          () => addUserCredential("123abc", { credentialID: "xyz789" }),
          {
            message: "Credential with ID xyz789 already exists.",
          }
        );
      }
    );

    t.test("throws error if user does not yet exist", async (t) => {
      dataProvider.findUserCredential.withArgs("123abc", "xyz789").resolves();
      dataProvider.findUserById.withArgs("123abc").resolves();

      const { addUserCredential } = importModule(t);
      t.rejects(() => addUserCredential("123abc", { credentialID: "xyz789" }), {
        message: "User with ID 123abc not found.",
      });
    });

    t.test("adds credential to user in database", async (t) => {
      dataProvider.findUserCredential.withArgs("123abc", "xyz789").resolves();
      const foundUser = {};
      dataProvider.findUserById.withArgs("123abc").resolves(foundUser);

      const { addUserCredential } = importModule(t);
      const newCredential = { credentialID: "xyz789" };
      await addUserCredential("123abc", newCredential);

      t.ok(dataProvider.insertCredential.called);
      t.equal(dataProvider.insertCredential.firstCall.args[0], "123abc");
      t.equal(dataProvider.insertCredential.firstCall.args[1], newCredential);
    });
  });

  t.test("removeUserCredential", async (t) => {
    t.test(
      "throws error if credential is not associated with the user",
      async (t) => {
        dataProvider.findUserCredential.withArgs("123abc", "xyz789").resolves();

        const { removeUserCredential } = importModule(t);
        t.rejects(() => removeUserCredential("123abc", "xyz789"), {
          message:
            "Credential (id = xyz789) not associated with user (id = 123abc).",
        });
      }
    );

    t.test(
      "throws error if attempting to remove last credential",
      async (t) => {
        dataProvider.findUserCredential
          .withArgs("123abc", "xyz789")
          .resolves({});
        dataProvider.findCredentialsByUser.withArgs("123abc").resolves(
          // returns a single credential
          [{}]
        );

        const { removeUserCredential } = importModule(t);
        t.rejects(() => removeUserCredential("123abc", "xyz789"), {
          message:
            "Cannot remove the last credential (id = xyz789) associated with user (id = 123abc).",
        });
      }
    );

    t.test("removes credential from user in database", async (t) => {
      dataProvider.findUserCredential.withArgs("123abc", "xyz789").resolves({});
      dataProvider.findCredentialsByUser.withArgs("123abc").resolves(
        // returns a multiple credentials
        [{}, {}]
      );

      const { removeUserCredential } = importModule(t);
      await removeUserCredential("123abc", "xyz789");

      t.ok(dataProvider.deleteCredential.called);
      t.equal(dataProvider.deleteCredential.firstCall.args[0], "xyz789");
    });
  });
});
