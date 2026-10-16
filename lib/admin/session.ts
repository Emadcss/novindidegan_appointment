
import {
    createHmac,
    timingSafeEqual,
} from "node:crypto";

const SESSION_DURATION_SECONDS = 8 * 60 * 60;

type SessionPayload = {
    username: string;
    exp: number;
};

function getSessionSecret(): string {
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error(
            "ADMIN_SESSION_SECRET باید حداقل ۳۲ بایت باشد.",
        );
    }

    return secret;
}

function sign(value: string): string {
    return createHmac("sha256", getSessionSecret())
        .update(value)
        .digest("base64url");
}

export function createAdminSession(username: string): string {
    const payload: SessionPayload = {
        username,
        exp: Math.floor(Date.now() / 1000) +
            SESSION_DURATION_SECONDS,
    };

    const encoded = Buffer
        .from(JSON.stringify(payload))
        .toString("base64url");

    return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminSession(
    token: string | undefined,
): SessionPayload | null {
    if (!token || token.length > 2048) {
        return null;
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
        return null;
    }

    const [encoded, suppliedSignature] = parts;

    if (!encoded || !suppliedSignature) {
        return null;
    }

    try {
        const expectedSignature = sign(encoded);
        const expected = Buffer.from(expectedSignature);
        const supplied = Buffer.from(suppliedSignature);

        if (
            expected.length !== supplied.length ||
            !timingSafeEqual(expected, supplied)
        ) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(encoded, "base64url").toString("utf8"),
        ) as Partial<SessionPayload>;

        if (
            typeof payload.username !== "string" ||
            !payload.username ||
            typeof payload.exp !== "number" ||
            payload.exp <= Math.floor(Date.now() / 1000)
        ) {
            return null;
        }

        return {
            username: payload.username,
            exp: payload.exp,
        };
    } catch {
        return null;
    }
}

export { SESSION_DURATION_SECONDS };
