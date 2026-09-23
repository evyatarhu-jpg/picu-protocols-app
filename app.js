
const searchInput = document.getElementById("searchInput");
if (searchInput) {
  const cards = [...document.querySelectorAll(".protocol-card")];
  const sections = [...document.querySelectorAll(".category")];
  const noResults = document.getElementById("noResults");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    let found = false;
    cards.forEach(card => {
      const txt = ((card.dataset.name || "") + " " + card.innerText).toLowerCase();
      const show = txt.includes(q);
      card.style.display = show ? "flex" : "none";
      if (show) found = true;
    });
    sections.forEach(section => {
      const any = [...section.querySelectorAll(".protocol-card")].some(c => c.style.display !== "none");
      section.style.display = any ? "block" : "none";
    });
    noResults.style.display = found ? "none" : "block";
  });
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" }).then(reg => reg.update()).catch(()=>{}));
}
