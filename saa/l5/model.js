/* SAA – Lucrarea 5. Sistemul de răcire și managementul termic (standul K7J 1.4 MPI, lichid G12 50 % glicol).
   Modelul: termostatul cu element de ceară (început de deschidere T0, cursă liniară până la T0 + ΔT, cursa nominală),
   încălzirea motorului la ralanti pe stand – două mase termice (motorul cu lichidul din el și radiatorul), debitul pompei împărțit
   între circuitul mic și radiator după deschiderea termostatului, radiatorul fără aer de înaintare (convecție naturală) sau cu
   electroventilatorul cuplat cu histerezis, testul de etanșeitate și bușonul. Parametrii sunt individuali; același model este
   folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l5"] = (function () {
  var TAPA = [80, 84, 86, 88, 90, 94, 98, 100], TMIN = [0, 2, 4, 6, 8, 10, 12, 14], DT = 0.5, TFIN = 20 * 60;
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var T0m = [83, 86, 89][Math.floor(r() * 3)];
    return {
      T0m: T0m, T0: r2(T0m + u(-1.6, 1.6), 2), dT: r2(u(12, 15), 2), smax: r2(u(7.6, 9.4), 2),
      Ton: r2(u(98, 101), 1), hist: r2(u(4, 6), 1), Pin: r2(u(2.9, 3.3), 3), Cm: r2(u(15, 18), 2), Ta: r2(u(20, 24), 1),
      UAoff: r2(u(0.018, 0.024), 4), UAon: r2(u(0.15, 0.19), 3), pCap: r2(u(1.2, 1.45), 2), scurg: r2(u(0.004, 0.02), 3)
    };
  }
  var CP = 3.5, MD = 0.22, CR = 3.0, UAM = 0.008, BLEED = 0.005, TAUW = 25;
  /** cursa termostatului la echilibru [mm] la temperatura apei T [°C] */
  function cursa(pr, T) { return pr.smax * Math.max(0, Math.min(1, (T - pr.T0) / pr.dT)); }
  /** simularea încălzirii la ralanti de la rece (pas 0,5 s, 20 min); defect: "" | "deschis" | "inchis" | "ventilator" | "colmatat" */
  var cache = {};
  function incalzire(pr, defect) {
    defect = defect || "";
    var k = JSON.stringify(pr) + "|" + defect; if (cache[k]) return cache[k];
    var Tm = pr.Ta, Tr = pr.Ta, x = defect === "deschis" ? 1 : 0, fan = 0, Ton = pr.Ton, Toff = pr.Ton - pr.hist;
    var o = { Tm: [], Tr: [], x: [], fan: [] }, n = Math.round(TFIN / DT);
    for (var i = 0; i <= n; i++) {
      if (i % 2 === 0) { o.Tm.push(Tm); o.Tr.push(Tr); o.x.push(x); o.fan.push(fan); }
      var xT = defect === "deschis" ? 1 : defect === "inchis" ? 0 : Math.max(0, Math.min(1, (Tm - pr.T0) / pr.dT));
      x += (xT - x) * DT / TAUW;
      if (defect !== "ventilator") { if (Tm >= Ton) fan = 1; else if (Tm <= Toff) fan = 0; }
      var md = MD * (BLEED + (1 - BLEED) * x), UA = (fan ? pr.UAon : pr.UAoff) * (defect === "colmatat" ? 0.5 : 1);
      var q = md * CP * (Tm - Tr);
      Tm += (pr.Pin - q - UAM * (Tm - pr.Ta)) / pr.Cm * DT;
      Tr += (q - UA * (Tr - pr.Ta)) / CR * DT;
      if (Tm > 126) Tm = 126;   // fierbere: presiunea depășește deschiderea bușonului, lichidul se pierde prin vasul de expansiune
    }
    cache[k] = o; return o;
  }
  /** starea la momentul t [s] (interpolare la 1 s): Tm, Tr, x, fan */
  function stare(pr, t, defect) {
    var o = incalzire(pr, defect), i = Math.max(0, Math.min(o.Tm.length - 2, Math.floor(t))), f = Math.max(0, Math.min(1, t - i));
    return { Tm: o.Tm[i] + (o.Tm[i + 1] - o.Tm[i]) * f, Tr: o.Tr[i] + (o.Tr[i + 1] - o.Tr[i]) * f, x: o.x[i] + (o.x[i + 1] - o.x[i]) * f, fan: o.fan[f < 0.5 ? i : i + 1] };
  }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = (t.t51 || {}).s || {}, T2 = t.t52 || {}, T3 = t.t53 || {}, o = {};
    var pts = TAPA.map(function (T) { return [T, n(T1["a" + T])]; }).filter(function (p) { return isFinite(p[1]); });
    o.smax = pts.length ? Math.max.apply(null, pts.map(function (p) { return p[1]; })) : NaN;
    var lin = pts.filter(function (p) { return p[1] > 0.05 && p[1] < 0.97 * o.smax; });
    var rg = lin.length >= 2 ? U.regresie(lin.map(function (p) { return p[0]; }), lin.map(function (p) { return p[1]; })) : null;
    o.rg = rg; o.T0 = rg && rg.b ? -rg.a / rg.b : NaN; o.panta = rg ? rg.b : NaN; o.pts = pts;
    var tm = function (m) { return n((T2.tm || {})["m" + m]); }, tr = function (m) { return n((T2.tr || {})["m" + m]); };
    o.vInc = (tm(4) - tm(0)) / 4;
    o.dTrad = tm(14) - tr(14);
    o.hist = n((T3.ton || {}).v) - n((T3.toff || {}).v);
    o.scurg = (n((T3.p0 || {}).v) - n((T3.p2 || {}).v)) / 2;
    return o;
  }
  function asteptate(o) { return { q1: o.T0, q2: o.vInc, q3: o.hist, q4: o.dTrad }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, sim = incalzire(pr, "");
    log.forEach(function (l) {
      if (l.m === "s") { if (Math.abs(Number(l.s) - cursa(pr, Number(l.T))) > 0.09) out.incompatibile++; }
      if (l.m === "t") { var st = stare(pr, Number(l.ts), ""); if (Math.abs(Number(l.Tm) - Math.round(st.Tm)) > 1 || Math.abs(Number(l.Tr) - st.Tr) > 0.8) out.incompatibile++;
        var a = stare(pr, Number(l.ts) - 3, "").fan, b = stare(pr, Number(l.ts) + 3, "").fan; if (Number(l.v) !== st.fan && a === b) out.incompatibile++; }
      if (l.m === "v") { var ref = l.ev === "on" ? pr.Ton : pr.Ton - pr.hist; if (Math.abs(Number(l.T) - ref) > 1.01) out.incompatibile++; }
      if (l.m === "p") { if (l.k === "cap" && Math.abs(Number(l.v) - pr.pCap) > 0.03) out.incompatibile++; }
    });
    var areCit = function (fn) { return log.some(fn); };
    var T1 = (t.t51 || {}).s || {};
    TAPA.forEach(function (T) { var v = U.num(T1["a" + T]); if (isFinite(v) && !areCit(function (l) { return l.m === "s" && Math.abs(Number(l.T) - T) <= 0.35 && Math.abs(Number(l.s) - v) < 0.006; })) out.faraCitire++; });
    var T2 = t.t52 || {};
    TMIN.forEach(function (m) { ["tm", "tr", "v"].forEach(function (r) { var v = U.num((T2[r] || {})["m" + m]); if (isFinite(v) && !areCit(function (l) { return l.m === "t" && Math.abs(Number(l.ts) - m * 60) <= 15 && Math.abs(Number(l[r === "tm" ? "Tm" : r === "tr" ? "Tr" : "v"]) - v) < 0.06; })) out.faraCitire++; }); });
    var T3 = t.t53 || {};
    [["ton", "v", "on"], ["toff", "v", "off"]].forEach(function (z) { var v = U.num((T3[z[0]] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "v" && l.ev === z[2] && Math.abs(Number(l.T) - v) < 0.06; })) out.faraCitire++; });
    ["p0", "p2", "cap"].forEach(function (k) { var v = U.num((T3[k] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "p" && l.k === k && Math.abs(Number(l.v) - v) < 0.006; })) out.faraCitire++; });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.3], q2: [0.02, 0.1], q3: [0, 0.1], q4: [0, 0.3] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok };
    });
    out.principal = { eticheta: "T0 termostat [°C]", valoare: isFinite(o.T0) ? Math.round(o.T0 * 10) / 10 : "" };
    return out;
  }
  return { TAPA: TAPA, TMIN: TMIN, parametri: parametri, cursa: cursa, incalzire: incalzire, stare: stare, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
