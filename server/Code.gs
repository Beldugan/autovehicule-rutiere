/* GENERAT AUTOMAT – nu editați aici: modificați comun/config.js, modelele lucrărilor sau server/nucleu.gs și rulați tools/build_server.py */

/* Configurarea portalului: disciplinele, lucrările și adresele registrelor de prezență (câte o foaie Google pe disciplină) */
"use strict";

const PORTAL = {
  program: "Autovehicule Rutiere",
  facultate: "FIMIM",
  univ: "Universitatea „Ovidius” din Constanța",
  cadru: "Asist. univ. drd. ing. Adrian-Mircea Beldugan",
  an: "2026-2027",
  domeniuEmail: "",                       // ex. "365.univ-ovidius.ro" – gol: orice cont Google
  referat: { minConcluzii: 250, minDurataMin: 8 },

  discipline: {
    MF: {
      nume: "Mecanica fluidelor", an: "anul II", sem: 1, cod: "MR2104", tip: "Laborator", dosar: "mf",
      indrumar: "Îndrumar de laborator – Mecanica fluidelor (I. Omer, A.-M. Beldugan, 2026)",
      pdf: "mf/indrumar-mecanica-fluidelor.pdf",
      endpoint: "https://script.google.com/macros/s/AKfycbwOr2gf7rGCzz3zEO1B-CgpRfqALPQptHUGhMu1Tsf86cdCo7prsaIFFJx5NfeLduQoDA/exec",
      lucrari: [
        "Vâscozitatea uleiurilor de motor în funcție de temperatură",
        "Compresibilitatea lichidului de frână și efectul aerului din circuit",
        "Legea lui Pascal: transmiterea hidraulică a forței în sistemul de frânare",
        "Ecuația lui Bernoulli și măsurarea debitului: tubul Venturi și tubul Pitot",
        "Regimuri de curgere. Experiența lui Reynolds",
        "Pierderi de sarcină longitudinale și locale într-un circuit de răcire",
        "Definitivarea și susținerea referatelor"
      ]
    },
    DA: {
      nume: "Diagnosticarea autovehiculelor", an: "anul IV", sem: 1, cod: "MR4103", tip: "Laborator", dosar: "da",
      indrumar: "Îndrumar de laborator – Diagnosticarea autovehiculelor (T. Dordea; revizuire A.-M. Beldugan, 2026)",
      pdf: "da/indrumar-diagnosticarea-autovehiculelor.pdf",
      endpoint: "https://script.google.com/macros/s/AKfycbz801hXDRXLdwi1OTapwGxsVn06JXIGCrxcCLV73199XyTrdIiHjAgG-tj6forWJPJmQA/exec",
      lucrari: [
        "Diagnoza computerizată și rețeaua de date CAN",
        "Senzori și actuatori – date live și semnale reale",
        "Starea mecanică a motorului",
        "Sistemul de alimentare MAS și analiza gazelor de evacuare",
        "Motorul diesel common rail și sistemele de post-tratare (EGR, DPF, SCR)",
        "Sistemul de frânare cu ABS/ESC și sistemele ADAS",
        "Vehicule electrice și hibride; diagnoza pe bază de date"
      ]
    },
    SAA: {
      nume: "Sisteme auxiliare ale autovehiculelor", an: "anul IV", sem: 1, cod: "MR4104", tip: "Laborator", dosar: "saa",
      indrumar: "Îndrumar de laborator – Sisteme auxiliare ale autovehiculelor (A.-M. Beldugan, 2026)",
      endpoint: "",
      lucrari: [
        "Sistemul de injecție de benzină multipunct – caracteristicile de funcționare (motorul 1.4 MPI)",
        "Modelarea duratei de injecție pe baza debitului de aer – aplicație virtuală",
        "Sistemul de injecție common-rail – presiunea în rampă și injecția multiplă (motorul 1.5 dCi)",
        "Sistemul de ungere – caracteristica presiunii uleiului",
        "Sistemul de răcire și managementul termic",
        "Sistemul de supraalimentare – presiunea de supraalimentare și actuatorii turbosuflantei",
        "Sistemul de pornire și bilanțul energetic stop-start și mild-hybrid 48 V",
        "Sistemul de climatizare și pompa de căldură"
      ]
    },
    MAM1: {
      nume: "Mecatronica automobilului modern I", an: "anul IV", sem: 1, cod: "MR4105", tip: "Laborator", dosar: "mam1",
      indrumar: "Îndrumar de laborator – Mecatronica automobilului modern I (2026)",
      endpoint: "",
      lucrari: [
        "Microcontrolere: intrări/ieșiri, convertor A/D, timere, întreruperi și PWM",
        "Condiționarea semnalelor și conversia analog-digitală",
        "Senzorul pedalei de accelerație cu două piste: plauzibilitate și reacția la defect",
        "Senzori de temperatură: liniarizare și constanta de timp",
        "Senzorul de presiune absolută din colector (MAP): calibrare și densitatea aerului",
        "Senzori de turație și poziție: decodarea roții 60−2 prin captură de intrare",
        "Senzori ultrasonici de parcare: timpul de propagare și compensarea cu temperatura",
        "Senzori inerțiali (IMU): ruliu și tangaj, filtrul complementar",
        "Clapeta electronică de accelerație: punte H, PWM și regulator PID",
        "Magistrala CAN: construirea mesajelor, arbitrajul și decodarea semnalelor"
      ]
    },
    PCMAI: {
      nume: "Procese și caracteristici ale motoarelor cu ardere internă", scurt: "PCMAI", an: "anul III", sem: 1, cod: "MM3104", tip: "Proiect", dosar: "pcmai",
      indrumar: "Îndrumare de proiect PCMAI (C. Tudor, A.-M. Beldugan, 2026)",
      endpoint: "",
      lucrari: []
    }
  },
  /** lucrările deja realizate în portal: cod → cale */
  realizate: { "mf-l1": "mf/l1/", "mf-l2": "mf/l2/", "mf-l3": "mf/l3/", "da-l2": "da/l2/" }
};

/* Utilitare comune – portalul de laborator Autovehicule Rutiere (FIMIM, UOC) */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** număr formatat românește (virgulă zecimală) */
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace(".", ",") : "—");
/** notație științifică a·10ⁿ în HTML */
const fmtE = (x, d = 2) => {
  if (!Number.isFinite(x) || x === 0) return fmt(x, d);
  const e = Math.floor(Math.log10(Math.abs(x)));
  return `${fmt(x / Math.pow(10, e), d)}·10<sup>${e}</sup>`;
};
const num = v => { const x = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(x) ? x : NaN; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const FR = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;
const EC = (expr, nr) => `<div class="ec"><span>${expr}</span>${nr ? `<span class="nr">(${nr})</span>` : ""}</div>`;

/** generator pseudoaleator determinist – identic cu cel din serverul Apps Script */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/** regresie liniară y = a + b·x */
function regresie(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i]; }
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-30) return null;
  const b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n;
  const r2den = (n * sxx - sx * sx) * (n * syy - sy * sy);
  return { a, b, r2: r2den > 0 ? Math.pow(n * sxy - sx * sy, 2) / r2den : 1 };
}
/** salvare/încărcare sigură în localStorage */
const Stocare = {
  citeste(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  scrie(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  sterge(k) { try { localStorage.removeItem(k); } catch (e) { } }
};


/* ---- da/l2/model.js ---- */
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


/* ---- mf/l1/model.js ---- */
/* MF – Lucrarea 1. Vâscozitatea uleiurilor de motor (vâscozimetrul cu bilă Höppler, dreapta Walther, SAE J300).
   Modelul este folosit identic în aplicație și pe serverul Apps Script.
   Unități: ν în mm²/s, η în mPa·s, ρ în g/cm³, timpi în s, temperaturi în °C. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l1"] = (function () {
  var ALFA = 0.00065, L_REPERE = 100; // distanța dintre repere [mm]
  var ULEI = {
    "0W-20": { nume: "Ulei de motor 0W-20 (sintetic)", n40: 44.5, n100: 8.6, r15: 0.846, culoare: "#e0b04a" },
    "5W-30": { nume: "Ulei de motor 5W-30 (sintetic)", n40: 65.3, n100: 11.0, r15: 0.855, culoare: "#cf9631" },
    "10W-40": { nume: "Ulei de motor 10W-40 (semisintetic)", n40: 98.0, n100: 14.6, r15: 0.868, culoare: "#b97a1e" },
    "UZAT": { nume: "Ulei 5W-30 uzat (15 000 km, diluat cu motorină)", n40: 54.0, n100: 9.4, r15: 0.862, culoare: "#3a2a17" }
  };
  var OPTIUNI_A = ["0W-20", "5W-30", "10W-40"];
  var BILE = {
    B1: { nume: "Bila 1 – sticlă", rb: 2.225, K: 0.0090, d: 15.81 },
    B2: { nume: "Bila 2 – sticlă", rb: 2.225, K: 0.075, d: 15.60 },
    B3: { nume: "Bila 3 – oțel Ni-Fe", rb: 8.10, K: 0.090, d: 15.60 },
    B4: { nume: "Bila 4 – oțel", rb: 8.10, K: 0.70, d: 15.20 },
    B5: { nume: "Bila 5 – oțel", rb: 8.10, K: 7.0, d: 14.00 }
  };
  var TEMP = [40, 60, 80];
  var SAE = [[8, 4.0, 6.1], [12, 5.0, 7.1], [16, 6.1, 8.2], [20, 6.9, 9.3], [30, 9.3, 12.5], [40, 12.5, 16.3], [50, 16.3, 21.9], [60, 21.9, 26.1]];
  function lg(x) { return Math.log(x) / Math.LN10; }
  function Y(n) { return lg(lg(n + 0.7)); }
  /** coeficienții Walther lg lg(ν+0,7) = A − B·lg T din două puncte (t în °C) */
  function walther(t1, n1, t2, n2) {
    var x1 = lg(t1 + 273.15), x2 = lg(t2 + 273.15), B = (Y(n1) - Y(n2)) / (x2 - x1);
    return { A: Y(n1) + B * x1, B: B };
  }
  function nuWalther(w, t) { return Math.pow(10, Math.pow(10, w.A - w.B * lg(t + 273.15))) - 0.7; }
  function wCatalog(cheie) { var u = ULEI[cheie]; return walther(40, u.n40, 100, u.n100); }
  function densitate(r15, t) { return r15 * (1 - ALFA * (t - 15)); }
  function clasaSAE(n100) { var c = null; for (var i = 0; i < SAE.length; i++) if (n100 >= SAE[i][1]) c = SAE[i][0]; return n100 < SAE[SAE.length - 1][2] ? c : null; }
  /** parametrii individuali secreți (seed de la server) */
  function parametri(seed) {
    var r = mulberry32(seed);
    var oA = OPTIUNI_A[Math.floor(r() * 3) % 3];
    return {
      uleiA: oA,
      fA: 1 + (r() * 2 - 1) * 0.04, fU: 1 + (r() * 2 - 1) * 0.06,          // abaterea lotului (vâscozitate)
      rA: ULEI[oA].r15 * (1 + (r() * 2 - 1) * 0.004), rU: ULEI.UZAT.r15 * (1 + (r() * 2 - 1) * 0.004),
      dT: (r() * 2 - 1) * 0.3,                                             // eroarea termometrului [°C] (T reală = T afișată + dT)
      tc: Math.round((20.5 + r() * 2.5) * 10) / 10                         // temperatura camerei la areometru
    };
  }
  /** proprietățile adevărate ale probei o ("A"/"U") la temperatura reală t */
  function proba(o, t, pr) {
    var cheie = o === "U" ? "UZAT" : pr.uleiA, f = o === "U" ? pr.fU : pr.fA, r15 = o === "U" ? pr.rU : pr.rA;
    var nu = nuWalther(wCatalog(cheie), t) * f, rho = densitate(r15, t);
    return { nu: nu, rho: rho, eta: nu * rho };
  }
  /** timpul adevărat de cădere între repere (T afișată de termometru) */
  function timpCadere(o, Tafis, bila, pr) {
    var b = BILE[bila], p = proba(o, Tafis + pr.dT, pr);
    return p.eta / (b.K * (b.rb - p.rho));
  }
  /** prelucrarea tabelelor studentului (aceeași în aplicație și pe server) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); };
    var out = { r15: {}, rand: {}, w: {}, n100: {}, n0: {}, sae: {} };
    ["A", "U"].forEach(function (o) {
      var d = (t.t11 || {})[o] || {}, tc = n(d.tc), rc = n(d.rc);
      out.r15[o] = isFinite(tc) && isFinite(rc) ? rc / (1 - ALFA * (tc - 15)) : NaN;
      var pts = [];
      TEMP.forEach(function (T) {
        var r = ((t.t12 || {})[o + T]) || {}, b = BILE[r.b], ts = [n(r.t1), n(r.t2), n(r.t3)].filter(function (x) { return isFinite(x) && x > 0; });
        var R = { nt: ts.length };
        if (ts.length) {
          R.tm = ts.reduce(function (a, b) { return a + b; }, 0) / ts.length;
          R.disp = ts.length > 1 ? (Math.max.apply(null, ts) - Math.min.apply(null, ts)) / R.tm : 0;
          var r15 = isFinite(out.r15[o]) ? out.r15[o] : ULEI[o === "U" ? "UZAT" : "5W-30"].r15;
          R.rho = densitate(r15, T);
          if (b) { R.eta = b.K * (b.rb - R.rho) * R.tm; R.nu = R.eta / R.rho; pts.push([T, R.nu]); }
        }
        out.rand[o + T] = R;
      });
      var r40 = out.rand[o + "40"], r80 = out.rand[o + "80"];
      if (r40 && r80 && r40.nu > 0 && r80.nu > 0) {
        var w = walther(40, r40.nu, 80, r80.nu); out.w[o] = w;
        out.n100[o] = nuWalther(w, 100); out.n0[o] = nuWalther(w, 0); out.sae[o] = clasaSAE(out.n100[o]);
      }
    });
    return out;
  }
  function asteptate(pr2) {
    var a = pr2.n100.A, b = pr2.n0.A;
    return { q1: a, q2: pr2.sae.A == null ? NaN : pr2.sae.A, q3: isFinite(a) && isFinite(b) ? b / a : NaN, q4: pr2.w.U ? pr2.w.U.B : NaN };
  }
  /** verificarea pe server a unui referat trimis */
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var cad = log.filter(function (l) { return l.cad; }), dens = log.filter(function (l) { return l.dens; });
    cad.forEach(function (l) {
      var tm = timpCadere(l.o, Number(l.T), l.b, pr), tl = Number(l.t);
      if (!(isFinite(tm) && Math.abs(tl - tm) <= Math.max(0.6, 0.05 * tm))) out.incompatibile++;
    });
    var densGresite = 0;
    ["A", "U"].forEach(function (o) {
      var r = (t.t11 || {})[o] || {}, tc = U.num(r.tc), rc = U.num(r.rc);
      if (isFinite(tc) && Math.abs(tc - pr.tc) > 0.05) out.incompatibile++;
      if (isFinite(rc)) { var adev = densitate(o === "U" ? pr.rU : pr.rA, pr.tc); if (Math.abs(rc - adev) > 0.0025) densGresite++; }
      if (isFinite(tc) && !dens.some(function (l) { return l.o === o; })) out.faraCitire++;
    });
    if (densGresite) out.motive.push("densitate citită greșit la areometru (" + densGresite + ")");
    out.incompatibile += densGresite;
    Object.keys(t.t12 || {}).forEach(function (k) {
      var r = t.t12[k], o = k.charAt(0), T = Number(k.slice(1));
      ["t1", "t2", "t3"].forEach(function (c) {
        var v = U.num(r[c]); if (!isFinite(v)) return;
        var ok = cad.some(function (l) { return l.o === o && l.b === r.b && Math.abs(Number(l.Tset) - T) < 0.5 && Math.abs(Number(l.t) - v) < 0.006; });
        if (!ok) out.faraCitire++;
      });
    });
    var p2 = prelucreaza(t, U), a = asteptate(p2), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "ν100 ulei A [mm²/s]", valoare: isFinite(p2.n100.A) ? Math.round(p2.n100.A * 100) / 100 : "" };
    var tol = { q1: 0.02, q2: 0, q3: 0.04, q4: 0.015 };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && (k === "q2" ? Math.round(r) === a[k] : Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k] + 1e-9);
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    return out;
  }
  return { ALFA: ALFA, L_REPERE: L_REPERE, ULEI: ULEI, OPTIUNI_A: OPTIUNI_A, BILE: BILE, TEMP: TEMP, SAE: SAE, Y: Y, walther: walther, nuWalther: nuWalther,
    wCatalog: wCatalog, densitate: densitate, clasaSAE: clasaSAE, parametri: parametri, proba: proba, timpCadere: timpCadere,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();


/* ---- mf/l2/model.js ---- */
/* MF – Lucrarea 2. Modelul fizic al piezometrului (folosit identic în aplicație și pe serverul Apps Script).
   Unități: volume în cm³, presiuni în bar (suprapresiune), module în GPa. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l2"] = (function () {
  var P_ATM = 1.0;
  var ST = { V0: 50, d: 10, s: 1, D: 20, e: 5, E: 210, rho: 1050 };
  var FLUIDE = {
    DOT3: { nume: "Lichid de frână DOT 3", K: 1.72, rho: 1040, culoare: "#d9b44a" },
    DOT4: { nume: "Lichid de frână DOT 4", K: 1.68, rho: 1050, culoare: "#d4a93c" },
    DOT51: { nume: "Lichid de frână DOT 5.1", K: 1.78, rho: 1060, culoare: "#d8b65a" },
    DOT5: { nume: "Lichid de frână DOT 5 (siliconic)", K: 1.10, rho: 960, culoare: "#b58ac9" },
    APA: { nume: "Apă (20 °C)", K: 2.20, rho: 998, culoare: "#7fb6e0" },
    ULEI: { nume: "Ulei mineral hidraulic", K: 1.60, rho: 870, culoare: "#c98f2a" },
    MOTORINA: { nume: "Motorină", K: 1.50, rho: 830, culoare: "#e3cf6a" },
    PROBA: { nume: "Probă necunoscută (de determinat)", K: null, rho: 1050, culoare: "#c9a24e" }
  };
  function volRot(d, s) { return Math.PI * d * d / 4 * s / 1000; }
  function corectieCil(D, e, E) { return D / (E * 1e9 * e); }
  function KmDinK(K, D, e, E) { return 1 / (1 / (K * 1e9) + corectieCil(D, e, E)) / 1e9; }
  function KDinKm(Km, D, e, E) { var inv = 1 / (Km * 1e9) - corectieCil(D, e, E); return inv > 0 ? 1 / inv / 1e9 : NaN; }
  function volAer(Va0, p) { return Va0 * (1 - P_ATM / (P_ATM + Math.max(0, p))); }
  function volumAbsorbit(c, p) { var Cm = 1 / (c.K * 1e9) + corectieCil(c.D, c.e, c.E); return c.V0 * p * 1e5 * Cm + volAer(c.Vaer, p) + (c.Cf || 0) * p; }
  function presiuneDinVolum(c, dV) {
    if (dV <= 0) return 0;
    var a = 0, b = 50;
    while (volumAbsorbit(c, b) < dV && b < 1e6) b *= 2;
    for (var i = 0; i < 80; i++) { var m = (a + b) / 2; if (volumAbsorbit(c, m) < dV) a = m; else b = m; }
    return (a + b) / 2;
  }
  function celeritate(K, rho) { return Math.sqrt(K * 1e9 / rho); }
  function comprimareRelativa(K0, Kp, p_bar) { var p = p_bar * 1e5, k = K0 * 1e9; return Kp <= 0 ? 1 - Math.exp(-p / k) : 1 - Math.pow(1 + Kp * p / k, -1 / Kp); }
  /** citirea manometrului (eroarea de clasă proprie fiecărui student) */
  function citire(p, pr) { return p <= 0.05 ? 0 : p * (1 + pr.errGain) + pr.errOff * Math.min(1, p / 5); }
  /** parametrii individuali secreți (din seed-ul primit de la server) */
  function parametri(seed) {
    var r = mulberry32(seed);
    return { errOff: (r() * 2 - 1) * 0.8, errGain: (r() * 2 - 1) * 0.006, Klot: 1.68 * (1 + (r() * 2 - 1) * 0.04) };
  }
  /** răspunsurile așteptate la întrebările individuale */
  function asteptate(t, Va0, KmR, KR) {
    var ar = volRot(ST.d, ST.s), n = function (v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : NaN; };
    var n100a = n(t.t22 && t.t22["100"] && t.t22["100"].inc), n100b = n(t.t23 && t.t23["100"] && t.t23["100"].n), n20b = n(t.t23 && t.t23["20"] && t.t23["20"].n);
    return {
      q1: isFinite(n20b) && isFinite(KmR) ? n20b * ar - ST.V0 * 20 * 1e5 / (KmR * 1e9) : NaN,
      q2: n100b - n100a,
      q3: isFinite(KR) ? celeritate(KR, 1050) : NaN,
      q4: Va0 * (1 - 1 / 41) * 1000 / (Math.PI * 22.22 * 22.22 / 4) * 4
    };
  }
  /** verificarea pe server a unui referat trimis */
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var ar = volRot(ST.d, ST.s), log = (d.log || []).filter(function (l) { return l.dir === "inc" || l.dir === "desc"; });
    log.forEach(function (l) {
      var Vaer = (Number(l.Vinj) || 0) + (l.aerisit ? 0 : 0.25);
      var p = presiuneDinVolum({ V0: ST.V0, K: pr.Klot, D: ST.D, e: ST.e, E: ST.E, Vaer: Vaer }, Number(l.n) * ar);
      if (Math.abs(citire(p, pr) - Number(l.p)) > 1.0) out.incompatibile++;
    });
    var t = d.tabele || {}, xs = [0], ys = [0];
    var inLog = function (n, v, dir) { return log.some(function (l) { return l.var === v && (!dir || l.dir === dir) && Math.abs(Number(l.n) - n) < 0.006; }); };
    Object.keys(t.t22 || {}).forEach(function (p) {
      ["inc", "desc"].forEach(function (k) { var n = U.num(t.t22[p][k]); if (!isFinite(n)) return; if (!inLog(n, "a", k)) out.faraCitire++; if (k === "inc") { xs.push(n * ar); ys.push(Number(p)); } });
    });
    Object.keys(t.t23 || {}).forEach(function (p) { var n = U.num(t.t23[p].n); if (isFinite(n) && !inLog(n, "b", "inc")) out.faraCitire++; });
    var KmR = NaN, KR = NaN;
    if (xs.length >= 3) { var rg = U.regresie(xs, ys); KmR = ST.V0 * rg.b * 1e5 / 1e9; KR = KDinKm(KmR, ST.D, ST.e, ST.E); }
    out.principal = { eticheta: "K [GPa]", valoare: isFinite(KR) ? Math.round(KR * 1000) / 1000 : "" };
    var a = asteptate(t, U.num(d.varianta && d.varianta.Va0) || 0, KmR, KR), tol = { q1: 0.06, q2: 0.03, q3: 0.015, q4: 0.03 }, rasp = d.raspunsuri || {};
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.max(Math.abs(a[k]) * tol[k], k === "q2" ? 0.03 : 0.002);
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    return out;
  }
  return { P_ATM: P_ATM, ST: ST, FLUIDE: FLUIDE, volRot: volRot, corectieCil: corectieCil, KmDinK: KmDinK, KDinKm: KDinKm, volAer: volAer,
    volumAbsorbit: volumAbsorbit, presiuneDinVolum: presiuneDinVolum, celeritate: celeritate, comprimareRelativa: comprimareRelativa,
    citire: citire, parametri: parametri, asteptate: asteptate, verifica: verifica };
})();


/* ---- mf/l3/model.js ---- */
/* MF – Lucrarea 3. Legea lui Pascal: transmiterea hidraulică a forței în sistemul de frânare.
   Modelul standului (pedală – servofrână cu vacuum – pompă centrală tandem – etrier cu celulă de forță),
   folosit identic în aplicație și pe serverul Apps Script. Unități: N, bar, mm. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l3"] = (function () {
  var L = 280;                          // brațul lung al pedalei [mm]
  var BRATE = [62, 70, 80];             // brațul scurt l [mm] → i_p = 4,52 / 4,00 / 3,50
  var ETRIERE = [48, 51, 54, 57, 60];   // diametrul pistonului etrierului [mm]
  var DM = 22.22;                       // pompa centrală [mm]
  var D_MEMBR = 250;                    // diametrul membranei servofrânei [mm]
  var F_ARC = 40;                       // arcul de revenire al pompei centrale [N]
  var TREPTE1 = [50, 100, 150, 200, 250, 300], TREPTE2 = [25, 50, 100, 150, 200, 250, 300];
  function aria(d) { return Math.PI * d * d / 4; }               // mm²
  function parametri(seed) {
    var r = mulberry32(seed);
    return {
      l: BRATE[Math.floor(r() * 3) % 3],
      dc: ETRIERE[Math.floor(r() * 5) % 5],
      etaP: 0.88 + r() * 0.07,          // randamentul pedalei (articulații)
      etaC: 0.93 + r() * 0.05,          // randamentul etrierului (garnitura pistonului)
      kS: 4.5 + r() * 1.0,              // raportul de amplificare al servofrânei (discul de reacție)
      etaM: 0.80 + r() * 0.15,          // eficiența membranei (stabilește punctul de saturație)
      dp2: 0.008 + r() * 0.012,         // circuitul secundar: pierdere relativă de presiune (arcul pistonului flotant)
      eP: (r() * 2 - 1) * 0.4,          // eroarea de zero a manometrelor [bar]
      eF: (r() * 2 - 1) * 15            // eroarea de zero a celulei de forță [N]
    };
  }
  function ip(pr) { return L / pr.l; }
  /** forța pe tija pompei centrale (cu servofrâna și saturația ei) */
  function fortaTija(Fp, vac, pr) {
    var Fin = Fp * ip(pr) * pr.etaP;
    var asist = 0;
    if (vac > 0.02) { var Amax = vac * 1e5 * aria(D_MEMBR) * 1e-6 * pr.etaM; asist = Math.min((pr.kS - 1) * Fin, Amax); }
    return Fin + asist;
  }
  /** valorile adevărate la forța pe pedală Fp [N] și vacuumul vac [bar] */
  function stare(Fp, vac, pr) {
    var Ft = fortaTija(Fp, vac, pr);
    var p1 = Math.max(0, (Ft - F_ARC) / aria(DM) * 10);            // N/mm² = 10 bar
    var p2 = p1 * (1 - pr.dp2);
    var Fc = p1 / 10 * aria(pr.dc) * pr.etaC;
    return { Ft: Ft, p1: p1, p2: p2, Fc: Fc };
  }
  /** citirile instrumentelor (cu erorile proprii) */
  function citiri(Fp, vac, pr) {
    var s = stare(Fp, vac, pr);
    return { p1: s.p1 > 0.05 ? s.p1 + pr.eP : 0, p2: s.p2 > 0.05 ? s.p2 + pr.eP : 0, Fc: s.Fc > 1 ? s.Fc + pr.eF : 0 };
  }
  /** volumul absorbit de stand [mm³] și cursa pedalei [mm] */
  function cursaPedala(p1, pr) {
    var V = 0.25 * aria(pr.dc) * (1 - Math.exp(-p1 / 1.5)) + 9 * p1 + 2.5 * p1;   // joc plăcuțe + elasticitatea conductelor + compresibilitate
    return (V / aria(DM) + 1.5) * ip(pr);                                    // + cursa moartă a pompei (1,5 mm)
  }
  /** prelucrarea tabelelor studentului (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); };
    var l = n(date.l), dc = n(date.dc), i = L / l, Am = aria(DM), Ac = aria(dc);
    var o = { ip: i, Am: Am, Ac: Ac, r1: {}, r2: {}, etaP: NaN, etaC: NaN };
    var sP = 0, nP = 0, sC = 0, nC = 0;
    TREPTE1.forEach(function (F) {
      var r = (t.t31 || {})[F] || {}, p = n(r.p), Fc = n(r.Fc), R = { pc: F * i / Am * 10 };
      if (isFinite(p) && p > 0) { R.etaP = p * Am / 10 / (F * i); R.Fcc = p / 10 * Ac; if (F >= 100) { sP += R.etaP; nP++; } }
      if (isFinite(Fc) && isFinite(p) && p > 0) { R.etaC = Fc / (p / 10 * Ac); sC += R.etaC; nC++; }
      o.r1[F] = R;
    });
    o.etaP = nP ? sP / nP : NaN; o.etaC = nC ? sC / nC : NaN;
    TREPTE2.forEach(function (F) {
      var r = (t.t32 || {})[F] || {}, p = n(r.p), R = {};
      R.pf = isFinite(o.etaP) ? Math.max(0, (F * i * o.etaP - F_ARC) / Am * 10) : NaN;
      var r1 = (t.t31 || {})[F]; if (r1 && n(r1.p) > 0) R.pf = n(r1.p);           // dacă treapta există și fără servo, se folosește măsurarea
      if (isFinite(p) && R.pf > 0) R.k = p / R.pf;
      o.r2[F] = R;
    });
    var fc200 = n(((t.t31 || {})[200] || {}).Fc);
    o.Fr200 = isFinite(fc200) ? 2 * 0.40 * fc200 * 0.11 / 0.30 : NaN;
    o.k100 = (o.r2[100] || {}).k;
    o.sm03 = 0.3 * Ac / Am;
    return o;
  }
  function asteptate(o) { return { q1: o.etaP, q2: o.k100, q3: o.Fr200, q4: o.sm03 }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = (d.log || []).filter(function (l) { return l.Fp != null; }), t = d.tabele || {};
    log.forEach(function (l) {
      var c = citiri(Number(l.Fp), Number(l.vac) || 0, pr);
      var okP = Math.abs(c.p1 - Number(l.p1)) <= Math.max(0.6, 0.02 * c.p1), okF = Math.abs(c.Fc - Number(l.Fc)) <= Math.max(40, 0.02 * c.Fc);
      if (!(okP && okF)) out.incompatibile++;
    });
    var date = d.date || {};
    if (Number(date.l) !== pr.l || Number(date.dc) !== pr.dc) { out.motive.push("dimensiunile standului diferă de varianta individuală"); out.incompatibile++; }
    var inLog = function (F, srv, col, v) { return log.some(function (l) { return Math.abs(Number(l.Fp) - F) <= 3 && (!!l.servo) === srv && Math.abs(Number(col === "p" ? l.p1 : col === "p2" ? l.p2 : l.Fc) - v) < 0.051; }); };
    var s300 = U.num(((t.t33 || {}).s || {}).s);
    if (isFinite(s300)) {
      var cl = (d.log || []).filter(function (l) { return l.cursa != null; });
      if (!cl.some(function (l) { return Math.abs(Number(l.cursa) - s300) < 0.051; })) out.faraCitire++;
      if (Math.abs(s300 - cursaPedala(stare(300, 0, pr).p1, pr)) > 3) out.incompatibile++;
    }
    [["t31", false], ["t32", true]].forEach(function (x) {
      Object.keys(t[x[0]] || {}).forEach(function (F) {
        ["p", "p2", "Fc"].forEach(function (c) { var v = U.num(t[x[0]][F][c]); if (isFinite(v) && !inLog(Number(F), x[1], c, v)) out.faraCitire++; });
      });
    });
    var o = prelucreaza(t, date, U), a = asteptate(o), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "η_p mediu", valoare: isFinite(o.etaP) ? Math.round(o.etaP * 1000) / 1000 : "" };
    var tol = { q1: 0.015, q2: 0.03, q3: 0.02, q4: 0.01 };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k] + 0.005;
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    return out;
  }
  return { L: L, BRATE: BRATE, ETRIERE: ETRIERE, DM: DM, D_MEMBR: D_MEMBR, F_ARC: F_ARC, TREPTE1: TREPTE1, TREPTE2: TREPTE2,
    aria: aria, parametri: parametri, ip: ip, fortaTija: fortaTija, stare: stare, citiri: citiri, cursaPedala: cursaPedala,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();

/**
 * Registrul de prezență și referate – portalul de laborator Autovehicule Rutiere (FIMIM, UOC).
 * Același script se folosește pentru fiecare disciplină, într-o foaie de calcul separată (legată de clasa din Classroom).
 * Disciplina foii se alege la „Configurare inițială” și se păstrează în Proprietățile scriptului (DISCIPLINA).
 *
 *  - meniul „Laborator”: codul de sesiune pentru proiector, importul studenților din Classroom, configurarea;
 *  - doGet  ?action=start  : verifică codul sesiunii, marchează PREZENȚA și întoarce jetonul + seed-ul parametrilor individuali;
 *  - doPost action=trimite : verifică jetonul, verifică datele cu modelul lucrării (MODELE[cod].verifica),
 *                             creează documentul Google cu referatul, completează foaia lucrării și prezența („P+R”).
 * Fișierul Code.gs se generează din: comun/config.js + modelele lucrărilor + acest nucleu (tools/build_server.py).
 */

const TZ = "Europe/Bucharest";
const ORE_SLOT = 2;
const U = {
  num: function (v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : NaN; },
  regresie: regresie
};

/* ============================== meniu */
function onOpen() {
  const d = disc_();
  SpreadsheetApp.getUi().createMenu("Laborator" + (d ? " " + d : ""))
    .addItem("Afișează codul de sesiune (proiector)", "arataCod")
    .addItem("Importă studenții din Google Classroom", "importaStudenti")
    .addSeparator()
    .addItem("Configurare inițială / schimbarea disciplinei", "configurare")
    .addToUi();
}
function props_() { return PropertiesService.getScriptProperties(); }
function disc_() { return props_().getProperty("DISCIPLINA") || ""; }
function infoDisc_() { return PORTAL.discipline[disc_()] || null; }
function nrLab_() { const d = infoDisc_(); return d ? (d.lucrari.length || d.sedinte || 14) : 7; }
function titluLab_(n) { const d = infoDisc_(); return d && d.lucrari[n - 1] ? d.lucrari[n - 1] : ("Ședința " + n); }
function secret_() { let s = props_().getProperty("SECRET"); if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty("SECRET", s); } return s; }
function hmacBytes_(msg) { return Utilities.computeHmacSha256Signature(msg, secret_()); }
function hmac_(msg) { return Utilities.base64EncodeWebSafe(hmacBytes_(msg)).replace(/=+$/, ""); }
function anunta_(mesaj) { Logger.log(mesaj); try { SpreadsheetApp.getUi().alert(mesaj); } catch (e) { } }

function configurare() {
  secret_();
  let d = disc_();
  try {
    const ui = SpreadsheetApp.getUi();
    const lista = Object.keys(PORTAL.discipline).map(k => k + " – " + PORTAL.discipline[k].nume).join("\n");
    const r = ui.prompt("Disciplina acestei foi", lista + "\n\nCodul disciplinei (de ex. MF):" + (d ? " (actual: " + d + ")" : ""), ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() === ui.Button.OK && r.getResponseText().trim()) d = r.getResponseText().trim().toUpperCase();
  } catch (e) { }
  if (!PORTAL.discipline[d]) d = d || "MF";
  props_().setProperty("DISCIPLINA", d);
  foaiePrezenta_(true);
  for (let l = 1; l <= nrLab_(); l++) foaieLab_(l, true);
  if (!props_().getProperty("FOLDER_ID")) {
    const f = DriveApp.createFolder("Referate " + PORTAL.discipline[d].nume + " – " + SpreadsheetApp.getActive().getName());
    props_().setProperty("FOLDER_ID", f.getId());
  }
  anunta_("Configurare încheiată pentru " + PORTAL.discipline[d].nume + ".\n\nPublicați scriptul: Implementare → Gestionați implementările → versiune nouă (sau Implementare nouă → Aplicație web: Execută ca Eu, Acces Oricine) și puneți adresa /exec în comun/config.js, la disciplina " + d + ".\n\nDosarul referatelor: " + DriveApp.getFolderById(props_().getProperty("FOLDER_ID")).getUrl());
}

/* ============================== codul de sesiune */
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function codSesiune_(lab, data) {
  const zi = Utilities.formatDate(data, TZ, "yyyy-MM-dd");
  const slot = Math.floor(Number(Utilities.formatDate(data, TZ, "H")) / ORE_SLOT);
  const b = hmacBytes_("cod|" + disc_() + "|" + lab + "|" + zi + "|" + slot);
  let c = ""; for (let i = 0; i < 6; i++) c += ALFABET[(b[i] + 256) % 32];
  return c;
}
function codValid_(lab, cod) {
  cod = String(cod || "").toUpperCase().trim();
  const acum = new Date();
  return [0, -ORE_SLOT * 60].some(min => codSesiune_(lab, new Date(acum.getTime() + min * 60000)) === cod);
}
function arataCod() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Codul sesiunii – " + (infoDisc_() || {}).nume, "Numărul lucrării / ședinței (1–" + nrLab_() + "):", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const lab = parseInt(r.getResponseText(), 10);
  if (!(lab >= 1 && lab <= nrLab_())) { ui.alert("Număr invalid."); return; }
  const acum = new Date(), cod = codSesiune_(lab, acum);
  const ora = Number(Utilities.formatDate(acum, TZ, "H")), h1 = Math.floor(ora / ORE_SLOT) * ORE_SLOT;
  const html = HtmlService.createHtmlOutput(
    `<div style="font-family:system-ui,sans-serif;text-align:center">
       <div style="font-size:18px;color:#555">${(infoDisc_() || {}).nume} – Lucrarea ${lab}<br>${titluLab_(lab)}</div>
       <div style="font-size:96px;font-weight:800;letter-spacing:.12em;margin:18px 0;color:#1f5f9e">${cod}</div>
       <div style="font-size:16px;color:#555">valabil ${h1}:00–${h1 + ORE_SLOT}:00 (și încă ${ORE_SLOT} ore pentru întârziați)</div>
     </div>`).setWidth(680).setHeight(330);
  ui.showModalDialog(html, "Cod de sesiune – afișați-l pe proiector");
}

/* ============================== foi */
function col_(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function foaiePrezenta_(refaAntet) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("Prezență");
  const n = nrLab_();
  const cap = ["Nume și prenume", "E-mail", "Grupa"]; for (let l = 1; l <= n; l++) cap.push("L" + l); cap.push("Prezențe", "Referate");
  if (!sh) { sh = ss.insertSheet("Prezență", 0); refaAntet = true; }
  if (refaAntet) {
    sh.getRange(1, 1, 1, cap.length).setValues([cap]).setFontWeight("bold").setBackground("#e8f0f9");
    sh.setFrozenRows(1); sh.setFrozenColumns(1); sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 230);
    for (let l = 1; l <= n; l++) sh.setColumnWidth(3 + l, 64);
  }
  return sh;
}
function randStudent_(email, nume, grupa) {
  const sh = foaiePrezenta_(false), n = nrLab_();
  const last = sh.getLastRow();
  const emails = last > 1 ? sh.getRange(2, 2, last - 1, 1).getValues().map(r => String(r[0]).toLowerCase().trim()) : [];
  const i = emails.indexOf(email);
  if (i >= 0) { const row = i + 2; if (grupa && !sh.getRange(row, 3).getValue()) sh.getRange(row, 3).setValue(grupa); return { sh, row }; }
  let row = emails.indexOf("") >= 0 ? emails.indexOf("") + 2 : last + 1;
  sh.getRange(row, 1, 1, 3).setValues([[nume, email, grupa]]);
  sh.getRange(row, 4 + n).setFormula(`=COUNTIF(D${row}:${col_(3 + n)}${row},"P*")`);
  sh.getRange(row, 5 + n).setFormula(`=COUNTIF(D${row}:${col_(3 + n)}${row},"*R*")`);
  return { sh, row };
}
const CAP_LAB = ["Trimis la", "Nume", "E-mail", "Grupa", "Început", "Durata determinărilor [min]", "Citiri", "Varianta individuală",
  "Rezultat (student)", "Rezultat (recalculat)", "Citiri incompatibile cu simulatorul", "Valori din tabel fără citire", "Răspunsuri corecte",
  "Lungime concluzii", "Integritate (aplicație)", "Motive / note", "Verdict server", "Document", "Versiune"];
function foaieLab_(lab, refaAntet) {
  const ss = SpreadsheetApp.getActive(), nume = "L" + lab + " – referate";
  let sh = ss.getSheetByName(nume);
  if (!sh) { sh = ss.insertSheet(nume); refaAntet = true; }
  if (refaAntet) { sh.getRange(1, 1, 1, CAP_LAB.length).setValues([CAP_LAB]).setFontWeight("bold").setBackground("#e8f0f9").setWrap(true); sh.setFrozenRows(1); }
  return sh;
}

/* ============================== import din Classroom */
function importaStudenti() {
  const ui = SpreadsheetApp.getUi();
  let cursuri = [];
  try { cursuri = (Classroom.Courses.list({ teacherId: "me", courseStates: ["ACTIVE", "PROVISIONED"], pageSize: 100 }).courses || []); }
  catch (e) { cursuri = []; }
  const lista = cursuri.map((c, i) => `${i + 1}. ${c.name}${c.section ? " – " + c.section : ""}${c.courseState === "PROVISIONED" ? " (invitație neacceptată)" : ""}`).join("\n");
  const r = ui.prompt("Alegeți cursul",
    (lista ? lista + "\n\n" : "Contul acestui script nu are cursuri Classroom ca profesor.\n\n") +
    "0. Cursul nu este în listă (este pe alt cont Google): import din foaia „Import studenți”, în care lipiți lista exportată din Classroom (Nume, E-mail, Grupa).\n\nNumărul cursului:", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const k = parseInt(r.getResponseText(), 10);
  if (k === 0 || !cursuri.length) return importDinFoaie_();
  const c = cursuri[k - 1]; if (!c) return;
  props_().setProperty("COURSE_ID", c.id);
  let tok = null, n = 0;
  do {
    const res = Classroom.Courses.Students.list(c.id, { pageToken: tok, pageSize: 100 });
    (res.students || []).forEach(s => { randStudent_(String(s.profile.emailAddress || "").toLowerCase(), s.profile.name.fullName, c.section || ""); n++; });
    tok = res.nextPageToken;
  } while (tok);
  sorteazaPrezenta_();
  ui.alert(`Importați/actualizați: ${n} studenți din „${c.name}”.`);
}
function sorteazaPrezenta_() { const sh = foaiePrezenta_(false); if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, 5 + nrLab_()).sort(1); }
/** import din foaia „Import studenți” (coloanele: Nume și prenume | E-mail | Grupa) */
function importDinFoaie_() {
  const ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("Import studenți");
  if (!sh || sh.getLastRow() < 2) {
    if (!sh) { sh = ss.insertSheet("Import studenți"); sh.getRange(1, 1, 1, 3).setValues([["Nume și prenume", "E-mail", "Grupa"]]).setFontWeight("bold").setBackground("#e8f0f9"); sh.setFrozenRows(1); sh.setColumnWidth(1, 240); sh.setColumnWidth(2, 260); }
    ss.setActiveSheet(sh);
    ui.alert("Am pregătit foaia „Import studenți”.\n\nLipiți de la rândul 2 lista studenților (Nume și prenume, E-mail, Grupa) – de exemplu din Classroom: cursul → Persoane, sau din lista primită de la secretariat – apoi rulați din nou Laborator → Importă studenții și alegeți 0.");
    return;
  }
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  let n = 0, fara = 0;
  v.forEach(([nume, email, grupa]) => {
    email = String(email || "").toLowerCase().trim(); nume = String(nume || "").trim();
    if (!nume) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { fara++; return; }
    randStudent_(email, nume, String(grupa || "").trim()); n++;
  });
  sorteazaPrezenta_();
  ui.alert(`Importați/actualizați: ${n} studenți din foaia „Import studenți”.` + (fara ? `\n${fara} rânduri fără e-mail valid au fost sărite.` : ""));
}

/* ============================== API */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function seed_(email, lab, start) { const b = hmacBytes_("seed|" + email + "|" + disc_() + "|" + lab + "|" + start); return ((b[0] & 255) << 24 | (b[1] & 255) << 16 | (b[2] & 255) << 8 | (b[3] & 255)) >>> 0; }

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action === "ping") return json_({ ok: true, disc: disc_() });
    if (p.action !== "start") return json_({ ok: false, eroare: "Acțiune necunoscută." });
    if (p.disc && p.disc !== disc_()) return json_({ ok: false, eroare: "Registrul acesta este pentru altă disciplină." });
    const lab = parseInt(p.lab, 10), email = String(p.email || "").toLowerCase().trim(), nume = String(p.nume || "").trim().slice(0, 80), grupa = String(p.grupa || "").trim().slice(0, 40);
    if (!(lab >= 1 && lab <= nrLab_())) return json_({ ok: false, eroare: "Lucrare invalidă." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, eroare: "E-mail invalid." });
    if (PORTAL.domeniuEmail && !email.endsWith("@" + PORTAL.domeniuEmail)) return json_({ ok: false, eroare: "Folosiți adresa instituțională @" + PORTAL.domeniuEmail + "." });
    if (!codValid_(lab, p.cod)) return json_({ ok: false, eroare: "Codul sesiunii nu este corect sau a expirat. Cereți-l cadrului didactic." });
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const { sh, row } = randStudent_(email, nume, grupa);
      const cel = sh.getRange(row, 3 + lab), acum = new Date();
      if (!String(cel.getValue()).startsWith("P")) cel.setValue("P");
      cel.setNote((cel.getNote() ? cel.getNote() + "\n" : "") + "prezent: " + Utilities.formatDate(acum, TZ, "dd.MM.yyyy HH:mm"));
      cel.setBackground("#e5f4ea");
      const start = acum.toISOString();
      return json_({ ok: true, start, token: hmac_("tok|" + email + "|" + disc_() + "|" + lab + "|" + start), seed: seed_(email, lab, start) });
    } finally { lock.releaseLock(); }
  } catch (err) { return json_({ ok: false, eroare: String(err.message || err) }); }
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.action !== "trimite") return json_({ ok: false, eroare: "Acțiune necunoscută." });
    const lab = parseInt(d.lab, 10), st = d.student || {}, email = String(st.email || "").toLowerCase().trim();
    if (d.disc && d.disc !== disc_()) return json_({ ok: false, eroare: "Registrul acesta este pentru altă disciplină." });
    if (hmac_("tok|" + email + "|" + disc_() + "|" + lab + "|" + d.start) !== d.token) return json_({ ok: false, eroare: "Sesiune invalidă: reîncepeți laboratorul cu codul din sală." });
    if ((Date.now() - Date.parse(d.start)) / 864e5 > 21) return json_({ ok: false, eroare: "Termenul de predare a expirat." });
    const ver = verifica_(lab, d, email);
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    let url;
    try {
      const doc = creeazaDoc_(lab, d);
      url = doc.getUrl();
      const sh = foaieLab_(lab, false);
      const versiune = sh.getLastRow() > 1 ? sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues().filter(r => String(r[0]).toLowerCase() === email).length + 1 : 1;
      const integ = d.integritate || {};
      sh.appendRow([new Date(), st.nume, email, st.grupa, new Date(d.start), ver.durata, (d.log || []).length, d.variantaText || "",
        d.principal ? (d.principal.eticheta + " = " + d.principal.valoare) : "", ver.principal ? (ver.principal.eticheta + " = " + ver.principal.valoare) : "",
        ver.incompatibile, ver.faraCitire, ver.total ? ver.corecte + "/" + ver.total : "—",
        String(d.concluzii || "").length, integ.status || "?", [].concat(ver.motive || [], integ.note || []).join("; "), ver.verdict, url, versiune]);
      sh.getRange(sh.getLastRow(), CAP_LAB.indexOf("Verdict server") + 1).setBackground(ver.verdict === "OK" ? "#e5f4ea" : "#fdf0e1");
      const { sh: sp, row } = randStudent_(email, st.nume, st.grupa);
      const cel = sp.getRange(row, 3 + lab);
      cel.setRichTextValue(SpreadsheetApp.newRichTextValue().setText("P+R").setLinkUrl(url).build());
      cel.setNote((cel.getNote() ? cel.getNote() + "\n" : "") + "referat v" + versiune + ": " + Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm") + " · " + ver.verdict);
      cel.setBackground(ver.verdict === "OK" ? "#cfe9d8" : "#fde2c4");
    } finally { lock.releaseLock(); }
    return json_({ ok: true, docUrl: url });
  } catch (err) { return json_({ ok: false, eroare: String(err.message || err) }); }
}

/* ============================== verificarea cu modelul lucrării */
function verifica_(lab, d, email) {
  const out = { incompatibile: "", faraCitire: "", corecte: 0, total: 0, motive: [], durata: "", verdict: "OK", principal: null };
  const log = (d.log || []).filter(l => l.ms != null);
  if (log.length) out.durata = Math.round(Number(log[log.length - 1].ms) / 6000) / 10;
  if (out.durata !== "" && out.durata < PORTAL.referat.minDurataMin) out.motive.push("determinări în mai puțin de " + PORTAL.referat.minDurataMin + " min");
  const M = MODELE[d.cod];
  if (M && M.verifica) {
    try {
      const v = M.verifica(d, M.parametri(seed_(email, lab, d.start)), U);
      Object.assign(out, { incompatibile: v.incompatibile, faraCitire: v.faraCitire, corecte: v.corecte, total: v.total, principal: v.principal });
      if (v.incompatibile) out.motive.push(v.incompatibile + " citiri incompatibile cu simulatorul");
      if (v.faraCitire) out.motive.push(v.faraCitire + " valori din tabele fără citire în jurnal");
      (v.motive || []).forEach(m => out.motive.push(m));
      if (d.principal && v.principal && isFinite(Number(d.principal.valoare)) && isFinite(Number(v.principal.valoare)) && Math.abs(d.principal.valoare - v.principal.valoare) > Math.abs(v.principal.valoare) * 0.01 + 1e-9) out.motive.push("rezultatul raportat diferă de cel recalculat");
    } catch (e) { out.motive.push("verificarea modelului a eșuat: " + e.message); }
  } else out.motive.push("lucrare fără model de verificare pe server");
  const integ = d.integritate || {};
  if (integ.status && integ.status !== "OK") out.motive.push("aplicația a semnalat: " + (integ.motive || []).join(", "));
  out.verdict = out.motive.length ? "DE VERIFICAT" : "OK";
  return out;
}

/* ============================== documentul Google cu referatul */
function dosarLab_(lab) {
  let id = props_().getProperty("FOLDER_ID");
  if (!id) { id = DriveApp.createFolder("Referate " + ((infoDisc_() || {}).nume || "")).getId(); props_().setProperty("FOLDER_ID", id); }
  const root = DriveApp.getFolderById(id), nume = "L" + lab + " – " + titluLab_(lab);
  const it = root.getFoldersByName(nume);
  return it.hasNext() ? it.next() : root.createFolder(nume);
}
function creeazaDoc_(lab, d) {
  const st = d.student || {}, inf = infoDisc_() || { nume: "", an: "" };
  const doc = DocumentApp.create(`L${lab} – ${st.nume} – ${st.grupa} – referat`);
  const b = doc.getBody();
  b.setMarginTop(50).setMarginBottom(50).setMarginLeft(60).setMarginRight(60);
  b.appendParagraph(PORTAL.univ + " · " + PORTAL.facultate + " · " + PORTAL.program + ", " + inf.an).editAsText().setFontSize(9).setForegroundColor("#555555");
  b.appendParagraph(inf.nume + " – laborator").editAsText().setFontSize(9).setForegroundColor("#555555");
  b.appendParagraph(`Referat – Lucrarea ${lab}. ${titluLab_(lab)}`).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  b.appendTable([["Student", st.nume || ""], ["E-mail", st.email || ""], ["Grupa", st.grupa || ""],
    ["Începutul lucrării (prezență)", Utilities.formatDate(new Date(d.start), TZ, "dd.MM.yyyy HH:mm")], ["Trimis la", Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm")]]
    .concat(d.variantaText ? [["Varianta individuală", d.variantaText]] : []));
  let k = 1;
  b.appendParagraph(`${k++}. Determinări`).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (d.tabeleText || []).forEach(t => { b.appendParagraph(t.titlu).editAsText().setBold(true); if (t.randuri.length) b.appendTable([t.antet].concat(t.randuri)); });
  if (d.grafic && String(d.grafic).indexOf("base64,") > 0) {
    try { const img = Utilities.newBlob(Utilities.base64Decode(String(d.grafic).split("base64,")[1]), "image/png", "grafic.png"); const im = b.appendImage(img); const w = 460; im.setHeight(Math.round(im.getHeight() * w / im.getWidth())).setWidth(w); } catch (e) { }
  }
  if ((d.rezultateText || []).length) { b.appendParagraph(`${k++}. Rezultate`).setHeading(DocumentApp.ParagraphHeading.HEADING2); b.appendTable(d.rezultateText); }
  if ((d.intrebari || []).length) {
    b.appendParagraph(`${k++}. Întrebări individuale`).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    d.intrebari.forEach((q, i) => b.appendParagraph(`${i + 1}. ${q.text} – răspuns: ${(d.raspunsuri || {})[q.id] || "—"} ${q.unitate || ""}`));
  }
  b.appendParagraph(`${k++}. Concluzii`).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  String(d.concluzii || "").split(/\n+/).forEach(par => b.appendParagraph(par));
  b.appendHorizontalRule();
  b.appendParagraph(`Document generat de aplicația de laborator. Cod de verificare: ${hmac_("doc|" + st.email + "|" + d.start + "|" + d.trimisLa).slice(0, 12)}`).editAsText().setFontSize(8).setForegroundColor("#777777");
  doc.saveAndClose();
  const f = DriveApp.getFileById(doc.getId());
  f.moveTo(dosarLab_(lab));
  try { f.addViewer(st.email); } catch (e) { }
  return doc;
}
