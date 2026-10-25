/* MAM I – Lucrarea 5. Senzorul de presiune absolută din colector (MAP): calibrare și calculul densității aerului.
   Modelul standului: senzor MAP auto de 2,5 bar (20…250 kPa → 0,4…4,65 V, ratiometric la 5 V al plăcii), exemplarul propriu (pantă,
   decalaj, curbură), circuitul pneumatic (pompa manuală de vid/presiune, teul, manometrul etalon digital de presiune relativă, furtunurile
   cu coliere, scurgerea lentă), BMP280 pentru presiunea atmosferică și temperatura aerului, ADC 10 biți, eliberarea bruscă a presiunii
   (răspunsul dinamic, eșantionare la 10 ms) și programul cu parametrii calibrării. Același model este folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l5"] = (function () {
  var TINTE = [-70, -50, -30, 0, 30, 60, 90], A0N = (4.65 - 0.4) / 230, B0N = 0.4 - A0N * 20, RA = 287, NS = 100, DTS = 0.01, PRE = 5;
  var PG = { ral: { et: "Ralanti (≈ 35 kPa abs.)", min: 25, max: 45 }, atm: { et: "Sarcină plină, aspirat (p<sub>atm</sub>)", min: -1, max: 1 }, sup: { et: "Supraalimentat (≈ 170 kPa abs.)", min: 150, max: 195 } };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      patm: r2(u(99.2, 102.8), 3), Taer: r2(u(20.5, 25.5), 2), vs: r2(u(4.86, 5.02), 3),
      a0: r2(A0N * u(0.985, 1.015), 6), b0: r2(B0N + u(-0.03, 0.03), 4), nl: r2((r() < 0.5 ? -1 : 1) * u(0.006, 0.02), 4), sig: r2(u(0.0008, 0.0016), 5),
      eB: r2(u(-0.1, 0.1), 3), eBT: r2(u(0.5, 1.2), 2), eM: r2(u(-0.15, 0.15), 3), gM: r2(u(-0.002, 0.002), 5),
      V0: r2(u(28, 36), 2), Vc: r2(u(8, 10), 2), tLeak: Math.round(u(15000, 40000)), tRel: r2(u(0.035, 0.085), 4), tSlow: r2(u(2.5, 4), 2)
    };
  }
  /** tensiunea absolută a senzorului [V] la presiunea absolută p [kPa] */
  function uMAP(pr, p) { return pr.vs / 5 * (pr.a0 * p + pr.b0 + pr.nl * Math.sin(Math.PI * (p - 20) / 230)); }
  /** citirea programului: U = N·5/1024 (ratiometric) */
  function uProg(pr, p, rnd) { var x = uMAP(pr, p) / pr.vs * 1024 + (rnd ? gs(rnd) * pr.sig / pr.vs * 1024 : 0); var N = rnd ? Math.floor(x) : x - 0.5; return Math.max(0, Math.min(1023, N)) * 5 / 1024; }
  var gs = function (rnd) { var a = 0, b = 0; while (!a) a = rnd(); while (!b) b = rnd(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
  /** manometrul etalon (presiune relativă, rezoluție 0,1 kPa) */
  function etalon(pr, prel) { return Math.round((prel * (1 + pr.gM) + pr.eM) * 10) / 10; }
  function bmpP(pr) { return Math.round((pr.patm + pr.eB) * 100) / 100; }
  function bmpT(pr) { return Math.round((pr.Taer + pr.eBT) * 100) / 100; }
  /** o cursă a pompei: vid (aerul din sistem trece în cilindrul pompei, care se golește în atmosferă) sau presiune (cilindrul plin cu aer
      atmosferic se descarcă în sistem). Întoarce presiunea absolută de echilibru după cursă. */
  function cursa(pr, p, mod) {
    if (mod === "vid") return Math.max(8, p * pr.V0 / (pr.V0 + pr.Vc));
    return p + pr.patm * pr.Vc / pr.V0 * Math.max(0, 1 - (p - pr.patm) / 260);
  }
  /** înregistrarea eliberării bruște: 100 de eșantioane la 10 ms (5 înainte de deschiderea supapei) */
  function eliberare(pr, p0, rnd) {
    var ph = rnd ? rnd() * DTS : DTS / 2, tr = PRE * DTS - ph, s = [];
    for (var i = 0; i < NS; i++) { var t = i * DTS, p = t < tr ? p0 : pr.patm + (p0 - pr.patm) * Math.exp(-(t - tr) / pr.tRel); s.push(r2(uProg(pr, p, rnd), 4)); }
    return s;
  }
  /** momentele de trecere prin 90 % și 10 % din treaptă (primul eșantion care le atinge) */
  function treceri(s) {
    var a = 0, n = 0; for (var i = 0; i < PRE; i++) { a += s[i]; n++; } a /= n;
    var b = 0; for (i = s.length - 10; i < s.length; i++) b += s[i]; b /= 10;
    var u90 = b + 0.9 * (a - b), u10 = b + 0.1 * (a - b), sus = a > b, k90 = -1, k10 = -1;
    for (i = PRE; i < s.length; i++) { var x = s[i]; if (k90 < 0 && (sus ? x <= u90 : x >= u90)) k90 = i; if (k10 < 0 && (sus ? x <= u10 : x >= u10)) { k10 = i; break; } }
    return { u0: a, uInf: b, u90: u90, u10: u10, t90: k90 * DTS * 1000, t10: k10 * DTS * 1000, k90: k90, k10: k10 };
  }
  function regresie_(xs, ys) {
    var n = xs.length, sx = 0, sy = 0, sxy = 0, sxx = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxy += xs[i] * ys[i]; sxx += xs[i] * xs[i]; }
    var a = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: a, b: sy / n - a * sx / n };
  }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t51 || {}, T2 = t.t52 || {}, o = { pts: [] };
    o.patm = n((T2.patm || {}).v); var pa = isFinite(o.patm) ? o.patm : 101.3;
    for (var i = 1; i <= 7; i++) { var r = T1["p" + i] || {}, pr_ = n(r.prel), u = n(r.u); if (isFinite(pr_) && isFinite(u)) o.pts.push([pa + pr_, u, i]); }
    if (o.pts.length >= 2) {
      var g = regresie_(o.pts.map(function (p) { return p[0]; }), o.pts.map(function (p) { return p[1]; })); o.a = g.a; o.b = g.b;
      var us = o.pts.map(function (p) { return p[1]; }), dmax = 0; o.pts.forEach(function (p) { dmax = Math.max(dmax, Math.abs(p[1] - (g.a * p[0] + g.b))); });
      o.dmax = dmax; o.elin = dmax / (Math.max.apply(null, us) - Math.min.apply(null, us)) * 100;
    } else { o.a = o.b = o.elin = o.dmax = NaN; }
    o.tr = n((T2.tr || {}).v);
    return o;
  }
  var Q4 = 100000 / (RA * 313.15);
  function asteptate(o) { return { q1: o.a, q2: o.b, q3: o.elin, q4: Q4 }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, rec = null;
    var ap = function (a, b, tol) { return isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "patm") ok = ap(l.v, bmpP(pr), 0.011) && ap(l.T, bmpT(pr), 0.3);
      else if (l.m === "pt") { var prel = (Number(l.prel) - pr.eM) / (1 + pr.gM); ok = ap(l.U, uMAP(pr, pr.patm + prel), 0.0035 + pr.a0 * 0.3); }
      else if (l.m === "tr") { rec = l; var c = treceri(l.s || []), tt = pr.tRel * Math.log(9) * 1000; ok = (l.s || []).length === NS && c.k10 > 0 && Math.abs(c.t10 - c.t90 - tt) <= 22 + 0.15 * tt; }
      else if (l.m === "t9") { var s = rec && rec.s; if (!s) ok = false; else { var c2 = treceri(s); ok = ap(l.t90, c2.t90, 0.5) && ap(l.t10, c2.t10, 0.5); } }
      else if (l.m === "pg") { var pt = Number(l.pE) - bmpP(pr) - pr.eM, pabs = pr.patm + pt / (1 + pr.gM), pp = (uProg(pr, pabs, null) - Number(l.B)) / Number(l.A);
        ok = ap(l.pP, pp, (0.004 + pr.a0 * 0.4) / Math.abs(Number(l.A)) + 0.2) && ap(l.rho, Number(l.pP) * 1000 / (RA * (Number(l.T) + 273.15)), 0.004); }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    var T1 = t.t51 || {}, T2 = t.t52 || {}, T3 = t.t53 || {};
    for (var i = 1; i <= 7; i++) { var r = T1["p" + i] || {};
      [["prel", "prel", 0.051], ["u", "U", 0.0006]].forEach(function (z) { var v = U.num(r[z[0]]); if (isFinite(v) && !areCit(function (l) { return l.m === "pt" && Number(l.k) === i && eq(l[z[1]], v, z[2]); })) out.faraCitire++; }); }
    var vp = U.num((T2.patm || {}).v); if (isFinite(vp) && !areCit(function (l) { return l.m === "patm" && eq(l.v, vp, 0.006); })) out.faraCitire++;
    var vt = U.num((T2.tr || {}).v); if (isFinite(vt) && !areCit(function (l) { return l.m === "t9" && eq(Number(l.t10) - Number(l.t90), vt, 0.6); })) out.faraCitire++;
    Object.keys(PG).forEach(function (k) { var r = T3[k] || {}; ["pE", "pP", "rho"].forEach(function (c) { var v = U.num(r[c]); if (isFinite(v) && !areCit(function (l) { return l.m === "pg" && l.k === k && eq(l[c], v, c === "rho" ? 0.0006 : 0.051); })) out.faraCitire++; }); });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.004, 0.00002], q2: [0, 0.01], q3: [0.15, 0.08], q4: [0, 0.005] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100000) / 100000 : "—", corect: ok };
    });
    out.principal = { eticheta: "a [V/kPa]", valoare: isFinite(o.a) ? Math.round(o.a * 100000) / 100000 : "" };
    return out;
  }
  return { TINTE: TINTE, PG: PG, RA: RA, NS: NS, DTS: DTS, PRE: PRE, A0N: A0N, B0N: B0N, parametri: parametri, uMAP: uMAP, uProg: uProg, etalon: etalon, bmpP: bmpP, bmpT: bmpT,
    cursa: cursa, eliberare: eliberare, treceri: treceri, regresie: regresie_, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
