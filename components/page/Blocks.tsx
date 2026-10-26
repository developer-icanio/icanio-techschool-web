import Image, { getImageProps } from "next/image";
import Link from "next/link";
import LeadForm from "@/components/forms/LeadForm";
import { experts, partners, reviews, storiesFor, testimonials } from "@/lib/content/pages";
import type { Block, Img } from "@/lib/content/types";
import { asset } from "@/lib/images";
import { SITE } from "@/lib/site";
import { Section, SectionHead } from "./Section";
import BatchDate from "./BatchDate";
import Carousel from "./Carousel";
import ReadMore from "./ReadMore";
import { isTrackIcon, TrackIcon } from "./TrackIcon";

function Pic({ img, className = "", sizes = "(min-width: 1024px) 50vw, 100vw", priority }: { img: Img; className?: string; sizes?: string; priority?: boolean }) {
  const a = asset(img.src);
  const w = a.w ?? img.w ?? 1200;
  const h = a.h ?? img.h ?? 800;
  // Never wider than the file itself: a small image is shown at its real
  // size (centred) instead of being stretched into a blur.
  if (!img.portrait) return <Image src={a.src} alt={img.alt} width={w} height={h} sizes={sizes} priority={priority} className={`mx-auto ${className}`} style={{ maxWidth: w, ...fadeCut(a.cut) }} />;
  // Art direction: the tall crop beside the text on desktop, the wide one on phones.
  const p = asset(img.portrait);
  const desktop = getImageProps({ src: p.src, alt: "", width: p.w ?? 900, height: p.h ?? 1200, sizes });
  const { props: mobile } = getImageProps({ src: a.src, alt: img.alt, width: w, height: h, sizes, priority });
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={desktop.props.srcSet} width={p.w} height={p.h} />
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img {...mobile} className={className} />
    </picture>
  );
}

/**
 * Some design files are cut-outs where an arm or shoulder runs off the edge
 * of the canvas. That edge fades out softly instead of ending on a hard line.
 */
function fadeCut(cut?: ("left" | "right")[]): React.CSSProperties {
  if (!cut?.length) return {};
  const l = cut.includes("left"), r = cut.includes("right");
  const mask = `linear-gradient(90deg, ${l ? "transparent 0%, #000 16%" : "#000 0%"}, ${r ? "#000 84%, transparent 100%" : "#000 100%"})`;
  return { maskImage: mask, WebkitMaskImage: mask };
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
      {/* The whole picture always fits the frame (never cropped). Small
          originals stop at their real size, centred, instead of being
          stretched, which is what made them look blurry. */}
      <Image src={a.src} alt={img.alt} fill sizes={sizes} className="m-auto object-contain" style={a.w && a.h ? { maxWidth: a.w, maxHeight: a.h } : undefined} />
    </div>
  );
}

/** True when every card has a large illustration (the old site's track art). */
const gridArt = (items: { icon?: string }[]) => items.length > 0 && items.every((c) => c.icon && !isTrackIcon(c.icon) && (asset(c.icon).w ?? 0) >= 200);

/**
 * Card photo frame: when every photo in the grid has the same shape, the
 * frame takes that shape so the photo fills it edge to edge; mixed grids use
 * 4:3 so the cards stay level (photos are fitted whole either way).
 */
function frameRatio(items: { image?: Img }[]) {
  const r = items.filter((c) => c.image).map((c) => { const a = asset(c.image!.src); return a.w && a.h ? a.w / a.h : 0; });
  if (!r.length || r.some((x) => !x || Math.abs(x - r[0]) > 0.02)) return "4 / 3";
  return String(Math.min(Math.max(r[0], 1), 16 / 9));
}

/** Gallery frame: tall frames when every photo is portrait or square (posters), else 4:3. */
function galleryFrame(items: Img[]) {
  const tall = items.every((g) => { const a = asset(g.src); return a.w && a.h && a.w / a.h <= 1.02; });
  return tall ? "4 / 5" : "4 / 3";
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** A resized copy from Next's image optimiser, for places next/image can't go (video posters). */
const thumb = (src: string, w: 384 | 640 | 828) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=70`;

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

export function BlockView({ b, email = SITE.email }: { b: Block; email?: string }) {
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
          <ul className={`grid gap-5 ${b.items.length === 3 || b.items.length === 6 ? cols[3].replace(" 2xl:grid-cols-4", "") : cols[b.columns ?? 3]}`}>
            {b.items.map((c) => {
              // One placement per grid so cards never look swapped: corner art
              // only when every card in the grid carries a large illustration.
              const art = gridArt(b.items);
              const frame = frameRatio(b.items);
              const inner = (
                <>
                  {c.image && <Fit img={c.image} ratio={frame} className="mb-5 rounded-[14px]" />}
                  {(() => {
                    // Track icons sit at the bottom right instead (see below).
                    const icon = c.icon && !art && !isTrackIcon(c.icon) ? <Icon name={c.icon} className="mb-4 h-12 w-12" /> : null;
                    const pill = c.meta && <p className={`rounded-full px-2.5 py-0.5 text-xs font-semibold bg-soft-2 text-navy ${icon ? "mb-4" : "mb-2 self-start"}`}>{c.meta}</p>;
                    // Icon and category share one row, so every title starts at the same height.
                    return icon && pill ? <div className="flex items-start justify-between gap-3">{icon}{pill}</div> : <>{icon}{pill}</>;
                  })()}
                  <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
                  <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-body"}`}>{c.body}</p>
                  <div className={`mt-auto flex justify-between gap-3 pt-4 ${art ? "items-end" : "items-center"}`}>
                    {c.href ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy">Learn more <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span></span> : <span />}
                    {art && <Icon name={c.icon} className="-mb-3 -mr-3 h-20 w-20" />}
                    {!art && isTrackIcon(c.icon) && <TrackIcon name={c.icon!} dark={dark} />}
                  </div>
                </>
              );
              const cls = `group flex h-full flex-col rounded-2xl border p-6 transition duration-200 ${dark ? "border-white/15 bg-white/5" : `border-line bg-white ${c.href ? "hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-lg hover:shadow-slate-900/5 motion-reduce:hover:translate-y-0" : ""}`}`;
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
                  <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-cyan" : "text-navy"}`}>{s.label ?? `Step ${i + 1}`}</span>
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
          {/* Centred rows: a short list (or the last row) sits in the middle, not hard left. */}
          <ul className="flex flex-wrap justify-center gap-4">
            {b.items.map((t) => (
              <li key={t.name} className="flex w-[calc(50%-8px)] items-center gap-3 rounded-xl border border-line bg-white p-4 sm:w-[calc(33.333%-10.667px)] lg:w-[calc(25%-12px)]">
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
            {b.image && <div className={b.reverse ? "lg:order-first" : ""}><Pic img={b.image} className="h-auto w-full rounded-[20px]" /></div>}
          </div>
        </Section>
      );

    case "stats":
      return (
        <section id={b.id} className="bg-navy-2 bg-[linear-gradient(90deg,#00264c_0%,#00366c_100%)] py-14 text-white">
          <div className="shell">
            <h2 className="mx-auto mb-8 max-w-4xl text-center text-[26px] font-semibold !text-white sm:text-[30px]">{b.heading}</h2>
            {b.intro && <p className="-mt-4 mb-8 text-center text-white/80">{b.intro}</p>}
            <ul className={`grid gap-8 text-center ${b.items.length === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
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
                <video controls preload="none" poster={thumb(asset(t.photo).src, 640)} className="aspect-square w-full bg-midnight object-contain" aria-label={`Video testimonial from ${t.name}`}>
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
          <ul className={`grid gap-5 sm:grid-cols-2 ${b.items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {b.items.map((g) => (
              <li key={g.src}>
                <figure className="h-full overflow-hidden rounded-2xl border border-line bg-white">
                  <Fit img={g} ratio={galleryFrame(b.items)} />
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

    case "batches":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <Carousel label={b.heading} dark={dark}>
            {b.items.map((x) => (
              <article key={x.title} className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm shadow-slate-900/5">
                <ul className="flex flex-wrap gap-2" aria-label="Modes">
                  {b.modes.map((m) => (
                    <li key={m} className="flex items-center gap-1.5 rounded-full bg-soft-2 px-3 py-1 text-xs font-semibold text-navy"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-navy" />{m}</li>
                  ))}
                </ul>
                <h3 className="mt-5 text-lg font-bold uppercase tracking-wide text-heading">{x.title}</h3>
                <p className="mt-3 flex items-center gap-2 text-[15px] text-body">
                  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden className="text-navy"><rect x="3" y="4.5" width="14" height="12.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  <span><span className="sr-only">Next batch starts </span><BatchDate weekday={b.weekday} weekOffset={x.weekOffset} /></span>
                </p>
                {/* Timing is optional: no clock line when it is left empty in the dashboard. */}
                {b.time?.trim() && (
                  <p className="mt-2 flex items-center gap-2 text-[15px] text-body">
                    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden className="text-navy"><circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6v4.2l2.8 1.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    {b.time.trim()}
                  </p>
                )}
                <Link href={x.href} className="btn btn-outline mt-6 w-full justify-center">Apply now for this internship</Link>
              </article>
            ))}
          </Carousel>
        </Section>
      );

    case "reviews":
      return (
        <Section id={b.id} tone={tone}>
          {head}
          <Carousel label={b.heading} dark={dark}>
            {reviews(b.ids).map((r) => (
              <figure key={r.id} className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm shadow-slate-900/5">
                <figcaption className="flex items-start gap-4">
                  {r.photo ? (
                    <Image src={asset(r.photo).src} alt={`${r.name}, ${r.track} at ${SITE.name}`} width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-soft-2 text-lg font-bold text-navy">{initials(r.name)}</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-snug text-heading">{r.name}</p>
                    <p className="mt-0.5 text-sm text-muted">{r.college}</p>
                    <p className="mt-2 inline-block rounded-full bg-soft-2 px-2.5 py-0.5 text-xs font-semibold text-navy">{r.track}</p>
                  </div>
                </figcaption>
                <blockquote className="mt-5 flex flex-1 flex-col">
                  <ReadMore text={r.quote} />
                </blockquote>
              </figure>
            ))}
          </Carousel>
        </Section>
      );

    case "experts":
      // Brand-blue section; the photo cards keep their white studio background.
      return (
        <Section id={b.id} tone="navy" className="!bg-[linear-gradient(180deg,#00264c_0%,#004589_100%)]">
          <SectionHead eyebrow={b.eyebrow} heading={b.heading} intro={b.intro} tone="navy" />
          <Carousel label={b.heading} dark perView="lg:w-[calc((100%-72px)/4)]">
            {experts(b.ids).map((e) => (
              <article key={e.id} tabIndex={0} className="group relative aspect-[720/764] overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-950/30 ring-1 ring-white/20 outline-none focus-visible:ring-2 focus-visible:ring-cyan">
                {e.photo ? (
                  <Image src={asset(e.photo).src} alt={`${e.name}, ${e.role} at ${SITE.parent.name}`} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 85vw" className="object-contain object-bottom" />
                ) : (
                  <span aria-hidden className="absolute left-1/2 top-[38%] grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-navy text-3xl font-bold text-white">{initials(e.name)}</span>
                )}
                {/* Name and role over a soft dark fade, like the original design. */}
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent_0%,rgba(4,22,48,.82)_70%)] px-5 pb-4 pt-16 text-right">
                  <h3 className="text-base font-semibold !text-white">{e.name}</h3>
                  <p className="text-xs text-white/85">{e.role}</p>
                </div>
                <div className="absolute inset-0 flex flex-col justify-center bg-white/95 p-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100 motion-reduce:transition-none">
                  <p className="text-lg font-semibold text-heading">{e.name}</p>
                  <p className="mt-1 text-sm text-muted">{e.role}</p>
                  <p className="mt-4 text-[15px] leading-relaxed text-body">{e.bio}</p>
                </div>
              </article>
            ))}
          </Carousel>
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
                <p><a href={`mailto:${email}`} className="text-navy hover:underline">{email}</a></p>
                <p><a href={`tel:${SITE.telephone}`} className="text-navy hover:underline">{SITE.phone}</a></p>
              </div>
            </div>
            <LeadForm kind={b.form} />
          </div>
        </Section>
      );
  }
}
