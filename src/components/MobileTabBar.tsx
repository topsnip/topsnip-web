"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Search, Brain, User } from "lucide-react";

const TABS = [
  {
    icon: Newspaper,
    label: "Feed",
    href: "/feed",
    activeWhen: (p: string) => p === "/feed" || p.startsWith("/topic/"),
  },
  {
    icon: Search,
    label: "Search",
    href: "/",
    activeWhen: (p: string) => p === "/",
  },
  {
    icon: Brain,
    label: "Learn",
    href: "/knowledge",
    activeWhen: (p: string) => p === "/knowledge" || p.startsWith("/knowledge/"),
  },
  {
    icon: User,
    label: "Profile",
    href: "/settings",
    activeWhen: (p: string) =>
      p === "/settings" || p.startsWith("/settings/") || p === "/history" || p.startsWith("/history/"),
  },
] as const;

/**
 * Bottom tab bar for authenticated mobile users (< 640px).
 * Hidden on desktop via CSS media query.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="mobile-tab-bar">
      {TABS.map(({ icon: Icon, label, href, activeWhen }) => {
        const active = activeWhen(pathname);
        return (
          <Link
            key={href}
            href={href}
            className="mobile-tab-item"
            aria-current={active ? "page" : undefined}
          >
            <Icon
              size={20}
              className="mobile-tab-icon"
              style={{
                color: active ? "var(--ts-accent)" : "var(--ts-muted)",
                transform: active ? "scale(1.1)" : "scale(1)",
                transition: "color 0.15s ease, transform 0.15s ease",
              }}
            />
            <span
              className="mobile-tab-label"
              style={{
                color: active ? "var(--ts-accent)" : "var(--ts-muted)",
                transition: "color 0.15s ease",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
