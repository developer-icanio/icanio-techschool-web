import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbsOf } from "@/lib/content/pages";
import { contactEmail, contactLine, FAQ_HEADING, REFERENCES_HEADING, schemasOf, TAKEAWAYS_HEADING } from "@/lib/content/seo-document";
import type { PageContent } from "@/lib/content/types";
import { asset } from "@/lib/images";
import { SITE } from "@/lib/site";
import { BlockView } from "./Blocks";
import { Section } from "./Section";

// Render order must match markdownOf() in lib/content/seo-document.ts:
// hero > facts > answer > sections > FAQ > takeaways > conclusion > references > CTA.

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function Hero({ p }: { p: PageContent }) {
  const h = p.hero;
  const img = asset(h.image.src);
  const home = p.kind === "home";
  const crumbs = breadcrumbsOf(p);
  // Headline: wrap "Icanio" in the live site's gradient.
  const title = h.title.split(/(Icanio)/).map((part, i) => (part === "Icanio" ? <span key={i} className={home ? "text-gradient" : ""}>{part}</span> : part));

  return (
    <section className={home ? "relative overflow-hidden bg-[linear-gradient(180deg,#fff_0%,#f5fbff_100%)]" : "hero-banner text-white"}>
      <div className="shell grid items-center gap-10 pb-14 pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-20 lg:pt-14">
        <div>
          {!home && (
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/85">
                {crumbs.map((c, i) => (
                  <li key={c.href} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden>/</span>}
                    {i < crumbs.length - 1 ? <Link href={c.href} className="hover:text-white hover:underline">{c.name}</Link> : <span aria-current="page" className="text-white">{c.name}</span>}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <p className={`text-sm font-semibold uppercase tracking-wider sm:text-base ${home ? "text-navy" : "text-white/90"}`}>{h.eyebrow}</p>
          <h1 className={`mt-3 text-[34px] font-bold leading-[1.12] sm:text-5xl ${home ? "!text-ink" : "!text-white"}`}>{title}</h1>
          <p className={`mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl ${home ? "text-[#0b0b0b]" : "text-white/90"}`}>{h.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={h.primary.href} className={`btn ${home ? "btn-primary" : "btn-white"}`}>{h.primary.label}</Link>
            {h.secondary && <Link href={h.secondary.href} className={`btn ${home ? "btn-outline" : "btn-ghost-white"}`}>{h.secondary.label}</Link>}
          </div>
          {h.highlights && (
            <ul className={`mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium ${home ? "text-heading" : "text-white/90"}`}>
              {h.highlights.map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className={home ? "text-navy" : "text-white"}><path d="m3.5 8.2 3 3 6-6.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  {x}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Image src={img.src} alt={h.image.alt} width={img.w ?? 1200} height={img.h ?? 900} priority sizes="(min-width: 1024px) 45vw, (min-width: 640px) 576px, 88vw" quality={70} className="mx-auto h-auto w-full max-w-xl" style={img.w ? { maxWidth: Math.min(img.w, 576) } : undefined} />
      </div>
    </section>
  );
}

export default function PageView({ p }: { p: PageContent }) {
  const s = schemasOf(p);
  return (
    <main>
      {[s.webpage, s.faq, s.breadcrumb, s.offer].filter(Boolean).map((d, i) => <JsonLd key={i} data={d!} />)}
      <Hero p={p} />

      {p.facts && (
        <div className="shell relative z-10 -mt-8">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-lg shadow-slate-900/5 lg:grid-cols-4">
            {p.facts.map((f) => (
              <div key={f.label} className="bg-white px-5 py-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{f.label}</dt>
                <dd className="mt-1 text-[15px] font-semibold text-heading">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <Section id="answer">
        <div className="mx-auto max-w-4xl rounded-[20px] border-l-4 border-navy bg-soft-3 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy">Quick answer</p>
          <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-[28px]">{p.answer.question}</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-body">{p.answer.answer}</p>
          <p className="mt-4 text-xs text-muted">
            By {SITE.author} · Updated <time dateTime={p.seo.updatedAt}>{fmt(p.seo.updatedAt)}</time>
          </p>
        </div>
      </Section>

      {p.sections.map((b, i) => <BlockView key={i} b={b} email={contactEmail(p)} />)}

      {p.faqs.length > 0 && (
        <Section id="faq" tone="soft">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-[28px] font-bold sm:text-[32px]">{FAQ_HEADING}</h2>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {p.faqs.map((f, i) => (
                <details key={f.q} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4 sm:px-6">
                    <h3 className="text-base font-semibold leading-snug sm:text-[17px]">{f.q}</h3>
                    <span aria-hidden className="mt-0.5 text-xl leading-none text-navy transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-body sm:px-6">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section id="takeaways">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-[20px] bg-midnight p-7 text-white sm:p-9">
            <h2 className="text-2xl font-bold !text-white">{TAKEAWAYS_HEADING}</h2>
            <ul className="mt-5 space-y-3">
              {p.takeaways.map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-white/90">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Conclusion</h2>
            <div className="prose-body mt-4 text-[16px] leading-relaxed text-body">
              {p.conclusion.map((c, i) => <p key={i}>{c}</p>)}
            </div>
            {p.references.length > 0 && (
              <div className="mt-8 border-t border-line pt-6">
                <h2 className="text-base font-semibold">{REFERENCES_HEADING}</h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {p.references.map((r) => (
                    <li key={r.href}><a href={r.href} rel="noopener" target="_blank" className="text-navy hover:underline">{r.label}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Section>

      <section className="bg-soft-2 py-14">
        <div className="shell flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <h2 className="text-[28px] font-bold sm:text-[34px]">{p.cta.title}</h2>
            <p className="mt-3 text-lg text-body">{p.cta.body}</p>
            <p className="mt-3 text-sm text-muted">{contactLine(p)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href={p.cta.primary.href} className="btn btn-primary">{p.cta.primary.label}</Link>
            {p.cta.secondary && <Link href={p.cta.secondary.href} className="btn btn-outline">{p.cta.secondary.label}</Link>}
          </div>
        </div>
      </section>
    </main>
  );
}
