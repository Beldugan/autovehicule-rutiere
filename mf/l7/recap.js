/* MF – Lucrarea 7. Definitivarea și susținerea referatelor (pagină de recapitulare, fără notare pe server).
   Pregătirea susținerii cu lista de verificare pe lucrări, simularea susținerii (lucrare trasă la întâmplare, întrebări),
   întrebările de verificare și testele din lucrările 1–6 (preluate din aplicațiile lucrărilor, date.js), anexele A–D. */
"use strict";
const D = PORTAL.discipline.MF, CH = "mf-l7-pregatire";
const amesteca = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const ITEME = ["Referatul complet: tabele, calcule, grafice", "Exemplul rezolvat recalculat cu valorile proprii", "Răspunsurile la întrebările de verificare", "Trimis în Classroom"];

/* ------------------------------------------------------------------ conținut static */
const HTML_PREG = () => `
<div class="card text-curs">
<h2>7. Definitivarea și susținerea referatelor</h2>
<p>Ultima ședință este dedicată verificării referatelor, refacerii determinărilor lipsă sau neconcludente și susținerii orale a lucrărilor. Fiecare student prezintă una dintre lucrări, aleasă de cadrul didactic: scopul, principiul de măsurare, rezultatele, comparația cu valorile de calcul și de catalog și legătura cu autovehiculul, apoi răspunde la întrebări de verificare din lucrările efectuate.</p>
<h3>7.1. Pregătirea susținerii</h3>
<ul><li>referatele tuturor lucrărilor, complete, cu tabelele completate, calculele și graficele;</li>
<li>recalcularea exemplului rezolvat al fiecărei lucrări cu valorile măsurate de echipă;</li>
<li>răspunsurile la întrebările de verificare de la sfârșitul fiecărei lucrări;</li>
<li>o sinteză de o pagină cu relațiile principale (Anexa D), care poate fi folosită la susținere.</li></ul>
<h3>7.2. Criterii de evaluare</h3>
<p>Nota L se calculează ca medie a notelor pe referate, evaluate după grila din Anexa B, corectată cu nota obținută la susținere. Referatele lipsă se recuperează în ședința a 7-a sau în sesiunea de recuperări programată de departament.</p>
<p class="nota">Lucrările nerealizate sau neconcludente se pot reface oricând în laboratorul virtual: fiecare lucrare păstrează parametrii individuali ai standului vostru.</p>
</div>
<div class="card"><h2>Lista mea de verificare</h2><p class="nota">Bifele se păstrează numai în acest browser.</p>
<div class="tabel-scroll"><table class="tabel l7-lista"><thead><tr><th>Lucrarea</th>${ITEME.map(t => `<th>${t}</th>`).join("")}</tr></thead><tbody>
${LUCRARI_MF.map(l => `<tr><td style="text-align:left"><a href="../l${l.nr}/index.html">${l.nr}. ${esc(l.titlu)}</a></td>${ITEME.map((_, j) => `<td><input type="checkbox" data-ck="${l.nr}-${j}" aria-label="${esc(ITEME[j])} – lucrarea ${l.nr}"></td>`).join("")}</tr>`).join("")}
</tbody></table></div><p class="scor" id="l7-progres"></p></div>`;

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
<h3>Autoevaluare</h3><p class="nota">Estimați-vă nota pe un referat (1–10 pe fiecare criteriu):</p>
<div class="l7-auto">${["Siguranță și participare", "Măsurători", "Prelucrarea datelor", "Interpretare și redactare"].map((t, i) => `<label class="camp">${t} <input type="number" min="1" max="10" step="0.5" value="8" data-crit="${i}"></label>`).join("")}</div>
<p class="scor" id="l7-nota"></p></div>
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
const TABURI = [["preg", "Pregătirea susținerii"], ["sust", "Simularea susținerii"], ["intreb", "Întrebări de verificare"], ["test", "Test recapitulativ"], ["anexe", "Relații și anexe"]];
document.title = "L7 – Definitivarea și susținerea referatelor";
document.body.innerHTML = `
<header class="antet">
  <div class="antet-text"><p class="supratitlu"><a href="../index.html">${esc(D.nume)}</a> · ${esc(D.an)} · Lucrarea 7</p>
    <h1>Definitivarea și susținerea referatelor</h1><p>Recapitularea lucrărilor 1–6: pregătirea susținerii, întrebări de verificare, test de antrenament, relații și anexe · ${esc(PORTAL.univ)} · ${esc(PORTAL.facultate)}</p></div>
  <div class="antet-butoane"><a class="buton" href="../index.html">← Lucrările disciplinei</a>${Tema.html()}</div>
</header>
<nav class="taburi" role="tablist">${TABURI.map(([k, t], i) => `<button role="tab" data-tab="${k}" aria-selected="${i ? "false" : "true"}">${t}</button>`).join("")}</nav>
<main class="pagina">
  <section id="tab-preg" class="tab activ">${HTML_PREG()}</section>
  <section id="tab-sust" class="tab"><div class="card text-curs"><h2>Simularea susținerii</h2>
    <p>Cadrul didactic alege una dintre lucrări. Prezentați în 3–5 minute: <b>scopul</b>, <b>principiul de măsurare</b> (schema standului și aparatele), <b>rezultatele</b> voastre, <b>comparația</b> cu valorile de calcul și de catalog și <b>legătura cu autovehiculul</b>; apoi răspundeți la întrebări.</p>
    <div class="rand-butoane"><button type="button" class="primar" id="b-trage">Trage o lucrare</button><label class="camp">sau alegeți <select id="sel-l"><option value="">—</option>${LUCRARI_MF.map(l => `<option value="${l.nr}">${l.nr}. ${esc(l.titlu)}</option>`).join("")}</select></label>
    <label class="bifa"><input type="checkbox" id="ck-crono"> cronometru 5 min</label></div>
    <div id="sust"></div></div></section>
  <section id="tab-intreb" class="tab">${LUCRARI_MF.map(l => `<div class="card text-curs"><h2>Lucrarea ${l.nr}. ${esc(l.titlu)}</h2><p class="nota"><a href="../l${l.nr}/index.html">Deschide lucrarea</a></p>${l.intrebari.map(([q, r], i) => `<p><b>${i + 1}.</b> ${q}</p><details class="sol"><summary>Răspuns</summary><p>${r}</p></details>`).join("")}</div>`).join("")}</section>
  <section id="tab-test" class="tab"><div class="card text-curs"><h2>Test recapitulativ (antrenament)</h2>
    <p class="nota">Întrebările și variantele se amestecă la fiecare test; scorul nu se transmite nicăieri. Testele din fiecare lucrare au ${LUCRARI_MF.reduce((s, l) => s + l.test.length, 0)} de întrebări în total.</p>
    <div class="l7-filtre">${LUCRARI_MF.map(l => `<label class="bifa"><input type="checkbox" data-fl="${l.nr}" checked> L${l.nr}</label>`).join("")}</div>
    <div class="rand-butoane"><label class="camp">Număr de întrebări <select id="sel-n"><option>10</option><option selected>15</option><option>20</option><option value="0">toate</option></select></label><button type="button" class="primar" id="b-test">Începe testul</button></div>
    <div id="test"></div><p id="test-scor" class="scor"></p><div id="test-rez"></div></div></section>
  <section id="tab-anexe" class="tab">${HTML_ANEXE}</section>
</main>
<footer class="subsol"><p>${esc(PORTAL.cadru)} · ${esc(PORTAL.univ)}, ${PORTAL.an} · Pagină de recapitulare – nu necesită cod de sesiune.</p></footer>
<style>
#b-trage, #b-test { flex:0 0 auto; align-self:flex-end; min-height:0; padding:.5rem 1.3rem; } #tab-sust .rand-butoane, #tab-test .rand-butoane { align-items:flex-end; gap:.8rem; }
.l7-lista td { text-align:center; } .l7-lista input { width:1.15rem; height:1.15rem; }
.l7-filtre { display:flex; flex-wrap:wrap; gap:.4rem .9rem; margin:.4rem 0; }
.l7-auto { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:.5rem; } .l7-auto input { width:5rem; }
.l7-sust-cap { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:baseline; gap:.5rem; } .l7-crono { font:700 1.6rem 'Courier New',monospace; color:var(--accent); }
.l7-sust-cap h3 { margin:.2rem 0; } .l7-tag { font-size:.75rem; color:var(--text-sec); font-weight:400; }
@media print { body.tip-d .antet, body.tip-d .taburi, body.tip-d .subsol, body.tip-d .tab:not(#tab-anexe), body.tip-d #tab-anexe > .card:not(#anexa-d), body.tip-d #b-tip-d { display:none !important; } body.tip-d #tab-anexe { display:block !important; } }
</style>`;
Tema.leaga();

/* taburi */
$$(".taburi button").forEach(b => b.addEventListener("click", () => {
  $$(".taburi button").forEach(x => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  $$(".tab").forEach(s => s.classList.toggle("activ", s.id === "tab-" + b.dataset.tab)); Stocare.scrie("mf-l7-tab", b.dataset.tab);
}));
{ const t = Stocare.citeste("mf-l7-tab", ""); const b = t && $(`.taburi [data-tab="${t}"]`); if (b) b.click(); }

/* lista de verificare */
const bife = Stocare.citeste(CH, {});
function progres() { const n = $$("[data-ck]").filter(c => c.checked).length, tot = $$("[data-ck]").length; $("#l7-progres").textContent = `Pregătire: ${n} / ${tot} (${Math.round(n / tot * 100)} %)`; }
$$("[data-ck]").forEach(c => { c.checked = !!bife[c.dataset.ck]; c.addEventListener("change", () => { bife[c.dataset.ck] = c.checked; Stocare.scrie(CH, bife); progres(); }); });
progres();

/* simularea susținerii */
let tCrono = null;
function sustinere(nr) {
  const l = LUCRARI_MF.find(x => x.nr === nr); if (!l) return;
  const proprii = amesteca(l.intrebari).slice(0, 3).map(q => [q, l.nr]);
  const altele = amesteca(LUCRARI_MF.filter(x => x.nr !== nr).flatMap(x => x.intrebari.map(q => [q, x.nr]))).slice(0, 2);
  $("#sust").innerHTML = `<div class="l7-sust-cap"><h3>Lucrarea ${l.nr}. ${esc(l.titlu)}</h3><span class="l7-crono" id="crono" ${$("#ck-crono").checked ? "" : "hidden"}>5:00</span></div>
    <p><b>Scopul (de reformulat cu cuvintele proprii):</b> ${l.scop}</p><p><b>Relațiile de calcul:</b> ${l.relatii}</p>
    <p class="nota">Aveți la îndemână referatul: rezultatele voastre și comparația cu valorile de calcul și de catalog. <a href="../l${l.nr}/index.html">Deschide lucrarea ${l.nr}</a></p>
    <h3>Întrebări</h3>${[...proprii, ...altele].map(([[q, r], n], i) => `<p><b>${i + 1}.</b> ${q} <span class="l7-tag">(L${n})</span></p><details class="sol"><summary>Răspuns</summary><p>${r}</p></details>`).join("")}`;
  $("#sel-l").value = String(nr);
  clearInterval(tCrono); if ($("#ck-crono").checked) { const t0 = Date.now(); tCrono = setInterval(() => { const r = Math.max(0, 300 - Math.floor((Date.now() - t0) / 1000)), e = $("#crono"); if (!e) return clearInterval(tCrono); e.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`; if (!r) { clearInterval(tCrono); e.textContent = "timpul a expirat"; } }, 250); }
}
$("#b-trage").addEventListener("click", () => sustinere(1 + Math.floor(Math.random() * LUCRARI_MF.length)));
$("#sel-l").addEventListener("change", e => { if (e.target.value) sustinere(+e.target.value); });

/* testul recapitulativ */
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
      $("#test-scor").textContent = `Scor: ${scor} / ${rasp}` + (rasp === Q.length ? ` – nota orientativă ${(1 + 9 * scor / Q.length).toFixed(1).replace(".", ",")}` : ` (${Q.length - rasp} rămase)`);
      if (rasp === Q.length) $("#test-rez").innerHTML = `<h3>Pe lucrări</h3>${tabel(["Lucrarea", "Corecte", "De recapitulat"], Object.keys(pe).sort().map(k => [`<a href="../l${k}/index.html">L${k}. ${esc(LUCRARI_MF[k - 1].titlu)}</a>`, `${pe[k][0]} / ${pe[k][1]}`, pe[k][0] < pe[k][1] ? "da – Teorie și Verificare" : "—"]))}`;
    })); });
}
$("#b-test").addEventListener("click", incepeTest);

/* autoevaluarea după grila B și tipărirea sintezei */
function nota() { const p = [0.1, 0.3, 0.3, 0.3], v = $$("[data-crit]").map(i => Math.min(10, Math.max(1, num(i.value) || 1))); $("#l7-nota").textContent = `Nota estimată a referatului: ${v.reduce((s, x, i) => s + x * p[i], 0).toFixed(2).replace(".", ",")}`; }
$$("[data-crit]").forEach(i => i.addEventListener("input", nota)); nota();
$("#b-tip-d").addEventListener("click", () => { document.body.classList.add("tip-d"); window.print(); setTimeout(() => document.body.classList.remove("tip-d"), 500); });
