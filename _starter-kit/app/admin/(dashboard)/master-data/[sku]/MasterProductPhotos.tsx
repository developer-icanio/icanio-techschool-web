"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PhotoType, MasterProductImage } from "@/lib/masterData";

const MAX_PER_GROUP = 7; // per (color, photoType) - a design's real photo shoot: 7 colors x 2 ratios x up to 7 shots each
// Vercel hard-caps serverless function request bodies at 4.5MB — not
// configurable in Next.js — and rejects anything larger with its own
// HTML error page before our route's JSON error handling ever runs.
// Same guard as HeroSlideForm.tsx / PromptCard.tsx.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  website: "Website - vertical ratio",
  amazon: "Amazon - 1:1 square ratio",
};

export default function MasterProductPhotos({
  sku,
  colors,
  primaryColor,
  images,
}: {
  sku: string;
  colors: string[];
  primaryColor: string;
  images: MasterProductImage[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "");
  const [selectedType, setSelectedType] = useState<PhotoType>("website");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function groupImages(color: string, type: PhotoType) {
    return images.filter((i) => i.color === color && i.photoType === type).sort((a, b) => a.position - b.position);
  }

  const selectedGroup = groupImages(selectedColor, selectedType);
  const atLimit = selectedGroup.length >= MAX_PER_GROUP;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (atLimit) {
      setError(`Maximum ${MAX_PER_GROUP} photos for ${selectedColor} / ${PHOTO_TYPE_LABELS[selectedType]} - delete one first.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)}MB - please use one under 4MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sku", sku);
      formData.append("color", selectedColor);
      formData.append("photoType", selectedType);
      const res = await fetch("/api/admin/master-data-images/upload", { method: "POST", body: formData });
      let data: { error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Upload failed (server returned status ${res.status}, not JSON).`);
      }
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/master-data-images/upload?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-semibold text-gray-900">Photos</h2>
        <p className="mt-1 text-xs text-gray-500">
          Up to {MAX_PER_GROUP} photos per color, per ratio - website (vertical) and Amazon (1:1 square) are kept
          separate.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
        <select
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === primaryColor ? " (Primary)" : ""}
            </option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as PhotoType)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="website">{PHOTO_TYPE_LABELS.website}</option>
          <option value="amazon">{PHOTO_TYPE_LABELS.amazon}</option>
        </select>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || atLimit || !selectedColor}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : atLimit ? "Limit reached" : "+ Add photo"}
        </button>
        <span className="text-xs text-gray-500">
          {selectedGroup.length} / {MAX_PER_GROUP} in this group
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-6">
        {colors.map((color) => (
          <div key={color}>
            <div className="mb-2 flex items-center gap-2">
              <p className="font-medium text-gray-900">{color}</p>
              {color === primaryColor && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  Primary
                </span>
              )}
            </div>
            {(["website", "amazon"] as PhotoType[]).map((type) => {
              const groupImgs = groupImages(color, type);
              return (
                <div key={type} className="mb-3">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    {PHOTO_TYPE_LABELS[type]} · {groupImgs.length}/{MAX_PER_GROUP}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groupImgs.map((img) => (
                      <div
                        key={img.id}
                        className={`group relative overflow-hidden rounded-lg border bg-gray-100 ${
                          type === "website" ? "h-24 w-16" : "h-20 w-20"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin gallery thumbnail from R2, next/image adds nothing here */}
                        <img src={img.url} alt={`${color} ${type}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleDelete(img.id)}
                          disabled={deletingId === img.id}
                          className="absolute right-0.5 top-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[10px] font-semibold text-red-600 opacity-0 hover:bg-white group-hover:opacity-100 disabled:opacity-50"
                          aria-label="Delete photo"
                        >
                          {deletingId === img.id ? "…" : "✕"}
                        </button>
                      </div>
                    ))}
                    {groupImgs.length === 0 && <p className="text-xs text-gray-400">No photos yet</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {colors.length === 0 && (
          <p className="text-sm text-gray-500">This design has no colors recorded yet to attach photos to.</p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
