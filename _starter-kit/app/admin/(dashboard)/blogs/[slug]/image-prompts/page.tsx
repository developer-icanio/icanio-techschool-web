import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogBySlug } from "@/lib/blog";
import { generateBlogImagePrompts } from "@/lib/imagePrompts";
import { isImageGenConfigured } from "@/lib/imageGen";
import { db } from "@/db";
import { blogImages } from "@/db/schema";
import { eq } from "drizzle-orm";
import PromptCard from "./PromptCard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogImagePromptsPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) notFound();

  const prompts = generateBlogImagePrompts(post);
  const existingImages = await db.select().from(blogImages).where(eq(blogImages.blogSlug, slug));
  const aiEnabled = isImageGenConfigured();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/blogs" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Blogs
        </Link>
        <h1 className="mt-2 text-4xl font-bold">Image Prompts</h1>
        <p className="mt-2 text-gray-500">
          For &quot;{post.title}&quot;.{" "}
          {aiEnabled
            ? "Click “Generate with AI” to create each image from its prompt automatically, or upload your own. "
            : "Paste each prompt into ChatGPT or another image generator, download the result, then upload it below. "}
          It&apos;s converted to WebP and stored on Cloudflare R2. Copy the snippet after and paste it
          into the post yourself.
        </p>
      </div>

      <PromptCard
        slug={slug}
        imageType="cover"
        prompt={prompts.cover}
        existingImage={existingImages.find((img) => img.imageType === "cover")}
        aiEnabled={aiEnabled}
      />
      <PromptCard
        slug={slug}
        imageType="content1"
        prompt={prompts.content1}
        existingImage={existingImages.find((img) => img.imageType === "content1")}
        aiEnabled={aiEnabled}
      />
      <PromptCard
        slug={slug}
        imageType="content2"
        prompt={prompts.content2}
        existingImage={existingImages.find((img) => img.imageType === "content2")}
        aiEnabled={aiEnabled}
      />
    </div>
  );
}
