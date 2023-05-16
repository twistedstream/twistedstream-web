import { Fido2Lib, Fido2LibOptions } from "fido2-lib";
import { hostname, origin, companyName } from "../utils/config";
import {
  AttestationConveyancePreference,
  AuthenticatorAttachment,
  UserVerificationRequirement,
} from "../schema/fido2-server";

const coreOptions = {
  timeout: 60000,
  rpId: hostname,
  rpName: companyName,
  rpIcon: `${origin}/images/logo.png`,
  challengeSize: 128,
  cryptoParams: [-7, -257],
};

export function createServer(
  userVerification: UserVerificationRequirement = "discouraged",
  attestation: AttestationConveyancePreference = "direct",
  authenticatorAttachment: AuthenticatorAttachment = "platform",
  requireResidentKey: boolean = false
): Fido2Lib {
  const options: Fido2LibOptions = {
    ...coreOptions,
    attestation: attestation === "enterprise" ? "direct" : attestation,
    authenticatorUserVerification: userVerification,
    authenticatorAttachment,
    authenticatorRequireResidentKey: requireResidentKey,
  };

  return new Fido2Lib(options);
}
