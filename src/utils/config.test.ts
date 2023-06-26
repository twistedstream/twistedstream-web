import { test } from "tap";

test("utils/config", async (t) => {
  const {
    port,
    environment,
    logLevel,
    rpID,
    baseUrl,
    linkedInProfileUrl,
    twitterProfileUrl,
    githubProfileUrl,
    cookieSecret,
    packageName,
    packageVersion,
  } = t.mock("./config", {
    "../../package.json": {
      name: "test-package",
      version: "42.0",
    },
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

  t.test("rpID", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(rpID, "example.com");
    });
  });

  t.test("baseUrl", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(baseUrl, "http://example.com:4242");
    });
  });

  t.test("linkedInProfileUrl", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(linkedInProfileUrl, "https://linkedin.com/in/test");
    });
  });

  t.test("twitterProfileUrl", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(twitterProfileUrl, "https://twitter.com/test");
    });
  });

  t.test("githubProfileUrl", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(githubProfileUrl, "https://github.com/test");
    });
  });

  t.test("cookieSecret", async (t) => {
    t.test("is expected value", async (t) => {
      t.equal(cookieSecret, "Bananas!");
    });
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
});
