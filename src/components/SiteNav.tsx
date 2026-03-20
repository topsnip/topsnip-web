"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileTabBar } from "./MobileTabBar";
import { headingFont } from "@/lib/constants";

interface SiteNavUser {
  id: string;
  plan: string;
}

interface SiteNavProps {
  user?: SiteNavUser | null;
}

/* ── Authenticated nav links ─────────────────────────────────────────── */

const AUTH_LINKS = [
  {
    href: "/feed",
    label: "Feed",
    activeWhen: (p: string) => p === "/feed" || p.startsWith("/topic/"),
  },
  {
    href: "/",
    label: "Search",
    activeWhen: (p: string) => p === "/" || p.startsWith("/s/"),
  },
  {
    href: "/knowledge",
    label: "Knowledge",
    activeWhen: (p: string) => p === "/knowledge" || p.startsWith("/knowledge/"),
  },
  {
    href: "/settings",
    label: "Profile",
    activeWhen: (p: string) =>
      p === "/settings" || p.startsWith("/settings/") ||
      p === "/history" || p.startsWith("/history/"),
  },
];

/* ── Anonymous nav links ─────────────────────────────────────────────── */

const ANON_LINKS = [
  { href: "/about", label: "About" },
  { href: "/upgrade", label: "Pricing" },
];

/**
 * Unified navigation for all TopSnip pages.
 *
 * - Anonymous: floating pill with Logo + links (all screen sizes)
 * - Authenticated: floating pill with Logo + desktop links + MobileTabBar at bottom
 */
export function SiteNav({ user }: SiteNavProps) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);

  /* Scroll-compact: shrink padding after 100px scroll */
  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 100);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAuth = !!user;
  const logoHref = isAuth ? "/feed" : "/";

  return (
    <>
      <nav className="fixed top-4 left-4 right-4 z-50 flex justify-center">
        <div
          className={`floating-nav rounded-full flex items-center justify-between w-full max-w-3xl transition-all duration-200 ${
            compact ? "px-4 py-2" : "px-6 py-3"
          }`}
        >
          {/* Logo */}
          <Link
            href={logoHref}
            className="font-bold tracking-tight text-white"
            style={{ fontFamily: headingFont, fontSize: "1.1rem" }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </Link>

          {isAuth ? (
            /* Authenticated links — hidden on mobile (MobileTabBar handles it) */
            <div className="hidden sm:flex items-center gap-3 sm:gap-5">
              {AUTH_LINKS.map(({ href, label, activeWhen }) => {
                const isActive = activeWhen(pathname);
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
          ) : (
            /* Anonymous links — always visible (mobile + desktop) */
            <div className="flex items-center gap-3 sm:gap-5">
              {ANON_LINKS.map(({ href, label }) => {
                const isActive = pathname === href;
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
              <Link
                href="/auth/login"
                className="btn-primary rounded-full px-3 sm:px-4 py-1.5 text-xs"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar — auth only, hidden on desktop */}
      {isAuth && <MobileTabBar />}
    </>
  );
}
