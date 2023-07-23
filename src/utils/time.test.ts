import { test } from "tap";

import { now } from "./time";

test("utils/time", async (t) => {
  test("now", async (t) => {
    test("returns a date that is close to actual now", async (t) => {
      const lowerLimit = new Date(Date.now() - 100);
      const upperLimit = new Date(Date.now() + 100);

      const result = now();
      t.ok(result > lowerLimit);
      t.ok(result < upperLimit);
    });
  });
});
