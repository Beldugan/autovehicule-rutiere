/* Elementele de interfață comune modulelor S și F: scheletul modulului, zona unui studiu (scena 3D unică a modulului,
   parametri, rezultate, grafice, concluzii), câmpurile numerice și comenzile de redare în timp. */
import { creeazaScena } from "./scena.js";

export function creeazaUI(prov) {
  const U = { SC: null, studiu: null, activ: true, V3D: null };
  // bucla studiului (independentă de scena proprie: studiile cu autovehiculul 3D al portalului nu folosesc scena modulului)
  let tP = performance.now();
  const bucla = (t) => { requestAnimationFrame(bucla); const dt = Math.max(0, Math.min(0.1, (t - tP) / 1000)); tP = t;
    if (U.activ && U.studiu && U.studiu.pas && U.studiu.gazda && U.studiu.gazda.getClientRects().length) { try { U.studiu.pas(dt); } catch (e) { console.error(e); U.studiu = null; } } };
  requestAnimationFrame(bucla);
  /** autovehiculul 3D al portalului (aceeași machetă ca în celelalte lucrări), comandat de simulare */
  U.vehicul = async (gazda, tip, extern) => {
    if (U.V3D && U.V3D.distruge) U.V3D.distruge(); U.V3D = null;
    gazda.innerHTML = `<p class="nota">Se încarcă autovehiculul 3D…</p>`;
    const m = await import("../../../comun/vehicul3d.js?v=33");
    gazda.innerHTML = ""; U.V3D = m.creeaza(gazda, { sistem: "hibrid", tip, tipuri: [tip], extern });
    return U.V3D;
  };
  U.schelet = (el, titlu, sub, eticheta) => {
    el.innerHTML = `<div class="card"><div class="mod-antet"><div><h2>${titlu}</h2><p class="nota">${sub}</p></div><span class="mod-prov">${eticheta}</span></div>
      <div class="mod-studii"></div><div class="mod-corp"></div></div>`;
    return { studii: el.querySelector(".mod-studii"), corp: el.querySelector(".mod-corp") };
  };
  U.zonaLucru = (corp, comenziHTML, parHTML, faraScena) => {
    if (U.V3D && U.V3D.distruge) { U.V3D.distruge(); U.V3D = null; }
    corp.innerHTML = `<div class="mod-grila${faraScena === "v3d" ? " cu-v3d" : ""}"><div>${faraScena === "v3d" ? `<div class="mod-v3d"></div>` : faraScena ? "" : `<div class="mod-scena"></div>`}<div class="mod-comenzi">${comenziHTML}</div></div>
      <div><div class="mod-par">${parHTML}</div></div></div><div class="mod-rez"></div><div class="mod-graf-grila"></div><div class="mod-ver"></div>`;
    let gaz = corp.querySelector(".mod-scena");
    if (gaz) {
      if (!U.SC) { U.SC = creeazaScena(gaz, { prov }); U.SC.grup = new U.SC.THREE.Group(); U.SC.scene.add(U.SC.grup); }
      else { gaz.replaceWith(U.SC.gazda); gaz = U.SC.gazda; }
      U.SC.goleste(U.SC.grup); U.SC.hud(""); U.SC.legenda(null);
    }
    return { scena: gaz, v3d: corp.querySelector(".mod-v3d"), sc3: U.SC, corp, comenzi: corp.querySelector(".mod-comenzi"), par: corp.querySelector(".mod-par"), rez: corp.querySelector(".mod-rez"), graf: corp.querySelector(".mod-graf-grila"), ver: corp.querySelector(".mod-ver") };
  };
  U.camp = (k, et, v, pas = "any", u = "") => `<label><span>${et}${u ? ` [${u}]` : ""}</span><input type="number" step="${pas}" data-p="${k}" value="${v}"></label>`;
  U.alege = (k, et, opt, v) => `<label><span>${et}</span><select data-p="${k}">${opt.map(([a, b]) => `<option value="${a}"${a === v ? " selected" : ""}>${b}</option>`).join("")}</select></label>`;
  U.bifa = (k, et, v) => `<label><span>${et}</span><input type="checkbox" data-p="${k}"${v ? " checked" : ""} style="justify-self:end;width:auto"></label>`;
  U.citeste = (cont) => { const o = {}; cont.querySelectorAll("[data-p]").forEach((x) => { o[x.dataset.p] = x.type === "checkbox" ? x.checked : x.tagName === "SELECT" ? x.value : parseFloat(x.value); }); return o; };
  /** redarea unei serii în timp: comenzi play / viteză / cursor; întoarce st = { k (indexul curent), ruleaza, viteza } și actualizarea cursorului */
  U.redare = (z, N, eticheta = (k) => k, vitezaImplicita = 5) => {
    z.comenzi.insertAdjacentHTML("afterbegin", `<button type="button" data-a="play">⏸ Pauză</button><label>viteza <select data-a="vit">${[1, 2, 5, 10, 20, 50].map((v) => `<option value="${v}"${v === vitezaImplicita ? " selected" : ""}>×${v}</option>`).join("")}</select></label><label>t <input type="range" data-a="t" min="0" max="${N - 1}" step="1" value="0" style="width:200px"><output data-a="tv"></output></label>`);
    const st = { k: 0, ruleaza: true, viteza: vitezaImplicita, N };
    const b = z.comenzi.querySelector('[data-a="play"]'), sl = z.comenzi.querySelector('[data-a="t"]'), o = z.comenzi.querySelector('[data-a="tv"]');
    b.addEventListener("click", () => { st.ruleaza = !st.ruleaza; b.textContent = st.ruleaza ? "⏸ Pauză" : "▶ Pornește"; });
    z.comenzi.querySelector('[data-a="vit"]').addEventListener("change", (e) => { st.viteza = +e.target.value; });
    sl.addEventListener("input", () => { st.k = +sl.value; st.ruleaza = false; b.textContent = "▶ Pornește"; });
    st.afis = () => { if (document.activeElement !== sl) sl.value = Math.floor(st.k); o.textContent = eticheta(Math.floor(st.k)); };
    return st;
  };
  return U;
}
