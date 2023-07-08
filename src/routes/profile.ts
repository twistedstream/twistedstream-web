import { Router, Response } from "express";
import { urlencoded } from "body-parser";

import { BadRequestError } from "../utils/error";
import {
  fetchUserById,
  fetchCredentialsByUserId,
  removeUserCredential,
  updateUser,
} from "../services/user";
import { requiresAuth } from "../utils/auth";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import { RegisteredAuthenticator, User } from "../types/user";
import { ValidationError } from "../types/error";

const router = Router();

// helpers

async function fetchProfile(
  req: AuthenticatedRequest
): Promise<{ user: User; credentials: RegisteredAuthenticator[] }> {
  if (!req.user) {
    throw Error("Request is not authenticated");
  }
  const user = await fetchUserById(req.user.id);
  if (!user) {
    throw BadRequestError(`No such user with ID ${req.user.id}`);
  }

  const credentials = await fetchCredentialsByUserId(req.user.id);

  return {
    user,
    credentials,
  };
}

// endpoints

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const profile = await fetchProfile(req);

    const passkeys = [...profile.credentials].map((c) => ({
      id: c.credentialID,
      type: c.credentialDeviceType,
      created: c.created,
    }));

    const viewProfile = {
      ...profile.user,
      activePasskey: passkeys.find(
        (p) => p.id === req.credential?.credentialID
      ),
      otherPasskeys: passkeys.filter(
        (p) => p.id !== req.credential?.credentialID
      ),
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
      profile.user.displayName = display_name;
      try {
        await updateUser(profile.user);
      } catch (err: any) {
        if (err instanceof ValidationError) {
          throw BadRequestError(err.message);
        }

        throw err;
      }

      return res.redirect("back");
    }

    const { delete_cred } = req.body;
    if (delete_cred) {
      if (req.credential?.credentialID === delete_cred) {
        throw BadRequestError(
          "Cannot delete credential that was used to sign into the current session"
        );
      }

      await removeUserCredential(profile.user.id, delete_cred);

      return res.redirect("back");
    }

    throw BadRequestError("Unsupported profile operation");
  }
);

export default router;
