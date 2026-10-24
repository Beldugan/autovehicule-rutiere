/* MAM I – Lucrarea 3. Senzorul pedalei de accelerație cu două piste: plauzibilitate și reacția la defect.
   Modelul standului: senzor potențiometric cu două piste (conector cu 6 pini, ca la pedalele VW/Hella: 1 +5 V pistă 2,
   2 +5 V pistă 1, 3 masă pistă 1, 4 semnal pistă 1, 5 masă pistă 2, 6 semnal pistă 2), alimentat din 5 V al plăcii
   Arduino Mega (ratiometric), intrările A0/A1 cu rezistențe de pull-down de 22 kΩ, comutatoarele de defect, ADC de 10 biți
   referit la 5 V-ul plăcii și bucla programului de verificare. Rezolvarea circuitului este nodală (cablaj oarecare).
   Parametrii sunt individuali; același model este folosit în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l3"] = (function () {
  var POZ = [0, 20, 40, 60, 80, 100], TETA_MAX = 60;           // cursa pârghiei: 0…60° ↔ s = 0…100 %
  var FUNCTII = ["+5 V pista 1", "masă pista 1", "semnal pista 1", "+5 V pista 2", "masă pista 2", "semnal pista 2"];
  var ADEVAR = { 1: "+5 V pista 2", 2: "+5 V pista 1", 3: "masă pista 1", 4: "semnal pista 1", 5: "masă pista 2", 6: "semnal pista 2" };
  var RPD = 22, RS3 = 2.2, S_DEF = 60;                       // kΩ; poziția pentru Tabelul 3.2 [%]
  var CONFIG = { c1: { eps: 0.1, n: 1 }, c2: { eps: 0.2, n: 5 }, c3: { eps: 0.4, n: 10 } };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      vcc: r2(u(4.82, 5.02), 3),                               // 5 V al plăcii (USB)
      u10: r2(u(0.70, 0.80), 3), k1: r2(u(0.0342, 0.0358), 5),  // caracteristica pistei 1 (raportată la 5 V)
      g2: r2(u(0.492, 0.508), 4), b2: r2(u(-0.015, 0.015), 4),  // pista 2 ≈ pista 1 / 2
      nl1: r2(u(0.006, 0.02), 4), nl2: r2(u(-0.008, 0.008), 4), // neliniaritatea pistelor [V]
      R1: r2(u(1.0, 1.4), 3), R2: r2(u(1.1, 1.5), 3),           // rezistențele pistelor [kΩ] (pista 2 are în serie un rezistor egal)
      Tl: r2(u(10.18, 10.42), 3), tO: r2(u(21, 27), 2),         // perioada buclei și durata actualizării OLED [ms]
      sig: r2(u(0.002, 0.005), 4), pSp: r2(u(0.03, 0.07), 3)    // zgomotul și probabilitatea întreruperilor de contact la mișcare
    };
  }
  /** pozițiile cursoarelor (0…1) pe cele două piste pentru cursa s [%] */
  function x1(pr, s) { return (pr.u10 + pr.k1 * s + pr.nl1 * Math.sin(Math.PI * s / 100)) / 5; }
  function y2(pr, s) { return 2 * (pr.g2 * (pr.u10 + pr.k1 * s) + pr.b2 + pr.nl2 * Math.sin(Math.PI * s / 100)) / 5; }
  /** circuitul complet. as – legătura fiecărui pin 1…6 ("5V", "GND", "A0", "A1", "nc"); f – {s1, s2, s3} (comutatoarele de defect);
      dec – conectorul decuplat. Întoarce tensiunile pinilor 1…6 și ale intrărilor A0, A1 [V]. */
  function circuit(pr, s, as, f, dec) {
    f = f || {}; as = as || {};
    var N = 8, idx = function (p) { return p - 1; }, A0 = 6, A1 = 7, G = [], b = [], fix = [];
    for (var i = 0; i < N; i++) { G.push([0, 0, 0, 0, 0, 0, 0, 0]); b.push(0); fix.push(null); }
    var R = function (a, c, r) { var g = 1 / r; G[a][a] += g; G[c][c] += g; G[a][c] -= g; G[c][a] -= g; };
    var Rg = function (a, r) { G[a][a] += 1 / r; };
    var xa = Math.min(0.999, Math.max(0.001, x1(pr, s))), ya = Math.min(0.999, Math.max(0.001, y2(pr, s)));
    R(idx(2), idx(4), pr.R1 * (1 - xa)); R(idx(4), idx(3), pr.R1 * xa);                 // pista 1
    R(idx(1), idx(6), pr.R2 + pr.R2 * (1 - ya)); R(idx(6), idx(5), pr.R2 * ya);         // pista 2 (rezistor serie + potențiometru)
    Rg(A0, RPD); Rg(A1, RPD);
    for (i = 0; i < N; i++) Rg(i, 1e7);                                                  // izolația (evită nodurile flotante)
    if (!dec) for (var p = 1; p <= 6; p++) {
      var a = as[p] || "nc";
      if (a === "5V") fix[idx(p)] = pr.vcc; else if (a === "GND") fix[idx(p)] = 0;
      else if (a === "A0") R(idx(p), A0, 0.001);
      else if (a === "A1") { if (!f.s1) R(idx(p), A1, f.s3 ? RS3 : 0.001); }
    }
    if (f.s2) fix[A0] = 0;                                                               // scurt la masă al firului spre A0
    for (i = 0; i < N; i++) if (fix[i] !== null) { for (var j = 0; j < N; j++) G[i][j] = 0; G[i][i] = 1; b[i] = fix[i]; }
    // eliminare Gauss
    for (var k = 0; k < N; k++) {
      var m = k; for (i = k + 1; i < N; i++) if (Math.abs(G[i][k]) > Math.abs(G[m][k])) m = i;
      var t = G[k]; G[k] = G[m]; G[m] = t; var tb = b[k]; b[k] = b[m]; b[m] = tb;
      for (i = k + 1; i < N; i++) { var c = G[i][k] / G[k][k]; if (!c) continue; for (j = k; j < N; j++) G[i][j] -= c * G[k][j]; b[i] -= c * b[k]; }
    }
    var v = new Array(N);
    for (i = N - 1; i >= 0; i--) { var sum = b[i]; for (j = i + 1; j < N; j++) sum -= G[i][j] * v[j]; v[i] = sum / G[i][i]; }
    return { pin: [null, v[0], v[1], v[2], v[3], v[4], v[5]], A0: v[A0], A1: v[A1] };
  }
  var CORECT = { 1: "5V", 2: "5V", 3: "GND", 4: "A0", 5: "GND", 6: "A1" };
  function cablaj(ident) {               // legăturile rezultate din identificarea pinilor (funcție → borna plăcii)
    var as = {}; for (var p = 1; p <= 6; p++) { var fn = ident[p] || ""; as[p] = /^\+5/.test(fn) ? "5V" : /^masă/.test(fn) ? "GND" : fn === "semnal pista 1" ? "A0" : fn === "semnal pista 2" ? "A1" : "nc"; } return as;
  }
  /** rezistența între doi pini ai senzorului decuplat [kΩ] sau Infinity */
  function ohm(pr, s, a, c) {
    if (a === c) return 0;
    var xa = x1(pr, s), ya = y2(pr, s), T1 = { 2: 0, 4: 1, 3: 2 }, T2 = { 1: 0, 6: 1, 5: 2 };
    var r1 = [pr.R1 * (1 - xa), pr.R1 * xa], r2_ = [pr.R2 * (2 - ya), pr.R2 * ya];
    var f = function (T, rr) { if (!(a in T) || !(c in T)) return null; var i = Math.min(T[a], T[c]), j = Math.max(T[a], T[c]), s_ = 0; for (var k = i; k < j; k++) s_ += rr[k]; return s_; };
    var v = f(T1, r1); if (v === null) v = f(T2, r2_); return v === null ? Infinity : v;
  }
  function adc(pr, V) { return Math.max(0, Math.min(1023, Math.floor(V / pr.vcc * 1024))); }
  function uProg(N) { return N * 5 / 1024; }
  /** citirile programului (U = N·5/1024) cu cablajul corect, în poziția s, cu defectele f */
  function citiri(pr, s, f) { var c = circuit(pr, s, CORECT, f); var n0 = adc(pr, c.A0), n1 = adc(pr, c.A1); return { u1: uProg(n0), u2: uProg(n1), n0: n0, n1: n1 }; }
  function invalid(u1, u2, eps) { return u1 < 0.25 || u1 > 4.75 || u2 < 0.25 || u2 > 4.75 || Math.abs(u1 - 2 * u2) > eps; }
  function motiv(u1, u2, eps) {
    if (u1 < 0.25) return "domeniu U1 < 0,25 V"; if (u1 > 4.75) return "domeniu U1 > 4,75 V";
    if (u2 < 0.25) return "domeniu U2 < 0,25 V"; if (u2 > 4.75) return "domeniu U2 > 4,75 V";
    if (Math.abs(u1 - 2 * u2) > eps) return "plauzibilitate ΔU > ε"; return "";
  }
  function regresie(pr) {   // dreapta de regresie a pistei 1 din tensiunile reale (multimetru), cablaj corect
    var xs = POZ, ys = POZ.map(function (s) { return circuit(pr, s, CORECT, {}).A0; }), n = xs.length;
    var mx = xs.reduce(function (a, b) { return a + b; }, 0) / n, my = ys.reduce(function (a, b) { return a + b; }, 0) / n, sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
    var k = sxy / sxx, a = my - k * mx, dmax = 0;
    for (i = 0; i < n; i++) dmax = Math.max(dmax, Math.abs(ys[i] - (a + k * xs[i])));
    return { u0: a, k: k, dlin: dmax / (Math.max.apply(null, ys) - Math.min.apply(null, ys)) * 100 };
  }
  function asteptate(pr) {
    var g = regresie(pr), d = citiri(pr, S_DEF, { s3: true });
    return { q1: g.u0, q2: g.k, q3: g.dlin, q4: Math.abs(d.u1 - 2 * d.u2) };
  }
  function tConf(pr, n) { return [(n - 1) * pr.Tl - 0.6, (n - 1) * pr.Tl + pr.tO + 0.6]; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "ohm") { var R = ohm(pr, Number(l.s), Number(l.a), Number(l.b)); ok = l.R === "OL" ? !isFinite(R) : isFinite(R) && ap(Number(l.R), R * 1000, R * 1000 * 0.012 + 3); }
      else if (l.m === "u") { var c = circuit(pr, Number(l.s), l.as, l.f, false), v = l.n === "A0" ? c.A0 : l.n === "A1" ? c.A1 : l.n === "5V" ? pr.vcc : NaN; ok = isFinite(v) && ap(l.U, v, 0.006); }
      else if (l.m === "def") { var q = citiri(pr, Number(l.s), l.f), tc = tConf(pr, Number(l.n)), dt_ = invalid(q.u1, q.u2, Number(l.eps));
        ok = ap(l.u1, q.u1, 0.012) && ap(l.u2, q.u2, 0.012) && (dt_ ? Number(l.tc) >= tc[0] && Number(l.tc) <= tc[1] : l.tc === null); }
      else if (l.m === "cmp") { var C = CONFIG[l.k], q2 = citiri(pr, S_DEF, { s3: true }), det = invalid(q2.u1, q2.u2, C.eps), tc2 = tConf(pr, C.n);
        ok = (l.det === "da") === det && (!det || (Number(l.tc) >= tc2[0] && Number(l.tc) <= tc2[1])) && Number(l.inv) >= 0 && Number(l.al) >= 0; }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    POZ.forEach(function (s) { var r = (t.t31 || {})["s" + s] || {};
      [["U1", "A0"], ["U2", "A1"]].forEach(function (x) { var v = U.num(r[x[0]]); if (isFinite(v) && !inLog(function (l) { return l.m === "u" && Number(l.s) === s && l.n === x[1] && eq(l.U, v, 0.0011); })) out.faraCitire++; }); });
    ["d1", "d2", "d3"].forEach(function (k) { var r = (t.t32 || {})[k] || {}, v = U.num(r.tc); if (isFinite(v) && !inLog(function (l) { return l.m === "def" && l.k === k && eq(l.tc, v, 0.6); })) out.faraCitire++; });
    Object.keys(CONFIG).forEach(function (k) { var r = (t.t33 || {})[k] || {}, v = U.num(r.inv); if (isFinite(v) && !inLog(function (l) { return l.m === "cmp" && l.k === k && eq(l.inv, v, 0.5); })) out.faraCitire++; });
    var a = asteptate(pr), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.03], q2: [0.02, 0.0002], q3: [0.3, 0.12], q4: [0, 0.03] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 100000) / 100000, corect: ok };
    });
    var t30 = t.t30 || {}, bune = 0; for (var p = 1; p <= 6; p++) if (((t30["p" + p] || {}).fn || "") === ADEVAR[p]) bune++;
    var okP = bune === 6; if (okP) out.corecte++;
    out.detalii.pini = { raspuns: bune + "/6 pini", asteptat: "6/6", corect: okP };
    out.principal = { eticheta: "pini identificați", valoare: bune + "/6" };
    return out;
  }
  return { POZ: POZ, TETA_MAX: TETA_MAX, FUNCTII: FUNCTII, ADEVAR: ADEVAR, CORECT: CORECT, RPD: RPD, RS3: RS3, S_DEF: S_DEF, CONFIG: CONFIG,
    parametri: parametri, x1: x1, y2: y2, circuit: circuit, cablaj: cablaj, ohm: ohm, adc: adc, uProg: uProg, citiri: citiri, invalid: invalid, motiv: motiv,
    regresie: regresie, asteptate: asteptate, tConf: tConf, verifica: verifica };
})();
