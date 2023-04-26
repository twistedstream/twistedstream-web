import { Router, Request, Response } from "express";
import { json } from "body-parser";
import {
  Attachment,
  ExpectedAttestationResult,
  AttestationResult,
} from "fido2-lib";
import crypto from "crypto";
import base64 from "@hexagon/base64";
import { createServer } from "../utils/fido2";
import { origin } from "../utils/config";
import { BadRequestError } from "../utils/error";
import { logger } from "../utils/logger";
import {
  validateCredential,
  validateUser,
  signIn,
  getSessionUser,
} from "../utils/auth";
import {
  fetchUserByName,
  createUser,
  addUserCredential,
  fetchUserById,
} from "../services/users";
import { ValidatedCredential } from "../types/credential";
import { RegisteringUser } from "../types/user";
import { RegisteringSession } from "../types/session";

const router = Router();

// endpoints

router.get("/", (req: Request, res: Response) => {
  req.session = req.session || {};
  const { return_to } = req.query;
  req.session.return_to = return_to;

  res.render("register", {
    title: "Sign up",
    return_to,
  });
});

router.post("/challenge", json(), async (req: Request, res: Response) => {
  req.session = req.session || {};

  const sessionUser = getSessionUser(req);
  let registeringUser: RegisteringUser;
  if (sessionUser) {
    // session user exists, so we'll be enrolling another credential
    const existingUser = await fetchUserById(sessionUser.id);
    if (!existingUser) {
      throw BadRequestError(`User with ID ${sessionUser.id} no longer exists`);
    }

    registeringUser = {
      id: existingUser.id,
      name: existingUser.name,
      displayName: existingUser.displayName,
    };
  } else {
    // new user enrollment with initial credential
    registeringUser = {
      ...validateUser<RegisteringUser>(req),
      // set new iD
      id: base64.fromArrayBuffer(crypto.randomBytes(16).buffer, true),
    };

    const existingUser = await fetchUserByName(registeringUser.name);
    if (existingUser) {
      throw BadRequestError(
        `A user with name ${registeringUser.name} already exists`
      );
    }
  }

  // create FIDO2 server
  const attachment: Attachment = req.body.attachment;
  const fido2 = createServer(attachment);
  // generate attestation options (challenge)
  const attestationOptions = await fido2.attestationOptions();

  // store registration state in session
  req.session.registration = <RegisteringSession>{
    user: registeringUser,
    attachment,
    challenge: base64.fromArrayBuffer(attestationOptions.challenge, true),
  };

  // build challenge response
  const challengeResponse = {
    ...attestationOptions,
    ...req.session.registration,
  };
  logger.info(challengeResponse, "Registration challenge response");

  res.json(challengeResponse);
});

router.post("/validate", json(), async (req: Request, res: Response) => {
  req.session = req.session || {};

  // get credential from request
  const credential = validateCredential(req);

  // retrieve registration state from session
  const registration: RegisteringSession = req.session.registration;
  if (!registration) {
    throw BadRequestError("No active registration");
  }
  logger.debug(
    registration,
    "/register/validate: Registration state retrieved from session"
  );

  // create FIDO2 server
  const fido2 = createServer(registration.attachment);

  // validated attestation
  const clientAttestationResponse: AttestationResult = {
    ...credential,
    id: base64.toArrayBuffer(credential.id, true),
    rawId: base64.toArrayBuffer(credential.rawId, true),
  };
  const attestationExpectations: ExpectedAttestationResult = {
    challenge: registration.challenge,
    origin,
    factor: "first",
  };
  const attestationResult = await fido2.attestationResult(
    clientAttestationResponse,
    attestationExpectations
  );

  // build credential object
  const validatedCredential: ValidatedCredential = {
    id: base64.fromArrayBuffer(
      attestationResult.authnrData.get("credId"),
      true
    ),
    counter: attestationResult.authnrData.get("counter"),
    publicKey: attestationResult.authnrData.get("credentialPublicKeyPem"),
    userHandle: registration.user.id,
    created: new Date(Date.now()),
    attachment: registration.attachment,
  };
  logger.debug(validatedCredential, "/register/validate: Validated credential");

  const sessionUser = getSessionUser(req);
  const user = sessionUser
    ? // update existing user in rp with additional credential
      await addUserCredential(sessionUser.id, validatedCredential)
    : // create new user in rp with initial credential
      await createUser(registration.user, validatedCredential);

  // build validation response
  const validateResponse = {
    return_to: req.session.return_to || "/",
  };

  // complete authentication
  signIn(req, user);

  res.json(validateResponse);
});

export default router;
