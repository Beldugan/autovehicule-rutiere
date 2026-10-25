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
      pdf: "saa/indrumar-sisteme-auxiliare.pdf",
      endpoint: "https://script.google.com/macros/s/AKfycbz1p0eyt66dMHx_AQEnzSiCB6E8qMahZ0iZoCIm10xsqhP4u44oa3Sy5hGgRzgjGB0-zg/exec",
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
      endpoint: "https://script.google.com/macros/s/AKfycbynSqzjkqNO18yZWA8mbz1yQNdjzTAJuzZX8s-MQWvZryUHd8i0F2GlToenUnf5ydc/exec",
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
  realizate: { "mf-l1": "mf/l1/", "mf-l2": "mf/l2/", "mf-l3": "mf/l3/", "mf-l4": "mf/l4/", "da-l1": "da/l1/", "da-l2": "da/l2/", "da-l3": "da/l3/", "da-l4": "da/l4/", "saa-l1": "saa/l1/", "saa-l2": "saa/l2/", "saa-l3": "saa/l3/", "saa-l4": "saa/l4/", "saa-l5": "saa/l5/", "mam1-l1": "mam1/l1/", "mam1-l2": "mam1/l2/", "mam1-l3": "mam1/l3/" }
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

/* Ecran complet pentru un element (machetă 3D + osciloscop). Unde API-ul Fullscreen lipsește (iPhone),
   elementul se întinde peste toată fereastra prin clasa .ecran-plin. */
function ecranComplet(el, btn) {
  const nativ = () => (document.fullscreenElement || document.webkitFullscreenElement) === el;
  const activ = () => nativ() || el.classList.contains("ecran-plin");
  const eticheta = () => { btn.textContent = activ() ? "✕ Ieșire din ecran complet" : "⛶ Ecran complet"; btn.setAttribute("aria-pressed", activ() ? "true" : "false"); };
  const plin = on => { el.classList.toggle("ecran-plin", on); document.documentElement.classList.toggle("fara-derulare", on); eticheta(); };
  btn.addEventListener("click", () => {
    if (activ()) { if (nativ()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else plin(false); return; }
    const f = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!f) return plin(true);
    try { const p = f.call(el); if (p && p.catch) p.catch(() => plin(true)); } catch (e) { plin(true); }
  });
  ["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, eticheta));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && el.classList.contains("ecran-plin")) plin(false); });
  eticheta();
}


/* ---- da/l1/model.js ---- */
/* DA – Lucrarea 1. Diagnoza computerizată și rețeaua de date CAN (autoturism 2025, arhitectură cu gateway central).
   Modelul rețelei, al codurilor de defect și al măsurărilor; folosit identic în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l1"] = (function () {
  var FBIT = 500000, FBIT_FD = 2000000, NBITI = 125, RX = 120;     // 500 kbit/s (arbitrare); ≈ 125 biți pe cadru standard cu 8 octeți
  /** magistralele: cheie → nume, viteză, modulul de capăt (a doua terminare; prima este în gateway / priza OBD) */
  var MAG = {
    diag: { n: "CAN diagnoză (priza OBD, pinii 6/14)", v: "500 kbit/s", capat: null, fir: "portocaliu-roșu / portocaliu-maro" },
    motor: { n: "CAN motor (grup motopropulsor)", v: "500 kbit/s", capat: "ecm", fir: "portocaliu-negru / portocaliu-maro" },
    sasiu: { n: "CAN șasiu / ADAS (CAN FD)", v: "500 kbit/s arbitrare · 2 Mbit/s date", capat: "esp", fir: "portocaliu-roșu / portocaliu-maro" },
    confort: { n: "CAN confort / caroserie", v: "500 kbit/s", capat: "bcm", fir: "portocaliu-verde / portocaliu-maro" },
    info: { n: "CAN infotainment", v: "500 kbit/s (+ Ethernet auto 100BASE-T1)", capat: "hu", fir: "portocaliu-violet / portocaliu-maro" }
  };
  var CHEI_MAG = ["motor", "sasiu", "confort", "info"];
  var P_STD = "UDS / CAN 500 kbit/s", P_FD = "UDS / CAN FD 500 k / 2 Mbit/s";
  var MODULE = [
    { k: "gw", b: "gw", nume: "Gateway central (interfață de diagnoză)", sc: "Gateway", prot: "UDS / CAN + DoIP", adr: "0x710" },
    { k: "ecm", b: "motor", nume: "ECM – gestiunea motorului", sc: "ECM motor", prot: P_STD, adr: "0x7E0" },
    { k: "tcu", b: "motor", nume: "TCU – cutie de viteze automată (DCT)", sc: "TCU cutie", prot: P_STD, adr: "0x7E1" },
    { k: "bsg", b: "motor", nume: "BSG – starter-generator 48 V (mild hybrid)", sc: "Starter-gen. 48 V", prot: P_STD, adr: "0x7E5" },
    { k: "dcdc", b: "motor", nume: "Convertor DC/DC 48 V / 12 V", sc: "DC/DC 48/12 V", prot: P_STD, adr: "0x7E6" },
    { k: "fpm", b: "motor", nume: "Modulul pompei de combustibil", sc: "Pompă combustibil", prot: P_STD, adr: "0x7E7" },
    { k: "esp", b: "sasiu", nume: "ESP – ABS / controlul stabilității", sc: "ESP / ABS", prot: P_FD, adr: "0x713" },
    { k: "eps", b: "sasiu", nume: "EPS – servodirecție electrică", sc: "EPS direcție", prot: P_FD, adr: "0x712" },
    { k: "epb", b: "sasiu", nume: "EPB – frâna de parcare electrică", sc: "EPB frână parcare", prot: P_FD, adr: "0x752" },
    { k: "srs", b: "sasiu", nume: "SRS – airbaguri și pretensionare centuri", sc: "SRS airbag", prot: P_FD, adr: "0x715" },
    { k: "scm", b: "sasiu", nume: "SCM – coloana volanului (unghi volan, comenzi)", sc: "Coloană volan", prot: P_FD, adr: "0x70C" },
    { k: "rad", b: "sasiu", nume: "Radar frontal 77 GHz (ACC, frânare automată)", sc: "Radar ACC", prot: P_FD, adr: "0x757" },
    { k: "cam", b: "sasiu", nume: "Cameră frontală (menținerea benzii, indicatoare)", sc: "Cameră frontală", prot: P_FD, adr: "0x74F" },
    { k: "bcm", b: "confort", nume: "BCM – modulul central caroserie", sc: "BCM", prot: P_STD, adr: "0x70E" },
    { k: "dfs", b: "confort", nume: "Modulul ușii față stânga", sc: "Ușă FS", prot: P_STD, adr: "0x74A" },
    { k: "dfd", b: "confort", nume: "Modulul ușii față dreapta", sc: "Ușă FD", prot: P_STD, adr: "0x74B" },
    { k: "dss", b: "confort", nume: "Modulul ușii spate stânga", sc: "Ușă SS", prot: P_STD, adr: "0x74C" },
    { k: "dsd", b: "confort", nume: "Modulul ușii spate dreapta", sc: "Ușă SD", prot: P_STD, adr: "0x74D" },
    { k: "hvac", b: "confort", nume: "Climatronic (HVAC)", sc: "Climatizare", prot: P_STD, adr: "0x746" },
    { k: "kes", b: "confort", nume: "Acces fără cheie / imobilizator", sc: "Keyless / imobilizator", prot: P_STD, adr: "0x70A" },
    { k: "sea", b: "confort", nume: "Modulul scaunelor (memorie, încălzire)", sc: "Scaune", prot: P_STD, adr: "0x76D" },
    { k: "led", b: "confort", nume: "Modulul farurilor LED matriciale", sc: "Faruri LED", prot: P_STD, adr: "0x7D6" },
    { k: "pdc", b: "confort", nume: "Asistent de parcare (senzori ultrasonici)", sc: "Asistent parcare", prot: P_STD, adr: "0x76A" },
    { k: "tlg", b: "confort", nume: "Hayon electric", sc: "Hayon electric", prot: P_STD, adr: "0x76F" },
    { k: "hu", b: "info", nume: "Unitatea centrală infotainment (navigație)", sc: "Infotainment", prot: "UDS / CAN + DoIP", adr: "0x773" },
    { k: "ki", b: "info", nume: "Bord digital (instrument cluster)", sc: "Bord digital", prot: P_STD, adr: "0x714" },
    { k: "ocu", b: "info", nume: "Telematică / eCall (modem 4G/5G)", sc: "Telematică eCall", prot: P_STD, adr: "0x75F" },
    { k: "amp", b: "info", nume: "Amplificator audio", sc: "Amplificator", prot: P_STD, adr: "0x747" },
    { k: "hud", b: "info", nume: "Afișaj head-up (HUD)", sc: "Head-up display", prot: P_STD, adr: "0x782" }
  ];
  var MK = {}; MODULE.forEach(function (m) { MK[m.k] = m; });
  var TIPURI_DEF = {
    term_lipsa: "Terminare lipsă (rezistența de 120 Ω din modulul de capăt întreruptă)",
    term_supl: "Terminare suplimentară de 120 Ω pe magistrală",
    scurt_hl: "CAN-H în scurtcircuit cu CAN-L",
    canl_masa: "CAN-L în scurtcircuit la masă",
    intrerupt: "Magistrala întreruptă spre modulul de capăt (conector desfăcut)",
    alim: "Modulul de capăt fără alimentare (siguranță arsă)"
  };
  var CHEI_DEF = ["term_lipsa", "term_supl", "scurt_hl", "canl_masa", "intrerupt", "alim"];
  var U_PIERDUT = { ecm: "U0100", esp: "U0121", bcm: "U0140", hu: "U0184" };
  var STARI = ["în așteptare", "confirmat (MIL)", "permanent", "istoric"];
  var MON = ["mis", "fuel", "ccm", "cat", "o2", "egr", "dpf"];
  var MON_ST = ["finalizat", "nefinalizat", "nesuportat"];
  var CLIENT = [
    { cod: "P0302", desc: "Rateuri de aprindere detectate la cilindrul 2", stare: 1, simptom: "Motorul trepidează la accelerare; lampa motorului clipește" },
    { cod: "P0171", desc: "Amestec prea sărac (banca 1)", stare: 1, simptom: "Ralanti instabil, lampa motorului aprinsă" },
    { cod: "P0133", desc: "Sonda λ amonte – răspuns lent", stare: 0, simptom: "Consum crescut de combustibil, lampa motorului stinsă" },
    { cod: "P0118", desc: "Senzorul de temperatură a lichidului – nivel ridicat (circuit întrerupt)", stare: 1, simptom: "Pornire grea la cald, ventilatorul funcționează continuu" }
  ];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); }, ri = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };
    var c = ri(0, 3), ff;
    if (c === 0) ff = { n: ri(24, 32) * 100, T: ri(84, 92), sarc: ri(55, 75), v: ri(55, 90) };
    else if (c === 1) ff = { n: ri(78, 86) * 10, T: ri(86, 93), sarc: ri(17, 26), v: 0 };
    else if (c === 2) ff = { n: ri(19, 22) * 100, T: ri(88, 93), sarc: ri(30, 42), v: ri(50, 70) };
    else ff = { n: ri(85, 95) * 10, T: -40, sarc: ri(20, 28), v: 0 };
    var T = {}, S = {};
    ["diag"].concat(CHEI_MAG).forEach(function (b) { T[b] = [r2(u(117, 123), 1), r2(u(117, 123), 1)]; S[b] = r2(u(22, 48), 1); });
    S.diag = 3;
    var bun = r() < 0.5;
    return {
      T: T, S: S, Ubat: r2(u(12.45, 12.75), 2),
      rec: r2(u(2.47, 2.53), 3), dH: r2(u(3.45, 3.6), 3), dL: r2(u(1.4, 1.55), 3),
      n10: ri(5, 12), n20: ri(6, 16), n100: ri(8, 20),
      I: r2(u(7.2, 9.2), 1), Rc: bun ? r2(u(0.002, 0.008), 4) : r2(u(0.03, 0.15), 3), Rfir: r2(u(0.008, 0.016), 4),
      client: c, ff: ff, catOk: r() < 0.6, codCaroserie: r() < 0.5,
      defBus: CHEI_MAG[Math.floor(r() * 4) % 4],
      defect: CHEI_DEF[Math.floor(r() * CHEI_DEF.length) % CHEI_DEF.length]
    };
  }
  /** încărcarea magistralei [%]; pentru CAN motor din mesajele pe perioade (1.4) */
  function incarcare(pr, b) { b = b || "motor"; return b === "motor" ? NBITI * (pr.n10 * 100 + pr.n20 * 50 + pr.n100 * 10) / FBIT * 100 : pr.S[b]; }
  function par(a, b) { return a * b / (a + b); }
  function df(pr, d, b) { return d && b === pr.defBus ? pr.defect : ""; }
  /** rezistența între CAN-H și CAN-L a magistralei b, măsurată la gateway (sau la priza OBD pentru „diag”), rețeaua în repaus */
  function rezistenta(pr, d, b) {
    b = b || "diag"; var t = pr.T[b], e = df(pr, d, b);
    if (e === "term_lipsa" || e === "intrerupt") return t[0];
    if (e === "term_supl") return par(par(t[0], t[1]), RX);
    if (e === "scurt_hl") return 0.4;
    return par(t[0], t[1]);
  }
  function niveluri(pr, d, b) {
    var e = df(pr, d, b || "diag");
    if (e === "scurt_hl") return { rH: 2.5, rL: 2.5, dH: 2.5, dL: 2.5, com: false };
    if (e === "canl_masa") return { rH: 0.04, rL: 0, dH: r2(pr.dH - pr.dL - 0.25, 3), dL: 0, com: true };
    if (e === "term_supl") return { rH: pr.rec, rL: pr.rec, dH: r2(pr.dH - 0.2, 3), dL: r2(pr.dL + 0.2, 3), com: true };
    if (e === "term_lipsa" || e === "intrerupt") return { rH: pr.rec, rL: pr.rec, dH: r2(pr.dH + 0.1, 3), dL: r2(pr.dL - 0.1, 3), com: true };
    return { rH: pr.rec, rL: pr.rec, dH: pr.dH, dL: pr.dL, com: true };
  }
  function medii(pr, d, b) {
    var n = niveluri(pr, d, b), k = n.com ? 0.35 * incarcare(pr, b || "diag") / 100 : 0;
    return { H: r2(n.rH + (n.dH - n.rH) * k, 3), L: r2(n.rL + (n.dL - n.rL) * k, 3) };
  }
  function cadere(pr) { var U0 = pr.Ubat - pr.I * (0.012 + pr.Rfir); return { U0: r2(U0, 3), Us: r2(U0 - pr.I * pr.Rc, 3), I: pr.I }; }
  /** răspunsul modulelor la scanare */
  function raspunde(pr, d, k) {
    var m = MK[k]; if (k === "gw") return true;
    var e = df(pr, d, m.b);
    if (e === "scurt_hl") return false;
    if ((e === "intrerupt" || e === "alim") && k === MAG[m.b].capat) return false;
    return true;
  }
  function coduri(pr, d) {
    var cl = CLIENT[pr.client], l = [];
    if (raspunde(pr, d, "ecm")) l.push({ mod: "ecm", cod: cl.cod, desc: cl.desc, stare: STARI[cl.stare], ff: pr.ff });
    if (pr.codCaroserie) l.push({ mod: "bcm", cod: "B1342", desc: "Lampa stop stânga – circuit întrerupt (cod specific constructorului)", stare: STARI[3], ff: null });
    if (d) {
      var b = pr.defBus, e = pr.defect, cap = MAG[b].capat, nm = MAG[b].n.split(" (")[0];
      if (e === "scurt_hl") {
        l.push({ mod: "gw", cod: "U0073", desc: "Magistrala " + nm + " oprită (bus-off)", stare: STARI[1], ff: null });
        l.push({ mod: "ki", cod: U_PIERDUT[cap], desc: "Comunicare pierdută cu " + MK[cap].sc, stare: STARI[1], ff: null });
        if (b !== "info") l.push({ mod: "hu", cod: U_PIERDUT[cap], desc: "Comunicare pierdută cu " + MK[cap].sc, stare: STARI[1], ff: null });
      } else if (e === "intrerupt" || e === "alim") {
        ["gw", b === "info" ? "ocu" : "ki"].forEach(function (m) { l.push({ mod: m, cod: U_PIERDUT[cap], desc: "Comunicare pierdută cu " + MK[cap].sc, stare: STARI[1], ff: null }); });
      } else if (e === "canl_masa") {
        l.push({ mod: "gw", cod: "U0001", desc: "Magistrala " + nm + " – erori de comunicare", stare: STARI[1], ff: null });
        l.push({ mod: cap, cod: "U0001", desc: "Magistrala CAN – erori de comunicare", stare: STARI[1], ff: null });
      } else l.push({ mod: "gw", cod: "U0001", desc: "Magistrala " + nm + " – erori de comunicare sporadice", stare: STARI[0], ff: null });
    }
    return l;
  }
  function module(pr, d) {
    var cs = coduri(pr, d);
    return MODULE.map(function (m) {
      var ras = raspunde(pr, d, m.k);
      return { k: m.k, b: m.b, nume: m.nume, prot: m.prot, adr: m.adr, raspunde: ras, n: ras ? cs.filter(function (c) { return c.mod === m.k; }).length : null, erori: ras && m.b !== "gw" && df(pr, d, m.b) === "canl_masa" };
    });
  }
  function monitoare(pr) {
    return { mis: "finalizat", fuel: "finalizat", ccm: "finalizat", cat: pr.catOk ? "finalizat" : "nefinalizat", o2: pr.client === 2 ? "nefinalizat" : "finalizat", egr: "nesuportat", dpf: "nesuportat" };
  }
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, o = {}, t15 = t.t15 || {}, t16 = (t.t16 || {}).f || {};
    var tb = n((t15.tbit || {}).n);
    o.fbit = tb > 0 ? 1000 / tb : NaN;
    o.udiff = n((t15.uhd || {}).n) - n((t15.uld || {}).n);
    o.Rn = n((t15.R || {}).n); o.Rd = n((t15.R || {}).d);
    o.Rsupl = o.Rn > 0 ? o.Rn * RX / (o.Rn + RX) : NaN;
    var U0 = n(t16.U0), Us = n(t16.Us), I = n(t16.I);
    o.dU = U0 - Us; o.Rc = I > 0 ? o.dU / I : NaN;
    return o;
  }
  function asteptate(o, pr) { return { q1: o.fbit, q2: incarcare(pr, "motor"), q3: o.Rc, q4: o.Rsupl }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var aproape = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true, dd = !!l.d, b = l.b || "diag";
      if (l.m === "ohm") { var R = rezistenta(pr, dd, b); ok = aproape(l.v, R, Math.max(0.3, 0.015 * R)); }
      else if (l.m === "volt") { var md = medii(pr, dd, b), e = l.p === "6" ? md.H : l.p === "14" ? md.L : NaN; if (isFinite(e)) ok = aproape(l.v, e, 0.03); }
      else if (l.m === "tbit") ok = aproape(l.v, 1e6 / FBIT, 0.06) || (b === "sasiu" && aproape(l.v, 1e6 / FBIT_FD, 0.02));
      else if (l.m === "dom") { var nv = niveluri(pr, dd, b); ok = aproape(l.H, nv.dH, 0.08) && aproape(l.L, nv.dL, 0.08); }
      else if (l.m === "drop") { var c = cadere(pr); ok = aproape(l.v, c[l.k], l.k === "I" ? 0.15 : 0.006); }
      else if (l.m === "dtc") ok = coduri(pr, dd).some(function (c) { return c.cod === l.cod && c.mod === l.mod; });
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b) { return Math.abs(Number(a) - Number(b)) < 0.0051 * Math.max(1, Math.abs(Number(b))); };
    var t15 = t.t15 || {};
    ["n", "d"].forEach(function (s) {
      var dd = s === "d";
      var R = U.num((t15.R || {})[s]); if (isFinite(R) && !inLog(function (l) { return l.m === "ohm" && !!l.d === dd && eq(l.v, R); })) out.faraCitire++;
      [["uh", "6"], ["ul", "14"]].forEach(function (x) { var v = U.num((t15[x[0]] || {})[s]); if (isFinite(v) && !inLog(function (l) { return l.m === "volt" && l.p === x[1] && !!l.d === dd && eq(l.v, v); })) out.faraCitire++; });
      var h = U.num((t15.uhd || {})[s]), lo = U.num((t15.uld || {})[s]);
      if (isFinite(h) && !inLog(function (l) { return l.m === "dom" && !!l.d === dd && eq(l.H, h); })) out.faraCitire++;
      if (isFinite(lo) && !inLog(function (l) { return l.m === "dom" && !!l.d === dd && eq(l.L, lo); })) out.faraCitire++;
      var tb = U.num((t15.tbit || {})[s]); if (isFinite(tb) && !inLog(function (l) { return l.m === "tbit" && eq(l.v, tb); })) out.faraCitire++;
    });
    var f = (t.t16 || {}).f || {};
    ["U0", "Us", "I"].forEach(function (k) { var v = U.num(f[k]); if (isFinite(v) && !inLog(function (l) { return l.m === "drop" && l.k === k && eq(l.v, v); })) out.faraCitire++; });
    Object.keys(t.t12 || {}).forEach(function (k) { var c = String((t.t12[k] || {}).cod || "").trim().toUpperCase(); if (c && !inLog(function (l) { return l.m === "dtc" && l.cod === c; })) out.faraCitire++; });
    var mo = monitoare(pr), nmg = 0;
    MON.forEach(function (k) { var v = ((t.t13 || {})[k] || {}).st; if (v && v !== mo[k]) nmg++; });
    if (nmg) { out.incompatibile += nmg; out.motive.push(nmg + " monitoare de pregătire cu altă stare decât cea afișată de tester"); }
    var o = prelucreaza(t, U), a = asteptate(o, pr), rasp = d.raspunsuri || {};
    var r17 = (t.t17 || {}).d || {}, okBus = r17.bus === MAG[pr.defBus].n, okTip = r17.tip === TIPURI_DEF[pr.defect];
    out.principal = { eticheta: "defect identificat", valoare: okBus && okTip ? "DA" : okBus || okTip ? "PARȚIAL" : "NU" };
    var tol = { q1: 0.01, q2: 0.02, q3: 0.03, q4: 0.01 };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k] + (k === "q3" ? 0.0006 : 0.05);
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 10000) / 10000 : "—", corect: ok };
    });
    var okDef = okBus && okTip; if (okDef) out.corecte++;
    out.detalii.defect = { raspuns: (r17.bus || "") + " – " + (r17.tip || ""), asteptat: MAG[pr.defBus].n + " – " + TIPURI_DEF[pr.defect], corect: okDef };
    return out;
  }
  return { FBIT: FBIT, FBIT_FD: FBIT_FD, NBITI: NBITI, RX: RX, MAG: MAG, CHEI_MAG: CHEI_MAG, MODULE: MODULE, MK: MK, TIPURI_DEF: TIPURI_DEF, CHEI_DEF: CHEI_DEF, STARI: STARI, MON: MON, MON_ST: MON_ST, CLIENT: CLIENT,
    parametri: parametri, incarcare: incarcare, rezistenta: rezistenta, niveluri: niveluri, medii: medii, cadere: cadere, raspunde: raspunde, module: module, coduri: coduri,
    monitoare: monitoare, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();


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


/* ---- da/l3/model.js ---- */
/* DA – Lucrarea 3. Starea mecanică a motorului (standul K7J 1.4 MPI, ordinea de aprindere 1-3-4-2).
   Modelul etanșeității cilindrilor: compresia relativă (curentul demarorului), compresometrul (uscat / umed),
   pierderea de aer și presiunea din colector. Fiecare student are motorul propriu și un defect mecanic ascuns.
   Folosit identic în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l3"] = (function () {
  var EPS = 9.5, ORDINE = [1, 3, 4, 2];
  var TIPURI = {
    seg: "Segmenți / cilindru uzați", sadm: "Supapă de admisie neetanșă", sev: "Supapă de evacuare neetanșă",
    garn: "Garnitura de chiulasă arsă între cilindri vecini", dist: "Distribuție decalată (curea sărită cu un dinte)", evac: "Evacuare obturată (catalizator înfundat)"
  };
  var CHEI = ["seg", "sadm", "sev", "garn", "dist", "evac"];
  var LOCURI = ["—", "admisie (corpul clapetei)", "evacuare (țeava de evacuare)", "bușonul de ulei (carter)", "vasul de expansiune (bule)", "orificiul bujiei cilindrului vecin"];
  function eticheta(d) {
    if (d.tip === "garn") return TIPURI.garn + " " + d.c + "–" + (d.c + 1);
    if (d.tip === "dist" || d.tip === "evac") return TIPURI[d.tip];
    return TIPURI[d.tip] + " – cilindrul " + d.c;
  }
  function optiuniDiag() {
    var o = ["Motor în stare bună"];
    ["seg", "sadm", "sev"].forEach(function (t) { [1, 2, 3, 4].forEach(function (c) { o.push(eticheta({ tip: t, c: c })); }); });
    [1, 2, 3].forEach(function (c) { o.push(eticheta({ tip: "garn", c: c })); });
    o.push(eticheta({ tip: "dist" }), eticheta({ tip: "evac" }));
    return o;
  }
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var tip = CHEI[Math.floor(r() * CHEI.length)], c = 1 + Math.floor(r() * (tip === "garn" ? 3 : 4));
    var k = [0, 1, 2, 3].map(function () { return r2(1 + u(-0.025, 0.025), 4); });
    return {
      p0: r2(u(12.2, 13.4), 2), k: k, patm: r2(u(99.2, 102.2), 1), ubat: r2(u(12.55, 12.8), 2),
      I0: Math.round(u(105, 135)), kI: r2(u(4.6, 5.4), 2), nCr: Math.round(u(200, 245)),
      m: [1.2, 1.25, 1.3][Math.floor(r() * 3)], Lok: [0, 1, 2, 3].map(function () { return r2(u(4, 9), 1); }),
      sev1: r2(u(0.66, 0.76), 3), wet: r2(u(0.2, 0.3), 3), Ldef: r2(u(30, 42), 1), pRal: r2(u(32, 37), 1),
      defect: { tip: tip, c: c }
    };
  }
  /** factorul de etanșare (uscat) al cilindrului c (1…4) */
  function fCil(pr, c) {
    var d = pr.defect, f = pr.k[c - 1];
    if (d.tip === "dist") return f * 0.82;
    if ((d.tip === "seg" || d.tip === "sadm" || d.tip === "sev") && d.c === c) return f * pr.sev1;
    if (d.tip === "garn" && (c === d.c || c === d.c + 1)) return f * (pr.sev1 + 0.05);
    return f;
  }
  /** presiunea de compresie la compresometru: c – cilindrul, ulei – testul umed, cond = { bujii (toate scoase), clapeta (deschisă), cald }, n – numărul de curse */
  function compresie(pr, c, ulei, cond, n) {
    var d = pr.defect, f = fCil(pr, c);
    if (ulei) { if (d.tip === "seg" && d.c === c) f = Math.min(pr.k[c - 1] * 0.97, f * (1 + pr.wet)); else f = f * 1.03; }
    var p = pr.p0 * f * (cond.bujii ? 1 : 0.88) * (cond.clapeta ? 1 : 0.8) * (cond.cald ? 1 : 0.94);
    return p * (1 - Math.pow(0.42, Math.max(0, n || 6)));
  }
  /** curentul demarorului: vârful pentru cilindrul c (bujiile montate) */
  function iVarf(pr, c) { return pr.I0 + pr.kI * pr.p0 * 1.05 * fCil(pr, c); }
  /** pierderea de aer [%] la PMI compresie */
  function pierdere(pr, c) {
    var d = pr.defect, L = pr.Lok[c - 1];
    if ((d.tip === "seg" || d.tip === "sadm" || d.tip === "sev") && d.c === c) L = pr.Ldef + (d.tip === "seg" ? 0 : 8);
    if (d.tip === "garn" && (c === d.c || c === d.c + 1)) L = pr.Ldef - 6;
    return L;
  }
  function loc(pr, c) {
    var d = pr.defect;
    if (d.c === c && d.tip === "seg") return LOCURI[3];
    if (d.c === c && d.tip === "sadm") return LOCURI[1];
    if (d.c === c && d.tip === "sev") return LOCURI[2];
    if (d.tip === "garn" && (c === d.c || c === d.c + 1)) return LOCURI[4];
    return LOCURI[0];
  }
  /** presiunea absolută din colector [kPa]: regim, timpul în regim [s] */
  function pCol(pr, reg, t) {
    var d = pr.defect, b = pr.pRal * (pr.patm / 101.3);
    if (d.tip === "dist") b += 15; else if (d.tip === "seg" || d.tip === "garn") b += 3; else if (d.tip === "sadm" || d.tip === "sev") b += 2;
    if (reg === "oprit") return pr.patm;
    if (reg === "ralanti") return b;
    if (reg === "r2500") { var p = b - 8; if (d.tip === "evac") p += 26 * (1 - Math.exp(-t / 12)); return p; }
    if (reg === "accel") return d.tip === "evac" ? b - 6 : b - 16;          // minimul după eliberarea bruscă a pedalei
    return b;
  }
  function delta(ps) { var m = Math.max.apply(null, ps); return ps.map(function (p) { return (m - p) / m * 100; }); }
  function asteptate(pr) {
    var dry = [1, 2, 3, 4].map(function (c) { return compresie(pr, c, false, { bujii: true, clapeta: true, cald: true }, 6); });
    var dI = [1, 2, 3, 4].map(function (c) { return iVarf(pr, c) - pr.I0; }), mx = Math.max.apply(null, dI);
    var L = [1, 2, 3, 4].map(function (c) { return pierdere(pr, c); });
    return { q1: pr.patm / 100 * Math.pow(EPS, 1.25), q2: Math.max.apply(null, delta(dry)), q3: Math.max.apply(null, L), q4: Math.min.apply(null, dI) / mx * 100 };
  }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "avl") ok = ap(l.I0, pr.I0, 6) && [1, 2, 3, 4].every(function (c) { return ap(l.I[c - 1], iVarf(pr, c), 6); });
      else if (l.m === "comp") ok = ap(l.p, compresie(pr, Number(l.c), !!l.ulei, { bujii: !!l.bujii, clapeta: !!l.clapeta, cald: !!l.cald }, Number(l.n)), 0.25);
      else if (l.m === "leak") ok = ap(l.pcil, Number(l.pin) * (1 - pierdere(pr, Number(l.c)) / 100), 0.08);
      else if (l.m === "map") ok = ap(l.p, pCol(pr, l.reg, Number(l.t) || 30), 2.5);
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.051); };
    [1, 2, 3, 4].forEach(function (c) {
      var r = (t.t31 || {})["c" + c] || {}, im = U.num(r.Imax); if (isFinite(im) && !inLog(function (l) { return l.m === "avl" && eq(l.I[c - 1], im, 0.6); })) out.faraCitire++;
      var q = (t.t32 || {})["c" + c] || {};
      [["us", false], ["um", true]].forEach(function (x) { var v = U.num(q[x[0]]); if (isFinite(v) && !inLog(function (l) { return l.m === "comp" && Number(l.c) === c && !!l.ulei === x[1] && eq(l.p, v, 0.051); })) out.faraCitire++; });
      var z = (t.t33 || {})["c" + c] || {}, pc = U.num(z.pcil); if (isFinite(pc) && !inLog(function (l) { return l.m === "leak" && Number(l.c) === c && eq(l.pcil, pc, 0.006); })) out.faraCitire++;
    });
    ["ralanti", "accel", "r2500"].forEach(function (k) { var v = U.num(((t.t34 || {})[k] || {}).p); if (isFinite(v) && !inLog(function (l) { return l.m === "map" && l.reg === k && eq(l.p, v, 0.06); })) out.faraCitire++; });
    var a = asteptate(pr), rasp = d.raspunsuri || {};
    var tol = { q1: [0.02, 0.1], q2: [0, 2.5], q3: [0, 3], q4: [0, 3] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 100) / 100, corect: ok };
    });
    var dg = ((t.t35 || {}).d || {}).cauza || "", okD = dg === eticheta(pr.defect);
    if (okD) out.corecte++;
    out.detalii.defect = { raspuns: dg, asteptat: eticheta(pr.defect), corect: okD };
    out.principal = { eticheta: "defect identificat", valoare: okD ? "DA" : "NU" };
    return out;
  }
  return { EPS: EPS, ORDINE: ORDINE, TIPURI: TIPURI, CHEI: CHEI, LOCURI: LOCURI, eticheta: eticheta, optiuniDiag: optiuniDiag, parametri: parametri,
    fCil: fCil, compresie: compresie, iVarf: iVarf, pierdere: pierdere, loc: loc, pCol: pCol, delta: delta, asteptate: asteptate, verifica: verifica };
})();


/* ---- da/l4/model.js ---- */
/* DA – Lucrarea 4. Sistemul de alimentare MAS și analiza gazelor de evacuare (standul K7J 1.4 MPI, sistem cu retur).
   Modelul: regulatorul de presiune comandat de presiunea din colector, menținerea presiunii după oprire, debitul pompei,
   compoziția gazelor (ardere cu echilibrul apă–gaz K = 3,5, rateuri, catalizator limitat de oxigen), bucla închisă a ECU
   (corecțiile STFT / LTFT) și un defect ascuns al sistemului de alimentare. Folosit identic în aplicație și pe server. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l4"] = (function () {
  var HCV = 1.7261, OCV = 0.0176, K1 = 6e-4, A_ST = 1 + HCV / 4 - OCV / 2;
  var TIPURI = {
    valva: "Supapa de reținere a pompei neetanșă", inj: "Injector care picură (neetanș)", reg: "Regulatorul de presiune defect (membrana fisurată / blocat)",
    filtru: "Filtrul de combustibil colmatat (debit insuficient)", aer: "Aer fals la colectorul de admisie (garnitură)", sonda: "Sonda λ amonte îmbătrânită (răspuns lent)"
  };
  var CHEI = ["valva", "inj", "reg", "filtru", "aer", "sonda"];
  var EXPLICATII = ["aer nemăsurat – amestec sărac, corecții pozitive", "combustibil nears – HC și O₂ mari, λ „fals” > 1", "presiune mare – amestec bogat, corecții negative",
    "scăpări în evacuare înaintea sondei", "amestec corect – motor în stare bună"];
  function eticheta(d) { return TIPURI[d.tip] || "—"; }
  function optiuniDiag() { return CHEI.map(function (k) { return TIPURI[k]; }); }
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      p0: r2(u(2.9, 3.1), 2), patm: r2(u(99.5, 102.0), 1), pRal: r2(u(32, 37), 1), nRal: Math.round(u(770, 830)),
      q0: r2(u(1.6, 1.95), 2), dHold: r2(u(0.2, 0.4), 2), errA: r2(u(-0.04, 0.04), 3), ltft0: r2(u(-3, 3), 1),
      eta: r2(u(0.90, 0.96), 3), fl: r2(u(0.85, 1.05), 2), defect: { tip: CHEI[Math.floor(r() * CHEI.length) % CHEI.length] }
    };
  }
  /* ---------------- presiunea și debitul combustibilului */
  function pCol(pr, reg) { return reg === "oprit" || reg === "contact" ? pr.patm : reg === "r2500" ? r2(pr.pRal - 7, 1) : pr.pRal; }
  /** presiunea relativă din rampă [bar]: reg ∈ contact | ralanti | r2500; faraVac – furtunul regulatorului deconectat și obturat */
  function pRampa(pr, reg, faraVac) {
    var regBlocat = pr.defect.tip === "reg", pc = pCol(pr, reg), dpf = pr.defect.tip === "filtru" && reg === "r2500" ? 0.15 : 0;
    if (faraVac || regBlocat) return pr.p0 - dpf;
    return pr.p0 - (pr.patm - pc) / 100 - dpf;
  }
  /** presiunea după oprirea motorului, t [s] */
  function pRetinere(pr, t) {
    var d = pr.defect.tip, pf = pr.p0 - pr.dHold, tau = 110;
    if (d === "valva") { pf = 0.35; tau = 70; } else if (d === "inj") { pf = 1.0; tau = 140; }
    return pf + (pr.p0 - pf) * Math.exp(-t / tau);
  }
  function debitPompa(pr) { return pr.defect.tip === "filtru" ? r2(pr.q0 * 0.62, 3) : pr.q0; }
  /* ---------------- gazele de evacuare */
  function brettschneider(CO, CO2, HC, O2) {
    var s = CO2 + CO, num = CO2 + CO / 2 + O2 + (HCV / 4 * 3.5 / (3.5 + (CO2 > 0 ? CO / CO2 : 0)) - OCV / 2) * s, den = (1 + HCV / 4 - OCV / 2) * (s + K1 * HC);
    return den > 0 ? num / den : NaN;
  }
  /** compoziția uscată după catalizator: lam – amestecul cilindrilor care ard, m – fracțiunea de combustibil nears (rateuri), eta – activitatea catalizatorului */
  function gaze(lam, m, eta, extraCO) {
    // m – fracțiunea de aer care trece prin cilindrul cu injectorul decuplat (fără combustibil): oxigen nears + HC din filmul de pe pereți
    var CO2, CO, H2, O2, HCc, aB = m / (1 - m), N2 = 3.773 * lam * A_ST * (1 + aB);
    if (lam >= 1) { CO2 = 1; CO = 0; H2 = 0; O2 = (lam - 1) * A_ST; }
    else {
      var lo = 0, hi = 1, w, x;
      for (var k = 0; k < 60; k++) { x = (lo + hi) / 2; w = 2 * lam * A_ST + OCV - 1 - x; var f = w * (1 - x) - 3.5 * (HCV / 2 - w) * x; if (f > 0) lo = x; else hi = x; }
      w = 2 * lam * A_ST + OCV - 1 - x; CO2 = x; CO = 1 - x; H2 = Math.max(0, HCV / 2 - w); O2 = 0;
    }
    // imperfecțiunile arderii: puțin CO și HC chiar la amestec corect
    var d = 0.012 + (extraCO || 0); CO2 -= d; CO += d; O2 += d / 2;
    var hcE = 0.0035 + (m > 0 ? 0.065 : 0); CO2 -= hcE; O2 += hcE * (1 + HCV / 4);
    HCc = hcE; O2 += aB * lam * A_ST;
    // catalizatorul: oxidare limitată de oxigenul disponibil (la rateuri catalizatorul este suprasolicitat)
    var nCO = CO / 2, nH2 = H2 / 2, nHC = HCc * (1 + HCV / 4), need = nCO + nH2 + nHC;
    if (need > 0 && O2 > 0) {
      var f1 = Math.min(eta, O2 / need), fHC = Math.min(eta * (m > 0 ? 0.5 : 0.86), O2 / need);
      O2 -= f1 * (nCO + nH2) + fHC * nHC; CO2 += f1 * CO + fHC * HCc; CO -= f1 * CO; H2 -= f1 * H2; HCc -= fHC * HCc;
    }
    var hc6 = HCc / 6, T = (CO2 + CO + H2 + Math.max(O2, 0) + N2 + hc6) / 0.945;   // diluția probei (umiditate reziduală, aer în traseu)
    return { CO: CO / T * 100, CO2: CO2 / T * 100, O2: Math.max(O2, 0) / T * 100, HC: hc6 / T * 1e6 };
  }
  /** starea motorului cald: reg ∈ ralanti | r2500; prov ∈ "" | aer | rateu | pres (defectul provocat, ≈ 2500 rot/min) */
  function stare(pr, reg, prov) {
    var d = pr.defect.tip, ral = reg === "ralanti";
    var dpReg = Math.sqrt((pr.p0 + (pr.patm - pCol(pr, reg)) / 100) / pr.p0) - 1;     // debitul injectoarelor crește cu √Δp
    var aerPerm = pr.errA + (d === "aer" ? (ral ? 0.16 : 0.05) : 0), combPerm = (d === "inj" ? (ral ? 0.07 : 0.02) : 0) + (d === "reg" ? dpReg : 0) - (d === "filtru" && !ral ? 0.07 : 0);
    var aerProv = prov === "aer" ? (ral ? 0.3 : 0.14) : 0, combProv = prov === "pres" && d !== "reg" ? dpReg : 0, m = prov === "rateu" ? 0.11 : 0;
    var lamPerm = (1 + aerPerm) / (1 + combPerm), lamRaw = (1 + aerPerm + aerProv) / (1 + combPerm + combProv);
    // LTFT – adaptarea pe termen lung (defectul permanent); STFT – bucla închisă (complet în regim stabil, parțial în timpul testului de 1–2 min)
    var ltft = Math.max(-25, Math.min(25, Math.round(((lamPerm - 1) * 100 + pr.ltft0) * 10) / 10));
    var lam1 = lamRaw / (1 + ltft / 100), vazut = lam1 + 0.6 * m;
    var stft = Math.max(-25, Math.min(25, (prov ? 0.45 : 1) * (vazut - 1) * 100));
    var lam2 = lam1 / (1 + stft / 100) * 1.003;                 // oscilația buclei lasă puțin O₂ rezidual
    var extraCO = (d === "sonda" ? 0.004 : 0) + (ral ? 0.001 : 0), eta = pr.eta * (d === "sonda" ? 0.9 : 1) * (ral ? 0.97 : 1);
    var g = gaze(lam2, m, eta, extraCO);
    if (d === "inj" && ral) g.HC += 60;
    g.lam = brettschneider(g.CO, g.CO2, g.HC, g.O2);
    g.stft = r2(stft, 1); g.ltft = ltft; g.lamMix = lam2;
    g.n = ral ? pr.nRal : 2500; g.pcol = pCol(pr, reg) + (d === "aer" && ral ? 6 : 0) + (prov === "aer" ? 4 : 0);
    return g;
  }
  /** valorile afișate de analizor (rotunjite ca pe ecranul AVL) */
  function afisaj(g) { return { CO: r2(g.CO, 2), CO2: r2(g.CO2, 1), HC: Math.round(g.HC), O2: r2(g.O2, 2) }; }
  /** frecvența și amplitudinea comutării sondei λ amonte la ≈ 2000 rot/min */
  function sondaLambda(pr) { return pr.defect.tip === "sonda" ? { f: 0.35 * pr.fl, vmin: 0.31, vmax: 0.59 } : { f: 0.9 * pr.fl, vmin: 0.07, vmax: 0.83 }; }
  /* ---------------- prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t41 || {}, o = {};
    var pc = n((T1.contact || {}).p), cc = n((T1.contact || {}).pcol), pr = n((T1.ralanti || {}).p), cr = n((T1.ralanti || {}).pcol);
    o.difC = pc - cc / 100; o.difR = pr - cr / 100; o.delta = o.difC - o.difR;
    o.Qp = n((T1.debit || {}).p) / (60 / 60);
    var lam = function (r) { r = r || {}; return brettschneider(n(r.CO), n(r.CO2), n(r.HC), n(r.O2)); };
    o.lam = {}; ["ralanti", "r2500"].forEach(function (k) { o.lam[k] = lam((t.t42 || {})[k]); });
    ["aer", "rateu", "pres"].forEach(function (k) { o.lam[k] = lam((t.t43 || {})[k]); });
    return o;
  }
  function asteptate(o) { return { q1: o.delta, q2: o.Qp, q3: o.lam.r2500, q4: o.lam.rateu }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "pres") {
        var pe = l.k === "dupa5" ? pRetinere(pr, Number(l.t)) : pRampa(pr, l.k === "contact" ? "contact" : "ralanti", l.k === "faravac");
        ok = ap(l.p, pe, 0.07) && (l.pcol == null || ap(l.pcol, l.k === "contact" ? pr.patm : pCol(pr, "ralanti") + (pr.defect.tip === "aer" ? 6 : 0), 1.5));
      } else if (l.m === "debit") ok = ap(l.V, debitPompa(pr) * Number(l.t) / 60, 0.06);
      else if (l.m === "gaze") {
        var g = stare(pr, l.reg, l.prov || "");
        ok = ap(l.CO, g.CO, 0.03 + 0.06 * g.CO) && ap(l.CO2, g.CO2, 0.25) && ap(l.HC, g.HC, 8 + 0.06 * g.HC) && ap(l.O2, g.O2, 0.04 + 0.06 * g.O2) && ap(l.stft, g.stft, 2.5) && ap(l.ltft, g.ltft, 1.5);
      }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.006); };
    ["contact", "ralanti", "faravac", "dupa5"].forEach(function (k) { var v = U.num(((t.t41 || {})[k] || {}).p); if (isFinite(v) && !inLog(function (l) { return l.m === "pres" && l.k === k && eq(l.p, v); })) out.faraCitire++; });
    var vd = U.num(((t.t41 || {}).debit || {}).p); if (isFinite(vd) && !inLog(function (l) { return l.m === "debit" && eq(l.V, vd, 0.026); })) out.faraCitire++;
    [["t42", "ralanti", ""], ["t42", "r2500", ""], ["t43", "aer", "aer"], ["t43", "rateu", "rateu"], ["t43", "pres", "pres"]].forEach(function (x) {
      var r = (t[x[0]] || {})[x[1]] || {}, co = U.num(r.CO);
      if (isFinite(co) && !inLog(function (l) { return l.m === "gaze" && (l.prov || "") === x[2] && (x[0] === "t43" || l.reg === x[1]) && eq(l.CO, co, 0.006) && eq(l.O2, U.num(r.O2), 0.006) && eq(l.HC, U.num(r.HC), 0.6); })) out.faraCitire++;
    });
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.05], q2: [0.02, 0.02], q3: [0, 0.006], q4: [0, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    var dg = ((t.t44 || {}).d || {}).cauza || "", okD = dg === eticheta(pr.defect);
    if (okD) out.corecte++;
    out.detalii.defect = { raspuns: dg, asteptat: eticheta(pr.defect), corect: okD };
    out.principal = { eticheta: "defect identificat", valoare: okD ? "DA" : "NU" };
    return out;
  }
  return { HCV: HCV, OCV: OCV, K1: K1, TIPURI: TIPURI, CHEI: CHEI, EXPLICATII: EXPLICATII, eticheta: eticheta, optiuniDiag: optiuniDiag, parametri: parametri,
    pCol: pCol, pRampa: pRampa, pRetinere: pRetinere, debitPompa: debitPompa, brettschneider: brettschneider, gaze: gaze, stare: stare, afisaj: afisaj,
    sondaLambda: sondaLambda, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();


/* ---- mam1/l1/model.js ---- */
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


/* ---- mam1/l2/model.js ---- */
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


/* ---- mam1/l3/model.js ---- */
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


/* ---- mf/l4/model.js ---- */
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


/* ---- saa/l1/model.js ---- */
/* SAA – Lucrarea 1. Sistemul de injecție de benzină multipunct – caracteristicile de funcționare (standul 1.4 MPI).
   Modelul motorului (speed-density), al injectorului (debit static, timp mort) și al regimurilor tranzitorii;
   folosit identic în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l1"] = (function () {
  var VC = 0.3475e-3, RA = 287, TADM = 300, AFR = 14.7, NCIL = 4;         // cilindree unitară [m³], aer, raport stoichiometric
  /** regimurile din Tabelul 1.2 (motor cald, stand fără sarcină) */
  var REG = {
    ral: { et: "ralanti", n: 800, p: 34, c: false },
    ralc: { et: "ralanti + consumatori", n: 800, p: 39, c: true },
    n1500: { et: "1500", n: 1500, p: 27.5, c: false },
    n2000: { et: "2000", n: 2000, p: 24.5, c: false },
    n2000c: { et: "2000 + consumatori", n: 2000, p: 28, c: true },
    n2500: { et: "2500", n: 2500, p: 22, c: false },
    n3000: { et: "3000", n: 3000, p: 20.5, c: false }
  };
  var CHEI_REG = ["ral", "ralc", "n1500", "n2000", "n2000c", "n2500", "n3000"];
  var REG_CONS = ["ral", "n2000", "n3000"];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var dp = {}; CHEI_REG.forEach(function (k) { dp[k] = r2(u(-1.2, 1.2), 1); });
    return {
      qs: r2(u(2.2, 2.8), 3),                 // debitul static efectiv al injectorului [mg/ms] (presiune, uzură)
      tm0: r2(u(0.65, 1.0), 3),               // timpul mort la 14 V [ms]
      fev: r2(u(0.96, 1.04), 3),              // factorul eficienței volumetrice
      dp: dp,                                 // abaterea MAP pe regimuri [kPa]
      k20: r2(u(1.6, 1.9), 3),                // corecția de încălzire la 20 °C
      tauT: r2(u(4.4, 5.8), 2),               // constanta de timp a încălzirii [min]
      T0: r2(u(16, 22), 1),                   // temperatura inițială a motorului [°C]
      kacc: r2(u(2.0, 2.6), 2),               // îmbogățirea maximă la accelerare
      ncut: 50 * Math.round(u(1500, 1800) / 50), nres: 50 * Math.round(u(1100, 1300) / 50),
      tauN: r2(u(1.0, 1.4), 2), tdel: r2(u(0.3, 0.6), 2)  // decelerare: constanta de timp a turației [s], întârzierea întreruperii [s]
    };
  }
  function ev(pr, n) { return pr.fev * (0.6 + 0.22 * (1 - Math.exp(-(n - 600) / 1100))); }
  function tmort(pr, U) { return pr.tm0 * Math.pow(14 / U, 1.5); }
  function ubat(c) { return c ? 13.6 : 13.9; }
  /** masa de aer pe ciclu și cilindru [mg] */
  function maer(pr, n, p) { return ev(pr, n) * p * 1000 * VC / (RA * TADM) * 1e6; }
  function kECT(pr, T) { var e0 = Math.exp(-65 / 22), f = (Math.exp(-(T - 20) / 22) - e0) / (1 - e0); return 1 + (pr.k20 - 1) * Math.max(0, Math.min(1.2, f)); }   // = 1 de la 85 °C (motor cald)
  /** turația de ralanti și MAP-ul la ralanti în funcție de temperatură (motor rece: turație și debit de aer mai mari) */
  function ralanti(T) { var f = Math.max(0, (70 - T) / 50); return { n: 800 + 350 * Math.min(1, f), dp: 6 * Math.min(1, f) }; }
  function presiune(pr, k) { return REG[k].p + pr.dp[k]; }
  /** masa injectată pe ciclu [mg] și durata de injecție [ms] la regimul (n, p), temperatura T, consumatori c */
  function minj(pr, n, p, T) { return maer(pr, n, p) / AFR * kECT(pr, T); }
  function ti(pr, n, p, T, c) { return minj(pr, n, p, T) / pr.qs + tmort(pr, ubat(c)); }
  function tiReg(pr, k) { var R = REG[k]; return ti(pr, R.n, presiune(pr, k), 90, R.c); }
  /** consumul orar [kg/h] și debitul masic [g/s] la regim */
  function consum(pr, k) { var R = REG[k], m = minj(pr, R.n, presiune(pr, k), 90); return { m: m, gs: m * NCIL * R.n / 2 / 60 / 1000, Ch: m * NCIL * R.n / 2 * 60 / 1e6 }; }
  /** temperatura motorului după t [min] de la pornirea la rece */
  function temperatura(pr, tmin) { return pr.T0 + (92 - pr.T0) * (1 - Math.exp(-tmin / pr.tauT)); }
  /** regimurile tranzitorii */
  function tiMax(pr) { return r2(tiReg(pr, "ral") * pr.kacc, 2); }
  function decel(pr, n0) {
    var ncut = 800 + (n0 - 800) * Math.exp(-pr.tdel / pr.tauN);
    var dur = ncut > pr.ncut ? pr.tauN * Math.log((ncut - 800) / (pr.nres - 800)) : 0;
    return { ncut: ncut, nres: pr.nres, dur: dur, taie: ncut > pr.ncut };
  }
  function regresie(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var a = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: a, b: (sy - a * sx) / n }; }
  /** prelucrarea tabelelor studentului */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, o = { cons: {} }, xs = [], ys = [];
    REG_CONS.forEach(function (k) {
      var r = (t.t13 || {})[k] || {}, N = n(r.n), T = n(r.ti), dt = n(r.dt), m = n(r.m);
      if (isFinite(N) && isFinite(dt) && isFinite(m) && dt > 0) {
        var Ch = 3.6 * m / dt, mi = Ch * 1e6 / (NCIL * N / 2 * 60);
        o.cons[k] = { Ch: Ch, minj: mi };
        if (isFinite(T)) { xs.push(T); ys.push(mi); }
      }
    });
    o.reg = xs.length >= 2 ? regresie(xs, ys) : null;
    o.qs = o.reg ? o.reg.a : NaN; o.tmort = o.reg ? -o.reg.b / o.reg.a : NaN;
    var t11 = t.t11 || {}, tc = n(((t.t12 || {}).ral || {}).tiD);
    var tic = isFinite(tc) ? tc : NaN;
    o.kECT0 = isFinite(n((t11.m0 || {}).ti)) && isFinite(tic) ? n(t11.m0.ti) / tic : NaN;
    var r3 = (t.t12 || {}).n3000 || {}, n3 = n(r3.n), t3 = n(r3.tiO);
    o.dc3000 = isFinite(n3) && isFinite(t3) ? t3 / (120000 / n3) * 100 : NaN;
    return o;
  }
  function asteptate(o) { return { q1: o.qs, q2: o.tmort, q3: o.kECT0, q4: o.dc3000 }; }
  var MINUTE = ["m0", "m2", "m4", "m6", "m8", "m10", "m12", "m14"];
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "inc") { var R = ralanti(Number(l.T)); ok = ap(l.ti, ti(pr, R.n, presiune(pr, "ral") + R.dp, Number(l.T), false), 0.04) && ap(l.n, R.n, 15); }
      else if (l.m === "reg") ok = ap(l.n, REG[l.k].n, 15) && ap(l.p, presiune(pr, l.k), 0.6) && ap(l.ti, tiReg(pr, l.k), 0.04);
      else if (l.m === "tio") ok = ap(l.v, tiReg(pr, l.k), 0.07);
      else if (l.m === "cons") { var c = consum(pr, l.k); ok = ap(l.mg, c.gs * Number(l.dt), 0.15 + 0.01 * c.gs * Number(l.dt)); }
      else if (l.m === "tr") {
        if (l.k === "timax") ok = ap(l.v, tiMax(pr), 0.15);
        else { var dd = decel(pr, Number(l.n0) || 3000); if (l.k === "ncut") ok = ap(l.v, dd.ncut, 40); else if (l.k === "nres") ok = ap(l.v, dd.nres, 40); else if (l.k === "dur") ok = ap(l.v, dd.dur, 0.25); }
      }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b) { return Math.abs(Number(a) - Number(b)) < 0.0051 * Math.max(1, Math.abs(Number(b))); };
    MINUTE.forEach(function (k) { var r = (t.t11 || {})[k] || {}, v = U.num(r.ti); if (isFinite(v) && !inLog(function (l) { return l.m === "inc" && eq(l.ti, v); })) out.faraCitire++; });
    CHEI_REG.forEach(function (k) {
      var r = (t.t12 || {})[k] || {};
      var v = U.num(r.tiD); if (isFinite(v) && !inLog(function (l) { return l.m === "reg" && l.k === k && eq(l.ti, v); })) out.faraCitire++;
      var w = U.num(r.tiO); if (isFinite(w) && !inLog(function (l) { return l.m === "tio" && l.k === k && eq(l.v, w); })) out.faraCitire++;
    });
    REG_CONS.forEach(function (k) { var r = (t.t13 || {})[k] || {}, m = U.num(r.m); if (isFinite(m) && !inLog(function (l) { return l.m === "cons" && l.k === k && eq(l.mg, m); })) out.faraCitire++; });
    ["timax", "ncut", "nres", "dur"].forEach(function (k) { var v = U.num(((t.t14 || {})[k] || {}).v); if (isFinite(v) && !inLog(function (l) { return l.m === "tr" && l.k === k && eq(l.v, v); })) out.faraCitire++; });
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "q_s [mg/ms]", valoare: isFinite(o.qs) ? Math.round(o.qs * 1000) / 1000 : null };
    var tol = { q1: [0.01, 0.005], q2: [0.02, 0.01], q3: [0.01, 0.005], q4: [0.01, 0.05] };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    if (isFinite(o.qs) && Math.abs(o.qs - pr.qs) > 0.08 * pr.qs) out.motive.push("debitul injectorului rezultat (" + o.qs.toFixed(2) + " mg/ms) diferă mult de cel real – verificați măsurările de consum");
    return out;
  }
  return { REG: REG, CHEI_REG: CHEI_REG, REG_CONS: REG_CONS, MINUTE: MINUTE, NCIL: NCIL, parametri: parametri, ev: ev, tmort: tmort, ubat: ubat, maer: maer, kECT: kECT, ralanti: ralanti, presiune: presiune,
    minj: minj, ti: ti, tiReg: tiReg, consum: consum, temperatura: temperatura, tiMax: tiMax, decel: decel, regresie: regresie, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();


/* ---- saa/l2/model.js ---- */
/* SAA – Lucrarea 2. Modelarea duratei de injecție pe baza debitului de aer (speed-density) – aplicație virtuală.
   Fișa individuală a postului de lucru (măsurătorile de pe standul 1.4 MPI, ca la lucrarea 1) se generează din modelul
   lucrării 1 cu seed-ul studentului; modelul de calcul al aplicației și verificarea sunt folosite identic pe server. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l2"] = (function () {
  var R = 287, VS = 3.475e-4, TA = 300, L0 = 14.7, UREF = 13.9;
  var CHEI = ["ral", "n1500", "n2000", "n2500", "n3000"];
  var ET = { ral: "ralanti", n1500: "1500", n2000: "2000", n2500: "2500", n3000: "3000" };
  var SENS = { U12: { et: "U<sub>bat</sub> = 12 V", U: 12, Ta: TA }, U145: { et: "U<sub>bat</sub> = 14,5 V", U: 14.5, Ta: TA }, T10: { et: "T<sub>a</sub> = 10 °C (283 K)", U: UREF, Ta: 283 }, T50: { et: "T<sub>a</sub> = 50 °C (323 K)", U: UREF, Ta: 323 } };
  var CHEI_SENS = ["U12", "U145", "T10", "T50"];
  var COMB = { benzina: { et: "Benzină (E5)", L0: 14.7 }, e10: { et: "Benzină E10", L0: 14.1 }, e85: { et: "Etanol E85", L0: 9.8 }, gpl: { et: "GPL (lichid)", L0: 15.5 } };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function L1() { return MODELE["saa-l1"]; }
  /** fișa postului: q_s și t_mort determinate la lucrarea 1 și citirile din Tabelul 1.2 (motor cald, fără consumatori) */
  function parametri(seed) {
    var m = L1(), pr = m.parametri(seed), fisa = {};
    CHEI.forEach(function (k) { fisa[k] = { n: m.REG[k].n, p: r2(m.presiune(pr, k), 1), ti: r2(m.tiReg(pr, k), 2) }; });
    return { pr: pr, qs: r2(pr.qs, 3), tm0: r2(pr.tm0, 3), fisa: fisa };
  }
  /** timpul mort la tensiunea U (legea injectorului de pe stand) */
  function tmort(P, U) { return P.tm0 * Math.pow(14 / U, 1.5); }
  /** modelul aplicației: intrări { p [kPa], n, Ta [K], ev, lam, U, L0, qs, tm0 } */
  function calcul(x) {
    var ma = x.ev * x.p * 1000 * (x.Vs ? x.Vs * 1e-6 : VS) / (R * x.Ta) * 1e6;   // [mg]; V_s în cm³
    var mc = ma / (x.lam * x.L0);
    var tm = x.tm0 * Math.pow(14 / x.U, 1.5);
    var ti = mc / x.qs + tm;
    return { ma: ma, mc: mc, tm: tm, ti: ti, dc: x.n > 0 ? ti / (120000 / x.n) * 100 : NaN };
  }
  /** η_v care anulează eroarea (inversarea relațiilor 2.1–2.3) */
  function evExact(P, k, Ta) { var f = P.fisa[k]; return (f.ti - tmort(P, UREF)) * P.qs * L0 * R * (Ta || TA) / (f.p * 1000 * VS * 1e6); }
  function intrari(P, k, ev) { var f = P.fisa[k]; return { p: f.p, n: f.n, Vs: 347.5, Ta: TA, ev: ev, lam: 1, U: UREF, L0: L0, qs: P.qs, tm0: P.tm0 }; }
  function asteptate(P) {
    var e0 = evExact(P, "ral");
    var tiE85 = calcul({ p: P.fisa.ral.p, n: 800, Vs: 347.5, Ta: TA, ev: e0, lam: 1, U: UREF, L0: 9.8, qs: P.qs, tm0: P.tm0 }).ti;
    return { q1: e0, q2: evExact(P, "n3000"), q3: tmort(P, 12) - tmort(P, 14.5), q4: tiE85 };
  }
  function verifica(d, P, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "c08" || l.m === "cadj") {
        var f = P.fisa[l.k];
        ok = !!f && ap(l.p, f.p, 0.051) && ap(l.n, f.n, 1) && ap(l.qs, P.qs, 0.0005) && ap(l.tm0, P.tm0, 0.0005) && ap(l.U, UREF, 0.001) && ap(l.Ta, TA, 0.01) && ap(l.L0, L0, 0.001) && ap(l.lam, 1, 0.0001) && ap(l.Vs, 347.5, 0.01);
        if (ok) ok = ap(l.ti, calcul(l).ti, 0.006);
        if (ok && l.m === "c08") ok = ap(l.ev, 0.8, 0.0001);
        if (ok && l.m === "cadj") ok = Math.abs(calcul(l).ti - f.ti) / f.ti <= 0.05 + 1e-9;
      } else if (l.m === "sens") {
        var s = SENS[l.k]; ok = !!s && ap(l.Vs, 347.5, 0.01) && ap(l.U, s.U, 0.001) && ap(l.Ta, s.Ta, 0.01) && ap(l.p, P.fisa.ral.p, 0.051) && ap(l.qs, P.qs, 0.0005) && ap(l.tm0, P.tm0, 0.0005) && ap(l.ti, calcul(l).ti, 0.006);
      }
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0051); };
    CHEI.forEach(function (k) {
      var r = (t.t21 || {})[k] || {};
      var a = U.num(r.ti08); if (isFinite(a) && !inLog(function (l) { return l.m === "c08" && l.k === k && eq(l.ti, a); })) out.faraCitire++;
      var b = U.num(r.tiAdj); if (isFinite(b) && !inLog(function (l) { return l.m === "cadj" && l.k === k && eq(l.ti, b); })) out.faraCitire++;
      var e = U.num(r.ev); if (isFinite(e) && !inLog(function (l) { return l.m === "cadj" && l.k === k && eq(l.ev, e, 0.00051); })) out.faraCitire++;
    });
    CHEI_SENS.forEach(function (k) { var v = U.num(((t.t22 || {})[k] || {}).ti); if (isFinite(v) && !inLog(function (l) { return l.m === "sens" && l.k === k && eq(l.ti, v); })) out.faraCitire++; });
    var a = asteptate(P), rasp = d.raspunsuri || {};
    var evR = U.num(((t.t21 || {}).ral || {}).ev);
    out.principal = { eticheta: "η_v la ralanti [–]", valoare: isFinite(evR) ? Math.round(evR * 1000) / 1000 : null };
    var tol = { q1: [0.01, 0.003], q2: [0.01, 0.003], q3: [0.03, 0.005], q4: [0.01, 0.01] };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 1000) / 1000, corect: ok };
    });
    return out;
  }
  return { R: R, VS: VS, TA: TA, L0: L0, UREF: UREF, CHEI: CHEI, ET: ET, SENS: SENS, CHEI_SENS: CHEI_SENS, COMB: COMB,
    parametri: parametri, tmort: tmort, calcul: calcul, evExact: evExact, intrari: intrari, asteptate: asteptate, verifica: verifica };
})();


/* ---- saa/l3/model.js ---- */
/* SAA – Lucrarea 3. Sistemul de injecție common-rail (standul 1.5 dCi K9K, sistem Delphi DCR cu injectoare cu electrovalvă).
   Modelul presiunii în rampă (harta presiunii cerute, eroarea staționară, comanda IMV), al răspunsului dinamic al reglajului
   (sistem de ordinul 2) și al profilului injecției multiple. Parametrii sunt individuali; același model e folosit pe server. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l3"] = (function () {
  var REG = { antr: { n: 250, p: 260 }, ral: { n: 800, p: 300 }, n1500: { n: 1500, p: 560 }, n2000: { n: 2000, p: 760 }, n2500: { n: 2500, p: 950 }, n3000: { n: 3000, p: 1130 } };
  var CHEI = ["antr", "ral", "n1500", "n2000", "n2500", "n3000"];
  var INJ = { rr: { n: 950, nr: 4 }, rc: { n: 800, nr: 3 }, n2000: { n: 2000, nr: 2 }, acc: { n: 2600, nr: 2 } };   // numărul de injecții / ciclu (calibrarea)
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      kp: r2(u(0.94, 1.06), 3), es: r2(u(-2.4, 2.4), 2), esAntr: r2(u(-14, -7), 1), imv0: r2(u(47, 53), 1), imvK: r2(u(0.021, 0.026), 4),
      wA: r2(u(11, 17), 2), zA: r2(u(0.5, 0.72), 3), wD: r2(u(6, 9), 2), zD: r2(u(0.85, 1.1), 3), pAcc: Math.round(u(1250, 1400)),
      dt: { rr: r2(u(1.6, 2.0), 2), rc: r2(u(1.3, 1.7), 2), n2000: r2(u(0.6, 0.9), 2), acc: r2(u(0.5, 0.75), 2) },
      ti: { rr: r2(u(0.55, 0.7), 2), rc: r2(u(0.42, 0.55), 2), n2000: r2(u(0.6, 0.8), 2), acc: r2(u(1.2, 1.6), 2) },
      tp: r2(u(0.18, 0.26), 2), dt2: r2(u(0.8, 1.1), 2), dpost: r2(u(1.8, 2.4), 2)
    };
  }
  function pCer(pr, k) { return Math.round(REG[k].p * pr.kp); }
  function pReal(pr, k) { return pCer(pr, k) * (1 + (k === "antr" ? pr.esAntr : pr.es) / 100); }
  function imv(pr, k) { if (k === "antr") return pr.imv0 - 33; var q = REG[k].p * REG[k].n / (1130 * 3000); return pr.imv0 - pr.imvK * 1000 * Math.sqrt(q); }
  /** răspunsul la treapta presiunii cerute: tip "acc" (ralanti → p_acc) sau "dec" (p_acc → ralanti); întoarce valorile caracteristice */
  function treapta(pr, tip) {
    var p0 = tip === "acc" ? pReal(pr, "ral") : pr.pAcc * (1 + pr.es / 100), pf = tip === "acc" ? pr.pAcc : pCer(pr, "ral");
    var ps = pf * (1 + pr.es / 100), w = tip === "acc" ? pr.wA : pr.wD, z = tip === "acc" ? pr.zA : pr.zD;
    var p = p0, v = 0, h = 0.0005, t = 0, ext = p0, tr = NaN, sus = ps > p0;
    for (var i = 0; i < 6000; i++) {
      var a = w * w * (ps - p) - 2 * z * w * v; v += a * h; p += v * h; t += h;
      if (sus ? p > ext : p < ext) ext = p;
      if (isNaN(tr) && (sus ? p >= p0 + 0.9 * (ps - p0) : p <= p0 + 0.9 * (ps - p0))) tr = t;
    }
    return { p0: p0, pf: pf, ps: ps, pext: ext, tr: tr, sigma: (ext - pf) / pf * 100 * (sus ? 1 : -1), es: pr.es };
  }
  function dphi(n, dt) { return 6e-3 * n * dt; }
  function asteptate(pr) { var a = treapta(pr, "acc"); return { q1: dphi(INJ.n2000.n, pr.dt.n2000), q2: a.sigma, q3: a.tr, q4: pr.es }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "stat") { var pc = pCer(pr, l.reg); ok = ap(l.pc, pc, pc * 0.03 + 3) && ap(l.pr, pReal(pr, l.reg), pc * 0.03 + 5) && ap(l.imv, imv(pr, l.reg), 2.5); }
      else if (l.m === "dyn") { var s = treapta(pr, l.tip); ok = ap(l.pmax, s.pext, s.pf * 0.03 + 5) && ap(l.tr, s.tr, s.tr * 0.3 + 0.05); }
      else if (l.m === "dt") ok = ap(l.v, pr.dt[l.reg], 0.1);
      else if (l.m === "ti") ok = ap(l.v, pr.ti[l.reg], 0.1);
      if (!ok) out.incompatibile++;
    });
    var inLog = function (f) { return log.some(f); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.51); };
    CHEI.forEach(function (k) { var r = (t.t31 || {})[k] || {}, v = U.num(r.pr); if (isFinite(v) && !inLog(function (l) { return l.m === "stat" && l.reg === k && eq(l.pr, v, 0.6); })) out.faraCitire++; });
    ["acc", "dec"].forEach(function (k) { var v = U.num((((t.t32 || {})[k]) || {}).tr); if (isFinite(v) && !inLog(function (l) { return l.m === "dyn" && l.tip === k && eq(l.tr, v, 0.006); })) out.faraCitire++; });
    Object.keys(INJ).forEach(function (k) { var r = (t.t33 || {})[k] || {}, v = U.num(r.dt), w = U.num(r.ti);
      if (isFinite(v) && !inLog(function (l) { return l.m === "dt" && l.reg === k && eq(l.v, v, 0.006); })) out.faraCitire++;
      if (isFinite(w) && !inLog(function (l) { return l.m === "ti" && l.reg === k && eq(l.v, w, 0.006); })) out.faraCitire++; });
    var a = asteptate(pr), rasp = d.raspunsuri || {};
    var tol = { q1: [0.08, 0.3], q2: [0, 1.5], q3: [0.25, 0.04], q4: [0, 0.8] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: Math.round(a[k] * 1000) / 1000, corect: ok };
    });
    var s = U.num(((t.t32 || {}).acc || {}).tr);
    out.principal = { eticheta: "t_r accelerare [s]", valoare: isFinite(s) ? s : null };
    return out;
  }
  return { REG: REG, CHEI: CHEI, INJ: INJ, parametri: parametri, pCer: pCer, pReal: pReal, imv: imv, treapta: treapta, dphi: dphi, asteptate: asteptate, verifica: verifica };
})();


/* ---- saa/l4/model.js ---- */
/* SAA – Lucrarea 4. Sistemul de ungere – caracteristica presiunii uleiului (standul K7J 1.4 MPI, pompă cu roți dințate, ulei 5W-30).
   Modelul: pompa volumetrică (debit ∝ turație, scăpări interne care cresc la cald), rezistența hidraulică a lagărelor proporțională
   cu vâscozitatea la o putere subunitară, supapa de siguranță (palierul de presiune), vâscozitatea uleiului după relația Walther,
   manocontactul de presiune. Parametrii sunt individuali; același model este folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l4"] = (function () {
  var TEMP = [40, 60, 80, 90], TURATII = ["ral", "n1500", "n2000", "n2500", "n3000", "n3500"];
  var NREG = { n1500: 1500, n2000: 2000, n2500: 2500, n3000: 3000, n3500: 3500 };
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      a90: r2(u(0.5, 0.7), 3), b90: r2(u(0.74, 0.9), 3), m: r2(u(0.31, 0.36), 3), pRel: r2(u(4.4, 4.9), 2), nRal: Math.round(u(780, 830)),
      nu40: r2(u(58, 68), 1), nu100: r2(u(10.0, 11.5), 2), pSw: r2(u(0.3, 0.5), 2), rSw: r2(u(0.3, 0.9), 2), T0: r2(u(22, 26), 1)
    };
  }
  /** vâscozitatea cinematică [mm²/s] la T [°C] – relația Walther prin ν40 și ν100 */
  function niu(pr, T) {
    var W = function (v) { return Math.log10(Math.log10(v + 0.7)); }, L = function (t) { return Math.log10(t + 273.15); };
    var B = (W(pr.nu40) - W(pr.nu100)) / (L(40) - L(100)), A = W(pr.nu40) - B * L(40);
    return Math.pow(10, Math.pow(10, A + B * L(T))) - 0.7;
  }
  function nr(pr, k) { return k === "ral" ? pr.nRal : NREG[k]; }
  /** presiunea uleiului [bar] la turația n [rot/min] și temperatura T [°C]; defect – scenariu demonstrativ */
  function presiune(pr, n, T, defect) {
    if (n < 50) return 0;
    var mu = Math.pow(niu(pr, T) / niu(pr, 90), pr.m), a = pr.a90, b = pr.b90, rel = pr.pRel;
    if (defect === "lagare") { b *= T > 70 ? 0.62 : 0.85; a *= 0.6; }
    if (defect === "diluat") mu *= 0.72;
    if (defect === "supapa") rel = 2.2;
    var lin = (a + b * n / 1000) * mu - (T > 60 ? 0.12 * (T - 60) / 30 : 0) * (1 - Math.min(1, n / 2500));   // scăpările pompei la cald, la turație mică
    lin = Math.max(0.05, lin);
    var k = 8;   // trecerea netedă spre palierul supapei de siguranță
    return -Math.log(Math.exp(-k * lin) + Math.exp(-k * rel)) / k;
  }
  /** încălzirea uleiului [°C/s] la turația n (motorul pornit) */
  function incalzire(n, T) { return 0.07 * (n / 1000 + 0.35) * Math.max(0, 96 - T) / 56; }
  /** prelucrarea tabelului 4.1 (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t41 || {}, o = { panta: {}, nDesch: NaN };
    var nRal = n(date.nRal);
    var puncte = function (rd) { var r = T1[rd] || {}; return TURATII.map(function (k) { return [k === "ral" ? nRal : NREG[k], n(r[k])]; }).filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); }); };
    TEMP.forEach(function (T) {
      var pts = puncte("t" + T), lin = [];
      // zona liniară: punctele înainte de palier (creșterea între două trepte > 40 % din creșterea inițială)
      for (var i = 0; i < pts.length; i++) { if (i >= 2) { var s0 = (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]), si = (pts[i][1] - pts[i - 1][1]) / (pts[i][0] - pts[i - 1][0]); if (si < 0.4 * s0) break; } lin.push(pts[i]); }
      var rg = lin.length >= 2 ? U.regresie(lin.map(function (p) { return p[0] / 1000; }), lin.map(function (p) { return p[1]; })) : null;
      o.panta[T] = rg ? rg.b : NaN; o["rg" + T] = rg; o["lin" + T] = lin.length; o["pts" + T] = pts;
      if (T === 40 && rg && lin.length < pts.length) { var pal = pts[pts.length - 1][1]; o.palier = pal; o.nDesch = (pal - rg.a) / rg.b * 1000; }
    });
    var p2000 = function (T) { return n((T1["t" + T] || {}).n2000); };
    o.raport = p2000(40) / p2000(90);
    o.pRal90 = n((T1.t90 || {}).ral);
    return o;
  }
  function asteptate(o) { return { q1: o.panta[90], q2: o.pRal90, q3: o.nDesch, q4: o.raport }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, date = d.date || {};
    log.forEach(function (l) {
      if (l.m === "p") { if (Math.abs(Number(l.p) - presiune(pr, Number(l.n), Number(l.T), "")) > 0.08 + 0.02 * Number(l.p)) out.incompatibile++; }
      if (l.m === "sw") { var ok = l.st === "oprit" ? Math.abs(Number(l.R) - pr.rSw) <= 0.06 : String(l.R) === "OL"; if (!ok) out.incompatibile++; }
    });
    if (Number(date.nRal) !== pr.nRal) { out.incompatibile++; out.motive.push("turația de ralanti diferă de cea a motorului propriu"); }
    TEMP.forEach(function (T) {
      TURATII.forEach(function (k) {
        var v = U.num(((t.t41 || {})["t" + T] || {})[k]);
        if (isFinite(v) && !log.some(function (l) { return l.m === "p" && l.k === k && Math.abs(Number(l.T) - T) <= 2.5 && Math.abs(Number(l.p) - v) < 0.006; })) out.faraCitire++;
      });
    });
    var o = prelucreaza(t, date, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.02, 0.01], q2: [0, 0.02], q3: [0.03, 20], q4: [0.02, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    out.principal = { eticheta: "panta la 90 °C [bar/1000 rot/min]", valoare: isFinite(o.panta[90]) ? Math.round(o.panta[90] * 1000) / 1000 : "" };
    return out;
  }
  return { TEMP: TEMP, TURATII: TURATII, NREG: NREG, parametri: parametri, niu: niu, nr: nr, presiune: presiune, incalzire: incalzire,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();


/* ---- saa/l5/model.js ---- */
/* SAA – Lucrarea 5. Sistemul de răcire și managementul termic (standul K7J 1.4 MPI, lichid G12 50 % glicol).
   Modelul: termostatul cu element de ceară (început de deschidere T0, cursă liniară până la T0 + ΔT, cursa nominală),
   încălzirea motorului la ralanti pe stand – două mase termice (motorul cu lichidul din el și radiatorul), debitul pompei împărțit
   între circuitul mic și radiator după deschiderea termostatului, radiatorul fără aer de înaintare (convecție naturală) sau cu
   electroventilatorul cuplat cu histerezis, testul de etanșeitate și bușonul. Parametrii sunt individuali; același model este
   folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l5"] = (function () {
  var TAPA = [80, 84, 86, 88, 90, 94, 98, 100], TMIN = [0, 2, 4, 6, 8, 10, 12, 14], DT = 0.5, TFIN = 20 * 60;
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var T0m = [83, 86, 89][Math.floor(r() * 3)];
    return {
      T0m: T0m, T0: r2(T0m + u(-1.6, 1.6), 2), dT: r2(u(12, 15), 2), smax: r2(u(7.6, 9.4), 2),
      Ton: r2(u(98, 101), 1), hist: r2(u(4, 6), 1), Pin: r2(u(2.9, 3.3), 3), Cm: r2(u(15, 18), 2), Ta: r2(u(20, 24), 1),
      UAoff: r2(u(0.018, 0.024), 4), UAon: r2(u(0.15, 0.19), 3), pCap: r2(u(1.2, 1.45), 2), scurg: r2(u(0.004, 0.02), 3)
    };
  }
  var CP = 3.5, MD = 0.22, CR = 3.0, UAM = 0.008, BLEED = 0.005, TAUW = 25;
  /** cursa termostatului la echilibru [mm] la temperatura apei T [°C] */
  function cursa(pr, T) { return pr.smax * Math.max(0, Math.min(1, (T - pr.T0) / pr.dT)); }
  /** simularea încălzirii la ralanti de la rece (pas 0,5 s, 20 min); defect: "" | "deschis" | "inchis" | "ventilator" | "colmatat" */
  var cache = {};
  function incalzire(pr, defect) {
    defect = defect || "";
    var k = JSON.stringify(pr) + "|" + defect; if (cache[k]) return cache[k];
    var Tm = pr.Ta, Tr = pr.Ta, x = defect === "deschis" ? 1 : 0, fan = 0, Ton = pr.Ton, Toff = pr.Ton - pr.hist;
    var o = { Tm: [], Tr: [], x: [], fan: [] }, n = Math.round(TFIN / DT);
    for (var i = 0; i <= n; i++) {
      if (i % 2 === 0) { o.Tm.push(Tm); o.Tr.push(Tr); o.x.push(x); o.fan.push(fan); }
      var xT = defect === "deschis" ? 1 : defect === "inchis" ? 0 : Math.max(0, Math.min(1, (Tm - pr.T0) / pr.dT));
      x += (xT - x) * DT / TAUW;
      if (defect !== "ventilator") { if (Tm >= Ton) fan = 1; else if (Tm <= Toff) fan = 0; }
      var md = MD * (BLEED + (1 - BLEED) * x), UA = (fan ? pr.UAon : pr.UAoff) * (defect === "colmatat" ? 0.5 : 1);
      var q = md * CP * (Tm - Tr);
      Tm += (pr.Pin - q - UAM * (Tm - pr.Ta)) / pr.Cm * DT;
      Tr += (q - UA * (Tr - pr.Ta)) / CR * DT;
      if (Tm > 126) Tm = 126;   // fierbere: presiunea depășește deschiderea bușonului, lichidul se pierde prin vasul de expansiune
    }
    cache[k] = o; return o;
  }
  /** starea la momentul t [s] (interpolare la 1 s): Tm, Tr, x, fan */
  function stare(pr, t, defect) {
    var o = incalzire(pr, defect), i = Math.max(0, Math.min(o.Tm.length - 2, Math.floor(t))), f = Math.max(0, Math.min(1, t - i));
    return { Tm: o.Tm[i] + (o.Tm[i + 1] - o.Tm[i]) * f, Tr: o.Tr[i] + (o.Tr[i + 1] - o.Tr[i]) * f, x: o.x[i] + (o.x[i + 1] - o.x[i]) * f, fan: o.fan[f < 0.5 ? i : i + 1] };
  }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = (t.t51 || {}).s || {}, T2 = t.t52 || {}, T3 = t.t53 || {}, o = {};
    var pts = TAPA.map(function (T) { return [T, n(T1["a" + T])]; }).filter(function (p) { return isFinite(p[1]); });
    o.smax = pts.length ? Math.max.apply(null, pts.map(function (p) { return p[1]; })) : NaN;
    var lin = pts.filter(function (p) { return p[1] > 0.05 && p[1] < 0.97 * o.smax; });
    var rg = lin.length >= 2 ? U.regresie(lin.map(function (p) { return p[0]; }), lin.map(function (p) { return p[1]; })) : null;
    o.rg = rg; o.T0 = rg && rg.b ? -rg.a / rg.b : NaN; o.panta = rg ? rg.b : NaN; o.pts = pts;
    var tm = function (m) { return n((T2.tm || {})["m" + m]); }, tr = function (m) { return n((T2.tr || {})["m" + m]); };
    o.vInc = (tm(4) - tm(0)) / 4;
    o.dTrad = tm(14) - tr(14);
    o.hist = n((T3.ton || {}).v) - n((T3.toff || {}).v);
    o.scurg = (n((T3.p0 || {}).v) - n((T3.p2 || {}).v)) / 2;
    return o;
  }
  function asteptate(o) { return { q1: o.T0, q2: o.vInc, q3: o.hist, q4: o.dTrad }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, sim = incalzire(pr, "");
    log.forEach(function (l) {
      if (l.m === "s") { if (Math.abs(Number(l.s) - cursa(pr, Number(l.T))) > 0.09) out.incompatibile++; }
      if (l.m === "t") { var st = stare(pr, Number(l.ts), ""); if (Math.abs(Number(l.Tm) - Math.round(st.Tm)) > 1 || Math.abs(Number(l.Tr) - st.Tr) > 0.8) out.incompatibile++;
        var a = stare(pr, Number(l.ts) - 3, "").fan, b = stare(pr, Number(l.ts) + 3, "").fan; if (Number(l.v) !== st.fan && a === b) out.incompatibile++; }
      if (l.m === "v") { var ref = l.ev === "on" ? pr.Ton : pr.Ton - pr.hist; if (Math.abs(Number(l.T) - ref) > 1.01) out.incompatibile++; }
      if (l.m === "p") { if (l.k === "cap" && Math.abs(Number(l.v) - pr.pCap) > 0.03) out.incompatibile++; }
    });
    var areCit = function (fn) { return log.some(fn); };
    var T1 = (t.t51 || {}).s || {};
    TAPA.forEach(function (T) { var v = U.num(T1["a" + T]); if (isFinite(v) && !areCit(function (l) { return l.m === "s" && Math.abs(Number(l.T) - T) <= 0.35 && Math.abs(Number(l.s) - v) < 0.006; })) out.faraCitire++; });
    var T2 = t.t52 || {};
    TMIN.forEach(function (m) { ["tm", "tr", "v"].forEach(function (r) { var v = U.num((T2[r] || {})["m" + m]); if (isFinite(v) && !areCit(function (l) { return l.m === "t" && Math.abs(Number(l.ts) - m * 60) <= 15 && Math.abs(Number(l[r === "tm" ? "Tm" : r === "tr" ? "Tr" : "v"]) - v) < 0.06; })) out.faraCitire++; }); });
    var T3 = t.t53 || {};
    [["ton", "v", "on"], ["toff", "v", "off"]].forEach(function (z) { var v = U.num((T3[z[0]] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "v" && l.ev === z[2] && Math.abs(Number(l.T) - v) < 0.06; })) out.faraCitire++; });
    ["p0", "p2", "cap"].forEach(function (k) { var v = U.num((T3[k] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "p" && l.k === k && Math.abs(Number(l.v) - v) < 0.006; })) out.faraCitire++; });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.3], q2: [0.02, 0.1], q3: [0, 0.1], q4: [0, 0.3] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok };
    });
    out.principal = { eticheta: "T0 termostat [°C]", valoare: isFinite(o.T0) ? Math.round(o.T0 * 10) / 10 : "" };
    return out;
  }
  return { TAPA: TAPA, TMIN: TMIN, parametri: parametri, cursa: cursa, incalzire: incalzire, stare: stare, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
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
       <div style="font-size:16px;color:#555">valabil ${h1}:00–${h1 + ORE_SLOT}:00</div>
     </div>`).setWidth(680).setHeight(330);
  ui.showModalDialog(html, "Cod de sesiune");
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
