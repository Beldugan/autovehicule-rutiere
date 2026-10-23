/* DA – Lucrarea 1. Diagnoza computerizată și rețeaua de date CAN (automobilul didactic).
   Modelul rețelei, al codurilor de defect și al măsurărilor; folosit identic în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l1"] = (function () {
  var FBIT = 500000, NBITI = 125, RX = 120;                     // 500 kbit/s; ≈ 125 biți pe cadru standard cu 8 octeți
  var MODULE = [
    { k: "ecm", nume: "ECM – motor", prot: "UDS / CAN 500 kbit/s", pt: true },
    { k: "tcu", nume: "TCU – cutie de viteze automatizată", prot: "UDS / CAN 500 kbit/s", pt: true },
    { k: "esp", nume: "ESP – ABS / controlul stabilității", prot: "UDS / CAN 500 kbit/s", pt: true },
    { k: "eps", nume: "EPS – servodirecție electrică", prot: "UDS / CAN 500 kbit/s", pt: true },
    { k: "srs", nume: "SRS – airbag", prot: "UDS / CAN 500 kbit/s", pt: true },
    { k: "ki", nume: "Bord / gateway", prot: "UDS / CAN 500 kbit/s", pt: true },
    { k: "sam", nume: "SAM – modul central caroserie", prot: "UDS / CAN 125 kbit/s (prin gateway)", pt: false },
    { k: "hvac", nume: "Climatizare", prot: "KWP2000 / CAN 125 kbit/s (prin gateway)", pt: false }
  ];
  var DEFECTE = {
    term_lipsa: { nume: "Rezistența de terminare din modulul ESP lipsă (întreruptă)" },
    term_supl: { nume: "Rezistență de terminare suplimentară de 120 Ω pe magistrală" },
    scurt_hl: { nume: "CAN-H în scurtcircuit cu CAN-L" },
    canl_masa: { nume: "CAN-L în scurtcircuit la masă" },
    intrerupt_esp: { nume: "Magistrala întreruptă spre modulul ESP (conector desfăcut)" },
    alim_esp: { nume: "Modulul ESP fără alimentare (siguranță arsă)" }
  };
  var CHEI_DEF = ["term_lipsa", "term_supl", "scurt_hl", "canl_masa", "intrerupt_esp", "alim_esp"];
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
    var bun = r() < 0.5;
    return {
      R1: r2(u(117, 123), 1), R2: r2(u(117, 123), 1), Ubat: r2(u(12.45, 12.75), 2),
      rec: r2(u(2.47, 2.53), 3), dH: r2(u(3.45, 3.6), 3), dL: r2(u(1.4, 1.55), 3),
      n10: ri(5, 12), n20: ri(6, 16), n100: ri(8, 20),
      I: r2(u(7.2, 9.2), 1), Rc: bun ? r2(u(0.002, 0.008), 4) : r2(u(0.03, 0.15), 3), Rfir: r2(u(0.008, 0.016), 4),
      client: c, ff: ff, catOk: r() < 0.6, codCaroserie: r() < 0.5,
      defect: CHEI_DEF[Math.floor(r() * CHEI_DEF.length) % CHEI_DEF.length]
    };
  }
  /** încărcarea magistralei [%] (1.4) */
  function incarcare(pr) { return NBITI * (pr.n10 * 100 + pr.n20 * 50 + pr.n100 * 10) / FBIT * 100; }
  function par(a, b) { return a * b / (a + b); }
  /** rezistența între pinii 6 și 14, rețeaua în repaus; d = defectul activ */
  function rezistenta(pr, d) {
    var df = d ? pr.defect : "";
    if (df === "term_lipsa" || df === "intrerupt_esp") return pr.R1;
    if (df === "term_supl") return par(par(pr.R1, pr.R2), RX);
    if (df === "scurt_hl") return 0.4;
    return par(pr.R1, pr.R2);
  }
  /** nivelurile semnalelor: recesiv / dominant pe CAN-H și CAN-L, comunicare */
  function niveluri(pr, d) {
    var df = d ? pr.defect : "";
    if (df === "scurt_hl") return { rH: 2.5, rL: 2.5, dH: 2.5, dL: 2.5, com: false };
    if (df === "canl_masa") return { rH: 0.04, rL: 0, dH: r2(pr.dH - pr.dL - 0.25, 3), dL: 0, com: true };
    if (df === "term_supl") return { rH: pr.rec, rL: pr.rec, dH: r2(pr.dH - 0.2, 3), dL: r2(pr.dL + 0.2, 3), com: true };
    if (df === "term_lipsa" || df === "intrerupt_esp") return { rH: pr.rec, rL: pr.rec, dH: r2(pr.dH + 0.1, 3), dL: r2(pr.dL - 0.1, 3), com: true };
    return { rH: pr.rec, rL: pr.rec, dH: pr.dH, dL: pr.dL, com: true };
  }
  /** tensiunile medii citite de multimetru (contact pus, magistrala activă) */
  function medii(pr, d) {
    var n = niveluri(pr, d), k = n.com ? 0.35 * incarcare(pr) / 100 : 0;
    return { H: r2(n.rH + (n.dH - n.rH) * k, 3), L: r2(n.rL + (n.dL - n.rL) * k, 3) };
  }
  /** căderea de tensiune pe siguranța ventilatorului, cu ventilatorul pornit */
  function cadere(pr) { var U0 = pr.Ubat - pr.I * (0.012 + pr.Rfir); return { U0: r2(U0, 3), Us: r2(U0 - pr.I * pr.Rc, 3), I: pr.I }; }
  /** răspunsul modulelor la scanare */
  function module(pr, d) {
    var df = d ? pr.defect : "", cs = coduri(pr, d);
    return MODULE.map(function (m) {
      var ras = !(df === "scurt_hl" || ((df === "intrerupt_esp" || df === "alim_esp") && m.k === "esp"));
      return { k: m.k, nume: m.nume, prot: m.prot, raspunde: ras, n: ras ? cs.filter(function (c) { return c.mod === m.k; }).length : null, erori: df === "canl_masa" && m.pt };
    });
  }
  function coduri(pr, d) {
    var df = d ? pr.defect : "", cl = CLIENT[pr.client], l = [];
    l.push({ mod: "ecm", cod: cl.cod, desc: cl.desc, stare: STARI[cl.stare], ff: pr.ff });
    if (pr.codCaroserie) l.push({ mod: "sam", cod: "B1342", desc: "Lampa stop stânga – circuit întrerupt (cod specific constructorului)", stare: STARI[3], ff: null });
    if (df === "intrerupt_esp" || df === "alim_esp") ["ecm", "tcu", "eps", "ki"].forEach(function (m) { l.push({ mod: m, cod: "U0121", desc: "Comunicare pierdută cu modulul ABS / ESP", stare: STARI[1], ff: null }); });
    if (df === "canl_masa") ["ecm", "esp", "ki"].forEach(function (m) { l.push({ mod: m, cod: "U0001", desc: "Magistrala CAN de mare viteză – defect de comunicare", stare: STARI[1], ff: null }); });
    if (df === "term_lipsa" || df === "term_supl") l.push({ mod: "ki", cod: "U0001", desc: "Magistrala CAN de mare viteză – defect de comunicare", stare: STARI[0], ff: null });
    return l;
  }
  function monitoare(pr) {
    return { mis: "finalizat", fuel: "finalizat", ccm: "finalizat", cat: pr.catOk ? "finalizat" : "nefinalizat", o2: pr.client === 2 ? "nefinalizat" : "finalizat", egr: "nesuportat", dpf: "nesuportat" };
  }
  /** prelucrarea tabelelor studentului */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, o = {}, t15 = t.t15 || {}, t16 = (t.t16 || {}).f || {};
    var tb = n((t15.tbit || {}).n);
    o.fbit = tb > 0 ? 1000 / tb : NaN;                                   // kbit/s, t_bit în µs
    o.udiff = n((t15.uhd || {}).n) - n((t15.uld || {}).n);
    o.Rn = n((t15.R || {}).n); o.Rd = n((t15.R || {}).d);
    o.Rsupl = o.Rn > 0 ? o.Rn * RX / (o.Rn + RX) : NaN;
    var U0 = n(t16.U0), Us = n(t16.Us), I = n(t16.I);
    o.dU = U0 - Us; o.Rc = I > 0 ? o.dU / I : NaN;
    return o;
  }
  function asteptate(o, pr) { return { q1: o.fbit, q2: incarcare(pr), q3: o.Rc, q4: o.Rsupl }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var aproape = function (a, b, tol) { return Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true, df = !!l.d;
      if (l.m === "ohm") ok = aproape(l.v, rezistenta(pr, df), Math.max(0.3, 0.015 * rezistenta(pr, df)));
      else if (l.m === "volt") { var md = medii(pr, df), e = l.p === "6" ? md.H : l.p === "14" ? md.L : NaN; if (isFinite(e)) ok = aproape(l.v, e, 0.03); }
      else if (l.m === "tbit") ok = aproape(l.v, 1e6 / FBIT, 0.06);
      else if (l.m === "dom") { var nv = niveluri(pr, df); ok = aproape(l.H, nv.dH, 0.08) && aproape(l.L, nv.dL, 0.08); }
      else if (l.m === "drop") { var c = cadere(pr); ok = aproape(l.v, c[l.k], l.k === "I" ? 0.15 : 0.006); }
      else if (l.m === "dtc") ok = coduri(pr, df).some(function (c) { return c.cod === l.cod && c.mod === l.mod; });
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
    // monitoarele de pregătire: starea aleasă trebuie să fie cea reală
    var mo = monitoare(pr), nmg = 0;
    MON.forEach(function (k) { var v = ((t.t13 || {})[k] || {}).st; if (v && v !== mo[k]) nmg++; });
    if (nmg) { out.incompatibile += nmg; out.motive.push(nmg + " monitoare de pregătire cu altă stare decât cea afișată de tester"); }
    var o = prelucreaza(t, U), a = asteptate(o, pr), rasp = d.raspunsuri || {};
    var cauza = (((t.t17 || {}).d) || {}).cauza;
    out.principal = { eticheta: "defect identificat", valoare: cauza === DEFECTE[pr.defect].nume ? "DA" : "NU" };
    var tol = { q1: 0.01, q2: 0.02, q3: 0.03, q4: 0.01 };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k] + (k === "q3" ? 0.0006 : 0.05);
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 10000) / 10000 : "—", corect: ok };
    });
    var okDef = out.principal.valoare === "DA"; if (okDef) out.corecte++;
    out.detalii.defect = { raspuns: cauza || "", asteptat: DEFECTE[pr.defect].nume, corect: okDef };
    return out;
  }
  return { FBIT: FBIT, NBITI: NBITI, RX: RX, MODULE: MODULE, DEFECTE: DEFECTE, CHEI_DEF: CHEI_DEF, STARI: STARI, MON: MON, MON_ST: MON_ST, CLIENT: CLIENT,
    parametri: parametri, incarcare: incarcare, rezistenta: rezistenta, niveluri: niveluri, medii: medii, cadere: cadere, module: module, coduri: coduri,
    monitoare: monitoare, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
