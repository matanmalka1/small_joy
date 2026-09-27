import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mailer";

function createAuth() {
  const e = env();
  return betterAuth({
    secret: e.BETTER_AUTH_SECRET,
    baseURL: e.BETTER_AUTH_URL ?? e.NEXT_PUBLIC_SITE_URL,
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      async sendResetPassword({ user, url }) {
        await sendMail({
          to: user.email,
          subject: "איפוס סיסמה – שמחות קטנות",
          text: `שלום ${user.name},\n\nלאיפוס הסיסמה יש להיכנס לקישור הבא (בתוקף לשעה):\n${url}\n\nאם לא ביקשת איפוס, ניתן להתעלם מהודעה זו.`,
        });
      },
    },
    user: {
      additionalFields: {
        // Never settable from sign-up input; only via the admin script / DB.
        role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: e.NODE_ENV !== "test",
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 300, max: 3 },
        "/reset-password": { window: 300, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: e.NODE_ENV === "production",
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

export function auth(): Auth {
  if (!instance) instance = createAuth();
  return instance;
}
