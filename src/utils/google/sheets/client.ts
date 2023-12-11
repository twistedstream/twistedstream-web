import { google } from "googleapis";
import { buildAuth } from "../auth";

export const sheets = google.sheets({
  version: "v4",
  auth: buildAuth(["https://www.googleapis.com/auth/spreadsheets"]),
});
