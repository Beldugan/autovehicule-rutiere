# Autovehicule rutiere – laboratoare virtuale și proiecte

Portal static (GitHub Pages) cu laboratoarele virtuale ale disciplinelor predate la specializarea Autovehicule rutiere (FIMIM, Universitatea „Ovidius” din Constanța), grupate pe semestre.

- `index.html` – pagina principală (semestre → discipline), temă luminoasă/întunecată
- `comun/` – nucleul comun: cadrul lucrărilor (simulator, determinări, teorie, verificare, referat), sesiune și prezență, grafice, desene SVG, configurare
- `mf/`, `da/`, `saa/`, `mam1/`, `pcmai/` – disciplinele; fiecare lucrare are `lN/` cu `model.js` (modelul fizic, folosit și pe server) și `lab.js`
- `server/Code.gs` – scriptul Google Apps Script (prezență, verificarea referatelor, documentul Google pentru Classroom); se generează cu `tools/build_server.py`. Cheia secretă stă doar în Script Properties.

Asist. univ. drd. ing. Adrian-Mircea Beldugan
