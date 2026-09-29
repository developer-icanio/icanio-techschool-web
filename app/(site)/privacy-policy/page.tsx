import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Icanio Tech School collects, uses and protects the details you share through our internship and college enquiry forms.", alternates: { canonical: "/privacy-policy" } };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <div className="prose-body mt-8 space-y-4 text-[17px] leading-relaxed text-body">
        <p>{SITE.name} is operated by {SITE.parent.name}. This page explains what we collect when you use this website and how we use it.</p>
        <h2 className="pt-4 text-2xl font-semibold">What we collect</h2>
        <p>When you submit an internship application or a college enquiry we collect the details you type: your name, phone number, email address, college, and the program you are interested in. We do not ask for identity documents or payment details through this website.</p>
        <h2 className="pt-4 text-2xl font-semibold">How we use it</h2>
        <p>We use these details only to reply to your request, plan your internship or program, and send updates you have asked for. We do not sell or rent your details to anyone.</p>
        <h2 className="pt-4 text-2xl font-semibold">How long we keep it</h2>
        <p>Enquiries are kept for as long as needed to serve you and for our records, after which they are deleted. You can ask us to delete your details at any time.</p>
        <h2 className="pt-4 text-2xl font-semibold">Contact</h2>
        <p>For any privacy question or deletion request, email <a className="text-navy underline" href={`mailto:${SITE.email}`}>{SITE.email}</a> or call {SITE.phone}.</p>
      </div>
    </main>
  );
}
