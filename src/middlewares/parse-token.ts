import { RequestHandler } from "express";
import { TokenExpiredError, verify } from "jsonwebtoken";
import { ZodError, z } from "zod";
import { JWT_SECRET } from "../config";
import { LogoutToken } from "../db";
import httpError from "http-errors";

export interface AuthToken {
    user_id: string,
    exp: number,
}

const Bearer = z.object({
    auth_token: z.string().min(1),
});

function parseToken(required: boolean): RequestHandler {
    return async function parseToken(req, _, next) {
        try {
            const bearer = Bearer.parse(req.cookies);
            const existingToken = await LogoutToken.countDocuments({ token: bearer.auth_token });
            if (existingToken > 0) {
                throw httpError.Unauthorized();
            }
            const token = verify(bearer.auth_token, JWT_SECRET);
            (req as any).user = token;
            return next();
        } catch (error) {
            const isAuthError = error instanceof TokenExpiredError
                || error instanceof ZodError
                || error instanceof httpError.Unauthorized;

            if (isAuthError) {
                if (!required) return next();

                return next(httpError.Unauthorized());
            }

            return next(error);
        }
    }
}

export default parseToken;