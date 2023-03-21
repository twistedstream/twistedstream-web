import "dotenv/config";

// INFO: Constants

export const companyName = "Twisted Stream Technologies";

// INFO: Exported environment variables

export const port = Number(process.env.PORT);
export const environment = <string>process.env.NODE_ENV;
export const logLevel = <string>process.env.LOG_LEVEL;

export const linkedInProfileUrl = <string>process.env.LINKED_IN_PROFILE_URL;
export const twitterProfileUrl = <string>process.env.TWITTER_PROFILE_URL;
export const githubProfileUrl = <string>process.env.GITHUB_PROFILE_URL;

// INFO: Package configuration

/* istanbul ignore next */
const packageDir = environment === "production" ? "../" : "../../";
const packagePath = `${packageDir}package.json`;
const packageJson = require(packagePath);

export const packageName = <string>packageJson.name;
export const packageVersion = <string>packageJson.version;
