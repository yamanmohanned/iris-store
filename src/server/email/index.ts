import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/server/env";
import { logger } from "@/server/logger";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  category?: string;
};

interface EmailDriver {
  send(message: EmailMessage): Promise<void>;
}

/** Captured emails in tests (NODE_ENV=test) so specs can read OTP codes. */
export const testMailbox: EmailMessage[] = [];

class ConsoleDriver implements EmailDriver {
  async send(message: EmailMessage) {
    const e = env();
    if (e.NODE_ENV === "test") {
      testMailbox.push(message);
      return;
    }
    if (process.env.MAIL_CAPTURE_DIR) {
      // E2E runs: write each email to a file the test can read.
      const dir = path.resolve(process.env.MAIL_CAPTURE_DIR);
      await mkdir(dir, { recursive: true });
      const file = path.join(
        dir,
        `${Date.now()}-${message.to.replace(/[^a-z0-9@._-]/gi, "_")}.json`,
      );
      await writeFile(file, JSON.stringify(message));
      return;
    }
    if (e.NODE_ENV === "production") {
      // Never print message bodies (they may contain codes) in production logs.
      logger.warn(
        { to: maskEmail(message.to), category: message.category },
        "EMAIL_DRIVER=console: email not delivered",
      );
      return;
    }
    // Development only: show the email (including codes) in the terminal.
    // eslint-disable-next-line no-console
    console.info(
      `\n┌─ 📧 Email to ${message.to}\n│ ${message.subject}\n├${"─".repeat(60)}\n${message.text
        .split("\n")
        .map((l) => `│ ${l}`)
        .join("\n")}\n└${"─".repeat(60)}\n`,
    );
  }
}

class SmtpDriver implements EmailDriver {
  private transporter: Transporter;
  constructor() {
    const e = env();
    this.transporter = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE || e.SMTP_PORT === 465,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
      pool: true,
      maxConnections: 3,
      connectionTimeout: 10_000,
      requireTLS: !e.SMTP_SECURE && e.SMTP_PORT === 587,
    });
  }
  async send(message: EmailMessage) {
    await this.transporter.sendMail({
      from: env().EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

class ResendDriver implements EmailDriver {
  async send(message: EmailMessage) {
    const e = env();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: e.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

let driver: EmailDriver | undefined;
function getDriver(): EmailDriver {
  if (driver) return driver;
  const name = env().EMAIL_DRIVER;
  driver =
    name === "smtp"
      ? new SmtpDriver()
      : name === "resend"
        ? new ResendDriver()
        : new ConsoleDriver();
  return driver;
}

export function emailConfigured(): boolean {
  return env().EMAIL_DRIVER !== "console";
}

/** Send an email, retrying once on transient failures. */
export async function sendEmail(message: EmailMessage) {
  try {
    await getDriver().send(message);
  } catch (first) {
    logger.warn({ err: first, category: message.category }, "email send failed, retrying once");
    await new Promise((r) => setTimeout(r, 750));
    await getDriver().send(message);
  }
  logger.info({ to: maskEmail(message.to), category: message.category }, "email sent");
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, Math.min(6, local.length - visible.length)))}@${domain}`;
}
