/* DA – Lucrarea 7. Vehicule electrice și hibride; diagnoza pe bază de date.
   Simulator: vehiculul electric demonstrativ 3D (platforma cu bateria fără capac, cutia de joncțiune, conectorul de service, unitatea de
   propulsie, DC/DC, OBC, compresorul, încălzitorul, bateria de 12 V, stâlpul cu READY și OBD), zona HV delimitată și masa cu echipamentul
   de protecție, megohmmetrul și detectorul de tensiune; modul transparent pentru componentele interne; testerul X431 cu funcții EV
   (scanarea modulelor, BMS, celule, izolație / HVIL, informații) și panoul de analiză a fișierului de date OBD (CSV propriu, porțiunea
   de referință, scorul z). Fiecare student are vehiculul, fișierul de date și un defect HV ascuns. */
"use strict";
const MD = MODELE["da-l7"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);
const VEH = () => MD.vehicul(P());

/* ------------------------------------------------------------------ starea */
const sim = {
  t: 0, rapid: false, zona: false, manusiOk: false, tManusi: -1, ecranF: false, pFrana: false, contact: false, ready: false, vci: false, scanat: false, ecran: "module", sterse: false,
  cheieDep: false, service: true, lacat: false, tOff: null, det: { v1: false, mas: false, v2: false, U: null }, meg: { V: 500, R: null }, aparat: null, transparent: false,
  par: "stft", a: 20, b: 180
};
const NUME_EC = { module: "Scanare module", bms: "BMS – date", celule: "Tensiunile celulelor", hv: "Izolație / HVIL / 12 V", info: "Informații vehicul" };
const TAU = 40;   // [s] constanta de descărcare a condensatoarelor invertorului
function uCond() { if (sim.ready) return VEH().Un * 0.93; if (sim.tOff == null) return 0; return VEH().Un * 0.93 * Math.exp(-(sim.t - sim.tOff) / TAU); }
const asteptat = () => sim.tOff != null && sim.t - sim.tOff >= 300;

/* ------------------------------------------------------------------ X431 */
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 11}" text-anchor="${o.a || "middle"}" fill="${o.f || "currentColor"}" font-weight="${o.w || 400}"${o.fam ? ` font-family="${o.fam}"` : ""}>${s}</text>`;
function liniiX431() {
  const p = P(), v = VEH(), B = MD.bms(p);
  if (!sim.contact) return { titlu: "X431 – contact luat (calculatoarele nu comunică)", linii: [] };
  if (!sim.vci) return { titlu: "Interfața VCI nu este conectată la priza OBD", linii: [] };
  switch (sim.ecran) {
    case "module": { if (!sim.scanat) return { titlu: "Scanare completă – vehicul electric", linii: [["Apăsați „Scanează toate modulele”", "", false]] };
      const c = sim.sterse && !persistent() ? [] : MD.coduri(p), are = k => c.filter(x => x.startsWith(k));
      const mod = [["VCU – unitatea de comandă a vehiculului", c.some(x => /P0AA1|P0562/.test(x)) ? "1 cod" : "OK"], ["BMS – managementul bateriei HV", c.some(x => /P0B3D|P0AA6|P0A7E|P0C73|P0A0A/.test(x)) ? c.filter(x => /P0B3D|P0AA6|P0A7E|P0C73|P0A0A/.test(x)).length + " cod(uri)" : "OK"],
        ["Invertor / motor de tracțiune", "OK"], ["OBC – încărcător de bord", "OK"], ["DC/DC – convertor 12 V", c.some(x => /P0562/.test(x)) ? "1 cod" : "OK"], ["Climatizare (compresor HV)", "OK"]];
      return { titlu: "Scanare completă – " + v.n, linii: mod.map(([a, b]) => [a, b, b !== "OK"]).concat(c.map(x => ["  " + x.split(" – ")[0], x.split(" – ")[1].slice(0, 46), true])) }; }
    case "bms": return { titlu: "BMS – date live (repaus)", linii: [["Starea de încărcare (SOC)", B.soc + " %"], ["Energia nominală / utilizabilă", `${fx(B.Enom, 1)} / ${fx(B.Eutil, 1)} kWh`], ["Tensiunea totală a bateriei", fx(B.Utot, 1) + " V"],
      ["U grup celule min. (nr.) / max.", `${B.Umin.toFixed(3).replace(".", ",")} V (${B.jmin}) / ${B.Umax.toFixed(3).replace(".", ",")} V`, (B.Umax - B.Umin) > 0.04], ["Temperatura min. / max. a bateriei", `${fx(B.Tmin, 1)} / ${fx(B.Tmax, 1)} °C`, B.Tmax - B.Tmin > 8], ["Rezistența de izolație", fx(B.Riso, B.Riso < 1 ? 3 : 2) + " MΩ", B.Riso * 1e6 < 100 * v.Un]] };
    case "celule": return { titlu: `Tensiunile celor ${v.N} grupuri de celule (repaus)`, linii: [], celule: true };
    case "hv": return { titlu: "Izolație, HVIL, contactoare, rețeaua de 12 V", linii: [["Rezistența de izolație (monitor BMS)", fx(B.Riso, B.Riso < 1 ? 3 : 2) + " MΩ", B.Riso * 1e6 < 100 * v.Un], ["Bucla de interblocare HVIL", P().defect.tip === "hvil" ? "DESCHISĂ" : "închisă", P().defect.tip === "hvil"],
      ["Contactoare HV + / − / precontactor", sim.ready ? "închise" : "deschise"], ["Tensiunea rețelei de 12 V", fx(MD.u12(p, sim.ready), 2) + " V", MD.u12(p, sim.ready) < 11.8], ["Convertorul DC/DC", sim.ready ? "activ (14 V)" : "inactiv"], ["Tensiunea condensatorului invertorului", fx(uCond(), 0) + " V", uCond() > 60]] };
    case "info": return { titlu: "Informații vehicul", linii: [["Vehicul", v.n], ["Tensiunea nominală a bateriei", v.Un + " V (" + v.N + " grupuri de celule în serie)"], ["Energia nominală", fx(v.E, 1) + " kWh"], ["Prima înmatriculare (vechime)", p.ani + " ani"], ["Rulaj", p.km.toLocaleString("ro-RO") + " km"], ["Software BMS", "BMS 3.2.17"]] };
  }
  return { titlu: "", linii: [] };
}
function persistent() { return ["celula", "izolatie", "b12", "racire", "hvil"].includes(P().defect.tip); }
function desenX431() {
  const el = $("#svg-x431"); if (!el) return; const L = liniiX431();
  let s = `<defs><linearGradient id="xb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f46"/><stop offset="1" stop-color="#16191d"/></linearGradient></defs>`;
  s += `<rect x="6" y="6" width="808" height="338" rx="22" fill="url(#xb)" stroke="#000"/><rect x="26" y="22" width="768" height="306" rx="6" fill="#f4f6f8"/>`;
  s += `<rect x="26" y="22" width="768" height="26" rx="6" fill="#c62828"/>${txt(36, 40, "LAUNCH X-431 PRO · EV", { fs: 12, a: "start", f: "#fff", w: 800 })}${txt(784, 40, VEH().n + " · " + (NUME_EC[sim.ecran] || ""), { fs: 10.5, a: "end", f: "#ffe1e1" })}`;
  Object.keys(NUME_EC).forEach((k, i) => { const y = 56 + i * 40; s += `<g class="x-meniu" data-ec="${k}" style="cursor:pointer"><rect x="34" y="${y}" width="150" height="34" rx="5" fill="${sim.ecran === k ? "#1f6fd0" : "#dfe5ec"}"/>${txt(109, y + 21, NUME_EC[k].split(" – ")[0].split(" /")[0], { fs: 10.5, f: sim.ecran === k ? "#fff" : "#1b2733", w: 600 })}</g>`; });
  s += txt(200, 72, L.titlu, { fs: 13, a: "start", f: "#0b2a4a", w: 700 });
  if (L.celule) { const c = MD.celule(P()), N = c.length, W = 570, x0 = 206, y0 = 300, H = 190, mn = 3.45, mx = 3.85, med = c.reduce((a, b) => a + b, 0) / N;
    s += `<rect x="${x0}" y="${y0 - H}" width="${W}" height="${H}" fill="#fff" stroke="#c9d1da"/>`;
    for (let v = 3.5; v <= 3.8001; v += 0.1) { const y = y0 - (v - mn) / (mx - mn) * H; s += `<line x1="${x0}" x2="${x0 + W}" y1="${y}" y2="${y}" stroke="#e3e8ee"/>${txt(x0 - 4, y + 4, v.toFixed(1).replace(".", ","), { fs: 9, a: "end", f: "#556" })}`; }
    c.forEach((u, j) => { const h = (u - mn) / (mx - mn) * H, w = W / N; s += `<rect x="${x0 + j * w + 0.2}" y="${y0 - h}" width="${Math.max(0.8, w - 0.6)}" height="${h}" fill="${Math.abs(u - med) > 0.03 ? "#c62828" : "#2f6aa8"}"/>`; });
    const ym = y0 - (med - mn) / (mx - mn) * H; s += `<line x1="${x0}" x2="${x0 + W}" y1="${ym}" y2="${ym}" stroke="#e08a00" stroke-dasharray="4 3"/>${txt(x0 + W - 4, ym - 4, "medie " + med.toFixed(3).replace(".", ",") + " V", { fs: 9.5, a: "end", f: "#a66400" })}`;
    s += txt(x0 + W / 2, y0 + 16, `grupul de celule 1…${N} · clic pe X431 → BMS pentru valorile min. / max.`, { fs: 10, f: "#556" }); }
  (L.linii || []).forEach(([n, v, al], i) => { const y = 102 + i * 26; s += `<rect x="198" y="${y - 17}" width="586" height="23" fill="${i % 2 ? "#ffffff" : "#e9eef3"}"/>${txt(206, y, n, { fs: 11.5, a: "start", f: "#1b2733" })}${txt(776, y, v, { fs: 11.5, a: "end", f: al ? "#c62828" : "#0b2a4a", w: 700, fam: "monospace" })}`; });
  el.innerHTML = s;
  $$(".x-meniu", el).forEach(g => g.addEventListener("click", () => { sim.ecran = g.dataset.ec; desenX431(); actualizeazaPasi(); }));
}

/* ------------------------------------------------------------------ aparatele de măsură HV */
function citireDet() { if (sim.aparat !== "det") return null; return Math.round(uCond()); }
function desenAparate() {
  const el = $("#svg-ap"); if (!el) return;
  const dU = citireDet(), R = sim.meg.R, uc = uCond();
  let s = `<rect x="10" y="10" width="110" height="250" rx="16" fill="#ffd400" stroke="#8a7200"/><rect x="26" y="34" width="78" height="56" rx="6" fill="#1c2a1c"/>${txt(65, 72, sim.aparat === "det" ? (dU > 2 ? dU + " V" : "< 1 V") : "—", { fs: 20, f: "#9dff9d", w: 700, fam: "Courier New,monospace" })}`;
  [[12, 50], [24, 120], [50, 230], [120, 400], [230, 690], [400, 1000]].forEach(([a, b], i) => { const on = sim.aparat === "det" && dU >= a; s += `<circle cx="${40 + (i % 2) * 50}" cy="${112 + Math.floor(i / 2) * 26}" r="7" fill="${on ? (a >= 50 ? "#ff3b3b" : "#ffb300") : "#5a5a3a"}"/>${txt(52 + (i % 2) * 50, 116 + Math.floor(i / 2) * 26, a, { fs: 9, a: "start", f: "#333" })}`; });
  s += txt(65, 210, "DETECTOR", { fs: 11, w: 700, f: "#333" }) + txt(65, 226, "bipolar CAT III", { fs: 9, f: "#333" });
  s += `<rect x="150" y="10" width="190" height="250" rx="16" fill="#f2b705" stroke="#8a6a00"/><rect x="164" y="24" width="162" height="222" rx="10" fill="#4a4e54"/><rect x="176" y="36" width="138" height="62" rx="5" fill="#c9d6c0"/>`;
  s += txt(306, 78, sim.aparat === "meg" && R != null ? (R >= 10 ? ">10" : R < 1 ? (R * 1000).toFixed(0) : R.toFixed(2).replace(".", ",")) : "----", { fs: 28, a: "end", f: "#1d2414", w: 700, fam: "Courier New,monospace" }) + txt(182, 50, sim.aparat === "meg" && R != null ? (R < 1 ? "kΩ" : "MΩ") : "", { fs: 11, a: "start", f: "#1d2414", w: 700 });
  s += txt(245, 94, `U încercare ${sim.meg.V} V`, { fs: 10, f: "#1d2414" });
  s += `<circle cx="245" cy="160" r="38" fill="#1c1e21"/><line x1="245" y1="160" x2="${245 + 30 * Math.sin({ 250: -0.8, 500: 0, 1000: 0.8 }[sim.meg.V])}" y2="${160 - 30 * Math.cos({ 250: -0.8, 500: 0, 1000: 0.8 }[sim.meg.V])}" stroke="#f2b705" stroke-width="6" stroke-linecap="round"/>`;
  [["250 V", -0.8], ["500 V", 0], ["1000 V", 0.8]].forEach(([t, a]) => { s += txt(245 + 52 * Math.sin(a), 164 - 52 * Math.cos(a), t, { fs: 9.5, f: "#eee", w: 700 }); });
  s += txt(245, 236, "MEGOHMMETRU CAT III 1000 V", { fs: 9.5, f: "#eee", w: 700 });
  s += txt(370, 34, "Starea măsurării", { fs: 12, a: "start", w: 700 });
  const L = [[`Conectorul de service: ${sim.service ? "montat" : "scos" + (sim.lacat ? " și asigurat (lacăt)" : "")}`], [`Contact: ${sim.contact ? "pus" : "luat"} · READY: ${sim.ready ? "da" : "nu"} · cheia ${sim.cheieDep ? "la distanță" : "lângă vehicul"}`],
    [`Așteptare după oprire: ${sim.tOff == null ? "—" : fx(Math.min(999, sim.t - sim.tOff), 0) + " / 300 s"}`], [`Detector verificat înainte: ${sim.det.v1 ? "da" : "nu"} · măsurat la borne: ${sim.det.mas ? fx(sim.det.U, 0) + " V" : "—"} · verificat după: ${sim.det.v2 ? "da" : "nu"}`],
    [`Izolație măsurată: ${sim.meg.R != null ? fx(sim.meg.R, sim.meg.R < 1 ? 3 : 2) + " MΩ la " + sim.meg.V + " V" : "—"}`]];
  L.forEach(([t], i) => { s += txt(370, 60 + i * 22, t, { fs: 11.5, a: "start" }); });
  if (uc > 60 && !sim.ready) s += txt(370, 190, `Tensiune periculoasă pe condensatoare: ${fx(uc, 0)} V`, { fs: 12, a: "start", f: "#c62828", w: 700 });
  el.innerHTML = s;
}

/* ------------------------------------------------------------------ panoul de analiză a datelor */
const PAR = { stft: ["STFT", "%", "stft"], map: ["MAP", "kPa", "map"], ubat: ["U baterie", "V", "ubat"] };
let DATE = null;
function date() { if (!DATE || DATE.seed !== P().dSeed) { DATE = MD.date(P()); DATE.seed = P().dSeed; } return DATE; }
function desenDate() {
  const cv = $("#cv-date"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); const st = getComputedStyle(document.documentElement);
  const fond = st.getPropertyValue("--suprafata").trim() || "#fff", text = st.getPropertyValue("--text").trim() || "#222", lin = st.getPropertyValue("--linie").trim() || "#ccc";
  g.fillStyle = fond; g.fillRect(0, 0, W, H);
  const k = sim.par, x = date()[k], m = { l: 50, r: 12, t: 12, b: 26 }, h1 = (H - m.t - m.b) * 0.62, h2 = (H - m.t - m.b) * 0.3, gap = (H - m.t - m.b) - h1 - h2;
  let lo = Math.min(...x.filter(v => v > 0 || k !== "ubat")), hi = Math.max(...x); if (k === "ubat") { lo = 13.9; hi = 14.35; } const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const X = t => m.l + t / 599 * (W - m.l - m.r), Y = v => m.t + h1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * h1;
  g.fillStyle = "rgba(31,111,208,.10)"; g.fillRect(X(sim.a), m.t, X(sim.b) - X(sim.a), h1);
  g.strokeStyle = lin; g.lineWidth = 1; g.strokeRect(m.l, m.t, W - m.l - m.r, h1);
  const r = (Cadru.D.t.t74 || {})[k] || {}, mu = num(r.mu), sg = num(r.sig), areS = Number.isFinite(mu) && Number.isFinite(sg) && sg > 0;
  if (areS) { g.fillStyle = "rgba(46,158,68,.13)"; g.fillRect(m.l, Y(mu + 3 * sg), W - m.l - m.r, Y(mu - 3 * sg) - Y(mu + 3 * sg)); g.strokeStyle = "#2e9e44"; g.setLineDash([5, 4]); [mu - 3 * sg, mu + 3 * sg].forEach(v => { g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(W - m.r, Y(v)); g.stroke(); }); g.setLineDash([]); }
  g.strokeStyle = "#1f5f9e"; g.lineWidth = 1.2; g.beginPath(); x.forEach((v, t) => t ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v))); g.stroke();
  g.fillStyle = text; g.font = "11px system-ui"; g.textAlign = "right"; [lo + pad, (lo + hi) / 2, hi - pad].forEach(v => g.fillText(v.toFixed(k === "ubat" ? 2 : 1).replace(".", ","), m.l - 4, Y(v) + 4));
  g.textAlign = "left"; g.fillText(`${PAR[k][0]} [${PAR[k][1]}] – porțiunea de referință ${sim.a}…${sim.b} s${areS ? " · banda μ ± 3σ din Tabelul 7.4" : " · completați μ și σ în Tabelul 7.4 pentru banda ±3σ"}`, m.l + 6, m.t + 14);
  // scorul z cu μ și σ din tabel
  const y2 = m.t + h1 + gap; g.strokeStyle = lin; g.strokeRect(m.l, y2, W - m.l - m.r, h2);
  if (areS) { const Z = v => y2 + h2 / 2 - Math.max(-10, Math.min(10, v)) / 10 * (h2 / 2); g.setLineDash([4, 3]); g.strokeStyle = "#888"; [3, -3].forEach(z => { g.beginPath(); g.moveTo(m.l, Z(z)); g.lineTo(W - m.r, Z(z)); g.stroke(); }); g.setLineDash([]);
    g.strokeStyle = "#7b3fa0"; g.beginPath(); x.forEach((v, t) => { const z = (v - mu) / sg; t ? g.lineTo(X(t), Z(z)) : g.moveTo(X(t), Z(z)); }); g.stroke();
    g.fillStyle = "#c62828"; let n = 0; x.forEach((v, t) => { const z = (v - mu) / sg; if (Math.abs(z) > 3) { n++; g.beginPath(); g.arc(X(t), Z(z), 2.2, 0, 7); g.fill(); } });
    g.fillStyle = text; g.fillText(`z = (x − μ)/σ · puncte cu |z| > 3: ${n}`, m.l + 6, y2 + 14); }
  else { g.fillStyle = text; g.fillText("scorul z apare după completarea lui μ și σ", m.l + 6, y2 + 14); }
  g.textAlign = "center"; for (let t = 0; t < 600; t += 100) g.fillText(String(t), X(t), H - 8); g.textAlign = "right"; g.fillText("600 s", W - m.r, H - 8);
}
function descarcaCSV() {
  const b = new Blob(["﻿" + MD.csv(P())], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = "Diagnoza_L7_date_OBD_ralanti.csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  Cadru.mesajTemporar("Fișierul propriu de date (600 s, 1 Hz; separator „;”, zecimale cu virgulă) a fost descărcat.", "ok");
}

/* ------------------------------------------------------------------ pașii */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const ctlBaza = `<div class="rand-butoane"><button type="button" class="b-contact">Contact</button><button type="button" class="b-vci">Conectează X431 la OBD</button><button type="button" class="b-ready">START (READY)</button><label class="bifa"><input type="checkbox" class="ck-tr"> Componente transparente</label></div>`;
const PASI = [
  { t: "Instruirea HV și zona de lucru", tab: "Tabelul 7.1 – zona, EPI, vehiculul", vedere: "tot", panou: "x431",
    instr: ["NSSM: peste 60 V c.c. / 30 V c.a. este înaltă tensiune; cablurile HV sunt portocalii. Delimitați și semnalizați zona de lucru.", "Echipamentul de protecție: testul de etanșeitate al mănușilor electroizolante (se umflă și se verifică pierderile de aer), ecranul facial.", "Vehiculul în P, frâna de parcare aplicată. Înregistrați verificările."],
    ver: () => [[sim.zona, "zona delimitată și semnalizată"], [sim.manusiOk && sim.ecranF, "EPI verificat (mănuși testate, ecran facial)"], [sim.pFrana, "P + frâna de parcare"]],
    prog: () => ["zona", "epi", "p"].filter(k => pe("t71", k, "da")).length, tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" id="b-zona">Delimitează zona HV</button><button type="button" id="b-man">Testul mănușilor (umflare)</button><label class="bifa"><input type="checkbox" id="ck-ef"> Ecran facial purtat</label><label class="bifa"><input type="checkbox" id="ck-p"> P + frâna de parcare</label></div>`,
    buton: ["● Verificările → Tabelul 7.1", e => inregSig(e)] },
  { t: "Scanarea și READY", tab: "Tabelul 7.2 – coduri", vedere: "tot", panou: "x431", ecran: "module",
    instr: ["Conectați X431 la priza OBD și puneți contactul; scanați toate modulele (BMS, invertor, OBC, DC/DC, VCU).", "Încercați pornirea sistemului HV (START cu frâna apăsată): READY se aprinde numai dacă izolația, HVIL și rețeaua de 12 V permit închiderea contactoarelor.", "Înregistrați codurile HV."],
    ver: () => [[sim.vci && sim.contact, "X431 conectat, contact pus"], [sim.scanat, "scanare efectuată"]],
    prog: () => pe("t72", "coduri", "v") ? 1 : 0, tot: 1, ctl: ctlBaza + `<div class="rand-butoane"><button type="button" id="b-scan">Scanează toate modulele</button><button type="button" id="b-sterge">Șterge codurile</button></div>`,
    buton: ["● Codurile HV → Tabelul 7.2", e => inregCoduri(e)] },
  { t: "Datele BMS", tab: "Tabelele 7.2 și 7.3", vedere: "baterie", panou: "x431", ecran: "bms",
    instr: ["X431 → BMS: SOC, energia nominală și utilizabilă, tensiunea totală, tensiunile minimă și maximă ale grupurilor de celule, temperaturile, rezistența de izolație; X431 → Izolație / HVIL / 12 V: tensiunea bateriei de 12 V.", "X431 → Tensiunile celulelor: urmăriți dispersia (Fig. 7.2). X431 → Informații: tipul, tensiunea nominală, vechimea și rulajul.", "Înregistrați datele BMS și informațiile vehiculului."],
    ver: () => [[sim.contact && sim.vci, "X431 conectat, contact pus"], [["bms", "hv", "info", "celule"].includes(sim.ecran), "ecranul BMS / izolație / informații"]],
    prog: () => ["energU", "umin", "u12"].filter(k => pe("t72", k, "v")).length + (pe("t73", "e", "vech") ? 1 : 0), tot: 4, ctl: ctlBaza,
    buton: ["● Datele BMS și informațiile → Tabelele 7.2 / 7.3", e => inregBMS(e)] },
  { t: "Deconectarea și izolația", tab: "Tabelele 7.1 și 7.3 – R<sub>iso</sub>", vedere: "bdu", panou: "x431 ap", ecran: "hv",
    instr: ["Persoana calificată (voi, în simulator): contactul luat, cheia la cel puțin 5 m, conectorul de service scos și asigurat cu lacătul; așteptați descărcarea condensatoarelor (5 min; Timp ×10).", "Verificați detectorul pe o sursă cunoscută, măsurați la bornele HV ale cutiei de joncțiune (lipsa tensiunii) și verificați din nou detectorul.", "Megohmmetrul: tensiunea de încercare (500 V pentru 400 V, 1000 V pentru 800 V) între HV+ și caroserie; înregistrați rezistența de izolație."],
    ver: () => [[!sim.contact && sim.cheieDep, "contact luat, cheia la distanță"], [!sim.service && sim.lacat, "conectorul de service scos și asigurat"], [asteptat(), `așteptare: ${sim.tOff == null ? "—" : fx(Math.min(300, sim.t - sim.tOff), 0)}/300 s`], [sim.det.v1 && sim.det.mas && sim.det.v2, "lipsa tensiunii verificată"], [sim.meg.R != null, "izolația măsurată"]],
    prog: () => ["service", "asteptare", "lipsa"].filter(k => pe("t71", k, "da")).length + (pe("t73", "e", "riso") ? 1 : 0), tot: 4,
    ctl: `<div class="rand-butoane"><button type="button" class="b-contact">Contact</button><button type="button" id="b-cheie">Cheia la distanță (≥ 5 m)</button><button type="button" id="b-service">Scoate conectorul de service</button><button type="button" id="b-lacat">Asigură cu lacăt</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>
      <div class="rand-butoane"><button type="button" id="b-dv">Detector: verificare pe sursă cunoscută</button><button type="button" id="b-dm">Detector: măsurare la bornele HV</button></div>
      <div class="rand-butoane"><span class="nota">Megohmmetru:</span>${[250, 500, 1000].map(v => `<button type="button" data-mv="${v}">${v} V</button>`).join("")}<button type="button" id="b-meg">Măsoară HV+ – caroserie</button><label class="bifa"><input type="checkbox" class="ck-tr"> Componente transparente</label></div>`,
    buton: ["● Verificările / izolația → Tabelele 7.1 și 7.3", e => inregDecon(e)] },
  { t: "Diagnoza pe date", tab: "Tabelul 7.4", vedere: "tot", panou: "date",
    instr: ["Descărcați fișierul vostru de date (CSV, 600 s la 1 Hz, ralanti cald pe standul K7J) și deschideți-l în Excel / Python.", "Pentru fiecare parametru alegeți o porțiune stabilă de referință, calculați μ, σ (relațiile 7.6–7.7) și scorul z; numărați punctele cu |z| > 3 și găsiți momentele lor.", "Înregistrați porțiunea de referință, apoi completați μ, σ, numărul de puncte, momentul și explicația în Tabelul 7.4 (fila Determinări): graficul afișează banda ±3σ și scorul z cu valorile voastre."],
    ver: () => [[["stft", "map", "ubat"].every(k => pe("t74", k, "ref")), "porțiunile de referință"], [["stft", "map", "ubat"].every(k => pe("t74", k, "sig")), "μ, σ completate"]],
    prog: () => ["stft", "map", "ubat"].filter(k => pe("t74", k, "ref")).length + ["stft", "map", "ubat"].filter(k => pe("t74", k, "n")).length, tot: 6,
    ctl: `<div class="rand-butoane"><button type="button" id="b-csv">⬇ Descarcă fișierul de date (CSV)</button></div><div class="rand-butoane"><span class="nota">Parametrul:</span>${Object.keys(PAR).map(k => `<button type="button" data-par="${k}">${PAR[k][0]}</button>`).join("")}</div>
      <div class="rand-butoane"><label class="camp">Referință de la [s] <input type="number" id="in-a" min="0" max="590" step="1" value="20"></label><label class="camp">până la [s] <input type="number" id="in-b" min="10" max="599" step="1" value="180"></label></div>`,
    buton: ["● Porțiunea de referință → Tabelul 7.4", e => inregRef(e)] },
  { t: "Diagnosticul", tab: "Tabelul 7.5", vedere: "tot", panou: "x431", ecran: "module",
    instr: ["Comparați SOH cu cerința Euro 7, dispersia tensiunilor și a temperaturilor, izolația cu valoarea minimă, HVIL, tensiunea de 12 V și condiția READY.", "Alegeți defectul HV ascuns al vehiculului vostru."],
    ver: () => [[true, "datele colectate"]], prog: () => pe("t75", "d", "cauza") ? 1 : 0, tot: 1,
    ctl: `<label class="camp">Defectul identificat <select id="sel-diag"><option value=""></option>${MD.optiuniDiag().map(o => `<option>${o}</option>`).join("")}</select></label>`,
    buton: ["● Diagnosticul → Tabelul 7.5", e => inregDiag(e)] }
];
let pasActiv = 0;
const VEDERI = { tot: [[3.4, 2.5, 3.7], [0.0, 0.45, 0.0]], baterie: [[0.6, 1.9, 1.6], [-0.05, 0.35, 0.0]], bdu: [[1.95, 1.25, 1.1], [1.05, 0.4, 0.15]], ppe: [[2.9, 1.5, -1.0], [2.25, 0.85, -2.0]] };
function vedere3d(v) { if (SV.s3 && VEDERI[v]) SV.s3.vedere(...VEDERI[v]); }
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
  if (p.ecran) sim.ecran = p.ecran; vedere3d(i === 0 ? (sim.zona ? "ppe" : "tot") : p.vedere); deseneaza(); actualizeazaPasi();
}
function deseneaza() { desenX431(); desenAparate(); desenDate(); }
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (sel, on, t1, t0) => $$(sel).forEach(b => { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); });
  s(".b-contact", sim.contact, "Contact: pus", "Contact: luat"); s(".b-vci", sim.vci, "X431 conectat (OBD)", "Conectează X431 la OBD"); s(".b-ready", sim.ready, "STOP (READY activ)", "START (READY)");
  s("#b-zona", sim.zona, "Zona HV delimitată", "Delimitează zona HV"); s("#b-man", sim.manusiOk, "Mănuși: fără pierderi ✓", "Testul mănușilor (umflare)"); s("#b-cheie", sim.cheieDep, "Cheia la distanță ✓", "Cheia la distanță (≥ 5 m)");
  s("#b-service", !sim.service, "Montează conectorul de service", "Scoate conectorul de service"); s("#b-lacat", sim.lacat, "Lacăt montat ✓", "Asigură cu lacăt");
  $$("[data-mv]").forEach(b => b.classList.toggle("activ", +b.dataset.mv === sim.meg.V)); $$("[data-par]").forEach(b => b.classList.toggle("activ", b.dataset.par === sim.par));
  $$(".ck-tr").forEach(c => c.checked = sim.transparent);
  $("#af-st").textContent = sim.ready ? "READY" : sim.contact ? "contact pus" : "oprit"; $("#af-hv").textContent = fx(uCond(), 0) + " V"; $("#af-sv").textContent = sim.service ? "montat" : "scos";
  $("#af-12").textContent = fx(MD.u12(P(), sim.ready), 2) + " V"; $("#af-z").textContent = sim.zona ? "delimitată" : "—";
}

/* ------------------------------------------------------------------ comenzile */
function on(sel, f) { $$(sel).forEach(b => b.addEventListener("click", f)); }
function incearcaReady() {
  if (sim.ready) { sim.ready = false; sim.tOff = sim.t; return; }
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie"); if (!sim.service) return Cadru.mesajTemporar("Conectorul de service este scos – bateria este separată.", "atentie");
  if (!sim.pFrana) return Cadru.mesajTemporar("Vehiculul în P, cu frâna de parcare (și frâna de serviciu apăsată la START).", "atentie");
  const d = P().defect.tip;
  if (d === "b12") return Cadru.mesajTemporar("READY eșuat: tensiunea de 12 V prea mică – contactoarele nu se închid (clicuri repetate). Verificați bateria de 12 V.", "pericol");
  if (d === "izolatie") return Cadru.mesajTemporar("READY refuzat: BMS a detectat izolație insuficientă – contactoarele rămân deschise.", "pericol");
  if (d === "hvil") return Cadru.mesajTemporar("READY refuzat: bucla HVIL deschisă – un conector HV nu este fixat.", "pericol");
  sim.ready = true; sim.tOff = null; Cadru.mesajTemporar("READY: contactoarele HV închise, DC/DC activ.", "ok");
}
function legaComenzi() {
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked; $$(".ck-rapid").forEach(x => x.checked = sim.rapid); }));
  $$(".ck-tr").forEach(c => c.addEventListener("change", e => { sim.transparent = e.target.checked; actualizeazaPasi(); }));
  const ef = $("#ck-ef"); if (ef) ef.addEventListener("change", e => { sim.ecranF = e.target.checked; actualizeazaPasi(); });
  const pp = $("#ck-p"); if (pp) pp.addEventListener("change", e => { sim.pFrana = e.target.checked; actualizeazaPasi(); });
  on("#b-zona", () => { sim.zona = !sim.zona; if (sim.zona) vedere3d("tot"); });
  on("#b-man", () => { sim.tManusi = 0; vedere3d("ppe"); });
  on(".b-contact", () => { if (!sim.contact && sim.cheieDep) return Cadru.mesajTemporar("Cheia de proximitate este la distanță – contactul nu se poate pune.", "atentie"); if (sim.contact) { if (sim.ready) { sim.ready = false; } sim.contact = false; sim.tOff = sim.t; } else sim.contact = true; deseneaza(); });
  on(".b-vci", () => { sim.vci = !sim.vci; deseneaza(); });
  on(".b-ready", incearcaReady);
  on("#b-scan", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie"); sim.scanat = true; sim.ecran = "module"; deseneaza(); });
  on("#b-sterge", () => { if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie"); sim.sterse = true; Cadru.mesajTemporar(persistent() ? "Codurile au fost șterse, dar revin imediat: defectul este prezent." : "Codurile au fost șterse.", ""); deseneaza(); });
  on("#b-cheie", () => { if (sim.contact) return Cadru.mesajTemporar("Luați întâi contactul.", "atentie"); sim.cheieDep = !sim.cheieDep; });
  on("#b-service", () => { if (sim.service) { if (sim.contact || sim.ready) return Cadru.mesajTemporar("NSSM: contactul luat înainte de scoaterea conectorului de service.", "pericol"); if (!sim.manusiOk || !sim.ecranF) return Cadru.mesajTemporar("NSSM: mănușile electroizolante verificate și ecranul facial.", "pericol"); if (!sim.cheieDep) return Cadru.mesajTemporar("NSSM: cheia de proximitate la cel puțin 5 m.", "atentie"); if (!sim.zona) return Cadru.mesajTemporar("NSSM: delimitați zona de lucru.", "atentie");
      sim.service = false; if (sim.tOff == null) sim.tOff = sim.t; } else { sim.service = true; sim.lacat = false; } });
  on("#b-lacat", () => { if (sim.service) return Cadru.mesajTemporar("Scoateți întâi conectorul de service.", "atentie"); sim.lacat = !sim.lacat; });
  on("#b-dv", () => { sim.aparat = "det"; if (!sim.det.mas) sim.det.v1 = true; else sim.det.v2 = true; Cadru.mesajTemporar("Detectorul indică corect pe sursa de verificare (LED-urile și afișajul funcționează).", "ok"); });
  on("#b-dm", () => { if (!sim.manusiOk || !sim.ecranF) return Cadru.mesajTemporar("NSSM: mănușile și ecranul facial.", "pericol"); if (!sim.det.v1) return Cadru.mesajTemporar("Verificați întâi detectorul pe o sursă cunoscută.", "atentie");
    sim.aparat = "det"; const u = Math.round(uCond()); sim.det.U = u; sim.det.mas = u <= 2; sim.det.v2 = false; vedere3d("bdu");
    if (u > 2) Cadru.mesajTemporar(`PERICOL: ${u} V la borne! ${sim.ready ? "Sistemul este READY." : "Condensatoarele nu s-au descărcat – așteptați."}`, "pericol"); else Cadru.mesajTemporar("Lipsa tensiunii la bornele HV: < 1 V. Verificați din nou detectorul pe sursa cunoscută.", ""); });
  $$("[data-mv]").forEach(b => b.addEventListener("click", () => { sim.meg.V = +b.dataset.mv; deseneaza(); }));
  on("#b-meg", () => { if (!(sim.det.v1 && sim.det.mas && sim.det.v2)) return Cadru.mesajTemporar("Megohmmetrul se folosește numai după verificarea lipsei tensiunii (detector verificat înainte și după).", "pericol");
    const Vn = VEH().Un; if (sim.meg.V < (Vn > 500 ? 1000 : 500)) Cadru.mesajTemporar(`Tensiunea de încercare de ${sim.meg.V} V este prea mică pentru un sistem de ${Vn} V (se folosește ${Vn > 500 ? 1000 : 500} V).`, "atentie");
    sim.aparat = "meg"; sim.meg.R = MD.izolatie(P()); vedere3d("bdu"); deseneaza(); });
  on("#b-csv", descarcaCSV);
  $$("[data-par]").forEach(b => b.addEventListener("click", () => { sim.par = b.dataset.par; const r = Cadru.D.t.t74[sim.par], iv = MD.interval(r.ref); if (iv) { sim.a = iv[0]; sim.b = iv[1]; $("#in-a").value = sim.a; $("#in-b").value = sim.b; } deseneaza(); actualizeazaPasi(); }));
  const ia = $("#in-a"), ib = $("#in-b"); [ia, ib].forEach(i => i && i.addEventListener("input", () => { const a = Math.round(num(ia.value)), b = Math.round(num(ib.value)); if (Number.isFinite(a) && Number.isFinite(b) && b - a >= 10) { sim.a = a; sim.b = b; desenDate(); } }));
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregSig(e) {
  const cel = [];
  if (sim.zona) cel.push({ t: "t71", r: "zona", c: "da", v: "Da" }, { t: "t71", r: "zona", c: "obs", v: "stâlpi cu lanț, panou „Pericol HV”" });
  if (sim.manusiOk && sim.ecranF) cel.push({ t: "t71", r: "epi", c: "da", v: "Da" }, { t: "t71", r: "epi", c: "obs", v: "mănuși clasa 0 fără pierderi; ecran facial" });
  if (sim.pFrana) cel.push({ t: "t71", r: "p", c: "da", v: "Da" }, { t: "t71", r: "p", c: "obs", v: sim.cheieDep ? "P, frâna de parcare, cheia la distanță" : "P, frâna de parcare (cheia – la deconectare)" });
  if (!cel.length) return Cadru.mesajTemporar("Nu este îndeplinită nicio verificare.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "sig", r: cel.filter(c => c.c === "da").map(c => c.r) }, celule: cel }); if (ok) msg(`Tabelul 7.1: ${cel.filter(c => c.c === "da").map(c => c.r).join(", ")} – Da.`);
}
function inregCoduri(e) {
  if (!sim.scanat) return Cadru.mesajTemporar("Faceți întâi scanarea.", "atentie");
  const c = MD.coduri(P()).map(x => x.split(" – ")[0]).join(", ") || "niciun cod";
  const ok = Cadru.inregistreaza(e, { log: { m: "coduri", v: c, ready: sim.ready }, celule: [{ t: "t72", r: "coduri", c: "v", v: c }, { t: "t72", r: "coduri", c: "obs", v: MD.ready(P()) ? "READY posibil" : "READY refuzat" }] }); if (ok) msg(`Tabelul 7.2: ${c}.`);
}
function inregBMS(e) {
  if (!sim.contact || !sim.vci) return Cadru.mesajTemporar("X431 conectat, contact pus.", "atentie");
  if (!["bms", "hv", "info", "celule"].includes(sim.ecran)) return Cadru.mesajTemporar("Deschideți ecranul BMS (sau Izolație / Informații) al X431.", "atentie");
  const p = P(), v = VEH(), B = MD.bms(p), U12 = MD.u12(p, sim.ready);
  const cel = [["tip", `${v.n} / ${v.Un} V`], ["soc", String(B.soc)], ["energN", B.Enom.toFixed(1)], ["energU", B.Eutil.toFixed(1)], ["utot", B.Utot.toFixed(1)], ["umin", B.Umin.toFixed(3)], ["jmin", String(B.jmin)], ["umax", B.Umax.toFixed(3)],
    ["tmin", B.Tmin.toFixed(1)], ["tmax", B.Tmax.toFixed(1)], ["riso", B.Riso.toFixed(3)], ["u12", U12.toFixed(2)]].map(([r, x]) => ({ t: "t72", r, c: "v", v: x }));
  cel.push({ t: "t73", r: "e", c: "vech", v: `${p.ani} / ${p.km}` });
  const ok = Cadru.inregistreaza(e, { log: { m: "bms", ready: sim.ready, soc: B.soc, Eutil: B.Eutil, Umin: B.Umin, Umax: B.Umax, Tmax: B.Tmax, Riso: B.Riso, U12 }, celule: cel });
  if (ok) msg(`Tabelul 7.2: SOC ${B.soc} %, ${fx(B.Eutil, 1)}/${fx(B.Enom, 1)} kWh, U celule ${B.Umin.toFixed(3)}…${B.Umax.toFixed(3)} V, T ${fx(B.Tmin, 1)}…${fx(B.Tmax, 1)} °C, R iso ${fx(B.Riso, 3)} MΩ, 12 V ${fx(U12, 2)} V; Tabelul 7.3: ${p.ani} ani / ${p.km} km.`);
}
function inregDecon(e) {
  const cel = [], log = [];
  if (!sim.service && sim.lacat) cel.push({ t: "t71", r: "service", c: "da", v: "Da" }, { t: "t71", r: "service", c: "obs", v: "scos, lacăt și etichetă" });
  if (asteptat()) cel.push({ t: "t71", r: "asteptare", c: "da", v: "Da" }, { t: "t71", r: "asteptare", c: "obs", v: "≥ 5 min după oprire" });
  if (sim.det.v1 && sim.det.mas && sim.det.v2) cel.push({ t: "t71", r: "lipsa", c: "da", v: "Da" }, { t: "t71", r: "lipsa", c: "obs", v: `${sim.det.U} V la borne; detector verificat înainte și după` });
  if (sim.meg.R != null) { cel.push({ t: "t73", r: "e", c: "riso", v: sim.meg.R.toFixed(3) }); log.push({ m: "meg", R: sim.meg.R, V: sim.meg.V }); }
  if (!cel.length) return Cadru.mesajTemporar("Executați pașii deconectării (conector de service, așteptare, lipsa tensiunii, izolația).", "atentie");
  const ok = Cadru.inregistreaza(e, { log: log.length ? log : { m: "decon" }, celule: cel }); if (ok) msg(`Înregistrat: ${cel.map(c => c.t + "." + c.r).filter((x, i, a) => a.indexOf(x) === i).join(", ")}.`);
}
function inregRef(e) {
  const a = Math.round(num($("#in-a").value)), b = Math.round(num($("#in-b").value)); if (!(b - a >= 10)) return Cadru.mesajTemporar("Porțiunea de referință are cel puțin 10 s.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "ref", k: sim.par, a, b }, celule: [{ t: "t74", r: sim.par, c: "ref", v: `${a}–${b}` }] }); if (ok) msg(`Tabelul 7.4 (${PAR[sim.par][0]}): porțiunea de referință ${a}…${b} s. Completați μ, σ, numărul de puncte cu |z| > 3, momentul și explicația.`);
}
function inregDiag(e) { const v = $("#sel-diag").value; if (!v) return Cadru.mesajTemporar("Alegeți defectul.", "atentie"); const ok = Cadru.inregistreaza(e, { log: { m: "diag", v }, celule: [{ t: "t75", r: "d", c: "cauza", v }] }); if (ok) msg(`Tabelul 7.5: ${v}.`); }

/* ------------------------------------------------------------------ calculele */
function calculeazaDA7(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }, P()), F = Number.isFinite, cel = { t72: {}, t73: {}, t74: {} }, rele = { t72: {}, t73: {} };
  const g = r => num(t.t72[r].v), du = (g("umax") - g("umin")) * 1000;
  cel.t72.soc = { u: "%" }; cel.t72.energN = { u: "kWh" }; cel.t72.energU = { u: "kWh", obs: F(o.soh) ? `SOH = ${fx(o.soh, 1)} %` : "" }; cel.t72.utot = { u: "V" }; cel.t72.umin = { u: "V", obs: F(du) ? `ΔU = ${fx(du, 0)} mV ${du > 40 ? "– dispersie mare" : "– normal"}` : "" };
  cel.t72.jmin = { u: "–" }; cel.t72.umax = { u: "V" }; cel.t72.tmin = { u: "°C" }; cel.t72.tmax = { u: "°C", obs: F(g("tmax")) && F(g("tmin")) ? `ΔT = ${fx(g("tmax") - g("tmin"), 1)} °C ${g("tmax") - g("tmin") > 8 ? "– răcire neuniformă" : ""}` : "" };
  cel.t72.riso = { u: "MΩ", obs: F(g("riso")) && F(o.risoMin) ? (g("riso") * 1000 < o.risoMin ? "sub minimul cerut" : "peste minim") : "" }; cel.t72.u12 = { u: "V", obs: F(g("u12")) ? (g("u12") < 11.8 ? "baterie de 12 V descărcată" : "corespunzătoare") : "" }; cel.t72.tip = { u: "V" }; cel.t72.coduri = { u: "–" };
  rele.t72.umin = { obs: du > 40 }; rele.t72.riso = { obs: F(g("riso")) && g("riso") * 1000 < o.risoMin }; rele.t72.u12 = { obs: g("u12") < 11.8 }; rele.t72.tmax = { obs: g("tmax") - g("tmin") > 8 };
  const rM = num(t.t73.e.riso);
  cel.t73.e = { soh: F(o.soh) ? fx(o.soh, 1) : "", req: F(o.req) ? String(o.req) : "", risomin: F(o.risoMin) ? fx(o.risoMin, 0) + " kΩ" : "",
    concl: F(o.soh) && F(o.req) ? `${o.soh >= o.req ? "SOH conform Euro 7" : "SOH sub cerința Euro 7"}; ${F(rM) && F(o.risoMin) ? (rM * 1000 >= o.risoMin ? "izolație conformă" : "izolație sub minim – vehiculul nu poate fi pus în funcțiune") : ""}` : "" };
  rele.t73.e = { concl: (F(o.soh) && F(o.req) && o.soh < o.req) || (F(rM) && rM * 1000 < o.risoMin) };
  const rez = [["SOH = E<sub>util</sub>/E<sub>nom</sub> (7.3)", F(o.soh) ? `<span style="color:var(--accent)">${fx(o.soh, 1)} %</span> (cerința Euro 7: ${F(o.req) ? o.req + " %" : "—"})` : "—"], ["ΔU = U<sub>max</sub> − U<sub>min</sub> (7.4)", F(du) ? `${fx(du, 0)} mV` : "—"],
    ["R<sub>iso,min</sub> = 100 Ω/V · U<sub>n</sub> (7.1)", F(o.risoMin) ? `${fx(o.risoMin, 0)} kΩ` : "—"], ["σ STFT pe porțiunea declarată (7.7)", F(o.stft) ? fx(o.stft, 3) + " %" : "—"]];
  const verdicte = [];
  if (F(o.soh) && F(o.req) && o.soh < o.req) verdicte.push({ tip: "atentie", text: `SOH = ${fx(o.soh, 1)} % este sub cerința Euro 7 de ${o.req} % pentru vechimea și rulajul vehiculului – baterie degradată peste normă (garanție).` });
  if (F(du) && du > 40) verdicte.push({ tip: "atentie", text: `ΔU = ${fx(du, 0)} mV în repaus: un grup de celule se abate de la medie – celulă slabă sau echilibrare defectă.` });
  const d = date(), x = d.stft, tk = x.map((v, i) => i);
  return { celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Fișierul propriu de date: STFT la ralanti (ca în Fig. 7.4)",
    grafic: { xmin: 0, xmax: 600, ymin: -12, ymax: 18, xlab: "t [s]", ylab: "STFT [%]", serii: [{ tip: "linie", pts: tk.map(i => [i, x[i]]), culoare: 0, gros: 1.2 }].concat((() => { const r = t.t74.stft, mu = num(r.mu), sg = num(r.sig); return F(mu) && F(sg) ? [{ tip: "linie", pts: [[0, mu + 3 * sg], [600, mu + 3 * sg]], culoare: 2, punctat: true }, { tip: "linie", pts: [[0, mu - 3 * sg], [600, mu - 3 * sg]], culoare: 2, punctat: true }] : []; })()) },
    legenda: [["STFT", "var(--serie-0)"], ["μ ± 3σ (Tabelul 7.4)", "var(--serie-2)"]], principal: { eticheta: "SOH", valoare: F(o.soh) ? +o.soh.toFixed(1) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Tensiunile de peste 60 V c.c. sau 30 V c.a. sunt înaltă tensiune (HV); studenții nu ating componentele și cablurile portocalii, nu desfac conectori HV și nu intră în zona delimitată în timpul demonstrației.</li>
<li>Deconectarea, verificarea lipsei tensiunii și măsurarea izolației se fac numai de persoana instruită și autorizată pentru HV, cu echipament de protecție (mănuși electroizolante verificate, ecran facial) și aparatură CAT III 1000 V.</li>
<li>Vehiculul electric „oprit” poate porni silențios: se verifică poziția P, frâna de parcare și cheia ținută la distanță.</li>
<li>În caz de incident HV nu se atinge victima înainte de separarea sursei; se anunță imediat cadrul didactic și se apelează 112.</li>
<li>La partea de analiză a datelor se respectă regulile de lucru la calculator (ergonomie, fără băuturi lângă echipamente).</li></ul></div>
<h2>7.1. Scopul lucrării</h2>
<p>Cunoașterea arhitecturii de înaltă tensiune a vehiculelor electrice și hibride și a regulilor de siguranță; citirea cu testerul a datelor sistemului de management al bateriei (SOC, SOH, tensiunile și temperaturile celulelor, rezistența de izolație) și evaluarea stării bateriei în raport cu cerințele Euro 7; aplicarea unei metode de diagnoză pe bază de date – detectarea anomaliilor cu scorul z într-un fișier de date OBD.</p>
<h2>7.2. Noțiuni teoretice</h2>
<p>Un vehicul electric conține bateria de tracțiune (litiu-ion, 400 V sau 800 V) cu sistemul de management al bateriei (BMS) și contactoarele, invertorul și motorul electric, convertorul DC/DC care încarcă bateria de 12 V, încărcătorul de bord (OBC), compresorul de climatizare și încălzitorul HV (Fig. 7.1). Protecțiile sunt: bucla de interblocare (HVIL), care deschide contactoarele dacă un conector HV este desfăcut; monitorizarea izolației față de caroserie; conectorul de service, care separă bateria. După deconectare, condensatoarele invertorului se descarcă în câteva minute. Hibridele ușoare de 48 V sunt sub pragul HV, dar pot da curenți foarte mari.</p>
<figure><img src="img/fig7_1.jpg" alt="Fig. 7.1" loading="lazy"><figcaption>Fig. 7.1. Arhitectura de înaltă tensiune a unui vehicul electric</figcaption></figure>
<p>Rezistența de izolație minimă cerută de Regulamentul ONU nr. 100 este proporțională cu tensiunea nominală: 100 Ω/V pentru circuitele de curent continuu și 500 Ω/V pentru cele de curent alternativ (sau conectate galvanic cu acestea):</p>
<div class="ec"><span>R<sub>iso,min</sub> = k<sub>iso</sub> · U<sub>n</sub></span><span class="nr">(7.1)</span></div>
<div class="ec"><span>k<sub>iso</sub> = 100 Ω/V (c.c.) sau 500 Ω/V (c.a.)</span><span class="nr">(7.2)</span></div>
<p>BMS măsoară tensiunea fiecărei celule sau grup de celule, temperaturile, curentul și izolația și calculează starea de încărcare (SOC), starea de sănătate (SOH) și limitele de putere. SOH exprimă capacitatea (sau energia utilizabilă) actuală raportată la cea nominală. Indicatori practici: dispersia tensiunilor celulelor la același SOC (Fig. 7.2) – o celulă care se abate constant de medie indică o celulă slabă sau un defect de echilibrare; dispersia temperaturilor – probleme de răcire.</p>
<div class="ec"><span>SOH = C<sub>act</sub> / C<sub>nom</sub> · 100 &nbsp; [%]</span><span class="nr">(7.3)</span></div>
<div class="ec"><span>ΔU = U<sub>max</sub> − U<sub>min</sub></span><span class="nr">(7.4)</span></div>
<div class="ec"><span>δU<sub>j</sub> = U<sub>j</sub> − U<sub>med</sub></span><span class="nr">(7.5)</span></div>
<figure><img src="img/fig7_2.jpg" alt="Fig. 7.2" loading="lazy"><figcaption>Fig. 7.2. Tensiunile celor 96 de grupuri de celule ale unei baterii în repaus (exemplu cu un grup slab)</figcaption></figure>
<p>Euro 7 (Regulamentul (UE) 2024/1257) impune pentru autoturisme o durabilitate minimă a bateriei de 80 % din energia utilizabilă până la 5 ani sau 100 000 km și de 72 % până la 8 ani sau 160 000 km (la vehiculele utilitare ușoare 75 % și 67 %), iar vehiculul trebuie să afișeze această stare (Fig. 7.3). Bateria de 12 V rămâne o cauză frecventă de defecte și la vehiculele electrice: fără ea nu se închid contactoarele HV.</p>
<figure><img src="img/fig7_3.jpg" alt="Fig. 7.3" loading="lazy"><figcaption>Fig. 7.3. Cerințele Euro 7 de durabilitate a bateriei (autoturisme) și trei vehicule evaluate</figcaption></figure>
<p><b>Diagnoza pe bază de date.</b> Metodele clasice compară un semnal cu un prag fix sau cu valoarea dată de un model (reziduul). Metodele bazate pe date învață comportamentul normal din înregistrări și semnalează abaterile; rețelele neuronale pot stabili și tipul defectului, dar cer multe date de antrenare (Li, Frey și Gauterin, 2023). În service, forma cea mai accesibilă este detectarea anomaliilor în datele înregistrate cu testerul. Metoda scorului z: pe o porțiune „sănătoasă” a înregistrării, cu N valori, se calculează media și abaterea standard, apoi pentru fiecare valoare scorul z; valorile cu |z| &gt; 3 se marchează ca anomalii (Fig. 7.4).</p>
<div class="ec"><span>μ = (1/N) Σ x<sub>k</sub></span><span class="nr">(7.6)</span></div>
<div class="ec"><span>σ = √( Σ (x<sub>k</sub> − μ)² / (N − 1) )</span><span class="nr">(7.7)</span></div>
<div class="ec"><span>z<sub>k</sub> = (x<sub>k</sub> − μ) / σ</span><span class="nr">(7.8)</span></div>
<figure><img src="img/fig7_4.jpg" alt="Fig. 7.4" loading="lazy"><figcaption>Fig. 7.4. Detectarea anomaliilor în corecția de amestec STFT la ralanti (fișierul de date al lucrării)</figcaption></figure>
<p>Metoda se aplică pe regimuri comparabile (de exemplu ralanti cald); altfel variațiile normale de sarcină apar drept anomalii, ca accelerarea din Fig. 7.4. Același semnal STFT poate fi urmărit în timp real pe osciloscop în modul roll, cu pragurile ±3σ afișate ca linii de referință (Fig. 7.5).</p>
<figure><img src="img/fig7_5.jpg" alt="Fig. 7.5" loading="lazy"><figcaption>Fig. 7.5. Corecția STFT la ralanti afișată pe osciloscop în modul roll, cu pragurile |z| = 3 (60 s/div, 5 %/div)</figcaption></figure>
<h2>7.4. Modul de lucru (în simulator)</h2>
<ol><li>Instruirea HV, zona de lucru, EPI, P și frâna de parcare.</li><li>Scanarea tuturor modulelor, încercarea READY, codurile HV.</li><li>Datele BMS, tensiunile celulelor, izolația, 12 V, informațiile vehiculului.</li><li>Deconectarea, verificarea lipsei tensiunii, rezistența de izolație.</li><li>Diagnoza pe date: fișierul CSV, μ, σ, z, anomaliile.</li><li>Evaluarea bateriei și diagnosticul.</li></ol>
<h2>7.7. Interpretarea rezultatelor</h2>
<ul><li>SOH sub cerința Euro 7 pentru vechimea și rulajul vehiculului → baterie degradată peste normă (poate intra sub garanția constructorului).</li>
<li>O dispersie mare și persistentă a tensiunilor celulelor în repaus → celulă sau modul slab, echilibrare defectă; o dispersie mare a temperaturilor → problemă de răcire.</li>
<li>Rezistență de izolație în scădere → umiditate sau deteriorarea unei componente HV; sub valoarea minimă vehiculul blochează pornirea.</li>
<li>O anomalie statistică nu este automat un defect: se verifică dacă nu corespunde unui regim tranzitoriu (accelerare, pornire la rece) sau unei erori de achiziție.</li></ul>
<h2>7.8. Relevanță practică</h2>
<p>Tehnicienii care pot diagnostica în siguranță vehicule electrice și hibride și pot interpreta datele sunt în prezent cei mai căutați; rapoartele din industrie arată deficite de personal calificat pentru EV și ADAS în Europa. Diagnoza pe bază de date stă la baza sistemelor de monitorizare de la distanță a flotelor și a întreținerii predictive.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Baterie de 400 V cu energia utilizabilă nominală de 50 kWh, din care BMS raportează 41,5 kWh, vehicul de 6 ani cu 90 000 km; izolația raportată 2,5 MΩ; tensiunile celulelor 3,641…3,726 V, cu media 3,711 V:</p>
<div class="ec"><span>SOH = 41,5 / 50 · 100 = 83 % ≥ 72 %</span><span class="nr">(7.9)</span></div>
<div class="ec"><span>R<sub>iso,min</sub> = 100 · 400 = 40 kΩ &lt; 2,5 MΩ</span><span class="nr">(7.10)</span></div>
<div class="ec"><span>ΔU = 3,726 − 3,641 = 0,085 V = 85 mV</span><span class="nr">(7.11)</span></div>
<div class="ec"><span>δU<sub>58</sub> = 3,641 − 3,711 = −0,070 V</span><span class="nr">(7.12)</span></div>
<p>Pentru fișierul de date al îndrumarului, pe porțiunea de referință 20…180 s rezultă pentru STFT μ = 0,07 % și σ = 1,55 %. În intervalul 380…440 s STFT ≈ 11 %:</p>
<div class="ec"><span>z = (11 − 0,07) / 1,55 ≈ 7,1 ⇒ anomalie (|z| &gt; 3)</span><span class="nr">(7.13)</span></div>
<p>Din cele 64 de puncte cu |z| &gt; 3, 60 corespund aerului fals provocat, iar 4 accelerării de la t ≈ 200 s, care este un regim tranzitoriu normal.</p>
<div class="problema"><h3>Problema 1</h3><p>Calculați rezistența de izolație minimă pentru o baterie de 800 V (circuit de curent continuu).</p><details class="sol"><summary>Rezolvare</summary><p>R<sub>iso,min</sub> = 100 Ω/V · 800 V = 80 kΩ.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Un vehicul de 7 ani cu 120 000 km are SOH = 69 %. Este conform Euro 7?</p><details class="sol"><summary>Rezolvare</summary><p>Între 5 și 8 ani / până la 160 000 km cerința este 72 %; 69 % &lt; 72 % – neconform (baterie degradată peste normă).</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>În Excel: cum calculați μ, σ și z pentru STFT pe porțiunea 20…180 s (coloana B, rândurile 22…182)?</p><details class="sol"><summary>Rezolvare</summary><p>μ = AVERAGE(B22:B182); σ = STDEV.S(B22:B182); z în C2: =(B2−$μ)/$σ, copiat pe toată coloana; anomaliile: =COUNTIF(C:C;"&gt;3")+COUNTIF(C:C;"&lt;−3").</p></details></div>`;
}
const INTREBARI = [
  ["Ce tensiuni sunt considerate înaltă tensiune la autovehicule și cum se recunosc cablurile HV?", "Peste 60 V c.c. sau 30 V c.a. (clasa de tensiune B); cablurile și conectorii HV sunt portocalii, iar componentele poartă eticheta de avertizare cu fulger."],
  ["Care este rolul buclei HVIL și al conectorului de service?", "HVIL este un circuit de semnal care trece prin toți conectorii HV: dacă unul este desfăcut, bucla se deschide și BMS deschide contactoarele. Conectorul de service separă bateria în două jumătăți, astfel încât să nu existe tensiune HV la ieșirea ei."],
  ["Ce diferență este între SOC și SOH?", "SOC – starea de încărcare (cât din capacitatea actuală este disponibilă acum); SOH – starea de sănătate (capacitatea sau energia utilizabilă actuală raportată la cea nominală, scade prin îmbătrânire)."],
  ["Calculați rezistența de izolație minimă pentru o baterie de 800 V (circuit de curent continuu).", "R<sub>iso,min</sub> = 100 Ω/V · 800 V = 80 kΩ."],
  ["Ce cerințe de durabilitate a bateriei impune Euro 7 autoturismelor? Este conform un vehicul de 7 ani cu SOH = 69 %?", "80 % până la 5 ani / 100 000 km și 72 % până la 8 ani / 160 000 km; 69 % &lt; 72 % – neconform."],
  ["De ce poate un vehicul electric să nu pornească din cauza bateriei de 12 V?", "Bateria de 12 V alimentează BMS-ul, calculatoarele și bobinele contactoarelor HV; descărcată, contactoarele nu se închid, deci DC/DC nu pornește și sistemul nu ajunge în READY."],
  ["Explicați metoda scorului z și limitele ei.", "Pe o porțiune sănătoasă se calculează μ și σ; z = (x − μ)/σ; valorile cu |z| &gt; 3 sunt anomalii. Limite: presupune o distribuție aproximativ normală și un regim comparabil; regimurile tranzitorii și erorile de achiziție apar ca anomalii fără a fi defecte; nu indică tipul defectului."]
];
const TEST = [
  { q: "Înaltă tensiune la autovehicule înseamnă:", o: ["peste 12 V", "peste 60 V c.c. sau 30 V c.a.", "peste 400 V", "peste 1000 V"], c: 1, e: "Clasa de tensiune B." },
  { q: "R<sub>iso,min</sub> pentru o baterie de 400 V (c.c.) este:", o: ["4 kΩ", "40 kΩ", "400 kΩ", "4 MΩ"], c: 1, e: "100 Ω/V · 400 V." },
  { q: "SOH = 41,5/50 este:", o: ["41,5 %", "83 %", "72 %", "120 %"], c: 1, e: "Exemplul rezolvat al lucrării." },
  { q: "Un conector HV desfăcut este detectat prin:", o: ["monitorul de izolație", "bucla HVIL", "senzorul de curent", "DC/DC"], c: 1, e: "Interblocarea deschide contactoarele." },
  { q: "Vehiculul nu intră în READY, contactoarele „clicăie”. Cauza cea mai probabilă:", o: ["celulă slabă", "bateria de 12 V descărcată", "SOH mic", "aer fals"], c: 1, e: "Bobinele contactoarelor nu au tensiune suficientă." },
  { q: "z = (11 − 0,07)/1,55 ≈ 7,1 înseamnă:", o: ["valoare normală", "anomalie (|z| > 3)", "eroare de calcul", "σ prea mare"], c: 1, e: "Aerul fals provocat." }
];
const SV = { s3: null };
function porneste3D() {
  const el = $("#st3d"); if (!el) return;
  import(BAZA_COMUN + "aparate3d.js?v=10").then(m => { SV.s3 = m.creeazaStandEV(el, { laClic: laClic3d }); vedere3d(PASI[pasActiv].vedere); })
    .catch(e => { el.innerHTML = `<p class="nota">Vehiculul 3D nu a putut fi încărcat (${esc(e.message)}).</p>`; });
}
function laClic3d(k) {
  const b = { service: "#b-service", start: ".b-ready", obd: ".b-vci", manusi: "#b-man", cheie: "#b-cheie" }[k];
  if (b && $(`#pasi .pas.activ ${b}`)) return $(`#pasi .pas.activ ${b}`).click();
  if (k === "start") return incearcaReady(); if (k === "obd") { sim.vci = !sim.vci; return deseneaza(); } if (k === "manusi") { sim.tManusi = 0; return; }
  const et = { baterie: `Bateria de tracțiune ${VEH().Un} V, ${VEH().N} grupuri de celule în serie, ${fx(VEH().E, 1)} kWh nominal.`, bms: "BMS-ul – citiți datele cu X431 → BMS.", bdu: "Cutia de joncțiune: contactoarele se închid numai la READY.", conCompresor: P().defect.tip === "hvil" ? "Conectorul HV al compresorului nu este împins până la capăt – bucla HVIL este deschisă!" : "Conectorul HV al compresorului: fixat, pârghia blocată.",
    b12: `Bateria de 12 V: ${fx(MD.u12(P(), sim.ready), 2)} V.`, megohmmetru: "Megohmmetrul – pasul 4.", detector: "Detectorul de tensiune – pasul 4.", ecranF: "Ecranul facial – bifați „Ecran facial purtat” la pasul 1.", modul: "Modul de celule: comutați „Componente transparente” pentru a vedea celulele." }[k];
  if (et) Cadru.mesajTemporar(et, "");
}
const CSS = `<style>
.da7-scena #st3d .m3d { height:clamp(360px, 54vh, 600px); } .da7-scena { position:relative; }
.da7-afis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.da7-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .da7-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .da7-afis b { font-size:1.02rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; } .instr svg { width:100%; height:auto; display:block; color:var(--text); }
#cv-date { width:100%; height:300px; display:block; border-radius:8px; border:1px solid var(--linie); }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); } .pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; } .pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; } .pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; } .pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; } .pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; align-items:center; } .pas-ctl button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); } .pas-ctl .camp { margin:.35rem 0; } .pas-ctl input[type=number] { width:6rem; }
.sim-grila:fullscreen .da7-scena, .sim-grila.ecran-plin .da7-scena { display:block; }
@media (max-width:900px){ .da7-afis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>`;

Cadru.porneste({
  disc: "DA", nr: 7, cod: "da-l7",
  titlu: "Vehicule electrice și hibride; diagnoza pe bază de date",
  scurt: "Vehicule electrice; diagnoza pe date",
  subtitlu: "Laborator virtual – vehiculul electric demonstrativ: siguranța HV, datele BMS, SOH și cerințele Euro 7, deconectarea și izolația; detectarea anomaliilor cu scorul z în fișierul propriu de date OBD",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261027); },
  date: [{ k: "kdc", et: "k<sub>iso</sub> c.c. [Ω/V]", v: 100, fix: true }, { k: "kac", et: "k<sub>iso</sub> c.a. [Ω/V]", v: 500, fix: true }, { k: "zl", et: "Prag |z|", v: 3, fix: true }],
  tabele: [
    { id: "t71", titlu: "Tabelul 7.1. Lista de verificare a siguranței HV (demonstrație)", antetRand: "Verificare", randuri: [{ k: "zona", et: "Zona de lucru delimitată și semnalizată" }, { k: "epi", et: "Echipament de protecție verificat (mănuși – test de etanșeitate)" }, { k: "p", et: "Vehicul în P, frână de parcare, cheie la distanță" }, { k: "service", et: "Conectorul de service scos și asigurat" }, { k: "asteptare", et: "Timp de așteptare pentru descărcare respectat" }, { k: "lipsa", et: "Lipsa tensiunii verificată (aparat verificat înainte și după)" }],
      coloane: [{ k: "da", t: "Da / Nu", intrare: true, tip: "select", optiuni: ["Da", "Nu"] }, { k: "obs", t: "Observații", intrare: true, text: true }] },
    { id: "t72", titlu: "Tabelul 7.2. Datele BMS", antetRand: "Parametru", randuri: [{ k: "tip", et: "Tip vehicul / tensiune nominală" }, { k: "soc", et: "SOC" }, { k: "energN", et: "Energie nominală" }, { k: "energU", et: "Energie utilizabilă (BMS)" }, { k: "utot", et: "Tensiune totală baterie" }, { k: "umin", et: "U celulă min." }, { k: "jmin", et: "Grupul cu U min. (nr.)" }, { k: "umax", et: "U celulă max." }, { k: "tmin", et: "T min. baterie" }, { k: "tmax", et: "T max. baterie" }, { k: "riso", et: "Rezistență de izolație (BMS)" }, { k: "u12", et: "Tensiune baterie 12 V" }, { k: "coduri", et: "Coduri de defect HV" }],
      coloane: [{ k: "v", t: "Valoare", intrare: true, text: true }, { k: "u", t: "Unitate" }, { k: "obs", t: "Observații" }] },
    { id: "t73", titlu: "Tabelul 7.3. Evaluarea bateriei", antetRand: "", nota: "Vechime / rulaj: „ani / km”. R<sub>iso</sub> măsurat cu megohmmetrul [MΩ]. Cerința Euro 7: 80 % până la 5 ani / 100 000 km, 72 % până la 8 ani / 160 000 km.", randuri: [{ k: "e", et: "Vehiculul" }],
      coloane: [{ k: "vech", t: "Vechime / rulaj", intrare: true, text: true }, { k: "soh", t: "SOH măsurat [%]" }, { k: "req", t: "Cerință Euro 7 [%]" }, { k: "riso", t: "R<sub>iso</sub> măsurat [MΩ]", intrare: true }, { k: "risomin", t: "R<sub>iso,min</sub>" }, { k: "concl", t: "Concluzie" }] },
    { id: "t74", titlu: "Tabelul 7.4. Detectarea anomaliilor în datele OBD", antetRand: "Parametru", nota: "Fișierul propriu „Diagnoza_L7_date_OBD_ralanti.csv”. μ și σ (7.6–7.7) pe porțiunea de referință; numărul de puncte cu |z| &gt; 3 din tot fișierul; momentul / regimul anomaliilor și explicația.",
      randuri: [{ k: "stft", et: "STFT [%]" }, { k: "map", et: "MAP [kPa]" }, { k: "ubat", et: "U baterie [V]" }],
      coloane: [{ k: "ref", t: "Porțiunea de referință [s]", intrare: true, text: true }, { k: "mu", t: "μ", intrare: true }, { k: "sig", t: "σ", intrare: true }, { k: "n", t: "Nr. puncte cu |z| &gt; 3", intrare: true }, { k: "moment", t: "Momentul / regimul", intrare: true, text: true }, { k: "expl", t: "Explicație", intrare: true, tip: "select", optiuni: MD.EXPL }] },
    { id: "t75", titlu: "Tabelul 7.5. Diagnosticul defectului HV ascuns", antetRand: "", randuri: [{ k: "d", et: "Defectul" }], coloane: [{ k: "cauza", t: "Defectul identificat", intrare: true, tip: "select", optiuni: MD.optiuniDiag(), manualEval: true }] }
  ],
  inaltimeGrafic: 260,
  calculeaza: calculeazaDA7,
  intrebari() {
    return [
      { id: "q1", u: "%", text: "SOH al bateriei vehiculului vostru (relația 7.3, din energiile din Tabelul 7.2):", textSimplu: "SOH" },
      { id: "q2", u: "mV", text: "Dispersia tensiunilor grupurilor de celule ΔU (relația 7.4):", textSimplu: "ΔU" },
      { id: "q3", u: "kΩ", text: "Rezistența de izolație minimă pentru bateria vehiculului vostru (relația 7.1, circuit de c.c.):", textSimplu: "R iso minim" },
      { id: "q4", u: "%", text: "Abaterea standard σ a STFT din fișierul vostru pe porțiunea de referință 20…180 s (relația 7.7):", textSimplu: "σ STFT 20…180 s" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    ["zona", "epi", "p", "service", "asteptare", "lipsa"].forEach(k => { if (t.t71[k].da === "") l.push(`Tabelul 7.1: ${k}`); });
    ["coduri", "energU", "umin", "u12"].forEach(k => { if (t.t72[k].v === "") l.push(`Tabelul 7.2: ${k}`); });
    if (t.t73.e.riso === "") l.push("Tabelul 7.3: R iso măsurat");
    ["stft", "map", "ubat"].forEach(k => { if (t.t74[k].sig === "" || t.t74[k].n === "") l.push(`Tabelul 7.4: ${k}`); });
    if (t.t75.d.cauza === "") l.push("Tabelul 7.5: diagnosticul");
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t72.tip, { v: "exemplu / 400 V" }); t.t72.energN.v = "50"; t.t72.energU.v = "41.5"; t.t72.umin.v = "3.641"; t.t72.umax.v = "3.726"; t.t73.e.vech = "6 / 90000"; t.t73.e.riso = "2.5"; },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Autoturismele electrificate: mild hybrid 48 V, full hybrid, plug-in hybrid, electric (BEV)",
    intro: `<p>Comutați între cele patru arhitecturi și urmăriți componentele de înaltă (sau medie) tensiune: <b>mild hybrid 48 V</b> – alternatorul-demaror BSG pe cureaua motorului și bateria Li-ion 48 V cu convertorul DC/DC; <b>full hybrid</b> – transmisia e-CVT cu cele două mașini electrice MG1 și MG2, invertorul și bateria HV; <b>plug-in hybrid</b> – mașina electrică P2 în cutia de viteze, bateria HV de capacitate mare și încărcătorul de bord cu priza de încărcare; <b>electric (BEV)</b> – fără motor termic, rezervor și evacuare: unitatea de tracțiune pe puntea față (motorul electric, reductorul cu o treaptă, invertorul), bateria de 400 V în podea cu cutia de joncțiune, încărcătorul de bord cu convertorul DC/DC și priza CCS2 pentru încărcarea în c.a. și c.c. rapid. Regimurile (pornire, accelerare, croazieră, frânare recuperativă) arată fluxurile de energie; „Carcase transparente” lasă să se vadă interiorul.</p>`,
    dupa: `<p class="nota">Cablurile portocalii sunt circuitele HV: înainte de orice intervenție – deconectarea de serviciu, verificarea lipsei tensiunii și a izolației (fila Simulator).</p>`,
    optiuni: () => ({ sistem: "hibrid", tip: "mh", tipuri: ["mh", "fh", "phev", "bev"] })
  },
  referat: {
    scop: "Cunoașterea arhitecturii HV a vehiculelor electrice și a regulilor de siguranță, citirea datelor BMS și evaluarea bateriei față de Euro 7, verificarea lipsei tensiunii și a izolației, detectarea anomaliilor cu scorul z într-un fișier de date OBD.",
    relatii: "R<sub>iso,min</sub> = k<sub>iso</sub>·U<sub>n</sub>; &nbsp; SOH = C<sub>act</sub>/C<sub>nom</sub>; &nbsp; ΔU = U<sub>max</sub> − U<sub>min</sub>; &nbsp; μ = Σx/N; &nbsp; σ = √(Σ(x − μ)²/(N − 1)); &nbsp; z = (x − μ)/σ.",
    varianta: () => `Vehiculul propriu: ${VEH().n} (${VEH().Un} V), ${P().ani} ani / ${P().km.toLocaleString("ro-RO")} km; fișierul propriu de date OBD; un defect HV ascuns.`,
    indicatii: "Comentați siguranța HV (ordinea pașilor), datele BMS (SOH față de Euro 7, ΔU, temperaturile, izolația, 12 V, READY), izolația măsurată față de minim; pentru fiecare anomalie din fișier explicați cauza fizică (regim tranzitoriu, defect provocat, eroare de achiziție); justificați diagnosticul…"
  },
  subsol: "Modelul: vehiculul (400 / 800 V, grupuri de celule, energia nominală), vechimea și rulajul, SOH, tensiunile grupurilor de celule, temperaturile, izolația, bateria de 12 V și condiția READY, descărcarea condensatoarelor invertorului (τ ≈ 40 s), fișierul de date OBD la ralanti cu accelerarea, aerul fals și o eroare de achiziție. Fiecare student are vehiculul, fișierul și un defect HV ascuns.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena da7-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="st3d"><p class="nota">Se încarcă vehiculul electric 3D…</p></div>
      <div class="rand-butoane"><label class="bifa"><input type="checkbox" class="ck-tr"> Componente transparente (vezi interiorul carcaselor)</label></div>
      <div class="da7-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>U condensatoare</span><b id="af-hv">—</b></div><div><span>Conector service</span><b id="af-sv">—</b></div><div><span>Rețea 12 V</span><b id="af-12">—</b></div><div><span>Zona HV</span><b id="af-z">—</b></div></div>
      <p class="nota">Trageți = rotire · rotița = zoom · clic pe conectorul de service (portocaliu), butonul START, priza OBD, mănuși, cheie; tooltip pe fiecare componentă.</p>
      <div class="instr" data-panou="x431"><h3>Testerul Launch X431 (funcții EV)</h3><svg id="svg-x431" viewBox="0 0 820 350" role="img" aria-label="Testerul Launch X431"></svg></div>
      <div class="instr" data-panou="ap" hidden><h3>Detectorul de tensiune și megohmmetrul</h3><svg id="svg-ap" viewBox="0 0 820 270" role="img" aria-label="Aparatele de măsură HV"></svg></div>
      <div class="instr" data-panou="date" hidden><h3>Fișierul de date OBD – ralanti (600 s, 1 Hz)</h3><canvas id="cv-date" aria-label="Graficul datelor OBD"></canvas></div>
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
      $$(".ck-tr").forEach(c => c.addEventListener("change", e => { sim.transparent = e.target.checked; actualizeazaPasi(); }));
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $("#def-demo").textContent = MD.eticheta(P().defect);
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval() { const d = $("#def-demo"); if (d) d.textContent = ""; DATE = null; },
    reset() { Object.assign(sim, { contact: false, ready: false, vci: false, service: true, lacat: false, tOff: null, cheieDep: false, aparat: null }); sim.det = { v1: false, mas: false, v2: false, U: null }; sim.meg = { V: 500, R: null }; },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * (sim.rapid ? 10 : 1);
      sim.t += dt;
      if (sim.tManusi >= 0) { sim.tManusi += h; if (sim.tManusi > 3) { sim.tManusi = -1; sim.manusiOk = true; C.mesajTemporar("Mănușile au rămas umflate – fără pierderi de aer: pot fi folosite.", "ok"); } }
      if (SV.s3) SV.s3.seteaza({ contact: sim.contact, ready: sim.ready, vci: sim.vci, cheieDep: sim.cheieDep, zona: sim.zona, service: sim.service, lacat: sim.lacat, manusiTest: sim.tManusi >= 0 ? Math.min(1, sim.tManusi / 1.2) : 0,
        aparat: sim.aparat, afis: sim.aparat === "meg" && sim.meg.R != null ? (sim.meg.R < 1 ? (sim.meg.R * 1000).toFixed(0) : sim.meg.R.toFixed(2)) : sim.aparat === "det" ? String(Math.round(uCond())) : "", afisU: sim.aparat === "meg" && sim.meg.R != null ? (sim.meg.R < 1 ? "kΩ" : "MΩ") : sim.aparat === "det" ? "V" : "",
        hvil: P().defect.tip !== "hvil", Tmin: MD.temperaturi(P()).min, Tmax: MD.temperaturi(P()).max, transparent: sim.transparent, ventilator: sim.ready });
      if (!vizibil) return;
      const now = performance.now();
      if (now - (this._td || 0) > 250) { this._td = now; deseneaza(); }
      if (now - (this._ts || 0) > 300) { this._ts = now; actualizeazaPasi(); C.stare(1, sim.ready ? "READY" : sim.contact ? "contact pus" : "oprit", sim.ready ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { deseneaza(); },
    formule() { return []; }
  }
});
