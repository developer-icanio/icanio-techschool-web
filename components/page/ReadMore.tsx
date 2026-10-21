"use client";

import { useState } from "react";

/** Long quote clamped to a few lines, with a toggle to read the rest. */
export default function ReadMore({ text, lines = 6 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="text-[15px] leading-relaxed text-body" style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {text}
      </p>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 self-start text-sm font-semibold text-navy hover:underline">
        {open ? "Show less" : "Read more"}
      </button>
    </>
  );
}
