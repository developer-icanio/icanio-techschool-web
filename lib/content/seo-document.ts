import { asset } from "@/lib/images";
import { SITE, sameAs } from "@/lib/site";
import type { BlogPost } from "@/types/blog";
import { breadcrumbsOf, experts, getPage, pagesUnder, partners, reviews, storiesFor, testimonials } from "./pages";
import type { Block, PageContent } from "./types";

// (1) JSON-LD for a page and (2) a markdown mirror of its visible copy in
// render order, which lib/seo scores. Keep the order here in sync with
// components/page/PageView.tsx.

const abs = (p: string) => `${SITE.url}${p === "/" ? "" : p}`;
const orgId = `${SITE.url}/#organization`;

/** Internship pages use the internship inbox; every other page the tech school inbox. */
export const isInternshipPage = (p: Pick<PageContent, "kind" | "path">) => p.kind === "internship" || p.path === "/internships" || p.path === "/apply-for-internship";
export const contactEmail = (p: Pick<PageContent, "kind" | "path">) => (isInternshipPage(p) ? SITE.internshipEmail : SITE.email);
export const contactLine = (p: Pick<PageContent, "kind" | "path">) => `Contact our team at ${contactEmail(p)} or call ${SITE.phone}, ${SITE.hours}.`;
export const FAQ_HEADING = "Frequently Asked Questions";
export const TAKEAWAYS_HEADING = "Key Takeaways";
export const REFERENCES_HEADING = "References and Sources";

/** Built per render, so contact details edited in /admin/settings show up. */
export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": orgId,
  name: SITE.name,
  alternateName: "Icanio Techschool",
  url: SITE.url,
  logo: abs(SITE.logo),
  email: SITE.email,
  telephone: SITE.telephone,
  description: "Icanio Tech School is the education arm of Icanio Technologies. It runs industry internships, student development programs and college partnership programs in Tamil Nadu, India.",
  address: { "@type": "PostalAddress", ...SITE.address },
  areaServed: { "@type": "State", name: "Tamil Nadu" },
  sameAs: sameAs(),
  parentOrganization: { "@type": "Organization", name: SITE.parent.name, url: SITE.parent.url },
  contactPoint: [
    { "@type": "ContactPoint", contactType: "admissions", email: SITE.email, telephone: SITE.telephone, areaServed: "IN", availableLanguage: ["English", "Tamil"] },
    { "@type": "ContactPoint", contactType: "internships", email: SITE.internshipEmail, telephone: SITE.telephone, areaServed: "IN" },
  ],
});

/** Every image a page shows, in order (hero first). */
export function imagesOf(p: PageContent) {
  const list: { src: string; alt: string }[] = [{ src: asset(p.hero.image.src).src, alt: p.hero.image.alt }];
  const add = (src: string, alt: string) => list.push({ src: asset(src).src, alt });
  for (const b of p.sections) {
    if ((b.type === "prose" || b.type === "checklist") && b.image) add(b.image.src, b.image.alt);
    if (b.type === "cards") b.items.forEach((c) => c.image && add(c.image.src, c.image.alt));
    if (b.type === "gallery") b.items.forEach((g) => add(g.src, g.alt));
    if (b.type === "stories") storiesFor(b.track, b.limit, b.ids).forEach((s) => add(s.photo, `${s.name}, ${s.track} intern at ${SITE.name}`));
    if (b.type === "testimonials") testimonials(b.ids).forEach((t) => add(t.photo, `${t.name}, ${t.role} at ${SITE.name}`));
    if (b.type === "reviews") reviews(b.ids).forEach((r) => r.photo && add(r.photo, `${r.name}, ${r.track} at ${SITE.name}`));
    if (b.type === "experts") experts(b.ids).forEach((e) => e.photo && add(e.photo, `${e.name}, ${e.role} at ${SITE.parent.name}`));
  }
  return list;
}

export function schemasOf(p: PageContent) {
  const url = abs(p.path);
  const img = imagesOf(p);
  const crumbs = breadcrumbsOf(p);
  const author = { "@type": "Organization", name: SITE.author, parentOrganization: { "@id": orgId } };

  const webpage = {
    "@context": "https://schema.org",
    "@type": p.kind === "guide" ? "Article" : p.path.includes("contact") ? "ContactPage" : p.path.includes("about") ? "AboutPage" : "WebPage",
    "@id": `${url}#webpage`,
    ...(p.kind === "guide" ? { headline: p.hero.title } : { name: p.hero.title }),
    description: p.seo.metaDescription,
    url,
    inLanguage: "en-IN",
    image: abs(img[0].src),
    datePublished: p.seo.publishedAt,
    dateModified: p.seo.updatedAt,
    author,
    publisher: { "@id": orgId },
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    about: { "@type": "Thing", name: p.seo.focusKeyword },
    speakable: { "@type": "SpeakableSpecification", cssSelector: ["#answer", "#takeaways"] },
  };

  const faq = p.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: p.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : undefined;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })),
  };

  // Primary "offer" of the page: a Course for internships, a Service for
  // college programs, an ItemList of child pages for hubs.
  let offer: object | undefined;
  if (p.course) {
    offer = {
      "@context": "https://schema.org",
      "@type": "Course",
      "@id": `${url}#course`,
      name: p.course.name,
      description: p.course.description,
      url,
      image: abs(img[0].src),
      provider: { "@id": orgId },
      educationalCredentialAwarded: p.kind === "internship" ? `${SITE.name} internship certificate` : `${SITE.name} certificate of completion`,
      teaches: p.course.skills,
      audience: { "@type": "EducationalAudience", educationalRole: p.course.audience },
      inLanguage: "en",
      hasCourseInstance: p.course.modes.map((m) => ({
        "@type": "CourseInstance",
        courseMode: m,
        courseWorkload: p.course!.duration,
        location: m.toLowerCase() === "online" ? undefined : { "@type": "Place", name: SITE.name, address: { "@type": "PostalAddress", ...SITE.address } },
      })),
    };
  } else if (p.kind === "college") {
    offer = {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${url}#service`,
      name: p.label,
      serviceType: p.seo.focusKeyword,
      description: p.seo.metaDescription,
      url,
      provider: { "@id": orgId },
      audience: { "@type": "EducationalAudience", educationalRole: "Colleges and universities" },
      areaServed: { "@type": "State", name: "Tamil Nadu" },
    };
  } else {
    // Hubs list their children, home its four programs; other pages list
    // the programs and pages their cards and link blocks point to.
    const linked = [...new Set(p.sections.flatMap((b) => (b.type === "cards" ? b.items.map((c) => c.href) : b.type === "links" ? b.items.map((l) => l.href) : [])))]
      .filter((h): h is string => !!h?.startsWith("/"))
      .map((h) => getPage(h))
      .filter(Boolean) as PageContent[];
    const kids =
      p.kind === "home" ? (["/internships", "/student-development-program", "/technical-workshops", "/college-programs"].map((x) => getPage(x)).filter(Boolean) as PageContent[])
      : p.kind === "hub" ? pagesUnder(p.path)
      : linked;
    if (kids.length)
      offer = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": `${url}#programs`,
        name: p.hero.title,
        itemListElement: kids.map((k, i) => ({ "@type": "ListItem", position: i + 1, name: k.label, url: abs(k.path) })),
      };
  }

  return { organization: organizationSchema(), webpage, faq, breadcrumb, offer };
}

// Markdown mirror ---------------------------------------------------------

const md = (s: string) => s.replace(/\s+/g, " ").trim();

function blockMarkdown(b: Block, push: (...xs: (string | undefined | false)[]) => void) {
  const list = (xs: string[]) => push(...xs.map((x) => `- ${md(x)}`));
  const img = (src: string, alt: string) => push(`![${alt}](${asset(src).src})`);
  push(b.eyebrow && md(b.eyebrow));
  push(`## ${b.heading}`, b.intro && md(b.intro));
  switch (b.type) {
    case "prose":
      push(...b.paragraphs.map(md));
      if (b.bullets) list(b.bullets);
      if (b.image) img(b.image.src, b.image.alt);
      if (b.link) push(`[${b.link.label}](${b.link.href})`);
      break;
    case "cards":
      b.items.forEach((c) => {
        push(`### ${c.title}`, c.meta, md(c.body));
        if (c.image) img(c.image.src, c.image.alt);
        if (c.href) push(`[${c.title}](${c.href})`);
      });
      break;
    case "steps":
      push(...b.items.map((s, i) => `${i + 1}. **${s.label ?? `Step ${i + 1}`}: ${s.title}:** ${md(s.body)}`));
      break;
    case "phases":
      b.items.forEach((ph) => {
        push(`### ${ph.label}: ${ph.title}`);
        list(ph.points);
      });
      break;
    case "tools":
      list(b.items.map((t) => `**${t.name}:** ${t.role}`));
      break;
    case "table":
      push([`| ${b.columns.join(" | ")} |`, `| ${b.columns.map(() => "---").join(" | ")} |`, ...b.rows.map((r) => `| ${r.join(" | ")} |`)].join("\n"), b.note && md(b.note));
      break;
    case "checklist":
      list(b.items);
      if (b.image) img(b.image.src, b.image.alt);
      break;
    case "stats":
      list(b.items.map((s) => `${s.value} ${s.label}`));
      break;
    case "partners":
      list(partners().slice(0, b.limit ?? 99).map((c) => `${c.name}, ${c.city}`));
      break;
    case "testimonials":
      testimonials(b.ids).forEach((t) => {
        push(`> ${t.quote}`, `${t.name}, ${t.role}`);
        img(t.photo, `${t.name}, ${t.role} at ${SITE.name}`);
        push(`<video src="${asset(t.video).src}"></video>`);
      });
      break;
    case "stories":
      storiesFor(b.track, b.limit, b.ids).forEach((s) => {
        push(`- ${s.text}`);
        img(s.photo, `${s.name}, ${s.track} intern at ${SITE.name}`);
      });
      break;
    case "gallery":
      b.items.forEach((g) => {
        img(g.src, g.alt);
        push(md(g.caption));
      });
      break;
    case "links":
      list(b.items.map((l) => `[${l.title}](${l.href}): ${l.body}`));
      break;
    case "form":
      if (b.points) list(b.points);
      break;
    case "batches":
      list(b.items.map((x) => `[${x.title}](${x.href}): ${["every week", b.time?.trim(), b.modes.join(", ")].filter(Boolean).join(", ")}`));
      break;
    case "events": {
      // Only upcoming events are worth telling search engines and AI about.
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const next = b.items.filter((e) => e.date >= today);
      if (next.length) list(next.map((e) => `${e.date}${e.time ? `, ${e.time}` : ""}: ${md(e.title)}. ${md(e.body)}`));
      else push(md(b.empty ?? "No upcoming events right now."));
      break;
    }
    case "reviews":
      reviews(b.ids).forEach((r) => {
        push(`> ${md(r.quote)}`, `${r.name}, ${r.track}, ${r.college}`);
        if (r.photo) img(r.photo, `${r.name}, ${r.track} at ${SITE.name}`);
      });
      break;
    case "experts":
      experts(b.ids).forEach((e) => {
        push(`### ${e.name}`, e.role, md(e.bio));
        if (e.photo) img(e.photo, `${e.name}, ${e.role} at ${SITE.parent.name}`);
      });
      break;
  }
}

export function markdownOf(p: PageContent): string {
  const out: string[] = [];
  const push = (...xs: (string | undefined | false)[]) => xs.forEach((x) => x && out.push(x));
  const h = p.hero;
  push(h.eyebrow, md(h.subtitle), `[${h.primary.label}](${h.primary.href})`, h.secondary && `[${h.secondary.label}](${h.secondary.href})`);
  push(...(h.highlights ?? []).map((x) => `- ${x}`));
  push(`![${h.image.alt}](${asset(h.image.src).src})`);
  push(...(p.facts ?? []).map((f) => `- ${f.label}: ${f.value}`));
  push(`## ${p.answer.question}`, md(p.answer.answer));
  p.sections.forEach((b) => blockMarkdown(b, push));
  if (p.faqs.length) {
    push(`## ${FAQ_HEADING}`);
    p.faqs.forEach((f) => push(`### ${f.q}`, md(f.a)));
  }
  push(`## ${TAKEAWAYS_HEADING}`, ...p.takeaways.map((t) => `- ${md(t)}`));
  push("## Conclusion", ...p.conclusion.map(md));
  push(`## ${REFERENCES_HEADING}`, ...p.references.map((r) => `- [${r.label}](${r.href})`));
  push(`## ${p.cta.title}`, md(p.cta.body), `[${p.cta.primary.label}](${p.cta.primary.href})`, p.cta.secondary && `[${p.cta.secondary.label}](${p.cta.secondary.href})`, contactLine(p));
  return out.join("\n\n");
}

export function seoDocumentOf(p: PageContent): BlogPost {
  const s = schemasOf(p);
  const img = imagesOf(p);
  return {
    title: p.hero.title,
    slug: p.path.replace(/^\//, ""),
    content: markdownOf(p),
    focusKeyword: p.seo.focusKeyword,
    secondaryKeywords: p.seo.secondaryKeywords.filter(Boolean),
    metaTitle: p.seo.metaTitle,
    metaDescription: p.seo.metaDescription,
    canonicalUrl: abs(p.path),
    robots: "index,follow",
    openGraphImage: img[0].src,
    twitterCard: img[0].src,
    coverImage: img[0].src,
    gallery: img.slice(1).map((g) => g.src),
    articleSchema: s.webpage,
    faqSchema: s.faq,
    breadcrumbSchema: s.breadcrumb,
    organizationSchema: s.organization,
    productSchema: s.offer,
    author: SITE.author,
    publishedAt: p.seo.publishedAt,
    updatedAt: p.seo.updatedAt,
  };
}
