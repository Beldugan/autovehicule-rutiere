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
