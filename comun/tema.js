/* Tema luminoasă / întunecată / automată (după sistem), salvată în browser */
"use strict";

const Tema = {
  cheie: "ar-tema",
  aplica(t) {
    const r = document.documentElement;
    if (t === "light" || t === "dark") r.setAttribute("data-theme", t); else r.removeAttribute("data-theme");
    Stocare.scrie(this.cheie, t || "auto");
    $$(".comutator-tema button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tema === (t || "auto") ? "true" : "false"));
    window.dispatchEvent(new Event("schimbare-tema"));
  },
  curenta() { return Stocare.citeste(this.cheie, "auto"); },
  /** HTML-ul comutatorului (se pune în antet) */
  html() {
    return `<div class="comutator-tema" role="group" aria-label="Tema de culori">
      <button type="button" data-tema="auto" title="Automată (după sistem)" aria-label="Temă automată"><svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg></button>
      <button type="button" data-tema="light" title="Luminoasă" aria-label="Temă luminoasă"><svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="3.6" fill="currentColor"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 1.8v2.2M10 16v2.2M1.8 10H4M16 10h2.2M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M4.2 15.8l1.6-1.6M14.2 5.8l1.6-1.6"/></g></svg></button>
      <button type="button" data-tema="dark" title="Întunecată" aria-label="Temă întunecată"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M15.5 12.6A6.8 6.8 0 0 1 7.4 4.5a6.8 6.8 0 1 0 8.1 8.1z" fill="currentColor"/></svg></button>
    </div>`;
  },
  leaga() {
    $$(".comutator-tema button").forEach(b => b.addEventListener("click", () => this.aplica(b.dataset.tema)));
    this.aplica(this.curenta());
    if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (this.curenta() === "auto") window.dispatchEvent(new Event("schimbare-tema")); });
  }
};
// aplicare imediată (înainte de randare), ca să nu clipească pagina
(function () { try { const t = JSON.parse(localStorage.getItem("ar-tema") || '"auto"'); if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); } catch (e) { } })();
