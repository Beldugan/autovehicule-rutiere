/* MAM I – Lucrarea 9. Clapeta electronică de accelerație: punte H, comandă PWM și regulator PID.
   Modelul standului: clapeta auto cu motor de c.c. și reductor (rezistența, inductivitatea și t.e.m. proprii), arcul de revenire cu
   pretensionare de o parte și de alta a poziției de avarie (limp-home), frecarea uscată și vâscoasă, opritoarele 0 / 100 %, cele două
   piste complementare (U1 + U2 = 5 V, cu erorile lor), puntea BTS7960 (tensiunea medie DC·Us, dezactivată = circuit deschis), programul
   cu regulatorul PID la 2 ms (anti-windup, limitarea comenzii, plauzibilitatea pistelor), încălzirea radiatorului și a motorului.
   Același model este folosit pe serverul Apps Script (evaluarea). */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l9"] = (function () {
  var POZ = [0, 25, 50, 75, 100], DCS = [10, 20, 30], TS = 0.002, DTF = 0.0001, REF = 40, TPRE = 0.6, TRASP = 1.0;
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return {
      R: r2(u(1.3, 2.0), 3), L: r2(u(0.0008, 0.0016), 5), Ke: r2(u(0.0022, 0.003), 5), J: r2(u(5e-6, 8e-6), 8), b: r2(u(1e-4, 2e-4), 7),
      kU: r2(u(0.03, 0.04), 4), kD: r2(u(0.05, 0.08), 4), T0U: r2(u(0.5, 0.65), 3), T0D: r2(u(0.25, 0.4), 3), LH: r2(u(6, 9), 2), Fc: r2(u(0.05, 0.09), 3),
      Us: r2(u(12.0, 12.4), 2), o1: r2(u(-0.03, 0.03), 3), g1: r2(u(-0.015, 0.015), 4), o2: r2(u(-0.03, 0.03), 3), g2: r2(u(-0.015, 0.015), 4),
      Tamb: r2(u(22, 25), 1), Rth: r2(u(8, 12), 2), tauR: Math.round(u(90, 150)), RthM: r2(u(3.5, 5), 2), tauM: Math.round(u(150, 240))
    };
  }
  /** cuplul arcului [A echivalenți] la poziția th [%] */
  function arc(pr, th) { return th > pr.LH ? -(pr.T0U + pr.kU * (th - pr.LH)) : th < pr.LH ? pr.T0D + pr.kD * (pr.LH - th) : 0; }
  /** un pas fizic dt: st = {th, w, i}; U = tensiunea medie a punții [V]; en = puntea activată */
  function pas(pr, st, U, en, dt) {
    if (en) st.i += (U - pr.R * st.i - pr.Ke * st.w) / pr.L * dt; else st.i *= Math.exp(-dt / 0.0002);
    // poziția de avarie: arcurile își schimbă sensul – clapeta rămâne acolo cât timp cuplul motorului nu învinge pretensionarea
    if (Math.abs(st.th - pr.LH) < 0.3 && Math.abs(st.w) < 20 && st.i <= pr.T0U + pr.Fc && st.i >= -(pr.T0D + pr.Fc)) { st.th = pr.LH; st.w = 0; return st; }
    var net = st.i + arc(pr, st.th) - pr.b * st.w;
    if (Math.abs(st.w) < 1e-3) {
      // la oprire: frecarea statică ține clapeta, cu excepția poziției de avarie (arcul își schimbă sensul acolo)
      if (Math.abs(net) <= pr.Fc) { st.w = 0; net = 0; } else net -= pr.Fc * (net > 0 ? 1 : -1);
    } else net -= pr.Fc * (st.w > 0 ? 1 : -1);
    var w0 = st.w; st.w += net / pr.J * dt;
    if (w0 !== 0 && w0 * st.w < 0 && Math.abs(st.i + arc(pr, st.th)) <= pr.Fc) st.w = 0;
    st.th += st.w * dt;
    if (st.th <= 0) { st.th = 0; if (st.w < 0) st.w = 0; }
    if (st.th >= 100) { st.th = 100; if (st.w > 0) st.w = 0; }
    return st;
  }
  function u1(pr, th) { return pr.o1 + (0.5 + 4.0 * th / 100) * (1 + pr.g1); }
  function u2(pr, th) { return pr.o2 + (4.5 - 4.0 * th / 100) * (1 + pr.g2); }
  /** poziția calculată de program din pista 1 (constantele nominale 0,5 V / 4,5 V) */
  function thProg(u) { return (u - 0.5) / 4.0 * 100; }
  function adc(v) { return Math.max(0, Math.min(1023, Math.round(v / 5 * 1023))) * 5 / 1023; }
  /** poziția de echilibru în buclă deschisă, atinsă de jos: intervalul [min, max] admis de frecare */
  function echilibru(pr, dc) {
    var i = dc / 100 * pr.Us / pr.R, lo = pr.LH + (i - pr.T0U - pr.Fc) / pr.kU, hi = pr.LH + (i - pr.T0U + pr.Fc) / pr.kU;
    return { i: i, min: Math.max(pr.LH, Math.min(100, lo)), max: Math.max(pr.LH, Math.min(100, hi)) };
  }
  /** regulatorul PID (o iterație): g = {kp, ki, kd, umax}; s = {integ, ePrev} */
  function pid(g, s, ref, th) {
    var e = ref - th;
    s.integ = Math.max(-20, Math.min(20, s.integ + e * TS));
    var u = g.kp * e + g.ki * s.integ + g.kd * (e - s.ePrev) / TS; s.ePrev = e;
    return Math.max(-g.umax, Math.min(g.umax, u));
  }
  /** răspunsul la treapta 0 → 40 % (fără zgomot): TPRE s cu ref = 0, apoi TRASP s cu ref = 40; întoarce eșantioanele de după treaptă */
  function raspuns(pr, g) {
    var st = { th: pr.LH, w: 0, i: 0 }, s = { integ: 0, ePrev: 0 }, out = [], n0 = Math.round(TPRE / TS), n1 = Math.round(TRASP / TS), sub = Math.round(TS / DTF);
    for (var k = 0; k < n0 + n1; k++) {
      var ref = k < n0 ? 0 : REF, th = thProg(u1(pr, st.th)), u = pid(g, s, ref, th);
      if (k >= n0) out.push([(k - n0) * TS, th, u]);
      for (var j = 0; j < sub; j++) pas(pr, st, u / 100 * pr.Us, true, DTF);
    }
    return out;
  }
  /** indicatorii răspunsului: θmax, θ∞ (media ultimelor 200 ms), Mp, ts (banda ±2 % din θ∞), est */
  function analiza(pts) {
    var n = pts.length, m = Math.max(1, Math.round(0.2 / TS)), inf = 0, mx = -1e9, i;
    for (i = n - m; i < n; i++) inf += pts[i][1]; inf /= m;
    for (i = 0; i < n; i++) if (pts[i][1] > mx) mx = pts[i][1];
    var band = 0.02 * Math.abs(inf), ts = 0;
    for (i = n - 1; i >= 0; i--) if (Math.abs(pts[i][1] - inf) > band) { ts = pts[i][0] + TS; break; }
    return { thMax: mx, thInf: inf, Mp: mx > inf ? (mx - inf) / inf * 100 : 0, ts: ts * 1000, est: REF - inf };
  }
  function tip(g) { return g.ki > 0 && g.kd > 0 ? "PID" : g.ki > 0 ? "PI" : g.kd > 0 ? "PD" : "P"; }
  /** puterile disipate [W]: puntea (cu radiatorul) și motorul, la curentul efectiv i [A] și frecvența PWM f [Hz] */
  function puteri(pr, i, f) { return { rad: 0.3 + i * i * 0.03 + (f > 1000 ? 0.6 : 0.05), mot: i * i * pr.R }; }
  /** temperaturile după t secunde de funcționare cu curentul efectiv i, pornind de la T0r / T0m */
  function temperaturi(pr, t, i, f, T0r, T0m) {
    var P = puteri(pr, i, f), Sr = pr.Tamb + pr.Rth * P.rad, Sm = pr.Tamb + pr.RthM * P.mot;
    var r0 = isFinite(T0r) ? T0r : pr.Tamb, m0 = isFinite(T0m) ? T0m : pr.Tamb;
    return { rad: Sr + (r0 - Sr) * Math.exp(-t / pr.tauR), mot: Sm + (m0 - Sm) * Math.exp(-t / pr.tauM) };
  }
  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T2 = t.t92 || {}, T3 = t.t93 || {}, o = { um: {}, reg: {} };
    DCS.forEach(function (d) { var us = n(date.us); o.um["d" + d] = isFinite(us) ? d / 100 * us : NaN; });
    ["P", "PI", "PID"].forEach(function (k) { var r = T3[k.toLowerCase()] || {}, mx = n(r.thMax), es = n(r.est), inf = isFinite(es) ? REF - es : NaN;
      o.reg[k] = { Mp: isFinite(mx) && isFinite(inf) && inf > 0 ? Math.max(0, (mx - inf) / inf * 100) : NaN, ts: n(r.ts), est: es }; });
    o.estP = o.reg.P.est; o.MpPID = o.reg.PID.Mp;
    return o;
  }
  function asteptate(o) { return { q1: (46 - 40) / 40 * 100, q2: o.estP, q3: o.MpPID, q4: 0.20 * 12 }; }

  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tolAbs, tolRel) { a = Number(a); return isFinite(a) && Math.abs(a - b) <= (tolAbs || 0) + Math.abs(b) * (tolRel || 0); };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "senz") ok = ap(l.u1, u1(pr, Number(l.pos)), 0.012) && ap(l.u2, u2(pr, Number(l.pos)), 0.012);
      else if (l.m === "bd") { var dc = Number(l.dc), e = echilibru(pr, dc), th = Number(l.th), thr = thProg(u1(pr, e.min)), thr2 = thProg(u1(pr, e.max));
        ok = ap(l.um, dc / 100 * pr.Us, 0.05, 0.02) && ap(l.i, e.i, 0.03, 0.05) && th >= Math.min(thr, thr2) - 1.5 && th <= Math.max(thr, thr2) + 1.5; }
      else if (l.m === "pas") { var a = analiza(raspuns(pr, { kp: Number(l.kp), ki: Number(l.ki), kd: Number(l.kd), umax: Number(l.umax) || 100 }));
        ok = ap(l.thMax, a.thMax, 0.8, 0.02) && ap(l.est, a.est, 0.6) && ap(l.ts, a.ts, 40, 0.25); }
      else if (l.m === "def") ok = ap(l.th, thProg(u1(pr, pr.LH)), 1.5) && Number(l.tr) >= 8 && Number(l.tr) <= 20;
      else if (l.m === "temp") { var tt = temperaturi(pr, Number(l.t), Number(l.i), Number(l.f), Number(l.r0), Number(l.m0)); ok = ap(l.rad, tt.rad, 2.5) && ap(l.mot, tt.mot, 3); }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    var T1 = t.t91 || {}, T2 = t.t92 || {}, T3 = t.t93 || {};
    POZ.forEach(function (p) { ["u1", "u2"].forEach(function (c) { var v = U.num((T1["p" + p] || {})[c]); if (isFinite(v) && !areCit(function (l) { return l.m === "senz" && Number(l.pos) === p && eq(l[c], v); })) out.faraCitire++; }); });
    DCS.forEach(function (dc) { ["um", "th", "i"].forEach(function (c) { var v = U.num((T2["d" + dc] || {})[c]); if (isFinite(v) && !areCit(function (l) { return l.m === "bd" && Number(l.dc) === dc && eq(l[c], v, 0.006); })) out.faraCitire++; }); });
    ["p", "pi", "pid"].forEach(function (k) { var r = T3[k] || {}; ["thMax", "ts", "est"].forEach(function (c) { var v = U.num(r[c]); if (isFinite(v) && !areCit(function (l) { return l.m === "pas" && l.k === k && eq(l[c], v, 0.06); })) out.faraCitire++; }); });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.05], q2: [0.03, 0.05], q3: [0.03, 0.1], q4: [0, 0.01] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    out.principal = { eticheta: "suprareglajul PID [%]", valoare: isFinite(o.MpPID) ? Math.round(o.MpPID * 1000) / 1000 : "" };
    return out;
  }
  return { POZ: POZ, DCS: DCS, TS: TS, DTF: DTF, REF: REF, TPRE: TPRE, TRASP: TRASP, parametri: parametri, arc: arc, pas: pas, u1: u1, u2: u2, thProg: thProg, adc: adc,
    echilibru: echilibru, pid: pid, raspuns: raspuns, analiza: analiza, tip: tip, puteri: puteri, temperaturi: temperaturi, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
