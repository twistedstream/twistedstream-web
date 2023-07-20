import { Authenticator, RegisteredAuthenticator, User } from "./entity";

export interface IDataProvider {
  // users

  findUserById(userID: string): Promise<User | undefined>;

  findUserByName(username: string): Promise<User | undefined>;

  insertUser(user: User): Promise<User>;

  updateUser(user: User): Promise<void>;

  // credentials

  findCredentialById(
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined>;

  findUserCredential(
    userID: string,
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined>;

  findCredentialsByUser(userID: string): Promise<RegisteredAuthenticator[]>;

  insertCredential(userID: string, credential: Authenticator): Promise<void>;

  deleteCredential(credentialID: string): Promise<void>;
}
