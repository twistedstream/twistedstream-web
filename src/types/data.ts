import { User, Authenticator, RegisteredAuthenticator } from "../types/user";

export interface IDataProvider {
  findUserById(userID: string): Promise<User | undefined>;

  findUserByName(username: string): Promise<User | undefined>;

  findCredentialById(
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined>;

  findUserCredential(
    userID: string,
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined>;

  getCredentials(userID: string): Promise<RegisteredAuthenticator[]>;

  addUser(user: User): Promise<User>;

  patchUser(user: User): Promise<void>;

  addCredential(userID: string, credential: Authenticator): Promise<void>;

  removeCredential(credentialID: string): Promise<void>;
}
