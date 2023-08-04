import { urlencoded } from "body-parser";
import { Response, Router } from "express";
import { Duration } from "luxon";

import {
  claimShare,
  createShare,
  fetchSharesByClaimedUserId,
  fetchSharesByCreatedUserId,
  newShare,
} from "../services/share";
import { DocumentType, Share } from "../types/entity";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import {
  authorizeRegistration,
  clearRegisterable,
  getRegisterable,
  redirectToLogin,
  redirectToRegister,
  requiresAdmin,
  requiresAuth,
} from "../utils/auth";
import { BadRequestError, ForbiddenError, assertValue } from "../utils/error";
import { logger } from "../utils/logger";
import { ensureShare, renderShare } from "../utils/share";

const router = Router();

const EXPIRATIONS: string[] = [
  "PT5M",
  "PT30M",
  "PT1H",
  "PT12H",
  "P1D",
  "P3D",
  "P1W",
  "P2W",
  "P1M",
  "P3M",
  "P6M",
  "P1Y",
];

function buildExpirations(current?: Duration) {
  return EXPIRATIONS.map((k) => ({
    value: k,
    description: Duration.fromISO(k).toHuman(),
    selected: k === current?.toISO(),
  }));
}

function getDocumentTypeStyle(documentType: DocumentType) {
  switch (documentType) {
    case "document":
      return "primary";
    case "spreadsheet":
      return "success";
    case "presentation":
      return "warning";
    case "pdf":
      return "danger";
  }
}

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = assertValue(req.user);

    const sharesWithMe = (await fetchSharesByClaimedUserId(user.id)).map(
      (s) => ({
        title: s.documentTitle,
        url: `/shares/${s.id}`,
        created: s.created.toISO(),
        from: s.createdBy.username,
        claimed: s.claimed?.toISO(),
      })
    );
    const sharesByMe = (await fetchSharesByCreatedUserId(user.id)).map((s) => ({
      title: s.documentTitle,
      url: `/shares/${s.id}`,
      created: s.created.toISO(),
      to: s.toUsername,
      expires: s.expireDuration?.toHuman(),
      claimed: s.claimed?.toISO(),
      claimed_by: s.claimedBy?.username,
    }));

    res.render("shares", {
      title: "Shares",
      sharesWithMe,
      sharesByMe,
    });
  }
);

router.get(
  "/new",
  requiresAuth(),
  requiresAdmin(),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.render("new_share", {
      title: "New share",
      expirations: buildExpirations,
    });
  }
);

router.post(
  "/new",
  requiresAuth(),
  requiresAdmin(),
  urlencoded({ extended: false }),
  async (
    req: AuthenticatedRequestWithTypedBody<{
      action: "validate" | "create";
      backingUrl: string;
      toUsername?: string;
      expires?: string;
    }>,
    res: Response
  ) => {
    const user = assertValue(req.user);
    const { action, backingUrl, toUsername, expires } = req.body;

    const expireDuration: Duration | undefined = expires
      ? Duration.fromISO(expires)
      : undefined;

    if (action === "validate" || action === "create") {
      let share: Share;
      try {
        share = await newShare(user, backingUrl, toUsername, expireDuration);
      } catch (err: any) {
        if (err.type === "validation") {
          return res.render("new_share", {
            title: "New share",
            expirations: buildExpirations(expireDuration),
            [`${err.field}_error`]: err.fieldMessage,
            backingUrl,
            backingUrl_valid: err.field !== "backingUrl",
            toUsername,
            expires,
          });
        }

        throw err;
      }

      if (action === "validate") {
        return res.render("new_share", {
          title: "New share",
          expirations: buildExpirations(share.expireDuration),
          backingUrl: share.backingUrl,
          backingUrl_valid: true,
          toUsername: share.toUsername,
          expires: share.expireDuration?.toISO(),
          documentTitle: share.documentTitle,
          documentType: share.documentType,
          documentTypeStyle: getDocumentTypeStyle(share.documentType),
          can_create: true,
        });
      }

      // create
      await createShare(share);

      return res.redirect("/shares");
    }

    throw BadRequestError("Unsupported new share action");
  }
);

router.get("/:share_id", async (req: AuthenticatedRequest, res: Response) => {
  const { share, isClaimed } = await ensureShare(req);
  const { user } = req;

  if (user) {
    if (isClaimed) {
      // render share
      return renderShare(res, share);
    }

    if (getRegisterable(req)) {
      // claim share by newly registered user
      clearRegisterable(req);
      const claimedShare = await claimShare(share.id, user);
      logger.info(claimedShare, `New user has claimed share.`);

      // render share
      return renderShare(res, claimedShare);
    }
  } else {
    // redirect to login (to come back) if share was intended for a specific user
    if (share.toUsername) {
      return redirectToLogin(req, res);
    }
  }

  // display accept form
  return res.render("accept_share", {
    title: "Accept a shared file?",
    share,
    documentTypeStyle: getDocumentTypeStyle(share.documentType),
  });
});

router.post(
  "/:share_id",
  urlencoded({ extended: false }),
  async (
    req: AuthenticatedRequestWithTypedBody<{ action: "accept" | "reject" }>,
    res: Response
  ) => {
    const { share, isClaimed } = await ensureShare(req);
    const { action } = req.body;
    const { user } = req;

    if (isClaimed) {
      throw ForbiddenError(
        "This endpoint does not support an already claimed share"
      );
    }

    if (action === "accept") {
      if (user) {
        // claim share by existing user
        clearRegisterable(req);
        const claimedShare = await claimShare(share.id, user);
        logger.info(claimedShare, `Existing user has claimed share.`);

        // redirect to GET endpoint to render share
        return res.redirect(req.originalUrl);
      }

      // authorize registration with share and redirect to register page (to come back)
      authorizeRegistration(req, share);
      return redirectToRegister(req, res);
    }

    throw BadRequestError("Unsupported share response operation");
  }
);

export default router;
