// The content model every page is written in (content/pages/**/*.json).
// components/page/PageView.tsx renders it and lib/content/seo-document.ts
// mirrors the same copy, in the same order, as markdown for lib/seo.

/** `src` is an original WordPress filename (resolved through lib/images.json) or a /images path. */
export interface Img {
  src: string;
  alt: string;
  /** Optional tall crop of the same photo, shown beside the text on desktop. */
  portrait?: string;
  /** Pixel size, recorded for dashboard uploads. */
  w?: number;
  h?: number;
}

export interface Link {
  label: string;
  href: string;
}

export type Tone = "white" | "soft" | "navy";

interface BlockBase {
  /** Optional anchor id. */
  id?: string;
  eyebrow?: string;
  heading: string;
  intro?: string;
  tone?: Tone;
}

export type Block =
  /** Heading, paragraphs, optional bullets and an image beside the text. */
  | (BlockBase & { type: "prose"; paragraphs: string[]; bullets?: string[]; image?: Img; reverse?: boolean; link?: Link })
  /** Grid of cards. `icon` is an original WordPress filename. */
  | (BlockBase & {
      type: "cards";
      columns?: 2 | 3 | 4;
      items: { title: string; body: string; href?: string; icon?: string; image?: Img; meta?: string }[];
    })
  /** Numbered process or timeline. */
  | (BlockBase & { type: "steps"; items: { title: string; body: string; label?: string }[] })
  /** Curriculum phases with bullet points. */
  | (BlockBase & { type: "phases"; items: { label: string; title: string; points: string[] }[] })
  /** Tools and technologies. `logo` is an original WordPress filename. */
  | (BlockBase & { type: "tools"; items: { name: string; role: string; logo?: string }[] })
  /** Comparison or reference table. First column is the row label. */
  | (BlockBase & { type: "table"; columns: string[]; rows: string[][]; note?: string })
  /** Tick list with an optional image. */
  /** `reverse` puts the image on the left (default right). */
  | (BlockBase & { type: "checklist"; items: string[]; image?: Img; reverse?: boolean })
  /** Big numbers on a navy band. */
  | (BlockBase & { type: "stats"; items: { value: string; label: string }[] })
  /** Partner college logo wall (data: content/shared/partners.json). */
  | (BlockBase & { type: "partners"; limit?: number })
  /** Student testimonials with video (data: content/shared/testimonials.json). */
  /** `ids` picks and orders specific videos from the library; empty = all published. */
  | (BlockBase & { type: "testimonials"; ids?: string[] })
  /** Verified internship completions (data: content/shared/stories.json). `track` filters by keyword. */
  | (BlockBase & { type: "stories"; track?: string; limit?: number; ids?: string[] })
  /** Photo grid with captions. */
  | (BlockBase & { type: "gallery"; items: (Img & { caption: string })[] })
  /** Related pages. */
  | (BlockBase & { type: "links"; items: { title: string; href: string; body: string }[] })
  /** Lead form. `student` = internship application, `college` = institution enquiry. */
  | (BlockBase & { type: "form"; form: "student" | "college"; points?: string[] })
  /** Upcoming batches. The start date is worked out in the browser: the next `weekday` (0 = Sunday, 2 = Tuesday) in India time, today included. */
  | (BlockBase & { type: "batches"; weekday: number; time: string; modes: string[]; items: { title: string; href: string; weekOffset?: number }[] })
  /** Written intern reviews slider (data: Library: Reviews). `ids` picks and orders reviews; empty = all published. */
  | (BlockBase & { type: "reviews"; ids?: string[] })
  /**
   * Events with real dates. Only upcoming ones are shown (checked in India
   * time on every visit); when none are left, `empty` (or a default line) is
   * shown instead.
   */
  | (BlockBase & { type: "events"; items: { date: string; title: string; body: string; time?: string; href?: string }[]; empty?: string })
  /** Team members slider (data: Library: Team). `ids` picks and orders people; empty = everyone published. */
  | (BlockBase & { type: "experts"; ids?: string[] });

export type PageKind = "home" | "hub" | "internship" | "program" | "college" | "page" | "guide";

export interface PageContent {
  /** URL path, e.g. "/internships/frontend-development-internship". Home is "/". */
  path: string;
  kind: PageKind;
  /** Short name used in breadcrumbs, menus and related-page cards. */
  label: string;
  /** Parent path for breadcrumbs (omit for top-level pages). */
  parent?: string;
  seo: {
    /** Without the site suffix. Rendered title must stay under 60 chars. */
    metaTitle: string;
    /** 145 to 158 characters, contains the focus keyword. */
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    publishedAt: string;
    updatedAt: string;
  };
  hero: {
    eyebrow: string;
    /** The page H1, under 70 characters. */
    title: string;
    subtitle: string;
    image: Img;
    primary: Link;
    secondary?: Link;
    /** Short trust points under the buttons. */
    highlights?: string[];
    /** Image on the left, text on the right (desktop), e.g. when the person points right. */
    imageLeft?: boolean;
  };
  /** Key facts strip under the hero (duration, mode, eligibility...). */
  facts?: { label: string; value: string }[];
  /** Answer-first block (AEO): the question this page answers and a 40 to 70 word answer. */
  answer: { question: string; answer: string };
  sections: Block[];
  faqs: { q: string; a: string }[];
  takeaways: string[];
  conclusion: string[];
  /** External, authoritative sources. */
  references: Link[];
  cta: { title: string; body: string; primary: Link; secondary?: Link };
  /** Internship and course pages: emitted as Course JSON-LD. */
  course?: { name: string; description: string; duration: string; modes: string[]; skills: string[]; audience: string };
}
