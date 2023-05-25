import {
  AuthenticatorAttachment,
  AuthenticatorTransport,
} from "../schema/fido2-server";

export interface User {
  id: string;
  username: string;
  displayName: string;
}

export interface Authenticator {
  credentialID: string;
  created: Date;
  publicKey: string;
  counter: number;
  deviceType: AuthenticatorAttachment;
  backedUp: boolean;
  transports?: AuthenticatorTransport[];
}

export interface RegisteredAuthenticator extends Authenticator {
  userID: string;
}
