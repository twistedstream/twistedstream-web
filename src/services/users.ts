import { ValidatedCredential } from "../types/credential";
import { FullUser, UserInfo } from "../types/user";
import { logger } from "../utils/logger";

const _users: FullUser[] = [];

// helpers

async function findUserById(userId: string): Promise<FullUser | undefined> {
  return _users.find((u) => u.id === userId);
}

async function findUserByName(name: string): Promise<FullUser | undefined> {
  return _users.find((u) => u.name === name);
}

async function findUserByCredentialId(
  credentialId: string
): Promise<FullUser | undefined> {
  return _users.find((u) => u.credentials.some((c) => c.id === credentialId));
}

async function ensureUser(userId: string): Promise<FullUser> {
  const foundUser = await findUserById(userId);
  if (!foundUser) {
    throw new Error(`User with ID ${userId} does not exist.`);
  }

  return foundUser;
}

// service

export async function fetchUserById(id: string): Promise<FullUser | null> {
  const foundUser = await findUserById(id);
  if (foundUser) {
    // return clone of user
    return { ...foundUser };
  }
  return null;
}

export async function fetchUserByName(name: string): Promise<FullUser | null> {
  const foundUser = await findUserByName(name);
  if (foundUser) {
    // return clone of user
    return { ...foundUser };
  }
  return null;
}

export async function fetchUserByCredentialId(
  id: string
): Promise<FullUser | null> {
  const foundUser = await findUserByCredentialId(id);
  if (foundUser) {
    // return clone of user
    return { ...foundUser };
  }
  return null;
}

export async function createUser(
  registeringUser: UserInfo,
  firstCredential: ValidatedCredential
): Promise<FullUser> {
  const newUser: FullUser = {
    // clone user data
    ...registeringUser,

    credentials: [{ ...firstCredential }],
  };

  _users.push(newUser);
  logger.debug(_users, "createUser: users after add");

  return { ...newUser };
}

export async function addUserCredential(
  existingUserId: string,
  newCredential: ValidatedCredential
): Promise<FullUser> {
  const foundUser = await ensureUser(existingUserId);

  // add credential
  foundUser.credentials = [...foundUser.credentials, newCredential];

  // return clone of user
  return { ...foundUser };
}

export async function removeUserCredential(
  existingUserId: string,
  existingCredentialId: string
): Promise<FullUser> {
  const foundUser = await ensureUser(existingUserId);

  // remove credential (filter method)
  foundUser.credentials = foundUser.credentials.filter(
    (c) => c.id !== existingCredentialId
  );

  // return clone of user
  return { ...foundUser };
}

export async function updateUser(user: UserInfo): Promise<FullUser> {
  const foundUser = await ensureUser(user.id);

  // update profile fields
  foundUser.displayName = user.displayName;

  // return clone of user
  return { ...foundUser };
}
