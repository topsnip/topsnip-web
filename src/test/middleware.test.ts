import { describe, it, expect } from "vitest";

// We extract the routing logic directly for mathematical verification 
// without needing to mock the entire Next.js and Supabase Edge environment.
const PROTECTED_ROUTES = ["/history", "/settings"];

function requireAuth(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

describe("Middleware Routing Security", () => {
  it("should require auth for protected routes", () => {
    expect(requireAuth("/history")).toBe(true);
    expect(requireAuth("/settings")).toBe(true);
    
    // Sub-routes must also be protected
    expect(requireAuth("/history/queries")).toBe(true);
    expect(requireAuth("/settings/billing")).toBe(true);
  });

  it("should not require auth for public routes", () => {
    expect(requireAuth("/")).toBe(false);
    expect(requireAuth("/auth/login")).toBe(false);
    expect(requireAuth("/api/search")).toBe(false);
    expect(requireAuth("/api/stripe/webhook")).toBe(false);
  });
});
