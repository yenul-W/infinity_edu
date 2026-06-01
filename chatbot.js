(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  // Replace with your deployed Cloudflare Worker URL after running `wrangler deploy`
  const WORKER_URL = 'https://infinity-edu-chat.YOUR-SUBDOMAIN.workers.dev/chat';
  const BASE_URL = 'https://yenul-w.github.io/infinity_edu';
  const MAX_HISTORY = 20;

  // ── State ────────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  const history = [];

  // ── DOM refs (set in injectDOM) ───────────────────────────────────────────────
  let triggerEl, panelEl, messagesEl, inputEl, sendEl, typingEl;

  // ── DOM injection ─────────────────────────────────────────────────────────────
  function injectDOM() {
    // Trigger button
    triggerEl = document.createElement('button');
    triggerEl.className = 'cb-trigger';
    triggerEl.setAttribute('aria-label', 'Open maths tutor chat');
    triggerEl.setAttribute('aria-expanded', 'false');
    triggerEl.setAttribute('aria-controls', 'cb-panel');
    triggerEl.innerHTML = iconChat();

    // Panel
    panelEl = document.createElement('div');
    panelEl.className = 'cb-panel';
    panelEl.id = 'cb-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Maths tutor chat');
    panelEl.setAttribute('aria-modal', 'true');
    panelEl.innerHTML = `
      <div class="cb-header">
        <div class="cb-header-title">
          <div class="cb-dot"></div>
          <h3>Maths Tutor</h3>
        </div>
        <button class="cb-close" aria-label="Close chat">${iconClose()}</button>
      </div>
      <div class="cb-messages" id="cb-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <div class="cb-input-row">
        <textarea
          class="cb-input"
          id="cb-input"
          placeholder="Ask a maths question…"
          rows="1"
          aria-label="Message input"
        ></textarea>
        <button class="cb-send" id="cb-send" aria-label="Send message" disabled>${iconSend()}</button>
      </div>
    `;

    document.body.appendChild(triggerEl);
    document.body.appendChild(panelEl);

    messagesEl = document.getElementById('cb-messages');
    inputEl = document.getElementById('cb-input');
    sendEl = document.getElementById('cb-send');

    // Welcome message
    appendBotMessage('Hi! I\'m your Year 11 Maths tutor. Ask me anything about Formulas & Equations, Earning Money, Managing Money, or Data Analysis.');

    // Events
    triggerEl.addEventListener('click', togglePanel);
    panelEl.querySelector('.cb-close').addEventListener('click', closePanel);
    inputEl.addEventListener('input', onInputChange);
    inputEl.addEventListener('keydown', onInputKeydown);
    sendEl.addEventListener('click', sendMessage);

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (isOpen && !panelEl.contains(e.target) && e.target !== triggerEl) {
        closePanel();
      }
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closePanel();
    });
  }

  // ── Panel toggle ──────────────────────────────────────────────────────────────
  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    isOpen = true;
    panelEl.classList.add('cb-open');
    triggerEl.setAttribute('aria-expanded', 'true');
    triggerEl.innerHTML = iconClose();
    inputEl.focus();
  }

  function closePanel() {
    isOpen = false;
    panelEl.classList.remove('cb-open');
    triggerEl.setAttribute('aria-expanded', 'false');
    triggerEl.innerHTML = iconChat();
  }

  // ── Input handling ────────────────────────────────────────────────────────────
  function onInputChange() {
    // Auto-grow textarea
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + 'px';
    sendEl.disabled = inputEl.value.trim() === '' || isLoading;
  }

  function onInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendEl.disabled) sendMessage();
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    appendUserMessage(text);
    history.push({ role: 'user', content: text });

    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendEl.disabled = true;
    isLoading = true;
    showTyping();

    try {
      const payload = history.slice(-MAX_HISTORY);
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      if (!res.ok) throw new Error('Worker responded with ' + res.status);

      const { reply } = await res.json();
      history.push({ role: 'assistant', content: reply });
      hideTyping();
      appendBotMessage(reply);
    } catch {
      hideTyping();
      appendBotMessage('Sorry, I had trouble connecting. Please check your internet connection and try again.');
    } finally {
      isLoading = false;
      sendEl.disabled = inputEl.value.trim() === '';
    }
  }

  // ── Message rendering ─────────────────────────────────────────────────────────
  function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'cb-msg cb-user';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function appendBotMessage(text) {
    const el = document.createElement('div');
    el.className = 'cb-msg cb-bot';
    el.innerHTML = renderText(text);
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function renderText(raw) {
    // Step 1: Extract [LINK:url|label] markers before any escaping
    const linkPlaceholders = [];
    let processed = raw.replace(/\[LINK:([^\]|]+)\|([^\]]+)\]/g, function (_, url, label) {
      const fullUrl = BASE_URL + url;
      const safeUrl = fullUrl.replace(/"/g, '%22');
      const safeLabel = escapeHtml(label);
      linkPlaceholders.push('<a class="cb-nav-link" href="' + safeUrl + '">' + safeLabel + '</a>');
      return '\x00LINK' + (linkPlaceholders.length - 1) + '\x00';
    });

    // Step 2: Escape remaining HTML
    processed = escapeHtml(processed);

    // Step 3: Restore link placeholders (they are already safe HTML)
    processed = processed.replace(/\x00LINK(\d+)\x00/g, function (_, i) {
      return linkPlaceholders[parseInt(i, 10)];
    });

    // Step 4: Wrap `backtick` spans in <code>
    processed = processed.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Step 5: Convert newlines to <br>
    processed = processed.replace(/\n/g, '<br>');

    return processed;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Typing indicator ──────────────────────────────────────────────────────────
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'cb-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    if (typingEl && typingEl.parentNode) {
      typingEl.parentNode.removeChild(typingEl);
    }
    typingEl = null;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ── SVG icons ─────────────────────────────────────────────────────────────────
  function iconChat() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  }

  function iconClose() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  function iconSend() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDOM);
  } else {
    injectDOM();
  }
})();
