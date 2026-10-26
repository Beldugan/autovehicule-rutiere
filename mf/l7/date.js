/* GENERAT din mf/l1…l6/lab.js (întrebările de verificare și testele) – tools/extrage_recap_mf.js */
const LUCRARI_MF = [
 {
  "nr": 1,
  "titlu": "Vâscozitatea uleiurilor de motor în funcție de temperatură",
  "scop": "Determinarea vâscozității dinamice și cinematice a uleiurilor de motor la 40, 60 și 80 °C cu vâscozimetrul Höppler, trasarea dreptei Walther și încadrarea în clasificarea SAE J300.",
  "relatii": "η = K·(ρ<sub>b</sub> − ρ<sub>l</sub>)·t; &nbsp; ν = η/ρ; &nbsp; ρ(t) = ρ<sub>15</sub>·[1 − α(t − 15)]; &nbsp; lg lg(ν + 0,7) = A − B·lg T.",
  "intrebari": [
   [
    "Care este diferența dintre vâscozitatea dinamică și cea cinematică? Dați unitățile SI și pe cele uzuale.",
    "η leagă efortul tangențial de gradientul de viteză (Pa·s; uzual mPa·s = cP); ν = η/ρ (m²/s; uzual mm²/s = cSt). Clasificarea SAE folosește ν la 100 °C și η (HTHS) la 150 °C."
   ],
   [
    "De ce nu se poate folosi direct legea lui Stokes în vâscozimetrul Höppler?",
    "Stokes presupune lichid nelimitat și Re &lt; 0,5; în tub jocul bilă–perete este foarte mic, rezistența este dominată de curgerea în fanta dintre bilă și tub, deci se folosește constanta de etalonare K a fiecărei bile."
   ],
   [
    "Ce reprezintă cele două numere din marcajul 5W-30?",
    "5W – clasa de iarnă, stabilită prin încercări la rece (CCS – pornire, MRV – pompare); 30 – clasa de vară, după ν la 100 °C (9,3…12,5 mm²/s) și HTHS la 150 °C (min. 2,9 mPa·s)."
   ],
   [
    "De ce se măsoară și vâscozitatea HTHS la 150 °C?",
    "În lagăre gradienții de viteză sunt foarte mari (10⁶ s⁻¹) și temperatura ridicată; polimerii aditivi se aliniază și vâscozitatea scade temporar. HTHS garantează grosimea minimă a filmului de ulei în aceste condiții."
   ],
   [
    "Cum influențează diluarea uleiului cu motorină (la regenerarea filtrului de particule) vâscozitatea și ungerea?",
    "Motorina (ν ≈ 2–4 mm²/s) scade vâscozitatea uleiului; filmul din lagăre se subțiază, crește uzura, iar uleiul poate ieși din clasa SAE. Se verifică nivelul (crește!) și se scurtează intervalul de schimb."
   ]
  ],
  "test": [
   {
    "q": "Unitatea uzuală a vâscozității cinematice în fișele tehnice ale uleiurilor este:",
    "o": [
     "mPa·s",
     "mm²/s (cSt)",
     "Pa",
     "kg/m³"
    ],
    "c": 1,
    "e": "ν = η/ρ, uzual în mm²/s (1 cSt)."
   },
   {
    "q": "În vâscozimetrul Höppler, la viteză constantă, η este proporțională cu:",
    "o": [
     "pătratul timpului de cădere",
     "timpul de cădere",
     "inversul timpului",
     "temperatura"
    ],
    "c": 1,
    "e": "η = K(ρ<sub>b</sub> − ρ<sub>l</sub>)·t – relație liniară cu t."
   },
   {
    "q": "De ce timpul de cădere trebuie să fie peste 10 s?",
    "o": [
     "ca bila să nu se oprească",
     "pentru ca eroarea relativă de cronometrare să fie mică",
     "din cauza Archimede",
     "pentru încălzirea uleiului"
    ],
    "c": 1,
    "e": "Timpul de reacție (0,1–0,2 s) raportat la un timp scurt dă erori de câteva procente."
   },
   {
    "q": "În diagrama Walther dreptele sunt obținute pentru:",
    "o": [
     "lg ν funcție de t",
     "lg lg(ν + 0,7) funcție de lg T",
     "ν funcție de 1/T",
     "η funcție de p"
    ],
    "c": 1,
    "e": "ASTM D341: lg lg(ν + 0,7) = A − B·lg T."
   },
   {
    "q": "Un ulei cu panta Walther B mai mică:",
    "o": [
     "își schimbă mai puțin vâscozitatea cu temperatura (VI mare)",
     "este mai vâscos la 100 °C",
     "este întotdeauna mineral",
     "nu poate fi multigrad"
    ],
    "c": 0,
    "e": "B mic → variație mică cu temperatura → indice de vâscozitate mare."
   },
   {
    "q": "Numărul „30” din 5W-30 se stabilește după:",
    "o": [
     "vâscozitatea la −30 °C",
     "ν la 100 °C și HTHS la 150 °C",
     "densitate",
     "punctul de inflamabilitate"
    ],
    "c": 1,
    "e": "Clasa de vară – Tabelul 1.1."
   },
   {
    "q": "O eroare de 1 °C la 40 °C modifică vâscozitatea cu aproximativ:",
    "o": [
     "0,1 %",
     "3 %",
     "30 %",
     "nu o modifică"
    ],
    "c": 1,
    "e": "≈ 3 % – de aceea stabilizarea termică este esențială."
   }
  ]
 },
 {
  "nr": 2,
  "titlu": "Compresibilitatea lichidului de frână și efectul aerului din circuit",
  "scop": "Determinarea modulului de elasticitate al unui lichid de frână cu piezometrul cu piston filetat și evidențierea efectului aerului asupra volumului absorbit (cursa pedalei).",
  "relatii": "ΔV = n·πd²/4·s; &nbsp; K<sub>m</sub> = V₀·Δp/ΔV; &nbsp; 1/K = 1/K<sub>m</sub> − D/(E·e); &nbsp; β = 1/K; &nbsp; V<sub>a0</sub> = n<sub>b</sub>·πd<sub>b</sub>³/6; &nbsp; ΔV<sub>a</sub> = V<sub>a0</sub>(1 − p₀/p); &nbsp; a = √(K/ρ).",
  "intrebari": [
   [
    "Definiți compresibilitatea și modulul de elasticitate al unui lichid; care sunt unitățile lor?",
    "Compresibilitatea β = −(1/V<sub>0</sub>)·ΔV/Δp este micșorarea relativă a volumului la creșterea presiunii cu o unitate, în 1/Pa. Modulul de elasticitate K = 1/β = −V<sub>0</sub>·Δp/ΔV, în Pa (practic GPa). Pentru lichidul de frână K ≈ 1,5…2,0 GPa, β ≈ 5…6,7·10<sup>−10</sup> 1/Pa."
   ],
   [
    "De ce aerul din circuitul de frânare produce „pedala moale”?",
    "Aerul are K = p ≈ 0,1 MPa la presiunea atmosferică, de ~15 000 de ori mai mic decât al lichidului. Bula se comprimă izoterm și absoarbe aproape tot volumul ei la presiuni mici (jumătate până la 1 bar), deci pedala coboară fără ca presiunea să crească; abia după comprimarea bulei presiunea urcă. Efectul este același cu bulele de vapori la fierberea lichidului."
   ],
   [
    "De ce lichidul de frână se schimbă periodic, chiar dacă nivelul lui este corect?",
    "Lichidul pe bază de glicoli este higroscopic: absoarbe apă din aer prin furtunuri și prin capacul rezervorului. Apa scade punctul de fierbere (DOT 4: 230 °C uscat → 155 °C umed), iar la frânări repetate apar bule de vapori (pedală moale, „fading”); apa produce și coroziune. De aceea lichidul se înlocuiește la 2 ani sau când conținutul de apă depășește ≈ 3 %."
   ],
   [
    "Calculați viteza de propagare a undei de presiune în lichidul de frână (K = 1,7 GPa, ρ = 1050 kg/m³).",
    "a = √(K/ρ) = √(1,7·10<sup>9</sup>/1050) ≈ <b>1272 m/s</b>."
   ],
   [
    "Cum influențează elasticitatea furtunurilor de frână valoarea măsurată a modulului de elasticitate?",
    "Peretele de cauciuc se dilată sub presiune și absoarbe volum, ca un termen D/(E·e) foarte mare în relația (2.4) (E al cauciucului este de mii de ori mai mic decât al oțelului). Modulul „echivalent” măsurat scade mult sub cel al lichidului – de câteva ori, după lungimea furtunului – deci cursa pedalei crește. În simulator: situația „furtun flexibil racordat”."
   ]
  ],
  "test": [
   {
    "q": "Ce mărime se citește direct pe piezometru pentru a obține ΔV?",
    "o": [
     "presiunea",
     "numărul de rotații ale roții de manevră",
     "temperatura",
     "diametrul cilindrului"
    ],
    "c": 1,
    "e": "ΔV = n·πd²/4·s: se citește numărul de rotații n; d și s sunt constante ale standului."
   },
   {
    "q": "Un student obține K = 0,9 GPa pentru DOT 4. Cea mai probabilă cauză este:",
    "o": [
     "cilindrul se dilată",
     "a rămas aer în piezometru",
     "temperatura e prea mică",
     "manometrul are clasa 1"
    ],
    "c": 1,
    "e": "Corecția cilindrului este de doar ≈ 3 %. O valoare mult sub 1,5 GPa indică aer rămas (aerisire incompletă)."
   },
   {
    "q": "Corecția pentru deformarea cilindrului face ca modulul real K să fie:",
    "o": [
     "mai mic decât K_m",
     "mai mare decât K_m",
     "egal cu K_m",
     "nul"
    ],
    "c": 1,
    "e": "Cilindrul se dilată și „ajută” la absorbția de volum, deci K_m < K: 1/K = 1/K_m − D/(E·e)."
   },
   {
    "q": "O bulă de 0,5 cm³ (la 1 bar abs.) absoarbe până la 1 bar suprapresiune:",
    "o": [
     "0,05 cm³",
     "0,25 cm³",
     "0,48 cm³",
     "0,5 cm³"
    ],
    "c": 1,
    "e": "ΔV_a = 0,5·(1 − 1/2) = 0,25 cm³ – jumătate din volumul bulei la doar 1 bar."
   },
   {
    "q": "Curbele de încărcare și descărcare nu se suprapun, descărcarea ajunge la 0 bar mai devreme. Diagnosticul:",
    "o": [
     "aer în lichid",
     "scurgere la etanșarea pistonului",
     "manometru defect",
     "lichid prea vâscos"
    ],
    "c": 1,
    "e": "Lichidul pierdut pe lângă piston face ca presiunea să scadă la zero înainte de revenirea roții (§2.7)."
   },
   {
    "q": "La 100 bar, lichidul de frână cu K = 1,7 GPa își micșorează volumul cu aproximativ:",
    "o": [
     "0,06 %",
     "0,6 %",
     "6 %",
     "10 %"
    ],
    "c": 1,
    "e": "ΔV/V = p/K = 10⁷/1,7·10⁹ ≈ 0,59 %."
   },
   {
    "q": "Celeritatea undelor de presiune în motorină (K = 1,5 GPa, ρ = 830 kg/m³) este:",
    "o": [
     "≈ 340 m/s",
     "≈ 1340 m/s",
     "≈ 4500 m/s",
     "≈ 13 400 m/s"
    ],
    "c": 1,
    "e": "a = √(1,5·10⁹/830) ≈ 1344 m/s."
   },
   {
    "q": "Lichidul DOT 5 (siliconic) față de DOT 4:",
    "o": [
     "este higroscopic",
     "are modul de elasticitate mai mic (mai compresibil)",
     "se amestecă fără restricții cu DOT 4",
     "are punct de fierbere mai mic"
    ],
    "c": 1,
    "e": "Lichidele siliconice sunt nehigroscopice, dar mai compresibile (K ≈ 1 GPa) și nu se amestecă cu cele pe bază de glicoli."
   }
  ]
 },
 {
  "nr": 3,
  "titlu": "Legea lui Pascal: transmiterea hidraulică a forței în sistemul de frânare",
  "scop": "Verificarea legii lui Pascal pe un circuit real de frânare: presiunea creată de pompa centrală, forța la etrier, randamentele transmisiei și factorul de amplificare al servofrânei.",
  "relatii": "F<sub>t</sub> = F<sub>p</sub>·i<sub>p</sub>·η<sub>p</sub>; &nbsp; p = F<sub>t</sub>/A<sub>m</sub>; &nbsp; F<sub>c</sub> = p·A<sub>c</sub>·η<sub>c</sub>; &nbsp; s<sub>c</sub>A<sub>c</sub> = s<sub>m</sub>A<sub>m</sub>; &nbsp; F<sub>f</sub> = 2μF<sub>c</sub>; &nbsp; F<sub>r</sub> = F<sub>f</sub>·r<sub>ef</sub>/r<sub>d</sub>.",
  "intrebari": [
   [
    "Enunțați legea fundamentală a hidrostaticii și legea lui Pascal.",
    "p = p₀ + ρgh: presiunea crește liniar cu adâncimea. Pascal: o variație de presiune produsă într-un punct al unui lichid în repaus se transmite integral în toate punctele lui."
   ],
   [
    "De ce diferența de nivel dintre pompa centrală și etrier nu influențează practic presiunea în circuit?",
    "ρgh pentru h &lt; 1 m este sub 0,1 bar, neglijabil față de 20…150 bar de lucru."
   ],
   [
    "Cum se modifică forța la etrier dacă diametrul pistonului etrierului crește de la 54 la 57 mm?",
    "Crește cu raportul ariilor (57/54)² = 1,114, adică cu ≈ 11 %, la aceeași presiune; crește însă și volumul de lichid necesar (cursa pedalei)."
   ],
   [
    "Ce se întâmplă cu presiunea în circuit dacă servofrâna își pierde vacuumul?",
    "Asistarea dispare: la aceeași forță pe pedală presiunea scade de ≈ 4…7 ori; frâna funcționează, dar cere o forță foarte mare."
   ],
   [
    "De ce sistemul de frânare are două circuite independente (pompa tandem)?",
    "Pentru siguranță: la o scurgere într-un circuit, celălalt (de regulă în diagonală) asigură încă cel puțin jumătate din forța de frânare (cerință legală)."
   ]
  ],
  "test": [
   {
    "q": "Într-un lichid în repaus, presiunea într-un punct:",
    "o": [
     "depinde de direcție",
     "este aceeași pe toate direcțiile",
     "este zero",
     "depinde doar de volum"
    ],
    "c": 1,
    "e": "Proprietatea presiunii hidrostatice; de aici legea lui Pascal."
   },
   {
    "q": "Raportul F<sub>c</sub>/F<sub>t</sub> între etrier și pompa centrală este (ideal):",
    "o": [
     "d<sub>c</sub>/d<sub>m</sub>",
     "A<sub>c</sub>/A<sub>m</sub>",
     "A<sub>m</sub>/A<sub>c</sub>",
     "1"
    ],
    "c": 1,
    "e": "La aceeași presiune forțele sunt proporționale cu ariile (3.7)."
   },
   {
    "q": "Dacă forța se multiplică de 6 ori între pompă și etrier, cursa pistonului etrierului:",
    "o": [
     "crește de 6 ori",
     "rămâne aceeași",
     "scade de 6 ori",
     "scade de 36 de ori"
    ],
    "c": 2,
    "e": "Conservarea volumului s<sub>c</sub>A<sub>c</sub> = s<sub>m</sub>A<sub>m</sub> – lucrul mecanic se conservă."
   },
   {
    "q": "Termenul ρgh pentru o diferență de nivel de 0,8 m de lichid de frână este aproximativ:",
    "o": [
     "0,08 bar",
     "8 bar",
     "80 bar",
     "0,8 bar"
    ],
    "c": 0,
    "e": "1050·9,81·0,8 ≈ 8 240 Pa ≈ 0,08 bar."
   },
   {
    "q": "După punctul de saturație al servofrânei, presiunea:",
    "o": [
     "nu mai crește deloc",
     "crește doar cu forța șoferului (panta mică)",
     "scade",
     "crește exponențial"
    ],
    "c": 1,
    "e": "Asistarea a atins Δp<sub>vac</sub>·A<sub>membrană</sub>; restul vine doar de la pedală."
   },
   {
    "q": "Randamentul aparent η<sub>p</sub> la forțe mici (50 N) este mai mic deoarece:",
    "o": [
     "lichidul se comprimă",
     "arcul de revenire al pompei preia o parte din forță",
     "manometrul nu citește",
     "temperatura este mică"
    ],
    "c": 1,
    "e": "Forța arcului (≈ 40 N pe tijă) contează mult la forțe mici."
   }
  ]
 },
 {
  "nr": 4,
  "titlu": "Ecuația lui Bernoulli și măsurarea debitului: tubul Venturi și tubul Pitot",
  "scop": "Verificarea experimentală a ecuației lui Bernoulli prin trasarea liniei piezometrice și a liniei energetice într-un tub Venturi, determinarea coeficientului de debit și măsurarea vitezei locale cu tubul Pitot.",
  "relatii": "Q = v<sub>1</sub>A<sub>1</sub> = v<sub>2</sub>A<sub>2</sub>; &nbsp; z + p/(ρg) + v²/(2g) = const. − h<sub>r</sub>; &nbsp; v<sub>2</sub> = √(2gΔh/(1 − (A<sub>2</sub>/A<sub>1</sub>)²)); &nbsp; Q<sub>t</sub> = A<sub>2</sub>v<sub>2</sub>; &nbsp; C<sub>d</sub> = Q/Q<sub>t</sub>; &nbsp; Δh = l·sin α; &nbsp; v = √(2gΔh).",
  "intrebari": [
   [
    "Scrieți ecuația lui Bernoulli pentru lichidul real și explicați semnificația energetică a fiecărui termen.",
    "z + p/(ρg) + αv²/(2g) = const. − h<sub>r</sub>: energia de poziție, de presiune și cinetică, raportate la greutatea lichidului (sarcini în m coloană de lichid); h<sub>r</sub> este energia disipată prin frecări între cele două secțiuni."
   ],
   [
    "De ce scade presiunea în gâtul tubului Venturi?",
    "Din continuitate, viteza crește invers proporțional cu aria (v<sub>2</sub> = v<sub>1</sub>·A<sub>1</sub>/A<sub>2</sub>); energia totală rămânând (aproape) aceeași, creșterea sarcinii cinetice se face pe seama sarcinii de presiune."
   ],
   [
    "Ce reprezintă distanța verticală dintre linia energetică și linia piezometrică?",
    "Sarcina cinetică αv²/(2g) în secțiunea respectivă: mică la intrare (câțiva mm), maximă în gât."
   ],
   [
    "Cum se măsoară viteza aerului cu tubul Pitot-Prandtl? Calculați viteza pentru Δp = 600 Pa și ρ = 1,2 kg/m³.",
    "Tubul are orificiul frontal (presiunea totală) și orificii laterale (presiunea statică); un manometru diferențial măsoară Δp = ρv²/2. v = √(2·600/1,2) = 31,6 m/s."
   ],
   [
    "Cum funcționează pompa cu jet din rezervorul de combustibil?",
    "O parte din combustibilul refulat de pompa electrică (sau returul) trece printr-o duză: jetul rapid are presiune statică scăzută (Bernoulli) și antrenează combustibilul din cealaltă cameră a rezervorului („șa”), pe care îl trimite în vasul pompei – fără piese în mișcare."
   ]
  ],
  "test": [
   {
    "q": "Ecuația de continuitate pentru un lichid incompresibil afirmă că:",
    "o": [
     "viteza este aceeași în toate secțiunile",
     "debitul Q = v·A este același în toate secțiunile",
     "presiunea este aceeași în toate secțiunile",
     "energia crește în gât"
    ],
    "c": 1,
    "e": "Masa (și volumul, la lichid incompresibil) se conservă: v<sub>1</sub>A<sub>1</sub> = v<sub>2</sub>A<sub>2</sub>."
   },
   {
    "q": "Dacă diametrul scade la jumătate, viteza medie:",
    "o": [
     "se dublează",
     "crește de 4 ori",
     "scade de 2 ori",
     "rămâne aceeași"
    ],
    "c": 1,
    "e": "v ~ 1/A ~ 1/d²: (2)² = 4."
   },
   {
    "q": "Piezometrul indică:",
    "o": [
     "presiunea totală",
     "cota piezometrică z + p/(ρg)",
     "sarcina cinetică",
     "pierderea de sarcină"
    ],
    "c": 1,
    "e": "Lichidul urcă în tub până la cota piezometrică; sarcina cinetică nu se vede în piezometru, ci în tubul Pitot."
   },
   {
    "q": "Coeficientul de debit al unui tub Venturi bine executat este:",
    "o": [
     "0,60…0,65",
     "0,95…0,99",
     "exact 1",
     "1,05…1,1"
    ],
    "c": 1,
    "e": "Pierderile în confuzor sunt mici; o diafragmă are C<sub>d</sub> ≈ 0,6."
   },
   {
    "q": "În regim turbulent, viteza din axă măsurată cu tubul Pitot raportată la viteza medie este:",
    "o": [
     "0,5",
     "1",
     "1,1…1,25",
     "2"
    ],
    "c": 2,
    "e": "Profilul turbulent este aplatizat; raportul 2 corespunde regimului laminar (parabolă)."
   },
   {
    "q": "Senzorul Δp al filtrului de particule semnalează necesitatea regenerării deoarece:",
    "o": [
     "Δp scade cu încărcarea",
     "la același debit de gaze, Δp crește cu încărcarea cu funingine",
     "măsoară temperatura",
     "măsoară viteza vehiculului"
    ],
    "c": 1,
    "e": "Funinginea mărește rezistența hidraulică a filtrului; ECU compară Δp cu valoarea de referință la debitul de gaze dat."
   }
  ]
 },
 {
  "nr": 5,
  "titlu": "Regimuri de curgere. Experiența lui Reynolds",
  "scop": "Vizualizarea regimurilor de curgere, determinarea numărului Reynolds critic superior și inferior și aplicarea criteriului Reynolds la curgerile din autovehicul.",
  "relatii": "Re = v·d/ν; &nbsp; v = 4Q/(πd²); &nbsp; d<sub>h</sub> = 4A/P.",
  "intrebari": [
   [
    "Ce reprezintă fizic numărul Reynolds?",
    "Raportul dintre forțele de inerție și forțele de vâscozitate (ρv²/d raportat la ηv/d²); la Re mic vâscozitatea amortizează perturbațiile (laminar), la Re mare inerția le amplifică (turbulent)."
   ],
   [
    "Care sunt valorile critice ale numărului Reynolds pentru conducte circulare?",
    "Re ≈ 2300 – sub această valoare regimul laminar este stabil; 2300…4000 – tranziție; peste 4000 – turbulent. Re critic superior poate fi mult mai mare la intrare netedă și apă liniștită."
   ],
   [
    "Cum se calculează diametrul hidraulic pentru un canal dreptunghiular de 4 × 20 mm?",
    "d<sub>h</sub> = 4A/P = 4·80/(2·(4 + 20)) = 6,67 mm."
   ],
   [
    "De ce uleiul rece curge laminar în galeriile motorului?",
    "Vâscozitatea uleiului rece este foarte mare (ν ≈ 170…570 mm²/s), deci Re = v·d/ν este de ordinul zecilor – mult sub 2300."
   ],
   [
    "De ce regimul turbulent favorizează răcirea?",
    "Fluctuațiile de viteză amestecă fluidul în secțiune, subțiază stratul limită termic de lângă perete și cresc coeficientul de transfer de căldură (Nu ~ Re<sup>0,8</sup>)."
   ]
  ],
  "test": [
   {
    "q": "Re pentru v = 0,106 m/s, d = 10 mm, ν = 1,004 mm²/s este:",
    "o": [
     "106",
     "1057",
     "10 570",
     "2300"
    ],
    "c": 1,
    "e": "0,106·0,01/1,004·10⁻⁶."
   },
   {
    "q": "În regim laminar viteza maximă în axă este:",
    "o": [
     "egală cu viteza medie",
     "dublul vitezei medii",
     "cu 20 % mai mare",
     "jumătate din medie"
    ],
    "c": 1,
    "e": "Profil parabolic."
   },
   {
    "q": "Diametrul hidraulic al unui canal 4 × 20 mm este:",
    "o": [
     "4 mm",
     "6,67 mm",
     "12 mm",
     "20 mm"
    ],
    "c": 1,
    "e": "4A/P."
   },
   {
    "q": "La încălzirea apei de la 10 la 20 °C, la același debit, Re:",
    "o": [
     "scade",
     "crește cu ≈ 30 %",
     "nu se schimbă",
     "se dublează"
    ],
    "c": 1,
    "e": "ν scade de la 1,306 la 1,004 mm²/s."
   },
   {
    "q": "Re critic la creșterea debitului față de cel la scădere este:",
    "o": [
     "mai mic",
     "mai mare",
     "egal",
     "nedefinit"
    ],
    "c": 1,
    "e": "Histerezis – laminarul persistă fără perturbații."
   }
  ]
 },
 {
  "nr": 6,
  "titlu": "Pierderi de sarcină longitudinale și locale într-un circuit de răcire",
  "scop": "Determinarea experimentală a lui λ pentru conducta dreaptă și a coeficienților ξ pentru lărgire, îngustare, cot și robinet, comparația cu relațiile de calcul și punctul de funcționare al pompei de lichid de răcire.",
  "relatii": "h<sub>d</sub> = λ·L/d·v²/2g; &nbsp; h<sub>l</sub> = ξ·v²/2g; &nbsp; λ = 0,3164/Re<sup>0,25</sup>; &nbsp; h<sub>r</sub> = M·Q², M = 8(λL/d + Σξ)/(gπ²d⁴).",
  "intrebari": [
   [
    "Care este diferența dintre pierderile de sarcină longitudinale și cele locale?",
    "Pierderile longitudinale sunt distribuite pe lungimea tronsoanelor drepte (frecare la perete, proporționale cu L/d), cele locale apar concentrat la schimbările de direcție sau de secțiune (cot, lărgire, robinet) prin desprinderi și vârtejuri."
   ],
   [
    "De ce depinde coeficientul λ în regim laminar și în regim turbulent rugos?",
    "În regim laminar numai de Re (λ = 64/Re); în regim turbulent rugos numai de rugozitatea relativă k/d (λ independent de Re)."
   ],
   [
    "Cum se determină experimental coeficientul ξ al unui cot?",
    "Se măsoară Δh între prizele de dinainte și de după cot, se scade pierderea longitudinală pe țeava dreaptă dintre prize (λ·L/d·v²/2g) și se împarte la v²/2g."
   ],
   [
    "Ce este caracteristica unui circuit hidraulic și cum se determină punctul de funcționare al pompei?",
    "Curba h = M·Q² a pierderilor circuitului; punctul de funcționare este intersecția ei cu caracteristica H(Q) a pompei."
   ],
   [
    "Cum se modifică debitul de lichid de răcire când radiatorul se colmatează parțial?",
    "Crește ξ al radiatorului, deci M; caracteristica circuitului devine mai abruptă și intersecția cu curba pompei se mută la debit mai mic și sarcină mai mare."
   ]
  ],
  "test": [
   {
    "q": "λ măsurat pentru Δh = 352 mm pe 1,5 m, d = 17 mm, v²/2g = 0,1583 m este:",
    "o": [
     "0,0152",
     "0,0252",
     "0,0352",
     "0,252"
    ],
    "c": 1,
    "e": "0,352/(88,2·0,1583)."
   },
   {
    "q": "La lărgirea bruscă cota piezometrică:",
    "o": [
     "scade întotdeauna",
     "poate crește, deși se pierde energie",
     "rămâne constantă",
     "devine negativă"
    ],
    "c": 1,
    "e": "Scăderea sarcinii cinetice depășește pierderea."
   },
   {
    "q": "ξ Borda–Carnot pentru lărgirea 17/26 mm este:",
    "o": [
     "0,11",
     "0,33",
     "0,57",
     "1,0"
    ],
    "c": 1,
    "e": "(1 − 0,4275)²."
   },
   {
    "q": "Pierderea totală a circuitului crește cu debitul:",
    "o": [
     "liniar",
     "cu pătratul debitului",
     "cu radical din debit",
     "nu depinde"
    ],
    "c": 1,
    "e": "h = M·Q² (regim turbulent)."
   },
   {
    "q": "Dacă M se dublează, debitul pompei cu H = 4 − 10⁷Q² (M inițial 10⁷):",
    "o": [
     "scade la jumătate",
     "scade cu ≈ 18 %",
     "crește",
     "rămâne același"
    ],
    "c": 1,
    "e": "√(4/2·10⁷) → √(4/3·10⁷): 0,447 → 0,365 L/s."
   }
  ]
 }
];
