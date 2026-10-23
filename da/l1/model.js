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
