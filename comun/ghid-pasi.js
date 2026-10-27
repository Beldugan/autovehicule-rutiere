/* Ghidul „pas cu pas” al lucrării, afișat la vedere deasupra planșei (MAM I).
   Folosește lista de pași existentă a lucrării (<ol id="pasi"> cu li.pas > .pas-cap + .pas-corp) și o rearanjează:
   rândul cu toți pașii (numerotați, cu progresul), iar dedesubt pasul curent – „Ce faceți” (operațiile numerotate),
   „Verificări” (bifate automat), comenzile pasului și butoanele de înregistrare, cu navigarea Pasul anterior / Pasul următor. */
"use strict";
(function () {
  const css = `
.ghid-pasi { border:2px solid var(--accent); border-radius:12px; margin:0 0 .7rem; background:color-mix(in srgb, var(--accent) 6%, var(--suprafata)); overflow:hidden; }
.ghid-pasi > .ghid-cap { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem .8rem; padding:.45rem .8rem; background:var(--accent); color:#fff; font:700 .95rem system-ui,sans-serif; }
.ghid-pasi > .ghid-cap small { font-weight:500; opacity:.9; }
.ghid-pasi > .ghid-cap .ghid-ascunde { margin-left:auto; background:rgba(255,255,255,.16); color:#fff; border:1px solid rgba(255,255,255,.5); font-size:.78rem; padding:.15rem .55rem; }
.ghid-pasi.restrans .pasi .pas-corp { display:none !important; }
.ghid-pasi .pasi { list-style:none; margin:0; padding:.55rem; display:grid; grid-template-columns:repeat(var(--n, 5), minmax(0, 1fr)); gap:.4rem; }
.ghid-pasi .pas { display:contents; }
.ghid-pasi .pas-cap { grid-row:1; border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); padding:.35rem .45rem; font-size:.8rem; line-height:1.25; min-height:3.1rem; }
.ghid-pasi .pas.activ .pas-cap { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 14%, var(--suprafata)); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.ghid-pasi .pas.gata .pas-cap { border-color:#2e9e44; }
.ghid-pasi .pas-corp { grid-row:2; grid-column:1 / -1; display:grid; grid-template-columns:minmax(0, 1.55fr) minmax(0, 1fr); grid-template-areas:"titlu titlu" "op ver" "op ctl" "op but"; align-content:start; gap:.35rem 1.1rem;
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
@media (max-width:900px) {
  .ghid-pasi .pas-corp { grid-template-columns:1fr; grid-template-areas:"titlu" "op" "ver" "ctl" "but"; }
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
    });
    if (sec && !sec.querySelector(".ghid-ascunde")) {
      const b = document.createElement("button"); b.type = "button"; b.className = "ghid-ascunde"; b.textContent = "Restrânge";
      b.addEventListener("click", () => { sec.classList.toggle("restrans"); b.textContent = sec.classList.contains("restrans") ? "Arată pasul curent" : "Restrânge"; });
      sec.querySelector(".ghid-cap").appendChild(b);
    }
  };
  /** secțiunea HTML în care se mută lista de pași */
  window.ghidSectiune = (titlu) => `<section class="ghid-pasi" aria-label="Desfășurarea lucrării pas cu pas"><div class="ghid-cap">📋 Desfășurarea lucrării – pas cu pas <small>${titlu || "parcurgeți pașii în ordine; verificările se bifează automat, iar valorile intră în tabele numai din aparate"}</small></div><ol class="pasi" id="pasi"></ol></section>`;
})();
