import { execSync } from "node:child_process";

/** Applies migrations to the dedicated test database before the suite runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://smalljoy:devpass@localhost:5432/small_joy_test";
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
