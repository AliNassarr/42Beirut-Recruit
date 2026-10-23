# PrintCV 🎓🚀
> The Official Automated ATS Resume Engine. Strictly adheres to the single-page A4 curriculum vitae reference standard established by CEO Dr. Wissam Sammouri.

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![Neon Database](https://img.shields.io/badge/Neon-PostgreSQL-00E599?logo=postgresql)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Overview

**PrintCV** is an enterprise-grade CV generation platform purpose-built for engineers. It automatically ingests verified technical projects, aligns them with recruiters' ATS requirements, and synthesizes 100% unique, grounded engineering bullet points with zero robotic fluff.

### Core Capabilities
* **Official Dr. Wissam Sammouri Layout**: Enforces strict single-page A4 typography, margin hierarchy, and the 4-category skills section (*Languages*, *Developer Tools*, *Technologies/Frameworks*, *Project Management Tools*).
* **Live A4 Page-Budget Meter**: Real-time `1027px` print-height observer with 1-click Auto-Fit density adjustment to guarantee strict single-page output.
* **1-Click Technical Highlight Chips**: Interactive discovery tags for engineering projects (`minishell`, `cub3D`, `Inception`, `webserv`, `ft_irc`, etc.) that populate implementation notes in seconds.
* **Anti-Verb Monotony Engine**: Grounded engineering action verbs with ledger-backed anti-duplication to prevent repetitive sentence openings across projects.
* **Dual Export Pipeline**: Native browser print-to-PDF (`@media print`) and pixel-perfect Microsoft Word (`.docx`) file generation matching exact tab stops and style rules.
* **Zero-Cost Scale**: Powered by Google Gemini 1.5 Flash (15 RPM / 1M TPM free tier) with cascading failover to Groq Llama 3.3 70B and local deterministic fallback.

---

## 🛠️ Architecture & Tech Stack

```
printcv/
├── prisma/
│   └── schema.prisma         # Neon PostgreSQL Prisma models & indices
├── src/
│   ├── app/                  # Next.js 14 App Router (pages & serverless API routes)
│   ├── components/           # Modular studio UI & templates
│   │   ├── studio/           # ReziStudioLayout, BulletEditorRow, CanvasPreviewViewport
│   │   └── templates/        # WissamCleanTemplate DOM & Print Layout
│   ├── lib/                  # AI synthesis, DOCX generator, Intra OAuth, Sanitizers
│   └── store/                # Persistent Zustand store with localStorage auto-save
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
* **Node.js**: `v18.18.0` or higher (Node 20 LTS recommended)
* **npm** or **pnpm**
* **Git**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/AliNassarr/printcv.git
cd printcv

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the provided `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your secrets:
* `DATABASE_URL`: Your Neon PostgreSQL pooled connection string.
* `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`.
* `FORTY_TWO_CLIENT_ID` / `FORTY_TWO_CLIENT_SECRET`: From your [42 Intra OAuth Applications](https://profile.intra.42.fr/oauth/applications).
* `GOOGLE_GENERATIVE_AI_API_KEY`: From [Google AI Studio](https://aistudio.google.com/).

### 4. Database Setup & Build
```bash
# Generate the Prisma Client
npx prisma generate

# Run the local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Production Deployment (Vercel + Neon)

1. **Deploy to Vercel**: Connect the repository `https://github.com/AliNassarr/printcv` to Vercel.
2. **Add Environment Variables**: Populate all keys from `.env.example` in the Vercel Project Settings.
3. **Database Migrations**:
   ```bash
   npx prisma db push
   ```
4. Vercel automatically runs `npm run build`, which triggers `prisma generate && next build`.

---

## 📜 License & Acknowledgements
Created for engineering students, peers, and alumni.
Special thanks to CEO Dr. Wissam Sammouri for the CV formatting guidelines.
Licensed under the [MIT License](LICENSE).
