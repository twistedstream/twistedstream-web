import { Router, Response } from "express";
import { urlencoded } from "body-parser";

import { BadRequestError } from "../utils/error";
import {
  fetchUserById,
  removeUserCredential,
  updateUser,
} from "../services/users";
import { requiresAuth } from "../utils/auth";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import { FullUser } from "../types/user";

const router = Router();

// helpers

async function fetchProfile(req: AuthenticatedRequest): Promise<FullUser> {
  if (!req.user) {
    throw Error("Request is not authenticated");
  }

  const profile = await fetchUserById(req.user.id);
  if (!profile) {
    throw BadRequestError(`No such user with ID ${req.user.id}`);
  }

  return profile;
}

// endpoints

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const profile = await fetchProfile(req);

    const passkeys = [...profile.credentials].map((c) => ({
      id: c.id,
      type: c.attachment,
      created: c.created,
    }));

    const viewProfile = {
      ...profile,
      activePasskey: passkeys.find((p) => p.id === req.credential?.id),
      otherPasskeys: passkeys.filter((p) => p.id !== req.credential?.id),
    };

    res.render("profile", {
      title: "Profile",
      profile: viewProfile,
    });
  }
);

router.post(
  "/",
  requiresAuth(),
  urlencoded({ extended: false }),
  async (
    req: AuthenticatedRequestWithTypedBody<{
      display_name?: string;
      update?: string;
      delete_cred?: string;
    }>,
    res: Response
  ) => {
    const profile = await fetchProfile(req);

    const { update, display_name } = req.body;
    if (update === "profile" && display_name) {
      // update user profile
      profile.displayName = display_name;
      await updateUser(profile);

      return res.redirect("back");
    }

    const { delete_cred } = req.body;
    if (delete_cred) {
      if (req.credential?.id === delete_cred) {
        throw BadRequestError(
          "Cannot delete credential that was used to sign into the current session"
        );
      }

      await removeUserCredential(profile.id, delete_cred);

      return res.redirect("back");
    }

    throw BadRequestError("Unsupported profile operation");
  }
);

export default router;