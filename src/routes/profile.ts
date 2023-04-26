import { Router, Request, Response, NextFunction } from "express";
import { BadRequestError, UnauthorizedError } from "../utils/error";
import { fetchUserById } from "../services/users";
import { AuthenticatedSession } from "../types/session";

const router = Router();

// TODO: authentication middleware
const requiresAuth =
  () => (req: Request, _res: Response, next: NextFunction) => {
    if (req?.session?.authentication?.time) {
      return next();
    }

    next(UnauthorizedError());
  };

// TODO: fetch share middleware

// TODO: authorization middleware

router.get("/", requiresAuth(), async (req: Request, res: Response) => {
  const authentication: AuthenticatedSession = req?.session?.authentication;
  // fetch existing user
  const existingUser = await fetchUserById(authentication.user.id);
  if (!existingUser) {
    throw BadRequestError(`No such user with ID ${authentication.user.id}`);
  }

  res.render("profile", {
    title: "Profile",
    user: existingUser,
  });
});

export default router;
