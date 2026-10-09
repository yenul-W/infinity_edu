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
  // pdf-viewer.js never answers 'ie-theme-request', so read localStorage
  // on load and then follow the parent's 'ie-theme' broadcasts.
  (function initTheme() {
    try {
      if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark-mode');
      }
    } catch (e) {}
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.type !== 'ie-theme') return;
      document.documentElement.classList.toggle('dark-mode', !!e.data.dark);
      try { localStorage.setItem('theme', e.data.dark ? 'dark' : 'light'); } catch (err) {}
    });
  })();

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

  /* ── Knowledge Check ───────────────────────────────────────── */
  /* QS: [{ q, opts:['A) …', …], correct:<0-idx>, explanation }]
     opts: { mount='kcQuestions', scoreMount='kcScore', topicId, lessonIdx } */
  IE.buildKC = function (QS, opts) {
    opts = opts || {};
    var container = document.getElementById(opts.mount || 'kcQuestions');
    var scoreEl   = document.getElementById(opts.scoreMount || 'kcScore');
    if (!container || !scoreEl) return;

    var answered = 0, score = 0;

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
          fb.innerHTML = (isCorrect ? '✓ ' : '✗ ') + qData.explanation;
          wrap.appendChild(fb);
          IE.tex(wrap);
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
      scoreEl.innerHTML =
        'Score: <strong>' + score + ' / ' + QS.length + '</strong>' +
        '<p class="kc-remark">' + remark + '</p>' +
        '<button class="kc-reset" id="kcResetBtn">Reset quiz</button>';
      scoreEl.classList.add('show');
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

  /* ── Plotter ───────────────────────────────────────────────── */
  /* IE.plot(mountElOrId, {
       xMin, xMax, yMin, yMax,           axis ranges
       xStep, yStep,                     gridline/tick spacing
       xLabel, yLabel,
       curves: [{ fn, className, discontinuityAt }],
       shade:  [{ from, to, fn, className }],   filled region under fn over [from,to]
       bars:   [{ x, y, width, className }],    histogram rectangles, x = bar centre
       points: [{ x, y, label, hollow }],
       markers: [{ x, y }],              dashed guide lines to an (x,y)
       width, height
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
        add('text', { class: 'plot-tick', x: sx(i), y: PAD.t + ph + 15, 'text-anchor': 'middle' }, fmt(i));
      }
      for (i = Math.ceil(yMin / yStep) * yStep; i <= yMax + 1e-9; i += yStep) {
        add('line', { class: 'plot-grid', x1: PAD.l, y1: sy(i), x2: PAD.l + pw, y2: sy(i) });
        add('text', { class: 'plot-tick', x: PAD.l - 7, y: sy(i) + 3.5, 'text-anchor': 'end' }, fmt(i));
      }

      // Axes (drawn at 0 when in range, else at the edge)
      var yAxisX = (xMin <= 0 && xMax >= 0) ? sx(0) : PAD.l;
      var xAxisY = (yMin <= 0 && yMax >= 0) ? sy(0) : PAD.t + ph;
      add('line', { class: 'plot-axis', x1: PAD.l, y1: xAxisY, x2: PAD.l + pw, y2: xAxisY });
      add('line', { class: 'plot-axis', x1: yAxisX, y1: PAD.t, x2: yAxisX, y2: PAD.t + ph });

      if (o.xLabel) add('text', { class: 'plot-axis-label', x: PAD.l + pw, y: xAxisY - 8, 'text-anchor': 'end' }, o.xLabel);
      if (o.yLabel) add('text', { class: 'plot-axis-label', x: yAxisX + 8, y: PAD.t + 10 }, o.yLabel);

      // Curves
      (o.curves || []).forEach(function (c) {
        var segs = [], cur = [];
        var N = 360;
        for (var k = 0; k <= N; k++) {
          var x = xMin + (xMax - xMin) * k / N;
          if (c.discontinuityAt != null && Math.abs(x - c.discontinuityAt) < (xMax - xMin) / N) {
            if (cur.length) { segs.push(cur); cur = []; }
            continue;
          }
          var y = c.fn(x);
          if (!isFinite(y) || y < yMin - (yMax - yMin) || y > yMax + (yMax - yMin)) {
            if (cur.length) { segs.push(cur); cur = []; }
            continue;
          }
          // Clamp to the visible box so a steep curve does not escape the frame
          var cy = Math.max(yMin, Math.min(yMax, y));
          cur.push(sx(x).toFixed(2) + ',' + sy(cy).toFixed(2));
        }
        if (cur.length) segs.push(cur);
        segs.forEach(function (s) {
          if (s.length < 2) return;
          add('polyline', { class: c.className || 'plot-curve', points: s.join(' ') });
        });
      });

      // Dashed guide lines
      (o.markers || []).forEach(function (m) {
        add('line', { class: 'plot-marker-line', x1: sx(m.x), y1: sy(m.y), x2: sx(m.x), y2: xAxisY });
        add('line', { class: 'plot-marker-line', x1: sx(m.x), y1: sy(m.y), x2: yAxisX, y2: sy(m.y) });
      });

      // Points
      (o.points || []).forEach(function (p) {
        add('circle', {
          class: p.hollow ? 'plot-point-hollow' : 'plot-point',
          cx: sx(p.x), cy: sy(p.y), r: p.hollow ? 4.5 : 4
        });
        if (p.label) {
          add('text', { class: 'plot-label', x: sx(p.x) + 8, y: sy(p.y) - 8 }, p.label);
        }
      });

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
      '<output for="' + id + '">' + fmt(cfg.value) + '</output>';
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
  document.addEventListener('DOMContentLoaded', function () {
    IE.toc();
  });
})();
