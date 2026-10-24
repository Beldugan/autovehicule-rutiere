/* DA – Lucrarea 3. Starea mecanică a motorului.
   Simulator: motorul K7J pe stand (3D), stația AVL cu clește de curent pentru compresia relativă, compresometrul (test uscat
   și umed), testerul de pierdere de aer cu două manometre și punctele de ascultare, presiunea din colector (MAP / vacuumetru).
   Fiecare student are motorul propriu și un defect mecanic ascuns. Panoul din dreapta conduce lucrarea pas cu pas. */
"use strict";
const MD = MODELE["da-l3"];
function P() { return Cadru.P; }
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea standului */
const sim = {
  contact: false, merge: false, cr: false, tCr: 0, rpm: 0, ect: 86, inj: true, bujii: false, clapeta: false, manusi: false, exh: false, vBat: null,
  clesteI: false, sync: false, avl: { buf: [], t0: 0, rez: null, tot: 0 },
  comp: { c: 1, montat: false, n: 0, p: 0, z: 0, ulei: [false, false, false, false] },
  leak: { c: 1, pmi: 0, blocat: false, conectat: false, pin: 4.0, aplicat: false, asc: "" },
  map: { reg: "oprit", tReg: 0, buf: [], t: 0, p: 101, snap: -99, min: 999, snapOk: false },
  t: 0, msgAsc: ""
};

/* ------------------------------------------------------------------ fizica simplificată */
function cond() { return { bujii: sim.bujii, clapeta: sim.clapeta, cald: sim.ect > 70 }; }
function iDemaror(t) {     // curentul demarorului la antrenare (bujiile montate), t – timpul de la începutul antrenării [s]
  const p = P(), th = 360 * p.nCr / 60 * t, k = Math.floor(th / 180), fz = th - k * 180, cil = MD.ORDINE[((k % 4) + 4) % 4];
  const v = MD.iVarf(p, cil) - p.I0, prev = MD.iVarf(p, MD.ORDINE[(((k - 1) % 4) + 4) % 4]) - p.I0;
  let I = p.I0 + v * Math.exp(-(((fz - 150) / 32) ** 2)) + prev * Math.exp(-(((fz + 30) / 32) ** 2));
  if (t < 0.25) I += 420 * Math.exp(-t / 0.06);
  return I + (Math.random() - 0.5) * 3;
}
function evenimentCompresie(c) {         // o cursă de compresie a cilindrului c în timpul antrenării cu bujiile scoase
  const C = sim.comp; if (!C.montat || C.c !== c) return;
  C.n++; C.p = Math.max(C.p, MD.compresie(P(), c, C.ulei[c - 1], cond(), C.n) + C.z);
}
function pMap(reg, t) {
  const p = P(), d = p.defect, b = MD.pCol(p, "ralanti", 0), tt = sim.t;
  if (reg === "oprit") return p.patm;
  if (reg === "ralanti") {
    let v = b + 0.6 * Math.sin(2 * Math.PI * 26.7 * tt);
    if (["sadm", "sev", "garn"].includes(d.tip)) { const fz = (tt * 800 / 120) % 1; v += 5.5 * Math.exp(-(((fz - 0.5) / 0.06) ** 2)); }
    if (d.tip === "seg") v += 1.2 * Math.sin(tt * 3.1) * Math.sin(tt * 7.3);
    return v;
  }
  if (reg === "r2500") return MD.pCol(p, "r2500", t) + 0.4 * Math.sin(2 * Math.PI * 83 * tt);
  if (reg === "accel") {
    if (t < 0.6) return 92;
    const mn = MD.pCol(p, "accel", 0), tau = d.tip === "evac" ? 3.2 : 0.7, u = t - 0.6;
    if (u < 0.35) return 92 + (mn - 92) * (u / 0.35);
    return b + (mn - b) * Math.exp(-(u - 0.35) / tau);
  }
  return b;
}

/* ------------------------------------------------------------------ desenele instrumentelor */
function svgGauge(cx, cy, r, max, val, et, unit, majore) {
  const a0 = -225, a1 = 45, ang = v => (a0 + (a1 - a0) * cl(v / max, 0, 1)) * Math.PI / 180;
  let s = `<circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="#2b2f35"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#f6f6f2" stroke="#999"/>`;
  for (let v = 0; v <= max + 1e-9; v += majore / 5) { const a = ang(v), maj = Math.abs(v / majore - Math.round(v / majore)) < 1e-6, l = maj ? 11 : 6;
    s += `<line x1="${cx + Math.cos(a) * (r - 2)}" y1="${cy + Math.sin(a) * (r - 2)}" x2="${cx + Math.cos(a) * (r - 2 - l)}" y2="${cy + Math.sin(a) * (r - 2 - l)}" stroke="#222" stroke-width="${maj ? 2 : 1}"/>`;
    if (maj) s += `<text x="${cx + Math.cos(a) * (r - 22)}" y="${cy + Math.sin(a) * (r - 22) + 4}" font-size="${r > 60 ? 11 : 9}" text-anchor="middle" fill="#222">${String(Math.round(v * 10) / 10).replace(".", ",")}</text>`; }
  const a = ang(val);
  s += `<text x="${cx}" y="${cy + r * 0.45}" font-size="10" text-anchor="middle" fill="#444">${unit}</text><text x="${cx}" y="${cy + r + 22}" font-size="10.5" text-anchor="middle" fill="currentColor" font-weight="600">${et}</text>`;
  s += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * (r - 8)}" y2="${cy + Math.sin(a) * (r - 8)}" stroke="#c62828" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" fill="#222"/>`;
  return s;
}
function cilindriSVG(sel, opt = {}) {   // vedere de sus a chiulasei: 4 orificii de bujie
  let s = `<rect x="20" y="20" width="400" height="110" rx="12" fill="#9da3aa" stroke="#6b7178"/><text x="220" y="150" font-size="11" text-anchor="middle" fill="currentColor">chiulasa (vedere de sus) – distribuția în dreapta</text>`;
  for (let c = 1; c <= 4; c++) {
    const x = 20 + c * 80, act = c === sel;
    s += `<g class="cil" data-cil="${c}" style="cursor:pointer"><circle cx="${x}" cy="75" r="30" fill="${act ? "#ffe9a8" : "#c9cdd2"}" stroke="${act ? "#e69500" : "#7a8088"}" stroke-width="${act ? 3 : 1.5}"/><text x="${x}" y="40" font-size="11" text-anchor="middle" fill="#222" font-weight="700">cil. ${c}</text>`;
    if (!sim.bujii) s += `<circle cx="${x}" cy="75" r="11" fill="#e0e0e0" stroke="#555"/><rect x="${x - 4}" y="62" width="8" height="26" fill="#f5f5f5" stroke="#777"/><text x="${x}" y="114" font-size="9" text-anchor="middle" fill="#333">bujie</text>`;
    else s += `<circle cx="${x}" cy="75" r="8" fill="#222"/>`;
    if (opt.ulei && sim.comp.ulei[c - 1]) s += `<path d="M${x + 18},92 q5,8 0,12 q-5,-4 0,-12z" fill="#c9a227"/><text x="${x + 18}" y="122" font-size="8" text-anchor="middle" fill="#7a5c00">ulei</text>`;
    if (opt.furtun === c) s += `<path d="M${x},75 C${x},170 ${opt.fx},150 ${opt.fx},${opt.fy}" fill="none" stroke="#1b1b1b" stroke-width="6" stroke-linecap="round"/><circle cx="${x}" cy="75" r="9" fill="#c9a043" stroke="#7a5c00"/>`;
    s += `</g>`;
  }
  return s;
}
function desenComp() {
  const C = sim.comp, el = $("#svg-comp"); if (!el) return;
  el.innerHTML = cilindriSVG(C.c, { ulei: true, furtun: C.montat ? C.c : 0, fx: 560, fy: 150 }) + `<g transform="translate(0,0)">${svgGauge(560, 92, 76, 20, C.p, "", "bar", 2)}</g>
    <text x="560" y="222" font-size="12" text-anchor="middle" fill="currentColor">${C.montat ? `montat în cilindrul ${C.c} · ${C.n} ${C.n === 1 ? "cursă" : "curse"}` : "nemontat"}</text>
    <text x="560" y="240" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">${C.montat ? fx(C.p, 1) + " bar" : ""}</text>`;
  $$("#svg-comp .cil").forEach(g => g.addEventListener("click", () => { if (C.montat) return Cadru.mesajTemporar("Demontați întâi compresometrul.", "atentie"); C.c = +g.dataset.cil; C.p = 0; C.n = 0; desenComp(); actualizeazaPasi(); }));
}
function desenLeak() {
  const L = sim.leak, el = $("#svg-leak"); if (!el) return;
  const pc = pcilCurent();
  let s = cilindriSVG(L.c, { furtun: L.conectat ? L.c : 0, fx: 640, fy: 150 });
  s += `<rect x="470" y="10" width="340" height="215" rx="10" fill="#e9ecef" stroke="#9aa0a6"/><text x="640" y="28" font-size="11" text-anchor="middle" fill="#333" font-weight="700">Tester de pierdere de aer</text>`;
  s += svgGauge(545, 100, 55, 10, L.aplicat ? L.pin : 0, "p_in (intrare)", "bar", 2) + svgGauge(735, 100, 55, 10, L.aplicat ? pc : 0, "p_cil (cilindru)", "bar", 2);
  s += `<rect x="620" y="98" width="40" height="14" rx="3" fill="#555"/><text x="640" y="125" font-size="8" text-anchor="middle" fill="#333">orificiu calibrat</text><text x="640" y="212" font-size="10" text-anchor="middle" fill="#333">aer comprimat 6…8 bar → regulator</text>`;
  s += `<text x="220" y="170" font-size="11" text-anchor="middle" fill="currentColor">PMI compresie: ${L.pmi ? "cilindrul " + L.pmi : "—"} · arbore ${L.blocat ? "blocat" : "neblocat"}</text>`;
  if (L.aplicat) s += `<text x="640" y="245" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">L = (${fx(L.pin, 2)} − ${fx(pc, 2)})/${fx(L.pin, 2)} = ${fx((L.pin - pc) / L.pin * 100, 1)} %</text>`;
  el.innerHTML = s;
  $$("#svg-leak .cil").forEach(g => g.addEventListener("click", () => { if (L.conectat) return Cadru.mesajTemporar("Deconectați întâi testerul.", "atentie"); L.c = +g.dataset.cil; L.aplicat = false; sim.leak.asc = ""; $("#asc").textContent = ""; desenLeak(); actualizeazaPasi(); }));
}
function pcilCurent() {
  const L = sim.leak; if (!L.aplicat) return 0;
  if (L.pmi !== L.c) return L.pin * 0.04;
  return L.pin * (1 - MD.pierdere(P(), L.c) / 100) + (L.z || 0);
}
function desenAVL() {
  const cv = $("#cv-avl"); if (!cv) return;
  const dpr = devicePixelRatio || 1, W = 760, H = 300, sc = (cv.clientWidth || W) / W;
  if (cv.width !== Math.round(W * sc * dpr)) { cv.width = Math.round(W * sc * dpr); cv.height = Math.round(H * sc * dpr); cv.style.height = Math.round(H * sc) + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
  g.fillStyle = "#0e1a26"; g.fillRect(0, 0, W, H);
  const X0 = 50, X1 = 740, Y0 = 26, Y1 = 250, Imax = 700;
  g.strokeStyle = "rgba(140,180,220,.18)"; g.lineWidth = 1; g.font = "10px system-ui"; g.fillStyle = "#9fb3c8";
  for (let i = 0; i <= 10; i++) { const x = X0 + (X1 - X0) * i / 10; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); }
  for (let j = 0; j <= 7; j++) { const y = Y0 + (Y1 - Y0) * j / 7; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.textAlign = "right"; g.fillText(Math.round(Imax - Imax * j / 7), X0 - 4, y + 3); }
  g.textAlign = "left"; g.fillStyle = "#e9f2ff"; g.font = "bold 12px system-ui"; g.fillText("AVL DiTEST · Compresie relativă (curentul demarorului)", 10, 16);
  g.font = "10px system-ui"; g.fillStyle = "#9fb3c8"; g.fillText("120 ms/div · 100 A/div · sincronizare: cilindrul 1", 470, 16);
  const B = sim.avl.buf; if (!B.length) { g.fillStyle = "#9fb3c8"; g.font = "12px system-ui"; g.fillText(sim.clesteI ? "Antrenați motorul cu demarorul (injecția dezactivată)." : "Montați cleștele de curent pe cablul demarorului.", 230, 140); return; }
  // fereastră de 1,2 s sincronizată pe cilindrul 1 (ultima cursă a cilindrului 1 aflată la cel puțin 1,2 s de capăt sau prima)
  const p = P(), Tcic = 120 / p.nCr, tEnd = B[B.length - 1][0];
  const tS = Math.max(0, tEnd - 1.2); void Tcic;
  const Xt = t => X0 + (t - tS) / 1.2 * (X1 - X0), Yi = I => Y1 - I / Imax * (Y1 - Y0);
  g.strokeStyle = "#ffd23f"; g.lineWidth = 1.6; g.beginPath(); let s0 = false;
  B.forEach(([t, I]) => { if (t < tS || t > tS + 1.2) return; const x = Xt(t), y = Math.max(Y0, Yi(I)); s0 ? g.lineTo(x, y) : g.moveTo(x, y); s0 = true; }); g.stroke();
  // marcajele cilindrilor (după sincronizare)
  if (sim.sync && tEnd > 0.4) {
    const thDeg = 360 * p.nCr / 60;
    for (let k = 0; k < 40; k++) { const tk = (k * 180 + 150) / thDeg; if (tk < tS || tk > tS + 1.2 || tk > tEnd) continue; const cil = MD.ORDINE[k % 4]; g.fillStyle = cil === 1 ? "#ff8a3d" : "#7fd1ff"; g.font = "bold 11px system-ui"; g.textAlign = "center"; g.fillText(cil, Xt(tk), Y0 + 12); }
    g.textAlign = "left";
  }
  const r = sim.avl.rez;
  g.fillStyle = "#9fb3c8"; g.font = "11px system-ui"; g.fillText(r ? `I₀ = ${Math.round(r.I0)} A` : sim.cr ? "achiziție…" : "", X0, Y1 + 18);
  if (r) {
    const mx = Math.max(...r.I.map(v => v - r.I0));
    r.I.forEach((v, i) => { const c = (v - r.I0) / mx * 100, x = 200 + i * 135; g.fillStyle = "#24384d"; g.fillRect(x, Y1 + 8, 120, 34); g.fillStyle = c < 90 ? "#ff6b6b" : "#6bdc8b"; g.fillRect(x, Y1 + 8, 120 * c / 100, 34);
      g.fillStyle = "#fff"; g.font = "bold 11px system-ui"; g.fillText(`cil. ${i + 1}: ${Math.round(v)} A · ${fx(c, 1)} %`, x + 4, Y1 + 29); });
  }
}
function desenMAP() {
  const cv = $("#cv-map"); if (!cv) return;
  const dpr = devicePixelRatio || 1, W = 760, H = 250, sc = (cv.clientWidth || W) / W;
  if (cv.width !== Math.round(W * sc * dpr)) { cv.width = Math.round(W * sc * dpr); cv.height = Math.round(H * sc * dpr); cv.style.height = Math.round(H * sc) + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
  g.fillStyle = "#07120d"; g.fillRect(0, 0, W, H);
  const X0 = 46, X1 = 560, Y0 = 20, Y1 = 228, T = 40, Pm = 110;
  g.strokeStyle = "rgba(120,200,160,.18)"; g.font = "10px system-ui"; g.fillStyle = "#9fe6c0";
  for (let i = 0; i <= 8; i++) { const x = X0 + (X1 - X0) * i / 8; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.textAlign = "center"; g.fillText(`${-T + i * 5} s`, x, Y1 + 13); }
  for (let v = 0; v <= Pm; v += 10) { const y = Y1 - v / Pm * (Y1 - Y0); g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); if (v % 20 === 0) { g.textAlign = "right"; g.fillText(v, X0 - 4, y + 3); } }
  g.textAlign = "left"; g.fillText("p_col [kPa] (senzorul MAP, X431)", X0, 13);
  const B = sim.map.buf, tn = sim.t;
  g.strokeStyle = "#6dff8e"; g.lineWidth = 1.4; g.beginPath(); let s0 = false;
  B.forEach(([t, p]) => { if (t < tn - T) return; const x = X0 + (t - tn + T) / T * (X1 - X0), y = Y1 - p / Pm * (Y1 - Y0); s0 ? g.lineTo(x, y) : g.moveTo(x, y); s0 = true; }); g.stroke();
  // vacuumetrul (depresiunea) – cadran
  const p = sim.map.p, dp = (P().patm - p) / 100, cx = 660, cy = 118, r = 82, a = (-225 + 270 * cl(dp / 1, 0, 1)) * Math.PI / 180;
  g.fillStyle = "#2b2f35"; g.beginPath(); g.arc(cx, cy, r + 8, 0, 7); g.fill(); g.fillStyle = "#f6f6f2"; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.strokeStyle = "#222"; g.fillStyle = "#222"; g.font = "10px system-ui"; g.textAlign = "center";
  for (let v = 0; v <= 1.0001; v += 0.1) { const b = (-225 + 270 * v) * Math.PI / 180, maj = Math.round(v * 10) % 2 === 0; g.lineWidth = maj ? 2 : 1; g.beginPath(); g.moveTo(cx + Math.cos(b) * (r - 3), cy + Math.sin(b) * (r - 3)); g.lineTo(cx + Math.cos(b) * (r - (maj ? 13 : 8)), cy + Math.sin(b) * (r - (maj ? 13 : 8))); g.stroke(); if (maj) g.fillText(String(Math.round(v * 10) / 10).replace(".", ","), cx + Math.cos(b) * (r - 25), cy + Math.sin(b) * (r - 25) + 3); }
  g.fillStyle = "#2e7d32"; g.globalAlpha = 0.25; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r - 2, (-225 + 270 * 0.55) * Math.PI / 180, (-225 + 270 * 0.7) * Math.PI / 180); g.fill(); g.globalAlpha = 1;
  g.fillStyle = "#444"; g.font = "9px system-ui"; g.fillText("depresiune [bar]", cx, cy + r * 0.42); g.fillText("verde: ralanti normal", cx, cy + r * 0.42 + 11);
  g.strokeStyle = "#c62828"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10)); g.stroke(); g.fillStyle = "#222"; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill();
  g.fillStyle = "#e9f2ff"; g.font = "bold 12px system-ui"; g.textAlign = "left"; g.fillText(`${fx(p, 1)} kPa · Δp = ${fx(dp, 2)} bar · ${Math.round(sim.rpm)} rot/min`, X0 + 230, 13);
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const CIL = [1, 2, 3, 4];
const COMPORT = ["stabil, valoare normală", "stabil, presiune ridicată (depresiune mică)", "pulsații regulate (un cilindru)", "oscilații neregulate, mici", "coboară sub ralanti și revine rapid", "revine lent după eliberarea pedalei", "crește progresiv (depresiunea scade)"];
const INTERP = { "stabil, valoare normală": "etanșare bună", "stabil, presiune ridicată (depresiune mică)": "distribuție decalată / uzură generală / aer fals", "pulsații regulate (un cilindru)": "supapă neetanșă sau garnitură", "oscilații neregulate, mici": "segmenți uzați / aprindere", "coboară sub ralanti și revine rapid": "motor sănătos", "revine lent după eliberarea pedalei": "evacuare obturată", "crește progresiv (depresiunea scade)": "evacuare obturată (contrapresiune)" };
const PASI = [
  { t: "Pregătirea", tab: "NSSM, baterie, motor cald", vedere: "general", panou: "prep",
    instr: ["Echipamentul de protecție: mănuși (motorul și bujiile sunt calde) și exhaustarea la țeava de evacuare.", "Măsurați tensiunea bateriei cu contactul luat: trebuie să fie ≥ 12,5 V.", "Motorul este adus la temperatura de funcționare (lichid ≥ 80 °C)."],
    ver: () => [[sim.manusi && sim.exh, "mănuși și exhaustare"], [sim.vBat !== null && sim.vBat >= 12.5, sim.vBat !== null ? `bateria: ${fx(sim.vBat, 2)} V` : "bateria nemăsurată"], [sim.ect >= 80, `lichid de răcire ${fx(sim.ect, 0)} °C`]],
    prog: () => (sim.manusi && sim.exh ? 1 : 0) + (sim.vBat !== null ? 1 : 0) + (sim.ect >= 80 ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși</label><label class="bifa"><input type="checkbox" id="ck-exh"> Exhaustare conectată</label></div>
      <button type="button" class="lat" id="b-bat">Măsoară tensiunea bateriei (multimetru)</button>` },
  { t: "Compresia relativă", tab: "Tabelul 3.1", vedere: "vol", panou: "avl",
    instr: ["Montați cleștele de curent pe cablul demarorului și senzorul de sincronizare pe fișa cilindrului 1.", "Dezactivați injecția din testerul X431 (altfel motorul pornește).", "Puneți contactul și antrenați motorul ≈ 5 s din meniul AVL (bujiile montate).", "Urmăriți vârfurile de curent: un vârf mai mic, repetat la fiecare ciclu, arată cilindrul slab. Înregistrați rezultatul."],
    ver: () => [[sim.clesteI, "cleștele pe cablul demarorului"], [sim.sync, "sincronizare pe cilindrul 1"], [!sim.inj, "injecția dezactivată"], [!sim.bujii, "bujiile montate"], [!!sim.avl.rez, "antrenare ≥ 3 s, rezultat AVL disponibil"]],
    prog: () => CIL.filter(c => pe("t31", "c" + c, "Imax")).length, tot: 4,
    ctl: `<div class="rand-butoane"><button type="button" id="b-cleste">Clește pe cablul demarorului</button><button type="button" id="b-sync">Senzor sincronizare cil. 1</button></div>
      <div class="rand-butoane"><button type="button" id="b-inj">Dezactivează injecția (X431)</button><button type="button" id="b-contact">Contact</button></div>
      <button type="button" class="lat" id="b-cr1">⟳ Antrenează cu demarorul 5 s</button>`,
    buton: ["● Rezultatul AVL → Tabelul 3.1", e => inregAVL(e)] },
  { t: "Presiunea de compresie", tab: "Tabelul 3.2", vedere: "sus", panou: "comp",
    instr: ["Cu motorul oprit și contactul luat demontați toate bujiile (mănuși); injecția rămâne dezactivată.", "Țineți clapeta complet deschisă (pedala apăsată).", "Alegeți cilindrul (clic pe el), montați compresometrul, antrenați 4–6 curse și înregistrați presiunea maximă; eliberați presiunea înaintea cilindrului următor.", "La cilindrul cu presiunea cea mai mică turnați 5 ml de ulei și repetați (testul umed)."],
    ver: () => [[sim.bujii, "toate bujiile demontate"], [!sim.inj, "injecția dezactivată"], [sim.clapeta, "clapeta complet deschisă"], [sim.comp.montat, `compresometrul montat în cilindrul ${sim.comp.c}`], [sim.comp.n >= 4, `${sim.comp.n} curse (minimum 4)`]],
    prog: () => CIL.filter(c => pe("t32", "c" + c, "us")).length + (CIL.some(c => pe("t32", "c" + c, "um")) ? 1 : 0), tot: 5,
    ctl: `<div class="rand-butoane"><button type="button" id="b-bujii">Demontează bujiile</button><button type="button" id="b-clap">Clapeta complet deschisă</button></div>
      <div class="rand-butoane"><button type="button" id="b-cmont">Montează compresometrul</button><button type="button" id="b-cr2">⟳ Antrenează ≈ 6 curse</button></div>
      <div class="rand-butoane"><button type="button" id="b-celib">Eliberează presiunea</button><button type="button" id="b-ulei">Toarnă 5 ml ulei (test umed)</button></div>`,
    buton: ["● Presiunea → Tabelul 3.2", e => inregComp(e)] },
  { t: "Pierderea de aer", tab: "Tabelul 3.3", vedere: "sus", panou: "leak",
    instr: ["Alegeți cilindrul și rotiți arborele cotit cu cheia până la PMI la sfârșitul compresiei (ambele supape închise).", "Blocați arborele (treapta / dispozitivul de blocare): presiunea l-ar roti brusc.", "Conectați testerul în orificiul bujiei, reglați p<sub>in</sub> (de obicei 4 bar) și aplicați presiunea progresiv.", "Citiți p<sub>cil</sub>, ascultați punctele de scăpare, alegeți locul pierderii și înregistrați."],
    ver: () => [[sim.bujii, "bujiile demontate"], [sim.leak.pmi === sim.leak.c, `cilindrul ${sim.leak.c} la PMI compresie`], [sim.leak.blocat, "arborele cotit blocat"], [sim.leak.conectat, "testerul conectat"], [sim.leak.aplicat, "presiunea aplicată"]],
    prog: () => CIL.filter(c => pe("t33", "c" + c, "pcil")).length, tot: 4,
    ctl: `<div class="rand-butoane"><button type="button" id="b-pmi">Rotește la PMI compresie</button><button type="button" id="b-bloc">Blochează arborele</button></div>
      <div class="rand-butoane"><button type="button" id="b-lcon">Conectează testerul</button><button type="button" id="b-lapl">Aplică presiunea</button></div>
      <label class="camp">p<sub>in</sub> (regulator) <input type="range" id="r-pin" min="3" max="5" step="0.1" value="4"> <b id="v-pin">4,0 bar</b></label>
      <p style="margin:.3rem 0 .2rem"><b>Ascultați:</b></p><div class="rand-butoane">${[["adm", "admisie"], ["ev", "evacuare"], ["ulei", "bușon ulei"], ["vas", "vas expansiune"], ["vec", "bujia vecină"]].map(([k, t]) => `<button type="button" data-asc="${k}">👂 ${t}</button>`).join("")}</div>
      <p class="nota" id="asc" aria-live="polite"></p>
      <label class="camp">Locul pierderii <select id="sel-loc">${MD.LOCURI.map(l => `<option>${l}</option>`).join("")}</select></label>`,
    buton: ["● p<sub>in</sub>, p<sub>cil</sub>, locul → Tabelul 3.3", e => inregLeak(e)] },
  { t: "Presiunea din colector", tab: "Tabelul 3.4", vedere: "adm", panou: "map",
    instr: ["Remontați bujiile la cuplul prescris, reactivați injecția, deconectați testerele.", "Cu contactul pus și motorul oprit citiți presiunea atmosferică (rândul „motor oprit”).", "Porniți motorul; la ralanti cald citiți presiunea și urmăriți comportamentul acului.", "Accelerați brusc și eliberați pedala (minimul după eliberare); apoi țineți 2500 rot/min 30 s. Alegeți comportamentul observat la fiecare regim."],
    ver: () => [[!sim.bujii, "bujiile montate"], [sim.inj, "injecția activă"], [!sim.comp.montat && !sim.leak.conectat, "testerele deconectate"], [sim.merge || (sim.contact && sim.map.reg === "oprit"), sim.merge ? `motor pornit – ${{ ralanti: "ralanti", accel: "accelerare bruscă", r2500: `2500 rot/min de ${Math.floor(sim.map.tReg)} s` }[sim.map.reg] || ""}` : "contact pus (motor oprit)"]],
    prog: () => ["atm", "ralanti", "accel", "r2500"].filter(k => pe("t34", k, "p")).length, tot: 4,
    ctl: `<div class="rand-butoane"><button type="button" id="b-bujii2">Remontează bujiile</button><button type="button" id="b-inj2">Reactivează injecția</button></div>
      <div class="rand-butoane"><button type="button" id="b-contact2">Contact</button><button type="button" class="primar" id="b-porn">Pornește motorul</button><button type="button" id="b-stop">Oprește</button></div>
      <div class="rand-butoane"><button type="button" data-reg="ralanti">Ralanti</button><button type="button" data-reg="accel">Accelerare bruscă</button><button type="button" data-reg="r2500">2500 rot/min</button></div>
      <label class="camp">Comportamentul observat <select id="sel-comp"><option value=""></option>${COMPORT.map(c => `<option>${c}</option>`).join("")}</select></label>`,
    buton: ["● p<sub>col</sub> și comportamentul → Tabelul 3.4", e => inregMap(e)] },
  { t: "Diagnosticul", tab: "Tabelul 3.5", vedere: "general", panou: "diag",
    instr: ["Comparați rezultatele celor patru metode (rezumatul din stânga).", "Un cilindru slab la compresia relativă trebuie să apară și la compresometru; testul umed și pierderea de aer arată cauza.", "Doi cilindri vecini slabi cu bule în vasul de expansiune → garnitura; toți egali dar mici și depresiune mică → distribuția; depresiunea care scade la turație constantă → evacuarea."],
    ver: () => [[CIL.every(c => pe("t31", "c" + c, "Imax")), "Tabelul 3.1 complet"], [CIL.every(c => pe("t32", "c" + c, "us")), "Tabelul 3.2 (uscat) complet"], [CIL.every(c => pe("t33", "c" + c, "pcil")), "Tabelul 3.3 complet"], [["atm", "ralanti", "accel", "r2500"].every(k => pe("t34", k, "p")), "Tabelul 3.4 complet"]],
    prog: () => pe("t35", "d", "cauza") ? 1 : 0, tot: 1,
    ctl: `<label class="camp">Cauza <select id="sel-diag"><option value=""></option>${MD.optiuniDiag().map(o => `<option>${o}</option>`).join("")}</select></label>`,
    buton: ["● Diagnosticul → Tabelul 3.5", e => inregDiag(e)] }
];
let pasActiv = 0;
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small>${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol><ul class="pas-ver"></ul><div class="pas-ctl">${p.ctl}</div>${p.buton ? `<button type="button" class="primar lat" data-inreg="${i}">${p.buton[0]}</button>` : ""}</div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].buton[1](e); actualizeazaPasi(); }));
  legaComenzi();
  alegePas(0);
}
function alegePas(i) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$(".instr").forEach(el => { el.hidden = el.dataset.panou !== p.panou; });
  const bv = document.querySelector(`#motor3d .m3d-vederi [data-v="${p.vedere}"]`); if (bv) bv.click();
  if (p.panou === "diag") rezumat();
  desenComp(); desenLeak(); desenAVL(); desenMAP(); actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (id, on, t1, t0) => { const b = $(id); if (b) { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); } };
  s("#b-cleste", sim.clesteI, "✓ Clește montat", "Clește pe cablul demarorului"); s("#b-sync", sim.sync, "✓ Sincronizare cil. 1", "Senzor sincronizare cil. 1");
  s("#b-inj", !sim.inj, "Reactivează injecția (X431)", "Dezactivează injecția (X431)"); s("#b-contact", sim.contact, "Contact: pus", "Contact: luat"); s("#b-contact2", sim.contact, "Contact: pus", "Contact: luat");
  s("#b-bujii", sim.bujii, "Remontează bujiile (cuplu 25 N·m)", "Demontează bujiile"); s("#b-bujii2", !sim.bujii, "✓ Bujiile montate", "Remontează bujiile (cuplu 25 N·m)"); s("#b-inj2", sim.inj, "✓ Injecția activă", "Reactivează injecția (X431)"); s("#b-clap", sim.clapeta, "✓ Clapeta deschisă (pedala apăsată)", "Clapeta complet deschisă");
  s("#b-cmont", sim.comp.montat, `Demontează compresometrul (cil. ${sim.comp.c})`, `Montează compresometrul în cil. ${sim.comp.c}`);
  s("#b-pmi", sim.leak.pmi === sim.leak.c, `✓ Cil. ${sim.leak.c} la PMI compresie`, `Rotește cil. ${sim.leak.c} la PMI compresie`); s("#b-bloc", sim.leak.blocat, "✓ Arbore blocat", "Blochează arborele");
  s("#b-lcon", sim.leak.conectat, `Deconectează testerul (cil. ${sim.leak.c})`, `Conectează testerul în cil. ${sim.leak.c}`); s("#b-lapl", sim.leak.aplicat, "Închide aerul", "Aplică presiunea");
  $$("[data-reg]").forEach(b => b.classList.toggle("activ", sim.merge && b.dataset.reg === sim.map.reg));
  $("#af-n").textContent = fx(sim.rpm, 0); $("#af-T").textContent = fx(sim.ect, 0); $("#af-inj").textContent = sim.inj ? "activă" : "dezactivată";
  $("#af-buj").textContent = sim.bujii ? "demontate" : "montate"; $("#af-st").textContent = sim.cr ? "antrenare cu demarorul" : sim.merge ? "motor pornit" : sim.contact ? "contact pus" : "contact luat";
}
function rezumat() {
  const t = Cadru.D.t, el = $("#rezumat"); if (!el) return;
  const v = (tb, r, c) => t[tb][r][c] === "" ? "—" : String(t[tb][r][c]).replace(".", ",");
  el.innerHTML = `<table class="tabel"><thead><tr><th>Cilindru</th>${CIL.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>
    <tr><td>I<sub>max</sub> AVL [A]</td>${CIL.map(c => `<td>${v("t31", "c" + c, "Imax")}</td>`).join("")}</tr>
    <tr><td>p uscat [bar]</td>${CIL.map(c => `<td>${v("t32", "c" + c, "us")}</td>`).join("")}</tr>
    <tr><td>p umed [bar]</td>${CIL.map(c => `<td>${v("t32", "c" + c, "um")}</td>`).join("")}</tr>
    <tr><td>p<sub>cil</sub> / p<sub>in</sub> [bar]</td>${CIL.map(c => `<td>${v("t33", "c" + c, "pcil")} / ${v("t33", "c" + c, "pin")}</td>`).join("")}</tr>
    <tr><td>locul pierderii</td>${CIL.map(c => `<td style="font-size:.78rem">${t.t33["c" + c].loc || "—"}</td>`).join("")}</tr></tbody></table>
    <p class="nota">Colector: ralanti ${v("t34", "ralanti", "p")} kPa (${t.t34.ralanti.comp || "—"}), accelerare ${v("t34", "accel", "p")} kPa (${t.t34.accel.comp || "—"}), 2500 rot/min ${v("t34", "r2500", "p")} kPa (${t.t34.r2500.comp || "—"}).</p>`;
}

/* ------------------------------------------------------------------ comenzile */
function antreneaza() {
  if (sim.merge) return Cadru.mesajTemporar("Motorul este pornit.", "atentie");
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie");
  if (sim.inj && sim.bujii) return Cadru.mesajTemporar("NSSM: dezactivați injecția înainte de antrenare cu bujiile demontate (vapori de benzină).", "pericol");
  if (sim.leak.conectat) return Cadru.mesajTemporar("Deconectați testerul de pierdere de aer înainte de antrenare.", "pericol");
  if (sim.inj && !sim.bujii) { sim.merge = true; sim.map.reg = "ralanti"; sim.map.tReg = 0; Cadru.mesajTemporar("Injecția era activă: motorul a pornit. Pentru testul de compresie dezactivați injecția.", "atentie"); return; }
  sim.cr = true; sim.tCr = 0; sim.durCr = sim.bujii ? 2.5 : 5; sim.avl.buf = []; sim.avl.rez = null; sim.comp.z = (Math.random() - 0.5) * 0.1;
}
function legaComenzi() {
  const on = (id, f) => { const b = $(id); if (b) b.addEventListener("click", () => { f(); actualizeazaPasi(); desenComp(); desenLeak(); }); };
  $("#ck-man").addEventListener("change", e => { sim.manusi = e.target.checked; actualizeazaPasi(); });
  $("#ck-exh").addEventListener("change", e => { sim.exh = e.target.checked; actualizeazaPasi(); });
  on("#b-bat", () => { if (sim.contact) return Cadru.mesajTemporar("Tensiunea de repaus se măsoară cu contactul luat.", "atentie"); sim.vBat = P().ubat; Cadru.mesajTemporar(`Multimetrul la bornele bateriei: ${fx(sim.vBat, 2)} V.`, "ok"); });
  on("#b-cleste", () => { if (sim.merge || sim.cr) return Cadru.mesajTemporar("NSSM: cleștele se montează cu motorul oprit.", "pericol"); sim.clesteI = !sim.clesteI; });
  on("#b-sync", () => { if (sim.merge || sim.cr) return; sim.sync = !sim.sync; });
  const inj = () => { if (sim.merge) return Cadru.mesajTemporar("Opriți motorul.", "atentie"); sim.inj = !sim.inj; };
  on("#b-inj", inj); on("#b-inj2", inj);
  const contact = () => { if (sim.cr) return; sim.contact = !sim.contact; if (!sim.contact) { sim.merge = false; sim.map.reg = "oprit"; } };
  on("#b-contact", contact); on("#b-contact2", contact);
  on("#b-cr1", () => { if (!sim.clesteI) return Cadru.mesajTemporar("Montați întâi cleștele de curent.", "atentie"); antreneaza(); });
  const bujii = () => {
    if (sim.merge || sim.contact) return Cadru.mesajTemporar("Bujiile se demontează / montează cu motorul oprit și contactul luat.", "atentie");
    if (!sim.manusi) return Cadru.mesajTemporar("NSSM: motorul este cald – folosiți mănuși.", "pericol");
    if (sim.comp.montat || sim.leak.conectat) return Cadru.mesajTemporar("Demontați întâi compresometrul / testerul.", "atentie");
    sim.bujii = !sim.bujii; if (!sim.bujii) { sim.comp.ulei = [false, false, false, false]; Cadru.mesajTemporar("Bujiile au fost montate la 25 N·m (cheia dinamometrică); uleiul a fost șters.", "ok"); }
  };
  on("#b-bujii", bujii); on("#b-bujii2", bujii);
  on("#b-clap", () => { sim.clapeta = !sim.clapeta; });
  on("#b-cmont", () => { if (!sim.bujii) return Cadru.mesajTemporar("Demontați întâi bujiile.", "atentie"); if (sim.cr) return; sim.comp.montat = !sim.comp.montat; sim.comp.p = 0; sim.comp.n = 0; });
  on("#b-cr2", () => { if (!sim.comp.montat) return Cadru.mesajTemporar("Montați compresometrul.", "atentie"); if (sim.comp.n > 0) return Cadru.mesajTemporar("Eliberați presiunea înaintea unei noi măsurări.", "atentie"); antreneaza(); });
  on("#b-celib", () => { sim.comp.p = 0; sim.comp.n = 0; });
  on("#b-ulei", () => { if (!sim.bujii) return; if (sim.comp.montat) return Cadru.mesajTemporar("Uleiul se toarnă cu compresometrul demontat.", "atentie"); sim.comp.ulei[sim.comp.c - 1] = true; Cadru.mesajTemporar(`5 ml de ulei turnați în cilindrul ${sim.comp.c}. Măsurătorile următoare ale acestui cilindru sunt „umede”.`, "ok"); });
  on("#b-pmi", () => { if (sim.contact || sim.merge) return Cadru.mesajTemporar("Arborele se rotește cu cheia, cu contactul luat.", "atentie"); if (sim.leak.conectat && sim.leak.aplicat) return; sim.leak.pmi = sim.leak.c; sim.leak.blocat = false; });
  on("#b-bloc", () => { sim.leak.blocat = !sim.leak.blocat; });
  on("#b-lcon", () => { if (!sim.bujii) return Cadru.mesajTemporar("Demontați întâi bujiile.", "atentie"); if (sim.comp.montat) return Cadru.mesajTemporar("Demontați compresometrul.", "atentie"); sim.leak.conectat = !sim.leak.conectat; sim.leak.aplicat = false; });
  on("#b-lapl", () => {
    const L = sim.leak; if (!L.conectat) return Cadru.mesajTemporar("Conectați testerul.", "atentie");
    if (L.aplicat) { L.aplicat = false; return; }
    if (L.pmi === L.c && !L.blocat) { L.pmi = 0; Cadru.mesajTemporar("NSSM: arborele nu era blocat – presiunea l-a rotit brusc, cilindrul a ieșit din PMI. Rotiți din nou la PMI și blocați arborele.", "pericol"); return; }
    L.aplicat = true; L.z = (Math.random() - 0.5) * 0.04;
    if (L.pmi !== L.c) Cadru.mesajTemporar("Aerul iese liber: cilindrul nu este la PMI compresie (o supapă este deschisă).", "atentie");
  });
  $("#r-pin").addEventListener("input", e => { sim.leak.pin = +e.target.value; $("#v-pin").textContent = fx(sim.leak.pin, 1) + " bar"; desenLeak(); });
  $$("[data-asc]").forEach(b => b.addEventListener("click", () => {
    const L = sim.leak, p = P(), d = p.defect, k = b.dataset.asc;
    if (!L.aplicat) { $("#asc").textContent = "Aplicați întâi presiunea."; return; }
    if (L.pmi !== L.c) { $("#asc").textContent = k === "adm" || k === "ev" ? "Șuierat foarte puternic: o supapă este deschisă (cilindrul nu este la PMI)." : "Nimic deosebit."; return; }
    const c = L.c, per = d.tip === "garn" && (c === d.c || c === d.c + 1);
    const R = {
      adm: d.tip === "sadm" && d.c === c ? "Șuierat puternic în corpul clapetei (admisie)." : "Liniște la admisie.",
      ev: d.tip === "sev" && d.c === c ? "Șuierat puternic la țeava de evacuare." : "Liniște la evacuare.",
      ulei: d.tip === "seg" && d.c === c ? "Șuierat puternic la bușonul de ulei (gaze scăpate pe lângă segmenți)." : "Șuierat slab la bușonul de ulei (scăpări normale).",
      vas: per ? "Bule în vasul de expansiune!" : "Fără bule în vasul de expansiune.",
      vec: per ? `Aer prin orificiul bujiei cilindrului ${c === d.c ? d.c + 1 : d.c}.` : "Nu iese aer prin orificiile cilindrilor vecini."
    };
    $("#asc").textContent = R[k];
  }));
  on("#b-porn", () => {
    if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie");
    if (sim.bujii) return Cadru.mesajTemporar("Remontați bujiile.", "atentie"); if (!sim.inj) return Cadru.mesajTemporar("Reactivați injecția.", "atentie");
    if (sim.comp.montat || sim.leak.conectat) return; if (!sim.exh) return Cadru.mesajTemporar("NSSM: conectați exhaustarea.", "pericol");
    sim.merge = true; sim.map.reg = "ralanti"; sim.map.tReg = 0;
  });
  on("#b-stop", () => { sim.merge = false; sim.map.reg = "oprit"; });
  $$("[data-reg]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); sim.map.reg = b.dataset.reg; sim.map.tReg = 0; if (b.dataset.reg === "accel") { sim.map.min = 999; sim.map.snap = sim.t; } actualizeazaPasi(); }));
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregAVL(e) {
  const r = sim.avl.rez; if (!r) return Cadru.mesajTemporar("Antrenați motorul cel puțin 3 s cu cleștele și sincronizarea montate și injecția dezactivată.", "atentie");
  if (!sim.sync) return Cadru.mesajTemporar("Fără sincronizare stația nu știe care vârf aparține cilindrului 1.", "atentie");
  const I = r.I.map(v => Math.round(v)), I0 = Math.round(r.I0);
  const ok = Cadru.inregistreaza(e, { log: { m: "avl", I0, I }, celule: CIL.flatMap(c => [{ t: "t31", r: "c" + c, c: "Imax", v: String(I[c - 1]) }, { t: "t31", r: "c" + c, c: "I0", v: String(I0) }]) });
  if (ok) msg(`Tabelul 3.1: I₀ = ${I0} A; I_max = ${I.join(" / ")} A.`);
}
function inregComp(e) {
  const C = sim.comp; if (!C.montat || C.n < 1) return Cadru.mesajTemporar("Montați compresometrul și antrenați motorul.", "atentie");
  if (sim.cr) return Cadru.mesajTemporar("Așteptați sfârșitul antrenării.", "atentie");
  const p = Math.round(C.p * 10) / 10, ulei = C.ulei[C.c - 1], co = cond();
  const ok = Cadru.inregistreaza(e, { log: { m: "comp", c: C.c, ulei, n: C.n, p, bujii: co.bujii, clapeta: co.clapeta, cald: co.cald }, celule: [{ t: "t32", r: "c" + C.c, c: ulei ? "um" : "us", v: p.toFixed(1) }] });
  if (ok) msg(`Tabelul 3.2: cilindrul ${C.c} ${ulei ? "umed" : "uscat"} = ${fx(p, 1)} bar (${C.n} curse${co.clapeta ? "" : ", clapeta închisă!"}).`);
}
function inregLeak(e) {
  const L = sim.leak; if (!L.aplicat) return Cadru.mesajTemporar("Aplicați presiunea.", "atentie");
  if (L.pmi !== L.c) return Cadru.mesajTemporar("Cilindrul nu este la PMI compresie.", "atentie");
  const pin = Math.round(L.pin * 100) / 100, pcil = Math.round(pcilCurent() * 100) / 100, loc = $("#sel-loc").value;
  const ok = Cadru.inregistreaza(e, { log: { m: "leak", c: L.c, pin, pcil, loc }, celule: [{ t: "t33", r: "c" + L.c, c: "pin", v: pin.toFixed(2) }, { t: "t33", r: "c" + L.c, c: "pcil", v: pcil.toFixed(2) }, { t: "t33", r: "c" + L.c, c: "loc", v: loc }] });
  if (ok) msg(`Tabelul 3.3: cilindrul ${L.c}: p_in = ${fx(pin, 2)} bar, p_cil = ${fx(pcil, 2)} bar, locul: ${loc}.`);
}
function inregMap(e) {
  const M = sim.map, comp = $("#sel-comp").value;
  let r, p, t = M.tReg;
  if (!sim.merge) { if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul (motor oprit) pentru presiunea atmosferică.", "atentie"); r = "atm"; p = M.p; }
  else if (M.reg === "ralanti") { if (M.tReg < 4) return Cadru.mesajTemporar("Așteptați stabilizarea ralantiului (4 s).", "atentie"); const v = M.buf.filter(([tt]) => tt > sim.t - 3).map(x => x[1]); r = "ralanti"; p = v.reduce((a, b) => a + b, 0) / v.length; }
  else if (M.reg === "accel") { if (sim.t - M.snap < 2.5) return Cadru.mesajTemporar("Așteptați revenirea după eliberarea pedalei.", "atentie"); r = "accel"; p = M.min; }
  else if (M.reg === "r2500") { if (M.tReg < 30) return Cadru.mesajTemporar(`Mențineți 2500 rot/min 30 s (acum ${Math.floor(M.tReg)} s).`, "atentie"); r = "r2500"; p = M.p; }
  if (r !== "atm" && !comp) return Cadru.mesajTemporar("Alegeți comportamentul observat.", "atentie");
  p = Math.round(p * 10) / 10;
  const cel = [{ t: "t34", r, c: "p", v: p.toFixed(1) }]; if (r !== "atm") cel.push({ t: "t34", r, c: "comp", v: comp });
  const ok = Cadru.inregistreaza(e, { log: { m: "map", reg: r === "atm" ? "oprit" : r, p, t: Math.round(t), comp }, celule: cel });
  if (ok) msg(`Tabelul 3.4 (${{ atm: "motor oprit", ralanti: "ralanti", accel: "accelerare bruscă", r2500: "2500 rot/min" }[r]}): ${fx(p, 1)} kPa${comp && r !== "atm" ? " – " + comp : ""}.`);
}
function inregDiag(e) {
  const v = $("#sel-diag").value; if (!v) return Cadru.mesajTemporar("Alegeți cauza.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "diag", v }, celule: [{ t: "t35", r: "d", c: "cauza", v }] });
  if (ok) msg(`Tabelul 3.5: ${v}.`);
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaDA3(D) {
  const t = D.t, cel = { t31: {}, t32: {}, t33: {}, t34: {} }, rele = { t31: {}, t32: {}, t33: {} };
  const dI = CIL.map(c => num(t.t31["c" + c].Imax) - num(t.t31["c" + c].I0)), mx = Math.max(...dI.filter(Number.isFinite));
  CIL.forEach((c, i) => { const cr = dI[i] / mx * 100; cel.t31["c" + c] = { dI: Number.isFinite(dI[i]) ? fx(dI[i], 0) : "", crel: Number.isFinite(cr) ? fx(cr, 1) : "" }; rele.t31["c" + c] = { crel: cr < 90 }; });
  const us = CIL.map(c => num(t.t32["c" + c].us)), pm = Math.max(...us.filter(Number.isFinite));
  CIL.forEach((c, i) => { const de = (pm - us[i]) / pm * 100, um = num(t.t32["c" + c].um), cr = (um - us[i]) / us[i] * 100;
    cel.t32["c" + c] = { d: Number.isFinite(de) ? fx(de, 1) : "", cr: Number.isFinite(cr) ? (cr > 0 ? "+" : "") + fx(cr, 1) : "" }; rele.t32["c" + c] = { d: de > 10, cr: cr > 10 }; });
  CIL.forEach(c => { const pin = num(t.t33["c" + c].pin), pc = num(t.t33["c" + c].pcil), L = (pin - pc) / pin * 100; cel.t33["c" + c] = { L: Number.isFinite(L) ? fx(L, 1) : "", ev: !Number.isFinite(L) ? "" : L < 10 ? "foarte bine" : L <= 20 ? "acceptabil" : L <= 30 ? "uzură avansată" : "defect" }; rele.t33["c" + c] = { L: L > 30 }; });
  const pa = num(t.t34.atm.p);
  ["atm", "ralanti", "accel", "r2500"].forEach(k => { const p = num(t.t34[k].p), dp = (pa - p) / 100; cel.t34[k] = { dp: Number.isFinite(dp) ? fx(dp, 2) : "", int: k === "atm" ? "referință" : (INTERP[t.t34[k].comp] || "") }; });
  const pc = Number.isFinite(pa) ? pa / 100 * Math.pow(MD.EPS, 1.25) : NaN;
  const rez = [
    ["Presiunea teoretică de compresie p<sub>c</sub> = p<sub>a</sub>·ε<sup>m</sup> (ε = 9,5; m = 1,25; p<sub>a</sub> = presiunea atmosferică măsurată)", Number.isFinite(pc) ? `${fx(pc, 1)} bar` : "—"],
    ["Abaterea maximă δ (Tabelul 3.2, uscat)", Number.isFinite(pm) ? `${fx(Math.max(...us.filter(Number.isFinite).map(p => (pm - p) / pm * 100)), 1)} % (admis ≤ 10 %)` : "—"],
    ["Raportul presiune măsurată / teoretică", Number.isFinite(pm) && Number.isFinite(pc) ? `${fx(pm / pc * 100, 0)} % – turația mică de antrenare, pierderile de căldură, închiderea întârziată a supapei de admisie` : "—"]
  ];
  const verdicte = [];
  const slabi = CIL.filter((c, i) => Number.isFinite(us[i]) && (pm - us[i]) / pm > 0.1);
  if (slabi.length) verdicte.push({ tip: "atentie", text: `Cilindr${slabi.length > 1 ? "ii" : "ul"} ${slabi.join(", ")} depășește abaterea admisă de 10 %. Testul umed și pierderea de aer arată cauza.` });
  else if (us.every(Number.isFinite)) verdicte.push({ tip: "ok", text: "Presiunile de compresie sunt uniforme (δ ≤ 10 %). Dacă toate sunt mici, verificați distribuția (depresiunea la ralanti)." });
  const serii = [{ tip: "linie", pts: CIL.map((c, i) => [c, us[i]]).filter(p => Number.isFinite(p[1])), culoare: 0, gros: true }, { tip: "pct", pts: CIL.map((c, i) => [c, us[i]]).filter(p => Number.isFinite(p[1])), culoare: 0, r: 5 },
    { tip: "pct", pts: CIL.map(c => [c, num(t.t32["c" + c].um)]).filter(p => Number.isFinite(p[1])), culoare: 1, r: 6 }];
  if (Number.isFinite(pm)) serii.push({ tip: "linie", pts: [[0.6, pm * 0.9], [4.4, pm * 0.9]], culoare: 2, punctat: true });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Presiunea de compresie pe cilindri – test uscat și umed (Fig. 3.2 cu valorile proprii)",
    grafic: { xmin: 0.5, xmax: 4.5, ymin: 0, ymax: 16, xticks: [1, 2, 3, 4], xlab: "cilindrul", ylab: "p [bar]", serii },
    legenda: [["uscat", "var(--serie-0)"], ["umed", "var(--serie-1)", "pct"], ["limita: 90 % din p_max", "var(--serie-2)"]],
    principal: { eticheta: "δ max [%]", valoare: Number.isFinite(pm) ? +Math.max(...us.filter(Number.isFinite).map(p => (pm - p) / pm * 100)).toFixed(1) : null }
  };
}

/* ------------------------------------------------------------------ figurile teoriei (SVG generat) */
function figCurent() {
  const W = 680, H = 210, n = 220, I0 = 120, v = [62, 61, 41, 62], X = t => 40 + t / 1.2 * 620, Y = I => 185 - I / 220 * 165;
  let d = ""; for (let i = 0; i <= 600; i++) { const t = i / 600 * 1.2, th = 360 * n / 60 * t, k = Math.floor(th / 180), fz = th - k * 180, c = MD.ORDINE[k % 4], pc = MD.ORDINE[(k + 3) % 4];
    const I = I0 + v[c - 1] * Math.exp(-(((fz - 150) / 32) ** 2)) + v[pc - 1] * Math.exp(-(((fz + 30) / 32) ** 2)); d += (i ? "L" : "M") + X(t).toFixed(1) + "," + Y(I).toFixed(1); }
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig-svg" role="img" aria-label="Fig. 3.1"><g font-size="10" fill="currentColor"><line x1="40" y1="${Y(I0)}" x2="660" y2="${Y(I0)}" stroke="currentColor" stroke-dasharray="4 3" opacity=".4"/><text x="664" y="${Y(I0) + 3}">I₀</text><path d="${d}" fill="none" stroke="#1f5f9e" stroke-width="2"/>`;
  for (let k = 0; k < 11; k++) { const t = (k * 180 + 150) / (360 * n / 60); if (t > 1.2) break; s += `<text x="${X(t)}" y="16" text-anchor="middle" font-weight="700" fill="${MD.ORDINE[k % 4] === 3 ? "#c0492b" : "currentColor"}">${MD.ORDINE[k % 4]}</text>`; }
  return s + `<text x="350" y="204" text-anchor="middle">timp (antrenare ≈ 220 rot/min) – vârful cilindrului 3 este mai mic la fiecare ciclu</text></g></svg>`;
}
function figComp() {
  const us = [12.4, 12.1, 9.2, 12.3], um = [12.8, 12.5, 11.6, 12.6], W = 520, H = 220, Y = p => 190 - p / 16 * 170;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig-svg" style="max-width:520px" role="img" aria-label="Fig. 3.2"><g font-size="10" fill="currentColor">`;
  [0, 4, 8, 12, 16].forEach(p => { s += `<line x1="40" y1="${Y(p)}" x2="500" y2="${Y(p)}" stroke="currentColor" opacity=".15"/><text x="34" y="${Y(p) + 3}" text-anchor="end">${p}</text>`; });
  us.forEach((p, i) => { const x = 80 + i * 110; s += `<rect x="${x}" y="${Y(p)}" width="36" height="${190 - Y(p)}" fill="#1f5f9e"/><rect x="${x + 40}" y="${Y(um[i])}" width="36" height="${190 - Y(um[i])}" fill="#c0492b" opacity=".85"/><text x="${x + 38}" y="206" text-anchor="middle">cil. ${i + 1}</text>`; });
  s += `<line x1="40" y1="${Y(12.4 * 0.9)}" x2="500" y2="${Y(12.4 * 0.9)}" stroke="#2e8b57" stroke-dasharray="5 3"/><text x="498" y="${Y(12.4 * 0.9) - 4}" text-anchor="end" fill="#2e8b57">90 % din p_max</text>`;
  return s + `<rect x="300" y="14" width="10" height="10" fill="#1f5f9e"/><text x="314" y="23">uscat</text><rect x="360" y="14" width="10" height="10" fill="#c0492b"/><text x="374" y="23">umed</text><text x="20" y="110" transform="rotate(-90 20 110)" text-anchor="middle">p [bar]</text></g></svg>`;
}
function figLeak() {
  return `<svg viewBox="0 0 640 200" class="fig-svg" role="img" aria-label="Fig. 3.3"><g font-size="11" fill="currentColor">
  <rect x="10" y="80" width="80" height="34" rx="5" fill="none" stroke="currentColor"/><text x="50" y="101" text-anchor="middle">aer 6…8 bar</text>
  <line x1="90" y1="97" x2="140" y2="97" stroke="currentColor" stroke-width="3"/><rect x="140" y="80" width="70" height="34" rx="5" fill="none" stroke="currentColor"/><text x="175" y="101" text-anchor="middle">regulator</text>
  <line x1="210" y1="97" x2="300" y2="97" stroke="currentColor" stroke-width="3"/><circle cx="250" cy="55" r="26" fill="none" stroke="currentColor"/><text x="250" y="59" text-anchor="middle">p_in</text><line x1="250" y1="81" x2="250" y2="97" stroke="currentColor"/>
  <rect x="300" y="88" width="40" height="18" fill="currentColor" opacity=".7"/><text x="320" y="128" text-anchor="middle" font-size="10">orificiu calibrat</text>
  <line x1="340" y1="97" x2="450" y2="97" stroke="currentColor" stroke-width="3"/><circle cx="400" cy="55" r="26" fill="none" stroke="currentColor"/><text x="400" y="59" text-anchor="middle">p_cil</text><line x1="400" y1="81" x2="400" y2="97" stroke="currentColor"/>
  <path d="M450,97 L480,97 L480,40" fill="none" stroke="currentColor" stroke-width="3"/><rect x="460" y="40" width="130" height="140" fill="none" stroke="currentColor"/><rect x="470" y="110" width="110" height="40" fill="currentColor" opacity=".25"/><text x="525" y="135" text-anchor="middle">piston la PMI</text>
  <text x="525" y="60" text-anchor="middle" font-size="10">supape închise</text><text x="320" y="186" text-anchor="middle">L = (p_in − p_cil)/p_in·100 [%]</text></g></svg>`;
}
function figMAP() {
  const W = 680, H = 230, X = t => 40 + t / 10 * 280, Y = p => 200 - p / 100 * 170;
  const curbe = [["normal", t => 35 + 0.6 * Math.sin(t * 160), "#2e8b57"], ["supapă neetanșă", t => 37 + 6 * Math.exp(-((((t * 6.7) % 1 - 0.5) / 0.06) ** 2)), "#c0492b"], ["distribuție decalată", t => 52 + 0.4 * Math.sin(t * 160), "#8a5a9e"], ["evacuare obturată (2500 rot/min)", t => 27 + 26 * (1 - Math.exp(-t / 4)), "#b07d12"]];
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig-svg" role="img" aria-label="Fig. 3.4"><g font-size="10" fill="currentColor">`;
  [0, 20, 40, 60, 80, 100].forEach(p => { s += `<line x1="40" y1="${Y(p)}" x2="320" y2="${Y(p)}" stroke="currentColor" opacity=".15"/><text x="34" y="${Y(p) + 3}" text-anchor="end">${p}</text>`; });
  curbe.forEach(([n, f, c], j) => { let d = ""; for (let i = 0; i <= 500; i++) { const t = i / 50; d += (i ? "L" : "M") + X(t).toFixed(1) + "," + Y(f(t)).toFixed(1); } s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.6"/><rect x="350" y="${40 + j * 26}" width="14" height="4" fill="${c}"/><text x="370" y="${45 + j * 26}">${n}</text>`; });
  return s + `<text x="180" y="222" text-anchor="middle">timp [s]</text><text x="14" y="115" transform="rotate(-90 14 115)" text-anchor="middle">p_col [kPa]</text><text x="350" y="160">ralanti normal: 30…45 kPa abs. (depresiune 0,55…0,7 bar)</text></g></svg>`;
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Injecția se dezactivează înaintea antrenării cu bujiile demontate (risc de aprindere a vaporilor de benzină); bobinele de inducție se deconectează sau se leagă la masă conform indicațiilor constructorului.</li>
<li>Motorul este cald: bujiile și chiulasa se manevrează cu mănuși; cheia de bujii se folosește fără prelungitoare improvizate.</li>
<li>La testul de pierdere de aer, arborele cotit poate fi rotit brusc de presiune: se blochează în poziție, nu se țin mâinile pe cheie sau în zona curelelor, iar presiunea se aplică progresiv.</li>
<li>Cleștele de curent de mare intensitate se montează pe cablul demarorului cu motorul oprit; antrenarea cu demarorul se face în reprize de maximum 5…10 s, cu pauze de răcire.</li>
<li>Bujiile se remontează la cuplul prescris înainte de repornirea motorului; uleiul folosit la testul umed se șterge imediat.</li></ul></div>
<h2>3.1. Scopul lucrării</h2>
<p>Evaluarea etanșeității camerelor de ardere fără demontarea motorului prin patru metode complementare – compresia relativă (curentul demarorului), presiunea de compresie (testul uscat și umed), pierderea de aer și depresiunea din colectorul de admisie – și localizarea cauzei unei etanșări slabe: segmenți și cilindri, supape sau garnitura de chiulasă.</p>
<h2>3.2. Noțiuni teoretice</h2>
<p>Starea grupului piston–segmenți–cilindru, a supapelor și a garniturii de chiulasă determină presiunea la sfârșitul compresiei, deci puterea, consumul și emisiile. O etanșare slabă produce rateuri (coduri P0300–P0304), consum de ulei și gaze scăpate în carter. Înainte de a diagnostica senzori, alimentare sau aprindere trebuie confirmat că motorul este sănătos mecanic.</p>
<p><b>Compresia relativă.</b> La antrenarea motorului cu demarorul, fără aprindere și injecție, curentul absorbit crește la fiecare cursă de compresie (Fig. 3.1). Vârfurile egale indică compresii egale; un vârf repetat mai mic arată cilindrul slab. Stația AVL identifică cilindrul 1 cu un semnal de sincronizare și afișează rezultatul în procente față de cel mai bun cilindru:</p>
<div class="ec"><span>c<sub>rel,i</sub> = (I<sub>max,i</sub> − I<sub>0</sub>)/max<sub>j</sub>(I<sub>max,j</sub> − I<sub>0</sub>)·100 [%]</span><span class="nr">(3.1)</span></div>
<p>unde I<sub>max,i</sub> este vârful de curent al cilindrului i, iar I<sub>0</sub> – curentul de bază dintre vârfuri (frecări, antrenarea accesoriilor).</p>
<figure>${figCurent()}<figcaption>Fig. 3.1. Curentul demarorului la testul de compresie relativă (ordinea de aprindere 1-3-4-2)</figcaption></figure>
<p><b>Presiunea de compresie.</b> Compresometrul se montează pe rând în locul fiecărei bujii, cu motorul cald, bateria încărcată, toate bujiile demontate, clapeta complet deschisă și injecția dezactivată; motorul se antrenează 4–6 curse. Valoarea teoretică pentru o comprimare politropă este mult mai mare decât cea măsurată, din cauza turației mici de antrenare (pierderi de căldură și prin neetanșeități) și a închiderii întârziate a supapei de admisie:</p>
<div class="ec"><span>p<sub>c</sub> = p<sub>a</sub>·ε<sup>m</sup></span><span class="nr">(3.2)</span></div>
<div class="ec"><span>δ<sub>i</sub> = (p<sub>max</sub> − p<sub>i</sub>)/p<sub>max</sub>·100 ≤ 10 [%]</span><span class="nr">(3.3)</span></div>
<p>La motoarele cu aprindere prin scânteie valorile tipice sunt 10…14 bar. La un cilindru cu valoare mică se repetă testul „umed” (≈ 5 ml ulei prin orificiul bujiei): dacă presiunea crește semnificativ, uleiul a etanșat temporar segmenții – segmenți sau cilindru uzați; dacă nu crește, pierderea este prin supape sau garnitură (Fig. 3.2).</p>
<figure>${figComp()}<figcaption>Fig. 3.2. Presiunea de compresie – test uscat și umed (exemplu: cilindrul 3 cu segmenți uzați)</figcaption></figure>
<p><b>Pierderea de aer (leak-down).</b> Cilindrul se aduce la PMI la sfârșitul compresiei și se alimentează cu aer la presiune constantă printr-un orificiu calibrat (Fig. 3.3). Din cele două manometre rezultă pierderea procentuală; orientativ, sub 10 % – foarte bine, 10…20 % – acceptabil, peste 30 % – defect. Locul pierderii se găsește prin ascultare: la admisie (supapa de admisie), la evacuare (supapa de evacuare), la bușonul de ulei (segmenți), bule în vasul de expansiune (garnitura de chiulasă).</p>
<div class="ec"><span>L = (p<sub>in</sub> − p<sub>cil</sub>)/p<sub>in</sub>·100 [%]</span><span class="nr">(3.4)</span></div>
<figure>${figLeak()}<figcaption>Fig. 3.3. Schema testerului de pierdere de aer</figcaption></figure>
<p><b>Depresiunea din colectorul de admisie.</b> Un motor sănătos, cald, are la ralanti o presiune absolută stabilă de ≈ 30…45 kPa, adică o depresiune de ≈ 0,55…0,7 bar – aceeași mărime pe care o citește senzorul MAP:</p>
<div class="ec"><span>Δp = p<sub>atm</sub> − p<sub>col</sub></span><span class="nr">(3.5)</span></div>
<figure>${figMAP()}<figcaption>Fig. 3.4. Presiunea absolută din colector pentru defecte tipice</figcaption></figure>
<p class="nota"><b>Legătura cu practica.</b> În service, compresia relativă și depresiunea înregistrată cu osciloscopul sunt metodele de primă intenție (rapide, fără demontări). Compresometrul și testul de pierdere de aer se folosesc pentru confirmare, înaintea unei decizii costisitoare, cum ar fi demontarea chiulasei.</p>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Relația (3.2) și valorile tipice.</b> Cu ε = 9,5 și m = 1,25 rezultă ≈ 16,7 bar, dar la compresometru se citesc 11…14 bar: la 200…250 rot/min pierderile de căldură și prin neetanșeități sunt mari, iar supapa de admisie se închide la 40…60° după PME, deci raportul de comprimare efectiv este mai mic decât cel geometric. Pentru decizie contează valoarea minimă și diferența admisă din documentația constructorului (unii constructori dau o diferență absolută, de exemplu 1…2 bar, alții o diferență relativă de 10…15 %).</li>
<li><b>Condițiile măsurării.</b> Cu clapeta închisă presiunea scade cu ≈ 20 %, iar cu bujiile celorlalți cilindri montate turația de antrenare scade și valorile sunt cu ≈ 10 % mai mici; motorul rece dă și el valori mai mici. Comparația între cilindri este valabilă numai dacă toate măsurările se fac în aceleași condiții și cu același număr de curse.</li>
<li><b>Testul umed</b> nu se face la motoarele diesel (risc de blocare hidraulică și autoaprindere a uleiului). Cantitatea de ulei este mică (5 ml) tocmai pentru a nu micșora volumul camerei de ardere; o creștere de peste ≈ 10 % este semnificativă.</li>
<li><b>Pierderea de aer</b> depinde de diametrul orificiului calibrat al testerului (nu există un standard unic; 1,0 mm este frecvent): pragurile 10 / 20 / 30 % sunt orientative și cilindrii se compară între ei. La garnitura arsă între doi cilindri, aerul apare și prin orificiul bujiei cilindrului vecin – de aceea ambele bujii sunt demontate.</li>
<li><b>Compresia relativă</b> presupune turația de antrenare constantă; AVL corectează și căderea tensiunii bateriei. O variantă echivalentă, folosită de calculatoarele moderne, este măsurarea variației turației arborelui cotit (senzorul CKP) în timpul antrenării.</li>
<li><b>Presiunea din colector</b> se compară în valori absolute (MAP); depresiunea Δp depinde de presiunea atmosferică (altitudine). La un cilindru slab ralantiul este menținut de ECU prin deschiderea suplimentară a clapetei, astfel încât presiunea la ralanti crește ușor. Evacuarea obturată se recunoaște la turație constantă ridicată: presiunea absolută crește progresiv (depresiunea scade).</li></ul></div>
<h2>3.4. Modul de lucru (în simulator)</h2>
<p>Panoul „Desfășurarea lucrării” conduce lucrarea în șase pași (pregătire, compresia relativă, compresometrul, pierderea de aer, presiunea din colector, diagnosticul). Fiecare pas arată instrumentul potrivit, comenzile și condițiile care trebuie îndeplinite; valorile intră în tabele numai din aparate.</p>
<h2>3.7. Interpretarea rezultatelor</h2>
<ul><li>Rezultatele trebuie să fie coerente: un cilindru slab la compresia relativă trebuie să apară și la compresometru; pierderea de aer arată de ce.</li>
<li>Compresie mică, care crește la testul umed, cu aer la bușonul de ulei → segmenți sau cilindru uzați.</li>
<li>Compresie mică, fără creștere la testul umed, cu aer la admisie sau evacuare → supapă neetanșă (arsă, depuneri, joc termic greșit).</li>
<li>Doi cilindri vecini cu valori mici și bule în vasul de expansiune → garnitură de chiulasă.</li>
<li>Toate valorile egale, dar mici → uzură generală sau distribuție decalată (se verifică și depresiunea, care va fi mică și stabilă).</li></ul>
<h2>3.8. Relevanță practică</h2>
<p>Evaluarea stării mecanice precede orice reparație costisitoare și orice diagnoză a sistemelor electronice. Metoda compresiei relative, bazată pe curentul demarorului, este un exemplu de diagnoză indirectă prin semnale electrice, principiu folosit și în monitorizarea la bord a rateurilor prin variația turației arborelui cotit.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>ε = 9,5; m = 1,25; p<sub>a</sub> = 1 bar; valorile uscate 12,4 / 12,1 / 9,2 / 12,3 bar; la cilindrul 3, p<sub>in</sub> = 4 bar, p<sub>cil</sub> = 2,6 bar:</p>
<div class="ec"><span>p<sub>c</sub> = 1·9,5<sup>1,25</sup> ≈ 16,7 bar</span><span class="nr">(3.6)</span></div>
<div class="ec"><span>δ<sub>3</sub> = (12,4 − 9,2)/12,4·100 = 25,8 %</span><span class="nr">(3.7)</span></div>
<div class="ec"><span>L<sub>3</sub> = (4 − 2,6)/4·100 = 35 %</span><span class="nr">(3.8)</span></div>
<p>Cilindrul 3 depășește abaterea admisă (10 %), iar la testul umed presiunea crește la 11,6 bar (+26 %): pierderea este prin segmenți. Confirmarea: aer la bușonul de ulei la testul de pierdere.</p>
<div class="problema"><h3>Problema 1</h3><p>Stația AVL arată I<sub>0</sub> = 120 A și vârfurile 182 / 180 / 141 / 181 A. Calculați compresiile relative.</p><details class="sol"><summary>Rezolvare</summary><p>ΔI = 62 / 60 / 21 / 61 A → c<sub>rel</sub> = 100 / 96,8 / 33,9 / 98,4 %: cilindrul 3 are o etanșare foarte slabă (de comparat cu compresometrul).</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Cilindrii 2 și 3 au 9,8 și 9,5 bar (ceilalți 12,6 bar); testul umed nu le modifică. Ce verificare faceți și ce vă așteptați să găsiți?</p><details class="sol"><summary>Rezolvare</summary><p>Doi cilindri vecini slabi, fără creștere la umed → garnitura de chiulasă între 2 și 3. La pierderea de aer pe cilindrul 2 aerul iese prin orificiul bujiei cilindrului 3 și/sau apar bule în vasul de expansiune.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Toți cilindrii au 10,4…10,7 bar, iar presiunea din colector la ralanti este 54 kPa, stabilă. Diagnostic?</p><details class="sol"><summary>Rezolvare</summary><p>Uniformitate bună, dar valori mici și depresiune mică stabilă → distribuție decalată (curea sărită) sau uzură generală. Se verifică semnele de calare ale distribuției / corelarea CKP–CMP pe osciloscop (lucrarea 2).</p></details></div>`;
}
const INTREBARI = [
  ["Pe ce principiu fizic se bazează testul de compresie relativă?", "Cuplul rezistent la arborele cotit crește în fiecare cursă de compresie proporțional cu presiunea din cilindru; demarorul (motor de curent continuu) absoarbe un curent proporțional cu cuplul, deci vârfurile de curent sunt proporționale cu presiunile de compresie ale cilindrilor."],
  ["De ce se demontează toate bujiile și se deschide clapeta la măsurarea compresiei?", "Bujiile scoase elimină lucrul de comprimare al celorlalți cilindri, astfel încât turația de antrenare este mai mare și egală pentru fiecare cilindru măsurat; clapeta deschisă permite umplerea completă a cilindrului. Altfel valorile sunt mai mici și dependente de condiții."],
  ["De ce presiunea măsurată este mai mică decât cea calculată cu p<sub>a</sub>·ε<sup>m</sup>?", "La turația mică de antrenare se pierde căldură spre pereți și aer prin neetanșeități, iar supapa de admisie se închide târziu, după PME, deci comprimarea efectivă începe de la un volum mai mic decât cel geometric."],
  ["Ce informație suplimentară aduce testul umed?", "Arată dacă pierderea este prin segmenți (uleiul etanșează temporar jocul și presiunea crește) sau prin supape / garnitură (presiunea nu crește)."],
  ["Ce avantaj are testul de pierdere de aer față de compresometru?", "Se face cu motorul oprit, la PMI, fără influența turației de antrenare și a bateriei, și permite localizarea pierderii prin ascultare (admisie, evacuare, carter, vasul de expansiune, cilindrul vecin)."],
  ["Cum arată depresiunea din colector la un motor cu evacuarea obturată?", "La ralanti poate fi aproape normală, dar la turație constantă ridicată (2500 rot/min) presiunea absolută crește progresiv (depresiunea scade), iar după o accelerare bruscă revenirea la ralanti este lentă."],
  ["În ce ordine ați aplica cele patru metode la un motor cu rateuri pe un cilindru? Justificați.", "Întâi metodele rapide, fără demontare: compresia relativă și depresiunea; dacă un cilindru este slab, compresometrul (uscat și umed) pe acel cilindru și pe vecini, apoi pierderea de aer pentru localizarea exactă înainte de demontarea chiulasei."]
];
const TEST = [
  { q: "Cu p<sub>max</sub> = 12,5 bar, un cilindru de 10,9 bar are δ =", o: ["8,7 %", "12,8 %", "14,7 %", "1,6 %"], c: 1, e: "(12,5 − 10,9)/12,5 = 12,8 % > 10 %." },
  { q: "Presiunea crește la testul umed de la 9,0 la 11,4 bar. Cauza probabilă:", o: ["supapă de admisie arsă", "segmenți uzați", "garnitură de chiulasă", "distribuție decalată"], c: 1, e: "Uleiul etanșează temporar segmenții." },
  { q: "La testul de pierdere de aer se aud bule în vasul de expansiune:", o: ["supapă de evacuare", "segmenți", "garnitura de chiulasă", "normal"], c: 2, e: "Aerul trece din cilindru în circuitul de răcire." },
  { q: "p<sub>in</sub> = 4 bar, p<sub>cil</sub> = 3,7 bar → L =", o: ["7,5 %", "92,5 %", "0,3 %", "30 %"], c: 0, e: "(4 − 3,7)/4·100." },
  { q: "Presiunea absolută la ralanti a unui motor sănătos, cald:", o: ["≈ 100 kPa", "30…45 kPa", "5…10 kPa", "60…80 kPa"], c: 1, e: "Depresiune ≈ 0,55…0,7 bar." },
  { q: "De ce se blochează arborele cotit la testul de pierdere de aer?", o: ["ca să nu scape aer pe la segmenți", "presiunea ar roti brusc arborele (pericol, pierderea PMI)", "ca să funcționeze compresometrul", "nu este necesar"], c: 1, e: "Pistonul ușor depărtat de PMI este împins de aer." }
];

/* ------------------------------------------------------------------ 3D și interfața */
const SV = { m3d: null };
function porneste3D() {
  const el = $("#motor3d"); if (!el) return;
  import(BAZA_COMUN + "motor3d.js?v=7").then(m => { SV.m3d = m.creeazaStand(el, { etichete: { ckp: "CKP", map: "MAP", inj1: "inj. 1", inj4: "inj. 4" }, onSelect: () => {} }); })
    .catch(e => { el.innerHTML = `<p class="nota">Modelul 3D nu a putut fi încărcat (${esc(e.message)}).</p>`; });
}
const CSS = `<style>
.da3-scena #motor3d .m3d { height:330px; }
.da3-afis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.da3-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .da3-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .da3-afis b { font-size:1.05rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; }
.instr svg { width:100%; height:auto; display:block; color:var(--text); }
#cv-avl, #cv-map { width:100%; display:block; border-radius:8px; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); }
.pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; }
.pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; }
.pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; }
.pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; }
.pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; } .pas-ctl button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); }
.pas-ctl .camp { margin:.35rem 0; }
#asc { min-height:1.2em; font-weight:600; }
.fig-svg { width:100%; max-width:680px; height:auto; color:var(--text); }
.sim-grila:fullscreen .da3-scena, .sim-grila.ecran-plin .da3-scena { display:block; }
@media (max-width:900px){ .da3-afis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>`;

Cadru.porneste({
  disc: "DA", nr: 3, cod: "da-l3",
  titlu: "Starea mecanică a motorului",
  scurt: "Starea mecanică a motorului",
  subtitlu: "Laborator virtual – standul K7J: compresia relativă (AVL), compresometrul, pierderea de aer, presiunea din colector",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261024); },
  date: [{ k: "eps", et: "Raportul de comprimare ε", v: 9.5, fix: true }, { k: "m", et: "Exponentul politropic m (calcul)", v: 1.25, fix: true }, { k: "ordine", et: "Ordinea de aprindere", v: "1-3-4-2", fix: true, text: true }],
  tabele: [
    { id: "t31", titlu: "Tabelul 3.1. Compresia relativă (AVL)", antetRand: "Cilindru",
      randuri: CIL.map(c => ({ k: "c" + c, et: String(c) })),
      coloane: [{ k: "Imax", t: "I<sub>max</sub> [A]", intrare: true }, { k: "I0", t: "I<sub>0</sub> [A]", intrare: true }, { k: "dI", t: "I<sub>max</sub> − I<sub>0</sub> [A]" }, { k: "crel", t: "c<sub>rel</sub> [%]" }] },
    { id: "t32", titlu: "Tabelul 3.2. Presiunea de compresie", antetRand: "Cilindru", nota: "δ = (p<sub>max</sub> − p<sub>i</sub>)/p<sub>max</sub>·100 din valorile uscate; creșterea la testul umed = (p<sub>umed</sub> − p<sub>uscat</sub>)/p<sub>uscat</sub>.",
      randuri: CIL.map(c => ({ k: "c" + c, et: String(c) })),
      coloane: [{ k: "us", t: "Uscat [bar]", intrare: true }, { k: "um", t: "Umed [bar]", intrare: true }, { k: "d", t: "δ [%]" }, { k: "cr", t: "Creștere umed [%]" }] },
    { id: "t33", titlu: "Tabelul 3.3. Pierderea de aer", antetRand: "Cilindru",
      randuri: CIL.map(c => ({ k: "c" + c, et: String(c) })),
      coloane: [{ k: "pin", t: "p<sub>in</sub> [bar]", intrare: true }, { k: "pcil", t: "p<sub>cil</sub> [bar]", intrare: true }, { k: "L", t: "L [%]" }, { k: "ev", t: "Evaluare" }, { k: "loc", t: "Locul pierderii", intrare: true, tip: "select", optiuni: MD.LOCURI, manualEval: true }] },
    { id: "t34", titlu: "Tabelul 3.4. Presiunea din colectorul de admisie", antetRand: "Regim",
      randuri: [{ k: "atm", et: "Motor oprit (p<sub>atm</sub>)" }, { k: "ralanti", et: "Ralanti, motor cald" }, { k: "accel", et: "Accelerare bruscă (minimul)" }, { k: "r2500", et: "2500 rot/min, 30 s" }],
      coloane: [{ k: "p", t: "p<sub>col</sub> [kPa]", intrare: true }, { k: "dp", t: "Δp [bar]" }, { k: "comp", t: "Comportament", intrare: true, tip: "select", optiuni: COMPORT, manualEval: true }, { k: "int", t: "Interpretare" }] },
    { id: "t35", titlu: "Tabelul 3.5. Diagnosticul", antetRand: "",
      randuri: [{ k: "d", et: "Cauza" }],
      coloane: [{ k: "cauza", t: "Cauza identificată", intrare: true, tip: "select", optiuni: MD.optiuniDiag(), manualEval: true }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaDA3,
  intrebari() {
    return [
      { id: "q1", u: "bar", text: "Presiunea teoretică de compresie p<sub>c</sub> = p<sub>a</sub>·ε<sup>m</sup> (ε = 9,5; m = 1,25; p<sub>a</sub> = presiunea atmosferică măsurată în Tabelul 3.4, în bar):", textSimplu: "Presiunea teoretică de compresie" },
      { id: "q2", u: "%", text: "Abaterea maximă δ a presiunilor de compresie (Tabelul 3.2, uscat):", textSimplu: "Abaterea maximă δ" },
      { id: "q3", u: "%", text: "Pierderea de aer maximă L (Tabelul 3.3):", textSimplu: "Pierderea de aer maximă" },
      { id: "q4", u: "%", text: "Compresia relativă a celui mai slab cilindru (Tabelul 3.1):", textSimplu: "Compresia relativă minimă" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = CIL.filter(c => t.t31["c" + c].Imax !== "").length; if (a < 4) l.push(`Tabelul 3.1: ${a}/4 cilindri`);
    const b = CIL.filter(c => t.t32["c" + c].us !== "").length; if (b < 4) l.push(`Tabelul 3.2: ${b}/4 cilindri (uscat)`);
    if (!CIL.some(c => t.t32["c" + c].um !== "")) l.push("Tabelul 3.2: testul umed");
    const c3 = CIL.filter(c => t.t33["c" + c].pcil !== "").length; if (c3 < 4) l.push(`Tabelul 3.3: ${c3}/4 cilindri`);
    const d = ["atm", "ralanti", "accel", "r2500"].filter(k => t.t34[k].p !== "").length; if (d < 4) l.push(`Tabelul 3.4: ${d}/4 regimuri`);
    if (t.t35.d.cauza === "") l.push("Tabelul 3.5: diagnosticul");
    return l;
  },
  exemplu(D) { const t = D.t; [12.4, 12.1, 9.2, 12.3].forEach((p, i) => { t.t32["c" + (i + 1)].us = String(p); }); t.t32.c3.um = "11.6"; Object.assign(t.t33.c3, { pin: "4", pcil: "2.6", loc: MD.LOCURI[3] }); },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Motorul în autoturism – CKP și presiunea din colector",
    intro: `<p>Calculatorul motorului detectează la bord un cilindru slab prin variația vitezei unghiulare a arborelui cotit (senzorul CKP): la fiecare ardere slabă arborele încetinește. Porniți motorul și urmăriți pe osciloscop semnalul CKP și presiunea din colector (MAP).</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "ckp", canale: ["map"] })
  },
  referat: {
    scop: "Evaluarea etanșeității camerelor de ardere prin compresia relativă, presiunea de compresie (uscat și umed), pierderea de aer și presiunea din colector, și localizarea cauzei.",
    relatii: "c<sub>rel</sub> = (I<sub>max,i</sub> − I<sub>0</sub>)/max(I<sub>max</sub> − I<sub>0</sub>)·100; &nbsp; p<sub>c</sub> = p<sub>a</sub>·ε<sup>m</sup>; &nbsp; δ = (p<sub>max</sub> − p<sub>i</sub>)/p<sub>max</sub>·100; &nbsp; L = (p<sub>in</sub> − p<sub>cil</sub>)/p<sub>in</sub>·100; &nbsp; Δp = p<sub>atm</sub> − p<sub>col</sub>.",
    varianta: () => `Motorul propriu fiecărui student: presiunile de compresie, curentul demarorului, pierderile de aer, presiunea atmosferică și un defect mecanic ascuns.`,
    indicatii: "Comparați cele patru metode, comentați testul umed, locul pierderii de aer și comportamentul presiunii din colector; justificați diagnosticul…"
  },
  subsol: "Modelul: motor cu 4 cilindri în linie (ε = 9,5, ordinea 1-3-4-2), curent de antrenare proporțional cu presiunea de compresie, compresometru cu ventil de reținere, tester de pierdere de aer cu orificiu calibrat, presiunea din colector la ralanti / accelerare / 2500 rot/min. Fiecare student are motorul propriu și un defect ascuns.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena da3-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="motor3d"><p class="nota">Se încarcă motorul 3D…</p></div>
      <div class="da3-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>Turație [rot/min]</span><b id="af-n">0</b></div><div><span>Lichid de răcire [°C]</span><b id="af-T">—</b></div><div><span>Injecția</span><b id="af-inj">—</b></div><div><span>Bujiile</span><b id="af-buj">—</b></div></div>
      <div class="instr" data-panou="prep"><h3>Pregătirea standului</h3><p>Motorul K7J este cald (a funcționat înainte de lucrare). Verificați echipamentul de protecție și tensiunea bateriei: la o baterie descărcată turația de antrenare scade și toate măsurările de compresie ies mai mici.</p><p class="nota">Pașii următori folosesc stația AVL (compresia relativă), compresometrul, testerul de pierdere de aer și senzorul MAP. Alegeți pasul în panoul din dreapta.</p></div>
      <div class="instr" data-panou="avl" hidden><h3>Stația AVL DiTEST – curentul demarorului</h3><canvas id="cv-avl" height="300" aria-label="Curentul demarorului"></canvas></div>
      <div class="instr" data-panou="comp" hidden><h3>Compresometrul</h3><svg id="svg-comp" viewBox="0 0 680 250" role="img" aria-label="Chiulasa și compresometrul"></svg><p class="nota">Clic pe un cilindru pentru a-l alege. Manometrul are ventil de reținere: păstrează valoarea maximă până la eliberare.</p></div>
      <div class="instr" data-panou="leak" hidden><h3>Testerul de pierdere de aer</h3><svg id="svg-leak" viewBox="0 0 820 255" role="img" aria-label="Testerul de pierdere de aer"></svg></div>
      <div class="instr" data-panou="map" hidden><h3>Presiunea din colector (MAP / vacuumetru)</h3><canvas id="cv-map" height="250" aria-label="Presiunea din colector în timp"></canvas></div>
      <div class="instr" data-panou="diag" hidden><h3>Rezumatul măsurărilor</h3><div id="rezumat" class="tabel-scroll"></div></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari" data-doar-demo><summary>Defectul (mod demonstrativ)</summary><p class="nota" id="def-demo"></p></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $("#def-demo").textContent = MD.eticheta(P().defect);
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval() { const d = $("#def-demo"); if (d) d.textContent = ""; },
    reset() { Object.assign(sim, { contact: false, merge: false, cr: false, rpm: 0, inj: true, bujii: false, clapeta: false, clesteI: false, sync: false }); sim.avl = { buf: [], t0: 0, rez: null }; sim.comp = { c: 1, montat: false, n: 0, p: 0, z: 0, ulei: [false, false, false, false] }; sim.leak = { c: 1, pmi: 0, blocat: false, conectat: false, pin: 4, aplicat: false }; },
    cadru(dt0, C, vizibil) {
      const dt = Math.min(0.05, dt0 || 0.016), p = P();
      sim.t += dt;
      // antrenarea cu demarorul
      if (sim.cr) {
        const t0 = sim.tCr; sim.tCr += dt; sim.rpm = p.nCr * (sim.bujii ? 1.25 : 1);
        if (sim.clesteI && !sim.bujii) { for (let k = 0; k < 10; k++) { const tt = t0 + dt * k / 10; sim.avl.buf.push([tt, iDemaror(tt)]); } }
        if (sim.bujii) { const thd = 360 * sim.rpm / 60, k0 = Math.floor((t0 * thd) / 180), k1 = Math.floor((sim.tCr * thd) / 180); for (let k = k0 + 1; k <= k1; k++) evenimentCompresie(MD.ORDINE[k % 4]); }
        if (sim.tCr >= (sim.durCr || 5)) {
          sim.cr = false; sim.rpm = 0;
          if (sim.clesteI && !sim.bujii) sim.avl.rez = { I0: p.I0 + (Math.random() - 0.5) * 2, I: CIL.map(c => MD.iVarf(p, c) + (Math.random() - 0.5) * 2) };
          if (sim.comp.montat) desenComp();
        }
        if (sim.comp.montat && vizibil) desenComp();
      } else if (sim.merge) {
        const M = sim.map; M.tReg += dt;
        sim.rpm += ((M.reg === "r2500" ? 2500 : M.reg === "accel" && M.tReg < 0.6 ? 4200 : 800) - sim.rpm) * (1 - Math.exp(-dt / 0.3));
        if (M.reg === "accel" && M.tReg > 6) { M.reg = "ralanti"; M.tReg = 6; }
      } else sim.rpm += (0 - sim.rpm) * (1 - Math.exp(-dt / 0.4));
      // presiunea din colector
      const M = sim.map, reg = sim.merge ? M.reg : "oprit";
      M.p = sim.contact || sim.merge ? (reg === "accel" ? pMap("accel", M.tReg) : pMap(reg, M.tReg)) + (Math.random() - 0.5) * 0.3 : M.p;
      if (sim.merge && reg === "accel" && M.tReg > 0.6) M.min = Math.min(M.min, M.p);
      if (sim.contact || sim.merge) { M.buf.push([sim.t, M.p]); while (M.buf.length && M.buf[0][0] < sim.t - 41) M.buf.shift(); }
      if (SV.m3d) SV.m3d.seteaza({ rpm: sim.rpm, tps: sim.merge && reg === "r2500" ? 7 : sim.clapeta ? 100 : 0, selectat: null, decuplat: {}, vent: false, tEv: sim.merge ? 380 : 120, eticheteVizibile: true });
      if (!vizibil) return;
      if (PASI[pasActiv].panou === "avl" && (sim.cr || !this._avlOk)) { desenAVL(); this._avlOk = !sim.cr; }
      if (PASI[pasActiv].panou === "map") desenMAP();
      if (PASI[pasActiv].panou === "leak" && sim.leak.aplicat && !this._lk) { desenLeak(); this._lk = true; } if (!sim.leak.aplicat) this._lk = false;
      if (performance.now() - (this._ts || 0) > 300) { this._ts = performance.now(); actualizeazaPasi();
        C.stare(1, sim.cr ? "antrenare cu demarorul" : sim.merge ? "motor pornit" : sim.contact ? "contact pus" : "contact luat", sim.cr || sim.merge ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { desenAVL(); desenMAP(); desenComp(); desenLeak(); },
    formule() {
      const p = P(), r = [];
      if (sim.avl.rez) { const R = sim.avl.rez, mx = Math.max(...R.I.map(v => v - R.I0)); r.push(["Compresia relativă (3.1)", R.I.map((v, i) => `c<sub>${i + 1}</sub> = ${fx((v - R.I0) / mx * 100, 1)} %`).join("; ")]); }
      if (sim.comp.montat) r.push(["Compresometrul", `cilindrul ${sim.comp.c}: <span class="rez">${fx(sim.comp.p, 1)} bar</span> după ${sim.comp.n} curse${sim.comp.ulei[sim.comp.c - 1] ? " (umed)" : ""}`]);
      if (sim.leak.aplicat) { const pc = pcilCurent(); r.push(["Pierderea de aer (3.4)", `L = (${fx(sim.leak.pin, 2)} − ${fx(pc, 2)})/${fx(sim.leak.pin, 2)}·100 = <span class="rez">${fx((sim.leak.pin - pc) / sim.leak.pin * 100, 1)} %</span>`]); }
      if (sim.contact || sim.merge) r.push(["Depresiunea (3.5)", `Δp = (${fx(p.patm, 1)} − ${fx(sim.map.p, 1)})/100 = <span class="rez">${fx((p.patm - sim.map.p) / 100, 2)} bar</span>`]);
      return r;
    }
  }
});
