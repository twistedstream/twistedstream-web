import {
  GoogleAuth,
  JSONClient,
} from "google-auth-library/build/src/auth/googleauth";
import { google } from "googleapis";

import {
  googleAuthClientEmail as client_email,
  googleAuthPrivateKey as private_key,
} from "../config";

export function buildAuth(scopes: string[]): GoogleAuth<JSONClient> {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes,
  });
}
