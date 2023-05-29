import cookieParser from "cookie-parser";
import express, { ErrorRequestHandler, json } from "express";
import { set } from "mongoose";
import path from "node:path";
import { ZodError } from "zod";

import { BS_PORT } from "./config";
import { redis } from "./db/redis";
import categoriesRouter from "./routes/categories";
import favoritesRouter from "./routes/favorites";
import loginRouter from "./routes/login";
import logoutRouter from "./routes/logout";
import pingRouter from "./routes/ping";
import postsRouter from "./routes/posts";
import registerRouter from "./routes/register";

const app = express();

app.use(json());
app.use(cookieParser());
app.use('/public', express.static(path.resolve(__dirname, '../public')));

app.use('/api/categories', categoriesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/login', loginRouter);
app.use('/api/logout', logoutRouter);
app.use('/api/ping', pingRouter);
app.use('/api/posts', postsRouter);
app.use('/api/register', registerRouter);

const handleError: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err)
    }

    if (err instanceof ZodError) {
        return res.status(400).json(err);
    }

    return next(err);
};

app.use(handleError);
set('debug', true);

async function main() {
    await redis.connect();
    app.listen(BS_PORT);
}

main();