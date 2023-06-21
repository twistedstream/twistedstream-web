import { Request } from "express";
import { User } from "./user";
import { Authenticator } from "./user";

export interface AuthenticatedRequest extends Request {
  user?: User;
  credential?: Authenticator;
}

export interface AuthenticatedRequestWithTypedBody<T>
  extends AuthenticatedRequest {
  body: T;
}
