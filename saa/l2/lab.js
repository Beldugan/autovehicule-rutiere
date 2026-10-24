/* SAA – Lucrarea 2. Modelarea duratei de injecție pe baza debitului de aer – aplicație virtuală (instrument virtual tip LabVIEW).
   Panoul frontal (comenzi și indicatoare), diagrama bloc cu valorile pe fire și execuție evidențiată, graficul t_i = f(n)
   cu valorile măsurate la lucrarea 1, harta η_v. Fișa postului (q_s, t_mort, citirile din Tabelul 1.2) este individuală. */
"use strict";
const MD2 = MODELE["saa-l2"];
const { CHEI, ET, SENS, CHEI_SENS, COMB } = MD2;

/* ------------------------------------------------------------------ starea instrumentului virtual */
const vi = {
  c: { p: 35, n: 800, Vs: 350, Ta: 313, ev: 0.65, lam: 1, U: 14, comb: "benzina", qs: 2.5, tm0: 0.8 },   // comenzile (exemplul din îndrumar)
  rez: null, rezIn: null, rulare: "cont", vedere: "panou", evid: false, k: "ral", tEvid: 0, nExec: 0
};
function P() { return Cadru.P; }
function L0() { return COMB[vi.c.comb].L0; }
function intrariCurente() { const c = vi.c; return { p: c.p, n: c.n, Vs: c.Vs, Ta: c.Ta, ev: c.ev, lam: c.lam, U: c.U, L0: L0(), qs: c.qs, tm0: c.tm0 }; }
function executa() {
  vi.rezIn = intrariCurente(); vi.rez = MD2.calcul(vi.rezIn); vi.nExec++;
  if (vi.evid) vi.tEvid = performance.now();
  afiseaza();
}
const rot = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
function eroare(k) { const f = P().fisa[k]; return vi.rez ? (vi.rez.ti - f.ti) / f.ti * 100 : NaN; }

/* ------------------------------------------------------------------ panoul frontal */
const CSS = `<style>
.lv { --lv-panou:#d6d3ce; --lv-cadru:#9a968f; --lv-txt:#1b1b1b; --lv-ctl:#f7f7f2; --lv-ind:#e6edf5; --lv-fir:#ff7a1a; color:var(--lv-txt); }
.lv-fereastra { border:1px solid #6b6f75; border-radius:8px; overflow:hidden; background:var(--lv-panou); box-shadow:0 2px 10px rgba(0,0,0,.18); }
.lv-titlu { display:flex; align-items:center; gap:.5rem; background:linear-gradient(#3e5f8f,#2c4a75); color:#fff; padding:.3rem .6rem; font-size:.82rem; }
.lv-titlu b { font-weight:600; } .lv-titlu span { opacity:.75; margin-left:auto; }
.lv-meniu { display:flex; gap:1rem; padding:.2rem .6rem; font-size:.78rem; background:#ecebe8; border-bottom:1px solid #b9b5ae; color:#333; }
.lv-unelte { display:flex; align-items:center; gap:.35rem; padding:.3rem .5rem; background:#e2e0dc; border-bottom:1px solid #b9b5ae; flex-wrap:wrap; }
.lv-unelte button { min-width:34px; height:30px; padding:0 .45rem; border:1px solid #8d8a84; border-radius:4px; background:linear-gradient(#fbfbfa,#dcdad5); color:#222; font-size:.9rem; cursor:pointer; }
.lv-unelte button[aria-pressed="true"] { background:linear-gradient(#cfe0f5,#a9c3e6); border-color:#4f74a8; }
.lv-unelte .sep { width:1px; height:24px; background:#aaa; margin:0 .2rem; }
.lv-unelte .lv-tab { margin-left:auto; display:flex; gap:0; } .lv-unelte .lv-tab button { border-radius:0; } .lv-unelte .lv-tab button:first-child { border-radius:4px 0 0 4px; } .lv-unelte .lv-tab button:last-child { border-radius:0 4px 4px 0; }
.lv-panou { padding:.7rem; display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:.7rem; background:var(--lv-panou); }
.lv-grup { border:1px solid var(--lv-cadru); border-radius:6px; padding:.55rem .6rem .6rem; background:rgba(255,255,255,.28); position:relative; }
.lv-grup > h4 { position:absolute; top:-.65rem; left:.5rem; margin:0; padding:0 .3rem; font-size:.74rem; font-weight:700; background:var(--lv-panou); color:#3b3b3b; }
.lv-ctl { display:grid; grid-template-columns:1fr auto; align-items:center; gap:.25rem .4rem; margin:.35rem 0; font-size:.8rem; }
.lv-ctl label { font-weight:600; }
.lv-num { display:inline-flex; align-items:stretch; border:1px solid #7d7a74; border-radius:3px; background:var(--lv-ctl); }
.lv-num input { width:5.4rem; border:0; background:transparent; padding:.18rem .3rem; font:600 .85rem/1.2 ui-monospace,Consolas,monospace; color:#111; text-align:right; }
.lv-num .sp { display:flex; flex-direction:column; border-left:1px solid #9b978f; }
.lv-num .sp button { flex:1; width:16px; border:0; background:#e7e5e0; font-size:.5rem; line-height:1; padding:0; cursor:pointer; color:#333; }
.lv-num .sp button:hover { background:#d0dff2; }
.lv-num select { border:0; background:transparent; font:600 .8rem ui-monospace,Consolas,monospace; color:#111; padding:.15rem .2rem; }
.lv-ind { display:inline-block; min-width:5.4rem; border:1px solid #7d7a74; border-radius:3px; background:var(--lv-ind); padding:.18rem .3rem; font:600 .85rem/1.2 ui-monospace,Consolas,monospace; text-align:right; color:#0d2a4f; }
.lv-slide { grid-column:1/-1; display:flex; align-items:center; gap:.4rem; }
.lv-slide input[type=range] { flex:1; accent-color:#3e5f8f; }
.lv-slide small { font:.68rem ui-monospace,monospace; color:#555; }
.lv-mare { font:700 1.9rem/1 ui-monospace,Consolas,monospace; background:#0f1a12; color:#7dff9a; border:2px inset #8d8a84; border-radius:4px; padding:.35rem .5rem; text-align:right; letter-spacing:.04em; }
.lv-led { display:inline-block; width:16px; height:16px; border-radius:50%; border:1px solid #333; background:radial-gradient(circle at 35% 35%,#c9c9c9,#5b5b5b); vertical-align:middle; }
.lv-led.on { background:radial-gradient(circle at 35% 35%,#c7ffc7,#17b417); box-shadow:0 0 6px #2bdc2b; }
.lv-led.rosu { background:radial-gradient(circle at 35% 35%,#ffd0d0,#d61e1e); box-shadow:0 0 6px #ff4a4a; }
.lv-grafic { grid-column:1/-1; }
.lv-grafic canvas { width:100%; height:270px; display:block; background:#111; border:2px inset #8d8a84; border-radius:3px; }
.lv-leg { display:flex; flex-wrap:wrap; gap:.3rem 1rem; font-size:.74rem; margin-top:.3rem; color:#333; } .lv-leg i { display:inline-block; width:18px; height:3px; vertical-align:middle; margin-right:.25rem; }
.lv-diagrama { background:#fff; background-image:radial-gradient(#e3e3e3 1px,transparent 1px); background-size:12px 12px; padding:.4rem; }
.lv-diagrama svg { width:100%; height:auto; display:block; font-family:ui-monospace,Consolas,monospace; }
.lv-stare { display:flex; gap:1rem; font-size:.72rem; padding:.25rem .6rem; background:#ecebe8; border-top:1px solid #b9b5ae; color:#444; }
.lv-buton { width:100%; text-align:left; }
.fisa table { width:100%; border-collapse:collapse; font-size:.82rem; } .fisa th, .fisa td { border:1px solid var(--linie,#ccc); padding:.2rem .3rem; text-align:right; } .fisa th:first-child, .fisa td:first-child { text-align:left; }
.fisa tr.sel td { background:color-mix(in srgb, var(--accent) 18%, transparent); }
.fisa tr { cursor:pointer; }
.lv-buton-rand { display:grid; grid-template-columns:1fr 1fr; gap:.35rem; }
</style>`;
function numCtl(k, et, u, pas, min, max) {
  return `<div class="lv-ctl"><label for="vc-${k}">${et}${u ? ` [${u}]` : ""}</label><span class="lv-num"><input id="vc-${k}" data-vc="${k}" type="number" step="${pas}" min="${min}" max="${max}"><span class="sp"><button type="button" data-vp="${k}" data-d="1" tabindex="-1" aria-label="crește">▲</button><button type="button" data-vp="${k}" data-d="-1" tabindex="-1" aria-label="scade">▼</button></span></span></div>`;
}
function slideCtl(k, min, max, pas) { return `<div class="lv-slide"><small>${String(min).replace(".", ",")}</small><input type="range" data-vs="${k}" min="${min}" max="${max}" step="${pas}" aria-label="${k}"><small>${String(max).replace(".", ",")}</small></div>`; }
const HTML_PANOU = `
<div class="lv-panou" id="lv-panou">
  <div class="lv-grup"><h4>Regimul motorului</h4>
    ${numCtl("p", "p (MAP)", "kPa", 0.1, 10, 105)}${slideCtl("p", 10, 105, 0.1)}
    ${numCtl("n", "n", "rot/min", 50, 600, 6500)}
    ${numCtl("Vs", "V<sub>s</sub> (cilindree unitară)", "cm³", 0.1, 100, 1000)}
    ${numCtl("Ta", "T<sub>a</sub> (IAT)", "K", 1, 233, 373)}${slideCtl("Ta", 233, 373, 1)}
  </div>
  <div class="lv-grup"><h4>Calibrare</h4>
    ${numCtl("ev", "η<sub>v</sub>", "–", 0.001, 0.2, 1.2)}${slideCtl("ev", 0.2, 1.2, 0.001)}
    ${numCtl("lam", "λ dorit", "–", 0.01, 0.7, 1.3)}
    <div class="lv-ctl"><label for="vc-comb">Combustibil (L<sub>0</sub>)</label><span class="lv-num"><select id="vc-comb" data-vc="comb">${Object.entries(COMB).map(([k, c]) => `<option value="${k}">${c.et} – ${String(c.L0).replace(".", ",")}</option>`).join("")}</select></span></div>
  </div>
  <div class="lv-grup"><h4>Injectorul și alimentarea</h4>
    ${numCtl("qs", "q<sub>s</sub>", "mg/ms", 0.001, 0.5, 6)}
    ${numCtl("tm0", "t<sub>mort</sub> la 14 V", "ms", 0.001, 0.1, 2)}
    ${numCtl("U", "U<sub>bat</sub>", "V", 0.1, 9, 16)}${slideCtl("U", 9, 16, 0.1)}
    <p class="nota" style="margin:.2rem 0 0;font-size:.72rem;color:#444">t<sub>mort</sub>(U) = t<sub>mort,14</sub>·(14/U)<sup>1,5</sup> – caracteristica injectorului de pe stand</p>
  </div>
  <div class="lv-grup"><h4>Rezultate</h4>
    <div class="lv-ctl"><label>m<sub>a</sub> [mg/ciclu·cil.]</label><span class="lv-ind" id="vi-ma">—</span></div>
    <div class="lv-ctl"><label>m<sub>c</sub> [mg]</label><span class="lv-ind" id="vi-mc">—</span></div>
    <div class="lv-ctl"><label>t<sub>mort</sub>(U) [ms]</label><span class="lv-ind" id="vi-tm">—</span></div>
    <div class="lv-ctl"><label>DC [%]</label><span class="lv-ind" id="vi-dc">—</span></div>
    <div style="margin-top:.35rem"><div style="font-size:.78rem;font-weight:700;margin-bottom:.15rem">t<sub>i</sub> [ms]</div><div class="lv-mare" id="vi-ti">—</div></div>
  </div>
  <div class="lv-grup"><h4>Comparare cu măsurarea (regimul din fișă)</h4>
    <div class="lv-ctl"><label>Regimul</label><span class="lv-ind" id="vi-reg">—</span></div>
    <div class="lv-ctl"><label>t<sub>i</sub> măsurat [ms]</label><span class="lv-ind" id="vi-tim">—</span></div>
    <div class="lv-ctl"><label>ε [%]</label><span class="lv-ind" id="vi-eps">—</span></div>
    <div class="lv-ctl"><label>|ε| &lt; 5 %</label><span class="lv-led" id="vi-led"></span></div>
    <div class="lv-ctl"><label>Intrările = fișa postului</label><span class="lv-led" id="vi-led2"></span></div>
  </div>
  <div class="lv-grup lv-grafic"><h4>Grafic: t<sub>i</sub> = f(n) – model și măsurare</h4>
    <canvas id="cv-vi" height="270" aria-label="Graficul duratei de injecție în funcție de turație"></canvas>
    <div class="lv-leg"><span><i style="background:#ffd23f"></i>măsurat (lucrarea 1)</span><span><i style="background:#ff6b6b"></i>model η<sub>v</sub> = 0,8</span><span><i style="background:#4fd6ff"></i>model η<sub>v</sub> ajustat (Tabelul 2.1)</span><span><i style="background:#7dff9a"></i>execuția curentă</span></div>
  </div>
  <div class="lv-grup lv-grafic"><h4>Harta η<sub>v</sub> = f(n) (din Tabelul 2.1)</h4>
    <canvas id="cv-ev" height="200" style="height:200px" aria-label="Eficiența volumetrică ajustată în funcție de turație"></canvas>
  </div>
</div>`;

/* ------------------------------------------------------------------ diagrama bloc */
// noduri: [id, x, y, text, tip]; tip: c = comandă (terminal portocaliu), k = constantă
const NOD = [
  ["p", 20, 40, "p [kPa]", "c"], ["k1000", 20, 95, "1000", "k"], ["ev", 20, 155, "η_v", "c"], ["Vs", 20, 210, "V_s·1E-6", "c"],
  ["R", 20, 285, "R = 287", "k"], ["Ta", 20, 340, "T_a [K]", "c"], ["k1e6", 400, 300, "1E+6", "k"],
  ["lam", 470, 360, "λ", "c"], ["L0", 470, 410, "L0", "c"], ["qs", 700, 335, "q_s", "c"],
  ["U", 20, 445, "U_bat [V]", "c"], ["k14", 20, 500, "14", "k"], ["k15", 300, 520, "1,5", "k"], ["tm0", 470, 470, "t_mort,14", "c"]
];
// operatori: [id, x (vârful din dreapta − 16), y, simbol]
const OPS = [
  ["m1", 190, 65, "×"], ["m3", 190, 310, "×"], ["m2", 300, 175, "×"], ["d1", 420, 230, "÷"], ["m4", 520, 250, "×"],
  ["m5", 620, 385, "×"], ["d2", 720, 270, "÷"], ["d4", 830, 300, "÷"], ["d3", 190, 470, "÷"], ["pw", 420, 490, "xʸ"], ["m6", 620, 480, "×"], ["ad", 940, 330, "+"]
];
const IND = [["ma", 640, 150, "m_a [mg]"], ["mc", 840, 190, "m_c [mg]"], ["tm", 760, 515, "t_mort(U)"], ["ti", 990, 317, "t_i [ms]"]];
// fire: [de la, la, valoare de pe fir (sondă)]
const FIRE = [
  ["p", "m1", "p"], ["k1000", "m1", null], ["m1", "m2", "pPa"], ["ev", "m2", "ev"], ["Vs", "m2", "vs"],
  ["R", "m3", null], ["Ta", "m3", "Ta"], ["m2", "d1", "num"], ["m3", "d1", "RT"], ["d1", "m4", "maKg"], ["k1e6", "m4", null],
  ["m4", "ma", "ma"], ["m4", "d2", null], ["lam", "m5", "lam"], ["L0", "m5", "L0"], ["m5", "d2", "lL0"], ["d2", "mc", "mc"], ["d2", "d4", null], ["qs", "d4", "qs"],
  ["U", "d3", "U"], ["k14", "d3", null], ["d3", "pw", "r14"], ["k15", "pw", null], ["pw", "m6", "pw"], ["tm0", "m6", "tm0"],
  ["m6", "tm", "tm"], ["d4", "ad", "mcq"], ["m6", "ad", null], ["ad", "ti", null]
];
function iesire(id) {
  const n = NOD.find(x => x[0] === id); if (n) return { x: n[1] + (n[4] === "k" ? 86 : 74), y: n[2] + 13 };
  const o = OPS.find(x => x[0] === id); return { x: o[1] + 16, y: o[2] };
}
function intrare(id, idx, tot) {
  const o = OPS.find(x => x[0] === id); if (o) return { x: o[1] - 16, y: o[2] + (tot === 1 ? 0 : (idx - (tot - 1) / 2) * 11) };
  const i = IND.find(x => x[0] === id); return { x: i[1], y: i[2] + 13 };
}
function htmlDiagrama() {
  let s = `<svg viewBox="0 0 1100 580" role="img" aria-label="Diagrama bloc a instrumentului virtual">`;
  s += `<rect x="6" y="6" width="1088" height="568" fill="none" stroke="#9c9c9c" stroke-width="3" rx="4"/><text x="16" y="24" font-size="12" fill="#666">Bucla While (Run Continuously) – iterația <tspan id="dg-it">0</tspan></text>`;
  const intr = {}; FIRE.forEach(f => { intr[f[1]] = (intr[f[1]] || 0) + 1; });
  const cnt = {};
  FIRE.forEach(([a, b, v], i) => {
    const idx = cnt[b] = (cnt[b] || 0), A = iesire(a), B = intrare(b, idx, intr[b]); cnt[b]++;
    const vx = Math.max(A.x + 14, B.x - 22 - idx * 7);
    s += `<path id="fir-${i}" d="M${A.x},${A.y} H${vx} V${B.y} H${B.x}" fill="none" stroke="#ff7a1a" stroke-width="3" stroke-linejoin="round"/>`;
    if (v) { const px = A.x + Math.max(34, (vx - A.x) / 2); s += `<g class="sonda"><rect id="sr-${i}" x="${px - 30}" y="${A.y - 19}" width="60" height="15" rx="3" fill="#fffbe6" stroke="#d8b000"/><text x="${px}" y="${A.y - 8}" font-size="10" text-anchor="middle" fill="#3a2f00" data-v="${v}">—</text></g>`; }
  });
  NOD.forEach(([id, x, y, t, tip]) => {
    if (tip === "k") s += `<rect x="${x}" y="${y}" width="86" height="26" fill="#fff6ef" stroke="#ff7a1a" stroke-width="1.5"/><text x="${x + 43}" y="${y + 17}" font-size="11" text-anchor="middle" fill="#7a3200">${t}</text>`;
    else s += `<rect x="${x}" y="${y}" width="74" height="26" rx="3" fill="#ffe8d6" stroke="#ff7a1a" stroke-width="2.5"/><path d="M${x + 60},${y + 6} l10,7 l-10,7 z" fill="#ff7a1a"/><text x="${x + 30}" y="${y + 17}" font-size="10.5" text-anchor="middle" fill="#5a2200">${t}</text>`;
  });
  OPS.forEach(([id, x, y, t]) => { s += `<path d="M${x - 16},${y - 20} L${x + 16},${y} L${x - 16},${y + 20} z" fill="#fff9b0" stroke="#7a6b00" stroke-width="1.5"/><text x="${x - 5}" y="${y + 5}" font-size="${t.length > 1 ? 11 : 15}" text-anchor="middle" fill="#3a3300">${t}</text>`; });
  IND.forEach(([id, x, y, t]) => { s += `<rect x="${x}" y="${y}" width="88" height="26" rx="3" fill="#e6edf5" stroke="#ff7a1a" stroke-width="1.5"/><path d="M${x + 4},${y + 13} l9,-7 v14 z" fill="#ff7a1a"/><text x="${x + 50}" y="${y + 17}" font-size="11" text-anchor="middle" fill="#0d2a4f">${t}</text><text id="di-${id}" x="${x + 44}" y="${y + 42}" font-size="12" font-weight="700" text-anchor="middle" fill="#0d2a4f">—</text>`; });
  s += `<circle id="dg-bila" r="6" fill="#33d6ff" stroke="#035" opacity="0"/>`;
  return s + `</svg>`;
}
function valFir(v) {
  const r = vi.rez, x = vi.rezIn; if (!r || !x) return "—";
  const m = { p: x.p, ev: x.ev, pPa: x.p * 1000, Ta: x.Ta, num: x.ev * x.p * 1000 * x.Vs * 1e-6, vs: x.Vs * 1e-6, RT: MD2.R * x.Ta, maKg: r.ma / 1e6, ma: r.ma, lam: x.lam, L0: x.L0, lL0: x.lam * x.L0, mc: r.mc, mcq: r.mc / x.qs, qs: x.qs, U: x.U, r14: 14 / x.U, pw: Math.pow(14 / x.U, 1.5), tm0: x.tm0, tm: r.tm, ti: r.ti };
  const a = m[v]; if (!Number.isFinite(a)) return "—";
  const ab = Math.abs(a); return ab !== 0 && (ab < 1e-3 || ab >= 1e5) ? a.toExponential(3).replace(".", ",") : fmt(a, ab < 10 ? 3 : ab < 1000 ? 2 : 0);
}

/* ------------------------------------------------------------------ afișarea */
function seteazaComenzi() {
  Object.entries(vi.c).forEach(([k, v]) => { const i = $(`[data-vc="${k}"]`); if (i && document.activeElement !== i) i.value = v; $$(`[data-vs="${k}"]`).forEach(s => s.value = v); });
}
function afiseaza() {
  const r = vi.rez, x = vi.rezIn; if (!r) return;
  $("#vi-ma").textContent = fmt(r.ma, 2); $("#vi-mc").textContent = fmt(r.mc, 3); $("#vi-tm").textContent = fmt(r.tm, 3);
  $("#vi-dc").textContent = Number.isFinite(r.dc) ? fmt(r.dc, 2) : "—"; $("#vi-ti").textContent = r.ti.toFixed(3).replace(".", ",");
  const f = P().fisa[vi.k], e = eroare(vi.k);
  $("#vi-reg").textContent = ET[vi.k] + (vi.k === "ral" ? "" : " rot/min"); $("#vi-tim").textContent = fmt(f.ti, 2); $("#vi-eps").textContent = (e > 0 ? "+" : "") + fmt(e, 2);
  const eg = egalCuFisa(vi.k, x);
  $("#vi-led").className = "lv-led" + (eg && Math.abs(e) < 5 ? " on" : eg ? " rosu" : "");
  $("#vi-led2").className = "lv-led" + (eg ? " on" : "");
  $("#dg-it").textContent = String(vi.nExec);
  $$("#lv-diag [data-v]").forEach(t => { t.textContent = valFir(t.dataset.v); });
  [["ma", r.ma, 2], ["mc", r.mc, 3], ["tm", r.tm, 3], ["ti", r.ti, 3]].forEach(([k, v, n]) => { const t = $("#di-" + k); if (t) t.textContent = fmt(v, n); });
  deseneazaGraf(); deseneazaEv();
}
function egalCuFisa(k, x) {
  const f = P().fisa[k], Pp = P(); if (!x) return false;
  return Math.abs(x.p - f.p) < 0.051 && Math.abs(x.n - f.n) < 1 && Math.abs(x.qs - Pp.qs) < 0.0005 && Math.abs(x.tm0 - Pp.tm0) < 0.0005 && Math.abs(x.U - MD2.UREF) < 0.001 && Math.abs(x.Ta - MD2.TA) < 0.01 && Math.abs(x.L0 - MD2.L0) < 0.001 && Math.abs(x.lam - 1) < 0.0001 && Math.abs(x.Vs - 347.5) < 0.01;
}
function fisaHTML() {
  const Pp = P();
  return `<table><thead><tr><th>Regim</th><th>n [rot/min]</th><th>p [kPa]</th><th>t<sub>i</sub> măs. [ms]</th></tr></thead><tbody>${CHEI.map(k => { const f = Pp.fisa[k]; return `<tr data-k="${k}"${k === vi.k ? ' class="sel"' : ""}><td>${ET[k]}</td><td>${f.n}</td><td>${fmt(f.p, 1)}</td><td>${f.ti.toFixed(2).replace(".", ",")}</td></tr>`; }).join("")}</tbody></table>
  <p class="nota" style="margin:.35rem 0 0">q<sub>s</sub> = <b>${Pp.qs.toFixed(3).replace(".", ",")}</b> mg/ms · t<sub>mort</sub> la 14 V = <b>${Pp.tm0.toFixed(3).replace(".", ",")}</b> ms (lucrarea 1) · U<sub>bat</sub> = 13,9 V · T<sub>a</sub> (IAT) = 300 K · λ = 1 · benzină (L<sub>0</sub> = 14,7) · V<sub>s</sub> = 347,5 cm³</p>`;
}
function legaFisa() {
  $("#fisa").innerHTML = fisaHTML();
  $$("#fisa tr[data-k]").forEach(tr => tr.addEventListener("click", () => { vi.k = tr.dataset.k; legaFisa(); if (vi.rulare === "cont") executa(); else afiseaza(); }));
}
function incarcaRegim() {
  const Pp = P(), f = Pp.fisa[vi.k];
  Object.assign(vi.c, { p: f.p, n: f.n, Vs: 347.5, Ta: MD2.TA, lam: 1, U: MD2.UREF, comb: "benzina", qs: Pp.qs, tm0: Pp.tm0 });
  seteazaComenzi(); if (vi.rulare === "cont") executa();
}
const CUL = { mas: "#ffd23f", m08: "#ff6b6b", adj: "#4fd6ff", cur: "#7dff9a" };
function axe(cv, xr, yr, xl, yl, nx, ny) {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W) return null;
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = { l: 46, r: 12, t: 10, b: 30 }, w = W - m.l - m.r, h = H - m.t - m.b;
  g.fillStyle = "#111"; g.fillRect(0, 0, W, H); g.strokeStyle = "rgba(120,255,140,.16)"; g.lineWidth = 1; g.font = "11px ui-monospace,monospace"; g.fillStyle = "#9fd9a8";
  for (let i = 0; i <= nx; i++) { const x = m.l + w * i / nx; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); g.textAlign = "center"; g.fillText(fmt(xr[0] + (xr[1] - xr[0]) * i / nx, 0), x, H - 14); }
  for (let i = 0; i <= ny; i++) { const y = m.t + h - h * i / ny; g.beginPath(); g.moveTo(m.l, y); g.lineTo(m.l + w, y); g.stroke(); g.textAlign = "right"; g.fillText(fmt(yr[0] + (yr[1] - yr[0]) * i / ny, yr[1] < 3 ? 2 : 1), m.l - 5, y + 4); }
  g.textAlign = "center"; g.fillText(xl, m.l + w / 2, H - 2); g.save(); g.translate(11, m.t + h / 2); g.rotate(-Math.PI / 2); g.fillText(yl, 0, 0); g.restore();
  return { g, X: x => m.l + (x - xr[0]) / (xr[1] - xr[0]) * w, Y: y => m.t + h - (y - yr[0]) / (yr[1] - yr[0]) * h };
}
function linie(A, pts, c, dash) { const { g, X, Y } = A; if (pts.length < 2) return; g.strokeStyle = c; g.lineWidth = 2; g.setLineDash(dash ? [6, 4] : []); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.stroke(); g.setLineDash([]); }
function puncte(A, pts, c, r = 4) { const { g, X, Y } = A; g.fillStyle = c; pts.forEach(([x, y]) => { g.beginPath(); g.arc(X(x), Y(y), r, 0, Math.PI * 2); g.fill(); }); }
function deseneazaGraf() {
  const cv = $("#cv-vi"); if (!cv || !cv.getClientRects().length) return;
  const Pp = P(), t = Cadru.D.t.t21, mas = CHEI.map(k => [Pp.fisa[k].n, Pp.fisa[k].ti]);
  const ymax = Math.max(5, Math.ceil(Math.max(...mas.map(p => p[1]), vi.rez ? vi.rez.ti : 0) + 0.5));
  const A = axe(cv, [500, 3500], [0, ymax], "n [rot/min]", "t_i [ms]", 6, ymax); if (!A) return;
  const m08 = CHEI.map(k => [Pp.fisa[k].n, MD2.calcul(MD2.intrari(Pp, k, 0.8)).ti]);
  linie(A, m08, CUL.m08, true);
  const adj = CHEI.map(k => [Pp.fisa[k].n, num(t[k].tiAdj)]).filter(p => Number.isFinite(p[1]));
  linie(A, adj, CUL.adj); puncte(A, adj, CUL.adj, 3);
  puncte(A, mas, CUL.mas, 5);
  if (vi.rez && vi.rezIn) { const { g, X, Y } = A, x = X(vi.rezIn.n), y = Y(vi.rez.ti); g.strokeStyle = CUL.cur; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.stroke(); }
}
function deseneazaEv() {
  const cv = $("#cv-ev"); if (!cv || !cv.getClientRects().length) return;
  const Pp = P(), t = Cadru.D.t.t21, A = axe(cv, [500, 3500], [0.4, 1.0], "n [rot/min]", "η_v [–]", 6, 6); if (!A) return;
  const pts = CHEI.map(k => [Pp.fisa[k].n, num(t[k].ev)]).filter(p => Number.isFinite(p[1]));
  linie(A, pts, CUL.adj); puncte(A, pts, CUL.adj, 4);
  if (vi.rezIn) puncte(A, [[vi.rezIn.n, vi.rezIn.ev]], CUL.cur, 3);
}
function animatieDiagrama(acum) {
  const b = $("#dg-bila"); if (!b) return;
  if (!vi.evid || vi.vedere !== "diagrama") { b.setAttribute("opacity", "0"); $$("#lv-diag .sonda rect").forEach(r => r.setAttribute("fill", "#fffbe6")); return; }
  const T = 4000, u = ((acum - vi.tEvid) % T) / T, i = Math.min(FIRE.length - 1, Math.floor(u * FIRE.length)), f = (u * FIRE.length) % 1;
  const p = $("#fir-" + i); if (!p) return; const L = p.getTotalLength(), q = p.getPointAtLength(L * f);
  b.setAttribute("cx", q.x); b.setAttribute("cy", q.y); b.setAttribute("opacity", "1");
  $$("#lv-diag .sonda rect").forEach(r => { const k = +r.id.slice(3); r.setAttribute("fill", k <= i ? "#fffbe6" : "#eee"); });
}

/* ------------------------------------------------------------------ înregistrări în tabele */
function msg(t) { $("#msg-inreg").textContent = t; }
function verificaRulare() {
  if (!vi.rez) return "Rulați instrumentul (săgeata Run) pentru a calcula t_i.";
  const x = vi.rezIn, c = intrariCurente();
  if (Object.keys(c).some(k => Math.abs(c[k] - x[k]) > 1e-9)) return "Comenzile au fost modificate după ultima rulare: apăsați Run (sau porniți Run Continuously).";
  return "";
}
function inreg08(e) {
  const m = verificaRulare(); if (m) return Cadru.mesajTemporar(m, "atentie");
  const k = vi.k, x = vi.rezIn;
  if (!egalCuFisa(k, x)) return Cadru.mesajTemporar(`Intrările trebuie să fie cele ale regimului „${ET[k]}” din fișa postului (p, n, V_s = 347,5 cm³, q_s, t_mort, U_bat = 13,9 V, T_a = 300 K, λ = 1, benzină). Folosiți „Încarcă regimul”.`, "atentie");
  if (Math.abs(x.ev - 0.8) > 1e-6) return Cadru.mesajTemporar("Pentru coloana „t_i model (η_v = 0,8)” setați η_v = 0,800.", "atentie");
  const f = P().fisa[k], ti = rot(vi.rez.ti, 3);
  const ok = Cadru.inregistreaza(e, { log: Object.assign({ m: "c08", k, ti }, x), celule: [{ t: "t21", r: k, c: "n", v: String(f.n) }, { t: "t21", r: k, c: "p", v: f.p.toFixed(1) }, { t: "t21", r: k, c: "tiM", v: f.ti.toFixed(2) }, { t: "t21", r: k, c: "ti08", v: ti.toFixed(3) }] });
  if (ok) msg(`Tabelul 2.1 (${ET[k]}): t_i model (η_v = 0,8) = ${fmt(ti, 3)} ms, ε = ${fmt(eroare(k), 1)} %.`);
}
function inregAdj(e) {
  const m = verificaRulare(); if (m) return Cadru.mesajTemporar(m, "atentie");
  const k = vi.k, x = vi.rezIn;
  if (!egalCuFisa(k, x)) return Cadru.mesajTemporar(`Intrările trebuie să fie cele ale regimului „${ET[k]}” din fișa postului (folosiți „Încarcă regimul”); modificați numai η_v.`, "atentie");
  const ep = eroare(k); if (Math.abs(ep) >= 5) return Cadru.mesajTemporar(`Eroarea este ${fmt(ep, 1)} %: ajustați η_v până când |ε| < 5 % (LED verde).`, "atentie");
  const f = P().fisa[k], ti = rot(vi.rez.ti, 3);
  const ok = Cadru.inregistreaza(e, { log: Object.assign({ m: "cadj", k, ti }, x), celule: [{ t: "t21", r: k, c: "n", v: String(f.n) }, { t: "t21", r: k, c: "p", v: f.p.toFixed(1) }, { t: "t21", r: k, c: "tiM", v: f.ti.toFixed(2) }, { t: "t21", r: k, c: "ev", v: x.ev.toFixed(3) }, { t: "t21", r: k, c: "tiAdj", v: ti.toFixed(3) }] });
  if (ok) msg(`Tabelul 2.1 (${ET[k]}): η_v = ${fmt(x.ev, 3)}, t_i = ${fmt(ti, 3)} ms, ε = ${fmt(ep, 2)} %.`);
}
function inregSens(e) {
  const m = verificaRulare(); if (m) return Cadru.mesajTemporar(m, "atentie");
  const x = vi.rezIn, Pp = P(), f = Pp.fisa.ral;
  const k = CHEI_SENS.find(s => Math.abs(SENS[s].U - x.U) < 0.001 && Math.abs(SENS[s].Ta - x.Ta) < 0.01);
  if (!k) return Cadru.mesajTemporar("Tabelul 2.2: la ralanti modificați fie U_bat (12 V sau 14,5 V, cu T_a = 300 K), fie T_a (283 K sau 323 K, cu U_bat = 13,9 V).", "atentie");
  if (Math.abs(x.p - f.p) > 0.051 || Math.abs(x.n - f.n) > 1 || Math.abs(x.qs - Pp.qs) > 0.0005 || Math.abs(x.tm0 - Pp.tm0) > 0.0005 || Math.abs(x.lam - 1) > 1e-4 || Math.abs(x.L0 - MD2.L0) > 1e-3 || Math.abs(x.Vs - 347.5) > 0.01) return Cadru.mesajTemporar("Tabelul 2.2 se face la regimul de ralanti din fișă (p, n, q_s, t_mort, λ = 1, benzină), cu η_v ajustat la ralanti.", "atentie");
  const evR = num(Cadru.D.t.t21.ral.ev); if (!Number.isFinite(evR)) return Cadru.mesajTemporar("Completați întâi η_v ajustat la ralanti în Tabelul 2.1.", "atentie");
  if (Math.abs(x.ev - evR) > 0.0006) return Cadru.mesajTemporar(`Folosiți η_v ajustat la ralanti din Tabelul 2.1 (${fmt(evR, 3)}).`, "atentie");
  const ti = rot(vi.rez.ti, 3);
  const ok = Cadru.inregistreaza(e, { log: Object.assign({ m: "sens", k, ti }, x), celule: [{ t: "t22", r: k, c: "ti", v: ti.toFixed(3) }] });
  if (ok) msg(`Tabelul 2.2 (${SENS[k].et.replace(/<[^>]+>/g, "")}): t_i = ${fmt(ti, 3)} ms.`);
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaSAA2(D) {
  const t = D.t, cel = { t21: {}, t22: {} }, rele = { t21: {} };
  const rows = [];
  CHEI.forEach(k => {
    const r = t.t21[k], tm = num(r.tiM), a = num(r.ti08), b = num(r.tiAdj);
    const e1 = Number.isFinite(tm) && Number.isFinite(a) ? (a - tm) / tm * 100 : NaN, e2 = Number.isFinite(tm) && Number.isFinite(b) ? (b - tm) / tm * 100 : NaN;
    cel.t21[k] = { e08: Number.isFinite(e1) ? fmt(e1, 1) : "", eAdj: Number.isFinite(e2) ? fmt(e2, 2) : "" }; rele.t21[k] = { e08: Math.abs(e1) > 5, eAdj: Math.abs(e2) >= 5 };
    rows.push({ k, n: num(r.n), e1, e2, ev: num(r.ev), tm, a, b });
  });
  const tr = num(t.t21.ral.tiAdj);
  CHEI_SENS.forEach(k => { const v = num(t.t22[k].ti); cel.t22[k] = { dti: Number.isFinite(v) && Number.isFinite(tr) ? fmt((v - tr) / tr * 100, 1) : "", dms: Number.isFinite(v) && Number.isFinite(tr) ? fmt(v - tr, 3) : "" }; });
  const e1 = rows.filter(r => Number.isFinite(r.e1)), ev = rows.filter(r => Number.isFinite(r.ev));
  const rez = [
    ["Eroarea medie a modelului cu η<sub>v</sub> = 0,8", e1.length ? `${fmt(e1.reduce((s, r) => s + Math.abs(r.e1), 0) / e1.length, 1)} % (maxim ${fmt(Math.max(...e1.map(r => Math.abs(r.e1))), 1)} %)` : "—"],
    ["Harta η<sub>v</sub> = f(n) ajustată", ev.length ? ev.map(r => `${ET[r.k]}: <b>${fmt(r.ev, 3)}</b>`).join(" · ") : "—"],
    ["Domeniul η<sub>v</sub>", ev.length ? `${fmt(Math.min(...ev.map(r => r.ev)), 3)} … ${fmt(Math.max(...ev.map(r => r.ev)), 3)}` : "—"]
  ];
  const verdicte = [];
  if (ev.length >= 3) {
    const crescator = ev.every((r, i) => !i || r.ev >= ev[i - 1].ev - 0.005);
    verdicte.push({ tip: crescator ? "ok" : "atentie", text: crescator ? "η<sub>v</sub> crește cu turația în domeniul măsurat (ralanti → 3000 rot/min) – comportament tipic al unui motor atmosferic fără sarcină, cu clapeta aproape închisă." : "Valorile η<sub>v</sub> nu variază monoton – verificați înregistrările din Tabelul 2.1." });
  }
  if (e1.length >= 3) { const semn = e1.every(r => r.e1 > 0) || e1.every(r => r.e1 < 0); verdicte.push({ tip: "", text: semn ? "Eroarea cu η<sub>v</sub> = 0,8 are același semn la toate regimurile: o eficiență volumetrică constantă supraestimează sistematic umplerea la sarcină mică – motivul pentru care ECU folosește o hartă η<sub>v</sub>(n, p)." : "Eroarea cu η<sub>v</sub> = 0,8 își schimbă semnul cu regimul – η<sub>v</sub> real trece prin valoarea 0,8." }); }
  const mas = rows.filter(r => Number.isFinite(r.tm) && Number.isFinite(r.n)).map(r => [r.n, r.tm]);
  const m08 = rows.filter(r => Number.isFinite(r.a)).map(r => [r.n, r.a]), adj = rows.filter(r => Number.isFinite(r.b)).map(r => [r.n, r.b]);
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Durata de injecție t<sub>i</sub> = f(n): măsurată și calculată cu modelul",
    grafic: { xmin: 500, xmax: 3500, ymin: 0, ymax: 6, xticks: [500, 1000, 1500, 2000, 2500, 3000, 3500], xlab: "n [rot/min]", ylab: "tᵢ [ms]",
      serii: [{ tip: "pct", pts: mas, culoare: 0 }, { tip: "linie", pts: m08, culoare: 1, punctat: true }, { tip: "linie", pts: adj, culoare: 2 }] },
    legenda: [["t_i măsurat (lucrarea 1)", "var(--serie-0)", "pct"], ["model, η_v = 0,8", "var(--serie-1)"], ["model, η_v ajustat", "var(--serie-2)"]],
    principal: { eticheta: "η_v la ralanti [–]", valoare: Number.isFinite(rows[0].ev) ? +rows[0].ev.toFixed(3) : null }
  };
}

/* ------------------------------------------------------------------ conținut didactic (după îndrumar, revizuit) */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Lucrarea se desfășoară la calculator: se respectă regulile de utilizare a echipamentelor electrice (nu se deschid carcasele, nu se folosesc prelungitoare improvizate, se semnalează cablurile deteriorate).</li>
<li>Se respectă ergonomia postului de lucru cu display (distanța față de ecran, iluminatul, pauzele), conform HG nr. 1028/2006.</li></ul></div>
<h2>2.1. Scopul lucrării</h2>
<p>Construirea și validarea unui model simplificat de calcul al duratei de injecție, folosind datele măsurate la lucrarea 1. Lucrarea introduce principiul hărților de calibrare ale ECU (tabelul de eficiență volumetrică) folosit în proiectarea și calibrarea motoarelor.</p>
<h2>2.2. Noțiuni teoretice</h2>
<p>ECU nu măsoară direct masa de aer din cilindru; la sistemele <i>speed-density</i> aceasta se calculează din presiunea din colector (MAP), temperatura aerului și turație, prin intermediul eficienței volumetrice η<sub>v</sub>, stocată sub forma unei hărți η<sub>v</sub> = f(n, p). Masa de combustibil se obține împărțind masa de aer la raportul stoichiometric (L<sub>0</sub> = 14,7 kg aer/kg benzină) și la λ dorit, iar durata injecției rezultă din debitul static al injectorului, la care se adaugă timpul mort.</p>
<div class="ec"><span>m<sub>a</sub> = η<sub>v</sub>·p·V<sub>s</sub>/(R·T<sub>a</sub>)</span><span class="nr">(2.1)</span></div>
<div class="ec"><span>m<sub>c</sub> = m<sub>a</sub>/(λ·L<sub>0</sub>)</span><span class="nr">(2.2)</span></div>
<div class="ec"><span>t<sub>i</sub> = m<sub>c</sub>/q<sub>s</sub> + t<sub>mort</sub>(U<sub>bat</sub>)</span><span class="nr">(2.3)</span></div>
<p>unde R = 287 J/(kg·K) este constanta gazului pentru aer, V<sub>s</sub> – cilindreea unitară [m³], p – presiunea din colector [Pa], T<sub>a</sub> – temperatura aerului [K], q<sub>s</sub> – debitul static al injectorului [mg/ms], t<sub>mort</sub> – timpul mort, dependent de tensiunea bateriei U<sub>bat</sub>. m<sub>a</sub> și m<sub>c</sub> sunt mase pe ciclu și pe cilindru.</p>
<figure><img src="img/fig2_1.jpg" alt="Fig. 2.1 Structura modelului de calcul al duratei de injecție" loading="lazy"><figcaption>Fig. 2.1. Structura modelului de calcul al duratei de injecție</figcaption></figure>
<p><b>Exemplu:</b> motor 1,4 l cu 4 cilindri (V<sub>s</sub> = 3,5·10<sup>−4</sup> m³), la ralanti: p = 35 kPa, T<sub>a</sub> = 313 K, η<sub>v</sub> = 0,65; injectorul are q<sub>s</sub> = 2,5 mg/ms și t<sub>mort</sub> = 0,8 ms (exemplul lucrării 1):</p>
<div class="ec"><span>m<sub>a</sub> = 0,65·35 000·3,5·10<sup>−4</sup>/(287·313) = 8,9·10<sup>−5</sup> kg = 89 mg</span><span class="nr">(2.4)</span></div>
<div class="ec"><span>m<sub>c</sub> = 89/14,7 = 6,0 mg</span><span class="nr">(2.5)</span></div>
<div class="ec"><span>t<sub>i</sub> = 6,0/2,5 + 0,8 ≈ 3,2 ms</span><span class="nr">(2.6)</span></div>
<figure><img src="img/fig2_2.jpg" alt="Fig. 2.2 Compararea duratei de injecție calculate cu valorile măsurate" loading="lazy"><figcaption>Fig. 2.2. Compararea duratei de injecție calculate cu valorile măsurate (exemplu; curbele de 60 și 95 kPa se obțin numai cu motorul în sarcină)</figcaption></figure>
<h2>Instrumentul virtual (aplicația LabVIEW)</h2>
<p>Un instrument virtual (VI) are un <b>panou frontal</b> – comenzile (intrările: p, n, V<sub>s</sub>, T<sub>a</sub>, η<sub>v</sub>, λ, L<sub>0</sub>, q<sub>s</sub>, t<sub>mort</sub>, U<sub>bat</sub>) și indicatoarele (ieșirile: m<sub>a</sub>, m<sub>c</sub>, t<sub>i</sub>, factorul de umplere, eroarea față de măsurare) – și o <b>diagramă bloc</b>, în care datele circulă pe fire între funcții (înmulțire, împărțire, ridicare la putere, adunare). Un nod se execută numai când toate intrările lui au primit date (programare de tip <i>flux de date</i>). Butonul <b>Run</b> execută o dată diagrama, <b>Run Continuously</b> o execută repetat, astfel încât indicatoarele urmăresc imediat orice modificare a comenzilor; <b>Highlight Execution</b> arată circulația datelor pe fire, iar sondele (<i>probes</i>) afișează valoarea de pe fiecare fir.</p>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Fișa postului.</b> Fiecare student primește o fișă individuală cu citirile din Tabelul 1.2 și cu q<sub>s</sub> și t<sub>mort</sub> ale injectoarelor standului său (echivalentul datelor măsurate la lucrarea 1). Modelul se calibrează pe aceste date; cine are propriile date de la lucrarea 1 le poate compara cu fișa.</li>
<li><b>Turația în Fig. 2.1.</b> Turația nu apare explicit în relația (2.1): ea intră prin eficiența volumetrică, η<sub>v</sub> = f(n, p). În aplicație turația este folosită pentru alegerea punctului din hartă și pentru factorul de umplere DC = t<sub>i</sub>/(120 000/n).</li>
<li><b>Ajustarea lui η<sub>v</sub>.</b> Îndrumarul cere ajustarea prin încercări până la o eroare sub 5 %. Valoarea care anulează eroarea se obține și direct, inversând relațiile (2.1)–(2.3): η<sub>v</sub> = (t<sub>i,măs</sub> − t<sub>mort</sub>)·q<sub>s</sub>·λ·L<sub>0</sub>·R·T<sub>a</sub>/(p·V<sub>s</sub>). Aplicația acceptă orice valoare cu |ε| &lt; 5 % în Tabelul 2.1; întrebările 1 și 2 cer valoarea exactă.</li>
<li><b>Temperatura aerului.</b> T<sub>a</sub> este temperatura din colector (senzorul IAT), nu temperatura mediului; pe standul din laborator ≈ 300 K, în compartimentul motor cald 310…330 K (exemplul cu 313 K). ECU-urile moderne folosesc o temperatură a încărcăturii calculată din IAT și temperatura motorului.</li>
<li><b>Timpul mort.</b> Pe lângă tensiunea bateriei, t<sub>mort</sub> depinde și de diferența de presiune pe injector. În aplicație se folosește caracteristica injectorului de pe stand, t<sub>mort</sub>(U) = t<sub>mort,14</sub>·(14/U)<sup>1,5</sup>; în ECU ea este un tabel t<sub>mort</sub> = f(U<sub>bat</sub>).</li>
<li><b>Presiunile din Fig. 2.2.</b> Pe standul fără sarcină presiunea din colector rămâne între ≈ 20 și 40 kPa; valorile de 60 și 95 kPa (sarcină parțială și plină) se obțin numai pe banc de încercări sau pe drum.</li>
<li><b>Întrebarea 4 (E85).</b> La același debit de aer crește numai partea de injecție propriu-zisă, de 14,7/9,8 = 1,5 ori; timpul mort rămâne același, deci t<sub>i</sub> total crește cu mai puțin de 50 %. În practică se folosesc injectoare cu debit mai mare și corecții de pornire la rece mult mai mari.</li>
<li><b>Bucla închisă λ.</b> Erorile rămase ale hărții η<sub>v</sub> sunt corectate în funcționare de sonda λ (corecțiile pe termen scurt și lung, STFT/LTFT); o corecție pe termen lung mare și constantă arată tocmai o hartă η<sub>v</sub> greșită sau o neetanșeitate a admisiei.</li></ul></div>
<h2>2.4. Modul de lucru (în aplicație)</h2>
<ol><li>Deschideți instrumentul virtual: identificați pe panoul frontal comenzile (p, n, T<sub>a</sub>, η<sub>v</sub>, λ, U<sub>bat</sub>, q<sub>s</sub>, t<sub>mort</sub>) și indicatoarele (m<sub>a</sub>, m<sub>c</sub>, t<sub>i</sub>); comutați pe diagrama bloc și urmăriți cu <i>Highlight Execution</i> circulația datelor.</li>
<li>Verificați modelul pe exemplul din îndrumar (valorile inițiale ale comenzilor): trebuie să obțineți m<sub>a</sub> ≈ 89 mg și t<sub>i</sub> ≈ 3,2 ms. Introduceți apoi caracteristicile motorului de pe stand (V<sub>s</sub> = 347,5 cm³, q<sub>s</sub> și t<sub>mort</sub> din fișă) – butonul <i>Încarcă regimul</i> le introduce automat.</li>
<li>Pentru fiecare regim din fișa postului: selectați regimul, apăsați <i>Încarcă regimul</i>, setați η<sub>v</sub> = 0,800 și înregistrați t<sub>i</sub> calculat (Tabelul 2.1).</li>
<li>Ajustați η<sub>v</sub> până când LED-ul |ε| &lt; 5 % se aprinde (verde) și înregistrați η<sub>v</sub> ajustat și t<sub>i</sub> rezultat; valorile formează harta η<sub>v</sub> = f(n) simplificată.</li>
<li>La ralanti, cu η<sub>v</sub> ajustat, simulați U<sub>bat</sub> = 12 V și 14,5 V, apoi T<sub>a</sub> = 283 K și 323 K (Tabelul 2.2).</li>
<li>Completați întrebările de verificare și referatul.</li></ol>
<h2>2.6. Prelucrarea datelor</h2>
<div class="ec"><span>ε = (t<sub>i,model</sub> − t<sub>i,măsurat</sub>)/t<sub>i,măsurat</sub>·100 [%]</span><span class="nr">(2.7)</span></div>
<p>Se trasează t<sub>i,model</sub> și t<sub>i,măsurat</sub> în funcție de n (ca în Fig. 2.2) și η<sub>v</sub> ajustat în funcție de n.</p>
<h2>2.7. Interpretarea rezultatelor</h2>
<ul><li>Eficiența volumetrică la ralanti (clapetă aproape închisă) este mai mică decât la sarcină parțială; valorile ajustate de 0,6…0,9 sunt plauzibile pentru un motor atmosferic.</li>
<li>O eroare care crește sistematic cu turația arată că modelul nu include efectele dinamice (acordarea admisiei, suprapunerea supapelor) – motivul pentru care ECU folosește hărți, nu o constantă.</li>
<li>Tensiunea bateriei influențează numai timpul mort, deci efectul relativ este mai mare la t<sub>i</sub> mic (ralanti, sarcini mici); temperatura aerului influențează masa de aer invers proporțional cu T<sub>a</sub>.</li></ul>
<h2>2.8. Relevanță practică</h2>
<p>Același principiu stă la baza calibrării ECU (hărți VE, corecții de temperatură și tensiune). Modelul poate fi extins în lucrări de licență sau disertație, de exemplu pentru combustibili alternativi (E10, E85, GPL) sau pentru un sistem de injecție pentru prototipuri de competiție.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Motor 1,4 l, 4 cilindri (V<sub>s</sub> = 3,5·10<sup>−4</sup> m³), ralanti: p = 35 kPa, T<sub>a</sub> = 313 K, η<sub>v</sub> = 0,65, q<sub>s</sub> = 2,5 mg/ms, t<sub>mort</sub> = 0,8 ms:</p>
<div class="ec"><span>m<sub>a</sub> = 0,65·35 000·3,5·10<sup>−4</sup>/(287·313) = 89 mg; &nbsp; m<sub>c</sub> = 89/14,7 = 6,0 mg; &nbsp; t<sub>i</sub> = 6,0/2,5 + 0,8 ≈ 3,2 ms</span><span class="nr">(2.4–2.6)</span></div>
<div class="problema"><h3>Problema 1</h3><p>La același regim se măsoară t<sub>i</sub> = 3,4 ms. Ce eficiență volumetrică rezultă?</p><details class="sol"><summary>Rezolvare</summary><p>m<sub>c</sub> = (3,4 − 0,8)·2,5 = 6,5 mg → m<sub>a</sub> = 6,5·14,7 = 95,6 mg → η<sub>v</sub> = 95,6·10<sup>−6</sup>·287·313/(35 000·3,5·10<sup>−4</sup>) ≈ 0,70.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Cu cât se modifică t<sub>i</sub> din exemplu dacă temperatura aerului crește de la 313 K la 333 K (vară, ambuteiaj)?</p><details class="sol"><summary>Rezolvare</summary><p>m<sub>a</sub> scade de 313/333 ori: m<sub>c</sub> = 6,0·0,94 = 5,64 mg → t<sub>i</sub> = 5,64/2,5 + 0,8 = 3,06 ms (−4,5 %).</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Ce durată de injecție ar comanda ECU în exemplu pentru λ = 0,9 (îmbogățire la sarcină plină)? Dar pentru GPL (L<sub>0</sub> = 15,5), cu un injector de gaz cu q<sub>s</sub> = 2,5 mg/ms?</p><details class="sol"><summary>Rezolvare</summary><p>λ = 0,9: m<sub>c</sub> = 89/(0,9·14,7) = 6,73 mg → t<sub>i</sub> = 3,49 ms. GPL: m<sub>c</sub> = 89/15,5 = 5,74 mg → t<sub>i</sub> = 3,10 ms.</p></details></div>`;
}
const INTREBARI = [
  ["De ce masa de aer se calculează folosind temperatura aerului din admisie?", "Densitatea aerului este invers proporțională cu temperatura absolută (ρ = p/(R·T)): la aceeași presiune din colector, aerul cald are o masă mai mică pe ciclu. Fără corecția de temperatură, amestecul ar deveni bogat la aer cald și sărac la aer rece."],
  ["Ce reprezintă eficiența volumetrică și de ce variază cu turația?", "Raportul dintre masa de aer reținută efectiv în cilindru și masa care ar umple cilindreea unitară la presiunea și temperatura din colector. Variază cu turația din cauza rezistențelor gazodinamice, a fenomenelor de undă din admisie (acordare), a suprapunerii supapelor și a gazelor reziduale; la ralanti (clapetă aproape închisă, gaze reziduale multe) este mai mică."],
  ["Cum influențează tensiunea bateriei durata comenzii injectorului?", "La tensiune mai mică, curentul prin bobina injectorului crește mai lent, deci forța de deschidere este atinsă mai târziu: timpul mort crește. ECU adaugă t<sub>mort</sub>(U<sub>bat</sub>) la durata comenzii, astfel că t<sub>i</sub> crește la tensiune mică, în timp ce masa injectată rămâne aceeași."],
  ["Cât trebuie să crească t<sub>i</sub> pentru funcționarea cu E85 (L<sub>0</sub> ≈ 9,8) față de benzină, la același debit de aer?", "Partea t<sub>i</sub> − t<sub>mort</sub> crește de 14,7/9,8 = 1,5 ori (+50 %); t<sub>i</sub> total crește cu mai puțin, deoarece timpul mort nu se modifică. Exemplu: 6,0/2,5·1,5 + 0,8 = 4,4 ms față de 3,2 ms (+37 %)."]
];
const TEST = [
  { q: "La sistemul speed-density masa de aer se calculează din:", o: ["debitmetrul de aer", "presiunea din colector, temperatura aerului și η<sub>v</sub>", "poziția pedalei de accelerație", "sonda λ"], c: 1, e: "Relația (2.1)." },
  { q: "Dacă temperatura aerului crește, la aceeași presiune din colector, t<sub>i</sub>:", o: ["crește", "scade", "rămâne aceeași", "devine zero"], c: 1, e: "m<sub>a</sub> este invers proporțională cu T<sub>a</sub>." },
  { q: "Tensiunea bateriei influențează în model:", o: ["masa de aer", "masa de combustibil", "timpul mort", "eficiența volumetrică"], c: 2, e: "t<sub>mort</sub>(U<sub>bat</sub>)." },
  { q: "Într-un VI LabVIEW, un nod al diagramei bloc se execută când:", o: ["este apăsat butonul Stop", "toate intrările lui au primit date", "se schimbă panoul frontal", "la fiecare 1 ms"], c: 1, e: "Programare prin flux de date." },
  { q: "Cu λ = 0,9 (amestec bogat) masa de combustibil pe ciclu, la același aer:", o: ["scade cu 10 %", "crește cu ≈ 11 %", "rămâne aceeași", "crește cu 90 %"], c: 1, e: "m<sub>c</sub> = m<sub>a</sub>/(λ·L<sub>0</sub>): 1/0,9 = 1,11." },
  { q: "O corecție λ pe termen lung (LTFT) de +15 % la ralanti indică:", o: ["harta η<sub>v</sub> subestimează aerul (ex. aer fals)", "injectoare prea mari", "bateria descărcată", "sonda λ în stare perfectă"], c: 0, e: "ECU adaugă combustibil pentru că aerul real este mai mult decât cel calculat." }
];

/* ------------------------------------------------------------------ definiția lucrării */
const UNELTE = `<div class="lv-unelte" role="toolbar" aria-label="Bara de unelte a instrumentului virtual">
  <button type="button" id="lv-run" title="Run – o execuție" aria-label="Run">➔</button>
  <button type="button" id="lv-cont" title="Run Continuously" aria-label="Run Continuously" aria-pressed="true">⟳</button>
  <button type="button" id="lv-abort" title="Abort Execution" aria-label="Abort">■</button>
  <span class="sep"></span>
  <button type="button" id="lv-evid" title="Highlight Execution (diagrama bloc)" aria-label="Highlight Execution" aria-pressed="false">💡</button>
  <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
  <span class="lv-tab"><button type="button" data-vedere="panou" aria-pressed="true">Panou frontal</button><button type="button" data-vedere="diagrama" aria-pressed="false">Diagramă bloc</button></span>
</div>`;
Cadru.porneste({
  disc: "SAA", nr: 2, cod: "saa-l2",
  titlu: "Modelarea duratei de injecție pe baza debitului de aer – aplicație virtuală",
  scurt: "Modelul duratei de injecție",
  subtitlu: "Laborator virtual – instrument virtual de tip LabVIEW (panou frontal și diagramă bloc), calibrarea hărții de eficiență volumetrică",
  parametri: MD2.parametri,
  parametriDemo() { return MD2.parametri(20261002); },
  date: [{ k: "Vs", et: "V<sub>s</sub> [cm³]", v: 347.5, fix: true }, { k: "R", et: "R [J/(kg·K)]", v: 287, fix: true }, { k: "L0", et: "L<sub>0</sub> benzină [–]", v: 14.7, fix: true }],
  tabele: [
    { id: "t21", titlu: "Tabelul 2.1. Validarea modelului", antetRand: "Regim", nota: "t<sub>i</sub> măsurat, p și n – din fișa postului (Tabelul 1.2, lucrarea 1); ε după relația (2.7).",
      randuri: CHEI.map(k => ({ k, et: ET[k] })),
      coloane: [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "p", t: "p [kPa]", intrare: true }, { k: "tiM", t: "t<sub>i</sub> măsurat [ms]", intrare: true }, { k: "ti08", t: "t<sub>i</sub> model (η<sub>v</sub> = 0,8) [ms]", intrare: true }, { k: "e08", t: "Eroare [%]" },
        { k: "ev", t: "η<sub>v</sub> ajustat [–]", intrare: true }, { k: "tiAdj", t: "t<sub>i</sub> model ajustat [ms]", intrare: true }, { k: "eAdj", t: "Eroare finală [%]" }] },
    { id: "t22", titlu: "Tabelul 2.2. Influența tensiunii bateriei și a temperaturii aerului (ralanti, η<sub>v</sub> ajustat)", antetRand: "Variantă", nota: "Referința: t<sub>i</sub> model ajustat la ralanti (U<sub>bat</sub> = 13,9 V, T<sub>a</sub> = 300 K) din Tabelul 2.1.",
      randuri: CHEI_SENS.map(k => ({ k, et: SENS[k].et })),
      coloane: [{ k: "ti", t: "t<sub>i</sub> [ms]", intrare: true }, { k: "dms", t: "Δt<sub>i</sub> [ms]" }, { k: "dti", t: "Δt<sub>i</sub> [%]" }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaSAA2,
  intrebari() {
    return [
      { id: "q1", u: "", text: "Eficiența volumetrică la ralanti care anulează eroarea (inversați relațiile 2.1–2.3 cu valorile din fișa postului):", textSimplu: "Eficiența volumetrică exactă la ralanti" },
      { id: "q2", u: "", text: "Eficiența volumetrică exactă la 3000 rot/min:", textSimplu: "Eficiența volumetrică exactă la 3000 rot/min" },
      { id: "q3", u: "ms", text: "Cu cât crește t<sub>i</sub> la ralanti când U<sub>bat</sub> scade de la 14,5 V la 12 V?", textSimplu: "Creșterea duratei de injecție la scăderea tensiunii bateriei" },
      { id: "q4", u: "ms", text: "Ce t<sub>i</sub> ar comanda ECU la ralanti cu E85 (L<sub>0</sub> = 9,8), la același debit de aer (η<sub>v</sub> de la întrebarea 1, U<sub>bat</sub> = 13,9 V)?", textSimplu: "Durata de injecție la ralanti cu E85" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = CHEI.filter(k => t.t21[k].ti08 !== "").length; if (a < 5) l.push(`Tabelul 2.1: t_i model cu η_v = 0,8 (${a}/5 regimuri)`);
    const b = CHEI.filter(k => t.t21[k].ev !== "").length; if (b < 5) l.push(`Tabelul 2.1: η_v ajustat (${b}/5 regimuri)`);
    const c = CHEI_SENS.filter(k => t.t22[k].ti !== "").length; if (c < 4) l.push(`Tabelul 2.2: ${c}/4 variante`);
    return l;
  },
  exemplu(D) {
    const t = D.t;
    Object.assign(t.t21.ral, { n: "800", p: "35.0", tiM: "3.40", ti08: "3.744", ev: "0.700", tiAdj: "3.400" });
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Modelul în funcționare – autoturism cu motor 1.4 MPI",
    intro: `<p>Același calcul îl face ECU de sute de ori pe secundă. Porniți motorul și urmăriți pe osciloscopul din colț presiunea din colector (MAP, CH1) și comanda injectorului 1 (CH2): t<sub>i</sub> urmărește MAP-ul, iar la decelerare injecția se întrerupe. Afișați și senzorul IAT și CTS (temperaturile folosite în corecții).</p>`,
    dupa: `<p class="nota">Modelul semnalelor este tipic, nu cel individual din fișa postului.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "map", canale: ["inj1"] })
  },
  referat: {
    scop: "Construirea și validarea modelului speed-density al duratei de injecție pe datele măsurate la lucrarea 1, ajustarea hărții η<sub>v</sub> = f(n) și analiza influenței tensiunii bateriei și a temperaturii aerului.",
    relatii: "m<sub>a</sub> = η<sub>v</sub>·p·V<sub>s</sub>/(R·T<sub>a</sub>); &nbsp; m<sub>c</sub> = m<sub>a</sub>/(λ·L<sub>0</sub>); &nbsp; t<sub>i</sub> = m<sub>c</sub>/q<sub>s</sub> + t<sub>mort</sub>(U<sub>bat</sub>); &nbsp; ε = (t<sub>i,model</sub> − t<sub>i,măs</sub>)/t<sub>i,măs</sub>·100.",
    varianta: () => "Fișa postului cu citirile din Tabelul 1.2 și cu q<sub>s</sub> și t<sub>mort</sub> ale injectoarelor standului, individuale pentru fiecare student.",
    indicatii: "Comentați eroarea modelului cu η_v constant, forma hărții η_v = f(n), influența tensiunii bateriei (numai prin timpul mort) și a temperaturii aerului, limitele modelului…"
  },
  subsol: "Instrument virtual după modelul aplicației LabVIEW din îndrumar: model speed-density cu V<sub>s</sub> = 347,5 cm³, R = 287 J/(kg·K), injector cu timp mort dependent de tensiune. Fișa postului este individuală.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila lv">
    <div class="card sim-scena scena" style="padding:.6rem">
      <div class="lv-fereastra">
        <div class="lv-titlu"><b>Durata_injectiei_speed-density.vi</b><span id="lv-mod">Panou frontal</span></div>
        <div class="lv-meniu" aria-hidden="true"><span>File</span><span>Edit</span><span>View</span><span>Project</span><span>Operate</span><span>Tools</span><span>Window</span><span>Help</span></div>
        ${UNELTE}
        <div id="lv-fp">${HTML_PANOU}</div>
        <div id="lv-diag" class="lv-diagrama" hidden>${htmlDiagrama()}</div>
        <div class="lv-stare"><span id="lv-st">Rulează continuu</span><span id="lv-it"></span></div>
      </div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Fișa postului (lucrarea 1)</h2>
      <div class="fisa" id="fisa"></div>
      <div class="rand-butoane" style="margin-top:.5rem"><button type="button" class="primar" id="btn-inc">Încarcă regimul în VI</button><button type="button" id="btn-ex">Exemplul din îndrumar</button></div>
      <h2>Tabelul 2.1</h2>
      <button type="button" class="primar lat" id="btn-08">● t<sub>i</sub> model (η<sub>v</sub> = 0,8) → Tabelul 2.1</button>
      <button type="button" class="primar lat" id="btn-adj">● η<sub>v</sub> ajustat și t<sub>i</sub> → Tabelul 2.1</button>
      <h2>Tabelul 2.2 (ralanti)</h2>
      <div class="lv-buton-rand"><button type="button" data-sens="U12">U<sub>bat</sub> = 12 V</button><button type="button" data-sens="U145">U<sub>bat</sub> = 14,5 V</button><button type="button" data-sens="T10">T<sub>a</sub> = 283 K</button><button type="button" data-sens="T50">T<sub>a</sub> = 323 K</button></div>
      <button type="button" class="primar lat" id="btn-sens">● t<sub>i</sub> → Tabelul 2.2</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Selectați un regim în fișă (clic pe rând), încărcați-l în VI, apoi modificați numai η<sub>v</sub>. Pentru Tabelul 2.2: la ralanti, cu η<sub>v</sub> ajustat, butoanele setează U<sub>bat</sub> sau T<sub>a</sub>.</p>
    </aside>
  </div>`,
    init(C) {
      legaFisa(); seteazaComenzi();
      const schimba = (k, v) => { if (k === "comb") vi.c.comb = v; else { const x = num(v); if (!Number.isFinite(x)) return; vi.c[k] = x; } seteazaComenzi(); if (vi.rulare === "cont") executa(); };
      $$("[data-vc]").forEach(i => i.addEventListener(i.tagName === "SELECT" ? "change" : "input", () => schimba(i.dataset.vc, i.value)));
      $$("[data-vs]").forEach(s => s.addEventListener("input", () => schimba(s.dataset.vs, s.value)));
      $$("[data-vp]").forEach(b => b.addEventListener("click", () => { const k = b.dataset.vp, i = $(`[data-vc="${k}"]`), pas = Number(i.step) || 1; const v = rot(vi.c[k] + pas * Number(b.dataset.d), 4); schimba(k, String(Math.min(Number(i.max), Math.max(Number(i.min), v)))); }));
      const modRulare = m => { vi.rulare = m; $("#lv-cont").setAttribute("aria-pressed", m === "cont" ? "true" : "false"); $("#lv-st").textContent = m === "cont" ? "Rulează continuu" : m === "oprit" ? "Oprit (Abort) – apăsați Run pentru o execuție" : "Execuție unică"; if (m === "cont") executa(); };
      $("#lv-run").addEventListener("click", () => { if (vi.rulare === "cont") modRulare("unic"); else vi.rulare = "unic"; executa(); $("#lv-st").textContent = "Execuție unică terminată"; });
      $("#lv-cont").addEventListener("click", () => modRulare(vi.rulare === "cont" ? "unic" : "cont"));
      $("#lv-abort").addEventListener("click", () => modRulare("oprit"));
      $("#lv-evid").addEventListener("click", () => { vi.evid = !vi.evid; vi.tEvid = performance.now(); $("#lv-evid").setAttribute("aria-pressed", String(vi.evid)); });
      $$("[data-vedere]").forEach(b => b.addEventListener("click", () => { vi.vedere = b.dataset.vedere; $$("[data-vedere]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); $("#lv-fp").hidden = vi.vedere !== "panou"; $("#lv-diag").hidden = vi.vedere !== "diagrama"; $("#lv-mod").textContent = vi.vedere === "panou" ? "Panou frontal" : "Diagramă bloc"; afiseaza(); }));
      $("#btn-inc").addEventListener("click", incarcaRegim);
      $("#btn-ex").addEventListener("click", () => { Object.assign(vi.c, { p: 35, n: 800, Vs: 350, Ta: 313, ev: 0.65, lam: 1, U: 14, comb: "benzina", qs: 2.5, tm0: 0.8 }); seteazaComenzi(); if (vi.rulare === "cont") executa(); });
      $("#btn-08").addEventListener("click", inreg08);
      $("#btn-adj").addEventListener("click", inregAdj);
      $$("[data-sens]").forEach(b => b.addEventListener("click", () => { const s = SENS[b.dataset.sens]; vi.k = "ral"; legaFisa(); const Pp = P(), f = Pp.fisa.ral, evR = num(Cadru.D.t.t21.ral.ev); Object.assign(vi.c, { p: f.p, n: f.n, Vs: 347.5, lam: 1, comb: "benzina", qs: Pp.qs, tm0: Pp.tm0, U: s.U, Ta: s.Ta }); if (Number.isFinite(evR)) vi.c.ev = evR; seteazaComenzi(); if (vi.rulare === "cont") executa(); }));
      $("#btn-sens").addEventListener("click", inregSens);
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      ["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, () => setTimeout(afiseaza, 120)));
      executa();
      C.mesaj("Verificați modelul pe exemplul din îndrumar (t_i ≈ 3,2 ms), apoi încărcați pe rând regimurile din fișa postului.", "");
    },
    aplicaEval() { if ($("#fisa")) legaFisa(); },
    reset() { vi.k = "ral"; if ($("#fisa")) legaFisa(); },
    cadru(dt, C, vizibil) { if (vizibil) animatieDiagrama(performance.now()); },
    redeseneaza() { deseneazaGraf(); deseneazaEv(); },
    formule() {
      const r = vi.rez, x = vi.rezIn; if (!r) return [];
      return [
        ["Masa de aer (2.1)", `m<sub>a</sub> = ${fmt(x.ev, 3)}·${fmt(x.p * 1000, 0)}·${fmt(x.Vs, 1)}·10<sup>−6</sup>/(287·${fmt(x.Ta, 0)}) = <span class="rez">${fmt(r.ma, 2)} mg</span>`],
        ["Masa de combustibil (2.2)", `m<sub>c</sub> = ${fmt(r.ma, 2)}/(${fmt(x.lam, 2)}·${fmt(x.L0, 1)}) = <span class="rez">${fmt(r.mc, 3)} mg</span>`],
        ["Durata injecției (2.3)", `t<sub>i</sub> = ${fmt(r.mc, 3)}/${fmt(x.qs, 3)} + ${fmt(r.tm, 3)} = <span class="rez">${fmt(r.ti, 3)} ms</span>`],
        ["Eroarea față de măsurare (2.7)", `ε = (${fmt(r.ti, 3)} − ${fmt(P().fisa[vi.k].ti, 2)})/${fmt(P().fisa[vi.k].ti, 2)}·100 = <span class="rez">${fmt(eroare(vi.k), 2)} %</span>`]
      ];
    }
  }
});
