// Configurațiile exemplelor din îndrumar (Dacia Bigster, date din disertația Beldugan, 2026).
// Aceleași valori ca în configs.py. Puterile strategiei sunt în W, ca în modelul de calcul.
var PRESETS = (function () {
  const VEH = { CdA: 0.868, f: 0.011, rw: 0.328, delta: 1.08, P_aux: 500, axle: 0.58, mu: 0.80 };
  const H4 = { nume: "HORSE H4Mt 1.8 Atkinson", Vd: 1.798, P_max: 80, n_P: 5600, T_max: 172, n_M1: 3200, n_M2: 4000,
    n_idle: 900, n_max: 6000, bsfc_min: 220, c0: 0.9, c1: 0.15, c2: 0.05, n_e: 2500, cn: 0.10, tau_r: 0.85, k_r: 0.8 };
  const TCE = { nume: "TCe 140 1.2 Miller (MHEV 48 V)", Vd: 1.199, P_max: 103, n_P: 5000, T_max: 230, n_M1: 1750, n_M2: 3500,
    n_idle: 800, n_max: 6000, bsfc_min: 225, c0: 0.6, c1: 0.15, c2: 0.05, n_e: 2300, cn: 0.10, tau_r: 0.85, k_r: 0.8 };
  const DCT6 = { ig: [3.72, 2.05, 1.32, 0.96, 0.76, 0.62], i0: 3.40, eta: 0.95, n_min: 1250, n_launch: 2200 };
  const MT6 = { ig: [3.73, 2.05, 1.39, 1.03, 0.82, 0.69], i0: 4.21, eta: 0.95, n_min: 1300, n_launch: 2500 };
  const c = o => JSON.parse(JSON.stringify(o));
  const veh = m => Object.assign(c(VEH), { m: m });
  const BAT_HEV = (U) => ({ E: 1.4, U_n: U, R0: 0.055, P_dis: 60, P_chg: 40, eta_c: 0.98 });

  const P = {};
  P.CONV = { arch: "conv", tip: "conv", nume: "Bigster TCe 140 MHEV (referință)", veh: veh(1494), ice: c(TCE), gb: c(MT6),
    eta_alt: 0.65, mhev: { P: 12, eta: 0.75, E: 0.05 }, t_shift: 1.0, L_omol: 5.5 };
  P.P2_HEV = { arch: "P2", tip: "HEV", nume: "Bigster HEV paralel P2 (exemplul 1)", veh: veh(1539), ice: c(H4), gb: c(DCT6),
    em: { P: 55, P_nom: 37, T_max: 205, n_max: 10000, eta_max: 0.95 }, bat: BAT_HEV(230),
    ems: { soc_min: 0.40, soc_target: 0.55, soc_max: 0.70, P_low: 8e3, P_th: 45e3, v_ice_min: 20, P_chg: 20e3, k_soc: 2.0, lps: 0.85 },
    eta_corr: 0.30, t_shift: 0.3 };
  P.PS_PHEV = { arch: "PS", tip: "PHEV", nume: "Bigster PHEV serie-paralel (exemplul 2)", veh: veh(1674), ice: c(H4),
    mg1: { P: 55, P_nom: 40, T_max: 130, n_max: 13500, eta_max: 0.96 }, mg2: { P: 100, P_nom: 75, T_max: 280, n_max: 12000, eta_max: 0.96 },
    k: 2.6, i_f: 3.267, i_mg2: 2.5, eta_tr: 0.94, bat: { E: 12.0, U_n: 350, R0: 0.009, P_dis: 84, P_chg: 60, eta_c: 0.98 },
    ems: { soc_min: 0.20, soc_cs: 0.20, soc_target: 0.30, soc_max: 0.90, soc_full: 0.85, v_ev_max: 60, v_ev_max_cd: 120,
      P_start: 25e3, P_ev_max: 95e3, k_soc: 1.0, P_chg_max: 15e3, P_ice_min: 8e3 }, eta_corr: 0.30, eta_charge: 0.90 };
  P.S_HEV = { arch: "S", tip: "HEV", nume: "Bigster HEV serie", veh: veh(1559), ice: c(H4),
    em: { P: 90, P_nom: 70, T_max: 270, n_max: 12000, eta_max: 0.96 }, gen: { P: 60, P_nom: 60, T_max: 200, n_max: 8000, eta_max: 0.95 },
    i_em: 9.5, eta_red: 0.97, bat: BAT_HEV(300),
    ems: { soc_low: 0.40, soc_high: 0.65, soc_target: 0.55, P_opt: 32e3, soc_cs: 0.40 }, eta_corr: 0.30 };
  P.P2_PHEV = Object.assign(c(P.P2_HEV), { tip: "PHEV", nume: "Bigster PHEV paralel P2", veh: veh(1634),
    em: { P: 85, P_nom: 65, T_max: 270, n_max: 10000, eta_max: 0.95 }, bat: { E: 11.0, U_n: 350, R0: 0.010, P_dis: 77, P_chg: 50, eta_c: 0.98 },
    ems: { soc_min: 0.20, soc_cs: 0.20, soc_target: 0.30, soc_max: 0.90, soc_full: 0.85, P_low: 12e3, P_th: 45e3, v_ice_min: 30,
      P_chg: 20e3, k_soc: 2.0, lps: 0.85, P_ev_max: 80e3, v_ev_max: 135 }, eta_charge: 0.90 });
  P.S_PHEV = Object.assign(c(P.S_HEV), { tip: "PHEV", nume: "Bigster PHEV serie", veh: veh(1664),
    em: { P: 110, P_nom: 90, T_max: 320, n_max: 12000, eta_max: 0.96 }, bat: { E: 13.0, U_n: 350, R0: 0.0085, P_dis: 92, P_chg: 70, eta_c: 0.98 },
    ems: { soc_low: 0.25, soc_high: 0.35, soc_target: 0.30, P_opt: 32e3, soc_cs: 0.20, soc_full: 0.85 }, eta_charge: 0.90 });
  P.PS_HEV = Object.assign(c(P.PS_PHEV), { tip: "HEV", nume: "Bigster HEV serie-paralel", veh: veh(1569),
    mg1: { P: 42, P_nom: 30, T_max: 100, n_max: 13500, eta_max: 0.96 }, mg2: { P: 70, P_nom: 50, T_max: 210, n_max: 12000, eta_max: 0.96 },
    bat: BAT_HEV(300), ems: { soc_min: 0.40, soc_cs: 0.40, soc_target: 0.55, soc_max: 0.70, v_ev_max: 60, v_ev_max_cd: 60,
      P_start: 15e3, P_ev_max: 15e3, k_soc: 1.0, P_chg_max: 15e3, P_ice_min: 8e3 } });
  delete P.PS_HEV.eta_charge;
  return P;
})();
var COSTURI = {
  pret_ref: 23950, km_an: 15000, ani: 10, pret_L: 1.83, pret_kWh: 0.28, rezidual: 0.30, mentenanta_ref: 350, taxe_ref: 260,
  dP: { P2_HEV: 3259, PS_PHEV: 8322 }, red_m: { HEV: 0.15, PHEV: 0.25 }, red_t: 0.40, UF: 0.70
};
if (typeof module !== "undefined") module.exports = { PRESETS: PRESETS, COSTURI: COSTURI };
