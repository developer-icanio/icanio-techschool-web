"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCategoryImage } from "../../actions";

export default function CategoryImageForm({ id, imageUrl: initialImageUrl }: { id: string; imageUrl: string }) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateCategoryImage(id, imageUrl);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Image URL</label>
        <input
          value={imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            setSaved(false);
          }}
          placeholder="https://…"
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-pasted URL, not a known-optimizable asset
        <img
          src={imageUrl}
          alt="Category cover preview"
          className="h-48 w-full rounded-lg border object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && !isPending && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </div>
  );
}
