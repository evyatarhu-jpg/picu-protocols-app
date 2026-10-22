(() => {
  'use strict';

  const STORAGE_THEME = 'picu-ui-theme';
  const STORAGE_LANG = 'picu-ui-language';
  const THEME_VALUES = new Set(['system', 'light', 'dark']);
  const mqDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const svg = {
    home: '<i class="fa-solid fa-house" aria-hidden="true"></i>',
    file: '<i class="fa-solid fa-file-lines" aria-hidden="true"></i>',
    gear: '<i class="fa-solid fa-gear" aria-hidden="true"></i>',
    up: '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>',
    sun: '<i class="fa-solid fa-sun" aria-hidden="true"></i>',
    moon: '<i class="fa-solid fa-moon" aria-hidden="true"></i>',
    close: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
  };

  function ensureFontAwesome() {
    if (document.getElementById('font-awesome-css')) return;
    const link = document.createElement('link');
    link.id = 'font-awesome-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
    link.referrerPolicy = 'no-referrer';
    document.head.appendChild(link);
  }

  ensureFontAwesome();

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
    document.querySelectorAll('.vnext-quick-theme').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.quickTheme === resolved));
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
    document.querySelectorAll('.to-top').forEach(el => {
      el.innerHTML = `${svg.up}<span>לראש הדף</span>`;
    });

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
      <button type="button" class="vnext-scroll-top" aria-label="לראש הדף">${svg.up}<span>לראש הדף</span></button>`;
    document.body.appendChild(dock);
    dock.querySelector('.vnext-scroll-top').addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

    const topControl = dock.querySelector('.vnext-scroll-top');
    let dockTimer = null;
    const updateTopAvailability = () => {
      const canGoTop = window.scrollY > 90;
      dock.classList.toggle('can-scroll-top', canGoTop);
      if (topControl) topControl.disabled = !canGoTop;
      return canGoTop;
    };
    const hideDock = () => dock.classList.remove('is-visible');
    const showDock = () => {
      updateTopAvailability();
      dock.classList.add('is-visible');
      clearTimeout(dockTimer);
      dockTimer = setTimeout(hideDock, 6000);
    };

    // Any new touch/click brings the temporary controls back.
    document.addEventListener('pointerdown', e => {
      if (e.target.closest('.vnext-settings-backdrop') || e.target.closest('.vnext-settings-toggle') || e.target.closest('.vnext-quick-theme')) return;
      showDock();
    }, { passive:true });

    dock.addEventListener('focusin', showDock);

    // Scrolling reveals the controls briefly. "Back to top" exists only after scrolling.
    window.addEventListener('scroll', () => {
      if (window.scrollY > 90) {
        showDock();
      } else {
        updateTopAvailability();
        hideDock();
        clearTimeout(dockTimer);
      }
    }, { passive:true });
    updateTopAvailability();
  }

  function initHome(settings) {
    document.body.classList.add('vnext-home');
    const header = document.querySelector('body > header');
    if (!header) return;

    const tools = document.createElement('div');
    tools.className = 'vnext-home-tools';

    const lightBtn = makeIconButton('מצב בהיר', svg.sun, 'vnext-quick-theme');
    lightBtn.dataset.quickTheme = 'light';
    lightBtn.addEventListener('click', e => {
      e.stopPropagation();
      safeSet(STORAGE_THEME, 'light');
      applyTheme('light');
    });

    const darkBtn = makeIconButton('מצב כהה', svg.moon, 'vnext-quick-theme');
    darkBtn.dataset.quickTheme = 'dark';
    darkBtn.addEventListener('click', e => {
      e.stopPropagation();
      safeSet(STORAGE_THEME, 'dark');
      applyTheme('dark');
    });

    const settingsBtn = makeIconButton('הגדרות', svg.gear, 'vnext-settings-toggle');
    settingsBtn.addEventListener('click', e => { e.stopPropagation(); settings?.open(); });

    tools.append(lightBtn, darkBtn, settingsBtn);
    header.appendChild(tools);
    applyTheme();

    const onScroll = () => header.classList.toggle('is-compact', window.scrollY > 44);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });

    const topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.className = 'vnext-home-top-dock';
    topBtn.setAttribute('aria-label', 'לראש הדף');
    topBtn.innerHTML = `${svg.up}<span>לראש הדף</span>`;
    topBtn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
    document.body.appendChild(topBtn);

    let timer = null;
    const hide = () => topBtn.classList.remove('is-visible');
    const show = () => {
      if (window.scrollY <= 120) {
        hide();
        clearTimeout(timer);
        return;
      }
      topBtn.classList.add('is-visible');
      clearTimeout(timer);
      timer = setTimeout(hide, 6000);
    };
    document.addEventListener('pointerdown', e => {
      if (e.target.closest('.vnext-settings-backdrop') || e.target.closest('.vnext-settings-toggle') || e.target.closest('.vnext-quick-theme')) return;
      show();
    }, { passive:true });
    window.addEventListener('scroll', () => {
      if (window.scrollY > 120) show();
      else {
        hide();
        clearTimeout(timer);
      }
    }, { passive:true });
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
