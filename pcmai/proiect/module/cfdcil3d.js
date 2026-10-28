/* Solverul CFD 3D al curgerii în canalul de admisie și în cilindru (admisia și comprimarea, 0…360 °RAC):
   • ecuațiile Euler incompresibile cu condiția de compresibilitate uniformă în cilindrul închis (Mach mic), pe o rețea
     carteziană 3D decalată (MAC): advecție semi-lagrangiană cu interpolare triliniară, proiecție cu ecuația Poisson
     pentru presiune (SOR roșu-negru, pornire din presiunea pasului anterior);
   • geometria: canalul circular de-a lungul liniei mediane a canalului proiectat (aceeași ca în secțiunea 2D), cilindrul,
     chiulasa plană, supapa (taler + tijă) cu legea de ridicare din fazele distribuției, pistonul cu cinematica exactă –
     frontiere imersate (celule mascate, viteza peretelui pe fețe);
   • mărimi integrale: tumble (în jurul axei z, normală pe planul supapă – axa cilindrului), tumble transversal (axa x),
     swirl (axa cilindrului), energia cinetică a fluctuațiilor rezolvate, coeficientul de debit al supapei;
   • post-procesare: secțiunea mediană z = 0 și secțiunea orizontală prin cilindru (câmpul vitezei), particule-trasor
     lansate din intrarea canalului și transportate cu viteza calculată (Runge–Kutta 2).
   Fișierul nu folosește DOM (rulează în Web Worker). */

const RAD = Math.PI / 180;

export function creeazaSolver3D(geo, o = {}) {
  const D = geo.D, N = o.N || 24, h = D / N;
  const x0 = geo.x0, y0 = geo.yBot, z0 = -0.56 * D;
  const nx = Math.ceil(geo.W / h), ny = Math.ceil((geo.yTop - geo.yBot) / h), nz = Math.ceil(1.12 * D / h);
  const n = nx * ny * nz, sxy = nx * ny;
  const id = (i, j, k) => i + nx * (j + ny * k);
  const xc = (i) => x0 + (i + 0.5) * h, yc = (j) => y0 + (j + 0.5) * h, zc = (k) => z0 + (k + 0.5) * h;
  const nu_ = (nx + 1) * ny * nz, nv_ = nx * (ny + 1) * nz, nw_ = nx * ny * (nz + 1);
  const iu = (i, j, k) => i + (nx + 1) * (j + ny * k), iv = (i, j, k) => i + nx * (j + (ny + 1) * k), iw = (i, j, k) => i + nx * (j + ny * k);
  const u = new Float32Array(nu_), v = new Float32Array(nv_), w = new Float32Array(nw_), uN = new Float32Array(nu_), vN = new Float32Array(nv_), wN = new Float32Array(nw_);
  const p = new Float32Array(n), dv = new Float32Array(n), tip = new Uint8Array(n), stat = new Uint8Array(n), inlet = new Uint8Array(n), cil = new Uint8Array(n);
  const rP = geo.wP / 2, R2 = (D / 2) ** 2;
  // distanța 3D la linia mediană (aflată în planul z = 0)
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = id(i, j, k), x = xc(i), y = yc(j), z = zc(k);
    if (y < 0) { stat[c] = x * x + z * z < R2 ? 0 : 1; cil[c] = 1; }
    else { const d2 = geo.dSeg(x, y); stat[c] = d2 * d2 + z * z < rP * rP ? 0 : 1; }
    if (i === 0 && !stat[c] && y > 0) inlet[c] = 1;
  }
  let vp = 0, vval = 0, Lcur = 0;
  const hd = geo.dv * 0.53, ts = 0.035 * D, tv = geo.tv;
  function masca(aG) {
    const yp = geo.yPiston(aG), L = geo.Lv(aG); Lcur = L;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = id(i, j, k); let t = stat[c];
      if (t === 0) { const y = yc(j);
        if (y < yp) t = 2;
        else { const rx = xc(i) - geo.xv, rz = zc(k), r2 = rx * rx + rz * rz;
          if (r2 < hd * hd && y < -L && y > -L - tv) t = 3;
          else if (r2 < ts * ts && y > -L - tv) t = 3;
          else if (L < 1e-5 && y >= -tv && y < 0.01 * D && r2 < hd * hd) t = 3; } }
      tip[c] = t; }
  }
  const Vs = (t) => (t === 2 ? vp : t === 3 ? vval : 0);
  function conditii() {
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) { const q = iu(i, j, k);
      if (i === 0) { const c = id(0, j, k); if (!(inlet[c] && !tip[c])) u[q] = 0; continue; }
      if (i === nx) { u[q] = 0; continue; }
      if (tip[id(i - 1, j, k)] || tip[id(i, j, k)]) u[q] = 0; }
    for (let k = 0; k < nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) { const q = iv(i, j, k);
      if (j === 0 || j === ny) { v[q] = 0; continue; }
      const a = tip[id(i, j - 1, k)], b = tip[id(i, j, k)]; if (a || b) v[q] = a ? Vs(a) : Vs(b); }
    for (let k = 0; k <= nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = iw(i, j, k);
      if (k === 0 || k === nz) { w[q] = 0; continue; }
      if (tip[id(i, j, k - 1)] || tip[id(i, j, k)]) w[q] = 0; }
  }
  // interpolarea triliniară pe cele trei rețele decalate
  function tri(a, X, Y, Z, mx, my, mz, ox, oy, oz) {
    let fx = (X - x0) / h - ox, fy = (Y - y0) / h - oy, fz = (Z - z0) / h - oz;
    fx = fx < 0 ? 0 : fx > mx - 1.0001 ? mx - 1.0001 : fx; fy = fy < 0 ? 0 : fy > my - 1.0001 ? my - 1.0001 : fy; fz = fz < 0 ? 0 : fz > mz - 1.0001 ? mz - 1.0001 : fz;
    const i = fx | 0, j = fy | 0, k = fz | 0, a1 = fx - i, b1 = fy - j, c1 = fz - k, s = mx * my, b0 = i + mx * (j + my * k);
    const c00 = a[b0] * (1 - a1) + a[b0 + 1] * a1, c10 = a[b0 + mx] * (1 - a1) + a[b0 + mx + 1] * a1, c01 = a[b0 + s] * (1 - a1) + a[b0 + s + 1] * a1, c11 = a[b0 + s + mx] * (1 - a1) + a[b0 + s + mx + 1] * a1;
    return (c00 * (1 - b1) + c10 * b1) * (1 - c1) + (c01 * (1 - b1) + c11 * b1) * c1;
  }
  const sU = (X, Y, Z) => tri(u, X, Y, Z, nx + 1, ny, nz, 0, 0.5, 0.5), sV = (X, Y, Z) => tri(v, X, Y, Z, nx, ny + 1, nz, 0.5, 0, 0.5), sW = (X, Y, Z) => tri(w, X, Y, Z, nx, ny, nz + 1, 0.5, 0.5, 0);
  function advectie(dt) {
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) { const q = iu(i, j, k);
      if (tip[id(i - 1, j, k)] || tip[id(i, j, k)]) { uN[q] = u[q]; continue; }
      const X = x0 + i * h, Y = yc(j), Z = zc(k); uN[q] = sU(X - dt * u[q], Y - dt * sV(X, Y, Z), Z - dt * sW(X, Y, Z)); }
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) { uN[iu(0, j, k)] = u[iu(0, j, k)]; uN[iu(nx, j, k)] = 0; }
    for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) { const q = iv(i, j, k);
      if (tip[id(i, j - 1, k)] || tip[id(i, j, k)]) { vN[q] = v[q]; continue; }
      const X = xc(i), Y = y0 + j * h, Z = zc(k); vN[q] = sV(X - dt * sU(X, Y, Z), Y - dt * v[q], Z - dt * sW(X, Y, Z)); }
    for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = iw(i, j, k);
      if (tip[id(i, j, k - 1)] || tip[id(i, j, k)]) { wN[q] = w[q]; continue; }
      const X = xc(i), Y = yc(j), Z = z0 + k * h; wN[q] = sW(X - dt * sU(X, Y, Z), Y - dt * sV(X, Y, Z), Z - dt * w[q]); }
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { if (j === 0) vN[iv(i, 0, k)] = 0; }
    u.set(uN); v.set(vN); w.set(wN);
  }
  function proiectie(dt, it) {
    let sum = 0, nc = 0; const inchis = Lcur < 1e-5;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = id(i, j, k); if (tip[c]) { dv[c] = 0; continue; }
      dv[c] = (u[iu(i + 1, j, k)] - u[iu(i, j, k)] + v[iv(i, j + 1, k)] - v[iv(i, j, k)] + w[iw(i, j, k + 1)] - w[iw(i, j, k)]) / h;
      if (inchis && cil[c]) { sum += dv[c]; nc++; } }
    if (nc) { const m = sum / nc; for (let c = 0; c < n; c++) if (!tip[c] && cil[c]) dv[c] -= m; }
    const om = 1.8, k2 = (h * h) / dt;
    for (let s = 0; s < it; s++) for (let par = 0; par < 2; par++) for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = (j + k + par) & 1; i < nx; i += 2) {
      const c = id(i, j, k); if (tip[c]) continue; let nb = 0, sp = 0;
      if (i > 0) { if (!tip[c - 1]) { nb++; sp += p[c - 1]; } } else if (inlet[c]) nb++;
      if (i < nx - 1 && !tip[c + 1]) { nb++; sp += p[c + 1]; }
      if (j > 0 && !tip[c - nx]) { nb++; sp += p[c - nx]; }
      if (j < ny - 1 && !tip[c + nx]) { nb++; sp += p[c + nx]; }
      if (k > 0 && !tip[c - sxy]) { nb++; sp += p[c - sxy]; }
      if (k < nz - 1 && !tip[c + sxy]) { nb++; sp += p[c + sxy]; }
      if (nb) p[c] += om * ((sp - k2 * dv[c]) / nb - p[c]); }
    const f = dt / h;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) { const q = iu(i, j, k);
      if (i === 0) { const c = id(0, j, k); if (inlet[c] && !tip[c]) u[q] -= f * p[c]; continue; }
      if (i === nx) continue; const a = id(i - 1, j, k), b = a + 1; if (!tip[a] && !tip[b]) u[q] -= f * (p[b] - p[a]); }
    for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) { const b = id(i, j, k), a = b - nx; if (!tip[a] && !tip[b]) v[iv(i, j, k)] -= f * (p[b] - p[a]); }
    for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const b = id(i, j, k), a = b - sxy; if (!tip[a] && !tip[b]) w[iw(i, j, k)] -= f * (p[b] - p[a]); }
  }
  const Uc = (i, j, k) => 0.5 * (u[iu(i, j, k)] + u[iu(i + 1, j, k)]), Vc = (i, j, k) => 0.5 * (v[iv(i, j, k)] + v[iv(i, j + 1, k)]), Wc = (i, j, k) => 0.5 * (w[iw(i, j, k)] + w[iw(i, j, k + 1)]);
  function integrale(om) {
    let sx = 0, sy = 0, sz = 0, nc = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = id(i, j, k); if (tip[c] || !cil[c]) continue; sx += xc(i); sy += yc(j); sz += zc(k); nc++; }
    if (!nc) return { tumble: 0, cross: 0, swirl: 0, tke: 0, pCil: 0, ncil: 0 };
    const cx = sx / nc, cy = sy / nc, cz = sz / nc;
    let Lz = 0, Iz = 0, Lx = 0, Ix = 0, Ly = 0, Iy = 0, ke = 0, pm = 0, m = 0;
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const c = id(i, j, k); if (tip[c] || !cil[c]) continue;
      const U = Uc(i, j, k), V = Vc(i, j, k), W = Wc(i, j, k), rx = xc(i) - cx, ry = yc(j) - cy, rz = zc(k) - cz;
      Lz += rx * V - ry * U; Iz += rx * rx + ry * ry; Lx += ry * W - rz * V; Ix += ry * ry + rz * rz; Ly += rz * U - rx * W; Iy += rx * rx + rz * rz; pm += p[c];
      let su = 0, sv = 0, sw = 0, q = 0;
      for (const d of [-1, 1, -nx, nx, -sxy, sxy]) { const e = c + d; if (tip[e]) continue; const ii = e % nx, jj = ((e / nx) | 0) % ny, kk = (e / sxy) | 0; su += Uc(ii, jj, kk); sv += Vc(ii, jj, kk); sw += Wc(ii, jj, kk); q++; }
      if (q) { const a = U - su / q, b = V - sv / q, cc = W - sw / q; ke += 0.5 * (a * a + b * b + cc * cc); m++; } }
    return { tumble: Iz ? Lz / (Iz * om) : 0, cross: Ix ? Lx / (Ix * om) : 0, swirl: Iy ? Ly / (Iy * om) : 0, tke: m ? ke / m : 0, pCil: pm / nc, ncil: nc };
  }
  /** secțiunea z = 0 (câmpul la centrele celulelor) și secțiunea orizontală y = yh */
  const kM = Math.round((0 - z0) / h - 0.5);
  function sectiuni(yh) {
    const M = new Float32Array(sxy), U = new Float32Array(sxy), V = new Float32Array(sxy), T = new Uint8Array(sxy);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = id(i, j, kM), s = i + nx * j; T[s] = tip[c]; if (tip[c]) continue; const a = Uc(i, j, kM), b = Vc(i, j, kM); U[s] = a; V[s] = b; M[s] = Math.hypot(a, b, Wc(i, j, kM)); }
    const jh = Math.max(0, Math.min(ny - 1, Math.round((yh - y0) / h - 0.5))), sxz = nx * nz;
    const Mh = new Float32Array(sxz), Uh = new Float32Array(sxz), Wh = new Float32Array(sxz), Th = new Uint8Array(sxz);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const c = id(i, jh, k), s = i + nx * k; Th[s] = tip[c]; if (tip[c]) continue; const a = Uc(i, jh, k), b = Wc(i, jh, k); Uh[s] = a; Wh[s] = b; Mh[s] = Math.hypot(a, b, Vc(i, jh, k)); }
    return { M, U, V, T, Mh, Uh, Wh, Th, yh: y0 + (jh + 0.5) * h };
  }
  // particulele-trasor
  const NP = o.particule || 2500, P = new Float32Array(NP * 3).fill(NaN), Pv = new Float32Array(NP); let pNext = 0, rnd = 12345;
  const rand = () => { rnd = (rnd * 16807) % 2147483647; return (rnd - 1) / 2147483646; };
  const intrari = []; for (let c = 0; c < n; c++) if (inlet[c]) intrari.push(c);
  const solid = (X, Y, Z) => { const i = Math.floor((X - x0) / h), j = Math.floor((Y - y0) / h), k = Math.floor((Z - z0) / h); if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return true; return tip[id(i, j, k)] !== 0; };
  function particule(dt, injecteaza) {
    if (injecteaza && intrari.length) for (let s = 0; s < (o.injectie || 30); s++) { const c = intrari[(rand() * intrari.length) | 0], j = ((c / nx) | 0) % ny, k = (c / sxy) | 0, q = pNext % NP;
      P[q * 3] = x0 + 0.3 * h; P[q * 3 + 1] = yc(j) + (rand() - 0.5) * h; P[q * 3 + 2] = zc(k) + (rand() - 0.5) * h; pNext++; }
    for (let q = 0; q < NP; q++) { const X = P[q * 3]; if (X !== X) continue; const Y = P[q * 3 + 1], Z = P[q * 3 + 2];
      const a = sU(X, Y, Z), b = sV(X, Y, Z), c = sW(X, Y, Z), Xm = X + 0.5 * dt * a, Ym = Y + 0.5 * dt * b, Zm = Z + 0.5 * dt * c;
      const a2 = sU(Xm, Ym, Zm), b2 = sV(Xm, Ym, Zm), c2 = sW(Xm, Ym, Zm), Xn = X + dt * a2, Yn = Y + dt * b2, Zn = Z + dt * c2;
      if (!solid(Xn, Yn, Zn)) { P[q * 3] = Xn; P[q * 3 + 1] = Yn; P[q * 3 + 2] = Zn; }
      else if (solid(X, Y, Z)) P[q * 3 + 1] = Y + dt * Math.abs(vp) + 0.2 * h;
      Pv[q] = Math.hypot(a2, b2, c2); }
  }
  /** după închiderea supapei, coloana de aer din canal se oprește (unda de presiune reflectată și frecarea la perete, care lipsesc
      dintr-un model incompresibil fără vâscozitate): amortizare exponențială cu constanta de timp a 8 °RAC, numai în canal (y > 0) */
  function franeazaCanal(dt, om) { const f = Math.exp(-dt / ((8 * RAD) / om));
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) { if (yc(j) <= 0) continue; for (let i = 0; i <= nx; i++) u[iu(i, j, k)] *= f; for (let i = 0; i < nx; i++) w[iw(i, j, k)] *= f; }
    for (let k = 0; k < nz; k++) for (let j = 1; j <= ny; j++) { if (y0 + j * h <= 0) continue; for (let i = 0; i < nx; i++) v[iv(i, j, k)] *= f; }
    for (let j = 0; j < ny; j++) if (yc(j) > 0) for (let i = 0; i < nx; i++) w[iw(i, j, nz)] *= f; }
  /** rulează 0…a1 °RAC cu pasul dA; laPas(a, r, cadru?) – cadrele la fiecare pasCadru grade */
  function ruleaza(n_rpm, a0, a1, dA, itP, pasCadru, laPas) {
    const om = (n_rpm * Math.PI) / 30, dt = (dA * RAD) / om, ser = [];
    for (let a = a0; a <= a1 + 1e-9; a += dA) {
      const yp0 = geo.yPiston(a), yp1 = geo.yPiston(a + dA); vp = (yp1 - yp0) / dt; vval = -(geo.Lv(a + dA) - geo.Lv(a)) / dt;
      masca(a); conditii(); advectie(dt); conditii(); proiectie(dt, itP); conditii();
      if (Lcur < 1e-5) franeazaCanal(dt, om);
      particule(dt, geo.Lv(a) > 0.02 * geo.g.Lmax && a < 180 + geo.g.isa);
      const r = integrale(om), Qd = Math.abs(vp) * Math.PI * D * D / 4, A = Math.PI * geo.dv * Math.max(geo.Lv(a), 1e-9);
      r.Cd = geo.Lv(a) > 0.1 * geo.g.Lmax && r.pCil < -1 && vp < 0 ? Math.min(1.2, Qd / (A * Math.sqrt(2 * Math.abs(r.pCil)))) : null;
      r.a = a; r.L = geo.Lv(a); r.vp = vp; ser.push(r);
      let cadru = null;
      if (pasCadru && Math.round(a / dA) % Math.round(pasCadru / dA) === 0) {
        const yp = geo.yPiston(a); cadru = Object.assign(sectiuni(yp + 0.5 * (-yp)), { a, P: P.slice(), Pv: Pv.slice(), yp, L: geo.Lv(a) }); }
      if (laPas) laPas(a, r, cadru);
    }
    return ser;
  }
  return { nx, ny, nz, h, x0, y0, z0, n, ruleaza, masca, kM };
}
