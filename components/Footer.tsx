import Image from "next/image";
import Link from "next/link";
import { COLLEGE_PROGRAMS, ENGINEERING_TRACKS, NON_ENGINEERING_TRACKS } from "@/lib/nav";
import { SITE } from "@/lib/site";

const social = [
  { label: "Instagram", href: SITE.social.instagram, d: "M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.8-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM12 4c2.2 0 2.4 0 3.3.1 2.2.1 3.3 1.2 3.4 3.4.1.9.1 1.1.1 3.3v2.4c0 2.2 0 2.4-.1 3.3-.1 2.2-1.2 3.3-3.4 3.4-.9.1-1.1.1-3.3.1H9.6c-2.2 0-2.4 0-3.3-.1-2.2-.1-3.3-1.2-3.4-3.4C2.8 15.6 2.8 15.4 2.8 13.2v-2.4c0-2.2 0-2.4.1-3.3.1-2.2 1.2-3.3 3.4-3.4C7.2 4 7.4 4 9.6 4H12Z" },
  { label: "X (Twitter)", href: SITE.social.x, d: "M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.2L5.6 21h-3l7.1-8.1L2.2 3h6.2l4.3 5.7L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" },
  { label: "LinkedIn", href: SITE.social.linkedin, d: "M6.9 8.8H3.6V20h3.3V8.8ZM5.2 3.5a1.9 1.9 0 1 0 0 3.9 1.9 1.9 0 0 0 0-3.9ZM20.4 13.6c0-3-.6-5.1-4.1-5.1-1.7 0-2.8.9-3.2 1.8h-.1V8.8H9.8V20h3.3v-5.5c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.4v-6.4Z" },
];

function Col({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-heading">{title}</h2>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-body hover:text-navy">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:px-8">
        <div>
          <Image src={SITE.logo} alt={`${SITE.name} logo`} width={150} height={58} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-body">
            {SITE.name} is the education arm of{" "}
            <a href={SITE.parent.url} className="font-medium text-navy hover:underline">{SITE.parent.name}</a>. We run industry internships, student development programs and
            college partnership programs across Tamil Nadu, taught by engineers who ship real client products.
          </p>
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
        <Col title="Engineering internships" links={ENGINEERING_TRACKS.slice(0, 6)} />
        <Col title="More internships" links={[...ENGINEERING_TRACKS.slice(6), ...NON_ENGINEERING_TRACKS].slice(0, 7)} />
        <Col
          title="Programs"
          links={[
            { label: "College Programs", href: "/college-programs" },
            ...COLLEGE_PROGRAMS.slice(0, 3),
            { label: "Student Development Program", href: "/student-development-program" },
            { label: "Technical Workshops", href: "/technical-workshops" },
          ]}
        />
        <div>
          <h2 className="mb-3 text-base font-semibold text-heading">Contact Us</h2>
          <ul className="space-y-2 text-sm text-body">
            <li>General: <a href={`mailto:${SITE.email}`} className="text-navy hover:underline">{SITE.email}</a></li>
            <li>Internships: <a href={`mailto:${SITE.internshipEmail}`} className="text-navy hover:underline">{SITE.internshipEmail}</a></li>
            <li>Phone: <a href={`tel:${SITE.telephone}`} className="text-navy hover:underline">{SITE.phone}</a></li>
            <li className="pt-1 text-xs leading-relaxed text-muted">
              {SITE.parent.name}, {SITE.address.streetAddress}, {SITE.address.addressLocality}, {SITE.address.addressRegion} {SITE.address.postalCode}
            </li>
          </ul>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about-icanio-tech-school" className="text-body hover:text-navy">About</Link></li>
            <li><Link href="/career-guides" className="text-body hover:text-navy">Career Guides</Link></li>
            <li><a href={SITE.parent.careers} className="text-body hover:text-navy">Careers at Icanio</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Copyright © {new Date().getFullYear()} {SITE.name}. A unit of {SITE.parent.name}.</p>
          <p className="flex gap-4">
            <Link href="/sitemap" className="hover:text-navy">Sitemap</Link>
            <Link href="/privacy-policy" className="hover:text-navy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
