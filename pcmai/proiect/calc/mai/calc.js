// Calculul termic al motorului cu ardere internă (MAS / MAC) – motorul de calcul.
// Reproduce, formulă cu formulă, foaia de calcul PCMAI_Calcul_termic_2026-2027.xlsx:
// calcul la 1 kg de combustibil, bilanț energetic cu u și i reale (tabelele din tabele.js),
// interpolare liniară pe grila din 50 în 50 K, n1 și n2 prin 8 iterații de punct fix.
(function (root) {
  "use strict";

  const TAB = typeof TABELE !== "undefined" ? TABELE : require("./tabele.js");
  const T0 = TAB[0][0];
  const PAS = 50;
  const COL = { uCO2: 1, uH2O: 2, uO2: 3, uN2: 4, iCO2: 5, iH2O: 6, iO2: 7, iN2: 8 };

  // Exemplele rezolvate din îndrumar (cap. 10 – MAS, cap. 11 – MAC)
  const EXEMPLE = {
    MAS: { tip: "MAS", P_nom: 55, n_P: 5500, i_cil: 4, tau: 4, c_f: 0.855, h_f: 0.145, o_f: 0, Q_i: 43500, M_c: 114,
      p_s: 0.1, T_s: 298, xi_a: 0.86, dT: 12, T_r: 1040, p_r: 0.11, g_r: 0.06, alfa: 1, eps: 9.5, xi_v: 0.88, xi_p: 0.8,
      phi_r: 0.96, eta_m: 0.84, lam: 0.28, psi: 0.88, beta: 30, th_inj: 40, dsa: 10, isa: 45, dse: 45, ise: 10, R_u: 8.314 },
    MAC: { tip: "MAC", P_nom: 66, n_P: 4000, i_cil: 4, tau: 4, c_f: 0.857, h_f: 0.133, o_f: 0.01, Q_i: 42500, M_c: 0,
      p_s: 0.2, T_s: 320, xi_a: 0.94, dT: 8, T_r: 760, p_r: 0.19, g_r: 0.02, alfa: 1.45, eps: 15.7, xi_v: 0.85, xi_p: 0.8,
      phi_r: 0.97, eta_m: 0.82, lam: 0.3, psi: 1.06, beta: 12, th_inj: 40, dsa: 12, isa: 35, dse: 50, ise: 14, R_u: 8.314 },
  };

  // Valorile uzuale din foaia „Verificari” [min MAS, max MAS, min MAC, max MAC]
  const LIMITE = [
    ["dT_a", "Abaterea T_a [%] (≤ 2)", 0, 2, 0, 2],
    ["dT_r", "Abaterea T_r [%] (≤ 5)", 0, 5, 0, 5],
    ["dP_e", "Abaterea puterii după rotunjire [%] (≤ 5)", 0, 5, 0, 5],
    ["eta_v", "Coeficientul de umplere η_v", 0.7, 0.9, 0.85, 1.05],
    ["n_1", "Exponentul n₁", 1.32, 1.39, 1.32, 1.39],
    ["p_c", "p_c [MPa]", 1.2, 2.5, 5, 10],
    ["T_c", "T_c [K]", 650, 850, 800, 1000],
    ["T_z", "T_z [K]", 2400, 2900, 1900, 2300],
    ["p_z", "p_z [MPa] (ciclul de calcul)", 5, 8, 10, 18],
    ["lam_p", "λ_p", 3, 4.2, 1.4, 2],
    ["n_2", "Exponentul n₂", 1.23, 1.3, 1.23, 1.3],
    ["p_b", "p_b [MPa]", 0.35, 0.5, 0.35, 0.7],
    ["T_b", "T_b [K]", 1200, 1700, 1000, 1200],
    ["p_e", "p_e [MPa]", 0.8, 1.1, 1.2, 2],
    ["eta_e", "η_e", 0.26, 0.34, 0.32, 0.4],
    ["c_e", "c_e [g/kWh]", 240, 310, 200, 260],
    ["W_m", "W_m [m/s]", 8, 20, 8, 14],
  ];

  const rad = (g) => (g * Math.PI) / 180;

  // MATCH(x; coloană crescătoare; 1): ultimul rând cu valoarea ≤ x
  function match(x, arr) {
    if (!(x >= arr[0])) return -1;
    let k = 0;
    for (let j = 0; j < arr.length; j++) if (arr[j] <= x) k = j;
    return k;
  }

  // Interpolare directă în tabele: valoarea coloanei c la temperatura T
  function tab(T, c, avert, ce) {
    const k = Math.floor((T - T0) / PAS);
    if (!(k >= 0) || k + 1 >= TAB.length) {
      avert.push(`${ce}: temperatura ${fmt(T, 1)} K iese din tabele (${T0}…${TAB[TAB.length - 1][0]} K).`);
      return NaN;
    }
    return TAB[k][c] + ((T - TAB[k][0]) * (TAB[k + 1][c] - TAB[k][c])) / PAS;
  }

  // Interpolare inversă: temperatura la care coloana de amestec atinge valoarea X
  function invers(X, col, temp, avert, ce) {
    const k = match(X, col);
    if (k < 0 || k + 1 >= col.length) {
      avert.push(`${ce}: valoarea ${fmt(X, 1)} kJ iese din domeniul tabelelor.`);
      return NaN;
    }
    return temp[k] + (PAS * (X - col[k])) / (col[k + 1] - col[k]);
  }

  // INTERCEPT / SLOPE (regresie liniară)
  function regresie(x, y) {
    const n = x.length;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0;
    for (let j = 0; j < n; j++) { sxy += (x[j] - mx) * (y[j] - my); sxx += (x[j] - mx) ** 2; }
    const b = sxy / sxx;
    return { a: my - b * mx, b };
  }

  function fmt(v, d) {
    return Number.isFinite(v) ? v.toFixed(d) : "—";
  }

  function calculeaza(date, optiuni) {
    const D = Object.assign({}, date);
    const opt = Object.assign({ D_r: null, S_r: null, n_min: 1000, n_max: null }, optiuni || {});
    const r = { date: D, avert: [] };
    const av = r.avert;
    const MAS = D.tip === "MAS";

    // ---------- Admisie ----------
    const O_t = D.c_f / 12 + D.h_f / 4 - D.o_f / 32;
    const L_t = O_t / 0.21;
    const L_a = D.alfa * L_t;
    const M_1 = L_a + (MAS ? 1 / D.M_c : 0);
    const g_CO2 = D.c_f / 12, g_H2O = D.h_f / 2, g_O2 = 0.21 * (D.alfa - 1) * L_t, g_N2 = 0.79 * L_a;
    const M_2 = g_CO2 + g_H2O + g_O2 + g_N2;
    const mu_0 = M_2 / M_1;
    const M_r = D.g_r * M_1;
    const r_CO2 = (M_r * g_CO2) / M_2, r_H2O = (M_r * g_H2O) / M_2, r_O2 = (M_r * g_O2) / M_2, r_N2 = (M_r * g_N2) / M_2;
    const a_CO2 = r_CO2, a_H2O = r_H2O, a_O2 = 0.21 * M_1 + r_O2, a_N2 = 0.79 * M_1 + r_N2;
    const M_a = M_1 + M_r;
    const T_in = D.T_s + D.dT;
    const T_a = (T_in + D.g_r * D.T_r) / (1 + D.g_r);
    const I_a =
      M_1 * (0.21 * tab(T_in, COL.iO2, av, "I_a") + 0.79 * tab(T_in, COL.iN2, av, "I_a")) +
      r_CO2 * tab(D.T_r, COL.iCO2, av, "I_a") + r_H2O * tab(D.T_r, COL.iH2O, av, "I_a") +
      r_O2 * tab(D.T_r, COL.iO2, av, "I_a") + r_N2 * tab(D.T_r, COL.iN2, av, "I_a");
    const p_a = D.xi_a * D.p_s;
    const eta_v = ((D.eps / (D.eps - 1)) * (p_a / D.p_s) * D.T_s) / (T_a * (1 + D.g_r));

    // ---------- Ardere: compoziții (necesare și pentru Amestecuri) ----------
    const v_inj = 1 + ((D.eps - 1) / 2) * ((1 - Math.cos(rad(D.beta))) + (D.lam / 4) * (1 - Math.cos(rad(2 * D.beta))));

    // ---------- Comprimare (regresia are nevoie de Amestecuri, deci de T_a) ----------
    // Amestecuri: pe grila tabelelor
    const temp = TAB.map((t) => t[0]);
    const uMix = (k, c, h, o, n) => c * TAB[k][1] + h * TAB[k][2] + o * TAB[k][3] + n * TAB[k][4];
    const iMix = (k, c, h, o, n) => c * TAB[k][5] + h * TAB[k][6] + o * TAB[k][7] + n * TAB[k][8];
    const amB = TAB.map((_, k) => iMix(k, a_CO2, a_H2O, a_O2, a_N2)); // I_a
    const amC = TAB.map((_, k) => uMix(k, a_CO2, a_H2O, a_O2, a_N2)); // U_a
    const amH = amC.map((u, k) => u / (M_a * temp[k]));               // cv_a

    const T_a_h = invers(I_a, amB, temp, av, "T_a′");
    const dT_a = (Math.abs(T_a_h - T_a) / T_a) * 100;

    const i300 = temp.indexOf(300), i1000 = temp.indexOf(1000);
    const reg1 = regresie(temp.slice(i300, i1000 + 1), amH.slice(i300, i1000 + 1));
    const a_1 = reg1.a, b_1 = reg1.b;
    const n1 = [1.37];
    for (let j = 1; j <= 8; j++) n1.push(1 + D.R_u / (a_1 + b_1 * T_a * (Math.pow(D.eps, n1[j - 1] - 1) + 1)));
    const n_1 = n1[8];
    const chk_n1 = D.R_u / (n_1 - 1) - a_1 - b_1 * T_a * (Math.pow(D.eps, n_1 - 1) + 1);
    const p_c = p_a * Math.pow(D.eps, n_1);
    const T_c = T_a * Math.pow(D.eps, n_1 - 1);
    const U_c =
      a_CO2 * tab(T_c, COL.uCO2, av, "U_c") + a_H2O * tab(T_c, COL.uH2O, av, "U_c") +
      a_O2 * tab(T_c, COL.uO2, av, "U_c") + a_N2 * tab(T_c, COL.uN2, av, "U_c");

    // ---------- Ardere ----------
    const p_inj = p_a * Math.pow(D.eps / v_inj, n_1);
    const T_inj = T_a * Math.pow(D.eps / v_inj, n_1 - 1);
    const tau_aa = 0.44 * Math.pow(p_inj * 10, -1.19) * Math.exp(4650 / T_inj);
    const th_aa = (6 * D.n_P * tau_aa) / 1000;
    const g_v = MAS ? 1 : Math.min(th_aa / D.th_inj, 1);
    const g_p = 1 - g_v;
    const y_CO2 = (g_v * D.c_f) / 12 + r_CO2;
    const y_H2O = (g_v * D.h_f) / 2 + r_H2O;
    const y_O2 = 0.21 * L_a - g_v * O_t + r_O2;
    const y_N2 = 0.79 * L_a + r_N2;
    const M_y = y_CO2 + y_H2O + y_O2 + y_N2;
    const z_CO2 = g_CO2 + r_CO2, z_H2O = g_H2O + r_H2O, z_O2 = g_O2 + r_O2, z_N2 = g_N2 + r_N2;
    const M_z = z_CO2 + z_H2O + z_O2 + z_N2;
    const mu_r = M_z / M_a;

    const amD = TAB.map((_, k) => uMix(k, y_CO2, y_H2O, y_O2, y_N2)); // U_y
    const amE = TAB.map((_, k) => iMix(k, y_CO2, y_H2O, y_O2, y_N2)); // I_y
    const amF = TAB.map((_, k) => iMix(k, z_CO2, z_H2O, z_O2, z_N2)); // I_z
    const amG = TAB.map((_, k) => uMix(k, z_CO2, z_H2O, z_O2, z_N2)); // U_z
    const amI = amG.map((u, k) => u / (M_z * temp[k]));               // cv_z

    const U_y = U_c + g_v * D.xi_v * D.Q_i;
    const T_y = invers(U_y, amD, temp, av, "T_y");
    const p_y = (((p_c * M_y) / M_a) * T_y) / T_c;
    const lam_p = p_y / p_c;
    const I_y =
      y_CO2 * tab(T_y, COL.iCO2, av, "I_y") + y_H2O * tab(T_y, COL.iH2O, av, "I_y") +
      y_O2 * tab(T_y, COL.iO2, av, "I_y") + y_N2 * tab(T_y, COL.iN2, av, "I_y");
    const I_z = I_y + g_p * D.xi_p * D.Q_i;
    const T_z = MAS ? T_y : invers(I_z, amF, temp, av, "T_z");
    const p_z = p_y;
    const rho = (M_z * T_z) / (M_y * T_y);
    const p_max = MAS ? 0.85 * p_z : p_z;

    // ---------- Destindere ----------
    const i900 = temp.indexOf(900), i2800 = temp.indexOf(2800);
    const reg2 = regresie(temp.slice(i900, i2800 + 1), amI.slice(i900, i2800 + 1));
    const a_2 = reg2.a, b_2 = reg2.b;
    const delta = D.eps / rho;
    const n2 = [1.26];
    for (let j = 1; j <= 8; j++) n2.push(1 + D.R_u / (a_2 + b_2 * T_z * (1 + Math.pow(delta, 1 - n2[j - 1]))));
    const n_2 = n2[8];
    const p_b = p_z / Math.pow(delta, n_2);
    const T_b = T_z / Math.pow(delta, n_2 - 1);
    const T_r_c = T_b / Math.pow(p_b / D.p_r, 1 / 3);
    const dT_r = (Math.abs(T_r_c - D.T_r) / D.T_r) * 100;

    // ---------- Performanțe ----------
    const p_it = (p_c / (D.eps - 1)) * (lam_p * (rho - 1) + ((lam_p * rho) / (n_2 - 1)) * (1 - Math.pow(delta, 1 - n_2)) -
      (1 / (n_1 - 1)) * (1 - Math.pow(D.eps, 1 - n_1)));
    const p_i = D.phi_r * p_it - (D.p_r - p_a);
    const eta_i = (D.R_u * M_1 * D.T_s * p_i) / (D.p_s * eta_v * D.Q_i);
    const c_i = 3600000 / (eta_i * D.Q_i);
    const p_e = D.eta_m * p_i;
    const eta_e = D.eta_m * eta_i;
    const c_e = c_i / D.eta_m;
    const C_h = (c_e * D.P_nom) / 1000;
    const P_ind = D.P_nom / D.eta_m;
    const M_P = (9549.3 * D.P_nom) / D.n_P;
    const V_h = (30 * D.tau * D.P_nom) / (p_e * D.n_P * D.i_cil);
    const D_cil = Math.pow((4 * V_h * 1e6) / (Math.PI * D.psi), 1 / 3);
    const S_cil = D.psi * D_cil;
    const R_man = S_cil / 2;
    const L_b = R_man / D.lam;
    const V_t = D.i_cil * V_h;
    const W_m = (S_cil * D.n_P) / 30000;
    const P_l = D.P_nom / V_t;
    const D_r = Number.isFinite(opt.D_r) && opt.D_r > 0 ? opt.D_r : Math.round(D_cil * 2) / 2;
    const S_r = Number.isFinite(opt.S_r) && opt.S_r > 0 ? opt.S_r : Math.round(S_cil * 2) / 2;
    const P_e_r = (((p_e * Math.PI * D_r * D_r) / 4) * S_r * D.i_cil * D.n_P) / (30 * D.tau) / 1e6;
    const dP_e = (Math.abs(P_e_r - D.P_nom) / D.P_nom) * 100;

    // ---------- Diagrama indicată ----------
    const V_c = (V_h * 1000) / (D.eps - 1);
    const V_a = V_h * 1000 + V_c;
    const V_z = rho * V_c;
    const diagrama = [];
    for (let al = 0; al <= 720; al += 5) {
      const V = V_c + ((V_h * 1000) / 2) * ((1 - Math.cos(rad(al))) + (D.lam / 4) * (1 - Math.cos(rad(2 * al))));
      let p, proces;
      if (al <= 180) { p = p_a; proces = "admisie"; }
      else if (al < 360) { p = p_a * Math.pow(V_a / V, n_1); proces = "comprimare"; }
      else if (al <= 540) { p = V <= V_z && al < 400 ? p_z : p_z * Math.pow(V_z / V, n_2); proces = "ardere-destindere"; }
      else { p = D.p_r; proces = "evacuare"; }
      diagrama.push({ alfa: al, V, p, proces });
    }

    // ---------- Caracteristica exterioară (Leiderman) ----------
    const k_a = MAS ? 1 : 0.87, k_b = MAS ? 1 : 1.13, k_c = 1, k_cons = MAS ? 1.2 : 1.55;
    const n_min = opt.n_min;
    const n_max = Number.isFinite(opt.n_max) && opt.n_max > 0 ? opt.n_max : Math.round((1.1 * D.n_P) / 100) * 100;
    const caracteristica = [];
    for (let j = 0; j <= 20; j++) {
      const n = n_min + (j * (n_max - n_min)) / 20;
      const x = n / D.n_P;
      const Pe = D.P_nom * (k_a * x + k_b * x * x - k_c * x * x * x);
      const Me = (9549.3 * Pe) / n;
      const ce = c_e * (k_cons - k_cons * x + x * x);
      caracteristica.push({ n, x, Pe, Me, ce, Ch: (ce * Pe) / 1000 });
    }
    let iM = 0;
    caracteristica.forEach((c, j) => { if (c.Me > caracteristica[iM].Me) iM = j; });
    const M_max = caracteristica[iM].Me;
    const n_Mmax = caracteristica[iM].n;
    const elasticitate = M_max / M_P;
    const ce_min = Math.min(...caracteristica.map((c) => c.ce));

    Object.assign(r, {
      O_t, L_t, L_a, M_1, g_CO2, g_H2O, g_O2, g_N2, M_2, mu_0, M_r, r_CO2, r_H2O, r_O2, r_N2,
      a_CO2, a_H2O, a_O2, a_N2, M_a, T_in, T_a, I_a, T_a_h, dT_a, p_a, eta_v,
      a_1, b_1, n1, n_1, chk_n1, p_c, T_c, U_c,
      v_inj, p_inj, T_inj, tau_aa, th_aa, g_v, g_p, y_CO2, y_H2O, y_O2, y_N2, M_y,
      z_CO2, z_H2O, z_O2, z_N2, M_z, mu_r, U_y, T_y, p_y, lam_p, I_y, I_z, T_z, p_z, rho, p_max,
      a_2, b_2, delta, n2, n_2, p_b, T_b, T_r_c, dT_r,
      p_it, p_i, eta_i, c_i, p_e, eta_e, c_e, C_h, P_ind, M_P, V_h, D_cil, S_cil, R_man, L_b, V_t, W_m, P_l,
      D_r, S_r, P_e_r, dP_e, V_c, V_a, V_z, diagrama,
      k_a, k_b, k_c, k_cons, n_min, n_max, caracteristica, M_max, n_Mmax, elasticitate, ce_min,
      amestecuri: { temp, I_a: amB, U_a: amC, U_y: amD, I_y: amE, I_z: amF, U_z: amG, cv_a: amH, cv_z: amI },
    });

    r.verificari = LIMITE.map(([k, eticheta, mi1, ma1, mi2, ma2]) => {
      const v = r[k];
      const [mi, ma] = MAS ? [mi1, ma1] : [mi2, ma2];
      return { cheie: k, eticheta, valoare: v, min: mi, max: ma, ok: v >= mi && v <= ma };
    });
    return r;
  }

  const API = { calculeaza, EXEMPLE, LIMITE, TABELE: TAB };
  if (typeof module !== "undefined") module.exports = API;
  else root.PCMAI = API;
})(typeof window !== "undefined" ? window : globalThis);
