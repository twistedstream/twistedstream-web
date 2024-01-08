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
  t.test("exports expected values", async (t) => {
    const config = importModule(t);

    [
      { name: "port", value: 4242 },
      { name: "environment", value: "test" },
      { name: "logLevel", value: "debug" },
      { name: "baseUrl", value: "http://example.com:4242" },
      { name: "linkedInProfileUrl", value: "https://linkedin.com/in/test" },
      { name: "twitterProfileUrl", value: "https://twitter.com/test" },
      { name: "githubProfileUrl", value: "https://github.com/test" },
      { name: "packageName", value: "test-package" },
      { name: "packageVersion", value: "42.0" },
    ].forEach((item) => {
      t.same(config[item.name], item.value, item.name);
    });
  });
});
