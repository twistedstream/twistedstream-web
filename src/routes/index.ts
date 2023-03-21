import { Router, Request, Response } from "express";
import {
  companyName,
  linkedInProfileUrl,
  twitterProfileUrl,
  githubProfileUrl,
} from "../utils/config";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.render("home", {
    title: companyName,
    poweredBys: [
      { name: "Node.js", url: "https://nodejs.org/" },
      { name: "TypeScript", url: "https://www.typescriptlang.org/" },
      {
        name: "Docker on Synology DSM",
        url: "https://www.synology.com/en-us/dsm/feature/docker",
      },
      {
        name: "this GitHub project",
        url: "https://github.com/twistedstream/twistedstream-web",
      },
    ],
  });
});

router.get("/linkedin", (_req: Request, res: Response) => {
  res.redirect(linkedInProfileUrl);
});

router.get("/twitter", (_req: Request, res: Response) => {
  res.redirect(twitterProfileUrl);
});

router.get("/github", (_req: Request, res: Response) => {
  res.redirect(githubProfileUrl);
});

export default router;
