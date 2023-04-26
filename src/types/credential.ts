import { Attachment } from "fido2-lib";

export interface IdentifiedCredential {
  id: string;
}

export interface PresentedCredential extends IdentifiedCredential {
  rawId: string;
  response: any;
}

export interface ValidatedCredential extends IdentifiedCredential {
  counter: number;
  publicKey: string;
  userHandle: string;
  created: Date;
  attachment: Attachment;
}
