import { Duration } from "luxon";

import { getProvider } from "../data";
import { Share, User } from "../types/entity";
import { ValidationError } from "../types/error";
import { assertValue } from "../utils/error";
import { unique } from "../utils/identifier";
import { now } from "../utils/time";

const provider = getProvider();
const {
  findDocumentInfo,
  findSharesByClaimedUserId,
  findSharesByCreatedUserId,
  findShareById,
  findUserByName,
  insertShare,
  updateShare,
} = provider;

// service

export async function fetchSharesByClaimedUserId(
  userID: string
): Promise<Share[]> {
  return findSharesByClaimedUserId(userID);
}

export async function fetchSharesByCreatedUserId(
  userID: string
): Promise<Share[]> {
  return findSharesByCreatedUserId(userID);
}

export async function fetchShareById(
  shareId: string
): Promise<Share | undefined> {
  return findShareById(shareId);
}

export async function newShare(
  by: User,
  backingUrl: string,
  toUsername?: string,
  expireDuration?: Duration
): Promise<Share> {
  // get file info and make sure it exists
  const documentInfo = await findDocumentInfo(backingUrl);
  if (!documentInfo) {
    throw new ValidationError("Share", "backingUrl", "File not found");
  }

  // make sure to-user exists
  if (toUsername) {
    if (!(await findUserByName(toUsername))) {
      throw new ValidationError("Share", "toUsername", "User does not exist");
    }
  }

  const share: Share = {
    id: unique(),
    isAdmin: false,
    created: now(),
    createdBy: by,
    sourceType: "share",
    backingUrl,
    toUsername,
    expireDuration,
    fileTitle: documentInfo.title,
    fileType: documentInfo.type,
  };

  return share;
}

export async function createShare(share: Share): Promise<Share> {
  return insertShare(share);
}

export async function claimShare(shareId: string, by: User): Promise<Share> {
  const existingShare = await findShareById(shareId);
  if (!existingShare) {
    throw new Error(`Share with ID '${shareId}' does not exist`);
  }
  if (existingShare.claimed) {
    throw new Error(`Share with ID '${shareId}' has already been claimed`);
  }

  existingShare.claimed = now();
  existingShare.claimedBy = by;
  await updateShare(existingShare);

  return assertValue(await findShareById(existingShare.id));
}
