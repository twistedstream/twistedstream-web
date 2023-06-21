import { Router, Response } from "express";
import { json } from "body-parser";
import {
  VerifiedRegistrationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import base64 from "@hexagon/base64";
import { StatusCodes } from "http-status-codes";

import { baseUrl, companyName, rpID } from "../../utils/config";
import { logger } from "../../utils/logger";
import { renderFido2ServerErrorResponse } from "../../utils/fido2";
import { signIn } from "../../utils/auth";
import {
  fetchUserByName,
  createUser,
  registerUser,
  fetchUserById,
  fetchCredentialsByUserId,
  addUserCredential,
} from "../../services/users";
import { Authenticator, RegisteredAuthenticator } from "../../types/user";
import { User } from "../../types/user";
import { RegisteringSession } from "../../types/session";
import { AuthenticatedRequest } from "../../types/express";
import { ValidationError } from "../../types/error";

const router = Router();

// endpoints

router.post(
  "/options",
  json(),
  async (req: AuthenticatedRequest, res: Response) => {
    req.session = req.session || {};

    // validate request
    const { username, displayName, attestation } = req.body;
    let registeringUser: User;
    try {
      registeringUser = createUser(username, displayName);
    } catch (err) {
      if (err instanceof ValidationError) {
        return renderFido2ServerErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          err.message
        );
      }
      throw err;
    }

    let excludeCredentials: RegisteredAuthenticator[] = [];
    if (req.user) {
      // session user exists, so we'll be enrolling another credential
      const existingUser = await fetchUserById(req.user.id);
      if (!existingUser) {
        return renderFido2ServerErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          `User with ID ${req.user.id} no longer exists`
        );
      }

      // registering user is existing user
      registeringUser = existingUser;
      const credentials = await fetchCredentialsByUserId(req.user.id);

      // tell client to exclude existing user credentials
      excludeCredentials = credentials;
    } else {
      const existingUser = await fetchUserByName(username);
      if (existingUser) {
        return renderFido2ServerErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          `A user with name '${username}' already exists`
        );
      }
    }

    // generate options
    const attestationOptions = generateRegistrationOptions({
      rpName: companyName,
      rpID,
      userID: registeringUser.id,
      userName: registeringUser.username,
      userDisplayName: registeringUser.displayName,
      attestationType: attestation,
      excludeCredentials: excludeCredentials.map((c) => ({
        id: base64.toArrayBuffer(c.credentialID, true),
        type: "public-key",
        transports: c.transports,
      })),
    });

    // build response
    const optionsResponse = {
      ...attestationOptions,
      status: "ok",
      errorMessage: "",
    };
    logger.info(optionsResponse, "Registration challenge response");

    // store registration state in session
    req.session.registration = <RegisteringSession>{
      registeringUser,
      challenge: optionsResponse.challenge,
    };

    res.json(optionsResponse);
  }
);

router.post(
  "/result",
  json(),
  async (req: AuthenticatedRequest, res: Response) => {
    req.session = req.session || {};

    // validate request
    const { body } = req;
    const { id, response } = body;
    if (!id) {
      return renderFido2ServerErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Missing: credential ID"
      );
    }
    if (!response) {
      return renderFido2ServerErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Missing: authentication response"
      );
    }

    // retrieve registration state from session
    const registration: RegisteringSession = req.session.registration;
    if (!registration) {
      return renderFido2ServerErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "No active registration"
      );
    }
    logger.debug(
      registration,
      "/attestation/result: Registration state retrieved from session"
    );

    //verify registration
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: registration.challenge,
        expectedOrigin: baseUrl,
        expectedRPID: rpID,
      });
    } catch (err: any) {
      logger.warn(
        err,
        `Registration error with user with ID ${registration.registeringUser.id} and credential ${id}`
      );

      return renderFido2ServerErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        err.message || err
      );
    }
    logger.debug(verification, "/attestation/result: verification");

    const { registrationInfo } = verification;
    if (!registrationInfo) {
      throw new Error(`Empty registration when verification seemed successful`);
    }

    // build credential object
    const { aaguid, counter, credentialDeviceType, credentialBackedUp } =
      registrationInfo;
    const validatedCredential: Authenticator = {
      created: new Date(Date.now()),
      credentialID: base64.fromArrayBuffer(registrationInfo.credentialID, true),
      credentialPublicKey: base64.fromArrayBuffer(
        registrationInfo.credentialPublicKey,
        true
      ),
      counter,
      aaguid,
      credentialDeviceType,
      credentialBackedUp,
      transports: response.transports,
    };
    logger.debug(
      validatedCredential,
      "/attestation/result: Validated credential"
    );

    let user = req.user;
    if (user) {
      // update existing user in rp with additional credential
      await addUserCredential(user.id, validatedCredential);
    } else {
      // create new user in rp with initial credential
      user = await registerUser(
        registration.registeringUser,
        validatedCredential
      );
    }

    // build response
    const resultResponse = {
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
