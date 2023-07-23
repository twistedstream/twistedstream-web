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
  user: User;
}

export type ShareType = "pdf";

export interface Share {
  id: string;
  created: Date;
  fromUser: User;
  toUsername?: string;
  claimedUser?: User;
  claimed?: Date;
  backingUrl: string;
  title: string;
  type: ShareType;
}
