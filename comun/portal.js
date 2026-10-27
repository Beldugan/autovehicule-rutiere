/* Paginile portalului: pagina principală (semestre → discipline) și pagina unei discipline (lista lucrărilor) */
"use strict";


const BAZA_PORTAL = ((document.currentScript && document.currentScript.src) || "").replace(/[^/]*$/, "");
function antetPortal(titlu, sub, inapoi) {
  return `<header class="antet">
    <div class="antet-text"><div class="marca"><img src="${BAZA_PORTAL}icon.svg" alt="" width="18" height="18">Autovehicule Rutiere <span>· Laboratoare virtuale v2.0</span></div><p class="supratitlu">${esc(PORTAL.univ)} · ${esc(PORTAL.facultate)} · ${esc(PORTAL.an)}</p><h1>${titlu}</h1><p>${sub}</p></div>
    <div class="antet-butoane">${inapoi ? `<a class="buton" href="${inapoi}">← Toate disciplinele</a>` : ""}${Tema.html()}</div>
  </header>`;
}
function realizata(disc, n) { return PORTAL.realizate[`${PORTAL.discipline[disc].dosar}-l${n}`]; }

function paginaPrincipala() {
  const toate = Object.entries(PORTAL.discipline), ROM = ["II", "III", "IV"];
  const card = ([k, d]) => { const tot = d.lucrari.length, gata = d.lucrari.filter((_, i) => realizata(k, i + 1)).length;
    return `<a class="disc-card" href="${d.dosar}/index.html"><span class="tip">${d.tip} · ${d.cod}</span><h3>${esc(d.nume)}</h3>
      <span class="meta">${tot ? `${tot} lucrări · ${gata} disponibile în laboratorul virtual` : "proiect · aplicațiile de calcul și etapele"}</span>
      ${tot ? `<span class="progres"><i style="width:${Math.round(gata / tot * 100)}%"></i></span>` : ""}</a>`; };
  const ani = ROM.map(an => {
    const dinAn = toate.filter(([, d]) => String(d.an).toLowerCase() === "anul " + an.toLowerCase());
    const sem = [1, 2].map(s => { const l = dinAn.filter(([, d]) => d.sem === s), id = `an${an}-s${s}`;
      return `<details class="semestru" data-mem="${id}"><summary><span class="sageata" aria-hidden="true"></span>Semestrul ${s === 1 ? "I" : "II"}<small>${l.length ? `${l.length} ${l.length === 1 ? "disciplină" : "discipline"}` : "în pregătire"}</small></summary>
        ${l.length ? `<div class="grila-discipline">${l.map(card).join("")}</div>` : `<p class="semestru-gol">Disciplinele vor fi adăugate pe parcurs.</p>`}</details>`; }).join("");
    return `<details class="an-studiu" data-mem="an${an}"><summary><span class="sageata" aria-hidden="true"></span>Anul ${an}<small>${dinAn.length ? `${dinAn.length} ${dinAn.length === 1 ? "disciplină" : "discipline"}` : "în pregătire"}</small></summary><div class="an-semestre">${sem}</div></details>`;
  }).join("");
  document.body.innerHTML = antetPortal(`${esc(PORTAL.program)} – laboratoare și proiecte`, `Laboratoare virtuale · ${esc(PORTAL.cadru)}`) + `
  <main class="pagina">
    ${ani}
    <section class="card" style="margin-top:1.6rem">
      <h2>Cum se lucrează</h2>
      <ol>
        <li>Deschideți lucrarea zilei; în sală introduceți numele, e-mailul din Classroom, grupa și <b>codul de sesiune</b> afișat pe proiector – prezența se înregistrează automat.</li>
        <li>Faceți determinările în simulator: fiecare student are parametri individuali, deci date proprii.</li>
        <li>Completați referatul (întrebările individuale și concluziile se scriu de la tastatură) și trimiteți-l: se creează un document Google pe care îl predați în Classroom cu butonul „Share to Classroom”.</li>
      </ol>
      <p class="nota">Fără cod de sesiune, aplicațiile rulează în mod demonstrativ (pentru pregătire și recapitulare).</p>
    </section>
  </main>
  <footer class="subsol"><p>${esc(PORTAL.cadru)} · ${esc(PORTAL.univ)}, ${PORTAL.an}</p></footer>`;
  // meniurile derulante: starea deschis / închis se păstrează în browser
  let mem = {}; try { mem = JSON.parse(localStorage.getItem("portal-meniu") || "{}"); } catch (e) { mem = {}; }
  document.querySelectorAll("details[data-mem]").forEach(el => { if (mem[el.dataset.mem]) el.open = true;
    el.addEventListener("toggle", () => { mem[el.dataset.mem] = el.open; try { localStorage.setItem("portal-meniu", JSON.stringify(mem)); } catch (e) { /* fără stocare */ } }); });
  Tema.leaga();
}

function paginaDisciplina(k) {
  const d = PORTAL.discipline[k];
  document.title = d.nume;
  document.body.innerHTML = antetPortal(esc(d.nume), `${d.tip} · ${esc(d.an)}, semestrul ${d.sem} · cod ${d.cod} · ${esc(d.indrumar)}`, "../index.html") + `
  <main class="pagina">
    ${d.pdf ? `<p><a class="buton" href="../${d.pdf}" target="_blank" rel="noopener">Îndrumarul de laborator (PDF)</a></p>` : ""}
    <div class="lista-lucrari">
      ${d.lucrari.map((t, i) => {
        const cale = realizata(k, i + 1);
        return cale ? `<a class="lucrare" href="../${cale}index.html"><span class="nr">${i + 1}</span><span><span class="titlu">${esc(t)}</span><br><span class="desc">${(PORTAL.descrieri || {})[`${d.dosar}-l${i + 1}`] || "laborator virtual · determinări individuale · referat"}</span></span><span class="insigna gata">disponibilă</span></a>`
          : `<div class="lucrare"><span class="nr">${i + 1}</span><span><span class="titlu">${esc(t)}</span><br><span class="desc">simulatorul este în lucru</span></span><span class="insigna lucru">în pregătire</span></div>`;
      }).join("")}
    </div>
    ${d.extra ? d.extra : ""}
  </main>
  <footer class="subsol"><p>${esc(PORTAL.cadru)} · ${esc(PORTAL.univ)}, ${PORTAL.an}</p></footer>`;
  Tema.leaga();
}
