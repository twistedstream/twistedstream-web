import { Router, Request, Response } from "express";
import { json } from "body-parser";
import { Attachment, ExpectedAssertionResult } from "fido2-lib";
import base64 from "@hexagon/base64";
import { createServer } from "../utils/fido2";
import { origin } from "../utils/config";
import { BadRequestError } from "../utils/error";
import { logger } from "../utils/logger";
import { validateCredential, validateUser, signIn } from "../utils/auth";
import { fetchUserByName, fetchUserById } from "../services/users";
import { NamedUser } from "../types/user";
import { AuthenticatingSession } from "../types/session";

const router = Router();

// endpoints

router.get("/", (req: Request, res: Response) => {
  req.session = req.session || {};
  const { return_to } = req.query;
  req.session.return_to = return_to;

  res.render("login", {
    title: "Sign in",
    return_to,
  });
});

router.post("/challenge", json(), async (req: Request, res: Response) => {
  req.session = req.session || {};

  // get user from request
  const user = validateUser<NamedUser>(req);

  // fetch existing user
  const existingUser = await fetchUserByName(user.name);
  if (!existingUser) {
    throw BadRequestError(`No such user with name ${user.name}`);
  }

  // create FIDO2 server
  const attachment: Attachment = req.body.attachment;
  const fido2 = createServer(attachment);

  // generate attestation options (challenge)
  const assertionOptions = await fido2.assertionOptions();
  logger.debug(assertionOptions, "/login/challenge: assertionOptions");

  // store authentication state in session
  req.session.authentication = <AuthenticatingSession>{
    user: {
      id: existingUser.id,
      name: existingUser.name,
    },
    attachment,
    challenge: base64.fromArrayBuffer(assertionOptions.challenge, true),
  };

  // build challenge response
  const challengeResponse = {
    ...assertionOptions,
    ...req.session.authentication,
    // add allowed credentials of existing user
    allowCredentials: existingUser.credentials.map((c) => ({
      type: "public-key",
      id: c.id,
    })),
  };
  logger.info(challengeResponse, "Login challenge response");

  res.json(challengeResponse);
});

router.post("/validate", json(), async (req: Request, res: Response) => {
  req.session = req.session || {};

  // get credential from request
  const credential = validateCredential(req);

  // retrieve registration state from session
  const { authentication } = req.session;
  if (!authentication) {
    throw BadRequestError("No active authentication");
  }
  logger.debug(
    authentication,
    "/login/validate: Authentication state retrieved from session"
  );

  // fetch existing user
  const existingUser = await fetchUserById(authentication.user.id);
  if (!existingUser) {
    throw BadRequestError(`No such user with ID ${authentication.user.id}`);
  }

  // find credential associated with the authentication
  const existingCredential = existingUser.credentials.find(
    (c: any) => c.id === credential.id
  );
  if (!existingCredential) {
    throw BadRequestError(
      `Credential ${credential.id} not associated with user with ID ${authentication.user.id}`
    );
  }

  // create FIDO2 server
  const fido2 = createServer(existingCredential.attachment);

  // validated assertion
  const clientAssertionResponse = {
    ...credential,
    id: base64.toArrayBuffer(credential.id, true),
    rawId: base64.toArrayBuffer(credential.rawId, true),
  };
  const assertionExpectations: ExpectedAssertionResult = {
    challenge: authentication.challenge,
    origin,
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
    throw BadRequestError(
      `Authentication error with user with ID ${authentication.user.id} and credential ${credential.id}`
    );
  }
  logger.debug(assertionResult, "/login/validate: assertionResult");

  // build validation response
  const validateResponse = {
    return_to: req.session.return_to || "/",
  };

  // complete authentication
  signIn(req, existingUser);

  res.json(validateResponse);
});

export default router;
