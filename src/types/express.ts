import { Request } from "express";
import { Authenticator, User } from "./entity";

export interface AuthenticatedRequest extends Request {
  user?: User;
  credential?: Authenticator;
}

export interface AuthenticatedRequestWithTypedBody<T>
  extends AuthenticatedRequest {
  body: T;
}
