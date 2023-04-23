import { Router, Request, Response, NextFunction } from "express";
import cookieSession from "cookie-session";

import { cookieSecret } from "./utils/config";
import routes from "./routes";

const router = Router();

// INFO: Configure session
router.use(
  cookieSession({
    name: "ts-session",
    secret: cookieSecret,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

// INFO: Make user data available in all views
router.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.is_auth = !!req?.session?.authentication?.time;
  res.locals.user_name = req?.session?.authentication?.user?.name;

  next();
});

// INFO: Configure routes
router.use(routes);

export default router;
