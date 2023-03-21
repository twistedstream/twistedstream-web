import { Router, Request, Response } from "express";
import { companyName, linkedInProfileUrl } from "../utils/config";

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

export default router;
