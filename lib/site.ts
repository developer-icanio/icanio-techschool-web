// Site-wide identity. lib/seo reads brand, title suffix and topical entities
// from here. Set NEXT_PUBLIC_SITE_URL to the production domain at deploy time.

export const SITE = {
  name: "Icanio Tech School",
  brand: "Icanio Tech School",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://techschool.icanio.com").replace(/\/$/, ""),
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
};

export const sameAs = [SITE.social.linkedin, SITE.social.instagram, SITE.social.x];
