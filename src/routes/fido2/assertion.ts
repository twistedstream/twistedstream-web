import { Router, Request, Response } from "express";
import { json } from "body-parser";
import base64 from "@hexagon/base64";
import {
  VerifiedAuthenticationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

import { baseUrl, rpID } from "../../utils/config";
import { logger } from "../../utils/logger";
import { BadRequestError } from "../../utils/error";
import { signIn } from "../../utils/auth";
import {
  fetchCredentialById,
  fetchUserById,
  fetchUserByName,
  fetchCredentialsByUsername,
} from "../../services/user";
import { AuthenticatingSession } from "../../types/session";
import { User } from "../../types/user";
import { RegisteredAuthenticator } from "../../types/user";

const router = Router();

// helpers

export function FailedAuthenticationError() {
  return BadRequestError("We couldn't sign you in");
}

// endpoints

router.post("/options", json(), async (req: Request, res: Response) => {
  req.session = req.session || {};

  // validate request
  const { username, userVerification } = req.body;
  const trimmedUsername: string = username ? username.trim() : "";

  // fetch existing user
  let existingUser: User | undefined;
  let existingCredentials: RegisteredAuthenticator[] = [];
  if (trimmedUsername.length > 0) {
    existingUser = await fetchUserByName(trimmedUsername);
    if (!existingUser) {
      logger.warn(`No such user with name '${trimmedUsername}'`);
      throw FailedAuthenticationError();
    }
    existingCredentials = await fetchCredentialsByUsername(trimmedUsername);
    if (existingCredentials.length === 0) {
      // NOTE: this shouldn't happen unless there's a data integrity issue
      throw new Error(
        `Existing user ${existingUser.id} is missing credentials.`
      );
    }
  }

  // generate assertion options (challenge)
  const assertionOptions = generateAuthenticationOptions({
    // Require users to use a previously-registered authenticator
    allowCredentials: existingCredentials.map((authenticator) => ({
      id: base64.toArrayBuffer(authenticator.credentialID),
      type: "public-key",
      // Optional
      transports: authenticator.transports,
    })),
    userVerification: "preferred",
  });
  logger.debug(assertionOptions, "/assertion/options: assertionOptions");

  // build response
  const challengeResponse = {
    ...assertionOptions,
    status: "ok",
    errorMessage: "",
    // add allowed credentials of existing user
    allowCredentials:
      existingCredentials.length > 0
        ? existingCredentials.map((c) => ({
            type: "public-key",
            id: c.credentialID,
            transports: c.transports,
          }))
        : [],
  };
  logger.info(challengeResponse, "Login challenge response");

  // store authentication state in session
  req.session.authentication = <AuthenticatingSession>{
    authenticatingUser: existingUser
      ? {
          id: existingUser.id,
          username: existingUser.username,
        }
      : null,
    userVerification,
    challenge: challengeResponse.challenge,
  };

  res.json(challengeResponse);
});

router.post("/result", json(), async (req: Request, res: Response) => {
  req.session = req.session || {};

  // validate request
  const { body } = req;
  const { id } = body;
  if (!id) {
    throw BadRequestError("Missing: credential ID");
  }

  // retrieve authentication state from session
  const authentication: AuthenticatingSession = req.session.authentication;
  if (!authentication) {
    throw BadRequestError("No active authentication");
  }
  logger.debug(
    authentication,
    "/assertion/result: Authentication state retrieved from session"
  );

  // find user credential
  const activeCredential = await fetchCredentialById(id);
  if (!activeCredential) {
    logger.warn(`/assertion/result: No credential found with ID ${id}`);

    throw FailedAuthenticationError();
  }
  if (
    authentication.authenticatingUser &&
    activeCredential.userID !== authentication.authenticatingUser.id
  ) {
    logger.warn(
      `/assertion/result: Presented credential (id = ${activeCredential.credentialID}) is not associated with specified user (id = ${authentication.authenticatingUser.id})`
    );

    throw FailedAuthenticationError();
  }
  // fetch associated user
  const existingUser = await fetchUserById(activeCredential.userID);
  if (!existingUser) {
    // NOTE: this shouldn't happen unless there's a data integrity issue
    throw new Error(
      `Cannot find user (id = ${activeCredential.userID}) associated with active credential (id =${activeCredential.credentialID})`
    );
  }

  // verify assertion
  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: authentication.challenge,
      expectedOrigin: baseUrl,
      expectedRPID: rpID,
      authenticator: {
        ...activeCredential,
        credentialID: new Uint8Array(
          base64.toArrayBuffer(activeCredential.credentialID, true)
        ),
        credentialPublicKey: new Uint8Array(
          base64.toArrayBuffer(activeCredential.credentialPublicKey, true)
        ),
      },
    });
  } catch (err) {
    logger.warn(
      err,
      `Authentication error with user (id = ${existingUser.id}) and credential (id = ${activeCredential.credentialID})`
    );

    throw FailedAuthenticationError();
  }
  logger.debug(verification, "/assertion/result: verification");

  // build response
  const resultResponse = {
    status: "ok",
    errorMessage: "",
    return_to: req.session.return_to || "/",
  };

  // complete authentication
  signIn(req, existingUser, activeCredential);

  res.json(resultResponse);
});

export default router;
