// Interfața aplicației: formularul de date, tabelele de rezultate și graficele.
(function () {
  "use strict";
  const { calculeaza, EXEMPLE } = window.PCMAI;

  // ---------------- Date de intrare (foaia „Date”) ----------------
  const CAMPURI = [
    ["Tema", [
      ["tip", "Tipul motorului", "", "–", null],
      ["P_nom", "Puterea efectivă nominală", "P<sub>e</sub>", "kW", null],
      ["n_P", "Turația de putere nominală", "n<sub>P</sub>", "rot/min", null],
      ["i_cil", "Numărul de cilindri", "i", "–", null],
      ["tau", "Numărul de timpi", "τ", "–", null],
    ]],
    ["Combustibil", [
      ["c_f", "Fracția masică de carbon", "c", "–", null],
      ["h_f", "Fracția masică de hidrogen", "h", "–", null],
      ["o_f", "Fracția masică de oxigen", "o", "–", null],
      ["Q_i", "Puterea calorifică inferioară", "Q<sub>i</sub>", "kJ/kg", null],
      ["M_c", "Masa molară a combustibilului (vapori)", "M<sub>c</sub>", "kg/kmol", "MAS"],
    ]],
    ["Admisie și gaze reziduale", [
      ["p_s", "Presiunea de admisie în motor (p₀ sau p<sub>s</sub>)", "p<sub>s</sub>", "MPa", null],
      ["T_s", "Temperatura de admisie în motor (T₀ sau T<sub>s</sub>)", "T<sub>s</sub>", "K", null],
      ["xi_a", "Coeficientul de scădere a presiunii la admisie", "ξ<sub>a</sub>", "–", null],
      ["dT", "Încălzirea încărcăturii", "ΔT", "K", null],
      ["T_r", "Temperatura gazelor arse reziduale", "T<sub>r</sub>", "K", null],
      ["p_r", "Presiunea gazelor reziduale (evacuare)", "p<sub>r</sub>", "MPa", null],
      ["g_r", "Coeficientul gazelor arse reziduale", "γ<sub>r</sub>", "–", null],
    ]],
    ["Ciclul", [
      ["alfa", "Coeficientul de exces de aer (≥ 1)", "α", "–", null],
      ["eps", "Raportul de comprimare", "ε", "–", null],
      ["xi_v", "Coef. de utilizare a căldurii – izocor (MAS: ξ)", "ξ<sub>v</sub>", "–", null],
      ["xi_p", "Coef. de utilizare a căldurii – izobar", "ξ<sub>p</sub>", "–", "MAC"],
      ["phi_r", "Coeficientul de rotunjire a diagramei", "φ<sub>r</sub>", "–", null],
      ["eta_m", "Randamentul mecanic", "η<sub>m</sub>", "–", null],
    ]],
    ["Mecanismul și distribuția", [
      ["lam", "Raportul rază manivelă / lungime bielă", "λ", "–", null],
      ["psi", "Raportul cursă / alezaj", "ψ", "–", null],
      ["beta", "Avans la aprindere (MAS) / început injecție (MAC)", "β", "°RAC", null],
      ["th_inj", "Durata injecției", "θ<sub>inj</sub>", "°RAC", "MAC"],
      ["dsa", "Deschiderea supapei de admisie înainte de PMI", "dsa", "°RAC", null],
      ["isa", "Închiderea supapei de admisie după PME", "îsa", "°RAC", null],
      ["dse", "Deschiderea supapei de evacuare înainte de PME", "dse", "°RAC", null],
      ["ise", "Închiderea supapei de evacuare după PMI", "îse", "°RAC", null],
      ["R_u", "Constanta universală a gazelor", "R", "kJ/(kmol·K)", null],
    ]],
    ["Opțiuni (se pot lăsa goale)", [
      ["D_r", "Alezaj rotunjit (gol = rotunjire automată la 0,5 mm)", "D<sub>r</sub>", "mm", "opt"],
      ["S_r", "Cursă rotunjită (gol = rotunjire automată la 0,5 mm)", "S<sub>r</sub>", "mm", "opt"],
      ["n_min", "Turația minimă a caracteristicii exterioare", "n<sub>min</sub>", "rot/min", "opt"],
      ["n_max", "Turația maximă (gol = 1,1·n<sub>P</sub> rotunjit)", "n<sub>max</sub>", "rot/min", "opt"],
    ]],
  ];
  const OPT_IMPLICIT = { D_r: "", S_r: "", n_min: 1000, n_max: "" };
  const TIP_SHELL = (window.PCMAI_SHELL && PCMAI_SHELL.tipMotor) || "MAS";
  const CHEIE_STOCARE = "pcmai-proiect-" + TIP_SHELL;

  // ---------------- Rânduri de rezultate (foile de calcul) ----------------
  // [nr, mărime, simbol, relație, valoare (cheie sau funcție), unitate, zecimale]
  const it = (k, j) => (r) => r[k][j];
  const FOI = {
    Admisie: [
      ["Aerul necesar și produsele arderii (1 kg combustibil)"],
      [1, "Oxigenul teoretic", "O<sub>t</sub>", "c/12 + h/4 − o/32", "O_t", "kmol/kg", 5],
      [2, "Aerul teoretic", "L<sub>t</sub>", "O<sub>t</sub>/0,21", "L_t", "kmol/kg", 5],
      [3, "Aerul real", "L", "α·L<sub>t</sub>", "L_a", "kmol/kg", 5],
      [4, "Încărcătura proaspătă", "M<sub>1</sub>", "L (+ 1/M<sub>c</sub> la MAS)", "M_1", "kmol/kg", 5],
      [5, "CO₂ din ardere", "ν<sub>CO2</sub>", "c/12", "g_CO2", "kmol/kg", 5],
      [6, "H₂O din ardere", "ν<sub>H2O</sub>", "h/2", "g_H2O", "kmol/kg", 5],
      [7, "O₂ rămas", "ν<sub>O2</sub>", "0,21·(α−1)·L<sub>t</sub>", "g_O2", "kmol/kg", 5],
      [8, "N₂", "ν<sub>N2</sub>", "0,79·L", "g_N2", "kmol/kg", 5],
      [9, "Produsele arderii", "M<sub>2</sub>", "Σ ν<sub>j</sub>", "M_2", "kmol/kg", 5],
      [10, "Coeficientul chimic de variație", "μ<sub>0</sub>", "M<sub>2</sub>/M<sub>1</sub>", "mu_0", "–", 4],
      ["Gazele arse reziduale"],
      [11, "Gaze reziduale", "M<sub>r</sub>", "γ<sub>r</sub>·M<sub>1</sub>", "M_r", "kmol/kg", 5],
      [12, "CO₂ rezidual", "ν<sub>rCO2</sub>", "M<sub>r</sub>·ν<sub>CO2</sub>/M<sub>2</sub>", "r_CO2", "kmol/kg", 6],
      [13, "H₂O rezidual", "ν<sub>rH2O</sub>", "M<sub>r</sub>·ν<sub>H2O</sub>/M<sub>2</sub>", "r_H2O", "kmol/kg", 6],
      [14, "O₂ rezidual", "ν<sub>rO2</sub>", "M<sub>r</sub>·ν<sub>O2</sub>/M<sub>2</sub>", "r_O2", "kmol/kg", 6],
      [15, "N₂ rezidual", "ν<sub>rN2</sub>", "M<sub>r</sub>·ν<sub>N2</sub>/M<sub>2</sub>", "r_N2", "kmol/kg", 6],
      ["Compoziția amestecului la sfârșitul admisiei (vaporii de benzină socotiți ca aer)"],
      [16, "CO₂", "ν<sub>aCO2</sub>", "ν<sub>rCO2</sub>", "a_CO2", "kmol/kg", 6],
      [17, "H₂O", "ν<sub>aH2O</sub>", "ν<sub>rH2O</sub>", "a_H2O", "kmol/kg", 6],
      [18, "O₂", "ν<sub>aO2</sub>", "0,21·M<sub>1</sub> + ν<sub>rO2</sub>", "a_O2", "kmol/kg", 6],
      [19, "N₂", "ν<sub>aN2</sub>", "0,79·M<sub>1</sub> + ν<sub>rN2</sub>", "a_N2", "kmol/kg", 6],
      [20, "Total", "M<sub>a</sub>", "M<sub>1</sub> + M<sub>r</sub>", "M_a", "kmol/kg", 5],
      ["Temperatura, presiunea și coeficientul de umplere"],
      [21, "Temperatura încărcăturii la intrare", "T<sub>s</sub>+ΔT", "T<sub>s</sub> + ΔT", "T_in", "K", 1],
      [22, "Temperatura la sfârșitul admisiei", "T<sub>a</sub>", "(T<sub>s</sub>+ΔT+γ<sub>r</sub>·T<sub>r</sub>)/(1+γ<sub>r</sub>)", "T_a", "K", 2],
      [23, "Entalpia încărcăturii (bilanț)", "I<sub>a</sub>", "M<sub>1</sub>·i<sub>aer</sub>(T<sub>s</sub>+ΔT) + Σ ν<sub>rj</sub>·i<sub>j</sub>(T<sub>r</sub>)", "I_a", "kJ", 2],
      [24, "Temperatura din bilanțul entalpiilor", "T<sub>a</sub>′", "interpolare inversă (I<sub>a</sub>)", "T_a_h", "K", 2],
      [25, "Abaterea T<sub>a</sub>", "ΔT<sub>a</sub>", "|T<sub>a</sub>′−T<sub>a</sub>|/T<sub>a</sub>·100 (< 2 %)", "dT_a", "%", 2],
      [26, "Presiunea la sfârșitul admisiei", "p<sub>a</sub>", "ξ<sub>a</sub>·p<sub>s</sub>", "p_a", "MPa", 4],
      [27, "Coeficientul de umplere", "η<sub>v</sub>", "ε/(ε−1)·p<sub>a</sub>/p<sub>s</sub>·T<sub>s</sub>/(T<sub>a</sub>·(1+γ<sub>r</sub>))", "eta_v", "–", 4],
    ],
    Comprimare: [
      ["Căldura specifică molară medie a amestecului: C<sub>v</sub> = a + b·T (regresie 300…1000 K)"],
      [1, "Coeficientul a", "a", "regresie liniară, 300…1000 K", "a_1", "kJ/(kmol·K)", 4],
      [2, "Coeficientul b", "b", "regresie liniară, 300…1000 K", "b_1", "kJ/(kmol·K²)", 7],
      ["Exponentul politropic: n₁ = 1 + R/(a + b·T<sub>a</sub>·(ε<sup>n₁−1</sup>+1)) – iterații de punct fix"],
      [3, "Valoare inițială", "n₁<sup>(0)</sup>", "1,37", it("n1", 0), "–", 6],
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((j) => [3 + j, `Iterația ${j}`, `n₁<sup>(${j})</sup>`, "1 + R/(a + b·T<sub>a</sub>·(ε<sup>n−1</sup>+1))", it("n1", j), "–", 6]),
      [12, "Exponentul politropic al comprimării", "n₁", "n₁<sup>(8)</sup>", "n_1", "–", 5],
      [13, "Verificare: diferența membrilor", "Δ", "R/(n₁−1) − a − b·T<sub>a</sub>·(ε<sup>n₁−1</sup>+1)", "chk_n1", "kJ/(kmol·K)", "e"],
      ["Sfârșitul comprimării"],
      [14, "Presiunea", "p<sub>c</sub>", "p<sub>a</sub>·ε<sup>n₁</sup>", "p_c", "MPa", 4],
      [15, "Temperatura", "T<sub>c</sub>", "T<sub>a</sub>·ε<sup>n₁−1</sup>", "T_c", "K", 2],
      [16, "Energia internă a amestecului", "U<sub>c</sub>", "Σ ν<sub>aj</sub>·u<sub>j</sub>(T<sub>c</sub>)", "U_c", "kJ", 2],
    ],
    Ardere: [
      ["MAC: întârzierea la autoaprindere și fracțiunea arsă izocor (la MAS g<sub>v</sub> = 1)"],
      [1, "Volumul la începutul injecției, raportat la V<sub>c</sub>", "V<sub>inj</sub>/V<sub>c</sub>", "1+(ε−1)/2·[(1−cos β)+λ/4·(1−cos 2β)]", "v_inj", "–", 4],
      [2, "Presiunea la începutul injecției", "p<sub>inj</sub>", "p<sub>a</sub>·(ε/(V<sub>inj</sub>/V<sub>c</sub>))<sup>n₁</sup>", "p_inj", "MPa", 4],
      [3, "Temperatura la începutul injecției", "T<sub>inj</sub>", "T<sub>a</sub>·(ε/(V<sub>inj</sub>/V<sub>c</sub>))<sup>n₁−1</sup>", "T_inj", "K", 2],
      [4, "Întârzierea la autoaprindere (Wolfer)", "τ<sub>aa</sub>", "0,44·p<sup>−1,19</sup>·e<sup>4650/T</sup>, p în bar", "tau_aa", "ms", 4],
      [5, "Unghiul de întârziere", "θ<sub>aa</sub>", "6·n·τ<sub>aa</sub>·10⁻³", "th_aa", "°RAC", 2],
      [6, "Fracțiunea arsă izocor", "g<sub>v</sub>", "MAS: 1; MAC: min(θ<sub>aa</sub>/θ<sub>inj</sub>; 1)", "g_v", "–", 4],
      [7, "Fracțiunea arsă izobar", "g<sub>p</sub>", "1 − g<sub>v</sub>", "g_p", "–", 4],
      ["Compoziția după arderea izocoră (punctul y)"],
      [8, "CO₂", "ν<sub>yCO2</sub>", "g<sub>v</sub>·c/12 + ν<sub>rCO2</sub>", "y_CO2", "kmol/kg", 6],
      [9, "H₂O", "ν<sub>yH2O</sub>", "g<sub>v</sub>·h/2 + ν<sub>rH2O</sub>", "y_H2O", "kmol/kg", 6],
      [10, "O₂", "ν<sub>yO2</sub>", "0,21·L − g<sub>v</sub>·O<sub>t</sub> + ν<sub>rO2</sub>", "y_O2", "kmol/kg", 6],
      [11, "N₂", "ν<sub>yN2</sub>", "0,79·L + ν<sub>rN2</sub>", "y_N2", "kmol/kg", 6],
      [12, "Total", "M<sub>y</sub>", "Σ ν<sub>yj</sub>", "M_y", "kmol/kg", 5],
      ["Compoziția la sfârșitul arderii (punctul z = produse + reziduale)"],
      [13, "CO₂", "ν<sub>zCO2</sub>", "ν<sub>CO2</sub> + ν<sub>rCO2</sub>", "z_CO2", "kmol/kg", 6],
      [14, "H₂O", "ν<sub>zH2O</sub>", "ν<sub>H2O</sub> + ν<sub>rH2O</sub>", "z_H2O", "kmol/kg", 6],
      [15, "O₂", "ν<sub>zO2</sub>", "ν<sub>O2</sub> + ν<sub>rO2</sub>", "z_O2", "kmol/kg", 6],
      [16, "N₂", "ν<sub>zN2</sub>", "ν<sub>N2</sub> + ν<sub>rN2</sub>", "z_N2", "kmol/kg", 6],
      [17, "Total", "M<sub>z</sub>", "M<sub>2</sub> + M<sub>r</sub>", "M_z", "kmol/kg", 5],
      [18, "Coeficientul real de variație", "μ", "M<sub>z</sub>/(M<sub>1</sub>+M<sub>r</sub>)", "mu_r", "–", 4],
      ["Arderea izocoră (MAS: toată arderea)"],
      [19, "Energia internă în y", "U<sub>y</sub>", "U<sub>c</sub> + g<sub>v</sub>·ξ<sub>v</sub>·Q<sub>i</sub>", "U_y", "kJ", 2],
      [20, "Temperatura în y", "T<sub>y</sub>", "interpolare inversă (U<sub>y</sub>)", "T_y", "K", 2],
      [21, "Presiunea în y", "p<sub>y</sub>", "p<sub>c</sub>·M<sub>y</sub>/(M<sub>1</sub>+M<sub>r</sub>)·T<sub>y</sub>/T<sub>c</sub>", "p_y", "MPa", 4],
      [22, "Raportul de creștere a presiunii", "λ<sub>p</sub>", "p<sub>y</sub>/p<sub>c</sub>", "lam_p", "–", 4],
    ],
    ArdereP: [
      ["Arderea izobară (numai MAC; la MAS g<sub>p</sub> = 0 și T<sub>z</sub> = T<sub>y</sub>)"],
      [23, "Entalpia în y", "I<sub>y</sub>", "Σ ν<sub>yj</sub>·i<sub>j</sub>(T<sub>y</sub>)", "I_y", "kJ", 2],
      [24, "Entalpia în z", "I<sub>z</sub>", "I<sub>y</sub> + g<sub>p</sub>·ξ<sub>p</sub>·Q<sub>i</sub>", "I_z", "kJ", 2],
      [25, "Temperatura maximă a ciclului", "T<sub>z</sub>", "MAS: T<sub>y</sub>; MAC: interpolare inversă (I<sub>z</sub>)", "T_z", "K", 2],
      [26, "Presiunea maximă a ciclului de calcul", "p<sub>z</sub>", "p<sub>z</sub> = p<sub>y</sub>", "p_z", "MPa", 4],
      [27, "Raportul de destindere prealabilă", "ρ", "M<sub>z</sub>·T<sub>z</sub>/(M<sub>y</sub>·T<sub>y</sub>)", "rho", "–", 4],
      [28, "Presiunea maximă estimată a diagramei rotunjite", "p<sub>max</sub>", "MAS: 0,85·p<sub>z</sub>; MAC: p<sub>z</sub>", "p_max", "MPa", 4],
    ],
    Destindere: [
      ["Căldura specifică medie a produselor: C<sub>v</sub> = a′ + b′·T (regresie 900…2800 K)"],
      [1, "Coeficientul a′", "a′", "regresie liniară, 900…2800 K", "a_2", "kJ/(kmol·K)", 4],
      [2, "Coeficientul b′", "b′", "regresie liniară, 900…2800 K", "b_2", "kJ/(kmol·K²)", 7],
      [3, "Raportul de destindere", "δ", "ε/ρ", "delta", "–", 4],
      ["Exponentul politropic: n₂ = 1 + R/(a′ + b′·T<sub>z</sub>·(1 + δ<sup>1−n₂</sup>)) – iterații de punct fix"],
      [4, "Valoare inițială", "n₂<sup>(0)</sup>", "1,26", it("n2", 0), "–", 6],
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((j) => [4 + j, `Iterația ${j}`, `n₂<sup>(${j})</sup>`, "1 + R/(a′ + b′·T<sub>z</sub>·(1+δ<sup>1−n</sup>))", it("n2", j), "–", 6]),
      [13, "Exponentul politropic al destinderii", "n₂", "n₂<sup>(8)</sup>", "n_2", "–", 5],
      [14, "Presiunea la sfârșitul destinderii", "p<sub>b</sub>", "p<sub>z</sub>/δ<sup>n₂</sup>", "p_b", "MPa", 4],
      [15, "Temperatura la sfârșitul destinderii", "T<sub>b</sub>", "T<sub>z</sub>/δ<sup>n₂−1</sup>", "T_b", "K", 2],
      [16, "Temperatura gazelor reziduale (verificare)", "T<sub>r</sub>′", "T<sub>b</sub>/(p<sub>b</sub>/p<sub>r</sub>)<sup>1/3</sup>", "T_r_c", "K", 2],
      [17, "Abaterea T<sub>r</sub>", "ΔT<sub>r</sub>", "|T<sub>r</sub>′−T<sub>r</sub>|/T<sub>r</sub>·100 (≤ 5 %)", "dT_r", "%", 2],
    ],
    Performanțe: [
      ["Parametri indicați"],
      [1, "Presiunea medie indicată a ciclului de calcul", "p<sub>it</sub>", "p<sub>c</sub>/(ε−1)·[λ<sub>p</sub>(ρ−1)+λ<sub>p</sub>ρ/(n₂−1)(1−δ<sup>1−n₂</sup>)−1/(n₁−1)(1−ε<sup>1−n₁</sup>)]", "p_it", "MPa", 4],
      [2, "Presiunea medie indicată", "p<sub>i</sub>", "φ<sub>r</sub>·p<sub>it</sub> − (p<sub>r</sub> − p<sub>a</sub>)", "p_i", "MPa", 4],
      [3, "Randamentul indicat", "η<sub>i</sub>", "R·M<sub>1</sub>·T<sub>s</sub>·p<sub>i</sub>/(p<sub>s</sub>·η<sub>v</sub>·Q<sub>i</sub>)", "eta_i", "–", 4],
      [4, "Consumul specific indicat", "c<sub>i</sub>", "3,6·10⁶/(η<sub>i</sub>·Q<sub>i</sub>)", "c_i", "g/kWh", 1],
      ["Parametri efectivi"],
      [5, "Presiunea medie efectivă", "p<sub>e</sub>", "η<sub>m</sub>·p<sub>i</sub>", "p_e", "MPa", 4],
      [6, "Randamentul efectiv", "η<sub>e</sub>", "η<sub>m</sub>·η<sub>i</sub>", "eta_e", "–", 4],
      [7, "Consumul specific efectiv", "c<sub>e</sub>", "c<sub>i</sub>/η<sub>m</sub>", "c_e", "g/kWh", 1],
      [8, "Consumul orar", "C<sub>h</sub>", "c<sub>e</sub>·P<sub>e</sub>/1000", "C_h", "kg/h", 2],
      [9, "Puterea indicată", "P<sub>i</sub>", "P<sub>e</sub>/η<sub>m</sub>", "P_ind", "kW", 2],
      [10, "Cuplul la puterea nominală", "M<sub>P</sub>", "9549·P<sub>e</sub>/n<sub>P</sub>", "M_P", "N·m", 2],
      ["Parametri constructivi"],
      [11, "Cilindreea unitară", "V<sub>h</sub>", "30·τ·P<sub>e</sub>/(p<sub>e</sub>·n·i)", "V_h", "dm³", 4],
      [12, "Alezajul", "D", "(4·V<sub>h</sub>·10⁶/(π·ψ))<sup>1/3</sup>", "D_cil", "mm", 2],
      [13, "Cursa", "S", "ψ·D", "S_cil", "mm", 2],
      [14, "Raza manivelei", "R", "S/2", "R_man", "mm", 2],
      [15, "Lungimea bielei", "L<sub>b</sub>", "R/λ", "L_b", "mm", 2],
      [16, "Cilindreea totală", "V<sub>t</sub>", "i·V<sub>h</sub>", "V_t", "dm³", 4],
      [17, "Viteza medie a pistonului", "W<sub>m</sub>", "S·n/30000", "W_m", "m/s", 2],
      [18, "Puterea litrică", "P<sub>l</sub>", "P<sub>e</sub>/V<sub>t</sub>", "P_l", "kW/dm³", 2],
      ["Recalcul cu dimensiunile rotunjite (D și S rotunjite se pot impune în „Opțiuni”)"],
      [19, "Alezaj rotunjit", "D<sub>r</sub>", "valoare aleasă", "D_r", "mm", 1],
      [20, "Cursă rotunjită", "S<sub>r</sub>", "valoare aleasă", "S_r", "mm", 1],
      [21, "Puterea recalculată", "P<sub>e</sub>′", "p<sub>e</sub>·(π·D²/4)·S·i·n/(30·τ·10⁶)", "P_e_r", "kW", 2],
      [22, "Abaterea puterii", "ΔP<sub>e</sub>", "|P<sub>e</sub>′−P<sub>e</sub>|/P<sub>e</sub>·100 (≤ 5 %)", "dP_e", "%", 2],
    ],
  };

  const TABURI = ["Admisie", "Comprimare", "Ardere", "ArdereP", "Destindere", "Performanțe", "Diagrama", "Caracteristica", "Dimensiuni", "Verificări", "Tabele"];
  const ETICHETE = { Admisie: "2. Admisia", Comprimare: "3. Comprimarea", Ardere: "4. Arderea izocoră", ArdereP: "5. Arderea izobară", Destindere: "6. Destinderea",
    "Performanțe": "7. Parametrii indicați, efectivi și constructivi", Diagrama: "8. Diagrama indicată p–V", Caracteristica: "9. Indicatorii de performanță",
    Dimensiuni: "10. Recapitularea dimensiunilor", "Verificări": "11. Verificări și susținere", Tabele: "Anexa A · tabelele u, i" };

  // ---------------- Utilitare ----------------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function nr(v, d) {
    if (!Number.isFinite(v)) return "—";
    if (d === "e") return v.toExponential(2).replace(".", ",");
    return v.toLocaleString("ro-RO", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // ---------------- Formular ----------------
  let stare = citesteStare();
  let rezultat = null;
  let tabActiv = "Admisie";

  function citesteStare() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(CHEIE_STOCARE)); } catch (e) { s = null; }
    if (s && s.stare) s = s.stare;
    const baza = Object.assign({}, EXEMPLE[TIP_SHELL], OPT_IMPLICIT);
    return Object.assign(baza, s || {}, { tip: TIP_SHELL });
  }

  function salveazaStare() {
    if (window.PCMAI_SHELL) return; // salvarea o face aplicația de proiect (împreună cu tema)
    try { localStorage.setItem(CHEIE_STOCARE, JSON.stringify(stare)); } catch (e) { /* stocare indisponibilă */ }
  }

  function construiesteFormular() {
    const f = $("#formular");
    f.innerHTML = CAMPURI.map(([grup, campuri]) => `
      <fieldset><legend>${grup}</legend>
      ${campuri.map(([k, et, sim, um, doar]) => {
        const id = "c-" + k;
        const marcaj = doar === "MAS" ? '<span class="eticheta-tip">numai MAS</span>' : doar === "MAC" ? '<span class="eticheta-tip">numai MAC</span>' : "";
        const intrare = k === "tip"
          ? `<select id="${id}" name="${k}"><option value="MAS">MAS – aprindere prin scânteie</option><option value="MAC">MAC – aprindere prin comprimare</option></select>`
          : `<input id="${id}" name="${k}" type="number" step="any" inputmode="decimal"${doar === "opt" ? ' placeholder="automat"' : ""}>`;
        return `<div class="camp" data-doar="${doar || ""}">
          <label for="${id}">${et} ${marcaj}</label>
          <span class="simbol">${sim}</span>${intrare}<span class="um">${um}</span></div>`;
      }).join("")}
      </fieldset>`).join("");
    umpleFormular();
    f.addEventListener("input", (e) => {
      const el = e.target;
      if (!el.name) return;
      if (el.name === "tip") stare.tip = el.value;
      else stare[el.name] = el.value === "" ? "" : Number(el.value);
      actualizeaza();
    });
  }

  function umpleFormular() {
    for (const [, campuri] of CAMPURI) for (const [k] of campuri) {
      const el = $("#c-" + k);
      el.value = stare[k] === undefined || stare[k] === null ? "" : stare[k];
    }
    marcheazaTip();
  }

  function marcheazaTip() {
    document.querySelectorAll(".camp").forEach((c) => {
      const d = c.dataset.doar;
      c.classList.toggle("inactiv", (d === "MAS" || d === "MAC") && d !== stare.tip);
    });
  }

  // ---------------- Calcul și afișare ----------------
  function actualizeaza() {
    marcheazaTip();
    salveazaStare();
    const date = {};
    for (const [, campuri] of CAMPURI) for (const [k, , , , doar] of campuri) if (doar !== "opt") date[k] = k === "tip" ? stare.tip : Number(stare[k]);
    const lipsa = Object.entries(date).filter(([k, v]) => k !== "tip" && !Number.isFinite(v));
    const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    rezultat = lipsa.length ? null : calculeaza(date, { D_r: num(stare.D_r), S_r: num(stare.S_r), n_min: num(stare.n_min) || 1000, n_max: num(stare.n_max) });
    afiseazaSumar(lipsa);
    afiseazaTab();
    if (window.PCMAI_SHELL) PCMAI_SHELL.rezultat(stare, rezultat);
  }

  function afiseazaSumar(lipsa) {
    const s = $("#sumar");
    if (!rezultat) {
      s.innerHTML = `<div class="alerta">Completați toate datele de intrare (lipsesc: ${lipsa.map(([k]) => esc(k)).join(", ")}).</div>`;
      return;
    }
    const r = rezultat;
    const nok = r.verificari.filter((v) => !v.ok).length;
    const kpi = (et, v, um) => `<div class="kpi"><span class="kpi-et">${et}</span><span class="kpi-v">${v}</span><span class="kpi-um">${um}</span></div>`;
    let html = `<div class="kpiuri">
      ${kpi("p<sub>e</sub>", nr(r.p_e, 3), "MPa")}
      ${kpi("η<sub>e</sub>", nr(r.eta_e, 3), "–")}
      ${kpi("c<sub>e</sub>", nr(r.c_e, 1), "g/kWh")}
      ${kpi("D × S", nr(r.D_r, 1) + " × " + nr(r.S_r, 1), "mm")}
      ${kpi("V<sub>t</sub>", nr(r.V_t, 3), "dm³")}
      ${kpi("T<sub>z</sub>", nr(r.T_z, 0), "K")}
    </div>`;
    html += `<div class="stare ${nok ? "stare-atentie" : "stare-ok"}">${nok
      ? `${nok} ${nok === 1 ? "mărime iese" : "mărimi ies"} din valorile uzuale – vezi fila „Verificări”.`
      : "Toate verificările sunt în domeniu."}</div>`;
    if (r.dT_r > 5 && Number.isFinite(r.T_r_c)) {
      html += `<div class="alerta">ΔT<sub>r</sub> = ${nr(r.dT_r, 2)} % > 5 %. Se reia calculul cu T<sub>r</sub> = T<sub>r</sub>′ = ${nr(r.T_r_c, 1)} K.
        <button type="button" id="btn-tr">Preia T<sub>r</sub>′ și recalculează</button></div>`;
    }
    if (r.avert.length) html += `<div class="alerta">${[...new Set(r.avert)].map(esc).join("<br>")}</div>`;
    s.innerHTML = html;
    const b = $("#btn-tr");
    if (b) b.addEventListener("click", () => { stare.T_r = Math.round(r.T_r_c); umpleFormular(); actualizeaza(); });
  }

  function construiesteTaburi() {
    const t = $("#taburi");
    t.innerHTML = TABURI.map((n) => `<button type="button" role="tab" data-tab="${n}">${ETICHETE[n] || n}</button>`).join("");
    t.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-tab]");
      if (!b) return;
      tabActiv = b.dataset.tab;
      afiseazaTab();
    });
  }

  function afiseazaTab() {
    document.querySelectorAll("#taburi button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tabActiv));
    const c = $("#continut");
    if (!rezultat) { c.innerHTML = ""; return; }
    if (FOI[tabActiv]) c.innerHTML = tabelFoaie(FOI[tabActiv]);
    else if (tabActiv === "Verificări") c.innerHTML = tabelVerificari();
    else if (tabActiv === "Diagrama") c.innerHTML = vedereDiagrama();
    else if (tabActiv === "Caracteristica") c.innerHTML = vedereCaracteristica();
    else if (tabActiv === "Tabele") c.innerHTML = vedereTabele();
    else if (tabActiv === "Dimensiuni") c.innerHTML = window.PCMAI_SHELL ? PCMAI_SHELL.dimensiuni(rezultat) : "";
  }

  function valoare(r, v) { return typeof v === "function" ? v(r) : r[v]; }

  function tabelFoaie(randuri) {
    const r = rezultat;
    return `<div class="tabel-container"><table class="tabel">
      <thead><tr><th>Nr.</th><th>Mărime</th><th>Simbol</th><th>Relație</th><th class="num">Valoare</th><th>Unitate</th></tr></thead>
      <tbody>${randuri.map((x) => x.length === 1
        ? `<tr class="sectiune"><td colspan="6">${x[0]}</td></tr>`
        : `<tr><td class="nr">${x[0]}</td><td>${x[1]}</td><td class="sim">${x[2]}</td><td class="rel">${x[3]}</td><td class="num">${nr(valoare(r, x[4]), x[6])}</td><td>${x[5]}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  function tabelVerificari() {
    const r = rezultat;
    const tip = r.date.tip;
    return `<p class="nota">Valorile-limită sunt orientative (Tabelele 1.1, 6.1 și capitolele 3–5 din îndrumar); o valoare „verificați” trebuie justificată sau corectată prin parametrii inițiali. Limitele afișate sunt cele pentru ${tip}.</p>
      <div class="tabel-container"><table class="tabel">
      <thead><tr><th>Mărime</th><th class="num">Valoare</th><th class="num">Min</th><th class="num">Max</th><th>Rezultat</th></tr></thead>
      <tbody>${r.verificari.map((v) => {
        const d = Math.abs(v.valoare) >= 100 ? 1 : Math.abs(v.valoare) >= 10 ? 2 : 3;
        return `<tr><td>${v.eticheta}</td><td class="num">${nr(v.valoare, d)}</td><td class="num">${nr(v.min, d === 1 ? 0 : 2)}</td><td class="num">${nr(v.max, d === 1 ? 0 : 2)}</td>
          <td><span class="insigna ${v.ok ? "ok" : "atentie"}">${v.ok ? "în domeniu" : "verificați"}</span></td></tr>`;
      }).join("")}</tbody></table></div>`;
  }

  function vedereDiagrama() {
    const r = rezultat;
    const pV = grafic({ titlu: "Diagrama p–V (ciclul de calcul)", xEt: "V [cm³]", yEt: "p [MPa]",
      serii: [{ nume: "p–V", puncte: r.diagrama.map((d) => [d.V, d.p]) }] });
    const pa = grafic({ titlu: "Diagrama p–α", xEt: "α [°RAC]", yEt: "p [MPa]", xMax: 720, xPas: 90,
      serii: [{ nume: "p–α", puncte: r.diagrama.map((d) => [d.alfa, d.p]) }] });
    return `<p class="nota">V<sub>c</sub> = ${nr(r.V_c, 2)} cm³ · V<sub>a</sub> = ${nr(r.V_a, 2)} cm³ · V<sub>z</sub> = ${nr(r.V_z, 2)} cm³. Rotunjirea diagramei se face conform cap. 8 din îndrumar (fazele distribuției: dsa ${r.date.dsa}°, îsa ${r.date.isa}°, dse ${r.date.dse}°, îse ${r.date.ise}°; avans ${r.date.beta}° RAC).</p>
      <div class="grafice">${pV}${pa}</div>
      <details><summary>Tabelul p–V și p–α (din 5 în 5 °RAC)</summary>
      <div class="tabel-container"><table class="tabel compact">
      <thead><tr><th class="num">α [°RAC]</th><th class="num">V [cm³]</th><th class="num">p ciclu de calcul [MPa]</th><th>Proces</th></tr></thead>
      <tbody>${r.diagrama.map((d) => `<tr><td class="num">${d.alfa}</td><td class="num">${nr(d.V, 2)}</td><td class="num">${nr(d.p, 4)}</td><td>${d.proces}</td></tr>`).join("")}</tbody>
      </table></div></details>`;
  }

  function vedereCaracteristica() {
    const r = rezultat;
    const c = r.caracteristica;
    const g1 = grafic({ titlu: "Caracteristica exterioară", xEt: "n [rot/min]", yEt: "P<sub>e</sub> [kW], M<sub>e</sub> [N·m]",
      serii: [{ nume: "P<sub>e</sub> [kW]", puncte: c.map((x) => [x.n, x.Pe]) }, { nume: "M<sub>e</sub> [N·m]", puncte: c.map((x) => [x.n, x.Me]) }] });
    const g2 = grafic({ titlu: "Consumul specific efectiv", xEt: "n [rot/min]", yEt: "c<sub>e</sub> [g/kWh]",
      serii: [{ nume: "c<sub>e</sub>", puncte: c.map((x) => [x.n, x.ce]) }] });
    return `<p class="nota">Relațiile Leiderman: a = ${nr(r.k_a, 2)}, b = ${nr(r.k_b, 2)}, c = ${nr(r.k_c, 2)}, A = B = ${nr(r.k_cons, 2)}
      (MAS: a = b = c = 1, A = B = 1,2; MAC cu injecție directă: 0,87; 1,13; 1; A = B = 1,55).</p>
      <div class="kpiuri">
        <div class="kpi"><span class="kpi-et">Cuplul maxim</span><span class="kpi-v">${nr(r.M_max, 1)}</span><span class="kpi-um">N·m la ${nr(r.n_Mmax, 0)} rot/min</span></div>
        <div class="kpi"><span class="kpi-et">Elasticitate M<sub>max</sub>/M<sub>P</sub></span><span class="kpi-v">${nr(r.elasticitate, 3)}</span><span class="kpi-um">–</span></div>
        <div class="kpi"><span class="kpi-et">c<sub>e</sub> minim</span><span class="kpi-v">${nr(r.ce_min, 1)}</span><span class="kpi-um">g/kWh</span></div>
      </div>
      <div class="grafice">${g1}${g2}</div>
      <div class="tabel-container"><table class="tabel compact">
      <thead><tr><th class="num">n [rot/min]</th><th class="num">x = n/n<sub>P</sub></th><th class="num">P<sub>e</sub> [kW]</th><th class="num">M<sub>e</sub> [N·m]</th><th class="num">c<sub>e</sub> [g/kWh]</th><th class="num">C<sub>h</sub> [kg/h]</th></tr></thead>
      <tbody>${c.map((x) => `<tr><td class="num">${nr(x.n, 0)}</td><td class="num">${nr(x.x, 3)}</td><td class="num">${nr(x.Pe, 2)}</td><td class="num">${nr(x.Me, 2)}</td><td class="num">${nr(x.ce, 1)}</td><td class="num">${nr(x.Ch, 2)}</td></tr>`).join("")}</tbody>
      </table></div>`;
  }

  function vedereTabele() {
    const r = rezultat;
    const T = window.PCMAI.TABELE;
    const am = r.amestecuri;
    return `<p class="nota">Energia internă u și entalpia i molare [kJ/kmol], originea la 0 K (polinoame NASA – GRI-Mech 3.0; H(298)−H(0) din tabelele JANAF), grilă din 50 în 50 K (Anexa A din îndrumar).</p>
      <details open><summary>Tabelele u, i ale gazelor</summary><div class="tabel-container"><table class="tabel compact">
      <thead><tr><th class="num">T [K]</th><th class="num">u CO₂</th><th class="num">u H₂O</th><th class="num">u O₂</th><th class="num">u N₂</th><th class="num">i CO₂</th><th class="num">i H₂O</th><th class="num">i O₂</th><th class="num">i N₂</th></tr></thead>
      <tbody>${T.map((t) => `<tr>${t.map((v, j) => `<td class="num">${nr(v, j ? 1 : 0)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>
      <details><summary>Amestecuri – u și i ale amestecurilor pentru tema curentă [kJ, pentru 1 kg combustibil]</summary>
      <p class="nota">T<sub>a</sub>′ = ${nr(r.T_a_h, 2)} K (din I<sub>a</sub>) · T<sub>y</sub> = ${nr(r.T_y, 2)} K (din U<sub>y</sub>) · T<sub>z</sub> = ${nr(r.T_z, 2)} K (din I<sub>z</sub>)</p>
      <div class="tabel-container"><table class="tabel compact">
      <thead><tr><th class="num">T [K]</th><th class="num">I<sub>a</sub></th><th class="num">U<sub>a</sub></th><th class="num">U<sub>y</sub></th><th class="num">I<sub>y</sub></th><th class="num">I<sub>z</sub></th><th class="num">U<sub>z</sub></th><th class="num">c<sub>v,a</sub></th><th class="num">c<sub>v,z</sub></th></tr></thead>
      <tbody>${am.temp.map((t, k) => `<tr><td class="num">${t}</td>${["I_a", "U_a", "U_y", "I_y", "I_z", "U_z"].map((c) => `<td class="num">${nr(am[c][k], 1)}</td>`).join("")}<td class="num">${nr(am.cv_a[k], 3)}</td><td class="num">${nr(am.cv_z[k], 3)}</td></tr>`).join("")}</tbody>
      </table></div></details>`;
  }

  // ---------------- Grafice SVG ----------------
  function scara(min, max, n) {
    if (min === max) { min -= 1; max += 1; }
    const brut = (max - min) / n;
    const p = Math.pow(10, Math.floor(Math.log10(brut)));
    const pas = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= brut);
    return { min: Math.floor(min / pas) * pas, max: Math.ceil(max / pas) * pas, pas };
  }

  function grafic({ titlu, xEt, yEt, serii, xMax, xPas }) {
    const W = 560, H = 340, m = { s: 62, d: 16, sus: 34, jos: 46 };
    const toate = serii.flatMap((s) => s.puncte).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (!toate.length) return "";
    const xs = toate.map((p) => p[0]), ys = toate.map((p) => p[1]);
    const sx = xMax ? { min: 0, max: xMax, pas: xPas } : scara(Math.min(...xs), Math.max(...xs), 6);
    const sy = scara(Math.min(0, ...ys), Math.max(...ys), 6);
    const X = (v) => m.s + ((v - sx.min) / (sx.max - sx.min)) * (W - m.s - m.d);
    const Y = (v) => H - m.jos - ((v - sy.min) / (sy.max - sy.min)) * (H - m.sus - m.jos);
    const fx = (v) => Number(v.toFixed(6)).toLocaleString("ro-RO", { maximumFractionDigits: 3 });
    let g = "";
    for (let v = sx.min; v <= sx.max + 1e-9; v += sx.pas) g += `<line class="grila" x1="${X(v)}" x2="${X(v)}" y1="${m.sus}" y2="${H - m.jos}"/><text class="ax" x="${X(v)}" y="${H - m.jos + 16}" text-anchor="middle">${fx(v)}</text>`;
    for (let v = sy.min; v <= sy.max + 1e-9; v += sy.pas) g += `<line class="grila" x1="${m.s}" x2="${W - m.d}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${m.s - 6}" y="${Y(v) + 4}" text-anchor="end">${fx(v)}</text>`;
    const linii = serii.map((s, j) => `<polyline class="serie serie-${j}" points="${s.puncte.filter((p) => Number.isFinite(p[1])).map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}"/>`).join("");
    const legenda = serii.length > 1 ? `<div class="legenda">${serii.map((s, j) => `<span><i class="serie-${j}"></i>${s.nume}</span>`).join("")}</div>` : "";
    return `<figure class="grafic"><figcaption>${titlu}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titlu.replace(/<[^>]+>/g, ""))}">
        ${g}<line class="axa" x1="${m.s}" x2="${W - m.d}" y1="${H - m.jos}" y2="${H - m.jos}"/><line class="axa" x1="${m.s}" x2="${m.s}" y1="${m.sus}" y2="${H - m.jos}"/>
        ${linii}
        <text class="ax-titlu" x="${(W + m.s) / 2}" y="${H - 8}" text-anchor="middle">${xEt.replace(/<sub>(.*?)<\/sub>/g, "$1")}</text>
        <text class="ax-titlu" transform="translate(14 ${(H - m.jos + m.sus) / 2}) rotate(-90)" text-anchor="middle">${yEt.replace(/<sub>(.*?)<\/sub>/g, "$1")}</text>
      </svg>${legenda}</figure>`;
  }

  // ---------------- Export CSV ----------------
  function exportCSV() {
    if (!rezultat) return;
    const r = rezultat;
    const curat = (s) => String(s).replace(/<sub>|<\/sub>|<sup>|<\/sup>/g, "").replace(/"/g, '""');
    const n = (v) => (Number.isFinite(v) ? String(v).replace(".", ",") : "");
    const linii = [];
    linii.push(["Date de intrare"], ["Mărime", "Simbol", "Valoare", "Unitate"]);
    for (const [, campuri] of CAMPURI) for (const [k, et, sim, um] of campuri) linii.push([et, sim, k === "tip" ? stare.tip : n(Number(stare[k])), um]);
    for (const foaie of Object.keys(FOI)) {
      linii.push([], [foaie], ["Nr.", "Mărime", "Simbol", "Relație", "Valoare", "Unitate"]);
      for (const x of FOI[foaie]) linii.push(x.length === 1 ? [x[0]] : [x[0], x[1], x[2], x[3], n(valoare(r, x[4])), x[5]]);
    }
    linii.push([], ["Verificări"], ["Mărime", "Valoare", "Min", "Max", "Rezultat"]);
    r.verificari.forEach((v) => linii.push([v.eticheta, n(v.valoare), n(v.min), n(v.max), v.ok ? "în domeniu" : "verificați"]));
    linii.push([], ["Diagrama indicată"], ["α [°RAC]", "V [cm³]", "p [MPa]", "Proces"]);
    r.diagrama.forEach((d) => linii.push([d.alfa, n(d.V), n(d.p), d.proces]));
    linii.push([], ["Caracteristica exterioară"], ["n [rot/min]", "x", "Pe [kW]", "Me [N·m]", "ce [g/kWh]", "Ch [kg/h]"]);
    r.caracteristica.forEach((c) => linii.push([n(c.n), n(c.x), n(c.Pe), n(c.Me), n(c.ce), n(c.Ch)]));
    linii.push(["Cuplul maxim [N·m]", n(r.M_max)], ["la turația [rot/min]", n(r.n_Mmax)], ["Elasticitate", n(r.elasticitate)], ["c_e minim [g/kWh]", n(r.ce_min)]);
    const csv = "﻿" + linii.map((l) => l.map((c) => `"${curat(c)}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `calcul_termic_${stare.tip}_${stare.P_nom}kW_${stare.n_P}rpm.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // ---------------- Pornire ----------------
  construiesteFormular();
  construiesteTaburi();
  document.querySelectorAll("[data-exemplu]").forEach((b) => b.addEventListener("click", () => {
    stare = Object.assign({}, EXEMPLE[b.dataset.exemplu], OPT_IMPLICIT);
    umpleFormular();
    actualizeaza();
  }));
  $("#btn-csv").addEventListener("click", exportCSV);
  // La tipărire se afișează toate filele, una după alta, cu tabelele desfăcute
  window.addEventListener("beforeprint", () => {
    if (!rezultat) return;
    const activ = tabActiv;
    $("#continut").innerHTML = TABURI.map((t) => {
      tabActiv = t;
      afiseazaTab();
      return `<section class="foaie-tipar"><h2>${ETICHETE[t] || t}</h2>${$("#continut").innerHTML}</section>`;
    }).join("").replace(/<details>/g, "<details open>");
    tabActiv = activ;
  });
  window.addEventListener("afterprint", afiseazaTab);
  $("#btn-print").addEventListener("click", () => window.print());
  actualizeaza();
})();
