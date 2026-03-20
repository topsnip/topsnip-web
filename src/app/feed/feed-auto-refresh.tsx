"use client";

import { useEffect, useRef, useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface FeedAutoRefreshProps {
  lastPublishedAt: string | null;
  onNewTopics: (count: number) => void;
}

// ── Constants ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ── Component ───────────────────────────────────────────────────────────────

export function FeedAutoRefresh({ lastPublishedAt, onNewTopics }: FeedAutoRefreshProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onNewTopicsRef = useRef(onNewTopics);
  onNewTopicsRef.current = onNewTopics;

  const poll = useCallback(async () => {
    if (!lastPublishedAt) return;

    try {
      const res = await fetch(
        `/api/feed/check-new?since=${encodeURIComponent(lastPublishedAt)}`
      );
      if (!res.ok) return;

      const data = await res.json();
      if (data.new_count > 0) {
        onNewTopicsRef.current(data.new_count);
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[FeedAutoRefresh] Poll failed:", err);
      }
    }
  }, [lastPublishedAt]);

  useEffect(() => {
    if (!lastPublishedAt) return;

    function startPolling() {
      stopPolling();
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling();
      } else {
        // Poll immediately when tab becomes visible, then resume interval
        poll();
        startPolling();
      }
    }

    // Poll immediately on mount, then start interval
    poll();
    startPolling();

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [lastPublishedAt, poll]);

  return null;
}
