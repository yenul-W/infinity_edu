/* pdf-viewer.js — Sociotype custom PDF viewer (scrolling mode)
 * Requires PDF.js loaded before this script (sets global pdfjsLib).
 * Call initPdfViewer({ topicId, lessons }) from each lesson page.
 */

(function () {
  'use strict';

  // pdfjsLib comes from a CDN script — it may be missing if the network is down.
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // ── 3. Confetti burst (achromatic — white on dark, black on light) ──
  function fireConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const dark = document.documentElement.classList.contains('dark-mode');
    const palette = dark ? ['#fff','#ccc','#aaa','#777'] : ['#111','#333','#555','#888'];
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 4 + 2,
      w: Math.random() * 5 + 2,
      h: Math.random() * 9 + 3,
      color: palette[Math.floor(Math.random() * palette.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.18,
    }));
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let live = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.rot += p.rotV;
        if (p.y < canvas.height + 20) live = true;
        const alpha = Math.max(0, 1 - p.y / canvas.height * 1.1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (live) requestAnimationFrame(tick);
      else canvas.remove();
    }
    tick();
  }

  const ZOOM_STEP = 0.25;
  const ZOOM_MIN  = 0.5;
  const ZOOM_MAX  = 3.0;

  function initPdfViewer({ topicId, lessons }) {
    // ── DOM refs ─────────────────────────────────────────────────
    const lessonsList     = document.getElementById('lessonsList');

    const downloadBtn     = document.getElementById('downloadBtn');
    const openExternalBtn = document.getElementById('openExternalBtn');
    const printBtn        = document.getElementById('printSyllabusBtn');
    const prevBtn         = document.getElementById('prevPage');
    const nextBtn         = document.getElementById('nextPage');
    const pageInfo        = document.getElementById('pageInfo');
    const pageTotal       = document.getElementById('pageTotal');
    const zoomInBtn       = document.getElementById('zoomIn');
    const zoomOutBtn      = document.getElementById('zoomOut');
    const zoomDisplay     = document.getElementById('zoomDisplay');
    const pageControls    = document.getElementById('pageControls');
    const zoomControls    = document.getElementById('zoomControls');
    const pdfStage        = document.getElementById('pdfStage');
    const pdfLoading      = document.getElementById('pdfLoading');
    const canvasWrapper   = document.getElementById('pdfCanvasWrapper');
    const htmlFrame       = document.getElementById('pdfHtmlFrame');

    // ── Load-error state ─────────────────────────────────────────
    const pdfError = document.createElement('div');
    pdfError.className = 'pdf-error';
    pdfError.style.display = 'none';
    pdfError.innerHTML =
      '<p class="pdf-error-msg">Couldn’t load this lesson. Check your connection and try again.</p>' +
      '<button class="pdf-error-retry">Retry</button>';
    pdfStage.insertBefore(pdfError, canvasWrapper);
    pdfError.querySelector('.pdf-error-retry').addEventListener('click', () => {
      if (currentKind === 'pdf' && currentFile) loadPdf(currentFile);
    });

    // ── 2. Scroll progress bar ──────────────────────────────────
    const scrollBar = document.createElement('div');
    scrollBar.className = 'pdf-scroll-progress';
    pdfStage.parentElement.insertBefore(scrollBar, pdfStage);
    pdfStage.addEventListener('scroll', () => {
      const max = pdfStage.scrollHeight - pdfStage.clientHeight;
      scrollBar.style.width = (max > 0 ? Math.min(1, pdfStage.scrollTop / max) : 0) * 100 + '%';
    });

    // ── Annotation toolbar (created once, appended to body) ─────
    const annotationToolbar = document.createElement('div');
    annotationToolbar.className = 'annotation-toolbar';
    annotationToolbar.innerHTML =
      '<button class="annotation-btn" id="annotationHighlightBtn">&#9998; Highlight</button>' +
      '<button class="annotation-btn" id="annotationClearBtn">Clear all</button>';
    document.body.appendChild(annotationToolbar);
    const highlightBtn = document.getElementById('annotationHighlightBtn');
    const clearBtn     = document.getElementById('annotationClearBtn');
    let pendingLayer   = null; // textLayer div where the active selection lives

    // ── Highlight persistence ────────────────────────────────────
    function hlKey() { return `ie_hl_${topicId}_${currentIndex}`; }
    function getHighlights() {
      try { return JSON.parse(localStorage.getItem(hlKey()) || '[]'); } catch { return []; }
    }
    function saveHighlightEntry(pageNum, indices) {
      const hl = getHighlights();
      hl.push({ page: pageNum, indices });
      localStorage.setItem(hlKey(), JSON.stringify(hl));
    }
    function clearHighlights() {
      localStorage.removeItem(hlKey());
      canvasWrapper.querySelectorAll('.span-highlight').forEach(s => s.classList.remove('span-highlight'));
    }
    function applyHighlights(pageNum, textDiv) {
      const entries = getHighlights().filter(h => h.page === pageNum);
      if (!entries.length) return;
      const spans = textDiv.querySelectorAll('span');
      entries.forEach(h => h.indices.forEach(i => { if (spans[i]) spans[i].classList.add('span-highlight'); }));
    }

    // ── Annotation toolbar interaction ───────────────────────────
    highlightBtn.addEventListener('click', () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !pendingLayer) return;
      const pageNum = parseInt(pendingLayer.dataset.page);
      const spans = [...pendingLayer.querySelectorAll('span')];
      const selected = spans.reduce((acc, sp, i) => {
        if (sel.containsNode(sp, true)) { sp.classList.add('span-highlight'); acc.push(i); }
        return acc;
      }, []);
      if (selected.length) saveHighlightEntry(pageNum, selected);
      sel.removeAllRanges();
      annotationToolbar.style.display = 'none';
      pendingLayer = null;
    });
    clearBtn.addEventListener('click', () => {
      clearHighlights();
      annotationToolbar.style.display = 'none';
      pendingLayer = null;
    });
    // Hide toolbar when clicking elsewhere
    document.addEventListener('mousedown', e => {
      if (!annotationToolbar.contains(e.target)) annotationToolbar.style.display = 'none';
    });

    // ── State ────────────────────────────────────────────────────
    let pdfDoc        = null;
    let currentPage   = 1;
    let totalPages    = 0;
    let scale         = 1;
    let fitScale      = 1;
    let currentFile   = '';
    let currentVariant = 'slides';
    let currentIndex  = 0;
    let currentKind   = 'pdf';
    let loadGen       = 0;       // stale-load guard
    let pageObserver  = null;
    let pageCanvases  = [];      // one canvas per page
    let renderObserver = null;   // lazily renders pages as they near the viewport
    let pageRenderedScale = [];  // scale each page was last rendered at (0 = not rendered)
    let visibleForRender = new Set(); // page numbers currently in the render observer's range
    let renderQueue = Promise.resolve(); // serialises canvas renders
    let basePageW = 0, basePageH = 0;    // page-1 size at scale 1, for placeholder sizing

    // ── Completion ───────────────────────────────────────────────
    function isDone(idx) {
      return localStorage.getItem(`ie_done_${topicId}_${idx}`) === '1';
    }
    function setDone(idx, done) {
      if (done) localStorage.setItem(`ie_done_${topicId}_${idx}`, '1');
      else localStorage.removeItem(`ie_done_${topicId}_${idx}`);
    }
    function updateCompletionUI(idx) {
      const group = lessonsList.querySelectorAll('.lesson-group')[idx];
      if (!group) return;
      const done = isDone(idx);
      group.classList.toggle('lesson-group--done', done);
      const btn = group.querySelector('.complete-btn');
      if (btn) {
        btn.textContent = done ? '✓ Done' : 'Mark Complete';
        btn.classList.toggle('complete-btn--done', done);
      }
    }

    // ── Print syllabus ───────────────────────────────────────────
    function printSyllabus() {
      const existing = document.querySelector('.print-syllabus-sheet');
      if (existing) existing.remove();
      const topicTitle = document.querySelector('.topic-page-title')
        .textContent.replace(/\s+/g, ' ').trim();
      const sheet = document.createElement('div');
      sheet.className = 'print-syllabus-sheet';
      let markup = `<h1>${topicTitle}</h1><p class="print-subtitle">Year 11 Mathematics Standard — NSW Curriculum</p>`;
      lessons.forEach(l => {
        if (!l.homework && !l.revision && l.syllabus && l.syllabus.length > 0) {
          markup += `<h2>Lesson ${l.num}: ${l.title}</h2><ul>${l.syllabus.map(d => `<li>${d}</li>`).join('')}</ul>`;
        }
      });
      sheet.innerHTML = markup;
      document.body.appendChild(sheet);
      window.print();
    }

    // ── Sidebar ──────────────────────────────────────────────────
    function buildSidebar() {
      lessons.forEach((lesson, index) => {
        const group = document.createElement('div');
        group.className = 'lesson-group' + (index === 0 ? ' active' : '');
        group.dataset.index = index;

        const syllabusHtml = lesson.syllabus && lesson.syllabus.length > 0
          ? `<div class="lesson-syllabus-dots"><ul>${lesson.syllabus.map(d => `<li>${d}</li>`).join('')}</ul></div>`
          : '';

        let inner = `
          <div class="lesson-group-header">
            <span class="lesson-group-num">${lesson.homework ? 'Homework' : lesson.revision ? 'Revision' : 'Lesson ' + lesson.num}</span>
            <span class="lesson-kind-badge">${lesson.kind === 'html' ? 'INTERACTIVE' : (lesson.kind || 'pdf').toUpperCase()}</span>
          </div>`;

        if (!lesson.homework && !lesson.revision) {
          inner += `<div class="lesson-group-title">${lesson.title}</div>`;
        }
        inner += syllabusHtml;
        if (!lesson.homework && !lesson.revision) {
          inner += `<button class="complete-btn pdf-btn" data-index="${index}">Mark Complete</button>`;
        }
        if (lesson.annotated) {
          inner += `
            <div class="lesson-variants">
              <button class="variant-btn active" data-lesson="${index}" data-variant="slides">Slides</button>
              <button class="variant-btn" data-lesson="${index}" data-variant="annotated">Annotated</button>
            </div>`;
        }

        group.innerHTML = inner;

        const cBtn = group.querySelector('.complete-btn');
        if (cBtn) {
          cBtn.addEventListener('click', e => {
            e.stopPropagation();
            const wasDone = isDone(index);
            setDone(index, !wasDone);
            updateCompletionUI(index);
            // 3. Fire confetti when the last lesson is marked complete
            if (!wasDone) {
              const completable = [...lessonsList.querySelectorAll('.lesson-group')].filter(g => g.querySelector('.complete-btn'));
              if (completable.every(g => g.classList.contains('lesson-group--done'))) {
                fireConfetti();
              }
            }
          });
          updateCompletionUI(index);
        }

        group.addEventListener('click', () => {
          const variant = currentIndex === index ? currentVariant : 'slides';
          loadLesson(index, variant);
        });

        if (lesson.annotated) {
          group.querySelectorAll('.variant-btn').forEach(btn => {
            btn.addEventListener('click', e => {
              e.stopPropagation();
              loadLesson(parseInt(btn.dataset.lesson), btn.dataset.variant);
            });
          });
        }

        lessonsList.appendChild(group);
      });
    }

    function updateSidebarActive(idx, variant) {
      lessonsList.querySelectorAll('.lesson-group').forEach((g, i) => {
        g.classList.toggle('active', i === idx);
      });
      const active = lessonsList.querySelectorAll('.lesson-group')[idx];
      if (active) {
        active.querySelectorAll('.variant-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.variant === variant);
        });
      }
    }

    // ── Scale helpers ────────────────────────────────────────────
    function calcFitScale() {
      if (!pdfDoc) return Promise.resolve(1);
      const st = window.getComputedStyle(pdfStage);
      const contentW = pdfStage.clientWidth
        - parseFloat(st.paddingLeft)
        - parseFloat(st.paddingRight);
      const stageW = contentW > 0 ? contentW : 600;
      return pdfDoc.getPage(1).then(page => {
        const vp = page.getViewport({ scale: 1 });
        basePageW = vp.width;
        basePageH = vp.height;
        return Math.min(stageW / vp.width, 2.0);
      });
    }

    function updateZoomDisplay() {
      zoomDisplay.textContent = Math.round(scale / fitScale * 100) + '%';
    }

    function updatePageInfo() {
      pageInfo.value = String(currentPage);
      pageTotal.textContent = '/ ' + totalPages;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
    }

    // ── Per-page rendering ───────────────────────────────────────
    async function renderPageToCanvas(num) {
      const cv = pageCanvases[num - 1];
      if (!cv || !pdfDoc) return;
      const gen = loadGen;
      const renderScale = scale;
      const page = await pdfDoc.getPage(num);
      if (gen !== loadGen) return;
      const viewport = page.getViewport({ scale: renderScale });
      cv.width  = viewport.width;
      cv.height = viewport.height;
      await page.render({ canvasContext: cv.getContext('2d'), viewport }).promise;
      if (gen !== loadGen) return;
      pageRenderedScale[num - 1] = renderScale;

      const wrap = canvasWrapper.querySelector(`.pdf-page[data-page="${num}"]`);
      if (wrap) {
        wrap.style.minWidth = '';
        wrap.style.minHeight = '';
      }

      // Render selectable text layer for annotation
      const textDiv = wrap ? wrap.querySelector('.textLayer') : null;
      if (textDiv) {
        textDiv.innerHTML = '';
        textDiv.style.width  = viewport.width  + 'px';
        textDiv.style.height = viewport.height + 'px';
        try {
          const textContent = await page.getTextContent();
          const task = pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textDiv,
            viewport,
            textDivs: [],
          });
          if (task && task.promise) await task.promise;
          applyHighlights(num, textDiv);
        } catch (e) { /* text layer not critical */ }
      }
    }

    // Build one .pdf-page div + canvas + textLayer per page
    function buildPageDivs() {
      canvasWrapper.innerHTML = '';
      pageCanvases = [];
      for (let i = 1; i <= totalPages; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'pdf-page';
        wrap.dataset.page = i;
        const cv = document.createElement('canvas');
        wrap.appendChild(cv);
        const tl = document.createElement('div');
        tl.className = 'textLayer';
        tl.dataset.page = i;
        wrap.appendChild(tl);
        canvasWrapper.appendChild(wrap);
        pageCanvases.push(cv);
      }
    }

    // Size unrendered page placeholders so the scrollbar is correct
    function sizePlaceholders() {
      canvasWrapper.querySelectorAll('.pdf-page').forEach((wrap, i) => {
        if (pageRenderedScale[i] === scale) return;
        wrap.style.minWidth  = Math.floor(basePageW * scale) + 'px';
        wrap.style.minHeight = Math.floor(basePageH * scale) + 'px';
      });
    }

    // All canvas renders go through one queue: avoids concurrent renders
    // on the same canvas, and collapses requests already satisfied at the
    // current scale by the time they reach the front.
    function queueRender(num) {
      const gen = loadGen;
      renderQueue = renderQueue
        .then(() => {
          if (gen !== loadGen) return;
          if (pageRenderedScale[num - 1] === scale) return;
          return renderPageToCanvas(num);
        })
        .catch(() => { /* a failed page render shouldn't stall the queue */ });
      return renderQueue;
    }

    // Renders pages lazily as they approach the viewport
    function setupRenderObserver() {
      if (renderObserver) renderObserver.disconnect();
      visibleForRender = new Set();
      renderObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const num = parseInt(entry.target.dataset.page);
          if (entry.isIntersecting) {
            visibleForRender.add(num);
            queueRender(num);
          } else {
            visibleForRender.delete(num);
          }
        });
      }, { root: pdfStage, rootMargin: '150% 0px' });
      canvasWrapper.querySelectorAll('.pdf-page').forEach(el => renderObserver.observe(el));
    }

    // Re-render at the current scale (used after zoom/resize). Only pages
    // near the viewport render now; the rest re-render when scrolled to.
    function rerenderAll(gen) {
      updateZoomDisplay();
      if (gen !== loadGen) return;
      pageRenderedScale.fill(0);
      sizePlaceholders();
      visibleForRender.forEach(num => queueRender(num));
    }

    // ── IntersectionObserver — track visible page ────────────────
    function setupPageObserver() {
      if (pageObserver) pageObserver.disconnect();
      const thresholds = Array.from({ length: 11 }, (_, i) => i * 0.1);
      pageObserver = new IntersectionObserver(entries => {
        let best = 0, bestPage = currentPage;
        entries.forEach(entry => {
          if (entry.intersectionRatio > best) {
            best = entry.intersectionRatio;
            bestPage = parseInt(entry.target.dataset.page);
          }
        });
        if (best > 0) {
          currentPage = bestPage;
          updatePageInfo();
        }
      }, { root: pdfStage, threshold: thresholds });

      canvasWrapper.querySelectorAll('.pdf-page').forEach(el => pageObserver.observe(el));
    }

    // ── Scroll to page ───────────────────────────────────────────
    function scrollToPage(num, smooth = true) {
      const el = canvasWrapper.querySelector(`.pdf-page[data-page="${num}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
    }

    // ── Load PDF ─────────────────────────────────────────────────
    async function loadPdf(url) {
      const gen = ++loadGen;

      pdfError.style.display = 'none';
      pdfLoading.style.display = 'flex';
      pageInfo.disabled = true;
      pageInfo.value = '';
      pageTotal.textContent = '/ —';
      canvasWrapper.style.display = 'none';
      canvasWrapper.innerHTML = '';
      pageCanvases = [];
      pageRenderedScale = [];
      if (pageObserver) { pageObserver.disconnect(); pageObserver = null; }
      if (renderObserver) { renderObserver.disconnect(); renderObserver = null; }
      visibleForRender = new Set();

      try {
        if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js failed to load');

        const doc = await pdfjsLib.getDocument(url).promise;
        if (gen !== loadGen) return;

        pdfDoc = doc;
        totalPages = pdfDoc.numPages;
        currentPage = 1;
        pageRenderedScale = new Array(totalPages).fill(0);

        fitScale = await calcFitScale();
        if (gen !== loadGen) return;
        scale = fitScale;

        buildPageDivs();
        sizePlaceholders();

        // Render first page before revealing
        await renderPageToCanvas(1);
        if (gen !== loadGen) return;

        pdfLoading.style.display = 'none';
        pageInfo.disabled = false;
        canvasWrapper.style.display = '';
        setupPageObserver();
        setupRenderObserver(); // remaining pages render lazily on scroll
        updatePageInfo();
        updateZoomDisplay();
        pdfStage.scrollTop = 0;
      } catch (err) {
        if (gen !== loadGen) return;
        pdfLoading.style.display = 'none';
        pdfError.style.display = 'flex';
      }
    }

    // ── Mode switching ───────────────────────────────────────────
    function showPdfMode() {
      pageControls.style.display = '';
      zoomControls.style.display = '';
      pdfStage.style.padding = '';
      htmlFrame.style.display = 'none';
      htmlFrame.src = 'about:blank';
    }

    function showHtmlMode(url) {
      pageControls.style.display = 'none';
      zoomControls.style.display = 'none';
      pdfLoading.style.display = 'none';
      pdfError.style.display = 'none';
      canvasWrapper.style.display = 'none';
      pdfStage.style.padding = '0';
      htmlFrame.style.display = 'block';
      htmlFrame.style.width = '100%';
      htmlFrame.style.minHeight = 'calc(100vh - 180px)';
      htmlFrame.src = url;
    }

    // ── Load lesson ───────────────────────────────────────────────
    async function loadLesson(idx, variant) {
      const lesson = lessons[idx];
      currentIndex   = idx;
      currentVariant = variant;
      currentKind    = lesson.kind || 'pdf';

      // 5. Track recently viewed
      const displayTitle = lesson.title || (lesson.homework ? 'Homework' : lesson.revision ? 'Revision' : `Lesson ${lesson.num}`);
      localStorage.setItem(`ie_last_${topicId}`, JSON.stringify({ idx, title: displayTitle }));

      scrollBar.style.width = '0%';
      annotationToolbar.style.display = 'none';
      pendingLayer = null;

      const file = (variant === 'annotated' && lesson.annotated)
        ? lesson.annotated
        : (lesson.slides || lesson.file);

      currentFile = file;
      updateSidebarActive(idx, variant);
      openExternalBtn.href = file;

      if (currentKind === 'html') {
        downloadBtn.style.display = 'none';
        showHtmlMode(file);
        return;
      }

      downloadBtn.style.display = '';
      showPdfMode();
      await loadPdf(file);
    }

    // ── Download ─────────────────────────────────────────────────
    function downloadCurrent() {
      if (!currentFile) return;
      const a = document.createElement('a');
      a.href = currentFile;
      a.download = decodeURIComponent(currentFile.split('/').pop());
      a.click();
    }

    // ── Selection → annotation toolbar ──────────────────────────
    pdfStage.addEventListener('mouseup', () => {
      if (currentKind !== 'pdf') return;
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          annotationToolbar.style.display = 'none';
          return;
        }
        const range = sel.getRangeAt(0);
        const node  = range.startContainer;
        const layer = (node.nodeType === 1 ? node : node.parentElement)?.closest('.textLayer');
        if (!layer) { annotationToolbar.style.display = 'none'; return; }
        pendingLayer = layer;
        const rect = range.getBoundingClientRect();
        annotationToolbar.style.display = 'flex';
        // Position after layout so offsetWidth is accurate
        requestAnimationFrame(() => {
          const tw = annotationToolbar.offsetWidth;
          const mid = rect.left + rect.width / 2;
          annotationToolbar.style.left = Math.max(4, mid - tw / 2) + 'px';
          annotationToolbar.style.top  = (rect.bottom + 8) + 'px';
        });
      }, 10);
    });

    // ── Event listeners ──────────────────────────────────────────
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) scrollToPage(currentPage - 1);
    });
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) scrollToPage(currentPage + 1);
    });

    pageInfo.addEventListener('focus', () => { pageInfo.select(); });
    pageInfo.addEventListener('blur', () => { pageInfo.value = String(currentPage); });
    pageInfo.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const n = parseInt(pageInfo.value, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
          currentPage = n;
          updatePageInfo();
          scrollToPage(n, false);
        } else {
          pageInfo.value = String(currentPage);
        }
        pageInfo.blur();
      } else if (e.key === 'Escape') {
        pageInfo.value = String(currentPage);
        pageInfo.blur();
      }
    });

    zoomInBtn.addEventListener('click', async () => {
      if (currentKind !== 'pdf') return;
      scale = Math.min(scale + fitScale * ZOOM_STEP, fitScale * ZOOM_MAX);
      const gen = loadGen;
      await rerenderAll(gen);
    });
    zoomOutBtn.addEventListener('click', async () => {
      if (currentKind !== 'pdf') return;
      scale = Math.max(scale - fitScale * ZOOM_STEP, fitScale * ZOOM_MIN);
      const gen = loadGen;
      await rerenderAll(gen);
    });

    downloadBtn.addEventListener('click', downloadCurrent);
    printBtn.addEventListener('click', printSyllabus);

    // Recalculate fit scale on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(async () => {
        if (currentKind !== 'pdf' || !pdfDoc) return;
        const newFit = await calcFitScale();
        const ratio = scale / fitScale;
        fitScale = newFit;
        scale = fitScale * ratio;
        const gen = loadGen;
        await rerenderAll(gen);
      }, 200);
    });

    // Keyboard navigation + shortcuts (2. j/k lessons, +/- zoom, d dark mode)
    document.addEventListener('keydown', e => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey) return;

      if (e.key === 'd') {
        const nowDark = document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('theme', nowDark ? 'dark' : 'light');
        const ti = document.querySelector('.toggle-icon');
        if (ti) ti.textContent = nowDark ? 'light' : 'dark';
        return;
      }
      if (e.key === 'j') {
        e.preventDefault();
        if (currentIndex < lessons.length - 1) loadLesson(currentIndex + 1, 'slides');
        return;
      }
      if (e.key === 'k') {
        e.preventDefault();
        if (currentIndex > 0) loadLesson(currentIndex - 1, 'slides');
        return;
      }

      if (currentKind !== 'pdf') return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        scale = Math.min(scale + fitScale * ZOOM_STEP, fitScale * ZOOM_MAX);
        rerenderAll(loadGen);
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        scale = Math.max(scale - fitScale * ZOOM_STEP, fitScale * ZOOM_MIN);
        rerenderAll(loadGen);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentPage < totalPages) scrollToPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentPage > 1) scrollToPage(currentPage - 1);
      }
    });

    // ── Init ─────────────────────────────────────────────────────
    buildSidebar();
    loadLesson(0, 'slides');
  }

  window.initPdfViewer = initPdfViewer;
})();
