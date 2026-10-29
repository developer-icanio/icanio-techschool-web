"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

// Horizontal slider: native scroll with snap points (swipe on phones, arrows
// on desktop). Every slide is in the HTML, so search engines and AI crawlers
// read all of them. `relative` keeps absolutely positioned bits (screen-reader
// labels) inside the scroll box, so off-screen slides never widen the page.
//
// It also moves on its own, one card every few seconds, looping back to the
// start. It pauses while the pointer is over it, while it has keyboard focus
// or is being touched, while it is off screen and while the tab is hidden; a
// pause button stops it for good (WCAG 2.2.2). Visitors who ask for reduced
// motion get no automatic movement.

const DELAY = 4000;

const smooth = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** One card forward or back (or nearly a screen with page); wraps at the ends. */
function move(el: HTMLElement, dir: 1 | -1, page = false) {
  const card = el.querySelector("li")?.getBoundingClientRect().width ?? el.clientWidth;
  const by = page ? el.clientWidth * 0.9 : card + 24;
  const end = el.scrollWidth - el.clientWidth - 4;
  const behavior = smooth() ? "smooth" : "auto";
  if (dir === 1 && el.scrollLeft >= end) el.scrollTo({ left: 0, behavior });
  else if (dir === -1 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior });
  else el.scrollBy({ left: dir * by, behavior });
}

export default function Carousel({ label, children, dark, perView = "lg:w-[calc((100%-48px)/3)]" }: { label: string; children: ReactNode; dark?: boolean; perView?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false); // the visitor's choice (button)
  const hold = useRef({ hover: false, focus: false, touch: false, visible: true });

  const step = (dir: 1 | -1, page = false) => track.current && move(track.current, dir, page);

  useEffect(() => {
    const el = track.current;
    if (!el || paused || !smooth()) return;
    // Nothing to move when every card already fits.
    if (el.scrollWidth <= el.clientWidth + 4) return;
    const io = new IntersectionObserver(([e]) => (hold.current.visible = e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    const id = window.setInterval(() => {
      const h = hold.current;
      if (h.hover || h.focus || h.touch || !h.visible || document.hidden) return;
      move(el, 1);
    }, DELAY);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, [paused]);

  const btn = `grid h-11 w-11 place-items-center rounded-full border transition ${dark ? "border-white/40 text-white hover:bg-white hover:text-navy" : "border-navy/30 bg-white text-navy hover:bg-navy hover:text-white"}`;
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => (hold.current.hover = true)}
      onMouseLeave={() => (hold.current.hover = false)}
      // Keyboard focus on a card holds the slide; focus on the arrows or the
      // play/pause button does not (pressing Play must start it moving).
      onFocus={(e) => (hold.current.focus = Boolean(track.current?.contains(e.target as Node)))}
      onBlur={(e) => !track.current?.contains(e.relatedTarget as Node) && (hold.current.focus = false)}
      onTouchStart={() => (hold.current.touch = true)}
      onTouchEnd={() => window.setTimeout(() => (hold.current.touch = false), DELAY)}
    >
      <ul ref={track} className="relative -mx-1 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Children.map(children, (c) => (
          <li className={`w-[85%] shrink-0 snap-start sm:w-[calc((100%-24px)/2)] ${perView}`}>{c}</li>
        ))}
      </ul>
      <div className="mt-4 flex justify-center gap-3">
        <button type="button" onClick={() => step(-1, true)} className={btn} aria-label="Previous">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="m12.5 4.5-5.5 5.5 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" onClick={() => setPaused(!paused)} className={btn} aria-label={paused ? "Play the slideshow" : "Pause the slideshow"} aria-pressed={paused}>
          {paused ? (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M7 5.5v9l7.5-4.5L7 5.5Z" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          )}
        </button>
        <button type="button" onClick={() => step(1, true)} className={btn} aria-label="Next">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="m7.5 4.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
