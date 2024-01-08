import sinon from "sinon";
import request from "supertest";
import { test, Test } from "tap";

import { StatusCodes } from "http-status-codes";
import {
  blogUrl,
  companyName,
  githubProfileUrl,
  linkedInProfileUrl,
  twitterProfileUrl,
} from "../utils/config";
import { createTestExpressApp } from "../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  config?: {
    companyName: string;
    linkedInProfileUrl?: string;
    twitterProfileUrl?: string;
    githubProfileUrl?: string;
    blogUrl?: string;
  };
};

// test objects

const expressRouter = {
  use: sinon.fake(),
  get: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);

// helpers

function importModule(
  test: Test,
  {
    mockExpress = false,
    config = {
      companyName,
      linkedInProfileUrl,
      twitterProfileUrl,
      githubProfileUrl,
      blogUrl,
    },
  }: MockOptions = {}
) {
  const { default: router } = test.mockRequire("./index", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
    "../utils/config": config,
  });

  return router;
}

function createIndexTestExpressApp(test: Test, mockOptions?: MockOptions) {
  const router = importModule(test, mockOptions);

  return createTestExpressApp({
    middlewareSetup: (app) => {
      app.use(router);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../error-handler",
    },
  });
}

// tests

test("routes/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const index = importModule(t, {
      mockExpress: true,
    });

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(index, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule(t, {
      mockExpress: true,
    });

    t.same(
      expressRouter.get.getCalls().map((c) => c.firstArg),
      ["/", "/linkedin", "/twitter", "/github", "/blog"]
    );
  });

  t.test("GET /", async (t) => {
    const allLinks = [
      { name: "LinkedIn", local_url: "/linkedin" },
      { name: "Twitter (X)", local_url: "/twitter" },
      { name: "GitHub", local_url: "/github" },
      { name: "Blog", local_url: "/blog" },
    ];

    t.test("returns HTML with expected view state", async (t) => {
      const { app, renderArgs } = createIndexTestExpressApp(t);

      const response = await request(app).get("/");
      const { viewName, options } = renderArgs;

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "home");
      t.equal(options.title, "Twisted Stream Technologies");
      t.ok(Array.isArray(options.poweredBys));
      t.ok(options.poweredBys.length);
      for (const pb of options.poweredBys) {
        t.ok(pb.name);
        t.ok(pb.url);
      }
    });

    t.test("when all link configs are set, returns all links", async (t) => {
      const { app, renderArgs } = createIndexTestExpressApp(t);

      await request(app).get("/");
      const { options } = renderArgs;

      t.same(options.links, allLinks);
    });

    t.test(
      "when LinkedIn config link it not set, returns HTML with expected view state",
      async (t) => {
        const { app, renderArgs } = createIndexTestExpressApp(t, {
          config: {
            companyName,
            linkedInProfileUrl: undefined,
            twitterProfileUrl,
            githubProfileUrl,
            blogUrl,
          },
        });

        await request(app).get("/");
        const { options } = renderArgs;

        t.same(
          options.links,
          [...allLinks].filter((l) => l.local_url !== "/linkedin")
        );
      }
    );

    t.test(
      "when Twitter config link it not set, returns HTML with expected view state",
      async (t) => {
        const { app, renderArgs } = createIndexTestExpressApp(t, {
          config: {
            companyName,
            linkedInProfileUrl,
            twitterProfileUrl: undefined,
            githubProfileUrl,
            blogUrl,
          },
        });

        await request(app).get("/");
        const { options } = renderArgs;

        t.same(
          options.links,
          [...allLinks].filter((l) => l.local_url !== "/twitter")
        );
      }
    );

    t.test(
      "when GitHub config link it not set, returns HTML with expected view state",
      async (t) => {
        const { app, renderArgs } = createIndexTestExpressApp(t, {
          config: {
            companyName,
            linkedInProfileUrl,
            twitterProfileUrl,
            githubProfileUrl: undefined,
            blogUrl,
          },
        });

        await request(app).get("/");
        const { options } = renderArgs;

        t.same(
          options.links,
          [...allLinks].filter((l) => l.local_url !== "/github")
        );
      }
    );

    t.test(
      "when blog config link it not set, returns HTML with expected view state",
      async (t) => {
        const { app, renderArgs } = createIndexTestExpressApp(t, {
          config: {
            companyName,
            linkedInProfileUrl,
            twitterProfileUrl,
            githubProfileUrl,
            blogUrl: undefined,
          },
        });

        await request(app).get("/");
        const { options } = renderArgs;

        t.same(
          options.links,
          [...allLinks].filter((l) => l.local_url !== "/blog")
        );
      }
    );
  });

  t.test("GET /linkedin", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/linkedin");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "https://linkedin.com/in/test");
    });
  });

  t.test("GET /twitter", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/twitter");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "https://twitter.com/test");
    });
  });

  t.test("GET /github", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/github");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "https://github.com/test");
    });
  });

  t.test("GET /blog", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/blog");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "https://example.com/blog");
    });
  });
});
