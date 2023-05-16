import { UserInfo } from "./user";
import {
  AuthenticatorSelectionCriteria,
  AttestationConveyancePreference,
  UserVerificationRequirement,
} from "../schema/fido2-server";
import { ValidatedCredential } from "./credential";

export interface RegisteringSession {
  registeringUser: UserInfo;
  authenticatorSelection: AuthenticatorSelectionCriteria;
  attestation: AttestationConveyancePreference;
  challenge: string;
}

export interface AuthenticatingSession {
  authenticatingUser?: UserInfo;
  userVerification?: UserVerificationRequirement;
  challenge: string;
}

export interface AuthenticatedSession {
  user: UserInfo;
  credential: ValidatedCredential;
  time: number;
}
