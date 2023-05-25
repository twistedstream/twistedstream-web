import { Static, Type, TSchema } from "@sinclair/typebox";

const USER_NAME_PATTERN = /^[a-zA-Z0-9_\-]{3,100}$/;
const USER_DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9\- ]{1,200}$/;

/**
 * Source: https://fidoalliance.org/specs/fido-v2.0-rd-20180702/fido-server-v2.0-rd-20180702.html
 */

// general supporting types

const AuthenticatorAttachment = Type.Union([
  Type.Literal("platform"),
  Type.Literal("cross-platform"),
]);
export type AuthenticatorAttachment = Static<typeof AuthenticatorAttachment>;

const ResidentKeyRequirement = Type.Union([
  Type.Literal("discouraged"),
  Type.Literal("preferred"),
  Type.Literal("required"),
]);

const AttestationConveyancePreference = Type.Union([
  Type.Literal("none"),
  Type.Literal("indirect"),
  Type.Literal("direct"),
  Type.Literal("enterprise"),
]);
export type AttestationConveyancePreference = Static<
  typeof AttestationConveyancePreference
>;

const UserVerificationRequirement = Type.Union([
  Type.Literal("required"),
  Type.Literal("preferred"),
  Type.Literal("discouraged"),
]);
export type UserVerificationRequirement = Static<
  typeof UserVerificationRequirement
>;

enum COSEAlgorithmIdentifierEnum {
  ES256 = -7,
  ES384 = -35,
  ES512 = -36,
  EdDSA = -8,
}
const COSEAlgorithmIdentifier = Type.Enum(COSEAlgorithmIdentifierEnum);

const PublicKeyCredentialType = Type.Literal("public-key");

const AuthenticatorTransport = Type.Union([
  Type.Literal("usb"),
  Type.Literal("nfc"),
  Type.Literal("ble"),
  Type.Literal("smart-card"),
  Type.Literal("hybrid"),
  Type.Literal("internal"),
]);
export type AuthenticatorTransport = Static<typeof AuthenticatorTransport>;

const AuthenticatorSelectionCriteria = Type.Object({
  authenticatorAttachment: Type.Optional(AuthenticatorAttachment),
  // TODO: default: false
  requireResidentKey: Type.Boolean(),
  // TODO: default: "required" if requireResidentKey=true; otherwise "discouraged"
  residentKey: ResidentKeyRequirement,
  // TODO: default: "preferred"
  userVerification: UserVerificationRequirement,
});
export type AuthenticatorSelectionCriteria = Static<
  typeof AuthenticatorSelectionCriteria
>;

const PublicKeyCredentialEntity = Type.Object({
  name: Type.String(),
});

const PublicKeyCredentialRpEntity = Type.Intersect([
  PublicKeyCredentialEntity,
  Type.Object({ id: Type.String() }),
]);

const ServerPublicKeyCredentialUserEntity = Type.Intersect([
  PublicKeyCredentialEntity,
  Type.Object({
    id: Type.String(),
    displayName: Type.String(),
  }),
]);

const PublicKeyCredentialParameters = Type.Object({
  type: Type.String(),
  alg: COSEAlgorithmIdentifier,
});

const AuthenticationExtensionsClientInputs = Type.Object({});

const ServerAuthenticatorResponse = Type.Object({
  clientDataJSON: Type.String(),
});

const Credential = Type.Object({
  id: Type.Readonly(Type.String()),
  type: PublicKeyCredentialType,
});

const AuthenticationExtensionsClientOutputs = Type.Object({});

const Status = Type.Union([Type.Literal("ok"), Type.Literal("failed")]);

// common types

export const ServerResponse = Type.Object({
  status: Status,
  // TODO: default: "" (empty string)
  errorMessage: Type.String(),
});
export type ServerResponse = Static<typeof ServerResponse>;

// registration supporting types

const ServerPublicKeyCredential = <T extends TSchema>(t: T) =>
  Type.Intersect([
    Credential,
    Type.Object({
      rawId: Type.String(),
      response: t,
      getClientExtensionResults: Type.Optional(
        AuthenticationExtensionsClientOutputs
      ),
    }),
  ]);

const ServerPublicKeyCredentialDescriptor = Type.Object({
  type: PublicKeyCredentialType,
  id: Type.String(),
  transports: Type.Optional(Type.Array(AuthenticatorTransport)),
});
export type ServerPublicKeyCredentialDescriptor = Static<
  typeof ServerPublicKeyCredentialDescriptor
>;

// registration primary types

export const ServerPublicKeyCredentialCreationOptionsRequest = Type.Object({
  username: Type.RegEx(USER_NAME_PATTERN),
  displayName: Type.RegEx(USER_DISPLAY_NAME_PATTERN),
  authenticatorSelection: AuthenticatorSelectionCriteria,
  // TODO: default: "none"
  attestation: AttestationConveyancePreference,
});
export type ServerPublicKeyCredentialCreationOptionsRequest = Static<
  typeof ServerPublicKeyCredentialCreationOptionsRequest
>;

const ServerPublicKeyCredentialCreationOptionsResponse = Type.Intersect([
  ServerResponse,
  Type.Object({
    rp: PublicKeyCredentialRpEntity,
    user: ServerPublicKeyCredentialUserEntity,
    challenge: Type.String(),
    pubKeyCredParams: Type.Array(PublicKeyCredentialParameters),
    timeout: Type.Optional(Type.Integer()),
    // TODO: default: []
    excludeCredentials: Type.Array(ServerPublicKeyCredentialDescriptor),
    authenticatorSelection: Type.Optional(AuthenticatorSelectionCriteria),
    // TODO: default: "none"
    attestation: AttestationConveyancePreference,
    extensions: Type.Optional(AuthenticationExtensionsClientInputs),
  }),
]);
export type ServerPublicKeyCredentialCreationOptionsResponse = Static<
  typeof ServerPublicKeyCredentialCreationOptionsResponse
>;

const ServerAuthenticatorAttestationResponse = Type.Intersect([
  ServerAuthenticatorResponse,
  Type.Object({
    attestationObject: Type.String(),
  }),
]);
export type ServerAuthenticatorAttestationResponse = Static<
  typeof ServerAuthenticatorAttestationResponse
>;

export const ServerAttestationPublicKeyCredential = ServerPublicKeyCredential(
  ServerAuthenticatorAttestationResponse
);
export type ServerAttestationPublicKeyCredential = Static<
  typeof ServerAttestationPublicKeyCredential
>;

// authentication types

export const ServerPublicKeyCredentialGetOptionsRequest = Type.Object({
  username: Type.String(),
  userVerification: Type.Optional(UserVerificationRequirement),
});
export type ServerPublicKeyCredentialGetOptionsRequest = Static<
  typeof ServerPublicKeyCredentialGetOptionsRequest
>;

const ServerPublicKeyCredentialGetOptionsResponse = Type.Intersect([
  ServerResponse,
  Type.Object({
    challenge: Type.String(),
    timeout: Type.Optional(Type.Integer()),
    rpId: Type.Optional(Type.String()),
    // TODO: default: []
    allowCredentials: Type.Array(ServerPublicKeyCredentialDescriptor),
    // TODO: default: "preferred"
    userVerification: UserVerificationRequirement,
    extensions: Type.Optional(AuthenticationExtensionsClientInputs),
  }),
]);
export type ServerPublicKeyCredentialGetOptionsResponse = Static<
  typeof ServerPublicKeyCredentialGetOptionsResponse
>;

const ServerAuthenticatorAssertionResponse = Type.Intersect([
  ServerAuthenticatorResponse,
  Type.Object({
    authenticatorData: Type.String(),
    signature: Type.String(),
    userHandle: Type.String(),
  }),
]);

export const ServerAssertionPublicKeyCredential = ServerPublicKeyCredential(
  ServerAuthenticatorAssertionResponse
);
export type ServerAssertionPublicKeyCredential = Static<
  typeof ServerAssertionPublicKeyCredential
>;
