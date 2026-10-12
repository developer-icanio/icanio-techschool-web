import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, isDevLogin, noLogin } from "@/auth";
import { asset } from "@/lib/images";
import { SITE } from "@/lib/site";
import { signInDev, signInWithGoogle } from "../actions";

export const metadata: Metadata = { title: { absolute: `Sign in | ${SITE.name} Admin` }, robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  AccessDenied: "This Google account isn't on the Icanio Tech School team list. Ask an owner to add you in Team, then try again.",
  Configuration: "Google sign-in isn't set up on this server yet. Your developer needs to add AUTH_SECRET and the Google OAuth keys.",
  OAuthCallbackError: "Google sign-in was cancelled or failed. Please try again.",
};

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
  </svg>
);

export default async function Login({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin") ? sp.next : "/admin/content";
  // Local no-login mode skips this page; add ?preview=1 to look at it anyway.
  if ((noLogin && sp.preview !== "1") || (await auth())?.user?.role) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] ?? "Sign-in failed. Please try again." : null;
  const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const hero = asset("HomeLandingSectionImg.png");

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel: the site's navy gradient, hero student and trust stats. */}
      <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#00264c_0%,#004589_60%,#1671cc_100%)] px-12 py-12 text-white lg:flex lg:flex-col xl:px-20">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cyan/20 blur-3xl" />
        <span className="w-fit rounded-xl bg-white px-3 py-2"><Image src={SITE.logo} alt={`${SITE.name} logo`} width={140} height={54} priority /></span>
        <div className="relative mt-auto xl:max-w-[58%]">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan">Admin dashboard</p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight !text-white xl:text-5xl">Keep the Icanio Tech School website fresh every week.</h1>
          <p className="mt-4 max-w-md text-lg text-white/85">Update videos, student stories, college events and course grids. Every change is checked against our 69 SEO rules before it goes live.</p>
          <ul className="mt-8 grid max-w-md grid-cols-3 gap-4">
            {[["38", "pages"], ["2,000+", "students trained"], ["30+", "MoU colleges"]].map(([v, l]) => (
              <li key={l}>
                <span className="block text-2xl font-semibold">{v}</span>
                <span className="text-sm text-white/75">{l}</span>
              </li>
            ))}
          </ul>
        </div>
        <Image src={hero.src} alt="" width={hero.w ?? 600} height={hero.h ?? 560} className="pointer-events-none absolute -right-6 bottom-0 hidden w-[40%] max-w-sm xl:block" />
        <p className="relative mt-10 text-xs text-white/60">A unit of {SITE.parent.name} · Tirunelveli, Tamil Nadu</p>
      </section>

      {/* Sign-in */}
      <section className="flex items-center justify-center bg-soft px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Image src={SITE.logo} alt={`${SITE.name} logo`} width={140} height={54} priority />
          </div>
          <div className="mt-8 rounded-[20px] border border-line bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10 lg:mt-0">
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="mt-2 text-[15px] text-body">Use the Google account your team invited. Usually your <span className="font-medium text-heading">@icanio.com</span> email.</p>

            {error && (
              <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
            )}

            <form action={signInWithGoogle} className="mt-6">
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                disabled={!googleReady}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-[15px] font-semibold text-[#1f1f1f] shadow-sm transition hover:border-navy hover:bg-soft focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GoogleG />
                Sign in with Google
              </button>
            </form>
            {!googleReady && <p className="mt-3 text-xs text-muted">Google sign-in needs AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET on the server.</p>}

            <ul className="mt-7 space-y-2 border-t border-line pt-6 text-sm text-body">
              <li className="flex gap-2"><span aria-hidden className="text-navy">✓</span>No password to remember: Google handles sign-in.</li>
              <li className="flex gap-2"><span aria-hidden className="text-navy">✓</span>Only people on the team list can get in.</li>
              <li className="flex gap-2"><span aria-hidden className="text-navy">✓</span><span>Need access? Email <a href={`mailto:${SITE.email}`} className="font-medium text-navy hover:underline">{SITE.email}</a>.</span></li>
            </ul>

            {isDevLogin && (
              <form action={signInDev} className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
                <input type="hidden" name="next" value={next} />
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-900">
                  Local dev login
                  <input name="email" type="email" required placeholder="bd@icanio.com" className="mt-1.5 w-full rounded border border-amber-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-heading" />
                </label>
                <button type="submit" className="btn btn-primary mt-3 w-full !py-2">Continue without Google</button>
                <p className="mt-2 text-xs text-amber-900/80">Only on localhost (AUTH_DEV_LOGIN=1). The team list still applies.</p>
              </form>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/" className="font-medium text-navy hover:underline">← Back to the website</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
