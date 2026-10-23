/* MF – Lucrarea 1. Vâscozitatea uleiurilor de motor (vâscozimetrul cu bilă Höppler, dreapta Walther, SAE J300).
   Modelul este folosit identic în aplicație și pe serverul Apps Script.
   Unități: ν în mm²/s, η în mPa·s, ρ în g/cm³, timpi în s, temperaturi în °C. */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mf-l1"] = (function () {
  var ALFA = 0.00065, L_REPERE = 100; // distanța dintre repere [mm]
  var ULEI = {
    "0W-20": { nume: "Ulei de motor 0W-20 (sintetic)", n40: 44.5, n100: 8.6, r15: 0.846, culoare: "#e0b04a" },
    "5W-30": { nume: "Ulei de motor 5W-30 (sintetic)", n40: 65.3, n100: 11.0, r15: 0.855, culoare: "#cf9631" },
    "10W-40": { nume: "Ulei de motor 10W-40 (semisintetic)", n40: 98.0, n100: 14.6, r15: 0.868, culoare: "#b97a1e" },
    "UZAT": { nume: "Ulei 5W-30 uzat (15 000 km, diluat cu motorină)", n40: 54.0, n100: 9.4, r15: 0.862, culoare: "#3a2a17" }
  };
  var OPTIUNI_A = ["0W-20", "5W-30", "10W-40"];
  var BILE = {
    B1: { nume: "Bila 1 – sticlă", rb: 2.225, K: 0.0090, d: 15.81 },
    B2: { nume: "Bila 2 – sticlă", rb: 2.225, K: 0.075, d: 15.60 },
    B3: { nume: "Bila 3 – oțel Ni-Fe", rb: 8.10, K: 0.090, d: 15.60 },
    B4: { nume: "Bila 4 – oțel", rb: 8.10, K: 0.70, d: 15.20 },
    B5: { nume: "Bila 5 – oțel", rb: 8.10, K: 7.0, d: 14.00 }
  };
  var TEMP = [40, 60, 80];
  var SAE = [[8, 4.0, 6.1], [12, 5.0, 7.1], [16, 6.1, 8.2], [20, 6.9, 9.3], [30, 9.3, 12.5], [40, 12.5, 16.3], [50, 16.3, 21.9], [60, 21.9, 26.1]];
  function lg(x) { return Math.log(x) / Math.LN10; }
  function Y(n) { return lg(lg(n + 0.7)); }
  /** coeficienții Walther lg lg(ν+0,7) = A − B·lg T din două puncte (t în °C) */
  function walther(t1, n1, t2, n2) {
    var x1 = lg(t1 + 273.15), x2 = lg(t2 + 273.15), B = (Y(n1) - Y(n2)) / (x2 - x1);
    return { A: Y(n1) + B * x1, B: B };
  }
  function nuWalther(w, t) { return Math.pow(10, Math.pow(10, w.A - w.B * lg(t + 273.15))) - 0.7; }
  function wCatalog(cheie) { var u = ULEI[cheie]; return walther(40, u.n40, 100, u.n100); }
  function densitate(r15, t) { return r15 * (1 - ALFA * (t - 15)); }
  function clasaSAE(n100) { var c = null; for (var i = 0; i < SAE.length; i++) if (n100 >= SAE[i][1]) c = SAE[i][0]; return n100 < SAE[SAE.length - 1][2] ? c : null; }
  /** parametrii individuali secreți (seed de la server) */
  function parametri(seed) {
    var r = mulberry32(seed);
    var oA = OPTIUNI_A[Math.floor(r() * 3) % 3];
    return {
      uleiA: oA,
      fA: 1 + (r() * 2 - 1) * 0.04, fU: 1 + (r() * 2 - 1) * 0.06,          // abaterea lotului (vâscozitate)
      rA: ULEI[oA].r15 * (1 + (r() * 2 - 1) * 0.004), rU: ULEI.UZAT.r15 * (1 + (r() * 2 - 1) * 0.004),
      dT: (r() * 2 - 1) * 0.3,                                             // eroarea termometrului [°C] (T reală = T afișată + dT)
      tc: Math.round((20.5 + r() * 2.5) * 10) / 10                         // temperatura camerei la areometru
    };
  }
  /** proprietățile adevărate ale probei o ("A"/"U") la temperatura reală t */
  function proba(o, t, pr) {
    var cheie = o === "U" ? "UZAT" : pr.uleiA, f = o === "U" ? pr.fU : pr.fA, r15 = o === "U" ? pr.rU : pr.rA;
    var nu = nuWalther(wCatalog(cheie), t) * f, rho = densitate(r15, t);
    return { nu: nu, rho: rho, eta: nu * rho };
  }
  /** timpul adevărat de cădere între repere (T afișată de termometru) */
  function timpCadere(o, Tafis, bila, pr) {
    var b = BILE[bila], p = proba(o, Tafis + pr.dT, pr);
    return p.eta / (b.K * (b.rb - p.rho));
  }
  /** prelucrarea tabelelor studentului (aceeași în aplicație și pe server) */
  function prelucreaza(t, U) {
    var n = function (v) { return U.num(v); };
    var out = { r15: {}, rand: {}, w: {}, n100: {}, n0: {}, sae: {} };
    ["A", "U"].forEach(function (o) {
      var d = (t.t11 || {})[o] || {}, tc = n(d.tc), rc = n(d.rc);
      out.r15[o] = isFinite(tc) && isFinite(rc) ? rc / (1 - ALFA * (tc - 15)) : NaN;
      var pts = [];
      TEMP.forEach(function (T) {
        var r = ((t.t12 || {})[o + T]) || {}, b = BILE[r.b], ts = [n(r.t1), n(r.t2), n(r.t3)].filter(function (x) { return isFinite(x) && x > 0; });
        var R = { nt: ts.length };
        if (ts.length) {
          R.tm = ts.reduce(function (a, b) { return a + b; }, 0) / ts.length;
          R.disp = ts.length > 1 ? (Math.max.apply(null, ts) - Math.min.apply(null, ts)) / R.tm : 0;
          var r15 = isFinite(out.r15[o]) ? out.r15[o] : ULEI[o === "U" ? "UZAT" : "5W-30"].r15;
          R.rho = densitate(r15, T);
          if (b) { R.eta = b.K * (b.rb - R.rho) * R.tm; R.nu = R.eta / R.rho; pts.push([T, R.nu]); }
        }
        out.rand[o + T] = R;
      });
      var r40 = out.rand[o + "40"], r80 = out.rand[o + "80"];
      if (r40 && r80 && r40.nu > 0 && r80.nu > 0) {
        var w = walther(40, r40.nu, 80, r80.nu); out.w[o] = w;
        out.n100[o] = nuWalther(w, 100); out.n0[o] = nuWalther(w, 0); out.sae[o] = clasaSAE(out.n100[o]);
      }
    });
    return out;
  }
  function asteptate(pr2) {
    var a = pr2.n100.A, b = pr2.n0.A;
    return { q1: a, q2: pr2.sae.A == null ? NaN : pr2.sae.A, q3: isFinite(a) && isFinite(b) ? b / a : NaN, q4: pr2.w.U ? pr2.w.U.B : NaN };
  }
  /** verificarea pe server a unui referat trimis */
  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var cad = log.filter(function (l) { return l.cad; }), dens = log.filter(function (l) { return l.dens; });
    cad.forEach(function (l) {
      var tm = timpCadere(l.o, Number(l.T), l.b, pr), tl = Number(l.t);
      if (!(isFinite(tm) && Math.abs(tl - tm) <= Math.max(0.6, 0.05 * tm))) out.incompatibile++;
    });
    var densGresite = 0;
    ["A", "U"].forEach(function (o) {
      var r = (t.t11 || {})[o] || {}, tc = U.num(r.tc), rc = U.num(r.rc);
      if (isFinite(tc) && Math.abs(tc - pr.tc) > 0.05) out.incompatibile++;
      if (isFinite(rc)) { var adev = densitate(o === "U" ? pr.rU : pr.rA, pr.tc); if (Math.abs(rc - adev) > 0.0025) densGresite++; }
      if (isFinite(tc) && !dens.some(function (l) { return l.o === o; })) out.faraCitire++;
    });
    if (densGresite) out.motive.push("densitate citită greșit la areometru (" + densGresite + ")");
    out.incompatibile += densGresite;
    Object.keys(t.t12 || {}).forEach(function (k) {
      var r = t.t12[k], o = k.charAt(0), T = Number(k.slice(1));
      ["t1", "t2", "t3"].forEach(function (c) {
        var v = U.num(r[c]); if (!isFinite(v)) return;
        var ok = cad.some(function (l) { return l.o === o && l.b === r.b && Math.abs(Number(l.Tset) - T) < 0.5 && Math.abs(Number(l.t) - v) < 0.006; });
        if (!ok) out.faraCitire++;
      });
    });
    var p2 = prelucreaza(t, U), a = asteptate(p2), rasp = d.raspunsuri || {};
    out.principal = { eticheta: "ν100 ulei A [mm²/s]", valoare: isFinite(p2.n100.A) ? Math.round(p2.n100.A * 100) / 100 : "" };
    var tol = { q1: 0.02, q2: 0, q3: 0.04, q4: 0.015 };
    Object.keys(a).forEach(function (k) {
      var r = U.num(rasp[k]), ok = isFinite(r) && isFinite(a[k]) && (k === "q2" ? Math.round(r) === a[k] : Math.abs(r - a[k]) <= Math.abs(a[k]) * tol[k] + 1e-9);
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    return out;
  }
  return { ALFA: ALFA, L_REPERE: L_REPERE, ULEI: ULEI, OPTIUNI_A: OPTIUNI_A, BILE: BILE, TEMP: TEMP, SAE: SAE, Y: Y, walther: walther, nuWalther: nuWalther,
    wCatalog: wCatalog, densitate: densitate, clasaSAE: clasaSAE, parametri: parametri, proba: proba, timpCadere: timpCadere,
    prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
