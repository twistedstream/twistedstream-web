import { Request, Response, Router } from "express";
import { capturePreAuthState, getRegisterable, signOut } from "../utils/auth";
import {
  companyName,
  githubProfileUrl,
  linkedInProfileUrl,
  twitterProfileUrl,
} from "../utils/config";
import { UnauthorizedError } from "../utils/error";
import fido2 from "./fido2";
import invites from "./invites";
import profile from "./profile";
import shares from "./shares";

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

  const registerable = getRegisterable(req);
  if (!registerable) {
    throw UnauthorizedError("Registration not allowed without an invitation");
  }

  const { source } = registerable;
  res.render("register", {
    title: "Sign up",
    source,
    isInviteSource: source.sourceType === "invite",
    isShareSource: source.sourceType === "share",
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
router.use("/invites", invites);
router.use("/shares", shares);

export default router;
