/* MAM I – Lucrarea 8. Senzori inerțiali (IMU): unghiurile de ruliu și tangaj, filtrul complementar.
   Modelul standului: MPU-6050 pe suportul rotativ (ruliu în jurul axei X) – accelerometrul cu eroare de zero, de scală și zgomot pe
   fiecare axă, montajul ușor rotit față de raportor, accelerațiile cinematice (modulul la distanța r de ax), giroscopul cu eroare de zero,
   de scală, zgomot și saturația la ±250 °/s; programul la 100 Hz (unghiurile din accelerații, integrarea, filtrul complementar);
   ADXL377 (±200 g, 6,5 mV/g) citit cu ADC-ul de 10 biți al plăcii Mega la frecvența aleasă, cu impulsul de șoc semisinusoidal.
   Același model este folosit pe serverul Apps Script (evaluarea). */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l8"] = (function () {
  var UNGHIURI = [0, 15, 30, 45, 60], ALFE = [0.9, 0.98, 0.995], FS = [100, 1000, 4000], DT = 0.01, GSAT = 250, RD = 180 / Math.PI;
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); }, sg = function () { return r() < 0.5 ? -1 : 1; };
    return {
      bx: r2(u(-0.02, 0.02), 4), by: r2(u(-0.02, 0.02), 4), bz: r2(u(-0.03, 0.03), 4), sx: r2(u(-0.02, 0.02), 4), sy: r2(u(-0.02, 0.02), 4), sz: r2(u(-0.02, 0.02), 4),
      sa: r2(u(0.003, 0.006), 4), bgx: r2(sg() * u(0.2, 1.0), 3), bgy: r2(sg() * u(0.2, 1.0), 3), bgz: r2(sg() * u(0.2, 1.0), 3), sgn: r2(u(0.04, 0.09), 3),
      kg: r2(u(-0.015, 0.015), 4), delta: r2(u(-0.5, 0.5), 2), r: r2(u(0.03, 0.045), 3), Tr: r2(u(0.08, 0.12), 3), Apk: r2(u(35, 80), 1), Dsoc: r2(u(1.2, 2.5), 2)
    };
  }
  /** accelerația specifică medie (fără zgomot) [g] la ruliul φ [°], viteza ω [°/s] și accelerația unghiulară ε [°/s²] */
  function acc(pr, phi, om, ep) {
    var f = (phi + pr.delta) / RD, w = om / RD, e = (ep || 0) / RD;
    return { ax: pr.bx, ay: (1 + pr.sy) * (Math.sin(f) - e * pr.r / 9.81) + pr.by, az: (1 + pr.sz) * (Math.cos(f) - w * w * pr.r / 9.81) + pr.bz };
  }
  /** viteza unghiulară măsurată medie [°/s] (cu saturația) */
  function gyro(pr, om) { var g = om * (1 + pr.kg) + pr.bgx; return Math.max(-GSAT, Math.min(GSAT, g)); }
  function phiAcc(ay, az) { return Math.atan2(ay, az) * RD; }
  function tau(alpha, dt) { return alpha * (dt || DT) / (1 - alpha); }
  /** zgomotul staționar al filtrului complementar [°] */
  function sigmaFiltru(pr, alpha) {
    var sp = pr.sa * RD, sg = pr.sgn * DT;
    return Math.sqrt((1 - alpha) * (1 - alpha) / (1 - alpha * alpha) * sp * sp + alpha * alpha / (1 - alpha * alpha) * sg * sg);
  }
  /** deriva filtrului în 60 s (pornit din 0, suportul nemișcat) [°] */
  function derivaFiltru(pr, alpha, corectat) { var b = corectat ? 0 : pr.bgx, T = tau(alpha); return b * T * (1 - Math.exp(-60 / T)); }
  /** profilul înclinării rapide 0 → A în timpul Tr (cosinus): unghiul, viteza, accelerația */
  function profil(t, A, Tr) { if (t <= 0) return [0, 0, 0]; if (t >= Tr) return [A, 0, 0]; var k = Math.PI / Tr; return [A / 2 * (1 - Math.cos(k * t)), A / 2 * k * Math.sin(k * t), A / 2 * k * k * Math.cos(k * t)]; }
  /** timpul până la 90 % din treapta de 30° (înclinare rapidă) al filtrului, deterministic [ms] */
  function t90(pr, alpha, corectat) {
    var A = 30, b = corectat ? pr.bgx : 0, a0 = acc(pr, 0, 0, 0), phi = phiAcc(a0.ay, a0.az) + (pr.bgx - b) * tau(alpha), phi0 = phi;
    for (var k = 1; k < 2000; k++) {
      var t = k * DT, p = profil(t, A, pr.Tr), a = acc(pr, p[0], p[1], p[2]);
      phi = alpha * (phi + (gyro(pr, p[1]) - b) * DT) + (1 - alpha) * phiAcc(a.ay, a.az);
      if (phi >= phi0 + 0.9 * A) return t * 1000;
    }
    return NaN;
  }
  /** impulsul de șoc [g] la momentul t [s] (vârful A, durata D [ms]) */
  function soc(t, A, D) {
    var d = D / 1000; if (t < 0) return 0;
    if (t < d) return A * Math.sin(Math.PI * t / d);
    var u = t - d; return -0.15 * A * Math.exp(-u / 0.001) * Math.sin(2 * Math.PI * 1200 * u);
  }
  /** ADXL377 citit cu analogRead (10 biți, 5 V): codul ADC → g */
  function adxlG(g) { var v = 1.65 + 0.0065 * g, c = Math.max(0, Math.min(1023, Math.round(v / 5 * 1023))); return (c * 5 / 1023 - 1.65) / 0.0065; }
  /** captura programului: vârful, durata (eșantioane ≥ 10 % din vârf, consecutive) și numărul de eșantioane, la fs [Hz] cu faza φ0 ∈ [0,1) */
  function capturaSoc(A, D, fs, faza) {
    var Ts = 1 / fs, v = [], i, pk = -1e9, ip = 0;
    for (i = -20; i < 200; i++) { var t = (i + faza) * Ts; v.push(adxlG(soc(t, A, D) + 1)); }
    for (i = 0; i < v.length; i++) if (v[i] > pk) { pk = v[i]; ip = i; }
    var prag = Math.max(0.1 * pk, 3), n = 0;
    if (pk < 5) return { pk: pk, dur: 0, n: 0, det: false };
    for (i = ip; i >= 0 && v[i] >= prag; i--) n++;
    for (i = ip + 1; i < v.length && v[i] >= prag; i++) n++;
    return { pk: pk, dur: n * Ts * 1000, n: n, det: true };
  }
  function cheieA(a) { return "a" + String(Math.round(a * 1000)); }
  function cheieF(f) { return "f" + f; }

  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T2 = t.t82 || {}, T4 = t.t84 || {}, o = { err: {}, errMed: NaN };
    var e = [];
    UNGHIURI.forEach(function (u) { var r = T2["u" + u] || {}, ay = n(r.ay), az = n(r.az), pr = n(r.phiR), x = { pa: NaN, e: NaN };
      if (isFinite(ay) && isFinite(az)) { x.pa = Math.atan2(ay, az) * RD; if (isFinite(pr)) { x.e = x.pa - pr; e.push(Math.abs(x.e)); } }
      o.err["u" + u] = x; });
    o.errMed = e.length ? e.reduce(function (a, b) { return a + b; }, 0) / e.length : NaN;
    var df = n((T4.fara || {}).d), dc = n((T4.cu || {}).d);
    o.bg = isFinite(df) ? df / 60 : NaN; o.bgc = isFinite(dc) ? dc / 60 : NaN;
    return o;
  }
  function asteptate(o) { return { q1: 1 / (1 + 0.005), q2: Math.abs(o.bg), q3: o.errMed, q4: tau(0.995) }; }

  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tolAbs, tolRel) { a = Number(a); return isFinite(a) && Math.abs(a - b) <= (tolAbs || 0) + Math.abs(b) * (tolRel || 0); };
    log.forEach(function (l) {
      var ok = true, a0 = acc(pr, 0, 0, 0);
      if (l.m === "rep") ok = ap(l.ax, a0.ax, 0.004) && ap(l.ay, a0.ay, 0.004) && ap(l.az, a0.az, 0.004) && ap(l.wx, pr.bgx, 0.04) && ap(l.sax, pr.sa, 0, 0.3) && ap(l.swx, pr.sgn, 0, 0.3);
      else if (l.m === "phi") { var a = acc(pr, Number(l.phiR), 0, 0); ok = ap(l.ay, a.ay, 0.004) && ap(l.az, a.az, 0.004); }
      else if (l.m === "dr") ok = l.k === "fara" ? ap(l.d, pr.bgx * 60, 1.5, 0.05) : Math.abs(Number(l.d)) < 1.2;
      else if (l.m === "cf") { var al = Number(l.alpha), c = l.cor === true || l.cor === "true";
        ok = ap(l.sigma, sigmaFiltru(pr, al), 0.01, 0.4) && ap(l.drift, derivaFiltru(pr, al, c), 0.12, 0.1) && ap(l.t90, t90(pr, al, c), 25, 0.15); }
      else if (l.m === "soc") { var f = Number(l.f), Ts = 1000 / f, pk = Number(l.apk);
        ok = pk <= pr.Apk * 1.25 + 1 && (f < 4000 || (pk >= pr.Apk * 0.6 && ap(l.dur, pr.Dsoc, 2 * Ts, 0.25))); }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    var T1 = t.t81 || {}, T2 = t.t82 || {}, T3 = t.t83 || {}, T4 = t.t84 || {}, T5 = t.t85 || {};
    ["ax", "ay", "az", "wx", "wy", "wz"].forEach(function (c) { var v = U.num((T1.med || {})[c]); if (isFinite(v) && !areCit(function (l) { return l.m === "rep" && eq(l[c], v, c[0] === "w" ? 0.006 : 0.0006); })) out.faraCitire++; });
    UNGHIURI.forEach(function (u) { var r = T2["u" + u] || {}; ["ay", "az"].forEach(function (c) { var v = U.num(r[c]); if (isFinite(v) && !areCit(function (l) { return l.m === "phi" && l.k === "u" + u && eq(l[c], v); })) out.faraCitire++; }); });
    ALFE.forEach(function (a) { var r = T3[cheieA(a)] || {}; [["sigma", 0.006], ["drift", 0.006], ["t90", 0.6]].forEach(function (z) { var v = U.num(r[z[0]]); if (isFinite(v) && !areCit(function (l) { return l.m === "cf" && l.k === cheieA(a) && eq(l[z[0]], v, z[1]); })) out.faraCitire++; }); });
    ["fara", "cu"].forEach(function (k) { var v = U.num((T4[k] || {}).d); if (isFinite(v) && !areCit(function (l) { return l.m === "dr" && l.k === k && eq(l.d, v, 0.006); })) out.faraCitire++; });
    FS.forEach(function (f) { var v = U.num((T5[cheieF(f)] || {}).apk); if (isFinite(v) && !areCit(function (l) { return l.m === "soc" && l.k === cheieF(f) && eq(l.apk, v, 0.06); })) out.faraCitire++; });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.0006], q2: [0.03, 0.01], q3: [0.03, 0.02], q4: [0, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 10000) / 10000 : "—", corect: ok };
    });
    out.principal = { eticheta: "eroarea medie a ruliului [°]", valoare: isFinite(o.errMed) ? Math.round(o.errMed * 1000) / 1000 : "" };
    return out;
  }
  return { UNGHIURI: UNGHIURI, ALFE: ALFE, FS: FS, DT: DT, GSAT: GSAT, parametri: parametri, acc: acc, gyro: gyro, phiAcc: phiAcc, tau: tau, sigmaFiltru: sigmaFiltru,
    derivaFiltru: derivaFiltru, profil: profil, t90: t90, soc: soc, adxlG: adxlG, capturaSoc: capturaSoc, cheieA: cheieA, cheieF: cheieF, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
