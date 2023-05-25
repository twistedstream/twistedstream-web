import { Router, Request, Response } from "express";
import { json } from "body-parser";
import { AssertionResult, ExpectedAssertionResult } from "fido2-lib";
import base64 from "@hexagon/base64";
import { StatusCodes } from "http-status-codes";

import { createServer } from "../../utils/fido2";
import { baseUrl } from "../../utils/config";
import { logger } from "../../utils/logger";
import { signIn } from "../../utils/auth";
import {
  fetchCredentialById,
  fetchUserById,
  fetchUserByName,
  fetchUserCredentials,
} from "../../services/users";
import { AuthenticatingSession } from "../../types/session";
import {
  ServerAssertionPublicKeyCredential,
  ServerPublicKeyCredentialGetOptionsRequest,
  ServerPublicKeyCredentialGetOptionsResponse,
  ServerResponse,
} from "../../schema/fido2-server";
import { renderErrorServerResponse, validateSchema } from "../../schema/util";
import { User } from "../../types/user";
import { RegisteredAuthenticator } from "../../types/user";

const router = Router();

// helpers

export function renderFailedAuthenticationResponse(res: Response) {
  return renderErrorServerResponse(
    res,
    StatusCodes.BAD_REQUEST,
    "We couldn't sign you in"
  );
}

// endpoints

/**
 * request: ServerPublicKeyCredentialGetOptionsRequest
 * response: ServerPublicKeyCredentialGetOptionsResponse
 */
router.post(
  "/options",
  json(),
  validateSchema(ServerPublicKeyCredentialGetOptionsRequest),
  async (req: Request, res: Response) => {
    req.session = req.session || {};

    const optionsRequest: ServerPublicKeyCredentialGetOptionsRequest = req.body;

    const username = optionsRequest.username.trim();

    // fetch existing user
    let existingUser: User | undefined;
    let existingCredentials: RegisteredAuthenticator[] = [];
    if (username.length > 0) {
      existingUser = await fetchUserByName(username);
      if (!existingUser) {
        logger.warn(`No such user with name '${username}'`);
        return renderFailedAuthenticationResponse(res);
      }
      existingCredentials = await fetchUserCredentials(username);
      if (existingCredentials.length === 0) {
        // NOTE: this shouldn't happen unless there's a data integrity issue
        throw new Error(
          `Existing user ${existingUser.id} is missing credentials.`
        );
      }
    }

    // create FIDO2 server
    const fido2 = createServer(optionsRequest.userVerification);

    // generate assertion options (challenge)
    const assertionOptions = await fido2.assertionOptions();
    logger.debug(assertionOptions, "/assertion/options: assertionOptions");

    // build response
    const challengeResponse = <ServerPublicKeyCredentialGetOptionsResponse>{
      ...assertionOptions,
      status: "ok",
      errorMessage: "",
      challenge: base64.fromArrayBuffer(assertionOptions.challenge, true),
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
      userVerification: optionsRequest.userVerification,
      challenge: challengeResponse.challenge,
    };

    res.json(challengeResponse);
  }
);

/**
 * request: ServerAssertionPublicKeyCredential
 * response: ServerResponse
 */
router.post(
  "/result",
  json(),
  validateSchema(ServerAssertionPublicKeyCredential),
  async (req: Request, res: Response) => {
    req.session = req.session || {};

    const resultRequest: ServerAssertionPublicKeyCredential = req.body;

    // retrieve authentication state from session
    const authentication: AuthenticatingSession = req.session.authentication;
    if (!authentication) {
      return renderErrorServerResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "No active authentication"
      );
    }
    logger.debug(
      authentication,
      "/assertion/result: Authentication state retrieved from session"
    );

    // find user credential
    const activeCredential = await fetchCredentialById(resultRequest.id);
    if (!activeCredential) {
      logger.warn(
        `/assertion/result: No credential found with ID ${resultRequest.id}`
      );

      return renderFailedAuthenticationResponse(res);
    }
    if (
      authentication.authenticatingUser &&
      activeCredential.userID !== authentication.authenticatingUser.id
    ) {
      logger.warn(
        `/assertion/result: Presented credential (id = ${activeCredential.credentialID}) is not associated with specified user (id = ${authentication.authenticatingUser.id})`
      );

      return renderFailedAuthenticationResponse(res);
    }
    // fetch associated user
    const existingUser = await fetchUserById(activeCredential.userID);
    if (!existingUser) {
      // NOTE: this shouldn't happen unless there's a data integrity issue
      throw new Error(
        `Cannot find user (id = ${activeCredential.userID}) associated with active credential (id =${activeCredential.credentialID})`
      );
    }

    // create FIDO2 server
    const fido2 = createServer(authentication.userVerification);

    // validated assertion
    const clientAssertionResponse: AssertionResult = {
      id: base64.toArrayBuffer(resultRequest.id, true),
      rawId: base64.toArrayBuffer(resultRequest.rawId, true),
      response: {
        ...resultRequest.response,
        authenticatorData: base64.toArrayBuffer(
          resultRequest.response.authenticatorData,
          true
        ),
      },
    };
    const assertionExpectations: ExpectedAssertionResult = {
      challenge: authentication.challenge,
      origin: baseUrl,
      factor: "first",
      publicKey: activeCredential.publicKey,
      prevCounter: activeCredential.counter,
      userHandle: activeCredential.userID,
    };
    let assertionResult;
    try {
      assertionResult = await fido2.assertionResult(
        clientAssertionResponse,
        assertionExpectations
      );
    } catch (err) {
      logger.warn(
        err,
        `Authentication error with user (id = ${existingUser.id}) and credential (id = ${activeCredential.credentialID})`
      );

      return renderFailedAuthenticationResponse(res);
    }
    logger.debug(assertionResult, "/assertion/result: assertionResult");

    // build response
    const validateResponse: ServerResponse & { return_to: string } = {
      status: "ok",
      errorMessage: "",
      return_to: req.session.return_to || "/",
    };

    // complete authentication
    signIn(req, existingUser, activeCredential);

    res.json(validateResponse);
  }
);

export default router;
