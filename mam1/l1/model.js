/* MAM I – Lucrarea 1. Microcontrolere: intrări/ieșiri, convertor A/D, timere, întreruperi și PWM.
   Modelul standului (Arduino Mega 2560 și STM32F103): tensiunea USB, ceasul real, etajele de ieșire, ADC-ul, latența
   întreruperilor. Parametrii sunt individuali; același model este folosit în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l1"] = (function () {
  var OCR = [199, 399, 599];
  var FT = [10000, 16000, 20000, 25000, 32000, 40000, 50000];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      vcc: r2(u(4.72, 4.96), 3),                // tensiunea de alimentare prin USB a plăcii Mega = U_ref al ADC [V]
      vdd: r2(u(3.27, 3.32), 3),                // 3,3 V al plăcii STM32 (VDDA = U_ref) [V]
      fclk: Math.round(16e6 * (1 + u(-0.0035, 0.0035))),   // rezonatorul ceramic de 16 MHz al plăcii Mega [Hz]
      rOutM: r2(u(19, 27), 1), rOutS: r2(u(32, 45), 1),     // rezistența etajului de ieșire (sursă) [Ω]
      vf: r2(u(1.85, 2.05), 2),                 // tensiunea LED-ului roșu [V]
      inl: r2(u(-0.9, 0.9), 2),                 // neliniaritatea integrală a ADC-ului Mega la mijlocul domeniului [LSB]
      lat: r2(u(3.9, 5.1), 2),                  // latența întreruperii cu digitalWrite() în ISR [µs]
      latP: r2(u(0.75, 1.05), 2),               // latența cu scriere directă în registrul PIN [µs]
      fT: FT[Math.floor(r() * FT.length)]       // frecvența cerută la întrebarea 3 [Hz]
    };
  }
  /** tensiunea pe pinul de ieșire cu LED + 220 Ω la masă (stare HIGH) sau starea LOW (fără curent) */
  function uPin(pr, placa, stare) {
    var V = placa === "stm" ? pr.vdd : pr.vcc, Ro = placa === "stm" ? pr.rOutS : pr.rOutM;
    if (!stare) return placa === "stm" ? 0.004 : 0.006;
    var I = Math.max(0, (V - pr.vf) / (220 + Ro));
    return V - I * Ro;
  }
  /** codul ADC (fără zgomot) pentru tensiunea U */
  function codADC(pr, placa, U) {
    var n = placa === "stm" ? 12 : 10, Vr = placa === "stm" ? pr.vdd : pr.vcc, M = Math.pow(2, n), x = U / Vr;
    var e = placa === "stm" ? 0 : pr.inl * Math.sin(Math.PI * x);
    return Math.max(0, Math.min(M - 1, Math.floor(x * M + e)));
  }
  function fPWM(pr, P, top) { return pr.fclk / (P * (top + 1)); }
  function dc(ocr, top) { return (ocr + 1) / (top + 1) * 100; }
  function regresie(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var a = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: a, b: (sy - a * sx) / n }; }
  /** prelucrarea tabelelor: U_ref estimată (panta N = f(U) prin origine), f_clk din PWM, latența medie */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, o = {};
    var su = 0, sn = 0;
    ["p1", "p2", "p3", "p4", "p5"].forEach(function (k) { var r = (t.t12 || {})[k] || {}, u = n(r.U), N = n(r.N); if (isFinite(u) && isFinite(N) && N >= 50) { su += u * u; sn += u * (N + 0.5); } });
    o.uref = sn > 0 ? 1024 * su / sn : NaN;             // N + 0,5 ≈ 1024·U/U_ref (mijlocul treptei)
    var fs = []; OCR.forEach(function (c) { var f = n(((t.t13 || {})["o" + c] || {}).f); if (isFinite(f)) fs.push(f); });
    o.fclk = fs.length ? fs.reduce(function (a, b) { return a + b; }, 0) / fs.length * 800 / 1e6 : NaN;
    var ls = []; ["m1", "m2", "m3"].forEach(function (k) { var v = n(((t.t14 || {})[k] || {}).dw); if (isFinite(v)) ls.push(v); });
    o.lat = ls.length ? ls.reduce(function (a, b) { return a + b; }, 0) / ls.length : NaN;
    return o;
  }
  function asteptate(pr) { return { q1: pr.vcc, q2: pr.fclk / 1e6, q3: Math.round(16e6 / pr.fT) - 1, q4: pr.lat }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "gpio") ok = ap(l.U, uPin(pr, l.placa, l.stare ? 1 : 0), 0.012);
      else if (l.m === "adc") { var Vr = l.placa === "stm" ? pr.vdd : pr.vcc; ok = Number(l.U) >= -0.001 && Number(l.U) <= Vr + 0.001 && ap(l.N, codADC(pr, l.placa, Number(l.U)), l.placa === "stm" ? 4 : 2); }
      else if (l.m === "pwm") ok = ap(l.f, fPWM(pr, 1, 799), fPWM(pr, 1, 799) * 0.002 + 5) && ap(l.dc, dc(Number(l.ocr), 799), 0.25) && ap(l.um, dc(Number(l.ocr), 799) / 100 * pr.vcc, 0.02);
      else if (l.m === "aw") ok = ap(l.f, pr.fclk / (64 * 510), 2) && ap(l.dc, 50.2, 0.4);
      else if (l.m === "lat") ok = ap(l.t, l.v === "port" ? pr.latP : pr.lat, 0.45);
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    [["UOH", 1], ["UOL", 0]].forEach(function (x) { ["mega", "stm"].forEach(function (p) { var v = U.num(((t.t11 || {})[x[0]] || {})[p]); if (isFinite(v) && !inLog(function (l) { return l.m === "gpio" && l.placa === p && !!l.stare === !!x[1] && eq(l.U, v, 0.0011); })) out.faraCitire++; }); });
    ["p1", "p2", "p3", "p4", "p5"].forEach(function (k) { var r = (t.t12 || {})[k] || {}, N = U.num(r.N), u = U.num(r.U); if ((isFinite(N) || isFinite(u)) && !inLog(function (l) { return l.m === "adc" && l.placa === "mega" && eq(l.N, N, 0.1) && eq(l.U, u, 0.0011); })) out.faraCitire++; });
    ["s1", "s2", "s3"].forEach(function (k) { var r = (t.t12b || {})[k] || {}, N = U.num(r.N), u = U.num(r.U); if ((isFinite(N) || isFinite(u)) && !inLog(function (l) { return l.m === "adc" && l.placa === "stm" && eq(l.N, N, 0.1) && eq(l.U, u, 0.0011); })) out.faraCitire++; });
    OCR.forEach(function (c) { var r = (t.t13 || {})["o" + c] || {}, f = U.num(r.f); if (isFinite(f) && !inLog(function (l) { return l.m === "pwm" && Number(l.ocr) === c && eq(l.f, f, 0.6) && eq(l.um, U.num(r.um), 0.0011); })) out.faraCitire++; });
    ["m1", "m2", "m3"].forEach(function (k) { var r = (t.t14 || {})[k] || {}; [["dw", "dw"], ["port", "port"]].forEach(function (c) { var v = U.num(r[c[0]]); if (isFinite(v) && !inLog(function (l) { return l.m === "lat" && l.v === c[1] && eq(l.t, v, 0.006); })) out.faraCitire++; }); });
    var o = prelucreaza(t, U), a = asteptate(pr), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "U_ref estimată [V]", valoare: isFinite(o.uref) ? Math.round(o.uref * 1000) / 1000 : null };
    var tol = { q1: [0.008, 0.005], q2: [0.0008, 0.002], q3: [0, 0.5], q4: [0.08, 0.15] };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 1000) / 1000, corect: ok };
    });
    if (isFinite(o.uref) && Math.abs(o.uref - pr.vcc) > 0.03) out.motive.push("U_ref rezultată din Tabelul 1.2 (" + o.uref.toFixed(3) + " V) nu corespunde tensiunii plăcii – verificați citirile");
    return out;
  }
  return { OCR: OCR, FT: FT, parametri: parametri, uPin: uPin, codADC: codADC, fPWM: fPWM, dc: dc, regresie: regresie, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
