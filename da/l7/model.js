/* DA – Lucrarea 7. Vehicule electrice și hibride; diagnoza pe bază de date.
   Modelul: vehiculul electric demonstrativ al fiecărui student (tipul, tensiunea nominală, numărul de grupuri de celule, energia
   nominală, vechimea și rulajul), datele BMS (SOC, energia utilizabilă, tensiunile grupurilor de celule, temperaturile, rezistența de
   izolație, bateria de 12 V), condiția READY, codurile HV, cerința Euro 7 de durabilitate și fișierul de date OBD la ralanti (600 s,
   1 Hz: STFT, MAP, tensiunea bateriei) cu accelerarea, aerul fals provocat și o eroare de achiziție. Fiecare student are vehiculul și
   fișierul propriu și un defect HV ascuns. Același model este folosit în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l7"] = (function () {
  var VEH = [{ n: "Renault Zoe ZE50", Un: 400, N: 96, E: 52.0 }, { n: "Volkswagen ID.3 Pro", Un: 400, N: 108, E: 58.0 },
    { n: "Hyundai Ioniq 5 Long Range", Un: 800, N: 192, E: 72.6 }, { n: "Kia EV6 Long Range", Un: 800, N: 192, E: 77.4 }];
  var TIPURI = {
    celula: "Grup de celule slab (dezechilibru de tensiune)", izolatie: "Rezistența de izolație HV scăzută (umiditate / componentă deteriorată)",
    soh: "Baterie degradată sub cerința Euro 7 (SOH insuficient)", b12: "Bateria de 12 V descărcată – contactoarele HV nu se închid",
    racire: "Răcirea bateriei HV defectă (dispersie mare a temperaturilor)", hvil: "Bucla de interblocare HVIL deschisă (conector HV nefixat)"
  };
  var CHEI = ["celula", "izolatie", "soh", "b12", "racire", "hvil"];
  var EXPL = ["regim stabil (fără anomalie)", "accelerare – regim tranzitoriu normal", "aer fals provocat (defect)", "eroare de achiziție (valoare izolată)"];
  function eticheta(d) { return TIPURI[d.tip] || "—"; }
  function optiuniDiag() { return CHEI.map(function (k) { return TIPURI[k]; }); }
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function cerinta(ani, km) { return ani <= 5 && km <= 100000 ? 80 : ani <= 8 && km <= 160000 ? 72 : NaN; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var tip = CHEI[Math.floor(r() * CHEI.length) % CHEI.length], vi = Math.floor(r() * VEH.length) % VEH.length, v = VEH[vi];
    var ani = 2 + Math.floor(r() * 7), km = Math.min(158000, Math.round(ani * u(11000, 19500) / 1000) * 1000), req = cerinta(ani, km);
    var soh = tip === "soh" ? r2(req - u(4, 9), 1) : r2(Math.min(97, req + u(2.5, 9)), 1);
    return {
      defect: { tip: tip, j: 1 + Math.floor(r() * v.N) }, vi: vi, ani: ani, km: km, soh: soh, soc: Math.round(u(45, 85)),
      cel0: r2(u(0.003, 0.0055), 4), dW: r2(-u(0.06, 0.095), 3), T0: r2(u(18, 26), 1), dT: r2(u(2, 4), 1), Riso: r2(u(2, 8), 2), fIso: r2(u(0.55, 0.85), 2),
      u12: r2(u(12.4, 12.75), 2), u12b: r2(u(10.9, 11.3), 2), udc: r2(u(14.1, 14.45), 2),
      dSeed: Math.floor(r() * 2147483647), sStft: r2(u(1.2, 1.8), 2), mStft: r2(u(-0.4, 0.6), 2), tAcc: Math.round(u(185, 230)), tLeak: Math.round(u(340, 420)), lvl: r2(u(9, 13), 1),
      map0: r2(u(31, 36), 1), tGl: Math.round(u(470, 560))
    };
  }
  var d_ = function (pr) { return pr.defect.tip; };
  function vehicul(pr) { return VEH[pr.vi]; }
  /** tensiunile grupurilor de celule în repaus [V] (rotunjite la 1 mV) */
  function celule(pr) {
    var v = vehicul(pr), r = mulberry32(pr.dSeed ^ 0x2545F491), U0 = 3.55 + 0.0042 * (pr.soc - 40), out = [];
    for (var j = 1; j <= v.N; j++) { var x = U0 + (r() + r() + r() - 1.5) * pr.cel0 * 1.4; if (d_(pr) === "celula" && j === pr.defect.j) x = U0 + pr.dW; out.push(r2(x, 3)); }
    return out;
  }
  function energie(pr) { return { nom: vehicul(pr).E, util: r2(vehicul(pr).E * pr.soh / 100, 1) }; }
  function temperaturi(pr) { var s = d_(pr) === "racire" ? pr.dT * 4.2 : pr.dT; return { min: pr.T0, max: r2(pr.T0 + s, 1) }; }
  function izolatie(pr) { var min = 100 * vehicul(pr).Un / 1e6; return d_(pr) === "izolatie" ? r2(min * pr.fIso, 3) : pr.Riso; }    // [MΩ]
  function u12(pr, ready) { return d_(pr) === "b12" ? pr.u12b : ready ? pr.udc : pr.u12; }
  function ready(pr) { return ["izolatie", "b12", "hvil"].indexOf(d_(pr)) < 0; }
  function coduri(pr) {
    return { celula: ["P0B3D – grupul de celule " + pr.defect.j + ": tensiune sub limită (dezechilibru)"], izolatie: ["P0AA6 – rezistența de izolație a sistemului HV sub limită"], soh: [],
      b12: ["P0562 – tensiunea rețelei de 12 V prea mică", "P0AA1 – contactorul HV pozitiv nu se închide"], racire: ["P0C73 – pompa de răcire a bateriei HV, performanță", "P0A7E – temperatura bateriei HV prea mare"],
      hvil: ["P0A0A – circuitul de interblocare HV (HVIL) deschis"] }[d_(pr)] || [];
  }
  function bms(pr) { var c = celule(pr), mn = Math.min.apply(null, c), mx = Math.max.apply(null, c), T = temperaturi(pr), e = energie(pr);
    return { soc: pr.soc, Enom: e.nom, Eutil: e.util, Utot: r2(c.reduce(function (s, x) { return s + x; }, 0), 1), Umin: mn, Umax: mx, jmin: c.indexOf(mn) + 1, Tmin: T.min, Tmax: T.max, Riso: izolatie(pr), U12: u12(pr, false) }; }
  /** fișierul de date OBD la ralanti: t = 0…599 s, STFT [%], MAP [kPa], U baterie [V] */
  function date(pr) {
    var r = mulberry32(pr.dSeed), g = function () { return (r() + r() + r() + r() - 2) * 1.732; }, t = [], s = [], m = [], u = [];
    for (var k = 0; k < 600; k++) {
      var st = pr.mStft + pr.sStft * g(), mp = pr.map0 + 0.45 * g(), ub = 14.15 + 0.035 * g(), da = k - pr.tAcc;
      if (da >= 0 && da < 4) { st += [-6.5, -8.2, -5, 4.8][da] - 0.4 * g(); mp = [58, 71, 66, 42][da] + g(); ub -= 0.12; }
      if (k >= pr.tLeak && k < pr.tLeak + 60) { st = pr.lvl + 1.0 * g() + (k === pr.tLeak ? -2.5 : 0); mp += 2.1; }
      if (k === pr.tGl) ub = 0;
      t.push(k); s.push(r2(st, 2)); m.push(r2(mp, 1)); u.push(r2(ub, 2));
    }
    return { t: t, stft: s, map: m, ubat: u };
  }
  function csv(pr) { var d = date(pr), L = ["t_s;STFT_pct;MAP_kPa;U_baterie_V"]; for (var k = 0; k < 600; k++) L.push(d.t[k] + ";" + String(d.stft[k]).replace(".", ",") + ";" + String(d.map[k]).replace(".", ",") + ";" + String(d.ubat[k]).replace(".", ",")); return L.join("\r\n"); }
  /** statistica pe porțiunea de referință [a, b] (inclusiv) și numărul de puncte cu |z| > 3 din tot fișierul */
  function statistica(x, a, b) {
    var ref = []; for (var k = Math.max(0, Math.round(a)); k <= Math.min(599, Math.round(b)); k++) ref.push(x[k]);
    var N = ref.length; if (N < 3) return { mu: NaN, sigma: NaN, n: NaN };
    var mu = ref.reduce(function (s, v) { return s + v; }, 0) / N, sg = Math.sqrt(ref.reduce(function (s, v) { return s + (v - mu) * (v - mu); }, 0) / (N - 1));
    var n = x.filter(function (v) { return Math.abs((v - mu) / sg) > 3; }).length;
    return { mu: mu, sigma: sg, n: n };
  }
  function interval(s) { var m = String(s || "").match(/(\d+(?:[.,]\d+)?)\s*[–\-…\.]+\s*(\d+(?:[.,]\d+)?)/); return m ? [parseFloat(m[1].replace(",", ".")), parseFloat(m[2].replace(",", "."))] : null; }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, U, pr) {
    var n = function (v) { return U.num(v); }, T2 = t.t72 || {}, T3 = t.t73 || {}, o = {};
    o.soh = n((T2.energU || {}).v) / n((T2.energN || {}).v) * 100;
    o.du = (n((T2.umax || {}).v) - n((T2.umin || {}).v)) * 1000;
    var Un = n(String((T2.tip || {}).v || "").replace(/.*?(\d{3})\s*V.*/, "$1")); o.Un = Un; o.risoMin = 100 * Un / 1000;   // [kΩ]
    var ani = n(String((T3.e || {}).vech || "").split("/")[0]), km = n(String((T3.e || {}).vech || "").split("/")[1]); o.req = cerinta(ani, km);
    var ucs = pr ? celule(pr) : null; o.umed = ucs ? ucs.reduce(function (s, x) { return s + x; }, 0) / ucs.length : NaN;
    o.stft = NaN; var iv = interval(((t.t74 || {}).stft || {}).ref); if (pr && iv) o.stft = statistica(date(pr).stft, iv[0], iv[1]).sigma;
    o.sigRef = pr ? statistica(date(pr).stft, 20, 180).sigma : NaN;
    return o;
  }
  function asteptate(o) { return { q1: o.soh, q2: o.du, q3: o.risoMin, q4: o.sigRef }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { return isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tol; };
    var B = bms(pr);
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "bms") ok = ap(l.soc, B.soc, 0.5) && ap(l.Eutil, B.Eutil, 0.06) && ap(l.Umin, B.Umin, 0.0006) && ap(l.Umax, B.Umax, 0.0006) && ap(l.Tmax, B.Tmax, 0.06) && ap(l.Riso, B.Riso, B.Riso * 0.02) && ap(l.U12, u12(pr, !!l.ready), 0.03);
      else if (l.m === "meg") ok = ap(l.R, izolatie(pr), izolatie(pr) * 0.06 + 0.002);
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    var T2 = t.t72 || {}; [["umin", "Umin"], ["umax", "Umax"], ["energU", "Eutil"]].forEach(function (z) { var v = U.num((T2[z[0]] || {}).v); if (isFinite(v) && !areCit(function (l) { return l.m === "bms" && eq(l[z[1]], v, 0.06); })) out.faraCitire++; });
    // Tabelul 7.4: μ, σ și numărul de anomalii trebuie să corespundă fișierului propriu pe porțiunea de referință declarată
    var D = date(pr); ["stft", "map", "ubat"].forEach(function (k) { var r = (t.t74 || {})[k] || {}, iv = interval(r.ref); if (!iv) return; var S = statistica(D[k], iv[0], iv[1]);
      var mu = U.num(r.mu), sg = U.num(r.sig), nn = U.num(r.n);
      if ((isFinite(mu) && Math.abs(mu - S.mu) > Math.abs(S.sigma) * 0.05 + 0.02) || (isFinite(sg) && Math.abs(sg - S.sigma) > S.sigma * 0.05 + 0.005) || (isFinite(nn) && Math.abs(nn - S.n) > 2)) out.motive.push("Tabelul 7.4 (" + k + "): valorile nu corespund fișierului propriu pe porțiunea " + iv.join("–") + " s"); });
    var o = prelucreaza(t, U, pr), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.01, 0.2], q2: [0.01, 1.5], q3: [0.01, 0.5], q4: [0.03, 0.03] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok };
    });
    var dg = ((t.t75 || {}).d || {}).cauza || "", okD = dg === eticheta(pr.defect); if (okD) out.corecte++;
    out.detalii.defect = { raspuns: dg, asteptat: eticheta(pr.defect), corect: okD };
    out.principal = { eticheta: "defect identificat", valoare: okD ? "DA" : "NU" };
    return out;
  }
  return { VEH: VEH, TIPURI: TIPURI, CHEI: CHEI, EXPL: EXPL, eticheta: eticheta, optiuniDiag: optiuniDiag, cerinta: cerinta, parametri: parametri, vehicul: vehicul, celule: celule,
    energie: energie, temperaturi: temperaturi, izolatie: izolatie, u12: u12, ready: ready, coduri: coduri, bms: bms, date: date, csv: csv, statistica: statistica, interval: interval,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
