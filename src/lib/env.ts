import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Parsed lazily so `next build` does not require
 * runtime secrets; the first request that needs them fails loudly instead.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().optional(),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  PAYMENT_PROVIDER: z.enum(["mock"]).default("mock"),
  /** Must be explicitly "true" to allow the sandbox provider in production. */
  PAYMENTS_ALLOW_SANDBOX: z.enum(["true", "false"]).default("false"),
  MOCK_PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Public base URL for uploaded objects, e.g. https://media.example.co.il */
  S3_PUBLIC_URL: z.url().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}
