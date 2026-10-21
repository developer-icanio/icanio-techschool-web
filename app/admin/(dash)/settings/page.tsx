import type { Metadata } from "next";
import SettingsEditor from "@/components/admin/SettingsEditor";
import { requireAdmin } from "@/lib/admin";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Site settings" };

export default async function Settings() {
  const me = await requireAdmin();
  const canEdit = me.role === "owner" || me.role === "admin";
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-navy">Site-wide</p>
        <h1 className="text-3xl font-bold">Site settings</h1>
        <p className="mt-1 text-body">Contact details, social links and the footer numbers. They appear on every page, in the footer, on contact sections and in the details Google reads about Icanio Tech School.</p>
      </header>
      <SettingsEditor
        initial={{ email: SITE.email, internshipEmail: SITE.internshipEmail, phone: SITE.phone, hours: SITE.hours, trust: SITE.trust, whatsapp: SITE.whatsapp, social: SITE.social, address: SITE.address }}
        canEdit={canEdit}
      />
    </div>
  );
}
