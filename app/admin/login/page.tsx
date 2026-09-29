import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, isDevLogin, noLogin } from "@/auth";
import { SITE } from "@/lib/site";
import { signInDev, signInWithGoogle } from "../actions";

export const metadata: Metadata = { title: { absolute: `Admin sign in${SITE.titleSuffix}` }, robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  AccessDenied: "That account isn't on the admin list. Ask an owner to add you in Team.",
  Configuration: "Sign-in isn't configured yet. Check AUTH_SECRET and the Google OAuth keys.",
};

export default async function Login({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin/seo";
  if (noLogin || (await auth())?.user?.role) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] ?? "Sign-in failed. Please try again." : null;
  const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <main className="grid min-h-screen place-items-center bg-soft px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <Image src={SITE.logo} alt={`${SITE.name} logo`} width={132} height={51} priority />
        <h1 className="mt-6 text-2xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted">Sign in with your Icanio Google account.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form action={signInWithGoogle} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <button type="submit" disabled={!googleReady} className="btn btn-outline w-full disabled:cursor-not-allowed disabled:opacity-50">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
            </svg>
            Sign in with Google
          </button>
        </form>
        {!googleReady && <p className="mt-2 text-xs text-muted">Google sign-in needs AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.</p>}
        {isDevLogin && (
          <form action={signInDev} className="mt-6 border-t border-line pt-6">
            <input type="hidden" name="next" value={next} />
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Local dev login
              <input name="email" type="email" required placeholder="bd@icanio.com" className="mt-1.5 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-heading" />
            </label>
            <button type="submit" className="btn btn-primary mt-3 w-full">Continue</button>
            <p className="mt-2 text-xs text-muted">Only on localhost (AUTH_DEV_LOGIN=1). Allowlist still applies.</p>
          </form>
        )}
      </div>
    </main>
  );
}
