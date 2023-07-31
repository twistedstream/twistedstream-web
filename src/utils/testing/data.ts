import base64 from "@hexagon/base64";
import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import crypto from "crypto";
import { DateTime } from "luxon";
import { Authenticator, User } from "../../types/entity";

// reusable test objects

export const testNowDate = DateTime.fromObject({
  year: 2023,
  month: 6,
  day: 1,
}).toUTC();

export const testUserIdentifier: string = "123abc";

export const testUser1: User = {
  id: testUserIdentifier,
  created: DateTime.fromObject({
    year: 2023,
    month: 1,
    day: 1,
  }).toUTC(),
  username: "bob",
  displayName: "Bob User",
  isAdmin: false,
};

export const testCredential1: Authenticator = {
  created: DateTime.fromObject({
    year: 2023,
    month: 2,
    day: 1,
  }).toUTC(),
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
  created: DateTime.fromObject({
    year: 2023,
    month: 3,
    day: 1,
  }).toUTC(),
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
