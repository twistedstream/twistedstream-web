import { IDataProvider } from "../types/data";
import { Authenticator, RegisteredAuthenticator, User } from "../types/user";
import { logger } from "../utils/logger";

export class InMemoryDataProvider implements IDataProvider {
  _users: User[];
  _credentials: RegisteredAuthenticator[];

  constructor(users: User[], credentials: RegisteredAuthenticator[]) {
    this._users = users;
    this._credentials = credentials;

    // bind method "this"'s to instance "this"
    this.findUserById = this.findUserById.bind(this);
    this.findUserByName = this.findUserByName.bind(this);
    this.findCredentialById = this.findCredentialById.bind(this);
    this.findUserCredential = this.findUserCredential.bind(this);
    this.getCredentials = this.getCredentials.bind(this);
    this.addUser = this.addUser.bind(this);
    this.patchUser = this.patchUser.bind(this);
    this.addCredential = this.addCredential.bind(this);
    this.removeCredential = this.removeCredential.bind(this);
  }

  async findUserById(userID: string): Promise<User | undefined> {
    const user = this._users.find((u) => u.id === userID);
    if (user) {
      return { ...user };
    }
  }

  async findUserByName(username: string): Promise<User | undefined> {
    const user = this._users.find((u) => u.username === username);

    if (user) {
      return { ...user };
    }
  }

  async findCredentialById(
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined> {
    const credential = this._credentials.find(
      (p) => p.credentialID === credentialID
    );
    if (credential) {
      return { ...credential };
    }
  }

  async findUserCredential(
    userID: string,
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined> {
    const credential = this._credentials.find(
      (p) => p.userID === userID && p.credentialID === credentialID
    );
    if (credential) {
      return { ...credential };
    }
  }

  async getCredentials(userID: string): Promise<RegisteredAuthenticator[]> {
    const credentials = this._credentials.filter((p) => p.userID === userID);
    return [...credentials];
  }

  async addUser(user: User): Promise<User> {
    this._users.push({ ...user });
    logger.debug(this._users, "Users after add");

    return { ...user };
  }

  async patchUser(user: User): Promise<void> {
    const foundUser = this._users.find((u) => u.id === user.id);
    if (foundUser) {
      foundUser.username = user.username;
      foundUser.displayName = user.displayName;
    }
  }

  async addCredential(
    userID: string,
    credential: Authenticator
  ): Promise<void> {
    const registeredCredential: RegisteredAuthenticator = {
      ...credential,
      userID,
    };
    this._credentials.push(registeredCredential);
    logger.debug(this._credentials, "Credentials after add");
  }

  async removeCredential(credentialID: string): Promise<void> {
    const indexToDelete = this._credentials.findIndex(
      (c) => c.credentialID === credentialID
    );
    this._credentials.splice(indexToDelete, 1);
    logger.debug(this._credentials, "Credentials after remove");
  }
}
