/**
 * Colocviul de laborator (ultima ședință): testul recapitulativ individual, notat pe server, și portofoliul de lucrări
 * bifat de cadrul didactic; nota se calculează în foaia „Colocviu” (formule) și se exportă în foaia „Note colocviu”.
 *  - testul: grile din banca de întrebări a lucrărilor (date.js) + câte o problemă de calcul pe lucrare, cu valori individuale;
 *    alegerea întrebărilor, ordinea variantelor și valorile problemelor rezultă din seed-ul sesiunii (nu se stochează nimic);
 *  - răspunsurile corecte nu ajung în browser înainte de trimitere.
 */
const BANCA = { MF: typeof LUCRARI_MF !== "undefined" ? LUCRARI_MF : null };

/* ------------------------------------------------------------------ problemele de calcul cu valori individuale */
function f_(x, n) { return (Math.round(x * Math.pow(10, n)) / Math.pow(10, n)).toFixed(n).replace(".", ","); }
function rot_(x, n) { return Math.round(x * Math.pow(10, n)) / Math.pow(10, n); }
const PROBLEME = {
  MF: [
    function (u) { const K = rot_(u(0.08, 0.12), 3), rb = rot_(u(7.8, 8.1), 2), rl = rot_(u(0.84, 0.87), 3), t = rot_(u(45, 120), 1), eta = K * (rb - rl) * t;
      return { text: `Vâscozimetrul Höppler: constanta K = ${f_(K, 3)} mPa·cm³/g, bila ρ<sub>b</sub> = ${f_(rb, 2)} g/cm³, uleiul ρ = ${f_(rl, 3)} g/cm³, timpul de cădere t = ${f_(t, 1)} s. Calculați vâscozitatea cinematică a uleiului.`, u: "mm²/s", rasp: eta / rl }; },
    function (u) { const V0 = Math.round(u(60, 200)), dp = Math.round(u(50, 150)), K0 = u(1.3, 2.0) * 1000, dV = rot_(V0 * dp * 0.1 / K0, 2);
      return { text: `Lichid de frână: volumul inițial V₀ = ${V0} cm³ se comprimă cu ΔV = ${f_(dV, 2)} cm³ la creșterea presiunii cu Δp = ${dp} bar. Calculați modulul de elasticitate K.`, u: "MPa", rasp: V0 * dp * 0.1 / dV }; },
    function (u) { const d = [19.05, 20.64, 22.22, 23.81, 25.4][Math.floor(u(0, 5))], D = Math.round(u(38, 57)), F = Math.round(u(80, 200)) * 10;
      return { text: `Pompa centrală are pistonul d = ${f_(d, 2)} mm, iar etrierul un piston D = ${D} mm. Tija pompei apasă cu F = ${F} N. Calculați forța de apăsare a pistonului etrierului (fără pierderi).`, u: "N", rasp: F * Math.pow(D / d, 2) }; },
    function (u) { const D1 = Math.round(u(30, 42)), d2 = Math.round(u(14, 20)), dh = Math.round(u(100, 400)), Cd = rot_(u(0.96, 0.99), 2), A1 = Math.PI * D1 * D1 / 4e6, A2 = Math.PI * d2 * d2 / 4e6;
      return { text: `Tubul Venturi: D₁ = ${D1} mm, d₂ = ${d2} mm, diferența de nivel între piezometre Δh = ${dh} mm, C<sub>d</sub> = ${f_(Cd, 2)} (g = 9,81 m/s²). Calculați debitul.`, u: "L/s", rasp: Cd * A2 * Math.sqrt(2 * 9.81 * dh / 1000 / (1 - Math.pow(A2 / A1, 2))) * 1000 }; },
    function (u) { const d = Math.round(u(25, 36)), Q = rot_(u(0.3, 1.2), 2), ny = rot_(u(0.6, 1.0), 2);
      return { text: `Lichidul de răcire (ν = ${f_(ny, 2)} mm²/s) curge prin furtunul radiatorului, d = ${d} mm, cu debitul Q = ${f_(Q, 2)} L/s. Calculați numărul Reynolds.`, u: "", rasp: 4 * Q / 1000 / (Math.PI * d / 1000 * ny * 1e-6) }; },
    function (u) { const L = rot_(u(1.0, 3.0), 1), Q = rot_(u(0.2, 0.5), 2), ny = rot_(u(0.95, 1.1), 3), d = 0.017, v = Q / 1000 / (Math.PI * d * d / 4), re = v * d / (ny * 1e-6), lb = 0.3164 / Math.pow(re, 0.25);
      return { text: `Conductă netedă d = 17 mm, L = ${f_(L, 1)} m, apă cu ν = ${f_(ny, 3)} mm²/s, Q = ${f_(Q, 2)} L/s. Cu λ după Blasius, calculați pierderea de sarcină longitudinală h<sub>d</sub>.`, u: "mm", rasp: lb * L / d * v * v / 2 / 9.81 * 1000 }; }
  ]
};

/** testul individual (determinist din seed): grile cu variante amestecate și probleme de calcul */
function testColocviu_(seed) {
  const C = (infoDisc_() || {}).colocviu, B = BANCA[disc_()], P = PROBLEME[disc_()] || [];
  if (!C || !B) throw new Error("Disciplina nu are colocviu configurat.");
  const r = mulberry32(seed), amest = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; };
  const grila = [], probleme = [];
  B.slice(0, C.lucrari).forEach(l => {
    amest(l.test.map((t, i) => i)).slice(0, C.grilaPeLucrare).forEach(i => {
      const t = l.test[i], ord = amest(t.o.map((o, j) => j));
      grila.push({ id: "g" + l.nr + "_" + i, lab: l.nr, q: t.q, o: ord.map(j => t.o[j]), c: ord.indexOf(t.c), e: t.e });
    });
  });
  P.slice(0, C.lucrari).forEach((gen, k) => { const p = gen((a, b) => a + (b - a) * r()); probleme.push({ id: "p" + (k + 1), lab: k + 1, text: p.text, u: p.u, rasp: p.rasp }); });
  return { grila: amest(grila), probleme, max: grila.length + probleme.length * C.punctePeProblema };
}
function testPublic_(T) { return { grila: T.grila.map(g => ({ id: g.id, lab: g.lab, q: g.q, o: g.o })), probleme: T.probleme.map(p => ({ id: p.id, lab: p.lab, text: p.text, u: p.u })), max: T.max }; }
function noteazaTest_(T, rasp) {
  const C = infoDisc_().colocviu; let p = 0; const det = [];
  T.grila.forEach(g => { const v = rasp[g.id], ok = v !== undefined && v !== "" && Number(v) === g.c; if (ok) p++; det.push({ id: g.id, lab: g.lab, ok, corect: g.o[g.c], raspuns: v === undefined || v === "" ? "—" : g.o[Number(v)], e: g.e }); });
  T.probleme.forEach(q => { const v = U.num(rasp[q.id]), ok = isFinite(v) && Math.abs(v - q.rasp) <= Math.abs(q.rasp) * 0.02; if (ok) p += C.punctePeProblema;
    det.push({ id: q.id, lab: q.lab, ok, corect: (Math.abs(q.rasp) >= 1000 ? String(Math.round(q.rasp)) : f_(q.rasp, Math.abs(q.rasp) >= 10 ? 1 : 3)) + (q.u ? " " + q.u : ""), raspuns: isFinite(v) ? String(rasp[q.id]) : "—", puncte: C.punctePeProblema }); });
  return { puncte: p, max: T.max, nota: rot_(Math.max(1, 10 * p / T.max), 2), detalii: det };
}

/* ------------------------------------------------------------------ foaia „Colocviu” */
const CAP_COL_FIX = ["Nume și prenume", "E-mail", "Grupa"];
function colConf_() { const C = (infoDisc_() || {}).colocviu; if (!C) throw new Error("Disciplina nu are colocviu configurat."); return C; }
function colIdx_() {
  const C = colConf_(), nb = C.lucrari * C.itemi.length, b0 = 4, dupa = b0 + nb;
  return { C, nb, b0, bife: dupa, port: dupa + 1, puncte: dupa + 2, notaT: dupa + 3, finala: dupa + 4, nota: dupa + 5, data: dupa + 6, durata: dupa + 7, verdict: dupa + 8, obs: dupa + 9, ult: dupa + 9 };
}
function foaieColocviu_() {
  const ss = SpreadsheetApp.getActive(), X = colIdx_(), C = X.C;
  let sh = ss.getSheetByName("Colocviu");
  if (!sh) {
    sh = ss.insertSheet("Colocviu");
    const cap = CAP_COL_FIX.slice(); for (let l = 1; l <= C.lucrari; l++) C.itemi.forEach((t, k) => cap.push("L" + l + "·" + (k + 1)));
    cap.push("Bife", "Nota portofoliu", "Puncte test (din " + testMax_() + ")", "Nota test", "Nota finală", "Nota colocviu", "Test susținut la", "Durata test [min]", "Verdict test", "Observații");
    sh.getRange(1, 1, 1, cap.length).setValues([cap]).setFontWeight("bold").setBackground("#e8f0f9").setWrap(true).setVerticalAlignment("middle");
    for (let l = 1; l <= C.lucrari; l++) C.itemi.forEach((t, k) => sh.getRange(1, X.b0 + (l - 1) * C.itemi.length + k).setNote(t));
    sh.setFrozenRows(1); sh.setFrozenColumns(1); sh.setColumnWidth(1, 210); sh.setColumnWidth(2, 220);
    for (let c = X.b0; c < X.bife; c++) sh.setColumnWidth(c, 42);
    sh.getRange(1, X.port, 1, 5).setBackground("#d7ebdd");
  }
  return sh;
}
function testMax_() { const C = colConf_(); return C.lucrari * C.grilaPeLucrare + C.lucrari * C.punctePeProblema; }
function randColocviu_(email, nume, grupa) {
  const sh = foaieColocviu_(), X = colIdx_(), C = X.C, last = sh.getLastRow();
  const emails = last > 1 ? sh.getRange(2, 2, last - 1, 1).getValues().map(r => String(r[0]).toLowerCase().trim()) : [];
  const i = emails.indexOf(email); if (i >= 0) return { sh, row: i + 2 };
  const row = last + 1, L = c => col_(c) + row, wP = C.pondere.portofoliu, wT = C.pondere.test;
  sh.getRange(row, 1, 1, 3).setValues([[nume, email, grupa]]);
  sh.getRange(row, X.b0, 1, X.nb).insertCheckboxes();
  sh.getRange(row, X.bife).setFormula(`=COUNTIF(${L(X.b0)}:${L(X.bife - 1)},TRUE)`);
  sh.getRange(row, X.port).setFormula(`=ROUND(MAX(1,10*${L(X.bife)}/${X.nb}),2)`);
  sh.getRange(row, X.notaT).setFormula(`=IF(${L(X.puncte)}="","",ROUND(MAX(1,10*${L(X.puncte)}/${testMax_()}),2))`);
  sh.getRange(row, X.finala).setFormula(`=IF(${L(X.notaT)}="","",ROUND(${wP}*${L(X.port)}+${wT}*${L(X.notaT)},2))`);
  sh.getRange(row, X.nota).setFormula(`=IF(${L(X.finala)}="","",ROUND(${L(X.finala)},0))`);
  return { sh, row };
}
/** toți studenții din „Prezență” au rând în „Colocviu” */
function sincronColocviu_() {
  const sp = foaiePrezenta_(false), last = sp.getLastRow(); if (last < 2) return;
  const sh = foaieColocviu_(), lc = sh.getLastRow(), are = {};
  if (lc > 1) sh.getRange(2, 2, lc - 1, 1).getValues().forEach(r => { are[String(r[0]).toLowerCase().trim()] = 1; });
  sp.getRange(2, 1, last - 1, 3).getValues().forEach(([n, e, g]) => { e = String(e).toLowerCase().trim(); if (e && !are[e]) { randColocviu_(e, n, g); are[e] = 1; } });
}
function cheieProf_() { return hmac_("prof|" + disc_()).slice(0, 10).toUpperCase(); }
function arataCheieProf() {
  colConf_();
  SpreadsheetApp.getUi().alert("Cheia cadrului didactic pentru colocviu",
    "Cheia: " + cheieProf_() + "\n\nSe introduce în pagina lucrării " + colConf_().lab + ", fila „Portofoliu (cadru didactic)”, pentru bifarea portofoliilor și exportul notelor. Nu o comunicați studenților.", SpreadsheetApp.getUi().ButtonSet.OK);
}
function citesteRanduri_() {
  sincronColocviu_();
  const sh = foaieColocviu_(), X = colIdx_(), last = sh.getLastRow(); if (last < 2) return [];
  const v = sh.getRange(2, 1, last - 1, X.ult).getValues();
  // referatele din „Prezență”
  const sp = foaiePrezenta_(false), lp = sp.getLastRow(), ref = {};
  if (lp > 1) sp.getRange(2, 2, lp - 1, 2 + X.C.lucrari).getValues().forEach(r => { ref[String(r[0]).toLowerCase().trim()] = r.slice(2).map(x => String(x || "")); });
  return v.map((r, i) => ({ row: i + 2, nume: r[0], email: String(r[1]).toLowerCase().trim(), grupa: r[2], b: r.slice(X.b0 - 1, X.bife - 1).map(x => x === true), ref: ref[String(r[1]).toLowerCase().trim()] || [],
    port: r[X.port - 1], puncte: r[X.puncte - 1], notaT: r[X.notaT - 1], finala: r[X.finala - 1], nota: r[X.nota - 1], data: r[X.data - 1] ? Utilities.formatDate(new Date(r[X.data - 1]), TZ, "dd.MM.yyyy HH:mm") : "", durata: r[X.durata - 1], verdict: r[X.verdict - 1], obs: r[X.obs - 1] })).filter(s => s.email);
}
function exportaNoteColocviu_() {
  const rows = citesteRanduri_(), ss = SpreadsheetApp.getActive(), C = colConf_();
  let sh = ss.getSheetByName("Note colocviu"); if (!sh) sh = ss.insertSheet("Note colocviu"); sh.clear();
  const cap = ["Nr.", "Nume și prenume", "Grupa", "E-mail", "Nota portofoliu", "Nota test", "Nota finală", "Nota colocviu", "Situația"];
  const date = rows.slice().sort((a, b) => String(a.grupa).localeCompare(String(b.grupa)) || String(a.nume).localeCompare(String(b.nume), "ro"))
    .map((s, i) => [i + 1, s.nume, s.grupa, s.email, s.port, s.notaT, s.finala, s.nota, s.nota === "" ? "absent la test" : (s.nota >= C.notaMinimaPromovare ? "promovat" : "nepromovat")]);
  sh.getRange(1, 1, 1, cap.length).setValues([cap]).setFontWeight("bold").setBackground("#e8f0f9");
  if (date.length) sh.getRange(2, 1, date.length, cap.length).setValues(date);
  sh.getRange(1, 1).setNote("Exportat la " + Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm") + ". Ponderi: portofoliu " + C.pondere.portofoliu * 100 + " %, test " + C.pondere.test * 100 + " %.");
  sh.setFrozenRows(1); sh.setColumnWidth(2, 220); sh.setColumnWidth(4, 230);
  // nota și în „Prezență”
  const sp = foaiePrezenta_(false), n = nrLab_(), cn = 6 + n, lp = sp.getLastRow();
  sp.getRange(1, cn).setValue("Nota colocviu").setFontWeight("bold").setBackground("#d7ebdd");
  if (lp > 1) { const em = sp.getRange(2, 2, lp - 1, 1).getValues().map(r => String(r[0]).toLowerCase().trim()), m = {}; rows.forEach(s => m[s.email] = s.nota);
    sp.getRange(2, cn, lp - 1, 1).setValues(em.map(e => [m[e] === undefined ? "" : m[e]])); }
  return { n: date.length, url: ss.getUrl() + "#gid=" + sh.getSheetId() };
}
function exportaNoteColocviu() { const r = exportaNoteColocviu_(); anunta_("Notele de colocviu au fost exportate în foaia „Note colocviu” (" + r.n + " studenți) și în coloana „Nota colocviu” din „Prezență”."); }

/* ------------------------------------------------------------------ API */
function tokOk_(email, start, token) { return hmac_("tok|" + email + "|" + disc_() + "|" + colConf_().lab + "|" + start) === token; }
function seedColocviu_(email, start) { return seed_(email, colConf_().lab, start); }
function apiColocviuTest_(p) {
  const email = String(p.email || "").toLowerCase().trim();
  if (!tokOk_(email, p.start, p.token)) return { ok: false, eroare: "Sesiune invalidă: intrați cu codul afișat în sală." };
  const { sh, row } = randColocviu_(email, String(p.nume || ""), String(p.grupa || "")), X = colIdx_();
  if (sh.getRange(row, X.puncte).getValue() !== "") return { ok: false, eroare: "Testul de colocviu a fost deja susținut (" + sh.getRange(row, X.puncte).getValue() + " puncte). Pentru o reluare, cadrul didactic șterge punctajul din foaia „Colocviu”." };
  const k = "col|" + email + "|" + p.start; let t0 = Number(props_().getProperty(k)); if (!t0) { t0 = Date.now(); props_().setProperty(k, String(t0)); }
  const C = colConf_(), ramas = Math.max(0, Math.round(C.durataMin * 60 - (Date.now() - t0) / 1000));
  return Object.assign({ ok: true, durataMin: C.durataMin, ramas }, testPublic_(testColocviu_(seedColocviu_(email, p.start))));
}
function apiColocviuTrimite_(d) {
  const st = d.student || {}, email = String(st.email || "").toLowerCase().trim();
  if (!tokOk_(email, d.start, d.token)) return { ok: false, eroare: "Sesiune invalidă: intrați cu codul afișat în sală." };
  const C = colConf_(), X = colIdx_(), T = testColocviu_(seedColocviu_(email, d.start)), R = noteazaTest_(T, d.raspunsuri || {});
  const t0 = Number(props_().getProperty("col|" + email + "|" + d.start)) || Date.parse(d.start), durata = rot_((Date.now() - t0) / 60000, 1);
  const motive = [], integ = d.integritate || {};
  if (durata > C.durataMin + 2) motive.push("timp depășit (" + durata + " min)");
  if (integ.ascunsNr > 0) motive.push("a părăsit pagina testului de " + integ.ascunsNr + " ori (" + Math.round((integ.ascunsMs || 0) / 1000) + " s)");
  if (integ.webdriver) motive.push("browser automatizat");
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const { sh, row } = randColocviu_(email, st.nume, st.grupa);
    if (sh.getRange(row, X.puncte).getValue() !== "") return { ok: false, eroare: "Testul de colocviu a fost deja trimis." };
    sh.getRange(row, X.puncte).setValue(R.puncte);
    sh.getRange(row, X.data, 1, 4).setValues([[new Date(), durata, motive.length ? "DE VERIFICAT" : "OK", motive.join("; ")]]);
    sh.getRange(row, X.verdict).setBackground(motive.length ? "#fdf0e1" : "#e5f4ea");
    let jl = SpreadsheetApp.getActive().getSheetByName("L" + C.lab + " – test colocviu");
    if (!jl) { jl = SpreadsheetApp.getActive().insertSheet("L" + C.lab + " – test colocviu"); jl.appendRow(["Trimis la", "Nume", "E-mail", "Grupa", "Puncte", "Nota test", "Durata [min]", "Verdict", "Răspunsuri (id: răspuns ✓/✗)"]); jl.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#e8f0f9"); jl.setFrozenRows(1); }
    jl.appendRow([new Date(), st.nume, email, st.grupa, R.puncte + "/" + R.max, R.nota, durata, motive.length ? "DE VERIFICAT: " + motive.join("; ") : "OK", R.detalii.map(x => x.id + ": " + x.raspuns + (x.ok ? " ✓" : " ✗")).join(" | ")]);
    const { sh: sp, row: rp } = randStudent_(email, st.nume, st.grupa), cel = sp.getRange(rp, 3 + C.lab);
    cel.setValue("P+T"); cel.setNote((cel.getNote() ? cel.getNote() + "\n" : "") + "test colocviu: " + R.puncte + "/" + R.max + " · " + Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm")); cel.setBackground("#cfe9d8");
  } finally { lock.releaseLock(); }
  return { ok: true, puncte: R.puncte, max: R.max, nota: R.nota, detalii: R.detalii, pondere: C.pondere };
}
function cheieOk_(k) { return String(k || "").toUpperCase().trim() === cheieProf_(); }
function apiColocviuLista_(p) {
  if (!cheieOk_(p.key)) return { ok: false, eroare: "Cheia cadrului didactic nu este corectă (meniul Laborator → Cheia cadrului didactic)." };
  const C = colConf_();
  return { ok: true, itemi: C.itemi, lucrari: C.lucrari, pondere: C.pondere, max: testMax_(), minim: C.notaMinimaPromovare, foaie: SpreadsheetApp.getActive().getUrl(), studenti: citesteRanduri_().map(s => { delete s.row; return s; }) };
}
function apiColocviuBifa_(d) {
  if (!cheieOk_(d.key)) return { ok: false, eroare: "Cheie incorectă." };
  const X = colIdx_(), lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = foaieColocviu_(), last = sh.getLastRow(), em = sh.getRange(2, 2, Math.max(1, last - 1), 1).getValues().map(r => String(r[0]).toLowerCase().trim());
    const lista = d.bife || [{ email: d.email, i: d.i, val: d.val }];
    lista.forEach(b => { const k = em.indexOf(String(b.email).toLowerCase().trim()), i = Number(b.i); if (k >= 0 && i >= 0 && i < X.nb) sh.getRange(k + 2, X.b0 + i).setValue(!!b.val); });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return apiColocviuLista_({ key: d.key });
}
function apiColocviuExport_(d) {
  if (!cheieOk_(d.key)) return { ok: false, eroare: "Cheie incorectă." };
  const r = exportaNoteColocviu_(); return { ok: true, n: r.n, url: r.url };
}
