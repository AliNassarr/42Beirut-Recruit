# 42Beirut-Recruit: Visual UI/UX Audit Screenshot Gallery
**Directory:** `C:\Users\Ali_n\Desktop\UI-Review-Screenshots`  
**Generated:** `2026-10-19` | **Branch:** `refine/studio-v2`  
**Browser Engine:** Headless Google Chrome ($1920 \times 1080$, $1440 \times 900$, $1280 \times 800$)  

---

## 1. Phase 1: Intra Sync & Authentication (Landing Screen)
- **File:** `01-landing-and-intra-sync.png`
- **Resolution:** $1440 \times 900$ | **File Size:** $222\text{ KB}$
- **View:** `Step1Login.tsx` with "Quick Start with 42 Cadet Profile", tilted A4 card, and 42 Career Platform hero.
- **Key Flaws:** Outdated cyan/blue gradient styling conflicts with strict 42 Monochrome; tilted resume badge clutter; two runtime 500 errors on favicon/icon.

![01-landing-and-intra-sync.png](./audit-screenshots/01-landing-and-intra-sync.png)

---

## 2. Phase 2: Setup & Experience (Live Preview OFF)
- **File:** `02-phase2-setup-preview-off.png`
- **Resolution:** $1920 \times 1080$ | **File Size:** $71\text{ KB}$
- **View:** `ReziStudioLayout.tsx` (Experience Tab), 70px left rail, 308px aside deck, 1108px form deck, Live Side Preview toggle: Off.
- **Key Flaws:** Over 45% dead screen space at 1080p; preview toggle hidden on viewports $< 1536\text{px}$ (`hidden 2xl:flex`).

![02-phase2-setup-preview-off.png](./audit-screenshots/02-phase2-setup-preview-off.png)

---

## 3. Phase 2: Setup & Experience (Live Side Preview ON)
- **File:** `03-phase2-setup-live-preview-on.png`
- **Resolution:** $1920 \times 1080$ | **File Size:** $150\text{ KB}$
- **View:** `ReziStudioLayout.tsx` with side preview drawer open showing real-time Dr. Wissam A4 canvas.
- **Key Flaws:** Combined width ($1966\text{px}$) exceeds 1080p width ($1920\text{px}$), causing horizontal clipping; drawer top telemetry text is truncated ("100% Dr. Wissam 1-Page C...").

![03-phase2-setup-live-preview-on.png](./audit-screenshots/03-phase2-setup-live-preview-on.png)

---

## 4. Phase 3: Technical Milestones & Bullets (Live Side Preview ON)
- **File:** `04-phase3-milestones-live-preview-on.png`
- **Resolution:** $1920 \times 1080$ | **File Size:** $226\text{ KB}$
- **View:** `ReziStudioLayout.tsx` (Projects Tab) with 42 Common Core projects (`Webserv`, `Minishell`, etc.) and bullet points.
- **Key Flaws:** Critical visual bug: `REWRITE BULLET` split button directly collides and overlaps with diagnostic telemetry text badges; technology input placeholder truncated.

![04-phase3-milestones-live-preview-on.png](./audit-screenshots/04-phase3-milestones-live-preview-on.png)

---

## 5. Phase 4: Live Editor & Export (Full A4 Studio Canvas)
- **File:** `05-phase4-live-editor-and-sides.png`
- **Resolution:** $1920 \times 1080$ | **File Size:** $143\text{ KB}$
- **View:** "Finish Up & Preview" A4 canvas with Dr. Wissam line budget meter ($787\text{px} / 1027\text{px}$, 77%), zoom controls, and PDF/Word export buttons.
- **Key Flaws:** Sub-nav tabs remain visible but inactive in this mode; zoom preferences reset on page reload.

![05-phase4-live-editor-and-sides.png](./audit-screenshots/05-phase4-live-editor-and-sides.png)

---

## 6. Section & Project Reordering Broken Controls (308px Deck Close-up)
- **File:** `06-section-moving-broken-state.png`
- **Resolution:** $308\text{px} \times 620\text{px}$ | **File Size:** $37\text{ KB}$
- **View:** Contextual aside deck showing project list with drag handle dots and chevron move buttons.
- **Key Flaws:** 
  1. The 6-dot `GripVertical` icon is a dead static SVG (no HTML5 or `@dnd-kit` drag handlers).
  2. The move buttons swap items by global array index while the list is filtered, causing erratic jumping or dead clicks.
  3. No capability exists to reorder whole resume sections (Education, Projects, Experience, Skills).

![06-section-moving-broken-state.png](./audit-screenshots/06-section-moving-broken-state.png)

---

## 7. Narrow Viewport Breakage ($1280 \times 800$ Screen Collapse)
- **File:** `07-mobile-or-narrow-viewport-breakage.png`
- **Resolution:** $1280 \times 800$ | **File Size:** $114\text{ KB}$
- **View:** Studio V2 loaded at standard laptop resolution ($1280 \times 800$).
- **Key Flaws:** Sub-navigation header overflows ("FINISH UP" & "PREVIEW" cut off); "Live Side Preview" button completely disappears due to `hidden 2xl:flex`.

![07-mobile-or-narrow-viewport-breakage.png](./audit-screenshots/07-mobile-or-narrow-viewport-breakage.png)

