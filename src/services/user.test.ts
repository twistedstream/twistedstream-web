import { test } from "tap";
import sinon from "sinon";

test("services/user", async (t) => {
  const addCredentialStub = sinon.stub();
  const addUserStub = sinon.stub();
  const patchUserStub = sinon.stub();
  const findCredentialByIdStub = sinon.stub();
  const findUserByIdStub = sinon.stub();
  const findUserByNameStub = sinon.stub();
  const findUserCredentialStub = sinon.stub();
  const getCredentialsStub = sinon.stub();
  const removeCredentialStub = sinon.stub();
  const validateUserFake = sinon.fake();

  const importModule = () => {
    addCredentialStub.resetHistory();
    addUserStub.resetHistory();
    patchUserStub.resetHistory();
    findCredentialByIdStub.resetHistory();
    findUserByIdStub.resetHistory();
    findUserByNameStub.resetHistory();
    findUserCredentialStub.resetHistory();
    getCredentialsStub.resetHistory();
    removeCredentialStub.resetHistory();
    validateUserFake.resetHistory();

    return t.mock("./user", {
      "../data": {
        addCredential: addCredentialStub,
        addUser: addUserStub,
        patchUser: patchUserStub,
        findCredentialById: findCredentialByIdStub,
        findUserById: findUserByIdStub,
        findUserByName: findUserByNameStub,
        findUserCredential: findUserCredentialStub,
        getCredentials: getCredentialsStub,
        removeCredential: removeCredentialStub,
      },
      "./user-validation": {
        validateUser: validateUserFake,
      },
    });
  };

  t.test("fetchUserById", async (t) => {
    t.test("returns user from the database by ID", async (t) => {
      const foundUser = {};
      findUserByIdStub.withArgs("123abc").resolves(foundUser);

      const { fetchUserById } = importModule();
      const result = await fetchUserById("123abc");

      t.equal(result, foundUser);
    });
  });

  t.test("fetchUserByName", async (t) => {
    t.test("returns user from the database by name", async (t) => {
      const foundUser = {};
      findUserByNameStub.withArgs("bob").resolves(foundUser);

      const { fetchUserByName } = importModule();
      const result = await fetchUserByName("bob");

      t.equal(result, foundUser);
    });
  });

  t.test("createUser", async (t) => {
    t.test("validates the user", async (t) => {
      const { createUser } = importModule();
      createUser("bob", "Bob User");

      t.ok(validateUserFake.called);
      t.match(validateUserFake.firstCall.firstArg, {
        id: /^[\S]{22}/,
        username: "bob",
        displayName: "Bob User",
      });
    });

    t.test("returns expected user with generated ID", async (t) => {
      const { createUser } = importModule();
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
      addUserStub.withArgs(registeringUser).resolves(addedUser);
    });

    t.test("validates the user", async (t) => {
      const { registerUser } = importModule();
      await registerUser(registeringUser, {});

      t.ok(validateUserFake.called);
      t.equal(validateUserFake.firstCall.firstArg, registeringUser);
    });

    t.test("adds the user to the database", async (t) => {
      const { registerUser } = importModule();
      await registerUser(registeringUser, {});

      t.ok(addUserStub.called);
      t.equal(addUserStub.firstCall.firstArg, registeringUser);
    });

    t.test("adds the user credential to the database", async (t) => {
      const firstCredential = {};
      const { registerUser } = importModule();
      await registerUser(registeringUser, firstCredential);

      t.ok(addCredentialStub.called);
      t.equal(addCredentialStub.firstCall.args[0], "123abc");
      t.equal(addCredentialStub.firstCall.args[1], firstCredential);
    });

    t.test("returns the added user", async (t) => {
      const { registerUser } = importModule();
      const result = await registerUser(registeringUser, {});

      t.equal(result, addedUser);
    });
  });

  t.test("updateUser", async (t) => {
    const updatingUser = { id: "123abc" };

    t.test("validates the user", async (t) => {
      const foundUser = {};
      findUserByIdStub.withArgs("123abc").resolves(foundUser);

      const { updateUser } = importModule();
      await updateUser(updatingUser);

      t.ok(validateUserFake.called);
      t.equal(validateUserFake.firstCall.firstArg, updatingUser);
    });

    t.test("throws error if user doesn't exist", async (t) => {
      findUserByIdStub.withArgs("123abc").resolves();

      const { updateUser } = importModule();
      t.rejects(() => updateUser(updatingUser), {
        message: "User with ID 123abc does not exist.",
      });
    });

    t.test("updates the user in the database", async (t) => {
      const foundUser = {};
      findUserByIdStub.withArgs("123abc").resolves(foundUser);

      const { updateUser } = importModule();
      await updateUser(updatingUser);

      t.ok(patchUserStub.called);
      t.equal(patchUserStub.firstCall.firstArg, updatingUser);
    });
  });

  t.test("fetchCredentialById", async (t) => {
    t.test("returns credential from the database by ID", async (t) => {
      const foundCredential = {};
      findCredentialByIdStub.withArgs("xyz789").resolves(foundCredential);

      const { fetchCredentialById } = importModule();
      const result = await fetchCredentialById("xyz789");

      t.equal(result, foundCredential);
    });
  });

  t.test("fetchCredentialsByUserId", async (t) => {
    t.test("returns credentials from the database by user ID", async (t) => {
      const foundCredentials = [{}, {}];
      getCredentialsStub.withArgs("123abc").resolves(foundCredentials);

      const { fetchCredentialsByUserId } = importModule();
      const result = await fetchCredentialsByUserId("123abc");

      t.equal(result, foundCredentials);
    });
  });

  t.test("fetchCredentialsByUsername", async (t) => {
    t.test("gets user by name from database", async (t) => {
      const foundUser = {};
      findUserByNameStub.withArgs("bob").resolves(foundUser);

      const { fetchCredentialsByUsername } = importModule();
      await fetchCredentialsByUsername("bob");

      t.ok(findUserByNameStub.called);
      t.equal(findUserByNameStub.firstCall.firstArg, "bob");
    });

    t.test(
      "returns user's credentials from database if one was found",
      async (t) => {
        const foundUser = { id: "123abc" };
        findUserByNameStub.withArgs("bob").resolves(foundUser);
        const foundCredentials = [{}, {}];
        getCredentialsStub.withArgs("123abc").resolves(foundCredentials);

        const { fetchCredentialsByUsername } = importModule();
        const result = await fetchCredentialsByUsername("bob");

        t.equal(result, foundCredentials);
      }
    );

    t.test(
      "returns no credentials from database if no user was found",
      async (t) => {
        findUserByNameStub.withArgs("bob").resolves();

        const { fetchCredentialsByUsername } = importModule();
        const result = await fetchCredentialsByUsername("bob");

        t.notOk(getCredentialsStub.called);
        t.same(result, []);
      }
    );
  });

  t.test("addUserCredential", async (t) => {
    t.test(
      "throws error if credential is already associated with the user",
      async (t) => {
        findUserCredentialStub.withArgs("123abc", "xyz789").resolves({});

        const { addUserCredential } = importModule();
        t.rejects(
          () => addUserCredential("123abc", { credentialID: "xyz789" }),
          {
            message: "Credential with ID xyz789 already exists.",
          }
        );
      }
    );

    t.test("throws error if user does not yet exist", async (t) => {
      findUserCredentialStub.withArgs("123abc", "xyz789").resolves();
      findUserByIdStub.withArgs("123abc").resolves();

      const { addUserCredential } = importModule();
      t.rejects(() => addUserCredential("123abc", { credentialID: "xyz789" }), {
        message: "User with ID 123abc not found.",
      });
    });

    t.test("adds credential to user in database", async (t) => {
      findUserCredentialStub.withArgs("123abc", "xyz789").resolves();
      const foundUser = {};
      findUserByIdStub.withArgs("123abc").resolves(foundUser);

      const { addUserCredential } = importModule();
      const newCredential = { credentialID: "xyz789" };
      await addUserCredential("123abc", newCredential);

      t.ok(addCredentialStub.called);
      t.equal(addCredentialStub.firstCall.args[0], "123abc");
      t.equal(addCredentialStub.firstCall.args[1], newCredential);
    });
  });

  t.test("removeUserCredential", async (t) => {
    t.test(
      "throws error if credential is not associated with the user",
      async (t) => {
        findUserCredentialStub.withArgs("123abc", "xyz789").resolves();

        const { removeUserCredential } = importModule();
        t.rejects(() => removeUserCredential("123abc", "xyz789"), {
          message:
            "Credential (id = xyz789) not associated with user (id = 123abc).",
        });
      }
    );

    t.test(
      "throws error if attempting to remove last credential",
      async (t) => {
        findUserCredentialStub.withArgs("123abc", "xyz789").resolves({});
        getCredentialsStub.withArgs("123abc").resolves(
          // returns a single credential
          [{}]
        );

        const { removeUserCredential } = importModule();
        t.rejects(() => removeUserCredential("123abc", "xyz789"), {
          message:
            "Cannot remove the last credential (id = xyz789) associated with user (id = 123abc).",
        });
      }
    );

    t.test("removes credential from user in database", async (t) => {
      findUserCredentialStub.withArgs("123abc", "xyz789").resolves({});
      getCredentialsStub.withArgs("123abc").resolves(
        // returns a multiple credentials
        [{}, {}]
      );

      const { removeUserCredential } = importModule();
      await removeUserCredential("123abc", "xyz789");

      t.ok(removeCredentialStub.called);
      t.same(removeCredentialStub.firstCall.args, ["123abc", "xyz789"]);
    });
  });
});
