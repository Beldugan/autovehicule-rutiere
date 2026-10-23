/* MF – Lucrarea 1. Vâscozitatea uleiurilor de motor în funcție de temperatură.
   Simulator: baie termostatată cu circulație + vâscozimetru cu bilă Höppler cu manta + cronometru + areometru. */
"use strict";
const M1 = MODELE["mf-l1"];
const { ULEI, BILE, TEMP } = M1;

/* ------------------------------------------------------------------ starea simulatorului */
const sim = {
  proba: "A", cheieA: "5W-30", bila: "B4",
  Tset: 40, Tb: 21, Ts: 21, s: 12, v: 0, rot: 0, rotind: false, umplere: 1, golit: false,
  ch: { merge: false, val: 0, s0: null, s1: null }, rapid: 1, etichete: true, ultimaInreg: null
};
const L_TUB = 200, R1 = 50, R2 = 150;          // mm: lungimea tubului, reperele
const ST = { SC: 1.75 };                           // px / mm în desen
function P() { return Cadru.P; }
function tc() { return P().tc; }
function Tafis() { return Math.round((sim.Ts - P().dT) * 10) / 10; }
function cheieProba(o) { return o === "U" ? "UZAT" : (MOD.eval ? P().uleiA : sim.cheieA); }
function prCurent() { return MOD.eval ? P() : Object.assign({}, P(), { uleiA: sim.cheieA }); }
function timpAdevarat() { return M1.timpCadere(sim.proba, sim.Ts - P().dT, sim.bila, prCurent()); }

/* ------------------------------------------------------------------ desenul (SVG realist) */
const SV = { g: null };
function construiesteSVG() {
  const svg = $("#svg-hoppler"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs);
  grad(defs, "gInox", [[0, "#8d949b"], [0.12, "#d6dade"], [0.3, "#f4f6f7"], [0.55, "#b5bbc1"], [0.8, "#e3e6e9"], [1, "#7c838a"]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gInoxV", [[0, "#f1f3f4"], [0.5, "#c3c8cd"], [1, "#8f969d"]]);
  grad(defs, "gManta", [[0, "#9fc7e6", 0.55], [0.15, "#ffffff", 0.45], [0.35, "#cfe6f7", 0.18], [0.7, "#bcdcf2", 0.22], [0.88, "#ffffff", 0.4], [1, "#7fb0d6", 0.6]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gBazaA", [[0, "#4166a8"], [0.5, "#27467e"], [1, "#132a52"]]);
  grad(defs, "gBilaOtel", [[0, "#ffffff"], [0.25, "#e9edf1"], [0.6, "#8b949d"], [1, "#2f353b"]], { radial: true, cx: 0.5, cy: 0.5, r: 0.55, fx: 0.33, fy: 0.3 });
  grad(defs, "gBilaSticla", [[0, "#ffffff", 0.95], [0.35, "#e6f3ff", 0.5], [0.8, "#9cc3e6", 0.45], [1, "#5b86ad", 0.8]], { radial: true, cx: 0.5, cy: 0.5, r: 0.55, fx: 0.35, fy: 0.3 });
  grad(defs, "gFurtun", [[0, "#5d9fcf", 0.85], [0.35, "#cfe9fb", 0.75], [0.6, "#8cc1e6", 0.7], [1, "#3f7fb0", 0.9]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  grad(defs, "gCron", [[0, "#3a3f46"], [0.5, "#1d2025"], [1, "#0d0f12"]]);
  const pat = mk("pattern", { id: "pGrila", width: 8, height: 6, patternUnits: "userSpaceOnUse" }, defs);
  mk("rect", { width: 8, height: 6, fill: "#9aa1a8" }, pat); mk("rect", { y: 1, width: 8, height: 2.4, fill: "#2b3036" }, pat);
  filtre(defs);
  const g = mk("g", {}, svg); SV.g = g;
  // masa de laborator
  mk("rect", { x: 0, y: 472, width: 900, height: 48, fill: "#d7dbe0" }, g);
  mk("rect", { x: 0, y: 472, width: 900, height: 3, fill: "#eef0f3" }, g);

  /* --- baia termostatată (stânga) */
  const bx = 24, by = 250, bw = 270, bh = 222;
  mk("rect", { x: bx + 10, y: by + bh - 4, width: bw - 20, height: 10, rx: 4, fill: "#000", opacity: 0.18, filter: "url(#fBlur6)" }, g);
  mk("rect", { x: bx, y: by, width: bw, height: bh, rx: 10, fill: "url(#gInox)", stroke: "#6c737a" }, g);
  mk("rect", { x: bx - 4, y: by - 16, width: bw + 8, height: 22, rx: 6, fill: "url(#gInoxV)", stroke: "#6c737a" }, g);
  mk("path", { d: `M${bx + 90} ${by - 16} v-14 q0 -6 6 -6 h78 q6 0 6 6 v14`, fill: "none", stroke: "#2f4f7a", "stroke-width": 7, "stroke-linecap": "round" }, g);
  mk("rect", { x: bx + 14, y: by + 112, width: bw - 28, height: 92, rx: 4, fill: "url(#pGrila)", opacity: 0.85 }, g);
  // panoul de comandă
  mk("rect", { x: bx + 18, y: by + 18, width: 170, height: 80, rx: 8, fill: "#1f3f66", stroke: "#0d2240" }, g);
  SV.lcdSet = afisajLCD(g, bx + 30, by + 28, 92, 26, { unit: "SET °C", fundal: "#9fd0ff" });
  SV.lcdAct = afisajLCD(g, bx + 30, by + 62, 92, 26, { unit: "BAIE °C", fundal: "#bde3c0" });
  const btn = (x, y, txt, fn) => { const b = mk("g", { class: "svg-buton", style: "cursor:pointer" }, g); mk("circle", { cx: x, cy: y, r: 11, fill: "url(#gAlbastru)", stroke: "#0d2240" }, b); const t = mk("text", { x, y: y + 4.5, "text-anchor": "middle", "font-size": 13, fill: "#fff", "font-weight": 700 }, b); t.textContent = txt; b.addEventListener("click", fn); return b; };
  btn(bx + 145, by + 42, "▲", () => seteazaT(sim.Tset + 5)); btn(bx + 145, by + 76, "▼", () => seteazaT(sim.Tset - 5));
  SV.ledInc = mk("circle", { cx: bx + 172, cy: by + 34, r: 4, fill: "#5a1d1d" }, g);
  const t1 = mk("text", { x: bx + 172, y: by + 52, "font-size": 8, fill: "#cfe1f5", "text-anchor": "middle" }, g); t1.textContent = "ÎNC.";
  SV.ledPomp = mk("circle", { cx: bx + 172, cy: by + 68, r: 4, fill: "#1d5a2a" }, g);
  const t2 = mk("text", { x: bx + 172, y: by + 86, "font-size": 8, fill: "#cfe1f5", "text-anchor": "middle" }, g); t2.textContent = "POMPĂ";
  const tb = mk("text", { x: bx + 205, y: by + 40, "font-size": 11, fill: "#2b3036", "font-weight": 700 }, g); tb.textContent = "Termostat";
  const tb2 = mk("text", { x: bx + 205, y: by + 54, "font-size": 9, fill: "#4b5259" }, g); tb2.textContent = "cu circulație";
  // racorduri baie
  [[by + 70], [by + 140]].forEach(([y]) => { mk("rect", { x: bx + bw - 2, y: y - 9, width: 16, height: 18, rx: 2, fill: "url(#gAlama)" }, g); mk("rect", { x: bx + bw + 12, y: y - 6, width: 12, height: 12, fill: "url(#gCrom)" }, g); });

  /* --- vâscozimetrul (centru) */
  const cx = 560, cy = 250;                  // centrul de rotație al tubului
  SV.cx = cx; SV.cy = cy;
  // baza și coloana
  mk("ellipse", { cx: 560, cy: 470, rx: 150, ry: 9, fill: "#000", opacity: 0.18, filter: "url(#fBlur6)" }, g);
  mk("path", { d: "M420 452 h280 l12 16 h-304 z", fill: "url(#gBazaA)", stroke: "#0d1d3a" }, g);
  mk("rect", { x: 408, y: 466, width: 304, height: 6, rx: 2, fill: "#14264a" }, g);
  [430, 690].forEach(x => { mk("rect", { x: x - 10, y: 470, width: 20, height: 6, rx: 2, fill: "#222" }, g); });
  mk("rect", { x: 664, y: 90, width: 16, height: 366, fill: "url(#gCromO)", stroke: "#59606a", "stroke-width": 0.6 }, g);
  mk("rect", { x: 655, y: 440, width: 34, height: 16, rx: 3, fill: "url(#gAlbastru)" }, g);
  // brațul de prindere cu articulație
  mk("rect", { x: 586, y: cy - 9, width: 82, height: 18, rx: 4, fill: "url(#gCrom)", stroke: "#59606a", "stroke-width": 0.6 }, g);
  mk("rect", { x: 656, y: cy - 16, width: 30, height: 32, rx: 4, fill: "url(#gAlbastru)" }, g);
  mk("circle", { cx: 698, cy, r: 11, fill: "url(#gNegru)" }, g); mk("rect", { x: 696, y: cy - 22, width: 4, height: 44, rx: 2, fill: "#222" }, g);

  // tubul (grup rotit cu 10°)
  const gt = mk("g", {}, g); SV.gt = gt;
  const Lp = L_TUB * ST.SC, x0 = cx, y0 = cy - Lp / 2;
  SV.y0 = y0;
  // manta (cilindru exterior cu apă)
  mk("rect", { x: x0 - 40, y: y0 - 10, width: 80, height: Lp + 20, rx: 6, fill: "url(#gManta)", stroke: "#8fb2cc", "stroke-width": 1.2 }, gt);
  // capace inox
  mk("rect", { x: x0 - 46, y: y0 - 30, width: 92, height: 24, rx: 4, fill: "url(#gInox)", stroke: "#6c737a" }, gt);
  mk("rect", { x: x0 - 46, y: y0 + Lp + 6, width: 92, height: 24, rx: 4, fill: "url(#gInox)", stroke: "#6c737a" }, gt);
  mk("rect", { x: x0 - 13, y: y0 - 44, width: 26, height: 16, rx: 3, fill: "url(#gAlama)" }, gt);
  mk("rect", { x: x0 - 13, y: y0 + Lp + 28, width: 26, height: 16, rx: 3, fill: "url(#gAlama)" }, gt);
  [-36, 36].forEach(dx => { mk("rect", { x: x0 + dx - 2, y: y0 - 6, width: 4, height: Lp + 12, fill: "url(#gCromO)", opacity: 0.85 }, gt); });
  // racorduri manta
  SV.racSus = [x0 + 46, y0 + 12]; SV.racJos = [x0 - 46, y0 + Lp - 12];
  mk("rect", { x: x0 + 38, y: y0 + 4, width: 18, height: 16, rx: 2, fill: "url(#gAlama)" }, gt);
  mk("rect", { x: x0 - 56, y: y0 + Lp - 20, width: 18, height: 16, rx: 2, fill: "url(#gAlama)" }, gt);
  // tubul interior de sticlă cu ulei
  const ri = 15.94 / 2 * ST.SC;
  SV.ulei = mk("rect", { x: x0 - ri, y: y0, width: 2 * ri, height: Lp, fill: "#cf9631", opacity: 0.88 }, gt);
  SV.uleiNivel = mk("rect", { x: x0 - ri, y: y0, width: 2 * ri, height: 0, fill: "#e8eef3" }, gt);
  mk("rect", { x: x0 - ri - 3, y: y0 - 4, width: 2 * ri + 6, height: Lp + 8, rx: 3, fill: "url(#gTubO)", stroke: "#9cb6cb", "stroke-width": 1 }, gt);
  // repere (inele gravate)
  SV.reper = [R1, R2].map((r, i) => {
    const y = y0 + r * ST.SC;
    mk("rect", { x: x0 - ri - 4, y: y - 1.2, width: 2 * ri + 8, height: 2.4, fill: "#1b1f24", opacity: 0.85 }, gt);
    const t = mk("text", { x: x0 - ri - 10, y: y + 4, "font-size": 11, "text-anchor": "end", fill: "#1b1f24", "font-weight": 700 }, gt); t.textContent = i ? "B" : "A";
    return y;
  });
  // scala mm pe manta
  for (let mm = 0; mm <= L_TUB; mm += 10) { const y = y0 + mm * ST.SC; mk("line", { x1: x0 + ri + 6, y1: y, x2: x0 + ri + (mm % 50 ? 11 : 16), y2: y, stroke: "#2c3440", "stroke-width": 0.8, opacity: 0.6 }, gt); }
  // bila
  SV.bila = mk("circle", { cx: x0, cy: y0 + 12 * ST.SC, r: 7.6 * ST.SC, fill: "url(#gBilaOtel)", stroke: "#2f353b", "stroke-width": 0.5 }, gt);
  mk("rect", { x: x0 - ri + 2, y: y0, width: 4, height: Lp, fill: "#fff", opacity: 0.35 }, gt);
  // termometrul digital în manta
  mk("rect", { x: x0 + 18, y: y0 - 40, width: 6, height: 70, fill: "url(#gCromO)" }, gt);
  SV.gTerm = mk("g", {}, g);
  SV.termPoz = [x0 + 21, y0 - 40];

  /* --- furtunurile (manta ↔ baie), cu sens de curgere animat */
  SV.furtun = [];
  SV.gFurt = mk("g", {}, g);
  g.insertBefore(SV.gFurt, gt);

  /* --- cronometrul (dreapta) */
  const kx = 768, ky = 300;
  mk("ellipse", { cx: kx + 62, cy: ky + 166, rx: 60, ry: 6, fill: "#000", opacity: 0.2, filter: "url(#fBlur6)" }, g);
  mk("rect", { x: kx + 48, y: ky - 18, width: 28, height: 22, rx: 5, fill: "url(#gCrom)" }, g);
  mk("rect", { x: kx, y: ky, width: 124, height: 160, rx: 26, fill: "url(#gCron)", stroke: "#000" }, g);
  mk("rect", { x: kx + 6, y: ky + 6, width: 112, height: 148, rx: 22, fill: "none", stroke: "#4c535c", "stroke-width": 1.2 }, g);
  SV.lcdCron = afisajLCD(g, kx + 8, ky + 30, 108, 34, { unit: "s", fundal: "#cfdcb5" });
  const tt = mk("text", { x: kx + 62, y: ky + 22, "font-size": 9, "text-anchor": "middle", fill: "#aab3bd" }, g); tt.textContent = "CRONOMETRU 1/100 s";
  const bC = (x, y, txt, culoare, fn) => { const b = mk("g", { style: "cursor:pointer" }, g); mk("rect", { x: x - 22, y: y - 14, width: 44, height: 28, rx: 14, fill: culoare, stroke: "#000" }, b); const t = mk("text", { x, y: y + 4, "text-anchor": "middle", "font-size": 10, fill: "#fff", "font-weight": 700 }, b); t.textContent = txt; b.addEventListener("click", fn); return b; };
  bC(kx + 34, ky + 92, "START", "#1f7a43", e => cronometru(e)); bC(kx + 90, ky + 92, "RESET", "#5b6370", e => resetCron(e));
  SV.ledCron = mk("circle", { cx: kx + 62, cy: ky + 128, r: 5, fill: "#2a2d31" }, g);
  const tl = mk("text", { x: kx + 62, y: ky + 146, "font-size": 8, "text-anchor": "middle", fill: "#aab3bd" }, g); tl.textContent = "Spațiu = start / stop";

  /* --- etichete */
  SV.et = mk("g", { "font-size": 12, style: "fill:var(--text)" }, g);
  const et = (x, y, x2, y2, t) => { mk("line", { x1: x, y1: y, x2, y2, style: "stroke:var(--text-sec)", "stroke-width": 0.8 }, SV.et); const e = mk("text", { x: x2 + (x2 > x ? 4 : -4), y: y2 + 4, "text-anchor": x2 > x ? "start" : "end" }, SV.et); e.textContent = t; };
  et(bx + 186, by - 8, bx + 196, 222, "Baie termostatată (apă)");
  et(cx + 30, y0 + 60, 724, 60, "Manta termostatată (apă)");
  et(cx + 8, y0 + 110, 724, 85, "Tub de sticlă cu ulei, la 10°");
  et(cx - 20, SV.reper[0], 420, 150, "Reperul A");
  et(cx - 20, SV.reper[1], 420, 330, "Reperul B");
  et(680, 140, 724, 110, "Stativ (rotire 180°)");

  prefixeazaId(svg, "h1-");
  SV.p = "h1-";
  deseneazaFurtunuri();
  actualizeazaSVG(0);
}
function puncteRotite(x, y) { // aplică rotația tubului (10° + rotirea de 180°) unui punct din grupul tubului
  const a = (10 + sim.rot) * Math.PI / 180, dx = x - SV.cx, dy = y - SV.cy;
  return [SV.cx + dx * Math.cos(a) - dy * Math.sin(a), SV.cy + dx * Math.sin(a) + dy * Math.cos(a)];
}
function deseneazaFurtunuri() {
  const g = SV.gFurt; g.innerHTML = "";
  const [ax, ay] = puncteRotite(...SV.racSus), [bx2, by2] = puncteRotite(...SV.racJos);
  const tur = `M318 390 C 380 390, ${bx2 - 70} ${by2 + 40}, ${bx2} ${by2}`;     // de la baie (tur) la intrarea de jos
  const ret = `M318 320 C 400 300, ${ax - 40} ${ay - 120}, ${ax} ${ay}`;         // de la ieșirea de sus înapoi
  SV.furtun = [tur, ret].map(d => {
    mk("path", { d, fill: "none", stroke: "#2f6f9f", "stroke-width": 15, "stroke-linecap": "round", opacity: 0.55 }, g);
    mk("path", { d, fill: "none", stroke: urlP(SV.p, "gFurtun"), "stroke-width": 12, "stroke-linecap": "round" }, g);
    mk("path", { d, fill: "none", stroke: "#ffffff", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0.55, transform: "translate(0,-3)" }, g);
    return mk("path", { d, fill: "none", stroke: "#e9f6ff", "stroke-width": 3, "stroke-dasharray": "4 14", opacity: 0.9 }, g);
  });
}
function actualizeazaSVG(dt) {
  if (!SV.g) return;
  SV.gt.setAttribute("transform", `rotate(${10 + sim.rot} ${SV.cx} ${SV.cy})`);
  const u = ULEI[cheieProba(sim.proba)];
  // vâscozitatea vizibilă: uleiul se închide la culoare la rece
  SV.ulei.setAttribute("fill", u.culoare);
  SV.ulei.setAttribute("opacity", sim.proba === "U" ? 0.96 : clamp(0.8 + (60 - sim.Ts) * 0.002, 0.7, 0.92));
  const lip = (1 - sim.umplere) * L_TUB * ST.SC;
  SV.uleiNivel.setAttribute("height", lip);
  const b = BILE[sim.bila], otel = b.rb > 5;
  SV.bila.setAttribute("fill", urlP(SV.p, otel ? "gBilaOtel" : "gBilaSticla"));
  SV.bila.setAttribute("r", b.d / 2 * ST.SC);
  SV.bila.setAttribute("cy", SV.y0 + sim.s * ST.SC);
  SV.bila.style.display = sim.umplere > 0.98 ? "" : "none";
  // furtunuri: curgere
  SV.fluxOff = ((SV.fluxOff || 0) - dt * 30) % 18;
  SV.furtun.forEach(f => f.setAttribute("stroke-dashoffset", SV.fluxOff));
  if (sim.rotind) deseneazaFurtunuri();
  // afișaje
  SV.lcdSet(sim.Tset.toFixed(1)); SV.lcdAct(sim.Tb.toFixed(1));
  SV.ledInc.setAttribute("fill", sim.Tb < sim.Tset - 0.05 ? "#ff4b3a" : "#5a1d1d");
  SV.lcdCron(fmtCron(valCron()));
  SV.ledCron.setAttribute("fill", sim.ch.merge ? "#46e06a" : "#2a2d31");
  // termometrul (pe tub; poziție rotită)
  const [tx, ty] = puncteRotite(...SV.termPoz);
  SV.gTerm.innerHTML = "";
  mk("path", { d: `M${tx} ${ty} C ${tx} ${ty - 40}, 440 20, 410 40`, fill: "none", stroke: "#1b1f24", "stroke-width": 3 }, SV.gTerm);
  mk("rect", { x: 330, y: 22, width: 92, height: 46, rx: 7, fill: "#20262d", stroke: "#000" }, SV.gTerm);
  const t0 = mk("text", { x: 376, y: 35, "text-anchor": "middle", "font-size": 8, fill: "#aab3bd" }, SV.gTerm); t0.textContent = "TERMOMETRU PROBĂ";
  const t = mk("text", { x: 376, y: 58, "text-anchor": "middle", "font-size": 17, fill: "#7dffa4", "font-family": "'Courier New', monospace", "font-weight": 700 }, SV.gTerm);
  t.textContent = `${fmt(Tafis(), 1)} °C`;
  SV.et.style.display = sim.etichete ? "" : "none";
}

/* ------------------------------------------------------------------ cronometrul */
let tCron0 = 0;
function valCron() { return sim.ch.merge ? sim.ch.val + (performance.now() - tCron0) / 1000 * sim.rapid : sim.ch.val; }
function fmtCron(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`; }
function cronometru(e) {
  if (sim.ch.merge) { sim.ch.val = valCron(); sim.ch.merge = false; sim.ch.s1 = sim.s; sim.ch.evOk = !!(e && e.isTrusted); }
  else { if (sim.ch.val > 0) return Cadru.mesajTemporar("Resetați cronometrul înainte de o nouă măsurare.", "atentie"); sim.ch.merge = true; tCron0 = performance.now(); sim.ch.s0 = sim.s; sim.ch.T0 = Tafis(); }
}
function resetCron() { sim.ch = { merge: false, val: 0, s0: null, s1: null }; }

/* ------------------------------------------------------------------ comenzi */
function seteazaT(t) { sim.Tset = clamp(Math.round(t / 5) * 5, 20, 80); $("#in-tset").value = sim.Tset; }
function rotesteTub() {
  if (sim.rotind || sim.umplere < 1) return;
  if (sim.ch.merge) return Cadru.mesajTemporar("Opriți cronometrul înainte de a roti tubul.", "atentie");
  sim.rotind = true; sim.rotT = 0;
}
function schimbaProba(o) {
  if (o === sim.proba && sim.umplere >= 1) return;
  sim.proba = o; sim.umplere = 0; sim.golire = 1; resetCron();
  sim.Ts = Math.min(sim.Ts, tc() + 0.5); // proba nouă intră la temperatura camerei
  sim.s = 12; Cadru.mesajTemporar("Tubul se golește, se curăță cu solvent și se umple cu proba nouă (fără bule de aer)…", "");
}
function schimbaBila(b) { if (sim.ch.merge) return; sim.bila = b; sim.s = 12; resetCron(); }

function inregistreazaTimp(e) {
  if (sim.ch.merge) return Cadru.mesajTemporar("Opriți întâi cronometrul.", "atentie");
  const t = Math.round(sim.ch.val * 100) / 100;
  if (!(t > 0)) return Cadru.mesajTemporar("Măsurați timpul de cădere între reperele A și B.", "atentie");
  if (sim.ch.inreg) return Cadru.mesajTemporar("Timpul acesta a fost deja înregistrat. Resetați cronometrul și rotiți tubul pentru o nouă cădere.", "atentie");
  const T = Tafis(), Tset = TEMP.reduce((a, b) => Math.abs(b - T) < Math.abs(a - T) ? b : a, TEMP[0]);
  const o = sim.proba, rk = o + Tset, dS0 = (sim.ch.s0 ?? 0) - R1, dS1 = (sim.ch.s1 ?? 0) - R2;
  let msg = "", celule = [];
  if (Math.abs(T - Tset) > 1.0) msg = `Citire salvată în jurnal (t = ${fmt(t, 2)} s la ${fmt(T, 1)} °C), dar temperatura nu corespunde unei trepte din tabel (40, 60, 80 °C).`;
  else {
    const r = Cadru.D.t.t12[rk];
    if (r.b && r.b !== sim.bila) { r.t1 = r.t2 = r.t3 = ""; }
    const c = ["t1", "t2", "t3"].find(k => r[k] === "" || r[k] == null);
    if (!c) msg = `Rândul ${o === "A" ? "uleiului A" : "uleiului uzat"} la ${Tset} °C are deja 3 timpi. Goliți tabelele dacă doriți să refaceți măsurările.`;
    else { celule.push({ t: "t12", r: rk, c: "b", v: sim.bila }, { t: "t12", r: rk, c, v: t.toFixed(2) }); msg = `Tabelul 1.2: ${o === "A" ? "ulei A" : "ulei uzat"}, ${Tset} °C, ${BILE[sim.bila].nume.split(" – ")[0]} → ${c} = ${fmt(t, 2)} s.`; }
    if (Math.abs(sim.Ts - sim.Tb) > 0.25) msg += " Atenție: temperatura probei nu era stabilizată!";
  }
  if (Math.abs(dS0) > 4 || Math.abs(dS1) > 4) msg += ` Cronometrul a fost pornit/oprit la ${fmt(Math.abs(dS0) > 4 ? dS0 : dS1, 0)} mm de reper – reacție întârziată sau anticipată.`;
  if (t < 10) msg += " Timpul este sub 10 s: alegeți o bilă cu constantă mai mică (eroarea relativă de cronometrare este prea mare).";
  const ok = Cadru.inregistreaza(e, { log: { cad: true, o, T, Tset, b: sim.bila, t, s0: sim.ch.s0 != null ? +sim.ch.s0.toFixed(1) : null, s1: sim.ch.s1 != null ? +sim.ch.s1.toFixed(1) : null }, celule });
  if (ok) { sim.ch.inreg = true; $("#msg-inreg").textContent = msg; deseneazaLive(); }
}
function inregistreazaDensitate(e) {
  const v = num($("#in-rc").value);
  if (!(v > 0.7 && v < 1.0)) return Cadru.mesajTemporar("Introduceți citirea areometrului în g/cm³ (de exemplu 0,8515).", "atentie");
  const o = $("#sel-areo").value;
  const ok = Cadru.inregistreaza(e, { log: { dens: true, o, tc: tc(), rc: v }, celule: [{ t: "t11", r: o, c: "tc", v: tc() }, { t: "t11", r: o, c: "rc", v: v.toFixed(4) }] });
  if (ok) $("#msg-dens").textContent = `Tabelul 1.1: ${o === "A" ? "ulei A" : "ulei uzat"} – ρ = ${fmt(v, 4)} g/cm³ la ${fmt(tc(), 1)} °C.`;
}

/* ------------------------------------------------------------------ areometrul (desen separat, cu lupă pe scală) */
function deseneazaAreometru() {
  const svg = $("#svg-areo"); if (!svg) return; svg.innerHTML = "";
  const o = $("#sel-areo").value, cheie = cheieProba(o), pr = prCurent();
  const rho = M1.densitate(o === "U" ? pr.rU : pr.rA, tc()), u = ULEI[cheie];
  const defs = mk("defs", {}, svg); defsComune(defs);
  grad(defs, "gCil", [[0, "#cfe3f2", 0.6], [0.2, "#fff", 0.3], [0.8, "#fff", 0.25], [1, "#9fbfd8", 0.6]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  // cilindrul gradat cu ulei
  mk("rect", { x: 30, y: 30, width: 70, height: 230, fill: u.culoare, opacity: o === "U" ? 0.95 : 0.85 }, svg);
  mk("rect", { x: 26, y: 14, width: 78, height: 250, rx: 4, fill: "url(#gCil)", stroke: "#8fb2cc" }, svg);
  mk("rect", { x: 18, y: 262, width: 94, height: 10, rx: 3, fill: "#9aa3ad" }, svg);
  // areometrul (tija cu scală + bulb lestat)
  mk("rect", { x: 60, y: -10, width: 10, height: 140, rx: 3, fill: "#f6f8fa", stroke: "#9aa3ad" }, svg);
  mk("ellipse", { cx: 65, cy: 175, rx: 15, ry: 50, fill: "#eef3f7", stroke: "#9aa3ad", opacity: 0.95 }, svg);
  mk("ellipse", { cx: 65, cy: 214, rx: 10, ry: 9, fill: "#5c636b" }, svg);
  mk("line", { x1: 26, y1: 30, x2: 104, y2: 30, stroke: "#3a2a17", "stroke-width": 1.5, opacity: 0.6 }, svg);
  // lupa: scala mărită în jurul nivelului lichidului (menisc)
  const lx = 140, ly = 20, lw = 160, lh = 250, cyL = ly + lh / 2, pxPer = 1600; // px pe g/cm³ (0,001 = 1,6 mm → 16 px la 10×)
  const pas = 0.001 * pxPer * 10 / 10;
  mk("rect", { x: lx, y: ly, width: lw, height: lh, rx: 12, fill: "#fbfcfd", stroke: "#5b6370", "stroke-width": 2 }, svg);
  const cp = mk("clipPath", { id: "clipLupa" }, defs); mk("rect", { x: lx + 2, y: ly + 2, width: lw - 4, height: lh - 4, rx: 10 }, cp);
  const gL = mk("g", { "clip-path": "url(#clipLupa)" }, svg);
  mk("rect", { x: lx + 50, y: ly, width: 60, height: lh, fill: "#ffffff", stroke: "#c0c7cf" }, gL);
  // pe areometru valorile cresc în jos; nivelul lichidului (citirea) este la cyL
  const v0 = Math.floor((rho - 0.0085) * 1000) / 1000;
  for (let k = 0; k <= 18; k++) {
    const v = +(v0 + k * 0.001).toFixed(3), y = cyL + (v - rho) * pxPer * 10 / 10 * 10;
    const mare = Math.round(v * 1000) % 5 === 0;
    mk("line", { x1: lx + 50, y1: y, x2: lx + 50 + (mare ? 26 : 15), y2: y, stroke: "#111", "stroke-width": mare ? 1.4 : 0.9 }, gL);
    if (mare) { const t = mk("text", { x: lx + 80, y: y + 4, "font-size": 11, fill: "#111" }, gL); t.textContent = v.toFixed(3).replace(".", ","); }
  }
  // lichidul sub nivel + meniscul (citirea la marginea superioară a meniscului pentru lichide opace)
  mk("rect", { x: lx, y: cyL, width: lw, height: lh, fill: u.culoare, opacity: o === "U" ? 0.82 : 0.55 }, gL);
  mk("path", { d: `M${lx} ${cyL - 6} Q ${lx + 40} ${cyL} ${lx + 50} ${cyL - 7}`, fill: "none", stroke: u.culoare, "stroke-width": 3, opacity: 0.8 }, gL);
  mk("line", { x1: lx, y1: cyL, x2: lx + lw, y2: cyL, stroke: shade(u.culoare, 0.6), "stroke-width": 1.4 }, gL);
  const t = mk("text", { x: lx + lw / 2, y: ly + lh + 18, "text-anchor": "middle", "font-size": 11, fill: "var(--text-sec)" }, svg); t.textContent = "Lupă 10× – citiți la nivelul lichidului";
  const t2 = mk("text", { x: 65, y: 290, "text-anchor": "middle", "font-size": 11, fill: "var(--text-sec)" }, svg); t2.textContent = `t = ${fmt(tc(), 1)} °C`;
  prefixeazaId(svg, "ar-");
}

/* ------------------------------------------------------------------ graficul mic, în timp real */
function deseneazaLive() {
  const cv = $("#cv-live"); if (!cv || !cv.offsetParent) return;
  const R = M1.prelucreaza(Cadru.D.t, { num });
  const serii = [];
  ["A", "U"].forEach((o, i) => {
    const pts = TEMP.map(T => [T, (R.rand[o + T] || {}).nu]).filter(p => p[1] > 0);
    if (R.w[o]) { const c = []; for (let T = 0; T <= 110; T += 2) c.push([T, M1.nuWalther(R.w[o], T)]); serii.push({ tip: "linie", pts: c, culoare: i, punctat: true }); }
    serii.push({ tip: "pct", pts, culoare: i, r: 4 });
  });
  // punctul curent (din cronometru)
  const t = valCron();
  if (t > 0 && !sim.ch.merge) { const b = BILE[sim.bila], r = M1.densitate(ULEI[cheieProba(sim.proba)].r15, Tafis()), eta = b.K * (b.rb - r) * t; serii.push({ tip: "pct", pts: [[Tafis(), eta / r]], culoare: 2, r: 6 }); }
  deseneazaGrafic(cv, { xmin: 0, xmax: 110, xticks: [0, 20, 40, 60, 80, 100], ymin: 3, ymax: 2000, ylog: true, yticks: [5, 10, 20, 50, 100, 200, 500, 1000], xlab: "t [°C]", ylab: "ν [mm²/s]", serii });
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaL1(D) {
  const R = M1.prelucreaza(D.t, { num });
  const pr = prCurent(), cheie = { A: cheieProba("A"), U: "UZAT" };
  const cel = { t11: {}, t12: {}, t13: {} }, rele = { t12: {}, t13: {} };
  ["A", "U"].forEach(o => {
    const u = ULEI[cheie[o]];
    cel.t11[o] = { r15: fmt(R.r15[o], 4), cat: fmt(u.r15, 3) };
    TEMP.forEach(T => {
      const k = o + T, r = R.rand[k] || {}, wc = M1.wCatalog(cheie[o]);
      cel.t12[k] = { tm: r.tm ? fmt(r.tm, 2) : "", disp: r.nt > 1 ? fmt(r.disp * 100, 2) + " %" : "" };
      rele.t12[k] = { disp: r.disp > 0.01, tm: r.tm > 0 && r.tm < 10 };
      cel.t13[k] = { rho: r.rho ? fmt(r.rho, 4) : "", eta: r.eta ? fmt(r.eta, 2) : "", nu: r.nu ? fmt(r.nu, 2) : "", cat: fmt(M1.nuWalther(wc, T), 1), ab: r.nu ? fmt((Math.abs(r.nu / M1.nuWalther(wc, T) - 1) < 0.0005 ? 0 : (r.nu / M1.nuWalther(wc, T) - 1)) * 100, 1) + " %" : "" };
      rele.t13[k] = { ab: r.nu && Math.abs(r.nu / M1.nuWalther(wc, T) - 1) > 0.05 };
    });
  });
  const rez = [];
  ["A", "U"].forEach(o => {
    const nume = o === "A" ? `Ulei A (${cheie.A})` : "Ulei uzat";
    if (R.w[o]) {
      rez.push([`<b>${nume}</b> – dreapta Walther`, `A = ${fmt(R.w[o].A, 4)} · B = ${fmt(R.w[o].B, 4)}`]);
      rez.push([`${nume}: ν la 100 °C (extrapolat)`, `<span style='color:var(--accent)'>${fmt(R.n100[o], 2)} mm²/s</span> (catalog ${fmt(ULEI[cheie[o]].n100, 1)})`]);
      rez.push([`${nume}: ν la 0 °C`, `${fmt(R.n0[o], 0)} mm²/s · raport ν₀/ν₁₀₀ = ${fmt(R.n0[o] / R.n100[o], 1)}`]);
      rez.push([`${nume}: clasa SAE (vară)`, R.sae[o] ? "SAE " + R.sae[o] : "în afara claselor"]);
    } else rez.push([nume, "măsurați la 40 °C și la 80 °C"]);
  });
  const verdicte = [];
  if (R.sae.A) {
    const marcaj = Number(cheie.A.split("-")[1]);
    verdicte.push(R.sae.A === marcaj ? { tip: "ok", text: `Uleiul A se încadrează în clasa SAE ${R.sae.A}, în acord cu marcajul ${cheie.A}.` }
      : { tip: "atentie", text: `Clasa rezultată (SAE ${R.sae.A}) diferă de marcajul ${cheie.A}: verificați stabilizarea temperaturii și densitatea.` });
  }
  if (R.n100.U && R.n100.A && cheie.A === "5W-30") verdicte.push({ tip: R.n100.U < 9.3 ? "atentie" : "ok", text: `Uleiul uzat are ν₁₀₀ = ${fmt(R.n100.U, 2)} mm²/s față de ${fmt(R.n100.A, 2)} la uleiul nou${R.n100.U < 9.3 ? " – a ieșit din clasa SAE 30 (diluare cu combustibil / forfecarea polimerilor): ulei de schimbat" : ""}.` });
  else if (R.n100.U) verdicte.push({ tip: R.n100.U < 9.3 ? "atentie" : "ok", text: `Uleiul uzat (inițial 5W-30, ν₁₀₀ = 11,0 mm²/s) are acum ν₁₀₀ = ${fmt(R.n100.U, 2)} mm²/s${R.n100.U < 9.3 ? " – sub limita clasei SAE 30: diluare cu motorină, ulei de schimbat" : ""}.` });
  Object.keys(R.rand).forEach(k => { const r = R.rand[k]; if (r.disp > 0.01) verdicte.push({ tip: "atentie", text: `${k.charAt(0) === "A" ? "Ulei A" : "Ulei uzat"}, ${k.slice(1)} °C: timpii diferă cu ${fmt(r.disp * 100, 1)} % (> 0,5 % cerut) – repetați măsurarea.` }); });
  // grafic
  const serii = [];
  ["A", "U"].forEach((o, i) => {
    const wc = M1.wCatalog(cheie[o]), c = []; for (let T = 0; T <= 110; T += 2) c.push([T, M1.nuWalther(wc, T)]);
    serii.push({ tip: "linie", pts: c, culoare: i, punctat: true, gros: 1 });
    if (R.w[o]) { const m = []; for (let T = 0; T <= 110; T += 2) m.push([T, M1.nuWalther(R.w[o], T)]); serii.push({ tip: "linie", pts: m, culoare: i }); }
    serii.push({ tip: "pct", pts: TEMP.map(T => [T, (R.rand[o + T] || {}).nu]).filter(p => p[1] > 0), culoare: i });
  });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Vâscozitatea cinematică ν(t) – dreapta Walther",
    grafic: { xmin: 0, xmax: 110, xticks: [0, 20, 40, 60, 80, 100], ymin: 3, ymax: 2000, ylog: true, yticks: [5, 10, 20, 50, 100, 200, 500, 1000], xlab: "t [°C]", ylab: "ν [mm²/s] (scară log)", serii },
    legenda: [["ulei A – măsurat", "var(--serie-0)", "pct"], ["ulei A – Walther (voi)", "var(--serie-0)"], ["ulei uzat – măsurat", "var(--serie-1)", "pct"], ["ulei uzat – Walther (voi)", "var(--serie-1)"], ["catalog (punctat)", "var(--text-sec)"]],
    principal: { eticheta: "ν100 ulei A [mm²/s]", valoare: Number.isFinite(R.n100.A) ? +R.n100.A.toFixed(2) : null },
    P2: R
  };
}

/* ------------------------------------------------------------------ conținut didactic (după îndrumar) */
const HTML_TEORIE = `
<figure><img src="img/stand.jpg" alt="Vâscozimetru cu bilă Höppler cu manta, baie termostatată, probe de ulei și cronometru" loading="lazy"></figure>
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Baia termostatată se umple și se pornește numai de către cadrul didactic; temperatura de lucru nu depășește 80 °C, iar mantaua și furtunurile calde nu se ating cu mâna liberă.</li>
<li>Uleiurile de motor (noi sau uzate) se manipulează cu mănuși de nitril; uleiul uzat conține compuși iritanți și cancerigeni.</li>
<li>Tubul de sticlă și areometrul se manevrează cu grijă; sticla spartă se strânge cu peria și făcașul.</li>
<li>Picăturile de ulei se șterg imediat (pericol de alunecare); uleiul uzat și solventul se colectează ca deșeuri periculoase.</li></ul></div>
<h2>1.1. Scopul lucrării</h2>
<p>Determinarea experimentală a vâscozității dinamice și cinematice a unor uleiuri de motor la mai multe temperaturi, trasarea dreptei Walther și încadrarea uleiului în clasificarea SAE J300. Lucrarea explică de ce uleiurile moderne au vâscozitate tot mai mică (0W-20, 0W-16) și ce înseamnă cele două numere de pe ambalaj.</p>
<h2>1.2. Noțiuni teoretice</h2>
<p>Vâscozitatea este proprietatea fluidelor de a se opune deformării prin eforturi tangențiale. Pentru un fluid newtonian efortul tangențial dintre două straturi este proporțional cu gradientul de viteză (legea lui Newton); coeficientul de proporționalitate este vâscozitatea dinamică η, iar raportul dintre ea și densitate este vâscozitatea cinematică ν:</p>
<div class="ec"><span>τ = η · dv/dy</span><span class="nr">(1.1)</span></div>
<div class="ec"><span>ν = η / ρ</span><span class="nr">(1.2)</span></div>
<p>Unități: η în Pa·s (în practică mPa·s = cP), ν în m²/s (în practică mm²/s = cSt). Uleiurile de motor sunt newtoniene în condițiile lucrării; la gradienți foarte mari de viteză, în lagăre, uleiurile cu aditivi de vâscozitate își reduc temporar vâscozitatea (de aceea SAE J300 impune și vâscozitatea HTHS la 150 °C).</p>
<p>Vâscozimetrul cu bilă (Höppler, Fig. 1.1) măsoară timpul t în care o bilă de densitate ρ<sub>b</sub> cade, cu viteză constantă, între două repere, într-un tub înclinat umplut cu lichidul de densitate ρ<sub>l</sub>. La viteză constantă greutatea bilei este echilibrată de forța arhimedică și de forța de rezistență vâscoasă; din echilibru rezultă o relație liniară cu timpul, în care constanta bilei K este dată de producător:</p>
<figure><img src="img/fig1_1.jpg" alt="Fig. 1.1 Vâscozimetrul cu bilă Höppler cu manta termostatată" loading="lazy"><figcaption>Fig. 1.1. Vâscozimetrul cu bilă (Höppler) cu manta termostatată</figcaption></figure>
<div class="ec"><span>η = K · (ρ<sub>b</sub> − ρ<sub>l</sub>) · t &nbsp; [mPa·s], cu K în mPa·cm³/g, ρ în g/cm³, t în s</span><span class="nr">(1.3)</span></div>
<p>Legea lui Stokes, η = 2r²(ρ<sub>b</sub> − ρ<sub>l</sub>)g / (9v), descrie căderea unei bile într-un lichid nelimitat și este valabilă doar pentru Re &lt; 0,5; în tubul vâscozimetrului (jocul bilă–tub este de numai câteva zecimi de milimetru) influența pereților este mare, motiv pentru care se folosește constanta de etalonare K.</p>
<p>Densitatea uleiului scade liniar cu temperatura; pentru uleiurile minerale și sintetice coeficientul de dilatare volumică este α ≈ 0,00065 1/K:</p>
<div class="ec"><span>ρ(t) = ρ<sub>15</sub> · [1 − α · (t − 15)]</span><span class="nr">(1.4)</span></div>
<p>Vâscozitatea uleiurilor scade foarte repede cu temperatura (de 30–50 de ori între 0 și 100 °C, Fig. 1.2). Pe o diagramă cu scară dublu logaritmică pentru ν și logaritmică pentru temperatura absolută T, curbele devin drepte (relația Walther, ASTM D341). Două măsurători sunt suficiente pentru trasarea dreptei și pentru estimarea vâscozității la alte temperaturi:</p>
<div class="ec"><span>lg lg(ν + 0,7) = A − B · lg T &nbsp; (ν în mm²/s, T în K)</span><span class="nr">(1.5)</span></div>
<figure><img src="img/fig1_2.jpg" alt="Fig. 1.2 Vâscozitatea cinematică a unor uleiuri tipice și diagrama Walther" loading="lazy"><figcaption>Fig. 1.2. Vâscozitatea cinematică a unor uleiuri de motor tipice și reprezentarea lor în diagrama Walther</figcaption></figure>
<p>Panta B arată cât de sensibil este uleiul la temperatură: cu cât B este mai mic, cu atât vâscozitatea variază mai puțin (indice de vâscozitate VI mai mare). Uleiurile multigrad (de exemplu 5W-30) au B mic datorită aditivilor polimerici și a uleiurilor de bază sintetice.</p>
<p>Clasificarea SAE J300 are două părți. Numărul fără litera W („clasa de vară”) se stabilește după vâscozitatea cinematică la 100 °C și după vâscozitatea HTHS la 150 °C (Tabelul 1.1). Numărul cu litera W („winter”) se stabilește prin încercări la temperatură scăzută – pornirea (CCS) și pomparea uleiului (MRV) – care nu fac obiectul lucrării.</p>
<div class="tabel-scroll"><table class="tabel"><caption>Tabelul 1.1. Clasele SAE J300 după vâscozitatea la temperatură ridicată (extras)</caption>
<thead><tr><th>Clasa</th><th>ν la 100 °C [mm²/s]</th><th>HTHS la 150 °C, min. [mPa·s]</th></tr></thead><tbody>
<tr><td>8</td><td>4,0 … &lt; 6,1</td><td>1,7</td></tr><tr><td>12</td><td>5,0 … &lt; 7,1</td><td>2,0</td></tr><tr><td>16</td><td>6,1 … &lt; 8,2</td><td>2,3</td></tr><tr><td>20</td><td>6,9 … &lt; 9,3</td><td>2,6</td></tr>
<tr><td>30</td><td>9,3 … &lt; 12,5</td><td>2,9</td></tr><tr><td>40</td><td>12,5 … &lt; 16,3</td><td>3,5 (0W-, 5W-, 10W-40); 3,7 (restul)</td></tr><tr><td>50</td><td>16,3 … &lt; 21,9</td><td>3,7</td></tr></tbody></table></div>
<p class="nota">Intervalele claselor 8…20 se suprapun (încadrarea finală depinde și de HTHS); în lucrare se alege clasa cea mai mare a cărei limită inferioară este atinsă de ν<sub>100</sub>.</p>
<p>Tendința actuală este reducerea vâscozității: un ulei mai subțire micșorează pierderile prin frecare, mai ales la pornirea la rece și în ciclurile urbane, cu reducerea consumului și a emisiilor de CO₂. Limita este dată de grosimea minimă a filmului de ulei în lagăre, de aceea uleiul se alege strict după specificația producătorului motorului.</p>
<h2>1.3. Aparatură</h2>
<ul><li>Vâscozimetru cu bilă (Höppler) cu set de bile și certificat de etalonare (constantele K)</li><li>Baie termostatată cu circulație (20…80 °C) și termometru de control (rezoluție 0,1 °C)</li><li>Cronometru (rezoluție 0,01 s)</li><li>Areometru pentru produse petroliere</li><li>Probe de ulei de motor 0W-20, 5W-30, 10W-40 (noi) și o probă de ulei uzat, cu fișele tehnice</li></ul>
<div class="tabel-scroll"><table class="tabel"><caption>Setul de bile al vâscozimetrului (certificat de etalonare)</caption><thead><tr><th>Bila</th><th>ρ<sub>b</sub> [g/cm³]</th><th>K [mPa·cm³/g]</th><th>Domeniu η [mPa·s] (t = 10…300 s)</th></tr></thead><tbody>
${Object.entries(BILE).map(([k, b]) => `<tr><td>${b.nume}</td><td>${fmt(b.rb, 3)}</td><td>${fmt(b.K, 4)}</td><td>${fmt(b.K * (b.rb - 0.86) * 10, 1)} … ${fmt(b.K * (b.rb - 0.86) * 300, 0)}</td></tr>`).join("")}</tbody></table></div>
<h2>1.4. Modul de lucru (în simulator)</h2>
<ol><li>Măsurați densitatea fiecărui ulei la temperatura camerei cu areometrul (citire la nivelul lichidului, cu lupa) și treceți-o în Tabelul 1.1; ρ<sub>15</sub> se calculează cu relația (1.4).</li>
<li>Alegeți proba (uleiul A), bila potrivită și temperatura de 40 °C la termostat. Așteptați stabilizarea: temperatura probei (termometrul de pe manta) trebuie să fie constantă.</li>
<li>Rotiți tubul cu 180° pentru readucerea bilei sus. Porniți cronometrul când bila atinge reperul A și opriți-l la reperul B; înregistrați timpul. Faceți 3 căderi care nu diferă cu mai mult de 0,5 %.</li>
<li>Repetați la 60 °C și la 80 °C (schimbați bila dacă timpul scade sub 10 s), apoi pentru uleiul uzat (de preferat 80 → 60 → 40 °C, răcirea este mai lentă).</li></ol>
<p class="nota">În simulator timpul de stabilizare termică este comprimat (≈ 1–2 min în loc de 15 min); timpii de cădere ai bilei sunt reali.</p>
<h2>1.7. Interpretarea rezultatelor</h2>
<ul><li>Abaterile de până la 3–5 % față de fișa tehnică sunt normale (incertitudinea temperaturii, a timpului și a densității).</li>
<li>O eroare de 1 °C la 40 °C modifică vâscozitatea cu ≈ 3 %: temperatura probei este sursa principală de eroare.</li>
<li>Uleiul cu B mai mic își păstrează mai bine vâscozitatea la cald și curge mai ușor la rece.</li>
<li>Uleiul uzat poate avea vâscozitate mai mică (diluare cu combustibil, forfecarea polimerilor) sau mai mare (oxidare, funingine) decât uleiul nou; ambele situații impun schimbarea uleiului.</li></ul>
<h2>1.8. Relevanță practică</h2>
<p>Alegerea uleiului după SAE J300 și după specificațiile ACEA/API și ale producătorilor (de exemplu VW 508 00, BMW LL-17 FE+) ține de vâscozitate: motoarele moderne cu toleranțe mici, lanț de distribuție și sistem start-stop sunt proiectate pentru uleiuri 0W-20 sau 0W-16, iar un ulei mai vâscos întârzie ungerea la pornire și crește consumul. Aceleași principii se aplică lichidului de transmisie automată, uleiului de direcție și lichidului de răcire pentru baterii la vehiculele electrice.</p>`;

function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Ulei 5W-30 cu ρ<sub>15</sub> = 0,855 g/cm³. La 40 °C, cu bila de oțel ρ<sub>b</sub> = 8,10 g/cm³ și K = 0,70 mPa·cm³/g, timpul mediu de cădere este t = 10,8 s; la 80 °C, cu bila cu K = 0,090 mPa·cm³/g, t = 22,0 s.</p>
<div class="ec"><span>ρ<sub>40</sub> = 0,855·[1 − 0,00065·25] = 0,841 g/cm³; &nbsp; ρ<sub>80</sub> = 0,855·[1 − 0,00065·65] = 0,819 g/cm³</span><span class="nr">(1.6–1.7)</span></div>
<div class="ec"><span>η<sub>40</sub> = 0,70·(8,10 − 0,841)·10,8 = 54,9 mPa·s → ν<sub>40</sub> = 54,9/0,841 = 65,3 mm²/s</span><span class="nr">(1.8–1.9)</span></div>
<div class="ec"><span>η<sub>80</sub> = 0,090·(8,10 − 0,819)·22,0 = 14,4 mPa·s → ν<sub>80</sub> = 14,4/0,819 = 17,6 mm²/s</span><span class="nr">(1.10–1.11)</span></div>
<p>Coordonatele Walther: Y<sub>40</sub> = lg lg(65,3 + 0,7) = 0,2599 și Y<sub>80</sub> = lg lg(17,6 + 0,7) = 0,1012; lg 313,15 = 2,4958 și lg 353,15 = 2,5480.</p>
<div class="ec"><span>B = (0,2599 − 0,1012)/(2,5480 − 2,4958) = 3,039; &nbsp; A = 0,2599 + 3,039·2,4958 = 7,844</span><span class="nr">(1.12–1.13)</span></div>
<div class="ec"><span>la 100 °C: Y = 7,844 − 3,039·lg 373,15 = 0,0280 → ν<sub>100</sub> = 10^(10^0,0280) − 0,7 = 11,0 mm²/s</span><span class="nr">(1.14–1.15)</span></div>
<div class="ec"><span>la 0 °C: Y = 7,844 − 3,039·lg 273,15 = 0,440 → ν<sub>0</sub> ≈ 570 mm²/s</span><span class="nr">(1.16–1.17)</span></div>
<p>Cu ν<sub>100</sub> = 11,0 mm²/s uleiul se încadrează în clasa SAE 30 (9,3 … &lt; 12,5 mm²/s), în acord cu marcajul 5W-30. La 0 °C vâscozitatea este de ≈ 52 de ori mai mare decât la 100 °C, ceea ce explică uzura mare la pornirea la rece.</p>
<p><button type="button" data-scenariu="exemplu">Reproduce exemplul în simulator (5W-30, bila 4, 40 °C)</button></p>
<div class="problema"><h3>Problema 1</h3><p>Un ulei 0W-20 are ν<sub>40</sub> = 44,5 mm²/s și ν<sub>100</sub> = 8,6 mm²/s. Calculați coeficienții Walther și vâscozitatea la −10 °C.</p>
<details class="sol"><summary>Rezolvare</summary><p>Y<sub>40</sub> = lg lg 45,2 = 0,2190; Y<sub>100</sub> = lg lg 9,3 = −0,0123; B = (0,2190 + 0,0123)/(2,5719 − 2,4958) = 3,040; A = 0,2190 + 3,040·2,4958 = 7,806. La −10 °C (263,15 K): Y = 7,806 − 3,040·2,4202 = 0,449 → ν ≈ 10^(10^0,449) − 0,7 ≈ 1 650 mm²/s.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Cu bila 3 (K = 0,090, ρ<sub>b</sub> = 8,10 g/cm³) un ulei cu ρ = 0,83 g/cm³ cade între repere în 31,4 s. Ce vâscozitate dinamică și cinematică are? Ce timp ar da bila 4 (K = 0,70)? Este potrivită?</p>
<details class="sol"><summary>Rezolvare</summary><p>η = 0,090·(8,10 − 0,83)·31,4 = 20,5 mPa·s; ν = 20,5/0,83 = 24,7 mm²/s. Cu bila 4: t = 20,5/(0,70·7,27) = 4,0 s &lt; 10 s – eroarea de cronometrare (≈ 0,1–0,2 s) ar fi de 3–5 %, deci bila 4 nu este potrivită.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>O eroare de +1 °C la 40 °C pentru uleiul din exemplu: ce abatere produce asupra ν<sub>40</sub>?</p>
<details class="sol"><summary>Rezolvare</summary><p>Din dreapta Walther a exemplului: ν(41 °C) = 63,1 mm²/s față de 65,3 mm²/s, adică −3,4 %. De aceea temperatura probei trebuie stabilizată și citită cu 0,1 °C.</p></details></div>`;
}
const INTREBARI = [
  ["Care este diferența dintre vâscozitatea dinamică și cea cinematică? Dați unitățile SI și pe cele uzuale.", "η leagă efortul tangențial de gradientul de viteză (Pa·s; uzual mPa·s = cP); ν = η/ρ (m²/s; uzual mm²/s = cSt). Clasificarea SAE folosește ν la 100 °C și η (HTHS) la 150 °C."],
  ["De ce nu se poate folosi direct legea lui Stokes în vâscozimetrul Höppler?", "Stokes presupune lichid nelimitat și Re &lt; 0,5; în tub jocul bilă–perete este foarte mic, rezistența este dominată de curgerea în fanta dintre bilă și tub, deci se folosește constanta de etalonare K a fiecărei bile."],
  ["Ce reprezintă cele două numere din marcajul 5W-30?", "5W – clasa de iarnă, stabilită prin încercări la rece (CCS – pornire, MRV – pompare); 30 – clasa de vară, după ν la 100 °C (9,3…12,5 mm²/s) și HTHS la 150 °C (min. 2,9 mPa·s)."],
  ["De ce se măsoară și vâscozitatea HTHS la 150 °C?", "În lagăre gradienții de viteză sunt foarte mari (10⁶ s⁻¹) și temperatura ridicată; polimerii aditivi se aliniază și vâscozitatea scade temporar. HTHS garantează grosimea minimă a filmului de ulei în aceste condiții."],
  ["Cum influențează diluarea uleiului cu motorină (la regenerarea filtrului de particule) vâscozitatea și ungerea?", "Motorina (ν ≈ 2–4 mm²/s) scade vâscozitatea uleiului; filmul din lagăre se subțiază, crește uzura, iar uleiul poate ieși din clasa SAE. Se verifică nivelul (crește!) și se scurtează intervalul de schimb."]
];
const TEST = [
  { q: "Unitatea uzuală a vâscozității cinematice în fișele tehnice ale uleiurilor este:", o: ["mPa·s", "mm²/s (cSt)", "Pa", "kg/m³"], c: 1, e: "ν = η/ρ, uzual în mm²/s (1 cSt)." },
  { q: "În vâscozimetrul Höppler, la viteză constantă, η este proporțională cu:", o: ["pătratul timpului de cădere", "timpul de cădere", "inversul timpului", "temperatura"], c: 1, e: "η = K(ρ<sub>b</sub> − ρ<sub>l</sub>)·t – relație liniară cu t." },
  { q: "De ce timpul de cădere trebuie să fie peste 10 s?", o: ["ca bila să nu se oprească", "pentru ca eroarea relativă de cronometrare să fie mică", "din cauza Archimede", "pentru încălzirea uleiului"], c: 1, e: "Timpul de reacție (0,1–0,2 s) raportat la un timp scurt dă erori de câteva procente." },
  { q: "În diagrama Walther dreptele sunt obținute pentru:", o: ["lg ν funcție de t", "lg lg(ν + 0,7) funcție de lg T", "ν funcție de 1/T", "η funcție de p"], c: 1, e: "ASTM D341: lg lg(ν + 0,7) = A − B·lg T." },
  { q: "Un ulei cu panta Walther B mai mică:", o: ["își schimbă mai puțin vâscozitatea cu temperatura (VI mare)", "este mai vâscos la 100 °C", "este întotdeauna mineral", "nu poate fi multigrad"], c: 0, e: "B mic → variație mică cu temperatura → indice de vâscozitate mare." },
  { q: "Numărul „30” din 5W-30 se stabilește după:", o: ["vâscozitatea la −30 °C", "ν la 100 °C și HTHS la 150 °C", "densitate", "punctul de inflamabilitate"], c: 1, e: "Clasa de vară – Tabelul 1.1." },
  { q: "O eroare de 1 °C la 40 °C modifică vâscozitatea cu aproximativ:", o: ["0,1 %", "3 %", "30 %", "nu o modifică"], c: 1, e: "≈ 3 % – de aceea stabilizarea termică este esențială." }
];

/* ------------------------------------------------------------------ definiția lucrării */
const RANDURI12 = [];
["A", "U"].forEach(o => TEMP.forEach(T => RANDURI12.push({ k: o + T, et: `${o === "A" ? "Ulei A" : "Ulei uzat"} · ${T} °C` })));
Cadru.porneste({
  disc: "MF", nr: 1, cod: "mf-l1",
  titlu: "Vâscozitatea uleiurilor de motor în funcție de temperatură",
  scurt: "Vâscozitatea uleiurilor de motor",
  subtitlu: "Laborator virtual – vâscozimetru cu bilă Höppler cu baie termostatată",
  parametri: M1.parametri,
  date: [
    { k: "alfa", et: "α [1/K]", v: 0.00065, fix: true }, { k: "L", et: "distanța între repere [mm]", v: 100, fix: true },
    { k: "uleiA", et: "Uleiul A", v: "5W-30", text: true }
  ],
  tabele: [
    { id: "t11", titlu: "Tabelul 1.1. Densitatea uleiurilor (areometru)", antetRand: "Proba", nota: "Citirea areometrului se introduce de voi, din lupa simulatorului.",
      randuri: [{ k: "A", et: "Ulei A" }, { k: "U", et: "Ulei uzat" }],
      coloane: [{ k: "tc", t: "t camerei [°C]", intrare: true }, { k: "rc", t: "ρ citit [g/cm³]", intrare: true }, { k: "r15", t: "ρ<sub>15</sub> [g/cm³]" }, { k: "cat", t: "ρ<sub>15</sub> catalog [g/cm³]" }] },
    { id: "t12", titlu: "Tabelul 1.2. Timpii de cădere a bilei", antetRand: "Ulei · t",
      randuri: RANDURI12,
      coloane: [{ k: "b", t: "Bila", intrare: true, tip: "select", optiuni: Object.keys(BILE) }, { k: "t1", t: "t₁ [s]", intrare: true }, { k: "t2", t: "t₂ [s]", intrare: true }, { k: "t3", t: "t₃ [s]", intrare: true }, { k: "tm", t: "t mediu [s]" }, { k: "disp", t: "Dispersie" }] },
    { id: "t13", titlu: "Tabelul 1.3. Rezultate", antetRand: "Ulei · t",
      randuri: RANDURI12,
      coloane: [{ k: "rho", t: "ρ<sub>l</sub> [g/cm³]" }, { k: "eta", t: "η [mPa·s]" }, { k: "nu", t: "ν [mm²/s]" }, { k: "cat", t: "ν catalog [mm²/s]" }, { k: "ab", t: "Abatere" }] }
  ],
  inaltimeGrafic: 380,
  calculeaza: calculeazaL1,
  intrebari(D) {
    const a = cheieProba("A");
    return [
      { id: "q1", u: "mm²/s", text: `Vâscozitatea cinematică la <b>100 °C</b> a uleiului A (${a}), extrapolată cu dreapta Walther din măsurările voastre la 40 °C și 80 °C:`, textSimplu: "ν la 100 °C a uleiului A (Walther din 40 °C și 80 °C)" },
      { id: "q2", u: "", text: `Clasa SAE de vară rezultată pentru uleiul A din ν<sub>100</sub> al vostru (numărul, de exemplu 30):`, textSimplu: "Clasa SAE (vară) a uleiului A" },
      { id: "q3", u: "×", text: `De câte ori este mai mare ν la <b>0 °C</b> decât la 100 °C pentru uleiul A (din dreapta voastră)?`, textSimplu: "Raportul ν(0 °C)/ν(100 °C) pentru uleiul A" },
      { id: "q4", u: "", text: `Panta B a dreptei Walther pentru <b>uleiul uzat</b> (din măsurările voastre la 40 °C și 80 °C):`, textSimplu: "Panta Walther B a uleiului uzat" }
    ];
  },
  cerinte(D) {
    const l = [];
    ["A", "U"].forEach(o => {
      const nume = o === "A" ? "uleiul A" : "uleiul uzat";
      if (D.t.t11[o].rc === "") l.push(`Tabelul 1.1: densitatea pentru ${nume}`);
      TEMP.forEach(T => { const r = D.t.t12[o + T], n = ["t1", "t2", "t3"].filter(k => r[k] !== "").length; if (n < 3) l.push(`Tabelul 1.2: ${nume} la ${T} °C – ${n}/3 timpi`); });
    });
    return l;
  },
  exemplu(D) {
    Object.assign(D.t.t11.A, { tc: "15", rc: "0.8550" }); Object.assign(D.t.t11.U, { tc: "15", rc: "0.8620" });
    Object.assign(D.t.t12.A40, { b: "B4", t1: "10.78", t2: "10.82", t3: "10.80" });
    Object.assign(D.t.t12.A60, { b: "B3", t1: "39.90", t2: "40.05", t3: "39.98" });
    Object.assign(D.t.t12.A80, { b: "B3", t1: "21.98", t2: "22.02", t3: "22.00" });
    Object.assign(D.t.t12.U40, { b: "B3", t1: "70.1", t2: "70.3", t3: "70.2" });
    Object.assign(D.t.t12.U60, { b: "B3", t1: "33.6", t2: "33.8", t3: "33.7" });
    Object.assign(D.t.t12.U80, { b: "B3", t1: "18.75", t2: "18.85", t3: "18.80" });
    D.date.uleiA = "5W-30 (exemplul din îndrumar)";
  },
  scenariu(id, C) {
    sim.cheieA = "5W-30"; $("#in-uleiA").value = "5W-30"; schimbaProba("A"); sim.umplere = 1;
    sim.bila = "B4"; $("#sel-bila").value = "B4"; seteazaT(40); sim.Tb = 40; sim.Ts = 40 + P().dT; sim.s = 12; resetCron();
    C.mesajTemporar("Exemplul: 5W-30, bila 4 (K = 0,70), 40 °C – timpul de cădere ≈ 10,8 s. Rotiți tubul și cronometrați.", "");
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Ungerea motorului – vâscozitatea la pornirea la rece",
    intro: `<p>Uleiul măsurat în laborator circulă prin motor: baie (carter) → sorb → pompa de ulei → filtru → galeria principală → lagărele arborelui cotit → arborele cu came din chiulasă → retur în carter. Alegeți uleiul și temperatura, apoi apăsați <b>Pornire la rece</b>: urmăriți cât durează până când presiunea ajunge la lagăre și la arborele cu came. La rece uleiul este de sute de ori mai vâscos: sorbul și supapa de siguranță limitează debitul, iar ungerea întârzie – de aceea uzura se produce în primele secunde după pornire.</p>`,
    dupa: `<p class="nota">Modelul: debitul pompei Q = V<sub>g</sub>·n·η<sub>v</sub>, limitat la aspirație de vâscozitate; presiunea p = Q·R(η) limitată de supapa de siguranță (5,5 bar); timpul de umplere al galeriilor = volumul golit / debitul efectiv. Vâscozitatea se calculează cu relația Walther (1.5) – puteți folosi chiar dreapta determinată de voi.</p>`,
    optiuni: C => ({ sistem: "ungere", walther: () => { const R = C.R && C.R.P2; return R && R.w.A ? { A: R.w.A.A, B: R.w.A.B, eticheta: "uleiul A (dreapta voastră)" } : null; } })
  },
  referat: {
    scop: "Determinarea vâscozității dinamice și cinematice a uleiurilor de motor la 40, 60 și 80 °C cu vâscozimetrul Höppler, trasarea dreptei Walther și încadrarea în clasificarea SAE J300.",
    relatii: "η = K·(ρ<sub>b</sub> − ρ<sub>l</sub>)·t; &nbsp; ν = η/ρ; &nbsp; ρ(t) = ρ<sub>15</sub>·[1 − α(t − 15)]; &nbsp; lg lg(ν + 0,7) = A − B·lg T.",
    varianta: D => `Uleiul A: ${cheieProba("A")}; a doua probă: ulei 5W-30 uzat.`,
    indicatii: "Comparați ν măsurat cu fișa tehnică, comentați clasa SAE obținută, panta B a celor două uleie, starea uleiului uzat și efectul la pornirea la rece…"
  },
  subsol: "Modelul: uleiuri newtoniene, relația Walther (ASTM D341) cu ν<sub>40</sub> și ν<sub>100</sub> din fișele tehnice, dilatare liniară α = 0,00065 1/K, bile cu constante de etalonare K. Fiecare student are lot de ulei, densitate și eroare de termometru proprii.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  parametriDemo() { return Object.assign(M1.parametri(20261001), { uleiA: sim.cheieA, fA: 1, fU: 1, rA: ULEI[sim.cheieA].r15, rU: ULEI.UZAT.r15, dT: 0, tc: 21.0 }); },
  sim: {
    html: `<div class="sim-grila">
    <div class="card sim-scena scena">
      <svg id="svg-hoppler" viewBox="0 0 900 520" role="img" aria-label="Baie termostatată, vâscozimetru cu bilă Höppler cu manta și cronometru"></svg>
      <div class="afisaje">
        <div class="afisaj"><span>Temperatura probei</span><b id="af-ts">—</b><small>°C (termometrul mantalei)</small></div>
        <div class="afisaj"><span>Cronometru</span><b id="af-t">0,00</b><small>s</small></div>
        <div class="afisaj"><span>Poziția bilei</span><b id="af-s">—</b><small>mm (A = 50, B = 150)</small></div>
        <div class="afisaj"><span>Stabilitate</span><b id="af-stab">—</b><small>°C/min</small></div>
      </div>
      <div class="grafic-mic"><canvas id="cv-live" height="230" aria-label="Vâscozitatea ν(t) măsurată, în scară logaritmică"></canvas></div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-manusi"> Mănuși de nitril, lavete și recipient pentru deșeuri</label>
      <label class="bifa"><input type="checkbox" id="ck-baie"> Baia umplută și pornită de cadrul didactic (max. 80 °C)</label>
      <h2>Proba și bila</h2>
      <label class="camp">Proba din vâscozimetru
        <select id="sel-proba"><option value="A">Ulei A</option><option value="U">Ulei 5W-30 uzat</option></select></label>
      <label class="camp" data-doar-demo>Uleiul A (mod demonstrativ)
        <select id="in-uleiA">${M1.OPTIUNI_A.map(k => `<option value="${k}">${ULEI[k].nume}</option>`).join("")}</select></label>
      <p class="nota" id="nota-uleiA"></p>
      <label class="camp">Bila
        <select id="sel-bila">${Object.entries(BILE).map(([k, b]) => `<option value="${k}">${b.nume} (K = ${fmt(b.K, 4)}, ρb = ${fmt(b.rb, 3)} g/cm³)</option>`).join("")}</select></label>
      <h2>Termostat</h2>
      <div class="doua">
        <label class="camp">Temperatura setată [°C]<input type="number" id="in-tset" value="40" min="20" max="80" step="5"></label>
        <label class="camp">&nbsp;<span class="inline"><button type="button" data-t="40">40</button><button type="button" data-t="60">60</button><button type="button" data-t="80">80</button></span></label>
      </div>
      <h2>Măsurarea</h2>
      <div class="rand-butoane">
        <button type="button" id="btn-rot">⟲ Rotește tubul 180°</button>
        <button type="button" id="btn-cron" class="primar">Start / Stop (Spațiu)</button>
        <button type="button" id="btn-reset">Reset</button>
      </div>
      <button type="button" class="primar lat" id="btn-inreg">● Înregistrează timpul în tabel</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari" open>
        <summary>Areometrul (densitatea la temperatura camerei)</summary>
        <label class="camp">Proba <select id="sel-areo"><option value="A">Ulei A</option><option value="U">Ulei uzat</option></select></label>
        <svg id="svg-areo" viewBox="0 0 320 300" style="width:100%;max-width:320px" role="img" aria-label="Areometru în cilindru gradat, cu lupă pe scală"></svg>
        <div class="doua"><label class="camp">Citirea voastră ρ [g/cm³]<input type="number" id="in-rc" step="0.0005" min="0.8" max="0.95" placeholder="0,8xxx"></label>
        <label class="camp">&nbsp;<button type="button" id="btn-dens">Trece în Tabelul 1.1</button></label></div>
        <p class="nota" id="msg-dens"></p>
      </details>
      <details class="setari">
        <summary>Afișare</summary>
        <label class="bifa"><input type="checkbox" id="ck-et" checked> Etichete pe schemă</label>
        <label class="bifa" data-doar-demo><input type="checkbox" id="ck-rapid"> Timp accelerat ×5 (doar pentru pregătire)</label>
      </details>
    </aside>
  </div>`,
    init(C) {
      construiesteSVG();
      $("#sel-proba").addEventListener("change", e => schimbaProba(e.target.value));
      $("#in-uleiA").addEventListener("change", e => { sim.cheieA = e.target.value; C.D.date.uleiA = sim.cheieA; C.P = C.parametri(); schimbaProba("A"); $("#sel-proba").value = "A"; deseneazaAreometru(); C.recalculeaza(); notaUlei(); });
      $("#sel-bila").addEventListener("change", e => schimbaBila(e.target.value));
      $("#in-tset").addEventListener("change", e => seteazaT(num(e.target.value)));
      $$("[data-t]").forEach(b => b.addEventListener("click", () => seteazaT(+b.dataset.t)));
      $("#btn-rot").addEventListener("click", rotesteTub);
      $("#btn-cron").addEventListener("click", cronometru);
      $("#btn-reset").addEventListener("click", resetCron);
      $("#btn-inreg").addEventListener("click", inregistreazaTimp);
      $("#btn-dens").addEventListener("click", inregistreazaDensitate);
      $("#sel-areo").addEventListener("change", deseneazaAreometru);
      $("#ck-et").addEventListener("change", e => { sim.etichete = e.target.checked; });
      $("#ck-rapid").addEventListener("change", e => { sim.rapid = e.target.checked ? 5 : 1; });
      const inSim = () => $("#tab-sim").classList.contains("activ") && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
      document.addEventListener("keydown", e => {
        if (!inSim()) return;
        if (e.code === "Space") { e.preventDefault(); if (!e.repeat) cronometru(e); }
        if (e.key === "Enter" && document.activeElement.tagName !== "BUTTON") inregistreazaTimp(e);
      });
      document.addEventListener("keyup", e => { if (e.code === "Space" && inSim()) e.preventDefault(); });
      sim.Tb = sim.Ts = tc(); sim.s = 12;
      $("#in-uleiA").value = sim.cheieA; $("#sel-bila").value = sim.bila; $("#sel-proba").value = sim.proba; $("#in-tset").value = sim.Tset;
      deseneazaAreometru(); notaUlei();
      C.mesaj("Măsurați întâi densitatea la areometru, apoi porniți termostatul la 40 °C și așteptați stabilizarea.", "");
    },
    aplicaEval(P, C) {
      sim.cheieA = P.uleiA; sim.rapid = 1;
      const s = $("#in-uleiA"); if (s) { s.value = P.uleiA; s.disabled = true; }
      const r = $("#ck-rapid"); if (r) { r.checked = false; r.disabled = true; }
      C.D.date.uleiA = P.uleiA;
      sim.Tb = sim.Ts = P.tc;
      if (SV.g) { deseneazaAreometru(); notaUlei(); }
    },
    reset() { Object.assign(sim, { proba: "A", umplere: 1, s: 12, rot: 0, rotind: false }); resetCron(); },
    cadru(dt, C, vizibil) {
      // ceas propriu, nelimitat (la cadre rare viteza bilei rămâne corectă față de cronometru)
      const acum = performance.now(); dt = Math.min(2, Math.max(0, (acum - (sim._t || acum)) / 1000)); sim._t = acum;
      const h = dt * sim.rapid;
      // termostatul (încălzire 0,6 °C/s, răcire 0,2 °C/s – timp comprimat) și proba (constantă de timp 20 s)
      const d = sim.Tset - sim.Tb; sim.Tb += clamp(d, -0.2 * h, 0.6 * h);
      const Tprec = sim.Ts; sim.Ts += (sim.Tb - sim.Ts) * (1 - Math.exp(-h / 20));
      sim.panta = ((sim.Ts - Tprec) / Math.max(h, 1e-6)) * 60;
      // umplerea / golirea tubului
      if (sim.umplere < 1) { sim.umplere = Math.min(1, sim.umplere + h / 3.5); if (sim.umplere >= 1) sim.s = 12; }
      // rotirea tubului cu 180°
      if (sim.rotind) {
        sim.rotT += dt; sim.rot = 180 * sstep01(sim.rotT / 1.2);
        if (sim.rotT >= 1.2) { sim.rotind = false; sim.rot = 0; sim.s = L_TUB - sim.s; sim.v = 0; if (sim.s > 20) sim.s = clamp(sim.s, 8, L_TUB - 8); deseneazaFurtunuri(); }
      } else if (sim.umplere >= 1) {
        // căderea bilei: accelerare scurtă, apoi viteza limită (din vâscozitate la temperatura actuală a probei)
        const vLim = M1.L_REPERE / timpAdevarat(), capat = L_TUB - 8;
        sim.v += (vLim - sim.v) * (1 - Math.exp(-h / 0.15));
        if (sim.s < capat) sim.s = Math.min(capat, sim.s + sim.v * h); else sim.v = 0;
      }
      if (!vizibil) return;
      actualizeazaSVG(dt);
      const now = performance.now();
      if (now - (this._ta || 0) > 120) {
        this._ta = now;
        $("#af-ts").textContent = fmt(Tafis(), 1); $("#af-t").textContent = fmt(valCron(), 2); $("#af-s").textContent = fmt(sim.s, 0);
        $("#af-stab").textContent = fmt(Math.abs(sim.panta), 2);
        const stab = Math.abs(sim.Ts - sim.Tb) < 0.15 && Math.abs(sim.Tset - sim.Tb) < 0.15;
        C.stare(1, stab ? `stabilizat la ${fmt(Tafis(), 1)} °C` : (sim.Tb < sim.Tset - 0.1 ? "termostatul încălzește…" : sim.Tb > sim.Tset + 0.1 ? "termostatul răcește…" : "proba se stabilizează…"), stab ? "inc" : "desc");
        C.stare(2, `${sim.proba === "A" ? "ulei A – " + cheieProba("A") : "ulei uzat"} · ${BILE[sim.bila].nume.split(" – ")[0]}`);
        if (sim.umplere < 1) C.mesajAuto("Umplerea tubului…", ""); else if (!$("#ck-manusi").checked) C.mesajAuto("Puneți mănușile de nitril înainte de a manipula uleiul (NSSM).", "atentie"); else C.mesajAuto("");
      }
      if (now - (this._tl || 0) > 400) { this._tl = now; deseneazaLive(); }
    },
    redeseneaza() { deseneazaLive(); },
    formule(C) {
      const t = valCron(), b = BILE[sim.bila], T = Tafis(), r15 = num(C.D.t.t11[sim.proba].rc) > 0 ? num(C.D.t.t11[sim.proba].rc) / (1 - M1.ALFA * (num(C.D.t.t11[sim.proba].tc) - 15)) : NaN;
      const rho = Number.isFinite(r15) ? M1.densitate(r15, T) : NaN, eta = b.K * (b.rb - rho) * t, nu = eta / rho, v = t > 0 ? M1.L_REPERE / t : NaN;
      const Re = rho * 1000 * (v / 1000) * (b.d / 1000) / (eta / 1000);
      return [
        ["Densitatea la t (1.4)", Number.isFinite(rho) ? `ρ = ${fmt(r15, 4)}·[1 − 0,00065·(${fmt(T, 1)} − 15)] = <span class="rez">${fmt(rho, 4)} g/cm³</span>` : "măsurați întâi densitatea (areometru)"],
        ["Vâscozitatea dinamică (1.3)", t > 0 && Number.isFinite(rho) ? `η = ${fmt(b.K, 4)}·(${fmt(b.rb, 3)} − ${fmt(rho, 4)})·${fmt(t, 2)} = <span class="rez">${fmt(eta, 2)} mPa·s</span>` : "—"],
        ["Vâscozitatea cinematică (1.2)", t > 0 && Number.isFinite(rho) ? `ν = η/ρ = <span class="rez">${fmt(nu, 2)} mm²/s</span>` : "—"],
        ["Viteza bilei și Re", t > 0 && Number.isFinite(rho) ? `v = 100/${fmt(t, 2)} = ${fmt(v, 2)} mm/s · Re = ρvd/η = <span class="rez">${fmt(Re, 3)}</span>` : "—"]
      ];
    }
  }
});
function sstep01(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
function notaUlei() { const a = ULEI[cheieProba("A")]; $("#nota-uleiA").innerHTML = `Uleiul A: <b>${a.nume}</b> · fișa tehnică: ν<sub>40</sub> = ${fmt(a.n40, 1)}, ν<sub>100</sub> = ${fmt(a.n100, 1)} mm²/s, ρ<sub>15</sub> = ${fmt(a.r15, 3)} g/cm³.`; }
