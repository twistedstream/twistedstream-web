import base64 from "@hexagon/base64";
import * as simpleWebAuthnServerDefaults from "@simplewebauthn/server";
import { StatusCodes } from "http-status-codes";
import sinon from "sinon";
import request, { Response as SupertestResponse } from "supertest";

import { InMemoryDataProvider } from "../../data/in-memory";
import { IntegrationTestState } from "../../types/test";
import { Authenticator, RegisteredAuthenticator, User } from "../../types/user";

// general

export function createIntegrationTestState(
  test: Tap.Test,
  users: User[],
  credentials: RegisteredAuthenticator[]
): IntegrationTestState {
  const verifyRegistrationResponseStub = sinon.stub();
  const verifyAuthenticationResponseStub = sinon.stub();

  const { default: app } = test.mock("../../app", {
    "../../data": {
      getProvider: () => new InMemoryDataProvider(users, credentials),
    },
    "@simplewebauthn/server": {
      ...simpleWebAuthnServerDefaults,
      verifyRegistrationResponse: verifyRegistrationResponseStub,
      verifyAuthenticationResponse: verifyAuthenticationResponseStub,
    },
  });

  return {
    app,
    users,
    credentials,
    verifyRegistrationResponseStub,
    verifyAuthenticationResponseStub,
  };
}

function updateCookie(
  state: IntegrationTestState,
  response: SupertestResponse
) {
  const setCookie = response.headers["set-cookie"];
  if (setCookie) {
    state.cookie = setCookie;
  }
}

// requests

export async function navigatePage(
  state: IntegrationTestState,
  path: string
): Promise<SupertestResponse> {
  const { app } = state;

  const response = await request(app)
    .get(path)
    .set("cookie", state.cookie || "")
    .accept("text/html");
  updateCookie(state, response);

  return response;
}

export async function postJson(
  state: IntegrationTestState,
  path: string,
  body: any
): Promise<SupertestResponse> {
  const { app } = state;

  const response = await request(app)
    .post(path)
    .set("cookie", state.cookie || "")
    .set("content-type", "application/json")
    .accept("application/json")
    .send(body);
  updateCookie(state, response);

  return response;
}

export async function postForm(
  state: IntegrationTestState,
  path: string,
  body: any
): Promise<SupertestResponse> {
  const { app } = state;

  const response = await request(app)
    .post(path)
    .set("cookie", state.cookie || "")
    .set("content-type", "application/x-www-form-urlencoded")
    .accept("text/html")
    .send(body);
  updateCookie(state, response);

  return response;
}

// response assertions

export function assertHtmlResponse(
  test: Tap.Test,
  response: SupertestResponse
) {
  test.equal(response.status, StatusCodes.OK);
  test.match(response.headers["content-type"], "text/html");
}

export function assertJsonResponse(
  test: Tap.Test,
  response: SupertestResponse,
  schemaTest: (json: any) => void
) {
  test.equal(response.status, StatusCodes.OK);
  test.match(response.headers["content-type"], "application/json");
  const json = JSON.parse(response.text);
  schemaTest(json);
}

export function assertRedirectResponse(
  test: Tap.Test,
  response: SupertestResponse,
  expectedLocation: string
) {
  test.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
  test.match(response.headers["location"], expectedLocation);
}

export function assertNoUsersOrCredentials(
  test: Tap.Test,
  state: IntegrationTestState
) {
  test.equal(state.users.length, 0);
  test.equal(state.credentials.length, 0);
}

export function assertUserAndAssociatedCredentials(
  test: Tap.Test,
  state: IntegrationTestState,
  user: User,
  associatedCredentials: Authenticator[]
) {
  const foundUser = state.users.find(
    (u) => u.username === user.username && u.displayName === user.displayName
  );
  test.ok(foundUser);

  for (const credential of associatedCredentials) {
    const foundCredential = state.credentials.find(
      (c) =>
        c.credentialID === credential.credentialID && c.userID === foundUser?.id
    );
    test.ok(foundCredential);
  }
}

// composite

export async function doRegistration(
  test: Tap.Test,
  state: IntegrationTestState,
  user: User,
  newCredential: Authenticator,
  isNewUser: boolean
) {
  const optionsResponse = await postJson(state, "/fido2/attestation/options", {
    username: isNewUser ? user.username : "",
    displayName: isNewUser ? user.displayName : "",
    authenticatorSelection: {
      requireResidentKey: false,
      residentKey: "preferred",
      authenticatorAttachment: "platform",
      userVerification: "preferred",
    },
    attestation: "direct",
  });

  assertJsonResponse(test, optionsResponse, (json) => {
    test.equal(json.status, "ok");
    test.match(json, {
      challenge: /\S+/,
      rp: {
        id: "example.com",
        name: "Twisted Stream Technologies",
      },
      user: {
        id: /\S+/,
        name: user.username,
        displayName: user.displayName,
      },
      excludeCredentials: [],
      attestation: "direct",
      authenticatorSelection: {
        residentKey: "preferred",
        requireResidentKey: false,
        userVerification: "preferred",
      },
    });
  });

  const testValidatedCredential = {
    ...newCredential,
    credentialID: base64.toArrayBuffer(newCredential.credentialID, true),
    credentialPublicKey: base64.toArrayBuffer(
      newCredential.credentialPublicKey,
      true
    ),
  };

  state.verifyRegistrationResponseStub.returns({
    registrationInfo: { ...testValidatedCredential },
  });

  const resultResponse = await postJson(state, "/fido2/attestation/result", {
    id: newCredential.credentialID,
    response: {
      // ignored since we're stubbing verifyRegistrationResponse
    },
  });

  assertJsonResponse(test, resultResponse, (json) => {
    test.equal(json.status, "ok");
    test.match(json, {
      return_to: "/",
    });
  });

  test.ok(state.verifyRegistrationResponseStub.called);
}

export async function doSignIn(
  test: Tap.Test,
  state: IntegrationTestState,
  username: string,
  expectedCredential: Authenticator
) {
  const optionsResponse = await postJson(state, "/fido2/assertion/options", {
    username,
    userVerification: "preferred",
  });

  const associatedUser = state.users.find((u) => u.username === username);
  test.ok(associatedUser, `No user in test state with name: ${username}`);
  const allowCredentials = state.credentials
    .filter((c) => c.userID === associatedUser?.id)
    .map((c) => ({
      type: "public-key",
      id: c.credentialID,
    }));

  assertJsonResponse(test, optionsResponse, (json) => {
    test.equal(json.status, "ok");
    test.match(json, {
      challenge: /\S+/,
      allowCredentials,
      userVerification: "preferred",
    });
  });

  state.verifyAuthenticationResponseStub.returns({});

  const resultResponse = await postJson(state, "/fido2/assertion/result", {
    id: expectedCredential.credentialID,
  });

  assertJsonResponse(test, resultResponse, (json) => {
    test.equal(json.status, "ok");
    test.match(json, {
      return_to: "/",
    });
  });

  test.ok(state.verifyAuthenticationResponseStub.called);
}

export async function doSignOut(test: Tap.Test, state: IntegrationTestState) {
  const response = await navigatePage(state, "/logout");
  assertRedirectResponse(test, response, "/");
}
