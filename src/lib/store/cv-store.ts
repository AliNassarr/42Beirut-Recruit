import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useState, useEffect } from "react";
import { CVData, EducationItem, EducationState, ExperienceItem, ProjectItem } from "@/types/resume";
import { MOCK_42_STUDENT, MockIntraUser, createInitialCVFromIntra } from "@/lib/intra/mock-data";

export type WizardStep = "LOGIN" | "SETUP" | "QUESTIONNAIRE" | "EDITOR";

export function normalizeLinkedIn(val: string): string {
  if (!val) return "";
  let cleaned = val.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  while (/^linkedin\.com\/(in\/)?/i.test(cleaned)) {
    cleaned = cleaned.replace(/^linkedin\.com\/(in\/)?/i, "");
  }
  cleaned = cleaned.replace(/\/+$/, "").replace(/\?.*$/, "");
  return cleaned ? `linkedin.com/in/${cleaned}` : "";
}

export function normalizeGitHub(val: string): string {
  if (!val) return "";
  let cleaned = val.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  while (/^github\.com\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^github\.com\//i, "");
  }
  cleaned = cleaned.replace(/\/+$/, "").replace(/\?.*$/, "");
  return cleaned ? `github.com/${cleaned}` : "";
}

export interface ParsedCVData {
  contact?: {
    fullName?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
  };
  fullName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  education?: Array<{
    institution: string;
    degree?: string;
    program?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  }>;
  previousUniversity?: {
    institution: string;
    degree?: string;
    startDate?: string;
    endDate?: string;
  } | null;
  experience?: Array<{
    company: string;
    role: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    descriptionBullets?: string[];
    bulletPoints?: string[];
    rawNotes?: string;
  }>;
  workExperience?: Array<{
    company: string;
    role: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    descriptionBullets?: string[];
    bulletPoints?: string[];
    rawNotes?: string;
  }>;
  skills?: {
    languages?: string[];
    developerTools?: string[];
    technologiesFrameworks?: string[];
    projectManagementTools?: string[];
  };
  customProjects?: Array<{
    name: string;
    slug?: string;
    techStack?: string;
    date?: string;
    summaryBullets?: string[];
    bulletPoints?: string[];
    rawNotes?: string;
  }>;
  extracurriculars?: Array<{
    organization: string;
    role: string;
    startDate?: string;
    endDate?: string;
    bulletPoints?: string[];
  }>;
  coursework?: string[];
}

interface CVStore {
  // Navigation
  currentStep: WizardStep;
  setCurrentStep: (step: WizardStep) => void;

  // Student Profile
  studentProfile: MockIntraUser | null;
  setStudentProfile: (profile: MockIntraUser | null) => void;

  // Wizard Setup Form State
  targetRole: string;
  setTargetRole: (role: string) => void;

  educationState: EducationState;
  setEducationState: (state: EducationState) => void;

  specializationTrack: string;
  setSpecializationTrack: (track: string) => void;

  showExperience: boolean;
  setShowExperience: (show: boolean) => void;

  styleDensity: "standard" | "compact";
  setStyleDensity: (density: "standard" | "compact") => void;

  showExtracurriculars: boolean;
  setShowExtracurriculars: (show: boolean) => void;

  selectedProjects: { name: string; slug: string; techStack?: string; date?: string; is42Project: boolean }[];
  toggleProjectSelection: (project: { name: string; slug: string; techStack?: string; date?: string; is42Project: boolean }) => void;
  setSelectedProjects: (projects: { name: string; slug: string; techStack?: string; date?: string; is42Project: boolean }[]) => void;
  customProjects: { name: string; slug: string; techStack?: string; date?: string; is42Project: boolean }[];
  addCustomProject: (project: { name: string; slug: string; techStack?: string; date?: string; is42Project: boolean }) => void;
  removeCustomProject: (slug: string) => void;

  projectAnswers: Record<string, Record<string, any>>;
  setProjectAnswer: (projectSlug: string, questionId: string, answer: any) => void;

  selectedCampusRoles: string[];
  toggleCampusRole: (role: string) => void;
  campusRoleAnswers: Record<string, Record<string, any>>;
  setCampusRoleAnswer: (role: string, questionId: string, answer: any) => void;

  selectedCoursework: string[];
  toggleCoursework: (item: string) => void;

  // Active CV Data (Live Split-Screen Editor & Shared Store)
  cvData: CVData;
  setCVData: (data: CVData) => void;
  updateContact: (contact: Partial<CVData["contact"]>) => void;
  updateSkills: (skills: Partial<CVData["skills"]>) => void;
  updateProjectBullet: (projectId: string, bulletIndex: number, text: string) => void;
  addProjectBullet: (projectId: string, text?: string) => void;
  removeProjectBullet: (projectId: string, bulletIndex: number) => void;
  addProjectToCV: (project?: Partial<ProjectItem>) => void;
  removeProjectFromCV: (projectId: string) => void;
  moveProject: (index: number, direction: "up" | "down") => void;

  // Experience Mutations
  addExperienceItem: (item?: Partial<ExperienceItem>) => void;
  updateExperienceItem: (id: string, patch: Partial<ExperienceItem>) => void;
  removeExperienceItem: (id: string) => void;
  moveExperience: (index: number, direction: "up" | "down") => void;

  // Education Mutations
  addEducationItem: (item?: Partial<EducationItem>) => void;
  updateEducationItem: (id: string, patch: Partial<EducationItem>) => void;
  removeEducationItem: (id: string) => void;

  // Hydration & Fast-Fill from Uploaded Old CV
  hydrateFromParsedCV: (data: ParsedCVData) => void;
  fastFillFromOldCV: (parsed: any) => void;

  // Draft Persistence, Hydration & Reset
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  lastSavedTimestamp: number;
  setLastSavedTimestamp: (timestamp: number) => void;
  resetToDefaults: () => void;

  // BYOK (Bring Your Own Key) for campus rate-limit bypass
  userGeminiKey: string;
  setUserGeminiKey: (key: string) => void;
  userGroqKey: string;
  setUserGroqKey: (key: string) => void;
}

const defaultCVData: CVData = createInitialCVFromIntra(MOCK_42_STUDENT);

export const useCVStore = create<CVStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      lastSavedTimestamp: Date.now(),
      setLastSavedTimestamp: (lastSavedTimestamp) => set({ lastSavedTimestamp }),

      userGeminiKey: typeof window !== "undefined" ? localStorage.getItem("user_gemini_key") || "" : "",
      setUserGeminiKey: (userGeminiKey) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("user_gemini_key", userGeminiKey);
        }
        set({ userGeminiKey, lastSavedTimestamp: Date.now() });
      },

      userGroqKey: typeof window !== "undefined" ? localStorage.getItem("user_groq_key") || "" : "",
      setUserGroqKey: (userGroqKey) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("user_groq_key", userGroqKey);
        }
        set({ userGroqKey, lastSavedTimestamp: Date.now() });
      },

      currentStep: "LOGIN",
      setCurrentStep: (step) => set({ currentStep: step, lastSavedTimestamp: Date.now() }),

      studentProfile: null,
      setStudentProfile: (profile) =>
        set((state) => {
          if (!profile) return { studentProfile: null, lastSavedTimestamp: Date.now() };

          const baseCV = createInitialCVFromIntra(profile, state.targetRole, state.showExperience);
          return {
            studentProfile: profile,
            lastSavedTimestamp: Date.now(),
            cvData: {
              ...state.cvData,
              contact: {
                ...state.cvData.contact,
                fullName: profile.displayname || state.cvData.contact.fullName,
                email: profile.email || state.cvData.contact.email,
                level: Math.floor(profile.level),
                githubUrl: profile.login ? `github.com/${profile.login}` : state.cvData.contact.githubUrl,
                linkedinUrl: profile.login ? `linkedin.com/in/${profile.login}` : state.cvData.contact.linkedinUrl,
              },
              education: baseCV.education,
            },
          };
        }),

      targetRole: "Software Engineer",
      setTargetRole: (role) => set({ targetRole: role, lastSavedTimestamp: Date.now() }),

      educationState: "STATE_A_CORE",
      setEducationState: (educationState) =>
        set((state) => ({
          educationState,
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            educationState,
            education: state.cvData.education.map((e) =>
              e.institution.toLowerCase().includes("42 beirut")
                ? {
                    ...e,
                    state: educationState,
                    program:
                      educationState === "STATE_A_CORE"
                        ? "42 Core Curriculum - Architecture of Digital Technologies Program"
                        : "Completed the 42 Core Curriculum - Architecture of Digital Technologies Program",
                  }
                : e
            ),
          },
        })),

      specializationTrack: "Advanced Software Architecture",
      setSpecializationTrack: (specializationTrack) =>
        set((state) => ({
          specializationTrack,
          lastSavedTimestamp: Date.now(),
          cvData: { ...state.cvData, specializationTrack },
        })),

      showExperience: false,
      setShowExperience: (showExperience) =>
        set((state) => ({
          showExperience,
          lastSavedTimestamp: Date.now(),
          cvData: { ...state.cvData, showExperience },
        })),

      styleDensity: "standard",
      setStyleDensity: (styleDensity) =>
        set((state) => ({
          styleDensity,
          lastSavedTimestamp: Date.now(),
          cvData: { ...state.cvData, styleDensity },
        })),

      showExtracurriculars: true,
      setShowExtracurriculars: (showExtracurriculars) =>
        set((state) => ({
          showExtracurriculars,
          lastSavedTimestamp: Date.now(),
          cvData: { ...state.cvData, showExtracurriculars },
        })),

      selectedProjects: [
        { name: "Webserv", slug: "webserv", techStack: "C++, HTTP/1.1, Sockets", date: "February 2025", is42Project: true },
        { name: "Minishell", slug: "minishell", techStack: "C, Unix System Calls", date: "June 2024", is42Project: true },
        { name: "Cub3D", slug: "cub3d", techStack: "C, MiniLibX, Raycasting", date: "August 2024", is42Project: true },
        { name: "Philosophers", slug: "philosophers", techStack: "C, Threads, Mutexes", date: "April 2024", is42Project: true },
      ],
      toggleProjectSelection: (project) =>
        set((state) => {
          const exists = state.selectedProjects.some((p) => p.slug === project.slug);
          return {
            lastSavedTimestamp: Date.now(),
            selectedProjects: exists
              ? state.selectedProjects.filter((p) => p.slug !== project.slug)
              : [...state.selectedProjects, project],
          };
        }),
      setSelectedProjects: (selectedProjects) => set({ selectedProjects, lastSavedTimestamp: Date.now() }),

      customProjects: [],
      addCustomProject: (project) =>
        set((state) => {
          const exists = state.selectedProjects.some((p) => p.slug === project.slug);
          const nextCustom = [...state.customProjects.filter((p) => p.slug !== project.slug), project];
          const nextSelected = exists
            ? state.selectedProjects.map((p) => (p.slug === project.slug ? project : p))
            : [...state.selectedProjects, project];
          return {
            customProjects: nextCustom,
            selectedProjects: nextSelected,
            lastSavedTimestamp: Date.now(),
          };
        }),
      removeCustomProject: (slug) =>
        set((state) => ({
          customProjects: state.customProjects.filter((p) => p.slug !== slug),
          selectedProjects: state.selectedProjects.filter((p) => p.slug !== slug),
          lastSavedTimestamp: Date.now(),
        })),

      projectAnswers: {},
      setProjectAnswer: (projectSlug, questionId, answer) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          projectAnswers: {
            ...state.projectAnswers,
            [projectSlug]: {
              ...(state.projectAnswers[projectSlug] || {}),
              [questionId]: answer,
            },
          },
        })),

      selectedCampusRoles: ["Black Ops"],
      toggleCampusRole: (role) =>
        set((state) => {
          const exists = state.selectedCampusRoles.includes(role);
          return {
            lastSavedTimestamp: Date.now(),
            selectedCampusRoles: exists
              ? state.selectedCampusRoles.filter((r) => r !== role)
              : [...state.selectedCampusRoles, role],
          };
        }),
      campusRoleAnswers: {},
      setCampusRoleAnswer: (role, questionId, answer) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          campusRoleAnswers: {
            ...state.campusRoleAnswers,
            [role]: {
              ...(state.campusRoleAnswers[role] || {}),
              [questionId]: answer,
            },
          },
        })),

      selectedCoursework: [],
      toggleCoursework: (item) =>
        set((state) => {
          const exists = state.selectedCoursework.includes(item);
          return {
            lastSavedTimestamp: Date.now(),
            selectedCoursework: exists
              ? state.selectedCoursework.filter((c) => c !== item)
              : [...state.selectedCoursework, item],
          };
        }),

      // Active CV Data
      cvData: defaultCVData,
      setCVData: (cvData) => set({ cvData, lastSavedTimestamp: Date.now() }),

      updateContact: (contactPatch) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            contact: { ...state.cvData.contact, ...contactPatch },
          },
        })),

      updateSkills: (skillsPatch) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            skills: { ...state.cvData.skills, ...skillsPatch },
          },
        })),

      updateProjectBullet: (projectId, bulletIndex, text) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            projects: state.cvData.projects.map((p) => {
              if (p.id === projectId) {
                const nextBullets = [...p.bulletPoints];
                nextBullets[bulletIndex] = text;
                return { ...p, bulletPoints: nextBullets };
              }
              return p;
            }),
          },
        })),

      addProjectBullet: (projectId, text = "Implemented key features with defensive error handling and testing.") =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            projects: state.cvData.projects.map((p) => {
              if (p.id === projectId) {
                return { ...p, bulletPoints: [...p.bulletPoints, text] };
              }
              return p;
            }),
          },
        })),

      removeProjectBullet: (projectId, bulletIndex) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            projects: state.cvData.projects.map((p) => {
              if (p.id === projectId) {
                return {
                  ...p,
                  bulletPoints: p.bulletPoints.filter((_, idx) => idx !== bulletIndex),
                };
              }
              return p;
            }),
          },
        })),

      addProjectToCV: (proj) =>
        set((state) => {
          const newProj: ProjectItem = {
            id: `proj-${Date.now()}`,
            name: proj?.name || "New Project",
            slug: proj?.slug || `project-${Date.now()}`,
            is42Project: proj?.is42Project ?? false,
            techStack: proj?.techStack || "TypeScript, React, Next.js",
            date: proj?.date || "2026",
            bulletPoints: proj?.bulletPoints || [
              "Engineered mobile-first application features focusing on low-latency interactions and clean state management.",
              "Implemented robust asynchronous data pipelines with defensive error handling and testing.",
            ],
          };
          return {
            lastSavedTimestamp: Date.now(),
            cvData: {
              ...state.cvData,
              projects: [...state.cvData.projects, newProj],
            },
          };
        }),

      removeProjectFromCV: (projectId) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            projects: state.cvData.projects.filter((p) => p.id !== projectId),
          },
        })),

      moveProject: (index, direction) =>
        set((state) => {
          const projects = [...state.cvData.projects];
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= projects.length) return state;
          const temp = projects[index];
          projects[index] = projects[targetIndex];
          projects[targetIndex] = temp;
          return {
            lastSavedTimestamp: Date.now(),
            cvData: { ...state.cvData, projects },
          };
        }),

      // Experience Mutations
      addExperienceItem: (item) =>
        set((state) => {
          const newItem: ExperienceItem = {
            id: `exp-${Date.now()}`,
            company: item?.company || "Company Name",
            role: item?.role || "Software Developer",
            location: item?.location || "Beirut, Lebanon",
            startDate: item?.startDate || "2023",
            endDate: item?.endDate || "Present",
            isCurrent: item?.isCurrent ?? true,
            bulletPoints: item?.bulletPoints || [
              "Developed software features according to project requirements and industry best practices.",
              "Collaborated with cross-functional team members to test, debug, and deliver reliable solutions.",
            ],
            rawNotes: item?.rawNotes || "",
          };
          return {
            showExperience: true,
            lastSavedTimestamp: Date.now(),
            cvData: {
              ...state.cvData,
              showExperience: true,
              experience: [...state.cvData.experience, newItem],
            },
          };
        }),

      updateExperienceItem: (id, patch) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            experience: state.cvData.experience.map((exp) =>
              exp.id === id ? { ...exp, ...patch } : exp
            ),
          },
        })),

      removeExperienceItem: (id) =>
        set((state) => {
          const updated = state.cvData.experience.filter((exp) => exp.id !== id);
          return {
            showExperience: updated.length > 0,
            lastSavedTimestamp: Date.now(),
            cvData: {
              ...state.cvData,
              showExperience: updated.length > 0,
              experience: updated,
            },
          };
        }),

      moveExperience: (index, direction) =>
        set((state) => {
          const experience = [...state.cvData.experience];
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= experience.length) return state;
          const temp = experience[index];
          experience[index] = experience[targetIndex];
          experience[targetIndex] = temp;
          return {
            lastSavedTimestamp: Date.now(),
            cvData: { ...state.cvData, experience },
          };
        }),

      // Education Mutations
      addEducationItem: (item) =>
        set((state) => {
          const newEdu: EducationItem = {
            id: `edu-${Date.now()}`,
            institution: item?.institution || "University Name",
            program: item?.program || "Bachelor Degree",
            degree: item?.degree || "Bachelor Degree",
            startDate: item?.startDate || "2020",
            endDate: item?.endDate || "2024",
            isCurrent: item?.isCurrent ?? false,
            state: "STATE_A_CORE",
          };
          return {
            lastSavedTimestamp: Date.now(),
            cvData: {
              ...state.cvData,
              education: [...state.cvData.education, newEdu],
            },
          };
        }),

      updateEducationItem: (id, patch) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            education: state.cvData.education.map((edu) =>
              edu.id === id ? { ...edu, ...patch } : edu
            ),
          },
        })),

      removeEducationItem: (id) =>
        set((state) => ({
          lastSavedTimestamp: Date.now(),
          cvData: {
            ...state.cvData,
            education: state.cvData.education.filter((edu) => edu.id !== id),
          },
        })),

      // Hydration & Fast-Fill from Old CV Upload
      hydrateFromParsedCV: (data: ParsedCVData) =>
        set((state) => {
          // 1. Contact details with sanitization
          const contactPatch: Partial<CVData["contact"]> = {};
          const name = data.contact?.fullName || data.fullName;
          const mail = data.contact?.email || data.email;
          const phone = data.contact?.phone || data.phone;
          const rawLi = data.contact?.linkedin || data.linkedin;
          const rawGh = data.contact?.github || data.github;

          if (name && name.trim()) contactPatch.fullName = name.trim();
          if (mail && mail.trim()) contactPatch.email = mail.trim();
          if (phone && phone.trim()) contactPatch.phoneNumber = phone.trim();
          if (rawLi && rawLi.trim()) contactPatch.linkedinUrl = normalizeLinkedIn(rawLi);
          if (rawGh && rawGh.trim()) contactPatch.githubUrl = normalizeGitHub(rawGh);

          // 2. Education: preserve 42 Beirut entries and hydrate all prior university entries
          let updatedEducation = [...state.cvData.education];
          const beirutEntries = updatedEducation.filter((e) =>
            e.institution.toLowerCase().includes("42 beirut")
          );

          const incomingEduList =
            Array.isArray(data.education) && data.education.length > 0
              ? data.education
              : data.previousUniversity && data.previousUniversity.institution
              ? [data.previousUniversity]
              : [];

          const non42Entries: EducationItem[] = incomingEduList
            .filter((edu: any) => !edu.institution?.toLowerCase().includes("42 beirut"))
            .map((edu: any, idx: number) => ({
              id: `edu-univ-${idx}-${Date.now()}`,
              institution: edu.institution || "University",
              program: edu.degree || edu.program || "Bachelor Degree",
              degree: edu.degree || edu.program || "Bachelor Degree",
              startDate: edu.startDate || "2020",
              endDate: edu.endDate || "2024",
              isCurrent: edu.endDate?.toLowerCase().includes("present") ?? false,
              state: "STATE_A_CORE",
            }));

          if (non42Entries.length > 0) {
            updatedEducation = [...beirutEntries, ...non42Entries];
          }

          // 3. Work Experience: populate jobs and set showExperience = true
          const incomingExp =
            Array.isArray(data.experience) && data.experience.length > 0
              ? data.experience
              : Array.isArray(data.workExperience) && data.workExperience.length > 0
              ? data.workExperience
              : [];

          let hasExp = state.showExperience;
          let updatedExperience = [...state.cvData.experience];

          if (incomingExp.length > 0) {
            hasExp = true;
            updatedExperience = incomingExp.map((exp: any, i: number) => {
              const bullets =
                Array.isArray(exp.descriptionBullets) && exp.descriptionBullets.length > 0
                  ? exp.descriptionBullets
                  : Array.isArray(exp.bulletPoints) && exp.bulletPoints.length > 0
                  ? exp.bulletPoints
                  : [exp.rawNotes || "Delivered core software features and contributed to system development."];

              return {
                id: `exp-parsed-${i}-${Date.now()}`,
                company: exp.company || "Company",
                role: exp.role || "Software Developer",
                location: exp.location || "Beirut, Lebanon",
                startDate: exp.startDate || "2023",
                endDate: exp.endDate || "Present",
                isCurrent: exp.endDate?.toLowerCase().includes("present") ?? false,
                bulletPoints: bullets,
                rawNotes: exp.rawNotes || bullets.join(". "),
              };
            });
          }

          // 4. Skills: merge and deduplicate into Dr. Wissam's 4 categories
          const updatedSkills = { ...state.cvData.skills };
          if (data.skills) {
            const mergeUnique = (existing: string[] = [], incoming: string[] = []) => {
              const seen = new Set<string>();
              const result: string[] = [];
              for (const item of [...existing, ...incoming]) {
                if (!item || !item.trim()) continue;
                const key = item.trim().toLowerCase();
                if (!seen.has(key)) {
                  seen.add(key);
                  result.push(item.trim());
                }
              }
              return result;
            };

            updatedSkills.languages = mergeUnique(state.cvData.skills.languages, data.skills.languages);
            updatedSkills.developerTools = mergeUnique(state.cvData.skills.developerTools, data.skills.developerTools);
            updatedSkills.technologiesFrameworks = mergeUnique(state.cvData.skills.technologiesFrameworks, data.skills.technologiesFrameworks);
            updatedSkills.projectManagementTools = mergeUnique(state.cvData.skills.projectManagementTools, data.skills.projectManagementTools);
          }

          // 5. Custom / Non-42 Personal Projects
          let updatedCustomProjects = [...state.customProjects];
          let updatedSelectedProjects = [...state.selectedProjects];
          const updatedProjectAnswers = { ...state.projectAnswers };

          if (Array.isArray(data.customProjects) && data.customProjects.length > 0) {
            for (const proj of data.customProjects) {
              if (!proj.name || !proj.name.trim()) continue;
              const slug = (proj.slug || proj.name)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

              const bullets =
                Array.isArray(proj.summaryBullets) && proj.summaryBullets.length > 0
                  ? proj.summaryBullets
                  : Array.isArray(proj.bulletPoints) && proj.bulletPoints.length > 0
                  ? proj.bulletPoints
                  : [];

              const newCustom = {
                name: proj.name.trim(),
                slug,
                techStack: proj.techStack?.trim() || "Software Development",
                date: proj.date?.trim() || "2025",
                is42Project: false,
              };

              updatedCustomProjects = [
                ...updatedCustomProjects.filter((p) => p.slug !== slug),
                newCustom,
              ];

              const existsInSelected = updatedSelectedProjects.some((sp) => sp.slug === slug);
              if (!existsInSelected) {
                updatedSelectedProjects.push(newCustom);
              }

              const note =
                proj.rawNotes ||
                (bullets.length > 0
                  ? bullets.join(". ")
                  : `Developed ${proj.name} using ${proj.techStack || "modern technologies"}.`);

              updatedProjectAnswers[slug] = {
                ...(updatedProjectAnswers[slug] || {}),
                "personal-notes": note,
              };
            }
          }

          // 6. Extracurriculars & Coursework
          let updatedExtracurriculars = [...state.cvData.extracurriculars];
          if (Array.isArray(data.extracurriculars) && data.extracurriculars.length > 0) {
            const incomingExtra = data.extracurriculars.map((ex: any, idx: number) => ({
              id: `extra-parsed-${idx}-${Date.now()}`,
              organization: ex.organization || "Community Activity",
              role: ex.role || "Participant",
              startDate: ex.startDate || "2023",
              endDate: ex.endDate || "Present",
              isCurrent: ex.endDate?.toLowerCase().includes("present") ?? false,
              bulletPoints: ex.bulletPoints || [],
            }));
            updatedExtracurriculars = [...updatedExtracurriculars, ...incomingExtra];
          }

          let updatedCoursework = [...state.selectedCoursework];
          if (Array.isArray(data.coursework) && data.coursework.length > 0) {
            updatedCoursework = Array.from(new Set([...updatedCoursework, ...data.coursework]));
          }

          return {
            showExperience: hasExp,
            selectedProjects: updatedSelectedProjects,
            customProjects: updatedCustomProjects,
            projectAnswers: updatedProjectAnswers,
            selectedCoursework: updatedCoursework,
            lastSavedTimestamp: Date.now(),
            cvData: {
              ...state.cvData,
              showExperience: hasExp,
              contact: { ...state.cvData.contact, ...contactPatch },
              education: updatedEducation,
              experience: updatedExperience,
              skills: updatedSkills,
              extracurriculars: updatedExtracurriculars,
              coursework: updatedCoursework.map((cw, i) => ({
                id: `cw-${i}-${Date.now()}`,
                title: cw,
                date: "2024",
              })),
            },
          };
        }),

      fastFillFromOldCV: (parsed) => {
        useCVStore.getState().hydrateFromParsedCV(parsed);
      },

      resetToDefaults: () => {
        const profile = get().studentProfile || MOCK_42_STUDENT;
        const initialCV = createInitialCVFromIntra(profile);
        set({
          currentStep: get().studentProfile ? "SETUP" : "LOGIN",
          targetRole: "Software Engineer",
          educationState: "STATE_A_CORE",
          specializationTrack: "Advanced Software Architecture",
          showExperience: false,
          styleDensity: "standard",
          showExtracurriculars: true,
          selectedProjects: [
            { name: "Webserv", slug: "webserv", techStack: "C++, HTTP/1.1, Sockets", date: "February 2025", is42Project: true },
            { name: "Minishell", slug: "minishell", techStack: "C, Unix System Calls", date: "June 2024", is42Project: true },
            { name: "Cub3D", slug: "cub3d", techStack: "C, MiniLibX, Raycasting", date: "August 2024", is42Project: true },
            { name: "Philosophers", slug: "philosophers", techStack: "C, Threads, Mutexes", date: "April 2024", is42Project: true },
          ],
          customProjects: [],
          projectAnswers: {},
          selectedCampusRoles: ["Black Ops"],
          campusRoleAnswers: {},
          selectedCoursework: [],
          cvData: initialCV,
          lastSavedTimestamp: Date.now(),
        });
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("42beirut_recruit_draft_v1");
            localStorage.removeItem("42_rezi_draft_v1");
          } catch (e) {
            console.warn("Could not clear localStorage draft:", e);
          }
        }
      },
    }),
    {
      name: "42beirut_recruit_draft_v1",
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          if (typeof window === "undefined") return null;
          try {
            return window.localStorage.getItem(name) || window.localStorage.getItem("42_rezi_draft_v1");
          } catch {
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          if (typeof window === "undefined") return;
          try {
            window.localStorage.setItem(name, value);
          } catch {}
        },
        removeItem: (name: string) => {
          if (typeof window === "undefined") return;
          try {
            window.localStorage.removeItem(name);
          } catch {}
        },
      })),
      partialize: (state) => ({
        currentStep: state.currentStep,
        studentProfile: state.studentProfile,
        targetRole: state.targetRole,
        educationState: state.educationState,
        specializationTrack: state.specializationTrack,
        showExperience: state.showExperience,
        styleDensity: state.styleDensity,
        showExtracurriculars: state.showExtracurriculars,
        selectedProjects: state.selectedProjects,
        customProjects: state.customProjects,
        projectAnswers: state.projectAnswers,
        selectedCampusRoles: state.selectedCampusRoles,
        campusRoleAnswers: state.campusRoleAnswers,
        selectedCoursework: state.selectedCoursework,
        cvData: state.cvData,
        lastSavedTimestamp: state.lastSavedTimestamp,
        userGeminiKey: state.userGeminiKey,
        userGroqKey: state.userGroqKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function useHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);
  return hasHydrated;
}
