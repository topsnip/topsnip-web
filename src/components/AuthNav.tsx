"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const headingFont = "var(--font-heading), 'Space Grotesk', sans-serif";

const NAV_LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/history", label: "History" },
  { href: "/upgrade", label: "Pro" },
  { href: "/settings", label: "Settings" },
];

/**
 * Shared navigation bar for all authenticated pages.
 * Logo links to /feed (not /) since the user is logged in.
 * Highlights the current page.
 */
export function AuthNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-4 left-4 right-4 z-50 flex justify-center">
      <div className="floating-nav rounded-full px-6 py-3 flex items-center justify-between w-full max-w-3xl">
        <Link
          href="/feed"
          className="font-bold tracking-tight text-white"
          style={{ fontFamily: headingFont, fontSize: "1.1rem" }}
        >
          top<span style={{ color: "var(--ts-accent)" }}>snip</span>
        </Link>
        <div className="flex items-center gap-5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors hover:text-white ${
                  isActive ? "text-white" : ""
                }`}
                style={isActive ? undefined : { color: "var(--ts-text-2)" }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
