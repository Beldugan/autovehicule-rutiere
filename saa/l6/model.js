/* SAA – Lucrarea 6. Sistemul de supraalimentare – presiunea de supraalimentare și actuatorii turbosuflantei (standul 1.5 dCi, VGT).
   Modelul: regimurile stabilizate pe standul fără frână (presiunea cerută de ECU și cea reală, poziția actuatorului VGT, temperaturile
   T1 înainte de compresor, T2 după compresor, T3 după intercooler, din randamentul compresorului și eficiența intercoolerului),
   caracteristica actuatorului pneumatic (cursa tijei în funcție de depresiune, etanșeitatea membranei), accelerarea liberă înregistrată
   cu testerul la 10 Hz (răspunsul presiunii, turbo-lag) și datalogul de drum la sarcină plină (treapta a 3-a, 1300…4200 rot/min).
   Parametrii sunt individuali; același model este folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l6"] = (function () {
  var REG = [["ral", 0], ["n1500", 1500], ["n2000", 2000], ["n2500", 2500], ["n3000", 3000]], VAC = [0, 100, 200, 300, 400, 500, 600], DPF = 0.02, K = 1.4;
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function cl(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      patm: r2(u(0.985, 1.025), 3), Ta: r2(u(18, 26), 1), nRal: Math.round(u(790, 840) / 10) * 10, c1: r2(u(0.012, 0.016), 4),
      eta: r2(u(0.66, 0.76), 3), eps: r2(u(0.66, 0.82), 3), v0: Math.round(u(120, 210)), v1: Math.round(u(480, 560)), smax: r2(u(9.5, 12.5), 2), leak: r2(u(4, 13), 1),
      tau: r2(u(0.45, 0.8), 2), td: r2(u(0.15, 0.3), 2), A: r2(u(0.28, 0.42), 3), piSP: r2(u(2.15, 2.45), 3), seed: seed
    };
  }
  /** defect (numai în modul demonstrativ): "" | "vgt" (palete gripate deschise) | "fisura" (furtun fisurat după compresor) | "membrana" (actuator neetanș) | "overboost" (VGT blocat închis) */
  function cursa(pr, vac, defect) {   // cursa tijei [mm] la depresiunea vac [mbar]
    if (defect === "vgt") return r2(cl(pr.smax * (vac - pr.v0) / (pr.v1 - pr.v0), 0, 0.12 * pr.smax), 2);
    var v1 = defect === "membrana" ? pr.v1 + 160 : pr.v1;
    return pr.smax * cl((vac - pr.v0) / (v1 - pr.v0), 0, 1);
  }
  function scurgere(pr, defect) { return defect === "membrana" ? 95 : pr.leak; }   // [mbar/min] la 600 mbar
  /** regimul stabilizat pe stand (fără sarcină) la turația n */
  function regim(pr, n, defect) {
    var x = n / 3000, pc = pr.patm + pr.c1 * Math.pow(n / 1000, 2), p1 = pr.patm - DPF * x * x;
    var b = pr.c1 * Math.pow(n / 1000, 2);
    if (defect === "vgt") b *= 0.35; else if (defect === "fisura") b *= 0.45; else if (defect === "membrana") b *= 0.7; else if (defect === "overboost") b = b * 1.9 + 0.03 * x;
    var pR = pr.patm + b * 0.97, pos = defect === "vgt" ? 100 : defect === "overboost" ? 0 : cl(72 - 13 * (n - pr.nRal) / 1000 + (defect === "fisura" || defect === "membrana" ? 25 : 0), 22, 100);
    var pic = pR / (pr.patm - DPF), T1 = pr.Ta + 1.4 + 0.6 * x, eta = pr.eta * (0.62 + 0.2 * x), T1K = T1 + 273.15;
    var T2 = T1K * (1 + (Math.pow(pic, (K - 1) / K) - 1) / eta) - 273.15, eps = Math.min(0.95, pr.eps * (1.12 - 0.18 * x)), T3 = T2 - eps * (T2 - pr.Ta);
    return { n: n, pcer: r2(pc, 2), preal: r2(pR, 2), pos: Math.round(pos), T1: r2(T1, 1), T2: r2(T2, 1), T3: r2(T3, 1), p1: p1 };
  }
  function turatie(pr, k) { var z = REG.filter(function (x) { return x[0] === k; })[0]; return z ? (z[1] || pr.nRal) : NaN; }
  /** accelerarea liberă: 0…5 s la 10 Hz; pedala la 0,5 s, eliberată la 3,5 s; turația limitată la 4400 rot/min */
  function accelerare(pr, defect) {
    var r = mulberry32(pr.seed ^ 0x51ED27), o = { t: [], n: [], p: [] }, A = pr.A * (defect === "vgt" ? 0.35 : defect === "fisura" ? 0.45 : defect === "membrana" ? 0.7 : defect === "overboost" ? 1.35 : 1), tau = pr.tau * (defect === "vgt" ? 1.8 : 1);
    for (var k = 0; k <= 50; k++) {
      var t = k / 10, n = t < 0.5 ? pr.nRal : t < 3.5 ? Math.min(4400, pr.nRal + (4400 - pr.nRal) * (1 - Math.exp(-(t - 0.5) / 0.32))) : pr.nRal + (4400 - pr.nRal) * Math.exp(-(t - 3.5) / 0.45);
      var b = t < 0.5 + pr.td ? 0 : A * (1 - Math.exp(-(t - 0.5 - pr.td) / tau)); if (t > 3.5) b = A * (1 - Math.exp(-(3.0 - pr.td) / tau)) * Math.exp(-(t - 3.5) / 0.38);
      o.t.push(r2(t, 1)); o.n.push(Math.round(n / 10) * 10); o.p.push(r2(pr.patm + b + (r() - 0.5) * 0.008, 2));
    }
    return o;
  }
  function raspuns(pr, defect) {   // pmax și timpul de la apăsarea pedalei până la 90 % din creșterea presiunii (pe eșantioane)
    var a = accelerare(pr, defect), p0 = a.p[0], pm = Math.max.apply(null, a.p), lim = p0 + 0.9 * (pm - p0), t90 = NaN;
    for (var k = 0; k < a.p.length; k++) if (a.t[k] >= 0.5 && a.p[k] >= lim - 1e-9) { t90 = r2(a.t[k] - 0.5, 1); break; }
    return { p0: p0, pmax: pm, t90: t90 };
  }
  /** datalogul de drum la sarcină plină (treapta a 3-a): 10 Hz, n de la 1300 la 4200 rot/min */
  function drum(pr) {
    var r = mulberry32(pr.seed ^ 0x7A11), o = [], N = 121;
    for (var k = 0; k < N; k++) {
      var t = k / 10, n = 1300 + 2900 * Math.pow(k / (N - 1), 0.92), x = n / 1000;
      var pc = pr.patm + (pr.piSP * (pr.patm - DPF) - pr.patm) * cl((x - 1.1) / 1.0, 0, 1) * (x > 3.2 ? 1 - 0.08 * (x - 3.2) : 1);
      var lag = cl((x - 1.25) / 1.15, 0, 1), pR = pr.patm + (pc - pr.patm) * (0.6 + 0.4 * lag) - 0.015 + (r() - 0.5) * 0.01;
      var pic = pR / (pr.patm - DPF), T1 = pr.Ta + 4 + 1.2 * (x - 1.3) / 2.9, eta = pr.eta * (1 - 0.06 * Math.pow((x - 2.5) / 1.5, 2));
      var T2 = (T1 + 273.15) * (1 + (Math.pow(pic, (K - 1) / K) - 1) / eta) - 273.15, eps = pr.eps * (1 - 0.05 * (x - 2.5)), T3 = T2 - eps * (T2 - pr.Ta);
      o.push({ t: r2(t, 1), n: Math.round(n / 10) * 10, pcer: r2(pc, 2), preal: r2(pR, 2), pos: Math.round(cl(95 - 12 * cl(x - 2.2, 0, 3), 40, 95)), T1: r2(T1, 1), T2: r2(T2, 1), T3: r2(T3, 1) });
    }
    return o;
  }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t61 || {}, T2 = (t.t62 || {}).s || {}, T3 = t.t63 || {}, o = { rand: {} }, patm = n(date.patm), Ta = n(date.Ta);
    REG.concat([["sp", 2500]]).forEach(function (z) { var R = T1[z[0]] || {}, pR = n(R.preal), t1 = n(R.T1), t2 = n(R.T2), t3 = n(R.T3), pic = pR / (patm - DPF);
      var T2s = (t1 + 273.15) * Math.pow(pic, (K - 1) / K) - 273.15; o.rand[z[0]] = { pic: pic, T2s: T2s, eta: (T2s - t1) / (t2 - t1), eps: (t2 - t3) / (t2 - Ta) }; });
    var pts = VAC.map(function (v) { return [v, n(T2["a" + v])]; }).filter(function (p) { return isFinite(p[1]); });
    o.smax = pts.length ? Math.max.apply(null, pts.map(function (p) { return p[1]; })) : NaN;
    var lin = pts.filter(function (p) { return p[1] > 0.05 && p[1] < 0.97 * o.smax; });
    var rg = lin.length >= 2 ? U.regresie(lin.map(function (p) { return p[0]; }), lin.map(function (p) { return p[1]; })) : null;
    o.rg = rg; o.v0 = rg && rg.b ? -rg.a / rg.b : NaN; o.pts = pts;
    o.scurg = n((T3.v0 || {}).v) - n((T3.v1 || {}).v);
    o.lag = n((T3.t90 || {}).v);
    return o;
  }
  function asteptate(o) { var s = o.rand.sp || {}; return { q1: s.pic, q2: s.eta, q3: s.eps, q4: o.v0 }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.006); }, DL = drum(pr), ACC = accelerare(pr, "");
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "s") ok = eq(l.s, Math.round(cursa(pr, Number(l.vac), "") * 100) / 100, 0.011);
      else if (l.m === "v") ok = l.k === "v0" ? Number(l.v) >= 560 && Number(l.v) <= 640 : eq(l.v, Number(l.v0) - scurgere(pr, "") * Number(l.dt) / 60, 1.6);
      else if (l.m === "r") { var R = regim(pr, Number(l.n), ""); ok = ["pcer", "preal", "pos", "T1", "T2", "T3"].every(function (k) { return eq(l[k], R[k], k === "pos" ? 1.01 : k.charAt(0) === "T" ? 0.051 : 0.0051); }); }
      else if (l.m === "dl") { var s = DL[Number(l.i)]; ok = !!s && ["n", "pcer", "preal", "pos", "T1", "T2", "T3"].every(function (k) { return eq(l[k], s[k], k === "n" || k === "pos" ? 0.5 : 0.006); }); }
      else if (l.m === "acc") { var i = Number(l.i); ok = i >= 0 && i < ACC.p.length && (l.k === "pmax" ? eq(l.v, ACC.p[i], 0.0051) : eq(l.v, ACC.t[i] - 0.5, 0.051)); }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, T1 = t.t61 || {};
    REG.forEach(function (z) { var R = T1[z[0]] || {}; ["pcer", "preal", "pos", "T1", "T2", "T3"].forEach(function (k) { var v = U.num(R[k]); if (isFinite(v) && !areCit(function (l) { return l.m === "r" && l.k === z[0] && eq(l[k], v, 0.006); })) out.faraCitire++; }); });
    var S = T1.sp || {}; ["pcer", "preal", "pos", "T1", "T2", "T3"].forEach(function (k) { var v = U.num(S[k]); if (isFinite(v) && !areCit(function (l) { return l.m === "dl" && eq(l[k], v, 0.006); })) out.faraCitire++; });
    var T2 = (t.t62 || {}).s || {}; VAC.forEach(function (v) { var x = U.num(T2["a" + v]); if (isFinite(x) && !areCit(function (l) { return l.m === "s" && Number(l.vac) === v && eq(l.s, x, 0.006); })) out.faraCitire++; });
    var T3 = t.t63 || {}; [["v0", "v"], ["v1", "v"], ["pmax", "acc"], ["t90", "acc"]].forEach(function (z) { var x = U.num((T3[z[0]] || {}).v); if (isFinite(x) && !areCit(function (l) { return l.m === z[1] && l.k === z[0] && eq(l.v, x, 0.006); })) out.faraCitire++; });
    var o = prelucreaza(t, { patm: pr.patm, Ta: pr.Ta }, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.01, 0.01], q2: [0.02, 0.01], q3: [0.02, 0.01], q4: [0.02, 3] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    out.principal = { eticheta: "πc la sarcină plină", valoare: isFinite(a.q1) ? Math.round(a.q1 * 100) / 100 : "" };
    return out;
  }
  return { REG: REG, VAC: VAC, DPF: DPF, parametri: parametri, cursa: cursa, scurgere: scurgere, regim: regim, turatie: turatie, accelerare: accelerare, raspuns: raspuns, drum: drum,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
