// 42 Project Knowledge Base - Pre-seeded data for questionnaire generation
// Based on real CV analysis of 42 Beirut students + Dr. Wissam template
// Covers ALL 42 Common Core projects + smart universal fallback for unlisted projects

export interface ProjectKnowledge {
  slug: string;
  aliases?: string[];
  displayName: string;
  circle: number;
  category: string;
  description: string;
  defaultTechStack: string[];
  questionnaireQuestions: QuestionnaireQuestion[];
  defaultBullets: string[];
  relatedSkills: {
    languages: string[];
    devTools: string[];
    techFrameworks: string[];
  };
}

export interface QuestionnaireQuestion {
  id: string;
  type: "checkbox" | "radio" | "text";
  question: string;
  options?: string[];
  placeholder?: string;
}

export const PROJECT_KNOWLEDGE_BASE: ProjectKnowledge[] = [
  // ==========================================
  // CIRCLE 0
  // ==========================================
  {
    slug: "libft",
    aliases: ["42cursus-libft"],
    displayName: "Libft",
    circle: 0,
    category: "C Fundamentals",
    description: "Custom implementation of standard C library functions plus utility functions.",
    defaultTechStack: ["C", "Makefile"],
    questionnaireQuestions: [
      {
        id: "libft-bonus",
        type: "radio",
        question: "Did you complete the bonus part (linked list utilities)?",
        options: ["Yes", "No"],
      },
      {
        id: "libft-extra",
        type: "text",
        question: "Did you add any custom utility functions to your library?",
        placeholder: "e.g., ft_printf integration, get_next_line, memory safety helpers",
      },
    ],
    defaultBullets: [
      "Implemented 40+ standard C library functions from scratch, including string manipulation, memory management, and linked list operations.",
      "Built a reusable static library used as the low-level foundation for all subsequent C projects at 42.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Make", "GDB", "Valgrind"],
      techFrameworks: ["Linux"],
    },
  },
  {
    slug: "ft_printf",
    aliases: ["42cursus-ft_printf", "printf"],
    displayName: "ft_printf",
    circle: 0,
    category: "C Fundamentals",
    description: "Custom implementation of the printf function with variadic arguments.",
    defaultTechStack: ["C", "Variadic Functions", "Makefile"],
    questionnaireQuestions: [
      {
        id: "printf-specifiers",
        type: "checkbox",
        question: "Which format specifiers did you implement?",
        options: ["%c", "%s", "%p", "%d/%i", "%u", "%x/%X", "%%"],
      },
      {
        id: "printf-bonus",
        type: "radio",
        question: "Did you implement bonus flags (width, precision, #, +, space)?",
        options: ["Yes", "No"],
      },
    ],
    defaultBullets: [
      "Implemented a custom printf function handling 7+ format specifiers using variadic arguments in C.",
      "Built a modular parsing and formatting engine matching standard libc printf output byte-for-byte.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Make", "GDB"],
      techFrameworks: ["Linux"],
    },
  },
  {
    slug: "get_next_line",
    aliases: ["42cursus-get_next_line", "gnl"],
    displayName: "get_next_line",
    circle: 1,
    category: "C Memory & I/O",
    description: "Function to read line-by-line from file descriptors using static buffer management.",
    defaultTechStack: ["C", "File I/O", "Buffer Management"],
    questionnaireQuestions: [
      {
        id: "gnl-bonus",
        type: "radio",
        question: "Did you implement the bonus (managing multiple file descriptors simultaneously)?",
        options: ["Yes (multiple file descriptors)", "No (single descriptor)"],
      },
      {
        id: "gnl-buffer",
        type: "text",
        question: "Any specific buffer sizes or edge cases verified?",
        placeholder: "e.g., Tested across BUFFER_SIZE=1 to BUFFER_SIZE=10000000 with zero memory leaks",
      },
    ],
    defaultBullets: [
      "Developed a robust C function to read arbitrary lines from file descriptors, managing dynamic memory and static buffers.",
      "Handled edge cases including EOF, variable buffer sizes, and simultaneous reading across multiple file descriptors with zero memory leaks.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Valgrind", "GDB", "Make"],
      techFrameworks: ["Linux"],
    },
  },

  // ==========================================
  // CIRCLE 1
  // ==========================================
  {
    slug: "born2beroot",
    aliases: ["42cursus-born2beroot", "b2br"],
    displayName: "Born2beRoot",
    circle: 1,
    category: "System Administration",
    description: "Linux server setup and hardening with strict security policies.",
    defaultTechStack: ["Linux", "Debian", "SSH", "UFW", "LVM", "Sudo"],
    questionnaireQuestions: [
      {
        id: "b2br-os",
        type: "radio",
        question: "Which distribution did you configure?",
        options: ["Debian", "Rocky Linux"],
      },
      {
        id: "b2br-security",
        type: "checkbox",
        question: "Which security configurations did you implement?",
        options: [
          "LVM encrypted disk partitioning",
          "UFW firewall with custom SSH port",
          "Password complexity policies via PAM",
          "Strict Sudo logging and access rules",
          "Automated monitoring script via Cron",
        ],
      },
      {
        id: "b2br-bonus",
        type: "checkbox",
        question: "Bonus services configured?",
        options: ["WordPress with Lighttpd", "Custom service deployment"],
      },
    ],
    defaultBullets: [
      "Configured a Debian-based virtual server with strict security policies including UFW firewall, custom SSH port, and password complexity enforcement via PAM.",
      "Set up LVM disk partitioning with encrypted volumes and automated system monitoring scripts running via cron.",
    ],
    relatedSkills: {
      languages: ["Bash"],
      devTools: ["VirtualBox", "VS Code"],
      techFrameworks: ["Linux", "SSH", "UFW"],
    },
  },

  // ==========================================
  // CIRCLE 2
  // ==========================================
  {
    slug: "push_swap",
    aliases: ["42cursus-push_swap"],
    displayName: "Push_swap",
    circle: 2,
    category: "Algorithms",
    description: "Sorting algorithm implementation using two stacks with minimal operations.",
    defaultTechStack: ["C", "Algorithm Optimization", "Stack Operations"],
    questionnaireQuestions: [
      {
        id: "ps-algorithm",
        type: "radio",
        question: "Which sorting algorithm/strategy did you implement?",
        options: [
          "Turk algorithm (cheapest move)",
          "Radix sort (bitwise)",
          "Merge-insertion (Ford-Johnson)",
          "Chunk-based sorting",
          "Custom optimized algorithm",
        ],
      },
      {
        id: "ps-operations",
        type: "text",
        question: "Approximately how many operations for 500 numbers?",
        placeholder: "e.g., ~5,200 operations for 500 numbers (below max score threshold)",
      },
    ],
    defaultBullets: [
      "Implemented an optimized sorting algorithm in C to sort integer stacks using a constrained set of instructions.",
      "Optimized algorithmic efficiency to sort 500 numbers in minimal operations, balancing time complexity and instruction count.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["GDB", "Valgrind", "Make"],
      techFrameworks: ["Linux"],
    },
  },
  {
    slug: "pipex",
    aliases: ["42cursus-pipex"],
    displayName: "Pipex",
    circle: 2,
    category: "Unix System",
    description: "Recreating shell pipe and redirection mechanism using Unix IPC.",
    defaultTechStack: ["C", "Unix Pipes", "fork", "execve", "File Redirection"],
    questionnaireQuestions: [
      {
        id: "pipex-bonus",
        type: "checkbox",
        question: "Which bonus features did you implement?",
        options: [
          "Multiple pipes (chaining unlimited commands)",
          "Heredoc (<<) and append (>>) redirections",
          "Dynamic environment PATH resolution",
        ],
      },
    ],
    defaultBullets: [
      "Reproduced Unix pipeline behavior in C using pipe(), fork(), dup2(), and execve() to execute chained commands.",
      "Implemented input/output file redirections, heredoc parsing, and graceful process error handling.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Make", "Valgrind", "GDB"],
      techFrameworks: ["Linux"],
    },
  },
  {
    slug: "so_long",
    aliases: ["42cursus-so_long"],
    displayName: "So_long",
    circle: 2,
    category: "2D Graphics",
    description: "2D top-down game engine built in C using MiniLibX with map validation.",
    defaultTechStack: ["C", "MiniLibX", "2D Graphics", "Event Handling"],
    questionnaireQuestions: [
      {
        id: "sl-algorithm",
        type: "radio",
        question: "Which algorithm did you use for map path validation?",
        options: ["Flood-fill algorithm", "Breadth-First Search (BFS)", "Depth-First Search (DFS)"],
      },
      {
        id: "sl-bonus",
        type: "checkbox",
        question: "Bonus features included?",
        options: ["Patrolling enemy sprites", "Sprite animations", "On-screen movement counter"],
      },
    ],
    defaultBullets: [
      "Developed a 2D top-down game engine in C using MiniLibX, handling sprite rendering, keyboard events, and player movement.",
      "Implemented map parsing and flood-fill path validation algorithm to verify reachable exits and collectibles before initialization.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Make", "MiniLibX"],
      techFrameworks: ["Linux"],
    },
  },
  {
    slug: "fdf",
    aliases: ["42cursus-fdf"],
    displayName: "FdF",
    circle: 2,
    category: "3D Wireframe Graphics",
    description: "3D wireframe altitude landscape visualizer using isometric projections.",
    defaultTechStack: ["C", "MiniLibX", "Isometric Projection", "Bresenham Algorithm"],
    questionnaireQuestions: [
      {
        id: "fdf-features",
        type: "checkbox",
        question: "Which graphics features did you implement?",
        options: [
          "Bresenham line-drawing algorithm",
          "Isometric & parallel projection toggles",
          "Interactive rotation, translation, and zoom",
          "Color gradients based on altitude (Z-axis)",
        ],
      },
    ],
    defaultBullets: [
      "Engineered a 3D wireframe graphics visualizer in C using MiniLibX to render altitude landscapes from raw coordinate maps.",
      "Implemented Bresenham line-drawing algorithm and isometric mathematical projections with interactive zoom and camera rotation.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Make", "MiniLibX"],
      techFrameworks: ["Linux"],
    },
  },
  {
    slug: "minitalk",
    aliases: ["42cursus-minitalk"],
    displayName: "Minitalk",
    circle: 2,
    category: "Unix System",
    description: "Client-server communication using Unix signals (SIGUSR1/SIGUSR2).",
    defaultTechStack: ["C", "Unix Signals", "IPC", "Bitwise Operations"],
    questionnaireQuestions: [
      {
        id: "mt-bonus",
        type: "checkbox",
        question: "Bonus features implemented?",
        options: [
          "Server acknowledgment signal back to client",
          "Unicode / UTF-8 multi-byte character support",
        ],
      },
    ],
    defaultBullets: [
      "Built a client-server messaging system using Unix signals (SIGUSR1/SIGUSR2) for inter-process communication in C.",
      "Implemented bitwise message encoding and signal handling to transmit strings between independent processes.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Make", "GDB"],
      techFrameworks: ["Linux"],
    },
  },

  // ==========================================
  // CIRCLE 3
  // ==========================================
  {
    slug: "philosophers",
    aliases: ["42cursus-philosophers", "philo"],
    displayName: "Philosophers",
    circle: 3,
    category: "Concurrency",
    description: "Dining philosophers simulation with multithreading and mutex synchronization.",
    defaultTechStack: ["C", "Multithreading", "Mutexes", "POSIX Threads"],
    questionnaireQuestions: [
      {
        id: "philo-approach",
        type: "radio",
        question: "How did you prevent deadlocks?",
        options: [
          "Asymmetric mutex locking (odd/even philosophers)",
          "Strict resource hierarchy",
          "Timestamp and state-based scheduling",
        ],
      },
      {
        id: "philo-bonus",
        type: "radio",
        question: "Did you implement the bonus (multi-process with POSIX semaphores)?",
        options: ["Yes (semaphores + processes)", "No (threads only)"],
      },
    ],
    defaultBullets: [
      "Built a multithreaded simulation of the Dining Philosophers problem in C using pthreads and mutex synchronization.",
      "Prevented deadlocks and data races using asymmetric mutex locking, verified clean via ThreadSanitizer and Valgrind.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Valgrind", "GDB", "ThreadSanitizer"],
      techFrameworks: ["Linux", "POSIX Threads"],
    },
  },
  {
    slug: "minishell",
    aliases: ["42cursus-minishell"],
    displayName: "Minishell",
    circle: 3,
    category: "Unix System",
    description: "Custom Unix shell with parsing, execution, pipelines, redirections, and built-ins.",
    defaultTechStack: ["C", "Unix System Calls", "Process Management", "Lexer/Parser"],
    questionnaireQuestions: [
      {
        id: "ms-role",
        type: "radio",
        question: "Project collaboration type?",
        options: ["Solo implementation", "Team of 2 collaboration"],
      },
      {
        id: "ms-responsibility",
        type: "checkbox",
        question: "Which parts were your primary responsibility?",
        options: [
          "Lexer/Tokenizer (syntax state machine)",
          "Parser (Abstract Syntax Tree / Command tables)",
          "Built-in commands (cd, echo, env, export, unset, pwd, exit)",
          "Pipelines and I/O redirections (<, >, <<, >>)",
          "Signal handling (SIGINT, SIGQUIT, EOF)",
          "Environment variable expansion and quote stripping",
        ],
      },
      {
        id: "ms-detail",
        type: "text",
        question: "Highlight a specific technical feature you engineered:",
        placeholder: "e.g., Engineered AST parser handling nested quotes and heredoc tempfile buffers",
      },
    ],
    defaultBullets: [
      "Built a Unix shell from scratch in C with support for pipelines, I/O redirections, heredocs, and environment variable expansion.",
      "Implemented POSIX built-in commands and signal handlers replicating standard Bash behavior.",
      "Designed a custom lexer and parser to tokenize and execute complex command-line inputs.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["GDB", "Valgrind", "Make"],
      techFrameworks: ["Linux", "Git"],
    },
  },

  // ==========================================
  // CIRCLE 4
  // ==========================================
  {
    slug: "cub3d",
    aliases: ["42cursus-cub3d", "cub3D"],
    displayName: "Cub3D",
    circle: 4,
    category: "Graphics & 3D Engines",
    description: "3D raycasting game engine inspired by Wolfenstein 3D using MiniLibX in C.",
    defaultTechStack: ["C", "MiniLibX", "Raycasting", "DDA Algorithm", "Linear Algebra"],
    questionnaireQuestions: [
      {
        id: "cub-features",
        type: "checkbox",
        question: "Which raycasting engine features did you implement?",
        options: [
          "DDA (Digital Differential Analyzer) raycasting algorithm",
          "Wall texture mapping with perspective correction",
          "Player movement with wall collision detection",
          "Minimap radar overlay",
          "Animated sprites and interactive doors",
          "Mouse-controlled camera rotation",
        ],
      },
      {
        id: "cub-role",
        type: "radio",
        question: "Collaboration structure?",
        options: ["Solo", "Team of 2"],
      },
    ],
    defaultBullets: [
      "Built a 3D raycasting game engine in C using MiniLibX, rendering a first-person 3D view from 2D grid maps.",
      "Implemented texture mapping, wall collision detection, and mathematical ray casting using the DDA algorithm.",
    ],
    relatedSkills: {
      languages: ["C"],
      devTools: ["Make", "GDB", "MiniLibX"],
      techFrameworks: ["Linux"],
    },
  },
  {
    slug: "netpractice",
    aliases: ["42cursus-netpractice"],
    displayName: "NetPractice",
    circle: 4,
    category: "Networking Fundamentals",
    description: "TCP/IP networking, IPv4 subnetting, and routing table configuration.",
    defaultTechStack: ["TCP/IP", "IPv4", "Subnetting", "Routing Tables"],
    questionnaireQuestions: [
      {
        id: "np-topics",
        type: "checkbox",
        question: "Key networking concepts mastered?",
        options: [
          "CIDR subnet mask calculation and bitwise operations",
          "Private vs public IP address space routing",
          "Next-hop gateway configuration",
          "Multi-interface router topology troubleshooting",
        ],
      },
    ],
    defaultBullets: [
      "Configured complex IPv4 network topologies, computing CIDR subnet masks, routing tables, and interface gateways.",
      "Analyzed TCP/IP network packet paths to establish end-to-end communication across multi-router networks.",
    ],
    relatedSkills: {
      languages: ["Bash"],
      devTools: ["Wireshark"],
      techFrameworks: ["TCP/IP", "Networking"],
    },
  },
  {
    slug: "cpp-modules",
    aliases: [
      "42cursus-cpp-modules",
      "cpp",
      "cpp00",
      "cpp01",
      "cpp02",
      "cpp03",
      "cpp04",
      "cpp05",
      "cpp06",
      "cpp07",
      "cpp08",
      "cpp09",
      "cpp-module-00",
      "cpp-module-01",
      "cpp-module-02",
      "cpp-module-03",
      "cpp-module-04",
      "cpp-module-05",
      "cpp-module-06",
      "cpp-module-07",
      "cpp-module-08",
      "cpp-module-09",
    ],
    displayName: "C++ Modules (00–09)",
    circle: 4,
    category: "Object-Oriented Programming",
    description: "Series of 10 C++ modules covering OOP, polymorphism, templates, and STL.",
    defaultTechStack: ["C++98", "OOP", "Templates", "STL Containers"],
    questionnaireQuestions: [
      {
        id: "cpp-modules-completed",
        type: "checkbox",
        question: "Which module tracks did you complete?",
        options: [
          "CPP 00-04 (Classes, Orthodox Canonical Form, Inheritance, Subtype Polymorphism)",
          "CPP 05-09 (Exceptions, Type Casts, Templates, STL Containers, Ford-Johnson Algorithm)",
        ],
      },
      {
        id: "cpp-highlight",
        type: "text",
        question: "Highlight an exercise you built in C++:",
        placeholder: "e.g., Ford-Johnson merge-insertion sort in CPP09, RPN evaluator, or Bureaucrat exception chain",
      },
    ],
    defaultBullets: [
      "Completed intensive C++ modules mastering Orthodox Canonical Form, inheritance hierarchies, and dynamic polymorphism.",
      "Implemented generic programming with templates and standard STL containers, including exception-safe class architectures.",
    ],
    relatedSkills: {
      languages: ["C++"],
      devTools: ["VS Code", "Make", "GDB"],
      techFrameworks: ["Linux"],
    },
  },

  // ==========================================
  // CIRCLE 5
  // ==========================================
  {
    slug: "inception",
    aliases: ["42cursus-inception"],
    displayName: "Inception",
    circle: 5,
    category: "DevOps & Infrastructure",
    description: "Multi-container Docker infrastructure with NGINX, WordPress, and MariaDB.",
    defaultTechStack: ["Docker", "Docker Compose", "NGINX", "MariaDB", "WordPress", "Alpine Linux"],
    questionnaireQuestions: [
      {
        id: "inc-security",
        type: "checkbox",
        question: "Which infrastructure features did you configure?",
        options: [
          "TLS v1.2 / TLS v1.3 encryption with custom self-signed certificates",
          "Dedicated Docker bridge networks with isolated inter-container communication",
          "Persistent Docker data volumes for database and web files",
          "Custom lightweight Alpine Linux container images without pre-built DockerHub stacks",
        ],
      },
      {
        id: "inc-bonus",
        type: "checkbox",
        question: "Bonus services configured?",
        options: ["Redis object cache", "FTP server", "Static website container", "Adminer database GUI"],
      },
    ],
    defaultBullets: [
      "Architected multi-container infrastructure on Alpine Linux using Docker and Docker Compose, enforcing TLS v1.3 encryption.",
      "Configured isolated container networks, persistent volumes, and secure MariaDB database connections.",
    ],
    relatedSkills: {
      languages: ["Bash"],
      devTools: ["Docker", "Docker Compose", "VS Code"],
      techFrameworks: ["Linux", "NGINX", "MariaDB"],
    },
  },
  {
    slug: "ft_irc",
    aliases: ["42cursus-ft_irc", "irc"],
    displayName: "ft_irc",
    circle: 5,
    category: "Networking & Sockets",
    description: "RFC 1459/2812 compliant IRC server in C++ using non-blocking TCP socket multiplexing.",
    defaultTechStack: ["C++", "Socket Programming", "TCP/IP", "poll/select", "IRC Protocol"],
    questionnaireQuestions: [
      {
        id: "irc-io",
        type: "radio",
        question: "Which I/O multiplexing mechanism did you use?",
        options: ["poll()", "select()", "epoll()", "kqueue()"],
      },
      {
        id: "irc-features",
        type: "checkbox",
        question: "Which protocol commands and features did you implement?",
        options: [
          "Non-blocking TCP socket multiplexing for multiple concurrent clients",
          "User authentication (PASS, NICK, USER)",
          "Channel operations (JOIN, PART, PRIVMSG, TOPIC)",
          "Channel operator permissions (KICK, INVITE, MODE: +i, +t, +k, +o, +l)",
          "Automated IRC bot integration",
        ],
      },
    ],
    defaultBullets: [
      "Developed an RFC-compliant IRC server in C++ implementing non-blocking TCP socket multiplexing via poll().",
      "Handled concurrent client connections, user authentication, channel management, and operator privileges.",
    ],
    relatedSkills: {
      languages: ["C++"],
      devTools: ["Make", "VS Code"],
      techFrameworks: ["Linux", "TCP/IP"],
    },
  },
  {
    slug: "webserv",
    aliases: ["42cursus-webserv"],
    displayName: "Webserv",
    circle: 5,
    category: "Networking & HTTP Architecture",
    description: "HTTP/1.1 web server in C++ with non-blocking I/O, custom configuration, and CGI.",
    defaultTechStack: ["C++", "HTTP/1.1", "Socket Programming", "poll/select", "CGI", "Nginx Architecture"],
    questionnaireQuestions: [
      {
        id: "ws-io",
        type: "radio",
        question: "Which I/O multiplexing function did you implement?",
        options: ["poll()", "select()", "epoll()", "kqueue()"],
      },
      {
        id: "ws-features",
        type: "checkbox",
        question: "Which server features did you personally build?",
        options: [
          "HTTP methods: GET, POST, DELETE with accurate status codes",
          "CGI execution for dynamic scripts (Python/PHP) via fork/execve/pipes",
          "Chunked transfer encoding and multipart/form-data file uploads",
          "Custom Nginx-inspired configuration parser supporting multiple virtual hosts",
          "Custom error pages and automatic directory index listings",
        ],
      },
      {
        id: "ws-role",
        type: "radio",
        question: "Team composition?",
        options: ["Solo implementation", "Team of 2", "Team of 3"],
      },
    ],
    defaultBullets: [
      "Built an HTTP/1.1 web server from scratch in C++ supporting GET, POST, and DELETE methods with non-blocking I/O.",
      "Implemented dynamic CGI script execution, file upload handling, and custom NGINX-style configuration parsing.",
      "Architected socket multiplexing via poll() to sustain concurrent client connections with defensive error handling.",
    ],
    relatedSkills: {
      languages: ["C++"],
      devTools: ["Make", "Postman", "VS Code"],
      techFrameworks: ["Linux", "HTTP/1.1", "CGI"],
    },
  },

  // ==========================================
  // CIRCLE 6
  // ==========================================
  {
    slug: "ft_transcendence",
    aliases: ["42cursus-ft_transcendence", "transcendence"],
    displayName: "ft_transcendence",
    circle: 6,
    category: "Full-Stack Web Architecture",
    description: "Full-stack real-time web application featuring multiplayer Pong, OAuth2, 2FA, and WebSockets.",
    defaultTechStack: ["TypeScript", "Full-Stack", "WebSockets", "Docker", "OAuth2", "PostgreSQL"],
    questionnaireQuestions: [
      {
        id: "ft-role",
        type: "radio",
        question: "What was your core responsibility on the team?",
        options: [
          "Backend Engineer (APIs, Database, WebSockets)",
          "Frontend Engineer (UI, Game Rendering, State)",
          "Full-Stack Engineer (End-to-end integration)",
          "DevOps & Security (Docker, OAuth2, 2FA)",
        ],
      },
      {
        id: "ft-stack",
        type: "text",
        question: "What web frameworks/technologies did you use?",
        placeholder: "e.g., NestJS, Next.js, Fastify, Django, React, PostgreSQL",
      },
      {
        id: "ft-features",
        type: "checkbox",
        question: "Which features did you personally implement?",
        options: [
          "Real-time multiplayer Pong game with WebSockets and matchmaking",
          "OAuth2 42 Intra authentication and two-factor authentication (2FA/TOTP)",
          "Live chat system with direct messages, channels, and game invites",
          "Relational database schema with PostgreSQL and ORM migrations",
          "Docker Compose multi-container deployment architecture",
        ],
      },
    ],
    defaultBullets: [
      "Built a full-stack real-time web application featuring online multiplayer Pong with WebSocket synchronization.",
      "Implemented OAuth2 authentication, two-factor authentication (TOTP), and secure RESTful backend APIs.",
      "Containerized all microservices using Docker Compose, integrating relational database management and live chat.",
    ],
    relatedSkills: {
      languages: ["TypeScript", "JavaScript", "SQL"],
      devTools: ["Docker", "Docker Compose", "VS Code"],
      techFrameworks: ["Linux", "WebSockets", "PostgreSQL"],
    },
  },
];

// ==============================================================
// SMART UNIVERSAL RESOLVER
// ==========================================
export function getProjectKnowledge(slug: string, displayName?: string): ProjectKnowledge {
  const normalized = (slug || "").toLowerCase().trim();

  // 1. Direct slug or alias match
  const found = PROJECT_KNOWLEDGE_BASE.find(
    (p) =>
      p.slug.toLowerCase() === normalized ||
      p.aliases?.some((a) => a.toLowerCase() === normalized) ||
      (displayName && p.displayName.toLowerCase() === displayName.toLowerCase())
  );

  if (found) return found;

  // 2. Fuzzy match on Common Core names
  for (const p of PROJECT_KNOWLEDGE_BASE) {
    if (normalized.includes(p.slug) || p.slug.includes(normalized)) {
      return p;
    }
  }

  // 3. Smart Universal Fallback for custom or unlisted projects
  const cleanName = displayName || slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    slug: slug || "custom-project",
    displayName: cleanName,
    circle: 0,
    category: "Software Engineering",
    description: `Technical project: ${cleanName}`,
    defaultTechStack: ["Software Engineering", "Testing"],
    questionnaireQuestions: [
      {
        id: "custom-architecture",
        type: "checkbox",
        question: "Which architectural concepts or paradigms did you apply?",
        options: [
          "Modular procedural architecture",
          "Object-oriented design patterns",
          "Client-server networking / REST APIs",
          "Asynchronous / Event-driven programming",
          "Database integration and normalization",
        ],
      },
      {
        id: "custom-responsibilities",
        type: "text",
        question: "What specific features or modules were your main responsibility?",
        placeholder: "e.g., Designed the backend schema, implemented user authentication, optimized performance",
      },
      {
        id: "custom-verification",
        type: "checkbox",
        question: "How did you verify and test your implementation?",
        options: [
          "Automated unit and integration testing",
          "Memory leak profiling (Valgrind / Sanitizers)",
          "Benchmarking and load testing",
          "Peer code review and CI validation",
        ],
      },
    ],
    defaultBullets: [
      `Engineered ${cleanName} utilizing structured software design principles and rigorous testing.`,
      `Implemented core application logic and validated system behavior across critical edge cases.`,
    ],
    relatedSkills: {
      languages: [],
      devTools: ["Git", "VS Code"],
      techFrameworks: ["Linux"],
    },
  };
}

// ==========================================
// 1-CLICK TECHNICAL HIGHLIGHT CHIPS FOR QUESTIONNAIRE
// ==========================================
export const COMMON_CORE_TECHNICAL_CHIPS: Record<string, string[]> = {
  libft: [
    "C Static Library",
    "Memory Management (malloc/free)",
    "Linked List Data Structures",
    "String Manipulation Algorithms",
    "Makefile Build Automation",
  ],
  ft_printf: [
    "Variadic Arguments (va_list)",
    "Hexadecimal & Pointer Conversion",
    "Custom Formatting Parser",
    "Buffer Management",
    "Format Specifier Validation",
  ],
  get_next_line: [
    "Static Buffer Management",
    "Dynamic Memory Reallocation",
    "File Descriptor I/O",
    "Newline Delimiter Parsing",
    "Zero Memory Leaks",
  ],
  born2beroot: [
    "Debian LVM Partitioning",
    "SSH Key Authentication",
    "UFW Firewall Rules",
    "Strict Sudoers Security Policy",
    "Bash Monitoring Cron Script",
    "Password Expiry Policies",
  ],
  push_swap: [
    "Dual-Stack Sorting Algorithm",
    "Radix / Chunk-Based Sorting",
    "Operation Optimization (ra/pb/rra)",
    "Algorithmic Complexity Control",
    "Integer Overflow Sanitization",
  ],
  pipex: [
    "Unix Pipes & Fork/Execve",
    "File Redirections (<, >, <<, >>)",
    "PATH Environment Resolution",
    "Child Process Lifecycle Control",
    "POSIX Exit Code Handling",
  ],
  so_long: [
    "2D Grid Parsing & Map Validation",
    "Flood Fill Pathfinding Algorithm",
    "MLX Window Event Loop",
    "Sprite & Texture Rendering",
    "Defensive Error Checking",
  ],
  philosophers: [
    "POSIX Threads (pthread)",
    "Mutex Synchronization",
    "Deadlock & Starvation Avoidance",
    "Microsecond Precision Timers",
    "Data Race Prevention",
    "Thread State Monitoring",
  ],
  minishell: [
    "AST Lexer & Parser",
    "Pipe & Redirections",
    "POSIX Signal Handling",
    "Fork/Execve Process Control",
    "Environment Variable Expansion",
    "Leak-Free Memory Management",
  ],
  cub3d: [
    "DDA Raycasting Engine",
    "MLX42 Framebuffer Rendering",
    "Texture & Sprite Mapping",
    "Wall Collision Detection",
    "Trigonometric Field-of-View",
    "Vector Movement Mathematics",
  ],
  netpractice: [
    "IPv4 Subnetting & CIDR Calculation",
    "Routing Tables & Default Gateways",
    "Private IP Ranges (RFC 1918)",
    "Subnet Masks & Broadcast Addresses",
    "Multi-Router Network Topology",
  ],
  cpp00: [
    "Orthodox Canonical Form",
    "Class Namespaces & Encapsulation",
    "Const Correctness",
    "Standard I/O Streams",
  ],
  cpp01: [
    "Dynamic Memory Allocation (new/delete)",
    "Pointers to Class Members",
    "Reference Variables",
    "Switch-based Dispatching",
  ],
  cpp02: [
    "Fixed-Point Number Representation",
    "Arithmetic Operator Overloading",
    "Ad-hoc Polymorphism",
    "Floating-Point Bitwise Conversion",
  ],
  cpp03: [
    "Class Inheritance Hierarchies",
    "Protected Access Specifiers",
    "Constructor/Destructor Chaining",
    "State Machine Emulation",
  ],
  cpp04: [
    "Subtype Polymorphism",
    "Abstract Classes & Pure Virtual Functions",
    "Virtual Destructors",
    "Deep vs Shallow Copying",
  ],
  cpp05: [
    "Custom Exception Classes",
    "Try/Catch Error Handling",
    "Grade Authorization Rules",
    "Form Processing Workflows",
  ],
  cpp06: [
    "C++ Type Casting (static/dynamic/reinterpret/const)",
    "Scalar Type Conversion",
    "Serialization & Deserialization",
    "RTTI Run-Time Type Identification",
  ],
  cpp07: [
    "Function Templates",
    "Class Templates",
    "Template Specialization",
    "Generic Array Implementations",
  ],
  cpp08: [
    "STL Sequence Containers (vector/deque/list)",
    "Standard Template Algorithms",
    "Iterator Traversal",
    "Span & Search Optimization",
  ],
  cpp09: [
    "Ford-Johnson Merge-Insertion Sort",
    "Reverse Polish Notation (RPN)",
    "Bitcoin Exchange Rate Lookup",
    "Container Selection Benchmarking",
  ],
  cpp_modules: [
    "Orthodox Canonical Form",
    "Object-Oriented Design (OOP)",
    "Operator Overloading",
    "Abstract Classes & Interfaces",
    "STL Containers & Algorithms",
    "Template Metaprogramming",
  ],
  inception: [
    "Custom Alpine Dockerfiles",
    "NGINX TLSv1.3 Reverse Proxy",
    "MariaDB & WordPress Volumes",
    "Docker Bridge Networking",
    "Docker Secrets & Security Setup",
    "Multi-Container Orchestration",
  ],
  webserv: [
    "Non-Blocking epoll/kqueue Loop",
    "HTTP/1.1 RFC Parser",
    "CGI Process Execution",
    "Chunked Transfer Encoding",
    "Multiplexed I/O Architecture",
    "Configuration File Parser",
  ],
  ft_irc: [
    "RFC 2812 IRC Protocol",
    "TCP Socket Multiplexing",
    "Channel & Operator Privileges",
    "Private & Broadcast Messaging",
    "Non-Blocking Network Event Loop",
    "Client Authentication Handshake",
  ],
  ft_transcendence: [
    "Full-Stack SPA Architecture",
    "Real-Time WebSockets Game Loop",
    "OAuth2 42 Authentication",
    "Two-Factor Auth (2FA / TOTP)",
    "PostgreSQL Relational Schema",
    "Docker Compose Microservices",
  ],
};

/**
 * Returns 4-6 curated technical chips for a given project slug or name,
 * with intelligent fallback to techStack tokens or software engineering concepts.
 */
export function getProjectTechnicalChips(slugOrName: string, techStack?: string): string[] {
  const norm = (slugOrName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Direct match on common core chips
  for (const [key, chips] of Object.entries(COMMON_CORE_TECHNICAL_CHIPS)) {
    const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (norm === keyNorm || norm.includes(keyNorm) || keyNorm.includes(norm)) {
      return [...chips];
    }
  }

  // 2. Dynamic generation based on techStack tokens
  const chips: string[] = [];
  if (techStack) {
    const tokens = techStack
      .split(/[,/|;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (lower.includes("react") || lower.includes("next")) {
        chips.push("Responsive Component Architecture", "Client/Server State Management");
      } else if (lower.includes("typescript")) {
        chips.push("Strict TypeScript Type Safety");
      } else if (lower.includes("docker")) {
        chips.push("Containerized Microservices", "Multi-Stage Docker Builds");
      } else if (lower.includes("sql") || lower.includes("postgres") || lower.includes("prisma")) {
        chips.push("Relational Database Schema", "Query & Index Optimization");
      } else if (lower.includes("python")) {
        chips.push("Python OOP Architecture", "Automated Testing Pipeline");
      } else if (lower.includes("c++") || lower.includes("cpp")) {
        chips.push("Modern C++ OOP Design", "RAII & Memory Safety");
      } else if (lower.includes("c") && !lower.includes("css")) {
        chips.push("Low-Level C Implementation", "Leak-Free Memory Safety");
      } else {
        chips.push(`${token} Integration`);
      }
    }
  }

  // 3. Fallback concepts if not enough chips
  const defaults = [
    "Modular Procedural Architecture",
    "Unit & Integration Testing",
    "Defensive Error Handling",
    "Performance Profiling & Optimization",
    "Clean Code & Separation of Concerns",
  ];

  for (const def of defaults) {
    if (chips.length >= 5) break;
    if (!chips.includes(def)) chips.push(def);
  }

  return chips.slice(0, 6);
}

// 42 Campus Roles
export interface CampusRole {
  internalName: string;
  professionalTitle: string;
  description: string;
  questionnaireQuestions: QuestionnaireQuestion[];
  defaultBullets: string[];
}

export const CAMPUS_ROLES: CampusRole[] = [
  {
    internalName: "Black Ops",
    professionalTitle: "Lead Peer Mentor",
    description:
      "Senior student mentoring program at 42 Beirut - mentoring newer students, supervising Piscine bootcamps, and conducting peer evaluations.",
    questionnaireQuestions: [
      {
        id: "bo-activities",
        type: "checkbox",
        question: "What activities were you involved in as Black Ops?",
        options: [
          "Mentoring newer students in C/C++ memory management",
          "Supervising Piscine bootcamp candidates",
          "Leading peer evaluation and code review sessions",
          "Organizing campus technical workshops",
        ],
      },
      {
        id: "bo-impact",
        type: "text",
        question: "Approximate scope or impact (optional):",
        placeholder: "e.g., Mentored 50+ students over 4 months",
      },
    ],
    defaultBullets: [
      "Mentored newer students in C programming, memory management, and Unix system fundamentals as part of the 42 Black Ops program.",
      "Supervised Piscine bootcamp sessions, providing guidance and code review to incoming candidates.",
    ],
  },
  {
    internalName: "Peer Evaluator",
    professionalTitle: "Technical Code Reviewer",
    description: "Conducted structured peer evaluations for fellow students' project submissions at 42.",
    questionnaireQuestions: [
      {
        id: "pe-count",
        type: "text",
        question: "Approximately how many peer evaluations have you conducted?",
        placeholder: "e.g., 60+ evaluations across C and C++ projects",
      },
    ],
    defaultBullets: [
      "Conducted peer code reviews across C/C++ projects, evaluating code quality, memory safety, and algorithmic correctness.",
    ],
  },
  {
    internalName: "Piscine Tuteur",
    professionalTitle: "Bootcamp Instructor",
    description: "Assisted as a tutor during 42's intensive Piscine admissions bootcamp.",
    questionnaireQuestions: [
      {
        id: "pt-piscine",
        type: "text",
        question: "Which Piscine(s) did you tutor?",
        placeholder: "e.g., September 2024 C Piscine",
      },
    ],
    defaultBullets: [
      "Assisted as a tutor during 42's 4-week intensive C bootcamp, helping candidates with debugging, algorithms, and shell scripting.",
    ],
  },
  {
    internalName: "Club / BDE Member",
    professionalTitle: "Developer Community Organizer",
    description: "Participated in or led a student club or BDE activities at 42 Beirut.",
    questionnaireQuestions: [
      {
        id: "club-name",
        type: "text",
        question: "Which club or organization?",
        placeholder: "e.g., 42 Beirut Cybersecurity Club, BDE",
      },
      {
        id: "club-role",
        type: "text",
        question: "What was your role and main contributions?",
        placeholder: "e.g., Organized 3 workshops and a campus CTF event",
      },
    ],
    defaultBullets: [
      "Organized campus events and workshops to foster community engagement among 42 Beirut students.",
    ],
  },
];

// Extracurricular piscines known at 42 Beirut
export const KNOWN_PISCINES = [
  "42 Beirut Extracurricular Cybersecurity Piscine",
  "42 Beirut Extracurricular Mobile Development Piscine",
  "42 Beirut Extracurricular Python for Data Science Piscine",
  "42 Beirut Extracurricular Blockchain Piscine",
];
