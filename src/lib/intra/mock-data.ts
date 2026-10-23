import { CVData, DEFAULT_SECTION_ORDER } from "@/types/resume";

export interface MockIntraUser {
  id: number;
  login: string;
  email: string;
  displayname: string;
  image: string;
  campusName: string;
  campusId: number;
  level: number;
  grade: string;
  poolMonth: string;
  poolYear: number;
  coalition: string;
  beginAt: string;
  validatedProjects: {
    id: number;
    name: string;
    slug: string;
    finalMark: number;
    validated: boolean;
    markedAt: string;
    date?: string;
  }[];
}

export function format42ProjectDate(dateStr?: string): string {
  if (!dateStr) return "2024";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "2024";
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "2024";
  }
}

export const MOCK_42_STUDENT: MockIntraUser = {
  id: 142078,
  login: "alinassarr",
  email: "alnassar.dev@gmail.com",
  displayname: "Ali Nassar",
  image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
  campusName: "San Francisco",
  campusId: 43,
  level: 7.0,
  grade: "Learner",
  poolMonth: "September",
  poolYear: 2024,
  coalition: "Phoenicians",
  beginAt: "2025-01-06T08:00:00.000Z",
  validatedProjects: [
    { id: 10, name: "Inception", slug: "inception", finalMark: 100, validated: true, markedAt: "2026-09-15T10:00:00.000Z", date: "September 2026" },
    { id: 8, name: "cub3D", slug: "cub3d", finalMark: 100, validated: true, markedAt: "2026-08-14T09:45:00.000Z", date: "August 2026" },
    { id: 7, name: "Minishell", slug: "minishell", finalMark: 100, validated: true, markedAt: "2025-12-25T11:20:00.000Z", date: "December 2025" },
    { id: 6, name: "Philosophers", slug: "philosophers", finalMark: 100, validated: true, markedAt: "2025-04-18T13:00:00.000Z", date: "April 2025" },
  ],
};

/**
 * Pre-fills an initial baseline CV from developer profile data
 */
export function createInitialCVFromIntra(
  user: MockIntraUser = MOCK_42_STUDENT,
  targetRole = "Software Engineer",
  showExperience = true
): CVData {
  const isTranscendenceDone = user.validatedProjects.some(
    (p) => p.slug === "ft_transcendence" && p.validated
  );
  const educationState = isTranscendenceDone || user.level >= 10.0 ? "STATE_B_SPECIALIZATION" : "STATE_A_CORE";

  return {
    targetRole,
    showExperience: true,
    styleDensity: "standard",
    showExtracurriculars: false,
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    educationState,
    specializationTrack: educationState === "STATE_B_SPECIALIZATION" ? "Advanced Software Architecture" : undefined,
    contact: {
      fullName: user.displayname,
      level: Math.floor(user.level),
      email: user.email,
      phoneNumber: "+961 78 870 225",
      githubUrl: "github.com/alinassarr",
      linkedinUrl: "linkedin.com/in/ali-nassar-121719185",
      location: "San Francisco, CA",
    },
    education: [
      {
        id: "edu-main",
        institution: "School of Digital Technologies",
        program:
          educationState === "STATE_A_CORE"
            ? "Core Systems Curriculum - Software & Systems Engineering"
            : "Completed the Core Systems Curriculum - Software & Systems Engineering",
        startDate: "2025",
        endDate: "Present",
        isCurrent: true,
        level: Math.floor(user.level),
        state: educationState,
        specializationTrack:
          educationState === "STATE_B_SPECIALIZATION" ? "Advanced Software Architecture" : undefined,
      },
    ],
    experience: [
      {
        id: "exp-balance-center",
        company: "Balance Center",
        role: "Mobile & Web Developer",
        location: "San Francisco, CA",
        startDate: "February 2026",
        endDate: "September 2026",
        isCurrent: false,
        bulletPoints: [
          "Engineered and launched an e-commerce storefront on Shopify, structuring a 1,000+ product catalog into optimized, multi-tier categories.",
          "Automated catalog management by engineering bulk CSV transformation and ingestion pipelines, eliminating manual inventory bottlenecks.",
          "Developed an asynchronous webhook integration delivering real-time WhatsApp order dispatch notifications to customers.",
          "Configured production DNS records, routing tables, and SSL/TLS certificates, ensuring high availability and zero operational downtime.",
        ],
      },
    ],
    projects: [
      {
        id: "proj-ai-scanner",
        name: "Mobile AI Product Ingestion Engine",
        slug: "mobile-ai-ingestion",
        is42Project: false,
        techStack: "TypeScript, Vision AI, Supabase, Cloudflare R2",
        date: "2026",
        bulletPoints: [
          "Engineered a mobile PWA enabling inventory operators to capture and catalog store items in under 15 seconds per unit.",
          "Implemented asynchronous image offloading to Cloudflare R2 object storage, maintaining a smooth 60 FPS camera thread with zero UI freezing.",
          "Integrated multimodal Vision AI APIs to parse product labels (brand, weight, ingredients) into Supabase PostgreSQL for validation and Shopify export.",
        ],
      },
      {
        id: "proj-minishell",
        name: "Minishell – POSIX Unix Command Interpreter",
        slug: "minishell",
        is42Project: true,
        techStack: "C, Unix System Calls, POSIX Signals",
        date: "December 2025",
        bulletPoints: [
          "Developed a modular POSIX Unix shell in C from scratch, implementing lexical analysis, tokenization, and Abstract Syntax Tree (AST) parsing.",
          "Handled child process lifecycles via fork(), execve(), and IPC pipes, supporting file descriptor redirections and environment variable expansion.",
          "Engineered custom built-ins (cd, echo, env, export, unset, pwd, exit) and handled asynchronous signals (SIGINT, SIGQUIT) with zero memory leaks.",
        ],
      },
      {
        id: "proj-inception",
        name: "Inception – Cloud Microservices Infrastructure",
        slug: "inception",
        is42Project: true,
        techStack: "Docker, Docker Compose, NGINX, MariaDB, Alpine Linux",
        date: "September 2026",
        bulletPoints: [
          "Architected a multi-container microservice infrastructure using Docker Compose with dedicated virtual networks and persistent volume mounts.",
          "Built lightweight, production-grade custom Dockerfiles based on Alpine Linux for NGINX, MariaDB, and WordPress, bypassing pre-packaged Hub images.",
          "Configured NGINX as an edge reverse proxy with TLSv1.2/TLSv1.3 encryption, ensuring isolated container interconnectivity and data integrity.",
        ],
      },
      {
        id: "proj-cub3d",
        name: "cub3D – 3D Raycasting Graphics Engine",
        slug: "cub3d",
        is42Project: true,
        techStack: "C, Raycasting, DDA Algorithm, Linear Algebra, MiniLibX",
        date: "August 2026",
        bulletPoints: [
          "Built a real-time raycasting engine in C utilizing the Digital Differential Analysis (DDA) algorithm to project dynamic 3D scenes from 2D grids.",
          "Implemented vector-based camera rotations, fluid movement mechanics, and precise bounding-box collision detection at consistent 60 FPS.",
          "Developed dynamic door interaction states, custom texture mapping, and sorted 2D sprite rendering routines.",
        ],
      },
    ],
    skills: {
      languages: ["C", "C++", "TypeScript", "JavaScript", "SQL", "Bash", "HTML/CSS"],
      developerTools: ["Git", "GitHub", "Docker", "Docker Compose", "Make", "GDB", "Valgrind", "VS Code"],
      technologiesFrameworks: ["Linux", "NGINX", "MariaDB", "PostgreSQL (Supabase)", "Cloudflare R2", "Shopify", "MiniLibX"],
      projectManagementTools: ["JIRA", "GitHub Projects"],
    },
    coursework: [],
    extracurriculars: [],
  };
}
