import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

// display "optional": if Inter is not ready at first paint, the matched fallback
// stays for that visit instead of re-rendering the text (protects mobile LCP).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "optional" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `Tech Internships in Tamil Nadu${SITE.titleSuffix}`,
    // lib/seo's title-length rules budget for exactly this suffix.
    template: `%s${SITE.titleSuffix}`,
  },
  description: "Industry internships, student development programs and college partnerships by Icanio Technologies, taught by working engineers in Tamil Nadu.",
  applicationName: SITE.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#004589" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
      </body>
    </html>
  );
}
