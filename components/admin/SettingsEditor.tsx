"use client";

import { useState, useTransition } from "react";
import { saveSiteSettings } from "@/app/admin/content-actions";
import type { SiteSettings } from "@/lib/site";
import { Area, ListEditor, Text } from "./fields";
import { ResultNote, type SaveResult } from "./SectionEditor";

export default function SettingsEditor({ initial, canEdit }: { initial: SiteSettings; canEdit: boolean }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [r, setR] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const set = (x: Partial<SiteSettings>) => {
    setS({ ...s, ...x });
    setDirty(true);
    setR(null);
  };
  const card = "rounded-2xl border border-line bg-white p-5";
  return (
    <fieldset disabled={!canEdit} className="space-y-4">
      {!canEdit && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Only owners and admins can change site settings.</p>}
      <section className={card}>
        <h2 className="font-semibold">Contact details</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Text label="Main email (colleges and general)" value={s.email} onChange={(email) => set({ email })} />
          <Text label="Internship email (student applications)" value={s.internshipEmail} onChange={(internshipEmail) => set({ internshipEmail })} />
          <Text label="Phone (as shown on the site)" value={s.phone} onChange={(phone) => set({ phone })} placeholder="+91 91500 09316" />
          <Text label="Office days" value={s.hours} onChange={(hours) => set({ hours })} placeholder="Monday to Saturday" />
        </div>
        <p className="mt-2 text-xs text-muted">Form submissions are emailed to these addresses: student forms to the internship email, college forms to the main email.</p>
      </section>

      <section className={card}>
        <h2 className="font-semibold">WhatsApp</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Text label="WhatsApp number (country code, digits only)" value={s.whatsapp.number} onChange={(number) => set({ whatsapp: { ...s.whatsapp, number } })} placeholder="919150009316" />
          <Area label="First message typed for the visitor" value={s.whatsapp.greeting} onChange={(greeting) => set({ whatsapp: { ...s.whatsapp, greeting } })} rows={2} />
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Social links</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Text label="LinkedIn" value={s.social.linkedin} onChange={(linkedin) => set({ social: { ...s.social, linkedin } })} placeholder="https://" />
          <Text label="Instagram" value={s.social.instagram} onChange={(instagram) => set({ social: { ...s.social, instagram } })} placeholder="https://" />
          <Text label="X (Twitter)" value={s.social.x} onChange={(x) => set({ social: { ...s.social, x } })} placeholder="https://" />
        </div>
        <p className="mt-2 text-xs text-muted">Leave one empty to hide its icon.</p>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Office address</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Text label="Street" value={s.address.streetAddress} onChange={(streetAddress) => set({ address: { ...s.address, streetAddress } })} />
          <Text label="City" value={s.address.addressLocality} onChange={(addressLocality) => set({ address: { ...s.address, addressLocality } })} />
          <Text label="State" value={s.address.addressRegion} onChange={(addressRegion) => set({ address: { ...s.address, addressRegion } })} />
          <Text label="PIN code" value={s.address.postalCode} onChange={(postalCode) => set({ address: { ...s.address, postalCode } })} />
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Footer numbers</h2>
        <p className="mt-1 text-sm text-muted">The four numbers in the &ldquo;Not sure which program fits you?&rdquo; band at the bottom of every page.</p>
        <div className="mt-3">
          <ListEditor
            items={s.trust}
            onChange={(trust) => set({ trust })}
            title={(t) => `${t.value} ${t.label}`}
            blank={() => ({ value: "", label: "" })}
            addLabel="Add number"
            render={(t, u) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Number" value={t.value} onChange={(value) => u({ ...t, value })} placeholder="2,000+" />
                <Text label="Label" value={t.label} onChange={(label) => u({ ...t, label })} placeholder="students trained" />
              </div>
            )}
          />
        </div>
      </section>

      {canEdit && (
        <div className="sticky bottom-4 flex items-center gap-4 rounded-2xl border border-line bg-white/95 p-4 shadow-lg backdrop-blur">
          <button type="button" disabled={!dirty || pending} onClick={() => start(async () => { const x = await saveSiteSettings(s); setR(x); if (x.ok) setDirty(false); })} className="btn btn-primary !py-2 disabled:opacity-50">
            {pending ? "Saving..." : "Save and publish"}
          </button>
          <div className="flex-1"><ResultNote r={r} /></div>
        </div>
      )}
    </fieldset>
  );
}
