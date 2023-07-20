import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";

export interface User {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export interface Authenticator {
  created: Date;
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
  aaguid: string;
  credentialDeviceType: CredentialDeviceType;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransport[];
}

export interface RegisteredAuthenticator extends Authenticator {
  userID: string;
}

export type ShareType = "pdf";

export interface Share {
  id: string;
  created: Date;
  fromUserId: string;
  toUsername?: string;
  claimedUserId?: string;
  claimed?: Date;
  backingUrl: string;
  type: ShareType;
}
