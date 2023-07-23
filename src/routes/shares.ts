import { Response, Router } from "express";

import { fetchSharesByClaimedUserId } from "../services/share";
import { AuthenticatedRequest } from "../types/express";
import { requiresAuth } from "../utils/auth";
import { assertValue } from "../utils/error";

const router = Router();

// TODO: authentication middleware

// TODO: fetch share middleware

// TODO: authorization middleware

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = assertValue(req.user);

    const shares = await fetchSharesByClaimedUserId(user.id);
    const sharesWithMe = shares.map((s) => ({
      title: s.title,
      url: `/shares/${s.id}`,
      created: s.created.toISOString(),
      from: s.fromUser.username,
      claimed: s.claimed?.toISOString(),
    }));

    res.render("shares", {
      title: "Shares",
      sharesWithMe,
    });

    // TODO: return HTML listing all shares (shared to and shared with)
  }
);

router.get("/:share_id", (_req: AuthenticatedRequest, _res: Response) => {
  // TODO: return document content
});

router.post("/", (_req: AuthenticatedRequest, _res: Response) => {
  // TODO: create new share (admin role)
});

router.post("/", (_req: AuthenticatedRequest, _res: Response) => {
  // body: del_share = SHARE_ID
  // TODO: delete share
});

export default router;
