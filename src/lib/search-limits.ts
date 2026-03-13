/**
 * Search limits per tier
 * Guest (no account): 3/day (tracked via localStorage)
 * Free (signed in):   10/day (tracked in DB)
 * Pro:                unlimited
 */

export const LIMITS = {
  guest: 3,
  free: 10,
  pro: Infinity,
} as const;

const GUEST_KEY = "ts_guest_searches";
const GUEST_DATE_KEY = "ts_guest_date";

export function getGuestSearchCount(): number {
  if (typeof window === "undefined") return 0;
  const date = localStorage.getItem(GUEST_DATE_KEY);
  const today = new Date().toISOString().slice(0, 10);
  if (date !== today) return 0;
  return parseInt(localStorage.getItem(GUEST_KEY) ?? "0", 10);
}

export function incrementGuestSearchCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  const date = localStorage.getItem(GUEST_DATE_KEY);
  let count = date === today
    ? parseInt(localStorage.getItem(GUEST_KEY) ?? "0", 10)
    : 0;
  count += 1;
  localStorage.setItem(GUEST_KEY, String(count));
  localStorage.setItem(GUEST_DATE_KEY, today);
  return count;
}

export function guestLimitReached(): boolean {
  return getGuestSearchCount() >= LIMITS.guest;
}
