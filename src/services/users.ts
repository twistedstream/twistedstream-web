import base64 from "@hexagon/base64";
import crypto from "crypto";

import { User, Authenticator, RegisteredAuthenticator } from "../types/user";
import { logger } from "../utils/logger";
import { ValidationError } from "../types/error";

const USER_NAME_PATTERN = /^[a-zA-Z0-9_\-]{3,100}$/;
const USER_DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9\- ]{2,200}$/;

// data

// FUTURE: externalize to DB
const _users: User[] = [];
const _credentials: RegisteredAuthenticator[] = [];

async function findUserById(userID: string): Promise<User | undefined> {
  return _users.find((u) => u.id === userID);
}

async function findUserByName(username: string): Promise<User | undefined> {
  return _users.find((u) => u.username === username);
}

async function findCredentialById(
  credentialID: string
): Promise<RegisteredAuthenticator | undefined> {
  return _credentials.find((p) => p.credentialID === credentialID);
}

async function findUserCredential(
  userID: string,
  credentialID: string
): Promise<RegisteredAuthenticator | undefined> {
  return _credentials.find(
    (p) => p.userID === userID && p.credentialID === credentialID
  );
}

async function getCredentials(
  userID: string
): Promise<RegisteredAuthenticator[]> {
  return _credentials.filter((p) => p.userID === userID);
}

async function addUser(user: User): Promise<User> {
  _users.push(user);
  logger.debug(_users, "Users after add");

  return user;
}

async function addCredential(userID: string, credential: Authenticator) {
  if (await findUserCredential(userID, credential.credentialID)) {
    throw new Error(
      `Credential with ID ${`credential.credentialID`} already exists`
    );
  }
  if (!(await findUserById(userID))) {
    throw new Error(`User with ID ${userID} not found`);
  }

  const registeredCredential: RegisteredAuthenticator = {
    ...credential,
    userID,
  };
  _credentials.push(registeredCredential);
  logger.debug(_credentials, "Credentials after add");
}

async function removeCredential(userID: string, credentialID: string) {
  if (
    _credentials.filter(
      (c) => c.credentialID === credentialID && c.userID === userID
    ).length === 0
  ) {
    throw new Error(
      `Credential (id = ${credentialID}) not associated with user (id = ${userID})`
    );
  }
  if (_credentials.filter((c) => c.userID === userID).length === 1) {
    throw new Error(
      `Cannot remove the last credential (id = ${credentialID}) associated with user (id = ${userID})`
    );
  }

  const indexToDelete = _credentials.findIndex(
    (c) => c.credentialID === credentialID
  );
  _credentials.splice(indexToDelete, 1);
  logger.debug(_credentials, "Credentials after remove");
}

async function ensureUser(userID: string): Promise<User> {
  const foundUser = await findUserById(userID);
  if (!foundUser) {
    throw new Error(`User with ID ${userID} does not exist.`);
  }

  return foundUser;
}

// helpers

function validateUser(user: User) {
  if (!user.username || !USER_NAME_PATTERN.test(user.username)) {
    throw new ValidationError(
      "User",
      "username",
      `must match pattern: ${USER_NAME_PATTERN}`
    );
  }
  if (!user.displayName || !USER_DISPLAY_NAME_PATTERN.test(user.displayName)) {
    throw new ValidationError(
      "User",
      "displayName",
      `must match pattern: ${USER_DISPLAY_NAME_PATTERN}`
    );
  }
}

// service

export async function fetchUserById(userID: string): Promise<User | undefined> {
  const foundUser = await findUserById(userID);
  if (foundUser) {
    return { ...foundUser };
  }
}

export async function fetchUserByName(
  username: string
): Promise<User | undefined> {
  const foundUser = await findUserByName(username);
  if (foundUser) {
    return { ...foundUser };
  }
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
  const user: User = {
    ...registeringUser,
  };
  validateUser(user);

  const addedUser = await addUser(user);

  const credential: Authenticator = {
    ...firstCredential,
  };
  await addCredential(registeringUser.id, credential);

  return { ...addedUser };
}

export async function updateUser(user: User): Promise<User> {
  // validate
  validateUser(user);

  const foundUser = await ensureUser(user.id);

  // update profile fields
  foundUser.displayName = user.displayName;

  return { ...foundUser };
}

export async function fetchCredentialById(
  credentialID: string
): Promise<RegisteredAuthenticator | undefined> {
  const foundCredential = await findCredentialById(credentialID);

  if (foundCredential) {
    return { ...foundCredential };
  }
}

export async function fetchCredentialsByUserId(
  userID: string
): Promise<RegisteredAuthenticator[]> {
  const credentials = await getCredentials(userID);

  return [...credentials];
}

export async function fetchCredentialsByUsername(
  username: string
): Promise<RegisteredAuthenticator[]> {
  const user = await findUserByName(username);

  if (user) {
    const credentials = await getCredentials(user?.id);
    return [...credentials];
  }
  return [];
}

export async function addUserCredential(
  existingUserId: string,
  newCredential: Authenticator
) {
  await addCredential(existingUserId, newCredential);
}

export async function removeUserCredential(
  existingUserId: string,
  existingCredentialId: string
) {
  await removeCredential(existingUserId, existingCredentialId);
}
