/* DA – Lucrarea 6. Sistemul de frânare cu ABS/ESC și sistemele ADAS – standul didactic de frânare.
   Modelul: alimentarea și masa modulului ABS/ESC (și căderea de tensiune la funcționarea pompei), contactul lămpilor de frână,
   senzorii de turație – față pasivi (inductivi, roată dințată z = 48), spate activi (inel multipolar, 7/14 mA) –, frecvența și
   amplitudinea semnalelor, vitezele afișate de tester, senzorul de unghi al volanului (decalaj individual, calibrare), viteza de
   girație, accelerația laterală, presiunea din circuit, camera frontală (unghiul de nealiniere, calibrarea statică). Fiecare student
   are standul propriu și un defect ascuns. Același model este folosit în aplicație și pe serverul Apps Script. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["da-l6"] = (function () {
  var DD = 0.594, Z = 48, ID = 15, L = 1.873;              // diametrul dinamic (155/60 R15), dinți / perechi de poli, raportul direcției, ampatamentul (Smart)
  var ROTI = ["fs", "fd", "ss", "sd"], NUME = { fs: "Față stânga", fd: "Față dreapta", ss: "Spate stânga", sd: "Spate dreapta" };
  var TIPURI = {
    rupt: "Senzorul de turație față stânga întrerupt (bobină / cablu)", intref: "Senzorul față dreapta cu întrefier mare / murdărie (semnal slab)",
    invers: "Conectorii senzorilor din spate inversați (după o reparație)", inel: "Inelul multipolar spate stânga deteriorat (impulsuri lipsă)",
    masa: "Masa modulului ABS/ESC cu rezistență mare (contact oxidat)", stop: "Contactul lămpilor de frână defect (nu închide)",
    cam: "Camera frontală necalibrată după înlocuirea parbrizului"
  };
  var CHEI = ["rupt", "intref", "invers", "inel", "masa", "stop", "cam"];
  var CODURI = { rupt: ["C0035 – senzorul de turație față stânga, circuit deschis"], intref: ["C0040 – senzorul de turație față dreapta, semnal neplauzibil (intermitent)"], invers: [],
    inel: ["C0045 – senzorul de turație spate stânga, semnal neplauzibil"], masa: ["C0800 – tensiunea de alimentare a modulului prea mică (la funcționarea pompei)"],
    stop: ["C0055 – contactul lămpilor de frână, semnal neplauzibil"], cam: ["U3000 – camera frontală: calibrare necesară", "C1B00 – sistemul de menținere a benzii indisponibil"] };
  function eticheta(d) { return TIPURI[d.tip] || "—"; }
  function optiuniDiag() { return CHEI.map(function (k) { return TIPURI[k]; }); }
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    var tip = CHEI[Math.floor(r() * CHEI.length) % CHEI.length], semn = r() < 0.5 ? -1 : 1;
    return {
      defect: { tip: tip },
      Ub: r2(u(12.3, 12.7), 2), Rm: r2(u(0.01, 0.05), 2), Rbob: [r2(u(950, 1150), 0), r2(u(950, 1150), 0)], kA: r2(u(0.0105, 0.0135), 4),
      Ua: r2(u(11.6, 12.1), 1), ddR: [0, 1, 2, 3].map(function () { return r2(DD * (1 + u(-0.004, 0.004)), 4); }),
      sas0: r2(semn * u(2.5, 7.5), 1), yaw0: r2(u(-0.35, 0.35), 2), ay0: r2(u(-0.08, 0.08), 2), p0: r2(u(0.1, 0.35), 1),
      alfa: r2(tip === "cam" ? u(1.4, 2.4) : u(0.12, 0.55), 2), Rstop: r2(u(0.1, 0.4), 1)
    };
  }
  var d_ = function (pr) { return pr.defect.tip; };
  /** frecvența semnalului roții i [Hz] la viteza v [km/h] a roții (diametrul dinamic real al roții) */
  function frecventa(pr, i, v) { return v / 3.6 * Z / (Math.PI * pr.ddR[i]); }
  /** senzorul roții i: ce se vede la conectorul lui (frecvență, amplitudine / curent) */
  function semnal(pr, i, v) {
    var f = frecventa(pr, i, v), d = d_(pr), pas = i < 2;
    if (pas) {
      var A = pr.kA * f * (d === "intref" && i === 1 ? 0.22 : 1);            // amplitudinea vârf [V]
      if (d === "rupt" && i === 0) return { tip: "pasiv", f: 0, A: 0, ok: false };
      return { tip: "pasiv", f: f, A: r2(A, 3), ok: A >= 0.1 };
    }
    return { tip: "activ", f: f, Imin: 7, Imax: 14, lipsa: d === "inel" && i === 2 ? 0.25 : 0, ok: true };
  }
  /** viteza afișată de tester [km/h] pentru roata i (ECU calculează cu DD nominal); vReal = vitezele reale ale celor 4 roți */
  function vitezaTester(pr, i, vReal) {
    var d = d_(pr), j = d === "invers" && i >= 2 ? 5 - i : i, v = vReal[j], s = semnal(pr, j, v);
    if (!s.ok || v < 0.05) return 0;
    var vt = s.f * Math.PI * DD / Z * 3.6;
    if (d === "intref" && j === 1 && v < 9) return 0;
    if (d === "inel" && j === 2) vt = vt * 0.75;
    return r2(vt, 1);
  }
  /** multimetrul: rezistența bobinei (conector decuplat), izolația, tensiunea de alimentare a senzorului activ */
  function rezBobina(pr, i) { if (i >= 2) return null; if (d_(pr) === "rupt" && i === 0) return Infinity; return pr.Rbob[i]; }
  function alimActiv(pr, i) { return i >= 2 ? pr.Ua : null; }
  function alimentare(pr, pompa) { var Rm = d_(pr) === "masa" ? r2(0.22 + pr.Rm, 2) : pr.Rm, I = pompa ? 15 : 0.4; return { U: r2(pr.Ub - I * (Rm + 0.012), 2), Rm: Rm }; }
  function contactStop(pr, apasat) { if (d_(pr) === "stop") return Infinity; return apasat ? pr.Rstop : Infinity; }
  /** senzorii ESC în repaus: unghiul volanului (real δ, calibrat la δCal), girație, ay, presiune */
  function esc(pr, real, calibrat, realCal) { return { sas: r2(calibrat ? real - realCal : real + pr.sas0, 1), yaw: calibrat ? r2(pr.yaw0 * 0.15, 2) : pr.yaw0, ay: calibrat ? r2(pr.ay0 * 0.2, 2) : pr.ay0, p: pr.p0 }; }
  function adas(pr, calibrat) { var nec = d_(pr) === "cam" && !calibrat; return { stare: nec ? "necalibrată" : "calibrată", alfa: calibrat ? r2(Math.min(0.06, pr.alfa * 0.05), 2) : pr.alfa }; }
  function coduri(pr) { return CODURI[d_(pr)] || []; }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function vr(f, dd, z) { return 3.6 * Math.PI * dd * f / z; }
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); }, T2 = t.t62 || {}, T3 = t.t63 || {}, T4 = t.t64 || {}, o = { vr: {} };
    ROTI.forEach(function (k) { o.vr[k] = vr(n((T2[k] || {}).f), DD, Z); });
    var s = n((T3.sas || {}).inainte), v = 20;
    o.wz = v * (s * Math.PI / 180 / ID) / L * 180 / Math.PI;      // [°/s]
    o.ay = v * (o.wz * Math.PI / 180);
    var a = n((T4.alfa || {}).stare); o.y = 50 * Math.tan(a * Math.PI / 180);
    return o;
  }
  function asteptate(o) { return { q1: o.vr.sd, q2: o.wz, q3: o.ay, q4: o.y }; }
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 5, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tol) { if (b === Infinity) return a === "OL" || Number(a) > 1e6; return isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) <= tol; };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "alim") { var A = alimentare(pr, !!l.pompa); ok = ap(l.U, A.U, 0.08); }
      else if (l.m === "masa") ok = ap(l.R, alimentare(pr, false).Rm, 0.02);
      else if (l.m === "stop") ok = ap(l.apasat, contactStop(pr, true), 0.15) && ap(l.eliberat, contactStop(pr, false), 0.15);
      else if (l.m === "ws") { var i = ROTI.indexOf(l.k), vR = l.vR || [], f = frecventa(pr, i, Number(vR[i])), s = semnal(pr, i, Number(vR[i]));
        if (i < 2) ok = ap(l.R, rezBobina(pr, i), 3); else ok = ap(l.U, alimActiv(pr, i), 0.15);
        ok = ok && ap(l.f, d_(pr) === "rupt" && i === 0 ? 0 : f, Math.max(0.6, f * 0.012)) && ap(l.vx, vitezaTester(pr, i, vR.map(Number)), 0.25); }
      else if (l.m === "id") { var j = ROTI.indexOf(l.k), vv = [0, 0, 0, 0]; vv[j] = 6; var arata = ROTI.filter(function (k, q) { return vitezaTester(pr, q, vv) > 0; }); ok = (l.afis || "") === (arata.join(",") || "niciuna"); }
      else if (l.m === "esc") { var e = esc(pr, Number(l.real), !!l.cal, Number(l.realCal)); ok = ap(l.sas, e.sas, 0.15) && ap(l.yaw, e.yaw, 0.03) && ap(l.ay, e.ay, 0.03) && ap(l.p, e.p, 0.06); }
      else if (l.m === "adas") { var a = adas(pr, !!l.cal); ok = ap(l.alfa, a.alfa, 0.015) && l.stare === a.stare; }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.051); };
    var T2 = t.t62 || {}; ROTI.forEach(function (k) { var v = U.num((T2[k] || {}).f); if (isFinite(v) && !areCit(function (l) { return l.m === "ws" && l.k === k && eq(l.f, v, 0.06); })) out.faraCitire++; });
    var T3 = t.t63 || {}; [["inainte", false], ["dupa", true]].forEach(function (z) { var v = U.num((T3.sas || {})[z[0]]); if (isFinite(v) && !areCit(function (l) { return l.m === "esc" && !!l.cal === z[1] && eq(l.sas, v, 0.06); })) out.faraCitire++; });
    var T4 = t.t64 || {}, va = U.num((T4.alfa || {}).stare); if (isFinite(va) && !areCit(function (l) { return l.m === "adas" && !l.cal && eq(l.alfa, va, 0.006); })) out.faraCitire++;
    var o = prelucreaza(t, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0.01, 0.1], q2: [0.02, 0.05], q3: [0.02, 0.02], q4: [0.02, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++; out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 100) / 100 : "—", corect: ok };
    });
    var dg = ((t.t66 || {}).d || {}).cauza || "", okD = dg === eticheta(pr.defect); if (okD) out.corecte++;
    out.detalii.defect = { raspuns: dg, asteptat: eticheta(pr.defect), corect: okD };
    out.principal = { eticheta: "defect identificat", valoare: okD ? "DA" : "NU" };
    return out;
  }
  return { DD: DD, Z: Z, ID: ID, L: L, ROTI: ROTI, NUME: NUME, TIPURI: TIPURI, CHEI: CHEI, eticheta: eticheta, optiuniDiag: optiuniDiag, parametri: parametri,
    frecventa: frecventa, semnal: semnal, vitezaTester: vitezaTester, rezBobina: rezBobina, alimActiv: alimActiv, alimentare: alimentare, contactStop: contactStop,
    esc: esc, adas: adas, coduri: coduri, vr: vr, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
