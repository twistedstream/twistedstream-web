import { urlencoded } from "body-parser";
import { Response, Router } from "express";
import { DateTime } from "luxon";

import { fetchShareById, fetchSharesByClaimedUserId } from "../services/share";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import { requiresAuth } from "../utils/auth";
import { maxShareLifetime } from "../utils/config";
import { BadRequestError, NotFoundError, assertValue } from "../utils/error";
import { logger } from "../utils/logger";

const router = Router();

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = assertValue(req.user);

    const shares = await fetchSharesByClaimedUserId(user.id);
    const sharesWithMe = shares.map((s) => ({
      title: s.title,
      url: `/shares/${s.id}`,
      created: s.created.toISO(),
      from: s.createdBy.username,
      claimed: s.claimed?.toISO(),
    }));

    res.render("shares", {
      title: "Shares",
      sharesWithMe,
    });

    // TODO: return HTML listing all shares (shared to and shared with)
  }
);

router.post("/", (_req: AuthenticatedRequest, _res: Response) => {
  // TODO: create new share (admin role)
});

router.post("/", (_req: AuthenticatedRequest, _res: Response) => {
  // body: del_share = SHARE_ID
  // TODO: delete share (admin role)
});

router.get("/:share_id", async (req: AuthenticatedRequest, res: Response) => {
  // validate request
  const { share_id } = req.params;
  if (!share_id) {
    throw BadRequestError("Missing: share ID");
  }
  // find share
  const share = await fetchShareById(share_id);
  if (!share) {
    throw NotFoundError();
  }
  // make sure it hasn't already been claimed
  if (share.claimed) {
    logger.warn(
      `Invite (id = ${share.id}) was accessed after it was already claimed.`
    );

    throw NotFoundError();
  }
  // make sure it hasn't expired
  if (DateTime.now() > share.created.plus(maxShareLifetime)) {
    logger.warn(
      `Invite (id = ${share.id}) was accessed after it was already claimed.`
    );

    throw NotFoundError();
  }

  // TODO: if current user
  if (req.user) {
    // - If toUsername != current username, FAIL: share was intended for a different user
    // - clear registerable
    // - claim the share!
    // - render shared document!
  }

  // TODO: if no current user
  // - If toUsername set: FAIL since share is meant for another existing user
  // - authorizeRegistration
  // - set return_url to current, so we come back here after
  // - Redirect to registration
});

router.post(
  "/:invite_id",
  urlencoded({ extended: false }),
  async (
    req: AuthenticatedRequestWithTypedBody<{ response?: "accept" | "reject" }>,
    res: Response
  ) => {
    // TODO:
  }
);

export default router;
