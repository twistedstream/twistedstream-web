import { urlencoded } from "body-parser";
import { Response, Router } from "express";

import {
  fetchCredentialsByUserId,
  removeUserCredential,
  updateUser,
} from "../services/user";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import { requiresAuth } from "../utils/auth";
import { BadRequestError, assertValue } from "../utils/error";

const router = Router();

// endpoints

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = assertValue(req.user);
    const credential = assertValue(req.credential);

    const credentials = await fetchCredentialsByUserId(user.id);
    const passkeys = [...credentials].map((c) => ({
      id: c.credentialID,
      type: c.credentialDeviceType,
      created: c.created,
    }));

    const viewProfile = {
      ...req.user,
      activePasskey: passkeys.find((p) => p.id === credential.credentialID),
      otherPasskeys: passkeys.filter((p) => p.id !== credential.credentialID),
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
    const user = assertValue(req.user);
    const credential = assertValue(req.credential);

    const { update, display_name } = req.body;
    if (update === "profile" && display_name) {
      // update user profile
      user.displayName = display_name;
      try {
        await updateUser(user);
      } catch (err: any) {
        if (err.type === "validation") {
          throw BadRequestError(err.message);
        }

        throw err;
      }

      return res.redirect("back");
    }

    const { delete_cred } = req.body;
    if (delete_cred) {
      if (credential.credentialID === delete_cred) {
        throw BadRequestError(
          "Cannot delete credential that was used to sign into the current session"
        );
      }

      await removeUserCredential(user.id, delete_cred);

      return res.redirect("back");
    }

    throw BadRequestError("Unsupported profile operation");
  }
);

export default router;
