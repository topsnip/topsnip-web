"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client component that records a read in user_reads when the page loads.
 * Uses upsert (onConflict: user_id, topic_id) to avoid duplicates.
 */
export function ReadTracker({
  userId,
  topicId,
}: {
  userId: string;
  topicId: string;
}) {
  useEffect(() => {
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
          console.error("[ReadTracker] Failed to record read:", error.message);
        }
      });
  }, [userId, topicId]);

  return null;
}
