"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface ProductImageRow {
  id: string;
  url: string;
  color: string | null;
}

export default function ImageManager({
  productId,
  colors,
  initialImages,
}: {
  productId: string;
  colors: string[];
  initialImages: ProductImageRow[];
}) {
  const [images, setImages] = useState(initialImages);
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("productId", productId);
    formData.append("color", selectedColor);

    const res = await fetch("/api/admin/product-images", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      setError("Upload failed. Please try again.");
      return;
    }

    const newImage = await res.json();
    setImages((prev) => [...prev, { id: newImage.id, url: newImage.url, color: newImage.color }]);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    const res = await fetch(`/api/admin/product-images?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  }

  const groups = [
    ...colors.map((color) => ({
      label: color,
      value: color,
      images: images.filter((img) => img.color === color),
    })),
    {
      label: "Generic (shown for all colors)",
      value: "",
      images: images.filter((img) => !img.color),
    },
  ];

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleUpload}
        className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="rounded-lg border px-4 py-2"
          >
            {colors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
            <option value="">Generic (no specific color)</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border px-4 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="mb-3 text-lg font-semibold">
              {group.label} ({group.images.length})
            </h2>
            {group.images.length === 0 ? (
              <p className="text-sm text-gray-400">No photos yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {group.images.map((img) => (
                  <div key={img.id} className="relative">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-slate-100">
                      <Image src={img.url} alt="" fill sizes="150px" className="object-cover" />
                    </div>
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="mt-1.5 w-full rounded-lg border border-red-200 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
