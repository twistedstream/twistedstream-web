import { Request } from "express";
import { User } from "./user";
import { ValidatedCredential } from "./credential";

export interface AuthenticatedRequest extends Request {
  user?: User;
  credential?: ValidatedCredential;
}

export interface AuthenticatedRequestWithTypedBody<T>
  extends AuthenticatedRequest {
  body: T;
}
