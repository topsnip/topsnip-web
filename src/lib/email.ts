import { Resend } from "resend";
import {
  welcomeEmailHtml,
  dailyDigestHtml,
  weeklyDigestHtml,
  passwordResetHtml,
  subscriptionConfirmationHtml,
  subscriptionCancellationHtml,
} from "./email-templates";

// ── Client initialization ────────────────────────────────────────────────────
// Graceful no-op when RESEND_API_KEY is not set (same pattern as Sentry/PostHog).

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

function getFromAddress(): string {
  return process.env.FROM_EMAIL || "TopSnip <noreply@topsnip.co>";
}

// ── Generic send ─────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send a transactional email via Resend.
 * No-ops gracefully if RESEND_API_KEY is not configured.
 * Returns the Resend message ID on success, or null if skipped/failed.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<string | null> {
  const client = getClient();
  if (!client) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email to", opts.to);
    return null;
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo && { replyTo: opts.replyTo }),
    });

    if (error) {
      console.error("[Email] Resend API error:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.error("[Email] Failed to send:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ── Typed template functions ─────────────────────────────────────────────────

/**
 * Send onboarding welcome email.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<string | null> {
  const { subject, html } = welcomeEmailHtml(name);
  return sendEmail({ to, subject, html });
}

/**
 * Send daily AI digest with top trending topics.
 */
export async function sendDailyDigest(
  to: string,
  name: string,
  topics: { title: string; slug: string; summary?: string }[]
): Promise<string | null> {
  const { subject, html } = dailyDigestHtml(name, topics);
  return sendEmail({ to, subject, html });
}

/**
 * Send weekly AI digest with top topics from the past 7 days.
 */
export async function sendWeeklyDigest(
  to: string,
  name: string,
  topics: { title: string; slug: string; summary?: string }[]
): Promise<string | null> {
  const { subject, html } = weeklyDigestHtml(name, topics);
  return sendEmail({ to, subject, html });
}

/**
 * Send password reset link.
 */
export async function sendPasswordReset(to: string, resetUrl: string): Promise<string | null> {
  const { subject, html } = passwordResetHtml(resetUrl);
  return sendEmail({ to, subject, html });
}

/**
 * Send subscription confirmation after successful Stripe checkout.
 */
export async function sendSubscriptionConfirmation(
  to: string,
  name: string,
  plan: string
): Promise<string | null> {
  const { subject, html } = subscriptionConfirmationHtml(name, plan);
  return sendEmail({ to, subject, html });
}

/**
 * Send subscription cancellation notice.
 */
export async function sendSubscriptionCancellation(
  to: string,
  name: string
): Promise<string | null> {
  const { subject, html } = subscriptionCancellationHtml(name);
  return sendEmail({ to, subject, html });
}
