import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import { DateTime, Duration } from "luxon";

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

export interface RegisterableSource {
  id: string;
  sourceType: "invite" | "share";
  isAdmin: boolean;
  created: DateTime;
  createdBy: User;
}

export interface Invite extends RegisterableSource {
  claimedBy?: User;
  claimed?: DateTime;
}

export type DocumentType = "document" | "spreadsheet" | "presentation" | "pdf";

export interface Share extends RegisterableSource {
  backingUrl: string;
  documentTitle: string;
  documentType: DocumentType;
  toUsername?: string;
  claimedBy?: User;
  claimed?: DateTime;
  expireDuration?: Duration;
}

export interface DocumentInfo {
  id: string;
  title: string;
  type: DocumentType;
}
