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
  realizate: { "mf-l1": "mf/l1/", "mf-l2": "mf/l2/", "mf-l3": "mf/l3/", "da-l1": "da/l1/", "da-l2": "da/l2/", "saa-l1": "saa/l1/" }
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
