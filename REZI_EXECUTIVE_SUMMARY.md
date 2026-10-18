# Rezi Builder Reverse-Engineering Architectural Summary

> **Protocol:** REA Browser Reverse-Engineering Protocol (Chrome DevTools Protocol on `http://127.0.0.1:9222`)  
> **Source Target:** Active Rezi Resume Builder (`https://app.rezi.ai/dashboard/resume/hJaT3TaHT9iGI62VKW9e`)  
> **Date:** October 2026  
> **Status:** Fully extracted & verified without application codebase pollution.

---

## 1. Grid Layout Geometry & Ratios

```
+----+-----------------------------------------------------------------------------+
|    | Sub-Navigation Header: Document Title | Section Tabs | View Mode Switchers  |
|    +------------------------+----------------------------------------------------+
| L  | In-Aside Panel (308px) | Center Form Deck (1108px max / flex-1)             |
| E  |                        |                                                    |
| F  | [Rezi Score Meter: 54] | [Section Header & Metadata Form]                   |
| T  |                        |                                                    |
|    | [Draggable Item Cards] | [Stacked ContentEditable Bullet Editor]            |
| R  | - Software Engineer    |   - Underlay: Syntax/pro highlight badges          |
| A  | - Frontend Lead        |   - Overlay: Caret input with real-time sync       |
| I  |                        |                                                    |
| L  | [+ Add Position]       | [AI Gradient Split Button: Suggest / Metric Mode]  |
|    |                        |                                                    |
| 70 |                        |                                                    |
| px |                        |                                                    |
+----+------------------------+----------------------------------------------------+
```

### Exact Dimension Breakdowns
* **Global Left Rail:** Fixed `70px` (`w-sidebar-s`), `#0F172A` background, holding vertical utility and app-level navigation icons.
* **Top Sub-Navigation Bar:** Max-width `1440px` (`h: 81px`) container holding document title, section pills (`CONTACT`, `EXPERIENCE`, `PROJECT`, `EDUCATION`, `SKILLS`, `SUMMARY`), and view mode switchers (`FINISH UP & PREVIEW`, `AI COVER LETTER`). Active pill token: `bg-primary-600 text-white rounded-full`.
* **In-Aside Deck:** Exactly `308px` (`md:w-generator-aside`), holding the 46px circular SVG ATS score meter and reorderable position items with drag handles (`fa-grip-lines`).
* **Center Form Deck:** `1108px` max / `flex-1` (`md:w-generator-main`), wrapping metadata inputs and bullet lists.
* **Right Canvas Viewport (`FINISH UP & PREVIEW`):**
  * **Scale Mechanics:** Scaled via CSS matrix transformation:
    ```css
    transform: matrix(1.27797, 0, 0, 1.27797, 0, 0);
    ```
    *(Equates to `transform: scale(1.278)` dynamic zoom scale calculated to fit the screen viewport).*
  * **Paper Geometry:** Exactly `816px` width ($8.5\text{ in} \times 96\text{ DPI}$ standard US Letter), `#FFFFFF` paper background, with $49.13\text{px}$ ATS standard margins.
  * **Page Break Markers:** Measured dynamically using `.design-studio-break-page` (`absolute -left-[5%] w-[110%] text-sm text-gray-600`) with horizontal line and "Break" pill indicator, anchored to section IDs (`page-breaker__contact`, `page-breaker__projects`, etc.).
* **Responsive Breakpoints:**
  * $\ge 1280\text{px}$: Full horizontal 2-column layout (70px rail + 308px aside + flexible form deck).
  * $1024\text{px}$ & $768\text{px}$: Layout shifts to vertical stack (`flex-col`), where aside and form deck both take full container width ($960\text{px}$ / $704\text{px}$).
  * $< 768\text{px}$: Adapts to mobile bottom sheets.

---

## 2. The AI Bullet Writer Interaction Pattern

### Split-Button Anatomy & Styling
Anchored directly beneath each bullet point input as a gradient split button:

```
+-----------------------------------------------------+-----+
|  [✨] SUGGEST BULLET                                 |  v  |
+-----------------------------------------------------+-----+
(Rounded-l-full, Multi-stop animated linear gradient) (Rounded-r-2xl, border-l)
```

* **Primary Action (`rounded-l-full`):** `SUGGEST BULLET` with an animated multi-stop gradient background:
  ```css
  background-image: linear-gradient(
    80deg,
    var(--color-primary-600) 0%,
    var(--color-primary-600) 10%,
    #b3241a 50%,
    #a63cac 70%,
    var(--color-primary-600) 90%,
    var(--color-primary-600) 100%
  );
  background-size: 800% auto;
  animation: loading 2s infinite;
  ```
* **Secondary Action (`rounded-r-2xl`):** Chevron button with `fa fa-angle-down` and tooltip `"More generate options"`.

### State-Aware Mode Switching
* Component `gl` detects bullet state: `new` (generate), `rewrite` (rewrite bullet), or `add` (complete bullet).
* Dropdown options toggle variation mode: `"Generate with Metric / Key Numbers"` (`fad fa-bullseye-arrow`), triggering `onSelect: () => x('keymetric')`.

### Dual-Layer Real-Time Highlighting Architecture
* **Layer 1 (Underlay):** `#highlight-editor-...` (`!border-none text-transparent whitespace-pre-wrap pointer-events-none`). Contains syntax badges (colored underlines for buzzwords, yellow spans for missing metrics, purple highlights for action verbs).
* **Layer 2 (Foreground):** `#experience-section-form-...` (`text-node-placeholder min-h-44! border-2 border-input-stroke rounded-sm px-4 pt-3.5 pb-12 caret-white bg-transparent`). Receives raw text keystrokes without cursor jumping.

---

## 3. ATS Audit & Score Engine

* **Gauge Meter:** $46\text{px} \times 46\text{px}$ circular SVG meter (`-rotate-90`, $r=19.78\text{px}$, circumference $= 124.28\text{px}$, `stroke-dashoffset: 57.17`, stroke color `#F59E0B` for score 54).
* **The 5 Core Categories Extracted:**
  1. **Content (Score: 58):** Bullet count (3–6 per role), word budget (400–800 words), quantified metrics.
  2. **Format (Score: 55):** Single-page boundary fit (penalty for 1.2-page overflow), margin balance.
  3. **Optimization (Score: 0):** Job description keyword matching and ATS parseability.
  4. **Best Practices (Score: 56):** Complete prohibition of personal pronouns (`I`, `me`, `my`), passive voice suppression, action verb diversity.
  5. **Application Ready (Score: 54):** Valid contact details, non-empty date ranges.

---

## 4. Design Tokens & Visual Craft

* **Surfaces:**
  * `Surface-1` (Global Background & Left Rail): `#0F172A` (`slate-900`)
  * `Surface-2` (Builder Cards & Canvas Backdrop): `#1E293B` (`slate-800`)
  * `Surface-3` (Popovers & Dropdown Menus): `#020617` (`slate-950`)
* **Accents & States:**
  * Primary Accent: `#8A9AFF` / `#6366F1` (Indigo / Periwinkle)
  * Warning / Needs Improvement: `#F59E0B` (Amber)
  * Success / Optimal: `#10B981` (Emerald)
  * Danger / Syntax Error: `#EF4444` (Red)
* **Typography:**
  * Font Family: `"Source Sans Pro", sans-serif`
  * Body: `16px`, Color: `#F3F4F6` (`gray-100`)
  * Buttons & Form Labels: `14px` / `12px` (`uppercase font-bold tracking-wider`)
* **Radii:**
  * Standard inputs & buttons: `rounded-md` (`6px`)
  * Split button: Left `rounded-l-full`, Right `rounded-r-2xl`
  * Modals & Cards: `rounded-xl` (`12px`)

---

## 5. Specification Reference Documents

1. [**`REZI_EXECUTIVE_SUMMARY.md`**](file:///c:/Users/Ali_n/Desktop/CV-Builder/REZI_EXECUTIVE_SUMMARY.md): This executive architectural brief.
2. [**`REZI_REVERSE_ENGINEERED_SPEC.md`**](file:///c:/Users/Ali_n/Desktop/CV-Builder/REZI_REVERSE_ENGINEERED_SPEC.md): Full exhaustive 20KB technical specification with complete component trees, DOM selectors, React fibers, and implementation blueprints for 42Beirut-Recruit.
