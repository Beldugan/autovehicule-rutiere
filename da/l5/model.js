/* DA – Lucrarea 5. Motorul diesel common rail și sistemele de post-tratare (EGR, DPF, SCR) – standul 1.5 dCi Euro 6.
   Modelul: presiunea din rampă cerută / reală (pornire, ralanti, 2500 rot/min), corecțiile de debit pe cilindri, debitul de retur al
   injectoarelor (2 min la ralanti), supapa EGR electrică și debitul de aer, filtrul de particule (masa de funingine, presiunea
   diferențială în funcție de debitul de gaze, regenerarea de service cu temperaturile înainte / după DPF), sistemul SCR (NOₓ amonte /
   aval, testul de dozare, concentrația AdBlue) și opacitatea la accelerare liberă. Fiecare student are motorul propriu și un defect
   ascuns. Același model este folosit în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l5"] = (function () {
  var TIPURI = {
    inj: "Injector cu pierderi interne (retur mare)", imv: "Pompa de înaltă presiune / supapa IMV defectă (presiune insuficientă)",
    egr: "Supapa EGR blocată închisă", dp: "Senzorul de presiune diferențială DPF sau conductele lui defecte",
    dpf: "Filtrul de particule colmatat", fis: "Filtrul de particule fisurat", adb: "AdBlue diluat (concentrație necorespunzătoare)"
  };
  var CHEI = ["inj", "imv", "egr", "dp", "dpf", "fis", "adb"];
  var CODURI = { inj: ["P0263 – contribuția cilindrului {c} / echilibrare"], imv: ["P0087 – presiunea din rampă prea mică"], egr: ["P0401 – debit EGR insuficient", "P0489 – circuitul EGR, poziție"],
    dp: ["P2453 – senzorul de presiune diferențială DPF, plauzibilitate"], dpf: ["P2463 – acumulare de funingine în DPF", "P244B – presiune diferențială DPF prea mare"],
    fis: ["P2002 – eficiența filtrului de particule sub prag"], adb: ["P20EE – eficiența SCR sub prag", "P207F – calitatea reactivului (uree)"] };
  function eticheta(d) { return TIPURI[d.tip] || "—"; }
  function optiuniDiag() { return CHEI.map(function (k) { return TIPURI[k]; }); }
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var tip = CHEI[Math.floor(r() * CHEI.length) % CHEI.length];
    return {
      defect: { tip: tip, cil: 1 + Math.floor(r() * 4) },
      pcP: Math.round(u(280, 320)), pcR: Math.round(u(260, 300)), pc25: Math.round(u(820, 900)), dpN: r2(u(-6, 6), 1),
      corr: [0, 1, 2, 3].map(function () { return r2(u(-1.2, 1.2), 2); }), Vr: [0, 1, 2, 3].map(function () { return r2(u(9, 13.5), 1); }), fInj: r2(u(2.1, 2.5), 2),
      ma0: r2(u(28, 34), 1), xEgr: r2(u(0.26, 0.34), 3), pozC: Math.round(u(36, 44)),
      m0: r2(u(16, 24), 1), km: Math.round(u(260, 460)), intr: Math.floor(u(0, 2)), dpOff: r2(u(-0.4, 0.4), 1), aDp: r2(u(0.85, 1.05), 3),
      noxR: Math.round(u(170, 250)), nox25: Math.round(u(360, 470)), eta: r2(u(0.92, 0.97), 3), doza: Math.round(u(95, 105)), conc: r2(u(32.1, 32.9), 1),
      kB: r2(u(0.02, 0.07), 3), Tr: r2(u(600, 635), 0), tauR: r2(u(240, 330), 0)
    };
  }
  var d_ = function (pr) { return pr.defect.tip; };
  /** presiunea din rampă cerută / reală [bar] la reg ∈ pornire | ralanti | r2500 */
  function presiune(pr, reg) {
    var pc = reg === "pornire" ? pr.pcP : reg === "r2500" ? pr.pc25 : pr.pcR, pr_ = pc + pr.dpN, d = d_(pr);
    if (d === "imv") pr_ = pc * (reg === "pornire" ? 0.62 : reg === "r2500" ? 0.86 : 0.93);
    if (d === "inj") pr_ = pc + pr.dpN - (reg === "pornire" ? 45 : reg === "ralanti" ? 12 : 20);
    return { pc: pc, pr: Math.round(pr_) };
  }
  function corectii(pr) { return pr.corr.map(function (c, i) { return d_(pr) === "inj" && i + 1 === pr.defect.cil ? r2(2.6 + Math.abs(c) * 0.4, 2) : c; }); }
  /** volumele de retur colectate în t secunde la ralanti [ml] */
  function retur(pr, t) { return pr.Vr.map(function (v, i) { var f = d_(pr) === "inj" && i + 1 === pr.defect.cil ? pr.fInj : 1; return v * f * t / 120; }); }
  /** EGR: poziția cerută / reală [%] la testul activ și debitul de aer [kg/h] cu EGR închis / deschis */
  function egr(pr, deschis) {
    var bl = d_(pr) === "egr", pozR = deschis ? (bl ? 2 : pr.pozC + (pr.ma0 % 2 > 1 ? 1 : -1)) : 0;
    var ma = deschis && !bl ? pr.ma0 * (1 - pr.xEgr) : pr.ma0 * (bl && deschis ? 0.995 : 1);
    return { pozC: deschis ? pr.pozC : 0, pozR: pozR, ma: r2(ma, 1) };
  }
  /** DPF: masa de funingine (modelul ECU) și presiunea diferențială [mbar] la debitul de gaze Q [m³/h] (contact: Q = 0) */
  function funingineInitiala(pr) { var d = d_(pr); return d === "dpf" ? r2(pr.m0 * 2.1, 1) : d === "fis" ? r2(pr.m0 * 0.6, 1) : pr.m0; }
  function dpDPF(pr, m, Q) {
    var d = d_(pr); if (d === "dp") return r2(pr.dpOff + 0.3, 1);
    var R = d === "fis" ? 0.12 : (0.55 + 0.035 * m) * pr.aDp; return r2(Q * R / 3.6 + (Q > 0 ? 0 : pr.dpOff), 1);
  }
  var Q_RAL = 105;   // m³/h la ralanti (gaze calde)
  function stareDPF(pr) { var d = d_(pr); return { km: d === "dpf" ? pr.km * 3 : pr.km, intr: d === "dpf" ? 5 + pr.intr : pr.intr }; }
  /** regenerarea de service: temperaturile [°C] și masa de funingine la t [s] de la pornire (≈ 20 min) */
  function regenerare(pr, t, m0) {
    var tr = Math.max(0, t), rampa = Math.min(1, tr / 240), Tin = 280 + (pr.Tr - 280) * rampa, finala = tr > 1200 ? Math.max(0, 1 - (tr - 1200) / 180) : 1;
    Tin = 280 + (Tin - 280) * finala;
    var arde = Tin > 520 ? (Tin - 520) / 100 : 0, m = m0 * Math.exp(-Math.max(0, tr - 200) / pr.tauR * Math.min(1, arde + 0.15));
    var exo = (Tin > 520 ? 25 + 1.2 * m : 0) * finala, Tout = Tin - 25 + exo;
    return { Tin: r2(Tin, 0), Tout: r2(Tout, 0), m: r2(Math.max(d_(pr) === "fis" ? 0.5 : 2.5, m), 1) };
  }
  /** SCR: NOₓ amonte / aval [ppm] */
  function scr(pr, reg) {
    var up = reg === "r2500" ? pr.nox25 : pr.noxR, eta = d_(pr) === "adb" ? pr.eta * 0.58 : pr.eta;
    return { up: up, dn: Math.round(up * (1 - eta)) };
  }
  function concentratie(pr) { return d_(pr) === "adb" ? r2(pr.conc * 0.66, 1) : pr.conc; }
  /** opacitatea: coeficientul k la accelerarea liberă i (1…3) și N [%] */
  function opacitate(pr, i) { var k = d_(pr) === "fis" ? 0.95 + 0.12 * Math.sin(i * 2.1 + pr.kB * 50) : pr.kB * (1 + 0.15 * Math.sin(i * 1.7)); k = r2(k, 2); return { k: k, N: r2(100 * (1 - Math.exp(-k * 0.43)), 1) }; }
  function coduri(pr) { return (CODURI[d_(pr)] || []).map(function (c) { return c.replace("{c}", pr.defect.cil); }); }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, T2 = t.t52 || {}, T3 = t.t53 || {}, T5 = t.t55 || {}, o = {};
    var V = [1, 2, 3, 4].map(function (i) { return n((T2["c" + i] || {}).V); });
    o.Vmed = V.every(isFinite) ? (V[0] + V[1] + V[2] + V[3]) / 4 : NaN; o.r = V.map(function (v) { return v / o.Vmed; }); o.rmax = Math.max.apply(null, o.r);
    var a0 = n((T3.ma0 || {}).v), aE = n((T3.maE || {}).v); o.x = (a0 - aE) / a0 * 100;
    var e = function (r) { var up = n((T5[r + "u"] || {}).v), dn = n((T5[r + "d"] || {}).v); return (up - dn) / up * 100; };
    o.etaR = e("noxR"); o.eta25 = e("nox25");
    var ks = [1, 2, 3].map(function (i) { return n((T5["k" + i] || {}).v); }); o.kmed = ks.every(isFinite) ? (ks[0] + ks[1] + ks[2]) / 3 : NaN;
    return o;
  }
  function asteptate(o) { return { q1: o.rmax, q2: o.x, q3: o.eta25, q4: o.kmed }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "pres") { var q = presiune(pr, l.k); ok = ap(l.pc, q.pc, 3) && ap(l.pr, q.pr, 12); }
      else if (l.m === "corr") { var c = corectii(pr); ok = (l.v || []).every(function (v, i) { return ap(v, c[i], 0.25); }); }
      else if (l.m === "ret") { var R = retur(pr, 120); ok = (l.V || []).every(function (v, i) { return ap(v, R[i], 0.6); }); }
      else if (l.m === "egr") { var g = egr(pr, l.desch); ok = ap(l.ma, g.ma, 0.6) && ap(l.pozR, g.pozR, 1.5); }
      else if (l.m === "dpf") { if (l.k === "dpC") ok = ap(l.v, dpDPF(pr, Number(l.mf), 0), 1.2); else if (l.k === "dpR") ok = ap(l.v, dpDPF(pr, Number(l.mf), Q_RAL), 2.5); else if (l.k === "m") ok = Number(l.v) >= 0 && Number(l.v) <= funingineInitiala(pr) + 0.5; }
      else if (l.m === "nox") { var s = scr(pr, l.reg); ok = ap(l.up, s.up, 12) && ap(l.dn, s.dn, 8); }
      else if (l.m === "doza") ok = ap(l.V, pr.doza, 3);
      else if (l.m === "conc") ok = ap(l.v, concentratie(pr), 0.25);
      else if (l.m === "opac") ok = ap(l.k, opacitate(pr, Number(l.i)).k, 0.04);
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.051); };
    var T1 = t.t51 || {}; ["pornire", "ralanti", "r2500"].forEach(function (k) { var v = U.num((T1[k] || {}).pr); if (isFinite(v) && !areCit(function (l) { return l.m === "pres" && l.k === k && eq(l.pr, v, 0.5); })) out.faraCitire++; });
    var T2 = t.t52 || {}; [1, 2, 3, 4].forEach(function (i) { var r = T2["c" + i] || {}, v = U.num(r.V), c = U.num(r.corr);
      if (isFinite(v) && !areCit(function (l) { return l.m === "ret" && eq((l.V || [])[i - 1], v, 0.06); })) out.faraCitire++;
      if (isFinite(c) && !areCit(function (l) { return l.m === "corr" && eq((l.v || [])[i - 1], c, 0.006); })) out.faraCitire++; });
    var T3 = t.t53 || {}; [["ma0", false], ["maE", true]].forEach(function (z) { var v = U.num((T3[z[0]] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "egr" && !!l.desch === z[1] && eq(l.ma, v, 0.06); })) out.faraCitire++; });
    var T5 = t.t55 || {}; [1, 2, 3].forEach(function (i) { var v = U.num((T5["k" + i] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "opac" && Number(l.i) === i && eq(l.k, v, 0.006); })) out.faraCitire++; });
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.02, 0.02], q2: [0.02, 0.5], q3: [0.01, 0.5], q4: [0.03, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok };
    });
    var dg = ((t.t56 || {}).d || {}).cauza || "", okD = dg === eticheta(pr.defect); if (okD) out.corecte++;
    out.detalii.defect = { raspuns: dg, asteptat: eticheta(pr.defect), corect: okD };
    out.principal = { eticheta: "defect identificat", valoare: okD ? "DA" : "NU" };
    return out;
  }
  return { TIPURI: TIPURI, CHEI: CHEI, eticheta: eticheta, optiuniDiag: optiuniDiag, parametri: parametri, presiune: presiune, corectii: corectii, retur: retur, egr: egr,
    funingineInitiala: funingineInitiala, dpDPF: dpDPF, Q_RAL: Q_RAL, stareDPF: stareDPF, regenerare: regenerare, scr: scr, concentratie: concentratie, opacitate: opacitate, coduri: coduri,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
