import { Router } from "express";

import { Category } from "../../db";

const router = Router();

router.get('/', async function listCategories(_, res, next) {
    try {
        const categories = await Category.find().lean().exec();
        return res.json(categories);
    } catch (error) {
        return next(error);
    }
});

export default router;