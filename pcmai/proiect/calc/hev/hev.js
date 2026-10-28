// Motorul de calcul al aplicației „Calcul sisteme hibride” – același model ca în îndrumar (cap. 2–8)
// și ca în engine.py: model cvasistatic (backward), pas de 1 s.
(function (root) {
  "use strict";
  const G = 9.81, RHO_AIR = 1.202, RHO_FUEL = 0.745, QI = 43.5e6, CO2_PER_L = 2.31;
  const PI30 = Math.PI / 30;

  function interp(x, xs, ys, left, right) {
    if (x < xs[0]) return left === undefined ? ys[0] : left;
    if (x > xs[xs.length - 1]) return right === undefined ? ys[ys.length - 1] : right;
    let i = 1;
    while (i < xs.length - 1 && x > xs[i]) i++;
    const x0 = xs[i - 1], x1 = xs[i];
    if (x1 === x0) return ys[i];
    return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - x0) / (x1 - x0);
  }
  function linspace(a, b, n) { const r = []; for (let i = 0; i < n; i++) r.push(n === 1 ? a : a + (b - a) * i / (n - 1)); return r; }
  function arange(a, b, s) { const r = []; for (let x = a; x < b - 1e-9; x += s) r.push(x); return r; }

  // ---------------------------------------------------------------- vehicul (cap. 2)
  function wheelDemand(veh, vkmh) {
    const n = vkmh.length - 1, out = { vm: [], a: [], F: [], P: [], w: [], T: [] };
    for (let t = 0; t < n; t++) {
      const v0 = vkmh[t] / 3.6, v1 = vkmh[t + 1] / 3.6, vm = 0.5 * (v0 + v1), a = v1 - v0;
      const F = veh.m * G * veh.f * (vm > 0.05 ? 1 : 0) + 0.5 * RHO_AIR * veh.CdA * vm * vm + veh.m * veh.delta * a;
      out.vm.push(vm); out.a.push(a); out.F.push(F); out.P.push(F * vm); out.w.push(vm / veh.rw); out.T.push(F * veh.rw);
    }
    return out;
  }
  function pRoad(veh, vkmh, grade, eta) {
    const v = vkmh / 3.6, al = Math.atan(grade || 0);
    return v * (veh.m * G * (veh.f * Math.cos(al) + Math.sin(al)) + 0.5 * RHO_AIR * veh.CdA * v * v) / (eta || 1);
  }

  // ---------------------------------------------------------------- MAI (cap. 4.1)
  function iceFullLoad(ice, n) {
    const Tp = ice.P_max * 1e3 / (ice.n_P * PI30);
    return interp(n, [ice.n_idle, ice.n_M1, ice.n_M2, ice.n_P, ice.n_max],
      [0.65 * ice.T_max, ice.T_max, ice.T_max, Tp, 0.94 * Tp], 0, 0);
  }
  function iceFriction(ice, n) {
    const nk = n / 1000, pme0 = ice.c0 + ice.c1 * nk + ice.c2 * nk * nk;
    return pme0 * 1e5 * ice.Vd * 1e-3 / (4 * Math.PI);
  }
  function iceEff(ice, n, T) {
    if (T <= 0) return 0;
    const e = ice.e0 * (1 - ice.cn * Math.pow((n - ice.n_e) / 2000, 2));
    const T0 = iceFriction(ice, n), Tfl = Math.max(iceFullLoad(ice, n), 1e-6), tau = T / Tfl;
    const k = tau > ice.tau_r ? 1 - ice.k_r * (tau - ice.tau_r) : 1;
    return e * T / Math.max(T + T0, 1e-9) * k;
  }
  function iceFuel(ice, n, T) { // g/s
    const P = T * n * PI30;
    if (P <= 0) return 0;
    return P / Math.max(iceEff(ice, n, T), 1e-6) / QI * 1e3;
  }
  function calibrateIce(ice0) {
    const ice = Object.assign({}, ice0, { e0: 0.40 });
    const nn = arange(1000, ice.n_P + 1, 25);
    for (let it = 0; it < 3; it++) {
      let best = 0;
      for (const n of nn) for (const T of linspace(5, iceFullLoad(ice, n), 120)) best = Math.max(best, iceEff(ice, n, T));
      ice.e0 *= (3600 / (ice.bsfc_min * QI * 1e-6)) / best;
    }
    ice.ool = iceOOL(ice);
    return ice;
  }
  function iceOOL(ice) {
    const out = [], nn = arange(1100, ice.n_P + 1, 25);
    for (let P = 2e3; P < ice.P_max * 1e3 + 1; P += 1e3) {
      let best = null;
      for (const n of nn) {
        const T = P / (n * PI30);
        if (T > iceFullLoad(ice, n)) continue;
        const e = iceEff(ice, n, T);
        if (!best || e > best[3]) best = [P, n, T, e];
      }
      if (best) out.push(best);
    }
    return out;
  }
  function oolPoint(ice, P) {
    const tab = ice.ool, Ps = tab.map(r => r[0]), ns = tab.map(r => r[1]);
    P = Math.min(Math.max(P, Ps[0]), Ps[Ps.length - 1]);
    const n = interp(P, Ps, ns);
    return [n, P / (n * PI30)];
  }

  // ---------------------------------------------------------------- mașini electrice (cap. 4.2)
  function emTmax(em, w) {
    w = Math.abs(w);
    const wb = em.P * 1e3 / em.T_max;
    if (w > em.w_max + 1e-6) return 0;
    return w <= wb ? em.T_max : em.P * 1e3 / Math.max(w, 1e-6);
  }
  function emSetup(em0) {
    const em = Object.assign({}, em0), P = em.P * 1e3, wb = P / em.T_max;
    em.w_max = em.n_max * PI30;
    em.kc = 0.05 * P / (em.T_max * em.T_max); em.ki = 0.006 * P / wb; em.kw = 0.0008 * P / (wb * wb * wb); em.C0 = 0.004 * P;
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
    const Pm = T * w;
    const Pl = (Math.abs(T) > 1e-9 || Math.abs(w) > 1e-9) ? em.kc * T * T + em.ki * Math.abs(w) + em.kw * Math.pow(Math.abs(w), 3) + em.C0 : 0;
    return Pm + Pl;
  }

  // ---------------------------------------------------------------- baterie (cap. 4.3)
  function batStep(bat, soc, P) {
    const U = bat.U_n * (0.92 + 0.16 * soc), R = bat.R0;
    let disc = U * U - 4 * R * P; if (disc < 0) disc = 0;
    const I = (U - Math.sqrt(disc)) / (2 * R), Q = bat.E * 3600 * 1e3 / bat.U_n;
    const dq = I > 0 ? I : I * bat.eta_c;
    return [soc - dq / Q, I, U * I];
  }

  // ---------------------------------------------------------------- transmisie (cap. 4.4)
  function gearSelect(gb, w_out, P_need, ice) {
    let bestP = -1, fall = 0;
    for (let g = gb.ig.length - 1; g >= 0; g--) {
      const n = w_out * gb.ig[g] / PI30;
      if (n > ice.n_max) continue;
      if (n < gb.n_min && g > 0) continue;
      const ne = Math.max(n, ice.n_idle), Pav = iceFullLoad(ice, ne) * ne * PI30;
      if (Pav >= 1.05 * Math.max(P_need, 0)) return g;
      if (Pav > bestP) { bestP = Pav; fall = g; }
    }
    return fall;
  }

  // ---------------------------------------------------------------- simulare (cap. 5–6)
  function simulate(cfg, vkmh, soc0, mode, record) {
    mode = mode || "CS";
    const arch = cfg.arch, veh = cfg.veh, ice = cfg.ice, bat = cfg.bat, p = cfg.ems || {};
    const D = wheelDemand(veh, vkmh), N = D.vm.length, Paux = veh.P_aux;
    let soc = bat ? (soc0 === undefined || soc0 === null ? (p.soc_target !== undefined ? p.soc_target : 0.55) : soc0) : 0;
    let fuel = 0, Eint = 0, Ereg = 0, tIce = 0, dEv = 0, starts = 0, prevOn = false, Efric = 0, thermOn = false, mh = 0;
    const acc = { ice: 0, em_loss: 0, aux: 0, fric: 0, wheel_pos: 0, wheel_neg: 0, src: 0, bat_loss: 0 };
    const lim = {}, hist = record ? [] : null; let socMin = soc, socMax = soc;
    const setLim = (nm, em, w, T) => {
      if (!lim[nm]) lim[nm] = [0, 0];
      lim[nm][0] = Math.max(lim[nm][0], Math.abs(w) / em.w_max);
      lim[nm][1] = Math.max(lim[nm][1], Math.abs(T) / Math.max(emTmax(em, w), 1e-6));
    };
    for (let t = 0; t < N; t++) {
      const P_req = D.P[t], w_wh = D.w[t], T_wh = D.T[t], vv = D.vm[t];
      let fr = 0, P_bat = 0, n_ice = 0, T_ice = 0, P_mg1 = 0, P_mg2 = 0, P_fb = 0, Pm1 = 0, Pm2 = 0, P_aux_ice = Paux;
      let T_em = 0, w_in = 0, w_m = 0, T_m = 0, w_m2 = 0, T_m2 = 0, w_s = 0, T_s = 0;
      if (arch === "conv") {
        const gb = cfg.gb;
        if (P_req < 0 && cfg.mhev) mh = Math.min(mh + Math.min(-P_req, cfg.mhev.P * 1e3) * cfg.mhev.eta, cfg.mhev.E * 3.6e6);
        if (cfg.mhev) { const take = Math.min(mh, Paux); mh -= take; P_aux_ice = Paux - take; }
        if (vv > 0.05 && P_req > 0) {
          const g = gearSelect(gb, w_wh * gb.i0, P_req / gb.eta, ice), ig = gb.ig[g] * gb.i0;
          n_ice = Math.max(w_wh * ig / PI30, ice.n_idle);
          T_ice = T_wh / ig / gb.eta + P_aux_ice / (n_ice * PI30) / (cfg.eta_alt || 0.65);
          T_ice = Math.min(T_ice, iceFullLoad(ice, n_ice));
          fr = iceFuel(ice, n_ice, T_ice);
        }
      } else if (arch === "P2") {
        const em = cfg.em, gb = cfg.gb;
        const g = gearSelect(gb, w_wh * gb.i0, Math.max(P_req, 0) / gb.eta, ice), ig = gb.ig[g] * gb.i0;
        w_in = w_wh * ig; const n_in = w_in / PI30;
        if (P_req >= 0) {
          const P_in = P_req / gb.eta;
          let ev = (vv * 3.6 < p.v_ice_min || P_in < p.P_low) && soc > p.soc_min;
          if (mode === "CD") ev = soc > p.soc_cs && P_in < p.P_ev_max && vv * 3.6 < p.v_ev_max;
          if (ev && P_in <= emTmax(em, w_in) * w_in + 1) {
            T_em = P_in / Math.max(w_in, 1e-6);
          } else {
            n_ice = Math.max(n_in, ice.n_idle); const w_ice = n_ice * PI30, Tfl = iceFullLoad(ice, n_ice);
            const P_th = soc >= p.soc_min ? p.P_th : Tfl * w_ice;
            if (P_in <= P_th) {
              T_ice = P_in / w_ice;
              if (p.lps && soc < p.soc_target) {
                const Pch = Math.min(Math.max(p.lps * Tfl * w_ice - P_in, 0), p.P_chg); T_ice += Pch / w_ice;
              } else if (soc < p.soc_target) {
                const Pch = Math.min(p.P_th - P_in, p.P_chg, p.k_soc * (p.soc_target - soc) * 1e5); T_ice += Pch / w_ice;
              }
            } else {
              T_ice = P_th / w_ice; T_em = (P_in - P_th) / w_ice;
              if (T_em > emTmax(em, w_in)) { T_em = emTmax(em, w_in); T_ice = P_in / w_ice - T_em; }
            }
            T_ice = Math.min(T_ice, Tfl);
            T_em = (P_in - T_ice * w_ice) / Math.max(w_in, 1e-6);
            T_em = Math.max(Math.min(T_em, emTmax(em, w_in)), -emTmax(em, w_in));
            fr = iceFuel(ice, n_ice, T_ice);
          }
        } else {
          const Tn = P_req * gb.eta / Math.max(w_in, 1e-6);
          T_em = Math.max(Tn, -emTmax(em, w_in), -bat.P_chg * 1e3 / Math.max(w_in, 1e-6));
          if (vv * 3.6 < 5 || soc >= (p.soc_max !== undefined ? p.soc_max : 1)) T_em = 0;
          P_fb = P_req - T_em * w_in / gb.eta;
        }
        P_mg2 = emElec(em, w_in, T_em); Pm2 = T_em * w_in;
        P_bat = P_mg2 + Paux;
      } else if (arch === "S") {
        const em = cfg.em, gen = cfg.gen;
        w_m = w_wh * cfg.i_em;
        if (P_req >= 0) {
          T_m = w_m > 0 ? P_req / cfg.eta_red / Math.max(w_m, 1e-6) : 0;
        } else {
          T_m = Math.max(P_req * cfg.eta_red / Math.max(w_m, 1e-6), -emTmax(em, w_m), -bat.P_chg * 1e3 / Math.max(w_m, 1e-6));
          if (vv * 3.6 < 5 || soc >= (p.soc_max !== undefined ? p.soc_max : 1)) T_m = 0;
          P_fb = P_req - T_m * w_m / cfg.eta_red;
        }
        P_mg2 = emElec(em, w_m, T_m); Pm2 = T_m * w_m;
        const lo = mode === "CS" ? p.soc_low : p.soc_cs, hi = mode === "CS" ? p.soc_high : p.soc_cs + 0.02;
        if (soc < lo) thermOn = true; else if (soc > hi) thermOn = false;
        const Pel = P_mg2 + Paux;
        if (thermOn || Pel > bat.P_dis * 1e3) {
          let P_g = thermOn ? p.P_opt : 0;
          P_g = Math.max(P_g, Pel - bat.P_dis * 1e3 * 0.9);
          [n_ice, T_ice] = oolPoint(ice, P_g);
          const w_g = n_ice * PI30;
          P_mg1 = emElec(gen, w_g, -T_ice); Pm1 = -T_ice * w_g;
          fr = iceFuel(ice, n_ice, T_ice);
        }
        P_bat = P_mg2 + P_mg1 + Paux;
      } else if (arch === "PS") {
        const mg1 = cfg.mg1, mg2 = cfg.mg2, k = cfg.k, i_f = cfg.i_f, i2 = cfg.i_mg2 || 1;
        const w_r = w_wh * i_f; w_m2 = w_r * i2;
        const T_r = T_wh / i_f / (T_wh > 0 ? cfg.eta_tr : 1 / cfg.eta_tr), P_ring = T_r * w_r;
        let ev = soc > p.soc_min && vv * 3.6 < p.v_ev_max && P_ring < p.P_start;
        if (mode === "CD") ev = soc > p.soc_cs && vv * 3.6 < p.v_ev_max_cd && P_ring < p.P_ev_max;
        if (P_req < 0 || vv < 0.05) ev = true;
        if (ev && P_ring <= emTmax(mg2, w_m2) * w_m2 + 1) {
          T_m2 = T_r / i2;
          if (P_req < 0) {
            T_m2 = Math.max(T_r / i2, -emTmax(mg2, w_m2), -bat.P_chg * 1e3 / Math.max(w_m2, 1e-6));
            if (vv * 3.6 < 5 || soc >= (p.soc_max !== undefined ? p.soc_max : 1)) T_m2 = 0;
            P_fb = P_req - T_m2 * w_m2 * cfg.eta_tr;
          }
          P_mg2 = emElec(mg2, w_m2, T_m2); Pm2 = T_m2 * w_m2;
        } else {
          let P_chg = (mode === "CS" || soc <= p.soc_cs) ? p.k_soc * (p.soc_target - soc) * 1e5 : 0;
          P_chg = Math.max(Math.min(P_chg, p.P_chg_max), -p.P_chg_max);
          const P_e = Math.max(P_ring + P_chg + Paux, p.P_ice_min);
          [n_ice, T_ice] = oolPoint(ice, P_e);
          const w_c = n_ice * PI30;
          w_s = (1 + k) * w_c - k * w_r;            // Willis: ω_s + k·ω_c' = (1+k)·ω_p
          T_s = -T_ice / (1 + k);
          T_m2 = (T_r - T_ice * k / (1 + k)) / i2;
          P_mg1 = emElec(mg1, w_s, T_s); Pm1 = T_s * w_s;
          P_mg2 = emElec(mg2, w_m2, T_m2); Pm2 = T_m2 * w_m2;
          fr = iceFuel(ice, n_ice, T_ice);
        }
        P_bat = P_mg1 + P_mg2 + Paux;
      }
      // bilanț energetic
      const P_ice_m = fr > 0 ? T_ice * n_ice * PI30 : 0;
      acc.ice += P_ice_m; acc.em_loss += (P_mg1 - Pm1) + (P_mg2 - Pm2);
      acc.aux += arch !== "conv" ? Paux : 0;
      acc.fric += P_fb < 0 ? -P_fb : 0;
      acc.wheel_pos += P_req > 0 ? P_req : 0; acc.wheel_neg += P_req < 0 ? -P_req : 0;
      const P_src = arch === "S" ? Pm2 : arch === "PS" ? P_ice_m + Pm1 + Pm2 : P_ice_m + Pm2;
      acc.src += P_src;
      // limite
      if (arch === "P2") setLim("ME", cfg.em, w_in, T_em);
      if (arch === "S") { setLim("ME", cfg.em, w_m, T_m); if (fr > 0) setLim("GEN", cfg.gen, n_ice * PI30, -T_ice); }
      if (arch === "PS") { setLim("MG2", cfg.mg2, w_m2, T_m2); if (fr > 0) setLim("MG1", cfg.mg1, w_s, T_s); }
      if (fr > 0) {
        lim.MAI_T = Math.max(lim.MAI_T || 0, T_ice / Math.max(iceFullLoad(ice, n_ice), 1e-6));
        lim.MAI_n = Math.max(lim.MAI_n || 0, n_ice / ice.n_max);
      }
      const etaD = { P2: cfg.gb && cfg.gb.eta, conv: cfg.gb && cfg.gb.eta, S: cfg.eta_red, PS: cfg.eta_tr }[arch] || 1;
      if (P_req > 1e3) {
        const sup = (arch !== "conv" ? P_src : T_ice * n_ice * PI30 - P_aux_ice / (cfg.eta_alt || 0.65)) * etaD;
        if (P_req - sup > 1e3) lim.neurmarit_s = (lim.neurmarit_s || 0) + 1;
      }
      if (bat) {
        const r = batStep(bat, soc, P_bat);
        Eint += r[2]; acc.bat_loss += r[2] - P_bat;
        socMin = Math.min(socMin, r[0]); socMax = Math.max(socMax, r[0]); soc = r[0];
      }
      if (P_fb < 0) Efric += -P_fb;
      if (P_req < 0 && arch !== "conv") Ereg += -(P_req - Math.min(P_fb, 0));
      const on = fr > 0;
      if (on) { tIce++; if (!prevOn) starts++; } else if (vv > 0.05) dEv += vv;
      prevOn = on; fuel += fr;
      if (record) hist.push([t, vv * 3.6, P_req / 1e3, n_ice, T_ice, P_mg1 / 1e3, P_mg2 / 1e3, P_bat / 1e3, soc, fr, P_ice_m / 1e3]);
    }
    const dist = D.vm.reduce((s, x) => s + x, 0) / 1000;
    const k = {}; for (const key in acc) k[key] = acc[key] / 3.6e6;
    k.tr_loss = k.src - (k.wheel_pos - k.wheel_neg + k.fric);
    const rhs = (k.wheel_pos - k.wheel_neg) + k.fric + k.tr_loss + k.em_loss + k.bat_loss + k.aux;
    k.closure = (k.ice + Eint / 3.6e6 - rhs) / Math.max(k.wheel_pos, 1e-9);
    lim.soc_min = socMin; lim.soc_max = socMax;
    return {
      dist_km: dist, fuel_g: fuel, L100: fuel / 1000 / RHO_FUEL / dist * 100, soc_end: soc, E_bat_int_kWh: Eint / 3.6e6,
      E_regen_kWh: Ereg / 3.6e6, t_ice: tIce, starts: starts, ev_share: dEv / 1000 / dist, E_fric_kWh: Efric / 3.6e6,
      E_fuel_kWh: fuel / 1000 * QI / 3.6e6, energy: k, limits: lim, hist: hist, n: N
    };
  }

  function csCorrected(cfg, r) {
    const dfuel = r.E_bat_int_kWh * 3.6e6 / (QI * (cfg.eta_corr || 0.30)) * 1e3;
    return (r.fuel_g + dfuel) / 1000 / RHO_FUEL / r.dist_km * 100;
  }
  function runCS(cfg, v, iters) {
    let soc = cfg.ems.soc_target;
    for (let i = 0; i < (iters || 4); i++) soc = simulate(cfg, v, soc, "CS").soc_end;
    const r = simulate(cfg, v, soc, "CS", true);
    r.L100_corr = csCorrected(cfg, r); r.soc0 = soc;
    return r;
  }
  function runPHEV(cfg, v, UF) {
    UF = UF === undefined ? 0.70 : UF;
    const p = cfg.ems, cd = simulate(cfg, v, p.soc_full, "CD", true);
    const Egrid = (p.soc_full - cd.soc_end) * cfg.bat.E / (cfg.eta_charge || 0.90);
    const cs = runCS(cfg, v);
    cd.kWh100 = Egrid / cd.dist_km * 100;
    const per = p.soc_full - cd.soc_end;
    return {
      cd: cd, cs: cs, UF: UF, L100_comb: UF * cd.L100 + (1 - UF) * cs.L100_corr, kWh100_comb: UF * cd.kWh100,
      range_km: (p.soc_full - p.soc_cs) / Math.max(per, 1e-6) * cd.dist_km
    };
  }

  // ---------------------------------------------------------------- performanțe (cap. 3.6)
  function maxWheelForce(cfg, v) {
    const arch = cfg.arch, ice = cfg.ice, rw = cfg.veh.rw;
    if (arch === "conv" || arch === "P2") {
      const gb = cfg.gb; let best = 0;
      for (const ig0 of gb.ig) {
        const ig = ig0 * gb.i0, w_in = v / rw * ig, n = w_in / PI30;
        if (n > ice.n_max) continue;
        const ne = Math.max(n, gb.n_launch || 2500);
        let T = iceFullLoad(ice, ne);
        if (arch === "P2") { const we = Math.max(w_in, 1); T += Math.min(emTmax(cfg.em, we), cfg.bat.P_dis * 1e3 * 0.92 / we); }
        best = Math.max(best, T * ig * gb.eta / rw);
      }
      return best;
    }
    if (arch === "S") {
      const wm = Math.max(v / rw * cfg.i_em, 1);
      const T = Math.min(emTmax(cfg.em, wm), (cfg.bat.P_dis + cfg.gen.P) * 1e3 * 0.92 / wm);
      return T * cfg.i_em * cfg.eta_red / rw;
    }
    if (arch === "PS") {
      const k = cfg.k, w_r = Math.max(v / rw * cfg.i_f, 1), i2 = cfg.i_mg2 || 1, w_m2 = w_r * i2;
      const w_c = ice.n_P * PI30, T_ice = Math.min(iceFullLoad(ice, ice.n_P), cfg.mg1.T_max * (1 + k));
      const T_ring = T_ice * k / (1 + k), w_s = (1 + k) * w_c - k * w_r;
      const P_gen = Math.max(0, T_ice / (1 + k) * w_s) * 0.92;
      const T2 = Math.min(emTmax(cfg.mg2, w_m2), (cfg.bat.P_dis * 1e3 * 0.92 + P_gen) * 0.92 / w_m2) * i2;
      return (T2 + T_ring) * cfg.i_f * cfg.eta_tr / rw;
    }
    return 0;
  }
  function accel0100(cfg) {
    const veh = cfg.veh; let v = 0, t = 0;
    while (v < 100 / 3.6 && t < 60) {
      const F = Math.min(maxWheelForce(cfg, v), veh.F_adh);
      const Fr = veh.m * G * veh.f + 0.5 * RHO_AIR * veh.CdA * v * v;
      v += (F - Fr) / (veh.m * veh.delta) * 0.05; t += 0.05;
    }
    return t + (cfg.t_shift || 0);
  }
  function vMax(cfg) {
    const veh = cfg.veh, ice = cfg.ice;
    if (cfg.gb) {                         // pe trepte, numai cu MAI
      let best = [0, 0, 0];
      cfg.gb.ig.forEach((ig0, g) => {
        for (let vk = 100; vk < 230; vk += 0.5) {
          const n = vk / 3.6 / veh.rw * ig0 * cfg.gb.i0 / PI30;
          if (n > ice.n_max) break;
          if (iceFullLoad(ice, n) * n * PI30 * cfg.gb.eta >= pRoad(veh, vk) && vk > best[0]) best = [vk, g + 1, n];
        }
      });
      return best;
    }
    let best = 0; const eta = cfg.eta_vmax || 0.92;
    for (let vk = 80; vk < 260; vk += 0.5) if (pRoad(veh, vk) <= ice.P_max * 1e3 * eta) best = vk;
    if (cfg.arch === "S") {               // la serie: limitat și de motorul de tracțiune și de generator
      best = 0;
      const Pel = Math.min(cfg.em.P * 1e3 * cfg.eta_red, Math.min(ice.P_max, cfg.gen.P) * 1e3 * 0.90 * cfg.eta_red);
      for (let vk = 80; vk < 260; vk += 0.5) {
        const nm = vk / 3.6 / veh.rw * cfg.i_em;
        if (nm * PI30 > cfg.em.w_max) break;
        if (pRoad(veh, vk) <= Pel) best = vk;
      }
    }
    return [best, 0, 0];
  }
  function gradeMax(cfg, vkmh) {
    const veh = cfg.veh, v = (vkmh || 30) / 3.6;
    const F = Math.min(maxWheelForce(cfg, v), veh.F_adh) - 0.5 * RHO_AIR * veh.CdA * v * v;
    const s = F / (veh.m * G), f = veh.f;
    const al = Math.asin(Math.min(1, s / Math.sqrt(1 + f * f))) - Math.atan(f);
    return Math.tan(al) * 100;
  }

  // ---------------------------------------------------------------- ECMS (cap. 7.1)
  function simulateECMS(cfg, vkmh, s, soc0, kp) {
    const veh = cfg.veh, ice = cfg.ice, em = cfg.em, bat = cfg.bat, gb = cfg.gb, p = cfg.ems;
    const D = wheelDemand(veh, vkmh); let soc = soc0, fuel = 0, Eb = 0, tIce = 0, dEv = 0;
    const us = linspace(0, 1.4, 29), socs = [];
    for (let t = 0; t < D.vm.length; t++) {
      const P_req = D.P[t], w_wh = D.w[t], vv = D.vm[t];
      const g = gearSelect(gb, w_wh * gb.i0, Math.max(P_req, 0) / gb.eta, ice), w_in = w_wh * gb.ig[g] * gb.i0;
      let fr = 0, Pb;
      if (P_req >= 0 && vv > 0.05) {
        const P_in = P_req / gb.eta, st = s * (1 + kp * (p.soc_target - soc)); let best = null;
        gb.ig.forEach((ig0, gg) => {
          const w_g = w_wh * ig0 * gb.i0, n_g = w_g / PI30;
          if (n_g > ice.n_max || (n_g < gb.n_min && gg !== g)) return;
          const n_i = Math.max(n_g, ice.n_idle), w_i = n_i * PI30, Tfl = iceFullLoad(ice, n_i);
          for (const u of us) {
            const P_ice = u / 1.4 * Tfl * w_i, Te = (P_in - P_ice) / Math.max(w_g, 1e-6);
            if (Math.abs(Te) > emTmax(em, w_g) + 1e-6) continue;
            if (vv * 3.6 < 8 && P_ice > 0 && soc > p.soc_min) continue;
            const f_ = P_ice > 0 ? iceFuel(ice, n_i, P_ice / w_i) : 0, Pbb = emElec(em, w_g, Te) + veh.P_aux;
            if (Pbb > bat.P_dis * 1e3 || Pbb < -bat.P_chg * 1e3) continue;
            if ((soc <= p.soc_min && Pbb > veh.P_aux) || (soc >= p.soc_max && Pbb < 0)) continue;
            const c = f_ + st * Pbb / QI * 1e3;
            if (!best || c < best[0]) best = [c, f_, Pbb];
          }
        });
        if (!best) {
          const n_i = Math.max(w_in / PI30, ice.n_idle), w_i = n_i * PI30, Te = emTmax(em, w_in);
          best = [0, iceFuel(ice, n_i, (P_in - Te * w_in) / w_i), emElec(em, w_in, Te) + veh.P_aux];
        }
        fr = best[1]; Pb = best[2];
      } else if (P_req < 0) {
        let Te = Math.max(P_req * gb.eta / Math.max(w_in, 1e-6), -emTmax(em, w_in), -bat.P_chg * 1e3 / Math.max(w_in, 1e-6));
        if (vv * 3.6 < 5 || soc >= p.soc_max) Te = 0;
        Pb = emElec(em, w_in, Te) + veh.P_aux;
      } else Pb = veh.P_aux;
      const r = batStep(bat, soc, Pb); soc = r[0]; Eb += r[2]; fuel += fr;
      if (fr > 0) tIce++; else if (vv > 0.05) dEv += vv;
      socs.push(soc);
    }
    const dist = D.vm.reduce((a, b) => a + b, 0) / 1000;
    const res = { fuel_g: fuel, dist_km: dist, L100: fuel / 1000 / RHO_FUEL / dist * 100, soc_end: soc, E_bat_int_kWh: Eb / 3.6e6, t_ice: tIce, ev_share: dEv / 1000 / dist, soc: socs };
    res.L100_corr = csCorrected(cfg, res);
    return res;
  }

  // ---------------------------------------------------------------- TCO (cap. 8)
  function tco(c) {
    const km = c.km_an * c.ani, L = c.L100 * km / 100, kWh = (c.kWh100 || 0) * km / 100;
    const P_net = c.pret * (1 - c.rezidual), C_en = L * c.pret_L + kWh * c.pret_kWh, C_m = c.mentenanta * c.ani, C_t = c.taxe * c.ani;
    return { P_net: P_net, C_en: C_en, C_m: C_m, C_t: C_t, TCO: P_net + C_en + C_m + C_t, L: L, kWh: kWh };
  }

  function buildCfg(raw) {
    const c = JSON.parse(JSON.stringify(raw));
    c.veh.F_adh = (c.veh.axle || 0.58) * c.veh.m * G * (c.veh.mu || 0.80);
    c.ice = calibrateIce(c.ice);
    for (const k of ["em", "gen", "mg1", "mg2"]) if (c[k]) c[k] = emSetup(c[k]);
    return c;
  }

  const API = { buildCfg,
    G, RHO_AIR, RHO_FUEL, QI, CO2_PER_L, interp, linspace, wheelDemand, pRoad, iceFullLoad, iceFriction, iceEff, iceFuel,
    calibrateIce, iceOOL, oolPoint, emSetup, emTmax, emElec, batStep, gearSelect, simulate, csCorrected, runCS, runPHEV,
    maxWheelForce, accel0100, vMax, gradeMax, simulateECMS, tco
  };
  if (typeof module !== "undefined") module.exports = API; else root.HEV = API;
})(this);
