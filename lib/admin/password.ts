
import {
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const derivedKey = (await scrypt(
        password,
        salt,
        KEY_LENGTH,
    )) as Buffer;

    return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {
    const [algorithm, saltHex, keyHex, ...extra] = storedHash.split(":");

    if (
        algorithm !== "scrypt" ||
        !saltHex ||
        !keyHex ||
        extra.length > 0 ||
        !/^[a-f0-9]{32}$/i.test(saltHex) ||
        !/^[a-f0-9]{128}$/i.test(keyHex)
    ) {
        return false;
    }

    try {
        const salt = Buffer.from(saltHex, "hex");
        const expectedKey = Buffer.from(keyHex, "hex");

        const actualKey = (await scrypt(
            password,
            salt,
            KEY_LENGTH,
        )) as Buffer;

        return (
            expectedKey.length === actualKey.length &&
            timingSafeEqual(expectedKey, actualKey)
        );
    } catch {
        return false;
    }
}
