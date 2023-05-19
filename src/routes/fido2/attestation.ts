import { Router, Response } from "express";
import { json } from "body-parser";
import { ExpectedAttestationResult, AttestationResult } from "fido2-lib";
import base64 from "@hexagon/base64";
import crypto from "crypto";
import { StatusCodes } from "http-status-codes";

import { createServer } from "../../utils/fido2";
import { baseUrl } from "../../utils/config";
import { logger } from "../../utils/logger";
import { signIn } from "../../utils/auth";
import {
  fetchUserByName,
  createUser,
  addUserCredential,
  fetchUserById,
} from "../../services/users";
import { ValidatedCredential } from "../../types/credential";
import { UserInfo } from "../../types/user";
import { RegisteringSession } from "../../types/session";
import {
  ServerPublicKeyCredentialCreationOptionsRequest,
  ServerPublicKeyCredentialCreationOptionsResponse,
  ServerResponse,
  ServerAttestationPublicKeyCredential,
  ServerPublicKeyCredentialDescriptor,
} from "../../schema/fido2-server";
import { renderErrorServerResponse, validateSchema } from "../../schema/util";
import { AuthenticatedRequest } from "../../types/express";

const router = Router();

// endpoints

/**
 * request: ServerPublicKeyCredentialCreationOptionsRequest
 * response: ServerPublicKeyCredentialCreationOptionsResponse
 */
router.post(
  "/options",
  json(),
  validateSchema(ServerPublicKeyCredentialCreationOptionsRequest),
  async (req: AuthenticatedRequest, res: Response) => {
    req.session = req.session || {};

    const optionsRequest: ServerPublicKeyCredentialCreationOptionsRequest =
      req.body;

    let registeringUser: UserInfo;
    let excludeCredentials: ServerPublicKeyCredentialDescriptor[];
    if (req.user) {
      // session user exists, so we'll be enrolling another credential
      const existingUser = await fetchUserById(req.user.id);
      if (!existingUser) {
        return renderErrorServerResponse(
          res,
          StatusCodes.BAD_REQUEST,
          `User with ID ${req.user.id} no longer exists`
        );
      }

      registeringUser = {
        id: existingUser.id,
        name: existingUser.name,
        displayName: existingUser.displayName,
      };

      // add existing credentials of user
      excludeCredentials = existingUser.credentials.map((c) => ({
        id: c.id,
        type: "public-key",
      }));
    } else {
      const existingUser = await fetchUserByName(optionsRequest.username);
      if (existingUser) {
        return renderErrorServerResponse(
          res,
          StatusCodes.BAD_REQUEST,
          `A user with name '${optionsRequest.username}' already exists`
        );
      }

      registeringUser = {
        id: base64.fromArrayBuffer(crypto.randomBytes(16).buffer, true),
        name: optionsRequest.username,
        displayName: optionsRequest.displayName,
      };

      excludeCredentials = [];
    }

    // create FIDO2 server
    const fido2 = createServer(
      optionsRequest.authenticatorSelection.userVerification,
      optionsRequest.attestation,
      optionsRequest.authenticatorSelection.authenticatorAttachment,
      optionsRequest.authenticatorSelection.requireResidentKey
    );
    // generate attestation options (challenge)
    const attestationOptions = await fido2.attestationOptions();
    logger.debug(
      attestationOptions,
      "/attestation/options: attestationOptions"
    );

    // build response
    const optionsResponse: ServerPublicKeyCredentialCreationOptionsResponse = {
      ...attestationOptions,
      status: "ok",
      errorMessage: "",
      challenge: base64.fromArrayBuffer(attestationOptions.challenge, true),
      user: registeringUser,
      excludeCredentials,
      authenticatorSelection: {
        ...attestationOptions.authenticatorSelection,
        requireResidentKey:
          attestationOptions.authenticatorSelection?.requireResidentKey ||
          false,
        // NOTE: since residentKey isn't directly supported by Fido2Lib, we will echo back what was requested by the client
        residentKey: optionsRequest.authenticatorSelection.residentKey,
        userVerification:
          attestationOptions.authenticatorSelection?.userVerification ||
          "preferred",
      },
      attestation: attestationOptions.attestation || "none",
    };
    logger.info(optionsResponse, "Registration challenge response");

    // store registration state in session
    req.session.registration = <RegisteringSession>{
      registeringUser,
      authenticatorSelection: optionsRequest.authenticatorSelection,
      attestation: optionsRequest.attestation,
      challenge: optionsResponse.challenge,
    };

    res.json(optionsResponse);
  }
);

/**
 * request: ServerAttestationPublicKeyCredential
 * response: ServerResponse
 */
router.post(
  "/result",
  json(),
  validateSchema(ServerAttestationPublicKeyCredential),
  async (req: AuthenticatedRequest, res: Response) => {
    req.session = req.session || {};

    const resultRequest: ServerAttestationPublicKeyCredential = req.body;

    // retrieve registration state from session
    const registration: RegisteringSession = req.session.registration;
    if (!registration) {
      return renderErrorServerResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "No active registration"
      );
    }
    logger.debug(
      registration,
      "/attestation/result: Registration state retrieved from session"
    );

    // create FIDO2 server
    const fido2 = createServer(
      registration.authenticatorSelection.userVerification,
      registration.attestation,
      registration.authenticatorSelection.authenticatorAttachment,
      registration.authenticatorSelection.requireResidentKey
    );

    // validated attestation
    const clientAttestationResponse: AttestationResult = {
      ...resultRequest,
      id: base64.toArrayBuffer(resultRequest.id, true),
      rawId: base64.toArrayBuffer(resultRequest.rawId, true),
    };
    const attestationExpectations: ExpectedAttestationResult = {
      challenge: registration.challenge,
      origin: baseUrl,
      factor: "first",
    };
    let attestationResult;
    try {
      attestationResult = await fido2.attestationResult(
        clientAttestationResponse,
        attestationExpectations
      );
    } catch (err: any) {
      logger.warn(
        err,
        `Registration error with user with ID ${registration.registeringUser.id} and credential ${resultRequest.id}`
      );

      return renderErrorServerResponse(
        res,
        StatusCodes.BAD_REQUEST,
        err.message || err
      );
    }

    // build credential object
    const validatedCredential: ValidatedCredential = {
      id: base64.fromArrayBuffer(
        attestationResult.authnrData.get("credId"),
        true
      ),
      counter: attestationResult.authnrData.get("counter"),
      publicKey: attestationResult.authnrData.get("credentialPublicKeyPem"),
      userHandle: registration.registeringUser.id,
      created: new Date(Date.now()),
      attachment:
        registration.authenticatorSelection.authenticatorAttachment ||
        "platform",
    };
    logger.debug(
      validatedCredential,
      "/attestation/result: Validated credential"
    );

    const user = req.user
      ? // update existing user in rp with additional credential
        await addUserCredential(req.user.id, validatedCredential)
      : // create new user in rp with initial credential
        await createUser(registration.registeringUser, validatedCredential);

    // build response
    const resultResponse: ServerResponse & { return_to: string } = {
      status: "ok",
      errorMessage: "",
      return_to: req.session.return_to || "/",
    };

    if (!req.user) {
      // complete authentication
      signIn(req, user, validatedCredential);
    }

    res.json(resultResponse);
  }
);

export default router;
