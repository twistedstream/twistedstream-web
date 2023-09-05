import { DateTime } from "luxon";
import sinon from "sinon";
import { test } from "tap";
import { testNowDate } from "../utils/testing/data";

// test objects
const dataProvider = {
  getUserCount: sinon.stub(),
  insertUser: sinon.stub(),
  insertInvite: sinon.stub(),
  findInviteById: sinon.stub(),
  updateInvite: sinon.stub(),
};

const uniqueStub = sinon.stub();
const nowFake = sinon.fake.returns(testNowDate);
const newInviteStub = sinon.stub();

// helpers

function importModule(test: Tap.Test, mockNewInvite: boolean) {
  const dependencies: any = {
    "../data": { getProvider: () => dataProvider },
    "../utils/time": { now: nowFake },
    "../utils/identifier": { unique: uniqueStub },
  };
  // mock newInvite export
  if (mockNewInvite) {
    dependencies["./invite"] = { newInvite: newInviteStub };
  }

  return test.mock("./invite", dependencies);
}

// tests

test("services/invite", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("createRootUserAndInvite", async (t) => {
    let createRootUserAndInvite: any;

    t.beforeEach(async () => {
      createRootUserAndInvite = importModule(t, true).createRootUserAndInvite;
    });

    t.test("gets the user count", async (t) => {
      try {
        await createRootUserAndInvite();
      } catch {}

      t.ok(dataProvider.getUserCount.called);
      t.equal(dataProvider.getUserCount.firstCall.args.length, 0);
    });

    t.test("when no users", async (t) => {
      t.beforeEach(() => {
        dataProvider.getUserCount.resolves(0);
        uniqueStub.returns("user-id");
      });

      t.test("creates root admin user", async (t) => {
        try {
          await createRootUserAndInvite();
        } catch {}

        t.ok(dataProvider.insertUser.called);
        t.same(dataProvider.insertUser.firstCall.firstArg, {
          id: "user-id",
          created: testNowDate,
          username: "root",
          displayName: "Root Admin",
          isAdmin: true,
        });
      });

      t.test("creates first admin invite", async (t) => {
        const rootAdmin = {};
        dataProvider.insertUser.resolves(rootAdmin);

        try {
          await createRootUserAndInvite();
        } catch {}

        t.ok(newInviteStub.called);
        t.equal(newInviteStub.firstCall.args[0], rootAdmin);
        t.equal(newInviteStub.firstCall.args[1], true);
      });

      t.test("inserts admin invite", async (t) => {
        const firstInvite = {};
        newInviteStub.resolves(firstInvite);

        try {
          await createRootUserAndInvite();
        } catch {}

        t.ok(dataProvider.insertInvite.called);
        t.equal(dataProvider.insertInvite.firstCall.firstArg, firstInvite);
      });

      t.test("returns new inserted admin invite", async (t) => {
        const insertedInvite = {};
        dataProvider.insertInvite.resolves(insertedInvite);

        const result = await createRootUserAndInvite();

        t.ok(result);
        t.equal(result, insertedInvite);
      });
    });

    t.test("if some users, does nothing", async (t) => {
      dataProvider.getUserCount.resolves(1);

      await createRootUserAndInvite();

      t.notOk(dataProvider.insertUser.called);
      t.notOk(uniqueStub.called);
      t.notOk(nowFake.called);
      t.notOk(dataProvider.insertInvite.called);
    });
  });

  t.test("newInvite", async (t) => {
    let newInvite: any;

    t.beforeEach(async () => {
      newInvite = importModule(t, false).newInvite;
    });

    t.test("creates an invite with expected core data", async (t) => {
      const by = {};
      uniqueStub.returns("invite-id");

      const result = await newInvite(by, false);

      t.ok(result);
      t.equal(result.id, "invite-id");
      t.equal(result.sourceType, "invite");
      t.equal(result.created, testNowDate);
      t.equal(result.createdBy, by);
    });

    t.test(
      "if admin specified, creates an expected admin invite",
      async (t) => {
        const by = {};

        const result = await newInvite(by, true);

        t.ok(result.isAdmin);
      }
    );

    t.test(
      "if no admin specified, creates an expected non-admin invite",
      async (t) => {
        const by = {};

        const result = await newInvite(by, false);

        t.notOk(result.isAdmin);
      }
    );
  });

  t.test("fetchInviteById", async (t) => {
    let fetchInviteById: any;

    t.beforeEach(async () => {
      fetchInviteById = importModule(t, false).fetchInviteById;
    });

    t.test("finds the invite by ID", async (t) => {
      try {
        await fetchInviteById("invite-id");
      } catch {}

      t.ok(dataProvider.findInviteById.called);
      t.equal(dataProvider.findInviteById.firstCall.firstArg, "invite-id");
    });

    t.test("returns the found invite", async (t) => {
      const invite = {};
      dataProvider.findInviteById.resolves(invite);

      const result = await fetchInviteById("invite-id");

      t.ok(result);
      t.equal(result, invite);
    });
  });

  t.test("claimInvite", async (t) => {
    let claimInvite: any;

    t.beforeEach(async () => {
      claimInvite = importModule(t, false).claimInvite;
    });

    t.test("finds existing invite", async (t) => {
      try {
        await claimInvite("invite-id", {});
      } catch {}

      t.ok(dataProvider.findInviteById.called);
      t.equal(dataProvider.findInviteById.firstCall.firstArg, "invite-id");
    });

    t.test("if invite doesn't exist, throws expected error", async (t) => {
      dataProvider.findInviteById.resolves(undefined);

      t.rejects(async () => await claimInvite("invite-id", {}), {
        message: "Invite with ID 'invite-id' does not exist",
      });
    });

    t.test(
      "if invite has already been claimed, throws expected error",
      async (t) => {
        const invite = {
          claimed: DateTime.fromObject({ year: 2023, month: 1, day: 1 }),
        };
        dataProvider.findInviteById.resolves(invite);

        t.rejects(async () => await claimInvite("invite-id", {}), {
          message: "Invite with ID 'invite-id' has already been claimed",
        });
      }
    );

    t.test("when unclaimed invite", async (t) => {
      let invite: any;

      t.beforeEach(async () => {
        invite = { id: "invite-id" };
        dataProvider.findInviteById.onFirstCall().resolves(invite);
      });

      t.test("claims invite and updates the database", async (t) => {
        const by = {};

        try {
          await claimInvite("invite-id", by);
        } catch {}

        t.equal(invite.claimed, testNowDate);
        t.equal(invite.claimedBy, by);
        t.ok(dataProvider.updateInvite.called);
        t.equal(dataProvider.updateInvite.firstCall.firstArg, invite);
      });

      t.test("re-fetches the updated invite", async (t) => {
        try {
          await claimInvite("invite-id", {});
        } catch {}

        t.ok(dataProvider.findInviteById.calledTwice);
        t.equal(dataProvider.findInviteById.secondCall.firstArg, "invite-id");
      });

      t.test("returns the updated invite", async (t) => {
        const updatedInvite = {};
        dataProvider.findInviteById.onSecondCall().resolves(updatedInvite);

        const result = await claimInvite("invite-id", {});

        t.ok(result);
        t.equal(result, updatedInvite);
      });
    });
  });
});
