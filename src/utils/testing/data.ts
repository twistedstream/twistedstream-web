import base64 from "@hexagon/base64";
import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import crypto from "crypto";
import { Authenticator, User } from "../../types/entity";

// reusable test objects

export const testNowDate: Date = new Date(2023, 1, 1);

export const testUserIdentifier: string = "123abc";

export const testUser1: User = {
  id: testUserIdentifier,
  created: testNowDate,
  username: "bob",
  displayName: "Bob User",
  isAdmin: false,
};

export const testCredential1: Authenticator = {
  created: new Date(2023, 1, 1),
  credentialID: base64.fromArrayBuffer(crypto.randomBytes(8).buffer, true),
  credentialPublicKey: base64.fromArrayBuffer(
    crypto.randomBytes(42).buffer,
    true
  ),
  counter: 24,
  aaguid: "AUTH_GUID_1",
  credentialDeviceType: <CredentialDeviceType>"multiDevice",
  credentialBackedUp: true,
  transports: <AuthenticatorTransport[]>["internal"],
};

export const testCredential2: Authenticator = {
  created: new Date(2023, 1, 1),
  credentialID: base64.fromArrayBuffer(crypto.randomBytes(8).buffer, true),
  credentialPublicKey: base64.fromArrayBuffer(
    crypto.randomBytes(42).buffer,
    true
  ),
  counter: 42,
  aaguid: "AUTH_GUID_2",
  credentialDeviceType: <CredentialDeviceType>"singleDevice",
  credentialBackedUp: false,
  transports: <AuthenticatorTransport[]>["usb", "nfc"],
};
