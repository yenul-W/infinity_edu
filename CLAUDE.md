# infinity_edu

An educational web platform for NSW Mathematics Standard — **Year 11 Preliminary** and **Year 12 Standard 2**. Pure HTML/CSS/JavaScript — no build tools, no framework, no package manager.

## Project structure

```
index.html                    # Year picker — Year 11 vs Year 12
year-11.html                  # Year 11 landing page (9-topic card grid, city videos)
year-12.html                  # Year 12 landing page (10-topic typographic grid)
style.css                     # Global stylesheet (shared across all pages)
DESIGN.md                     # Design system as implemented — read before any UI change
pdf-viewer.js                 # Custom PDF viewer (PDF.js-based, scrolling mode)
question-popup.js             # "Ask a Question" floating panel (Google Apps Script backend)
year-11-maths/
  1. formulas-and-equations/ … 9. networks-paths-and-trees/
                              # Each has: index.html, PDFs and/or HTML lessons, assets/
year-12-maths/
  lesson-kit.css              # Shared lesson stylesheet (Year 12 only)
  lesson-kit.js               # Shared lesson behaviour → window.IE (Year 12 only)
  1. algebraic-relationships/ … 10. normal-distribution/
                              # Each has: index.html + 5 HTML lessons
skills/
  style/SKILL.md              # Sociotype design system reference
  make-lesson/                # Canonical lesson generator — read before adding a lesson
  frontend-design/            # Local frontend-design skill
```

Each topic folder's `index.html` initialises `pdf-viewer.js` by calling `initPdfViewer({ topicId, lessons })`.

### Year selection
`index.html` is a year picker. It stores the choice as `localStorage.ie_year` (`'11'` / `'12'`) and
on later visits redirects straight to that year's hub. `index.html?pick=1` always shows the picker —
that is what the "Change year" link in each hub's nav points to.

### The two lesson systems
Year 11 lessons inline their own CSS and `buildKC` function. Year 12 lessons load the shared
`year-12-maths/lesson-kit.{css,js}` and use the `window.IE` API instead. Both render identically.
**Read `skills/make-lesson/SKILL.md` before writing any lesson** — it documents both.

Year 12 topic IDs are **strings** (`'y12-1'` … `'y12-10'`) so their completion keys cannot collide
with Year 11's numeric IDs. Each Year 12 topic has exactly 5 lessons: 3 lessons, homework (index 3,
not completable), revision (index 4).

## Running the project

Open any `index.html` directly in a browser, or serve with any static file server:

```
npx serve .
# or
python3 -m http.server 8080
```

PDF.js is loaded via CDN (`cdnjs.cloudflare.com`). An internet connection is required.

## Design system — Sociotype

All UI follows the **Sociotype** editorial design system. [DESIGN.md](DESIGN.md) is the canonical
reference for this site; [skills/style/SKILL.md](skills/style/SKILL.md) is the original Sociotype source.

Key rules:
- **No rounded corners** — `border-radius: 0` everywhere
- **Achromatic palette** — Ink Black `#000000`, Canvas White `#ffffff`, grays only
- **Ghost buttons** — text + 1px bottom border, no fill
- **Fonts** — Poppins (display + body text) and DM Mono (labels, nav, buttons, numbers; weight 300
  only) — nothing else. Every page loads the same Google Fonts link (see DESIGN.md). Never add another
  family or a `system-ui`/`Segoe`/`Inter`/`Georgia` stack.
- **Sentence case** — no `text-transform: uppercase` and no all-caps words for emphasis (use
  `<strong>`). Acronyms and literal names (NSW, HSC, AEST, PDF, EST/LST, MAX) keep their capitals.
- **Colour exception** — answer feedback only: correct `#00a050`, wrong `#c00000` (shared by both
  lesson systems). Everything else, including categorical data in simulations, is told apart by
  fill/outline, not hue.
- **Dark mode canvas** — `#0a0a0a` everywhere (hubs, topic pages and lesson iframes).
- **Dark mode** — toggled via `html.dark-mode` class; state saved to `localStorage`

Never introduce saturated accent colors, shadows/elevation, or rounded corners.

## Key conventions

### Dark mode
- The `html` element gets class `dark-mode` when active
- CSS selectors use `html.dark-mode .foo { … }` pattern
- Toggle state is persisted with `localStorage.setItem('theme', 'dark'|'light')`

### Completion tracking
- Lesson completion is stored in `localStorage` with keys `ie_done_{topicId}_{lessonIndex}` = `'1'`
- `lessonIndex` is the **array index** in the `lessons` array, not the `num` field
- The landing page reads these keys to show `topic-card--complete` badges and progress rings, via
  its `COMPLETABLE` map (`year-11.html` and `year-12.html` each have their own)
- Known wart: Year 11 topics 5, 8 and 9 have in-lesson `LESSON_IDX` constants that are off by one
  from the true array index. Year 12 lessons do not — keep it that way.

### PDF viewer (`pdf-viewer.js`)
- Exposed as a single IIFE; call `initPdfViewer({ topicId, lessons })` once per page
- Supports both PDF files (rendered via PDF.js canvas) and HTML iframe lessons
- `lessons` entries: `{ num, title, slides, annotated, kind, syllabus }` where `slides` is the URL
  loaded (relative to the topic folder) and `kind` is `'pdf'` \| `'html'` \| `'file'`. Add
  `homework: true` or `revision: true` to relabel the sidebar row and suppress its Mark Complete
  button. There is no `questions` key.
- Zoom range: 0.5× – 3.0× in 0.25× steps

### Question popup (`question-popup.js`)
- Self-contained IIFE injected via `<script src="question-popup.js">`
- Submits to a Google Apps Script web app; URL is `GAS_URL` at the top of the file
- Works on every page once the script tag is present

## Live session bar
`year-11.html` shows a live/upcoming lesson bar driven by Sydney time (`Australia/Sydney`). Lesson time is **Saturday 7:00–8:00 AM AEST**. The bar has three states: `--live`, `--soon` (≤15 min before), and `--idle`. `year-12.html` has no such bar — there is no Year 12 session time yet.

## Adding a new topic

1. Create `year-NN-maths/N. topic-name/` with `index.html` (and `assets/` if it has PDFs)
2. Copy an existing topic's `index.html` and update the `TOPIC_ID` and `initPdfViewer` call
3. Add a card to `year-11.html` or `year-12.html` following the existing card pattern
4. Add the topic's completable lesson indices to the `COMPLETABLE` map in that page's script

## Authoring Year 12 lessons

All ten Year 12 focus areas are complete — 50 lesson files, no `topic-card--pending` cards left.
`year-12.html` reads `0 / 40 lessons complete` on a fresh browser.

Read `skills/make-lesson/SKILL.md` before touching a lesson — it documents the `lesson-kit` API and
lists the syllabus URL for each focus area. Topics 1 and 2 are the reference implementations;
topic 10 is the reference for shaded regions under a curve (`IE.plot`'s `shade` option).

If a new focus area is ever added:

1. Write the 5 lesson files using the `lesson-kit` API
2. Set the topic's `lessons` array to the 5-entry form in its `index.html`
3. In `year-12.html`: add `'y12-N': [0,1,2,4]` to `COMPLETABLE` and add the card

### `IE.plot` extras used by Year 12

- `shade: [{ from, to, fn, className }]` — fills between the x-axis and `fn`, drawn beneath the
  gridlines. Used for areas under the normal curve.
- `bars: [{ x, y, width, className }]` — plain rectangles for histograms.
