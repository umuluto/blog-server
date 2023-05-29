import { Router } from "express";
import parseToken, { AuthToken } from "../../middlewares/parse-token";
import createError from "http-errors";
import { Post, User } from "../../db";
import { z } from "zod";

const router = Router();

router.post('/', parseToken(true), async function addFavorite(req, res, next) {
    try {
        const post_id = req.body.post_id;
        if (typeof post_id !== 'string') {
            throw createError.BadRequest();
        }

        const post = await Post.findById(post_id, { likes: 1 }).exec();
        if (!post) {
            throw createError.NotFound();
        }

        const auth = (req as any).user as AuthToken;
        const user = await User.findById(auth.user_id, { favorites: 1 }).exec();

        if (user?.favorites.find(p => p._id.equals(post_id))) {
            throw createError.Conflict();
        }

        user?.favorites.push(post_id);
        post.$inc('likes');

        await Promise.all([user?.save(), post.save()]);
        return res.json({});
    } catch (error) {
        return next(error);
    }
});

router.delete('/:post_id', parseToken(true), async function removeFavorite(req, res, next) {
    try {
        const post_id = req.params.post_id;
        const post = await Post.findById(post_id, { likes: 1 }).exec();

        const auth = (req as any).user as AuthToken;
        const user = await User.findById(auth.user_id, { favorites: 1 }).exec();

        if (!user?.favorites.find(p => p._id.equals(post_id))) {
            throw createError.Conflict();
        }

        user?.favorites.pull(post_id);
        post?.$inc('likes', -1);

        await Promise.all([user?.save(), post?.save()]);
        return res.json({});
    } catch (error) {
        return next(error);
    }
});

const OffsetLimit = z.object({
    offset: z.coerce.number().min(0).default(0),
    limit: z.coerce.number().min(0).default(5)
});

router.get('/', parseToken(true), async function listFavorites(req, res, next) {
    try {
        const { offset, limit } = OffsetLimit.parse(req.query);

        const auth = (req as any).user as AuthToken;
        const user = await User.findById(auth.user_id, { favorites: 1 }).lean().exec();
        const favorites = await Post.find({ _id: { $in: user.favorites } }, { content: 0 })
            .sort('-createdAt')
            .skip(offset)
            .limit(limit)
            .lean().exec();

        const posts = favorites.map(p => ({ ...p, liked: true }));

        return res.json({ total_count: user.favorites.length, posts });
    } catch (error) {
        return next(error);
    }
});

export default router;