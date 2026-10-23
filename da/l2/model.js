/* DA – Lucrarea 2. Senzori și actuatori – date live și semnale reale (standul K7J 1.4 MPI).
   Modelul senzorilor, actuatorilor și defectelor; folosit identic în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l2"] = (function () {
  var RP = 2200, UREF = 5;                                  // rezistența de polarizare din ECU, tensiunea de referință
  var NOM = { R25: 2500, B: 3450 };                         // datele de catalog ale termistoarelor (îndrumar)
  var DEFECTE = {
    ect_open: { nume: "Circuitul senzorului de temperatură a lichidului întrerupt (conector / fir)", cod: "P0118" },
    iat_short: { nume: "Senzorul de temperatură a aerului în scurtcircuit la masă", cod: "P0112" },
    inj3_open: { nume: "Bobina injectorului cilindrului 3 întreruptă", cod: "P0203 P0303" },
    lambda_aged: { nume: "Sonda λ amonte îmbătrânită (comutare lentă)", cod: "P0133" },
    ckp_gap: { nume: "Senzorul de turație cu întrefier prea mare (semnal slab)", cod: "P0335" },
    aer_fals: { nume: "Aer fals în colectorul de admisie (furtun fisurat)", cod: "P0171" }
  };
  var CHEI_DEF = ["ect_open", "iat_short", "inj3_open", "lambda_aged", "ckp_gap", "aer_fals"];
  var TIPURI = ["continuu 0…5 V", "alternativ (inductiv)", "dreptunghiular / frecvență", "comutare la prag", "comandă PWM"];
  var TIP_CORECT = { ckp: 1, ect: 0, iat: 0, map: 0, tps: 0, l1: 3, l2: 3 };
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      R25: u(2350, 2650), B: u(3390, 3510), R25i: u(2350, 2650), Bi: u(3390, 3510),
      a: u(20.8, 22.6), b: u(8, 12), patm: u(99.6, 102.0), Ta: Math.round(u(18, 24) * 10) / 10,
      Rckp: Math.round(u(700, 1000)), Rinj: [0, 1, 2, 3].map(function () { return Math.round(u(13.6, 15.6) * 10) / 10; }),
      Rclap: Math.round(u(1.4, 1.9) * 100) / 100, Rcan: Math.round(u(22, 30) * 10) / 10,
      fl: u(0.9, 1.4), ltft0: u(0, 8), kckp: u(3.2, 3.8),
      defect: CHEI_DEF[Math.floor(r() * CHEI_DEF.length) % CHEI_DEF.length]
    };
  }
  function ntcR(R25, B, T) { return R25 * Math.exp(B * (1 / (T + 273.15) - 1 / 298.15)); }
  function ntcU(R) { return UREF * R / (R + RP); }
  function tempDinU(U, R25, B) { if (!(U > 0 && U < UREF)) return NaN; var R = RP * U / (UREF - U); return 1 / (Math.log(R / R25) / B + 1 / 298.15) - 273.15; }
  function mapU(p, pr) { return (p - pr.b) / pr.a; }
  /** valoarea „adevărată” la bornele senzorului (contextul l: T, p, rpm, defect) */
  function tensiune(c, l, pr) {
    var d = pr.defect;
    if (c === "ect") return d === "ect_open" ? 4.98 : ntcU(ntcR(pr.R25, pr.B, l.T));
    if (c === "iat") return d === "iat_short" ? 0.02 : ntcU(ntcR(pr.R25i, pr.Bi, l.T));
    if (c === "map") return mapU(l.p, pr);
    return NaN;
  }
  function rezistenta(c, l, pr) {
    var d = pr.defect;
    if (c === "ckp") return pr.Rckp;
    if (c === "ect") return ntcR(pr.R25, pr.B, l.T);                      // senzorul e bun; defectul ect_open e în cablaj
    if (c === "iat") return d === "iat_short" ? 0.4 : ntcR(pr.R25i, pr.Bi, l.T);
    if (/^inj[1-4]$/.test(c)) { var i = Number(c.charAt(3)) - 1; return d === "inj3_open" && i === 2 ? Infinity : pr.Rinj[i]; }
    if (c === "clap") return pr.Rclap;
    if (c === "can") return pr.Rcan;
    return NaN;
  }
  function frecventaLambda(pr, aerFals) { return (pr.defect === "lambda_aged" ? 0.33 : pr.fl) * (aerFals ? 0.9 : 1); }
  function regresie2(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var a = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: a, b: (sy - a * sx) / n }; }
  /** prelucrarea tabelelor studentului (aceeași în aplicație și pe server) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, o = {};
    var ue = n(((t.t21 || {}).ect || {}).mas);
    o.Tect = tempDinU(ue, NOM.R25, NOM.B);
    var xs = [], ys = [];
    Object.keys(t.t22 || {}).forEach(function (k) { var p = n(t.t22[k].p), u = n(t.t22[k].U); if (isFinite(p) && isFinite(u)) { xs.push(u); ys.push(p); } });
    o.map = xs.length >= 2 ? regresie2(xs, ys) : null;
    ["n", "a"].forEach(function (k) {
      var r = (t.t23 || {})[k] || {}, Nc = n(r.Nc), s = n(r.STFT), l = n(r.LTFT);
      o["f_" + k] = isFinite(Nc) ? Nc / (2 * 10) : NaN;
      o["k_" + k] = isFinite(s) && isFinite(l) ? (1 + s / 100) * (1 + l / 100) : NaN;
    });
    var fck = n(((t.t21 || {}).ckp || {}).mas);
    o.nckp = isFinite(fck) ? 60 * fck / 60 : NaN;
    return o;
  }
  function asteptate(o) { return { q1: o.Tect, q2: o.map ? o.map.a : NaN, q3: o.f_n, q4: o.k_a }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    log.forEach(function (l) {
      var v = Number(l.v), ok = true;
      if (l.m === "volt") { var e = tensiune(l.c, l, pr); if (isFinite(e)) ok = Math.abs(v - e) <= Math.max(0.03, 0.015 * e); }
      else if (l.m === "ohm") { var R = rezistenta(l.c, l, pr); ok = R === Infinity ? !isFinite(v) || v > 1e6 : Math.abs(v - R) <= Math.max(0.2, 0.02 * R); }
      else if (l.m === "freq") ok = Math.abs(v - Number(l.rpm)) <= 0.03 * Number(l.rpm) + 5;
      else if (l.m === "map") ok = Math.abs(Number(l.U) - mapU(Number(l.p), pr)) <= 0.03;
      if (!ok) out.incompatibile++;
    });
    var inLog = function (m, c, v, camp) { return log.some(function (l) { return l.m === m && (!c || l.c === c) && Math.abs(Number(camp ? l[camp] : l.v) - v) < 0.0051 * Math.max(1, Math.abs(v)); }); };
    var t21 = t.t21 || {};
    Object.keys(t21).forEach(function (c) {
      var mas = U.num(t21[c].mas), R = U.num(t21[c].R);
      if (isFinite(mas) && !(c === "ckp" ? inLog("freq", null, mas) : inLog("volt", c, mas))) out.faraCitire++;
      if (isFinite(R) && !inLog("ohm", c, R)) out.faraCitire++;
    });
    Object.keys(t.t22 || {}).forEach(function (k) { var p = U.num(t.t22[k].p), u = U.num(t.t22[k].U); if (isFinite(p) && !inLog("map", null, p, "p")) out.faraCitire++; if (isFinite(u) && !inLog("map", null, u, "U")) out.faraCitire++; });
    Object.keys(t.t24 || {}).forEach(function (c) { var R = U.num(t.t24[c].R); if (isFinite(R) && !inLog("ohm", c, R)) out.faraCitire++; });
    // numărul de comutări citit de pe osciloscop (introdus manual)
    ["n", "a"].forEach(function (k) {
      var Nc = U.num(((t.t23 || {})[k] || {}).Nc);
      if (isFinite(Nc)) { var e = frecventaLambda(pr, k === "a") * 20; if (Math.abs(Nc - e) > Math.max(3, 0.2 * e)) { out.incompatibile++; out.motive.push("numărul de comutări ale sondei λ (" + (k === "n" ? "normal" : "aer fals") + ") nu corespunde semnalului"); } }
    });
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "defect identificat", valoare: ((t.t25 || {}).d || {}).cauza === DEFECTE[pr.defect].nume ? "DA" : "NU" };
    var tol = { q1: 1.0, q2: 0.02, q3: 0.02, q4: 0.01 };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && (k === "q1" ? Math.abs(r - a[k]) <= tol.q1 : Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k] + 0.005);
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    var okDef = out.principal.valoare === "DA"; if (okDef) out.corecte++;
    out.detalii.defect = { raspuns: ((t.t25 || {}).d || {}).cauza || "", asteptat: DEFECTE[pr.defect].nume, corect: okDef };
    return out;
  }
  return { RP: RP, UREF: UREF, NOM: NOM, DEFECTE: DEFECTE, CHEI_DEF: CHEI_DEF, TIPURI: TIPURI, TIP_CORECT: TIP_CORECT,
    parametri: parametri, ntcR: ntcR, ntcU: ntcU, tempDinU: tempDinU, mapU: mapU, tensiune: tensiune, rezistenta: rezistenta,
    frecventaLambda: frecventaLambda, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
