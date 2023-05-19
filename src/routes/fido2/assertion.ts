import { Router, Request, Response } from "express";
import { json } from "body-parser";
import { AssertionResult, ExpectedAssertionResult } from "fido2-lib";
import base64 from "@hexagon/base64";
import { StatusCodes } from "http-status-codes";

import { createServer } from "../../utils/fido2";
import { baseUrl } from "../../utils/config";
import { logger } from "../../utils/logger";
import { signIn } from "../../utils/auth";
import { fetchUserByName, fetchUserByCredentialId } from "../../services/users";
import { AuthenticatingSession } from "../../types/session";
import {
  ServerAssertionPublicKeyCredential,
  ServerPublicKeyCredentialGetOptionsRequest,
  ServerPublicKeyCredentialGetOptionsResponse,
  ServerResponse,
} from "../../schema/fido2-server";
import { renderErrorServerResponse, validateSchema } from "../../schema/util";
import { FullUser } from "../../types/user";
import { ValidatedCredential } from "../../types/credential";

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
    let existingUser: FullUser | null = null;
    if (username.length > 0) {
      existingUser = await fetchUserByName(optionsRequest.username);
      if (!existingUser) {
        logger.warn(`No such user with name '${optionsRequest.username}'`);
        return renderFailedAuthenticationResponse(res);
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
      allowCredentials: existingUser
        ? existingUser.credentials.map((c) => ({
            type: "public-key",
            id: c.id,
          }))
        : [],
    };
    logger.info(challengeResponse, "Login challenge response");

    // store authentication state in session
    req.session.authentication = <AuthenticatingSession>{
      authenticatingUser: existingUser
        ? {
            id: existingUser.id,
            name: existingUser.name,
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

    // find user by cred ID
    const existingUser = await fetchUserByCredentialId(resultRequest.id);
    if (!existingUser) {
      logger.warn(
        `/assertion/result: No user found with credential ID ${resultRequest.id}`
      );

      return renderFailedAuthenticationResponse(res);
    }

    // ensure credential
    const existingCredential: ValidatedCredential | undefined =
      existingUser.credentials.find((c) => c.id === resultRequest.id);
    if (!existingCredential) {
      // this should never happen
      throw new Error(
        `Found user with ID ${existingUser.id} is somehow now missing credential with ID ${resultRequest.id}`
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
      publicKey: existingCredential.publicKey,
      prevCounter: existingCredential.counter,
      userHandle: existingCredential.userHandle,
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
        `Authentication error with user with ID ${existingUser.id} and credential ${existingCredential.id}`
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
    signIn(req, existingUser, existingCredential);

    res.json(validateResponse);
  }
);

export default router;
