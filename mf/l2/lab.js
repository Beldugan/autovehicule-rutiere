/* MF – Lucrarea 2. Compresibilitatea lichidului de frână și efectul aerului din circuit (laborator virtual) */
"use strict";

const M2 = MODELE["mf-l2"];
const { P_ATM, FLUIDE, volRot, corectieCil, KmDinK, KDinKm, volAer, volumAbsorbit, presiuneDinVolum, celeritate, comprimareRelativa } = M2;
const TINTE_A = [20, 40, 60, 80, 100];
const TINTE_B = [1, 2, 5, 20, 60, 100];
const AER_NEAERISIT = 0.25, AER_ASCUNS = 0.06, CF_FURTUN = 0.004, DEBIT_SCURGERE = 0.002;
const BULA = { dMin: 5, dMax: 11, pasD: 0.5, nMin: 1, nMax: 4, VmaxCm3: 1.0 };

/* ------------------------------------------------------------------ starea simulatorului */
const sim = {
  fluid: "DOT4", Kproba: 1.5 + Math.random() * 0.5,
  V0: 50, T: 20, d: 10, s: 1, D: 20, e: 5, E: 210,
  mano: "analog", erori: true, defect: "none", rapid: false,
  aerisit: false, Vinj: 0, n: 0, Vleak: 0, dBula: 10, nBule: 1,
  tintaN: null, tine: 0, dir: 0, ultimP: 0, pVarf: 0
};
function Kreal() { if (MOD.eval) return Cadru.P.Klot; return sim.fluid === "PROBA" ? sim.Kproba : FLUIDE[sim.fluid].K; }
function aerTotal() { let v = sim.Vinj; if (!sim.aerisit) v += AER_NEAERISIT; else if (sim.defect === "aerRamas") v += AER_ASCUNS; return v; }
function cfg() { return { V0: sim.V0, K: Kreal(), D: sim.D, e: sim.e, E: sim.E, Vaer: aerTotal(), Cf: sim.defect === "furtun" ? CF_FURTUN : 0 }; }
function Ar() { return volRot(sim.d, sim.s); }
function presiune() { return presiuneDinVolum(cfg(), sim.n * Ar() - sim.Vleak); }
function citireReala(p) { return sim.erori ? M2.citire(p, Cadru.P) : p; }
function citire(p) {
  const r = citireReala(p);
  if (sim.mano === "digital") return Math.max(0, Math.round((r + (sim.erori ? (Math.random() - 0.5) * 0.08 : 0)) * 10) / 10);
  return Math.max(0, Math.round(r * 2) / 2);
}

/* ------------------------------------------------------------------ comenzi */
function poateIncarca() {
  if (!$("#ck-ochelari").checked || !$("#ck-ecran").checked) { Cadru.mesajTemporar("NSSM: purtați ochelari și mănuși și coborâți ecranul înainte de a pune lichidul sub presiune.", "pericol"); return false; }
  return true;
}
function roteste(dn) {
  if (dn > 0) {
    if (!poateIncarca()) { sim.tine = 0; sim.tintaN = null; return; }
    if (sim.ultimP >= 160) { Cadru.mesajTemporar("Manometrul este la capătul scalei – opriți și descărcați!", "pericol"); sim.tine = 0; sim.tintaN = null; return; }
  }
  sim.n = Math.max(0, sim.n + dn);
  if (Math.abs(dn) > 1e-6) sim.dir = Math.sign(dn);
}
function setareDinFormular() {
  const geoVeche = [sim.fluid, sim.V0, sim.d, sim.D, sim.e].join("|");
  sim.fluid = $("#in-fluid").value;
  ["V0", "T", "d", "s", "D", "e", "E"].forEach(k => { const v = num($("#in-" + k).value); if (Number.isFinite(v) && (v > 0 || k === "T")) sim[k] = v; });
  sim.mano = $("#in-mano").value; sim.erori = $("#ck-erori").checked;
  const defVechi = sim.defect; sim.defect = $("#in-defect").value; sim.rapid = $("#ck-rapid").checked;
  if (defVechi !== sim.defect && sim.defect !== "none") Cadru.mesajTemporar("Situație activată. Descărcați, aerisiți și refaceți determinările.", "");
  if (SV.g && geoVeche !== [sim.fluid, sim.V0, sim.d, sim.D, sim.e].join("|")) construiesteSVG();
  if (!MOD.eval) {
    Object.assign(Cadru.D.date, { V0: sim.V0, d: sim.d, s: sim.s, D: sim.D, e: sim.e, E: sim.E, T: sim.T, rho: FLUIDE[sim.fluid].rho, lichid: FLUIDE[sim.fluid].nume });
    Cadru.construiesteDateLucru(); Cadru.recalculeaza(); Cadru.salveaza();
  }
}
function aeriseste() {
  if (sim.ultimP > 0.5) { Cadru.mesajTemporar("Racordurile se desfac numai după descărcarea presiunii (0 bar)!", "pericol"); return; }
  Object.assign(sim, { aerisit: true, Vinj: 0, n: 0, Vleak: 0, dir: 0, tintaN: null }); SV.picaturi = [];
  animaAerisire();
  Cadru.mesajTemporar("Piezometru aerisit și completat; poziția roții a fost marcată (n = 0). Varianta a.", "");
  $("#msg-inreg").textContent = "";
}
function variantaBula() {
  const B = BULA;
  let d = clamp(Math.round(num($("#in-db").value) / B.pasD) * B.pasD || 10, B.dMin, B.dMax);
  let nb = clamp(Math.round(num($("#in-nb").value)) || 1, B.nMin, B.nMax);
  let V = nb * Math.PI * d ** 3 / 6 / 1000;
  while (V > B.VmaxCm3 + 1e-9 && d > B.dMin) { d -= B.pasD; V = nb * Math.PI * d ** 3 / 6 / 1000; }
  return { d, nb, V };
}
function scrieNotaBula() {
  const v = variantaBula(), B = BULA;
  $("#nota-bula").innerHTML = `V<sub>a0</sub> = n·π·d<sub>b</sub>³/6 = ${v.nb}·π·${fmt(v.d, 1)}³/6 = <b>${fmt(v.V * 1000, 0)} mm³ = ${fmt(v.V, 3)} cm³</b> · limite: d<sub>b</sub> = ${B.dMin}…${B.dMax} mm, ${B.nMin}…${B.nMax} bule, V<sub>a0</sub> ≤ ${fmt(B.VmaxCm3, 1)} cm³ (seringa de 1 cm³)`;
}
function bulaBlocata() { return MOD.eval && TINTE_B.some(p => Cadru.D.t.t23[p].n !== ""); }
function introduBula() {
  if (sim.ultimP > 0.5) { Cadru.mesajTemporar("Aerul se introduce numai la 0 bar (presiune descărcată)!", "pericol"); return; }
  const v = variantaBula();
  if (bulaBlocata() && Math.abs((Cadru.D.varianta.Va0 || 0) - v.V) > 1e-4) { Cadru.mesajTemporar("Ați început deja varianta b cu altă bulă. Goliți tabelele pentru a schimba varianta.", "pericol"); return; }
  $("#in-db").value = v.d; $("#in-nb").value = v.nb;
  Object.assign(sim, { dBula: v.d, nBule: v.nb, Vinj: v.V, n: 0, Vleak: 0, dir: 0, tintaN: null }); SV.picaturi = [];
  animaSeringa();
  Cadru.D.varianta = { dBula: v.d, nBule: v.nb, Va0: +v.V.toFixed(4) }; Cadru.D.date.Va0 = +v.V.toFixed(4);
  Cadru.construiesteDateLucru(); Cadru.recalculeaza(); Cadru.salveaza();
  Cadru.mesajTemporar(`${v.nb === 1 ? "O bulă" : v.nb + " bule"} de Ø${fmt(v.d, 1)} mm (V_a0 = ${fmt(v.V, 3)} cm³); roata re-marcată (n = 0). Varianta b.`, "");
}
function sensCurent() { return sim.ultimP < (sim.pVarf || 0) - 2.5 ? "desc" : "inc"; }
function nPentruP(pt) { return (volumAbsorbit(cfg(), pt) + sim.Vleak) / Ar(); }
function pRealPentruCitire(pt) { if (!sim.erori || pt <= 0) return pt; const P = Cadru.P; return pt >= 5 ? (pt - P.errOff) / (1 + P.errGain) : pt / (1 + P.errGain + P.errOff / 5); }
function mergiLaTinta() {
  if (MOD.eval) return;
  const pt = num($("#sel-tinta").value);
  if (pt > 0 && !poateIncarca()) return;
  if (pt > 100) Cadru.mesajTemporar("Atenție: NSSM limitează presiunea la 100 bar.", "pericol");
  sim.tintaN = pt <= 0 ? 0 : nPentruP(pRealPentruCitire(pt));
}
function inregistreazaCitire(e) {
  if (MOD.eval && (sim.tine || sim.tintaN !== null)) { Cadru.mesajTemporar("Opriți roata și așteptați stabilizarea acului înainte de citire.", "pericol"); return; }
  const p = citire(sim.ultimP), n = Math.round(sim.n * 100) / 100, varB = sim.Vinj > 0, dir = sensCurent();
  const tinte = varB ? TINTE_B : TINTE_A;
  let best = null;
  tinte.forEach(t => { const tol = Math.min(2.5, Math.max(0.3, 0.06 * t)); if (Math.abs(p - t) <= tol && (best === null || Math.abs(p - t) < Math.abs(p - best))) best = t; });
  let msg, celule = [];
  if (best === null) msg = `Citire salvată (p = ${fmt(p, 1)} bar, n = ${fmt(n)} rot), dar nu corespunde unei trepte din tabel (${tinte.join(", ")} bar).`;
  else if (varB) { if (dir === "desc") msg = "Varianta b se citește la încărcare. Citirea a fost salvată doar în jurnal."; else { celule.push({ t: "t23", r: String(best), c: "n", v: n }); msg = `Tabelul 2.3: p = ${best} bar → n = ${fmt(n)} rot.`; } }
  else { celule.push({ t: "t22", r: String(best), c: dir, v: n }); msg = `Tabelul 2.2: p = ${best} bar, ${dir === "inc" ? "încărcare" : "descărcare"} → n = ${fmt(n)} rot.`; }
  const ok = Cadru.inregistreaza(e, { log: { var: varB ? "b" : "a", dir, p, n, aerisit: sim.aerisit, Vinj: +sim.Vinj.toFixed(4) }, celule });
  if (ok) { $("#msg-inreg").textContent = msg; deseneazaLive(); }
}

/* ------------------------------------------------------------------ desenul realist și animațiile */
const SV = { g: null, el: {}, anim: { aerisire: null, seringa: null, ecran: 0, t: 0 }, buleNeaer: [], picaturi: [], ac: { p: 0, v: 0 } };

function construiesteSVG() {
  const svg = document.getElementById("svg-piezo");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 900 400");
  const L = sim.V0 * 1000 / (Math.PI * sim.D * sim.D / 4); // lungimea camerei [mm]
  const g = SV.g = { XS: 130, XD: 610, YA: 222 };
  g.PX = 480 / L;
  g.rB = clamp(sim.D / 2 * 4.5, 28, 58);
  g.w = clamp(sim.e * 4.5, 9, 34);
  g.rR = clamp(sim.d / 2 * 4.5, 8, g.rB - 10);
  g.YS = g.YA - g.rB; g.YJ = g.YA + g.rB; g.YO1 = g.YS - g.w; g.YO2 = g.YJ + g.w;
  g.rF = g.rB + g.w + 14;
  g.tip0 = g.XD - 12 - 15 * g.PX; // vârful pistonului la n = 0 (15 mm în cameră)
  g.xGl = g.XD + 36;               // fața flanșei drepte
  g.xNut = g.xGl + 30;             // capătul piuliței-presetupă
  g.xCol = g.XD + 196;             // gulerul gradat (la n = 0)
  g.xRoata = g.XD + 246;           // roata (la n = 0)
  g.rS = g.rR * 0.82;              // raza filetului
  g.xAer = g.XS + 40;              // șurubul de aerisire
  g.xMano = 380;
  const E = SV.el;

  const defs = mk("defs", {}, svg);
  grad(defs, "gOtel", STOP.otel);
  grad(defs, "gOtelR", STOP.otel, { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gCrom", STOP.crom);
  grad(defs, "gInterior", STOP.interior);
  grad(defs, "gAlbastru", STOP.albastru);
  grad(defs, "gAlbastruO", STOP.albastru, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gAlama", STOP.alama);
  grad(defs, "gAlamaO", STOP.alama, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gCauciuc", STOP.cauciuc);
  grad(defs, "gRosu", STOP.rosu, { radial: true, cx: 0.4, cy: 0.35, r: 0.7 });
  const c = FLUIDE[sim.fluid].culoare;
  grad(defs, "gLichid", [[0, shade(c, 1.35), 0.72], [0.18, shade(c, 1.12), 0.78], [0.55, c, 0.84], [1, shade(c, 0.62), 0.92]]);
  grad(defs, "gLuciu", [[0, "#fff", 0.55], [1, "#fff", 0]]);
  grad(defs, "gBula", [[0, "#ffffff", 1], [0.28, "#ffffff", 0.65], [0.72, "#e8f0f7", 0.25], [0.92, "#9fb0c2", 0.55], [1, "#5d6b7a", 0.9]], { radial: true, cx: 0.5, cy: 0.5, r: 0.5, fx: 0.36, fy: 0.3 });
  grad(defs, "gCadran", [[0, "#ffffff"], [0.75, "#f7f7f4"], [1, "#dfe2e5"]], { radial: true, cx: 0.45, cy: 0.4, r: 0.65 });
  grad(defs, "gRama", [[0, "#ffffff"], [0.3, "#c8ced5"], [0.55, "#6f7882"], [0.8, "#d9dee3"], [1, "#59616a"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gSticla", [[0, "#ffffff", 0.75], [0.45, "#ffffff", 0.12], [1, "#ffffff", 0]], { x1: 0, y1: 0, x2: 0.7, y2: 1 });
  grad(defs, "gEcran", [[0, "#d8ecff", 0.22], [0.5, "#ffffff", 0.06], [1, "#cfe6ff", 0.16]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gSeringa", [[0, "#ffffff", 0.75], [0.5, "#e9f3fb", 0.35], [1, "#b9c9d8", 0.7]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  filtre(defs);
  const clip = mk("clipPath", { id: "cpFilet" }, defs);
  E.clipFilet = mk("rect", { x: g.xNut, y: g.YA - g.rS - 2, width: g.xCol - g.xNut, height: 2 * g.rS + 4 }, clip);

  /* umbra la sol + placa de bază */
  mk("ellipse", { cx: 470, cy: 356, rx: 420, ry: 9, fill: "#000", opacity: 0.22, filter: "url(#fBlur6)" }, svg);
  mk("rect", { x: 56, y: 338, width: 830, height: 17, rx: 3, fill: "url(#gAlbastru)" }, svg);
  mk("line", { x1: 60, y1: 339.2, x2: 882, y2: 339.2, stroke: "#9fbbe8", "stroke-width": 1, opacity: 0.7 }, svg);
  [78, 470, 864].forEach(x => surub(svg, x, 346.5, 4.5));
  E.balta = mk("ellipse", { cx: g.xGl + 15, cy: 339, rx: 0, ry: 2.5, fill: shade(c, 0.85), opacity: 0.75 }, svg);

  /* furtun (opțional) */
  E.furtun = mk("g", {}, svg);
  const dF = `M${g.XS + 70} ${g.YO2 + 4} C ${g.XS + 70} ${g.YO2 + 44}, ${g.XS - 40} ${g.YO2 + 50}, ${g.XS - 78} ${g.YO2 + 22} C ${g.XS - 104} ${g.YO2}, ${g.XS - 100} ${g.YA - 30}, ${g.XS - 78} ${g.YA - 44}`;
  E.furtunBaza = mk("path", { d: dF, fill: "none", stroke: "#141518", "stroke-width": 13, "stroke-linecap": "round" }, E.furtun);
  E.furtunTesut = mk("path", { d: dF, fill: "none", stroke: "#3b3e44", "stroke-width": 11, "stroke-dasharray": "2 3", opacity: 0.7 }, E.furtun);
  E.furtunLuciu = mk("path", { d: dF, fill: "none", stroke: "#8a9099", "stroke-width": 2.2, opacity: 0.55, transform: "translate(-2,-3)" }, E.furtun);
  mk("rect", { x: g.XS + 62, y: g.YO2 - 2, width: 16, height: 16, rx: 2, fill: "url(#gOtelR)" }, E.furtun);
  mk("rect", { x: g.XS - 86, y: g.YA - 58, width: 16, height: 18, rx: 2, fill: "url(#gOtelR)" }, E.furtun);
  mk("rect", { x: g.XS - 90, y: g.YA - 64, width: 24, height: 8, rx: 2, fill: "url(#gAlama)" }, E.furtun);

  /* suporturi */
  [g.XS + 58, g.XD - 58].forEach(xc => {
    const R = g.rB + g.w;
    mk("path", { d: `M${xc - 30} 338 L${xc - 24} ${g.YO2 + 3} A ${R} ${R} 0 0 0 ${xc + 24} ${g.YO2 + 3} L${xc + 30} 338 Z`, fill: "url(#gAlbastruO)" }, svg);
    mk("line", { x1: xc - 23, y1: g.YO2 + 5, x2: xc - 28, y2: 336, stroke: "#9fbbe8", "stroke-width": 1, opacity: 0.6 }, svg);
    surub(svg, xc - 18, 330, 3.6); surub(svg, xc + 18, 330, 3.6);
  });

  /* ============ corpul piezometrului (cu umbră) */
  const ap = mk("g", { filter: "url(#fUmbra)" }, svg);
  // flanșa stângă + șuruburi
  mk("rect", { x: g.XS - 46, y: g.YA - g.rF + 10, width: 12, height: 14, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XS - 46, y: g.YA + g.rF - 24, width: 12, height: 14, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XS - 34, y: g.YA - g.rF, width: 34, height: 2 * g.rF, rx: 4, fill: "url(#gOtel)" }, ap);
  mk("line", { x1: g.XS - 1, y1: g.YA - g.rF + 2, x2: g.XS - 1, y2: g.YA + g.rF - 2, stroke: "#3c4248", "stroke-width": 1.2, opacity: 0.6 }, ap);
  surub(ap, g.XS - 17, g.YA - g.rF + 13, 6); surub(ap, g.XS - 17, g.YA + g.rF - 13, 6);
  // tubul exterior
  mk("rect", { x: g.XS, y: g.YO1, width: g.XD - g.XS, height: g.YO2 - g.YO1, fill: "url(#gOtel)" }, ap);
  // fereastra secționată
  const xc1 = g.XS + 12, xc2 = g.XD - 12, wc = xc2 - xc1;
  mk("rect", { x: xc1, y: g.YO1, width: wc, height: g.w, fill: "url(#pPeriat)" }, ap);
  mk("rect", { x: xc1, y: g.YO1, width: wc, height: g.w, fill: "url(#pHasura)" }, ap);
  mk("rect", { x: xc1, y: g.YJ, width: wc, height: g.w, fill: "url(#pPeriat)" }, ap);
  mk("rect", { x: xc1, y: g.YJ, width: wc, height: g.w, fill: "url(#pHasura)" }, ap);
  mk("line", { x1: xc1, y1: g.YO1 + 0.6, x2: xc2, y2: g.YO1 + 0.6, stroke: "#fff", "stroke-width": 1.2, opacity: 0.9 }, ap);
  mk("line", { x1: xc1, y1: g.YO2 - 0.6, x2: xc2, y2: g.YO2 - 0.6, stroke: "#5a6168", "stroke-width": 1.2 }, ap);
  mk("rect", { x: xc1, y: g.YS, width: wc, height: 2 * g.rB, fill: "url(#gInterior)" }, ap);
  // canale (port manometru, port aerisire, port furtun)
  mk("rect", { x: g.xMano - 4, y: g.YO1, width: 8, height: g.w + 1, fill: "#2b3036" }, ap);
  mk("rect", { x: g.xAer - 3, y: g.YO1, width: 6, height: g.w + 1, fill: "#2b3036" }, ap);
  E.portFurtun = mk("rect", { x: g.XS + 66, y: g.YJ - 1, width: 8, height: g.w + 1, fill: "#2b3036" }, ap);
  // lichidul
  E.lichid = mk("rect", { x: xc1, y: g.YS, width: wc, height: 2 * g.rB, fill: "url(#gLichid)" }, ap);
  mk("rect", { x: xc1, y: g.YS + 3, width: wc, height: g.rB * 0.42, fill: "url(#gLuciu)", opacity: 0.55, filter: "url(#fBlur1)" }, ap);
  E.caustice = mk("g", { opacity: 0.22 }, ap);
  E.c1 = mk("path", { fill: "none", stroke: "#fff8d8", "stroke-width": 1.4 }, E.caustice);
  E.c2 = mk("path", { fill: "none", stroke: "#fff8d8", "stroke-width": 1 }, E.caustice);
  E.sageti = mk("g", {}, ap);
  E.bule = mk("g", {}, ap);
  E.etLichid = mk("text", { x: xc1 + 8, y: g.YJ - 22, "font-size": 12, fill: "#2f2306", "font-weight": 600 }, ap);
  E.etLichid2 = mk("text", { x: xc1 + 8, y: g.YJ - 8, "font-size": 11.5, fill: "#2f2306" }, ap);
  // margini de tăietură (curbură)
  [xc1, xc2].forEach((x, i) => mk("path", { d: `M${x} ${g.YO1} A 7 ${(g.YO2 - g.YO1) / 2} 0 0 ${i ? 1 : 0} ${x} ${g.YO2}`, fill: "none", stroke: "#000", "stroke-width": 1.4, opacity: 0.35 }, ap));

  // alezajul de ghidare Ø d: camera Ø D se continuă spre dreapta cu un alezaj de diametrul pistonului,
  // în care pistonul alunecă etanș (inele O) pe toată secțiunea – volumul dislocat rămâne n·πd²/4·s
  g.xGh = g.tip0 - 17.5 * g.PX - 6;   // începutul alezajului (cursa maximă ≈ 17 rotații)
  const ghTop = `M${g.xGh - 14} ${g.YS} L${xc2} ${g.YS} L${xc2} ${g.YA - g.rR} L${g.xGh} ${g.YA - g.rR} Z`;
  const ghBot = `M${g.xGh - 14} ${g.YJ} L${xc2} ${g.YJ} L${xc2} ${g.YA + g.rR} L${g.xGh} ${g.YA + g.rR} Z`;
  [ghTop, ghBot].forEach(d => { mk("path", { d, fill: "url(#pPeriat)" }, ap); mk("path", { d, fill: "url(#pHasura)" }, ap); });
  mk("line", { x1: g.xGh, y1: g.YA - g.rR, x2: xc2, y2: g.YA - g.rR, stroke: "#3c4248", "stroke-width": 1.2 }, ap);
  mk("line", { x1: g.xGh, y1: g.YA + g.rR, x2: xc2, y2: g.YA + g.rR, stroke: "#3c4248", "stroke-width": 1.2 }, ap);
  mk("line", { x1: g.xGh - 14, y1: g.YS, x2: g.xGh, y2: g.YA - g.rR, stroke: "#5a6168", "stroke-width": 1 }, ap);
  mk("line", { x1: g.xGh - 14, y1: g.YJ, x2: g.xGh, y2: g.YA + g.rR, stroke: "#5a6168", "stroke-width": 1 }, ap);

  // pistonul (plonjor Ø d) – umple complet alezajul de ghidare; mobil
  E.mobilInt = mk("g", {}, ap);
  const rp = g.rR - 0.4;
  mk("rect", { x: g.tip0, y: g.YA - rp, width: g.xNut - g.tip0 + 4, height: 2 * rp, fill: "url(#gCrom)" }, E.mobilInt);
  // canalele cu inele O (etanșează pe toată circumferința) și inelul de sprijin
  [8, 17].forEach(o => {
    mk("rect", { x: g.tip0 + o, y: g.YA - rp, width: 4.5, height: 2 * rp, fill: "#2f3439" }, E.mobilInt);
    mk("rect", { x: g.tip0 + o + 0.4, y: g.YA - g.rR - 0.6, width: 3.7, height: 2 * g.rR + 1.2, rx: 1.8, fill: "#1f5b4d" }, E.mobilInt);
    mk("rect", { x: g.tip0 + o + 1, y: g.YA - g.rR, width: 1.2, height: 2 * g.rR, fill: "#5fa58f", opacity: 0.55 }, E.mobilInt);
  });
  mk("rect", { x: g.tip0 + 23, y: g.YA - rp, width: 2, height: 2 * rp, fill: "#e8e2cf", opacity: 0.9 }, E.mobilInt);
  // fața frontală (ușor teșită) a pistonului
  mk("path", { d: `M${g.tip0 + 3} ${g.YA - rp} L${g.tip0} ${g.YA - rp + 3} L${g.tip0} ${g.YA + rp - 3} L${g.tip0 + 3} ${g.YA + rp} Z`, fill: "#b9c0c7", stroke: "#6f7780", "stroke-width": 0.6 }, E.mobilInt);
  mk("line", { x1: g.tip0 + 4, y1: g.YA - rp + 1, x2: g.tip0 + 4, y2: g.YA + rp - 1, stroke: "#fff", "stroke-width": 0.8, opacity: 0.7 }, E.mobilInt);

  // inelul necret din dreapta + garnitura O-ring
  mk("rect", { x: xc2, y: g.YO1, width: 12, height: g.YO2 - g.YO1, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: xc2 - 3, y: g.YA - g.rR - 4, width: 6, height: 4, rx: 2, fill: "#1f5b4d" }, ap);
  mk("rect", { x: xc2 - 3, y: g.YA + g.rR, width: 6, height: 4, rx: 2, fill: "#1f5b4d" }, ap);
  mk("rect", { x: g.XS, y: g.YO1, width: 12, height: g.YO2 - g.YO1, fill: "url(#gOtel)" }, ap);
  // flanșa dreaptă
  mk("rect", { x: g.XD, y: g.YA - g.rF, width: 36, height: 2 * g.rF, rx: 4, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XD + 36, y: g.YA - g.rF + 10, width: 10, height: 14, fill: "url(#gOtel)" }, ap);
  mk("rect", { x: g.XD + 36, y: g.YA + g.rF - 24, width: 10, height: 14, fill: "url(#gOtel)" }, ap);
  surub(ap, g.XD + 18, g.YA - g.rF + 13, 6); surub(ap, g.XD + 18, g.YA + g.rF - 13, 6);
  // piulița-presetupă (alamă, hexagonală)
  const hN = g.rR + 12;
  mk("rect", { x: g.xGl, y: g.YA - hN, width: 30, height: 2 * hN, rx: 2, fill: "url(#gAlama)" }, ap);
  mk("line", { x1: g.xGl, y1: g.YA - hN * 0.5, x2: g.xGl + 30, y2: g.YA - hN * 0.5, stroke: "#fff3c4", "stroke-width": 1, opacity: 0.7 }, ap);
  mk("line", { x1: g.xGl, y1: g.YA + hN * 0.5, x2: g.xGl + 30, y2: g.YA + hN * 0.5, stroke: "#5f430f", "stroke-width": 1, opacity: 0.6 }, ap);
  E.scurgere = mk("g", {}, svg);

  // tija filetată exterioară (mobilă) – corpul
  E.mobilExt = mk("g", {}, svg);
  mk("rect", { x: g.xNut, y: g.YA - g.rS, width: g.xCol - g.xNut + 2, height: 2 * g.rS, fill: "url(#gCrom)" }, E.mobilExt);
  // filetul (static: la un șurub care se înșurubează într-o piuliță fixă, spirele par să stea pe loc)
  const fil = mk("g", { "clip-path": "url(#cpFilet)" }, svg);
  const pas = Math.max(2.2, sim.s * g.PX);
  for (let x = g.xNut - 40; x < g.xCol + 60; x += pas) {
    mk("line", { x1: x, y1: g.YA - g.rS, x2: x + pas * 0.55, y2: g.YA + g.rS, stroke: "#2f353b", "stroke-width": 0.9, opacity: 0.55 }, fil);
    mk("line", { x1: x + 0.9, y1: g.YA - g.rS, x2: x + 0.9 + pas * 0.55, y2: g.YA + g.rS, stroke: "#ffffff", "stroke-width": 0.6, opacity: 0.55 }, fil);
  }
  mk("rect", { x: g.xNut - 40, y: g.YA - g.rS, width: 400, height: 3, fill: "#fff", opacity: 0.25 }, fil);
  // gulerul gradat + roata – desenate dinamic
  E.roata = mk("g", {}, svg);

  /* șurub de aerisire (cu capac animat) */
  mk("rect", { x: g.xAer - 7, y: g.YO1 - 16, width: 14, height: 16, fill: "url(#gOtelR)" }, svg);
  mk("rect", { x: g.xAer - 10, y: g.YO1 - 24, width: 20, height: 9, rx: 1.5, fill: "url(#gAlamaO)" }, svg);
  E.capAer = mk("g", {}, svg);
  mk("rect", { x: g.xAer - 7, y: g.YO1 - 38, width: 14, height: 14, rx: 2, fill: "url(#gOtelR)" }, E.capAer);
  for (let x = g.xAer - 6; x < g.xAer + 7; x += 2) mk("line", { x1: x, y1: g.YO1 - 37, x2: x, y2: g.YO1 - 25, stroke: "#59616a", "stroke-width": 0.7 }, E.capAer);
  E.aerisire = mk("g", {}, svg);

  /* manometrul */
  const MX = g.xMano, MR = 50, MY = g.YO1 - MR - 40;
  SV.mano = { MX, MY, MR };
  mk("rect", { x: MX - 4, y: MY + MR - 2, width: 8, height: g.YO1 - (MY + MR) + 2, fill: "url(#gAlamaO)" }, svg);
  mk("rect", { x: MX - 10, y: g.YO1 - 18, width: 20, height: 12, rx: 1.5, fill: "url(#gAlamaO)" }, svg);
  mk("rect", { x: MX - 7, y: MY + MR - 4, width: 14, height: 10, rx: 1.5, fill: "url(#gAlamaO)" }, svg);
  const gm = mk("g", { filter: "url(#fUmbra)" }, svg);
  mk("circle", { cx: MX, cy: MY, r: MR + 7, fill: "url(#gRama)" }, gm);
  mk("circle", { cx: MX, cy: MY, r: MR + 2.5, fill: "#8d959e" }, gm);
  mk("circle", { cx: MX, cy: MY, r: MR, fill: "url(#gCadran)" }, gm);
  const ang = p => (-135 + 270 * p / 160) * Math.PI / 180; // 0 = sus
  const P = (r, p) => [MX + r * Math.sin(ang(p)), MY - r * Math.cos(ang(p))];
  // zona roșie peste 100 bar
  { const [x1, y1] = P(MR - 7, 100), [x2, y2] = P(MR - 7, 160); mk("path", { d: `M${x1} ${y1} A ${MR - 7} ${MR - 7} 0 0 1 ${x2} ${y2}`, fill: "none", stroke: "#d32f2f", "stroke-width": 4.5 }, gm); }
  for (let p = 0; p <= 160; p += 2) {
    const maj = p % 20 === 0, med = p % 10 === 0;
    const [x1, y1] = P(MR - 3, p), [x2, y2] = P(MR - 3 - (maj ? 9 : med ? 6.5 : 3.5), p);
    mk("line", { x1, y1, x2, y2, stroke: "#1b1b1b", "stroke-width": maj ? 1.5 : 0.7 }, gm);
    if (maj) { const [xt, yt] = P(MR - 19, p); const t = mk("text", { x: xt, y: yt + 3.5, "font-size": 9, "text-anchor": "middle", fill: "#1b1b1b", "font-weight": 600 }, gm); t.textContent = p; }
  }
  const t1 = mk("text", { x: MX, y: MY + 20, "font-size": 9, "text-anchor": "middle", fill: "#333", "font-weight": 700 }, gm); t1.textContent = "bar";
  const t2 = mk("text", { x: MX, y: MY + 31, "font-size": 6.5, "text-anchor": "middle", fill: "#666" }, gm); t2.textContent = "cl. 1,0 · EN 837-1";
  E.acUmbra = mk("g", { opacity: 0.28, filter: "url(#fBlur1)" }, gm);
  E.ac = mk("g", {}, gm);
  [E.acUmbra, E.ac].forEach((grp, i) => {
    mk("polygon", { points: `0,${-(MR - 8)} -2.6,4 -1.6,11 1.6,11 2.6,4`, fill: i ? "#c62828" : "#000" }, grp);
    if (i) mk("line", { x1: 0, y1: -(MR - 10), x2: 0, y2: 0, stroke: "#ff8a80", "stroke-width": 0.6, opacity: 0.7 }, grp);
  });
  mk("circle", { cx: MX, cy: MY, r: 5, fill: "url(#gOtelR)", stroke: "#444", "stroke-width": 0.6 }, gm);
  mk("path", { d: `M${MX - MR + 4} ${MY - 6} A ${MR - 4} ${MR - 4} 0 0 1 ${MX + 18} ${MY - MR + 6} Q ${MX - 8} ${MY - 26} ${MX - MR + 4} ${MY - 6} Z`, fill: "url(#gSticla)" }, gm);

  /* ecranul de protecție (policarbonat) */
  E.ecran = mk("g", {}, svg);
  mk("rect", { x: 60, y: 118, width: 8, height: 220, rx: 2, fill: "url(#gOtelR)" }, E.ecran);
  mk("rect", { x: 712, y: 118, width: 8, height: 220, rx: 2, fill: "url(#gOtelR)" }, E.ecran);
  mk("rect", { x: 66, y: 122, width: 648, height: 206, rx: 5, fill: "url(#gEcran)", stroke: "rgba(170,205,240,.75)", "stroke-width": 1.6 }, E.ecran);
  mk("path", { d: "M90 128 L150 128 L80 322 L70 322 Z", fill: "#fff", opacity: 0.12 }, E.ecran);
  mk("path", { d: "M170 128 L188 128 L118 322 L110 322 Z", fill: "#fff", opacity: 0.08 }, E.ecran);
  mk("path", { d: "M600 128 L640 128 L590 322 L560 322 Z", fill: "#fff", opacity: 0.08 }, E.ecran);
  const te = mk("text", { x: 704, y: 138, "font-size": 10.5, "text-anchor": "end", fill: "#4d7fb8" }, E.ecran); te.textContent = "ecran de protecție (policarbonat)";

  /* seringa de 1 cm³ (animație): pistonul de cauciuc etanșează pe toată secțiunea interioară a cilindrului */
  E.seringa = mk("g", { opacity: 0 }, svg);
  const sx = g.xAer, sy0 = g.YO1 - 30;          // vârful acului, în șurubul de aerisire
  const S = SV.ser = { sx, yZ: sy0 - 30, Lml: 40, ri: 8, re: 10 }; // yZ = reperul 0; Lml = lungimea pentru 1 cm³
  const yTop = S.yZ - S.Lml - 4;
  grad(defs, "gSerSticla", [[0, "#dbe7f1", 0.75], [0.18, "#ffffff", 0.35], [0.5, "#f4f9fd", 0.12], [0.82, "#ffffff", 0.3], [1, "#b9c9d8", 0.7]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gSerCauciuc", [[0, "#1b1d20"], [0.35, "#4a4f57"], [0.55, "#2a2d31"], [1, "#0f1012"]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gSerTija", [[0, "#d9e1e8"], [0.4, "#ffffff"], [1, "#b7c4d0"]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  // acul și conul Luer
  mk("line", { x1: sx, y1: sy0, x2: sx, y2: sy0 - 20, stroke: "#8f99a3", "stroke-width": 1.3 }, E.seringa);
  mk("line", { x1: sx - 0.4, y1: sy0 - 1, x2: sx - 0.4, y2: sy0 - 19, stroke: "#fff", "stroke-width": 0.4, opacity: 0.8 }, E.seringa);
  mk("path", { d: `M${sx - 4} ${sy0 - 26} L${sx + 4} ${sy0 - 26} L${sx + 3} ${sy0 - 20} L${sx - 3} ${sy0 - 20} Z`, fill: "#2c7a9b", opacity: 0.85 }, E.seringa);
  mk("path", { d: `M${sx - S.re} ${S.yZ + 1} L${sx + S.re} ${S.yZ + 1} L${sx + 2.5} ${sy0 - 26} L${sx - 2.5} ${sy0 - 26} Z`, fill: "url(#gSerSticla)", stroke: "#8aa0b6", "stroke-width": 0.7 }, E.seringa);
  // cilindrul (sticlă / polipropilenă transparentă) cu pereți
  mk("rect", { x: sx - S.re, y: yTop, width: 2 * S.re, height: S.yZ - yTop + 1, fill: "url(#gSerSticla)", stroke: "#8aa0b6", "stroke-width": 0.8 }, E.seringa);
  mk("rect", { x: sx - S.ri, y: yTop, width: 2 * S.ri, height: S.yZ - yTop, fill: "#ffffff", opacity: 0.18 }, E.seringa);
  E.serAer = mk("rect", { x: sx - S.ri, width: 2 * S.ri, y: S.yZ, height: 0, fill: "#e3f1ff", opacity: 0.55 }, E.seringa);
  // pistonul (dop de cauciuc pe toată secțiunea interioară) + tija în cruce + apăsătorul
  E.serPiston = mk("g", {}, E.seringa);
  const Lt = S.Lml + 4;
  mk("rect", { x: sx - 1.6, y: -7 - Lt, width: 3.2, height: Lt, fill: "url(#gSerTija)", stroke: "#9fb0c0", "stroke-width": 0.5 }, E.serPiston);
  mk("rect", { x: sx - 5, y: -7 - Lt, width: 10, height: Lt, fill: "url(#gSerTija)", opacity: 0.55, stroke: "#b3c2cf", "stroke-width": 0.4 }, E.serPiston);
  mk("rect", { x: sx - 12, y: -7 - Lt - 4, width: 24, height: 4, rx: 1.5, fill: "url(#gSerTija)", stroke: "#9fb0c0", "stroke-width": 0.6 }, E.serPiston);
  mk("rect", { x: sx - S.ri, y: -7, width: 2 * S.ri, height: 7, rx: 0.8, fill: "url(#gSerCauciuc)" }, E.serPiston);
  [-6.2, -1.6].forEach(y => mk("rect", { x: sx - S.ri - 0.3, y, width: 2 * S.ri + 0.6, height: 1.6, rx: 0.8, fill: "#2a2d31" }, E.serPiston)); // nervurile de etanșare pe pereți
  mk("path", { d: `M${sx - S.ri} 0 L${sx + S.ri} 0 L${sx + 3} 2.2 L${sx - 3} 2.2 Z`, fill: "#1b1d20" }, E.serPiston); // vârful conic al dopului
  // gradațiile 0…1 cm³ (peste piston, pe fața cilindrului) și aripioarele
  for (let k = 0; k <= 10; k++) {
    const y = S.yZ - k / 10 * S.Lml, maj = k % 5 === 0;
    mk("line", { x1: sx - S.re, y1: y, x2: sx - S.re + (maj ? 7 : 4), y2: y, stroke: "#1f2a36", "stroke-width": maj ? 0.8 : 0.5 }, E.seringa);
    if (maj && k) { const t = mk("text", { x: sx + S.re + 2, y: y + 2.5, "font-size": 6.5, fill: "#1f2a36" }, E.seringa); t.textContent = k === 10 ? "1 ml" : "0,5"; }
  }
  mk("rect", { x: sx - 17, y: yTop - 3, width: 34, height: 3.5, rx: 1.5, fill: "#e6edf3", stroke: "#8aa0b6", "stroke-width": 0.6 }, E.seringa);
  mk("line", { x1: sx - S.re + 1.2, y1: yTop + 2, x2: sx - S.re + 1.2, y2: S.yZ - 1, stroke: "#fff", "stroke-width": 1.2, opacity: 0.7 }, E.seringa);

  /* vederea frontală a roții (cadran) */
  const RX = 790, RY = 72, RR = 46;
  SV.roataF = { RX, RY, RR };
  mk("circle", { cx: RX, cy: RY, r: RR + 18, fill: "var(--suprafata-2)", stroke: "var(--linie)" }, svg);
  E.roataF = mk("g", { style: "cursor:grab" }, svg);
  mk("circle", { cx: RX, cy: RY, r: RR + 9, fill: "none", stroke: "url(#gRama)", "stroke-width": 14 }, E.roataF);
  for (let k = 0; k < 100; k++) {
    const a = -k / 100 * 2 * Math.PI, l = k % 10 === 0 ? 8 : k % 5 === 0 ? 6 : 3.5;
    const r1 = RR + 15.5, r2 = r1 - l;
    mk("line", { x1: RX + r1 * Math.sin(a), y1: RY - r1 * Math.cos(a), x2: RX + r2 * Math.sin(a), y2: RY - r2 * Math.cos(a), stroke: "#20252b", "stroke-width": k % 10 ? 0.6 : 1.1 }, E.roataF);
    if (k % 10 === 0) { const rt = RR + 4; const t = mk("text", { x: RX + rt * Math.sin(a), y: RY - rt * Math.cos(a) + 2.4, "font-size": 6.5, "text-anchor": "middle", fill: "#20252b", transform: `rotate(${a * 180 / Math.PI} ${RX + rt * Math.sin(a)} ${RY - rt * Math.cos(a)})` }, E.roataF); t.textContent = k; }
  }
  mk("circle", { cx: RX, cy: RY, r: RR - 9, fill: "none", stroke: "#0e1d36", "stroke-width": 9, opacity: 0.6, transform: "translate(1.5,2)" }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: RR - 9, fill: "none", stroke: "url(#gAlbastru)", "stroke-width": 8 }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: RR - 11, fill: "none", stroke: "#a9c3ee", "stroke-width": 1, opacity: 0.6 }, E.roataF);
  for (let k = 0; k < 3; k++) {
    const a = k * 2 * Math.PI / 3;
    const cs = Math.cos(a), sn = Math.sin(a);
    const pt = (r, off) => `${RX + r * sn + off * cs},${RY - r * cs + off * sn}`;
    mk("path", { d: `M${pt(8, -4)} Q${pt(20, -8)} ${pt(RR - 12, -3.5)} L${pt(RR - 12, 3.5)} Q${pt(20, 2)} ${pt(8, 4)} Z`, fill: "url(#gAlbastru)", stroke: "#132848", "stroke-width": 0.6 }, E.roataF);
  }
  mk("circle", { cx: RX, cy: RY, r: 9, fill: "url(#gOtelR)", stroke: "#3c4248", "stroke-width": 0.8 }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: 3, fill: "#3c4248" }, E.roataF);
  mk("circle", { cx: RX + (RR - 9) * Math.sin(2.1), cy: RY - (RR - 9) * Math.cos(2.1), r: 5.5, fill: "url(#gRosu)", stroke: "#4a0a0a", "stroke-width": 0.6 }, E.roataF);
  mk("circle", { cx: RX, cy: RY, r: RR + 18, fill: "transparent" }, E.roataF);
  mk("polygon", { points: `${RX - 5},${RY - RR - 22} ${RX + 5},${RY - RR - 22} ${RX},${RY - RR - 13}`, fill: "#d32f2f" }, svg);
  const tf1 = mk("text", { x: RX - RR - 24, y: RY + 2, "font-size": 10.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tf1.textContent = "vedere";
  const tf2 = mk("text", { x: RX - RR - 24, y: RY + 15, "font-size": 10.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tf2.textContent = "din dreapta";
  const tf3 = mk("text", { x: RX - RR - 24, y: RY + 28, "font-size": 10.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tf3.textContent = "(trageți)";

  /* etichete cu linii de indicație */
  E.etichete = mk("g", { "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  const et = (x, y, t, x2, y2, anchor = "start") => {
    mk("line", { x1: x2, y1: y2, x2: anchor === "end" ? x + 3 : x - 3, y2: y - 4, stroke: "var(--text-sec)", "stroke-width": 0.8 }, E.etichete);
    mk("circle", { cx: x2, cy: y2, r: 2, fill: "var(--text-sec)" }, E.etichete);
    const e = mk("text", { x, y, "text-anchor": anchor }, E.etichete); e.textContent = t; return e;
  };
  et(MX + 72, 34, "manometru 0…160 bar", MX + MR + 6, MY - 12);
  et(g.xAer - 36, 98, "șurub de aerisire", g.xAer, g.YO1 - 32, "end");
  E.etCil = et(140, 380, "", g.XS + 18, g.YO2 - 4);
  et(420, 392, "alezaj de ghidare Ø d, pistonul etanșat cu inele O", g.xGh + 22, g.YA + g.rR + 5);
  E.etPiston = mk("text", { x: g.xNut + 4, y: g.YA + g.rS + 24, "font-size": 11.5 }, E.etichete);
  const tr = mk("text", { x: g.xRoata - 6, y: 326, "font-size": 11.5, "text-anchor": "middle" }, E.etichete); tr.textContent = "roată de manevră";
  E.cursa = mk("text", { x: g.xNut + 4, y: g.YA + g.rS + 40, "font-size": 11, fill: "var(--text-sec)" }, svg);

  // tragere de roată (în vederea frontală)
  let trag = null;
  const unghi = ev => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return Math.atan2(q.y - RY, q.x - RX); };
  E.roataF.addEventListener("pointerdown", ev => { trag = unghi(ev); E.roataF.setPointerCapture(ev.pointerId); E.roataF.style.cursor = "grabbing"; ev.preventDefault(); });
  E.roataF.addEventListener("pointermove", ev => { if (trag === null) return; const a = unghi(ev); let d = a - trag; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; trag = a; sim.tintaN = null; roteste(d / (2 * Math.PI)); });
  const stop = () => { trag = null; E.roataF.style.cursor = "grab"; };
  E.roataF.addEventListener("pointerup", stop); E.roataF.addEventListener("pointercancel", stop);

  prefixeazaId(svg, "pz-");
  SV.buleNeaer = [];
  for (let i = 0; i < 11; i++) SV.buleNeaer.push({ x: xc1 + 30 + Math.random() * (wc - 140), r: 0.5 + Math.random() * 0.9, ph: Math.random() * 6 });
  SV.anim.ecran = document.getElementById("ck-ecran").checked ? 1 : 0;
}

/* ---- roata laterală, gulerul gradat (dinamic, cu perspectivă) */
function roataLaterala(dx, th) {
  const g = SV.g;
  const xc = g.xCol - dx, xw = g.xRoata - dx, Rc = g.rR + 13, R = 78, rx = 10;
  let s = "";
  // butucul gulerului + gulerul
  s += `<rect x="${xc - 2}" y="${g.YA - g.rS - 3}" width="6" height="${2 * g.rS + 6}" fill="url(#pz-gOtel)"/>`;
  s += `<rect x="${xc + 4}" y="${g.YA - Rc}" width="24" height="${2 * Rc}" rx="3" fill="url(#pz-gOtel)"/>`;
  for (let k = 0; k < 50; k++) {
    const a = th + k * 2 * Math.PI / 50;
    if (Math.sin(a) <= 0.05) continue;
    const y = g.YA - Rc * Math.cos(a), l = k % 10 === 0 ? 11 : k % 5 === 0 ? 8 : 5;
    s += `<line x1="${xc + 4}" y1="${y}" x2="${xc + 4 + l}" y2="${y}" stroke="#1d2227" stroke-width="${k % 10 ? 0.7 : 1.2}" opacity="${0.35 + 0.65 * Math.sin(a)}"/>`;
  }
  // tija spre roată + butuc
  s += `<rect x="${xc + 28}" y="${g.YA - g.rS}" width="${xw - xc - 28}" height="${2 * g.rS}" fill="url(#pz-gCrom)"/>`;
  // spițele din spate
  const spite = [];
  for (let k = 0; k < 5; k++) { const a = th + k * 2 * Math.PI / 5; spite.push({ a, z: Math.sin(a) }); }
  const spita = sp => {
    const y = g.YA - (R - 6) * Math.cos(sp.a), x = xw + rx * Math.sin(sp.a) * 0.9;
    const c = sp.z < 0 ? "#1c3560" : "url(#pz-gAlbastru)";
    return `<path d="M${xw - 2} ${g.YA - 5} Q ${(xw + x) / 2 + 3} ${(g.YA + y) / 2} ${x} ${y - 4} L ${x} ${y + 4} Q ${(xw + x) / 2 - 3} ${(g.YA + y) / 2} ${xw - 2} ${g.YA + 5} Z" fill="${c}" opacity="${sp.z < 0 ? 0.85 : 1}"/>`;
  };
  spite.filter(sp => sp.z < 0).forEach(sp => s += spita(sp));
  // mânerul, dacă e în spate
  const mY = g.YA - R * Math.cos(th), mX = xw + rx * Math.sin(th);
  const maner = `<rect x="${mX}" y="${mY - 5.5}" width="30" height="11" rx="5" fill="url(#pz-gCauciuc)"/><rect x="${mX - 3}" y="${mY - 3}" width="6" height="6" fill="url(#pz-gOtel)"/>`;
  if (Math.sin(th) < 0) s += maner;
  // janta (tor văzut aproape din profil)
  s += `<ellipse cx="${xw + 1.5}" cy="${g.YA + 2}" rx="${rx}" ry="${R}" fill="none" stroke="#0e1d36" stroke-width="10" opacity=".45"/>`;
  s += `<ellipse cx="${xw}" cy="${g.YA}" rx="${rx}" ry="${R}" fill="none" stroke="url(#pz-gAlbastruO)" stroke-width="9"/>`;
  s += `<ellipse cx="${xw - 2}" cy="${g.YA}" rx="${rx - 3}" ry="${R - 2}" fill="none" stroke="#b9d0f5" stroke-width="1" opacity=".55"/>`;
  s += `<rect x="${xw - 14}" y="${g.YA - 16}" width="22" height="32" rx="4" fill="url(#pz-gAlbastru)"/>`;
  s += `<rect x="${xw + 8}" y="${g.YA - 7}" width="9" height="14" rx="2" fill="url(#pz-gOtel)"/>`;
  spite.filter(sp => sp.z >= 0).forEach(sp => s += spita(sp));
  if (Math.sin(th) >= 0) s += maner;
  SV.el.roata.innerHTML = s;
}

/* ---- bulele de aer */
function bulaSVG(x, yTop, r, t, ph) {
  const w = 1 + 0.035 * Math.sin(t * 5 + ph), rx = r * 1.12 * w, ry = r * 0.9 / w; // turtită de peretele de sus
  const cy = yTop + ry + 0.5;
  return `<ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pz-gBula)" stroke="rgba(70,80,95,.55)" stroke-width="0.7"/>` +
    (r > 3 ? `<ellipse cx="${x - rx * 0.35}" cy="${cy - ry * 0.4}" rx="${rx * 0.28}" ry="${ry * 0.18}" fill="#fff" opacity=".9"/><path d="M${x - rx * 0.6} ${cy + ry * 0.45} Q ${x} ${cy + ry * 0.85} ${x + rx * 0.6} ${cy + ry * 0.45}" fill="none" stroke="#fff" stroke-width="0.8" opacity=".6"/>` : "");
}
const rPx = Vcm3 => Math.cbrt(3 * Vcm3 * 1000 / (4 * Math.PI)) * 4.5; // rază [px] la scara transversală

/* ======================================================================= actualizare la fiecare cadru */
function actualizeazaSVG(p, pAc, dt) {
  const g = SV.g, E = SV.el, A = SV.anim;
  A.t += dt;
  const t = A.t;
  const dx = sim.n * sim.s * g.PX;
  const th = sim.n * 2 * Math.PI;
  E.mobilInt.setAttribute("transform", `translate(${-dx},0)`);
  E.mobilExt.setAttribute("transform", `translate(${-dx},0)`);
  E.clipFilet.setAttribute("width", Math.max(0, g.xCol - dx - g.xNut));
  roataLaterala(dx, th);
  E.roataF.setAttribute("transform", `rotate(${(sim.n * 360) % 360} ${SV.roataF.RX} ${SV.roataF.RY})`);

  // acul manometrului (cu ușoară vibrație când se rotește roata)
  const vib = (sim.tine || sim.tintaN !== null) && p > 1 ? Math.sin(t * 47) * 0.25 : 0;
  const a = -135 + 270 * clamp(pAc + vib, -1.5, 166) / 160;
  E.ac.setAttribute("transform", `translate(${SV.mano.MX},${SV.mano.MY}) rotate(${a})`);
  E.acUmbra.setAttribute("transform", `translate(${SV.mano.MX + 1.8},${SV.mano.MY + 2.6}) rotate(${a})`);

  // caustice în lichid
  const xc1 = g.XS + 12, xc2 = g.XD - 12 - dx * 0, y1 = g.YS + g.rB * 0.55, y2 = g.YS + g.rB * 1.25;
  let d1 = `M${xc1} ${y1}`, d2 = `M${xc1} ${y2}`;
  for (let x = xc1; x <= xc2; x += 12) { d1 += ` L${x} ${y1 + 2.2 * Math.sin(x / 23 + t * 0.9)}`; d2 += ` L${x} ${y2 + 1.8 * Math.sin(x / 31 - t * 0.7)}`; }
  E.c1.setAttribute("d", d1); E.c2.setAttribute("d", d2);

  // forțele de presiune (legea lui Pascal)
  const arataS = document.getElementById("ck-sageti")?.checked !== false && p > 0.3;
  if (arataS) {
    const L = 8 + Math.min(1, p / 100) * (g.rB - 18);
    let s = "";
    [g.XS + 190, g.XS + 270, g.XS + 350].forEach(x => {
      if (x > g.tip0 - dx - 10) return;
      s += `<line x1="${x}" y1="${g.YA - 6}" x2="${x}" y2="${g.YA - 6 - L}" stroke="#5a3d00" stroke-width="1.6" opacity=".55" marker-end="url(#mS)"/>`;
      s += `<line x1="${x}" y1="${g.YA + 6}" x2="${x}" y2="${g.YA + 6 + L}" stroke="#5a3d00" stroke-width="1.6" opacity=".55" marker-end="url(#mS)"/>`;
    });
    const xt = g.tip0 - dx - 6;
    s += `<line x1="${xt}" y1="${g.YA}" x2="${xt - 6 - L * 0.7}" y2="${g.YA}" stroke="#5a3d00" stroke-width="1.6" opacity=".55" marker-end="url(#mS)"/>`;
    if (!document.getElementById("mS")) {
      const m = mk("marker", { id: "mS", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 4.5, markerHeight: 4.5, orient: "auto" }, document.querySelector("#svg-piezo defs"));
      mk("path", { d: "M0 0L10 5L0 10z", fill: "#5a3d00" }, m);
    }
    E.sageti.innerHTML = s;
  } else E.sageti.innerHTML = "";

  // bule
  let sb = "";
  const f = P_ATM / (P_ATM + Math.max(0, p));
  if (!sim.aerisit || A.aerisire) {
    const prog = A.aerisire ? clamp((performance.now() - A.aerisire) / 1800, 0, 1) : 0;
    SV.buleNeaer.forEach(b => {
      const x = b.x + (g.xAer - b.x) * prog * prog;
      const r = rPx(b.r * AER_NEAERISIT / 9 * f) * (1 - prog);
      if (r > 0.3) sb += bulaSVG(x + Math.sin(t * 2 + b.ph) * 0.6, g.YS, Math.max(0.9, r), t, b.ph);
    });
  }
  if (sim.Vinj > 0) {
    const nb = Math.max(1, sim.nBule || 1), Vb = sim.Vinj / nb;
    const arataE = document.getElementById("ck-etichete")?.checked !== false;
    let u = A.seringa ? (performance.now() - A.seringa) / 1000 : 9;
    if (u > 2.4 + 0.35 * nb) A.seringa = null;
    for (let i = 0; i < nb; i++) {
      const xf = g.XS + 95 + i * 62 + (i % 2) * 6;
      let x = xf, scale = 1;
      const ui = u - i * 0.35; // bulele intră una după alta
      if (ui < 0.4) scale = 0;
      else if (ui < 1.4) { scale = ui - 0.4; x = g.xAer; }
      else if (ui < 2.4) { const k = ui - 1.4; x = g.xAer + (xf - g.xAer) * (1 - Math.pow(1 - k, 3)); }
      const r = rPx(Vb * f) * Math.cbrt(scale);
      if (r > 0.2) sb += bulaSVG(x + Math.sin(t * 1.7 + i) * 0.5, g.YS, Math.max(1, r), t, i * 1.3);
    }
    if (arataE && u > 2.4) sb += `<text x="${g.XS + 80}" y="${g.YS + 2 * rPx(Vb * f) + 16}" font-size="10.5" fill="#2f2306">${nb} × Ø${fmt(sim.dBula, 1)} mm → ${fmt(sim.Vinj * f, 3)} cm³</text>`;
  }
  E.bule.innerHTML = sb;

  // animația aerisirii (capac ridicat, bule și o picătură)
  if (A.aerisire) {
    const u = (performance.now() - A.aerisire) / 1000;
    const lift = u < 0.3 ? u / 0.3 : u < 2.0 ? 1 : u < 2.3 ? 1 - (u - 2.0) / 0.3 : 0;
    E.capAer.setAttribute("transform", `translate(0,${-9 * lift}) rotate(${-200 * lift} ${g.xAer} ${g.YO1 - 31})`);
    let s = "";
    if (u > 0.4 && u < 2.0) for (let i = 0; i < 6; i++) {
      const k = ((u - 0.4) * 1.6 + i / 6) % 1, y = g.YO1 - 30 - k * 46, rr = 1.6 + 2.2 * (1 - k);
      s += `<circle cx="${g.xAer + Math.sin(u * 7 + i) * 3}" cy="${y}" r="${rr}" fill="url(#pz-gBula)" stroke="rgba(70,80,95,.5)" stroke-width=".5" opacity="${1 - k}"/>`;
    }
    if (u > 1.4 && u < 2.2) { const k = (u - 1.4) / 0.8; s += `<ellipse cx="${g.xAer + 8}" cy="${g.YO1 - 26 + k * k * 24}" rx="2.2" ry="3.2" fill="${FLUIDE[sim.fluid].culoare}"/>`; }
    E.aerisire.innerHTML = s;
    if (u > 2.4) { A.aerisire = null; E.aerisire.innerHTML = ""; E.capAer.removeAttribute("transform"); }
  }

  // animația seringii
  if (A.seringa) {
    const u = (performance.now() - A.seringa) / 1000;
    const op = u < 0.3 ? u / 0.3 : u < 1.8 ? 1 : Math.max(0, 1 - (u - 1.8) / 0.4);
    E.seringa.setAttribute("opacity", op);
    // pistonul împinge aerul: volumul rămas în seringă scade de la V_a0 la 0
    const S = SV.ser, Vrem = Math.min(1, sim.Vinj) * (1 - clamp((u - 0.4) / 1.0, 0, 1));
    const yS = S.yZ - Vrem * S.Lml;
    E.serPiston.setAttribute("transform", `translate(0,${yS})`);
    E.serAer.setAttribute("y", yS + 2); E.serAer.setAttribute("height", Math.max(0, S.yZ - yS - 2));
    const lift = u < 0.3 ? u / 0.3 : u < 1.8 ? 1 : Math.max(0, 1 - (u - 1.8) / 0.3);
    E.capAer.setAttribute("transform", `translate(-26,${-14 * lift})`);
    E.capAer.setAttribute("opacity", 1 - 0.0 * lift);
  } else if (!A.aerisire) { E.seringa.setAttribute("opacity", 0); E.capAer.removeAttribute("transform"); }

  // scurgerea: picătura se formează la presetupă, cade și formează o baltă
  const leak = sim.defect === "scurgere";
  let sl = "";
  if (leak && (p > 0.5 || SV.picaturi.length)) {
    const xg = g.xGl + 15, yg = g.YA + g.rR + 12;
    if (p > 0.5) {
      SV.picForm = (SV.picForm || 0) + dt * (p / 100) * (sim.rapid ? 6 : 1.2);
      if (SV.picForm >= 1) { SV.picaturi.push({ y: yg + 3, v: 0 }); SV.picForm = 0; }
      const r = 1 + 2.4 * (SV.picForm || 0);
      sl += `<path d="M${xg - r} ${yg + r * 0.6} Q ${xg} ${yg - r * 1.4} ${xg + r} ${yg + r * 0.6} A ${r} ${r} 0 0 1 ${xg - r} ${yg + r * 0.6} Z" fill="${FLUIDE[sim.fluid].culoare}" stroke="${shade(FLUIDE[sim.fluid].culoare, 0.6)}" stroke-width=".5"/>`;
      sl += `<path d="M${xg - 8} ${yg - 6} Q ${xg} ${yg + 2} ${xg + 8} ${yg - 6}" fill="none" stroke="${FLUIDE[sim.fluid].culoare}" stroke-width="2" opacity=".7"/>`;
    }
    SV.picaturi.forEach(d => { d.v += 900 * dt; d.y += d.v * dt; });
    SV.picaturi = SV.picaturi.filter(d => d.y < 336);
    SV.picaturi.forEach(d => sl += `<ellipse cx="${xg}" cy="${d.y}" rx="2.2" ry="3.4" fill="${FLUIDE[sim.fluid].culoare}" stroke="${shade(FLUIDE[sim.fluid].culoare, 0.6)}" stroke-width=".4"/>`);
  }
  E.scurgere.innerHTML = sl;
  E.balta.setAttribute("rx", leak || sim.Vleak > 0 ? clamp(4 + Math.sqrt(sim.Vleak) * 140, 0, 60) : 0);
  E.balta.setAttribute("fill", shade(FLUIDE[sim.fluid].culoare, 0.85));

  // furtunul se umflă cu presiunea (exagerat vizual)
  E.furtun.style.display = sim.defect === "furtun" ? "" : "none";
  E.portFurtun.style.display = sim.defect === "furtun" ? "" : "none";
  if (sim.defect === "furtun") { const w = 12 + 5 * Math.min(1, p / 100); E.furtunBaza.setAttribute("stroke-width", w + 1); E.furtunTesut.setAttribute("stroke-width", w - 1); }

  // ecranul coboară / urcă
  const tinta = document.getElementById("ck-ecran").checked ? 1 : 0;
  A.ecran += (tinta - A.ecran) * Math.min(1, dt * 5);
  const ease = A.ecran * A.ecran * (3 - 2 * A.ecran);
  E.ecran.setAttribute("transform", `translate(0,${-250 * (1 - ease)})`);
  E.ecran.setAttribute("opacity", 0.15 + 0.85 * ease);
  E.ecran.style.display = A.ecran < 0.01 ? "none" : "";

  // etichete
  const arataE = document.getElementById("ck-etichete")?.checked !== false;
  E.etichete.style.display = arataE && !A.seringa ? "" : "none";
  E.cursa.style.display = arataE ? "" : "none";
  const c = cfg();
  E.etLichid.textContent = arataE ? FLUIDE[sim.fluid].nume.replace(" (de determinat)", "") : "";
  E.etLichid2.textContent = arataE ? `V₀ = ${fmt(sim.V0, 1)} cm³` + (p > 0.5 ? ` · ΔV/V₀ = ${fmt(p * 1e5 / (c.K * 1e9) * 100, 3)} %` : "") : "";
  E.etCil.textContent = `cilindru de oțel D = ${fmt(sim.D, 0)} mm, e = ${fmt(sim.e, 1)} mm`;
  E.etPiston.textContent = `piston Ø${String(+sim.d.toFixed(2)).replace(".", ",")} mm · pas ${String(+sim.s.toFixed(2)).replace(".", ",")} mm`;
  E.cursa.textContent = `cursa: ${fmt(sim.n * sim.s, 2)} mm`;
}

function animaAerisire() { SV.anim.aerisire = performance.now(); }
function animaSeringa() { SV.anim.seringa = performance.now(); }

/* ======================================================================= SISTEMUL DE FRÂNARE (fila Aplicații)
   Pedală suspendată cu pivot, furcă (clevis) și tijă de împingere rigidă; arc de revenire; contactor de stop;
   servofrână opțională; pompă centrală tandem (pistoane primar și secundar, arcuri, orificii de compensare);
   conductă cu punct înalt în care se adună aerul; etrier flotant pe disc ventilat (vedere frontală). */
const FRANA = { F: 0, Ft: 0, auto: null, th: 0, om: 6, el: null };
const PG = { P0: [168, 46], C0: [-4, 60], S0: [-3, 28], pad: [-40, 236], Ax: 120, Qx0: 282, kv: 0.75 };
function rotPt(pt, phi) { const c = Math.cos(phi), s = Math.sin(phi); return [PG.P0[0] + pt[0] * c + pt[1] * s, PG.P0[1] - pt[0] * s + pt[1] * c]; } // rotire în sens trigonometric (pedala spre perete)
function phiPentruCursa(sPx) {
  const Lr = Math.hypot(PG.Qx0 - rotPt(PG.C0, 0)[0], PG.Ax - rotPt(PG.C0, 0)[1]);
  const Q = [PG.Qx0 + sPx, PG.Ax];
  let a = 0, b = 1.0;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, C = rotPt(PG.C0, m); if (Math.hypot(Q[0] - C[0], Q[1] - C[1]) > Lr) a = m; else b = m; }
  return (a + b) / 2;
}
function arcSpirala(x1, y1, x2, y2, n, amp) {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
  let d = `M${x1} ${y1} L${x1 + ux * 6} ${y1 + uy * 6}`;
  const L2 = L - 12;
  for (let i = 0; i <= n * 2; i++) { const t = 6 + L2 * i / (n * 2), sgn = i === 0 || i === n * 2 ? 0 : (i % 2 ? 1 : -1); d += ` L${x1 + ux * t + nx * amp * sgn} ${y1 + uy * t + ny * amp * sgn}`; }
  return d + ` L${x2} ${y2}`;
}
function construiestePedala() {
  const svg = document.getElementById("svg-frana");
  if (!svg) return;
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 760 360");
  const defs = mk("defs", {}, svg);
  grad(defs, "gOtel", STOP.otel); grad(defs, "gOtelR", STOP.otel, { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "fCrom", STOP.crom); grad(defs, "fNegru", [[0, "#5b5f66"], [0.4, "#2a2d31"], [1, "#0f1012"]]);
  grad(defs, "fAlu", [[0, "#6f767e"], [0.18, "#c9ced3"], [0.35, "#f1f3f5"], [0.6, "#aab1b8"], [1, "#59606a"]]);
  grad(defs, "fLichid", [[0, "#efd27a", 0.9], [1, "#b88a1c", 0.95]]);
  grad(defs, "fRez", [[0, "#ffffff", 0.6], [0.5, "#f3f6f8", 0.35], [1, "#d6dde4", 0.55]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "fBula", [[0, "#ffffff", 1], [0.35, "#ffffff", 0.6], [0.85, "#cfdbe6", 0.35], [1, "#5d6b7a", 0.9]], { radial: true, fx: 0.36, fy: 0.3 });
  grad(defs, "fRosu", [[0, "#ff7a6b"], [0.45, "#c62828"], [1, "#6d0f0f"]], { x1: 0, y1: 0, x2: 0.4, y2: 1 });
  grad(defs, "fDisc", [[0, "#d7dbdf"], [0.55, "#a3a9b0"], [0.85, "#7c838b"], [1, "#5b6168"]], { radial: true, cx: 0.45, cy: 0.4, r: 0.6 });
  grad(defs, "fServo", [[0, "#3a3d42"], [0.3, "#6d7279"], [0.5, "#8d939a"], [0.75, "#4b4f55"], [1, "#25272b"]]);
  grad(defs, "fLampa", [[0, "#ffd0c8"], [0.4, "#ff3b2f"], [1, "#7a0d08"]], { radial: true, cx: 0.4, cy: 0.35, r: 0.7 });
  grad(defs, "gRama", [[0, "#ffffff"], [0.3, "#c8ced5"], [0.55, "#6f7882"], [0.8, "#d9dee3"], [1, "#59616a"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  filtre(defs);
  const mS = mk("marker", { id: "fSag", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 4, markerHeight: 4, orient: "auto" }, defs); mk("path", { d: "M0 0L10 5L0 10z", fill: "#d32f2f" }, mS);
  const F = FRANA.el = {};
  const Y = PG.Ax;

  /* podeaua și peretele despărțitor */
  const phiMax = phiPentruCursa(36 * PG.kv * 1.03);
  const padMax = rotPt([PG.pad[0] + 10, PG.pad[1] + 12], phiMax);
  F.podea = mk("path", { d: `M0 338 L${padMax[0] - 70} 338 L${padMax[0] + 6} ${padMax[1] + 4} L268 250 L268 360 L0 360 Z`, fill: "#3b3f45" }, svg);
  mk("path", { d: `M0 338 L${padMax[0] - 70} 338 L${padMax[0] + 6} ${padMax[1] + 4} L268 250`, fill: "none", stroke: "#5e646c", "stroke-width": 3 }, svg);
  const tP = mk("text", { x: 12, y: 354, "font-size": 10, fill: "#c9ced4" }, svg); tP.textContent = "podea (covor)";
  mk("rect", { x: 256, y: 6, width: 12, height: 300, fill: "#2d2f33" }, svg); // izolație fonică
  for (let y = 10; y < 300; y += 7) mk("line", { x1: 257, y1: y, x2: 267, y2: y + 4, stroke: "#45484e", "stroke-width": 1 }, svg);
  mk("rect", { x: 268, y: 6, width: 10, height: 300, fill: "url(#gOtel)" }, svg);
  const tw = mk("text", { x: 273, y: 322, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, svg); tw.textContent = "perete";

  /* consola pedalierului */
  mk("path", { d: "M256 14 L132 14 L126 30 L148 70 L256 150 Z", fill: "url(#gOtelR)", stroke: "#4b5259", "stroke-width": 1 }, svg);
  mk("path", { d: "M256 14 L132 14 L126 30 L148 70 L256 150", fill: "none", stroke: "#fff", "stroke-width": 0.8, opacity: 0.5 }, svg);
  [[150, 24], [240, 24], [240, 132]].forEach(([x, y]) => surub(svg, x, y, 4));
  // lampa de stop (indicator) + contactorul
  mk("rect", { x: 20, y: 14, width: 92, height: 44, rx: 8, fill: "#1d1f23" }, svg);
  F.lampa = mk("circle", { cx: 40, cy: 36, r: 11, fill: "#4a1512" }, svg);
  F.lampaHalo = mk("circle", { cx: 40, cy: 36, r: 18, fill: "#ff3b2f", opacity: 0, filter: "url(#fBlur2)" }, svg);
  const tl = mk("text", { x: 58, y: 40, "font-size": 11, fill: "#d9dde2", "font-weight": 700 }, svg); tl.textContent = "STOP";
  mk("rect", { x: 112, y: 88, width: 26, height: 18, rx: 3, fill: "url(#fNegru)" }, svg);
  mk("path", { d: "M112 97 C 96 97, 92 70, 72 58", fill: "none", stroke: "#26292e", "stroke-width": 2.2 }, svg);
  F.plonjor = mk("rect", { x: 138, y: 94, width: 20, height: 6, rx: 2, fill: "url(#gOtel)" }, svg);
  const tc = mk("text", { x: 108, y: 120, "font-size": 9.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); tc.textContent = "contactor stop";

  /* arcul de revenire (dinamic) */
  F.arcRev = mk("path", { fill: "none", stroke: "#6b737c", "stroke-width": 2 }, svg);

  /* pedala (rotită dinamic în jurul pivotului) */
  F.pedala = mk("g", {}, svg);
  const [px, py] = PG.P0;
  mk("path", { d: `M${px - 6} ${py} C ${px - 3} ${py + 80}, ${px - 8} ${py + 160}, ${px - 40} ${py + 226}`, fill: "none", stroke: "#15171a", "stroke-width": 12, "stroke-linecap": "round" }, F.pedala);
  mk("path", { d: `M${px - 8} ${py + 4} C ${px - 5} ${py + 80}, ${px - 10} ${py + 160}, ${px - 42} ${py + 224}`, fill: "none", stroke: "#6b7078", "stroke-width": 2, opacity: 0.7 }, F.pedala);
  mk("rect", { x: px - 68, y: py + 228, width: 56, height: 17, rx: 6, fill: "url(#fNegru)", transform: `rotate(-24 ${px - 40} ${py + 236})` }, F.pedala);
  for (let i = 0; i < 5; i++) mk("line", { x1: px - 63 + i * 10, y1: py + 230, x2: px - 63 + i * 10, y2: py + 243, stroke: "#5a5f66", "stroke-width": 1.6, transform: `rotate(-24 ${px - 40} ${py + 236})` }, F.pedala);
  F.forta = mk("g", {}, F.pedala);
  // furca (clevis) pe pedală
  const C0w = rotPt(PG.C0, 0);
  mk("rect", { x: C0w[0] - 9, y: C0w[1] - 7, width: 18, height: 14, rx: 3, fill: "url(#gOtelR)" }, F.pedala);
  mk("circle", { cx: px, cy: py, r: 9, fill: "url(#gOtelR)", stroke: "#2f3439", "stroke-width": 1 }, svg); // pivot
  mk("circle", { cx: px, cy: py, r: 3, fill: "#2f3439" }, svg);
  F.tija = mk("line", { stroke: "url(#fCrom)", "stroke-width": 7, "stroke-linecap": "round" }, svg);
  F.bolt = mk("circle", { r: 4, fill: "#d9dde2", stroke: "#4b5259" }, svg);

  /* servofrâna / distanțierul */
  F.servo = mk("g", {}, svg);
  mk("rect", { x: 278, y: Y - 74, width: 74, height: 148, rx: 30, fill: "url(#fServo)" }, F.servo);
  mk("rect", { x: 312, y: Y - 76, width: 6, height: 152, rx: 3, fill: "#9aa1a8" }, F.servo);
  mk("path", { d: `M300 ${Y - 74} q -6 -18 12 -22 l 24 0`, fill: "none", stroke: "#1b1d20", "stroke-width": 7 }, F.servo);
  const ts = mk("text", { x: 315, y: Y + 92, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, F.servo); ts.textContent = "servofrână (vid)";
  F.distantier = mk("g", {}, svg);
  mk("rect", { x: 278, y: Y - 16, width: 74, height: 32, rx: 3, fill: "url(#gOtel)" }, F.distantier);
  mk("rect", { x: 346, y: Y - 34, width: 8, height: 68, rx: 2, fill: "url(#gOtel)" }, F.distantier);

  /* pompa centrală tandem (secțiune) */
  const M = F.M = { x: 352, x2: 590, r: 18, p1: 362, p1L: 34, c1: 64, p2L: 30, c2: 78 };
  M.p2 = M.p1 + M.p1L + M.c1; // poziția pistonului secundar
  mk("rect", { x: M.x, y: Y - 34, width: 10, height: 68, rx: 2, fill: "url(#fAlu)" }, svg); // flanșa
  mk("rect", { x: M.x + 10, y: Y - M.r - 9, width: M.x2 - M.x - 10, height: 2 * M.r + 18, rx: 8, fill: "url(#fAlu)" }, svg);
  mk("rect", { x: M.x + 12, y: Y - M.r, width: M.x2 - M.x - 22, height: 2 * M.r, fill: "#2f3439" }, svg);
  F.cam1 = mk("rect", { y: Y - M.r, height: 2 * M.r, fill: "url(#fLichid)" }, svg);
  F.cam2 = mk("rect", { y: Y - M.r, height: 2 * M.r, fill: "url(#fLichid)" }, svg);
  F.arc1 = mk("path", { fill: "none", stroke: "#7d848c", "stroke-width": 1.8 }, svg);
  F.arc2 = mk("path", { fill: "none", stroke: "#7d848c", "stroke-width": 1.8 }, svg);
  const piston = (L) => { const gp = mk("g", {}, svg); mk("rect", { x: 0, y: Y - M.r + 1, width: L, height: 2 * M.r - 2, rx: 2, fill: "url(#fCrom)" }, gp); mk("rect", { x: L - 6, y: Y - M.r, width: 6, height: 2 * M.r, rx: 2, fill: "#1f5b4d" }, gp); mk("rect", { x: 2, y: Y - M.r, width: 5, height: 2 * M.r, rx: 2, fill: "#1f5b4d" }, gp); return gp; };
  F.pist1 = piston(M.p1L); F.pist2 = piston(M.p2L);
  // orificiile de compensare + rezervorul
  M.oc1 = M.p1 + M.p1L + 4; M.oc2 = M.p2 + M.p2L + 4;
  [M.oc1, M.oc2].forEach(x => { mk("rect", { x: x - 2, y: Y - M.r - 9, width: 4, height: 10, fill: "url(#fLichid)" }, svg); mk("rect", { x: x - 6, y: Y - M.r - 22, width: 12, height: 14, fill: "url(#fAlu)" }, svg); mk("rect", { x: x - 3, y: Y - M.r - 22, width: 6, height: 14, fill: "url(#fLichid)" }, svg); });
  const rz = { x: M.oc1 - 24, x2: M.oc2 + 28, y: Y - M.r - 70, h: 50 };
  mk("rect", { x: rz.x, y: rz.y, width: rz.x2 - rz.x, height: rz.h, rx: 8, fill: "url(#fRez)", stroke: "#9aa7b4", "stroke-width": 1 }, svg);
  F.nivel = mk("rect", { x: rz.x + 2, y: rz.y + 16, width: rz.x2 - rz.x - 4, height: rz.h - 18, rx: 6, fill: "url(#fLichid)", opacity: 0.85 }, svg);
  mk("line", { x1: (rz.x + rz.x2) / 2, y1: rz.y + 4, x2: (rz.x + rz.x2) / 2, y2: rz.y + rz.h, stroke: "#9aa7b4", "stroke-width": 1 }, svg);
  mk("rect", { x: (rz.x + rz.x2) / 2 - 20, y: rz.y - 12, width: 40, height: 13, rx: 3, fill: "url(#fNegru)" }, svg);
  mk("path", { d: `M${(rz.x + rz.x2) / 2 + 20} ${rz.y - 6} C ${rz.x2 + 30} ${rz.y - 10}, ${rz.x2 + 40} ${rz.y - 40}, ${rz.x2 + 70} ${rz.y - 40}`, fill: "none", stroke: "#26292e", "stroke-width": 2 }, svg);
  [["MAX", 12], ["MIN", 34]].forEach(([t, dy]) => { mk("line", { x1: rz.x2 - 14, y1: rz.y + dy, x2: rz.x2 - 4, y2: rz.y + dy, stroke: "#333", "stroke-width": 1 }, svg); const e = mk("text", { x: rz.x2 + 4, y: rz.y + dy + 3, "font-size": 8, fill: "var(--text-sec)" }, svg); e.textContent = t; });
  const tm = mk("text", { x: M.x + 12, y: Y + 82, "font-size": 10, fill: "var(--text-sec)" }, svg); tm.textContent = "pompă centrală tandem Ø22,22";

  /* conductele */
  M.out1 = M.p1 + M.p1L + M.c1 - 14; M.out2 = M.x2 - 18;
  const D = { x: 688, y: 270, R: 64 }; F.D = D;
  const xe = D.x - 6, ye = D.y - D.R - 18; // intrarea în etrier
  const lin1 = `M${M.out1} ${Y + M.r + 9} L${M.out1} ${Y + 54} Q${M.out1} ${Y + 62} ${M.out1 + 8} ${Y + 62} L${M.out1 + 150} ${Y + 62} Q${M.out1 + 158} ${Y + 62} ${M.out1 + 158} ${Y + 54} L${M.out1 + 158} ${Y - 2} Q${M.out1 + 158} ${Y - 10} ${M.out1 + 166} ${Y - 10} L${xe - 8} ${Y - 10} Q${xe} ${Y - 10} ${xe} ${Y - 2} L${xe} ${ye}`;
  F.hp = { x1: M.out1 + 166, x2: xe - 8, y: Y - 10 };
  const lin2 = `M${M.out2} ${Y - M.r - 9} L${M.out2} ${Y - M.r - 30} Q${M.out2} ${Y - M.r - 38} ${M.out2 + 8} ${Y - M.r - 38} L756 ${Y - M.r - 38}`;
  [lin1, lin2].forEach(d => {
    mk("path", { d, fill: "none", stroke: "#2b2f35", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    mk("path", { d, fill: "none", stroke: "#e2bd57", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    mk("path", { d, fill: "none", stroke: "#fff", "stroke-width": 1, opacity: 0.4, transform: "translate(0,-1.5)" }, svg);
  });
  [M.out1, M.out2].forEach((x, i) => mk("rect", { x: x - 7, y: i ? Y - M.r - 16 : Y + M.r + 4, width: 14, height: 10, rx: 2, fill: "url(#gOtelR)" }, svg));
  const t2 = mk("text", { x: 754, y: Y - M.r - 46, "font-size": 9.5, "text-anchor": "end", fill: "var(--text-sec)" }, svg); t2.textContent = "→ circuitul 2 (diagonal)";
  F.bula = mk("ellipse", { cy: F.hp.y, ry: 2.4, fill: "url(#fBula)", stroke: "rgba(70,80,95,.6)", "stroke-width": 0.5 }, svg);
  F.etBula = mk("text", { y: F.hp.y - 9, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, svg);
  // manometru mic pe conductă
  const gx = M.out1 + 118, gy = Y + 62, gc = gy + 30;
  mk("rect", { x: gx - 3, y: gy + 4, width: 6, height: 10, fill: "url(#gOtelR)" }, svg);
  mk("circle", { cx: gx, cy: gc, r: 17, fill: "url(#gRama)" }, svg);
  mk("circle", { cx: gx, cy: gc, r: 14, fill: "#fbfbf8" }, svg);
  for (let p = 0; p <= 160; p += 20) { const a = (-135 + 270 * p / 160) * Math.PI / 180; mk("line", { x1: gx + 13 * Math.sin(a), y1: gc - 13 * Math.cos(a), x2: gx + 10 * Math.sin(a), y2: gc - 10 * Math.cos(a), stroke: "#222", "stroke-width": 0.8 }, svg); }
  F.acMic = mk("line", { x1: gx, y1: gc, x2: gx, y2: gc - 12, stroke: "#c62828", "stroke-width": 1.6, "stroke-linecap": "round" }, svg);
  mk("circle", { cx: gx, cy: gc, r: 2, fill: "#333" }, svg);
  F.acC = [gx, gc];

  /* discul ventilat (vedere frontală) + etrierul */
  F.disc = mk("g", {}, svg);
  mk("circle", { cx: D.x, cy: D.y, r: D.R, fill: "url(#fDisc)", stroke: "#4b5158", "stroke-width": 1 }, F.disc);
  mk("circle", { cx: D.x, cy: D.y, r: D.R - 22, fill: "none", stroke: "#8c939a", "stroke-width": 0.8 }, F.disc);
  for (let k = 0; k < 36; k++) { const a = k * Math.PI / 18, r = D.R - 11 + (k % 2) * 4; mk("circle", { cx: D.x + r * Math.cos(a), cy: D.y + r * Math.sin(a), r: 2.2, fill: "#3c4147" }, F.disc); }
  for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; mk("line", { x1: D.x + (D.R - 3) * Math.cos(a), y1: D.y + (D.R - 3) * Math.sin(a), x2: D.x + (D.R - 20) * Math.cos(a + 0.18), y2: D.y + (D.R - 20) * Math.sin(a + 0.18), stroke: "#7d848b", "stroke-width": 0.7, opacity: 0.7 }, F.disc); }
  mk("circle", { cx: D.x, cy: D.y, r: 36, fill: "#5d636a", stroke: "#3b4046", "stroke-width": 1.2 }, F.disc);
  for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5; surub(F.disc, D.x + 22 * Math.cos(a), D.y + 22 * Math.sin(a), 5); }
  mk("circle", { cx: D.x, cy: D.y, r: 9, fill: "#2f3439" }, F.disc);
  // plăcuța vizibilă sub etrier + etrierul flotant
  F.placuta = mk("path", { d: `M${D.x - 30} ${D.y - D.R + 4} A ${D.R - 4} ${D.R - 4} 0 0 1 ${D.x + 30} ${D.y - D.R + 4} L ${D.x + 28} ${D.y - D.R + 20} A ${D.R - 20} ${D.R - 20} 0 0 0 ${D.x - 28} ${D.y - D.R + 20} Z`, fill: "#3b3530", opacity: 0.0 }, svg);
  mk("path", { d: `M${D.x - 42} ${D.y - D.R - 22} L${D.x + 42} ${D.y - D.R - 22} Q${D.x + 52} ${D.y - D.R - 22} ${D.x + 50} ${D.y - D.R - 8} L${D.x + 40} ${D.y - D.R + 22} Q${D.x} ${D.y - D.R + 12} ${D.x - 40} ${D.y - D.R + 22} L${D.x - 50} ${D.y - D.R - 8} Q${D.x - 52} ${D.y - D.R - 22} ${D.x - 42} ${D.y - D.R - 22} Z`, fill: "url(#fRosu)", stroke: "#4a0a0a", "stroke-width": 1 }, svg);
  const tb = mk("text", { x: D.x + 6, y: D.y - D.R - 4, "font-size": 10, "text-anchor": "middle", fill: "#fff", "font-weight": 700 }, svg); tb.textContent = "Ø54";
  surub(svg, D.x - 38, D.y - D.R - 12, 3.5); surub(svg, D.x + 38, D.y - D.R - 12, 3.5);
  F.etDisc = mk("text", { x: D.x, y: D.y + D.R + 14, "font-size": 10, "text-anchor": "middle", fill: "var(--text-sec)" }, svg);

  /* valorile afișate */
  F.tP = mk("text", { x: 292, y: Y + 128, "font-size": 13, fill: "var(--text)", "font-weight": 700 }, svg);
  F.tS = mk("text", { x: 292, y: Y + 146, "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  F.tS2 = mk("text", { x: 292, y: Y + 162, "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  F.tS3 = mk("text", { x: 292, y: Y + 178, "font-size": 11.5, fill: "var(--text-sec)" }, svg);
  F.tS4 = mk("text", { x: 292, y: Y + 194, "font-size": 10.5, fill: "var(--text-sec)" }, svg);
  prefixeazaId(svg, "fr-");
}

function actualizeazaPedala(dt) {
  const F = FRANA.el; if (!F) return;
  const v = valPedala(); if (!v) return;
  const cuAer = document.getElementById("ck-aer-frana")?.checked;
  const servo = document.getElementById("ck-servo")?.checked;
  const eta = 0.92, kS = servo ? 4.9 : 1, Am = Math.PI * v.dm * v.dm / 4;
  const pDinF = Fn => Fn * v.ip * eta * kS / Am * 10; // bar
  if (FRANA.auto !== null) {
    FRANA.auto += dt;
    const T = FRANA.auto, Fm = v.pt / 10 * Am / (v.ip * eta * kS);
    FRANA.Ft = T < 1.2 ? Fm * T / 1.2 : T < 2.6 ? Fm : T < 3.4 ? Fm * (1 - (T - 2.6) / 0.8) : 0;
    if (T > 3.6) FRANA.auto = null;
    const sl = document.getElementById("sl-frana"); if (sl) sl.value = FRANA.Ft;
  }
  FRANA.F += (FRANA.Ft - FRANA.F) * Math.min(1, dt * 9);
  let p = Math.max(0, pDinF(FRANA.F));
  let laPodea = false;
  if (cursaPompa(v, p, !cuAer) > v.smax) { // pedala la podea – presiunea nu mai crește
    let a = 0, b = p; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (cursaPompa(v, m, !cuAer) > v.smax) b = m; else a = m; }
    p = a; laPodea = true;
  }
  const sm = cursaPompa(v, p, !cuAer), sp = sm * v.ip;
  const sPx = sm * PG.kv;
  const phi = phiPentruCursa(sPx);
  const deg = -phi * 180 / Math.PI;
  F.pedala.setAttribute("transform", `rotate(${deg} ${PG.P0[0]} ${PG.P0[1]})`);
  const C = rotPt(PG.C0, phi);
  F.tija.setAttribute("x1", C[0]); F.tija.setAttribute("y1", C[1]); F.tija.setAttribute("x2", PG.Qx0 + sPx); F.tija.setAttribute("y2", PG.Ax);
  F.bolt.setAttribute("cx", C[0]); F.bolt.setAttribute("cy", C[1]);
  // arcul de revenire
  const S = rotPt(PG.S0, phi);
  F.arcRev.setAttribute("d", arcSpirala(236, 32, S[0], S[1], 9, 4));
  // contactorul de stop: plonjorul urmărește pedala 4 px, apoi se desprinde
  const ext = Math.min(4, sPx * 3);
  F.plonjor.setAttribute("width", 20 + ext);
  const stop = sp > 2;
  F.lampa.setAttribute("fill", stop ? "url(#fr-fLampa)" : "#4a1512");
  F.lampaHalo.setAttribute("opacity", stop ? 0.55 : 0);
  F.servo.style.display = servo ? "" : "none"; F.distantier.style.display = servo ? "none" : "";
  // pompa tandem: pistonul secundar se deplasează cu ~ jumătate din cursă (două circuite egale)
  const M = F.M, s1 = sPx, s2 = sm > (v.sm0 || 0) ? (sPx - (v.sm0 || 0) * PG.kv) * 0.5 : 0;
  F.pist1.setAttribute("transform", `translate(${M.p1 + s1},0)`);
  F.pist2.setAttribute("transform", `translate(${M.p2 + s2},0)`);
  const c1a = M.p1 + M.p1L + s1, c1b = M.p2 + s2, c2a = M.p2 + M.p2L + s2, c2b = M.x2 - 10;
  F.cam1.setAttribute("x", c1a); F.cam1.setAttribute("width", Math.max(0, c1b - c1a));
  F.cam2.setAttribute("x", c2a); F.cam2.setAttribute("width", Math.max(0, c2b - c2a));
  F.arc1.setAttribute("d", arcSpirala(c1a, PG.Ax, c1b, PG.Ax, 6, 11));
  F.arc2.setAttribute("d", arcSpirala(c2a, PG.Ax, c2b, PG.Ax, 7, 11));
  const f = 1 + Math.min(1, p / 100) * 0.0; F.cam1.setAttribute("opacity", 0.75 + 0.25 * Math.min(1, p / 60) * f); F.cam2.setAttribute("opacity", 0.75 + 0.25 * Math.min(1, p / 60));
  // bula de aer în punctul înalt (lungimea dopului de aer într-o conductă Ø4,75 mm)
  const Vb = cuAer ? v.Va * P_ATM / (P_ATM + p) : 0;
  const L = Vb > 0 ? clamp(Vb * 1000 / 17.7 * 0.8, 2.5, F.hp.x2 - F.hp.x1 - 4) : 0;
  const xc = (F.hp.x1 + F.hp.x2) / 2;
  F.bula.setAttribute("cx", xc); F.bula.setAttribute("rx", L / 2); F.bula.setAttribute("ry", L > 0 ? 2.4 : 0);
  F.etBula.setAttribute("x", xc); F.etBula.textContent = cuAer ? `aer: ${fmt(Vb, 3)} cm³` : "fără aer";
  // manometrul mic
  const a = (-135 + 270 * Math.min(165, p) / 160) * Math.PI / 180;
  F.acMic.setAttribute("x2", F.acC[0] + 11 * Math.sin(a)); F.acMic.setAttribute("y2", F.acC[1] - 11 * Math.cos(a));
  // discul se rotește și încetinește când plăcuțele strâng
  const omT = 6 * (1 - clamp((p - 2) / 25, 0, 1));
  FRANA.om += (omT - FRANA.om) * Math.min(1, dt * (omT < FRANA.om ? 2.5 : 0.6));
  FRANA.th += FRANA.om * dt;
  F.disc.setAttribute("transform", `rotate(${FRANA.th * 180 / Math.PI} ${F.D.x} ${F.D.y})`);
  F.placuta.setAttribute("opacity", p > 2 ? 0.75 : 0);
  F.etDisc.textContent = p > 2 ? "plăcuțele strâng discul" : "disc liber (jocul plăcuțelor)";
  // forța pe pedală (săgeată)
  const Fr = FRANA.F;
  F.forta.innerHTML = Fr > 5 ? `<line x1="${PG.P0[0] - 112 - Math.min(40, Fr / 15)}" y1="${PG.P0[1] + 246}" x2="${PG.P0[0] - 72}" y2="${PG.P0[1] + 238}" stroke="#d32f2f" stroke-width="3.4" marker-end="url(#fr-fSag)"/>` : "";
  F.tP.textContent = `F = ${fmt(Fr, 0)} N → p = ${fmt(p, 1)} bar`;
  F.tS.textContent = `pompa: ${fmt(sm, 1)} / ${fmt(v.smax, 0)} mm (moartă ${fmt(v.sm0 || 0, 1)} mm)`;
  F.tS2.textContent = `pedala: ${fmt(sp, 0)} mm · unghi ${fmt(phi * 180 / Math.PI, 1)}°`;
  F.tS3.textContent = laPodea ? "PEDALA LA PODEA – p nu mai crește!" : stop ? "contactor eliberat → stopuri aprinse" : "repaus · contactorul de stop apăsat";
  F.tS3.setAttribute("fill", laPodea ? "#d32f2f" : "var(--text-sec)");
  F.tS4.textContent = servo ? "cu servofrână (amplificare ×4,9, Lucrarea 3)" : "fără servofrână (randament 0,92)";
}


/* ------------------------------------------------------------------ graficul în timp real */
function curbaTeoretica(c, pmax, pas = 0.5) {
  const pts = [];
  for (let p = 0; p <= pmax + 1e-9; p += (p < 10 ? 0.1 : pas)) pts.push([volumAbsorbit(c, p), p]);
  return pts;
}

function deseneazaLive(pArg) {
  const cv = $("#cv-live");
  if (!cv || !cv.offsetParent) return;
  const p = pArg ?? sim.ultimP;
  const ar = Ar();
  const c0 = { ...cfg(), Vaer: 0, Cf: 0 };
  const cAct = cfg();
  const pMax = 110;
  const xMax = niceMax(Math.max(volumAbsorbit(c0, pMax) * 1.15, sim.n * ar * 1.1, sim.Vinj > 0 ? volumAbsorbit(cAct, pMax) * 1.05 : 0, 0.2));
  const serii = [{ tip: "linie", pts: curbaTeoretica(c0, pMax), culoare: 0, punctat: true }];
  if (aerTotal() > 0 || cAct.Cf) serii.push({ tip: "linie", pts: curbaTeoretica(cAct, pMax), culoare: 1, punctat: true });
  const logA = Cadru.D.log.filter(l => l.var === "a"), logB = Cadru.D.log.filter(l => l.var === "b");
  serii.push({ tip: "pct", pts: logA.filter(l => l.dir === "inc").map(l => [l.n * ar, l.p]), culoare: 0, r: 3.5 });
  serii.push({ tip: "pct", pts: logA.filter(l => l.dir === "desc").map(l => [l.n * ar, l.p]), culoare: 0, gol: true, r: 6 });
  serii.push({ tip: "pct", pts: logB.map(l => [l.n * ar, l.p]), culoare: 1, r: 3.5 });
  serii.push({ tip: "pct", pts: [[sim.n * ar, citire(p)]], culoare: 2, r: 6 });
  deseneazaGrafic(cv, { xmax: xMax, ymax: 120, xlab: "ΔV dislocat de piston [cm³]", ylab: "p [bar]", serii });
}



/* ------------------------------------------------------------------ aplicații la autovehicul */
const PED = [["dm", "d pompă centrală [mm]", 22.22], ["ip", "raportul pedalei i<sub>p</sub>", 4], ["Vc", "lichid sub presiune [cm³]", 40], ["Kl", "K lichid [GPa]", 1.7],
  ["nf", "număr de furtunuri", 4], ["Lf", "lungime furtun [m]", 0.35], ["ef", "expansiune furtun [cm³/m la 100 bar]", 0.5], ["Vj", "jocuri plăcuțe [cm³]", 1.2],
  ["Vet", "deformare etriere la 100 bar [cm³]", 0.8], ["Va", "aer rămas V<sub>a0</sub> [cm³]", 1.0], ["pt", "presiunea țintă [bar]", 80], ["smax", "cursa max. a pompei [mm]", 36], ["sm0", "cursa moartă a pompei [mm]", 1.5]];
const UNDA = [["K", "K [GPa]", 1.7], ["rho", "ρ [kg/m³]", 1050], ["L", "lungimea conductei [m]", 3], ["dv", "variația vitezei Δv [m/s]", 2]];
const CR = [["K0", "K₀ motorină [GPa]", 1.5], ["Kp", "K′ (creșterea cu presiunea)", 5], ["p", "presiunea în rampă [bar]", 2000], ["rho", "ρ₀ [kg/m³]", 830]];
function campuriCalc(cont, lista, fn) {
  cont.innerHTML = lista.map(([k, l, v]) => `<label class="camp">${l}<input type="number" step="any" data-k="${k}" value="${v}"></label>`).join("");
  $$("input", cont).forEach(i => i.addEventListener("input", fn));
}
const val = (cont) => Object.fromEntries($$("input", cont).map(i => [i.dataset.k, num(i.value)]));

function valPedala() { const c = $("#pedala-in"); return c && c.children.length ? val(c) : null; }
function volumePedala(v, p, faraAer) {
  const lich = v.Vc * p * 1e5 / (v.Kl * 1e9);
  const furt = v.nf * v.Lf * v.ef * p / 100;
  const joc = p > 0 ? v.Vj * Math.min(1, p / 2) : 0; // jocurile se preiau la presiuni mici
  const et = v.Vet * p / 100;
  const aer = faraAer ? 0 : volAer(v.Va, p);
  return { lich, furt, joc, et, aer, tot: lich + furt + joc + et + aer };
}
/* cursa pistonului pompei [mm]: cursa moartă (orificiul de compensare) + volumul dislocat / aria pompei */
function cursaPompa(v, p, faraAer) {
  const Am = Math.PI * v.dm * v.dm / 4;
  return (p > 0 ? (v.sm0 || 0) * Math.min(1, p / 0.3) : 0) + volumePedala(v, p, faraAer).tot * 1000 / Am;
}
function calcAuto() {
  const v = val($("#pedala-in"));
  const Am = Math.PI * v.dm * v.dm / 4;
  const cu = volumePedala(v, v.pt, false), fara = volumePedala(v, v.pt, true);
  const sm = cursaPompa(v, v.pt, false), smF = cursaPompa(v, v.pt, true);
  const pct = sm / v.smax * 100;
  const comp = [["lichid", cu.lich, "var(--serie-0)"], ["furtunuri", cu.furt, "var(--serie-3)"], ["jocuri plăcuțe", cu.joc, "var(--serie-2)"], ["etriere", cu.et, "var(--text-sec)"], ["aer", cu.aer, "var(--serie-1)"]];
  $("#pedala-rez").innerHTML = `
    <div class="rezultat"><span>Aria pompei centrale A<sub>m</sub></span><b>${fmt(Am, 1)} mm²</b></div>
    <div class="rezultat"><span>Volum necesar la ${fmt(v.pt, 0)} bar – fără aer</span><b>${fmt(fara.tot, 2)} cm³</b></div>
    <div class="rezultat"><span>Volum necesar la ${fmt(v.pt, 0)} bar – cu aer</span><b>${fmt(cu.tot, 2)} cm³</b></div>
    <div class="rezultat"><span>Cursa pistonului pompei (fără / cu aer)</span><b>${fmt(smF, 1)} / ${fmt(sm, 1)} mm</b></div>
    <div class="rezultat"><span>Cursa pedalei (fără / cu aer)</span><b>${fmt(smF * v.ip, 0)} / ${fmt(sm * v.ip, 0)} mm</b></div>
    <div class="rezultat"><span>Din cursa disponibilă a pompei</span><b>${fmt(pct, 0)} %</b></div>
    <div class="verdict ${pct > 70 ? "atentie" : "ok"}">${pct > 100 ? "Pedala ajunge la podea înainte de presiunea țintă – frâna nu mai realizează decelerația cerută." : pct > 70 ? "Pedală „moale”: rezerva de cursă este mică; circuitul trebuie aerisit." : "Rezervă de cursă suficientă."}</div>`;
  $("#pedala-bare").innerHTML = `<p class="nota" style="margin-top:.8rem">Repartiția volumului absorbit la ${fmt(v.pt, 0)} bar:</p><div class="bara-stiva">${comp.map(([n, x, c]) => `<div title="${n}: ${fmt(x, 2)} cm³" style="width:${x / cu.tot * 100}%;background:${c}"></div>`).join("")}</div>
    <div class="legenda">${comp.map(([n, x, c]) => `<span><i class="pct" style="background:${c}"></i>${n} ${fmt(x, 2)} cm³</span>`).join("")}</div>`;
  const ptsF = [], ptsC = [];
  for (let p = 0; p <= Math.max(120, v.pt); p += p < 10 ? 0.25 : 2) { ptsF.push([cursaPompa(v, p, true) * v.ip, p]); ptsC.push([cursaPompa(v, p, false) * v.ip, p]); }
  const xmax = niceMax(Math.max(v.smax * v.ip, ptsC[ptsC.length - 1][0]) * 1.05);
  const cv = $("#cv-pedala");
  if (cv.offsetParent) deseneazaGrafic(cv, { xmax, ymax: Math.ceil(Math.max(120, v.pt) * 1.05 / 20) * 20, xlab: "cursa pedalei [mm]", ylab: "p [bar]", serii: [
    { tip: "linie", pts: ptsF, culoare: 0 }, { tip: "linie", pts: ptsC, culoare: 1 },
    { tip: "linie", pts: [[v.smax * v.ip, 0], [v.smax * v.ip, 1e4]], culoare: css("--text-sec"), punctat: true, gros: 1.5 }] });
  $("#leg-pedala").innerHTML = `<span><i style="background:var(--serie-0)"></i>fără aer</span><span><i style="background:var(--serie-1)"></i>cu ${fmt(v.Va, 2)} cm³ de aer</span><span><i style="background:var(--text-sec)"></i>capătul cursei pompei</span>`;

  const u = val($("#unda-in"));
  const a = celeritate(u.K, u.rho);
  $("#unda-rez").innerHTML = `<div class="rezultat"><span>Celeritatea a = √(K/ρ)</span><b>${fmt(a, 0)} m/s</b></div>
    <div class="rezultat"><span>Timpul de parcurs t = L/a</span><b>${fmt(u.L / a * 1000, 2)} ms</b></div>
    <div class="rezultat"><span>Perioada oscilației în conductă 4L/a</span><b>${fmt(4 * u.L / a * 1000, 2)} ms</b></div>
    <div class="rezultat"><span>Suprapresiunea Joukowski Δp = ρ·a·Δv</span><b>${fmt(u.rho * a * u.dv / 1e5, 1)} bar</b></div>
    <p class="nota">Cu K = 1,5 GPa și ρ = 830 kg/m³ (motorină) obțineți ≈ 1340 m/s, valoarea din îndrumar.</p>`;

  const c = val($("#cr-in"));
  const cLin = c.p * 1e5 / (c.K0 * 1e9) * 100, cVar = comprimareRelativa(c.K0, c.Kp, c.p) * 100;
  const Kp = c.K0 + c.Kp * c.p * 1e5 / 1e9, rhoP = c.rho / (1 - cVar / 100);
  // lucrul de comprimare pe litru (integrare numerică ∫p dV)
  let W = 0, N = 400; for (let i = 0; i < N; i++) { const p1 = c.p * i / N, p2 = c.p * (i + 1) / N; W += (p1 + p2) / 2 * 1e5 * (comprimareRelativa(c.K0, c.Kp, p2) - comprimareRelativa(c.K0, c.Kp, p1)) * 1e-3; }
  $("#cr-rez").innerHTML = `<div class="rezultat"><span>Micșorarea volumului – liniar p/K₀</span><b>${fmt(cLin, 1)} %</b></div>
    <div class="rezultat"><span>Micșorarea volumului – cu K = K₀ + K′·p</span><b>${fmt(cVar, 1)} %</b></div>
    <div class="rezultat"><span>Modulul la presiunea din rampă</span><b>${fmt(Kp, 2)} GPa</b></div>
    <div class="rezultat"><span>Densitatea la presiunea din rampă</span><b>${fmt(rhoP, 0)} kg/m³</b></div>
    <div class="rezultat"><span>Celeritatea la presiunea din rampă</span><b>${fmt(Math.sqrt(Kp * 1e9 / rhoP), 0)} m/s</b></div>
    <div class="rezultat"><span>Lucrul de comprimare pe litru de motorină</span><b>${fmt(W, 0)} J/L</b></div>
    <p class="nota">Lucrul de comprimare nu se recuperează integral la injecție – o parte din puterea absorbită de pompa de înaltă presiune.</p>`;
}



/* ------------------------------------------------------------------ conținut didactic */
/* ---------------- TEORIE ---------------- */
const HTML_TEORIE = `
<h2>Lucrarea 2. Compresibilitatea lichidului de frână și efectul aerului din circuit</h2>
<p class="nota">Durata: 2 ore · Locul: laboratorul de mecanica fluidelor · Echipe de 3–4 studenți</p>
<figure><img src="img/stand.jpg" alt="Piezometru cu piston filetat, manometru, roată de manevră și ecran de protecție; detaliu cu lichid fără aer și cu bulă de aer" loading="lazy"></figure>
<ol class="cuprins">
  <li><a href="#t-nssm">Norme specifice NSSM</a></li>
  <li><a href="#t-scop">2.1. Scopul lucrării</a></li>
  <li><a href="#t-teorie">2.2. Noțiuni teoretice</a></li>
  <li><a href="#t-aparatura">2.3. Aparatură și echipamente</a></li>
  <li><a href="#t-mod">2.4. Modul de lucru</a></li>
  <li><a href="#t-prel">2.6. Prelucrarea datelor</a></li>
  <li><a href="#t-interp">2.7. Interpretarea rezultatelor</a></li>
  <li><a href="#t-relev">2.8. Relevanță practică</a></li>
</ol>

<div class="nssm" id="t-nssm">
<h3>Norme specifice de securitate și sănătate în muncă (NSSM)</h3>
<ul>
<li>Presiunea din piezometru nu depășește <b>100 bar</b>; manometrul are domeniul de 160 bar, iar încercarea se face cu ecranul de protecție coborât și cu ochelari de protecție.</li>
<li>Racordurile se strâng și se desfac numai după descărcarea presiunii (pistonul retras până la 0 bar pe manometru).</li>
<li>Lichidul de frână este toxic la înghițire, iritant pentru ochi și distruge vopseaua: se lucrează cu mănuși de nitril și ochelari; în caz de contact cu ochii se clătește 15 minute cu apă.</li>
<li>Lichidul de frână este higroscopic: recipientul se închide imediat după folosire; lichidul folosit nu se reintroduce în recipientul original și se colectează ca deșeu periculos.</li>
<li>Roata de manevră se rotește lent, fără șocuri; dacă presiunea crește brusc sau apare o scurgere, se oprește încercarea și se anunță cadrul didactic.</li>
</ul>
</div>

<h3 id="t-scop">2.1. Scopul lucrării</h3>
<p>Determinarea modulului de elasticitate (a compresibilității) unui lichid de frână și evidențierea efectului pe care îl are o cantitate mică de aer în circuit asupra volumului absorbit – adică asupra cursei pedalei de frână. Se calculează și viteza de propagare a undelor de presiune, importantă pentru circuitele ABS și pentru rampa common-rail.</p>

<h3 id="t-teorie">2.2. Noțiuni teoretice</h3>
<p>Lichidele sunt puțin compresibile, dar nu incompresibile. La creșterea presiunii cu Δp, un volum V<sub>0</sub> de lichid se micșorează cu ΔV. Compresibilitatea β și modulul de elasticitate K (inversul ei) se definesc prin:</p>
${EC(`β = −${FR("1", "V<sub>0</sub>")}·${FR("ΔV", "Δp")} &nbsp;&nbsp;[1/Pa]`, "2.1")}
${EC(`K = ${FR("1", "β")} = −V<sub>0</sub>·${FR("Δp", "ΔV")} &nbsp;&nbsp;[Pa]`, "2.2")}
<p>Valori orientative la 20 °C: apă 2,2 GPa, ulei mineral 1,4…1,8 GPa, lichid de frână pe bază de glicoli (DOT 3, DOT 4, DOT 5.1) 1,5…2,0 GPa, motorină ≈ 1,5 GPa (K crește cu presiunea). Aerul, la presiunea atmosferică, are K = p ≈ 0,1 MPa în compresie izotermă – de circa 15 000 de ori mai compresibil decât lichidul.</p>
<p>Piezometrul (Fig. 2.1) este un cilindru de oțel cu pereți groși, umplut cu lichid, în care un piston filetat este împins cu roata de manevră. La n rotații, cu pasul s și diametrul pistonului d, volumul dislocat este:</p>
<figure><img src="img/fig2_1.jpg" alt="Fig. 2.1 Piezometrul cu piston filetat" loading="lazy"><figcaption>Fig. 2.1. Piezometrul cu piston filetat pentru determinarea compresibilității</figcaption></figure>
${EC(`ΔV = n·${FR("π·d<sup>2</sup>", "4")}·s`, "2.3")}
<p>Cilindrul se dilată și el sub presiune, astfel că se măsoară un modul aparent K<sub>m</sub> mai mic decât modulul real. Pentru un cilindru cu diametrul interior D, grosimea peretelui e și modulul de elasticitate al materialului E (oțel: 210 GPa), corecția este:</p>
${EC(`${FR("1", "K")} = ${FR("1", "K<sub>m</sub>")} − ${FR("D", "E·e")}`, "2.4")}
<p>Aceeași relație explică de ce furtunurile flexibile de frână și de servodirecție au un „modul echivalent” mult mai mic decât al lichidului: peretele de cauciuc se dilată și absoarbe volum.</p>
<p>Dacă în lichid există o bulă de aer cu volumul V<sub>a0</sub> la presiunea absolută p<sub>0</sub>, aceasta se comprimă izoterm (p·V = const.). Volumul absorbit de bulă până la presiunea absolută p este:</p>
${EC(`ΔV<sub>a</sub> = V<sub>a0</sub>·(1 − ${FR("p<sub>0</sub>", "p")})`, "2.5")}
<p>Bula absoarbe aproape tot volumul său la presiuni mici (jumătate din el până la 1 bar suprapresiune), deci pistonul – și pedala de frână – parcurge o cursă mare fără ca presiunea să crească (Fig. 2.2). Acesta este fenomenul de „pedală moale” după o aerisire incompletă sau la fierberea lichidului de frână (bulele de vapori au același efect).</p>
<figure><img src="img/fig2_2.png" alt="Fig. 2.2 Curba presiune – volum" loading="lazy"><figcaption>Fig. 2.2. Curba presiune – volum pentru lichidul fără aer și cu o bulă de aer de 0,5 cm³</figcaption></figure>
<p>Modulul de elasticitate determină și viteza de propagare a undelor de presiune în lichid (celeritatea):</p>
${EC(`a = √(K/ρ)`, "")}
<p>Pentru motorină, a = √(1,5·10<sup>9</sup>/830) ≈ 1340 m/s: la închiderea unui injector, unda de presiune parcurge rampa și conducta de înaltă presiune în câteva zecimi de milisecundă și influențează injecțiile următoare. Tot compresibilitatea explică de ce, la 2000 bar, motorina își micșorează volumul cu aproape 10 % și de ce pompa de înaltă presiune consumă energie pentru comprimare.</p>
<p>Lichidul de frână pe bază de glicoli absoarbe apă din aer (higroscopicitate); apa scade punctul de fierbere și favorizează apariția bulelor de vapori la frânări repetate. Standardul FMVSS 116 impune valorile minime din Tabelul 2.1; lichidul se înlocuiește la 2 ani sau când conținutul de apă depășește ≈ 3 %.</p>
<p><b>Tabelul 2.1.</b> Cerințe minime pentru lichidele de frână (FMVSS 116)</p>
<div class="tabel-scroll"><table class="tabel">
<tr><th>Clasa</th><th>Bază</th><th>Punct de fierbere uscat, min. [°C]</th><th>Punct de fierbere umed, min. [°C]</th><th>ν la −40 °C, max. [mm²/s]</th></tr>
<tr><td>DOT 3</td><td>glicoli</td><td>205</td><td>140</td><td>1500</td></tr>
<tr><td>DOT 4</td><td>glicoli și esteri borici</td><td>230</td><td>155</td><td>1800</td></tr>
<tr><td>DOT 5.1</td><td>glicoli și esteri borici</td><td>260</td><td>180</td><td>900</td></tr>
<tr><td>DOT 5</td><td>siliconică</td><td>260</td><td>180</td><td>900</td></tr>
</table></div>

<h3 id="t-aparatura">2.3. Aparatură și echipamente</h3>
<ul>
<li>Piezometru cu piston filetat (d = 10 mm, pas s = 1 mm), cilindru de oțel D = 20 mm, e = 5 mm, volum util ≈ 50 cm³</li>
<li>Manometru 0…160 bar, clasa 1 (sau traductor de presiune cu afișaj)</li>
<li>Lichid de frână DOT 4 (recipient nou), seringă de 1 cm³ pentru introducerea bulei de aer</li>
<li>Termometru, ecran de protecție transparent, ochelari și mănuși de nitril</li>
<li>Recipient pentru colectarea lichidului uzat</li>
</ul>

<h3 id="t-mod">2.4. Modul de lucru</h3>
<ol>
<li>Se verifică umplerea completă a piezometrului cu lichid fără bule (aerisire prin șurubul de aerisire, cu pistonul retras) și se notează volumul V<sub>0</sub> și temperatura lichidului.</li>
<li>Se aduce presiunea la zero, se marchează poziția roții de manevră și se coboară ecranul de protecție.</li>
<li>Se rotește roata în trepte și se citește numărul de rotații pentru presiunile de 20, 40, 60, 80 și 100 bar (Tabelul 2.2).</li>
<li>Se descarcă treptat presiunea, citind din nou rotațiile la aceleași presiuni, pentru a verifica reversibilitatea (histerezisul).</li>
<li>Varianta b: după descărcarea completă, se introduce cu seringa o bulă de aer de 0,5 cm³ și se repetă măsurătorile, citind suplimentar și presiunile de 1, 2 și 5 bar.</li>
<li>Se descarcă presiunea, se golește piezometrul, se aerisește și se curăță conform indicațiilor cadrului didactic.</li>
</ol>
<p class="nota">În simulator: bifați ochelarii și ecranul, apăsați „Aerisește piezometrul”, apoi rotiți roata până la fiecare presiune și apăsați „Înregistrează”. Pentru varianta b, descărcați la 0 bar și apăsați „Introdu bula cu seringa”.</p>

<h3 id="t-prel">2.6. Prelucrarea datelor</h3>
<p>Se calculează volumul dislocat pentru fiecare treaptă, modulul aparent K<sub>m</sub> (cel mai bine din panta dreptei p–ΔV obținută prin regresie liniară), modulul corectat K și compresibilitatea β. Pentru varianta b se separă volumul absorbit de aer și se compară cu relația izotermă. Se trasează curbele p(ΔV) pentru cele două variante. Toate aceste calcule se fac automat în fila <a href="#" data-mergi="det">Determinări</a>.</p>

<h3 id="t-interp">2.7. Interpretarea rezultatelor</h3>
<ul>
<li>Valoarea K obținută se compară cu intervalul 1,5…2,0 GPa pentru lichidele pe bază de glicoli; o valoare mult mai mică arată aer rămas în piezometru.</li>
<li>Curba de încărcare și cea de descărcare trebuie să fie apropiate; diferențe mari indică scurgeri la etanșarea pistonului.</li>
<li>Se discută efectul corecției pentru deformarea cilindrului (≈ 3 %) și de ce furtunurile de cauciuc ar avea o influență mult mai mare.</li>
<li>Se explică forma curbei cu aer: la presiuni mici panta este aproape nulă (bula se comprimă), apoi curba devine paralelă cu cea a lichidului.</li>
</ul>

<h3 id="t-relev">2.8. Relevanță practică</h3>
<p>Compresibilitatea explică cursa pedalei și timpul de răspuns al frânei: sistemele electrohidraulice (de exemplu frâna integrată cu recuperare de energie la vehiculele electrice) și ABS/ESC calculează volumul necesar pentru a atinge presiunea dorită și sunt sensibile la aerul din circuit. La injecția common-rail, modulul de elasticitate al motorinei intervine în calculul volumului rampei, al undelor de presiune și al debitului pompei de înaltă presiune.</p>
`;

/* ---------------- EXEMPLU ȘI PROBLEME ---------------- */
function htmlProbleme() {
  const Ar = volRot(10, 1);                     // cm³/rot
  // P2 – bula de 0,5 cm³
  const cfgA = { V0: 50, K: 1.68, D: 20, e: 5, E: 210, Vaer: 0 };
  const cfgB = { ...cfgA, Vaer: 0.5 };
  const n20a = volumAbsorbit(cfgA, 20) / Ar, n20b = volumAbsorbit(cfgB, 20) / Ar;
  const n100a = volumAbsorbit(cfgA, 100) / Ar, n100b = volumAbsorbit(cfgB, 100) / Ar;
  // P3 – celeritate, lovitură de berbec
  const a3 = celeritate(1.7, 1050), t3 = 3 / a3 * 1000, dp3 = 1050 * a3 * 2 / 1e5;
  // P4 – peretele cilindrului
  const km5 = KmDinK(1.68, 20, 5, 210), km2 = KmDinK(1.68, 20, 2, 210), kmAl = KmDinK(1.68, 20, 5, 70);
  // P5 – pedala
  const Am = Math.PI * 22.22 ** 2 / 4, dVa5 = volAer(1, 40), sm5 = dVa5 * 1000 / Am, sp5 = sm5 * 4;
  // P6 – common-rail
  const c6lin = 2000e5 / 1.5e9 * 100, c6exp = comprimareRelativa(1.5, 0, 2000) * 100, c6var = comprimareRelativa(1.5, 5, 2000) * 100;
  // P7 – furtunuri
  const dVf = 4 * 0.35 * 0.5, dVl = 40 * 100e5 / 1.7e9, Kech = 40e-6 * 100e5 / ((dVf + dVl) * 1e-6) / 1e9;
  // P8 – scurgere
  const dVs = 0.45 * Ar;

  return `
<h2>Exemplu rezolvat (§2.6)</h2>
<p>V<sub>0</sub> = 50,0 cm³, d = 10 mm, s = 1 mm. La 100 bar s-au măsurat n = 3,90 rotații; cilindrul are D = 20 mm și e = 5 mm (oțel, E = 210 GPa).</p>
${EC(`ΔV = 3,90·${FR("π·10<sup>2</sup>", "4")}·1 = 306 mm³ = 0,306 cm³`, "2.6")}
${EC(`K<sub>m</sub> = ${FR("50,0·10<sup>−6</sup>·100·10<sup>5</sup>", "0,306·10<sup>−6</sup>")} = 1,63 GPa`, "2.7")}
${EC(`${FR("D", "E·e")} = ${FR("0,020", "210·10<sup>9</sup>·0,005")} = 1,90·10<sup>−11</sup> 1/Pa`, "2.8")}
${EC(`K = ${FR("1", `${FR("1", "1,63·10<sup>9</sup>")} − 1,90·10<sup>−11</sup>`)} = 1,68 GPa`, "2.9")}
${EC(`β = ${FR("1", "K")} = 5,9·10<sup>−10</sup> 1/Pa &nbsp;⇒&nbsp; la 100 bar lichidul își micșorează volumul cu 0,59 %`, "2.10")}
<p>Cu bula de aer de 0,5 cm³ (p<sub>0</sub> = 1 bar absolut), până la 20 bar suprapresiune (21 bar absolut):</p>
${EC(`ΔV<sub>a</sub> = 0,5·(1 − ${FR("1", "21")}) = 0,476 cm³`, "2.11")}
${EC(`n<sub>a</sub> = ${FR("0,476", "0,0785")} = 6,1 rotații suplimentare`, "2.12")}
<p>Pentru a ajunge la 100 bar, lichidul fără aer are nevoie de 3,9 rotații, iar cel cu bula de aer de ≈ 10,2 rotații. O bulă de numai 1 % din volum mărește de peste două ori volumul absorbit – la vehicul, cursa pedalei.</p>
<div class="rand-butoane">
  <button type="button" data-scenariu="exA">Încarcă în simulator: lichid fără aer, 100 bar</button>
  <button type="button" data-scenariu="exB">Încarcă în simulator: bulă de 0,5 cm³, 20 bar</button>
</div>

<h2 style="margin-top:1.6rem">Probleme propuse</h2>

<div class="problema"><h3>Problema 1. Rotațiile necesare cu și fără aer</h3>
<p>Pentru piezometrul din exemplu (K = 1,68 GPa), calculați numărul de rotații până la 20 bar și 100 bar, fără aer și cu o bulă de 0,5 cm³. Ce fracțiune din cursă „se pierde” în bulă la 100 bar?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Volumul pe rotație: π·10²/4·1 = 78,54 mm³ = ${fmt(Ar, 4)} cm³. Volumul absorbit de lichid (cu corecția cilindrului): ΔV = V<sub>0</sub>·p/K<sub>m</sub>, cu K<sub>m</sub> = ${fmt(km5, 3)} GPa. Volumul bulei: relația (2.5).</p>
<div class="tabel-scroll"><table class="tabel"><tr><th>p [bar]</th><th>n fără aer</th><th>n cu bulă 0,5 cm³</th></tr>
<tr><td>20</td><td>${fmt(n20a)}</td><td>${fmt(n20b)}</td></tr>
<tr><td>100</td><td>${fmt(n100a)}</td><td>${fmt(n100b)}</td></tr></table></div>
<p>La 100 bar bula absoarbe ${fmt(volAer(0.5, 100), 3)} cm³, adică ${fmt(volAer(0.5, 100) / (n100b * Ar) * 100, 0)} % din volumul dislocat de piston.</p>
<button type="button" data-scenariu="exB100">Verifică în simulator (bulă, 100 bar)</button>
</details></div>

<div class="problema"><h3>Problema 2. Celeritatea și lovitura de berbec în circuitul ABS</h3>
<p>Lichid de frână: K = 1,7 GPa, ρ = 1050 kg/m³. (a) Calculați viteza undei de presiune. (b) În cât timp parcurge unda o conductă de 3 m? (c) Electrovalva ABS oprește brusc o curgere cu viteza de 2 m/s – ce suprapresiune apare (relația lui Joukowski Δp = ρ·a·Δv)?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>(a) a = √(1,7·10<sup>9</sup>/1050) = <b>${fmt(a3, 0)} m/s</b>. (b) t = L/a = 3/${fmt(a3, 0)} = <b>${fmt(t3, 2)} ms</b>. (c) Δp = 1050·${fmt(a3, 0)}·2 = ${fmt(dp3 * 1e5 / 1e6, 2)} MPa ≈ <b>${fmt(dp3, 0)} bar</b> – de aceea modulatoarele ABS au acumulatoare și amortizoare de pulsații.</p>
</details></div>

<div class="problema"><h3>Problema 3. Cât contează peretele cilindrului?</h3>
<p>Lichidul are K = 1,68 GPa, D = 20 mm. Calculați modulul aparent K<sub>m</sub> măsurat cu un cilindru de oțel cu e = 5 mm, cu un cilindru de oțel cu e = 2 mm și cu un cilindru de aluminiu (E = 70 GPa) cu e = 5 mm.</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Din (2.4): K<sub>m</sub> = 1/(1/K + D/(E·e)).</p>
<div class="tabel-scroll"><table class="tabel"><tr><th>Cilindru</th><th>D/(E·e) [1/Pa]</th><th>K<sub>m</sub> [GPa]</th><th>Eroare fără corecție</th></tr>
<tr><td>oțel, e = 5 mm</td><td>${fmtE(corectieCil(20, 5, 210))}</td><td>${fmt(km5, 3)}</td><td>${fmt((1 - km5 / 1.68) * 100, 1)} %</td></tr>
<tr><td>oțel, e = 2 mm</td><td>${fmtE(corectieCil(20, 2, 210))}</td><td>${fmt(km2, 3)}</td><td>${fmt((1 - km2 / 1.68) * 100, 1)} %</td></tr>
<tr><td>aluminiu, e = 5 mm</td><td>${fmtE(corectieCil(20, 5, 70))}</td><td>${fmt(kmAl, 3)}</td><td>${fmt((1 - kmAl / 1.68) * 100, 1)} %</td></tr></table></div>
<p>Încercați în simulator: modificați e sau E în „Lichid și stand” și urmăriți K<sub>m</sub> din calculul în timp real.</p>
</details></div>

<div class="problema"><h3>Problema 4. Aerul din circuit și cursa pedalei</h3>
<p>Pompa centrală are d<sub>m</sub> = 22,22 mm, raportul pedalei i<sub>p</sub> = 4 (Lucrarea 3). După o aerisire incompletă a rămas 1 cm³ de aer. Cu cât crește cursa pedalei până la 40 bar?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>A<sub>m</sub> = π·22,22²/4 = ${fmt(Am, 1)} mm². ΔV<sub>a</sub> = 1·(1 − 1/41) = ${fmt(dVa5, 3)} cm³. Cursa suplimentară a pistonului: s<sub>m</sub> = ${fmt(dVa5 * 1000, 0)}/${fmt(Am, 1)} = ${fmt(sm5, 2)} mm; la pedală: ${fmt(sm5, 2)}·4 = <b>${fmt(sp5, 1)} mm</b>. Șoferul simte o pedală „moale”, care coboară ≈ 1 cm înainte să frâneze.</p>
<button type="button" data-mergi="aplicatii">Deschide calculatorul de pedală</button>
</details></div>

<div class="problema"><h3>Problema 5. Motorina la 2000 bar</h3>
<p>Pentru motorină K<sub>0</sub> = 1,5 GPa. Calculați micșorarea relativă a volumului la 2000 bar: (a) liniar, ΔV/V = p/K; (b) cu K constant, integrat; (c) cu K = K<sub>0</sub> + K′·p, K′ = 5.</p>
<details class="sol"><summary>Rezolvare</summary>
<p>(a) 200·10<sup>6</sup>/1,5·10<sup>9</sup> = ${fmt(c6lin, 1)} %. (b) 1 − e<sup>−p/K</sup> = ${fmt(c6exp, 1)} %. (c) 1 − (1 + K′p/K<sub>0</sub>)<sup>−1/K′</sup> = <b>${fmt(c6var, 1)} %</b> – „aproape 10 %”, cum arată îndrumarul. Modulul crește cu presiunea, deci relația liniară supraestimează comprimarea.</p>
</details></div>

<div class="problema"><h3>Problema 6. Modulul echivalent al unui circuit cu furtunuri</h3>
<p>Un circuit de frânare conține 40 cm³ de lichid (K = 1,7 GPa) sub presiune și 4 furtunuri de 0,35 m, fiecare absorbind 0,5 cm³/m la 100 bar. Calculați volumul absorbit la 100 bar și modulul echivalent al circuitului.</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Lichid: 40·10⁷/1,7·10⁹ = ${fmt(dVl, 3)} cm³. Furtunuri: 4·0,35·0,5 = ${fmt(dVf, 2)} cm³ – de ${fmt(dVf / dVl, 1)} ori mai mult decât lichidul. K<sub>ech</sub> = V·Δp/ΔV = <b>${fmt(Kech, 2)} GPa</b>. De aceea la sport se folosesc furtunuri cu tresă metalică (expansiune mică).</p>
<button type="button" data-scenariu="furtun">Încarcă situația „furtun racordat” în simulator</button>
</details></div>

<div class="problema"><h3>Problema 7. Diagnostic: histerezis mare</h3>
<p>La încărcare s-au citit 3,90 rotații la 100 bar, iar la descărcare manometrul a ajuns la 0 bar când roata mai avea 0,45 rotații până la poziția inițială. Ce s-a întâmplat și ce volum s-a pierdut?</p>
<details class="sol"><summary>Rezolvare</summary>
<p>Presiunea a scăzut la zero înainte ca pistonul să revină: lichidul a ieșit pe lângă etanșarea pistonului. Volumul pierdut: 0,45·${fmt(Ar, 4)} = <b>${fmt(dVs, 3)} cm³</b>. Determinarea se repetă după înlocuirea garniturii; curba de descărcare nu se folosește la calculul lui K.</p>
<button type="button" data-scenariu="scurgere">Încarcă situația „scurgere” în simulator</button>
</details></div>
`;
}

/* ---------------- ÎNTREBĂRI DE VERIFICARE ---------------- */
const INTREBARI = [
  ["Definiți compresibilitatea și modulul de elasticitate al unui lichid; care sunt unitățile lor?",
   `Compresibilitatea β = −(1/V<sub>0</sub>)·ΔV/Δp este micșorarea relativă a volumului la creșterea presiunii cu o unitate, în 1/Pa. Modulul de elasticitate K = 1/β = −V<sub>0</sub>·Δp/ΔV, în Pa (practic GPa). Pentru lichidul de frână K ≈ 1,5…2,0 GPa, β ≈ 5…6,7·10<sup>−10</sup> 1/Pa.`],
  ["De ce aerul din circuitul de frânare produce „pedala moale”?",
   `Aerul are K = p ≈ 0,1 MPa la presiunea atmosferică, de ~15 000 de ori mai mic decât al lichidului. Bula se comprimă izoterm și absoarbe aproape tot volumul ei la presiuni mici (jumătate până la 1 bar), deci pedala coboară fără ca presiunea să crească; abia după comprimarea bulei presiunea urcă. Efectul este același cu bulele de vapori la fierberea lichidului.`],
  ["De ce lichidul de frână se schimbă periodic, chiar dacă nivelul lui este corect?",
   `Lichidul pe bază de glicoli este higroscopic: absoarbe apă din aer prin furtunuri și prin capacul rezervorului. Apa scade punctul de fierbere (DOT 4: 230 °C uscat → 155 °C umed), iar la frânări repetate apar bule de vapori (pedală moale, „fading”); apa produce și coroziune. De aceea lichidul se înlocuiește la 2 ani sau când conținutul de apă depășește ≈ 3 %.`],
  ["Calculați viteza de propagare a undei de presiune în lichidul de frână (K = 1,7 GPa, ρ = 1050 kg/m³).",
   `a = √(K/ρ) = √(1,7·10<sup>9</sup>/1050) ≈ <b>1272 m/s</b>.`],
  ["Cum influențează elasticitatea furtunurilor de frână valoarea măsurată a modulului de elasticitate?",
   `Peretele de cauciuc se dilată sub presiune și absoarbe volum, ca un termen D/(E·e) foarte mare în relația (2.4) (E al cauciucului este de mii de ori mai mic decât al oțelului). Modulul „echivalent” măsurat scade mult sub cel al lichidului – de câteva ori, după lungimea furtunului – deci cursa pedalei crește. În simulator: situația „furtun flexibil racordat”.`]
];

/* ---------------- TEST RAPID ---------------- */
const TEST = [
  { q: "Ce mărime se citește direct pe piezometru pentru a obține ΔV?", o: ["presiunea", "numărul de rotații ale roții de manevră", "temperatura", "diametrul cilindrului"], c: 1,
    e: "ΔV = n·πd²/4·s: se citește numărul de rotații n; d și s sunt constante ale standului." },
  { q: "Un student obține K = 0,9 GPa pentru DOT 4. Cea mai probabilă cauză este:", o: ["cilindrul se dilată", "a rămas aer în piezometru", "temperatura e prea mică", "manometrul are clasa 1"], c: 1,
    e: "Corecția cilindrului este de doar ≈ 3 %. O valoare mult sub 1,5 GPa indică aer rămas (aerisire incompletă)." },
  { q: "Corecția pentru deformarea cilindrului face ca modulul real K să fie:", o: ["mai mic decât K_m", "mai mare decât K_m", "egal cu K_m", "nul"], c: 1,
    e: "Cilindrul se dilată și „ajută” la absorbția de volum, deci K_m < K: 1/K = 1/K_m − D/(E·e)." },
  { q: "O bulă de 0,5 cm³ (la 1 bar abs.) absoarbe până la 1 bar suprapresiune:", o: ["0,05 cm³", "0,25 cm³", "0,48 cm³", "0,5 cm³"], c: 1,
    e: "ΔV_a = 0,5·(1 − 1/2) = 0,25 cm³ – jumătate din volumul bulei la doar 1 bar." },
  { q: "Curbele de încărcare și descărcare nu se suprapun, descărcarea ajunge la 0 bar mai devreme. Diagnosticul:", o: ["aer în lichid", "scurgere la etanșarea pistonului", "manometru defect", "lichid prea vâscos"], c: 1,
    e: "Lichidul pierdut pe lângă piston face ca presiunea să scadă la zero înainte de revenirea roții (§2.7)." },
  { q: "La 100 bar, lichidul de frână cu K = 1,7 GPa își micșorează volumul cu aproximativ:", o: ["0,06 %", "0,6 %", "6 %", "10 %"], c: 1,
    e: "ΔV/V = p/K = 10⁷/1,7·10⁹ ≈ 0,59 %." },
  { q: "Celeritatea undelor de presiune în motorină (K = 1,5 GPa, ρ = 830 kg/m³) este:", o: ["≈ 340 m/s", "≈ 1340 m/s", "≈ 4500 m/s", "≈ 13 400 m/s"], c: 1,
    e: "a = √(1,5·10⁹/830) ≈ 1344 m/s." },
  { q: "Lichidul DOT 5 (siliconic) față de DOT 4:", o: ["este higroscopic", "are modul de elasticitate mai mic (mai compresibil)", "se amestecă fără restricții cu DOT 4", "are punct de fierbere mai mic"], c: 1,
    e: "Lichidele siliconice sunt nehigroscopice, dar mai compresibile (K ≈ 1 GPa) și nu se amestecă cu cele pe bază de glicoli." }
];


/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaL2(D) {
  const dd = D.date, ar = volRot(dd.d, dd.s), corr = corectieCil(dd.D, dd.e, dd.E);
  const V = (t, r, c) => num(((D.t[t] || {})[r] || {})[c]);
  const cel = { t22: {}, t23: {} }, rele = { t22: {}, t23: {} };
  const xs = [0], ys = [0], ptsInc = [], ptsDesc = [];
  let hMax = 0;
  TINTE_A.forEach(p => {
    const ni = V("t22", p, "inc"), nd = V("t22", p, "desc"); cel.t22[p] = {}; rele.t22[p] = {};
    if (ni > 0) {
      const dV = ni * ar, Km = dd.V0 * p * 1e5 / dV / 1e9, K = KDinKm(Km, dd.D, dd.e, dd.E);
      Object.assign(cel.t22[p], { dV: fmt(dV, 4), Km: fmt(Km, 3), K: fmt(K, 3) }); rele.t22[p].K = !(K >= 1.0 && K <= 2.6);
      xs.push(dV); ys.push(p); ptsInc.push([dV, p]);
    }
    if (Number.isFinite(nd)) ptsDesc.push([nd * ar, p]);
    if (Number.isFinite(ni) && Number.isFinite(nd)) { cel.t22[p].h = fmt((ni - nd) * ar, 4); hMax = Math.max(hMax, Math.abs(ni - nd) * ar); }
  });
  const reg = xs.length >= 3 ? regresie(xs, ys) : null;
  let KmR = NaN, KR = NaN;
  if (reg && reg.b > 0) { KmR = dd.V0 * reg.b * 1e5 / 1e9; KR = KDinKm(KmR, dd.D, dd.e, dd.E); }
  const KmSep = Number.isFinite(KmR) ? KmR : (ptsInc.length ? dd.V0 * ptsInc[ptsInc.length - 1][1] * 1e5 / ptsInc[ptsInc.length - 1][0] / 1e9 : KmDinK(1.68, dd.D, dd.e, dd.E));
  const Va0 = num(dd.Va0);
  let sNum = 0, sDen = 0; const ptsB = [];
  TINTE_B.forEach(p => {
    const n = V("t23", p, "n"); cel.t23[p] = {};
    if (n > 0) {
      const tot = n * ar, liq = dd.V0 * p * 1e5 / (KmSep * 1e9), aer = tot - liq, calc = Number.isFinite(Va0) ? volAer(Va0, p) : NaN;
      Object.assign(cel.t23[p], { tot: fmt(tot, 4), liq: fmt(liq, 4), aer: fmt(aer, 4), calc: fmt(calc, 4), ab: Number.isFinite(calc) && calc > 0 ? fmt((aer - calc) / calc * 100, 1) + " %" : "" });
      const f = 1 - 1 / (1 + p); sNum += aer * f; sDen += f * f; ptsB.push([tot, p]);
    }
  });
  const VaEst = sDen > 0 ? sNum / sDen : NaN;
  const n100a = V("t22", 100, "inc"), n100b = V("t23", 100, "n"), n20b = V("t23", 20, "n");
  const aer20 = Number.isFinite(n20b) ? n20b * ar - dd.V0 * 20 * 1e5 / (KmSep * 1e9) : NaN;
  const rezultate = [
    ["Volum pe rotație πd²/4·s", fmt(ar, 4) + " cm³"],
    ["Panta dreptei p–ΔV (regresie, cu originea)", reg ? fmt(reg.b, 1) + " bar/cm³ · R² = " + fmt(reg.r2, 4) : "min. 2 trepte"],
    ["Modul aparent K<sub>m</sub> = V₀·panta", fmt(KmR, 3) + " GPa"],
    ["Corecția cilindrului D/(E·e)", fmt(corr * 1e11, 2) + "·10⁻¹¹ 1/Pa"],
    ["Modul corectat K", "<span style='color:var(--accent)'>" + fmt(KR, 3) + " GPa</span>"],
    ["Compresibilitatea β = 1/K", Number.isFinite(KR) ? fmt(10 / KR, 2) + "·10⁻¹⁰ 1/Pa" : "—"],
    ["Efectul corecției (K − K<sub>m</sub>)/K", Number.isFinite(KR) ? fmt((KR - KmR) / KR * 100, 1) + " %" : "—"],
    ["Micșorarea volumului la 100 bar", Number.isFinite(KR) ? fmt(100e5 / (KR * 1e9) * 100, 2) + " %" : "—"],
    ["Celeritatea a = √(K/ρ)", Number.isFinite(KR) ? fmt(celeritate(KR, dd.rho), 0) + " m/s" : "—"],
    ["Histerezis maxim (încărcare–descărcare)", hMax > 0 ? fmt(hMax, 4) + " cm³" : "—"],
    ["Volumul de aer estimat din măsurători", Number.isFinite(VaEst) ? fmt(VaEst, 3) + " cm³ (introdus: " + fmt(Va0, 3) + ")" : "—"]
  ];
  const verdicte = [];
  if (Number.isFinite(KR)) {
    const glicol = /DOT ?(3|4|5\.1)|necunoscut/i.test(dd.lichid || "DOT 4");
    if (glicol && KR < 1.5) verdicte.push({ tip: "atentie", text: `K = ${fmt(KR, 2)} GPa este sub intervalul 1,5…2,0 GPa al lichidelor pe bază de glicoli: verificați dacă a rămas aer în piezometru sau dacă în circuit există un element elastic (furtun) – §2.7.` });
    else if (glicol && KR > 2.0) verdicte.push({ tip: "atentie", text: `K = ${fmt(KR, 2)} GPa este peste intervalul obișnuit; verificați citirile și datele standului.` });
    else verdicte.push({ tip: "ok", text: `K = ${fmt(KR, 2)} GPa ${glicol ? "se încadrează în intervalul 1,5…2,0 GPa pentru lichidele pe bază de glicoli" : "a fost determinat"}.` });
    if (hMax > 0.01) verdicte.push({ tip: "atentie", text: `Curbele de încărcare și descărcare diferă cu ${fmt(hMax, 3)} cm³ – indiciu de scurgere la etanșarea pistonului.` });
  }
  const serii = [];
  const xMaxDate = Math.max(0.1, ...ptsInc.map(p => p[0]), ...ptsDesc.map(p => p[0]), ...ptsB.map(p => p[0]));
  if (reg) serii.push({ tip: "linie", pts: [[0, reg.a], [(110 - reg.a) / reg.b, 110]], culoare: 0, punctat: true });
  if (Va0 > 0) { const pts = []; for (let p = 0; p <= 110; p += p < 10 ? 0.1 : 1) pts.push([dd.V0 * p * 1e5 / (KmSep * 1e9) + volAer(Va0, p), p]); serii.push({ tip: "linie", pts, culoare: 1, punctat: true }); }
  serii.push({ tip: "pct", pts: ptsInc, culoare: 0 }, { tip: "pct", pts: ptsDesc, culoare: 0, gol: true, r: 7.5 }, { tip: "pct", pts: ptsB, culoare: 1 });
  return {
    celule: cel, rele, rezultate, verdicte, titluGrafic: "Curbele p(ΔV)",
    grafic: { xmax: niceMax(xMaxDate * 1.1), ymax: 120, xlab: "ΔV [cm³]", ylab: "p [bar]", serii },
    legenda: [["varianta a – încărcare", "var(--serie-0)", "pct"], ["varianta a – descărcare", "var(--serie-0)", "gol"], ["regresie liniară", "var(--serie-0)"], ["varianta b – cu aer", "var(--serie-1)", "pct"], ["teoretic (lichid + aer izoterm)", "var(--serie-1)"]],
    principal: { eticheta: "K [GPa]", valoare: Number.isFinite(KR) ? +KR.toFixed(3) : null },
    ar, KmR, KR, KmSep, VaEst, aer20, n100a, n100b
  };
}

/* ------------------------------------------------------------------ definiția lucrării */
const AM = Math.PI * 22.22 ** 2 / 4;
Cadru.porneste({
  disc: "MF", nr: 2, cod: "mf-l2",
  titlu: "Compresibilitatea lichidului de frână și efectul aerului din circuit",
  scurt: "Compresibilitatea lichidului de frână",
  subtitlu: "Laborator virtual – piezometru cu piston filetat",
  parametri: M2.parametri,
  date: [
    { k: "V0", et: "V₀ [cm³]", v: 50 }, { k: "d", et: "d piston [mm]", v: 10 }, { k: "s", et: "pas s [mm]", v: 1 },
    { k: "D", et: "D cilindru [mm]", v: 20 }, { k: "e", et: "e perete [mm]", v: 5 }, { k: "E", et: "E [GPa]", v: 210 },
    { k: "rho", et: "ρ lichid [kg/m³]", v: 1050 }, { k: "T", et: "t [°C]", v: 20 }, { k: "Va0", et: "V<sub>a0</sub> aer [cm³]", v: 0.5 },
    { k: "lichid", et: "Lichidul", v: "Lichid de frână DOT 4", text: true }
  ],
  tabele: [
    { id: "t22", titlu: "Tabelul 2.2. Determinări pentru lichidul fără aer (varianta a)", antetRand: "p [bar]",
      randuri: TINTE_A.map(p => ({ k: String(p), et: String(p) })),
      coloane: [{ k: "inc", t: "n la încărcare [rot]", intrare: true }, { k: "desc", t: "n la descărcare [rot]", intrare: true }, { k: "dV", t: "ΔV [cm³]" }, { k: "Km", t: "K<sub>m</sub> [GPa]" }, { k: "K", t: "K corectat [GPa]" }, { k: "h", t: "Diferență încărcare–descărcare [cm³]" }] },
    { id: "t23", titlu: "Tabelul 2.3. Determinări pentru lichidul cu aer (varianta b)", antetRand: "p [bar]",
      randuri: TINTE_B.map(p => ({ k: String(p), et: String(p) })),
      coloane: [{ k: "n", t: "n [rot]", intrare: true }, { k: "tot", t: "ΔV total [cm³]" }, { k: "liq", t: "ΔV lichid [cm³]" }, { k: "aer", t: "ΔV aer [cm³]" }, { k: "calc", t: "ΔV<sub>a</sub> calculat [cm³]" }, { k: "ab", t: "Abatere" }] }
  ],
  calculeaza: calculeazaL2,
  intrebari(D, R) {
    const Va = num(D.date.Va0) || 0;
    return [
      { id: "q1", u: "cm³", text: `Din Tabelul 2.3 al vostru: ce volum a absorbit aerul (ΔV aer) până la <b>20 bar</b>?`, textSimplu: "Volumul absorbit de aer până la 20 bar (Tabelul 2.3)" },
      { id: "q2", u: "rot", text: `Câte rotații <b>în plus</b> față de lichidul fără aer au fost necesare până la 100 bar, cu aerul vostru?`, textSimplu: "Rotații suplimentare până la 100 bar" },
      { id: "q3", u: "m/s", text: `Celeritatea undei de presiune în lichidul vostru, cu K determinat de voi și ρ = 1050 kg/m³:`, textSimplu: "Celeritatea a = √(K/ρ) cu K determinat" },
      { id: "q4", u: "mm", text: `Dacă aerul vostru (V<sub>a0</sub> = ${fmt(Va, 3)} cm³) ar rămâne în circuitul de frânare (pompă Ø22,22 mm, i<sub>p</sub> = 4), cu cât ar crește cursa pedalei până la 40 bar?`, textSimplu: `Creșterea cursei pedalei la 40 bar cu V_a0 = ${Va.toFixed(3)} cm³` }
    ];
  },
  cerinte(D) {
    const l = [], a = TINTE_A.filter(p => D.t.t22[p].inc !== "").length, d = TINTE_A.filter(p => D.t.t22[p].desc !== "").length, b = TINTE_B.filter(p => D.t.t23[p].n !== "").length;
    if (a < 5) l.push(`Tabelul 2.2: ${a}/5 trepte la încărcare`);
    if (d < 3) l.push("Tabelul 2.2: cel puțin 3 citiri la descărcare");
    if (b < 6) l.push(`Tabelul 2.3: ${b}/6 trepte`);
    return l;
  },
  exemplu(D) {
    const c = { V0: 50, K: 1.68, D: 20, e: 5, E: 210, Vaer: 0 }, ar = volRot(10, 1);
    TINTE_A.forEach(p => { const n = (volumAbsorbit(c, p) / ar).toFixed(2); D.t.t22[p].inc = n; D.t.t22[p].desc = n; });
    D.t.t22["100"].inc = "3.90"; D.t.t22["100"].desc = "3.90";
    TINTE_B.forEach(p => { D.t.t23[p].n = (volumAbsorbit({ ...c, Vaer: 0.5 }, p) / ar).toFixed(2); });
    Object.assign(D.date, { V0: 50, d: 10, s: 1, D: 20, e: 5, E: 210, rho: 1050, Va0: 0.5, lichid: "Lichid de frână DOT 4 (exemplul din îndrumar)" });
  },
  scenariu(id, C) {
    $("#ck-ochelari").checked = true; $("#ck-ecran").checked = true;
    $("#in-fluid").value = "DOT4"; ["V0:50", "d:10", "s:1", "D:20", "e:5", "E:210"].forEach(x => { const [k, v] = x.split(":"); $("#in-" + k).value = v; });
    $("#ck-erori").checked = false;
    $("#in-defect").value = (id === "furtun" || id === "scurgere") ? id : "none";
    setareDinFormular();
    Object.assign(sim, { aerisit: true, Vleak: 0, n: 0, dir: 1 }); SV.picaturi = [];
    sim.Vinj = (id === "exB" || id === "exB100") ? 0.5 : 0; sim.dBula = 9.85; sim.nBule = 1;
    $("#in-db").value = 10; $("#in-nb").value = 1;
    sim.tintaN = nPentruP(id === "exB" ? 20 : 100);
    C.mesajTemporar(id === "exA" ? "Exemplul rezolvat: n ≈ 3,90 rot la 100 bar (erori de măsurare dezactivate)." :
      id === "exB" ? "Bulă de 0,5 cm³: urmăriți câte rotații sunt necesare până la 20 bar." :
      id === "exB100" ? "Bulă de 0,5 cm³ până la 100 bar: ≈ 10,2 rotații." :
      id === "furtun" ? "Furtun racordat: modulul echivalent scade mult sub cel al lichidului." :
      "Scurgere la etanșare: țineți presiunea și urmăriți manometrul, apoi descărcați.", "");
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Circuitul de frânare pe autoturism – efectul aerului și al compresibilității",
    intro: `<p>Același lichid de frână din piezometru lucrează în circuitul real: pedală → servofrână → pompa centrală tandem → modulatorul ABS → conducte → etriere. Țineți apăsat <b>Apasă frâna</b> (sau tasta Spațiu) la 90 km/h și urmăriți presiunea, cursa pedalei și distanța de oprire; apoi introduceți aer în circuit și repetați. Aerul se comprimă mult mai ușor decât lichidul (modulul lui de elasticitate este ≈ p, de mii de ori mai mic decât K), deci pompa centrală trebuie să dezlocuiască un volum suplimentar: pedala devine „moale”, iar dacă volumul pompei se epuizează, presiunea – și decelerația – nu mai cresc.</p>`,
    dupa: `<p class="nota">Modelul: cursa pedalei = raport pedalier × V(p)/A<sub>pompă</sub>, cu V(p) = jocul plăcuțelor + elasticitatea conductelor și a lichidului + V<sub>aer</sub>·p/(p<sub>atm</sub>+p); decelerația este limitată de aderență (ABS menține roțile la limita alunecării).</p>`,
    optiuni: C => ({ aerDin: { eticheta: "Preia aerul din piezometru", valoare: () => Number(C.D.date.Va0) || 0 } })
  },
  referat: {
    scop: "Determinarea modulului de elasticitate al unui lichid de frână cu piezometrul cu piston filetat și evidențierea efectului aerului asupra volumului absorbit (cursa pedalei).",
    relatii: "ΔV = n·πd²/4·s; &nbsp; K<sub>m</sub> = V₀·Δp/ΔV; &nbsp; 1/K = 1/K<sub>m</sub> − D/(E·e); &nbsp; β = 1/K; &nbsp; V<sub>a0</sub> = n<sub>b</sub>·πd<sub>b</sub>³/6; &nbsp; ΔV<sub>a</sub> = V<sub>a0</sub>(1 − p₀/p); &nbsp; a = √(K/ρ).",
    varianta: D => D.varianta && D.varianta.dBula ? `Aer introdus: ${D.varianta.nBule} ${D.varianta.nBule === 1 ? "bulă" : "bule"} Ø${fmt(D.varianta.dBula, 1)} mm, V<sub>a0</sub> = ${fmt(D.varianta.Va0, 3)} cm³.` : "Aer introdus: —",
    indicatii: "Comparați K cu intervalul 1,5…2,0 GPa, discutați histerezisul, corecția cilindrului și forma curbei cu aer pentru varianta voastră…"
  },
  subsol: "Modelul: lichid cu modul de elasticitate constant, corecția cilindrului cu pereți groși 1/K = 1/K<sub>m</sub> − D/(E·e), aer comprimat izoterm (p·V = const.), furtun cu complianță constantă. Valorile implicite reproduc exemplul rezolvat din îndrumar (n = 3,90 rot la 100 bar → K = 1,68 GPa).",
  continut: {
    teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST,
    aplicatii: {
      html: `
  <div class="card">
    <h2>Animație: sistemul de frânare cu și fără aer</h2>
    <p class="nota">Apăsați pedala cu cursorul de forță sau cu butonul. Datele (pompă, raportul pedalei, aer, cursa moartă, presiunea țintă) sunt cele din calculatorul de mai jos; cu aer, pedala coboară mai mult, iar dacă ajunge la podea presiunea nu mai crește.</p>
    <svg id="svg-frana" viewBox="0 0 760 360" role="img" aria-label="Pedala de frână, pompa centrală, conducta cu bulă de aer, etrierul și discul" style="width:100%;height:auto;display:block"></svg>
    <div class="frana-comenzi">
      <label class="camp">Forța pe pedală [N]<input type="range" id="sl-frana" min="0" max="900" step="5" value="0"></label>
      <label class="bifa"><input type="checkbox" id="ck-aer-frana" checked> Aer rămas în circuit</label>
      <label class="bifa"><input type="checkbox" id="ck-servo"> Servofrână</label>
      <button type="button" class="primar" id="btn-frana">Apasă frâna (până la presiunea țintă)</button>
    </div>
  </div>
  <div class="det-grila">
    <div class="card">
      <h2>Aerul din circuit și cursa pedalei de frână</h2>
      <p class="nota">Pompa centrală trebuie să dizloce volumul absorbit de lichid, de furtunuri, de etriere și de aerul rămas. Valorile pompei și ale pedalei sunt cele din Lucrarea 3.</p>
      <div class="doua" id="pedala-in"></div>
      <div id="pedala-rez"></div>
    </div>
    <div class="card">
      <h2>Cursa pedalei în funcție de presiune</h2>
      <canvas id="cv-pedala" height="340"></canvas>
      <div class="legenda" id="leg-pedala"></div>
      <div id="pedala-bare"></div>
    </div>
  </div>
  <div class="det-grila">
    <div class="card">
      <h2>Unde de presiune (ABS, common-rail)</h2>
      <div class="doua" id="unda-in"></div>
      <div id="unda-rez"></div>
    </div>
    <div class="card">
      <h2>Comprimarea motorinei la presiuni mari</h2>
      <div class="doua" id="cr-in"></div>
      <div id="cr-rez"></div>
    </div>
  </div>
`,
      init(C) {
        campuriCalc($("#pedala-in"), PED, calcAuto); campuriCalc($("#unda-in"), UNDA, calcAuto); campuriCalc($("#cr-in"), CR, calcAuto);
        construiestePedala();
        $("#sl-frana").addEventListener("input", e => { FRANA.auto = null; FRANA.Ft = num(e.target.value); });
        $("#btn-frana").addEventListener("click", () => { FRANA.auto = 0; });
      },
      cadru(dt) { actualizeazaPedala(dt); },
      redeseneaza() { if ($("#tab-aplicatii").classList.contains("activ")) calcAuto(); }
    }
  },
  sim: {
    html: `<div class="sim-grila">
    <div class="card sim-scena scena">
      <svg id="svg-piezo" viewBox="0 0 900 400" role="img" aria-label="Piezometru cu piston filetat, manometru și roată de manevră"></svg>
      <div class="afisaje">
        <div class="afisaj"><span>Presiune</span><b id="af-p">0,0</b><small>bar</small></div>
        <div class="afisaj"><span>Rotații n</span><b id="af-n">0,00</b><small>rot</small></div>
        <div class="afisaj"><span>ΔV dislocat</span><b id="af-dv">0,000</b><small>cm³</small></div>
        <div class="afisaj"><span>Bula de aer</span><b id="af-bula">—</b><small>cm³</small></div>
      </div>
      <div class="grafic-mic">
        <canvas id="cv-live" height="230" aria-label="Curba presiune – volum dislocat, în timp real"></canvas>
      </div>
    </div>

    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-ochelari"> Ochelari de protecție și mănuși de nitril</label>
      <label class="bifa"><input type="checkbox" id="ck-ecran"> Ecranul de protecție coborât</label>
      <div class="rand-butoane">
        <button type="button" id="btn-aerisire">Aerisește piezometrul</button>
        <button type="button" id="btn-bula">Introdu aerul cu seringa</button>
      </div>
      <p class="nota" style="margin-bottom:0">Varianta voastră individuală (varianta b):</p>
      <div class="doua">
        <label class="camp">Diametrul bulei d<sub>b</sub> [mm]<input type="number" id="in-db" value="10" min="5" max="11" step="0.5"></label>
        <label class="camp">Numărul de bule<input type="number" id="in-nb" value="1" min="1" max="4" step="1"></label>
      </div>
      <p class="nota" id="nota-bula"></p>

      <h2>Roata de manevră</h2>
      <p class="nota">Rotiți lent: butoanele de mai jos, tastele ← → (Shift = pas fin) sau trageți de roată.</p>
      <div class="roata-butoane">
        <button type="button" data-dn="-1">−1</button>
        <button type="button" data-dn="-0.1">−0,1</button>
        <button type="button" data-dn="-0.01">−0,01</button>
        <button type="button" data-dn="0.01">+0,01</button>
        <button type="button" data-dn="0.1">+0,1</button>
        <button type="button" data-dn="1">+1</button>
      </div>
      <div class="rand-butoane">
        <button type="button" class="tine" id="btn-tine-desc">⟲ Descarcă (ține apăsat)</button>
        <button type="button" class="tine" id="btn-tine-inc">⟳ Încarcă (ține apăsat)</button>
      </div>
      <label class="camp" data-doar-demo>Du presiunea la
        <span class="inline">
          <select id="sel-tinta"></select>
          <button type="button" id="btn-tinta">Rotește</button>
        </span>
      </label>
      <button type="button" class="primar lat" id="btn-inreg">● Înregistrează citirea în tabel</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>

      <details class="setari" open>
        <summary>Lichid și stand</summary>
        <label class="camp">Lichidul încercat <select id="in-fluid"></select></label>
        <div class="doua">
          <label class="camp">V<sub>0</sub> [cm³]<input type="number" id="in-V0" value="50" step="1" min="10" max="200"></label>
          <label class="camp">t [°C]<input type="number" id="in-T" value="20" step="1"></label>
          <label class="camp">d piston [mm]<input type="number" id="in-d" value="10" step="0.5" min="4" max="30"></label>
          <label class="camp">pas s [mm]<input type="number" id="in-s" value="1" step="0.25" min="0.25" max="3"></label>
          <label class="camp">D cilindru [mm]<input type="number" id="in-D" value="20" step="1" min="10" max="60"></label>
          <label class="camp">e perete [mm]<input type="number" id="in-e" value="5" step="0.5" min="1" max="20"></label>
          <label class="camp">E material [GPa]<input type="number" id="in-E" value="210" step="5" min="60" max="220"></label>
          <label class="camp">Manometru
            <select id="in-mano"><option value="analog">analogic 0…160 bar, cl. 1</option><option value="digital">traductor cu afișaj</option></select>
          </label>
        </div>
        <label class="bifa"><input type="checkbox" id="ck-erori" checked> Erori de măsurare realiste (clasa manometrului, citire)</label>
        <label class="bifa"><input type="checkbox" id="ck-etichete" checked> Etichete pe schemă</label>
        <label class="bifa"><input type="checkbox" id="ck-sageti" checked> Forțele de presiune în lichid (legea lui Pascal)</label>
      </details>

      <details class="setari">
        <summary>Defecte și situații de diagnosticat</summary>
        <label class="camp">Situația
          <select id="in-defect">
            <option value="none">fără defect</option>
            <option value="aerRamas">aerisire incompletă (aer rămas ascuns)</option>
            <option value="scurgere">scurgere la etanșarea pistonului</option>
            <option value="furtun">furtun flexibil de frână racordat (0,4 m)</option>
          </select>
        </label>
        <label class="bifa"><input type="checkbox" id="ck-rapid"> Timp accelerat ×10 (pentru scurgere)</label>
        <p class="nota">Cu un defect activ, valoarea K determinată iese din intervalul 1,5…2,0 GPa sau curbele de încărcare/descărcare nu se suprapun – exact ca la §2.7 din îndrumar.</p>
      </details>
    </aside>
  </div>

  `,
    init(C) {
      const sf = $("#in-fluid");
      sf.innerHTML = Object.entries(FLUIDE).map(([k, f]) => `<option value="${k}">${f.nume}</option>`).join(""); sf.value = "DOT4";
      $("#sel-tinta").innerHTML = [0, 1, 2, 5, 20, 40, 60, 80, 100].map(p => `<option value="${p}">${p === 0 ? "0 bar (descarcă)" : p + " bar"}</option>`).join(""); $("#sel-tinta").value = "20";
      construiesteSVG();
      $$(".roata-butoane button").forEach(b => b.addEventListener("click", () => { sim.tintaN = null; roteste(num(b.dataset.dn)); }));
      const tine = (btn, dir) => {
        const on = e => { e.preventDefault(); sim.tintaN = null; sim.tine = dir; btn.classList.add("apasat"); };
        const off = () => { if (sim.tine === dir) sim.tine = 0; btn.classList.remove("apasat"); };
        btn.addEventListener("pointerdown", on); btn.addEventListener("pointerup", off); btn.addEventListener("pointerleave", off); btn.addEventListener("pointercancel", off);
      };
      tine($("#btn-tine-inc"), 1); tine($("#btn-tine-desc"), -1);
      document.addEventListener("keydown", e => {
        if (!$("#tab-sim").classList.contains("activ") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); sim.tintaN = null; roteste((e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.01 : 0.1)); }
        if (e.key === "Enter") inregistreazaCitire(e);
      });
      $("#btn-tinta").addEventListener("click", mergiLaTinta);
      $("#btn-inreg").addEventListener("click", inregistreazaCitire);
      $("#btn-aerisire").addEventListener("click", aeriseste);
      $("#btn-bula").addEventListener("click", introduBula);
      $$(".sim-comenzi input, .sim-comenzi select").forEach(i => { if (!["in-db", "in-nb"].includes(i.id)) i.addEventListener("change", setareDinFormular); });
      ["#in-db", "#in-nb"].forEach(id => $(id).addEventListener("input", scrieNotaBula));
      scrieNotaBula();
      if (!MOD.eval) setareDinFormular();
      C.mesaj("Începeți cu pregătirea NSSM și aerisirea piezometrului.", "");
    },
    aplicaEval(P, C) {
      Object.assign(sim, { erori: true, defect: "none", fluid: "DOT4", mano: "analog", V0: 50, d: 10, s: 1, D: 20, e: 5, E: 210, T: 20 });
      const set = (id, v) => { const el = $(id); if (el) { if (el.type === "checkbox") el.checked = v; else el.value = v; el.disabled = true; } };
      set("#in-fluid", "DOT4"); set("#in-V0", 50); set("#in-d", 10); set("#in-s", 1); set("#in-D", 20); set("#in-e", 5); set("#in-E", 210); set("#in-T", 20);
      set("#in-mano", "analog"); set("#ck-erori", true); set("#in-defect", "none"); set("#ck-rapid", false);
      Object.assign(C.D.date, { V0: 50, d: 10, s: 1, D: 20, e: 5, E: 210, rho: 1050, T: 20, lichid: "Lichid de frână DOT 4" });
      if (C.D.varianta && C.D.varianta.Va0) C.D.date.Va0 = C.D.varianta.Va0;
      if (SV.g) construiesteSVG();
    },
    reset() { Object.assign(sim, { aerisit: false, Vinj: 0, n: 0, Vleak: 0, dir: 0, tintaN: null, pVarf: 0 }); },
    cadru(dt, C, vizibil) {
      if (sim.tine) roteste(sim.tine * 0.6 * dt);
      if (sim.tintaN !== null) { const d = sim.tintaN - sim.n, pas = 1.8 * dt; if (Math.abs(d) <= pas) { roteste(d); sim.tintaN = null; } else roteste(Math.sign(d) * pas); }
      let p = presiune();
      if (sim.defect === "scurgere" && p > 0) { sim.Vleak += DEBIT_SCURGERE * (p / 100) * dt * (sim.rapid ? 10 : 1); p = presiune(); }
      sim.ultimP = p;
      if (p < 0.3) sim.pVarf = 0; else if (p > sim.pVarf) sim.pVarf = p;
      const pg = sim.erori ? M2.citire(p, C.P) : p;
      const ac = SV.ac, h = dt / 4;
      for (let i = 0; i < 4; i++) { ac.v += (260 * (pg - ac.p) - 22 * ac.v) * h; ac.p += ac.v * h; }
      if (!vizibil) return;
      actualizeazaSVG(p, ac.p, dt);
      const now = performance.now();
      if (now - (this._ta || 0) > 120) {
        this._ta = now;
        $("#af-p").textContent = fmt(citire(p), 1); $("#af-n").textContent = fmt(sim.n, 2); $("#af-dv").textContent = fmt(sim.n * Ar(), 3);
        $("#af-bula").textContent = sim.Vinj > 0 ? fmt(sim.Vinj * P_ATM / (P_ATM + p), 3) : (!sim.aerisit ? "bule!" : "—");
        if (p < 0.3) C.stare(1, "repaus (0 bar)"); else if (sensCurent() === "inc") C.stare(1, "încărcare ↑", "inc"); else C.stare(1, "descărcare ↓", "desc");
        C.stare(2, sim.Vinj > 0 ? `varianta b – aer ${fmt(sim.Vinj, 3)} cm³` : (sim.aerisit ? "varianta a – fără aer" : "neaerisit – aerisiți întâi!"));
        if (p > 160) C.mesajAuto("Peste capătul scalei! Descărcați imediat.", "pericol"); else if (p > 100.5) C.mesajAuto("Depășit 100 bar – limita NSSM a lucrării.", "pericol"); else C.mesajAuto("");
      }
      if (now - (this._tl || 0) > 220) { this._tl = now; deseneazaLive(p); }
    },
    redeseneaza() { deseneazaLive(); },
    formule(C) {
      const p = sim.ultimP, ar = Ar(), dV = sim.n * ar, corr = corectieCil(sim.D, sim.e, sim.E);
      const Km = p > 0.5 ? sim.V0 * p * 1e5 / dV / 1e9 : NaN, Kc = KDinKm(Km, sim.D, sim.e, sim.E);
      const proba = sim.fluid === "PROBA" || MOD.eval, Kref = proba ? NaN : Kreal();
      const f = [
        ["Volumul dislocat (2.3)", `ΔV = n·πd²/4·s = ${fmt(sim.n)}·π·${fmt(sim.d, 1)}²/4·${fmt(sim.s, 2)} = <span class="rez">${fmt(dV * 1000, 1)} mm³ = ${fmt(dV, 4)} cm³</span>`],
        ["Volum pe rotație", `πd²/4·s = <span class="rez">${fmt(ar, 4)} cm³/rot</span>`],
        ["Modul aparent (2.2), fără separarea aerului", `K<sub>m</sub> = V₀·p/ΔV = ${fmt(sim.V0, 1)}·${fmt(p, 1)}·10⁵/${fmt(dV, 4)} = <span class="rez">${fmt(Km, 3)} GPa</span>`],
        ["Corecția cilindrului (2.8)", `D/(E·e) = ${fmt(sim.D, 0)}/(${fmt(sim.E, 0)}·10⁹·${fmt(sim.e, 1)}) = <span class="rez">${fmt(corr * 1e11, 2)}·10⁻¹¹ 1/Pa</span>`],
        ["Modul corectat (2.4)", `K = 1/(1/K<sub>m</sub> − D/(E·e)) = <span class="rez">${fmt(Kc, 3)} GPa</span>`],
        ["Compresibilitate", `β = 1/K = <span class="rez">${Number.isFinite(Kc) ? fmt(1 / Kc * 10, 2) + "·10⁻¹⁰ 1/Pa" : "—"}</span>`],
        ["Aerul (2.5), p abs. = " + fmt(p + 1, 1) + " bar", sim.Vinj > 0 ? `ΔV<sub>a</sub> = ${fmt(sim.Vinj, 3)}·(1 − 1/${fmt(p + 1, 1)}) = <span class="rez">${fmt(volAer(sim.Vinj, p), 3)} cm³</span> · rot. suplim. = ${fmt(volAer(sim.Vinj, p) / ar, 2)}` : "fără aer introdus"]
      ];
      if (!proba) f.push(["Valoarea de referință a lichidului", `K = ${fmt(Kref, 2)} GPa · K<sub>m</sub> așteptat = <span class="rez">${fmt(KmDinK(Kref, sim.D, sim.e, sim.E), 3)} GPa</span>`]);
      return f;
    }
  }
});
