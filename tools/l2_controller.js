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
/*@@SVG@@*/

/* ------------------------------------------------------------------ graficul în timp real */
/*@@CURBA@@*/

/* ------------------------------------------------------------------ aplicații la autovehicul */
/*@@PED@@*/

/* ------------------------------------------------------------------ conținut didactic */
/*@@CONTINUT@@*/

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
      html: /*@@AUTO_HTML@@*/,
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
    html: /*@@SIM_HTML@@*/,
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
