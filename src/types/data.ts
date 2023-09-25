import {
  Authenticator,
  FileInfo,
  Invite,
  RegisteredAuthenticator,
  Share,
  User,
} from "./entity";

export interface IDataProvider {
  // users

  getUserCount(): Promise<number>;

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

  // invites

  findInviteById(inviteId: string): Promise<Invite | undefined>;

  insertInvite(invite: Invite): Promise<Invite>;

  updateInvite(invite: Invite): Promise<void>;

  // shares

  findShareById(shareId: string): Promise<Share | undefined>;

  findSharesByClaimedUserId(userID: string): Promise<Share[]>;

  findSharesByCreatedUserId(userID: string): Promise<Share[]>;

  findFileInfo(url: string): Promise<FileInfo | undefined>;

  insertShare(share: Share): Promise<Share>;

  updateShare(share: Share): Promise<void>;
}
