# SilenceCut — Style Guide

Derived from `public/silencecut_ui.jpeg` (reference dashboard mockup). This guide translates that reference's visual language — dark sidebar shell, warm orange accent, mint/blue decorative pops, floating "widget" cards — into SilenceCut's pipeline: **Upload → Detect Silence → Trim Settings → Export**.

Decisions locked in with the user:
- **Full dashboard shell** (persistent dark sidebar + main content card), not just a reskinned single page.
- **Orange** is the primary action/brand color (buttons, active nav, progress, primary CTAs).
- **Light theme** as default (white/light-gray canvas), dark navy reserved for sidebar + widget headers.
- **Sidebar nav = pipeline steps**: New Project / Silence Detection / Trim Settings / Export, plus a Recent Files / History list below — echoing the reference's list style but mapped to a linear flow instead of CRUD sections.

---

## 1. Color Palette

### Core neutrals
| Token | Hex | Usage |
|---|---|---|
| `--navy-900` | `#2E2E3F` | Sidebar background, widget-card headers |
| `--navy-800` | `#3A3A4E` | Sidebar active-row background, hover states |
| `--ink` | `#1A1A24` | Primary heading text (on light bg) |
| `--muted` | `#6B6B7A` | Secondary/body text on light bg |
| `--canvas` | `#F4F5F7` | Page background (behind cards) |
| `--surface` | `#FFFFFF` | Card/panel background |
| `--border` | `#E5E5EA` | Card borders, dividers, input borders |

### Accents
| Token | Hex | Usage |
|---|---|---|
| `--orange` (primary) | `#F0A84A` | Primary buttons, active nav indicator, progress bars, key CTAs |
| `--orange-dark` | `#D98F2E` | Primary button hover/active |
| `--orange-tint` | `#FCEBD3` | Primary button subtle bg, selected-chip bg |
| `--mint` | `#7FD9BC` | Success states, "silence removed" markers, decorative accent |
| `--mint-dark` | `#4FAE8F` | Success text/icons |
| `--sky` | `#8FC3F0` | Informational accents, decorative shapes, hover glows |
| `--danger` | `#E0553F` | Stop/delete/error (matches reference's filled red stop button) |

Orange, mint, and sky should stay in the same rough ratio as the reference: **orange dominant**, mint as a secondary success/positive-space accent, sky used sparingly for small decorative or informational touches — never as competing primary buttons.

### Dark mode (future / optional per Q3 answer — light is default, but tokens should exist)
Keep semantic token names above; if dark mode is added later, swap `--canvas`/`--surface`/`--ink` roles while keeping `--orange` as the constant brand accent (lightened slightly for contrast, e.g. `#F5B968`).

---

## 2. Layout Shell

```
┌───────────┬─────────────────────────────────────────┐
│           │  Top bar (breadcrumb / file name / theme) │
│  Sidebar  ├─────────────────────────────────────────┤
│  (navy)   │                                           │
│  ~240px   │   Main content card (white, rounded,      │
│           │   shadowed) — active pipeline step         │
│           │                                           │
│           │   Floating widget cards overlay here      │
│           │   when recording/analyzing (see §5)        │
└───────────┴─────────────────────────────────────────┘
```

- **Sidebar**: fixed width ~240–260px, full viewport height, `--navy-900` background, no border (shadow separates it from canvas instead).
- **Canvas**: `--canvas` background fills the remaining space.
- **Main content card**: white `--surface`, rounded `12px`, `shadow-md` (see §6), sits with margin from the canvas edges — mirrors the reference's large white card floating over the gray page.
- Reference's orange background block behind the sidebar is **not** carried over 1:1 (it would clash with orange-as-button-color); instead orange appears as the small logo mark top-left of the sidebar and as an active-nav-item accent bar.

---

## 3. Sidebar Navigation

Structure (pipeline-as-nav, per decision):

```
[logo mark]  SilenceCut

  ● New Project        (upload step)
  ○ Silence Detection
  ○ Trim Settings
  ○ Export

  ─────────────
  RECENT FILES
  ─ podcast_ep42.mp4
  ─ interview_raw.mov
  ─ ...

  [settings icon]  [help icon]
```

- **Step items**: only the current/reachable step is fully interactive; upcoming steps are visually present but muted (`opacity: 0.5` or `--muted` text) until unlocked, since the flow is linear per file.
- **Active step**: `--navy-800` row background + a `3px` left accent bar in `--orange` + white text (mirrors reference's active "New Order" row treatment, orange substituted for the reference's plain highlight).
- **Completed steps**: small mint checkmark instead of the step dot.
- **Recent Files**: plain list, each row = filename + small duration/status chip; clicking re-opens that project. Matches the reference's nested list rhythm (Orders → Pending/Ready/All) but repurposed as a session history.
- **Icons**: thin-line/outline style (1.5px stroke), 18–20px, `--muted`/white depending on state — same restrained icon language as the reference sidebar.
- Bottom-anchored utility icons (settings, help) exactly as in the reference's bottom-left cluster.

---

## 4. Typography

- **Font family**: geometric/humanist sans — reuse project default `Inter` (already in `src/index.css`) rather than introducing a new font; it's visually close to the reference's face.
- **Sidebar title** ("SilenceCut"): `20px`, weight 500, letter-spacing `+0.5px`, white — matches reference's spaced-out "Order Management" heading.
- **Page/card heading** (e.g. "Upload your file", "Detecting silence…"): `24px`, weight 600, `--ink`.
- **Body text**: `15px`, weight 400, `--muted`.
- **Labels** (form/field labels, nav items): `13px`, weight 500, uppercase optional for section dividers only (e.g. "RECENT FILES"), letter-spacing `+0.4px`.
- **Timer/numeric displays** (silence timestamps, duration counters — the reference's big `00:34` digits): tabular/monospace numerals, `32–40px`, weight 500, `--ink`. Use `font-variant-numeric: tabular-nums` on a sans face, or the `--font-mono` token defined in `src/index.css`.

---

## 5. Floating Widget Cards

The reference's "Short Memo" recorder popups are the clearest transferable pattern — SilenceCut should reuse this exact treatment for **silence-clip preview cards** (one per detected silence interval, showing timestamp range + play/skip/keep controls) and for an **in-progress analysis/recording indicator**.

- **Card shape**: `280–300px` wide, rounded `10px`, `shadow-lg`, white body.
- **Header bar**: `--navy-900` background, `36px` tall, white `13px` medium-weight label text left-aligned, `×` close icon right-aligned (16px, white, hover → `--orange`).
- **Body**: white, `16px` padding, contains the big numeric display (§4) centered, plus a horizontal control row.
- **Control row**: circular icon buttons, `36px` diameter:
  - Primary/confirm action → filled `--navy-900` circle, white icon (matches reference's black confirm circle).
  - Destructive/stop action → filled `--danger` circle, white icon.
  - Secondary actions (undo/skip/play) → plain icon buttons, `--muted`, no fill, hover → `--ink`.
- **Progress variant** (like the reference's 4th card with a scrub bar): thin `4px` track in `--border`, filled portion in `--orange`, small draggable dot handle, timestamps (`00:03` / `00:12`) flanking in `12px` `--muted` text.
- **Stacking**: when multiple silence-interval cards are shown at once, offset each by ~`20px` x/y like the reference's cascading stack, front card fully opaque, back cards can drop to `shadow-md` to reinforce depth order.

---

## 6. Cards, Shadows & Radii

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Buttons, chips, inputs |
| `--radius-md` | `10px` | Widget cards |
| `--radius-lg` | `12px` | Main content card |
| `--shadow-sm` | `0 1px 2px rgba(20,20,30,0.06)` | Inputs, list rows |
| `--shadow-md` | `0 6px 16px rgba(20,20,30,0.08)` | Widget cards, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(20,20,30,0.12)` | Main content card, front-most floating widget |

---

## 7. Buttons

Two-tone hierarchy, directly from the reference's Reset/Submit pair:

- **Primary** (`Export`, `Submit`, `Start Detection`): solid `--orange` bg, white text, `--radius-sm`, `10px 20px` padding, weight 500. Hover → `--orange-dark`. This replaces the reference's green Submit button with the app's orange brand color per the accent decision.
- **Secondary** (`Reset`, `Cancel`, `Back`): solid `--navy-900` bg, white text — same weight/shape as primary, matches reference's dark Reset button exactly.
- **Tertiary/ghost** (inline actions, "Change file"): transparent bg, `--muted` text, `--border` on hover.
- **Icon-only circular buttons**: see §5 widget-card controls.

---

## 8. Decorative Accents

Used sparingly, never as functional UI chrome — purely atmospheric, echoing the reference's floating triangle/circle shapes:

- A soft **mint ring/circle** (like the reference's bottom-right partial ring) may anchor an empty state or the Export success screen.
- A small **sky-blue triangle** (play-adjacent shape) can accent the initial upload/empty state, hinting at "play/start."
- Keep these to **one accent shape per screen, max**, low-opacity or off-canvas-edge placement so they don't compete with real controls.

---

## 9. Iconography

- Outline/stroke style, `1.5–1.75px` stroke weight, no fill except inside circular action buttons.
- Consistent 18–20px sizing in sidebar/lists, 16px inside compact widget-card headers.
- Suggested set: upload/file, waveform, scissors (brand-relevant — literal "cut"), play, pause, skip-back, checkmark, stop (square), settings gear, help/question.

---

## 10. Open Items for Implementation

- Confirm exact orange hex against brand assets if a logo exists beyond the reference mock (none found in `public/` besides the reference image itself).
- Decide whether "Recent Files" persists via `localStorage` (no backend, per README) — affects whether that sidebar section is v1 or deferred.
- Waveform visualization (Milestone 2) will need its own color spec: recommend silence regions in `--orange-tint` overlay, kept-audio regions in default waveform gray, using `--mint` only for the final "removed X seconds" success summary.
