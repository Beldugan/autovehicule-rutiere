// Exemplele îndrumarului (aceleași valori ca lcv_configs.py).
var PRESETS = {
 "EJ49": {
  "nume": "eJolly 49 kWh",
  "m_curb": 1900,
  "gvw": 3075,
  "payload_max": 1100,
  "payload": 1100,
  "veh": {
   "m": 3075,
   "CdA": 0.93,
   "f": 0.0078,
   "rw": 0.335,
   "delta": 1.04,
   "P_aux": 300,
   "phi_front": 0.7,
   "phi_static": 0.48,
   "mu": 0.85,
   "v_lim": 130,
   "hvac": {
    "T_cab": 21.0,
    "UA": 120.0,
    "COP_heat": 1.0,
    "COP_cool": 2.5,
    "Q_solar": 700.0
   }
  },
  "drives": [
   {
    "axle": "fata",
    "i": [
     11.0
    ],
    "eta": 0.97,
    "em": {
     "P": 100,
     "P_cont": 55,
     "T_max": 260,
     "n_max": 12000,
     "eta_max": 0.945
    }
   }
  ],
  "bat": {
   "chem": "NMC",
   "ns": 96,
   "np": 2,
   "Q_Ah": 69.0,
   "R25": 1.1,
   "soc_min": 0.05,
   "soc_max": 0.95,
   "eta_c": 0.995,
   "P_dis": 120,
   "P_chg": 45,
   "e_pack": 150,
   "cp": 1000.0,
   "UA_bat": 6.0,
   "P_cool": 2000.0,
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
    1.6,
    1.6,
    1.3,
    0.9,
    0.6,
    0.3,
    0.1
   ]
  },
  "eta_ac": 0.9,
  "eta_dc": 0.95,
  "P_ac": 11.0,
  "P_dc": 100.0
 },
 "EJ75": {
  "nume": "eJolly 75 kWh",
  "m_curb": 2100,
  "gvw": 3200,
  "payload_max": 1025,
  "payload": 1025,
  "veh": {
   "m": 3200,
   "CdA": 0.93,
   "f": 0.0078,
   "rw": 0.335,
   "delta": 1.04,
   "P_aux": 300,
   "phi_front": 0.7,
   "phi_static": 0.48,
   "mu": 0.85,
   "v_lim": 130,
   "hvac": {
    "T_cab": 21.0,
    "UA": 120.0,
    "COP_heat": 1.0,
    "COP_cool": 2.5,
    "Q_solar": 700.0
   }
  },
  "drives": [
   {
    "axle": "fata",
    "i": [
     11.0
    ],
    "eta": 0.97,
    "em": {
     "P": 100,
     "P_cont": 55,
     "T_max": 260,
     "n_max": 12000,
     "eta_max": 0.945
    }
   }
  ],
  "bat": {
   "chem": "NMC",
   "ns": 96,
   "np": 3,
   "Q_Ah": 69.0,
   "R25": 1.1,
   "soc_min": 0.05,
   "soc_max": 0.95,
   "eta_c": 0.995,
   "P_dis": 120,
   "P_chg": 60,
   "e_pack": 150,
   "cp": 1000.0,
   "UA_bat": 6.0,
   "P_cool": 2000.0,
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
    1.6,
    1.6,
    1.3,
    0.9,
    0.6,
    0.3,
    0.1
   ]
  },
  "eta_ac": 0.9,
  "eta_dc": 0.95,
  "P_ac": 11.0,
  "P_dc": 100.0
 },
 "EJ75F": {
  "nume": "eJolly 75 kWh frigorific",
  "m_curb": 2350,
  "gvw": 3200,
  "payload_max": 775,
  "payload": 775,
  "veh": {
   "m": 3200,
   "CdA": 1.02,
   "f": 0.0078,
   "rw": 0.335,
   "delta": 1.04,
   "P_aux": 300,
   "phi_front": 0.7,
   "phi_static": 0.48,
   "mu": 0.85,
   "v_lim": 130,
   "hvac": {
    "T_cab": 21.0,
    "UA": 120.0,
    "COP_heat": 1.0,
    "COP_cool": 2.5,
    "Q_solar": 700.0
   }
  },
  "drives": [
   {
    "axle": "fata",
    "i": [
     11.0
    ],
    "eta": 0.97,
    "em": {
     "P": 100,
     "P_cont": 55,
     "T_max": 260,
     "n_max": 12000,
     "eta_max": 0.945
    }
   }
  ],
  "bat": {
   "chem": "NMC",
   "ns": 96,
   "np": 3,
   "Q_Ah": 69.0,
   "R25": 1.1,
   "soc_min": 0.05,
   "soc_max": 0.95,
   "eta_c": 0.995,
   "P_dis": 120,
   "P_chg": 60,
   "e_pack": 150,
   "cp": 1000.0,
   "UA_bat": 6.0,
   "P_cool": 2000.0,
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
    1.6,
    1.6,
    1.3,
    0.9,
    0.6,
    0.3,
    0.1
   ]
  },
  "eta_ac": 0.9,
  "eta_dc": 0.95,
  "P_ac": 11.0,
  "P_dc": 100.0
 }
};
var REF = {"ejolly": {"nume": "IVECO eJolly", "P": 100, "T": 260, "E49": 49, "E75": 75, "range49": 224, "range75": 352, "P_dc": 100, "gvw": "2,8–3,2 t", "payload": 1175}, "expert75": {"nume": "Peugeot e-Expert L2 75 kWh", "m": 2100, "v_max": 130, "t_0_100": 11.2, "range_wltp": 352, "e_wltp": 23.7, "P_dc": 100, "t_dc": 45, "tyres": "215/65 R16"}, "diesel": {"nume": "Peugeot Expert L 2.0 BlueHDi 145 EAT8", "L100": 7.4, "CO2": 200, "m": 1707, "gvw": 3100, "payload": 1393, "P": 106}};
var ROUTE = {"d_app": 20.0, "v_app": 70.0, "n_stops": 60, "L_s": 1.0, "v_c": 40.0, "t_s": 120.0, "a_acc": 0.8, "a_dec": 1.0};
var ROUTE_FRIGO = {"d_app": 15.0, "v_app": 70.0, "n_stops": 40, "L_s": 1.5, "v_c": 40.0, "t_s": 180.0, "a_acc": 0.8, "a_dec": 1.0};
var PTO = {"on": true, "UA_box": 35.0, "T_box": 2.0, "Q_door": 400.0, "COP": 1.6, "P_fan": 150.0};
var SOH_EOL = 0.8;
var ECON = {"km_an": 30000, "ani": 6, "p_depot": 0.2, "p_dc": 0.6, "share_depot": 0.9, "p_fuel": 1.75, "adblue": 0.002, "g_grid": 300.0, "kg_L_diesel": 3.2};
var TCO_IN = {"ev49": {"pret": 42000, "rezidual": 0.3, "mentenanta": 500, "fix_an": 900}, "ev75": {"pret": 48000, "rezidual": 0.3, "mentenanta": 500, "fix_an": 900}, "evfr": {"pret": 60000, "rezidual": 0.3, "mentenanta": 800, "fix_an": 1000}, "diesel": {"pret": 33000, "rezidual": 0.35, "mentenanta": 900, "fix_an": 1100, "L100_route": 9.0}, "dieselfr": {"pret": 45000, "rezidual": 0.35, "mentenanta": 1300, "fix_an": 1200, "L100_route": 10.5}};
var REQ = {"vmax":130,"tacc":14.0,"panta":20,"d_day":150,"reserve":0.10};
if (typeof module !== "undefined") module.exports = { PRESETS, REF, ROUTE, ROUTE_FRIGO, PTO, SOH_EOL, ECON, TCO_IN, REQ };
