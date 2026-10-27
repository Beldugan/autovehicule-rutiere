/* DA – Lucrarea 6. Sistemul de frânare cu ABS/ESC și sistemele ADAS.
   Simulator: standul didactic 3D ABS/ESC (patru colțuri de roată cu senzori pasivi față și activi spate, motorul de antrenare, direcția
   cu senzorul de unghi al volanului, pedala, servofrâna, pompa centrală, unitatea hidraulică cu modulul, frâna de parcare electrică,
   lămpile de frână, panoul cu contactul și priza OBD) și partea ADAS (parbrizul cu camera frontală, radarul, panoul-țintă pe stativ),
   cu testerul Launch X431, multimetrul și osciloscopul. Fiecare student are standul propriu și un defect ascuns. */
"use strict";
const MD = MODELE["da-l6"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);
const R4 = MD.ROTI, SCURT = { fs: "FS", fd: "FD", ss: "SS", sd: "SD" };

/* ------------------------------------------------------------------ starea standului */
const sim = {
  t: 0, contact: false, tContact: 0, vci: false, scanat: false, sterse: false, tSters: 0, ecran: "coduri", manusi: false, ochelari: false, asigurat: false,
  vSet: 0, vEf: 0, manual: -1, tManual: 0, cuplat: [true, true, true, true], sel: 0,
  pct: "ualim", pedala: false, volan: 0, calibrat: false, realCal: 0, testPompa: 0, testFacut: false, uPompaMin: null, epbService: false, epbFacut: { in: false, out: false },
  adas: { tinta: false, dist: 1.8, h: 1.10, laser: false, cond: {}, prog: -1, calibrat: false }, rapid: false, osc: { pe: -1 }, abatere: false
};
const NUME_EC = { coduri: "Coduri de defect", roti: "Viteze roți – date live", esc: "ESC – date live", teste: "Teste active", sas: "Calibrare unghi volan", epb: "Frâna de parcare – service", adas: "ADAS – cameră / radar" };
const ADAS_REF = { dist: 1.5, h: 1.25 }, COND = [["nivel", "Standul pe pardoseală plană, nivelat"], ["volan", "Roțile drepte / volanul centrat"], ["lumina", "Iluminare uniformă, fără reflexii pe țintă"], ["laser", "Ținta aliniată cu laserul pe axa longitudinală"], ["pozitie", "Ținta la distanța și înălțimea din documentație"]];

/* ------------------------------------------------------------------ fizica (legătura cu modelul) */
function vReal() { const p = P(); return [0, 1, 2, 3].map(i => sim.manual >= 0 ? (i === sim.manual ? 6 * p.ddR[i] / MD.DD : 0) : sim.vEf * p.ddR[i] / MD.DD); }
function vTester() { const vr = vReal(); return [0, 1, 2, 3].map(i => sim.contact && sim.cuplat[MD.ROTI.indexOf(SENZ_LA(i))] ? MD.vitezaTester(P(), i, vr) : 0); }
// conectorul care alimentează intrarea i a modulului (la defectul „invers” intrările spate sunt încrucișate)
function SENZ_LA(i) { return P().defect.tip === "invers" && i >= 2 ? R4[5 - i] : R4[i]; }
function stabilV() { return sim.manual < 0 && sim.vSet > 0 && Math.abs(sim.vEf - sim.vSet) < 0.05; }
function realSAS() { return sim.volan; }
function escLive() { const e = MD.esc(P(), realSAS(), sim.calibrat, sim.realCal); return Object.assign({}, e, { p: sim.pedala ? 18 + 2 * Math.sin(sim.t) : e.p }); }
function codActiv() { const d = P().defect.tip; return ["rupt", "inel"].includes(d) || (d === "intref" && sim.abatere) || (d === "masa" && sim.testFacut) || (d === "stop" && sim.testStop) || d === "cam"; }
function lampaABS() { if (!sim.contact) return false; if (sim.t - sim.tContact < 2.5) return true; const d = P().defect.tip; return codActiv() && ["rupt", "intref", "inel", "masa"].includes(d) && !(sim.sterse && sim.t - sim.tSters < 4); }
function adasLive() { return MD.adas(P(), sim.adas.calibrat); }
function cod() { const c = MD.coduri(P()); if (sim.sterse && !codActiv()) return []; if (sim.sterse && sim.t - sim.tSters < 4) return []; return c; }
function stopInchis() { return MD.contactStop(P(), sim.pedala) !== Infinity; }

/* ------------------------------------------------------------------ multimetrul */
const PUNCTE = [
  ["ualim", "U alimentare modul (pin 1 – pin 4 masă)", "V"], ["rmasa", "R masă modul – caroserie", "Ω"], ["rstop", "R contact lămpi de frână", "Ω"],
  ["rbob", "R bobină senzor (conector decuplat)", "Ω"], ["iz", "R izolație senzor – masă (conector decuplat)", "Ω"], ["uac", "U alternativă senzor pasiv (cuplat, roata se rotește)", "V~"], ["uact", "U alimentare senzor activ (cuplat, backprobe)", "V"]];
function citireMM() {
  const p = P(), i = sim.sel, k = sim.pct;
  switch (k) {
    case "ualim": if (!sim.contact) return { v: 0, u: "V", txt: "0,00" }; { const A = MD.alimentare(p, sim.testPompa > 0); return { v: A.U, u: "V", txt: fx(A.U, 2) }; }
    case "rmasa": if (sim.contact) return { err: "Rezistența se măsoară fără tensiune: luați contactul." }; return { v: MD.alimentare(p, false).Rm, u: "Ω", txt: fx(MD.alimentare(p, false).Rm, 2) };
    case "rstop": { const r = MD.contactStop(p, sim.pedala); return r === Infinity ? { v: "OL", u: "Ω", txt: "OL" } : { v: r, u: "Ω", txt: fx(r, 1) }; }
    case "rbob": if (sim.cuplat[i]) return { err: "Decuplați conectorul senzorului (clic pe conector sau butonul din pas)." }; if (i >= 2) return { err: "NSSM: senzorul activ nu se măsoară cu ohmmetrul (se poate distruge) – măsurați alimentarea și semnalul de curent." };
      { const r = MD.rezBobina(p, i); return r === Infinity ? { v: "OL", u: "Ω", txt: "OL" } : { v: r, u: "Ω", txt: String(r) }; }
    case "iz": if (sim.cuplat[i]) return { err: "Decuplați conectorul senzorului." }; return { v: "OL", u: "MΩ", txt: "OL" };
    case "uac": if (i >= 2) return { err: "Senzorul activ dă impulsuri de curent: folosiți osciloscopul cu clește mA / rezistență de 100 Ω." }; if (!sim.cuplat[i]) return { err: "Cuplați conectorul." };
      { const s = MD.semnal(p, i, vReal()[i]); return { v: s.A / Math.SQRT2, u: "V~", txt: fx(s.A / Math.SQRT2, 3) }; }
    case "uact": if (i < 2) return { err: "Senzorul pasiv nu are alimentare – măsurați rezistența bobinei și tensiunea alternativă." }; if (!sim.cuplat[i]) return { err: "Cuplați conectorul (măsurare cu ac de backprobe)." };
      if (!sim.contact) return { v: 0, u: "V", txt: "0,0" }; return { v: MD.alimActiv(p, i), u: "V", txt: fx(MD.alimActiv(p, i), 1) };
  }
  return { err: "—" };
}
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 11}" text-anchor="${o.a || "middle"}" fill="${o.f || "currentColor"}" font-weight="${o.w || 400}"${o.fam ? ` font-family="${o.fam}"` : ""}>${s}</text>`;
function desenMM() {
  const el = $("#svg-mm"); if (!el) return; const r = citireMM();
  let s = `<rect x="10" y="6" width="190" height="300" rx="20" fill="#f2b705" stroke="#8a6a00"/><rect x="24" y="20" width="162" height="272" rx="12" fill="#2b2f35"/>`;
  s += `<rect x="36" y="34" width="138" height="62" rx="5" fill="#aab79c"/>${txt(166, 78, r.err ? "Err" : r.txt, { fs: 30, a: "end", f: "#1b2416", w: 700, fam: "Courier New,monospace" })}${txt(42, 48, r.err ? "" : r.u, { fs: 12, a: "start", f: "#1b2416", w: 700 })}`;
  s += `<circle cx="105" cy="170" r="46" fill="#1b1e22" stroke="#555"/>`; const ang = { V: -60, "V~": -30, "Ω": 30, "MΩ": 30 }[r.u] ?? 0; s += `<line x1="105" y1="170" x2="${105 + 38 * Math.sin(ang * Math.PI / 180)}" y2="${170 - 38 * Math.cos(ang * Math.PI / 180)}" stroke="#f2b705" stroke-width="6" stroke-linecap="round"/>`;
  [["V⎓", -60], ["V~", -30], ["Ω", 30], ["mA", 60]].forEach(([t, a]) => { s += txt(105 + 60 * Math.sin(a * Math.PI / 180), 174 - 60 * Math.cos(a * Math.PI / 180), t, { fs: 11, f: "#eee", w: 700 }); });
  [[60, "#111", "COM"], [150, "#c62828", "VΩ"]].forEach(([x, c, t]) => { s += `<circle cx="${x}" cy="262" r="11" fill="${c}" stroke="#666"/>${txt(x, 286, t, { fs: 10, f: "#ddd" })}`; });
  s += txt(330, 30, "Punctul de măsură", { fs: 12, a: "start", w: 700 });
  const pctNume = (PUNCTE.find(x => x[0] === sim.pct) || [])[1] || "";
  s += txt(330, 52, pctNume, { fs: 12, a: "start" }) + (["rbob", "iz", "uac", "uact"].includes(sim.pct) ? txt(330, 72, `Senzorul: ${MD.NUME[R4[sim.sel]]} (${sim.sel < 2 ? "pasiv" : "activ"}) – conector ${sim.cuplat[sim.sel] ? "cuplat" : "decuplat"}`, { fs: 12, a: "start" }) : "");
  if (r.err) s += `<foreignObject x="330" y="86" width="380" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="font:12px system-ui;color:#c62828">${r.err}</div></foreignObject>`;
  el.innerHTML = s;
}

/* ------------------------------------------------------------------ osciloscopul (CH1 la senzorul selectat) */
function desenOsc() {
  const cv = $("#cv-osc"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#06120c"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(120,200,160,.18)"; for (let k = 1; k < 10; k++) { g.beginPath(); g.moveTo(W * k / 10, 0); g.lineTo(W * k / 10, H); g.stroke(); } for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(0, H * k / 8); g.lineTo(W, H * k / 8); g.stroke(); }
  const i = sim.osc.pe, p = P(); g.font = "11px system-ui";
  if (i < 0) { g.fillStyle = "#9fe6c0"; g.fillText("CH1 neconectat – „Sonda osciloscopului la senzorul selectat”", 10, 18); return; }
  const v = vReal()[i], s = MD.semnal(p, i, v), tb = 0.02, T = tb * 10, f = s.f, pas = i < 2, mor = !sim.cuplat[i];
  const vdiv = pas ? (s.A > 1 ? 1 : s.A > 0.4 ? 0.2 : 0.1) : 0.5;          // [V/div] sau [V/div pe 100 Ω]
  const Y = u => H / 2 - u / vdiv * (H / 8);
  g.strokeStyle = "#ffe14d"; g.lineWidth = 1.6; g.beginPath();
  for (let x = 0; x <= W; x++) {
    const t = x / W * T + sim.t * 0.0; let u;
    if (mor || !sim.contact && !pas) u = 0;
    else if (pas) u = s.A * Math.sin(2 * Math.PI * f * t) + (Math.random() - 0.5) * 0.01;
    else { const per = f > 0 ? Math.floor(t * f) : 0, faza = f > 0 ? (t * f) % 1 : 0, lipsa = s.lipsa && (per % 4 === 1); u = (faza < 0.5 && !lipsa && f > 0 ? 1.4 : 0.7) + (Math.random() - 0.5) * 0.02; }
    if (!pas) u = u - 1.05;   // centrare pe ecran (offset vertical)
    x ? g.lineTo(x, Y(u)) : g.moveTo(x, Y(u));
  }
  g.stroke();
  const fm = fOsc(); g.fillStyle = "#ffe14d"; g.fillText(`CH1 ${pas ? "tensiune senzor pasiv " + fx(vdiv, 1) + " V/div" : "curent senzor activ pe 100 Ω · 5 mA/div (offset −10,5 mA)"} · 20 ms/div`, 8, 14);
  g.fillStyle = "#9fe6c0"; g.fillText(`${MD.NUME[R4[i]]} · v roată ≈ ${fx(v, 1)} km/h${mor ? " · conector decuplat" : ""}`, 8, 28);
  g.fillStyle = "#fff"; g.font = "bold 13px system-ui"; g.fillText(`f = ${fm > 0 ? fx(fm, 1) + " Hz" : "—"}   ${pas ? "U vv = " + (fm > 0 ? fx(2 * s.A, 2) + " V" : "—") : "I = 7 / 14 mA"}`, W - 280, H - 10);
}
/** frecvența măsurată automat de osciloscop (amplitudine suficientă pentru trigger) */
function fOsc() { const i = sim.osc.pe; if (i < 0 || !sim.cuplat[i]) return 0; const v = vReal()[i], s = MD.semnal(P(), i, v); if (i >= 2 && !sim.contact) return 0; if (i < 2 && s.A < 0.04) return 0; return Math.round(s.f * 10) / 10; }

/* ------------------------------------------------------------------ testerul X431 */
function liniiX431() {
  if (!sim.contact) return { titlu: "X431 – contact luat (modulul nu comunică)", linii: [] };
  if (!sim.vci) return { titlu: "Interfața VCI nu este conectată la priza OBD", linii: [] };
  const vt = vTester(), e = escLive(), a = adasLive();
  switch (sim.ecran) {
    case "coduri": return { titlu: "Scanare – modulul ABS/ESC (și camera frontală)", linii: !sim.scanat ? [["Apăsați „Scanează”", "", false]] : cod().length ? cod().map(c => [c.split(" – ")[0], c.split(" – ")[1], true]) : [["Nu există coduri memorate", "", false]] };
    case "roti": return { titlu: "Vitezele roților – date live", linii: R4.map((k, i) => [`Viteza roții ${MD.NUME[k].toLowerCase()}`, fx(vt[i], 1) + " km/h", sim.vEf > 2 && vt[i] < 0.5]).concat([["Lampa ABS", lampaABS() ? "aprinsă" : "stinsă", lampaABS()]]) };
    case "esc": return { titlu: "ESC – date live (vehicul în repaus)", linii: [["Unghiul volanului", fx(e.sas, 1) + " °", Math.abs(e.sas) > 2.5 && Math.abs(realSAS()) < 0.5], ["Viteza de girație", fx(e.yaw, 2) + " °/s"], ["Accelerația laterală", fx(e.ay, 2) + " m/s²"],
      ["Presiunea în circuitul de frână", fx(e.p, 1) + " bar"], ["Contactul lămpilor de frână", stopInchis() ? "acționat" : "neacționat", sim.pedala && !stopInchis()], ["Tensiunea de alimentare", fx(MD.alimentare(P(), sim.testPompa > 0).U, 1) + " V"]] };
    case "teste": return { titlu: "Teste active – unitatea hidraulică", linii: [["Electrovalve admisie / evacuare (4 + 4)", sim.testPompa > 0 ? "în curs…" : sim.testFacut ? "executat – clicuri audibile" : "—"], ["Pompa de retur", sim.testPompa > 0 ? `funcționează ${fx(5 - sim.testPompa, 1)}/5 s` : sim.testFacut ? (P().defect.tip === "masa" ? "oprită de modul – subtensiune" : "funcțională") : "—", sim.testFacut && P().defect.tip === "masa"],
      ["Tensiunea minimă în timpul testului", sim.uPompaMin != null ? fx(sim.uPompaMin, 2) + " V" : "—", sim.uPompaMin != null && sim.uPompaMin < 10.5], ["Lampa ABS (test)", "OK"]] };
    case "sas": return { titlu: "Calibrarea senzorului de unghi al volanului", linii: [["Unghiul afișat", fx(e.sas, 1) + " °"], ["Starea", sim.calibrat ? "calibrat" : "necalibrat / decalaj"], ["Condiții", "contact pus, vehicul oprit, roți drepte"], ["Viteza roților", stabilV() || sim.vEf > 0.5 ? "≠ 0 – calibrare interzisă" : "0 km/h", sim.vEf > 0.5]] };
    case "epb": return { titlu: "Frâna de parcare electrică – mod service", linii: [["Starea", sim.epbService ? "MOD SERVICE – pistoane retrase" : "normal – frâna aplicată"], ["Lampa P", sim.epbService ? "intermitentă" : "aprinsă"], ["Intrare în modul service", sim.epbFacut.in ? "executată" : "—"], ["Ieșire din modul service", sim.epbFacut.out ? "executată" : "—"]] };
    case "adas": return { titlu: "ADAS – camera frontală și radarul", linii: [["Camera frontală – starea calibrării", a.stare, a.stare !== "calibrată"], ["Unghiul de nealiniere (girație)", fx(a.alfa, 2) + " °", a.alfa > 1], ["Versiune software cameră", "CAM 4.12.03"], ["Radar frontal – starea calibrării", "calibrat"],
      ["Calibrare statică", sim.adas.prog >= 0 ? `în curs ${Math.round(sim.adas.prog)} %` : sim.adas.calibrat ? "reușită" : "—"]] };
  }
  return { titlu: "", linii: [] };
}
function desenX431() {
  const el = $("#svg-x431"); if (!el) return;
  const L = liniiX431();
  let s = `<defs><linearGradient id="xb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f46"/><stop offset="1" stop-color="#16191d"/></linearGradient></defs>`;
  s += `<rect x="6" y="6" width="808" height="318" rx="22" fill="url(#xb)" stroke="#000"/><rect x="26" y="22" width="768" height="286" rx="6" fill="#f4f6f8"/>`;
  s += `<rect x="26" y="22" width="768" height="26" rx="6" fill="#c62828"/>${txt(36, 40, "LAUNCH X-431 PRO", { fs: 12, a: "start", f: "#fff", w: 800 })}${txt(784, 40, "Stand didactic · ABS/ESC 9.0 · " + (NUME_EC[sim.ecran] || ""), { fs: 10.5, a: "end", f: "#ffe1e1" })}`;
  Object.keys(NUME_EC).forEach((k, i) => { const y = 54 + i * 36; s += `<g class="x-meniu" data-ec="${k}" style="cursor:pointer"><rect x="34" y="${y}" width="150" height="31" rx="5" fill="${sim.ecran === k ? "#1f6fd0" : "#dfe5ec"}"/>${txt(109, y + 20, NUME_EC[k].split(" – ")[0], { fs: 10.5, f: sim.ecran === k ? "#fff" : "#1b2733", w: 600 })}</g>`; });
  s += txt(200, 72, L.titlu, { fs: 13, a: "start", f: "#0b2a4a", w: 700 });
  (L.linii || []).forEach(([n, v, al], i) => { const y = 102 + i * 30; s += `<rect x="198" y="${y - 18}" width="586" height="26" fill="${i % 2 ? "#ffffff" : "#e9eef3"}"/>${txt(206, y, n, { fs: 12, a: "start", f: "#1b2733" })}${txt(776, y, v, { fs: 12.5, a: "end", f: al ? "#c62828" : "#0b2a4a", w: 700, fam: "monospace" })}`; });
  el.innerHTML = s;
  $$(".x-meniu", el).forEach(g => g.addEventListener("click", () => { sim.ecran = g.dataset.ec; desenX431(); actualizeazaPasi(); }));
}

/* ------------------------------------------------------------------ pașii */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const ctlSel = `<div class="rand-butoane"><span class="nota">Senzorul:</span>${R4.map((k, i) => `<button type="button" data-sel="${i}">${SCURT[k]}</button>`).join("")}<button type="button" class="b-cupl">Decuplează conectorul</button></div>`;
const ctlV = `<div class="rand-butoane"><span class="nota">Antrenarea roților:</span>${[0, 5, 15, 30].map(v => `<button type="button" data-v="${v}">${v ? v + " km/h" : "oprită"}</button>`).join("")}</div>`;
const ctlMM = `<label class="camp">Multimetrul – punctul de măsură <select class="sel-pct">${PUNCTE.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>`;
const ctlBaza = `<div class="rand-butoane"><button type="button" class="b-contact">Contact</button><button type="button" class="b-vci">Conectează X431 la OBD</button><button type="button" class="b-pedala">Apasă pedala</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×5</label></div>`;
const PASI = [
  { t: "Pregătirea și scanarea", tab: "Tabelul 6.0 – coduri", vedere: "tot", panou: "x431", ecran: "coduri",
    instr: ["NSSM: standul asigurat (frâna de parcare aplicată, roțile libere numai pe stand), ochelari și mănuși; nu se lucrează la etriere în timpul testelor.", "Conectați interfața X431 la priza OBD, puneți contactul (lampa ABS se aprinde ≈ 2 s – autotest) și faceți scanarea modulului ABS/ESC.", "Inspecție vizuală: senzori, conectori, cabluri, roți dințate / inele, nivelul lichidului de frână."],
    ver: () => [[sim.asigurat && sim.manusi && sim.ochelari, "NSSM"], [sim.vci && sim.contact, "X431 conectat, contact pus"], [sim.scanat, "scanare efectuată"]],
    prog: () => pe("t60", "c", "v") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-as"> Standul asigurat</label><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși</label><label class="bifa"><input type="checkbox" id="ck-och"> Ochelari</label></div>${ctlBaza}<div class="rand-butoane"><button type="button" id="b-scan">Scanează (X431)</button></div>`,
    buton: ["● Codurile citite → Tabelul 6.0", e => inregCoduri(e)] },
  { t: "Alimentarea modulului", tab: "Tabelul 6.1", vedere: "modul", panou: "mm x431", ecran: "teste",
    instr: ["Multimetrul: tensiunea de alimentare la conectorul modulului (contact pus).", "Testul activ al pompei (X431 → Teste active): citiți tensiunea în timpul funcționării pompei.", "Contact luat: rezistența masă modul – caroserie; rezistența contactului lămpilor de frână cu pedala eliberată și apăsată."],
    ver: () => [[sim.pct === "ualim" || sim.pct === "rmasa" || sim.pct === "rstop", "multimetrul pe punctul de măsură"], [sim.testFacut, "testul pompei efectuat"]],
    prog: () => ["U", "Up", "Rm", "stop"].filter(k => pe("t61", k, "v")).length, tot: 4,
    ctl: ctlBaza + ctlMM + `<div class="rand-butoane"><button type="button" class="b-testp">Test activ: electrovalve + pompă (5 s)</button></div>`,
    buton: ["● Citirea multimetrului → Tabelul 6.1", e => inregAlim(e)] },
  { t: "Senzorii de turație", tab: "Tabelul 6.2 – R / U, f, v", vedere: "roata", panou: "mm osc x431", ecran: "roti",
    instr: ["Pentru fiecare roată: senzor pasiv – conectorul decuplat: rezistența bobinei (≈ 800…1200 Ω) și izolația; senzor activ – cuplat: tensiunea de alimentare.", "Cuplați conectorul, puneți sonda osciloscopului la senzor, porniți antrenarea la 15 km/h: frecvența semnalului și viteza afișată de X431.", "Înregistrați roata (măsurătorile cu multimetrul trebuie făcute înainte, la aceeași roată)."],
    ver: () => [[sim.osc.pe === sim.sel, "sonda osciloscopului la senzorul selectat"], [stabilV(), sim.vSet ? `antrenare ${sim.vSet} km/h ${stabilV() ? "stabilă" : "…"}` : "antrenarea oprită"], [sim.cuplat[sim.sel], "conectorul cuplat"]],
    prog: () => R4.filter(k => pe("t62", k, "f")).length, tot: 4,
    ctl: ctlSel + ctlMM + ctlV + `<div class="rand-butoane"><button type="button" class="b-osc">Sonda osciloscopului la senzorul selectat</button><button type="button" class="b-mm">Citește multimetrul (memorează)</button></div>`,
    buton: ["● Roata selectată (R / U, f, v X431) → Tabelul 6.2", e => inregRoata(e)] },
  { t: "Identificarea roților", tab: "Tabelul 6.2 – roata afișată", vedere: "tot", panou: "x431", ecran: "roti",
    instr: ["Antrenarea oprită. Rotiți manual, pe rând, fiecare roată (≈ 6 km/h).", "Pe X431 (Viteze roți) observați la ce roată apare viteza; înregistrați roata rotită."],
    ver: () => [[sim.vSet === 0 && sim.vEf < 0.2, "antrenarea oprită"], [sim.manual >= 0, sim.manual >= 0 ? `se rotește roata ${MD.NUME[R4[sim.manual]].toLowerCase()}` : "rotiți o roată"]],
    prog: () => R4.filter(k => pe("t62", k, "afis")).length, tot: 4,
    ctl: ctlBaza + `<div class="rand-butoane"><span class="nota">Rotește manual:</span>${R4.map((k, i) => `<button type="button" data-man="${i}">${SCURT[k]}</button>`).join("")}</div>`,
    buton: ["● Roata rotită → roata afișată (Tabelul 6.2)", e => inregId(e)] },
  { t: "Senzorii ESC și calibrarea", tab: "Tabelul 6.3", vedere: "volan", panou: "x431", ecran: "esc",
    instr: ["Vehicul în repaus, roțile drepte (volanul centrat – reperul galben sus): citiți unghiul volanului, girația, accelerația laterală și presiunea (pedala liberă).", "X431 → Calibrare unghi volan: executați calibrarea (numai cu roțile drepte și roțile oprite).", "Citiți din nou datele ESC (după calibrare)."],
    ver: () => [[Math.abs(sim.volan) < 0.3, `volan: ${fx(sim.volan, 0)}° (roți ${Math.abs(sim.volan) < 0.3 ? "drepte" : "virate"})`], [sim.vEf < 0.2 && sim.manual < 0, "roțile oprite"], [sim.calibrat, "senzorul calibrat"]],
    prog: () => ["inainte", "dupa"].filter(c => pe("t63", "sas", c)).length, tot: 2,
    ctl: ctlBaza + `<div class="rand-butoane"><span class="nota">Volanul:</span><button type="button" data-vol="-90">−90°</button><button type="button" data-vol="-10">−10°</button><button type="button" data-vol="-1">−1°</button><button type="button" data-vol="0">centrat</button><button type="button" data-vol="1">+1°</button><button type="button" data-vol="10">+10°</button><button type="button" data-vol="90">+90°</button><b class="af-vol"></b></div><div class="rand-butoane"><button type="button" id="b-calsas">Calibrează senzorul de unghi (X431)</button></div>`,
    buton: ["● Datele ESC → Tabelul 6.3", e => inregESC(e)] },
  { t: "Teste active și frâna de parcare", tab: "Tabelul 6.4 – service", vedere: "spate", panou: "x431", ecran: "teste",
    instr: ["X431 → Teste active: electrovalvele și pompa ABS (dacă nu ați făcut testul la pasul 2).", "X431 → Frâna de parcare – service: intrați în modul service (pistoanele se retrag – se pot schimba plăcuțele), apoi ieșiți (frâna se reaplică). NSSM: pistoanele nu se forțează mecanic."],
    ver: () => [[sim.testFacut, "testul electrovalvelor și al pompei"], [sim.epbFacut.in, "intrare în modul service"], [sim.epbFacut.out, "ieșire din modul service"]],
    prog: () => ["valve", "epb"].filter(k => pe("t64", k, "stare")).length, tot: 2,
    ctl: ctlBaza + `<div class="rand-butoane"><button type="button" class="b-testp">Test activ: electrovalve + pompă (5 s)</button><button type="button" id="b-epb">Frâna de parcare: intră în modul service</button></div>`,
    buton: ["● Rezultatele testelor → Tabelul 6.4", e => inregService(e)] },
  { t: "ADAS – camera frontală", tab: "Tabelul 6.4 – ADAS", vedere: "adas", panou: "x431 adas", ecran: "adas",
    instr: ["X431 → ADAS: citiți starea calibrării camerei și a radarului și unghiul de nealiniere; înregistrați.", "Pregătiți calibrarea statică: condițiile, ținta pe stativ la distanța (1500 mm de cameră) și înălțimea (1250 mm) din documentație, alinierea cu laserul.", "Porniți calibrarea statică; după încheiere citiți din nou starea și unghiul."],
    ver: () => [[COND.every(([k]) => sim.adas.cond[k]), "condițiile pentru calibrarea statică"], [sim.adas.tinta && Math.abs(sim.adas.dist - ADAS_REF.dist) <= 0.021 && Math.abs(sim.adas.h - ADAS_REF.h) <= 0.011, `ținta: ${fx(sim.adas.dist * 1000, 0)} mm / ${fx(sim.adas.h * 1000, 0)} mm`], [sim.adas.calibrat, "calibrarea statică"]],
    prog: () => ["cam", "alfa", "alfaD"].filter(k => pe("t64", k, "stare")).length, tot: 3,
    ctl: ctlBaza + `<div class="rand-butoane"><button type="button" id="b-tinta">Montează ținta pe stativ</button><button type="button" id="b-laser">Laser de aliniere</button></div>
      <div class="rand-butoane"><span class="nota">Distanța:</span><button type="button" data-td="-0.1">−100</button><button type="button" data-td="-0.01">−10</button><button type="button" data-td="0.01">+10</button><button type="button" data-td="0.1">+100 mm</button><b class="af-td"></b></div>
      <div class="rand-butoane"><span class="nota">Înălțimea:</span><button type="button" data-th="-0.05">−50</button><button type="button" data-th="-0.01">−10</button><button type="button" data-th="0.01">+10</button><button type="button" data-th="0.05">+50 mm</button><b class="af-th"></b></div>
      <div class="cond-adas">${COND.map(([k, t]) => `<label class="bifa"><input type="checkbox" data-cond="${k}"> ${t}</label>`).join("")}</div>
      <div class="rand-butoane"><button type="button" id="b-caladas">Pornește calibrarea statică (X431)</button></div>`,
    buton: ["● Starea camerei / unghiul → Tabelul 6.4", e => inregADAS(e)] },
  { t: "Diagnosticul", tab: "Tabelul 6.6", vedere: "tot", panou: "x431", ecran: "coduri",
    instr: ["Comparați: alimentarea și masa, rezistențele, frecvențele și vitezele afișate, identificarea roților, contactul lămpilor de frână, testul pompei, starea camerei.", "Alegeți defectul ascuns; ștergeți codurile și verificați dacă revin (antrenarea la 15 km/h, pedala, testul pompei)."],
    ver: () => [[sim.sterse, "codurile șterse"]], prog: () => pe("t66", "d", "cauza") ? 1 : 0, tot: 1,
    ctl: ctlBaza + `<div class="rand-butoane"><button type="button" id="b-sterge">Șterge codurile (X431)</button></div>${ctlV}<label class="camp">Defectul identificat <select id="sel-diag"><option value=""></option>${MD.optiuniDiag().map(o => `<option>${o}</option>`).join("")}</select></label>`,
    buton: ["● Diagnosticul → Tabelul 6.6", e => inregDiag(e)] }
];
let pasActiv = 0;
const VEDERI = { tot: [[1.6, 2.3, 3.6], [0.7, 0.85, 0]], modul: [[0.55, 1.35, 0.35], [0.15, 0.85, -0.38]], roata: [[1.25, 1.25, 1.15], [0.72, 0.98, 0.4]], volan: [[2.1, 1.55, 0.75], [1.1, 1.1, 0.2]],
  spate: [[-1.2, 1.3, 1.1], [-0.62, 0.98, 0.4]], adas: [[-0.4, 1.35, 1.3], [1.4, 1.1, 0]] };
const VR = [[[1.25, 1.25, 1.15], [0.72, 0.98, 0.4]], [[1.25, 1.25, -1.15], [0.72, 0.98, -0.4]], [[-1.15, 1.25, 1.15], [-0.62, 0.98, 0.4]], [[-1.15, 1.25, -1.15], [-0.62, 0.98, -0.4]]];
function vedere3d(v) { if (!SV.s3) return; if (v === "roata") return SV.s3.vedere(...VR[sim.sel]); if (VEDERI[v]) SV.s3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small>${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol><ul class="pas-ver"></ul><div class="pas-ctl">${p.ctl}</div><button type="button" class="primar lat" data-inreg="${i}">${p.buton[0]}</button></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].buton[1](e); actualizeazaPasi(); }));
  legaComenzi(); alegePas(0);
}
function alegePas(i) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$(".instr").forEach(el => { el.hidden = !el.dataset.panou.split(" ").some(x => p.panou.split(" ").includes(x)); });
  if (p.ecran) sim.ecran = p.ecran;
  if (i === 1 && !["ualim", "rmasa", "rstop"].includes(sim.pct)) sim.pct = "ualim";
  if (i === 2 && !["rbob", "iz", "uac", "uact"].includes(sim.pct)) sim.pct = sim.sel < 2 ? "rbob" : "uact";
  $$(".sel-pct").forEach(s => s.value = sim.pct);
  vedere3d(p.vedere); deseneaza(); actualizeazaPasi();
}
function deseneaza() { desenX431(); desenMM(); desenOsc(); }
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (sel, on, t1, t0) => $$(sel).forEach(b => { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); });
  s(".b-contact", sim.contact, "Contact: pus", "Contact: luat"); s(".b-vci", sim.vci, "X431 conectat (OBD)", "Conectează X431 la OBD"); s(".b-pedala", sim.pedala, "Eliberează pedala", "Apasă pedala");
  s(".b-cupl", !sim.cuplat[sim.sel], "Cuplează conectorul", "Decuplează conectorul"); s("#b-epb", sim.epbService, "Frâna de parcare: ieși din modul service", "Frâna de parcare: intră în modul service");
  s("#b-tinta", sim.adas.tinta, "Demontează ținta", "Montează ținta pe stativ"); s("#b-laser", sim.adas.laser, "Laser: oprit", "Laser de aliniere");
  $$("[data-sel]").forEach(b => b.classList.toggle("activ", +b.dataset.sel === sim.sel)); $$("[data-v]").forEach(b => b.classList.toggle("activ", +b.dataset.v === sim.vSet && sim.manual < 0));
  $$("[data-man]").forEach(b => b.classList.toggle("activ", +b.dataset.man === sim.manual));
  $$(".af-vol").forEach(e => e.textContent = `real ${fx(sim.volan, 0)}°`); $$(".af-td").forEach(e => e.textContent = `${fx(sim.adas.dist * 1000, 0)} mm`); $$(".af-th").forEach(e => e.textContent = `${fx(sim.adas.h * 1000, 0)} mm`);
  $("#af-st").textContent = sim.contact ? "contact pus" : "contact luat"; $("#af-v").textContent = sim.manual >= 0 ? `manual ${SCURT[R4[sim.manual]]}` : fx(sim.vEf, 1);
  $("#af-mm").textContent = (() => { const r = citireMM(); return r.err ? "Err" : r.txt + " " + r.u; })(); $("#af-osc").textContent = fOsc() > 0 ? fx(fOsc(), 1) + " Hz" : "—";
  $("#af-l").innerHTML = `${lampaABS() ? '<span style="color:#e08a00">ABS</span>' : "—"} ${lampaABS() ? '<span style="color:#e08a00">ESC</span>' : ""}`;
}

/* ------------------------------------------------------------------ comenzile */
function on(sel, f) { $$(sel).forEach(b => b.addEventListener("click", f)); }
function setVSet(v) { if (v > 0 && !sim.asigurat) return Cadru.mesajTemporar("NSSM: asigurați standul înainte de antrenarea roților.", "pericol"); if (v > 0 && sim.epbService) return Cadru.mesajTemporar("Ieșiți întâi din modul service al frânei de parcare.", "atentie"); sim.manual = -1; sim.vSet = v; if (v >= 9) sim.abatere = true; }
function legaComenzi() {
  const ck = (id, k) => { const e = $(id); if (e) e.addEventListener("change", ev => { sim[k] = ev.target.checked; actualizeazaPasi(); }); };
  ck("#ck-as", "asigurat"); ck("#ck-man", "manusi"); ck("#ck-och", "ochelari");
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked; $$(".ck-rapid").forEach(x => x.checked = sim.rapid); }));
  on(".b-contact", () => { sim.contact = !sim.contact; if (sim.contact) sim.tContact = sim.t; deseneaza(); });
  on(".b-vci", () => { sim.vci = !sim.vci; deseneaza(); });
  on(".b-pedala", () => { sim.pedala = !sim.pedala; if (sim.pedala && P().defect.tip === "stop" && sim.contact) sim.testStop = true; });
  on("#b-scan", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("Conectați X431 la OBD și puneți contactul.", "atentie"); sim.scanat = true; sim.ecran = "coduri"; deseneaza(); });
  $$(".sel-pct").forEach(s => s.addEventListener("change", e => { sim.pct = e.target.value; $$(".sel-pct").forEach(x => x.value = sim.pct); deseneaza(); }));
  $$("[data-sel]").forEach(b => b.addEventListener("click", () => { sim.sel = +b.dataset.sel; if (pasActiv === 2) { sim.pct = sim.sel < 2 ? (sim.cuplat[sim.sel] ? "uac" : "rbob") : "uact"; $$(".sel-pct").forEach(x => x.value = sim.pct); vedere3d("roata"); } deseneaza(); }));
  on(".b-cupl", () => { if (sim.vEf > 0.5 || sim.manual >= 0) return Cadru.mesajTemporar("Opriți întâi roțile.", "atentie"); sim.cuplat[sim.sel] = !sim.cuplat[sim.sel]; if (pasActiv === 2 && sim.sel < 2) { sim.pct = sim.cuplat[sim.sel] ? "uac" : "rbob"; $$(".sel-pct").forEach(x => x.value = sim.pct); } deseneaza(); });
  $$("[data-v]").forEach(b => b.addEventListener("click", () => setVSet(+b.dataset.v)));
  $$("[data-man]").forEach(b => b.addEventListener("click", () => { if (sim.vSet > 0 || sim.vEf > 0.2) return Cadru.mesajTemporar("Opriți întâi antrenarea roților.", "atentie"); sim.manual = +b.dataset.man; sim.tManual = 0; }));
  on(".b-osc", () => { sim.osc.pe = sim.sel; deseneaza(); });
  on(".b-mm", () => { const r = citireMM(); if (r.err) return Cadru.mesajTemporar(r.err, "atentie"); (sim.mmMem = sim.mmMem || {})[sim.sel + "|" + sim.pct] = r; Cadru.mesajTemporar(`Multimetrul: ${r.txt} ${r.u} – memorat pentru ${MD.NUME[R4[sim.sel]].toLowerCase()}.`, ""); });
  on(".b-testp", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie"); if (sim.vEf > 0.5) return Cadru.mesajTemporar("Testul activ al pompei se face cu roțile oprite.", "atentie"); if (sim.testPompa > 0) return; sim.testPompa = 5; sim.uPompaMin = 99; sim.ecran = "teste"; });
  $$("[data-vol]").forEach(b => b.addEventListener("click", () => { const d = +b.dataset.vol; sim.volan = d === 0 ? 0 : Math.max(-540, Math.min(540, sim.volan + d)); }));
  on("#b-calsas", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie"); if (sim.vEf > 0.2 || sim.manual >= 0) return Cadru.mesajTemporar("X431: calibrarea refuzată – viteza roților ≠ 0.", "pericol");
    sim.calibrat = true; sim.realCal = sim.volan; sim.ecran = "sas"; Cadru.mesajTemporar(Math.abs(sim.volan) > 0.4 ? `Calibrare executată cu volanul la ${fx(sim.volan, 0)}°: senzorul va indica greșit cu roțile drepte! Centrați volanul și recalibrați.` : "Calibrarea senzorului de unghi a reușit.", Math.abs(sim.volan) > 0.4 ? "atentie" : "ok"); });
  on("#b-epb", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie"); if (sim.vEf > 0.2) return Cadru.mesajTemporar("Roțile trebuie să fie oprite.", "atentie");
    sim.epbService = !sim.epbService; sim.epbFacut[sim.epbService ? "in" : "out"] = true; sim.ecran = "epb"; });
  on("#b-tinta", () => { sim.adas.tinta = !sim.adas.tinta; });
  on("#b-laser", () => { sim.adas.laser = !sim.adas.laser; });
  $$("[data-td]").forEach(b => b.addEventListener("click", () => { if (!sim.adas.tinta) return Cadru.mesajTemporar("Montați întâi ținta pe stativ.", "atentie"); sim.adas.dist = Math.max(0.8, Math.min(3.0, Math.round((sim.adas.dist + +b.dataset.td) * 1000) / 1000)); }));
  $$("[data-th]").forEach(b => b.addEventListener("click", () => { if (!sim.adas.tinta) return Cadru.mesajTemporar("Montați întâi ținta pe stativ.", "atentie"); sim.adas.h = Math.max(0.8, Math.min(1.6, Math.round((sim.adas.h + +b.dataset.th) * 1000) / 1000)); }));
  $$("[data-cond]").forEach(c => c.addEventListener("change", e => { const k = c.dataset.cond;
    if (e.target.checked && k === "volan" && Math.abs(sim.volan) > 0.3) { e.target.checked = false; return Cadru.mesajTemporar("Centrați volanul (roțile drepte).", "atentie"); }
    if (e.target.checked && k === "laser" && !(sim.adas.tinta && sim.adas.laser)) { e.target.checked = false; return Cadru.mesajTemporar("Montați ținta și porniți laserul de aliniere.", "atentie"); }
    if (e.target.checked && k === "pozitie" && !(sim.adas.tinta && Math.abs(sim.adas.dist - ADAS_REF.dist) <= 0.021 && Math.abs(sim.adas.h - ADAS_REF.h) <= 0.011)) { e.target.checked = false; return Cadru.mesajTemporar(`Ținta nu este la poziția din documentație (${ADAS_REF.dist * 1000} mm, înălțimea ${ADAS_REF.h * 1000} mm).`, "atentie"); }
    sim.adas.cond[k] = e.target.checked; actualizeazaPasi(); }));
  on("#b-caladas", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie");
    const lipsa = COND.filter(([k]) => !sim.adas.cond[k]); if (lipsa.length) return Cadru.mesajTemporar("X431: calibrarea statică nu pornește – condiții neîndeplinite: " + lipsa.map(x => x[1].toLowerCase()).join("; ") + ".", "pericol");
    if (Math.abs(sim.adas.dist - ADAS_REF.dist) > 0.021 || Math.abs(sim.adas.h - ADAS_REF.h) > 0.011) return Cadru.mesajTemporar("X431: ținta nu este detectată în fereastra așteptată – verificați distanța și înălțimea.", "pericol");
    sim.adas.prog = 0; sim.ecran = "adas"; });
  on("#b-sterge", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie"); sim.sterse = true; sim.tSters = sim.t; sim.abatere = false; sim.testStop = false; sim.ecran = "coduri"; Cadru.mesajTemporar("Codurile au fost șterse. Verificați dacă revin.", ""); });
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregCoduri(e) {
  if (!sim.scanat) return Cadru.mesajTemporar("Faceți întâi scanarea.", "atentie");
  const c = MD.coduri(P()).map(x => x.split(" – ")[0]).join(", ") || "niciun cod";
  const ok = Cadru.inregistreaza(e, { log: { m: "coduri", v: c }, celule: [{ t: "t60", r: "c", c: "v", v: c }] }); if (ok) msg(`Tabelul 6.0: ${c}.`);
}
function inregAlim(e) {
  const r = citireMM(); if (r.err) return Cadru.mesajTemporar(r.err, "atentie");
  if (sim.pct === "ualim") { if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie");
    const pompa = sim.testPompa > 0, row = pompa ? "Up" : "U"; if (pompa && sim.testPompa > 4.2) return Cadru.mesajTemporar("Așteptați pornirea pompei.", "atentie");
    const ok = Cadru.inregistreaza(e, { log: { m: "alim", pompa, U: r.v }, celule: [{ t: "t61", r: row, c: "v", v: r.v.toFixed(2) }] }); if (ok) msg(`Tabelul 6.1: U alimentare ${pompa ? "cu pompa în funcțiune" : ""} = ${fx(r.v, 2)} V.`); return; }
  if (sim.pct === "rmasa") { const ok = Cadru.inregistreaza(e, { log: { m: "masa", R: r.v }, celule: [{ t: "t61", r: "Rm", c: "v", v: r.v.toFixed(2) }] }); if (ok) msg(`Tabelul 6.1: R masă = ${fx(r.v, 2)} Ω.`); return; }
  if (sim.pct === "rstop") { (sim.stopMem = sim.stopMem || {})[sim.pedala ? "a" : "e"] = r.v;
    if (sim.stopMem.a === undefined || sim.stopMem.e === undefined) return msg(`Contactul lămpilor de frână cu pedala ${sim.pedala ? "apăsată" : "eliberată"}: ${r.txt} Ω – măsurați și cu pedala ${sim.pedala ? "eliberată" : "apăsată"}.`);
    const fa = v => v === "OL" ? "OL" : fx(v, 1), v = `${fa(sim.stopMem.a)} / ${fa(sim.stopMem.e)}`;
    const ok = Cadru.inregistreaza(e, { log: { m: "stop", apasat: sim.stopMem.a, eliberat: sim.stopMem.e }, celule: [{ t: "t61", r: "stop", c: "v", v }] }); if (ok) msg(`Tabelul 6.1: contactul lămpilor de frână apăsat / eliberat = ${v} Ω.`); return; }
  Cadru.mesajTemporar("Alegeți un punct de măsură al alimentării (U alimentare, R masă, contactul lămpilor).", "atentie");
}
function inregRoata(e) {
  const i = sim.sel, k = R4[i], mem = sim.mmMem || {};
  const m = i < 2 ? mem[i + "|rbob"] : mem[i + "|uact"];
  if (!m) return Cadru.mesajTemporar(i < 2 ? "Măsurați întâi rezistența bobinei (conector decuplat) și memorați citirea multimetrului." : "Măsurați întâi tensiunea de alimentare a senzorului activ (contact pus) și memorați citirea.", "atentie");
  if (!sim.cuplat[i]) return Cadru.mesajTemporar("Cuplați conectorul senzorului.", "atentie");
  if (sim.osc.pe !== i) return Cadru.mesajTemporar("Puneți sonda osciloscopului la senzorul acestei roți.", "atentie");
  if (!stabilV() || sim.vSet < 5) return Cadru.mesajTemporar("Antrenarea roților la 15 km/h (stabilă).", "atentie");
  if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus, ecranul Viteze roți.", "atentie");
  const f = fOsc(), vx = vTester()[i], vR = vReal().map(v => Math.round(v * 1000) / 1000), RU = m.v;
  const ok = Cadru.inregistreaza(e, { log: { m: "ws", k, R: i < 2 ? RU : undefined, U: i >= 2 ? RU : undefined, f, vx, vR, vSet: sim.vSet },
    celule: [{ t: "t62", r: k, c: "tip", v: i < 2 ? "pasiv" : "activ" }, { t: "t62", r: k, c: "RU", v: RU === "OL" ? "OL" : i < 2 ? String(RU) : RU.toFixed(1) }, { t: "t62", r: k, c: "f", v: f.toFixed(1) }, { t: "t62", r: k, c: "vx", v: vx.toFixed(1) }] });
  if (ok) msg(`Tabelul 6.2, ${MD.NUME[k].toLowerCase()}: ${i < 2 ? "R = " + (RU === "OL" ? "OL" : RU + " Ω") : "U alim = " + fx(RU, 1) + " V"}, f = ${fx(f, 1)} Hz, v X431 = ${fx(vx, 1)} km/h.`);
}
function inregId(e) {
  if (sim.manual < 0) return Cadru.mesajTemporar("Rotiți manual o roată.", "atentie"); if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie");
  if (sim.tManual < 1) return Cadru.mesajTemporar("Așteptați afișarea vitezei.", "atentie");
  if (sim.cuplat.some(c => !c)) return Cadru.mesajTemporar("Cuplați toți conectorii senzorilor înainte de testul de identificare.", "atentie");
  const vt = vTester(), arata = R4.filter((k, q) => vt[q] > 0), afis = arata.join(",") || "niciuna", k = R4[sim.manual];
  const ok = Cadru.inregistreaza(e, { log: { m: "id", k, afis }, celule: [{ t: "t62", r: k, c: "afis", v: arata.map(x => SCURT[x]).join(", ") || "niciuna" }] });
  if (ok) msg(`Tabelul 6.2: la rotirea roții ${MD.NUME[k].toLowerCase()} viteza apare la: ${arata.map(x => MD.NUME[x].toLowerCase()).join(", ") || "nicio roată"}.`);
}
function inregESC(e) {
  if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie"); if (sim.vEf > 0.2 || sim.manual >= 0) return Cadru.mesajTemporar("Vehiculul în repaus (roțile oprite).", "atentie");
  if (Math.abs(sim.volan) > 0.3) return Cadru.mesajTemporar("Datele se citesc cu roțile drepte (volanul centrat).", "atentie"); if (sim.pedala) return Cadru.mesajTemporar("Presiunea se citește cu pedala liberă.", "atentie");
  const x = MD.esc(P(), sim.volan, sim.calibrat, sim.realCal), col = sim.calibrat ? "dupa" : "inainte";
  const ok = Cadru.inregistreaza(e, { log: { m: "esc", cal: sim.calibrat, real: sim.volan, realCal: sim.realCal, sas: x.sas, yaw: x.yaw, ay: x.ay, p: x.p },
    celule: [["sas", x.sas.toFixed(1)], ["yaw", x.yaw.toFixed(2)], ["ay", x.ay.toFixed(2)], ["p", x.p.toFixed(1)]].map(([r, v]) => ({ t: "t63", r, c: col, v })) });
  if (ok) msg(`Tabelul 6.3 (${col === "dupa" ? "după" : "înainte de"} calibrare): unghi ${fx(x.sas, 1)}°, girație ${fx(x.yaw, 2)} °/s, a_y ${fx(x.ay, 2)} m/s², p ${fx(x.p, 1)} bar.`);
}
function inregService(e) {
  const cel = [], d = P().defect.tip;
  if (sim.testFacut) cel.push({ t: "t64", r: "valve", c: "stare", v: "executat" }, { t: "t64", r: "valve", c: "rez", v: d === "masa" ? `pompa oprită – U min ${fx(sim.uPompaMin, 2)} V` : "funcțional" });
  if (sim.calibrat) cel.push({ t: "t64", r: "sas", c: "stare", v: "executată" }, { t: "t64", r: "sas", c: "rez", v: `unghi după: ${fx(MD.esc(P(), 0, true, sim.realCal).sas, 1)}°` });
  if (sim.epbFacut.in && sim.epbFacut.out) cel.push({ t: "t64", r: "epb", c: "stare", v: "intrare / ieșire" }, { t: "t64", r: "epb", c: "rez", v: "pistoane retrase și reaplicate" });
  if (!cel.length) return Cadru.mesajTemporar("Executați testul activ, calibrarea sau ciclul complet al frânei de parcare.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "svc", teste: cel.map(c => c.r + ":" + c.v) }, celule: cel }); if (ok) msg(`Tabelul 6.4: ${[...new Set(cel.map(c => c.r))].join(", ")} înregistrate.`);
}
function inregADAS(e) {
  if (!sim.contact || !sim.vci || sim.ecran !== "adas") return Cadru.mesajTemporar("X431 → ADAS (contact pus).", "atentie"); if (sim.adas.prog >= 0) return Cadru.mesajTemporar("Așteptați sfârșitul calibrării.", "atentie");
  const a = adasLive(), cal = sim.adas.calibrat, cel = cal ? [{ t: "t64", r: "alfaD", c: "stare", v: a.alfa.toFixed(2) }, { t: "t64", r: "alfaD", c: "rez", v: a.stare }, { t: "t64", r: "cond", c: "stare", v: "îndeplinite" }, { t: "t64", r: "cond", c: "rez", v: `țintă ${ADAS_REF.dist * 1000} mm / ${ADAS_REF.h * 1000} mm` }]
    : [{ t: "t64", r: "cam", c: "stare", v: a.stare }, { t: "t64", r: "alfa", c: "stare", v: a.alfa.toFixed(2) }, { t: "t64", r: "radar", c: "stare", v: "calibrat" }];
  const ok = Cadru.inregistreaza(e, { log: { m: "adas", cal, alfa: a.alfa, stare: a.stare }, celule: cel });
  if (ok) msg(`Tabelul 6.4: camera ${a.stare}, unghiul de nealiniere ${fx(a.alfa, 2)}° (${cal ? "după" : "înainte de"} calibrare).`);
}
function inregDiag(e) { const v = $("#sel-diag").value; if (!v) return Cadru.mesajTemporar("Alegeți defectul.", "atentie"); const ok = Cadru.inregistreaza(e, { log: { m: "diag", v }, celule: [{ t: "t66", r: "d", c: "cauza", v }] }); if (ok) msg(`Tabelul 6.6: ${v}.`); }

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaDA6(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), F = Number.isFinite, cel = { t61: {}, t62: {}, t63: {}, t64: {} }, rele = { t61: {}, t62: {} };
  const U = num(t.t61.U.v), Up = num(t.t61.Up.v), Rm = num(t.t61.Rm.v);
  cel.t61.U = { ref: "≈ U<sub>bat</sub> (12,2…12,8 V)", concl: F(U) ? (U >= 11.5 ? "corespunzătoare" : "prea mică") : "" };
  cel.t61.Up = { ref: "≥ 10,5 V", concl: F(Up) ? (Up >= 10.5 ? "corespunzătoare" : "cădere mare de tensiune – masă / alimentare") : "" }; rele.t61.Up = { concl: F(Up) && Up < 10.5 };
  cel.t61.Rm = { ref: "< 0,1 Ω", concl: F(Rm) ? (Rm < 0.1 ? "corespunzătoare" : "rezistență mare – curățați / strângeți masa") : "" }; rele.t61.Rm = { concl: F(Rm) && Rm >= 0.1 };
  const st = String(t.t61.stop.v || ""); cel.t61.stop = { ref: "≈ 0 / ∞ (OL)", concl: st ? (/^OL/.test(st) ? "nu închide la apăsare – contact defect / dereglat" : "corespunzător") : "" }; rele.t61.stop = { concl: /^OL/.test(st) };
  R4.forEach((k, i) => { const r = t.t62[k], v = o.vr[k], vx = num(r.vx), RU = String(r.RU || ""), af = String(r.afis || "");
    let c = ""; if (RU || r.f) { if (RU === "OL") c = "bobină / cablu întrerupt"; else if (i < 2 && F(num(RU)) && (num(RU) < 700 || num(RU) > 1400)) c = "rezistență în afara domeniului";
      else if (F(v) && F(vx) && Math.abs(v - vx) > 0.6) c = vx < 0.5 ? "fără semnal la modul" : "viteză afișată neplauzibilă"; else c = "în limite"; }
    if (af && af !== SCURT[k]) c = (c && c !== "în limite" ? c + "; " : "") + `la rotire apare la ${af} – conectori inversați`;
    cel.t62[k] = { vr: F(v) ? fx(v, 1) : "", concl: c }; rele.t62[k] = { concl: !!c && c !== "în limite" }; });
  cel.t63.sas = { ref: "≈ 0 (± 2°)" }; cel.t63.yaw = { ref: "≈ 0 (± 0,5 °/s)" }; cel.t63.ay = { ref: "≈ 0 (± 0,1 m/s²)" }; cel.t63.p = { ref: "≈ 0 (< 0,5 bar)" };
  const a = num(t.t64.alfa.stare);
  cel.t64.valve = { obs: "clicuri audibile; pompa funcționează" }; cel.t64.sas = { obs: "după geometrie / înlocuirea senzorului sau a casetei" }; cel.t64.epb = { obs: "numai prin tester; pistoanele nu se forțează" };
  cel.t64.cam = { obs: "după parbriz, geometrie, suspensie: recalibrare" }; cel.t64.alfa = { obs: F(a) ? `y(50 m) = 50·tan α = ${fx(o.y, 2)} m` : "" }; cel.t64.alfaD = { obs: "≈ 0 după calibrare" }; cel.t64.radar = { obs: "" }; cel.t64.cond = { obs: "pardoseală plană, roți drepte, lumină uniformă, țintă la cotă" };
  const rez = [["Viteza roții spate dreapta din frecvență (6.1)", F(o.vr.sd) ? `<span style="color:var(--accent)">${fx(o.vr.sd, 1)} km/h</span>` : "—"],
    ["ω<sub>z,ref</sub> din unghiul necalibrat, v = 20 m/s (6.3–6.4)", F(o.wz) ? `${fx(o.wz, 2)} °/s` : "—"], ["a<sub>y</sub> corespunzătoare (6.5)", F(o.ay) ? `${fx(o.ay, 2)} m/s²` : "—"], ["Abaterea camerei la 50 m (6.8)", F(o.y) ? `${fx(o.y, 2)} m` : "—"]];
  const verdicte = [];
  if (F(o.wz) && Math.abs(o.wz) > 1) verdicte.push({ tip: "atentie", text: `Cu senzorul necalibrat, la 20 m/s în linie dreaptă ESC ar aștepta o girație de ${fx(o.wz, 2)} °/s (a<sub>y</sub> ≈ ${fx(o.ay, 2)} m/s²) – diferența față de girația măsurată (≈ 0) poate declanșa intervenții false.` });
  if (F(o.y) && o.y > 0.5) verdicte.push({ tip: "atentie", text: `Camera „vede” la 50 m cu ${fx(o.y, 2)} m alături – o parte importantă din lățimea benzii: calibrarea este obligatorie.` });
  const pts = R4.map((k, i) => [i + 1, o.vr[k]]).filter(p => F(p[1])), px = R4.map((k, i) => [i + 1, num(t.t62[k].vx)]).filter(p => F(p[1]));
  return { celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Viteza roților: calculată din frecvență și afișată de X431 (antrenare la 15 km/h)",
    grafic: { xmin: 0.5, xmax: 4.5, ymin: 0, ymax: 20, xticks: [1, 2, 3, 4], xlab: "roata (1 FS · 2 FD · 3 SS · 4 SD)", ylab: "v [km/h]", serii: [{ tip: "pct", pts, culoare: 0, r: 6 }, { tip: "pct", pts: px, culoare: 3, r: 4 }] },
    legenda: [["calculată din f", "var(--serie-0)", "pct"], ["afișată de X431", "var(--serie-3)", "pct"]], principal: { eticheta: "v<sub>r</sub> SD", valoare: F(o.vr.sd) ? +o.vr.sd.toFixed(1) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Vehiculul se asigură contra deplasării (cale sub roți, frână de parcare) înainte de testele active pe frâne; roțile ridicate se rotesc manual, numai cu vehiculul pe suporți stabili.</li>
<li>Nu se lucrează la etrieri sau la conducte în timpul testelor pompei ABS; lichidul de frână este coroziv și higroscopic – se lucrează cu ochelari și mănuși.</li>
<li>La frâna de parcare electrică pistoanele se mișcă numai prin tester (modul de service); nu se forțează mecanic.</li>
<li>Senzorii activi de turație nu se măsoară cu ohmmetrul și nu se alimentează direct de la baterie; pompa ABS se acționează numai prin testul activ.</li>
<li>Panourile-țintă ADAS se manipulează cu grijă (sunt calibrate); la testul pe banc cu role nu se stă în fața sau în spatele vehiculului.</li></ul></div>
<h2>6.1. Scopul lucrării</h2>
<p>Verificarea alimentării modulului ABS/ESC și a senzorilor de turație a roților (pasivi și activi); citirea datelor live ESC și executarea testelor active; executarea funcțiilor de service (calibrarea senzorului de unghi al volanului, modul de service al frânei electrice, aerisirea asistată); calculul mărimilor de reglare (viteză, alunecare, viteză de girație de referință) și cunoașterea condițiilor de calibrare a sistemelor ADAS.</p>
<h2>6.2. Noțiuni teoretice</h2>
<p>Sistemul antiblocare (ABS) împiedică blocarea roților, astfel încât vehiculul rămâne dirijabil. Componentele sunt modulul de control, unitatea hidraulică (electrovalve, pompă de retur), senzorii de turație a roților și frânele roților (Fig. 6.1). ECU calculează alunecarea fiecărei roți și modulează presiunea în trei faze – creștere, menținere, reducere – menținând alunecarea în jurul valorii de 10…20 %, unde aderența longitudinală este maximă (Fig. 6.3).</p>
<div class="ec"><span>v<sub>r</sub> = 3,6 · π · d<sub>d</sub> · f / z &nbsp; [km/h]</span><span class="nr">(6.1)</span></div>
<div class="ec"><span>s = (v<sub>veh</sub> − v<sub>r</sub>) / v<sub>veh</sub> · 100 &nbsp; [%]</span><span class="nr">(6.2)</span></div>
<p>unde d<sub>d</sub> este diametrul dinamic al roții [m], f – frecvența semnalului [Hz], z – numărul de dinți sau de perechi de poli ai roții-generator.</p>
<figure><img src="img/fig6_1.jpg" alt="Fig. 6.1" loading="lazy"><figcaption>Fig. 6.1. Componentele sistemului ABS/ESC</figcaption></figure>
<p>Senzorul pasiv (inductiv) dă o tensiune alternativă cu frecvența și amplitudinea proporționale cu viteza; bobina are ≈ 800…1200 Ω, izolația față de masă trebuie să fie „infinită”. Senzorul activ (Hall sau magnetorezistiv) are două fire, alimentare de ≈ 4,5…20 V și transmite viteza prin impulsuri de curent de ≈ 7 mA și 14 mA (Fig. 6.2); detectează viteze de ≈ 0,1 km/h și sensul de rotație. Roata-generator este un inel multipolar magnetizat, adesea integrat în garnitura rulmentului: un rulment montat invers distruge semnalul.</p>
<figure><img src="img/fig6_2.jpg" alt="Fig. 6.2" loading="lazy"><figcaption>Fig. 6.2. Semnalul senzorului de roată pasiv (la două viteze) și al senzorului activ (d<sub>d</sub> = 0,62 m, z = 48)</figcaption></figure>
<figure><img src="img/fig6_3.jpg" alt="Fig. 6.3" loading="lazy"><figcaption>Fig. 6.3. Ciclul de reglare ABS la frânarea pe carosabil alunecos (exemplu)</figcaption></figure>
<p>Programul electronic de stabilitate (ESC) adaugă senzorul de unghi al volanului, senzorul de viteză de girație și accelerație laterală și senzorul de presiune din circuitul de frânare. ESC compară viteza de girație dorită, calculată din unghiul volanului și viteză, cu cea măsurată și frânează selectiv câte o roată pentru a corecta subvirarea sau supravirarea. Pentru viraje lente (modelul cinematic, fără subvirare):</p>
<div class="ec"><span>ω<sub>z,ref</sub> = v · δ / L</span><span class="nr">(6.3)</span></div>
<div class="ec"><span>δ = δ<sub>v</sub> / i<sub>d</sub></span><span class="nr">(6.4)</span></div>
<div class="ec"><span>a<sub>y</sub> = v · ω<sub>z</sub></span><span class="nr">(6.5)</span></div>
<p>unde ω<sub>z</sub> este viteza de girație [rad/s], v – viteza [m/s], L – ampatamentul [m], δ<sub>v</sub> – unghiul volanului, i<sub>d</sub> – raportul de transmitere al direcției. De aceea un senzor de unghi al volanului necalibrat (care arată câteva grade cu roțile drepte) face ESC să intervină fals. Calibrarea se face după reglarea geometriei, înlocuirea senzorului sau a casetei de direcție. La inspecția tehnică eficacitatea frânei de serviciu și dezechilibrul pe punte se calculează din forțele de frânare măsurate pe banc:</p>
<div class="ec"><span>E = ΣF<sub>f</sub> / (m · g) · 100 &nbsp; [%]</span><span class="nr">(6.6)</span></div>
<div class="ec"><span>D = (F<sub>max</sub> − F<sub>min</sub>) / F<sub>max</sub> · 100 ≤ 30 &nbsp; [%]</span><span class="nr">(6.7)</span></div>
<p>Sistemele ADAS (Regulamentul (UE) 2019/2144, obligatorii pentru vehiculele noi înmatriculate din iulie 2024) folosesc camera din parbriz, radare și senzori ultrasonici. O nealiniere unghiulară α produce la distanța d o abatere laterală (Fig. 6.4):</p>
<div class="ec"><span>y = d · tan α</span><span class="nr">(6.8)</span></div>
<p>La 1° și 50 m abaterea este ≈ 0,87 m – jumătate din lățimea unei benzi. Recalibrarea este necesară după înlocuirea parbrizului sau a senzorului, reglarea geometriei, modificarea înălțimii suspensiei, reparații în zona senzorilor sau la apariția unui cod de nealiniere. Calibrarea statică se face cu panouri-țintă la distanțe și înălțimi exacte, pe pardoseală plană, cu presiunea în pneuri corectă, rezervor plin, vehicul descărcat și iluminare uniformă; calibrarea dinamică se face prin rulare, în condițiile cerute de constructor.</p>
<figure><img src="img/fig6_4.jpg" alt="Fig. 6.4" loading="lazy"><figcaption>Fig. 6.4. Abaterea laterală a zonei „văzute” de senzor în funcție de nealinierea unghiulară</figcaption></figure>
<p>Semnalele din Fig. 6.2 se verifică direct la conectorul senzorului: tensiunea senzorului pasiv cu sonda de tensiune, iar curentul senzorului activ cu un clește miliampermetric sau pe o rezistență de măsură. Fig. 6.5 arată cele două semnale pe ecranul osciloscopului, cu frecvența măsurată automat.</p>
<figure><img src="img/fig6_5.jpg" alt="Fig. 6.5" loading="lazy"><figcaption>Fig. 6.5. Semnalul senzorului de roată pasiv la 15 km/h (CH1) și al senzorului activ (CH2) afișate pe osciloscop (20 ms/div)</figcaption></figure>
<h2>6.4. Modul de lucru (în simulator)</h2>
<ol><li>Scanarea modulului ABS/ESC cu X431, codurile.</li><li>Alimentarea și masa modulului, tensiunea în timpul testului pompei, contactul lămpilor de frână.</li><li>Senzorii de turație: rezistența / alimentarea, frecvența pe osciloscop, viteza afișată.</li><li>Identificarea roților prin rotirea individuală.</li><li>Datele ESC, calibrarea senzorului de unghi.</li><li>Teste active, modul service al frânei de parcare electrice.</li><li>ADAS: starea camerei, calibrarea statică.</li><li>Diagnosticul defectului ascuns.</li></ol>
<h2>6.7. Interpretarea rezultatelor</h2>
<ul><li>Rezistență infinită la un senzor pasiv → bobină sau cablu întrerupt; 0 Ω → scurtcircuit; rezistență corectă, dar semnal slab → întrefier mare, murdărie, rulment cu joc.</li>
<li>Viteză afișată la altă roată decât cea rotită → conectori sau cabluri inversate după o reparație.</li>
<li>Senzor activ cu alimentare corectă, dar fără impulsuri → inel multipolar deteriorat sau montat invers, senzor defect.</li>
<li>Unghi al volanului diferit de 0° cu roțile drepte → calibrare necesară; ESC poate interveni fals în viraje.</li>
<li>ADAS: orice intervenție asupra geometriei, parbrizului sau suspensiei trebuie urmată de verificarea și, după caz, de calibrarea senzorilor.</li></ul>
<h2>6.8. Relevanță practică</h2>
<p>Calibrarea ADAS și funcțiile de service ale frânelor electronice sunt printre cele mai solicitate servicii noi din atelierele auto. Revizuirea regulilor UE privind inspecția tehnică introduce verificarea funcționării sistemelor electronice de siguranță și a integrității software-ului.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>d<sub>d</sub> = 0,62 m, z = 48, f = 103 Hz; viraj cu v = 20 m/s, δ<sub>v</sub> = 30°, i<sub>d</sub> = 15, L = 2,6 m; pe banc: 3,1 kN și 2,8 kN pe puntea față, suma forțelor 9,2 kN, m = 1250 kg:</p>
<div class="ec"><span>v<sub>r</sub> = 3,6 · π · 0,62 · 103 / 48 = 15,0 km/h</span><span class="nr">(6.9)</span></div>
<div class="ec"><span>ω<sub>z,ref</sub> = 20 · 0,0349 / 2,6 = 0,268 rad/s = 15,4 °/s</span><span class="nr">(6.10)</span></div>
<div class="ec"><span>a<sub>y</sub> = 20 · 0,268 = 5,4 m/s²</span><span class="nr">(6.11)</span></div>
<div class="ec"><span>E = 9200 / (1250 · 9,81) · 100 = 75 %</span><span class="nr">(6.12)</span></div>
<div class="ec"><span>D = (3,1 − 2,8) / 3,1 · 100 = 9,7 %</span><span class="nr">(6.13)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Calculați frecvența semnalului la 50 km/h pentru d<sub>d</sub> = 0,62 m și z = 48.</p><details class="sol"><summary>Rezolvare</summary><p>f = v·z/(3,6·π·d<sub>d</sub>) = 50·48/(3,6·π·0,62) = 342 Hz.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Ce abatere laterală produce o cameră nealiniată cu 0,5° la 80 m?</p><details class="sol"><summary>Rezolvare</summary><p>y = 80·tan 0,5° = 0,70 m.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Senzorul de unghi al volanului arată 6° cu roțile drepte. Ce viteză de girație de referință calculează ESC la 25 m/s (i<sub>d</sub> = 15, L = 2,6 m)?</p><details class="sol"><summary>Rezolvare</summary><p>δ = 6/15 = 0,4° = 0,00698 rad; ω<sub>z,ref</sub> = 25·0,00698/2,6 = 0,0671 rad/s = 3,85 °/s; a<sub>y</sub> = 1,7 m/s² „așteptată” în linie dreaptă – ESC poate interveni fals.</p></details></div>
<div class="problema"><h3>Problema 4</h3><p>Pe banc, la puntea spate: 1,2 kN stânga și 0,75 kN dreapta. Este acceptabil dezechilibrul?</p><details class="sol"><summary>Rezolvare</summary><p>D = (1,2 − 0,75)/1,2·100 = 37,5 % &gt; 30 % – neacceptat (etrier gripat, plăcuțe contaminate, conductă strangulată).</p></details></div>`;
}
const INTREBARI = [
  ["Ce se întâmplă cu frânarea vehiculului când sistemul ABS este dezactivat de un defect?", "Frâna de serviciu funcționează în continuare convențional (fără modulare): la frânări puternice roțile se pot bloca și vehiculul își pierde dirijabilitatea; lampa ABS (și, de regulă, ESC) rămâne aprinsă. Distribuția electronică a forței de frânare poate fi și ea dezactivată (lampa de frână)."],
  ["Prin ce diferă semnalul unui senzor de roată pasiv de al unui senzor activ? Cum se verifică fiecare?", "Pasiv: tensiune alternativă cu frecvența și amplitudinea proporționale cu viteza – rezistența bobinei, izolația, tensiunea alternativă / osciloscop. Activ: impulsuri de curent 7/14 mA cu amplitudine constantă, de la viteze foarte mici – alimentarea (cuplat), curentul cu clește mA sau pe 100 Ω; nu se măsoară cu ohmmetrul."],
  ["Calculați frecvența semnalului la 50 km/h pentru d<sub>d</sub> = 0,62 m și z = 48.", "f = 50·48/(3,6·π·0,62) ≈ 342 Hz."],
  ["Ce senzori suplimentari folosește ESC față de ABS și ce compară?", "Senzorul de unghi al volanului, senzorul de viteză de girație și accelerație laterală, senzorul de presiune din circuit; compară girația dorită (din unghiul volanului și viteză) cu girația măsurată."],
  ["De ce un senzor de unghi al volanului necalibrat produce intervenții false ale ESC?", "Cu roțile drepte senzorul indică un unghi; ESC calculează o girație de referință diferită de zero, pe care nu o regăsește în girația măsurată, și interpretează diferența ca subvirare / supravirare, frânând selectiv o roată."],
  ["Ce abatere laterală produce o cameră nealiniată cu 0,5° la 80 m?", "y = 80·tan 0,5° ≈ 0,70 m."],
  ["Enumerați patru situații care impun recalibrarea sistemelor ADAS și condițiile unei calibrări statice.", "Înlocuirea parbrizului sau a senzorului, reglarea geometriei, modificarea înălțimii suspensiei, reparații în zona senzorilor, cod de nealiniere. Condiții: pardoseală plană, presiunea corectă în pneuri, rezervor plin, vehicul descărcat, iluminare uniformă, ținta la distanța și înălțimea exacte, aliniată pe axa vehiculului."]
];
const TEST = [
  { q: "Rezistența bobinei unui senzor pasiv este OL. Cauza:", o: ["întrefier mare", "bobină sau cablu întrerupt", "inel multipolar deteriorat", "masă slabă"], c: 1, e: "Circuit deschis." },
  { q: "Senzorul activ se verifică:", o: ["cu ohmmetrul pe bobină", "alimentarea și impulsurile de curent 7/14 mA", "numai vizual", "prin alimentare directă de la baterie"], c: 1, e: "Ohmmetrul îl poate distruge." },
  { q: "v<sub>r</sub> pentru d<sub>d</sub> = 0,62 m, z = 48, f = 103 Hz este:", o: ["7,5 km/h", "15,0 km/h", "30 km/h", "48 km/h"], c: 1, e: "3,6·π·0,62·103/48." },
  { q: "La rotirea roții spate stânga, viteza apare la spate dreapta:", o: ["senzor defect", "conectori inversați", "inel deteriorat", "calibrare necesară"], c: 1, e: "Intrările modulului sunt încrucișate." },
  { q: "Calibrarea senzorului de unghi se face:", o: ["cu volanul la 90°", "cu roțile drepte și vehiculul oprit", "în timpul mersului în viraj", "fără contact"], c: 1, e: "Altfel decalajul se mută." },
  { q: "O nealiniere de 1° la 50 m produce o abatere de:", o: ["0,09 m", "0,87 m", "1,75 m", "5 m"], c: 1, e: "50·tan 1°." }
];
const SV = { s3: null };
function porneste3D() {
  const el = $("#st3d"); if (!el) return;
  import(BAZA_COMUN + "aparate3d.js?v=10").then(m => { SV.s3 = m.creeazaStandABS(el, { laClic: laClic3d }); vedere3d(PASI[pasActiv].vedere); })
    .catch(e => { el.innerHTML = `<p class="nota">Standul 3D nu a putut fi încărcat (${esc(e.message)}).</p>`; });
}
function laClic3d(k) {
  const m = /^(senzor|conector|etrier|epb)(\d)$/.exec(k || "");
  if (m) { sim.sel = +m[2]; if (m[1] === "conector") { $(".b-cupl") && $(".b-cupl").click(); } else Cadru.mesajTemporar(`Selectat: ${MD.NUME[R4[sim.sel]]} (${sim.sel < 2 ? "senzor pasiv" : "senzor activ"}).`, ""); deseneaza(); actualizeazaPasi(); return; }
  if (k === "contact") return $(".b-contact").click();
  if (k === "obd") return $(".b-vci").click();
  if (k === "pedala") return $(".b-pedala").click();
  if (k === "turatie") { const l = [0, 5, 15, 30], i = l.indexOf(sim.vSet); return setVSet(l[(i + 1) % l.length]); }
  if (k === "volan") { sim.volan = sim.volan === 0 ? 10 : 0; return; }
  if (k === "tinta") return Cadru.mesajTemporar(`Ținta: ${fx(sim.adas.dist * 1000, 0)} mm de cameră, centrul la ${fx(sim.adas.h * 1000, 0)} mm.`, "");
  const et = { modul: "Modulul ABS/ESC: alimentare, masă, intrările senzorilor, comanda electrovalvelor și a pompei, CAN.", rezervor: "Lichidul de frână între MIN și MAX.", camera: `Camera frontală – starea: ${adasLive().stare}.`, masa: "Punctul de masă al modulului: se măsoară R masă – caroserie (contact luat).", contactStop: "Contactul lămpilor de frână: închis cu pedala apăsată." }[k];
  if (et) Cadru.mesajTemporar(et, "");
}
const CSS = `<style>
.da6-scena #st3d .m3d { height:clamp(360px, 54vh, 580px); }
.da6-afis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.da6-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .da6-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .da6-afis b { font-size:1.02rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; } .instr svg { width:100%; height:auto; display:block; color:var(--text); }
#cv-osc { width:100%; height:200px; display:block; border-radius:8px; }
.cond-adas { display:grid; gap:.2rem; margin:.3rem 0; font-size:.84rem; }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.da6-scena { position:relative; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); } .pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; } .pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; } .pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; } .pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; } .pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; align-items:center; } .pas-ctl button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); } .pas-ctl .camp { margin:.35rem 0; }
.sim-grila:fullscreen .da6-scena, .sim-grila.ecran-plin .da6-scena { display:block; }
@media (max-width:900px){ .da6-afis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>`;

Cadru.porneste({
  disc: "DA", nr: 6, cod: "da-l6",
  titlu: "Sistemul de frânare cu ABS/ESC și sistemele ADAS",
  scurt: "ABS/ESC și ADAS",
  subtitlu: "Laborator virtual – standul didactic ABS/ESC: alimentarea modulului, senzorii de turație pasivi și activi (multimetru, osciloscop), datele ESC și calibrarea unghiului volanului, testele active, frâna de parcare electrică și calibrarea statică a camerei frontale, cu testerul X431",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261026); },
  date: [{ k: "dd", et: "d<sub>d</sub> [m] (155/60 R15)", v: MD.DD, fix: true }, { k: "z", et: "z (dinți / perechi de poli)", v: MD.Z, fix: true }, { k: "id", et: "i<sub>d</sub> direcție", v: MD.ID, fix: true }, { k: "L", et: "Ampatament L [m]", v: MD.L, fix: true }],
  tabele: [
    { id: "t60", titlu: "Tabelul 6.0. Codurile citite la scanare", antetRand: "", randuri: [{ k: "c", et: "Coduri (ABS/ESC, cameră)" }], coloane: [{ k: "v", t: "Coduri", intrare: true, text: true }] },
    { id: "t61", titlu: "Tabelul 6.1. Alimentarea modulului ABS/ESC", antetRand: "Mărime", randuri: [{ k: "U", et: "Tensiune de alimentare [V]" }, { k: "Up", et: "Tensiune în timpul testului pompei [V]" }, { k: "Rm", et: "Rezistență masă – caroserie [Ω]" }, { k: "stop", et: "Contact lămpi frână, apăsat / eliberat [Ω]" }],
      coloane: [{ k: "v", t: "Valoare", intrare: true, text: true }, { k: "ref", t: "Referință" }, { k: "concl", t: "Concluzie" }] },
    { id: "t62", titlu: "Tabelul 6.2. Senzorii de turație a roților", antetRand: "Roată", nota: "v<sub>r</sub> = 3,6·π·d<sub>d</sub>·f/z cu d<sub>d</sub> = 0,594 m, z = 48; antrenarea la 15 km/h. „Roata afișată”: unde apare viteza pe X431 la rotirea individuală a roții.",
      randuri: R4.map(k => ({ k, et: MD.NUME[k] })),
      coloane: [{ k: "tip", t: "Tip", intrare: true, tip: "select", optiuni: ["pasiv", "activ"] }, { k: "RU", t: "R bobină [Ω] / U alim. [V]", intrare: true, text: true }, { k: "f", t: "f [Hz]", intrare: true }, { k: "vr", t: "v<sub>r</sub> calculat [km/h]" }, { k: "vx", t: "v X431 [km/h]", intrare: true }, { k: "afis", t: "Roata afișată", intrare: true, text: true }, { k: "concl", t: "Concluzie" }] },
    { id: "t63", titlu: "Tabelul 6.3. Senzorii ESC (vehicul în repaus, roți drepte)", antetRand: "Parametru", randuri: [{ k: "sas", et: "Unghi volan [°]" }, { k: "yaw", et: "Viteză de girație [°/s]" }, { k: "ay", et: "Accelerație laterală [m/s²]" }, { k: "p", et: "Presiune circuit frână, pedală liberă [bar]" }],
      coloane: [{ k: "inainte", t: "Înainte de calibrare", intrare: true }, { k: "dupa", t: "După calibrare", intrare: true }, { k: "ref", t: "Referință" }] },
    { id: "t64", titlu: "Tabelul 6.4. Funcții de service și ADAS", antetRand: "Funcție / senzor", randuri: [{ k: "valve", et: "Electrovalve și pompă ABS" }, { k: "sas", et: "Calibrare unghi volan" }, { k: "epb", et: "Frână de parcare electrică – mod service" }, { k: "cam", et: "Cameră frontală – stare calibrare" }, { k: "alfa", et: "Unghi de nealiniere a camerei, înainte [°]" }, { k: "alfaD", et: "Unghi de nealiniere după calibrarea statică [°]" }, { k: "radar", et: "Radar frontal – stare calibrare" }, { k: "cond", et: "Condiții pentru calibrarea statică" }],
      coloane: [{ k: "stare", t: "Executată / stare", intrare: true, text: true }, { k: "rez", t: "Rezultat", intrare: true, text: true }, { k: "obs", t: "Observații" }] },
    { id: "t66", titlu: "Tabelul 6.6. Diagnosticul defectului ascuns", antetRand: "", randuri: [{ k: "d", et: "Defectul" }], coloane: [{ k: "cauza", t: "Defectul identificat", intrare: true, tip: "select", optiuni: MD.optiuniDiag(), manualEval: true }] }
  ],
  inaltimeGrafic: 260,
  calculeaza: calculeazaDA6,
  intrebari() {
    return [
      { id: "q1", u: "km/h", text: "Viteza roții spate dreapta calculată din frecvență (relația 6.1, Tabelul 6.2):", textSimplu: "v_r spate dreapta" },
      { id: "q2", u: "°/s", text: "Viteza de girație de referință pe care ar calcula-o ESC cu unghiul volanului necalibrat (Tabelul 6.3, înainte) la v = 20 m/s, în linie dreaptă (i<sub>d</sub> = 15, L = 1,873 m):", textSimplu: "girația de referință falsă" },
      { id: "q3", u: "m/s²", text: "Accelerația laterală corespunzătoare acestei girații (relația 6.5):", textSimplu: "a_y corespunzătoare" },
      { id: "q4", u: "m", text: "Abaterea laterală la 50 m produsă de unghiul de nealiniere a camerei citit înainte de calibrare (relația 6.8):", textSimplu: "abaterea camerei la 50 m" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    if (t.t60.c.v === "") l.push("Tabelul 6.0: codurile");
    ["U", "Up", "Rm", "stop"].forEach(k => { if (t.t61[k].v === "") l.push(`Tabelul 6.1: ${k}`); });
    R4.forEach(k => { if (t.t62[k].f === "") l.push(`Tabelul 6.2: ${SCURT[k]} (f)`); if (t.t62[k].afis === "") l.push(`Tabelul 6.2: ${SCURT[k]} (roata afișată)`); });
    ["inainte", "dupa"].forEach(c => { if (t.t63.sas[c] === "") l.push(`Tabelul 6.3: ${c === "dupa" ? "după" : "înainte de"} calibrare`); });
    ["valve", "epb", "cam", "alfa", "alfaD"].forEach(k => { if (t.t64[k].stare === "") l.push(`Tabelul 6.4: ${k}`); });
    if (t.t66.d.cauza === "") l.push("Tabelul 6.6: diagnosticul");
    return l;
  },
  exemplu(D) { const t = D.t; t.t62.fs.f = "103"; t.t63.sas.inainte = "4.5"; t.t64.alfa.stare = "1.0"; },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Senzorii ABS/ESC pe autoturism",
    intro: `<p>Pe autoturism senzorii de turație sunt montați în fuzete, cu roata-generator pe butuc sau în rulment; senzorul de unghi este pe coloana de direcție, iar blocul de girație / accelerație laterală în apropierea centrului de greutate. Selectați senzorul roții și urmăriți semnalul de curent al senzorului activ.</p>`,
    dupa: `<p class="nota">Macheta este comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "vssFS" })
  },
  referat: {
    scop: "Verificarea alimentării modulului ABS/ESC și a senzorilor de turație, a datelor ESC și calibrarea senzorului de unghi al volanului, testele active și modul service al frânei de parcare electrice, calibrarea statică a camerei frontale; calculul vitezei roților, al girației de referință și al abaterii camerei.",
    relatii: "v<sub>r</sub> = 3,6·π·d<sub>d</sub>·f/z; &nbsp; ω<sub>z,ref</sub> = v·(δ<sub>v</sub>/i<sub>d</sub>)/L; &nbsp; a<sub>y</sub> = v·ω<sub>z</sub>; &nbsp; y = d·tan α; &nbsp; E = ΣF<sub>f</sub>/(m·g); &nbsp; D = (F<sub>max</sub> − F<sub>min</sub>)/F<sub>max</sub>.",
    varianta: () => "Standul propriu fiecărui student: tensiunea și masa modulului, rezistențele bobinelor, diametrele dinamice reale ale roților, decalajul senzorului de unghi, offseturile ESC, nealinierea camerei și un defect ascuns.",
    indicatii: "Comentați alimentarea și masa, semnalele senzorilor (osciloscop), vitezele afișate și identificarea roților, efectul calibrării unghiului volanului, testele active, starea camerei și abaterea ei la 50 m; justificați diagnosticul defectului ascuns…"
  },
  subsol: "Modelul: alimentarea și căderea de tensiune pe masa modulului la funcționarea pompei, contactul lămpilor de frână, senzori pasivi (R bobină, tensiune alternativă ∝ f) și activi (7/14 mA), f = v·z/(3,6·π·d<sub>d</sub>) cu diametrul dinamic real al fiecărei roți, vitezele calculate de modul cu d<sub>d</sub> nominal, decalajul senzorului de unghi și calibrarea, girația și a<sub>y</sub> în repaus, nealinierea camerei și calibrarea statică. Fiecare student are standul propriu și un defect ascuns.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena da6-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="st3d"><p class="nota">Se încarcă standul 3D…</p></div>
      <div class="da6-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>Antrenare [km/h]</span><b id="af-v">0</b></div><div><span>Multimetru</span><b id="af-mm">—</b></div><div><span>Osciloscop f</span><b id="af-osc">—</b></div><div><span>Lămpi</span><b id="af-l">—</b></div></div>
      <p class="nota">Trageți = rotire · rotița = zoom · clic pe cheia de contact, priza OBD, pedală, butonul de turație, un senzor (selectare) sau conectorul lui (cuplare / decuplare), volan.</p>
      <div class="instr" data-panou="x431"><h3>Testerul Launch X431</h3><svg id="svg-x431" viewBox="0 0 820 330" role="img" aria-label="Testerul Launch X431"></svg></div>
      <div class="instr" data-panou="mm" hidden><h3>Multimetrul</h3><svg id="svg-mm" viewBox="0 0 720 312" role="img" aria-label="Multimetrul"></svg></div>
      <div class="instr" data-panou="osc" hidden><h3>Osciloscopul – CH1 la senzorul selectat (20 ms/div)</h3><canvas id="cv-osc" aria-label="Osciloscopul"></canvas></div>
      <div class="instr" data-panou="adas" hidden><p class="nota">Documentația: ținta la 1500 mm de cameră, centrul la 1250 mm de la pardoseală, pe axa longitudinală a standului (laser).</p></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari" data-doar-demo><summary>Defectul (mod demonstrativ)</summary><p class="nota" id="def-demo"></p></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $("#def-demo").textContent = MD.eticheta(P().defect);
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval() { const d = $("#def-demo"); if (d) d.textContent = ""; },
    reset() { Object.assign(sim, { contact: false, vci: false, vSet: 0, vEf: 0, manual: -1, cuplat: [true, true, true, true], pedala: false, volan: 0, calibrat: false, epbService: false, testPompa: 0 }); },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * (sim.rapid ? 5 : 1);
      sim.t += dt;
      sim.vEf += (sim.vSet - sim.vEf) * (1 - Math.exp(-dt / 0.8)); if (Math.abs(sim.vEf - sim.vSet) < 0.02) sim.vEf = sim.vSet;
      if (sim.manual >= 0) { sim.tManual += dt; if (sim.tManual > 6) sim.manual = -1; }
      if (sim.testPompa > 0) { sim.testPompa = Math.max(0, sim.testPompa - dt); const u = MD.alimentare(P(), true).U; sim.uPompaMin = Math.min(sim.uPompaMin ?? 99, u); if (sim.testPompa === 0) { sim.testFacut = true; if (P().defect.tip === "masa") C.mesajTemporar("X431: pompa a fost oprită de modul – subtensiune (C0800).", "atentie"); } }
      if (sim.adas.prog >= 0) { sim.adas.prog += dt * 8; if (sim.adas.prog >= 100) { sim.adas.prog = -1; sim.adas.calibrat = true; C.mesajTemporar("X431: calibrarea statică a camerei frontale a reușit.", "ok"); } }
      if (SV.s3) { const vr = vReal(), d = P().defect.tip;
        SV.s3.seteaza({ contact: sim.contact, v: vr, volan: sim.volan, pedala: sim.pedala ? 1 : 0, pompa: sim.testPompa > 0 && !(d === "masa" && sim.testPompa < 3.5), valve: sim.testPompa > 0, epb: sim.epbService ? 1 : 0,
          stop: sim.contact && sim.pedala && stopInchis(), lampi: { abs: lampaABS(), esc: lampaABS(), frana: sim.contact && sim.t - sim.tContact < 2.5, p: sim.contact && (sim.epbService ? Math.sin(sim.t * 6) > 0 : true) },
          sel: sim.sel, cuplat: sim.cuplat, vci: sim.vci, turatie: sim.vSet, tinta: { vizibil: sim.adas.tinta, dist: sim.adas.dist, h: sim.adas.h, laser: sim.adas.laser } }); }
      if (!vizibil) return;
      const now = performance.now();
      if (now - (this._td || 0) > 150) { this._td = now; deseneaza(); }
      if (now - (this._ts || 0) > 300) { this._ts = now; actualizeazaPasi(); C.stare(1, sim.contact ? (sim.vEf > 0.2 ? `roți ${fx(sim.vEf, 0)} km/h` : "contact pus") : "contact luat", sim.contact ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { deseneaza(); },
    formule() { return []; }
  }
});
