import "dotenv/config";

// INFO: Exported environment variables

export const port = Number(process.env.PORT);
export const environment = <string>process.env.NODE_ENV;
export const logLevel = <string>process.env.LOG_LEVEL;

// INFO: Package configuration

const packageDir = environment === "production" ? "../" : "../../";
const packagePath = `${packageDir}package.json`;
const packageJson = require(packagePath);

export const packageName = <string>packageJson.name;
export const packageVersion = <string>packageJson.version;
