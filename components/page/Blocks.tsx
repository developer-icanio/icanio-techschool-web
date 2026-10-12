import Image from "next/image";
import Link from "next/link";
import LeadForm from "@/components/forms/LeadForm";
import { partners, storiesFor, testimonials } from "@/lib/content/pages";
import type { Block, Img } from "@/lib/content/types";
import { asset } from "@/lib/images";
import { SITE } from "@/lib/site";
import { Section, SectionHead } from "./Section";

function Pic({ img, className = "", sizes = "(min-width: 1024px) 50vw, 100vw", priority }: { img: Img; className?: string; sizes?: string; priority?: boolean }) {
  const a = asset(img.src);
  return <Image src={a.src} alt={img.alt} width={a.w ?? img.w ?? 1200} height={a.h ?? img.h ?? 800} sizes={sizes} priority={priority} className={className} />;
}

/**
 * Fixed frame that always shows the whole image (no cropping). Spare space is
 * filled with a soft, blurred copy of the same image so grids stay tidy.
 */
function Fit({ img, ratio, className = "", sizes = "(min-width: 1024px) 33vw, 100vw" }: { img: Img; ratio: string; className?: string; sizes?: string }) {
  const a = asset(img.src);
  return (
    <div className={`relative w-full overflow-hidden bg-soft ${className}`} style={{ aspectRatio: ratio }}>
      <Image src={a.src} alt="" aria-hidden fill sizes="64px" className="scale-110 object-cover opacity-40 blur-2xl" />
      <Image src={a.src} alt={img.alt} fill sizes={sizes} className="object-contain" />
    </div>
  );
}

function Icon({ name, className = "h-12 w-12" }: { name?: string; className?: string }) {
  if (!name) return null;
  const a = asset(name);
  return <Image src={a.src} alt="" width={a.w ?? 48} height={a.h ?? 48} className={`${className} object-contain`} />;
}

const Check = ({ light }: { light?: boolean }) => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden className={`mt-0.5 shrink-0 ${light ? "text-cyan" : "text-navy"}`}>
    <circle cx="10" cy="10" r="9" fill="currentColor" opacity=".12" />
    <path d="m6 10.2 2.6 2.6L14 7.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

export function BlockView({ b }: { b: Block }) {
  const tone = b.tone ?? "white";
  const dark = tone === "navy";
  const head = <SectionHead eyebrow={b.eyebrow} heading={b.heading} intro={b.intro} tone={tone} />;

  switch (b.type) {
    case "prose": {
      const text = (
        <div>
          {b.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">{b.eyebrow}</p>}
          <h2 className="text-[28px] font-bold leading-tight sm:text-[32px]">{b.heading}</h2>
          {b.intro && <p className="mt-4 text-lg font-medium leading-relaxed text-heading">{b.intro}</p>}
          <div className={`prose-body mt-4 text-[17px] leading-relaxed ${dark ? "text-white/85" : "text-body"}`}>
            {b.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {b.bullets && (
            <ul className="mt-5 space-y-2.5">
              {b.bullets.map((x) => <li key={x} className="flex gap-2.5 text-[16px] leading-relaxed"><Check light={dark} />{x}</li>)}
            </ul>
          )}
          {b.link && <Link href={b.link.href} className="btn btn-outline mt-6">{b.link.label}</Link>}
        </div>
      );
      return (
        <Section id={b.id} tone={tone}>
          {b.image ? (
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={b.reverse ? "lg:order-2" : ""}><Pic img={b.image} className="h-auto w-full rounded-[20px]" /></div>
              {text}
            </div>
          ) : (
            <div className="mx-auto max-w-4xl">{text}</div>
          )}
        </Section>
      );
    }

    case "cards":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ul className={`grid gap-5 ${cols[b.columns ?? 3]}`}>
            {b.items.map((c) => {
              // Small icons sit above the title; the live site's larger corner art sits bottom-right.
              const art = c.icon ? (asset(c.icon).w ?? 0) > 100 : false;
              const inner = (
                <>
                  {c.image && <Fit img={c.image} ratio="4 / 3" className="mb-5 rounded-[14px]" />}
                  {c.icon && !art && <Icon name={c.icon} className="mb-4 h-12 w-12" />}
                  {c.meta && <p className="mb-2 self-start rounded-full bg-soft-2 px-2.5 py-0.5 text-xs font-semibold text-navy">{c.meta}</p>}
                  <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
                  <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-body"}`}>{c.body}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    {c.href ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy">Learn more <span aria-hidden>→</span></span> : <span />}
                    {art && <Icon name={c.icon} className="-mb-3 -mr-3 h-20 w-20" />}
                  </div>
                </>
              );
              const cls = `flex h-full flex-col rounded-2xl border p-6 transition ${dark ? "border-white/15 bg-white/5" : "border-line bg-white hover:border-navy/40 hover:shadow-lg hover:shadow-slate-900/5"}`;
              return <li key={c.title}>{c.href ? <Link href={c.href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
            })}
          </ul>
        </Section>
      );

    case "steps":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ol className={`grid gap-6 ${b.items.length === 5 ? "sm:grid-cols-2 lg:grid-cols-5" : b.items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
            {b.items.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-bold ${dark ? "bg-white text-navy" : "bg-navy text-white"}`}>{i + 1}</span>
                  {s.label && <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-cyan" : "text-navy"}`}>{s.label}</span>}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-body"}`}>{s.body}</p>
              </li>
            ))}
          </ol>
        </Section>
      );

    case "phases":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ol className="grid gap-5 md:grid-cols-2">
            {b.items.map((ph) => (
              <li key={ph.label} className="rounded-2xl border border-line bg-white p-6 lg:p-7">
                <p className="inline-block rounded bg-gradient-to-r from-cyan to-blue px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">{ph.label}</p>
                <h3 className="mt-3 text-xl font-semibold">{ph.title}</h3>
                <ul className="mt-4 space-y-2">
                  {ph.points.map((x) => <li key={x} className="flex gap-2.5 text-[15px] leading-relaxed text-body"><Check />{x}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        </Section>
      );

    case "tools":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {b.items.map((t) => (
              <li key={t.name} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
                {t.logo ? <Icon name={t.logo} className="h-10 w-10" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-soft-2 text-sm font-bold text-navy">{t.name.slice(0, 2)}</span>}
                <div>
                  <h3 className="text-[15px] font-semibold leading-tight">{t.name}</h3>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      );

    case "table":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead className="bg-navy text-white">
                <tr>{b.columns.map((c) => <th key={c} scope="col" className="px-5 py-3.5 font-semibold">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {b.rows.map((r) => (
                  <tr key={r[0]} className="even:bg-soft/60">
                    {r.map((cell, i) => i === 0 ? <th key={i} scope="row" className="px-5 py-3.5 font-semibold text-heading">{cell}</th> : <td key={i} className="px-5 py-3.5 text-body">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.note && <p className="mt-4 text-sm text-muted">{b.note}</p>}
        </Section>
      );

    case "checklist":
      return (
        <Section id={b.id} tone={tone}>
          <div className={b.image ? "grid items-center gap-10 lg:grid-cols-2 lg:gap-16" : ""}>
            <div>
              <SectionHead eyebrow={b.eyebrow} heading={b.heading} intro={b.intro} tone={tone} align={b.image ? "left" : "center"} />
              <ul className={`grid gap-3 ${b.image ? "" : "mx-auto max-w-4xl sm:grid-cols-2"}`}>
                {b.items.map((x) => (
                  <li key={x} className={`flex gap-3 rounded-xl p-4 text-[15px] leading-relaxed ${dark ? "bg-white/5" : "border border-line bg-white"}`}><Check light={dark} />{x}</li>
                ))}
              </ul>
            </div>
            {b.image && <Pic img={b.image} className="h-auto w-full rounded-[20px]" />}
          </div>
        </Section>
      );

    case "stats":
      return (
        <section id={b.id} className="bg-navy-2 bg-[linear-gradient(90deg,#00264c_0%,#00366c_100%)] py-14 text-white">
          <div className="shell">
            <h2 className="mx-auto mb-8 max-w-4xl text-center text-[26px] font-semibold !text-white sm:text-[30px]">{b.heading}</h2>
            {b.intro && <p className="-mt-4 mb-8 text-center text-white/80">{b.intro}</p>}
            <ul className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
              {b.items.map((s) => (
                <li key={s.label}>
                  <p className="text-4xl font-semibold sm:text-5xl">{s.value}</p>
                  <p className="mt-2 text-sm text-white/80 sm:text-base">{s.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      );

    case "partners": {
      const list = partners().slice(0, b.limit ?? 99);
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {list.map((c) => (
              <li key={c.name} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                <Icon name={c.logo} className="h-11 w-11 shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-heading">{c.name}</p>
                  <p className="text-xs text-muted">{c.city}</p>
                </div>
              </li>
            ))}
          </ul>
          {b.limit && b.limit < partners().length && (
            <p className="mt-8 text-center"><Link href="/partner-colleges" className="btn btn-outline">See all {partners().length} partner colleges</Link></p>
          )}
        </Section>
      );
    }

    case "testimonials":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials(b.ids).map((t) => (
              <li key={t.name} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                <video controls preload="none" poster={asset(t.photo).src} className="aspect-[4/5] w-full bg-midnight object-contain" aria-label={`Video testimonial from ${t.name}`}>
                  <source src={asset(t.video).src} type="video/mp4" />
                </video>
                <figure className="flex flex-1 flex-col p-5">
                  <blockquote className="flex-1 text-[15px] leading-relaxed text-body">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <Image src={asset(t.photo).src} alt={`${t.name}, ${t.role} at ${SITE.name}`} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                    <span>
                      <span className="block text-sm font-semibold text-heading">{t.name}</span>
                      <span className="block text-xs text-muted">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Section>
      );

    case "stories":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {storiesFor(b.track, b.limit, b.ids).map((s) => (
              <li key={s.name} className="overflow-hidden rounded-2xl border border-line bg-white">
                <Fit img={{ src: s.photo, alt: `${s.name}, ${s.track} intern at ${SITE.name}` }} ratio="4 / 5" />
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy">{s.track} · {s.duration}</p>
                  <h3 className="mt-1.5 text-base font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-body">{s.degree}, {s.college}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      );

    case "gallery":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {b.items.map((g) => (
              <li key={g.src}>
                <figure className="h-full overflow-hidden rounded-2xl border border-line bg-white">
                  <Fit img={g} ratio="4 / 3" />
                  <figcaption className="p-4 text-sm leading-relaxed text-body">{g.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Section>
      );

    case "links":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {b.items.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 transition hover:border-navy/40 hover:shadow-lg hover:shadow-slate-900/5">
                  <h3 className="flex items-start justify-between gap-2 text-base font-semibold group-hover:text-navy">{l.title}<span aria-hidden className="text-navy transition group-hover:translate-x-0.5">→</span></h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{l.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      );

    case "form":
      return (
        <Section id={b.id ?? "apply"} tone={tone}>
          <div className="grid gap-10 rounded-[20px] bg-soft-3 p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
            <div>
              {b.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">{b.eyebrow}</p>}
              <h2 className="text-[28px] font-bold leading-tight sm:text-[32px]">{b.heading}</h2>
              {b.intro && <p className="mt-4 text-lg leading-relaxed text-body">{b.intro}</p>}
              {b.points && (
                <ul className="mt-6 space-y-2.5">
                  {b.points.map((x) => <li key={x} className="flex gap-2.5 text-[15px] leading-relaxed"><Check />{x}</li>)}
                </ul>
              )}
              <div className="mt-8 space-y-2 text-[15px]">
                <p className="font-semibold text-heading">Talk with our team</p>
                <p><a href={`mailto:${b.form === "student" ? SITE.internshipEmail : SITE.email}`} className="text-navy hover:underline">{b.form === "student" ? SITE.internshipEmail : SITE.email}</a></p>
                <p><a href={`tel:${SITE.telephone}`} className="text-navy hover:underline">{SITE.phone}</a></p>
              </div>
            </div>
            <LeadForm kind={b.form} />
          </div>
        </Section>
      );
  }
}
