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

const dev = process.env.NODE_ENV !== "production";
// Dashboard uploads live in Cloudflare R2: browsers upload to the account
// endpoint and load files from the bucket's public URL (r2.dev or a custom
// domain set in R2_PUBLIC_URL).
const R2_PUBLIC = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).host : "";
  } catch {
    return "";
  }
})();
const STORAGE = ["https://*.r2.dev", R2_PUBLIC && `https://${R2_PUBLIC}`].filter(Boolean).join(" ");

// Content Security Policy: the browser only loads code and media from this
// site and our Blob storage, can't be framed by other sites (clickjacking),
// and forms can only post here or to Google sign-in. Next.js needs inline
// scripts for hydration ('unsafe-inline'); dev also needs eval and a
// websocket for hot reload.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${STORAGE}`,
  "font-src 'self' data:",
  `media-src 'self' blob: ${STORAGE}`,
  // Dashboard uploads go from the browser straight to Cloudflare R2.
  `connect-src 'self' https://*.r2.cloudflarestorage.com${dev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // The dashboard stays out of search engines, even if a link to it leaks.
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  // Embedded Postgres for local admin testing; loaded at runtime, never bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75],
    // Dashboard uploads (Cloudflare R2 public URL).
    remotePatterns: [{ protocol: "https", hostname: "*.r2.dev" }, ...(R2_PUBLIC ? [{ protocol: "https" as const, hostname: R2_PUBLIC }] : [])],
  },
  async redirects() {
    return MOVED.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
