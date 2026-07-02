---
name: make-lesson
description: Create a new lesson page for this infinity_edu project. Use when the user asks to add a new lesson, build a lesson HTML file, or scaffold a topic lesson. Produces a fully wired lesson page consistent with the existing Linear Relationships lessons.
---

This skill generates new lesson HTML files for the infinity_edu educational platform. Every lesson is a self-contained HTML file loaded in an iframe by `pdf-viewer.js`. Follow all patterns exactly — the platform has no build tools, no framework.

## Design system

All UI follows the **Sociotype** design system (`skills/style.md`). Key rules:
- No border-radius anywhere
- Achromatic palette only — `--ink` / `--canvas` / gray variables
- Poppins (`--font-display`) for all UI text (headings, labels, TOC, pills)
- Space Mono (`--font-mono`) for math display elements and the `.opt-letter` badge only
- Ghost buttons — text + 1px border, no fill, no shadow

## `<head>` boilerplate

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lesson N — Title</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
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
  --font-mono: 'Space Mono', 'Courier New', monospace;
}

html.dark-mode {
  --ink: #f0f0f0;
  --canvas: #111;
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
.toc-heading { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gray-med); margin-bottom: 12px; }
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
.section-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-med); margin-bottom: 8px; }
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
      // Split letter (Space Mono) from content (Poppins)
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
.kc-reset { margin-top: 14px; background: transparent; border: none; border-bottom: 1px solid var(--gray-med); color: var(--gray-med); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 0; cursor: pointer; }
/* opt-letter: Space Mono badge for A/B/C/D */
.opt-letter { font-family: var(--font-mono); font-size: 11px; font-weight: 700; min-width: 16px; padding-top: 1px; }
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
  letter-spacing: 0.06em;
  text-transform: uppercase;
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
  letter-spacing: 0.07em;
  text-transform: uppercase;
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

In `index.html` (landing page), add the new lesson index to the `COMPLETABLE` map:

```javascript
const COMPLETABLE = {
  6: [0, 1, 2, 3],  // add the new lesson index here
};
```
