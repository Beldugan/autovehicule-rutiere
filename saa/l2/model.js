/* SAA – Lucrarea 2. Modelarea duratei de injecție pe baza debitului de aer (speed-density) – aplicație virtuală.
   Fișa individuală a postului de lucru (măsurătorile de pe standul 1.4 MPI, ca la lucrarea 1) se generează din modelul
   lucrării 1 cu seed-ul studentului; modelul de calcul al aplicației și verificarea sunt folosite identic pe server. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l2"] = (function () {
  var R = 287, VS = 3.475e-4, TA = 300, L0 = 14.7, UREF = 13.9;
  var CHEI = ["ral", "n1500", "n2000", "n2500", "n3000"];
  var ET = { ral: "ralanti", n1500: "1500", n2000: "2000", n2500: "2500", n3000: "3000" };
  var SENS = { U12: { et: "U<sub>bat</sub> = 12 V", U: 12, Ta: TA }, U145: { et: "U<sub>bat</sub> = 14,5 V", U: 14.5, Ta: TA }, T10: { et: "T<sub>a</sub> = 10 °C (283 K)", U: UREF, Ta: 283 }, T50: { et: "T<sub>a</sub> = 50 °C (323 K)", U: UREF, Ta: 323 } };
  var CHEI_SENS = ["U12", "U145", "T10", "T50"];
  var COMB = { benzina: { et: "Benzină (E5)", L0: 14.7 }, e10: { et: "Benzină E10", L0: 14.1 }, e85: { et: "Etanol E85", L0: 9.8 }, gpl: { et: "GPL (lichid)", L0: 15.5 } };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function L1() { return MODELE["saa-l1"]; }
  /** fișa postului: q_s și t_mort determinate la lucrarea 1 și citirile din Tabelul 1.2 (motor cald, fără consumatori) */
  function parametri(seed) {
    var m = L1(), pr = m.parametri(seed), fisa = {};
    CHEI.forEach(function (k) { fisa[k] = { n: m.REG[k].n, p: r2(m.presiune(pr, k), 1), ti: r2(m.tiReg(pr, k), 2) }; });
    return { pr: pr, qs: r2(pr.qs, 3), tm0: r2(pr.tm0, 3), fisa: fisa };
  }
  /** timpul mort la tensiunea U (legea injectorului de pe stand) */
  function tmort(P, U) { return P.tm0 * Math.pow(14 / U, 1.5); }
  /** modelul aplicației: intrări { p [kPa], n, Ta [K], ev, lam, U, L0, qs, tm0 } */
  function calcul(x) {
    var ma = x.ev * x.p * 1000 * (x.Vs ? x.Vs * 1e-6 : VS) / (R * x.Ta) * 1e6;   // [mg]; V_s în cm³
    var mc = ma / (x.lam * x.L0);
    var tm = x.tm0 * Math.pow(14 / x.U, 1.5);
    var ti = mc / x.qs + tm;
    return { ma: ma, mc: mc, tm: tm, ti: ti, dc: x.n > 0 ? ti / (120000 / x.n) * 100 : NaN };
  }
  /** η_v care anulează eroarea (inversarea relațiilor 2.1–2.3) */
  function evExact(P, k, Ta) { var f = P.fisa[k]; return (f.ti - tmort(P, UREF)) * P.qs * L0 * R * (Ta || TA) / (f.p * 1000 * VS * 1e6); }
  function intrari(P, k, ev) { var f = P.fisa[k]; return { p: f.p, n: f.n, Vs: 347.5, Ta: TA, ev: ev, lam: 1, U: UREF, L0: L0, qs: P.qs, tm0: P.tm0 }; }
  function asteptate(P) {
    var e0 = evExact(P, "ral");
    var tiE85 = calcul({ p: P.fisa.ral.p, n: 800, Vs: 347.5, Ta: TA, ev: e0, lam: 1, U: UREF, L0: 9.8, qs: P.qs, tm0: P.tm0 }).ti;
    return { q1: e0, q2: evExact(P, "n3000"), q3: tmort(P, 12) - tmort(P, 14.5), q4: tiE85 };
  }
  function verifica(d, P, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "c08" || l.m === "cadj") {
        var f = P.fisa[l.k];
        ok = !!f && ap(l.p, f.p, 0.051) && ap(l.n, f.n, 1) && ap(l.qs, P.qs, 0.0005) && ap(l.tm0, P.tm0, 0.0005) && ap(l.U, UREF, 0.001) && ap(l.Ta, TA, 0.01) && ap(l.L0, L0, 0.001) && ap(l.lam, 1, 0.0001) && ap(l.Vs, 347.5, 0.01);
        if (ok) ok = ap(l.ti, calcul(l).ti, 0.006);
        if (ok && l.m === "c08") ok = ap(l.ev, 0.8, 0.0001);
        if (ok && l.m === "cadj") ok = Math.abs(calcul(l).ti - f.ti) / f.ti <= 0.05 + 1e-9;
      } else if (l.m === "sens") {
        var s = SENS[l.k]; ok = !!s && ap(l.Vs, 347.5, 0.01) && ap(l.U, s.U, 0.001) && ap(l.Ta, s.Ta, 0.01) && ap(l.p, P.fisa.ral.p, 0.051) && ap(l.qs, P.qs, 0.0005) && ap(l.tm0, P.tm0, 0.0005) && ap(l.ti, calcul(l).ti, 0.006);
      }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0051); };
    CHEI.forEach(function (k) {
      var r = (t.t21 || {})[k] || {};
      var a = U.num(r.ti08); if (isFinite(a) && !inLog(function (l) { return l.m === "c08" && l.k === k && eq(l.ti, a); })) out.faraCitire++;
      var b = U.num(r.tiAdj); if (isFinite(b) && !inLog(function (l) { return l.m === "cadj" && l.k === k && eq(l.ti, b); })) out.faraCitire++;
      var e = U.num(r.ev); if (isFinite(e) && !inLog(function (l) { return l.m === "cadj" && l.k === k && eq(l.ev, e, 0.00051); })) out.faraCitire++;
    });
    CHEI_SENS.forEach(function (k) { var v = U.num(((t.t22 || {})[k] || {}).ti); if (isFinite(v) && !inLog(function (l) { return l.m === "sens" && l.k === k && eq(l.ti, v); })) out.faraCitire++; });
    var a = asteptate(P), rasp = d.raspunsuri || {};
    var evR = U.num(((t.t21 || {}).ral || {}).ev);
    out.principal = { eticheta: "η_v la ralanti [–]", valoare: isFinite(evR) ? Math.round(evR * 1000) / 1000 : null };
    var tol = { q1: [0.01, 0.003], q2: [0.01, 0.003], q3: [0.03, 0.005], q4: [0.01, 0.01] };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 1000) / 1000, corect: ok };
    });
    return out;
  }
  return { R: R, VS: VS, TA: TA, L0: L0, UREF: UREF, CHEI: CHEI, ET: ET, SENS: SENS, CHEI_SENS: CHEI_SENS, COMB: COMB,
    parametri: parametri, tmort: tmort, calcul: calcul, evExact: evExact, intrari: intrari, asteptate: asteptate, verifica: verifica };
})();
