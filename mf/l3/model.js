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
    var inLog = function (F, srv, col, v) { return log.some(function (l) { return Math.abs(Number(l.Fp) - F) <= 3 && (!!l.servo) === srv && Math.abs(Number(col === "p" ? l.p1 : l.Fc) - v) < 0.051; }); };
    [["t31", false], ["t32", true]].forEach(function (x) {
      Object.keys(t[x[0]] || {}).forEach(function (F) {
        ["p", "Fc"].forEach(function (c) { var v = U.num(t[x[0]][F][c]); if (isFinite(v) && !inLog(Number(F), x[1], c, v)) out.faraCitire++; });
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
