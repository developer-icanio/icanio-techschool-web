"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CAREERS, NAV } from "@/lib/nav";

export default function MobileMenu() {
  const path = usePathname();
  // Remember which page the menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (v: boolean) => setOpenOn(v ? path : null);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
        className="grid h-10 w-10 place-items-center rounded border-2 border-navy text-navy"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          {open ? (
            <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" />
          )}
        </svg>
      </button>
      {/* Portal: the header's backdrop-filter would otherwise trap this fixed panel. */}
      {open && createPortal(
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-18 z-[45] overflow-y-auto bg-white px-4 pb-28 pt-2">
          <ul className="divide-y divide-line">
            {NAV.map((g) => (
              <li key={g.label}>
                <details className="group py-1">
                  <summary className="flex cursor-pointer items-center justify-between py-3 text-base font-semibold text-heading">
                    {g.label}
                    <span aria-hidden className="text-navy transition group-open:rotate-45">+</span>
                  </summary>
                  {g.columns.map((c) => (
                    <div key={c.title} className="pb-3">
                      <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-navy">{c.title}</p>
                      <ul>
                        {c.links.map((l) => (
                          <li key={l.href + l.label}>
                            <Link href={l.href} className="block rounded px-1 py-2 text-[15px] text-body">
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </details>
              </li>
            ))}
            <li>
              <a href={CAREERS.href} className="flex items-center justify-between py-4 text-base font-semibold text-heading">
                {CAREERS.label}
                <span aria-hidden className="text-navy">→</span>
              </a>
            </li>
          </ul>
          <div className="mt-6 grid gap-3">
            <Link href="/apply-for-internship" className="btn btn-primary">Apply for an internship</Link>
            <Link href="/contact" className="btn btn-outline">Contact Us</Link>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
