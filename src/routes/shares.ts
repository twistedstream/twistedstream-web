import { Response, Router } from "express";

import { AuthenticatedRequest } from "../types/express";
import { requiresAuth } from "../utils/auth";

const router = Router();

// TODO: authentication middleware

// TODO: fetch share middleware

// TODO: authorization middleware

router.get("/", requiresAuth(), (_req: AuthenticatedRequest, res: Response) => {
  res.render("shares", {
    title: "Shares",
  });

  // TODO: return HTML listing all shares (shared to and shared with)
});

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
