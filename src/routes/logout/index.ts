import { Router } from "express";
import { LogoutToken } from "../../db";
import parseToken from "../../middlewares/parse-token";

const router = Router();

router.post('/', parseToken(true), async function logout(req, res, next) {
    try {
        await LogoutToken.create({ token: req.cookies.auth_token });
        return res.clearCookie('auth_token')
            .json({ message: "Logout successful" });
    } catch (error) {
        return next(error);
    }
});

export default router;