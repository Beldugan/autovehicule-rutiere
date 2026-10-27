/* DA – Lucrarea 5. Motorul diesel common rail și sistemele de post-tratare (EGR, DPF, SCR).
   Simulator: macheta 3D a motorului 1.5 dCi pe stand (aceeași machetă K7J/K9K, varianta common rail, cu turbosuflanta, EGR și linia de
   post-tratare DOC + DPF + SCR), kitul de retur cu eprubete pe injectoare, cilindrul gradat pentru testul de dozare AdBlue, opacimetrul
   AVL cu sonda în țeava finală și testerul Launch X431 (coduri, date live, corecții, teste active, regenerarea de service), refractometrul
   pentru AdBlue și osciloscopul în modul roll pentru regenerare. Fiecare student are motorul propriu și un defect ascuns. */
"use strict";
const MD = MODELE["da-l5"];
function P() { return Cadru.P; }
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea standului */
const sim = {
  t: 0, contact: false, merge: false, pornire: 0, rpm: 0, reg: "ralanti", tReg: 0, ect: 74, rapid: false,
  manusi: false, ochelari: false, exh: false, spate: false, scanat: false, sterse: false, ecran: "coduri",
  kit: { montat: false, t: 0, V: [0, 0, 0, 0] }, egrDesch: false, tEgr: 0,
  dpf: { m: null, regen: null, gata: false, km: null, T1max: 0, T2max: 0, ist: [] },
  doza: { montat: false, activ: false, t: 0, V: 0 }, refr: null, opac: { sonda: false, acc: 0, tAcc: -99, k: 0, N: 0, i: 0, rez: [] }
};
const NUME_EC = { coduri: "Coduri de defect", cr: "Common rail – date live", corr: "Corecții / coduri IQA", egr: "EGR – test activ", dpf: "Filtrul de particule", scr: "SCR / AdBlue" };

/* ------------------------------------------------------------------ fizica (legătura cu modelul) */
function regM() { return sim.pornire > 0 ? "pornire" : sim.reg; }
function presiuneLive() {
  const p = P(); if (!sim.merge && sim.pornire <= 0) return { pc: 0, pr: sim.contact ? 6 : 0 };
  const q = MD.presiune(p, regM()), f = sim.pornire > 0 ? Math.min(1, (2.6 - sim.pornire) / 1.2) : Math.min(1, sim.tReg / 1.5);
  return { pc: q.pc, pr: Math.round(q.pr * f + (sim.t % 1 < 0.5 ? 2 : -2) * Math.sin(sim.t * 7)) };
}
const QGAZ = () => sim.merge ? (sim.reg === "r2500" ? 330 : MD.Q_RAL) * (sim.rpm / (sim.reg === "r2500" ? 2500 : 800)) : 0;
function funin() { if (sim.dpf.m === null) sim.dpf.m = MD.funingineInitiala(P()); return sim.dpf.m; }
function dpLive() { return MD.dpDPF(P(), funin(), sim.merge ? MD.Q_RAL * (sim.reg === "r2500" ? 3.1 : 1) : 0); }
function stabil() { return sim.merge && sim.pornire <= 0 && sim.tReg >= 8; }
function cald() { return sim.ect >= 80; }

/* ------------------------------------------------------------------ desenele instrumentelor */
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 11}" text-anchor="${o.a || "middle"}" fill="${o.f || "currentColor"}" font-weight="${o.w || 400}"${o.fam ? ` font-family="${o.fam}"` : ""}>${s}</text>`;
function liniiX431() {
  const p = P(), viu = sim.merge || sim.pornire > 0, q = presiuneLive(), c = MD.corectii(p), g = MD.egr(p, sim.egrDesch), s = MD.scr(p, sim.reg), st = MD.stareDPF(p), R = sim.dpf.regen;
  if (!sim.contact && !sim.merge) return { titlu: "X431 – contact luat", linii: [] };
  switch (sim.ecran) {
    case "coduri": return { titlu: "Scanare completă – ECU motor (EDC17)", linii: !sim.scanat ? [["Apăsați „Scanează”", "", false]] : (sim.sterse && !codurileRevin() ? [["Nu există coduri memorate", "", false]] : MD.coduri(p).map(x => [x.split(" – ")[0], x.split(" – ")[1], true])) };
    case "cr": return { titlu: "Common rail – date live", linii: [["Turația motorului", viu ? fx(sim.rpm, 0) + " rot/min" : "0"], ["Presiunea cerută în rampă", fx(q.pc, 0) + " bar"], ["Presiunea reală în rampă", fx(q.pr, 0) + " bar", viu && q.pc - q.pr > 40],
      ["Comanda supapei IMV", viu ? fx(cl(30 + (q.pc - q.pr) * 0.3 + (sim.reg === "r2500" ? 18 : 0), 0, 100), 0) + " %" : "—"], ["Temperatura lichidului de răcire", fx(sim.ect, 0) + " °C"], ["Temperatura motorinei", fx(sim.ect - 28, 0) + " °C"]] };
    case "corr": return { titlu: "Corecțiile de debit pe cilindri (uniformizare)", linii: [1, 2, 3, 4].map(i => [`Cilindrul ${i}`, viu && stabil() ? `${c[i - 1] >= 0 ? "+" : ""}${fx(c[i - 1], 2)} mg/cursă` : "—", viu && Math.abs(c[i - 1]) > 2.5]).concat([["Coduri IQA în ECU", "4/4 înregistrate"]]) };
    case "egr": return { titlu: "EGR – supapă electrică · test activ", linii: [["Poziția cerută", fx(sim.merge ? g.pozC : 0, 0) + " %"], ["Poziția reală", fx(sim.merge ? g.pozR : 0, 0) + " %", sim.merge && Math.abs(g.pozC - g.pozR) > 5],
      ["Debitul de aer (debitmetru)", sim.merge ? fx(maLive(), 1) + " kg/h" : "0,0 kg/h"], ["Testul activ", sim.egrDesch ? "EGR deschis (comandat)" : "EGR închis"]] };
    case "dpf": return { titlu: R ? `Regenerare de service – ${R.faza}` : "Filtrul de particule – date", linii: [["Presiunea diferențială", fx(dpLive(), 1) + " mbar"], ["Masa de funingine (calculată)", fx(funin(), 1) + " g"], ["Distanța de la ultima regenerare", (sim.dpf.km ?? st.km) + " km"], ["Regenerări întrerupte", String(st.intr)],
      ["T înainte de DPF", fx(R ? R.Tin : tEv1(), 0) + " °C"], ["T după DPF", fx(R ? R.Tout : tEv1() - 15, 0) + " °C"]] };
    case "scr": return { titlu: "SCR – date live", linii: [["NOₓ amonte", sim.merge && cald() ? s.up + " ppm" : "—"], ["NOₓ aval", sim.merge && cald() ? s.dn + " ppm" : "—"], ["Temperatura catalizatorului SCR", fx(sim.merge ? tEv1() - 40 : 25, 0) + " °C"], ["Nivel AdBlue", "62 %"],
      ["Test dozare", sim.doza.activ ? `în curs ${fx(sim.doza.t, 0)}/120 s` : sim.doza.t >= 120 ? "încheiat (100 ml cerut)" : "—"]] };
  }
  return { titlu: "", linii: [] };
}
function codurileRevin() { return P().defect.tip !== "inj" && P().defect.tip !== "imv" ? sim.tSters !== undefined && sim.t - sim.tSters > 60 && sim.merge : sim.merge && sim.t - (sim.tSters || 0) > 20; }
function maLive() { const g = MD.egr(P(), sim.egrDesch && sim.tEgr > 3); return g.ma * (sim.rpm / 800); }
function tEv1() { return sim.merge ? (sim.reg === "r2500" ? 360 : 230) * Math.min(1, sim.tReg / 30 + 0.6) : 30; }
function desenX431() {
  const el = $("#svg-x431"); if (!el) return;
  const L = liniiX431();
  let s = `<defs><linearGradient id="xb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f46"/><stop offset="1" stop-color="#16191d"/></linearGradient></defs>`;
  s += `<rect x="6" y="6" width="808" height="318" rx="22" fill="url(#xb)" stroke="#000"/><rect x="26" y="22" width="768" height="286" rx="6" fill="#f4f6f8"/>`;
  s += `<rect x="26" y="22" width="768" height="26" rx="6" fill="#c62828"/>${txt(36, 40, "LAUNCH X-431 PRO", { fs: 12, a: "start", f: "#fff", w: 800 })}${txt(784, 40, "Renault · K9K 1.5 dCi · EDC17 · " + (NUME_EC[sim.ecran] || ""), { fs: 10.5, a: "end", f: "#ffe1e1" })}`;
  Object.keys(NUME_EC).forEach((k, i) => { const y = 58 + i * 40; s += `<g class="x-meniu" data-ec="${k}" style="cursor:pointer"><rect x="34" y="${y}" width="150" height="34" rx="5" fill="${sim.ecran === k ? "#1f6fd0" : "#dfe5ec"}"/>${txt(109, y + 21, NUME_EC[k].split(" – ")[0].split(" /")[0], { fs: 11, f: sim.ecran === k ? "#fff" : "#1b2733", w: 600 })}</g>`; });
  s += txt(200, 72, L.titlu, { fs: 13, a: "start", f: "#0b2a4a", w: 700 });
  (L.linii || []).forEach(([n, v, al], i) => { const y = 102 + i * 30; s += `<rect x="198" y="${y - 18}" width="586" height="26" fill="${i % 2 ? "#ffffff" : "#e9eef3"}"/>${txt(206, y, n, { fs: 12, a: "start", f: "#1b2733" })}${txt(776, y, v, { fs: 12.5, a: "end", f: al ? "#c62828" : "#0b2a4a", w: 700, fam: "monospace" })}`; });
  el.innerHTML = s;
  $$(".x-meniu", el).forEach(g => g.addEventListener("click", () => { sim.ecran = g.dataset.ec; desenX431(); actualizeazaPasi(); }));
}
/** osciloscopul în modul roll: T înainte de DPF (CH1), T după DPF (CH2), masa de funingine (CH3); 2 min/div */
function desenOsc() {
  const cv = $("#cv-osc"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#06120c"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(120,200,160,.18)"; for (let k = 1; k < 10; k++) { g.beginPath(); g.moveTo(W * k / 10, 0); g.lineTo(W * k / 10, H); g.stroke(); } for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(0, H * k / 8); g.lineTo(W, H * k / 8); g.stroke(); }
  const I = sim.dpf.ist, T0 = I.length ? Math.max(0, I[I.length - 1].t - 1200) : 0, X = t => (t - T0) / 1200 * W;
  [["Tin", "#ffe14d", v => H - v / 800 * H], ["Tout", "#5fd3ff", v => H - v / 800 * H], ["m", "#ff7aa8", v => H - v / 50 * H]].forEach(([k, c, Y]) => { g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); I.filter(e => e.t >= T0).forEach((e, j) => j ? g.lineTo(X(e.t), Y(e[k])) : g.moveTo(X(e.t), Y(e[k]))); g.stroke(); });
  g.font = "11px system-ui"; g.fillStyle = "#ffe14d"; g.fillText("CH1 T înainte DPF 100 °C/div", 8, 14); g.fillStyle = "#5fd3ff"; g.fillText("CH2 T după DPF 100 °C/div", 8, 28); g.fillStyle = "#ff7aa8"; g.fillText("CH3 funingine 6,25 g/div", 8, 42); g.fillStyle = "#9fe6c0"; g.fillText("2 min/div · roll", W - 100, 14);
}
/** refractometrul: câmpul vizual cu scala de uree și linia de separare albastru / alb */
function desenRefr() {
  const el = $("#svg-refr"); if (!el) return;
  const c = sim.refr; let s = `<defs><clipPath id="rf"><circle cx="150" cy="130" r="105"/></clipPath><linearGradient id="rfc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5c6670"/><stop offset=".5" stop-color="#cfd5db"/><stop offset="1" stop-color="#5c6670"/></linearGradient></defs>`;
  s += `<rect x="300" y="110" width="180" height="40" rx="18" fill="url(#rfc)" stroke="#333"/><rect x="460" y="104" width="40" height="52" rx="6" fill="#2b2f35"/>${txt(390, 175, "refractometru (uree / AdBlue)", { fs: 11 })}`;
  s += `<circle cx="150" cy="130" r="112" fill="#111"/><g clip-path="url(#rf)"><rect x="40" y="20" width="220" height="220" fill="#f5f7fa"/>`;
  const Y = v => 230 - (v - 20) * 9;
  if (c != null) s += `<rect x="40" y="20" width="220" height="${Y(c) - 20}" fill="#2f6fb7"/>`;
  for (let v = 20; v <= 40; v += 0.5) { const y = Y(v), M = v % 5 === 0, h = v % 1 === 0; s += `<line x1="150" y1="${y}" x2="${150 + (M ? 40 : h ? 26 : 16)}" y2="${y}" stroke="${c != null && y < Y(c) ? "#e6eef8" : "#1b2733"}" stroke-width="${M ? 1.6 : 0.8}"/>`; if (M) s += txt(198, y + 4, v, { fs: 12, a: "start", f: c != null && y < Y(c) ? "#fff" : "#1b2733", w: 700 }); }
  s += `<line x1="100" y1="${Y(32.5)}" x2="150" y2="${Y(32.5)}" stroke="#c62828" stroke-width="2"/>${txt(96, Y(32.5) + 4, "32,5", { fs: 11, a: "end", f: "#c62828", w: 700 })}${txt(110, 50, "UREE %", { fs: 11, f: "#555", w: 700 })}</g>`;
  s += txt(150, 268, c == null ? "puneți o picătură de AdBlue pe prismă" : "citire: limita albastru / alb", { fs: 11 });
  el.innerHTML = s;
}

/* ------------------------------------------------------------------ pașii */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const RG = ["pornire", "ralanti", "r2500"];
const PASI = [
  { t: "Pregătirea și scanarea", tab: "Tabelul 5.0 – coduri", vedere: "gen", panou: "x431",
    instr: ["NSSM: mănuși și ochelari, exhaustarea conectată la țeava finală, zona din spatele evacuării liberă.", "Contact pus, testerul X431 conectat la priza OBD: „Scanează” (scanarea completă); notați codurile motorului și ale post-tratării.", "Porniți motorul la ralanti până la ≥ 80 °C (timp accelerat)."],
    ver: () => [[sim.manusi && sim.ochelari && sim.exh && sim.spate, "NSSM: mănuși, ochelari, exhaustare, zona liberă"], [sim.scanat, "scanarea completă efectuată"], [cald(), `motor cald (${fx(sim.ect, 0)} °C)`]],
    prog: () => (pe("t50", "c", "v") ? 1 : 0) + (cald() ? 1 : 0), tot: 2,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși</label><label class="bifa"><input type="checkbox" id="ck-och"> Ochelari</label><label class="bifa"><input type="checkbox" id="ck-exh"> Exhaustare</label><label class="bifa"><input type="checkbox" id="ck-sp"> Zona din spate liberă</label></div>
      <div class="rand-butoane"><button type="button" class="b-contact">Contact</button><button type="button" id="b-scan">Scanează (X431)</button><button type="button" class="primar b-porn">Pornește motorul</button><button type="button" class="b-stop">Oprește</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>`,
    buton: ["● Codurile citite → Tabelul 5.0", e => inregCoduri(e)] },
  { t: "Presiunea din rampă", tab: "Tabelul 5.1", vedere: "cr", panou: "x431", ecran: "cr",
    instr: ["X431: Common rail – date live.", "Porniți motorul: în timpul antrenării (≈ 2 s) înregistrați presiunea cerută și cea reală la pornire.", "La ralanti și la ≈ 2500 rot/min, după stabilizare, înregistrați presiunile."],
    ver: () => [[sim.ecran === "cr", "ecranul common rail"], [sim.pornire > 0 || stabil(), sim.pornire > 0 ? "antrenare (pornire)" : stabil() ? `regim stabil: ${sim.reg === "r2500" ? "2500 rot/min" : "ralanti"}` : "porniți motorul / așteptați stabilizarea"]],
    prog: () => RG.filter(k => pe("t51", k, "pr")).length, tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" class="b-contact">Contact</button><button type="button" class="primar b-porn">Pornește motorul (antrenare)</button><button type="button" class="b-stop">Oprește</button></div><div class="rand-butoane"><button type="button" data-reg="ralanti">Ralanti</button><button type="button" data-reg="r2500">≈ 2500 rot/min</button></div>`,
    buton: ["● p cerută / reală → Tabelul 5.1", e => inregPres(e)] },
  { t: "Corecțiile și testul de retur", tab: "Tabelul 5.2", vedere: "cr", panou: "retur", ecran: "corr",
    instr: ["La ralanti, motor cald: X431 → Corecții / IQA; înregistrați corecțiile.", "Opriți motorul, montați kitul de retur (eprubetele pe retururile injectoarelor – numai pe joasă presiune).", "Porniți motorul și colectați 2 minute la ralanti; opriți motorul și citiți volumele."],
    ver: () => [[sim.kit.montat, "kitul de retur montat"], [sim.kit.t >= 120, `colectare: ${fx(Math.min(120, sim.kit.t), 0)}/120 s`], [!sim.merge || sim.kit.t < 120, "motorul oprit pentru citire"]],
    prog: () => [1, 2, 3, 4].filter(i => pe("t52", "c" + i, "V")).length + (pe("t52", "c1", "corr") ? 1 : 0), tot: 5,
    ctl: `<div class="rand-butoane"><button type="button" class="b-contact">Contact</button><button type="button" class="primar b-porn">Pornește</button><button type="button" class="b-stop">Oprește</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div><div class="rand-butoane"><button type="button" id="b-kit">Montează kitul de retur</button><button type="button" id="b-golkit">Golește eprubetele</button></div>`,
    buton: ["● Corecțiile (X431) / volumele de retur → Tabelul 5.2", e => inregCR(e)] },
  { t: "Sistemul EGR", tab: "Tabelul 5.3", vedere: "adm", panou: "x431", ecran: "egr",
    instr: ["Inspecție vizuală: supapa electrică cu motor și senzor de poziție, răcitorul EGR.", "La ralanti, X431 → EGR: citiți debitul de aer cu supapa închisă.", "Testul activ: deschideți supapa; citiți poziția cerută / reală și debitul de aer."],
    ver: () => [[stabil(), "motor la ralanti, stabil"], [sim.ecran === "egr", "ecranul EGR"], [sim.egrDesch ? sim.tEgr > 3 : true, sim.egrDesch ? "supapa deschisă (test activ)" : "supapa închisă"]],
    prog: () => ["ma0", "maE"].filter(k => pe("t53", k, "v")).length, tot: 2,
    ctl: `<div class="rand-butoane"><button type="button" class="primar b-porn">Pornește</button><button type="button" id="b-egr">Test activ: deschide EGR</button></div>`,
    buton: ["● EGR (poziții, debit aer) → Tabelul 5.3", e => inregEGR(e)] },
  { t: "Filtrul de particule", tab: "Tabelul 5.4", vedere: "post", panou: "dpf", ecran: "dpf",
    instr: ["Contact pus, motor oprit: Δp (≈ 0). La ralanti: Δp, masa de funingine, distanța, regenerările întrerupte.", "Condiții: motor cald, exhaustarea conectată, fără coduri care blochează. X431 → Regenerare de service (≈ 20 min, timp ×10). Urmăriți pe osciloscop T înainte/după DPF și funinginea.", "După regenerare: Δp la contact și la ralanti, masa de funingine."],
    ver: () => [[cald(), "motor cald"], [sim.exh && sim.spate, "exhaustare, zona din spate liberă"], [!!sim.dpf.regen || sim.dpf.gata, sim.dpf.regen ? `regenerare: ${sim.dpf.regen.faza}` : sim.dpf.gata ? "regenerare încheiată" : "regenerarea nepornită"]],
    prog: () => ["dpC", "dpR", "m"].filter(k => pe("t54", k, "inainte")).length + ["dpC", "dpR", "m"].filter(k => pe("t54", k, "dupa")).length, tot: 6,
    ctl: `<div class="rand-butoane"><button type="button" class="b-contact">Contact</button><button type="button" class="primar b-porn">Pornește</button><button type="button" class="b-stop">Oprește</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div><div class="rand-butoane"><button type="button" id="b-regen">Pornește regenerarea de service (X431)</button></div>`,
    buton: ["● Datele DPF → Tabelul 5.4", e => inregDPF(e)] },
  { t: "Sistemul SCR", tab: "Tabelul 5.5 – SCR", vedere: "post", panou: "scr", ecran: "scr",
    instr: ["Motor cald: NOₓ amonte / aval la ralanti și la 2500 rot/min (X431 → SCR).", "Motor oprit: scoateți modulul de dozare din suport, cu duza în cilindrul gradat; testul de dozare (100 ml cerut, 2 min); citiți volumul.", "Mănuși și ochelari: o picătură de AdBlue pe prisma refractometrului; citiți concentrația."],
    ver: () => [[sim.ecran === "scr", "ecranul SCR"], [sim.manusi && sim.ochelari, "mănuși și ochelari (AdBlue)"], [sim.doza.t >= 120, sim.doza.activ ? `dozare ${fx(sim.doza.t, 0)}/120 s` : "testul de dozare"]],
    prog: () => ["noxRu", "nox25u", "doseM", "conc"].filter(k => pe("t55", k, "v")).length, tot: 4,
    ctl: `<div class="rand-butoane"><button type="button" class="primar b-porn">Pornește</button><button type="button" class="b-stop">Oprește</button><button type="button" data-reg="ralanti">Ralanti</button><button type="button" data-reg="r2500">≈ 2500 rot/min</button></div>
      <div class="rand-butoane"><button type="button" id="b-modul">Modulul de dozare în cilindrul gradat</button><button type="button" id="b-doza">Test de dozare 2 min (X431)</button><button type="button" id="b-refr">Picătură pe refractometru</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>`,
    buton: ["● NOₓ / volumul dozat / concentrația → Tabelul 5.5", e => inregSCR(e)] },
  { t: "Opacitatea", tab: "Tabelul 5.5 – k", vedere: "post", panou: "opac",
    instr: ["Motor cald, opacimetrul pornit, sonda în țeava finală (mănuși – țeava este fierbinte).", "Trei accelerări libere: pedala apăsată rapid până la turația de tăiere, menținută ≈ 2 s, apoi eliberată; la fiecare se înregistrează k maxim."],
    ver: () => [[cald(), "motor cald"], [sim.opac.sonda, "sonda în țeava finală"], [sim.opac.i >= 1, `accelerări: ${sim.opac.i}`]],
    prog: () => [1, 2, 3].filter(i => pe("t55", "k" + i, "v")).length, tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" class="primar b-porn">Pornește</button><button type="button" id="b-sondaO">Sonda opacimetrului în țeava finală</button><button type="button" class="primar" id="b-acc">Accelerare liberă</button></div>`,
    buton: ["● k (accelerarea curentă) → Tabelul 5.5", e => inregOpac(e)] },
  { t: "Diagnosticul", tab: "Tabelul 5.6", vedere: "gen", panou: "x431", ecran: "coduri",
    instr: ["Comparați: presiunile, corecțiile și retururile, EGR, Δp și funinginea, NOₓ și concentrația, opacitatea.", "Alegeți defectul ascuns. Ștergeți codurile rezolvate și faceți un ciclu de confirmare (motorul pornit ≥ 1 min): codurile defectelor nereparate revin."],
    ver: () => [[sim.sterse, "codurile șterse"], [sim.sterse && sim.merge && sim.t - (sim.tSters || 0) > 60, "ciclul de confirmare"]],
    prog: () => pe("t56", "d", "cauza") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><button type="button" id="b-sterge">Șterge codurile (X431)</button><button type="button" class="primar b-porn">Pornește (ciclu de confirmare)</button></div>
      <label class="camp">Defectul identificat <select id="sel-diag"><option value=""></option>${MD.optiuniDiag().map(o => `<option>${o}</option>`).join("")}</select></label>`,
    buton: ["● Diagnosticul → Tabelul 5.6", e => inregDiag(e)] }
];
let pasActiv = 0;
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small>${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol><ul class="pas-ver"></ul><div class="pas-ctl">${p.ctl}</div>${p.buton ? `<button type="button" class="primar lat" data-inreg="${i}">${p.buton[0]}</button>` : ""}</div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].buton[1](e); actualizeazaPasi(); }));
  legaComenzi(); alegePas(0);
}
function alegePas(i) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$(".instr").forEach(el => { el.hidden = !el.dataset.panou.split(" ").includes(p.panou); });
  if (p.ecran) sim.ecran = p.ecran;
  const bv = document.querySelector(`#motor3d .m3d-vederi [data-v="${p.vedere}"]`); if (bv) bv.click();
  if (p.panou === "diag") rezumat();
  deseneaza(); actualizeazaPasi();
}
function deseneaza() { desenX431(); desenOsc(); desenRefr(); afisRetur(); afisOpac(); }
function afisRetur() { const el = $("#af-ret"); if (!el) return; const K = sim.kit; el.innerHTML = K.montat ? [1, 2, 3, 4].map(i => `<div><span>Eprubeta ${i}</span><b>${fx(Math.round(K.V[i - 1] * 2) / 2, 1)} ml</b></div>`).join("") + `<div><span>Timp de colectare</span><b>${fx(Math.min(K.t, 999), 0)} s</b></div>` : `<p class="nota">Kitul de retur nemontat.</p>`; }
function afisOpac() { const el = $("#af-opac"); if (!el) return; const O = sim.opac; el.innerHTML = `<div><span>Opacitate N</span><b>${fx(O.N, 1)} %</b></div><div><span>k (maxim acc. ${O.i})</span><b>${fx(O.k, 2)} m⁻¹</b></div><div><span>Turație</span><b>${fx(sim.rpm, 0)}</b></div>` + O.rez.map((r, i) => `<div><span>Accelerarea ${i + 1}</span><b>${fx(r.k, 2)} m⁻¹</b></div>`).join(""); }
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (sel, on, t1, t0) => $$(sel).forEach(b => { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); });
  s(".b-contact", sim.contact, "Contact: pus", "Contact: luat"); s("#b-kit", sim.kit.montat, "Demontează kitul", "Montează kitul de retur"); s("#b-egr", sim.egrDesch, "Test activ: închide EGR", "Test activ: deschide EGR");
  s("#b-modul", sim.doza.montat, "Modulul înapoi în suport", "Modulul de dozare în cilindrul gradat"); s("#b-sondaO", sim.opac.sonda, "Scoate sonda", "Sonda opacimetrului în țeava finală");
  $$("[data-reg]").forEach(b => b.classList.toggle("activ", sim.merge && b.dataset.reg === sim.reg));
  $("#af-st").textContent = sim.pornire > 0 ? "antrenare" : sim.merge ? "motor pornit" : sim.contact ? "contact pus" : "contact luat"; $("#af-n").textContent = fx(sim.rpm, 0); $("#af-T").textContent = fx(sim.ect, 0);
  const q = presiuneLive(); $("#af-p").textContent = sim.merge || sim.pornire > 0 ? `${q.pc} / ${q.pr}` : "—"; $("#af-dp").textContent = sim.contact || sim.merge ? fx(dpLive(), 1) : "—";
}
function rezumat() {}

/* ------------------------------------------------------------------ comenzile */
function on(id, f) { $$(id).forEach(b => b.addEventListener("click", f)); }
function porneste() {
  if (sim.merge) return;
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul (bujiile incandescente se preîncălzesc).", "atentie");
  if (!sim.exh || !sim.spate) return Cadru.mesajTemporar("NSSM: exhaustarea conectată la țeava finală și zona din spatele evacuării liberă.", "pericol");
  if (sim.doza.montat) return Cadru.mesajTemporar("Readuceți modulul de dozare în suport înainte de pornire.", "atentie");
  sim.pornire = 2.6; sim.reg = "ralanti"; sim.tReg = 0; sim.egrDesch = false;
}
function opreste() { if (!sim.merge && sim.pornire <= 0) return; sim.merge = false; sim.pornire = 0; sim.egrDesch = false; if (sim.dpf.regen) { sim.dpf.regen = null; Cadru.mesajTemporar("Regenerarea a fost întreruptă (motorul oprit).", "atentie"); } }
function legaComenzi() {
  const ck = (id, k) => { const e = $(id); if (e) e.addEventListener("change", ev => { sim[k] = ev.target.checked; actualizeazaPasi(); }); };
  ck("#ck-man", "manusi"); ck("#ck-och", "ochelari"); ck("#ck-exh", "exh"); ck("#ck-sp", "spate");
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked; $$(".ck-rapid").forEach(x => x.checked = sim.rapid); }));
  on(".b-contact", () => { if (sim.merge) return opreste(); sim.contact = !sim.contact; });
  on(".b-porn", porneste); on(".b-stop", opreste);
  on("#b-scan", () => { if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul (X431 comunică prin priza OBD).", "atentie"); sim.scanat = true; sim.ecran = "coduri"; deseneaza(); });
  $$("[data-reg]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); if (sim.dpf.regen) return Cadru.mesajTemporar("Regenerarea controlează turația – așteptați sfârșitul.", "atentie"); sim.reg = b.dataset.reg; sim.tReg = 0; actualizeazaPasi(); }));
  on("#b-kit", () => { if (sim.merge) return Cadru.mesajTemporar("NSSM: kitul de retur se montează / demontează numai cu motorul oprit (și la peste 30 s după oprire).", "pericol"); if (!sim.manusi) return Cadru.mesajTemporar("NSSM: mănuși.", "atentie"); sim.kit.montat = !sim.kit.montat; sim.kit.t = 0; sim.kit.V = [0, 0, 0, 0]; });
  on("#b-golkit", () => { if (sim.merge) return; sim.kit.t = 0; sim.kit.V = [0, 0, 0, 0]; });
  on("#b-egr", () => { if (!stabil() || sim.reg !== "ralanti") return Cadru.mesajTemporar("Testul activ EGR se face la ralanti stabil.", "atentie"); sim.egrDesch = !sim.egrDesch; sim.tEgr = 0; sim.ecran = "egr"; });
  on("#b-regen", () => {
    if (!sim.merge || sim.reg !== "ralanti") return Cadru.mesajTemporar("Regenerarea de service pornește de la ralanti.", "atentie");
    if (!cald()) return Cadru.mesajTemporar("Condiție neîndeplinită: motorul trebuie să fie cald (≥ 80 °C).", "atentie");
    if (!sim.exh || !sim.spate) return Cadru.mesajTemporar("NSSM: gazele depășesc 600 °C – exhaustarea și zona din spate liberă.", "pericol");
    if (P().defect.tip === "dp") return Cadru.mesajTemporar("X431: regenerarea refuzată – codul P2453 (presiunea diferențială neplauzibilă) blochează regenerarea. Verificați senzorul și conductele lui.", "pericol");
    if (sim.dpf.gata) return Cadru.mesajTemporar("Regenerarea a fost deja efectuată.", "atentie");
    sim.dpf.regen = { t: 0, faza: "încălzire", m0: funin() }; sim.dpf.ist = []; sim.ecran = "dpf"; sim.dpf.T1max = sim.dpf.T2max = 0;
  });
  on("#b-modul", () => { if (sim.merge) return Cadru.mesajTemporar("Modulul de dozare se scoate cu motorul oprit.", "atentie"); if (!sim.manusi || !sim.ochelari) return Cadru.mesajTemporar("NSSM: AdBlue este iritant – mănuși și ochelari.", "pericol"); sim.doza.montat = !sim.doza.montat; sim.doza.V = 0; sim.doza.t = 0; });
  on("#b-doza", () => { if (!sim.contact || sim.merge) return Cadru.mesajTemporar("Testul de dozare: contact pus, motor oprit.", "atentie"); if (!sim.doza.montat) return Cadru.mesajTemporar("Puneți întâi modulul de dozare cu duza în cilindrul gradat.", "atentie"); sim.doza.activ = true; sim.doza.t = 0; sim.doza.V = 0; sim.ecran = "scr"; });
  on("#b-refr", () => { if (!sim.manusi || !sim.ochelari) return Cadru.mesajTemporar("NSSM: mănuși și ochelari.", "pericol"); sim.refr = MD.concentratie(P()); desenRefr(); });
  on("#b-sondaO", () => { if (!sim.opac.sonda && !sim.manusi) return Cadru.mesajTemporar("NSSM: mănuși – țeava finală este fierbinte.", "pericol"); sim.opac.sonda = !sim.opac.sonda; });
  on("#b-acc", () => { if (!sim.merge || !stabil()) return Cadru.mesajTemporar("Motorul pornit, la ralanti stabil.", "atentie"); if (!sim.opac.sonda) return Cadru.mesajTemporar("Introduceți sonda opacimetrului.", "atentie"); if (!cald()) return Cadru.mesajTemporar("Motorul trebuie să fie cald.", "atentie"); if (sim.t - sim.opac.tAcc < 6) return; sim.opac.i++; sim.opac.tAcc = sim.t; sim.opac.k = 0; sim.opac.N = 0; });
  on("#b-sterge", () => { if (!sim.contact) return Cadru.mesajTemporar("Contact pus pentru ștergere.", "atentie"); sim.sterse = true; sim.tSters = sim.t; sim.ecran = "coduri"; Cadru.mesajTemporar("Codurile au fost șterse. Faceți ciclul de confirmare.", ""); });
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregCoduri(e) {
  if (!sim.scanat) return Cadru.mesajTemporar("Faceți întâi scanarea completă.", "atentie");
  const c = MD.coduri(P()).map(x => x.split(" – ")[0]).join(", ") || "niciun cod";
  const ok = Cadru.inregistreaza(e, { log: { m: "coduri", v: c }, celule: [{ t: "t50", r: "c", c: "v", v: c }] }); if (ok) msg(`Tabelul 5.0: ${c}.`);
}
function inregPres(e) {
  const k = sim.pornire > 0 ? "pornire" : stabil() ? sim.reg : null;
  if (!k) return Cadru.mesajTemporar("Înregistrați în timpul antrenării sau după stabilizarea regimului.", "atentie");
  if (sim.pornire > 0 && sim.pornire > 2.0) return Cadru.mesajTemporar("Așteptați creșterea presiunii (≈ 0,6 s de antrenare).", "atentie");
  const q = presiuneLive(), pr = k === "pornire" ? MD.presiune(P(), "pornire").pr : q.pr;
  const ok = Cadru.inregistreaza(e, { log: { m: "pres", k, pc: q.pc, pr }, celule: [{ t: "t51", r: k, c: "pc", v: String(q.pc) }, { t: "t51", r: k, c: "pr", v: String(pr) }] });
  if (ok) msg(`Tabelul 5.1 (${{ pornire: "pornire", ralanti: "ralanti", r2500: "2500 rot/min" }[k]}): p cerută ${q.pc} bar, p reală ${pr} bar.`);
}
function inregCR(e) {
  if (sim.ecran === "corr" && stabil() && sim.reg === "ralanti" && !sim.kit.montat) {
    const c = MD.corectii(P());
    const ok = Cadru.inregistreaza(e, { log: { m: "corr", v: c }, celule: [1, 2, 3, 4].flatMap(i => [{ t: "t52", r: "c" + i, c: "corr", v: c[i - 1].toFixed(2) }, { t: "t52", r: "c" + i, c: "iqa", v: "da" }]) });
    if (ok) msg(`Tabelul 5.2: corecțiile ${c.map(x => fx(x, 2)).join(" / ")} mg/cursă; codurile IQA sunt înregistrate.`); return;
  }
  if (!sim.kit.montat) return Cadru.mesajTemporar("Pentru corecții: motor cald la ralanti și ecranul „Corecții” al X431. Pentru retur: montați kitul.", "atentie");
  if (sim.kit.t < 120) return Cadru.mesajTemporar(`Colectați 2 minute la ralanti (acum ${fx(sim.kit.t, 0)} s).`, "atentie");
  if (sim.merge) return Cadru.mesajTemporar("Opriți motorul înainte de citirea eprubetelor.", "atentie");
  const V = sim.kit.V.map(v => Math.round(v * 2) / 2);
  const ok = Cadru.inregistreaza(e, { log: { m: "ret", V, t: Math.round(sim.kit.t) }, celule: V.map((v, i) => ({ t: "t52", r: "c" + (i + 1), c: "V", v: v.toFixed(1) })) });
  if (ok) msg(`Tabelul 5.2: volumele de retur în 2 min: ${V.map(v => fx(v, 1)).join(" / ")} ml.`);
}
function inregEGR(e) {
  if (!stabil() || sim.reg !== "ralanti") return Cadru.mesajTemporar("Motorul la ralanti stabil.", "atentie");
  if (sim.egrDesch && sim.tEgr < 3) return Cadru.mesajTemporar("Așteptați deschiderea supapei.", "atentie");
  const g = MD.egr(P(), sim.egrDesch), ma = g.ma;
  const cel = [{ t: "t53", r: sim.egrDesch ? "maE" : "ma0", c: "v", v: ma.toFixed(1) }, { t: "t53", r: "tip", c: "v", v: "electrică" }];
  if (sim.egrDesch) cel.push({ t: "t53", r: "poz", c: "v", v: `${g.pozC} / ${g.pozR}` });
  const ok = Cadru.inregistreaza(e, { log: { m: "egr", desch: sim.egrDesch, ma, pozC: g.pozC, pozR: g.pozR }, celule: cel });
  if (ok) msg(`Tabelul 5.3: EGR ${sim.egrDesch ? `deschis (cerut ${g.pozC} %, real ${g.pozR} %)` : "închis"} – debitul de aer ${fx(ma, 1)} kg/h.`);
}
function inregDPF(e) {
  const col = sim.dpf.gata ? "dupa" : "inainte", cel = [], log = [], mf = funin();
  if (sim.dpf.regen) return Cadru.mesajTemporar("Așteptați sfârșitul regenerării.", "atentie");
  if (!sim.merge && sim.contact) { const v = dpLive(); cel.push({ t: "t54", r: "dpC", c: col, v: v.toFixed(1) }); log.push({ m: "dpf", k: "dpC", v, mf, col }); }
  else if (stabil() && sim.reg === "ralanti") {
    const v = dpLive(), st = MD.stareDPF(P()), km = sim.dpf.gata ? 0 : st.km;
    cel.push({ t: "t54", r: "dpR", c: col, v: v.toFixed(1) }, { t: "t54", r: "m", c: col, v: mf.toFixed(1) }, { t: "t54", r: "km", c: col, v: String(km) }, { t: "t54", r: "intr", c: col, v: String(st.intr) });
    log.push({ m: "dpf", k: "dpR", v, mf, col }, { m: "dpf", k: "m", v: mf, col });
    if (sim.dpf.gata) cel.push({ t: "t54", r: "T", c: "dupa", v: `${fx(sim.dpf.T1max, 0)} / ${fx(sim.dpf.T2max, 0)}` });
  } else return Cadru.mesajTemporar("Δp la contact: contact pus, motor oprit. Celelalte: motorul la ralanti stabil.", "atentie");
  const ok = Cadru.inregistreaza(e, { log, celule: cel });
  if (ok) msg(`Tabelul 5.4 (${col === "dupa" ? "după" : "înainte de"} regenerare): ${cel.map(c => ({ dpC: "Δp contact", dpR: "Δp ralanti", m: "funingine", km: "km", intr: "întrerupte", T: "T1/T2 max" })[c.r] + " = " + c.v).join(", ")}.`);
}
function inregSCR(e) {
  const cel = [], log = [];
  if (sim.refr != null && !pe("t55", "conc", "v")) { cel.push({ t: "t55", r: "conc", c: "v", v: sim.refr.toFixed(1) }); log.push({ m: "conc", v: sim.refr }); }
  else if (sim.doza.t >= 120 && !sim.doza.activ && !pe("t55", "doseM", "v")) { const V = Math.round(sim.doza.V); cel.push({ t: "t55", r: "doseC", c: "v", v: "100" }, { t: "t55", r: "doseM", c: "v", v: String(V) }); log.push({ m: "doza", V }); }
  else if (stabil() && cald() && sim.tReg >= 15 && sim.ecran === "scr") { const s = MD.scr(P(), sim.reg), r = sim.reg === "r2500" ? "nox25" : "noxR"; cel.push({ t: "t55", r: r + "u", c: "v", v: String(s.up) }, { t: "t55", r: r + "d", c: "v", v: String(s.dn) }); log.push({ m: "nox", reg: sim.reg, up: s.up, dn: s.dn }); }
  else return Cadru.mesajTemporar("NOₓ: motor cald, regim stabil ≥ 15 s, ecranul SCR. Sau: testul de dozare încheiat / refractometrul citit.", "atentie");
  const ok = Cadru.inregistreaza(e, { log, celule: cel }); if (ok) msg(`Tabelul 5.5: ${cel.map(c => c.r + " = " + c.v).join(", ")}.`);
}
function inregOpac(e) {
  const O = sim.opac; if (O.i < 1 || sim.t - O.tAcc < 3.5) return Cadru.mesajTemporar("Faceți o accelerare liberă și așteptați revenirea la ralanti.", "atentie");
  if (O.i > 3) return Cadru.mesajTemporar("Sunt necesare trei accelerări.", "atentie");
  const r = MD.opacitate(P(), O.i);
  const ok = Cadru.inregistreaza(e, { log: { m: "opac", i: O.i, k: r.k, N: r.N }, celule: [{ t: "t55", r: "k" + O.i, c: "v", v: r.k.toFixed(2) }] });
  if (ok) { O.rez[O.i - 1] = r; msg(`Tabelul 5.5: accelerarea ${O.i} – N = ${fx(r.N, 1)} %, k = ${fx(r.k, 2)} m⁻¹.`); }
}
function inregDiag(e) { const v = $("#sel-diag").value; if (!v) return Cadru.mesajTemporar("Alegeți defectul.", "atentie"); const ok = Cadru.inregistreaza(e, { log: { m: "diag", v }, celule: [{ t: "t56", r: "d", c: "cauza", v }] }); if (ok) msg(`Tabelul 5.6: ${v}.`); }

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaDA5(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), F = Number.isFinite, cel = { t51: {}, t52: {}, t53: {}, t54: {}, t55: {} }, rele = { t51: {}, t52: {}, t54: {}, t55: {} };
  RG.forEach(k => { const a = num(t.t51[k].pc), b = num(t.t51[k].pr), d = a - b; cel.t51[k] = { dp: F(d) ? fx(d, 0) : "", concl: F(d) ? (Math.abs(d) <= (k === "pornire" ? 50 : 30) ? "în limite" : "presiune insuficientă – aer / filtru, pompă, IMV sau injector cu retur mare") : "" }; rele.t51[k] = { concl: F(d) && Math.abs(d) > (k === "pornire" ? 50 : 30) }; });
  [1, 2, 3, 4].forEach(i => { const r = o.r[i - 1]; cel.t52["c" + i] = { r: F(r) ? fx(r, 2) : "" }; rele.t52["c" + i] = { r: F(r) && r > 1.5 }; });
  cel.t53.x = { obs: F(o.x) ? `x<sub>EGR</sub> = ${fx(o.x, 1)} % ${o.x < 5 ? "– supapa nu deschide (blocată)" : "– EGR funcțional"}` : "" };
  cel.t53.tip = { obs: "1.5 dCi: supapă electrică cu motor și senzor de poziție" }; cel.t53.poz = { obs: "diferență ≤ 5 %" }; cel.t53.ma0 = { obs: "≈ 25…35 kg/h la ralanti" }; cel.t53.maE = { obs: "scade cu 20…35 %" };
  const v4 = (r, c) => num(t.t54[r][c]);
  cel.t54.dpC = { obs: "≈ 0 mbar (contact)" }; cel.t54.dpR = { obs: F(v4("dpR", "inainte")) && F(v4("m", "inainte")) ? (v4("m", "inainte") > 30 && v4("dpR", "inainte") > 40 ? "funingine mare, Δp mare → filtru colmatat" : v4("dpR", "inainte") < 3 ? "Δp ≈ 0 la ralanti → senzor / conducte sau filtru fisurat" : "normal") : "" };
  cel.t54.m = { obs: "regenerare la ≈ 28…35 g" }; cel.t54.km = { obs: "≈ 300…800 km între regenerări" }; cel.t54.intr = { obs: "> 3 → regim / defect care blochează" }; cel.t54.T = { obs: "T după DPF > T înainte (arderea funinginii)" };
  const k = o.kmed; cel.t55.k3 = { ref: "Euro 6: ≤ 0,7 m⁻¹", concl: F(k) ? `media ${fx(k, 2)} m⁻¹ ${k > 0.7 ? "– peste limită: DPF fisurat / lipsă" : k > 0.2 ? "– ridicată pentru un motor cu DPF" : "– DPF funcțional"}` : "" };
  cel.t55.nox25d = { ref: "η<sub>SCR</sub> ≥ 85 %", concl: F(o.eta25) ? `η = ${fx(o.eta25, 1)} %` : "" }; cel.t55.noxRd = { ref: "", concl: F(o.etaR) ? `η = ${fx(o.etaR, 1)} %` : "" };
  cel.t55.conc = { ref: "32,5 ± 0,7 %", concl: F(num(t.t55.conc.v)) ? (Math.abs(num(t.t55.conc.v) - 32.5) <= 0.7 ? "corespunzătoare" : "necorespunzătoare – diluată / contaminată") : "" };
  cel.t55.doseM = { ref: "100 ml ± 10 %", concl: F(num(t.t55.doseM.v)) ? (Math.abs(num(t.t55.doseM.v) - 100) <= 10 ? "dozare corectă" : "dozare incorectă") : "" };
  const rez = [["Volumul mediu de retur (5.2)", F(o.Vmed) ? `${fx(o.Vmed, 1)} ml; r<sub>max</sub> = <span style="color:var(--accent)">${fx(o.rmax, 2)}</span>` : "—"], ["Rata EGR (5.4)", F(o.x) ? `${fx(o.x, 1)} %` : "—"],
    ["Eficiența SCR (5.5) ralanti / 2500", `${F(o.etaR) ? fx(o.etaR, 1) : "—"} / ${F(o.eta25) ? fx(o.eta25, 1) : "—"} %`], ["Coeficientul de absorbție mediu (5.6)", F(k) ? `${fx(k, 2)} m⁻¹` : "—"]];
  const verdicte = [];
  if (F(o.rmax) && o.rmax > 1.5) verdicte.push({ tip: "atentie", text: `Un injector returnează de ${fx(o.rmax, 2)} ori media: pierderi interne – injectorul se verifică pe banc (corelați cu corecția lui).` });
  if (F(o.x) && o.x < 5) verdicte.push({ tip: "atentie", text: "Debitul de aer nu scade la deschiderea comandată a EGR: supapa blocată închisă (sau conducta/răcitorul colmatate)." });
  if (F(o.eta25) && o.eta25 < 85) verdicte.push({ tip: "atentie", text: `Eficiența SCR ${fx(o.eta25, 1)} % este mică: verificați concentrația AdBlue, dozarea și senzorii NOₓ.` });
  if (F(k) && k > 0.7) verdicte.push({ tip: "atentie", text: `k = ${fx(k, 2)} m⁻¹ depășește limita: la un motor cu DPF indică un filtru fisurat sau lipsă.` });
  const V = [1, 2, 3, 4].map(i => num(t.t52["c" + i].V));
  return { celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Volumele de retur ale injectoarelor (2 min la ralanti) – ca în Fig. 5.2",
    grafic: { tip: "bare", xmin: 0.5, xmax: 4.5, ymin: 0, ymax: Math.max(30, ...V.filter(F).map(v => v * 1.2)), xticks: [1, 2, 3, 4], xlab: "injectorul", ylab: "V [ml]", serii: V.map((v, i) => F(v) ? { tip: "linie", pts: [[i + 1, 0], [i + 1, v]], culoare: o.r[i] > 1.5 ? 3 : 0, gros: 22 } : null).filter(Boolean).concat(F(o.Vmed) ? [{ tip: "linie", pts: [[0.5, o.Vmed], [4.5, o.Vmed]], culoare: 1, punctat: true }] : []) },
    legenda: [["volumul de retur", "var(--serie-0)"], ["media", "var(--serie-1)"]], principal: { eticheta: "r<sub>max</sub>", valoare: F(o.rmax) ? +o.rmax.toFixed(2) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Presiunea din rampă depășește 1000 bar și poate penetra pielea: nu se desfac racordurile de înaltă presiune cu motorul pornit sau la mai puțin de 30 s după oprire; nu se apropie mâna de o scurgere.</li>
<li>Kitul de retur se montează numai pe conductele de joasă presiune, cu motorul oprit; motorina scursă se șterge imediat (pardoseala devine alunecoasă).</li>
<li>La regenerarea DPF gazele depășesc 600 °C: vehiculul stă în spațiu ventilat, cu exhaustarea conectată, departe de materiale inflamabile; nimeni nu stă în spatele țevii de evacuare.</li>
<li>AdBlue este iritant și coroziv pentru metalele neferoase: se lucrează cu mănuși și ochelari; se spală imediat de pe piele și vopsea.</li>
<li>Testele active pe vehicul se fac numai cu frâna de parcare trasă, cutia în poziția neutră și la comanda cadrului didactic.</li></ul></div>
<h2>5.1. Scopul lucrării</h2>
<p>Diagnosticarea sistemului common rail (presiunea cerută și reală, corecțiile de debit pe cilindri, testul de retur al injectoarelor) și a sistemelor de post-tratare: recircularea gazelor (EGR), filtrul de particule (DPF) cu regenerarea de service, reducerea catalitică selectivă (SCR) și opacitatea la accelerare liberă.</p>
<h2>5.2. Noțiuni teoretice</h2>
<p>La sistemul common rail generarea presiunii și injecția sunt decuplate: pompa de înaltă presiune menține combustibilul într-o rampă comună, de unde injectoarele comandate electronic îl preiau independent de turație (Fig. 5.1). ECU reglează presiunea prin supapa de dozare a pompei (IMV) și/sau supapa de control de pe rampă (PCV) și o compară cu senzorul de presiune. Injecția este împărțită în pre-injecții (zgomot și NOₓ reduse), injecția principală și post-injecții (regenerarea DPF).</p>
<figure><img src="img/fig5_1.jpg" alt="Fig. 5.1" loading="lazy"><figcaption>Fig. 5.1. Sistemul common rail, linia de post-tratare și punctele de măsură</figcaption></figure>
<p>Diagnoza de bază se face cu testerul: presiunea cerută și cea reală la pornire, la ralanti și la turație ridicată. Corecțiile de debit pe cilindri (uniformizarea mersului) arată cât corectează ECU fiecare injector pentru ca toți cilindrii să dea același cuplu; valorile trebuie să fie mici și apropiate. Debitul de retur se măsoară colectând în eprubete combustibilul returnat de fiecare injector (Fig. 5.2); un injector cu retur de ordinul dublului față de celelalte are pierderi interne. La înlocuire, codul de corecție al injectorului (IQA/C2I) se introduce în ECU cu testerul.</p>
<div class="ec"><span>Δp<sub>r</sub> = p<sub>cerut</sub> − p<sub>real</sub></span><span class="nr">(5.1)</span></div>
<div class="ec"><span>V<sub>med</sub> = (1/z) Σ V<sub>i</sub></span><span class="nr">(5.2)</span></div>
<div class="ec"><span>r<sub>i</sub> = V<sub>i</sub> / V<sub>med</sub></span><span class="nr">(5.3)</span></div>
<figure><img src="img/fig5_2.jpg" alt="Fig. 5.2" loading="lazy"><figcaption>Fig. 5.2. Testul de retur – volumul colectat în 2 min la ralanti (injectorul 3 defect)</figcaption></figure>
<p>Recircularea gazelor (EGR) reduce concentrația de oxigen și temperatura de ardere, deci formarea NOₓ. Supapele actuale sunt electrice, cu motor și senzor de poziție; cele vechi sunt pneumatice. Cu supapa deschisă debitul de aer proaspăt măsurat de debitmetru scade; din această scădere se estimează rata de recirculare. Lipsa scăderii arată o supapă blocată închisă.</p>
<div class="ec"><span>x<sub>EGR</sub> ≈ (ṁ<sub>a,0</sub> − ṁ<sub>a,EGR</sub>) / ṁ<sub>a,0</sub> · 100 &nbsp; [%]</span><span class="nr">(5.4)</span></div>
<p>Filtrul de particule reține funinginea în canale ceramice închise alternativ. ECU estimează masa de funingine dintr-un model și din presiunea diferențială, raportată la debitul volumic de gaze (Fig. 5.3). Regenerarea este pasivă (continuă, cu NO₂, la 250…400 °C), activă (ECU ridică temperatura la 550…650 °C prin post-injecție) sau de service, pornită cu testerul (Fig. 5.4). Cenușa din ulei nu arde și se acumulează. Regenerarea de service nu rezolvă cauza colmatării: înainte se verifică senzorul de presiune diferențială (≈ 0 la contact pus), conductele lui, senzorii de temperatură și nivelul uleiului (diluția cu motorină). Eliminarea filtrului este ilegală.</p>
<figure><img src="img/fig5_3.jpg" alt="Fig. 5.3" loading="lazy"><figcaption>Fig. 5.3. Presiunea diferențială pe DPF în funcție de debitul de gaze</figcaption></figure>
<figure><img src="img/fig5_4.jpg" alt="Fig. 5.4" loading="lazy"><figcaption>Fig. 5.4. Evoluția temperaturilor și a masei de funingine la o regenerare de service (exemplu)</figcaption></figure>
<figure><img src="img/fig5_5.jpg" alt="Fig. 5.5" loading="lazy"><figcaption>Fig. 5.5. Regenerarea de service a DPF afișată pe osciloscop în modul roll: T înainte de DPF (CH1), T după DPF (CH2), masa de funingine (CH3) (2 min/div)</figcaption></figure>
<p>Sistemul SCR injectează soluție de uree 32,5 % (AdBlue), care se transformă în amoniac și reduce NOₓ la azot și apă. ECU dozează soluția după senzorii NOₓ din amonte și aval. Opacitatea gazelor la accelerare liberă se exprimă prin coeficientul de absorbție k; opacimetrul măsoară opacitatea N [%] pe lungimea efectivă L<sub>A</sub> (0,43 m la opacimetrele standard). Limita pentru vehiculele Euro 6 este 0,7 m⁻¹; un DPF funcțional dă valori apropiate de zero.</p>
<div class="ec"><span>η<sub>SCR</sub> = (c<sub>NOx,am</sub> − c<sub>NOx,av</sub>) / c<sub>NOx,am</sub> · 100 &nbsp; [%]</span><span class="nr">(5.5)</span></div>
<div class="ec"><span>k = −(1/L<sub>A</sub>) · ln(1 − N/100) &nbsp; [m⁻¹]</span><span class="nr">(5.6)</span></div>
<h2>5.4. Modul de lucru (în simulator)</h2>
<ol><li>Scanarea completă cu X431, codurile.</li><li>Presiunea cerută / reală la pornire, ralanti, 2500 rot/min.</li><li>Corecțiile pe cilindri; testul de retur 2 min.</li><li>EGR: debitul de aer cu supapa închisă și deschisă (test activ).</li><li>DPF: Δp, funingine, regenerarea de service cu osciloscopul în modul roll.</li><li>SCR: NOₓ, testul de dozare, concentrația AdBlue.</li><li>Opacitatea – trei accelerări libere.</li><li>Diagnosticul, ștergerea codurilor, ciclul de confirmare.</li></ol>
<h2>5.7. Interpretarea rezultatelor</h2>
<ul><li>Presiune reală mai mică decât cea cerută, mai ales la pornire → aer sau restricție pe joasă presiune (filtru), pompă uzată, supapă de reglare defectă sau injector cu retur mare.</li>
<li>Un injector cu corecție de debit la limită și retur mare → injector defect; dacă returul este normal, se verifică și compresia acelui cilindru.</li>
<li>Masă de funingine mare cu Δp mare → filtru colmatat; masă mare cu Δp mic sau constant → senzor de presiune diferențială sau conducte defecte.</li>
<li>Regenerări întrerupte repetat → regim de exploatare nepotrivit sau defect care blochează regenerarea (senzor de temperatură, EGR, injectoare).</li>
<li>Eficiență SCR mică cu dozare corectă → senzor NOₓ, catalizator SCR sau AdBlue diluat.</li></ul>
<h2>5.8. Relevanță practică</h2>
<p>Diagnosticarea sistemelor de post-tratare este una dintre cele mai frecvente activități din service-urile de autoturisme și vehicule comerciale diesel. Introducerea măsurării numărului de particule la inspecția tehnică și cerințele Euro 7 de durabilitate a sistemelor de control al emisiilor cresc cererea de specialiști în acest domeniu.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Volume de retur 11 / 12 / 25 / 10,5 ml; debitul de aer 32 kg/h cu EGR închis și 22 kg/h cu EGR deschis; NOₓ 420 ppm amonte și 38 ppm aval; opacitate medie N = 26 %:</p>
<div class="ec"><span>V<sub>med</sub> = (11 + 12 + 25 + 10,5)/4 = 14,6 ml</span><span class="nr">(5.7)</span></div>
<div class="ec"><span>r<sub>3</sub> = 25/14,6 = 1,71</span><span class="nr">(5.8)</span></div>
<div class="ec"><span>x<sub>EGR</sub> = (32 − 22)/32 · 100 = 31 %</span><span class="nr">(5.9)</span></div>
<div class="ec"><span>η<sub>SCR</sub> = (420 − 38)/420 · 100 = 91 %</span><span class="nr">(5.10)</span></div>
<div class="ec"><span>k = −(1/0,43) · ln(1 − 0,26) = 0,70 m⁻¹</span><span class="nr">(5.11)</span></div>
<p>Injectorul 3 returnează de peste două ori mai mult decât mediana celorlalte (11 ml) și trebuie verificat pe banc; coeficientul k este chiar la limita admisă pentru Euro 6, ceea ce la un vehicul cu DPF indică un filtru fisurat sau lipsă.</p>
<div class="problema"><h3>Problema 1</h3><p>Calculați eficiența SCR pentru 350 ppm amonte și 60 ppm aval.</p><details class="sol"><summary>Rezolvare</summary><p>η = (350 − 60)/350·100 = 82,9 % – sub pragul uzual de ≈ 85 %: se verifică AdBlue, dozarea și senzorii.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Opacimetrul indică N = 4 %. Cât este k? Ce indică la un motor Euro 6 cu DPF?</p><details class="sol"><summary>Rezolvare</summary><p>k = −ln(0,96)/0,43 = 0,095 m⁻¹ – mult sub 0,7: DPF funcțional.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>La ralanti debitul de gaze este de 3 ori mai mic decât la 2500 rot/min. Dacă Δp la 2500 rot/min este 90 mbar, ce Δp vă așteptați la ralanti? Ce indică un Δp de 85 mbar la ralanti?</p><details class="sol"><summary>Rezolvare</summary><p>Δp ≈ proporțional cu debitul: ≈ 30 mbar. 85 mbar la ralanti → filtru colmatat (sau Δp măsurat greșit dacă masa de funingine calculată este mică).</p></details></div>`;
}
const INTREBARI = [
  ["De ce la sistemul common rail presiunea de injecție nu depinde de turație?", "Pompa de înaltă presiune alimentează o rampă comună, iar ECU reglează presiunea (IMV/PCV) independent de turație; injectorul comandat electronic deschide la momentul și pe durata stabilite de ECU. La pompele clasice presiunea era generată de cama pompei, deci depindea de turație."],
  ["Ce arată corecțiile de debit pe cilindri și ce indică o valoare aflată la limită?", "Cât adaugă sau scade ECU din debitul fiecărui injector pentru ca toți cilindrii să dea același cuplu (accelerația arborelui). O valoare la limită indică un injector cu debit diferit (uzură, pierderi interne) sau o problemă mecanică a cilindrului (compresie)."],
  ["Cum se face și ce indică testul de retur al injectoarelor?", "Cu motorul oprit se montează eprubete pe retururile injectoarelor (joasă presiune), se colectează 2 min la ralanti și se compară volumele: un injector cu retur de ≈ 2 ori media are pierderi interne și scade presiunea din rampă."],
  ["Prin ce mecanism reduce EGR emisiile de NOₓ? Cum se estimează rata EGR din debitul de aer?", "Gazele recirculate reduc concentrația de O₂ și cresc capacitatea termică a încărcăturii, deci temperatura maximă de ardere – NOₓ termic scade. x<sub>EGR</sub> ≈ (ṁ<sub>a,0</sub> − ṁ<sub>a,EGR</sub>)/ṁ<sub>a,0</sub>."],
  ["Care sunt cele trei tipuri de regenerare a DPF și în ce condiții are loc fiecare?", "Pasivă – continuă, cu NO₂, la 250…400 °C (drum, sarcină); activă – comandată de ECU prin post-injecție la 550…650 °C când masa de funingine atinge pragul; de service – pornită cu testerul, staționar, când regenerările active nu reușesc."],
  ["De ce regenerarea de service nu este o reparație?", "Ea arde funinginea, dar nu elimină cauza colmatării (trasee scurte, injector, EGR, senzori, diluarea uleiului, turbo cu consum de ulei); fără remedierea cauzei filtrul se colmatează din nou. Cenușa nu arde deloc."],
  ["Calculați eficiența SCR pentru 350 ppm amonte și 60 ppm aval.", "η = (350 − 60)/350·100 ≈ 82,9 %."],
  ["De ce se introduce la inspecția tehnică măsurarea numărului de particule în locul opacității?", "La motoarele cu DPF opacitatea este practic zero chiar și cu filtrul fisurat; numărul de particule (PN, particule/cm³) detectează sensibil un filtru deteriorat sau eliminat."]
];
const TEST = [
  { q: "Presiunea din rampă la un common rail se reglează prin:", o: ["cama pompei, după turație", "supapa IMV / PCV comandată de ECU", "regulatorul cu membrană și vacuum", "injectoare"], c: 1, e: "Decuplarea generării presiunii de injecție." },
  { q: "Retururi 11 / 12 / 25 / 10,5 ml: injectorul defect este:", o: ["1", "2", "3", "4"], c: 2, e: "r<sub>3</sub> = 1,71." },
  { q: "Debitul de aer nu scade la testul activ EGR – cauza probabilă:", o: ["EGR blocată închisă", "DPF colmatat", "AdBlue diluat", "injector cu retur mare"], c: 0, e: "Fără gaze recirculate aerul proaspăt rămâne același." },
  { q: "Funingine mare în ECU, dar Δp ≈ 0 la ralanti indică:", o: ["filtru colmatat", "senzor de presiune diferențială / conducte defecte", "regenerare reușită", "EGR blocat"], c: 1, e: "Măsurarea Δp nu funcționează." },
  { q: "k = −ln(1 − 0,26)/0,43 este:", o: ["0,26 m⁻¹", "0,70 m⁻¹", "1,2 m⁻¹", "0,43 m⁻¹"], c: 1, e: "Exemplul rezolvat al lucrării." },
  { q: "Concentrația corectă a AdBlue este:", o: ["20 %", "32,5 %", "40 %", "50 %"], c: 1, e: "Soluție de uree 32,5 %." }
];
const SV = { m3d: null };
function porneste3D() {
  const el = $("#motor3d"); if (!el) return;
  import(BAZA_COMUN + "motor3d.js?v=15").then(m => { SV.m3d = m.creeazaStand(el, { varianta: "dci", postTratare: true, interior: true, mod: "transparent", vedere: "gen", aparate: ["obd", "opac", "cilindru"],
    etichete: { rampa: "rampa", senz: "senzor presiune", imv: "IMV", egr: "EGR", dpf: "DOC + DPF", dp: "Δp DPF", egt1: "T1", egt2: "T2", dozare: "dozare AdBlue", nox1: "NOₓ amonte", nox2: "NOₓ aval", scr: "SCR", adblue: "AdBlue", kitRetur: "eprubete retur" }, onSelect: () => {} }); })
    .catch(e => { el.innerHTML = `<p class="nota">Modelul 3D nu a putut fi încărcat (${esc(e.message)}).</p>`; });
}
const CSS = `<style>
.da5-scena #motor3d .m3d { height:clamp(340px, 52vh, 560px); }
.da5-afis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.da5-afis div, .af-grila div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .da5-afis span, .af-grila span { display:block; font-size:.72rem; color:var(--text-sec); } .da5-afis b, .af-grila b { font-size:1.05rem; }
.af-grila { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:.4rem; margin:.4rem 0; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; } .instr svg { width:100%; height:auto; display:block; color:var(--text); }
#cv-osc { width:100%; height:200px; display:block; border-radius:8px; }
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
.sim-grila:fullscreen .da5-scena, .sim-grila.ecran-plin .da5-scena { display:block; }
@media (max-width:900px){ .da5-afis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>`;

Cadru.porneste({
  disc: "DA", nr: 5, cod: "da-l5",
  titlu: "Motorul diesel common rail și sistemele de post-tratare (EGR, DPF, SCR)",
  scurt: "Common rail și post-tratarea",
  subtitlu: "Laborator virtual – standul 1.5 dCi: presiunea din rampă, corecțiile și testul de retur, EGR, regenerarea DPF, SCR și opacitatea, cu testerul X431",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261025); },
  date: [{ k: "LA", et: "L<sub>A</sub> opacimetru [m]", v: 0.43, fix: true }, { k: "z", et: "Numărul de cilindri", v: 4, fix: true }, { k: "kmax", et: "Limita k Euro 6 [m⁻¹]", v: 0.7, fix: true }],
  tabele: [
    { id: "t50", titlu: "Tabelul 5.0. Codurile citite la scanarea inițială", antetRand: "", randuri: [{ k: "c", et: "Coduri (motor + post-tratare)" }], coloane: [{ k: "v", t: "Coduri", intrare: true, text: true }] },
    { id: "t51", titlu: "Tabelul 5.1. Presiunea din rampă", antetRand: "Regim", randuri: [{ k: "pornire", et: "Pornire" }, { k: "ralanti", et: "Ralanti" }, { k: "r2500", et: "2500 rot/min" }],
      coloane: [{ k: "pc", t: "p<sub>cerut</sub> [bar]", intrare: true }, { k: "pr", t: "p<sub>real</sub> [bar]", intrare: true }, { k: "dp", t: "Δp<sub>r</sub> [bar]" }, { k: "concl", t: "Concluzie" }] },
    { id: "t52", titlu: "Tabelul 5.2. Corecțiile de debit și testul de retur", antetRand: "Cilindru", randuri: [1, 2, 3, 4].map(i => ({ k: "c" + i, et: String(i) })),
      coloane: [{ k: "corr", t: "Corecție [mg/cursă]", intrare: true }, { k: "iqa", t: "Cod IQA în ECU", intrare: true, tip: "select", optiuni: ["da", "nu"] }, { k: "V", t: "V<sub>i</sub> [ml] în 2 min", intrare: true }, { k: "r", t: "r<sub>i</sub> [–]" }] },
    { id: "t53", titlu: "Tabelul 5.3. Sistemul EGR", antetRand: "Verificare", randuri: [{ k: "tip", et: "Tip supapă (pneumatică / electrică)" }, { k: "poz", et: "Poziție cerută / reală [%]" }, { k: "ma0", et: "ṁ<sub>a,0</sub> (EGR închis) [kg/h]" }, { k: "maE", et: "ṁ<sub>a,EGR</sub> (EGR deschis) [kg/h]" }, { k: "x", et: "x<sub>EGR</sub> [%]" }],
      coloane: [{ k: "v", t: "Rezultat", intrare: true, text: true }, { k: "obs", t: "Referință / observații" }] },
    { id: "t54", titlu: "Tabelul 5.4. Filtrul de particule", antetRand: "Parametru", randuri: [{ k: "dpC", et: "Δp la contact pus [mbar]" }, { k: "dpR", et: "Δp la ralanti [mbar]" }, { k: "m", et: "Masă de funingine [g]" }, { k: "km", et: "Distanța de la ultima regenerare [km]" }, { k: "T", et: "T înainte / după DPF (max. la regenerare) [°C]" }, { k: "intr", et: "Regenerări întrerupte" }],
      coloane: [{ k: "inainte", t: "Înainte de regenerare", intrare: true, text: true }, { k: "dupa", t: "După regenerare", intrare: true, text: true }, { k: "obs", t: "Observații" }] },
    { id: "t55", titlu: "Tabelul 5.5. Sistemul SCR și opacitatea", antetRand: "Parametru", randuri: [{ k: "noxRu", et: "NOₓ amonte la ralanti [ppm]" }, { k: "noxRd", et: "NOₓ aval la ralanti [ppm]" }, { k: "nox25u", et: "NOₓ amonte la 2500 rot/min [ppm]" }, { k: "nox25d", et: "NOₓ aval la 2500 rot/min [ppm]" }, { k: "doseC", et: "Dozare cerută [ml]" }, { k: "doseM", et: "Dozare măsurată [ml]" }, { k: "conc", et: "Concentrație AdBlue [%]" }, { k: "k1", et: "k accelerarea 1 [m⁻¹]" }, { k: "k2", et: "k accelerarea 2 [m⁻¹]" }, { k: "k3", et: "k accelerarea 3 [m⁻¹]" }],
      coloane: [{ k: "v", t: "Valoare", intrare: true }, { k: "ref", t: "Referință" }, { k: "concl", t: "Concluzie" }] },
    { id: "t56", titlu: "Tabelul 5.6. Diagnosticul defectului ascuns", antetRand: "", randuri: [{ k: "d", et: "Defectul" }], coloane: [{ k: "cauza", t: "Defectul identificat", intrare: true, tip: "select", optiuni: MD.optiuniDiag(), manualEval: true }] }
  ],
  inaltimeGrafic: 280,
  calculeaza: calculeazaDA5,
  intrebari() {
    return [
      { id: "q1", u: "", text: "Raportul maxim r<sub>i</sub> = V<sub>i</sub>/V<sub>med</sub> din testul de retur (Tabelul 5.2):", textSimplu: "r maxim" },
      { id: "q2", u: "%", text: "Rata EGR x<sub>EGR</sub> (relația 5.4, Tabelul 5.3):", textSimplu: "rata EGR" },
      { id: "q3", u: "%", text: "Eficiența SCR la 2500 rot/min (relația 5.5):", textSimplu: "eficiența SCR la 2500 rot/min" },
      { id: "q4", u: "m⁻¹", text: "Coeficientul de absorbție mediu k din cele trei accelerări:", textSimplu: "k mediu" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    if (t.t50.c.v === "") l.push("Tabelul 5.0: codurile");
    RG.forEach(k => { if (t.t51[k].pr === "") l.push(`Tabelul 5.1: ${k}`); });
    if ([1, 2, 3, 4].some(i => t.t52["c" + i].V === "")) l.push("Tabelul 5.2: testul de retur"); if (t.t52.c1.corr === "") l.push("Tabelul 5.2: corecțiile");
    ["ma0", "maE"].forEach(k => { if (t.t53[k].v === "") l.push(`Tabelul 5.3: ${k}`); });
    if (t.t54.dpR.inainte === "") l.push("Tabelul 5.4: înainte de regenerare");
    ["noxRu", "nox25u", "doseM", "conc", "k1", "k2", "k3"].forEach(k => { if (t.t55[k].v === "") l.push(`Tabelul 5.5: ${k}`); });
    if (t.t56.d.cauza === "") l.push("Tabelul 5.6: diagnosticul");
    return l;
  },
  exemplu(D) { const t = D.t; [11, 12, 25, 10.5].forEach((v, i) => { t.t52["c" + (i + 1)].V = String(v); }); t.t53.ma0.v = "32"; t.t53.maE.v = "22"; Object.assign(t.t55.nox25u, { v: "420" }); Object.assign(t.t55.nox25d, { v: "38" }); },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Motorul în autoturism – senzorii și post-tratarea",
    intro: `<p>Pe autoturism, ECU folosește senzorul de presiune diferențială al filtrului de particule, senzorii de temperatură din evacuare și, la Euro 6, senzorii NOₓ. Selectați-i în machetă și urmăriți semnalele.</p>`,
    dupa: `<p class="nota">Macheta este comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "gpf" })
  },
  referat: {
    scop: "Diagnosticarea sistemului common rail (presiunea din rampă, corecțiile, testul de retur) și a sistemelor de post-tratare (EGR, DPF cu regenerarea de service, SCR) și măsurarea opacității.",
    relatii: "Δp<sub>r</sub> = p<sub>cerut</sub> − p<sub>real</sub>; &nbsp; r<sub>i</sub> = V<sub>i</sub>/V<sub>med</sub>; &nbsp; x<sub>EGR</sub> = (ṁ<sub>a,0</sub> − ṁ<sub>a,EGR</sub>)/ṁ<sub>a,0</sub>; &nbsp; η<sub>SCR</sub> = (c<sub>am</sub> − c<sub>av</sub>)/c<sub>am</sub>; &nbsp; k = −ln(1 − N/100)/L<sub>A</sub>.",
    varianta: () => "Motorul propriu fiecărui student: presiunile cerute și reale, corecțiile, retururile, debitul de aer și rata EGR, starea DPF, NOₓ și eficiența SCR, opacitatea și un defect ascuns.",
    indicatii: "Comentați presiunile, corecțiile și retururile, EGR, Δp și funinginea înainte și după regenerare (osciloscopul), NOₓ, dozarea și concentrația AdBlue, opacitatea; justificați diagnosticul defectului ascuns…"
  },
  subsol: "Modelul: presiunea cerută / reală, corecțiile și retururile injectoarelor, EGR electric și debitul de aer, DPF (funingine, Δp proporțional cu debitul de gaze și cu încărcarea, regenerarea de service), SCR (NOₓ, dozare, concentrație), opacitatea (k = −ln(1 − N/100)/L<sub>A</sub>). Fiecare student are motorul propriu și un defect ascuns.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena da5-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="motor3d"><p class="nota">Se încarcă motorul 3D…</p></div>
      <div class="da5-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>Turație [rot/min]</span><b id="af-n">0</b></div><div><span>Lichid [°C]</span><b id="af-T">—</b></div><div><span>p cerută / reală [bar]</span><b id="af-p">—</b></div><div><span>Δp DPF [mbar]</span><b id="af-dp">—</b></div></div>
      <div class="instr" data-panou="x431 retur dpf scr"><h3>Testerul Launch X431</h3><svg id="svg-x431" viewBox="0 0 820 330" role="img" aria-label="Testerul Launch X431"></svg></div>
      <div class="instr" data-panou="retur" hidden><h3>Kitul de retur – eprubetele (vezi și macheta 3D)</h3><div class="af-grila" id="af-ret"></div></div>
      <div class="instr" data-panou="dpf" hidden><h3>Osciloscopul – regenerarea de service (modul roll)</h3><canvas id="cv-osc" aria-label="Osciloscopul în modul roll"></canvas></div>
      <div class="instr" data-panou="scr" hidden><h3>Refractometrul pentru AdBlue și cilindrul gradat</h3><svg id="svg-refr" viewBox="0 0 520 280" role="img" aria-label="Refractometrul"></svg><div class="af-grila" id="af-doza"></div></div>
      <div class="instr" data-panou="opac" hidden><h3>Opacimetrul AVL (vezi și macheta 3D)</h3><div class="af-grila" id="af-opac"></div></div>
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
    reset() { Object.assign(sim, { contact: false, merge: false, pornire: 0, rpm: 0, egrDesch: false }); sim.kit = { montat: false, t: 0, V: [0, 0, 0, 0] }; sim.dpf = { m: null, regen: null, gata: false, km: null, T1max: 0, T2max: 0, ist: [] }; sim.doza = { montat: false, activ: false, t: 0, V: 0 }; },
    cadru(dt0, C, vizibil) {
      const dt = Math.min(0.05, dt0 || 0.016) * (sim.rapid ? 10 : 1), p = P();
      sim.t += dt;
      if (sim.pornire > 0) { sim.pornire -= Math.min(0.05, dt0 || 0.016); if (sim.pornire <= 0) { sim.pornire = 0; sim.merge = true; sim.tReg = 0; } }
      if (sim.merge) { sim.tReg += dt; sim.ect = Math.min(88, sim.ect + dt * 0.05); if (sim.egrDesch) sim.tEgr += dt; }
      // turația: antrenare, regim, accelerare liberă (tăiere la 4800 rot/min)
      let nT = sim.pornire > 0 ? 250 : sim.merge ? (sim.dpf.regen ? 1100 : sim.reg === "r2500" ? 2500 : 800) : 0;
      const O = sim.opac, ta = sim.t - O.tAcc; if (sim.merge && ta >= 0 && ta < 3.5) nT = ta < 0.9 ? 800 + 4000 * ta / 0.9 : ta < 2.5 ? 4800 : 800;
      sim.rpm += (nT - sim.rpm) * (1 - Math.exp(-dt / (nT > sim.rpm ? 0.25 : 0.6)));
      if (sim.merge && ta >= 0 && ta < 3.5) { const r = MD.opacitate(p, O.i), f = ta < 1.2 ? Math.sin(ta / 1.2 * Math.PI / 2) : Math.max(0, 1 - (ta - 1.2) / 1.5); const k = r.k * f; O.k = Math.max(O.k, Math.min(r.k, k)); O.N = 100 * (1 - Math.exp(-r.k * f * 0.43)); }
      else if (!sim.merge) O.N = 0;
      // kitul de retur
      if (sim.kit.montat && sim.merge && sim.reg === "ralanti" && !sim.dpf.regen) { const d = Math.min(dt, Math.max(0, 600 - sim.kit.t)); sim.kit.t += d; sim.kit.V = MD.retur(p, sim.kit.t); }
      // regenerarea de service
      const R = sim.dpf.regen;
      if (R) { R.t += dt; const q = MD.regenerare(p, R.t, R.m0); Object.assign(R, q); sim.dpf.m = q.m; R.faza = R.t < 240 ? "încălzire (post-injecție)" : R.t < 1200 ? "ardere funingine" : "răcire"; sim.dpf.T1max = Math.max(sim.dpf.T1max, q.Tin); sim.dpf.T2max = Math.max(sim.dpf.T2max, q.Tout);
        if (!sim.dpf.ist.length || R.t - sim.dpf.ist[sim.dpf.ist.length - 1].t >= 2) sim.dpf.ist.push({ t: R.t, Tin: q.Tin, Tout: q.Tout, m: q.m });
        if (R.t >= 1380) { sim.dpf.regen = null; sim.dpf.gata = true; sim.dpf.km = 0; C.mesajTemporar("Regenerarea de service s-a încheiat cu succes.", "ok"); } }
      // testul de dozare
      if (sim.doza.activ) { const d = Math.min(dt, 120 - sim.doza.t); sim.doza.t += d; sim.doza.V = p.doza * sim.doza.t / 120; if (sim.doza.t >= 120) sim.doza.activ = false; }
      if (SV.m3d) { const q = presiuneLive(), L = liniiX431();
        SV.m3d.seteaza({ rpm: sim.rpm, ect: sim.ect, tps: sim.merge && (sim.reg === "r2500" || (ta >= 0 && ta < 2.5)) ? 40 : 0, tEv: R ? R.Tin : tEv1(), eticheteVizibile: true,
          cr: { p: q.pr, imv: 50, n: sim.rpm, merge: sim.merge, antrenare: sim.pornire > 0, contact: sim.contact, kit: { vizibil: sim.kit.montat, V: sim.kit.V, max: 30 } },
          post: { Tdpf: R ? R.Tin : tEv1(), funingine: Math.min(1, funin() / 40), egr: sim.egrDesch && sim.merge ? MD.egr(p, true).pozR / 100 : 0, doza: sim.merge && cald() && !sim.doza.montat || sim.doza.activ, merge: sim.merge || sim.doza.activ },
          aparate: { obd: { titlu: L.titlu, linii: (L.linii || []).slice(0, 5).map(([a, b, c]) => [a.slice(0, 22), b, c]) }, opac: { vizibil: true, sonda: O.sonda, N: O.N, k: O.k, mesaj: O.i ? `accelerarea ${O.i}` : "" }, cil: { vizibil: sim.doza.montat, V: sim.doza.V, max: 120 } } }); }
      if (!vizibil) return;
      const now = performance.now();
      if (now - (this._td || 0) > 200) { this._td = now; deseneaza(); const d = $("#af-doza"); if (d) d.innerHTML = `<div><span>Cilindrul gradat</span><b>${sim.doza.montat ? fx(Math.round(sim.doza.V), 0) + " ml" : "—"}</b></div><div><span>Test dozare</span><b>${sim.doza.activ ? fx(sim.doza.t, 0) + "/120 s" : sim.doza.t >= 120 ? "încheiat" : "—"}</b></div><div><span>Refractometru</span><b>${sim.refr != null ? fx(sim.refr, 1) + " %" : "—"}</b></div>`; }
      if (now - (this._ts || 0) > 300) { this._ts = now; actualizeazaPasi(); C.stare(1, sim.pornire > 0 ? "antrenare" : sim.merge ? `motor pornit – ${sim.dpf.regen ? "regenerare" : sim.reg === "r2500" ? "≈ 2500 rot/min" : "ralanti"}` : sim.contact ? "contact pus" : "contact luat", sim.merge ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { deseneaza(); },
    formule() {
      const r = [], q = presiuneLive();
      if (sim.merge) r.push(["Abaterea presiunii (5.1)", `Δp<sub>r</sub> = ${q.pc} − ${q.pr} = <span class="rez">${q.pc - q.pr} bar</span>`]);
      if (sim.opac.k > 0) r.push(["Opacitatea (5.6)", `k = −ln(1 − ${fx(sim.opac.N, 1)}/100)/0,43 = <span class="rez">${fx(-Math.log(1 - sim.opac.N / 100) / 0.43, 2)} m⁻¹</span>`]);
      return r;
    }
  }
});
