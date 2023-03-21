import { Router } from "express";

import routes from "./routes";

const router = Router();

// INFO: Configure routes
router.use(routes);

// FUTURE: Session and authentication configuration lives here

export default router;
