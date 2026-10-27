/* MAM I – Lucrarea 6. Senzori de turație și poziție: decodarea roții 60−2 prin captură de intrare.
   Simulator: planșa standului în stilul Tinkercad – discul 60 − 2 antrenat de motorul de 12 V cu reductor sub capacul de plexiglas,
   butonul de oprire de urgență, sursa de 12 V, driverul L298N comandat PWM de pe D5, senzorul inductiv pe suportul reglabil (întrefierul
   cu lere), circuitul de formare (LM393 cu histerezis, diode Zener) cu punctele de test, Arduino Mega cu captura pe ICP4 (D49) și OLED,
   osciloscopul cu două canale (declanșare pe front sau pe lățimea impulsului – golul) și tahometrul optic; editorul programului
   (pragul golului, prescalerul), monitorul serial și plotterul turației. Montajul real în 3D este într-o filă separată.
   Parametrii exemplarului (motorul, senzorul, pragul circuitului de formare, rezonatorul) sunt individuali. */
"use strict";
const MD = MODELE["mam1-l6"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, tS: 0, alim: false, estop: false, estopVerif: false, capac: true, g: 2.0, d: 0, tD: -10, n: 0, phi: 0,
  camp: { PRAG: "1.5", P: "8" }, fw: null, pr: null, serial: [], tx: 0,
  osc: { ch: [{ s: "nc" }, { s: "nc" }], tdiv: 0.002, vdiv: 1, trig: "front", ruleaza: true, acq: null, tA: 0 },
  tah: { act: false, t0: 0, val: null, d: -1 }, buf: [], edges: [], ist: [], obs: null, acc: null, accRez: {}, golVazut: false, syncVazut: false
};
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const alimentat = () => sim.alim && !sim.estop;
const stabil = () => sim.n > 50 && sim.tS - sim.tD > 4 * P().tau && Math.abs(sim.n - MD.nSS(P(), sim.d)) / Math.max(1, sim.n) < 0.006;
const TDIV = [0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02];
const VDIV = [0.05, 0.1, 0.2, 0.5, 1, 2, 5];
let SV3 = null;

/* ------------------------------------------------------------------ mecanica și semnalul (pași de 0,25 ms) */
const DT = 0.00025;
function pasMecanic(d) {
  const p = P(), ns = alimentat() ? MD.nSS(p, sim.d) : 0, tau = ns >= sim.n ? p.tau : p.tau * (alimentat() ? 1 : 1.6);
  sim.n += (ns - sim.n) * (1 - Math.exp(-d / tau)); if (sim.n < 0.05 && ns === 0) sim.n = 0;
  const nInst = sim.n * (1 + p.rip * Math.sin(sim.phi * Math.PI / 180));
  const phi0 = sim.phi; sim.phi += nInst * 6 * d; sim.tS += d;
  // fronturile crescătoare ale semnalului format: la 1,5° în fiecare pas de 6° al dinților existenți (0…57)
  const e0 = Math.floor((phi0 - 1.5) / 6), e1 = Math.floor((sim.phi - 1.5) / 6);
  for (let e = e0 + 1; e <= e1; e++) {
    const ang = e * 6 + 1.5, k = ((e % 60) + 60) % 60; if (k >= 58) continue;
    const t = sim.tS - d + (ang - phi0) / Math.max(1e-9, sim.phi - phi0) * d;
    const lipsa = Math.random() < MD.pLipsa(p, sim.n, sim.g) || sim.n < 1;
    const ev = { t, k, lipsa, T: 60 / (Math.max(1, sim.n) * MD.Z) }; sim.edges.push(ev);
    if (!lipsa && sim.run) captura(ev);
  }
  if (sim.edges.length > 3000) sim.edges.splice(0, sim.edges.length - 3000);
  sim.buf.push([sim.tS, sim.phi, sim.n]); if (sim.buf.length > 2400) sim.buf.splice(0, sim.buf.length - 2400);
}

/* ------------------------------------------------------------------ programul (captura de intrare pe ICP4) */
function pornesteProgram() {
  sim.pr = { tPrev: null, Tprev: 0, k: 0, sync: false, err: 0, rg: NaN, rmax: 0, tiN: [], tL: sim.tS, last: null, nGol: 0 };
  sim.d = 0; sim.tD = sim.tS;
  seriala(`roata_60_2 | captură ICP4 (D49), P = ${sim.fw.P} → ${fx(sim.fw.P / 16, 2)} µs/tick | prag gol = ${sim.fw.prag} | comenzi: pNN = PWM NN %, a = accelerare bruscă`);
}
function captura(ev) {
  const pr = sim.pr, p = P(), P_ = sim.fw.P, f = 16e6 * (1 + p.eclk) / P_;
  const cap = Math.floor(ev.t * f) % 65536;
  if (pr.tPrev === null) { pr.tPrev = cap; return; }
  const Ti = (cap - pr.tPrev + 65536) % 65536; pr.tPrev = cap;
  const r = pr.Tprev ? Ti / pr.Tprev : 0;
  if (r > pr.rmax) pr.rmax = r;
  if (pr.Tprev && Ti > sim.fw.prag * pr.Tprev) {
    if (pr.sync && pr.k !== 57) { pr.err++; if (sim.acc) sim.acc.err++; }
    pr.k = 0; pr.sync = true; pr.rg = r; pr.nGol++;
    if (sim.acc && !sim.acc.pend && sim.tS - sim.acc.t0 < 2.5) sim.acc.rmin = Math.min(sim.acc.rmin, pr.rmax);
    pr.rmax = 0;
  } else {
    pr.k++;
    if (sim.acc && sim.acc.pend && pr.k === 56 && pr.sync) { sim.acc.pend = false; sim.acc.t0 = sim.tS; sim.acc.err = 0; pr.rmax = 0; sim.d = 0.7; sim.tD = sim.tS; }
    if (pr.k > 57) { if (pr.sync) { pr.err++; if (sim.acc) sim.acc.err++; } pr.sync = false; if (sim.acc && !sim.acc.pend && sim.tS - sim.acc.t0 < 2.5) sim.acc.rmin = Math.min(sim.acc.rmin, pr.rmax); pr.rmax = 0; pr.k = 0; }
    if (Ti > 0) { pr.tiN.push(Ti * P_ / 16e6); if (pr.tiN.length > 20) pr.tiN.shift(); }
  }
  pr.Tprev = Ti;
}
function pasProgram() {
  const pr = sim.pr; if (!pr) return;
  // dacă nu mai vin impulsuri (motorul oprit), programul afișează turația 0 după 0,2 s
  const ult = sim.edges.length ? sim.edges[sim.edges.length - 1].t : -1;
  if (sim.tS - ult > 0.2) { pr.tiN = []; pr.sync = false; }
  if (sim.tS - pr.tL >= 0.5) {
    pr.tL = sim.tS;
    const ti = pr.tiN.length ? pr.tiN.reduce((a, b) => a + b, 0) / pr.tiN.length : NaN, n = Number.isFinite(ti) ? 60 / (MD.Z * ti) : 0;
    pr.last = { ti: ti * 1000, n, k: pr.k, th: (P().tref + 6 * pr.k) % 360, rg: pr.rg, sync: pr.sync, err: pr.err };
    sim.ist.push({ t: sim.tS, n }); while (sim.ist.length > 120) sim.ist.shift();
    seriala(Number.isFinite(ti) ? `Ti = ${(ti * 1000).toFixed(4)} ms  n = ${n.toFixed(1)} rot/min  k = ${pr.k}  θ = ${pr.last.th}°  Tgol/Ti = ${Number.isFinite(pr.rg) ? pr.rg.toFixed(3) : "—"}  ${pr.sync ? "SYNC" : "fără sincronizare"}  erori = ${pr.err}` : "fără impulsuri pe D49 (motorul oprit?)");
    if (pr.sync) sim.syncVazut = true;
  }
  if (sim.acc && !sim.acc.pend && !sim.acc.gata && sim.tS - sim.acc.t0 >= 2.5) {
    const a = sim.acc; a.gata = true; a.sync = a.err === 0 && pr.sync ? "da" : "nu";
    if (!Number.isFinite(a.rmin)) a.rmin = pr.rmax || 0;
    sim.accRez[sim.fw.prag] = { rmin: Math.round(a.rmin * 1000) / 1000, sync: a.sync, prag: sim.fw.prag };
    seriala(`ACCELERARE: Tgol/Ti minim = ${a.rmin.toFixed(3)} (prag ${sim.fw.prag}) → sincronizare ${a.sync === "da" ? "păstrată" : `PIERDUTĂ (${a.err} erori)`}`);
  }
}
function comanda(txt) {
  if (!sim.run || !sim.pr) return Cadru.mesajTemporar("Porniți simularea: PWM-ul motorului este generat de program (D5).", "atentie");
  const s = String(txt).trim().toLowerCase(); seriala("> " + s);
  if (/^p\d+$/.test(s)) {
    let v = Math.min(70, Math.max(0, +s.slice(1))); if (+s.slice(1) > 70) seriala("PWM limitat la 70 % (≈ 1500 rot/min, NSSM)");
    if (!sim.capac && v > 0) { seriala("refuzat: capacul de protecție nu este montat"); return Cadru.mesajTemporar("NSSM: discul se rotește numai cu capacul de plexiglas montat.", "pericol"); }
    sim.d = v / 100; sim.tD = sim.tS; seriala(`PWM = ${v} %`); if (!alimentat() && v > 0) seriala("atenție: linia de 12 V a motorului nu este alimentată");
  } else if (s === "a") {
    if (sim.d > 0.26 || sim.n < 180 || !stabil()) { seriala("accelerarea se pornește din regim stabil la turație mică (PWM 20…25 %, n ≥ 180 rot/min)"); return Cadru.mesajTemporar("Accelerarea bruscă: porniți din regim stabil la PWM 20…25 % (n ≥ 180 rot/min; sub această turație senzorul inductiv dă un semnal prea slab).", "atentie"); }
    if (!sim.pr.sync) return Cadru.mesajTemporar("Programul nu este sincronizat.", "atentie");
    sim.acc = { pend: true, t0: sim.tS, rmin: Infinity, err: 0, gata: false }; seriala("accelerare bruscă: PWM 70 % aplicat sincron, cu 2 dinți înaintea golului; se urmărește raportul Tgol/Ti 2,5 s");
  } else seriala("comandă necunoscută (pNN sau a)");
  actualizeaza();
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 300) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-120).join("\n"); el.scrollTop = el.scrollHeight; }

/* ------------------------------------------------------------------ osciloscopul */
const PUNCTE = { nc: "neconectat", D49: "D49 (ICP4) – semnalul format", tVR: "TP VR – senzorul inductiv (înainte de formare)", tOUT: "TP OUT – ieșirea comparatorului", D5: "D5 – PWM motor (ENA)" };
function phiLa(t) {
  const b = sim.buf; if (!b.length) return 0; if (t >= b[b.length - 1][0]) return b[b.length - 1][1];
  let lo = 0, hi = b.length - 1; if (t <= b[0][0]) return b[0][1];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m][0] <= t) lo = m; else hi = m; }
  const [t0, p0] = b[lo], [t1, p1] = b[hi]; return p0 + (p1 - p0) * (t - t0) / (t1 - t0 || 1);
}
function semnal(src, t, vp) {
  if (src === "tVR") return MD.vVR(phiLa(t), vp) + gauss() * P().sig * 0.6;
  if (src === "D49" || src === "tOUT") { const E = semnal.ed || []; let lo = 0, hi = E.length - 1, j = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (E[m].t <= t) { j = m; lo = m + 1; } else hi = m - 1; }
    const e = j >= 0 ? E[j] : null; return e && !e.lipsa && t - e.t < e.T / 2 ? 4.96 : 0.02; }
  if (src === "D5") { if (!sim.run || sim.d <= 0) return 0; const T = 1 / 490.2, ph = (t % T) / T; return ph < sim.d ? 4.98 : 0; }
  return 0;
}
function achizitie() {
  const o = sim.osc, W = o.tdiv * 10, ch1 = o.ch[0].s, ch2 = o.ch[1].s, p = P(), vp = MD.vpp(p, sim.n, sim.g);
  const acum = sim.tS, ed = sim.edges.filter(e => !e.lipsa && e.t <= acum - W * 0.9 && e.t >= acum - 0.45);
  let tr = null;
  if (ch1 === "D49" || ch1 === "tOUT") {
    if (o.trig === "gol") { for (let i = ed.length - 1; i > 0; i--) if (ed[i].t - ed[i - 1].t > 1.5 * ed[i].T * 1.05) { tr = ed[i].t; break; } }
    else if (ed.length) tr = ed[ed.length - 1].t;
  } else if (ch1 === "D5" && sim.run && sim.d > 0) { const T = 1 / 490.2; tr = Math.floor((acum - W) / T) * T; }
  else if (ch1 === "tVR" && ed.length) tr = ed[ed.length - 1].t;
  if (tr === null && ch2 === "tVR" && sim.n > 30 && o.trig !== "gol") tr = acum - W * 0.95;   // fără fronturi formate (întrefier mare): osciloscopul rulează liber (AUTO), CH2 se vede
  if (tr === null) { o.acq = { tr: null, pts: [[], []], m: {} }; return; }
  const t0 = tr - (o.trig === "gol" && (ch1 === "D49" || ch1 === "tOUT") ? 5 : 1) * o.tdiv, N = 500, pts = [[], []]; semnal.ed = sim.edges.filter(e => e.t >= t0 - 0.05 && e.t <= t0 + W);
  for (let i = 0; i <= N; i++) { const t = t0 + W * i / N; [ch1, ch2].forEach((s, c) => { if (s !== "nc") pts[c].push([i / N, semnal(s, t, vp)]); }); }
  const m = {};
  // frecvența CH1: prima perioadă completă după declanșare
  if (ch1 === "D49" || ch1 === "tOUT") { const e2 = sim.edges.filter(e => !e.lipsa && e.t >= tr - 1e-7 && e.t <= t0 + W); if (e2.length >= 2) { const T = e2[1].t - e2[0].t; m.f = 1 / T * (1 + 1e-5 * gauss()); m.T = T; } const e3 = sim.edges.filter(e => !e.lipsa && e.t >= t0 && e.t <= t0 + W); if (e3.length >= 2) { let mx = 0; for (let i = 1; i < e3.length; i++) mx = Math.max(mx, e3[i].t - e3[i - 1].t); m.Tmax = mx; } }
  else if (ch1 === "D5" && sim.d > 0) { m.f = 490.2; m.dc = sim.d * 100; }
  if (ch2 === "tVR" && pts[1].length) { let mn = 1e9, mx = -1e9; pts[1].forEach(([, v]) => { mn = Math.min(mn, v); mx = Math.max(mx, v); }); m.vpp = mx - mn; }
  o.acq = { tr, t0, W, pts, m, vp };
}
function vpp2() { const a = sim.osc.acq; return a && a.m && Number.isFinite(a.m.vpp) ? a.m.vpp : NaN; }
function golInFereastra() { const a = sim.osc.acq; return !!(a && a.m && a.m.Tmax && a.m.T && a.m.Tmax > 2 * a.m.T); }
function oscAfis() {
  const g = $("#osc-tr"); if (!g) return;
  const o = sim.osc, a = o.acq, X0 = 46, Y0 = 476, W = 404, H = 248, cul = ["#f2d600", "#1fb6ff"];
  const y = (c, v) => { const sc = c === 0 ? 2 : o.vdiv, off = c === 0 ? 2.2 : -1.6; return Y0 + H / 2 - (v / sc + off) * (H / 8); };
  let s = "";
  if (a && a.tr !== null && o.ruleaza !== "stop") a.pts.forEach((pts, c) => { if (!pts.length) return; s += `<polyline fill="none" stroke="${cul[c]}" stroke-width="1.6" points="${pts.map(([u, v]) => `${(X0 + u * W).toFixed(1)},${Math.max(Y0 + 1, Math.min(Y0 + H - 1, y(c, v))).toFixed(1)}`).join(" ")}"/>`; });
  else s += `<text x="${X0 + W / 2}" y="${Y0 + H / 2}" fill="#9aa" font-size="13" text-anchor="middle">${!sim.run && !sim.n ? "fără semnal" : "așteaptă declanșarea…"}</text>`;
  // marcajele canalelor și declanșarea
  [0, 1].forEach(c => { if (o.ch[c].s !== "nc") s += `<text x="${X0 - 12}" y="${y(c, 0) + 4}" fill="${cul[c]}" font-size="11" font-weight="700">${c + 1}▶</text>`; });
  s += `<text x="${X0 + W * (o.trig === "gol" && ["D49", "tOUT"].includes(o.ch[0].s) ? 0.5 : 0.1) - 3}" y="${Y0 - 4}" fill="#ff9800" font-size="11">▼</text>`;
  g.innerHTML = s;
  const m = a ? a.m : {}, f = v => Number.isFinite(v);
  $("#osc-h").textContent = `${o.ruleaza ? "RUN" : "STOP"}   H ${fmtT(o.tdiv)}/div   CH1 2 V/div   CH2 ${fx(o.vdiv, o.vdiv < 1 ? 2 : 0)} V/div   Trig: ${o.trig === "gol" ? "lățime > 1,5·T (golul)" : "front ↑ CH1"}`;
  $("#osc-m").textContent = `${f(m.f) ? `CH1 Freq = ${m.f >= 1000 ? (m.f / 1000).toFixed(4) + " kHz" : m.f.toFixed(2) + " Hz"}` : "CH1 Freq = ----"}   ${f(m.T) ? `T = ${(m.T * 1000).toFixed(4)} ms` : ""}   ${f(m.vpp) ? `CH2 Vpp = ${m.vpp.toFixed(m.vpp < 1 ? 3 : 2)} V` : ""}${f(m.dc) ? `   DC = ${m.dc.toFixed(1)} %` : ""}`;
}
const fmtT = s => s >= 1e-3 ? `${+(s * 1000).toFixed(3)} ms` : `${+(s * 1e6).toFixed(1)} µs`;

/* ------------------------------------------------------------------ comenzile standului */
function seteazaGap(g) {
  if (sim.n > 0.5 || sim.alim) return Cadru.mesajTemporar("NSSM: întrefierul se reglează numai cu motorul oprit și alimentarea de 12 V deconectată.", "pericol");
  sim.g = g; sim.obs = null; Cadru.mesajTemporar(`Întrefierul reglat cu lera de ${fx(g, 1)} mm.`, ""); actualizeaza();
}
function comutaAlim() {
  if (!sim.alim && !sim.capac) return Cadru.mesajTemporar("NSSM: montați capacul de protecție înainte de a alimenta motorul.", "pericol");
  sim.alim = !sim.alim; if (!sim.alim) sim.tD = sim.tS; actualizeaza();
}
function comutaEstop() {
  sim.estop = !sim.estop;
  if (sim.estop) { if (sim.alim) { sim.estopVerif = true; Cadru.mesajTemporar("Oprirea de urgență a întrerupt linia de 12 V a motorului – verificare reușită. Eliberați butonul (rotire) pentru a continua.", ""); } else Cadru.mesajTemporar("Butonul de urgență apăsat. Pentru verificare: alimentați linia de 12 V, apoi apăsați butonul.", "atentie"); }
  sim.tD = sim.tS; actualizeaza();
}
function comutaCapac() {
  if (sim.capac && sim.n > 0.5) return Cadru.mesajTemporar("NSSM: capacul nu se demontează cât timp discul se rotește.", "pericol");
  if (sim.capac && sim.alim) return Cadru.mesajTemporar("Deconectați întâi alimentarea de 12 V.", "atentie");
  sim.capac = !sim.capac; actualizeaza();
}
function masoaraTah() {
  if (sim.n < 30) return Cadru.mesajTemporar("Tahometrul optic: discul trebuie să se rotească (banda reflectorizantă pe cuplaj).", "atentie");
  sim.tah = { act: true, t0: sim.tS, val: null, d: sim.d }; actualizeaza();
}
function pasTah() {
  const t = sim.tah; if (!t.act) return;
  if (sim.tS - t.t0 >= 1.5) { t.val = MD.nTah(P(), sim.n * (1 + P().rip * 0.3 * gauss())); t.act = false; t.tVal = sim.tS; t.dVal = sim.d; t.stab = stabil(); }
}
function porneteObservare() {
  if (!sim.run || !sim.pr) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  if (!stabil()) return Cadru.mesajTemporar("Așteptați turația constantă.", "atentie");
  sim.obs = { t0: sim.tS, err0: sim.pr.err, g: sim.g, n: sim.n, gata: false }; seriala(`> observare ${MD.TOBS} s (întrefier ${fx(sim.g, 1)} mm, n ≈ ${sim.n.toFixed(0)} rot/min)`); actualizeaza();
}
function pasObservare() {
  const o = sim.obs; if (!o || o.gata || !sim.pr) return;
  if (Math.abs(sim.g - o.g) > 1e-9 || Math.abs(sim.n - o.n) > 30) { sim.obs = null; return; }
  if (sim.tS - o.t0 >= MD.TOBS) { o.gata = true; o.err = sim.pr.err - o.err0; o.sync = o.err === 0 && sim.pr.sync ? "da" : "nu";
    seriala(`OBSERVARE ${MD.TOBS} s: ${o.err} erori de sincronizare → sincronizare ${o.sync === "da" ? "stabilă" : "INSTABILĂ"}`); }
}

/* ------------------------------------------------------------------ planșa în stilul Tinkercad */
const DC = [190, 210], RD = 150;                                 // centrul și raza discului
const TP6 = { tVR: [700, 300], tOUT: [790, 300], D49: [1205, 168], D5: [1093, 52] };
function planseSVG() {
  const W = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
  let s = `<svg id="tk-svg" viewBox="0 -14 1300 814" role="img" aria-label="Planșa: discul 60−2 cu motorul și capacul de protecție, senzorul inductiv, circuitul de formare, L298N, sursa de 12 V, oprirea de urgență, Arduino Mega cu OLED, osciloscopul și tahometrul optic">
<defs><filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter>
 <linearGradient id="gAlu6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7eb"/><stop offset="1" stop-color="#9aa2aa"/></linearGradient>
 <radialGradient id="gDisc" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#5d6268"/><stop offset="1" stop-color="#8b9197"/></radialGradient></defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb"/>`;
  /* ---- motorul cu reductor, cuplajul cu banda reflectorizantă */
  s += `<g data-k="motor" class="tk-comp" filter="url(#umbra)"><rect x="40" y="${DC[1] - 26}" width="70" height="52" rx="6" fill="#3b3f45"/><rect x="110" y="${DC[1] - 20}" width="34" height="40" rx="4" fill="#9aa2aa"/>
    <text x="75" y="${DC[1] + 46}" font-size="10" text-anchor="middle" fill="#444">motor 12 V + reductor</text><rect x="144" y="${DC[1] - 8}" width="22" height="16" fill="url(#gAlu6)"/><rect x="150" y="${DC[1] - 8}" width="7" height="16" fill="#f5f5f5" stroke="#bbb"/></g>`;
  /* ---- discul 60 − 2 (se rotește) */
  let dinti = ""; for (let k = 0; k < 58; k++) { const a = (k * 6) * Math.PI / 180, a2 = (k * 6 + 3) * Math.PI / 180, r0 = RD - 2, r1 = RD + 12;
    dinti += `<path d="M${(r0 * Math.cos(a)).toFixed(1)},${(r0 * Math.sin(a)).toFixed(1)} L${(r1 * Math.cos(a)).toFixed(1)},${(r1 * Math.sin(a)).toFixed(1)} L${(r1 * Math.cos(a2)).toFixed(1)},${(r1 * Math.sin(a2)).toFixed(1)} L${(r0 * Math.cos(a2)).toFixed(1)},${(r0 * Math.sin(a2)).toFixed(1)}z" fill="#7b8187"/>`; }
  s += `<g data-k="disc" class="tk-comp" filter="url(#umbra)"><g id="disc6" transform="translate(${DC[0]} ${DC[1]})"><circle r="${RD}" fill="url(#gDisc)" stroke="#4a4f55" stroke-width="2"/>${dinti}
    <circle r="40" fill="#b4bac0" stroke="#666"/><circle r="9" fill="#333"/>${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${(26 * Math.cos(i * Math.PI / 3)).toFixed(1)}" cy="${(26 * Math.sin(i * Math.PI / 3)).toFixed(1)}" r="4" fill="#333"/>`).join("")}
    <path d="M${(RD - 30) * Math.cos(349 * Math.PI / 180)},${(RD - 30) * Math.sin(349 * Math.PI / 180)} L${(RD - 4) * Math.cos(349 * Math.PI / 180)},${(RD - 4) * Math.sin(349 * Math.PI / 180)}" stroke="#ffeb3b" stroke-width="5"/></g>
    <text x="${DC[0]}" y="${DC[1] + RD + 34}" font-size="11" text-anchor="middle" fill="#333" font-weight="700">disc 60 − 2 dinți (golul = marcajul galben)</text></g>`;
  /* ---- senzorul inductiv pe suportul reglabil, deasupra discului */
  s += `<g data-k="senzor" class="tk-comp" filter="url(#umbra)"><rect x="${DC[0] - 60}" y="10" width="120" height="16" rx="3" fill="url(#gAlu6)" stroke="#7c848c"/><rect x="${DC[0] - 8}" y="26" width="16" height="12" fill="url(#gAlu6)"/>
    <g id="senz6"><rect x="${DC[0] - 13}" y="0" width="26" height="22" rx="4" fill="#202226"/><rect x="${DC[0] - 9}" y="20" width="18" height="10" fill="#c87533"/></g>
    <text x="${DC[0] + 70}" y="22" font-size="10" fill="#333" font-weight="700">senzor inductiv (VR)</text><text id="gap6" x="${DC[0] + 70}" y="36" font-size="10" fill="#c62828" font-weight="700"></text></g>`;
  /* ---- capacul de protecție din plexiglas (transparent) */
  s += `<g data-k="capac" class="tk-comp"><rect id="capac6" x="${DC[0] - RD - 22}" y="${DC[1] - RD - 22}" width="${2 * RD + 44}" height="${2 * RD + 44}" rx="16" fill="#9fd3ff" fill-opacity=".16" stroke="#5aa9e6" stroke-width="2.5" stroke-dasharray="0"/>
    <text id="capac6t" x="${DC[0] + RD + 12}" y="${DC[1] + RD + 14}" font-size="9" text-anchor="end" fill="#2b6ea6" font-weight="700">capac plexiglas 3 mm</text></g>`;
  /* ---- tahometrul optic (de mână) */
  s += `<g data-k="tah" class="tk-comp" filter="url(#umbra)" transform="translate(600 170)"><path d="M40,420 h120 a10,10 0 0 1 10,10 v40 a10,10 0 0 1 -10,10 h-46 v52 a8,8 0 0 1 -8,8 h-22 a8,8 0 0 1 -8,-8 v-52 h-36 a10,10 0 0 1 -10,-10 v-40 a10,10 0 0 1 10,-10z" fill="#f2b705" stroke="#a37a00"/>
    <rect x="52" y="430" width="96" height="30" rx="3" fill="#bfd0b0" stroke="#222"/><text id="tah6" x="144" y="452" font-size="17" text-anchor="end" fill="#1d2414" font-family="ui-monospace,monospace" font-weight="700">----</text>
    <text x="100" y="474" font-size="8.5" text-anchor="middle" fill="#3b2a00" font-weight="700">TAHOMETRU OPTIC · rot/min</text><circle cx="170" cy="445" r="6" fill="#c62828"/></g>
    <line id="tahRaza" x1="776" y1="615" x2="157" y2="${DC[1] + 4}" stroke="#ff1744" stroke-width="2" stroke-dasharray="5 4" opacity="0"/>`;
  /* ---- butonul de oprire de urgență */
  s += `<g data-k="estop" class="tk-comp" filter="url(#umbra)"><rect x="408" y="30" width="96" height="96" rx="8" fill="#f2b705" stroke="#a37a00"/><circle cx="456" cy="78" r="30" fill="#c62828" stroke="#7f1010" stroke-width="3"/><circle id="estop6" cx="456" cy="78" r="20" fill="#e53935"/>
    <text x="456" y="142" font-size="10" text-anchor="middle" fill="#333" font-weight="700">OPRIRE DE URGENȚĂ</text><text id="estop6t" x="456" y="156" font-size="9" text-anchor="middle" fill="#2e7d32">eliberat</text></g>`;
  /* ---- sursa de 12 V */
  s += `<g data-k="psu" class="tk-comp" filter="url(#umbra)"><rect x="400" y="176" width="170" height="104" rx="10" fill="#e1e3e5" stroke="#999"/><rect x="414" y="190" width="92" height="36" rx="3" fill="#0f1a12"/><text id="psu6" x="500" y="216" font-size="20" text-anchor="end" fill="#7dff8a" font-family="ui-monospace,monospace">00.0V</text>
    <circle id="psuLed" cx="530" cy="206" r="7" fill="#333"/><text x="530" y="230" font-size="8" text-anchor="middle" fill="#333">12 V ON</text><circle cx="430" cy="258" r="8" fill="#d32f2f"/><circle cx="470" cy="258" r="8" fill="#111"/><text x="485" y="272" font-size="9" fill="#444">Sursă 12 V / 3 A</text></g>`;
  /* ---- driverul L298N */
  s += `<g data-k="l298" class="tk-comp" filter="url(#umbra)"><rect x="620" y="30" width="160" height="150" rx="6" fill="#c62828" stroke="#7f1010"/><rect x="664" y="36" width="72" height="54" rx="3" fill="#2b2f35"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${668 + i * 8.6}" y="36" width="4" height="54" fill="#3f454d"/>`).join("")}
    <text x="700" y="112" font-size="12" text-anchor="middle" fill="#fff" font-weight="800">L298N</text><text x="700" y="126" font-size="8" text-anchor="middle" fill="#ffd8d8">punte H dublă</text>
    ${["ENA", "IN1", "IN2", "GND", "+12V"].map((t, i) => `<rect x="${630 + i * 30}" y="150" width="22" height="20" rx="2" fill="#1e63d6"/><text x="${641 + i * 30}" y="146" font-size="7" text-anchor="middle" fill="#fff">${t}</text>`).join("")}
    <rect x="626" y="70" width="20" height="30" rx="2" fill="#1e63d6"/><text x="636" y="66" font-size="7" text-anchor="middle" fill="#fff">OUT1/2</text></g>`;
  /* ---- circuitul de formare (LM393 + Zener) cu punctele de test */
  s += `<g data-k="formare" class="tk-comp" filter="url(#umbra)"><rect x="620" y="220" width="230" height="130" rx="6" fill="#1f4fbf" stroke="#0d2c7a"/><rect x="726" y="246" width="40" height="26" rx="2" fill="#111"/><text x="746" y="263" font-size="7" text-anchor="middle" fill="#bbb">LM393</text>
    <text x="735" y="342" font-size="9" text-anchor="middle" fill="#e6ecff" font-weight="700">circuit de formare (comparator cu histerezis, 2 × Zener 5,1 V)</text>
    <rect x="640" y="248" width="18" height="10" fill="#e8c26a"/><rect x="640" y="262" width="18" height="10" fill="#e8c26a"/><text x="649" y="244" font-size="7" text-anchor="middle" fill="#fff">Z1 Z2</text></g>
    ${Object.entries({ tVR: "TP VR", tOUT: "TP OUT" }).map(([k, t]) => `<g data-k="${k}" class="tk-comp"><circle cx="${TP6[k][0]}" cy="${TP6[k][1]}" r="11" fill="${k === "tVR" ? "#f2f2f2" : "#ffeb3b"}" stroke="#000"/><circle cx="${TP6[k][0]}" cy="${TP6[k][1]}" r="4.5" fill="#c9a227"/><text x="${TP6[k][0]}" y="${TP6[k][1] - 16}" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">${t}</text></g>`).join("")}`;
  /* ---- Arduino Mega 2560 (cu baretele D22…D53) și OLED */
  const MX = 900, MY = 30;
  s += `<g data-k="mega" class="tk-comp" filter="url(#umbra)"><rect x="${MX}" y="${MY}" width="340" height="232" rx="8" fill="#00878f" stroke="#005a60"/>
    <rect x="${MX - 14}" y="${MY + 160}" width="46" height="40" rx="3" fill="url(#gAlu6)" stroke="#666"/><g transform="translate(${MX + 170} ${MY + 120}) rotate(45)"><rect x="-30" y="-30" width="60" height="60" rx="2" fill="#262626"/></g>
    <text x="${MX + 170}" y="${MY + 123}" font-size="7" fill="#bbb" text-anchor="middle" font-family="monospace">ATMEGA2560</text><rect x="${MX + 30}" y="${MY + 6}" width="250" height="12" rx="1.5" fill="#202020"/>
    <rect x="${MX + 296}" y="${MY + 30}" width="26" height="180" rx="1.5" fill="#202020"/><text x="${MX + 286}" y="${MY + 26}" font-size="6.5" fill="#fff" text-anchor="middle">22…53</text>
    <text x="${MX + 60}" y="${MY + 200}" font-size="13" fill="#e8ffff" font-weight="800">ARDUINO MEGA 2560</text>
    <text x="${MX + 193}" y="${MY + 30}" font-size="6.5" fill="#fff" text-anchor="middle">5 6 7</text>
    <rect id="ledON6" x="${MX + 60}" y="${MY + 60}" width="8" height="5" fill="#1a3a1a"/><text x="${MX + 72}" y="${MY + 65}" font-size="6" fill="#fff">ON</text><rect id="ledTX6" x="${MX + 60}" y="${MY + 72}" width="8" height="5" fill="#5a4a1a"/><text x="${MX + 72}" y="${MY + 77}" font-size="6" fill="#fff">TX</text></g>
    <g data-k="D49" class="tk-comp"><rect x="${TP6.D49[0] - 7}" y="${TP6.D49[1] - 7}" width="14" height="14" fill="#ffeb3b" stroke="#000"/><text x="${TP6.D49[0] - 12}" y="${TP6.D49[1] + 4}" font-size="9" text-anchor="end" fill="#fff" font-weight="800">D49 ICP4</text></g>
    <g data-k="D5" class="tk-comp"><rect x="${TP6.D5[0] - 6}" y="${TP6.D5[1] - 6}" width="12" height="12" fill="#ff9800" stroke="#000"/></g>
    <g data-k="rst" class="tk-comp"><rect x="${MX + 20}" y="${MY + 92}" width="18" height="18" rx="2" fill="#ccc" stroke="#555"/><circle cx="${MX + 29}" cy="${MY + 101}" r="5.5" fill="#c62828"/><text x="${MX + 29}" y="${MY + 122}" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">RESET</text></g>
    <path id="usb6" d="M${MX - 14},${MY + 180} C${MX - 60},${MY + 180} ${MX - 60},${MY + 300} ${MX - 20},${MY + 330}" fill="none" stroke="#bbb" stroke-width="6"/>`;
  s += `<g data-k="oled" class="tk-comp" filter="url(#umbra)"><rect x="930" y="300" width="230" height="170" rx="6" fill="#16337a" stroke="#0b1d48"/><rect x="940" y="324" width="210" height="132" rx="3" fill="#050608" stroke="#333"/><g id="oled6" font-family="ui-monospace,Consolas,monospace"></g><text x="1045" y="316" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED 0,96" SSD1306 · I²C</text></g>`;
  /* ---- osciloscopul */
  s += `<g data-k="osc" class="tk-comp" filter="url(#umbra)"><rect x="20" y="440" width="560" height="350" rx="12" fill="#2c3036"/><rect x="40" y="458" width="416" height="296" rx="4" fill="#050a0e" stroke="#111"/>
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${46 + i * 40.4}" y1="476" x2="${46 + i * 40.4}" y2="724" stroke="#1f3a44" stroke-width="${i === 5 ? 1.2 : .6}"/>`).join("")}${Array.from({ length: 9 }, (_, i) => `<line x1="46" y1="${476 + i * 31}" x2="450" y2="${476 + i * 31}" stroke="#1f3a44" stroke-width="${i === 4 ? 1.2 : .6}"/>`).join("")}
    <g id="osc-tr"></g><text id="osc-h" x="48" y="470" font-size="9.5" fill="#cfe8ff" font-family="ui-monospace,monospace"></text><text id="osc-m" x="48" y="744" font-size="10" fill="#7dff8a" font-family="ui-monospace,monospace"></text>
    <text x="520" y="476" font-size="11" text-anchor="middle" fill="#e6ebf0" font-weight="700">OSCILOSCOP</text><text x="520" y="490" font-size="8" text-anchor="middle" fill="#aab">2 canale · 100 MHz</text>
    ${[0, 1, 2].map(i => `<circle cx="${488 + (i % 2) * 40}" cy="${520 + i * 40}" r="13" fill="#4a4f56" stroke="#111"/>`).join("")}
    <circle cx="490" cy="740" r="10" fill="#f2d600" stroke="#111"/><circle cx="550" cy="740" r="10" fill="#1fb6ff" stroke="#111"/><text x="490" y="770" font-size="9" text-anchor="middle" fill="#fff">CH1</text><text x="550" y="770" font-size="9" text-anchor="middle" fill="#fff">CH2</text></g>`;
  /* ---- firele */
  s += `<g style="pointer-events:none">
    ${W([[DC[0] + 4, 6], [DC[0] + 4, -4], [600, -4], [600, 270], [680, 270], [690, 290]], "#222", 2.6)}${W([[DC[0] - 4, 6], [DC[0] - 4, -8], [606, -8], [606, 276], [676, 276]], "#c62828", 2.6)}
    ${W([[TP6.tOUT[0] + 11, 300], [870, 300], [870, 168], [TP6.D49[0] - 7, 168]], "#f2c230", 3)}
    ${W([[641, 170], [641, 196], [880, 196], [880, 10], [TP6.D5[0], 10], [TP6.D5[0], TP6.D5[1] - 6]], "#ff9800", 2.4)}${W([[671, 170], [671, 202], [886, 202], [886, 16], [1102, 16], [1102, 44]], "#8e24aa", 2.4)}${W([[701, 170], [701, 208], [892, 208], [892, 22], [1111, 22], [1111, 44]], "#00897b", 2.4)}
    ${W([[565, 228], [600, 228], [600, 196], [761, 196], [761, 170]], "#c62828", 3)}${W([[504, 70], [580, 70], [580, 228], [565, 228]], "#c62828", 3)}${W([[430, 250], [420, 250], [420, 70], [408, 70]], "#c62828", 3)}
    ${W([[626, 85], [596, 85], [596, 400], [28, 400], [28, DC[1] - 14], [40, DC[1] - 14]], "#444", 3)}
    ${W([[1102, 300], [1102, 280], [1170, 280], [1170, 262]], "#1e88e5", 2)}${W([[1120, 300], [1120, 286], [1180, 286], [1180, 262]], "#43a047", 2)}</g>`;
  s += `<g id="sonde6" style="pointer-events:none"></g><text id="tk-av" x="${DC[0]}" y="${DC[1] + RD + 52}" text-anchor="middle" font-size="12" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
function oledTxt() {
  const v = sim.pr && sim.pr.last, f = (x, d, w) => Number.isFinite(x) ? x.toFixed(d).padStart(w, " ") : "  —";
  if (!v) return { titlu: "roata 60-2", linii: ["pornire..."] };
  return { titlu: `60-2 P=${sim.fw.P} prag ${sim.fw.prag}`, linii: [`n ${f(v.n, 1, 7)} rpm`, `Ti${f(v.ti, 4, 8)} ms`, `k ${String(v.k).padStart(2)} th ${String(v.th).padStart(3)}°`, `${v.sync ? "SYNC" : "----"} Tg/Ti ${f(v.rg, 2, 4)} e${v.err}`] };
}
function planseAfis() {
  if (!$("#tk-svg")) return;
  $("#disc6").setAttribute("transform", `translate(${DC[0]} ${DC[1]}) rotate(${(-90 - 3 + (sim.phi % 360)).toFixed(2)})`);
  $("#senz6").setAttribute("transform", `translate(0 ${((sim.g - 1) * -6).toFixed(1)})`); $("#gap6").textContent = `întrefier ${fx(sim.g, 1)} mm`;
  $("#capac6").setAttribute("stroke-dasharray", sim.capac ? "0" : "8 8"); $("#capac6").setAttribute("fill-opacity", sim.capac ? ".16" : "0"); $("#capac6t").textContent = sim.capac ? "capac plexiglas 3 mm" : "CAPAC DEMONTAT";
  $("#estop6").setAttribute("r", sim.estop ? 14 : 20); $("#estop6t").textContent = sim.estop ? "APĂSAT – 12 V întrerupt" : "eliberat"; $("#estop6t").setAttribute("fill", sim.estop ? "#c62828" : "#2e7d32");
  $("#psu6").textContent = sim.alim ? (sim.estop ? "12.1V" : (12.0 - sim.n / 1500 * 0.2).toFixed(1).padStart(4, "0") + "V") : "00.0V"; $("#psuLed").setAttribute("fill", sim.alim ? "#3cff4a" : "#333");
  $("#tah6").textContent = sim.tah.act ? "· · ·" : sim.tah.val !== null ? (sim.tah.val >= 1000 ? sim.tah.val.toFixed(0) : sim.tah.val.toFixed(1)) : "----"; $("#tahRaza").setAttribute("opacity", sim.tah.act ? 0.9 : 0);
  const o = sim.run ? oledTxt() : null; $("#oled6").innerHTML = o ? `<text x="946" y="342" font-size="12" fill="#ffd400">${esc(o.titlu)}</text>` + o.linii.map((l, i) => `<text x="946" y="${364 + i * 22}" font-size="14" fill="#5fd3ff">${esc(l)}</text>`).join("") : "";
  $("#ledON6").setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a"); $("#ledTX6").setAttribute("fill", sim.run && performance.now() - sim.tx < 80 ? "#ffd04a" : "#5a4a1a"); $("#usb6").setAttribute("stroke", sim.run ? "#222" : "#bbb");
  const sd = [["#f2d600", [490, 740]], ["#1fb6ff", [550, 740]]];
  $("#sonde6").innerHTML = sim.osc.ch.map((c, i) => { const t = TP6[c.s]; if (!t) return ""; const [x0, y0] = sd[i][1], cy = Math.max(y0, t[1]) + 30;
    return `<path d="M${x0},${y0} C${x0},${cy + 40} ${t[0]},${t[1] + 120} ${t[0]},${t[1] + 14}" fill="none" stroke="${sd[i][0]}" stroke-width="3.2" opacity=".95"/><rect x="${t[0] - 4}" y="${t[1] + 6}" width="8" height="22" rx="3" fill="${sd[i][0]}"/>`; }).join("");
  $("#tk-av").textContent = !sim.capac ? "⚠ capacul de protecție demontat" : sim.estop ? "oprire de urgență apăsată" : "";
  oscAfis();
}
const INSP = {
  disc: () => ["Discul 60 − 2", [["Pas", "6° (60 de pași)"], ["Dinți lipsă", "2 (golul de referință)"], ["Unghiul golului", `${P().tref}° înaintea PMI cil. 1`], ["Unghi curent", fx(sim.phi % 360, 1) + "°"]]],
  motor: () => ["Motorul de c.c. cu reductor", [["Alimentare", "12 V prin L298N, PWM pe D5 (490 Hz)"], ["PWM", fx(sim.d * 100, 0) + " % (maxim 70 %)"], ["Turație", fx(sim.n, 1) + " rot/min"]]],
  senzor: () => ["Senzorul inductiv (VR)", [["Principiu", "bobină + magnet; u ∝ dΦ/dt"], ["Întrefier", fx(sim.g, 1) + " mm (lere 0,5…3 mm)"], ["Amplitudine", fx(MD.vpp(P(), sim.n, sim.g), 2) + " V vârf-vârf"]]],
  formare: () => ["Circuitul de formare", [["Comparator", "LM393 cu histerezis"], ["Protecție", "2 diode Zener 5,1 V (limitare ±5,1 V)"], ["Ieșire", "dreptunghi 0/5 V → D49 (ICP4)"]]],
  l298: () => ["Driverul L298N", [["ENA", "D5 (PWM)"], ["IN1 / IN2", "D6 / D7 (sensul)"], ["Alimentare", alimentat() ? "12 V" : "fără 12 V"]]],
  psu: () => ["Sursa de 12 V", [["Stare", sim.alim ? "pornită" : "oprită"], ["Linia motorului", "prin butonul de oprire de urgență (NC)"]]],
  mega: () => ["Arduino Mega 2560", [["Captura", "Timer4, ICP4 = D49, front crescător"], ["Tick", sim.fw ? fx(sim.fw.P / 16, 2) + " µs (P = " + sim.fw.P + ")" : "—"], ["Rezonator", "16 MHz (ceramic, ±0,5 %)"]]],
  oled: () => ["OLED SSD1306", [["Conținut", "n, Ti, k, θ, SYNC, Tgol/Ti, erori"]]],
  osc: () => ["Osciloscopul", [["CH1", PUNCTE[sim.osc.ch[0].s]], ["CH2", PUNCTE[sim.osc.ch[1].s]], ["Baza de timp", fmtT(sim.osc.tdiv) + "/div"]]],
  tah: () => ["Tahometrul optic", [["Principiu", "fascicul reflectat de banda de pe cuplaj"], ["Rezoluție", "0,1 rot/min (sub 1000), 1 rot/min"], ["Ultima citire", sim.tah.val !== null ? fx(sim.tah.val, 1) + " rot/min" : "—"]]],
  estop: () => ["Oprirea de urgență", [["Contact", "NC pe linia de 12 V a motorului"], ["Stare", sim.estop ? "apăsat" : "eliberat"], ["Verificată", sim.estopVerif ? "da" : "nu"]]],
  capac: () => ["Capacul de protecție", [["Material", "plexiglas 3 mm, 4 șuruburi"], ["Stare", sim.capac ? "montat" : "demontat"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}
function laClic3d(k) {
  if (k === "estop") return comutaEstop();
  if (k === "capac") return comutaCapac();
  if (k === "psu") return comutaAlim();
  if (k === "tah") return masoaraTah();
  if (k === "rst") { if (sim.run) { seriala("— RESET —"); pornesteProgram(); actualizeaza(); } return; }
  if (["D49", "tOUT", "D5"].includes(k)) { sim.osc.ch[0].s = k; oscCtl(); return actualizeaza(); }
  if (k === "tVR") { sim.osc.ch[1].s = k; oscCtl(); return actualizeaza(); }
  inspector(k);
}

/* ------------------------------------------------------------------ panourile de sub planșă */
function panou() {
  const el = $("#tk-pompa"); if (!el) return;
  el.innerHTML = `<b>Stand</b><button type="button" data-st="capac" class="${sim.capac ? "activ" : "slab"}">Capac ${sim.capac ? "montat ✓" : "demontat"}</button>
    <button type="button" data-st="estop" class="${sim.estop ? "slab" : ""}">🛑 Urgență ${sim.estop ? "APĂSAT" : "eliberat"}</button><button type="button" data-st="alim" class="${sim.alim ? "activ" : ""}">12 V ${sim.alim ? "ON" : "OFF"}</button>
    <span class="sep"></span><b>Întrefier (lere)</b>${MD.GAPS.map(g => `<button type="button" data-gap="${g}" class="${Math.abs(sim.g - g) < 1e-9 ? "activ" : ""}">${fx(g, 1)}</button>`).join("")}<span>mm</span>
    <span class="sep"></span><b>PWM (program)</b>${[0, 15, 20, 25, 30, 35, 40, 50, 65, 70].map(v => `<button type="button" data-pwm="${v}" class="${Math.round(sim.d * 100) === v && sim.run ? "activ" : ""}">${v}</button>`).join("")}<span>%</span>
    <button type="button" data-acc="1" class="primar">⚡ Accelerare bruscă</button><button type="button" data-tah="1">Tahometru: măsoară</button>`;
  $$("[data-st]", el).forEach(b => b.addEventListener("click", () => ({ capac: comutaCapac, estop: comutaEstop, alim: comutaAlim })[b.dataset.st]()));
  $$("[data-gap]", el).forEach(b => b.addEventListener("click", () => seteazaGap(+b.dataset.gap)));
  $$("[data-pwm]", el).forEach(b => b.addEventListener("click", () => comanda("p" + b.dataset.pwm)));
  $$("[data-acc]", el).forEach(b => b.addEventListener("click", () => comanda("a")));
  $$("[data-tah]", el).forEach(b => b.addEventListener("click", masoaraTah));
}
function oscCtl() {
  const el = $("#tk-osc"); if (!el) return; const o = sim.osc;
  const sel = (i, opt) => `<select data-ch="${i}">${opt.map(k => `<option value="${k}"${o.ch[i].s === k ? " selected" : ""}>${PUNCTE[k]}</option>`).join("")}</select>`;
  el.innerHTML = `<b>Osciloscop</b><label>CH1 ${sel(0, ["nc", "D49", "tOUT", "D5"])}</label><label>CH2 ${sel(1, ["nc", "tVR"])}</label>
    <button type="button" data-td="-1">T/div −</button><span class="osc-v">${fmtT(o.tdiv)}/div</span><button type="button" data-td="1">T/div +</button>
    <button type="button" data-vd="-1">CH2 V −</button><span class="osc-v">${fx(o.vdiv, o.vdiv < 1 ? 2 : 0)} V/div</span><button type="button" data-vd="1">CH2 V +</button>
    <button type="button" data-tg="front" class="${o.trig === "front" ? "activ" : ""}">Trig: front ↑</button><button type="button" data-tg="gol" class="${o.trig === "gol" ? "activ" : ""}">Trig: lățime (golul)</button>
    <button type="button" data-rs="1" class="${o.ruleaza ? "" : "activ"}">${o.ruleaza ? "■ Stop" : "▶ Run"}</button>`;
  $$("[data-ch]", el).forEach(s => s.addEventListener("change", () => { o.ch[+s.dataset.ch].s = s.value; actualizeaza(); }));
  $$("[data-td]", el).forEach(b => b.addEventListener("click", () => { const i = TDIV.indexOf(o.tdiv) + +b.dataset.td; o.tdiv = TDIV[Math.max(0, Math.min(TDIV.length - 1, i))]; oscCtl(); achizitie(); oscAfis(); }));
  $$("[data-vd]", el).forEach(b => b.addEventListener("click", () => { const i = VDIV.indexOf(o.vdiv) + +b.dataset.vd; o.vdiv = VDIV[Math.max(0, Math.min(VDIV.length - 1, i))]; oscCtl(); oscAfis(); }));
  $$("[data-tg]", el).forEach(b => b.addEventListener("click", () => { o.trig = b.dataset.tg; oscCtl(); achizitie(); oscAfis(); }));
  $$("[data-rs]", el).forEach(b => b.addEventListener("click", () => { o.ruleaza = !o.ruleaza; oscCtl(); }));
}
function afisaje() {
  const e = $("#afis"); if (!e) return; const v = sim.pr && sim.pr.last;
  e.innerHTML = `<div><span>Turația (reală)</span><b>${sim.n > 0.5 ? "≈ " + fx(sim.n, 0) : "0"} rot/min</b></div><div><span>Tahometru</span><b>${sim.tah.val !== null ? fx(sim.tah.val, 1) : "—"}</b></div>
    <div><span>OLED</span><b>${sim.run && v ? `n ${fx(v.n, 1)} · Ti ${Number.isFinite(v.ti) ? fx(v.ti, 4) : "—"} ms · ${v.sync ? "SYNC" : "fără sync"}` : "—"}</b></div>
    <div><span>Observare ${MD.TOBS} s</span><b>${sim.obs ? (sim.obs.gata ? `${sim.obs.err} erori → ${sim.obs.sync === "da" ? "stabilă" : "instabilă"}` : `${fx(sim.tS - sim.obs.t0, 1)} s…`) : "—"}</b></div>`;
}
function sincron3d() { if (!SV3 && Cadru.anim && Cadru.anim.vedere) SV3 = Cadru.anim; }
function actualizeaza() { panou(); afisaje(); planseAfis(); sincron3d(); actualizeazaPasi(); }

/* ------------------------------------------------------------------ plotterul turației */
function plotter() {
  const cv = $("#tk-plot"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const ist = sim.ist, t1 = ist.length ? ist[ist.length - 1].t : 30, t0 = t1 - 30, pts = ist.filter(e => e.t >= t0).map(e => [e.t, e.n]);
  const mx = 1600, L = 46, R = 8, T = 8, B = 20, X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = v => T + (mx - v) / mx * (H - T - B);
  g.font = "10px system-ui"; g.fillStyle = "#666"; g.strokeStyle = "#eee";
  for (let v = 0; v <= mx; v += 400) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke(); g.fillText(String(v), 4, Y(v) + 3); }
  for (let t = Math.ceil(t0 / 5) * 5; t <= t1; t += 5) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), H - B); g.stroke(); g.fillText((t - t1).toFixed(0) + " s", X(t) - 10, H - 6); }
  g.strokeStyle = "#1565c0"; g.lineWidth = 1.6; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
  g.fillStyle = "#888"; g.fillText("n [rot/min] calculat de program – ultimele 30 s", L + 6, T + 9);
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregN(e) {
  if (!sim.run || !sim.pr || !sim.pr.last) return Cadru.mesajTemporar("Porniți simularea (programul de captură) și motorul.", "atentie");
  const v = sim.pr.last;
  if (sim.g > 1.05) return Cadru.mesajTemporar("Tabelul 6.1 se completează cu întrefierul de 1,0 mm (pasul 1).", "atentie");
  if (!stabil() || !v.sync) return Cadru.mesajTemporar("Așteptați turația constantă (câteva secunde după schimbarea PWM) și sincronizarea programului (SYNC).", "atentie");
  const a = sim.osc.acq;
  if (!["D49", "tOUT"].includes(sim.osc.ch[0].s) || !a || !a.m || !Number.isFinite(a.m.f) || sim.osc.trig !== "front") return Cadru.mesajTemporar("CH1 pe D49 (sau TP OUT), declanșare pe front ↑ și o bază de timp la care osciloscopul afișează CH1 Freq.", "atentie");
  const t = sim.tah; if (t.val === null || Math.abs(t.dVal - sim.d) > 1e-9 || sim.tS - t.tVal > 20 || !t.stab) return Cadru.mesajTemporar("Măsurați turația cu tahometrul optic la regimul curent, după stabilizare.", "atentie");
  const T1 = Cadru.D.t.t61; let k = null; for (let i = 1; i <= 4; i++) if (T1["r" + i].n === "") { k = "r" + i; break; }
  if (!k) return Cadru.mesajTemporar("Tabelul 6.1 are deja 4 regimuri.", "atentie");
  const alte = [1, 2, 3, 4].map(i => num(T1["r" + i].n)).filter(Number.isFinite); if (alte.some(x => Math.abs(x - v.n) < 100)) return Cadru.mesajTemporar("Alegeți regimuri diferite (cel puțin 100 rot/min între ele).", "atentie");
  const f = Math.round(a.m.f * 100) / 100, ti = Math.round(v.ti * 10000) / 10000, n = Math.round(v.n * 10) / 10, rg = Math.round(v.rg * 1000) / 1000, d = Math.round(sim.d * 100) / 100;
  const ok = Cadru.inregistreaza(e, { log: { m: "n", k, d, f, ti, n, nt: t.val, rg, P: sim.fw.P }, celule: [{ t: "t61", r: k, c: "pwm", v: String(Math.round(d * 100)) }, { t: "t61", r: k, c: "f", v: f.toFixed(2) }, { t: "t61", r: k, c: "ti", v: ti.toFixed(4) }, { t: "t61", r: k, c: "n", v: n.toFixed(1) }, { t: "t61", r: k, c: "nt", v: String(t.val) }, { t: "t61", r: k, c: "rg", v: rg.toFixed(3) }] });
  if (ok) msg(`Tabelul 6.1, regimul ${k.slice(1)}: f = ${fx(f, 2)} Hz, Ti = ${fx(ti, 4)} ms, n = ${fx(n, 1)} rot/min, n tahometru = ${fx(t.val, 1)}, Tgol/Ti = ${fx(rg, 3)}.`);
}
function inregG(e) {
  if (!sim.run || !sim.pr) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  const k = MD.cheieG(sim.g), o = sim.obs;
  if (Math.abs(sim.n - MD.NREF) > 80 || !stabil()) return Cadru.mesajTemporar(`Tabelul 6.2 se completează la ≈ ${MD.NREF} rot/min (±80), în regim stabil (PWM ≈ 30 %).`, "atentie");
  if (sim.osc.ch[1].s !== "tVR" || !Number.isFinite(vpp2())) return Cadru.mesajTemporar("CH2 pe TP VR (semnalul senzorului înainte de formare), cu declanșarea pe CH1 (D49) – osciloscopul afișează CH2 Vpp.", "atentie");
  if (vpp2() > 7.6 * sim.osc.vdiv) return Cadru.mesajTemporar("Semnalul CH2 iese din ecran: măriți V/div (CH2 V +).", "atentie");
  if (vpp2() < 2 * sim.osc.vdiv && sim.osc.vdiv > 0.05) return Cadru.mesajTemporar("Semnalul CH2 ocupă sub 2 diviziuni: micșorați V/div (CH2 V −) pentru o citire precisă.", "atentie");
  if (!o || !o.gata || Math.abs(o.g - sim.g) > 1e-9) return Cadru.mesajTemporar(`Porniți observarea sincronizării (${MD.TOBS} s) la acest întrefier și așteptați rezultatul.`, "atentie");
  const forma = $("#sel-forma") ? $("#sel-forma").value : ""; if (!forma) return Cadru.mesajTemporar("Alegeți forma semnalului observată pe CH2.", "atentie");
  const vp = Math.round(vpp2() * 1000) / 1000, n = Math.round(sim.n);
  const ok = Cadru.inregistreaza(e, { log: { m: "g", k, g: sim.g, n, vpp: vp, sync: o.sync, err: o.err, forma }, celule: [{ t: "t62", r: k, c: "n", v: String(n) }, { t: "t62", r: k, c: "vpp", v: vp.toFixed(3) }, { t: "t62", r: k, c: "forma", v: forma }, { t: "t62", r: k, c: "err", v: String(o.err) }, { t: "t62", r: k, c: "sync", v: o.sync }] });
  if (ok) msg(`Tabelul 6.2, întrefier ${fx(sim.g, 1)} mm: Vpp = ${fx(vp, 3)} V la ${n} rot/min, ${o.err} erori în ${MD.TOBS} s → sincronizare ${o.sync === "da" ? "stabilă" : "instabilă"}.`);
}
function inregAcc(e) {
  if (!sim.fw) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  const k = Object.keys(MD.PRAGURI).find(x => MD.PRAGURI[x] === sim.fw.prag);
  if (!k) return Cadru.mesajTemporar("Tabelul 6.3 se completează cu pragul 1,5 și apoi cu 2,9 (opriți simularea, schimbați PRAG în cod, porniți).", "atentie");
  const r = sim.accRez[sim.fw.prag]; if (!r) return Cadru.mesajTemporar("Faceți întâi accelerarea bruscă (PWM 20…25 % stabil, apoi „⚡ Accelerare bruscă”) și așteptați rezultatul pe monitorul serial.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "acc", k, prag: sim.fw.prag, rmin: r.rmin, sync: r.sync }, celule: [{ t: "t63", r: k, c: "rmin", v: r.rmin.toFixed(3) }, { t: "t63", r: k, c: "sync", v: r.sync }] });
  if (ok) msg(`Tabelul 6.3 (prag ${fx(sim.fw.prag, 1)}): Tgol/Ti minim = ${fx(r.rmin, 3)} → sincronizare ${r.sync === "da" ? "păstrată" : "pierdută"}.`);
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const nT61 = () => [1, 2, 3, 4].filter(i => pe("t61", "r" + i, "n")).length, nT62 = () => MD.GAPS.filter(g => pe("t62", MD.cheieG(g), "vpp")).length;
const PASI = [
  { t: "Pregătirea standului (NSSM)", tab: "întrefier 1,0 mm", v3: "disc",
    banda: "Pasul 1 · Capacul montat, oprirea de urgență verificată; cu motorul oprit și 12 V deconectat se reglează întrefierul la 1,0 mm cu lera.",
    instr: ["Verificați că <b>capacul de plexiglas</b> este montat (butonul „Capac montat ✓” sub planșă sau clic pe capac).",
      "Apăsați <b>12 V OFF</b> → linia motorului devine <b>12 V ON</b>; apoi apăsați <b>🛑 Urgență</b>: sursa rămâne pornită, dar linia motorului se întrerupe – verificarea este reușită. Apăsați din nou butonul (eliberare).",
      "Apăsați <b>12 V ON</b> pentru a deconecta alimentarea (12 V OFF) – întrefierul se reglează numai așa.",
      "La „Întrefier (lere)” alegeți <b>1,0</b> mm (senzorul coboară până atinge lera de 1 mm).",
      "Apăsați din nou <b>12 V OFF</b> → <b>12 V ON</b> (alimentarea motorului; discul încă nu se rotește – PWM-ul îl dă programul)."],
    ctl: () => "",
    ver: () => [[sim.capac, "capacul montat"], [sim.estopVerif && !sim.estop, sim.estopVerif ? (sim.estop ? "oprirea de urgență verificată – eliberați butonul" : "oprirea de urgență verificată") : "oprirea de urgență verificată"], [Math.abs(sim.g - 1) < 1e-9, `întrefierul 1,0 mm (acum ${fx(sim.g, 1)} mm)`], [alimentat(), "linia de 12 V a motorului alimentată"]],
    prog: () => { const v = [sim.capac, sim.estopVerif, Math.abs(sim.g - 1) < 1e-9, alimentat()].filter(Boolean).length; if (v === 4) sim.p1ok = true; return sim.p1ok ? 4 : v; }, tot: 4, butoane: [] },
  { t: "Semnalul pe osciloscop", tab: "golul și perioada unui dinte", v3: "osc",
    banda: "Pasul 2 · Motorul la turație mică (PWM 20…30 %). CH2 pe TP VR (senzorul), CH1 pe D49 (semnalul format); declanșarea pe lățimea impulsului arată golul.",
    instr: ["Apăsați <b>▶ Pornește simularea</b> (bara planșei): programul <i>roata_60_2</i> pornește și comandă motorul prin D5.",
      "La „PWM (program)” apăsați <b>30</b> %: discul se rotește (≈ 500 rot/min).",
      "Clic pe <b>TP VR</b> (CH2 – semnalul brut al senzorului inductiv) și pe pinul <b>D49</b> al plăcii Mega (CH1 – semnalul format).",
      "Pe panoul osciloscopului: <b>T/div</b> = 5 ms și <b>Trig: lățime (golul)</b> – osciloscopul se declanșează pe golul de referință; pe ecran se vede pauza de 3 perioade.",
      "Comparați: perioada unui dinte (<b>T</b>, afișată de osciloscop la Trig: front) și durata golului (≈ 3·T). Observați că la CH2 amplitudinea crește după gol (dintele mai lung)."],
    ctl: () => "",
    ver: () => [[sim.run, "programul rulează"], [sim.n > 100, "discul se rotește"], [sim.osc.ch[1].s === "tVR", "CH2 pe TP VR"], [["D49", "tOUT"].includes(sim.osc.ch[0].s), "CH1 pe D49"], [sim.osc.trig === "gol" && golInFereastra(), "golul afișat pe ecran (Trig: lățime)"]],
    prog: () => sim.golVazut ? 1 : 0, tot: 1, butoane: [] },
  { t: "Programul de captură", tab: "Ti, n, k pe OLED", v3: "mega",
    banda: "Pasul 3 · Programul măsoară Ti prin captura de intrare (Timer4, P = 8 → 0,5 µs), recunoaște golul (Ti > 1,5·Ti−1), numără dinții k și calculează n și θ.",
    instr: ["Citiți în panoul de cod rutina de captură <code>ISR(TIMER4_CAPT_vect)</code>: diferența a două capturi = perioada Ti; golul: Ti &gt; PRAG·Ti−1.",
      "Pe OLED și pe monitorul serial urmăriți: <b>n</b> (rot/min), <b>Ti</b> (ms, media pe 20 de dinți), indicele dintelui <b>k</b>, unghiul <b>θ = θref + 6·k</b>, <b>SYNC</b> și raportul <b>Tgol/Ti</b>.",
      "Schimbați PWM-ul (de ex. 20 → 50 %) și urmăriți pe plotter cum crește turația și cum rămâne SYNC."],
    ctl: () => "",
    ver: () => [[sim.run && sim.pr && sim.pr.sync, "programul sincronizat (SYNC)"], [sim.pr && Number.isFinite(sim.pr.rg), sim.pr && Number.isFinite(sim.pr.rg) ? `Tgol/Ti = ${fx(sim.pr.rg, 3)}` : "golul recunoscut"]],
    prog: () => sim.syncVazut ? 1 : 0, tot: 1, butoane: [] },
  { t: "Turația la 4 regimuri", tab: "Tabelul 6.1", v3: "osc",
    banda: "Pasul 4 · Pentru 4 turații: f pe osciloscop (CH1 D49, Trig: front), Ti și n din program, n de la tahometrul optic, Tgol/Ti.",
    instr: ["Întrefierul trebuie să fie <b>1,0 mm</b>. Alegeți PWM <b>20 %</b> și așteptați ≈ 2 s turația constantă.",
      "Osciloscop: CH1 pe <b>D49</b>, <b>Trig: front ↑</b>, T/div astfel încât să se vadă 2…10 dinți (de ex. 2 ms/div) – apare <b>CH1 Freq</b>.",
      "Apăsați <b>Tahometru: măsoară</b> (fasciculul pe banda reflectorizantă a cuplajului) și așteptați citirea (≈ 1,5 s).",
      "Apăsați <b>„● f, Ti, n, n tahometru, Tgol/Ti → Tabelul 6.1”</b>.",
      "Repetați pentru PWM <b>35</b>, <b>50</b> și <b>65</b> % (tahometrul se măsoară din nou la fiecare regim; la turație mare micșorați T/div)."],
    ctl: () => `<div class="rand-mic">${[20, 35, 50, 65].map(v => `<button type="button" data-pwm2="${v}">PWM ${v} %</button>`).join("")}</div><div class="rand-mic"><button type="button" data-tah2="1">Tahometru: măsoară</button><button type="button" data-tdv="0.002">2 ms/div</button><button type="button" data-tdv="0.0005">0,5 ms/div</button></div>`,
    ver: () => { const a = sim.osc.acq; return [[sim.run && stabil(), "turația constantă"], [sim.pr && sim.pr.sync, "SYNC"], [["D49", "tOUT"].includes(sim.osc.ch[0].s) && sim.osc.trig === "front" && !!(a && a.m && Number.isFinite(a.m.f)), "CH1 Freq afișată (Trig: front)"], [sim.tah.val !== null && Math.abs(sim.tah.dVal - sim.d) < 1e-9, "tahometrul citit la regimul curent"], [nT61() >= 4, `regimuri înregistrate: ${nT61()}/4`]]; },
    prog: nT61, tot: 4, butoane: [["● f, Ti, n, n tahometru, Tgol/Ti → Tabelul 6.1", inregN, "primar"]] },
  { t: "Influența întrefierului", tab: "Tabelul 6.2", v3: "disc",
    banda: `Pasul 5 · Întrefierul 0,5 … 3,0 mm (reglaj numai cu motorul oprit și 12 V deconectat). La ≈ ${MD.NREF} rot/min: Vpp pe TP VR și sincronizarea în ${MD.TOBS} s.`,
    instr: ["Opriți motorul: PWM <b>0</b>, așteptați oprirea discului, apoi <b>12 V OFF</b>.",
      "Alegeți întrefierul cu lerele: începeți cu <b>0,5</b> mm.",
      `Apăsați <b>12 V ON</b> și PWM <b>30</b> % (≈ ${MD.NREF} rot/min); așteptați turația constantă.`,
      "Osciloscop: CH2 pe <b>TP VR</b>, CH1 pe <b>D49</b> (declanșarea); reglați <b>CH2 V/div</b> până când semnalul ocupă 2…7 diviziuni; citiți <b>CH2 Vpp</b> și observați forma.",
      `Apăsați <b>„Observă sincronizarea ${MD.TOBS} s”</b> și așteptați rezultatul (erorile de sincronizare apar pe monitorul serial).`,
      "Alegeți forma observată și apăsați <b>„● Vpp, forma, sincronizarea → Tabelul 6.2”</b>.",
      "Repetați pentru 1,0 · 1,5 · 2,0 · 2,5 · 3,0 mm. La final readuceți întrefierul la 1,0 mm."],
    ctl: () => `<div class="rand-mic"><button type="button" data-obs="1" class="primar">Observă sincronizarea ${MD.TOBS} s</button><button type="button" data-pwm2="0">PWM 0 %</button><button type="button" data-pwm2="30">PWM 30 %</button></div>
      <label class="camp" style="margin:.2rem 0">Forma semnalului (CH2) <select id="sel-forma"><option value=""></option>${MD.FORME.map(f => `<option>${f}</option>`).join("")}</select></label>`,
    ver: () => [[Math.abs(sim.n - MD.NREF) <= 80 && stabil(), `n ≈ ${MD.NREF} rot/min, constantă`], [sim.osc.ch[1].s === "tVR" && Number.isFinite(vpp2()), "CH2 pe TP VR, Vpp afișat"], [!!(sim.obs && sim.obs.gata && Math.abs(sim.obs.g - sim.g) < 1e-9), sim.obs && sim.obs.gata ? `observare: ${sim.obs.err} erori → ${sim.obs.sync === "da" ? "stabilă" : "instabilă"}` : `observarea de ${MD.TOBS} s`], [nT62() >= 6, `întrefieri înregistrați: ${nT62()}/6`]],
    prog: nT62, tot: 6, butoane: [["● Vpp, forma, sincronizarea → Tabelul 6.2", inregG, "primar"]] },
  { t: "Accelerarea bruscă", tab: "Tabelul 6.3 – pragul golului", v3: "disc",
    banda: "Pasul 6 · De la PWM 20…25 % la 70 % brusc: în gol raportul Tgol/Ti scade sub 3. Cu pragul 1,5 sincronizarea se păstrează; cu 2,9 se pierde.",
    instr: ["Întrefierul <b>1,0 mm</b>, PRAG = <b>1.5</b> în cod (implicit). PWM <b>20</b> % și așteptați turația constantă (sub ≈ 180 rot/min semnalul inductiv este prea slab și apar dinți pierduți).",
      "Apăsați <b>⚡ Accelerare bruscă</b>: programul trece PWM la 70 % (sincron, cu doi dinți înaintea golului) și urmărește 2,5 s raportul Tgol/Ti; rezultatul apare pe monitorul serial.",
      "Apăsați <b>„● Tgol/Ti minim, sincronizarea → Tabelul 6.3”</b>.",
      "Apăsați <b>■ Oprește simularea</b>, alegeți în cod PRAG = <b>2.9</b>, porniți simularea, PWM 20 %, repetați accelerarea și înregistrați.",
      "Readuceți PRAG = 1.5. Răspundeți la întrebarea 2: de ce nu 2,9?"],
    ctl: () => `<div class="rand-mic"><button type="button" data-pwm2="20">PWM 20 %</button><button type="button" data-acc2="1" class="primar">⚡ Accelerare bruscă</button></div>`,
    ver: () => [[sim.run && sim.fw && (sim.fw.prag === 1.5 || sim.fw.prag === 2.9), sim.fw ? `programul cu PRAG = ${sim.fw.prag}` : "programul pornit"], [!!(sim.fw && sim.accRez[sim.fw.prag]), sim.fw && sim.accRez[sim.fw.prag] ? `accelerare: Tgol/Ti min = ${fx(sim.accRez[sim.fw.prag].rmin, 3)}, sync ${sim.accRez[sim.fw.prag].sync}` : "accelerarea efectuată"]],
    prog: () => Object.keys(MD.PRAGURI).filter(k => pe("t63", k, "rmin")).length, tot: 2, butoane: [["● Tgol/Ti minim, sincronizarea → Tabelul 6.3", inregAcc, "primar"]] }
];
let pasActiv = 0;
/* indiciile pas cu pas: ce se conectează / se apasă, în ordine (comun/ghid-pasi.js → ghidIndicii) */
const giK = k => `#tk-svg [data-k="${k}"]`, giA = s => ".pas.activ " + s, giR = (j = 0) => `.pas.activ [data-inreg][data-j="${j}"]`, giS = "#tk-start", giPm = s => "#tk-pompa " + s, giO = s => "#tk-osc " + s;
const giAlim = () => [[giK("psu"), giPm('[data-st="alim"]')], "Apăsați <b>12 V OFF</b> → <b>12 V ON</b> (alimentarea motorului)", alimentat()];
const giStart = () => [giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run];
function giGap(g) {
  if (Math.abs(sim.g - g) < 1e-9) return [];
  return [[[giA('[data-pwm2="0"]'), giPm('[data-pwm="0"]')], "Apăsați PWM <b>0</b> %", sim.n <= 0.5 || !sim.run || Math.round(sim.d * 100) === 0],
    ["#tk-serial", `Așteptați oprirea discului (acum ${fx(sim.n, 0)} rot/min)`, sim.n <= 0.5],
    [[giK("psu"), giPm('[data-st="alim"]')], "Apăsați <b>12 V ON</b> → <b>12 V OFF</b> (întrefierul se reglează fără alimentare)", !sim.alim],
    [giPm(`[data-gap="${g}"]`), `La „Întrefier (lere)” alegeți <b>${fx(g, 1)}</b> mm`, false]];
}
const giPwm = (v, gata) => [[giA(`[data-pwm2="${v}"]`), giPm(`[data-pwm="${v}"]`)], `PWM <b>${v}</b> %`, gata !== undefined ? gata : sim.run && Math.round(sim.d * 100) === v];
const giCh1 = () => [[giK("D49"), giO('[data-ch="0"]')], "Clic pe pinul <b>D49</b> al plăcii Mega (CH1 – semnalul format)", ["D49", "tOUT"].includes(sim.osc.ch[0].s)];
const giCh2 = () => [[giK("tVR"), giO('[data-ch="1"]')], "Clic pe <b>TP VR</b> (CH2 – semnalul brut al senzorului)", sim.osc.ch[1].s === "tVR"];
PASI[0].ind = () => [[[giK("capac"), giPm('[data-st="capac"]')], "Montați <b>capacul de plexiglas</b> (clic pe capac)", sim.capac],
  [[giK("psu"), giPm('[data-st="alim"]')], "Apăsați <b>12 V OFF</b> → <b>12 V ON</b>", sim.alim || sim.estopVerif],
  [[giK("estop"), giPm('[data-st="estop"]')], "Apăsați <b>🛑 Urgență</b> – linia motorului trebuie să se întrerupă", sim.estopVerif],
  [[giK("estop"), giPm('[data-st="estop"]')], "Eliberați butonul de urgență (clic din nou)", sim.estopVerif && !sim.estop],
  ...giGap(1), giAlim()];
PASI[1].ind = () => [...giGap(1), giAlim(), giStart(), giPwm(30, sim.n > 100), giCh2(), giCh1(),
  [giO(`[data-td="${sim.osc.tdiv < 0.005 ? 1 : -1}"]`), `Pe osciloscop apăsați <b>T/div ${sim.osc.tdiv < 0.005 ? "+" : "−"}</b> până la <b>5 ms/div</b> (acum ${fmtT(sim.osc.tdiv)}/div)`, Math.abs(sim.osc.tdiv - 0.005) < 1e-9 || sim.golVazut],
  [giO('[data-tg="gol"]'), "Apăsați <b>Trig: lățime (golul)</b>", sim.osc.trig === "gol"],
  ["#tk-svg", "Urmăriți golul de 3 perioade pe ecran (CH2: amplitudinea crește după gol)", sim.golVazut]];
PASI[2].ind = () => [...giGap(1), giAlim(), giStart(), giPwm(30, sim.n > 100), ["#tk-serial", "Urmăriți pe OLED și pe monitorul serial n, Ti, k, θ, SYNC și Tgol/Ti", sim.syncVazut],
  [giPm('[data-pwm="50"]'), "Schimbați PWM-ul (de ex. 20 → 50 %) și urmăriți plotterul", sim.syncVazut && Math.round(sim.d * 100) >= 50]];
PASI[3].ind = () => {
  const fol = (Cadru.D.log || []).filter(l => l.m === "n").map(l => Math.round(l.d * 100)), v = [20, 35, 50, 65].find(x => !fol.includes(x));
  if (v === undefined || nT61() >= 4) return [[giR(0), "Tabelul 6.1 este complet", true]];
  const a = sim.osc.acq, f = !!(a && a.m && Number.isFinite(a.m.f)), t = sim.tah;
  return [...giGap(1), giAlim(), giStart(), giPwm(v), ["#tk-serial", "Așteptați turația constantă și SYNC (câteva secunde)", sim.run && stabil() && !!(sim.pr && sim.pr.sync)], giCh1(),
    [giO('[data-tg="front"]'), "Apăsați <b>Trig: front ↑</b>", sim.osc.trig === "front"],
    [giA(`[data-tdv="${v >= 50 ? "0.0005" : "0.002"}"]`), `Baza de timp <b>${v >= 50 ? "0,5" : "2"} ms/div</b> (până apare CH1 Freq)`, f && sim.osc.trig === "front"],
    [[giA("[data-tah2]"), giK("tah")], t.val !== null && Math.abs(t.dVal - sim.d) < 1e-9 && !t.stab ? "Citirea tahometrului s-a făcut înainte de stabilizare: apăsați din nou <b>Tahometru: măsoară</b>" : "Apăsați <b>Tahometru: măsoară</b>", !!t.act || (t.val !== null && Math.abs(t.dVal - sim.d) < 1e-9 && t.stab)],
    [giK("tah"), "Așteptați citirea tahometrului (≈ 1,5 s)", t.val !== null && Math.abs(t.dVal - sim.d) < 1e-9 && t.stab],
    [giR(0), `Apăsați <b>„● f, Ti, n, n tahometru, Tgol/Ti → Tabelul 6.1”</b> (PWM ${v} %)`, false]];
};
PASI[4].ind = () => {
  const g = MD.GAPS.find(x => !pe("t62", MD.cheieG(x), "vpp"));
  if (g === undefined) return [...giGap(1), giAlim()];
  const o = sim.obs, v = vpp2(), vd = sim.osc.vdiv, okV = Number.isFinite(v) && v <= 7.6 * vd && (v >= 2 * vd || vd <= 0.05);
  return [...giGap(g), giAlim(), giStart(), giPwm(30), ["#tk-serial", `Așteptați turația constantă (≈ ${MD.NREF} rot/min)`, sim.run && stabil() && Math.abs(sim.n - MD.NREF) <= 80], giCh2(), giCh1(),
    [giO(`[data-vd="${Number.isFinite(v) && v > 7.6 * vd ? 1 : -1}"]`), Number.isFinite(v) ? `Apăsați <b>CH2 V ${v > 7.6 * vd ? "+" : "−"}</b> până când semnalul ocupă 2…7 diviziuni (acum ${fx(vd, vd < 1 ? 2 : 0)} V/div, ${fx(v / vd, 1)} div)` : "Reglați <b>CH2 V/div</b> (semnalul CH2 trebuie să apară pe ecran)", okV],
    [giA("[data-obs]"), `Apăsați <b>„Observă sincronizarea ${MD.TOBS} s”</b>`, !!(o && Math.abs(o.g - sim.g) < 1e-9)],
    ["#tk-serial", `Așteptați rezultatul observării pe monitorul serial${o && !o.gata ? ` (${fx(Math.max(0, MD.TOBS - (sim.tS - o.t0)), 0)} s)` : ""}`, !!(o && o.gata && Math.abs(o.g - sim.g) < 1e-9)],
    [giA("#sel-forma"), "Alegeți <b>forma</b> semnalului observată pe CH2", !!($("#sel-forma") && $("#sel-forma").value)],
    [giR(0), `Apăsați <b>„● Vpp, forma, sincronizarea → Tabelul 6.2”</b> (${fx(g, 1)} mm)`, false]];
};
PASI[5].ind = () => {
  const k = Object.keys(MD.PRAGURI).find(x => !pe("t63", x, "rmin"));
  if (!k) return [[giS, "Opriți simularea și readuceți în cod PRAG = 1.5", !sim.run || (sim.fw && sim.fw.prag === 1.5)], ['#tk-cod [data-cf="PRAG"]', "PRAG = <b>1.5</b> în cod", String(sim.camp.PRAG) === "1.5"]];
  const pr = MD.PRAGURI[k], ok = sim.run && sim.fw && sim.fw.prag === pr, r = sim.fw && sim.accRez[sim.fw.prag];
  return [...giGap(1), [giS, "Opriți simularea (■) pentru a schimba PRAG", !sim.run || ok], ['#tk-cod [data-cf="PRAG"]', `Setați în cod <b>PRAG = ${pr}</b>`, ok || String(sim.camp.PRAG) === String(pr)],
    giAlim(), [giS, "Apăsați <b>▶ Pornește simularea</b>", ok], giPwm(20, ok && (Math.round(sim.d * 100) === 20 || !!sim.acc || !!r)),
    ["#tk-serial", "Așteptați turația constantă", ok && (stabil() || !!sim.acc || !!r)],
    [[giA("[data-acc2]"), giPm("[data-acc]")], "Apăsați <b>⚡ Accelerare bruscă</b>", !!(ok && (r || sim.acc))],
    ["#tk-serial", "Așteptați ≈ 2,5 s rezultatul pe monitorul serial (Tgol/Ti minim)", !!(ok && r)],
    [giR(0), `Apăsați <b>„● Tgol/Ti minim, sincronizarea → Tabelul 6.3”</b> (PRAG = ${pr})`, false]];
};

const VEDERI = { tot: [[0.0, 0.62, 0.86], [0.0, 0.05, -0.02]], disc: [[-0.3, 0.3, 0.42], [-0.32, 0.1, -0.06]], osc: [[0.12, 0.3, 0.5], [0.12, 0.1, -0.16]], mega: [[0.2, 0.26, 0.36], [0.2, 0.0, 0.12]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl && p.ctl() ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată în montajul 3D</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => { Cadru.arataTab("anim"); setTimeout(() => vedere3d(PASI[+b.dataset.vezi].v3), 600); }));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-pwm2]").forEach(b => b.addEventListener("click", () => comanda("p" + b.dataset.pwm2)));
  $$("#pasi [data-acc2]").forEach(b => b.addEventListener("click", () => comanda("a")));
  $$("#pasi [data-tah2]").forEach(b => b.addEventListener("click", masoaraTah));
  $$("#pasi [data-tdv]").forEach(b => b.addEventListener("click", () => { sim.osc.tdiv = +b.dataset.tdv; oscCtl(); achizitie(); oscAfis(); }));
  $$("#pasi [data-obs]").forEach(b => b.addEventListener("click", porneteObservare));
  ghidPasi(PASI, alegePas); ghidIndicii(PASI, () => pasActiv);
  alegePas(0, false);
}
function alegePas(i, zoom) {
  if (i < 0 || i >= PASI.length) return;
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $("#tk-pas-banda").innerHTML = p.banda;
  actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  if (sim.osc.trig === "gol" && golInFereastra() && sim.osc.ch[1].s === "tVR") sim.golVazut = true;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ editorul și simularea */
const PROG = { titlu: "roata_60_2" };
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
function cod() {
  return `${K_("#include")} ${S_("&lt;Adafruit_SSD1306.h&gt;")}          ${C_("// OLED 128×64, I²C 0x3C")}
${K_("const")} ${K_("float")} PRAG = ${sel("PRAG", [["1.2", "1.2"], ["1.5", "1.5"], ["2.0", "2.0"], ["2.5", "2.5"], ["2.9", "2.9"]])};               ${C_("// golul: Ti > PRAG·Ti−1 (6.3)")}
${K_("const")} ${K_("uint8_t")} PWM_MAX = ${N_("179")};                ${C_("// 70 % ≈ 1500 rot/min (NSSM)")}
${K_("volatile")} ${K_("uint16_t")} tPrev = ${N_("0")}, Ti = ${N_("0")}, Tprev = ${N_("0")}; ${K_("volatile")} ${K_("uint8_t")} k = ${N_("0")}; ${K_("volatile")} ${K_("bool")} sync = ${K_("false")};
${K_("volatile")} ${K_("uint16_t")} err = ${N_("0")};

ISR(TIMER4_CAPT_vect) {                       ${C_("// captură pe ICP4 (pinul 49), front crescător")}
  ${K_("uint16_t")} t = ICR4; Ti = t - tPrev; tPrev = t;   ${C_("// aritmetică pe 16 biți (depășirea se compensează)")}
  ${K_("if")} (Tprev &amp;&amp; Ti &gt; PRAG * Tprev) { ${K_("if")} (sync &amp;&amp; k != ${N_("57")}) err++; k = ${N_("0")}; sync = ${K_("true")}; }  ${C_("// gol")}
  ${K_("else")} { k++; ${K_("if")} (k &gt; ${N_("57")}) { ${K_("if")} (sync) err++; sync = ${K_("false")}; k = ${N_("0")}; } }
  Tprev = Ti;
}
${K_("void")} setup() {
  Serial.begin(${N_("115200")}); oled.begin(SSD1306_SWITCHCAPVCC, ${N_("0x3C")});
  pinMode(${N_("5")}, OUTPUT); pinMode(${N_("6")}, OUTPUT); pinMode(${N_("7")}, OUTPUT); digitalWrite(${N_("6")}, HIGH); digitalWrite(${N_("7")}, LOW);
  TCCR4A = ${N_("0")}; TCCR4B = _BV(ICES4) | ${sel("P", [["8", "_BV(CS41)"], ["64", "_BV(CS41) | _BV(CS40)"]])};  ${C_("// P = 8 → 0,5 µs; P = 64 → 4 µs")}
  TIMSK4 = _BV(ICIE4);
}
${K_("void")} loop() {
  comenziSerial();                            ${C_("// pNN = PWM NN %, a = accelerare bruscă")}
  ${K_("float")} ti = mediaTi(${N_("20")}) * TICK;              ${C_("// s, media pe 20 de dinți")}
  ${K_("float")} n = ${N_("60.0")} / (${N_("60")} * ti);                  ${C_("// rot/min (6.2)")}
  ${K_("float")} theta = THETA_REF + ${N_("6.0")} * k;          ${C_("// °RAC (6.4)")}
  afiseaza(n, ti, k, theta, sync, err); delay(${N_("500")});
}`;
}
function afiseazaCod() {
  $("#tk-cod").innerHTML = cod().split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value; }); });
  $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  sim.fw = { prag: Number(sim.camp.PRAG), P: Number(sim.camp.P) }; sim.run = true; pornesteProgram();
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.pr = null; sim.d = 0; sim.tD = sim.tS; sim.acc = null; sim.obs = null;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} (PRAG = ${sim.fw.prag}, P = ${sim.fw.P})` : "—"; }

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaMAM6(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date || {}, { num }), F = Number.isFinite, cel = { t61: {} };
  o.reg.forEach((x, i) => { cel.t61["r" + (i + 1)] = { nf: F(x.nf) ? fx(x.nf, 1) : "", nti: F(x.nti) ? fx(x.nti, 1) : "", ab: F(x.ab) ? fx(x.ab, 2) : "", eps: F(x.eps) ? fx(x.eps, 3) : "" }; });
  const rgs = o.reg.map(x => x.rg).filter(F), gp = MD.GAPS.map(g => { const r = t.t62[MD.cheieG(g)]; return [g, num(r.vpp), r.sync]; }).filter(x => F(x[1]));
  const rez = [
    ["Turația din frecvență (6.1)", o.reg.map(x => F(x.nf) ? fx(x.nf, 1) : "").filter(Boolean).join(" · ") || "—"],
    ["Abaterea medie față de tahometru", F(o.abMed) ? `<span style="color:var(--accent)">${fx(o.abMed, 2)} %</span>` : "—"],
    ["Raportul Tgol/Ti", rgs.length ? rgs.map(v => fx(v, 3)).join(" · ") : "—"],
    ["Eroarea de rezoluție (6.5), P = 8", o.reg.filter(x => F(x.eps)).map(x => fx(x.eps, 3) + " %").join(" · ") || "—"],
    ["Întrefierul maxim cu sincronizare stabilă", F(o.gMax) ? `<span style="color:var(--accent)">${fx(o.gMax, 1)} mm</span>` : "—"]
  ];
  const verdicte = [];
  if (F(o.abMed)) verdicte.push(o.abMed < 2 ? { tip: "ok", text: `Turația calculată din perioadă coincide cu tahometrul în limita a ${fx(o.abMed, 2)} % (< 1…2 %).${o.abMed > 0.15 ? " Abaterea sistematică vine din rezonatorul ceramic de 16 MHz (±0,5 %): timerul numără cu frecvența lui reală." : ""}` } : { tip: "atentie", text: `Abaterea de ${fx(o.abMed, 2)} % este mare: verificați stabilizarea turației și citirile.` });
  if (rgs.length) { const mi = Math.min(...rgs), ma = Math.max(...rgs); verdicte.push({ tip: mi > 2.7 && ma < 3.3 ? "ok" : "atentie", text: `Tgol/Ti = ${fx(mi, 2)}…${fx(ma, 2)} ≈ 3: golul (doi dinți lipsă) este recunoscut corect.` }); }
  const a1 = num(t.t63.p15.rmin), s1 = t.t63.p15.sync, s2 = t.t63.p29.sync;
  if (F(a1)) verdicte.push({ tip: "ok", text: `La accelerarea bruscă raportul a scăzut la ${fx(a1, 2)}: pragul 1,5 ${s1 === "da" ? "păstrează" : "nu păstrează"} sincronizarea${s2 ? `, pragul 2,9 ${s2 === "da" ? "o păstrează" : "o pierde"}` : ""}.` });
  return { celule: cel, rezultate: rez, verdicte, titluGrafic: "Amplitudinea semnalului inductiv în funcție de întrefier (la ≈ 500 rot/min)",
    grafic: { xmin: 0, xmax: 3.5, ymin: 0, ymax: Math.max(6, ...gp.map(x => x[1] * 1.15)), xlab: "întrefier [mm]", ylab: "Vpp [V]", serii: [{ tip: "linie", pts: gp.map(x => [x[0], x[1]]), culoare: 0 }, { tip: "pct", pts: gp.filter(x => x[2] === "da").map(x => [x[0], x[1]]), culoare: 2, r: 5 }, { tip: "pct", pts: gp.filter(x => x[2] === "nu").map(x => [x[0], x[1]]), culoare: 1, r: 5 }] },
    legenda: [["Vpp măsurat", "var(--serie-0)"], ["sincronizare stabilă", "var(--serie-2)", "pct"], ["sincronizare instabilă", "var(--serie-1)", "pct"]], principal: { eticheta: "abaterea medie n [%]", valoare: F(o.abMed) ? +o.abMed.toFixed(3) : null } };
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Discul dințat rotit de motor se acționează numai cu capacul de protecție din plexiglas montat; nu se introduc mâini, scule sau cabluri sub capac.</li>
<li>Butonul de oprire de urgență se verifică înainte de pornirea motorului; turația se crește progresiv, fără a depăși 1500 rot/min (PWM ≤ 70 % din program).</li>
<li>Distanța (întrefierul) senzorului se reglează numai cu motorul oprit și alimentarea de 12 V deconectată.</li>
<li>Senzorii inductivi pot genera zeci de volți la turație mare: semnalul lor nu se leagă direct la microcontroler, ci prin circuitul de formare al standului.</li>
<li>Părul lung se strânge; nu se poartă fulare sau brățări lângă discul în rotație.</li></ul></div>
<h2>6.1. Scopul lucrării</h2>
<p>Achiziția semnalului senzorului de turație montat în fața unei roți cu 60 − 2 dinți, măsurarea perioadei dintre dinți prin captura de intrare a timerului, detectarea golului de referință, calculul turației și al unghiului arborelui cotit – funcția de sincronizare a oricărei unități de control a motorului.</p>
<h2>6.2. Noțiuni teoretice</h2>
<p>Roata de referință a arborelui cotit are 60 de pași de 6°, din care lipsesc doi dinți; golul marchează o poziție fixă (de regulă cu 84…120° înaintea PMI al cilindrului 1). Senzorul poate fi inductiv (tensiune alternativă, amplitudine crescătoare cu turația) sau activ (Hall / magnetorezistiv, semnal dreptunghiular). După formare, microcontrolerul primește un tren de impulsuri (Fig. 6.1).</p>
<div class="ec"><span>f = z · n / 60 &nbsp; [Hz]</span><span class="nr">(6.1)</span></div>
<div class="ec"><span>n = 60 / (z · T<sub>i</sub>) &nbsp; [rot/min], cu z = 60 pași și T<sub>i</sub> în s</span><span class="nr">(6.2)</span></div>
<p>Captura de intrare memorează valoarea timerului la fiecare front, independent de program; diferența dintre două capturi este perioada T<sub>i</sub>. Golul se recunoaște prin raportul perioadelor: în gol perioada este de trei ori mai mare, deci condiția T<sub>i</sub> &gt; 1,5 · T<sub>i−1</sub> este sigură și la accelerare. După recunoașterea golului, unghiul se obține numărând dinții:</p>
<div class="ec"><span>T<sub>i</sub> / T<sub>i−1</sub> &gt; 1,5 &nbsp; ⇒ &nbsp; gol</span><span class="nr">(6.3)</span></div>
<div class="ec"><span>θ = θ<sub>ref</sub> + 6 · k &nbsp; [°RAC]</span><span class="nr">(6.4)</span></div>
<div class="ec"><span>ε<sub>n</sub> = t<sub>tick</sub> / T<sub>i</sub> · 100 &nbsp; [%]</span><span class="nr">(6.5)</span></div>
<figure>${fig61()}<figcaption>Fig. 6.1. Semnalul roții 60 − 2 și perioadele dintre dinți, cu detectarea golului</figcaption></figure>
<pre class="cod">volatile uint16_t tPrev = 0, Ti = 0, Tprev = 0; volatile uint8_t k = 0; volatile bool sync = false;
ISR(TIMER4_CAPT_vect) {               // captură pe ICP4 (pinul 49, Mega)
  uint16_t t = ICR4; Ti = t - tPrev; tPrev = t;
  if (Tprev &amp;&amp; Ti &gt; (Tprev + Tprev / 2)) { k = 0; sync = true; } // gol
  else k++;
  Tprev = Ti;
}
void setup() { TCCR4A = 0; TCCR4B = _BV(ICES4) | _BV(CS41); TIMSK4 = _BV(ICIE4); } // P = 8 → 0,5 µs
void loop() { float n = 60.0 / (60 * Ti * 0.5e-6); float theta = 6.0 * k; }</pre>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Programul din simulator</b> are, în plus față de codul din îndrumar, pragul golului ca parametru (PRAG), verificarea numărului de dinți dintre două goluri (58) cu contorul de erori de sincronizare și media perioadei pe 20 de dinți pentru afișare; turația și Ti afișate exclud perioada golului.</li>
<li><b>Depășirea timerului.</b> Cu P = 8 timerul de 16 biți se umple în 65 536 · 0,5 µs = 32,8 ms. Diferența „t − tPrev” pe 16 biți compensează o singură depășire, deci golul (3 · T<sub>i</sub>) se măsoară corect numai dacă T<sub>gol</sub> &lt; 32,8 ms, adică n &gt; ≈ 92 rot/min. Pentru turații de pornire mai mici se folosește P = 64 (4 µs, ε<sub>n</sub> de 8 ori mai mare).</li>
<li><b>Abaterea față de tahometru.</b> Placa Mega folosește un rezonator ceramic de 16 MHz (±0,5 %): timerul numără cu frecvența reală, deci turația calculată are o abatere sistematică de ordinul a 0,1…0,4 %, aceeași la toate regimurile (verificați în Tabelul 6.1). Osciloscopul are propria bază de timp, precisă.</li>
<li><b>Senzorul inductiv și întrefierul.</b> Amplitudinea crește proporțional cu turația și scade aproximativ exponențial cu întrefierul. Când vârful semnalului se apropie de pragul circuitului de formare (cu zgomotul suprapus), unii dinți nu mai dau impulsuri: un dinte lipsă dublează perioada și este luat drept gol, iar programul pierde sincronizarea. Tabelul 6.2 se completează la aceeași turație (≈ 500 rot/min), cu o observare de 5 s a erorilor de sincronizare.</li>
<li><b>Tabelul 6.3 (nou).</b> La accelerarea bruscă perioadele scad în timpul golului, iar raportul T<sub>gol</sub>/T<sub>i</sub> coboară sub 3 (la discul ușor al standului până la ≈ 2,5…2,8). Un prag apropiat de 3 (de ex. 2,9) pierde golul; un prag prea mic (1,2) confundă un dinte lipsă (zgomot, întrefier mare) cu golul. Pragul 1,5 este compromisul uzual.</li>
<li><b>Aparatura.</b> Osciloscopul se declanșează pe front (pentru frecvență și perioadă) sau pe lățimea impulsului mai mare de 1,5 · T (golul) – funcția „Pulse width” a osciloscoapelor Rigol / Hantek.</li></ul></div>
<h2>6.3. Aparatură și echipamente</h2>
<ul><li>Disc cu 60 − 2 dinți (din dezmembrări) antrenat de un motor de c.c. de 12 V cu reductor, comandat PWM prin driver L298N; capac de protecție și buton de oprire de urgență</li>
<li>Senzor de turație auto (inductiv, cu circuit de formare LM393 cu histerezis și diode Zener) pe suport reglabil, lere 0,5…3 mm</li>
<li>Standul de lucru cu Arduino Mega (captură pe timer 4, pinul 49) și afișaj OLED; osciloscop; tahometru optic (referință)</li></ul>
<h2>6.4. Modul de lucru (în simulator)</h2>
<ol><li>Capacul montat, oprirea de urgență verificată; cu motorul oprit și 12 V deconectat se reglează întrefierul la ≈ 1 mm.</li>
<li>Motorul la turație mică; cu osciloscopul se vizualizează semnalul senzorului și cel format, se identifică golul și se compară perioada unui dinte cu cea a golului.</li>
<li>Programul de captură afișează T<sub>i</sub>, turația calculată, indicele dintelui k și unghiul.</li>
<li>Pentru 4 turații se compară turația calculată cu tahometrul optic și cu frecvența măsurată pe osciloscop (Tabelul 6.1).</li>
<li>Se crește întrefierul în trepte de 0,5 mm până când detectarea golului devine instabilă (Tabelul 6.2).</li>
<li>Se provoacă o accelerare bruscă și se verifică dacă sincronizarea se păstrează, cu pragul 1,5 și cu 2,9 (Tabelul 6.3).</li></ol>
<h2>6.7. Interpretarea rezultatelor</h2>
<ul><li>Turația calculată din perioadă trebuie să coincidă cu cea a tahometrului în limita a 1…2 %; abaterile mari indică pierderea unor impulsuri (zgomot, întrefier mare).</li>
<li>Raportul T<sub>gol</sub>/T<sub>i</sub> ≈ 3 confirmă detectarea corectă a golului; la accelerare raportul scade, dar rămâne peste pragul de 1,5.</li>
<li>Întrefierul mare reduce amplitudinea semnalului; la senzorii inductivi efectul apare mai întâi la turație mică (pornire).</li></ul>
<h2>6.8. Relevanță practică</h2>
<p>Sincronizarea pe roata dințată stă la baza comenzii injecției și aprinderii, a detectării rateurilor prin variația vitezei unghiulare (OBD) și a controlului motoarelor electrice. Algoritmii de decodare și de detectare a rateurilor sunt teme curente de cercetare și de proiectare a ECU. Verificarea semnalului real pe motor se face la Diagnosticarea autovehiculelor, lucrarea 2.</p>`;
function fig61() {
  const X0 = 40, W = 560, x = i => X0 + i * W / 22;
  let s = `<svg viewBox="0 0 640 230" class="fig-svg" role="img" aria-label="Fig. 6.1"><g font-size="10" fill="currentColor">`;
  // semnalul inductiv
  let d = ""; for (let i = 0; i <= 440; i++) { const a = i / 440 * 22 * 6 + 54 * 6, v = MODELE["mam1-l6"].vVR(a, 1.6); d += `${i ? "L" : "M"}${(X0 + i / 440 * W).toFixed(1)},${(52 - v * 22).toFixed(1)}`; }
  s += `<text x="${X0}" y="16">senzorul inductiv (TP VR)</text><path d="${d}" fill="none" stroke="#1f5f9e" stroke-width="1.6"/>`;
  // semnalul format
  let q = ""; const ed = []; for (let k = 0; k < 22; k++) { const kk = (54 + k) % 60; if (kk >= 58) continue; ed.push(k); }
  q = `M${X0},150`; ed.forEach(k => { const a = x(k + 0.25), b = x(k + 0.75); q += ` L${a.toFixed(1)},150 L${a.toFixed(1)},110 L${b.toFixed(1)},110 L${b.toFixed(1)},150`; }); q += ` L${X0 + W},150`;
  s += `<text x="${X0}" y="100">semnalul format (D49)</text><path d="${q}" fill="none" stroke="#c0492b" stroke-width="1.8"/>`;
  const iG = ed.indexOf(6), a0 = x(3.25), a1 = x(4.25), g0 = x(3.25 + 0), g1 = x(6.25);
  s += `<line x1="${x(2.25)}" y1="168" x2="${x(3.25)}" y2="168" stroke="currentColor"/><text x="${x(2.75)}" y="182" text-anchor="middle">T<tspan font-size="7">i−1</tspan></text>
    <line x1="${x(3.25)}" y1="196" x2="${x(6.25)}" y2="196" stroke="#c0492b"/><text x="${x(4.75)}" y="210" text-anchor="middle" fill="#c0492b">T<tspan font-size="7">gol</tspan> ≈ 3·T<tspan font-size="7">i−1</tspan> → gol, k = 0</text>
    <text x="${x(7)}" y="182">k = 1, 2, 3 …</text><text x="${x(12)}" y="224">fiecare pas = 6°; θ = θref + 6·k</text>`;
  void iG; void a0; void a1; void g0; void g1;
  return s + `</g></svg>`;
}
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>La n = 900 rot/min un dinte durează 1,111 ms, iar timerul are rezoluția de 0,5 µs:</p>
<div class="ec"><span>f = 60 · 900 / 60 = 900 Hz</span><span class="nr">(6.6)</span></div>
<div class="ec"><span>n = 60 / (60 · 1,111 · 10<sup>−3</sup>) = 900 rot/min</span><span class="nr">(6.7)</span></div>
<div class="ec"><span>T<sub>gol</sub> = 3 · 1,111 = 3,33 ms</span><span class="nr">(6.8)</span></div>
<div class="ec"><span>la 6000 rot/min: T<sub>i</sub> = 0,167 ms</span><span class="nr">(6.9)</span></div>
<div class="ec"><span>ε<sub>n</sub> = 0,5 · 10<sup>−3</sup> / 0,167 · 100 = 0,3 %</span><span class="nr">(6.10)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Calculați frecvența semnalului roții 60 − 2 la 4500 rot/min și perioada unui dinte.</p><details class="sol"><summary>Rezolvare</summary><p>f = 60·4500/60 = 4500 Hz; T = 1/4500 = 0,222 ms (golul 0,667 ms).</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Cu P = 8 (0,5 µs), la ce turație minimă se măsoară corect golul, dacă timerul are 16 biți?</p><details class="sol"><summary>Rezolvare</summary><p>T<sub>gol</sub> &lt; 65 536 · 0,5 µs = 32,77 ms ⇒ T<sub>i</sub> &lt; 10,92 ms ⇒ n &gt; 60/(60 · 0,01092) ≈ 92 rot/min.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Programul numără N = 2220 de tick-uri de 0,5 µs pentru un dinte. Ce turație afișează? Dacă rezonatorul are +0,3 %, care este turația reală?</p><details class="sol"><summary>Rezolvare</summary><p>T<sub>i</sub> = 2220 · 0,5 = 1,110 ms ⇒ n = 60/(60 · 1,110·10<sup>−3</sup>) = 900,9 rot/min. Timerul numără mai repede cu 0,3 %, deci T<sub>i</sub> reală = 1,110/1,003 = 1,1067 ms ⇒ n<sub>real</sub> = 903,6 rot/min (programul indică cu 0,3 % mai puțin).</p></details></div>`;
}
const INTREBARI = [
  ["De ce roata de referință are doi dinți lipsă?", "Golul dă o poziție unică pe rotație (referința unghiulară pentru sincronizarea injecției și aprinderii); doi dinți lipsă produc o perioadă de 3 ori mai mare, ușor de recunoscut chiar la accelerare, păstrând în rest semnalul regulat pentru măsurarea turației. Un singur dinte lipsă (perioadă dublă) s-ar confunda mai ușor cu un impuls pierdut."],
  ["Ce prag de detectare a golului ați alege și de ce nu 2,9?", "Un prag de ≈ 1,5…2: la accelerare raportul T<sub>gol</sub>/T<sub>i</sub> scade sub 3 (perioadele se micșorează în timpul golului), iar cu 2,9 golul nu ar mai fi recunoscut (Tabelul 6.3). Un prag prea mic (sub ≈ 1,3) ar confunda variațiile normale și dinții pierduți cu golul."],
  ["Calculați frecvența semnalului la 4500 rot/min.", "f = z·n/60 = 60·4500/60 = 4500 Hz."],
  ["Ce avantaj are captura de intrare față de citirea timpului cu micros() în program?", "Valoarea timerului este memorată de hardware în momentul frontului, independent de întârzierea întreruperii sau de alte rutine; micros() citit în ISR sau în loop are rezoluție de 4 µs și o întârziere variabilă (jitter) de câțiva µs până la zeci de µs, care la turație mare devine o eroare importantă."],
  ["Cum se determină sensul de rotație cu un singur senzor?", "Cu un senzor obișnuit nu se poate (semnalul este simetric). Se folosesc senzori activi cu ieșire codificată în lățimea impulsului (de ex. impulsuri de 45 µs într-un sens și 90 µs în celălalt), doi senzori în cuadratură, sau un model de roată asimetric (goluri / dinți de lățimi diferite) citit după ordinea perioadelor."]
];
const TEST = [
  { q: "La 900 rot/min, roata 60 − 2 dă impulsuri cu frecvența:", o: ["15 Hz", "900 Hz", "54 kHz", "60 Hz"], c: 1, e: "f = z·n/60 = 60·900/60." },
  { q: "Perioada golului este aproximativ:", o: ["egală cu a unui dinte", "dublă", "triplă", "de 60 de ori mai mare"], c: 2, e: "Lipsesc doi dinți: trec trei pași de 6° până la următorul front." },
  { q: "Captura de intrare memorează:", o: ["numărul de dinți", "valoarea timerului în momentul frontului", "tensiunea senzorului", "turația"], c: 1, e: "Registrul ICR4 primește valoarea TCNT4 la front, independent de program." },
  { q: "Cu P = 8 la 16 MHz, rezoluția timerului este:", o: ["62,5 ns", "0,5 µs", "4 µs", "1 ms"], c: 1, e: "8/16 MHz = 0,5 µs." },
  { q: "La creșterea întrefierului, semnalul senzorului inductiv:", o: ["crește", "scade în amplitudine", "își dublează frecvența", "nu se modifică"], c: 1, e: "Fluxul variabil prin bobină scade cu distanța." },
  { q: "Reglarea întrefierului se face:", o: ["cu motorul pornit, ca să se vadă semnalul", "cu motorul oprit și 12 V deconectat", "cu capacul demontat și motorul la turație mică", "oricând"], c: 1, e: "NSSM." }
];
const CSS = `<style>
.tk { padding:0 !important; overflow:hidden; background:#fff; color:#222; }
.tk-bara { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; padding:.45rem .6rem; background:#fff; border-bottom:1px solid #e3e3e3; }
.tk-logo { font:600 .9rem system-ui,sans-serif; color:#333; margin-right:auto; } .tk-logo b { color:#1477d1; }
.tk-bara button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.32rem .7rem; font:600 .82rem system-ui,sans-serif; cursor:pointer; }
.tk-bara button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; }
.tk-bara .tk-start { background:#2e9e44; border-color:#2e9e44; color:#fff; } .tk-bara .tk-start.ruleaza { background:#d6452f; border-color:#d6452f; }
.tk-plansa { position:relative; background:#eef1f3; border-bottom:1px solid #e3e3e3; min-height:120px; }
#tk-svg { width:100%; height:auto; aspect-ratio:1300/814; display:block; user-select:none; font-family:system-ui,sans-serif; background:#fbfbfb; }
#tk-svg .tk-comp { cursor:pointer; } #tk-svg .tk-comp:hover { filter:brightness(1.06) drop-shadow(0 0 3px rgba(20,119,209,.6)); }
.tk-osc, .tk-pompa { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; padding:.35rem .6rem; font:12.5px system-ui,sans-serif; color:#333; border-bottom:1px solid #eee; }
.tk-osc button, .tk-pompa button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.2rem .55rem; font:600 12px system-ui; cursor:pointer; }
.tk-osc button.activ, .tk-pompa button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; } .tk-pompa button.slab { background:#fff3e0; border-color:#ff9800; color:#8a4b00; } .tk-pompa button.primar { background:#c62828; border-color:#c62828; color:#fff; }
.tk-osc select { font:12px system-ui; max-width:15rem; } .osc-v { font:700 12px ui-monospace,monospace; background:#0f1a12; color:#7dff8a; padding:.1rem .4rem; border-radius:3px; }
.tk-pompa .sep { width:1px; height:1.2rem; background:#ddd; margin:0 .3rem; }
.tk-afis { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:.3rem .8rem; padding:.4rem .6rem; font:12px system-ui,sans-serif; border-bottom:1px solid #eee; } .tk-afis div { display:flex; justify-content:space-between; gap:.5rem; } .tk-afis span { color:#777; } .tk-afis b { font-family:ui-monospace,monospace; }
.tk-ajutor { margin:.3rem .6rem; font:11px system-ui,sans-serif; color:#888; }
.tk-insp { position:absolute; right:.6rem; top:.6rem; width:300px; background:#fff; border:1px solid #d8dde3; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.15); font:12.5px system-ui,sans-serif; color:#333; z-index:4; }
.tk-insp-t { display:flex; justify-content:space-between; align-items:center; padding:.5rem .6rem; font-weight:700; border-bottom:1px solid #eee; } .tk-insp-t button { border:0; background:none; cursor:pointer; color:#777; }
.tk-insp-r { display:flex; justify-content:space-between; gap:.6rem; padding:.3rem .6rem; } .tk-insp-r span { color:#777; } .tk-insp-r b { font-weight:600; text-align:right; }
.tk-jos { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); border-top:1px solid #e3e3e3; } .tk-jos:has(.tk-cod[hidden]) { grid-template-columns:1fr; }
.tk-cod { background:#fff; display:flex; flex-direction:column; min-width:0; } .tk-cod[hidden] { display:none; }
.tk-ser { border-left:1px solid #e3e3e3; display:flex; flex-direction:column; min-width:0; background:#fff; }
.tk-cod-sus { display:flex; gap:.4rem; padding:.4rem .5rem; border-bottom:1px solid #eee; align-items:center; font:12px system-ui,sans-serif; color:#555; }
#tk-cod { margin:0; padding:.5rem .3rem; overflow:auto; background:#fff; color:#1f1f1f; font:11.5px/1.5 ui-monospace,Consolas,"Courier New",monospace; white-space:pre; max-height:440px; }
.cd-ln { display:inline-block; width:2.2em; color:#a8a8a8; text-align:right; margin-right:.8em; user-select:none; }
.cd-k { color:#0b62b5; font-weight:600; } .cd-s { color:#b2502b; } .cd-c { color:#6a8759; font-style:italic; } .cd-n { color:#7a3fb0; }
.cd-f { background:#fff8d6; color:#5b3d00; border:1px solid #e0b84a; border-radius:3px; font:inherit; padding:0 .2rem; } .cd-f:disabled { background:#f1f1f1; color:#777; border-color:#ccc; }
.tk-blocat { background:#fff4e5; color:#8a5300; font:12px system-ui,sans-serif; padding:.35rem .6rem; border-bottom:1px solid #f1d7a8; }
#tk-serial { margin:0; flex:1 1 auto; min-height:120px; max-height:200px; overflow:auto; background:#fff; color:#222; padding:.4rem .6rem; font:11.5px/1.4 ui-monospace,Consolas,monospace; }
#tk-plot { width:100%; height:170px; display:block; border-top:1px solid #eee; }
.tk-ser-in { display:flex; gap:.3rem; padding:.35rem .5rem; border-top:1px solid #eee; } .tk-ser-in input { flex:1; font:12px ui-monospace,monospace; padding:.2rem .4rem; border:1px solid #cfd4da; border-radius:4px; } .tk-ser-in button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.2rem .6rem; font:12px system-ui; cursor:pointer; color:#333; }
.fw { font-size:.8rem; } .fw b { font-family:ui-monospace,monospace; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; }
.fig-svg { width:100%; max-width:680px; height:auto; color:var(--text); }
.tk-pas-banda { position:absolute; left:.6rem; bottom:.5rem; max-width:min(560px,62%); background:rgba(20,119,209,.93); color:#fff; border-radius:6px; padding:.4rem .6rem; font:12.5px/1.35 system-ui,sans-serif; box-shadow:0 3px 10px rgba(0,0,0,.2); pointer-events:none; z-index:2; }
.tk-pas-banda:empty { display:none; }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; }
.pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas:not(.activ) .pas-corp { display:none; }
.pas-but { display:flex; flex-direction:column; gap:.35rem; }
.rand-mic { display:flex; flex-wrap:wrap; gap:.3rem; margin:.25rem 0; } .rand-mic button { padding:.25rem .55rem; font-size:.8rem; }
.sim-grila:fullscreen .sim-scena.tk, .sim-grila.ecran-plin .sim-scena.tk { display:block; }
@media (max-width:900px){ .tk-jos { grid-template-columns:1fr; } .tk-ser { border-left:0; border-top:1px solid #e3e3e3; } .tk-pas-banda { position:static; max-width:none; border-radius:0; } }
</style>`;
const SYNC = ["da", "nu"];
Cadru.porneste({
  disc: "MAM1", nr: 6, cod: "mam1-l6",
  titlu: "Senzori de turație și poziție: decodarea roții 60−2 prin captură de intrare",
  scurt: "Roata 60−2: captura de intrare",
  subtitlu: "Laborator virtual – discul 60 − 2 antrenat de motorul de 12 V, senzorul inductiv cu circuit de formare, captura pe timerul 4 al Arduino Mega, osciloscopul și tahometrul optic: turația, golul de referință, influența întrefierului și accelerarea bruscă",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261027); },
  date: [{ k: "z", et: "z (pași)", v: 60, fix: true }, { k: "tick", et: "t<sub>tick</sub> (P = 8) [µs]", v: 0.5, fix: true }, { k: "nref", et: "n pentru Tabelul 6.2 [rot/min]", v: MD.NREF, fix: true }],
  tabele: [
    { id: "t61", titlu: "Tabelul 6.1. Turația calculată", antetRand: "Regim", nota: "f de pe osciloscop (CH1 pe D49, prima perioadă după declanșare); Ti, n și Tgol/Ti din program (OLED / monitorul serial); n tahometru – referința. n din f = 60·f/z; n din Ti = 60/(z·Ti); abaterea = (n − n<sub>tah</sub>)/n<sub>tah</sub>; ε<sub>n</sub> = t<sub>tick</sub>/Ti.",
      randuri: [1, 2, 3, 4].map(i => ({ k: "r" + i, et: String(i) })),
      coloane: [{ k: "pwm", t: "PWM [%]", intrare: true }, { k: "f", t: "f osciloscop [Hz]", intrare: true }, { k: "ti", t: "Ti [ms]", intrare: true }, { k: "n", t: "n calculat [rot/min]", intrare: true }, { k: "nt", t: "n tahometru [rot/min]", intrare: true },
        { k: "nf", t: "n din f [rot/min]" }, { k: "nti", t: "n din Ti [rot/min]" }, { k: "ab", t: "Abatere [%]" }, { k: "rg", t: "Tgol / Ti", intrare: true }, { k: "eps", t: "ε<sub>n</sub> [%]" }] },
    { id: "t62", titlu: "Tabelul 6.2. Influența întrefierului", antetRand: "Întrefier [mm]", nota: `La ≈ ${MD.NREF} rot/min. Vpp pe TP VR (CH2), înainte de formare; sincronizarea observată ${MD.TOBS} s (erorile = goluri false sau goluri pierdute).`,
      randuri: MD.GAPS.map(g => ({ k: MD.cheieG(g), et: fmt(g, 1) })),
      coloane: [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "vpp", t: "Amplitudine Vpp [V]", intrare: true }, { k: "forma", t: "Forma semnalului", intrare: true, tip: "select", optiuni: MD.FORME }, { k: "err", t: `Erori în ${MD.TOBS} s`, intrare: true }, { k: "sync", t: "Sincronizare stabilă (da/nu)", intrare: true, tip: "select", optiuni: SYNC }] },
    { id: "t63", titlu: "Tabelul 6.3. Accelerarea bruscă (PWM 20…25 % → 70 %)", antetRand: "Pragul golului", nota: "Tgol/Ti minim din program, în primele 2,5 s ale accelerării; sincronizarea păstrată = fără erori și SYNC la final.",
      randuri: [{ k: "p15", et: "PRAG = 1,5" }, { k: "p29", et: "PRAG = 2,9" }],
      coloane: [{ k: "rmin", t: "Tgol/Ti minim", intrare: true }, { k: "sync", t: "Sincronizare păstrată (da/nu)", intrare: true, tip: "select", optiuni: SYNC }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaMAM6,
  intrebari() {
    return [
      { id: "q1", u: "Hz", text: "Frecvența semnalului roții 60 − 2 la 4500 rot/min (Întrebarea 3):", textSimplu: "f la 4500 rot/min" },
      { id: "q2", u: "%", text: "Abaterea medie (în valoare absolută) a turației calculate față de tahometru (Tabelul 6.1):", textSimplu: "abaterea medie" },
      { id: "q3", u: "mm", text: "Întrefierul maxim la care sincronizarea a rămas stabilă (Tabelul 6.2):", textSimplu: "întrefierul maxim stabil" },
      { id: "q4", u: "%", text: "Eroarea de rezoluție ε<sub>n</sub> la 6000 rot/min cu t<sub>tick</sub> = 0,5 µs (6.10):", textSimplu: "ε la 6000 rot/min" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = [1, 2, 3, 4].filter(i => t.t61["r" + i].n !== "").length; if (a < 4) l.push(`Tabelul 6.1: ${a}/4 regimuri`);
    const b = MD.GAPS.filter(g => t.t62[MD.cheieG(g)].vpp !== "").length; if (b < 6) l.push(`Tabelul 6.2: ${b}/6 întrefieri`);
    const c = Object.keys(MD.PRAGURI).filter(k => t.t63[k].rmin !== "").length; if (c < 2) l.push(`Tabelul 6.3: ${c}/2 praguri`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t61.r1, { pwm: "45", f: "900.00", ti: "1.1110", n: "900.1", nt: "900.0", rg: "2.998" }); Object.assign(t.t62.g10, { n: "600", vpp: "3.050", forma: MD.FORME[0], err: "0", sync: "da" }); },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul la scară reală: discul 60 − 2 pe arborele reductorului motorului de 12 V, sub capacul de plexiglas, senzorul inductiv pe suportul reglabil, butonul de oprire de urgență, sursa de 12 V, driverul L298N, circuitul de formare, Arduino Mega cu OLED, osciloscopul cu cele două sonde, tahometrul optic și laptopul. Montajul urmărește simulatorul (discul se rotește cu turația reală, ecranele sunt cele din planșă); clic pe butonul de urgență, pe capac, pe sursă, pe tahometru și pe punctele de test ca pe planșă.</p>`,
    modul: "montaj3d.js?v=2", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, -14, 1300, 814], construieste: L => montaj3dL6(L), cam: [0.0, 0.62, 0.86], tinta: [0.0, 0.05, -0.02], laClic: k => laClic3d(k),
      vederi: { tot: [[0.0, 0.62, 0.86], [0.0, 0.05, -0.02], "Ansamblu"], disc: [[-0.3, 0.3, 0.42], [-0.32, 0.1, -0.06], "Discul și senzorul"], osc: [[0.12, 0.3, 0.5], [0.12, 0.1, -0.16], "Osciloscopul"], mega: [[0.2, 0.26, 0.36], [0.2, 0.0, 0.12], "Arduino Mega"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Senzorul de turație CKP pe motor",
    intro: `<p>Senzorul de turație și poziție a arborelui cotit (CKP) citește roata 60 − 2 de pe volantă sau de pe roata de curea; împreună cu senzorul de fază (CMP) de pe arborele cu came, ECU stabilește ordinea de injecție și aprindere. Selectați senzorul CKP în machetă: amplasarea, mufa și semnalul.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "ckp" })
  },
  atelierSenzori: { intro: `<p>Senzorul de turație CKP este preselectat: modelul 3D, mufa și verificările (rezistența bobinei la senzorul inductiv, semnalul la pornire pe osciloscop, întrefierul). Puteți alege și alți senzori din listă.</p>`, optiuni: { initial: "ckp" } },
  referat: {
    scop: "Achiziția semnalului roții 60 − 2 prin captura de intrare, detectarea golului de referință, calculul turației și al unghiului; influența întrefierului și a accelerării asupra sincronizării.",
    relatii: "f = z·n/60; &nbsp; n = 60/(z·T<sub>i</sub>); &nbsp; T<sub>i</sub>/T<sub>i−1</sub> &gt; 1,5 ⇒ gol; &nbsp; θ = θ<sub>ref</sub> + 6·k; &nbsp; ε<sub>n</sub> = t<sub>tick</sub>/T<sub>i</sub>.",
    varianta: () => "Exemplarul propriu al fiecărui student: caracteristica motorului (turația maximă, zona moartă, constanta de timp), ondulația turației, sensibilitatea senzorului inductiv și scăderea ei cu întrefierul, pragul și zgomotul circuitului de formare, abaterea rezonatorului de 16 MHz, eroarea tahometrului și unghiul golului.",
    indicatii: "Comparați turația din perioadă cu cea din frecvență și cu tahometrul (abaterea sistematică a rezonatorului), comentați raportul Tgol/Ti, scăderea amplitudinii cu întrefierul și pragul la care se pierde sincronizarea, efectul accelerării asupra raportului și alegerea pragului…"
  },
  subsol: "Modelul: motor de c.c. cu reductor (caracteristică liniară cu zonă moartă, răspuns de ordinul 1, ondulație pe rotație), disc 60 − 2, senzor inductiv cu amplitudinea ∝ n·e<sup>−(δ−0,5)/λ</sup>, comparator cu prag și zgomot (dinți pierduți sub prag), captură pe 16 biți cu rezonatorul abătut, tahometru optic. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      ${ghidSectiune()}
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Stand</b> · MAM I – Lucrarea 6</span>
        <button type="button" id="tk-fit" title="Închide fereastra de detalii">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div><div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-pompa" id="tk-pompa"></div>
      <div class="tk-osc" id="tk-osc"></div>
      <div class="tk-afis" id="afis"></div>
      <p class="tk-ajutor">Clic pe butonul de urgență, pe capac, pe sursă (12 V), pe tahometru · clic pe TP VR (CH2), pe D49 / TP OUT / D5 (CH1) · clic pe celelalte componente = detalii · PWM-ul îl dă programul (butoanele „PWM” sau comanda pNN pe monitorul serial). Montajul real în 3D este în fila „Montajul real (3D)”.</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – Arduino Mega 2560</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite (de ex. p40 sau a)" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div>
          <div class="tk-cod-sus"><b>Plotter serial – turația</b></div>
          <canvas id="tk-plot" aria-label="Plotterul serial: turația calculată"></canvas></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Programul și mesajele</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Lucrați în ordinea pașilor din chenarul de deasupra planșei. Valorile intră în tabele numai din aparate (osciloscop, tahometru) și din program.</p>
    </aside>
  </div>`,
    init(C) {
      afiseazaCod(); actualizeazaFw(); oscCtl(); actualizeaza();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => inspector(null));
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) comanda(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $$("#tk-svg [data-k]").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); laClic3d(g.dataset.k); }));
      C.mesaj("Urmați pașii din chenarul „Desfășurarea lucrării – pas cu pas”; începeți cu pregătirea standului (NSSM).", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.p1ok = false; sim.p3ok = false; sim.giCabVazut = false; Object.assign(sim, { serial: [], ist: [], edges: [], buf: [], n: 0, d: 0, alim: false, estop: false, obs: null, acc: null, accRez: {}, golVazut: false, syncVazut: false }); sim.tah = { act: false, t0: 0, val: null, d: -1 }; },
    cadru(dt, C, vizibil) {
      const acum = performance.now(); let rest = Math.min(dt || 0.016, 0.1);
      while (rest > 1e-9) { const d = Math.min(DT, rest); rest -= d; pasMecanic(d); }
      pasProgram(); pasTah(); pasObservare();
      if (!vizibil) { if (C.tabActiv === "anim" && acum - (this._t3 || 0) > 60) { this._t3 = acum; if (acum - (this._ta || 0) > 150) { this._ta = acum; if (sim.osc.ruleaza) achizitie(); planseAfis(); } sincron3d(); } return; }
      if (acum - (this._to || 0) > 150) { this._to = acum; if (sim.osc.ruleaza) achizitie(); afisaje(); planseAfis(); plotter(); sincron3d(); }
      else { const d = $("#disc6"); if (d) d.setAttribute("transform", `translate(${DC[0]} ${DC[1]}) rotate(${(-93 + (sim.phi % 360)).toFixed(2)})`); }
      if (acum - (this._ts || 0) > 400) { this._ts = acum; actualizeazaPasi(); panouDacaSchimbat();
        C.stare(1, sim.run ? "programul rulează" : "programul oprit", sim.run ? "inc" : ""); C.stare(2, `n ≈ ${fx(sim.n, 0)} rot/min · întrefier ${fx(sim.g, 1)} mm`); }
    },
    redeseneaza() { plotter(); },
    formule() {
      const r = [], v = sim.pr && sim.pr.last; if (!v || !Number.isFinite(v.ti)) return r;
      r.push(["Turația din perioadă (6.2)", `n = 60/(60 · ${fx(v.ti / 1000, 7)}) = <span class="rez">${fx(v.n, 1)} rot/min</span>`]);
      r.push(["Unghiul (6.4)", `θ = ${P().tref} + 6 · ${v.k} = <span class="rez">${v.th}°</span>`]);
      r.push(["Rezoluția (6.5)", `ε<sub>n</sub> = ${fx(sim.fw.P / 16, 2)} µs / ${fx(v.ti * 1000, 1)} µs = <span class="rez">${fx(sim.fw.P / 16 / (v.ti * 1000) * 100, 3)} %</span>`]);
      return r;
    }
  }
});
let _panouK = "";
function panouDacaSchimbat() { const k = [sim.capac, sim.estop, sim.alim, sim.g, Math.round(sim.d * 100), sim.run].join(); if (k !== _panouK) { _panouK = k; panou(); } }

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL6(L) {
  const { THREE, V3, mm, M } = L, R = 0xe53935, N = 0x222222;
  const mat = o => new THREE.MeshStandardMaterial(o);
  /* placa de bază din aluminiu, consola motorului, motorul cu reductor, cuplajul cu banda reflectorizantă */
  const DXc = -0.4, DZc = 0.0, DY = 0.115, RDisc = 0.075;
  const B = L.grup([DXc, 0, DZc - 0.03]);
  L.box(0.24, mm(6), 0.2, M.alu, B, 0, mm(3), -0.02, mm(1));
  L.box(0.05, DY + mm(20), mm(6), M.alu, B, 0, (DY + mm(20)) / 2, -0.035, mm(1));                               // consola
  const mot = L.cyl(mm(19), mm(19), mm(62), mat({ color: 0x3b3f45, roughness: 0.45, metalness: 0.5 }), B, 0, DY, -0.085, "z", 32); L.k_(mot, "motor", "Motor de c.c. 12 V cu reductor 1:30 (50…1500 rot/min)");
  L.box(mm(40), mm(40), mm(26), mat({ color: 0x8b9197, roughness: 0.4, metalness: 0.7 }), B, 0, DY, -0.048, mm(3));       // reductorul
  L.cyl(mm(4), mm(4), mm(40), M.crom, B, 0, DY, -0.015, "z", 16);
  const cup = L.cyl(mm(9), mm(9), mm(14), M.alu, B, 0, DY, -0.012, "z", 24); L.k_(cup, "tah", "Cuplajul rigid cu banda reflectorizantă (ținta tahometrului optic)");
  L.cyl(mm(9.2), mm(9.2), mm(5), mat({ color: 0xf5f5f5, roughness: 0.2 }), B, 0, DY, -0.012, "z", 24);
  /* discul 60 − 2 (extrudat cu dinții reali), rotit de motor */
  const sh = new THREE.Shape(), rr = RDisc - mm(5), N3 = 60;
  for (let k = 0; k < N3; k++) { const a0 = k * 6 * Math.PI / 180, a1 = (k * 6 + 3) * Math.PI / 180, a2 = (k + 1) * 6 * Math.PI / 180, dinte = k < 58;
    const P = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
    if (k === 0) sh.moveTo(...P(rr, a0));
    if (dinte) { sh.lineTo(...P(RDisc, a0 + 0.004)); sh.lineTo(...P(RDisc, a1 - 0.004)); sh.lineTo(...P(rr, a1)); }
    sh.lineTo(...P(rr, a2)); }
  const gaura = new THREE.Path(); gaura.absarc(0, 0, mm(4), 0, Math.PI * 2, true); sh.holes.push(gaura);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: mm(4), bevelEnabled: true, bevelThickness: mm(0.4), bevelSize: mm(0.3), bevelSegments: 1, curveSegments: 6 }); geo.translate(0, 0, -mm(2));
  const D = new THREE.Group(); D.position.set(DXc, DY, DZc); L.sc.add(D);
  const disc = L.mesh(geo, mat({ color: 0x8c9298, roughness: 0.35, metalness: 0.85 }), D); L.k_(disc, "disc", "Discul de reluctanță cu 60 − 2 dinți (din dezmembrări), Ø 150 mm");
  L.cyl(mm(22), mm(22), mm(9), M.otel, D, 0, 0, 0, "z", 32);
  const marc = L.box(mm(10), mm(3), mm(4.6), mat({ color: 0xffeb3b, roughness: 0.4 }), D, Math.cos(-0.105) * (RDisc - mm(9)), Math.sin(-0.105) * (RDisc - mm(9)), 0, mm(0.5)); marc.rotation.z = -0.105;
  /* senzorul inductiv pe suportul reglabil (deasupra discului) */
  const S = L.grup([DXc, 0, DZc]);
  L.box(mm(6), DY + RDisc + mm(60), mm(30), M.alu, S, mm(-92), (DY + RDisc + mm(60)) / 2, mm(-8), mm(1));
  L.box(mm(98), mm(8), mm(30), M.alu, S, mm(-46), DY + RDisc + mm(56), mm(-8), mm(1));
  const SZ = new THREE.Group(); S.add(SZ);
  const corpS = L.cyl(mm(9), mm(9), mm(38), mat({ color: 0x1f2226, roughness: 0.5 }), SZ, 0, 0, 0, "y", 24); L.k_(corpS, "senzor", "Senzorul inductiv (VR): bobină + magnet permanent; întrefierul reglat cu lera");
  L.cyl(mm(10.5), mm(10.5), mm(3), M.otel, SZ, 0, mm(4), 0, "y", 6); L.cyl(mm(6), mm(6), mm(3), M.cupru, SZ, 0, mm(-20), 0, "y", 20);
  const cabluS = L.tub([[DXc, DY + RDisc + mm(80), DZc], [DXc + 0.04, DY + RDisc + mm(110), DZc + 0.03], [-0.2, 0.06, 0.12], [-0.14, mm(12), 0.12]], mm(2), M.negru);
  void cabluS;
  /* capacul de protecție din plexiglas (4 șuruburi) */
  const cap = L.box(0.2, 0.22, 0.07, new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, roughness: 0.05, transmission: 0.9, thickness: 0.003, transparent: true, opacity: 0.28, depthWrite: false }), L.sc, DXc, 0.11 + mm(6), DZc + mm(5), mm(4));
  L.k_(cap, "capac", "Capacul de protecție din plexiglas 3 mm (fixat cu 4 șuruburi)"); cap.castShadow = false;
  /* butonul de oprire de urgență */
  const E = L.grup([-0.24, 0, 0.14]);
  const eb = L.box(mm(68), mm(68), mm(68), M.galben, E, 0, mm(34), 0, mm(4)); L.k_(eb, "estop", "Butonul de oprire de urgență (NC pe linia de 12 V a motorului)");
  const ciuperca = L.cyl(mm(22), mm(20), mm(16), M.rosu, E, 0, mm(76), 0, "y", 32); L.k_(ciuperca, "estop", "Butonul de oprire de urgență – apăsare = oprire, rotire = eliberare");
  /* sursa de 12 V, driverul L298N, circuitul de formare */
  const PS = L.sursaDubla([-0.46, 0, -0.24], { ecrane: [[414, 190, 92, 36]], et: "Sursă de laborator 12 V / 3 A" });
  const LG = L.grup([-0.24, 0, -0.06]);
  L.box(mm(43), mm(1.6), mm(43), M.rosu, LG, 0, mm(10), 0, mm(0.5)); L.box(mm(23), mm(25), mm(16), M.negru, LG, 0, mm(24), mm(-6), mm(1));
  for (let i = 0; i < 7; i++) L.box(mm(2), mm(25), mm(16), M.alu, LG, mm(-9 + i * 3), mm(38), mm(-6), mm(0.3));
  const lb = L.box(mm(43), mm(8), mm(43), mat({ color: 0x2a2d31 }), LG, 0, mm(4), 0, mm(1)); L.k_(lb, "l298", "Driverul L298N (punte H dublă): ENA = D5 (PWM), IN1/IN2 = D6/D7");
  [-12, -4, 4, 12].forEach(dx => L.box(mm(6), mm(9), mm(7), M.albastru, LG, mm(dx), mm(16), mm(18), mm(1)));
  const FG = L.grup([-0.12, 0, 0.12]);
  const fb = L.box(mm(50), mm(1.6), mm(36), M.pcbA, FG, 0, mm(8), 0, mm(0.5)); L.k_(fb, "formare", "Circuitul de formare: LM393 cu histerezis, 2 diode Zener 5,1 V; ieșirea → D49");
  L.box(mm(6), mm(1.4), mm(10), M.negru, FG, mm(4), mm(9.5), 0, mm(0.3)); [[-14, -10], [-14, -4]].forEach(([dx, dz]) => L.cyl(mm(1.4), mm(1.4), mm(4), mat({ color: 0xe8c26a }), FG, mm(dx), mm(9.5), mm(dz), "x", 10));
  [0, 1, 2, 3].forEach(i => L.cyl(mm(0.4), mm(0.4), mm(6), M.cositor, FG, mm(-18 + i * 3), mm(4), mm(-15), "y", 6));
  const tpV = L.cyl(mm(2.5), mm(2.5), mm(8), mat({ color: 0xf2f2f2 }), FG, mm(14), mm(12), mm(-10), "y", 16); L.k_(tpV, "tVR", "TP VR – semnalul brut al senzorului (înainte de formare)");
  const tpO = L.cyl(mm(2.5), mm(2.5), mm(8), mat({ color: 0xffeb3b }), FG, mm(14), mm(12), mm(8), "y", 16); L.k_(tpO, "tOUT", "TP OUT – ieșirea comparatorului (aceeași cu D49)");
  const pTV = L.lume(FG, V3(mm(14), mm(16), mm(-10))), pTO = L.lume(FG, V3(mm(14), mm(16), mm(8)));
  /* Arduino Mega, OLED, laptopul */
  const MG = L.arduinoMega([0.17, 0, 0.1]), OL = L.oled([0.32, 0, 0.13], { ecran: [940, 324, 210, 132] });
  const PC = L.laptop([0.44, 0, -0.16], { roty: -0.4, cod: () => L.textCod(), titlu: () => "PlatformIO – roata_60_2.cpp" });
  L.cabluUSB(MG.pin("D0").clone().set(0.17 - 0.06, 0.009, 0.085), PC.usb);
  /* osciloscopul cu sondele, tahometrul optic */
  const O = L.osciloscop([-0.02, 0, -0.22], { ecran: [40, 458, 416, 296] });
  const T = L.grup([-0.56, DY - mm(40), DZc - 0.042], -Math.PI / 2);
  L.cyl(mm(5), mm(5), DY - mm(40), M.negru, T, 0, -(DY - mm(40)) / 2, 0, "y", 12); L.cyl(mm(28), mm(30), mm(6), M.negru, T, 0, -(DY - mm(40)) + mm(3), 0, "y", 20);
  const tc = L.box(mm(60), mm(36), mm(150), M.galben, T, 0, mm(40), 0, mm(8)); L.k_(tc, "tah", "Tahometrul optic (laser, bandă reflectorizantă) – clic = măsoară");
  L.box(mm(22), mm(50), mm(30), M.galben, T, 0, mm(15), mm(40), mm(5)); L.planB(L.OG.adauga([652, 600, 96, 30], 320, 100), mm(44), mm(14), T, 0, mm(58.5), mm(-20), -Math.PI / 2);
  const las = L.cyl(mm(4), mm(4), mm(4), M.rosu, T, 0, mm(40), mm(-76), "z", 16);
  const raza = new THREE.Mesh(new THREE.CylinderGeometry(mm(0.8), mm(0.8), 1, 8), new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.8 })); L.sc.add(raza); raza.visible = false;
  const pRaza0 = L.lume(T, V3(0, mm(40), mm(-80))), pRaza1 = V3(DXc, DY, DZc - 0.042);
  { const d = pRaza1.clone().sub(pRaza0); raza.scale.y = d.length(); raza.position.copy(pRaza0).lerp(pRaza1, 0.5); raza.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); }
  void las;
  /* firele: senzor → formare (cablul), formare → D49, L298N ↔ D5/D6/D7, 12 V prin butonul de urgență, motorul, OLED pe I²C */
  const pinL = i => L.lume(LG, V3(mm(-12 + i * 8), mm(21), mm(18)));
  L.fir(pTO.clone().setY(mm(10)), MG.pin("D49"), 0xf2c230, { h: 30 });
  L.fir(pinL(0), MG.pin("D5"), 0xff9800, { h: 40 }); L.fir(pinL(1), MG.pin("D6"), 0x8e24aa, { h: 44 }); L.fir(pinL(2), MG.pin("D7"), 0x00897b, { h: 48 }); L.fir(pinL(3), MG.pin("GND"), N, { h: 36 });
  L.cablu(PS.borne[0], L.lume(E.children[0], V3(0, mm(10), mm(34))), R, { burta: 0.05 }); L.cablu(L.lume(E.children[0], V3(mm(20), mm(10), mm(34))), L.lume(LG, V3(mm(20), mm(12), mm(10))), R, { burta: 0.02 });
  L.cablu(PS.borne[2], L.lume(LG, V3(mm(20), mm(12), mm(-10))), N, { burta: 0.03 });
  L.tub([L.lume(LG, V3(mm(-21), mm(12), 0)), V3(-0.33, 0.04, -0.06), V3(-0.37, 0.09, -0.12), V3(DXc + 0.02, DY, -0.12)], mm(1.6), mat({ color: 0xc62828, roughness: 0.6 }));
  [[0, "5V", R], [1, "GND", N], [2, "D20", 0x1e88e5], [3, "D21", 0x43a047]].forEach(([i, n, c]) => L.fir(OL.pin(i), MG.pin(n), c, { h: 26 }));
  L.fir(L.lume(FG, V3(mm(-18), mm(8), mm(-15))), MG.pin("5V"), R, { h: 22 }); L.fir(L.lume(FG, V3(mm(-15), mm(8), mm(-15))), MG.pin("GND2"), N, { h: 22 });
  /* sondele osciloscopului */
  const TPS = { D49: () => MG.pin("D49"), tOUT: () => pTO, tVR: () => pTV, D5: () => MG.pin("D5") };
  const sd = [L.sonda(O.ch[0], 0xf2d600, V3(-0.05, 0.003, -0.08), { osc: true, et: "Sonda CH1 a osciloscopului" }), L.sonda(O.ch[1], 0x1fb6ff, V3(0.02, 0.003, -0.07), { osc: true, et: "Sonda CH2 a osciloscopului" })];
  return { actualizeaza() {
    D.rotation.z = -sim.phi * Math.PI / 180;
    SZ.position.set(0, DY + RDisc + sim.g / 1000 + mm(19), 0);
    cap.visible = sim.capac; ciuperca.position.y = sim.estop ? mm(70) : mm(76);
    raza.visible = sim.tah.act;
    MG.led("ON", sim.run ? 1 : 0); MG.led("TX", sim.run && performance.now() - sim.tx < 80 ? 1 : 0); MG.led("L", sim.pr && sim.pr.sync ? 0.6 : 0);
    sd.forEach((x, i) => { const f = TPS[sim.osc.ch[i].s]; x.muta(f ? f() : null); });
  } };
}
