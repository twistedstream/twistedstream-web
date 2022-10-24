import express, { Express } from "express";
import expressPino from "express-pino-logger";
import { engine } from "express-handlebars";

import { packageVersion, companyName } from "./utils/config";
import { logger } from "./utils/logger";
import website from "./website";
import errorHandler from "./error-handler";

const app: Express = express();

// INFO: App-level middleware
app.use(expressPino({ logger }));

app.use(express.static("public"));

app.set("view engine", "handlebars");
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      company: () => companyName,
      year: () => new Date().getFullYear(),
      version: () => packageVersion,
    },
  })
);

// INFO: Configure website
app.use(website);

// INFO: Configure error handling
errorHandler(app);

export default app;
