import { Attachment } from "fido2-lib";
import { IdentifiedUser, RegisteringUser } from "./user";

export interface RegisteringSession {
  user: RegisteringUser;
  attachment: Attachment;
  challenge: string;
}

export interface AuthenticatingSession {
  user: IdentifiedUser;
  challenge: string;
}

export interface AuthenticatedSession {
  user: IdentifiedUser;
  time: number;
}
