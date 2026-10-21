// Site-wide identity. lib/seo reads brand, title suffix and topical entities
// from here.
//
// Canonical URL, sitemap and robots use: NEXT_PUBLIC_SITE_URL if set, else
// Vercel's production domain (icaniotechschool.vercel.app today; Vercel
// switches it to the custom domain once one is added), else the planned domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "https://techschool.icanio.com";

export const SITE = {
  name: "Icanio Tech School",
  brand: "Icanio Tech School",
  url: siteUrl.replace(/\/$/, ""),
  /** Appended to every <title>. lib/seo's title-length rules budget for it. */
  titleSuffix: " | Icanio",
  tagline: "Industry internships and college programs by Icanio Technologies",
  logo: "/images/group-16117.webp",
  email: "techschool@icanio.com",
  internshipEmail: "internship@icanio.com",
  phone: "+91 91500 09316",
  telephone: "+919150009316",
  whatsapp: { number: "919150009316", greeting: "Hi Icanio Tech School, I'd like to know about your internships." },
  parent: { name: "Icanio Technologies", url: "https://icanio.com", careers: "https://icanio.com/careers-at-icanio-software-development-and-tech-jobs" },
  address: {
    streetAddress: "AP Towers No. A16, NGO 'A' Colony, North Main Road",
    addressLocality: "Tirunelveli",
    addressRegion: "Tamil Nadu",
    postalCode: "627007",
    addressCountry: "IN",
  },
  social: {
    instagram: "https://www.instagram.com/icanio._.techschool/",
    linkedin: "https://www.linkedin.com/showcase/icanio-tech-school",
    x: "https://x.com/Icanio_Techsch",
  },
  /** Topical entities the AI "Entity Coverage" rule looks for (5+ per page). */
  seoEntities: [
    "icanio technologies",
    "tamil nadu",
    "internship",
    "certificate",
    "mentor",
    "students",
    "college",
    "industry",
  ],
  /** Author shown on every page (EEAT). */
  author: "Icanio Tech School Academic Team",
  /** Office hours, shown next to the phone number. */
  hours: "Monday to Saturday",
  /** Big numbers in the footer lead band on every page. */
  trust: [
    { value: "2,000+", label: "students trained" },
    { value: "90%", label: "placed within 5 months" },
    { value: "30+", label: "MoU colleges" },
    { value: "15", label: "internship tracks" },
  ],
};

/** The parts of SITE the team can change in /admin/settings (stored in site_settings). */
export type SiteSettings = Pick<typeof SITE, "email" | "internshipEmail" | "phone" | "hours" | "trust"> & {
  whatsapp: typeof SITE.whatsapp;
  social: typeof SITE.social;
  address: typeof SITE.address;
};

export const DEFAULT_SETTINGS: SiteSettings = structuredClone({ email: SITE.email, internshipEmail: SITE.internshipEmail, phone: SITE.phone, hours: SITE.hours, trust: SITE.trust, whatsapp: SITE.whatsapp, social: SITE.social, address: SITE.address });

/** Applies saved settings on top of the defaults (server side, before rendering). */
export function applySettings(s?: Partial<SiteSettings> | null) {
  const d = structuredClone(DEFAULT_SETTINGS);
  const v = { ...d, ...(s ?? {}), whatsapp: { ...d.whatsapp, ...(s?.whatsapp ?? {}) }, social: { ...d.social, ...(s?.social ?? {}) }, address: { ...d.address, ...(s?.address ?? {}) } };
  Object.assign(SITE, v, { telephone: "+" + v.phone.replace(/\D/g, "") });
}

export const sameAs = () => [SITE.social.linkedin, SITE.social.instagram, SITE.social.x].filter(Boolean);
