# -*- coding: utf-8 -*-
"""Preia aplicațiile de calcul ale îndrumarelor PCMAI (MAS/MAC, electric, hibrid, moto, utilitare) în pcmai/proiect/calc/
și le adaptează pentru aplicația de proiect: tipul propulsiei vine din aplicație, starea se salvează, rezultatele sunt
transmise modulelor M/S/F, capitolele poartă numerotarea îndrumarului.
Utilizare: python3 tools/pcmai_import.py "<dosarul AR IF>" """
import os, re, shutil, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/AR IF"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pcmai", "proiect", "calc")

SURSE = {
    "mai": ("PCMAI MAC MAS pr/calcul-termic/calcul-termic", ["tabele.js", "calc.js", "app.js"]),
    "ev": ("PCMAI electric pr/calcul-electric", ["ciclu.js", "presets.js", "ev.js", "app.js"]),
    "hev": ("PCMAI hibrid pr/PCMAI hibrid proiect/calcul-hibrid", ["ciclu.js", "presets.js", "hev.js", "app.js"]),
    "moto": ("PCMAI moto/calcul-moto", ["tabele.js", "wmtc.js", "presets.js", "moto.js", "app.js"]),
    "lcv": ("PCMAI utilitare/calcul-utilitare", ["cicluri.js", "presets.js", "lcv.js", "app.js"]),
}


def inlocuieste(txt, vechi, nou, n=1, fis=""):
    k = txt.count(vechi)
    if k != n:
        raise SystemExit(f"{fis}: «{vechi[:60]}» apare de {k} ori (așteptat {n})")
    return txt.replace(vechi, nou)


def patch_generic(txt, fis, preset):
    # 1) cârligul către aplicație la fiecare afișare (rezultatele pentru modulele M/S/F și salvarea proiectului)
    txt = inlocuieste(txt, "  function render() {\n", "  function render() {\n    if (window.PCMAI_SHELL) PCMAI_SHELL.rezultat(S, R);\n", 1, fis)
    # 2) pornirea: exemplul ales / proiectul salvat
    vechi = f'initState("{preset}"); renderForm(); compute();'
    nou = (f'initState(window.PCMAI_SHELL ? PCMAI_SHELL.exemplu("{preset}") : "{preset}"); '
           'if (window.PCMAI_SHELL) PCMAI_SHELL.restaureaza(S); renderForm(); compute();')
    txt = inlocuieste(txt, vechi, nou, 1, fis)
    return txt


def patch_mai(txt):
    f = "mai/app.js"
    txt = inlocuieste(txt, 'const CHEIE_STOCARE = "pcmai-calcul-termic-v1";',
                      'const TIP_SHELL = (window.PCMAI_SHELL && PCMAI_SHELL.tipMotor) || "MAS";\n'
                      '  const CHEIE_STOCARE = "pcmai-proiect-" + TIP_SHELL;', 1, f)
    # starea: numai din stocarea proiectului (fără #hash), cu tipul impus de aplicație
    txt = inlocuieste(txt, """    try {
      if (location.hash.length > 1) s = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    } catch (e) { s = null; }
    if (!s) {
      try { s = JSON.parse(localStorage.getItem(CHEIE_STOCARE)); } catch (e) { s = null; }
    }
    const baza = Object.assign({}, EXEMPLE.MAS, OPT_IMPLICIT);
    return Object.assign(baza, s || {});""", """    try { s = JSON.parse(localStorage.getItem(CHEIE_STOCARE)); } catch (e) { s = null; }
    if (s && s.stare) s = s.stare;
    const baza = Object.assign({}, EXEMPLE[TIP_SHELL], OPT_IMPLICIT);
    return Object.assign(baza, s || {}, { tip: TIP_SHELL });""", 1, f)
    txt = inlocuieste(txt, """    try { localStorage.setItem(CHEIE_STOCARE, JSON.stringify(stare)); } catch (e) { /* stocare indisponibilă */ }
    try { history.replaceState(null, "", "#" + encodeURIComponent(JSON.stringify(stare))); } catch (e) { /* ignorat */ }""",
                      """    if (window.PCMAI_SHELL) return; // salvarea o face aplicația de proiect (împreună cu tema)
    try { localStorage.setItem(CHEIE_STOCARE, JSON.stringify(stare)); } catch (e) { /* stocare indisponibilă */ }""", 1, f)
    txt = inlocuieste(txt, "    afiseazaSumar(lipsa);\n    afiseazaTab();\n  }",
                      "    afiseazaSumar(lipsa);\n    afiseazaTab();\n    if (window.PCMAI_SHELL) PCMAI_SHELL.rezultat(stare, rezultat);\n  }", 1, f)
    # capitolele, în ordinea fișei disciplinei (alegerea parametrilor inițiali este pagina „Tema”)
    # arderea izocoră și arderea izobară: capitole separate (4 și 5 în fișa disciplinei)
    txt = inlocuieste(txt, '      ["Arderea izobară (numai MAC; la MAS g<sub>p</sub> = 0 și T<sub>z</sub> = T<sub>y</sub>)"],',
                      '    ],\n    ArdereP: [\n      ["Arderea izobară (numai MAC; la MAS g<sub>p</sub> = 0 și T<sub>z</sub> = T<sub>y</sub>)"],', 1, f)
    txt = inlocuieste(txt, 'const TABURI = ["Admisie", "Comprimare", "Ardere", "Destindere", "Performanțe", "Verificări", "Diagrama", "Caracteristica", "Tabele"];',
                      'const TABURI = ["Admisie", "Comprimare", "Ardere", "ArdereP", "Destindere", "Performanțe", "Diagrama", "Caracteristica", "Dimensiuni", "Verificări", "Tabele"];\n'
                      '  const ETICHETE = { Admisie: "2. Admisia", Comprimare: "3. Comprimarea", Ardere: "4. Arderea izocoră", ArdereP: "5. Arderea izobară", Destindere: "6. Destinderea",\n'
                      '    "Performanțe": "7. Parametrii indicați, efectivi și constructivi", Diagrama: "8. Diagrama indicată p–V", Caracteristica: "9. Indicatorii de performanță",\n'
                      '    Dimensiuni: "10. Recapitularea dimensiunilor", "Verificări": "11. Verificări și susținere", Tabele: "Anexa A · tabelele u, i" };', 1, f)
    txt = inlocuieste(txt, 'data-tab="${n}">${n}</button>', 'data-tab="${n}">${ETICHETE[n] || n}</button>', 1, f)
    txt = inlocuieste(txt, '    else if (tabActiv === "Tabele") c.innerHTML = vedereTabele();',
                      '    else if (tabActiv === "Tabele") c.innerHTML = vedereTabele();\n'
                      '    else if (tabActiv === "Dimensiuni") c.innerHTML = window.PCMAI_SHELL ? PCMAI_SHELL.dimensiuni(rezultat) : "";', 1, f)
    txt = inlocuieste(txt, 'return `<section class="foaie-tipar"><h2>${t}</h2>', 'return `<section class="foaie-tipar"><h2>${ETICHETE[t] || t}</h2>', 1, f)
    # un singur buton „Tipărește” (cel al aplicației); exportul CSV rămâne
    return txt


ETICHETE = {
    "ev": [('"Cerințe (cap. 2)"', '"2. Cerințe de putere și energie"'), ('"Dimensionare (cap. 3)"', '"3. Arhitectura și dimensionarea"'),
           ('"Simulare WLTC (cap. 5)"', '"5. Simularea pe ciclul WLTC"'), ('"Autonomie (§5.4)"', '"5.4 Autonomia în condiții reale"'),
           ('"Încărcare și termic (cap. 6–7)"', '"6–7. Încărcarea și managementul termic"'), ('"Variante (cap. 8)"', '"8. Variante de arhitectură"'),
           ('"Cost și CO₂ (cap. 9)"', '"9. Analiza tehnico-economică și CO₂"'), ('"Verificări (§12.2)"', '"10. Verificări"')],
    "hev": [('"Cerințe (cap. 2)"', '"2. Cerințe de putere și energie"'), ('"Dimensionare (cap. 3)"', '"3. Arhitectura și dimensionarea"'),
            ('"Simulare WLTC (cap. 5–6)"', '"5–6. Strategia EMS și simularea WLTC"'), ('"Verificări (§11.2)"', '"6. Verificări"'),
            ('"Optimizare (cap. 7)"', '"7. Optimizarea (ECMS)"'), ('"Cost (cap. 8)"', '"8. Analiza tehnico-economică"')],
    "moto": [('"Calcul termic (cap. 3–4)"', '"3–4. Ciclul de calcul și parametrii"'), ('"Schimbul de gaze (cap. 2)"', '"2. Schimbul de gaze"'),
             ('"Diagrama și caracteristica (cap. 5)"', '"5. Diagrama și caracteristica"'), ('"Dinamica, volantul, echilibrarea (cap. 6–7)"', '"6–7. Dinamica, volantul, echilibrarea"'),
             ('"Răcirea (cap. 8)"', '"8. Bilanțul energetic și răcirea"'), ('"Transmisia și performanțele (cap. 9)"', '"9. Transmisia și performanțele"'),
             ('"Verificări (§12.2)"', '"10. Verificări"')],
    "lcv": [('"Mase și dimensionare (cap. 1–3)"', '"1–3. Mase și dimensionare"'), ('"Validare WLTC"', '"3.5 Validarea pe ciclul WLTC"'),
            ('"Traseu și sarcină utilă (cap. 2, 5)"', '"2. Traseul de livrări și sarcina utilă"'), ('"Tura zilnică (cap. 3, 5)"', '"5. Tura zilnică"'),
            ('"Agregat frigorific (cap. 4)"', '"4. Agregatul frigorific (ePTO)"'), ('"Cicluri de conducere (§2.2, §8.7)"', '"5.3 Cicluri de conducere"'),
            ('"Încărcare la depou (cap. 6)"', '"6. Încărcarea la depou"'), ('"Cost pe km (cap. 7)"', '"7. Costul pe kilometru"'), ('"Verificări (§10.2)"', '"8. Verificări"')],
}
# moto: ordinea capitolelor din îndrumar (schimbul de gaze înaintea ciclului)
ORDINE_MOTO = ('const TAB = [["termic", "3–4. Ciclul de calcul și parametrii"], ["gaze", "2. Schimbul de gaze"],',
               'const TAB = [["gaze", "2. Schimbul de gaze"], ["termic", "3–4. Ciclul de calcul și parametrii"],')
PRESET = {"ev": "SPRING", "hev": "P2_HEV", "moto": "EX2T", "lcv": "EJ75"}

os.makedirs(DST, exist_ok=True)
for k, (d, fisiere) in SURSE.items():
    out = os.path.join(DST, k)
    os.makedirs(out, exist_ok=True)
    for fis in fisiere:
        src = os.path.join(SRC, d, fis)
        if k == "lcv" and fis == "cicluri.js":
            shutil.copy(os.path.join(SRC, SURSE["ev"][0], "ciclu.js"), os.path.join(out, "ciclu.js"))
        txt = open(src, encoding="utf-8").read()
        if fis == "app.js":
            if k == "mai":
                txt = patch_mai(txt)
            else:
                for a, b in ETICHETE[k]:
                    txt = inlocuieste(txt, a, b, 1, f"{k}/app.js")
                if k == "moto":
                    txt = inlocuieste(txt, *ORDINE_MOTO, 1, "moto/app.js")
                txt = patch_generic(txt, f"{k}/app.js", PRESET[k])
        open(os.path.join(out, fis), "w", encoding="utf-8").write(txt)
    print(k, "→", sorted(os.listdir(out)))
