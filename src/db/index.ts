import { createConnection } from "mongoose";

import { BS_DB } from "../config";
import { redis } from "./redis";
import { Post, categorySchema, logoutTokenSchema, postSchema, userSchema, type User } from "./schemas";

const conn = createConnection(BS_DB);

// postSchema.post('save', async (doc, next) => {
//     const cache = await redis.get(doc.id);
//     if (cache === null) {
//         return next();
//     }

//     const cacheObj = JSON.parse(cache);
//     const payload = { ...cacheObj, ...doc.toObject() };
//     await redis.set(doc.id, JSON.stringify(payload));
//     next();
// });

const User = conn.model('User', userSchema);
const Post = conn.model('Post', postSchema);
const Category = conn.model('Category', categorySchema);
const LogoutToken = conn.model('LogoutToken', logoutTokenSchema);

export { Category, LogoutToken, Post, User, conn };

