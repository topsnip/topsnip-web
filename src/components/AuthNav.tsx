"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

const NAV_LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/history", label: "History" },
  { href: "/knowledge", label: "Knowledge" },
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
        <div className="flex items-center gap-3 sm:gap-5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              pathname === href ||
              pathname.startsWith(href + "/") ||
              (href === "/feed" && pathname.startsWith("/topic/"));
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs sm:text-sm font-medium transition-colors hover:text-white ${
                  isActive ? "text-white" : ""
                }`}
                style={isActive ? undefined : { color: "var(--ts-text-2)" }}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">
                  {label.length > 4 ? label.slice(0, 4) : label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
