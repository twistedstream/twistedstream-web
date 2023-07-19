import base64 from "@hexagon/base64";
import {
  VerifiedRegistrationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { json } from "body-parser";
import { Response, Router } from "express";

import {
  addUserCredential,
  createUser,
  fetchCredentialsByUserId,
  fetchUserById,
  fetchUserByName,
  registerUser,
} from "../../services/user";
import { AuthenticatedRequest } from "../../types/express";
import { Authenticator, RegisteredAuthenticator, User } from "../../types/user";
import {
  beginSignup,
  getRegistration,
  getReturnTo,
  signIn,
} from "../../utils/auth";
import { baseUrl, companyName, rpID } from "../../utils/config";
import { BadRequestError, assertValue } from "../../utils/error";
import { logger } from "../../utils/logger";

const router = Router();

// endpoints

router.post(
  "/options",
  json(),
  async (req: AuthenticatedRequest, res: Response) => {
    const { username, displayName, attestation } = req.body;

    let registeringUser: User | undefined;
    let excludeCredentials: RegisteredAuthenticator[];

    if (req.user) {
      // registering user is an existing user
      registeringUser = await fetchUserById(req.user.id);
      if (!registeringUser) {
        throw BadRequestError(`User with ID ${req.user.id} no longer exists`);
      }

      // going to exclude existing credentials
      excludeCredentials = await fetchCredentialsByUserId(req.user.id);
      if (excludeCredentials.length === 0) {
        // NOTE: this shouldn't happen unless there's a data integrity issue
        throw new Error(
          `Existing user ${registeringUser.id} is missing credentials.`
        );
      }
    } else {
      // register user will be a new user
      try {
        registeringUser = createUser(username, displayName);
      } catch (err: any) {
        if (err.type === "validation") {
          throw BadRequestError(err.message);
        }
        throw err;
      }
      // no existing credentials to exclude
      excludeCredentials = [];

      const existingUser = await fetchUserByName(username);
      if (existingUser) {
        throw BadRequestError(
          `A user with username '${username}' already exists`
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
    beginSignup(req, optionsResponse.challenge, registeringUser);

    res.json(optionsResponse);
  }
);

router.post(
  "/result",
  json(),
  async (req: AuthenticatedRequest, res: Response) => {
    // validate request
    const { body } = req;
    const { id, response } = body;
    if (!id) {
      throw BadRequestError("Missing: credential ID");
    }
    if (!response) {
      throw BadRequestError("Missing: authentication response");
    }

    // retrieve registration state from session
    const registration = getRegistration(req);
    if (!registration) {
      throw BadRequestError("No active registration");
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

      throw BadRequestError(`Registration failed: ${err.message}`);
    }
    logger.debug(verification, "/attestation/result: verification");

    // build credential object
    const registrationInfo = assertValue(verification.registrationInfo);
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

    let { user } = req;
    if (user) {
      // update existing user in rp with additional credential
      await addUserCredential(user.id, validatedCredential);
    } else {
      // create new user in rp with initial credential
      user = await registerUser(
        registration.registeringUser,
        validatedCredential
      );

      // complete authentication
      signIn(req, user, validatedCredential);
    }

    // build response
    const resultResponse = {
      status: "ok",
      errorMessage: "",
      return_to: getReturnTo(req),
    };

    res.json(resultResponse);
  }
);

export default router;
