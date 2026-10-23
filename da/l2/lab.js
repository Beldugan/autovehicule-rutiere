/* DA – Lucrarea 2. Senzori și actuatori – date live și semnale reale.
   Simulator: motorul K7J 1.4 MPI pe stand, tester de diagnoză (date live, coduri, teste active), osciloscop cu cursoare,
   multimetru cu adaptoare back-probe și pompă de vid pentru senzorul MAP. Fiecare student are senzori proprii și un defect ascuns. */
"use strict";
const MD = MODELE["da-l2"];
const { DEFECTE, TIPURI } = MD;

/* ------------------------------------------------------------------ componentele standului */
const COMP = {
  ckp: { nume: "Senzorul de turație (inductiv, roata 60−2)", tip: "senzor", x: 232, y: 372 },
  ect: { nume: "Senzorul de temperatură a lichidului (NTC)", tip: "senzor", x: 652, y: 168 },
  iat: { nume: "Senzorul de temperatură a aerului admis (NTC)", tip: "senzor", x: 196, y: 70 },
  map: { nume: "Senzorul de presiune absolută din colector (MAP)", tip: "senzor", x: 560, y: 56 },
  tps: { nume: "Potențiometrul clapetei (poziția clapetei)", tip: "senzor", x: 238, y: 120 },
  l1: { nume: "Sonda λ amonte (ZrO₂)", tip: "senzor", x: 676, y: 266 },
  l2: { nume: "Sonda λ aval", tip: "senzor", x: 838, y: 336 },
  inj1: { nume: "Injectorul cilindrului 1", tip: "act", x: 336, y: 140 }, inj2: { nume: "Injectorul cilindrului 2", tip: "act", x: 406, y: 140 },
  inj3: { nume: "Injectorul cilindrului 3", tip: "act", x: 476, y: 140 }, inj4: { nume: "Injectorul cilindrului 4", tip: "act", x: 546, y: 140 },
  clap: { nume: "Corpul clapetei electronice (motor de acționare)", tip: "act", x: 236, y: 92 },
  can: { nume: "Supapa de purjare a canistrei", tip: "act", x: 150, y: 178 }
};
const SENZ = ["ckp", "ect", "iat", "map", "tps", "l1", "l2"], ACT = ["inj1", "inj2", "inj3", "inj4", "clap", "can"];

/* ------------------------------------------------------------------ starea motorului */
const sim = {
  contact: false, merge: false, mod: "ralanti", rpm: 0, rpmT: 0, ect: 20, iat: 20, p: 101, tps: 0, t: 0, tPorn: 0,
  phi: 0, lam1: 0.45, stft: 0, ltft: 0, furtun: false, sel: "ckp", decuplat: {}, aparat: "x431", mm: "V",
  testInj: 0, testT: 0, ventilator: false, coduri: [], vac: 0, pompaVid: false, defectDemo: "none", acc: 0,
  osc: { tdiv: 2e-3, vdiv: 1, zero: "centru", ruleaza: true, c1: 2, c2: 7, buf: null, t0: 0, perioade: 1 }
};
function P() { return Cadru.P; }
function defect() { return MOD.eval ? P().defect : sim.defectDemo; }
function pr() { return Object.assign({}, P(), { defect: defect() }); }
function buclaInchisa() { return sim.merge && sim.ect > 35 && sim.tPorn > 25; }

/* ------------------------------------------------------------------ semnalele senzorilor */
function semnal(c, t) {
  const d = defect();
  if (!sim.contact) return 0;
  switch (c) {
    case "ckp": {
      if (!sim.merge || sim.rpm < 50) return 0;
      const k = ((sim.rpm * t) % 60 + 60) % 60;                  // dinți parcurși (z = 60 → f = n)
      const A = P().kckp * sim.rpm / 1000 * (d === "ckp_gap" ? 0.35 : 1);
      if (k >= 58) return A * 0.15 * Math.sin(2 * Math.PI * (k - 58) / 2);            // golul (2 dinți lipsă)
      const amp = k < 1 || k > 57 ? 1.6 : 1;
      return A * amp * Math.sin(2 * Math.PI * k);
    }
    case "ect": return MD.tensiune("ect", { T: sim.ect }, pr()) + (Math.random() - 0.5) * 0.004;
    case "iat": return MD.tensiune("iat", { T: sim.iat }, pr()) + (Math.random() - 0.5) * 0.004;
    case "map": return MD.mapU(sim.p + Math.sin(t * sim.rpm / 30 * Math.PI) * (sim.merge ? 0.15 : 0), P()) + (Math.random() - 0.5) * 0.005;
    case "tps": return 0.52 + 4.0 * sim.tps / 100;
    case "l1": return lambdaU(t);
    case "l2": return sim.merge && sim.tPorn > 40 ? 0.64 + 0.03 * Math.sin(t * 0.7) : 0.45;
    case "inj1": case "inj2": case "inj3": case "inj4": {
      const i = Number(c.charAt(3)) - 1, ub = sim.merge ? 13.9 : 12.4;
      if (!sim.merge || sim.rpm < 50) return ub;
      if (sim.testInj === i + 1 || (d === "inj3_open" && i === 2)) return ub;     // fără comandă / bobină întreruptă
      const T = 120 / sim.rpm, ti = timpInj() / 1000, ph = ((t + i * T / 4 * [0, 2, 3, 1][i]) % T + T) % T;
      if (ph < ti) return 0.15;
      const dt = ph - ti;
      return ub + 52 * Math.exp(-dt / 0.00012) - 2.5 * Math.exp(-dt / 0.0006) * Math.cos(dt * 2 * Math.PI * 1800);
    }
    case "clap": return 6.5 + 1.5 * Math.sign(Math.sin(t * 2 * Math.PI * 2000)) * (sim.merge ? 1 : 0);
    case "can": return 12.6 - (sim.merge && sim.ect > 70 ? (Math.sin(t * 2 * Math.PI * 16) > 0.4 ? 12.4 : 0) : 0);
  }
  return 0;
}
function lambdaU(t) {
  if (!sim.merge) return 0.45;
  if (sim.tPorn < 18) return 0.45;                                       // sonda rece
  if (!buclaInchisa()) return 0.78;                                      // îmbogățire la rece (buclă deschisă)
  const aged = defect() === "lambda_aged", f = MD.frecventaLambda(pr(), sim.furtun || defect() === "aer_fals") * (sim.mod === "ralanti" ? 0.65 : 1);
  const s = Math.sin(sim.phi + 2 * Math.PI * f * (t - sim.t));
  return aged ? 0.45 + 0.15 * Math.tanh(1.2 * s) : 0.47 + 0.38 * Math.tanh(5 * s);
}
function timpInj() { return 2.9 * (sim.p / 34) * (1 + sim.stft / 100) * (1 + sim.ltft / 100) * (sim.ect < 60 ? 1.25 : 1); }
function x431(c) {
  const d = defect();
  switch (c) {
    case "ckp": return Math.round(sim.rpm);
    case "ect": return d === "ect_open" ? -40 : Math.round(sim.ect);
    case "iat": return d === "iat_short" ? 140 : Math.round(sim.iat);
    case "map": return Math.round(sim.p);
    case "tps": return Math.round(sim.tps * 10) / 10;
    case "l1": return Math.round(lambdaU(sim.t) * 1000) / 1000;
    case "l2": return Math.round(semnal("l2", sim.t) * 1000) / 1000;
  }
  return null;
}

/* ------------------------------------------------------------------ desenul motorului */
const SV = {};
function construiesteSVG() {
  const svg = $("#svg-motor"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs); filtre(defs);
  grad(defs, "gCompart", [[0, "#2b3036"], [1, "#15181c"]]);
  grad(defs, "gFonta", [[0, "#7c838b"], [0.5, "#5d646c"], [1, "#454b52"]]);
  grad(defs, "gChiul", [[0, "#c9ced3"], [0.5, "#a7adb3"], [1, "#868d94"]]);
  grad(defs, "gPlastic", [[0, "#3a3e44"], [0.5, "#1f2226"], [1, "#121417"]]);
  grad(defs, "gRugina", [[0, "#a8673a"], [0.5, "#7b4423"], [1, "#4f2a14"]]);
  grad(defs, "gCald", [[0, "#ff6a1a", 0.0], [1, "#ff6a1a", 0.0]]);
  const g = mk("g", {}, svg); SV.g = g;
  mk("rect", { x: 0, y: 0, width: 900, height: 420, fill: "url(#gCompart)" }, g);
  // radiatorul și ventilatorul
  mk("rect", { x: 846, y: 30, width: 46, height: 250, fill: "url(#pGrilaR)" }, g);
  const pr2 = mk("pattern", { id: "pGrilaR", width: 6, height: 4, patternUnits: "userSpaceOnUse" }, defs); mk("rect", { width: 6, height: 4, fill: "#3a3f45" }, pr2); mk("rect", { y: 1, width: 6, height: 1.6, fill: "#16191c" }, pr2);
  SV.vent = mk("g", { transform: "translate(868,150)" }, g);
  for (let k = 0; k < 7; k++) mk("path", { d: "M0 0 C 10 -20, 30 -30, 16 -46 L 6 -44 C 10 -30, 0 -14, 0 0", fill: "#222", transform: `rotate(${k * 360 / 7})` }, SV.vent);
  mk("circle", { cx: 0, cy: 0, r: 7, fill: "#444" }, SV.vent);
  // bateria
  mk("rect", { x: 26, y: 290, width: 120, height: 92, rx: 6, fill: "#1d1f22", stroke: "#000" }, g);
  mk("rect", { x: 26, y: 290, width: 120, height: 16, rx: 4, fill: "#2c2f33" }, g);
  mk("rect", { x: 44, y: 280, width: 16, height: 12, fill: "#c62828" }, g); mk("rect", { x: 112, y: 280, width: 16, height: 12, fill: "#222" }, g);
  const tb = mk("text", { x: 86, y: 345, "text-anchor": "middle", "font-size": 12, fill: "#9aa3ad", "font-weight": 700 }, g); tb.textContent = "12 V · 60 Ah";
  // calculatorul motorului
  mk("rect", { x: 22, y: 186, width: 116, height: 70, rx: 4, fill: "url(#gAlu)", stroke: "#555" }, g);
  mk("rect", { x: 30, y: 246, width: 100, height: 18, rx: 3, fill: "#111" }, g);
  const te = mk("text", { x: 80, y: 224, "text-anchor": "middle", "font-size": 11, fill: "#333", "font-weight": 700 }, g); te.textContent = "ECU";
  // filtrul de aer și tubulatura
  mk("rect", { x: 22, y: 32, width: 150, height: 92, rx: 10, fill: "url(#gPlastic)", stroke: "#000" }, g);
  mk("path", { d: "M172 64 C 190 64, 200 70, 214 86", fill: "none", stroke: "#202328", "stroke-width": 26, "stroke-linecap": "round" }, g);
  // blocul motor, chiulasa, capacul
  mk("rect", { x: 262, y: 200, width: 360, height: 180, rx: 6, fill: "url(#gFonta)", stroke: "#2c3035" }, g);
  for (let k = 0; k < 9; k++) mk("line", { x1: 280 + k * 40, y1: 210, x2: 280 + k * 40, y2: 370, stroke: "#4c5259", "stroke-width": 2, opacity: 0.6 }, g);
  mk("rect", { x: 252, y: 152, width: 380, height: 52, rx: 4, fill: "url(#gChiul)", stroke: "#5b6269" }, g);
  SV.capac = mk("rect", { x: 270, y: 112, width: 344, height: 42, rx: 12, fill: "url(#gNegru)", stroke: "#000" }, g);
  mk("circle", { cx: 588, cy: 124, r: 9, fill: "#c9a227" }, g);
  // carterul volantei cu fereastra roții dințate 60−2
  mk("path", { d: "M262 230 L 210 250 L 200 380 L 262 380 Z", fill: "url(#gFonta)", stroke: "#2c3035" }, g);
  SV.roata = mk("g", { transform: "translate(232,330)" }, g);
  mk("circle", { cx: 0, cy: 0, r: 34, fill: "#3b4046" }, SV.roata);
  for (let k = 0; k < 60; k++) if (k < 58) { const a = k * 6 * Math.PI / 180; mk("rect", { x: -1.6, y: -40, width: 3.2, height: 7, fill: "#9aa2ab", transform: `rotate(${k * 6})` }, SV.roata); }
  mk("circle", { cx: 0, cy: 0, r: 30, fill: "#2a2e33" }, SV.roata);
  // colectorul de admisie (plastic) cu 4 canale și plenul
  mk("rect", { x: 256, y: 60, width: 340, height: 40, rx: 16, fill: "url(#gPlastic)", stroke: "#000" }, g);
  [336, 406, 476, 546].forEach(x => mk("path", { d: `M${x - 18} 96 C ${x - 18} 130, ${x - 14} 140, ${x - 12} 156 L ${x + 12} 156 C ${x + 14} 140, ${x + 18} 130, ${x + 18} 96 Z`, fill: "url(#gPlastic)", stroke: "#000" }, g));
  // rampa de combustibil
  mk("rect", { x: 300, y: 128, width: 280, height: 9, rx: 4, fill: "url(#gCrom)" }, g);
  // conductele de evacuare și catalizatorul
  SV.evac = mk("path", { d: "M600 230 C 640 240, 660 260, 690 280 L 760 300", fill: "none", stroke: "url(#gRugina)", "stroke-width": 26, "stroke-linecap": "round" }, g);
  mk("rect", { x: 740, y: 282, width: 90, height: 46, rx: 18, fill: "url(#gInoxC)", stroke: "#444" }, g);
  grad(defs, "gInoxC", [[0, "#d7dbe0"], [0.5, "#9aa1a8"], [1, "#6b727a"]]);
  mk("path", { d: "M828 306 L 890 320", stroke: "url(#gRugina)", "stroke-width": 16, fill: "none" }, g);
  // pompa de vid (pentru MAP), ascunsă implicit
  SV.pompa = mk("g", { style: "display:none" }, g);
  mk("rect", { x: 600, y: 14, width: 40, height: 64, rx: 8, fill: "#c62828", stroke: "#6d0f0f" }, SV.pompa);
  mk("path", { d: "M600 40 C 585 40, 575 50, 566 60", fill: "none", stroke: "#111", "stroke-width": 4 }, SV.pompa);
  SV.vacuum = manometru(SV.pompa, 670, 40, 24, { max: 110, unit: "kPa abs", pasMaj: 20, pasMin: 5, subtitlu: "absolut" });

  // componentele selectabile
  SV.comp = {};
  const grup = (k, fn) => { const gg = mk("g", { class: "comp-da", "data-c": k, style: "cursor:pointer" }, g); fn(gg); gg.addEventListener("click", () => selecteaza(k)); SV.comp[k] = gg; return gg; };
  const conector = (gg, x, y, w = 16, h = 10, c = "#5f6670") => mk("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 2, fill: c, stroke: "#222", class: "conector" }, gg);
  grup("ckp", gg => { mk("rect", { x: 222, y: 360, width: 20, height: 26, rx: 3, fill: "#1a1a1a" }, gg); conector(gg, 232, 394, 18, 9); });
  grup("ect", gg => { mk("rect", { x: 622, y: 158, width: 34, height: 30, rx: 4, fill: "url(#gAlu)" }, gg); mk("rect", { x: 646, y: 160, width: 14, height: 16, fill: "url(#gAlama)" }, gg); conector(gg, 666, 168, 12, 14, "#2b6f3a"); });
  grup("iat", gg => { mk("circle", { cx: 196, cy: 70, r: 7, fill: "#3a3f45" }, gg); conector(gg, 196, 58, 12, 10, "#2b4f8a"); });
  grup("map", gg => { mk("rect", { x: 546, y: 48, width: 28, height: 16, rx: 3, fill: "#2d3238", stroke: "#000" }, gg); conector(gg, 560, 42, 14, 8); });
  grup("clap", gg => { mk("rect", { x: 212, y: 72, width: 48, height: 44, rx: 6, fill: "url(#gAlu)", stroke: "#555" }, gg); mk("circle", { cx: 236, cy: 94, r: 14, fill: "#2a2e33" }, gg); SV.clapeta = mk("line", { x1: 224, y1: 94, x2: 248, y2: 94, stroke: "#c0c6cc", "stroke-width": 3 }, gg); conector(gg, 236, 66, 16, 8); });
  grup("tps", gg => { mk("rect", { x: 228, y: 114, width: 20, height: 14, rx: 3, fill: "#1d1f22" }, gg); conector(gg, 238, 134, 12, 8); });
  grup("l1", gg => { mk("rect", { x: 670, y: 250, width: 12, height: 24, rx: 2, fill: "url(#gCrom)", transform: "rotate(-30 676 262)" }, gg); mk("path", { d: "M682 248 C 700 220, 720 210, 740 200", fill: "none", stroke: "#111", "stroke-width": 3 }, gg); conector(gg, 744, 198, 14, 9, "#7a3b8a"); });
  grup("l2", gg => { mk("rect", { x: 832, y: 318, width: 12, height: 22, rx: 2, fill: "url(#gCrom)" }, gg); mk("path", { d: "M838 318 C 838 290, 830 270, 820 256", fill: "none", stroke: "#111", "stroke-width": 3 }, gg); conector(gg, 818, 252, 14, 9, "#7a3b8a"); });
  ACT.slice(0, 4).forEach((k, i) => grup(k, gg => { const x = [336, 406, 476, 546][i]; mk("rect", { x: x - 7, y: 128, width: 14, height: 28, rx: 3, fill: "#2c7a3a", stroke: "#123" }, gg); conector(gg, x, 122, 16, 10, "#5f6670"); const t = mk("text", { x, y: 172, "text-anchor": "middle", "font-size": 9, fill: "#cfd6dd" }, gg); t.textContent = "cil. " + (i + 1); }));
  grup("can", gg => { mk("rect", { x: 138, y: 166, width: 26, height: 24, rx: 4, fill: "#1b1d20", stroke: "#000" }, gg); mk("path", { d: "M164 176 C 190 176, 220 140, 260 98", fill: "none", stroke: "#111", "stroke-width": 4 }, gg); conector(gg, 150, 160, 12, 8); });
  // cablul instrumentului către componenta selectată
  SV.sonde = mk("g", {}, g);
  SV.selRect = mk("rect", { fill: "none", stroke: "#ffcf4d", "stroke-width": 2, "stroke-dasharray": "5 3", rx: 6 }, g);
  // etichete
  SV.et = mk("g", { "font-size": 10.5, fill: "#e6ebf0" }, g);
  Object.entries(COMP).forEach(([k, c]) => { const t = mk("text", { x: c.x + 10, y: c.y - 10, "font-weight": 600 }, SV.et); t.textContent = { ckp: "CKP", ect: "CTS", iat: "IAT", map: "MAP", tps: "TPS", l1: "λ1", l2: "λ2", inj1: "", inj2: "", inj3: "", inj4: "", clap: "clapetă", can: "canistră" }[k]; });
  prefixeazaId(svg, "d2-");
  actualizeazaSVG(0);
}
function actualizeazaSVG(dt) {
  if (!SV.g) return;
  // selecția și sondele
  const gsel = SV.comp[sim.sel]; if (gsel) { const b = gsel.getBBox(); Object.entries({ x: b.x - 6, y: b.y - 6, width: b.width + 12, height: b.height + 12 }).forEach(([k, v]) => SV.selRect.setAttribute(k, v)); }
  SV.sonde.innerHTML = "";
  if (sim.aparat !== "x431" || sim.pompaVid) {
    const c = COMP[sim.sel], col = sim.aparat === "osc" ? "#ffd400" : "#d32f2f";
    mk("path", { d: `M10 418 C 120 418, ${c.x - 60} ${c.y + 120}, ${c.x} ${c.y + 6}`, fill: "none", stroke: col, "stroke-width": 2.4 }, SV.sonde);
    mk("path", { d: `M14 420 C 130 420, ${c.x - 40} ${c.y + 130}, ${c.x + 4} ${c.y + 8}`, fill: "none", stroke: "#111", "stroke-width": 2.4 }, SV.sonde);
    mk("circle", { cx: c.x, cy: c.y + 6, r: 3.5, fill: col }, SV.sonde);
  } else {
    mk("path", { d: "M10 418 C 60 418, 60 300, 70 262", fill: "none", stroke: "#2a5bd7", "stroke-width": 4 }, SV.sonde); // cablul OBD spre priza de diagnoză
  }
  // conectori decuplați
  Object.entries(SV.comp).forEach(([k, gg]) => { const c = gg.querySelector("[class$=conector]") || gg.querySelector(".conector"); if (c) c.setAttribute("transform", sim.decuplat[k] ? "translate(0,-7)" : ""); });
  // animații
  if (sim.merge) {
    SV.unghiR = ((SV.unghiR || 0) + sim.rpm / 60 * 360 * dt / 50) % 360;
    SV.roata.setAttribute("transform", `translate(232,330) rotate(${SV.unghiR})`);
    SV.capac.setAttribute("transform", `translate(${(Math.random() - 0.5) * 0.6},${(Math.random() - 0.5) * 0.6})`);
  }
  if (sim.ventilator || sim.ect > 98) { SV.uv = ((SV.uv || 0) + 900 * dt) % 360; SV.vent.setAttribute("transform", `translate(868,150) rotate(${SV.uv})`); }
  SV.clapeta.setAttribute("transform", `rotate(${-sim.tps * 0.85} 236 94)`);
  const cald = clamp((sim.ect - 40) / 60, 0, 1) * (sim.merge ? 1 : 0.4);
  SV.evac.setAttribute("filter", cald > 0.5 ? `url(#d2-fUmbra)` : "");
  SV.pompa.style.display = sim.pompaVid ? "" : "none";
  if (sim.pompaVid) SV.vacuum(sim.p);
  SV.et.style.display = $("#ck-et") && !$("#ck-et").checked ? "none" : "";
}
function selecteaza(k) {
  sim.sel = k; $("#sel-comp").value = k; actualizeazaPanou();
}

/* ------------------------------------------------------------------ osciloscopul */
const TDIV = [0.5e-3, 1e-3, 2e-3, 5e-3, 10e-3, 20e-3, 50e-3, 0.1, 0.2, 0.5, 1];
const VDIV = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
function fmtT(s) { return s >= 1 ? fmt(s, 2) + " s" : s >= 1e-3 ? fmt(s * 1000, s >= 0.1 ? 0 : 2) + " ms" : fmt(s * 1e6, 0) + " µs"; }
function achizitie() {
  const o = sim.osc, N = 1200, T = o.tdiv * 10;
  let t0 = sim.t - T;
  if (o.tdiv < 0.1 && sim.merge && sim.sel === "ckp") {                // declanșare pe frontul crescător (imagine stabilă)
    const f = sim.rpm; if (f > 0) { const per = 1 / f; t0 = Math.floor((sim.t - T) / per) * per; }
  }
  if (/^inj/.test(sim.sel) && sim.merge && sim.rpm > 50 && o.tdiv < 0.1) { const per = 120 / sim.rpm; t0 = Math.floor((sim.t - T) / per) * per - o.tdiv; }
  const buf = new Float32Array(N); for (let i = 0; i < N; i++) buf[i] = semnal(sim.sel, t0 + T * i / (N - 1));
  o.buf = buf; o.t0 = t0;
}
function deseneazaOsc() {
  const cv = $("#cv-osc"); if (!cv || !cv.offsetParent) return;
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = +cv.dataset.h || 300;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const o = sim.osc, m = { l: 8, r: 8, t: 8, b: 8 }, w = W - m.l - m.r, h = H - m.t - m.b;
  g.fillStyle = "#0b1410"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(120,200,160,.18)"; g.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const x = m.l + w * i / 10; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); }
  for (let j = 0; j <= 8; j++) { const y = m.t + h * j / 8; g.beginPath(); g.moveTo(m.l, y); g.lineTo(m.l + w, y); g.stroke(); }
  g.strokeStyle = "rgba(120,200,160,.4)"; for (let i = 0; i <= 50; i++) { const x = m.l + w * i / 50; g.beginPath(); g.moveTo(x, m.t + h / 2 - 3); g.lineTo(x, m.t + h / 2 + 3); g.stroke(); }
  const y0 = o.zero === "centru" ? m.t + h / 2 : m.t + h * 7 / 8, Y = v => y0 - v / o.vdiv * h / 8;
  g.fillStyle = "#ffd400"; g.beginPath(); g.moveTo(m.l, y0); g.lineTo(m.l + 7, y0 - 5); g.lineTo(m.l + 7, y0 + 5); g.fill();
  if (o.buf) {
    g.strokeStyle = "#ffe14d"; g.lineWidth = 1.6; g.shadowColor = "#ffe14d"; g.shadowBlur = 4; g.beginPath();
    o.buf.forEach((v, i) => { const x = m.l + w * i / (o.buf.length - 1), y = clamp(Y(v), m.t - 2, m.t + h + 2); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.shadowBlur = 0;
  }
  // cursoarele
  [o.c1, o.c2].forEach((c, k) => { const x = m.l + w * c / 10; g.strokeStyle = k ? "#5ad1ff" : "#ff7a5a"; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle; g.font = "11px system-ui"; g.fillText(k ? "B" : "A", x + 3, m.t + 12); });
  g.fillStyle = "#9fe6c0"; g.font = "12px system-ui"; g.fillText(`${fmtT(o.tdiv)}/div   ${fmt(o.vdiv, o.vdiv < 1 ? 2 : 0)} V/div   ${o.ruleaza ? "RUN" : "STOP"}`, m.l + 8, m.t + h - 8);
  // citirile cursoarelor
  const dt = (o.c2 - o.c1) * o.tdiv, val = c => o.buf ? o.buf[Math.round(c / 10 * (o.buf.length - 1))] : NaN;
  $("#osc-cit").innerHTML = `Δt = <b>${fmtT(Math.abs(dt))}</b> · 1/Δt = <b>${Math.abs(dt) > 0 ? fmt(1 / Math.abs(dt), 1) : "—"} Hz</b> · U<sub>A</sub> = <b>${fmt(val(o.c1), 2)} V</b> · U<sub>B</sub> = <b>${fmt(val(o.c2), 2)} V</b>`;
}
function legaOsc() {
  const cv = $("#cv-osc"); let trag = null;
  const pozDiv = e => { const r = cv.getBoundingClientRect(); return clamp((e.clientX - r.left - 8) / (r.width - 16) * 10, 0, 10); };
  cv.addEventListener("pointerdown", e => { const d = pozDiv(e); trag = Math.abs(d - sim.osc.c1) < Math.abs(d - sim.osc.c2) ? "c1" : "c2"; sim.osc[trag] = d; cv.setPointerCapture(e.pointerId); deseneazaOsc(); });
  cv.addEventListener("pointermove", e => { if (trag) { sim.osc[trag] = pozDiv(e); deseneazaOsc(); } });
  cv.addEventListener("pointerup", () => trag = null);
}

/* ------------------------------------------------------------------ multimetrul */
function citireMultimetru() {
  const c = sim.sel;
  if (sim.mm === "Ω") {
    if (sim.contact) return { txt: "oprit", msg: "Rezistența se măsoară numai cu contactul decuplat." };
    if (!sim.decuplat[c]) return { txt: "—", msg: "Decuplați conectorul componentei pentru a măsura rezistența." };
    if (["map", "tps", "l1", "l2"].includes(c)) return { txt: "—", msg: "Pentru acest senzor se măsoară tensiunea de semnal (back-probe), nu rezistența." };
    const R = MD.rezistenta(c, { T: c === "iat" ? sim.iat : sim.ect }, pr());
    if (!isFinite(R)) return { txt: "OL", v: "OL", unit: "Ω" };
    const v = R >= 1000 ? Math.round(R) : Math.round(R * 100) / 100;
    return { txt: R >= 1000 ? fmt(R / 1000, 3) + " kΩ" : fmt(v, R < 100 ? 2 : 1) + " Ω", v, unit: "Ω" };
  }
  if (sim.decuplat[c]) return { txt: "—", msg: "Pentru tensiunea de semnal conectorul trebuie cuplat (măsurare back-probe)." };
  if (!sim.contact) return { txt: "0,00 V", v: 0, unit: "V" };
  if (c === "ckp") return { txt: "~", msg: "Semnalul inductiv este alternativ: folosiți osciloscopul." };
  if (/^inj|clap|can/.test(c)) { const v = Math.round(semnal(c, sim.t + 0.0137) * 100) / 100; return { txt: fmt(v, 2) + " V", v, unit: "V", msg: "Pe actuatoare forma comenzii se vede doar cu osciloscopul." }; }
  let v = c === "l1" ? lambdaU(sim.t) : semnal(c, sim.t); v = Math.round(v * 1000) / 1000;
  return { txt: fmt(v, 3) + " V", v, unit: "V" };
}

/* ------------------------------------------------------------------ comenzile motorului */
function contact(on) { sim.contact = on; if (!on) { sim.merge = false; sim.rpm = 0; } actualizeazaPanou(); }
function pornire() {
  if (!sim.contact) contact(true);
  if (Object.values(sim.decuplat).some(Boolean)) return Cadru.mesajTemporar("Cuplați toți conectorii înainte de pornire.", "atentie");
  if (sim.pompaVid) return Cadru.mesajTemporar("Scoateți pompa de vid și refaceți legătura senzorului MAP.", "atentie");
  if (!$("#ck-exhaust").checked) return Cadru.mesajTemporar("Conectați exhaustarea înainte de pornire (NSSM).", "pericol");
  sim.merge = true; sim.tPorn = 0; sim.rpm = 250; sim.mod = "ralanti";
}
function adaugaCod(c) { if (!sim.coduri.includes(c)) sim.coduri.push(c); }

/* ------------------------------------------------------------------ înregistrările */
function inregistreazaMultimetru(e) {
  const c = sim.sel, r = citireMultimetru();
  if (r.v == null) return Cadru.mesajTemporar(r.msg || "Nu există o citire validă.", "atentie");
  if (r.unit === "V" && !sim.contact) return Cadru.mesajTemporar("Puneți contactul pentru a măsura tensiunea de semnal.", "atentie");
  const T = c === "iat" ? sim.iat : sim.ect, celule = [];
  let msg;
  if (r.unit === "Ω") {
    if (SENZ.includes(c)) { celule.push({ t: "t21", r: c, c: "R", v: String(r.v) }); msg = `Tabelul 2.1: R ${c.toUpperCase()} = ${r.txt}.`; }
    else { celule.push({ t: "t24", r: c, c: "R", v: String(r.v) }); msg = `Tabelul 2.4: ${COMP[c].nume} – R = ${r.txt}.`; }
  } else if (SENZ.includes(c) && c !== "ckp") { celule.push({ t: "t21", r: c, c: "mas", v: String(r.v) }); msg = `Tabelul 2.1: ${COMP[c].nume} – U = ${r.txt}.`; }
  else msg = `Citire salvată în jurnal: ${r.txt}.`;
  const ok = Cadru.inregistreaza(e, { log: { m: r.unit === "Ω" ? "ohm" : "volt", c, v: r.v, T: Math.round(T * 100) / 100, p: Math.round(sim.p * 100) / 100 }, celule });
  if (ok) $("#msg-inreg").textContent = msg;
}
function inregistreazaOsc(e) {
  if (sim.sel !== "ckp") return Cadru.mesajTemporar("Din osciloscop se trece în tabel frecvența senzorului de turație (CKP). Pentru sonda λ citiți numărul de comutări și tensiunile și scrieți-le în Tabelul 2.3.", "atentie");
  if (sim.osc.ruleaza) return Cadru.mesajTemporar("Opriți afișarea (STOP), plasați cursoarele pe aceeași fază a semnalului și indicați câte perioade cuprind.", "atentie");
  const dt = Math.abs(sim.osc.c2 - sim.osc.c1) * sim.osc.tdiv, n = Math.max(1, Math.round(num($("#in-per").value) || 1));
  if (!(dt > 0)) return;
  const f = Math.round(n / dt * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "freq", c: "ckp", v: f, rpm: Math.round(sim.rpmCapt) }, celule: [{ t: "t21", r: "ckp", c: "mas", v: f.toFixed(1) }] });
  if (ok) $("#msg-inreg").textContent = `Tabelul 2.1: frecvența CKP = ${n}/${fmtT(dt)} = ${fmt(f, 1)} Hz.`;
}
function inregistreazaX431(e) {
  const c = sim.sel, v = x431(c);
  if (!SENZ.includes(c) || v == null) return Cadru.mesajTemporar("Selectați un senzor din Tabelul 2.1.", "atentie");
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul pentru a citi datele live.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "x431", c, v }, celule: [{ t: "t21", r: c, c: "x431", v: String(v) }] });
  if (ok) $("#msg-inreg").textContent = `Tabelul 2.1: X431 – ${COMP[c].nume}: ${v}.`;
}
function inregistreazaTrim(e) {
  if (!buclaInchisa() || Math.abs(sim.rpm - 2000) > 150) return Cadru.mesajTemporar("STFT și LTFT se citesc la ≈ 2000 rot/min, cu motorul cald, în buclă închisă.", "atentie");
  const k = sim.furtun ? "a" : "n", s = Math.round(sim.stft * 10) / 10, l = Math.round(sim.ltft * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "trim", k, stft: s, ltft: l }, celule: [{ t: "t23", r: k, c: "STFT", v: s.toFixed(1) }, { t: "t23", r: k, c: "LTFT", v: l.toFixed(1) }] });
  if (ok) $("#msg-inreg").textContent = `Tabelul 2.3 (${k === "a" ? "aer fals" : "normal"}): STFT = ${fmt(s, 1)} %, LTFT = ${fmt(l, 1)} %.`;
}
function inregistreazaMAP(e) {
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul (motor oprit) pentru a alimenta senzorul MAP.", "atentie");
  if (!sim.pompaVid || sim.sel !== "map") return Cadru.mesajTemporar("Conectați pompa de vid la senzorul MAP (motor oprit, contact pus).", "atentie");
  const r = citireMultimetru(); if (sim.mm !== "V" || r.v == null) return Cadru.mesajTemporar("Multimetrul trebuie să fie pe V, conectat back-probe la semnalul MAP.", "atentie");
  const t22 = Cadru.D.t.t22, k = ["1", "2", "3", "4", "5"].find(k => t22[k].p === "");
  if (!k) return Cadru.mesajTemporar("Tabelul 2.2 are deja 5 puncte.", "atentie");
  const p = Math.round(sim.p * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "map", p, U: r.v }, celule: [{ t: "t22", r: k, c: "p", v: p.toFixed(1) }, { t: "t22", r: k, c: "U", v: String(r.v) }] });
  if (ok) $("#msg-inreg").textContent = `Tabelul 2.2, punctul ${k}: p = ${fmt(p, 1)} kPa, U = ${fmt(r.v, 3)} V.`;
}

/* ------------------------------------------------------------------ panoul de instrumente */
function actualizeazaPanou() {
  $$("[data-aparat]").forEach(b => b.setAttribute("aria-pressed", b.dataset.aparat === sim.aparat ? "true" : "false"));
  $$(".panou-aparat").forEach(p => p.hidden = p.dataset.p !== sim.aparat);
  $("#nume-comp").textContent = COMP[sim.sel].nume;
  $("#btn-dec").textContent = sim.decuplat[sim.sel] ? "Cuplează conectorul" : "Decuplează conectorul";
  $("#btn-contact").textContent = sim.contact ? "Contact: PUS (decuplează)" : "Contact: DECUPLAT (pune)";
  $("#btn-pompa").textContent = sim.pompaVid ? "Scoate pompa de vid" : "Conectează pompa de vid la MAP";
}
function liveX431() {
  const el = $("#x431-live"); if (!el || el.offsetParent === null) return;
  const d = defect(), on = sim.contact;
  const rand = (n, v, u) => `<tr><td>${n}</td><td><b>${on ? v : "—"}</b></td><td>${u}</td></tr>`;
  el.innerHTML = `<table class="tabel x431"><tbody>
    ${rand("Turație motor", Math.round(sim.rpm), "rot/min")}${rand("Temp. lichid răcire", x431("ect"), "°C")}${rand("Temp. aer admis", x431("iat"), "°C")}
    ${rand("Presiune colector", Math.round(sim.p), "kPa")}${rand("Poziție clapetă", fmt(sim.tps, 1), "%")}${rand("Tensiune sondă λ amonte", fmt(lambdaU(sim.t), 3), "V")}
    ${rand("Tensiune sondă λ aval", fmt(semnal("l2", sim.t), 3), "V")}${rand("Timp de injecție", fmt(sim.merge ? timpInj() : 0, 2), "ms")}
    ${rand("Corecție scurtă STFT", fmt(sim.merge ? sim.stft : 0, 1), "%")}${rand("Corecție lungă LTFT", fmt(sim.ltft, 1), "%")}
    ${rand("Stare buclă", buclaInchisa() ? "închisă" : "deschisă", "")}${rand("Tensiune baterie", fmt(sim.merge ? 13.9 : 12.4, 1), "V")}</tbody></table>`;
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaDA2(D) {
  const o = MD.prelucreaza(D.t, { num });
  const cel = { t21: {}, t22: {}, t23: {}, t24: {}, t25: {} }, rele = { t21: {}, t23: {} };
  const REF = { ckp: "R 200…1000 Ω; f = n (roată 60−2)", ect: "R(20 °C) ≈ 3 kΩ; U ≈ 2,9 V rece, ≈ 0,7 V cald", iat: "U ≈ 2,5…3,2 V la 15…30 °C", map: "≈ 4 V contact pus; 1,0…1,5 V ralanti", tps: "0,4…0,6 V închisă; ≈ 4,5 V plin", l1: "0,1…0,9 V, comutare > 0,5 Hz", l2: "≈ 0,6…0,7 V stabil" };
  SENZ.forEach(c => {
    const r = D.t.t21[c]; let calc = "";
    if (c === "ckp" && num(r.mas) > 0) calc = `n = 60·f/60 = ${fmt(num(r.mas), 0)} rot/min`;
    if ((c === "ect" || c === "iat") && num(r.mas) > 0) calc = `T(U) = ${fmt(MD.tempDinU(num(r.mas), MD.NOM.R25, MD.NOM.B), 1)} °C`;
    if (c === "map" && num(r.mas) > 0 && o.map) calc = `p(U) = ${fmt(o.map.a * num(r.mas) + o.map.b, 1)} kPa`;
    cel.t21[c] = { ref: REF[c], calc };
    rele.t21[c] = { tip: r.tip !== "" && TIPURI.indexOf(r.tip) !== MD.TIP_CORECT[c] };
  });
  ["n", "a"].forEach(k => { cel.t23[k] = { f: fmt(o["f_" + k], 2), k: fmt(o["k_" + k], 3) }; rele.t23[k] = { f: o["f_" + k] < 0.5, k: Math.abs(o["k_" + k] - 1) > 0.1 }; });
  const rez = [
    ["Turația din frecvența CKP (2.2)", Number.isFinite(o.nckp) ? `${fmt(o.nckp, 0)} rot/min (X431: ${D.t.t21.ckp.x431 || "—"})` : "—"],
    ["Temperatura lichidului din U (2.3–2.4), R₂₅ = 2,5 kΩ, B = 3450 K", Number.isFinite(o.Tect) ? `${fmt(o.Tect, 1)} °C (X431: ${D.t.t21.ect.x431 || "—"} °C)` : "—"],
    ["Caracteristica MAP p = a·U + b (regresie)", o.map ? `a = <span style='color:var(--accent)'>${fmt(o.map.a, 2)}</span> kPa/V · b = ${fmt(o.map.b, 2)} kPa` : "min. 2 puncte"],
    ["Sonda λ – frecvența de comutare (2.6)", `normal: ${fmt(o.f_n, 2)} Hz · aer fals: ${fmt(o.f_a, 2)} Hz`],
    ["Factorul total de corecție (2.7)", `normal: ${fmt(o.k_n, 3)} · aer fals: ${fmt(o.k_a, 3)}`]
  ];
  const verdicte = [];
  if (Number.isFinite(o.f_n)) verdicte.push(o.f_n >= 0.5 ? { tip: "ok", text: `Sonda λ comută cu ${fmt(o.f_n, 2)} Hz (≥ 0,5 Hz) – funcțională.` } : { tip: "atentie", text: `Sonda λ comută doar cu ${fmt(o.f_n, 2)} Hz (< 0,5 Hz): sondă îmbătrânită.` });
  if (Number.isFinite(o.k_n)) verdicte.push(Math.abs(o.k_n - 1) <= 0.1 ? { tip: "ok", text: `Corecția totală ${fmt(o.k_n, 3)} – în limita ±10 %.` } : { tip: "atentie", text: `Corecția totală ${fmt(o.k_n, 3)} depășește ±10 %: dezechilibru persistent al amestecului (aer fals, presiune combustibil, injectoare).` });
  if (Number.isFinite(o.Tect) && num(D.t.t21.ect.x431) === -40) verdicte.push({ tip: "atentie", text: "Testerul afișează −40 °C (valoare de substituție): circuit întrerupt la senzorul de temperatură – comparați cu tensiunea măsurată." });
  const xs = [], ys = []; ["1", "2", "3", "4", "5"].forEach(k => { const p = num(D.t.t22[k].p), u = num(D.t.t22[k].U); if (Number.isFinite(p) && Number.isFinite(u)) { xs.push(u); ys.push(p); } });
  const serii = [{ tip: "pct", pts: xs.map((x, i) => [x, ys[i]]), culoare: 0 }];
  if (o.map) serii.push({ tip: "linie", pts: [[0, o.map.b], [5, o.map.a * 5 + o.map.b]], culoare: 0, punctat: true });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Caracteristica senzorului MAP p = f(U)",
    grafic: { xmin: 0, xmax: 5, ymin: 0, ymax: 120, xticks: [0, 1, 2, 3, 4, 5], xlab: "U [V]", ylab: "p [kPa]", serii },
    legenda: [["puncte măsurate (pompa de vid)", "var(--serie-0)", "pct"], ["regresie liniară", "var(--serie-0)"]],
    principal: { eticheta: "MAP a [kPa/V]", valoare: o.map ? +o.map.a.toFixed(2) : null }, o
  };
}

/* ------------------------------------------------------------------ conținut didactic (după îndrumar) */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Conectorii senzorilor și actuatorilor se desfac și se cuplează numai cu contactul decuplat; sondele osciloscopului se montează cu adaptoare back-probe, fără a înțepa izolația.</li>
<li>La deconectarea injectoarelor și electrovalvelor apar vârfuri de autoinducție de 40…70 V: nu se ating bornele în timpul testelor active.</li>
<li>Motorul se pornește numai cu exhaustarea conectată; mâinile și cablurile se țin departe de curea, ventilator și galeria de evacuare (peste 300 °C).</li>
<li>Senzorii Hall și circuitele ECU nu se verifică cu ohmmetrul sau cu lampa de control cu bec.</li>
<li>Pompa de vid și furtunurile desprinse pentru simularea aerului fals se manevrează numai cu motorul la ralanti, la comanda cadrului didactic.</li></ul></div>
<h2>2.1. Scopul lucrării</h2>
<p>Identificarea tipului de semnal al fiecărui senzor și alegerea metodei de măsurare; compararea valorilor afișate de tester (date live) cu semnalul măsurat direct la senzor; verificarea actuatorilor prin teste active și prin forma de undă; recunoașterea valorilor de substituție folosite de ECU când un senzor se defectează.</p>
<h2>2.2. Noțiuni teoretice</h2>
<p>Senzorii transformă o mărime fizică într-un semnal electric pe care ECU îl convertește printr-o curbă caracteristică. Pentru diagnoză contează forma semnalului (Fig. 2.1): tensiune continuă variabilă 0…5 V (NTC, clapetă, pedală, MAP), tensiune alternativă (senzori inductivi, senzorul de detonație), semnal dreptunghiular sau de frecvență (Hall, debitmetre digitale), semnal de comutare la prag (sonda λ cu salt) și comandă PWM (injectoare, EGR, clapeta electronică). Domeniile osciloscopului se reglează astfel încât semnalul să ocupe 2/3 din ecran și să se vadă 2–3 perioade.</p>
<figure><img src="img/fig2_1.jpg" alt="Fig. 2.1 Tipurile de semnale" loading="lazy"><figcaption>Fig. 2.1. Tipurile de semnale întâlnite la senzorii și actuatorii motorului</figcaption></figure>
<p>Senzorul inductiv al arborelui cotit are un magnet permanent și o bobină în fața unei roți cu 60 − 2 dinți. Frecvența semnalului este proporțională cu turația, iar amplitudinea crește cu turația (Fig. 2.2); golul dinților lipsă dă referința de poziție. Din frecvența măsurată se calculează turația (z = 60, pasul roții):</p>
<div class="ec"><span>f = z·n/60 [Hz]</span><span class="nr">(2.1)</span></div>
<div class="ec"><span>n = 60·f/z [rot/min]</span><span class="nr">(2.2)</span></div>
<figure><img src="img/fig2_2.jpg" alt="Fig. 2.2 Semnalul senzorului inductiv" loading="lazy"><figcaption>Fig. 2.2. Semnalul senzorului inductiv de turație și dependența amplitudinii de turație</figcaption></figure>
<p>Senzorii de temperatură sunt termistoare NTC: rezistența scade exponențial cu temperatura. Senzorul este legat în serie cu o rezistență de polarizare R<sub>p</sub> din ECU, alimentată la 5 V, iar ECU citește tensiunea de pe senzor (Fig. 2.3). La întrerupere tensiunea urcă spre 5 V și testerul afișează tipic −40 °C; la scurtcircuit la masă tensiunea este ≈ 0 V și temperatura afișată este foarte mare.</p>
<div class="ec"><span>R(T) = R<sub>25</sub>·e<sup>B·(1/T − 1/T<sub>25</sub>)</sup></span><span class="nr">(2.3)</span></div>
<div class="ec"><span>U<sub>s</sub> = U<sub>ref</sub>·R(T)/(R(T) + R<sub>p</sub>)</span><span class="nr">(2.4)</span></div>
<figure><img src="img/fig2_3.jpg" alt="Fig. 2.3 Caracteristica senzorului NTC" loading="lazy"><figcaption>Fig. 2.3. Caracteristica senzorului NTC (R<sub>25</sub> = 2,5 kΩ, B = 3450 K) și tensiunea de semnal (R<sub>p</sub> = 2,2 kΩ)</figcaption></figure>
<p>La motorul K7J sarcina se determină cu senzorul de presiune absolută din colector (MAP): cu contactul pus indică presiunea atmosferică (≈ 4 V), iar la ralanti ≈ 30…40 kPa (≈ 1…1,5 V). Caracteristica este liniară și se verifică cu pompa de vid:</p>
<div class="ec"><span>p = a·U + b</span><span class="nr">(2.5)</span></div>
<p>Sonda λ cu salt de tensiune (ZrO₂) funcționează peste ≈ 350 °C și dă ≈ 0,8…0,9 V la amestec bogat și ≈ 0,1 V la amestec sărac. Cu motorul cald, în buclă închisă, tensiunea comută continuu în jurul valorii de 0,45 V; o sondă îmbătrânită comută lent și cu amplitudine mică (Fig. 2.4). ECU corectează amestecul prin corecția pe termen scurt (STFT) și o memorează ca adaptare pe termen lung (LTFT):</p>
<div class="ec"><span>f<sub>λ</sub> = N<sub>c</sub>/(2·Δt) [Hz]</span><span class="nr">(2.6)</span></div>
<div class="ec"><span>k<sub>tot</sub> = (1 + STFT/100)·(1 + LTFT/100)</span><span class="nr">(2.7)</span></div>
<figure><img src="img/fig2_4.jpg" alt="Fig. 2.4 Semnalul sondei λ" loading="lazy"><figcaption>Fig. 2.4. Semnalul sondei λ amonte – sondă funcțională și sondă îmbătrânită</figcaption></figure>
<p>Injectorul este o bobină alimentată permanent cu +12 V, a cărei masă este comutată de ECU. Injectoarele de injecție indirectă au rezistență mare (≈ 12…17 Ω). Pe oscilogramă se văd nivelul de alimentare, coborârea la ≈ 0 V pe durata comenzii și vârful inductiv la închidere. Clapeta electronică se verifică prin compararea poziției cerute cu cea reală și prin testul activ.</p>
<figure><img src="img/fig2_5.jpg" alt="Fig. 2.5 Semnalul CKP pe osciloscop" loading="lazy"><figcaption>Fig. 2.5. Semnalul senzorului inductiv de turație la ralanti (800 rot/min) afișat pe osciloscop (2 ms/div, 1 V/div)</figcaption></figure>
<p class="nota">ECU se verifică numai după ce senzorii, actuatorii, alimentarea și masele sunt în regulă.</p>
<h2>2.4. Modul de lucru (în simulator)</h2>
<ol><li>Conectați testerul (X431) și urmăriți datele live: turația, temperaturile, presiunea din colector, clapeta, sondele λ, timpul de injecție, STFT și LTFT. Citiți codurile de defect.</li>
<li>Senzorul de turație: cu contactul decuplat și conectorul desfăcut, măsurați rezistența bobinei; recuplați, porniți motorul și vizualizați semnalul la ralanti; opriți imaginea, plasați cursoarele peste un număr cunoscut de perioade și calculați frecvența și turația.</li>
<li>Senzorii de temperatură: rezistența (conector desfăcut) și tensiunea de semnal (back-probe) la motor rece și cald; comparați cu testerul.</li>
<li>Senzorul MAP: tensiunea la contact pus și la ralanti; cu motorul oprit, contact pus și pompa de vid, trasați U = f(p) în 5 puncte.</li>
<li>Sonda λ amonte: la ≈ 2000 rot/min, cu motorul cald, înregistrați 10 s (1 s/div), opriți imaginea și numărați comutările; citiți STFT și LTFT. Desprindeți furtunul de vacuum (aer fals) și repetați.</li>
<li>Injectoarele: rezistența bobinei; oscilograma tensiunii; testul activ de decuplare pe cilindri și scăderea turației.</li>
<li>Identificați defectul introdus pornind de la cod și de la datele live, apoi confirmați-l prin măsurare (Tabelul 2.5).</li></ol>
<h2>2.7. Interpretarea rezultatelor</h2>
<ul><li>Dacă valoarea de la tester și cea măsurată la senzor coincid, dar sunt greșite, defectul este la senzor sau la mărimea fizică; dacă diferă, defectul este în cablaj, conector sau ECU.</li>
<li>O valoare fixă „de manual” (−40 °C, 80 °C, 0 V constant) indică o valoare de substituție: ECU a detectat un defect de circuit.</li>
<li>STFT oscilează normal în jurul lui 0 %; LTFT peste ±10 % arată un dezechilibru persistent: aer fals, injectoare, presiunea combustibilului sau senzorul de sarcină.</li>
<li>O sondă λ cu f<sub>λ</sub> sub ≈ 0,5 Hz la 2000 rot/min sau cu amplitudine sub 0,6 V este îmbătrânită.</li>
<li>La injectoare, un vârf inductiv lipsă sau mult mai mic la un cilindru arată o bobină sau un circuit de comandă defect.</li></ul>
<h2>2.8. Relevanță practică</h2>
<p>Compararea datelor live cu măsurarea directă la senzor este metoda de bază a diagnozei electronice; ea evită înlocuirea inutilă a componentelor, frecventă în service. Aceleași principii se folosesc la validarea senzorilor în producție și la dezvoltarea funcțiilor de autodiagnoză OBD.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>La ralanti frecvența semnalului senzorului inductiv este 820 Hz, sonda λ face 18 comutări (9 perioade) în 10 s, iar testerul afișează STFT = +4 % și LTFT = +9 %.</p>
<div class="ec"><span>n = 60·820/60 = 820 rot/min; &nbsp; f<sub>λ</sub> = 18/(2·10) = 0,9 Hz; &nbsp; k<sub>tot</sub> = 1,04·1,09 = 1,13</span><span class="nr">(2.8–2.10)</span></div>
<p>ECU adaugă cu 13 % mai mult combustibil decât valoarea de bază: sonda funcționează corect, dar există un dezechilibru persistent (aer fals, presiune mică a combustibilului, injectoare parțial înfundate), care se investighează în lucrarea 4.</p>
<div class="ec"><span>NTC la 20 °C: R = 2500·e<sup>3450·(1/293,15 − 1/298,15)</sup> ≈ 3,05 kΩ; &nbsp; U<sub>s</sub> = 5·3,05/(3,05 + 2,2) ≈ 2,9 V</span><span class="nr">(2.11–2.12)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Calculați turația pentru o frecvență de 2 kHz a senzorului arborelui cotit (roată 60 − 2).</p><details class="sol"><summary>Rezolvare</summary><p>n = 60·2000/60 = 2000 rot/min.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Tensiunea măsurată la senzorul de temperatură este 0,85 V (R<sub>25</sub> = 2,5 kΩ, B = 3450 K, R<sub>p</sub> = 2,2 kΩ). Ce temperatură corespunde? Ce indică testerul dacă afișează −40 °C la aceeași tensiune?</p><details class="sol"><summary>Rezolvare</summary><p>R = 2200·0,85/(5 − 0,85) = 451 Ω; 1/T = ln(451/2500)/3450 + 1/298,15 → T ≈ 361 K ≈ 88 °C. Dacă testerul afișează −40 °C, ECU nu „vede” tensiunea de la senzor: întrerupere în cablaj sau conector (valoare de substituție).</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Pe caracteristica MAP s-au obținut punctele (1,20 V; 34 kPa) și (4,10 V; 98 kPa). Determinați a și b și presiunea la 2,00 V.</p><details class="sol"><summary>Rezolvare</summary><p>a = (98 − 34)/(4,10 − 1,20) = 22,07 kPa/V; b = 34 − 22,07·1,20 = 7,5 kPa; p(2,00 V) = 51,6 kPa.</p></details></div>`;
}
const INTREBARI = [
  ["De ce amplitudinea semnalului unui senzor inductiv crește cu turația, iar a unui senzor Hall nu?", "Tensiunea indusă este proporțională cu viteza de variație a fluxului magnetic (legea inducției), deci cu turația; senzorul Hall are un circuit electronic alimentat care comută între două niveluri fixe."],
  ["Ce afișează testerul dacă circuitul senzorului de temperatură este întrerupt? Dar dacă este în scurtcircuit la masă?", "Întrerupere: U ≈ 5 V → −40 °C (valoare de substituție), cod P0118; scurtcircuit la masă: U ≈ 0 V → temperatură foarte mare (≈ 140 °C), cod P0117."],
  ["Calculați turația pentru o frecvență de 2 kHz a senzorului arborelui cotit (roată 60 − 2).", "n = 60·2000/60 = 2000 rot/min."],
  ["Cum deosebiți o sondă λ îmbătrânită de una funcțională pe oscilogramă?", "Sonda bună comută rapid între ≈ 0,1 și 0,85 V, de peste 0,5 ori pe secundă la 2000 rot/min; cea îmbătrânită comută lent, cu fronturi lente și amplitudine mică (de ex. 0,3…0,6 V)."],
  ["Ce semnifică STFT = +3 % și LTFT = +15 %?", "ECU a învățat o îmbogățire permanentă de 15 %: amestecul de bază este sărac (aer fals, presiune mică a combustibilului, injectoare înfundate, MAP/MAF eronat); corecția scurtă oscilează normal."],
  ["De ce un debitmetru de aer murdar poate să nu genereze cod de defect?", "Semnalul rămâne în domeniul plauzibil (nu e întrerupere sau scurtcircuit), doar subestimează debitul; ECU compensează prin LTFT până la limită."],
  ["Ce informații oferă vârful inductiv de la închiderea injectorului?", "Confirmă că bobina și circuitul de comandă sunt în regulă (curentul a circulat); vârf lipsă = bobină întreruptă sau comandă absentă; vârf mic = spire în scurtcircuit sau rezistență mare în circuit."]
];
const TEST = [
  { q: "Senzorul inductiv al arborelui cotit dă un semnal:", o: ["continuu 0…5 V", "alternativ, cu amplitudinea crescătoare cu turația", "dreptunghiular cu amplitudine constantă", "PWM"], c: 1, e: "Tensiune indusă ~ viteza de variație a fluxului." },
  { q: "Cu circuitul NTC întrerupt, tensiunea citită de ECU este aproximativ:", o: ["0 V", "2,5 V", "5 V", "12 V"], c: 2, e: "Rezistența de polarizare trage semnalul la tensiunea de referință." },
  { q: "Rezistența unui injector de injecție indirectă este tipic:", o: ["0,5…2 Ω", "12…17 Ω", "1…5 kΩ", "infinită"], c: 1, e: "Injectoare „high impedance”." },
  { q: "Sonda λ cu salt indică amestec bogat prin:", o: ["≈ 0,1 V", "≈ 0,45 V", "≈ 0,8…0,9 V", "5 V"], c: 2, e: "Diferență mare de concentrație de O₂ → tensiune mare." },
  { q: "LTFT = +18 % indică:", o: ["amestec de bază prea bogat", "amestec de bază prea sărac, compensat de ECU", "sondă λ defectă sigur", "nimic anormal"], c: 1, e: "ECU adaugă combustibil – tipic aer fals." },
  { q: "Rezistența unui senzor Hall se verifică:", o: ["cu ohmmetrul", "nu se verifică cu ohmmetrul; se măsoară alimentarea, masa și semnalul", "cu lampa cu bec", "cu megohmmetrul"], c: 1, e: "NSSM / metodologie: senzorul Hall are electronică internă." }
];

/* ------------------------------------------------------------------ definiția lucrării */
const SIMPTOME = ["motorul pornește greu / se oprește", "ralanti instabil / rateuri", "consum mare / fum", "lampa de avarie aprinsă, fără simptome", "ventilatorul merge continuu"];
Cadru.porneste({
  disc: "DA", nr: 2, cod: "da-l2",
  titlu: "Senzori și actuatori – date live și semnale reale",
  scurt: "Senzori și actuatori",
  subtitlu: "Laborator virtual – standul K7J 1.4 MPI, tester, osciloscop, multimetru",
  parametri: MD.parametri,
  parametriDemo() { return Object.assign(MD.parametri(20261001), { defect: "none" }); },
  date: [{ k: "R25", et: "R₂₅ NTC catalog [Ω]", v: 2500, fix: true }, { k: "B", et: "B NTC [K]", v: 3450, fix: true }, { k: "Rp", et: "R<sub>p</sub> ECU [Ω]", v: 2200, fix: true }, { k: "z", et: "z roată", v: 60, fix: true }],
  tabele: [
    { id: "t21", titlu: "Tabelul 2.1. Senzori", antetRand: "Senzor", nota: "Tipul semnalului și concluzia le alegeți voi; R și U/f se trec din multimetru / osciloscop, valoarea X431 din tester.",
      randuri: [{ k: "ckp", et: "Turație arbore cotit (f [Hz])" }, { k: "ect", et: "Temp. lichid răcire (U [V])" }, { k: "iat", et: "Temp. aer admis (U [V])" }, { k: "map", et: "MAP (U [V])" }, { k: "tps", et: "Poziție clapetă (U [V])" }, { k: "l1", et: "Sondă λ amonte (U [V])" }, { k: "l2", et: "Sondă λ aval (U [V])" }],
      coloane: [{ k: "tip", t: "Tip semnal", intrare: true, tip: "select", optiuni: TIPURI, manualEval: true }, { k: "R", t: "R [Ω]", intrare: true }, { k: "mas", t: "Valoare măsurată", intrare: true }, { k: "x431", t: "Valoare X431", intrare: true }, { k: "calc", t: "Calcul" }, { k: "ref", t: "Referință" }, { k: "conc", t: "Concluzie", intrare: true, tip: "select", optiuni: ["în regulă", "defect senzor", "defect circuit / conector"], manualEval: true }] },
    { id: "t22", titlu: "Tabelul 2.2. Caracteristica senzorului MAP (pompa de vid, motor oprit, contact pus)", antetRand: "Punct",
      randuri: ["1", "2", "3", "4", "5"].map(k => ({ k, et: k })), coloane: [{ k: "p", t: "p [kPa]", intrare: true }, { k: "U", t: "U [V]", intrare: true }] },
    { id: "t23", titlu: "Tabelul 2.3. Sonda λ și corecțiile de amestec (≈ 2000 rot/min)", antetRand: "Situație", nota: "N<sub>c</sub>, U<sub>min</sub> și U<sub>max</sub> le citiți voi de pe osciloscop (1 s/div, imagine oprită) și le scrieți de la tastatură.",
      randuri: [{ k: "n", et: "Normal" }, { k: "a", et: "Aer fals provocat" }],
      coloane: [{ k: "Nc", t: "N<sub>c</sub> în 10 s", intrare: true, manualEval: true }, { k: "Umin", t: "U<sub>min</sub> [V]", intrare: true, manualEval: true }, { k: "Umax", t: "U<sub>max</sub> [V]", intrare: true, manualEval: true }, { k: "f", t: "f<sub>λ</sub> [Hz]" }, { k: "STFT", t: "STFT [%]", intrare: true }, { k: "LTFT", t: "LTFT [%]", intrare: true }, { k: "k", t: "k<sub>tot</sub>" }] },
    { id: "t24", titlu: "Tabelul 2.4. Actuatori", antetRand: "Actuator",
      randuri: ACT.map(k => ({ k, et: { inj1: "Injector cil. 1", inj2: "Injector cil. 2", inj3: "Injector cil. 3", inj4: "Injector cil. 4", clap: "Clapetă electronică", can: "Supapă canistră" }[k] })),
      coloane: [{ k: "R", t: "Rezistență [Ω]", intrare: true }, { k: "unda", t: "Formă de undă (observații)", intrare: true, tip: "select", optiuni: ["comandă + vârf inductiv normal", "fără vârf inductiv", "fără comandă", "nu s-a verificat"], manualEval: true }, { k: "test", t: "Test activ X431", intrare: true, tip: "select", optiuni: ["reacție normală", "fără reacție"], manualEval: true }, { k: "conc", t: "Concluzie", intrare: true, tip: "select", optiuni: ["în regulă", "defect"], manualEval: true }] },
    { id: "t25", titlu: "Tabelul 2.5. Defectul introdus", antetRand: "",
      randuri: [{ k: "d", et: "Defectul" }],
      coloane: [{ k: "simptom", t: "Simptom", intrare: true, tip: "select", optiuni: SIMPTOME, manualEval: true }, { k: "cod", t: "Cod(uri)", intrare: true, manualEval: true }, { k: "date", t: "Date live relevante", intrare: true, manualEval: true }, { k: "conf", t: "Măsurarea de confirmare", intrare: true, manualEval: true }, { k: "cauza", t: "Cauza", intrare: true, tip: "select", optiuni: MD.CHEI_DEF.map(k => DEFECTE[k].nume), manualEval: true }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaDA2,
  intrebari(D) {
    return [
      { id: "q1", u: "°C", text: "Temperatura lichidului de răcire corespunzătoare tensiunii U măsurate de voi la senzor (Tabelul 2.1), cu R<sub>25</sub> = 2,5 kΩ, B = 3450 K, R<sub>p</sub> = 2,2 kΩ:", textSimplu: "Temperatura din tensiunea CTS măsurată" },
      { id: "q2", u: "kPa/V", text: "Panta a a caracteristicii MAP p = a·U + b (regresie pe punctele voastre din Tabelul 2.2):", textSimplu: "Panta a a caracteristicii MAP" },
      { id: "q3", u: "Hz", text: "Frecvența de comutare a sondei λ în funcționare normală, din numărul de comutări numărat de voi:", textSimplu: "Frecvența de comutare a sondei λ (normal)" },
      { id: "q4", u: "", text: "Factorul total de corecție k<sub>tot</sub> în situația cu aer fals provocat (Tabelul 2.3):", textSimplu: "k_tot cu aer fals" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const s = SENZ.filter(c => t.t21[c].tip !== "" && t.t21[c].conc !== "").length; if (s < 7) l.push(`Tabelul 2.1: tipul semnalului și concluzia (${s}/7)`);
    if (t.t21.ckp.mas === "") l.push("Tabelul 2.1: frecvența CKP măsurată cu osciloscopul");
    if (t.t21.ect.mas === "") l.push("Tabelul 2.1: tensiunea senzorului de temperatură a lichidului");
    const p = ["1", "2", "3", "4", "5"].filter(k => t.t22[k].p !== "").length; if (p < 4) l.push(`Tabelul 2.2: ${p}/4 puncte (minim)`);
    ["n", "a"].forEach(k => { if (t.t23[k].Nc === "" || t.t23[k].STFT === "") l.push(`Tabelul 2.3: rândul „${k === "n" ? "Normal" : "Aer fals"}”`); });
    const a = ACT.filter(c => t.t24[c].R !== "").length; if (a < 4) l.push(`Tabelul 2.4: rezistențele actuatorilor (${a}/6)`);
    if (t.t25.d.cauza === "") l.push("Tabelul 2.5: cauza defectului");
    return l;
  },
  exemplu(D) {
    const t = D.t;
    Object.assign(t.t21.ckp, { tip: TIPURI[1], R: "820", mas: "820", x431: "820", conc: "în regulă" });
    Object.assign(t.t21.ect, { tip: TIPURI[0], R: "3050", mas: "2.9", x431: "20", conc: "în regulă" });
    [["1", 100.5, 4.06], ["2", 80, 3.15], ["3", 60, 2.24], ["4", 40, 1.34], ["5", 25, 0.66]].forEach(([k, p, u]) => Object.assign(t.t22[k], { p: String(p), U: String(u) }));
    Object.assign(t.t23.n, { Nc: "18", Umin: "0.08", Umax: "0.86", STFT: "4", LTFT: "9" });
    Object.assign(t.t23.a, { Nc: "16", Umin: "0.07", Umax: "0.84", STFT: "6", LTFT: "17" });
  },
  vehicul3d: null,
  referat: {
    scop: "Identificarea tipului de semnal al senzorilor, compararea datelor live cu măsurarea directă, verificarea actuatorilor și diagnosticarea unui defect introdus pe standul K7J.",
    relatii: "n = 60·f/z; &nbsp; R(T) = R₂₅·e<sup>B(1/T − 1/T₂₅)</sup>; &nbsp; U<sub>s</sub> = U<sub>ref</sub>·R/(R + R<sub>p</sub>); &nbsp; p = a·U + b; &nbsp; f<sub>λ</sub> = N<sub>c</sub>/(2Δt); &nbsp; k<sub>tot</sub> = (1 + STFT/100)(1 + LTFT/100).",
    varianta: () => "Stand K7J cu senzori proprii și un defect ascuns, diferit de la student la student.",
    indicatii: "Comparați datele live cu măsurările directe, explicați diferențele, interpretați corecțiile de amestec și descrieți cum ați găsit defectul (cod → date live → măsurare de confirmare)…"
  },
  subsol: "Modelul: termistoare NTC cu R₂₅ și B proprii, MAP liniar, roată 60−2 cu senzor inductiv, sondă λ ZrO₂ în buclă închisă cu corecții STFT/LTFT, injectoare de înaltă impedanță. Fiecare student are senzori proprii și un defect ascuns.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `<div class="sim-grila">
    <div class="card sim-scena scena">
      <svg id="svg-motor" viewBox="0 0 900 420" role="img" aria-label="Compartimentul motor al standului K7J cu senzorii și actuatorii selectabili"></svg>
      <div class="afisaje">
        <div class="afisaj"><span>Turație</span><b id="af-n">0</b><small>rot/min</small></div>
        <div class="afisaj"><span>Temp. lichid (termometru)</span><b id="af-T">—</b><small>°C</small></div>
        <div class="afisaj"><span>Multimetru</span><b id="af-mm">—</b><small id="af-mm-mod">V DC</small></div>
        <div class="afisaj"><span>Componenta selectată</span><b id="af-sel" style="font-size:1rem">CKP</b><small id="af-con">conector cuplat</small></div>
      </div>
      <div class="osc-cutie">
        <div class="osc-bara">
          <b>Osciloscop</b>
          <label>Timp/div <select id="osc-t">${TDIV.map(v => `<option value="${v}">${fmtT(v)}</option>`).join("")}</select></label>
          <label>V/div <select id="osc-v">${VDIV.map(v => `<option value="${v}">${String(v).replace(".", ",")} V</option>`).join("")}</select></label>
          <label>0 V <select id="osc-z"><option value="centru">centru</option><option value="jos">jos</option></select></label>
          <button type="button" id="osc-run">STOP</button>
        </div>
        <canvas id="cv-osc" data-h="300" height="300" aria-label="Ecranul osciloscopului; trageți cursoarele A și B"></canvas>
        <p class="nota" id="osc-cit"></p>
      </div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-exhaust"> Exhaustarea conectată la țeava de evacuare</label>
      <label class="bifa"><input type="checkbox" id="ck-backprobe"> Adaptoare back-probe; fără ohmmetru pe senzori Hall / ECU</label>
      <h2>Motorul</h2>
      <div class="rand-butoane"><button type="button" id="btn-contact">Contact</button><button type="button" class="primar" id="btn-porn">Pornește motorul</button><button type="button" id="btn-stop">Oprește</button></div>
      <div class="rand-butoane"><button type="button" data-mod="ralanti">Ralanti</button><button type="button" data-mod="2000">2000 rot/min</button><button type="button" data-mod="accel">Accelerare scurtă</button></div>
      <button type="button" id="btn-furtun" class="lat">Desprinde furtunul de vacuum (aer fals)</button>
      <h2>Componenta</h2>
      <select id="sel-comp">${Object.entries(COMP).map(([k, c]) => `<option value="${k}">${c.nume}</option>`).join("")}</select>
      <p class="nota" id="nume-comp"></p>
      <button type="button" id="btn-dec" class="lat">Decuplează conectorul</button>
      <h2>Instrumentul</h2>
      <div class="comutator-aparat" role="group"><button type="button" data-aparat="x431">Tester X431</button><button type="button" data-aparat="osc">Osciloscop</button><button type="button" data-aparat="mm">Multimetru</button></div>
      <div class="panou-aparat" data-p="x431">
        <div id="x431-live"></div>
        <div class="rand-butoane"><button type="button" id="btn-cod">Citește codurile</button><button type="button" id="btn-sterge">Șterge codurile</button></div>
        <p class="nota" id="x431-cod"></p>
        <details class="setari"><summary>Teste active</summary>
          <div class="rand-butoane">${[1, 2, 3, 4].map(i => `<button type="button" data-inj="${i}">Decuplează inj. ${i}</button>`).join("")}</div>
          <div class="rand-butoane"><button type="button" id="btn-vent">Electroventilator</button><button type="button" id="btn-can">Supapa canistrei</button></div>
          <p class="nota" id="test-act"></p></details>
        <div class="rand-butoane"><button type="button" class="primar" id="btn-x431">● Trece valoarea X431 în Tabelul 2.1</button><button type="button" id="btn-trim">● Trece STFT/LTFT în Tabelul 2.3</button></div>
      </div>
      <div class="panou-aparat" data-p="osc" hidden>
        <p class="nota">Reglați timpul/div și V/div, apăsați STOP și trageți cursoarele A și B pe ecran (aceeași fază a semnalului).</p>
        <label class="camp">Număr de perioade între cursoare <input type="number" id="in-per" value="1" min="1" max="50" step="1"></label>
        <button type="button" class="primar lat" id="btn-osc">● Trece frecvența CKP în Tabelul 2.1</button>
      </div>
      <div class="panou-aparat" data-p="mm" hidden>
        <div class="rand-butoane"><button type="button" data-mm="V">V DC</button><button type="button" data-mm="Ω">Ω</button></div>
        <button type="button" class="primar lat" id="btn-mm">● Trece citirea în tabel</button>
        <button type="button" id="btn-pompa" class="lat">Conectează pompa de vid la MAP</button>
        <div id="panou-vid" hidden><label class="camp">Vacuum (pompa manuală) <span class="inline"><button type="button" id="btn-vid">Pompează</button><button type="button" id="btn-vid0">Supapă (aerisire)</button></span></label>
        <button type="button" class="lat" id="btn-map">● Trece punctul în Tabelul 2.2</button></div>
      </div>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari" data-doar-demo><summary>Defectul introdus (mod demonstrativ)</summary>
        <select id="sel-defect"><option value="none">fără defect</option>${MD.CHEI_DEF.map(k => `<option value="${k}">${DEFECTE[k].nume}</option>`).join("")}</select>
        <label class="bifa"><input type="checkbox" id="ck-rapid"> Încălzire accelerată ×4</label></details>
      <details class="setari"><summary>Afișare</summary><label class="bifa"><input type="checkbox" id="ck-et" checked> Etichete pe schemă</label></details>
    </aside>
  </div>`,
    init(C) {
      sim.ect = sim.iat = P().Ta; sim.p = P().patm;
      construiesteSVG(); legaOsc();
      $("#osc-t").value = String(sim.osc.tdiv); $("#osc-v").value = String(sim.osc.vdiv);
      $("#osc-t").addEventListener("change", e => { sim.osc.tdiv = +e.target.value; });
      $("#osc-v").addEventListener("change", e => { sim.osc.vdiv = +e.target.value; deseneazaOsc(); });
      $("#osc-z").addEventListener("change", e => { sim.osc.zero = e.target.value; deseneazaOsc(); });
      $("#osc-run").addEventListener("click", () => { sim.osc.ruleaza = !sim.osc.ruleaza; $("#osc-run").textContent = sim.osc.ruleaza ? "STOP" : "RUN"; if (!sim.osc.ruleaza) sim.rpmCapt = sim.rpm; deseneazaOsc(); });
      $("#btn-contact").addEventListener("click", () => contact(!sim.contact));
      $("#btn-porn").addEventListener("click", pornire);
      $("#btn-stop").addEventListener("click", () => { sim.merge = false; });
      $$("[data-mod]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți întâi motorul.", "atentie"); sim.mod = b.dataset.mod; if (sim.mod === "accel") sim.accT = 0; }));
      $("#btn-furtun").addEventListener("click", () => { if (!sim.merge || sim.mod !== "ralanti" && !sim.furtun) return Cadru.mesajTemporar("Furtunul se desprinde numai cu motorul la ralanti (NSSM).", "atentie"); sim.furtun = !sim.furtun; $("#btn-furtun").textContent = sim.furtun ? "Montează la loc furtunul de vacuum" : "Desprinde furtunul de vacuum (aer fals)"; });
      $("#sel-comp").addEventListener("change", e => selecteaza(e.target.value));
      $("#btn-dec").addEventListener("click", () => { if (sim.contact) return Cadru.mesajTemporar("Conectorii se desfac numai cu contactul decuplat (NSSM).", "pericol"); sim.decuplat[sim.sel] = !sim.decuplat[sim.sel]; actualizeazaPanou(); });
      $$("[data-aparat]").forEach(b => b.addEventListener("click", () => { sim.aparat = b.dataset.aparat; actualizeazaPanou(); deseneazaOsc(); }));
      $$("[data-mm]").forEach(b => b.addEventListener("click", () => { sim.mm = b.dataset.mm; $$("[data-mm]").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); }));
      $("#btn-cod").addEventListener("click", () => { if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie"); $("#x431-cod").innerHTML = sim.coduri.length ? "Coduri memorate: <b>" + sim.coduri.join(", ") + "</b>" : "Niciun cod memorat."; });
      $("#btn-sterge").addEventListener("click", () => { sim.coduri = []; $("#x431-cod").textContent = "Codurile au fost șterse."; });
      $$("[data-inj]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return; sim.testInj = +b.dataset.inj; sim.testT = 4; $("#test-act").textContent = `Injectorul ${b.dataset.inj} decuplat 4 s – urmăriți turația.`; }));
      $("#btn-vent").addEventListener("click", () => { if (!sim.contact) return; sim.ventilator = !sim.ventilator; $("#test-act").textContent = sim.ventilator ? "Electroventilatorul comandat: pornește." : "Electroventilator oprit."; });
      $("#btn-can").addEventListener("click", () => { if (!sim.contact) return; $("#test-act").textContent = "Supapa canistrei comandată: se aude un „țăcănit” la 16 Hz."; });
      $("#btn-x431").addEventListener("click", inregistreazaX431);
      $("#btn-trim").addEventListener("click", inregistreazaTrim);
      $("#btn-osc").addEventListener("click", inregistreazaOsc);
      $("#btn-mm").addEventListener("click", inregistreazaMultimetru);
      $("#btn-pompa").addEventListener("click", () => { if (sim.merge) return Cadru.mesajTemporar("Pompa de vid se conectează cu motorul oprit și contactul pus.", "atentie"); sim.pompaVid = !sim.pompaVid; sim.vac = 0; if (sim.pompaVid) { selecteaza("map"); sim.aparat = "mm"; sim.mm = "V"; } $("#panou-vid").hidden = !sim.pompaVid; actualizeazaPanou(); });
      $("#btn-vid").addEventListener("click", () => { sim.vac = Math.min(P().patm - 18, sim.vac + (P().patm - 18 - sim.vac) * 0.22); });
      $("#btn-vid0").addEventListener("click", () => { sim.vac = 0; });
      $("#btn-map").addEventListener("click", inregistreazaMAP);
      $("#sel-defect").addEventListener("change", e => { sim.defectDemo = e.target.value; sim.coduri = []; });
      $("#ck-rapid").addEventListener("change", e => { sim.rapid = e.target.checked ? 4 : 1; });
      selecteaza("ckp");
      C.mesaj("Conectați testerul, puneți contactul și citiți codurile; apoi porniți motorul (exhaustarea conectată).", "");
    },
    aplicaEval(P2, C) { sim.defectDemo = "none"; sim.rapid = 1; const s = $("#sel-defect"); if (s) s.disabled = true; const r = $("#ck-rapid"); if (r) { r.checked = false; r.disabled = true; } sim.ect = sim.iat = P2.Ta; sim.p = P2.patm; },
    reset() { Object.assign(sim, { contact: false, merge: false, rpm: 0, furtun: false, coduri: [], ltft: 0, decuplat: {}, pompaVid: false }); },
    cadru(dt0, C, vizibil) {
      const acum = performance.now(), dt = Math.min(1, Math.max(0, (acum - (sim._t || acum)) / 1000)); sim._t = acum;
      const h = dt * (sim.rapid || 1), pr0 = P(), d = defect();
      // turația
      let tinta = 0;
      if (sim.merge) {
        sim.tPorn += h;
        const ral = 800 + Math.max(0, (60 - sim.ect) * 6);
        tinta = sim.mod === "2000" ? 2000 : ral;
        if (sim.mod === "accel") { sim.accT = (sim.accT || 0) + dt; tinta = sim.accT < 0.8 ? 3600 : ral; if (sim.accT > 2.5) sim.mod = "ralanti"; }
        if (sim.testInj) { sim.testT -= dt; tinta -= sim.testInj === 3 && d === "inj3_open" ? 0 : (sim.mod === "2000" ? 160 : 95); if (sim.testT <= 0) sim.testInj = 0; }
        if (d === "inj3_open") tinta += Math.sin(acum / 140) * 35 - 40;
        if (d === "ckp_gap" && sim.tPorn < 3) tinta = Math.min(tinta, 300);
      }
      sim.rpm += (tinta - sim.rpm) * (1 - Math.exp(-dt / (sim.merge ? 0.35 : 0.6)));
      if (!sim.merge && sim.rpm < 30) sim.rpm = 0;
      sim.acc = ((sim.acc || 0) + sim.rpm * dt) % 60;
      // temperaturi
      sim.ect += ((sim.merge ? 92 : pr0.Ta) - sim.ect) * (1 - Math.exp(-h / (sim.merge ? 150 : 900)));
      sim.iat += ((sim.merge ? pr0.Ta + 6 : pr0.Ta) - sim.iat) * (1 - Math.exp(-h / 60));
      if (sim.ect > 98 || sim.ventilator) sim.ventilator = sim.ventilator;
      // presiunea din colector și clapeta
      let pT = pr0.patm;
      if (sim.pompaVid) pT = pr0.patm - sim.vac;
      else if (sim.merge) { pT = sim.mod === "2000" ? 29 : 34; if (sim.mod === "accel" && sim.accT < 0.8) pT = 92; if (sim.furtun || d === "aer_fals") pT += 4; }
      sim.p += (pT - sim.p) * (1 - Math.exp(-dt / 0.15));
      sim.tps = sim.merge ? (sim.mod === "2000" ? 6.5 : sim.mod === "accel" && sim.accT < 0.8 ? 62 : 0.8) : 0;
      // bucla λ și corecțiile
      sim.t += dt;
      const err = pr0.ltft0 + (sim.furtun ? 13 : 0) + (d === "aer_fals" ? 17 : 0);
      if (buclaInchisa()) {
        const f = MD.frecventaLambda(pr(), sim.furtun || d === "aer_fals") * (sim.mod === "ralanti" ? 0.65 : 1);
        sim.phi = (sim.phi + 2 * Math.PI * f * dt) % (2 * Math.PI);
        sim.ltft += (clamp(err, -25, 25) - sim.ltft) * (1 - Math.exp(-h / 25));
        sim.stft = (err - sim.ltft) * 0.9 + 3.2 * Math.sin(2 * Math.PI * f * sim.t);
        if (sim.ltft > 15 && sim.merge) adaugaCod("P0171");
      } else sim.stft = 0;
      // codurile de defect
      if (sim.contact) {
        if (d === "ect_open") adaugaCod("P0118"); if (d === "iat_short") adaugaCod("P0112");
        if (sim.merge && d === "inj3_open") { adaugaCod("P0203"); if (sim.tPorn > 10) adaugaCod("P0303"); }
        if (buclaInchisa() && d === "lambda_aged" && sim.tPorn > 60) adaugaCod("P0133");
        if (sim.merge && d === "ckp_gap" && sim.tPorn > 2) adaugaCod("P0335");
      }
      if (sim.osc.ruleaza && (vizibil || sim.aparat === "osc")) achizitie();
      if (!vizibil) return;
      actualizeazaSVG(dt);
      if (acum - (this._ta || 0) > 150) {
        this._ta = acum;
        deseneazaOsc(); liveX431();
        const r = citireMultimetru();
        $("#af-n").textContent = fmt(sim.rpm, 0); $("#af-T").textContent = fmt(sim.ect, 1);
        $("#af-mm").textContent = sim.aparat === "mm" ? r.txt : "—"; $("#af-mm-mod").textContent = sim.mm === "Ω" ? "Ω" : "V DC";
        $("#af-sel").textContent = sim.sel.toUpperCase(); $("#af-con").textContent = sim.decuplat[sim.sel] ? "conector DECUPLAT" : "conector cuplat";
        C.stare(1, sim.merge ? `motor pornit – ${sim.mod === "2000" ? "2000 rot/min" : sim.mod === "accel" ? "accelerare" : "ralanti"}${buclaInchisa() ? " · buclă închisă" : ""}` : sim.contact ? "contact pus, motor oprit" : "contact decuplat", sim.merge ? "inc" : "");
        C.stare(2, sim.furtun ? "aer fals provocat (furtun desprins)" : `T lichid ${fmt(sim.ect, 0)} °C`);
        if (sim.aparat === "mm" && r.msg) C.mesajAuto(r.msg, "atentie"); else if (sim.merge && !$("#ck-exhaust").checked) C.mesajAuto("Exhaustarea nu este conectată!", "pericol"); else C.mesajAuto("");
      }
    },
    redeseneaza() { deseneazaOsc(); },
    formule() {
      const o = sim.osc, dt = Math.abs(o.c2 - o.c1) * o.tdiv, n = Math.max(1, num($("#in-per") && $("#in-per").value) || 1);
      const U = semnal("ect", sim.t), R = MD.RP * U / (5 - U);
      return [
        ["Frecvența din cursoare (2.1–2.2)", dt > 0 ? `f = ${n}/${fmtT(dt)} = <span class="rez">${fmt(n / dt, 1)} Hz</span> → n = 60·f/60 = ${fmt(n / dt, 0)} rot/min` : "—"],
        ["NTC: rezistența din tensiune (2.4)", sim.contact ? `R = R<sub>p</sub>·U/(5 − U) = 2200·${fmt(U, 3)}/(5 − ${fmt(U, 3)}) = <span class="rez">${fmt(R, 0)} Ω</span>` : "contact decuplat"],
        ["Corecția totală (2.7)", sim.merge ? `k = (1 + ${fmt(sim.stft, 1)}/100)(1 + ${fmt(sim.ltft, 1)}/100) = <span class="rez">${fmt((1 + sim.stft / 100) * (1 + sim.ltft / 100), 3)}</span>` : "—"],
        ["Timpul de injecție", sim.merge ? `t<sub>i</sub> = <span class="rez">${fmt(timpInj(), 2)} ms</span> la p = ${fmt(sim.p, 0)} kPa` : "—"]
      ];
    }
  }
});
