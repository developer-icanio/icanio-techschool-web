# Icanio Tech School: page writing guide

Every page on the site is one JSON file under `content/pages/`, shaped by
`lib/content/types.ts` (read it first). `components/page/PageView.tsx` renders it and
`lib/content/seo-document.ts` mirrors the same copy as markdown for the 69-rule SEO
engine in `lib/seo/`. **Model page: `content/pages/home.json` (scores 98).** Copy its
structure, tone and density.

## Workflow

1. Read `lib/content/types.ts`, `content/pages/home.json`, and the reference text for your
   page in `_reference/wp-pages/*.txt` (the old WordPress page: headings, copy, image
   filenames in `[IMG alt='...' filename]`).
2. Write the JSON file at the path given in your assignment.
3. Score it: `export PATH=~/.local/node/bin:$PATH && npm run -s audit:seo -- /your/path`
   (add `--doc` to see the exact markdown being scored). The loader throws on unknown
   block types or unknown image filenames, so fix those first.
4. Iterate until the page scores **100** (home is the only page allowed to miss
   `keyword-url`). Then confirm it renders: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/your/path` must print 200.
5. Do not edit any file other than your assigned JSON files.

## Facts policy (important)

- Facts must come from the reference pages, `content/shared/*.json`, `lib/site.ts`, or
  `content/pages/home.json`. The user confirmed everything on the old site is correct.
- Never invent fees, stipends, salaries, batch dates, trainer names, new statistics,
  new college names, or placement claims. General, well-known industry knowledge
  (what React is, what a business analyst does, why testing matters) is fine.
- Confirmed facts you can use anywhere: 2,000+ students trained, 1,000+ students
  placed, 90% placed within 5 months, 10+ tech stacks, 30+ MoU colleges, 15 internship
  tracks, durations 15 days up to 6 months, offline/online/part-time/hybrid modes,
  weekday and weekend batches, 1:1 mentorship, 4 learning phases per technical track,
  certificate on completion, trainers are practising Icanio engineers with 3+ years of
  client delivery, background verified by Icanio HR, code reviews to internal Icanio
  standards, top performers referred to the Icanio talent team, Jeyaram R joined Icanio
  Technologies as an SDE after Icanio Tech School, Icanio Technologies is a Tamil Nadu
  based AI company trusted by 100+ businesses, HQ Tirunelveli.
- The old site has copy-paste errors. Fix them, do not repeat them. Examples: the
  Guest Lecture page describes FDPs; the MoU hero says "Enhance teaching skills"; the
  Workshops page reuses the VAC domain list heading; the DevOps card reuses frontend
  text; "Professional Communication: Learn core digital marketing concepts".
- Rewrite everything in fresh words. Do not paste old sentences.

## The 69 rules, as writing constraints

Metadata (`seo`):
- `focusKeyword`: given in your assignment. Lowercase.
- `metaTitle`: **50 characters max** (the site appends " | Icanio"). Must **start
  with the focus keyword** (title case is fine), contain **a digit**, and contain one
  of: Best, Proven, Essential, Ultimate, Perfect, Amazing (these count as both
  "power" and "sentiment" words). Example: `Frontend Development Internship: 4 Proven Phases`
  is 48 chars. Count it.
- `metaDescription`: **145 to 158 characters**, contains the focus keyword. Count it.
- `secondaryKeywords`: 4 to 6 phrases.
- `publishedAt` and `updatedAt`: "2026-09-29".

Content (the markdown mirror, in render order):
- **2,500+ words** total. Aim for 2,800 to 3,400.
- **Keyword density 1% to 2.5%**: the exact focus phrase (case-insensitive substring)
  must appear roughly once every 60 to 90 words. For 3,000 words that is 30 to 50
  uses. Spread it across headings, intros, card bodies, FAQs and takeaways. Plural
  or extra words in between do not count ("frontend internship" does not match
  "frontend development internship").
- Focus keyword in the **first 10%** of content: put it in `hero.subtitle`.
- Focus keyword in at least one **H2 or H3** (a section `heading`, card `title` or FAQ `q`).
- Focus keyword in at least one **image alt** (`hero.image.alt` is easiest).
- `hero.title` is the H1: **under 70 characters**, contains the focus keyword.
- Every heading (section headings, card titles, phase titles, FAQ questions) **under 70 characters**.
- Every paragraph, list item and **table** under 120 words. Keep tables to about 5
  rows and short cells (a table counts as one paragraph).
- **Average sentence length 20 words or fewer.** Write short, plain sentences.
- **No em dash (U+2014) anywhere.** Avoid en dashes too. Use commas, colons or "to".
- Include at least one `table` block and at least 5 list items (bullets, checklists,
  steps).
- Include a first-hand phrase: "our team", "our experience" or "we recommend".
- Mention "Icanio Tech School", "Icanio Technologies" and "Tamil Nadu", plus words like
  students, college, industry, mentor, certificate, internship (entity coverage).
- The `answer.question` must start with "What is", "How to", "Why" or contain
  "benefits" (answer-block rule). Answer in 40 to 70 words, self-contained, quotable.

Links and media:
- At least **5 internal links**: `href` on cards, `links` blocks, `prose.link`, hero/CTA
  links. Use only real paths from the site map below.
- `references`: 3 to 5 real, well-known, authoritative external URLs you are certain
  exist (official docs, government, Wikipedia). At least one `en.wikipedia.org` page and
  at least one `.gov.in` or `.org` site. Good sources: aicte-india.org,
  education.gov.in, skillindia.gov.in, developer.mozilla.org, react.dev,
  docs.python.org, en.wikipedia.org/wiki/..., owasp.org, kubernetes.io, flutter.dev,
  scrum.org, pmi.org, iiba.org, shrm.org, nasscom.in, nptel.ac.in, istqb.org.
- At least **4 images** besides the hero. `testimonials` and `stories` blocks add
  photos automatically; `prose`, `checklist` and card `image` add more. Every image
  needs a descriptive alt. Use images that appeared on the matching old page (the
  filename in `[IMG ...]`), or any filename in `lib/images.json`.
- Card `icon`: use the icon filenames from the matching old section. Icons over 100px
  wide (the old corner art) render bottom-right automatically.

The template adds these automatically (do not duplicate them): the "Quick answer" box,
"Frequently Asked Questions" (from `faqs`), "Key Takeaways", "Conclusion", "References
and Sources", the final CTA band and a contact line.

## Flow: what every page must do

A visitor should never wonder what to do next. Order sections so each one answers
the next question in the visitor's head, and end with the form.

- `faqs`: 7 to 9 real questions students or colleges ask, each answer 40 to 80 words.
  Questions under 70 characters.
- `takeaways`: 5 bullets. `conclusion`: 2 short paragraphs.
- `cta`: a clear next step (primary: apply or enquire; secondary: a related page).
- Hero `primary` link for student pages: `{"label": "Apply for this internship", "href": "#apply"}`
  (the form block has id "apply"). College pages: `"#apply"` too with "Enquire now".

### Internship track page (kind "internship", parent "/internships")
1. hero (eyebrow like "Engineering internship" or "Non-engineering internship"; primary
   "#apply"; secondary "View curriculum" -> "#curriculum")
2. `facts`: Duration "15 days to 6 months" · Mode "Offline, online or part time" ·
   Mentorship "1:1 with an Icanio engineer" · Certificate "Yes, on completion"
3. prose with image: what the role does and why it is in demand (general knowledge)
4. cards: who is eligible (from the old page, rewritten), with icons
5. phases, `id: "curriculum"`: the 4 phases from the old page, rewritten and expanded
6. tools: the tools from the old page, with their logo filenames
7. cards: projects and outcomes you will achieve (from the old page)
8. steps: how the internship runs, week to week (apply, onboarding, phases, project, review and certificate)
9. table: roles this internship prepares you for (role, what you do, key skills) or
   an honest comparison; keep it short
10. `stories` with `track` set to the track keyword (e.g. "UI/UX", "DevOps", "React"),
    or `testimonials`
11. links: 5 or 6 related internships and the /internships hub
12. form: `{"type":"form","form":"student", ...}` with 3 short points
- `course`: fill it (name, description, duration "15 days to 6 months",
  modes ["Onsite", "Online", "Blended"], skills from the curriculum, audience "Students and freshers").

### College program page (kind "college", parent "/college-programs")
hero -> facts (Format, Duration, Delivered by, For) -> prose (what it is, why colleges
choose it, image) -> cards (benefits for students / faculty / institution) -> steps
(how we run it with your college) -> cards or checklist (topics or domains covered) ->
table (formats or program comparison) -> gallery (real event photos from the old page
with captions) -> partners (limit 10) -> links (other college programs) -> form
`"college"`.

### Hub page (kind "hub")
hero -> stats or facts -> cards linking to every child page (with icons and a meta
chip) -> table comparing the children -> steps (how to choose / how it works) -> prose
(why Icanio) -> testimonials or partners -> links -> form.

### About, results, trust and contact pages (kind "page")
Keep the same rhythm: hero -> answer -> 6 to 9 sections mixing prose, cards, steps,
table, gallery/stories/testimonials/partners -> links -> form.

### Career guide (kind "guide", parent "/career-guides")
An answer-first article. hero (eyebrow "Career guide") -> prose sections with H2s that
are the questions people search -> steps (the roadmap) -> table -> checklist -> links to
the matching internship pages -> form "student". Practical, specific, no filler.

## Site map (only link to these)

/ · /internships · /internships/frontend-development-internship ·
/internships/backend-development-internship · /internships/full-stack-development-internship ·
/internships/software-testing-internship · /internships/ai-ml-internship ·
/internships/ui-ux-design-internship · /internships/devops-internship ·
/internships/flutter-developer-internship · /internships/business-analyst-internship ·
/internships/project-management-internship · /internships/data-analyst-internship ·
/internships/digital-marketing-internship · /internships/hr-internship ·
/internships/finance-internship · /internships/sales-internship ·
/student-development-program · /technical-workshops · /apply-for-internship ·
/college-programs · /college-programs/mou-partnership · /college-programs/value-added-courses ·
/college-programs/guest-lectures · /college-programs/faculty-development-program ·
/college-programs/industrial-visit · /partner-colleges · /student-success-stories ·
/campus-events · /about-icanio-tech-school · /industry-trainers · /contact ·
/career-guides · /career-guides/how-to-get-an-internship-as-a-fresher ·
/career-guides/frontend-developer-roadmap · /career-guides/soft-skills-for-it-jobs ·
/career-guides/ai-ml-career-path · /career-guides/how-to-choose-an-internship

## Tone

Warm, direct, specific. Write for a final-year student in Tamil Nadu and for a college
principal or placement officer. Indian English spelling (recognised, practise as a
verb, programme is not needed: use "program"). Prefer "you" and "we". No hype words
like "revolutionary" or "world-class". No emojis.
