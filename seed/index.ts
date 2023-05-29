import { faker } from "@faker-js/faker";
import { connect, disconnect, Types } from "mongoose";
import fs from "node:fs/promises";
import path from "node:path";

import { BS_DB } from "../src/config";
import { Category, Post, User } from "../src/db";
import hashPassword from "../src/routes/register/hash-password";

const imgDir = "public/user/images/";

interface Category {
    _id: Types.ObjectId,
    name: string,
}

const categories: Category[] = [];
function getCategory(name: string): Category {
    const existing = categories.find(cat => cat.name === name);
    if (existing) {
        return existing;
    }

    const cat = { _id: new Types.ObjectId(), name };
    categories.push(cat);
    return cat;
}

function createCredentials() {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();

    return {
        _id: new Types.ObjectId(),
        username: faker.internet.userName(firstName, lastName),
        password: faker.internet.password(8, true),
        fullname: faker.name.fullName({ firstName, lastName }),
        favorites: [] as Types.ObjectId[],
    };
}

async function createPost() {
    const res = await downloadImg();
    const category = res && getCategory(res.category); 

    return {
        _id: new Types.ObjectId(),
        picture: res?.url,
        title: faker.lorem.sentence(5),
        description: faker.lorem.paragraph(3),
        content: faker.lorem.paragraphs(10),
        likes: 0,
        createdAt: faker.date.recent(365 * 2),
        category,
    };
}

async function downloadImg() {
    const randomImg = faker.image.image(220, 220, true);

    const res = await fetch(randomImg);
    if (res.ok) {
        const imgUrl = imgDir + faker.database.mongodbObjectId() + path.extname(res.url);
        const imgPath = path.resolve(__dirname, '..', imgUrl);

        const data = await res.arrayBuffer();
        await fs.writeFile(imgPath, Buffer.from(data));
        return {
            category: path.basename(randomImg.split("?")[0]),
            url: imgUrl,
        };
    }

    return undefined;
}

async function cleanUp() {
    const dir = path.resolve(__dirname, '..', 'public/user/images');
    const files = await fs.readdir(dir);
    const rmFiles$ = files.map(async file => await fs.unlink(path.join(dir, file)));

    await Promise.all([
        User.collection.drop(),
        Post.collection.drop(),
        Category.collection.drop(),
        ...rmFiles$
    ]);
}

async function main() {
    await connect(BS_DB);
    await cleanUp();

    const credentials = Array.from(Array(10), createCredentials);
    await fs.writeFile('credentials.json', JSON.stringify(credentials, null, 2));

    const users$ = credentials.map(async cred => {
        const hashed = { ...cred, password: await hashPassword(cred.password) };
        return hashed;
    });

    const postsByUsers$$ = users$.map(async user$ => {
        const user = await user$;
        const createdBy = {
            _id: user._id,
            fullname: user.fullname,
        };

        return Array.from(Array(10), async () => {
            const post = await createPost();
            return { ...post, createdBy };
        });
    });

    const postsByUsers$ = await Promise.all(postsByUsers$$);
    const posts = await Promise.all(postsByUsers$.flat());
    const users = await Promise.all(users$);

    for (const user of users) {
        const postsToLike = faker.helpers.arrayElements(posts);
        user.favorites = postsToLike.map(p => p._id);
        postsToLike.forEach(p => ++p.likes);
    }

    try {
        await Promise.all([User.create(users), Post.create(posts), Category.create(categories)]);
    } catch (error) {
        await cleanUp();
        console.log("Failed to seed", error);
    }

    await disconnect();
}

main();
