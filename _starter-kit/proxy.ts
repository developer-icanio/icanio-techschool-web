import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { canAccess } from "@/lib/rbac/permissions";
import { getRedirectMap, trackRedirectHit } from "@/lib/redirects";

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isApiRoute = pathname.startsWith("/api");

  // Checked before anything else so a redirect fires even for paths
  // that would otherwise 404 — this needs to run at the HTTP layer
  // (not a Server Component's redirect()) to emit a real 301-class
  // status code search engines respect for link-equity transfer.
  if (!isAdminRoute && !isApiRoute) {
    const redirectMap = await getRedirectMap();
    const match = redirectMap.get(pathname);
    if (match) {
      trackRedirectHit(match.id);
      const status = match.type === "permanent" ? 308 : 307;
      return NextResponse.redirect(new URL(match.destinationPath, req.nextUrl.origin), status);
    }
  }

  const isLoginPage = pathname === "/admin/login";

  if (isAdminRoute && !isLoginPage) {
    if (!req.auth || req.auth.user?.role !== "admin") {
      const loginUrl = new URL("/admin/login", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }

    const role = req.auth.user.adminRole ?? "owner";
    if (!canAccess(role, pathname)) {
      const overviewUrl = new URL("/admin", req.nextUrl.origin);
      return NextResponse.redirect(overviewUrl);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
