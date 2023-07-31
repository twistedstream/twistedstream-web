import { Request } from "express";
import { DateTime } from "luxon";

import { fetchInviteById } from "../services/invite";
import { Invite } from "../types/entity";
import { maxInviteLifetime } from "./config";
import { BadRequestError, NotFoundError } from "./error";
import { logger } from "./logger";

export async function ensureInvite(req: Request): Promise<Invite> {
  // validate request
  const { invite_id } = req.params;
  if (!invite_id) {
    throw BadRequestError("Missing: invite ID");
  }
  // find invite
  const invite = await fetchInviteById(invite_id);
  if (!invite) {
    throw NotFoundError();
  }
  // make sure it hasn't already been claimed
  if (invite.claimed) {
    logger.warn(
      `Invite (id = ${invite.id}) was accessed after it was already claimed.`
    );

    throw NotFoundError();
  }
  // make sure it hasn't expired
  if (DateTime.now() > invite.created.plus(maxInviteLifetime)) {
    logger.warn(`Invite (id = ${invite.id}) has expired.`);

    throw NotFoundError();
  }

  return invite;
}
