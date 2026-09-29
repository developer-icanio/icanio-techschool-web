import { ENGINEERING_TRACKS, NON_ENGINEERING_TRACKS, COLLEGE_PROGRAMS } from "./nav";

// Shared by the lead form (client) and /api/lead (server).

export const TRACKS = [...ENGINEERING_TRACKS, ...NON_ENGINEERING_TRACKS].map((t) => t.label);
export const DURATIONS = ["15 days", "1 month", "45 days", "2 months", "3 months", "6 months", "Not sure yet"];
export const MODES = ["Offline (on-site)", "Online", "Part time", "Hybrid"];
export const YEARS = ["1st year", "2nd year", "Pre-final year", "Final year", "Graduate / fresher", "Working professional"];
export const COLLEGE_INTERESTS = [...COLLEGE_PROGRAMS.map((p) => p.label), "Internships for our students", "Student Development Program", "Workshops"];

export interface LeadPayload {
  kind: "student" | "college";
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

export function validate(p: LeadPayload): string | null {
  if (p.kind !== "student" && p.kind !== "college") return "Unknown form.";
  if (!p.name?.trim()) return "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email ?? "")) return "Please enter a valid email address.";
  if ((p.phone ?? "").replace(/\D/g, "").length < 10) return "Please enter a valid 10-digit phone number.";
  if (p.kind === "student" && !p.track) return "Please choose an area of interest.";
  if (p.kind === "college" && !p.college?.trim()) return "Please enter your college name.";
  if ((p.message ?? "").length > 3000) return "Message is too long.";
  return null;
}
