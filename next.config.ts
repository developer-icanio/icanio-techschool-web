import type { NextConfig } from "next";

// Old WordPress URLs (staging) -> new structure.
const MOVED: [string, string][] = [
  ["/student-program", "/internships"],
  ["/student-program/internship", "/internships"],
  ["/student-program/internship/frontend-development", "/internships/frontend-development-internship"],
  ["/student-program/internship/backend-development", "/internships/backend-development-internship"],
  ["/student-program/internship/full-stack-development", "/internships/full-stack-development-internship"],
  ["/student-program/internship/software-testing", "/internships/software-testing-internship"],
  ["/student-program/internship/ai-ml", "/internships/ai-ml-internship"],
  ["/student-program/internship/ui-ux-2", "/internships/ui-ux-design-internship"],
  ["/student-program/internship/devops", "/internships/devops-internship"],
  ["/student-program/internship/flutter-developer", "/internships/flutter-developer-internship"],
  ["/student-program/internship/business-analyst", "/internships/business-analyst-internship"],
  ["/student-program/internship/project-manager", "/internships/project-management-internship"],
  ["/student-program/internship/data-analyst", "/internships/data-analyst-internship"],
  ["/student-program/internship/digital-marketing", "/internships/digital-marketing-internship"],
  ["/student-program/internship/human-resource", "/internships/hr-internship"],
  ["/student-program/internship/finance", "/internships/finance-internship"],
  ["/student-program/internship/sales", "/internships/sales-internship"],
  ["/student-program/student-development-program", "/student-development-program"],
  ["/student-program/workshops", "/technical-workshops"],
  ["/college-program", "/college-programs"],
  ["/college-program/mou", "/college-programs/mou-partnership"],
  ["/college-program/value-added-courses", "/college-programs/value-added-courses"],
  ["/college-program/guest-lecture", "/college-programs/guest-lectures"],
  ["/college-program/faculty-development-courses", "/college-programs/faculty-development-program"],
  ["/college-program/industrial-visit-program", "/college-programs/industrial-visit"],
  ["/gallery", "/campus-events"],
  ["/about-us", "/about-icanio-tech-school"],
  ["/contact-us", "/contact"],
  ["/hello-world", "/"],
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  // Embedded Postgres for local admin testing; loaded at runtime, never bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75],
    // Dashboard uploads (Vercel Blob).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async redirects() {
    return MOVED.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
