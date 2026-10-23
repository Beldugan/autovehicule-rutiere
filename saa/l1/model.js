/* SAA – Lucrarea 1. Sistemul de injecție de benzină multipunct – caracteristicile de funcționare (standul 1.4 MPI).
   Modelul motorului (speed-density), al injectorului (debit static, timp mort) și al regimurilor tranzitorii;
   folosit identic în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l1"] = (function () {
  var VC = 0.3475e-3, RA = 287, TADM = 300, AFR = 14.7, NCIL = 4;         // cilindree unitară [m³], aer, raport stoichiometric
  /** regimurile din Tabelul 1.2 (motor cald, stand fără sarcină) */
  var REG = {
    ral: { et: "ralanti", n: 800, p: 34, c: false },
    ralc: { et: "ralanti + consumatori", n: 800, p: 39, c: true },
    n1500: { et: "1500", n: 1500, p: 27.5, c: false },
    n2000: { et: "2000", n: 2000, p: 24.5, c: false },
    n2000c: { et: "2000 + consumatori", n: 2000, p: 28, c: true },
    n2500: { et: "2500", n: 2500, p: 22, c: false },
    n3000: { et: "3000", n: 3000, p: 20.5, c: false }
  };
  var CHEI_REG = ["ral", "ralc", "n1500", "n2000", "n2000c", "n2500", "n3000"];
  var REG_CONS = ["ral", "n2000", "n3000"];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var dp = {}; CHEI_REG.forEach(function (k) { dp[k] = r2(u(-1.2, 1.2), 1); });
    return {
      qs: r2(u(2.2, 2.8), 3),                 // debitul static efectiv al injectorului [mg/ms] (presiune, uzură)
      tm0: r2(u(0.65, 1.0), 3),               // timpul mort la 14 V [ms]
      fev: r2(u(0.96, 1.04), 3),              // factorul eficienței volumetrice
      dp: dp,                                 // abaterea MAP pe regimuri [kPa]
      k20: r2(u(1.6, 1.9), 3),                // corecția de încălzire la 20 °C
      tauT: r2(u(4.4, 5.8), 2),               // constanta de timp a încălzirii [min]
      T0: r2(u(16, 22), 1),                   // temperatura inițială a motorului [°C]
      kacc: r2(u(2.0, 2.6), 2),               // îmbogățirea maximă la accelerare
      ncut: 50 * Math.round(u(1500, 1800) / 50), nres: 50 * Math.round(u(1100, 1300) / 50),
      tauN: r2(u(1.0, 1.4), 2), tdel: r2(u(0.3, 0.6), 2)  // decelerare: constanta de timp a turației [s], întârzierea întreruperii [s]
    };
  }
  function ev(pr, n) { return pr.fev * (0.6 + 0.22 * (1 - Math.exp(-(n - 600) / 1100))); }
  function tmort(pr, U) { return pr.tm0 * Math.pow(14 / U, 1.5); }
  function ubat(c) { return c ? 13.6 : 13.9; }
  /** masa de aer pe ciclu și cilindru [mg] */
  function maer(pr, n, p) { return ev(pr, n) * p * 1000 * VC / (RA * TADM) * 1e6; }
  function kECT(pr, T) { var e0 = Math.exp(-65 / 22), f = (Math.exp(-(T - 20) / 22) - e0) / (1 - e0); return 1 + (pr.k20 - 1) * Math.max(0, Math.min(1.2, f)); }   // = 1 de la 85 °C (motor cald)
  /** turația de ralanti și MAP-ul la ralanti în funcție de temperatură (motor rece: turație și debit de aer mai mari) */
  function ralanti(T) { var f = Math.max(0, (70 - T) / 50); return { n: 800 + 350 * Math.min(1, f), dp: 6 * Math.min(1, f) }; }
  function presiune(pr, k) { return REG[k].p + pr.dp[k]; }
  /** masa injectată pe ciclu [mg] și durata de injecție [ms] la regimul (n, p), temperatura T, consumatori c */
  function minj(pr, n, p, T) { return maer(pr, n, p) / AFR * kECT(pr, T); }
  function ti(pr, n, p, T, c) { return minj(pr, n, p, T) / pr.qs + tmort(pr, ubat(c)); }
  function tiReg(pr, k) { var R = REG[k]; return ti(pr, R.n, presiune(pr, k), 90, R.c); }
  /** consumul orar [kg/h] și debitul masic [g/s] la regim */
  function consum(pr, k) { var R = REG[k], m = minj(pr, R.n, presiune(pr, k), 90); return { m: m, gs: m * NCIL * R.n / 2 / 60 / 1000, Ch: m * NCIL * R.n / 2 * 60 / 1e6 }; }
  /** temperatura motorului după t [min] de la pornirea la rece */
  function temperatura(pr, tmin) { return pr.T0 + (92 - pr.T0) * (1 - Math.exp(-tmin / pr.tauT)); }
  /** regimurile tranzitorii */
  function tiMax(pr) { return r2(tiReg(pr, "ral") * pr.kacc, 2); }
  function decel(pr, n0) {
    var ncut = 800 + (n0 - 800) * Math.exp(-pr.tdel / pr.tauN);
    var dur = ncut > pr.ncut ? pr.tauN * Math.log((ncut - 800) / (pr.nres - 800)) : 0;
    return { ncut: ncut, nres: pr.nres, dur: dur, taie: ncut > pr.ncut };
  }
  function regresie(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var a = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: a, b: (sy - a * sx) / n }; }
  /** prelucrarea tabelelor studentului */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, o = { cons: {} }, xs = [], ys = [];
    REG_CONS.forEach(function (k) {
      var r = (t.t13 || {})[k] || {}, N = n(r.n), T = n(r.ti), dt = n(r.dt), m = n(r.m);
      if (isFinite(N) && isFinite(dt) && isFinite(m) && dt > 0) {
        var Ch = 3.6 * m / dt, mi = Ch * 1e6 / (NCIL * N / 2 * 60);
        o.cons[k] = { Ch: Ch, minj: mi };
        if (isFinite(T)) { xs.push(T); ys.push(mi); }
      }
    });
    o.reg = xs.length >= 2 ? regresie(xs, ys) : null;
    o.qs = o.reg ? o.reg.a : NaN; o.tmort = o.reg ? -o.reg.b / o.reg.a : NaN;
    var t11 = t.t11 || {}, tc = n(((t.t12 || {}).ral || {}).tiD);
    var tic = isFinite(tc) ? tc : NaN;
    o.kECT0 = isFinite(n((t11.m0 || {}).ti)) && isFinite(tic) ? n(t11.m0.ti) / tic : NaN;
    var r3 = (t.t12 || {}).n3000 || {}, n3 = n(r3.n), t3 = n(r3.tiO);
    o.dc3000 = isFinite(n3) && isFinite(t3) ? t3 / (120000 / n3) * 100 : NaN;
    return o;
  }
  function asteptate(o) { return { q1: o.qs, q2: o.tmort, q3: o.kECT0, q4: o.dc3000 }; }
  var MINUTE = ["m0", "m2", "m4", "m6", "m8", "m10", "m12", "m14"];
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "inc") { var R = ralanti(Number(l.T)); ok = ap(l.ti, ti(pr, R.n, presiune(pr, "ral") + R.dp, Number(l.T), false), 0.04) && ap(l.n, R.n, 15); }
      else if (l.m === "reg") ok = ap(l.n, REG[l.k].n, 15) && ap(l.p, presiune(pr, l.k), 0.6) && ap(l.ti, tiReg(pr, l.k), 0.04);
      else if (l.m === "tio") ok = ap(l.v, tiReg(pr, l.k), 0.07);
      else if (l.m === "cons") { var c = consum(pr, l.k); ok = ap(l.mg, c.gs * Number(l.dt), 0.15 + 0.01 * c.gs * Number(l.dt)); }
      else if (l.m === "tr") {
        if (l.k === "timax") ok = ap(l.v, tiMax(pr), 0.15);
        else { var dd = decel(pr, Number(l.n0) || 3000); if (l.k === "ncut") ok = ap(l.v, dd.ncut, 40); else if (l.k === "nres") ok = ap(l.v, dd.nres, 40); else if (l.k === "dur") ok = ap(l.v, dd.dur, 0.25); }
      }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b) { return Math.abs(Number(a) - Number(b)) < 0.0051 * Math.max(1, Math.abs(Number(b))); };
    MINUTE.forEach(function (k) { var r = (t.t11 || {})[k] || {}, v = U.num(r.ti); if (isFinite(v) && !inLog(function (l) { return l.m === "inc" && eq(l.ti, v); })) out.faraCitire++; });
    CHEI_REG.forEach(function (k) {
      var r = (t.t12 || {})[k] || {};
      var v = U.num(r.tiD); if (isFinite(v) && !inLog(function (l) { return l.m === "reg" && l.k === k && eq(l.ti, v); })) out.faraCitire++;
      var w = U.num(r.tiO); if (isFinite(w) && !inLog(function (l) { return l.m === "tio" && l.k === k && eq(l.v, w); })) out.faraCitire++;
    });
    REG_CONS.forEach(function (k) { var r = (t.t13 || {})[k] || {}, m = U.num(r.m); if (isFinite(m) && !inLog(function (l) { return l.m === "cons" && l.k === k && eq(l.mg, m); })) out.faraCitire++; });
    ["timax", "ncut", "nres", "dur"].forEach(function (k) { var v = U.num(((t.t14 || {})[k] || {}).v); if (isFinite(v) && !inLog(function (l) { return l.m === "tr" && l.k === k && eq(l.v, v); })) out.faraCitire++; });
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "q_s [mg/ms]", valoare: isFinite(o.qs) ? Math.round(o.qs * 1000) / 1000 : null };
    var tol = { q1: [0.01, 0.005], q2: [0.02, 0.01], q3: [0.01, 0.005], q4: [0.01, 0.05] };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    if (isFinite(o.qs) && Math.abs(o.qs - pr.qs) > 0.08 * pr.qs) out.motive.push("debitul injectorului rezultat (" + o.qs.toFixed(2) + " mg/ms) diferă mult de cel real – verificați măsurările de consum");
    return out;
  }
  return { REG: REG, CHEI_REG: CHEI_REG, REG_CONS: REG_CONS, MINUTE: MINUTE, NCIL: NCIL, parametri: parametri, ev: ev, tmort: tmort, ubat: ubat, maer: maer, kECT: kECT, ralanti: ralanti, presiune: presiune,
    minj: minj, ti: ti, tiReg: tiReg, consum: consum, temperatura: temperatura, tiMax: tiMax, decel: decel, regresie: regresie, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
