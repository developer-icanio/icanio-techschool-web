import { revalidatePath, revalidateTag } from "next/cache";

// On-demand cache invalidation for pages whose data lives in Postgres,
// not fetch()-cached data. Needed because direct database writes (admin
// tooling, one-off data fixes) don't go through the app's own server
// actions, so the existing revalidatePath() calls on those actions never
// fire — ISR pages then keep serving stale content for up to their
// revalidate window. Same shared-secret pattern as app/api/cron/*, since
// this can be called outside a logged-in admin session.
//
// revalidatePath alone is NOT enough: getAllProducts()/getAllCategories...()
// in lib/products.ts wrap their queries in unstable_cache({ tags: [...] }),
// a separate Data Cache keyed by tag rather than by route. revalidatePath
// invalidates the Router/Full Route Cache for a path, but per Next's own
// docs it does not clear tagged unstable_cache entries — only
// revalidateTag()/updateTag() do that. updateTag() is Server-Action-only,
// so this route handler uses revalidateTag() instead (works in Route
// Handlers too, per node_modules/next/dist/docs/.../09-revalidating.md).
// Admin dashboard, storefront, sitemap, and homepage all read through this
// same cached getAllProducts()/getAllCategoriesWithCounts(), so busting
// these two tags covers all of them.
//
// revalidateTag()'s second argument is required in this Next.js version
// (TypeScript-enforced — a breaking change from what older docs/training
// data show). "max" gives stale-while-revalidate semantics: fine for a
// server action's own users, wrong here. This route exists specifically
// so an *external* one-off write (a script, not a request through the
// app) can force an immediate refresh, so it needs { expire: 0 } — the
// exact case node_modules/next/dist/docs/.../revalidateTag.md calls out
// for "webhooks or third-party services that need immediate expiration".
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  revalidatePath("/", "layout");
  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });
  revalidateTag("page-seo", { expire: 0 });

  return Response.json({ revalidated: true, now: Date.now() });
}
