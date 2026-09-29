import { NextResponse } from "next/server";
import { auth, noLogin } from "@/auth";

// Gates /admin. Pages re-check the session server-side (lib/admin.ts), so
// this is the first of two locks, not the only one.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || noLogin) return;
  if (!req.auth?.user?.role) {
    const url = new URL("/admin/login", req.nextUrl.origin);
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = { matcher: ["/admin/:path*"] };
