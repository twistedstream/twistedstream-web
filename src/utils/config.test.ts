import { test } from "tap";

test("utils/config", async (t) => {
  const {
    environment,
    packageName,
    packageVersion,
    port,
    logLevel,
    linkedInProfileUrl,
  } = t.mock("./config", {
    "../../package.json": {
      name: "test-package",
      version: "42.0",
    },
  });

  t.test("packageName", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(packageName, "test-package");
    });
  });

  t.test("packageVersion", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(packageVersion, "42.0");
    });
  });

  t.test("port", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(port, 4242);
    });
  });

  t.test("environment", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(environment, "test");
    });
  });

  t.test("logLevel", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(logLevel, "debug");
    });
  });

  t.test("linkedInProfileUrl", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(linkedInProfileUrl, "https://linkedin.com/in/test");
    });
  });
});
