import { randomBytes, scryptSync } from "node:crypto";
import { Pool } from "pg";

function prompt(label, { hidden = false } = {}) {
  const input = process.stdin;

  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("این ابزار را مستقیماً در ترمینال اجرا کنید.");
  }

  process.stdout.write(label);
  input.setEncoding("utf8");
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    function finish(error) {
      input.off("data", onData);
      input.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("عملیات لغو شد."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
          if (!hidden) process.stdout.write("\b \b");
          continue;
        }
        if (character >= " ") {
          value += character;
          if (!hidden) process.stdout.write(character);
        }
      }
    }

    input.on("data", onData);
  });
}

function validatePassword(password) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("رمز باید بین ۸ تا ۱۲۸ نویسه باشد.");
  }
  if (/^(.)\1+$/.test(password)) {
    throw new Error("رمز نباید فقط از تکرار یک نویسه تشکیل شده باشد.");
  }
  if (!/\d/.test(password) || !/\D/.test(password)) {
    throw new Error("رمز باید دست‌کم شامل یک حرف و یک عدد باشد.");
  }
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function main() {
  console.log("Admin password reset for the Neon production database.");
  const connectionString = await prompt("Neon connection string (hidden): ", {
    hidden: true,
  });
  const databaseUrl = new URL(connectionString);

  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !databaseUrl.hostname.endsWith(".neon.tech")
  ) {
    throw new Error("آدرس واردشده یک اتصال معتبر Neon نیست.");
  }
  databaseUrl.searchParams.set("sslmode", "verify-full");
  process.stdout.write(
    `Target: ${databaseUrl.hostname}/${databaseUrl.pathname.replace(/^\//, "")}\n`,
  );
  if ((await prompt('Type "RESET" to continue: ')) !== "RESET") {
    throw new Error("عملیات تأیید نشد.");
  }

  const username = await prompt("Admin username: ");
  if (!/^[a-z0-9_.-]{3,32}$/i.test(username)) {
    throw new Error("نام کاربری باید بین ۳ تا ۳۲ نویسه و معتبر باشد.");
  }

  let password = await prompt("New password (hidden): ", { hidden: true });
  validatePassword(password);
  let confirmation = await prompt("Repeat new password (hidden): ", {
    hidden: true,
  });
  if (password !== confirmation) {
    throw new Error("دو رمز واردشده یکسان نیستند.");
  }
  const passwordHash = hashPassword(password);
  password = "";
  confirmation = "";

  const pool = new Pool({ connectionString: databaseUrl.toString() });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const found = await client.query(
      "SELECT id, username, role FROM admin_users WHERE username = $1 FOR UPDATE",
      [username.toLowerCase()],
    );

    if (found.rowCount !== 1) {
      throw new Error("مدیری با این نام کاربری در دیتابیس Neon پیدا نشد.");
    }
    if (found.rows[0].role !== "admin") {
      throw new Error("این حساب مدیر اصلی نیست و رمز آن تغییر نکرد.");
    }

    const adminId = found.rows[0].id;
    await client.query(
      `UPDATE admin_users
       SET password_hash = $2, failed_logins = 0, locked_until = NULL
       WHERE id = $1`,
      [adminId, passwordHash],
    );
    await client.query("DELETE FROM admin_sessions WHERE admin_id = $1", [
      adminId,
    ]);
    await client.query("COMMIT");
    console.log(
      `Password reset successfully for ${found.rows[0].username}. Existing sessions were revoked.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Password reset failed.");
  process.exitCode = 1;
});
