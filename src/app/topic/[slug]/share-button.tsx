"use client";

import { useState, useCallback } from "react";
import { Link2, Check } from "lucide-react";

/**
 * Copy-link share button for the topic sidebar.
 */
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the URL from the address bar
    }
  }, []);

  return (
    <button
      onClick={handleCopy}
      className="btn-secondary flex items-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium"
      style={{
        background: "var(--ts-surface)",
        color: copied ? "var(--success)" : "var(--foreground)",
      }}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
