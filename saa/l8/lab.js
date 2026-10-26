/* SAA – Lucrarea 8. Sistemul de climatizare și pompa de căldură – determinarea parametrilor de funcționare.
   Simulator: standul 3D cu instalația de climatizare cu TXV (compresorul cu ambreiaj, condensatorul cu electroventilator, filtrul
   deshidrator, supapa de destindere, carcasa HVAC cu evaporatorul și suflanta, panoul de bord), setul manometric cu scalele de temperatură
   ale agentului, termometrele cu clemă, sonda din gura de ventilație, termohigrometrul, detectorul de scurgeri și stația de
   recuperare–vidare–încărcare. Fiecare student are agentul, condițiile ambiante și o stare a instalației de diagnosticat.
   Tabul „Animație” arată circuitul și ciclul p–h: climatizare (TXV / orificiu calibrat), pompă de căldură, R744. */
"use strict";
const MD = MODELE["saa-l8"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea */
const sim = {
  t: 0, rapid: 1, ochelari: false, manusi: false, ventilat: false, comp: {}, transparent: false,
  merge: false, n: 0, nT: 0, ac: false, fan: 0, recirc: false, usi: true, conectat: false, robinete: false, clame: false, sondaGura: false,
  st: null, tReg: 0, regAnt: "", det: 0, verif: {}, statie: null, tSt: 0
};
const NREG = { st: "static", n2000: "2000 rot/min", ral: "ralanti, ventilator max.", vmin: "ralanti, ventilator min." };
/** regimul curent (cheia din Tabelul 8.1) sau null dacă condițiile nu corespund */
function regimCurent() {
  if (!sim.merge) return "st";
  if (!sim.ac || !sim.recirc) return null;
  if (Math.abs(sim.nT - 2000) < 1 && sim.fan === 4) return "n2000";
  if (sim.nT < 1000 && sim.fan === 4) return "ral";
  if (sim.nT < 1000 && sim.fan === 1) return "vmin";
  return null;
}
/** echilibrul: pentru regimurile din tabel – modelul; altfel (A/C oprit) presiunile se egalizează spre cea statică */
function echilibru() { const k = regimCurent(); if (k) return MD.regim(P(), k); return MD.regim(P(), "st"); }
function stabil() { const k = regimCurent(); if (!k || !sim.st) return false; const e = echilibru(), tMin = k === "st" ? 60 : k === "n2000" ? 300 : 120;
  return sim.tReg >= tMin && ["pJP", "pIP"].every(c => Math.abs(sim.st[c] - e[c]) < 0.01) && ["Tlic", "Tasp", "Tgura"].every(c => Math.abs(sim.st[c] - e[c]) < 0.03); }
function citiri() { const s = sim.st || MD.regim(P(), "st"); return { pJP: Math.round(s.pJP * 20) / 20, pIP: Math.round(s.pIP * 10) / 10, Tlic: Math.round(s.Tlic * 10) / 10, Tasp: Math.round(s.Tasp * 10) / 10, Tgura: Math.round(s.Tgura * 10) / 10, Tev: s.Tev }; }

/* ------------------------------------------------------------------ componentele */
const COMP = {
  compresor: ["Compresorul", "Aspiră vapori la JP și îi refulează la ÎP (1–2); cu piston axial și disc oscilant, cu cilindree variabilă."],
  ambreiaj: ["Ambreiajul electromagnetic", "Cuplează compresorul la fulia antrenată de curea când se apasă A/C (la compresoarele fără ambreiaj – supapa de control)."],
  condensator: ["Condensatorul", "În fața radiatorului: agentul cedează căldura aerului și se lichefiază (2–3)."],
  ventilatorCond: ["Electroventilatorul condensatorului", "Asigură debitul de aer prin condensator la viteză mică și la ralanti."],
  deshidrator: ["Filtrul deshidrator", "Reține umiditatea (desicant) și impuritățile; rezervor de lichid înainte de TXV."],
  txv: ["Supapa de destindere (TXV)", "Reduce presiunea (3–4) și dozează agentul după temperatura vaporilor la ieșirea evaporatorului."],
  evaporator: ["Evaporatorul", "În carcasa HVAC: agentul se vaporizează preluând căldura aerului (4–1); aerul se răcește și se usucă."],
  suflanta: ["Suflanta habitaclului", "Ventilatorul radial al carcasei HVAC – treptele de turație."],
  racordL: ["Racordul de service L", "Joasă presiune (aspirația), capac albastru, diametru mai mare – nu se poate inversa cu H."],
  racordH: ["Racordul de service H", "Înaltă presiune (lichidul), capac roșu."],
  senzorP: ["Senzorul de presiune ÎP", "Protejează instalația (presiune prea mică / prea mare) și comandă electroventilatorul."],
  eticheta: ["Eticheta instalației", "Tipul agentului frigorific, cantitatea de încărcare și uleiul."],
  condJP: ["Conducta de aspirație (JP)", "Vapori reci evaporator → compresor; aici se măsoară T asp."],
  condIP: ["Conductele de înaltă presiune", "Refularea (gaz fierbinte) și conducta de lichid; pe conducta de lichid se măsoară T lic."]
};
const NCOMP = Object.keys(COMP).length, MINCOMP = 8;
function alegeComp(k, et) { if (!COMP[k]) { if (et) $("#comp-desc").innerHTML = esc(et); return; } sim.comp[k] = true; $("#comp-desc").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}${et ? `<br><span class="nota">${esc(et)}</span>` : ""}`; actualizeazaPasi(); }

/* ------------------------------------------------------------------ pașii */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const PCT = { 1: "racordul L", 2: "racordul H", 3: "compresorul (garnitura arborelui)", 4: "condensatorul" };
const PASI = [
  { t: "Identificarea, NSSM și agentul", tab: "Tabelul 8.4 – agentul", vedere: "tot",
    instr: ["NSSM: ochelari și mănuși obligatorii (agentul lichid produce degerături); fără flacără deschisă – R1234yf este ușor inflamabil (A2L); spațiu ventilat. Recuperarea și încărcarea – numai de personalul atestat (demonstrativ).",
      `Identificați pe stand componentele din Fig. 8.1 (minimum ${MINCOMP}) și citiți tipul agentului de pe eticheta instalației.`],
    ver: () => [[sim.ochelari && sim.manusi, "ochelari și mănuși"], [sim.ventilat, "spațiu ventilat, fără flacără deschisă"], [Object.keys(sim.comp).length >= MINCOMP, `componente identificate: ${Object.keys(sim.comp).length}/${NCOMP} (minimum ${MINCOMP})`], [!!sim.comp.eticheta, "eticheta agentului citită"]],
    prog: () => (sim.ochelari && sim.manusi && sim.ventilat ? 1 : 0) + (Object.keys(sim.comp).length >= MINCOMP ? 1 : 0) + (pe("t84", "ag", "v") ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-och"> Ochelari</label><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși</label><label class="bifa"><input type="checkbox" id="ck-vent"> Ventilat, fără flacără</label></div>
      <div class="rand-butoane"><button type="button" data-v="eticheta">Eticheta agentului</button><button type="button" data-v="comp">Compresorul</button><button type="button" data-v="bord">Peretele și bordul</button></div>`,
    buton: ["● Agentul (eticheta) → Tabelul 8.4", e => inregAg(e)] },
  { t: "Setul manometric și presiunea statică", tab: "Tabelele 8.1 (static) și 8.4", vedere: "man",
    instr: ["Cu motorul oprit și robinetele setului închise, cuplați furtunul albastru la racordul L și pe cel roșu la racordul H. Montați termometrele cu clemă pe conducta de lichid (T lic) și pe aspirație (T asp) și sonda în gura de ventilație centrală.",
      "Notați presiunea statică (echilibrul la temperatura mediului) și condițiile: temperatura și umiditatea aerului ambiant, temperatura aerului din habitaclu (intrarea în HVAC, recirculare)."],
    ver: () => [[!sim.merge, "motor oprit"], [!sim.robinete, "robinetele setului închise"], [sim.conectat, "setul cuplat la L și H"], [sim.clame && sim.sondaGura, "termometrele cu clemă și sonda montate"], [regimCurent() === "st" && stabil(), "presiunea egalizată"]],
    prog: () => (pe("t81", "st", "pJP") ? 1 : 0) + ["ta", "rh", "tin"].filter(k => pe("t84", k, "v")).length, tot: 4,
    ctl: `<div class="rand-butoane"><button type="button" id="b-set">Cuplează setul manometric (L, H)</button><button type="button" id="b-clame">Montează termometrele</button></div>
      <div class="rand-butoane"><button type="button" class="primar" id="b-rst">● Presiunea statică → Tabelul 8.1</button><button type="button" id="b-amb">● Condițiile → Tabelul 8.4</button></div>` },
  { t: "Funcționare la 2000 rot/min", tab: "Tabelul 8.1 – 2000 rot/min", vedere: "man", panou: "gr",
    instr: ["Porniți motorul, turația 2000 rot/min (1500…2000); climatizarea la răcire maximă, recirculare, suflanta în treapta maximă, ușile închise.",
      "Așteptați stabilizarea (5 minute) și notați presiunile JP și ÎP, T lic, T asp și T gură."],
    ver: () => [[sim.merge && Math.abs(sim.nT - 2000) < 1, "motor la 2000 rot/min"], [sim.ac && sim.recirc && sim.fan === 4, "A/C, recirculare, suflanta treapta 4"], [sim.usi, "ușile închise"], [regimCurent() === "n2000" && sim.tReg >= 300, `stabilizare: ${regimCurent() === "n2000" ? Math.min(300, Math.floor(sim.tReg)) : 0}/300 s`]],
    prog: () => pe("t81", "n2000", "pJP") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><button type="button" class="primar" id="b-porn">Pornește motorul</button><button type="button" id="b-stop">Oprește motorul</button></div>
      <div class="rand-butoane"><button type="button" data-n="2000">2000 rot/min</button><button type="button" data-n="ral">ralanti</button><button type="button" id="b-ac">A/C</button><button type="button" id="b-rec">Recirculare</button></div>
      <div class="rand-butoane"><span class="nota">Suflanta:</span>${[0, 1, 2, 3, 4].map(f => `<button type="button" data-fan="${f}">${f}</button>`).join("")}<label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>`,
    buton: ["● Regimul → Tabelul 8.1", e => inregR(e)] },
  { t: "Ralanti – suflanta maximă și minimă", tab: "Tabelul 8.1 – ralanti", vedere: "man", panou: "gr",
    instr: ["Reduceți turația la ralanti (suflanta în treapta 4), așteptați stabilizarea (2 minute) și notați valorile.", "Treceți suflanta în treapta 1, așteptați din nou și notați valorile: evaporatorul primește mai puțin aer – presiunea JP și T gură scad."],
    ver: () => [[sim.merge && sim.nT < 1000, "motor la ralanti"], [sim.ac && sim.recirc, "A/C, recirculare"], [regimCurent() === "ral" || regimCurent() === "vmin", regimCurent() ? `regim: ${NREG[regimCurent()]}` : "suflanta în treapta 4 sau 1"], [stabil(), `stabilizare: ${Math.min(120, Math.floor(sim.tReg))}/120 s`]],
    prog: () => ["ral", "vmin"].filter(k => pe("t81", k, "pJP")).length, tot: 2,
    ctl: `<div class="rand-butoane"><button type="button" data-n="ral">ralanti</button><span class="nota">Suflanta:</span>${[1, 4].map(f => `<button type="button" data-fan="${f}">${f}</button>`).join("")}<label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>`,
    buton: ["● Regimul → Tabelul 8.1", e => inregR(e)] },
  { t: "Etanșeitatea – detectorul de scurgeri", tab: "Tabelul 8.4 – scurgerea", vedere: "comp",
    instr: ["Opriți motorul. Treceți încet sonda detectorului electronic (≈ 2…3 cm/s, sub punct – agentul este mai greu decât aerul) pe la racordurile L și H, garnitura arborelui compresorului și condensator.", "Înregistrați rezultatul în Tabelul 8.4."],
    ver: () => [[!sim.merge, "motor oprit"], [Object.keys(sim.verif).length === 4, `puncte verificate: ${Object.keys(sim.verif).length}/4`]],
    prog: () => pe("t84", "scurg", "v") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane">${Object.keys(PCT).map(j => `<button type="button" data-det="${j}">${PCT[j]}</button>`).join("")}</div><p class="nota" id="det-rez"></p>`,
    buton: ["● Rezultatul verificării → Tabelul 8.4", e => inregLeak(e)] },
  { t: "Deconectarea, stația și diagnosticul", tab: "Tabelul 8.4 – cauza", vedere: "statie",
    instr: ["Motorul oprit, robinetele închise: decuplați setul manometric și puneți capacele racordurilor.", "Urmăriți demonstrația stației automate: recuperarea (cântărirea agentului recuperat), vidarea, testul de vid, uleiul / trasorul, încărcarea cu masa de pe etichetă.", "Comparați presiunile, ΔT<sub>si</sub>, ΔT<sub>sr</sub> și T gură cu Tabelul 8.3 și alegeți starea instalației."],
    ver: () => [[!sim.conectat, "setul manometric decuplat"], [sim.statie && sim.statie.i >= 5, "demonstrația stației"]],
    prog: () => pe("t84", "cauza", "v") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><button type="button" id="b-st">Demonstrația stației (program automat)</button></div>
      <label class="camp">Starea instalației <select id="sel-diag"><option value=""></option>${MD.optiuniDiag().map(o => `<option>${o}</option>`).join("")}</select></label>`,
    buton: ["● Diagnosticul → Tabelul 8.4", e => inregDiag(e)] }
];
let pasActiv = 0;
const VEDERI = { tot: [[1.7, 1.15, 1.75], [0.0, 0.05, 0.1]], man: [[1.45, 0.85, 1.2], [0.5, 0.3, 0.25]], comp: [[1.0, 0.4, 0.75], [0.25, 0.0, 0.2]], bord: [[0.35, 0.85, 1.6], [0.1, 0.35, 0.72]], eticheta: [[0.05, 0.8, -1.45], [-0.15, 0.2, -0.86]], statie: [[-0.5, 0.55, 1.75], [-1.15, -0.15, 0.55]] };
function vedere3d(v) { if (SV.s3 && VEDERI[v]) SV.s3.vedere(...VEDERI[v]); }
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
  $$(".instr[data-panou='gr']").forEach(el => el.hidden = p.panou !== "gr");
  vedere3d(p.vedere); actualizeazaPasi(); deseneaza();
}

/* ------------------------------------------------------------------ comenzile */
function on(sel, f) { $$(sel).forEach(b => b.addEventListener("click", f)); }
function msg(t) { $("#msg-inreg").textContent = t; }
function legaComenzi() {
  $("#ck-och").addEventListener("change", e => { sim.ochelari = e.target.checked; actualizeazaPasi(); }); $("#ck-man").addEventListener("change", e => { sim.manusi = e.target.checked; actualizeazaPasi(); });
  $("#ck-vent").addEventListener("change", e => { sim.ventilat = e.target.checked; actualizeazaPasi(); });
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked ? 10 : 1; $$(".ck-rapid").forEach(x => x.checked = e.target.checked); }));
  $$("#pasi [data-v]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v)));
  on("#b-set", () => { if (sim.merge) return Cadru.mesajTemporar("NSSM: setul manometric se cuplează și se decuplează numai cu motorul oprit.", "pericol"); if (!sim.ochelari || !sim.manusi) return Cadru.mesajTemporar("NSSM: ochelari și mănuși.", "pericol");
    sim.conectat = !sim.conectat; Cadru.mesajTemporar(sim.conectat ? "Setul manometric cuplat (robinetele închise): L – albastru, H – roșu." : "Setul decuplat; capacele racordurilor montate.", ""); });
  on("#b-clame", () => { sim.clame = !sim.clame; sim.sondaGura = sim.clame; });
  on("#b-rst", e => inregR(e)); on("#b-amb", e => inregAmb(e));
  on("#b-porn", () => { if (!sim.ochelari) return Cadru.mesajTemporar("NSSM: ochelari și mănuși (pasul 1).", "atentie"); if (sim.merge) return; sim.merge = true; sim.nT = 800; Cadru.mesajTemporar("Motorul a pornit (ralanti).", "ok"); });
  on("#b-stop", () => { sim.merge = false; sim.nT = 0; });
  $$("[data-n]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); sim.nT = b.dataset.n === "ral" ? 800 : 2000; }));
  on("#b-ac", () => { sim.ac = !sim.ac; if (sim.ac && sim.fan === 0) sim.fan = 2; }); on("#b-rec", () => { sim.recirc = !sim.recirc; });
  $$("[data-fan]").forEach(b => b.addEventListener("click", () => { sim.fan = +b.dataset.fan; if (sim.fan === 0) sim.ac = false; }));
  $$("[data-det]").forEach(b => b.addEventListener("click", () => { if (sim.merge) return Cadru.mesajTemporar("Verificarea se face cu motorul oprit (fără curenți de aer de la ventilatoare).", "atentie");
    const j = +b.dataset.det, L = MD.scurgere(P(), j); sim.det = j; sim.verif[j] = L ? "Da" : "Nu"; vedere3d("comp");
    $("#det-rez").innerHTML = Object.keys(sim.verif).map(k => `${PCT[k]}: <b style="color:${sim.verif[k] === "Da" ? "#c62828" : "#2e9e44"}">${sim.verif[k] === "Da" ? "ALARMĂ – scurgere" : "fără semnal"}</b>`).join(" · "); }));
  on("#b-st", () => { if (sim.conectat) return Cadru.mesajTemporar("Decuplați întâi setul manometric (motorul oprit, robinetele închise).", "atentie"); if (sim.merge) return Cadru.mesajTemporar("Opriți motorul.", "atentie"); sim.statie = { i: 0, txt: "", sub: "" }; sim.tSt = 0; vedere3d("statie"); });
}

/* ------------------------------------------------------------------ înregistrările */
function inregAg(e) {
  if (!sim.comp.eticheta) return Cadru.mesajTemporar("Citiți întâi eticheta agentului (clic pe ea, pe traversa din față).", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "ag", v: P().ag }, celule: [{ t: "t84", r: "ag", c: "v", v: P().ag }] }); if (ok) msg(`Tabelul 8.4: agentul ${P().ag} (${P().masa} g).`);
}
function inregR(e) {
  if (!sim.conectat) return Cadru.mesajTemporar("Cuplați setul manometric.", "atentie"); if (!sim.clame) return Cadru.mesajTemporar("Montați termometrele cu clemă și sonda din gura de ventilație.", "atentie");
  const k = regimCurent(); if (!k) return Cadru.mesajTemporar("Condițiile nu corespund unui regim din Tabelul 8.1 (A/C, recirculare, turația, treapta suflantei).", "atentie");
  if (!sim.usi) return Cadru.mesajTemporar("Ușile închise.", "atentie");
  if (!stabil()) return Cadru.mesajTemporar("Valorile nu s-au stabilizat încă.", "atentie");
  const c = citiri(), cel = [["pJP", c.pJP.toFixed(2)], ["pIP", c.pIP.toFixed(1)], ["Tlic", c.Tlic.toFixed(1)], ["Tasp", c.Tasp.toFixed(1)], ["Tgura", c.Tgura.toFixed(1)]].map(([x, v]) => ({ t: "t81", r: k, c: x, v }));
  const ok = Cadru.inregistreaza(e, { log: { m: "r", k, pJP: c.pJP, pIP: c.pIP, Tlic: c.Tlic, Tasp: c.Tasp, Tgura: c.Tgura }, celule: cel });
  if (ok) msg(`Tabelul 8.1 (${NREG[k]}): p JP ${fx(c.pJP, 2)} bar, p ÎP ${fx(c.pIP, 1)} bar, T lic ${fx(c.Tlic, 1)}, T asp ${fx(c.Tasp, 1)}, T gură ${fx(c.Tgura, 1)} °C.`);
}
function inregAmb(e) {
  const pr = P(), Tin = Math.round((pr.Ta + pr.dTin) * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "amb", Ta: pr.Ta, RH: pr.RH, Tin }, celule: [{ t: "t84", r: "ta", c: "v", v: pr.Ta.toFixed(1) }, { t: "t84", r: "rh", c: "v", v: String(pr.RH) }, { t: "t84", r: "tin", c: "v", v: Tin.toFixed(1) }] });
  if (ok) msg(`Tabelul 8.4: aer ambiant ${fx(pr.Ta, 1)} °C, ${pr.RH} % umiditate; aerul din habitaclu (intrarea în HVAC) ${fx(Tin, 1)} °C.`);
}
function inregLeak(e) {
  if (Object.keys(sim.verif).length < 4) return Cadru.mesajTemporar("Verificați toate cele 4 puncte.", "atentie");
  const j = Object.keys(sim.verif).find(k => sim.verif[k] === "Da"), v = j ? MD.LOC[+j] : MD.LOC[0];
  const ok = Cadru.inregistreaza(e, { log: Object.keys(sim.verif).map(k => ({ m: "leak", j: +k, v: sim.verif[k] })), celule: [{ t: "t84", r: "scurg", c: "v", v }] }); if (ok) msg(`Tabelul 8.4: ${v}.`);
}
function inregDiag(e) { const v = $("#sel-diag").value; if (!v) return Cadru.mesajTemporar("Alegeți starea instalației.", "atentie"); const ok = Cadru.inregistreaza(e, { log: { m: "diag", v }, celule: [{ t: "t84", r: "cauza", c: "v", v }] }); if (ok) msg(`Tabelul 8.4: ${v}.`); }

/* ------------------------------------------------------------------ afișaje */
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (sel, on, t1, t0) => $$(sel).forEach(b => { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); });
  s("#b-set", sim.conectat, "Decuplează setul manometric", "Cuplează setul manometric (L, H)"); s("#b-clame", sim.clame, "Demontează termometrele", "Montează termometrele");
  s("#b-ac", sim.ac, "A/C: pornit", "A/C: oprit"); s("#b-rec", sim.recirc, "Recirculare: da", "Recirculare: nu");
  $$("[data-n]").forEach(b => b.classList.toggle("activ", sim.merge && ((b.dataset.n === "ral" && sim.nT < 1000) || (b.dataset.n === "2000" && sim.nT === 2000))));
  $$("[data-fan]").forEach(b => b.classList.toggle("activ", +b.dataset.fan === sim.fan));
  const c = citiri(), k = regimCurent();
  $("#af-st").textContent = sim.merge ? `${Math.round(sim.n / 10) * 10} rot/min` : "oprit"; $("#af-reg").textContent = k ? NREG[k] : "—";
  $("#af-jp").textContent = sim.conectat ? fx(c.pJP, 2) + " bar" : "—"; $("#af-ip").textContent = sim.conectat ? fx(c.pIP, 1) + " bar" : "—";
  $("#af-tl").textContent = sim.clame ? fx(c.Tlic, 1) + " °C" : "—"; $("#af-ta").textContent = sim.clame ? fx(c.Tasp, 1) + " °C" : "—"; $("#af-tg").textContent = sim.sondaGura ? fx(c.Tgura, 1) + " °C" : "—";
  $("#af-amb").textContent = `${fx(P().Ta, 1)} °C · ${P().RH} %`;
}
const ISTORIC = [];
function deseneaza() {
  const cv = $("#cv-gr"); if (!cv || !cv.getClientRects().length) return;
  const h = ISTORIC, t0 = h.length ? h[h.length - 1][0] - 600 : 0;
  deseneazaGrafic(cv, { xmin: 0, xmax: 10, ymin: 0, ymax: 20, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 4, 8, 12, 16, 20], xlab: "t [min] (ultimele 10 min)", ylab: "p [bar rel.]",
    serii: [{ tip: "linie", pts: h.map(p => [(p[0] - t0) / 60, p[2]]), culoare: 3, gros: 1.6 }, { tip: "linie", pts: h.map(p => [(p[0] - t0) / 60, p[1] * 4]), culoare: 0, gros: 1.6 }] });
}

/* ------------------------------------------------------------------ 3D */
const SV = { s3: null };
function porneste3D() {
  const el = $("#st3d"); if (!el) return;
  import(BAZA_COMUN + "clima3d.js?v=1").then(m => { SV.s3 = m.creeazaStandClima(el, { psat: MD.psat, laClic: (k, et) => alegeComp(k, et) }); vedere3d(PASI[pasActiv].vedere); })
    .catch(e => { el.innerHTML = `<p class="nota">Standul 3D nu a putut fi încărcat (${esc(e.message)}): este necesar un browser cu WebGL. Componentele se pot alege din listă:</p><div class="rand-butoane">${Object.keys(COMP).map(k => `<button type="button" data-c3="${k}">${COMP[k][0]}</button>`).join("")}</div>`; $$("#st3d [data-c3]").forEach(b => b.addEventListener("click", () => alegeComp(b.dataset.c3))); });
}
function actualizeaza3D() {
  if (!SV.s3) return; const c = citiri(), pr = P();
  SV.s3.seteaza({ n: sim.n, ac: sim.ac, fan: sim.fan, recirc: sim.recirc, conectat: sim.conectat, clame: sim.clame, sondaGura: sim.sondaGura, pJP: c.pJP, pIP: c.pIP, Tlic: c.Tlic, Tasp: c.Tasp, Tgura: c.Tgura, Tev: c.Tev,
    Ta: pr.Ta, RH: pr.RH, ag: pr.ag, masa: pr.masa, det: sim.det && pasActiv === 4 ? sim.det : 0, detLeak: sim.det ? MD.scurgere(pr, sim.det) : false, statie: sim.statie });
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaSAA8(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), F = Number.isFinite, cel = { t81: {}, t84: {} }, rele = { t81: {} };
  MD.REG.forEach(([k]) => { const r = o.rand[k]; if (!r) return; cel.t81[k] = { TsJP: F(r.TsJP) ? fx(r.TsJP, 1) : "", TsIP: F(r.TsIP) ? fx(r.TsIP, 1) : "", SH: F(r.SH) ? fx(r.SH, 1) : "", SC: F(r.SC) ? fx(r.SC, 1) : "" };
    if (k !== "st") rele.t81[k] = { SH: F(r.SH) && (r.SH < 3 || r.SH > 8), SC: F(r.SC) && (r.SC < 5 || r.SC > 12) }; });
  const r = (o.rand || {}).n2000 || {}, rez = [
    ["Agentul frigorific (Tabelul 8.4)", o.ag || "—"],
    ["2000 rot/min: T<sub>sat</sub>(p<sub>JP</sub>), T<sub>sat</sub>(p<sub>ÎP</sub>) – Tabelul 8.2", F(r.TsJP) ? `${fx(r.TsJP, 1)} °C; ${fx(r.TsIP, 1)} °C` : "—"],
    ["2000 rot/min: ΔT<sub>si</sub> = T<sub>asp</sub> − T<sub>sat</sub>(p<sub>JP</sub>) (8.1)", F(r.SH) ? `<span style="color:var(--accent)">${fx(r.SH, 1)} K</span>` : "—"],
    ["2000 rot/min: ΔT<sub>sr</sub> = T<sub>sat</sub>(p<sub>ÎP</sub>) − T<sub>lic</sub> (8.2)", F(r.SC) ? `<span style="color:var(--accent)">${fx(r.SC, 1)} K</span>` : "—"],
    ["2000 rot/min: ΔT<sub>aer</sub> = T<sub>intrare</sub> − T<sub>gură</sub>", F(r.dAer) ? `${fx(r.dAer, 1)} K` : "—"],
    ["T<sub>cond</sub> − T<sub>amb</sub> (2000 rot/min)", F(r.TsIP) && F(num(t.t84.ta.v)) ? `${fx(r.TsIP - num(t.t84.ta.v), 1)} K (uzual 12…20 K)` : "—"]];
  const verdicte = [];
  if (F(r.SH) && F(r.SC)) {
    verdicte.push(r.SH >= 3 && r.SH <= 8 ? { tip: "ok", text: `ΔT<sub>si</sub> = ${fx(r.SH, 1)} K – în domeniul 3…8 K.` } : { tip: "atentie", text: `ΔT<sub>si</sub> = ${fx(r.SH, 1)} K – în afara domeniului 3…8 K${r.SH > 8 ? " (agent insuficient în evaporator)" : " (risc de lichid la aspirație)"}.` });
    verdicte.push(r.SC >= 5 && r.SC <= 12 ? { tip: "ok", text: `ΔT<sub>sr</sub> = ${fx(r.SC, 1)} K – în domeniul 5…12 K.` } : { tip: "atentie", text: `ΔT<sub>sr</sub> = ${fx(r.SC, 1)} K – ${r.SC > 12 ? "prea mare (agent în exces în condensator)" : "prea mică (lichid insuficient)"}.` });
  }
  const tg = num(t.t81.n2000.Tgura); if (F(tg)) verdicte.push(tg <= 10 ? { tip: "ok", text: `T gură = ${fx(tg, 1)} °C – răcire corespunzătoare (4…10 °C).` } : { tip: "atentie", text: `T gură = ${fx(tg, 1)} °C – răcire insuficientă.` });
  const bare = MD.REG.filter(([k]) => k !== "st").map(([k], i) => [i + 1, num(t.t81[k].pJP), num(t.t81[k].pIP)]);
  const serii = [{ tip: "bare", pts: bare.filter(b => F(b[1])).map(b => [b[0] - 0.15, b[1] * 4]), culoare: 0, lat: 0.28 }, { tip: "bare", pts: bare.filter(b => F(b[2])).map(b => [b[0] + 0.15, b[2]]), culoare: 3, lat: 0.28 }];
  return { celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Presiunile JP (×4) și ÎP în cele trei regimuri de funcționare",
    grafic: { xmin: 0.4, xmax: 3.6, ymin: 0, ymax: 24, xticks: [1, 2, 3], xetichete: ["2000 rot/min", "ralanti", "ralanti, sufl. min."], yticks: [0, 4, 8, 12, 16, 20, 24], xlab: "regim", ylab: "p [bar rel.]", serii },
    legenda: [["p JP × 4", "var(--serie-0)"], ["p ÎP", "var(--serie-3)"]], principal: { eticheta: "ΔT supraîncălzire [K]", valoare: F(r.SH) ? +r.SH.toFixed(1) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const T82 = `<table class="tabel-ref"><caption>Tabelul 8.2. Temperaturi de saturație (valori rotunjite, presiune absolută)</caption><tr><th>T<sub>sat</sub> [°C]</th>${MD.TS.map(t => `<th>${String(t).replace("-", "−")}</th>`).join("")}</tr>
  ${["R134a", "R1234yf"].map(a => `<tr><th>${a} [bar abs]</th>${MD.PS[a].map(p => `<td>${fmt(p, 1)}</td>`).join("")}</tr>`).join("")}</table>`;
const T83 = `<table class="tabel-ref"><caption>Tabelul 8.3. Diagnoza după presiuni (orientativ)</caption><tr><th>p<sub>JP</sub></th><th>p<sub>ÎP</sub></th><th>ΔT<sub>si</sub>; ΔT<sub>sr</sub></th><th>Cauză probabilă</th></tr>
  <tr><td>scăzută</td><td>scăzută</td><td>ΔT<sub>si</sub> mare, ΔT<sub>sr</sub> mică</td><td>încărcare insuficientă, scurgere</td></tr><tr><td>ridicată</td><td>ridicată</td><td>ΔT<sub>sr</sub> mare</td><td>supraîncărcare, condensator colmatat, ventilator defect</td></tr>
  <tr><td>ridicată</td><td>scăzută</td><td>–</td><td>compresor uzat, supapa de control a compresorului</td></tr><tr><td>foarte scăzută</td><td>normală / scăzută</td><td>ΔT<sub>si</sub> foarte mare</td><td>supapă de destindere sau filtru obturat, umiditate înghețată</td></tr></table>`;
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Agentul frigorific lichid produce degerături la contactul cu pielea și leziuni oculare: se poartă obligatoriu ochelari de protecție și mănuși; nu se îndreaptă racordurile spre persoane.</li>
<li>Eliberarea agenților frigorifici în atmosferă este interzisă. Recuperarea, vidarea și încărcarea se fac numai de personal atestat conform legislației privind gazele fluorurate (Regulamentul (UE) 2024/573); studenții participă numai demonstrativ.</li>
<li>R1234yf este ușor inflamabil (clasa A2L), iar la ardere poate forma acid fluorhidric: se interzic flacăra deschisă și fumatul în zonă; se lucrează în spațiu ventilat.</li>
<li>Instalațiile cu R744 (CO₂) funcționează la presiuni de peste 100 bar: pe acestea nu se intervine în laborator.</li>
<li>Setul manometric se conectează și se deconectează cu motorul oprit, cu robinetele setului închise; furtunurile se țin departe de ventilator, curea și colectorul de evacuare.</li></ul></div>
<h2>8.1. Scopul lucrării</h2>
<p>Măsurarea presiunilor și temperaturilor din instalația de climatizare, determinarea supraîncălzirii și subrăcirii și diagnoza pe baza acestora. Se studiază agenții frigorifici actuali (R134a, R1234yf, R744), pompa de căldură și procedura de recuperare și încărcare.</p>
<h2>8.2. Noțiuni teoretice</h2>
<p>Instalația de climatizare funcționează după un ciclu frigorific cu comprimare de vapori: compresorul aspiră vapori la joasă presiune (JP) și îi refulează la înaltă presiune (ÎP) (1–2); în condensator agentul cedează căldură și se lichefiază (2–3); supapa de destindere (TXV) sau orificiul calibrat reduce presiunea (3–4); în evaporator agentul preia căldură din aerul habitaclului și se vaporizează (4–1). Circuitul și ciclul p–h al fiecărei variante se urmăresc în tabul „Animație”.</p>
<p>Supraîncălzirea (ΔT<sub>si</sub>) este diferența dintre temperatura la ieșirea evaporatorului și temperatura de saturație la presiunea JP; subrăcirea (ΔT<sub>sr</sub>) este diferența dintre temperatura de saturație la presiunea ÎP și temperatura lichidului înainte de supapa de destindere (T<sub>lic</sub>); supraîncălzirea se determină cu temperatura la aspirația compresorului (T<sub>asp</sub>). Cele două mărimi arată cantitatea de agent și funcționarea supapei de destindere mai precis decât presiunile singure.</p>
<div class="ec"><span>ΔT<sub>si</sub> = T<sub>asp</sub> − T<sub>sat</sub>(p<sub>JP</sub>)</span><span class="nr">(8.1)</span></div>
<div class="ec"><span>ΔT<sub>sr</sub> = T<sub>sat</sub>(p<sub>ÎP</sub>) − T<sub>lic</sub></span><span class="nr">(8.2)</span></div>
<p>Agentul R134a (GWP 1430) a fost înlocuit la autoturismele noi din UE cu R1234yf (GWP &lt; 1), conform Directivei 2006/40/CE, care interzice agenții cu GWP &gt; 150. R744 (CO₂) este folosit în special la pompele de căldură ale vehiculelor electrice. Pompa de căldură inversează rolul schimbătoarelor pentru încălzirea habitaclului cu consum redus de energie.</p>
<figure><img src="img/fig8_1.jpg" alt="Fig. 8.1" loading="lazy"><figcaption>Fig. 8.1. Circuitul frigorific al instalației de climatizare și punctele de măsură</figcaption></figure>
<figure><img src="img/fig8_2.jpg" alt="Fig. 8.2" loading="lazy"><figcaption>Fig. 8.2. Ciclul frigorific în diagrama presiune–entalpie (schematic)</figcaption></figure>
<h2>8.3. Aparatură și echipamente</h2>
<ul><li>Autovehicul sau stand cu instalație de climatizare (R134a sau R1234yf)</li><li>Set manometric cu racorduri specifice agentului sau stație de recuperare–încărcare</li><li>Termometre cu contact (clemă pe conductă) și termometru pentru gurile de ventilație</li><li>Termometru și higrometru pentru aerul ambiant</li><li>Detector electronic de scurgeri, lampă UV (dacă instalația conține trasor)</li></ul>
<h2>8.6. Prelucrarea datelor</h2>
<p>Manometrele indică presiunea relativă: p<sub>abs</sub> = p<sub>rel</sub> + 1,01 bar. Cu presiunea absolută se citește T<sub>sat</sub> din Tabelul 8.2 (interpolare liniară) și se calculează supraîncălzirea, subrăcirea și diferența de temperatură a aerului ΔT<sub>aer</sub> = T<sub>intrare</sub> − T<sub>gură</sub>.</p>
${T82}
<p><b>Exemplu (R1234yf):</b> p<sub>JP</sub> = 2,4 bar rel → 3,4 bar abs → T<sub>sat</sub> ≈ 2 °C; T<sub>asp</sub> = 8 °C → ΔT<sub>si</sub> ≈ 6 K. p<sub>ÎP</sub> = 13 bar rel → 14 bar abs → T<sub>sat</sub> ≈ 53 °C; T<sub>lic</sub> = 45 °C → ΔT<sub>sr</sub> ≈ 8 K. Pentru calcule exacte se folosesc tabelele termodinamice ale agentului (NIST REFPROP, CoolProp sau tabelele producătorului).</p>
${T83}
<div class="nota-indrumar"><h3>Completări față de îndrumarul tipărit</h3><ul>
<li><b>Tabelul 8.1</b> are un rând în plus: ralanti cu suflanta în treapta minimă (pasul 5 din modul de lucru).</li>
<li><b>Tabelul 8.4</b> conține agentul (de pe etichetă), condițiile ambiante, temperatura aerului din habitaclu la intrarea în HVAC (recirculare, T<sub>intrare</sub>), rezultatul verificării etanșeității și diagnosticul.</li>
<li>Fiecare student are propria instalație: agentul, temperatura și umiditatea, caracteristicile și o stare de diagnosticat (încărcare corectă sau unul dintre defectele din Tabelul 8.3).</li>
<li>Temperaturile de saturație se calculează din Tabelul 8.2 prin interpolare liniară (și extrapolare cu ultimul segment sub −10 °C sau peste 60 °C), ca în îndrumar.</li></ul></div>
<h2>8.7. Interpretarea rezultatelor</h2>
<ul><li>La o instalație cu supapă de destindere corect încărcată, orientativ ΔT<sub>si</sub> ≈ 3…8 K și ΔT<sub>sr</sub> ≈ 5…12 K; temperatura aerului la guri 4…10 °C la temperaturi ambiante moderate.</li>
<li>Presiunile depind puternic de temperatura ambiantă și de turație; comparația se face cu diagramele producătorului pentru aceleași condiții.</li>
<li>Presiunea statică arată doar că există agent în instalație (este presiunea de saturație la temperatura mediului): nu indică încărcarea corectă.</li></ul>
<h2>8.8. Relevanță practică</h2>
<p>Service-urile au nevoie de tehnicieni atestați pentru climatizare, iar trecerea la R1234yf și R744 și pompele de căldură ale vehiculelor electrice sunt teme actuale de cercetare și proiectare (eficiență energetică, autonomie pe timp de iarnă).</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>R1234yf: p<sub>JP</sub> = 2,4 bar rel, T<sub>asp</sub> = 8 °C; p<sub>ÎP</sub> = 13 bar rel, T<sub>lic</sub> = 45 °C.</p>
<div class="ec"><span>p<sub>JP,abs</sub> = 3,41 bar → T<sub>sat</sub> = 0 + 5·(3,41 − 3,2)/(3,7 − 3,2) = 2,1 °C; ΔT<sub>si</sub> = 8 − 2,1 = 5,9 K</span><span class="nr">(8.3)</span></div>
<div class="ec"><span>p<sub>ÎP,abs</sub> = 14,01 bar → T<sub>sat</sub> = 50 + 10·(14,01 − 13,0)/(16,4 − 13,0) = 53,0 °C; ΔT<sub>sr</sub> = 53,0 − 45 = 8,0 K</span><span class="nr">(8.4)</span></div>
<div class="problema"><h3>Problema 1</h3><p>R134a, motor oprit, 25 °C: ce presiune statică relativă indică manometrele?</p><details class="sol"><summary>Rezolvare</summary><p>T<sub>sat</sub> = 25 °C: interpolare între 10 °C (4,1 bar) și 30 °C (7,7 bar): 4,1 + 3,6·15/20 = 6,8 bar abs → ≈ 5,8 bar rel (valoarea reală 6,65 bar abs; tabelul rotunjit dă o aproximație).</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>R1234yf, 2000 rot/min: p<sub>JP</sub> = 1,6 bar rel, p<sub>ÎP</sub> = 9,0 bar rel, T<sub>asp</sub> = 18 °C, T<sub>lic</sub> = 40 °C, T gură = 16 °C. Diagnostic?</p>
<details class="sol"><summary>Rezolvare</summary><p>p<sub>JP,abs</sub> = 2,61 → T<sub>sat</sub> ≈ −4,1 °C, ΔT<sub>si</sub> ≈ 22 K (mare); p<sub>ÎP,abs</sub> = 10,01 → T<sub>sat</sub> ≈ 39,2 °C, ΔT<sub>sr</sub> ≈ −0,8 → practic 0 (mică). Ambele presiuni scăzute, ΔT<sub>si</sub> mare, ΔT<sub>sr</sub> mică: încărcare insuficientă – se caută scurgerea, se repară, se videază și se încarcă masa de pe etichetă.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Pompa de căldură a unui vehicul electric are COP = 2,5 la −5 °C. Ce putere electrică consumă pentru 4 kW căldură în habitaclu, față de încălzitorul PTC?</p>
<details class="sol"><summary>Rezolvare</summary><p>P = 4/2,5 = 1,6 kW față de 4 kW cu PTC (COP = 1): economie 2,4 kW – la o deplasare de o oră, ≈ 2,4 kWh, adică ≈ 15 km de autonomie la 16 kWh/100 km.</p></details></div>`;
}
const INTREBARI = [
  ["De ce supraîncălzirea este necesară pentru protecția compresorului?", "Garantează că la aspirație ajung numai vapori: lichidul nu se poate comprima (lovitură hidraulică), spală uleiul de pe pistoane și supape și distruge compresorul. O supraîncălzire de câțiva kelvini este marja de siguranță."],
  ["Cum se modifică presiunile la încărcare insuficientă? Dar la supraîncărcare?", "Insuficientă: ambele presiuni scad, ΔT<sub>si</sub> mare (evaporatorul nu este alimentat complet), ΔT<sub>sr</sub> mică, aer cald la guri. Supraîncărcare: ambele presiuni cresc, ΔT<sub>sr</sub> mare (lichid acumulat în condensator), ΔT<sub>si</sub> mică, consum mare și risc de lichid la aspirație."],
  ["De ce a fost înlocuit R134a cu R1234yf la autoturismele noi din UE?", "Directiva 2006/40/CE interzice agenții cu GWP &gt; 150 la autoturismele noi; R134a are GWP 1430, R1234yf sub 1 (se descompune în atmosferă în câteva zile). Dezavantaje: inflamabilitate ușoară (A2L), preț mai mare, componente și stații dedicate."],
  ["Cum funcționează o pompă de căldură pentru încălzirea habitaclului unui vehicul electric și de ce crește autonomia pe timp de iarnă?", "Valvele inversează circuitul: schimbătorul exterior devine evaporator și preia căldura aerului exterior (și căldura reziduală a bateriei și a motorului), iar condensatorul interior încălzește aerul. Cu COP 2…3 consumă de 2…3 ori mai puțină energie decât rezistența PTC, deci autonomia crește iarna."]
];
const TEST = [
  { q: "Manometrul JP indică 2,4 bar. Presiunea absolută este:", o: ["1,39 bar", "3,41 bar", "2,4 bar", "24 bar"], c: 1, e: "p<sub>abs</sub> = p<sub>rel</sub> + 1,01 bar." },
  { q: "Supraîncălzirea se calculează cu:", o: ["T<sub>lic</sub> și p<sub>ÎP</sub>", "T<sub>asp</sub> și p<sub>JP</sub>", "T gură și T ambiant", "presiunea statică"], c: 1, e: "ΔT<sub>si</sub> = T<sub>asp</sub> − T<sub>sat</sub>(p<sub>JP</sub>)." },
  { q: "Ambele presiuni scăzute, ΔT<sub>si</sub> mare, ΔT<sub>sr</sub> mică indică:", o: ["supraîncărcare", "încărcare insuficientă", "compresor uzat", "condensator colmatat"], c: 1, e: "Tabelul 8.3." },
  { q: "Presiunea statică cu motorul oprit arată:", o: ["încărcarea corectă", "presiunea de saturație la temperatura mediului", "starea compresorului", "supraîncălzirea"], c: 1, e: "Nu indică cantitatea de agent." },
  { q: "R1234yf a înlocuit R134a deoarece:", o: ["este mai ieftin", "are GWP < 1", "nu este inflamabil", "lucrează la 100 bar"], c: 1, e: "Directiva 2006/40/CE: GWP ≤ 150." }
];
const CSS = `<style>
.saa8-scena #st3d .m3d { height:clamp(380px, 58vh, 620px); }
.saa8-afis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.saa8-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .saa8-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .saa8-afis b { font-size:1.02rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; } #cv-gr { width:100%; height:240px; display:block; }
#comp-desc { min-height:2.4em; }
.tabel-ref { border-collapse:collapse; margin:.6rem 0; font-size:.88rem; } .tabel-ref caption { text-align:left; font-weight:600; margin-bottom:.3rem; } .tabel-ref th, .tabel-ref td { border:1px solid var(--linie); padding:.25rem .45rem; text-align:center; }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); } .pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; } .pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; } .pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; } .pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; } .pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; align-items:center; } .pas-ctl button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); } .pas-ctl .camp { display:block; margin:.35rem 0; }
@media (max-width:900px){ .saa8-afis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>`;

/* ------------------------------------------------------------------ definiția lucrării */
Cadru.porneste({
  disc: "SAA", nr: 8, cod: "saa-l8",
  titlu: "Sistemul de climatizare și pompa de căldură – determinarea parametrilor de funcționare",
  scurt: "Climatizarea și pompa de căldură",
  subtitlu: "Laborator virtual – instalația de climatizare cu TXV: setul manometric, supraîncălzirea și subrăcirea, temperatura la guri, etanșeitatea, stația de service, diagnoza; animația ciclului și a pompei de căldură",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261028); },
  date: [{ k: "patm", et: "p<sub>abs</sub> = p<sub>rel</sub> + [bar]", v: 1.01, fix: true }],
  tabele: [
    { id: "t81", titlu: "Tabelul 8.1. Parametrii instalației de climatizare", antetRand: "Regim", nota: "Presiuni relative (manometrele setului). T<sub>sat</sub> din Tabelul 8.2 cu presiunea absolută (+1,01 bar), interpolare liniară.",
      randuri: MD.REG.map(([k, et]) => ({ k, et })),
      coloane: [{ k: "pJP", t: "p<sub>JP</sub> [bar rel]", intrare: true }, { k: "pIP", t: "p<sub>ÎP</sub> [bar rel]", intrare: true }, { k: "TsJP", t: "T<sub>sat,JP</sub> [°C]" }, { k: "TsIP", t: "T<sub>sat,ÎP</sub> [°C]" },
        { k: "Tlic", t: "T<sub>lic</sub> [°C]", intrare: true }, { k: "Tasp", t: "T<sub>asp</sub> [°C]", intrare: true }, { k: "Tgura", t: "T<sub>gură</sub> [°C]", intrare: true }, { k: "SH", t: "ΔT<sub>si</sub> [K]" }, { k: "SC", t: "ΔT<sub>sr</sub> [K]" }] },
    { id: "t84", titlu: "Tabelul 8.4. Agentul, condițiile încercării, etanșeitatea și diagnosticul", antetRand: "Mărimea",
      randuri: [{ k: "ag", et: "Agentul frigorific (eticheta)" }, { k: "ta", et: "T aer ambiant [°C]" }, { k: "rh", et: "Umiditatea relativă [%]" }, { k: "tin", et: "T<sub>intrare</sub> aer habitaclu (HVAC) [°C]" }, { k: "scurg", et: "Verificarea etanșeității" }, { k: "cauza", et: "Starea instalației (diagnostic)" }],
      coloane: [{ k: "v", t: "Valoarea", intrare: true, text: true }] }
  ],
  inaltimeGrafic: 280,
  calculeaza: calculeazaSAA8,
  intrebari() {
    return [
      { id: "q1", u: "K", text: "Supraîncălzirea ΔT<sub>si</sub> la 2000 rot/min (relația 8.1):", textSimplu: "ΔT supraîncălzire la 2000 rot/min" },
      { id: "q2", u: "K", text: "Subrăcirea ΔT<sub>sr</sub> la 2000 rot/min (relația 8.2):", textSimplu: "ΔT subrăcire la 2000 rot/min" },
      { id: "q3", u: "°C", text: "Temperatura de condensare T<sub>sat</sub>(p<sub>ÎP</sub>) la 2000 rot/min (Tabelul 8.2):", textSimplu: "T sat ÎP la 2000 rot/min" },
      { id: "q4", u: "K", text: "Diferența de temperatură a aerului ΔT<sub>aer</sub> = T<sub>intrare</sub> − T<sub>gură</sub> la 2000 rot/min:", textSimplu: "ΔT aer la 2000 rot/min" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    MD.REG.forEach(([k, et]) => { if (t.t81[k].pJP === "") l.push(`Tabelul 8.1: ${et}`); });
    [["ag", "agentul"], ["ta", "T ambiant"], ["rh", "umiditatea"], ["tin", "T intrare"], ["scurg", "etanșeitatea"], ["cauza", "diagnosticul"]].forEach(([k, et]) => { if (t.t84[k].v === "") l.push(`Tabelul 8.4: ${et}`); });
    return l;
  },
  exemplu(D) {
    const pr = MD.parametri(1); pr.def = "ok"; pr.ag = "R1234yf";
    MD.REG.forEach(([k]) => { const r = MD.regim(pr, k); Object.assign(D.t.t81[k], { pJP: r.pJP.toFixed(2), pIP: r.pIP.toFixed(1), Tlic: r.Tlic.toFixed(1), Tasp: r.Tasp.toFixed(1), Tgura: r.Tgura.toFixed(1) }); });
    Object.assign(D.t.t84, { ag: { v: "R1234yf" }, ta: { v: pr.Ta.toFixed(1) }, rh: { v: String(pr.RH) }, tin: { v: (pr.Ta + pr.dTin).toFixed(1) }, scurg: { v: MD.LOC[0] } });
  },
  animatie: {
    titluTab: "Animație: ciclul frigorific", titlu: "Circuitul frigorific, ciclul în diagrama p–h și pompa de căldură",
    intro: `<p>Alegeți varianta (climatizare cu supapă de destindere sau cu orificiu calibrat și acumulator, pompă de căldură, pompă de căldură cu R744) și modificați temperatura exterioară și turația compresorului: urmăriți starea agentului pe circuit (culorile) și deplasarea ciclului 1–2–3–4 în diagrama p–h, efectul frigorific / căldura utilă și coeficientul de performanță (COP).</p>`,
    dupa: `<p class="nota">Diagrama p–h este schematică (proprietăți aproximative), pentru înțelegerea ciclului și compararea variantelor; calculele lucrării se fac cu Tabelul 8.2.</p>`,
    modul: "clima3d.js?v=1", functie: "creeazaAnimatieClima"
  },
  referat: {
    scop: "Măsurarea presiunilor și temperaturilor din instalația de climatizare, determinarea supraîncălzirii și subrăcirii și diagnoza pe baza acestora; agenții frigorifici actuali, pompa de căldură, procedura de recuperare și încărcare.",
    relatii: "p<sub>abs</sub> = p<sub>rel</sub> + 1,01 bar; &nbsp; ΔT<sub>si</sub> = T<sub>asp</sub> − T<sub>sat</sub>(p<sub>JP</sub>); &nbsp; ΔT<sub>sr</sub> = T<sub>sat</sub>(p<sub>ÎP</sub>) − T<sub>lic</sub>; &nbsp; ΔT<sub>aer</sub> = T<sub>intrare</sub> − T<sub>gură</sub>.",
    varianta: () => `Instalația proprie: agentul de pe etichetă, ${fx(P().Ta, 1)} °C și ${P().RH} % umiditate, o stare de diagnosticat.`,
    indicatii: "Comparați ΔT<sub>si</sub>, ΔT<sub>sr</sub>, T gură și presiunile cu valorile uzuale și cu Tabelul 8.3; comentați influența turației și a debitului de aer prin evaporator; justificați diagnosticul și rezultatul verificării etanșeității; explicați procedura stației de service și avantajele pompei de căldură…"
  },
  subsol: "Modelul: instalația cu TXV pe stand – temperaturile de vaporizare și de condensare după temperatura mediului, turație și treapta suflantei, supraîncălzirea și subrăcirea, temperatura la guri, presiunile din Tabelul 8.2 (interpolare liniară); defectele din Tabelul 8.3. Fiecare student are agentul, condițiile și starea instalației.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena saa8-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="st3d"><p class="nota">Se încarcă standul 3D…</p></div>
      <p class="nota">Carcasele: butoanele <b>carcasă opacă / transparent / secționat</b> din colțul scenei 3D.</p><div class="rand-butoane">${Object.entries({ tot: "Vedere generală", man: "Setul manometric", comp: "Compresorul", bord: "Bordul", statie: "Stația" }).map(([k, t]) => `<button type="button" data-v3="${k}">${t}</button>`).join("")}</div>
      <p class="nota" id="comp-desc">Clic pe o componentă. Particulele: roșu – gaz fierbinte (ÎP), portocaliu – lichid (ÎP), albastru – vapori reci (JP).</p>
      <div class="saa8-afis"><div><span>Motor</span><b id="af-st">—</b></div><div><span>Regim</span><b id="af-reg">—</b></div><div><span>p JP (L)</span><b id="af-jp">—</b></div><div><span>p ÎP (H)</span><b id="af-ip">—</b></div>
        <div><span>T lic</span><b id="af-tl">—</b></div><div><span>T asp</span><b id="af-ta">—</b></div><div><span>T gură</span><b id="af-tg">—</b></div><div><span>Aer ambiant</span><b id="af-amb">—</b></div></div>
      <div class="instr" data-panou="gr" hidden><h3>Presiunile în timp (p JP × 4 – albastru, p ÎP – roșu)</h3><canvas id="cv-gr" aria-label="Presiunile în timp"></canvas></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari" data-doar-demo><summary>Starea instalației (mod demonstrativ)</summary><p class="nota" id="def-demo"></p></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiestePasi();
      $$(".saa8-scena [data-v3]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v3)));
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $("#def-demo").textContent = MD.eticheta(P()) + (P().def === "sub" ? ` (scurgerea: ${MD.LOC[P().loc]})` : "");
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval() { const d = $("#def-demo"); if (d) d.textContent = ""; sim.st = null; ISTORIC.length = 0; },
    reset() { Object.assign(sim, { merge: false, n: 0, nT: 0, ac: false, fan: 0, conectat: false, clame: false, sondaGura: false, st: null, det: 0, verif: {}, statie: null }); ISTORIC.length = 0; },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * sim.rapid;
      sim.t += dt;
      if (!sim.st) sim.st = { ...MD.regim(P(), "st") };
      sim.n += ((sim.merge ? sim.nT : 0) - sim.n) * Math.min(1, h / 0.6);
      const k = regimCurent() || "x", e = echilibru(), tau = k === "st" ? 25 : 55;
      if (k !== sim.regAnt) { sim.regAnt = k; sim.tReg = 0; } else sim.tReg += dt;
      ["pJP", "pIP", "Tlic", "Tasp", "Tgura"].forEach(c => { sim.st[c] += (e[c] - sim.st[c]) * Math.min(1, dt / tau); }); sim.st.Tev += (e.Tev - sim.st.Tev) * Math.min(1, dt / tau);
      if (!ISTORIC.length || sim.t - ISTORIC[ISTORIC.length - 1][0] > 2) { const c = citiri(); ISTORIC.push([sim.t, c.pJP, c.pIP]); while (ISTORIC.length && ISTORIC[0][0] < sim.t - 600) ISTORIC.shift(); }
      // demonstrația stației: recuperare, vidare, test vid, ulei, încărcare
      if (sim.statie && sim.statie.i < 5) { sim.tSt += h; const pr = P(), T = [6, 8, 4, 3, 7], i = sim.statie.i, u = Math.min(1, sim.tSt / T[i]);
        const txt = [`${Math.round(pr.masa * (pr.def === "sub" ? 0.55 : pr.def === "supra" ? 1.3 : 1) * u)} g`, `${String(Math.floor(20 * u)).padStart(2, "0")}:00 / 20:00`, `${(-0.99).toFixed(2)} bar`, `${Math.round(10 * u)} ml PAG`, `${Math.round(pr.masa * u)} / ${pr.masa} g`][i];
        sim.statie = { i, txt, sub: ["agent recuperat (cântărit)", "vidare – umiditatea fierbe la presiune mică", "menținere 5 min – etanș", "completare ulei și trasor UV", `încărcare ${pr.ag}`][i] };
        if (u >= 1) { sim.statie = { i: i + 1, txt: i + 1 === 5 ? "OK" : "", sub: i + 1 === 5 ? "program încheiat" : "" }; sim.tSt = 0; } }
      if (!vizibil) return;
      actualizeaza3D();
      const now = performance.now();
      if (now - (this._ts || 0) > 250) { this._ts = now; actualizeazaPasi(); if (now - (this._tg || 0) > 1000) { this._tg = now; deseneaza(); } C.stare(1, sim.merge ? `motor ${Math.round(sim.n / 10) * 10} rot/min${sim.ac ? " · A/C" : ""}` : "motor oprit", sim.merge ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { deseneaza(); },
    formule() { return []; }
  }
});
