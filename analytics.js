
(() => {
  const cfg = window.PICU_ANALYTICS_CONFIG || {};
  const enabled =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR_PROJECT") &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

  const API = enabled ? `${cfg.SUPABASE_URL}/rest/v1/analytics_events` : null;

  const protocolMap = {
    "dka.html": "dka",
    "anticoagulation.html": "anticoagulation",
    "warfarin.html": "warfarin",
    "bivalirudin.html": "bivalirudin",
    "bleeding.html": "bleeding",
    "feeding.html": "feeding",
    "chylothorax.html": "chylothorax",
    "air-embolism.html": "air-embolism",
    "delirium.html": "delirium",
    "pain.html": "pain",
    "burn-pain.html": "burn-pain"
  };

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getInstallId() {
    let id = localStorage.getItem("picu_install_id");
    if (!id) {
      id = uuid();
      localStorage.setItem("picu_install_id", id);
    }
    return id;
  }

  function getSessionId() {
    let id = sessionStorage.getItem("picu_session_id");
    if (!id) {
      id = uuid();
      sessionStorage.setItem("picu_session_id", id);
    }
    return id;
  }

  function currentProtocol() {
    const file = location.pathname.split("/").pop() || "index.html";
    return protocolMap[file] || null;
  }

  function deviceType() {
    return matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop";
  }

  async function track(eventType, extra = {}) {
    if (!enabled) return;

    const payload = {
      installation_id: getInstallId(),
      session_id: getSessionId(),
      event_type: eventType,
      protocol_slug: extra.protocol_slug ?? currentProtocol(),
      search_mode: extra.search_mode ?? null,
      search_term_group: extra.search_term_group ?? null,
      result_count: Number.isFinite(extra.result_count) ? extra.result_count : null,
      issue_category: extra.issue_category ?? null,
      issue_text: extra.issue_text ?? null,
      device_type: deviceType(),
      app_version: cfg.APP_VERSION || null
    };

    try {
      await fetch(API, {
        method: "POST",
        headers: {
          "apikey": cfg.SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (_) {}
  }

  function addIssueButton() {
    const protocol = currentProtocol();
    if (!protocol || document.getElementById("reportIssueBtn")) return;

    const style = document.createElement("style");
    style.textContent = `
      #reportIssueBtn{position:fixed;right:14px;bottom:16px;z-index:1199;border:1px solid #d7e2ea;background:#fff;color:#0f4c81;border-radius:999px;padding:7px 10px;font-weight:800;font-size:13px;box-shadow:0 5px 14px rgba(15,76,129,.18);cursor:pointer}
      #issueModal{position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.38);display:none;align-items:center;justify-content:center;padding:18px}
      #issueModal.open{display:flex}
      #issueModal .box{width:min(520px,100%);background:#fff;border-radius:18px;padding:18px;direction:rtl;text-align:right;box-shadow:0 18px 50px rgba(0,0,0,.22)}
      #issueModal h3{margin:0 0 12px;color:#0f4c81}
      #issueModal select,#issueModal textarea{width:100%;font:inherit;border:1px solid #ccd9e2;border-radius:10px;padding:10px;margin:6px 0 10px;background:#fff}
      #issueModal textarea{min-height:90px;resize:vertical}
      #issueModal .warn{font-size:12px;color:#8f1f18;background:#fff0ef;padding:8px;border-radius:8px}
      #issueModal .buttons{display:flex;gap:8px;justify-content:flex-start;margin-top:12px}
      #issueModal button{font:inherit;font-weight:800;border-radius:10px;padding:9px 13px;cursor:pointer}
      #issueSend{background:#0f4c81;color:#fff;border:1px solid #0f4c81}
      #issueCancel{background:#fff;color:#0f4c81;border:1px solid #ccd9e2}
    `;
    document.head.appendChild(style);

    const btn = document.createElement("button");
    btn.id = "reportIssueBtn";
    btn.type = "button";
    btn.textContent = "⚑ דווח על בעיה";
    document.body.appendChild(btn);

    const modal = document.createElement("div");
    modal.id = "issueModal";
    modal.innerHTML = `
      <div class="box" role="dialog" aria-modal="true">
        <h3>דיווח על בעיה בפרוטוקול</h3>
        <label>סוג הבעיה</label>
        <select id="issueCategory">
          <option value="content">תוכן לא ברור / לא מדויק</option>
          <option value="dose">מינון או נתון שנראה חשוד</option>
          <option value="source">מסמך המקור לא נפתח</option>
          <option value="navigation">ניווט / חיפוש</option>
          <option value="display">תצוגה / עיצוב</option>
          <option value="other">אחר</option>
        </select>
        <label>פירוט קצר — אופציונלי</label>
        <textarea id="issueText" maxlength="500" placeholder="מה קרה?"></textarea>
        <div class="warn">אין להזין שם מטופל, תעודת זהות או מידע רפואי מזהה.</div>
        <div class="buttons">
          <button id="issueSend" type="button">שלח דיווח</button>
          <button id="issueCancel" type="button">ביטול</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    btn.addEventListener("click", () => modal.classList.add("open"));
    modal.querySelector("#issueCancel").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });

    modal.querySelector("#issueSend").addEventListener("click", async () => {
      const category = modal.querySelector("#issueCategory").value;
      const text = modal.querySelector("#issueText").value.trim().slice(0, 500);
      await track("issue_report", { issue_category: category, issue_text: text || null });
      modal.querySelector("#issueText").value = "";
      modal.classList.remove("open");
      btn.textContent = "✓ הדיווח נשלח";
      setTimeout(() => btn.textContent = "⚑ דווח על בעיה", 1800);
    });
  }

  function hookSourceButtons() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="originals/"]');
      if (a) track("source_open");
    });
  }

  function hookHomeSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    let timer;
    let nextMode = "typed";
    const voice = document.getElementById("voiceSearch");
    if (voice) {
      voice.addEventListener("click", () => {
        nextMode = "voice";
        setTimeout(() => { nextMode = "typed"; }, 15000);
      });
    }

    const reportSearch = () => {
      const q = input.value.trim();
      if (!q) return;
      const cards = [...document.querySelectorAll(".protocol-card")];
      const visible = cards.filter(c => getComputedStyle(c).display !== "none");
      const slugs = visible.map(c => protocolMap[(c.getAttribute("href") || "").split("?")[0].split("#")[0]]).filter(Boolean);
      track("search", {
        search_mode: nextMode,
        search_term_group: slugs.length ? slugs.join(",") : "no-result",
        result_count: visible.length
      });
      nextMode = "typed";
    };

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(reportSearch, 1000);
    });
  }

  window.PICUAnalytics = { track };

  document.addEventListener("DOMContentLoaded", () => {
    const isHome = location.pathname.endsWith("index.html") || location.pathname.endsWith("/");
    track(isHome ? "app_open" : "protocol_open");
    addIssueButton();
    hookSourceButtons();
    hookHomeSearch();
  });
})();
