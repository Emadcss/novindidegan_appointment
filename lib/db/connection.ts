import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, types } from "pg";
import type { PoolClient } from "pg";

import { runMigrations } from "@/lib/db/migrations";
import { seedIfEmpty } from "@/lib/db/seed";

export type Row = Record<string, unknown>;
export type SqlParam = string | number | boolean | null;
/** اجرای یک کوئری روی یک اتصال مشخص (برای راه‌اندازی اولیه) */
export type Exec = (sql: string, params?: SqlParam[]) => Promise<Row[]>;

// DATE را به‌صورت متن «YYYY-MM-DD» بخوان (نه شیء Date؛ تا جابه‌جایی منطقه‌ی زمانی رخ ندهد)
types.setTypeParser(1082, (value: string) => value);
// BIGINT و COUNT(*) را عدد بخوان (به‌طور پیش‌فرض متن‌اند)
types.setTypeParser(20, (value: string) => Number(value));

const globalForDb = globalThis as unknown as {
    __kioskPool?: Pool;
    __kioskReady?: Promise<void>;
    __kioskTx?: AsyncLocalStorage<PoolClient>;
};

/** اتصال تراکنشِ جاری (در صورت وجود)؛ کوئری‌ها خودکار از همان استفاده می‌کنند */
const transactionStore = (globalForDb.__kioskTx ??=
    new AsyncLocalStorage<PoolClient>());

function getPool(): Pool {
    if (!globalForDb.__kioskPool) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error(
                "متغیر DATABASE_URL تنظیم نشده است. فایل .env.local را بسازید (نمونه: .env.example)",
            );
        }

        const pool = new Pool({
            connectionString,
            max: 10,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30_000,
        });

        pool.on("error", (error) => {
            console.error("خطای اتصال PostgreSQL:", error);
        });

        globalForDb.__kioskPool = pool;
    }

    return globalForDb.__kioskPool;
}

function execOn(client: PoolClient): Exec {
    return async (sql, params = []) => {
        // بدون پارامتر، چند دستور در یک رشته مجاز است (برای مهاجرت‌ها)
        const result = await client.query(sql, params.length ? params : undefined);
        return result.rows as Row[];
    };
}

/** مهاجرت و داده‌ی اولیه؛ با قفل، تا چند پروسه‌ی هم‌زمان آن را دوباره انجام ندهند */
async function bootstrap(): Promise<void> {
    const client = await getPool().connect();

    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(0, 1)");

        const exec = execOn(client);
        await runMigrations(exec);
        await seedIfEmpty(exec);

        await client.query("COMMIT");
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch {
            // اتصال خودش بسته شده است
        }
        throw error;
    } finally {
        client.release();
    }
}

/** با اولین کوئری، یک‌بار مهاجرت و seed انجام می‌شود (نه هنگام بیلد) */
function ensureReady(): Promise<void> {
    if (!globalForDb.__kioskReady) {
        globalForDb.__kioskReady = bootstrap().catch((error: unknown) => {
            globalForDb.__kioskReady = undefined; // دفعه‌ی بعد دوباره تلاش شود

            const reason = error instanceof Error ? error.message : String(error);
            throw new Error(
                `راه‌اندازی دیتابیس PostgreSQL انجام نشد. مطمئن شوید PostgreSQL روشن است و DATABASE_URL درست است. (${reason})`,
            );
        });
    }

    return globalForDb.__kioskReady;
}

/** اجرای یک کوئری؛ اگر داخل withTransaction باشید، روی همان تراکنش اجرا می‌شود */
export async function query(
    sql: string,
    params: SqlParam[] = [],
): Promise<Row[]> {
    const client = transactionStore.getStore();

    if (client) {
        return (await client.query(sql, params)).rows as Row[];
    }

    await ensureReady();
    return (await getPool().query(sql, params)).rows as Row[];
}

/**
 * اجرای چند کار به‌صورت یک تراکنش: یا همه ثبت می‌شوند یا هیچ‌کدام.
 * اگر از قبل داخل تراکنش باشید، به همان می‌پیوندد.
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    if (transactionStore.getStore()) {
        return fn();
    }

    await ensureReady();
    const client = await getPool().connect();
    let broken = false;

    try {
        await client.query("BEGIN");
        const result = await transactionStore.run(client, fn);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch {
            broken = true; // اتصال خراب است؛ دور انداخته شود
        }
        throw error;
    } finally {
        client.release(broken ? true : undefined);
    }
}

/**
 * قفل سبک تا پایان تراکنش جاری (pg_advisory_xact_lock).
 * درخواست‌هایی که کلید یکسان دارند پشت سر هم انجام می‌شوند؛
 * مثلاً دو ثبت هم‌زمان برای یک بیمار نمی‌توانند هر دو از سقف روزانه رد شوند.
 */
export async function advisoryLock(
    namespace: number,
    key: number,
): Promise<void> {
    if (!transactionStore.getStore()) {
        throw new Error("advisoryLock فقط داخل withTransaction معنا دارد");
    }

    await query("SELECT pg_advisory_xact_lock($1, $2)", [namespace, key]);
}

/** هش ۳۲ بیتی علامت‌دار (FNV-1a) برای ساخت کلید قفل از یک متن */
export function hash32(text: string): number {
    let hash = 0x811c9dc5;

    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }

    return hash | 0;
}

/** آیا خطا نقض یکتایی (UNIQUE) است؟ */
export function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: unknown }).code === "23505"
    );
}

/** برای اسکریپت‌ها و تست: اتصال‌ها را می‌بندد */
export async function closePool(): Promise<void> {
    await globalForDb.__kioskPool?.end();
    globalForDb.__kioskPool = undefined;
    globalForDb.__kioskReady = undefined;
}
