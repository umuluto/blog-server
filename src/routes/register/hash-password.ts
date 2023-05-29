import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const asyncScrypt = promisify(scrypt);
const asyncRandomBytes = promisify(randomBytes);

async function hashPassword(password: string) {
    const salt = await asyncRandomBytes(16);
    const hash = await asyncScrypt(password, salt, 64) as Buffer;

    return { salt, hash };
}

export default hashPassword;