"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCategorySeo } from "../../actions";

export default function CategorySeoForm({
  id,
  seoTitle: initialSeoTitle,
  metaDescription: initialMetaDescription,
  shortDescription: initialShortDescription,
  keyword: initialKeyword,
}: {
  id: string;
  seoTitle: string;
  metaDescription: string;
  shortDescription: string;
  keyword: string;
}) {
  const router = useRouter();
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle);
  const [metaDescription, setMetaDescription] = useState(initialMetaDescription);
  const [shortDescription, setShortDescription] = useState(initialShortDescription);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateCategorySeo(id, { seoTitle, metaDescription, shortDescription, keyword });
      setSaved(true);
      router.refresh();
    });
  }

  function field<T extends string>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setSaved(false);
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Focus Keyword</label>
        <input
          value={keyword}
          onChange={(e) => field(setKeyword)(e.target.value)}
          placeholder="e.g. boys clothes collection"
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
          SEO Title
          <span className={seoTitle.length > 60 ? "text-red-600" : "text-gray-400"}>{seoTitle.length}/60</span>
        </label>
        <input
          value={seoTitle}
          onChange={(e) => field(setSeoTitle)(e.target.value)}
          placeholder="Falls back to the category name if left blank"
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
          onChange={(e) => field(setMetaDescription)(e.target.value)}
          rows={3}
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Short Description
          <span className="ml-2 font-normal text-gray-400">shown on the live category page, under the heading</span>
        </label>
        <textarea
          value={shortDescription}
          onChange={(e) => field(setShortDescription)(e.target.value)}
          rows={4}
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
