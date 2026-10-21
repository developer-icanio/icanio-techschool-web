"use client";

import { Children, useRef, type ReactNode } from "react";

// Horizontal slider: native scroll with snap points (swipe on phones, arrows
// on desktop). Every slide is in the HTML, so search engines and AI crawlers
// read all of them. `relative` keeps absolutely positioned bits (screen-reader
// labels) inside the scroll box, so off-screen slides never widen the page.
export default function Carousel({ label, children, dark, perView = "lg:w-[calc((100%-48px)/3)]" }: { label: string; children: ReactNode; dark?: boolean; perView?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };
  const btn = `grid h-11 w-11 place-items-center rounded-full border transition ${dark ? "border-white/40 text-white hover:bg-white hover:text-navy" : "border-navy/30 bg-white text-navy hover:bg-navy hover:text-white"}`;
  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <ul ref={track} className="relative -mx-1 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Children.map(children, (c) => (
          <li className={`w-[85%] shrink-0 snap-start sm:w-[calc((100%-24px)/2)] ${perView}`}>{c}</li>
        ))}
      </ul>
      <div className="mt-4 flex justify-center gap-3">
        <button type="button" onClick={() => go(-1)} className={btn} aria-label="Previous">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="m12.5 4.5-5.5 5.5 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" onClick={() => go(1)} className={btn} aria-label="Next">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="m7.5 4.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
