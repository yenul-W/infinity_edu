---
name: make-lesson
description: Create a new lesson page for this infinity_edu project. Use when the user asks to add a new lesson, build a lesson HTML file, or scaffold a topic lesson. Produces a fully wired lesson page consistent with the existing Linear Relationships lessons.
---

This skill generates new lesson HTML files for the infinity_edu educational platform. Every lesson is an HTML file loaded in an iframe by `pdf-viewer.js`. Follow all patterns exactly — the platform has no build tools, no framework.

## Which system? Read this first

There are **two** lesson systems. Pick by year.

| | Year 11 (`year-11-maths/`) | Year 12 (`year-12-maths/`) |
|---|---|---|
| CSS | Inlined in every file | `<link href="../lesson-kit.css">` |
| JS | `buildKC` IIFE copied per file | `<script src="../lesson-kit.js">` → `window.IE` |
| Topic ID | Number (`6`) | String (`'y12-6'`) |
| Lessons per topic | Varies | Always 5: 3 lessons + homework + revision |
| Content target | ~45 min | **2–3 hours** |

**For new Year 12 lessons, use the shared kit** (§ "Year 12 lesson kit" below) — do not inline the CSS or copy `buildKC`. The rest of this document describes the Year 11 pattern, which the kit reproduces exactly; read it for the markup structure, which is identical in both.

## Design system

All UI follows the **Sociotype** design system — see [`DESIGN.md`](../../DESIGN.md) for the site's rules (fonts, sentence case, colours) and `skills/style/SKILL.md` for the original reference. Key rules:
- No border-radius anywhere
- Achromatic palette only — `--ink` / `--canvas` / gray variables
- Poppins (`--font-display`) for all UI text (headings, labels, TOC, pills)
- DM Mono (`--font-mono`) for math display elements and the `.opt-letter` badge only
- Ghost buttons — text + 1px border, no fill, no shadow

## `<head>` boilerplate

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lesson N — Title</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Mono:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderMathInElement !== 'undefined') {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }
  });
</script>
```

## CSS variables (required in every lesson)

```css
:root {
  --ink: #000;
  --canvas: #fff;
  --gray-med: #818181;
  --gray-light: #d6d6d6;
  --gray-faint: #f2f2f2;
  --font-display: 'Poppins', sans-serif;
  --font-mono: 'DM Mono', monospace;
}

html.dark-mode {
  --ink: #f0f0f0;
  --canvas: #0a0a0a;
  --gray-med: #888;
  --gray-light: #333;
  --gray-faint: #1a1a1a;
}

body {
  font-family: var(--font-display);
  font-size: 14px;
  line-height: 1.29;
  letter-spacing: 0.35px;
  color: var(--ink);
  background: var(--canvas);
}
```

## Page layout

```html
<div class="page">
  <!-- Topbar -->
  <div class="topbar">
    <div class="topbar-left">
      <span class="topbar-topic">Topic N — Topic Name</span>
      <span>Year 11 Mathematics Standard</span>
    </div>
    <span>Lesson N</span>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-main">
      <p class="eyebrow">Lesson N</p>
      <h1>Lesson Title</h1>
      <p class="subtitle">One or two sentences describing what the lesson covers.</p>
      <div class="hero-meta">
        <span class="pill">Outcome pill 1</span>
        <span class="pill">Outcome pill 2</span>
      </div>
    </div>
    <div class="hero-side">
      <p class="side-label">In this lesson</p>
      <ul class="side-list">
        <li>Section one description</li>
        <li>Section two description</li>
        <li>Knowledge check</li>
      </ul>
    </div>
  </div>

  <!-- TOC + content -->
  <div class="layout">
    <aside class="toc">
      <p class="toc-heading">Contents</p>
      <ul class="toc-list">
        <li class="toc-item"><a class="toc-link" href="#section1">Section One</a></li>
        <li class="toc-item"><a class="toc-link" href="#check">Knowledge Check</a></li>
        <li class="toc-item"><a class="toc-link" href="#homework">Homework</a></li>
      </ul>
    </aside>

    <div class="main-content">
      <!-- content cards go here -->
    </div>
  </div>
</div>
```

Key layout CSS:
```css
.layout { display: grid; grid-template-columns: 210px 1fr; gap: 48px; align-items: start; }
.toc { position: sticky; top: 24px; }
.toc-heading { font-size: 10px; letter-spacing: 0.02em; color: var(--gray-med); margin-bottom: 12px; }
.toc-link { display: block; font-size: 12px; color: var(--gray-med); text-decoration: none; padding: 5px 0 5px 12px; border-left: 1px solid var(--gray-light); transition: color 0.15s, border-color 0.15s; }
.toc-link:hover { color: var(--ink); }
.toc-link.toc-active { color: var(--ink); border-left: 2px solid var(--ink); padding-left: 10px; }
```

## Content card pattern

Every major section is a `.content-card` div with a scroll anchor `id`:

```html
<div class="content-card" id="section1">
  <p class="section-label">Section Type</p>
  <h2>Section Heading</h2>
  <!-- body content -->
</div>
```

CSS:
```css
.content-card { border: 1px solid var(--ink); padding: 32px 36px; margin-bottom: 32px; }
.section-label { font-size: 11px; letter-spacing: 0.02em; color: var(--gray-med); margin-bottom: 8px; }
h2 { font-size: 26px; letter-spacing: 0.26px; line-height: 1.13; border-bottom: 1px solid var(--gray-light); padding-bottom: 16px; margin-bottom: 24px; }
```

## Knowledge Check block

The KC block is a `.kc-block` (not a `.content-card` — it uses `border: 1px solid var(--ink)` directly). Define `KC_QS` then call `buildKC` as an IIFE.

### KC_QS array shape

```javascript
const KC_QS = [
  {
    q: 'Question text. Use \\(...\\) for inline math and \\[...\\] for display math.',
    opts: [
      'A) First option — include \\(...\\) for any math',
      'B) Second option',
      'C) Third option',
      'D) Fourth option'
    ],
    correct: 0,   // 0-indexed
    explanation: 'A is correct. Explanation with math: \\(m = \\dfrac{3}{1} = 3\\).'
  },
  // ... 6 more (7 total)
];
```

**KaTeX rules:**
- In HTML: use `\(...\)` and `\[...\]` directly
- In JS strings: escape backslashes — `\\(...\\)` and `\\[...\\]`
- Inline: `\(x^2 + 1\)` — Display: `\[\frac{a}{b}\]`
- Use `\dfrac` (not `\frac`) for fractions that need to be legible at inline size
- TeX escapes only work inside delimiters. In prose write `$7,500`, never `\$7\,500` — outside
  `\(...\)` the backslashes render literally. Inside math, `\(\$7\,500\)` is correct.

### buildKC IIFE

```javascript
(function buildKC() {
  const container = document.getElementById('kcQuestions');
  const scoreEl   = document.getElementById('kcScore');
  let answered = 0, score = 0;

  KC_QS.forEach((qData, qi) => {
    const wrap = document.createElement('div');
    wrap.className = 'kc-q-wrap';

    const qEl = document.createElement('p');
    qEl.className = 'kc-q';
    qEl.innerHTML = `${qi + 1}. ${qData.q}`;
    wrap.appendChild(qEl);

    const optsEl = document.createElement('div');
    optsEl.className = 'kc-options';

    qData.opts.forEach((opt, oi) => {
      const btn = document.createElement('button');
      btn.className = 'kc-opt';
      // Split letter (DM Mono) from content (Poppins)
      const letterMatch = opt.match(/^([A-D])\)\s*([\s\S]*)$/);
      const letter  = letterMatch ? letterMatch[1] : String.fromCharCode(65 + oi);
      const content = letterMatch ? letterMatch[2] : opt;
      btn.innerHTML = `<span class="opt-letter">${letter}</span><span>${content}</span>`;

      btn.addEventListener('click', () => {
        if (wrap.dataset.answered) return;
        wrap.dataset.answered = '1';
        answered++;
        const isCorrect = oi === qData.correct;
        if (isCorrect) score++;
        optsEl.querySelectorAll('.kc-opt').forEach((b, i) => {
          b.disabled = true;
          if (i === qData.correct) b.classList.add('kc-correct');
          else if (i === oi)       b.classList.add('kc-wrong');
        });
        const fb = document.createElement('p');
        fb.className = 'kc-feedback ' + (isCorrect ? 'correct' : 'wrong');
        fb.innerHTML = (isCorrect ? '✓ ' : '✗ ') + qData.explanation;
        wrap.appendChild(fb);
        // Re-render TeX in the feedback paragraph
        if (typeof renderMathInElement !== 'undefined') {
          renderMathInElement(wrap, {
            delimiters: [
              { left: '\\(', right: '\\)', display: false },
              { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
          });
        }
        if (answered === KC_QS.length) showScore();
      });
      optsEl.appendChild(btn);
    });

    wrap.appendChild(optsEl);
    container.appendChild(wrap);
  });

  // Render TeX in all questions + options on initial build
  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(container, {
      delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }

  function showScore() {
    const pct    = score / KC_QS.length;
    const remark = pct === 1    ? 'Excellent — full marks!'
                 : pct >= 0.6  ? 'Good work. Review any incorrect answers.'
                               : 'Keep practising — re-read the theory and try again.';
    scoreEl.innerHTML = `Score: <strong>${score} / ${KC_QS.length}</strong>
      <p class="kc-remark">${remark}</p>
      <button class="kc-reset" id="kcResetBtn">Reset quiz</button>`;
    scoreEl.classList.add('show');
    document.getElementById('kcResetBtn').addEventListener('click', () => {
      container.innerHTML = '';
      scoreEl.className   = 'kc-score';
      scoreEl.innerHTML   = '';
      answered = 0; score = 0;
      buildKC();
    });
  }
})();
```

### KC HTML (in the page body)

```html
<div class="kc-block" id="check">
  <p class="section-label">Knowledge Check</p>
  <h2 style="border-bottom:none; padding-bottom:0; margin-bottom:8px;">Practice &amp; Quiz</h2>
  <p class="kc-intro">Answer all seven questions to see your score.</p>
  <div id="kcQuestions"></div>
  <div class="kc-score" id="kcScore"></div>
</div>
```

### KC CSS (required in every lesson)

```css
.kc-block { border: 1px solid var(--ink); padding: 32px 36px; margin-bottom: 32px; }
.kc-intro { font-size: 13px; color: var(--gray-med); margin-bottom: 24px; }
.kc-q-wrap { margin-bottom: 24px; }
.kc-q { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.kc-options { display: flex; flex-direction: column; gap: 6px; }
.kc-opt {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 9px 14px; border: 1px solid var(--gray-light);
  cursor: pointer; font-size: 13px; transition: background 0.12s;
  user-select: none; background: transparent; color: var(--ink);
  text-align: left; width: 100%;
}
.kc-opt:hover:not([disabled]) { background: var(--gray-faint); }
.kc-opt.kc-correct { border-color: #00a050; background: rgba(0,160,80,0.08); }
.kc-opt.kc-wrong   { border-color: #c00000; background: rgba(200,0,0,0.08); }
html.dark-mode .kc-opt.kc-correct { background: rgba(0,160,80,0.14); }
html.dark-mode .kc-opt.kc-wrong   { background: rgba(200,0,0,0.14); }
.kc-feedback { font-size: 12px; color: var(--gray-med); margin-top: 8px; min-height: 18px; }
.kc-feedback.correct { color: #00a050; }
.kc-feedback.wrong   { color: #c00000; }
.kc-score { border-top: 1px solid var(--gray-light); padding-top: 20px; margin-top: 20px; font-size: 15px; font-weight: 600; display: none; }
.kc-score.show { display: block; }
.kc-remark { font-size: 13px; font-weight: 400; color: var(--gray-med); margin-top: 6px; }
.kc-reset { margin-top: 14px; background: transparent; border: none; border-bottom: 1px solid var(--gray-med); color: var(--gray-med); font-size: 11px; letter-spacing: 0.02em; padding: 2px 0; cursor: pointer; }
/* opt-letter: DM Mono badge for A/B/C/D */
.opt-letter { font-family: var(--font-mono); font-size: 11px; font-weight: 300; min-width: 16px; padding-top: 1px; }
```

## Homework section

```html
<div class="content-card" id="homework">
  <p class="section-label">Homework</p>
  <h2>Homework</h2>
  <p style="font-size:13px; color:var(--gray-med); margin-bottom:20px;">
    Complete all questions before the next lesson.
  </p>
  <button class="lesson-link-btn" onclick="window.parent.postMessage({type:'ie-load-lesson', lessonIndex: 4}, '*')">
    Open Homework
  </button>
</div>
```

```css
.lesson-link-btn {
  background: transparent;
  border: 1px solid var(--ink);
  padding: 10px 20px;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.02em;
  cursor: pointer;
  color: var(--ink);
}
.lesson-link-btn:hover { background: var(--gray-faint); }
/* Lesson badge for homework questions */
.lesson-badge {
  display: inline-block;
  border: 1px solid var(--gray-light);
  padding: 2px 8px;
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--gray-med);
  margin-left: 8px;
  vertical-align: middle;
}
```

## Dark mode wiring

Dark mode is toggled by the parent frame (`pdf-viewer.js`) via a `postMessage`. Add this script to every lesson:

```javascript
window.addEventListener('message', e => {
  if (e.data && e.data.type === 'ie-theme') {
    document.documentElement.classList.toggle('dark-mode', e.data.dark);
  }
});
```

On load, sync to the parent's current theme:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  window.parent.postMessage({ type: 'ie-theme-request' }, '*');
});
```

## Completion tracking

When the user finishes the KC, mark the lesson complete in localStorage and notify the parent:

```javascript
// Inside showScore() in buildKC:
const TOPIC_ID   = 6;   // matches the folder number
const LESSON_IDX = 0;   // 0-based index of this lesson in the lessons array
localStorage.setItem(`ie_done_${TOPIC_ID}_${LESSON_IDX}`, '1');
window.parent.postMessage({ type: 'ie-lesson-complete', topicId: TOPIC_ID, lessonIndex: LESSON_IDX }, '*');
```

## Adding to the topic index

In the topic's `index.html`, add the lesson to the `initPdfViewer` call:

```javascript
initPdfViewer({
  topicId: 6,
  lessons: [
    { title: 'Lesson 1 — Graphing',    slides: 'lesson-01-graphing.html',           kind: 'html' },
    { title: 'Lesson N — New Lesson',  slides: 'lesson-0N-new-lesson.html',          kind: 'html' },
    // ...
  ]
});
```

In `year-11.html` (the Year 11 landing page), add the new lesson index to the `COMPLETABLE` map:

```javascript
const COMPLETABLE = {
  6: [0, 1, 2, 3],  // add the new lesson index here
};
```

---

# Year 12 lesson kit

Year 12 lessons share `year-12-maths/lesson-kit.css` and `year-12-maths/lesson-kit.js` instead of
inlining everything. The rendered result is identical to Year 11; only the plumbing differs.

## `<head>` for a Year 12 lesson

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lesson N — Title</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Mono:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">
<link rel="stylesheet" href="../lesson-kit.css">
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js"></script>
```

At the end of `<body>`: `<script src="../lesson-kit.js"></script>` then one inline
`<script>` whose contents sit inside `document.addEventListener('DOMContentLoaded', …)`.

The kit handles dark mode and TOC scroll-spy automatically. Do **not** add the `ie-theme-request`
postMessage — `pdf-viewer.js` never answers it; the kit reads `localStorage.theme` directly.

## `window.IE` API

| Call | Purpose |
|---|---|
| `IE.tex(el)` | Re-render KaTeX inside `el`. Call once with `document.body` at start. |
| `IE.buildKC(QS, {topicId, lessonIdx})` | 7-question knowledge check. **Marks the lesson complete** when finished. |
| `IE.buildPractice(QS, opts)` | Extended practice with step-by-step reveal and self-marking. |
| `IE.plot(mountId, opts)` | Achromatic inline-SVG plotter. Returns `redraw(newOpts)`. |
| `IE.slider({mount, label, min, max, step, value, format, onInput})` | Labelled range input with live readout. |
| `IE.completeBanner({mount, topicId, lessonIdx, label, doneLabel})` | Manual complete toggle — revision pages only. |
| `IE.openLesson(i)` | Navigate the parent viewer to lesson index `i`. |
| `IE.markComplete(topicId, idx)` / `IE.isComplete(...)` | Direct completion access. |

`KC_QS` has the same shape as Year 11. `PRACTICE_QS` entries are:

```javascript
{ q: 'Question text with \\(math\\)',
  marks: 3,
  steps: ['Step one…', 'Step two…'],   // shown in an <ol> when revealed
  answer: 'The final answer.' }
```

Mount points expected by the defaults: `#kcQuestions` / `#kcScore` for the KC, and
`#practiceQuestions` / `#practiceTally` / `#practiceSummary` for practice. Pass
`{mount, tally, summary}` to run several practice blocks on one page (the homework pages do).

## Required content per Year 12 lesson (the 2–3 hour target)

The taught part of each lesson (everything above the Knowledge Check) is sized for a
**60-minute class**.

1. Topbar + hero (eyebrow, title, subtitle, outcome pills, "In this lesson" list)
2. Sticky TOC — the kit wires scroll-spy automatically
3. **5–8 `.content-card` sections**, each with a worked example. The section count includes one
   that goes beyond the minimum: a syllabus dot point the core sections only touch on.
4. **A Your turn block after the main worked example of at least five sections** — two questions,
   each with a hidden worked answer (markup below)
5. **At least one exam-style worked example**, labelled `Worked example N &mdash; exam style`, with
   lettered parts and mark allocations
6. **≥3 `.interactive-block` widgets** that compute live (sliders + readouts + plots), not just check-answer boxes
7. **A class activity card** (`id="activity"`, section label "Class activity") just before the
   Knowledge Check: about 10 minutes, built on one of the lesson's own widgets, with numbered steps
   and a `details.yt-answer` holding "Discussion points" for the teacher. Every answer in it must
   match what the widget actually displays — compute it from the widget's own code.
8. **7-question Knowledge Check** via `IE.buildKC` — this is what completes the lesson
9. **12–15 question Extended Practice** via `IE.buildPractice`
10. Homework/next-lesson link card using `IE.openLesson(i)`

Every new card needs a matching TOC entry and hero `side-list` item. Worked examples are numbered
in page order.

Your turn markup (CSS only; `IE.tex(document.body)` renders the maths inside it):

```html
<div class="your-turn">
  <p class="example-label">Your turn</p>
  <ol>
    <li>Question with \(math\).
      <details class="yt-answer"><summary>Show working</summary><div class="yt-body">
        <p>Working…</p>
      </div></details></li>
  </ol>
</div>
```

Homework pages carry ~30 questions in three `IE.buildPractice` blocks and **no** completion call.
Revision pages carry a formula sheet, a syllabus checklist, a common-mistakes table, a 15-question
paper, and `IE.completeBanner`.

## Extra kit-only CSS classes

`.formula-box` (+ `.formula-label`, `.formula-where`), `.slider-row`, `.readout` (+ `.readout-item`,
`.readout-label`, `.readout-value`), `.plot-wrap`, `.practice-*`, `.complete-banner`,
`.lesson-complete-btn`, `.your-turn`, `.yt-answer` (+ `.yt-body`).

## Wiring a Year 12 lesson in

The topic's `index.html` uses a **string** topic ID and always five lessons:

```javascript
const TOPIC_ID = 'y12-3';
const lessons = [
  { num: 1, title: '…', slides: 'lesson-01-….html', kind: 'html', syllabus: [ … ] },   // idx 0
  { num: 2, title: '…', slides: 'lesson-02-….html', kind: 'html', syllabus: [ … ] },   // idx 1
  { num: 3, title: '…', slides: 'lesson-03-….html', kind: 'html', syllabus: [ … ] },   // idx 2
  { num: 4, homework: true, slides: 'lesson-04-homework.html', kind: 'html', syllabus: [] },  // idx 3
  { num: 5, title: 'Revision', revision: true, slides: 'lesson-05-revision.html', kind: 'html', syllabus: [ … ] }  // idx 4
];
```

Then in `year-12.html`: add `'y12-N': [0, 1, 2, 4]` to `COMPLETABLE` (homework is excluded) and
remove `topic-card--pending` plus the `.pending-badge` span from that topic's card.

> **`lessonIdx` must equal the true array index.** Year 11 topics 5, 8 and 9 have hand-tuned
> constants that are off by one; do not copy that. Lesson 1 → 0, Lesson 2 → 1, Lesson 3 → 2,
> revision → 4.

## Syllabus dot points

Take them verbatim from the NSW page for the focus area, at
`https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-standard-11-12-2024/content/year-12-tba2/<id>`:

| Focus area | id | | Focus area | id |
|---|---|---|---|---|
| Algebraic relationships | `faf5e47f4a` | | Critical path analysis | `fa9c92c4c6` |
| Investment and loans | `fac80cab35` | | Bivariate data analysis | `fadb5e412c` |
| Annuities | `faa14f8aa3` | | Relative frequency and probability | `fae778ced4` |
| Trigonometry | `fa6dd765ae` | | The normal distribution | `fa92309f60` |
| Ratios and rates | `fa96edbda5` | | Network flow | `fafe0a915b` |

The pages are JS-rendered; `curl` the URL and strip tags rather than relying on a summarising
fetch, which returns the Life Skills content instead.
