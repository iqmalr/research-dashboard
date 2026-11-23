---
name: Studio Metric System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3e4947'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#4a5162'
  on-tertiary: '#ffffff'
  tertiary-container: '#62697b'
  on-tertiary-container: '#e3e9ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#dce2f7'
  tertiary-fixed-dim: '#c0c6db'
  on-tertiary-fixed: '#141b2b'
  on-tertiary-fixed-variant: '#404758'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: '0'
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.375rem
    letterSpacing: -0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: '0'
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  metric-display:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.025em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-lg: 1rem
  margin: 1rem
  margin-lg: 1.5rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.5rem
  space-base: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system targets small software engineering studios requiring an uncompromising, dense, and distraction-free operational dashboard builder. The visual ethos is engineered utility: fast to parse, unadorned, and structurally predictable.

Drawing directly from the aesthetic restraint of developer platforms like Linear and Vercel, the interface rejects decorative embellishments—forbidding arbitrary gradients, non-semantic illustrations, playful rounding, and emotional signifiers such as emojis. Hierarchy is communicated purely through structural alignment, precise 1px borders, subtle tonal layering, and typographic rigor. 

Every pixel must represent utility:
- **Information density over whitespace:** Components prioritize rapid scanning of configurations, metrics, queries, and node states.
- **Architectural clarity:** Crisp grid lines and borders demarcate regions rather than soft drop shadows or surface blurs.
- **Instrument feel:** Interactive elements communicate an immediate mechanical affordance through strict, low-latency hover states and high-contrast focus rings.

## Colors

The palette is tuned specifically for sustained daytime engineering workflows. It is built strictly on semantic variables to ensure clean inversion for future dark theme capability.

### Roles & Semantic Mapping
- **Canvas Backdrop (`#F9FAFB` / `#F8F9FA`):** Low-glare, muted substrate that offsets cards and data grids cleanly.
- **Surface Elevation (`#FFFFFF`):** Base canvas for panels, query builders, widget cards, and overlays.
- **Hover & Sub-surfaces (`#F3F4F6`):** Secondary interactive tier for unselected table rows, dropdown triggers, and disabled elements.
- **Structural Borders (`#E5E7EB` primary, `#E2E8F0` subtle):** Clean, deliberate 1px separation lines. No multi-layer shadows or fuzzy edges.
- **Typography:**
  - **High-contrast primary (`#111827`):** Headers, active metric values, code block statements, and key metadata.
  - **Secondary (`#6B7280`):** Labels, parameter keys, table headers, and structural hints.
  - **Muted/Tertiary (`#9CA3AF`):** Inactive icons, placeholder inputs, and secondary unit suffixes.
- **Teal Accent (`#0F766E` default, `#0D9488` hover):** Reserved exclusively for commit actions, primary state triggers, active navigation tabs, and verified pipeline connections. Never used decoratively.
- **Diagnostic Status:**
  - **Emerald (`#16A34A`):** Active connections, clean query executions, and healthy sources.
  - **Amber (`#D97706`):** Stale cache, rate limits, schema warnings, or degraded syncs.
  - **Red (`#DC2626`):** Broken endpoints, authentication failures, syntax errors, and fatal drops.

## Typography

Typography prioritizes legibility, compact line heights, and exact vertical alignment over dramatic scale ranges.

### Guidelines
- **Dual-Engine Type System:** `Inter` handles all structural navigation, forms, and general content. `JetBrains Mono` governs code blocks, inline snippets, API endpoints, JSON paths, environment variables, timestamps, and column keys.
- **Tabular Figures:** All numeric metric data points, table values, execution times, and payload counts must activate tabular numbers (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during real-time stream updates.
- **Micro-Labels:** `label-sm` and `label-md` are explicitly designed for table column headers, schema keys, and badge markers, using uppercase transformation with positive tracking (`0.02em` - `0.04em`) for instant distinction.

## Layout & Spacing

Layout follows a strict, compact base-4 rhythm optimized for dense data presentation without wasted screen real estate.

### Grid & Structure
- **Dashboard Grid:** Contextual 12-column or 24-column CSS grid for builder canvases, with tight `0.75rem` (12px) gutters to preserve screen real estate.
- **Panels & Drawers:** Fixed-width sidebars (e.g., 240px navigation, 320px inspector panel) flanked by fluid workspace views.
- **Breakpoints:**
  - `Mobile / Compact` (< 768px): Vertical stacking of builder blocks; inspection panels collapse into full-screen sheets.
  - `Tablet / Medium` (768px - 1024px): Standard navigation collapses into icon rail; 6-column canvas grid.
  - `Desktop / Wide` (>= 1025px): Fixed multi-pane setup (Sidebar + Canvas + Inspector) with fixed 12/24-column configurations.

## Elevation & Depth

This design system avoids soft, floating, or dramatic elevation in favor of flat, architecturally bounded surfaces. Visual depth is almost entirely achieved through **tonal borders** and strict planar layering.

- **Level 0 (App Canvas):** Muted background tone (`#F9FAFB`).
- **Level 1 (Panels & Cards):** Pure white (`#FFFFFF`) framed with a crisp, 1px solid border (`#E5E7EB`). No drop shadow.
- **Level 2 (Dropdowns, Menus, Popovers):** Pure white (`#FFFFFF`) framed with a 1px border (`#E2E8F0`) paired with an ultra-subtle, sharp ambient drop shadow (`0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)`) to lift the menu slightly above surrounding interactive controls.
- **Level 3 (Modal Dialogs):** Base white (`#FFFFFF`) with a 1px border (`#E5E7EB`) and structured shadow (`0 8px 16px -2px rgba(0, 0, 0, 0.08)`), framed by a neutral semi-opaque backdrop scrim (`rgba(17, 24, 39, 0.2)`).

## Shapes

Shapes communicate precision. Geometry favors slightly clipped, compact borders rather than friendly or playful rounds.

- **Interactive Controls (Inputs, Buttons, Dropdowns, Badges):** 6px corner radius. This gives an intentional, clean industrial look without sharp 90-degree corners.
- **Containers (Cards, Modal Dialogs, Data Grid Enclosures):** 8px corner radius.
- **Pills / Status Dots:** Fully circular (9999px) strictly for status indicator dots (4px-8px dimensions). Inline category pills and badges adhere strictly to the 6px standard radius.

## Components

### Buttons
- **Primary:** Background `#0F766E`, text `#FFFFFF`, border `transparent`, 6px radius. Hover: `#0D9488`. Active: `#115E59`.
- **Secondary:** Background `#FFFFFF`, text `#111827`, border `1px solid #E5E7EB`, 6px radius. Hover: `#F9FAFB`, border `#D1D5DB`.
- **Destructive:** Background `#FFFFFF`, text `#DC2626`, border `1px solid #FCA5A5`, 6px radius. Hover: `#FEF2F2`.
- **Ghost / Action Icon:** Background `transparent`, text `#6B7280`, 6px radius. Hover: `#F3F4F6`, text `#111827`.
- **Metrics/Heights:** Small (`28px` height, `body-sm`), Standard (`32px` height, `body-md`).

### Input Fields & Controls
- **Text / Code Input:** `#FFFFFF` background, `1px solid #E5E7EB` border, 6px radius, padding `0.375rem 0.625rem`. Text: `body-md` or `code-md`. Focus: `1px solid #0F766E` with an immediate outline ring `0 0 0 1px #0F766E`.
- **Monospace Code Inputs:** JetBrains Mono, font size 13px, with neutral gray prefix label (e.g. `GET`, `https://`, `$`).
- **Checkboxes & Radios:** 14px size, 4px radius (checkbox) or circular (radio). Border `1px solid #D1D5DB`. Checked: `#0F766E` background with white glyph.

### Cards & Data Widgets
- **Container:** Base `#FFFFFF`, border `1px solid #E5E7EB`, 8px radius.
- **Widget Header:** Border-bottom `1px solid #F3F4F6`, height 36px, horizontal padding `0.75rem`. Title set in `label-md` or `body-sm` bold.
- **KPI Value Presentation:** Key numbers use `metric-display`, secondary comparisons (+12.4%) use `code-sm` paired with Emerald or Red color markers.

### Status Indicators & Badges
- **Status Dot:** 6px diameter circle. Green (`#16A34A`), Amber (`#D97706`), Red (`#DC2626`).
- **Status Badge:** Height 20px, 6px radius, padding `0 0.375rem`, font `label-sm`.
  - Healthy: Background `#F0FDF4`, text `#166534`, border `1px solid #BBF7D0`.
  - Stale/Warning: Background `#FFFBEB`, text `#92400E`, border `1px solid #FDE68A`.
  - Error: Background `#FEF2F2`, text `#991B1B`, border `1px solid #FECACA`.

### Data Grids & Schema Tables
- Header row: `#F9FAFB` background, height 32px, text `label-sm` with color `#6B7280`, border-bottom `1px solid #E5E7EB`.
- Data rows: `#FFFFFF` background, height 32px, border-bottom `1px solid #F3F4F6`. Hover: `#F9FAFB`. Values utilize `code-md` for structural keys and tabular numbers for numerical metrics.