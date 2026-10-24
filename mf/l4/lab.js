/* MF – Lucrarea 4. Ecuația lui Bernoulli și măsurarea debitului: tubul Venturi și tubul Pitot.
   Simulator: banc hidraulic cu pompă centrifugă și robinet de reglare, tub Venturi transparent cu 6 prize și panou de piezometre,
   tub Pitot în secțiunea de intrare cu micromanometru înclinat 1:5, vas volumetric gradat cu cronometru, termometru. */
"use strict";
const M4 = MODELE["mf-l4"];
const { RANDURI, D1, SIN_M, G } = M4;
const NUME_RAND = { Q1: "Q₁", Q2: "Q₂", Q3: "Q₃" };
const NUME_PRIZA = ["1 (intrare)", "2 (confuzor)", "3 (gât)", "4 (difuzor)", "5 (difuzor)", "6 (ieșire)"];

/* ------------------------------------------------------------------ starea simulatorului */
const sim = {
  a: 0, aEf: 0, tinta: null, tine: 0, pompa: false, aerisit: false, bule: [0, 0, 0, 0, 0, 0],
  hAf: [240, 240, 240, 240, 240, 240], zg: [0, 0, 0, 0, 0, 0], lAf: 0, zgL: 0,
  pitot: false, colect: false, Vvas: 0, tCron: 0, aColect: null, preaplin: false,
  rand: "Q1", defect: "none", viteza: 1, etichete: true, linPiezo: true, linEnerg: false, part: []
};
function P() { return Cadru.P; }
function prEfectiv() {
  const pr = Object.assign({}, P());
  if (sim.defect === "aer3") pr.aer3 = -14;
  if (sim.defect === "pitot") pr.Cp *= Math.pow(Math.cos(25 * Math.PI / 180), 2);
  return pr;
}
function geomCurenta() { return M4.geom(P().d2); }
/** nivelurile țintă ale piezometrelor și citirea micromanometrului la deschiderea efectivă */
function tinte() {
  const pr = prEfectiv();
  if (!sim.pompa || sim.aEf < 0.05) return { h: pr.eh.map(e => 240 + e), l: 0, s: null };
  const c = M4.citiri(sim.aEf, pr), s = M4.stare(sim.aEf, pr);
  const h = c.h.map((x, i) => x + (sim.aerisit ? 0 : sim.bule[i]));
  return { h, l: sim.pitot ? c.l : 0, s };
}
function citireH(i) { return Math.round(sim.hAf[i] + sim.zg[i]); }
function citireL() { return Math.round((sim.lAf + sim.zgL) * 2) / 2; }
function stabil() {
  if (!sim.pompa) return false;
  if (Math.abs(sim.aEf - sim.a) > 0.05) return false;
  const t = tinte();
  return t.h.every((x, i) => Math.abs(sim.hAf[i] - x) < 0.6) && Math.abs(sim.lAf - t.l) < 0.4;
}
function aRand(k) { return ((Cadru.D.varianta || {}).a || {})[k]; }

/* ------------------------------------------------------------------ desenul */
const SV = { g: null };
const YC = 352, DS = 2.0, X0V = 228, LVPX = 520;   // axa tubului, scara diametrelor, începutul și lungimea tubului în px
const hY = h => 262 - h * 0.45;                      // rigla panoului: 0…500 mm
let SCX = 2;
const XV = x => X0V + x * SCX;
const VAS = { x: 792, y: 404, w: 80, h: 84, max: 6 };
const yVas = V => VAS.y + VAS.h - V / VAS.max * VAS.h;
const MM = { x0: 30, y0: 122, px: 1.42 };            // micromanometrul înclinat: originea și scara [px/mm] în lungul tubului
const COS_M = Math.sqrt(1 - SIN_M * SIN_M);
const mmPct = l => [MM.x0 + l * MM.px * COS_M, MM.y0 - l * MM.px * SIN_M];

function construiesteSVG() {
  const svg = $("#svg-venturi"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs);
  grad(defs, "gBazaA", [[0, "#4166a8"], [0.5, "#27467e"], [1, "#132a52"]]);
  grad(defs, "gPanou", [[0, "#ffffff"], [1, "#eef1f4"]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gApaV", [[0, "#7fc0ef", 0.75], [0.5, "#bfe2fa", 0.55], [1, "#5aa6e0", 0.8]]);
  grad(defs, "gPompa", [[0, "#3d5f8f"], [0.5, "#1f3b63"], [1, "#0e2340"]]);
  const g = mk("g", {}, svg); SV.g = g;
  const pr = P(), G4 = geomCurenta(); SCX = LVPX / G4.L;
  // bazinul bancului (rezervorul de apă) și batiul
  mk("rect", { x: 132, y: 436, width: 640, height: 50, rx: 6, fill: "#e8f2fa", stroke: "#7f9db8" }, g);
  mk("rect", { x: 135, y: 452, width: 634, height: 31, rx: 4, fill: "url(#gApa)" }, g);
  mk("rect", { x: 10, y: 486, width: 880, height: 10, rx: 3, fill: "url(#gBazaA)" }, g);
  // panoul piezometrelor
  mk("rect", { x: 182, y: 14, width: 626, height: 262, rx: 6, fill: "url(#gPanou)", stroke: "#9aa5b1" }, g);
  for (let h = 0; h <= 500; h += 10) {
    const y = hY(h), maj = h % 50 === 0;
    mk("line", { x1: 192, y1: y, x2: maj ? 806 : 200, y2: y, stroke: maj ? "#c9d1da" : "#8a96a3", "stroke-width": maj ? 0.6 : 0.5 }, g);
    if (maj) { const t = mk("text", { x: 214, y: y + 3.5, "font-size": 9, fill: "#3b4651" }, g); t.textContent = h; }
  }
  const tmm = mk("text", { x: 196, y: 26, "font-size": 9, fill: "#3b4651", "font-weight": 700 }, g); tmm.textContent = "mm";
  // tubul Venturi transparent: profilul real (confuzor 21°, gât, difuzor 7°)
  const prof = []; for (let x = 0; x <= G4.L; x += 1) prof.push([x, M4.diametru(x, pr.d2)]);
  const sus = prof.map(([x, d]) => `${XV(x)},${YC - d / 2 * DS}`), jos = prof.slice().reverse().map(([x, d]) => `${XV(x)},${YC + d / 2 * DS}`);
  mk("polygon", { points: [...sus, ...jos].join(" "), fill: "url(#gApaV)" }, g);
  const pereteSus = prof.map(([x, d]) => `${XV(x)},${YC - d / 2 * DS - 5}`).join(" "), pereteJos = prof.map(([x, d]) => `${XV(x)},${YC + d / 2 * DS + 5}`).join(" ");
  mk("polygon", { points: `${pereteSus} ${sus.slice().reverse().join(" ")}`, fill: "#dceaf5", opacity: 0.75, stroke: "#8fb0c9", "stroke-width": 0.6 }, g);
  mk("polygon", { points: `${pereteJos} ${jos.join(" ")}`, fill: "#dceaf5", opacity: 0.75, stroke: "#8fb0c9", "stroke-width": 0.6 }, g);
  mk("rect", { x: XV(0), y: YC - 33, width: XV(G4.L) - XV(0), height: 10, fill: "url(#gLuciu)", opacity: 0.5 }, g);
  SV.part = mk("g", {}, g);
  // flanșele și suporturile
  [XV(0), XV(G4.L)].forEach(x => { mk("rect", { x: x - 6, y: YC - 40, width: 12, height: 80, rx: 2, fill: "url(#gOtelO)", stroke: "#4b5259" }, g); [-30, 30].forEach(dy => surub(g, x, YC + dy, 3.5)); });
  [XV(G4.L * 0.12), XV(G4.L * 0.86)].forEach(x => mk("path", { d: `M${x - 16} 436 L${x - 9} ${YC + 33} H${x + 9} L${x + 16} 436 Z`, fill: "url(#gAlbastruO)", stroke: "#0d2240" }, g));
  // conducta de alimentare, pompa și robinetul de reglare
  mk("path", { d: `M86 432 V${YC} H${XV(0) - 6}`, fill: "none", stroke: "#9fb6c8", "stroke-width": 24, "stroke-linejoin": "round", opacity: 0.85 }, g);
  mk("path", { d: `M86 432 V${YC} H${XV(0) - 6}`, fill: "none", stroke: "#cfe6f7", "stroke-width": 16, "stroke-linejoin": "round" }, g);
  SV.apaAlim = mk("path", { d: `M86 432 V${YC} H${XV(0) - 6}`, fill: "none", stroke: "#5aa6e0", "stroke-width": 14, "stroke-linejoin": "round", opacity: 0 }, g);
  mk("rect", { x: 38, y: 432, width: 96, height: 50, rx: 8, fill: "url(#gPompa)", stroke: "#0b1a30" }, g);
  mk("circle", { cx: 70, cy: 457, r: 18, fill: "url(#gOtelR)", stroke: "#333" }, g);
  SV.rotor = mk("g", {}, g);
  for (let k = 0; k < 6; k++) mk("line", { x1: 70, y1: 457, x2: 70 + 14 * Math.cos(k * Math.PI / 3), y2: 457 + 14 * Math.sin(k * Math.PI / 3), stroke: "#2b2f35", "stroke-width": 2.4 }, SV.rotor);
  SV.ledPompa = mk("circle", { cx: 120, cy: 444, r: 5, fill: "#555" }, g);
  const tp = mk("text", { x: 86, y: 478, "font-size": 8, "text-anchor": "middle", fill: "#dfe8f3" }, g); tp.textContent = "pompă centrifugă";
  const xr = 152;
  mk("rect", { x: xr - 16, y: YC - 17, width: 32, height: 34, rx: 5, fill: "url(#gAlama)", stroke: "#5f430f" }, g);
  mk("rect", { x: xr - 3, y: YC - 44, width: 6, height: 28, fill: "url(#gCromO)" }, g);
  SV.roata = mk("g", {}, g);
  mk("circle", { cx: xr, cy: YC - 48, r: 15, fill: "none", stroke: "#b71c1c", "stroke-width": 4 }, SV.roata);
  for (let k = 0; k < 3; k++) mk("line", { x1: xr, y1: YC - 48, x2: xr + 15 * Math.cos(k * 2 * Math.PI / 3), y2: YC - 48 + 15 * Math.sin(k * 2 * Math.PI / 3), stroke: "#b71c1c", "stroke-width": 2.5 }, SV.roata);
  mk("circle", { cx: xr, cy: YC - 48, r: 4, fill: "url(#gOtelR)" }, SV.roata);
  // conducta de ieșire și deviatorul (bazin / vas volumetric)
  const xe = XV(G4.L) + 6;
  mk("path", { d: `M${xe} ${YC} H832 V392`, fill: "none", stroke: "#9fb6c8", "stroke-width": 24, "stroke-linejoin": "round", opacity: 0.85 }, g);
  mk("path", { d: `M${xe} ${YC} H832 V392`, fill: "none", stroke: "#cfe6f7", "stroke-width": 16, "stroke-linejoin": "round" }, g);
  SV.apaIes = mk("path", { d: `M${xe} ${YC} H832 V392`, fill: "none", stroke: "#5aa6e0", "stroke-width": 14, "stroke-linejoin": "round", opacity: 0 }, g);
  SV.jet = mk("path", { d: "", fill: "none", stroke: "#5aa6e0", "stroke-width": 6, "stroke-linecap": "round", opacity: 0.85 }, g);
  SV.deviator = mk("path", { d: "", fill: "url(#gOtelO)", stroke: "#4b5259" }, g);
  mk("path", { d: "M770 436 L784 412 H792", fill: "none", stroke: "#8aa0b3", "stroke-width": 3 }, g);   // jgheabul spre bazin
  // vasul volumetric gradat
  mk("rect", { x: VAS.x, y: VAS.y, width: VAS.w, height: VAS.h, rx: 3, fill: "#f4f9fd", stroke: "#7f9db8", "stroke-width": 1.5 }, g);
  SV.apaVas = mk("rect", { x: VAS.x + 1, y: VAS.y + VAS.h, width: VAS.w - 2, height: 0, fill: "url(#gApa)" }, g);
  for (let v = 0; v <= VAS.max + 1e-9; v += 0.1) {
    const y = yVas(v), l1 = Math.abs(v - Math.round(v)) < 1e-6, l5 = Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
    mk("line", { x1: VAS.x + VAS.w - (l1 ? 22 : l5 ? 15 : 8), y1: y, x2: VAS.x + VAS.w, y2: y, stroke: "#1b2b3a", "stroke-width": l1 ? 0.9 : 0.5 }, g);
    if (l1 && v > 0) { const t = mk("text", { x: VAS.x + VAS.w - 25, y: y + 3, "font-size": 8, "text-anchor": "end", fill: "#1b2b3a" }, g); t.textContent = Math.round(v) + " L"; }
  }
  mk("rect", { x: VAS.x + 4, y: VAS.y + 4, width: 8, height: VAS.h - 8, fill: "url(#gLuciu)", opacity: 0.6 }, g);
  SV.cron = afisajLCD(g, 690, 404, 80, 22, { unit: "s", fundal: "#cfe6ff" });
  const tc = mk("text", { x: 730, y: 397, "font-size": 9, "text-anchor": "middle", style: "fill:var(--text-sec)" }, g); tc.textContent = "cronometru";
  // termometrul în bazin
  mk("rect", { x: 466, y: 418, width: 7, height: 56, rx: 3.5, fill: "#f7f7f7", stroke: "#888" }, g);
  mk("circle", { cx: 469.5, cy: 476, r: 6, fill: "#d32f2f" }, g);
  mk("rect", { x: 468, y: 440, width: 3, height: 34, fill: "#d32f2f" }, g);
  SV.term = afisajLCD(g, 482, 412, 62, 20, { unit: "°C", fundal: "#f2e6c9" });
  // prizele, furtunurile și tuburile piezometrice
  SV.tub = []; SV.col = []; SV.men = []; SV.bula = [];
  G4.prize.forEach((p, i) => {
    const x = XV(p.x), yT = YC - p.d / 2 * DS - 5;
    mk("rect", { x: x - 4, y: yT - 8, width: 8, height: 10, rx: 1.5, fill: "url(#gAlamaO)", stroke: "#5f430f", "stroke-width": 0.6 }, g);
    mk("path", { d: `M${x} ${yT - 8} V268`, fill: "none", stroke: "#c7d6e2", "stroke-width": 5, opacity: 0.9 }, g);
    mk("path", { d: `M${x} ${yT - 8} V268`, fill: "none", stroke: "#8fc3ea", "stroke-width": 2.4 }, g);
    mk("rect", { x: x - 6, y: 30, width: 12, height: 238, rx: 5, fill: "url(#gTubO)", stroke: "#8fb0c9", "stroke-width": 0.8 }, g);
    SV.col.push(mk("rect", { x: x - 4, y: 262, width: 8, height: 4, fill: "url(#gApaO)" }, g));
    SV.men.push(mk("path", { d: "", fill: "none", stroke: "#2f78b8", "stroke-width": 1.2 }, g));
    SV.bula.push(mk("ellipse", { cx: x, cy: 0, rx: 3.2, ry: 5, fill: "url(#gBula)", opacity: 0 }, g));
    mk("rect", { x: x - 6, y: 264, width: 12, height: 8, rx: 1.5, fill: "url(#gOtelO)" }, g);
    const t = mk("text", { x, y: 287, "font-size": 11, "text-anchor": "middle", style: "fill:var(--text)", "font-weight": 700 }, g); t.textContent = i + 1;
  });
  SV.linP = mk("polyline", { points: "", fill: "none", stroke: "#1f5f9e", "stroke-width": 1.6, opacity: 0.9 }, g);
  SV.linE = mk("polyline", { points: "", fill: "none", stroke: "#d32f2f", "stroke-width": 1.6, "stroke-dasharray": "6 4" }, g);
  // cote d1, d2
  const tg = mk("text", { x: XV(G4.prize[2].x), y: YC + 48, "font-size": 10, "text-anchor": "middle", style: "fill:var(--text)", "font-weight": 700 }, g); tg.textContent = `d₂ = ${pr.d2} mm`;
  const ti = mk("text", { x: 192, y: YC + 48, "font-size": 10, "text-anchor": "middle", style: "fill:var(--text)", "font-weight": 700 }, g); ti.textContent = `d₁ = ${D1} mm`;
  // tubul Pitot (în secțiunea de intrare, în axă) și micromanometrul înclinat
  SV.pitot = mk("g", {}, g);
  const xp = XV(G4.prize[0].x) - 2;
  mk("path", { d: `M${xp} ${YC - 60} V${YC} H${xp - 16}`, fill: "none", stroke: "url(#gCrom)", "stroke-width": 4, "stroke-linejoin": "round" }, SV.pitot);
  mk("circle", { cx: xp - 16, cy: YC, r: 2.2, fill: "#333" }, SV.pitot);
  mk("rect", { x: xp - 6, y: YC - 34, width: 12, height: 6, rx: 1.5, fill: "url(#gAlama)" }, SV.pitot);
  mk("path", { d: `M${xp} ${YC - 60} V300 Q ${xp} 290 ${xp - 12} 290 H192 Q 180 290 180 278 V${mmPct(100)[1] + 12} Q 180 ${mmPct(100)[1]} ${mmPct(100)[0]} ${mmPct(100)[1] - 4}`, fill: "none", stroke: "#8fc3ea", "stroke-width": 2.2, opacity: 0.8 }, SV.pitot);
  // micromanometrul
  mk("rect", { x: 10, y: 37, width: 166, height: 112, rx: 6, fill: "url(#gPanou)", stroke: "#9aa5b1" }, g);
  mk("rect", { x: MM.x0 - 16, y: MM.y0 - 8, width: 22, height: 22, rx: 3, fill: "url(#gTub)", stroke: "#8fb0c9" }, g);
  const [xa, ya] = mmPct(0), [xb, yb] = mmPct(100);
  mk("line", { x1: xa, y1: ya, x2: xb, y2: yb, stroke: "#c7d6e2", "stroke-width": 7, "stroke-linecap": "round" }, g);
  SV.colM = mk("line", { x1: xa, y1: ya, x2: xa, y2: ya, stroke: "#2f78b8", "stroke-width": 4, "stroke-linecap": "round" }, g);
  for (let l = 0; l <= 100; l += 2) {
    const [x, y] = mmPct(l), maj = l % 10 === 0, n = [SIN_M, COS_M];
    mk("line", { x1: x, y1: y + 4, x2: x + n[0] * (maj ? 7 : 4), y2: y + 4 + n[1] * (maj ? 7 : 4), stroke: "#2b2f35", "stroke-width": maj ? 0.8 : 0.4 }, g);
    if (l % 20 === 0) { const t = mk("text", { x: x + 4, y: y + 19, "font-size": 7.5, "text-anchor": "middle", fill: "#2b2f35" }, g); t.textContent = l; }
  }
  const tmm2 = mk("text", { x: 93, y: 51, "font-size": 9, "text-anchor": "middle", fill: "#2b2f35", "font-weight": 700 }, g); tmm2.textContent = "micromanometru 1:5";
  const tmm3 = mk("text", { x: 93, y: 63, "font-size": 8, "text-anchor": "middle", fill: "#4b5561" }, g); tmm3.textContent = "Pitot – priza statică 1 · l [mm]";
  SV.lcdM = afisajLCD(g, 112, 70, 56, 18, { unit: "l mm", fundal: "#cfe6ff" });
  // etichete
  SV.et = mk("g", { "font-size": 10.5, style: "fill:var(--text)" }, g);
  const et = (x, y, x2, y2, t) => { mk("line", { x1: x, y1: y, x2, y2, style: "stroke:var(--text-sec)", "stroke-width": 0.8 }, SV.et); const e = mk("text", { x: x2 + (x2 >= x ? 3 : -3), y: y2 + 4, "text-anchor": x2 >= x ? "start" : "end" }, SV.et); e.textContent = t; };
  et(XV(G4.x0 + G4.Lc * 0.5), YC + 22, XV(G4.x0 + G4.Lc * 0.5) + 22, 424, "Confuzor");
  et(XV(G4.prize[4].x), YC + 18, XV(G4.prize[4].x) + 12, 420, "Difuzor");
  mk("line", { x1: xr - 13, y1: YC - 52, x2: 62, y2: 262, style: "stroke:var(--text-sec)", "stroke-width": 0.8 }, SV.et);
  { const e = mk("text", { x: 12, y: 258 }, SV.et); e.textContent = "Robinet de reglare"; }
  et(VAS.x + 40, VAS.y, 832, 386, "");
  prefixeazaId(svg, "v4-");
  // particulele de trasor (viteza locală = Q/A(x): continuitate)
  sim.part = [];
  for (let k = 0; k < 46; k++) sim.part.push({ x: Math.random() * G4.L, r: (Math.random() * 2 - 1) * 0.82, el: mk("circle", { r: 1.6, fill: "#ffffff", opacity: 0.9 }, SV.part) });
  actualizeazaSVG();
}
function actualizeazaSVG() {
  if (!SV.g) return;
  const G4 = geomCurenta(), t = tinte();
  // pompa, robinetul, apa în conducte
  SV.ledPompa.setAttribute("fill", sim.pompa ? "#4caf50" : "#555");
  SV.roata.setAttribute("transform", `rotate(${sim.a * 5.4} 152 ${YC - 48})`);
  const curge = sim.pompa && sim.aEf > 0.3;
  [SV.apaAlim, SV.apaIes].forEach(e => e.setAttribute("opacity", sim.pompa ? 0.8 : 0));
  // deviatorul și jetul
  SV.deviator.setAttribute("d", sim.colect ? "M824 392 h16 l-4 10 h-8 z" : "M824 392 h16 l-14 10 h-8 z");
  SV.jet.setAttribute("d", !curge ? "" : sim.colect ? `M832 402 V${Math.max(yVas(sim.Vvas), VAS.y + 2)}` : "M826 402 Q 806 408 790 414");
  SV.jet.setAttribute("stroke-width", curge ? clamp(2 + sim.aEf / 18, 2, 7) : 0);
  const V = Math.min(sim.Vvas, VAS.max * 1.02);
  SV.apaVas.setAttribute("y", yVas(V)); SV.apaVas.setAttribute("height", Math.max(0, VAS.y + VAS.h - yVas(V)));
  SV.cron(fmt(sim.tCron, 2)); SV.term(fmt(P().T, 1));
  // piezometrele
  G4.prize.forEach((p, i) => {
    const x = XV(p.x), h = clamp(sim.hAf[i] + sim.zg[i], -5, 505), y = hY(h);
    SV.col[i].setAttribute("y", y); SV.col[i].setAttribute("height", Math.max(0, 266 - y));
    SV.men[i].setAttribute("d", `M${x - 4} ${y + 1.5} Q ${x} ${y - 1.5} ${x + 4} ${y + 1.5}`);
    const bula = sim.pompa && !sim.aerisit && sim.bule[i] !== 0;
    SV.bula[i].setAttribute("opacity", bula ? 0.95 : 0); SV.bula[i].setAttribute("cy", 262 - 8 - ((performance.now() / 40 + i * 13) % 20));
  });
  SV.linP.setAttribute("points", sim.linPiezo ? G4.prize.map((p, i) => `${XV(p.x)},${hY(sim.hAf[i])}`).join(" ") : "");
  if (sim.linEnerg && !MOD.eval && t.s) SV.linE.setAttribute("points", G4.prize.map((p, i) => `${XV(p.x)},${hY(t.s.E[i] + P().eh[i])}`).join(" "));
  else SV.linE.setAttribute("points", "");
  // tubul Pitot și micromanometrul
  SV.pitot.style.display = sim.pitot ? "" : "none";
  const [x1, y1] = mmPct(0), [x2, y2] = mmPct(clamp(sim.lAf + sim.zgL, 0, 102));
  SV.colM.setAttribute("x1", x1); SV.colM.setAttribute("y1", y1); SV.colM.setAttribute("x2", x2); SV.colM.setAttribute("y2", y2);
  SV.lcdM(sim.pitot ? fmt(citireL(), 1) : "—");
  SV.et.style.display = sim.etichete ? "" : "none";
}
function miscaParticule(dt) {
  if (!SV.part) return;
  const G4 = geomCurenta(), d2 = P().d2, Q = sim.pompa ? M4.debit(sim.aEf, prEfectiv()) : 0;
  sim.part.forEach(p => {
    const d = M4.diametru(p.x, d2), v = Q * 1e-3 / (M4.aria(d) * 1e-6);
    p.x += v * 1000 * dt * 0.06 * (1 - 0.35 * p.r * p.r);
    if (p.x > G4.L) { p.x -= G4.L; p.r = (Math.random() * 2 - 1) * 0.82; }
    p.el.setAttribute("cx", XV(p.x)); p.el.setAttribute("cy", YC + p.r * M4.diametru(p.x, d2) / 2 * DS);
  });
}

/* ------------------------------------------------------------------ comenzi și înregistrare */
function seteazaA(a) { sim.a = Math.round(clamp(a, 0, 100) * 10) / 10; sim.tinta = null; }
function verificaPregatire(C) {
  if (!$("#ck-nssm1").checked || !$("#ck-nssm2").checked) { C.mesajTemporar("Bifați verificările NSSM (priza cu protecție diferențială, racordurile) înainte de lucru.", "atentie"); return false; }
  if (!sim.pompa) { C.mesajTemporar("Porniți pompa.", "atentie"); return false; }
  if (!sim.aerisit) { C.mesajTemporar("Eliminați întâi aerul din tubul Venturi și din furtunurile piezometrelor (Aerisește).", "atentie"); return false; }
  return true;
}
function campuriRand(k, faraPiezo) {
  const c = [];
  if (!faraPiezo) for (let i = 1; i <= 6; i++) c.push({ t: "t41", r: k, c: "h" + i, v: "" });
  ["V1", "t1", "V2", "t2"].forEach(x => c.push({ t: "t42", r: k, c: x, v: "" }));
  c.push({ t: "t43", r: k, c: "l", v: "" });
  return c;
}
function inregPiezo(e) {
  const C = Cadru; if (!verificaPregatire(C)) return;
  if (!stabil()) return C.mesajTemporar("Nivelurile nu s-au stabilizat încă: așteptați câteva secunde după reglarea robinetului.", "atentie");
  if (sim.aEf < 1) return C.mesajTemporar("Deschideți robinetul de reglare: fără debit piezometrele arată doar nivelul static.", "atentie");
  const h = [0, 1, 2, 3, 4, 5].map(citireH), k = sim.rand, a0 = aRand(k);
  if (h.some(x => x < 5 || x > 495)) return C.mesajTemporar("Un nivel este în afara riglei (0…500 mm): micșorați debitul.", "pericol");
  let celule = [], msg = "";
  if (a0 != null && Math.abs(a0 - sim.a) > 0.05 && randulAreMasuratori(k)) { celule = campuriRand(k, true); msg = ` Debitul s-a schimbat față de măsurătorile anterioare ale rândului ${NUME_RAND[k]}: volumul, timpul și citirea Pitot ale acestui rând au fost șterse.`; }
  h.forEach((x, i) => celule.push({ t: "t41", r: k, c: "h" + (i + 1), v: String(x) }));
  const ok = C.inregistreaza(e, { log: { tip: "piezo", rand: k, a: sim.a, h }, celule });
  if (ok) { C.D.varianta.a = Object.assign({}, C.D.varianta.a, { [k]: sim.a }); C.salveaza(); $("#msg-inreg").textContent = `Tabelul 4.1, ${NUME_RAND[k]}: h = ${h.join(" / ")} mm; Δh₁₋₃ = ${h[0] - h[2]} mm.${msg}`; deseneazaLive(); }
}
function randulAreMasuratori(k) { const t = Cadru.D.t; return ["V1", "t1", "V2", "t2"].some(x => t.t42[k][x] !== "") || t.t43[k].l !== ""; }
function verificaRandDebit(C, k) {
  const a0 = aRand(k);
  if (a0 == null) { C.mesajTemporar(`Citiți întâi piezometrele pentru ${NUME_RAND[k]} (Tabelul 4.1), apoi măsurați debitul la aceeași deschidere a robinetului.`, "atentie"); return false; }
  if (Math.abs(a0 - sim.a) > 0.05) { C.mesajTemporar(`Robinetul este la ${fmt(sim.a, 1)} %, dar piezometrele pentru ${NUME_RAND[k]} au fost citite la ${fmt(a0, 1)} %. Reveniți la aceeași deschidere sau alegeți alt rând.`, "atentie"); return false; }
  return true;
}
function startColectare() {
  const C = Cadru; if (!verificaPregatire(C)) return;
  if (sim.colect) return;
  if (!stabil()) return C.mesajTemporar("Așteptați stabilizarea debitului înainte de a porni colectarea.", "atentie");
  if (sim.Vvas > 0.001) return C.mesajTemporar("Goliți întâi vasul volumetric și resetați cronometrul.", "atentie");
  sim.colect = true; sim.aColect = sim.a; sim.preaplin = false;
  $("#msg-inreg").textContent = "Colectare în curs: deviatorul trimite apa în vas, cronometrul pornește.";
}
function stopColectare() { if (!sim.colect) return; sim.colect = false; $("#msg-inreg").textContent = `Colectare oprită: citiți volumul pe gradațiile vasului (${fmt(VcititVas(), 2)} L) și timpul (${fmt(sim.tCron, 2)} s).`; }
function golesteVas() { if (sim.colect) return Cadru.mesajTemporar("Opriți întâi colectarea.", "atentie"); sim.Vvas = 0; sim.tCron = 0; sim.aColect = null; sim.preaplin = false; }
function VcititVas() { return Math.round(sim.Vvas / 0.05) * 0.05; }
function inregVolum(e) {
  const C = Cadru, k = sim.rand;
  if (sim.colect) return C.mesajTemporar("Opriți colectarea înainte de citire.", "atentie");
  if (sim.tCron < 0.5 || sim.Vvas < 0.01) return C.mesajTemporar("Nu există o colectare încheiată: porniți colectarea, apoi opriți-o la un volum citibil (de preferință 4…5 L).", "atentie");
  if (sim.preaplin) return C.mesajTemporar("Vasul a dat pe dinafară: măsurarea nu este valabilă. Goliți vasul și repetați.", "pericol");
  if (sim.aColect == null || Math.abs(sim.aColect - sim.a) > 0.05) return C.mesajTemporar("Robinetul a fost manevrat în timpul colectării: măsurarea nu este valabilă. Goliți vasul și repetați.", "pericol");
  if (!verificaRandDebit(C, k)) return;
  const V = +VcititVas().toFixed(2), t = +sim.tCron.toFixed(2);
  if (V < 2) return C.mesajTemporar(`Volumul colectat (${fmt(V, 2)} L) este prea mic pentru o măsurare precisă: colectați cel puțin 2 L (recomandat 5 L).`, "atentie");
  const r = C.D.t.t42[k], j = r.V1 === "" ? 1 : r.V2 === "" ? 2 : 0;
  if (!j) return C.mesajTemporar(`Rândul ${NUME_RAND[k]} are deja două măsurători de debit. Pentru o măsurare nouă, recitiți piezometrele rândului (se golesc măsurătorile vechi).`, "atentie");
  const ok = C.inregistreaza(e, { log: { tip: "vol", rand: k, a: sim.a, V, t }, celule: [{ t: "t42", r: k, c: "V" + j, v: V.toFixed(2) }, { t: "t42", r: k, c: "t" + j, v: t.toFixed(2) }] });
  if (ok) { $("#msg-inreg").textContent = `Tabelul 4.2, ${NUME_RAND[k]} (măsurarea ${j}): V = ${fmt(V, 2)} L în t = ${fmt(t, 2)} s → Q = ${fmt(V / t, 4)} L/s.`; golesteVas(); }
}
function inregPitot(e) {
  const C = Cadru, k = sim.rand; if (!verificaPregatire(C)) return;
  if (!sim.pitot) return C.mesajTemporar("Montați întâi tubul Pitot în secțiunea de intrare.", "atentie");
  if (!stabil()) return C.mesajTemporar("Așteptați stabilizarea coloanei din micromanometru.", "atentie");
  if (!verificaRandDebit(C, k)) return;
  const l = citireL();
  const ok = C.inregistreaza(e, { log: { tip: "pitot", rand: k, a: sim.a, l }, celule: [{ t: "t43", r: k, c: "l", v: l.toFixed(1) }] });
  if (ok) $("#msg-inreg").textContent = `Tabelul 4.3, ${NUME_RAND[k]}: l = ${fmt(l, 1)} mm pe tubul înclinat → Δh = l·sin α = ${fmt(l * SIN_M, 2)} mm.`;
}

/* ------------------------------------------------------------------ grafic în timp real */
function deseneazaLive() {
  const cv = $("#cv-live"); if (!cv || !cv.getClientRects().length) return;
  const G4 = geomCurenta(), xs = G4.prize.map(p => p.x), t = Cadru.D.t;
  const serii = [{ tip: "linie", pts: xs.map((x, i) => [x, sim.hAf[i] + sim.zg[i]]), culoare: 2 }, { tip: "pct", pts: xs.map((x, i) => [x, sim.hAf[i] + sim.zg[i]]), culoare: 2, r: 4 }];
  RANDURI.forEach((k, j) => { const pts = xs.map((x, i) => [x, num(t.t41[k]["h" + (i + 1)])]).filter(p => Number.isFinite(p[1])); if (pts.length) serii.push({ tip: "pct", pts, culoare: j, gol: true, r: 4.5 }); });
  deseneazaGrafic(cv, { xmin: 0, xmax: Math.ceil(G4.L / 50) * 50, ymin: 0, ymax: 500, yticks: [0, 100, 200, 300, 400, 500], xlab: "x [mm] în lungul tubului", ylab: "h [mm]", serii });
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaL4(D) {
  const o = M4.prelucreaza(D.t, D.date, { num }), G4 = o.geom;
  const cel = { t41: {}, t42: {}, t43: {}, t44: {} }, rele = { t42: {}, t43: {} };
  RANDURI.forEach(k => {
    const R = o.r[k];
    cel.t41[k] = R.ok ? { dh: fmt(R.dh13, 0), pierd: fmt(R.pierd, 0) } : {};
    cel.t42[k] = { Q: fmt(R.Qm, 4), dh: R.ok ? fmt(R.dh13, 0) : "", Qt: fmt(R.Qt, 4), Cd: fmt(R.Cd, 3) };
    rele.t42[k] = { Cd: Number.isFinite(R.Cd) && (R.Cd < 0.94 || R.Cd > 1.0) };
    const areP = Number.isFinite(R.l);
    cel.t43[k] = areP ? { dh: fmt(R.dhP, 2), vP: fmt(R.vP, 3), vm: fmt(R.v1, 3), rap: fmt(R.raport, 2), Re: Number.isFinite(R.Re1) ? fmt(R.Re1, 0) : "—" } : {};
    rele.t43[k] = { rap: areP && R.Re1 > 4000 && (R.raport < 1.05 || R.raport > 1.4) };
  });
  G4.prize.forEach((p, i) => {
    const c = { x: fmt(p.x, 1), d: fmt(p.d, 1) };
    RANDURI.forEach(k => { const R = o.r[k]; if (Number.isFinite(R.Qm) && R.ok) { c["v" + k] = fmt(R.v[i], 3); c["q" + k] = fmt(R.q[i], 1); c["E" + k] = fmt(R.E[i], 1); } });
    cel.t44["p" + (i + 1)] = c;
  });
  const R1 = o.r.Q1, ok = k => o.r[k].ok && Number.isFinite(o.r[k].Qm);
  const rez = [
    ["Raportul diametrelor β = d<sub>2</sub>/d<sub>1</sub>; A<sub>2</sub>/A<sub>1</sub> = β²", `${fmt(num(D.date.d2) / D1, 3)}; ${fmt(o.A2 / o.A1, 4)}`],
    ["Ariile A<sub>1</sub> / A<sub>2</sub>", `${fmt(o.A1, 1)} / ${fmt(o.A2, 2)} mm²`],
    [`Apa la ${fmt(num(D.date.T), 1)} °C: ρ / ν`, `${fmt(o.rho, 1)} kg/m³ / ${fmtE(o.nu, 3)} m²/s`],
    ["Coeficientul de debit C<sub>d</sub> (media celor 3 debite)", `<span style='color:var(--accent)'>${fmt(o.CdMed, 3)}</span>`],
    ["C<sub>d</sub> din dreapta Q = K·√Δh<sub>1−3</sub> (regresie prin origine)", fmt(o.CdReg, 3)],
    ["Viteza în gât la Q<sub>1</sub>: v<sub>2</sub> = Q/A<sub>2</sub>", ok("Q1") ? `${fmt(o.v2Q1, 3)} m/s (v<sub>2</sub>²/2g = ${fmt(R1.q[2], 1)} mm)` : "—"],
    ["Numărul Reynolds la Q<sub>1</sub>: intrare / gât", ok("Q1") ? `${fmt(R1.Re1, 0)} / ${fmt(R1.Re3, 0)}` : "—"],
    ["Pierderea de sarcină a tubului Venturi la Q<sub>1</sub>: h<sub>1</sub> − h<sub>6</sub>", R1.ok ? `${fmt(R1.pierd, 0)} mm = ${fmt(R1.pierdRel * 100, 1)} % din Δh<sub>1−3</sub>` : "—"],
    ["Tubul Pitot la Q<sub>1</sub>: v<sub>axă</sub> / v<sub>medie</sub>", Number.isFinite(R1.vP) && Number.isFinite(R1.v1) ? `${fmt(R1.vP, 3)} / ${fmt(R1.v1, 3)} m/s = ${fmt(R1.raport, 2)}` : "—"],
    ["Debitul pentru Δh<sub>1−3</sub> = 100 mm, cu C<sub>d</sub> mediu", Number.isFinite(o.Q100) ? `${fmt(o.Q100, 4)} L/s` : "—"]
  ];
  const verdicte = [];
  RANDURI.forEach(k => {
    const R = o.r[k]; if (!Number.isFinite(R.Cd)) return;
    if (R.Cd >= 0.95 && R.Cd <= 0.99) verdicte.push({ tip: "ok", text: `${NUME_RAND[k]}: C<sub>d</sub> = ${fmt(R.Cd, 3)} – în intervalul 0,95…0,99 al unui Venturi bine executat.` });
    else if (R.Cd < 0.95) verdicte.push({ tip: "atentie", text: `${NUME_RAND[k]}: C<sub>d</sub> = ${fmt(R.Cd, 3)} este prea mic: aer în piezometrul gâtului (nivel h<sub>3</sub> fals coborât), citire greșită sau volum pierdut din vasul volumetric.` });
    else verdicte.push({ tip: "atentie", text: `${NUME_RAND[k]}: C<sub>d</sub> = ${fmt(R.Cd, 3)} este prea mare (≥ 1 nu este posibil fizic): Δh<sub>1−3</sub> citit prea mic sau timpul cronometrat prea scurt.` });
  });
  if (R1.ok) verdicte.push(R1.dh13 >= 150 && R1.dh13 <= 260 ? { tip: "ok", text: `Debitul mare Q<sub>1</sub>: Δh<sub>1−3</sub> = ${fmt(R1.dh13, 0)} mm (≈ 20 cm, cum cere îndrumarul).` } : { tip: "atentie", text: `Q<sub>1</sub> trebuie să fie debitul mare, cu Δh<sub>1−3</sub> ≈ 200 mm (citit: ${fmt(R1.dh13, 0)} mm).` });
  const dhs = RANDURI.map(k => o.r[k].ok ? o.r[k].dh13 : NaN);
  if (dhs.every(Number.isFinite)) verdicte.push(dhs[0] > dhs[1] && dhs[1] > dhs[2] ? { tip: "ok", text: "Cele trei debite sunt descrescătoare (Q<sub>1</sub> > Q<sub>2</sub> > Q<sub>3</sub>)." } : { tip: "atentie", text: "Debitele Q<sub>2</sub> și Q<sub>3</sub> trebuie să fie, în ordine, mai mici decât Q<sub>1</sub>." });
  RANDURI.forEach(k => {
    const R = o.r[k]; if (!R.ok) return;
    if (Math.min(...R.h) !== R.h[2]) verdicte.push({ tip: "atentie", text: `${NUME_RAND[k]}: cota piezometrică minimă nu este în gât (priza 3) – verificați citirile.` });
  });
  if (R1.ok && Number.isFinite(R1.pierdRel)) verdicte.push(R1.pierdRel > 0.05 && R1.pierdRel < 0.35 ? { tip: "ok", text: `Difuzorul recuperează presiunea doar parțial: pierderea h<sub>1</sub> − h<sub>6</sub> = ${fmt(R1.pierdRel * 100, 0)} % din Δh<sub>1−3</sub> (o diafragmă cu același raport ar pierde 60…80 %).` } : { tip: "atentie", text: `Pierderea h<sub>1</sub> − h<sub>6</sub> = ${fmt(R1.pierdRel * 100, 0)} % din Δh<sub>1−3</sub> nu este plauzibilă pentru un tub Venturi (10…25 %).` });
  if (Number.isFinite(R1.raport)) {
    if (R1.Re1 < 2300) verdicte.push({ tip: "ok", text: `Re = ${fmt(R1.Re1, 0)} < 2300: regim laminar, v<sub>axă</sub>/v<sub>medie</sub> ≈ 2 (măsurat ${fmt(R1.raport, 2)}).` });
    else if (R1.Re1 < 4000) verdicte.push({ tip: "atentie", text: `Re = ${fmt(R1.Re1, 0)}: regim de tranziție; raportul v<sub>axă</sub>/v<sub>medie</sub> = ${fmt(R1.raport, 2)} este între 1,25 (turbulent) și 2 (laminar) – vezi lucrarea 5.` });
    else verdicte.push(R1.raport >= 1.08 && R1.raport <= 1.35 ? { tip: "ok", text: `Regim turbulent (Re = ${fmt(R1.Re1, 0)}): viteza din axă este de ${fmt(R1.raport, 2)} ori viteza medie (1,1…1,25 tipic).` } : { tip: "atentie", text: `v<sub>axă</sub>/v<sub>medie</sub> = ${fmt(R1.raport, 2)} nu corespunde regimului turbulent (1,1…1,25): tubul Pitot nu este orientat contra curentului sau citirea este greșită.` });
  }
  const serii = [], legenda = [];
  RANDURI.forEach((k, j) => {
    const R = o.r[k]; if (!R.ok) return;
    const xs = G4.prize.map(p => p.x);
    serii.push({ tip: "linie", pts: xs.map((x, i) => [x, R.h[i]]), culoare: j }, { tip: "pct", pts: xs.map((x, i) => [x, R.h[i]]), culoare: j });
    if (Number.isFinite(R.Qm)) serii.push({ tip: "linie", pts: xs.map((x, i) => [x, R.E[i]]), culoare: j, punctat: true });
    legenda.push([`${NUME_RAND[k]}: linia piezometrică (plin) și energetică (punctat)`, `var(--serie-${j})`, "pct"]);
  });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Linia piezometrică și linia energetică în lungul tubului Venturi",
    grafic: { xmin: 0, xmax: Math.ceil(G4.L / 50) * 50, ymin: 0, ymax: 500, yticks: [0, 100, 200, 300, 400, 500], xlab: "x [mm] (prizele 1…6)", ylab: "h [mm]", serii },
    legenda, principal: { eticheta: "Cd mediu", valoare: Number.isFinite(o.CdMed) ? +o.CdMed.toFixed(3) : null }, o
  };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<figure><img src="img/stand.jpg" alt="Bancul hidraulic cu tub Venturi transparent, prize piezometrice și panou de piezometre" loading="lazy"></figure>
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Bancul hidraulic se alimentează de la priza cu protecție diferențială; pompa se pornește numai după verificarea racordurilor și cu robinetul de reglare parțial deschis.</li>
<li>Nu se ating cu mâinile ude întrerupătoarele și cablurile; apa scursă pe podea se șterge imediat (pericol de alunecare și de electrocutare).</li>
<li>Tuburile piezometrice din sticlă sau plexiglas se manevrează cu grijă; aerul din furtunuri se elimină numai prin robinetele de aerisire.</li>
<li>Debitul se reglează lent, fără închideri bruște ale robinetului, pentru a evita șocurile de presiune (lovitura de berbec) în instalație.</li></ul></div>
<h2>4.1. Scopul lucrării</h2>
<p>Verificarea experimentală a ecuației lui Bernoulli prin trasarea liniei piezometrice și a liniei energetice într-un tub Venturi, determinarea coeficientului de debit al tubului Venturi și măsurarea vitezei locale cu tubul Pitot. Se evidențiază legătura cu senzorii de presiune diferențială și cu pompele cu jet de pe autovehicul.</p>
<h2>4.2. Noțiuni teoretice</h2>
<p>Pentru mișcarea permanentă a unui lichid incompresibil, debitul se conservă în lungul unui tub de curent (ecuația de continuitate), iar energia specifică se conservă pentru lichidul ideal și scade cu pierderile de sarcină h<sub>r</sub> pentru lichidul real (ecuația lui Bernoulli):</p>
<div class="ec"><span>Q = v<sub>1</sub>·A<sub>1</sub> = v<sub>2</sub>·A<sub>2</sub></span><span class="nr">(4.1)</span></div>
<div class="ec"><span>z<sub>1</sub> + ${FR("p<sub>1</sub>", "ρ·g")} + ${FR("α<sub>1</sub>·v<sub>1</sub>²", "2·g")} = z<sub>2</sub> + ${FR("p<sub>2</sub>", "ρ·g")} + ${FR("α<sub>2</sub>·v<sub>2</sub>²", "2·g")} + h<sub>r 1−2</sub></span><span class="nr">(4.2)</span></div>
<p>Termenii au dimensiunea unei lungimi (sarcini, în metri coloană de lichid): z este sarcina de poziție, p/(ρg) sarcina de presiune, iar αv²/(2g) sarcina cinetică (α ≈ 1,05…1,1 în regim turbulent). Suma primilor doi termeni este <b>cota piezometrică</b>, citită direct în tuburile piezometrice; adăugând sarcina cinetică se obține <b>linia energetică</b> (Fig. 4.1).</p>
<figure><img src="img/fig4_1.jpg" alt="Fig. 4.1 Tubul Venturi cu prize piezometrice" loading="lazy"><figcaption>Fig. 4.1. Tubul Venturi cu prize piezometrice: linia piezometrică și linia energetică</figcaption></figure>
<p>În gâtul tubului Venturi viteza crește, iar presiunea scade. Aplicând ecuațiile de continuitate și Bernoulli între secțiunea de intrare 1 și gât (pe orizontală, fără pierderi), din diferența de nivel Δh dintre piezometre rezultă viteza în gât și debitul teoretic; debitul real se obține cu coeficientul de debit C<sub>d</sub> (0,95…0,99 pentru un Venturi bine executat):</p>
<div class="ec"><span>v<sub>2</sub> = √${FR("2·g·Δh", "1 − (A<sub>2</sub>/A<sub>1</sub>)²")}</span><span class="nr">(4.3)</span></div>
<div class="ec"><span>Q<sub>t</sub> = A<sub>2</sub>·v<sub>2</sub></span><span class="nr">(4.4)</span></div>
<div class="ec"><span>Q = C<sub>d</sub>·Q<sub>t</sub></span><span class="nr">(4.5)</span></div>
<p>Pe stand, gâtul este priza 3; în relația (4.3) se folosește Δh<sub>1−3</sub> = h<sub>1</sub> − h<sub>3</sub>.</p>
<figure><img src="img/stand_pitot.jpg" alt="Tubul Pitot și priza de presiune statică" loading="lazy"></figure>
<p>Tubul Pitot (Fig. 4.2) are orificiul îndreptat contra curentului: în el lichidul se oprește (punct de stagnare), iar presiunea măsurată este presiunea totală. Diferența dintre presiunea totală și cea statică este presiunea dinamică, din care se obține viteza locală:</p>
<figure><img src="img/fig4_2.jpg" alt="Fig. 4.2 Măsurarea vitezei locale cu tubul Pitot" loading="lazy"><figcaption>Fig. 4.2. Măsurarea vitezei locale cu tubul Pitot și priza statică</figcaption></figure>
<div class="ec"><span>p<sub>t</sub> − p<sub>s</sub> = ${FR("ρ·v²", "2")}</span><span class="nr">(4.6)</span></div>
<div class="ec"><span>v = √(2·g·Δh) &nbsp; (lichid)</span><span class="nr">(4.7)</span></div>
<div class="ec"><span>v = √${FR("2·Δp", "ρ<sub>aer</sub>")} &nbsp; (aer)</span><span class="nr">(4.8)</span></div>
<p>Pe standul virtual, diferența de nivel a tubului Pitot este mică (câțiva milimetri), de aceea se citește pe un <b>micromanometru cu tub înclinat</b> (1:5): lungimea l citită în lungul tubului amplifică de 1/sin α = 5 ori diferența de nivel.</p>
<div class="ec"><span>Δh = l·sin α, &nbsp; sin α = 0,2</span><span class="nr">(4.18)</span></div>
<p><b>Legătura cu autovehiculul.</b> Același principiu se folosește la: senzorul de presiune diferențială al filtrului de particule (Δp crește cu încărcarea cu funingine), măsurarea debitului de gaze recirculate (EGR) cu tub Venturi la unele motoare diesel, pompa cu jet (ejector) din rezervorul de combustibil, care mută combustibilul între cele două camere ale rezervorului, carburatorul (istoric) și tubul Pitot-Prandtl din tunelul aerodinamic.</p>
<h2>4.3. Aparatură și echipamente (în simulator)</h2>
<ul><li>Banc hidraulic cu pompă centrifugă, bazin, robinet de reglare și deviator spre vasul volumetric gradat (6 L, gradații de 0,1 L) cu cronometru</li>
<li>Tub Venturi transparent (d<sub>1</sub> = 25 mm, d<sub>2</sub> – varianta individuală) cu 6 prize piezometrice și panou de piezometre (riglă 0…500 mm)</li>
<li>Tub Pitot montat în axa secțiunii de intrare, cu micromanometru înclinat 1:5 legat între Pitot (presiunea totală) și priza 1 (presiunea statică)</li>
<li>Termometru în bazin (pentru ρ și ν ale apei)</li></ul>
<h2>4.4. Modul de lucru (în simulator)</h2>
<ol><li>Bifați verificările NSSM; deschideți parțial robinetul de reglare și porniți pompa; eliminați aerul din tubul Venturi și din furtunurile piezometrelor (<i>Aerisește</i>).</li>
<li>Reglați un debit mare (Δh<sub>1−3</sub> ≈ 200 mm) și așteptați stabilizarea nivelurilor; alegeți rândul Q<sub>1</sub> și înregistrați nivelurile celor 6 piezometre (Tabelul 4.1).</li>
<li>Măsurați debitul volumetric de 2 ori: goliți vasul, porniți colectarea, opriți-o la ≈ 5 L, citiți volumul și timpul și înregistrați-le (Tabelul 4.2).</li>
<li>Montați tubul Pitot în secțiunea de intrare și înregistrați lungimea l citită pe micromanometru pentru debitul maxim (Tabelul 4.3).</li>
<li>Repetați pașii 2–3 pentru încă două debite, mai mici (rândurile Q<sub>2</sub> și Q<sub>3</sub>); citirea Pitot la aceste debite este opțională (evidențiază tranziția spre regimul laminar).</li>
<li>Citiți temperatura apei; închideți lent robinetul și opriți pompa.</li></ol>
<h2>4.6. Prelucrarea datelor</h2>
<p>Pentru fiecare debit se calculează vitezele medii în secțiuni, sarcinile cinetice și cotele energetice; se reprezintă linia piezometrică și linia energetică de-a lungul tubului (Tabelul 4.4 și graficul). Se calculează debitul teoretic și coeficientul de debit. Pentru tubul Pitot se compară viteza locală din axă cu viteza medie.</p>
<h2>4.7. Interpretarea rezultatelor</h2>
<ul><li>Coeficientul de debit trebuie să fie 0,95…0,99; o valoare mai mică indică aer în piezometre sau o citire greșită a nivelului în gât.</li>
<li>Cota piezometrică scade în confuzor și crește în difuzor; cota energetică scade continuu, lent în confuzor și mai mult în difuzor, unde apar desprinderi.</li>
<li>Viteza din axă măsurată cu tubul Pitot este mai mare decât viteza medie (raport 1,1…1,25 în regim turbulent, 2 în regim laminar – lucrarea 5).</li>
<li>Tubul Venturi pierde mai puțină energie decât o diafragmă cu același raport de secțiuni, deoarece difuzorul lung (7°) transformă înapoi o mare parte din sarcina cinetică în sarcină de presiune, fără desprinderea curentului.</li></ul>
<h2>4.8. Relevanță practică</h2>
<p>Pe autovehicul, măsurarea debitelor prin diferență de presiune este curentă: senzorul Δp al filtrului de particule decide regenerarea, iar la unele motoare debitul EGR se calculează dintr-un tub Venturi cu senzor de presiune diferențială. Pompa cu jet din rezervorul de combustibil folosește scăderea presiunii dintr-o duză pentru a aspira combustibil fără piese în mișcare, iar tubul Pitot-Prandtl măsoară viteza aerului în tunelul aerodinamic pentru determinarea coeficientului de rezistență aerodinamică.</p>`;

function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>d<sub>1</sub> = 25 mm, d<sub>2</sub> = 10 mm, Δh<sub>1−3</sub> = 180 mm; s-au colectat 5 L în 34,6 s.</p>
<div class="ec"><span>A<sub>2</sub>/A<sub>1</sub> = (10/25)² = 0,16</span><span class="nr">(4.9)</span></div>
<div class="ec"><span>v<sub>2</sub> = √(2·9,81·0,180/(1 − 0,16²)) = 1,904 m/s</span><span class="nr">(4.10)</span></div>
<div class="ec"><span>Q<sub>t</sub> = π·0,010²/4·1,904 = 1,495·10⁻⁴ m³/s = 0,1495 L/s</span><span class="nr">(4.11)</span></div>
<div class="ec"><span>Q = 5/34,6 = 0,1445 L/s; &nbsp; C<sub>d</sub> = 0,1445/0,1495 = 0,967</span><span class="nr">(4.12–4.13)</span></div>
<div class="ec"><span>v<sub>1</sub> = 0,1445·10⁻³/4,909·10⁻⁴ = 0,294 m/s; &nbsp; v<sub>1</sub>²/2g = 4,4 mm</span><span class="nr">(4.14–4.15)</span></div>
<div class="ec"><span>v<sub>2</sub> = Q/A<sub>2</sub> = 1,840 m/s; &nbsp; v<sub>2</sub>²/2g = 172,5 mm</span><span class="nr">(4.16–4.17)</span></div>
<p>Linia energetică se află cu 4,4 mm deasupra liniei piezometrice la intrare și cu 172,5 mm în gât: aproape toată sarcina de presiune s-a transformat în sarcină cinetică. După gât, difuzorul recuperează presiunea, dar nu complet; diferența dintre h<sub>1</sub> și h<sub>6</sub> reprezintă pierderea de sarcină a tubului Venturi. Cu tubul Pitot, pentru Δh = 45 mm: v = √(2·9,81·0,045) = 0,94 m/s.</p>
<p><button type="button" data-scenariu="exemplu">Reproduce exemplul în simulator (d<sub>2</sub> = 10 mm, Δh<sub>1−3</sub> = 180 mm)</button></p>
<div class="problema"><h3>Problema 1 (întrebarea 4 din îndrumar)</h3><p>Un tub Pitot-Prandtl din tunelul aerodinamic indică Δp = 600 Pa; densitatea aerului este 1,2 kg/m³. Ce viteză are aerul?</p>
<details class="sol"><summary>Rezolvare</summary><p>v = √(2·Δp/ρ) = √(2·600/1,2) = √1000 = 31,6 m/s ≈ 114 km/h. Pentru aer se folosește relația (4.8); presiunea dinamică crește cu pătratul vitezei, deci la 200 km/h Δp ar fi ≈ 1850 Pa.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Cu tubul Venturi din exemplu (d<sub>2</sub> = 10 mm, C<sub>d</sub> = 0,97) se dorește un debit de 0,20 L/s. Ce diferență de nivel Δh<sub>1−3</sub> va apărea? Se poate citi pe panoul de 500 mm?</p>
<details class="sol"><summary>Rezolvare</summary><p>Q<sub>t</sub> = 0,20/0,97 = 0,2062 L/s; v<sub>2</sub> = 0,2062·10⁻³/7,854·10⁻⁵ = 2,625 m/s; Δh = v<sub>2</sub>²·(1 − 0,0256)/(2g) = 0,342 m = 342 mm. Diferența încape pe riglă, dar presiunea în gât scade foarte mult: dacă cota h<sub>3</sub> coboară sub priză, piezometrul gâtului aspiră aer. De aceea debitul maxim al unui Venturi este limitat de presiunea din gât (la lichide – și de cavitație).</p></details></div>
<div class="problema"><h3>Problema 3 – debitul EGR măsurat cu tub Venturi</h3><p>Pe conducta EGR a unui motor diesel este montat un tub Venturi cu d<sub>1</sub> = 40 mm, d<sub>2</sub> = 25 mm, C<sub>d</sub> = 0,97. Senzorul de presiune diferențială indică 1,2 kPa, iar densitatea gazelor recirculate este 0,9 kg/m³. Care este debitul masic de gaze recirculate?</p>
<details class="sol"><summary>Rezolvare</summary><p>(d<sub>2</sub>/d<sub>1</sub>)⁴ = 0,1526; v<sub>2</sub> = √(2·1200/(0,9·(1 − 0,1526))) = 56,1 m/s; A<sub>2</sub> = 4,909·10⁻⁴ m²; Q = 0,97·4,909·10⁻⁴·56,1 = 0,0267 m³/s; ṁ = ρ·Q = 0,024 kg/s ≈ 86 kg/h. Calculatorul ECU face aceeași operație, cu ρ calculată din presiunea și temperatura gazelor.</p></details></div>
<div class="problema"><h3>Problema 4 – pompa cu jet din rezervor</h3><p>Pompa cu jet este alimentată cu 30 L/h de benzină (ρ = 740 kg/m³) printr-o duză cu diametrul de 1,2 mm. Ce viteză are jetul și ce scădere de presiune (presiune dinamică) produce?</p>
<details class="sol"><summary>Rezolvare</summary><p>Q = 30/3600 L/s = 8,33·10⁻⁶ m³/s; A = π·0,0012²/4 = 1,131·10⁻⁶ m²; v = 7,37 m/s. ρv²/2 = 740·7,37²/2 = 20,1 kPa: presiunea statică din jurul jetului scade cu până la această valoare (sarcina v²/2g = 2,77 m), suficient pentru a aspira combustibilul peste „șaua” rezervorului, fără piese în mișcare.</p></details></div>`;
}
const INTREBARI = [
  ["Scrieți ecuația lui Bernoulli pentru lichidul real și explicați semnificația energetică a fiecărui termen.", "z + p/(ρg) + αv²/(2g) = const. − h<sub>r</sub>: energia de poziție, de presiune și cinetică, raportate la greutatea lichidului (sarcini în m coloană de lichid); h<sub>r</sub> este energia disipată prin frecări între cele două secțiuni."],
  ["De ce scade presiunea în gâtul tubului Venturi?", "Din continuitate, viteza crește invers proporțional cu aria (v<sub>2</sub> = v<sub>1</sub>·A<sub>1</sub>/A<sub>2</sub>); energia totală rămânând (aproape) aceeași, creșterea sarcinii cinetice se face pe seama sarcinii de presiune."],
  ["Ce reprezintă distanța verticală dintre linia energetică și linia piezometrică?", "Sarcina cinetică αv²/(2g) în secțiunea respectivă: mică la intrare (câțiva mm), maximă în gât."],
  ["Cum se măsoară viteza aerului cu tubul Pitot-Prandtl? Calculați viteza pentru Δp = 600 Pa și ρ = 1,2 kg/m³.", "Tubul are orificiul frontal (presiunea totală) și orificii laterale (presiunea statică); un manometru diferențial măsoară Δp = ρv²/2. v = √(2·600/1,2) = 31,6 m/s."],
  ["Cum funcționează pompa cu jet din rezervorul de combustibil?", "O parte din combustibilul refulat de pompa electrică (sau returul) trece printr-o duză: jetul rapid are presiune statică scăzută (Bernoulli) și antrenează combustibilul din cealaltă cameră a rezervorului („șa”), pe care îl trimite în vasul pompei – fără piese în mișcare."]
];
const TEST = [
  { q: "Ecuația de continuitate pentru un lichid incompresibil afirmă că:", o: ["viteza este aceeași în toate secțiunile", "debitul Q = v·A este același în toate secțiunile", "presiunea este aceeași în toate secțiunile", "energia crește în gât"], c: 1, e: "Masa (și volumul, la lichid incompresibil) se conservă: v<sub>1</sub>A<sub>1</sub> = v<sub>2</sub>A<sub>2</sub>." },
  { q: "Dacă diametrul scade la jumătate, viteza medie:", o: ["se dublează", "crește de 4 ori", "scade de 2 ori", "rămâne aceeași"], c: 1, e: "v ~ 1/A ~ 1/d²: (2)² = 4." },
  { q: "Piezometrul indică:", o: ["presiunea totală", "cota piezometrică z + p/(ρg)", "sarcina cinetică", "pierderea de sarcină"], c: 1, e: "Lichidul urcă în tub până la cota piezometrică; sarcina cinetică nu se vede în piezometru, ci în tubul Pitot." },
  { q: "Coeficientul de debit al unui tub Venturi bine executat este:", o: ["0,60…0,65", "0,95…0,99", "exact 1", "1,05…1,1"], c: 1, e: "Pierderile în confuzor sunt mici; o diafragmă are C<sub>d</sub> ≈ 0,6." },
  { q: "În regim turbulent, viteza din axă măsurată cu tubul Pitot raportată la viteza medie este:", o: ["0,5", "1", "1,1…1,25", "2"], c: 2, e: "Profilul turbulent este aplatizat; raportul 2 corespunde regimului laminar (parabolă)." },
  { q: "Senzorul Δp al filtrului de particule semnalează necesitatea regenerării deoarece:", o: ["Δp scade cu încărcarea", "la același debit de gaze, Δp crește cu încărcarea cu funingine", "măsoară temperatura", "măsoară viteza vehiculului"], c: 1, e: "Funinginea mărește rezistența hidraulică a filtrului; ECU compară Δp cu valoarea de referință la debitul de gaze dat." }
];

/* ------------------------------------------------------------------ aplicații la autovehicul */
function campuriCalc(cont, lista, fn) {
  cont.innerHTML = lista.map(([k, l, v]) => `<label class="camp">${l}<input type="number" step="any" data-k="${k}" value="${v}"></label>`).join("");
  $$("input", cont).forEach(i => i.addEventListener("input", fn));
}
const valCalc = cont => Object.fromEntries($$("input", cont).map(i => [i.dataset.k, num(i.value)]));
const EGR = [["d1", "d<sub>1</sub> conductă [mm]", 40], ["d2", "d<sub>2</sub> gât [mm]", 25], ["dp", "Δp senzor [kPa]", 1.2], ["p", "presiunea absolută [kPa]", 105], ["T", "temperatura gazelor [°C]", 120], ["Cd", "C<sub>d</sub>", 0.97], ["mAer", "debit de aer proaspăt (MAF) [kg/h]", 150]];
const PITOT = [["dp", "Δp Pitot-Prandtl [Pa]", 600], ["p", "presiunea atmosferică [kPa]", 101.3], ["T", "temperatura aerului [°C]", 20], ["S", "aria frontală a vehiculului [m²]", 2.2], ["F", "forța de rezistență măsurată [N]", 500]];
function calcAplicatii() {
  const e = valCalc($("#egr-in")), b4 = Math.pow(e.d2 / e.d1, 4), rho = e.p * 1000 / (287 * (e.T + 273.15)), A2 = Math.PI * Math.pow(e.d2 / 1000, 2) / 4;
  const v2 = Math.sqrt(2 * e.dp * 1000 / (rho * (1 - b4))), Qv = e.Cd * A2 * v2, m = Qv * rho * 3600, rata = m / (m + e.mAer) * 100;
  $("#egr-rez").innerHTML = `<div class="rezultat"><span>Densitatea gazelor ρ = p/(R·T)</span><b>${fmt(rho, 3)} kg/m³</b></div>
    <div class="rezultat"><span>Viteza în gât (4.3)</span><b>${fmt(v2, 1)} m/s</b></div>
    <div class="rezultat"><span>Debitul volumic Q = C<sub>d</sub>·A<sub>2</sub>·v<sub>2</sub></span><b>${fmt(Qv * 1000, 2)} L/s</b></div>
    <div class="rezultat"><span>Debitul masic de gaze recirculate</span><b>${fmt(m, 1)} kg/h</b></div>
    <div class="rezultat"><span>Rata EGR = ṁ<sub>EGR</sub>/(ṁ<sub>EGR</sub> + ṁ<sub>aer</sub>)</span><b>${fmt(rata, 1)} %</b></div>
    <p class="nota">Debitul crește doar cu √Δp: la Δp mic, eroarea senzorului contează mult – de aceea ECU folosește și un model al debitului (poziția supapei EGR).</p>`;
  const p = valCalc($("#pitot-in")), rhoA = p.p * 1000 / (287 * (p.T + 273.15)), v = Math.sqrt(2 * p.dp / rhoA), Cx = p.F / (p.dp * p.S);
  $("#pitot-rez").innerHTML = `<div class="rezultat"><span>Densitatea aerului ρ = p/(R·T)</span><b>${fmt(rhoA, 3)} kg/m³</b></div>
    <div class="rezultat"><span>Viteza aerului (4.8)</span><b>${fmt(v, 2)} m/s = ${fmt(v * 3.6, 1)} km/h</b></div>
    <div class="rezultat"><span>Coeficientul de rezistență c<sub>x</sub> = F/(Δp<sub>din</sub>·S)</span><b>${fmt(Cx, 3)}</b></div>
    <p class="nota">În tunel, Δp al tubului Pitot-Prandtl este chiar presiunea dinamică ρv²/2 din relația forței de rezistență F = c<sub>x</sub>·S·ρv²/2.</p>`;
}
/* pompa cu jet: animație cu particule */
const JET = { dn: 1.2, Qm: 30, nivS: 1, nivD: 0.55, part: [] };
function construiesteJet() {
  const svg = $("#svg-jet"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs);
  grad(defs, "gComb", [[0, "#f6d77a", 0.9], [1, "#d6a632", 0.95]]);
  const g = mk("g", {}, svg); JET.g = g;
  // rezervorul cu „șa”
  mk("path", { d: "M20 60 H700 V300 H420 V230 Q 360 190 300 230 V300 H20 Z", fill: "#f3f5f7", stroke: "#5b6672", "stroke-width": 3 }, g);
  JET.combS = mk("path", { d: "", fill: "url(#gComb)" }, g);
  JET.combD = mk("path", { d: "", fill: "url(#gComb)" }, g);
  // modulul pompei (dreapta) cu vasul tampon
  mk("rect", { x: 520, y: 110, width: 120, height: 188, rx: 8, fill: "none", stroke: "#2b3a4a", "stroke-width": 2.5 }, g);
  JET.vas = mk("rect", { x: 522, y: 200, width: 116, height: 96, fill: "url(#gComb)", opacity: 0.9 }, g);
  mk("rect", { x: 560, y: 150, width: 40, height: 110, rx: 6, fill: "url(#gOtelO)", stroke: "#333" }, g);
  const tpm = mk("text", { x: 588, y: 132, "font-size": 11, "text-anchor": "start", style: "fill:var(--text)" }, g); tpm.textContent = "pompa electrică";
  mk("path", { d: "M580 150 V30", fill: "none", stroke: "#2b3a4a", "stroke-width": 5 }, g);
  const tm = mk("text", { x: 590, y: 40, "font-size": 11, style: "fill:var(--text)" }, g); tm.textContent = "→ spre motor";
  // conducta de alimentare a jetului și pompa cu jet (stânga jos)
  mk("path", { d: "M560 250 H480 V150 H262 V280 H200", fill: "none", stroke: "#2f6f9e", "stroke-width": 5 }, g);
  mk("path", { d: "M200 272 L150 277 L150 283 L200 288 Z", fill: "url(#gAlama)", stroke: "#5f430f" }, g);                 // duza
  mk("path", { d: "M150 262 H120 V298 H150", fill: "none", stroke: "#2b3a4a", "stroke-width": 2 }, g);                   // camera de aspirație
  mk("path", { d: "M120 268 H70 Q 50 268 50 250 V120 Q 50 90 90 90 H500 Q 530 90 530 120 V200", fill: "none", stroke: "#2b3a4a", "stroke-width": 9, "stroke-linejoin": "round" }, g); // tubul de amestec spre vasul pompei
  mk("path", { d: "M120 268 H70 Q 50 268 50 250 V120 Q 50 90 90 90 H500 Q 530 90 530 120 V200", fill: "none", stroke: "#f3f5f7", "stroke-width": 5, "stroke-linejoin": "round" }, g);
  JET.pg = mk("g", {}, g);
  const tj = mk("text", { x: 150, y: 318, "font-size": 11, "text-anchor": "middle", style: "fill:var(--text)", "font-weight": 700 }, g); tj.textContent = "pompa cu jet (ejector)";
  const ts = mk("text", { x: 360, y: 182, "font-size": 11, "text-anchor": "middle", style: "fill:var(--text-sec)" }, g); ts.textContent = "„șaua” rezervorului";
  JET.lcd = afisajLCD(g, 220, 112, 120, 24, { unit: "Δp kPa", fundal: "#cfe6ff" });
  prefixeazaId(svg, "j4-");
  JET.part = [];
  for (let k = 0; k < 28; k++) JET.part.push({ s: Math.random(), el: mk("circle", { r: 2.4, fill: "#b8860b" }, JET.pg) });
}
function caleJet(s) {   // parametrizarea traseului duză → tub de amestec → vasul pompei
  const L = [[150, 280], [120, 268], [70, 268], [50, 250], [50, 120], [90, 90], [500, 90], [530, 120], [530, 200]];
  const d = []; let tot = 0; for (let i = 1; i < L.length; i++) { const l = Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); d.push(l); tot += l; }
  let r = s * tot; for (let i = 0; i < d.length; i++) { if (r <= d[i]) { const f = r / d[i]; return [L[i][0] + (L[i + 1][0] - L[i][0]) * f, L[i][1] + (L[i + 1][1] - L[i][1]) * f]; } r -= d[i]; }
  return L[L.length - 1];
}
function calcJet() {
  JET.dn = num($("#jet-dn").value); JET.Qm = num($("#jet-qm").value);
  const A = Math.PI * Math.pow(JET.dn / 1000, 2) / 4, v = JET.Qm / 3.6e6 / A, pd = 740 * v * v / 2, Qs = JET.Qm * 1.6 * clamp((pd / 1000 - 3) / 15, 0, 1.3);
  JET.v = v; JET.pd = pd; JET.Qs = Qs;
  $("#jet-rez").innerHTML = `<div class="rezultat"><span>Viteza jetului v = Q/A<sub>duză</sub></span><b>${fmt(v, 2)} m/s</b></div>
    <div class="rezultat"><span>Presiunea dinamică ρv²/2 (scăderea presiunii statice)</span><b>${fmt(pd / 1000, 1)} kPa</b></div>
    <div class="rezultat"><span>Sarcina cinetică v²/2g</span><b>${fmt(v * v / 2 / G, 2)} m</b></div>
    <div class="rezultat"><span>Debitul aspirat din camera stângă (estimativ)</span><b>${fmt(Qs, 0)} L/h</b></div>
    <p class="nota">Estimarea debitului aspirat folosește un raport de antrenare tipic de până la ≈ 2; sub ≈ 3 kPa de presiune dinamică jetul nu mai învinge pierderile tubului de amestec. Ejectorul are randament mic (20…30 %), dar nu are piese în mișcare și nu se uzează.</p>`;
}
function cadruJet(dt) {
  if (!JET.g) return;
  const sus = 75, jos = 296;
  if (JET.pornit) { JET.nivS = Math.max(0, JET.nivS - (JET.Qs || 0) * dt / 1500); JET.nivD = Math.min(1, JET.nivD + (JET.Qs || 0) * dt / 4000); }
  const yS = jos - JET.nivS * (jos - 240) - 4;
  JET.combS.setAttribute("d", JET.nivS > 0.01 ? `M23 ${yS} H297 V297 H23 Z` : "");
  const yD = jos - JET.nivD * (jos - sus) * 0.55;
  JET.combD.setAttribute("d", `M423 ${Math.min(yD, 296)} H697 V297 H423 Z`);
  const activ = JET.pornit && JET.nivS > 0.01 && JET.Qs > 0;
  JET.part.forEach(p => { if (activ) p.s = (p.s + dt * (0.08 + JET.v / 60)) % 1; const [x, y] = caleJet(p.s); p.el.setAttribute("cx", x); p.el.setAttribute("cy", y); p.el.setAttribute("opacity", activ ? 0.9 : 0.15); });
  JET.lcd(JET.pornit ? fmt(JET.pd / 1000, 1) : "0,0");
}

/* ------------------------------------------------------------------ definiția lucrării */
Cadru.porneste({
  disc: "MF", nr: 4, cod: "mf-l4",
  titlu: "Ecuația lui Bernoulli și măsurarea debitului: tubul Venturi și tubul Pitot",
  scurt: "Bernoulli: tubul Venturi și tubul Pitot",
  subtitlu: "Laborator virtual – banc hidraulic cu tub Venturi, piezometre și tub Pitot",
  parametri: M4.parametri,
  parametriDemo() { return Object.assign(M4.parametri(20261001), { d2: sim.d2Demo || 10, Cd: 0.967, kd: 0.17, kQ: 1, T: 20, Cp: 1, eh: [0, 0, 0, 0, 0, 0] }); },
  date: [
    { k: "d1", et: "d<sub>1</sub> intrare [mm]", v: 25, fix: true }, { k: "d2", et: "d<sub>2</sub> gât [mm]", v: 10 },
    { k: "T", et: "T apă [°C]", v: 20 }, { k: "sin", et: "sin α micromanometru", v: 0.2, fix: true }
  ],
  tabele: [
    { id: "t41", titlu: "Tabelul 4.1. Cotele piezometrice", antetRand: "Debit",
      randuri: RANDURI.map(k => ({ k, et: NUME_RAND[k] })),
      coloane: [1, 2, 3, 4, 5, 6].map(i => ({ k: "h" + i, t: `h${"₁₂₃₄₅₆"[i - 1]} [mm]`, intrare: true })).concat([{ k: "dh", t: "Δh₁₋₃ [mm]" }, { k: "pierd", t: "h₁ − h₆ [mm]" }]) },
    { id: "t42", titlu: "Tabelul 4.2. Debitul și coeficientul de debit", antetRand: "Debit", nota: "Debitul volumetric se măsoară de două ori pentru fiecare debit; Q măsurat este media celor două măsurători.",
      randuri: RANDURI.map(k => ({ k, et: NUME_RAND[k] })),
      coloane: [{ k: "V1", t: "V′ [L]", intrare: true }, { k: "t1", t: "t′ [s]", intrare: true }, { k: "V2", t: "V″ [L]", intrare: true }, { k: "t2", t: "t″ [s]", intrare: true },
        { k: "Q", t: "Q măsurat [L/s]" }, { k: "dh", t: "Δh₁₋₃ [mm]" }, { k: "Qt", t: "Q<sub>t</sub> [L/s]" }, { k: "Cd", t: "C<sub>d</sub>" }] },
    { id: "t43", titlu: "Tabelul 4.3. Tubul Pitot (în axa secțiunii de intrare)", antetRand: "Debit", nota: "Obligatoriu pentru Q₁; la Q₂ și Q₃ citirea este opțională (arată schimbarea profilului de viteze spre regimul laminar).",
      randuri: RANDURI.map(k => ({ k, et: NUME_RAND[k] })),
      coloane: [{ k: "l", t: "l micromanometru [mm]", intrare: true }, { k: "dh", t: "Δh Pitot = l·sin α [mm]" }, { k: "vP", t: "v Pitot [m/s]" }, { k: "vm", t: "v medie = Q/A₁ [m/s]" }, { k: "rap", t: "v Pitot / v medie" }, { k: "Re", t: "Re₁" }] },
    { id: "t44", titlu: "Tabelul 4.4. Linia piezometrică și linia energetică (calculat)", antetRand: "Priza",
      randuri: [1, 2, 3, 4, 5, 6].map(i => ({ k: "p" + i, et: NUME_PRIZA[i - 1] })),
      coloane: [{ k: "x", t: "x [mm]" }, { k: "d", t: "d [mm]" }, { k: "vQ1", t: "v (Q₁) [m/s]" }, { k: "qQ1", t: "v²/2g (Q₁) [mm]" }, { k: "EQ1", t: "E (Q₁) [mm]" },
        { k: "vQ2", t: "v (Q₂) [m/s]" }, { k: "EQ2", t: "E (Q₂) [mm]" }, { k: "vQ3", t: "v (Q₃) [m/s]" }, { k: "EQ3", t: "E (Q₃) [mm]" }] }
  ],
  calculeaza: calculeazaL4,
  intrebari(D) {
    return [
      { id: "q1", u: "", text: "Coeficientul de debit mediu C<sub>d</sub> al tubului vostru Venturi (media celor trei debite din Tabelul 4.2):", textSimplu: "Coeficientul de debit mediu Cd (Tabelul 4.2)" },
      { id: "q2", u: "m/s", text: `Viteza medie în gâtul tubului (d<sub>2</sub> = ${fmt(num(D.date.d2), 0)} mm) la debitul Q<sub>1</sub> măsurat volumetric:`, textSimplu: `Viteza medie în gât (d2 = ${num(D.date.d2)} mm) la Q1 măsurat` },
      { id: "q3", u: "m/s", text: "Viteza locală din axa secțiunii de intrare, măsurată cu tubul Pitot la Q<sub>1</sub>:", textSimplu: "Viteza locală măsurată cu tubul Pitot la Q1" },
      { id: "q4", u: "L/s", text: `Ce debit trece prin tubul vostru Venturi (d<sub>2</sub> = ${fmt(num(D.date.d2), 0)} mm) când Δh<sub>1−3</sub> = 100 mm, folosind C<sub>d</sub> mediu obținut de voi?`, textSimplu: `Debitul pentru Δh1-3 = 100 mm cu Cd mediu (d2 = ${num(D.date.d2)} mm)` }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    RANDURI.forEach(k => {
      const h = [1, 2, 3, 4, 5, 6].filter(i => t.t41[k]["h" + i] !== "").length;
      if (h < 6) l.push(`Tabelul 4.1, ${NUME_RAND[k]}: ${h}/6 cote`);
      const v = [1, 2].filter(j => t.t42[k]["V" + j] !== "" && t.t42[k]["t" + j] !== "").length;
      if (v < 2) l.push(`Tabelul 4.2, ${NUME_RAND[k]}: ${v}/2 măsurători de debit`);
    });
    if (t.t43.Q1.l === "") l.push("Tabelul 4.3: citirea tubului Pitot la Q₁");
    const dh = num(t.t41.Q1.h1) - num(t.t41.Q1.h3);
    if (Number.isFinite(dh) && dh < 150) l.push(`Q₁ trebuie să fie debitul mare (Δh₁₋₃ ≈ 200 mm; citit ${fmt(dh, 0)} mm)`);
    return l;
  },
  exemplu(D) {
    const pr = Object.assign(M4.parametri(1), { d2: 10, Cd: 0.967, kd: 0.17, kQ: 1, T: 20, Cp: 1, eh: [0, 0, 0, 0, 0, 0] });
    [["Q1", 180], ["Q2", 110], ["Q3", 50]].forEach(([k, dh], j) => {
      const a = M4.aPentruDh(dh, pr), c = M4.citiri(a, pr);
      c.h.forEach((x, i) => D.t.t41[k]["h" + (i + 1)] = x.toFixed(0));
      const t0 = 5 / c.Q;
      Object.assign(D.t.t42[k], { V1: "5.00", t1: t0.toFixed(2), V2: "5.00", t2: (t0 * (j % 2 ? 0.997 : 1.004)).toFixed(2) });
      D.t.t43[k].l = (Math.round(c.l * 2) / 2).toFixed(1);
    });
    Object.assign(D.date, { d2: 10, T: 20 });
  },
  scenariu(id, C) {
    sim.d2Demo = 10; $("#in-d2").value = 10; Object.assign(C.D.date, { d2: 10 }); C.P = C.parametri();
    sim.defect = "none"; $("#in-defect").value = "none"; construiesteSVG(); C.construiesteDateLucru();
    ["#ck-nssm1", "#ck-nssm2"].forEach(s => $(s).checked = true);
    if (sim.a < 5) sim.a = 10;
    sim.pompa = true; sim.aerisit = true; sim.bule = [0, 0, 0, 0, 0, 0]; sim.pitot = true; actualizeazaButoane();
    sim.tinta = Math.round(M4.aPentruDh(180, C.P) * 10) / 10;
    C.mesajTemporar("Exemplul: d₂ = 10 mm; robinetul se reglează pentru Δh₁₋₃ ≈ 180 mm. Comparați cu exemplul (5 L în ≈ 34,6 s, Cd ≈ 0,967).", "");
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Presiunea diferențială și debitul pe autoturismul modern",
    intro: `<p>Pe autoturism, debitele se măsoară frecvent prin diferență de presiune, exact ca la tubul Venturi și la tubul Pitot: <b>senzorul de presiune diferențială al filtrului de particule</b> (GPF/DPF) compară presiunea din amonte și din aval de filtru – la același debit de gaze, Δp crește cu încărcarea cu funingine și ECU decide regenerarea. Porniți motorul, accelerați și urmăriți pe osciloscop cum Δp al filtrului (CH1) urmează debitul de aer măsurat de debitmetru (CH2).</p>`,
    dupa: `<p class="nota">Debitul de gaze crește cu turația și sarcina; prin filtru (mediu poros) Δp este aproximativ proporțional cu debitul, iar printr-un Venturi Δp ~ Q² (relațiile 4.3–4.5).</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "gpf", canale: ["maf"] })
  },
  referat: {
    scop: "Verificarea experimentală a ecuației lui Bernoulli prin trasarea liniei piezometrice și a liniei energetice într-un tub Venturi, determinarea coeficientului de debit și măsurarea vitezei locale cu tubul Pitot.",
    relatii: "Q = v<sub>1</sub>A<sub>1</sub> = v<sub>2</sub>A<sub>2</sub>; &nbsp; z + p/(ρg) + v²/(2g) = const. − h<sub>r</sub>; &nbsp; v<sub>2</sub> = √(2gΔh/(1 − (A<sub>2</sub>/A<sub>1</sub>)²)); &nbsp; Q<sub>t</sub> = A<sub>2</sub>v<sub>2</sub>; &nbsp; C<sub>d</sub> = Q/Q<sub>t</sub>; &nbsp; Δh = l·sin α; &nbsp; v = √(2gΔh).",
    varianta: D => `Tubul vostru: d<sub>1</sub> = 25 mm, d<sub>2</sub> = ${fmt(num(D.date.d2), 0)} mm (A<sub>2</sub>/A<sub>1</sub> = ${fmt(Math.pow(num(D.date.d2) / 25, 2), 4)}); apa la ${fmt(num(D.date.T), 1)} °C.`,
    indicatii: "Comparați Cd cu 0,95…0,99, descrieți forma liniei piezometrice și a liniei energetice, explicați pierderea h₁ − h₆, comparați viteza Pitot cu viteza medie (regimul de curgere) și legătura cu senzorii de presiune diferențială de pe autovehicul…"
  },
  subsol: "Modelul: continuitate și Bernoulli cu pierderi – confuzor (stabilește C<sub>d</sub>) și difuzor (Borda–Carnot), profil de viteze dependent de Re pentru tubul Pitot, robinet de reglare cu caracteristică neliniară. Fiecare student are diametrul gâtului, C<sub>d</sub>, pierderile, temperatura apei și erorile de zero ale piezometrelor proprii.",
  continut: {
    teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST,
    aplicatii: {
      titluTab: "Aplicații la autovehicul",
      html: `
  <div class="card">
    <h2>Animație: pompa cu jet din rezervorul de combustibil</h2>
    <p class="nota">Rezervoarele autoturismelor cu tracțiune integrală sau cu evacuarea pe sub podea au o „șa”: combustibilul din camera stângă nu ajunge singur la pompă. O parte din debitul pompei electrice trece printr-o duză; jetul rapid are presiune statică scăzută (Bernoulli) și aspiră combustibilul din camera stângă.</p>
    <svg id="svg-jet" viewBox="0 0 720 330" role="img" aria-label="Rezervor de combustibil cu șa, modulul pompei și pompa cu jet" style="width:100%;height:auto;display:block"></svg>
    <div class="doua">
      <label class="camp">Debitul jetului (motor) [L/h]<input type="range" id="jet-qm" min="5" max="60" step="1" value="30"></label>
      <label class="camp">Diametrul duzei [mm]<input type="range" id="jet-dn" min="0.8" max="2.4" step="0.1" value="1.2"></label>
    </div>
    <div class="rand-butoane"><button type="button" class="primar" id="btn-jet">Pornește / oprește pompa</button><button type="button" id="btn-jet-r">Reumple rezervorul</button></div>
    <div id="jet-rez"></div>
  </div>
  <div class="det-grila">
    <div class="card">
      <h2>Debitul EGR măsurat cu tub Venturi</h2>
      <p class="nota">La unele motoare diesel, debitul de gaze recirculate se calculează din Δp al unui tub Venturi pe conducta EGR (relațiile 4.3–4.5, cu ρ din presiune și temperatură).</p>
      <div class="doua" id="egr-in"></div>
      <div id="egr-rez"></div>
    </div>
    <div class="card">
      <h2>Tubul Pitot-Prandtl în tunelul aerodinamic</h2>
      <p class="nota">Viteza aerului se obține din presiunea dinamică (4.8); cu forța măsurată de balanța tunelului rezultă coeficientul de rezistență aerodinamică.</p>
      <div class="doua" id="pitot-in"></div>
      <div id="pitot-rez"></div>
    </div>
  </div>`,
      init(C) {
        campuriCalc($("#egr-in"), EGR, calcAplicatii); campuriCalc($("#pitot-in"), PITOT, calcAplicatii);
        construiesteJet(); calcJet(); JET.pornit = true;
        ["#jet-qm", "#jet-dn"].forEach(s => $(s).addEventListener("input", calcJet));
        $("#btn-jet").addEventListener("click", () => { JET.pornit = !JET.pornit; });
        $("#btn-jet-r").addEventListener("click", () => { JET.nivS = 1; JET.nivD = 0.55; });
      },
      cadru(dt) { cadruJet(dt); },
      redeseneaza() { if ($("#tab-aplicatii").classList.contains("activ")) calcAplicatii(); }
    }
  },
  sim: {
    html: `<div class="sim-grila">
    <div class="card sim-scena scena">
      <svg id="svg-venturi" viewBox="0 0 900 500" role="img" aria-label="Banc hidraulic: pompă, robinet de reglare, tub Venturi cu 6 prize piezometrice, panou de piezometre, tub Pitot cu micromanometru înclinat, vas volumetric și cronometru"></svg>
      <div class="afisaje">
        <div class="afisaj"><span>Robinet de reglare</span><b id="af-a">0,0</b><small>% deschidere</small></div>
        <div class="afisaj"><span>Δh₁₋₃ (piezometre)</span><b id="af-dh">0</b><small>mm</small></div>
        <div class="afisaj"><span>Vas volumetric</span><b id="af-V">0,00</b><small>L (citit pe gradații)</small></div>
        <div class="afisaj"><span>Cronometru</span><b id="af-t">0,00</b><small>s</small></div>
      </div>
      <div class="citiri4" id="citiri4" aria-live="off"></div>
      <div class="grafic-mic"><canvas id="cv-live" height="230" aria-label="Cotele piezometrice în lungul tubului, în timp real"></canvas></div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-nssm1"> Priză cu protecție diferențială, mâini uscate, podea uscată</label>
      <label class="bifa"><input type="checkbox" id="ck-nssm2"> Racorduri strânse, piezometre fixate</label>
      <h2>Standul vostru</h2>
      <p class="nota" id="nota-stand"></p>
      <label class="camp" data-doar-demo>d<sub>2</sub> gât [mm]<select id="in-d2">${M4.GATURI.map(v => `<option>${v}</option>`).join("")}</select></label>
      <div class="rand-butoane">
        <button type="button" id="btn-pompa">Pornește pompa</button>
        <button type="button" id="btn-aer">Aerisește tubul și piezometrele</button>
      </div>
      <h2>Robinetul de reglare</h2>
      <p class="nota">Țineți apăsat pentru manevrare continuă (lentă); reglați fin cu butoanele sau tastele ↑ ↓ (Shift = 5 %).</p>
      <div class="rand-butoane">
        <button type="button" class="tine" id="btn-inchide">▼ Închide (ține)</button>
        <button type="button" class="tine" id="btn-deschide">▲ Deschide (ține)</button>
      </div>
      <div class="roata-butoane">
        <button type="button" data-da="-5">−5</button><button type="button" data-da="-1">−1</button><button type="button" data-da="-0.1">−0,1</button>
        <button type="button" data-da="0.1">+0,1</button><button type="button" data-da="1">+1</button><button type="button" data-da="5">+5</button>
      </div>
      <label class="camp" data-doar-demo>Reglează Δh₁₋₃ la <span class="inline"><select id="sel-dh">${[220, 200, 180, 150, 110, 80, 50, 30].map(v => `<option>${v}</option>`).join("")}</select><button type="button" id="btn-dh">mm</button></span></label>
      <h2>Înregistrare</h2>
      <label class="camp">Rândul din tabele (debitul curent)<select id="sel-rand">${RANDURI.map(k => `<option value="${k}">${NUME_RAND[k]}${k === "Q1" ? " – debit mare" : k === "Q2" ? " – mediu" : " – mic"}</option>`).join("")}</select></label>
      <button type="button" class="primar lat" id="btn-piezo">● Înregistrează nivelurile piezometrelor (Tab. 4.1)</button>
      <h2>Măsurarea volumetrică a debitului</h2>
      <div class="rand-butoane">
        <button type="button" id="btn-col">▶ Pornește colectarea</button>
        <button type="button" id="btn-stop">■ Oprește</button>
        <button type="button" id="btn-gol">Golește vasul</button>
      </div>
      <label class="bifa"><input type="checkbox" id="ck-rapid"> Timp accelerat ×4 (simularea și cronometrul)</label>
      <button type="button" class="lat" id="btn-vol">Înregistrează V și t (Tab. 4.2)</button>
      <h2>Tubul Pitot</h2>
      <button type="button" id="btn-mont">Montează tubul Pitot</button>
      <button type="button" class="lat" id="btn-pitot">Înregistrează l de pe micromanometru (Tab. 4.3)</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari">
        <summary>Defecte de diagnosticat (mod demonstrativ)</summary>
        <label class="camp">Situația <select id="in-defect" data-blocat-eval>
          <option value="none">fără defect</option><option value="aer3">aer în furtunul piezometrului 3 (gât)</option>
          <option value="pitot">tubul Pitot rotit cu 25° față de curent</option><option value="vas">robinetul de golire al vasului neetanș</option></select></label>
      </details>
      <details class="setari"><summary>Afișare</summary>
        <label class="bifa"><input type="checkbox" id="ck-et" checked> Etichete pe schemă</label>
        <label class="bifa"><input type="checkbox" id="ck-linp" checked> Linia piezometrică pe panou</label>
        <label class="bifa" data-doar-demo><input type="checkbox" id="ck-line"> Linia energetică (modelul, doar demonstrativ)</label>
      </details>
    </aside>
  </div>`,
    init(C) {
      if (!MOD.eval && M4.GATURI.includes(num(C.D.date.d2))) { sim.d2Demo = num(C.D.date.d2); C.P = C.parametri(); }
      construiesteSVG();
      const tine = (btn, dir) => {
        const on = e => { e.preventDefault(); sim.tinta = null; sim.tine = dir; btn.classList.add("apasat"); };
        const off = () => { if (sim.tine === dir) sim.tine = 0; btn.classList.remove("apasat"); };
        btn.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, off));
      };
      tine($("#btn-deschide"), 1); tine($("#btn-inchide"), -1);
      $$("[data-da]").forEach(b => b.addEventListener("click", () => schimbaA(sim.a + num(b.dataset.da))));
      $("#btn-dh").addEventListener("click", () => { if (!sim.pompa) return C.mesajTemporar("Porniți întâi pompa.", "atentie"); sim.tinta = Math.round(M4.aPentruDh(num($("#sel-dh").value), prEfectiv()) * 10) / 10; });
      $("#btn-pompa").addEventListener("click", () => {
        if (!sim.pompa) {
          if (!$("#ck-nssm1").checked || !$("#ck-nssm2").checked) return C.mesajTemporar("Bifați verificările NSSM înainte de a porni pompa.", "atentie");
          if (sim.a < 5) return C.mesajTemporar("Pompa se pornește cu robinetul de reglare parțial deschis (cel puțin 5 %).", "atentie");
          sim.pompa = true;
          if (!sim.aerisit) sim.bule = [0, 1, 2, 3, 4, 5].map(() => (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 10));
        } else {
          if (sim.a > 10) C.mesajTemporar("Închideți lent robinetul înainte de a opri pompa (evitați șocul de presiune).", "atentie");
          sim.pompa = false; sim.colect = false;
        }
        actualizeazaButoane();
      });
      $("#btn-aer").addEventListener("click", () => {
        if (!sim.pompa) return C.mesajTemporar("Aerisirea se face cu pompa pornită și debit mic: aerul este împins prin robinetele de aerisire.", "atentie");
        sim.aerisit = true; sim.bule = [0, 0, 0, 0, 0, 0]; C.mesajTemporar("Aerul a fost eliminat din tub și din furtunurile piezometrelor.", "");
      });
      $("#sel-rand").addEventListener("change", e => { sim.rand = e.target.value; });
      $("#btn-piezo").addEventListener("click", inregPiezo);
      $("#btn-col").addEventListener("click", startColectare);
      $("#btn-stop").addEventListener("click", stopColectare);
      $("#btn-gol").addEventListener("click", golesteVas);
      $("#btn-vol").addEventListener("click", inregVolum);
      $("#btn-mont").addEventListener("click", () => { sim.pitot = !sim.pitot; actualizeazaButoane(); });
      $("#btn-pitot").addEventListener("click", inregPitot);
      $("#ck-rapid").addEventListener("change", e => { sim.viteza = e.target.checked ? 4 : 1; });
      $("#in-defect").addEventListener("change", e => { sim.defect = e.target.value; });
      $("#ck-et").addEventListener("change", e => { sim.etichete = e.target.checked; });
      $("#ck-linp").addEventListener("change", e => { sim.linPiezo = e.target.checked; });
      $("#ck-line").addEventListener("change", e => { sim.linEnerg = e.target.checked; });
      $("#in-d2").addEventListener("change", () => { sim.d2Demo = num($("#in-d2").value); C.P = C.parametri(); Object.assign(C.D.date, { d2: sim.d2Demo }); C.construiesteDateLucru(); construiesteSVG(); notaStand(); C.recalculeaza(); C.salveaza(); });
      document.addEventListener("keydown", e => {
        if (!$("#tab-sim").classList.contains("activ") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); schimbaA(sim.a + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 5 : 1)); }
        if (e.key === "Enter") inregPiezo(e);
      });
      $("#in-d2").value = C.P.d2; sim.d2Demo = C.P.d2;
      notaStand(); actualizeazaButoane();
      C.mesaj("Verificați standul (NSSM), deschideți parțial robinetul, porniți pompa și aerisiți tubul și piezometrele.", "");
    },
    aplicaEval(P, C) {
      Object.assign(C.D.date, { d2: P.d2, T: P.T });
      ["#in-d2", "#in-defect"].forEach(id => { const el = $(id); if (el) el.disabled = true; });
      Object.assign(sim, { defect: "none", a: 0, aEf: 0, tinta: null, pompa: false, aerisit: false, colect: false, Vvas: 0, tCron: 0, pitot: false, linEnerg: false });
      if (SV.g) { construiesteSVG(); notaStand(); actualizeazaButoane(); }
    },
    reset() { Object.assign(sim, { a: 0, aEf: 0, tinta: null, pompa: false, aerisit: false, colect: false, Vvas: 0, tCron: 0, pitot: false }); if (SV.g) actualizeazaButoane(); },
    laGolire(C) { C.D.varianta.a = {}; },
    cadru(dt0, C, vizibil) {
      const dt = dt0 * sim.viteza;
      if (sim.tine) { sim.acc = (sim.acc || 0) + sim.tine * 6 * dt0; if (Math.abs(sim.acc) >= 0.1) { const pas = Math.trunc(sim.acc * 10) / 10; sim.acc -= pas; schimbaA(sim.a + pas); } } else sim.acc = 0;
      if (sim.tinta !== null) { const d = sim.tinta - sim.a, pas = 8 * dt0; if (Math.abs(d) <= pas) { sim.a = sim.tinta; sim.tinta = null; } else sim.a = Math.round((sim.a + Math.sign(d) * pas) * 100) / 100; }
      const aT = sim.pompa ? sim.a : 0;
      sim.aEf += (aT - sim.aEf) * (1 - Math.exp(-dt / 0.6)); if (Math.abs(aT - sim.aEf) < 0.01) sim.aEf = aT;
      const t = tinte(), kH = 1 - Math.exp(-dt / 1.2);
      sim.hAf = sim.hAf.map((h, i) => { const n = h + (t.h[i] - h) * kH; return Math.abs(t.h[i] - n) < 0.02 ? t.h[i] : n; });
      sim.lAf += (t.l - sim.lAf) * (1 - Math.exp(-dt / 1.5)); if (Math.abs(t.l - sim.lAf) < 0.02) sim.lAf = t.l;
      const A = t.s ? Math.min(0.9, 0.2 + 0.003 * t.s.q[2]) : 0, kz = Math.min(1, dt0 * 3);
      sim.zg = sim.zg.map(z => z + ((Math.random() - 0.5) * 2 * A - z) * kz);
      sim.zgL += ((Math.random() - 0.5) * (t.s && sim.pitot ? 0.4 : 0) - sim.zgL) * kz;
      if (sim.colect) {
        const Q = sim.pompa ? M4.debit(sim.aEf, prEfectiv()) : 0;
        sim.Vvas += Q * dt - (sim.defect === "vas" ? 0.006 * dt : 0); sim.tCron += dt;
        if (sim.Vvas > VAS.max) { sim.Vvas = VAS.max; sim.preaplin = true; sim.colect = false; C.mesajTemporar("Vasul volumetric a dat pe dinafară! Măsurarea nu este valabilă: goliți vasul și repetați.", "pericol"); }
      } else if (sim.defect === "vas" && sim.Vvas > 0) sim.Vvas = Math.max(0, sim.Vvas - 0.006 * dt);
      if (!vizibil) return;
      miscaParticule(dt0);
      if (SV.rotor && sim.pompa) { this._rot = ((this._rot || 0) + dt0 * 900) % 360; SV.rotor.setAttribute("transform", `rotate(${this._rot} 70 457)`); }
      actualizeazaSVG();
      const now = performance.now();
      if (now - (this._ta || 0) > 120) {
        this._ta = now;
        const h = [0, 1, 2, 3, 4, 5].map(citireH);
        $("#af-a").textContent = fmt(sim.a, 1); $("#af-dh").textContent = sim.pompa ? String(h[0] - h[2]) : "0";
        $("#af-V").textContent = fmt(VcititVas(), 2); $("#af-t").textContent = fmt(sim.tCron, 2);
        $("#citiri4").innerHTML = h.map((x, i) => `<span><small>h${"₁₂₃₄₅₆"[i]}</small><b>${x}</b></span>`).join("") + `<span><small>l Pitot</small><b>${sim.pitot ? fmt(citireL(), 1) : "—"}</b></span><span><small>T apă</small><b>${fmt(P().T, 1)} °C</b></span>`;
        C.stare(1, !sim.pompa ? "pompa oprită" : !sim.aerisit ? "aer în tub și în piezometre!" : stabil() ? "regim stabilizat" : "niveluri în stabilizare…", !sim.pompa ? "" : !sim.aerisit ? "rau" : stabil() ? "inc" : "");
        C.stare(2, `d₂ = ${P().d2} mm · rândul ${NUME_RAND[sim.rand]}${sim.colect ? " · colectare în curs" : ""}`);
        if (sim.pompa && h.some(x => x < 5)) C.mesajAuto("Cota în gât a coborât sub zero: piezometrul 3 aspiră aer. Micșorați debitul.", "pericol");
        else if (Date.now() - (sim.tBerbec || 0) < 3000) C.mesajAuto("Închidere bruscă a robinetului: pericol de lovitură de berbec! Manevrați robinetul lent.", "pericol");
        else if (!$("#ck-nssm1").checked || !$("#ck-nssm2").checked) C.mesajAuto("Bifați verificările NSSM înainte de a porni bancul hidraulic.", "atentie");
        else C.mesajAuto("");
      }
      if (now - (this._tl || 0) > 250) { this._tl = now; deseneazaLive(); }
    },
    redeseneaza() { deseneazaLive(); },
    formule(C) {
      const pr = P(), d2 = pr.d2, b4 = Math.pow(d2 / D1, 4), h = [0, 1, 2, 3, 4, 5].map(citireH), dh = h[0] - h[2];
      const v2 = dh > 0 ? Math.sqrt(2 * G * dh / 1000 / (1 - b4)) : NaN, A2 = M4.aria(d2), Qt = v2 * A2 * 1e-3, v1 = v2 * Math.pow(d2 / D1, 2);
      const l = citireL(), dhP = l * SIN_M, vP = Math.sqrt(2 * G * dhP / 1000);
      return [
        ["Raportul ariilor (4.1)", `A<sub>2</sub>/A<sub>1</sub> = (d<sub>2</sub>/d<sub>1</sub>)² = (${d2}/25)² = <span class="rez">${fmt(Math.pow(d2 / D1, 2), 4)}</span>`],
        ["Viteza în gât (4.3)", sim.pompa && dh > 0 ? `v<sub>2</sub> = √(2·9,81·${fmt(dh / 1000, 3)}/${fmt(1 - b4, 4)}) = <span class="rez">${fmt(v2, 3)} m/s</span>` : "—"],
        ["Debitul teoretic (4.4)", sim.pompa && dh > 0 ? `Q<sub>t</sub> = A<sub>2</sub>·v<sub>2</sub> = ${fmt(A2, 2)} mm²·${fmt(v2, 3)} m/s = <span class="rez">${fmt(Qt, 4)} L/s</span>` : "—"],
        ["Continuitatea (4.1)", sim.pompa && dh > 0 ? `v<sub>1</sub> = v<sub>2</sub>·A<sub>2</sub>/A<sub>1</sub> = <span class="rez">${fmt(v1, 3)} m/s</span>; v<sub>1</sub>²/2g = ${fmt(v1 * v1 / 2 / G * 1000, 1)} mm` : "—"],
        ["Tubul Pitot (4.18, 4.7)", sim.pitot && sim.pompa ? `Δh = l·sin α = ${fmt(l, 1)}·0,2 = ${fmt(dhP, 2)} mm; v = √(2gΔh) = <span class="rez">${fmt(vP, 3)} m/s</span>` : "tubul Pitot nu este montat"]
      ];
    }
  }
});
function schimbaA(a) {
  const vechi = sim.a; seteazaA(a);
  if (sim.a < vechi && sim.pompa) {
    const now = performance.now(); sim.ist = (sim.ist || []).filter(x => now - x.t < 1000); sim.ist.push({ t: now, d: vechi - sim.a });
    if (sim.ist.reduce((s, x) => s + x.d, 0) > 12) sim.tBerbec = Date.now();
  }
  if (sim.colect && Math.abs(sim.a - vechi) > 0) $("#msg-inreg").textContent = "Atenție: robinetul a fost manevrat în timpul colectării – măsurarea volumetrică nu va fi valabilă.";
}
function actualizeazaButoane() {
  $("#btn-pompa").textContent = sim.pompa ? "Oprește pompa" : "Pornește pompa";
  $("#btn-mont").textContent = sim.pitot ? "Demontează tubul Pitot" : "Montează tubul Pitot";
}
function notaStand() { const p = P(); $("#nota-stand").innerHTML = `Tub Venturi d<sub>1</sub> = 25 mm, gât d<sub>2</sub> = <b>${p.d2} mm</b> (A<sub>2</sub>/A<sub>1</sub> = ${fmt(Math.pow(p.d2 / 25, 2), 4)}), confuzor 21°, difuzor 7°; vas volumetric 6 L; micromanometru Pitot 1:5. Apa la <b>${fmt(p.T, 1)} °C</b>.`; }
