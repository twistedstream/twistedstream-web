import { getProvider } from "../data";
import { Invite, User } from "../types/entity";
import { assertValue } from "../utils/error";
import { unique } from "../utils/identifier";
import { now } from "../utils/time";

const provider = getProvider();
const { getUserCount, insertUser, insertInvite, findInviteById, updateInvite } =
  provider;

// service

export async function createRootUserAndInvite(): Promise<Invite | undefined> {
  // only if no users yet
  const count = await getUserCount();
  if (count === 0) {
    // create root admin
    const rootAdmin = await insertUser({
      id: unique(),
      created: now(),
      username: "root",
      displayName: "Root Admin",
      isAdmin: true,
    });

    // create first invite
    const firstInvite = newInvite(rootAdmin, true);
    return insertInvite(firstInvite);
  }
}

export function newInvite(by: User, isAdmin: boolean): Invite {
  const invite: Invite = {
    id: unique(),
    sourceType: "invite",
    isAdmin,
    created: now(),
    createdBy: by,
  };

  return invite;
}

export async function fetchInviteById(
  inviteId: string
): Promise<Invite | undefined> {
  return findInviteById(inviteId);
}

export async function claimInvite(inviteId: string, by: User): Promise<Invite> {
  const existingInvite = await findInviteById(inviteId);
  if (!existingInvite) {
    throw new Error(`Invite with ID ${inviteId} does not exist`);
  }
  if (existingInvite.claimed) {
    throw new Error(`Invite with ID ${inviteId} has already been claimed`);
  }

  existingInvite.claimed = now();
  existingInvite.claimedBy = by;
  await updateInvite(existingInvite);

  return assertValue(await findInviteById(existingInvite.id));
}
