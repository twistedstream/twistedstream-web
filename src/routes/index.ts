import { Request, Response, Router } from "express";
import { capturePreAuthState, signOut } from "../utils/auth";
import {
  companyName,
  githubProfileUrl,
  linkedInProfileUrl,
  twitterProfileUrl,
} from "../utils/config";
import fido2 from "./fido2";
import profile from "./profile";

const router = Router();

// endpoints

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

router.get("/register", (req: Request, res: Response) => {
  capturePreAuthState(req);

  res.render("register", {
    title: "Sign up",
    return_to: req.query.return_to,
  });
});

router.get("/login", (req: Request, res: Response) => {
  capturePreAuthState(req);

  res.render("login", {
    title: "Sign in",
    return_to: req.query.return_to,
  });
});

router.get("/logout", (req: Request, res: Response) => {
  signOut(req);

  res.redirect("/");
});

// child routes

router.use("/fido2", fido2);
router.use("/profile", profile);

export default router;
