/* Formulele mărimilor calculate din tabelele determinărilor (tooltipurile cerute de specificația UX v2.0).
   FORMULE_TABELE[cod lucrare][id tabel][cheie coloană] = formula (HTML) sau { cheie rând: formula }.
   Coloanele de interpretare (concluzie, referință, observații) primesc criteriul după care se completează. */
"use strict";
const FORMULE_TABELE = {
  /* ============================================================ Diagnosticarea autovehiculelor */
  "da-l1": {
    t15: {
      calc: { uhd: "U<sub>diff</sub> = U<sub>CAN-H</sub> − U<sub>CAN-L</sub> (bit dominant; normal ≈ 2 V, admis 1,5…3 V)", tbit: "f<sub>bit</sub> = 1 / t<sub>bit</sub>  (t<sub>bit</sub> = 2 µs → 500 kbit/s)",
        R: "Cu o terminare suplimentară R<sub>x</sub> = 120 Ω în paralel: R<sub>supl</sub> = R·R<sub>x</sub> / (R + R<sub>x</sub>)" },
      ref: "Valorile de referință ale magistralei CAN de mare viteză (ISO 11898-2): două terminări de 120 Ω în paralel (≈ 60 Ω), U<sub>CAN-H</sub> ≈ 3,5 V și U<sub>CAN-L</sub> ≈ 1,5 V pe bitul dominant, ≈ 2,5 V pe cel recesiv"
    },
    t16: { dU: "ΔU = U<sub>0</sub> − U<sub>s</sub>  (căderea de tensiune pe contact sub sarcină)", Rc: "R<sub>c</sub> = ΔU / I  (1.6); contact bun: R<sub>c</sub> ≤ 0,01 Ω" }
  },
  "da-l2": {
    t21: {
      calc: { ckp: "n = 60·f / z  [rot/min], cu z = 60 de dinți (roata 60−2) → n = 60·f / 60", ect: "R = R<sub>p</sub>·U / (U<sub>ref</sub> − U);  T = 1 / [1/T<sub>25</sub> + ln(R/R<sub>25</sub>)/B] − 273,15  (R<sub>25</sub> = 2,5 kΩ, B = 3450 K)",
        iat: "R = R<sub>p</sub>·U / (U<sub>ref</sub> − U);  T = 1 / [1/T<sub>25</sub> + ln(R/R<sub>25</sub>)/B] − 273,15  (R<sub>25</sub> = 2,5 kΩ, B = 3450 K)", map: "p = a·U + b  (caracteristica liniară obținută prin regresie din Tabelul 2.2)" },
      ref: "Valorile tipice ale senzorilor motorului K7J (documentația constructorului): rezistență, tensiune de ieșire și frecvență la regimul indicat"
    },
    t23: { f: "f<sub>λ</sub> = N / (2·Δt)  (N comutări numărate în Δt = 10 s; o perioadă = două comutări). Sondă bună: f ≥ 0,5 Hz",
      k: "k<sub>tot</sub> = (1 + STFT/100)·(1 + LTFT/100)  (2.7); admis 0,9…1,1" }
  },
  "da-l3": {
    t31: { dI: "ΔI = I<sub>max</sub> − I<sub>0</sub>  (vârful curentului de antrenare pe cilindru față de curentul de bază)", crel: "c<sub>rel</sub> = ΔI<sub>i</sub> / ΔI<sub>max</sub> · 100 %;  sub 90 % → compresie scăzută la cilindrul respectiv" },
    t32: { d: "δ<sub>i</sub> = (p<sub>max</sub> − p<sub>i</sub>) / p<sub>max</sub> · 100 %  (test uscat); admis ≤ 10 %", cr: "Creștere = (p<sub>umed</sub> − p<sub>uscat</sub>) / p<sub>uscat</sub> · 100 %;  > 10 % → etanșare slabă la segmenți" },
    t33: { L: "L = (p<sub>intrare</sub> − p<sub>cilindru</sub>) / p<sub>intrare</sub> · 100 %  (pierderea de aer)", ev: "L < 10 % foarte bine · 10…20 % acceptabil · 20…30 % uzură avansată · > 30 % defect" },
    t34: { dp: "Δp = (p<sub>atm</sub> − p) / 100  [bar], cu p în kPa (depresiunea din colectorul de admisie)", int: "Interpretarea comportării acului vacuummetrului (stabil, oscilant, căderi periodice)" }
  },
  "da-l4": {
    t41: { dif: { contact: "p<sub>r</sub> − p<sub>col</sub>/100  [bar] (p<sub>col</sub> în kPa): presiunea relativă față de colector", ralanti: "p<sub>r</sub> − p<sub>col</sub>/100  [bar]: regulatorul menține diferența constantă", faravac: "p<sub>r</sub> − p<sub>col</sub>/100  [bar] cu furtunul de vacuum scos", debit: "Q<sub>p</sub> = V / t  [l/min] (volum colectat în timp de 1 min)" },
      presc: "Valoarea prescrisă de constructor pentru sistemul MPI cu regulator pe rampă", concl: "Comparația valorii măsurate cu cea prescrisă" },
    t42: { lamC: "Relația Brettschneider (4.4): λ = [CO<sub>2</sub> + CO/2 + O<sub>2</sub> + (H<sub>cv</sub>/4 · 3,5/(3,5 + CO/CO<sub>2</sub>) − O<sub>cv</sub>/2)·(CO<sub>2</sub> + CO)] / [(1 + H<sub>cv</sub>/4 − O<sub>cv</sub>/2)·(CO<sub>2</sub> + CO + K<sub>1</sub>·HC)];  H<sub>cv</sub> = 1,7261, O<sub>cv</sub> = 0,0176, K<sub>1</sub> = 6·10<sup>−4</sup> (HC în ppm, restul în % vol)" },
    t43: { lamC: "Relația Brettschneider (4.4), cu valorile CO, CO<sub>2</sub>, HC, O<sub>2</sub> măsurate la proba provocată" }
  },
  "da-l5": {
    t51: { dp: "Δp<sub>r</sub> = p<sub>comandat</sub> − p<sub>real</sub>  [bar]; admis ± 30 bar (± 50 bar la pornire)", concl: "|Δp<sub>r</sub>| în limită → presiune corectă; altfel aer / filtru, pompa de înaltă presiune, IMV sau un injector cu retur mare" },
    t52: { r: "r<sub>i</sub> = V<sub>i</sub> / V<sub>med</sub>, cu V<sub>med</sub> = (V<sub>1</sub> + V<sub>2</sub> + V<sub>3</sub> + V<sub>4</sub>)/4;  r > 1,5 → injector cu retur excesiv" },
    t53: { obs: { "*": "Valoarea de referință din îndrumar pentru supapa EGR electrică a motorului 1.5 dCi", x: "x<sub>EGR</sub> = (ṁ<sub>a0</sub> − ṁ<sub>aE</sub>) / ṁ<sub>a0</sub> · 100 %  (scăderea debitului de aer la deschiderea supapei EGR)" } },
    t54: { obs: "Valorile de referință pentru filtrul de particule (Δp, funingine, distanța între regenerări)" },
    t55: { ref: "Limitele legale / ale constructorului (opacitate Euro 6, concentrația AdBlue, dozarea, eficiența SCR)", concl: { "*": "Comparația valorii măsurate cu limita din coloana Referință", nox25d: "η<sub>SCR</sub> = (NO<sub>x,amonte</sub> − NO<sub>x,aval</sub>) / NO<sub>x,amonte</sub> · 100 %", noxRd: "η<sub>SCR</sub> = (NO<sub>x,amonte</sub> − NO<sub>x,aval</sub>) / NO<sub>x,amonte</sub> · 100 %", k3: "k<sub>med</sub> = media celor trei accelerări libere; Euro 6 ≤ 0,7 m<sup>−1</sup>" } }
  },
  "da-l6": {
    t61: { ref: "Valorile de referință ale alimentării modulului ABS/ESP", concl: "Comparația valorii măsurate cu referința" },
    t62: { vr: "v<sub>r</sub> = 3,6 · π · d<sub>d</sub> · f / z  [km/h];  d<sub>d</sub> = 0,594 m, z = 48 (dinți / perechi de poli ai inelului)", concl: "Rezistența bobinei (700…1400 Ω la senzorii pasivi), diferența v<sub>r</sub> − v<sub>tester</sub> ≤ 0,6 km/h și roata afișată la rotire" },
    t63: { ref: "Valorile în repaus ale senzorilor ESP (vehicul oprit, pe orizontală)" },
    t64: { obs: { "*": "Condiția sau procedura de calibrare", alfa: "y(50 m) = 50 · tan α  [m] – abaterea laterală a fasciculului camerei la 50 m" } }
  },
  "da-l7": {
    t72: { u: "Unitatea de măsură a mărimii afișate de BMS", obs: { "*": "Interpretarea valorii citite cu testerul din BMS", energU: "SOH = E<sub>utilă</sub> / E<sub>nominală</sub> · 100 %", umin: "ΔU = (U<sub>max</sub> − U<sub>min</sub>) · 1000  [mV]; > 40 mV → dispersie mare între grupurile de celule", tmax: "ΔT = T<sub>max</sub> − T<sub>min</sub>; > 8 °C → răcire neuniformă", riso: "Se compară cu R<sub>iso,min</sub> = 100 Ω/V · U<sub>n</sub>", u12: "U<sub>12 V</sub> < 11,8 V → bateria de 12 V descărcată" } },
    t73: { soh: "SOH = E<sub>utilă</sub> / E<sub>nominală</sub> · 100 %", req: "Cerința Euro 7 de durabilitate: 80 % până la 5 ani / 100 000 km; 72 % până la 8 ani / 160 000 km", risomin: "R<sub>iso,min</sub> = 100 Ω/V · U<sub>n</sub>  (ex. 400 V → 40 kΩ)", concl: "SOH ≥ cerința Euro 7 și R<sub>iso</sub> ≥ R<sub>iso,min</sub>" }
  },
  /* ============================================================ Mecatronica automobilului modern I */
  "mam1-l1": {
    t12: { Nc: "N = ⌊U · 2<sup>10</sup> / U<sub>ref</sub>⌋ = ⌊U · 1024 / 5⌋  (ADC pe 10 biți, U<sub>ref</sub> = 5 V)", ab: "Abatere = N<sub>citit</sub> − N<sub>calculat</sub>  [LSB]; admis ± 2 LSB" },
    t12b: { Nc: "N = ⌊U · 2<sup>12</sup> / U<sub>ref</sub>⌋ = ⌊U · 4096 / 3,3⌋  (ADC pe 12 biți, U<sub>ref</sub> = 3,3 V)", ab: "Abatere = N<sub>citit</sub> − N<sub>calculat</sub>  [LSB]" },
    t13: { dcc: "DC = (OCR + 1) / (TOP + 1) · 100 %, TOP = 799;  analogWrite(128): DC = 128/255 · 100 %", umc: "U<sub>med</sub> = DC · U<sub>alim</sub> = DC/100 · 5 V" }
  },
  "mam1-l2": {
    t21: { Uc: "U<sub>out</sub> = U<sub>in</sub> · R<sub>2</sub> / (R<sub>1</sub> + R<sub>2</sub>)  (divizorul de tensiune)", ab: "Abatere = (U<sub>măs</sub> − U<sub>calc</sub>) / U<sub>calc</sub> · 100 %" },
    t22: { A: "A = 20 · lg(U<sub>out</sub> / U<sub>in</sub>)  [dB]", Ac: "A = −10 · lg[1 + (f/f<sub>c</sub>)<sup>2</sup>], f<sub>c</sub> = 1/(2πRC) = 159,15 Hz  (filtrul RC trece-jos de ordinul 1)" },
    t23: { fac: "f<sub>a</sub> = |f − k·f<sub>s</sub>|, k = round(f / f<sub>s</sub>), f<sub>s</sub> = 1000 Hz  (frecvența aparentă prin aliere)" },
    t24: { red: "Reducerea zgomotului σ<sub>0</sub>/σ; teoretic: medie mobilă √n, filtru exponențial √((2 − α)/α)", delc: "Întârzierea până la 63 % dintr-o treaptă: medie mobilă ⌈0,632·n⌉·T<sub>s</sub>; exponențial ⌈ln 0,368 / ln(1 − α)⌉·T<sub>s</sub>, T<sub>s</sub> = 10 ms" }
  },
  "mam1-l3": {
    t31: { teta: "θ = 0,6° · s  (s = numărul pașilor motorului clapetei)", dU: "ΔU = |U<sub>1</sub> − 2·U<sub>2</sub>|  (pistele redundante: U<sub>2</sub> = U<sub>1</sub>/2)", Ureg: "U<sub>1,reg</sub> = a + k·s  (dreapta de regresie a pistei 1)", ab: "Abatere = (U<sub>1</sub> − U<sub>1,reg</sub>) · 1000  [mV] (neliniaritatea pistei)" },
    t32: { dU: "ΔU = |U<sub>1</sub> − 2·U<sub>2</sub>|; peste pragul de plauzibilitate ε → defect de pistă" }
  },
  "mam1-l4": {
    t42: { tt: "ϑ(τ) = ϑ<sub>0</sub> + 0,632 · (ϑ<sub>∞</sub> − ϑ<sub>0</sub>)  – temperatura atinsă după o constantă de timp", t95: "t<sub>95</sub> ≈ 3τ  (timpul până la 95 % din saltul de temperatură)" },
    t43: { rc: "R<sub>NTC</sub> = R<sub>p</sub> · U<sub>s</sub> / (U<sub>ref</sub> − U<sub>s</sub>), R<sub>p</sub> = 10 kΩ", tb: "ϑ = 1 / [1/T<sub>25</sub> + ln(R/R<sub>25</sub>)/B] − 273,15;  R<sub>25</sub> = 2,5 kΩ, B = 3450 K", ttab: "ϑ prin interpolare în tabelul R–ϑ al senzorului (catalog)" }
  },
  "mam1-l5": {
    t51: { pabs: "p<sub>abs</sub> = p<sub>atm</sub> + p<sub>rel</sub>  [kPa]", ureg: "U = a·p<sub>abs</sub> + b  (caracteristica obținută prin regresie)", ab: "Abatere = (U<sub>măs</sub> − U<sub>reg</sub>) · 1000  [mV]" },
    t53: { err: "Eroare = p<sub>senzor</sub> − p<sub>etalon</sub>  [kPa]", rhoc: "ρ = p / (R<sub>a</sub>·T) = p·1000 / [287 · (ϑ + 273,15)]  [kg/m³], p în kPa" }
  },
  /* ============================================================ Mecanica fluidelor */
  "mf-l1": {
    t11: { r15: "ρ<sub>15</sub> = ρ<sub>t</sub> / [1 − α·(t − 15)], α = 0,00065 K<sup>−1</sup>  (aducerea densității citite la 15 °C)", cat: "Densitatea la 15 °C din fișa tehnică a uleiului" },
    t12: { tm: "t<sub>m</sub> = (t<sub>1</sub> + t<sub>2</sub> + t<sub>3</sub>) / 3", disp: "Dispersia = (t<sub>max</sub> − t<sub>min</sub>) / t<sub>m</sub> · 100 %; cerut ≤ 0,5 %" },
    t13: { rho: "ρ<sub>l</sub> = ρ<sub>15</sub> · [1 − α·(T − 15)]", eta: "η = K · (ρ<sub>b</sub> − ρ<sub>l</sub>) · t<sub>m</sub>  [mPa·s] (vâscozimetrul Höppler)", nu: "ν = η / ρ<sub>l</sub>  [mm²/s]",
      cat: "ν din catalog, prin relația Walther: lg lg(ν + 0,7) = A − B·lg T, A și B din ν<sub>40</sub> și ν<sub>100</sub>", ab: "Abatere = (ν / ν<sub>catalog</sub> − 1) · 100 %" }
  },
  "mf-l2": {
    t22: { dV: "ΔV = n · a<sub>r</sub>, a<sub>r</sub> = π·d²/4 · s  (n rotații ale pistonului cu șurub)", Km: "K<sub>m</sub> = V<sub>0</sub> · Δp / ΔV  (modulul aparent, cu deformarea cilindrului)",
      K: "1/K = 1/K<sub>m</sub> − D/(E·e)  (corecția deformării elastice a cilindrului de diametru D, perete e, modul E)", h: "Histerezis = (n<sub>încărcare</sub> − n<sub>descărcare</sub>) · a<sub>r</sub>" },
    t23: { tot: "ΔV<sub>total</sub> = n · a<sub>r</sub>", liq: "ΔV<sub>lichid</sub> = V<sub>0</sub> · p / K<sub>m</sub>", aer: "ΔV<sub>aer</sub> = ΔV<sub>total</sub> − ΔV<sub>lichid</sub>",
      calc: "Legea Boyle–Mariotte (izoterm): ΔV<sub>a</sub> = V<sub>a0</sub> · [1 − p<sub>atm</sub> / (p<sub>atm</sub> + p)]", ab: "Abatere = (ΔV<sub>aer</sub> − ΔV<sub>a,calc</sub>) / ΔV<sub>a,calc</sub> · 100 %" }
  },
  "mf-l3": {
    t31: { dp: "Δp<sub>1−2</sub> = (1 − p<sub>2</sub>/p<sub>1</sub>) · 100 %  (diferența dintre cele două circuite)", pc: "p = F · i<sub>p</sub> / A<sub>m</sub>  (η = 1);  i<sub>p</sub> = L / l raportul pedalei, A<sub>m</sub> aria pompei centrale",
      etaP: "η<sub>p</sub> = p · A<sub>m</sub> / (F · i<sub>p</sub>)", Fcc: "F<sub>c</sub> = p · A<sub>c</sub>  (A<sub>c</sub> aria pistonului etrierului)", etaC: "η<sub>c</sub> = F<sub>c,măs</sub> / (p · A<sub>c</sub>)" },
    t32: { pf: "p<sub>fără servo</sub> = (F · i<sub>p</sub> · η<sub>p</sub> − F<sub>arc</sub>) / A<sub>m</sub>  (sau valoarea măsurată din Tabelul 3.1)", k: "Factorul de amplificare k = p<sub>cu servo</sub> / p<sub>fără servo</sub>" },
    t33: { sm: "s<sub>m</sub> = s<sub>p</sub> / i<sub>p</sub>  (cursa pistonului pompei)", V: "V = s<sub>m</sub> · A<sub>m</sub>  [cm³]", Vc: "V<sub>c</sub> = 0,3 mm · A<sub>c</sub>  (volumul pentru jocul de 0,3 mm la etrier)" }
  },
  "mf-l4": {
    t41: { dh: "Δh<sub>1−3</sub> = h<sub>1</sub> − h<sub>3</sub>  (denivelarea dintre secțiunea de intrare și gât)", pierd: "h<sub>1</sub> − h<sub>6</sub>  (pierderea de sarcină pe tubul Venturi)" },
    t42: { Q: "Q = V / t  (media celor două cântăriri volumetrice)", dh: "Δh<sub>1−3</sub> = h<sub>1</sub> − h<sub>3</sub>", Qt: "Q<sub>t</sub> = A<sub>2</sub> · √[2g·Δh / (1 − β<sup>4</sup>)], β = d<sub>2</sub>/D<sub>1</sub>  (Bernoulli + continuitate)", Cd: "C<sub>d</sub> = Q / Q<sub>t</sub>  (coeficientul de debit)" },
    t43: { dh: "Δh = l · sin α  (manometrul înclinat al tubului Pitot)", vP: "v = √(2g·Δh)  (viteza în axă)", vm: "v<sub>medie</sub> = Q / A<sub>1</sub>", rap: "Raportul v<sub>axă</sub>/v<sub>medie</sub>: ≈ 2 laminar, ≈ 1,1…1,3 turbulent", Re: "Re<sub>1</sub> = v<sub>medie</sub> · D<sub>1</sub> / ν" },
    t44: { x: "Poziția prizei piezometrice de-a lungul tubului (desenul tubului Venturi)", d: "Diametrul tubului în dreptul prizei", vQ1: "v = Q / A<sub>i</sub>, A<sub>i</sub> = π·d<sub>i</sub>²/4", qQ1: "Înălțimea cinetică v² / 2g", EQ1: "Sarcina totală E = h + v²/2g  (linia energetică)",
      vQ2: "v = Q / A<sub>i</sub>", EQ2: "E = h + v²/2g", vQ3: "v = Q / A<sub>i</sub>", EQ3: "E = h + v²/2g" }
  },
  "mf-l5": {
    t50: { nu: "ν(T) prin interpolare liniară în Tabelul 5.1 (vâscozitatea cinematică a apei)" },
    t52: { Q: "Q = V / t", v: "v = Q / A, A = π·d²/4, d = 10 mm", Re: "Re = v · d / ν", calc: "Re < 2300 laminar · 2300…4000 tranziție · > 4000 turbulent" },
    t52b: { Q: "Q = V / t", v: "v = Q / A, A = π·d²/4, d = 10 mm", Re: "Re = v · d / ν  (Re critic superior / inferior)" },
    t53: { d: "Diametrul conductei din exemplul de pe autovehicul", v: "Viteza tipică a fluidului în acea conductă", nu: "Vâscozitatea cinematică a fluidului la temperatura de lucru" }
  },
  "mf-l6": {
    t60: { nu: "ν(T) prin interpolare liniară în tabelul vâscozității apei" },
    t63: { v: "v = Q / A<sub>1</sub>  (d = 17 mm)", re: "Re = v · d / ν", lm: "λ = h<sub>1−2</sub> / [(L<sub>1−2</sub>/d) · v²/2g]  (Darcy–Weisbach)", lb: "λ<sub>Blasius</sub> = 0,3164 / Re<sup>0,25</sup>",
      lc: "Colebrook–White: 1/√λ = −2·lg[2,51/(Re·√λ) + (k/d)/3,71], k/d = 0,0015/17", xc: "ξ<sub>cot</sub> = [h<sub>5−6</sub> − λ·(L<sub>5−6</sub>/d)·v²/2g] / (v²/2g)",
      xi: "ξ<sub>îngustare</sub> = [h<sub>4−5</sub> − λ·(L<sub>4−5</sub>/d)·v<sub>1</sub>²/2g − (v<sub>1</sub>² − v<sub>2</sub>²)/2g] / (v<sub>1</sub>²/2g)", xr: "ξ<sub>robinet</sub> = [h<sub>6−7</sub> − λ·(L<sub>6−7</sub>/d)·v²/2g] / (v²/2g)" },
    t64: { v: "v = Q / A<sub>1</sub>", lm: "λ = h<sub>1−2</sub> / [(L<sub>1−2</sub>/d) · v²/2g]", xr: "ξ<sub>robinet</sub> = [h<sub>6−7</sub> − λ·(L<sub>6−7</sub>/d)·v²/2g] / (v²/2g)" },
    t65: { H: "H = p / (ρ·g) ≈ p / 9,81  [m], p în kPa", Qc: "Punctul de funcționare: H<sub>pompă</sub> = 4 − 10<sup>7</sup>·Q² = M·Q² → Q = √[4 / (10<sup>7</sup> + M)]  (robinet parțial închis: 2M)" }
  },
  /* ============================================================ Sisteme auxiliare ale autovehiculelor */
  "saa-l1": {
    t11: { k: "k<sub>ECT</sub> = t<sub>i</sub> / t<sub>i,cald</sub>  (îmbogățirea la rece)", kc: "k<sub>ECT,c</sub> = (t<sub>i</sub> − t<sub>m</sub>) / (t<sub>i,cald</sub> − t<sub>m</sub>)  (fără timpul mort t<sub>m</sub> al injectorului)" },
    t12: { dc: "DC = t<sub>i</sub> / T<sub>ciclu</sub> · 100 %, T<sub>ciclu</sub> = 120 000 / n  [ms] (două rotații la motorul în 4 timpi); peste 80 % → injectorul aproape de saturație" },
    t13: { Ch: "C<sub>h</sub> = 3,6 · m / Δt  [kg/h] (m în g, Δt în s)", minj: "m<sub>inj</sub> = C<sub>h</sub> · 10<sup>6</sup> / (i · n/2 · 60)  [mg/cursă], i = 4 cilindri" }
  },
  "saa-l2": {
    t21: { e08: "ε = (t<sub>i,model</sub> − t<sub>i,măs</sub>) / t<sub>i,măs</sub> · 100 %  (2.7), cu η<sub>v</sub> = 0,8", eAdj: "ε = (t<sub>i,ajustat</sub> − t<sub>i,măs</sub>) / t<sub>i,măs</sub> · 100 %; cerut |ε| < 5 %" },
    t22: { dms: "Δt<sub>i</sub> = t<sub>i</sub> − t<sub>i,ref</sub>  (referința: ralanti, U<sub>bat</sub> = 13,9 V, T<sub>a</sub> = 300 K)", dti: "Δt<sub>i</sub> = (t<sub>i</sub> − t<sub>i,ref</sub>) / t<sub>i,ref</sub> · 100 %" }
  },
  "saa-l3": {
    t31: { dp: "Δp = (p<sub>real</sub> − p<sub>comandat</sub>) / p<sub>comandat</sub> · 100 %; admis ± 5 %" },
    t32: { sig: "σ = (p<sub>max</sub> − p<sub>f</sub>) / p<sub>f</sub> · 100 %  (suprareglajul; la decelerare – subreglajul)", es: "Eroarea staționară = diferența p<sub>real</sub> − p<sub>comandat</sub> după stabilizare (Tabelul 3.1)" },
    t33: { dphi: "Δφ = 360° · (n/60) · Δt = 6·10<sup>−3</sup> · n · Δt  [°RAC], Δt în ms" }
  },
  "saa-l4": {
    t41: { panta: "Panta zonei liniare: regresia p = a + b·(n/1000) pe punctele dinaintea deschiderii supapei de suprapresiune (palierul)" },
    t42: { lampa: "Starea martorului de presiune a uleiului", concl: "Motor oprit: contact închis (R < 2 Ω, martor aprins). Motor pornit: contact deschis peste prag (R → ∞, martor stins)" }
  },
  "saa-l6": {
    t61: { pic: "π<sub>c</sub> = p<sub>2</sub> / p<sub>1</sub> = p<sub>2,abs</sub> / (p<sub>atm</sub> − Δp<sub>filtru</sub>), Δp<sub>filtru</sub> = 0,02 bar", eps: "ε<sub>IC</sub> = (T<sub>2</sub> − T<sub>3</sub>) / (T<sub>2</sub> − T<sub>a</sub>)  (eficacitatea intercoolerului)" }
  },
  "saa-l7": {
    t74: { v: { Ep: "Start-stop: E<sub>p</sub> = ∫ U<sub>b</sub>·I dt pe durata pornirii (oscilograma); hibrid: E<sub>rep</sub> măsurată cu data loggerul", Pc: "P<sub>c</sub> – puterea consumatorilor în oprire (scenariul individual)", ts: "t<sub>s</sub> – durata opririi (scenariul individual)",
      Ec: "E<sub>ciclu</sub> = E<sub>p</sub> + P<sub>c</sub> · t<sub>s</sub>  (7.5)", ti: "t<sub>înc</sub> = E<sub>ciclu</sub> / (η<sub>înc</sub> · U<sub>înc</sub> · I<sub>înc</sub>)  (7.6)", N: "N<sub>max</sub> = ΔSOC · C<sub>n</sub> · U<sub>n</sub> · 3600 / E<sub>ciclu</sub>  (7.7)",
      Er: "E<sub>rec</sub> = η<sub>rec</sub> · P<sub>rec</sub> · t<sub>fr</sub>  (7.8)", nc: "n = E<sub>rec</sub> / E<sub>ciclu</sub>" } }
  },
  "saa-l8": {
    t81: { TsJP: "T<sub>sat,JP</sub> = T<sub>sat</sub>(p<sub>JP</sub> + 1,01 bar) prin interpolare liniară în Tabelul 8.2", TsIP: "T<sub>sat,ÎP</sub> = T<sub>sat</sub>(p<sub>ÎP</sub> + 1,01 bar) prin interpolare liniară în Tabelul 8.2",
      SH: "ΔT<sub>si</sub> = T<sub>asp</sub> − T<sub>sat,JP</sub>  (supraîncălzirea la ieșirea din vaporizator)", SC: "ΔT<sub>sr</sub> = T<sub>sat,ÎP</sub> − T<sub>lic</sub>  (subrăcirea la ieșirea din condensator)" }
  }
};
