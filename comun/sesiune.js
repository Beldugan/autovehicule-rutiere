/* Sesiunea studentului: identificare, prezență (cod de sesiune), integritatea lucrului, trimiterea referatului */
"use strict";

const MOD = { eval: false };
let STUDENT = null; // {nume, email, grupa, cod, token, start, seed}

/* ---------- jurnalul de integritate */
const INTEG0 = () => ({
  tastari: 0, caractere: 0, lipiri: 0, respinse: 0, programatic: 0, netrusted: 0,
  intervale: [], ultimaTasta: 0, ascunsNr: 0, ascunsMs: 0, ascunsDe: 0,
  honeypot: false, webdriver: !!navigator.webdriver, inregistrari: 0, mutariMouse: 0
});
let INTEG = INTEG0();
const cheieSt = () => "ar-sesiune-" + LAB.cod;
const salveazaInteg = () => Stocare.scrie(cheieSt() + "-integ", INTEG);

document.addEventListener("visibilitychange", () => {
  if (!MOD.eval) return;
  if (document.hidden) { INTEG.ascunsNr++; INTEG.ascunsDe = Date.now(); }
  else if (INTEG.ascunsDe) { INTEG.ascunsMs += Date.now() - INTEG.ascunsDe; INTEG.ascunsDe = 0; }
  salveazaInteg();
});
document.addEventListener("pointermove", e => { if (e.isTrusted) INTEG.mutariMouse++; }, { passive: true });

/* ---------- protecția la tastare: fără lipire, fără text introdus de scripturi, fără inserări în bloc */
const TIPURI_PERMISE = new Set(["insertText", "insertCompositionText", "insertReplacementText", "deleteContentBackward", "deleteContentForward", "deleteWordBackward", "deleteWordForward", "deleteSoftLineBackward", "deleteHardLineBackward", "insertLineBreak", "insertParagraph", "historyUndo", "historyRedo", "deleteByCut"]);
function avertizeazaRef(text) {
  const s = $("#ref-stare"); if (!s) return;
  s.className = "verdict atentie"; s.textContent = text;
  clearTimeout(avertizeazaRef.t); avertizeazaRef.t = setTimeout(() => { if (s.textContent === text) { s.textContent = ""; s.className = ""; } }, 5000);
}
function pazaTastare(el, laSchimbare) {
  el.setAttribute("autocomplete", "off"); el.setAttribute("autocorrect", "off");
  el.setAttribute("data-gramm", "false"); el.setAttribute("data-lt-active", "false");
  let bun = el.value;
  const blocheaza = (e, motiv) => { e.preventDefault(); INTEG.lipiri++; salveazaInteg(); avertizeazaRef(motiv); };
  el.addEventListener("paste", e => blocheaza(e, "Lipirea textului nu este permisă: scrieți cu propriile cuvinte."));
  el.addEventListener("drop", e => blocheaza(e, "Nu se pot trage texte în acest câmp."));
  el.addEventListener("beforeinput", e => {
    const lung = (e.data || "").length, lim = e.inputType === "insertText" ? 2 : 25;
    if (!e.isTrusted || !TIPURI_PERMISE.has(e.inputType) || lung > lim) { e.preventDefault(); INTEG.respinse++; if (!e.isTrusted) INTEG.netrusted++; salveazaInteg(); }
  });
  el.addEventListener("input", e => {
    if (!e.isTrusted) { el.value = bun; INTEG.netrusted++; INTEG.respinse++; return; }
    const delta = el.value.length - bun.length;
    if (delta > 25) { el.value = bun; INTEG.respinse++; salveazaInteg(); return; }
    if (delta > 0) INTEG.caractere += delta;
    bun = el.value; salveazaInteg();
    if (laSchimbare) laSchimbare(bun);
  });
  el.addEventListener("keydown", e => {
    if (!e.isTrusted) { INTEG.netrusted++; return; }
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      INTEG.tastari++;
      const now = performance.now();
      if (INTEG.ultimaTasta && now - INTEG.ultimaTasta < 4000) { INTEG.intervale.push(Math.round(now - INTEG.ultimaTasta)); if (INTEG.intervale.length > 3000) INTEG.intervale.shift(); }
      INTEG.ultimaTasta = now;
    }
  });
  setInterval(() => { if (el.value !== bun) { el.value = bun; INTEG.programatic++; salveazaInteg(); avertizeazaRef("Textul a fost modificat din afara tastaturii și a fost anulat."); } }, 700);
  el.valoareBuna = () => bun;
  el.seteaza = v => { bun = v; el.value = v; };
}

function analizaIntegritate(textTotal) {
  const motive = [], note = [];
  const iv = INTEG.intervale.slice().sort((a, b) => a - b);
  const med = iv.length ? iv[Math.floor(iv.length / 2)] : 0;
  const medie = iv.length ? iv.reduce((s, x) => s + x, 0) / iv.length : 0;
  const cv = iv.length > 1 ? Math.sqrt(iv.reduce((s, x) => s + (x - medie) ** 2, 0) / iv.length) / medie : 1;
  if (INTEG.webdriver) motive.push("browser automatizat (webdriver)");
  if (INTEG.honeypot) motive.push("câmpul-capcană pentru asistenți automați a fost completat");
  if (INTEG.programatic > 0) motive.push(`text modificat de scripturi (${INTEG.programatic}×)`);
  if (INTEG.netrusted > 0) motive.push(`evenimente sintetice (${INTEG.netrusted})`);
  if (INTEG.respinse > 5) motive.push(`inserări de text în bloc respinse (${INTEG.respinse})`);
  if (iv.length >= 80 && med < 45) motive.push(`tastare anormal de rapidă (median ${med} ms între taste)`);
  if (iv.length >= 80 && cv < 0.3) motive.push(`ritm de tastare anormal de uniform (CV = ${cv.toFixed(2)})`);
  if (textTotal > 50 && INTEG.caractere < 0.8 * textTotal) motive.push("textul final este mai lung decât textul tastat");
  if (INTEG.lipiri > 0) note.push(`încercări de lipire blocate: ${INTEG.lipiri}`);
  if (INTEG.ascunsNr > 0) note.push(`a părăsit pagina de ${INTEG.ascunsNr} ori (${Math.round(INTEG.ascunsMs / 60000)} min)`);
  const log = Cadru.D.log.filter(l => l.ms != null);
  if (STUDENT && log.length) {
    const durata = log[log.length - 1].ms / 60000;
    if (durata < PORTAL.referat.minDurataMin) motive.push(`determinări efectuate în doar ${durata.toFixed(1)} min`);
  }
  return { status: motive.length ? "DE VERIFICAT" : "OK", motive, note, med, cv: +cv.toFixed(2), tastari: INTEG.tastari, caractere: INTEG.caractere, mouse: INTEG.mutariMouse };
}

/* ---------- comunicarea cu Apps Script (o foaie de calcul pe disciplină) */
const endpointDisc = () => (PORTAL.discipline[LAB.disc] || {}).endpoint || "";
async function apelServer(params, corp) {
  const U = endpointDisc();
  if (!U) throw new Error("Disciplina nu este conectată încă la registrul de prezență.");
  let r;
  if (corp) r = await fetch(U, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(corp) });
  else r = await fetch(U + "?" + new URLSearchParams(params).toString());
  const j = await r.json();
  if (!j.ok) throw new Error(j.eroare || "Eroare la server.");
  return j;
}

/* ---------- bara studentului */
function incarcaStudent() {
  STUDENT = Stocare.citeste(cheieSt(), null);
  INTEG = Object.assign(INTEG0(), Stocare.citeste(cheieSt() + "-integ", {}), { webdriver: !!navigator.webdriver });
  if (STUDENT && STUDENT.token) MOD.eval = true;
  randeazaBaraStudent();
}
function randeazaBaraStudent() {
  const b = $("#bara-student");
  if (MOD.eval && STUDENT) {
    const ora = new Date(STUDENT.start).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    b.innerHTML = `<div class="st-info"><b>${esc(STUDENT.nume)}</b> · ${esc(STUDENT.grupa)} · ${esc(STUDENT.email)}<br><span class="ok-txt">✓ Prezență înregistrată la ${ora}</span> · lucrare individuală – datele voastre sunt unice</div><button type="button" id="btn-iesire">Ieșire</button>`;
    $("#btn-iesire").addEventListener("click", iesire);
    return;
  }
  const id = Stocare.citeste("ar-student-id", {});
  const conectat = !!endpointDisc();
  b.innerHTML = `<div class="st-form">
    <label class="camp">Nume și prenume<input id="st-nume" autocomplete="name" maxlength="80" value="${esc(id.nume || "")}"></label>
    <label class="camp">E-mail (contul din Google Classroom)<input id="st-email" type="email" autocomplete="email" maxlength="100" value="${esc(id.email || "")}"></label>
    <label class="camp">Grupa / subgrupa<input id="st-grupa" maxlength="40" value="${esc(id.grupa || "")}"></label>
    <label class="camp">Codul sesiunii (afișat de cadrul didactic)<input id="st-cod" maxlength="16" style="text-transform:uppercase;letter-spacing:.15em" autocomplete="off"></label>
    <button type="button" class="primar" id="btn-start"${conectat ? "" : " disabled"}>Începe laboratorul</button>
  </div><p class="nota" id="st-msg">${conectat ? "Introduceți datele și codul afișat în laborator. Prezența se înregistrează automat." : "Mod demonstrativ: această disciplină nu este încă conectată la registrul de prezență; referatul nu poate fi trimis."}</p>`;
  $("#btn-start").addEventListener("click", startLab);
}

async function startLab(e) {
  const msg = $("#st-msg");
  if (!e.isTrusted || navigator.webdriver) { msg.textContent = "Aplicația trebuie folosită direct de student, nu printr-un program automat."; return; }
  const nume = $("#st-nume").value.trim().replace(/\s+/g, " "), email = $("#st-email").value.trim().toLowerCase(), grupa = $("#st-grupa").value.trim(), cod = $("#st-cod").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (nume.split(" ").length < 2) { msg.textContent = "Scrieți numele complet (nume și prenume)."; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || (PORTAL.domeniuEmail && !email.endsWith("@" + PORTAL.domeniuEmail))) { msg.textContent = "Adresa de e-mail nu este validă."; return; }
  if (!grupa) { msg.textContent = "Completați grupa."; return; }
  if (cod.length < 6) { msg.textContent = "Introduceți codul sesiunii, afișat de cadrul didactic."; return; }
  msg.textContent = "Se verifică codul…";
  try {
    const j = await apelServer({ action: "start", disc: LAB.disc, lab: LAB.nr, nume, email, grupa, cod });
    Stocare.scrie("ar-student-id", { nume, email, grupa });
    STUDENT = { nume, email, grupa, cod, token: j.token, start: j.start, seed: j.seed };
    Stocare.scrie(cheieSt(), STUDENT);
    INTEG = INTEG0(); salveazaInteg();
    MOD.eval = true;
    Cadru.lucrareNoua();
    randeazaBaraStudent();
    Cadru.mesajTemporar("Laborator început. Parcurgeți pregătirea NSSM, apoi determinările.", "");
  } catch (err) { msg.textContent = err.message; }
}
function iesire() {
  const b = $("#btn-iesire");
  if (b.dataset.armat !== "1") { b.dataset.armat = "1"; b.textContent = "Confirmați ieșirea (datele locale ale lucrării se șterg)"; setTimeout(() => { b.dataset.armat = ""; b.textContent = "Ieșire"; }, 3500); return; }
  Stocare.sterge(cheieSt()); Stocare.sterge(cheieSt() + "-integ"); Stocare.sterge("ar-lucrare-" + LAB.cod);
  location.reload();
}

/* ---------- trimiterea referatului */
async function trimiteReferat(e) {
  const st = $("#ref-stare");
  if (!e.isTrusted || navigator.webdriver) { INTEG.netrusted++; st.className = "verdict atentie"; st.textContent = "Trimiterea trebuie făcută de student."; return; }
  if (!MOD.eval) { st.className = "verdict atentie"; st.textContent = "Referatul se poate trimite numai după „Începe laboratorul” (cu codul sesiunii)."; return; }
  const conc = $("#ref-concluzii");
  if (conc.value !== conc.valoareBuna()) { conc.value = conc.valoareBuna(); INTEG.programatic++; }
  const lipsa = Cadru.verificaComplet();
  if (lipsa.length) { st.className = "verdict atentie"; st.innerHTML = "Referatul nu este complet:<br>• " + lipsa.join("<br>• "); return; }
  const raspunsuri = {};
  $$("#ref-intrebari input[data-q]").forEach(i => { raspunsuri[i.dataset.q] = i.valoareBuna ? i.valoareBuna() : i.value; });
  const textTotal = conc.valoareBuna().length + Object.values(raspunsuri).join("").length;
  const integ = analizaIntegritate(textTotal);
  const btn = $("#btn-trimite"); btn.disabled = true; st.className = "verdict"; st.textContent = "Se trimite referatul…";
  const payload = Object.assign(Cadru.payloadReferat(), {
    action: "trimite", disc: LAB.disc, lab: LAB.nr, cod: LAB.cod, versiuneApp: "3.0",
    student: { nume: STUDENT.nume, email: STUDENT.email, grupa: STUDENT.grupa }, token: STUDENT.token, start: STUDENT.start,
    raspunsuri, concluzii: conc.valoareBuna(), integritate: integ, trimisLa: new Date().toISOString()
  });
  try {
    const j = await apelServer(null, payload);
    Cadru.ref.trimis = { la: payload.trimisLa, url: j.docUrl }; Cadru.salveaza();
    st.className = "verdict ok";
    st.innerHTML = `Referatul a fost trimis și salvat (${new Date().toLocaleString("ro-RO")}). <a href="${j.docUrl}" target="_blank" rel="noopener">Deschide documentul Google</a>.<br>Predați-l acum în Google Classroom, la tema Lucrării ${LAB.nr}:`;
    arataShareClassroom(j.docUrl);
  } catch (err) { st.className = "verdict atentie"; st.textContent = "Trimiterea a eșuat: " + err.message; }
  btn.disabled = false;
}
function arataShareClassroom(url) {
  const c = $("#share-classroom"); c.innerHTML = ""; c.hidden = false;
  const randeaza = () => { try { window.gapi.sharetoclassroom.render(c, { url, size: 48, title: `Referat L${LAB.nr} – ${STUDENT.nume}`, body: LAB.titlu, itemtype: "assignment" }); } catch (e) { c.innerHTML = `<a href="https://classroom.google.com/" target="_blank" rel="noopener">Deschide Google Classroom</a> și atașați documentul din Drive.`; } };
  if (window.gapi && window.gapi.sharetoclassroom) return randeaza();
  const s = document.createElement("script"); s.src = "https://apis.google.com/js/platform.js"; s.async = true;
  s.onload = () => { if (window.gapi && gapi.load) gapi.load("sharetoclassroom", randeaza); else randeaza(); };
  s.onerror = () => { c.innerHTML = `<a href="https://classroom.google.com/" target="_blank" rel="noopener">Deschide Google Classroom</a> și atașați documentul (Drive → „Partajate cu mine”).`; };
  document.head.appendChild(s);
}
