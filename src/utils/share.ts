import { Response } from "express";
import { Duration } from "luxon";

import { fetchShareById } from "../services/share";
import { DocumentType, Share } from "../types/entity";
import { AuthenticatedRequest } from "../types/express";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  assertValue,
} from "./error";
import { logger } from "./logger";
import { now } from "./time";

type EnsureShareResult = { share: Share; isClaimed: boolean };

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

export function buildExpirations(current?: Duration) {
  return EXPIRATIONS.map((k) => ({
    value: k,
    description: Duration.fromISO(k).toHuman(),
    selected: k === current?.toISO(),
  }));
}

export function getDocumentTypeStyle(documentType: DocumentType) {
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
    !!share.expireDuration && now() > share.created.plus(share.expireDuration);

  // check if current user has already claimed the share
  if (user && share.claimedBy?.id === user.id) {
    if (shareHasExpired) {
      logger.warn(share, "Share claimed by current user has expired");

      throw ForbiddenError("This share has expired");
    }

    return { share, isClaimed: true };
  }

  // share already claimed by a different user
  if (share.claimed) {
    logger.warn(share, `Share was already claimed by a different user`);

    if (share.createdBy.id === user?.id) {
      const claimedBy = assertValue(share.claimedBy);

      throw ForbiddenError(
        `This share was already claimed by @${claimedBy.username}`
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
      throw ForbiddenError(`This unclaimed share has expired`);
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
