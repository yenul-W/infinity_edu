# infinity_edu

An educational web platform for Year 11 Preliminary Mathematics Standard (NSW curriculum). Pure HTML/CSS/JavaScript — no build tools, no framework, no package manager.

## Project structure

```
index.html                    # Landing page — 4-topic card grid
style.css                     # Global stylesheet (shared across all pages)
pdf-viewer.js                 # Custom PDF viewer (PDF.js-based, scrolling mode)
question-popup.js             # "Ask a Question" floating panel (Google Apps Script backend)
year-11-maths/
  1. formulas-and-equations/
  2. earning-money/
  3. managing-money/
  4. data-analysis/           # Each has: index.html, a PDF, assets/
skills/
  style.md                    # Sociotype design system reference
  frontend-design/            # Local frontend-design skill
```

Each topic folder's `index.html` initialises `pdf-viewer.js` by calling `initPdfViewer({ topicId, lessons })`.

## Running the project

Open any `index.html` directly in a browser, or serve with any static file server:

```
npx serve .
# or
python3 -m http.server 8080
```

PDF.js is loaded via CDN (`cdnjs.cloudflare.com`). An internet connection is required.

## Design system — Sociotype

All UI follows the **Sociotype** editorial design system documented in [skills/style.md](skills/style.md).

Key rules:
- **No rounded corners** — `border-radius: 0` everywhere
- **Achromatic palette** — Ink Black `#000000`, Canvas White `#ffffff`, grays only
- **Ghost buttons** — text + 1px bottom border, no fill
- **Fonts** — Outfit, Space Mono, Poppins (loaded from Google Fonts)
- **Dark mode** — toggled via `html.dark-mode` class; state saved to `localStorage`

Never introduce saturated accent colors, shadows/elevation, or rounded corners.

## Key conventions

### Dark mode
- The `html` element gets class `dark-mode` when active
- CSS selectors use `html.dark-mode .foo { … }` pattern
- Toggle state is persisted with `localStorage.setItem('theme', 'dark'|'light')`

### Completion tracking
- Lesson completion is stored in `localStorage` with keys `ie_done_{topicId}_{lessonIndex}` = `'1'`
- The landing page reads these keys to show `topic-card--complete` badges

### PDF viewer (`pdf-viewer.js`)
- Exposed as a single IIFE; call `initPdfViewer({ topicId, lessons })` once per page
- Supports both PDF files (rendered via PDF.js canvas) and HTML iframe lessons
- `lessons` array entries have shape `{ title, slides, questions, kind }` where `kind` is `'pdf'` or `'html'`
- Zoom range: 0.5× – 3.0× in 0.25× steps

### Question popup (`question-popup.js`)
- Self-contained IIFE injected via `<script src="question-popup.js">`
- Submits to a Google Apps Script web app; URL is `GAS_URL` at the top of the file
- Works on every page once the script tag is present

## Live session bar
The landing page shows a live/upcoming lesson bar driven by Sydney time (`Australia/Sydney`). Lesson time is **Saturday 7:00–8:00 AM AEST**. The bar has three states: `--live`, `--soon` (≤15 min before), and `--idle`.

## Adding a new topic

1. Create `year-11-maths/N. topic-name/` with `index.html` and `assets/`
2. Copy an existing topic's `index.html` and update `initPdfViewer` call
3. Add a card to the landing page `index.html` following the existing card pattern
4. Add the topic's lesson indices to the `COMPLETABLE` map in the landing page script
