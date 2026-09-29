"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProductSeo } from "../../actions";

export default function ProductSeoForm({
  id,
  slug,
  metaTitle: initialMetaTitle,
  metaDescription: initialMetaDescription,
  focusKeyword: initialFocusKeyword,
  richContent: initialRichContent,
}: {
  id: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  richContent: string;
}) {
  const router = useRouter();
  const [metaTitle, setMetaTitle] = useState(initialMetaTitle);
  const [metaDescription, setMetaDescription] = useState(initialMetaDescription);
  const [focusKeyword, setFocusKeyword] = useState(initialFocusKeyword);
  const [richContent, setRichContent] = useState(initialRichContent);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateProductSeo(id, metaTitle, metaDescription, focusKeyword, richContent, slug);
      setSaved(true);
      router.refresh();
    });
  }

  const richContentWords = richContent.trim() ? richContent.trim().split(/\s+/).length : 0;

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
          placeholder="Falls back to the product name if left blank"
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
          placeholder="Falls back to the product description if left blank"
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Focus Keyword
        </label>
        <input
          value={focusKeyword}
          onChange={(e) => {
            setFocusKeyword(e.target.value);
            setSaved(false);
          }}
          placeholder="Falls back to the category's keyword if left blank"
          className="w-full rounded-lg border px-4 py-2.5"
        />
      </div>

      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
          Buying Guide (long-form content, shown on the product page below the description)
          <span className="text-gray-400">{richContentWords.toLocaleString()} words</span>
        </label>
        <textarea
          value={richContent}
          onChange={(e) => {
            setRichContent(e.target.value);
            setSaved(false);
          }}
          rows={20}
          placeholder="Markdown: ## headings, [links](/shop/other-product), lists, tables, and a ## Frequently Asked Questions section (rendered as an accordion). Leave blank to show nothing here."
          className="w-full rounded-lg border px-4 py-2.5 font-mono text-sm"
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
