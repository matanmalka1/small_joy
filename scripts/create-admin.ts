/**
 * Creates the first admin user, or promotes an existing user to admin.
 *
 * Interactive (recommended):   npm run admin:create
 *   → prompts for email, name and password (password input is hidden and
 *     never appears in shell history or process lists).
 *
 * Non-interactive (CI / one-off containers only):
 *   ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... npm run admin:create
 *   Unset these variables afterwards; never commit them.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword } from "better-auth/crypto";
import { createSeedClient } from "../prisma/seed/client";

const db = createSeedClient();

function ask(question: string, hidden = false): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? (await ask("Admin email: "))).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    console.log(`✓ Existing user ${email} promoted to ADMIN (password unchanged).`);
    return;
  }

  const name = process.env.ADMIN_NAME ?? ((await ask("Full name: ")) || "מנהל/ת");
  const password = process.env.ADMIN_PASSWORD ?? (await ask("Password (min 12 chars, hidden): ", true));
  if (password.length < 12) throw new Error("Admin password must be at least 12 characters");
  if (!process.env.ADMIN_PASSWORD) {
    const confirm = await ask("Repeat password: ", true);
    if (confirm !== password) throw new Error("Passwords do not match");
  }

  const userId = randomUUID();
  await db.$transaction([
    db.user.create({ data: { id: userId, email, name, role: "ADMIN", emailVerified: true } }),
    db.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: await hashPassword(password) } }),
  ]);
  console.log(`✓ Admin user ${email} created. Sign in at /account/login and open /admin.`);
}

main()
  .catch((e) => {
    console.error(`✗ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
