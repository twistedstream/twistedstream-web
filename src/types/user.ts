import { ValidatedCredential } from "./credential";

export interface UserInfo {
  id: string;
  name: string;
  displayName: string;
}

export interface FullUser extends UserInfo {
  credentials: ValidatedCredential[];
}
