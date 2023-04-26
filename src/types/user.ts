import { ValidatedCredential } from "./credential";

export interface NamedUser {
  name: string;
}

export interface IdentifiedUser extends NamedUser {
  id: string;
}

export interface RegisteringUser extends IdentifiedUser {
  displayName: string;
}

export interface FullUser extends RegisteringUser {
  credentials: ValidatedCredential[];
}
