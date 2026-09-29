import { auth } from "@/auth";
import { getBlogBySlug } from "@/lib/blog";
import { generateBlogImagePrompts } from "@/lib/imagePrompts";
import { generateImage, isImageGenConfigured, type ImageGenSize } from "@/lib/imageGen";
import { storeBlogImage, UnreadableImageError } from "@/lib/blogImageStore";
import { blogImageTypeEnum } from "@/db/schema";

// Image generation + WebP conversion + R2 upload: well past the default
// serverless timeout. dall-e-3 alone is often 15-30s.
export const runtime = "nodejs";
export const maxDuration = 180;

const VALID_TYPES = blogImageTypeEnum.enumValues;

// Sits alongside app/api/admin/blog-images/upload: instead of the admin
// pasting a prompt into ChatGPT and uploading the result, this calls the
// image API with that same prompt (from lib/imagePrompts.ts) and pipes
// the result through the identical storeBlogImage pipeline. Same output,
// one click.
export async function POST(request: Request) {
  try {
    return await handleGenerate(request);
  } catch (err) {
    if (err instanceof UnreadableImageError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    console.error("blog-images/generate failed:", err);
    return Response.json(
      { error: `Generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

async function handleGenerate(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  if (!isImageGenConfigured()) {
    return Response.json(
      { error: "AI image generation isn't configured - OPENAI_API_KEY is not set." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const imageType = body?.imageType;

  if (typeof slug !== "string" || typeof imageType !== "string") {
    return Response.json({ error: "Missing slug or imageType." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(imageType as (typeof VALID_TYPES)[number])) {
    return Response.json(
      { error: `imageType must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const post = getBlogBySlug(slug);
  if (!post) {
    return Response.json({ error: "Blog post not found." }, { status: 404 });
  }

  const prompts = generateBlogImagePrompts(post);
  const chosen = prompts[imageType as keyof typeof prompts];

  const pngBytes = await generateImage(chosen.prompt, chosen.dalleSize as ImageGenSize);
  const stored = await storeBlogImage(slug, imageType as (typeof VALID_TYPES)[number], pngBytes);

  return Response.json(stored);
}
