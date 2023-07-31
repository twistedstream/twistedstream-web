import { NextFunction, Request, Response } from "express";
import querystring from "querystring";

import { UserVerificationRequirement } from "@simplewebauthn/typescript-types";
import {
  AuthenticatedSession,
  AuthenticatingSession,
  RegisterableSession,
  RegisteringSession,
} from "../types/auth";
import {
  RegisterableSource,
  RegisteredAuthenticator,
  User,
} from "../types/entity";
import { AuthenticatedRequest } from "../types/express";
import { now } from "../utils/time";

// auth helpers

export function capturePreAuthState(req: Request) {
  req.session = req.session || {};
  const { return_to } = req.query;
  req.session.return_to = return_to;
}

export function authorizeRegistration(
  req: Request,
  source: RegisterableSource
) {
  req.session = req.session || {};

  req.session.registerable = <RegisterableSession>{
    source,
  };
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
    authenticatingUser: existingUser,
    userVerification,
    challenge,
  };
}

export function signIn(
  req: Request,
  credential: RegisteredAuthenticator
): string {
  req.session = req.session || {};

  // update session
  req.session.authentication = <AuthenticatedSession>{
    credential,
    time: now().toMillis(),
  };

  // get return_to
  const returnTo = req.session?.return_to || "/";

  // clear temp session values
  delete req.session.registration;
  delete req.session.return_to;

  return returnTo;
}

export function signOut(req: Request) {
  req.session = null;
}

export function getAuthentication(
  req: Request
): AuthenticatingSession | undefined {
  return req.session?.authentication;
}

export function getRegistration(req: Request): RegisteringSession | undefined {
  return req.session?.registration;
}

export function getRegisterable(req: Request): RegisterableSession | undefined {
  return req.session?.registerable;
}

export function clearRegisterable(req: Request) {
  req.session = req.session || {};

  delete req.session.registerable;
}

export function redirectToRegister(req: Request, res: Response) {
  const return_to = req.originalUrl;
  res.redirect(`/register?${querystring.stringify({ return_to })}`);
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
      req.user = authentication.credential.user;
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
