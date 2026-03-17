"use client";

import { useEffect, useState } from "react";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Burning the midnight oil?";
}

function extractFirstName(email: string | null | undefined): string {
  if (!email) return "there";
  const local = email.split("@")[0];
  if (!local) return "there";
  // Clean up common email patterns: first.last, first_last, first+tag
  const name = local.split(/[._+]/)[0];
  if (!name || name.length < 2) return "there";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

interface FeedGreetingProps {
  email: string | null | undefined;
  isQuietDay: boolean;
  topicCount: number;
}

export function FeedGreeting({ email, isQuietDay, topicCount }: FeedGreetingProps) {
  // Use state to avoid hydration mismatch (time-based greeting)
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const firstName = extractFirstName(email);
  const nameStr = firstName !== "there" ? `, ${firstName}` : "";

  const subtitle = isQuietDay
    ? "Quiet day in AI — here are some topics worth exploring."
    : topicCount > 0
      ? `${topicCount} topic${topicCount === 1 ? "" : "s"} trending in AI today`
      : "Here's what happened in AI today.";

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="flex flex-col gap-1 mb-8"
      style={{ animation: "fadeInUp 0.35s ease both" }}
    >
      <h1
        style={{
          fontFamily: headingFont,
          fontSize: "var(--text-2xl)",
          color: "var(--foreground)",
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        {greeting}{nameStr}.
      </h1>
      <p
        className="text-sm"
        style={{ color: "var(--ts-text-2)" }}
      >
        {subtitle}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span
          className="text-xs"
          style={{ color: "var(--ts-muted)" }}
        >
          {dateStr}
        </span>
        {topicCount > 0 && !isQuietDay && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
            style={{
              background: "var(--ts-accent-8)",
              color: "var(--ts-accent)",
              border: "1px solid var(--ts-accent-20)",
            }}
          >
            {topicCount} topic{topicCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}
