import express, { Express } from "express";
import { engine } from "express-handlebars";
import pinoHttp from "pino-http";

import { DateTime } from "luxon";
import errorHandler from "./error-handler";
import { companyName, packageVersion } from "./utils/config";
import { logger } from "./utils/logger";
import website from "./website";

const app: Express = express();

// App-level middleware
app.use(pinoHttp({ logger }));

app.use(express.static("public"));

app.set("view engine", "handlebars");
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      company: () => companyName,
      year: () => DateTime.now().year,
      version: () => packageVersion,
    },
  })
);

// Configure website
app.use(website);

// Configure error handling
errorHandler(app);

export default app;
