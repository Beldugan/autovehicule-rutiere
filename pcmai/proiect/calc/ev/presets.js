// Configurațiile exemplelor din îndrumar (aceleași valori ca ev_configs.py).
var PRESETS = {
 "SPRING": {
  "nume": "Dacia Spring – proiect (exemplul 1)",
  "veh": {
   "m": 1050,
   "CdA": 0.665,
   "f": 0.0075,
   "rw": 0.29,
   "delta": 1.05,
   "P_aux": 200,
   "phi_front": 0.75,
   "phi_static": 0.57,
   "mu": 0.85,
   "v_lim": 125,
   "hvac": {
    "T_cab": 21.0,
    "UA": 80.0,
    "COP_heat": 1.0,
    "COP_cool": 2.5,
    "Q_solar": 400.0
   }
  },
  "drives": [
   {
    "axle": "fata",
    "i": [
     9.0
    ],
    "eta": 0.97,
    "em": {
     "P": 75,
     "P_cont": 40,
     "T_max": 125,
     "n_max": 10500,
     "eta_max": 0.945
    }
   }
  ],
  "bat": {
   "chem": "LFP",
   "ns": 104,
   "np": 1,
   "Q_Ah": 72.0,
   "R25": 0.7,
   "soc_min": 0.02,
   "soc_max": 1.0,
   "eta_c": 0.995,
   "P_dis": 85,
   "P_chg": 40,
   "e_pack": 140,
   "cp": 1000.0,
   "UA_bat": 4.0,
   "P_cool": 0.0,
   "T_cool_on": 99.0,
   "COP_cool": 2.5,
   "crate_soc": [
    0.0,
    0.5,
    0.8,
    0.9,
    1.0
   ],
   "crate": [
    1.33,
    1.33,
    1.0,
    0.5,
    0.12
   ]
  },
  "eta_ac": 0.88,
  "eta_dc": 0.94,
  "P_ac": 7.0,
  "P_dc": 40.0
 },
 "SCENIC": {
  "nume": "SUV electric de clasă C – proiect (exemplul 2)",
  "veh": {
   "m": 1950,
   "CdA": 0.64,
   "f": 0.0065,
   "rw": 0.355,
   "delta": 1.04,
   "P_aux": 200,
   "phi_front": 0.75,
   "phi_static": 0.56,
   "mu": 0.85,
   "v_lim": 170,
   "hvac": {
    "T_cab": 21.0,
    "UA": 110.0,
    "COP_heat": 2.2,
    "COP_cool": 2.8,
    "Q_solar": 600.0
   }
  },
  "drives": [
   {
    "axle": "fata",
    "i": [
     11.5
    ],
    "eta": 0.97,
    "em": {
     "P": 160,
     "P_cont": 90,
     "T_max": 300,
     "n_max": 15000,
     "eta_max": 0.94
    }
   }
  ],
  "bat": {
   "chem": "NMC",
   "ns": 96,
   "np": 2,
   "Q_Ah": 130.0,
   "R25": 0.9,
   "soc_min": 0.03,
   "soc_max": 0.98,
   "eta_c": 0.995,
   "P_dis": 200,
   "P_chg": 90,
   "e_pack": 165,
   "cp": 1000.0,
   "UA_bat": 8.0,
   "P_cool": 4000.0,
   "T_cool_on": 35.0,
   "COP_cool": 2.5,
   "crate_soc": [
    0.0,
    0.3,
    0.5,
    0.7,
    0.8,
    0.9,
    1.0
   ],
   "crate": [
    1.44,
    1.44,
    1.17,
    0.81,
    0.54,
    0.27,
    0.09
   ]
  },
  "eta_ac": 0.9,
  "eta_dc": 0.95,
  "P_ac": 11.0,
  "P_dc": 150.0
 },
 "SCENIC_2T": {
  "nume": "SUV – reductor cu 2 trepte",
  "veh": {
   "m": 1950,
   "CdA": 0.64,
   "f": 0.0065,
   "rw": 0.355,
   "delta": 1.04,
   "P_aux": 200,
   "phi_front": 0.75,
   "phi_static": 0.56,
   "mu": 0.85,
   "v_lim": 170,
   "hvac": {
    "T_cab": 21.0,
    "UA": 110.0,
    "COP_heat": 2.2,
    "COP_cool": 2.8,
    "Q_solar": 600.0
   }
  },
  "drives": [
   {
    "axle": "fata",
    "i": [
     14.5,
     8.0
    ],
    "eta": 0.965,
    "em": {
     "P": 160,
     "P_cont": 90,
     "T_max": 300,
     "n_max": 15000,
     "eta_max": 0.94
    }
   }
  ],
  "bat": {
   "chem": "NMC",
   "ns": 96,
   "np": 2,
   "Q_Ah": 130.0,
   "R25": 0.9,
   "soc_min": 0.03,
   "soc_max": 0.98,
   "eta_c": 0.995,
   "P_dis": 200,
   "P_chg": 90,
   "e_pack": 165,
   "cp": 1000.0,
   "UA_bat": 8.0,
   "P_cool": 4000.0,
   "T_cool_on": 35.0,
   "COP_cool": 2.5,
   "crate_soc": [
    0.0,
    0.3,
    0.5,
    0.7,
    0.8,
    0.9,
    1.0
   ],
   "crate": [
    1.44,
    1.44,
    1.17,
    0.81,
    0.54,
    0.27,
    0.09
   ]
  },
  "eta_ac": 0.9,
  "eta_dc": 0.95,
  "P_ac": 11.0,
  "P_dc": 150.0
 },
 "SCENIC_AWD": {
  "nume": "SUV – două motoare (față + spate)",
  "veh": {
   "m": 2030,
   "CdA": 0.64,
   "f": 0.0065,
   "rw": 0.355,
   "delta": 1.04,
   "P_aux": 200,
   "phi_front": 0.75,
   "phi_static": 0.56,
   "mu": 0.85,
   "v_lim": 170,
   "hvac": {
    "T_cab": 21.0,
    "UA": 110.0,
    "COP_heat": 2.2,
    "COP_cool": 2.8,
    "Q_solar": 600.0
   }
  },
  "drives": [
   {
    "axle": "fata",
    "i": [
     11.5
    ],
    "eta": 0.97,
    "em": {
     "P": 160,
     "P_cont": 90,
     "T_max": 300,
     "n_max": 15000,
     "eta_max": 0.94
    }
   },
   {
    "axle": "spate",
    "i": [
     10.0
    ],
    "eta": 0.97,
    "decouple": true,
    "em": {
     "P": 100,
     "P_cont": 50,
     "T_max": 200,
     "n_max": 15000,
     "eta_max": 0.95
    }
   }
  ],
  "bat": {
   "chem": "NMC",
   "ns": 96,
   "np": 2,
   "Q_Ah": 130.0,
   "R25": 0.9,
   "soc_min": 0.03,
   "soc_max": 0.98,
   "eta_c": 0.995,
   "P_dis": 200,
   "P_chg": 90,
   "e_pack": 165,
   "cp": 1000.0,
   "UA_bat": 8.0,
   "P_cool": 4000.0,
   "T_cool_on": 35.0,
   "COP_cool": 2.5,
   "crate_soc": [
    0.0,
    0.3,
    0.5,
    0.7,
    0.8,
    0.9,
    1.0
   ],
   "crate": [
    1.44,
    1.44,
    1.17,
    0.81,
    0.54,
    0.27,
    0.09
   ]
  },
  "eta_ac": 0.9,
  "eta_dc": 0.95,
  "P_ac": 11.0,
  "P_dc": 150.0
 }
};
var REF = {"spring": {"nume": "Dacia Spring Extreme Electric 100 (2026)", "P": 75, "E": 24.3, "chem": "LFP", "SCx": 0.665, "range_wltp": 225, "P_dc": 40, "P_ac": 7, "t_dc": "20–80 % în 29 min", "m": "circa 1 000 kg"}, "scenic": {"nume": "Renault Scenic E-Tech electric 87 kWh (220 CP)", "P": 160, "T": 300, "E_nom": 92.0, "E": 87.0, "chem": "NMC", "v_max": 170, "t_0_100": 8.4, "m_eu": 1917, "range_wltp": 625, "e_wltp": 16.8, "P_dc": 150, "P_ac": 22, "t_dc": "15–80 % în 37 min", "motor": "sincron cu rotor bobinat"}};
var ECON = {"km_an": 15000, "ani": 10, "p_home": 0.28, "p_dc": 0.6, "share_home": 0.85, "p_fuel": 1.83, "g_grid": 300.0, "kg_L": 2.8, "k_glider": 5.0, "k_bat": 75.0};
var TCO_IN = {"SPRING": {"ev": {"pret": 19000, "rezidual": 0.35, "mentenanta": 220, "taxe": 0}, "ice": {"nume": "Dacia Sandero TCe 90", "L100": 5.4, "pret": 14500, "rezidual": 0.4, "mentenanta": 350, "taxe": 100, "m": 1100}}, "SCENIC": {"ev": {"pret": 47000, "rezidual": 0.35, "mentenanta": 280, "taxe": 0}, "ice": {"nume": "Renault Austral mild hybrid 160", "L100": 6.2, "pret": 36000, "rezidual": 0.4, "mentenanta": 420, "taxe": 150, "m": 1500}}};
var REQ = {"SPRING": {"vmax": 125, "tacc": 10.0, "panta": 25, "d": 220, "tdc": 30, "socA": 0.2}, "SCENIC": {"vmax": 170, "tacc": 8.5, "panta": 30, "d": 600, "tdc": 40, "socA": 0.15}};
if (typeof module !== "undefined") module.exports = { PRESETS, REF, ECON, TCO_IN, REQ };
