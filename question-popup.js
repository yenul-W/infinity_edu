/**
 * question-popup.js — self-contained Ask a Question popup
 *
 * SETUP: Set GAS_URL to your deployed Google Apps Script web app URL.
 * Apps Script deployment: Execute as Me, Who has access: Anyone.
 * See README / setup comments in index.html for the full Apps Script code.
 */

(function () {
  if (document.getElementById('qpop-root')) return; // guard double-injection

  /* ─── CONFIG ──────────────────────────────────────────────────── */
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbxTl03nJFeM3ZfHVA3vNkUIuJguVdhWReBnVjLkOqrHnf4K0DwQbpaWL7SbhXTpT2t1ig/exec';

  /* ─── INJECT CSS ──────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.id = 'qpop-styles';
  style.textContent = [
    /* Trigger button */
    '.qpop-trigger{',
      'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9000;',
      'display:flex;align-items:center;gap:0.5rem;',
      'padding:0.6rem 1rem;',
      'background:#000;color:#fff;',
      'border:none;border-radius:0;',
      'cursor:pointer;',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.78rem;font-weight:600;letter-spacing:0.04em;',
      'transition:background 0.15s;white-space:nowrap;',
    '}',
    '.qpop-trigger:hover{background:#1a1a1a;}',
    'html.dark-mode .qpop-trigger{background:#e8e8e8;color:#000;}',
    'html.dark-mode .qpop-trigger:hover{background:#fff;}',

    /* Panel */
    '.qpop-panel{',
      'position:fixed;bottom:4.5rem;right:1.5rem;z-index:9001;',
      'width:380px;max-width:calc(100vw - 3rem);',
      'background:#fff;color:#000;',
      'border:1px solid #000;border-radius:0;',
      'display:flex;flex-direction:column;',
      'max-height:calc(100vh - 8rem);overflow:hidden;',
      'transform:translateY(12px);opacity:0;pointer-events:none;',
      'transition:transform 0.22s cubic-bezier(0.16,1,0.3,1),opacity 0.18s ease;',
    '}',
    'html.dark-mode .qpop-panel{background:#0d0d0d;color:#f0f0f5;border-color:rgba(255,255,255,0.65);}',
    '.qpop-panel.qpop-panel--open{transform:translateY(0);opacity:1;pointer-events:all;}',

    /* Header */
    '.qpop-header{',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:0.75rem 1rem;',
      'border-bottom:1px solid rgba(0,0,0,0.15);flex-shrink:0;',
    '}',
    'html.dark-mode .qpop-header{border-bottom-color:rgba(255,255,255,0.12);}',

    /* Tabs */
    '.qpop-tabs{display:flex;gap:1.25rem;}',
    '.qpop-tab{',
      'background:transparent;border:none;border-bottom:1px solid transparent;border-radius:0;',
      'padding:0.1rem 0;cursor:pointer;',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.78rem;font-weight:600;letter-spacing:0.04em;',
      'color:rgba(0,0,0,0.38);',
      'transition:color 0.15s,border-color 0.15s;',
    '}',
    'html.dark-mode .qpop-tab{color:rgba(240,240,245,0.38);}',
    '.qpop-tab--active{color:#000;border-bottom-color:#000;}',
    'html.dark-mode .qpop-tab--active{color:#f0f0f5;border-bottom-color:#f0f0f5;}',

    /* Close */
    '.qpop-close{',
      'background:transparent;border:none;border-radius:0;cursor:pointer;',
      'font-size:1.2rem;line-height:1;color:rgba(0,0,0,0.35);padding:0;',
      'transition:color 0.15s;',
    '}',
    'html.dark-mode .qpop-close{color:rgba(240,240,245,0.35);}',
    '.qpop-close:hover{color:#000;}',
    'html.dark-mode .qpop-close:hover{color:#f0f0f5;}',

    /* Body */
    '.qpop-body{overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:1rem;}',

    /* Field */
    '.qpop-field{display:flex;flex-direction:column;gap:0.35rem;}',

    /* Label */
    '.qpop-label{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.65rem;font-weight:700;letter-spacing:0.10em;text-transform:uppercase;',
      'color:rgba(0,0,0,0.42);margin:0;',
    '}',
    'html.dark-mode .qpop-label{color:rgba(240,240,245,0.42);}',

    /* Toggle group */
    '.qpop-toggle-group{display:flex;flex-wrap:wrap;gap:0.2rem 0.75rem;}',
    '.qpop-toggle{',
      'background:transparent;color:rgba(0,0,0,0.42);',
      'border:none;border-bottom:1px solid rgba(0,0,0,0.16);border-radius:0;',
      'padding:0.18rem 0;cursor:pointer;',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.78rem;font-weight:400;',
      'transition:color 0.15s,border-color 0.15s;',
    '}',
    'html.dark-mode .qpop-toggle{color:rgba(240,240,245,0.42);border-bottom-color:rgba(240,240,245,0.16);}',
    '.qpop-toggle:hover{color:#000;border-bottom-color:#000;}',
    'html.dark-mode .qpop-toggle:hover{color:#f0f0f5;border-bottom-color:#f0f0f5;}',
    '.qpop-toggle--active{color:#000;border-bottom-color:#000;font-weight:600;}',
    'html.dark-mode .qpop-toggle--active{color:#f0f0f5;border-bottom-color:#f0f0f5;}',

    /* Row */
    '.qpop-row{display:flex;gap:0.75rem;}',
    '.qpop-field-group{display:flex;flex-direction:column;gap:0.25rem;flex:1;}',

    /* Inputs */
    '.qpop-input{',
      'background:transparent;color:#000;',
      'border:none;border-bottom:1px solid rgba(0,0,0,0.22);border-radius:0;',
      'padding:0.3rem 0;',
      'font-family:system-ui,-apple-system,sans-serif;font-size:0.83rem;',
      'outline:none;transition:border-color 0.15s;width:100%;',
      '-moz-appearance:textfield;',
    '}',
    'html.dark-mode .qpop-input{color:#f0f0f5;border-bottom-color:rgba(240,240,245,0.22);}',
    '.qpop-input::-webkit-inner-spin-button,.qpop-input::-webkit-outer-spin-button{-webkit-appearance:none;}',
    '.qpop-input:focus{border-bottom-color:#000;}',
    'html.dark-mode .qpop-input:focus{border-bottom-color:#f0f0f5;}',

    '.qpop-textarea{',
      'background:transparent;color:#000;',
      'border:1px solid rgba(0,0,0,0.18);border-radius:0;',
      'padding:0.5rem;',
      'font-family:system-ui,-apple-system,sans-serif;font-size:0.83rem;',
      'resize:vertical;outline:none;min-height:80px;',
      'transition:border-color 0.15s;width:100%;',
    '}',
    'html.dark-mode .qpop-textarea{color:#f0f0f5;border-color:rgba(240,240,245,0.18);}',
    '.qpop-textarea:focus{border-color:#000;}',
    'html.dark-mode .qpop-textarea:focus{border-color:rgba(240,240,245,0.65);}',

    '.qpop-file{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.75rem;color:rgba(0,0,0,0.48);cursor:pointer;',
    '}',
    'html.dark-mode .qpop-file{color:rgba(240,240,245,0.48);}',

    /* Hints & errors */
    '.qpop-hint{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.68rem;color:#b91c1c;line-height:1.5;margin:0;',
    '}',
    'html.dark-mode .qpop-hint{color:#f87171;}',

    /* Actions */
    '.qpop-actions{display:flex;flex-direction:column;gap:0.5rem;}',
    '.qpop-submit{',
      'background:transparent;color:#000;',
      'border:none;border-bottom:1px solid #000;border-radius:0;',
      'padding:0.4rem 0;cursor:pointer;',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.83rem;font-weight:600;letter-spacing:0.04em;',
      'text-align:left;align-self:flex-start;',
      'transition:color 0.15s,border-color 0.15s;',
    '}',
    'html.dark-mode .qpop-submit{color:#f0f0f5;border-bottom-color:#f0f0f5;}',
    '.qpop-submit:hover{color:rgba(0,0,0,0.42);border-bottom-color:rgba(0,0,0,0.42);}',
    'html.dark-mode .qpop-submit:hover{color:rgba(240,240,245,0.42);border-bottom-color:rgba(240,240,245,0.42);}',
    '.qpop-submit:disabled{opacity:0.35;cursor:not-allowed;}',

    '.qpop-status{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.75rem;color:rgba(0,0,0,0.48);line-height:1.5;margin:0;',
    '}',
    'html.dark-mode .qpop-status{color:rgba(240,240,245,0.48);}',

    /* History */
    '.qpop-history-list{display:flex;flex-direction:column;gap:0.75rem;}',
    '.qpop-history-item{',
      'border:1px solid rgba(0,0,0,0.10);border-radius:0;',
      'padding:0.75rem;display:flex;flex-direction:column;gap:0.3rem;',
    '}',
    'html.dark-mode .qpop-history-item{border-color:rgba(240,240,245,0.10);}',
    '.qpop-history-meta{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;}',

    '.qpop-category-tag{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.56rem;font-weight:700;text-transform:uppercase;letter-spacing:0.10em;',
      'color:rgba(0,0,0,0.42);border:1px solid rgba(0,0,0,0.16);border-radius:0;',
      'padding:0.1rem 0.35rem;',
    '}',
    'html.dark-mode .qpop-category-tag{color:rgba(240,240,245,0.42);border-color:rgba(240,240,245,0.16);}',

    '.qpop-badge{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.56rem;font-weight:700;text-transform:uppercase;letter-spacing:0.10em;',
      'padding:0.1rem 0.35rem;border-radius:0;',
    '}',
    '.qpop-badge--pending{color:rgba(0,0,0,0.38);border:1px solid rgba(0,0,0,0.14);}',
    'html.dark-mode .qpop-badge--pending{color:rgba(240,240,245,0.38);border-color:rgba(240,240,245,0.14);}',
    '.qpop-badge--answered{color:#047857;border:1px solid rgba(4,120,87,0.3);}',
    'html.dark-mode .qpop-badge--answered{color:#34d399;border-color:rgba(52,211,153,0.3);}',

    '.qpop-history-question{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.8rem;color:rgba(0,0,0,0.52);line-height:1.55;margin:0;',
    '}',
    'html.dark-mode .qpop-history-question{color:rgba(240,240,245,0.52);}',

    '.qpop-history-response{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.78rem;color:#000;line-height:1.55;',
      'padding:0.5rem;border-left:2px solid rgba(0,0,0,0.18);margin-top:0.25rem;',
    '}',
    'html.dark-mode .qpop-history-response{color:#f0f0f5;border-left-color:rgba(240,240,245,0.18);}',

    '.qpop-no-questions{',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:0.8rem;color:rgba(0,0,0,0.42);line-height:1.6;padding:0.5rem 0;margin:0;',
    '}',
    'html.dark-mode .qpop-no-questions{color:rgba(240,240,245,0.42);}',

    /* Mobile */
    '@media(max-width:480px){',
      '.qpop-trigger span{display:none;}',
      '.qpop-trigger{bottom:1rem;right:1rem;padding:0.65rem;}',
      '.qpop-panel{right:0.75rem;left:0.75rem;width:auto;max-width:none;bottom:3.75rem;}',
    '}',
  ].join('');
  document.head.appendChild(style);

  /* ─── INJECT HTML ─────────────────────────────────────────────── */
  var root = document.createElement('div');
  root.id = 'qpop-root';
  root.innerHTML = [
    '<button class="qpop-trigger" id="qpopTrigger" aria-label="Ask a question" aria-expanded="false">',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"',
          'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
        '<circle cx="12" cy="12" r="10"/>',
        '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>',
        '<line x1="12" y1="17" x2="12.01" y2="17"/>',
      '</svg>',
      '<span>Ask a question</span>',
    '</button>',

    '<div class="qpop-panel" id="qpopPanel" aria-hidden="true" role="dialog" aria-label="Ask a question">',
      '<div class="qpop-header">',
        '<div class="qpop-tabs">',
          '<button class="qpop-tab qpop-tab--active" id="tabAsk">Ask</button>',
          '<button class="qpop-tab" id="tabHistory">History</button>',
        '</div>',
        '<button class="qpop-close" id="qpopClose" aria-label="Close">&times;</button>',
      '</div>',

      /* Ask tab */
      '<div class="qpop-body" id="panelAsk">',

        '<div class="qpop-field">',
          '<p class="qpop-label">Topic</p>',
          '<div class="qpop-toggle-group" id="topicGroup">',
            '<button class="qpop-toggle qpop-toggle--active" data-value="general">General</button>',
            '<button class="qpop-toggle" data-value="formulas">Formulas &amp; Equations</button>',
            '<button class="qpop-toggle" data-value="earning">Earning Money</button>',
            '<button class="qpop-toggle" data-value="managing">Managing Money</button>',
            '<button class="qpop-toggle" data-value="data">Data Analysis</button>',
          '</div>',
        '</div>',

        '<div class="qpop-field">',
          '<p class="qpop-label">Question type</p>',
          '<div class="qpop-toggle-group" id="qtypeGroup">',
            '<button class="qpop-toggle qpop-toggle--active" data-value="other">Other</button>',
            '<button class="qpop-toggle" data-value="hsc">HSC Exam</button>',
          '</div>',
        '</div>',

        '<div class="qpop-field" id="hscFields" style="display:none">',
          '<div class="qpop-row">',
            '<div class="qpop-field-group">',
              '<label class="qpop-label" for="hscYear">Paper year</label>',
              '<input class="qpop-input" type="number" id="hscYear" placeholder="e.g. 2023" min="2000" max="2030">',
            '</div>',
            '<div class="qpop-field-group">',
              '<label class="qpop-label" for="hscQNum">Question no.</label>',
              '<input class="qpop-input" type="text" id="hscQNum" placeholder="e.g. Q14b">',
            '</div>',
          '</div>',
          '<p class="qpop-label" style="margin-top:8px">Standard</p>',
          '<div class="qpop-toggle-group" id="stdGroup">',
            '<button class="qpop-toggle qpop-toggle--active" data-value="std1">Standard 1</button>',
            '<button class="qpop-toggle" data-value="std2">Standard 2</button>',
          '</div>',
        '</div>',

        '<div class="qpop-field" id="otherFields">',
          '<label class="qpop-label" for="qText">Your question</label>',
          '<textarea class="qpop-textarea" id="qText" placeholder="Type your question here…" rows="4"></textarea>',
          '<label class="qpop-label" for="qImage" style="margin-top:10px">',
            'Attach image <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional, max 200 KB)</span>',
          '</label>',
          '<input class="qpop-file" type="file" id="qImage" accept="image/*">',
          '<p class="qpop-hint" id="imgHint" style="display:none">Image too large (max 200 KB). Please use a smaller screenshot.</p>',
        '</div>',

        '<div class="qpop-actions">',
          '<button class="qpop-submit" id="qpopSubmit">Submit question →</button>',
          '<p class="qpop-status" id="qpopStatus" style="display:none"></p>',
        '</div>',

      '</div>',

      /* History tab */
      '<div class="qpop-body" id="panelHistory" style="display:none">',
        '<div class="qpop-history-list" id="historyList">',
          '<p class="qpop-no-questions">Loading your questions…</p>',
        '</div>',
      '</div>',

    '</div>',
  ].join('');
  document.body.appendChild(root);

  /* ─── LOGIC ───────────────────────────────────────────────────── */
  var studentId = localStorage.getItem('ie_student_id');
  if (!studentId) {
    try { studentId = crypto.randomUUID(); } catch (e) {
      studentId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    localStorage.setItem('ie_student_id', studentId);
  }

  var trigger      = document.getElementById('qpopTrigger');
  var panel        = document.getElementById('qpopPanel');
  var closeBtn     = document.getElementById('qpopClose');
  var tabAsk       = document.getElementById('tabAsk');
  var tabHistory   = document.getElementById('tabHistory');
  var panelAsk     = document.getElementById('panelAsk');
  var panelHistory = document.getElementById('panelHistory');
  var topicGroup   = document.getElementById('topicGroup');
  var qtypeGroup   = document.getElementById('qtypeGroup');
  var stdGroup     = document.getElementById('stdGroup');
  var hscFields    = document.getElementById('hscFields');
  var otherFields  = document.getElementById('otherFields');
  var hscYear      = document.getElementById('hscYear');
  var hscQNum      = document.getElementById('hscQNum');
  var qText        = document.getElementById('qText');
  var qImage       = document.getElementById('qImage');
  var imgHint      = document.getElementById('imgHint');
  var submitBtn    = document.getElementById('qpopSubmit');
  var statusEl     = document.getElementById('qpopStatus');
  var historyList  = document.getElementById('historyList');

  var isOpen = false;
  var imageBase64 = '';

  function openPanel()  {
    isOpen = true;
    panel.classList.add('qpop-panel--open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove('qpop-panel--open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', function () { isOpen ? closePanel() : openPanel(); });
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) closePanel(); });

  /* Click outside to close */
  document.addEventListener('click', function (e) {
    if (isOpen && !panel.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
      closePanel();
    }
  });

  /* Tabs */
  function switchTab(tab) {
    var toAsk = tab === 'ask';
    tabAsk.classList.toggle('qpop-tab--active', toAsk);
    tabHistory.classList.toggle('qpop-tab--active', !toAsk);
    panelAsk.style.display     = toAsk ? '' : 'none';
    panelHistory.style.display = toAsk ? 'none' : '';
    if (!toAsk) loadHistory();
  }
  tabAsk.addEventListener('click',     function () { switchTab('ask'); });
  tabHistory.addEventListener('click', function () { switchTab('history'); });

  /* Toggle groups */
  function bindToggleGroup(groupEl, onChange) {
    groupEl.querySelectorAll('.qpop-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        groupEl.querySelectorAll('.qpop-toggle').forEach(function (b) {
          b.classList.remove('qpop-toggle--active');
        });
        btn.classList.add('qpop-toggle--active');
        if (onChange) onChange(btn.dataset.value);
      });
    });
  }

  bindToggleGroup(topicGroup);
  bindToggleGroup(stdGroup);
  bindToggleGroup(qtypeGroup, function (val) {
    var isHsc = val === 'hsc';
    hscFields.style.display   = isHsc ? '' : 'none';
    otherFields.style.display = isHsc ? 'none' : '';
  });

  /* Image upload */
  qImage.addEventListener('change', function () {
    imgHint.style.display = 'none';
    imageBase64 = '';
    var file = qImage.files[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      imgHint.style.display = '';
      qImage.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) { imageBase64 = e.target.result; };
    reader.readAsDataURL(file);
  });

  function getToggleValue(groupEl) {
    var active = groupEl.querySelector('.qpop-toggle--active');
    return active ? active.dataset.value : '';
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.display = '';
    statusEl.style.color = isError ? '#b91c1c' : '';
    if (isError) {
      /* also fix dark-mode colour inline */
      var dark = document.documentElement.classList.contains('dark-mode');
      if (dark) statusEl.style.color = '#f87171';
    }
  }

  function resetForm() {
    qText.value = '';
    qImage.value = '';
    imageBase64 = '';
    hscYear.value = '';
    hscQNum.value = '';
  }

  /* Submit */
  submitBtn.addEventListener('click', function () {
    var topic  = getToggleValue(topicGroup);
    var qtype  = getToggleValue(qtypeGroup);
    var isHsc  = qtype === 'hsc';

    if (isHsc && (!hscYear.value.trim() || !hscQNum.value.trim())) {
      setStatus('Please fill in the paper year and question number.', true);
      return;
    }
    if (!isHsc && !qText.value.trim()) {
      setStatus('Please write your question before submitting.', true);
      return;
    }

    var payload = {
      studentId:    studentId,
      timestamp:    new Date().toISOString(),
      category:     topic,
      type:         qtype,
      hscYear:      isHsc ? hscYear.value.trim() : '',
      hscStandard:  isHsc ? getToggleValue(stdGroup) : '',
      hscQNumber:   isHsc ? hscQNum.value.trim() : '',
      questionText: isHsc ? '' : qText.value.trim(),
      imageBase64:  isHsc ? '' : imageBase64,
    };

    submitBtn.disabled = true;
    setStatus('Sending…', false);

    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function () {
        setStatus('Question sent. Check the History tab for updates.', false);
        resetForm();
      })
      .catch(function () {
        setStatus('Could not send — check your connection and try again.', true);
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  /* History */
  function loadHistory() {
    if (GAS_URL === 'REPLACE_WITH_APPS_SCRIPT_URL') {
      historyList.innerHTML = '<p class="qpop-no-questions">Set up the Google Apps Script backend to view question history here.</p>';
      return;
    }
    historyList.innerHTML = '<p class="qpop-no-questions">Loading…</p>';
    fetch(GAS_URL + '?studentId=' + encodeURIComponent(studentId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.questions || !data.questions.length) {
          historyList.innerHTML = '<p class="qpop-no-questions">No questions yet. Use the Ask tab to send one.</p>';
          return;
        }
        historyList.innerHTML = '';
        data.questions.slice().reverse().forEach(function (q) {
          var answered = q.answered === 'TRUE' || q.answered === true;
          var item = document.createElement('div');
          item.className = 'qpop-history-item';

          var meta = document.createElement('div');
          meta.className = 'qpop-history-meta';
          meta.innerHTML =
            '<span class="qpop-category-tag">' + esc(q.category || 'general') + '</span>' +
            '<span class="qpop-badge ' + (answered ? 'qpop-badge--answered' : 'qpop-badge--pending') + '">' +
            (answered ? 'Answered' : 'Pending') + '</span>';

          var summary = q.questionText
            ? q.questionText
            : (q.type === 'hsc'
                ? 'HSC ' + esc(String(q.hscYear || '')) + ' ' + esc(String(q.hscStandard || '')) + ' ' + esc(String(q.hscQNumber || ''))
                : '—');

          var qEl = document.createElement('p');
          qEl.className = 'qpop-history-question';
          qEl.textContent = summary.length > 140 ? summary.slice(0, 140) + '…' : summary;

          item.appendChild(meta);
          item.appendChild(qEl);

          if (answered && q.teacherResponse) {
            var resp = document.createElement('div');
            resp.className = 'qpop-history-response';
            resp.textContent = q.teacherResponse;
            item.appendChild(resp);
          }

          historyList.appendChild(item);
        });
      })
      .catch(function () {
        historyList.innerHTML = '<p class="qpop-no-questions">Could not load history — check your connection.</p>';
      });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
