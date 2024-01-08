import { Router } from "express";

import routes from "./routes";

const router = Router();

// Configure routes
router.use(routes);

export default router;
