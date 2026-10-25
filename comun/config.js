/* Configurarea portalului: disciplinele, lucrările și adresele registrelor de prezență (câte o foaie Google pe disciplină) */
"use strict";

const PORTAL = {
  program: "Autovehicule Rutiere",
  facultate: "FIMIM",
  univ: "Universitatea „Ovidius” din Constanța",
  cadru: "Asist. univ. drd. ing. Adrian-Mircea Beldugan",
  an: "2026-2027",
  domeniuEmail: "",                       // ex. "365.univ-ovidius.ro" – gol: orice cont Google
  referat: { minConcluzii: 250, minDurataMin: 8 },

  discipline: {
    MF: {
      nume: "Mecanica fluidelor", an: "anul II", sem: 1, cod: "MR2104", tip: "Laborator", dosar: "mf",
      indrumar: "Îndrumar de laborator – Mecanica fluidelor (I. Omer, A.-M. Beldugan, 2026)",
      pdf: "mf/indrumar-mecanica-fluidelor.pdf",
      endpoint: "https://script.google.com/macros/s/AKfycbwOr2gf7rGCzz3zEO1B-CgpRfqALPQptHUGhMu1Tsf86cdCo7prsaIFFJx5NfeLduQoDA/exec",
      lucrari: [
        "Vâscozitatea uleiurilor de motor în funcție de temperatură",
        "Compresibilitatea lichidului de frână și efectul aerului din circuit",
        "Legea lui Pascal: transmiterea hidraulică a forței în sistemul de frânare",
        "Ecuația lui Bernoulli și măsurarea debitului: tubul Venturi și tubul Pitot",
        "Regimuri de curgere. Experiența lui Reynolds",
        "Pierderi de sarcină longitudinale și locale într-un circuit de răcire",
        "Definitivarea și susținerea referatelor"
      ]
    },
    DA: {
      nume: "Diagnosticarea autovehiculelor", an: "anul IV", sem: 1, cod: "MR4103", tip: "Laborator", dosar: "da",
      indrumar: "Îndrumar de laborator – Diagnosticarea autovehiculelor (T. Dordea; revizuire A.-M. Beldugan, 2026)",
      pdf: "da/indrumar-diagnosticarea-autovehiculelor.pdf",
      endpoint: "https://script.google.com/macros/s/AKfycbz801hXDRXLdwi1OTapwGxsVn06JXIGCrxcCLV73199XyTrdIiHjAgG-tj6forWJPJmQA/exec",
      lucrari: [
        "Diagnoza computerizată și rețeaua de date CAN",
        "Senzori și actuatori – date live și semnale reale",
        "Starea mecanică a motorului",
        "Sistemul de alimentare MAS și analiza gazelor de evacuare",
        "Motorul diesel common rail și sistemele de post-tratare (EGR, DPF, SCR)",
        "Sistemul de frânare cu ABS/ESC și sistemele ADAS",
        "Vehicule electrice și hibride; diagnoza pe bază de date"
      ]
    },
    SAA: {
      nume: "Sisteme auxiliare ale autovehiculelor", an: "anul IV", sem: 1, cod: "MR4104", tip: "Laborator", dosar: "saa",
      indrumar: "Îndrumar de laborator – Sisteme auxiliare ale autovehiculelor (A.-M. Beldugan, 2026)",
      pdf: "saa/indrumar-sisteme-auxiliare.pdf",
      endpoint: "https://script.google.com/macros/s/AKfycbz1p0eyt66dMHx_AQEnzSiCB6E8qMahZ0iZoCIm10xsqhP4u44oa3Sy5hGgRzgjGB0-zg/exec",
      lucrari: [
        "Sistemul de injecție de benzină multipunct – caracteristicile de funcționare (motorul 1.4 MPI)",
        "Modelarea duratei de injecție pe baza debitului de aer – aplicație virtuală",
        "Sistemul de injecție common-rail – presiunea în rampă și injecția multiplă (motorul 1.5 dCi)",
        "Sistemul de ungere – caracteristica presiunii uleiului",
        "Sistemul de răcire și managementul termic",
        "Sistemul de supraalimentare – presiunea de supraalimentare și actuatorii turbosuflantei",
        "Sistemul de pornire și bilanțul energetic stop-start și mild-hybrid 48 V",
        "Sistemul de climatizare și pompa de căldură"
      ]
    },
    MAM1: {
      nume: "Mecatronica automobilului modern I", an: "anul IV", sem: 1, cod: "MR4105", tip: "Laborator", dosar: "mam1",
      indrumar: "Îndrumar de laborator – Mecatronica automobilului modern I (2026)",
      endpoint: "https://script.google.com/macros/s/AKfycbynSqzjkqNO18yZWA8mbz1yQNdjzTAJuzZX8s-MQWvZryUHd8i0F2GlToenUnf5ydc/exec",
      lucrari: [
        "Microcontrolere: intrări/ieșiri, convertor A/D, timere, întreruperi și PWM",
        "Condiționarea semnalelor și conversia analog-digitală",
        "Senzorul pedalei de accelerație cu două piste: plauzibilitate și reacția la defect",
        "Senzori de temperatură: liniarizare și constanta de timp",
        "Senzorul de presiune absolută din colector (MAP): calibrare și densitatea aerului",
        "Senzori de turație și poziție: decodarea roții 60−2 prin captură de intrare",
        "Senzori ultrasonici de parcare: timpul de propagare și compensarea cu temperatura",
        "Senzori inerțiali (IMU): ruliu și tangaj, filtrul complementar",
        "Clapeta electronică de accelerație: punte H, PWM și regulator PID",
        "Magistrala CAN: construirea mesajelor, arbitrajul și decodarea semnalelor"
      ]
    },
    PCMAI: {
      nume: "Procese și caracteristici ale motoarelor cu ardere internă", scurt: "PCMAI", an: "anul III", sem: 1, cod: "MM3104", tip: "Proiect", dosar: "pcmai",
      indrumar: "Îndrumare de proiect PCMAI (C. Tudor, A.-M. Beldugan, 2026)",
      endpoint: "",
      lucrari: []
    }
  },
  /** lucrările deja realizate în portal: cod → cale */
  realizate: { "mf-l1": "mf/l1/", "mf-l2": "mf/l2/", "mf-l3": "mf/l3/", "mf-l4": "mf/l4/", "da-l1": "da/l1/", "da-l2": "da/l2/", "da-l3": "da/l3/", "da-l4": "da/l4/", "saa-l1": "saa/l1/", "saa-l2": "saa/l2/", "saa-l3": "saa/l3/", "saa-l4": "saa/l4/", "saa-l5": "saa/l5/", "mam1-l1": "mam1/l1/", "mam1-l2": "mam1/l2/", "mam1-l3": "mam1/l3/", "mam1-l4": "mam1/l4/", "mam1-l5": "mam1/l5/" }
};
