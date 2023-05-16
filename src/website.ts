import { Router, Request, Response, NextFunction } from "express";
import cookieSession from "cookie-session";

import { cookieSecret } from "./utils/config";
import routes from "./routes";
import { AuthenticatedRequest } from "./types/express";
import { auth } from "./utils/auth";

const router = Router();

// INFO: Configure session
router.use(
  cookieSession({
    name: "ts-session",
    secret: cookieSecret,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);
router.use(auth());

// INFO: Make user data available in all views
router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  res.locals.user = req.user;

  next();
});

// INFO: Configure routes
router.use(routes);

export default router;
