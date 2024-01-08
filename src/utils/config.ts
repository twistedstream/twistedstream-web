import "dotenv/config";

// Constants

export const companyName = "Twisted Stream Technologies";

// Exported environment variables

export const port = Number(process.env.PORT);
export const environment = <string>process.env.NODE_ENV;
export const logLevel = <string>process.env.LOG_LEVEL;
export const baseUrl = <string>process.env.BASE_URL;
export const linkedInProfileUrl = <string>process.env.LINKED_IN_PROFILE_URL;
export const twitterProfileUrl = <string>process.env.TWITTER_PROFILE_URL;
export const githubProfileUrl = <string>process.env.GITHUB_PROFILE_URL;
export const blogUrl = <string>process.env.BLOG_URL;

// Package configuration

/* c8 ignore start */
const packageDir = environment === "production" ? "../" : "../../";
/* c8 ignore stop */
const packagePath = `${packageDir}package.json`;
const packageJson = require(packagePath);

export const packageName = <string>packageJson.name;
export const packageVersion = <string>packageJson.version;
