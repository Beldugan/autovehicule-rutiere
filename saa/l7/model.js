/* SAA – Lucrarea 7. Sistemul de pornire și bilanțul energetic al sistemelor stop-start și mild-hybrid 48 V (standul 1.4 MPI).
   Modelul: bateria (tensiunea în gol, rezistența internă, CCA, capacitatea), oscilograma pornirii eșantionată la 2 ms
   (curentul prin cleștele ampermetric și tensiunea la bornele bateriei: vârful la cuplarea releului cu rotorul blocat,
   pulsațiile la fiecare compresie, antrenarea împiedicată de durată tp sau pornirea reală, când motorul pornește după tF),
   căderile de tensiune pe circuitul de plus și pe masă, curentul de reîncărcare după pornire (fără / cu consumatori)
   și scenariul individual pentru bilanțul stop-start și mild-hybrid 48 V.
   Parametrii sunt individuali; același model este folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l7"] = (function () {
  var DT = 0.002, PRE = 0.2, POST = 0.4, MOM = [0, 10, 20, 30, 60, 90, 120], ETA_INC = 0.85, ETA_REC = 0.85, UN = 12, PRAG = 5;
  var BAT = [[60, 560, "EFB"], [70, 760, "AGM"], [72, 680, "EFB"], [80, 800, "AGM"]];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function cl(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); }, alege = function (v) { return v[Math.min(v.length - 1, Math.floor(r() * v.length))]; };
    var b = alege(BAT), f = u(1.0, 1.25);
    return {
      Cn: b[0], CCAn: b[1], tip: b[2], U0: r2(u(12.55, 12.76), 2), Ri: r2(3200 / b[1] * f, 2),
      Rp: r2(u(0.55, 1.25), 2), Rm: r2(u(0.35, 0.85), 2),
      Ipk: Math.round(u(480, 640)), Iantr: Math.round(u(150, 205)), a: r2(u(0.22, 0.32), 3), ncr: Math.round(u(190, 250)), tF: r2(u(0.75, 1.15), 2),
      I0: r2(u(38, 52), 1), Iss: r2(u(3, 6), 1), tau: Math.round(u(22, 40)), Imax: Math.round(u(52, 62)), Pst: Math.round(u(380, 460) / 10) * 10, Ureg: r2(u(14.15, 14.45), 2),
      Pc: 300 + 50 * Math.floor(r() * 7), ts: 20 + 5 * Math.floor(r() * 9), dsoc: alege([0.08, 0.1, 0.12]), Pbsg: alege([8, 10, 12]), tfr: 3 + Math.floor(r() * 4),
      seed: seed
    };
  }
  /** defect (numai în modul demonstrativ): "" | "oxid" (bornă (+) oxidată) | "masa" (masă slăbită) | "baterie" (baterie descărcată / uzată) | "demaror" (demaror cu frecări mari) */
  function efectiv(pr, defect) {
    var p = {}; for (var k in pr) p[k] = pr[k];
    if (defect === "oxid") { p.Rp = pr.Rp * 5; p.Ipk = pr.Ipk * 0.78; p.Iantr = pr.Iantr * 0.9; p.ncr = pr.ncr * 0.84; }
    else if (defect === "masa") { p.Rm = pr.Rm * 6; p.Ipk = pr.Ipk * 0.8; p.Iantr = pr.Iantr * 0.9; p.ncr = pr.ncr * 0.85; }
    else if (defect === "baterie") { p.U0 = 12.18; p.Ri = pr.Ri * 2.3; p.Ipk = pr.Ipk * 0.86; p.ncr = pr.ncr * 0.78; p.tF = pr.tF * 1.5; }
    else if (defect === "demaror") { p.Iantr = pr.Iantr * 1.38; p.Ipk = pr.Ipk * 1.05; p.ncr = pr.ncr * 0.78; p.tF = pr.tF * 1.3; }
    return p;
  }
  /** testerul de baterie (conductanță): tensiunea în gol, rezistența internă, CCA estimat și starea (SOH) */
  function tester(pr, defect) { var p = efectiv(pr, defect), cca = Math.round(3200 / p.Ri); return { U0: p.U0, Ri: p.Ri, CCA: cca, SOH: Math.min(100, Math.round(cca / p.CCAn * 100)) }; }
  function zgomot(seed, k) { var h = Math.imul((k + 1) ^ seed, 2654435761) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return ((h >>> 0) / 4294967296) - 0.5; }
  /** curentul [A] la momentul s de la punerea cheii pe START; tk = momentul eliberării cheii; tF = momentul pornirii motorului (Infinity la antrenarea împiedicată) */
  function curent(p, s, tk, tF) {
    if (s < 0) return 0;
    var i;
    if (s < 0.03) i = 35 * (1 - Math.exp(-s / 0.004));                                         // bobinele releului (atragere + menținere)
    else { var x = s - 0.03, f = p.ncr / 30;                                                       // contactele principale închise: rotor blocat, apoi t.e.m.
      i = (p.Iantr + (p.Ipk / 0.86 - p.Iantr) * Math.exp(-x / 0.07)) * (1 - Math.exp(-x / 0.006));
      if (x > 0.05) i *= 1 + p.a * Math.sin(2 * Math.PI * f * (x - 0.05)) * Math.min(1, (x - 0.05) / 0.1); }
    if (s > tF) i *= Math.exp(-(s - tF) / 0.05);                                                 // motorul a pornit: roata liberă se decuplează
    if (s > tk) i *= Math.exp(-(s - tk) / 0.03);
    return i;
  }
  /** oscilograma: f = "antr" (pornire împiedicată, cheia ținută tp secunde) sau "porn" (pornirea reală). Eșantioane la 2 ms. */
  function oscilograma(pr, f, tp, defect) {
    var p = efectiv(pr, defect), tF = f === "porn" ? p.tF : Infinity, tk = f === "porn" ? p.tF + 0.15 : tp, T = PRE + tk + POST, N = Math.round(T / DT) + 1;
    var sd = (pr.seed ^ (f === "porn" ? 0x9071 : Math.round(tp * 100) * 7919)) | 0, o = { t: [], i: [], u: [], f: f, tp: f === "porn" ? r2(tk, 2) : tp, tF: tF, tk: tk };
    for (var k = 0; k < N; k++) {
      var t = k * DT, s = t - PRE, i = curent(p, s, tk, tF), ii = i > 0.5 ? i + 2.2 * zgomot(sd, k) : 0.2 * zgomot(sd, k);
      var u = p.U0 - p.Ri * i / 1000 + (f === "porn" && s > tF + 0.25 ? Math.min(1.5, (s - tF - 0.25) * 3) : 0) + 0.012 * zgomot(sd ^ 0x3c3c, k);
      o.t.push(r2(t, 3)); o.i.push(r2(ii, 1)); o.u.push(r2(u, 2));
    }
    return o;
  }
  /** mărimile citite pe fereastra [i0, i1] (cursoarele A și B ale osciloscopului) */
  function fereastra(o, i0, i1) {
    i0 = Math.max(0, Math.min(o.i.length - 1, i0 | 0)); i1 = Math.max(0, Math.min(o.i.length - 1, i1 | 0)); if (i1 < i0) { var z = i0; i0 = i1; i1 = z; }
    var E = 0, Q = 0, si = 0, su = 0, imax = -1e9, umin = 1e9, pmax = 0, n = i1 - i0 + 1;
    for (var k = i0; k <= i1; k++) { var pk = o.u[k] * o.i[k]; E += pk * DT; Q += o.i[k] * DT; si += o.i[k]; su += o.u[k]; if (o.i[k] > imax) imax = o.i[k]; if (o.u[k] < umin) umin = o.u[k]; if (pk > pmax) pmax = pk; }
    var dt = (i1 - i0) * DT;
    return { i0: i0, i1: i1, dt: r2(dt, 3), imed: r2(si / n, 1), umed: r2(su / n, 2), imax: r2(imax, 1), umin: r2(umin, 2), E: Math.round(E), Q: r2(Q / 3.6, 1), Pmax: Math.round(pmax), Pmed: dt > 0 ? Math.round(E / dt) : NaN };
  }
  function indiciCurent(o) { var a = -1, b = -1; for (var k = 0; k < o.i.length; k++) if (o.i[k] > PRAG) { if (a < 0) a = k; b = k; } return [a, b]; }
  /** căderea de tensiune afișată de multimetru în timpul antrenării (medie): "p" – circuitul de plus (U2), "m" – circuitul de masă (U3) */
  function cadere(pr, k, defect) { var p = efectiv(pr, defect); return r2((k === "p" ? p.Rp : p.Rm) * p.Iantr / 1000, 2); }
  /** curentul de încărcare a bateriei și tensiunea la s secunde după pornire; cons = consumatorii standului porniți */
  function incarcare(pr, s, cons, defect) {
    var I = pr.Iss + (pr.I0 - pr.Iss) * Math.exp(-s / pr.tau), U = pr.Ureg - 0.35 * Math.exp(-s / 6) - 0.004 * Math.max(0, I - pr.Iss);
    if (defect === "baterie") I = I * 1.35 + 4;
    if (cons) { var lim = pr.Imax - pr.Pst / 14 - 15; if (I > lim) { U -= 0.012 * (I - lim); I = lim; } }
    return { I: r2(I, 1), U: r2(U, 2) };
  }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T0 = t.t70 || {}, T1 = (t.t71 || {}).v || {}, T2 = t.t72 || {}, T3 = t.t73 || {}, o = {};
    var g = function (T, r) { return n((T[r] || {}).v); };
    o.U0 = g(T0, "U0"); o.Ri = g(T0, "Ri"); o.CCA = g(T0, "CCA"); o.SOH = g(T0, "SOH");
    o.Ivf = n(T1.ivf); o.Iantr = n(T1.iantr); o.Uantr = n(T1.uantr); o.Umin = n(T1.umin); o.dUp = n(T1.dup); o.dUm = n(T1.dum); o.tp = n(T1.tp);
    o.Pel = o.Uantr * o.Iantr; o.Rp = o.dUp / o.Iantr * 1000; o.Rm = o.dUm / o.Iantr * 1000; o.RiOsc = (o.U0 - o.Umin) / o.Ivf * 1000;
    ["antr", "porn"].forEach(function (r) { var R = T2[r] || {}; o[r] = { E: n(R.E), Q: n(R.Q), Pmax: n(R.Pmax), Pmed: n(R.Pmed) }; });
    var f = T3.f || {}, c = T3.c || {}, u = T3.u || {};
    o.Iinc = n(f.a10); o.Uinc = n(u.a10);
    var q = 0, ok = true; for (var k = 1; k < MOM.length; k++) { var a = n(f["a" + MOM[k - 1]]), b = n(f["a" + MOM[k]]); if (!isFinite(a) || !isFinite(b)) { ok = false; break; } q += (a + b) / 2 * (MOM[k] - MOM[k - 1]); }
    o.Qinc120 = ok ? q / 3.6 : NaN;                                                                   // sarcina primită în 120 s [mAh]
    var d = function (k) { return n(date[k]); };
    // motopropulsorul ales în Tabelul 7.5: la start-stop – mărimile de pe standul de pornire; la hibride – cele măsurate pe motopropulsor (data logger, BMS)
    var R5 = (t.t75 || {}).p || {}; o.tip = cheieTip(R5.tip); var hib = o.tip !== "ss";
    o.Ep = hib ? n(R5.Erep) : o.porn.E; o.Pc = d("Pc"); o.ts = d("ts");
    var Ui = hib ? n(R5.Uinc) : o.Uinc, Ii = hib ? n(R5.Iinc) : o.Iinc, Cn = hib ? n(R5.Cn) : d("Cn"), Un = hib ? n(R5.Un) : d("Un"), ds = hib ? n(R5.dsoc) : d("dsoc"), Pr = hib ? n(R5.Prec) : d("Pbsg");
    o.bat = { Un: Un, Cn: Cn, dsoc: ds, Prec: Pr, Uinc: Ui, Iinc: Ii };
    o.Eciclu = o.Ep + o.Pc * o.ts;                                                                     // (7.5) [J]
    o.tinc = o.Eciclu / (d("etaInc") * Ui * Ii);                                                       // (7.6) [s]
    o.Nmax = ds * Cn * Un * 3600 / o.Eciclu;                                                           // (7.7)
    o.Erec = d("etaRec") * Pr * 1000 * d("tfr");                                                       // (7.8) [J]
    o.cicluri = o.Erec / o.Eciclu;
    return o;
  }
  /** motopropulsoarele pentru bilanț: datele bateriei care alimentează pornirea / recuperarea (din datele vehiculului) */
  var TIPURI = { ss: "Start-stop (12 V, demaror întărit, baterie EFB/AGM)", mh: "Mild hybrid 48 V (alternator-demaror BSG)", fh: "Full hybrid (e-CVT, MG1 + MG2, baterie HV)", phev: "Plug-in hybrid (modul P2, baterie HV reîncărcabilă din rețea)" };
  function tipuri(pr) {
    var r = mulberry32((pr.seed ^ 0x5eed) | 0), u = function (a, b) { return a + (b - a) * r(); };
    return {
      ss: { Un: UN, Cn: pr.Cn, dsoc: pr.dsoc, Prec: pr.Pbsg, Erep: null, Uinc: null, Iinc: null },
      mh: { Un: 48, Cn: [8, 10][Math.floor(r() * 2) % 2], dsoc: r2(u(0.35, 0.5), 2), Prec: pr.Pbsg, Erep: Math.round(u(1300, 2200) / 10) * 10, Uinc: 50, Iinc: Math.round(u(100, 160)) },
      fh: { Un: [201.6, 216, 259][Math.floor(r() * 3) % 3], Cn: r2(u(5.0, 6.5), 1), dsoc: r2(u(0.3, 0.4), 2), Prec: Math.round(u(45, 60)), Erep: Math.round(u(3500, 5500) / 10) * 10, Uinc: 230, Iinc: Math.round(u(40, 70)) },
      phev: { Un: [345, 355, 360][Math.floor(r() * 3) % 3], Cn: Math.round(u(32, 50)), dsoc: r2(u(0.75, 0.85), 2), Prec: Math.round(u(70, 95)), Erep: Math.round(u(2800, 4500) / 10) * 10, Uinc: 360, Iinc: Math.round(u(60, 90)) }
    };
  }
  function cheieTip(v) { if (TIPURI[v]) return v; for (var k in TIPURI) if (TIPURI[k] === v) return k; return "ss"; }
  function asteptate(o) { return { q1: o.Ep, q2: o.Rp, q3: o.tinc, q4: o.Nmax }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.006); }, cache = {};
    var osc = function (f, tp) { var k = f + "|" + tp; if (!cache[k]) cache[k] = oscilograma(pr, f, Number(tp), ""); return cache[k]; };
    var bt = tester(pr, ""), acop = {};
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "bat") ok = eq(l.U0, bt.U0, 0.006) && eq(l.Ri, bt.Ri, 0.006) && eq(l.CCA, bt.CCA, 0.5) && eq(l.SOH, bt.SOH, 0.5);
      else if (l.m === "osc") {
        var tp = Number(l.tp); if (l.f !== "porn" && !(tp >= 0.5 && tp <= 10.5)) ok = false;
        else { var o = osc(l.f, l.f === "porn" ? 0 : tp), w = fereastra(o, Number(l.i0), Number(l.i1));
          if (l.k === "ivf") ok = eq(l.v, w.imax, 0.051); else if (l.k === "umin") ok = eq(l.v, w.umin, 0.006); else if (l.k === "tp") ok = eq(l.v, w.dt, 0.0011);
          else if (l.k === "iantr") ok = eq(l.v, w.imed, 0.051) && eq(l.u, w.umed, 0.006);
          else if (l.k === "int") { ok = eq(l.E, w.E, 0.6) && eq(l.Q, w.Q, 0.051) && eq(l.Pmax, w.Pmax, 0.6) && eq(l.Pmed, w.Pmed, 0.6); var ix = indiciCurent(o); if (ok && (w.i0 > ix[0] || w.i1 < ix[1])) acop[l.f] = true; } }
      }
      else if (l.m === "du") ok = eq(l.v, cadere(pr, l.k, ""), 0.006);
      else if (l.m === "hib") { var TT = tipuri(pr)[l.tip]; ok = !!TT && l.tip !== "ss" && (l.ev === "rep" ? eq(l.Erep, TT.Erep, 0.6) && eq(l.Uinc, TT.Uinc, 0.06) && eq(l.Iinc, TT.Iinc, 0.06) && eq(l.Un, TT.Un, 0.06) && eq(l.Cn, TT.Cn, 0.06) && eq(l.dsoc, TT.dsoc, 0.006) : eq(l.Prec, TT.Prec, 0.06)); }
      else if (l.m === "inc") { var z = incarcare(pr, Number(l.s), l.k === "c", ""); ok = MOM.indexOf(Number(l.s)) >= 0 && eq(l.I, z.I, 0.051) && eq(l.U, z.U, 0.006); }
      if (!ok) out.incompatibile++;
    });
    Object.keys(acop).forEach(function (f) { out.motive.push("integrala (" + (f === "porn" ? "pornire" : "antrenare") + ") nu acoperă toată durata curentului"); });
    var are = function (fn) { return log.some(fn); }, T0 = t.t70 || {}, T1 = (t.t71 || {}).v || {}, T2 = t.t72 || {}, T3 = t.t73 || {};
    [["U0", "U0"], ["Ri", "Ri"], ["CCA", "CCA"], ["SOH", "SOH"]].forEach(function (z) { var x = U.num((T0[z[0]] || {}).v); if (isFinite(x) && !are(function (l) { return l.m === "bat" && eq(l[z[1]], x, 0.006); })) out.faraCitire++; });
    [["ivf", "v"], ["umin", "v"], ["tp", "v"], ["iantr", "v"], ["uantr", "u"]].forEach(function (z) { var x = U.num(T1[z[0]]); var k = z[0] === "uantr" ? "iantr" : z[0];
      if (isFinite(x) && !are(function (l) { return l.m === "osc" && l.f === "antr" && l.k === k && eq(l[z[1]], x, 0.006); })) out.faraCitire++; });
    [["dup", "p"], ["dum", "m"]].forEach(function (z) { var x = U.num(T1[z[0]]); if (isFinite(x) && !are(function (l) { return l.m === "du" && l.k === z[1] && eq(l.v, x, 0.006); })) out.faraCitire++; });
    ["antr", "porn"].forEach(function (f) { var R = T2[f] || {}; ["E", "Q", "Pmax", "Pmed"].forEach(function (c) { var x = U.num(R[c]); if (isFinite(x) && !are(function (l) { return l.m === "osc" && l.f === f && l.k === "int" && eq(l[c], x, 0.006); })) out.faraCitire++; }); });
    MOM.forEach(function (s) { [["f", "I", "f"], ["c", "I", "c"], ["u", "U", "f"]].forEach(function (z) { var x = U.num((T3[z[0]] || {})["a" + s]); if (isFinite(x) && !are(function (l) { return l.m === "inc" && l.k === z[2] && Number(l.s) === s && eq(l[z[1]], x, 0.006); })) out.faraCitire++; }); });
    var T5 = (t.t75 || {}).p || {}, tp5 = cheieTip(T5.tip);
    if (tp5 !== "ss") [["Erep", "rep"], ["Uinc", "rep"], ["Iinc", "rep"], ["Un", "rep"], ["Cn", "rep"], ["dsoc", "rep"], ["Prec", "rec"]].forEach(function (z) { var x = U.num(T5[z[0]]); if (isFinite(x) && !are(function (l) { return l.m === "hib" && l.tip === tp5 && l.ev === z[1] && eq(l[z[0]], x, 0.006); })) out.faraCitire++; });
    var date = { Pc: pr.Pc, ts: pr.ts, dsoc: pr.dsoc, Cn: pr.Cn, Un: UN, etaInc: ETA_INC, etaRec: ETA_REC, Pbsg: pr.Pbsg, tfr: pr.tfr };
    var o2 = prelucreaza(t, date, U), a = asteptate(o2), rasp = d.raspunsuri || {}, tol = { q1: [0.01, 2], q2: [0.02, 0.02], q3: [0.02, 0.2], q4: [0.02, 0.2] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok };
    });
    out.principal = { eticheta: "Ep la pornire [J]", valoare: isFinite(a.q1) ? Math.round(a.q1) : "" };
    return out;
  }
  return { DT: DT, PRE: PRE, MOM: MOM, ETA_INC: ETA_INC, ETA_REC: ETA_REC, UN: UN, PRAG: PRAG, parametri: parametri, efectiv: efectiv, tester: tester, curent: curent, oscilograma: oscilograma,
    TIPURI: TIPURI, tipuri: tipuri, cheieTip: cheieTip, fereastra: fereastra, indiciCurent: indiciCurent, cadere: cadere, incarcare: incarcare, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
