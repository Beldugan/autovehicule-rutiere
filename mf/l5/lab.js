/* MF – Lucrarea 5. Regimuri de curgere. Experiența lui Reynolds.
   Simulator: fotografia aparatului Reynolds (randată din modelul 3D) cu suprapuneri animate – nivelul din rezervor, jetul de alimentare,
   termometrul, colorantul din vas și din ac, firul de colorant în tub și în lupa mărită, furtunul de ieșire, vasul gradat și cronometrul;
   modelul 3D separat în fila „Aparatul (3D)”. Firul de colorant se vede ca linie (laminar), oscilant și cu
   pufuri (tranziție) sau amestecat în toată secțiunea (turbulent); tranziția are histerezis. Parametrii sunt individuali. */
"use strict";
const MD = MODELE["mf-l5"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea aparatului */
const sim = {
  t: 0, viteza: 1, manusi: false, alim: false, plin: false, tRep: 0, a: 0, aEf: 0, st: "laminar", colorant: false, nivColorant: 1,
  colectare: false, Vvas: 0, crono: 0, cronoMerge: false, tAdev: 0, err: 0, dir: 0, ultStCol: null, stTranz: [], aspect: "", etichete: true, nssm2: false, curbe: [], curba: null
};
let SV3 = null;
const Q = () => sim.alim && sim.plin ? MD.debit(P(), sim.aEf) : 0;          // [L/s]
const reAdev = () => MD.Re(P(), Q());
function actualizeazaRegim() { sim.st = Q() > 0 ? MD.regim(P(), reAdev(), sim.st, sim.tRep) : "laminar"; }
const NUME_ST = { laminar: "linie dreaptă, subțire – laminar", tranzitie: "oscilant, cu pufuri intermitente – tranziție", turbulent: "amestecat rapid în toată secțiunea – turbulent" };

/* ------------------------------------------------------------------ comenzi */
function seteazaA(a) {
  const nou = Math.max(0, Math.min(100, Math.round(a * 2) / 2)), d = nou - sim.a;
  if (Math.abs(d) >= 10) { sim.tRep = Math.min(sim.tRep, 40); Cadru.mesajTemporar("Robinetul se manevrează lent: o deschidere bruscă perturbă curgerea (tranziția apare mai devreme).", "atentie"); }
  sim.dir = d > 0 ? 1 : d < 0 ? -1 : sim.dir; sim.a = nou; actualizeaza();
}
function comutaAlim() {
  if (!sim.alim && (!sim.manusi || !sim.nssm2)) return Cadru.mesajTemporar("Bifați verificările NSSM (mănuși, tubul de sticlă fixat) înainte de a deschide alimentarea.", "atentie");
  sim.alim = !sim.alim; if (!sim.alim) { sim.tRep = 0; } actualizeaza();
}
function comutaColorant() {
  if (!sim.manusi) return Cadru.mesajTemporar("NSSM: colorantul se manipulează cu mănuși.", "pericol");
  sim.colorant = !sim.colorant; actualizeaza();
}
function startColectare() {
  if (sim.colectare) return opresteColectare();
  if (Q() <= 0) return Cadru.mesajTemporar("Nu curge apă: alimentarea și robinetul de reglare.", "atentie");
  if (sim.Vvas > 0.001) return Cadru.mesajTemporar("Goliți întâi vasul gradat.", "atentie");
  sim.curba = { pts: [[0, 0]] }; sim.curbe.push(sim.curba); if (sim.curbe.length > 4) sim.curbe.shift();
  sim.colectare = true; sim.tAdev = 0; sim.crono = 0; sim.cronoMerge = true; sim.err = (Math.random() - 0.5) * 0.3; sim.stColectare = sim.st; sim.stMix = false; actualizeaza();
}
function opresteColectare() {
  if (!sim.colectare) return; sim.colectare = false; sim.cronoMerge = false; sim.crono = Math.max(0, Math.round((sim.tAdev + sim.err) * 100) / 100);
  if (sim.crono < 5) Cadru.mesajTemporar("Timpul de colectare este prea scurt (< 5 s): eroarea de pornire / oprire a cronometrului devine mare.", "atentie");
  actualizeaza();
}
function golesteVas() { if (sim.colectare) return; sim.Vvas = 0; sim.crono = 0; actualizeaza(); }
const Vcitit = () => Math.round(sim.Vvas / 0.01) * 0.01;

/* ------------------------------------------------------------------ înregistrări */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregT(e) {
  if (!sim.plin) return Cadru.mesajTemporar("Umpleți rezervorul (alimentarea deschisă).", "atentie");
  const v = Math.round(P().T * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "T", v }, celule: [{ t: "t50", r: "T", c: "v", v: v.toFixed(1) }] }); if (ok) msg(`Tabelul 5.0: temperatura apei ${fx(v, 1)} °C.`);
}
function verifMasurare() {
  if (sim.colectare) { Cadru.mesajTemporar("Opriți întâi colectarea.", "atentie"); return false; }
  if (!(sim.Vvas > 0.02) || !(sim.crono > 0)) { Cadru.mesajTemporar("Colectați apă în vasul gradat cu cronometrul pornit (Start / Stop colectare).", "atentie"); return false; }
  if (sim.Vvas > 1.0) { Cadru.mesajTemporar("Vasul a dat pe dinafară (> 1 L): golire și repetare.", "atentie"); return false; }
  if (sim.stMix) { Cadru.mesajTemporar("Regimul s-a schimbat în timpul colectării: repetați la debit constant.", "atentie"); return false; }
  return true;
}
function inregRand(e) {
  if (!verifMasurare()) return;
  const asp = $("#sel-asp").value; if (!asp) return Cadru.mesajTemporar("Alegeți aspectul firului de colorant observat.", "atentie");
  const T = Cadru.D.t; let k = null; for (let i = 1; i <= 8; i++) if (T.t52["r" + i].V === "") { k = "r" + i; break; } if (!k) return Cadru.mesajTemporar("Tabelul 5.2 este plin (8 determinări).", "atentie");
  const V = Vcitit(), t = sim.crono;
  const ok = Cadru.inregistreaza(e, { log: { m: "q", k, a: sim.a, V, t, st: sim.stColectare, asp }, celule: [{ t: "t52", r: k, c: "V", v: V.toFixed(2) }, { t: "t52", r: k, c: "t", v: t.toFixed(2) }, { t: "t52", r: k, c: "asp", v: asp }] });
  if (ok) { msg(`Tabelul 5.2, determinarea ${k.slice(1)}: V = ${fx(V, 2)} L în t = ${fx(t, 2)} s; aspect: ${asp}. Goliți vasul.`); }
}
function inregCrit(e, k) {
  if (!verifMasurare()) return;
  const cond = { sus1: [sim.dir > 0 && sim.stColectare === "tranzitie", "La creșterea lentă a debitului, colectați exact când firul începe să oscileze (regim de tranziție)."],
    sus2: [sim.dir > 0 && sim.stColectare === "turbulent", "Creșteți debitul până când colorantul se amestecă în toată secțiunea (turbulent) și colectați."],
    jos: [sim.dir < 0 && sim.stColectare === "laminar", "La scăderea lentă a debitului, colectați imediat ce firul redevine o linie (laminar)."] }[k];
  if (!cond[0]) return Cadru.mesajTemporar(cond[1], "atentie");
  const V = Vcitit(), t = sim.crono;
  const ok = Cadru.inregistreaza(e, { log: { m: "q", k, a: sim.a, V, t, st: sim.stColectare, dir: sim.dir }, celule: [{ t: "t52b", r: k, c: "V", v: V.toFixed(2) }, { t: "t52b", r: k, c: "t", v: t.toFixed(2) }] });
  if (ok) msg(`Tabelul 5.2b (${{ sus1: "începutul oscilației, crescător", sus2: "amestec complet, crescător", jos: "redevine laminar, descrescător" }[k]}): V = ${fx(V, 2)} L, t = ${fx(t, 2)} s.`);
}

/* ------------------------------------------------------------------ fotografia aparatului + suprapunerile animate */
const FOTO = {
  tubA: [485.2, 464.3], tubB: [1186, 469.8], R: 4.4, roata: [1210.3, 425.5], crono: [1135.5, 736],
  vas: { x0: 1268, x1: 1352, jos: 752, l1: 647, sus: 626 }, rez: { x0: 222, x1: 462, sus: 318, jos: 540 },
  lupa: { x0: 548, x1: 1176, y0: 46, y1: 222, a: 612, b: 1150, yc: 140, R: 30 }
};
const tubY = x => FOTO.tubA[1] + (x - FOTO.tubA[0]) * (FOTO.tubB[1] - FOTO.tubA[1]) / (FOTO.tubB[0] - FOTO.tubA[0]);
const SV = {};
const NP = 320;
const dye = { p: [], acc: 0, puf: [], t: 0 };
function etichetaFoto(parent, x, y, x2, y2, text, ancora) {
  mk("line", { x1: x, y1: y, x2, y2, stroke: "#1b2a3a", "stroke-width": 1.2 }, parent);
  mk("circle", { cx: x, cy: y, r: 3, fill: "#1b2a3a" }, parent);
  const t = mk("text", { x: x2 + (ancora === "end" ? -5 : 5), y: y2 + 5, "text-anchor": ancora || "start", "font-size": 15, "font-weight": 600, fill: "#10202f", "font-family": "system-ui, sans-serif" }, parent);
  t.textContent = text;
  requestAnimationFrame(() => { try { const b = t.getBBox(); const r = mk("rect", { x: b.x - 5, y: b.y - 2, width: b.width + 10, height: b.height + 4, rx: 5, fill: "#ffffff", opacity: 0.88, stroke: "#c5ced8" }, parent); parent.insertBefore(r, t); } catch (e) { } });
}
const txt = (parent, x, y, s, o = {}) => { const t = mk("text", Object.assign({ x, y, "font-size": 14, fill: "#10202f", "font-family": "system-ui, sans-serif", "font-weight": 700 }, o), parent); t.textContent = s; return t; };
function zonaClic(parent, attrs, k, titlu) {
  const r = mk(attrs.r ? "circle" : "rect", Object.assign({ fill: "transparent", style: "cursor:pointer" }, attrs), parent);
  mk("title", {}, r).textContent = titlu; r.addEventListener("click", () => laClic3d(k)); return r;
}
function construiesteSVG() {
  const svg = $("#svg-reynolds"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs);
  grad(defs, "gLCDf", [[0, "#a7b39b"], [1, "#909d86"]]);
  grad(defs, "gApaV", [[0, "#7db7de", 0.6], [0.5, "#b9dcf2", 0.5], [1, "#6aa8d4", 0.65]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gApaL", [[0, "#cfe7f6", 0.95], [0.5, "#eaf5fc", 0.9], [1, "#bcdcf0", 0.95]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  grad(defs, "gSticlaL", [[0, "#ffffff", 0.9], [0.18, "#d9ecf7", 0.25], [0.82, "#d9ecf7", 0.25], [1, "#9cc3dc", 0.8]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  grad(defs, "gMag", [[0, "#c2185b", 0], [0.5, "#c2185b", 0.55], [1, "#c2185b", 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  grad(defs, "gRosuV", [[0, "#e35d4f"], [0.5, "#c62828"], [1, "#7f1010"]]);
  const g = mk("g", {}, svg); SV.g = g;
  mk("image", { href: "img/sim_aparat.jpg", x: 0, y: 0, width: 1536, height: 790, preserveAspectRatio: "none" }, g);
  const F = FOTO, Z = F.rez;
  // rezervorul: nivelul apei la umplere
  SV.rezApa = mk("rect", { x: Z.x0 + 2, y: Z.jos, width: Z.x1 - Z.x0 - 4, height: 0, fill: "#8cc4e6", opacity: 0.22 }, g);
  SV.rezNiv = mk("line", { x1: Z.x0 + 2, x2: Z.x1 - 2, y1: Z.jos, y2: Z.jos, stroke: "#3d86bd", "stroke-width": 1.5, opacity: 0 }, g);
  // alimentarea: jetul din ștuț și robinetul albastru pe furtun
  SV.jet = mk("path", { d: "", fill: "none", stroke: "#9fd0ee", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.85 }, g);
  const ra = [214, 420];
  mk("rect", { x: ra[0] - 11, y: ra[1] - 20, width: 22, height: 40, rx: 4, fill: "url(#gAlama)", stroke: "#5f430f" }, g);
  mk("rect", { x: ra[0] - 4, y: ra[1] - 32, width: 8, height: 14, fill: "url(#gAlamaO)", stroke: "#5f430f" }, g);
  SV.manAlim = mk("g", { transform: `translate(${ra[0]},${ra[1] - 32})` }, g);
  mk("rect", { x: -4, y: -36, width: 8, height: 38, rx: 3, fill: "#1565c0", stroke: "#0b3c78" }, SV.manAlim);
  mk("circle", { cx: 0, cy: 0, r: 5, fill: "url(#gCrom)", stroke: "#555" }, SV.manAlim);
  // vasul de colorant: nivelul lichidului, robinetul verde, colorantul în ac
  SV.colLiq = mk("rect", { x: 298, y: 139, width: 38, height: 0, fill: "#a3104a", opacity: 0.78 }, g);
  SV.manColo = mk("g", { transform: "translate(325,152)" }, g);
  mk("rect", { x: -2.5, y: -2.5, width: 26, height: 5, rx: 2, fill: "#2e7d32", stroke: "#1b4d1e" }, SV.manColo);
  mk("circle", { cx: 0, cy: 0, r: 3.5, fill: "url(#gCrom)" }, SV.manColo);
  SV.ac = mk("path", { d: "M326 164 L327 340 C 329 418, 372 458, 479 464", fill: "none", stroke: "#a3104a", "stroke-width": 1.6, opacity: 0 }, g);
  // termometrul din rezervor + afișajul (acoperă eticheta din fotografie)
  const xt = 406;
  mk("rect", { x: xt - 4, y: 252, width: 8, height: 168, rx: 4, fill: "#ffffff", opacity: 0.55, stroke: "#8fa6b6", "stroke-width": 0.8 }, g);
  mk("circle", { cx: xt, cy: 424, r: 6, fill: "#c62828", stroke: "#7f1010" }, g);
  SV.termCol = mk("rect", { x: xt - 1.6, y: 300, width: 3.2, height: 120, fill: "#c62828" }, g);
  for (let T = 0; T <= 40; T += 5) { const y = 412 - T * 3.6; mk("line", { x1: xt + 4, x2: xt + (T % 10 ? 8 : 11), y1: y, y2: y, stroke: "#1b2733", "stroke-width": 0.8 }, g); if (T % 10 === 0) txt(g, xt + 13, y + 3.5, T, { "font-size": 9, "font-weight": 600 }); }
  mk("rect", { x: 392, y: 220, width: 100, height: 28, rx: 5, fill: "#ffffff", stroke: "#9aa6b1" }, g);
  SV.termTxt = txt(g, 442, 239, "", { "text-anchor": "middle", "font-size": 15, fill: "#b71c1c" });
  // firul de colorant în tubul real
  SV.norT = mk("g", {}, g); SV.firT = mk("g", { "stroke-linecap": "round" }, g);
  // robinetul de reglare: deschiderea
  mk("rect", { x: F.roata[0] - 46, y: F.roata[1] - 62, width: 92, height: 24, rx: 5, fill: "#ffffff", opacity: 0.92, stroke: "#9aa6b1" }, g);
  SV.aTxt = txt(g, F.roata[0], F.roata[1] - 45, "", { "text-anchor": "middle", "font-size": 14 });
  // furtunul de ieșire, scurgerea și vasul gradat
  mk("path", { d: "M1408 642 L1452 642 L1438 680 L1422 680 Z", fill: "url(#gOtel)", stroke: "#4b5259" }, g);
  mk("rect", { x: 1424, y: 680, width: 12, height: 70, fill: "url(#gOtelO)", stroke: "#4b5259" }, g);
  txt(g, 1430, 772, "scurgere", { "text-anchor": "middle", "font-size": 12, "font-weight": 600, fill: "#33414e" });
  const V = F.vas;
  mk("rect", { x: V.x0, y: V.sus, width: V.x1 - V.x0, height: V.jos - V.sus, rx: 5, fill: "#ffffff", opacity: 0.5 }, g);
  SV.vasApa = mk("rect", { x: V.x0 + 3, y: V.jos, width: V.x1 - V.x0 - 6, height: 0, fill: "url(#gApaV)" }, g);
  mk("rect", { x: V.x0, y: V.sus, width: V.x1 - V.x0, height: V.jos - V.sus, rx: 5, fill: "url(#gSticla)", stroke: "#7f9fb5", "stroke-width": 1.4 }, g);
  for (let k = 1; k <= 10; k++) { const y = V.jos - k * (V.jos - V.l1) / 10; mk("line", { x1: V.x1 - (k % 5 ? 12 : 22), x2: V.x1 - 3, y1: y, y2: y, stroke: "#1b2733", "stroke-width": k % 5 ? 0.8 : 1.3 }, g); }
  txt(g, V.x1 - 25, V.l1 + 4, "1 L", { "text-anchor": "end", "font-size": 10 }); txt(g, V.x1 - 25, (V.jos + V.l1) / 2 + 4, "0,5", { "text-anchor": "end", "font-size": 10 });
  SV.furtun = mk("path", { d: "", fill: "none", stroke: "#c9dfec", "stroke-width": 9, "stroke-linecap": "round", opacity: 0.95 }, g);
  SV.furtunC = mk("path", { d: "", fill: "none", stroke: "#7f9fb5", "stroke-width": 1.2, opacity: 0.8 }, g);
  SV.jetIes = mk("path", { d: "", fill: "none", stroke: "#8cc4e6", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.9 }, g);
  SV.vasTxt = txt(g, (V.x0 + V.x1) / 2, V.sus - 10, "", { "text-anchor": "middle", "font-size": 14 });
  // cronometrul digital pe masă
  const cr = mk("g", { transform: "translate(1046,682)" }, g);
  mk("rect", { x: 0, y: 0, width: 150, height: 74, rx: 16, fill: "url(#gNegru)", stroke: "#000" }, cr);
  mk("rect", { x: 66, y: -10, width: 18, height: 12, rx: 3, fill: "url(#gCrom)" }, cr);
  mk("rect", { x: 12, y: 12, width: 126, height: 38, rx: 4, fill: "url(#gLCDf)" }, cr);
  SV.cronoTxt = txt(cr, 132, 41, "0:00,00", { "text-anchor": "end", "font-size": 24, "font-family": "'Courier New', monospace", fill: "#1f2a12" });
  SV.cronoLed = mk("circle", { cx: 22, cy: 62, r: 4, fill: "#3a3a3a" }, cr);
  txt(cr, 32, 66, "START / STOP", { "font-size": 10, fill: "#cfd6dd", "font-weight": 600 });
  // lupa: tubul mărit radial, cu intrarea profilată și acul
  const L = F.lupa;
  SV.lupa = mk("g", {}, g);
  mk("line", { x1: 862, y1: L.y1, x2: 862, y2: tubY(862) - 8, stroke: "#4a6276", "stroke-width": 1.2, "stroke-dasharray": "5 4" }, SV.lupa);
  mk("rect", { x: L.x0, y: L.y0, width: L.x1 - L.x0, height: L.y1 - L.y0, rx: 12, fill: "#f8fbfd", opacity: 0.94, stroke: "#8fa6b6", "stroke-width": 1.5 }, SV.lupa);
  txt(SV.lupa, L.x0 + 14, L.y0 + 22, "Tubul de sticlă văzut de aproape (raza mărită ×7)", { "font-size": 13, fill: "#33414e" });
  SV.lupaSt = txt(SV.lupa, L.x1 - 14, L.y0 + 22, "", { "font-size": 13, "text-anchor": "end", fill: "#a3104a" });
  const cpL = mk("clipPath", { id: "cLupa" }, defs); mk("rect", { x: L.a, y: L.yc - L.R, width: L.b - L.a, height: 2 * L.R }, cpL);
  mk("path", { d: `M${L.x0 + 14} ${L.yc - 62} C ${L.a - 30} ${L.yc - 62}, ${L.a - 8} ${L.yc - L.R - 4}, ${L.a} ${L.yc - L.R} L${L.b} ${L.yc - L.R} L${L.b} ${L.yc + L.R} L${L.a} ${L.yc + L.R} C ${L.a - 8} ${L.yc + L.R + 4}, ${L.a - 30} ${L.yc + 62}, ${L.x0 + 14} ${L.yc + 62} Z`, fill: "url(#gApaL)" }, SV.lupa);
  SV.norL = mk("g", { "clip-path": "url(#cLupa)" }, SV.lupa);
  SV.firL = mk("g", { "clip-path": "url(#cLupa)", "stroke-linecap": "round" }, SV.lupa);
  mk("path", { d: `M${L.x0 + 14} ${L.yc - 62} C ${L.a - 30} ${L.yc - 62}, ${L.a - 8} ${L.yc - L.R - 4}, ${L.a} ${L.yc - L.R} L${L.b} ${L.yc - L.R}`, fill: "none", stroke: "#7f9fb5", "stroke-width": 3 }, SV.lupa);
  mk("path", { d: `M${L.x0 + 14} ${L.yc + 62} C ${L.a - 30} ${L.yc + 62}, ${L.a - 8} ${L.yc + L.R + 4}, ${L.a} ${L.yc + L.R} L${L.b} ${L.yc + L.R}`, fill: "none", stroke: "#7f9fb5", "stroke-width": 3 }, SV.lupa);
  mk("rect", { x: L.a, y: L.yc - L.R - 3, width: L.b - L.a, height: 2 * L.R + 6, fill: "url(#gSticlaL)", "pointer-events": "none" }, SV.lupa);
  mk("path", { d: `M${L.a - 70} ${L.y0 + 28} C ${L.a - 40} ${L.yc - 40}, ${L.a - 30} ${L.yc}, ${L.a - 6} ${L.yc}`, fill: "none", stroke: "url(#gCrom)", "stroke-width": 3.2 }, SV.lupa);
  SV.acL = mk("path", { d: `M${L.a - 70} ${L.y0 + 28} C ${L.a - 40} ${L.yc - 40}, ${L.a - 30} ${L.yc}, ${L.a - 6} ${L.yc}`, fill: "none", stroke: "#a3104a", "stroke-width": 1.2, opacity: 0 }, SV.lupa);
  [0.25, 0.5, 0.75].forEach(f => { const x = L.a + f * (L.b - L.a); mk("line", { x1: x, x2: x, y1: L.yc + L.R + 4, y2: L.yc + L.R + 10, stroke: "#4a6276" }, SV.lupa); });
  txt(SV.lupa, L.a, L.y1 - 8, "intrare profilată + ac injector", { "font-size": 11, "font-weight": 600, fill: "#4a6276", "text-anchor": "middle" });
  txt(SV.lupa, L.b, L.y1 - 8, "spre robinetul de reglare →", { "font-size": 11, "font-weight": 600, fill: "#4a6276", "text-anchor": "end" });
  // elementele refolosite ale firului de colorant
  SV.lT = []; SV.lL = [];
  for (let i = 0; i < NP; i++) { SV.lT.push(mk("line", { stroke: "#a3104a", "stroke-width": 1.7, opacity: 0 }, SV.firT)); SV.lL.push(mk("line", { stroke: "#a3104a", "stroke-width": 3.2, opacity: 0 }, SV.firL)); }
  SV.nT = [0, 1, 2, 3, 4].map(() => mk("rect", { x: 0, y: 0, width: 0, height: 0, rx: 3, fill: "#c2185b", opacity: 0 }, SV.norT));
  SV.nL = [0, 1, 2, 3, 4].map(() => mk("rect", { x: 0, y: L.yc - L.R, width: 0, height: 2 * L.R, fill: "url(#gMag)", opacity: 0 }, SV.norL));
  // zonele de clic
  zonaClic(g, { x: 196, y: 380, width: 36, height: 60 }, "alim", "Robinetul de alimentare (deschide / închide)");
  zonaClic(g, { x: 290, y: 66, width: 54, height: 100 }, "colorant", "Robinetul colorantului (deschide / închide)");
  zonaClic(g, { r: 1, cx: F.roata[0], cy: F.roata[1] + 10, r: 34 }, "robinet", "Robinetul de reglare: +1 %");
  zonaClic(g, { x: 1040, y: 672, width: 162, height: 90 }, "crono", "Cronometrul: start / stop colectare");
  zonaClic(g, { x: V.x0 - 4, y: V.sus - 30, width: V.x1 - V.x0 + 8, height: V.jos - V.sus + 34 }, "vas", "Vasul gradat: start / stop colectare");
  zonaClic(g, { x: 392, y: 220, width: 100, height: 210 }, "termometru", "Termometrul");
  // etichetele
  SV.et = mk("g", { "pointer-events": "none" }, g);
  etichetaFoto(SV.et, 236, 500, 80, 640, "Rezervor de nivel constant");
  etichetaFoto(SV.et, 204, 420, 60, 360, "Robinet alimentare", "start");
  etichetaFoto(SV.et, 298, 100, 180, 60, "Vas colorant", "end");
  etichetaFoto(SV.et, 470, 300, 500, 290, "Termometru");
  etichetaFoto(SV.et, 480, 464, 520, 412, "Ac injector");
  etichetaFoto(SV.et, 700, 466, 640, 590, "Tub de sticlă d = 10 mm");
  etichetaFoto(SV.et, 1222, 436, 1300, 330, "Robinet de reglare");
  etichetaFoto(SV.et, 1352, 700, 1400, 560, "Vas gradat 1 L");
  etichetaFoto(SV.et, 1046, 720, 960, 660, "Cronometru", "end");
  SV.et.style.display = sim.etichete ? "" : "none";
  prefixeazaId(svg, "v5-");
}
/* firul de colorant: particule transportate cu profilul de viteze (laminar parabolic / turbulent aplatizat) și perturbate după regim */
const VIZ_L = 0.9;   // lungimea tubului [m] (pentru timpul de parcurgere)
function uLocal(r, v, g) { const lam = 2 * (1 - r * r), tur = 1.22 * Math.pow(Math.max(0, 1 - Math.abs(r)), 1 / 7); return v * (lam * (1 - g) + tur * g); }
function miscaColorant(dt) {
  const p = P(), v = Q() / 1000 / (Math.PI * 0.0001 / 4), re = reAdev(), g = Q() > 0 ? MD.gamma(p, re, sim.st) : 0;
  dye.t += dt; dye.g = g; dye.v = v;
  const emite = sim.colorant && v > 0.002 && sim.nivColorant > 0;
  if (emite) {
    const rata = NP * 0.92 * v / VIZ_L; dye.acc += rata * dt;
    while (dye.acc >= 1 && dye.p.length < NP) { dye.acc -= 1; dye.p.push({ x: 0, r: (Math.random() - 0.5) * 0.03, sp: 1 / rata }); }
    if (dye.acc > 1) dye.acc = 1;
  }
  // pufurile (tranziție): zone în care firul se rupe și se amestecă
  if (sim.st === "tranzitie" && emite && Math.random() < dt * (0.25 + 0.7 * g)) dye.puf.push({ x: 0.25 + Math.random() * 0.25, L: 0.06 + 0.12 * g });
  dye.puf.forEach(q => { q.x += 1.05 * v * dt / VIZ_L; q.L += 0.04 * dt; }); dye.puf = dye.puf.filter(q => q.x - q.L < 1.05).slice(-5);
  const turb = sim.st === "turbulent";
  dye.p.forEach(q => {
    const u = uLocal(q.r, v, g); q.x += u * dt / VIZ_L; q.u = u;
    let D = 0.0004;
    if (turb) D = q.x > 0.04 ? 3.5 : 0.3;
    else if (sim.st === "tranzitie") D = dye.puf.some(f => q.x < f.x && q.x > f.x - f.L) ? 2.2 : 0.004;
    q.r += (Math.random() - 0.5) * Math.sqrt(D * dt) * 2.2;
    if (q.r > 0.94) q.r = 1.88 - q.r; if (q.r < -0.94) q.r = -1.88 - q.r;
  });
  dye.p = dye.p.filter(q => q.x < 1.02);
  dye.front = dye.p.reduce((m, q) => Math.max(m, q.x), 0);
}
function deseneazaColorant() {
  if (!SV.lT) return;
  const F = FOTO, L = F.lupa, g = dye.g || 0, osc = sim.st === "tranzitie" ? 0.28 * g + 0.06 : 0;
  const XT = x => F.tubA[0] + x * (F.tubB[0] - F.tubA[0]), XL = x => L.a + x * (L.b - L.a);
  const und = x => osc * Math.min(1, x / 0.45) * Math.sin(2 * Math.PI * (3.2 * x - 0.9 * dye.t));
  for (let i = 0; i < NP; i++) {
    const q = dye.p[i], a = SV.lT[i], b = SV.lL[i];
    if (!q) { if (a._v) { a.setAttribute("opacity", 0); b.setAttribute("opacity", 0); a._v = 0; } continue; }
    const dx = Math.max(0.004, (q.u || 0) * (q.sp || 0.02) * 1.7 / VIZ_L), r1 = Math.max(-0.95, Math.min(0.95, q.r + und(q.x))), r0 = Math.max(-0.95, Math.min(0.95, q.r + und(q.x - dx)));
    const x0 = Math.max(0, q.x - dx), x1 = Math.min(1, q.x);
    const xa = XT(x0), xb = XT(x1);
    a.setAttribute("x1", xa); a.setAttribute("x2", xb); a.setAttribute("y1", tubY(xa) + r0 * F.R); a.setAttribute("y2", tubY(xb) + r1 * F.R);
    b.setAttribute("x1", XL(x0)); b.setAttribute("x2", XL(x1)); b.setAttribute("y1", L.yc + r0 * L.R); b.setAttribute("y2", L.yc + r1 * L.R);
    const op = Math.abs(q.r) > 0.3 ? 0.55 : 0.92; a.setAttribute("opacity", op); b.setAttribute("opacity", op); a._v = 1;
  }
  // norul de colorant dispersat
  const zone = !dye.p.length ? [] : sim.st === "turbulent" ? [[0.05, dye.front, 0.4]] : sim.st === "tranzitie" ? dye.puf.map(f => [Math.max(0.02, f.x - f.L), Math.min(dye.front, f.x), 0.32]) : [];
  for (let k = 0; k < 5; k++) {
    const z = zone[k], a = SV.nT[k], b = SV.nL[k];
    if (!z || z[1] <= z[0]) { a.setAttribute("opacity", 0); b.setAttribute("opacity", 0); continue; }
    const xa = XT(z[0]), xb = XT(z[1]);
    a.setAttribute("x", xa); a.setAttribute("width", xb - xa); a.setAttribute("y", tubY(xa) - F.R); a.setAttribute("height", 2 * F.R); a.setAttribute("opacity", z[2]);
    b.setAttribute("x", XL(z[0])); b.setAttribute("width", XL(z[1]) - XL(z[0])); b.setAttribute("opacity", z[2] * 1.4);
  }
}
function actualizeazaSVG() {
  if (!SV.g) return;
  const F = FOTO, Z = F.rez, p = P(), q = Q();
  const fUmpl = sim.plin ? 1 : sim.alim ? Math.min(1, (sim.tUmpl || 0) / 20) : (sim.tUmpl ? Math.min(1, sim.tUmpl / 20) : 0);
  const yN = Z.jos - fUmpl * (Z.jos - Z.sus);
  SV.rezApa.setAttribute("y", yN); SV.rezApa.setAttribute("height", Z.jos - yN); SV.rezNiv.setAttribute("y1", yN); SV.rezNiv.setAttribute("y2", yN); SV.rezNiv.setAttribute("opacity", fUmpl > 0.02 ? 0.8 : 0);
  SV.jet.setAttribute("d", sim.alim ? `M284 268 C 285 ${268 + 10}, 286 ${yN - 20}, 287 ${yN}` : "");
  SV.manAlim.setAttribute("transform", `translate(214,388) rotate(${sim.alim ? 0 : -90})`);
  const hC = 60 * Math.max(0, sim.nivColorant); SV.colLiq.setAttribute("y", 139 - hC); SV.colLiq.setAttribute("height", hC);
  SV.manColo.setAttribute("transform", `translate(325,152) rotate(${sim.colorant ? 90 : 0})`);
  const curge = sim.colorant && q > 0 && sim.nivColorant > 0;
  SV.ac.setAttribute("opacity", sim.colorant && sim.nivColorant > 0 ? 0.9 : 0); SV.acL.setAttribute("opacity", curge ? 0.9 : 0);
  const T = sim.plin || sim.tUmpl ? p.T : 18; SV.termCol.setAttribute("y", 412 - T * 3.6); SV.termCol.setAttribute("height", 420 - (412 - T * 3.6));
  SV.termTxt.textContent = sim.plin ? `T = ${fx(p.T, 1)} °C` : "T = — °C";
  SV.aTxt.textContent = `a = ${fx(sim.a, 1)} %`;
  // furtunul: în vas (colectare) sau la scurgere
  const end = sim.colectare ? [1306, 612] : [1430, 628];
  const d = sim.colectare ? `M1231 470 C 1268 474, 1296 500, 1302 548 S 1306 600, ${end[0]} ${end[1]}` : `M1231 470 C 1268 474, 1310 488, 1360 520 S 1428 590, ${end[0]} ${end[1]}`;
  SV.furtun.setAttribute("d", d); SV.furtunC.setAttribute("d", d);
  const yJ = sim.colectare ? F.vas.jos - Math.min(1.05, sim.Vvas) * (F.vas.jos - F.vas.l1) : 662;
  SV.jetIes.setAttribute("d", q > 0 ? `M${end[0]} ${end[1] + 4} L${end[0] + 1} ${yJ}` : ""); SV.jetIes.setAttribute("stroke-width", 1.5 + 30 * Math.sqrt(q));
  const hV = Math.min(1.08, sim.Vvas) * (F.vas.jos - F.vas.l1); SV.vasApa.setAttribute("y", F.vas.jos - hV); SV.vasApa.setAttribute("height", Math.max(0, hV - 2));
  SV.vasTxt.textContent = `${fx(Vcitit(), 2)} L`;
  const t = sim.crono, m = Math.floor(t / 60);
  SV.cronoTxt.textContent = `${m}:${(t - m * 60).toFixed(2).padStart(5, "0").replace(".", ",")}`;
  SV.cronoLed.setAttribute("fill", sim.cronoMerge ? "#43ff5a" : "#3a3a3a");
  SV.lupaSt.textContent = !sim.colorant ? "colorantul închis" : q <= 0 ? "apa nu curge" : sim.nivColorant <= 0 ? "vasul de colorant gol" : `firul: ${NUME_ST[sim.st].split(" – ")[0]}`;
}

/* ------------------------------------------------------------------ comenzi, afișaje, graficul V(t) */
function actualizeazaButoane() {
  const bc = $("#b-col"); if (!bc) return;
  bc.textContent = sim.colectare ? "■ Stop colectare (furtunul la scurgere + cronometrul)" : "▶ Start colectare (furtunul în vas + cronometrul)"; bc.classList.toggle("activ", sim.colectare);
  const bo = $("#b-colo"); bo.textContent = sim.colorant ? "Închide robinetul colorantului" : "Deschide robinetul colorantului"; bo.classList.toggle("activ", sim.colorant);
  const ba = $("#b-alim"); ba.textContent = sim.alim ? "Închide alimentarea" : "Deschide alimentarea"; ba.classList.toggle("activ", sim.alim);
  $$(".af-a").forEach(el => el.textContent = `deschidere ${fx(sim.a, 1)} %`);
  const ns = $("#nota-stand");
  if (ns) ns.textContent = !sim.alim && !sim.plin ? "Rezervorul este gol. Deschideți alimentarea (robinetul albastru)." : !sim.plin ? "Rezervorul se umple până la preaplin…" :
    `Rezervorul plin, nivel constant. Repausul apei: ${fx(Math.min(sim.tRep, 900) / 60, 1)} min${sim.tRep >= 300 ? " (apa liniștită)" : " – recomandat 5…10 min cu robinetul de reglare închis"}.`;
}
function afisaje() {
  const s = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  s("#af-T", sim.plin ? fx(P().T, 1) : "—"); s("#af-a", fx(sim.a, 1)); s("#af-V", fx(Vcitit(), 2)); s("#af-t", fx(sim.crono, 2));
  const f = $("#fir"); if (f) f.textContent = !sim.colorant ? "Colorantul este închis." : Q() <= 0 ? "Apa nu curge prin tub." : sim.nivColorant <= 0 ? "Vasul de colorant s-a golit." : `Firul de colorant: ${NUME_ST[sim.st].split(" – ")[0]}.`;
}
function deseneazaLive() {
  const cv = $("#cv-live"); if (!cv || !cv.getClientRects().length) return;
  const curbe = (sim.curbe || []).slice(-4), tmax = Math.max(30, ...curbe.map(c => c.pts.length ? c.pts[c.pts.length - 1][0] : 0));
  const xm = Math.ceil(tmax / 10) * 10;
  const serii = curbe.map((c, i) => ({ tip: "linie", pts: c.pts, culoare: i, gros: c === sim.curba ? 2.6 : 1.6 }));
  deseneazaGrafic(cv, { xmin: 0, xmax: xm, ymin: 0, ymax: 1.1, yticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0], xlab: "t [s] (cronometrul)", ylab: "V în vasul gradat [L]", serii });
}
function sincron3d() {
  if (!SV3 && Cadru.anim && Cadru.anim.seteaza) SV3 = Cadru.anim;
  if (!SV3) return; const p = P();
  SV3.seteaza({ v: Q() / 1000 / (Math.PI * 0.0001 / 4), st: sim.st, gamma: MD.gamma(p, reAdev(), sim.st), colorant: sim.colorant && Q() > 0, alim: sim.alim, a: sim.a, colectare: sim.colectare, Vvas: sim.Vvas, crono: sim.crono, T: p.T, nivColorant: sim.nivColorant });
}
const VEDERI = { tot: [[0.1, 0.85, 2.0], [0.0, 0.25, 0.0]], intrare: [[-0.38, 0.36, 0.22], [-0.42, 0.3, 0.0]], tub: [[-0.1, 0.36, 0.3], [-0.1, 0.3, 0.0]], vas: [[0.55, 0.3, 0.55], [0.55, 0.1, 0.15]] };
function vedere3d(v) { sincron3d(); if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function actualizeaza() { afisaje(); actualizeazaSVG(); sincron3d(); actualizeazaButoane(); }
function laClic3d(k) {
  if (k === "alim") return comutaAlim();
  if (k === "robColorant" || k === "colorant") return comutaColorant();
  if (k === "robinet") return seteazaA(sim.a + 1);
  if (k === "crono" || k === "vas") return startColectare();
  const et = { rezervor: "Rezervorul de nivel constant: preaplinul menține sarcina constantă; grila liniștește apa.", termometru: `Termometrul: ${sim.plin ? fx(P().T, 1) + " °C" : "rezervorul este gol"}.`, tub: "Tubul de sticlă: d = 10 mm interior, intrare profilată (fără desprinderi la intrare)." }[k];
  if (et) Cadru.mesajTemporar(et, "");
}

/* ------------------------------------------------------------------ calcule */
function calculeazaMF5(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), F = Number.isFinite, cel = { t50: {}, t52: {}, t52b: {}, t53: {} }, rele = { t52: {} };
  cel.t50.T = { nu: F(o.nu) ? fx(o.nu, 3) : "" };
  const reg = re => re < 2300 ? "laminar" : re < 4000 ? "tranziție" : "turbulent";
  for (let i = 1; i <= 8; i++) { const r = o.rand["r" + i]; cel.t52["r" + i] = { Q: F(r.Q) ? fx(r.Q, 4) : "", v: F(r.v) ? fx(r.v, 3) : "", Re: F(r.Re) ? fx(r.Re, 0) : "", calc: F(r.Re) ? reg(r.Re) : "" };
    const asp = t.t52["r" + i].asp, rc = F(r.Re) ? reg(r.Re) : "", ia = MD.ASPECT.indexOf(asp); rele.t52["r" + i] = { calc: ia >= 0 && !!rc && ["laminar", "tranziție", "turbulent"][ia] !== rc }; }
  ["sus1", "sus2", "jos"].forEach(k => { const r = o.crit[k]; cel.t52b[k] = { Q: F(r.Q) ? fx(r.Q, 4) : "", v: F(r.v) ? fx(r.v, 3) : "", Re: F(r.Re) ? fx(r.Re, 0) : "" }; });
  MD.AUTO.forEach(x => { cel.t53[x.k] = { d: x.d, v: String(x.v).replace(".", ","), nu: String(x.nu).replace(".", ",") }; });
  const rez = [["ν(T) din Tabelul 5.1", F(o.nu) ? `${fx(o.nu, 3)} mm²/s la ${fx(o.T, 1)} °C` : "—"], ["Re critic superior (începutul oscilației)", F(o.crit.sus1.Re) ? `<span style="color:var(--accent)">${fx(o.crit.sus1.Re, 0)}</span>` : "—"],
    ["Re la amestecul complet", F(o.crit.sus2.Re) ? fx(o.crit.sus2.Re, 0) : "—"], ["Re critic inferior (redevine laminar)", F(o.crit.jos.Re) ? `<span style="color:var(--accent)">${fx(o.crit.jos.Re, 0)}</span>` : "—"]];
  const verdicte = [];
  if (F(o.crit.sus1.Re) && F(o.crit.jos.Re)) verdicte.push({ tip: "ok", text: `Histerezis: Re critic la creșterea debitului (${fx(o.crit.sus1.Re, 0)}) este mai mare decât la scădere (${fx(o.crit.jos.Re, 0)}) – regimul laminar persistă instabil în lipsa perturbațiilor.` });
  const pts = [1, 2, 3, 4, 5, 6, 7, 8].map(i => o.rand["r" + i]).filter(r => F(r.Re)).map((r, j) => [r.Re, j + 1]);
  return { celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Determinările pe axa numărului Reynolds (zone: laminar < 2300 < tranziție < 4000 < turbulent)",
    grafic: { xmin: 0, xmax: Math.max(8000, ...pts.map(p => p[0] * 1.1)), ymin: 0, ymax: 9, xlab: "Re", ylab: "determinarea", serii: [{ tip: "linie", pts: [[2300, 0], [2300, 9]], culoare: 1, punctat: true }, { tip: "linie", pts: [[4000, 0], [4000, 9]], culoare: 3, punctat: true }, { tip: "pct", pts, culoare: 0, r: 5 }] },
    legenda: [["determinări", "var(--serie-0)", "pct"], ["Re = 2300", "var(--serie-1)"], ["Re = 4000", "var(--serie-3)"]], principal: { eticheta: "Re critic superior", valoare: F(o.crit.sus1.Re) ? Math.round(o.crit.sus1.Re) : null } };
}

/* ------------------------------------------------------------------ conținut */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Aparatul se alimentează de la rețeaua de apă sau de la bancul hidraulic numai în prezența cadrului didactic; robinetele se manevrează lent.</li>
<li>Tubul de sticlă al aparatului nu se lovește și nu se strânge excesiv în suporturi; la spargere se oprește alimentarea și se anunță cadrul didactic.</li>
<li>Colorantul (fluoresceină sau permanganat de potasiu diluat) se manipulează cu mănuși; nu se varsă pe piele sau pe haine.</li>
<li>Apa scursă se șterge imediat; aparatura electrică a bancului hidraulic nu se atinge cu mâinile ude.</li></ul></div>
<h2>5.1. Scopul lucrării</h2>
<p>Vizualizarea regimurilor de curgere laminar, de tranziție și turbulent, determinarea numărului Reynolds critic și aplicarea criteriului Reynolds la curgerile din sistemele autovehiculului: ungere, răcire, alimentare cu combustibil și admisia aerului.</p>
<h2>5.2. Noțiuni teoretice</h2>
<p>Osborne Reynolds (1883) a arătat că într-o conductă există două regimuri de curgere. În regimul laminar particulele se deplasează în straturi paralele, iar un fir de colorant rămâne o linie subțire; în regimul turbulent apar fluctuații de viteză și vârtejuri, iar colorantul se amestecă rapid în toată secțiunea (Fig. 5.1). Regimul este dat de numărul Reynolds, raportul dintre forțele de inerție și cele de vâscozitate:</p>
<div class="ec"><span>Re = v·d/ν = ρ·v·d/η</span><span class="nr">(5.1)</span></div>
<div class="ec"><span>v = Q/A = 4·Q/(π·d²)</span><span class="nr">(5.2)</span></div>
<figure><img src="img/fig5_1.jpg" alt="Fig. 5.1" loading="lazy"><figcaption>Fig. 5.1. Aparatul Reynolds: firul de colorant în regim laminar și turbulent</figcaption></figure>
<p>Pentru conducte circulare: Re &lt; 2300 – regim laminar; 2300 &lt; Re &lt; 4000 – regim de tranziție (instabil); Re &gt; 4000 – regim turbulent. Valoarea critică poate crește mult (până la 10⁴ și peste) dacă intrarea este foarte netedă și apa este perfect liniștită, dar regimul laminar redevine stabil numai sub ≈ 2300. Pentru secțiuni necirculare (canale de răcire, galerii de ulei) se folosește diametrul hidraulic d<sub>h</sub> = 4·A/P, unde P este perimetrul udat.</p>
<p>Regimul determină distribuția vitezelor în secțiune (Fig. 5.2): în regim laminar profilul este parabolic, cu viteza maximă egală cu dublul vitezei medii; în regim turbulent profilul este aplatizat, iar viteza maximă este cu doar 15…25 % mai mare decât cea medie. Tot regimul determină pierderile de sarcină (lucrarea 6) și transferul de căldură (mult mai intens în regim turbulent).</p>
<figure><img src="img/fig5_2.jpg" alt="Fig. 5.2" loading="lazy"><figcaption>Fig. 5.2. Distribuția vitezelor în regim laminar și turbulent</figcaption></figure>
<p>Vâscozitatea cinematică a apei scade cu temperatura (Tabelul 5.1), deci la același debit numărul Reynolds crește când apa se încălzește; efectul este mult mai puternic la ulei (lucrarea 1).</p>
<h3>Tabelul 5.1. Vâscozitatea cinematică a apei</h3>
<div class="tabel-scroll"><table class="tabel"><thead><tr><th>t [°C]</th>${MD.TNU.map(r => `<th>${r[0]}</th>`).join("")}</tr></thead><tbody><tr><td>ν [mm²/s]</td>${MD.TNU.map(r => `<td>${String(r[1]).replace(".", ",")}</td>`).join("")}</tr></tbody></table></div>
<h2>5.4. Modul de lucru (în simulator)</h2>
<ol><li>Alimentarea, repausul 5–10 min, temperatura apei.</li><li>Regim laminar: colorant, debit mic, V și t.</li><li>Creșterea lentă a debitului: începutul oscilației, amestecul complet; determinări în tranziție și turbulent.</li><li>Scăderea lentă: revenirea la laminar.</li><li>Tabelul 5.3: Re pentru curgerile din autovehicul.</li></ol>
<h2>5.7. Interpretarea rezultatelor</h2>
<ul><li>Regimul observat se compară cu cel prezis de numărul Reynolds; tranziția apare de obicei între 2000 și 4000, în funcție de perturbațiile de la intrare.</li>
<li>Re critic la creșterea debitului este mai mare decât la scăderea lui, deoarece regimul laminar poate persista instabil dacă nu există perturbații.</li>
<li>Se explică de ce uleiul curge laminar în galerii (vâscozitate mare), iar lichidul de răcire și aerul curg turbulent.</li>
<li>Se discută influența temperaturii: încălzirea apei cu 10 °C crește Re cu ≈ 20–30 %, iar încălzirea uleiului de la 20 la 100 °C crește Re de ≈ 15 ori.</li></ul>
<h2>5.8. Relevanță practică</h2>
<p>Regimul de curgere stabilește modul de calcul al pierderilor de presiune și al transferului de căldură. Canalele de răcire ale plăcilor de răcire din bateriile de tracțiune ale vehiculelor electrice au diametre hidraulice mici și pot lucra la numere Reynolds de câteva sute, în regim laminar, cu transfer de căldură redus – de aceea se folosesc nervuri sau turbulatoare. În admisia motorului, regimul turbulent și profilul de viteză influențează precizia debitmetrului de aer cu film cald, montat de aceea după o porțiune dreaptă sau după o grilă de liniștire.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>d = 10 mm, apă la 20 °C (ν = 1,004 mm²/s). Determinarea 1: 0,5 L în 60 s; determinarea 2: 1,0 L în 20 s.</p>
<div class="ec"><span>A = π·0,01²/4 = 7,854·10<sup>−5</sup> m²</span><span class="nr">(5.3)</span></div>
<div class="ec"><span>Q<sub>1</sub> = 0,5·10<sup>−3</sup>/60 = 8,33·10<sup>−6</sup> m³/s; v<sub>1</sub> = 0,106 m/s</span><span class="nr">(5.4–5.5)</span></div>
<div class="ec"><span>Re<sub>1</sub> = 0,106·0,01/(1,004·10<sup>−6</sup>) = 1057 (laminar)</span><span class="nr">(5.6)</span></div>
<div class="ec"><span>v<sub>2</sub> = 5·10<sup>−5</sup>/7,854·10<sup>−5</sup> = 0,637 m/s; Re<sub>2</sub> = 6340 (turbulent)</span><span class="nr">(5.7–5.8)</span></div>
<p>Pentru ulei în galeria principală (d = 8 mm, v = 2 m/s): la 0 °C Re = 28, iar la 100 °C Re = 1455 – regimul rămâne laminar. Pentru lichidul de răcire în furtun (d = 32 mm, v = 1,5 m/s, ν = 0,8 mm²/s) Re = 60 000 – turbulent. În tubulatura de admisie (d = 70 mm, v = 30 m/s, ν = 15 mm²/s) Re = 140 000.</p>
<div class="problema"><h3>Problema 1</h3><p>Calculați diametrul hidraulic al unui canal dreptunghiular de 4 × 20 mm și Re pentru lichid de răcire la v = 0,8 m/s, ν = 0,8 mm²/s.</p><details class="sol"><summary>Rezolvare</summary><p>d<sub>h</sub> = 4·80/48 = 6,67 mm; Re = 0,8·0,00667/0,8·10<sup>−6</sup> = 6670 – turbulent.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Ce debit (L/min) corespunde lui Re = 2300 în tubul de 10 mm, cu apă la 15 °C?</p><details class="sol"><summary>Rezolvare</summary><p>v = 2300·1,139·10<sup>−6</sup>/0,01 = 0,262 m/s; Q = 0,262·7,854·10<sup>−5</sup> = 2,06·10<sup>−5</sup> m³/s = 1,23 L/min.</p></details></div>`;
}
const INTREBARI = [
  ["Ce reprezintă fizic numărul Reynolds?", "Raportul dintre forțele de inerție și forțele de vâscozitate (ρv²/d raportat la ηv/d²); la Re mic vâscozitatea amortizează perturbațiile (laminar), la Re mare inerția le amplifică (turbulent)."],
  ["Care sunt valorile critice ale numărului Reynolds pentru conducte circulare?", "Re ≈ 2300 – sub această valoare regimul laminar este stabil; 2300…4000 – tranziție; peste 4000 – turbulent. Re critic superior poate fi mult mai mare la intrare netedă și apă liniștită."],
  ["Cum se calculează diametrul hidraulic pentru un canal dreptunghiular de 4 × 20 mm?", "d<sub>h</sub> = 4A/P = 4·80/(2·(4 + 20)) = 6,67 mm."],
  ["De ce uleiul rece curge laminar în galeriile motorului?", "Vâscozitatea uleiului rece este foarte mare (ν ≈ 170…570 mm²/s), deci Re = v·d/ν este de ordinul zecilor – mult sub 2300."],
  ["De ce regimul turbulent favorizează răcirea?", "Fluctuațiile de viteză amestecă fluidul în secțiune, subțiază stratul limită termic de lângă perete și cresc coeficientul de transfer de căldură (Nu ~ Re<sup>0,8</sup>)."]
];
const TEST = [
  { q: "Re pentru v = 0,106 m/s, d = 10 mm, ν = 1,004 mm²/s este:", o: ["106", "1057", "10 570", "2300"], c: 1, e: "0,106·0,01/1,004·10⁻⁶." },
  { q: "În regim laminar viteza maximă în axă este:", o: ["egală cu viteza medie", "dublul vitezei medii", "cu 20 % mai mare", "jumătate din medie"], c: 1, e: "Profil parabolic." },
  { q: "Diametrul hidraulic al unui canal 4 × 20 mm este:", o: ["4 mm", "6,67 mm", "12 mm", "20 mm"], c: 1, e: "4A/P." },
  { q: "La încălzirea apei de la 10 la 20 °C, la același debit, Re:", o: ["scade", "crește cu ≈ 30 %", "nu se schimbă", "se dublează"], c: 1, e: "ν scade de la 1,306 la 1,004 mm²/s." },
  { q: "Re critic la creșterea debitului față de cel la scădere este:", o: ["mai mic", "mai mare", "egal", "nedefinit"], c: 1, e: "Histerezis – laminarul persistă fără perturbații." }
];
const CSS = `<style>
#svg-reynolds { width:100%; height:auto; display:block; border-radius:10px; background:#e9edf0; }
.mf5-vederi { display:flex; flex-wrap:wrap; gap:.3rem; margin:.5rem 0 0; } .mf5-vederi button { font-size:.8rem; padding:.2rem .55rem; }
#b-col.activ, #b-colo.activ, #b-alim.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); }
.sim-comenzi button.lat { margin-top:.3rem; }
</style>`;
Cadru.porneste({
  disc: "MF", nr: 5, cod: "mf-l5",
  titlu: "Regimuri de curgere. Experiența lui Reynolds",
  scurt: "Experiența lui Reynolds",
  subtitlu: "Laborator virtual – aparatul Reynolds: firul de colorant în regim laminar, de tranziție și turbulent, numărul Reynolds critic superior și inferior",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261025); },
  date: [{ k: "d", et: "d tub [mm]", v: 10, fix: true }, { k: "V", et: "Vasul gradat [L]", v: 1, fix: true }],
  tabele: [
    { id: "t50", titlu: "Tabelul 5.0. Temperatura apei", antetRand: "", randuri: [{ k: "T", et: "Temperatura apei [°C]" }], coloane: [{ k: "v", t: "Valoare", intrare: true }, { k: "nu", t: "ν (Tabelul 5.1) [mm²/s]" }] },
    { id: "t52", titlu: "Tabelul 5.2. Determinări", antetRand: "Nr.", nota: "Q = V/t; v = 4Q/(πd²); Re = v·d/ν (d = 10 mm, ν la temperatura apei). Regimul calculat se compară cu aspectul observat.",
      randuri: [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ k: "r" + i, et: String(i) })),
      coloane: [{ k: "V", t: "V [L]", intrare: true }, { k: "t", t: "t [s]", intrare: true }, { k: "Q", t: "Q [L/s]" }, { k: "v", t: "v [m/s]" }, { k: "Re", t: "Re" }, { k: "asp", t: "Aspectul firului / regim", intrare: true, tip: "select", optiuni: MD.ASPECT }, { k: "calc", t: "Regim după Re" }] },
    { id: "t52b", titlu: "Tabelul 5.2b. Punctele critice", antetRand: "Punct", randuri: [{ k: "sus1", et: "Firul începe să oscileze (debit crescător)" }, { k: "sus2", et: "Colorantul se amestecă în toată secțiunea (crescător)" }, { k: "jos", et: "Firul redevine linie (debit descrescător)" }],
      coloane: [{ k: "V", t: "V [L]", intrare: true }, { k: "t", t: "t [s]", intrare: true }, { k: "Q", t: "Q [L/s]" }, { k: "v", t: "v [m/s]" }, { k: "Re", t: "Re" }] },
    { id: "t53", titlu: "Tabelul 5.3. Numărul Reynolds în sistemele autovehiculului", antetRand: "Curgere", randuri: MD.AUTO.map(x => ({ k: x.k, et: x.et })),
      coloane: [{ k: "d", t: "d [mm]" }, { k: "v", t: "v [m/s]" }, { k: "nu", t: "ν [mm²/s]" }, { k: "Re", t: "Re", intrare: true }, { k: "reg", t: "Regim", intrare: true, tip: "select", optiuni: ["laminar", "tranziție", "turbulent"] }] }
  ],
  inaltimeGrafic: 260,
  calculeaza: calculeazaMF5,
  intrebari() {
    return [
      { id: "q1", u: "", text: "Re critic superior (firul începe să oscileze, Tabelul 5.2b):", textSimplu: "Re critic superior" },
      { id: "q2", u: "", text: "Re critic inferior (firul redevine linie, Tabelul 5.2b):", textSimplu: "Re critic inferior" },
      { id: "q3", u: "", text: "Re pentru uleiul din galeria principală la 100 °C (d = 8 mm, v = 2 m/s, ν = 11 mm²/s):", textSimplu: "Re ulei 100 °C" },
      { id: "q4", u: "mm", text: "Diametrul hidraulic al unui canal dreptunghiular de 4 × 20 mm:", textSimplu: "diametrul hidraulic 4 × 20 mm" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t; if (t.t50.T.v === "") l.push("Tabelul 5.0: temperatura");
    const n = [1, 2, 3, 4, 5, 6, 7, 8].filter(i => t.t52["r" + i].V !== "").length; if (n < 6) l.push(`Tabelul 5.2: ${n}/6 determinări`);
    ["sus1", "sus2", "jos"].forEach(k => { if (t.t52b[k].V === "") l.push(`Tabelul 5.2b: ${k}`); });
    const m = MD.AUTO.filter(x => t.t53[x.k].Re !== "").length; if (m < 6) l.push(`Tabelul 5.3: ${m}/6`);
    return l;
  },
  exemplu(D) { const t = D.t; t.t50.T.v = "20"; Object.assign(t.t52.r1, { V: "0.5", t: "60" }); Object.assign(t.t52.r2, { V: "1.0", t: "20" }); },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Curgerile din autoturism: ulei, lichid de răcire, aer",
    intro: `<p>Uleiul din galeriile motorului curge laminar (vâscozitate mare), lichidul de răcire și aerul din admisie – turbulent. Debitmetrul de aer cu film cald (MAF) este montat după o porțiune dreaptă, pentru un profil de viteze stabil. Selectați debitmetrul în machetă.</p>`,
    dupa: `<p class="nota">Macheta este comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "maf" })
  },
  referat: {
    scop: "Vizualizarea regimurilor de curgere, determinarea numărului Reynolds critic superior și inferior și aplicarea criteriului Reynolds la curgerile din autovehicul.",
    relatii: "Re = v·d/ν; &nbsp; v = 4Q/(πd²); &nbsp; d<sub>h</sub> = 4A/P.",
    varianta: () => "Aparatul propriu fiecărui student: temperatura apei, diametrul real al tubului, caracteristica robinetului, Re critic superior și inferior.",
    indicatii: "Comparați regimul observat cu cel calculat, discutați histerezisul tranziției, influența temperaturii și a perturbațiilor și regimurile din sistemele autovehiculului…"
  },
  subsol: "Modelul: debitul în funcție de deschiderea robinetului, ν(T) din Tabelul 5.1, tranziția cu histerezis (Re critic superior dependent de liniștirea apei, Re critic inferior ≈ 2000…2250), cronometrare manuală cu eroare. Vizualizarea: particule de colorant transportate cu profilul de viteze parabolic / turbulent și perturbate după regim.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  animatie: {
    titluTab: "Aparatul (3D)", titlu: "Aparatul Reynolds – modelul 3D",
    intro: `<p>Același aparat, în 3D: rotiți cu mouse-ul, rotița = zoom. Starea (alimentarea, robinetul, colorantul, colectarea) este cea din simulator. Clic pe robinetul albastru (alimentare), pe cel verde (colorant), pe roata robinetului de reglare (+1 %) sau pe cronometru.</p>`,
    modul: "aparate3d.js?v=10", functie: "creeazaReynolds", optiuni: { laClic: k => laClic3d(k) },
    dupa: `<div class="mf5-vederi"><span class="nota">Vedere:</span>${[["tot", "Ansamblu"], ["intrare", "Intrarea și acul de colorant"], ["tub", "Tubul (firul de colorant)"], ["vas", "Vasul gradat și cronometrul"]].map(([k, t]) => `<button type="button" data-v3="${k}">${t}</button>`).join("")}</div>`
  },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena scena-foto">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <svg id="svg-reynolds" viewBox="0 0 1536 790" role="img" aria-label="Aparatul Reynolds: rezervor de nivel constant cu alimentare și termometru, vas de colorant cu ac injector, tub de sticlă d = 10 mm, robinet de reglare, furtun de ieșire, vas gradat de 1 L și cronometru; în partea de sus, tubul văzut de aproape cu firul de colorant"></svg>
      <div class="afisaje">
        <div class="afisaj"><span>Temperatura apei</span><b id="af-T">—</b><small>°C (termometru)</small></div>
        <div class="afisaj"><span>Robinet de reglare</span><b id="af-a">0,0</b><small>% deschidere</small></div>
        <div class="afisaj"><span>Vas gradat</span><b id="af-V">0,00</b><small>L (citit pe gradații)</small></div>
        <div class="afisaj"><span>Cronometru</span><b id="af-t">0,00</b><small>s</small></div>
      </div>
      <p class="nota" id="fir" aria-live="polite"></p>
      <div class="grafic-mic"><canvas id="cv-live" height="220" aria-label="Volumul colectat în vasul gradat în funcție de timp, pentru ultimele colectări"></canvas></div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-man"> Mănuși de protecție (colorantul: permanganat de potasiu diluat)</label>
      <label class="bifa"><input type="checkbox" id="ck-nssm2"> Tubul de sticlă fixat în suporți, fără lovituri; apa scursă se șterge imediat</label>
      <h2>Aparatul vostru</h2>
      <p class="nota" id="nota-stand"></p>
      <div class="rand-butoane"><button type="button" id="b-alim">Deschide alimentarea</button></div>
      <label class="bifa"><input type="checkbox" id="ck-rapid"> Timp accelerat ×10 (umplerea și repausul; nu și colectarea)</label>
      <button type="button" class="lat" id="b-T">● Temperatura apei → Tabelul 5.0</button>
      <h2>Robinetul de reglare</h2>
      <p class="nota">Manevrați lent (câte 0,5…1 %) și așteptați câteva secunde după fiecare pas. Taste ↑ ↓ = ±0,5 % (Shift = ±5 %).</p>
      <div class="roata-butoane">
        <button type="button" data-da="-5">−5</button><button type="button" data-da="-1">−1</button><button type="button" data-da="-0.5">−0,5</button>
        <button type="button" data-da="0.5">+0,5</button><button type="button" data-da="1">+1</button><button type="button" data-da="5">+5</button>
      </div>
      <p class="nota"><b class="af-a"></b></p>
      <h2>Colorantul</h2>
      <button type="button" id="b-colo">Deschide robinetul colorantului</button>
      <label class="camp">Aspectul firului observat<select id="sel-asp"><option value=""></option>${MD.ASPECT.map(a => `<option>${a}</option>`).join("")}</select></label>
      <h2>Măsurarea volumetrică</h2>
      <div class="rand-butoane"><button type="button" id="b-col">▶ Start colectare</button><button type="button" id="b-gol">Golește vasul</button></div>
      <h2>Înregistrare</h2>
      <button type="button" class="primar lat" id="b-rand">● V, t și aspectul → Tabelul 5.2</button>
      <button type="button" class="lat" id="b-sus1">● Firul începe să oscileze (crescător) → Tab. 5.2b</button>
      <button type="button" class="lat" id="b-sus2">● Amestec în toată secțiunea (crescător) → Tab. 5.2b</button>
      <button type="button" class="lat" id="b-jos">● Firul redevine linie (descrescător) → Tab. 5.2b</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari"><summary>Afișare</summary>
        <label class="bifa"><input type="checkbox" id="ck-et" checked> Etichete pe fotografie</label>
        <label class="bifa"><input type="checkbox" id="ck-lupa" checked> Tubul văzut de aproape (lupa)</label>
      </details>
    </aside>
  </div>`,
    init(C) {
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      construiesteSVG();
      $("#ck-man").addEventListener("change", e => { sim.manusi = e.target.checked; actualizeaza(); });
      $("#ck-nssm2").addEventListener("change", e => { sim.nssm2 = e.target.checked; });
      $("#ck-rapid").addEventListener("change", e => { sim.viteza = e.target.checked ? 10 : 1; });
      $("#b-alim").addEventListener("click", comutaAlim);
      $("#b-T").addEventListener("click", inregT);
      $$("[data-da]").forEach(b => b.addEventListener("click", () => seteazaA(sim.a + +b.dataset.da)));
      $("#b-colo").addEventListener("click", comutaColorant);
      $("#b-col").addEventListener("click", startColectare);
      $("#b-gol").addEventListener("click", golesteVas);
      $("#b-rand").addEventListener("click", inregRand);
      $("#b-sus1").addEventListener("click", e => inregCrit(e, "sus1"));
      $("#b-sus2").addEventListener("click", e => inregCrit(e, "sus2"));
      $("#b-jos").addEventListener("click", e => inregCrit(e, "jos"));
      $("#ck-et").addEventListener("change", e => { sim.etichete = e.target.checked; SV.et.style.display = sim.etichete ? "" : "none"; });
      $("#ck-lupa").addEventListener("change", e => { SV.lupa.style.display = e.target.checked ? "" : "none"; });
      document.addEventListener("click", e => { const b = e.target.closest("[data-v3]"); if (b) vedere3d(b.dataset.v3); });
      document.addEventListener("keydown", e => {
        if (!$("#tab-sim").classList.contains("activ") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); seteazaA(sim.a + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 5 : 0.5)); }
      });
      actualizeaza();
      C.mesaj("Bifați NSSM, deschideți alimentarea, lăsați apa în repaus 5–10 minute, citiți temperatura; apoi colorantul și robinetul de reglare, foarte puțin.", "");
    },
    reset() { Object.assign(sim, { alim: false, plin: false, tUmpl: 0, tRep: 0, a: 0, aEf: 0, st: "laminar", colorant: false, colectare: false, cronoMerge: false, Vvas: 0, crono: 0, curbe: [], curba: null }); dye.p = []; dye.puf = []; if (SV.g) actualizeaza(); },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * (sim.colectare ? 1 : sim.viteza);
      sim.t += dt;
      if (sim.alim) { if (!sim.plin) { sim.tUmpl = (sim.tUmpl || 0) + dt; if (sim.tUmpl > 20) sim.plin = true; } else if (sim.a < 0.5) sim.tRep += dt; }
      sim.aEf += (sim.a - sim.aEf) * (1 - Math.exp(-dt / 1.2));
      actualizeazaRegim(); if (sim.colectare && sim.st !== sim.stColectare) sim.stMix = true;
      if (sim.colorant && Q() > 0) sim.nivColorant = Math.max(0, sim.nivColorant - dt / 3000);
      if (sim.colectare) {
        sim.tAdev += h; sim.Vvas += Q() * h; sim.crono = sim.tAdev;
        if (sim.curba && sim.tAdev - (sim.curba.pts[sim.curba.pts.length - 1] || [0])[0] >= 0.25) sim.curba.pts.push([sim.tAdev, sim.Vvas]);
        if (sim.Vvas > 1.02) { opresteColectare(); C.mesajTemporar("Vasul gradat s-a umplut (1 L): colectarea a fost oprită.", "atentie"); }
      }
      miscaColorant(h);
      const now = performance.now();
      if (C.tabActiv === "anim" && now - (this._t3 || 0) > 120) { this._t3 = now; sincron3d(); }
      if (!vizibil) return;
      deseneazaColorant();
      if (now - (this._td || 0) > 100) { this._td = now; afisaje(); actualizeazaSVG(); }
      if (now - (this._ts || 0) > 400) { this._ts = now; actualizeazaButoane(); deseneazaLive(); C.stare(1, sim.alim ? "alimentare deschisă" : "alimentare închisă", sim.alim ? "inc" : ""); C.stare(2, sim.colorant ? "colorant deschis" : "colorant închis"); }
    },
    redeseneaza() { deseneazaLive(); },
    formule() { return []; }
  }
});
