import { z } from "zod";

// ==========================================
// DR. WISSAM TEMPLATE ENUMS & CONSTANTS
// ==========================================

export type EducationState = "STATE_A_CORE" | "STATE_B_SPECIALIZATION" | "STATE_C_ALUMNUS";

export interface ContactInfo {
  fullName: string;
  level: number | string;
  email: string;
  phoneNumber: string;
  githubUrl: string;
  linkedinUrl: string;
  location?: string;
}

export interface EducationItem {
  id: string;
  institution: string; // e.g., "42 Beirut" or "Lebanese University"
  program: string; // e.g., "42 Core Curriculum - Architecture of Digital Technologies Program"
  degree?: string; // e.g., "Bachelor in Computer Science"
  level?: number | string;
  startDate: string; // e.g., "2024"
  endDate?: string; // e.g., "Present" or "2025"
  isCurrent: boolean;
  state: EducationState;
  specializationTrack?: string; // e.g., "Cybersecurity Track" (State B)
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bulletPoints: string[];
  rawNotes?: string;
}

export interface ProjectItem {
  id: string;
  name: string; // e.g., "Minishell"
  slug?: string;
  is42Project: boolean;
  techStack: string; // Comma-separated: "C, Unix System Calls, Process Management"
  date: string; // e.g., "January 2025"
  bulletPoints: string[];
}

// Strict 4 categories required by Dr. Wissam's template
export interface SkillsData {
  languages: string[]; // "C, C++, Java, Python, SQL"
  developerTools: string[]; // "VS Code, Android Studio, Apache NetBeans"
  technologiesFrameworks: string[]; // "Linux, GDB, Git, Bootstrap, Flask"
  projectManagementTools: string[]; // "GitHub, JIRA"
}

export interface CourseworkItem {
  id: string;
  title: string; // e.g., "42 Beirut Extracurricular Cybersecurity Piscine"
  date: string; // e.g., "May 2025"
  institution?: string;
}

export interface ExtracurricularItem {
  id: string;
  organization: string; // e.g., "42 Beirut Black Ops" or "Lebanese Alpine Skiing Federation"
  role: string; // e.g., "Lead Peer Mentor" or "Secretary"
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  bulletPoints: string[];
}

export type SectionId = "education" | "experience" | "projects" | "skills" | "coursework" | "extracurriculars";

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "education",
  "experience",
  "projects",
  "skills",
  "coursework",
  "extracurriculars",
];

export interface CVData {
  id?: string;
  targetRole: string; // e.g., "Backend Developer", "Systems/C++ Engineer"
  contact: ContactInfo;
  educationState: EducationState;
  specializationTrack?: string;
  showExperience: boolean; // CRITICAL: when false, weight goes to Selected Projects
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: SkillsData;
  coursework: CourseworkItem[];
  extracurriculars: ExtracurricularItem[];
  styleDensity?: "standard" | "compact";
  showExtracurriculars?: boolean;
  sectionOrder?: SectionId[];
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const BulletPointSchema = z
  .string()
  .min(15, "Bullet must be at least 15 characters")
  .max(220, "Keep bullets concise to fit 1-page layout")
  .refine((val) => !val.includes("—"), {
    message: "Em-dashes (—) are strictly prohibited. Use commas or hyphens.",
  });

export const CVDataSchema = z.object({
  targetRole: z.string().min(2),
  contact: z.object({
    fullName: z.string().min(2),
    level: z.union([z.number(), z.string()]),
    email: z.string().email(),
    phoneNumber: z.string(),
    githubUrl: z.string(),
    linkedinUrl: z.string(),
    location: z.string().optional(),
  }),
  educationState: z.enum(["STATE_A_CORE", "STATE_B_SPECIALIZATION", "STATE_C_ALUMNUS"]),
  specializationTrack: z.string().optional(),
  showExperience: z.boolean(),
  styleDensity: z.enum(["standard", "compact"]).optional(),
  showExtracurriculars: z.boolean().optional(),
  sectionOrder: z.array(z.enum(["education", "experience", "projects", "skills", "coursework", "extracurriculars"])).optional(),
  education: z.array(
    z.object({
      id: z.string(),
      institution: z.string(),
      program: z.string(),
      degree: z.string().optional(),
      level: z.union([z.number(), z.string()]).optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      isCurrent: z.boolean(),
      state: z.enum(["STATE_A_CORE", "STATE_B_SPECIALIZATION", "STATE_C_ALUMNUS"]),
      specializationTrack: z.string().optional(),
    })
  ),
  experience: z.array(
    z.object({
      id: z.string(),
      company: z.string(),
      role: z.string(),
      location: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      isCurrent: z.boolean(),
      bulletPoints: z.array(BulletPointSchema),
      rawNotes: z.string().optional(),
    })
  ),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().optional(),
      is42Project: z.boolean(),
      techStack: z.string(),
      date: z.string(),
      bulletPoints: z.array(BulletPointSchema),
    })
  ),
  skills: z.object({
    languages: z.array(z.string()),
    developerTools: z.array(z.string()),
    technologiesFrameworks: z.array(z.string()),
    projectManagementTools: z.array(z.string()),
  }),
  coursework: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      date: z.string(),
      institution: z.string().optional(),
    })
  ),
  extracurriculars: z.array(
    z.object({
      id: z.string(),
      organization: z.string(),
      role: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      isCurrent: z.boolean(),
      bulletPoints: z.array(BulletPointSchema),
    })
  ),
});
