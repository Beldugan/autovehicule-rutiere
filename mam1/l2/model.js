/* MAM I – Lucrarea 2. Condiționarea semnalelor și conversia analog-digitală.
   Modelul standului: sursa dublă 12 V / 5 V, divizoarele (toleranțele rezistoarelor), filtrul RC (R ±1 %, C ±10 %), generatorul
   (eroarea de frecvență), ADC-ul STM32F103 (12 biți, VDDA), zgomotul cuplat de motor. Parametrii sunt individuali;
   același model este folosit în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l2"] = (function () {
  var FREC = [20, 100, 159, 500, 2000];            // Tabelul 2.2
  var FAL = [100, 900, 1100];                       // Tabelul 2.3
  var FILTRE = { raw: { t: "x", n: 1 }, m4: { t: "m", n: 4 }, m8: { t: "m", n: 8 }, m16: { t: "m", n: 16 }, e50: { t: "e", a: 0.5 }, e20: { t: "e", a: 0.2 }, e05: { t: "e", a: 0.05 } };
  var FQ2 = [1300, 1450, 1700, 1850, 2300, 2600, 3200];
  var TAU = [40, 60, 80, 100, 150, 200, 250];
  var E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      u12: r2(u(11.92, 12.12), 3), u5: r2(u(4.93, 5.06), 3), vdd: r2(u(3.28, 3.32), 3),
      e1: r2(u(-0.0095, 0.0095), 4), e2: r2(u(-0.0095, 0.0095), 4), e3: r2(u(-0.0095, 0.0095), 4), e4: r2(u(-0.0095, 0.0095), 4),   // toleranțele R1, R2 (12 V) și R1, R2 (5 V)
      rRC: Math.round(10000 * (1 + u(-0.009, 0.009))), cRC: r2(100e-9 * (1 + u(-0.09, 0.09)), 12),
      eg: r2(u(-0.006, 0.006), 4),                // eroarea relativă de frecvență a generatorului
      sig: r2(u(6, 13), 2),                       // abaterea standard a zgomotului la intrarea ADC [LSB]
      fq2: FQ2[Math.floor(r() * FQ2.length)], tau: TAU[Math.floor(r() * TAU.length)]
    };
  }
  function fc(pr) { return 1 / (2 * Math.PI * pr.rRC * pr.cRC); }
  function H(pr, f) { return 1 / Math.sqrt(1 + Math.pow(f / fc(pr), 2)); }
  function uDiv(pr, d, R1, R2) {               // tensiunea reală la ieșirea divizorului (R în kΩ, nominale)
    var a = d === "d12" ? [pr.e1, pr.e2, pr.u12] : [pr.e3, pr.e4, pr.u5], r1 = R1 * (1 + a[0]), r2_ = R2 * (1 + a[1]);
    return a[2] * r2_ / (r1 + r2_);
  }
  function alias(f, fs) { var k = Math.round(f / fs); return Math.abs(f - k * fs); }
  function sigTeor(pr, k) { var F = FILTRE[k]; if (F.t === "x") return pr.sig; if (F.t === "m") return pr.sig / Math.sqrt(F.n); return pr.sig * Math.sqrt(F.a / (2 - F.a)); }
  function intTeor(k, Ts) {                    // întârzierea până la 63 % a unei trepte [ms] (în eșantioane întregi)
    var F = FILTRE[k]; if (F.t === "x") return 0; if (F.t === "m") return Math.ceil(0.632 * F.n) * Ts;
    return Math.ceil(Math.log(0.368) / Math.log(1 - F.a)) * Ts;
  }
  function asteptate(pr) { return { q1: fc(pr), q2: alias(pr.fq2, 1000), q3: 5 / (pr.tau + 5), q4: pr.sig }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "uin") ok = ap(l.U, l.d === "d12" ? pr.u12 : pr.u5, 0.012);
      else if (l.m === "div") ok = ap(l.U, uDiv(pr, l.d, Number(l.R1), Number(l.R2)), 0.012);
      else if (l.m === "rc") { var fr = Number(l.f) * (1 + pr.eg); ok = ap(l.uin, 2.0, 0.06) && ap(Number(l.uout) / Number(l.uin), H(pr, fr), 0.02); }
      else if (l.m === "fap") { var fa = alias(Number(l.f) * (1 + pr.eg), 1000); ok = ap(l.fa, fa, fa * 0.08 + 3); }
      else if (l.m === "amp") { var ff = Number(l.f) * (1 + pr.eg); ok = ap(l.a, 2 * H(pr, ff), 0.08 + 0.06 * H(pr, ff)); }
      else if (l.m === "flt") { ok = ap(l.s, sigTeor(pr, l.k), sigTeor(pr, l.k) * 0.3 + 0.4) && ap(l.del, intTeor(l.k, 10), 21); }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    ["d12", "d5"].forEach(function (k) { var r = (t.t21 || {})[k] || {}, ui = U.num(r.Uin), um = U.num(r.Um);
      if (isFinite(ui) && !inLog(function (l) { return l.m === "uin" && l.d === k && eq(l.U, ui, 0.0011); })) out.faraCitire++;
      if (isFinite(um) && !inLog(function (l) { return l.m === "div" && l.d === k && eq(l.U, um, 0.0011); })) out.faraCitire++; });
    FREC.forEach(function (f) { var r = (t.t22 || {})["f" + f] || {}, uo = U.num(r.Uout); if (isFinite(uo) && !inLog(function (l) { return l.m === "rc" && Number(l.f) === f && eq(l.uout, uo, 0.006); })) out.faraCitire++; });
    FAL.forEach(function (f) { var r = (t.t23 || {})["f" + f] || {}, fa = U.num(r.fap), a = U.num(r.amp);
      if (isFinite(fa) && !inLog(function (l) { return l.m === "fap" && Number(l.f) === f && eq(l.fa, fa, 0.06); })) out.faraCitire++;
      if (isFinite(a) && !inLog(function (l) { return l.m === "amp" && Number(l.f) === f && eq(l.a, a, 0.0011); })) out.faraCitire++; });
    Object.keys(FILTRE).forEach(function (k) { var r = (t.t24 || {})[k] || {}, s = U.num(r.sig); if (isFinite(s) && !inLog(function (l) { return l.m === "flt" && l.k === k && eq(l.s, s, 0.006); })) out.faraCitire++; });
    var a = asteptate(pr), rasp = d.raspunsuri || {};
    var tol = { q1: [0.04, 0], q2: [0, 0.5], q3: [0.02, 0.002], q4: [0.15, 0.3] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 1000) / 1000, corect: ok };
    });
    var s0 = U.num(((t.t24 || {}).raw || {}).sig);
    out.principal = { eticheta: "σ zgomot [LSB]", valoare: isFinite(s0) ? s0 : null };
    return out;
  }
  return { FREC: FREC, FAL: FAL, FILTRE: FILTRE, E24: E24, parametri: parametri, fc: fc, H: H, uDiv: uDiv, alias: alias, sigTeor: sigTeor, intTeor: intTeor, asteptate: asteptate, verifica: verifica };
})();
