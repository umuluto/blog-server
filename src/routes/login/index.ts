import { Router } from "express";
import { sign } from "jsonwebtoken";
import { z } from "zod";

import { JWT_SECRET, JWT_TTL } from "../../config";
import { User } from "../../db";
import checkPassword from "./check-password";

const Credentials = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
})

const router = Router();

router.post('/', async function login(req, res, next) {
    try {
        const credentials = Credentials.parse(req.body);

        const user = await User.findOne({ username: credentials.username }).select('password').lean().exec();
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const valid = await checkPassword(credentials.password, user.password);
        if (!valid) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const exp = Math.floor((Date.now() + JWT_TTL * 1000) / 1000);
        const payload = { user_id: user._id, exp };
        const token = sign(payload, JWT_SECRET);
        return res.cookie('auth_token', token)
            .json(payload);
    } catch (error) {
        return next(error);
    }
});

export default router;