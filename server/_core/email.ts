import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { getSmtpConfig, isSmtpConfigured, redactSmtpConfig, type SmtpConfig } from "./env";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type EmailDeliveryResult =
  | { delivered: true; messageId?: string }
  | { delivered: false; reason: "not-configured" | "failed"; error?: unknown };

function validateMessage(message: EmailMessage) {
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  if (recipients.length === 0 || recipients.some(value => !value.trim())) throw new Error("Email recipient is required.");
  if (!message.subject.trim()) throw new Error("Email subject is required.");
  if (!message.text.trim() && !message.html?.trim()) throw new Error("Email body is required.");
}

export class SmtpEmailAdapter {
  private readonly transporter: Transporter;
  private readonly config: SmtpConfig;

  constructor(config = getSmtpConfig()) {
    if (!config) throw new Error("SMTP is not configured. Set SMTP_HOST and SMTP_FROM.");
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: config.connectionTimeout,
      greetingTimeout: config.greetingTimeout,
      socketTimeout: config.socketTimeout,
    });
  }

  async verify() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.warn("[Email] SMTP verification failed", { config: redactSmtpConfig(this.config), error: String(error) });
      return false;
    }
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    validateMessage(message);
    const options: SendMailOptions = {
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    };
    try {
      const result = await this.transporter.sendMail(options);
      return { delivered: true, messageId: result.messageId };
    } catch (error) {
      console.warn("[Email] SMTP delivery failed", { to: message.to, subject: message.subject, error: String(error) });
      return { delivered: false, reason: "failed", error };
    }
  }
}

let adapter: SmtpEmailAdapter | null = null;

export function getEmailAdapter(): SmtpEmailAdapter | null {
  if (!isSmtpConfigured()) return null;
  if (!adapter) adapter = new SmtpEmailAdapter();
  return adapter;
}

export async function sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  const emailAdapter = getEmailAdapter();
  if (!emailAdapter) return { delivered: false, reason: "not-configured" };
  return emailAdapter.send(message);
}

export function resetEmailAdapterForTests() {
  adapter = null;
}
