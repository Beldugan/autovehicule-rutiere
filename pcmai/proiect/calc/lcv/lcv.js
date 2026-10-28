// Motorul de calcul al aplicației pentru autoutilitare electrice – același model ca în îndrumar
// și ca în lcv_engine.py: model cvasistatic (backward), pas de 1 s.
(function (root) {
  "use strict";
  const G = 9.81, RHO_AIR = 1.202, PI30 = Math.PI / 30;
  const linspace = (a, b, n) => { const r = []; for (let i = 0; i < n; i++) r.push(n === 1 ? a : a + (b - a) * i / (n - 1)); return r; };
  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let i = 1; while (x > xs[i]) i++;
    return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------------------------------------------------------------- vehicul
  function wheelDemand(veh, v) {          // v în m/s
    const n = v.length - 1, vm = new Float64Array(n), a = new Float64Array(n), F = new Float64Array(n), P = new Float64Array(n);
    for (let t = 0; t < n; t++) {
      vm[t] = 0.5 * (v[t] + v[t + 1]); a[t] = v[t + 1] - v[t];
      F[t] = veh.m * G * (veh.f * (vm[t] > 0.05 ? 1 : 0)) + 0.5 * RHO_AIR * veh.CdA * vm[t] * vm[t] + veh.m * veh.delta * a[t];
      P[t] = F[t] * vm[t];
    }
    return { vm, a, F, P };
  }
  function pRoad(veh, vkmh, grade) {
    const v = vkmh / 3.6, al = Math.atan(grade || 0);
    return v * (veh.m * G * (veh.f * Math.cos(al) + Math.sin(al)) + 0.5 * RHO_AIR * veh.CdA * v * v);
  }
  const capCycle = (v, vmaxKmh) => v.map(x => Math.min(x, vmaxKmh / 3.6));

  // ---------------------------------------------------------------- motor + invertor
  function emTmax(em, w) {
    w = Math.abs(w); const wb = em.P * 1e3 / em.T_max;
    if (w > em.w_max + 1e-6) return 0;
    return w <= wb ? em.T_max : em.P * 1e3 / Math.max(w, 1e-6);
  }
  function emSetup(e0) {
    const em = Object.assign({}, e0), P = em.P * 1e3, wb = P / em.T_max;
    em.w_max = em.n_max * PI30;
    em.kc = 0.07 * P / (em.T_max * em.T_max); em.ki = 0.002 * P / wb; em.kw = 0.0004 * P / (wb * wb * wb); em.C0 = 0.0005 * P;
    let best = 0;
    for (const w of linspace(0.1 * wb, em.w_max, 60)) for (const T of linspace(0.05 * em.T_max, emTmax(em, w), 40)) {
      const Pm = T * w, Pl = em.kc * T * T + em.ki * w + em.kw * w * w * w + em.C0;
      best = Math.max(best, Pm / (Pm + Pl));
    }
    const s = ((1 - em.eta_max) / em.eta_max) / ((1 - best) / best);
    em.kc *= s; em.ki *= s; em.kw *= s; em.C0 *= s;
    return em;
  }
  function emElec(em, w, T) {
    if (Math.abs(T) < 1e-9 && Math.abs(w) < 1e-9) return 0;
    return T * w + em.kc * T * T + em.ki * Math.abs(w) + em.kw * Math.pow(Math.abs(w), 3) + em.C0;
  }

  // ---------------------------------------------------------------- baterie
  const OCV = {
    NMC: [[0.0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], [3.00, 3.35, 3.47, 3.58, 3.64, 3.69, 3.74, 3.81, 3.90, 3.98, 4.07, 4.18]],
    LFP: [[0.0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], [2.80, 3.10, 3.20, 3.24, 3.27, 3.28, 3.29, 3.30, 3.31, 3.32, 3.34, 3.45]]
  };
  const V_MAX = { NMC: 4.18, LFP: 3.60 };
  const ocvCell = (chem, soc) => interp(Math.min(Math.max(soc, 0), 1), OCV[chem][0], OCV[chem][1]);
  function packSetup(b0) {
    const b = Object.assign({}, b0), x = OCV[b.chem][0], y = OCV[b.chem][1];
    let u = 0; for (let k = 0; k < x.length - 1; k++) u += (x[k + 1] - x[k]) * (y[k] + y[k + 1]) / 2;
    b.U_nom_cell = u; b.U_nom = b.ns * u; b.Q_As = b.np * b.Q_Ah * 3600;
    b.E_nom = b.ns * b.np * b.Q_Ah * u / 1000; b.E_use = b.E_nom * (b.soc_max - b.soc_min);
    b.m_pack = b.E_nom * 1000 / b.e_pack; b.C_th = b.m_pack * b.cp;
    return b;
  }
  const rPack = (b, T) => b.R25 * 1e-3 * Math.exp(0.03 * (25 - T)) * b.ns / b.np;
  function batStep(b, soc, T, P) {
    const U = b.ns * ocvCell(b.chem, soc), R = rPack(b, T);
    let disc = U * U - 4 * R * P; if (disc < 0) disc = 0;
    const I = (U - Math.sqrt(disc)) / (2 * R);
    const dq = I > 0 ? I : I * b.eta_c;
    return [soc - dq / b.Q_As, I, U * I, I * I * R];
  }

  // ---------------------------------------------------------------- climatizare
  function hvacPower(veh, Ta) {
    const h = veh.hvac;
    if (Ta < h.T_cab - 2) return h.UA * (h.T_cab - Ta) / h.COP_heat;
    if (Ta > h.T_cab + 3) return (h.UA * (Ta - h.T_cab) + h.Q_solar) / h.COP_cool;
    return 0;
  }

  // ---------------------------------------------------------------- transmisie
  const K11 = linspace(0, 1, 11);
  function driveOptions(cfg, F, v) {
    const rw = cfg.veh.rw, out = [], M = cfg.drives;
    if (M.length === 1) {
      const m = M[0];
      m.i.forEach((i, g) => {
        const w = v / rw * i;
        if (w > m.em.w_max) return;
        const T = F * rw / i / (F > 0 ? m.eta : 1 / m.eta);
        if (Math.abs(T) > emTmax(m.em, w) + 1e-6) return;
        out.push([emElec(m.em, w, T), [g], [T], [w]]);
      });
      return out;
    }
    const m1 = M[0], m2 = M[1];
    m1.i.forEach((i1, g1) => m2.i.forEach((i2, g2) => {
      const w1 = v / rw * i1, w2 = v / rw * i2;
      for (const k of K11) {
        const F1 = k * F, F2 = (1 - k) * F;
        const T1 = F1 * rw / i1 / (F1 > 0 ? m1.eta : 1 / m1.eta), T2 = F2 * rw / i2 / (F2 > 0 ? m2.eta : 1 / m2.eta);
        if ((Math.abs(T1) > emTmax(m1.em, w1) + 1e-6 && Math.abs(T1) > 1e-9) || (Math.abs(T2) > emTmax(m2.em, w2) + 1e-6 && Math.abs(T2) > 1e-9)) continue;
        if (w1 > m1.em.w_max && Math.abs(T1) > 0 && !m1.decouple) continue;
        const P1 = (Math.abs(T1) < 1e-9 && m1.decouple) ? 0 : emElec(m1.em, Math.min(w1, m1.em.w_max), T1);
        const P2 = (Math.abs(T2) < 1e-9 && m2.decouple) ? 0 : emElec(m2.em, Math.min(w2, m2.em.w_max), T2);
        out.push([P1 + P2, [g1, g2], [T1, T2], [w1, w2]]);
      }
    }));
    return out;
  }
  function regenShare(cfg) {
    let s = 0; for (const d of cfg.drives) s += d.axle === "fata" ? cfg.veh.phi_front : 1 - cfg.veh.phi_front;
    return Math.min(s, 1);
  }
  function maxWheelForce(cfg, v) {
    const rw = cfg.veh.rw; let tot = 0;
    for (const m of cfg.drives) {
      let best = 0;
      for (const i of m.i) {
        const w = Math.max(v / rw * i, 1);
        if (w > m.em.w_max) continue;
        best = Math.max(best, emTmax(m.em, w) * i * m.eta / rw);
      }
      const share = m.axle === "fata" ? cfg.veh.phi_static : 1 - cfg.veh.phi_static;
      tot += Math.min(best, share * cfg.veh.m * G * cfg.veh.mu);
    }
    return tot;
  }

  // ---------------------------------------------------------------- simulare
  function simulate(cfg, v, o) {
    o = o || {};
    const veh = cfg.veh, b = cfg.bat, D = wheelDemand(veh, v), N1 = D.vm.length, nrep = o.n_rep || 1, n = N1 * nrep;
    const Ta = o.T_amb === undefined ? 23 : o.T_amb;
    let soc = o.soc0 === undefined || o.soc0 === null ? b.soc_max : o.soc0;
    let T = o.T_bat0 === undefined || o.T_bat0 === null ? Ta : o.T_bat0;
    const P_hvac = o.hvac ? hvacPower(veh, Ta) : 0, phi = regenShare(cfg);
    const acc = { wheel_pos: 0, wheel_neg: 0, fric: 0, tr_loss: 0, em_loss: 0, bat_loss: 0, aux: 0, hvac: 0, cool: 0, regen: 0, E_chem: 0, pto: 0 };
    const px = o.p_extra;
    let dist = 0, nof = 0, limT = 0, limw = 0, limP = 0, Tmax = T, t = 0;
    const hist = o.record ? [] : null;
    for (t = 0; t < n; t++) {
      const j = t % N1, Fw = D.F[j], vv = D.vm[j], Preq = D.P[j];
      let Pmot = 0, Pfric = 0, opts = [], best = null;
      if (vv < 0.05 && Fw <= 0) opts = [];
      else if (Fw >= 0) {
        opts = driveOptions(cfg, Fw, vv);
        if (!opts.length) { nof++; opts = driveOptions(cfg, maxWheelForce(cfg, vv) * 0.999, vv); }
      } else {
        let Freg = Fw * phi;
        if (vv * 3.6 < 5 || soc >= b.soc_max) Freg = 0;
        let k = 1; const Pcm = b.P_chg * 1e3;
        while (k > 0.02) {
          opts = driveOptions(cfg, Freg * k, vv);
          if (opts.length && Math.min(...opts.map(q => q[0])) >= -Pcm) break;
          k *= 0.95;
        }
        if (k <= 0.02) { opts = []; k = 0; }
        Freg *= k; Pfric = -(Fw - Freg) * vv;
      }
      if (opts.length) {
        best = opts[0]; for (const q of opts) if (q[0] < best[0]) best = q;
        Pmot = best[0];
        cfg.drives.forEach((m, z) => { limT = Math.max(limT, Math.abs(best[2][z]) / Math.max(m.em.T_max, 1e-9)); limw = Math.max(limw, best[3][z] / m.em.w_max); });
      }
      const Pcool = T > b.T_cool_on ? b.P_cool : 0;
      const Px = px === undefined || px === null ? 0 : (typeof px === "number" ? px : px[t % px.length]);
      const Pbat = Pmot + veh.P_aux + P_hvac + Pcool / b.COP_cool + Px;
      limP = Math.max(limP, Pbat / (b.P_dis * 1e3));
      const r = batStep(b, soc, T, Pbat);
      T += (r[3] - Pcool * (T > b.T_cool_on ? 1 : 0) - b.UA_bat * (T - Ta)) / b.C_th;
      Tmax = Math.max(Tmax, T);
      acc.wheel_pos += Math.max(Preq, 0); acc.wheel_neg += Math.max(-Preq, 0); acc.fric += Pfric;
      let Pmech = 0; if (opts.length) best[2].forEach((Tm, z) => { Pmech += Tm * best[3][z]; });
      acc.em_loss += Pmot - Pmech;
      acc.tr_loss += Pmech - ((opts.length && vv > 0.05) ? Preq + Pfric : 0);
      acc.bat_loss += r[2] - Pbat; acc.aux += veh.P_aux; acc.hvac += P_hvac; acc.cool += Pcool / b.COP_cool; acc.pto += Px; acc.E_chem += r[2];
      if (Preq < 0) acc.regen += Math.max(-Preq - Pfric, 0);
      dist += vv; soc = r[0];
      if (hist) hist.push([t, vv * 3.6, Preq / 1e3, Pmot / 1e3, Pbat / 1e3, soc, T, r[1], best ? best[1][0] : 0, best && best[1].length > 1 ? best[1][1] : 0,
        best ? best[2][0] : 0, best ? best[3][0] : 0, best && best[2].length > 1 ? best[2][1] : 0]);
      if (o.stop_soc !== undefined && soc <= o.stop_soc) { t++; break; }
    }
    const k = {}; for (const key in acc) k[key] = acc[key] / 3.6e6;
    const rhs = k.wheel_pos - k.wheel_neg + k.fric + k.tr_loss + k.em_loss + k.bat_loss + k.aux + k.hvac + k.cool + k.pto;
    k.closure = (k.E_chem - rhs) / Math.max(k.wheel_pos, 1e-9);
    const dkm = dist / 1000;
    return { dist_km: dkm, E_bat_kWh: k.E_chem, e_bat: dkm > 0 ? k.E_chem / dkm * 100 : 0, soc_end: soc, T_end: T, T_max: Tmax,
      energy: k, nofollow: nof, steps: t, lim: { T: limT, w: limw, P: limP }, hist };
  }

  // ---------------------------------------------------------------- performanțe
  function accel(cfg, v1, v0) {
    v1 = v1 === undefined ? 100 : v1; v0 = v0 || 0;
    const veh = cfg.veh, b = cfg.bat; let v = v0 / 3.6, t = 0;
    const U = b.ns * ocvCell(b.chem, 0.8), R = rPack(b, 25), Pbm = Math.min(b.P_dis * 1e3, U * U / (4 * R));
    while (v < v1 / 3.6 && t < 60) {
      let F = maxWheelForce(cfg, v);
      if (v > 0.5) F = Math.min(F, (Pbm - veh.P_aux) * 0.88 / v);
      const Fr = veh.m * G * veh.f + 0.5 * RHO_AIR * veh.CdA * v * v;
      v += (F - Fr) / (veh.m * veh.delta) * 0.05; t += 0.05;
    }
    return t;
  }
  function vMax(cfg, cont) {
    const veh = cfg.veh, rw = veh.rw; let best = 0;
    for (let s = 0; s < 400; s++) {
      const vk = 60 + 0.5 * s, v = vk / 3.6;
      const Fn = veh.m * G * veh.f + 0.5 * RHO_AIR * veh.CdA * v * v;
      let Fa = 0;
      for (const m of cfg.drives) {
        let fm = 0;
        for (const i of m.i) {
          const w = v / rw * i; if (w > m.em.w_max) continue;
          const P = (cont ? m.em.P_cont : m.em.P) * 1e3;
          fm = Math.max(fm, Math.min(emTmax(m.em, w), P / Math.max(w, 1e-6)) * i * m.eta / rw);
        }
        Fa += fm;
      }
      if (Fa >= Fn) best = vk;
    }
    return Math.min(best, veh.v_lim === undefined ? 999 : veh.v_lim);
  }
  function vPhys(cfg) { const c = clone(cfg); c.veh.v_lim = 999; return vMax(c); }
  function gradeStart(cfg) {
    const veh = cfg.veh, s = maxWheelForce(cfg, 0.1) / (veh.m * G), f = veh.f;
    return Math.tan(Math.asin(Math.min(1, s / Math.sqrt(1 + f * f))) - Math.atan(f)) * 100;
  }
  function gradeCont(cfg, vkmh) {
    const veh = cfg.veh, v = vkmh / 3.6, rw = veh.rw; let F = 0;
    for (const m of cfg.drives) {
      let fm = 0;
      for (const i of m.i) {
        const w = v / rw * i; if (w > m.em.w_max) continue;
        fm = Math.max(fm, Math.min(emTmax(m.em, w) * m.em.P_cont / m.em.P, m.em.P_cont * 1e3 / Math.max(w, 1e-6)) * i * m.eta / rw);
      }
      F += fm;
    }
    F -= 0.5 * RHO_AIR * veh.CdA * v * v;
    const s = F / (veh.m * G), f = veh.f;
    return Math.tan(Math.asin(Math.min(1, s / Math.sqrt(1 + f * f))) - Math.atan(f)) * 100;
  }

  // ---------------------------------------------------------------- autonomie
  function rangeCycle(cfg, v, Ta, hvac, Tb0) {
    const b = cfg.bat;
    let d = 0; for (let i = 0; i < v.length - 1; i++) d += 0.5 * (v[i] + v[i + 1]);
    const nrep = Math.max(80, Math.ceil(800 / Math.max(d / 1000, 0.1)));   // destule repetări și pentru ciclurile scurte (NYCC)
    const r = simulate(cfg, v, { soc0: b.soc_max, T_amb: Ta === undefined ? 23 : Ta, T_bat0: Tb0, hvac: !!hvac, stop_soc: b.soc_min, n_rep: nrep });
    r.range_km = r.dist_km; r.e_grid = r.E_bat_kWh / cfg.eta_ac / r.dist_km * 100;
    return r;
  }
  // caracteristicile unui ciclu (v în m/s, pas 1 s)
  function cycleStats(v) {
    const dur = v.length - 1; let d = 0, nstop = 0, nst = 0, sa = 0, na = 0;
    const st = x => x < 0.5 / 3.6;
    for (let i = 0; i < dur; i++) {
      d += 0.5 * (v[i] + v[i + 1]);
      if (st(v[i + 1]) && !st(v[i])) nstop++;
      const a = v[i + 1] - v[i]; if (a > 0.1) { sa += a; na++; }
    }
    for (let i = 0; i <= dur; i++) if (st(v[i])) nst++;
    return { dur, d_km: d / 1000, v_med: d / dur * 3.6, v_max: Math.max(...v) * 3.6, stop: nst / (dur + 1), stops_km: nstop / Math.max(d / 1000, 1e-9), a_pos: na ? sa / na : 0 };
  }
  function rangeConst(cfg, vkmh, Ta, hvac) {
    const v = new Array(3601).fill(vkmh / 3.6), b = cfg.bat;
    const r = simulate(cfg, v, { soc0: b.soc_max, T_amb: Ta === undefined ? 23 : Ta, hvac: !!hvac, stop_soc: b.soc_min, n_rep: 20 });
    r.range_km = r.dist_km; return r;
  }

  // ---------------------------------------------------------------- încărcare
  function chargeCurve(cfg, socA, socB, o) {
    o = o || {};
    const b = cfg.bat, ac = !!o.ac, dt = 5, eta = ac ? cfg.eta_ac : cfg.eta_dc;
    const Pst = (o.P === undefined ? (ac ? cfg.P_ac : cfg.P_dc) : o.P) * 1e3;
    let soc = socA, T = o.T0 === undefined ? 25 : o.T0, t = 0, Ein = 0; const rows = [];
    while (soc < socB && t < 48 * 3600) {
      const U0 = b.ns * ocvCell(b.chem, soc), R = rPack(b, Math.max(T, 10));
      let Irate = interp(soc, b.crate_soc, b.crate) * b.Q_Ah * b.np;
      if (T < 15) Irate *= Math.max(0.3, (T + 5) / 20);
      const Icv = (b.ns * V_MAX[b.chem] - U0) / R;
      const Ip = (-U0 + Math.sqrt(U0 * U0 + 4 * R * Pst * eta)) / (2 * R);
      let I = Math.max(Math.min(Irate, Icv, Ip), 0);
      if (ac) I = Math.min(Ip, Icv);
      const Pt = (U0 + I * R) * I, Q = I * I * R, Pc = T > b.T_cool_on ? b.P_cool : 0;
      T += (Q - Pc - b.UA_bat * (T - 25)) / b.C_th * dt;
      soc += I * dt * b.eta_c / b.Q_As;
      Ein += Pt / eta * dt;
      rows.push([t, soc, Pt / 1e3, T]);
      t += dt;
      if (I < 1e-3) break;
    }
    return { t_min: t / 60, E_kWh: Ein / 3.6e6, curve: rows, T_max: Math.max(...rows.map(r => r[3])) };
  }

  // ---------------------------------------------------------------- TCO și CO2
  function tco(c) {
    const km = c.km_an * c.ani; let Cen, L = 0, kWh = 0;
    if (c.kWh100 !== undefined && c.kWh100 !== null) { kWh = c.kWh100 * km / 100; Cen = kWh * (c.share_home * c.p_home + (1 - c.share_home) * c.p_dc); }
    else { L = c.L100 * km / 100; Cen = L * c.p_fuel; }
    const Pn = c.pret * (1 - c.rezidual), Cm = c.mentenanta * c.ani, Ct = c.taxe * c.ani;
    return { P_net: Pn, C_en: Cen, C_m: Cm, C_t: Ct, TCO: Pn + Cen + Cm + Ct, L, kWh };
  }
  function co2(c) {
    const prod = c.m_glider * c.k_glider / 1000 + (c.E_bat || 0) * (c.k_bat || 0) / 1000;
    const use = (c.kWh100 !== undefined && c.kWh100 !== null) ? c.kWh100 / 100 * c.g_grid / 1e6 : c.L100 / 100 * c.kg_L / 1000;
    return { prod, use_km: use };
  }


  // ---------------------------------------------------------------- autoutilitare
  const wltpTestMass = (mCurb, plMax) => mCurb + 25 + 0.28 * plMax;
  function ramp(v0, v1, a) { const n = Math.max(Math.ceil(Math.abs(v1 - v0) / a), 1), r = []; for (let k = 0; k < n; k++) r.push(v0 + (v1 - v0) * (k + 1) / n); return r; }
  function deliveryRoute(r) {
    const v = [0], door = [0];
    const seg = (dist, vc, aA, aD, stop, del) => {
      const up = ramp(0, vc, aA), dn = ramp(vc, 0, aD), dr = up.reduce((a, b) => a + b, 0) + dn.reduce((a, b) => a + b, 0);
      const nc = Math.max(Math.round((dist - dr) / vc), 0);
      for (const x of up) { v.push(x); door.push(0); } for (let k = 0; k < nc; k++) { v.push(vc); door.push(0); } for (const x of dn) { v.push(x); door.push(0); }
      for (let k = 0; k < Math.floor(stop); k++) { v.push(0); door.push(del ? 1 : 0); }
    };
    seg(r.d_app * 1000, r.v_app / 3.6, r.a_acc, r.a_dec, 30, false);
    for (let k = 0; k < Math.floor(r.n_stops); k++) seg(r.L_s * 1000, r.v_c / 3.6, r.a_acc, r.a_dec, r.t_s, true);
    seg(r.d_app * 1000, r.v_app / 3.6, r.a_acc, r.a_dec, 0, false);
    return { v, door };
  }
  function ptoProfile(door, p, Ta, ts) {
    if (!p || !p.on) return null;
    const Qc = p.UA_box * Math.max(Ta - p.T_box, 0), t = Math.max(ts, 1);
    return door.map(d => (Qc + (d ? p.Q_door * 1e3 / t : 0)) / p.COP + p.P_fan);
  }
  function routeSim(cfg, r, pto, Ta, hvac, soc0, record) {
    const R = deliveryRoute(r), pp = ptoProfile(R.door, pto, Ta === undefined ? 23 : Ta, r.t_s);
    const res = simulate(cfg, R.v, { soc0, T_amb: Ta === undefined ? 23 : Ta, hvac: !!hvac, record: !!record, p_extra: pp ? pp.slice(0, -1) : null });
    res.dur_h = (R.v.length - 1) / 3600; res.E_pto = res.energy.pto; res.route = R; res.pto = pp;
    return res;
  }
  function tcoKm(c) {
    const km = c.km_an * c.ani, dep = c.pret * (1 - c.rezidual) / km;
    const en = (c.kWh100 !== undefined && c.kWh100 !== null) ? c.kWh100 / 100 * (c.share_depot * c.p_depot + (1 - c.share_depot) * c.p_dc) : c.L100 / 100 * c.p_fuel + (c.adblue || 0);
    const m = c.mentenanta / c.km_an, o = c.fix_an / c.km_an;
    return { dep, en, m, o, total: dep + en + m + o };
  }

  function build(raw) {
    const c = clone(raw); c.bat = packSetup(c.bat); c.drives.forEach(d => { d.em = emSetup(d.em); }); return c;
  }

  const API = { G, RHO_AIR, PI30, interp, linspace, wheelDemand, pRoad, capCycle, emTmax, emSetup, emElec, OCV, ocvCell, packSetup, rPack,
    batStep, hvacPower, driveOptions, regenShare, maxWheelForce, simulate, accel, vMax, vPhys, gradeStart, gradeCont, rangeCycle, rangeConst, cycleStats,
    chargeCurve, tco, co2, build, wltpTestMass, deliveryRoute, ptoProfile, routeSim, tcoKm };
  if (typeof module !== "undefined") module.exports = API; else root.LCV = API;
})(this);
