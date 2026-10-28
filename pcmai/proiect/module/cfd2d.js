/* Solverul CFD 2D al curgerii prin canalul de admisie și în cilindru (secțiunea mediană prin supapa de admisie):
   • ecuațiile Euler/Navier–Stokes incompresibile, cu condiția de compresibilitate uniformă în cilindrul închis (ipoteza Mach mic),
     pe o rețea carteziană decalată (MAC): advecție semi-lagrangiană, proiecție cu ecuația Poisson pentru presiune (SOR);
   • frontierele mobile – pistonul (cinematica exactă bielă-manivelă) și supapa de admisie (legea de ridicare din fazele
     distribuției) – prin mascarea celulelor (metoda frontierei imersate, cu viteza peretelui impusă pe fețe);
   • intrarea canalului: presiune impusă (plenul); pereți fără alunecare de masă (fluxul normal nul);
   • mărimi integrale: raportul de tumble, energia cinetică a fluctuațiilor rezolvate, coeficientul de debit al supapei,
     masa reținută – dintr-un model de umplere 0D cu coeficientul de debit obținut din câmpul 2D.
   Fișierul nu folosește DOM: rulează și într-un Web Worker (studiul de optimizare a canalului). */

const RAD = Math.PI / 180;
const lift = (phi, dur, L) => (phi >= 0 && phi <= dur ? L * Math.pow(Math.sin((Math.PI * phi) / dur), 2) : 0);

/** geometria: g = { D, S, L (biela), eps, dsa, isa, Lmax }, par = { theta (°), b (deplasarea cotului / D), hps (înălțimea înainte de scaun / D) } */
export function creeazaGeometrie(g, par) {
  const D = g.D, R = g.S / 2, hc = g.S / (g.eps - 1), dv = 0.36 * D, xv = -0.24 * D, wP = 0.92 * dv;
  const W = 2.1 * D, x0 = -W / 2 - 0.15 * D;
  const hps = par.hps * D, th = par.theta * RAD;
  // direcția de apropiere de scaun: cu atât mai culcată cu cât canalul este mai puțin înclinat (generează mișcarea tumble)
  const fa = (90 - (90 - par.theta) * 0.65) * RAD, Ps = [xv - hps * Math.cos(fa), hps * Math.sin(fa)];
  const Pin = [x0, Ps[1] + (Ps[0] - x0) * Math.tan(th) * 0.9 + 0.15 * D], Pc = [Ps[0] - (Ps[0] - x0) * 0.35 + par.b * D, Ps[1] + (Ps[0] - x0) * 0.35 * Math.tan(fa) * 0.6 + par.b * D * 0.5];
  // linia mediană a canalului: [scaun → segmentul înainte de scaun] + curba Bézier pătratică până la intrare
  const lm = [[xv, -0.02 * D]]; for (let k = 0; k <= 8; k++) lm.push([xv + (Ps[0] - xv) * k / 8, (Ps[1] * k) / 8]);
  for (let k = 1; k <= 40; k++) { const t = k / 40, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; lm.push([a * Ps[0] + b * Pc[0] + c * Pin[0], a * Ps[1] + b * Pc[1] + c * Pin[1]]); }
  lm.push([Pin[0] - 0.2 * D, Pin[1]]);
  const yTop = Math.max(...lm.map((p) => p[1])) + wP * 0.8, yBot = -(hc + g.S) - 0.06 * D;
  const dSeg = (px, py) => { let best = Infinity; for (let k = 0; k < lm.length - 1; k++) { const [ax, ay] = lm[k], [bx, by] = lm[k + 1], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)), dx = px - ax - t * vx, dy = py - ay - t * vy; best = Math.min(best, dx * dx + dy * dy); } return Math.sqrt(best); };
  const xPiston = (aG) => { const a = aG * RAD; return R * (1 - Math.cos(a)) + g.L - Math.sqrt(g.L * g.L - R * R * Math.sin(a) ** 2); };
  const yPiston = (aG) => -(hc + xPiston(aG));
  const durA = 180 + g.isa + g.dsa, Lv = (aG) => lift((((aG + g.dsa) % 720) + 720) % 720, durA, g.Lmax);
  return { D, R, hc, dv, xv, wP, x0, W, yTop, yBot, lm, dSeg, yPiston, Lv, Pin, par, g, tv: 0.06 * D, xc: 0 };
}

export function creeazaSolver(geo, o = {}) {
  const N = o.nx || 48, dx = geo.W / N, nx = N, ny = Math.ceil((geo.yTop - geo.yBot) / dx), x0 = geo.x0, y0 = geo.yBot, D = geo.D;
  const n = nx * ny, id = (i, j) => j * nx + i;
  const tip = new Uint8Array(n), inlet = new Uint8Array(ny);           // 0 fluid, 1 perete, 2 piston, 3 supapă
  const u = new Float64Array((nx + 1) * ny), v = new Float64Array(nx * (ny + 1)), uN = new Float64Array(u.length), vN = new Float64Array(v.length), p = new Float64Array(n), dv_ = new Float64Array(n);
  const iu = (i, j) => j * (nx + 1) + i, iv = (i, j) => j * nx + i;
  const xc = (i) => x0 + (i + 0.5) * dx, yc = (j) => y0 + (j + 0.5) * dx;
  // celulele statice: cilindrul (|x| < D/2, y < 0) și canalul (distanța la linia mediană < w/2, y ≥ 0); restul perete
  const stat = new Uint8Array(n);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = xc(i), y = yc(j), c = id(i, j);
    stat[c] = y < 0 ? (Math.abs(x) < D / 2 ? 0 : 1) : (geo.dSeg(x, y) < geo.wP / 2 ? 0 : 1); }
  for (let j = 0; j < ny; j++) inlet[j] = stat[id(0, j)] === 0 && yc(j) > 0 ? 1 : 0;
  let vp = 0, vvalv = 0, Lcur = 0;
  function masca(aG) {
    const yp = geo.yPiston(aG), L = geo.Lv(aG), xv = geo.xv, hd = geo.dv * 0.53, tv = geo.tv;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = id(i, j), x = xc(i), y = yc(j); let t = stat[c];
      if (t === 0 && y < yp) t = 2;
      if (t === 0 && Math.abs(x - xv) < hd && y < -L && y > -L - tv) t = 3;                 // talerul supapei
      if (t === 0 && Math.abs(x - xv) < 0.035 * D && y > -L - tv) t = 3;                    // tija
      if (t === 0 && L < 1e-5 && y >= -tv && y < 0.01 * D && Math.abs(x - xv) < hd) t = 3; // supapa închisă pe scaun
      tip[c] = t; }
    Lcur = L;
  }
  const Vsol = (t) => (t === 2 ? vp : t === 3 ? vvalv : 0);
  function conditii() {
    for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) { const k = iu(i, j);
      if (i === 0) { if (!(inlet[j] && tip[id(0, j)] === 0)) u[k] = 0; continue; }
      if (i === nx) { u[k] = 0; continue; }
      if (tip[id(i - 1, j)] || tip[id(i, j)]) u[k] = 0; }
    for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) { const k = iv(i, j);
      if (j === 0 || j === ny) { v[k] = 0; continue; }
      const a = tip[id(i, j - 1)], b = tip[id(i, j)]; if (a || b) v[k] = a ? Vsol(a) : Vsol(b); }
  }
  const sampU = (x, y) => { let fx = (x - x0) / dx, fy = (y - y0) / dx - 0.5; fx = Math.max(0, Math.min(nx - 1e-6, fx)); fy = Math.max(0, Math.min(ny - 1.000001, fy)); const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
    return (1 - a) * (1 - b) * u[iu(i, j)] + a * (1 - b) * u[iu(i + 1, j)] + (1 - a) * b * u[iu(i, j + 1)] + a * b * u[iu(i + 1, j + 1)]; };
  const sampV = (x, y) => { let fx = (x - x0) / dx - 0.5, fy = (y - y0) / dx; fx = Math.max(0, Math.min(nx - 1.000001, fx)); fy = Math.max(0, Math.min(ny - 1e-6, fy)); const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
    return (1 - a) * (1 - b) * v[iv(i, j)] + a * (1 - b) * v[iv(i + 1, j)] + (1 - a) * b * v[iv(i, j + 1)] + a * b * v[iv(i + 1, j + 1)]; };
  function advectie(dt) {
    for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) { const k = iu(i, j); if (tip[id(i - 1, j)] || tip[id(i, j)]) { uN[k] = u[k]; continue; }
      const x = x0 + i * dx, y = yc(j), uu = u[k], vv = sampV(x, y); uN[k] = sampU(x - dt * uu, y - dt * vv); }
    for (let j = 0; j < ny; j++) { uN[iu(0, j)] = u[iu(0, j)]; uN[iu(nx, j)] = 0; }
    for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) { const k = iv(i, j); if (tip[id(i, j - 1)] || tip[id(i, j)]) { vN[k] = v[k]; continue; }
      const x = xc(i), y = y0 + j * dx, vv = v[k], uu = sampU(x, y); vN[k] = sampV(x - dt * uu, y - dt * vv); }
    u.set(uN); v.set(vN);
  }
  const cil = (c) => yc(Math.floor(c / nx)) < 0;
  function proiectie(dt, it) {
    // divergența pe celulele fluide; în cilindrul închis se scade valoarea medie (compresibilitate uniformă – ipoteza Mach mic)
    let sum = 0, nc = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = id(i, j); if (tip[c]) { dv_[c] = 0; continue; }
      dv_[c] = (u[iu(i + 1, j)] - u[iu(i, j)] + v[iv(i, j + 1)] - v[iv(i, j)]) / dx; if (Lcur < 1e-5 && yc(j) < 0) { sum += dv_[c]; nc++; } }
    if (nc) { const m = sum / nc; for (let c = 0; c < n; c++) if (!tip[c] && cil(c)) dv_[c] -= m; }
    const w = 1.85, k2 = (dx * dx) / dt;
    for (let s = 0; s < it; s++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = id(i, j); if (tip[c]) continue;
      let nb = 0, sp = 0;
      if (i > 0) { if (!tip[c - 1]) { nb++; sp += p[c - 1]; } } else if (inlet[j]) nb++;
      if (i < nx - 1 && !tip[c + 1]) { nb++; sp += p[c + 1]; }
      if (j > 0 && !tip[c - nx]) { nb++; sp += p[c - nx]; }
      if (j < ny - 1 && !tip[c + nx]) { nb++; sp += p[c + nx]; }
      if (!nb) continue; p[c] += w * ((sp - k2 * dv_[c]) / nb - p[c]); }
    for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) { const k = iu(i, j);
      if (i === 0) { if (inlet[j] && !tip[id(0, j)]) u[k] -= (dt * (p[id(0, j)] - 0)) / dx; continue; }
      if (i === nx) continue; const a = id(i - 1, j), b = id(i, j); if (!tip[a] && !tip[b]) u[k] -= (dt * (p[b] - p[a])) / dx; }
    for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) { const a = id(i, j - 1), b = id(i, j); if (!tip[a] && !tip[b]) v[iv(i, j)] -= (dt * (p[b] - p[a])) / dx; }
  }
  /** mărimile integrale în cilindru (raportate la turația arborelui) */
  function integrale(om) {
    let sx = 0, sy = 0, nc = 0;
    for (let c = 0; c < n; c++) if (!tip[c] && cil(c)) { sx += xc(c % nx); sy += yc(Math.floor(c / nx)); nc++; }
    const cx = sx / nc, cy = sy / nc; let Lm = 0, I = 0, k = 0, pm = 0;
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const c = id(i, j); if (tip[c] || yc(j) >= 0) continue;
      const U = 0.5 * (u[iu(i, j)] + u[iu(i + 1, j)]), V = 0.5 * (v[iv(i, j)] + v[iv(i, j + 1)]), rx = xc(i) - cx, ry = yc(j) - cy;
      Lm += rx * V - ry * U; I += rx * rx + ry * ry; pm += p[c];
      // fluctuația față de câmpul filtrat (media celor 4 vecini fluizi)
      let su = 0, sv = 0, m = 0; [c - 1, c + 1, c - nx, c + nx].forEach((q) => { if (!tip[q]) { const ii = q % nx, jj = Math.floor(q / nx); su += 0.5 * (u[iu(ii, jj)] + u[iu(ii + 1, jj)]); sv += 0.5 * (v[iv(ii, jj)] + v[iv(ii, jj + 1)]); m++; } });
      if (m) { const du = U - su / m, dV = V - sv / m; k += 0.5 * (du * du + dV * dV); } }
    return { tumble: I ? Lm / (I * om) : 0, tke: nc ? k / nc : 0, pCil: nc ? pm / nc : 0, ncil: nc };
  }
  /** câmpul la centrele celulelor (pentru afișare): |U|, U, V și tipul celulei */
  function camp() {
    const M = new Float32Array(n), U = new Float32Array(n), V = new Float32Array(n), T = new Uint8Array(tip);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = id(i, j); if (tip[c]) continue; const a = 0.5 * (u[iu(i, j)] + u[iu(i + 1, j)]), b = 0.5 * (v[iv(i, j)] + v[iv(i, j + 1)]); U[c] = a; V[c] = b; M[c] = Math.hypot(a, b); }
    return { M, U, V, T, nx, ny, x0, y0, dx };
  }
  /** rulează de la a0 la a1 [°RAC] cu pasul dA; laPas(aG, rezultate) la fiecare pas */
  function ruleaza(n_rpm, a0, a1, dA, laPas, itP = 50) {
    const om = (n_rpm * Math.PI) / 30, dt = (dA * RAD) / om;
    masca(a0); const ser = [];
    for (let a = a0; a <= a1 + 1e-9; a += dA) {
      const yp0 = geo.yPiston(a), yp1 = geo.yPiston(a + dA), L0 = geo.Lv(a), L1 = geo.Lv(a + dA);
      vp = (yp1 - yp0) / dt; vvalv = -(L1 - L0) / dt;
      masca(a); conditii(); advectie(dt); conditii(); proiectie(dt, itP);
      const r = integrale(om), Qd = Math.abs(vp) * D, A = 2 * Math.max(geo.Lv(a), 1e-9);
      r.Cd = geo.Lv(a) > 0.04 * geo.g.Lmax && r.pCil < -1 ? Math.min(1.2, Qd / (A * Math.sqrt(2 * Math.abs(r.pCil)))) : null;
      r.a = a; r.L = geo.Lv(a); r.vp = vp; ser.push(r); if (laPas) laPas(a, r);
    }
    return ser;
  }
  return { nx, ny, dx, x0, y0, masca, ruleaza, camp, integrale };
}

/** modelul de umplere 0D (motorul real, supapa circulară), cu coeficientul de debit din simularea 2D: m reținută la închiderea admisiei */
export function umplere0D(geo, serie, o) {
  const g = geo.g, D = geo.D, Ap = (Math.PI * D * D) / 4, Vc = Ap * g.S / (g.eps - 1), p0 = o.p0 ?? 1e5, T0 = o.T0 ?? 300, Rg = 287, cp = 1005, cv = 718, rho0 = p0 / (Rg * T0);
  const V = (aG) => Vc + Ap * (-geo.yPiston(aG) - geo.hc), om = (o.n * Math.PI) / 30;
  const CdM = (() => { const v = serie.map((r) => r.Cd).filter((x) => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0.6; })();
  const Cd = (aG) => { let best = null, d = Infinity; serie.forEach((r) => { if (r.Cd != null && Math.abs(r.a - aG) < d) { d = Math.abs(r.a - aG); best = r.Cd; } }); return Math.max(0.15, Math.min(1, best ?? CdM)); };
  let p = p0 * 1.05, T = 900, m = (p * V(0)) / (Rg * T); const out = [];
  const aIVC = 180 + g.isa, dA = 0.25;
  for (let a = 0; a <= Math.max(aIVC, 360); a += dA) {
    const dt = (dA * RAD) / om, L = geo.Lv(a), A = Math.PI * geo.dv * L, Vv = V(a), dV = V(a + dA) - Vv;
    let dm = 0;
    if (L > 0) { const dp = p0 - p; dm = Math.sign(dp) * Cd(a) * A * Math.sqrt(2 * rho0 * Math.abs(dp)) * dt; }
    const h = dm > 0 ? cp * T0 : cp * T, Tn = (m * cv * T + h * dm - p * dV) / ((m + dm) * cv);
    m += dm; T = Tn; p = (m * Rg * T) / V(a + dA);
    out.push({ a, m, p, T });
  }
  const iv = out.findIndex((q) => q.a >= aIVC);
  return { serie: out, mIVC: out[iv].m, etaV: out[iv].m / (rho0 * Ap * g.S), CdM };
}
