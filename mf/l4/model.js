/* MF – Lucrarea 4. Ecuația lui Bernoulli și măsurarea debitului: tubul Venturi și tubul Pitot.
   Modelul bancului hidraulic (pompă – robinet de reglare – tub Venturi cu 6 prize piezometrice – tub Pitot în secțiunea
   de intrare cu micromanometru înclinat 1:5 – vas volumetric gradat), folosit identic în aplicație și pe serverul Apps Script.
   Unități: diametre și cote în mm, debit în L/s, viteze în m/s. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l4"] = (function () {
  var D1 = 25;                          // diametrul de intrare/ieșire al tubului Venturi [mm]
  var GATURI = [9, 10, 11, 12];         // diametrul gâtului d2 [mm] – varianta individuală
  var G = 9.81;
  var SIN_M = 0.2;                      // micromanometrul înclinat al tubului Pitot: sin α = 1/5
  var RANDURI = ["Q1", "Q2", "Q3"];
  var H_BAZA = 240;                     // cota piezometrică la ieșire, debit nul [mm]
  var K_IES = 10;                       // rezistența aval (robinet de ieșire + conductă) în sarcini cinetice de intrare
  function aria(d) { return Math.PI * d * d / 4; }               // mm²
  /** densitatea apei [kg/m³] (formula Tanaka, 0…40 °C) */
  function rhoApa(T) { return 1000 * (1 - (T + 288.9414) / (508929.2 * (T + 68.12963)) * Math.pow(T - 3.9863, 2)); }
  /** vâscozitatea cinematică a apei [m²/s] (Vogel) */
  function niuApa(T) { return 2.414e-5 * Math.pow(10, 247.8 / (T + 273.15 - 140)) / rhoApa(T); }
  /** geometria tubului: confuzor 21°, gât 8 mm, difuzor 7°; pozițiile și diametrele celor 6 prize */
  function geom(d2) {
    var tc = Math.tan(10.5 * Math.PI / 180), td = Math.tan(3.5 * Math.PI / 180);
    var Lc = (D1 - d2) / 2 / tc, Lg = 8, Ld = (D1 - d2) / 2 / td, x0 = 30;
    var prize = [
      { x: 12, d: D1 },
      { x: x0 + 0.7 * Lc, d: D1 - 0.7 * (D1 - d2) },
      { x: x0 + Lc + Lg / 2, d: d2 },
      { x: x0 + Lc + Lg + 0.25 * Ld, d: d2 + 0.25 * (D1 - d2) },
      { x: x0 + Lc + Lg + 0.6 * Ld, d: d2 + 0.6 * (D1 - d2) },
      { x: x0 + Lc + Lg + Ld + 22, d: D1 }
    ];
    return { Lc: Lc, Lg: Lg, Ld: Ld, x0: x0, L: x0 + Lc + Lg + Ld + 40, prize: prize };
  }
  /** diametrul interior la abscisa x [mm] */
  function diametru(x, d2) {
    var g = geom(d2);
    if (x <= g.x0) return D1;
    if (x <= g.x0 + g.Lc) return D1 - (D1 - d2) * (x - g.x0) / g.Lc;
    if (x <= g.x0 + g.Lc + g.Lg) return d2;
    if (x <= g.x0 + g.Lc + g.Lg + g.Ld) return d2 + (D1 - d2) * (x - g.x0 - g.Lc - g.Lg) / g.Ld;
    return D1;
  }
  function parametri(seed) {
    var r = mulberry32(seed), eh = [];
    var p = {
      d2: GATURI[Math.floor(r() * 4) % 4],
      Cd: 0.955 + r() * 0.03,             // coeficientul de debit (pierderea în confuzor)
      kd: 0.12 + r() * 0.10,              // coeficientul de pierdere al difuzorului (Borda–Carnot)
      kQ: 0.92 + r() * 0.12,              // caracteristica pompei și a instalației
      T: Math.round((16 + r() * 8) * 2) / 2,   // temperatura apei [°C]
      Cp: 0.985 + r() * 0.025             // coeficientul tubului Pitot
    };
    for (var i = 0; i < 6; i++) eh.push(Math.round((r() * 2 - 1) * 10) / 10);   // erorile de zero ale piezometrelor [mm]
    p.eh = eh;
    return p;
  }
  function beta4(d2) { return Math.pow(d2 / D1, 4); }
  /** debitul maxim (robinet complet deschis) [L/s] */
  function Qmax(pr) { var b4 = beta4(pr.d2); return pr.kQ * aria(pr.d2) * 1e-6 * Math.sqrt(2 * G * 0.30 * pr.Cd * pr.Cd / (1 - b4)) * 1000; }
  /** caracteristica robinetului de reglare: deschiderea a [%] → fracțiunea din debitul maxim */
  function phi(a) { a = Math.max(0, Math.min(100, a)); return (1 - Math.exp(-3.2 * a / 100)) / (1 - Math.exp(-3.2)); }
  function debit(a, pr) { return Qmax(pr) * phi(a); }
  /** raportul v_axă / v_medie: laminar 2; turbulent profil putere 1/n cu n = f(Re); tranziție interpolată */
  function raportProfil(Re) {
    if (!(Re > 0)) return 2;
    var n = 2.1 * Math.log(Math.max(Re, 4000)) / Math.LN10 - 1.9, kt = (n + 1) * (2 * n + 1) / (2 * n * n);
    if (Re < 2300) return 2;
    if (Re < 4000) { var w = (Re - 2300) / 1700; return 2 * (1 - w) + kt * w; }
    return kt;
  }
  /** valorile adevărate pentru deschiderea a [%] */
  function stare(a, pr) {
    var Q = debit(a, pr), g = geom(pr.d2), b4 = beta4(pr.d2);
    var v = g.prize.map(function (p) { return Q * 1e-3 / (aria(p.d) * 1e-6); });
    var q = v.map(function (x) { return x * x / (2 * G) * 1000; });            // sarcinile cinetice [mm]
    var zc = (1 - b4) * (1 / (pr.Cd * pr.Cd) - 1);                              // pierderea confuzorului, în q3
    var hd = pr.kd * Math.pow(v[2] - v[5], 2) / (2 * G) * 1000;                 // pierderea difuzorului [mm]
    var Lp = [0, 0.4 * zc * q[2], zc * q[2], zc * q[2] + 0.3 * hd, zc * q[2] + 0.75 * hd, zc * q[2] + hd];
    var h6 = H_BAZA + K_IES * q[0], E1 = h6 + q[5] + Lp[5];
    var E = Lp.map(function (l) { return E1 - l; }), h = E.map(function (e, i) { return e - q[i]; });
    var nu = niuApa(pr.T), Re1 = v[0] * D1 * 1e-3 / nu, Re3 = v[2] * pr.d2 * 1e-3 / nu;
    var kp = raportProfil(Re1), dhP = pr.Cp * Math.pow(kp * v[0], 2) / (2 * G) * 1000;
    return { Q: Q, v: v, q: q, h: h, E: E, dh13: h[0] - h[2], Re1: Re1, Re3: Re3, kp: kp, dhP: dhP, lP: dhP / SIN_M };
  }
  /** citirile instrumentelor (cu erorile de zero proprii); fluctuațiile turbulente se adaugă în aplicație */
  function citiri(a, pr) {
    var s = stare(a, pr);
    return { h: s.h.map(function (x, i) { return x + pr.eh[i] + (i === 2 && pr.aer3 ? pr.aer3 : 0); }), l: s.lP, Q: s.Q };
  }
  /** deschiderea robinetului pentru o diferență de nivel Δh1-3 dată (pentru exemplu și scenarii) */
  function aPentruDh(dh, pr) {
    var lo = 0, hi = 100;
    for (var k = 0; k < 50; k++) { var m = (lo + hi) / 2; if (stare(m, pr).dh13 < dh) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  /** prelucrarea tabelelor studentului (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); };
    var d2 = n(date.d2), T = n(date.T), A1 = aria(D1), A2 = aria(d2), b4 = Math.pow(d2 / D1, 4);
    var nu = isFinite(T) ? niuApa(T) : 1.0e-6, g = geom(isFinite(d2) ? d2 : 10);
    var o = { A1: A1, A2: A2, b4: b4, nu: nu, rho: isFinite(T) ? rhoApa(T) : 998, geom: g, r: {}, CdMed: NaN, CdReg: NaN };
    var sC = 0, nC = 0, xs = [], ys = [];
    RANDURI.forEach(function (k) {
      var r1 = (t.t41 || {})[k] || {}, r2 = (t.t42 || {})[k] || {}, r3 = (t.t43 || {})[k] || {};
      var h = [1, 2, 3, 4, 5, 6].map(function (i) { return n(r1["h" + i]); });
      var R = { h: h, ok: h.every(function (x) { return isFinite(x); }) };
      var Qs = [];
      [1, 2].forEach(function (j) { var V = n(r2["V" + j]), ts = n(r2["t" + j]); if (V > 0 && ts > 0) Qs.push(V / ts); });
      R.Qm = Qs.length ? Qs.reduce(function (a, b) { return a + b; }, 0) / Qs.length : NaN;
      R.dh13 = h[0] - h[2];
      R.Qt = R.dh13 > 0 ? A2 * 1e-6 * Math.sqrt(2 * G * R.dh13 / 1000 / (1 - b4)) * 1000 : NaN;
      R.Cd = R.Qm / R.Qt;
      if (isFinite(R.Cd)) { sC += R.Cd; nC++; xs.push(Math.sqrt(R.dh13)); ys.push(R.Qm); }
      R.v = g.prize.map(function (p) { return R.Qm * 1e-3 / (aria(p.d) * 1e-6); });
      R.vReal = [R.Qm * 1e-3 / (A1 * 1e-6), R.Qm * 1e-3 / (A2 * 1e-6)];
      R.q = R.v.map(function (v) { return v * v / (2 * G) * 1000; });
      R.E = h.map(function (x, i) { return x + R.q[i]; });
      R.pierd = h[0] - h[5]; R.pierdRel = R.pierd / R.dh13;
      R.l = n(r3.l); R.dhP = R.l * SIN_M;
      R.vP = R.dhP >= 0 ? Math.sqrt(2 * G * R.dhP / 1000) : NaN;
      R.v1 = R.vReal[0]; R.raport = R.vP / R.v1;
      R.Re1 = R.v1 * D1 * 1e-3 / nu; R.Re3 = R.vReal[1] * d2 * 1e-3 / nu;
      o.r[k] = R;
    });
    o.CdMed = nC ? sC / nC : NaN;
    if (xs.length >= 2) { var sxy = 0, sxx = 0; for (var i = 0; i < xs.length; i++) { sxy += xs[i] * ys[i]; sxx += xs[i] * xs[i]; }
      o.CdReg = (sxy / sxx) / (A2 * 1e-6 * Math.sqrt(2 * G / 1000 / (1 - b4)) * 1000); }
    var r1 = o.r.Q1 || {};
    o.v2Q1 = r1.vReal ? r1.vReal[1] : NaN;
    o.vPQ1 = r1.vP;
    o.Q100 = o.CdMed * A2 * 1e-6 * Math.sqrt(2 * G * 0.1 / (1 - b4)) * 1000;
    return o;
  }
  function asteptate(o) { return { q1: o.CdMed, q2: o.v2Q1, q3: o.vPQ1, q4: o.Q100 }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, date = d.date || {};
    var piezo = log.filter(function (l) { return l.tip === "piezo"; }), vol = log.filter(function (l) { return l.tip === "vol"; }), pit = log.filter(function (l) { return l.tip === "pitot"; });
    piezo.forEach(function (l) {
      var c = citiri(Number(l.a), pr), ok = (l.h || []).length === 6;
      (l.h || []).forEach(function (x, i) { if (Math.abs(Number(x) - c.h[i]) > Math.max(2, 0.015 * Math.abs(c.h[i]))) ok = false; });
      if (!ok) out.incompatibile++;
    });
    vol.forEach(function (l) { var Q = debit(Number(l.a), pr); if (Math.abs(Number(l.V) - Q * Number(l.t)) > 0.06 + 0.012 * Number(l.V)) out.incompatibile++; });
    pit.forEach(function (l) { var c = citiri(Number(l.a), pr); if (Math.abs(Number(l.l) - c.l) > Math.max(1, 0.04 * c.l)) out.incompatibile++; });
    if (Number(date.d2) !== pr.d2 || Math.abs(Number(date.T) - pr.T) > 0.51) { out.motive.push("diametrul gâtului sau temperatura apei diferă de varianta individuală"); out.incompatibile++; }
    RANDURI.forEach(function (k) {
      var r1 = (t.t41 || {})[k] || {}, r2 = (t.t42 || {})[k] || {}, r3 = (t.t43 || {})[k] || {};
      var h = [1, 2, 3, 4, 5, 6].map(function (i) { return U.num(r1["h" + i]); }), aRand = null;
      if (h.some(function (x) { return isFinite(x); })) {
        var p = piezo.filter(function (l) { return (l.h || []).length === 6 && l.h.every(function (x, i) { return Math.abs(Number(x) - h[i]) < 0.51; }); });
        if (!p.length) out.faraCitire++; else aRand = Number(p[p.length - 1].a);
      }
      [1, 2].forEach(function (j) {
        var V = U.num(r2["V" + j]), ts = U.num(r2["t" + j]);
        if (!isFinite(V) && !isFinite(ts)) return;
        var m = vol.filter(function (l) { return Math.abs(Number(l.V) - V) < 0.026 && Math.abs(Number(l.t) - ts) < 0.006; });
        if (!m.length) out.faraCitire++;
        else if (aRand !== null && !m.some(function (l) { return Math.abs(Number(l.a) - aRand) < 0.05; })) { out.incompatibile++; out.motive.push("debit volumetric și cote piezometrice de la debite diferite (" + k + ")"); }
      });
      var lv = U.num(r3.l);
      if (isFinite(lv)) {
        var mp = pit.filter(function (l) { return Math.abs(Number(l.l) - lv) < 0.26; });
        if (!mp.length) out.faraCitire++;
        else if (aRand !== null && !mp.some(function (l) { return Math.abs(Number(l.a) - aRand) < 0.05; })) out.incompatibile++;
      }
    });
    var o = prelucreaza(t, date, U), a = asteptate(o), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "Cd mediu", valoare: isFinite(o.CdMed) ? Math.round(o.CdMed * 1000) / 1000 : "" };
    var tol = { q1: 0.01, q2: 0.02, q3: 0.03, q4: 0.02 };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k] + 0.005;
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 10000) / 10000 : "—", corect: ok };
    });
    return out;
  }
  return { D1: D1, GATURI: GATURI, G: G, SIN_M: SIN_M, RANDURI: RANDURI,
    aria: aria, rhoApa: rhoApa, niuApa: niuApa, geom: geom, diametru: diametru, parametri: parametri, beta4: beta4, Qmax: Qmax, phi: phi, debit: debit,
    raportProfil: raportProfil, stare: stare, citiri: citiri, aPentruDh: aPentruDh, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
