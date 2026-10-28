// Completările calculului clasic (îndrumarul PCMAI, ed. a II-a, cap. 12–13), port fidel al engine.py:
//  • model0D()            – modelul zero-dimensional monozonal pe unghiul de RAC: legea Vibe (Wiebe) de degajare a căldurii,
//                           transferul de căldură Woschni, proprietățile reale ale gazelor (aceleași tabele u, i), integrare Heun;
//  • pAlfa0D()            – diagrama p–α completă pe 0…720 °RAC (admisie, ciclul 0D, evacuarea liberă racordată);
//  • cinematicaDinamica() – x, v, a; forțele Fg, Fj, N, S, T, Z; momentul unui cilindru și momentul total policilindric;
//                           sarcina pe fusul maneton (diagrama polară) și diagrama de uzură.
(function (root) {
  "use strict";
  const TAB = root.TABELE || (typeof TABELE !== "undefined" ? TABELE : null);
  const R_U = 8.314, PAS = 50, T0 = TAB[0][0];
  const rad = (g) => (g * Math.PI) / 180;

  function tab(T, c) {
    const k = Math.floor((T - T0) / PAS);
    if (k < 0 || k + 1 >= TAB.length) throw new Error(`T = ${T.toFixed(0)} K în afara tabelelor (200…3500 K)`);
    return TAB[k][c] + ((T - TAB[k][0]) * (TAB[k + 1][c] - TAB[k][c])) / PAS;
  }
  const uMix = (T, n) => n[0] * tab(T, 1) + n[1] * tab(T, 2) + n[2] * tab(T, 3) + n[3] * tab(T, 4);
  const cvMix = (T, n) => (uMix(T + 1, n) - uMix(T - 1, n)) / 2;

  function vibe(phi, phi0, dphi, m, a = 6.908) { const x = Math.max(0, (phi - phi0) / dphi); return 1 - Math.exp(-a * Math.pow(x, m + 1)); }
  function dvibe(phi, phi0, dphi, m, a = 6.908) { const x = (phi - phi0) / dphi; if (x <= 0) return 0; return (a * (m + 1) / dphi) * Math.pow(x, m) * Math.exp(-a * Math.pow(x, m + 1)); }

  /** parametrii Vibe din îndrumar: MAS o singură lege, MAC două legi (fracțiunea g_v arsă rapid, restul difuziv) */
  function vibeImplicit(r) {
    return r.date.tip === "MAC" ? [[r.g_v, 4.2, 10, 2], [1 - r.g_v, 4.2, 75, 1]] : [[1, -18, 55, 2]];
  }

  /** r = rezultatul calculului clasic; vp = [[fracțiune, φ0 (° după PMI), durata (°), m], …]; φ = 0 la PMI-ardere */
  function model0D(r, vp, o = {}) {
    const eta_c = o.eta_c ?? (r.date.tip === "MAC" ? 0.99 : 0.97), T_w = o.T_w ?? 450, C2 = o.C2 ?? 3.24e-3, pas = o.pas ?? 0.25, woschni = o.woschni !== false;
    vp = vp || vibeImplicit(r);
    const D = r.date, n_P = o.n ?? D.n_P;
    const Dm = (o.D_cil ?? r.D_cil) / 1000, Sm = (o.S_cil ?? r.S_cil) / 1000, Rm = Sm / 2, lam = D.lam;
    const Ap = (Math.PI * Dm * Dm) / 4, Vh = Ap * Sm, Vc = Vh / (D.eps - 1), om = (Math.PI * n_P) / 30, cm = (Sm * n_P) / 30;
    const V = (phi) => { const a = rad(phi); return Vc + (Vh / 2) * ((1 - Math.cos(a)) + (lam / 4) * (1 - Math.cos(2 * a))); };
    const dV = (phi) => { const a = rad(phi); return (Vh / 2) * (Math.sin(a) + (lam / 2) * Math.sin(2 * a)) * Math.PI / 180; };
    const Va = V(-180), n_cyl = (r.p_a * 1e3 * Va) / (R_U * r.T_a), m_f = n_cyl / r.M_a;
    const a = [r.a_CO2, r.a_H2O, r.a_O2, r.a_N2], z = [r.z_CO2, r.z_H2O, r.z_O2, r.z_N2];
    const Q_f = m_f * D.Q_i * eta_c, frac = vp.reduce((s, v) => s + v[0], 0), start = Math.min(...vp.map((v) => v[1]));
    const xb = (phi) => vp.reduce((s, [f, p0, dp, m]) => s + (f / frac) * vibe(phi, p0, dp, m), 0);
    const dxb = (phi) => vp.reduce((s, [f, p0, dp, m]) => s + (f / frac) * dvibe(phi, p0, dp, m), 0);
    const comp = (x) => a.map((ai, j) => m_f * (ai + x * (z[j] - ai)));
    const p1 = r.p_a * 1e3, V1 = Va, T1 = r.T_a, n_ref = r.n_1;
    const deriv = (phi, T) => {
      const x = xb(phi), n = comp(x), Vv = V(phi), p = (n.reduce((s, v) => s + v, 0) * R_U * T) / Vv;
      const p_mot = p1 * Math.pow(V1 / Vv, n_ref);
      const w = phi < start ? 2.28 * cm : 2.28 * cm + ((C2 * Vh * T1) / (p1 * V1)) * Math.max(p - p_mot, 0);
      const h = woschni ? 130 * Math.pow(Dm, -0.2) * Math.pow(p / 100, 0.8) * Math.pow(T, -0.53) * Math.pow(w, 0.8) : 0;
      const xp = Rm * ((1 - Math.cos(rad(phi))) + (lam / 4) * (1 - Math.cos(rad(2 * phi))));
      const A = 2 * Ap * 1.15 + Math.PI * Dm * (Vc / Ap + xp);
      const dQw = (h * A * (T - T_w)) / om * Math.PI / 180 / 1000, dQb = Q_f * dxb(phi), dn = m_f * dxb(phi);
      const uj = [tab(T, 1), tab(T, 2), tab(T, 3), tab(T, 4)];
      let sdn = 0; for (let j = 0; j < 4; j++) sdn += dn * (z[j] - a[j]) * uj[j];
      const dT = (dQb - dQw - p * dV(phi) - sdn) / cvMix(T, n);
      return { x, Vv, p, T, dQb, dQw, h, dT, dVd: dV(phi), w };
    };
    let phi = -180, T = r.T_a, Qw = 0;
    const arr = [];
    while (phi <= 180 + 1e-9) {
      const d1 = deriv(phi, T);
      arr.push({ phi, V: d1.Vv, p: d1.p / 1e3, T, x: d1.x, dQb: d1.dQb, dQw: d1.dQw, h: d1.h, w: d1.w });
      Qw += d1.dQw * pas;
      const d2 = deriv(phi + pas, T + d1.dT * pas);
      T = T + 0.5 * (d1.dT + d2.dT) * pas;
      phi += pas;
    }
    let W_hp = 0;
    for (let k = 1; k < arr.length; k++) W_hp += 0.5 * (arr[k].p + arr[k - 1].p) * 1e3 * (arr[k].V - arr[k - 1].V);
    const p_i_hp = W_hp / Vh / 1e3, p_i = p_i_hp - (D.p_r - r.p_a), eta_i = (p_i * 1e3 * Vh) / (m_f * D.Q_i);
    let k = 0; arr.forEach((q, j) => { if (q.p > arr[k].p) k = j; });
    const ang = (f) => { for (let j = 1; j < arr.length; j++) if (arr[j].x >= f) { const q0 = arr[j - 1], q1 = arr[j]; return q0.phi + ((f - q0.x) * (q1.phi - q0.phi)) / (q1.x - q0.x || 1); } return NaN; };
    return { arr, vp, eta_c, T_w, m_f, Q_f, Qw, W_hp, p_i_hp, p_i, eta_i, p_max: arr[k].p, phi_pmax: arr[k].phi, T_max: Math.max(...arr.map((q) => q.T)),
      Vh, Vc, MFB10: ang(0.1), MFB50: ang(0.5), MFB90: ang(0.9), p_b: arr[arr.length - 1].p, T_b: arr[arr.length - 1].T, frac_Qw: Qw / (m_f * D.Q_i), n: n_P };
  }

  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    for (let j = 1; j < xs.length; j++) if (xs[j] >= x) return ys[j - 1] + ((x - xs[j - 1]) * (ys[j] - ys[j - 1])) / (xs[j] - xs[j - 1]);
    return ys[ys.length - 1];
  }
  /** diagrama p–α pe 0…720 °RAC (0 = PMI la începutul admisiei; PMI-ardere la 360°), pas 1° */
  function pAlfa0D(r, z, pasG = 1) {
    const D = r.date, xs = z.arr.map((q) => q.phi), ps = z.arr.map((q) => q.p), out = [];
    const a_dse = 540 - D.dse, p_dse = interp(a_dse - 360, xs, ps);
    for (let al = 0; al <= 720 + 1e-9; al += pasG) {
      let p = al < 180 ? r.p_a : al <= 540 ? interp(al - 360, xs, ps) : D.p_r;
      if (al >= a_dse && al <= 560) { const t = (al - a_dse) / (560 - a_dse); p = p_dse + (D.p_r - p_dse) * (1 - Math.pow(1 - t, 2.5)); }
      out.push([al, p]);
    }
    return out;
  }

  /** ordinea de aprindere: decalajele ciclurilor cilindrilor [°RAC] (4 cilindri: 1-3-4-2) */
  function decalaje(i, tau) {
    const per = tau === 2 ? 360 : 720;
    if (i === 4 && tau === 4) return [0, 180, 540, 360];
    return Array.from({ length: i }, (_, k) => (k * per) / i);
  }

  /** cinematica și dinamica mecanismului bielă-manivelă; pa = [[α, p MPa]] pe 0…720 (pas constant) */
  function cinematicaDinamica(r, pa, m_p, m_b, o = {}) {
    const D = r.date, k_gp = o.k_gp ?? 1.3, k_bp = o.k_bp ?? 0.275, p_carter = o.p_carter ?? 0.1;
    const R = (o.R_man ?? r.R_man) / 1000, lam = D.lam, om = (Math.PI * (o.n ?? D.n_P)) / 30, Dm = (o.D_cil ?? r.D_cil) / 1000, Ap = (Math.PI * Dm * Dm) / 4;
    const m_gp = k_gp * m_p, m_bp = k_bp * m_b, m_bm = (1 - k_bp) * m_b, m_j = m_gp + m_bp;
    const al = pa.map((q) => q[0]), N_ = al.length, ord = o.ordine || decalaje(D.i_cil || 4, D.tau || 4);
    const K = { alfa: al, x: [], v: [], a: [], Fg: [], Fj: [], F: [], N: [], S: [], T: [], Z: [], M: [], Zm: [], Rm: [], beta: [], psi: [] };
    const F_cb = -m_bm * R * om * om;
    for (let j = 0; j < N_; j++) {
      const ar = rad(al[j]);
      const x = R * ((1 - Math.cos(ar)) + (lam / 4) * (1 - Math.cos(2 * ar))), v = R * om * (Math.sin(ar) + (lam / 2) * Math.sin(2 * ar));
      const acc = R * om * om * (Math.cos(ar) + lam * Math.cos(2 * ar));
      const Fg = (pa[j][1] - p_carter) * 1e6 * Ap, Fj = -m_j * acc, F = Fg + Fj, b = Math.asin(lam * Math.sin(ar));
      const N = F * Math.tan(b), S = F / Math.cos(b), T = (F * Math.sin(ar + b)) / Math.cos(b), Z = (F * Math.cos(ar + b)) / Math.cos(b);
      const Zm = Z + F_cb;
      K.x.push(x); K.v.push(v); K.a.push(acc); K.Fg.push(Fg); K.Fj.push(Fj); K.F.push(F); K.N.push(N); K.S.push(S); K.T.push(T); K.Z.push(Z);
      K.M.push(T * R); K.Zm.push(Zm); K.Rm.push(Math.hypot(T, Zm)); K.beta.push(b); K.psi.push((Math.atan2(T, Zm) * 180) / Math.PI);
    }
    // momentul total: ciclul (720° la 4T, 360° la 2T) cu cilindrii decalați
    const step = al[1] - al[0], per = (D.tau || 4) === 2 ? 360 : 720, nP = Math.round(per / step);
    const Mc = K.M.slice(0, nP), Mt = new Array(nP).fill(0);
    ord.forEach((d) => { const s = Math.round(d / step); for (let j = 0; j < nP; j++) Mt[(j + s) % nP] += Mc[j]; });
    K.Mtot = Mt.concat([Mt[0]]); K.M_med = Mt.reduce((s, v) => s + v, 0) / nP;
    const uz = new Array(360).fill(0);
    for (let j = 0; j < N_ - 1; j++) { const c = ((Math.round(K.psi[j] + 180) % 360) + 360) % 360; for (let d = -60; d <= 60; d++) uz[(c + d + 360) % 360] += K.Rm[j]; }
    for (let j = 0; j < 360; j++) uz[j] /= N_ - 1;
    let uzMin = 0, best = Infinity;
    for (let j = 0; j < 360; j++) { let s = 0; for (let d = -30; d <= 30; d++) s += uz[(j + d + 360) % 360]; if (s < best) { best = s; uzMin = j; } }
    return Object.assign(K, { uz, uz_min: uzMin, F_cb, m_j, m_gp, m_bp, m_bm, om, Ap, R, ordine: ord, k_gp, k_bp, p_carter, m_p, m_b });
  }

  root.PCMAI_EXTRA = { model0D, pAlfa0D, cinematicaDinamica, vibe, vibeImplicit, decalaje, MASE: { MAS: { m_p: 0.38, m_b: 0.75 }, MAC: { m_p: 0.55, m_b: 1.1 } } };
})(typeof window !== "undefined" ? window : globalThis);
