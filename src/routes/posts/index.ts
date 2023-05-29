import { Router } from "express";
import { HydratedDocument, Types } from "mongoose";
import { z } from "zod";
import { resolve } from "node:path";
import { unlink } from "node:fs/promises";
import multer from "multer";

import { Category, Post, User } from "../../db";
import parseToken, { AuthToken } from "../../middlewares/parse-token";
import storePicture from "./store-picture";
import { redis } from "../../db/redis";
import httpError from "http-errors";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

const CreateBody = z.object({
    title: z.string(),
    content: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
});

router.post('/', parseToken(true), upload.single('picture'), async function createPost(req, res, next) {
    try {
        const body = CreateBody.parse(req.body);

        const category$ = Category.findById(body.category).lean().exec();
        const createdBy$ = User.findById((req as any).user.user_id, { fullname: 1 }).lean().exec();
        const picture$ = req.file ? storePicture(req.file) : undefined;

        const [picture, category, createdBy] = await Promise.all([picture$, category$, createdBy$]);
        await Post.create({
            title: body.title,
            content: body.content,
            description: body.description,
            picture,
            category,
            createdBy,
        });

        return res.json({ message: "Post created" });
    } catch (error) {
        return next(error);
    }
});

router.post('/:post_id', parseToken(true), upload.single('picture'), async function updatePost(req, res, next) {
    try {
        const body = CreateBody.partial().parse(req.body);

        const post = await Post.findById(req.params.post_id, { createdBy: 1, picture: 1 }).exec();
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.createdBy._id != (req as any).user.user_id) {
            return res.status(403).json({ message: "Only author can edit post" });
        }

        if (body.category) {
            const category = await Category.findById(body.category).exec();
            if (!category) {
                return res.status(400).json({ message: "Category not found" });
            }

            post.category = category;
        }

        if (req.file) {
            if (post.picture) {
                await unlink(resolve(__dirname, '../../../', post.picture));
            }
            post.picture = await storePicture(req.file);
        }

        if (body.title) post.title = body.title;
        if (body.content) post.content = body.content;
        if (body.description) post.description = body.description;
        await post.save();

        return res.json({ message: "Post updated" });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:post_id', parseToken(true), async function deletePost(req, res, next) {
    try {
        const post = await Post.findById(req.params.post_id, { createdBy: 1, picture: 1 }).exec();

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if ((req as any).user.user_id != post.createdBy._id) {
            return res.status(403).json({ message: "Only author can delete post" });
        }

        await post.deleteOne();
        if (post.picture) {
            await unlink(resolve(__dirname, '../../../', post.picture));
        }

        return res.json({ message: "Post deleted" });
    } catch (error) {
        return next(error);
    }
});

const ListQuery = z.object({
    offset: z.coerce.number().min(0).default(0),
    limit: z.coerce.number().min(0).default(5),
    category: z.string().optional(),
});

router.get('/', parseToken(false), async function listPosts(req, res, next) {
    try {
        const queryParam = ListQuery.parse(req.query);
        const auth = (req as any).user as AuthToken | undefined;

        const filter = queryParam.category ? { 'category._id': queryParam.category } : {};

        const favorites$ = auth
            ? User.findById(auth.user_id, { favorites: 1 }).lean().exec().then(p => p.favorites)
            : [];

        const [total_count, posts, favorites] = await Promise.all([
            Post.countDocuments(filter).exec(),
            Post.find(filter)
                .select('-content')
                .sort('-createdAt')
                .skip(queryParam.offset)
                .limit(queryParam.limit).lean().exec(),
            favorites$
        ]);

        const postsWithLiked = posts.map(post => {
            return {
                ...post,
                liked: !!favorites.find(p => p._id.equals(post._id))
            }
        });

        return res.json({ total_count, posts: postsWithLiked });
    } catch (error) {
        return next(error);
    }
});

router.get('/my-posts', parseToken(true), async function myPosts(req, res, next) {
    try {
        const queryParam = ListQuery.parse(req.query);
        const auth = (req as any).user as AuthToken;

        const favorites$ = User.findById(auth.user_id, { favorites: 1 }).lean().exec().then(p => p.favorites)

        const filter = { 'createdBy._id': (req as any).user.user_id };

        const [total_count, posts, favorites] = await Promise.all([
            Post.countDocuments(filter).exec(),
            Post.find(filter)
                .select('-content')
                .sort('-createdAt')
                .skip(queryParam.offset)
                .limit(queryParam.limit).lean().exec(),
            favorites$,
        ]);

        const postsWithLiked = posts.map(post => {
            return {
                ...post,
                liked: !!favorites.find(p => p._id.equals(post._id))
            }
        });

        return res.json({ total_count, posts: postsWithLiked });
    } catch (error) {
        return next(error);
    }
});

function fetchPost(post_id: string) {
    return Post.findById(post_id).exec();
}

router.get('/:post_id', parseToken(false), async function readPost(req, res, next) {
    try {
        const auth = (req as any).user as AuthToken | undefined;

        const cache = await redis.get(req.params.post_id)
            .then(c => c === null ? c : Post.hydrate(JSON.parse(c)));

        const post$ = cache || fetchPost(req.params.post_id);

        const liked$ = auth !== undefined
            && User.exists({ _id: auth.user_id, favorites: req.params.post_id });

        const [post, liked] = await Promise.all([post$, liked$]);

        if (!post) {
            throw httpError.NotFound();
        }

        post.$inc('views');
        res.json({ ...post.toObject(), liked });

        await redis.set(req.params.post_id, JSON.stringify(post), { EX: 3600 });
        return await post.save();
    } catch (error) {
        return next(error);
    }
});

export default router;