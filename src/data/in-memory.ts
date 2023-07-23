import { IDataProvider } from "../types/data";
import {
  Authenticator,
  RegisteredAuthenticator,
  Share,
  User,
} from "../types/entity";
import { assertValue } from "../utils/error";
import { logger } from "../utils/logger";

export class InMemoryDataProvider implements IDataProvider {
  private _users: User[];
  private _credentials: RegisteredAuthenticator[];
  private _shares: Share[];

  constructor(
    users: User[],
    credentials: RegisteredAuthenticator[],
    shares: Share[]
  ) {
    this._users = users;
    this._credentials = credentials;
    this._shares = shares;

    // bind method "this"'s to instance "this"
    this.findUserById = this.findUserById.bind(this);
    this.findUserByName = this.findUserByName.bind(this);
    this.insertUser = this.insertUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.findCredentialById = this.findCredentialById.bind(this);
    this.findUserCredential = this.findUserCredential.bind(this);
    this.findCredentialsByUser = this.findCredentialsByUser.bind(this);
    this.insertCredential = this.insertCredential.bind(this);
    this.deleteCredential = this.deleteCredential.bind(this);
    this.findSharesByClaimedUserId = this.findSharesByClaimedUserId.bind(this);
  }

  // users

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

  async insertUser(user: User): Promise<User> {
    this._users.push({ ...user });
    logger.debug(this._users, "Users after add");

    return { ...user };
  }

  async updateUser(user: User): Promise<void> {
    const foundUser = this._users.find((u) => u.id === user.id);
    if (foundUser) {
      foundUser.username = user.username;
      foundUser.displayName = user.displayName;
    }
  }

  // credentials

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
      (p) => p.user.id === userID && p.credentialID === credentialID
    );
    if (credential) {
      return { ...credential };
    }
  }

  async findCredentialsByUser(
    userID: string
  ): Promise<RegisteredAuthenticator[]> {
    const credentials = this._credentials.filter((p) => p.user.id === userID);
    return [...credentials];
  }

  async insertCredential(
    userID: string,
    credential: Authenticator
  ): Promise<void> {
    const user = assertValue(await this.findUserById(userID));
    const registeredCredential: RegisteredAuthenticator = {
      ...credential,
      user,
    };
    this._credentials.push(registeredCredential);
    logger.debug(this._credentials, "Credentials after add");
  }

  async deleteCredential(credentialID: string): Promise<void> {
    const indexToDelete = this._credentials.findIndex(
      (c) => c.credentialID === credentialID
    );
    this._credentials.splice(indexToDelete, 1);
    logger.debug(this._credentials, "Credentials after remove");
  }

  // shares

  async findSharesByClaimedUserId(userID: string): Promise<Share[]> {
    const shares = this._shares.filter((s) => s.claimedUser?.id === userID);
    return [...shares];
  }
}
