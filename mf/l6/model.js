/* MF – Lucrarea 6. Pierderi de sarcină longitudinale și locale într-un circuit de răcire.
   Modelul standului: conducta dreaptă d = 17 mm (L = 1,5 m între prizele 1–2), lărgirea bruscă 17/26 mm (prizele 2–3), îngustarea bruscă
   26/17 mm (4–5), cotul 90° (5–6, 0,30 m de conductă între prize), robinetul cu bilă (6–7, 0,20 m între prize), debitmetrul,
   robinetul de reglare, panoul de piezometre presurizat; λ după Colebrook cu rugozitatea și diametrul real ale exemplarului,
   coeficienții ξ proprii, pompa electrică de 12 V (H = H0 − a·Q²) pentru punctul de funcționare. Parametrii sunt individuali;
   același model este folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l6"] = (function () {
  var G = 9.81, D1 = 0.017, D2 = 0.026, L12 = 1.5, L56 = 0.30, L67 = 0.20, L23 = 0.05, L45 = 0.15;
  var TNU = [[10, 1.306], [15, 1.139], [20, 1.004], [25, 0.893], [30, 0.801], [40, 0.658]];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return { T: r2(u(16, 24), 1), d1: r2(u(16.9, 17.1), 2), k: r2(u(0.001, 0.004), 4), fL: r2(u(1.0, 1.05), 3), xCot: r2(u(0.55, 0.75), 3), xIng: r2(u(0.27, 0.33), 3), xRob: r2(u(0.08, 0.18), 3),
      xRobP: r2(u(5, 9), 2), Qmax: r2(u(0.42, 0.48), 3), kV: r2(u(1.3, 1.7), 2), H0: r2(u(3.8, 4.3), 2), aP: r2(u(0.9e7, 1.1e7), -4), MS: r2(u(0.95e7, 1.15e7), -4) };
  }
  function nu(T) { for (var i = 0; i < TNU.length - 1; i++) { var a = TNU[i], b = TNU[i + 1]; if (T <= b[0]) return a[1] + (b[1] - a[1]) * Math.max(0, T - a[0]) / (b[0] - a[0]); } return TNU[TNU.length - 1][1]; }
  function colebrook(re, kd) { var l = 0.02; for (var i = 0; i < 30; i++) l = Math.pow(-2 * Math.log10(2.51 / (re * Math.sqrt(l)) + kd / 3.71), -2); return l; }
  function lambdaRe(re, kd) { return re < 2300 ? 64 / re : colebrook(re, kd); }
  /** debitul [L/s] la deschiderea a [%] a robinetului de reglare (robinetul cu bilă deschis / parțial) */
  function debit(pr, a, partial) { var q = pr.Qmax * Math.pow(Math.max(0, Math.min(100, a)) / 100, 1 / pr.kV); return partial ? q * 0.62 : q; }
  /** diferențele de cotă piezometrică [m]: 1–2, 2–3, 4–5, 5–6, 6–7 (valori reale, ale exemplarului) */
  function dh(pr, Q, partial) {
    var q = Q / 1000, d1 = pr.d1 / 1000, A1 = Math.PI * d1 * d1 / 4, A2 = Math.PI * D2 * D2 / 4, v1 = q / A1, v2 = q / A2, ny = nu(pr.T) * 1e-6;
    var re1 = v1 * d1 / ny, re2 = v2 * D2 / ny, l1 = lambdaRe(re1, pr.k / 1000 / d1) * pr.fL, l2 = lambdaRe(re2, pr.k / 1000 / D2) * pr.fL, k1 = v1 * v1 / 2 / G, k2 = v2 * v2 / 2 / G;
    var fr = function (L, l, kk, d) { return l * L / d * kk; };
    var hExp = Math.pow(v1 - v2, 2) / 2 / G;
    return [fr(L12, l1, k1, d1), fr(L23, l1, k1, d1) + fr(0.25, l2, k2, D2) + hExp - (k1 - k2), fr(0.05, l2, k2, D2) + pr.xIng * k1 + (k1 - k2) + fr(L45, l1, k1, d1),
      pr.xCot * k1 + fr(L56, l1, k1, d1), (partial ? pr.xRobP : pr.xRob) * k1 + fr(L67, l1, k1, d1)];
  }
  /** pompa electrică de 12 V în circuitul echivalent: punctul de funcționare (robinetul deschis / termostatul parțial închis ⇒ M dublat) */
  function punctFunctionare(pr, partial) { var M = pr.MS * (partial ? 2 : 1), q = Math.sqrt(pr.H0 / (pr.aP + M)); return { Q: q * 1000, H: pr.H0 - pr.aP * q * q }; }
  var A1N = Math.PI * D1 * D1 / 4, A2N = Math.PI * D2 * D2 / 4;
  /** prelucrarea tabelelor (calcule cu d = 17 mm nominal și ν(T măsurat)) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, T = n(((t.t60 || {}).T || {}).v), ny = (isFinite(T) ? nu(T) : 1.004) * 1e-6, o = { r: {} };
    for (var i = 1; i <= 5; i++) {
      var r = (t.t62 || {})["r" + i] || {}, Q = n(r.Q) / 1000, v = Q / A1N, kk = v * v / 2 / G, re = v * D1 / ny, h = ["h12", "h23", "h45", "h56", "h67"].map(function (c) { return n(r[c]) / 1000; });
      var lm = h[0] / (L12 / D1 * kk), lb = 0.3164 / Math.pow(re, 0.25), v2 = Q / A2N, k2 = v2 * v2 / 2 / G;
      o.r["r" + i] = { v: v, re: re, lm: lm, lb: lb, lc: colebrook(re, 0.0015 / 17), xc: (h[3] - lm * L56 / D1 * kk) / kk, xi: (h[2] - lm * L45 / D1 * kk - (kk - k2)) / kk, xr: (h[4] - lm * L67 / D1 * kk) / kk, hExpTeor: Math.pow(v - v2, 2) / 2 / G, Q: Q * 1000 };
    }
    var v1 = o.r.r1; o.lm1 = v1.lm;
    var ok = [1, 2, 3, 4, 5].map(function (i) { return o.r["r" + i]; }).filter(function (x) { return isFinite(x.xc); });
    o.xcMed = ok.length ? ok.reduce(function (s, x) { return s + x.xc; }, 0) / ok.length : NaN;
    var xiMed = ok.length ? ok.reduce(function (s, x) { return s + x.xi; }, 0) / ok.length : NaN, xExp = Math.pow(1 - A1N / A2N, 2);
    o.sumXi = 2 * o.xcMed + xExp + xiMed + 2.5; o.M = 8 * (v1.lm * 4.0 / D1 + o.sumXi) / (G * Math.PI * Math.PI * Math.pow(D1, 4)); o.Qop = Math.sqrt(4 / (1e7 + o.M)) * 1000;
    return o;
  }
  function asteptate(o) { return { q1: o.lm1, q2: o.xcMed, q3: o.M, q4: o.Qop }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "T") ok = ap(l.v, pr.T, 0.15);
      else if (l.m === "h") { var Q = debit(pr, Number(l.a), !!l.partial); ok = ap(l.Q, Q, Q * 0.015 + 0.002); var H = dh(pr, Q, !!l.partial); (l.dh || []).forEach(function (x, i) { if (!ap(x, H[i] * 1000, 6 + Math.abs(H[i] * 1000) * 0.02)) ok = false; }); }
      else if (l.m === "pf") { var p = punctFunctionare(pr, !!l.partial); ok = ap(l.Q, p.Q, 0.012) && ap(l.H, p.H, 0.05); }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= e; };
    for (var i = 1; i <= 5; i++) { var r = (t.t62 || {})["r" + i] || {}, Q = U.num(r.Q); if (isFinite(Q) && !areCit(function (l) { return l.m === "h" && l.k === "r" + i && eq(l.Q, Q, 0.0006); })) out.faraCitire++; }
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.02, 0.0005], q2: [0.03, 0.02], q3: [0.03, 1e4], q4: [0.01, 0.002] };
    Object.keys(a).forEach(function (k) { var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? (Math.abs(a[k]) > 1000 ? Math.round(a[k]) : Math.round(a[k] * 10000) / 10000) : "—", corect: ok }; });
    out.principal = { eticheta: "λ măsurat (debitul maxim)", valoare: isFinite(o.lm1) ? Math.round(o.lm1 * 10000) / 10000 : "" };
    return out;
  }
  return { G: G, D1: D1, D2: D2, L12: L12, L56: L56, L67: L67, L45: L45, TNU: TNU, parametri: parametri, nu: nu, colebrook: colebrook, debit: debit, dh: dh, punctFunctionare: punctFunctionare, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
