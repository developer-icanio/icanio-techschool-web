import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import StickyActions from "@/components/StickyActions";
import { organizationSchema } from "@/lib/content/seo-document";
import { SITE } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

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
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-navy">
          Skip to content
        </a>
        <JsonLd data={organizationSchema} />
        <Header />
        <div id="main" tabIndex={-1} className="outline-none">
          {children}
        </div>
        <Footer />
        <StickyActions />
      </body>
    </html>
  );
}
