/* MAM I – Lucrarea 10. Magistrala CAN: construirea mesajelor, arbitrajul și decodarea semnalelor.
   Modelul standului: trei noduri (Arduino Mega + MCP2515 + TJA1050) pe un cablu torsadat de 2 m, terminările de 120 Ω (cu toleranța lor)
   la nodurile A și C, cadrele standard construite bit cu bit (SOF, ID, RTR, IDE, r0, DLC, date, CRC-15, ACK, EOF) cu umplerea de biți,
   mesajele 0x0C8 „Motor” (10 ms) și 0x0B4 „Pedală” (20 ms), arbitrajul, încărcarea magistralei și defectele (terminare lipsă,
   CAN-L întrerupt la nodul B: cadre de eroare, TEC +8, error passive, bus off).
   Același model este folosit pe serverul Apps Script (evaluarea). */
var MODELE = typeof MODELE !== "undefined" ? MODELE : {};
MODELE["mam1-l10"] = (function () {
  var FBIT = 500000, MSG = { C8: { id: 0x0C8, per: 0.010, nod: "A" }, B4: { id: 0x0B4, per: 0.020, nod: "B" } }, IFS = 3, ERRBITS = 18;
  var OBS = ["0x0B4 câștigă arbitrajul (ID mai mic), 0x0C8 urmează imediat", "fără cadre de eroare – comunicația continuă, cu marjă redusă", "cadre de eroare; nodul B trece în error passive și apoi bus off", "fără efect vizibil"];
  function r2(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function parametri(seed) {
    var r = mulberry32(seed), u = function (a, b) { return a + (b - a) * r(); };
    return { RA: r2(u(118.8, 121.2), 2), RC: r2(u(118.8, 121.2), 2), Rcab: r2(u(0.12, 0.3), 3), vH: r2(u(3.4, 3.6), 3), vL: r2(u(1.4, 1.6), 3), vR: r2(u(2.45, 2.55), 3),
      rpm0: Math.round(u(780, 920)), T0: Math.round(u(78, 92)), ped0: r2(u(12, 20), 1) };
  }
  /** CRC-15 CAN (polinomul 0x4599) peste șirul de biți */
  function crc15(bits) { var c = 0; for (var i = 0; i < bits.length; i++) { var x = bits[i] ^ ((c >> 14) & 1); c = (c << 1) & 0x7FFF; if (x) c ^= 0x4599; } return c; }
  function nb(v, n) { var o = []; for (var i = n - 1; i >= 0; i--) o.push((v >> i) & 1); return o; }
  /** cadrul standard: câmpurile (nestuffate) și șirul transmis (cu biții de umplere marcați) */
  function cadru(id, data) {
    var dlc = data.length, f = [0].concat(nb(id, 11), [0, 0, 0], nb(dlc, 4));
    data.forEach(function (b) { f = f.concat(nb(b, 8)); });
    var crc = crc15(f), pre = f.concat(nb(crc, 15)), tx = [], st = [], run = 0, last = -1;
    for (var i = 0; i < pre.length; i++) {
      tx.push(pre[i]); st.push(0); if (pre[i] === last) run++; else { run = 1; last = pre[i]; }
      if (run === 5) { var s = 1 - last; tx.push(s); st.push(1); last = s; run = 1; }
    }
    var coada = [1, 0, 1, 1, 1, 1, 1, 1, 1, 1]; // delimitatorul CRC, ACK (dominant de la receptoare), delimitatorul ACK, EOF (7)
    coada.forEach(function (b) { tx.push(b); st.push(0); });
    return { bits: tx, stuff: st, n: tx.length, nStuff: st.reduce(function (a, b) { return a + b; }, 0), crc: crc, campuri: { sof: 1, id: 11, ctl: 6, data: 8 * dlc, crc: 15 } };
  }
  /** codarea semnalelor (DBC din Tabelul 10.1) */
  function codMotor(rpm, T) { var raw = Math.max(0, Math.min(65535, Math.round(rpm / 0.25))), t = Math.max(0, Math.min(255, Math.round(T) + 40)); return [raw & 255, raw >> 8, t, 0, 0, 0, 0, 0]; }
  function codPedala(p) { var raw = Math.max(0, Math.min(250, Math.round(p / 0.4))); return [raw, 0, 0, 0, 0, 0, 0, 0]; }
  function decMotor(d) { return { rpm: (d[0] + 256 * d[1]) * 0.25, T: d[2] - 40 }; }
  function decPedala(d) { return { p: d[0] * 0.4 }; }
  function hex(d) { return d.map(function (b) { return ("0" + b.toString(16).toUpperCase()).slice(-2); }).join(" "); }
  function parseHex(s) { return String(s || "").trim().split(/[\s,;]+/).filter(Boolean).map(function (x) { return parseInt(x, 16); }).filter(function (x) { return isFinite(x); }); }
  /** rezistența CAN-H – CAN-L cu alimentarea oprită */
  function rezistenta(pr, termA, termC) { var a = termA ? pr.RA : Infinity, c = termC ? pr.RC : Infinity, p = 1 / ((isFinite(a) ? 1 / a : 0) + (isFinite(c) ? 1 / c : 0)); return isFinite(p) ? p + pr.Rcab : Infinity; }
  /** încărcarea [%] pentru cadrele de nC8 / nB4 biți (fără IFS), la 10 / 20 ms */
  function incarcare(nC8, nB4, fbit) { return ((nC8 + IFS) / MSG.C8.per + (nB4 + IFS) / MSG.B4.per) / (fbit || FBIT) * 100; }
  function incarcareTipica(nmsg, biti, per, fbit) { return nmsg * biti / per / fbit * 100; }

  /** prelucrarea tabelelor (identică în aplicație și pe server) */
  function prelucreaza(t, date, U) {
    var n = function (v) { return U.num(v); }, T1 = t.t101 || {}, T2 = t.t102 || {}, fbit = n(date.fbit) || FBIT, o = {};
    var dm = parseHex((T1.rpm || {}).oct), dp = parseHex((T1.poz || {}).oct);
    var dt = parseHex((T1.temp || {}).oct); if (dt.length < 3) dt = dm;
    o.rpm = dm.length >= 2 ? (dm[0] + 256 * dm[1]) * 0.25 : NaN; o.T = dt.length >= 3 ? dt[2] - 40 : NaN; o.brutRpm = dm.length >= 2 ? dm[0] + 256 * dm[1] : NaN; o.brutT = dt.length >= 3 ? dt[2] : NaN; o.brutP = dp.length >= 1 ? dp[0] : NaN; o.p = dp.length >= 1 ? dp[0] * 0.4 : NaN;
    o.nC8c = dm.length === 8 ? cadru(MSG.C8.id, dm).n : NaN; o.nB4c = dp.length === 8 ? cadru(MSG.B4.id, dp).n : NaN;
    o.tbit = 1e6 / fbit;
    var nC8 = n((T2.nC8 || {}).mas), nB4 = n((T2.nB4 || {}).mas);
    o.S = isFinite(nC8) && isFinite(nB4) ? incarcare(nC8, nB4, fbit) : NaN; o.nC8 = nC8; o.Smas = n((T2.S || {}).mas);
    return o;
  }
  function asteptate(o) { return { q1: (0x40 + 256 * 0x1F) * 0.25, q2: incarcareTipica(20, 125, 0.010, FBIT), q3: o.nC8, q4: o.S }; }

  function verifica(d, pr, U) {
    var out = { incompatibile: 0, faraCitire: 0, corecte: 0, total: 4, motive: [], detalii: {} };
    var log = d.log || [], t = d.tabele || {};
    var ap = function (a, b, tolAbs, tolRel) { a = Number(a); return isFinite(a) && Math.abs(a - b) <= (tolAbs || 0) + Math.abs(b) * (tolRel || 0); };
    var same = function (a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); };
    log.forEach(function (l) {
      var ok = true;
      if (l.m === "r") ok = ap(l.r, rezistenta(pr, l.ta, l.tc), 0.6);
      else if (l.m === "dbc") { var dd = parseHex(l.oct); ok = l.k === "poz" ? same(dd, codPedala(Number(l.src))) : same(dd, codMotor(Number(l.rpm), Number(l.T))) && dd.length === 8; }
      else if (l.m === "osc") { var fr = cadru(Number(l.id), parseHex(l.oct)); ok = Number(l.n) === fr.n && ap(l.tf, fr.n * 1e6 / FBIT, 0.2) && ap(l.tbit, 1e6 / FBIT, 0.02); }
      else if (l.m === "load") ok = ap(l.S, incarcare(Number(l.nC8), Number(l.nB4)), 0.05, 0.01);
      else if (l.m === "def") { var e = Number(l.err);
        ok = l.k === "canl" ? e === 32 && Number(l.nB4) <= 1 && ap(l.nC8, 100, 2) : e === 0 && ap(l.nC8, 100, 2) && ap(l.nB4, 50, 2); }
      if (!ok) out.incompatibile++;
    });
    var areCit = function (fn) { return log.some(fn); }, eq = function (a, b, e) { return Math.abs(Number(a) - Number(b)) <= (e || 0.0006); };
    var T1 = t.t101 || {}, T2 = t.t102 || {}, T3 = t.t103 || {};
    ["rpm", "temp", "poz"].forEach(function (k) { var v = (T1[k] || {}).oct; if (v && !areCit(function (l) { return l.m === "dbc" && (l.k === k || (k === "temp" && l.k === "rpm")) && hex(parseHex(l.oct)) === hex(parseHex(v)); })) out.faraCitire++; });
    [["nC8", "osc", "n"], ["R", "r", "r"], ["S", "load", "S"]].forEach(function (z) { var v = U.num((T2[z[0]] || {}).mas); if (isFinite(v) && !areCit(function (l) { return l.m === z[1] && eq(l[z[2]], v, 0.06); })) out.faraCitire++; });
    ["sim", "term", "canl"].forEach(function (k) { var v = U.num((T3[k] || {}).err); if (isFinite(v) && !areCit(function (l) { return l.m === "def" && l.k === k && eq(l.err, v, 0.5); })) out.faraCitire++; });
    var o = prelucreaza(t, d.date || {}, U), a = asteptate(o), rasp = d.raspunsuri || {};
    var tol = { q1: [0, 0.01], q2: [0, 0.05], q3: [0, 0.5], q4: [0.01, 0.02] };
    Object.keys(a).forEach(function (k) {
      var v = U.num(rasp[k]), ok = isFinite(v) && isFinite(a[k]) && Math.abs(v - a[k]) <= Math.abs(a[k]) * tol[k][0] + tol[k][1];
      if (ok) out.corecte++;
      out.detalii[k] = { raspuns: rasp[k], asteptat: isFinite(a[k]) ? Math.round(a[k] * 1000) / 1000 : "—", corect: ok };
    });
    out.principal = { eticheta: "încărcarea magistralei [%]", valoare: isFinite(o.S) ? Math.round(o.S * 1000) / 1000 : "" };
    return out;
  }
  return { FBIT: FBIT, MSG: MSG, IFS: IFS, ERRBITS: ERRBITS, OBS: OBS, parametri: parametri, crc15: crc15, cadru: cadru, codMotor: codMotor, codPedala: codPedala, decMotor: decMotor, decPedala: decPedala,
    hex: hex, parseHex: parseHex, rezistenta: rezistenta, incarcare: incarcare, incarcareTipica: incarcareTipica, prelucreaza: prelucreaza, asteptate: asteptate, verifica: verifica };
})();
