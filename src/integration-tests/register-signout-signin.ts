import { test } from "tap";
import sinon from "sinon";
import request, { Response as SupertestResponse } from "supertest";
import { StatusCodes } from "http-status-codes";
import base64 from "@hexagon/base64";
import crypto from "crypto";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";
import * as simpleWebAuthnServerDefaults from "@simplewebauthn/server";

// test objects

const testUser = {
  username: "bob",
  displayName: "Bob User",
};

const testCredential1 = {
  created: new Date(2023, 1, 1),
  credentialID: base64.fromArrayBuffer(crypto.randomBytes(8).buffer, true),
  credentialPublicKey: base64.fromArrayBuffer(
    crypto.randomBytes(42).buffer,
    true
  ),
  counter: 42,
  aaguid: "AUTH_GUID",
  credentialDeviceType: "singleDevice",
  credentialBackedUp: false,
  transports: ["ble", "usb"],
};

const testValidatedCredential1 = {
  ...testCredential1,
  credentialID: base64.toArrayBuffer(testCredential1.credentialID, true),
  credentialPublicKey: base64.toArrayBuffer(
    testCredential1.credentialPublicKey,
    true
  ),
};

const verifyRegistrationResponseStub = sinon.stub();
const verifyAuthenticationResponseStub = sinon.stub();

// tests

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Register, sign out, sign in", async (t) => {
  const { default: app } = t.mock("../app", {
    "@simplewebauthn/server": {
      ...simpleWebAuthnServerDefaults,
      verifyRegistrationResponse: verifyRegistrationResponseStub,
      verifyAuthenticationResponse: verifyAuthenticationResponseStub,
    },
  });

  let response: SupertestResponse;
  let cookie: any;
  let json: any;

  t.test("Go to home page", async (t) => {
    response = await request(app).get("/");
    cookie = response.headers["set-cookie"];

    t.equal(response.status, StatusCodes.OK);
    t.match(response.headers["content-type"], "text/html");
  });

  t.test("Go to login page", async (t) => {
    response = await request(app).get("/login");
    cookie = response.headers["set-cookie"];

    t.equal(response.status, StatusCodes.OK);
    t.match(response.headers["content-type"], "text/html");
  });

  t.test("Go to register page", async (t) => {
    response = await request(app).get("/register");
    cookie = response.headers["set-cookie"];

    t.equal(response.status, StatusCodes.OK);
    t.match(response.headers["content-type"], "text/html");
  });

  t.test("Register a new account", async (t) => {
    t.test("XHR call to POST /options", async (t) => {
      response = await request(app)
        .post("/fido2/attestation/options")
        .set("content-type", "application/json")
        .accept("application/json")
        .send({
          username: testUser.username,
          displayName: testUser.displayName,
          authenticatorSelection: {
            requireResidentKey: false,
            residentKey: "preferred",
            authenticatorAttachment: "platform",
            userVerification: "preferred",
          },
          attestation: "direct",
        });
      cookie = response.headers["set-cookie"];

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "application/json");
      json = JSON.parse(response.text);
      t.equal(json.status, "ok");
      t.match(json, {
        challenge: /\S+/,
        rp: {
          id: "example.com",
          name: "Twisted Stream Technologies",
        },
        user: {
          id: /\S+/,
          name: testUser.username,
          displayName: testUser.displayName,
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

    t.test("XHR call to POST /result", async (t) => {
      verifyRegistrationResponseStub.returns({
        registrationInfo: { ...testValidatedCredential1 },
      });

      response = await request(app)
        .post("/fido2/attestation/result")
        .set("content-type", "application/json")
        .set("cookie", cookie)
        .accept("application/json")
        .send({
          id: testCredential1.credentialID,
          response: {
            // ignored since we're stubbing verifyRegistrationResponse
          },
        });
      cookie = response.headers["set-cookie"];

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "application/json");
      json = JSON.parse(response.text);
      t.equal(json.status, "ok");
      t.match(json, {
        return_to: "/",
      });

      t.ok(verifyRegistrationResponseStub.called);
    });
  });

  t.test("Sign out", async (t) => {
    response = await request(app).get("/logout");
    cookie = response.headers["set-cookie"];

    t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
    t.equal(response.headers["location"], "/");
  });

  t.test("Sign in", async (t) => {
    t.test("XHR call to POST /options", async (t) => {
      response = await request(app)
        .post("/fido2/assertion/options")
        .set("content-type", "application/json")
        .accept("application/json")
        .send({
          username: testUser.username,
          userVerification: "preferred",
        });
      cookie = response.headers["set-cookie"];

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "application/json");
      json = JSON.parse(response.text);
      t.equal(json.status, "ok");
      t.match(json, {
        challenge: /\S+/,
        allowCredentials: [
          {
            type: "public-key",
            id: testCredential1.credentialID,
          },
        ],
        userVerification: "preferred",
      });
    });

    t.test("XHR call to POST /result", async (t) => {
      verifyAuthenticationResponseStub.returns({});

      response = await request(app)
        .post("/fido2/assertion/result")
        .set("content-type", "application/json")
        .set("cookie", cookie)
        .accept("application/json")
        .send({
          id: testCredential1.credentialID,
        });
      cookie = response.headers["set-cookie"];

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "application/json");
      json = JSON.parse(response.text);
      t.equal(json.status, "ok");
      t.match(json, {
        return_to: "/",
      });

      t.ok(verifyRegistrationResponseStub.called);
    });
  });
});
