import { Request } from "express";
import { UserInfo } from "./user";
import { ValidatedCredential } from "./credential";

export interface AuthenticatedRequest extends Request {
  user?: UserInfo;
  credential?: ValidatedCredential;
}

export interface AuthenticatedRequestWithTypedBody<T>
  extends AuthenticatedRequest {
  body: T;
}
