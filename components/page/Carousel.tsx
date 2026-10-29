"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

// Horizontal slider that runs continuously, like a ticker. Every slide is in
// the HTML once, so search engines and AI crawlers read each of them once;
// for a seamless loop the browser adds a second copy (aria-hidden, inert)
// after the page loads. `relative` keeps absolutely positioned bits
// (screen-reader labels) inside the scroll box, so slides never widen the page.
//
// It pauses while the pointer is over it, while a card has keyboard focus or
// is being touched, while it is off screen and while the tab is hidden; a
// pause button stops it for good (WCAG 2.2.2). Visitors who ask for reduced
// motion get no automatic movement and no copy.

const SPEED = 40; // pixels per second

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Carousel({ label, children, dark, perView = "lg:w-[calc((100%-48px)/3)]" }: { label: string; children: ReactNode; dark?: boolean; perView?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false); // the visitor's choice (button)
  const [loop, setLoop] = useState(false); // second copy rendered for a seamless loop
  const hold = useRef({ hover: false, focus: false, touch: false, visible: true });
  const items = Children.toArray(children);

  // Add the copy only when it can run: motion allowed and the cards overflow.
  useEffect(() => {
    const el = track.current;
    if (!el || reducedMotion()) return;
    const check = () => setLoop((on) => on || el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el || paused || !loop || reducedMotion()) return;
    const io = new IntersectionObserver(([e]) => (hold.current.visible = e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    let pos = el.scrollLeft; // fractional position; scrollLeft rounds
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64); // no big jump after a background pause
      last = now;
      const h = hold.current;
      if (h.hover || h.focus || h.touch || !h.visible || document.hidden) {
        pos = el.scrollLeft; // follow manual swipes and arrow clicks while held
      } else {
        // Width of one full set of cards: where the copy starts.
        const copy = el.querySelector<HTMLElement>("li[data-copy]");
        const set = copy ? copy.offsetLeft - (el.firstElementChild as HTMLElement).offsetLeft : el.scrollWidth;
        pos += (SPEED * dt) / 1000;
        if (pos >= set) pos -= set; // the copy looks identical, so no visible jump
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [paused, loop]);

  // Arrows move nearly a screen; the ticker carries on from there.
  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const li = `w-[85%] shrink-0 sm:w-[calc((100%-24px)/2)] ${perView}`;
  const btn = `grid h-11 w-11 place-items-center rounded-full border transition ${dark ? "border-white/40 text-white hover:bg-white hover:text-navy" : "border-navy/30 bg-white text-navy hover:bg-navy hover:text-white"}`;
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => (hold.current.hover = true)}
      onMouseLeave={() => (hold.current.hover = false)}
      // Keyboard focus on a card holds it; focus on the arrows or the
      // play/pause button does not (pressing Play must start it moving).
      onFocus={(e) => (hold.current.focus = Boolean(track.current?.contains(e.target as Node)))}
      onBlur={(e) => !track.current?.contains(e.relatedTarget as Node) && (hold.current.focus = false)}
      onTouchStart={() => (hold.current.touch = true)}
      onTouchEnd={() => window.setTimeout(() => (hold.current.touch = false), 3000)}
    >
      <ul ref={track} className="relative -mx-1 flex gap-6 overflow-x-auto px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((c, i) => (
          <li key={i} className={li}>{c}</li>
        ))}
        {loop &&
          items.map((c, i) => (
            <li key={`copy-${i}`} data-copy={i === 0 ? "" : undefined} aria-hidden inert className={li}>{c}</li>
          ))}
      </ul>
      <div className="mt-4 flex justify-center gap-3">
        <button type="button" onClick={() => page(-1)} className={btn} aria-label="Previous">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="m12.5 4.5-5.5 5.5 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" onClick={() => setPaused(!paused)} className={btn} aria-label={paused ? "Play the slideshow" : "Pause the slideshow"} aria-pressed={paused}>
          {paused ? (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M7 5.5v9l7.5-4.5L7 5.5Z" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><path d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          )}
        </button>
        <button type="button" onClick={() => page(1)} className={btn} aria-label="Next">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden><path d="m7.5 4.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
