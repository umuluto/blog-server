import { scrypt } from "node:crypto";
import { promisify } from "node:util";

const asyncScrypt = promisify(scrypt);

interface HashedPassword {
    hash: any,
    salt: any,
}

async function checkPassword(password: string, existingPassword: HashedPassword) {
    const { hash, salt } = {
        hash: Buffer.from(existingPassword.hash),
        salt: Buffer.from(existingPassword.salt),
    };

    const hashedPassword = await asyncScrypt(password, salt, hash.length) as Buffer;
    return Buffer.compare(hashedPassword, hash) === 0;
}

export default checkPassword;