/* DA – Lucrarea 4. Sistemul de alimentare MAS și analiza gazelor de evacuare (standul K7J 1.4 MPI, sistem cu retur).
   Modelul: regulatorul de presiune comandat de presiunea din colector, menținerea presiunii după oprire, debitul pompei,
   compoziția gazelor (ardere cu echilibrul apă–gaz K = 3,5, rateuri, catalizator limitat de oxigen), bucla închisă a ECU
   (corecțiile STFT / LTFT) și un defect ascuns al sistemului de alimentare. Folosit identic în aplicație și pe server. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l4"] = (function () {
  var HCV = 1.7261, OCV = 0.0176, K1 = 6e-4, A_ST = 1 + HCV / 4 - OCV / 2;
  var TIPURI = {
    valva: "Supapa de reținere a pompei neetanșă", inj: "Injector care picură (neetanș)", reg: "Regulatorul de presiune defect (membrana fisurată / blocat)",
    filtru: "Filtrul de combustibil colmatat (debit insuficient)", aer: "Aer fals la colectorul de admisie (garnitură)", sonda: "Sonda λ amonte îmbătrânită (răspuns lent)"
  };
  var CHEI = ["valva", "inj", "reg", "filtru", "aer", "sonda"];
  var EXPLICATII = ["aer nemăsurat – amestec sărac, corecții pozitive", "combustibil nears – HC și O₂ mari, λ „fals” > 1", "presiune mare – amestec bogat, corecții negative",
    "scăpări în evacuare înaintea sondei", "amestec corect – motor în stare bună"];
  function eticheta(d) { return TIPURI[d.tip] || "—"; }
  function optiuniDiag() { return CHEI.map(function (k) { return TIPURI[k]; }); }
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      p0: r2(u(2.9, 3.1), 2), patm: r2(u(99.5, 102.0), 1), pRal: r2(u(32, 37), 1), nRal: Math.round(u(770, 830)),
      q0: r2(u(1.6, 1.95), 2), dHold: r2(u(0.2, 0.4), 2), errA: r2(u(-0.04, 0.04), 3), ltft0: r2(u(-3, 3), 1),
      eta: r2(u(0.90, 0.96), 3), fl: r2(u(0.85, 1.05), 2), defect: { tip: CHEI[Math.floor(r() * CHEI.length) % CHEI.length] }
    };
  }
  /* ---------------- presiunea și debitul combustibilului */
  function pCol(pr, reg) { return reg === "oprit" || reg === "contact" ? pr.patm : reg === "r2500" ? r2(pr.pRal - 7, 1) : pr.pRal; }
  /** presiunea relativă din rampă [bar]: reg ∈ contact | ralanti | r2500; faraVac – furtunul regulatorului deconectat și obturat */
  function pRampa(pr, reg, faraVac) {
    var regBlocat = pr.defect.tip === "reg", pc = pCol(pr, reg), dpf = pr.defect.tip === "filtru" && reg === "r2500" ? 0.15 : 0;
    if (faraVac || regBlocat) return pr.p0 - dpf;
    return pr.p0 - (pr.patm - pc) / 100 - dpf;
  }
  /** presiunea după oprirea motorului, t [s] */
  function pRetinere(pr, t) {
    var d = pr.defect.tip, pf = pr.p0 - pr.dHold, tau = 110;
    if (d === "valva") { pf = 0.35; tau = 70; } else if (d === "inj") { pf = 1.0; tau = 140; }
    return pf + (pr.p0 - pf) * Math.exp(-t / tau);
  }
  function debitPompa(pr) { return pr.defect.tip === "filtru" ? r2(pr.q0 * 0.62, 3) : pr.q0; }
  /* ---------------- gazele de evacuare */
  function brettschneider(CO, CO2, HC, O2) {
    var s = CO2 + CO, num = CO2 + CO / 2 + O2 + (HCV / 4 * 3.5 / (3.5 + (CO2 > 0 ? CO / CO2 : 0)) - OCV / 2) * s, den = (1 + HCV / 4 - OCV / 2) * (s + K1 * HC);
    return den > 0 ? num / den : NaN;
  }
  /** compoziția uscată după catalizator: lam – amestecul cilindrilor care ard, m – fracțiunea de combustibil nears (rateuri), eta – activitatea catalizatorului */
  function gaze(lam, m, eta, extraCO) {
    // m – fracțiunea de aer care trece prin cilindrul cu injectorul decuplat (fără combustibil): oxigen nears + HC din filmul de pe pereți
    var CO2, CO, H2, O2, HCc, aB = m / (1 - m), N2 = 3.773 * lam * A_ST * (1 + aB);
    if (lam >= 1) { CO2 = 1; CO = 0; H2 = 0; O2 = (lam - 1) * A_ST; }
    else {
      var lo = 0, hi = 1, w, x;
      for (var k = 0; k < 60; k++) { x = (lo + hi) / 2; w = 2 * lam * A_ST + OCV - 1 - x; var f = w * (1 - x) - 3.5 * (HCV / 2 - w) * x; if (f > 0) lo = x; else hi = x; }
      w = 2 * lam * A_ST + OCV - 1 - x; CO2 = x; CO = 1 - x; H2 = Math.max(0, HCV / 2 - w); O2 = 0;
    }
    // imperfecțiunile arderii: puțin CO și HC chiar la amestec corect
    var d = 0.012 + (extraCO || 0); CO2 -= d; CO += d; O2 += d / 2;
    var hcE = 0.0035 + (m > 0 ? 0.065 : 0); CO2 -= hcE; O2 += hcE * (1 + HCV / 4);
    HCc = hcE; O2 += aB * lam * A_ST;
    // catalizatorul: oxidare limitată de oxigenul disponibil (la rateuri catalizatorul este suprasolicitat)
    var nCO = CO / 2, nH2 = H2 / 2, nHC = HCc * (1 + HCV / 4), need = nCO + nH2 + nHC;
    if (need > 0 && O2 > 0) {
      var f1 = Math.min(eta, O2 / need), fHC = Math.min(eta * (m > 0 ? 0.5 : 0.86), O2 / need);
      O2 -= f1 * (nCO + nH2) + fHC * nHC; CO2 += f1 * CO + fHC * HCc; CO -= f1 * CO; H2 -= f1 * H2; HCc -= fHC * HCc;
    }
    var hc6 = HCc / 6, T = (CO2 + CO + H2 + Math.max(O2, 0) + N2 + hc6) / 0.945;   // diluția probei (umiditate reziduală, aer în traseu)
    return { CO: CO / T * 100, CO2: CO2 / T * 100, O2: Math.max(O2, 0) / T * 100, HC: hc6 / T * 1e6 };
  }
  /** starea motorului cald: reg ∈ ralanti | r2500; prov ∈ "" | aer | rateu | pres (defectul provocat, ≈ 2500 rot/min) */
  function stare(pr, reg, prov) {
    var d = pr.defect.tip, ral = reg === "ralanti";
    var dpReg = Math.sqrt((pr.p0 + (pr.patm - pCol(pr, reg)) / 100) / pr.p0) - 1;     // debitul injectoarelor crește cu √Δp
    var aerPerm = pr.errA + (d === "aer" ? (ral ? 0.16 : 0.05) : 0), combPerm = (d === "inj" ? (ral ? 0.07 : 0.02) : 0) + (d === "reg" ? dpReg : 0) - (d === "filtru" && !ral ? 0.07 : 0);
    var aerProv = prov === "aer" ? (ral ? 0.3 : 0.14) : 0, combProv = prov === "pres" && d !== "reg" ? dpReg : 0, m = prov === "rateu" ? 0.11 : 0;
    var lamPerm = (1 + aerPerm) / (1 + combPerm), lamRaw = (1 + aerPerm + aerProv) / (1 + combPerm + combProv);
    // LTFT – adaptarea pe termen lung (defectul permanent); STFT – bucla închisă (complet în regim stabil, parțial în timpul testului de 1–2 min)
    var ltft = Math.max(-25, Math.min(25, Math.round(((lamPerm - 1) * 100 + pr.ltft0) * 10) / 10));
    var lam1 = lamRaw / (1 + ltft / 100), vazut = lam1 + 0.6 * m;
    var stft = Math.max(-25, Math.min(25, (prov ? 0.45 : 1) * (vazut - 1) * 100));
    var lam2 = lam1 / (1 + stft / 100) * 1.003;                 // oscilația buclei lasă puțin O₂ rezidual
    var extraCO = (d === "sonda" ? 0.004 : 0) + (ral ? 0.001 : 0), eta = pr.eta * (d === "sonda" ? 0.9 : 1) * (ral ? 0.97 : 1);
    var g = gaze(lam2, m, eta, extraCO);
    if (d === "inj" && ral) g.HC += 60;
    g.lam = brettschneider(g.CO, g.CO2, g.HC, g.O2);
    g.stft = r2(stft, 1); g.ltft = ltft; g.lamMix = lam2;
    g.n = ral ? pr.nRal : 2500; g.pcol = pCol(pr, reg) + (d === "aer" && ral ? 6 : 0) + (prov === "aer" ? 4 : 0);
    return g;
  }
  /** valorile afișate de analizor (rotunjite ca pe ecranul AVL) */
  function afisaj(g) { return { CO: r2(g.CO, 2), CO2: r2(g.CO2, 1), HC: Math.round(g.HC), O2: r2(g.O2, 2) }; }
  /** frecvența și amplitudinea comutării sondei λ amonte la ≈ 2000 rot/min */
  function sondaLambda(pr) { return pr.defect.tip === "sonda" ? { f: 0.35 * pr.fl, vmin: 0.31, vmax: 0.59 } : { f: 0.9 * pr.fl, vmin: 0.07, vmax: 0.83 }; }
  /* ---------------- prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t41 || {}, o = {};
    var pc = n((T1.contact || {}).p), cc = n((T1.contact || {}).pcol), pr = n((T1.ralanti || {}).p), cr = n((T1.ralanti || {}).pcol);
    o.difC = pc - cc / 100; o.difR = pr - cr / 100; o.delta = o.difC - o.difR;
    o.Qp = n((T1.debit || {}).p) / (60 / 60);
    var lam = function (r) { r = r || {}; return brettschneider(n(r.CO), n(r.CO2), n(r.HC), n(r.O2)); };
    o.lam = {}; ["ralanti", "r2500"].forEach(function (k) { o.lam[k] = lam((t.t42 || {})[k]); });
    ["aer", "rateu", "pres"].forEach(function (k) { o.lam[k] = lam((t.t43 || {})[k]); });
    return o;
  }
  function asteptate(o) { return { q1: o.delta, q2: o.Qp, q3: o.lam.r2500, q4: o.lam.rateu }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "pres") {
        var pe = l.k === "dupa5" ? pRetinere(pr, Number(l.t)) : pRampa(pr, l.k === "contact" ? "contact" : "ralanti", l.k === "faravac");
        ok = ap(l.p, pe, 0.07) && (l.pcol == null || ap(l.pcol, l.k === "contact" ? pr.patm : pCol(pr, "ralanti") + (pr.defect.tip === "aer" ? 6 : 0), 1.5));
      } else if (l.m === "debit") ok = ap(l.V, debitPompa(pr) * Number(l.t) / 60, 0.06);
      else if (l.m === "gaze") {
        var g = stare(pr, l.reg, l.prov || "");
        ok = ap(l.CO, g.CO, 0.03 + 0.06 * g.CO) && ap(l.CO2, g.CO2, 0.25) && ap(l.HC, g.HC, 8 + 0.06 * g.HC) && ap(l.O2, g.O2, 0.04 + 0.06 * g.O2) && ap(l.stft, g.stft, 2.5) && ap(l.ltft, g.ltft, 1.5);
      }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.006); };
    ["contact", "ralanti", "faravac", "dupa5"].forEach(function (k) { var v = U.num(((t.t41 || {})[k] || {}).p); if (isFinite(v) && !inLog(function (l) { return l.m === "pres" && l.k === k && eq(l.p, v); })) out.faraCitire++; });
    var vd = U.num(((t.t41 || {}).debit || {}).p); if (isFinite(vd) && !inLog(function (l) { return l.m === "debit" && eq(l.V, vd, 0.026); })) out.faraCitire++;
    [["t42", "ralanti", ""], ["t42", "r2500", ""], ["t43", "aer", "aer"], ["t43", "rateu", "rateu"], ["t43", "pres", "pres"]].forEach(function (x) {
      var r = (t[x[0]] || {})[x[1]] || {}, co = U.num(r.CO);
      if (isFinite(co) && !inLog(function (l) { return l.m === "gaze" && (l.prov || "") === x[2] && (x[0] === "t43" || l.reg === x[1]) && eq(l.CO, co, 0.006) && eq(l.O2, U.num(r.O2), 0.006) && eq(l.HC, U.num(r.HC), 0.6); })) out.faraCitire++;
    });
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.05], q2: [0.02, 0.02], q3: [0, 0.006], q4: [0, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    var dg = ((t.t44 || {}).d || {}).cauza || "", okD = dg === eticheta(pr.defect);
    if (okD) out.corecte++;
    out.detalii.defect = { raspuns: dg, asteptat: eticheta(pr.defect), corect: okD };
    out.principal = { eticheta: "defect identificat", valoare: okD ? "DA" : "NU" };
    return out;
  }
  return { HCV: HCV, OCV: OCV, K1: K1, TIPURI: TIPURI, CHEI: CHEI, EXPLICATII: EXPLICATII, eticheta: eticheta, optiuniDiag: optiuniDiag, parametri: parametri,
    pCol: pCol, pRampa: pRampa, pRetinere: pRetinere, debitPompa: debitPompa, brettschneider: brettschneider, gaze: gaze, stare: stare, afisaj: afisaj,
    sondaLambda: sondaLambda, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
