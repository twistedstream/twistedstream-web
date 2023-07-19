import base64 from "@hexagon/base64";
import crypto from "crypto";

import { getProvider } from "../data";
import { Authenticator, RegisteredAuthenticator, User } from "../types/user";
import { validateUser } from "./user-validation";

const data = getProvider();
const {
  addCredential,
  addUser,
  findCredentialById,
  findUserById,
  findUserByName,
  patchUser,
  findUserCredential,
  getCredentials,
  removeCredential,
} = data;

// service

export async function fetchUserById(userID: string): Promise<User | undefined> {
  return findUserById(userID);
}

export async function fetchUserByName(
  username: string
): Promise<User | undefined> {
  return findUserByName(username);
}

export function createUser(username: string, displayName: string) {
  const newUser: User = {
    id: base64.fromArrayBuffer(crypto.randomBytes(16).buffer, true),
    username,
    displayName,
  };
  validateUser(newUser);

  return newUser;
}

export async function registerUser(
  registeringUser: User,
  firstCredential: Authenticator
): Promise<User> {
  validateUser(registeringUser);

  const addedUser = await addUser(registeringUser);
  await addCredential(addedUser.id, firstCredential);

  return addedUser;
}

export async function updateUser(user: User): Promise<void> {
  // validate
  validateUser(user);

  const foundUser = await findUserById(user.id);
  if (!foundUser) {
    throw new Error(`User with ID ${user.id} does not exist.`);
  }

  // update user in DB
  await patchUser(user);
}

export async function fetchCredentialById(
  credentialID: string
): Promise<RegisteredAuthenticator | undefined> {
  return findCredentialById(credentialID);
}

export async function fetchCredentialsByUserId(
  userID: string
): Promise<RegisteredAuthenticator[]> {
  return getCredentials(userID);
}

export async function fetchCredentialsByUsername(
  username: string
): Promise<RegisteredAuthenticator[]> {
  const user = await findUserByName(username);

  if (user) {
    return getCredentials(user.id);
  }
  return [];
}

export async function addUserCredential(
  existingUserId: string,
  newCredential: Authenticator
) {
  if (await findUserCredential(existingUserId, newCredential.credentialID)) {
    throw new Error(
      `Credential with ID ${newCredential.credentialID} already exists.`
    );
  }
  if (!(await findUserById(existingUserId))) {
    throw new Error(`User with ID ${existingUserId} not found.`);
  }

  await addCredential(existingUserId, newCredential);
}

export async function removeUserCredential(
  existingUserId: string,
  existingCredentialId: string
) {
  if (!(await findUserCredential(existingUserId, existingCredentialId))) {
    throw new Error(
      `Credential (id = ${existingCredentialId}) not associated with user (id = ${existingUserId}).`
    );
  }
  if ((await getCredentials(existingUserId)).length === 1) {
    throw new Error(
      `Cannot remove the last credential (id = ${existingCredentialId}) associated with user (id = ${existingUserId}).`
    );
  }

  await removeCredential(existingCredentialId);
}
