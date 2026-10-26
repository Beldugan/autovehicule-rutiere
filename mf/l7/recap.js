/* MF – Lucrarea 7. Definitivarea și susținerea referatelor – colocviul de laborator.
   Nota de colocviu = portofoliul de lucrări (bifat de cadrul didactic) + testul recapitulativ individual, notat pe server
   (grile din lucrările 1–6 și câte o problemă de calcul pe lucrare, cu valori proprii). Notele se calculează în foaia
   „Colocviu” a registrului disciplinei și se exportă în „Note colocviu”. Pagina are și testul de antrenament (date.js),
   întrebările de verificare și anexele A–D. */
"use strict";
const D = PORTAL.discipline.MF, CC = D.colocviu, DISC = "MF";
const amesteca = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const fx = (v, n) => Number.isFinite(+v) && v !== "" ? (+v).toFixed(n).replace(".", ",") : "—";
const MAXT = CC.lucrari * CC.grilaPeLucrare + CC.lucrari * CC.punctePeProblema;
async function api(params, corp) {
  if (!D.endpoint) throw new Error("Disciplina nu este conectată la registru.");
  const r = corp ? await fetch(D.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ disc: DISC }, corp)) })
    : await fetch(D.endpoint + "?" + new URLSearchParams(Object.assign({ disc: DISC }, params)).toString());
  const j = await r.json(); if (!j.ok) throw new Error(j.eroare || "Eroare la server."); return j;
}

/* ------------------------------------------------------------------ conținut static */
const HTML_REGULI = `
<div class="card text-curs">
<h2>7. Definitivarea și susținerea referatelor – colocviul de laborator</h2>
<p>Ultima ședință este dedicată verificării portofoliului de lucrări și testului recapitulativ. Lucrările nerealizate sau neconcludente se refac în laboratorul virtual înainte de colocviu (fiecare lucrare păstrează parametrii individuali ai standului vostru).</p>
<h3>Cum se calculează nota de colocviu</h3>
<div class="ec"><span>Nota colocviu = ${CC.pondere.portofoliu * 100} % · nota portofoliu + ${CC.pondere.test * 100} % · nota test &nbsp;(rotunjită la întreg)</span></div>
<ul><li><b>Portofoliul</b> – cadrul didactic verifică, pentru fiecare dintre lucrările 1–${CC.lucrari}: ${CC.itemi.map(t => t.charAt(0).toLowerCase() + t.slice(1)).join("; ")}. Nota portofoliu = 10 × bife / ${CC.lucrari * CC.itemi.length} (minimum 1).</li>
<li><b>Testul recapitulativ</b> – ${CC.lucrari * CC.grilaPeLucrare} întrebări-grilă (câte ${CC.grilaPeLucrare} din fiecare lucrare, 1 punct) și ${CC.lucrari} probleme de calcul cu valori individuale (câte una pe lucrare, ${CC.punctePeProblema} puncte, toleranță ± 2 %), în ${CC.durataMin} de minute; nota test = 10 × puncte / ${MAXT} (minimum 1). Testul se susține o singură dată, în sală, cu codul de sesiune.</li>
<li>Promovarea: nota de colocviu cel puțin ${CC.notaMinimaPromovare}.</li></ul>
<p class="nota">În timpul testului nu părăsiți pagina: ieșirile sunt înregistrate. Pentru probleme folosiți calculatorul și Anexa D (fila „Relații și anexe” – o puteți tipări înainte).</p>
</div>`;
const RELATII = [["Vâscozitate cinematică", "ν = η/ρ", 1], ["Vâscozimetrul Höppler", "η = K·(ρ<sub>b</sub> − ρ<sub>l</sub>)·t", 1], ["Relația Walther", "lg lg(ν + 0,7) = A − B·lg T", 1],
  ["Modulul de elasticitate", "K = −V₀·Δp/ΔV; &nbsp; a = √(K/ρ)", 2], ["Legea hidrostaticii, Pascal", "p = p₀ + ρ·g·h; &nbsp; F<sub>c</sub>/F<sub>t</sub> = A<sub>c</sub>/A<sub>m</sub>", 3],
  ["Continuitate", "Q = v₁·A₁ = v₂·A₂", 4], ["Bernoulli (lichid real)", "z + p/(ρg) + αv²/(2g) = const. − h<sub>r</sub>", 4],
  ["Venturi, Pitot", "Q = C<sub>d</sub>·A₂·√(2gΔh/(1 − (A₂/A₁)²)); &nbsp; v = √(2gΔh)", 4], ["Numărul Reynolds", "Re = v·d/ν; &nbsp; d<sub>h</sub> = 4A/P", 5],
  ["Pierderi de sarcină", "h<sub>d</sub> = λ·(L/d)·v²/(2g); &nbsp; h<sub>l</sub> = ξ·v²/(2g)", 6], ["Coeficientul λ", "64/Re (laminar); 0,3164/Re<sup>0,25</sup> (Blasius)", 6], ["Caracteristica circuitului", "h<sub>r</sub> = M·Q²", 6]];
const APA = [[10, "999,7", "1,306", "1,306", "1,23"], [15, "999,1", "1,138", "1,139", "1,71"], [20, "998,2", "1,002", "1,004", "2,34"], [25, "997,0", "0,890", "0,893", "3,17"],
  [30, "995,7", "0,798", "0,801", "4,25"], [40, "992,2", "0,653", "0,658", "7,38"], [60, "983,2", "0,467", "0,475", "19,9"], [80, "971,8", "0,355", "0,365", "47,4"]];
const FLUIDE = [["Ulei de motor 5W-30 (40 °C / 100 °C)", "841 / 808", "65 / 11", "1,5"], ["Lichid de frână DOT 4", "1050…1070", "≈ 6", "1,5…2,0"],
  ["Lichid de răcire, 50 % etilenglicol (20 °C / 90 °C)", "1070 / 1030", "≈ 3,8 / ≈ 0,8", "≈ 2,5"], ["Motorină EN 590 (40 °C)", "820…845 (15 °C)", "2,0…4,5", "≈ 1,5"],
  ["Benzină EN 228", "720…775 (15 °C)", "≈ 0,6", "≈ 1,0"], ["Aer uscat (1,013 bar)", "1,20", "15,1", "0,1 (izoterm)"]];
const tabel = (cap, rand) => `<div class="tabel-scroll"><table class="tabel"><thead><tr>${cap.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rand.map(r => `<tr>${r.map((c, i) => `<td${i ? "" : ' style="text-align:left"'}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const HTML_ANEXE = `
<div class="card text-curs" id="anexa-d"><h2>Anexa D. Relații principale</h2><p class="nota">Sinteza de o pagină care poate fi folosită la susținere (butonul de mai jos o tipărește separat).</p>
${tabel(["Mărime", "Relație", "Lucrarea"], RELATII.map(([a, b, n]) => [a, b, n]))}
<p><button type="button" id="b-tip-d">Tipărește sinteza relațiilor</button></p></div>
<div class="card text-curs"><h2>Anexa C. Proprietăți ale fluidelor</h2>
<h3>Tabelul C.1. Proprietățile apei la presiunea atmosferică</h3>${tabel(["t [°C]", "ρ [kg/m³]", "η [mPa·s]", "ν [mm²/s]", "p<sub>v</sub> [kPa]"], APA)}
<h3>Tabelul C.2. Proprietăți orientative ale fluidelor din autovehicul (20 °C, dacă nu se precizează altfel)</h3>${tabel(["Fluid", "ρ [kg/m³]", "ν [mm²/s]", "K [GPa]"], FLUIDE)}
<p class="nota">Valorile pentru uleiuri, combustibili și lichide de frână diferă de la un produs la altul; în referate se folosesc valorile din fișa tehnică a produsului, iar tabelul servește doar pentru verificarea ordinului de mărime.</p></div>
<div class="card text-curs"><h2>Anexa A. Modelul referatului de laborator</h2>
<p>Referatul are 3–6 pagini și se predă la lucrarea următoare, în format PDF pe platforma cursului sau tipărit. În laboratorul virtual, fila „Referat” a fiecărei lucrări generează documentul cu tabelele și graficele; voi completați întrebările individuale și concluziile.</p>
<ol><li>Antet: numărul și titlul lucrării, data, grupa, membrii echipei, standul folosit.</li><li>Scopul lucrării, cu cuvintele proprii (2–3 rânduri).</li>
<li>Schema instalației, cu punctele de măsurare și aparatele folosite (domeniu, rezoluție).</li><li>Relațiile de calcul folosite, cu semnificația și unitățile mărimilor.</li>
<li>Tabelele de determinări completate, cu valorile măsurate și calculate.</li><li>Prelucrarea datelor: un calcul complet pentru o determinare și graficele cerute (Excel, Python sau Matlab), cu axe și unități.</li>
<li>Interpretare: comparația cu valorile teoretice, de catalog sau din literatură; estimarea erorilor și explicarea abaterilor.</li><li>Legătura cu autovehiculul, răspunsuri la două întrebări de verificare alese de cadrul didactic și concluzii.</li></ol></div>
<div class="card text-curs"><h2>Anexa B. Grila de evaluare a referatului</h2>
${tabel(["Criteriu", "Pondere", "Ce se urmărește"], [["Lucru în siguranță și participare", "10 %", "respectarea normelor, implicarea în măsurători"], ["Măsurători", "30 %", "determinări complete, valori plauzibile, unități corecte"], ["Prelucrarea datelor", "30 %", "calcule corecte, grafice cu axe și unități, comparații cu teoria"], ["Interpretare și redactare", "30 %", "explicarea abaterilor, legătura cu autovehiculul, claritate, surse citate"]])}
</div>
<div class="card text-curs"><h2>Bibliografie</h2><ol class="l7-bib">
<li>Omer, I. – Mecanica fluidelor. Suport de curs în format electronic, Universitatea „Ovidius” din Constanța.</li><li>Omer, I. – Mecanica fluidelor și hidraulică. Culegere de probleme, Ovidius University Press, Constanța, 2016.</li>
<li>Florea, J., Panaitescu, V. – Mecanica fluidelor, Editura Didactică și Pedagogică, București, 1979.</li><li>Georgescu, A.M., Georgescu, S.C. – Hidraulica rețelelor de conducte și mașini hidraulice, Editura Printech, București, 2007.</li>
<li>Bordeașu, I. ș.a. – Probleme de hidrodinamică, rețele de conducte, canale și mașini hidraulice, Editura Politehnica, Timișoara, 2013.</li><li>Muntean, A., Arsenie, D.I. – Culegere de probleme de mecanica fluidelor, Editura Matrix Rom, București, 2008.</li>
<li>White, F.M. – Fluid Mechanics, 8th Edition, McGraw-Hill Education, New York, 2016.</li><li>Çengel, Y.A., Cimbala, J.M. – Fluid Mechanics: Fundamentals and Applications, 4th Edition, McGraw-Hill Education, New York, 2018.</li>
<li>Idelchik, I.E. – Handbook of Hydraulic Resistance, 4th Edition, Begell House, 2007.</li><li>Robert Bosch GmbH – Bosch Automotive Handbook, 11th Edition, Wiley, 2022.</li>
<li>SAE J300 – Engine Oil Viscosity Classification; ASTM D341 – Viscosity-Temperature Equations and Charts for Liquid Petroleum or Hydrocarbon Products.</li>
<li>FMVSS No. 116 – Motor Vehicle Brake Fluids (49 CFR 571.116); ISO 5167 – Measurement of fluid flow by means of pressure differential devices.</li>
<li>Legea nr. 319/2006 a securității și sănătății în muncă; HG nr. 1425/2006 pentru aprobarea Normelor metodologice de aplicare.</li></ol></div>`;

/* ------------------------------------------------------------------ pagina */
const TABURI = [["col", "Colocviu – test"], ["prof", "Portofoliu (cadru didactic)"], ["test", "Test de antrenament"], ["intreb", "Întrebări de verificare"], ["anexe", "Relații și anexe"]];
document.title = "L7 – Definitivarea și susținerea referatelor";
document.body.innerHTML = `
<header class="antet">
  <div class="antet-text"><p class="supratitlu"><a href="../index.html">${esc(D.nume)}</a> · ${esc(D.an)} · Lucrarea 7</p>
    <h1>Definitivarea și susținerea referatelor</h1><p>Colocviul de laborator: portofoliul lucrărilor 1–${CC.lucrari} și testul recapitulativ · ${esc(PORTAL.univ)} · ${esc(PORTAL.facultate)}</p></div>
  <div class="antet-butoane"><a class="buton" href="../index.html">← Lucrările disciplinei</a>${Tema.html()}</div>
</header>
<nav class="taburi" role="tablist">${TABURI.map(([k, t], i) => `<button role="tab" data-tab="${k}" aria-selected="${i ? "false" : "true"}">${t}</button>`).join("")}</nav>
<main class="pagina">
  <section id="tab-col" class="tab activ">${HTML_REGULI}<div class="card" id="col-st"></div><div id="col-test"></div></section>
  <section id="tab-prof" class="tab"><div class="card" id="prof"></div></section>
  <section id="tab-test" class="tab"><div class="card text-curs"><h2>Test de antrenament</h2>
    <p class="nota">Nu se notează. Întrebările și variantele se amestecă la fiecare test; testul de colocviu conține, în plus, probleme de calcul cu valori individuale. Testele lucrărilor au ${LUCRARI_MF.reduce((s, l) => s + l.test.length, 0)} de întrebări în total.</p>
    <div class="l7-filtre">${LUCRARI_MF.map(l => `<label class="bifa"><input type="checkbox" data-fl="${l.nr}" checked> L${l.nr}</label>`).join("")}</div>
    <div class="rand-butoane"><label class="camp">Număr de întrebări <select id="sel-n"><option>10</option><option selected>15</option><option>20</option><option value="0">toate</option></select></label><button type="button" class="primar" id="b-test">Începe testul</button></div>
    <div id="test"></div><p id="test-scor" class="scor"></p><div id="test-rez"></div></div></section>
  <section id="tab-intreb" class="tab">${LUCRARI_MF.map(l => `<div class="card text-curs"><h2>Lucrarea ${l.nr}. ${esc(l.titlu)}</h2><p class="nota"><a href="../l${l.nr}/index.html">Deschide lucrarea</a></p>${l.intrebari.map(([q, r], i) => `<p><b>${i + 1}.</b> ${q}</p><details class="sol"><summary>Răspuns</summary><p>${r}</p></details>`).join("")}</div>`).join("")}</section>
  <section id="tab-anexe" class="tab">${HTML_ANEXE}</section>
</main>
<footer class="subsol"><p>${esc(PORTAL.cadru)} · ${esc(PORTAL.univ)}, ${PORTAL.an}</p></footer>
<style>
#b-test, .l7-btn { flex:0 0 auto; align-self:flex-end; padding:.5rem 1.3rem; } #tab-test .rand-butoane, #col-st .rand-butoane { align-items:flex-end; gap:.8rem; }
.l7-filtre { display:flex; flex-wrap:wrap; gap:.4rem .9rem; margin:.4rem 0; }
.l7-tag { font-size:.75rem; color:var(--text-sec); font-weight:400; }
.l7-form { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:.6rem; align-items:end; }
.l7-ceas { position:sticky; top:3.2rem; z-index:5; display:flex; justify-content:space-between; align-items:center; gap:.6rem; background:var(--suprafata); border:1px solid var(--accent); border-radius:10px; padding:.45rem .8rem; margin-bottom:.6rem; box-shadow:0 2px 10px rgba(0,0,0,.08); }
.l7-ceas b { font:700 1.5rem 'Courier New',monospace; color:var(--accent); } .l7-ceas.putin b { color:var(--pericol); }
.l7-q { border-top:1px solid var(--linie); padding:.7rem 0; } .l7-q > p { margin:0 0 .4rem; font-weight:600; }
.l7-q label.opt-r { display:flex; gap:.5rem; align-items:flex-start; padding:.35rem .5rem; border:1px solid var(--linie); border-radius:8px; margin:.25rem 0; cursor:pointer; }
.l7-q label.opt-r:has(input:checked) { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, var(--suprafata)); }
.l7-q input[type=text] { width:10rem; font:600 1rem 'Courier New',monospace; }
.l7-q.ok { border-left:4px solid var(--ok); padding-left:.6rem; } .l7-q.gresit { border-left:4px solid var(--pericol); padding-left:.6rem; }
.l7-rez { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:.5rem; margin:.6rem 0; } .l7-rez div { background:var(--suprafata-2); border-radius:8px; padding:.5rem .7rem; } .l7-rez span { display:block; font-size:.75rem; color:var(--text-sec); } .l7-rez b { font-size:1.35rem; }
.l7-prof-bara { display:flex; flex-wrap:wrap; gap:.6rem; align-items:end; margin:.4rem 0 .7rem; }
table.l7-port { font-size:.82rem; } table.l7-port th, table.l7-port td { padding:.25rem .35rem; white-space:nowrap; } table.l7-port td.n { text-align:left; position:sticky; left:0; background:var(--suprafata); z-index:1; }
table.l7-port { width:auto; } .l7-cel { display:inline-flex; gap:3px; align-items:center; } .l7-cel input { width:15px !important; height:15px; min-width:0; margin:0; padding:0; flex:0 0 auto; }
#col-st .rand-butoane button, .l7-prof-bara button { flex:0 0 auto; width:auto; } .l7-ref { font-size:.68rem; padding:0 .25rem; border-radius:4px; background:var(--suprafata-2); color:var(--text-sec); margin-left:3px; } .l7-ref.r { background:var(--ok-fundal); color:var(--ok); }
.l7-nota-f { font-weight:700; } .l7-nota-f.picat { color:var(--pericol); } .l7-dv { color:var(--pericol); font-size:.75rem; }
.l7-salvare { font-size:.8rem; color:var(--text-sec); }
#tab-col .verdict:empty, #prof .verdict:empty { display:none; } .verdict.pericol { background:var(--pericol-fundal); color:var(--pericol); } #prof button.mic { font-size:.74rem; padding:.2rem .45rem; }
@media print { body.tip-d .antet, body.tip-d .taburi, body.tip-d .subsol, body.tip-d .tab:not(#tab-anexe), body.tip-d #tab-anexe > .card:not(#anexa-d), body.tip-d #b-tip-d { display:none !important; } body.tip-d #tab-anexe { display:block !important; } }
</style>`;
Tema.leaga();

/* taburi */
$$(".taburi button").forEach(b => b.addEventListener("click", () => {
  $$(".taburi button").forEach(x => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  $$(".tab").forEach(s => s.classList.toggle("activ", s.id === "tab-" + b.dataset.tab)); Stocare.scrie("mf-l7-tab", b.dataset.tab);
}));
{ const t = Stocare.citeste("mf-l7-tab", ""); const b = t && $(`.taburi [data-tab="${t}"]`); if (b) b.click(); }

/* ================================================================== colocviul – studentul */
const KS = "ar-sesiune-mf-l7";
let ST = Stocare.citeste(KS, null), TEST = null, ceas = null;
const INT = { ascunsNr: 0, ascunsMs: 0, ascunsDe: 0, webdriver: !!navigator.webdriver };
document.addEventListener("visibilitychange", () => { if (!TEST || TEST.gata) return; if (document.hidden) { INT.ascunsNr++; INT.ascunsDe = Date.now(); } else if (INT.ascunsDe) { INT.ascunsMs += Date.now() - INT.ascunsDe; INT.ascunsDe = 0; } salveazaRasp(); });
const kR = () => ST ? "mf-l7-rasp-" + ST.start : "";
function salveazaRasp() { if (!TEST || !ST) return; Stocare.scrie(kR(), { r: colecteaza(), int: INT }); }
function colecteaza() { const r = {}; if (!TEST) return r; TEST.grila.forEach(g => { const x = $(`input[name="${g.id}"]:checked`); r[g.id] = x ? x.value : ""; }); TEST.probleme.forEach(p => { const x = $(`#in-${p.id}`); r[p.id] = x ? x.value.trim() : ""; }); return r; }
function msgSt(t, tip) { const e = $("#st-msg"); if (e) { e.className = "verdict " + (tip || ""); e.textContent = t; } }
function randeazaStudent() {
  const c = $("#col-st");
  if (ST && ST.token) {
    const ora = new Date(ST.start).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    c.innerHTML = `<h2>Testul de colocviu</h2><p><b>${esc(ST.nume)}</b> · ${esc(ST.grupa)} · ${esc(ST.email)} · <span class="ok-txt">✓ prezență înregistrată la ${ora}</span></p>
      <div class="rand-butoane">${ST.trimis ? "" : `<button type="button" class="primar l7-btn" id="b-start-test">${Stocare.citeste(kR(), null) ? "Continuă testul" : "Începe testul (" + CC.durataMin + " min)"}</button>`}<button type="button" class="l7-btn" id="b-iesire">Ieșire</button></div><p id="st-msg" aria-live="polite"></p>`;
    const b = $("#b-start-test"); if (b) b.addEventListener("click", incarcaTest);
    $("#b-iesire").addEventListener("click", () => { if (TEST && !TEST.gata && !confirmIesire()) return; Stocare.sterge(KS); ST = null; TEST = null; clearInterval(ceas); $("#col-test").innerHTML = ""; randeazaStudent(); });
    if (ST.rezultat) arataRezultat(ST.rezultat);
    return;
  }
  const id = Stocare.citeste("ar-student-id", {});
  c.innerHTML = `<h2>Intrarea în colocviu</h2><p class="nota">Introduceți datele și codul de sesiune afișat în sală pentru lucrarea ${CC.lab}. Prezența se înregistrează automat.</p>
    <div class="l7-form"><label class="camp">Nume și prenume<input id="st-nume" maxlength="80" autocomplete="name" value="${esc(id.nume || "")}"></label>
    <label class="camp">E-mail (contul din Google Classroom)<input id="st-email" type="email" maxlength="80" autocomplete="email" value="${esc(id.email || "")}"></label>
    <label class="camp">Grupa / subgrupa<input id="st-grupa" maxlength="40" value="${esc(id.grupa || "")}"></label>
    <label class="camp">Codul sesiunii<input id="st-cod" maxlength="6" autocomplete="off" style="text-transform:uppercase;letter-spacing:.15em"></label>
    <button type="button" class="primar l7-btn" id="b-intra">Intră în colocviu</button></div><p id="st-msg" aria-live="polite"></p>`;
  $("#b-intra").addEventListener("click", intra);
}
let _confirm = 0; function confirmIesire() { if (Date.now() - _confirm < 4000) return true; _confirm = Date.now(); msgSt("Testul nu a fost trimis. Apăsați din nou „Ieșire” în 4 s pentru a renunța (răspunsurile rămân salvate în acest browser).", "atentie"); return false; }
async function intra() {
  const nume = $("#st-nume").value.trim(), email = $("#st-email").value.trim().toLowerCase(), grupa = $("#st-grupa").value.trim(), cod = $("#st-cod").value.trim().toUpperCase();
  if (nume.split(/\s+/).length < 2) return msgSt("Scrieți numele complet.", "atentie");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msgSt("E-mail invalid.", "atentie");
  if (!grupa) return msgSt("Completați grupa.", "atentie"); if (cod.length < 6) return msgSt("Codul de sesiune are 6 caractere.", "atentie");
  Stocare.scrie("ar-student-id", { nume, email, grupa });
  msgSt("Se verifică codul…", "");
  try { const j = await api({ action: "start", lab: CC.lab, email, nume, grupa, cod }); ST = { nume, email, grupa, start: j.start, token: j.token }; Stocare.scrie(KS, ST); randeazaStudent(); }
  catch (e) { msgSt(e.message, "pericol"); }
}
async function incarcaTest() {
  msgSt("Se încarcă testul…", "");
  try {
    const j = await api({ action: "colocviuTest", email: ST.email, start: ST.start, token: ST.token, nume: ST.nume, grupa: ST.grupa });
    TEST = { grila: j.grila, probleme: j.probleme, max: j.max, sfarsit: Date.now() + j.ramas * 1000, gata: false };
    const s = Stocare.citeste(kR(), null); if (s && s.int) Object.assign(INT, s.int, { ascunsDe: 0 });
    randeazaTest(s ? s.r : {}); msgSt("", "");
  } catch (e) { msgSt(e.message, "pericol"); }
}
function randeazaTest(r) {
  const nr = (TEST.grila.length), el = $("#col-test");
  el.innerHTML = `<div class="card text-curs"><div class="l7-ceas" id="ceas"><span>Timp rămas</span><b id="ceas-t">--:--</b><span id="ceas-r"></span></div>
    <h2>Partea I – întrebări-grilă (1 punct fiecare)</h2>
    ${TEST.grila.map((g, i) => `<div class="l7-q" data-id="${g.id}"><p>${i + 1}. ${g.q} <span class="l7-tag">(L${g.lab})</span></p>${g.o.map((o, j) => `<label class="opt-r"><input type="radio" name="${g.id}" value="${j}" ${String(r[g.id]) === String(j) ? "checked" : ""}> <span>${o}</span></label>`).join("")}</div>`).join("")}
    <h2>Partea a II-a – probleme de calcul (${CC.punctePeProblema} puncte fiecare, toleranță ± 2 %)</h2>
    ${TEST.probleme.map((p, i) => `<div class="l7-q" data-id="${p.id}"><p>${nr + i + 1}. ${p.text} <span class="l7-tag">(L${p.lab})</span></p><label class="camp-inline">Rezultat: <input type="text" inputmode="decimal" autocomplete="off" id="in-${p.id}" maxlength="16" value="${esc(r[p.id] || "")}"> ${p.u}</label></div>`).join("")}
    <div class="rand-butoane" style="margin-top:1rem"><button type="button" class="primar l7-btn" id="b-trimite">Trimite testul</button><span class="nota" id="msg-trimite"></span></div></div>`;
  $$("#col-test input").forEach(i => i.addEventListener("change", salveazaRasp)); $$("#col-test input[type=text]").forEach(i => i.addEventListener("input", salveazaRasp));
  $("#b-trimite").addEventListener("click", () => trimite(false));
  clearInterval(ceas); ceas = setInterval(tic, 500); tic();
}
function tic() {
  if (!TEST || TEST.gata) return clearInterval(ceas);
  const r = Math.max(0, Math.round((TEST.sfarsit - Date.now()) / 1000)), e = $("#ceas-t"); if (!e) return;
  e.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`; $("#ceas").classList.toggle("putin", r < 120);
  const raspunse = Object.values(colecteaza()).filter(x => x !== "").length; $("#ceas-r").textContent = `răspunsuri: ${raspunse} / ${TEST.grila.length + TEST.probleme.length}`;
  if (r === 0) trimite(true);
}
let _trim = 0;
async function trimite(automat) {
  if (!TEST || TEST.gata || TEST.trimitere) return;
  const r = colecteaza(), lipsa = Object.values(r).filter(x => x === "").length;
  if (!automat && lipsa && Date.now() - _trim > 5000) { _trim = Date.now(); $("#msg-trimite").textContent = `${lipsa} întrebări fără răspuns. Apăsați din nou „Trimite testul” pentru confirmare.`; return; }
  TEST.trimitere = true; $("#msg-trimite").textContent = automat ? "Timpul a expirat – testul se trimite…" : "Se trimite…";
  try {
    const j = await api(null, { action: "colocviuTrimite", start: ST.start, token: ST.token, student: { nume: ST.nume, email: ST.email, grupa: ST.grupa }, raspunsuri: r, integritate: INT });
    TEST.gata = true; clearInterval(ceas); ST.trimis = true; ST.rezultat = j; Stocare.scrie(KS, ST); Stocare.sterge(kR());
    randeazaStudent(); arataRezultat(j, r);
  } catch (e) { TEST.trimitere = false; $("#msg-trimite").textContent = "Eroare: " + e.message + " – încercați din nou."; }
}
function arataRezultat(j) {
  const det = {}; (j.detalii || []).forEach(d => det[d.id] = d);
  const el = $("#col-test");
  el.innerHTML = `<div class="card text-curs"><h2>Rezultatul testului</h2><div class="l7-rez"><div><span>Puncte</span><b>${j.puncte} / ${j.max}</b></div><div><span>Nota test</span><b>${fx(j.nota, 2)}</b></div><div><span>Nota de colocviu</span><b style="font-size:1rem">${j.pondere.portofoliu * 100} % portofoliu + ${j.pondere.test * 100} % test</b></div></div>
    <p class="nota">Testul a fost înregistrat în registrul disciplinei. Nota portofoliului o stabilește cadrul didactic la verificarea lucrărilor; nota de colocviu se calculează automat.</p>
    <h3>Corectura</h3>${(j.detalii || []).map((d, i) => `<div class="l7-q ${d.ok ? "ok" : "gresit"}"><p>${i + 1}. <span class="l7-tag">(L${d.lab}, ${d.id.startsWith("p") ? "problemă" : "grilă"})</span> ${d.ok ? "✓ corect" : "✗ greșit"}</p><p class="nota">Răspunsul vostru: ${esc(d.raspuns)} · corect: ${d.corect}${d.e ? " – " + d.e : ""}</p></div>`).join("")}</div>`;
}
randeazaStudent();

/* ================================================================== portofoliul – cadrul didactic */
const KP = "mf-l7-cheie-prof";
let ultSalv = "", PF = null, coada = [], tCoada = null, grupaSel = Stocare.citeste("mf-l7-grupa", ""), cauta = "";
function randeazaProfLogin(msg) {
  $("#prof").innerHTML = `<h2>Portofoliul de lucrări – verificarea cadrului didactic</h2>
    <p class="nota">Cheia se obține din registrul disciplinei: meniul Laborator → Colocviu: cheia cadrului didactic. Bifele se salvează direct în foaia „Colocviu”; nota se calculează automat (se poate bifa și direct în foaie).</p>
    <div class="l7-prof-bara"><label class="camp">Cheia cadrului didactic<input id="p-cheie" type="password" autocomplete="off" value="${esc(Stocare.citeste(KP, ""))}"></label><button type="button" class="primar l7-btn" id="b-p-intra">Deschide registrul</button></div><p id="p-msg" class="verdict ${msg ? "pericol" : ""}">${msg || ""}</p>`;
  $("#b-p-intra").addEventListener("click", () => { Stocare.scrie(KP, $("#p-cheie").value.trim()); incarcaProf(); });
}
async function incarcaProf() {
  const k = Stocare.citeste(KP, ""); if (!k) return randeazaProfLogin();
  $("#prof").innerHTML = `<p class="nota">Se încarcă registrul…</p>`;
  try { PF = await api({ action: "colocviuLista", key: k }); randeazaProf(); } catch (e) { randeazaProfLogin(e.message); }
}
function notaPort(b) { return Math.max(1, Math.round(10 * b.filter(Boolean).length / b.length * 100) / 100); }
function finala(s) { const nt = s.notaT === "" ? NaN : +s.notaT; if (!Number.isFinite(nt)) return { f: "", n: "" }; const f = Math.round((PF.pondere.portofoliu * notaPort(s.b) + PF.pondere.test * nt) * 100) / 100; return { f, n: Math.round(f) }; }
function randeazaProf() {
  const grupe = [...new Set(PF.studenti.map(s => String(s.grupa || "")))].sort();
  const vis = PF.studenti.filter(s => (!grupaSel || String(s.grupa) === grupaSel) && (!cauta || (s.nume + " " + s.email).toLowerCase().includes(cauta)));
  const ni = PF.itemi.length, nl = PF.lucrari;
  const stat = (() => { const t = vis.filter(s => s.puncte !== ""), f = t.map(finala); return `${vis.length} studenți · test susținut: ${t.length} · promovați: ${f.filter(x => x.n >= PF.minim).length}`; })();
  $("#prof").innerHTML = `<h2>Portofoliul de lucrări – verificarea cadrului didactic</h2>
    <p class="nota">Pe fiecare lucrare, cele ${ni} bife sunt: ${PF.itemi.map((t, i) => `<b>${i + 1}</b> ${t.charAt(0).toLowerCase() + t.slice(1)}`).join(" · ")}. Eticheta de lângă bife arată starea din registru (P = prezent, P+R = referat trimis).</p>
    <div class="l7-prof-bara"><label class="camp">Grupa <select id="p-grupa"><option value="">toate</option>${grupe.map(g => `<option ${g === grupaSel ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></label>
      <label class="camp">Caută<input id="p-cauta" value="${esc(cauta)}" placeholder="nume sau e-mail"></label>
      <button type="button" class="l7-btn" id="b-p-preia" title="Bifează „${esc(PF.itemi[ni - 1])}” la lucrările cu referat trimis (P+R)">Preia „predat” din registru</button>
      <button type="button" class="l7-btn" id="b-p-reinc">Reîncarcă</button><button type="button" class="primar l7-btn" id="b-p-export">Exportă notele în foaia de calcul</button>
      <span class="l7-salvare" id="p-salv">${esc(ultSalv)}</span></div>
    <p class="nota">${stat} · <a href="${PF.foaie}" target="_blank" rel="noopener">deschide registrul</a> <span id="p-exp"></span></p>
    <div class="tabel-scroll"><table class="tabel l7-port"><thead><tr><th>Student</th>${Array.from({ length: nl }, (_, l) => `<th>L${l + 1}</th>`).join("")}<th>Port.</th><th>Test</th><th>Nota test</th><th>Finală</th><th>Colocviu</th><th></th></tr></thead><tbody>
    ${vis.map(s => { const fn = finala(s), si = PF.studenti.indexOf(s);
      return `<tr data-s="${si}"><td class="n"><b>${esc(s.nume)}</b><br><span class="l7-tag">${esc(s.grupa)} · ${esc(s.email)}</span></td>
      ${Array.from({ length: nl }, (_, l) => `<td><span class="l7-cel">${PF.itemi.map((t, k) => `<input type="checkbox" data-i="${l * ni + k}" title="L${l + 1} – ${esc(t)}" ${s.b[l * ni + k] ? "checked" : ""}>`).join("")}<span class="l7-ref ${/R/.test(s.ref[l] || "") ? "r" : ""}">${esc(s.ref[l] || "–")}</span></span></td>`).join("")}
      <td>${fx(notaPort(s.b), 2)}</td><td>${s.puncte === "" ? "—" : s.puncte + "/" + PF.max}</td><td>${s.notaT === "" ? "—" : fx(s.notaT, 2)}${s.verdict && s.verdict !== "OK" ? `<br><span class="l7-dv" title="${esc(s.obs)}">${esc(s.verdict)}</span>` : ""}</td>
      <td>${fn.f === "" ? "—" : fx(fn.f, 2)}</td><td class="l7-nota-f ${fn.n !== "" && fn.n < PF.minim ? "picat" : ""}">${fn.n === "" ? "—" : fn.n}</td>
      <td><button type="button" class="mic" data-toate="${si}" title="Bifează tot portofoliul">✓ tot</button></td></tr>`; }).join("")}
    </tbody></table></div>`;
  $("#p-grupa").addEventListener("change", e => { grupaSel = e.target.value; Stocare.scrie("mf-l7-grupa", grupaSel); randeazaProf(); });
  $("#p-cauta").addEventListener("input", e => { cauta = e.target.value.toLowerCase().trim(); clearTimeout(randeazaProf.t); randeazaProf.t = setTimeout(() => { randeazaProf(); const i = $("#p-cauta"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); });
  $$("#prof tr[data-s] input[type=checkbox]").forEach(c => c.addEventListener("change", () => { const s = PF.studenti[+c.closest("tr").dataset.s]; s.b[+c.dataset.i] = c.checked; adauga([{ email: s.email, i: +c.dataset.i, val: c.checked }]); actualizeazaRand(c.closest("tr"), s); }));
  $$("#prof [data-toate]").forEach(b => b.addEventListener("click", () => { const s = PF.studenti[+b.dataset.toate]; adauga(s.b.map((v, i) => ({ email: s.email, i, val: true }))); s.b = s.b.map(() => true); randeazaProf(); }));
  $("#b-p-preia").addEventListener("click", () => { const l = []; vis.forEach(s => { for (let k = 0; k < nl; k++) if (/R/.test(s.ref[k] || "") && !s.b[k * ni + ni - 1]) { s.b[k * ni + ni - 1] = true; l.push({ email: s.email, i: k * ni + ni - 1, val: true }); } }); adauga(l); randeazaProf(); $("#p-salv").textContent = `${l.length} bife preluate din registru – se salvează…`; });
  $("#b-p-reinc").addEventListener("click", incarcaProf);
  $("#b-p-export").addEventListener("click", exporta);
}
function actualizeazaRand(tr, s) { const fn = finala(s), td = tr.children, nl = PF.lucrari; td[nl + 1].textContent = fx(notaPort(s.b), 2); td[nl + 4].textContent = fn.f === "" ? "—" : fx(fn.f, 2); td[nl + 5].textContent = fn.n === "" ? "—" : fn.n; td[nl + 5].classList.toggle("picat", fn.n !== "" && fn.n < PF.minim); }
function adauga(l) { if (!l.length) return; coada.push(...l); $("#p-salv").textContent = "modificări nesalvate…"; clearTimeout(tCoada); tCoada = setTimeout(salveazaCoada, 700); }
async function salveazaCoada() {
  if (!coada.length) return; const l = coada; coada = []; $("#p-salv").textContent = "se salvează…";
  try { const j = await api(null, { action: "colocviuBifa", key: Stocare.citeste(KP, ""), bife: l }); const loc = PF.studenti; PF = j;
    // păstrează bifele locale încă nesalvate
    coada.forEach(b => { const s = PF.studenti.find(x => x.email === b.email); if (s) s.b[b.i] = b.val; });
    ultSalv = "✓ salvat în foaia „Colocviu” la " + new Date().toLocaleTimeString("ro-RO"); $("#p-salv").textContent = ultSalv; if (!coada.length) randeazaProf(); }
  catch (e) { coada = l.concat(coada); $("#p-salv").textContent = "eroare la salvare: " + e.message + " – se reîncearcă"; tCoada = setTimeout(salveazaCoada, 4000); }
}
async function exporta() {
  if (coada.length) await salveazaCoada();
  $("#p-exp").textContent = "· se exportă…";
  try { const j = await api(null, { action: "colocviuExport", key: Stocare.citeste(KP, "") }); $("#p-exp").innerHTML = `· ✓ ${j.n} note exportate în <a href="${j.url}" target="_blank" rel="noopener">foaia „Note colocviu”</a> și în coloana „Nota colocviu” din „Prezență”`; }
  catch (e) { $("#p-exp").textContent = "· eroare: " + e.message; }
}
window.addEventListener("beforeunload", e => { if (coada.length || (TEST && !TEST.gata)) { e.preventDefault(); e.returnValue = ""; } });
$(".taburi [data-tab=prof]").addEventListener("click", () => { if (!PF) incarcaProf(); });
if ($("#tab-prof").classList.contains("activ")) incarcaProf();

/* ================================================================== testul de antrenament */
function incepeTest() {
  const fl = $$("[data-fl]").filter(c => c.checked).map(c => +c.dataset.fl); if (!fl.length) { $("#test").innerHTML = `<p class="nota">Alegeți cel puțin o lucrare.</p>`; return; }
  const n = +$("#sel-n").value, toate = LUCRARI_MF.filter(l => fl.includes(l.nr)).flatMap(l => l.test.map(t => ({ ...t, nr: l.nr })));
  const Q = amesteca(toate).slice(0, n || toate.length).map(t => { const ord = amesteca(t.o.map((o, j) => j)); return { ...t, o: ord.map(j => t.o[j]), c: ord.indexOf(t.c) }; });
  let scor = 0, rasp = 0; const pe = {};
  $("#test-rez").innerHTML = ""; $("#test-scor").textContent = `0 / ${Q.length} răspunse`;
  $("#test").innerHTML = Q.map((t, i) => `<div class="q" data-i="${i}"><p>${i + 1}. ${t.q} <span class="l7-tag">(L${t.nr})</span></p><div class="opt">${t.o.map((o, j) => `<button type="button" data-j="${j}">${o}</button>`).join("")}</div><div class="expl" hidden></div></div>`).join("");
  $$("#test .q").forEach(q => { const t = Q[+q.dataset.i];
    $$("button", q).forEach(b => b.addEventListener("click", () => {
      if (q.dataset.gata) return; q.dataset.gata = 1; rasp++; const j = +b.dataset.j, ok = j === t.c; pe[t.nr] = pe[t.nr] || [0, 0]; pe[t.nr][1]++;
      if (ok) { b.classList.add("corect"); scor++; pe[t.nr][0]++; } else { b.classList.add("gresit"); $$("button", q)[t.c].classList.add("corect"); }
      const ex = $(".expl", q); ex.hidden = false; ex.innerHTML = (ok ? "<b>Corect.</b> " : "<b>Greșit.</b> ") + t.e;
      $("#test-scor").textContent = `Scor: ${scor} / ${rasp}` + (rasp === Q.length ? ` – nota orientativă ${(Math.max(1, 10 * scor / Q.length)).toFixed(1).replace(".", ",")}` : ` (${Q.length - rasp} rămase)`);
      if (rasp === Q.length) $("#test-rez").innerHTML = `<h3>Pe lucrări</h3>${tabel(["Lucrarea", "Corecte", "De recapitulat"], Object.keys(pe).sort().map(k => [`<a href="../l${k}/index.html">L${k}. ${esc(LUCRARI_MF[k - 1].titlu)}</a>`, `${pe[k][0]} / ${pe[k][1]}`, pe[k][0] < pe[k][1] ? "da – Teorie și Verificare" : "—"]))}`;
    })); });
}
$("#b-test").addEventListener("click", incepeTest);
$("#b-tip-d").addEventListener("click", () => { document.body.classList.add("tip-d"); window.print(); setTimeout(() => document.body.classList.remove("tip-d"), 500); });
