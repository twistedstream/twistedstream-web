import {
  Fido2Lib,
  Fido2LibOptions,
  Attachment,
  Attestation,
  UserVerification,
} from "fido2-lib";
import { hostname, origin, companyName } from "../utils/config";

const coreOptions = {
  timeout: 60000,
  rpId: hostname,
  rpName: companyName,
  rpIcon: `${origin}/images/logo.png`,
  challengeSize: 128,
  cryptoParams: [-7, -257],
  authenticatorRequireResidentKey: true,
  attestation: <Attestation>"direct",
  authenticatorUserVerification: <UserVerification>"required",
};

export function createServer(authnrAttachment: Attachment): Fido2Lib {
  const options: Fido2LibOptions = {
    ...coreOptions,
    authenticatorAttachment: authnrAttachment,
  };

  return new Fido2Lib(options);
}
