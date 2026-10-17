import { CVData } from "@/types/resume";

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
  id: 134522,
  login: "mhamdan",
  email: "mhamdan@student.42beirut.com",
  displayname: "Mohammad Hamdan",
  image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
  campusName: "Beirut",
  campusId: 43,
  level: 9.85,
  grade: "Learner",
  poolMonth: "September",
  poolYear: 2023,
  coalition: "Phoenicians",
  beginAt: "2023-11-06T08:00:00.000Z",
  validatedProjects: [
    { id: 12, name: "ft_transcendence", slug: "ft_transcendence", finalMark: 125, validated: true, markedAt: "2025-05-20T12:00:00.000Z", date: "May 2025" },
    { id: 11, name: "Webserv", slug: "webserv", finalMark: 125, validated: true, markedAt: "2025-02-10T14:30:00.000Z", date: "February 2025" },
    { id: 10, name: "Inception", slug: "inception", finalMark: 105, validated: true, markedAt: "2024-11-15T10:00:00.000Z", date: "November 2024" },
    { id: 9, name: "CPP Modules", slug: "cpp-modules", finalMark: 100, validated: true, markedAt: "2024-10-02T16:15:00.000Z", date: "October 2024" },
    { id: 8, name: "Cub3D", slug: "cub3d", finalMark: 115, validated: true, markedAt: "2024-08-14T09:45:00.000Z", date: "August 2024" },
    { id: 7, name: "Minishell", slug: "minishell", finalMark: 115, validated: true, markedAt: "2024-06-25T11:20:00.000Z", date: "June 2024" },
    { id: 6, name: "Philosophers", slug: "philosophers", finalMark: 100, validated: true, markedAt: "2024-04-18T13:00:00.000Z", date: "April 2024" },
    { id: 5, name: "Minitalk", slug: "minitalk", finalMark: 125, validated: true, markedAt: "2024-03-05T15:10:00.000Z", date: "March 2024" },
    { id: 4, name: "Push_swap", slug: "push_swap", finalMark: 100, validated: true, markedAt: "2024-02-20T17:00:00.000Z", date: "February 2024" },
    { id: 3, name: "Born2beRoot", slug: "born2beroot", finalMark: 110, validated: true, markedAt: "2024-01-10T14:00:00.000Z", date: "January 2024" },
    { id: 2, name: "ft_printf", slug: "ft_printf", finalMark: 100, validated: true, markedAt: "2023-12-15T12:00:00.000Z", date: "December 2023" },
    { id: 1, name: "Libft", slug: "libft", finalMark: 125, validated: true, markedAt: "2023-12-01T10:00:00.000Z", date: "December 2023" },
  ],
};

/**
 * Pre-fills an initial baseline CV from 42 Intra profile data
 */
export function createInitialCVFromIntra(
  user: MockIntraUser,
  targetRole = "Software Engineer",
  showExperience = false
): CVData {
  const isTranscendenceDone = user.validatedProjects.some(
    (p) => p.slug === "ft_transcendence" && p.validated
  );
  const educationState = isTranscendenceDone || user.level >= 10.0 ? "STATE_B_SPECIALIZATION" : "STATE_A_CORE";

  return {
    targetRole,
    showExperience,
    styleDensity: "standard",
    showExtracurriculars: true,
    educationState,
    specializationTrack: educationState === "STATE_B_SPECIALIZATION" ? "Advanced Software Architecture" : undefined,
    contact: {
      fullName: user.displayname,
      level: Math.floor(user.level),
      email: user.email,
      phoneNumber: "+961 70 123 456",
      githubUrl: `github.com/${user.login}`,
      linkedinUrl: `linkedin.com/in/${user.login}`,
      location: "Beirut, Lebanon",
    },
    education: [
      {
        id: "edu-42",
        institution: "42 Beirut",
        program:
          educationState === "STATE_A_CORE"
            ? "42 Core Curriculum - Architecture of Digital Technologies Program"
            : "Completed the 42 Core Curriculum - Architecture of Digital Technologies Program",
        startDate: "2023",
        endDate: "Present",
        isCurrent: true,
        level: Math.floor(user.level),
        state: educationState,
        specializationTrack:
          educationState === "STATE_B_SPECIALIZATION" ? "Advanced Software Architecture" : undefined,
      },
    ],
    experience: [],
    projects: [
      {
        id: "proj-webserv",
        name: "Webserv",
        slug: "webserv",
        is42Project: true,
        techStack: "C++, HTTP/1.1, Socket Programming, CGI",
        date: "February 2025",
        bulletPoints: [
          "Developed an HTTP/1.1 web server from scratch in C++ supporting GET, POST, and DELETE methods.",
          "Implemented non-blocking I/O using poll() for concurrent client connections with custom configuration parsing.",
          "Integrated CGI execution for dynamic scripts using fork, execve, and inter-process communication pipes.",
        ],
      },
      {
        id: "proj-minishell",
        name: "Minishell",
        slug: "minishell",
        is42Project: true,
        techStack: "C, Unix System Calls, Process Management",
        date: "June 2024",
        bulletPoints: [
          "Developed a custom Unix shell in C with support for command execution, pipelines, and I/O redirections.",
          "Implemented process management using fork, execve, and wait, replicating standard Bash built-in commands.",
          "Designed a custom lexer and parser to tokenize user input, handle quotes, and expand environment variables.",
        ],
      },
      {
        id: "proj-cub3d",
        name: "Cub3D",
        slug: "cub3d",
        is42Project: true,
        techStack: "C, MiniLibX, Raycasting",
        date: "August 2024",
        bulletPoints: [
          "Built a 3D raycasting game engine in C using MiniLibX, rendering a first-person view based on a 2D map.",
          "Implemented player movement, wall collision detection, and texture mapping using the DDA algorithm.",
        ],
      },
      {
        id: "proj-philosophers",
        name: "Philosophers",
        slug: "philosophers",
        is42Project: true,
        techStack: "C, POSIX Threads, Mutexes",
        date: "April 2024",
        bulletPoints: [
          "Built a multithreaded simulation in C to solve the Dining Philosophers synchronization problem.",
          "Prevented deadlocks and data races using asymmetric mutex locking verified with ThreadSanitizer.",
        ],
      },
    ],
    skills: {
      languages: ["C", "C++", "Python", "SQL", "Bash"],
      developerTools: ["VS Code", "Git", "GDB", "Valgrind", "Docker"],
      technologiesFrameworks: ["Linux", "Nginx", "POSIX Threads", "Make"],
      projectManagementTools: ["GitHub", "JIRA"],
    },
    coursework: [
      {
        id: "cw-cyber",
        title: "42 Beirut Extracurricular Cybersecurity Piscine",
        date: "May 2025",
        institution: "42 Beirut",
      },
    ],
    extracurriculars: [
      {
        id: "ec-blackops",
        organization: "42 Beirut Black Ops",
        role: "Lead Peer Mentor",
        startDate: "2024",
        endDate: "Present",
        isCurrent: true,
        bulletPoints: [
          "Mentored newer cadets through Common Core C programming and Unix system concepts.",
          "Conducted structured peer evaluations and assisted with campus workshop organization.",
        ],
      },
    ],
  };
}
