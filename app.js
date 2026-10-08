const searchInput = document.getElementById("searchInput");
const voiceButton = document.getElementById("voiceSearch");
const cards = [...document.querySelectorAll(".protocol-card")];
const categories = [...document.querySelectorAll(".category")];
const noResults = document.getElementById("noResults");

/* מילון חיפוש לפי פרוטוקול */
const protocolAliases = {
  "dka.html": [
    "dka",
    "די קיי איי",
    "די קיי א",
    "די קיי"
  ],

  "anticoagulation.html": [
    "טרומבוליזה",
    "הפרין",
    "ufh",
    "יו אף אייץ",
    "קלקסן",
    "קסרלטו",
    "קזרלטו",
    "קסרלתו",
    "קסראלטו",
    "קסרלטה",
    "סרלטו",
    "xarelto",
    "tpa",
    "טי פי איי",
    "טי פי א",
    "anti xa",
    "אנטי אקס איי"
  ],

  "warfarin.html": [
    "קומדין",
    "וורפרין",
    "warfarin",
    "inr",
    "איי אן אר",
    "אי אן אר",
    "אינר",
    "אין אר"
  ],

  "bivalirudin.html": [
    "אנגיומקס",
    "אנגימקס",
    "אנגיומאקס",
    "ביבלירודין",
    "ביוולירודין",
    "bivalirudin",
    "angiomax",
    "hit",
    "היט",
    "אייץ איי טי"
  ],

  "bleeding.html": [
    "דימום",
    "דימום אחרי ניתוח",
    "דימום לאחר ניתוח",
    "mtp",
    "אם טי פי"
  ],

  "feeding.html": [
    "הזנה",
    "vis",
    "וי איי אס",
    "ויס"
  ],

  "chylothorax.html": [
    "אוקטראוטייד",
    "אוקטראוטיד",
    "אוקטריאוטייד",
    "אוקטריאוטיד",
    "כילותורקס",
    "חילותורקס",
    "כילוטורקס",
    "קילותורקס"
  ],

  "air-embolism.html": [
    "תסחיף",
    "תסחיף אויר",
    "תסחיף אוויר",
    "ct",
    "סי טי"
  ],

  "delirium.html": [
    "דליריום",
    "capd",
    "סי איי פי די",
    "קאפד",
    "תסמונת גמילה"
  ],

  "pain.html": [
    "כאב",
    "טיפול בכאב"
  ],


  "tbi.html": ["tbi","טי בי איי","חבלת ראש","פגיעת ראש","טראומה ראש","נוירוטראומה","icp","cpp"],

  "sildenafil.html": ["sildenafil","סילדנפיל","סילדאפיל","revatio","רבאטיו","יתר לחץ דם ריאתי","pulmonary hypertension"],

  "levosimendan.html": ["levosimendan","לבוסימנדן","לבוסימנדאן","simdax","סימדקס","אי ספיקת לב","מיוקרדיטיס"],

  "iloprost.html": ["iloprost","אילופרוסט","אילומדין","ilomedin","גפה איסכמית","איסכמיה בגפה"],

  "burn-pain.html": [
    "כאב",
    "כוויות",
    "כוויה",
    "כאב לאחר כוויות"
  ]
};

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/ך/g, "כ")
    .replace(/ם/g, "מ")
    .replace(/ן/g, "נ")
    .replace(/ף/g, "פ")
    .replace(/ץ/g, "צ")
    .replace(/[־–—-]/g, " ")
    .replace(/[.,:;()\/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCardFile(card) {
  const href = card.getAttribute("href") || "";
  return href.split("?")[0].split("#")[0];
}


function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function fuzzyMatch(query, alias) {
  if (!query || !alias) return false;

  if (query === alias || query.includes(alias) || alias.includes(query)) {
    return true;
  }

  const queryWords = query.split(" ");
  const aliasWords = alias.split(" ");

  return queryWords.some(qw =>
    aliasWords.some(aw => {
      if (qw.length < 4 || aw.length < 4) return false;

      const maxLen = Math.max(qw.length, aw.length);

      let allowed = 1;
      if (maxLen >= 7) allowed = 2;
      if (maxLen >= 11) allowed = 3;

      return editDistance(qw, aw) <= allowed;
    })
  );
}

function cardMatches(card, value) {
  const query = normalizeText(value);
  if (!query) return true;

  const file = getCardFile(card);
  const aliases = (protocolAliases[file] || []).map(normalizeText);

  const visibleText = normalizeText(
    card.textContent + " " + (card.dataset.name || "")
  );

  if (visibleText.includes(query)) return true;

  return aliases.some(alias =>
    fuzzyMatch(query, alias)
  );
}

function performSearch(value) {
  const query = normalizeText(value);
  let visibleCount = 0;

  cards.forEach(card => {
    const visible = cardMatches(card, value);

    card.style.display = visible ? "" : "none";

    if (visible) visibleCount++;
  });

  categories.forEach(category => {
    const hasVisibleCard =
      [...category.querySelectorAll(".protocol-card")]
        .some(card => card.style.display !== "none");

    category.style.display = hasVisibleCard ? "" : "none";
  });

  if (noResults) {
    noResults.style.display =
      visibleCount === 0 && query !== "" ? "block" : "none";
  }
}

if (searchInput) {
  searchInput.addEventListener("input", e => {
    performSearch(e.target.value);
  });
}


/* חיפוש קולי */
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (voiceButton) {

  if (!SpeechRecognition) {
    voiceButton.style.display = "none";

  } else {

    const recognition = new SpeechRecognition();

    recognition.lang = "he-IL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    voiceButton.addEventListener("click", () => {
      try {
        recognition.start();
        voiceButton.classList.add("listening");
        voiceButton.textContent = "🔴";
      } catch (e) {}
    });

    recognition.addEventListener("result", event => {

      const results =
        event.results[event.results.length - 1];

      let spoken = results[0].transcript;

      /*
       * אם יש כמה חלופות מזיהוי הדיבור,
       * נבחר את הראשונה שמחזירה תוצאה.
       */
      for (let i = 0; i < results.length; i++) {

        const candidate = results[i].transcript;
        const q = normalizeText(candidate);

        const found = cards.some(card => cardMatches(card, candidate));

        if (found) {
          spoken = candidate;
          break;
        }
      }

      searchInput.value = spoken;
      performSearch(spoken);
    });

    recognition.addEventListener("end", () => {
      voiceButton.classList.remove("listening");
      voiceButton.textContent = "🎙️";
    });

    recognition.addEventListener("error", () => {
      voiceButton.classList.remove("listening");
      voiceButton.textContent = "🎙️";
    });
  }
}


/* PWA */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}
