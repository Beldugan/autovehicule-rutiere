/* Calcule de structură și termice pentru post-procesarea motorului (fără DOM):
   • bielaMEF – metoda elementelor finite în starea plană de tensiune (elemente triunghiulare cu deformație constantă, grosime pe
     element: ochiurile groase, tija cu grosimea echivalentă a profilului dublu T): biela încărcată la compresiune (forța gazelor,
     contactul bolțului pe jumătatea inferioară a ochiului mic) și la întindere (forțele de inerție, jumătatea superioară);
     ochiul mare rezemat pe jumătatea solicitată. Sistemul se rezolvă cu gradient conjugat (matrice neasamblată);
     tensiunea echivalentă von Mises pe noduri (medierea elementelor vecine).
   • chiulasaTermic – conducția staționară în placa de foc a chiulasei (planul x–z): fluxul de căldură din gaze pe camera de
     ardere (mai mare spre supapa de evacuare), răcirea prin lichid în cămașa de apă, orificiile supapelor și al bujiei. */

/** o = { D, L (distanța dintre ochiuri), h (pasul rețelei), E, nu } – întoarce câmpurile unitare (forța de 1 N în bielă) */
export function bielaMEF(o) {
  const D = o.D, L = o.L, E = o.E ?? 2.1e11, nu = o.nu ?? 0.3, h = o.h ?? D / 40;
  const ri1 = 0.11 * D, ro1 = 0.2 * D, ri2 = 0.27 * D, ro2 = 0.4 * D, tE1 = 0.28 * D, tE2 = 0.3 * D, tT = 0.16 * D;
  const yA = -ro1 * 0.7, yB = -L + ro2 * 0.7, wA = 0.1 * D, wB = 0.15 * D;
  const latime = (y) => wA + ((wB - wA) * (yA - y)) / (yA - yB);
  const r1 = (x, y) => Math.hypot(x, y), r2 = (x, y) => Math.hypot(x, y + L);
  const inauntru = (x, y) => { const a = r1(x, y), b = r2(x, y); if (a < ri1 || b < ri2) return false;
    if (a <= ro1 || b <= ro2) return true; return y < 0 && y > -L && Math.abs(x) <= latime(Math.min(yA, Math.max(yB, y))); };
  const grosime = (x, y) => { const a = r1(x, y), b = r2(x, y); if (a <= ro1 * 1.02) return tE1; if (b <= ro2 * 1.02) return tE2; return tT; };
  // rețeaua: grilă uniformă împărțită în triunghiuri, păstrate cele cu centrul în piesă; nodurile de lângă găuri – pe cerc
  const X0 = -ro2 - h, X1 = ro2 + h, Y0 = -L - ro2 - h, Y1 = ro1 + h, NX = Math.ceil((X1 - X0) / h), NY = Math.ceil((Y1 - Y0) / h);
  const gid = (i, j) => j * (NX + 1) + i, folosit = new Int32Array((NX + 1) * (NY + 1)).fill(-1), tri = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = gid(i, j), b = gid(i + 1, j), c = gid(i + 1, j + 1), d = gid(i, j + 1);
    const x = X0 + i * h, y = Y0 + j * h, alt = (i + j) % 2;
    const t1 = alt ? [a, b, c] : [a, b, d], t2 = alt ? [a, c, d] : [b, c, d];
    [t1, t2].forEach((t) => { const cx = t.reduce((s, q) => s + X0 + (q % (NX + 1)) * h, 0) / 3, cy = t.reduce((s, q) => s + Y0 + Math.floor(q / (NX + 1)) * h, 0) / 3; if (inauntru(cx, cy)) tri.push(t); }); void x; void y; }
  tri.forEach((t) => t.forEach((q) => { folosit[q] = 0; }));
  const nod = []; folosit.forEach((v, q) => { if (v === 0) { folosit[q] = nod.length; nod.push([X0 + (q % (NX + 1)) * h, Y0 + Math.floor(q / (NX + 1)) * h]); } });
  const T = tri.map((t) => t.map((q) => folosit[q]));
  const pe = (p, cx, cy, r) => { const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy); if (Math.abs(d - r) < 0.55 * h && d > 0) { p[0] = cx + (dx * r) / d; p[1] = cy + (dy * r) / d; return true; } return false; };
  const gaura1 = [], gaura2 = [];
  nod.forEach((p, k) => { if (pe(p, 0, 0, ri1)) gaura1.push(k); else if (pe(p, 0, -L, ri2)) gaura2.push(k); else { pe(p, 0, 0, ro1) || pe(p, 0, -L, ro2); } });
  const n = nod.length, ne = T.length;
  // matricele elementelor
  const c0 = E / (1 - nu * nu), Bm = new Float64Array(ne * 18), Ar = new Float64Array(ne), te = new Float64Array(ne);
  T.forEach(([a, b, c], e) => { const [x1, y1] = nod[a], [x2, y2] = nod[b], [x3, y3] = nod[c], A2 = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    if (A2 < 0) { T[e] = [a, c, b]; } const [p1, p2, p3] = T[e].map((q) => nod[q]), A = 0.5 * Math.abs(A2);
    if (A < 0.02 * h * h) { Ar[e] = 0; te[e] = 0; return; }   // triunghi degenerat după proiectarea nodurilor pe cerc
    const b1 = p2[1] - p3[1], b2 = p3[1] - p1[1], b3 = p1[1] - p2[1], g1 = p3[0] - p2[0], g2 = p1[0] - p3[0], g3 = p2[0] - p1[0], f = 1 / (2 * A);
    Bm.set([b1 * f, 0, b2 * f, 0, b3 * f, 0, 0, g1 * f, 0, g2 * f, 0, g3 * f, g1 * f, b1 * f, g2 * f, b2 * f, g3 * f, b3 * f], e * 18);
    Ar[e] = A; te[e] = grosime((p1[0] + p2[0] + p3[0]) / 3, (p1[1] + p2[1] + p3[1]) / 3); });
  const viu = new Uint8Array(n); T.forEach((t, e) => { if (Ar[e] > 0) t.forEach((q) => { viu[q] = 1; }); });   // nodurile fără element valid se blochează
  const Dm = [c0, c0 * nu, 0, c0 * nu, c0, 0, 0, 0, (c0 * (1 - nu)) / 2];
  const deformatie = (u, e) => { const B = Bm.subarray(e * 18, e * 18 + 18), q = T[e], ue = [u[2 * q[0]], u[2 * q[0] + 1], u[2 * q[1]], u[2 * q[1] + 1], u[2 * q[2]], u[2 * q[2] + 1]], s = [0, 0, 0];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) s[r] += B[r * 6 + k] * ue[k]; return s; };
  function Ku(u, fixat, out) { out.fill(0);
    for (let e = 0; e < ne; e++) { const eps = deformatie(u, e), sg = [Dm[0] * eps[0] + Dm[1] * eps[1], Dm[3] * eps[0] + Dm[4] * eps[1], Dm[8] * eps[2]], B = Bm.subarray(e * 18, e * 18 + 18), q = T[e], w = Ar[e] * te[e];
      for (let k = 0; k < 6; k++) { const v = (B[k] * sg[0] + B[6 + k] * sg[1] + B[12 + k] * sg[2]) * w; out[2 * q[k >> 1] + (k & 1)] += v; } }
    fixat.forEach((d) => { out[d] = u[d]; }); }
  function rezolva(f, fixat) {
    const N = 2 * n, u = new Float64Array(N), r = Float64Array.from(f), p = new Float64Array(N), Ap = new Float64Array(N);
    fixat.forEach((d) => { r[d] = 0; }); p.set(r); let rr = r.reduce((s, v) => s + v * v, 0); const r0 = Math.sqrt(rr); let it = 0;
    for (; it < 6000 && Math.sqrt(rr) > 1e-9 * r0; it++) { Ku(p, fixat, Ap); let pAp = 0; for (let k = 0; k < N; k++) pAp += p[k] * Ap[k]; const al = rr / pAp; let rn = 0;
      for (let k = 0; k < N; k++) { u[k] += al * p[k]; r[k] -= al * Ap[k]; rn += r[k] * r[k]; } const be = rn / rr; rr = rn; for (let k = 0; k < N; k++) p[k] = r[k] + be * p[k]; }
    // tensiunile: von Mises pe elemente, mediate pe noduri
    const vmE = new Float64Array(ne), syE = new Float64Array(ne), vm = new Float64Array(n), cnt = new Float64Array(n);
    for (let e = 0; e < ne; e++) { const eps = deformatie(u, e), sx = Dm[0] * eps[0] + Dm[1] * eps[1], sy = Dm[3] * eps[0] + Dm[4] * eps[1], tx = Dm[8] * eps[2];
      vmE[e] = Math.sqrt(sx * sx - sx * sy + sy * sy + 3 * tx * tx); syE[e] = sy; T[e].forEach((q) => { vm[q] += vmE[e] * Ar[e]; cnt[q] += Ar[e]; }); }
    for (let k = 0; k < n; k++) vm[k] /= cnt[k] || 1;
    return { u, vm, vmE, syE, it };
  }
  // încărcările unitare (1 N în bielă)
  function caz(compresiune) {
    const f = new Float64Array(2 * n), fixat = [];
    for (let k = 0; k < n; k++) if (!viu[k]) fixat.push(2 * k, 2 * k + 1);
    const sel = gaura1.filter((k) => viu[k] && (compresiune ? nod[k][1] < -1e-9 : nod[k][1] > 1e-9)); let s = 0;
    sel.forEach((k) => { const sn = nod[k][1] / ri1; s += Math.abs(sn) * Math.abs(sn); });
    sel.forEach((k) => { const cs = nod[k][0] / ri1, sn = nod[k][1] / ri1, w = Math.abs(sn) / s; f[2 * k] += w * cs; f[2 * k + 1] += w * sn; });
    gaura2.forEach((k) => { const y = nod[k][1] + L; if (compresiune ? y > -0.2 * ri2 : y < 0.2 * ri2) fixat.push(2 * k, 2 * k + 1); });
    return rezolva(f, fixat);
  }
  const C = caz(true), Tn = caz(false);
  // verificarea: tensiunea medie pe secțiunea de la mijlocul tijei față de F / A (A = 2·w·t)
  const ym = (yA + yB) / 2; let sA = 0, sw = 0; T.forEach((t, e) => { const cy = (nod[t[0]][1] + nod[t[1]][1] + nod[t[2]][1]) / 3; if (Math.abs(cy - ym) < h) { sA += C.syE[e] * Ar[e]; sw += Ar[e]; } });
  const sigMed = sw ? sA / sw : 0, sigAn = -1 / (2 * latime(ym) * tT);
  // muchiile de contur (pentru pereții laterali ai piesei 3D)
  const muchii = new Map(); T.forEach((t) => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]].forEach(([a, b]) => { const k = a < b ? a + "," + b : b + "," + a; muchii.set(k, muchii.has(k) ? null : [a, b]); }));
  const contur = [...muchii.values()].filter(Boolean);
  return { nod, T, contur, n, ne, grosimeNod: nod.map(([x, y]) => grosime(x, y)), comp: C.vm, intin: Tn.vm, itC: C.it, itT: Tn.it, sigMed, sigAn, h, ri1, ro1, ri2, ro2 };
}

/** o = { D, xv (abscisa supapei de admisie), dv, q (fluxul mediu W/m²), k, t, hw (cămașa de apă), hSus (răcirea plăcii de foc prin canalele de deasupra), Tw (lichidul), N } */
export function chiulasaTermic(o) {
  const D = o.D, XH = 0.82 * D, ZH = 0.62 * D, N = o.N || 96, nx = N, nz = Math.round((N * ZH) / XH), dx = (2 * XH) / nx, dz = (2 * ZH) / nz;
  const k = o.k ?? 150, t = o.t ?? 0.01, hw = o.hw ?? 8000, hSus = o.hSus ?? 3500, Tw = o.Tw ?? 90, q0 = o.q;
  const n = nx * nz, tip = new Uint8Array(n), q = new Float64Array(n), rac = new Float64Array(n);   // tip: 0 metal, 1 gol (orificiu)
  const rv = o.dv * 0.53, xv = o.xv, Ach = (Math.PI * D * D) / 4;
  let Qin = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i, x = -XH + (i + 0.5) * dx, z = -ZH + (j + 0.5) * dz, r = Math.hypot(x, z);
    const gA = Math.hypot(x - xv, z) < rv * 0.86, gE = Math.hypot(x + xv, z) < rv * 0.8, gB = Math.hypot(x, z + 0.3 * D) < 0.07 * D;
    const surub = [[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([a, b]) => Math.hypot(x - a * 0.64 * D, z - b * 0.5 * D) < 0.045 * D);
    if (gA || gB || surub) { tip[c] = 1; continue; }
    if (r < D / 2) { const f = 1 + 0.6 * Math.max(0, x / (D / 2)) - 0.25 * Math.max(0, -x / (D / 2)); /* partea evacuării (x > 0) primește mai multă căldură */ q[c] = gE ? 0 : q0 * f; if (gE) q[c] = q0 * 2.2 * 0.35; }   // scaunul supapei de evacuare: căldura adusă de supapă
    rac[c] = r > 0.6 * D ? hw : hSus;                  // cămașa de apă (inel exterior) și canalele de apă de deasupra plăcii de foc
    Qin += q[c] * dx * dz; }
  // conducția 2D: −k·t·∇²T + h·(T − Tw) = q  (gradient conjugat, precondiționare Jacobi)
  const ax = (k * t * dz) / dx, az = (k * t * dx) / dz, dg = new Float64Array(n), b = new Float64Array(n), T = new Float64Array(n).fill(Tw);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i; if (tip[c]) continue;
    dg[c] = (i > 0 && !tip[c - 1] ? ax : 0) + (i < nx - 1 && !tip[c + 1] ? ax : 0) + (j > 0 && !tip[c - nx] ? az : 0) + (j < nz - 1 && !tip[c + nx] ? az : 0) + rac[c] * dx * dz;
    b[c] = q[c] * dx * dz + rac[c] * dx * dz * Tw; }
  const Am = (x, y) => { for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i; if (tip[c]) { y[c] = x[c]; continue; } let v = dg[c] * x[c];
    if (i > 0 && !tip[c - 1]) v -= ax * x[c - 1]; if (i < nx - 1 && !tip[c + 1]) v -= ax * x[c + 1]; if (j > 0 && !tip[c - nx]) v -= az * x[c - nx]; if (j < nz - 1 && !tip[c + nx]) v -= az * x[c + nx]; y[c] = v; } };
  for (let c = 0; c < n; c++) if (tip[c]) { dg[c] = 1; b[c] = Tw; }
  const r = new Float64Array(n), z = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n); Am(T, Ap);
  let rz = 0, bn = 0; for (let c = 0; c < n; c++) { r[c] = b[c] - Ap[c]; z[c] = r[c] / dg[c]; p[c] = z[c]; rz += r[c] * z[c]; bn += b[c] * b[c]; } bn = Math.sqrt(bn);
  let it = 0; for (; it < 8000; it++) { Am(p, Ap); let pAp = 0; for (let c = 0; c < n; c++) pAp += p[c] * Ap[c]; const al = rz / pAp; let rn = 0, rz1 = 0;
    for (let c = 0; c < n; c++) { T[c] += al * p[c]; r[c] -= al * Ap[c]; rn += r[c] * r[c]; z[c] = r[c] / dg[c]; rz1 += r[c] * z[c]; } if (Math.sqrt(rn) < 1e-10 * bn) break; const be = rz1 / rz; rz = rz1; for (let c = 0; c < n; c++) p[c] = z[c] + be * p[c]; }
  let Qout = 0, Tmax = -Infinity, Tmin = Infinity; for (let c = 0; c < n; c++) { if (tip[c]) continue; Qout += rac[c] * dx * dz * (T[c] - Tw); Tmax = Math.max(Tmax, T[c]); Tmin = Math.min(Tmin, T[c]); }
  return { T, tip, nx, nz, dx, dz, XH, ZH, Qin, Qout, bilant: Math.abs(Qout - Qin) / Qin, Tmax, Tmin, it, qMed: q0, Ach };
}
