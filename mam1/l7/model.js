/* MAM I – Lucrarea 7. Senzori ultrasonici de parcare: timpul de propagare și compensarea cu temperatura.
   Modelul standului: modulele HC-SR04 (traductoare deschise, 40 kHz) și JSN-SR04T (traductor etanș, tip auto) cu întârzierile
   proprii ale detecției ecoului, jitterul și distanța minimă (oscilația liberă a traductorului etanș), ecoul în funcție de material,
   distanță și unghiul țintei (cu fasciculul de ≈ ±15…30°), peretele laboratorului ca ecou de fundal, viteza sunetului c(ϑ),
   aerul încălzit local de aerotermă, DS18B20 lângă traductoare, programul cu pulseIn (rezoluție 1 µs, timeout 30 ms) și zonele
   de avertizare. Același model este folosit pe serverul Apps Script (evaluarea). */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l7"] = (function () {
  var DIST = [5, 10, 25, 50, 100, 200], DREF = 50, PERETE = 310, C20 = 331.3 + 0.606 * 20;
  var TINTE = { lemn: { et: "cub de lemn 100 mm", R: 0.9 }, carton: { et: "panou de carton", R: 0.75 }, metal: { et: "panou metalic", R: 1.0 }, burete: { et: "țintă moale (burete)", R: 0.04 } };
  var CAZURI = [["lemn", 0], ["carton", 0], ["metal", 0], ["lemn", 30], ["lemn", 60], ["burete", 0]];
  var MOD = { hc: { et: "HC-SR04", thr: 0.03, sA: 0.008, tb: 20, sj: 2.5 }, jsn: { et: "JSN-SR04T", thr: 0.022, sA: 0.006, tb: 30, sj: 4 } };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return { Taer: r2(u(21.5, 25), 2), Tcald: r2(u(34, 42), 2), eDS: r2(u(-0.3, 0.3), 3), t0h: r2(u(10, 30), 1), t0j: r2(u(20, 60), 1), kh: r2(u(0.02, 0.06), 3), kj: r2(u(0.03, 0.1), 3),
      dminJ: r2(u(20, 25), 2), dZero: r2(u(0.1, 0.4), 2), Rk: r2(u(0.9, 1.1), 3) };
  }
  function c(T) { return 331.3 + 0.606 * T; }
  /** amplitudinea relativă a ecoului țintei (material, unghi, distanță) pentru modulul m */
  function amplitudine(pr, m, tinta, unghi, d) { var M = MOD[m], R = (TINTE[tinta] || TINTE.lemn).R * pr.Rk, f = Math.exp(-Math.pow(unghi / M.tb, 2)); return R * f * Math.pow(30 / Math.max(d, 2), 1.2); }
  function phi(z) { var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  /** probabilitatea de detectare a ecoului țintei */
  function pDetect(pr, m, tinta, unghi, d) { var M = MOD[m]; return phi((amplitudine(pr, m, tinta, unghi, d) - M.thr) / M.sA); }
  /** timpul de ecou adevărat [µs] (fără jitter) pentru un obstacol la d [cm] (de la fața traductorului), aerul la Tp */
  function tEcou(pr, m, d, Tp) { var t0 = m === "hc" ? pr.t0h : pr.t0j, k = m === "hc" ? pr.kh : pr.kj; return 2 * (d + pr.dZero) / 100 / c(Tp) * 1e6 + t0 + k * d; }
  /** ce „vede” modulul: distanța reală a obiectului care dă ecoul (ținta sau peretele), sau ringing / niciun ecou */
  function scena(pr, m, tinta, unghi, d, rnd) {
    if (m === "jsn" && d < pr.dminJ) return { tip: "ringing", d: pr.dminJ + 3 };
    var p = pDetect(pr, m, tinta, unghi, d);
    if ((rnd ? rnd() : 0.5) < p) return { tip: "tinta", d: d };
    if (amplitudine(pr, m, "metal", 0, PERETE) / 1.0 > MOD[m].thr) return { tip: "perete", d: PERETE };
    return { tip: "nimic" };
  }
  /** o măsurare (durata impulsului ECHO, µs întregi) sau 0 la timeout */
  function masura(pr, m, tinta, unghi, d, Tp, rnd, gs) {
    var s = scena(pr, m, tinta, unghi, d, rnd);
    if (s.tip === "nimic") return 0;
    if (s.tip === "ringing") return Math.round(2 * s.d / 100 / c(Tp) * 1e6 + (gs ? gs() * 6 : 0));
    return Math.max(1, Math.round(tEcou(pr, m, s.d, Tp) + (gs ? gs() * MOD[m].sj : 0)));
  }
  function dDin(t, T) { return c(T) * t * 1e-6 / 2 * 100; }
  function zona(d, z) { return !(d > 0) ? "fără ecou" : d > z[0] ? "liber" : d > z[1] ? "ton rar" : d > z[2] ? "ton des" : "continuu"; }
  var ZONE = ["liber", "ton rar", "ton des", "continuu"];

  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t71 || {}, T2 = t.t72 || {}, o = { err: {}, errHC: NaN, eps: {} };
    var eh = [];
    DIST.forEach(function (d) { var r = T1["d" + d] || {}, h = n(r.hc), j = n(r.jsn); o.err["d" + d] = { hc: isFinite(h) ? (h - d) / d * 100 : NaN, jsn: isFinite(j) ? (j - d) / d * 100 : NaN }; if (d >= 25 && isFinite(h)) eh.push(Math.abs((h - d) / d * 100)); });
    o.errHC = eh.length ? eh.reduce(function (a, b) { return a + b; }, 0) / eh.length : NaN;
    ["cam", "cald"].forEach(function (k) { var r = T2[k] || {}, T = n(r.T), te = n(r.t); o.eps[k] = { c: isFinite(T) ? c(T) : NaN, d0: isFinite(te) ? dDin(te, 20) : NaN, dc: isFinite(te) && isFinite(T) ? dDin(te, T) : NaN, e: isFinite(T) ? (c(T) - C20) / C20 * 100 : NaN }; });
    o.epsCald = o.eps.cald.e;
    return o;
  }
  function asteptate(o) { return { q1: Math.abs((c(-10) - C20) / C20 * 100), q2: dDin(2920, 20), q3: o.epsCald, q4: o.errHC }; }

  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tolAbs, tolRel) { a = Number(a); return isFinite(a) && Math.abs(a - b) <= (tolAbs || 0) + Math.abs(b) * (tolRel || 0); };
    log.forEach(function (l) {
      var ok = true, Tp = Number(l.Tp), lo = Math.min(pr.Taer, pr.Tcald) - 0.5, hi = Math.max(pr.Taer, pr.Tcald) + 0.5;
      if (isFinite(Tp) && (Tp < lo || Tp > hi)) ok = false;
      if (l.m === "osc") ok = ok && ap(l.t, tEcou(pr, "hc", DREF, Tp), 12, 0.004);
      else if (l.m === "d") { var dd = Number(l.d);
        [["hc", "hc"], ["jsn", "jsn"]].forEach(function (z) { var v = Number(l[z[0]]); if (!isFinite(v)) return;
          var exp = z[0] === "jsn" && dd < pr.dminJ ? (pr.dminJ + 3) * c(Number(l.Tc)) / c(Tp) : dDin(tEcou(pr, z[0], dd, Tp), Number(l.Tc)); if (!ap(v, exp, 0.6, 0.012)) ok = false; }); }
      else if (l.m === "tinta") { var p = pDetect(pr, "hc", l.tinta, Number(l.unghi), DREF);
        if (l.det === "da" && p < 0.02) ok = false; if (l.det === "nu" && p > 0.98) ok = false; }
      else if (l.m === "T") ok = ok && ap(l.T, Tp + pr.eDS, 0.35) && ap(l.t, tEcou(pr, "hc", DREF, Tp), 12, 0.004) && ap(l.d0, dDin(Number(l.t), 20), 0.06) && ap(l.dc, dDin(Number(l.t), Number(l.T)), 0.06);
      else if (l.m === "jmin") ok = ok && Number(l.d) >= pr.dminJ - 0.01 && ap(l.jsn, dDin(tEcou(pr, "jsn", Number(l.d), Tp), Number(l.Tc)), 0.6, 0.012);
      else if (l.m === "zona") ok = l.zona === zona(Number(l.dm), l.z || [100, 50, 25]);
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.06); };
    var T1 = t.t71 || {}, T2 = t.t72 || {}, T0 = t.t70 || {};
    DIST.forEach(function (dd) { var k = "d" + dd, r = T1[k] || {}; ["hc", "jsn"].forEach(function (c2) { var v = U.num(r[c2]); if (isFinite(v) && !areCit(function (l) { return l.m === "d" && l.k === k && eq(l[c2], v); })) out.faraCitire++; }); });
    ["cam", "cald"].forEach(function (k) { var r = T2[k] || {}; ["T", "t", "d0", "dc"].forEach(function (c2) { var v = U.num(r[c2]); if (isFinite(v) && !areCit(function (l) { return l.m === "T" && l.k === k && eq(l[c2], v, c2 === "t" ? 0.6 : 0.06); })) out.faraCitire++; }); });
    var vo = U.num((T0.e50 || {}).t); if (isFinite(vo) && !areCit(function (l) { return l.m === "osc" && eq(l.t, vo, 0.6); })) out.faraCitire++;
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.05], q2: [0, 0.1], q3: [0.03, 0.03], q4: [0.05, 0.05] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(Math.abs(v) - Math.abs(a[k])) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    out.principal = { eticheta: "eroarea medie HC-SR04 [%]", valoare: isFinite(o.errHC) ? Math.round(o.errHC * 1000) / 1000 : "" };
    return out;
  }
  return { DIST: DIST, DREF: DREF, PERETE: PERETE, C20: C20, TINTE: TINTE, CAZURI: CAZURI, MOD: MOD, ZONE: ZONE, parametri: parametri, c: c, amplitudine: amplitudine, pDetect: pDetect,
    tEcou: tEcou, scena: scena, masura: masura, dDin: dDin, zona: zona, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
