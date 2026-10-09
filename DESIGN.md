# Design system

How infinity_edu looks, as the code implements it today. Read this before changing any page,
stylesheet or lesson. It adapts the Sociotype reference in
[skills/style/SKILL.md](skills/style/SKILL.md); where the two differ, this file wins.

## Principles

- **Editorial white canvas.** Black type on white, generous space, structure drawn with thin rules.
- **Achromatic.** Ink, canvas and grays only. Colour is never decoration.
- **Flat.** No shadows, blur, glow, lift-on-hover or rounded corners.
- **Ghost interactions.** Buttons and links are text with a 1px underline, not filled boxes.
- **Sentence case.** Nothing is set in capitals.

## Typography

Two families, nothing else.

| Family  | Token            | Weights            | Used for |
|---------|------------------|--------------------|----------|
| Poppins | `--font-display` (`--font-body` is an alias) | 400, 500, 600, 700 + italic 400/500 | Page titles, headings, body text, lesson prose |
| DM Mono | `--font-mono`    | **300 only**       | Eyebrow labels, nav, buttons, badges, topic numbers, counters, data values |

Every page loads exactly this link:

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Mono:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
```

- Every rule that uses `--font-mono` sets `font-weight: 300`. DM Mono has no bold, and a browser-faked
  bold looks smeared. Show emphasis in mono text with ink colour or size, not weight.
- Counters and topic numbers (`.card-num`, `.year-card-num`, `.progress-summary-label`) use
  `font-variant-numeric: tabular-nums`.

**Type scale**

| Role       | Size | Line height | Tracking |
|------------|------|-------------|----------|
| caption    | 11px | 1.38        | 0.02em   |
| body       | 14px | 1.29        | 0.35px   |
| heading    | 26px | 1.13        | 0.26px   |
| display-sm | 40px | 1.0–1.13    | 0.6px (≈0.015em) |

Tracking is never negative.

**Case.** Sentence case everywhere. Never use `text-transform: uppercase`. Never type a word in
capitals for emphasis (write `<strong>not</strong>`, not `NOT`). Acronyms and literal names keep
their capitals: NSW, HSC, AEST/AEDT/AWST, PDF, GST, PAYG, EST/LST/EFT, calculator keys (MODE, STAT),
Excel functions (MAX, SLOPE, CORREL).

## Colour

| Role                  | Light     | Dark      |
|-----------------------|-----------|-----------|
| Canvas (page)         | `#ffffff` | `#0a0a0a` |
| Ink (text, structure) | `#000000` | `#ffffff` (`#f0f0f0` inside lessons) |
| Medium gray (muted)   | `#818181` | `#818181` |
| Faded gray (tertiary) | `#9d9d9d` | `#555555` |
| Light gray (dividers) | `#d6d6d6` | `#222222`–`#333333` |

Token names differ by layer:

- `style.css` (hubs, topic pages): `--bg`, `--text`, `--text-muted`, `--text-faint`, `--rule`,
  `--border`, `--border-hover`.
- `year-12-maths/lesson-kit.css` and the inline `:root` of Year 11 lessons: `--ink`, `--canvas`,
  `--gray-med`, `--gray-light`, `--gray-faint`, or the `--color-ink-black` family.

**The one exception: answer feedback.** Correct is `#00a050` and wrong is `#c00000`, as text, a 1–2px
border, or an 8% tint (14% in dark mode). Use them for nothing else. Show categorical data (for
example, groups in a simulation) by fill: hollow, gray or solid. Never use hue.

## Shape and depth

- `border-radius: 0` on everything, including dots, spinners, badges and inputs.
- No `box-shadow` for elevation. An inset shadow is only acceptable as a drawn rule (for example,
  a 2px feedback bar).
- No `backdrop-filter`, no scale or translate on hover.
- Rules: 1px ink for structural edges (header, sidebar, viewer), 1px light gray for dividers.

## Components

- **Ghost button.** DM Mono 300, 11–12px, ink text, 1px ink bottom border, no fill or padding. On
  hover it turns medium gray. The muted variant starts gray and turns ink on hover.
- **Text input.** Transparent background, 1px medium-gray bottom border that turns ink on focus.
  Placeholder in medium gray. Textareas use a full 1px light-gray border.
- **Badge or tag.** DM Mono 300, 11px, 1px light-gray border, small padding. The "Complete" badge is
  solid (ink background, canvas text).
- **Hub topic card.** Year 11 uses a video poster with white type over a dark gradient. Year 12 is
  typographic, with a large DM Mono numeral, Poppins title and hairline dividers. On hover only the
  border changes, to ink.
- **Live-session bar** (Year 11 hub). It sits between hairline rules. A square dot shows the state:
  blinking means live, solid means starting soon, hollow means idle. The label text says the same
  thing, and the Join link is a ghost button.
- **Worked example and Your turn** (Year 12 lessons). A worked example (`.example-block`) has a 2px
  ink left rule on a faint gray fill. A Your turn block (`.your-turn`) is told apart by outline
  only: a 1px light-gray border with no fill. Its hidden answers use `<details class="yt-answer">`
  with a ghost-button `summary` ("Show working") and a `.yt-body` indented behind a 1px light-gray
  rule. Class activities reuse the same `details` for their "Discussion points".
- **"Ask a question" panel** (`question-popup.js`). The trigger is solid ink; the panel is canvas with
  a 1px ink border. Tabs and labels use DM Mono, inputs and messages use Poppins. Errors are shown in
  ink at weight 600, not in red.

## Dark mode

- `html.dark-mode` class, persisted as `localStorage.theme = 'dark' | 'light'`.
- Every layer swaps the same tokens. The canvas is `#0a0a0a` everywhere, so lesson iframes blend
  into the page around them.

## Don'ts

- No typefaces other than Poppins and DM Mono, and no `system-ui`/`Segoe`/`Inter`/`Georgia` stacks.
- No uppercase or all-caps text.
- No saturated or accent colours outside answer feedback.
- No rounded corners, shadows, blur or hover lift.
- No emojis.

## Where it lives

| File | Scope |
|------|-------|
| `style.css` | Hubs (`index.html`, `year-11.html`, `year-12.html`), topic pages (`body.sociotype`), PDF viewer |
| `year-12-maths/lesson-kit.css` | All Year 12 lessons |
| Inline `<style>` in each Year 11 lesson | Year 11 lessons (same tokens, copied per file) |
| `question-popup.js` | Injects the question panel's CSS |
| `skills/make-lesson/SKILL.md` | Lesson templates. Keep them in line with this file |
