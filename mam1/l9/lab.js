/* MAM I – Lucrarea 9. Clapeta electronică de accelerație: punte H, comandă PWM și regulator PID.
   Simulatorul în stilul Tinkercad: clapeta auto cu capacul de protecție, puntea BTS7960 cu radiator, sursa de 12 V prin siguranța de 5 A,
   oprirea de urgență și dioda TVS, potențiometrul de setpoint, Arduino Mega cu OLED, osciloscopul (PWM pe D11, curentul IS),
   multimetrul (U1, U2, Um) și termometrul IR; programul cu buclă deschisă sau regulator PID la 2 ms, treapta 0 → 40 %, plauzibilitatea
   pistelor; monitorul serial și plotterul. Pașii lucrării sunt afișați la vedere, cu verificări automate. */
"use strict";
const MD = MODELE["mam1-l9"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, tS: 0, st: null, alim: false, estop: false, estopVerif: false, capac: true, tvs: false, motor: true, mana: null, defP2: false, pot: 0, viteza: 1,
  mm: "off", camp: { MOD: "BD", DC: "0", KP: "4", KI: "0", KD: "0", UMAX: "60", FPWM: "20000" }, fw: null, pr: null, serial: [], tx: 0, ist: [],
  osc: { ch: [{ s: "nc" }, { s: "nc" }], tdiv: 0.00002, acq: null }, Tr: null, Tm: null, ir: null, crono: null, uCmd: 0, en: false
};
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const TS = MD.TS, DTF = MD.DTF;
const TDIV = [0.00001, 0.00002, 0.00005, 0.0001, 0.0005, 0.001, 0.002];
let SV3 = null;
function init() { if (!sim.st && P()) { sim.st = { th: P().LH, w: 0, i: 0 }; sim.Tr = P().Tamb; sim.Tm = P().Tamb; } }
const puntePutere = () => sim.alim && !sim.estop;
const Ub = () => puntePutere() ? P().Us - Math.abs(sim.st.i) * 0.016 : 0;

/* ------------------------------------------------------------------ fizica (pas de 0,1 ms) */
function pasFizic(d) {
  const p = P(), st = sim.st, en = sim.en && puntePutere() && sim.motor;
  if (sim.mana !== null) { st.th += (sim.mana - st.th) * Math.min(1, d / 0.03); if (Math.abs(st.th - sim.mana) < 0.01) st.th = sim.mana; st.w = 0; st.i *= Math.exp(-d / 0.0002); return; }
  MD.pas(p, st, sim.uCmd / 100 * Ub(), en, d);
  const P2 = MD.puteri(p, Math.abs(st.i), sim.fw ? sim.fw.fpwm : 20000), ePunte = sim.en && puntePutere();
  sim.Tr += ((p.Tamb + p.Rth * (ePunte ? P2.rad : 0)) - sim.Tr) * d / p.tauR;
  sim.Tm += ((p.Tamb + p.RthM * P2.mot) - sim.Tm) * d / p.tauM;
}

/* ------------------------------------------------------------------ programul (bucla de 2 ms) */
const u1Meas = () => MD.adc(MD.u1(P(), sim.st.th) + gauss() * 0.002), u2Meas = () => sim.defP2 ? MD.adc(Math.abs(gauss()) * 0.004) : MD.adc(MD.u2(P(), sim.st.th) + gauss() * 0.002);
function pornesteProgram() {
  sim.pr = { tAcc: 0, s: { integ: 0, ePrev: 0 }, dc: sim.fw.mod === "BD" ? sim.fw.dc : 0, nDef: 0, defect: false, tDef: null, blocaj: 0, tPr: 0, last: null, step: null, rez: {}, i2: 0, ni: 0 };
  sim.en = true; sim.uCmd = 0;
  seriala(`clapeta_pid | ${sim.fw.mod === "BD" ? `buclă deschisă DC = ${sim.fw.dc} %` : `PID Kp = ${sim.fw.kp}, Ki = ${sim.fw.ki}, Kd = ${sim.fw.kd}`} | UMAX = ±${sim.fw.umax} % | PWM ${sim.fw.fpwm} Hz (Timer1, D11/D12) | EN D10`);
  if (!sim.alim) seriala("(linia de 12 V a punții este oprită – senzorii sunt alimentați la 5 V de placă)");
}
function cicluProgram() {
  const pr = sim.pr, fw = sim.fw, U1 = u1Meas(), U2 = u2Meas(), th = MD.thProg(U1), sum = U1 + U2;
  if (!pr.defect) {
    if (Math.abs(sum - 5) > 0.3) pr.nDef++; else pr.nDef = 0;
    if (pr.nDef >= 5) { pr.defect = true; sim.en = false; sim.uCmd = 0; pr.tDef = sim.tS; seriala(`DEFECT PISTE: U1 + U2 = ${fx(sum, 2)} V (≠ 5 V) → EN = LOW, comanda oprită; arcul aduce clapeta în poziția de avarie`);
      if (pr.cut !== undefined && !pr.rez.def) pr.rez.defT = Math.round((sim.tS - pr.cut) * 1000); }
  }
  let ref = 0, u = 0;
  if (!pr.defect) {
    if (fw.mod === "BD") { u = pr.dc; ref = NaN; }
    else {
      ref = sim.pot;
      if (pr.step) { const t = sim.tS - pr.step.t0; ref = t < MD.TPRE ? 0 : MD.REF; if (t >= MD.TPRE) pr.step.pts.push([t - MD.TPRE, th, 0]); if (t >= MD.TPRE + MD.TRASP - 1e-9) finalTreapta(); }
      u = MD.pid({ kp: fw.kp, ki: fw.ki, kd: fw.kd, umax: fw.umax }, pr.s, ref, th);
    }
    if (Math.abs(u) >= fw.umax - 0.01 && puntePutere()) pr.blocaj += TS; else pr.blocaj = 0;
    if (pr.blocaj > 2) { pr.defect = true; sim.en = false; u = 0; seriala("PROTECȚIE: comanda la limită peste 2 s (clapetă blocată?) → EN = LOW"); }
  }
  sim.uCmd = pr.defect ? 0 : u;
  const I = Math.abs(sim.st.i) * (1 + 0.01 * gauss());
  pr.i2 += sim.st.i * sim.st.i; pr.ni++;
  pr.last = { U1, U2, th, ref, u: sim.uCmd, I, defect: pr.defect };
  pr.tPr += TS;
  if (pr.tPr >= 0.1 - 1e-9) { pr.tPr = 0; const f = (v, n) => Number.isFinite(v) ? v.toFixed(n) : "—";
    seriala(`${fw.mod === "BD" ? `DC ${f(pr.dc, 0)} %` : `ref ${f(ref, 1)}`} | θ ${f(th, 1)} % | u ${f(sim.uCmd, 1)} % | I ${f(I, 2)} A | U1 ${f(U1, 3)} U2 ${f(U2, 3)} V | ${pr.defect ? "DEFECT" : "OK"}`);
    sim.ist.push({ t: sim.tS, th, ref: Number.isFinite(ref) ? ref : null, u: sim.uCmd }); if (sim.ist.length > 300) sim.ist.shift(); }
}
function finalTreapta() {
  const pr = sim.pr, s = pr.step, a = MD.analiza(s.pts);
  pr.rez.t = { ...a, kp: sim.fw.kp, ki: sim.fw.ki, kd: sim.fw.kd, umax: sim.fw.umax, pts: s.pts }; pr.step = null;
  seriala(`treapta 0 → 40 %: θmax = ${fx(a.thMax, 2)} %, θ∞ = ${fx(a.thInf, 2)} %, Mp = ${fx(a.Mp, 1)} %, ts(±2 %) = ${fx(a.ts, 0)} ms, est = ${fx(a.est, 2)} %`);
}
function pasProgram(d) { const pr = sim.pr; if (!pr) return; pr.tAcc += d; while (pr.tAcc >= TS) { pr.tAcc -= TS; cicluProgram(); } }
function comanda(txt) {
  const s = String(txt).trim().toLowerCase(); if (!s) return; seriala("> " + s);
  if (!sim.run || !sim.pr) return seriala("(programul nu rulează)");
  const pr = sim.pr, m = /^d(\d+)$/.exec(s);
  if (m) { if (sim.fw.mod !== "BD") return seriala("(comanda dNN numai în buclă deschisă, MOD = BD)"); const v = +m[1]; if (v > sim.fw.umax) return seriala(`(DC limitat la UMAX = ${sim.fw.umax} %)`); pr.dc = v; seriala(`DC = ${v} %`); }
  else if (s === "t") { if (sim.fw.mod !== "PID") return seriala("(treapta numai cu regulatorul, MOD = PID)"); if (pr.defect) return seriala("(EN = LOW – reporniți programul)"); if (!puntePutere()) return seriala("(linia de 12 V este oprită)");
    pr.step = { t0: sim.tS, pts: [] }; pr.s = { integ: 0, ePrev: 0 }; seriala(`treaptă: ref = 0 timp de ${MD.TPRE} s, apoi 40 % timp de ${MD.TRASP} s; înregistrare la 2 ms…`); }
  else seriala("comenzi: dNN = DC NN % (buclă deschisă), t = treapta 0 → 40 % (PID)");
  actualizeaza();
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 300) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-120).join("\n"); el.scrollTop = el.scrollHeight; }

/* ------------------------------------------------------------------ osciloscopul (D11 și IS) și multimetrul */
const PUNCTE = { nc: "neconectat", D11: "D11 – RPWM (OC1A)", D12: "D12 – LPWM (OC1B)", IS: "IS – curentul punții (1 A/div)" };
function achizitie() {
  const o = sim.osc, f = sim.fw ? sim.fw.fpwm : 20000, T = 1 / f, W = o.tdiv * 10, u = sim.en && sim.run ? sim.uCmd : 0, dc = Math.abs(u) / 100;
  const pin = s => (s === "D11" && u > 0) || (s === "D12" && u < 0) ? dc : 0, p = P(), Us = Ub(), E = p.Ke * sim.st.w, tau = p.L / p.R;
  const iPer = () => { // regim periodic al curentului (faza on: Us − E, faza off: motorul scurtcircuitat prin punte)
    if (!puntePutere() || !sim.en || dc <= 0 || !sim.motor) return () => Math.abs(sim.st.i);
    const Ton = dc * T, Toff = T - Ton, a = Math.exp(-Ton / tau), b = Math.exp(-Toff / tau), I1 = (Us - E) / p.R, I0 = -E / p.R;
    const imin = (I1 * (1 - a) * b + I0 * (1 - b)) / (1 - a * b), imax = I1 + (imin - I1) * a;
    return t => { const x = ((t % T) + T) % T; let v = x < Ton ? I1 + (imin - I1) * Math.exp(-x / tau) : I0 + (imax - I0) * Math.exp(-(x - Ton) / tau); return Math.max(0, Math.abs(v)); }; };
  const fi = iPer(), N = 600, pts = [[], []];
  o.ch.forEach((c, k) => { if (c.s === "nc") return; for (let n = 0; n <= N; n++) { const t = n / N * W; let v;
    if (c.s === "IS") v = fi(t); else { const dd = pin(c.s), x = (t % T) / T; v = dd > 0 && x < dd ? 5 : 0; } pts[k].push([n / N, v]); } });
  const m = {}; if (["D11", "D12"].includes(o.ch[0].s) && pin(o.ch[0].s) > 0) { m.f = f; m.dc = pin(o.ch[0].s) * 100; }
  if (o.ch[1].s === "IS" && pts[1].length) { const v = pts[1].map(q => q[1]); m.imed = v.reduce((a, b) => a + b, 0) / v.length; m.ipp = Math.max(...v) - Math.min(...v); }
  o.acq = { pts, m };
}
function oscAfis() {
  const g = $("#osc-tr"); if (!g) return;
  const o = sim.osc, a = o.acq, X0 = 46, Y0 = 476, W = 404, H = 248, cul = ["#f2d600", "#1fb6ff"];
  const y = (c, v) => c === 0 ? Y0 + H / 2 - (v / 2 + 1) * (H / 8) : Y0 + H / 2 - (v / 1 - 3.5) * (H / 8);
  let s = "";
  if (a) a.pts.forEach((pts, c) => { if (!pts.length) return; s += `<polyline fill="none" stroke="${cul[c]}" stroke-width="1.6" points="${pts.map(([u, v]) => `${(X0 + u * W).toFixed(1)},${Math.max(Y0 + 1, Math.min(Y0 + H - 1, y(c, v))).toFixed(1)}`).join(" ")}"/>`; });
  if (!a || (!a.pts[0].length && !a.pts[1].length)) s += `<text x="${X0 + W / 2}" y="${Y0 + H / 2}" fill="#9aa" font-size="13" text-anchor="middle">conectați sondele (D11 / IS)</text>`;
  g.innerHTML = s;
  const m = a ? a.m : {};
  $("#osc-h").textContent = `CH1 2V ${o.ch[0].s === "nc" ? "—" : o.ch[0].s}  CH2 1A ${o.ch[1].s === "nc" ? "—" : o.ch[1].s}  ${fmtT(o.tdiv)}/div  Trig CH1 ↑`;
  $("#osc-m").textContent = `${m.f ? `Freq ${m.f >= 1000 ? (m.f / 1000).toFixed(2) + " kHz" : m.f.toFixed(1) + " Hz"}  Duty ${m.dc.toFixed(1)} %` : "Freq ----"}   ${Number.isFinite(m.imed) ? `CH2 Mean ${m.imed.toFixed(2)} A  Pk-Pk ${m.ipp.toFixed(2)} A` : ""}`;
}
const fmtT = s => s >= 1e-3 ? `${+(s * 1000).toFixed(3)} ms` : `${+(s * 1e6).toFixed(1)} µs`;
const MM = { off: "oprit", U1: "U1 – pista 1 (A0)", U2: "U2 – pista 2 (A1)", Um: "Um – M+ / M− (valoare medie)" };
function citireMM() {
  if (!sim.st || sim.mm === "off") return null; const p = P(), th = sim.st.th;
  const senz = sim.run; // senzorii sunt alimentați la 5 V de placă
  if (sim.mm === "U1") return senz ? MD.u1(p, th) + gauss() * 0.0004 : 0;
  if (sim.mm === "U2") return senz ? (sim.defP2 ? 0 : MD.u2(p, th) + gauss() * 0.0004) : 0;
  if (sim.mm === "Um") return (sim.en && puntePutere() ? sim.uCmd / 100 * Ub() : 0) + gauss() * 0.002;
  return null;
}

/* ------------------------------------------------------------------ comenzile standului */
function comutaAlim() {
  if (!sim.alim && !sim.capac) return Cadru.mesajTemporar("NSSM: montați capacul de protecție pe gura clapetei înainte de alimentare.", "pericol");
  if (!sim.alim && !sim.tvs) return Cadru.mesajTemporar("NSSM: montați dioda TVS P6KE24 pe alimentarea punții înainte de prima alimentare.", "pericol");
  if (!sim.alim && sim.mana !== null) return Cadru.mesajTemporar("Eliberați întâi clapeta (rotirea manuală se face numai fără 12 V).", "atentie");
  sim.alim = !sim.alim; actualizeaza();
}
function comutaEstop() {
  sim.estop = !sim.estop;
  if (sim.estop) { if (sim.alim) { sim.estopVerif = true; Cadru.mesajTemporar("Oprirea de urgență a întrerupt linia de 12 V a punții – verificare reușită; clapeta revine în poziția de avarie. Eliberați butonul.", ""); } else Cadru.mesajTemporar("Butonul apăsat. Pentru verificare: porniți linia de 12 V, apoi apăsați butonul.", "atentie"); }
  actualizeaza();
}
function comutaCapac() { if (sim.capac && sim.alim) return Cadru.mesajTemporar("NSSM: capacul nu se demontează cu linia de 12 V pornită.", "pericol"); sim.capac = !sim.capac; actualizeaza(); }
function comutaMotor() { if (sim.alim) return Cadru.mesajTemporar("Motorul se (de)conectează numai cu linia de 12 V oprită (supratensiuni inductive).", "pericol"); sim.motor = !sim.motor; actualizeaza(); }
function rotesteManual(p) {
  if (sim.alim) return Cadru.mesajTemporar("Rotirea manuală a clapetei se face numai cu linia de 12 V oprită.", "pericol");
  sim.mana = p; actualizeaza();
}
function elibereaza() { sim.mana = null; actualizeaza(); }
function setPot(v) { sim.pot = Math.max(0, Math.min(80, v)); actualizeaza(); }
function masoaraIR() { sim.ir = { rad: sim.Tr + gauss() * 0.15, mot: sim.Tm + gauss() * 0.2, t: sim.tS }; actualizeaza(); }
function taiePista() { if (!sim.run) return Cadru.mesajTemporar("Porniți simularea.", "atentie"); sim.defP2 = !sim.defP2; if (sim.defP2 && sim.pr) sim.pr.cut = sim.tS; actualizeaza(); }

/* ------------------------------------------------------------------ planșa în stilul Tinkercad */
const TC = [200, 220], RB = 92;
const TP9 = { D11: [1066, 52], D12: [1076, 52], IS: [828, 164] };
function planseSVG() {
  const W = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
  let s = `<svg id="tk-svg" viewBox="0 -14 1300 814" role="img" aria-label="Planșa: clapeta electronică cu capacul de protecție, puntea BTS7960, sursa de 12 V cu siguranța de 5 A și oprirea de urgență, dioda TVS, potențiometrul de setpoint, Arduino Mega cu OLED, osciloscopul, multimetrul și termometrul IR">
<defs><filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter>
 <linearGradient id="gAlu9" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7eb"/><stop offset="1" stop-color="#9aa2aa"/></linearGradient>
 <radialGradient id="gBore" cx=".5" cy=".5" r=".5"><stop offset=".7" stop-color="#20242a"/><stop offset="1" stop-color="#3a3f46"/></radialGradient></defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb"/>`;
  /* ---- clapeta: corpul, gura (vedere în lungul curgerii), placa, motorul, conectorul */
  s += `<g data-k="clapeta" class="tk-comp" filter="url(#umbra)"><rect x="${TC[0] - 125}" y="${TC[1] - 125}" width="250" height="250" rx="28" fill="url(#gAlu9)" stroke="#7c848c"/>
    <circle cx="${TC[0]}" cy="${TC[1]}" r="${RB + 6}" fill="#c9ced3" stroke="#7c848c"/><circle cx="${TC[0]}" cy="${TC[1]}" r="${RB}" fill="url(#gBore)"/>
    <ellipse id="placa9" cx="${TC[0]}" cy="${TC[1]}" rx="${RB - 1}" ry="${RB - 1}" fill="#b0b6bc" stroke="#555" stroke-width="2"/><line x1="${TC[0] - RB - 10}" y1="${TC[1]}" x2="${TC[0] + RB + 10}" y2="${TC[1]}" stroke="#666" stroke-width="5"/>
    <text x="${TC[0]}" y="${TC[1] + 148}" font-size="11" text-anchor="middle" fill="#333" font-weight="700">clapeta electronică (motor c.c. + reductor, arc, 2 piste)</text></g>
    <g data-k="motor" class="tk-comp" filter="url(#umbra)"><rect x="${TC[0] - 120}" y="${TC[1] + 160}" width="150" height="56" rx="24" fill="#3b3f45"/><text x="${TC[0] - 45}" y="${TC[1] + 193}" font-size="10" text-anchor="middle" fill="#ddd">motor c.c. · R ≈ 1…3 Ω</text></g>
    <g data-k="conector" class="tk-comp" filter="url(#umbra)"><rect x="${TC[0] + 50}" y="${TC[1] + 160}" width="80" height="56" rx="6" fill="#202226"/>${["M+", "M−", "5V", "GND", "S1", "S2"].map((t, i) => `<rect x="${TC[0] + 58 + (i % 3) * 22}" y="${TC[1] + 168 + Math.floor(i / 3) * 22}" width="16" height="14" fill="#c9a227"/><text x="${TC[0] + 66 + (i % 3) * 22}" y="${TC[1] + 166 + Math.floor(i / 3) * 22 + (i < 3 ? 0 : 30)}" font-size="6.5" text-anchor="middle" fill="${i < 3 ? "#333" : "#333"}">${t}</text>`).join("")}<text id="mot9" x="${TC[0] + 90}" y="${TC[1] + 234}" font-size="9" text-anchor="middle" fill="#c62828" font-weight="700"></text></g>
    <g data-k="capac" class="tk-comp"><rect id="capac9" x="${TC[0] - 108}" y="${TC[1] - 108}" width="216" height="216" rx="20" fill="#9fd3ff" fill-opacity=".18" stroke="#5aa9e6" stroke-width="2.5"/><circle cx="${TC[0] - 96}" cy="${TC[1] - 96}" r="4" fill="#666"/><circle cx="${TC[0] + 96}" cy="${TC[1] + 96}" r="4" fill="#666"/>
      <text id="capac9t" x="${TC[0] + 104}" y="${TC[1] - 112}" font-size="9" text-anchor="end" fill="#2b6ea6" font-weight="700">capac de protecție (2 șuruburi)</text></g>
    <text id="pos9" x="${TC[0]}" y="${TC[1] - 136}" font-size="12" text-anchor="middle" fill="#333" font-weight="700"></text>`;
  /* ---- oprirea de urgență, sursa, siguranța, TVS */
  s += `<g data-k="estop" class="tk-comp" filter="url(#umbra)"><rect x="408" y="30" width="96" height="96" rx="8" fill="#f2b705" stroke="#a37a00"/><circle cx="456" cy="78" r="30" fill="#c62828" stroke="#7f1010" stroke-width="3"/><circle id="estop9" cx="456" cy="78" r="20" fill="#e53935"/>
    <text x="456" y="142" font-size="10" text-anchor="middle" fill="#333" font-weight="700">OPRIRE DE URGENȚĂ</text><text id="estop9t" x="456" y="156" font-size="9" text-anchor="middle" fill="#2e7d32">eliberat</text></g>
    <g data-k="psu" class="tk-comp" filter="url(#umbra)"><rect x="400" y="176" width="170" height="104" rx="10" fill="#e1e3e5" stroke="#999"/><rect x="414" y="190" width="92" height="36" rx="3" fill="#0f1a12"/><text id="psu9" x="500" y="216" font-size="20" text-anchor="end" fill="#7dff8a" font-family="ui-monospace,monospace">00.0V</text>
      <circle id="psuLed9" cx="530" cy="206" r="7" fill="#333"/><text x="530" y="230" font-size="8" text-anchor="middle" fill="#333">12 V ON</text><circle cx="430" cy="258" r="8" fill="#d32f2f"/><circle cx="470" cy="258" r="8" fill="#111"/><text x="485" y="272" font-size="9" fill="#444">Sursă 12 V / 5 A</text></g>
    <g data-k="sig" class="tk-comp" filter="url(#umbra)"><rect x="520" y="40" width="70" height="30" rx="4" fill="#37474f"/><rect x="532" y="48" width="46" height="14" rx="7" fill="#eceff1" stroke="#999"/><text x="555" y="86" font-size="9" text-anchor="middle" fill="#333">siguranță 5 A</text></g>
    <g data-k="tvs" class="tk-comp"><rect x="590" y="140" width="22" height="12" rx="2" id="tvs9" fill="#ddd" stroke="#888" stroke-dasharray="3 2"/><text x="601" y="166" font-size="8" text-anchor="middle" fill="#555" id="tvs9t">TVS lipsă</text></g>`;
  /* ---- puntea BTS7960 cu radiator */
  s += `<g data-k="bts" class="tk-comp" filter="url(#umbra)"><rect x="620" y="30" width="230" height="150" rx="6" fill="#c62828" stroke="#7f1010"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${650 + i * 14}" y="40" width="9" height="80" rx="2" fill="#b0b6bc" stroke="#7c848c"/>`).join("")}
    <rect x="645" y="38" width="175" height="10" fill="#9aa2aa"/><text x="735" y="140" font-size="12" text-anchor="middle" fill="#fff" font-weight="800">BTS7960 · 43 A</text><text id="rad9" x="735" y="156" font-size="9" text-anchor="middle" fill="#ffd8d8"></text>
    ${["B+", "B−", "M+", "M−"].map((t, i) => `<rect x="${628 + i * 0}" y="${60 + i * 22}" width="14" height="16" fill="#1e63d6"/><text x="${633}" y="${57 + i * 22}" font-size="6.5" text-anchor="middle" fill="#fff">${t}</text>`).join("")}
    ${["RPWM", "LPWM", "R_EN", "L_EN", "IS", "VCC", "GND"].map((t, i) => `<rect x="${700 + i * 18}" y="164" width="12" height="12" fill="#222"/><text x="${706 + i * 18}" y="160" font-size="6" text-anchor="middle" fill="#fff">${t}</text>`).join("")}</g>
    <g data-k="IS" class="tk-comp"><circle cx="${TP9.IS[0]}" cy="${TP9.IS[1]}" r="7" fill="#1fb6ff" stroke="#000"/></g>`;
  /* ---- potențiometrul de setpoint */
  s += `<g data-k="pot" class="tk-comp" filter="url(#umbra)"><rect x="640" y="230" width="110" height="110" rx="10" fill="#eceff1" stroke="#90a4ae"/><circle cx="695" cy="282" r="34" fill="#263238"/><line id="pot9" x1="695" y1="282" x2="695" y2="254" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <text x="695" y="334" font-size="9" text-anchor="middle" fill="#37474f" font-weight="700" id="pot9t">setpoint 0 % (A2)</text></g>`;
  /* ---- Arduino Mega și OLED */
  const MX = 900, MY = 30;
  s += `<g data-k="mega" class="tk-comp" filter="url(#umbra)"><rect x="${MX}" y="${MY}" width="340" height="232" rx="8" fill="#00878f" stroke="#005a60"/>
    <rect x="${MX - 14}" y="${MY + 160}" width="46" height="40" rx="3" fill="url(#gAlu9)" stroke="#666"/><g transform="translate(${MX + 170} ${MY + 120}) rotate(45)"><rect x="-30" y="-30" width="60" height="60" rx="2" fill="#262626"/></g>
    <text x="${MX + 170}" y="${MY + 123}" font-size="7" fill="#bbb" text-anchor="middle" font-family="monospace">ATMEGA2560</text><rect x="${MX + 30}" y="${MY + 6}" width="250" height="12" rx="1.5" fill="#202020"/>
    <text x="${MX + 160}" y="${MY + 30}" font-size="6.5" fill="#fff" text-anchor="middle">D10 D11 D12</text><rect x="${MX + 60}" y="${MY + 214}" width="230" height="12" rx="1.5" fill="#202020"/><text x="${MX + 180}" y="${MY + 208}" font-size="6.5" fill="#fff" text-anchor="middle">A0 A1 A2 A3</text>
    <text x="${MX + 40}" y="${MY + 190}" font-size="13" fill="#e8ffff" font-weight="800">ARDUINO MEGA 2560</text>
    <rect id="ledON9" x="${MX + 60}" y="${MY + 60}" width="8" height="5" fill="#1a3a1a"/><text x="${MX + 72}" y="${MY + 65}" font-size="6" fill="#fff">ON</text><rect id="ledTX9" x="${MX + 60}" y="${MY + 72}" width="8" height="5" fill="#5a4a1a"/><text x="${MX + 72}" y="${MY + 77}" font-size="6" fill="#fff">TX</text></g>
    ${["D11", "D12"].map(k => `<g data-k="${k}" class="tk-comp"><rect x="${TP9[k][0] - 4}" y="${TP9[k][1] - 4}" width="8" height="8" fill="${k === "D11" ? "#ffeb3b" : "#ff9800"}" stroke="#000"/></g>`).join("")}
    <g data-k="rst" class="tk-comp"><rect x="${MX + 20}" y="${MY + 92}" width="18" height="18" rx="2" fill="#ccc" stroke="#555"/><circle cx="${MX + 29}" cy="${MY + 101}" r="5.5" fill="#c62828"/><text x="${MX + 29}" y="${MY + 122}" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">RESET</text></g>
    <path id="usb9" d="M${MX - 14},${MY + 180} C${MX - 60},${MY + 180} ${MX - 60},${MY + 300} ${MX - 20},${MY + 330}" fill="none" stroke="#bbb" stroke-width="6"/>`;
  s += `<g data-k="oled" class="tk-comp" filter="url(#umbra)"><rect x="930" y="300" width="230" height="170" rx="6" fill="#16337a" stroke="#0b1d48"/><rect x="940" y="324" width="210" height="132" rx="3" fill="#050608" stroke="#333"/><g id="oled9" font-family="ui-monospace,Consolas,monospace"></g><text x="1045" y="316" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED 0,96" SSD1306 · I²C</text></g>`;
  /* ---- osciloscopul */
  s += `<g data-k="osc" class="tk-comp" filter="url(#umbra)"><rect x="20" y="440" width="560" height="350" rx="12" fill="#2c3036"/><rect x="40" y="458" width="416" height="296" rx="4" fill="#050a0e" stroke="#111"/>
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${46 + i * 40.4}" y1="476" x2="${46 + i * 40.4}" y2="724" stroke="#1f3a44" stroke-width="${i === 5 ? 1.2 : .6}"/>`).join("")}${Array.from({ length: 9 }, (_, i) => `<line x1="46" y1="${476 + i * 31}" x2="450" y2="${476 + i * 31}" stroke="#1f3a44" stroke-width="${i === 4 ? 1.2 : .6}"/>`).join("")}
    <g id="osc-tr"></g><text id="osc-h" x="48" y="470" font-size="9.5" fill="#cfe8ff" font-family="ui-monospace,monospace"></text><text id="osc-m" x="48" y="744" font-size="10" fill="#7dff8a" font-family="ui-monospace,monospace"></text>
    <text x="520" y="476" font-size="11" text-anchor="middle" fill="#e6ebf0" font-weight="700">OSCILOSCOP</text><text x="520" y="490" font-size="8" text-anchor="middle" fill="#aab">2 canale · 100 MHz</text>
    ${[0, 1, 2].map(i => `<circle cx="${488 + (i % 2) * 40}" cy="${520 + i * 40}" r="13" fill="#4a4f56" stroke="#111"/>`).join("")}
    <circle cx="490" cy="740" r="10" fill="#f2d600" stroke="#111"/><circle cx="550" cy="740" r="10" fill="#1fb6ff" stroke="#111"/><text x="490" y="770" font-size="9" text-anchor="middle" fill="#fff">CH1</text><text x="550" y="770" font-size="9" text-anchor="middle" fill="#fff">CH2</text></g>`;
  /* ---- multimetrul și termometrul IR */
  s += `<g data-k="dmm" class="tk-comp" filter="url(#umbra)"><rect x="610" y="440" width="160" height="300" rx="16" fill="#f2b705" stroke="#a37a00"/><rect x="624" y="456" width="132" height="54" rx="4" fill="#bfd0b0" stroke="#222"/>
    <text id="dmm9" x="748" y="494" font-size="24" text-anchor="end" fill="#1d2414" font-family="ui-monospace,monospace" font-weight="700">----</text><circle cx="690" cy="580" r="40" fill="#262626"/><line id="dmmK9" x1="690" y1="580" x2="690" y2="546" stroke="#f2b705" stroke-width="5"/>
    <text x="690" y="650" font-size="10" text-anchor="middle" fill="#3b2a00" font-weight="700">MULTIMETRU V⎓</text><text id="dmmT9" x="690" y="668" font-size="9" text-anchor="middle" fill="#3b2a00"></text><circle cx="650" cy="712" r="9" fill="#111"/><circle cx="730" cy="712" r="9" fill="#d32f2f"/></g>
    <g data-k="ir" class="tk-comp" filter="url(#umbra)"><path d="M800,560 h120 a12,12 0 0 1 12,12 v34 a12,12 0 0 1 -12,12 h-56 v60 a8,8 0 0 1 -8,8 h-22 a8,8 0 0 1 -8,-8 v-60 h-26 a12,12 0 0 1 -12,-12 v-34 a12,12 0 0 1 12,-12z" fill="#455a64" stroke="#263238"/>
      <rect x="812" y="570" width="96" height="34" rx="3" fill="#bfd0b0" stroke="#222"/><text id="ir9" x="904" y="594" font-size="15" text-anchor="end" fill="#1d2414" font-family="ui-monospace,monospace" font-weight="700">--.- °C</text><circle cx="930" cy="589" r="5" fill="#ff1744"/>
      <text x="860" y="700" font-size="9" text-anchor="middle" fill="#263238" font-weight="700">TERMOMETRU IR</text></g>`;
  /* ---- firele */
  s += `<g style="pointer-events:none">
    ${W([[504, 70], [520, 70]], "#c62828", 3)}${W([[590, 55], [605, 55], [605, 66], [628, 66]], "#c62828", 3)}${W([[430, 250], [420, 250], [420, 70], [408, 70]], "#c62828", 3)}${W([[470, 250], [470, 296], [612, 296], [612, 96], [628, 96]], "#222", 3)}
    ${W([[628, 110], [600, 110], [600, 420], [TC[0] + 66, 420], [TC[0] + 66, TC[1] + 182]], "#c62828", 2.6)}${W([[628, 132], [594, 132], [594, 414], [TC[0] + 88, 414], [TC[0] + 88, TC[1] + 182]], "#333", 2.6)}
    ${W([[706, 176], [706, 200], [880, 200], [880, 14], [1066, 14], [1066, 48]], "#ffeb3b", 2)}${W([[724, 176], [724, 206], [886, 206], [886, 20], [1076, 20], [1076, 48]], "#ff9800", 2)}${W([[742, 176], [742, 212], [892, 212], [892, 26], [1056, 26], [1056, 48]], "#8e24aa", 2)}
    ${W([[TC[0] + 110, TC[1] + 204], [TC[0] + 110, 432], [876, 432], [876, 250], [1110, 250], [1110, 244]], "#43a047", 2)}${W([[TC[0] + 132, TC[1] + 204], [TC[0] + 132, 426], [870, 426], [870, 256], [1118, 256], [1118, 244]], "#1e88e5", 2)}
    ${W([[695, 340], [695, 380], [864, 380], [864, 262], [1126, 262], [1126, 244]], "#00897b", 2)}${W([[TP9.IS[0], TP9.IS[1] + 7], [TP9.IS[0], 218], [858, 218], [858, 268], [1134, 268], [1134, 244]], "#1fb6ff", 2)}
    ${W([[1102, 300], [1102, 280], [1170, 280], [1170, 262]], "#1e88e5", 2)}${W([[1120, 300], [1120, 286], [1180, 286], [1180, 262]], "#43a047", 2)}</g>`;
  s += `<g id="sonde9" style="pointer-events:none"></g><text id="tk-av" x="${TC[0]}" y="${TC[1] + 262}" text-anchor="middle" font-size="12" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
function oledTxt() {
  const v = sim.pr && sim.pr.last;
  if (!v) return { titlu: "CLAPETA", linii: ["pornire..."] };
  if (v.defect) return { titlu: "CLAPETA - DEFECT", linii: ["EN = LOW", `th ${v.th.toFixed(1)} %`, "pozitie avarie"] };
  return { titlu: sim.fw.mod === "BD" ? `BD DC=${sim.pr.dc}%` : `PID ${sim.fw.kp}/${sim.fw.ki}/${sim.fw.kd}`, linii: [Number.isFinite(v.ref) ? `ref ${v.ref.toFixed(1)} %` : "bucla deschisa", `th  ${v.th.toFixed(1)} %`, `u   ${v.u.toFixed(1)} %`, `I   ${v.I.toFixed(2)} A`] };
}
function planseAfis() {
  if (!$("#tk-svg") || !sim.st) return;
  const th = sim.st.th, a = Math.max(0, Math.min(88, 3 + th * 0.85)) * Math.PI / 180;
  $("#placa9").setAttribute("ry", (RB - 1) * Math.cos(a)); $("#pos9").textContent = `poziție ${fx(th, 1)} %${sim.mana !== null ? " (ținută cu mâna)" : ""}`;
  $("#capac9").setAttribute("stroke-dasharray", sim.capac ? "0" : "8 8"); $("#capac9").setAttribute("fill-opacity", sim.capac ? ".18" : "0"); $("#capac9t").textContent = sim.capac ? "capac de protecție (2 șuruburi)" : "CAPAC DEMONTAT";
  $("#mot9").textContent = sim.motor ? "" : "motor deconectat";
  $("#estop9").setAttribute("r", sim.estop ? 14 : 20); $("#estop9t").textContent = sim.estop ? "APĂSAT – 12 V întrerupt" : "eliberat"; $("#estop9t").setAttribute("fill", sim.estop ? "#c62828" : "#2e7d32");
  $("#psu9").textContent = sim.alim ? (Ub() || 12.1).toFixed(1).padStart(4, "0") + "V" : "00.0V"; $("#psuLed9").setAttribute("fill", sim.alim ? "#3cff4a" : "#333");
  $("#tvs9").setAttribute("fill", sim.tvs ? "#212121" : "#ddd"); $("#tvs9").setAttribute("stroke-dasharray", sim.tvs ? "0" : "3 2"); $("#tvs9t").textContent = sim.tvs ? "TVS P6KE24" : "TVS lipsă";
  $("#rad9").textContent = sim.Tr > 40 ? `radiator ≈ ${fx(sim.Tr, 0)} °C` : "";
  const pa = (-135 + 270 * sim.pot / 100) * Math.PI / 180; $("#pot9").setAttribute("x2", (695 + 28 * Math.sin(pa)).toFixed(1)); $("#pot9").setAttribute("y2", (282 - 28 * Math.cos(pa)).toFixed(1)); $("#pot9t").textContent = `setpoint ${sim.pot} % (A2)`;
  const r = citireMM(); $("#dmm9").textContent = r === null ? "----" : r.toFixed(3); $("#dmmT9").textContent = MM[sim.mm];
  const kA = { off: -60, U1: -20, U2: 20, Um: 60 }[sim.mm] * Math.PI / 180; $("#dmmK9").setAttribute("x2", (690 + 34 * Math.sin(kA)).toFixed(1)); $("#dmmK9").setAttribute("y2", (580 - 34 * Math.cos(kA)).toFixed(1));
  $("#ir9").textContent = sim.ir ? `${fx(sim.ir.rad, 1)} °C` : "--.- °C";
  const o = sim.run ? oledTxt() : null; $("#oled9").innerHTML = o ? `<text x="946" y="342" font-size="12" fill="#ffd400">${esc(o.titlu)}</text>` + o.linii.map((l, i) => `<text x="946" y="${364 + i * 22}" font-size="14" fill="#5fd3ff">${esc(l)}</text>`).join("") : "";
  $("#ledON9").setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a"); $("#ledTX9").setAttribute("fill", sim.run && performance.now() - sim.tx < 80 ? "#ffd04a" : "#5a4a1a"); $("#usb9").setAttribute("stroke", sim.run ? "#222" : "#bbb");
  const sd = [["#f2d600", [490, 740]], ["#1fb6ff", [550, 740]]];
  $("#sonde9").innerHTML = sim.osc.ch.map((c, i) => { const t = TP9[c.s]; if (!t) return ""; const [x0, y0] = sd[i][1];
    return `<path d="M${x0},${y0} C${x0},${y0 + 60} ${t[0] - 300},${t[1] + 300} ${t[0]},${t[1] + 10}" fill="none" stroke="${sd[i][0]}" stroke-width="3" opacity=".95"/><rect x="${t[0] - 4}" y="${t[1] + 6}" width="8" height="18" rx="3" fill="${sd[i][0]}"/>`; }).join("");
  $("#tk-av").textContent = !sim.capac ? "⚠ capacul de protecție demontat" : sim.defP2 ? "✂ pista 2 întreruptă" : sim.estop ? "oprire de urgență apăsată" : sim.fw && sim.fw.fpwm < 1000 && sim.en && Math.abs(sim.uCmd) > 1 && puntePutere() ? "🔊 fluierat audibil (PWM 490 Hz)" : "";
  oscAfis();
}
const INSP = {
  clapeta: () => ["Clapeta electronică", [["Poziție", fx(sim.st.th, 1) + " %"], ["Poziția de avarie", "≈ " + fx(MD.thProg(MD.u1(P(), P().LH)), 1) + " % (arcul)"], ["Pista 1 / 2", "0,5→4,5 V / 4,5→0,5 V (U1 + U2 = 5 V)"]]],
  motor: () => ["Motorul clapetei", [["Rezistență", fx(P().R, 2) + " Ω"], ["Curent", fx(Math.abs(sim.st.i), 2) + " A"], ["Temperatură", fx(sim.Tm, 1) + " °C"]]],
  conector: () => ["Conectorul clapetei", [["M+ / M−", "motorul (spre BTS7960)"], ["5V / GND", "alimentarea senzorilor"], ["S1 / S2", "pista 1 → A0, pista 2 → A1 (100 nF la masă)"], ["Motor", sim.motor ? "conectat (clic = deconectare, fără 12 V)" : "deconectat"]]],
  capac: () => ["Capacul de protecție", [["Stare", sim.capac ? "montat" : "demontat"]]],
  estop: () => ["Oprirea de urgență", [["Contact", "NC pe linia de 12 V a punții"], ["Stare", sim.estop ? "apăsat" : "eliberat"], ["Verificată", sim.estopVerif ? "da" : "nu"]]],
  psu: () => ["Sursa de 12 V / 5 A", [["Stare", sim.alim ? "pornită" : "oprită"], ["Lanțul", "12 V → siguranță 5 A → urgență NC → B+"]]],
  sig: () => ["Siguranța de 5 A", [["Rol", "protecția la scurtcircuit / clapetă blocată"]]],
  tvs: () => ["Dioda TVS P6KE24", [["Rol", "limitează supratensiunile inductive pe B+"], ["Stare", sim.tvs ? "montată" : "lipsă (clic = montare)"]]],
  bts: () => ["Puntea H BTS7960", [["RPWM / LPWM", "D11 / D12 (Timer1)"], ["R_EN + L_EN", "D10 (LOW = punte dezactivată)"], ["IS", "curentul → A3"], ["Radiator", fx(sim.Tr, 1) + " °C"]]],
  pot: () => ["Potențiometrul de setpoint", [["Pin", "A2"], ["Valoare", sim.pot + " %"]]],
  mega: () => ["Arduino Mega 2560", [["Program", sim.fw ? (sim.fw.mod === "BD" ? `buclă deschisă, DC = ${sim.pr ? sim.pr.dc : "—"} %` : `PID ${sim.fw.kp} / ${sim.fw.ki} / ${sim.fw.kd}`) : "—"], ["Bucla", "2 ms (întrerupere timer)"], ["PWM", sim.fw ? sim.fw.fpwm + " Hz" : "—"]]],
  oled: () => ["OLED", [["Conținut", "ref, θ, comanda u, curentul"]]],
  osc: () => ["Osciloscopul", [["CH1", PUNCTE[sim.osc.ch[0].s]], ["CH2", PUNCTE[sim.osc.ch[1].s]], ["Baza de timp", fmtT(sim.osc.tdiv) + "/div"]]],
  dmm: () => ["Multimetrul", [["Mod", MM[sim.mm]], ["Clic", "comută punctul de măsură"]]],
  ir: () => ["Termometrul IR", [["Radiator", sim.ir ? fx(sim.ir.rad, 1) + " °C" : "—"], ["Motor", sim.ir ? fx(sim.ir.mot, 1) + " °C" : "—"]]]
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
  if (k === "tvs") { sim.tvs = !sim.tvs; if (sim.alim && !sim.tvs) sim.tvs = true; return actualizeaza(); }
  if (k === "conector") return comutaMotor();
  if (k === "ir") return masoaraIR();
  if (k === "dmm") { const o = ["off", "U1", "U2", "Um"]; sim.mm = o[(o.indexOf(sim.mm) + 1) % 4]; return actualizeaza(); }
  if (k === "rst") { if (sim.run) { seriala("— RESET —"); pornesteProgram(); actualizeaza(); } return; }
  if (k === "D11" || k === "D12") { sim.osc.ch[0].s = k; oscCtl(); return actualizeaza(); }
  if (k === "IS") { sim.osc.ch[1].s = k; oscCtl(); return actualizeaza(); }
  inspector(k);
}

/* ------------------------------------------------------------------ panourile de sub planșă */
function panou() {
  const el = $("#tk-pompa"); if (!el) return;
  el.innerHTML = `<b>Stand</b><button type="button" data-st="capac" class="${sim.capac ? "activ" : "slab"}">Capac ${sim.capac ? "✓" : "demontat"}</button><button type="button" data-st="tvs" class="${sim.tvs ? "activ" : "slab"}">TVS ${sim.tvs ? "✓" : "lipsă"}</button>
    <button type="button" data-st="motor" class="${sim.motor ? "activ" : "slab"}">Motor ${sim.motor ? "conectat" : "deconectat"}</button><button type="button" data-st="estop" class="${sim.estop ? "slab" : ""}">🛑 Urgență ${sim.estop ? "APĂSAT" : "eliberat"}</button><button type="button" data-st="alim" class="${sim.alim ? "activ" : ""}">12 V ${sim.alim ? "ON" : "OFF"}</button>
    <span class="sep"></span><b>Rotire manuală (fără 12 V)</b>${MD.POZ.map(p => `<button type="button" data-ma="${p}" class="${sim.mana === p ? "activ" : ""}">${p === 0 ? "închisă" : p === 100 ? "deschisă" : p + " %"}</button>`).join("")}<button type="button" data-ma="x">eliberează</button>
    <span class="sep"></span><b>Multimetru</b>${Object.keys(MM).map(k => `<button type="button" data-mm="${k}" class="${sim.mm === k ? "activ" : ""}">${k === "off" ? "oprit" : k}</button>`).join("")}
    <span class="sep"></span><b>Buclă deschisă</b>${[0, 10, 20, 30].map(v => `<button type="button" data-dc="${v}">DC ${v}</button>`).join("")}
    <span class="sep"></span><b>Setpoint</b>${[0, 20, 40, 60].map(v => `<button type="button" data-pot="${v}" class="${sim.pot === v ? "activ" : ""}">${v} %</button>`).join("")}<button type="button" data-tr="1" class="primar">⤴ Treapta 0 → 40 %</button>
    <span class="sep"></span><button type="button" data-p2="1" class="${sim.defP2 ? "primar" : ""}">✂ ${sim.defP2 ? "Pista 2 întreruptă" : "Întrerupe pista 2"}</button><button type="button" data-ir="1">🌡 Termometru IR</button>
    <button type="button" data-vit="1" class="${sim.viteza > 1 ? "activ" : ""}">⏩ Timp ×${sim.viteza}</button>`;
  $$("[data-st]", el).forEach(b => b.addEventListener("click", () => laClic3d({ capac: "capac", tvs: "tvs", motor: "conector", estop: "estop", alim: "psu" }[b.dataset.st])));
  $$("[data-ma]", el).forEach(b => b.addEventListener("click", () => b.dataset.ma === "x" ? elibereaza() : rotesteManual(+b.dataset.ma)));
  $$("[data-mm]", el).forEach(b => b.addEventListener("click", () => { sim.mm = b.dataset.mm; actualizeaza(); }));
  $$("[data-dc]", el).forEach(b => b.addEventListener("click", () => comanda("d" + b.dataset.dc)));
  $$("[data-pot]", el).forEach(b => b.addEventListener("click", () => setPot(+b.dataset.pot)));
  $$("[data-tr]", el).forEach(b => b.addEventListener("click", () => comanda("t")));
  $$("[data-p2]", el).forEach(b => b.addEventListener("click", taiePista));
  $$("[data-ir]", el).forEach(b => b.addEventListener("click", masoaraIR));
  $$("[data-vit]", el).forEach(b => b.addEventListener("click", comutaViteza));
}
function comutaViteza() { sim.viteza = sim.viteza > 1 ? 1 : 10; actualizeaza(); }
function oscCtl() {
  const el = $("#tk-osc"); if (!el) return; const o = sim.osc;
  const sel = (i, opt) => `<select data-ch="${i}">${opt.map(k => `<option value="${k}"${o.ch[i].s === k ? " selected" : ""}>${PUNCTE[k]}</option>`).join("")}</select>`;
  el.innerHTML = `<b>Osciloscop</b><label>CH1 ${sel(0, ["nc", "D11", "D12"])}</label><label>CH2 ${sel(1, ["nc", "IS"])}</label>
    <button type="button" data-td="-1">T/div −</button><span class="osc-v">${fmtT(o.tdiv)}/div</span><button type="button" data-td="1">T/div +</button><span class="osc-v">CH1 2 V/div · CH2 1 A/div</span>`;
  $$("[data-ch]", el).forEach(s => s.addEventListener("change", () => { o.ch[+s.dataset.ch].s = s.value; achizitie(); actualizeaza(); }));
  $$("[data-td]", el).forEach(b => b.addEventListener("click", () => { const i = TDIV.indexOf(o.tdiv) + +b.dataset.td; o.tdiv = TDIV[Math.max(0, Math.min(TDIV.length - 1, i))]; oscCtl(); achizitie(); oscAfis(); }));
}
function afisaje() {
  const e = $("#afis"); if (!e || !sim.st) return; const v = sim.pr && sim.pr.last;
  e.innerHTML = `<div><span>Poziția (program)</span><b>${v ? fx(v.th, 1) + " %" : "—"}</b></div><div><span>Comanda u</span><b>${v ? fx(v.u, 1) + " %" : "—"}</b></div><div><span>Curent motor</span><b>${fx(Math.abs(sim.st.i), 2)} A</b></div>
    <div><span>Multimetru</span><b>${citireMM() === null ? "—" : fx(citireMM(), 3) + " V"}</b></div><div><span>Radiator / motor</span><b>${fx(sim.Tr, 1)} / ${fx(sim.Tm, 1)} °C</b></div><div><span>Cronometru</span><b>${sim.crono ? fx((sim.tS - sim.crono.t0) / 60, 2) + " min" : "—"}</b></div>`;
}
function sincron3d() { if (!SV3 && Cadru.anim && Cadru.anim.vedere) SV3 = Cadru.anim; }
function actualizeaza() { panou(); afisaje(); planseAfis(); sincron3d(); actualizeazaPasi(); }

/* ------------------------------------------------------------------ plotterul */
function plotter() {
  const cv = $("#tk-plot"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const L = 36, R = 8, T = 8, B = 20, y0 = -60, y1 = 100, Y = v => T + (y1 - Math.max(y0, Math.min(y1, v))) / (y1 - y0) * (H - T - B);
  const rz = sim.pr && sim.pr.rez.t, pas = sim.pr && sim.pr.step;
  let pts, t0, t1;
  if (pas || rz) { const a = pas ? pas.pts : rz.pts; pts = a.map(q => ({ t: q[0], th: q[1], ref: 40 })); t0 = 0; t1 = MD.TRASP; }
  else { const ist = sim.ist; t1 = ist.length ? ist[ist.length - 1].t : 20; t0 = t1 - 20; pts = ist.filter(e => e.t >= t0); }
  const X = t => L + (t - t0) / (t1 - t0) * (W - L - R);
  g.font = "10px system-ui"; g.fillStyle = "#666"; g.strokeStyle = "#eee";
  for (let v = y0; v <= y1; v += 20) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke(); g.fillText(String(v), 4, Y(v) + 3); }
  [["th", "#1565c0", "θ [%]"], ["ref", "#c62828", "ref [%]"], ["u", "#2e7d32", "u [%]"]].forEach(([k, c, n], i) => { g.strokeStyle = c; g.lineWidth = 1.5; g.beginPath(); let a = false; pts.forEach(p => { const v = p[k]; if (v === null || v === undefined) { a = false; return; } a ? g.lineTo(X(p.t), Y(v)) : g.moveTo(X(p.t), Y(v)); a = true; }); g.stroke(); g.fillStyle = c; g.fillText(n, L + 6 + i * 60, T + 9); });
  g.fillStyle = "#888"; g.fillText(pas || rz ? "treapta 0 → 40 % – eșantioane la 2 ms (1 s)" : "ultimele 20 s", W - 230, T + 9);
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregSenz(e) {
  if (sim.alim) return Cadru.mesajTemporar("Tabelul 9.1 se completează cu linia de 12 V oprită (clapeta rotită cu mâna).", "atentie");
  if (!sim.run) return Cadru.mesajTemporar("Porniți simularea: senzorii sunt alimentați la 5 V de placa Mega.", "atentie");
  if (sim.mana === null || Math.abs(sim.st.th - sim.mana) > 0.05) return Cadru.mesajTemporar("Rotiți cu mâna clapeta într-o poziție din tabel (închisă, 25, 50, 75 %, deschisă).", "atentie");
  if (sim.mm !== "U1" && sim.mm !== "U2") return Cadru.mesajTemporar("Multimetrul pe U1 (pista 1) sau U2 (pista 2).", "atentie");
  const pos = sim.mana, c = sim.mm.toLowerCase(), v = +citireMM().toFixed(3);
  sim._senz = sim._senz || {}; const q = sim._senz[pos] = Object.assign(sim._senz[pos] || {}, { [c]: v });
  if (!Number.isFinite(q.u1) || !Number.isFinite(q.u2)) { msg(`Poziția ${pos} %: ${c.toUpperCase()} = ${fx(v, 3)} V reținut; comutați multimetrul pe cealaltă pistă și apăsați din nou.`); return; }
  const k = "p" + pos;
  if (Cadru.inregistreaza(e, { log: { m: "senz", pos, u1: q.u1, u2: q.u2 }, celule: [{ t: "t91", r: k, c: "u1", v: q.u1.toFixed(3) }, { t: "t91", r: k, c: "u2", v: q.u2.toFixed(3) }] }))
    msg(`Tabelul 9.1, ${pos} %: U1 = ${fx(q.u1, 3)} V, U2 = ${fx(q.u2, 3)} V (U1 + U2 = ${fx(q.u1 + q.u2, 3)} V).`);
  delete sim._senz[pos];
}
function inregBD(e) {
  if (!sim.run || !sim.pr || sim.fw.mod !== "BD") return Cadru.mesajTemporar("Programul în buclă deschisă (MOD = BD) și pornit.", "atentie");
  const dc = sim.pr.dc; if (!MD.DCS.includes(dc)) return Cadru.mesajTemporar("Tabelul 9.2 se completează la DC = 10, 20, 30 % (butoanele „DC” sau comanda dNN).", "atentie");
  if (!puntePutere() || !sim.motor) return Cadru.mesajTemporar("Linia de 12 V pornită și motorul conectat.", "atentie");
  if (Math.abs(sim.st.w) > 0.01) return Cadru.mesajTemporar("Așteptați poziția de echilibru (clapeta oprită).", "atentie");
  if (sim.mm !== "Um") return Cadru.mesajTemporar("Multimetrul pe Um (M+ / M−, valoarea medie).", "atentie");
  const um = +citireMM().toFixed(3), th = +sim.pr.last.th.toFixed(2), i = +sim.pr.last.I.toFixed(3), k = "d" + dc;
  if (Cadru.inregistreaza(e, { log: { m: "bd", dc, um, th, i }, celule: [{ t: "t92", r: k, c: "um", v: um.toFixed(3) }, { t: "t92", r: k, c: "th", v: th.toFixed(2) }, { t: "t92", r: k, c: "i", v: i.toFixed(3) }] }))
    msg(`Tabelul 9.2, DC = ${dc} %: Um = ${fx(um, 3)} V, θ = ${fx(th, 2)} %, I = ${fx(i, 3)} A.`);
}
function inregPas(e) {
  const r = sim.run && sim.pr && sim.pr.rez.t; if (!r) return Cadru.mesajTemporar("Programul cu MOD = PID: apăsați „⤴ Treapta 0 → 40 %” și așteptați rezultatul (1,6 s).", "atentie");
  const tip = MD.tip({ kp: r.kp, ki: r.ki, kd: r.kd }); if (tip === "PD") return Cadru.mesajTemporar("Tabelul 9.3 cere P (Ki = Kd = 0), PI (Kd = 0) și PID.", "atentie");
  const k = tip.toLowerCase(), thMax = +r.thMax.toFixed(2), ts = Math.round(r.ts), est = +r.est.toFixed(2);
  if (Cadru.inregistreaza(e, { log: { m: "pas", k, kp: r.kp, ki: r.ki, kd: r.kd, umax: r.umax, thMax, ts, est }, celule: [{ t: "t93", r: k, c: "kp", v: String(r.kp) }, { t: "t93", r: k, c: "ki", v: String(r.ki) }, { t: "t93", r: k, c: "kd", v: String(r.kd) }, { t: "t93", r: k, c: "thMax", v: thMax.toFixed(2) }, { t: "t93", r: k, c: "ts", v: String(ts) }, { t: "t93", r: k, c: "est", v: est.toFixed(2) }] }))
    msg(`Tabelul 9.3 (${tip}): θmax = ${fx(thMax, 2)} %, ts = ${ts} ms, est = ${fx(est, 2)} %${tip === "PID" ? (r.Mp < 10 && r.ts < 300 ? " – criteriile Mp < 10 % și ts < 300 ms sunt îndeplinite." : " – criteriile Mp < 10 % și ts < 300 ms NU sunt îndeplinite: modificați parametrii și repetați.") : "."}`);
}
function inregDef(e) {
  const pr = sim.run && sim.pr; if (!pr || !pr.defect || pr.rez.defT === undefined) return Cadru.mesajTemporar("Cu regulatorul activ (ref ≈ 40 %), apăsați „✂ Întrerupe pista 2” și așteptați reacția programului.", "atentie");
  if (Math.abs(sim.st.w) > 0.01 || sim.tS - pr.tDef < 0.5) return Cadru.mesajTemporar("Așteptați ca arcul să aducă clapeta în poziția de avarie.", "atentie");
  const tr = pr.rez.defT, th = +pr.last.th.toFixed(2);
  if (Cadru.inregistreaza(e, { log: { m: "def", tr, th }, celule: [{ t: "t94", r: "p2", c: "tr", v: String(tr) }, { t: "t94", r: "p2", c: "th", v: th.toFixed(2) }, { t: "t94", r: "p2", c: "u", v: "0" }] }))
    msg(`Tabelul 9.4: defectul detectat după ${tr} ms; comanda oprită, clapeta în poziția de avarie θ = ${fx(th, 2)} %.`);
}
function inregT0(e) {
  if (!sim.ir || sim.tS - sim.ir.t > 5) return Cadru.mesajTemporar("Măsurați întâi cu termometrul IR (radiatorul și motorul).", "atentie");
  if (!sim.run || !sim.pr || sim.fw.mod !== "PID" || sim.pot !== 40 || !puntePutere()) return Cadru.mesajTemporar("Regulatorul PID activ, setpoint 40 %, linia de 12 V pornită.", "atentie");
  sim.crono = { t0: sim.tS, r0: +sim.ir.rad.toFixed(1), m0: +sim.ir.mot.toFixed(1), i2: 0, n: 0, f: sim.fw.fpwm };
  if (Cadru.inregistreaza(e, { log: { m: "t0", r0: sim.crono.r0, m0: sim.crono.m0 }, celule: [{ t: "t95", r: "rad", c: "t0", v: sim.crono.r0.toFixed(1) }, { t: "t95", r: "mot", c: "t0", v: sim.crono.m0.toFixed(1) }] }))
    msg(`Tabelul 9.5: temperaturile inițiale ${fx(sim.crono.r0, 1)} / ${fx(sim.crono.m0, 1)} °C; cronometrul de 5 min a pornit.`);
}
function inregT5(e) {
  const c = sim.crono; if (!c) return Cadru.mesajTemporar("Înregistrați întâi temperaturile inițiale (pornește cronometrul).", "atentie");
  if (sim.tS - c.t0 < 300) return Cadru.mesajTemporar(`Au trecut ${fx((sim.tS - c.t0) / 60, 2)} min din 5.`, "atentie");
  if (!sim.ir || sim.ir.t < c.t0 + 300) return Cadru.mesajTemporar("Măsurați din nou cu termometrul IR, după 5 minute.", "atentie");
  const irms = Math.sqrt(c.i2 / Math.max(1, c.n)), t = +(sim.ir.t - c.t0).toFixed(1), rad = +sim.ir.rad.toFixed(1), mot = +sim.ir.mot.toFixed(1);
  if (Cadru.inregistreaza(e, { log: { m: "temp", t, i: +irms.toFixed(3), f: c.f, r0: c.r0, m0: c.m0, rad, mot }, celule: [{ t: "t95", r: "rad", c: "t5", v: rad.toFixed(1) }, { t: "t95", r: "mot", c: "t5", v: mot.toFixed(1) }] }))
    msg(`Tabelul 9.5: după ${fx(t / 60, 2)} min – radiator ${fx(rad, 1)} °C, motor ${fx(mot, 1)} °C (curent efectiv ${fx(irms, 2)} A).`);
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const nT91 = () => MD.POZ.filter(p => pe("t91", "p" + p, "u1") && pe("t91", "p" + p, "u2")).length, nT92 = () => MD.DCS.filter(d => pe("t92", "d" + d, "th")).length, nT93 = () => ["p", "pi", "pid"].filter(k => pe("t93", k, "thMax")).length;
const pidOk = () => { const r = Cadru.D.t.t93.pid, mx = num(r.thMax), es = num(r.est), inf = 40 - es; return Number.isFinite(mx) && (mx - inf) / inf * 100 < 10 && num(r.ts) < 300; };
const PASI = [
  { t: "Pregătirea standului (NSSM)", tab: "capac, TVS, urgență", v3: "clapeta",
    banda: "Pasul 1 · Capacul de protecție pe gura clapetei, dioda TVS pe alimentarea punții, oprirea de urgență verificată; linia de 12 V: siguranța 5 A → urgența NC → B+.",
    instr: ["Verificați capacul de protecție (<b>Capac ✓</b>) și montați dioda TVS: <b>TVS lipsă</b> → <b>TVS ✓</b>.",
      "Apăsați <b>12 V OFF</b> → <b>12 V ON</b>, apoi <b>🛑 Urgență</b>: linia punții se întrerupe – verificare reușită; apăsați din nou (eliberare).",
      "Opriți linia de 12 V (<b>12 V ON</b> → OFF) pentru pasul următor.",
      "Apăsați <b>▶ Pornește simularea</b>: placa Mega (USB) alimentează senzorii clapetei la 5 V; programul pornește în buclă deschisă cu DC = 0 %."],
    ctl: () => "",
    ver: () => [[sim.capac, "capacul montat"], [sim.tvs, "dioda TVS montată"], [sim.estopVerif && !sim.estop, "oprirea de urgență verificată și eliberată"], [sim.run, "programul rulează"]],
    prog: () => [sim.capac, sim.tvs, sim.estopVerif && !sim.estop, sim.run].filter(Boolean).length, tot: 4, butoane: [] },
  { t: "Senzorii clapetei", tab: "Tabelul 9.1", v3: "clapeta",
    banda: "Pasul 2 · Fără 12 V, clapeta rotită cu mâna: tensiunile celor două piste (U1 crește, U2 scade, U1 + U2 ≈ 5 V) pe multimetru.",
    instr: ["Linia de 12 V oprită; programul pornit (senzorii la 5 V).",
      "„Rotire manuală”: alegeți <b>închisă</b> (clapeta ținută pe opritor).",
      "Multimetrul pe <b>U1</b>: apăsați <b>„● U → Tabelul 9.1”</b>; apoi pe <b>U2</b> și din nou <b>„● U → Tabelul 9.1”</b>.",
      "Repetați pentru <b>25, 50, 75 %</b> și <b>deschisă</b>; la final apăsați <b>eliberează</b> – arcul aduce clapeta în poziția de avarie."],
    ctl: () => `<div class="rand-mic">${MD.POZ.map(p => `<button type="button" data-ma2="${p}">${p === 0 ? "închisă" : p === 100 ? "deschisă" : p + " %"}</button>`).join("")}<button type="button" data-ma2="x">eliberează</button></div><div class="rand-mic"><button type="button" data-mm2="U1">Multimetru U1</button><button type="button" data-mm2="U2">Multimetru U2</button></div>`,
    ver: () => [[!sim.alim, "linia de 12 V oprită"], [sim.mana !== null, sim.mana !== null ? `clapeta ținută la ${sim.mana} %` : "clapeta rotită cu mâna"], [["U1", "U2"].includes(sim.mm), "multimetrul pe U1 / U2"], [nT91() >= 5, `poziții înregistrate: ${nT91()}/5`]],
    prog: nT91, tot: 5, butoane: [["● U → Tabelul 9.1", inregSenz, "primar"]] },
  { t: "PWM-ul de 20 kHz", tab: "osciloscop D11, IS", v3: "osc",
    banda: "Pasul 3 · Cu motorul deconectat se verifică PWM-ul punții pe osciloscop (D11, 20 kHz); apoi, cu motorul conectat, curentul IS: la 20 kHz ondulația este mică, la 490 Hz curentul pulsează și se aude.",
    instr: ["Eliberați clapeta. Cu 12 V oprit, apăsați <b>Motor conectat</b> → <b>deconectat</b>.",
      "Porniți linia de 12 V și apăsați <b>DC 20</b>. Osciloscop: CH1 pe <b>D11</b> (clic pe pin), T/div = 20 µs – citiți <b>Freq ≈ 20 kHz</b> și <b>Duty 20 %</b>.",
      "Opriți 12 V, reconectați motorul (<b>Motor conectat</b>), porniți 12 V; CH2 pe <b>IS</b>: curentul mediu și ondulația (Pk-Pk).",
      "Opțional: opriți simularea, alegeți <b>FPWM = 490</b>, porniți, DC 20 – ondulația crește mult și apare fluieratul; reveniți la 20000. Apăsați <b>DC 0</b>."],
    ctl: () => `<div class="rand-mic"><button type="button" data-dc2="20">DC 20 %</button><button type="button" data-dc2="0">DC 0 %</button><button type="button" data-sonde="1">Sondele pe D11 / IS</button><button type="button" data-tdv="0.00002">20 µs/div</button><button type="button" data-tdv="0.001">1 ms/div</button></div>`,
    ver: () => { const m = sim.osc.acq && sim.osc.acq.m; return [[!!(m && m.f === 20000), m && m.f ? `PWM ${m.f} Hz, duty ${fx(m.dc, 1)} %` : "PWM afișat pe CH1 (D11)"], [!!(m && Number.isFinite(m.imed) && sim.motor && m.imed > 0.1), m && Number.isFinite(m.imed) ? `curent ${fx(m.imed, 2)} A, ondulație ${fx(m.ipp, 2)} A` : "curentul pe CH2 (IS), motorul conectat"]]; },
    prog: () => sim.pwmVazut ? 1 : 0, tot: 1, butoane: [] },
  { t: "Bucla deschisă", tab: "Tabelul 9.2", v3: "clapeta",
    banda: "Pasul 4 · DC = 10, 20, 30 %: tensiunea medie Um (multimetru), poziția de echilibru θ și curentul I (ieșirea IS a punții, prin program).",
    instr: ["Programul în buclă deschisă (MOD = BD), linia de 12 V pornită, motorul conectat.",
      "Multimetrul pe <b>Um</b>. Apăsați <b>DC 10</b> și așteptați oprirea clapetei.",
      "Apăsați <b>„● Um, θ, I → Tabelul 9.2”</b>.",
      "Repetați pentru <b>DC 20</b> și <b>DC 30</b> (crescător). Observați: la DC = 10 % clapeta abia se mișcă din poziția de avarie (pretensionarea arcului). La final <b>DC 0</b>."],
    ctl: () => `<div class="rand-mic">${[10, 20, 30, 0].map(v => `<button type="button" data-dc2="${v}">DC ${v} %</button>`).join("")}<button type="button" data-mm2="Um">Multimetru Um</button></div>`,
    ver: () => [[!!sim.fw && sim.fw.mod === "BD", "programul în buclă deschisă"], [puntePutere() && sim.motor, "12 V pornit, motorul conectat"], [sim.mm === "Um", "multimetrul pe Um"], [nT92() >= 3, `regimuri înregistrate: ${nT92()}/3`]],
    prog: nT92, tot: 3, butoane: [["● Um, θ, I → Tabelul 9.2", inregBD, "primar"]] },
  { t: "Regulatorul P, PI, PID", tab: "Tabelul 9.3", v3: "clapeta",
    banda: "Pasul 5 · MOD = PID: treapta 0 → 40 % cu P (Ki = Kd = 0), PI (Kd = 0) și PID; acordarea PID pentru Mp < 10 % și ts < 300 ms.",
    instr: ["Opriți simularea; în cod: <b>MOD = PID</b>, <b>KP = 4</b>, <b>KI = 0</b>, <b>KD = 0</b>, UMAX = 60. Porniți simularea (12 V pornit).",
      "Apăsați <b>⤴ Treapta 0 → 40 %</b>: programul ține ref = 0 timp de 0,6 s, apoi 40 % timp de 1 s, și afișează θmax, Mp, ts, est. Apăsați <b>„● Răspunsul → Tabelul 9.3”</b>.",
      "Repetați cu <b>KI = 20</b> (PI) și apoi cu <b>KD = 0.05</b> (PID).",
      "Dacă PID nu îndeplinește Mp < 10 % și ts < 300 ms, modificați KI (de ex. 40) sau KD și repetați – rândul PID se suprascrie. Observați cum P lasă eroarea staționară (arcul)."],
    ctl: () => `<div class="rand-mic"><button type="button" data-tr2="1" class="primar">⤴ Treapta 0 → 40 %</button></div>`,
    ver: () => { const r = sim.pr && sim.pr.rez.t; return [[!!sim.fw && sim.fw.mod === "PID", sim.fw ? `${sim.fw.mod} Kp = ${sim.fw.kp}, Ki = ${sim.fw.ki}, Kd = ${sim.fw.kd}` : "programul cu MOD = PID"], [!!r, r ? `Mp = ${fx(r.Mp, 1)} %, ts = ${fx(r.ts, 0)} ms, est = ${fx(r.est, 2)} %` : "treapta înregistrată"], [nT93() >= 3, `regulatoare înregistrate: ${nT93()}/3`], [pidOk(), "PID: Mp < 10 % și ts < 300 ms"]]; },
    prog: () => nT93() + (pidOk() ? 1 : 0), tot: 4, butoane: [["● Răspunsul → Tabelul 9.3", inregPas, "primar"]] },
  { t: "Defectul senzorului", tab: "Tabelul 9.4", v3: "clapeta",
    banda: "Pasul 6 · Cu regulatorul activ la 40 %, se întrerupe pista 2: plauzibilitatea U1 + U2 ≈ 5 V nu mai este îndeplinită, programul dezactivează puntea (EN = LOW) și arcul aduce clapeta în poziția de avarie.",
    instr: ["Regulatorul PID activ, setpoint <b>40 %</b> (butonul „Setpoint 40 %”), clapeta stabilă la 40 %.",
      "Apăsați <b>✂ Întrerupe pista 2</b>. Urmăriți monitorul serial (DEFECT PISTE) și clapeta.",
      "Apăsați <b>„● Reacția la defect → Tabelul 9.4”</b>.",
      "Refaceți pista 2 (apăsați din nou butonul) și reporniți programul (RESET sau Oprește / Pornește)."],
    ctl: () => `<div class="rand-mic"><button type="button" data-pot2="40">Setpoint 40 %</button><button type="button" data-p22="1" class="primar">✂ Întrerupe / reface pista 2</button></div>`,
    ver: () => [[!!sim.fw && sim.fw.mod === "PID" && sim.pot === 40, "regulatorul activ la 40 %"], [!!(sim.pr && sim.pr.defect), sim.pr && sim.pr.defect ? "EN = LOW (defect detectat)" : "defectul detectat"], [pe("t94", "p2", "tr"), "Tabelul 9.4 completat"]],
    prog: () => pe("t94", "p2", "tr") ? 1 : 0, tot: 1, butoane: [["● Reacția la defect → Tabelul 9.4", inregDef, "primar"]] },
  { t: "Temperatura punții", tab: "Tabelul 9.5", v3: "bts",
    banda: "Pasul 7 · Regulatorul ține clapeta la 40 % timp de 5 minute (contra arcului): temperatura radiatorului punții și a motorului, cu termometrul IR, la început și la sfârșit.",
    instr: ["Pista 2 refăcută, programul repornit cu MOD = PID; setpoint <b>40 %</b>, 12 V pornit.",
      "Apăsați <b>🌡 Termometru IR</b> și apoi <b>„● T inițial → Tabelul 9.5”</b> (pornește cronometrul).",
      "Așteptați 5 minute (cu <b>⏩ Timp ×10</b>: 30 s). Nu atingeți radiatorul.",
      "Apăsați din nou <b>🌡 Termometru IR</b> și <b>„● T după 5 min → Tabelul 9.5”</b>. Radiatorul trebuie să rămână sub 60 °C."],
    ctl: () => `<div class="rand-mic"><button type="button" data-pot2="40">Setpoint 40 %</button><button type="button" data-ir2="1">🌡 Termometru IR</button><button type="button" data-vit2="1">⏩ Timp ×10</button></div>`,
    ver: () => [[!!sim.crono, sim.crono ? `cronometru ${fx((sim.tS - sim.crono.t0) / 60, 2)} / 5 min` : "temperaturile inițiale înregistrate"], [pe("t95", "rad", "t5"), "temperaturile după 5 min înregistrate"]],
    prog: () => (pe("t95", "rad", "t0") ? 1 : 0) + (pe("t95", "rad", "t5") ? 1 : 0), tot: 2, butoane: [["● T inițial → Tabelul 9.5", inregT0, "secundar"], ["● T după 5 min → Tabelul 9.5", inregT5, "primar"]] }
];
let pasActiv = 0;
const VEDERI = { tot: [[0.0, 0.62, 0.86], [0.0, 0.05, -0.02]], clapeta: [[-0.3, 0.3, 0.42], [-0.32, 0.08, -0.04]], osc: [[0.0, 0.3, 0.45], [0.0, 0.1, -0.2]], bts: [[-0.05, 0.3, 0.35], [-0.08, 0.04, -0.04]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl && p.ctl() ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată în montajul 3D</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => { Cadru.arataTab("anim"); setTimeout(() => vedere3d(PASI[+b.dataset.vezi].v3), 600); }));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-ma2]").forEach(b => b.addEventListener("click", () => b.dataset.ma2 === "x" ? elibereaza() : rotesteManual(+b.dataset.ma2)));
  $$("#pasi [data-mm2]").forEach(b => b.addEventListener("click", () => { sim.mm = b.dataset.mm2; actualizeaza(); }));
  $$("#pasi [data-dc2]").forEach(b => b.addEventListener("click", () => comanda("d" + b.dataset.dc2)));
  $$("#pasi [data-sonde]").forEach(b => b.addEventListener("click", () => { sim.osc.ch[0].s = "D11"; sim.osc.ch[1].s = "IS"; oscCtl(); achizitie(); actualizeaza(); }));
  $$("#pasi [data-tdv]").forEach(b => b.addEventListener("click", () => { sim.osc.tdiv = +b.dataset.tdv; oscCtl(); achizitie(); oscAfis(); }));
  $$("#pasi [data-tr2]").forEach(b => b.addEventListener("click", () => comanda("t")));
  $$("#pasi [data-pot2]").forEach(b => b.addEventListener("click", () => setPot(+b.dataset.pot2)));
  $$("#pasi [data-p22]").forEach(b => b.addEventListener("click", taiePista));
  $$("#pasi [data-ir2]").forEach(b => b.addEventListener("click", masoaraIR));
  $$("#pasi [data-vit2]").forEach(b => b.addEventListener("click", comutaViteza));
  ghidPasi(PASI, alegePas);
  alegePas(0, false);
}
function alegePas(i) {
  if (i < 0 || i >= PASI.length) return;
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $("#tk-pas-banda").innerHTML = p.banda;
  actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi .pas") || !sim.st) return;
  const m = sim.osc.acq && sim.osc.acq.m; if (m && m.f === 20000 && sim.osc.ch[0].s === "D11") sim.pwmOk = true; if (sim.pwmOk && m && Number.isFinite(m.imed) && m.imed > 0.1 && sim.motor) sim.pwmVazut = true;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ editorul și simularea */
const PROG = { titlu: "clapeta_pid" };
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(v => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${v}</option>`).join("")}</select>`;
function cod() {
  return `${K_("#define")} MOD ${sel("MOD", ["BD", "PID"])}                       ${C_("// BD = buclă deschisă (DC), PID = buclă închisă")}
${K_("const")} ${K_("int")} DC0 = ${sel("DC", ["0", "10", "20", "30"])};                      ${C_("// factorul de umplere inițial în BD [%]")}
${K_("const")} ${K_("float")} TS = ${N_("0.002")}, KP = ${sel("KP", ["1", "2", "4", "6", "8"])}, KI = ${sel("KI", ["0", "10", "20", "40", "60"])}, KD = ${sel("KD", ["0", "0.005", "0.01", "0.02", "0.05"])};
${K_("const")} ${K_("float")} UMAX = ${sel("UMAX", ["60", "100"])};                   ${C_("// ±60 % în primele încercări (NSSM)")}
${K_("const")} ${K_("long")} FPWM = ${sel("FPWM", ["20000", "490"])};                 ${C_("// Hz, Timer1 (ICR1 = 16 MHz / FPWM)")}
${K_("float")} integ = ${N_("0")}, ePrev = ${N_("0")};

${K_("void")} control() {                        ${C_("// apelată la 2 ms (întrerupere timer)")}
  ${K_("float")} U1 = analogRead(A0) * ${N_("5.0")} / ${N_("1023")}, U2 = analogRead(A1) * ${N_("5.0")} / ${N_("1023")};
  ${K_("if")} (fabs(U1 + U2 - ${N_("5.0")}) &gt; ${N_("0.3")} &amp;&amp; ++nDef &gt;= ${N_("5")}) defect = ${K_("true")};  ${C_("// plauzibilitate, 10 ms")}
  ${K_("if")} (defect) { digitalWrite(${N_("10")}, LOW); ${K_("return")}; }         ${C_("// arcul → poziția de avarie")}
  ${K_("float")} theta = (U1 - ${N_("0.5")}) / ${N_("4.0")} * ${N_("100")};         ${C_("// %, din pista 1")}
  ${K_("float")} u;
  ${K_("if")} (MOD == BD) u = dc;                       ${C_("// comanda dNN pe monitorul serial")}
  ${K_("else")} {
    ${K_("float")} e = ref - theta;                    ${C_("// (9.1), ref = A2 sau treapta „t”")}
    integ = constrain(integ + e * TS, ${N_("-20")}, ${N_("20")});   ${C_("// anti-windup")}
    u = KP * e + KI * integ + KD * (e - ePrev) / TS; ePrev = e;  ${C_("// (9.2)")}
  }
  u = constrain(u, -UMAX, UMAX);
  ${K_("if")} (fabs(u) &gt;= UMAX &amp;&amp; (blocaj += TS) &gt; ${N_("2")}) defect = ${K_("true")};  ${C_("// clapetă blocată")}
  setPWM(u);                                    ${C_("// RPWM / LPWM (D11 / D12) după semn")}
}`;
}
function afiseazaCod() {
  $("#tk-cod").innerHTML = cod().split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value; }); });
  $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  if (!sim.capac) return Cadru.mesajTemporar("NSSM: montați capacul de protecție.", "pericol");
  const c = sim.camp; sim.fw = { mod: c.MOD, dc: Number(c.DC), kp: Number(c.KP), ki: Number(c.KI), kd: Number(c.KD), umax: Number(c.UMAX), fpwm: Number(c.FPWM) };
  if (sim.fw.dc > sim.fw.umax) sim.fw.dc = sim.fw.umax;
  sim.run = true; pornesteProgram();
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.pr = null; sim.en = false; sim.uCmd = 0; sim.crono = null;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} (${sim.fw.mod === "BD" ? "buclă deschisă" : `PID ${sim.fw.kp} / ${sim.fw.ki} / ${sim.fw.kd}`}, UMAX ±${sim.fw.umax} %, PWM ${sim.fw.fpwm} Hz)` : "—"; }

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaMAM9(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date || {}, { num }), F = Number.isFinite, cel = { t93: {}, t91: {} };
  MD.POZ.forEach(p => { const a = num(t.t91["p" + p].u1), b = num(t.t91["p" + p].u2); cel.t91["p" + p] = { s: F(a) && F(b) ? fx(a + b, 3) : "" }; });
  ["P", "PI", "PID"].forEach(k => { const x = o.reg[k]; cel.t93[k.toLowerCase()] = { Mp: F(x.Mp) ? fx(x.Mp, 1) : "" }; });
  const serii = [], leg = [];
  ["p", "pi", "pid"].forEach((k, j) => { const r = t.t93[k], g = { kp: num(r.kp), ki: num(r.ki), kd: num(r.kd), umax: 60 };
    if (!F(g.kp) || !F(g.ki) || !F(g.kd) || !P()) return; const lg = (D.log || []).filter(l => l.m === "pas" && l.k === k).pop(); if (lg) g.umax = Number(lg.umax) || 60;
    const pts = MD.raspuns(P(), g).filter((_, i) => i % 3 === 0).map(q => [q[0] * 1000, q[1]]); serii.push({ tip: "linie", pts, culoare: j }); leg.push([`${k.toUpperCase()} (${g.kp} / ${g.ki} / ${g.kd})`, `var(--serie-${j})`]); });
  serii.push({ tip: "linie", pts: [[0, 40], [1000, 40]], culoare: 3 }); leg.push(["ref = 40 %", "var(--serie-3)"]);
  const um = MD.DCS.map(d => [d, num(t.t92["d" + d].um), num(t.t92["d" + d].th), num(t.t92["d" + d].i)]).filter(x => F(x[1]));
  const rez = [
    ["Um = DC/100 · Us (9.5)", um.length ? um.map(x => `DC ${x[0]} %: ${fx(x[1], 2)} V`).join(" · ") : "—"],
    ["Eroarea staționară cu P", F(o.reg.P.est) ? `<span style="color:var(--accent)">${fx(o.reg.P.est, 2)} %</span>` : "—"],
    ["Suprareglajul P / PI / PID", ["P", "PI", "PID"].map(k => F(o.reg[k].Mp) ? fx(o.reg[k].Mp, 1) + " %" : "—").join(" / ")],
    ["Timpul de stabilizare P / PI / PID", ["P", "PI", "PID"].map(k => F(o.reg[k].ts) ? o.reg[k].ts + " ms" : "—").join(" / ")]
  ];
  const verdicte = [];
  if (F(o.reg.P.est)) verdicte.push({ tip: "ok", text: `Regulatorul P lasă eroarea staționară de ${fx(o.reg.P.est, 2)} %: arcul cere un cuplu permanent, deci o eroare care să-l producă (u = Kp·e). Termenul integral o elimină.` });
  if (F(o.reg.PID.Mp)) verdicte.push(o.reg.PID.Mp < 10 && o.reg.PID.ts < 300 ? { tip: "ok", text: `PID îndeplinește criteriile: Mp = ${fx(o.reg.PID.Mp, 1)} % < 10 %, ts = ${o.reg.PID.ts} ms < 300 ms.` } : { tip: "atentie", text: `PID nu îndeplinește încă Mp < 10 % și ts < 300 ms (Mp = ${fx(o.reg.PID.Mp, 1)} %, ts = ${o.reg.PID.ts} ms): măriți Ki (eroarea dată de frecare se elimină mai repede) sau Kd (amortizare).` });
  if (um.length >= 2) verdicte.push({ tip: "ok", text: "În buclă deschisă poziția crește neliniar cu DC: sub un prag clapeta rămâne în poziția de avarie (pretensionarea arcului și frecarea), iar curentul la echilibru este Um/R (motorul oprit, fără t.e.m.)." });
  return { celule: cel, rezultate: rez, verdicte, titluGrafic: "Răspunsurile la treapta 0 → 40 % (modelul standului, cu parametrii din Tabelul 9.3)",
    grafic: { xmin: 0, xmax: 1000, ymin: 0, ymax: 70, xlab: "t [ms]", ylab: "θ [%]", serii }, legenda: leg, principal: { eticheta: "suprareglajul PID [%]", valoare: F(o.MpPID) ? +o.MpPID.toFixed(3) : null } };
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Clapeta are un arc de revenire puternic și lame ascuțite: capacul de protecție se montează înainte de alimentare; nu se introduc degetele în corpul clapetei.</li>
<li>Alimentarea de 12 V trece prin siguranța de 5 A și butonul de oprire de urgență; butonul se testează înainte de prima pornire.</li>
<li>Puntea H și radiatorul se pot încălzi peste 60 °C: nu se ating în timpul funcționării.</li>
<li>Parametrii regulatorului se modifică treptat; la oscilații puternice se oprește imediat alimentarea.</li>
<li>Dioda de protecție la supratensiuni se montează înaintea primei alimentări; motorul nu se deconectează în timpul funcționării.</li></ul></div>
<h2>9.1. Scopul lucrării</h2>
<p>Comanda în buclă închisă a unei clapete electronice auto: identificarea componentelor, comanda motorului de c.c. prin punte H și PWM la frecvență inaudibilă, citirea poziției din cei doi senzori, implementarea regulatorului PID discret și evaluarea răspunsului la treaptă (suprareglaj, timp de stabilizare, eroare staționară); reacția la defectul senzorilor.</p>
<h2>9.2. Noțiuni teoretice</h2>
<p>Clapeta electronică (drive-by-wire) are un motor de c.c. cu reductor, un arc de revenire care o aduce într-o poziție de avarie ușor deschisă (limp-home) și doi senzori de poziție redundanți. ECU calculează poziția dorită din pedală și cuplul cerut, iar regulatorul de poziție comandă motorul prin puntea H cu PWM (Fig. 9.1).</p>
<figure>${fig91()}<figcaption>Fig. 9.1. Bucla de reglare a poziției clapetei</figcaption></figure>
<p>Regulatorul PID discret, cu perioada de eșantionare T<sub>s</sub>, calculează comanda din eroarea de poziție; termenul integral se limitează (anti-windup), iar comanda la ±100 %:</p>
<div class="ec"><span>e<sub>k</sub> = θ<sub>ref</sub> − θ<sub>k</sub></span><span class="nr">(9.1)</span></div>
<div class="ec"><span>u<sub>k</sub> = K<sub>p</sub> · e<sub>k</sub> + K<sub>i</sub> · T<sub>s</sub> · Σ<sub>j=0…k</sub> e<sub>j</sub> + K<sub>d</sub> · (e<sub>k</sub> − e<sub>k−1</sub>) / T<sub>s</sub></span><span class="nr">(9.2)</span></div>
<p>Performanța se apreciază din răspunsul la treaptă: suprareglajul M<sub>p</sub>, timpul de stabilizare t<sub>s</sub> (intrarea definitivă în banda de ±2 %) și eroarea staționară e<sub>st</sub> (Fig. 9.2). Tensiunea medie aplicată motorului este proporțională cu factorul de umplere.</p>
<div class="ec"><span>M<sub>p</sub> = (θ<sub>max</sub> − θ<sub>∞</sub>) / θ<sub>∞</sub> · 100 &nbsp; [%]</span><span class="nr">(9.3)</span></div>
<div class="ec"><span>e<sub>st</sub> = θ<sub>ref</sub> − θ<sub>∞</sub></span><span class="nr">(9.4)</span></div>
<div class="ec"><span>U<sub>m</sub> = DC / 100 · U<sub>s</sub></span><span class="nr">(9.5)</span></div>
<figure>${fig92()}<figcaption>Fig. 9.2. Răspunsul la treaptă cu regulator P, PI și PID (modelul standului, exemplificativ)</figcaption></figure>
<pre class="cod">const float TS = 0.002, KP = 4.0, KI = 20.0, KD = 0.05; float integ = 0, ePrev = 0;
void control() {                        // apelată la 2 ms (întrerupere timer)
  float theta = pozitie();              // %, din pista 1 (plauzibilitate ca în lucrarea 3)
  float e = ref - theta;
  integ = constrain(integ + e * TS, -20, 20);          // anti-windup
  float u = KP * e + KI * integ + KD * (e - ePrev) / TS; ePrev = e;
  u = constrain(u, -100, 100);
  setPWM(u);                            // BTS7960: RPWM / LPWM la 20 kHz, după semn
  if (defectSenzor()) { setPWM(0); }    // arcul aduce clapeta în poziția de avarie
}</pre>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Programul din simulator</b> are două moduri (MOD = BD – buclă deschisă cu comanda dNN; MOD = PID), limitarea comenzii UMAX (±60 % în primele încercări, conform fișei de montaj), protecția la blocare (comanda la limită peste 2 s → punte dezactivată), plauzibilitatea pistelor la fiecare ciclu (|U1 + U2 − 5 V| &gt; 0,3 V timp de 10 ms → EN = LOW) și comanda „t” pentru treapta 0 → 40 % (ref = 0 timp de 0,6 s, apoi 40 % timp de 1 s, înregistrare la 2 ms). Dezactivarea punții (EN = LOW) este reacția sigură; setPWM(0) din codul îndrumarului ar frâna motorul (scurtcircuit prin punte), dar arcul aduce oricum clapeta în poziția de avarie.</li>
<li><b>Pistele.</b> Clapeta are două piste complementare (U1 crește de la ≈ 0,5 V la ≈ 4,5 V, U2 scade invers; U1 + U2 ≈ 5 V). Tabelul 9.1 are în plus suma U1 + U2 – mărimea verificată de plauzibilitate.</li>
<li><b>Curentul din Tabelul 9.2</b> este curentul motorului, citit prin ieșirea IS a punții (A3). La echilibru motorul este oprit (fără t.e.m.), deci I ≈ U<sub>m</sub>/R. Curentul absorbit din sursa de 12 V este de ≈ DC/100 ori mai mic.</li>
<li><b>Acordarea.</b> Cu valorile din îndrumar (Kp = 4, Ki = 20, Kd = 0,05) timpul de stabilizare iese de regulă peste 300 ms: eroarea rămasă din cauza frecării este eliminată lent de termenul integral. Criteriul se atinge mărind Ki (de exemplu 40); Kd prea mare amplifică zgomotul de cuantizare al ADC-ului.</li>
<li><b>PWM 490 Hz.</b> La frecvența implicită analogWrite (490 Hz) perioada (2 ms) este mai mare decât constanta electrică L/R a motorului: curentul pulsează puternic (vizibil pe CH2, IS) și înfășurarea vibrează audibil. La 20 kHz ondulația este de câteva zeci de mA.</li>
<li><b>Tabelele 9.4 (defectul pistei 2) și 9.5 (temperatura după 5 minute)</b> sunt noi; consemnează pașii 6 și 7 din modul de lucru.</li></ul></div>
<h2>9.3. Aparatură și echipamente</h2>
<ul><li>Clapetă electronică auto (din dezmembrări), verificată cu multimetrul, cu capac de protecție imprimat 3D</li>
<li>Punte H BTS7960 (43 A) cu radiator; siguranță de 5 A; diodă TVS P6KE24; buton de oprire de urgență</li>
<li>Sursă de 12 V / 5 A; potențiometru pentru setpoint</li>
<li>Standul de lucru cu Arduino Mega / STM32F103 și afișaj OLED; osciloscop, multimetru, termometru IR</li></ul>
<h2>9.4. Modul de lucru (în simulator)</h2>
<ol><li>Se identifică pinii clapetei și se ridică caracteristica senzorilor rotind manual clapeta cu alimentarea oprită (Tabelul 9.1).</li>
<li>Se montează puntea H și protecțiile; se verifică PWM-ul de 20 kHz pe osciloscop înainte de conectarea motorului.</li>
<li>Buclă deschisă: DC = 10, 20, 30 %, poziția de echilibru și curentul (Tabelul 9.2).</li>
<li>Buclă închisă: regulatorul P, apoi PI și PID; treapta 0 → 40 % înregistrată la 2 ms (Tabelul 9.3); acordarea pentru M<sub>p</sub> &lt; 10 % și t<sub>s</sub> &lt; 300 ms.</li>
<li>Defectul unui senzor (întreruperea pistei 2): oprirea comenzii și revenirea în poziția de avarie (Tabelul 9.4).</li>
<li>Temperatura punții H după 5 minute de funcționare (Tabelul 9.5).</li></ol>
<h2>9.7. Interpretarea rezultatelor</h2>
<ul><li>Regulatorul P lasă o eroare staționară, deoarece arcul cere un cuplu permanent; termenul integral o elimină, dar crește suprareglajul; termenul derivativ amortizează oscilațiile.</li>
<li>Zona din jurul poziției de avarie este neliniară (arcul își schimbă sensul), de aceea regulatoarele reale folosesc compensarea arcului și a frecării.</li>
<li>La defectul unui senzor, reacția sigură este oprirea comenzii: arcul aduce clapeta în poziția de avarie, iar motorul funcționează cu putere redusă.</li></ul>
<h2>9.8. Relevanță practică</h2>
<p>Comanda poziției prin punte H și PID se regăsește la clapetă, supapa EGR, actuatorul turbosuflantei cu geometrie variabilă, frâna de parcare electrică și direcția electrică. Acordarea regulatoarelor și modelarea actuatorilor sunt activități de bază ale inginerilor de calibrare și de dezvoltare.</p>`;
function fig91() {
  const B = (x, y, w, t, s2) => `<rect x="${x}" y="${y}" width="${w}" height="44" rx="6" fill="none" stroke="currentColor"/><text x="${x + w / 2}" y="${y + 20}" text-anchor="middle" font-weight="700">${t}</text><text x="${x + w / 2}" y="${y + 35}" text-anchor="middle" font-size="9">${s2}</text>`;
  const A = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" marker-end="url(#sg9)"/>`;
  return `<svg viewBox="0 0 660 170" class="fig-svg" role="img" aria-label="Fig. 9.1"><defs><marker id="sg9" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="currentColor"/></marker></defs><g font-size="10" fill="currentColor">
    <text x="10" y="44">θref</text>${A(40, 40, 78, 40)}<circle cx="90" cy="40" r="12" fill="none" stroke="currentColor"/><text x="84" y="44">Σ</text><text x="70" y="60">−</text>${A(102, 40, 130, 40)}
    ${B(130, 18, 110, "PID", "Ts = 2 ms")}${A(240, 40, 270, 40)}${B(270, 18, 120, "Punte H + PWM", "BTS7960, 20 kHz")}${A(390, 40, 420, 40)}${B(420, 18, 120, "Motor + clapetă", "arc, frecare")}${A(540, 40, 600, 40)}<text x="604" y="44">θ</text>
    <line x1="570" y1="40" x2="570" y2="130" stroke="currentColor"/>${A(570, 130, 400, 130)}${B(280, 108, 120, "Pistele 1 și 2", "plauzibilitate")}<line x1="280" y1="130" x2="90" y2="130" stroke="currentColor"/>${A(90, 130, 90, 53)}</g></svg>`;
}
function fig92() {
  const p = MD.parametri(20261030), X0 = 50, W = 560, x = t => X0 + t * W, y = v => 190 - v * 3.2;
  const L = (pts, c) => `<path d="M${pts.filter((_, i) => i % 3 === 0).map(q => x(q[0]).toFixed(1) + "," + y(q[1]).toFixed(1)).join(" L")}" fill="none" stroke="${c}" stroke-width="1.8"/>`;
  const s = [[{ kp: 4, ki: 0, kd: 0, umax: 100 }, "#c0492b", "P"], [{ kp: 8, ki: 40, kd: 0, umax: 100 }, "#1f5f9e", "PI"], [{ kp: 4, ki: 40, kd: 0.05, umax: 100 }, "#2e7d32", "PID"]];
  return `<svg viewBox="0 0 660 230" class="fig-svg" role="img" aria-label="Fig. 9.2"><g font-size="10" fill="currentColor"><line x1="${X0}" y1="${y(40)}" x2="${X0 + W}" y2="${y(40)}" stroke="currentColor" stroke-dasharray="4 3"/>
    ${[0, 20, 40].map(v => `<text x="${X0 - 6}" y="${y(v) + 3}" text-anchor="end">${v} %</text>`).join("")}${[0, 0.25, 0.5, 0.75, 1].map(t => `<text x="${x(t)}" y="212" text-anchor="middle">${t * 1000} ms</text>`).join("")}
    ${s.map(([g, c]) => L(MD.raspuns(p, g), c)).join("")}${s.map(([, c, n], i) => `<text x="${X0 + 300 + i * 70}" y="226" fill="${c}">${n}</text>`).join("")}<text x="${X0 + 8}" y="226">ref = 40 % (întrerupt)</text></g></svg>`;
}
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Cu PID, la treapta 0 → 40 %, se înregistrează θ<sub>max</sub> = 41,2 % și θ<sub>∞</sub> = 40,0 %; cu P se stabilizează la 35,2 %; în buclă deschisă, DC = 20 % la 12 V:</p>
<div class="ec"><span>M<sub>p</sub> = (41,2 − 40,0) / 40,0 · 100 = 3 %</span><span class="nr">(9.6)</span></div>
<div class="ec"><span>e<sub>st,P</sub> = 40,0 − 35,2 = 4,8 %</span><span class="nr">(9.7)</span></div>
<div class="ec"><span>U<sub>m</sub> = 0,20 · 12 = 2,4 V</span><span class="nr">(9.8)</span></div>
<div class="problema"><h3>Problema 1</h3><p>La DC = 25 % și U<sub>s</sub> = 12 V, motorul clapetei (R = 1,6 Ω) este oprit în poziția de echilibru. Ce curent absoarbe motorul și ce curent mediu din sursă?</p><details class="sol"><summary>Rezolvare</summary><p>U<sub>m</sub> = 0,25 · 12 = 3 V; I<sub>m</sub> = 3/1,6 = 1,875 A (fără t.e.m.); din sursă curge numai în faza „on”: I<sub>s</sub> ≈ 0,25 · 1,875 = 0,47 A.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Cu P (K<sub>p</sub> = 4 %/%), eroarea staționară este 5 %. Ce comandă dă regulatorul și de ce este necesară?</p><details class="sol"><summary>Rezolvare</summary><p>u = 4 · 5 = 20 % – tocmai comanda care produce cuplul necesar pentru a ține clapeta contra arcului la 35 %. Fără eroare nu ar exista comandă, deci P are întotdeauna e<sub>st</sub> ≠ 0 la o sarcină permanentă.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Timer1 al plăcii Mega (16 MHz, prescaler 1, mod PWM cu ICR1) trebuie să genereze 20 kHz. Ce valoare are ICR1 și ce rezoluție are factorul de umplere?</p><details class="sol"><summary>Rezolvare</summary><p>În modul fast PWM: ICR1 = 16·10<sup>6</sup>/20 000 − 1 = 799 → 800 de trepte, rezoluția 0,125 % (≈ 9,6 biți).</p></details></div>`;
}
const INTREBARI = [
  ["De ce clapeta are un arc de revenire și o poziție de avarie?", "Pentru siguranță: la orice defect (senzor, punte, ECU, alimentare) comanda motorului se întrerupe, iar arcurile aduc clapeta într-o poziție fixă, ușor deschisă (limp-home), care permite mersul la ralanti ridicat sau cu putere redusă până la service, fără accelerare necontrolată și fără oprirea motorului."],
  ["Care este rolul fiecărui termen al regulatorului PID?", "P – comandă proporțională cu eroarea (rapiditate), dar lasă eroare staționară la sarcină permanentă (arcul); I – integrează eroarea și o elimină în regim staționar, dar mărește suprareglajul și poate produce windup (de aceea se limitează); D – reacționează la viteza de variație a erorii, amortizează oscilațiile, dar amplifică zgomotul."],
  ["De ce PWM-ul se generează la 20 kHz și nu la 490 Hz?", "La 490 Hz perioada (≈ 2 ms) este comparabilă cu constanta electrică a motorului: curentul pulsează puternic, apar zgomot audibil (fluierat), vibrații, pierderi și o comandă mai puțin netedă. La 20 kHz frecvența este peste pragul auditiv, iar inductivitatea netezește curentul (ondulație de zeci de mA)."],
  ["Calculați suprareglajul pentru θmax = 46 % și θ∞ = 40 %.", "M<sub>p</sub> = (46 − 40)/40 · 100 = 15 %."],
  ["Ce reacție trebuie să aibă ECU la pierderea semnalului de poziție?", "Să detecteze defectul prin plauzibilitatea celor două piste, să oprească comanda punții (clapeta revine în poziția de avarie), să memoreze un cod de defect și să aprindă martorul, să limiteze cuplul / turația motorului (mod de avarie) și să nu reactiveze comanda până la ștergerea defectului."]
];
const TEST = [
  { q: "Poziția de avarie (limp-home) a clapetei este:", o: ["complet închisă", "ușor deschisă, dată de arcuri", "complet deschisă", "poziția ultimei comenzi"], c: 1, e: "Arcurile aduc clapeta într-o poziție ușor deschisă când comanda lipsește." },
  { q: "Tensiunea medie la DC = 30 % și 12 V este:", o: ["0,36 V", "3,6 V", "4 V", "12 V"], c: 1, e: "U<sub>m</sub> = 0,30 · 12 = 3,6 V." },
  { q: "Regulatorul P aplicat clapetei:", o: ["nu are eroare staționară", "lasă o eroare staționară din cauza arcului", "oscilează întotdeauna", "nu poate închide clapeta"], c: 1, e: "Arcul cere comandă permanentă, deci o eroare permanentă." },
  { q: "Termenul integral se limitează (anti-windup) pentru:", o: ["a reduce zgomotul", "a evita acumularea erorii când comanda este saturată", "a crește frecvența PWM", "a citi ambele piste"], c: 1, e: "Altfel integrala crește mult la saturație și produce suprareglaj mare." },
  { q: "Plauzibilitatea celor două piste complementare verifică:", o: ["U1 = U2", "U1 + U2 ≈ 5 V", "U1 > 4,5 V", "U2 = 0"], c: 1, e: "Pistele variază invers; suma lor este constantă." },
  { q: "Înainte de prima alimentare a punții se montează:", o: ["numai motorul", "capacul de protecție și dioda TVS, cu urgența testată", "osciloscopul", "nimic"], c: 1, e: "NSSM." }
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
Cadru.porneste({
  disc: "MAM1", nr: 9, cod: "mam1-l9",
  titlu: "Clapeta electronică de accelerație: punte H, comandă PWM și regulator PID",
  scurt: "Clapeta electronică: PWM și PID",
  subtitlu: "Laborator virtual – clapeta auto cu motor de c.c., arc și două piste, puntea BTS7960 la 20 kHz, protecțiile (siguranță, urgență, TVS, capac), Arduino Mega cu regulatorul PID la 2 ms: caracteristica senzorilor, bucla deschisă, răspunsul la treaptă P / PI / PID, defectul senzorului și încălzirea punții",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261030); },
  date: [{ k: "us", et: "U<sub>s</sub> nominal [V]", v: 12, fix: true }, { k: "ts", et: "T<sub>s</sub> [ms]", v: 2, fix: true }, { k: "ref", et: "treapta [%]", v: 40, fix: true }],
  tabele: [
    { id: "t91", titlu: "Tabelul 9.1. Senzorii clapetei", antetRand: "Poziția clapetei", nota: "Fără 12 V, clapeta rotită cu mâna; multimetrul pe pista 1 (A0) și pista 2 (A1), senzorii alimentați la 5 V de placă. U1 + U2 – mărimea verificată de plauzibilitate.",
      randuri: MD.POZ.map(p => ({ k: "p" + p, et: p === 0 ? "închisă" : p === 100 ? "deschisă" : p + " %" })),
      coloane: [{ k: "u1", t: "U1 [V]", intrare: true }, { k: "u2", t: "U2 [V]", intrare: true }, { k: "s", t: "U1 + U2 [V]" }] },
    { id: "t92", titlu: "Tabelul 9.2. Buclă deschisă", antetRand: "Factor de umplere", nota: "Um – multimetrul pe M+ / M− (valoarea medie); θ – poziția de echilibru din program; I – curentul motorului (IS, A3).",
      randuri: MD.DCS.map(d => ({ k: "d" + d, et: `DC = ${d} %` })),
      coloane: [{ k: "um", t: "Um [V]", intrare: true }, { k: "th", t: "θ echilibru [%]", intrare: true }, { k: "i", t: "I [A]", intrare: true }] },
    { id: "t93", titlu: "Tabelul 9.3. Răspunsul la treapta 0 → 40 %", antetRand: "Regulator", nota: "Valorile din program (eșantioane la 2 ms, 1 s după treaptă): θ∞ = media ultimelor 200 ms; ts – intrarea definitivă în banda ±2 % din θ∞; e<sub>st</sub> = 40 − θ∞; M<sub>p</sub> din (9.3).",
      randuri: [{ k: "p", et: "P" }, { k: "pi", et: "PI" }, { k: "pid", et: "PID" }],
      coloane: [{ k: "kp", t: "Kp", intrare: true }, { k: "ki", t: "Ki", intrare: true }, { k: "kd", t: "Kd", intrare: true }, { k: "thMax", t: "θmax [%]", intrare: true }, { k: "Mp", t: "Mp [%]" }, { k: "ts", t: "ts [ms]", intrare: true }, { k: "est", t: "e<sub>st</sub> [%]", intrare: true }] },
    { id: "t94", titlu: "Tabelul 9.4. Defectul senzorului (pista 2 întreruptă)", antetRand: "Defect", nota: "Timpul de la întrerupere până la dezactivarea punții (EN = LOW); poziția în care arcul aduce clapeta; comanda după defect.",
      randuri: [{ k: "p2", et: "pista 2 întreruptă" }],
      coloane: [{ k: "tr", t: "Timp de reacție [ms]", intrare: true }, { k: "th", t: "θ avarie [%]", intrare: true }, { k: "u", t: "Comanda după defect [%]", intrare: true }] },
    { id: "t95", titlu: "Tabelul 9.5. Temperatura după 5 minute (PID, θ = 40 %)", antetRand: "Componentă", nota: "Termometrul IR, la începutul și la sfârșitul celor 5 minute; radiatorul punții trebuie să rămână sub 60 °C.",
      randuri: [{ k: "rad", et: "radiatorul BTS7960" }, { k: "mot", et: "carcasa motorului" }],
      coloane: [{ k: "t0", t: "T inițial [°C]", intrare: true }, { k: "t5", t: "T după 5 min [°C]", intrare: true }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaMAM9,
  intrebari() {
    return [
      { id: "q1", u: "%", text: "Suprareglajul pentru θmax = 46 % și θ∞ = 40 % (Întrebarea 4):", textSimplu: "Mp pentru 46 / 40 %" },
      { id: "q2", u: "%", text: "Eroarea staționară cu regulatorul P (Tabelul 9.3):", textSimplu: "e<sub>st</sub> cu P" },
      { id: "q3", u: "%", text: "Suprareglajul obținut cu PID (Tabelul 9.3):", textSimplu: "Mp cu PID" },
      { id: "q4", u: "V", text: "Tensiunea medie la DC = 20 % și 12 V (9.8):", textSimplu: "Um la 20 %" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = MD.POZ.filter(p => t.t91["p" + p].u1 !== "" && t.t91["p" + p].u2 !== "").length; if (a < 5) l.push(`Tabelul 9.1: ${a}/5 poziții`);
    const b = MD.DCS.filter(d => t.t92["d" + d].th !== "").length; if (b < 3) l.push(`Tabelul 9.2: ${b}/3 regimuri`);
    const c = ["p", "pi", "pid"].filter(k => t.t93[k].thMax !== "").length; if (c < 3) l.push(`Tabelul 9.3: ${c}/3 regulatoare`);
    if (t.t94.p2.tr === "") l.push("Tabelul 9.4: defectul senzorului");
    if (t.t95.rad.t5 === "") l.push("Tabelul 9.5: temperatura după 5 min");
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t93.pid, { kp: "4", ki: "20", kd: "0.05", thMax: "41.20", ts: "250", est: "0.00" }); Object.assign(t.t93.p, { kp: "4", ki: "0", kd: "0", thMax: "35.40", ts: "60", est: "4.80" }); t.t92.d20.um = "2.400"; },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul la scară reală: clapeta electronică pe suportul metalic, cu capacul de protecție, puntea BTS7960 cu radiator, sursa de 12 V, siguranța și butonul de oprire de urgență, dioda TVS, potențiometrul de setpoint, Arduino Mega cu OLED, osciloscopul, multimetrul și laptopul. Placa clapetei se rotește cu poziția din simulator; ecranele sunt cele din planșă.</p>`,
    modul: "montaj3d.js?v=2", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, -14, 1300, 814], construieste: L => montaj3dL9(L), cam: VEDERI.tot[0], tinta: VEDERI.tot[1], laClic: k => laClic3d(k),
      vederi: { tot: [...VEDERI.tot, "Ansamblu"], clapeta: [...VEDERI.clapeta, "Clapeta"], bts: [...VEDERI.bts, "Puntea H"], osc: [...VEDERI.osc, "Osciloscopul"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Clapeta electronică pe motor",
    intro: `<p>Clapeta electronică este montată pe galeria de admisie, după filtrul de aer și intercooler; ECU (calculatorul de motor) o comandă printr-o punte H integrată, din poziția pedalei de accelerație (APP, lucrarea 3) și din cuplul cerut, și verifică permanent plauzibilitatea celor două piste. Selectați clapeta în machetă: amplasarea, mufa și semnalele.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "tps" })
  },
  atelierSenzori: { intro: `<p>Clapeta electronică este preselectată: modelul 3D, mufa și verificările (rezistența motorului, cele două piste, poziția de avarie, adaptarea după curățare). Puteți alege și alți senzori din listă.</p>`, optiuni: { initial: "tps" } },
  referat: {
    scop: "Comanda în buclă închisă a clapetei electronice: caracteristica senzorilor, PWM prin punte H, bucla deschisă, regulatoarele P, PI și PID, reacția la defectul senzorului și încălzirea punții.",
    relatii: "e<sub>k</sub> = θ<sub>ref</sub> − θ<sub>k</sub>; &nbsp; u<sub>k</sub> = K<sub>p</sub>e<sub>k</sub> + K<sub>i</sub>T<sub>s</sub>Σe<sub>j</sub> + K<sub>d</sub>(e<sub>k</sub> − e<sub>k−1</sub>)/T<sub>s</sub>; &nbsp; M<sub>p</sub> = (θ<sub>max</sub> − θ<sub>∞</sub>)/θ<sub>∞</sub>·100; &nbsp; e<sub>st</sub> = θ<sub>ref</sub> − θ<sub>∞</sub>; &nbsp; U<sub>m</sub> = DC/100·U<sub>s</sub>.",
    varianta: () => "Exemplarul propriu al fiecărui student: rezistența, inductivitatea și constanta t.e.m. a motorului, arcurile (rigiditatea și pretensionarea de o parte și de alta a poziției de avarie), frecarea, erorile celor două piste, tensiunea sursei și comportarea termică a radiatorului și a motorului.",
    indicatii: "Comparați caracteristicile pistelor, neliniaritatea buclei deschise (pragul dat de arc), răspunsurile P / PI / PID și eroarea staționară, parametrii aleși la acordare, reacția la defect și temperatura punții…"
  },
  subsol: "Modelul: motor de c.c. (R, L, t.e.m.), arcuri cu pretensionare de o parte și de alta a poziției de avarie, frecare uscată și vâscoasă, opritoare, piste complementare cu erori, punte BTS7960 (tensiune medie), PID la 2 ms cu anti-windup, ADC de 10 biți, modele termice de ordinul 1. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      ${ghidSectiune()}
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Stand</b> · MAM I – Lucrarea 9</span>
        <button type="button" id="tk-fit" title="Închide fereastra de detalii">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div><div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-pompa" id="tk-pompa"></div>
      <div class="tk-osc" id="tk-osc"></div>
      <div class="tk-afis" id="afis"></div>
      <p class="tk-ajutor">Clic pe capac, pe butonul de urgență, pe sursă, pe dioda TVS, pe conectorul clapetei (motor), pe multimetru, pe termometrul IR · clic pe D11 / D12 (CH1) și pe IS (CH2) · comenzile programului: dNN, t (butoane sau monitorul serial). Montajul real în 3D este în fila „Montajul real (3D)”.</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – Arduino Mega 2560</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite (de ex. d20 sau t)" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div>
          <div class="tk-cod-sus"><b>Plotter serial – poziția și comanda</b></div>
          <canvas id="tk-plot" aria-label="Plotterul serial: poziția, referința și comanda"></canvas></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Programul și mesajele</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Lucrați în ordinea pașilor din chenarul de deasupra planșei. Valorile intră în tabele numai din aparate (multimetru, osciloscop, termometru IR) și din program.</p>
    </aside>
  </div>`,
    init(C) {
      init(); afiseazaCod(); actualizeazaFw(); oscCtl(); actualizeaza();
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
    reset() { if (sim.run && $("#tk-start")) opresteSim(); Object.assign(sim, { serial: [], ist: [], st: null, alim: false, estop: false, mana: null, defP2: false, pot: 0, viteza: 1, mm: "off", ir: null, crono: null, en: false, uCmd: 0, pwmOk: false, pwmVazut: false }); init(); },
    cadru(dt, C, vizibil) {
      init(); const acum = performance.now(); let rest = Math.min(dt || 0.016, 0.1) * sim.viteza;
      while (rest > 1e-9) { const d = Math.min(DTF, rest); rest -= d; sim.tS += d; if (sim.run && sim.pr) { sim.pr.tAcc += d; while (sim.pr && sim.pr.tAcc >= TS) { sim.pr.tAcc -= TS; cicluProgram(); } } pasFizic(d); }
      if (sim.crono) { sim.crono.i2 += sim.st.i * sim.st.i * dt * sim.viteza; sim.crono.n += dt * sim.viteza; }
      if (!vizibil) { if (C.tabActiv === "anim" && acum - (this._t3 || 0) > 120) { this._t3 = acum; achizitie(); planseAfis(); sincron3d(); } return; }
      if (acum - (this._to || 0) > 120) { this._to = acum; achizitie(); planseAfis(); }
      if (acum - (this._ts || 0) > 350) { this._ts = acum; afisaje(); plotter(); sincron3d(); actualizeazaPasi(); panouDacaSchimbat();
        C.stare(1, sim.run ? "programul rulează" : "programul oprit", sim.run ? "inc" : ""); C.stare(2, `θ ≈ ${fx(sim.st.th, 1)} % · I ${fx(Math.abs(sim.st.i), 2)} A`); }
    },
    redeseneaza() { plotter(); },
    formule() {
      const r = [], v = sim.pr && sim.pr.last; if (!v) return r;
      r.push(["Tensiunea medie (9.5)", `U<sub>m</sub> = ${fx(Math.abs(v.u), 1)}/100 · ${fx(Ub(), 2)} = <span class="rez">${fx(Math.abs(v.u) / 100 * Ub(), 2)} V</span>`]);
      if (Number.isFinite(v.ref)) r.push(["Eroarea (9.1)", `e = ${fx(v.ref, 1)} − ${fx(v.th, 2)} = <span class="rez">${fx(v.ref - v.th, 2)} %</span>`]);
      const t = sim.pr.rez.t; if (t) r.push(["Suprareglajul (9.3)", `M<sub>p</sub> = (${fx(t.thMax, 2)} − ${fx(t.thInf, 2)})/${fx(t.thInf, 2)} · 100 = <span class="rez">${fx(t.Mp, 1)} %</span>`]);
      return r;
    }
  }
});
let _panouK = "";
function panouDacaSchimbat() { const k = [sim.capac, sim.tvs, sim.motor, sim.estop, sim.alim, sim.mana, sim.mm, sim.pot, sim.defP2, sim.viteza, sim.run].join(); if (k !== _panouK) { _panouK = k; panou(); } }

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL9(L) {
  const { THREE, V3, mm, M } = L, R = 0xe53935, N = 0x222222;
  const mat = o => new THREE.MeshStandardMaterial(o);
  const CX = -0.36, CY = 0.12, CZ = 0.06;
  /* suportul metalic, corpul clapetei, gura, placa rotativă, motorul și conectorul */
  const S = L.grup([CX, 0, CZ]);
  L.box(0.2, mm(6), 0.14, M.otel, S, 0, mm(3), 0, mm(1)); L.box(mm(6), CY + mm(30), 0.12, M.otel, S, -0.07, (CY + mm(30)) / 2, 0, mm(1));
  const corp = L.box(0.1, 0.12, 0.09, M.alu, S, 0, CY, 0, mm(10)); L.k_(corp, "clapeta", "Clapeta electronică (corp din aluminiu)");
  const gura = L.cyl(mm(34), mm(34), 0.095, mat({ color: 0x20242a, roughness: 0.6, side: THREE.DoubleSide }), S, 0, CY, 0, "z", 40); L.k_(gura, "clapeta", "Gura clapetei (Ø 68 mm)");
  const PG = new THREE.Group(); PG.position.set(CX, CY, CZ); L.sc.add(PG);
  const placa = L.cyl(mm(33), mm(33), mm(2), mat({ color: 0xb0b6bc, roughness: 0.3, metalness: 0.8 }), PG, 0, 0, 0, "z", 40); L.k_(placa, "clapeta", "Placa clapetei (se rotește cu poziția)");
  L.cyl(mm(3), mm(3), 0.11, M.crom, PG, 0, 0, 0, "x", 12);
  const mot = L.cyl(mm(16), mm(16), mm(55), M.gri, S, mm(10), CY - mm(52), mm(30), "x", 28); L.k_(mot, "motor", "Motorul de c.c. al clapetei (cu reductor)");
  const con = L.box(mm(26), mm(16), mm(20), M.negru, S, mm(30), CY + mm(62), mm(20), mm(2)); L.k_(con, "conector", "Conectorul clapetei: M+, M−, 5 V, GND, pista 1, pista 2");
  const cap = L.box(0.11, mm(4), 0.1, new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, roughness: 0.05, transmission: 0.9, thickness: 0.003, transparent: true, opacity: 0.3, depthWrite: false }), S, 0, CY + mm(62), 0, mm(3));
  L.k_(cap, "capac", "Capacul de protecție imprimat 3D pe gura clapetei"); cap.castShadow = false;
  /* oprirea de urgență, sursa, puntea BTS7960, potențiometrul */
  const E = L.grup([-0.16, 0, 0.16]);
  L.box(mm(68), mm(68), mm(68), M.galben, E, 0, mm(34), 0, mm(4)); const ciup = L.cyl(mm(22), mm(20), mm(16), M.rosu, E, 0, mm(76), 0, "y", 32); L.k_(ciup, "estop", "Butonul de oprire de urgență (NC pe linia de 12 V)");
  const PS = L.sursaDubla([-0.5, 0, -0.26], { ecrane: [[414, 190, 92, 36]], et: "Sursă de laborator 12 V / 5 A" });
  const B = L.grup([-0.1, 0, -0.06]);
  const bt = L.box(mm(50), mm(1.6), mm(50), M.rosu, B, 0, mm(10), 0, mm(0.5)); L.k_(bt, "bts", "Puntea H BTS7960 (43 A) cu radiator; RPWM D11, LPWM D12, EN D10, IS A3");
  const rad = L.box(mm(44), mm(22), mm(40), M.alu, B, 0, mm(22), 0, mm(1)); L.k_(rad, "bts", "Radiatorul punții (clic pe termometrul IR pentru temperatură)");
  for (let i = 0; i < 8; i++) L.box(mm(2), mm(14), mm(40), M.alu, B, mm(-19 + i * 5.4), mm(38), 0, mm(0.3));
  const tvs = L.cyl(mm(2.5), mm(2.5), mm(8), M.negru, B, mm(-30), mm(12), mm(18), "x", 12); L.k_(tvs, "tvs", "Dioda TVS P6KE24 pe alimentarea punții");
  const sg = L.box(mm(30), mm(14), mm(14), M.gri, L.sc, -0.22, mm(7), -0.12, mm(2)); L.k_(sg, "sig", "Siguranța de 5 A pe linia de 12 V");
  const POT = L.grup([0.04, 0, 0.17]); L.box(mm(40), mm(16), mm(40), M.griDes, POT, 0, mm(8), 0, mm(3));
  const KN = new THREE.Group(); KN.position.set(0, mm(22), 0); POT.add(KN);
  const kn = L.cyl(mm(12), mm(13), mm(12), M.negruMat, KN, 0, 0, 0, "y", 28); L.k_(kn, "pot", "Potențiometrul de setpoint (A2)");
  L.box(mm(2), mm(2), mm(10), M.alb, KN, 0, mm(6.5), mm(-5), mm(0.5));
  /* Arduino Mega, OLED, laptopul, osciloscopul, multimetrul */
  const MG = L.arduinoMega([0.17, 0, 0.1]), OL = L.oled([0.33, 0, 0.14], { ecran: [940, 324, 210, 132] });
  const PC = L.laptop([0.47, 0, -0.18], { roty: -0.4, cod: () => L.textCod(), titlu: () => "PlatformIO – clapeta_pid.cpp" });
  L.cabluUSB(MG.pin("D0").clone().set(0.17 - 0.06, 0.009, 0.085), PC.usb);
  const O = L.osciloscop([0.06, 0, -0.24], { ecran: [40, 458, 416, 296] });
  const DM = L.multimetru([0.3, 0, -0.06], { ecran: [624, 456, 132, 54], et: "Multimetru digital (U1, U2, Um)" });
  /* firele și cablurile */
  const pinB = i => L.lume(B, V3(mm(-18 + i * 6), mm(11), mm(24)));
  [["D11", 0xffeb3b], ["D12", 0xff9800], ["D10", 0x8e24aa], ["A3", 0x1fb6ff], ["5V", R], ["GND", N]].forEach(([n, c], i) => L.fir(pinB(i), MG.pin(n), c, { h: 34 }));
  const pc = i => L.lume(S, V3(mm(30 - 8 + i * 4), CY + mm(70), mm(20)));
  [["5V", R], ["GND2", N], ["A0", 0x43a047], ["A1", 0x1e88e5]].forEach(([n, c], i) => L.fir(pc(i + 2), MG.pin(n), c, { h: 60 }));
  L.tub([pc(0), V3(CX + 0.06, CY + 0.1, CZ + 0.04), V3(-0.18, 0.06, -0.02), L.lume(B, V3(mm(-25), mm(12), mm(-10)))], mm(1.8), mat({ color: 0xc62828, roughness: 0.6 }));
  L.tub([pc(1), V3(CX + 0.07, CY + 0.09, CZ + 0.05), V3(-0.17, 0.05, -0.01), L.lume(B, V3(mm(-25), mm(12), mm(0)))], mm(1.8), M.negru);
  L.cablu(PS.borne[0], sg.position.clone().add(V3(mm(-15), 0, 0)), R, { burta: 0.04 }); L.cablu(sg.position.clone().add(V3(mm(15), 0, 0)), L.lume(E, V3(0, mm(10), mm(-34))), R, { burta: 0.05 });
  L.cablu(L.lume(E, V3(mm(20), mm(10), mm(-34))), L.lume(B, V3(mm(25), mm(12), mm(-10))), R, { burta: 0.03 }); L.cablu(PS.borne[2], L.lume(B, V3(mm(25), mm(12), mm(10))), N, { burta: 0.03 });
  L.fir(L.lume(POT, V3(0, mm(16), mm(20))), MG.pin("A2"), 0x00897b, { h: 26 });
  [[0, "5V", R], [1, "GND", N], [2, "D20", 0x1e88e5], [3, "D21", 0x43a047]].forEach(([i, n, c]) => L.fir(OL.pin(i), MG.pin(n), c, { h: 26 }));
  /* sondele */
  const TPS = { D11: () => MG.pin("D11"), D12: () => MG.pin("D12"), IS: () => pinB(3) };
  const sd = [L.sonda(O.ch[0], 0xf2d600, V3(0.0, 0.003, -0.1), { osc: true, et: "Sonda CH1 a osciloscopului" }), L.sonda(O.ch[1], 0x1fb6ff, V3(0.08, 0.003, -0.1), { osc: true, et: "Sonda CH2 a osciloscopului" })];
  const vm = [L.sonda(DM.com, 0x111111, V3(0.26, 0.003, 0.02), { et: "Sonda COM a multimetrului" }), L.sonda(DM.v, 0xd32f2f, V3(0.3, 0.003, 0.02), { et: "Sonda V a multimetrului" })];
  return { actualizeaza() {
    if (!sim.st) return;
    PG.rotation.x = -(3 + sim.st.th * 0.85) * Math.PI / 180;
    cap.visible = sim.capac; ciup.position.y = sim.estop ? mm(70) : mm(76); tvs.visible = sim.tvs;
    KN.rotation.y = -(-135 + 270 * sim.pot / 100) * Math.PI / 180;
    MG.led("ON", sim.run ? 1 : 0); MG.led("TX", sim.run && performance.now() - sim.tx < 80 ? 1 : 0); MG.led("L", sim.en ? 0.6 : 0);
    sd.forEach((x, i) => { const f = TPS[sim.osc.ch[i].s]; x.muta(f ? f() : null); });
    const mp = { U1: [pc(4), pc(3)], U2: [pc(5), pc(3)], Um: [pc(0), pc(1)] }[sim.mm];
    vm[0].muta(mp ? mp[1] : null); vm[1].muta(mp ? mp[0] : null);
    DM.mod(sim.mm === "off" ? "OFF" : "V");
  } };
}
