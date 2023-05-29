import { Router } from "express";
import { z } from "zod";

import { User } from "../../db";
import hashPassword from "./hash-password";

const Credentials = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    fullname: z.string().min(1, "Full name is required"),
});

const router = Router();

router.post('/', async function register(req, res, next) {
    try {
        const credentials = Credentials.parse(req.body);

        const existingUser = await User.countDocuments({ username: credentials.username }).exec();

        if (existingUser > 0) {
            return res.status(409).json({ message: "Username taken" });
        }

        const { hash, salt } = await hashPassword(credentials.password);
        await User.create({ username: credentials.username, fullname: credentials.fullname, password: { hash, salt } });
        return res.json({ message: "Register successful" });
    } catch (error) {
        return next(error);
    }
});

export default router;