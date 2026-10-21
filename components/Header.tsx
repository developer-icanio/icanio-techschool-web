import Image from "next/image";
import Link from "next/link";
import { NAV } from "@/lib/nav";
import { SITE } from "@/lib/site";
import DesktopNav from "./DesktopNav";
import MobileMenu from "./MobileMenu";

// Desktop: hover/focus dropdowns in CSS; <DesktopNav/> closes them after a click. Mobile: <MobileMenu/>.
export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-white/95 backdrop-blur">
      <div className="shell flex h-18 items-center justify-between gap-6">
        <Link href="/" aria-label={`${SITE.name} home`} className="shrink-0">
          <Image src={SITE.logo} alt={`${SITE.name} logo`} width={132} height={51} priority />
        </Link>

        <DesktopNav>
          <ul className="flex items-center gap-1">
            {NAV.map((g) => (
              <li key={g.label} data-nav-item className="group relative">
                <Link
                  href={g.href}
                  className="flex items-center gap-1 whitespace-nowrap rounded px-2.5 py-2 text-[15px] font-medium text-heading hover:text-navy xl:px-3"
                >
                  {g.label}
                  <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="mt-0.5 transition group-hover:rotate-180 group-focus-within:rotate-180 group-data-closed:!rotate-0">
                    <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </Link>
                <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 group-data-closed:!invisible group-data-closed:!opacity-0">
                  <div className={`rounded-2xl border border-line bg-white p-5 shadow-xl shadow-slate-900/10 ${g.columns.length > 1 ? "w-[560px]" : "w-[320px]"}`}>
                    <div className={`grid gap-6 ${g.columns.length > 1 ? "grid-cols-2" : ""}`}>
                      {g.columns.map((c) => (
                        <div key={c.title}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy">{c.title}</p>
                          <ul className="space-y-0.5">
                            {c.links.map((l) => (
                              <li key={l.href + l.label}>
                                <Link href={l.href} className="block rounded-lg px-2 py-1.5 hover:bg-soft">
                                  <span className="block text-sm font-medium text-heading">{l.label}</span>
                                  {l.note && <span className="block text-xs text-muted">{l.note}</span>}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {g.cta && (
                      <Link href={g.cta.href} className="mt-4 flex items-center justify-between rounded-lg bg-soft px-3 py-2.5 text-sm font-semibold text-navy hover:bg-soft-2">
                        {g.cta.label} <span aria-hidden>→</span>
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </DesktopNav>

        <div className="flex items-center gap-2">
          <Link href="/contact" className="btn btn-outline hidden !px-4 !py-2 sm:inline-flex lg:hidden xl:inline-flex">
            Contact Us
          </Link>
          <Link href="/apply-for-internship" className="btn btn-primary hidden !px-4 !py-2 sm:inline-flex">
            Apply Now
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
