import "dotenv/config";
import { Duration } from "luxon";

// INFO: Constants

export const companyName = "Twisted Stream Technologies";

// INFO: Exported environment variables

export const port = Number(process.env.PORT);
export const environment = <string>process.env.NODE_ENV;
export const logLevel = <string>process.env.LOG_LEVEL;
export const rpID = <string>process.env.RP_ID;
export const baseUrl = <string>process.env.BASE_URL;
export const linkedInProfileUrl = <string>process.env.LINKED_IN_PROFILE_URL;
export const twitterProfileUrl = <string>process.env.TWITTER_PROFILE_URL;
export const githubProfileUrl = <string>process.env.GITHUB_PROFILE_URL;
export const cookieSecret = <string>process.env.COOKIE_SECRET;
export const csrfSecret = <string>process.env.CSRF_SECRET;

export const googleSpreadsheetId = <string>process.env.GOOGLE_SPREADSHEET_ID;
export const googleAuthClientEmail = <string>(
  process.env.GOOGLE_AUTH_CLIENT_EMAIL
);
export const googleAuthPrivateKey =
  <string>process.env.GOOGLE_AUTH_PRIVATE_KEY ??
  Buffer.from(
    <string>process.env.GOOGLE_AUTH_PRIVATE_KEY_BASE64,
    "base64"
  ).toString("utf-8");

export const dataProviderName = <string>process.env.DATA_PROVIDER_NAME;
export const fileProviderName = <string>process.env.FILE_PROVIDER_NAME;
export const maxInviteLifetime = Duration.fromISO(
  <string>process.env.MAX_INVITE_LIFETIME
);
export const maxShareLifetime = Duration.fromISO(
  <string>process.env.MAX_SHARE_LIFETIME
);

// INFO: Package configuration

/* istanbul ignore next */
const packageDir = environment === "production" ? "../" : "../../";
const packagePath = `${packageDir}package.json`;
const packageJson = require(packagePath);

export const packageName = <string>packageJson.name;
export const packageVersion = <string>packageJson.version;
