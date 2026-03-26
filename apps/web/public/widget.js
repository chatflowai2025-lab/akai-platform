(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var clientId = script.getAttribute('data-client-id') || 'demo';
  var widgetBaseUrl = 'https://getakai.ai';

  // ── State ──────────────────────────────────────────────────────────────────
  var isOpen = false;
  var container = null;
  var bubble = null;

  // ── Styles ─────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#akai-widget-bubble {',
    '  position: fixed;',
    '  bottom: 24px;',
    '  right: 24px;',
    '  width: 56px;',
    '  height: 56px;',
    '  border-radius: 50%;',
    '  background: #0a1628;',
    '  box-shadow: 0 4px 16px rgba(0,0,0,0.28);',
    '  cursor: pointer;',
    '  z-index: 2147483647;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  border: none;',
    '  transition: transform 0.2s ease, box-shadow 0.2s ease;',
    '  outline: none;',
    '}',
    '#akai-widget-bubble:hover {',
    '  transform: scale(1.08);',
    '  box-shadow: 0 6px 24px rgba(0,0,0,0.36);',
    '}',
    '#akai-widget-bubble svg {',
    '  width: 26px;',
    '  height: 26px;',
    '}',
    '#akai-widget-container {',
    '  position: fixed;',
    '  bottom: 92px;',
    '  right: 24px;',
    '  width: 360px;',
    '  height: 520px;',
    '  border-radius: 16px;',
    '  overflow: hidden;',
    '  box-shadow: 0 8px 40px rgba(0,0,0,0.32);',
    '  z-index: 2147483646;',
    '  display: none;',
    '  flex-direction: column;',
    '  border: 1px solid rgba(255,255,255,0.08);',
    '}',
    '#akai-widget-container.open {',
    '  display: flex;',
    '}',
    '#akai-widget-close {',
    '  position: absolute;',
    '  top: 10px;',
    '  right: 10px;',
    '  width: 28px;',
    '  height: 28px;',
    '  background: rgba(0,0,0,0.5);',
    '  border: none;',
    '  border-radius: 50%;',
    '  color: white;',
    '  font-size: 14px;',
    '  cursor: pointer;',
    '  z-index: 2147483648;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  line-height: 1;',
    '  transition: background 0.2s;',
    '}',
    '#akai-widget-close:hover {',
    '  background: rgba(0,0,0,0.75);',
    '}',
    '#akai-widget-iframe {',
    '  width: 100%;',
    '  height: 100%;',
    '  border: none;',
    '  display: block;',
    '}',
    '@media (max-width: 480px) {',
    '  #akai-widget-container {',
    '    width: calc(100vw - 16px);',
    '    height: 480px;',
    '    bottom: 84px;',
    '    right: 8px;',
    '    left: 8px;',
    '  }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ── Bubble button ──────────────────────────────────────────────────────────
  bubble = document.createElement('button');
  bubble.id = 'akai-widget-bubble';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  // ── Widget container + iframe ──────────────────────────────────────────────
  container = document.createElement('div');
  container.id = 'akai-widget-container';

  var closeBtn = document.createElement('button');
  closeBtn.id = 'akai-widget-close';
  closeBtn.setAttribute('aria-label', 'Close chat');
  closeBtn.innerHTML = '&#x2715;';

  var iframe = document.createElement('iframe');
  iframe.id = 'akai-widget-iframe';
  iframe.src = widgetBaseUrl + '/chat-widget?clientId=' + encodeURIComponent(clientId);
  iframe.setAttribute('allow', 'microphone');
  iframe.setAttribute('title', 'Chat with us');

  container.appendChild(closeBtn);
  container.appendChild(iframe);

  // ── Toggle logic ───────────────────────────────────────────────────────────
  function openWidget() {
    isOpen = true;
    container.classList.add('open');
    bubble.setAttribute('aria-label', 'Close chat');
    bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  }

  function closeWidget() {
    isOpen = false;
    container.classList.remove('open');
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  }

  bubble.addEventListener('click', function () {
    if (isOpen) { closeWidget(); } else { openWidget(); }
  });

  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    closeWidget();
  });

  // Inject into DOM after page load
  function inject() {
    document.body.appendChild(bubble);
    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
