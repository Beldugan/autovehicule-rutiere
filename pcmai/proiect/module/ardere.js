/* Modelele de ardere ale modulului F (fără DOM):
   • ardereMAS – modelul cvasidimensional cu front de flacără (two-zone): frontul sferic pornește din bujie, aria lui este
     intersecția sferei cu camera de ardere reală (cilindrul cu pistonul mobil + acoperișul în două pante), calculată prin
     eșantionarea volumului; viteza laminară Metghalchi–Keck (benzină), viteza turbulentă S_T = S_L + C_T·u'·(1 − e^(−r/ℓ)),
     masa arsă dm_b = ρ_u·A_f·S_T·dt, gazele nearse comprimate izentrop, temperatura gazelor arse = T_u + ΔT_ad;
   • sprayMAC – jeturile de combustibil (penetrația Hiroyasu–Arai cu timpul de rupere, unghiul conului), întârzierea la
     autoaprindere Wolfer, durata injecției din doza de combustibil;
   • testFlacaraLibera – reperul analitic: flacăra sferică liberă la presiune constantă, r = (ρ_u/ρ_b)·S_L·t. */

const RAD = Math.PI / 180;
/** viteza laminară a flăcării (Metghalchi–Keck, benzină) [m/s]; p [Pa], Tu [K], phi = 1/λ, xr – fracția de gaze reziduale */
export function vitezaLaminara(p, Tu, phi, xr) {
  const SL0 = 0.305 - 0.549 * (phi - 1.21) ** 2, a = 2.18 - 0.8 * (phi - 1), b = -0.16 + 0.22 * (phi - 1);
  return Math.max(0.02, SL0 * Math.pow(Tu / 298, a) * Math.pow(p / 101325, b) * (1 - 2.1 * xr));
}

/** o = { D, S, L, eps, n, lambda, xr, phiS (aprinderea, ° față de PMI-ardere), pf(phi) → p [Pa] (folosită numai la aprindere), Ts (T la aprindere), uP [m/s], CT, lI [m], N (eșantioane), pas [°] } */
export function ardereMAS(o) {
  const D = o.D, R = o.S / 2, L = o.L, Ap = (Math.PI * D * D) / 4, Vc = (Ap * o.S) / (o.eps - 1), Rg = 287, gu = 1.35;
  const th = 22 * RAD, hr = Math.min((D / 2) * Math.tan(th), (1.6 * Vc) / Ap), hs = Math.max(0.006 * D, Vc / Ap - hr * (1 - 4 / (3 * Math.PI))), Vroof = Ap * hr * (1 - 4 / (3 * Math.PI));
  const xP = (phi) => { const a = phi * RAD; return R * (1 - Math.cos(a)) + L - Math.sqrt(L * L - (R * Math.sin(a)) ** 2); };
  // eșantioanele: N_c în cilindru (coordonate x, z, fracția de înălțime s), N_r sub acoperiș (fixe); bujia în coamă, la 0,9·h_r
  const N = o.N || 12000, Nr = Math.round(N * 0.25), Nc = N - Nr, cil = new Float32Array(Nc * 3), roof = new Float32Array(Nr * 3);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let k = 0; k < Nc; k++) { const r = (D / 2) * Math.sqrt((k + rnd()) / Nc), f = 2 * Math.PI * rnd(); cil[3 * k] = r * Math.cos(f); cil[3 * k + 1] = rnd(); cil[3 * k + 2] = r * Math.sin(f); }
  for (let k = 0; k < Nr;) { const r = (D / 2) * Math.sqrt(rnd()), f = 2 * Math.PI * rnd(), x = r * Math.cos(f), z = r * Math.sin(f), y = rnd() * hr; if (y <= hr * Math.max(0, 1 - Math.abs(z) / (D / 2))) { roof[3 * k] = x; roof[3 * k + 1] = y; roof[3 * k + 2] = z; k++; } }
  const bj = [0, 0.9 * hr, 0];
  const dCil = new Float32Array(Nc), dRoof = new Float32Array(Nr);
  for (let k = 0; k < Nr; k++) dRoof[k] = Math.hypot(roof[3 * k] - bj[0], roof[3 * k + 1] - bj[1], roof[3 * k + 2] - bj[2]);
  dRoof.sort();
  const nr = (arr, r) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < r) lo = m + 1; else hi = m; } return lo; };
  /** volumul ars V_b(r) pentru o poziție a pistonului (H = înălțimea cilindrică dintre planul chiulasei și piston) */
  function geometrie(H) { for (let k = 0; k < Nc; k++) dCil[k] = Math.hypot(cil[3 * k] - bj[0], -cil[3 * k + 1] * H - bj[1], cil[3 * k + 2] - bj[2]); dCil.sort();
    const wc = (Ap * H) / Nc, wr = Vroof / Nr;
    return { Vb: (r) => wc * nr(dCil, r) + wr * nr(dRoof, r), V: Ap * H + Vroof }; }
  const phi = 1 / (o.lambda || 1), xr = o.xr ?? 0.06, uP = o.uP, CT = o.CT ?? 1.4, lI = o.lI ?? 0.03 * D, om = (o.n * Math.PI) / 30, pas = o.pas ?? 0.5;
  const dTad = (0.85 * 44e6) / ((14.7 * (o.lambda || 1) + 1) * 1250);
  const pS = o.pf(o.phiS), Ts = o.Ts, Hs = hs + xP(o.phiS), m = (pS * (Ap * Hs + Vroof)) / (Rg * Ts);
  // modelul Blizard–Keck: frontul înglobează masa m_e (antrenare cu u' + S_L), care arde în spatele frontului cu timpul τ_b = λ_T / S_L
  const nu = o.nu ?? 4.5e-6, lam = lI * Math.sqrt((15 * nu) / Math.max(1e-3, uP * lI));
  // nucleul inițial al flăcării după descărcarea scânteii: sferă de raza r0 = 1 mm, deja arsă
  const r0 = o.r0 ?? 0.001, rhoB0 = pS / (Rg * (Ts + dTad));
  let me = rhoB0 * (2 / 3) * Math.PI * r0 ** 3, mb = me, rf = r0; const out = [];
  const stare = (f, me_, mb_) => {
    const H = hs + xP(f), g = geometrie(H);
    // presiunea din bilanțul volumelor celor două zone: V = R·[m_b·T_b + (m − m_b)·T_u]/p, T_u izentropă de la aprindere, T_b = T_u + ΔT_ad
    let p = o.pf(f); for (let it = 0; it < 30; it++) { const Tu_ = Ts * Math.pow(p / pS, (gu - 1) / gu), pn = (Rg * (mb_ * (Tu_ + dTad) + (m - mb_) * Tu_)) / g.V; if (Math.abs(pn - p) < 1e-7 * p) { p = pn; break; } p = pn; }
    const Tu = Ts * Math.pow(p / pS, (gu - 1) / gu), Tb = Tu + dTad, rhoU = p / (Rg * Tu), rhoB = p / (Rg * Tb);
    const Vf = mb_ / rhoB + (me_ - mb_) / rhoU; let a = 0, b = 2 * D; if (Vf <= 0) b = 0; else for (let it = 0; it < 40; it++) { const c = (a + b) / 2; if (g.Vb(c) < Vf) a = c; else b = c; }
    const r = (a + b) / 2, dr = Math.max(0.004 * D, r * 0.04), Af = me_ > 0 ? Math.max(0, (g.Vb(r + dr) - g.Vb(Math.max(0, r - dr))) / (r > dr ? 2 * dr : r + dr)) : 2 * Math.PI * (0.002 * D) ** 2;
    const SL = vitezaLaminara(p, Tu, phi, xr), uE = uP * (1 - Math.exp(-r / lI)), tb = lam / SL;
    const dme = me_ < m ? rhoU * Af * (uE + SL) : 0, dmb = rhoU * Af * SL * 0 + (me_ - mb_) / tb + (me_ <= 0 ? rhoU * Af * SL : 0);
    return { p, Tu, Tb, r, Af, SL, ST: uE + SL, dme, dmb, yb: (mb_ / rhoB) / g.V, V: g.V };
  };
  for (let f = o.phiS; f <= o.phiS + 160; f += pas) {
    const dt = (pas * RAD) / om, s1 = stare(f, me, mb);
    out.push({ phi: f, xb: mb / m, xe: me / m, rf: s1.r, Af: s1.Af, SL: s1.SL, ST: s1.ST, Tu: s1.Tu, Tb: s1.Tb, yb: s1.yb, p: s1.p });
    if (mb >= 0.999 * m) break;
    const me1 = Math.min(m, me + s1.dme * dt), mb1 = Math.min(me1, mb + s1.dmb * dt), s2 = stare(f + pas, me1, mb1);
    me = Math.min(m, me + 0.5 * (s1.dme + s2.dme) * dt); mb = Math.min(me, mb + 0.5 * (s1.dmb + s2.dmb) * dt);
  }
  const ang = (x) => { const k = out.findIndex((q) => q.xb >= x); if (k <= 0) return NaN; const a = out[k - 1], b = out[k]; return a.phi + ((x - a.xb) / (b.xb - a.xb)) * (b.phi - a.phi); };
  return { out, m, hr, hs, Vc, lamT: lam, MFB10: ang(0.1), MFB50: ang(0.5), MFB90: ang(0.9), dTad, bujie: bj };
}

/** reperul: flacăra sferică liberă (aria 4πr², volumul 4/3·πr³) la p, T constante – integratorul și inversarea V_b(r) față de r(t) = (ρ_u/ρ_b)·S_L·t */
export function testFlacaraLibera() {
  const SL = 0.5, Tu = 600, Tb = 2400, p = 1e6, rhoU = p / (287 * Tu), rhoB = p / (287 * Tb), dt = 1e-5, Vb = (r) => (4 / 3) * Math.PI * r ** 3;
  let mb = 0, t = 0; const rate = (m_) => { const r = Math.cbrt((3 * (m_ / rhoB)) / (4 * Math.PI)); let a = 0, b = 1; for (let it = 0; it < 50; it++) { const c = (a + b) / 2; if (Vb(c) < m_ / rhoB) a = c; else b = c; } return rhoU * 4 * Math.PI * Math.max((a + b) / 2, 1e-6) ** 2 * SL + 0 * r; };
  for (let k = 0; k < 400; k++) { const k1 = rate(mb), k2 = rate(mb + k1 * dt); mb += 0.5 * (k1 + k2) * dt; t += dt; }
  let r;
  const V = mb / rhoB; r = Math.cbrt((3 * V) / (4 * Math.PI));
  return { r, rAn: (rhoU / rhoB) * SL * t, t };
}

/** o = { pInj [bar], d0 [m], gauri, Cd, rhoL, mf [kg/ciclu/cilindru], soi [° față de PMI-ardere], n, pf(phi) [Pa], Tf(phi) [K], Rbol [m] } */
export function sprayMAC(o) {
  const om = (o.n * Math.PI) / 30, A0 = (Math.PI * o.d0 * o.d0) / 4, out = [];
  const pc0 = o.pf(o.soi), dp0 = o.pInj * 1e5 - pc0, mdot = o.gauri * o.Cd * A0 * Math.sqrt(2 * o.rhoL * dp0), tInj = o.mf / mdot, durInj = (tInj * om) / RAD;
  // întârzierea la autoaprindere (Wolfer, integrată pe condițiile variabile din cilindru: ∫ dt/τ = 1)
  let I = 0, soc = null;
  for (let f = o.soi; f <= o.soi + 60; f += 0.1) { const p = o.pf(f) / 1e5, T = o.Tf(f), tau = 0.44e-3 * Math.pow(p, -1.19) * Math.exp(4650 / T); I += (0.1 * RAD) / om / tau; if (I >= 1 && soc == null) { soc = f; break; } }
  for (let f = o.soi; f <= o.soi + durInj + 25; f += 0.25) {
    const t = ((f - o.soi) * RAD) / om, p = o.pf(f), T = o.Tf(f), rhoA = p / (287 * T), dp = o.pInj * 1e5 - p, tb = (28.65 * o.rhoL * o.d0) / Math.sqrt(rhoA * dp);
    const S = t < tb ? 0.39 * Math.sqrt((2 * dp) / o.rhoL) * t : 2.95 * Math.pow(dp / rhoA, 0.25) * Math.sqrt(o.d0 * t);
    const teta = 83.5 * Math.pow(4, -0.22) * Math.pow(rhoA / o.rhoL, 0.26);   // unghiul conului (Hiroyasu–Arai, L/d = 4) [°]
    out.push({ phi: f, S: Math.min(S, o.Rbol * 1.05), Sliber: S, teta, injecteaza: f <= o.soi + durInj, aprins: soc != null && f >= soc, tb, rhoA });
  }
  // continuitatea penetrației la timpul de rupere (verificarea corelației)
  const r0 = out[0], tb = r0.tb, dp = o.pInj * 1e5 - pc0, s1 = 0.39 * Math.sqrt((2 * dp) / o.rhoL) * tb, s2 = 2.95 * Math.pow(dp / r0.rhoA, 0.25) * Math.sqrt(o.d0 * tb);
  const impact = out.find((q) => q.Sliber >= o.Rbol);
  return { out, durInj, mdot, tInj, soc, intarziere: soc != null ? soc - o.soi : NaN, s1, s2, impact: impact ? impact.phi : null };
}
