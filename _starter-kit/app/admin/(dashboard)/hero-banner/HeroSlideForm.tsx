"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHeroSlide, updateHeroSlide, type HeroSlideInput } from "./actions";
import type { HeroSlide } from "@/lib/heroSlides";

// Same distinct-per-tile gradients CategoryGrid already uses elsewhere on
// the site — offered as presets so a new slide always has a sensible
// fallback background even before/instead of a real photo, without
// requiring the admin to hand-write Tailwind gradient classes.
const GRADIENT_PRESETS = [
  { label: "Teal", value: "from-[#57D5ED] via-[#7fe0f1] to-[#c7f3fa]" },
  { label: "Pink", value: "from-[#FF75AD] via-[#ff9dc4] to-[#ffd2e4]" },
  { label: "Slate", value: "from-slate-800 via-slate-700 to-slate-600" },
  { label: "Amber", value: "from-amber-400 via-amber-500 to-amber-600" },
  { label: "Emerald", value: "from-emerald-500 via-emerald-600 to-emerald-700" },
];

export default function HeroSlideForm({ slide }: { slide?: HeroSlide }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<HeroSlideInput>({
    eyebrow: slide?.eyebrow ?? "",
    headline: slide?.headline ?? "",
    subheadline: slide?.subheadline ?? "",
    ctaLabel: slide?.ctaLabel ?? "",
    ctaHref: slide?.ctaHref ?? "/shop",
    imageUrl: slide?.imageUrl ?? null,
    gradient: slide?.gradient ?? GRADIENT_PRESETS[0].value,
    isActive: slide?.isActive ?? true,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vercel hard-caps serverless function request bodies at 4.5MB — not
    // configurable in Next.js — and rejects anything over that with an
    // HTML error page before our route's own code (and its JSON error
    // handling) ever runs. Catching it here, before the request goes out,
    // avoids the "Unexpected token '<' ... is not valid JSON" crash that
    // came from res.json() choking on that HTML page.
    const MAX_FILE_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        `That photo is ${(file.size / 1024 / 1024).toFixed(1)}MB - please use one under 4MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/hero-banner/upload", { method: "POST", body: formData });
      let data: { url?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Upload failed (server returned status ${res.status}, not JSON).`);
      }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      const url = data.url;
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (slide) {
        await updateHeroSlide(slide.id, form);
      } else {
        await createHeroSlide(form);
      }
      router.push("/admin/hero-banner");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Photo</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="block text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
        />
        {uploading && <p className="mt-1.5 text-sm text-gray-500">Uploading…</p>}
        {uploadError && <p className="mt-1.5 text-sm text-red-600">{uploadError}</p>}
        {form.imageUrl && (
          <div className="relative mt-3 aspect-[16/9] w-full max-w-md overflow-hidden rounded-lg border bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview of a freshly-uploaded R2 file, next/image adds nothing here */}
            <img src={form.imageUrl} alt="Slide preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
              className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-white"
            >
              Remove
            </button>
          </div>
        )}
        {!form.imageUrl && (
          <p className="mt-1.5 text-xs text-gray-500">
            No photo yet - the gradient below shows on its own until one is uploaded.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Fallback / overlay gradient
        </label>
        <div className="flex flex-wrap gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, gradient: preset.value }))}
              className={`h-10 w-16 rounded-lg bg-gradient-to-br ${preset.value} ring-2 transition ${
                form.gradient === preset.value ? "ring-blue-600" : "ring-transparent hover:ring-gray-300"
              }`}
              title={preset.label}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Eyebrow</label>
        <input
          required
          value={form.eyebrow}
          onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))}
          placeholder="e.g. New Season"
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Headline</label>
        <input
          required
          value={form.headline}
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Subheadline (optional)
        </label>
        <textarea
          rows={2}
          value={form.subheadline}
          onChange={(e) => setForm((f) => ({ ...f, subheadline: e.target.value }))}
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Button label</label>
          <input
            required
            value={form.ctaLabel}
            onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
            placeholder="e.g. Shop New In"
            className="w-full rounded-lg border px-4 py-2.5"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Button link</label>
          <input
            required
            value={form.ctaHref}
            onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
            placeholder="/shop"
            className="w-full rounded-lg border px-4 py-2.5"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300"
        />
        Show on homepage
      </label>

      <div className="flex items-center gap-4 border-t pt-6">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : slide ? "Save changes" : "Create slide"}
        </button>
      </div>
    </form>
  );
}
