/* Modulul M – solverul intern de dinamică multicorp (corpuri rigide, mișcare plană):
   • mecanismul bielă-manivelă (cu dezaxare): poziții prin Newton pe ecuațiile de închidere, viteze și accelerații din
     sistemele liniare ale constrângerilor, reacțiuni din ecuațiile Newton–Euler ale pistonului și bielei (corp rigid cu J_G);
   • lanțul torsional (rotor – angrenaje – roți / arbore cotit – volant): frecvențe proprii din problema generalizată K·φ = ω²·J·φ
     (metoda Jacobi), diagrama Campbell cu ordinele de angrenare și de excitație;
   • angrenajele: reductorul cu axe fixe (turații, cupluri, forțe în dantură, frecvența de angrenare) și planetarul simplu (relația Willis). */

const rad = (g) => (g * Math.PI) / 180;

/* ------------------------------------------------------------------ mecanismul bielă-manivelă */
/** geo = { R, L, e } [m]; ω [rad/s]; întoarce soluția cinematică exactă la unghiul α [°] (α = 0 în PMS, rotire în sens orar)
    coordonate: y pe axa cilindrului (în sus), x transversal; q = [y_B, θ], u = (sin θ, cos θ) de la A (maneton) la B (bolț) */
export function cinematicaExacta(geo, alfaG, omega, q0) {
  const { R, L } = geo, e = geo.e || 0, a = rad(alfaG), sa = Math.sin(a), ca = Math.cos(a);
  let yB = q0 ? q0[0] : R * ca + L, th = q0 ? q0[1] : Math.asin((e - R * sa) / L), it = 0, rez = 1;
  for (; it < 30; it++) {
    const F1 = R * sa + L * Math.sin(th) - e, F2 = yB - R * ca - L * Math.cos(th);
    rez = Math.hypot(F1, F2); if (rez < 1e-13) break;
    // J = [[0, L cosθ], [1, L sinθ]]
    const dth = -F1 / (L * Math.cos(th)), dyB = -F2 - L * Math.sin(th) * dth;
    th += dth; yB += dyB;
  }
  const st = Math.sin(th), ct = Math.cos(th), w = omega;
  // viteze: J q̇ = −[R cosα, R sinα] ω
  const thd = (-R * ca * w) / (L * ct), yBd = -R * sa * w - L * st * thd;
  // accelerații: J q̈ = [R sinα ω² + L sinθ θ̇², −R cosα ω² − L cosθ θ̇²]
  const b1 = R * sa * w * w + L * st * thd * thd, b2 = -R * ca * w * w - L * ct * thd * thd;
  const thdd = b1 / (L * ct), yBdd = b2 - L * st * thdd;
  return { yB, th, thd, thdd, yBd, yBdd, it, rez, sa, ca, st, ct };
}

/** relațiile aproximative ale îndrumarului (seria în λ trunchiată) și relația geometrică exactă pentru x */
export function cinematicaIndrumar(R, lam, omega, alfaG) {
  const a = rad(alfaG);
  return { x: R * ((1 - Math.cos(a)) + (lam / 4) * (1 - Math.cos(2 * a))), v: R * omega * (Math.sin(a) + (lam / 2) * Math.sin(2 * a)), a: R * omega * omega * (Math.cos(a) + lam * Math.cos(2 * a)) };
}
export const xExact = (R, L, alfaG) => { const a = rad(alfaG); return R * (1 - Math.cos(a)) + L - Math.sqrt(L * L - R * R * Math.sin(a) ** 2); };

/** dinamica corpurilor rigide pentru un unghi: m = { m_gp (grupul piston), m_b (biela), lA (de la maneton la centrul de masă al bielei), J_G },
    Fgaz [N] (pozitivă când apasă pistonul spre arbore) */
export function dinamicaPunct(geo, m, k, omega, Fgaz) {
  const { R, L } = geo, lA = m.lA, lB = L - lA, w = omega;
  const { sa, ca, st, ct, thd, thdd, yBdd } = k;
  // pistonul: B_y − F_gaz = m_gp·ÿ_B  (B = forța bielei asupra pistonului)
  const By = m.m_gp * yBdd + Fgaz;
  // accelerația centrului de masă al bielei
  const aAx = -R * sa * w * w, aAy = -R * ca * w * w;
  const aGx = aAx + lA * (thdd * ct - thd * thd * st), aGy = aAy + lA * (-thdd * st - thd * thd * ct);
  // ecuația de momente a bielei (în jurul lui G) → B_x
  const Bx = (-m.J_G * thdd + lA * st * m.m_b * aGy - lA * ct * m.m_b * aGx + L * st * By) / (L * ct);
  const Ax = m.m_b * aGx + Bx, Ay = m.m_b * aGy + By; // forța manetonului asupra bielei
  const N = -Bx;                                          // reacțiunea cilindrului asupra pistonului (forța normală)
  const M = R * sa * Ay - R * ca * Ax;                    // momentul motor transmis arborelui (sens de rotație pozitiv)
  const T = -Ax * ca + Ay * sa, Z = Ax * sa + Ay * ca;    // forța pe maneton: tangențială / radială (spre axa arborelui)
  const S = Math.hypot(Bx, By) * Math.sign(By);           // forța în bielă (compresiune pozitivă)
  return { By, Bx, Ax, Ay, N, M, T, Z, S, aGx, aGy, lB };
}

/** rulează mecanismul pe un ciclu: pAlfa(α°) → p [MPa]; întoarce seriile și diagnosticul solverului */
export function simuleazaMecanism(geo, m, omega, pAlfa, o = {}) {
  const pas = o.pas || 1, aMax = o.aMax || 720, pc = o.p_carter ?? 0.1, Ap = (Math.PI * geo.D * geo.D) / 4;
  const out = { alfa: [], x: [], v: [], a: [], Fg: [], Fj: [], N: [], S: [], T: [], Z: [], M: [], Rm: [], th: [], itMax: 0, rezMax: 0, inchidere: 0, bilant: 0 };
  const yTDC = Math.sqrt((geo.R + geo.L) ** 2 - (geo.e || 0) ** 2);
  let q = null, Wgaz = 0, Wmot = 0;
  for (let al = 0; al <= aMax + 1e-9; al += pas) {
    const k = cinematicaExacta(geo, al, omega, q); q = [k.yB, k.th];
    const p = pAlfa(al), Fg = (p - pc) * 1e6 * Ap;
    const d = dinamicaPunct(geo, m, k, omega, Fg);
    out.alfa.push(al); out.x.push(yTDC - k.yB); out.v.push(-k.yBd); out.a.push(-k.yBdd);
    out.Fg.push(Fg); out.Fj.push(-m.m_gp * -k.yBdd); out.N.push(d.N); out.S.push(d.S); out.T.push(d.T); out.Z.push(d.Z); out.M.push(d.M); out.th.push(k.th);
    out.Rm.push(Math.hypot(d.T, d.Z));
    out.itMax = Math.max(out.itMax, k.it); out.rezMax = Math.max(out.rezMax, k.rez);
    // închiderea cinematică verificată independent: |A + L·u − B|
    const Ax = geo.R * k.sa, Ay = geo.R * k.ca; out.inchidere = Math.max(out.inchidere, Math.abs(Math.hypot((geo.e || 0) - Ax, k.yB - Ay) - geo.L));
    // bilanțul puterii: puterea gazelor + inerția = puterea la arbore (integrată pe ciclu)
    Wgaz += Fg * -k.yBd * rad(pas) / omega; Wmot += d.M * omega * rad(pas) / omega;
  }
  out.Wgaz = Wgaz; out.Wmot = Wmot; out.bilant = Math.abs(Wgaz - Wmot) / Math.max(1e-9, Math.abs(Wgaz));
  return out;
}

/** decalajul ciclurilor cilindrilor (°RAC) și unghiurile manetoanelor, după numărul de cilindri și timpi */
export function ordineAprindere(i, tau) {
  if (tau === 4 && i === 4) return { ordine: "1-3-4-2", dec: [0, 180, 540, 360], man: [0, 180, 180, 0] };
  if (tau === 4 && i === 3) return { ordine: "1-2-3", dec: [0, 240, 480], man: [0, 240, 120] };
  if (tau === 4 && i === 6) return { ordine: "1-5-3-6-2-4", dec: [0, 480, 240, 600, 120, 360], man: [0, 240, 120, 120, 240, 0] };
  if (tau === 4 && i === 2) return { ordine: "1-2", dec: [0, 360], man: [0, 0] };
  if (i === 1) return { ordine: "1", dec: [0], man: [0] };
  const per = tau === 2 ? 360 : 720, dec = Array.from({ length: i }, (_, k) => (k * per) / i);
  return { ordine: dec.map((_, k) => k + 1).join("-"), dec, man: dec.map((d) => ((tau === 2 ? d : d / 2) % 360)) };
}
/** momentul total al motorului policilindric (suprapunerea momentelor decalate) */
export function momentTotal(alfa, M, dec, per) {
  const pas = alfa[1] - alfa[0], nP = Math.round(per / pas), Mt = new Array(nP).fill(0);
  dec.forEach((d) => { const s = Math.round(d / pas); for (let j = 0; j < nP; j++) Mt[(j + s) % nP] += M[j]; });
  const med = Mt.reduce((s, v) => s + v, 0) / nP;
  return { Mt: Mt.concat([Mt[0]]), med, max: Math.max(...Mt), min: Math.min(...Mt), neunif: (Math.max(...Mt) - Math.min(...Mt)) / med };
}

/* ------------------------------------------------------------------ valori proprii (Jacobi) și lanțul torsional */
export function jacobi(A) {
  const n = A.length, a = A.map((r) => r.slice()), V = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { val: a.map((r, i) => r[i]), vec: V };
}
/** lanț torsional liber-liber: J = [kg·m²] (raportate la același arbore), k = rigiditățile dintre ele [N·m/rad] */
export function modTorsional(J, k) {
  const n = J.length, K = J.map(() => new Array(n).fill(0));
  k.forEach((kk, i) => { K[i][i] += kk; K[i + 1][i + 1] += kk; K[i][i + 1] -= kk; K[i + 1][i] -= kk; });
  const s = J.map((j) => 1 / Math.sqrt(j)), A = K.map((r, i) => r.map((v, j) => v * s[i] * s[j]));
  const { val, vec } = jacobi(A);
  const moduri = val.map((l, m) => ({ f: Math.sqrt(Math.max(0, l)) / (2 * Math.PI), forma: vec.map((r, i) => r[m] * s[i]) }));
  moduri.forEach((md) => { const mx = md.forma.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0) || 1; md.forma = md.forma.map((v) => v / mx); });
  return moduri.sort((a, b) => a.f - b.f);
}

/* ------------------------------------------------------------------ angrenaje */
/** treaptă cu axe fixe, angrenare exterioară ideală: n2 = −n1·z1/z2; f = z1·n1/60; cuplu de ieșire |M2| = M1·z2/z1·η */
export function treapta(z1, z2, n1, M1, m_n = 2, eta = 1, alfaN = 20) {
  const n2 = -(n1 * z1) / z2, d1 = (m_n * z1) / 1000, d2 = (m_n * z2) / 1000, Ft = (2 * M1) / d1, Fr = Ft * Math.tan(rad(alfaN));
  return { n2, i: z2 / z1, f: (z1 * Math.abs(n1)) / 60, P1: (M1 * n1 * Math.PI) / 30, M2: (M1 * z2 * eta) / z1, d1, d2, Ft, Fr, Fn: Ft / Math.cos(rad(alfaN)), a: (d1 + d2) / 2 };
}
/** planetarul simplu: (Ns + Nr)·ωc = Ns·ωs + Nr·ωr; cuplurile ideale la echilibru: Ts = −Tc·Ns/(Ns+Nr), Tr = −Tc·Nr/(Ns+Nr) */
export function willis(Ns, Nr, d) {
  const k = Nr / Ns;
  let { nc, ns, nr } = d;
  if (ns == null) ns = (1 + k) * nc - k * nr; else if (nr == null) nr = ((1 + k) * nc - ns) / k; else if (nc == null) nc = (ns + k * nr) / (1 + k);
  const Tc = d.Tc ?? 100, Ts = (-Tc * Ns) / (Ns + Nr), Tr = (-Tc * Nr) / (Ns + Nr), w = (n) => (n * Math.PI) / 30;
  return { nc, ns, nr, Tc, Ts, Tr, Pc: (Tc * w(nc)) / 1000, Ps: (Ts * w(ns)) / 1000, Pr: (Tr * w(nr)) / 1000, k, Np: (Nr - Ns) / 2 };
}
