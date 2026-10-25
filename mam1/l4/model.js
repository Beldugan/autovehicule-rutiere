/* MAM I – Lucrarea 4. Senzori de temperatură: liniarizare și constanta de timp.
   Modelul standului: termistorul NTC auto (carcasă de alamă M12) în divizor cu Rp = 10 kΩ din 5 V al plăcii (ratiometric, ADC 10 biți),
   LM35 (10 mV/°C, citit cu referința de 5 V a plăcii – NU ratiometric), DS18B20 în sondă de inox (rezoluție 9…12 biți, conversie
   93,75·2^(r−9) ms, citire fără blocare la fiecare 0,5 s), termocuplul K cu MAX6675 (0,25 °C, conversie continuă 220 ms) și
   termometrul etalon (0,1 °C). Fiecare senzor este un sistem de ordinul 1 cu constanta de timp proprie (în apă τ, în aer f·τ).
   Caracteristica reală a NTC-ului: ln(R/R0) = B·x + K·x², x = 1/T − 1/T0 (modelul B este exact numai la K = 0).
   Parametrii sunt individuali; același model este folosit în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l4"] = (function () {
  var SENZ = ["ntc", "lm", "ds", "tc"], NUME = { ntc: "NTC auto", lm: "LM35", ds: "DS18B20 (sondă)", tc: "Termocuplu K" };
  var RP = 10000, R0 = 2500, T0K = 298.15, BN = 3450, KN = 6.0e4, NS = 121, DT = 0.5, TCK = 0.22;
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      Ta: r2(u(20.5, 24.5), 2), dg: r2(u(-0.8, -0.2), 2), Tw0: r2(u(56, 64), 2), tauC: Math.round(u(10800, 18000)),
      vcc: r2(u(4.86, 5.02), 3),
      R0a: r2(R0 * (1 + u(-0.03, 0.03)), 1), Ba: r2(BN + u(-45, 45), 1), Ka: Math.round(KN * u(0.8, 1.2)), Rpa: r2(RP * (1 + u(-0.01, 0.01)), 1),
      eLM: r2(u(-0.4, 0.4), 3), eDS: r2(u(-0.35, 0.35), 3), eTK: r2(u(-1.4, 1.4), 3), eE: r2(u(-0.1, 0.1), 3),
      tN: r2(u(9, 15), 2), tL: r2(u(4.5, 8), 2), tD: r2(u(5, 8.5), 2), tK: r2(u(1.2, 2.4), 2), tE: r2(u(2, 3.2), 2), fa: r2(u(9, 13), 2),
      kDS: r2(u(0.92, 1.0), 3), sig: r2(u(0.45, 0.7), 3), sK: r2(u(0.08, 0.15), 3)
    };
  }
  /** constanta de timp a senzorului k în mediul m ("apa" | "aer") [s] */
  function tau(pr, k, m) { var t = { ntc: pr.tN, lm: pr.tL, ds: pr.tD, tc: pr.tK, et: pr.tE }[k]; return m === "aer" ? t * pr.fa : t; }
  /** temperatura mediilor: aer, pahar (apă la temperatura camerei, puțin sub ea prin evaporare), recipientul izolat (se răcește lent) */
  function mediu(pr, poz, t) { return poz === "apa" ? pr.Ta + (pr.Tw0 - pr.Ta) * Math.exp(-(t || 0) / pr.tauC) : poz === "pahar" ? pr.Ta + pr.dg : pr.Ta; }
  var xT = function (T) { return 1 / (T + 273.15) - 1 / T0K; };
  /** rezistența reală a NTC-ului [Ω] și cea nominală (tabelul constructorului) */
  function rNTC(pr, T) { var x = xT(T); return pr.R0a * Math.exp(pr.Ba * x + pr.Ka * x * x); }
  function rNom(T) { var x = xT(T); return R0 * Math.exp(BN * x + KN * x * x); }
  var TABEL = []; for (var Tt = -20; Tt <= 120; Tt += 10) TABEL.push([Tt, Math.round(rNom(Tt) / (rNom(Tt) > 1000 ? 10 : 1)) * (rNom(Tt) > 1000 ? 10 : 1)]);
  /** modelul B (4.2) [°C] */
  function tB(R, B, r0, t0) { return 1 / (1 / (t0 || T0K) + Math.log(R / (r0 || R0)) / (B || BN)) - 273.15; }
  /** temperatura din tabelul constructorului (interpolare liniară în ln R) [°C] */
  function tTab(R) {
    if (!(R > 0)) return NaN;
    for (var i = 0; i < TABEL.length - 1; i++) { var a = TABEL[i], b = TABEL[i + 1];
      if (R <= a[1] && R >= b[1]) return a[0] + (b[0] - a[0]) * Math.log(R / a[1]) / Math.log(b[1] / a[1]); }
    return NaN;
  }
  /** autoîncălzirea NTC-ului (curentul divizorului): δ ≈ 2,5 mW/K în aer, 25 mW/K în apă */
  function autoInc(pr, T, m) { var R = rNTC(pr, T), I = pr.vcc / (R + pr.Rpa), P = I * I * R; return P / (m === "aer" ? 0.0025 : 0.025); }
  /** tensiunea divizorului (absolută) [V] */
  function uNTC(pr, T, m) { var R = rNTC(pr, T + autoInc(pr, T, m)); return pr.vcc * R / (R + pr.Rpa); }
  var gs = function (rnd) { var a = 0, b = 0; while (!a) a = rnd(); while (!b) b = rnd(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
  /** citirea programului pentru NTC: ADC (ratiometric) mediat pe n eșantioane, apoi (4.1) și modelul B cu B din program.
      rnd – generator (citire reală, cu zgomot) sau null (valoarea așteptată) */
  function citNTC(pr, T, m, cfg, rnd, dec) {
    var x, n = (cfg && cfg.n) || 1, B = (cfg && cfg.B) || BN, s = 0;
    if (dec) x = 1023.6; else { var R = rNTC(pr, T + autoInc(pr, T, m)); x = R / (R + pr.Rpa) * 1024; }
    if (rnd) { for (var i = 0; i < n; i++) s += Math.max(0, Math.min(1023, Math.floor(x + gs(rnd) * pr.sig))); s /= n; } else s = Math.min(1023, x - 0.5);
    var u = s * 5 / 1024, r = RP * u / (5 - u);
    return tB(r, B);
  }
  /** °C per LSB al NTC-ului la temperatura T (pentru toleranțe) */
  function lsbNTC(pr, T) { var R = rNTC(pr, T), dR = -(pr.Ba - 2 * pr.Ka * xT(T)) / Math.pow(T + 273.15, 2) * R; return Math.abs(1 / (pr.Rpa / Math.pow(R + pr.Rpa, 2) * 1024 * dR)); }
  /** LM35: U = 10 mV/°C, ADC cu referința = 5 V al plăcii (pr.vcc), programul presupune 5,0 V */
  function citLM(pr, T, rnd) { var x = 0.01 * (T + pr.eLM) / pr.vcc * 1024; var N = rnd ? Math.floor(x + gs(rnd) * pr.sig) : x - 0.5; return Math.max(0, N) * 500 / 1024; }
  /** DS18B20: eroare proprie, rotunjire la rezoluție */
  function qDS(res) { return 0.0625 * Math.pow(2, 12 - res); }
  function tConv(pr, res) { return 0.09375 * Math.pow(2, res - 9) * pr.kDS; }
  function citDS(pr, T, res) { var q = qDS(res || 12); return Math.round((T + pr.eDS) / q) * q; }
  /** MAX6675: 0,25 °C (trunchiere), eroarea compensării joncțiunii reci */
  function citTK(pr, T, rnd) { var v = T + pr.eTK + (rnd ? gs(rnd) * pr.sK : 0.125); return Math.floor(v * 4) / 4; }
  function citE(pr, T) { return Math.round((T + pr.eE) * 10) / 10; }
  /** treapta de temperatură: senzorii (temperaturi inițiale T0s) intră la t = 0 în apa la Tw; 121 de eșantioane la 0,5 s.
      Întoarce seriile programului (NTC, LM35, DS18B20, TK) și indicația etalonului la 60 s. */
  function treapta(pr, cfg, T0s, Tw, rnd) {
    cfg = cfg || {}; var res = cfg.res || 12, tc = tConv(pr, res), o = { ntc: [], lm: [], ds: [], tc: [] };
    var Ts = function (k, t) { var a = T0s[k]; return t <= 0 ? a : Tw + (a - Tw) * Math.exp(-t / tau(pr, k, "apa")); };
    var dsStart = -(rnd ? rnd() * 0.5 : 0.25), dsVal = citDS(pr, T0s.ds, res);
    for (var i = 0; i < NS; i++) {
      var t = i * DT;
      o.ntc.push(r2(citNTC(pr, Ts("ntc", t), "apa", cfg, rnd), 2));
      o.lm.push(r2(citLM(pr, Ts("lm", t), rnd), 2));
      if (t - dsStart >= tc) { dsVal = citDS(pr, Ts("ds", dsStart + tc / 2), res); dsStart = t; }
      o.ds.push(r2(dsVal, 4));
      var tk = Math.floor(t / TCK) * TCK - TCK / 2;
      o.tc.push(r2(citTK(pr, Ts("tc", tk), rnd), 2));
    }
    o.te = citE(pr, Tw + (T0s.et - Tw) * Math.exp(-60 / tau(pr, "et", "apa")));
    return o;
  }
  /** momentul atingerii a 63,2 % din variație (primul eșantion ≥ ϑ(τ)) și valoarea interpolată */
  function trecere(s) {
    var a = s[0], b = s[s.length - 1], tt = a + 0.632 * (b - a), up = b >= a;
    for (var i = 0; i < s.length; i++) if (up ? s[i] >= tt : s[i] <= tt) {
      var ti = i === 0 ? 0 : (i - 1 + (tt - s[i - 1]) / (s[i] - s[i - 1])) * DT;
      return { t0: a, tinf: b, tt: tt, k: i, t: i * DT, ti: ti };
    }
    return { t0: a, tinf: b, tt: tt, k: -1, t: NaN, ti: NaN };
  }
  /** constanta de timp „măsurabilă" (seria fără zgomot, din aer la Ta în apa la 60 °C) */
  function tauMasurat(pr, k, cfg) {
    var T0s = { ntc: pr.Ta, lm: pr.Ta, ds: pr.Ta, tc: pr.Ta, et: pr.Ta };
    return trecere(treapta(pr, cfg || { B: BN, n: 16, res: 12 }, T0s, 60, null)[k]).ti;
  }
  /** valoarea așteptată a citirii programului, senzorul stabilizat la temperatura T a mediului m */
  function asteptatCit(pr, k, T, m, cfg) {
    if (k === "ntc") return citNTC(pr, T, m, cfg, null);
    if (k === "lm") return citLM(pr, T, null);
    if (k === "ds") return citDS(pr, T, (cfg && cfg.res) || 12);
    return citTK(pr, T, null);
  }
  function tolCit(pr, k, T, cfg) {
    if (k === "ntc") return 0.25 + lsbNTC(pr, T) * (((cfg && cfg.n) || 1) > 1 ? 0.8 : 1.4);
    if (k === "lm") return 0.75; if (k === "ds") return qDS((cfg && cfg.res) || 12) + 0.08; return 0.5;
  }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t41 || {}, T2 = t.t42 || {}, T3 = t.t43 || {}, o = { err: {}, tau: {}, r: {} };
    ["aer", "apa"].forEach(function (s) { var r = T1[s] || {}, e = n(r.et); o.err[s] = {}; SENZ.forEach(function (k) { o.err[s][k] = n(r[k]) - e; }); });
    SENZ.forEach(function (k) { var r = T2[k] || {}, a = n(r.t0), b = n(r.tinf); o.tau[k] = { tt: a + 0.632 * (b - a), tau: n(r.tau), t95: 3 * n(r.tau) }; });
    ["aer", "apa"].forEach(function (s) { var r = T3[s] || {}, us = n(r.us), ur = n(r.uref), rc = RP * us / (ur - us);
      o.r[s] = { rc: rc, tb: tB(rc, BN), ttab: tTab(rc), rm: n(r.rm), te: n(r.te), tbm: tB(n(r.rm), BN) }; });
    return o;
  }
  var Q4 = tB(RP * 0.3 / 4.7, BN);
  function asteptate(o, pr) { return { q1: o.err.apa.ntc, q2: tauMasurat(pr, "ntc"), q3: tauMasurat(pr, "tc"), q4: Q4 }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, rec = null;
    var ap = function (a, b, tol) { return isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true, Tt;
      if (l.m === "st") {
        Tt = Number(l.Te) - pr.eE;
        if (l.sit === "aer") ok = ap(l.Te, pr.Ta + pr.eE, 0.3); else ok = Number(l.Te) > pr.Ta + 20 && Number(l.Te) <= pr.Tw0 + pr.eE + 0.2;
        SENZ.forEach(function (k) { if (!ap(l.v[k], asteptatCit(pr, k, Tt, l.sit === "aer" ? "aer" : "apa", l.cfg), tolCit(pr, k, Tt, l.cfg) + 0.1)) ok = false; });
      } else if (l.m === "us") { Tt = Number(l.Te) - pr.eE; var du = Math.abs(uNTC(pr, Tt + 0.15, l.sit) - uNTC(pr, Tt - 0.15, l.sit)); ok = ap(l.U, uNTC(pr, Tt, l.sit), 0.003 + du); }
      else if (l.m === "uref") ok = ap(l.U, pr.vcc, 0.004);
      else if (l.m === "rm") { Tt = Number(l.Te) - pr.eE; var R = rNTC(pr, Tt); ok = ap(l.R, R, Math.abs(rNTC(pr, Tt + 0.3) - R) + R * 0.006 + 1); }
      else if (l.m === "tr") {
        rec = l; var s = l.s || {};
        SENZ.forEach(function (k) { var x = s[k] || []; if (x.length !== NS) { ok = false; return; }
          var T0s = { ntc: pr.Ta, lm: pr.Ta, ds: pr.Ta, tc: pr.Ta, et: pr.Ta }, tw = Number(l.Te) - pr.eE;
          var ref = trecere(treapta(pr, l.cfg, T0s, tw, null)[k]), m = trecere(x), tk = tau(pr, k, "apa");
          if (Math.abs(m.ti - ref.ti) > 0.12 * tk + (k === "ds" ? 1.3 : 0.8)) ok = false;
          if (Math.abs(m.tinf - asteptatCit(pr, k, tw - (tw - pr.Ta) * Math.exp(-60 / tk), "apa", l.cfg)) > tolCit(pr, k, tw, l.cfg) + 0.6) ok = false; });
      } else if (l.m === "tau") {
        var sr = rec && rec.s && rec.s[l.k]; if (!sr) ok = false;
        else { var c = trecere(sr); ok = ap(l.t0, c.t0, 0.006) && ap(l.tinf, c.tinf, 0.006) && ap(l.tau, c.t, 0.51); }
      }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.006); };
    var T1 = t.t41 || {}, T2 = t.t42 || {}, T3 = t.t43 || {};
    ["aer", "apa"].forEach(function (s) { var r = T1[s] || {};
      ["et"].concat(SENZ).forEach(function (k) { var v = U.num(r[k]); if (isFinite(v) && !areCit(function (l) { return l.m === "st" && l.sit === s && eq(k === "et" ? l.Te : l.v[k], v, 0.006); })) out.faraCitire++; });
      var q = T3[s] || {};
      [["us", "us", "U"], ["uref", "uref", "U"], ["rm", "rm", "R"]].forEach(function (z) { var v = U.num(q[z[0]]); if (isFinite(v) && !areCit(function (l) { return l.m === z[1] && (z[1] === "uref" || l.sit === s) && eq(l[z[2]], v, z[1] === "rm" ? 0.6 : 0.0006); })) out.faraCitire++; }); });
    SENZ.forEach(function (k) { var r = T2[k] || {}; ["t0", "tinf", "tau"].forEach(function (c) { var v = U.num(r[c]); if (isFinite(v) && !areCit(function (l) { return l.m === "tau" && l.k === k && eq(l[c], v, 0.006); })) out.faraCitire++; }); });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o, pr), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.1], q2: [0.1, 0.6], q3: [0.15, 0.4], q4: [0, 0.3] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok };
    });
    var tn = U.num((T2.ntc || {}).tau);
    out.principal = { eticheta: "τ NTC [s]", valoare: isFinite(tn) ? tn : "" };
    return out;
  }
  return { SENZ: SENZ, NUME: NUME, RP: RP, R0: R0, T0K: T0K, BN: BN, NS: NS, DT: DT, TCK: TCK, TABEL: TABEL, parametri: parametri, tau: tau, mediu: mediu,
    rNTC: rNTC, rNom: rNom, tB: tB, tTab: tTab, autoInc: autoInc, uNTC: uNTC, citNTC: citNTC, lsbNTC: lsbNTC, citLM: citLM, qDS: qDS, tConv: tConv, citDS: citDS,
    citTK: citTK, citE: citE, treapta: treapta, trecere: trecere, tauMasurat: tauMasurat, asteptatCit: asteptatCit, tolCit: tolCit,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
