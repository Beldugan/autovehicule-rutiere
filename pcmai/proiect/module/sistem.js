/* Modulul S – simulatorul intern de sistem (nivelul A, reper didactic): vehiculul pe ciclu, lanțurile BEV / MHEV P0 /
   HEV P2 / serie / serie-paralel (planetar) / PHEV CD–CS, motocicleta electrică; modelele de baterie (stoc ideal, U_oc–R_int).
   Ecuațiile și valorile adoptate sunt cele ale ghidului de reproducere (secțiunile 11–20, 23–24); convenția: puterea și curentul
   bateriei sunt pozitive la descărcare. Toate simulările sunt cvasistatice cu viteză impusă, cu excepția modelului cu conducător
   (BEV, motocicletă electrică), integrat în timp cu regulator PI și limitele de cuplu / putere. */

export const G = 9.81;
export const PUNCTE_120 = [[0, 0], [10, 0], [30, 50], [70, 50], [90, 0], [120, 0]];
/** ciclul didactic de 120 s: viteza [m/s] la pasul dt; puncte = [[t, v km/h]] */
export function ciclu(dt = 0.1, puncte = PUNCTE_120, rep = 1) {
  const T = puncte[puncte.length - 1][0], n = Math.round(T / dt), t = [], v = [];
  for (let r = 0; r < rep; r++) for (let k = 0; k < (r === rep - 1 ? n + 1 : n); k++) {
    const tt = k * dt; let j = 1; while (j < puncte.length - 1 && puncte[j][0] < tt) j++;
    const [t0, v0] = puncte[j - 1], [t1, v1] = puncte[j]; t.push(r * T + tt); v.push(((v0 + ((tt - t0) * (v1 - v0)) / (t1 - t0)) / 3.6));
  }
  return { t, v, dt };
}
/** forța la roată: F = m·a + m·g·Crr·cos θ + m·g·sin θ + ρ·CdA·v²/2 (rularea numai în mișcare) */
export function forta(veh, v, a, panta = 0) {
  const th = Math.atan(panta / 100);
  return veh.m * a + (v > 1e-6 ? veh.m * G * veh.Crr * Math.cos(th) : 0) + veh.m * G * Math.sin(th) + 0.5 * veh.rho * veh.CdA * v * v;
}

/* ------------------------------------------------------------------ bateria */
/** modelul rezistiv: U = U_oc − I·R_int; I = [U_oc − √(U_oc² − 4R·P)]/(2R); discriminant negativ = cerere imposibilă */
export function curentBaterie(Uoc, Rint, P) {
  const d = Uoc * Uoc - 4 * Rint * P;
  if (d < 0) return { ok: false, I: Uoc / (2 * Rint), U: Uoc / 2, Pp: (Uoc * Uoc) / (4 * Rint) };
  const I = (Uoc - Math.sqrt(d)) / (2 * Rint);
  return { ok: true, I, U: Uoc - I * Rint, Pp: I * I * Rint };
}

/* ------------------------------------------------------------------ valorile adoptate în ghid */
export const DATE = {
  BEV: { m: 1600, Crr: 0.01, CdA: 0.65, rho: 1.225, Rw: 0.3, eta_tr: 0.9, eta_reg: 0.7, E: 60, SOC0: 0.8, SOCmin: 0.2, SOCmax: 0.9, aux: 1000, Pdis: 100e3, Pchg: 40e3,
    i: 9, T_em: 250, P_em: 100e3, n_em: 12000, Uoc: 400, Rint: 0.1, Q: 150, Imin: -100, Imax: 300 },
  MOTO_E: { m: 220, Crr: 0.015, CdA: 0.45, rho: 1.225, Rw: 0.28, eta_tr: 0.88, eta_reg: 0.6, E: 5, SOC0: 0.9, SOCmin: 0.2, SOCmax: 0.9, aux: 200, Pdis: 18e3, Pchg: 5e3,
    i: 6, T_em: 50, P_em: 15e3, n_em: 10000 },
  MHEV: { m: 1600, Crr: 0.01, CdA: 0.65, rho: 1.225, Rw: 0.3, i: 8, eta_tr: 0.95, P_ice: 80e3, T_ice: 180, n_ice: 6000, n_idle: 1000, eta_ice: 0.32, Hi: 43e6,
    P_em: 10e3, T_em: 50, n_em: 15000, kc: 2.5, eta_em: 0.9, eta_c: 0.95, U: 48, E: 0.5, SOC0: 0.6, SOCmin: 0.4, SOCmax: 0.8, Ilim: 250, aux: 500 },
  P2: { m: 1600, Crr: 0.01, CdA: 0.65, rho: 1.225, Rw: 0.3, i: 8, eta_tr: 0.95, P_ice: 80e3, T_ice: 180, n_ice: 6000, n_idle: 1000, eta_ice: 0.32, Hi: 43e6,
    P_em: 50e3, T_em: 150, n_em: 12000, eta_em: 0.9, E: 1.5, SOC0: 0.6, SOCmin: 0.4, SOCmax: 0.8, Pbat: 50e3, aux: 1000, P_ev: 15e3, socOn: 0.5, socOff: 0.6, P_inc: 5e3 },
  S: { m: 1600, Crr: 0.01, CdA: 0.65, rho: 1.225, Rw: 0.3, P_ice: 60e3, eta_ice: 0.32, Hi: 43e6, eta_gen: 0.9, eta_em: 0.9, eta_red: 0.95, E: 2, SOC0: 0.6, SOCmin: 0.4, SOCmax: 0.8,
    Pbat: 40e3, aux: 1000, P_em: 80e3, T_em: 250, n_em: 12000, i: 9, socOn: 0.5, socOff: 0.65, P_on: 30e3, eta_reg: 0.7 },
  PS: { m: 1600, Crr: 0.01, CdA: 0.65, rho: 1.225, Rw: 0.3, Ns: 30, Nr: 78, Np: 24, i_f: 3.267, eta_tr: 0.95, P_ice: 80e3, eta_ice: 0.32, Hi: 43e6,
    mg1: { P: 30e3, T: 60, n: 10000 }, mg2: { P: 50e3, T: 150, n: 12000 }, eta_mg: 0.9, E: 1.5, SOC0: 0.6, SOCmin: 0.4, SOCmax: 0.8, Pbat: 50e3, aux: 1000, P_ev: 12e3 },
  PHEV: { m: 1600, Crr: 0.01, CdA: 0.65, rho: 1.225, Rw: 0.3, i: 8, eta_tr: 0.95, P_ice: 80e3, T_ice: 180, n_ice: 6000, n_idle: 1000, eta_ice: 0.32, Hi: 43e6,
    P_em: 80e3, T_em: 250, n_em: 12000, eta_em: 0.9, E: 15, SOC0: 0.9, SOCmin: 0.2, SOCmax: 0.9, Pdis: 80e3, Pchg: 40e3, aux: 1000, socCS: 0.25, csLo: 0.25, csHi: 0.3, P_inc: 10e3, P_ev_cd: 60e3, P_ev_cs: 12e3, eta_grid: 0.9 },
  RHO_B: 745
};

/* ------------------------------------------------------------------ teste de echilibru (puncte staționare) */
export function testBEV50(d = DATE.BEV, vkmh = 50) {
  const v = vkmh / 3.6, F = forta(d, v, 0), Pw = F * v, Pb = Pw / d.eta_tr + d.aux, e = (Pb / v) / 3.6e6 * 1e5; // kWh/100 km
  const Edisp = d.E * (d.SOCmax - d.SOCmin);
  return { F, Pw, Pb, e, E10: e / 10, Edisp, R: (Edisp / e) * 100 };
}
export function testBaterie20(d = DATE.BEV, P = 20e3) { const b = curentBaterie(d.Uoc, d.Rint, P); return Object.assign(b, { P }); }
export function testIncarcare(E = 60, s0 = 0.2, s1 = 0.8, Pr = 7.2, eta = 0.9) { const Es = E * (s1 - s0), Er = Es / eta; return { Es, Er, t: Er / Pr }; }
export function testMHEV(d = DATE.MHEV) {
  const Pe = d.P_em / d.eta_em, I = Pe / d.U, It = (Pe + d.aux) / d.U, nEM = 1000 * d.kc, Plim = (d.T_em * nEM * Math.PI) / 30, nx = (d.P_em / d.T_em) * 30 / Math.PI;
  return { Pe, I, It, rez: d.Ilim - It, nEM, Plim, nx };
}
export function testP2(n = 2000, P = 20e3, Pice = 15e3, d = DATE.P2) {
  const w = (n * Math.PI) / 30, Ti = Pice / w, Te = (P - Pice) / w;
  return { Ti, Te, T: Ti + Te, Pel: (P - Pice) / d.eta_em, mf: (Pice / (d.eta_ice * d.Hi)) * 3600 };
}
export function testSerie(Pw = 20e3, d = DATE.S) {
  const Pdc = Pw / (d.eta_red * d.eta_em), Pdca = Pdc + d.aux, Pice = Pdca / d.eta_gen, mf = (Pice / (d.eta_ice * d.Hi)) * 3600;
  return { Pdc, Pdca, Pice, mf, eta: d.eta_ice * d.eta_gen * d.eta_em * d.eta_red };
}
export function testPHEV(d = DATE.PHEV, e_km = 0.18, Pr = 7.2) { const E = d.E * (d.SOCmax - d.socCS), km = E / e_km, Er = E / d.eta_grid; return { E, km, Er, t: Er / Pr }; }
export function testMAC(m_mg = 20, i = 4, n = 2000) { const mdot = (m_mg * 1e-6 * i * n) / 120; return { mdot, kgh: mdot * 3600, us: 1e6 / ((n / 60) * 360), inj1ms: (n / 60) * 360 * 1e-3 }; }
export function testMotoTreapta(n = 6000, ip = 3, ig = 1, i0 = 3, Rw = 0.3) { const it = ip * ig * i0, nr = n / it, v = (nr * Math.PI) / 30 * Rw * 3.6; return { it, nr, v }; }
export function testMotoE(d = DATE.MOTO_E) { return testBEV50(d); }

/* ------------------------------------------------------------------ BEV / motocicletă electrică cu viteză impusă și stoc ideal */
export function simElectricImpus(d, cyc, o = {}) {
  const { t, v, dt } = cyc, N = t.length, regen = o.regen !== false, aux = o.aux ?? d.aux;
  const H = { t, v: v.map((x) => x * 3.6), Pw: [], Pb: [], soc: [], Efr: [], lim: [] };
  let E = 0, Eneg = 0, Efr = 0, dist = 0, soc = d.SOC0, nLim = 0;
  for (let k = 0; k < N; k++) {
    const vm = k < N - 1 ? (v[k] + v[k + 1]) / 2 : v[k], a = k < N - 1 ? (v[k + 1] - v[k]) / dt : 0;
    const F = forta(d, vm, a), Pw = F * vm;
    let Pb, lim = 0;
    if (Pw >= 0) { Pb = Pw / d.eta_tr; if (Pb > d.Pdis) { lim = 1; nLim++; } }
    else { const Pr = regen ? d.eta_reg * Pw : 0, Prl = Math.max(Pr, -d.Pchg); Pb = Prl; Efr += regen ? (Prl - Pr) / d.eta_reg * -1 * dt : -Pw * dt; }
    Pb += aux;
    if (k < N - 1) { E += Pb * dt; if (Pb < 0) Eneg += Pb * dt; dist += vm * dt; soc = d.SOC0 - E / 3.6e6 / d.E; }
    H.Pw.push(Pw / 1e3); H.Pb.push(Pb / 1e3); H.soc.push(soc); H.Efr.push(Efr / 3.6e6); H.lim.push(lim);
  }
  return { H, E_kWh: E / 3.6e6, Ereg_kWh: -Eneg / 3.6e6, Efr_kWh: Efr / 3.6e6, dist_km: dist / 1e3, e100: E / 3.6e6 / (dist / 1e5), socF: soc, nLim };
}

/* ------------------------------------------------------------------ BEV / motocicletă electrică cu conducător (model dinamic, înainte) */
export function simElectricDinamic(d, cyc, o = {}) {
  const { t, v: vr, dt } = cyc, N = t.length, Kp = o.Kp ?? 4000, Ki = o.Ki ?? 800, rez = o.rezistiva && d.Uoc;
  const H = { t, vr: vr.map((x) => x * 3.6), v: [], T: [], n: [], Pb: [], soc: [], I: [], U: [], Fbr: [], lim: [] };
  let v = 0, ie = 0, soc = d.SOC0, E = 0, dist = 0, eMax = 0, nLim = 0, Efr = 0;
  for (let k = 0; k < N; k++) {
    const aRef = k < N - 1 ? (vr[k + 1] - vr[k]) / dt : 0, e = vr[k] - v;
    // cererea de forță: anticipare (m·a_ref + rezistențe) + PI pe eroarea de viteză
    let Fc = forta(d, Math.max(v, 0), aRef) + Kp * e + Ki * ie;
    if (vr[k] <= 1e-6 && v <= 0.05) { Fc = 0; ie = 0; }
    const w = (Math.max(v, 0) / d.Rw) * d.i, n = (w * 30) / Math.PI;
    const Tmax = Math.min(d.T_em, d.P_em / Math.max(w, 1e-3)), Pchg = d.Pchg ?? d.Pdis;
    let T = (Fc * d.Rw) / (d.i * (Fc >= 0 ? d.eta_tr : 1)), Fbr = 0, lim = 0;
    if (T > Tmax) { T = Tmax; lim = 1; }
    let Pw, Pb;
    if (T >= 0) { Pw = (T * d.i * d.eta_tr) / d.Rw * v; Pb = Pw / d.eta_tr; if (Pb > d.Pdis) { lim = 1; Pb = d.Pdis; T = (Pb * d.eta_tr) / Math.max(v, 1e-3) * d.Rw / (d.i * d.eta_tr); } }
    else {
      // frânare: recuperare limitată de cuplul EM, puterea de încărcare și randamentul; restul – frâna mecanică
      const Fdem = (T * d.i) / d.Rw, Tr = Math.max(T, -Tmax), Fr = (Tr * d.i) / d.Rw;
      const Prw = Fr * v, Prb = Math.max(d.eta_reg * Prw, -Pchg), Frl = v > 0.1 ? Prb / d.eta_reg / v : 0;
      Fbr = Frl - Fdem; Pb = Prb; Pw = Frl * v; T = (Frl * d.Rw) / d.i; Efr += Fbr * v * dt;
    }
    Pb += d.aux;
    let I = 0, U = 0;
    if (rez) { const b = curentBaterie(d.Uoc, d.Rint, Pb); I = b.I; U = b.U; if (!b.ok || I > d.Imax || I < d.Imin) lim = 1; }
    const Fmot = T >= 0 ? (T * d.i * d.eta_tr) / d.Rw : (T * d.i) / d.Rw;
    const Fbrk = T >= 0 ? 0 : Fbr;
    const acc = (Fmot - Fbrk - (forta(d, Math.max(v, 0), 0))) / d.m;
    if (k < N - 1) {
      const v1 = Math.max(0, v + acc * dt); dist += ((v + v1) / 2) * dt; v = v1; ie += e * dt;
      E += Pb * dt; if (rez) soc -= (I * dt) / (3600 * d.Q); else soc = d.SOC0 - E / 3.6e6 / d.E;
    }
    eMax = Math.max(eMax, Math.abs(e) * 3.6); if (lim) nLim++;
    H.v.push(v * 3.6); H.T.push(T); H.n.push(n); H.Pb.push(Pb / 1e3); H.soc.push(soc); H.I.push(I); H.U.push(U); H.Fbr.push(Fbr); H.lim.push(lim);
  }
  return { H, E_kWh: E / 3.6e6, dist_km: dist / 1e3, e100: E / 3.6e6 / (dist / 1e5), eMax, nLim, socF: soc, Efr_kWh: Efr / 3.6e6 };
}

/* ------------------------------------------------------------------ hibride (viteză impusă) */
// turația arborelui (termic / EM P2) din viteza vehiculului; sub turația minimă: lansare cu ambreiajul patinând (n = n_idle)
const nArbore = (d, v) => ((v / d.Rw) * d.i * 30) / Math.PI;

/** MHEV P0 (starter-generator pe curea), ghid §16 */
export function simMHEV(d, cyc, o = {}) {
  const { t, v, dt } = cyc, N = t.length, asist = o.asistenta !== false;
  const H = { t, v: v.map((x) => x * 3.6), Pice: [], Pem: [], Pb: [], soc: [], I: [], mod: [], n: [] };
  let soc = d.SOC0, fuel = 0, Eb = 0, dist = 0, Imax = 0;
  for (let k = 0; k < N; k++) {
    const vm = k < N - 1 ? (v[k] + v[k + 1]) / 2 : v[k], a = k < N - 1 ? (v[k + 1] - v[k]) / dt : 0;
    const Pw = forta(d, vm, a) * vm, nS = nArbore(d, vm), n = Math.max(nS, vm > 0.05 ? d.n_idle : 0), wI = (n * Math.PI) / 30, wE = wI * d.kc;
    let Pice = 0, Pem = 0, mod = "oprit";
    const Pmec = Pw >= 0 ? (Pw / d.eta_tr) * (nS < d.n_idle && vm > 0.05 ? d.n_idle / Math.max(nS, 1) : 1) : Pw * d.eta_tr; // la lansare: pierderea prin patinare
    if (Pmec > 0) {
      const PemMax = Math.min(d.P_em, d.T_em * wE, d.Ilim * d.U * d.eta_em - d.aux * d.eta_em);
      if (asist && soc > 0.45 && Pmec > 20e3) { Pem = Math.min(PemMax, Pmec - 20e3, d.P_em) / 1; mod = "asistență"; }
      Pice = Math.min(Pmec - Pem, Math.min(d.P_ice, d.T_ice * wI)); if (mod === "oprit") mod = "termic";
    } else if (Pmec < 0) {
      if (soc < 0.8) { Pem = -Math.min(d.P_em, d.T_em * wE, -Pmec); mod = "recuperare"; } else mod = "frână";
    }
    // puterea electrică (curea η_c pe calea mecanică a EM)
    const Pel = Pem >= 0 ? Pem / (d.eta_em * d.eta_c) : Pem * d.eta_em * d.eta_c, Pb = Pel + d.aux, I = Pb / d.U;
    if (k < N - 1) { soc -= (Pb * dt) / 3.6e6 / d.E; fuel += (Pice / (d.eta_ice * d.Hi)) * dt; Eb += Pb * dt; dist += vm * dt; }
    Imax = Math.max(Imax, Math.abs(I));
    H.Pice.push(Pice / 1e3); H.Pem.push(Pem / 1e3); H.Pb.push(Pb / 1e3); H.soc.push(soc); H.I.push(I); H.mod.push(mod); H.n.push(n);
  }
  return { H, fuel_kg: fuel, Eb_kWh: Eb / 3.6e6, dist_km: dist / 1e3, socF: soc, Imax, kg100: fuel / (dist / 1e5) };
}

/** HEV paralel P2 cu ambreiajul K0 și EMS pe reguli cu histerezis, ghid §17 */
export function simP2(d, cyc, o = {}) {
  const { t, v, dt } = cyc, N = t.length;
  const H = { t, v: v.map((x) => x * 3.6), Pice: [], Pem: [], Pb: [], soc: [], mod: [], K0: [], n: [] };
  let soc = o.soc0 ?? d.SOC0, rein = false, fuel = 0, Eb = 0, dist = 0, nPorniri = 0, ultimMod = "EV";
  for (let k = 0; k < N; k++) {
    const vm = k < N - 1 ? (v[k] + v[k + 1]) / 2 : v[k], a = k < N - 1 ? (v[k + 1] - v[k]) / dt : 0;
    const Pw = forta(d, vm, a) * vm, n = nArbore(d, vm), w = (n * Math.PI) / 30;
    if (soc <= d.socOn) rein = true; if (soc >= d.socOff) rein = false;
    const Pmec = Pw >= 0 ? Pw / d.eta_tr : Pw * d.eta_tr;
    const PemMax = Math.min(d.P_em, d.T_em * Math.max(w, 1e-3)), PbMax = soc > d.SOCmin ? d.Pbat : 0;
    let Pice = 0, Pem = 0, mod = "EV", K0 = 0;
    if (Pmec >= 0) {
      const ev = Pmec <= d.P_ev && soc > d.socOn && !rein && Pmec <= PemMax && (Pmec / d.eta_em + d.aux) <= PbMax;
      if (ev || n < d.n_idle) {
        Pem = Math.min(Pmec, PemMax); mod = Pmec > 0 ? "EV" : "oprit";
        if (Pem < Pmec) { Pice = (Pmec - Pem) * (n < d.n_idle ? d.n_idle / Math.max(n, 1) : 1); mod = "lansare (K0 patinează)"; K0 = 0.5; }
      } else {
        const PiceMax = Math.min(d.P_ice, d.T_ice * w), cer = Pmec + (rein && soc < d.SOCmax ? d.P_inc : 0);
        Pice = Math.min(cer, PiceMax); Pem = Pmec - Pice; K0 = 1;
        if (Pem > PemMax) Pem = PemMax; if (Pem < -PemMax) { Pem = -PemMax; Pice = Pmec - Pem; }
        mod = Pem > 1 ? "termic + asistență EM" : Pem < -1 ? "termic + încărcare" : "termic";
      }
    } else { // frânare: recuperare în limitele EM și ale bateriei (K0 deschis)
      Pem = soc < d.SOCmax ? Math.max(Pmec, -PemMax, -d.Pbat * d.eta_em) : 0; mod = Pem < 0 ? "recuperare" : "frână"; }
    if (mod.startsWith("termic") && !ultimMod.startsWith("termic")) nPorniri++; ultimMod = mod;
    const Pb = (Pem >= 0 ? Pem / d.eta_em : Pem * d.eta_em) + d.aux;
    if (k < N - 1) { soc -= (Pb * dt) / 3.6e6 / d.E; fuel += (Pice / (d.eta_ice * d.Hi)) * dt; Eb += Pb * dt; dist += vm * dt; }
    H.Pice.push(Pice / 1e3); H.Pem.push(Pem / 1e3); H.Pb.push(Pb / 1e3); H.soc.push(soc); H.mod.push(mod); H.K0.push(K0); H.n.push(Pice > 0 ? Math.max(n, d.n_idle) : 0);
  }
  return { H, fuel_kg: fuel, Eb_kWh: Eb / 3.6e6, dist_km: dist / 1e3, socF: soc, soc0: o.soc0 ?? d.SOC0, nPorniri, kg100: fuel / (dist / 1e5) };
}

/** hibrid serie: grup electrogen cu termostat pe SOC, ghid §18 */
export function simSerie(d, cyc, o = {}) {
  const { t, v, dt } = cyc, N = t.length;
  const H = { t, v: v.map((x) => x * 3.6), Pice: [], Pgen: [], Pem: [], Pb: [], soc: [], on: [] };
  let soc = o.soc0 ?? d.SOC0, on = false, fuel = 0, Eb = 0, dist = 0, nLim = 0, nPorniri = 0;
  for (let k = 0; k < N; k++) {
    const vm = k < N - 1 ? (v[k] + v[k + 1]) / 2 : v[k], a = k < N - 1 ? (v[k + 1] - v[k]) / dt : 0;
    const Pw = forta(d, vm, a) * vm;
    if (!on && soc <= d.socOn) { on = true; nPorniri++; } if (on && soc >= d.socOff) on = false;
    const Pdc = Pw >= 0 ? Pw / (d.eta_red * d.eta_em) : Math.max(Pw * d.eta_red * d.eta_em, -d.Pbat);
    const Pnec = Pdc + d.aux;
    let Pice = on ? d.P_on : 0, Pgen = Pice * d.eta_gen;
    // bateria nu poate absorbi surplusul peste limita de încărcare: se reduce generatorul (nu se creează consum fictiv)
    if (Pgen - Pnec > d.Pbat) { Pgen = Pnec + d.Pbat; Pice = Pgen / d.eta_gen; }
    let Pb = Pnec - Pgen; if (Pb > d.Pbat) { nLim++; Pb = d.Pbat; }
    if (k < N - 1) { soc -= (Pb * dt) / 3.6e6 / d.E; fuel += (Pice / (d.eta_ice * d.Hi)) * dt; Eb += Pb * dt; dist += vm * dt; }
    H.Pice.push(Pice / 1e3); H.Pgen.push(Pgen / 1e3); H.Pem.push(Pdc / 1e3); H.Pb.push(Pb / 1e3); H.soc.push(soc); H.on.push(on ? 1 : 0);
  }
  return { H, fuel_kg: fuel, Eb_kWh: Eb / 3.6e6, dist_km: dist / 1e3, socF: soc, nLim, nPorniri, kg100: fuel / (dist / 1e5) };
}

/** serie-paralel cu planetar (termic pe port-sateliți, MG1 pe soare, MG2 și ieșirea pe coroană), ghid §19.
    Strategia adoptată (documentată): EV sub P_ev cu SOC > 0,45; altfel termicul pe linia de randament n_c = 1100 + 45·P[kW] rot/min,
    puterea termicului = cererea + corecția SOC; MG1 impune turația termicului (Willis), MG2 completează cuplul la coroană. */
export function simPS(d, cyc, o = {}) {
  const { t, v, dt } = cyc, N = t.length, k = d.Nr / d.Ns, ws = (n) => (n * Math.PI) / 30;
  const H = { t, v: v.map((x) => x * 3.6), Pice: [], P1: [], P2: [], Pb: [], soc: [], nc: [], ns: [], nr: [], mod: [] };
  let soc = o.soc0 ?? d.SOC0, fuel = 0, Eb = 0, dist = 0, viol = 0, maxDC = 0;
  for (let j = 0; j < N; j++) {
    const vm = j < N - 1 ? (v[j] + v[j + 1]) / 2 : v[j], a = j < N - 1 ? (v[j + 1] - v[j]) / dt : 0;
    const Pw = forta(d, vm, a) * vm, nr = ((vm / d.Rw) * d.i_f * 30) / Math.PI, wr = ws(nr);
    const Pring = Pw >= 0 ? Pw / d.eta_tr : Pw * d.eta_tr, Tring = wr > 1e-3 ? Pring / wr : 0;
    let Pice = 0, nc = 0, Tc = 0, mod;
    const corr = (0.6 - soc) * 40e3;
    if (Pring > 0 && (Pring > d.P_ev || soc < 0.45)) { Pice = Math.min(d.P_ice, Math.max(5e3, Pring + corr)); nc = 1100 + 45 * (Pice / 1e3); Tc = Pice / ws(nc); mod = "power-split"; }
    else mod = Pring > 0 ? "EV (MG2)" : Pring < 0 ? "recuperare (MG2)" : "oprit";
    const ns = (1 + k) * nc - k * nr, Ts = (-Tc * d.Ns) / (d.Ns + d.Nr), Tr_c = (Tc * d.Nr) / (d.Ns + d.Nr);
    const P1 = Ts * ws(ns), T2 = Tring - Tr_c, P2 = T2 * wr;
    const el = (P) => (P >= 0 ? P / d.eta_mg : P * d.eta_mg), Pb = el(P1) + el(P2) + d.aux; // P1 = Ts·ωs: puterea livrată de MG1 în planetar (negativă = MG1 generează)
    // limite (se raportează: strategia de nivel A nu redistribuie automat)
    if (Math.abs(ns) > d.mg1.n || Math.abs(Ts) > d.mg1.T || Math.abs(P1) > d.mg1.P || Math.abs(T2) > d.mg2.T || Math.abs(P2) > d.mg2.P) viol++;
    maxDC = Math.max(maxDC, Math.abs(Pb));
    if (j < N - 1) { soc -= (Pb * dt) / 3.6e6 / d.E; fuel += (Pice / (d.eta_ice * d.Hi)) * dt; Eb += Pb * dt; dist += vm * dt; }
    H.Pice.push(Pice / 1e3); H.P1.push(P1 / 1e3); H.P2.push(P2 / 1e3); H.Pb.push(Pb / 1e3); H.soc.push(soc); H.nc.push(nc); H.ns.push(ns); H.nr.push(nr); H.mod.push(mod);
  }
  return { H, fuel_kg: fuel, Eb_kWh: Eb / 3.6e6, dist_km: dist / 1e3, socF: soc, viol, maxDC, kg100: fuel / (dist / 1e5) };
}

/** PHEV pe topologia P2: CD până la SOC ≤ 0,25, apoi CS în banda 0,25–0,30; ciclul de 120 s se repetă până la regimul CS, ghid §20 */
export function simPHEV(d, o = {}) {
  const dt = o.dt || 0.5, c = ciclu(dt), soc0 = o.soc0 ?? d.SOC0, Nmax = o.Nmax || 400, csCicluri = o.csCicluri ?? 3;
  let soc = soc0, cs = soc <= d.socCS, rein = false, fuel = 0, Eb = 0, dist = 0, rep = 0, repCS = 0, distCD = 0, EbCD = 0;
  const S = { t: [], soc: [], Pice: [], Pem: [], mod: [] };
  for (; rep < Nmax; rep++) {
    let fc = 0;
    for (let k = 0; k < c.t.length - 1; k++) {
      const vm = (c.v[k] + c.v[k + 1]) / 2, a = (c.v[k + 1] - c.v[k]) / dt, Pw = forta(d, vm, a) * vm, n = nArbore(d, vm), w = (n * Math.PI) / 30;
      const Pmec = Pw >= 0 ? Pw / d.eta_tr : Pw * d.eta_tr, PemMax = Math.min(d.P_em, d.T_em * Math.max(w, 1e-3));
      if (!cs && soc <= d.socCS) cs = true;
      if (cs) { if (soc <= d.csLo) rein = true; if (soc >= d.csHi) rein = false; }
      let Pice = 0, Pem = 0, mod;
      if (Pmec >= 0) {
        const Pev = cs ? d.P_ev_cs : d.P_ev_cd, ev = (Pmec <= Math.min(Pev, PemMax) && !rein) || n < d.n_idle;
        if (ev) { Pem = Math.min(Pmec, PemMax); Pice = Pmec - Pem; mod = cs ? "CS · EV" : "CD · EV"; }
        else { const PiceMax = Math.min(d.P_ice, d.T_ice * w); Pice = Math.min(Pmec + (rein ? d.P_inc : 0), PiceMax); Pem = Pmec - Pice; mod = cs ? "CS · termic" : "CD · termic"; }
      } else { Pem = soc < d.SOCmax ? Math.max(Pmec, -PemMax, -d.Pchg * d.eta_em) : 0; mod = "recuperare"; }
      const Pb = (Pem >= 0 ? Pem / d.eta_em : Pem * d.eta_em) + d.aux;
      soc -= (Pb * dt) / 3.6e6 / d.E; fuel += (Pice / (d.eta_ice * d.Hi)) * dt; fc += Pice; Eb += Pb * dt; dist += vm * dt;
      if (!cs) { distCD += vm * dt; EbCD += Pb * dt; }
      if (k % 20 === 0) { S.t.push(rep * 120 + c.t[k]); S.soc.push(soc); S.Pice.push(Pice / 1e3); S.Pem.push(Pem / 1e3); S.mod.push(mod); }
    }
    if (cs) { repCS++; if (repCS >= csCicluri) { rep++; break; } }
  }
  const Eret = Math.max(0, (soc0 - soc) * d.E);
  return { S, rep, dist_km: dist / 1e3, distCD_km: distCD / 1e3, fuel_kg: fuel, Eb_kWh: Eb / 3.6e6, EbCD_kWh: EbCD / 3.6e6, socF: soc, Eretea_kWh: Eret / d.eta_grid, cs };
}

/* ------------------------------------------------------------------ convergența la înjumătățirea pasului */
export function convergenta(fn, dt = 0.1) {
  const a = fn(ciclu(dt)), b = fn(ciclu(dt / 2));
  return { a, b, var: (x) => Math.abs(x(a) - x(b)) / Math.max(1e-12, Math.abs(x(b))) * 100 };
}
