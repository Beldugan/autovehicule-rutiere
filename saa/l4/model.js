/* SAA – Lucrarea 4. Sistemul de ungere – caracteristica presiunii uleiului (standul K7J 1.4 MPI, pompă cu roți dințate, ulei 5W-30).
   Modelul: pompa volumetrică (debit ∝ turație, scăpări interne care cresc la cald), rezistența hidraulică a lagărelor proporțională
   cu vâscozitatea la o putere subunitară, supapa de siguranță (palierul de presiune), vâscozitatea uleiului după relația Walther,
   manocontactul de presiune. Parametrii sunt individuali; același model este folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l4"] = (function () {
  var TEMP = [40, 60, 80, 90], TURATII = ["ral", "n1500", "n2000", "n2500", "n3000", "n3500"];
  var NREG = { n1500: 1500, n2000: 2000, n2500: 2500, n3000: 3000, n3500: 3500 };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      a90: r2(u(0.5, 0.7), 3), b90: r2(u(0.74, 0.9), 3), m: r2(u(0.31, 0.36), 3), pRel: r2(u(4.4, 4.9), 2), nRal: Math.round(u(780, 830)),
      nu40: r2(u(58, 68), 1), nu100: r2(u(10.0, 11.5), 2), pSw: r2(u(0.3, 0.5), 2), rSw: r2(u(0.3, 0.9), 2), T0: r2(u(22, 26), 1)
    };
  }
  /** vâscozitatea cinematică [mm²/s] la T [°C] – relația Walther prin ν40 și ν100 */
  function niu(pr, T) {
    var W = function (v) { return Math.log10(Math.log10(v + 0.7)); }, L = function (t) { return Math.log10(t + 273.15); };
    var B = (W(pr.nu40) - W(pr.nu100)) / (L(40) - L(100)), A = W(pr.nu40) - B * L(40);
    return Math.pow(10, Math.pow(10, A + B * L(T))) - 0.7;
  }
  function nr(pr, k) { return k === "ral" ? pr.nRal : NREG[k]; }
  /** presiunea uleiului [bar] la turația n [rot/min] și temperatura T [°C]; defect – scenariu demonstrativ */
  function presiune(pr, n, T, defect) {
    if (n < 50) return 0;
    var mu = Math.pow(niu(pr, T) / niu(pr, 90), pr.m), a = pr.a90, b = pr.b90, rel = pr.pRel;
    if (defect === "lagare") { b *= T > 70 ? 0.62 : 0.85; a *= 0.6; }
    if (defect === "diluat") mu *= 0.72;
    if (defect === "supapa") rel = 2.2;
    var lin = (a + b * n / 1000) * mu - (T > 60 ? 0.12 * (T - 60) / 30 : 0) * (1 - Math.min(1, n / 2500));   // scăpările pompei la cald, la turație mică
    lin = Math.max(0.05, lin);
    var k = 8;   // trecerea netedă spre palierul supapei de siguranță
    return -Math.log(Math.exp(-k * lin) + Math.exp(-k * rel)) / k;
  }
  /** încălzirea uleiului [°C/s] la turația n (motorul pornit) */
  function incalzire(n, T) { return 0.07 * (n / 1000 + 0.35) * Math.max(0, 96 - T) / 56; }
  /** prelucrarea tabelului 4.1 (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t41 || {}, o = { panta: {}, nDesch: NaN };
    var nRal = n(date.nRal);
    var puncte = function (rd) { var r = T1[rd] || {}; return TURATII.map(function (k) { return [k === "ral" ? nRal : NREG[k], n(r[k])]; }).filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); }); };
    TEMP.forEach(function (T) {
      var pts = puncte("t" + T), lin = [];
      // zona liniară: punctele înainte de palier (creșterea între două trepte > 40 % din creșterea inițială)
      for (var i = 0; i < pts.length; i++) { if (i >= 2) { var s0 = (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]), si = (pts[i][1] - pts[i - 1][1]) / (pts[i][0] - pts[i - 1][0]); if (si < 0.4 * s0) break; } lin.push(pts[i]); }
      var rg = lin.length >= 2 ? U.regresie(lin.map(function (p) { return p[0] / 1000; }), lin.map(function (p) { return p[1]; })) : null;
      o.panta[T] = rg ? rg.b : NaN; o["rg" + T] = rg; o["lin" + T] = lin.length; o["pts" + T] = pts;
      if (T === 40 && rg && lin.length < pts.length) { var pal = pts[pts.length - 1][1]; o.palier = pal; o.nDesch = (pal - rg.a) / rg.b * 1000; }
    });
    var p2000 = function (T) { return n((T1["t" + T] || {}).n2000); };
    o.raport = p2000(40) / p2000(90);
    o.pRal90 = n((T1.t90 || {}).ral);
    return o;
  }
  function asteptate(o) { return { q1: o.panta[90], q2: o.pRal90, q3: o.nDesch, q4: o.raport }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, date = d.date || {};
    log.forEach(function (l) {
      if (l.m === "p") { if (Math.abs(Number(l.p) - presiune(pr, Number(l.n), Number(l.T), "")) > 0.08 + 0.02 * Number(l.p)) out.incompatibile++; }
      if (l.m === "sw") { var ok = l.st === "oprit" ? Math.abs(Number(l.R) - pr.rSw) <= 0.06 : String(l.R) === "OL"; if (!ok) out.incompatibile++; }
    });
    if (Number(date.nRal) !== pr.nRal) { out.incompatibile++; out.motive.push("turația de ralanti diferă de cea a motorului propriu"); }
    TEMP.forEach(function (T) {
      TURATII.forEach(function (k) {
        var v = U.num(((t.t41 || {})["t" + T] || {})[k]);
        if (isFinite(v) && !log.some(function (l) { return l.m === "p" && l.k === k && Math.abs(Number(l.T) - T) <= 2.5 && Math.abs(Number(l.p) - v) < 0.006; })) out.faraCitire++;
      });
    });
    var o = prelucreaza(t, date, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.02, 0.01], q2: [0, 0.02], q3: [0.03, 20], q4: [0.02, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    out.principal = { eticheta: "panta la 90 °C [bar/1000 rot/min]", valoare: isFinite(o.panta[90]) ? Math.round(o.panta[90] * 1000) / 1000 : "" };
    return out;
  }
  return { TEMP: TEMP, TURATII: TURATII, NREG: NREG, parametri: parametri, niu: niu, nr: nr, presiune: presiune, incalzire: incalzire,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
