"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client component that:
 * 1. Records an initial read in user_reads on mount (upsert)
 * 2. Tracks time spent on the page (pauses when tab is hidden)
 * 3. Tracks max scroll percentage reached
 * 4. Sends progress updates via sendBeacon on unload / visibilitychange
 */
export function ReadTracker({
  userId,
  topicId,
}: {
  userId: string;
  topicId: string;
}) {
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const maxScrollPctRef = useRef<number>(0);
  const lastSentRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  // ── Build the current progress snapshot ──────────────────────────────────
  const getProgress = useCallback(() => {
    const elapsed = isVisibleRef.current
      ? accumulatedRef.current + (Date.now() - startTimeRef.current)
      : accumulatedRef.current;

    return {
      user_id: userId,
      topic_id: topicId,
      time_spent_sec: Math.round(elapsed / 1000),
      scroll_pct: maxScrollPctRef.current,
    };
  }, [userId, topicId]);

  // ── Send progress via sendBeacon (fire-and-forget, survives unload) ─────
  const sendProgress = useCallback(() => {
    try {
      const progress = getProgress();
      // Skip if nothing meaningful to report
      if (progress.time_spent_sec < 1 && progress.scroll_pct === 0) return;

      const url = "/api/user/read-progress";
      const blob = new Blob([JSON.stringify(progress)], {
        type: "application/json",
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob);
      } else {
        // Fallback for environments without sendBeacon
        fetch(url, {
          method: "POST",
          body: JSON.stringify(progress),
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {
          // silent — best effort
        });
      }
    } catch {
      console.warn("[ReadTracker] Failed to send progress");
    }
  }, [getProgress]);

  useEffect(() => {
    // ── 1. Record initial read (existing behavior) ──────────────────────
    const supabase = createClient();
    supabase
      .from("user_reads")
      .upsert(
        {
          user_id: userId,
          topic_id: topicId,
          read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" },
      )
      .then(({ error }) => {
        if (error) {
          console.warn("[ReadTracker] Failed to record read:", error.message);
        }
      });

    // ── 2. Start the timer ──────────────────────────────────────────────
    startTimeRef.current = Date.now();
    accumulatedRef.current = 0;
    isVisibleRef.current = true;

    // ── 3. Visibility change — pause/resume timer + send progress ───────
    const handleVisibility = () => {
      if (document.hidden) {
        // Tab hidden — pause timer and send progress
        accumulatedRef.current += Date.now() - startTimeRef.current;
        isVisibleRef.current = false;
        sendProgress();
      } else {
        // Tab visible — resume timer
        startTimeRef.current = Date.now();
        isVisibleRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // ── 4. Scroll tracking ──────────────────────────────────────────────
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;

      if (docHeight <= 0) return;

      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      if (pct > maxScrollPctRef.current) {
        maxScrollPctRef.current = pct;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // ── 5. Periodic save (every 30s while active) ───────────────────────
    const intervalId = setInterval(() => {
      const progress = getProgress();
      if (progress.time_spent_sec > lastSentRef.current + 10) {
        lastSentRef.current = progress.time_spent_sec;
        sendProgress();
      }
    }, 30_000);

    // ── 6. beforeunload — final beacon ──────────────────────────────────
    const handleUnload = () => {
      sendProgress();
    };
    window.addEventListener("beforeunload", handleUnload);

    // ── Cleanup ─────────────────────────────────────────────────────────
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleUnload);
      clearInterval(intervalId);
      // Fire final progress on unmount (SPA navigation)
      sendProgress();
    };
  }, [userId, topicId, getProgress, sendProgress]);

  return null;
}
