"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePageSeo } from "../actions";

export default function PageSeoForm({
  path,
  metaTitle: initialMetaTitle,
  metaDescription: initialMetaDescription,
}: {
  path: string;
  metaTitle: string;
  metaDescription: string;
}) {
  const router = useRouter();
  const [metaTitle, setMetaTitle] = useState(initialMetaTitle);
  const [metaDescription, setMetaDescription] = useState(initialMetaDescription);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updatePageSeo(path, metaTitle, metaDescription);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
          Meta Title
          <span className={metaTitle.length > 60 ? "text-red-600" : "text-gray-400"}>
            {metaTitle.length}/60
          </span>
        </label>
        <input
          value={metaTitle}
          onChange={(e) => {
            setMetaTitle(e.target.value);
            setSaved(false);
          }}
          placeholder="Leave blank to keep the page's hardcoded default"
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
          Meta Description
          <span className={metaDescription.length > 160 ? "text-red-600" : "text-gray-400"}>
            {metaDescription.length}/160
          </span>
        </label>
        <textarea
          value={metaDescription}
          onChange={(e) => {
            setMetaDescription(e.target.value);
            setSaved(false);
          }}
          rows={4}
          placeholder="Leave blank to keep the page's hardcoded default"
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

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
