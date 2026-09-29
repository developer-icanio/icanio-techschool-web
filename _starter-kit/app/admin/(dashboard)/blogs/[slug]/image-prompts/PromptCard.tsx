"use client";

import { useRef, useState } from "react";
import type { ImagePrompt } from "@/lib/imagePrompts";

type ImageType = "cover" | "content1" | "content2";

interface UploadedImage {
  url: string;
  fileSize: number;
  width: number | null;
  height: number | null;
}

function buildSnippet(imageType: ImageType, url: string, altText: string): string {
  if (imageType === "cover") {
    return `coverImage: "${url}"`;
  }
  return `![${altText}](${url})`;
}

export default function PromptCard({
  slug,
  imageType,
  prompt,
  existingImage,
  aiEnabled,
}: {
  slug: string;
  imageType: ImageType;
  prompt: ImagePrompt;
  existingImage?: UploadedImage;
  // True when OPENAI_API_KEY is set on the server - enables the "Generate
  // with AI" button. Passed down rather than checked here so the client
  // bundle never needs anything about the key.
  aiEnabled: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [image, setImage] = useState<UploadedImage | undefined>(existingImage);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || generating;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blog-images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, imageType }),
      });
      let row: { url?: string; fileSize?: number; width?: number | null; height?: number | null; error?: string };
      try {
        row = await res.json();
      } catch {
        throw new Error(`Generation failed (server returned status ${res.status}, not JSON).`);
      }
      if (!res.ok) {
        throw new Error(row.error ?? "Generation failed.");
      }
      setImage({ url: row.url!, fileSize: row.fileSize!, width: row.width ?? null, height: row.height ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopySnippet() {
    if (!image) return;
    await navigator.clipboard.writeText(buildSnippet(imageType, image.url, prompt.label));
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vercel hard-caps serverless function request bodies at 4.5MB — not
    // configurable in Next.js — and rejects anything over that with an
    // HTML error page before our route's own code (and its JSON error
    // handling) ever runs. Catching it here, before the request goes out,
    // avoids res.json() crashing on that HTML page with "Unexpected token
    // '<' ... is not valid JSON" (same fix as HeroSlideForm.tsx).
    const MAX_FILE_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)}MB, please use one under 4MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug);
      formData.append("imageType", imageType);

      const res = await fetch("/api/admin/blog-images/upload", {
        method: "POST",
        body: formData,
      });
      let row: { url?: string; fileSize?: number; width?: number | null; height?: number | null; error?: string };
      try {
        row = await res.json();
      } catch {
        throw new Error(`Upload failed (server returned status ${res.status}, not JSON).`);
      }
      if (!res.ok) {
        throw new Error(row.error ?? "Upload failed.");
      }
      setImage({ url: row.url!, fileSize: row.fileSize!, width: row.width ?? null, height: row.height ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{prompt.label}</h2>
        <span className="rounded bg-slate-100 px-3 py-1 text-xs text-gray-600">
          {prompt.aspectRatio} · {prompt.dalleSize}
        </span>
      </div>
      <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-sans text-sm text-gray-700">
        {prompt.prompt}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        {copied ? "Copied!" : "Copy Prompt"}
      </button>

      <div className="mt-6 border-t pt-6">
        {image ? (
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={prompt.label}
                className="h-24 w-40 rounded-lg border object-cover"
              />
              <div className="flex-1 text-sm text-gray-600">
                <p className="font-medium text-green-700">Uploaded</p>
                <p>
                  {image.width}×{image.height} · {(image.fileSize / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Copy the snippet below and paste it into the post&apos;s{" "}
              {imageType === "cover" ? "frontmatter" : "body, where it belongs"}.
            </p>
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
              {buildSnippet(imageType, image.url, prompt.label)}
            </pre>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopySnippet}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {snippetCopied ? "Copied!" : "Copy Snippet"}
              </button>
              {aiEnabled && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy}
                  className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                >
                  {generating ? "Generating…" : "Regenerate with AI"}
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Replace (upload)"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {aiEnabled && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {generating ? "Generating… (up to a minute)" : "Generate with AI"}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload manually"}
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
