import { User } from "./user";
import {
  AuthenticatorSelectionCriteria,
  AttestationConveyancePreference,
  UserVerificationRequirement,
} from "../schema/fido2-server";
import { Authenticator } from "./user";

export interface RegisteringSession {
  registeringUser: User;
  authenticatorSelection: AuthenticatorSelectionCriteria;
  attestation: AttestationConveyancePreference;
  challenge: string;
}

export interface AuthenticatingSession {
  authenticatingUser?: User;
  userVerification?: UserVerificationRequirement;
  challenge: string;
}

export interface AuthenticatedSession {
  user: User;
  credential: Authenticator;
  time: number;
}
