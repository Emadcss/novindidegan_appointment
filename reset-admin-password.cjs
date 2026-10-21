
const { randomBytes, scryptSync } = require("node:crypto");
const readline = require("node:readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question("Enter a new password (12+ characters): ", (password) => {
    rl.close();

    if (password.length < 12) {
        console.error("Password must be at least 12 characters.");
        process.exitCode = 1;
        return;
    }

    const salt = randomBytes(16);
    const key = scryptSync(password, salt, 64);

    console.log("\nGenerated password hash:\n");
    console.log(`scrypt:${salt.toString("hex")}:${key.toString("hex")}`);
    password = "";
});
