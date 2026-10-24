/* ═══════════════════════════════════════════════════════════════
   INFINITY EDU — YEAR 12 LESSON KIT
   Shared behaviour for every year-12-maths lesson page.
   Loaded from inside the lesson iframe: <script src="../lesson-kit.js">

   Exposes window.IE:
     IE.tex(el)                        re-render KaTeX inside an element
     IE.markComplete(topicId, idx)     write ie_done_* + notify parent
     IE.buildKC(QS, opts)              7-question knowledge check
     IE.buildPractice(QS, opts)        extended practice with worked solutions
     IE.plot(mount, opts)              achromatic inline-SVG function plotter
     IE.slider(opts)                   labelled range input with live readout
     IE.toc()                          scroll-spy for the sticky contents list
     IE.completeBanner(opts)           manual "mark complete" banner
     IE.nextLesson(idx, cb)            ask the viewer for the lesson after idx
     IE.enhanceExercises()             a11y wiring for .exercise-row (auto)

   Depends on KaTeX auto-render (loaded by the lesson page) for IE.tex;
   everything degrades gracefully if KaTeX is unavailable.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var IE = {};
  window.IE = IE;

  var TEX_DELIMS = [
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false }
  ];

  /* ── KaTeX ─────────────────────────────────────────────────── */
  IE.tex = function (el) {
    if (typeof renderMathInElement === 'undefined') return;
    try {
      renderMathInElement(el || document.body, { delimiters: TEX_DELIMS, throwOnError: false });
    } catch (e) {}
  };

  /* ── Theme ─────────────────────────────────────────────────── */
  // Read the saved theme (or the OS preference, as the topic page does) on
  // load, then follow the parent's 'ie-theme' messages — pdf-viewer.js
  // sends one every time the iframe loads.
  (function initTheme() {
    try {
      var t = localStorage.getItem('theme');
      var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark-mode', dark);
    } catch (e) {}
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.type !== 'ie-theme') return;
      document.documentElement.classList.toggle('dark-mode', !!e.data.dark);
      try { localStorage.setItem('theme', e.data.dark ? 'dark' : 'light'); } catch (err) {}
    });
  })();

  /* ── Viewer shortcuts (j/k lesson, d theme) ────────────────── */
  // pdf-viewer.js listens on this document directly when it can and sets
  // window.__ieKeysBound; otherwise (file:// origins) forward the key.
  document.addEventListener('keydown', function (e) {
    if (window.__ieKeysBound || window.parent === window) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.key !== 'j' && e.key !== 'k' && e.key !== 'd') return;
    try { window.parent.postMessage({ type: 'ie-key', key: e.key }, '*'); } catch (err) {}
  });

  /* ── Completion ────────────────────────────────────────────── */
  IE.markComplete = function (topicId, lessonIdx) {
    try { localStorage.setItem('ie_done_' + topicId + '_' + lessonIdx, '1'); } catch (e) {}
    try {
      window.parent.postMessage({
        type: 'ie-lesson-complete', topicId: topicId, lessonIndex: lessonIdx
      }, '*');
    } catch (e) {}
  };

  IE.isComplete = function (topicId, lessonIdx) {
    try { return localStorage.getItem('ie_done_' + topicId + '_' + lessonIdx) === '1'; }
    catch (e) { return false; }
  };

  IE.openLesson = function (lessonIndex) {
    try { window.parent.postMessage({ type: 'ie-load-lesson', lessonIndex: lessonIndex }, '*'); }
    catch (e) {}
  };

  // Ask the viewer what comes after lessonIdx; cb({ index, label, num,
  // homework, revision }) or cb(null). Silent when not inside the viewer.
  IE.nextLesson = function (lessonIdx, cb) {
    if (window.parent === window) return;
    function onMsg(e) {
      if (!e.data || e.data.type !== 'ie-lesson-meta') return;
      window.removeEventListener('message', onMsg);
      cb(e.data.next);
    }
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: 'ie-lesson-meta-request', lessonIndex: lessonIdx }, '*'); }
    catch (e) { window.removeEventListener('message', onMsg); }
  };

  /* ── Knowledge Check ───────────────────────────────────────── */
  /* QS: [{ q, opts:['A) …', …], correct:<0-idx>, explanation }]
     opts: { mount='kcQuestions', scoreMount='kcScore', topicId, lessonIdx } */
  IE.buildKC = function (QS, opts) {
    opts = opts || {};
    var container = document.getElementById(opts.mount || 'kcQuestions');
    var scoreEl   = document.getElementById(opts.scoreMount || 'kcScore');
    if (!container || !scoreEl) return;

    var answered = 0, score = 0;

    // One persistent live region per check so each answer is announced
    var live = document.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    container.appendChild(live);
    scoreEl.setAttribute('aria-live', 'polite');

    QS.forEach(function (qData, qi) {
      var wrap = document.createElement('div');
      wrap.className = 'kc-q-wrap';

      var qEl = document.createElement('p');
      qEl.className = 'kc-q';
      qEl.innerHTML = (qi + 1) + '. ' + qData.q;
      wrap.appendChild(qEl);

      var optsEl = document.createElement('div');
      optsEl.className = 'kc-options';

      qData.opts.forEach(function (opt, oi) {
        var btn = document.createElement('button');
        btn.className = 'kc-opt';
        var m = opt.match(/^([A-D])\)\s*([\s\S]*)$/);
        var letter  = m ? m[1] : String.fromCharCode(65 + oi);
        var content = m ? m[2] : opt;
        btn.innerHTML = '<span class="opt-letter">' + letter + '</span><span>' + content + '</span>';

        btn.addEventListener('click', function () {
          if (wrap.dataset.answered) return;
          wrap.dataset.answered = '1';
          answered++;
          var isCorrect = oi === qData.correct;
          if (isCorrect) score++;
          optsEl.querySelectorAll('.kc-opt').forEach(function (b, i) {
            b.disabled = true;
            if (i === qData.correct) b.classList.add('kc-correct');
            else if (i === oi)       b.classList.add('kc-wrong');
          });
          var fb = document.createElement('p');
          fb.className = 'kc-feedback ' + (isCorrect ? 'correct' : 'wrong');
          fb.tabIndex = -1;
          fb.innerHTML = '<strong>' + (isCorrect ? '✓ Correct.' : '✗ Not quite.') + '</strong> ' + qData.explanation;
          wrap.appendChild(fb);
          IE.tex(wrap);
          // The clicked button is now disabled — keep keyboard focus nearby
          try { fb.focus({ preventScroll: true }); } catch (err) { fb.focus(); }
          live.textContent = 'Question ' + (qi + 1) + ': ' + fb.textContent;
          if (answered === QS.length) showScore();
        });
        optsEl.appendChild(btn);
      });

      wrap.appendChild(optsEl);
      container.appendChild(wrap);
    });

    IE.tex(container);

    function showScore() {
      var pct = score / QS.length;
      var remark = pct === 1   ? 'Excellent — full marks!'
                 : pct >= 0.6  ? 'Good work. Review any incorrect answers.'
                               : 'Keep practising — re-read the theory and try again.';
      var completes = opts.topicId != null && opts.lessonIdx != null;
      scoreEl.innerHTML =
        'Score: <strong>' + score + ' / ' + QS.length + '</strong>' +
        '<p class="kc-remark">' + remark + '</p>' +
        (completes ? '<p class="kc-remark">✓ Lesson marked complete.</p>' : '') +
        '<button class="kc-reset" id="kcResetBtn">Reset quiz</button>';
      scoreEl.classList.add('show');
      if (completes) {
        IE.nextLesson(opts.lessonIdx, function (next) {
          if (!next || !scoreEl.classList.contains('show')) return;
          var btn = document.createElement('button');
          btn.className = 'kc-reset kc-next';
          btn.textContent = 'Next: ' + (next.homework || next.revision ? next.label : 'Lesson ' + next.num + ' — ' + next.label) + ' →';
          btn.addEventListener('click', function () { IE.openLesson(next.index); });
          scoreEl.appendChild(btn);
        });
      }
      document.getElementById('kcResetBtn').addEventListener('click', function () {
        container.innerHTML = '';
        scoreEl.className = 'kc-score';
        scoreEl.innerHTML = '';
        IE.buildKC(QS, opts);
      });
      // Finishing the knowledge check completes the lesson.
      if (opts.topicId != null && opts.lessonIdx != null) {
        IE.markComplete(opts.topicId, opts.lessonIdx);
      }
    }
  };

  /* ── Extended Practice ─────────────────────────────────────── */
  /* QS: [{ q, marks, steps:['…','…'], answer }]
     opts: { mount='practiceQuestions', tally='practiceTally',
             summary='practiceSummary' } */
  IE.buildPractice = function (QS, opts) {
    opts = opts || {};
    var container = document.getElementById(opts.mount || 'practiceQuestions');
    var tallyEl   = document.getElementById(opts.tally || 'practiceTally');
    var summaryEl = document.getElementById(opts.summary || 'practiceSummary');
    if (!container) return;

    var marked = {};   // qi -> true (right) / false (wrong)

    QS.forEach(function (qData, qi) {
      var wrap = document.createElement('div');
      wrap.className = 'practice-q';

      var head = document.createElement('div');
      head.className = 'practice-q-head';
      head.innerHTML =
        '<span class="practice-q-num">' + (qi + 1) + '.</span>' +
        '<span class="practice-q-text">' + qData.q + '</span>' +
        (qData.marks ? '<span class="practice-marks">' + qData.marks + ' mark' + (qData.marks > 1 ? 's' : '') + '</span>' : '');
      wrap.appendChild(head);

      var actions = document.createElement('div');
      actions.className = 'practice-actions';
      var revealBtn = document.createElement('button');
      revealBtn.className = 'practice-btn';
      revealBtn.textContent = 'Show working';
      actions.appendChild(revealBtn);
      wrap.appendChild(actions);

      var working = document.createElement('div');
      working.className = 'practice-working';
      working.innerHTML =
        '<ol>' + qData.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
        '<p class="practice-answer">Answer: ' + qData.answer + '</p>';
      wrap.appendChild(working);

      var markRow = document.createElement('div');
      markRow.className = 'practice-mark-row';
      markRow.innerHTML =
        '<span>Did you get it right?</span>' +
        '<button class="practice-mark-btn" data-right="1">✓ Got it</button>' +
        '<button class="practice-mark-btn" data-right="0">✗ Not yet</button>';
      wrap.appendChild(markRow);

      revealBtn.addEventListener('click', function () {
        var shown = working.classList.toggle('show');
        revealBtn.textContent = shown ? 'Hide working' : 'Show working';
        if (shown) {
          markRow.classList.add('show');
          IE.tex(working);
        }
      });

      markRow.querySelectorAll('.practice-mark-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var right = btn.dataset.right === '1';
          marked[qi] = right;
          markRow.querySelectorAll('.practice-mark-btn').forEach(function (b) {
            b.classList.remove('picked-right', 'picked-wrong');
          });
          btn.classList.add(right ? 'picked-right' : 'picked-wrong');
          updateTally();
        });
      });

      container.appendChild(wrap);
    });

    IE.tex(container);
    updateTally();

    function updateTally() {
      var keys = Object.keys(marked);
      var done = keys.length;
      var right = keys.filter(function (k) { return marked[k]; }).length;
      if (tallyEl) {
        tallyEl.innerHTML = done
          ? 'Self-marked &nbsp;<strong>' + right + ' / ' + done + '</strong>&nbsp; correct &nbsp;&middot;&nbsp; ' + (QS.length - done) + ' remaining'
          : 'Self-marked &nbsp;<strong>0 / ' + QS.length + '</strong>&nbsp; &mdash; reveal the working to mark each question';
      }
      if (summaryEl && done === QS.length) {
        var pct = right / QS.length;
        var remark = pct >= 0.85 ? 'Exam-ready on this section.'
                   : pct >= 0.6  ? 'Solid. Revisit the questions you missed and try them again cold.'
                                 : 'Work back through the theory sections, then re-attempt the ones you missed.';
        summaryEl.innerHTML =
          'Practice complete: <strong>' + right + ' / ' + QS.length + '</strong>' +
          '<p class="practice-remark">' + remark + '</p>';
        summaryEl.classList.add('show');
      }
    }
  };

  /* ── Diagram label geometry ────────────────────────────────── */
  /* Positions for text-anchor="middle" labels that never touch the lines they describe.
     Points are [x, y] in SVG units; fs is the label's font size (mono, ≈0.6em per glyph).
       IE.geom.side(p, q, inside, text, fs, gap)   label just outside side pq
       IE.geom.vertex(v, inside, text, fs, gap)    label beyond vertex v, away from `inside`
       IE.geom.angle(v, p1, p2, r, text, fs, gap)  label inside angle p1-v-p2, past an arc of radius r
       IE.geom.edge(p, q, text, fs, gap)           network edge label beside the midpoint of pq
       IE.geom.arc(v, p1, p2, r)                   SVG path d for that arc, ending on both arms */
  IE.geom = (function () {
    function unit(x, y) { var l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
    function size(text, fs) { return [String(text).length * 0.6 * fs, 0.72 * fs]; }
    // Centre a w×h box `gap` beyond `from` in direction d; return the baseline point
    function push(from, d, text, fs, gap) {
      var s = size(text, fs);
      var dist = gap + Math.abs(d[0]) * s[0] / 2 + Math.abs(d[1]) * s[1] / 2;
      return { x: from[0] + d[0] * dist, y: from[1] + d[1] * dist + s[1] / 2 };
    }
    return {
      side: function (p, q, inside, text, fs, gap) {
        var n = unit(q[1] - p[1], p[0] - q[0]);
        var m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        if ((inside[0] - m[0]) * n[0] + (inside[1] - m[1]) * n[1] > 0) n = [-n[0], -n[1]];
        return push(m, n, text, fs, gap == null ? 5 : gap);
      },
      vertex: function (v, inside, text, fs, gap) {
        return push(v, unit(v[0] - inside[0], v[1] - inside[1]), text, fs, gap == null ? 5 : gap);
      },
      angle: function (v, p1, p2, r, text, fs, gap) {
        var u1 = unit(p1[0] - v[0], p1[1] - v[1]), u2 = unit(p2[0] - v[0], p2[1] - v[1]);
        var b = unit(u1[0] + u2[0], u1[1] + u2[1]);
        return push([v[0] + b[0] * r, v[1] + b[1] * r], b, text, fs, gap == null ? 3 : gap);
      },
      // Network edge label: beside the midpoint of pq, on the upper side (right side if vertical)
      edge: function (p, q, text, fs, gap) {
        var n = unit(q[1] - p[1], p[0] - q[0]);
        if (n[1] > 0.05 || (Math.abs(n[1]) <= 0.05 && n[0] < 0)) n = [-n[0], -n[1]];
        return push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n, text, fs, gap == null ? 4 : gap);
      },
      arc: function (v, p1, p2, r) {
        var u1 = unit(p1[0] - v[0], p1[1] - v[1]), u2 = unit(p2[0] - v[0], p2[1] - v[1]);
        var sweep = (u1[0] * u2[1] - u1[1] * u2[0]) > 0 ? 1 : 0;
        return 'M ' + (v[0] + u1[0] * r).toFixed(2) + ' ' + (v[1] + u1[1] * r).toFixed(2) +
               ' A ' + r + ' ' + r + ' 0 0 ' + sweep + ' ' +
               (v[0] + u2[0] * r).toFixed(2) + ' ' + (v[1] + u2[1] * r).toFixed(2);
      }
    };
  })();

  /* ── Plotter ───────────────────────────────────────────────── */
  /* IE.plot(mountElOrId, {
       xMin, xMax, yMin, yMax,           axis ranges
       xStep, yStep,                     gridline/tick spacing
       xLabel, yLabel,
       curves: [{ fn, className, discontinuityAt }],
       shade:  [{ from, to, fn, className }],   filled region under fn over [from,to]
       bars:   [{ x, y, width, className }],    histogram rectangles, x = bar centre
       points: [{ x, y, label, hollow, labelPos }],  labelPos: 'ne' (default) | 'nw' | 'se' | 'sw'
       markers: [{ x, y }],              dashed guide lines to an (x,y)
       width, height,
       ariaLabel                         screen-reader description (default built from axis labels)
     })
     Returns a redraw(newOpts) function so sliders can re-render cheaply. */
  IE.plot = function (mount, opts) {
    var el = typeof mount === 'string' ? document.getElementById(mount) : mount;
    if (!el) return function () {};
    var NS = 'http://www.w3.org/2000/svg';

    function draw(o) {
      var W = o.width  || 460;
      var H = o.height || 320;
      var PAD = { l: 44, r: 16, t: 16, b: 34 };
      var xMin = o.xMin, xMax = o.xMax, yMin = o.yMin, yMax = o.yMax;
      var pw = W - PAD.l - PAD.r;
      var ph = H - PAD.t - PAD.b;

      var sx = function (x) { return PAD.l + (x - xMin) / (xMax - xMin) * pw; };
      var sy = function (y) { return PAD.t + ph - (y - yMin) / (yMax - yMin) * ph; };

      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'ie-plot');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', o.ariaLabel ||
        ('Graph' + (o.yLabel ? ' of ' + o.yLabel : '') + (o.xLabel ? ' against ' + o.xLabel : '')));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', W);

      function add(tag, attrs, text) {
        var n = document.createElementNS(NS, tag);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        if (text != null) n.textContent = text;
        svg.appendChild(n);
        return n;
      }

      // Shaded regions — drawn first so gridlines and curves sit on top
      (o.shade || []).forEach(function (s) {
        var lo = Math.max(xMin, s.from), hi = Math.min(xMax, s.to);
        if (!(hi > lo)) return;
        var baseY = sy(Math.max(yMin, 0));
        var d = ['M ' + sx(lo).toFixed(2) + ' ' + baseY.toFixed(2)];
        var N = 120;
        for (var k = 0; k <= N; k++) {
          var x = lo + (hi - lo) * k / N;
          var y = s.fn(x);
          if (!isFinite(y)) continue;
          y = Math.max(yMin, Math.min(yMax, y));
          d.push('L ' + sx(x).toFixed(2) + ' ' + sy(y).toFixed(2));
        }
        d.push('L ' + sx(hi).toFixed(2) + ' ' + baseY.toFixed(2));
        d.push('Z');
        add('path', { class: s.className || 'plot-shade', d: d.join(' ') });
      });

      // Histogram bars
      (o.bars || []).forEach(function (b) {
        var bw = b.width != null ? b.width : (xMax - xMin) / 20;
        var x0 = sx(b.x - bw / 2), x1 = sx(b.x + bw / 2);
        var top = sy(Math.max(yMin, Math.min(yMax, b.y)));
        var base = sy(Math.max(yMin, 0));
        if (base <= top) return;
        add('rect', {
          class: b.className || 'plot-bar',
          x: Math.min(x0, x1), y: top,
          width: Math.abs(x1 - x0), height: base - top
        });
      });

      // Gridlines + ticks
      var xStep = o.xStep || niceStep(xMin, xMax);
      var yStep = o.yStep || niceStep(yMin, yMax);
      var i;
      for (i = Math.ceil(xMin / xStep) * xStep; i <= xMax + 1e-9; i += xStep) {
        add('line', { class: 'plot-grid', x1: sx(i), y1: PAD.t, x2: sx(i), y2: PAD.t + ph });
        add('text', { class: 'plot-tick', x: sx(i), y: PAD.t + ph + 16, 'text-anchor': 'middle' }, fmt(i));
      }
      for (i = Math.ceil(yMin / yStep) * yStep; i <= yMax + 1e-9; i += yStep) {
        add('line', { class: 'plot-grid', x1: PAD.l, y1: sy(i), x2: PAD.l + pw, y2: sy(i) });
        // The bottom label sits a little higher so it clears the first x-axis number
        add('text', { class: 'plot-tick', x: PAD.l - 7, y: sy(i) + (Math.abs(i - yMin) < 1e-9 ? 0 : 3.5), 'text-anchor': 'end' }, fmt(i));
      }

      // Axes (drawn at 0 when in range, else at the edge)
      var yAxisX = (xMin <= 0 && xMax >= 0) ? sx(0) : PAD.l;
      var xAxisY = (yMin <= 0 && yMax >= 0) ? sy(0) : PAD.t + ph;
      add('line', { class: 'plot-axis', x1: PAD.l, y1: xAxisY, x2: PAD.l + pw, y2: xAxisY });
      add('line', { class: 'plot-axis', x1: yAxisX, y1: PAD.t, x2: yAxisX, y2: PAD.t + ph });

      // Everything a label must not sit on, in screen coordinates
      var obstacleSegs = [];   // [x1, y1, x2, y2]
      var obstacleBoxes = [];  // { x0, y0, x1, y1 }
      obstacleSegs.push([PAD.l, xAxisY, PAD.l + pw, xAxisY], [yAxisX, PAD.t, yAxisX, PAD.t + ph]);

      // Curves
      (o.curves || []).forEach(function (c) {
        var segs = [], cur = [];
        var N = 360;
        var inBox = function (y) { return y >= yMin && y <= yMax; };
        var pt = function (x, y) { return sx(x).toFixed(2) + ',' + sy(y).toFixed(2); };
        var flush = function () { if (cur.length) { segs.push(cur); cur = []; } };
        // Where the curve crosses y = edge between x0 (inside) and x1 (outside)
        var crossing = function (x0, x1, edge) {
          var a = x0, b = x1;
          for (var it = 0; it < 30; it++) {
            var m = (a + b) / 2, ym = c.fn(m);
            if (isFinite(ym) && inBox(ym)) a = m; else b = m;
          }
          return pt(a, edge);
        };
        var px = null, py = null;
        for (var k = 0; k <= N; k++) {
          var x = xMin + (xMax - xMin) * k / N;
          var y = c.fn(x);
          if ((c.discontinuityAt != null && Math.abs(x - c.discontinuityAt) < (xMax - xMin) / N) || !isFinite(y)) {
            flush(); px = null;
            continue;
          }
          // Cut the curve where it leaves the frame rather than clamping it,
          // which would draw a flat line along the top or bottom edge
          if (px !== null) {
            var pin = inBox(py), qin = inBox(y);
            if (pin && !qin) {
              cur.push(crossing(px, x, y > yMax ? yMax : yMin));
              flush();
            } else if (!pin && qin) {
              cur.push(crossing(x, px, py > yMax ? yMax : yMin));
            }
          }
          if (inBox(y)) {
            if (px === null) flush();
            cur.push(pt(x, y));
          }
          px = x; py = y;
        }
        flush();
        segs.forEach(function (s) {
          if (s.length < 2) return;
          add('polyline', { class: c.className || 'plot-curve', points: s.join(' ') });
          for (var j = 1; j < s.length; j++) {
            var p0 = s[j - 1].split(','), p1 = s[j].split(',');
            obstacleSegs.push([+p0[0], +p0[1], +p1[0], +p1[1]]);
          }
        });
      });

      // Dashed guide lines
      (o.markers || []).forEach(function (m) {
        add('line', { class: 'plot-marker-line', x1: sx(m.x), y1: sy(m.y), x2: sx(m.x), y2: xAxisY });
        add('line', { class: 'plot-marker-line', x1: sx(m.x), y1: sy(m.y), x2: yAxisX, y2: sy(m.y) });
        obstacleSegs.push([sx(m.x), sy(m.y), sx(m.x), xAxisY], [sx(m.x), sy(m.y), yAxisX, sy(m.y)]);
      });

      // Points
      (o.points || []).forEach(function (p) {
        var r = p.hollow ? 4.5 : 4;
        add('circle', {
          class: p.hollow ? 'plot-point-hollow' : 'plot-point',
          cx: sx(p.x), cy: sy(p.y), r: r
        });
        obstacleBoxes.push({ x0: sx(p.x) - r - 1, y0: sy(p.y) - r - 1, x1: sx(p.x) + r + 1, y1: sy(p.y) + r + 1 });
      });

      /* Label placement: try each candidate spot in order and keep the first one that no
         curve, axis, guide line, point or earlier label runs through (else the least-crossed). */
      function segHitsBox(s, b) {
        var len = Math.max(Math.abs(s[2] - s[0]), Math.abs(s[3] - s[1]));
        var n = Math.max(1, Math.ceil(len));
        for (var q = 0; q <= n; q++) {
          var x = s[0] + (s[2] - s[0]) * q / n, y = s[1] + (s[3] - s[1]) * q / n;
          if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
        }
        return false;
      }
      function boxCost(b) {
        var cost = 0;
        if (b.x0 < 0 || b.x1 > W || b.y0 < 0 || b.y1 > H) cost += 1000;
        obstacleSegs.forEach(function (s) { if (segHitsBox(s, b)) cost++; });
        obstacleBoxes.forEach(function (o2) {
          if (b.x0 < o2.x1 && b.x1 > o2.x0 && b.y0 < o2.y1 && b.y1 > o2.y0) cost += 5;
        });
        return cost;
      }
      function placeLabel(cls, text, candidates) {
        var w = String(text).length * 6.6, best = null;   // 11px DM Mono ≈ 0.6em per glyph
        for (var ci = 0; ci < candidates.length; ci++) {
          var c = candidates[ci];
          var x0 = c.anchor === 'end' ? c.x - w : c.anchor === 'middle' ? c.x - w / 2 : c.x;
          var box = { x0: x0 - 1, y0: c.y - 9, x1: x0 + w + 1, y1: c.y + 2 };
          var cost = boxCost(box);
          if (!best || cost < best.cost) best = { c: c, box: box, cost: cost };
          if (cost === 0) break;
        }
        obstacleBoxes.push(best.box);
        add('text', { class: cls, x: best.c.x, y: best.c.y, 'text-anchor': best.c.anchor }, text);
      }

      (o.points || []).forEach(function (p) {
        if (!p.label) return;
        var px = sx(p.x), py = sy(p.y);
        // Rings of spots at growing distance, so a label can clear two lines crossing at the point
        var spots = function (d) {
          return {
            ne: { x: px + d,       y: py - d,       anchor: 'start' },
            nw: { x: px - d,       y: py - d,       anchor: 'end' },
            se: { x: px + d,       y: py + d + 8,   anchor: 'start' },
            sw: { x: px - d,       y: py + d + 8,   anchor: 'end' },
            e:  { x: px + d + 1,   y: py + 4,       anchor: 'start' },
            w:  { x: px - d - 1,   y: py + 4,       anchor: 'end' },
            n:  { x: px,           y: py - d - 2,   anchor: 'middle' },
            s:  { x: px,           y: py + d + 11,  anchor: 'middle' }
          };
        };
        var order = ['ne', 'nw', 'se', 'sw', 'e', 'w', 'n', 's'];
        if (p.labelPos) order.unshift(p.labelPos);
        var cands = [];
        [8, 14, 20, 28].forEach(function (d) {
          var ring = spots(d);
          order.forEach(function (k) { cands.push(ring[k]); });
        });
        placeLabel('plot-label', p.label, cands);
      });

      if (o.xLabel) {
        var xc = [{ x: PAD.l + pw, y: xAxisY - 8, anchor: 'end' }];
        if (xAxisY < PAD.t + ph - 16) xc.push({ x: PAD.l + pw, y: xAxisY + 14, anchor: 'end' });
        xc.push({ x: PAD.l + pw, y: PAD.t + ph + 29, anchor: 'end' });   // under the tick numbers
        for (var sl = 1; sl <= 8; sl++) xc.push({ x: PAD.l + pw - sl * pw / 10, y: xAxisY - 8, anchor: 'end' });
        placeLabel('plot-axis-label', o.xLabel, xc);
      }
      if (o.yLabel) {
        var yc = [{ x: yAxisX + 8, y: PAD.t + 10, anchor: 'start' }];
        if (yAxisX > PAD.l + 20) yc.push({ x: yAxisX - 8, y: PAD.t + 10, anchor: 'end' });
        for (var sd = 1; sd <= 8; sd++) yc.push({ x: yAxisX + 8, y: PAD.t + 10 + sd * ph / 10, anchor: 'start' });
        placeLabel('plot-axis-label', o.yLabel, yc);
      }

      el.innerHTML = '';
      el.appendChild(svg);
    }

    function niceStep(lo, hi) {
      var span = hi - lo;
      var raw  = span / 8;
      var mag  = Math.pow(10, Math.floor(Math.log10(raw)));
      var n    = raw / mag;
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
    }
    function fmt(v) {
      if (Math.abs(v) < 1e-9) return '0';
      if (Math.abs(v) >= 1000) return String(Math.round(v));
      return String(Math.round(v * 1000) / 1000);
    }

    draw(opts);
    return function redraw(next) { draw(Object.assign({}, opts, next)); };
  };

  /* ── Slider ────────────────────────────────────────────────── */
  /* IE.slider({ mount, label, min, max, step, value, format, onInput })
     Appends a .slider-row to `mount` and returns { get, set }. */
  IE.slider = function (cfg) {
    var host = typeof cfg.mount === 'string' ? document.getElementById(cfg.mount) : cfg.mount;
    if (!host) return { get: function () { return cfg.value; }, set: function () {} };

    var row = document.createElement('div');
    row.className = 'slider-row';
    var id = 'sl-' + Math.random().toString(36).slice(2, 8);
    var fmt = cfg.format || function (v) { return String(v); };

    row.innerHTML =
      '<label for="' + id + '">' + cfg.label + '</label>' +
      '<input type="range" id="' + id + '" min="' + cfg.min + '" max="' + cfg.max +
        '" step="' + (cfg.step || 1) + '" value="' + cfg.value + '">' +
      '<output for="' + id + '" aria-live="polite">' + fmt(cfg.value) + '</output>';
    host.appendChild(row);

    var input  = row.querySelector('input');
    var output = row.querySelector('output');
    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      output.textContent = fmt(v);
      if (cfg.onInput) cfg.onInput(v);
    });

    return {
      get: function () { return parseFloat(input.value); },
      set: function (v) { input.value = v; output.textContent = fmt(v); }
    };
  };

  /* ── TOC scroll-spy ────────────────────────────────────────── */
  IE.toc = function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc-link'));
    if (!links.length) return;
    var targets = links
      .map(function (a) {
        var id = a.getAttribute('href');
        return id && id.charAt(0) === '#' ? document.getElementById(id.slice(1)) : null;
      })
      .filter(Boolean);
    if (!targets.length) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('toc-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 });

    targets.forEach(function (t) { spy.observe(t); });
  };

  /* ── Manual completion banner ──────────────────────────────── */
  /* IE.completeBanner({ mount, topicId, lessonIdx, label, doneLabel }) */
  IE.completeBanner = function (cfg) {
    var btn = typeof cfg.mount === 'string' ? document.getElementById(cfg.mount) : cfg.mount;
    if (!btn) return;
    var label     = cfg.label     || 'Mark as complete';
    var doneLabel = cfg.doneLabel || '✓ Complete';

    function render(done) {
      btn.textContent = done ? doneLabel : label;
      btn.classList.toggle('done', done);
    }
    render(IE.isComplete(cfg.topicId, cfg.lessonIdx));

    btn.addEventListener('click', function () {
      var nowDone = !IE.isComplete(cfg.topicId, cfg.lessonIdx);
      if (nowDone) {
        IE.markComplete(cfg.topicId, cfg.lessonIdx);
      } else {
        try { localStorage.removeItem('ie_done_' + cfg.topicId + '_' + cfg.lessonIdx); } catch (e) {}
      }
      render(nowDone);
    });
  };

  /* ── Auto-init ─────────────────────────────────────────────── */
  // Hand-authored exercise rows: tie the label to its input, let Enter run
  // Check, and have feedback announced to screen readers.
  IE.enhanceExercises = function () {
    document.querySelectorAll('.exercise-row').forEach(function (row) {
      var input = row.querySelector('.exercise-input');
      var label = row.querySelector('label');
      var check = row.querySelector('.exercise-check-btn');
      if (input && label && !label.htmlFor && input.id) label.htmlFor = input.id;
      if (input && check) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); check.click(); }
        });
      }
    });
    document.querySelectorAll('.exercise-feedback').forEach(function (fb) {
      if (!fb.hasAttribute('aria-live')) fb.setAttribute('aria-live', 'polite');
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    IE.toc();
    IE.enhanceExercises();
  });
})();
