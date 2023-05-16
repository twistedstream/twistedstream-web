import { Router } from "express";

import assertion from "./assertion";
import attestation from "./attestation";

const router = Router();

router.use("/assertion", assertion);
router.use("/attestation", attestation);

export default router;
