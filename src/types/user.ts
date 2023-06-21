import {
  CredentialDeviceType,
  AuthenticatorTransport,
} from "@simplewebauthn/typescript-types";

export interface User {
  id: string;
  username: string;
  displayName: string;
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
