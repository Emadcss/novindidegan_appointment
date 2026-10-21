import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * هش رمز با scrypt (داخل Node، بدون پکیج اضافه).
 * قالب ذخیره: scrypt$N$r$p$salt$hash
 */
const PARAMS = { N: 16_384, r: 8, p: 1, keyLength: 64 };

function derive(
    password: string,
    salt: Buffer,
    params: { N: number; r: number; p: number; keyLength: number },
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(
            password,
            salt,
            params.keyLength,
            { N: params.N, r: params.r, p: params.p },
            (error, key) => (error ? reject(error) : resolve(key)),
        );
    });
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt, PARAMS);

    return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("hex"), key.toString("hex")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const [, n, r, p, saltHex, keyHex] = parts;
    const expected = Buffer.from(keyHex, "hex");

    try {
        const actual = await derive(password, Buffer.from(saltHex, "hex"), {
            N: Number(n),
            r: Number(r),
            p: Number(p),
            keyLength: expected.length,
        });

        return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

/** پیام خطا (فارسی) یا null اگر رمز قابل قبول است */
export function validatePassword(password: string): string | null {
    if (password.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
    if (password.length > 128) return "رمز عبور بیش از حد طولانی است";
    if (/^(.)\1+$/.test(password)) return "رمز عبور نباید تکرار یک کاراکتر باشد";
    if (!/\d/.test(password) || !/\D/.test(password)) {
        return "رمز عبور باید هم عدد و هم حرف داشته باشد";
    }
    return null;
}