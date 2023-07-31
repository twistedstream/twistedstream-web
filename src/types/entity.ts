import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import { DateTime } from "luxon";

export interface User {
  id: string;
  created: DateTime;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export interface Authenticator {
  created: DateTime;
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

export interface RegisterableSource {
  id: string;
  sourceType: string;
  isAdmin: boolean;
  created: DateTime;
  createdBy: User;
}

export interface Invite extends RegisterableSource {
  claimedBy?: User;
  claimed?: DateTime;
}

export interface Share extends RegisterableSource {
  toUsername?: string;
  claimedBy?: User;
  claimed?: DateTime;
  backingUrl: string;
  title: string;
  type: ShareType;
}
