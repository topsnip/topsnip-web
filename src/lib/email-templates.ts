/**
 * HTML email templates for TopSnip transactional emails.
 *
 * Uses inline styles + table-based layout for maximum email client compatibility.
 * Brand: dark background (#0C0C0E), purple accent (#7C6AF7), light text (#F0F0F0).
 */

// ── Brand constants ──────────────────────────────────────────────────────────

const BRAND = {
  bg: "#0C0C0E",
  card: "#141418",
  accent: "#7C6AF7",
  accentHover: "#9B8DFF",
  text: "#F0F0F0",
  muted: "#A0A0A0",
  border: "#2A2A2E",
  name: "TopSnip",
  tagline: "Understand AI in 3 minutes, not 3 hours",
  url: "https://www.topsnip.co",
} as const;

// ── Shared layout ────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:700;color:${BRAND.accent};letter-spacing:-0.5px;">${BRAND.name}</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${BRAND.card};border-radius:12px;border:1px solid ${BRAND.border};padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
                <a href="${BRAND.url}" style="color:${BRAND.muted};text-decoration:underline;">${BRAND.name}</a> &mdash; ${BRAND.tagline}
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:${BRAND.muted};">
                You received this email because you have an account on TopSnip.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td align="center" style="background-color:${BRAND.accent};border-radius:8px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${text}</a>
    </td>
  </tr>
</table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.text};line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:${BRAND.text};line-height:1.6;">${text}</p>`;
}

function mutedText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:${BRAND.muted};line-height:1.6;">${text}</p>`;
}

// ── Topic list component (for digests) ───────────────────────────────────────

interface DigestTopic {
  title: string;
  slug: string;
  summary?: string;
}

function topicList(topics: DigestTopic[]): string {
  if (topics.length === 0) return paragraph("No new topics today. Check back tomorrow!");

  const items = topics
    .map(
      (t) => `<tr>
  <td style="padding:16px 0;border-bottom:1px solid ${BRAND.border};">
    <a href="${BRAND.url}/topic/${t.slug}" style="font-size:16px;font-weight:600;color:${BRAND.accent};text-decoration:none;line-height:1.4;">${t.title}</a>
    ${t.summary ? `<p style="margin:6px 0 0;font-size:14px;color:${BRAND.muted};line-height:1.5;">${t.summary}</p>` : ""}
  </td>
</tr>`
    )
    .join("\n");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>`;
}

// ── Template exports ─────────────────────────────────────────────────────────

export function welcomeEmailHtml(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name;

  return {
    subject: `Welcome to ${BRAND.name}, ${firstName}!`,
    html: layout(
      `Welcome to ${BRAND.name}`,
      [
        heading(`Welcome to ${BRAND.name}, ${firstName}!`),
        paragraph(
          "You just joined the fastest way to stay sharp on AI. No hype, no noise &mdash; just clear explainers you can read in 3 minutes."
        ),
        paragraph("Here's what you can do:"),
        `<ul style="margin:0 0 16px;padding-left:20px;color:${BRAND.text};font-size:15px;line-height:2;">
          <li>Browse today's trending AI topics on your feed</li>
          <li>Search any AI topic and get an instant explainer</li>
          <li>Track what you've learned over time</li>
        </ul>`,
        button("Open Your Feed", `${BRAND.url}/feed`),
        mutedText("If you didn't create this account, you can safely ignore this email."),
      ].join("\n")
    ),
  };
}

export function dailyDigestHtml(
  name: string,
  topics: DigestTopic[]
): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name;
  const count = topics.length;

  return {
    subject: `Your AI Daily: ${count} topic${count !== 1 ? "s" : ""} trending today`,
    html: layout(
      "Daily AI Digest",
      [
        heading(`Good morning, ${firstName}`),
        paragraph(
          `Here ${count === 1 ? "is" : "are"} the top ${count} AI topic${count !== 1 ? "s" : ""} trending today:`
        ),
        topicList(topics),
        button("Read on TopSnip", `${BRAND.url}/feed`),
      ].join("\n")
    ),
  };
}

export function weeklyDigestHtml(
  name: string,
  topics: DigestTopic[]
): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name;
  const count = topics.length;

  return {
    subject: `Your AI Weekly: ${count} topic${count !== 1 ? "s" : ""} from this week`,
    html: layout(
      "Weekly AI Digest",
      [
        heading(`Your week in AI, ${firstName}`),
        paragraph(
          `Here's a summary of the ${count} most important AI topic${count !== 1 ? "s" : ""} from the past 7 days:`
        ),
        topicList(topics),
        button("Explore All Topics", `${BRAND.url}/feed`),
      ].join("\n")
    ),
  };
}

export function passwordResetHtml(resetUrl: string): { subject: string; html: string } {
  return {
    subject: `Reset your ${BRAND.name} password`,
    html: layout(
      "Reset Your Password",
      [
        heading("Reset your password"),
        paragraph("We received a request to reset your password. Click the button below to choose a new one."),
        button("Reset Password", resetUrl),
        paragraph("This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email."),
        mutedText("If the button doesn't work, copy and paste this URL into your browser:"),
        `<p style="margin:0 0 16px;font-size:13px;color:${BRAND.accent};word-break:break-all;line-height:1.6;">${resetUrl}</p>`,
      ].join("\n")
    ),
  };
}

export function subscriptionConfirmationHtml(
  name: string,
  plan: string
): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name;

  return {
    subject: `You're now on ${BRAND.name} ${plan}!`,
    html: layout(
      "Subscription Confirmed",
      [
        heading(`You're on ${plan}, ${firstName}!`),
        paragraph(
          "Your subscription is now active. You've unlocked the full TopSnip experience:"
        ),
        `<ul style="margin:0 0 16px;padding-left:20px;color:${BRAND.text};font-size:15px;line-height:2;">
          <li>Unlimited searches</li>
          <li>Role-specific explainers</li>
          <li>Knowledge tracking dashboard</li>
          <li>Priority access to new features</li>
        </ul>`,
        button("Start Exploring", `${BRAND.url}/feed`),
      ].join("\n")
    ),
  };
}

export function subscriptionCancellationHtml(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || name;

  return {
    subject: `Your ${BRAND.name} Pro subscription has been cancelled`,
    html: layout(
      "Subscription Cancelled",
      [
        heading(`We're sorry to see you go, ${firstName}`),
        paragraph(
          "Your Pro subscription has been cancelled. You'll continue to have access to Pro features until the end of your current billing period."
        ),
        paragraph(
          "After that, your account will switch to the free plan. You can always re-subscribe if you change your mind."
        ),
        button("Re-subscribe", `${BRAND.url}/upgrade`),
        mutedText(
          "If you have feedback on how we can improve, we'd love to hear from you. Just reply to this email."
        ),
      ].join("\n")
    ),
  };
}
