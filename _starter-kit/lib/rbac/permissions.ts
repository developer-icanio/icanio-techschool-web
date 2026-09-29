export type AdminRole = "owner" | "seo" | "sales";

// Path prefixes each non-owner role can reach. Owner always has full
// access (checked separately) — this map only narrows access for
// restricted roles, and is deliberately an allowlist (nothing not
// listed here is reachable) rather than a denylist.
const ROLE_PATH_PREFIXES: Record<Exclude<AdminRole, "owner">, string[]> = {
  seo: [
    "/admin/seo",
    "/admin/blogs",
    "/admin/reports",
    "/admin/link-checker",
    "/admin/redirects",
    "/admin/pages",
    "/admin/tools",
  ],
  sales: ["/admin/leads", "/admin/email", "/admin/orders"],
};

// /admin (the dashboard landing page) and /admin/login are reachable by
// any authenticated admin role, regardless of their restrictions.
const SHARED_PATHS = ["/admin", "/admin/login"];

export function canAccess(role: AdminRole, pathname: string): boolean {
  if (role === "owner") return true;
  if (SHARED_PATHS.includes(pathname)) return true;

  return ROLE_PATH_PREFIXES[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
