/* Modulul F – solverele interne de câmpuri:
   • comprimarea într-un cilindru închis, fără ardere: ecuațiile Euler 1D (masă, impuls, energie) pe o rețea mobilă ALE care urmează
     pistonul (nodurile se deplasează afin între piston și chiulasă – conservarea geometrică este exactă), volume finite cu
     reconstrucție MUSCL (limitator minmod), flux HLL, integrare Runge–Kutta SSP de ordinul 2; pereții sunt adiabatici, fără frecare;
     condiția la perete din problema Riemann acustică (fluxul de masă prin pereți este nul, deci masa se conservă exact);
   • placa de răcire a bateriei: conducția 2D în placă (volume finite, suprarelaxare Gauss–Seidel) cuplată cu lichidul din canalul
     în serpentină (bilanț 1D pe canal, schimb convectiv h·(T_placă − T_lichid)); iterații până la închiderea bilanțului energetic. */

/* ------------------------------------------------------------------ comprimarea (ALE 1D) */
/** o = { D, S, L, eps [m, –], n [rot/min], p0 [Pa], T0 [K], R, gamma, N (celule), dAlfa (pasul mișcării rețelei, °RAC), a0, a1 (°RAC, PMS = 0) } */
export function creeazaCompresie(o) {
  const g = o.gamma ?? 1.4, Rg = o.R ?? 287, N = o.N, R = o.S / 2, lam = R / o.L, Ap = Math.PI * o.D * o.D / 4, Vh = Ap * o.S, Vc = Vh / (o.eps - 1);
  const om = o.n * Math.PI / 30, a0 = o.a0 ?? 180, a1 = o.a1 ?? 360, dA = o.dAlfa ?? 1;
  const xExact = (aG) => { const a = aG * Math.PI / 180; return R * (1 - Math.cos(a)) + o.L - Math.sqrt(o.L * o.L - R * R * Math.sin(a) ** 2); };
  const h = (aG) => Vc / Ap + xExact(aG);               // înălțimea coloanei de gaz (chiulasă – piston)
  // traiectoria pistonului eșantionată la pasul dAlfa (rețeaua se mișcă liniar între eșantioane)
  const hS = (aG) => { const k = Math.floor((aG - a0) / dA), aa = a0 + k * dA, ab = Math.min(a1, aa + dA), ha = h(aa), hb = h(ab); return ab > aa ? ha + (hb - ha) * (aG - aa) / (ab - aa) : ha; };
  const ws = (aG) => { const k = Math.floor((aG - a0) / dA + 1e-12), aa = a0 + k * dA, ab = Math.min(a1, aa + dA); return ab > aa ? (h(ab) - h(aa)) / ((ab - aa) * Math.PI / 180 / om) : 0; };
  // stare conservativă pe celule (pe unitatea de arie): U = [ρ, ρu, E] · Δz ; coordonata z de la chiulasă (z = 0) spre piston (z = h)
  const rho0 = o.p0 / (Rg * o.T0), E0 = o.p0 / (g - 1);
  let hc = h(a0), m = new Float64Array(N), mu = new Float64Array(N), en = new Float64Array(N);
  for (let i = 0; i < N; i++) { const dz = hc / N; m[i] = rho0 * dz; mu[i] = 0; en[i] = E0 * dz; }
  const M0 = m.reduce((s, v) => s + v, 0) * Ap;
  let aG = a0, pasi = 0;
  const prim = (mm, mmu, ee, dz) => { const r = mm / dz, u = mmu / mm, p = (g - 1) * (ee / dz - 0.5 * r * u * u); return [r, u, p]; };
  const minmod = (a, b) => (a * b <= 0 ? 0 : Math.abs(a) < Math.abs(b) ? a : b);
  function flux(L, Rr, w) { // HLL în reperul mobil (viteza feței w); L/R = [ρ, u, p]
    const cL = Math.sqrt(g * L[2] / L[0]), cR = Math.sqrt(g * Rr[2] / Rr[0]);
    const sL = Math.min(L[1] - cL, Rr[1] - cR), sR = Math.max(L[1] + cL, Rr[1] + cR);
    const UL = [L[0], L[0] * L[1], L[2] / (g - 1) + 0.5 * L[0] * L[1] * L[1]], UR = [Rr[0], Rr[0] * Rr[1], Rr[2] / (g - 1) + 0.5 * Rr[0] * Rr[1] * Rr[1]];
    const FL = [UL[1], UL[1] * L[1] + L[2], (UL[2] + L[2]) * L[1]], FR = [UR[1], UR[1] * Rr[1] + Rr[2], (UR[2] + Rr[2]) * Rr[1]];
    const F = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const fl = FL[k] - w * UL[k], fr = FR[k] - w * UR[k], sl = sL - w, sr = sR - w;
      F[k] = sl >= 0 ? fl : sr <= 0 ? fr : (sr * fl - sl * fr + sl * sr * (UR[k] - UL[k])) / (sr - sl);
    }
    return F;
  }
  // tablouri de lucru prealocate (fără alocări în bucla de timp)
  const Pr = new Float64Array(N), Pu = new Float64Array(N), Pp = new Float64Array(N), Sr = new Float64Array(N), Su = new Float64Array(N), Sp = new Float64Array(N);
  const K1 = [new Float64Array(N), new Float64Array(N), new Float64Array(N)], K2 = [new Float64Array(N), new Float64Array(N), new Float64Array(N)];
  const F = new Float64Array(3);
  function fluxHLL(rL, uL, pL, rR, uR, pR, w) {
    const cL = Math.sqrt(g * pL / rL), cR = Math.sqrt(g * pR / rR), sL = Math.min(uL - cL, uR - cR) - w, sR = Math.max(uL + cL, uR + cR) - w;
    const EL = pL / (g - 1) + 0.5 * rL * uL * uL, ER = pR / (g - 1) + 0.5 * rR * uR * uR;
    const f0L = rL * uL - w * rL, f1L = rL * uL * uL + pL - w * rL * uL, f2L = (EL + pL) * uL - w * EL;
    const f0R = rR * uR - w * rR, f1R = rR * uR * uR + pR - w * rR * uR, f2R = (ER + pR) * uR - w * ER;
    if (sL >= 0) { F[0] = f0L; F[1] = f1L; F[2] = f2L; return; }
    if (sR <= 0) { F[0] = f0R; F[1] = f1R; F[2] = f2R; return; }
    const d = 1 / (sR - sL);
    F[0] = (sR * f0L - sL * f0R + sL * sR * (rR - rL)) * d; F[1] = (sR * f1L - sL * f1R + sL * sR * (rR * uR - rL * uL)) * d; F[2] = (sR * f2L - sL * f2R + sL * sR * (ER - EL)) * d;
  }
  function rhs(mm, mmu, ee, hcur, wp, K) {
    // nodurile: z_j = j/N · h; viteza nodului w_j = j/N · w_p (pistonul la z = h se mișcă cu w_p = dh/dt)
    const dz = hcur / N, [dm, dmu, de] = K;
    for (let i = 0; i < N; i++) { const r = mm[i] / dz, u = mmu[i] / mm[i]; Pr[i] = r; Pu[i] = u; Pp[i] = (g - 1) * (ee[i] / dz - 0.5 * r * u * u); dm[i] = dmu[i] = de[i] = 0; }
    Sr[0] = Su[0] = Sp[0] = Sr[N - 1] = Su[N - 1] = Sp[N - 1] = 0;
    for (let i = 1; i < N - 1; i++) { Sr[i] = minmod(Pr[i] - Pr[i - 1], Pr[i + 1] - Pr[i]); Su[i] = minmod(Pu[i] - Pu[i - 1], Pu[i + 1] - Pu[i]); Sp[i] = minmod(Pp[i] - Pp[i - 1], Pp[i + 1] - Pp[i]); }
    { const r = Pr[0], u = Pu[0], p = Pp[0], c = Math.sqrt(g * p / r), ps = p - r * c * u; dmu[0] += ps; }                         // chiulasa: perete fix
    { const r = Pr[N - 1], u = Pu[N - 1], p = Pp[N - 1], c = Math.sqrt(g * p / r), ps = p + r * c * (u - wp); dmu[N - 1] -= ps; de[N - 1] -= ps * wp; } // pistonul: perete mobil
    for (let j = 1; j < N; j++) {
      const w = (j / N) * wp, a = j - 1;
      let rL = Pr[a] + 0.5 * Sr[a], uL = Pu[a] + 0.5 * Su[a], pL = Pp[a] + 0.5 * Sp[a], rR = Pr[j] - 0.5 * Sr[j], uR = Pu[j] - 0.5 * Su[j], pR = Pp[j] - 0.5 * Sp[j];
      if (rL <= 0 || pL <= 0 || rR <= 0 || pR <= 0) { rL = Pr[a]; uL = Pu[a]; pL = Pp[a]; rR = Pr[j]; uR = Pu[j]; pR = Pp[j]; }
      fluxHLL(rL, uL, pL, rR, uR, pR, w);
      dm[a] -= F[0]; dmu[a] -= F[1]; de[a] -= F[2]; dm[j] += F[0]; dmu[j] += F[1]; de[j] += F[2];
    }
  }
  const m1 = new Float64Array(N), mu1 = new Float64Array(N), e1 = new Float64Array(N);
  const iesire = [];
  function inregistreaza() {
    const dz = hc / N; let Mt = 0, Et = 0, pm = 0, Tm = 0, Tmax = -Infinity, Tmin = Infinity; const camp = { p: [], T: [], u: [] };
    for (let i = 0; i < N; i++) { const [r, u, p] = prim(m[i], mu[i], en[i], dz), T = p / (r * Rg); Mt += m[i]; Et += en[i]; pm += p * dz; Tm += T * m[i]; Tmax = Math.max(Tmax, T); Tmin = Math.min(Tmin, T); camp.p.push(p); camp.T.push(T); camp.u.push(u); }
    const V = hc * Ap, Mtot = Mt * Ap, pmed = pm / hc;
    iesire.push({ a: aG, V, h: hc, M: Mtot, dM: (Mtot - M0) / M0, p: pmed, T: Tm / Mt, Tmax, Tmin, pIs: o.p0 * Math.pow(h(a0) / hc, g), TIs: o.T0 * Math.pow(h(a0) / hc, g - 1), camp, E: Et * Ap });
  }
  inregistreaza();
  let urmIes = a0 + 1;
  /** avansează simularea până la unghiul aStop; întoarce true când s-a terminat */
  function avanseaza(aStop) {
    aStop = Math.min(aStop, a1);
    while (aG < aStop - 1e-12) {
      const wp = ws(aG), dz = hc / N;
      let smax = 0; for (let i = 0; i < N; i++) { const [r, u, p] = prim(m[i], mu[i], en[i], dz); smax = Math.max(smax, Math.abs(u) + Math.abs(wp) + Math.sqrt(g * p / r)); }
      let dt = 0.45 * dz / smax;
      const kSeg = Math.floor((aG - a0) / dA + 1e-12), aSeg = Math.min(a1, a0 + (kSeg + 1) * dA);
      const aNext = Math.min(aSeg, urmIes, aStop), dtMax = (aNext - aG) * Math.PI / 180 / om;
      if (dt >= dtMax - 1e-15) dt = dtMax;
      // RK2 SSP: rețeaua: h(t + dt) = h + w_p·dt (w_p constant pe segment)
      const h0 = hc, h1 = h0 + wp * dt;
      rhs(m, mu, en, h0, wp, K1);
      for (let i = 0; i < N; i++) { m1[i] = m[i] + dt * K1[0][i]; mu1[i] = mu[i] + dt * K1[1][i]; e1[i] = en[i] + dt * K1[2][i]; }
      rhs(m1, mu1, e1, h1, wp, K2);
      for (let i = 0; i < N; i++) { m[i] = 0.5 * (m[i] + m1[i] + dt * K2[0][i]); mu[i] = 0.5 * (mu[i] + mu1[i] + dt * K2[1][i]); en[i] = 0.5 * (en[i] + e1[i] + dt * K2[2][i]); }
      hc = h1; aG += dt * om * 180 / Math.PI; pasi++;
      if (Math.abs(aG - aNext) < 1e-9) aG = aNext;
      if (aG >= urmIes - 1e-9) { inregistreaza(); urmIes += 1; }
    }
    return aG >= a1 - 1e-9;
  }
  return { avanseaza, iesire, get alfa() { return aG; }, get pasi() { return pasi; }, M0, Vh, Vc, Ap, h, o: Object.assign({ gamma: g, R: Rg }, o) };
}
/** repere izentrope pentru comprimarea uniformă de la PMI la PMS */
export const izentrop = (p0, T0, eps, g = 1.4) => ({ p2: p0 * Math.pow(eps, g), T2: T0 * Math.pow(eps, g - 1) });

/* ------------------------------------------------------------------ placa de răcire */
/** o = { Lx, Ly [m], t [m], k [W/(m·K)], Q [W], md [kg/s], cp, Tin [°C], h [W/(m²·K)], lc (lățimea canalului) [m], nTreceri, nx, ny } */
export function placaRacire(o) {
  const nx = o.nx, ny = o.ny, dx = o.Lx / nx, dy = o.Ly / ny, k = o.k, t = o.t, md = o.md, cp = o.cp, Tin = o.Tin, hc = o.h;
  const T = new Float64Array(nx * ny).fill(Tin + 5), idx = (i, j) => j * nx + i;
  // canalul în serpentină: nTreceri pe orizontală, uniform distribuite pe y; celulele de canal și ordinea lor de parcurgere
  const np = o.nTreceri, can = new Int32Array(nx * ny).fill(-1), drum = [];
  const lat = Math.max(1, Math.round(o.lc / dy));
  for (let p = 0; p < np; p++) {
    const jc = Math.round(((p + 0.5) / np) * ny - 0.5), j0 = Math.max(0, jc - Math.floor((lat - 1) / 2));
    const lin = []; for (let i = 0; i < nx; i++) lin.push(i);
    if (p % 2) lin.reverse();
    lin.forEach((i) => { const cel = []; for (let j = j0; j < Math.min(ny, j0 + lat); j++) { cel.push(idx(i, j)); can[idx(i, j)] = drum.length; } drum.push({ i, cel }); });
    if (p < np - 1) { // cotul dintre treceri, la capăt
      const iE = p % 2 ? 0 : nx - 1, jn = Math.round(((p + 1.5) / np) * ny - 0.5);
      for (let j = jc + 1; j < jn - Math.floor((lat - 1) / 2); j++) { const c = idx(iE, j); if (can[c] < 0) { can[c] = drum.length; drum.push({ i: iE, cel: [c] }); } }
    }
  }
  const nd = drum.length, Tf = new Float64Array(nd + 1).fill(Tin);
  // sursele de căldură: celulele bateriei (module dreptunghiulare) – fluxul uniform pe aria modulelor
  const q = new Float64Array(nx * ny); let Asrc = 0;
  const mod = o.module || { nx: 4, ny: 2, umplere: 0.86 };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) / nx * mod.nx, y = (j + 0.5) / ny * mod.ny, fx = x - Math.floor(x), fy = y - Math.floor(y), m = (1 - mod.umplere) / 2;
    if (fx > m && fx < 1 - m && fy > m && fy < 1 - m) { q[idx(i, j)] = 1; Asrc += dx * dy; }
  }
  for (let c = 0; c < q.length; c++) q[c] *= o.Q / Asrc;   // W/m²
  // aria de schimb pe celula de canal: lățimea udată ≈ 2·(lc) pe lungimea dx (canal lipit de placă: perimetrul activ al canalului / celulă)
  const hA = hc * dx * dy * 1.6;
  const G = k * t; // conductanța în plan
  // sistemul plăcii (Tf fixat): A·T = b, A simetrică pozitiv definită → gradient conjugat cu precondiționare Jacobi
  const n = nx * ny, ax = G * dy / dx, ay = G * dx / dy, diag = new Float64Array(n);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = idx(i, j); diag[c] = (i > 0 ? ax : 0) + (i < nx - 1 ? ax : 0) + (j > 0 ? ay : 0) + (j < ny - 1 ? ay : 0) + (can[c] >= 0 ? hA : 0); }
  const Amul = (x, y) => { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = idx(i, j); let v = diag[c] * x[c];
    if (i > 0) v -= ax * x[c - 1]; if (i < nx - 1) v -= ax * x[c + 1]; if (j > 0) v -= ay * x[c - nx]; if (j < ny - 1) v -= ay * x[c + nx]; y[c] = v; } };
  const r = new Float64Array(n), z = new Float64Array(n), pv = new Float64Array(n), Ap = new Float64Array(n), bv = new Float64Array(n);
  function cg() {
    for (let c = 0; c < n; c++) { bv[c] = q[c] * dx * dy; if (can[c] >= 0) { const s = can[c]; bv[c] += hA * 0.5 * (Tf[s] + Tf[s + 1]); } }
    Amul(T, Ap); let rz = 0, bn = 0; for (let c = 0; c < n; c++) { r[c] = bv[c] - Ap[c]; z[c] = r[c] / diag[c]; pv[c] = z[c]; rz += r[c] * z[c]; bn += bv[c] * bv[c]; }
    bn = Math.sqrt(bn); let k = 0;
    for (; k < 5000; k++) { Amul(pv, Ap); let pAp = 0; for (let c = 0; c < n; c++) pAp += pv[c] * Ap[c]; const al = rz / pAp; let rn = 0, rz1 = 0;
      for (let c = 0; c < n; c++) { T[c] += al * pv[c]; r[c] -= al * Ap[c]; rn += r[c] * r[c]; z[c] = r[c] / diag[c]; rz1 += r[c] * z[c]; }
      if (Math.sqrt(rn) < 1e-11 * bn) break; const be = rz1 / rz; rz = rz1; for (let c = 0; c < n; c++) pv[c] = z[c] + be * pv[c]; }
    return k;
  }
  let it = 0, bilant = 1, itCG = 0, dif = 1;
  for (; it < 200 && (bilant > 1e-7 || dif > 1e-7); it++) {
    // 1) lichidul: marș în lungul canalului, cu temperatura plăcii fixată (soluția exponențială pe fiecare segment)
    let d = 0;
    for (let s = 0; s < nd; s++) {
      const cel = drum[s].cel; let Tw = 0; cel.forEach((c) => (Tw += T[c])); Tw /= cel.length;
      const NTU = (hA * cel.length) / (md * cp), nou = Tw + (Tf[s] - Tw) * Math.exp(-NTU); d = Math.max(d, Math.abs(nou - Tf[s + 1])); Tf[s + 1] = nou;
    }
    dif = d;
    // 2) placa: conducția cu sursele și schimbul convectiv către lichid
    itCG += cg();
    // bilanțul: căldura preluată de lichid (din schimbul convectiv local) față de căldura generată
    let Qc = 0; for (let c = 0; c < n; c++) if (can[c] >= 0) { const s = can[c]; Qc += hA * (T[c] - 0.5 * (Tf[s] + Tf[s + 1])); }
    bilant = Math.abs(Qc - o.Q) / o.Q;
  }
  let Tmax = -Infinity, Tmin = Infinity, Tm = 0; for (let c = 0; c < T.length; c++) { Tmax = Math.max(Tmax, T[c]); Tmin = Math.min(Tmin, T[c]); Tm += T[c]; }
  // pierderea de presiune (Darcy–Weisbach), canal dreptunghiular lc × hcan, apă
  const hcan = o.hcan ?? 0.004, Ac = o.lc * hcan, Dh = 4 * Ac / (2 * (o.lc + hcan)), rho = 998, mu = 1e-3, Lcan = nd * dx;
  const w = md / (rho * Ac), Re = rho * w * Dh / mu, f = Re < 2300 ? 64 / Re : 0.316 * Math.pow(Re, -0.25), dp = f * Lcan / Dh * rho * w * w / 2 + (np - 1) * 1.2 * rho * w * w / 2;
  return { T, Tf, nx, ny, can, drum, Tmax, Tmin, Tmed: Tm / T.length, dTf: Tf[nd] - Tin, dTan: o.Q / (md * cp), bilant, bilantLichid: Math.abs(md * cp * (Tf[nd] - Tin) - o.Q) / o.Q, it, itCG, dp, Re, w, Lcan, q, Asrc };
}
