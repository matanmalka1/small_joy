import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type Mail = { to: string; subject: string; text: string };

/**
 * Sends transactional email via SMTP when configured. Without SMTP settings
 * (development) the message is logged instead of sent — never in production silently.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const e = env();
  if (!e.SMTP_HOST || !e.MAIL_FROM) {
    if (e.NODE_ENV === "production") {
      logger.error("mail.not_configured", { subject: mail.subject });
      return;
    }
    logger.warn("mail.dev_outbox", { to: mail.to, subject: mail.subject, body: mail.text });
    return;
  }
  const transport = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT ?? 587,
    secure: (e.SMTP_PORT ?? 587) === 465,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: e.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text });
}
