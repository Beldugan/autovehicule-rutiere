/* MF – Lucrarea 2. Modelul fizic al piezometrului (folosit identic în aplicație și pe serverul Apps Script).
   Unități: volume în cm³, presiuni în bar (suprapresiune), module în GPa. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l2"] = (function () {
  var P_ATM = 1.0;
  var ST = { V0: 50, d: 10, s: 1, D: 20, e: 5, E: 210, rho: 1050 };
  var FLUIDE = {
    DOT3: { nume: "Lichid de frână DOT 3", K: 1.72, rho: 1040, culoare: "#d9b44a" },
    DOT4: { nume: "Lichid de frână DOT 4", K: 1.68, rho: 1050, culoare: "#d4a93c" },
    DOT51: { nume: "Lichid de frână DOT 5.1", K: 1.78, rho: 1060, culoare: "#d8b65a" },
    DOT5: { nume: "Lichid de frână DOT 5 (siliconic)", K: 1.10, rho: 960, culoare: "#b58ac9" },
    APA: { nume: "Apă (20 °C)", K: 2.20, rho: 998, culoare: "#7fb6e0" },
    ULEI: { nume: "Ulei mineral hidraulic", K: 1.60, rho: 870, culoare: "#c98f2a" },
    MOTORINA: { nume: "Motorină", K: 1.50, rho: 830, culoare: "#e3cf6a" },
    PROBA: { nume: "Probă necunoscută (de determinat)", K: null, rho: 1050, culoare: "#c9a24e" }
  };
  function volRot(d, s) { return Math.PI * d * d / 4 * s / 1000; }
  function corectieCil(D, e, E) { return D / (E * 1e9 * e); }
  function KmDinK(K, D, e, E) { return 1 / (1 / (K * 1e9) + corectieCil(D, e, E)) / 1e9; }
  function KDinKm(Km, D, e, E) { var inv = 1 / (Km * 1e9) - corectieCil(D, e, E); return inv > 0 ? 1 / inv / 1e9 : NaN; }
  function volAer(Va0, p) { return Va0 * (1 - P_ATM / (P_ATM + Math.max(0, p))); }
  function volumAbsorbit(c, p) { var Cm = 1 / (c.K * 1e9) + corectieCil(c.D, c.e, c.E); return c.V0 * p * 1e5 * Cm + volAer(c.Vaer, p) + (c.Cf || 0) * p; }
  function presiuneDinVolum(c, dV) {
    if (dV <= 0) return 0;
    var a = 0, b = 50;
    while (volumAbsorbit(c, b) < dV && b < 1e6) b *= 2;
    for (var i = 0; i < 80; i++) { var m = (a + b) / 2; if (volumAbsorbit(c, m) < dV) a = m; else b = m; }
    return (a + b) / 2;
  }
  function celeritate(K, rho) { return Math.sqrt(K * 1e9 / rho); }
  function comprimareRelativa(K0, Kp, p_bar) { var p = p_bar * 1e5, k = K0 * 1e9; return Kp <= 0 ? 1 - Math.exp(-p / k) : 1 - Math.pow(1 + Kp * p / k, -1 / Kp); }
  /** citirea manometrului (eroarea de clasă proprie fiecărui student) */
  function citire(p, pr) { return p <= 0.05 ? 0 : p * (1 + pr.errGain) + pr.errOff * Math.min(1, p / 5); }
  /** parametrii individuali secreți (din seed-ul primit de la server) */
  function parametri(seed) {
    var r = mulberry32(seed);
    return { errOff: (r() * 2 - 1) * 0.8, errGain: (r() * 2 - 1) * 0.006, Klot: 1.68 * (1 + (r() * 2 - 1) * 0.04) };
  }
  /** răspunsurile așteptate la întrebările individuale */
  function asteptate(t, Va0, KmR, KR) {
    var ar = volRot(ST.d, ST.s), n = function (v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : NaN; };
    var n100a = n(t.t22 && t.t22["100"] && t.t22["100"].inc), n100b = n(t.t23 && t.t23["100"] && t.t23["100"].n), n20b = n(t.t23 && t.t23["20"] && t.t23["20"].n);
    return {
      q1: isFinite(n20b) && isFinite(KmR) ? n20b * ar - ST.V0 * 20 * 1e5 / (KmR * 1e9) : NaN,
      q2: n100b - n100a,
      q3: isFinite(KR) ? celeritate(KR, 1050) : NaN,
      q4: Va0 * (1 - 1 / 41) * 1000 / (Math.PI * 22.22 * 22.22 / 4) * 4
    };
  }
  /** verificarea pe server a unui referat trimis */
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var ar = volRot(ST.d, ST.s), log = (d.log || []).filter(function (l) { return l.dir === "inc" || l.dir === "desc"; });
    log.forEach(function (l) {
      var Vaer = (Number(l.Vinj) || 0) + (l.aerisit ? 0 : 0.25);
      var p = presiuneDinVolum({ V0: ST.V0, K: pr.Klot, D: ST.D, e: ST.e, E: ST.E, Vaer: Vaer }, Number(l.n) * ar);
      if (Math.abs(citire(p, pr) - Number(l.p)) > 1.0) out.incompatibile++;
    });
    var t = d.tabele || {}, xs = [0], ys = [0];
    var inLog = function (n, v, dir) { return log.some(function (l) { return l.var === v && (!dir || l.dir === dir) && Math.abs(Number(l.n) - n) < 0.006; }); };
    Object.keys(t.t22 || {}).forEach(function (p) {
      ["inc", "desc"].forEach(function (k) { var n = U.num(t.t22[p][k]); if (!isFinite(n)) return; if (!inLog(n, "a", k)) out.faraCitire++; if (k === "inc") { xs.push(n * ar); ys.push(Number(p)); } });
    });
    Object.keys(t.t23 || {}).forEach(function (p) { var n = U.num(t.t23[p].n); if (isFinite(n) && !inLog(n, "b", "inc")) out.faraCitire++; });
    var KmR = NaN, KR = NaN;
    if (xs.length >= 3) { var rg = U.regresie(xs, ys); KmR = ST.V0 * rg.b * 1e5 / 1e9; KR = KDinKm(KmR, ST.D, ST.e, ST.E); }
    out.principal = { eticheta: "K [GPa]", valoare: isFinite(KR) ? Math.round(KR * 1000) / 1000 : "" };
    var a = asteptate(t, U.num(d.varianta && d.varianta.Va0) || 0, KmR, KR), tol = { q1: 0.06, q2: 0.03, q3: 0.015, q4: 0.03 }, rasp = d.raspunsuri || {};
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.max(Math.abs(a[k]) * tol[k], k === "q2" ? 0.03 : 0.002);
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    return out;
  }
  return { P_ATM: P_ATM, ST: ST, FLUIDE: FLUIDE, volRot: volRot, corectieCil: corectieCil, KmDinK: KmDinK, KDinKm: KDinKm, volAer: volAer,
    volumAbsorbit: volumAbsorbit, presiuneDinVolum: presiuneDinVolum, celeritate: celeritate, comprimareRelativa: comprimareRelativa,
    citire: citire, parametri: parametri, asteptate: asteptate, verifica: verifica };
})();
