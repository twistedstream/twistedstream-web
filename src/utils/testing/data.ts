import base64 from "@hexagon/base64";
import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/typescript-types";
import crypto from "crypto";
import { DateTime } from "luxon";
import {
  Authenticator,
  DocumentInfo,
  Invite,
  Share,
  User,
} from "../../types/entity";

// reusable test objects

export const testNowDate = DateTime.fromObject({
  year: 2023,
  month: 6,
  day: 1,
}).toUTC();

export const testUser1Identifier: string = "123abc";

export function testUser1(): User {
  return {
    id: testUser1Identifier,
    created: DateTime.fromObject({
      year: 2023,
      month: 1,
      day: 1,
    }).toUTC(),
    username: "bob",
    displayName: "Bob User",
    isAdmin: false,
  };
}

export const testUser2Identifier: string = "abc123";

export function testUser2(): User {
  return {
    id: testUser2Identifier,
    created: DateTime.fromObject({
      year: 2023,
      month: 4,
      day: 1,
    }).toUTC(),
    username: "jim",
    displayName: "Jim User",
    isAdmin: true,
  };
}

const testCredential1Identifier = base64.fromArrayBuffer(
  crypto.randomBytes(8).buffer,
  true
);
const testCredential1PublicKey = base64.fromArrayBuffer(
  crypto.randomBytes(42).buffer,
  true
);

export function testCredential1(): Authenticator {
  return {
    created: DateTime.fromObject({
      year: 2023,
      month: 2,
      day: 1,
    }).toUTC(),
    credentialID: testCredential1Identifier,
    credentialPublicKey: testCredential1PublicKey,
    counter: 24,
    aaguid: "AUTH_GUID_1",
    credentialDeviceType: <CredentialDeviceType>"multiDevice",
    credentialBackedUp: true,
    transports: <AuthenticatorTransport[]>["internal"],
  };
}

const testCredential2Identifier = base64.fromArrayBuffer(
  crypto.randomBytes(8).buffer,
  true
);
const testCredential2PublicKey = base64.fromArrayBuffer(
  crypto.randomBytes(42).buffer,
  true
);

export function testCredential2(): Authenticator {
  return {
    created: DateTime.fromObject({
      year: 2023,
      month: 3,
      day: 1,
    }).toUTC(),
    credentialID: testCredential2Identifier,
    credentialPublicKey: testCredential2PublicKey,
    counter: 42,
    aaguid: "AUTH_GUID_2",
    credentialDeviceType: <CredentialDeviceType>"singleDevice",
    credentialBackedUp: false,
    transports: <AuthenticatorTransport[]>["usb", "nfc"],
  };
}

export function testInvite1(createdBy: User): Invite {
  return {
    id: "INVITE_1",
    sourceType: "invite",
    isAdmin: true,
    created: DateTime.fromObject({
      year: 2023,
      month: 1,
      day: 1,
    }).toUTC(),
    createdBy,
  };
}

export function testShare1(createdBy: User, claimedBy?: User): Share {
  const file = testFile1();

  return {
    id: "SHARE_1",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject({
      year: 2023,
      month: 1,
      day: 1,
    }).toUTC(),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject({
        year: 2023,
        month: 1,
        day: 2,
      }).toUTC(),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    documentTitle: file.title,
    documentType: file.type,
  };
}

export function testShare2(createdBy: User, claimedBy?: User): Share {
  const file = testFile2();

  return {
    id: "SHARE_2",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject({
      year: 2023,
      month: 2,
      day: 1,
    }).toUTC(),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject({
        year: 2023,
        month: 2,
        day: 2,
      }).toUTC(),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    documentTitle: file.title,
    documentType: file.type,
  };
}

export function testShare3(createdBy: User, claimedBy?: User): Share {
  const file = testFile3();

  return {
    id: "SHARE_3",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject({
      year: 2023,
      month: 3,
      day: 1,
    }).toUTC(),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject({
        year: 2023,
        month: 3,
        day: 2,
      }).toUTC(),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    documentTitle: file.title,
    documentType: file.type,
  };
}

export function testShare4(createdBy: User, claimedBy?: User): Share {
  const file = testFile3();

  return {
    id: "SHARE_4",
    sourceType: "share",
    isAdmin: false,
    created: DateTime.fromObject({
      year: 2023,
      month: 4,
      day: 1,
    }).toUTC(),
    createdBy,
    ...(claimedBy && {
      claimed: DateTime.fromObject({
        year: 2023,
        month: 4,
        day: 2,
      }).toUTC(),
      claimedBy,
    }),
    backingUrl: `https://example.com/${file.id}`,
    documentTitle: file.title,
    documentType: file.type,
  };
}

export function testFile1(): DocumentInfo {
  return {
    id: "doc1",
    type: "document",
    title: "Example Doc",
  };
}

export function testFile2(): DocumentInfo {
  return {
    id: "sheet1",
    type: "spreadsheet",
    title: "Example Spreadsheet",
  };
}

export function testFile3(): DocumentInfo {
  return {
    id: "pres1",
    type: "presentation",
    title: "Example Presentation",
  };
}

export function testFile4(): DocumentInfo {
  return {
    id: "pdf1",
    type: "pdf",
    title: "Example PDF",
  };
}
