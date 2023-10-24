import { test } from "tap";

// helpers
function importModule(test: Tap.Test) {
  return test.mock("./config", {
    "../../package.json": {
      name: "test-package",
      version: "42.0",
    },
  });
}

test("utils/config", async (t) => {
  t.test("port", async (t) => {
    const { port } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(port, 4242);
    });
  });

  t.test("environment", async (t) => {
    const { environment } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(environment, "test");
    });
  });

  t.test("logLevel", async (t) => {
    const { logLevel } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(logLevel, "debug");
    });
  });

  t.test("rpID", async (t) => {
    const { rpID } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(rpID, "example.com");
    });
  });

  t.test("baseUrl", async (t) => {
    const { baseUrl } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(baseUrl, "http://example.com:4242");
    });
  });

  t.test("linkedInProfileUrl", async (t) => {
    const { linkedInProfileUrl } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(linkedInProfileUrl, "https://linkedin.com/in/test");
    });
  });

  t.test("twitterProfileUrl", async (t) => {
    const { twitterProfileUrl } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(twitterProfileUrl, "https://twitter.com/test");
    });
  });

  t.test("githubProfileUrl", async (t) => {
    const { githubProfileUrl } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(githubProfileUrl, "https://github.com/test");
    });
  });

  t.test("cookieSecret", async (t) => {
    const { cookieSecret } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(cookieSecret, "Bananas!");
    });
  });

  t.test("csrfSecret", async (t) => {
    const { csrfSecret } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(csrfSecret, "Bananas?");
    });
  });

  t.test("dataProviderName", async (t) => {
    const { dataProviderName } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(dataProviderName, "in-memory");
    });
  });

  t.test("fileProviderName", async (t) => {
    const { fileProviderName } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(fileProviderName, "local");
    });
  });

  t.test("packageName", async (t) => {
    const { packageName } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(packageName, "test-package");
    });
  });

  t.test("packageVersion", async (t) => {
    const { packageVersion } = importModule(t);

    t.test("is expected value", async (t) => {
      t.equal(packageVersion, "42.0");
    });
  });
});
