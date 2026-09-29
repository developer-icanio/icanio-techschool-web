import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { noLogin } from "@/auth";
import { canManageTeam, requireAdmin } from "@/lib/admin";
import { SITE } from "@/lib/site";
import { signOutAction } from "../actions";

export const metadata: Metadata = { title: { template: `%s | Admin${SITE.titleSuffix}`, default: `Admin${SITE.titleSuffix}` }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireAdmin();
  const nav = [
    { href: "/admin/seo", label: "SEO scoreboard" },
    { href: "/admin/sitemap", label: "Sitemap and robots" },
    ...(canManageTeam(me.role) ? [{ href: "/admin/team", label: "Team" }] : []),
  ];
  return (
    <div className="min-h-screen bg-soft lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex items-center justify-between gap-4 bg-midnight px-4 py-3 text-white lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:items-stretch lg:justify-start lg:px-5 lg:py-6">
        <Link href="/admin/seo" className="flex items-center gap-3">
          <span className="rounded-lg bg-white px-2 py-1"><Image src={SITE.logo} alt={`${SITE.name} logo`} width={84} height={32} /></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Admin</span>
        </Link>
        <nav aria-label="Admin" className="flex gap-1 lg:mt-8 lg:flex-col">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">{n.label}</Link>
          ))}
          <a href="/" target="_blank" className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white">View site ↗</a>
          {!noLogin && (
            <form action={signOutAction} className="lg:hidden">
              <button className="rounded-lg px-3 py-2 text-sm font-medium text-cyan">Sign out</button>
            </form>
          )}
        </nav>
        <div className="hidden lg:mt-auto lg:block">
          <p className="truncate text-sm font-medium">{me.name || me.email}</p>
          <p className="truncate text-xs text-white/60">{me.email} · {me.role}</p>
          {noLogin ? (
            <p className="mt-3 rounded bg-amber-400/15 px-2 py-1 text-xs text-amber-200">Local mode: no login (ADMIN_NO_LOGIN=1)</p>
          ) : (
            <form action={signOutAction} className="mt-3">
              <button className="text-xs font-semibold text-cyan hover:underline">Sign out</button>
            </form>
          )}
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
