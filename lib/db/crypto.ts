import {
    createCipheriv,
    createDecipheriv,
    createHmac,
    hkdfSync,
    randomBytes,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * محافظت از هویت بیمار (کد ملی و موبایل) در دیتابیس:
 * - hash (HMAC-SHA256): برای جستجو و یکتایی؛ قابل برگرداندن به عدد اصلی نیست
 * - رمزنگاری (AES-256-GCM): برای نمایش در پنل ادمین
 *
 * کلید اصلی: متغیر محیطی KIOSK_DATA_KEY (۶۴ کاراکتر هگز)، وگرنه فایل storage/secret.key
 * که در اولین اجرا خودکار ساخته می‌شود.
 * ⚠ بدون این کلید، بیماران قابل جستجو و رمزگشایی نیستند؛ آن را جدا از دیتابیس پشتیبان بگیرید.
 */

export type IdentifierKind = "nid" | "mob";

const globalForKey = globalThis as unknown as {
    __kioskSubKeys?: { hash: Buffer; enc: Buffer };
};

export function getStorageDir(): string {
    return process.env.KIOSK_STORAGE_DIR ?? path.join(process.cwd(), "storage");
}

function parseKey(hex: string, source: string): Buffer {
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error(`${source} باید دقیقاً ۶۴ کاراکتر هگزادسیمال (۳۲ بایت) باشد`);
    }

    return Buffer.from(hex, "hex");
}

function loadMasterKey(): Buffer {
    const fromEnv = process.env.KIOSK_DATA_KEY?.trim();

    if (fromEnv) {
        return parseKey(fromEnv, "KIOSK_DATA_KEY");
    }

    const file = path.join(getStorageDir(), "secret.key");

    if (fs.existsSync(file)) {
        return parseKey(fs.readFileSync(file, "utf8").trim(), file);
    }

    fs.mkdirSync(path.dirname(file), { recursive: true });
    const key = randomBytes(32);

    try {
        fs.writeFileSync(file, key.toString("hex"), { mode: 0o600, flag: "wx" });
        return key;
    } catch {
        // پروسه‌ی دیگری هم‌زمان فایل را ساخته است؛ همان را می‌خوانیم
        return parseKey(fs.readFileSync(file, "utf8").trim(), file);
    }
}

function getSubKeys(): { hash: Buffer; enc: Buffer } {
    if (!globalForKey.__kioskSubKeys) {
        const master = loadMasterKey();
        const derive = (label: string) =>
            Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), label, 32));

        globalForKey.__kioskSubKeys = {
            hash: derive("kiosk-identifier-hash"),
            enc: derive("kiosk-identifier-encryption"),
        };
    }

    return globalForKey.__kioskSubKeys;
}

/** برای تست: کلید ذخیره‌شده را فراموش می‌کند */
export function resetKeyCacheForTests(): void {
    globalForKey.__kioskSubKeys = undefined;
}

export function hashIdentifier(kind: IdentifierKind, value: string): string {
    return createHmac("sha256", getSubKeys().hash)
        .update(`${kind}:${value}`)
        .digest("hex");
}

export function encryptText(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getSubKeys().enc, iv);
    const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

export function decryptText(payload: string): string {
    const buffer = Buffer.from(payload, "base64");
    const decipher = createDecipheriv(
        "aes-256-gcm",
        getSubKeys().enc,
        buffer.subarray(0, 12),
    );

    decipher.setAuthTag(buffer.subarray(12, 28));

    return Buffer.concat([
        decipher.update(buffer.subarray(28)),
        decipher.final(),
    ]).toString("utf8");
}

export function protectIdentifier(
    kind: IdentifierKind,
    value: string,
): { hash: string; enc: string } {
    return { hash: hashIdentifier(kind, value), enc: encryptText(value) };
}
