// One consistent icon per internship track and trainer role, drawn as crisp line icons in the
// brand navy. They replace the WordPress track illustrations, which were
// made as large corner art and turn into blurry smudges at icon size.
// Keyed by the original WordPress filename, so a different icon uploaded
// from the dashboard still wins.

const P: Record<string, string[]> = {
  frontend: ["M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z", "M3 9h18", "m10 12.5-2 2 2 2", "m14 12.5 2 2-2 2"],
  backend: ["M5 4h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", "M5 13h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Z", "M7 7.5h.01", "M7 16.5h.01", "M11 7.5h6", "M11 16.5h6"],
  fullstack: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 12.5 9 5 9-5", "m3 16.5 9 5 9-5"],
  testing: ["M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z", "m20.5 20.5-4.5-4.5", "m8 11 2 2 4-4"],
  ai: ["M8 7h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z", "M9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4", "m12 9.6.8 1.6 1.6.8-1.6.8-.8 1.6-.8-1.6-1.6-.8 1.6-.8.8-1.6Z"],
  uiux: ["M5 4h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z", "M16.5 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z", "M7.5 13.5 11 20H4l3.5-6.5Z", "M14 13h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"],
  devops: ["M7 8a4 4 0 1 0 0 8c2.5 0 3.5-1.6 5-4s2.5-4 5-4a4 4 0 1 1 0 8c-2.5 0-3.5-1.6-5-4S9.5 8 7 8Z"],
  mobile: ["M9 2.5h6A2.5 2.5 0 0 1 17.5 5v14a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 19V5A2.5 2.5 0 0 1 9 2.5Z", "M11 18.5h2"],
  analyst: ["M7 4.5H6a1.5 1.5 0 0 0-1.5 1.5v13.5A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5h-1", "M9 3h6v3H9z", "M8.5 11h7M8.5 14.5h7M8.5 18h4"],
  pm: ["M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z", "M7.5 8v6M12 8v9M16.5 8v3.5"],
  data: ["M21 12a9 9 0 1 1-9-9v9h9Z", "M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"],
  marketing: ["M3 10.5v3a1 1 0 0 0 1 1h3l6 4.5v-14L7 9.5H4a1 1 0 0 0-1 1Z", "M16.5 9a4 4 0 0 1 0 6", "M19 6.5a7.5 7.5 0 0 1 0 11"],
  hr: ["M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z", "M3 20a6 6 0 0 1 12 0", "M16 4.6a3.5 3.5 0 0 1 0 6.8", "M18 14.3a6 6 0 0 1 3 5.7"],
  finance: ["M7 4h10", "M7 8.5h10", "M10.5 4a4.5 4.5 0 0 1 0 9H7l7.5 7"],
  sales: ["m3 17 6-6 4 4 8-8", "M15 7h6v6"],
  support: ["M3 12h4l2.5-6 5 12 2.5-6h4"],
  code: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z", "m10 9.5-2.5 2.5 2.5 2.5", "m14 9.5 2.5 2.5-2.5 2.5"],
};

const FILES: Record<string, keyof typeof P> = {
  "Group-2085661927.png": "frontend",
  "Group-2085661908.png": "backend",
  "Group-2085661920.png": "fullstack",
  "Group-2085661910.png": "testing",
  "Group-2085663220.png": "ai",
  "Group-2085661914.png": "uiux",
  "Group-2085661916.png": "devops",
  "Group-2085661918.png": "mobile",
  "Group-2085661922.png": "analyst",
  "Group-2085661924.png": "pm",
  "Group-1000005365-10-2.png": "data",
  "Group-1000005365-9-2.png": "marketing",
  "Group-1000005365-7-2.png": "hr",
  "Group-1000005365-8-2.png": "finance",
  "Group-1000005365-11-1.png": "sales",
  // Trainer roles (About and Industry Trainers).
  "stars-02.png": "ai",
  "user-check-02.png": "support",
  "Icon-2.png": "devops",
  "Icon-1-1.png": "data",
  "briefcase-01.png": "pm",
  "code-circle-01.png": "code",
};

/** True when the card icon is one of the track illustrations replaced here. */
export const isTrackIcon = (name?: string) => Boolean(name && FILES[name]);

/** Rounded tile with the track icon; turns navy when its card is hovered (card needs `group`). */
export function TrackIcon({ name, dark }: { name: string; dark?: boolean }) {
  const paths = P[FILES[name]];
  return (
    <span
      aria-hidden
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors duration-200 ${
        dark ? "bg-white/10 text-cyan" : "bg-soft-2 text-navy group-hover:bg-navy group-hover:text-white"
      }`}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
