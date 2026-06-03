/* pdf-viewer.js — Sociotype custom PDF viewer
 * Requires PDF.js loaded before this script (sets global pdfjsLib).
 * Call initPdfViewer({ topicId, lessons }) from each lesson page.
 */

(function () {
  'use strict';

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const ZOOM_STEP = 0.25;
  const ZOOM_MIN  = 0.5;
  const ZOOM_MAX  = 3.0;

  function initPdfViewer({ topicId, lessons }) {
    // ── DOM refs ─────────────────────────────────────────────────
    const lessonsList    = document.getElementById('lessonsList');
    const downloadBtn    = document.getElementById('downloadBtn');
    const openExternalBtn = document.getElementById('openExternalBtn');
    const printBtn       = document.getElementById('printSyllabusBtn');
    const prevBtn        = document.getElementById('prevPage');
    const nextBtn        = document.getElementById('nextPage');
    const pageInfo       = document.getElementById('pageInfo');
    const zoomInBtn      = document.getElementById('zoomIn');
    const zoomOutBtn     = document.getElementById('zoomOut');
    const zoomDisplay    = document.getElementById('zoomDisplay');
    const pageControls   = document.getElementById('pageControls');
    const zoomControls   = document.getElementById('zoomControls');
    const pdfStage       = document.getElementById('pdfStage');
    const pdfLoading     = document.getElementById('pdfLoading');
    const canvasWrapper  = document.getElementById('pdfCanvasWrapper');
    const canvas         = document.getElementById('pdfCanvas');
    const htmlFrame      = document.getElementById('pdfHtmlFrame');

    // ── State ────────────────────────────────────────────────────
    let pdfDoc           = null;
    let currentPage      = 1;
    let totalPages       = 0;
    let scale            = 1;
    let fitScale         = 1;
    let rendering        = false;
    let currentFile      = '';
    let currentVariant   = 'slides';
    let currentIndex     = 0;
    let currentKind      = 'pdf';

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
        if (!l.homework && l.syllabus && l.syllabus.length > 0) {
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
            <span class="lesson-group-num">${lesson.homework ? 'Homework' : 'Lesson ' + lesson.num}</span>
            <span class="lesson-kind-badge">${(lesson.kind || 'pdf').toUpperCase()}</span>
          </div>`;

        if (!lesson.homework) {
          inner += `<div class="lesson-group-title">${lesson.title}</div>`;
        }
        inner += syllabusHtml;
        if (!lesson.homework) {
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
            setDone(index, !isDone(index));
            updateCompletionUI(index);
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

    // ── PDF rendering ────────────────────────────────────────────
    function calcFitScale() {
      if (!pdfDoc) return Promise.resolve(1);
      const st = window.getComputedStyle(pdfStage);
      const contentW = pdfStage.clientWidth
        - parseFloat(st.paddingLeft)
        - parseFloat(st.paddingRight);
      const stageW = contentW > 0 ? contentW : 600;
      return pdfDoc.getPage(1).then(page => {
        const vp = page.getViewport({ scale: 1 });
        return Math.min(stageW / vp.width, 2.0);
      });
    }

    async function renderPage(num) {
      if (rendering || !pdfDoc) return;
      rendering = true;
      pdfLoading.style.display = 'flex';
      canvasWrapper.style.display = 'none';

      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale });
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport
      }).promise;

      pdfLoading.style.display = 'none';
      canvasWrapper.style.display = 'block';
      rendering = false;
      updateControls();
    }

    function updateControls() {
      pageInfo.textContent = `${currentPage} / ${totalPages}`;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
      zoomDisplay.textContent = Math.round(scale / fitScale * 100) + '%';
    }

    async function loadPdf(url) {
      pdfLoading.style.display = 'flex';
      canvasWrapper.style.display = 'none';

      pdfDoc = await pdfjsLib.getDocument(url).promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;

      fitScale = await calcFitScale();
      scale = fitScale;

      await renderPage(currentPage);
    }

    // ── Mode switching (pdf vs html) ─────────────────────────────
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
      currentIndex  = idx;
      currentVariant = variant;
      currentKind   = lesson.kind || 'pdf';

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

    // ── Event listeners ──────────────────────────────────────────
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(currentPage); }
    });
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPage(currentPage); }
    });

    zoomInBtn.addEventListener('click', () => {
      scale = Math.min(scale + fitScale * ZOOM_STEP, fitScale * ZOOM_MAX);
      renderPage(currentPage);
    });
    zoomOutBtn.addEventListener('click', () => {
      scale = Math.max(scale - fitScale * ZOOM_STEP, fitScale * ZOOM_MIN);
      renderPage(currentPage);
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
        renderPage(currentPage);
      }, 200);
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (currentKind !== 'pdf') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentPage < totalPages) { currentPage++; renderPage(currentPage); }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentPage > 1) { currentPage--; renderPage(currentPage); }
      }
    });

    // ── Init ─────────────────────────────────────────────────────
    buildSidebar();
    loadLesson(0, 'slides');
  }

  window.initPdfViewer = initPdfViewer;
})();
