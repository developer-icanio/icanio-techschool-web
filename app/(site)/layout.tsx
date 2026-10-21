import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import OneVideoAtATime from "@/components/OneVideoAtATime";
import StickyActions from "@/components/StickyActions";
import { organizationSchema } from "@/lib/content/seo-document";
import { ensureContent } from "@/lib/content/store";

// Public site chrome. The admin dashboard (app/admin) has its own layout.
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  // Loads dashboard edits (site settings included) before the header and footer render.
  await ensureContent();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-navy">
        Skip to content
      </a>
      <JsonLd data={organizationSchema()} />
      <Header />
      <div id="main" tabIndex={-1} className="outline-none">
        {children}
      </div>
      <Footer />
      <StickyActions />
      <OneVideoAtATime />
    </>
  );
}
