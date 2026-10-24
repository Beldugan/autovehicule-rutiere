/* Catalogul senzorilor autoturismului modern: principiul de funcționare, tipul semnalului, valori tipice și verificarea.
   Folosit în teoria lucrării DA L2 și în fișa senzorului din macheta 3D (câmpul k = cheia senzorului din machetă). */
var CATALOG_SENZORI = (function () {
  // tipurile de semnal (codul, denumirea, forma desenată în miniatură)
  var TIPURI = {
    RAT: { n: "Analogic ratiometric", d: "tensiune continuă 0,5…4,5 V, proporțională cu mărimea; alimentare 5 V de la ECU, deci semnalul se raportează la referința de 5 V", f: "M0,22 L18,22 L46,8 L70,8" },
    REZ: { n: "Rezistență variabilă (divizor)", d: "senzorul (NTC, PTC, potențiometru) formează un divizor cu rezistența de polarizare din ECU; se citește tensiunea de pe senzor", f: "M0,6 C20,7 30,18 70,21" },
    AC: { n: "Tensiune alternativă indusă", d: "senzor inductiv pasiv (magnet + bobină): amplitudinea și frecvența cresc cu viteza; nu are alimentare", f: "M0,14 Q5,2 10,14 T20,14 T30,14 T40,14 T50,14 T60,14 T70,14" },
    DIG: { n: "Dreptunghiular (Hall / magnetorezistiv)", d: "senzor activ alimentat; ieșire în colector deschis 0 / 5 V (sau 0 / 12 V), amplitudine constantă, funcționează și la viteză zero", f: "M0,22 H8 V6 H22 V22 H36 V6 H50 V22 H64 V6 H70" },
    CUR: { n: "Curent modulat 7 / 14 mA", d: "senzor activ cu 2 fire (roți ABS): curentul comută între ≈ 7 și 14 mA; unele transmit și sensul și calitatea semnalului (protocol VDA/AK)", f: "M0,20 H10 V9 H18 V20 H28 V9 H36 V20 H46 V9 H54 V20 H70" },
    FRV: { n: "Frecvență variabilă", d: "dreptunghiular cu factor de umplere fix; informația este frecvența (ex. debitmetrul digital, 1…12 kHz)", f: "M0,22 H6 V6 H12 V22 H20 V6 H30 V22 H42 V6 H56 V22 H70" },
    PWM: { n: "PWM (factor de umplere)", d: "frecvență fixă, informația este factorul de umplere (ex. senzorul de nivel și calitate a uleiului, unii senzori de poziție)", f: "M0,22 H4 V6 H10 V22 H18 V6 H34 V22 H42 V6 H62 V22 H70" },
    SENT: { n: "SENT (SAE J2716)", d: "digital unidirecțional pe un fir: perioade între fronturi descendente codifică „nibble”-uri de 4 biți; rezoluție 12 biți, diagnoză integrată (MAP, TPS, pedală, presiune rampă la motoarele noi)", f: "M0,6 H6 V22 H8 V6 H18 V22 H20 V6 H26 V22 H28 V6 H42 V22 H44 V6 H52 V22 H54 V6 H70" },
    PSI5: { n: "PSI5", d: "interfață de curent pe 2 fire (Manchester, 125 / 189 kbit/s) pentru senzorii de impact ai airbagului și unii senzori de presiune", f: "M0,18 H8 V10 H14 V18 H20 V10 H32 V18 H38 V10 H44 V18 H56 V10 H70" },
    LIN: { n: "LIN", d: "magistrală serială pe un fir, 12 V, ≤ 20 kbit/s; senzorul are microcontroler propriu (ploaie/lumină, baterie IBS, umiditate)", f: "M0,6 H10 V22 H16 V6 H22 V22 H34 V6 H40 V22 H46 V6 H70" },
    CAN: { n: "CAN / CAN FD", d: "senzor inteligent pe magistrala CAN (diferențial CAN-H / CAN-L): unghi volan, girație, NOx, radar", f: "M0,10 H10 V4 H20 V10 H28 V4 H40 V10 H70 M0,18 H10 V24 H20 V18 H28 V24 H40 V18 H70" },
    ETH: { n: "Ethernet auto / video serial", d: "100BASE-T1 / 1000BASE-T1 sau legături video seriale (GMSL, FPD-Link) pentru camere și radare de înaltă rezoluție", f: "M0,14 L6,6 L12,22 L18,8 L24,20 L30,6 L36,22 L42,10 L48,18 L54,6 L60,22 L70,14" },
    PZ: { n: "Piezoelectric", d: "cristalul generează sarcină electrică la solicitare mecanică; tensiune alternativă cu frecvența vibrației (detonație 5…20 kHz)", f: "M0,14 L10,14 L13,4 L16,24 L19,6 L22,22 L25,9 L28,19 L31,12 L34,16 L40,14 L70,14" },
    ZR: { n: "Celulă galvanică ZrO₂", d: "sonda λ cu salt: generează singură 0,1…0,9 V după diferența de oxigen; comută în jurul valorii de 0,45 V", f: "M0,22 C8,22 8,6 16,6 C24,6 24,22 32,22 C40,22 40,6 48,6 C56,6 56,22 64,22 L70,22" },
    IP: { n: "Curent de pompare", d: "sonda λ de bandă largă: ECU reglează curentul de pompare (mA, cu semn) care menține 0,45 V în celula de măsură; curentul indică λ continuu", f: "M0,18 C15,18 20,8 35,10 C50,12 55,14 70,13" },
    SW: { n: "Contact (pornit / oprit)", d: "întrerupător mecanic, reed sau Hall; două niveluri de tensiune, adesea cu rezistențe de diagnoză în serie / paralel", f: "M0,22 H24 V6 H50 V22 H70" },
    RF: { n: "Radio", d: "emițător propriu cu baterie (TPMS 315/433 MHz, FSK) sau transponder LF 125 kHz (cheie)", f: "M0,14 Q3,4 6,14 T12,14 T18,14 T24,14 T30,14 L70,14" },
    US: { n: "Ecou ultrasonic", d: "membrana emite un tren de impulsuri la 40…58 kHz și măsoară timpul până la ecou; transmis ca impuls de durată sau pe LIN", f: "M0,14 L4,4 L8,24 L12,4 L16,24 L20,14 L46,14 L48,10 L50,18 L52,10 L54,18 L56,14 L70,14" },
    RAD: { n: "Radar / optic (date)", d: "radar FMCW 77 GHz, cameră, lidar: prelucrare proprie și obiecte transmise pe CAN FD sau Ethernet", f: "M0,22 L18,6 L18,22 L36,6 L36,22 L54,6 L54,22 L70,10" }
  };
  // [k (cheia din machetă sau ""), denumire, principiu, tipul semnalului, valori tipice, verificare / defecte]
  var G = [
    ["Gestiunea motorului", [
      ["ckp", "Turația și poziția arborelui cotit (CKP)", "Inductiv: magnet + bobină în fața roții 60 − 2 (variantele active: Hall sau magnetorezistiv, cu detecția sensului de rotație)", "AC", "inductiv: 0,5…1 V la pornire, 5…100 V vârf-vârf la turații mari; f = 60·n/60 ≈ n Hz (n în rot/min, 60 de poziții de dinte pe rotație); activ: 0 / 5 V", "R bobină 200…1500 Ω; osciloscop: golul dinților la fiecare rotație; fără semnal motorul nu pornește (P0335)"],
      ["cmp", "Faza arborelui cu came (CMP)", "Hall diferențial în fața unei roți de fază (unul sau mai multe segmente pe 2 rotații)", "DIG", "0 / 5 V (sau 0 / 12 V), 1…4 impulsuri pe ciclu", "osciloscop pe 2 canale cu CKP: corelarea fazei (lanț/curea sărită); P0340"],
      ["maf", "Debitul masic de aer (MAF, HFM)", "Film cald: element încălzit menținut la temperatură constantă; puterea de încălzire depinde de masa de aer; diferența de temperatură amonte/aval dă și sensul curgerii", "FRV", "HFM 6/7: 1,5…12 kHz; variantele analogice 0,5…4,5 V; la ralanti 2…4 g/s pentru 1,4 l", "date live g/s vs. calculat; murdar → subestimare fără cod, LTFT pozitiv mare"],
      ["map", "Presiunea absolută din colector (MAP)", "Membrană de siliciu cu punte piezorezistivă și electronică de compensare", "RAT", "≈ 4,0 V la 101 kPa (contact pus), 1…1,5 V la ralanti (30…40 kPa); variante noi SENT", "pompă de vid: U = f(p) liniară; furtun fisurat → aer fals"],
      ["iat", "Temperatura aerului din admisie (IAT)", "Termistor NTC (adesea integrat în MAP sau MAF)", "REZ", "≈ 2,0…2,5 kΩ la 25 °C; 0,5…4,5 V pe divizor", "întrerupt → −40 °C pe tester; comparare cu temperatura exterioară la motor rece"],
      ["tmap@", "Presiunea de supraalimentare (T-MAP)", "Ca MAP, cu domeniu extins (până la 250…300 kPa) și NTC integrat", "RAT", "0,5…4,5 V pe 20…300 kPa", "comparare cu presiunea cerută; scurgeri pe intercooler"],
      ["tps", "Poziția clapetei (TPS, 2 piste)", "Hall fără contact (la modelele vechi potențiometru), două piste cu caracteristici opuse sau decalate pentru plauzibilitate", "RAT", "pista 1: 0,5→4,5 V, pista 2: 4,5→0,5 V; suma ≈ 5 V; variante SENT", "osciloscop pe 2 canale, fără întreruperi pe cursă; incoerență → mod avarie"],
      ["app", "Pedala de accelerație (APP, 2 piste)", "Hall sau inductiv fără contact, două piste redundante (de obicei a doua = jumătate din prima)", "RAT", "pista 1: 0,7…4,3 V; pista 2: 0,35…2,15 V", "raport constant între piste; defect → regim de avarie (turație limitată)"],
      ["knock", "Detonație (KS)", "Piezoelectric lipit pe bloc; ECU filtrează banda 5…20 kHz în fereastra de ardere a fiecărui cilindru", "PZ", "zeci–sute de mV alternativ, crește cu turația; nu are alimentare", "cuplu de strângere 20 N·m (afectează sensibilitatea); ciocănire ușoară lângă senzor → impulsuri pe osciloscop"],
      ["prail@", "Temperatura combustibilului / presiunea în rampă (benzină GDI, diesel CR)", "Membrană metalică cu mărci tensometrice (presiune 0…200 MPa) + electronică; NTC separat pentru temperatură", "RAT", "≈ 0,5 V la 0 bar; 4,5 V la presiunea maximă; variante SENT", "date live presiune cerută / reală; offset la motor oprit"],
      ["pjp@", "Presiunea combustibilului de joasă presiune", "Piezorezistiv în tur sau în modulul pompei", "RAT", "0,5…4,5 V pe 0…10 bar", "comparare cu manometrul mecanic"],
      ["vvt@", "Unghiul arborelui cu came variabil (VVT)", "Același senzor de fază (Hall) cu roată cu mai multe segmente; ECU calculează decalajul față de CKP", "DIG", "0 / 5 V", "decalaj real vs. cerut în date live"],
      ["pozAct@", "Poziția clapetei de turbulență / EGR / supapei wastegate", "Hall fără contact pe axul actuatorului", "RAT", "0,5…4,5 V (sau SENT / PWM)", "test activ: poziție cerută vs. reală"]
    ]],
    ["Evacuare și controlul emisiilor", [
      ["l1", "Sonda λ amonte de bandă largă (LSU)", "Celulă de pompare + celulă Nernst din ZrO₂ încălzită la ≈ 780 °C; ECU pompează oxigen pentru a menține 0,45 V în celula de măsură", "IP", "curent de pompare −2…+3 mA (0 la λ = 1); tester: λ 0,7…1,5 sau 0…5 V convertit", "rezistența încălzitorului 2…4 Ω; λ afișat în buclă deschisă la decelerare → aer"],
      ["l2", "Sonda λ aval (cu salt)", "Celulă galvanică ZrO₂ încălzită; tensiune după conținutul de oxigen după catalizator", "ZR", "0,6…0,8 V relativ constant la catalizator bun; 0,1 V sărac", "dacă urmărește sonda amonte → catalizator epuizat (P0420)"],
      ["egt", "Temperatura gazelor de evacuare (EGT)", "Termorezistor PT200 (platină, coeficient pozitiv) până la 1000 °C", "REZ", "≈ 200 Ω la 0 °C, ≈ 600…700 Ω la 600 °C", "rezistență la rece; deriva la temperaturi mari"],
      ["gpf", "Presiunea diferențială pe filtrul de particule (GPF/DPF)", "Membrană piezorezistivă între două prize (înainte și după monolit)", "RAT", "0,5 V la Δp = 0, crește cu încărcarea filtrului și cu debitul", "furtunuri inversate / fisurate → regenerări greșite"],
      ["nox@", "Senzorul de NOx (diesel SCR, benzină cu amestec sărac)", "Celule ZrO₂ în cascadă: prima elimină oxigenul, a doua descompune NOx și măsoară oxigenul rezultat", "CAN", "concentrație NOx (ppm) și λ transmise pe CAN de modulul propriu", "valori plauzibile la cald; încălzire 2…3 min după pornire"],
      ["pm@", "Senzorul de particule (PM, diesel)", "Electrozi interdigitali pe care se depune funingine; se măsoară creșterea conductanței, apoi se curăță prin încălzire", "CAN", "timp până la prag transmis pe CAN", "OBD al DPF; ciclu de regenerare"],
      ["evap", "Presiunea din rezervor (EVAP)", "Piezorezistiv de presiune foarte mică (±4 kPa) față de atmosferă", "RAT", "≈ 2,5 V la 0 Pa; test de etanșeitate cu pompa de vid a sistemului", "P0442/P0455 – bușon, furtunuri, canistră"]
    ]],
    ["Răcire, ungere, climatizare", [
      ["ect", "Temperatura lichidului de răcire (CTS/ECT)", "Termistor NTC în carcasa termostatului; uneori două NTC (ECU și bord)", "REZ", "≈ 2,5 kΩ la 25 °C, ≈ 300 Ω la 90 °C; 0,5…1 V la motor cald", "−40 °C = întrerupt; încălzire lentă = termostat blocat deschis"],
      ["nivRacire", "Nivelul lichidului de răcire", "Contact reed acționat de un plutitor magnetic", "SW", "închis / deschis (cu rezistențe de diagnoză)", "continuitate cu plutitorul jos / sus"],
      ["uleiP", "Presiunea uleiului", "Membrană piezorezistivă (sau presostat la modelele simple)", "RAT", "0,5…4,5 V pe 0…10 bar; presostatul: deschis peste 0,3…0,5 bar", "comparare cu manometrul la ralanti cald"],
      ["uleiN", "Nivelul, temperatura și calitatea uleiului", "Ultrasonic (timpul ecoului în ulei) sau termic (răcirea unui element încălzit); capacitiv pentru calitate", "PWM", "impulsuri PWM: durata = temperatura, apoi nivelul", "nivel cu motorul oprit, pe orizontală"],
      ["ac", "Presiunea agentului frigorific (A/C)", "Piezorezistiv pe conducta de înaltă presiune", "RAT", "0,5…4,5 V pe 0…35 bar (sau LIN); 12…18 bar la funcționare", "comparare cu manometrele stației de climatizare; protejează compresorul"],
      ["tExt", "Temperatura exterioară", "NTC în bara față sau în oglindă", "REZ", "≈ 10 kΩ la 25 °C", "afișaj eronat la mers lent (căldura radiatorului)"],
      ["tHab", "Temperatura din habitaclu", "NTC în bord, cu ventilator de aspirație", "REZ", "≈ 10 kΩ la 25 °C", "ventilatorul de aspirație blocat → reglaj greșit"],
      ["solar@", "Radiația solară", "Fotodiodă sub parbriz (curentul crește cu lumina)", "REZ", "câteva sute de mV la soare puternic (sau pe LIN)", "acoperit → valoare minimă"],
      ["umid@", "Umiditatea și calitatea aerului", "Umiditate: condensator cu dielectric higroscopic; calitate: semiconductor cu oxid metalic (CO, NOx)", "LIN", "umiditate % și temperatura parbrizului pe LIN; calitatea aerului adesea PWM", "aburirea parbrizului, recircularea automată"]
    ]],
    ["Frânare, stabilitate și direcție", [
      ["vssFS", "Turația roților (ABS/ESC)", "Hall activ sau magnetorezistiv în fața unui inel multipolar magnetic (în rulment) sau a unei roți dințate", "CUR", "7 / 14 mA, 40…50 de impulsuri pe rotație; la modelele vechi inductive: AC", "ampermetru / osciloscop pe rezistor de sarcină; inel magnetic deteriorat → impulsuri lipsă"],
      ["stop", "Contactul pedalei de frână", "Contact dublu (normal deschis + normal închis) sau Hall, pentru plauzibilitate", "SW", "12 V / 0 V pe cele două ieșiri, inverse", "incoerență → cod în ECU motor și ESC; tempomat dezactivat"],
      ["pFrana", "Presiunea de frânare (ESC)", "Piezorezistiv în blocul hidraulic", "RAT", "0,5…4,5 V pe 0…250 bar (sau intern în modul)", "date live la apăsarea pedalei"],
      ["nivFrana", "Nivelul lichidului de frână", "Contact reed cu plutitor", "SW", "închis la nivel minim", "martor frână la bord"],
      ["uzura", "Uzura plăcuțelor", "Buclă de fir înglobată în garnitură, întreruptă (sau scurtcircuitată la disc) la uzură", "SW", "continuitate = plăcuță bună", "rezistență buclă < 1 Ω"],
      ["volan", "Unghiul volanului", "Magnetorezistiv / optic cu două roți dințate de pas diferit (unghi absolut pe mai multe ture, principiul Vernier)", "CAN", "unghi și viteză unghiulară pe CAN", "calibrare zero după geometrie; cod la decalaj"],
      ["esc", "Girația și accelerațiile (ESC)", "MEMS: giroscop vibrant (Coriolis) și accelerometre capacitive, integrate în unitatea ESC sau airbag", "CAN", "°/s și m/s² pe CAN (intern SPI)", "calibrare pe orizontală; montaj fix"],
      ["cuplu@", "Cuplul de direcție (EPS)", "Bară de torsiune + senzor magnetic (inductiv sau Hall) al unghiului de răsucire", "SENT", "SENT sau 2 semnale PWM / analogice redundante", "calibrare după înlocuirea casetei"],
      ["rezEps@", "Poziția motorului electric al EPS / frânei de parcare", "Rezolver sau senzori Hall pe rotor", "AC", "rezolver: sin/cos modulate (5…10 kHz)", "intern în modul"]
    ]],
    ["Suspensie, pneuri, transmisie", [
      ["tpmsFS", "Presiunea în pneu (TPMS direct)", "Modul în ventil: senzor piezorezistiv de presiune, temperatură, accelerometru, baterie și emițător radio", "RF", "433 MHz FSK, la 30…60 s (mai des la variații)", "tester TPMS; bateria 5…10 ani; învățarea pozițiilor"],
      ["nivel", "Nivelul caroseriei (faruri, suspensie pneumatică)", "Hall al unghiului unei pârghii legate de braț", "RAT", "0,5…4,5 V (sau PWM)", "corectorul farurilor după schimbarea sarcinii"],
      ["cutieN@", "Turațiile și poziția selectorului în cutia automată", "Hall în carcasa mecatronicii (arbori de intrare și ieșire), senzor de poziție magnetic al selectorului", "DIG", "frecvență proporțională cu turația; poziția pe PWM / SENT", "patinarea ambreiajelor = diferență de turație"],
      ["cutieP@", "Presiunea și temperatura uleiului de transmisie", "Piezorezistiv în blocul hidraulic; NTC", "RAT", "intern în mecatronică (TCU)", "date live TCU"]
    ]],
    ["Asistență la conducere (ADAS)", [
      ["radar", "Radarul frontal (ACC, AEB)", "Radar FMCW 76…77 GHz: distanța din diferența de frecvență, viteza din efectul Doppler", "RAD", "listă de obiecte pe CAN FD / Ethernet", "calibrare statică cu țintă sau dinamică după parbriz / bară"],
      ["camF", "Camera frontală", "Senzor CMOS + procesor de imagine (marcaje, indicatoare, pietoni)", "ETH", "obiecte pe CAN FD; flux video pe legătură serială", "calibrare după înlocuirea parbrizului"],
      ["pdcF1", "Senzorii de parcare", "Traductor piezoceramic care emite și primește ultrasunete", "US", "40…58 kHz; distanța = c·t/2", "membrană lovită / vopsită; c depinde de temperatură"],
      ["camS", "Camera de mers înapoi / 360°", "CMOS cu obiectiv grand-angular", "ETH", "video analogic (la modelele vechi) sau serial digital", "calibrarea vederii de sus"],
      ["lidar@", "Lidar", "Impulsuri laser și timpul de zbor", "RAD", "nor de puncte pe Ethernet", "curățenia ferestrei optice"]
    ]],
    ["Caroserie, siguranță pasivă, energie", [
      ["ploaie", "Ploaie și lumină", "Optic: LED infraroșu și fotodiodă pe parbriz (picăturile reduc reflexia totală); fotodiode pentru lumină", "LIN", "intensitatea ploii și luminozitatea pe LIN", "gel optic sub senzor la schimbarea parbrizului"],
      ["ibs", "Senzorul inteligent al bateriei (IBS)", "Șunt de măsură în borna negativă + microcontroler (tensiune, curent, temperatură, starea de încărcare)", "LIN", "SOC, SOH, curent (A) pe LIN", "codare după schimbarea bateriei (stop-start)"],
      ["comb", "Nivelul combustibilului", "Potențiometru cu plutitor (pistă cu peliculă groasă) sau magnetic fără contact", "REZ", "≈ 20…300 Ω între gol și plin", "salturi la mișcarea plutitorului = pistă uzată"],
      ["ocupare", "Ocuparea scaunului pasagerului", "Covoraș cu celule rezistive de presiune sau mărci tensometrice / capacitiv în tapițerie", "REZ", "clasificarea ocupantului în modulul airbag", "dezactivarea airbagului pentru scaunul de copil"],
      ["crashF", "Impact frontal / lateral (airbag)", "Accelerometre MEMS (frontal) și senzori de presiune în ușă (lateral)", "PSI5", "date digitale de curent pe 2 fire", "rezistență de diagnoză; schimbare după impact"],
      ["centura@", "Catarama centurii", "Hall cu două niveluri de curent (5 / 15 mA) sau contact cu rezistențe", "SW", "curent / rezistență de diagnoză", "martor centură"],
      ["cheie@", "Cheie / acces fără cheie", "Antene LF 125 kHz și receptor UHF 433 MHz; transponder în cheie", "RF", "cod criptat challenge-response", "bateria cheii; atacuri de tip releu"]
    ]],
    ["Vehicule electrice și hibride", [
      ["rezolver@", "Poziția rotorului mașinii electrice", "Rezolver: bobină de excitație și două bobine sin/cos pe stator", "AC", "excitație 5…10 kHz, ieșiri modulate sin/cos", "calibrarea unghiului după montaj"],
      ["curHV@", "Curentul de înaltă tensiune", "Hall în buclă deschisă/închisă sau șunt izolat", "RAT", "2,5 V ± 2 V (bipolar) sau digital în BMS", "offset la curent zero"],
      ["celule@", "Tensiunile celulelor și temperaturile bateriei", "Circuite de monitorizare a celulelor (CMU) + NTC pe module", "CAN", "pe magistrala internă izolată, apoi CAN", "dezechilibrul celulelor"],
      ["izol@", "Izolația față de șasiu", "Monitor de izolație: injectează un semnal și măsoară rezistența HV–șasiu", "CAN", "rezistența de izolație (kΩ…MΩ)", "sub ≈ 500 Ω/V → deconectare"]
    ]]
  ];
  var L = []; G.forEach(function (g) { g[1].forEach(function (s) { L.push({ sistem: g[0], id: s[0].replace("@", ""), k: s[0].includes("@") ? "" : s[0], n: s[1], princ: s[2], tip: s[3], val: s[4], verif: s[5] }); }); });
  var dupaK = {}, dupaId = {}; L.forEach(function (s) { if (s.k) dupaK[s.k] = s; dupaId[s.id] = s; });
  ["vssFD", "vssSD", "vssSS"].forEach(function (k) { dupaK[k] = dupaK.vssFS; }); ["tpmsFD", "tpmsSS", "tpmsSD"].forEach(function (k) { dupaK[k] = dupaK.tpmsFS; }); dupaK.pdcS1 = dupaK.pdcF1; dupaK.crashL = dupaK.crashF;
  function svgTip(t, w) { var T = TIPURI[t]; return T ? '<svg viewBox="0 0 70 28" width="' + (w || 70) + '" height="' + Math.round((w || 70) * 0.4) + '" aria-hidden="true" style="vertical-align:middle"><path d="' + T.f + '" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>' : ""; }
  function html() {
    var s = '<h2>2.3. Senzorii autoturismului modern: principiu și tipul semnalului</h2><p>Un autoturism actual are 80…150 de senzori. Pentru diagnoză, mai important decât mărimea măsurată este <b>tipul semnalului</b>: el stabilește aparatul (multimetru, osciloscop, tester pe magistrală), punctul de măsură și forma corectă a semnalului. Tabelul următor grupează tipurile de semnal; apoi senzorii sunt prezentați pe sisteme.</p>';
    s += '<div class="tabel-scroll"><table class="tabel catalog-tip"><thead><tr><th>Semnal</th><th>Tipul</th><th>Descriere</th><th>Aparat</th></tr></thead><tbody>';
    var ap = { RAT: "multimetru, osciloscop", REZ: "ohmmetru (conector desfăcut), voltmetru", AC: "osciloscop (multimetrul AC doar orientativ)", DIG: "osciloscop", CUR: "ampermetru serie / osciloscop pe rezistor", FRV: "osciloscop, frecvențmetru", PWM: "osciloscop", SENT: "osciloscop cu decodor SENT / tester", PSI5: "tester (nu se măsoară direct)", LIN: "osciloscop + decodor LIN, tester", CAN: "tester, osciloscop pe CAN-H/CAN-L", ETH: "tester / aparat dedicat", PZ: "osciloscop", ZR: "osciloscop / voltmetru de mare impedanță", IP: "tester (date live)", SW: "voltmetru, ohmmetru", RF: "tester TPMS / cheie", US: "osciloscop / tester", RAD: "tester, echipament de calibrare" };
    Object.keys(TIPURI).forEach(function (k) { s += '<tr><td>' + svgTip(k) + '</td><td><b>' + TIPURI[k].n + '</b></td><td>' + TIPURI[k].d + '</td><td>' + ap[k] + '</td></tr>'; });
    s += '</tbody></table></div>';
    G.forEach(function (g) {
      s += '<h3>' + g[0] + '</h3><div class="tabel-scroll"><table class="tabel catalog-senzori"><thead><tr><th>Senzorul</th><th>Principiul de funcționare</th><th>Semnalul</th><th>Valori tipice</th><th>Verificare / defecte</th></tr></thead><tbody>';
      g[1].forEach(function (x) { s += '<tr><td><b>' + x[1] + '</b></td><td>' + x[2] + '</td><td>' + svgTip(x[3], 56) + '<br><small>' + TIPURI[x[3]].n + '</small></td><td>' + x[4] + '</td><td>' + x[5] + '</td></tr>'; });
      s += '</tbody></table></div>';
    });
    s += '<p class="nota">Tendința actuală: semnalele analogice sunt înlocuite de interfețe digitale (SENT, PSI5, LIN, CAN FD) care transmit valoarea cu diagnoză integrată; la acești senzori multimetrul nu mai arată mărimea, iar verificarea se face cu testerul sau cu un osciloscop cu decodor de protocol.</p>';
    return s;
  }
  return { TIPURI: TIPURI, LISTA: L, dupaK: dupaK, dupaId: dupaId, GRUPE: G.map(function (g) { return g[0]; }), svgTip: svgTip, html: html };
})();
if (typeof globalThis !== "undefined") globalThis.CATALOG_SENZORI = CATALOG_SENZORI;
