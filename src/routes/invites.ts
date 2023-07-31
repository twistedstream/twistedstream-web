import { urlencoded } from "body-parser";
import { Response, Router } from "express";

import { claimInvite } from "../services/invite";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import {
  authorizeRegistration,
  clearRegisterable,
  getRegisterable,
  redirectToRegister,
} from "../utils/auth";
import { BadRequestError, ForbiddenError } from "../utils/error";
import { logger } from "../utils/logger";
import { ensureInvite } from "../utils/registration";

const router = Router();

// endpoints

router.get("/:invite_id", async (req: AuthenticatedRequest, res: Response) => {
  const invite = await ensureInvite(req);

  const { user } = req;
  // if current user (just registered)
  if (user) {
    const registerable = getRegisterable(req);
    if (!registerable) {
      throw ForbiddenError(
        "You can't accept an invite to register when you're already signed in."
      );
    }

    // claim invite
    clearRegisterable(req);
    const claimedInvite = await claimInvite(invite.id, user);
    logger.info(claimedInvite, `User has claimed invite.`);

    // redirect to shares page
    return res.redirect("/shares");
  }

  // no user yet: display accept form
  res.render("accept_invite", {
    title: "You've been invited",
    invite,
  });
});

router.post(
  "/:invite_id",
  urlencoded({ extended: false }),
  async (
    req: AuthenticatedRequestWithTypedBody<{ response?: "accept" | "reject" }>,
    res: Response
  ) => {
    const invite = await ensureInvite(req);
    if (req.user) {
      throw ForbiddenError(
        "This endpoint does not support an existing user session."
      );
    }

    const { response } = req.body;

    if (response === "accept") {
      // authorize registration with invite and redirect to register page (to come back)
      authorizeRegistration(req, invite);
      return redirectToRegister(req, res);
    }

    throw BadRequestError("Unsupported invite response operation");
  }
);

export default router;
