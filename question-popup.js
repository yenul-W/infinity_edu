/**
 * question-popup.js — self-contained Ask a Question popup
 *
 * SETUP: Set GAS_URL below to your deployed Google Apps Script web app URL.
 * Deploy the script as: Execute as Me, Who has access: Anyone.
 *
 * ─── GOOGLE APPS SCRIPT (paste into script.google.com and redeploy) ───────
 *
 * var SPREADSHEET_ID = '';   // ← paste your Sheet ID here (from the Sheet URL)
 * var SHEET_NAME     = 'Questions';
 * var FOLDER_NAME    = 'ie-question-images';
 *
 * function doPost(e) {
 *   var lock = LockService.getScriptLock();
 *   lock.tryLock(10000);
 *   try {
 *     var d  = JSON.parse(e.postData.contents);
 *     var sh = getSheet_();
 *     var imageUrl = '';
 *     if (d.imageBase64 && d.imageBase64.length > 22) {
 *       try {
 *         imageUrl = saveImageToDrive_(d.imageBase64, d.studentId);
 *       } catch (imgErr) {
 *         imageUrl = 'ERROR: ' + imgErr.toString();
 *       }
 *     }
 *     sh.appendRow([
 *       d.studentId || '', d.timestamp || new Date().toISOString(),
 *       d.category || '', d.type || '', d.hscYear || '',
 *       d.hscStandard || '', d.hscQNumber || '', d.questionText || '',
 *       imageUrl, 'FALSE', ''
 *     ]);
 *     return json_({ status: 'ok' });
 *   } catch (err) {
 *     return json_({ status: 'error', message: err.toString() });
 *   } finally { lock.releaseLock(); }
 * }
 *
 * function doGet(e) {
 *   try {
 *     var sid  = (e.parameter || {}).studentId || '';
 *     var sh   = getSheet_();
 *     var rows = sh.getDataRange().getValues();
 *     if (rows.length < 1) return json_({ questions: [] });
 *     // Detect whether the first row is a header row or data
 *     var hasHeaders = String(rows[0][0]).trim() === 'studentId';
 *     var dataRows   = hasHeaders ? rows.slice(1) : rows;
 *     var idx = hasHeaders
 *       ? (function () { var m = {}; rows[0].forEach(function (h, i) { m[String(h).trim()] = i; }); return m; }())
 *       : { studentId:0, timestamp:1, category:2, type:3, hscYear:4, hscStandard:5,
 *           hscQNumber:6, questionText:7, imageUrl:8, answered:9, teacherResponse:10 };
 *     var questions = dataRows
 *       .filter(function (r) { return !sid || String(r[idx.studentId]) === sid; })
 *       .map(function (r) {
 *         return {
 *           studentId: r[idx.studentId], timestamp: r[idx.timestamp],
 *           category: r[idx.category], type: r[idx.type],
 *           hscYear: r[idx.hscYear], hscStandard: r[idx.hscStandard],
 *           hscQNumber: r[idx.hscQNumber], questionText: r[idx.questionText],
 *           imageUrl: r[idx.imageUrl] || '',
 *           answered: r[idx.answered], teacherResponse: r[idx.teacherResponse] || '',
 *         };
 *       });
 *     return json_({ questions: questions });
 *   } catch (err) {
 *     return json_({ status: 'error', message: err.toString() });
 *   }
 * }
 *
 * function getSheet_() {
 *   var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 *   var sh = ss.getSheetByName(SHEET_NAME);
 *   if (!sh) {
 *     sh = ss.insertSheet(SHEET_NAME);
 *     sh.appendRow(['studentId','timestamp','category','type','hscYear','hscStandard',
 *                   'hscQNumber','questionText','imageUrl','answered','teacherResponse']);
 *   }
 *   return sh;
 * }
 *
 * // Run this once manually in the editor to authorize Drive access
 * function authorizeAll_() {
 *   DriveApp.getRootFolder();
 *   getSheet_();
 * }
 *
 * function saveImageToDrive_(dataUrl, studentId, timestamp) {
 *   var m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
 *   if (!m) return '';
 *   var mime = m[1], b64 = m[2], ext = mime.split('/')[1] || 'jpg';
 *   var name = 'q_' + (studentId || 'x') + '_' + Date.now() + '.' + ext;
 *   var folders = DriveApp.getFoldersByName(FOLDER_NAME);
 *   var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
 *   var blob    = Utilities.newBlob(Utilities.base64Decode(b64), mime, name);
 *   var file    = folder.createFile(blob);
 *   file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
 *   return 'https://drive.google.com/uc?export=view&id=' + file.getId();
 * }
 *
 * function json_(obj) {
 *   return ContentService.createTextOutput(JSON.stringify(obj))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  if (document.getElementById('qpop-root')) return; // guard double-injection

  /* ─── CONFIG ──────────────────────────────────────────────────── */
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbxTl03nJFeM3ZfHVA3vNkUIuJguVdhWReBnVjLkOqrHnf4K0DwQbpaWL7SbhXTpT2t1ig/exec';

  /* ─── INJECT CSS ──────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.id = 'qpop-styles';
  style.textContent = [
    /* Sociotype: DM Mono (300) for labels and controls, Poppins for text,
       sentence case, achromatic only — ink, canvas and the four grays. */

    /* Trigger button */
    '.qpop-trigger{',
      'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9000;',
      'display:flex;align-items:center;gap:0.5rem;',
      'padding:0.6rem 1rem;',
      'background:#000;color:#fff;',
      'border:1px solid #000;border-radius:0;',
      'cursor:pointer;',
      'font-family:\'DM Mono\',monospace;',
      'font-size:12px;font-weight:300;letter-spacing:0.02em;',
      'transition:background 0.15s,color 0.15s;white-space:nowrap;',
    '}',
    '.qpop-trigger:hover{background:#fff;color:#000;}',
    'html.dark-mode .qpop-trigger{background:#fff;color:#000;border-color:#fff;}',
    'html.dark-mode .qpop-trigger:hover{background:#0a0a0a;color:#fff;}',

    /* Panel */
    '.qpop-panel{',
      'position:fixed;bottom:4.5rem;right:1.5rem;z-index:9001;',
      'width:380px;max-width:calc(100vw - 3rem);',
      'background:#fff;color:#000;',
      'border:1px solid #000;border-radius:0;',
      'display:flex;flex-direction:column;',
      'max-height:calc(100vh - 8rem);overflow:hidden;',
      'opacity:0;visibility:hidden;pointer-events:none;',
      'transition:opacity 0.18s ease,visibility 0s linear 0.18s;',
    '}',
    'html.dark-mode .qpop-panel{background:#0a0a0a;color:#fff;border-color:#fff;}',
    '.qpop-panel.qpop-panel--open{opacity:1;visibility:visible;pointer-events:all;transition-delay:0s;}',

    /* Header */
    '.qpop-header{',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:0.75rem 1rem;',
      'border-bottom:1px solid #000;flex-shrink:0;',
    '}',
    'html.dark-mode .qpop-header{border-bottom-color:#fff;}',

    /* Tabs */
    '.qpop-tabs{display:flex;gap:1.25rem;}',
    '.qpop-tab{',
      'background:transparent;border:none;border-bottom:1px solid transparent;border-radius:0;',
      'padding:0.1rem 0;cursor:pointer;',
      'font-family:\'DM Mono\',monospace;',
      'font-size:11px;font-weight:300;letter-spacing:0.02em;',
      'color:#6b6b6b;',
      'transition:color 0.15s,border-color 0.15s;',
    '}',
    '.qpop-tab:hover{color:#000;}',
    'html.dark-mode .qpop-tab:hover{color:#fff;}',
    '.qpop-tab--active{color:#000;border-bottom-color:#000;}',
    'html.dark-mode .qpop-tab--active{color:#fff;border-bottom-color:#fff;}',

    /* Close */
    '.qpop-close{',
      'background:transparent;border:none;border-radius:0;cursor:pointer;',
      'font-size:1.2rem;line-height:1;color:#6b6b6b;padding:0;',
      'min-width:44px;min-height:44px;margin:-0.75rem -1rem -0.75rem 0;',
      'transition:color 0.15s;',
    '}',
    '.qpop-close:hover{color:#000;}',
    'html.dark-mode .qpop-close:hover{color:#fff;}',

    /* Body */
    '.qpop-body{overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:1rem;}',

    /* Field */
    '.qpop-field{display:flex;flex-direction:column;gap:0.35rem;}',

    /* Label */
    '.qpop-label{',
      'font-family:\'DM Mono\',monospace;',
      'font-size:11px;font-weight:300;letter-spacing:0.02em;',
      'color:#6b6b6b;margin:0;',
    '}',

    /* Toggle group — ghost buttons */
    '.qpop-toggle-group{display:flex;flex-wrap:wrap;gap:0.2rem 0.75rem;}',
    '.qpop-toggle{',
      'background:transparent;color:#6b6b6b;',
      'border:none;border-bottom:1px solid #d6d6d6;border-radius:0;',
      'padding:0.18rem 0;cursor:pointer;',
      'font-family:\'Poppins\',sans-serif;',
      'font-size:13px;font-weight:500;letter-spacing:0.35px;',
      'transition:color 0.15s,border-color 0.15s;',
    '}',
    'html.dark-mode .qpop-toggle{border-bottom-color:#333;}',
    '.qpop-toggle:hover,.qpop-toggle--active{color:#000;border-bottom-color:#000;}',
    'html.dark-mode .qpop-toggle:hover,html.dark-mode .qpop-toggle--active{color:#fff;border-bottom-color:#fff;}',
    '.qpop-toggle--active{font-weight:600;}',

    /* Row */
    '.qpop-row{display:flex;gap:0.75rem;}',
    '.qpop-field-group{display:flex;flex-direction:column;gap:0.25rem;flex:1;}',

    /* Inputs — transparent, 1px bottom rule */
    '.qpop-input{',
      'background:transparent;color:#000;',
      'border:none;border-bottom:1px solid #818181;border-radius:0;',
      'padding:0.3rem 0;',
      'font-family:\'Poppins\',sans-serif;','font-size:14px;letter-spacing:0.35px;',
      'transition:border-color 0.15s;width:100%;',
      '-moz-appearance:textfield;',
    '}',
    'html.dark-mode .qpop-input{color:#fff;}',
    '.qpop-input::placeholder,.qpop-textarea::placeholder{color:#6b6b6b;}',
    '.qpop-input::-webkit-inner-spin-button,.qpop-input::-webkit-outer-spin-button{-webkit-appearance:none;}',
    '.qpop-input:focus{border-bottom-color:#000;}',
    'html.dark-mode .qpop-input:focus{border-bottom-color:#fff;}',

    '.qpop-textarea{',
      'background:transparent;color:#000;',
      'border:1px solid #d6d6d6;border-radius:0;',
      'padding:0.5rem;',
      'font-family:\'Poppins\',sans-serif;','font-size:14px;letter-spacing:0.35px;',
      'resize:vertical;min-height:80px;',
      'transition:border-color 0.15s;width:100%;',
    '}',
    'html.dark-mode .qpop-textarea{color:#fff;border-color:#333;}',
    '.qpop-textarea:focus{border-color:#000;}',
    'html.dark-mode .qpop-textarea:focus{border-color:#fff;}',

    '.qpop-file{font-family:\'DM Mono\',monospace;font-size:11px;color:#6b6b6b;cursor:pointer;font-weight:300;}',

    /* Hints & errors — weight, not colour */
    '.qpop-hint{',
      'font-family:\'Poppins\',sans-serif;',
      'font-size:13px;font-weight:600;color:#000;line-height:1.5;margin:0;',
    '}',
    'html.dark-mode .qpop-hint{color:#fff;}',

    /* Actions */
    '.qpop-actions{display:flex;flex-direction:column;gap:0.5rem;}',
    '.qpop-submit{',
      'background:transparent;color:#000;',
      'border:none;border-bottom:1px solid #000;border-radius:0;',
      'padding:0.4rem 0;cursor:pointer;',
      'font-family:\'DM Mono\',monospace;',
      'font-size:12px;font-weight:300;letter-spacing:0.02em;',
      'text-align:left;align-self:flex-start;',
      'transition:color 0.15s,border-color 0.15s;',
    '}',
    'html.dark-mode .qpop-submit{color:#fff;border-bottom-color:#fff;}',
    '.qpop-submit:hover{color:#6b6b6b;border-bottom-color:#818181;}',
    'html.dark-mode .qpop-submit:hover{color:#6b6b6b;border-bottom-color:#818181;}',
    '.qpop-submit:disabled{opacity:0.35;cursor:not-allowed;}',

    '.qpop-status{',
      'font-family:\'Poppins\',sans-serif;',
      'font-size:13px;color:#6b6b6b;line-height:1.5;margin:0;',
    '}',
    '.qpop-status--error{color:#000;font-weight:600;}',
    'html.dark-mode .qpop-status--error{color:#fff;}',

    /* History */
    '.qpop-history-list{display:flex;flex-direction:column;gap:0.75rem;}',
    '.qpop-history-item{',
      'border:none;border-bottom:1px solid #d6d6d6;border-radius:0;',
      'padding:0 0 0.75rem;display:flex;flex-direction:column;gap:0.3rem;',
    '}',
    'html.dark-mode .qpop-history-item{border-bottom-color:#333;}',
    '.qpop-history-meta{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;}',
    '.qpop-history-date{',
      'font-family:\'DM Mono\',monospace;',
      'font-size:11px;letter-spacing:0.02em;',
      'color:#767676;margin-left:auto;',
    ';font-weight:300;}',

    '.qpop-category-tag,.qpop-badge{',
      'font-family:\'DM Mono\',monospace;',
      'font-size:11px;font-weight:300;letter-spacing:0.02em;',
      'border:1px solid #d6d6d6;border-radius:0;',
      'padding:0.1rem 0.35rem;color:#6b6b6b;',
    '}',
    'html.dark-mode .qpop-category-tag,html.dark-mode .qpop-badge{border-color:#333;}',
    '.qpop-badge--answered{color:#000;border-color:#000;}',
    'html.dark-mode .qpop-badge--answered{color:#fff;border-color:#fff;}',

    '.qpop-history-question{',
      'font-family:\'Poppins\',sans-serif;',
      'font-size:14px;color:#6b6b6b;line-height:1.55;margin:0;',
    '}',

    '.qpop-history-response{',
      'font-family:\'Poppins\',sans-serif;',
      'font-size:14px;color:#000;line-height:1.55;',
      'padding:0.25rem 0 0.25rem 0.75rem;border-left:1px solid #000;margin-top:0.25rem;',
    '}',
    'html.dark-mode .qpop-history-response{color:#fff;border-left-color:#fff;}',

    '.qpop-no-questions{',
      'font-family:\'Poppins\',sans-serif;',
      'font-size:14px;color:#6b6b6b;line-height:1.6;padding:0.5rem 0;margin:0;',
    '}',

    'html.dark-mode .qpop-tab,html.dark-mode .qpop-close,html.dark-mode .qpop-label,html.dark-mode .qpop-toggle,',
    'html.dark-mode .qpop-input::placeholder,html.dark-mode .qpop-textarea::placeholder,html.dark-mode .qpop-file,',
    'html.dark-mode .qpop-status,html.dark-mode .qpop-history-date,html.dark-mode .qpop-category-tag,html.dark-mode .qpop-badge,',
    'html.dark-mode .qpop-history-question,html.dark-mode .qpop-no-questions{color:#818181;}',

    /* Mobile */
    '@media(max-width:480px){',
      '.qpop-trigger span{display:none;}',
      '.qpop-trigger{bottom:1rem;right:1rem;padding:0.65rem;}',
      '.qpop-panel{right:0.75rem;left:0.75rem;width:auto;max-width:none;bottom:3.75rem;}',
    '}',
  ].join('');
  document.head.appendChild(style);

  /* ─── TOPICS (per year) ───────────────────────────────────────── */
  var TOPIC_LABELS = {
    general:     'General',
    formulas:    'Formulas & equations',
    linear:      'Linear relationships',
    earning:     'Earning money',
    managing:    'Managing money',
    measurement: 'Applications of measurement',
    data:        'Data analysis',
    time:        'Time and location',
    networks:    'Networks, paths and trees',
    y12algebra:  'Algebraic relationships',
    y12invest:   'Investment & loans',
    y12annuity:  'Annuities',
    y12trig:     'Trigonometry',
    y12rates:    'Ratios & rates',
    y12flow:     'Network flow',
    y12cpa:      'Critical path analysis',
    y12bivar:    'Bivariate data analysis',
    y12prob:     'Relative frequency & probability',
    y12normal:   'The normal distribution',
  };
  var isY12 = /year-12/.test(location.pathname) ||
    (!/year-11/.test(location.pathname) && localStorage.getItem('ie_year') === '12');
  var TOPICS = ['general'].concat(isY12
    ? ['y12algebra','y12invest','y12annuity','y12trig','y12rates','y12flow','y12cpa','y12bivar','y12prob','y12normal']
    : ['formulas','linear','earning','managing','measurement','data','time','networks']);
  var topicButtons = TOPICS.map(function (k, i) {
    return '<button class="qpop-toggle' + (i === 0 ? ' qpop-toggle--active' : '') + '" data-value="' + k +
      '" aria-pressed="' + (i === 0) + '">' + TOPIC_LABELS[k].replace(/&/g, '&amp;') + '</button>';
  }).join('');

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

    '<div class="qpop-panel" id="qpopPanel" role="dialog" aria-label="Ask a question" inert>',
      '<div class="qpop-header">',
        '<div class="qpop-tabs" role="tablist" aria-label="Question panel">',
          '<button class="qpop-tab qpop-tab--active" id="tabAsk" role="tab" aria-selected="true" aria-controls="panelAsk">Ask</button>',
          '<button class="qpop-tab" id="tabHistory" role="tab" aria-selected="false" aria-controls="panelHistory" tabindex="-1">History</button>',
        '</div>',
        '<button class="qpop-close" id="qpopClose" aria-label="Close">&times;</button>',
      '</div>',

      /* Ask tab */
      '<div class="qpop-body" id="panelAsk" role="tabpanel" aria-labelledby="tabAsk">',

        '<div class="qpop-field">',
          '<p class="qpop-label" id="qpopTopicLabel">Topic</p>',
          '<div class="qpop-toggle-group" id="topicGroup" role="group" aria-labelledby="qpopTopicLabel">',
            topicButtons,
          '</div>',
        '</div>',

        '<div class="qpop-field">',
          '<p class="qpop-label" id="qpopTypeLabel">Question type</p>',
          '<div class="qpop-toggle-group" id="qtypeGroup" role="group" aria-labelledby="qpopTypeLabel">',
            '<button class="qpop-toggle qpop-toggle--active" data-value="other" aria-pressed="true">Other</button>',
            '<button class="qpop-toggle" data-value="hsc" aria-pressed="false">HSC exam</button>',
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
          '<p class="qpop-label" id="qpopStdLabel" style="margin-top:8px">Standard</p>',
          '<div class="qpop-toggle-group" id="stdGroup" role="group" aria-labelledby="qpopStdLabel">',
            '<button class="qpop-toggle qpop-toggle--active" data-value="std1" aria-pressed="true">Standard 1</button>',
            '<button class="qpop-toggle" data-value="std2" aria-pressed="false">Standard 2</button>',
          '</div>',
        '</div>',

        '<div class="qpop-field" id="otherFields">',
          '<label class="qpop-label" for="qText">Your question</label>',
          '<textarea class="qpop-textarea" id="qText" placeholder="Type your question here…" rows="4"></textarea>',
        '</div>',

        '<div class="qpop-actions">',
          '<button class="qpop-submit" id="qpopSubmit">Submit question →</button>',
          '<p class="qpop-status" id="qpopStatus" role="status" aria-live="polite" style="display:none"></p>',
        '</div>',

      '</div>',

      /* History tab */
      '<div class="qpop-body" id="panelHistory" role="tabpanel" aria-labelledby="tabHistory" style="display:none">',
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
  var submitBtn    = document.getElementById('qpopSubmit');
  var statusEl     = document.getElementById('qpopStatus');
  var historyList  = document.getElementById('historyList');

  var isOpen = false;

  function focusables() {
    return Array.prototype.filter.call(
      panel.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null; });
  }
  function openPanel()  {
    isOpen = true;
    panel.removeAttribute('inert');
    panel.classList.add('qpop-panel--open');
    trigger.setAttribute('aria-expanded', 'true');
    var active = panel.querySelector('.qpop-tab--active');
    if (active) active.focus();
  }
  function closePanel() {
    var hadFocus = panel.contains(document.activeElement);
    isOpen = false;
    panel.classList.remove('qpop-panel--open');
    panel.setAttribute('inert', '');
    trigger.setAttribute('aria-expanded', 'false');
    if (hadFocus) trigger.focus();
  }

  trigger.addEventListener('click', function () { isOpen ? closePanel() : openPanel(); });
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { closePanel(); return; }
    // Keep Tab inside the open panel
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

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
    tabAsk.setAttribute('aria-selected', String(toAsk));
    tabHistory.setAttribute('aria-selected', String(!toAsk));
    tabAsk.tabIndex = toAsk ? 0 : -1;
    tabHistory.tabIndex = toAsk ? -1 : 0;
    panelAsk.style.display     = toAsk ? '' : 'none';
    panelHistory.style.display = toAsk ? 'none' : '';
    if (!toAsk) loadHistory();
  }
  tabAsk.addEventListener('click',     function () { switchTab('ask'); });
  tabHistory.addEventListener('click', function () { switchTab('history'); });
  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  [tabAsk, tabHistory].forEach(function (t) {
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var next = t === tabAsk ? tabHistory : tabAsk;
      switchTab(next === tabAsk ? 'ask' : 'history');
      next.focus();
    });
  });

  /* Toggle groups */
  function bindToggleGroup(groupEl, onChange) {
    groupEl.querySelectorAll('.qpop-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        groupEl.querySelectorAll('.qpop-toggle').forEach(function (b) {
          b.classList.remove('qpop-toggle--active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('qpop-toggle--active');
        btn.setAttribute('aria-pressed', 'true');
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


  function getToggleValue(groupEl) {
    var active = groupEl.querySelector('.qpop-toggle--active');
    return active ? active.dataset.value : '';
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.display = '';
    statusEl.classList.toggle('qpop-status--error', !!isError);
  }

  function resetForm() {
    qText.value = '';
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
    };

    submitBtn.disabled = true;
    setStatus('Sending…', false);

    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    })
      .then(function () {
        setStatus('Question submitted. It will appear in the History tab once received.', false);
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
          var categoryLabel = TOPIC_LABELS[q.category] || esc(q.category || 'general');
          var dateStr = '';
          if (q.timestamp) {
            try {
              dateStr = new Date(q.timestamp).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short', year: 'numeric'
              });
            } catch (e) {}
          }
          meta.innerHTML =
            '<span class="qpop-category-tag">' + esc(categoryLabel) + '</span>' +
            '<span class="qpop-badge ' + (answered ? 'qpop-badge--answered' : 'qpop-badge--pending') + '">' +
            (answered ? 'Answered' : 'Pending') + '</span>' +
            (dateStr ? '<span class="qpop-history-date">' + esc(dateStr) + '</span>' : '');

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

          var imgSrc = q.imageUrl || q.imageBase64;
          if (imgSrc) {
            imgSrc = imgSrc.replace(
              /https:\/\/drive\.google\.com\/uc\?export=view&id=([^&\s]+)/,
              'https://drive.google.com/thumbnail?id=$1&sz=w800'
            );
            var img = document.createElement('img');
            img.src = imgSrc;
            img.alt = 'Image attached to your question';
            img.style.cssText = 'max-width:100%;margin-top:0.4rem;border:1px solid #d6d6d6;display:block;';
            item.appendChild(img);
          }

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
