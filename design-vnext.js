(() => {
  'use strict';

  const STORAGE_THEME = 'picu-ui-theme';
  const STORAGE_LANG = 'picu-ui-language';
  const THEME_VALUES = new Set(['system', 'light', 'dark']);
  const mqDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const svg = {
    home: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6" stroke-width="2" stroke-linejoin="round"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l4 4v14H7z" stroke-width="2" stroke-linejoin="round"/><path d="M14 3v5h5M10 12h5M10 16h5" stroke-width="2" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke-width="2"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.99l.05.05-2.77 2.77-.05-.05A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1.1 1.64V21h-3.8v-.07A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.99.36l-.05.05-2.77-2.77.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.64-1.1H3v-3.8h.07A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.99l-.05-.05 2.77-2.77.05.05A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1.1-1.64V3h3.8v.07A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.99-.36l.05-.05 2.77 2.77-.05.05A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.64 1.1H21v3.8h-.07A1.8 1.8 0 0 0 19.4 15Z" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 14 6-6 6 6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '×'
  };

  function safeGet(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function savedTheme() {
    const value = safeGet(STORAGE_THEME, 'system');
    return THEME_VALUES.has(value) ? value : 'system';
  }

  function resolvedTheme(choice = savedTheme()) {
    if (choice === 'system') return mqDark && mqDark.matches ? 'dark' : 'light';
    return choice;
  }

  function applyTheme(choice = savedTheme()) {
    const resolved = resolvedTheme(choice);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeChoice = choice;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0b1117' : '#0f5b8d');
    document.querySelectorAll('.vnext-theme-option').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === choice));
    });
  }

  function makeIconButton(label, iconMarkup, className = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `vnext-icon-button ${className}`.trim();
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.innerHTML = iconMarkup;
    return btn;
  }

  function buildSettings() {
    if (document.querySelector('.vnext-settings-backdrop')) return null;

    const backdrop = document.createElement('div');
    backdrop.className = 'vnext-settings-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = `
      <section class="vnext-settings-panel" role="dialog" aria-modal="true" aria-labelledby="vnextSettingsTitle">
        <div class="vnext-settings-head">
          <h2 id="vnextSettingsTitle">הגדרות</h2>
          <button class="vnext-settings-close" type="button" aria-label="סגירת הגדרות">${svg.close}</button>
        </div>
        <div class="vnext-setting-row">
          <div class="vnext-setting-label">תצוגה</div>
          <div class="vnext-theme-options" role="group" aria-label="מצב תצוגה">
            <button type="button" class="vnext-theme-option" data-theme-choice="system">מערכת</button>
            <button type="button" class="vnext-theme-option" data-theme-choice="light">בהיר</button>
            <button type="button" class="vnext-theme-option" data-theme-choice="dark">כהה</button>
          </div>
          <div class="vnext-setting-help">במצב „מערכת” האפליקציה מתאימה את עצמה אוטומטית להגדרת הטלפון.</div>
        </div>
        <div class="vnext-setting-row">
          <div class="vnext-setting-label">שפה</div>
          <select id="vnextLanguage" aria-label="שפה">
            <option value="he">עברית</option>
          </select>
          <div class="vnext-setting-help">התשתית מוכנה להוספת שפות נוספות בהמשך.</div>
        </div>
      </section>`;

    document.body.appendChild(backdrop);

    const close = () => {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    };
    const open = () => {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
      setTimeout(() => backdrop.querySelector('.vnext-settings-close')?.focus(), 0);
    };

    backdrop.querySelector('.vnext-settings-close').addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    backdrop.querySelectorAll('.vnext-theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.themeChoice;
        safeSet(STORAGE_THEME, choice);
        applyTheme(choice);
        // Theme selection is a complete action: close Settings automatically.
        setTimeout(close, 120);
      });
    });

    const lang = backdrop.querySelector('#vnextLanguage');
    const savedLang = safeGet(STORAGE_LANG, 'he');
    lang.value = savedLang === 'he' ? 'he' : 'he';
    lang.addEventListener('change', () => safeSet(STORAGE_LANG, lang.value));

    applyTheme();
    return { backdrop, open, close };
  }

  function protocolTitle() {
    return document.querySelector('.hero h1')?.textContent?.trim() || document.title || 'פרוטוקול';
  }

  function convertHeaderAction(anchor, type, label) {
    if (!anchor) return;
    anchor.textContent = '';
    anchor.innerHTML = type === 'home' ? svg.home : svg.file;
    anchor.setAttribute('aria-label', label);
    anchor.setAttribute('title', label);
  }

  function initProtocol(settings) {
    const bar = document.querySelector('.appbar');
    if (!bar) return;
    document.body.classList.add('vnext-protocol');

    // Remove redundant browser-back control.
    [...bar.querySelectorAll('a')].forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      const txt = (a.textContent || '').trim();
      if (href.includes('history.back') || txt === 'חזרה') a.remove();
    });

    bar.classList.add('vnext-appbar');
    const titleBox = document.createElement('div');
    titleBox.className = 'vnext-appbar-title';
    titleBox.innerHTML = `<small>פרוטוקול</small><strong>${escapeHtml(protocolTitle())}</strong>`;
    bar.prepend(titleBox);

    const actions = bar.querySelector('.actions') || (() => {
      const div = document.createElement('div');
      div.className = 'actions';
      bar.appendChild(div);
      return div;
    })();

    const home = actions.querySelector('a[href*="index.html"]');
    const source = [...actions.querySelectorAll('a')].find(a => /originals\//i.test(a.getAttribute('href') || ''));
    convertHeaderAction(home, 'home', 'מסך ראשי');
    convertHeaderAction(source, 'file', 'מסמך מקור');

    const settingsBtn = makeIconButton('הגדרות', svg.gear, 'vnext-settings-toggle');
    settingsBtn.addEventListener('click', e => { e.stopPropagation(); settings?.open(); });
    actions.appendChild(settingsBtn);

    const onScroll = () => bar.classList.toggle('is-compact', window.scrollY > 54);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });

    // Build temporary lower action dock from the page's actual source link.
    const dock = document.createElement('nav');
    dock.className = 'vnext-action-dock';
    dock.setAttribute('aria-label', 'פעולות מהירות');
    const sourceHref = source?.getAttribute('href') || document.querySelector('a[href*="originals/"]')?.getAttribute('href') || '#';
    dock.innerHTML = `
      <a href="index.html" aria-label="מסך ראשי">${svg.home}<span>ראשי</span></a>
      <a class="source-action" href="${escapeAttr(sourceHref)}" target="_blank" rel="noopener" aria-label="מסמך מקור">${svg.file}<span>מקור</span></a>
      <button type="button" class="vnext-scroll-top" aria-label="לראש הדף">${svg.up}<span>למעלה</span></button>`;
    document.body.appendChild(dock);
    dock.querySelector('.vnext-scroll-top').addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

    let dockTimer = null;
    const showDock = () => {
      dock.classList.add('is-visible');
      clearTimeout(dockTimer);
      dockTimer = setTimeout(() => dock.classList.remove('is-visible'), 20000);
    };

    // A deliberate screen touch/click reveals the controls for 20 seconds.
    document.addEventListener('pointerdown', e => {
      if (e.target.closest('.vnext-settings-backdrop') || e.target.closest('.vnext-settings-toggle')) return;
      showDock();
    }, { passive:true });

    dock.addEventListener('focusin', showDock);
  }

  function initHome(settings) {
    document.body.classList.add('vnext-home');
    const header = document.querySelector('body > header');
    if (!header) return;

    const settingsBtn = makeIconButton('הגדרות', svg.gear, 'vnext-settings-toggle');
    settingsBtn.addEventListener('click', e => { e.stopPropagation(); settings?.open(); });
    header.appendChild(settingsBtn);

    const onScroll = () => header.classList.toggle('is-compact', window.scrollY > 44);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });

    const topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.className = 'vnext-home-top-dock';
    topBtn.setAttribute('aria-label', 'לראש הדף');
    topBtn.innerHTML = svg.up;
    topBtn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
    document.body.appendChild(topBtn);

    let timer = null;
    const show = () => {
      if (window.scrollY < 180) return;
      topBtn.classList.add('is-visible');
      clearTimeout(timer);
      timer = setTimeout(() => topBtn.classList.remove('is-visible'), 20000);
    };
    document.addEventListener('pointerdown', e => {
      if (e.target.closest('.vnext-settings-backdrop') || e.target.closest('.vnext-settings-toggle')) return;
      show();
    }, { passive:true });
    window.addEventListener('scroll', () => { if (window.scrollY < 120) topBtn.classList.remove('is-visible'); }, { passive:true });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }
  function escapeAttr(value) { return escapeHtml(value); }

  // Apply before building the sheet to minimize theme flash.
  applyTheme();

  document.addEventListener('DOMContentLoaded', () => {
    const settings = buildSettings();
    if (document.querySelector('.appbar') && document.querySelector('.hero')) initProtocol(settings);
    else if (document.getElementById('searchInput') && document.querySelector('.protocol-grid')) initHome(settings);
  });

  if (mqDark) {
    const handler = () => { if (savedTheme() === 'system') applyTheme('system'); };
    if (mqDark.addEventListener) mqDark.addEventListener('change', handler);
    else if (mqDark.addListener) mqDark.addListener(handler);
  }
})();
