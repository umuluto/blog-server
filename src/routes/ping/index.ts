import { Router } from "express";

import parseToken from "../../middlewares/parse-token";

const router = Router();

router.get('/', parseToken(true), function ping(req, res) {
    return res.json((req as any).user);
});

export default router;