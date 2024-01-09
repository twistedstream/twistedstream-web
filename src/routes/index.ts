import { Request, Response, Router } from "express";
import {
  blogUrl,
  companyName,
  githubProfileUrl,
  linkedInProfileUrl,
  shareUrl,
  twitterProfileUrl,
} from "../utils/config";

const router = Router();

// endpoints

router.get("/", (_req: Request, res: Response) => {
  res.render("home", {
    title: companyName,
    links: [
      ...(linkedInProfileUrl
        ? [{ name: "LinkedIn", local_url: "/linkedin" }]
        : []),
      ...(twitterProfileUrl
        ? [{ name: "Twitter (X)", local_url: "/twitter" }]
        : []),
      ...(githubProfileUrl ? [{ name: "GitHub", local_url: "/github" }] : []),
      ...(blogUrl ? [{ name: "Blog", local_url: "/blog" }] : []),
      ...(shareUrl ? [{ name: "Share", local_url: "/share" }] : []),
    ],
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

router.get("/blog", (_req: Request, res: Response) => {
  res.redirect(blogUrl);
});

router.get("/share", (_req: Request, res: Response) => {
  res.redirect(shareUrl);
});

export default router;
