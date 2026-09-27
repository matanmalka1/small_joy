import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by Postgres (shared across instances,
 * no Redis needed). Atomic via a single upsert statement.
 */
export async function hitRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const fullKey = `app:${key}`;
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit (id, key, count, "lastRequest")
    VALUES (gen_random_uuid()::text, ${fullKey}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit."lastRequest" < ${windowStart} THEN 1 ELSE rate_limit.count + 1 END,
      "lastRequest" = CASE WHEN rate_limit."lastRequest" < ${windowStart} THEN ${now} ELSE rate_limit."lastRequest" END
    RETURNING count`;
  return (rows[0]?.count ?? 0) <= max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** Returns true when allowed. Key is scoped by action and client IP. */
export async function rateLimitByIp(action: string, max: number, windowSeconds: number): Promise<boolean> {
  return hitRateLimit(`${action}:${await clientIp()}`, max, windowSeconds);
}
