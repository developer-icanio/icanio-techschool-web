# Admin + SEO Starter Kit

A raw code backup pulled from `lamblily-website` on 2026-09-16, kept as a copy-paste
starting point for the next site (fitness-studio, julios-*, online-school, the B2B
fork, etc.). This is **not genericized** — it's the real LAMBLILY code as-is. Copy
what you need into a new project and trim/rename from there.

## What's in here

```
app/admin/                 Full admin dashboard — RBAC-gated (app/admin/(dashboard)),
                            login page, and every feature module (blogs, categories,
                            products, orders, inventory, leads, email, media,
                            hero-banner, master-data, redirects, link-checker, seo,
                            reports, analytics, settings, team, tools). Prune the
                            modules that don't apply to the new site (e.g. inventory/
                            orders won't apply to a non-store site like the fitness
                            studio or tuition site).

app/api/admin/              Server routes the admin UI calls (image uploads, bulk
                            edit, master-data export, order upload, email send, etc.)

app/api/auth/                NextAuth's [...nextauth] catch-all route handler.
app/api/register/            Email/password signup endpoint + admin notification email.
app/api/cron/                 Scheduled jobs — back-in-stock, release-reservations,
                            abandoned-carts (store-specific, likely skip for a
                            non-store site) and seo-report, link-check (reusable —
                            useful on any content site).
app/api/revalidate/          ISR revalidation webhook.

app/robots.ts                Robots rules incl. the AI-crawler allowlist for AEO/GEO
                            (GPTBot, ClaudeBot, PerplexityBot, etc.) and disallowed
                            filter/search query patterns.
app/sitemap.ts, app/sitemap/, app/shop/sitemap.ts, app/blog/sitemap.ts
                            Sitemap generation, split by section.
app/llms.txt                Static AEO file describing the site to AI agents.

auth.ts                      NextAuth config: Google + Credentials providers, JWT
                            callbacks assigning role/adminRole, an ADMIN_EMAILS
                            break-glass allowlist so the owner can never be locked
                            out even with an empty/bad users table.
proxy.ts                     Middleware: gates /admin by auth+role, and does the
                            DB-backed redirect lookup (lib/redirects.ts) before
                            anything else runs — real 30x status for search engines,
                            not a client-side redirect.

lib/rbac/permissions.ts      Role -> allowed admin route logic (owner/seo/sales etc).
lib/seo/                     A full Rank-Math-style SEO scoring engine: ai.ts,
                            analyzer.ts, content.ts, eeat.ts, keyword.ts, links.ts,
                            media.ts, meta.ts, schema.ts, score.ts, technical.ts,
                            title.ts, types.ts. This is the biggest reusable asset
                            in this kit — genuinely site-agnostic scoring logic.
lib/redirects.ts             DB-backed redirect map with a 60s in-memory cache,
                            fails open (never takes the site down if the table's
                            missing or Postgres hiccups).
lib/resend.ts                Transactional email via Resend — admin notifications,
                            has the LAMBLILY brand HTML baked into the templates,
                            rewrite these per-project.
lib/generateSchema.ts        JSON-LD structured data generator (Product, Article, etc).
lib/linkChecker.ts           Background link-checker used by the link-check cron
                            + admin/link-checker UI.
lib/exports/                 Marketplace bulk-listing export generators (Amazon,
                            Myntra) — skip unless the next site also sells on
                            marketplaces.

db/schema.ts                 Full Drizzle schema — most tables are LAMBLILY's own
                            e-commerce model (products, orders, inventory...).
                            The genuinely reusable tables to keep are: users,
                            redirects, categories (for its seo_title/meta_description/
                            keyword columns), and marketplaceListingTemplateFields
                            if reusing the exports feature.
db/index.ts                  Postgres pool setup — max: 3, short timeouts. This
                            exact config fixed a real production incident (pooler
                            connection exhaustion under Supabase's 200-client cap
                            during builds/ISR) — keep this shape on any project
                            using a pooled serverless Postgres (Supabase, Neon).
next.config.ts                Contains the redirects() array pattern (static rules +
                            imported generated rule sets) and images.unoptimized
                            (avoids Vercel's own image-optimization billing when
                            serving from R2/an external image host).
```

## Required env vars

```
DATABASE_URL=              # Postgres connection string (pooled, e.g. Supabase/Neon)
AUTH_SECRET=                # NextAuth v5 session secret
AUTH_GOOGLE_ID=             # Google OAuth client ID
AUTH_GOOGLE_SECRET=         # Google OAuth client secret
ADMIN_EMAILS=               # comma-separated allowlist, always treated as owner-admin
RESEND_API_KEY=             # Resend transactional email
RESEND_FROM_EMAIL=          # verified sender address
CRON_SECRET=                 # Bearer token Vercel Cron sends; compared in each cron route
```

## Dependencies to install in a new project

```bash
npm install next-auth@^5.0.0-beta.31 bcryptjs@^3.0.3 drizzle-orm@^0.45.2 pg@^8.22.0 resend@^6.18.0
npm install -D drizzle-kit@^0.31.10 @types/bcryptjs@^2.4.6 @types/pg@^8.20.0
```

## Reuse checklist per new project

1. Copy in the pieces you actually need (skip store-only modules for a non-store site).
2. Rewrite `db/schema.ts` down to the tables this project needs — start from `users`,
   `categories` (SEO fields), `redirects`.
3. Set up `vercel.json` crons for whichever `app/api/cron/*` routes you kept.
4. Rewrite `lib/resend.ts`'s HTML templates — the LAMBLILY brand/colors are hardcoded.
5. Set the env vars above.
6. Point `proxy.ts`'s matcher and `auth.ts`'s `pages.signIn` at the new project's routes
   if they differ from `/login` / `/admin/login`.
7. Confirm `db/index.ts`'s pool `max` is sane for whatever Postgres plan/pooler the
   new project uses — this exact issue took `lamblily-website` down in production once.
