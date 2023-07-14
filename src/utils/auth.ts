import { NextFunction, Request, Response } from "express";
import querystring from "querystring";

import { Authenticator, User } from "../types/user";
import {
  AuthenticatedSession,
  AuthenticatingSession,
  RegisteringSession,
} from "../types/session";
import { AuthenticatedRequest } from "../types/express";
import { UserVerificationRequirement } from "@simplewebauthn/typescript-types";

// auth helpers

export function capturePreAuthState(req: Request) {
  req.session = req.session || {};
  const { return_to } = req.query;
  req.session.return_to = return_to;
}

export function beginSignup(
  req: Request,
  challenge: string,
  registeringUser: User
) {
  req.session = req.session || {};

  req.session.registration = <RegisteringSession>{
    registeringUser,
    challenge,
  };
}

export function beginSignIn(
  req: Request,
  challenge: string,
  existingUser?: User,
  userVerification?: UserVerificationRequirement
) {
  req.session = req.session || {};

  req.session.authentication = <AuthenticatingSession>{
    authenticatingUser: existingUser
      ? {
          id: existingUser.id,
          username: existingUser.username,
        }
      : null,
    userVerification,
    challenge,
  };
}

export function signIn(
  req: Request,
  user: User,
  credential: Authenticator
): void {
  req.session = req.session || {};

  // update session
  const { id, username } = user;
  req.session.authentication = <AuthenticatedSession>{
    user: { id, username },
    credential,
    time: Date.now(),
  };

  // clear temp session values
  delete req.session.registration;
  delete req.session.return_to;
}

export function signOut(req: Request) {
  req.session = null;
}

export function getReturnTo(req: Request): string {
  return req.session?.return_to || "/";
}

export function getAuthentication(
  req: Request
): AuthenticatingSession | undefined {
  return req.session?.authentication;
}

export function getRegistration(req: Request): RegisteringSession | undefined {
  return req.session?.registration;
}

// middleware

export function auth() {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    const authentication: AuthenticatedSession = req.session?.authentication;

    // FUTURE: only set user if session hasn't expired
    if (authentication?.time) {
      req.user = authentication.user;
      req.credential = authentication.credential;
    }

    return next();
  };
}

export function requiresAuth() {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      // redirect to login page
      const return_to = req.originalUrl;
      return res.redirect(`/login?${querystring.stringify({ return_to })}`);
    }

    return next();
  };
}
