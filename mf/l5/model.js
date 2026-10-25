/* MF – Lucrarea 5. Regimuri de curgere. Experiența lui Reynolds.
   Modelul aparatului: rezervor cu nivel constant, tub de sticlă d ≈ 10 mm cu intrare profilată, robinet de reglare la ieșire
   (debitul în funcție de deschidere), vâscozitatea apei după temperatură (Tabelul 5.1, interpolare), tranziția cu histerezis:
   la creșterea debitului regimul laminar persistă până la Re critic superior (mai mare dacă apa s-a liniștit suficient), la
   scăderea lui redevine laminar sub Re critic inferior. Parametrii sunt individuali; același model este folosit pe server. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l5"] = (function () {
  var TNU = [[10, 1.306], [15, 1.139], [20, 1.004], [25, 0.893], [30, 0.801], [40, 0.658]];
  var ASPECT = ["linie dreaptă (laminar)", "oscilant, intermitent (tranziție)", "amestecat în toată secțiunea (turbulent)"];
  var AUTO = [
    { k: "u0", et: "Ulei în galeria principală, 0 °C", d: 8, v: 2, nu: 570 }, { k: "u20", et: "Ulei în galeria principală, 20 °C", d: 8, v: 2, nu: 166 },
    { k: "u100", et: "Ulei în galeria principală, 100 °C", d: 8, v: 2, nu: 11 }, { k: "lr", et: "Lichid de răcire (50 % glicol) în furtun, 90 °C", d: 32, v: 1.5, nu: 0.8 },
    { k: "mot", et: "Motorină în conducta de retur, 40 °C", d: 8, v: 0.5, nu: 3 }, { k: "aer", et: "Aer în tubulatura de admisie, 20 °C", d: 70, v: 30, nu: 15 }];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return { T: r2(u(14, 24), 1), d: r2(u(9.9, 10.1), 2), Qmax: r2(u(0.11, 0.14), 4), kV: r2(u(1.35, 1.7), 3), ReSup: Math.round(u(3100, 4300)), ReInf: Math.round(u(1950, 2250)), dTr: Math.round(u(600, 900)) };
  }
  /** vâscozitatea cinematică a apei [mm²/s] (interpolare în Tabelul 5.1) */
  function nu(T) {
    if (T <= TNU[0][0]) return TNU[0][1];
    for (var i = 0; i < TNU.length - 1; i++) { var a = TNU[i], b = TNU[i + 1]; if (T <= b[0]) return a[1] + (b[1] - a[1]) * (T - a[0]) / (b[0] - a[0]); }
    return TNU[TNU.length - 1][1];
  }
  /** debitul [L/s] la deschiderea a [%] a robinetului de reglare */
  function debit(pr, a) { return pr.Qmax * Math.pow(Math.max(0, Math.min(100, a)) / 100, pr.kV); }
  function viteza(pr, Q) { return Q / 1000 / (Math.PI * Math.pow(pr.d / 1000, 2) / 4); }
  function Re(pr, Q, T) { return viteza(pr, Q) * pr.d / 1000 / (nu(T == null ? pr.T : T) * 1e-6); }
  /** Re critic superior efectiv (repausul apei în rezervor înainte de experiment, t [s]) */
  function ReSupEf(pr, tRep) { return Math.round(2300 + (pr.ReSup - 2300) * Math.min(1, Math.max(0, tRep) / 300)); }
  /** starea regimului cu histerezis: anterior ∈ "laminar" | "tranzitie" | "turbulent" */
  function regim(pr, re, anterior, tRep) {
    var sup = ReSupEf(pr, tRep);
    if (anterior === "laminar" || anterior == null) { if (re < sup) return "laminar"; return re < sup + pr.dTr ? "tranzitie" : "turbulent"; }
    if (re < pr.ReInf) return "laminar";
    if (anterior === "turbulent") return re < pr.ReInf + 500 ? "tranzitie" : "turbulent";
    return re < sup + pr.dTr ? "tranzitie" : "turbulent";
  }
  /** fracțiunea turbulentă (intermitența) pentru vizualizare */
  function gamma(pr, re, st) { if (st === "laminar") return 0; if (st === "turbulent") return 1; return Math.max(0.15, Math.min(0.85, (re - pr.ReInf) / (pr.ReSup + pr.dTr - pr.ReInf))); }
  var A10 = Math.PI * 0.01 * 0.01 / 4;
  /** prelucrarea tabelelor (identică în aplicație și pe server); calculele se fac cu d = 10 mm nominal și ν(T măsurat) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, o = { rand: {}, crit: {} }, T = n(((t.t50 || {}).T || {}).v), ny = isFinite(T) ? nu(T) : NaN;
    o.T = T; o.nu = ny;
    var calc = function (r) { var V = n(r.V), tt = n(r.t), Q = V / tt / 1000, v = Q / A10; return { Q: Q * 1000, v: v, Re: v * 0.01 / (ny * 1e-6) }; };
    for (var i = 1; i <= 8; i++) o.rand["r" + i] = calc((t.t52 || {})["r" + i] || {});
    ["sus1", "sus2", "jos"].forEach(function (k) { o.crit[k] = calc((t.t52b || {})[k] || {}); });
    return o;
  }
  function asteptate(o) { return { q1: o.crit.sus1.Re, q2: o.crit.jos.Re, q3: 2 * 0.008 / 11e-6, q4: 4 * 4 * 20 / (2 * (4 + 20)) }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "T") ok = ap(l.v, pr.T, 0.15);
      else if (l.m === "q") { var Q = debit(pr, Number(l.a)), Qm = Number(l.V) / Number(l.t); ok = Math.abs(Qm - Q) <= Q * 0.06 + 0.0004 && Number(l.t) >= 5;
        var re = Re(pr, Q), st = l.st; if (st === "laminar" && re > pr.ReSup + 50) ok = false; if (st === "turbulent" && re < pr.ReInf - 50) ok = false; }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= e; };
    var T0 = U.num(((t.t50 || {}).T || {}).v); if (isFinite(T0) && !areCit(function (l) { return l.m === "T" && eq(l.v, T0, 0.051); })) out.faraCitire++;
    var nObs = 0, nOk = 0;
    for (var i = 1; i <= 8; i++) { var r = (t.t52 || {})["r" + i] || {}, V = U.num(r.V), tt = U.num(r.t);
      if (isFinite(V) && !areCit(function (l) { return l.m === "q" && l.k === "r" + i && eq(l.V, V, 0.006) && eq(l.t, tt, 0.006); })) out.faraCitire++;
      var lg = log.filter(function (l) { return l.m === "q" && l.k === "r" + i; }).pop(); if (lg && r.asp) { nObs++; if (r.asp === ASPECT[{ laminar: 0, tranzitie: 1, turbulent: 2 }[lg.st]]) nOk++; } }
    ["sus1", "sus2", "jos"].forEach(function (k) { var r = (t.t52b || {})[k] || {}, V = U.num(r.V); if (isFinite(V) && !areCit(function (l) { return l.m === "q" && l.k === k && eq(l.V, V, 0.006); })) out.faraCitire++; });
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.03, 20], q2: [0.03, 20], q3: [0.01, 5], q4: [0.01, 0.02] };
    Object.keys(a).forEach(function (k) { var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok }; });
    var okA = nObs >= 6 && nOk === nObs; if (okA) out.corecte++;
    out.detalii.aspect = { raspuns: nOk + "/" + nObs + " regimuri observate corect", asteptat: "≥ 6 determinări, toate corecte", corect: okA };
    // Tabelul 5.3 (informativ)
    var T3 = t.t53 || {}, bune = 0; AUTO.forEach(function (x) { var re = x.v * x.d / 1000 / (x.nu * 1e-6), v = U.num((T3[x.k] || {}).Re); if (isFinite(v) && Math.abs(v - re) <= re * 0.02 + 1) bune++; });
    out.detalii.auto = { raspuns: bune + "/6", asteptat: "6/6", corect: bune === 6 };
    out.principal = { eticheta: "Re critic superior", valoare: isFinite(o.crit.sus1.Re) ? Math.round(o.crit.sus1.Re) : "" };
    return out;
  }
  return { TNU: TNU, ASPECT: ASPECT, AUTO: AUTO, parametri: parametri, nu: nu, debit: debit, viteza: viteza, Re: Re, ReSupEf: ReSupEf, regim: regim, gamma: gamma, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
