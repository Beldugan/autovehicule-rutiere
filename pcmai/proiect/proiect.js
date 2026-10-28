/* Proiectul PCMAI pe capitole – aplicația de proiect:
   • tipul autovehiculului (autoturism MAS / MAC, electric, hibrid, motocicletă, autoutilitară electrică) și tema studentului;
   • capitolele îndrumarului de proiect al tipului ales (motoarele de calcul ale îndrumarelor, în dosarul calc/);
   • modulele de simulare internă M (dinamică multicorp), S (simulare de sistem), F (CFD), cu macheta 3D (dosarul module/);
   • salvarea proiectului în browser și în fișier, memoriul tipărit (PDF din dialogul de tipărire). */
"use strict";
(function () {
  const V = "17";
  const TIPURI = {
    MAS: { nume: "Autoturism cu MAS", sub: "motor cu aprindere prin scânteie · calcul termic, dinamic, 0D", dir: "mai", motor: "MAS",
      scripturi: ["tabele.js", "calc.js", "extra.js", "app.js"], exemple: [["exemplu", "MAS", "Exemplul MAS din îndrumar (cap. 10)"]],
      csv: "Rezultatele (CSV)", ciclu: false, indrumar: "Îndrumar de proiect PCMAI, ed. a II-a (MAS și MAC)", icon: "mas" },
    MAC: { nume: "Autoturism cu MAC", sub: "motor cu aprindere prin comprimare · calcul termic, dinamic, 0D", dir: "mai", motor: "MAC",
      scripturi: ["tabele.js", "calc.js", "extra.js", "app.js"], exemple: [["exemplu", "MAC", "Exemplul MAC din îndrumar (cap. 11)"]],
      csv: "Rezultatele (CSV)", ciclu: false, indrumar: "Îndrumar de proiect PCMAI, ed. a II-a (MAS și MAC)", icon: "mac" },
    BEV: { nume: "Autoturism electric", sub: "BEV · motor, reductor, baterie, autonomie, încărcare", dir: "ev",
      scripturi: ["ciclu.js", "presets.js", "ev.js", "app.js"], exemple: [["preset", "SPRING", "Autoturism mic (cap. 10)"], ["preset", "SCENIC", "SUV (cap. 11)"]],
      csv: "Simularea WLTC (CSV)", ciclu: true, indrumar: "Proiectarea sistemelor de propulsie electrice ale autovehiculelor", icon: "bev" },
    HEV: { nume: "Autoturism hibrid", sub: "HEV / PHEV · serie, paralel P2, serie-paralel · EMS", dir: "hev",
      scripturi: ["ciclu.js", "presets.js", "hev.js", "app.js"], exemple: [["preset", "P2_HEV", "HEV paralel P2 (cap. 9)"], ["preset", "PS_PHEV", "PHEV serie-paralel (cap. 10)"]],
      csv: "Simularea WLTC (CSV)", ciclu: true, indrumar: "Proiectarea sistemelor de propulsie hibride ale automobilelor", icon: "hev" },
    MOTO: { nume: "Motocicletă", sub: "MAS în doi sau patru timpi · baleiaj, echilibrare, WMTC", dir: "moto",
      scripturi: ["tabele.js", "wmtc.js", "presets.js", "moto.js", "app.js"], exemple: [["preset", "EX2T", "2T 300 cm³ (cap. 10)"], ["preset", "EX4T", "4T 690 cm³ (cap. 11)"]],
      csv: "Diagrama indicată (CSV)", ciclu: false, indrumar: "Proiectarea sistemelor de propulsie cu MAS în 2T și 4T ale vehiculelor cu două roți", icon: "moto" },
    LCV: { nume: "Autoutilitară electrică", sub: "furgon de livrări · tura zilnică, ePTO frigorific, depou", dir: "lcv",
      scripturi: ["ciclu.js", "cicluri.js", "presets.js", "lcv.js", "app.js"], exemple: [["preset", "EJ75", "Furgon 75 kWh (cap. 8)"], ["preset", "EJ75F", "Furgon frigorific (cap. 9)"]],
      csv: "Tura zilnică (CSV)", ciclu: true, indrumar: "Proiectarea sistemelor de propulsie electrice ale autoutilitarelor", icon: "lcv" }
  };
  const MODULE = [
    { id: "M", nume: "Modulul M · dinamică multicorp", reper: "mecanism, angrenaje, vibrații", fis: "modul-m.js" },
    { id: "S", nume: "Modulul S · simulare de sistem", reper: "vehiculul pe ciclu, fluxuri de putere", fis: "modul-s.js" },
    { id: "F", nume: "Modulul F · CFD", reper: "câmpuri în cilindru și în placa de răcire", fis: "modul-f.js" }
  ];
  const ICON = {
    mas: '<path d="M6 20h20M9 20v-7h14v7M12 13V9h8v4M16 9V5M14 5h4" /><circle cx="16" cy="25" r="2"/>',
    mac: '<path d="M6 20h20M9 20v-7h14v7M12 13V9h8v4" /><path d="M16 9l-2-4h4z"/><circle cx="16" cy="25" r="2"/>',
    bev: '<rect x="6" y="9" width="18" height="14" rx="2"/><path d="M24 14h3v4h-3M16 11l-4 6h4l-1 4 4-6h-4z"/>',
    hev: '<rect x="4" y="12" width="10" height="9" rx="1.5"/><path d="M14 16h4"/><circle cx="23" cy="16.5" r="5"/><path d="M23 13.5l-2 3h2.5l-1 3"/>',
    moto: '<circle cx="8" cy="21" r="4.5"/><circle cx="24" cy="21" r="4.5"/><path d="M8 21l5-8h6l5 8M13 13h-3M19 13l2-3h3"/>',
    lcv: '<path d="M3 21V9h16v12M19 13h5l4 4v4h-9"/><circle cx="8" cy="22.5" r="2.4"/><circle cx="23" cy="22.5" r="2.4"/>'
  };

  const par = new URLSearchParams(location.search);
  let tip = par.get("tip");
  if (!TIPURI[tip]) tip = null;
  const T = tip ? TIPURI[tip] : null;
  const CH_TEMA = "pcmai-tema", CH_PR = "pcmai-proiect-" + (tip || ""), CH_MOD = "pcmai-mod-" + (tip || "");
  let tema = Object.assign({ nume: "", grupa: "", an: PORTAL.an, varianta: "", titlu: "", indrumator: PORTAL.cadru, gabarit: { cL: 1.1, cH: 2.2, cE: 0.95, cB: 2 } }, Stocare.citeste(CH_TEMA, {}));
  if (/Tudor/.test(tema.indrumator || "")) tema.indrumator = PORTAL.cadru;
  const salvatPr = tip ? Stocare.citeste(CH_PR, null) : null;

  /* ------------------------------------------------------------------ antet */
  function antet(titlu, sub) {
    return `<header class="antet">
      <div class="antet-text"><div class="marca"><img src="../../comun/icon.svg" alt="" width="18" height="18">Autovehicule Rutiere <span>· Proiect PCMAI</span></div>
      <p class="supratitlu">${esc(PORTAL.univ)} · ${esc(PORTAL.facultate)} · ${esc(PORTAL.an)}</p><h1>${titlu}</h1><p>${sub}</p></div>
      <div class="antet-butoane"><a class="buton" href="../index.html">← PCMAI</a>${Tema.html()}</div></header>`;
  }
  const svgIcon = (k, s = 30) => `<svg viewBox="0 0 32 32" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
  const carduriTip = (activ) => Object.entries(TIPURI).map(([k, t]) =>
    `<a class="pc-tip${k === activ ? " activ" : ""}" href="?tip=${k}" ${k === activ ? 'aria-current="page"' : ""}>${svgIcon(t.icon)}<span><b>${t.nume}</b><small>${t.sub}</small></span></a>`).join("");

  /* ------------------------------------------------------------------ pagina de alegere a tipului */
  if (!tip) {
    document.title = "Proiect PCMAI – alegerea autovehiculului";
    const ultim = Stocare.citeste("pcmai-tip", null);
    document.body.innerHTML = antet("Proiectul PCMAI – alegerea autovehiculului", "Procese și caracteristici ale motoarelor cu ardere internă · MM3104 · proiect, anul III") + `
    <main class="pagina">
      <section class="card"><h2>1. Tipul autovehiculului din tema de proiectare</h2>
        <p class="nota">Alegeți tipul autovehiculului; aplicația deschide capitolele îndrumarului corespunzător (datele de intrare, calculele, verificările, graficele) și cele trei module de simulare: M – dinamică multicorp, S – simulare de sistem, F – CFD, fiecare cu macheta 3D.${ultim && TIPURI[ultim] ? ` Ultimul proiect deschis: <a href="?tip=${ultim}">${TIPURI[ultim].nume}</a>.` : ""}</p>
        <div class="pc-tipuri mari">${carduriTip(null)}</div></section>
      <section class="card"><h2>Etapele proiectului</h2>
        <ol class="pc-etape"><li><b>Tema și datele inițiale</b> – tipul autovehiculului, parametrii de intrare (puterea, turația, numărul de cilindri, combustibilul, raportul de comprimare …; la propulsiile electrice și hibride masa, aerodinamica, cerințele de performanță și autonomie).</li>
        <li><b>Capitolele de calcul</b> ale îndrumarului: fiecare cu relațiile, valorile numerice, verificările față de intervalele uzuale și graficele.</li>
        <li><b>Modulele de simulare</b>: mecanismul și transmisia (M), sistemul pe ciclul de conducere (S), câmpurile din cilindru sau din placa de răcire (F); fiecare are un test de referință verificat analitic.</li>
        <li><b>Memoriul</b>: se tipărește (sau se salvează PDF) cu toate capitolele; proiectul se salvează în browser și se poate exporta într-un fișier.</li></ol></section>
    </main><footer class="subsol"><p>${esc(PORTAL.cadru)} · ${esc(PORTAL.univ)}, ${PORTAL.an}</p></footer>`;
    Tema.leaga();
    return;
  }

  /* ------------------------------------------------------------------ pagina proiectului */
  Stocare.scrie("pcmai-tip", tip);
  document.title = `Proiect PCMAI – ${T.nume}`;
  const ex = T.exemple.map(([a, k, t]) => `<button type="button" data-${a}="${k}">${t}</button>`).join("");
  document.body.innerHTML = antet(`Proiect PCMAI · ${T.nume}`, `${esc(T.indrumar)} · A.-M. Beldugan, 2026`) + `
  <div class="pc-bara-tip nu-tipari"><div class="pc-tipuri">${carduriTip(tip)}</div></div>
  <main class="pagina pc-grila" data-mod="tema">
    <nav class="pc-nav nu-tipari" aria-label="Capitolele proiectului">
      <div class="pc-grup"><span class="pc-gt">Proiect</span><button type="button" class="pc-b" data-mod="tema">1. Tema și datele inițiale</button></div>
      <div class="pc-grup"><span class="pc-gt">Capitolele îndrumarului</span><nav id="taburi" class="pc-cap" role="tablist"></nav></div>
      <div class="pc-grup"><span class="pc-gt">Module de simulare internă</span>
        ${MODULE.map(m => `<button type="button" class="pc-b pc-m" data-mod="${m.id}"><span class="pc-mi">${m.id}</span><span>${m.nume.split(" · ")[1]}<small>${m.reper} · <i class="pc-st" data-st="${m.id}">pregătit</i></small></span></button>`).join("")}</div>
      <div class="pc-grup"><span class="pc-gt">Predare</span>
        <button type="button" class="pc-b" id="pc-memoriu">Memoriul (tipărire / PDF)</button>
        <button type="button" class="pc-b" id="pc-export">Salvează proiectul în fișier</button>
        <label class="pc-b pc-imp">Încarcă un proiect salvat<input type="file" id="pc-import" accept=".json,application/json" hidden></label>
        <span class="pc-salvat" id="pc-salvat"></span></div>
    </nav>
    <section class="pc-lucru" id="app">
      <div class="pc-coperta doar-tipar-pc" id="pc-coperta"></div>
      <div id="sumar" class="sumar"></div>
      <section class="pc-panou" data-panou="tema">
        <div class="card pc-tema nu-tipari-in"><h2>1.1 Tema de proiectare</h2>
          <div class="pc-tema-grila">
            <label class="pc-c">Numele și prenumele<input data-t="nume" autocomplete="name"></label>
            <label class="pc-c">Grupa<input data-t="grupa"></label>
            <label class="pc-c">Anul universitar<input data-t="an"></label>
            <label class="pc-c">Varianta temei<input data-t="varianta" placeholder="ex. 7"></label>
            <label class="pc-c pc-lat">Tema (autovehiculul proiectat)<input data-t="titlu" placeholder="ex. Autoturism de clasă compactă, 4 locuri"></label>
            <label class="pc-c">Îndrumător<input data-t="indrumator"></label>
          </div>
          <p class="nota">Tipul autovehiculului: <b>${T.nume}</b> (se schimbă din bara de sus; fiecare tip are proiectul lui, salvat separat în acest browser).</p></div>
        <div class="card pc-date"><h2>1.2 Datele inițiale și parametrii de calcul</h2>
          <p class="nota">Porniți de la exemplul rezolvat din îndrumar și înlocuiți valorile cu cele ale temei proprii; intervalele recomandate sunt în Tabelul 1.1 din îndrumar. Calculul tuturor capitolelor și al modulelor se reia automat la fiecare modificare.</p>
          <div class="exemple"><span>Exemple din îndrumar:</span>${ex}</div>
          <form id="formular" autocomplete="off"></form></div>
      </section>
      <section class="pc-panou" data-panou="cap">
        <div class="pc-unelte nu-tipari"><button type="button" id="btn-csv">${T.csv}</button><button type="button" id="btn-ciclu"${T.ciclu ? "" : " hidden"}>Ciclul WLTC (CSV)</button><button type="button" id="btn-print" hidden>Tipărește</button></div>
        <div id="continut"></div>
      </section>
      <section class="pc-panou" data-panou="modul"><div id="modul"></div></section>
      <div id="pc-raport" class="doar-tipar-pc"></div>
    </section>
  </main>
  <footer class="subsol"><p>Calculele capitolelor sunt cele ale îndrumarelor de proiect (aceleași relații și aceleași rezultate ca exemplele rezolvate). Modulele M, S și F sunt simulatoare interne, fiecare verificat cu teste de referință analitice.</p>
  <p>${esc(PORTAL.cadru)} · ${esc(PORTAL.univ)}, ${PORTAL.an}</p></footer>`;
  Tema.leaga();

  // tema studentului
  $$("[data-t]").forEach(el => { el.value = tema[el.dataset.t] ?? ""; el.addEventListener("input", () => { tema[el.dataset.t] = el.value; Stocare.scrie(CH_TEMA, tema); marcheazaSalvat(); }); });

  /* ------------------------------------------------------------------ starea proiectului (salvare) */
  let ultimS = null, ultimR = null, tSalv = null, rev = 0, hash = "";
  const OMIS = new Set(["variante", "ecms", "res", "sweep"]);
  const curat = (S) => JSON.parse(JSON.stringify(S, (k, v) => (OMIS.has(k) ? undefined : v)));
  function salveaza() {
    if (!ultimS) return;
    try { const o = { versiune: 1, tip, salvat: new Date().toISOString(), stare: curat(ultimS) }; const s = JSON.stringify(o); if (s.length < 400000) localStorage.setItem(CH_PR, s); marcheazaSalvat(); } catch (e) { /* stocare indisponibilă */ }
  }
  function marcheazaSalvat() { const el = $("#pc-salvat"); if (el) el.textContent = "salvat în browser · " + new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); }

  /* ------------------------------------------------------------------ API pentru motoarele de calcul și module */
  const asc = [];
  window.PCMAI_SHELL = {
    tip, tipMotor: T.motor || null, TIPURI,
    exemplu(def) { const k = salvatPr && salvatPr.stare && salvatPr.stare.key; return k || def; },
    restaureaza(S) { if (salvatPr && salvatPr.stare && salvatPr.stare.key === S.key) { const s = salvatPr.stare; Object.keys(s).forEach(k => { if (k !== "tab") S[k] = s[k]; }); } },
    rezultat(S, R) {
      ultimS = S; ultimR = R;
      clearTimeout(tSalv); tSalv = setTimeout(salveaza, 600);
      let h = ""; try { h = JSON.stringify(curat(S), (k, v) => (k === "tab" ? undefined : v)); } catch (e) { h = String(Math.random()); }
      if (h !== hash) { hash = h; rev++; asc.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }
    },
    date() { return { tip, tipMotor: T.motor || null, S: ultimS, R: ultimR, rev, tema }; },
    laSchimbare(f) { asc.push(f); },
    dimensiuni(r) { return dimensiuni(r); },
    stareModul(id, st, txt) { const el = document.querySelector(`[data-st="${id}"]`); if (el) { el.textContent = txt; el.dataset.v = st; } }
  };

  /* ------------------------------------------------------------------ modurile: tema / capitol / modul */
  const grila = $(".pc-grila");
  const modCurent = () => grila.dataset.mod;
  const module = {};
  function seteazaMod(m, faraDerulare) {
    grila.dataset.mod = m;
    $$(".pc-b[data-mod]").forEach(b => b.setAttribute("aria-current", b.dataset.mod === m ? "true" : "false"));
    Stocare.scrie(CH_MOD, m);
    if (MODULE.some(x => x.id === m)) deschideModul(m);
    if (!faraDerulare && window.innerWidth < 980) $("#app").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $$(".pc-b[data-mod]").forEach(b => b.addEventListener("click", () => seteazaMod(b.dataset.mod)));
  $("#taburi").addEventListener("click", e => { if (e.target.closest("button")) seteazaMod("cap"); });

  async function incarcaModul(id) {
    const def = MODULE.find(x => x.id === id);
    if (!module[id]) module[id] = { p: import(`./module/${def.fis}?v=${V}`).then(m => m.default) };
    return module[id].p;
  }
  async function deschideModul(id) {
    const gazda = $("#modul");
    $$("#modul > .pc-modul").forEach(el => { el.hidden = el.dataset.id !== id; });
    let el = gazda.querySelector(`.pc-modul[data-id="${id}"]`);
    if (!el) {
      el = document.createElement("div"); el.className = "pc-modul"; el.dataset.id = id;
      el.innerHTML = `<div class="card"><p class="nota">Se încarcă modulul ${id}…</p></div>`; gazda.appendChild(el);
      try {
        const M = await incarcaModul(id);
        el.innerHTML = "";
        module[id].ctl = M.monteaza(el, PCMAI_SHELL.date(), PCMAI_SHELL);
        module[id].rev = rev;
      } catch (e) { console.error(e); el.innerHTML = `<div class="card alerta">Modulul nu s-a putut încărca: ${esc(e.message)}</div>`; }
    } else if (module[id] && module[id].ctl && module[id].rev !== rev) {
      module[id].rev = rev; module[id].ctl.actualizeaza(PCMAI_SHELL.date());
    }
    if (module[id] && module[id].ctl && module[id].ctl.arata) module[id].ctl.arata(true);
    MODULE.forEach(m => { if (m.id !== id && module[m.id] && module[m.id].ctl && module[m.id].ctl.arata) module[m.id].ctl.arata(false); });
  }
  // la modificarea datelor: modulul deschis se recalculează, celelalte sunt marcate „invalidate”
  PCMAI_SHELL.laSchimbare(() => {
    MODULE.forEach(m => {
      const st = module[m.id];
      if (!st || !st.ctl) return;
      if (modCurent() === m.id) { st.rev = rev; st.ctl.actualizeaza(PCMAI_SHELL.date()); }
      else PCMAI_SHELL.stareModul(m.id, "inv", "invalidat de o modificare – se recalculează la deschidere");
    });
  });

  /* ------------------------------------------------------------------ export / import / memoriu */
  function descarca(nume, text, tipMime) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: tipMime })); a.download = nume; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  $("#pc-export").addEventListener("click", () => {
    const o = { aplicatie: "Proiect PCMAI", versiune: 1, tip, salvat: new Date().toISOString(), tema, stare: ultimS ? curat(ultimS) : null };
    const nume = ("proiect_pcmai_" + tip + "_" + (tema.nume || "student")).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_");
    descarca(nume + ".json", JSON.stringify(o, null, 1), "application/json");
  });
  $("#pc-import").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      if (!o || o.aplicatie !== "Proiect PCMAI" || !TIPURI[o.tip]) throw new Error("fișierul nu este un proiect PCMAI");
      if (o.tema) Stocare.scrie(CH_TEMA, Object.assign(tema, o.tema));
      if (o.stare) localStorage.setItem("pcmai-proiect-" + o.tip, JSON.stringify({ versiune: 1, tip: o.tip, salvat: o.salvat, stare: o.stare }));
      location.href = "?tip=" + o.tip;
    } catch (err) { alert("Proiectul nu s-a putut încărca: " + err.message); }
  });
  $("#pc-memoriu").addEventListener("click", async () => {
    const b = $("#pc-memoriu"); b.disabled = true; b.textContent = "Se pregătește memoriul…";
    try { await pregatesteMemoriu(); } catch (e) { console.error(e); }
    b.disabled = false; b.textContent = "Memoriul (tipărire / PDF)";
    window.print();
  });
  async function pregatesteMemoriu() {
    $("#pc-coperta").innerHTML = `<div class="coperta"><p>${esc(PORTAL.univ)}<br>${esc(PORTAL.facultate)} · Programul de studii ${esc(PORTAL.program)}</p>
      <h1>Proiect la disciplina<br>Procese și caracteristici ale motoarelor cu ardere internă</h1>
      <h2>${esc(tema.titlu || T.nume)}</h2>
      <table class="tabel"><tbody><tr><td>Tipul autovehiculului</td><td>${T.nume}</td></tr><tr><td>Varianta temei</td><td>${esc(tema.varianta || "–")}</td></tr>
      <tr><td>Student</td><td>${esc(tema.nume || "–")}, grupa ${esc(tema.grupa || "–")}</td></tr><tr><td>Îndrumător</td><td>${esc(tema.indrumator || "–")}</td></tr>
      <tr><td>Anul universitar</td><td>${esc(tema.an || PORTAL.an)}</td></tr><tr><td>Data</td><td>${new Date().toLocaleDateString("ro-RO")}</td></tr></tbody></table>
      <p class="nota">Îndrumarul de proiect: ${esc(T.indrumar)} (A.-M. Beldugan, 2026). Calculele capitolelor sunt reproductibile cu datele din capitolul 1; modulele M, S, F sunt simulatoare interne cu teste de referință.</p></div>`;
    const d = PCMAI_SHELL.date();
    const parti = [];
    for (const m of MODULE) {
      try { const M = await incarcaModul(m.id); if (M.raport) parti.push(`<section class="foaie-tipar"><h2>${m.nume} (${m.reper})</h2>${await M.raport(d)}</section>`); }
      catch (e) { parti.push(`<section class="foaie-tipar"><h2>${m.nume}</h2><p>Modulul nu s-a putut calcula: ${esc(e.message)}</p></section>`); }
    }
    $("#pc-raport").innerHTML = parti.join("");
  }

  /* ------------------------------------------------------------------ capitolul „Recapitularea dimensiunilor” (MAS / MAC) */
  function dimensiuni(r) {
    if (!r) return "";
    const D = r.date, g = tema.gabarit, Dr = r.D_r, Sr = r.S_r, R = Sr / 2, Lb = R / D.lam, i = D.i_cil;
    const Vh = Math.PI * Dr * Dr / 4 * Sr / 1e6, Vt = Vh * i, Vc = Vh / (D.eps - 1) * 1000, Wm = Sr * D.n_P / 30000;
    const Pcil = D.P_nom / i, PA = 4 * D.P_nom / (i * Math.PI * Math.pow(Dr / 100, 2)), Pl = D.P_nom / Vt, Ksol = r.p_e * Wm;
    const L = g.cL * Dr * i, H = g.cH * Sr, E = g.cE * Sr, B = g.cB * Sr, hmin = Sr / (D.eps - 1);
    const rand = (n, m, s, f, v, u, dz) => `<tr><td class="nr">${n}</td><td>${m}</td><td class="sim">${s}</td><td class="rel">${f}</td><td class="num">${Number.isFinite(v) ? v.toLocaleString("ro-RO", { minimumFractionDigits: dz, maximumFractionDigits: dz }) : "—"}</td><td>${u}</td></tr>`;
    const inp = (k, et, min, max) => `<label class="pc-gab">${et}<input type="number" step="0.05" min="${min}" max="${max}" data-gab="${k}" value="${g[k]}"><small>${String(min).replace(".", ",")} … ${String(max).replace(".", ",")}</small></label>`;
    setTimeout(() => $$("[data-gab]").forEach(el => el.addEventListener("change", () => { const v = parseFloat(el.value); if (Number.isFinite(v)) { tema.gabarit[el.dataset.gab] = v; Stocare.scrie(CH_TEMA, tema); $("#taburi button[data-tab='Dimensiuni']")?.click(); } })), 0);
    // schița de gabarit (vedere frontală și laterală, la scară)
    const sc = 230 / Math.max(H + E, L, B) , W1 = B * sc, Hs = (H + E) * sc, L1 = L * sc;
    const cil = (x0) => `<rect x="${x0 - Dr * sc / 2}" y="${20 + (H - Sr * 1.6) * sc}" width="${Dr * sc}" height="${Sr * 1.6 * sc}" class="sch-cil"/>`;
    const svg = `<svg viewBox="0 0 640 320" class="pc-schita" role="img" aria-label="Dimensiunile de gabarit ale motorului">
      <g transform="translate(40,20)"><rect x="0" y="20" width="${W1}" height="${Hs}" class="sch-bloc"/>${cil(W1 / 2)}<circle cx="${W1 / 2}" cy="${20 + H * sc}" r="${R * sc}" class="sch-man"/>
        <line x1="-10" x2="${W1 + 10}" y1="${20 + H * sc}" y2="${20 + H * sc}" class="sch-ax"/>
        <text x="${W1 / 2}" y="12" text-anchor="middle">vedere frontală</text>
        <text x="${W1 + 14}" y="${20 + H * sc / 2}">H = ${fmt(H, 0)}</text><text x="${W1 + 14}" y="${24 + H * sc + E * sc / 2}">E = ${fmt(E, 0)}</text>
        <text x="${W1 / 2}" y="${40 + Hs}" text-anchor="middle">B = ${fmt(B, 0)} mm</text></g>
      <g transform="translate(${Math.max(320, 120 + W1)},20)"><rect x="0" y="20" width="${L1}" height="${Hs}" class="sch-bloc"/>
        ${Array.from({ length: i }, (_, k) => cil(L1 * (k + 0.5) / i)).join("")}
        <line x1="-10" x2="${L1 + 10}" y1="${20 + H * sc}" y2="${20 + H * sc}" class="sch-ax"/>
        <text x="${L1 / 2}" y="12" text-anchor="middle">vedere laterală (${i} cilindri în linie)</text>
        <text x="${L1 / 2}" y="${40 + Hs}" text-anchor="middle">L<tspan dy="3" font-size="9">mot</tspan><tspan dy="-3"> = ${fmt(L, 0)} mm</tspan></text></g></svg>`;
    return `<p class="nota">Dimensiunile principale ale motorului proiectat, cu alezajul și cursa rotunjite (capitolul 7), și dimensiunile de gabarit estimate cu coeficienți statistici (§6.1.27 din îndrumar). Coeficienții se aleg după motorul de referință.</p>
      <div class="tabel-container"><table class="tabel"><thead><tr><th>Nr.</th><th>Mărime</th><th>Simbol</th><th>Relație</th><th class="num">Valoare</th><th>Unitate</th></tr></thead><tbody>
      <tr class="sectiune"><td colspan="6">Mecanismul bielă-manivelă</td></tr>
      ${rand(1, "Alezajul (rotunjit)", "D", "capitolul 7", Dr, "mm", 1)}${rand(2, "Cursa pistonului (rotunjită)", "S", "capitolul 7", Sr, "mm", 1)}
      ${rand(3, "Raza manivelei arborelui cotit", "R", "S/2", R, "mm", 2)}${rand(4, "Lungimea bielei", "L<sub>b</sub>", "R/λ", Lb, "mm", 2)}
      ${rand(5, "Raportul cursă / alezaj", "S/D", "–", Sr / Dr, "–", 3)}${rand(6, "Raportul rază / lungime bielă", "λ", "dat", D.lam, "–", 3)}
      <tr class="sectiune"><td colspan="6">Volumele</td></tr>
      ${rand(7, "Cilindreea unitară", "V<sub>h</sub>", "π·D²/4·S", Vh * 1000, "cm³", 1)}${rand(8, "Cilindreea totală", "V<sub>t</sub>", "i·V<sub>h</sub>", Vt * 1000, "cm³", 0)}
      ${rand(9, "Volumul camerei de ardere", "V<sub>c</sub>", "V<sub>h</sub>/(ε−1)", Vc, "cm³", 2)}${rand(10, "Înălțimea echivalentă a camerei (cap plan)", "h<sub>c</sub>", "S/(ε−1)", hmin, "mm", 2)}
      <tr class="sectiune"><td colspan="6">Puteri specifice și grad de solicitare</td></tr>
      ${rand(11, "Viteza medie a pistonului", "W<sub>m</sub>", "S·n/30", Wm, "m/s", 2)}${rand(12, "Puterea pe cilindru", "P<sub>cil</sub>", "P<sub>e</sub>/i", Pcil, "kW/cil", 2)}
      ${rand(13, "Puterea pe aria pistonului", "P<sub>A</sub>", "4·P<sub>e</sub>/(i·π·D²), D în dm", PA, "kW/dm²", 2)}${rand(14, "Puterea litrică", "P<sub>l</sub>", "P<sub>e</sub>/V<sub>t</sub>", Pl, "kW/dm³", 2)}
      ${rand(15, "Gradul de solicitare", "K<sub>sol</sub>", "p<sub>e</sub>·W<sub>m</sub>", Ksol, "MPa·m/s", 2)}
      <tr class="sectiune"><td colspan="6">Dimensiunile de gabarit</td></tr>
      ${rand(16, "Lungimea (fața motorului – volant)", "L<sub>mot</sub>", "c<sub>L</sub>·D·i", L, "mm", 0)}${rand(17, "Înălțimea de la axa arborelui cotit", "H", "c<sub>H</sub>·S", H, "mm", 0)}
      ${rand(18, "Adâncimea de la axa arborelui cotit", "E", "c<sub>E</sub>·S", E, "mm", 0)}${rand(19, "Lățimea între tălpile de prindere", "B", "c<sub>B</sub>·S", B, "mm", 0)}
      </tbody></table></div>
      <div class="pc-gab-r nu-tipari">${inp("cL", "c<sub>L</sub>", 1, 1.2)}${inp("cH", "c<sub>H</sub>", 1, 3.5)}${inp("cE", "c<sub>E</sub>", 0.8, 1.1)}${inp("cB", "c<sub>B</sub>", 1, 3.1)}</div>
      <figure class="grafic">${svg}<figcaption>Schița de gabarit, la scară (dimensiuni în mm). Mecanismul în 3D, cu forțele și momentele, este în Modulul M.</figcaption></figure>`;
  }

  /* ------------------------------------------------------------------ încărcarea motorului de calcul */
  function incarcaScript(src) { return new Promise((ok, err) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => err(new Error("nu s-a încărcat " + src)); document.body.appendChild(s); }); }
  (async () => {
    try { for (const f of T.scripturi) await incarcaScript(`calc/${T.dir}/${f}?v=${V}`); }
    catch (e) { $("#sumar").innerHTML = `<div class="alerta">${esc(e.message)}</div>`; return; }
    const m0 = Stocare.citeste(CH_MOD, "tema");
    seteazaMod(["tema", "cap", "M", "S", "F"].includes(m0) ? m0 : "tema", true);
  })();
})();
