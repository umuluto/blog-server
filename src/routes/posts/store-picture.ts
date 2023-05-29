import { Types } from "mongoose";
import { extname, resolve } from "node:path";
import sharp from "sharp";

const SZ = 220;

export default async function storePicture(file: Express.Multer.File) {
    const imgUrl = 'public/user/images/' + new Types.ObjectId() + extname(file.originalname);
    const filename = resolve(__dirname, '../../..', imgUrl);

    const s = sharp(file.buffer);
    const metadata = await s.metadata();

    await s.extract(centerBox(metadata.width, metadata.height))
        .toFile(filename);

    return imgUrl;
}

function centerBox(width?: number, height?: number) {
    const top = height ? Math.floor((height - SZ) / 2) : 0;
    const left = width ? Math.floor((width - SZ) / 2) : 0;
    return { width: SZ, height: SZ, top, left };
}