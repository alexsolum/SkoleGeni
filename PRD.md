# SkoleGeni

## Product Overview

**The Pitch:** Solve the complex puzzle of class creation with algorithmic precision. This application automates the balancing of student demographics, academic needs, and social dynamics to generate optimal class rosters instantly.

**For:** School administrators and grade-level coordinators who need to build balanced classrooms while juggling complex constraints like gender ratios, previous schools, and student chemistry.

**Device:** desktop

**Design Direction:** A minimalist, high-utility interface focused on data density, clear typography, and a sophisticated color palette of deep navy and slate grays with subtle blue accents.

**Inspired by:** Linear, Retool

---

## Screens

- **Welcome / Setup:** Entry point to start a new optimization project or load an existing roster.
- **Configuration Mode:** Constraint definition center for class sizes, demographics, and balancing priorities.
- **Pupil Mode:** Tabular data entry interface for student details, origins, and peer chemistry ratings.
- **Optimization Results:** High-level statistical overview of the algorithmically generated classes.
- **Class Editor:** Drag-and-drop workspace for manual roster adjustments with real-time score recalculation.

---

## Key Flows

**Generate New Classes:** Administrator defines constraints, inputs data, and generates rosters.

1. User is on Welcome Screen -> sees **Create New Project**
2. User clicks **Start Configuration** -> proceeds to Configuration Mode
3. User sets constraints, clicks **Next: Add Pupils** -> proceeds to Pupil Mode
4. User inputs data, clicks **Run Optimizer** -> loading state appears, then Results overview
5. User clicks **Refine Classes** -> opens Class Editor for manual drag-and-drop adjustments

---

<details>
<summary>Design System</summary>

## Color Palette

- **Primary:** `#0F172A` - Deep Slate, used for main buttons, primary headers, sidebar
- **Background:** `#F8FAFC` - Off-white, used for main canvas
- **Surface:** `#FFFFFF` - Clean white for cards, tables, modal backgrounds
- **Text:** `#334155` - Slate Gray for high-readability body copy
- **Muted:** `#94A3B8` - Light Slate for borders, disabled states, helper text
- **Accent:** `#2563EB` - Royal Blue for active tabs, primary text links, focus rings

## Typography

Distinctive, sharp sans-serifs that convey authority and clarity.

- **Headings:** Cabinet Grotesk, 700, 24-32px
- **Body:** Satoshi, 500, 14px
- **Small text:** Satoshi, 400, 12px
- **Data/Numbers:** JetBrains Mono, 400, 13px (tabular figures)
- **Buttons:** Cabinet Grotesk, 700, 14px

**Style notes:** 4px border radius everywhere. 1px solid borders (`#E2E8F0`) instead of drop shadows for a flat, technical, paper-like aesthetic. Dense spacing (4px/8px/16px steps).

## Design Tokens

```css
:root {
  --color-primary: #0F172A;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #334155;
  --color-muted: #94A3B8;
  --color-accent: #2563EB;
  --font-heading: 'Cabinet Grotesk', sans-serif;
  --font-body: 'Satoshi', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius: 4px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

</details>

---

<details>
<summary>Screen Specifications</summary>

### Welcome / Setup

**Purpose:** Initiate a new class generation project.

**Layout:** Centered 480px modal card on full-screen background.

**Key Elements:**
- **Header:** `Cabinet Grotesk`, 32px, `#0F172A`
- **Primary CTA:** 44px height, `#0F172A` background, `#FFFFFF` text, `Create New Roster`
- **Recent Projects List:** 1px `#E2E8F0` border, hover state `#F1F5F9` background

**States:**
- **Empty:** "No previous projects found."
- **Loading:** Skeleton lines for recent projects list.
- **Error:** Red (`#DC2626`) toast at top right for failed project loads.

**Components:**
- **Project Card:** 64px height, `#FFFFFF`, Title + Last Modified Date.

**Interactions:**
- **Click CTA:** Transition to Configuration Mode.
- **Hover Project:** Background `#F8FAFC`, cursor pointer.

**Responsive:**
- **Desktop:** Centered fixed width.
- **Tablet:** 100% width with 24px margins.
- **Mobile:** Not supported.

### Configuration Mode

**Purpose:** Set algorithmic constraints and balancing weights.

**Layout:** Left sidebar (navigation), main content area (form fields), sticky bottom action bar.

**Key Elements:**
- **Class Size Slider:** Dual-handle, `#2563EB` track, labels `Min: 18`, `Max: 24`
- **Priority Toggles:** Radio groups for Gender, Origin School, Location (`Strict`, `Flexible`, `Ignore`)
- **Action Bar:** 64px height, sticky bottom, right-aligned `Next: Pupil Data` button

**States:**
- **Empty:** Default values applied (Min 20, Max 25, Flexible priority).
- **Loading:** N/A.
- **Error:** Red border (`#DC2626`) on fields with conflicting constraints (e.g., Min > Max).

**Components:**
- **Constraint Card:** 1px border, 16px padding, title + description + input control.

**Interactions:**
- **Click Next:** Validate form -> slide transition to Pupil Mode.
- **Hover Controls:** 1px `#2563EB` border on focus.

**Responsive:**
- **Desktop:** Two-column grid for constraints.
- **Tablet:** Single column grid.
- **Mobile:** Not supported.

### Pupil Mode

**Purpose:** Bulk entry and management of student data and relationship dynamics.

**Layout:** Full-width data table taking up 90% of viewport height.

**Key Elements:**
- **Data Grid:** Columns for Name, Gender, Origin School, Needs, Chemistry.
- **Import Button:** Top right, `#FFFFFF` background, `#0F172A` border, `Import CSV`.
- **Run Optimizer CTA:** Sticky top right, `#2563EB` background, glowing pulse effect.

**States:**
- **Empty:** Prominent dropzone "Upload CSV or add row manually".
- **Loading:** Indeterminate progress bar during CSV parsing.
- **Error:** Red inline text for missing mandatory fields in grid.

**Components:**
- **Cell Input:** Borderless on default, 1px `#2563EB` ring on focus.
- **Tag (Origin/Needs):** 24px height, `#F1F5F9` background, `#334155` text, 4px radius.
- **Chemistry Buttons:** Inline 24px square buttons (`+` and `-`) within the Chemistry column for each pupil row.
- **Chemistry Search Modal:** Centered 480px modal featuring an auto-complete search input to find and select pupils.

**Interactions:**
- **Click Add Row:** Appends blank row at bottom, auto-focuses first cell.
- **Click Chemistry (+/-):** Opens the Chemistry Search Modal allowing the user to search for and select other pupils to define good chemistry (+) or bad chemistry/do-not-match (-).
- **Click Optimizer:** Trigger 3-second complex loading animation -> navigate to Results.

**Responsive:**
- **Desktop:** Full width, horizontal scroll if > 8 columns.
- **Tablet:** Full width, fixed first column (Name).
- **Mobile:** Not supported.

### Optimization Results

**Purpose:** High-level dashboard reviewing the algorithm's output quality.

**Layout:** 3x2 grid of metric cards above a list of generated classes.

**Key Elements:**
- **Overall Score Radial:** 120px SVG circle, `#2563EB` stroke, large central percentage (`94%`).
- **Sub-score Bars:** Linear progress bars for Gender Balance, Origin Mix, Chemistry.
- **Refine CTA:** `#0F172A` background, `Open Class Editor`.

**States:**
- **Empty:** N/A (Algorithm guarantees output).
- **Loading:** Matrix-style text scrambling effect settling into final numbers.
- **Error:** Warning banner if constraints could not be 100% met.

**Components:**
- **Metric Card:** 140px height, 1px border, large `JetBrains Mono` value, label.

**Interactions:**
- **Click Refine:** Hard cut to Class Editor.

**Responsive:**
- **Desktop:** 3 columns for metrics.
- **Tablet:** 2 columns for metrics.
- **Mobile:** Not supported.

### Class Editor

**Purpose:** Manual roster adjustments via drag-and-drop with real-time constraint validation.

**Layout:** Side-by-side vertical lists representing distinct classes. Top sticky header with real-time scores.

**Key Elements:**
- **Global Score Header:** 64px height sticky top, displays overall score and red/green deltas.
- **Class Column:** 320px width, 1px border, `#F8FAFC` background. Contains pupil cards.
- **Pupil Card:** 48px height, draggable, displays name, gender icon, origin dot.

**States:**
- **Empty:** N/A.
- **Loading:** N/A.
- **Error:** Pupil card glows red (`#FEE2E2` background) if moved into a class violating a strict constraint (e.g., placing two "Do Not Match" pupils together).

**Components:**
- **Class Header:** Class Name (e.g., `Class 1A`), Count (`22/24`), Sub-score (`88%`).
- **Conflict Toast:** Absolute bottom right, lists active constraint violations.

**Interactions:**
- **Drag Pupil:** Card lifts (shadow changes to `0 4px 6px rgba(0,0,0,0.1)`), target dropzones highlight `#EFF6FF`.
- **Drop Pupil:** Snap animation. Global score and Class headers flash green/red based on score change.

**Responsive:**
- **Desktop:** Horizontal scroll container holding all class columns side-by-side.
- **Tablet:** 2 columns visible at a time.
- **Mobile:** Not supported.

</details>

---

<details>
<summary>Build Guide</summary>

**Stack:** HTML + Tailwind CSS v3 + React + Dnd-kit

**Build Order:**
1. **Design System & Layout Shell:** Establish Tailwind config, typography, routing.
2. **Pupil Mode (Data Table):** Most complex data state; build table structure and CSV parsing logic.
3. **Class Editor (D&D):** Core value proposition; implement dnd-kit logic and scoring algorithm hooks.
4. **Configuration Mode:** Form inputs and state management tying to the scoring algorithm.
5. **Optimization Results:** Dashboards and charts utilizing algorithm output.
6. **Welcome / Setup:** Entry point and local storage persistence.

</details>