/* Ghidul „pas cu pas” al lucrării, afișat la vedere deasupra planșei (MAM I).
   Folosește lista de pași existentă a lucrării (<ol id="pasi"> cu li.pas > .pas-cap + .pas-corp) și o rearanjează:
   rândul cu toți pașii (numerotați, cu progresul), iar dedesubt pasul curent – „Ce faceți” (operațiile numerotate),
   „Verificări” (bifate automat), comenzile pasului și butoanele de înregistrare, cu navigarea Pasul anterior / Pasul următor. */
"use strict";
(function () {
  const css = `
.ghid-pasi { border:2px solid var(--accent); border-radius:12px; margin:0 0 .7rem; background:color-mix(in srgb, var(--accent) 6%, var(--suprafata)); overflow:hidden; color:var(--text); }
.ghid-pasi .pas-corp, .ghid-pasi .pas-cap, .ghid-pasi .ghid-op > li, .ghid-pasi .pas-ver li, .ghid-titlu b, .ghid-pasi .pas-ctl, .ghid-pasi label { color:var(--text); }
.ghid-pasi .pas-ver li.ok, .ghid-titlu .ghid-tab, .ghid-pasi .pas-cap small { color:var(--text-sec) !important; }
.ghid-pasi code { color:var(--text); background:var(--suprafata-2); padding:0 .25rem; border-radius:4px; }
.ghid-pasi > .ghid-cap { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem .8rem; padding:.45rem .8rem; background:var(--accent); color:#fff; font:700 .95rem system-ui,sans-serif; }
.ghid-pasi > .ghid-cap small { font-weight:500; opacity:.9; }
.ghid-pasi > .ghid-cap .ghid-ascunde { margin-left:auto; background:rgba(255,255,255,.16); color:#fff; border:1px solid rgba(255,255,255,.5); font-size:.78rem; padding:.15rem .55rem; }
.ghid-pasi.restrans .pasi .pas-corp { display:none !important; }
.ghid-pasi .pasi { list-style:none; margin:0; padding:.55rem; display:grid; grid-template-columns:repeat(var(--n, 5), minmax(0, 1fr)); gap:.4rem; }
.ghid-pasi .pas { display:contents; }
.ghid-pasi .pas-cap { grid-row:1; border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); padding:.35rem .45rem; font-size:.8rem; line-height:1.25; min-height:3.1rem; }
.ghid-pasi .pas.activ .pas-cap { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 14%, var(--suprafata)); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.ghid-pasi .pas.gata .pas-cap { border-color:#2e9e44; }
.ghid-pasi .pas-corp { grid-row:2; grid-column:1 / -1; display:grid; grid-template-columns:minmax(0, 1.55fr) minmax(0, 1fr); grid-template-areas:"titlu titlu" "ind ind" "op ver" "op ctl" "op but"; align-content:start; gap:.35rem 1.1rem;
  padding:.65rem .8rem .75rem; background:var(--suprafata); border:1px solid var(--accent); border-radius:10px; font-size:.93rem; }
.ghid-pasi .pas:not(.activ) .pas-corp { display:none; }
.ghid-titlu { grid-area:titlu; display:flex; flex-wrap:wrap; align-items:center; gap:.3rem .7rem; padding-bottom:.4rem; border-bottom:1px solid var(--linie); }
.ghid-titlu .ghid-nr { background:var(--accent); color:#fff; border-radius:999px; padding:.1rem .6rem; font:700 .8rem system-ui; }
.ghid-titlu b { font-size:1.05rem; } .ghid-titlu .ghid-tab { color:var(--text-sec); font-size:.85rem; }
.ghid-titlu .ghid-gata { color:#2e9e44; font-weight:700; font-size:.85rem; display:none; } .pas.gata .ghid-titlu .ghid-gata { display:inline; }
.ghid-titlu .ghid-nav { margin-left:auto; display:flex; gap:.35rem; } .ghid-titlu .ghid-nav button { font-size:.8rem; padding:.2rem .6rem; }
.ghid-pasi .ghid-op { grid-area:op; margin:0; padding:0; list-style:none; counter-reset:op; }
.ghid-pasi .ghid-op::before, .ghid-pasi .pas-ver::before, .ghid-pasi .pas-ctl::before { display:block; font:700 .72rem system-ui; text-transform:uppercase; letter-spacing:.04em; color:var(--accent); margin:.15rem 0 .3rem; }
.ghid-pasi .ghid-op::before { content:"Ce faceți – în ordine"; }
.ghid-pasi .ghid-op > li { counter-increment:op; position:relative; padding:.3rem .2rem .3rem 2.1rem; margin:0 0 .25rem; line-height:1.45; border-radius:6px; }
.ghid-pasi .ghid-op > li:nth-child(odd) { background:color-mix(in srgb, var(--accent) 5%, transparent); }
.ghid-pasi .ghid-op > li::before { content:counter(op); position:absolute; left:.3rem; top:.3rem; width:1.4rem; height:1.4rem; border-radius:50%; background:var(--accent); color:#fff; display:grid; place-items:center; font:700 .75rem system-ui; }
.ghid-pasi .pas-ver { grid-area:ver; list-style:none; margin:0 !important; padding:.35rem .5rem !important; border:1px dashed var(--linie); border-radius:8px; font-size:.86rem; }
.ghid-pasi .pas-ver::before { content:"Verificări (se bifează singure)"; }
.ghid-pasi .pas-ver li { margin:.15rem 0; } .ghid-pasi .pas-ver li::before { content:"○ "; color:#c62828; font-weight:700; } .ghid-pasi .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; } .ghid-pasi .pas-ver li.ok { color:var(--text-sec); }
.ghid-pasi .pas-ctl { grid-area:ctl; margin:0; } .ghid-pasi .pas-ctl::before { content:"Comenzi rapide"; }
.ghid-pasi .pas-but { grid-area:but; display:flex; flex-direction:column; gap:.35rem; align-self:end; }
.ghid-indiciu { grid-area:ind; display:none; gap:.5rem; align-items:flex-start; padding:.45rem .65rem; border-radius:8px; background:color-mix(in srgb, #ff9800 14%, var(--suprafata)); border:1px solid color-mix(in srgb, #ff9800 55%, transparent); font-size:.9rem; line-height:1.4; cursor:pointer; }
.ghid-pasi.cu-indicii .ghid-indiciu.are { display:flex; }
.ghid-indiciu .gi-nr { flex:none; min-width:1.5rem; height:1.5rem; border-radius:999px; background:#ef6c00; color:#fff; display:grid; place-items:center; font:700 .78rem system-ui; padding:0 .3rem; }
.ghid-indiciu .gi-lista { margin:.25rem 0 0; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:.25rem .5rem; font-size:.78rem; color:var(--text-sec); }
.ghid-indiciu .gi-lista li.ok { color:#2e9e44; } .ghid-indiciu .gi-lista li.acum { color:#ef6c00; font-weight:700; }
.ghid-indiciu .gi-lista li::before { content:attr(data-n) ". "; }
.ghid-tinta { outline:3px solid #ef6c00 !important; outline-offset:2px; animation:ghidPuls 1.1s ease-in-out infinite; position:relative; }
.ghid-tinta::after { content:attr(data-ghid-nr); position:absolute; top:-.7rem; right:-.7rem; min-width:1.2rem; height:1.2rem; padding:0 .25rem; border-radius:999px; background:#ef6c00; color:#fff; font:700 .7rem/1.2rem system-ui; text-align:center; z-index:5; pointer-events:none; }
@keyframes ghidPuls { 0%,100% { outline-color:#ef6c00; } 50% { outline-color:rgba(239,108,0,.25); } }
@keyframes ghidPulsSvg { 0%,100% { stroke-opacity:1; } 50% { stroke-opacity:.25; } }
.ghid-ov .gi-acum { animation:ghidPulsSvg 1.1s ease-in-out infinite; }
.ghid-pasi > .ghid-cap .ghid-ind-b { background:rgba(255,255,255,.16); color:#fff; border:1px solid rgba(255,255,255,.5); font-size:.78rem; padding:.15rem .55rem; }
@media (max-width:900px) {
  .ghid-pasi .pas-corp { grid-template-columns:1fr; grid-template-areas:"titlu" "ind" "op" "ver" "ctl" "but"; }
  .ghid-pasi .pas-cap > span:nth-child(2) { display:none; } .ghid-pasi .pas-cap { min-height:0; justify-content:center; }
}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /** rearanjează lista de pași; alege(i, zoom) = funcția lucrării care activează pasul i */
  window.ghidPasi = function (PASI, alege) {
    const ol = document.getElementById("pasi"); if (!ol) return;
    const n = PASI.length, sec = ol.closest(".ghid-pasi");
    if (sec) sec.style.setProperty("--n", n);
    ol.querySelectorAll(":scope > .pas").forEach((li, i) => {
      const corp = li.querySelector(".pas-corp"); if (!corp || corp.querySelector(".ghid-titlu")) return;
      const p = PASI[i], cap = document.createElement("div"); cap.className = "ghid-titlu";
      cap.innerHTML = `<span class="ghid-nr">Pasul ${i + 1} din ${n}</span><b>${p.t}</b><span class="ghid-tab">${p.tab || ""}</span><span class="ghid-gata">✓ pas încheiat</span>
        <span class="ghid-nav"><button type="button" data-ghid="-1"${i ? "" : " disabled"}>◀ Pasul anterior</button><button type="button" class="primar" data-ghid="1"${i < n - 1 ? "" : " disabled"}>Pasul următor ▶</button></span>`;
      corp.prepend(cap);
      cap.querySelectorAll("[data-ghid]").forEach(b => b.addEventListener("click", () => { alege(i + +b.dataset.ghid, true); if (sec) sec.scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
      const op = corp.querySelector(":scope > ol"); if (op) op.classList.add("ghid-op");
      if (PASI[i].ind) { const d = document.createElement("div"); d.className = "ghid-indiciu"; d.dataset.ind = i; cap.after(d); }
    });
    if (sec && !sec.querySelector(".ghid-ascunde")) {
      const b = document.createElement("button"); b.type = "button"; b.className = "ghid-ascunde"; b.textContent = "Restrânge";
      b.addEventListener("click", () => { sec.classList.toggle("restrans"); b.textContent = sec.classList.contains("restrans") ? "Arată pasul curent" : "Restrânge"; });
      sec.querySelector(".ghid-cap").appendChild(b);
    }
  };
  /* ------------------------------------------------------------ indiciile: ce se conectează / se apasă și în ce ordine
     pas.ind() → [[selector, text, gata], …]; primul element neterminat este operația curentă: este evidențiat pe planșă
     (contur portocaliu pulsând cu numărul de ordine) sau în pagină (buton, câmp), iar textul apare deasupra operațiilor. */
  let indOn = true; try { indOn = localStorage.getItem("ghid-indicii") !== "0"; } catch (e) { /* fără stocare */ }
  let indPasi = null, indActiv = null, indTimer = 0, indElem = [];
  const inSvgCoord = (svg, r) => { const m = svg.getScreenCTM(); if (!m) return null; const inv = m.inverse(), p = svg.createSVGPoint();
    const c = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].map(([x, y]) => { p.x = x; p.y = y; const q = p.matrixTransform(inv); return [q.x, q.y]; });
    const xs = c.map(v => v[0]), ys = c.map(v => v[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), k: Math.abs(inv.a) || 1 }; };
  let indSig = "";
  function curataInd() {
    indElem.forEach(el => { el.classList.remove("ghid-tinta"); el.removeAttribute("data-ghid-nr"); }); indElem = [];
    document.querySelectorAll(".ghid-ov").forEach(g => g.remove());
  }
  function deseneazaInd() {
    const sec = document.querySelector(".ghid-pasi"); if (!sec || !indPasi) return;
    sec.classList.toggle("cu-indicii", indOn);
    const i = indActiv(), p = indPasi[i], box = document.querySelector(`.ghid-indiciu[data-ind="${i}"]`);
    document.querySelectorAll(".ghid-indiciu").forEach(b => { if (b !== box) b.classList.remove("are"); });
    let lista = []; if (p && p.ind && box) { try { lista = p.ind() || []; } catch (e) { lista = []; } }
    const j = lista.findIndex(x => !x[2]), toateGata = j < 0;
    // ce trebuie desenat: în SVG (dreptunghi + număr) sau în pagină (clasa ghid-tinta)
    const svgs = new Map(), dom = [];
    if (indOn && !toateGata) lista.forEach((x, n) => {
      if (x[2] || n > j + 2) return;
      (Array.isArray(x[0]) ? x[0] : [x[0]]).forEach(sel => {
      const el = [...document.querySelectorAll(sel)].find(e => e.getClientRects().length); if (!el) return;
      const svg = el.ownerSVGElement;
      if (svg) { const r = el.getBoundingClientRect(); if (!r.width && !r.height) return; const b = inSvgCoord(svg, r); if (!b) return;
        const k = b.k, pad = 5 * k, acum = n === j, cul = acum ? "#ef6c00" : "#8a94a3";
        svgs.set(svg, (svgs.get(svg) || "") + `<rect class="${acum ? "gi-acum" : ""}" x="${(b.x - pad).toFixed(1)}" y="${(b.y - pad).toFixed(1)}" width="${(b.w + 2 * pad).toFixed(1)}" height="${(b.h + 2 * pad).toFixed(1)}" rx="${6 * k}" fill="${acum ? "rgba(239,108,0,.08)" : "none"}" stroke="${cul}" stroke-width="${(acum ? 3 : 1.6) * k}"${acum ? "" : ` stroke-dasharray="${5 * k} ${4 * k}"`}/>
          <circle cx="${(b.x + b.w + pad).toFixed(1)}" cy="${(b.y - pad).toFixed(1)}" r="${10 * k}" fill="${cul}"/><text x="${(b.x + b.w + pad).toFixed(1)}" y="${(b.y - pad + 4 * k).toFixed(1)}" font-size="${12 * k}" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui">${n + 1}</text>`); }
      else if (n === j) dom.push([el, n + 1]);
      });
    });
    const sig = [i, indOn, j, lista.map(x => (x[2] ? 1 : 0) + x[1]).join("|"), [...svgs.values()].join(""), dom.map(d => d[1]).join()].join("#");
    const ovLipsa = [...svgs.keys()].some(sv => !sv.querySelector(":scope > .ghid-ov")) || dom.some(([el]) => !el.classList.contains("ghid-tinta"));
    if (sig === indSig && !ovLipsa) return; indSig = sig;
    curataInd();
    if (!lista.length) { if (box) box.classList.remove("are"); return; }
    box.classList.add("are");
    box.innerHTML = `<span class="gi-nr">${toateGata ? "✓" : j + 1}</span><div><b>${toateGata ? "Operațiile pasului sunt făcute" : "Indiciu – acum:"}</b> ${toateGata ? "verificați rezultatele și înregistrați / treceți la pasul următor." : lista[j][1]}
      <ol class="gi-lista">${lista.map((x, n) => `<li data-n="${n + 1}" class="${x[2] ? "ok" : n === j ? "acum" : ""}">${x[2] ? "✓ " : ""}${String(x[1]).replace(/<[^>]+>/g, "").split(/ \(| – |; /)[0].trim().slice(0, 60)}</li>`).join("")}</ol></div>`;
    box.onclick = () => { if (j < 0) return; const s0 = lista[j][0], el = document.querySelector(Array.isArray(s0) ? s0[s0.length - 1] : s0); if (el && el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" }); };
    svgs.forEach((html, svg) => { const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("class", "ghid-ov"); g.setAttribute("pointer-events", "none"); g.innerHTML = html; svg.appendChild(g); });
    dom.forEach(([el, n]) => { el.classList.add("ghid-tinta"); el.setAttribute("data-ghid-nr", n); indElem.push(el); });
  }
  /** pornește indiciile: PASI cu câmpul ind, activ() = indicele pasului curent */
  window.ghidIndicii = function (PASI, activ) {
    indPasi = PASI; indActiv = activ;
    const sec = document.querySelector(".ghid-pasi");
    if (sec && !sec.querySelector(".ghid-ind-b")) { const b = document.createElement("button"); b.type = "button"; b.className = "ghid-ind-b";
      const t = () => { b.textContent = indOn ? "💡 Indicii: pornite" : "💡 Indicii: oprite"; }; t();
      b.addEventListener("click", () => { indOn = !indOn; try { localStorage.setItem("ghid-indicii", indOn ? "1" : "0"); } catch (e) { /* fără stocare */ } t(); indSig = ""; deseneazaInd(); });
      const r = sec.querySelector(".ghid-ascunde"); sec.querySelector(".ghid-cap").insertBefore(b, r || null); }
    clearInterval(indTimer); indTimer = setInterval(deseneazaInd, 450); deseneazaInd();
  };
  /** secțiunea HTML în care se mută lista de pași */
  window.ghidSectiune = (titlu) => `<section class="ghid-pasi" aria-label="Desfășurarea lucrării pas cu pas"><div class="ghid-cap">📋 Desfășurarea lucrării – pas cu pas <small>${titlu || "parcurgeți pașii în ordine; verificările se bifează automat, iar valorile intră în tabele numai din aparate"}</small></div><ol class="pasi" id="pasi"></ol></section>`;
})();
