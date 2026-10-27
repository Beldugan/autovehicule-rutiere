/* DA – Lucrarea 1. Diagnoza computerizată și rețeaua de date CAN.
   Simulator: autoturism 2025 cu gateway central și 5 magistrale (diagnoză, motor, șasiu CAN FD, confort, infotainment),
   29 de module, Ethernet auto; machetă 3D și schema rețelei; tester multimarcă X431 (scanare, coduri, freeze-frame,
   monitoare, date live, analiza magistralei), cititor OBD generic, multimetru cu clește ampermetric și osciloscop cu 4 canale
   la priza OBD sau la conectorii gateway-ului. Fiecare student are rețeaua proprie, un caz „client” și un defect de rețea ascuns. */
"use strict";
const MD = MODELE["da-l1"];
const { MODULE, MAG, STARI } = MD;
const NUME_MOD = {}; MODULE.forEach(m => NUME_MOD[m.k] = m.nume);
const NUME_MON = { mis: "Rateuri de aprindere", fuel: "Sistem de alimentare", ccm: "Componente (CCM)", cat: "Catalizator", o2: "Sonde λ și încălzitor", egr: "EGR / aer secundar", dpf: "Filtru de particule (diesel)" };
const NUME_MAG = b => MAG[b].n.split(" (")[0];
const PUNCTE = { diag: "Priza OBD, pinii 6 / 14 – CAN diagnoză", motor: "Conectorul gateway – CAN motor", sasiu: "Conectorul gateway – CAN șasiu (FD)", confort: "Conectorul gateway – CAN confort", info: "Conectorul gateway – CAN infotainment" };
const T_REPAUS = 40;                       // [s] până la intrarea rețelei în repaus după decuplarea contactului

/* ------------------------------------------------------------------ starea simulatorului */
const sim = {
  contact: false, tOff: 999, t: 0, defActiv: false, defectDemo: "term_lipsa", busDemo: "sasiu", vent: false,
  x431: false, obd: false, aparat: "x431", vx: "scan", scan: null, modCod: "ecm", sterse: false, ciclu: 0,
  mm: "r", punct: "diag", vedere: "3d",
  osc: { tdiv: 2e-6, ruleaza: true, c1: 2, c2: 7, buf: [], t0: 0, benzi: false,
    ch: [{ c: "h", on: true, vdiv: 1, poz: -2 }, { c: "l", on: true, vdiv: 1, poz: -2 }, { c: "d", on: false, vdiv: 1, poz: -3 }, { c: "b", on: false, vdiv: 5, poz: -3 }] }
};
function P() { return Cadru.P; }
function defect() { return MOD.eval ? P().defect : sim.defectDemo; }
function defBus() { return MOD.eval ? P().defBus : sim.busDemo; }
function pr() { return Object.assign({}, P(), { defect: defect(), defBus: defBus() }); }
function dA() { return sim.defActiv ? 1 : 0; }
function treaza() { return sim.contact || sim.tOff < T_REPAUS; }
function nivel(b = sim.punct) { return MD.niveluri(pr(), sim.defActiv, b); }
function comunica(b = sim.punct) { return treaza() && nivel(b).com; }
function raspunde(k) { return sim.contact && MD.raspunde(pr(), sim.defActiv, k); }
function codurileActuale() { const l = MD.coduri(pr(), sim.defActiv); return sim.sterse && sim.ciclu === 0 ? l.filter(c => c.cod.startsWith("U")) : l; }

/* ------------------------------------------------------------------ semnalele magistralei la punctul de măsură */
const FB = MD.FBIT;
function hash(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function perioadaCadru(b) { return Math.max(MD.NBITI + 3, Math.round(MD.NBITI / (MD.incarcare(P(), b) / 100))); }      // [biți]
function perioadaFD() { return 130e-6 / (MD.incarcare(P(), "sasiu") / 100); }                                         // [s]
const CADRE = new Map();
/** cadrul standard cu 8 octeți (1 = dominant): SOF, ID, RTR, IDE, r0, DLC, date, CRC – cu biți de umplere –, apoi delimitatorul CRC, ACK, EOF și pauza */
function cadru(k, b) {
  const cheie = b + k; let c = CADRE.get(cheie); if (c) return c;
  const id = Math.floor(hash(k * 7 + 3 + b.length) * 2048), raw = [1];
  for (let j = 10; j >= 0; j--) raw.push(id & (1 << j) ? 0 : 1);
  raw.push(1, 1, 1, 0, 1, 1, 1);                                                    // RTR, IDE, r0 dominanți; DLC = 8 (1000)
  for (let j = 0; j < 64 + 15; j++) raw.push(hash(k * 131 + j + b.length * 1000) < 0.5 ? 1 : 0);
  c = SEMNALE.umplere(raw, raw.length).slice(0, MD.NBITI - 10);
  c.push(0, 1, 0); while (c.length < MD.NBITI) c.push(0);
  if (CADRE.size > 400) CADRE.clear(); CADRE.set(cheie, c); return c;
}
function bitDom(i, b) {
  const Tf = perioadaCadru(b), k = Math.floor(i / Tf), p = i - k * Tf;
  return p >= MD.NBITI ? 0 : cadru(k, b)[p];
}
/** {v, vp, dt}: bitul curent, cel anterior și timpul scurs de la ultimul front [s] */
function bitLa(t, b) {
  if (b !== "sasiu") { const i = Math.floor(t * FB); return { v: bitDom(i, b), vp: bitDom(i - 1, b), dt: (t * FB - i) / FB }; }
  const Tp = perioadaFD(), k = Math.floor(t / Tp), tt = t - k * Tp, A = 2e-6, D = 0.5e-6;
  let fd = CADRE.get("fd" + k);
  if (!fd) {
    const r = [1], id = Math.floor(hash(k * 7 + 9) * 2048);
    for (let j = 10; j >= 0; j--) r.push(id & (1 << j) ? 0 : 1);
    for (let j = 12; j < 30; j++) r.push(hash(k * 131 + j) < 0.5 ? 1 : 0);
    for (let j = 0; j < 80; j++) r.push(hash(k * 977 + j) < 0.5 ? 1 : 0);
    const u = SEMNALE.umplere(r, r.length); fd = [u.slice(0, 30), u.slice(30, 110)];
    if (CADRE.size > 400) CADRE.clear(); CADRE.set("fd" + k, fd);
  }
  const arb = i => fd[0][i] || 0, dat = j => fd[1][j] || 0;
  if (tt >= 130e-6) return { v: 0, vp: 0, dt: 1 };
  if (tt < 60e-6) { const i = Math.floor(tt / A); return { v: arb(i), vp: i ? arb(i - 1) : 0, dt: tt - i * A }; }
  if (tt < 100e-6) { const j = Math.floor((tt - 60e-6) / D); return { v: dat(j), vp: j ? dat(j - 1) : arb(29), dt: tt - 60e-6 - j * D }; }
  const i = Math.floor((tt - 100e-6) / A), f = n => n === 1 ? 1 : 0;
  return { v: f(i), vp: i ? f(i - 1) : dat(79), dt: tt - 100e-6 - i * A };
}
function stareMag(t, b) {
  const { v, vp, dt } = bitLa(t, b);
  let s = v; if (v !== vp) s = vp + (v - vp) * (1 - Math.exp(-dt / 30e-9));
  const e = sim.defActiv && b === defBus() ? defect() : "";
  if ((e === "term_lipsa" || e === "intrerupt") && v !== vp) s += (v - vp) * 0.28 * Math.exp(-dt / 120e-9) * Math.sin(2 * Math.PI * dt / 100e-9);
  return s;
}
function semnal(c, t) {
  if (c === "b") return sim.contact ? P().Ubat - 0.06 + (sim.vent ? -P().I * 0.012 : 0) : P().Ubat;
  if (!treaza()) return (hash(t * 1e7) - 0.5) * 0.01;
  const b = sim.punct, n = nivel(b), zg = (hash(t * 3.1e7) - 0.5) * 0.02;
  const s = n.com ? stareMag(t, b) : 0;
  const H = n.rH + (n.dH - n.rH) * s + zg, L = n.rL + (n.dL - n.rL) * s - zg * 0.8;
  return c === "h" ? H : c === "l" ? L : H - L;
}

/* ------------------------------------------------------------------ schema rețelei (SVG) */
const SV = {};
const RANDURI = ["motor", "sasiu", "confort", "info"], Y_RAND = { motor: 70, sasiu: 165, confort: 260, info: 355 };
const CUL_H = { diag: "#ffc04d", motor: "#f39a2b", sasiu: "#e8503a", confort: "#5cbf5a", info: "#9b6ad6" }, CUL_L = "#8a5a2b";
function construiesteSVG() {
  const svg = $("#svg-retea"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs); filtre(defs);
  grad(defs, "gFundal", [[0, "#2a3038"], [1, "#161a1f"]]);
  grad(defs, "gModul", [[0, "#4a5058"], [0.5, "#30353b"], [1, "#1d2025"]]);
  const g = mk("g", {}, svg); SV.g = g;
  mk("rect", { x: 0, y: 0, width: 900, height: 470, fill: "url(#gFundal)" }, g);
  const T = (x, y, txt, o = {}) => { const e = mk("text", Object.assign({ x, y, "font-size": 10, fill: "#e6ebf0", "text-anchor": "middle", "font-weight": 600 }, o), g); e.textContent = txt; return e; };
  const pereche = (x1, y1, x2, y2, b, gr) => {
    const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(3, Math.round(L / 8)), nx = -(y2 - y1) / L, ny = (x2 - x1) / L, a = [], c = [];
    for (let i = 0; i <= n; i++) { const u = i / n, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u, o = 2.4 * Math.sin(i * Math.PI / 2); a.push(`${x + nx * o},${y + ny * o}`); c.push(`${x - nx * o},${y - ny * o}`); }
    mk("polyline", { points: a.join(" "), fill: "none", stroke: CUL_H[b], "stroke-width": 2.2 }, gr);
    mk("polyline", { points: c.join(" "), fill: "none", stroke: CUL_L, "stroke-width": 2.2 }, gr);
  };
  const rez = (x, y) => { mk("rect", { x: x - 11, y: y - 5, width: 22, height: 10, rx: 2, fill: "#c9a227", stroke: "#4a3b0a" }, g); [-4, 0, 4].forEach((d, i) => mk("line", { x1: x + d, y1: y - 5, x2: x + d, y2: y + 5, stroke: ["#7a3b10", "#111", "#c62828"][i], "stroke-width": 1.6 }, g)); };
  // gateway central
  mk("rect", { x: 18, y: 30, width: 104, height: 360, rx: 10, fill: "url(#gModul)", stroke: "#0b0d10", filter: "url(#fUmbra)" }, g);
  T(70, 205, "GATEWAY", { "font-size": 13, "font-weight": 800 }); T(70, 222, "central", { "font-size": 10, fill: "#aab4be" });
  SV.mod = {}; SV.pozMod = {};
  RANDURI.forEach(b => {
    const y = Y_RAND[b], mods = MODULE.filter(m => m.b === b), x0 = 140, x1 = 860, w = (x1 - x0) / mods.length;
    const gb = mk("g", {}, g); pereche(122, y, x1 + 14, y, b, gb);
    rez(132, y); rez(x1 + 18, y);
    T(140, y - 40, NUME_MAG(b) + " · " + MAG[b].v, { "text-anchor": "start", "font-size": 9.5, fill: CUL_H[b] });
    mods.forEach((m, i) => {
      const cx = x0 + w * (i + 0.5) + (m.k === MAG[b].capat ? 0 : 0), gg = mk("g", {}, g); SV.mod[m.k] = gg; SV.pozMod[m.k] = [cx, y - 20];
      pereche(cx, y - 14, cx, y, b, gg);
      mk("rect", { x: cx - w / 2 + 3, y: y - 34, width: w - 6, height: 22, rx: 4, fill: "url(#gModul)", stroke: m.k === MAG[b].capat ? "#ffd36b" : "#0b0d10" }, gg);
      const t = mk("text", { x: cx, y: y - 20, "font-size": Math.min(9.5, (w - 8) / (m.sc.length * 0.56)), "text-anchor": "middle", "font-weight": 700, fill: "#eef2f5" }, gg); t.textContent = m.sc;
    });
  });
  T(870, 30, "R = 120 Ω la capete (gateway și modulul de capăt, marcat cu galben)", { "text-anchor": "end", "font-size": 9, fill: "#ffd36b", "font-weight": 500 });
  // magistrala de diagnoză și priza OBD
  const yd = 430; SV.Yd = yd; pereche(122, yd - 30, 330, yd - 30, "diag", g); rez(132, yd - 30); rez(318, yd - 18);
  T(140, yd - 42, "CAN diagnoză · 500 kbit/s", { "text-anchor": "start", "font-size": 9.5, fill: CUL_H.diag });
  mk("path", { d: `M122 ${yd - 14} C 200 ${yd - 14}, 260 ${yd + 6}, 330 ${yd + 6}`, stroke: "#2fae5a", "stroke-width": 2, fill: "none", "stroke-dasharray": "5 3" }, g);
  T(225, yd + 22, "Ethernet DoIP (pinii 3/11, 12/13)", { "font-size": 9, fill: "#7fd99a", "font-weight": 500 });
  const ox = 410, oy = 420; SV.obd = [ox, oy];
  mk("rect", { x: ox - 80, y: oy - 34, width: 160, height: 62, rx: 10, fill: "url(#gNegru)", stroke: "#000", filter: "url(#fUmbra)" }, g);
  mk("path", { d: `M${ox - 68} ${oy - 24} L ${ox + 68} ${oy - 24} L ${ox + 60} ${oy + 18} L ${ox - 60} ${oy + 18} Z`, fill: "#15171a", stroke: "#555" }, g);
  SV.pin = {};
  for (let i = 1; i <= 16; i++) {
    const r = i <= 8 ? 0 : 1, c = (i - 1) % 8, x = ox - 52 + c * 15 + (r ? 3 : 0), y = oy - 12 + r * 18;
    const sp = { 3: "#2fae5a", 11: "#2fae5a", 12: "#2fae5a", 13: "#2fae5a", 4: "#9aa2ab", 5: "#9aa2ab", 6: "#ffc04d", 14: CUL_L, 16: "#d32f2f" }[i];
    mk("circle", { cx: x, cy: y, r: 3.6, fill: sp || "#5a6068", stroke: "#000" }, g);
    const t = mk("text", { x, y: y + (r ? 12 : -6), "font-size": 6.5, fill: "#cfd6dd", "text-anchor": "middle" }, g); t.textContent = i;
    SV.pin[i] = [x, y];
  }
  // bateria, siguranța și ventilatorul
  mk("rect", { x: 520, y: 400, width: 86, height: 56, rx: 6, fill: "#1d1f22", stroke: "#000" }, g); T(563, 432, "12 V · 70 Ah AGM", { fill: "#9aa3ad", "font-size": 9 });
  mk("rect", { x: 620, y: 400, width: 90, height: 56, rx: 6, fill: "#2b2f35", stroke: "#000" }, g);
  for (let i = 0; i < 4; i++) mk("rect", { x: 630 + i * 19, y: 408, width: 12, height: 22, rx: 2, fill: ["#e53935", "#1e88e5", "#fdd835", "#43a047"][i], opacity: i === 2 ? 1 : 0.55 }, g);
  SV.sig = [636 + 2 * 19, 408]; T(665, 448, "siguranța ventilatorului", { "font-size": 8.5, fill: "#cfd6dd", "font-weight": 500 });
  mk("path", { d: "M606 420 L 620 420", stroke: "#c62828", "stroke-width": 3 }, g);
  mk("path", { d: "M674 400 C 690 380, 720 380, 742 400", stroke: "#c62828", "stroke-width": 2.5, fill: "none" }, g);
  SV.vent = mk("g", { transform: "translate(768,425)" }, g); mk("circle", { r: 24, fill: "#1b1d20", stroke: "#000" }, SV.vent);
  SV.palete = mk("g", {}, SV.vent); for (let k = 0; k < 5; k++) mk("path", { d: "M0 0 C 6 -10, 15 -15, 8 -22 L 3 -20 C 4 -13, 0 -7, 0 0", fill: "#3b4046", transform: `rotate(${k * 72})` }, SV.palete);
  SV.pachete = mk("g", {}, g); SV.sonde = mk("g", {}, g); SV.defect = mk("g", {}, g); SV.stari = mk("g", {}, g);
  prefixeazaId(svg, "d1-");
  actualizeazaSVG(0);
}
function actualizeazaSVG(dt) {
  if (!SV.g || sim.vedere !== "schema") return;
  const ts = performance.now() / 1000;
  SV.pachete.innerHTML = "";
  ["diag"].concat(RANDURI).forEach(b => {
    if (!comunica(b)) return;
    const y = b === "diag" ? SV.Yd - 30 : Y_RAND[b], x0 = 125, x1 = b === "diag" ? 330 : 874;
    for (let i = 0; i < 4; i++) { const u = (ts * 0.3 + i / 4 + b.length * 0.13) % 1; mk("circle", { cx: x0 + u * (x1 - x0), cy: y, r: 3, fill: "#fff6c2", opacity: 0.85 }, SV.pachete); }
  });
  if (sim.vent && sim.contact) { SV.uv = ((SV.uv || 0) + 1400 * dt) % 360; SV.palete.setAttribute("transform", `rotate(${SV.uv})`); }
  // sondele
  SV.sonde.innerHTML = "";
  const varf = (p, col) => mk("circle", { cx: p[0], cy: p[1], r: 5, fill: "none", stroke: col, "stroke-width": 2.2 }, SV.sonde);
  const fir = (p, col) => mk("path", { d: `M${p[0]} ${p[1]} C ${p[0] + 30} ${p[1] + 40}, ${p[0] + 80} 470, ${p[0] + 150} 470`, fill: "none", stroke: col, "stroke-width": 2 }, SV.sonde);
  if (sim.x431 || sim.obd) { const [x, y] = SV.obd; mk("path", { d: `M${x + 80} ${y} C ${x + 100} ${y}, ${x + 100} 466, ${x + 120} 466`, fill: "none", stroke: sim.x431 ? "#2a5bd7" : "#8e44ad", "stroke-width": 5 }, SV.sonde); }
  const pPunct = () => sim.punct === "diag" ? [SV.pin[6], SV.pin[14]] : [[124, Y_RAND[sim.punct] - 3], [124, Y_RAND[sim.punct] + 3]];
  if (sim.aparat === "mm") {
    if (["r", "vh", "vl"].includes(sim.mm)) { const [a, c] = pPunct(); const gnd = SV.pin[4]; varf(sim.mm === "vl" ? c : a, "#d32f2f"); fir(sim.mm === "vl" ? c : a, "#d32f2f"); const n = sim.mm === "r" ? c : gnd; varf(n, "#222"); fir(n, "#111"); }
    else if (sim.mm === "v16") { varf(SV.pin[16], "#d32f2f"); fir(SV.pin[16], "#d32f2f"); varf(SV.pin[4], "#222"); fir(SV.pin[4], "#111"); }
    else if (sim.mm === "vf0" || sim.mm === "vfs") { const p = [SV.sig[0] + 6, SV.sig[1] + (sim.mm === "vf0" ? 0 : 22)]; varf(p, "#d32f2f"); fir(p, "#d32f2f"); }
    else if (sim.mm === "ia") { mk("ellipse", { cx: 720, cy: 392, rx: 10, ry: 14, fill: "none", stroke: "#fdd835", "stroke-width": 4 }, SV.sonde); }
  }
  if (sim.aparat === "osc") { const [a, c] = pPunct(); [[a, "#ffe14d"], [c, "#4fd6ff"]].forEach(([p, col]) => { varf(p, col); fir(p, col); }); }
  // starea modulelor (după scanare – doar ce a raportat testerul)
  SV.stari.innerHTML = "";
  if (sim.scan) sim.scan.mods.forEach(m => { const p = SV.pozMod[m.k]; if (!p) return; mk("circle", { cx: p[0] + 22, cy: p[1] - 10, r: 3.5, fill: m.raspunde ? (m.erori ? "#ffb020" : "#3ccf6a") : "#ff3b3b" }, SV.stari); });
  SV.defect.innerHTML = "";
  if (!MOD.eval && sim.defActiv) {
    const b = defBus(), cap = MAG[b].capat, y = Y_RAND[b], e = defect();
    const X = { term_lipsa: [878, y], term_supl: [520, y], scurt_hl: [300, y], canl_masa: [420, y], intrerupt: [800, y], alim: SV.pozMod[cap] }[e];
    mk("circle", { cx: X[0], cy: X[1], r: 14, fill: "none", stroke: "#ff3b3b", "stroke-width": 3, "stroke-dasharray": "5 3" }, SV.defect);
  }
}

/* ------------------------------------------------------------------ macheta 3D (aceeași rețea, pe autoturism) */
function porneste3D() {
  const el = $("#retea3d"); if (!el) return;
  import(BAZA_COMUN + "vehicul3d.js?v=32").then(m => {
    SV.v3d = m.creeaza(el, { sistem: "retea", control: {
      stare: () => ({ contact: sim.contact || treaza(), defBus: defBus(), defTip: sim.defActiv ? defect() : "", arataDefect: !MOD.eval, punct: sim.punct, sonde: sim.aparat === "mm" || sim.aparat === "osc" }),
      onSelect: k => { if (MD.MK[k] && raspunde(k)) { sim.modCod = k; if (sim.vx === "cod") panouX431(); } $("#af-sel").textContent = k === "obd" ? "Priza OBD (J1962)" : MD.MK[k].nume; $("#af-sel-b").textContent = k === "obd" ? "CAN diagnoză + DoIP" : k === "gw" ? "toate magistralele" : NUME_MAG(MD.MK[k].b) + " · " + MD.MK[k].adr; }
    } });
  }).catch(e => { console.warn("3D indisponibil:", e); comutaVedere("schema"); $("#btn-v3d").disabled = true; });
}
function comutaVedere(v) {
  sim.vedere = v;
  $("#retea3d").hidden = v !== "3d"; $("#svg-retea").style.display = v === "schema" ? "" : "none";
  $$("[data-vedere]").forEach(b => b.setAttribute("aria-pressed", b.dataset.vedere === v ? "true" : "false"));
  if (v === "schema") actualizeazaSVG(0);
}
/* ------------------------------------------------------------------ osciloscopul (4 canale) */
const TDIV = [0.2e-6, 0.5e-6, 1e-6, 2e-6, 5e-6, 10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6];
const VDIV = [0.2, 0.5, 1, 2, 5];
const SURSE = { h: "CAN-H (pin 6)", l: "CAN-L (pin 14)", d: "CH1 − CH2 (U<sub>diff</sub>)", b: "+12 V (pin 16)" };
const CULORI_CH = ["#ffe14d", "#4fd6ff", "#ff6bd6", "#6dff8e"];
function fmtT(s) { return s >= 1e-3 ? fmt(s * 1000, s >= 0.01 ? 0 : 1) + " ms" : fmt(s * 1e6, s >= 1e-5 ? 0 : 1) + " µs"; }
function achizitie() {
  const o = sim.osc, N = 1500, T = o.tdiv * 10;
  let t0 = sim.t - T;
  if (comunica()) {                                                     // declanșare pe SOF (începutul cadrului)
    const b = sim.punct;
    if (b === "sasiu") { const Tp = perioadaFD(); t0 = Math.floor(t0 / Tp) * Tp - o.tdiv; }
    else { const Tf = perioadaCadru(b), i = Math.floor(t0 * FB), k = Math.floor(i / Tf); t0 = (k * Tf) / FB - o.tdiv; }
  }
  o.buf = o.ch.map(ch => { if (!ch.on) return null; const b = new Float32Array(N); for (let i = 0; i < N; i++) { const t = t0 + T * i / (N - 1); b[i] = SEMNALE.achizitie(ch.c === "d" ? semnal("h", t) - semnal("l", t) : semnal(ch.c, t), ch.vdiv, 12, 8, ch.poz); } return b; });
  o.t0 = t0;
}
function deseneazaOsc() {
  const cv = $("#cv-osc"); if (!cv || !cv.getClientRects().length) return;
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, o = sim.osc;
  const nAct = o.ch.filter(c => c.on).length, benzi = o.benzi && nAct > 1;
  const Hmin = benzi ? 60 + 135 * nAct : 320;
  const fe = document.fullscreenElement || document.webkitFullscreenElement, ecran = (fe && fe.contains(cv)) || !!cv.closest(".ecran-plin");
  const H = ecran ? clamp(Math.round(window.innerHeight - cv.getBoundingClientRect().top - 110 + (cv.closest(".card") || cv).scrollTop), Hmin, 1400) : Hmin;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = { l: 22, r: 8, t: 8, b: 8 }, w = W - m.l - m.r, h = H - m.t - m.b;
  g.fillStyle = "#0b1410"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(120,200,160,.18)"; g.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const x = m.l + w * i / 10; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); }
  const activ = o.ch.map((c, k) => c.on ? k : -1).filter(k => k >= 0), nb = benzi ? activ.length : 1;
  const banda = k => { const b = benzi ? activ.indexOf(k) : 0, hb = h / nb; return { y: m.t + b * hb, h: hb }; };
  for (let b = 0; b < nb; b++) {
    const y1 = m.t + b * h / nb, hb = h / nb;
    g.strokeStyle = "rgba(120,200,160,.18)"; for (let j = 0; j <= 8; j++) { const y = y1 + hb * j / 8; g.beginPath(); g.moveTo(m.l, y); g.lineTo(m.l + w, y); g.stroke(); }
    g.strokeStyle = "rgba(120,200,160,.4)"; for (let i = 0; i <= 50; i++) { const x = m.l + w * i / 50; g.beginPath(); g.moveTo(x, y1 + hb / 2 - 3); g.lineTo(x, y1 + hb / 2 + 3); g.stroke(); }
    if (b) { g.strokeStyle = "rgba(160,230,190,.65)"; g.lineWidth = 2; g.beginPath(); g.moveTo(m.l, y1); g.lineTo(m.l + w, y1); g.stroke(); g.lineWidth = 1; }
  }
  const y0 = (ch, k) => { const B = banda(k); return B.y + B.h / 2 - ch.poz * B.h / 8; }, Y = (ch, v, k) => y0(ch, k) - v / ch.vdiv * banda(k).h / 8;
  for (let k = 3; k >= 0; k--) {
    const ch = o.ch[k], b = o.buf[k], col = CULORI_CH[k]; if (!ch.on) continue;
    const B = banda(k), yz = clamp(y0(ch, k), B.y + 6, B.y + B.h - 6);
    if (benzi) { g.fillStyle = col; g.font = "700 11px system-ui"; g.fillText(`CH${k + 1} · ${SURSE[ch.c].replace(/<[^>]+>/g, "")} · ${fmt(ch.vdiv, ch.vdiv < 1 ? 1 : 0)} V/div`, m.l + 6, B.y + 14); }
    g.fillStyle = col; g.beginPath(); g.moveTo(m.l - 2, yz); g.lineTo(m.l - 13, yz - 7); g.lineTo(m.l - 13, yz + 7); g.fill();
    g.fillStyle = "#0b1410"; g.font = "700 9px system-ui"; g.fillText(String(k + 1), m.l - 12, yz + 3);
    if (!b) continue;
    g.strokeStyle = col; g.lineWidth = 1.5; g.shadowColor = col; g.shadowBlur = 3; g.beginPath();
    b.forEach((v, i) => { const x = m.l + w * i / (b.length - 1), y = clamp(Y(ch, v, k), B.y + 1, B.y + B.h - 1); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.shadowBlur = 0;
  }
  [o.c1, o.c2].forEach((c, k) => { const x = m.l + w * c / 10; g.strokeStyle = k ? "#c9b6ff" : "#ff8a5a"; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle; g.font = "11px system-ui"; g.fillText(k ? "B" : "A", x + 3, m.t + 12); });
  g.font = "12px system-ui";
  if (benzi) { g.fillStyle = "#9fe6c0"; g.textAlign = "right"; g.fillText(`${fmtT(o.tdiv)}/div  ${o.ruleaza ? "RUN" : "STOP"}`, m.l + w - 6, m.t + 14); g.textAlign = "left"; }
  else {
    let xx = m.l + 8; g.fillStyle = "#9fe6c0"; const tt = `${fmtT(o.tdiv)}/div  ${o.ruleaza ? "RUN" : "STOP"}  `; g.fillText(tt, xx, m.t + h - 8); xx += g.measureText(tt).width + 6;
    o.ch.forEach((ch, k) => { if (!ch.on) return; const tx = `CH${k + 1} ${fmt(ch.vdiv, ch.vdiv < 1 ? 1 : 0)} V/div`; g.fillStyle = CULORI_CH[k]; g.fillText(tx, xx, m.t + h - 8); xx += g.measureText(tx).width + 12; });
  }
  const dt = (o.c2 - o.c1) * o.tdiv;
  let txt = `Δt = <b>${fmtT(Math.abs(dt))}</b> · 1/Δt = <b>${Math.abs(dt) > 0 ? fmt(1 / Math.abs(dt) / 1000, 1) : "—"} kHz</b>`;
  o.ch.forEach((ch, k) => { if (ch.on && o.buf[k]) txt += `<br><span style="color:${CULORI_CH[k]}">CH${k + 1}</span> ${SURSE[ch.c]}: U<sub>A</sub> = <b>${fmt(valCursor(k, o.c1), 2)} V</b> · U<sub>B</sub> = <b>${fmt(valCursor(k, o.c2), 2)} V</b>`; });
  $("#osc-cit").innerHTML = txt;
}
function valCursor(k, c) { const b = sim.osc.buf[k]; return b ? b[Math.round(c / 10 * (b.length - 1))] : NaN; }
function legaOsc() {
  const cv = $("#cv-osc"); let trag = null;
  const pozDiv = e => { const r = cv.getBoundingClientRect(); return clamp((e.clientX - r.left - 22) / (r.width - 30) * 10, 0, 10); };
  cv.addEventListener("pointerdown", e => { const d = pozDiv(e); trag = Math.abs(d - sim.osc.c1) < Math.abs(d - sim.osc.c2) ? "c1" : "c2"; sim.osc[trag] = d; cv.setPointerCapture(e.pointerId); deseneazaOsc(); });
  cv.addEventListener("pointermove", e => { if (trag) { sim.osc[trag] = pozDiv(e); deseneazaOsc(); } });
  cv.addEventListener("pointerup", () => trag = null);
  $$(".osc-cutie .osc-canal").forEach((el, k) => {
    const ch = sim.osc.ch[k], on = el.querySelector("[data-ch-on]"), sc = el.querySelector("[data-ch-c]"), sv = el.querySelector("[data-ch-v]"), sp = el.querySelector("[data-ch-p]");
    const stil = () => el.classList.toggle("oprit", !ch.on);
    sc.value = ch.c; sv.value = String(ch.vdiv); sp.value = String(ch.poz); on.checked = ch.on; stil();
    on.addEventListener("change", () => { ch.on = on.checked; stil(); if (sim.osc.ruleaza) achizitie(); deseneazaOsc(); });
    sc.addEventListener("change", () => { ch.c = sc.value; ch.vdiv = ch.c === "b" ? 5 : 1; sv.value = String(ch.vdiv); if (!ch.on) { ch.on = on.checked = true; stil(); } if (sim.osc.ruleaza) achizitie(); deseneazaOsc(); });
    sv.addEventListener("change", () => { ch.vdiv = +sv.value; deseneazaOsc(); });
    sp.addEventListener("change", () => { ch.poz = +sp.value; deseneazaOsc(); });
  });
}


/* ------------------------------------------------------------------ multimetrul */
function citireMultimetru() {
  const p = pr(), d = sim.defActiv, b = sim.punct, z = a => (hash(performance.now() / 700) - 0.5) * a;
  switch (sim.mm) {
    case "r": {
      if (sim.contact) return { txt: "—", msg: "Rezistența magistralei se măsoară numai cu contactul decuplat și rețeaua în repaus (NSSM)." };
      if (treaza()) return { txt: fmt(40 + 80 * hash(performance.now() / 300), 1) + " Ω", msg: `Rețeaua este încă activă – citire instabilă. Așteptați intrarea în repaus (${Math.ceil(T_REPAUS - sim.tOff)} s).` };
      const R = MD.rezistenta(p, d, b); return { txt: fmt(R, R < 10 ? 2 : 1) + " Ω", v: Math.round(R * 10) / 10, unit: "Ω" };
    }
    case "vh": case "vl": {
      if (!treaza()) return { txt: "0,000 V", v: 0, unit: "V", msg: "Rețeaua este în repaus: liniile CAN nu sunt polarizate." };
      if (!sim.contact) return { txt: "—", msg: "Puneți contactul: tensiunile medii se măsoară cu rețeaua activă." };
      const md = MD.medii(p, d, b), v = sim.mm === "vh" ? md.H : md.L; return { txt: fmt(v + z(0.002), 3) + " V", v, unit: "V" };
    }
    case "v16": { const v = semnal("b", 0); return { txt: fmt(v, 2) + " V", v: Math.round(v * 100) / 100, unit: "V" }; }
    case "vf0": case "vfs": {
      if (!sim.contact || !sim.vent) return { txt: fmt(P().Ubat, 3) + " V", msg: "Căderea de tensiune se măsoară cu consumatorul PORNIT (curentul trece prin contact)." };
      const c = MD.cadere(p), v = sim.mm === "vf0" ? c.U0 : c.Us; return { txt: fmt(v, 3) + " V", v, unit: "V" };
    }
    case "ia": { const I = sim.contact && sim.vent ? P().I : 0; return { txt: fmt(I, 1) + " A", v: I, unit: "A", msg: I ? "" : "Ventilatorul este oprit." }; }
  }
  return { txt: "—" };
}
const MM_MOD = { r: "Ω", vh: "V DC", vl: "V DC", v16: "V DC", vf0: "V DC", vfs: "V DC", ia: "A DC (clește)" };
function multimetruSVG(txt) {
  const el = $("#mm-aparat"); if (!el) return;
  const [val, un] = (txt || "—").split(" ");
  el.innerHTML = `<svg viewBox="0 0 150 230" aria-label="Multimetru digital">
    <defs><linearGradient id="mmc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffd23a"/><stop offset="1" stop-color="#e0a800"/></linearGradient></defs>
    <rect x="4" y="4" width="142" height="222" rx="18" fill="url(#mmc)" stroke="#7a5a00"/>
    <rect x="14" y="14" width="122" height="196" rx="12" fill="#2a2d31"/>
    <rect x="22" y="24" width="106" height="52" rx="6" fill="#b9c8a8" stroke="#55604a"/>
    <text x="122" y="62" text-anchor="end" font-family="'Courier New',monospace" font-size="27" font-weight="700" fill="#1c2416">${val}</text>
    <text x="122" y="73" text-anchor="end" font-size="9" fill="#1c2416">${un || ""}</text>
    <text x="28" y="36" font-size="8" fill="#1c2416">${MM_MOD[sim.mm] || ""}</text>
    <circle cx="75" cy="128" r="30" fill="#3b4046" stroke="#111"/><circle cx="75" cy="128" r="20" fill="#1f2226"/>
    <line x1="75" y1="128" x2="${75 + 26 * Math.cos({ r: -2.4, vh: -1.6, vl: -1.6, v16: -1.6, vf0: -1.6, vfs: -1.6, ia: -0.6 }[sim.mm] || -1.6)}" y2="${128 + 26 * Math.sin({ r: -2.4, vh: -1.6, vl: -1.6, v16: -1.6, vf0: -1.6, vfs: -1.6, ia: -0.6 }[sim.mm] || -1.6)}" stroke="#ffd23a" stroke-width="4" stroke-linecap="round"/>
    <text x="34" y="98" font-size="8" fill="#ddd">Ω</text><text x="70" y="94" font-size="8" fill="#ddd">V⎓</text><text x="104" y="102" font-size="8" fill="#ddd">A</text>
    ${[38, 75, 112].map((x, i) => `<circle cx="${x}" cy="190" r="7" fill="${i === 1 ? "#111" : i === 0 ? "#c62828" : "#c62828"}" stroke="#000"/>`).join("")}
    <text x="38" y="207" font-size="6.5" text-anchor="middle" fill="#ccc">A</text><text x="75" y="207" font-size="6.5" text-anchor="middle" fill="#ccc">COM</text><text x="112" y="207" font-size="6.5" text-anchor="middle" fill="#ccc">VΩ</text>
  </svg>`;
}

/* ------------------------------------------------------------------ comenzile */
function contact(on) {
  if (!on && sim.contact) sim.tOff = 0;
  sim.contact = on; if (!on) sim.vent = false;
  actualizeazaPanou();
}
function conecteaza(tip) {
  if (sim.contact) return Cadru.mesajTemporar("Interfața se conectează și se deconectează de la priza de diagnoză numai cu contactul decuplat (NSSM).", "pericol");
  const alt = tip === "x431" ? "obd" : "x431";
  if (!sim[tip] && sim[alt]) return Cadru.mesajTemporar(`Priza de diagnoză este ocupată: deconectați întâi ${alt === "obd" ? "cititorul OBD" : "interfața X431"}.`, "atentie");
  sim[tip] = !sim[tip]; if (tip === "x431" && !sim.x431) { sim.scan = null; sim.vent = false; }
  actualizeazaPanou();
}
function comutaDefect() {
  if (sim.contact) return Cadru.mesajTemporar("Defectele de rețea se introduc și se înlătură numai cu contactul decuplat (NSSM).", "pericol");
  sim.defActiv = !sim.defActiv; sim.scan = null; actualizeazaPanou();
  Cadru.mesajTemporar(sim.defActiv ? "Cadrul didactic a introdus un defect pe una dintre magistrale. Reluați scanarea (pasul 3), găsiți magistrala afectată și măsurați la conectorul ei de la gateway (pașii 7 și 8)." : "Defectul de rețea a fost înlăturat.", "");
}
function scaneaza() {
  if (!sim.x431) return Cadru.mesajTemporar("Conectați interfața X431 la priza de diagnoză (cu contactul decuplat).", "atentie");
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul pentru a comunica cu modulele.", "atentie");
  const mods = MD.module(pr(), sim.defActiv), cs = codurileActuale();
  sim.scan = { d: dA(), mods: mods.map(m => Object.assign({}, m, { n: m.raspunde ? cs.filter(c => c.mod === m.k).length : null })) };
  sim.vx = "scan"; actualizeazaPanou(); actualizeazaSVG(0);
}

/* ------------------------------------------------------------------ înregistrările */
function msgInreg(t) { $("#msg-inreg").textContent = t; }
function inregScan(e) {
  if (!sim.scan) return Cadru.mesajTemporar("Executați întâi scanarea completă.", "atentie");
  if (sim.scan.d) {
    const lipsa = sim.scan.mods.filter(m => !m.raspunde).map(m => m.nume.split(" –")[0]).join(", ") || "toate comunică";
    const ok = Cadru.inregistreaza(e, { log: { m: "scan", d: 1, nr: sim.scan.mods.filter(m => m.raspunde).length }, celule: [{ t: "t17", r: "d", c: "mod", v: lipsa }] });
    if (ok) msgInreg(`Tabelul 1.7: module care nu comunică – ${lipsa}.`); return;
  }
  const cel = [];
  sim.scan.mods.forEach(m => { cel.push({ t: "t11", r: m.k, c: "prot", v: m.prot }, { t: "t11", r: m.k, c: "n", v: m.raspunde ? String(m.n) : "—" }, { t: "t11", r: m.k, c: "st", v: m.raspunde ? (m.erori ? "comunică cu erori" : "comunică") : "nu răspunde" }); });
  const ok = Cadru.inregistreaza(e, { log: { m: "scan", d: 0, nr: sim.scan.mods.filter(m => m.raspunde).length }, celule: cel });
  if (ok) msgInreg(`Tabelul 1.1: ${sim.scan.mods.length} module scanate.`);
}
function inregCod(e, i) {
  const c = codurileActuale()[i]; if (!c) return;
  const t12 = Cadru.D.t.t12, exista = Object.keys(t12).find(k => t12[k].cod === c.cod && t12[k].mod === NUME_MOD[c.mod]);
  if (exista) return Cadru.mesajTemporar(`Codul ${c.cod} (${NUME_MOD[c.mod]}) este deja în Tabelul 1.2.`, "atentie");
  const k = ["1", "2", "3", "4", "5", "6", "7", "8"].find(k => t12[k].cod === ""); if (!k) return Cadru.mesajTemporar("Tabelul 1.2 este plin.", "atentie");
  const ff = c.ff ? `n = ${c.ff.n} rot/min; T = ${c.ff.T} °C; sarcină ${c.ff.sarc} %; v = ${c.ff.v} km/h` : "—";
  const ok = Cadru.inregistreaza(e, { log: { m: "dtc", cod: c.cod, mod: c.mod, d: dA() }, celule: [{ t: "t12", r: k, c: "cod", v: c.cod }, { t: "t12", r: k, c: "mod", v: NUME_MOD[c.mod] }, { t: "t12", r: k, c: "desc", v: c.desc }, { t: "t12", r: k, c: "st", v: c.stare }, { t: "t12", r: k, c: "ff", v: ff }] });
  if (ok) msgInreg(`Tabelul 1.2: ${c.cod} – ${c.desc}.`);
}
function inregMultimetru(e) {
  const r = citireMultimetru(), d = dA(), col = d ? "d" : "n", b = sim.punct, unde = d ? `cu defect, ${PUNCTE[b].split(" – ")[1] || PUNCTE[b]}` : "normal";
  if (r.v == null) return Cadru.mesajTemporar(r.msg || "Nu există o citire validă.", "atentie");
  if (sim.mm === "r") { const ok = Cadru.inregistreaza(e, { log: { m: "ohm", v: r.v, d, b }, celule: [{ t: "t15", r: "R", c: col, v: String(r.v) }] }); if (ok) msgInreg(`Tabelul 1.5 (${unde}): R CAN-H – CAN-L = ${r.txt}.`); return; }
  if (sim.mm === "vh" || sim.mm === "vl") {
    if (!sim.contact) return Cadru.mesajTemporar("Tensiunile medii CAN se măsoară cu contactul pus.", "atentie");
    const p = sim.mm === "vh" ? "6" : "14", ok = Cadru.inregistreaza(e, { log: { m: "volt", p, v: r.v, d, b }, celule: [{ t: "t15", r: p === "6" ? "uh" : "ul", c: col, v: r.v.toFixed(3) }] });
    if (ok) msgInreg(`Tabelul 1.5 (${unde}): U ${p === "6" ? "CAN-H" : "CAN-L"} medie = ${r.txt}.`); return;
  }
  if (sim.mm === "vf0" || sim.mm === "vfs" || sim.mm === "ia") {
    if (!sim.vent || !sim.contact) return Cadru.mesajTemporar("Porniți ventilatorul (test activ) – căderea de tensiune se măsoară cu consumatorul pornit.", "atentie");
    const k = sim.mm === "vf0" ? "U0" : sim.mm === "vfs" ? "Us" : "I";
    const ok = Cadru.inregistreaza(e, { log: { m: "drop", k, v: r.v }, celule: [{ t: "t16", r: "f", c: k, v: k === "I" ? r.v.toFixed(1) : r.v.toFixed(3) }] });
    if (ok) msgInreg(`Tabelul 1.6: ${k === "U0" ? "U₀ (intrarea siguranței)" : k === "Us" ? "U_s (ieșirea siguranței)" : "I"} = ${r.txt}.`); return;
  }
  msgInreg(`Citire: ${r.txt} (nu se trece în tabele).`);
}
function chCanal(c) { return sim.osc.ch.findIndex(x => x.on && x.c === c); }
function inregTbit(e) {
  if (sim.osc.ruleaza) return Cadru.mesajTemporar("Opriți imaginea (STOP), plasați cursoarele A și B pe fronturi și indicați câți biți cuprind.", "atentie");
  if (!comunica()) return Cadru.mesajTemporar("Pe magistrală nu există trafic: nu se poate măsura durata bitului.", "atentie");
  const dt = Math.abs(sim.osc.c2 - sim.osc.c1) * sim.osc.tdiv, n = Math.max(1, Math.round(num($("#in-biti").value) || 1));
  if (!(dt > 0)) return;
  const tb = Math.round(dt / n * 1e6 * 1000) / 1000, col = dA() ? "d" : "n";
  const ok = Cadru.inregistreaza(e, { log: { m: "tbit", v: tb, n, d: dA(), b: sim.punct }, celule: [{ t: "t15", r: "tbit", c: col, v: tb.toFixed(3) }] });
  if (ok) msgInreg(`Tabelul 1.5: t_bit = ${fmtT(dt)}/${n} = ${fmt(tb, 3)} µs.`);
}
function inregDominant(e) {
  if (sim.osc.ruleaza) return Cadru.mesajTemporar("Opriți imaginea (STOP) și puneți cursorul A pe un bit dominant.", "atentie");
  const kh = chCanal("h"), kl = chCanal("l");
  if (kh < 0 || kl < 0) return Cadru.mesajTemporar("Afișați CAN-H și CAN-L pe două canale ale osciloscopului.", "atentie");
  const H = valCursor(kh, sim.osc.c1), L = valCursor(kl, sim.osc.c1);
  if (!(H - L > 0.9)) return Cadru.mesajTemporar("Cursorul A nu este pe un bit dominant (U_diff < 0,9 V) sau magistrala nu are trafic.", "atentie");
  const nv = nivel(); if (Math.abs(H - nv.dH) > 0.06 || Math.abs(L - nv.dL) > 0.06) return Cadru.mesajTemporar("Cursorul A este pe un front sau pe o oscilație: mutați-l la mijlocul unui bit dominant.", "atentie");
  const h = Math.round(H * 100) / 100, l = Math.round(L * 100) / 100, col = dA() ? "d" : "n";
  const ok = Cadru.inregistreaza(e, { log: { m: "dom", H: h, L: l, d: dA(), b: sim.punct }, celule: [{ t: "t15", r: "uhd", c: col, v: h.toFixed(2) }, { t: "t15", r: "uld", c: col, v: l.toFixed(2) }] });
  if (ok) msgInreg(`Tabelul 1.5 (${dA() ? "cu defect" : "normal"}): dominant CAN-H = ${fmt(h, 2)} V, CAN-L = ${fmt(l, 2)} V.`);
}

/* ------------------------------------------------------------------ panourile instrumentelor */
function actualizeazaPanou() {
  $$("[data-aparat]").forEach(b => b.setAttribute("aria-pressed", b.dataset.aparat === sim.aparat ? "true" : "false"));
  $$(".panou-aparat").forEach(p => p.hidden = p.dataset.p !== sim.aparat);
  $("#btn-contact").textContent = sim.contact ? "Contact: PUS (decuplează)" : "Contact: DECUPLAT (pune)";
  $("#btn-x431c").textContent = sim.x431 ? "Deconectează interfața X431" : "Conectează interfața X431 la priza OBD";
  $("#btn-obdc").textContent = sim.obd ? "Deconectează cititorul OBD" : "Conectează cititorul OBD generic";
  $("#btn-vent").textContent = sim.vent ? "Oprește ventilatorul" : "Pornește ventilatorul (test activ)";
  $("#btn-defect").textContent = sim.defActiv ? "Înlătură defectul de rețea" : "Introdu defectul de rețea (cadrul didactic)";
  $$("[data-vx]").forEach(b => b.setAttribute("aria-pressed", b.dataset.vx === sim.vx ? "true" : "false"));
  panouX431(); panouOBD();
}
function tabel(rows, cap) { return `<table class="tabel x431">${cap ? `<thead><tr>${cap.map(c => `<th>${c}</th>`).join("")}</tr></thead>` : ""}<tbody>${rows.map(r => Array.isArray(r) ? `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>` : `<tr class="sep"><td colspan="${cap ? cap.length : 4}">${r}</td></tr>`).join("")}</tbody></table>`; }
function antetTester(t) { return SEMNALE.antetX431(`Diagnoză › Autoturism 2025 › ${t}`, sim.contact ? fmt(P().Ubat, 1) + " V" : ""); }
function panouX431() {
  const el = $("#x431-ecran"); if (!el) return;
  if (!sim.x431) { el.innerHTML = antetTester("VCI deconectată") + `<p class="nota">Interfața VCI nu este conectată la priza de diagnoză.</p>`; return; }
  if (!sim.contact) { el.innerHTML = antetTester("VCI alimentată") + `<p class="nota">VCI alimentată de la pinul 16. Puneți contactul pentru a comunica cu modulele.</p>`; return; }
  const p = pr();
  if (sim.vx === "scan") {
    if (!sim.scan) { el.innerHTML = antetTester("Diagnoză inteligentă") + `<p class="nota">Vehicul identificat după VIN: autoturism compact 2025, motor 1.5 TSI mild hybrid 48 V, cutie DCT. Arhitectură cu gateway central. Apăsați „Scanare completă”.</p>`; return; }
    const rows = [];
    ["gw", "motor", "sasiu", "confort", "info"].forEach(b => { if (b !== "gw") rows.push(`<b>${MAG[b].n}</b> · ${MAG[b].v}`); sim.scan.mods.filter(m => m.b === b).forEach(m => rows.push([m.adr, MD.MK[m.k].sc, m.raspunde ? m.n : "—", m.raspunde ? (m.erori ? "<span class='rau-t'>erori</span>" : "OK") : "<b class='rau-t'>nu răspunde</b>"])); });
    const nr = sim.scan.mods.filter(m => m.raspunde).length;
    el.innerHTML = antetTester(`Scanare completă · ${nr}/${sim.scan.mods.length} module`) + tabel(rows, ["Adresă", "Modul", "Coduri", "Stare"]) +
      `<button type="button" class="primar lat" id="btn-inreg-scan">● Trece scanarea în ${sim.scan.d ? "Tabelul 1.7" : "Tabelul 1.1"}</button>`;
    $("#btn-inreg-scan").addEventListener("click", inregScan); return;
  }
  const mods = MD.module(p, sim.defActiv);
  if (sim.vx === "cod") {
    const cs = codurileActuale();
    if (!mods.find(m => m.k === sim.modCod && m.raspunde)) sim.modCod = "gw";
    const opt = mods.filter(m => m.raspunde).map(m => `<option value="${m.k}"${m.k === sim.modCod ? " selected" : ""}>${m.adr} – ${m.nume}</option>`).join("");
    const lista = cs.map((c, i) => [c, i]).filter(([c]) => c.mod === sim.modCod);
    el.innerHTML = antetTester("Coduri de defect") + `<label class="camp">Modulul <select id="x-mod">${opt}</select></label>` + (lista.length ? lista.map(([c, i]) => `<div class="cod-dtc"><b>${c.cod}</b> – ${c.desc}<br><small>Stare: ${c.stare}${c.ff ? ` · freeze-frame: n = ${c.ff.n} rot/min, T lichid = ${c.ff.T} °C, sarcină = ${c.ff.sarc} %, v = ${c.ff.v} km/h` : ""}</small><br><button type="button" data-cod="${i}">→ Tabelul 1.2</button></div>`).join("") : `<p class="nota">Niciun cod memorat în acest modul.</p>`) +
      `<p class="nota">Module cu coduri: ${[...new Set(cs.map(c => c.mod))].filter(k => mods.find(m => m.k === k && m.raspunde)).map(k => MD.MK[k].sc).join(", ") || "—"}</p>` +
      `<div class="rand-butoane"><button type="button" id="btn-sterge">Șterge codurile (toate modulele)</button><button type="button" id="btn-ciclu">Ciclu de conducere de confirmare</button></div>`;
    $("#x-mod").addEventListener("change", ev => { sim.modCod = ev.target.value; panouX431(); });
    $$("[data-cod]", el).forEach(b => b.addEventListener("click", ev => inregCod(ev, +b.dataset.cod)));
    $("#btn-sterge").addEventListener("click", () => {
      const t12 = Cadru.D.t.t12; if (!Object.values(t12).some(r => r.cod)) return Cadru.mesajTemporar("Notați întâi codurile și datele freeze-frame (Tabelul 1.2) – apoi ștergeți (NSSM).", "pericol");
      sim.sterse = true; sim.ciclu = 0; sim.scan = null; Cadru.mesajTemporar("Codurile au fost șterse. Monitoarele de pregătire au trecut în „nefinalizat”.", ""); panouX431();
    });
    $("#btn-ciclu").addEventListener("click", () => { if (!sim.sterse) return Cadru.mesajTemporar("Ciclul de confirmare se face după remediere și ștergerea codurilor.", "atentie"); sim.ciclu++; Cadru.mesajTemporar(`Ciclu de conducere efectuat. ${sim.defActiv ? "Defectul de rețea este încă prezent. " : ""}Recitiți codurile – defectul clientului (nereparat) reapare.`, "atentie"); panouX431(); });
    return;
  }
  const ecm = raspunde("ecm");
  if (sim.vx === "mon") {
    if (!ecm) { el.innerHTML = antetTester("Monitoare OBD") + `<p class="nota"><b>ECM nu răspunde</b> – monitoarele nu pot fi citite.</p>`; return; }
    const mo = MD.monitoare(p);
    el.innerHTML = antetTester("Monitoare de pregătire (ECM)") + tabel(MD.MON.map(k => [NUME_MON[k], sim.sterse && sim.ciclu === 0 && mo[k] === "finalizat" ? "<b>nefinalizat</b>" : mo[k]]), ["Monitor", "Stare"]) + `<p class="nota">Lampa MIL: ${MD.CLIENT[p.client].stare === 1 && !(sim.sterse && sim.ciclu === 0) ? "<b>APRINSĂ</b>" : "stinsă"}.</p>`;
    return;
  }
  if (sim.vx === "live") {
    if (!ecm) { el.innerHTML = antetTester("Date live") + `<p class="nota"><b>ECM nu răspunde.</b></p>`; return; }
    const cl = p.client;
    el.innerHTML = antetTester("Date live – ECM (62 parametri)") + tabel([["Turație motor", "0", "rot/min"], ["Temp. lichid răcire", cl === 3 ? "−40" : "21", "°C"], ["Temp. aer admis", "20", "°C"], ["Presiune colector", "101", "kPa"], ["Tensiune rețea 12 V", fmt(semnal("b", 0), 1), "V"], ["Tensiune rețea 48 V", "47,6", "V"], ["Poziție pedală", "0,0", "%"], ["Stare buclă λ", "deschisă", ""], ["Viteză vehicul", "0", "km/h"]], ["Parametru", "Valoare", "Unitate"]) + `<p class="nota">Contact pus, motor oprit. Pentru defectul clientului valorile relevante sunt cele din freeze-frame.</p>`;
    return;
  }
  if (sim.vx === "can") {
    if (!raspunde("gw")) { el.innerHTML = ""; return; }
    const ids = (n, p0) => Array.from({ length: n }, (_, i) => "0x" + (p0 + i * 16 + Math.floor(hash(p0 + i) * 8)).toString(16).toUpperCase()).join(", ");
    el.innerHTML = antetTester("Analiza magistralei – CAN motor (prin gateway)") + `<p class="nota">Mesaje observate pe CAN motor (500 kbit/s, cadre standard cu 8 octeți de date ≈ 125 biți cu biții de umplere):</p>` +
      tabel([["10 ms", p.n10, ids(p.n10, 0x100)], ["20 ms", p.n20, ids(p.n20, 0x200)], ["100 ms", p.n100, ids(p.n100, 0x400)]], ["Perioada", "Nr. mesaje", "Identificatori"]) +
      `<p class="nota">Calculați încărcarea magistralei cu relația (1.4).</p>`;
  }
}
function panouOBD() {
  const el = $("#obd-ecran"); if (!el) return;
  const ant = `<div class="tester-antet obd"><span>ELM327 · OBD-II</span><span>${sim.obd ? "conectat" : ""}</span></div>`;
  if (!sim.obd) { el.innerHTML = ant + `<p class="nota">Cititorul nu este conectat.</p>`; return; }
  if (!sim.contact) { el.innerHTML = ant + `<p class="nota">Puneți contactul.</p>`; return; }
  if (!raspunde("ecm")) { el.innerHTML = ant + `<p class="nota">Protocol ISO 15765-4 detectat (gateway), dar <b>NO DATA</b> – ECM nu răspunde la cererile OBD.</p>`; return; }
  const p = pr(), cl = MD.CLIENT[p.client], mo = MD.monitoare(p), st = sim.sterse && sim.ciclu === 0;
  const conf = cl.stare === 1 && !st ? [cl.cod] : [], pend = cl.stare === 0 && !st ? [cl.cod] : [], perm = cl.stare === 1 ? [cl.cod] : [];
  el.innerHTML = ant + `<p class="nota">Protocol: ISO 15765-4 (CAN 11 bit, 500 kbit/s) · un modul OBD (ECM, prin gateway).</p>` +
    tabel([["Mod 03 – coduri confirmate", conf.join(", ") || "niciunul"], ["Mod 07 – coduri în așteptare", pend.join(", ") || "niciunul"], ["Mod 0A – coduri permanente", perm.join(", ") || "niciunul"],
      ["Mod 01 – MIL", conf.length ? "aprinsă" : "stinsă"], ["Mod 01 – monitoare", MD.MON.map(k => `${NUME_MON[k].split(" ")[0]}: ${st && mo[k] === "finalizat" ? "nefin." : mo[k].replace("nefinalizat", "nefin.").replace("finalizat", "fin.")}`).join("; ")],
      ["Mod 02 – freeze-frame", conf.length || pend.length ? `n = ${p.ff.n} rot/min, T = ${p.ff.T} °C, sarcină ${p.ff.sarc} %` : "—"], ["Mod 01 – date live", "≈ 20 PID-uri (turație, T lichid, sarcină, STFT, LTFT, MAP, IAT, viteză…)"]]) +
    `<p class="nota">Codurile „U”, „B”, „C” și celelalte 28 de module nu sunt accesibile prin OBD generic.</p>`;
}
/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaDA1(D) {
  const o = MD.prelucreaza(D.t, { num });
  const t15 = D.t.t15, cel = { t15: {}, t16: {} }, rele = { t15: {}, t16: {} };
  const REF = { R: "≈ 60 Ω (120 ‖ 120)", uh: "≈ 2,5…2,7 V (crește cu traficul)", ul: "≈ 2,3…2,5 V (scade cu traficul)", uhd: "≈ 3,5 V (U<sub>diff</sub> ≈ 2 V)", uld: "≈ 1,5 V", tbit: "2 µs (500 kbit/s)" };
  Object.keys(REF).forEach(k => cel.t15[k] = { ref: REF[k], calc: "" });
  const h = num(t15.uhd.n), l = num(t15.uld.n), hd = num(t15.uhd.d), ld = num(t15.uld.d);
  if (Number.isFinite(h) && Number.isFinite(l)) { cel.t15.uhd.calc = `U<sub>diff</sub> = ${fmt(h - l, 2)} V${Number.isFinite(hd) ? ` · cu defect ${fmt(hd - ld, 2)} V` : ""}`; rele.t15.uhd = { calc: h - l < 1.5 || h - l > 3 }; }
  if (Number.isFinite(o.fbit)) cel.t15.tbit.calc = `f<sub>bit</sub> = 1/t<sub>bit</sub> = ${fmt(o.fbit, 1)} kbit/s`;
  if (Number.isFinite(o.Rn)) { cel.t15.R.calc = `cu terminare suplimentară: ${fmt(o.Rsupl, 1)} Ω`; rele.t15.R = { calc: false }; }
  const f = D.t.t16.f, U0 = num(f.U0), Us = num(f.Us), I = num(f.I);
  cel.t16.f = { dU: Number.isFinite(o.dU) ? fmt(o.dU, 3) + " V" : "", Rc: Number.isFinite(o.Rc) ? fmt(o.Rc, 4) + " Ω" : "" };
  rele.t16.f = { Rc: o.Rc > 0.01 };
  const rez = [
    ["Rata de transfer (1.3)", Number.isFinite(o.fbit) ? `${fmt(o.fbit, 1)} kbit/s` : "—"],
    ["Tensiunea diferențială dominantă (1.2)", Number.isFinite(h - l) ? `${fmt(h - l, 2)} V (normal)` + (Number.isFinite(hd - ld) ? ` · ${fmt(hd - ld, 2)} V (cu defect)` : "") : "—"],
    ["Rezistența magistralei", Number.isFinite(o.Rn) ? `${fmt(o.Rn, 1)} Ω normal${Number.isFinite(o.Rd) ? ` · ${fmt(o.Rd, 1)} Ω cu defect` : ""}` : "—"],
    ["Rezistența de contact (1.6)", Number.isFinite(o.Rc) ? `ΔU = ${fmt(o.dU, 3)} V; R<sub>c</sub> = ${fmt(o.Rc, 4)} Ω` : "—"]
  ];
  const verdicte = [];
  if (Number.isFinite(o.Rn)) verdicte.push(Math.abs(o.Rn - 60) <= 6 ? { tip: "ok", text: `R = ${fmt(o.Rn, 1)} Ω – ambele terminări prezente.` } : { tip: "atentie", text: `R = ${fmt(o.Rn, 1)} Ω diferă de 60 Ω: verificați terminările.` });
  if (Number.isFinite(o.Rd)) {
    const t = o.Rd < 5 ? "R ≈ 0 Ω: CAN-H în scurtcircuit cu CAN-L." : Math.abs(o.Rd - 120) < 8 ? "R ≈ 120 Ω: o singură terminare – terminare lipsă sau magistrală întreruptă spre un capăt." : o.Rd < 50 ? "R < 50 Ω: terminare suplimentară pe magistrală." : "R ≈ 60 Ω: terminările sunt în regulă – defectul nu este de terminare (alimentare / masă modul, scurtcircuit la masă sau la plus).";
    verdicte.push({ tip: "atentie", text: `Cu defect (la conectorul gateway al magistralei afectate): ${t}` });
  }
  if (Number.isFinite(o.Rc)) verdicte.push(o.Rc <= 0.01 ? { tip: "ok", text: `R<sub>c</sub> = ${fmt(o.Rc, 4)} Ω – contact bun (sub 0,01 Ω).` } : { tip: "atentie", text: `R<sub>c</sub> = ${fmt(o.Rc, 4)} Ω > 0,01 Ω: contact oxidat / slăbit – se curăță sau se înlocuiește suportul siguranței. Puterea disipată: ${fmt(o.Rc * I * I, 1)} W.` });
  // graficul: nivelurile măsurate reconstruite pe o secvență de biți
  const BIT = [0, 1, 1, 0, 1, 0, 0, 1, 0, 0], serii = [], legenda = [];
  const trepte = (r, dmn) => { const pts = []; BIT.forEach((b, i) => { const v = b ? dmn : r; pts.push([i, v], [i + 1, v]); }); return pts; };
  if (Number.isFinite(h) && Number.isFinite(l)) {
    const rec = (num(t15.uh.n) + num(t15.ul.n)) / 2 || 2.5;
    serii.push({ tip: "linie", pts: trepte(rec, h), culoare: 0 }, { tip: "linie", pts: trepte(rec, l), culoare: 1 });
    legenda.push(["CAN-H normal", "var(--serie-0)"], ["CAN-L normal", "var(--serie-1)"]);
  }
  if (Number.isFinite(hd) && Number.isFinite(ld)) {
    const recd = Number.isFinite(num(t15.uh.d)) ? Math.min(num(t15.uh.d), 2.5) : 2.5;
    serii.push({ tip: "linie", pts: trepte(ld === 0 ? 0.04 : recd, hd), culoare: 2, punctat: true }, { tip: "linie", pts: trepte(ld === 0 ? 0 : recd, ld), culoare: 3, punctat: true });
    legenda.push(["CAN-H cu defect", "var(--serie-2)"], ["CAN-L cu defect", "var(--serie-3)"]);
  }
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Nivelurile CAN măsurate (reconstruite pe 10 biți)",
    grafic: { xmin: 0, xmax: 10, ymin: 0, ymax: 4, xticks: [0, 2, 4, 6, 8, 10], xlab: "bit", ylab: "U [V]", serii },
    legenda, principal: { eticheta: "f_bit [kbit/s]", valoare: Number.isFinite(o.fbit) ? +o.fbit.toFixed(1) : null }, o
  };
}

/* ------------------------------------------------------------------ conținut didactic (după îndrumar, revizuit) */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Interfața testerului se conectează și se deconectează de la priza de diagnoză numai cu contactul decuplat; cablul se trece astfel încât să nu fie prins de uși sau de piese în mișcare.</li>
<li>Rezistența magistralei CAN se măsoară numai cu rețeaua în repaus sau cu bateria deconectată; nu se aplică tensiune exterioară pe pinii 6 și 14 și nu se înțeapă izolația conductoarelor (se folosesc cutia de acces sau adaptoare back-probe).</li>
<li>Bateria de 12 V poate debita curenți de sute de amperi: nu se așază scule metalice pe borne; la deconectare se desface întâi borna negativă, iar la reconectare ultima.</li>
<li>Codurile de defect nu se șterg înainte de a fi notate împreună cu datele freeze-frame; codarea sau programarea modulelor se face numai pe vehiculul didactic, la indicația cadrului didactic.</li>
<li>Defectele de rețea (conector desfăcut, terminare suplimentară) se introduc și se înlătură numai de cadrul didactic, cu contactul decuplat.</li></ul></div>
<h2>1.1. Scopul lucrării</h2>
<p>Aplicarea procedurii generale de diagnosticare, de la simptom la cauză: scanarea tuturor sistemelor cu testerul multimarcă, citirea și interpretarea codurilor de defect, a datelor freeze-frame și a monitoarelor de pregătire, compararea cu un cititor OBD generic și verificarea fizică a magistralei CAN (rezistența de terminare, nivelurile de tensiune, forma semnalului și rata de transfer).</p>
<h2>1.2. Noțiuni teoretice</h2>
<p>Diagnosticarea eficientă începe cu informația: când, în ce condiții și cât de des apare defectul (motor rece sau cald, sarcină, viteză, vreme, lucrări recente). Unitatea de control (ECU) recunoaște că un semnal este în afara limitelor, dar nu poate spune dacă defectul este în componentă, în cablaj sau în partea mecanică; de aceea înlocuirea directă a componentei indicate de cod este adesea costisitoare și nu rezolvă problema. Există și defecte fără cod: un debitmetru contaminat raportează o masă de aer prea mică, dar plauzibilă, iar ECU compensează prin adaptări. Procedura urmată în toate lucrările are șapte pași (Fig. 1.1).</p>
<figure><img src="img/fig1_1.jpg" alt="Fig. 1.1 Procedura generală de diagnosticare" loading="lazy"><figcaption>Fig. 1.1. Procedura generală de diagnosticare</figcaption></figure>
<p>Sistemul de diagnoză la bord (OBD) monitorizează componentele și funcțiile care influențează emisiile și aprinde lampa de avertizare (MIL) la depășirea pragurilor. În UE, EOBD este obligatoriu la autoturismele noi pe benzină din 2001 și la cele diesel din 2004. Un cod OBD are 5 caractere, de exemplu P0302: litera arată domeniul (P – grup motopropulsor, C – șasiu, B – caroserie, U – rețea), prima cifră arată codul generic (0) sau specific constructorului (1), iar următoarele identifică defectul (P0302 – rateuri la cilindrul 2). Contează și starea codului: <b>în așteptare</b> (detectat într-un singur ciclu de funcționare), <b>confirmat</b> (detectat în cicluri succesive; aprinde MIL) și <b>permanent</b> (nu poate fi șters cu testerul; dispare numai după ce monitorul respectiv trece testul). Un cod <b>istoric</b> rămâne memorat după dispariția defectului.</p>
<p>Testerele multimarcă folosesc, pe lângă serviciile OBD (SAE J1979: modul 01 – date și monitoare, 02 – freeze-frame, 03 – coduri confirmate, 07 – coduri în așteptare, 0A – coduri permanente), protocoalele de diagnoză ale constructorilor bazate pe UDS – ISO 14229 (citirea codurilor și a datelor, comanda actuatorilor, rutine de service, codare). La vehiculele noi OBD migrează pe UDS (SAE J1979-2), iar comunicația rapidă se face prin CAN FD și Ethernet (DoIP, ISO 13400). De aceea un cititor OBD generic vede doar datele legate de emisii, iar un tester multimarcă vede toate modulele.</p>
<p>Magistrala CAN de mare viteză (ISO 11898-2, 125 kbit/s…1 Mbit/s) transmite diferențial: o perturbație afectează la fel ambele linii și se anulează. În starea recesivă ambele linii au ≈ 2,5 V (U<sub>diff</sub> ≈ 0 V); în starea dominantă CAN-H urcă la ≈ 3,5 V, iar CAN-L coboară la ≈ 1,5 V (U<sub>diff</sub> ≈ 2 V; receptorul consideră dominant peste 0,9 V și recesiv sub 0,5 V). La capete se află două rezistențe de terminare de 120 Ω, care împiedică reflexiile; măsurate în paralel, între pinii 6 și 14 ai prizei de diagnoză, ele dau:</p>
<div class="ec"><span>R<sub>e</sub> = R<sub>1</sub>·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) = 120·120/(120 + 120) = 60 Ω</span><span class="nr">(1.1)</span></div>
<p><b>Arhitectura unui autoturism din 2025.</b> Modulele (adesea 30…80) nu mai stau pe o singură magistrală: un <b>gateway central</b> leagă mai multe rețele separate – CAN motor (grup motopropulsor), CAN șasiu / ADAS (frecvent CAN FD: faza de arbitrare la 500 kbit/s și faza de date la 2…5 Mbit/s), CAN confort / caroserie, CAN infotainment – plus magistrale LIN pentru actuatoare simple și Ethernet auto (100BASE-T1) pentru camere, infotainment și diagnoza rapidă DoIP (pinii 3/11 și 12/13 ai prizei, activare pe pinul 8). Priza OBD nu mai este legată direct de magistrala motorului: pinii 6/14 aparțin <b>CAN-ului de diagnoză</b> al gateway-ului, care rutează cererile testerului (și filtrează accesul – „Secure Gateway”). Consecința pentru diagnoză: un defect pe CAN confort nu se vede la pinii 6/14; magistrala afectată se identifică din scanare (grupul de module care nu răspund și codurile U din gateway), apoi se măsoară la conectorul ei de la gateway (back-probe), unde se găsește una dintre cele două terminări de 120 Ω.</p>
<p>Culorile conductoarelor diferă după constructor; frecvent CAN-L este portocaliu-maro, iar CAN-H portocaliu cu dungă diferită pentru fiecare magistrală (negru – motor, verde – confort, violet – infotainment). În simulator culorile urmează această convenție.</p>
<figure><img src="img/fig1_2.jpg" alt="Fig. 1.2 Topologia magistralei CAN" loading="lazy"><figcaption>Fig. 1.2. Topologia magistralei CAN, priza de diagnoză SAE J1962 și punctele de măsură</figcaption></figure>
<p>Pe oscilogramă se măsoară tensiunea diferențială și durata unui bit t<sub>bit</sub>, din care rezultă rata de transfer. Gradul de încărcare a magistralei se estimează din numărul de mesaje pe secundă f<sub>k</sub> și lungimea lor N<sub>k</sub> (≈ 110…130 biți pentru un cadru standard cu 8 octeți de date, inclusiv biții de umplere):</p>
<div class="ec"><span>U<sub>diff</sub> = U<sub>CANH</sub> − U<sub>CANL</sub></span><span class="nr">(1.2)</span></div>
<div class="ec"><span>f<sub>bit</sub> = 1/t<sub>bit</sub></span><span class="nr">(1.3)</span></div>
<div class="ec"><span>S = Σ<sub>k</sub> N<sub>k</sub>·f<sub>k</sub> / f<sub>bit</sub> · 100 [%]</span><span class="nr">(1.4)</span></div>
<figure><img src="img/fig1_3.jpg" alt="Fig. 1.3 Semnalele CAN" loading="lazy"><figcaption>Fig. 1.3. Semnalele CAN-H și CAN-L la 500 kbit/s și tensiunea diferențială</figcaption></figure>
<figure><img src="img/fig1_4.jpg" alt="Fig. 1.4 Semnalele CAN pe osciloscop" loading="lazy"><figcaption>Fig. 1.4. Semnalele CAN-H (CH1), CAN-L (CH2) și tensiunea diferențială (M = CH1 − CH2) afișate pe osciloscop (1 µs/div, 1 V/div)</figcaption></figure>
<p>Căderea de tensiune pe un contact sau pe o siguranță se măsoară <b>cu consumatorul pornit</b> (fără curent căderea este zero, oricât de oxidat ar fi contactul): fie direct, cu multimetrul în paralel pe siguranță, fie ca diferență între tensiunea la intrarea U<sub>0</sub> și la ieșirea U<sub>s</sub> a siguranței, ambele măsurate față de masă în același timp. Raportată la curentul consumatorului (clește ampermetric), dă rezistența de contact:</p>
<div class="ec"><span>ΔU = U<sub>0</sub> − U<sub>s</sub></span><span class="nr">(1.5)</span></div>
<div class="ec"><span>R<sub>c</sub> = ΔU/I [Ω]</span><span class="nr">(1.6)</span></div>
<p>Exemplu clasic (Smart Fortwo): macaraua geamului pasagerului nu funcționează. Dacă geamul poate fi acționat de pe partea șoferului, modulele ușilor, magistrala și motorul sunt în stare bună, iar defectul este probabil la comutatorul pasagerului. Abia după acest raționament se măsoară.</p>
<h3>Observații pentru efectuarea și interpretarea măsurărilor</h3>
<ul>
<li><b>Căderea de tensiune pe siguranță (1.5).</b> U<sub>0</sub> și U<sub>s</sub> se măsoară amândouă cu consumatorul (ventilatorul) pornit, sau direct pe bornele siguranței; o citire „fără sarcină” ar include în diferență și căderea de tensiune internă a bateriei și pe cablaj.</li>
<li><b>Valoarea normală.</b> O siguranță-lamelă în bună stare are ≈ 3…8 mΩ, deci la 8 A căderea totală pe siguranță și contacte este sub ≈ 0,08 V (R<sub>c</sub> &lt; 0,01 Ω). La R<sub>c</sub> = 0,1 Ω și 8 A se disipă 6,4 W în suportul siguranței – contactul se încălzește și se degradează rapid.</li>
<li><b>Încărcarea magistralei.</b> Rețelele se proiectează de regulă sub ≈ 50…60 % încărcare; peste ≈ 70…80 % cresc întârzierile mesajelor cu prioritate mică. O încărcare de 75 % este deci la limită.</li>
<li><b>Stările codurilor de defect:</b> <i>în așteptare</i> (defect detectat într-un singur ciclu de funcționare), <i>confirmat</i> (detectat în cicluri succesive, lampa MIL aprinsă), <i>permanent</i> (nu poate fi șters cu testerul, dispare numai după ce monitorul trece testul) și <i>istoric</i> (defect care nu mai este prezent). Cititorul generic folosește serviciile OBD 01 (date curente), 02 (freeze frame), 03 (coduri confirmate), 07 (coduri în așteptare) și 0A (coduri permanente).</li>
<li><b>Pragurile receptorului CAN.</b> Receptorul interpretează starea dominantă la U<sub>diff</sub> = U<sub>CAN-H</sub> − U<sub>CAN-L</sub> peste 0,9 V și starea recesivă sub 0,5 V; în starea recesivă U<sub>diff</sub> ≈ 0 V (ambele linii ≈ 2,5 V).</li>
<li><b>Tensiunile medii CAN</b> citite cu multimetrul depind de încărcarea magistralei (proporția biților dominanți): la trafic intens CAN-H medie crește spre 2,7 V și CAN-L medie scade spre 2,3 V. La priza OBD a unui autoturism cu gateway, CAN-ul de diagnoză are trafic numai cât testerul comunică, deci mediile sunt foarte apropiate de 2,5 V; valori de 2,6…2,7 / 2,3…2,4 V corespund unei magistrale încărcate (de exemplu CAN motor măsurat la gateway).</li>
<li><b>Arhitectura cu gateway.</b> La autoturismele actuale priza OBD este legată la CAN-ul de diagnoză al gateway-ului; celelalte magistrale (motor, șasiu, confort, infotainment) se verifică la conectorii gateway-ului.</li>
</ul>
<h2>1.4. Modul de lucru (în simulator)</h2>
<ol><li>Citiți fișa „client” cu simptomul și faceți inspecția vizuală: tensiunea bateriei în repaus (≥ 12,4 V, pinul 16 față de pinul 4). Identificați pe machetă gateway-ul, magistralele și priza de diagnoză.</li>
<li>Cu contactul decuplat conectați interfața X431; puneți contactul (vehiculul este identificat automat după VIN).</li>
<li>Executați scanarea completă și treceți rezultatul în Tabelul 1.1.</li>
<li>Pentru fiecare cod notați descrierea, starea și datele freeze-frame (Tabelul 1.2); citiți monitoarele de pregătire și alegeți starea lor în Tabelul 1.3.</li>
<li>Afișați datele live legate de cod și analiza magistralei (mesajele pe perioade, pentru relația 1.4).</li>
<li>Repetați citirea cu cititorul OBD generic și completați Tabelul 1.4 (inclusiv timpul necesar, cronometrat de voi).</li>
<li>Decuplați contactul și așteptați intrarea rețelei în repaus; măsurați rezistența între pinii 6 și 14 (CAN diagnoză).</li>
<li>Cu contactul pus măsurați tensiunile medii CAN-H și CAN-L; cu osciloscopul (CH1 pe pinul 6, CH2 pe pinul 14) vizualizați semnalele, opriți imaginea, măsurați nivelurile dominante (cursorul A pe un bit dominant) și durata unui bit (cursoarele A și B peste un număr cunoscut de biți) (Tabelul 1.5).</li>
<li>Porniți ventilatorul (test activ), măsurați U<sub>0</sub> și U<sub>s</sub> la siguranța lui și curentul cu cleștele ampermetric; calculați rezistența de contact (Tabelul 1.6).</li>
<li>Cadrul didactic introduce un defect pe una dintre magistrale: reluați scanarea, stabiliți din grupul modulelor care nu răspund și din codurile U ale gateway-ului care magistrală este afectată, apoi măsurați R, tensiunile și semnalul la conectorul ei de la gateway și localizați defectul (Tabelul 1.7). După remediere ștergeți codurile și faceți un ciclu de confirmare.</li></ol>
<h2>1.7. Interpretarea rezultatelor</h2>
<ul><li>Un modul care nu răspunde împreună cu toate celelalte de pe aceeași magistrală arată spre magistrala respectivă (scurtcircuit CAN-H/CAN-L, bus-off – cod U0073 în gateway); un singur modul lipsă (U0100, U0121, U0140, U0184…) arată spre alimentarea, masa sau conexiunea lui.</li>
<li>Un cod „U” la mai multe module care indică același modul lipsă arată spre acel modul sau spre alimentarea / conexiunea lui; coduri „U” răspândite pe toată rețeaua arată spre magistrală (terminare, scurtcircuit, zgomot).</li>
<li>R ≈ 120 Ω – o terminare lipsă sau o linie întreruptă spre un capăt; R ≈ 0 Ω – CAN-H în scurt cu CAN-L; R &lt; 50 Ω – terminare suplimentară; R ≈ 60 Ω cu un modul care nu răspunde – alimentarea, masa sau conectorul acelui modul.</li>
<li>Tensiuni de 0 V sau 12 V pe o linie indică scurtcircuit la masă sau la plus; semnalele care nu mai sunt în oglindă sau cu fronturi rotunjite / oscilante indică zgomot, capacitate parazită sau terminare incorectă.</li>
<li>Codurile în așteptare și rezultatele serviciului 06 apropiate de prag indică defecte în formare. Un monitor nefinalizat după ștergerea codurilor este normal, dar la inspecția tehnică poate duce la respingere.</li>
<li>Concluzia referatului se scrie ca lanț cauzal: simptom → cod și date live → măsurare → cauză → remediere → verificare.</li></ul>
<h2>1.8. Relevanță practică</h2>
<p>Diagnoza computerizată și verificarea rețelelor de date sunt primele operații din orice service. Pe măsură ce vehiculele trec la arhitecturi zonale, CAN FD și Ethernet, capacitatea de a verifica fizic o magistrală și de a interpreta harta modulelor devine o competență cerută tehnicienilor și inginerilor de validare.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat</h2>
<p>Pe oscilogramă un bit durează 2 µs, iar magistrala motorului transmite 20 de mesaje cu perioada de 10 ms și 20 de mesaje cu perioada de 20 ms, cu ≈ 125 biți fiecare (100 și, respectiv, 50 de apariții pe secundă):</p>
<div class="ec"><span>f<sub>bit</sub> = 1/(2·10<sup>−6</sup>) = 500 000 bit/s</span><span class="nr">(1.7)</span></div>
<div class="ec"><span>S = 125·(20·100 + 20·50)/500 000·100 = 75 %</span><span class="nr">(1.8)</span></div>
<p>Valoarea este mare – la limita superioară a domeniului folosit în practică; o încărcare apropiată de 100 % produce întârzieri ale mesajelor cu prioritate mică. Pentru defectele de terminare:</p>
<div class="ec"><span>terminare lipsă: R<sub>e</sub> = R<sub>1</sub> = 120 Ω; &nbsp; terminare suplimentară de 120 Ω: R<sub>e</sub> = 120/3 = 40 Ω</span><span class="nr">(1.9–1.10)</span></div>
<p>Căderea de tensiune: la siguranța ventilatorului se citesc, cu ventilatorul pornit (I = 8 A), U<sub>0</sub> = 12,40 V la intrarea siguranței și U<sub>s</sub> = 11,60 V la ieșire:</p>
<div class="ec"><span>ΔU = 12,40 − 11,60 = 0,80 V; &nbsp; R<sub>c</sub> = 0,80/8 = 0,1 Ω</span><span class="nr">(1.11–1.12)</span></div>
<p>Valoarea este de zece ori prea mare pentru un contact (normal sub 0,01 Ω) și indică un contact oxidat; în suport se disipă P = R<sub>c</sub>·I² = 6,4 W.</p>
<div class="problema"><h3>Problema 1</h3><p>Calculați rata de transfer dacă durata unui bit este 4 µs. Ce magistrală poate fi?</p><details class="sol"><summary>Rezolvare</summary><p>f<sub>bit</sub> = 1/(4·10<sup>−6</sup>) = 250 kbit/s – CAN de mare viteză la 250 kbit/s (de exemplu magistrala J1939 a vehiculelor comerciale).</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Între pinii 6 și 14 se măsoară 61 Ω cu rețeaua în repaus, dar ESP nu răspunde și celelalte module memorează U0121. Ce verificați în continuare?</p><details class="sol"><summary>Rezolvare</summary><p>Terminările (și deci magistrala principală) sunt în regulă. Se verifică alimentarea (siguranța), masa și conectorul modulului ESP; dacă R ar fi fost ≈ 120 Ω, ar fi indicat o întrerupere a magistralei spre ESP, care conține a doua terminare.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>O magistrală de 500 kbit/s transmite 10 mesaje la 10 ms, 12 la 20 ms și 15 la 100 ms, de câte 125 biți. Calculați încărcarea.</p><details class="sol"><summary>Rezolvare</summary><p>S = 125·(10·100 + 12·50 + 15·10)/500 000·100 = 125·1750/500 000·100 = 43,75 %.</p></details></div>
<div class="problema"><h3>Problema 4</h3><p>Cu motorul ventilatorului pornit (I = 9 A) se citesc 12,31 V la intrarea și 12,26 V la ieșirea siguranței. Este contactul bun?</p><details class="sol"><summary>Rezolvare</summary><p>ΔU = 0,05 V; R<sub>c</sub> = 0,05/9 = 0,0056 Ω &lt; 0,01 Ω – contact bun.</p></details></div>`;
}
const INTREBARI = [
  ["De ce un cod de defect nu este suficient pentru a înlocui componenta indicată?", "Codul arată doar că un semnal a ieșit din limitele plauzibile; cauza poate fi componenta, cablajul, conectorul, alimentarea sau o problemă mecanică ce influențează mărimea măsurată. Se confirmă prin date live și măsurări țintite."],
  ["Ce informații conține freeze-frame și cum ajută la reproducerea defectului?", "Valorile principalilor parametri (turație, temperatură, sarcină, viteză, corecții) în momentul memorării codului; arată condițiile în care trebuie reprodus defectul la proba de drum."],
  ["Care este diferența dintre un cod în așteptare, unul confirmat și unul permanent?", "În așteptare – detectat într-un singur ciclu (MIL stinsă); confirmat – detectat în cicluri succesive, aprinde MIL; permanent – nu se poate șterge cu testerul, dispare numai când monitorul trece testul."],
  ["Ce valoare a rezistenței CAN-H – CAN-L obțineți dacă lipsește o terminare? Dar dacă se adaugă una?", "Terminare lipsă: ≈ 120 Ω; terminare suplimentară de 120 Ω: 120/3 = 40 Ω."],
  ["Calculați rata de transfer dacă durata unui bit este 4 µs.", "f<sub>bit</sub> = 1/4 µs = 250 kbit/s."],
  ["Ce avantaj are transmisia diferențială față de transmisia pe un singur fir?", "Perturbațiile electromagnetice induc aceeași tensiune pe ambele linii (mod comun); receptorul folosește diferența, deci perturbația se anulează. În plus, cablul torsadat radiază mai puțin."],
  ["Ce poate face un tester multimarcă și nu poate face un cititor OBD generic?", "Accesează toate modulele (ABS, airbag, caroserie, bord), citește codurile specifice constructorului și datele extinse, comandă actuatoarele (teste active), execută rutine de service, adaptări și codări."],
  ["De ce se măsoară căderea de tensiune cu consumatorul pornit?", "Căderea pe o rezistență de contact este R<sub>c</sub>·I: fără curent ea este zero chiar și la un contact foarte oxidat; un ohmmetru (curent de ordinul mA) nu evidențiază nici el rezistențe de ordinul miliohmilor."]
];
const TEST = [
  { q: "Rezistența măsurată între pinii 6 și 14 ai unei rețele CAN corecte este:", o: ["0 Ω", "≈ 60 Ω", "≈ 120 Ω", "∞"], c: 1, e: "Două terminări de 120 Ω în paralel." },
  { q: "În starea dominantă, tensiunile CAN-H / CAN-L sunt aproximativ:", o: ["2,5 V / 2,5 V", "3,5 V / 1,5 V", "5 V / 0 V", "12 V / 0 V"], c: 1, e: "U<sub>diff</sub> ≈ 2 V." },
  { q: "Un cod care începe cu „U” se referă la:", o: ["motor", "șasiu", "caroserie", "rețeaua de comunicație"], c: 3, e: "P – motopropulsor, C – șasiu, B – caroserie, U – rețea." },
  { q: "R pin 6 – pin 14 ≈ 120 Ω indică:", o: ["rețea normală", "terminare lipsă sau întrerupere spre un capăt", "CAN-H în scurt cu CAN-L", "terminare suplimentară"], c: 1, e: "Rămâne o singură terminare." },
  { q: "Un cititor OBD generic poate citi:", o: ["codurile ABS și airbag", "codurile P legate de emisii și monitoarele de pregătire", "codările modulelor", "toate modulele vehiculului"], c: 1, e: "Doar serviciile OBD legislative (SAE J1979)." },
  { q: "Rezistența magistralei se măsoară:", o: ["cu contactul pus și motorul pornit", "cu rețeaua în repaus sau bateria deconectată", "cu testerul conectat și comunicând", "oricând"], c: 1, e: "Cu rețeaua activă, transceiverele și traficul falsifică citirea (NSSM)." },
  { q: "Durata unui bit de 2 µs corespunde unei rate de:", o: ["125 kbit/s", "250 kbit/s", "500 kbit/s", "1 Mbit/s"], c: 2, e: "f = 1/t." }
];

/* ------------------------------------------------------------------ definiția lucrării */
const SIMPTOME = ["lampa motorului aprinsă / clipește", "martori ABS / ESP / airbag aprinși", "funcții de confort inactive (geamuri, închidere, climatizare)", "ecranul infotainment / bordul nu afișează", "fără simptome la bord, doar coduri", "motorul nu pornește"];
Cadru.porneste({
  disc: "DA", nr: 1, cod: "da-l1",
  titlu: "Diagnoza computerizată și rețeaua de date CAN",
  scurt: "Diagnoza computerizată și CAN",
  subtitlu: "Laborator virtual – autoturism 2025 cu gateway central, tester X431, cititor OBD, multimetru, osciloscop",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261001); },
  date: [{ k: "Rt", et: "R terminare nominală [Ω]", v: 120, fix: true }, { k: "N", et: "biți / cadru (8 octeți)", v: 125, fix: true }, { k: "fb", et: "f<sub>bit</sub> nominal [kbit/s]", v: 500, fix: true }],
  tabele: [
    { id: "t11", titlu: "Tabelul 1.1. Scanarea completă (X431)", antetRand: "Modul / sistem", nota: "Se completează din tester (butonul de înregistrare din ecranul de scanare).",
      randuri: MODULE.map(m => ({ k: m.k, et: `${m.nume} <small>(${m.b === "gw" ? "gateway" : NUME_MAG(m.b)})</small>` })),
      coloane: [{ k: "prot", t: "Protocol", intrare: true }, { k: "n", t: "Nr. coduri", intrare: true }, { k: "st", t: "Stare comunicație", intrare: true, tip: "select", optiuni: ["comunică", "comunică cu erori", "nu răspunde"] }] },
    { id: "t12", titlu: "Tabelul 1.2. Coduri de defect", antetRand: "Nr.", nota: "Se completează din ecranul „Coduri” al testerului (→ Tabelul 1.2).",
      randuri: ["1", "2", "3", "4", "5", "6", "7", "8"].map(k => ({ k, et: k })),
      coloane: [{ k: "cod", t: "Cod", intrare: true }, { k: "mod", t: "Modul", intrare: true }, { k: "desc", t: "Descriere", intrare: true }, { k: "st", t: "Stare", intrare: true, tip: "select", optiuni: STARI }, { k: "ff", t: "Freeze-frame (n, T, sarcină)", intrare: true }] },
    { id: "t13", titlu: "Tabelul 1.3. Monitoare de pregătire", antetRand: "Monitor", nota: "Alegeți starea citită pe tester (înainte de ștergerea codurilor).",
      randuri: MD.MON.map(k => ({ k, et: NUME_MON[k] })),
      coloane: [{ k: "st", t: "Stare", intrare: true, tip: "select", optiuni: MD.MON_ST, manualEval: true }] },
    { id: "t14", titlu: "Tabelul 1.4. Tester multimarcă și cititor OBD generic", antetRand: "Criteriu", nota: "Se completează de voi, după ce ați folosit ambele aparate.",
      randuri: [{ k: "mod", et: "Module accesibile" }, { k: "cod", et: "Coduri găsite" }, { k: "live", et: "Date live disponibile" }, { k: "test", et: "Teste active / funcții de service" }, { k: "timp", et: "Timp necesar" }],
      coloane: [{ k: "x", t: "Launch X431", intrare: true, manualEval: true }, { k: "o", t: "Cititor OBD generic", intrare: true, manualEval: true }] },
    { id: "t15", titlu: "Tabelul 1.5. Verificarea fizică a magistralei CAN", antetRand: "Mărime", nota: "„Normal”: la priza OBD (pinii 6/14, CAN diagnoză). „Cu defect”: la conectorul gateway-ului al magistralei afectate. Coloana se alege automat după starea rețelei.",
      randuri: [{ k: "R", et: "R CAN-H – CAN-L [Ω]" }, { k: "uh", et: "U<sub>CANH</sub> medie [V]" }, { k: "ul", et: "U<sub>CANL</sub> medie [V]" }, { k: "uhd", et: "U<sub>CANH</sub> dominant [V]" }, { k: "uld", et: "U<sub>CANL</sub> dominant [V]" }, { k: "tbit", et: "t<sub>bit</sub> [µs]" }],
      coloane: [{ k: "n", t: "Normal", intrare: true }, { k: "d", t: "Cu defect", intrare: true }, { k: "calc", t: "Calcul" }, { k: "ref", t: "Referință" }, { k: "conc", t: "Concluzie", intrare: true, tip: "select", optiuni: ["în regulă", "în afara limitelor (cu defect)", "în afara limitelor (normal)"], manualEval: true }] },
    { id: "t16", titlu: "Tabelul 1.6. Căderea de tensiune pe siguranța ventilatorului (ventilator pornit)", antetRand: "",
      randuri: [{ k: "f", et: "Siguranța ventilatorului" }],
      coloane: [{ k: "U0", t: "U<sub>0</sub> intrare [V]", intrare: true }, { k: "Us", t: "U<sub>s</sub> ieșire [V]", intrare: true }, { k: "I", t: "I [A]", intrare: true }, { k: "dU", t: "ΔU [V]" }, { k: "Rc", t: "R<sub>c</sub> [Ω]" }, { k: "conc", t: "Concluzie", intrare: true, tip: "select", optiuni: ["contact bun", "rezistență de contact prea mare"], manualEval: true }] },
    { id: "t17", titlu: "Tabelul 1.7. Defectul de rețea introdus", antetRand: "",
      randuri: [{ k: "d", et: "Defectul" }],
      coloane: [{ k: "simptom", t: "Simptom", intrare: true, tip: "select", optiuni: SIMPTOME, manualEval: true }, { k: "mod", t: "Module care nu comunică", intrare: true, manualEval: true }, { k: "cod", t: "Coduri U (gateway)", intrare: true, manualEval: true },
        { k: "bus", t: "Magistrala afectată", intrare: true, tip: "select", optiuni: MD.CHEI_MAG.map(b => MAG[b].n), manualEval: true }, { k: "tip", t: "Tipul defectului", intrare: true, tip: "select", optiuni: MD.CHEI_DEF.map(k => MD.TIPURI_DEF[k]), manualEval: true }, { k: "conf", t: "Măsurarea de confirmare", intrare: true, manualEval: true }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaDA1,
  intrebari(D) {
    return [
      { id: "q1", u: "kbit/s", text: "Rata de transfer f<sub>bit</sub> din durata bitului măsurată de voi (Tabelul 1.5, coloana „Normal”):", textSimplu: "Rata de transfer din t_bit măsurat" },
      { id: "q2", u: "%", text: "Încărcarea magistralei CAN motor S, din analiza magistralei afișată de tester (mesajele pe perioade), cu 125 biți pe cadru și 500 kbit/s:", textSimplu: "Încărcarea magistralei CAN motor" },
      { id: "q3", u: "Ω", text: "Rezistența de contact R<sub>c</sub> a siguranței ventilatorului (Tabelul 1.6):", textSimplu: "Rezistența de contact a siguranței" },
      { id: "q4", u: "Ω", text: "Rezistența pe care ați măsura-o între pinii 6 și 14 dacă s-ar adăuga o terminare suplimentară de 120 Ω pe CAN-ul de diagnoză (pornind de la R normal măsurat):", textSimplu: "R cu terminare suplimentară" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    if (!MODULE.some(m => t.t11[m.k].st)) l.push("Tabelul 1.1: scanarea completă");
    if (!Object.values(t.t12).some(r => r.cod)) l.push("Tabelul 1.2: cel puțin un cod de defect");
    const m = MD.MON.filter(k => t.t13[k].st).length; if (m < 7) l.push(`Tabelul 1.3: starea monitoarelor (${m}/7)`);
    ["R", "uh", "ul", "uhd", "uld", "tbit"].forEach(k => { if (t.t15[k].n === "") l.push(`Tabelul 1.5: ${{ R: "R CAN-H – CAN-L", uh: "U CAN-H medie", ul: "U CAN-L medie", uhd: "CAN-H dominant", uld: "CAN-L dominant", tbit: "t_bit" }[k]} (normal)`); });
    if (t.t15.R.d === "") l.push("Tabelul 1.5: R cu defect (la gateway)");
    ["U0", "Us", "I"].forEach(k => { if (t.t16.f[k] === "") l.push(`Tabelul 1.6: ${k}`); });
    if (t.t17.d.bus === "" || t.t17.d.tip === "") l.push("Tabelul 1.7: magistrala și tipul defectului");
    return l;
  },
  exemplu(D) {
    const t = D.t;
    Object.assign(t.t15.R, { n: "60.1", d: "120.2" }); Object.assign(t.t15.uh, { n: "2.520" }); Object.assign(t.t15.ul, { n: "2.480" });
    Object.assign(t.t15.uhd, { n: "3.52" }); Object.assign(t.t15.uld, { n: "1.48" }); Object.assign(t.t15.tbit, { n: "2.000" });
    Object.assign(t.t16.f, { U0: "12.400", Us: "11.600", I: "8.0" });
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Rețeaua de date a unui autoturism 2025 – gateway central, 5 magistrale CAN, Ethernet auto",
    intro: `<p>Cele 29 de module ale autoturismului, montate în pozițiile lor reale și legate prin perechile torsadate ale celor cinci magistrale (culoarea CAN-H diferă după magistrală, CAN-L este portocaliu-maro), cu gateway-ul central în spatele torpedoului, priza de diagnoză sub volan și Ethernet auto (verde) spre camere, infotainment, bord, telematică și DoIP. Mesajele circulă pe magistrale ca puncte luminoase; osciloscopul din colț arată CAN-H, CAN-L și U<sub>diff</sub> la punctul de măsură. Filtrați o magistrală, alegeți un modul din listă sau cu clic pe el; din meniul „Defect (demonstrație)” vedeți efectul fiecărui defect pe orice magistrală – independent de defectul vostru individual.</p>`,
    dupa: `<p class="nota">Modelul semnalelor: 500 kbit/s, nivel recesiv 2,5 V, dominant 3,5 / 1,5 V, cadre standard de ≈ 125 biți; pe CAN FD faza de date la 2 Mbit/s. Valorile sunt tipice, nu cele individuale.</p>`,
    optiuni: () => ({ sistem: "retea" })
  },
  referat: {
    scop: "Aplicarea procedurii de diagnosticare pe un autoturism cu gateway central: scanarea completă, interpretarea codurilor, a datelor freeze-frame și a monitoarelor, compararea testerului multimarcă cu un cititor OBD generic și verificarea fizică a magistralelor CAN, inclusiv localizarea unui defect de rețea.",
    relatii: "R<sub>e</sub> = R<sub>1</sub>R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>); &nbsp; U<sub>diff</sub> = U<sub>CANH</sub> − U<sub>CANL</sub>; &nbsp; f<sub>bit</sub> = 1/t<sub>bit</sub>; &nbsp; S = ΣN<sub>k</sub>f<sub>k</sub>/f<sub>bit</sub>·100; &nbsp; ΔU = U<sub>0</sub> − U<sub>s</sub>; &nbsp; R<sub>c</sub> = ΔU/I.",
    varianta: () => "Autoturism 2025 cu rețea proprie (terminări pe fiecare magistrală, trafic, contact de siguranță), un caz „client” și un defect de rețea ascuns pe una dintre magistrale, diferite de la student la student.",
    indicatii: "Scrieți lanțul cauzal pentru defectul clientului și pentru defectul de rețea (simptom → scanare și coduri U → magistrala afectată → măsurare la gateway → cauză → remediere → verificare), comparați testerul cu cititorul generic și interpretați măsurările…"
  },
  subsol: "Modelul: autoturism 2025 cu gateway central, 29 de module pe 5 magistrale CAN (500 kbit/s; CAN FD 2 Mbit/s pe șasiu), terminări proprii, trafic individual, coduri UDS/OBD cu freeze-frame și monitoare, rezistență de contact individuală. Fiecare student are un caz „client” și un defect de rețea ascuns.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `<div class="sim-grila">
    <div class="card sim-scena scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div class="vedere-sim">
        <div class="comutator-vedere" role="group"><button type="button" data-vedere="3d" id="btn-v3d">Machetă 3D</button><button type="button" data-vedere="schema">Schema rețelei</button></div>
        <div id="retea3d"><p class="nota">Se încarcă macheta 3D…</p></div>
        <svg id="svg-retea" viewBox="0 0 900 470" role="img" aria-label="Schema rețelei: gateway central, magistralele CAN, priza de diagnoză și cutia de siguranțe" style="display:none"></svg>
      </div>
      <div class="afisaje">
        <div class="afisaj"><span>Fișa client</span><b id="af-client" style="font-size:.86rem;line-height:1.25"></b><small>Autoturism 2025 (didactic)</small></div>
        <div class="afisaj"><span>Modulul selectat</span><b id="af-sel" style="font-size:.86rem;line-height:1.25">Gateway central</b><small id="af-sel-b">toate magistralele</small></div>
        <div class="afisaj"><span>Rețeaua la punctul de măsură</span><b id="af-retea" style="font-size:1rem">repaus</b><small id="af-repaus"></small></div>
        <div class="afisaj"><span>Tensiune baterie</span><b id="af-bat">—</b><small>V (pin 16)</small></div>
      </div>
      <div class="osc-cutie">
        <div class="osc-bara">
          <b>Osciloscop – 4 canale</b>
          <label>Timp/div <select id="osc-t">${TDIV.map(v => `<option value="${v}">${fmtT(v)}</option>`).join("")}</select></label>
          <button type="button" id="osc-run">STOP</button>
          <label>Afișare <select id="osc-mod"><option value="supr">canale suprapuse</option><option value="benzi">canale separate</option></select></label>
          <span class="nota" style="margin:0" id="osc-punct"></span>
        </div>
        <div class="osc-canale">${[0, 1, 2, 3].map(k => `<div class="osc-canal" style="--cc:${CULORI_CH[k]}">
          <label><input type="checkbox" data-ch-on="${k}"> <b>CH${k + 1}</b></label>
          <select data-ch-c="${k}" aria-label="Semnalul pe canalul ${k + 1}">${Object.entries(SURSE).map(([c, n]) => `<option value="${c}">${n.replace(/<[^>]+>/g, "")}</option>`).join("")}</select>
          <select data-ch-v="${k}" aria-label="V/div canalul ${k + 1}">${VDIV.map(v => `<option value="${v}">${String(v).replace(".", ",")} V/div</option>`).join("")}</select>
          <select data-ch-p="${k}" aria-label="Poziția nivelului de 0 V, canalul ${k + 1}">${[4, 3, 2, 1, 0, -1, -2, -3, -4].map(v => `<option value="${v}">0 V la ${v > 0 ? "+" : ""}${v} div</option>`).join("")}</select>
        </div>`).join("")}</div>
        <canvas id="cv-osc" height="320" aria-label="Ecranul osciloscopului; trageți cursoarele A și B"></canvas>
        <p class="nota" id="osc-cit"></p>
      </div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Autoturismul</h2>
      <div class="rand-butoane"><button type="button" id="btn-contact">Contact</button></div>
      <button type="button" class="lat" id="btn-vent">Pornește ventilatorul (test activ)</button>
      <button type="button" class="lat" id="btn-defect">Introdu defectul de rețea</button>
      <details class="setari" data-doar-demo><summary>Defectul de rețea (mod demonstrativ)</summary>
        <label class="camp">Magistrala <select id="sel-bus">${MD.CHEI_MAG.map(b => `<option value="${b}">${MAG[b].n}</option>`).join("")}</select></label>
        <label class="camp">Tipul <select id="sel-defect">${MD.CHEI_DEF.map(k => `<option value="${k}">${MD.TIPURI_DEF[k]}</option>`).join("")}</select></label>
        <p class="nota">În modul de evaluare defectul (magistrala și tipul) este individual și ascuns.</p></details>
      <h2>Punctul de măsură</h2>
      <select id="sel-punct" aria-label="Punctul de măsură pentru multimetru și osciloscop">${Object.entries(PUNCTE).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select>
      <p class="nota">Multimetrul (CAN) și osciloscopul se conectează aici, prin cutia de acces sau cu adaptoare back-probe.</p>
      <h2>Instrumentul</h2>
      <div class="comutator-aparat" role="group"><button type="button" data-aparat="x431">Tester X431</button><button type="button" data-aparat="obd">Cititor OBD</button><button type="button" data-aparat="mm">Multimetru</button><button type="button" data-aparat="osc">Osciloscop</button></div>
      <div class="panou-aparat" data-p="x431">
        <button type="button" class="lat" id="btn-x431c">Conectează interfața X431</button>
        <div class="comutator-aparat mic" role="group"><button type="button" data-vx="scan">Scanare</button><button type="button" data-vx="cod">Coduri</button><button type="button" data-vx="mon">Monitoare</button><button type="button" data-vx="live">Date live</button><button type="button" data-vx="can">Magistrala</button></div>
        <button type="button" class="primar lat" id="btn-scan">Scanare completă</button>
        <div class="tableta"><div id="x431-ecran" class="ecran-tester"></div></div>
      </div>
      <div class="panou-aparat" data-p="obd" hidden>
        <button type="button" class="lat" id="btn-obdc">Conectează cititorul OBD generic</button>
        <div class="tableta telefon"><div id="obd-ecran" class="ecran-tester"></div></div>
      </div>
      <div class="panou-aparat" data-p="mm" hidden>
        <label class="camp">Măsurarea <select id="sel-mm">
          <option value="r">Ω – între CAN-H și CAN-L (rețea în repaus)</option><option value="vh">V – CAN-H față de masă</option><option value="vl">V – CAN-L față de masă</option>
          <option value="v16">V – pin 16 (+12 V) față de pin 4</option><option value="vf0">V – intrarea siguranței ventilatorului (U₀)</option><option value="vfs">V – ieșirea siguranței ventilatorului (U_s)</option><option value="ia">A – clește ampermetric pe cablul ventilatorului</option></select></label>
        <div id="mm-aparat" class="mm-aparat"></div>
        <button type="button" class="primar lat" id="btn-mm">● Trece citirea în tabel</button>
      </div>
      <div class="panou-aparat" data-p="osc" hidden>
        <p class="nota">CH1 pe CAN-H, CH2 pe CAN-L la punctul de măsură ales. Opriți imaginea (STOP) și trageți cursoarele A și B.</p>
        <button type="button" class="lat" id="btn-dom">● Nivelurile dominante (cursorul A) → Tabelul 1.5</button>
        <label class="camp">Număr de biți între cursoare <input type="number" id="in-biti" value="1" min="1" max="200" step="1"></label>
        <button type="button" class="primar lat" id="btn-tbit">● Trece durata bitului în Tabelul 1.5</button>
      </div>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
    </aside>
  </div>`,
    init(C) {
      construiesteSVG(); legaOsc(); porneste3D();
      $$("[data-vedere]").forEach(b => b.addEventListener("click", () => comutaVedere(b.dataset.vedere)));
      comutaVedere("3d");
      $("#osc-t").value = String(sim.osc.tdiv);
      $("#osc-t").addEventListener("change", e => { sim.osc.tdiv = +e.target.value; if (!sim.osc.ruleaza) { achizitie(); deseneazaOsc(); } });
      $("#osc-mod").addEventListener("change", e => { sim.osc.benzi = e.target.value === "benzi"; deseneazaOsc(); });
      $("#osc-run").addEventListener("click", () => { sim.osc.ruleaza = !sim.osc.ruleaza; $("#osc-run").textContent = sim.osc.ruleaza ? "STOP" : "RUN"; deseneazaOsc(); });
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      ["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, () => setTimeout(deseneazaOsc, 120)));
      $("#btn-ecran").addEventListener("click", () => setTimeout(deseneazaOsc, 150));
      $("#btn-contact").addEventListener("click", () => contact(!sim.contact));
      $("#btn-vent").addEventListener("click", () => { if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie"); if (!sim.x431 || !raspunde("ecm")) return Cadru.mesajTemporar("Testul activ se comandă din X431 (conectat și comunicând cu ECM).", "atentie"); sim.vent = !sim.vent; actualizeazaPanou(); });
      $("#btn-defect").addEventListener("click", comutaDefect);
      $("#sel-defect").addEventListener("change", e => { sim.defectDemo = e.target.value; sim.scan = null; actualizeazaPanou(); });
      $("#sel-bus").addEventListener("change", e => { sim.busDemo = e.target.value; sim.scan = null; actualizeazaPanou(); });
      $("#sel-punct").addEventListener("change", e => { sim.punct = e.target.value; if (!sim.osc.ruleaza) achizitie(); deseneazaOsc(); actualizeazaSVG(0); });
      $("#btn-x431c").addEventListener("click", () => conecteaza("x431"));
      $("#btn-obdc").addEventListener("click", () => conecteaza("obd"));
      $("#btn-scan").addEventListener("click", scaneaza);
      $$("[data-vx]").forEach(b => b.addEventListener("click", () => { sim.vx = b.dataset.vx; actualizeazaPanou(); }));
      $$("[data-aparat]").forEach(b => b.addEventListener("click", () => { sim.aparat = b.dataset.aparat; actualizeazaPanou(); deseneazaOsc(); }));
      $("#sel-mm").addEventListener("change", e => { sim.mm = e.target.value; });
      $("#btn-mm").addEventListener("click", inregMultimetru);
      $("#btn-tbit").addEventListener("click", inregTbit);
      $("#btn-dom").addEventListener("click", inregDominant);
      actualizeazaPanou();
      C.mesaj("Citiți fișa client; cu contactul decuplat conectați interfața X431 la priza de diagnoză, apoi puneți contactul și faceți scanarea completă.", "");
    },
    aplicaEval(P2, C) { ["#sel-defect", "#sel-bus"].forEach(s => { const e = $(s); if (e) e.disabled = true; }); },
    reset() { Object.assign(sim, { contact: false, tOff: 999, defActiv: false, vent: false, x431: false, obd: false, scan: null, sterse: false, ciclu: 0 }); },
    cadru(dt0, C, vizibil) {
      const acum = performance.now(), dt = Math.min(1, Math.max(0, (acum - (sim._t || acum)) / 1000)); sim._t = acum;
      sim.t += dt * 1e-3;
      if (!sim.contact) sim.tOff += dt;
      if (sim.osc.ruleaza && (vizibil || sim.aparat === "osc")) achizitie();
      if (!vizibil) return;
      actualizeazaSVG(dt);
      if (acum - (this._ta || 0) > 150) {
        this._ta = acum;
        deseneazaOsc();
        const r = sim.aparat === "mm" ? citireMultimetru() : null, cl = MD.CLIENT[P().client];
        if (r) multimetruSVG(r.txt);
        $("#af-client").textContent = cl.simptom;
        $("#af-retea").textContent = comunica() ? "activă" : treaza() ? "fără comunicare" : "repaus";
        $("#af-repaus").textContent = (!sim.contact && sim.tOff < T_REPAUS ? `repaus în ${Math.ceil(T_REPAUS - sim.tOff)} s · ` : "") + NUME_MAG(sim.punct);
        $("#af-bat").textContent = fmt(semnal("b", 0), 2);
        $("#osc-punct").textContent = "la: " + PUNCTE[sim.punct];
        C.stare(1, sim.contact ? "contact pus" : "contact decuplat", sim.contact ? "inc" : "");
        C.stare(2, sim.defActiv ? "defect de rețea introdus" : "rețea fără defect introdus");
        if (sim.aparat === "mm" && r && r.msg) C.mesajAuto(r.msg, "atentie"); else C.mesajAuto("");
      }
    },
    redeseneaza() { deseneazaOsc(); },
    formule() {
      const o = sim.osc, dt = Math.abs(o.c2 - o.c1) * o.tdiv, n = Math.max(1, num($("#in-biti") && $("#in-biti").value) || 1);
      return [
        ["Durata bitului și rata (1.3)", dt > 0 ? `t<sub>bit</sub> = ${fmtT(dt)}/${n} = ${fmt(dt / n * 1e6, 3)} µs → f<sub>bit</sub> = <span class="rez">${fmt(n / dt / 1000, 1)} kbit/s</span>` : "—"],
        ["Rezistența echivalentă (1.1)", "R<sub>e</sub> = 120·120/(120 + 120) = <span class=\"rez\">60 Ω</span> (valori nominale)"],
        ["Rezistența de contact (1.6)", sim.vent && sim.contact ? "ΔU = U<sub>0</sub> − U<sub>s</sub>; R<sub>c</sub> = ΔU/I – din citirile voastre" : "porniți ventilatorul"]
      ];
    }
  }
});
