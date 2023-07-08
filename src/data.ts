import { User, Authenticator, RegisteredAuthenticator } from "./types/user";
import { logger } from "./utils/logger";

// FUTURE: externalize to DB
const _users: User[] = [];
const _credentials: RegisteredAuthenticator[] = [];

export async function findUserById(userID: string): Promise<User | undefined> {
  const user = _users.find((u) => u.id === userID);
  if (user) {
    return { ...user };
  }
}

export async function findUserByName(
  username: string
): Promise<User | undefined> {
  const user = _users.find((u) => u.username === username);
  if (user) {
    return { ...user };
  }
}

export async function findCredentialById(
  credentialID: string
): Promise<RegisteredAuthenticator | undefined> {
  const credential = _credentials.find((p) => p.credentialID === credentialID);
  if (credential) {
    return { ...credential };
  }
}

export async function findUserCredential(
  userID: string,
  credentialID: string
): Promise<RegisteredAuthenticator | undefined> {
  const credential = _credentials.find(
    (p) => p.userID === userID && p.credentialID === credentialID
  );
  if (credential) {
    return { ...credential };
  }
}

export async function getCredentials(
  userID: string
): Promise<RegisteredAuthenticator[]> {
  const credentials = _credentials.filter((p) => p.userID === userID);
  return [...credentials];
}

export async function addUser(user: User): Promise<User> {
  _users.push({ ...user });
  logger.debug(_users, "Users after add");

  return { ...user };
}

export async function patchUser(user: User): Promise<void> {
  const foundUser = _users.find((u) => u.id === user.id);
  if (foundUser) {
    foundUser.username = user.username;
    foundUser.displayName = user.displayName;
  }
}

export async function addCredential(userID: string, credential: Authenticator) {
  const registeredCredential: RegisteredAuthenticator = {
    ...credential,
    userID,
  };
  _credentials.push(registeredCredential);
  logger.debug(_credentials, "Credentials after add");
}

export async function removeCredential(userID: string, credentialID: string) {
  const indexToDelete = _credentials.findIndex(
    (c) => c.credentialID === credentialID
  );
  _credentials.splice(indexToDelete, 1);
  logger.debug(_credentials, "Credentials after remove");
}
