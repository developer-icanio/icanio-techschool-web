import type { ReactNode } from "react";
import type { Tone } from "@/lib/content/types";

const TONES: Record<Tone, string> = {
  white: "bg-white",
  soft: "bg-soft",
  navy: "bg-navy-2 text-white [&_h2]:text-white [&_h3]:text-white",
};

export function Section({ id, tone = "white", children, className = "" }: { id?: string; tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`${TONES[tone]} py-16 lg:py-20 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export function SectionHead({ eyebrow, heading, intro, tone = "white", align = "center" }: { eyebrow?: string; heading: string; intro?: string; tone?: Tone; align?: "center" | "left" }) {
  const dark = tone === "navy";
  return (
    <div className={`mb-10 lg:mb-12 ${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}`}>
      {eyebrow && <p className={`mb-3 text-sm font-semibold uppercase tracking-wider ${dark ? "text-cyan" : "text-navy"}`}>{eyebrow}</p>}
      <h2 className="text-[28px] font-bold leading-tight sm:text-[32px]">{heading}</h2>
      {intro && <p className={`mt-4 text-lg leading-relaxed ${dark ? "text-white/85" : "text-body"}`}>{intro}</p>}
    </div>
  );
}
