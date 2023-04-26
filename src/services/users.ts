import { ValidatedCredential } from "../types/credential";
import { FullUser, IdentifiedUser, RegisteringUser } from "../types/user";
import { logger } from "../utils/logger";

const _users: FullUser[] = [];

export async function fetchUserById(id: string): Promise<FullUser | null> {
  const foundUser = _users.find((u) => u.id === id);
  if (foundUser) {
    // return clone of user
    return { ...foundUser };
  }
  return null;
}

export async function fetchUserByName(name: string): Promise<FullUser | null> {
  const foundUser = _users.find((u) => u.name === name);
  if (foundUser) {
    // return clone of user
    return { ...foundUser };
  }
  return null;
}

export async function createUser(
  registeringUser: RegisteringUser,
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
  const foundUser = _users.find((u) => u.id === existingUserId);
  if (foundUser) {
    foundUser.credentials = [...foundUser.credentials, newCredential];

    // return clone of user
    return { ...foundUser };
  }

  throw new Error(`User with ID ${existingUserId} does not exist.`);
}
