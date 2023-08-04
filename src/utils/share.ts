import { DateTime } from "luxon";

import { Response } from "express";
import { fetchShareById } from "../services/share";
import { Share } from "../types/entity";
import { AuthenticatedRequest } from "../types/express";
import { BadRequestError, ForbiddenError, NotFoundError } from "./error";
import { logger } from "./logger";

type EnsureShareResult = { share: Share; isClaimed: boolean };

export async function ensureShare(
  req: AuthenticatedRequest
): Promise<EnsureShareResult> {
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

  const { user } = req;
  const shareHasExpired =
    !!share.expireDuration &&
    DateTime.now() > share.created.plus(share.expireDuration);

  // check if current user has already claimed the share
  if (user && share.claimedBy?.id === user.id) {
    if (shareHasExpired) {
      logger.warn(share, "Share claimed by current user has expired");

      throw ForbiddenError("This share is expired");
    }

    return { share, isClaimed: true };
  }

  // share already claimed by a different user
  if (share.claimed) {
    logger.warn(share, `Share was already claimed by a different user`);

    if (share.createdBy.id === user?.id) {
      throw ForbiddenError(
        `This share was already claimed by @${share.claimedBy?.username}`
      );
    }

    throw NotFoundError();
  }

  // share intended for a different user
  if (user && share.toUsername && share.toUsername !== user.username) {
    logger.warn(share, "Share was intended for a different user");

    if (share.createdBy.id === user.id) {
      throw ForbiddenError(
        `This share was intended for user @${share.toUsername}`
      );
    }

    throw NotFoundError();
  }

  // check if unclaimed share has already expired
  if (shareHasExpired) {
    logger.warn(share, "Unclaimed share has expired");

    if (share.createdBy.id === user?.id) {
      throw ForbiddenError(`This share has expired`);
    }

    throw NotFoundError();
  }

  // share can still be claimed
  return { share, isClaimed: false };
}

export function renderShare(res: Response, share: Share) {
  // FUTURE: render by document type
  res.json(share);
}
