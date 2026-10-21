import Image from "next/image";
import Link from "next/link";
import { COLLEGE_PROGRAMS, ENGINEERING_TRACKS, NON_ENGINEERING_TRACKS } from "@/lib/nav";
import QuickCallback from "@/components/forms/QuickCallback";
import { SITE } from "@/lib/site";






function Col({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">{title}</h2>
      <ul className="space-y-2 text-[15px]">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-body hover:text-navy hover:underline">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Footer = last chance to convert: a callback band first, then every page
// one click away, then contact details.
const socialLinks = () => [
  { label: "Instagram", href: SITE.social.instagram, d: "M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.8-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM12 4c2.2 0 2.4 0 3.3.1 2.2.1 3.3 1.2 3.4 3.4.1.9.1 1.1.1 3.3v2.4c0 2.2 0 2.4-.1 3.3-.1 2.2-1.2 3.3-3.4 3.4-.9.1-1.1.1-3.3.1H9.6c-2.2 0-2.4 0-3.3-.1-2.2-.1-3.3-1.2-3.4-3.4C2.8 15.6 2.8 15.4 2.8 13.2v-2.4c0-2.2 0-2.4.1-3.3.1-2.2 1.2-3.3 3.4-3.4C7.2 4 7.4 4 9.6 4H12Z" },
  { label: "X (Twitter)", href: SITE.social.x, d: "M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.2L5.6 21h-3l7.1-8.1L2.2 3h6.2l4.3 5.7L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" },
  { label: "LinkedIn", href: SITE.social.linkedin, d: "M6.9 8.8H3.6V20h3.3V8.8ZM5.2 3.5a1.9 1.9 0 1 0 0 3.9 1.9 1.9 0 0 0 0-3.9ZM20.4 13.6c0-3-.6-5.1-4.1-5.1-1.7 0-2.8.9-3.2 1.8h-.1V8.8H9.8V20h3.3v-5.5c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.4v-6.4Z" },
];

export default function Footer() {
  // Read at render time: these come from /admin/settings.
  const social = socialLinks().filter((x) => x.href);
  const wa = `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(SITE.whatsapp.greeting)}`;
  return (
    <footer>
      <section aria-labelledby="footer-cta" className="bg-[linear-gradient(90deg,#00264c_0%,#004589_100%)] text-white">
        <div className="shell grid gap-10 py-12 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-center lg:gap-16 lg:py-16">
          <div>
            <h2 id="footer-cta" className="text-[26px] font-bold leading-tight !text-white sm:text-3xl">Not sure which program fits you?</h2>
            <p className="mt-3 text-lg text-white/85">Leave your number. A counsellor calls you back within one working day, free of charge.</p>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-2">
              {SITE.trust.map((t) => (
                <li key={t.label}>
                  <span className="block text-2xl font-semibold">{t.value}</span>
                  <span className="text-sm text-white/75">{t.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <QuickCallback />
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <span className="text-white/75">Prefer to talk now?</span>
              <a href={`tel:${SITE.telephone}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
                Call {SITE.phone}
              </a>
              <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold hover:underline">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#25D366]" />WhatsApp us
              </a>
              <Link href="/apply-for-internship" className="font-semibold text-cyan hover:underline">Apply online →</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-line bg-white">
        <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
            <Image src={SITE.logo} alt={`${SITE.name} logo`} width={150} height={58} />
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-body">
              {SITE.name} is the education arm of{" "}
              <a href={SITE.parent.url} className="font-medium text-navy hover:underline">{SITE.parent.name}</a>. Industry internships, student development programs and
              college partnerships across Tamil Nadu, taught by engineers who ship real client products.
            </p>
            <ul className="mt-5 space-y-1.5 text-[15px] text-body">
              <li>General and colleges: <a href={`mailto:${SITE.email}`} className="font-medium text-navy hover:underline">{SITE.email}</a></li>
              <li>Internships: <a href={`mailto:${SITE.internshipEmail}`} className="font-medium text-navy hover:underline">{SITE.internshipEmail}</a></li>
              <li>Phone and WhatsApp: <a href={`tel:${SITE.telephone}`} className="font-medium text-navy hover:underline">{SITE.phone}</a></li>
              <li className="pt-1 text-sm text-muted">{SITE.parent.name}, {SITE.address.streetAddress}, {SITE.address.addressLocality}, {SITE.address.addressRegion} {SITE.address.postalCode}</li>
            </ul>
            <ul className="mt-5 flex gap-3">
              {social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} aria-label={s.label} rel="noopener" target="_blank" className="grid h-9 w-9 place-items-center rounded-full bg-heading text-white hover:bg-navy">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d={s.d} /></svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <Col title="Engineering internships" links={ENGINEERING_TRACKS} />
          <Col
            title="More internships"
            links={[...NON_ENGINEERING_TRACKS, { label: "All 15 internships", href: "/internships" }, { label: "Apply for an internship", href: "/apply-for-internship" }]}
          />
          <Col
            title="Programs"
            links={[
              { label: "Student Development Program", href: "/student-development-program" },
              { label: "Technical Workshops", href: "/technical-workshops" },
              { label: "College Programs", href: "/college-programs" },
              ...COLLEGE_PROGRAMS,
            ]}
          />
          <Col
            title="Results and help"
            links={[
              { label: "Student Success Stories", href: "/student-success-stories" },
              { label: "Partner Colleges", href: "/partner-colleges" },
              { label: "Campus Events", href: "/campus-events" },
              { label: "Career Guides", href: "/career-guides" },
              { label: "Industry Trainers", href: "/industry-trainers" },
              { label: "About Icanio Tech School", href: "/about-icanio-tech-school" },
              { label: "Contact", href: "/contact" },
            ]}
          />
        </div>
      </div>

      <div className="border-t border-line bg-white">
        <div className="shell flex flex-col gap-2 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright © {new Date().getFullYear()} {SITE.name}. A unit of {SITE.parent.name}.</p>
          <p className="flex flex-wrap gap-4">
            <a href={SITE.parent.careers} className="hover:text-navy">Careers at Icanio</a>
            <Link href="/sitemap" className="hover:text-navy">Sitemap</Link>
            <Link href="/privacy-policy" className="hover:text-navy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
