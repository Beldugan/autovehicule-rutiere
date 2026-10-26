/* SAA – Lucrarea 8. Sistemul de climatizare și pompa de căldură – determinarea parametrilor de funcționare.
   Modelul: instalația cu supapă de destindere termostatică (TXV) pe stand; temperaturile de vaporizare și de condensare în funcție de
   temperatura mediului, turația compresorului și treapta ventilatorului habitaclului; supraîncălzirea și subrăcirea; temperatura aerului
   la guri; presiunile din tabelul de saturație al îndrumarului (Tabelul 8.2, interpolare liniară, presiuni absolute; manometrele
   indică presiunea relativă = absolută − 1,01 bar). Fiecare student are agentul frigorific, condițiile ambiante, instalația proprie și o
   stare ascunsă de diagnosticat (încărcare corectă / insuficientă cu scurgere / supraîncărcare / condensator colmatat / compresor uzat /
   TXV obturată). Același model este folosit pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["saa-l8"] = (function () {
  var TS = [-10, 0, 5, 10, 30, 40, 50, 60], PS = { R134a: [2.0, 2.9, 3.5, 4.1, 7.7, 10.2, 13.2, 16.8], R1234yf: [2.2, 3.2, 3.7, 4.4, 7.8, 10.2, 13.0, 16.4] }, PATM = 1.01;
  var REG = [["st", "static (motor oprit)"], ["n2000", "2000 rot/min, ventilator max."], ["ral", "ralanti, ventilator max."], ["vmin", "ralanti, ventilator min."]];
  var DEF = { ok: "Instalație în stare bună (încărcare corectă)", sub: "Încărcare insuficientă – scurgere", supra: "Supraîncărcare cu agent frigorific", cond: "Condensator colmatat / ventilatorul condensatorului defect",
    comp: "Compresor uzat / supapa de control a compresorului", txv: "Supapă de destindere sau filtru obturat (umiditate înghețată)" };
  var CHEI = ["ok", "sub", "supra", "cond", "comp", "txv"], LOC = ["nicio scurgere", "racordul L", "racordul H", "compresorul (garnitura arborelui)", "condensatorul"];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  /** presiunea absolută de saturație [bar] la T [°C] – interpolare (extrapolare) liniară în Tabelul 8.2 */
  function psat(ag, T) { var P = PS[ag], i = 0; while (i < TS.length - 2 && T > TS[i + 1]) i++; return P[i] + (P[i + 1] - P[i]) * (T - TS[i]) / (TS[i + 1] - TS[i]); }
  /** temperatura de saturație [°C] la presiunea absolută p [bar] */
  function tsat(ag, p) { var P = PS[ag], i = 0; while (i < P.length - 2 && p > P[i + 1]) i++; return TS[i] + (TS[i + 1] - TS[i]) * (p - P[i]) / (P[i + 1] - P[i]); }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var ag = r() < 0.72 ? "R1234yf" : "R134a", def = CHEI[Math.floor(r() * CHEI.length) % CHEI.length];
    return { ag: ag, def: def, loc: def === "sub" ? 1 + Math.floor(r() * 4) % 4 : 0, Ta: r2(u(24, 33), 1), RH: Math.round(u(38, 62)), dTin: r2(u(1, 3), 1),
      dEv: r2(u(-1, 1), 2), dCd: r2(u(-1, 1.5), 2), SH: r2(u(4, 6.5), 2), SC: r2(u(6, 9.5), 2), dG: r2(u(3.8, 5.2), 2), masa: [420, 450, 480, 500, 530][Math.floor(r() * 5) % 5] };
  }
  var ADJ = { ok: [0, 0, 0, 0, 0], sub: [-5, -5, 13, 1.5, 11], supra: [2, 9, -2, 9, 2], cond: [3, 15, 0, 1, 4], comp: [9, -11, -1, -4, 3], txv: [-13, -4, 18, 1, 20] };
  /** starea de echilibru la regimul k; def = defectul (implicit cel al studentului) */
  function regim(pr, k, def) {
    def = def || pr.def; var Ta = pr.Ta, Tin = Ta + pr.dTin;
    if (k === "st") { var p = psat(pr.ag, Ta) - PATM; return { pJP: r2(p, 1), pIP: r2(p, 1), Tlic: r2(Ta, 1), Tasp: r2(Ta, 1), Tgura: r2(Tin, 1), Tin: r2(Tin, 1), Tev: Ta, Tcd: Ta }; }
    var a = ADJ[def], Tev = 2 + pr.dEv + (Ta - 28) * 0.15 + a[0], Tcd = Ta + 17 + pr.dCd + a[1], SH = Math.max(1.5, pr.SH + a[2]), SC = def === "sub" ? 1.5 : Math.max(1, pr.SC + a[3]), Tg = Tev + pr.dG + a[4];
    if (k === "ral") { Tev += 3.5; Tcd -= 1; SH += 1; Tg += 3; }
    if (k === "vmin") { Tev += 0.5; Tcd -= 1.5; SH = Math.max(1.5, SH - 1.5); Tg = Tev + pr.dG * 0.55 + a[4] * 0.8; }
    var pJP = psat(pr.ag, Tev) - PATM, pIP = psat(pr.ag, Tcd) - PATM;
    return { pJP: r2(Math.round(pJP * 20) / 20, 2), pIP: r2(pIP, 1), Tlic: r2(Tcd - SC, 1), Tasp: r2(Tev + SH, 1), Tgura: r2(Tg, 1), Tin: r2(Tin, 1), Tev: Tev, Tcd: Tcd };
  }
  /** detectorul de scurgeri în punctul j (1…4): true dacă acolo este scurgerea */
  function scurgere(pr, j) { return pr.def === "sub" && pr.loc === j; }
  function eticheta(pr) { return DEF[pr.def]; }
  function optiuniDiag() { return CHEI.map(function (k) { return DEF[k]; }); }
  /** prelucrarea tabelelor (identică în aplicație și pe server); agentul este cel înregistrat în Tabelul 8.4 */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t81 || {}, ag = ((t.t84 || {}).ag || {}).v, o = { rand: {}, ag: ag };
    if (!PS[ag]) return o;
    REG.forEach(function (z) { var R = T1[z[0]] || {}, pj = n(R.pJP), pi = n(R.pIP), tj = tsat(ag, pj + PATM), ti = tsat(ag, pi + PATM);
      o.rand[z[0]] = { TsJP: tj, TsIP: ti, SH: n(R.Tasp) - tj, SC: ti - n(R.Tlic), dAer: n(((t.t84 || {}).tin || {}).v) - n(R.Tgura) }; });
    return o;
  }
  function asteptate(o) { var s = o.rand.n2000 || {}; return { q1: s.SH, q2: s.SC, q3: s.TsIP, q4: s.dAer }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {}, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.006); };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "r") { var R = regim(pr, l.k); ok = ["pJP", "pIP", "Tlic", "Tasp", "Tgura"].every(function (k) { return eq(l[k], R[k], k.charAt(0) === "p" ? 0.051 : 0.051); }); }
      else if (l.m === "amb") ok = eq(l.Ta, pr.Ta, 0.051) && eq(l.RH, pr.RH, 0.5) && eq(l.Tin, r2(pr.Ta + pr.dTin, 1), 0.051);
      else if (l.m === "leak") ok = (l.v === "Da") === scurgere(pr, Number(l.j));
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, T1 = t.t81 || {};
    REG.forEach(function (z) { var R = T1[z[0]] || {}; ["pJP", "pIP", "Tlic", "Tasp", "Tgura"].forEach(function (k) { var v = U.num(R[k]); if (isFinite(v) && !areCit(function (l) { return l.m === "r" && l.k === z[0] && eq(l[k], v, 0.006); })) out.faraCitire++; }); });
    var T4 = t.t84 || {}; [["ta", "Ta"], ["rh", "RH"], ["tin", "Tin"]].forEach(function (z) { var v = U.num((T4[z[0]] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "amb" && eq(l[z[1]], v, 0.06); })) out.faraCitire++; });
    var ag = (T4.ag || {}).v; if (ag && ag !== pr.ag) out.motive.push("Tabelul 8.4: agentul frigorific nu corespunde etichetei instalației");
    var sc = (T4.scurg || {}).v; if (sc && sc !== LOC[pr.def === "sub" ? pr.loc : 0]) out.motive.push("Tabelul 8.4: locul scurgerii nu corespunde verificării cu detectorul");
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.3], q2: [0, 0.3], q3: [0, 0.3], q4: [0, 0.2] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 10) / 10 : "—", corect: ok };
    });
    var dg = ((T4.cauza || {}).v) || "", okD = dg === eticheta(pr); if (okD) out.corecte++;
    out.detalii.defect = { raspuns: dg, asteptat: eticheta(pr), corect: okD };
    out.principal = { eticheta: "diagnostic corect", valoare: okD ? "DA" : "NU" };
    return out;
  }
  return { TS: TS, PS: PS, PATM: PATM, REG: REG, DEF: DEF, CHEI: CHEI, LOC: LOC, psat: psat, tsat: tsat, parametri: parametri, regim: regim, scurgere: scurgere, eticheta: eticheta, optiuniDiag: optiuniDiag,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
