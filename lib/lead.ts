import { ENGINEERING_TRACKS, NON_ENGINEERING_TRACKS, COLLEGE_PROGRAMS } from "./nav";

// Shared by the lead form (client) and /api/lead (server).

export const TRACKS = [...ENGINEERING_TRACKS, ...NON_ENGINEERING_TRACKS].map((t) => t.label);
export const DURATIONS = ["15 days", "1 month", "45 days", "2 months", "3 months", "6 months", "Not sure yet"];
export const MODES = ["Offline (on-site)", "Online", "Part time", "Hybrid"];
export const YEARS = ["1st year", "2nd year", "Pre-final year", "Final year", "Graduate / fresher", "Working professional"];
export const COLLEGE_INTERESTS = [...COLLEGE_PROGRAMS.map((p) => p.label), "Internships for our students", "Student Development Program", "Workshops"];

export interface LeadPayload {
  kind: "student" | "college" | "callback";
  /** Callback form: who is asking. */
  audience?: string;
  name: string;
  email: string;
  phone: string;
  college?: string;
  // student
  track?: string;
  duration?: string;
  mode?: string;
  year?: string;
  // college
  designation?: string;
  city?: string;
  interest?: string;
  students?: string;
  message?: string;
  page?: string;
  website?: string; // honeypot
}

const MAX_LEN: Partial<Record<keyof LeadPayload, number>> = { name: 100, email: 254, phone: 20, message: 3000, page: 200 };

/**
 * Turns whatever was posted into a clean LeadPayload: known fields only,
 * strings only, length-capped, control characters removed (so nothing can
 * break out of an email subject line). Returns null for non-objects.
 */
export function sanitize(raw: unknown): LeadPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const keys: (keyof LeadPayload)[] = ["kind", "audience", "name", "email", "phone", "college", "track", "duration", "mode", "year", "designation", "city", "interest", "students", "message", "page", "website"];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = r[k];
    if (typeof v !== "string" && typeof v !== "number") continue;
    const max = MAX_LEN[k] ?? 200;
    // Line breaks are kept in the free-text message only.
    const s = String(v).replace(k === "message" ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ").trim();
    out[k] = s.slice(0, max);
  }
  return out as unknown as LeadPayload;
}

export function validate(p: LeadPayload): string | null {
  if (p.kind !== "student" && p.kind !== "college" && p.kind !== "callback") return "Unknown form.";
  if (!p.name?.trim()) return "Please enter your name.";
  if ((p.phone ?? "").replace(/\D/g, "").length < 10) return "Please enter a valid 10-digit phone number.";
  // The footer callback form only asks for name, phone and interest.
  if (p.kind === "callback") return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email ?? "")) return "Please enter a valid email address.";
  if (p.kind === "student" && !p.track) return "Please choose an area of interest.";
  if (p.kind === "college" && !p.college?.trim()) return "Please enter your college name.";
  if ((p.message ?? "").length > 3000) return "Message is too long.";
  return null;
}
