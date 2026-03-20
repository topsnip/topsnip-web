"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, trackPageView } from "@/lib/analytics";

/**
 * PostHog provider — initialises the client and tracks page views
 * on route changes. Wrap in a Suspense boundary (useSearchParams requirement).
 *
 * No-ops gracefully when NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!pathname) return;

    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Deduplicate — don't fire twice for the same URL
    if (url === lastTracked.current) return;
    lastTracked.current = url;

    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PostHogPageViewTracker />
      {children}
    </>
  );
}
