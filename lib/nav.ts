// Site navigation. Split by audience so a visitor picks a path in one click:
// students -> internships / programs, colleges -> college programs,
// everyone -> proof (results) and trust (about).

export interface NavLink { label: string; href: string; note?: string }
export interface NavGroup { label: string; href: string; columns: { title: string; links: NavLink[] }[]; cta?: NavLink }

export const ENGINEERING_TRACKS: NavLink[] = [
  { label: "Frontend Development", href: "/internships/frontend-development-internship" },
  { label: "Backend Development", href: "/internships/backend-development-internship" },
  { label: "Full Stack Development", href: "/internships/full-stack-development-internship" },
  { label: "Software Testing", href: "/internships/software-testing-internship" },
  { label: "AI & ML", href: "/internships/ai-ml-internship" },
  { label: "UI/UX Design", href: "/internships/ui-ux-design-internship" },
  { label: "DevOps", href: "/internships/devops-internship" },
  { label: "Flutter App Development", href: "/internships/flutter-developer-internship" },
  { label: "Business Analyst", href: "/internships/business-analyst-internship" },
  { label: "Project Management", href: "/internships/project-management-internship" },
];

export const NON_ENGINEERING_TRACKS: NavLink[] = [
  { label: "Data Analyst", href: "/internships/data-analyst-internship" },
  { label: "Digital Marketing", href: "/internships/digital-marketing-internship" },
  { label: "Human Resource", href: "/internships/hr-internship" },
  { label: "Finance", href: "/internships/finance-internship" },
  { label: "Sales", href: "/internships/sales-internship" },
];

export const COLLEGE_PROGRAMS: NavLink[] = [
  { label: "MoU Partnership", href: "/college-programs/mou-partnership", note: "Long-term industry collaboration" },
  { label: "Value Added Courses", href: "/college-programs/value-added-courses", note: "On-campus, lab-based courses" },
  { label: "Guest Lectures", href: "/college-programs/guest-lectures", note: "Sessions by practising engineers" },
  { label: "Faculty Development Program", href: "/college-programs/faculty-development-program", note: "Hands-on FDPs for educators" },
  { label: "Industrial Visit", href: "/college-programs/industrial-visit", note: "See a live software company" },
];

export const NAV: NavGroup[] = [
  {
    label: "Internships",
    href: "/internships",
    columns: [
      { title: "Engineering internships", links: ENGINEERING_TRACKS },
      { title: "Non-engineering internships", links: NON_ENGINEERING_TRACKS },
    ],
    cta: { label: "Compare all 15 internships", href: "/internships" },
  },
  {
    label: "For Students",
    href: "/internships",
    columns: [
      {
        title: "Programs",
        links: [
          { label: "Internships", href: "/internships", note: "15 tracks, live projects, certificate" },
          { label: "Student Development Program", href: "/student-development-program", note: "Soft skills for IT careers" },
          { label: "Technical Workshops", href: "/technical-workshops", note: "Half-day to multi-day, hands-on" },
          { label: "Career Guides", href: "/career-guides", note: "Roadmaps and how-tos" },
        ],
      },
    ],
    cta: { label: "Apply for an internship", href: "/apply-for-internship" },
  },
  {
    label: "For Colleges",
    href: "/college-programs",
    columns: [{ title: "College programs", links: COLLEGE_PROGRAMS }],
    cta: { label: "See all college programs", href: "/college-programs" },
  },
  {
    label: "Results",
    href: "/student-success-stories",
    columns: [
      {
        title: "Proof",
        links: [
          { label: "Student Success Stories", href: "/student-success-stories", note: "Completions and placements" },
          { label: "Partner Colleges", href: "/partner-colleges", note: "30+ MoU institutions" },
          { label: "Campus Events", href: "/campus-events", note: "MoUs, workshops, lectures" },
        ],
      },
    ],
  },
  {
    label: "About",
    href: "/about-icanio-tech-school",
    columns: [
      {
        title: "Who we are",
        links: [
          { label: "About Icanio Tech School", href: "/about-icanio-tech-school" },
          { label: "Industry Trainers", href: "/industry-trainers" },
          { label: "Contact", href: "/contact" },
        ],
      },
    ],
  },
];
