import { InferSchemaType, Schema, Types } from "mongoose";

interface User {
    fullname: string;
    username: string;
    password: {
        hash: Buffer;
        salt: Buffer;
    };
    favorites: Types.Array<Types.ObjectId>;
}

const userSchema = new Schema<User>({
    fullname: { type: String, required: true, },
    username: { type: String, required: true },
    password: {
        _id: false,
        type: {
            hash: { type: Buffer, required: true, },
            salt: { type: Buffer, required: true, },
        },
        required: true,
    },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
});

const categorySchema = new Schema({
    name: { type: String, required: true },
});

const _userNameSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fullname: { type: String, required: true },
});

const postSchema = new Schema({
    title: { type: String, required: true },
    description: String,
    picture: String,
    content: { type: String, required: true },
    createdBy: { type: _userNameSchema, ref: 'User', required: true },
    likes: {
        type: Number,
        default: 0,
    },
    views: {
        type: Number,
        default: 0,
    },
    category: {
        type: {
            _id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
            name: { type: String, required: true },
        },
        ref: 'Category',
    }
}, { timestamps: true });

const logoutTokenSchema = new Schema({
    token: { type: String, required: true },
    createdAt: { type: Date, expires: 3600, default: Date.now }
});

type Post = InferSchemaType<typeof postSchema>;
type Category = InferSchemaType<typeof categorySchema>;
type LogoutToken = InferSchemaType<typeof logoutTokenSchema>;

export { userSchema, categorySchema, postSchema, logoutTokenSchema, User, Post, Category, LogoutToken };