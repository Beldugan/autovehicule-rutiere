/* MAM I – Lucrarea 6. Senzori de turație și poziție: decodarea roții 60−2 prin captură de intrare.
   Modelul standului: discul cu 60 − 2 dinți antrenat de un motor de c.c. de 12 V cu reductor (comandat PWM prin L298N, caracteristica
   statică cu zona moartă și constanta de timp proprii), senzorul inductiv (VR) cu amplitudinea ∝ turație și scăzând exponențial cu
   întrefierul, circuitul de formare (comparator cu histerezis, prag și zgomot propriu) – impulsuri lipsă sub prag –, captura de intrare
   a timerului 4 (rezonatorul de 16 MHz cu abaterea lui, prescalerul P), tahometrul optic și osciloscopul ca referințe.
   Același model este folosit pe serverul Apps Script (evaluarea). */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l6"] = (function () {
  var Z = 60, LIPSA = 2, GAPS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0], NREF = 500, TOBS = 5, PRAGURI = { p15: 1.5, p29: 2.9 };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      nmax: Math.round(u(2050, 2250)), d0: r2(u(0.06, 0.1), 3), tau: r2(u(0.28, 0.4), 3), rip: r2(u(0.002, 0.005), 4),
      eclk: r2(u(-0.004, 0.004), 5), eT: r2(u(-0.0015, 0.0015), 5), K: r2(u(8, 11), 2), lam: r2(u(0.7, 0.95), 3),
      uth: r2(u(0.2, 0.3), 3), sig: r2(u(0.025, 0.04), 4), rg: r2(u(2.94, 3.06), 3), tref: [84, 90, 96, 102, 108, 114, 120][Math.floor(r() * 7)]
    };
  }
  /** turația de regim [rot/min] la factorul de umplere d (0…1) */
  function nSS(pr, d) { return d <= pr.d0 ? 0 : pr.nmax * (d - pr.d0) / (1 - pr.d0); }
  /** amplitudinea vârf-vârf a senzorului inductiv [V] la turația n și întrefierul g [mm] (limitată de diodele Zener la 2 × 5,1 V) */
  function vpp(pr, n, g) { return Math.min(10.2, pr.K * n / 1000 * Math.exp(-(g - 0.5) / pr.lam)); }
  function phi(z) { var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  /** probabilitatea ca un dinte să nu treacă de pragul circuitului de formare */
  function pLipsa(pr, n, g) { if (n < 1) return 1; var vp = vpp(pr, n, g) / 2 * 0.92; return phi((pr.uth - vp) / pr.sig); }
  /** sincronizarea în fereastra de observare de 5 s: "da" / "nu" / null (la limită, oricare) */
  function syncAsteptat(pr, n, g) {
    var p = pLipsa(pr, n, g), N = n / 60 * (Z - LIPSA) * TOBS, P = 1 - Math.pow(1 - p, N);
    return P < 0.02 ? "da" : P > 0.98 ? "nu" : null;
  }
  /** formele de semnal din Tabelul 6.2 */
  var FORME = ["sinusoidal, amplitudine mare", "sinusoidal, amplitudine mică", "la pragul de formare – impulsuri lipsă", "fără semnal util"];
  function forma(pr, n, g) { var v = vpp(pr, n, g), p = pLipsa(pr, n, g); return p > 0.5 ? 3 : p > 1e-6 ? 2 : v < 1.5 ? 1 : 0; }
  /** tensiunea senzorului inductiv la unghiul a [° față de primul dinte după gol], amplitudinea vp (vârf-vârf) */
  function vVR(a, vp) {
    var u = ((a % 360) + 360) % 360, k = Math.floor(u / 6), f = u / 6 - k, A = vp / 2;
    if (k === 58) return A * (0.12 * Math.sin(2 * Math.PI * f) - 0.35 * f);
    if (k === 59) return A * (-0.35 - 0.6 * f * f) + A * 0.12 * Math.sin(2 * Math.PI * f);
    if (k === 0) return A * 1.15 * Math.sin(2 * Math.PI * f);
    if (k === 57) return A * (f < 0.5 ? Math.sin(2 * Math.PI * f) : 0.4 * Math.sin(2 * Math.PI * f));
    return A * Math.sin(2 * Math.PI * f);
  }
  /** rezultatul programului (captura): Ti = N·P/16 MHz, cu rezonatorul abătut (N contorizat cu f reală) */
  function tiProg(pr, tiAdev, P) { var tick = P / 16e6, N = Math.round(tiAdev * 16e6 * (1 + pr.eclk) / P); return N * tick; }
  function nTah(pr, n) { var v = n * (1 + pr.eT); return v >= 1000 ? Math.round(v) : Math.round(v * 10) / 10; }

  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t61 || {}, T2 = t.t62 || {}, o = { reg: [], gMax: NaN };
    for (var i = 1; i <= 4; i++) {
      var r = T1["r" + i] || {}, f = n(r.f), ti = n(r.ti), np = n(r.n), nt = n(r.nt), x = { f: f, ti: ti, np: np, nt: nt, rg: n(r.rg) };
      x.nf = isFinite(f) ? f * 60 / Z : NaN; x.nti = isFinite(ti) ? 60 / (Z * ti / 1000) : NaN; x.ab = isFinite(np) && isFinite(nt) && nt > 0 ? (np - nt) / nt * 100 : NaN;
      x.eps = isFinite(ti) ? 0.5e-3 / ti * 100 : NaN; o.reg.push(x);
    }
    var abs = o.reg.map(function (x) { return x.ab; }).filter(isFinite); o.abMed = abs.length ? abs.reduce(function (a, b) { return a + Math.abs(b); }, 0) / abs.length : NaN;
    var ok = true; GAPS.forEach(function (g) { var r = T2[cheieG(g)] || {}; if (!ok) return; if (r.sync === "da") o.gMax = g; else if (r.sync === "nu") ok = false; });
    return o;
  }
  function cheieG(g) { return "g" + String(Math.round(g * 10)).padStart(2, "0"); }
  function asteptate(o) { return { q1: 4500, q2: o.abMed, q3: o.gMax, q4: 0.3 }; }

  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tolRel, tolAbs) { a = Number(a); return isFinite(a) && Math.abs(a - b) <= Math.abs(b) * (tolRel || 0) + (tolAbs || 0); };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "n") { var ns = nSS(pr, Number(l.d)); ok = ns > 50 && ap(l.n, ns / (1 + pr.eclk), 0.015) && ap(l.nt, ns * (1 + pr.eT), 0.015, 0.2) && ap(l.f, ns, 0.015) && ap(Number(l.ti) * Number(l.f), 1000 * (1 + pr.eclk), 0.015) && Number(l.rg) > 2.6 && Number(l.rg) < 3.4; }
      else if (l.m === "g") { var v = vpp(pr, Number(l.n), Number(l.g)), s = syncAsteptat(pr, Number(l.n), Number(l.g)); ok = ap(l.vpp, v, 0.15, 0.06 + 6 * pr.sig) && (s === null || s === l.sync); }
      else if (l.m === "acc") { ok = Number(l.rmin) > 1.5 && Number(l.rmin) < 3.2 && (l.sync === "da") === (Number(l.rmin) > Number(l.prag)); }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    var T1 = t.t61 || {}, T2 = t.t62 || {}, T3 = t.t63 || {};
    for (var i = 1; i <= 4; i++) { var r = T1["r" + i] || {}, k = "r" + i;
      [["f", "f", 0.06], ["ti", "ti", 0.00006], ["n", "n", 0.06], ["nt", "nt", 0.06], ["rg", "rg", 0.006]].forEach(function (z) { var v = U.num(r[z[0]]); if (isFinite(v) && !areCit(function (l) { return l.m === "n" && l.k === k && eq(l[z[1]], v, z[2]); })) out.faraCitire++; }); }
    GAPS.forEach(function (g) { var k = cheieG(g), r = T2[k] || {}, v = U.num(r.vpp);
      if (isFinite(v) && !areCit(function (l) { return l.m === "g" && l.k === k && eq(l.vpp, v, 0.006); })) out.faraCitire++;
      if (r.sync && !areCit(function (l) { return l.m === "g" && l.k === k && l.sync === r.sync; })) out.faraCitire++; });
    Object.keys(PRAGURI).forEach(function (k) { var r = T3[k] || {}, v = U.num(r.rmin); if (isFinite(v) && !areCit(function (l) { return l.m === "acc" && l.k === k && eq(l.rmin, v, 0.006); })) out.faraCitire++; });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 1], q2: [0.05, 0.03], q3: [0, 0.01], q4: [0.02, 0.005] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    out.principal = { eticheta: "abaterea medie n [%]", valoare: isFinite(o.abMed) ? Math.round(o.abMed * 1000) / 1000 : "" };
    return out;
  }
  return { Z: Z, LIPSA: LIPSA, GAPS: GAPS, NREF: NREF, TOBS: TOBS, PRAGURI: PRAGURI, FORME: FORME, parametri: parametri, nSS: nSS, vpp: vpp, pLipsa: pLipsa,
    syncAsteptat: syncAsteptat, forma: forma, vVR: vVR, tiProg: tiProg, nTah: nTah, cheieG: cheieG, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
