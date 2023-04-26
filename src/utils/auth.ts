import { Request } from "express";
import { IdentifiedUser, NamedUser } from "../types/user";
import { AuthenticatedSession } from "../types/session";
import { BadRequestError } from "./error";
import { PresentedCredential } from "../types/credential";

const USER_NAME_PATTERN = /^[a-zA-Z0-9_\-]{3,100}$/;
const USER_DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9\- ]{1,200}$/;

export function validateUser<T extends NamedUser>(req: Request): T {
  const user: T = {
    ...req.body.user,
  };
  if (!user?.name.trim()) {
    throw BadRequestError("User name: missing");
  }
  if (!USER_NAME_PATTERN.test(user.name)) {
    throw BadRequestError(`User name: Expected format ${USER_NAME_PATTERN}`);
  }
  const { displayName } = <any>user;
  if (displayName && !USER_DISPLAY_NAME_PATTERN.test(displayName)) {
    throw BadRequestError(
      `Display name: Expected format ${USER_DISPLAY_NAME_PATTERN}`
    );
  }

  return user;
}

export function validateCredential(req: Request): PresentedCredential {
  const credential: PresentedCredential = {
    id: req.body.id,
    rawId: req.body.rawId,
    response: req.body.response,
  };
  if (!credential?.id.trim()) {
    throw BadRequestError("Credential ID: missing");
  }
  if (!credential?.rawId.trim()) {
    throw BadRequestError("Credential raw ID: missing");
  }
  if (!credential.response) {
    throw BadRequestError("Credential response: missing");
  }

  return credential;
}

export function signIn(req: Request, user: IdentifiedUser): void {
  req.session = req.session || {};

  // update session
  req.session.authentication = <AuthenticatedSession>{
    user: {
      id: user.id,
      name: user.name,
    },
    time: Date.now(),
  };

  // clear old session values
  delete req.session.registration;
  delete req.session.return_to;
}

export function getSessionUser(req: Request): IdentifiedUser | null {
  req.session = req.session || {};

  const authentication: AuthenticatedSession = req.session.authentication;
  if (!authentication) {
    return null;
  }

  return authentication.user;
}
