import sinon from "sinon";
import { test } from "tap";
import {
  testFile1,
  testFile2,
  testFile3,
  testFile4,
} from "../utils/testing/data";

// test objects

const logger = {
  info: sinon.fake(),
};
const inMemoryDataProviderConstructorFake = sinon.fake();
class MockInMemoryDataProvider {
  constructor(options: any) {
    inMemoryDataProviderConstructorFake(options);
    this.isMock = true;
  }

  isMock: boolean;
}

// helpers

function importModule(test: Tap.Test, dataProviderName: string) {
  return test.mock("./index", {
    "../utils/config": { dataProviderName },
    "../utils/logger": { logger },
    "./in-memory": { InMemoryDataProvider: MockInMemoryDataProvider },
  });
}

// tests

test("data/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  test("getProvider", async (t) => {
    t.test("If provider hasn't been loaded yet", async (t) => {
      t.test(
        "If no provider is configured, throw expected exception",
        async (t) => {
          const { getProvider } = importModule(t, "");

          t.throws(() => getProvider(), {
            name: "AssertionError",
            message: "Missing config: data provider name",
          });
        }
      );

      t.test("If in-memory provider configured, create it", async (t) => {
        const { getProvider } = importModule(t, "in-memory");

        getProvider();

        t.ok(inMemoryDataProviderConstructorFake.called);
        t.same(inMemoryDataProviderConstructorFake.firstCall.firstArg, {
          users: [],
          credentials: [],
          invites: [],
          shares: [],
          files: [testFile1(), testFile2(), testFile3(), testFile4()],
        });
      });

      t.test(
        "If configured provider is not supported, throw expected exception",
        async (t) => {
          const { getProvider } = importModule(t, "no-exist");

          t.throws(() => getProvider(), {
            name: "AssertionError",
            message: "Unsupported data provider name: no-exist",
          });
        }
      );

      t.test("Log loaded data provider name", async (t) => {
        const { getProvider } = importModule(t, "in-memory");

        getProvider();

        t.ok(logger.info.called);
        t.match(logger.info.firstCall.firstArg, "in-memory");
      });

      t.test("Return loaded data provider", async (t) => {
        const { getProvider } = importModule(t, "in-memory");

        const result = getProvider();

        t.ok(result);
        t.ok(result.isMock);
      });
    });

    t.test(
      "If provider has already been loaded, return cached provider",
      async (t) => {
        const { getProvider } = importModule(t, "in-memory");

        getProvider();
        sinon.resetHistory();

        const result = getProvider();

        t.ok(result);
        t.ok(result.isMock);
        t.notOk(inMemoryDataProviderConstructorFake.called);
      }
    );
  });
});
