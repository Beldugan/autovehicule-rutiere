/* SAA – Lucrarea 3. Sistemul de injecție common-rail (standul 1.5 dCi K9K, sistem Delphi DCR cu injectoare cu electrovalvă).
   Modelul presiunii în rampă (harta presiunii cerute, eroarea staționară, comanda IMV), al răspunsului dinamic al reglajului
   (sistem de ordinul 2) și al profilului injecției multiple. Parametrii sunt individuali; același model e folosit pe server. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l3"] = (function () {
  var REG = { antr: { n: 250, p: 260 }, ral: { n: 800, p: 300 }, n1500: { n: 1500, p: 560 }, n2000: { n: 2000, p: 760 }, n2500: { n: 2500, p: 950 }, n3000: { n: 3000, p: 1130 } };
  var CHEI = ["antr", "ral", "n1500", "n2000", "n2500", "n3000"];
  var INJ = { rr: { n: 950, nr: 4 }, rc: { n: 800, nr: 3 }, n2000: { n: 2000, nr: 2 }, acc: { n: 2600, nr: 2 } };   // numărul de injecții / ciclu (calibrarea)
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      kp: r2(u(0.94, 1.06), 3), es: r2(u(-2.4, 2.4), 2), esAntr: r2(u(-14, -7), 1), imv0: r2(u(47, 53), 1), imvK: r2(u(0.021, 0.026), 4),
      wA: r2(u(11, 17), 2), zA: r2(u(0.5, 0.72), 3), wD: r2(u(6, 9), 2), zD: r2(u(0.85, 1.1), 3), pAcc: Math.round(u(1250, 1400)),
      dt: { rr: r2(u(1.6, 2.0), 2), rc: r2(u(1.3, 1.7), 2), n2000: r2(u(0.6, 0.9), 2), acc: r2(u(0.5, 0.75), 2) },
      ti: { rr: r2(u(0.55, 0.7), 2), rc: r2(u(0.42, 0.55), 2), n2000: r2(u(0.6, 0.8), 2), acc: r2(u(1.2, 1.6), 2) },
      tp: r2(u(0.18, 0.26), 2), dt2: r2(u(0.8, 1.1), 2), dpost: r2(u(1.8, 2.4), 2)
    };
  }
  function pCer(pr, k) { return Math.round(REG[k].p * pr.kp); }
  function pReal(pr, k) { return pCer(pr, k) * (1 + (k === "antr" ? pr.esAntr : pr.es) / 100); }
  function imv(pr, k) { if (k === "antr") return pr.imv0 - 33; var q = REG[k].p * REG[k].n / (1130 * 3000); return pr.imv0 - pr.imvK * 1000 * Math.sqrt(q); }
  /** răspunsul la treapta presiunii cerute: tip "acc" (ralanti → p_acc) sau "dec" (p_acc → ralanti); întoarce valorile caracteristice */
  function treapta(pr, tip) {
    var p0 = tip === "acc" ? pReal(pr, "ral") : pr.pAcc * (1 + pr.es / 100), pf = tip === "acc" ? pr.pAcc : pCer(pr, "ral");
    var ps = pf * (1 + pr.es / 100), w = tip === "acc" ? pr.wA : pr.wD, z = tip === "acc" ? pr.zA : pr.zD;
    var p = p0, v = 0, h = 0.0005, t = 0, ext = p0, tr = NaN, sus = ps > p0;
    for (var i = 0; i < 6000; i++) {
      var a = w * w * (ps - p) - 2 * z * w * v; v += a * h; p += v * h; t += h;
      if (sus ? p > ext : p < ext) ext = p;
      if (isNaN(tr) && (sus ? p >= p0 + 0.9 * (ps - p0) : p <= p0 + 0.9 * (ps - p0))) tr = t;
    }
    return { p0: p0, pf: pf, ps: ps, pext: ext, tr: tr, sigma: (ext - pf) / pf * 100 * (sus ? 1 : -1), es: pr.es };
  }
  function dphi(n, dt) { return 6e-3 * n * dt; }
  function asteptate(pr) { var a = treapta(pr, "acc"); return { q1: dphi(INJ.n2000.n, pr.dt.n2000), q2: a.sigma, q3: a.tr, q4: pr.es }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "stat") { var pc = pCer(pr, l.reg); ok = ap(l.pc, pc, pc * 0.03 + 3) && ap(l.pr, pReal(pr, l.reg), pc * 0.03 + 5) && ap(l.imv, imv(pr, l.reg), 2.5); }
      else if (l.m === "dyn") { var s = treapta(pr, l.tip); ok = ap(l.pmax, s.pext, s.pf * 0.03 + 5) && ap(l.tr, s.tr, s.tr * 0.3 + 0.05); }
      else if (l.m === "dt") ok = ap(l.v, pr.dt[l.reg], 0.1);
      else if (l.m === "ti") ok = ap(l.v, pr.ti[l.reg], 0.1);
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.51); };
    CHEI.forEach(function (k) { var r = (t.t31 || {})[k] || {}, v = U.num(r.pr); if (isFinite(v) && !inLog(function (l) { return l.m === "stat" && l.reg === k && eq(l.pr, v, 0.6); })) out.faraCitire++; });
    ["acc", "dec"].forEach(function (k) { var v = U.num((((t.t32 || {})[k]) || {}).tr); if (isFinite(v) && !inLog(function (l) { return l.m === "dyn" && l.tip === k && eq(l.tr, v, 0.006); })) out.faraCitire++; });
    Object.keys(INJ).forEach(function (k) { var r = (t.t33 || {})[k] || {}, v = U.num(r.dt), w = U.num(r.ti);
      if (isFinite(v) && !inLog(function (l) { return l.m === "dt" && l.reg === k && eq(l.v, v, 0.006); })) out.faraCitire++;
      if (isFinite(w) && !inLog(function (l) { return l.m === "ti" && l.reg === k && eq(l.v, w, 0.006); })) out.faraCitire++; });
    var a = asteptate(pr), rasp = d.raspunsuri || {};
    var tol = { q1: [0.08, 0.3], q2: [0, 1.5], q3: [0.25, 0.04], q4: [0, 0.8] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 1000) / 1000, corect: ok };
    });
    var s = U.num(((t.t32 || {}).acc || {}).tr);
    out.principal = { eticheta: "t_r accelerare [s]", valoare: isFinite(s) ? s : null };
    return out;
  }
  return { REG: REG, CHEI: CHEI, INJ: INJ, parametri: parametri, pCer: pCer, pReal: pReal, imv: imv, treapta: treapta, dphi: dphi, asteptate: asteptate, verifica: verifica };
})();
