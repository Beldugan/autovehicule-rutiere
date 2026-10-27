/* SAA – Lucrarea 6. Sistemul de supraalimentare – presiunea de supraalimentare și actuatorii turbosuflantei (standul 1.5 dCi).
   Simulator: standul 3D cu motorul 1.5 dCi și turbosuflanta VGT (carcasele pot fi făcute transparente), intercoolerul, filtrul, EVRV,
   pompa manuală de vacuum cu manometru, comparatorul pe suport magnetic, termocuplele T1/T2/T3 cu termometrul cu 4 canale, testerul OBD;
   masa cu turbosuflantele secționate (wastegate și VGT). Panoul din dreapta conduce lucrarea pas cu pas; datalogurile (accelerarea liberă
   și proba de drum la sarcină plină) se citesc cu cursorul. Tabul „Animație” arată funcționarea și variantele constructive. */
"use strict";
const MD = MODELE["saa-l6"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);
const cl = (x, a, b) => Math.max(a, Math.min(b, x));

/* ------------------------------------------------------------------ starea */
const sim = {
  t: 0, rapid: 1, defect: "none", manusi: false, ochelari: false, comp: {}, selectat: null, transparent: false,
  vacMontat: false, compMontat: false, vac: 0, tPomp: 0, tV0: null, v0: null,
  termo: false, obd: false, merge: false, n: 0, nT: 0, tStab: 0, cald: false, st: null,
  acc: null, iAcc: 0, iDr: 60, panouDL: "acc"
};
const def = () => sim.defect === "none" ? "" : sim.defect;
const RPM = { ral: () => P().nRal, n1500: () => 1500, n2000: () => 2000, n2500: () => 2500, n3000: () => 3000 };
const NUME_R = { ral: "ralanti", n1500: "1500 rot/min", n2000: "2000 rot/min", n2500: "2500 rot/min", n3000: "3000 rot/min" };
/** starea curentă a motorului: valorile de echilibru (modelul) și cele tranzitorii (pornire, schimbarea turației) */
function echilibru(n) { if (n < 50) return null; return MD.regim(P(), n, def()); }
function cheieRegim() { return Object.keys(RPM).find(k => Math.abs(RPM[k]() - sim.nT) < 1 && sim.merge) || null; }
function stabil() { const e = echilibru(sim.nT); if (!e || !sim.st) return false; return Math.abs(sim.n - sim.nT) < 8 && ["T1", "T2", "T3"].every(k => Math.abs(sim.st[k] - e[k]) < 0.04) && ["preal", "pcer"].every(k => Math.abs(sim.st[k] - e[k]) < 0.003); }
function citiri() {   // valorile afișate (OBD 0,01 bar, termometrul 0,1 °C)
  const pr = P(), s = sim.st;
  if (!sim.merge || !s) return { n: 0, pcer: pr.patm, preal: pr.patm, pos: 0, T1: pr.Ta, T2: pr.Ta, T3: pr.Ta, T4: pr.Ta };
  return { n: Math.round(sim.n / 10) * 10, pcer: Math.round(s.pcer * 100) / 100, preal: Math.round(s.preal * 100) / 100, pos: Math.round(s.pos), T1: Math.round(s.T1 * 10) / 10, T2: Math.round(s.T2 * 10) / 10, T3: Math.round(s.T3 * 10) / 10, T4: pr.Ta };
}

/* ------------------------------------------------------------------ componentele (identificare) */
const COMP = {
  rotC: ["Roata compresorului", "Aliaj de aluminiu, palete principale și intermediare; aspiră axial aerul și îl refulează radial cu viteză mare."],
  carcasaC: ["Carcasa compresorului", "Difuzorul transformă viteza în presiune, voluta colectează aerul comprimat și îl trimite spre intercooler."],
  rotT: ["Roata turbinei", "Superaliaj (Inconel) sudat pe arbore; gazele intră radial, ies axial – energia lor antrenează compresorul."],
  carcasaT: ["Carcasa turbinei", "Fontă / oțel refractar, 600…900 °C; voluta accelerează gazele spre roată."],
  chra: ["Carcasa centrală (CHRA)", "Lagărele arborelui, canalele de ulei și de apă, etanșările spre compresor și turbină."],
  lagare: ["Lagărele", "Bucșe flotante în film de ulei și lagărul axial; rotorul depășește 150 000 rot/min."],
  ungere: ["Ungerea turbosuflantei", "Ulei sub presiune din galeria motorului, retur liber în baie – de aceea nu se oprește motorul imediat după sarcină mare."],
  palete: ["Paletele directoare VGT", "Rotite simultan: închise – secțiune mică, presiune mare la turații mici; deschise – debit mare la turații mari."],
  inel: ["Inelul de comandă VGT", "Leagă paletele de maneta exterioară."],
  actuator: ["Actuatorul pneumatic (vacuum)", "Membrana trage tija când EVRV aplică depresiune; arcul o readuce. Se verifică cu pompa de vacuum și comparatorul."],
  maneta: ["Maneta axului de comandă", "Transformă cursa tijei în rotirea inelului de comandă (sau a clapetei wastegate)."],
  tija: ["Tija actuatorului", "Lungimea ei reglată din fabrică fixează poziția paletelor / presiunea; nu se modifică arbitrar."],
  wg: ["Wastegate", "Clapeta deviază o parte din gaze pe lângă turbină și limitează presiunea (turbosuflanta fără VGT)."],
  evrv: ["Electrovalva EVRV", "ECU modulează PWM depresiunea dată actuatorului, în buclă închisă după senzorul MAP."],
  map: ["Senzorul MAP", "Presiunea reală de supraalimentare (după intercooler), comparată de ECU cu presiunea cerută."],
  intercooler: ["Intercoolerul", "Răcește aerul comprimat: densitate mai mare, temperatură de ardere și NOₓ mai mici."],
  filtru: ["Filtrul de aer", "Pierderea de presiune din filtru face ca p1 < p atmosferică (≈ 0,02 bar)."],
  colector: ["Colectorul de evacuare", "Aduce gazele de la cilindri la intrarea turbinei."]
};
const NCOMP = Object.keys(COMP).length, MINCOMP = 10;
function alegeComp(k, et) { if (!COMP[k]) { if (et) $("#comp-desc").innerHTML = esc(et); return; } sim.comp[k] = true; sim.selectat = k; $("#comp-desc").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}${et ? `<br><span class="nota">${esc(et)}</span>` : ""}`; actualizeazaPasi(); }

/* ------------------------------------------------------------------ pașii */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const PASI = [
  { t: "Identificarea și NSSM", tab: "turbosuflantele secționate și sistemul pe stand", vedere: "sect",
    instr: ["NSSM: motorul nu se pornește cu admisia deschisă (rotorul > 100 000 rot/min); carcasa turbinei atinge 600…900 °C – mănuși termoizolante; furtunurile sunt sub presiune – nu se desfac cu motorul pornit; accelerările – numai la comanda cadrului didactic.",
      `Pe turbosuflantele secționate (masa din stânga) și pe stand identificați componentele (clic pe ele): roțile, carcasele, lagărele, ungerea, paletele VGT, inelul, actuatorul, maneta, tija, wastegate, EVRV, MAP, intercoolerul (minimum ${MINCOMP}).`],
    ver: () => [[sim.manusi && sim.ochelari, "mănuși termoizolante și ochelari"], [Object.keys(sim.comp).length >= MINCOMP, `componente identificate: ${Object.keys(sim.comp).length}/${NCOMP} (minimum ${MINCOMP})`]],
    prog: () => (sim.manusi && sim.ochelari ? 1 : 0) + (Object.keys(sim.comp).length >= MINCOMP ? 1 : 0), tot: 2,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși termoizolante</label><label class="bifa"><input type="checkbox" id="ck-och"> Ochelari</label></div>
      <div class="rand-butoane"><button type="button" data-v="sect">Masa cu turbosuflantele secționate</button><button type="button" data-v="turbo">Turbosuflanta pe stand</button></div>` },
  { t: "Caracteristica actuatorului", tab: "Tabelele 6.2 și 6.3 (etanșeitatea)", vedere: "act", panou: "act",
    instr: ["Motorul oprit și rece. Deconectați furtunul actuatorului de la EVRV și racordați pompa de vacuum; montați comparatorul cu palpatorul pe capătul tijei (zero la 0 mbar).",
      "Aplicați depresiune în trepte de 100 mbar (± 5 mbar) și citiți cursa tijei la comparator (Tabelul 6.2).",
      "La 600 mbar înregistrați depresiunea inițială, așteptați 1 minut și înregistrați-o din nou: membrana etanșă își menține depresiunea (Tabelul 6.3)."],
    ver: () => { const c = MD.VAC.find(v => Math.abs(sim.vac - v) <= 5); return [[!sim.merge, "motor oprit"], [sim.vacMontat, "pompa de vacuum racordată la actuator"], [sim.compMontat, "comparatorul montat pe tijă"], [c != null, c != null ? `depresiunea ${c} mbar` : `depresiunea ${Math.round(sim.vac)} mbar – între trepte`], [sim.tV0 != null, sim.tV0 != null ? `menținere: ${Math.min(99, Math.floor(sim.t - sim.tV0))}/60 s` : "testul de etanșeitate – nepornit"]]; },
    prog: () => MD.VAC.filter(v => pe("t62", "s", "a" + v)).length + ["v0", "v1"].filter(k => pe("t63", k, "v")).length, tot: 9,
    ctl: `<div class="rand-butoane"><button type="button" id="b-vac">Racordează pompa de vacuum</button><button type="button" id="b-cmp">Montează comparatorul</button></div>
      <div class="rand-butoane"><button type="button" id="b-pomp">Pompează (o cursă)</button><button type="button" id="b-pomp5">+5 mbar</button><button type="button" id="b-elib">Eliberează 100 mbar</button><button type="button" id="b-zero">Eliberează tot</button></div>
      <div class="rand-butoane"><button type="button" class="primar" id="b-ics">● Cursa → Tabelul 6.2</button></div>
      <div class="rand-butoane"><button type="button" data-iv="v0">● Depresiunea inițială → T 6.3</button><button type="button" data-iv="v1">● După 1 min → T 6.3</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>` },
  { t: "Presiunea și temperaturile în regim stabilizat", tab: "Tabelul 6.1", vedere: "turbo", panou: "obd",
    instr: ["Refaceți legăturile (furtunul actuatorului la EVRV), demontați comparatorul; montați termocuplele T1 (înainte de compresor), T2 (după compresor), T3 (după intercooler) și conectați testerul OBD.",
      "Porniți motorul (standul este la temperatura de funcționare). Pentru fiecare turație din Tabelul 6.1 așteptați stabilizarea și înregistrați presiunea cerută și reală, poziția actuatorului și T1, T2, T3.",
      "Observați: pe standul fără frână presiunea de supraalimentare rămâne mică."],
    ver: () => { const k = cheieRegim(); return [[!sim.vacMontat && !sim.compMontat, "furtunul actuatorului la EVRV, comparatorul demontat"], [sim.termo, "termocuplele T1, T2, T3 montate"], [sim.obd, "testerul OBD conectat"], [sim.merge, "motor pornit"], [k != null, k ? `regim: ${NUME_R[k]}` : "alegeți turația"], [stabil(), stabil() ? "valori stabilizate" : "se stabilizează…"]]; },
    prog: () => MD.REG.filter(z => pe("t61", z[0], "T2")).length, tot: 5,
    ctl: `<div class="rand-butoane"><button type="button" id="b-termo">Montează termocuplele</button><button type="button" id="b-obd">Conectează testerul OBD</button></div>
      <div class="rand-butoane"><button type="button" class="primar" id="b-porn">Pornește motorul</button><button type="button" id="b-stop">Oprește</button></div>
      <div class="rand-butoane">${Object.keys(RPM).map(k => `<button type="button" data-n="${k}">${NUME_R[k]}</button>`).join("")}<label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>`,
    buton: ["● Regimul → Tabelul 6.1", e => inregR(e)] },
  { t: "Accelerarea liberă (turbo-lag)", tab: "Tabelul 6.3 – p max, t₉₀", vedere: "turbo", panou: "dl",
    instr: ["La ralanti, porniți înregistrarea datalog a testerului (10 Hz) și apăsați pedala la fund până la turația maximă permisă, apoi eliberați-o.",
      "Pe datalog: puneți cursorul pe valoarea maximă a presiunii și înregistrați-o; apoi pe primul eșantion care depășește p₀ + 0,9·(p<sub>max</sub> − p₀) și înregistrați timpul de răspuns t₉₀ (de la apăsarea pedalei, t = 0,5 s)."],
    ver: () => [[sim.merge, "motor pornit"], [sim.acc != null, sim.acc ? "datalog înregistrat" : "datalogul nu este înregistrat"]],
    prog: () => ["pmax", "t90"].filter(k => pe("t63", k, "v")).length, tot: 2,
    ctl: `<div class="rand-butoane"><button type="button" class="primar" id="b-acc">Accelerare liberă – înregistrează datalog</button></div>
      <label class="camp">Cursorul datalogului <input type="range" id="cur-acc" min="0" max="50" step="1" value="5"></label>
      <div class="rand-butoane"><button type="button" data-ia="pmax">● p max → Tabelul 6.3</button><button type="button" data-ia="t90">● t₉₀ → Tabelul 6.3</button></div>` },
  { t: "Datalogul de drum la sarcină plină", tab: "Tabelul 6.1 – sarcină plină", vedere: "turbo", panou: "dl",
    instr: ["Fișierul datalog al probei de drum (treapta a 3-a, pedala la fund, 1300 → 4200 rot/min, 10 Hz) este furnizat de cadrul didactic: presiunea cerută și reală, poziția VGT, T1, T2, T3.",
      "Puneți cursorul la ≈ 2500 rot/min (± 60) și înregistrați rândul „sarcină plină” din Tabelul 6.1; calculați π<sub>c</sub>, η<sub>c</sub> și ε<sub>IC</sub> (relațiile 6.1–6.4)."],
    ver: () => { const s = MD.drum(P())[sim.iDr]; return [[Math.abs(s.n - 2500) <= 60, `cursorul la ${s.n} rot/min`]]; },
    prog: () => pe("t61", "sp", "T2") ? 1 : 0, tot: 1,
    ctl: `<label class="camp">Cursorul datalogului de drum <input type="range" id="cur-dr" min="0" max="120" step="1" value="60"></label>`,
    buton: ["● Eșantionul → Tabelul 6.1 (sarcină plină)", e => inregDrum(e)] }
];
let pasActiv = 0;
const VEDERI = { tot: [[1.55, 1.25, 1.85], [-0.05, 0.55, 0.15]], turbo: [[0.42, 0.82, 0.98], [-0.04, 0.57, 0.24]], act: [[0.32, 0.58, 0.68], [-0.02, 0.5, 0.27]], sect: [[-0.5, 1.28, 1.42], [-0.95, 0.88, 0.55]], aparate: [[1.45, 1.15, 1.35], [0.95, 0.65, 0.6]] };
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
  $$(".instr[data-panou]").forEach(el => { el.hidden = el.dataset.panou !== (p.panou || "obd"); });
  if (i === 3) sim.panouDL = "acc"; if (i === 4) sim.panouDL = "dr";
  vedere3d(p.vedere); actualizeazaPasi(); deseneaza();
}

/* ------------------------------------------------------------------ comenzile */
function on(id, f) { $$(id).forEach(b => b.addEventListener("click", f)); }
function msg(t) { $("#msg-inreg").textContent = t; }
function legaComenzi() {
  $("#ck-man").addEventListener("change", e => { sim.manusi = e.target.checked; actualizeazaPasi(); }); $("#ck-och").addEventListener("change", e => { sim.ochelari = e.target.checked; actualizeazaPasi(); });
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked ? 10 : 1; $$(".ck-rapid").forEach(x => x.checked = e.target.checked); }));
  $$("[data-v]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v)));
  on("#b-vac", () => { if (sim.merge) return Cadru.mesajTemporar("Proba actuatorului se face cu motorul oprit.", "atentie"); sim.vacMontat = !sim.vacMontat; if (!sim.vacMontat) { sim.vac = 0; sim.tV0 = null; } });
  on("#b-cmp", () => { if (sim.merge) return Cadru.mesajTemporar("Cu motorul oprit.", "atentie"); sim.compMontat = !sim.compMontat; });
  const pomp = d => { if (!sim.vacMontat) return Cadru.mesajTemporar("Racordați pompa de vacuum la actuator.", "atentie"); sim.vac = Math.min(850, sim.vac + d); sim.tPomp = sim.t; sim.tV0 = null; };
  on("#b-pomp", () => pomp(40 + 20 * Math.random())); on("#b-pomp5", () => pomp(5));
  on("#b-elib", () => { sim.vac = Math.max(0, sim.vac - 100); sim.tV0 = null; }); on("#b-zero", () => { sim.vac = 0; sim.tV0 = null; });
  on("#b-ics", e => inregS(e));
  $$("[data-iv]").forEach(b => b.addEventListener("click", e => inregV(e, b.dataset.iv)));
  on("#b-termo", () => { sim.termo = !sim.termo; }); on("#b-obd", () => { sim.obd = !sim.obd; });
  on("#b-porn", () => { if (!sim.manusi) return Cadru.mesajTemporar("NSSM: mănuși termoizolante și ochelari (pasul 1).", "atentie"); if (sim.vacMontat || sim.compMontat) return Cadru.mesajTemporar("Refaceți legătura actuatorului la EVRV și demontați comparatorul înainte de pornire.", "atentie");
    if (sim.merge) return; sim.merge = true; sim.n = 0; sim.nT = P().nRal; sim.st = { ...MD.regim(P(), P().nRal, def()) }; sim.acc = null; Cadru.mesajTemporar("Motorul a pornit – ralanti, temperatura de funcționare.", "ok"); });
  on("#b-stop", () => { sim.merge = false; sim.nT = 0; sim.acc = null; });
  $$("[data-n]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); sim.nT = RPM[b.dataset.n](); sim.tStab = 0; }));
  on("#b-acc", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); if (Math.abs(sim.n - P().nRal) > 20) return Cadru.mesajTemporar("Accelerarea liberă pornește de la ralanti.", "atentie");
    sim.acc = MD.accelerare(P(), def()); sim.accT = 0; sim.iAcc = 5; $("#cur-acc").value = 5; Cadru.mesajTemporar("Datalogul accelerării libere a fost înregistrat (5 s, 10 Hz).", "ok"); });
  const ca = $("#cur-acc"); ca.addEventListener("input", () => { sim.iAcc = +ca.value; deseneazaDL(); });
  const cd = $("#cur-dr"); cd.addEventListener("input", () => { sim.iDr = +cd.value; deseneazaDL(); actualizeazaPasi(); });
  $$("[data-ia]").forEach(b => b.addEventListener("click", e => inregAcc(e, b.dataset.ia)));
}

/* ------------------------------------------------------------------ înregistrările */
function inregS(e) {
  if (!sim.vacMontat || !sim.compMontat) return Cadru.mesajTemporar("Pompa de vacuum racordată și comparatorul montat.", "atentie");
  const c = MD.VAC.find(v => Math.abs(sim.vac - v) <= 5); if (c == null) return Cadru.mesajTemporar(`Depresiunea este ${Math.round(sim.vac)} mbar: treptele sunt ${MD.VAC.join(", ")} mbar (± 5).`, "atentie");
  const s = Math.round(MD.cursa(P(), c, def()) * 100) / 100;
  const ok = Cadru.inregistreaza(e, { log: { m: "s", vac: c, s }, celule: [{ t: "t62", r: "s", c: "a" + c, v: s.toFixed(2) }] });
  if (ok) { msg(`Tabelul 6.2 (${c} mbar): cursa = ${fx(s, 2)} mm.`); deseneaza(); }
}
function inregV(e, k) {
  if (!sim.vacMontat) return Cadru.mesajTemporar("Racordați pompa de vacuum.", "atentie");
  if (k === "v0") { if (Math.abs(sim.vac - 600) > 5) return Cadru.mesajTemporar("Testul de etanșeitate începe la 600 mbar (± 5).", "atentie"); sim.tV0 = sim.t; sim.v0 = Math.round(sim.vac); const ok = Cadru.inregistreaza(e, { log: { m: "v", k, v: sim.v0 }, celule: [{ t: "t63", r: "v0", c: "v", v: String(sim.v0) }] }); if (ok) msg(`Tabelul 6.3: depresiunea inițială ${sim.v0} mbar – așteptați 1 minut.`); return; }
  if (sim.tV0 == null) return Cadru.mesajTemporar("Înregistrați întâi depresiunea inițială (la 600 mbar).", "atentie");
  const dt = sim.t - sim.tV0; if (dt < 60 || dt > 75) return Cadru.mesajTemporar(`Citirea se face la 1 minut (acum ${Math.floor(dt)} s).`, "atentie");
  const v = Math.round(sim.vac); const ok = Cadru.inregistreaza(e, { log: { m: "v", k, v, v0: sim.v0, dt: Math.round(dt * 10) / 10 }, celule: [{ t: "t63", r: "v1", c: "v", v: String(v) }] }); if (ok) msg(`Tabelul 6.3: după 1 min ${v} mbar (scădere ${sim.v0 - v} mbar/min).`);
}
function inregR(e) {
  if (!sim.termo || !sim.obd) return Cadru.mesajTemporar("Montați termocuplele și conectați testerul OBD.", "atentie");
  const k = cheieRegim(); if (!k) return Cadru.mesajTemporar("Alegeți una dintre turațiile din Tabelul 6.1.", "atentie");
  if (!stabil()) return Cadru.mesajTemporar("Valorile nu s-au stabilizat încă.", "atentie");
  const c = citiri(), n = Math.round(RPM[k]()), cel = ["pcer", "preal", "pos", "T1", "T2", "T3"].map(x => ({ t: "t61", r: k, c: x, v: x === "pos" ? String(c[x]) : x.charAt(0) === "T" ? c[x].toFixed(1) : c[x].toFixed(2) }));
  cel.push({ t: "t61", r: k, c: "n", v: String(c.n) });
  const ok = Cadru.inregistreaza(e, { log: { m: "r", k, n, pcer: c.pcer, preal: c.preal, pos: c.pos, T1: c.T1, T2: c.T2, T3: c.T3 }, celule: cel });
  if (ok) msg(`Tabelul 6.1 (${NUME_R[k]}): p cerută ${fx(c.pcer, 2)} bar, p reală ${fx(c.preal, 2)} bar, VGT ${c.pos} %, T1 ${fx(c.T1, 1)}, T2 ${fx(c.T2, 1)}, T3 ${fx(c.T3, 1)} °C.`);
}
function inregAcc(e, k) {
  if (!sim.acc) return Cadru.mesajTemporar("Înregistrați întâi datalogul accelerării libere.", "atentie");
  const i = sim.iAcc, v = k === "pmax" ? sim.acc.p[i] : Math.round((sim.acc.t[i] - 0.5) * 10) / 10;
  if (k === "t90" && v <= 0) return Cadru.mesajTemporar("Cursorul trebuie să fie după apăsarea pedalei (t > 0,5 s).", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "acc", k, i, v }, celule: [{ t: "t63", r: k, c: "v", v: k === "pmax" ? v.toFixed(2) : v.toFixed(1) }] });
  if (ok) msg(k === "pmax" ? `Tabelul 6.3: p max = ${fx(v, 2)} bar (t = ${fx(sim.acc.t[i], 1)} s).` : `Tabelul 6.3: t₉₀ = ${fx(v, 1)} s (p = ${fx(sim.acc.p[i], 2)} bar).`);
}
function inregDrum(e) {
  const s = MD.drum(P())[sim.iDr]; if (Math.abs(s.n - 2500) > 60) return Cadru.mesajTemporar(`Cursorul este la ${s.n} rot/min: rândul de sarcină plină se ia la ≈ 2500 rot/min (± 60).`, "atentie");
  const cel = ["pcer", "preal", "pos", "T1", "T2", "T3", "n"].map(x => ({ t: "t61", r: "sp", c: x, v: x === "pos" || x === "n" ? String(s[x]) : x.charAt(0) === "T" ? s[x].toFixed(1) : s[x].toFixed(2) }));
  const ok = Cadru.inregistreaza(e, { log: { m: "dl", i: sim.iDr, n: s.n, pcer: s.pcer, preal: s.preal, pos: s.pos, T1: s.T1, T2: s.T2, T3: s.T3 }, celule: cel });
  if (ok) msg(`Tabelul 6.1 (sarcină plină, ${s.n} rot/min): p cerută ${fx(s.pcer, 2)} bar, p reală ${fx(s.preal, 2)} bar, T1 ${fx(s.T1, 1)}, T2 ${fx(s.T2, 1)}, T3 ${fx(s.T3, 1)} °C.`);
}

/* ------------------------------------------------------------------ afișaje */
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (id, on, t1, t0) => { const b = $(id); if (b) { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); } };
  s("#b-vac", sim.vacMontat, "Refă legătura la EVRV", "Racordează pompa de vacuum"); s("#b-cmp", sim.compMontat, "Demontează comparatorul", "Montează comparatorul");
  s("#b-termo", sim.termo, "✓ Termocuple montate", "Montează termocuplele"); s("#b-obd", sim.obd, "✓ Tester OBD conectat", "Conectează testerul OBD");
  $$("[data-n]").forEach(b => b.classList.toggle("activ", sim.merge && Math.abs(RPM[b.dataset.n]() - sim.nT) < 1));
  const c = citiri(); $("#af-st").textContent = sim.merge ? `${c.n} rot/min` : "oprit"; $("#af-p").textContent = fx(c.preal, 2) + " bar"; $("#af-pc").textContent = fx(c.pcer, 2) + " bar";
  $("#af-vgt").textContent = sim.merge ? c.pos + " %" : "—"; $("#af-vac").textContent = sim.vacMontat ? Math.round(sim.vac) + " mbar" : "—"; $("#af-s").textContent = sim.compMontat ? fx(Math.round(MD.cursa(P(), sim.vac, def()) * 100) / 100, 2) + " mm" : "—";
}
function liniiOBD() {
  const c = citiri(), pr = P();
  if (!sim.obd) return null;
  return [["Turație motor", sim.merge ? `${c.n} rot/min` : "0 rot/min"], ["p supraalim. cerută", `${fx(c.pcer, 2)} bar`], ["p supraalim. (MAP)", `${fx(c.preal, 2)} bar`, sim.merge && c.preal < c.pcer - 0.05], ["Poziție actuator VGT", sim.merge ? `${c.pos} %` : "—"], ["Presiune atm. (BARO)", `${fx(pr.patm, 3)} bar`], ["T aer admisie", `${fx(sim.merge ? c.T3 : pr.Ta, 1)} °C`]];
}
function deseneaza() {
  const L = liniiOBD(), el = $("#obd-tab");
  if (el) el.innerHTML = L ? L.map(([a, b, al]) => `<tr><td>${a}</td><td class="${al ? "al" : ""}">${b}</td></tr>`).join("") : `<tr><td colspan="2">testerul nu este conectat</td></tr>`;
  const c = citiri(), et = $("#termo-tab"); if (et) et.innerHTML = sim.termo ? ["T1", "T2", "T3", "T4"].map(k => `<span>${k} <b>${fx(c[k], 1)} °C</b></span>`).join("") : "<span>termocuplele nu sunt montate</span>";
  deseneazaAct(); deseneazaDL();
}
function deseneazaAct() {
  const cv = $("#cv-act"); if (!cv || !cv.getClientRects().length) return;
  const pts = MD.VAC.map(v => [v, num(Cadru.D.t.t62.s["a" + v])]).filter(p => Number.isFinite(p[1]));
  deseneazaGrafic(cv, { xmin: 0, xmax: 700, ymin: 0, ymax: 14, xticks: [0, 100, 200, 300, 400, 500, 600, 700], yticks: [0, 2, 4, 6, 8, 10, 12, 14], xlab: "depresiune [mbar]", ylab: "cursa [mm]",
    serii: [{ tip: "linie", pts, culoare: 0 }, { tip: "pct", pts, culoare: 0 }, ...(sim.vacMontat ? [{ tip: "pct", pts: [[sim.vac, MD.cursa(P(), sim.vac, def())]], culoare: 3, r: 7 }] : [])] });
}
function deseneazaDL() {
  const cv = $("#cv-dl"); if (!cv || !cv.getClientRects().length) return;
  if (sim.panouDL === "acc") {
    const a = sim.acc; if (!a) { deseneazaGrafic(cv, { xmin: 0, xmax: 5, ymin: 0.9, ymax: 1.6, xticks: [0, 1, 2, 3, 4, 5], yticks: [1, 1.2, 1.4, 1.6], xlab: "t [s]", ylab: "p [bar]", serii: [] }); return; }
    const pp = a.t.map((t, i) => [t, a.p[i]]), nn = a.t.map((t, i) => [t, 0.9 + a.n[i] / 4400 * 0.6]), i = sim.iAcc;
    deseneazaGrafic(cv, { xmin: 0, xmax: 5, ymin: 0.9, ymax: 1.6, xticks: [0, 1, 2, 3, 4, 5], yticks: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6], xlab: "t [s]", ylab: "p [bar abs.]",
      serii: [{ tip: "linie", pts: nn, culoare: 2, gros: 1, punctat: true }, { tip: "linie", pts: pp, culoare: 0, gros: 1.6 }, { tip: "pct", pts: pp, culoare: 0, r: 2.2 }, { tip: "linie", pts: [[a.t[i], 0.9], [a.t[i], 1.6]], culoare: 3, gros: 1.2 }, { tip: "pct", pts: [[a.t[i], a.p[i]]], culoare: 3, r: 6 }] });
    $("#dl-cit").innerHTML = `Cursor: t = <b>${fx(a.t[i], 1)} s</b> · p = <b>${fx(a.p[i], 2)} bar</b> · n = ${a.n[i]} rot/min · pedala apăsată la t = 0,5 s · linia punctată: turația (relativ)`;
  } else {
    const D = MD.drum(P()), i = sim.iDr, s = D[i];
    deseneazaGrafic(cv, { xmin: 1000, xmax: 4400, ymin: 0.8, ymax: 2.8, xticks: [1000, 1500, 2000, 2500, 3000, 3500, 4000], yticks: [1, 1.4, 1.8, 2.2, 2.6], xlab: "n [rot/min]", ylab: "p [bar abs.]",
      serii: [{ tip: "linie", pts: D.map(d => [d.n, d.pcer]), culoare: 1, punctat: true, gros: 1.4 }, { tip: "linie", pts: D.map(d => [d.n, d.preal]), culoare: 0, gros: 1.6 }, { tip: "linie", pts: [[s.n, 0.8], [s.n, 2.8]], culoare: 3, gros: 1.2 }, { tip: "pct", pts: [[s.n, s.preal]], culoare: 3, r: 6 }] });
    $("#dl-cit").innerHTML = `Cursor: t = ${fx(s.t, 1)} s · <b>n = ${s.n} rot/min</b> · p cerută ${fx(s.pcer, 2)} bar · <b>p reală ${fx(s.preal, 2)} bar</b> · VGT ${s.pos} % · T1 ${fx(s.T1, 1)} · T2 <b>${fx(s.T2, 1)}</b> · T3 ${fx(s.T3, 1)} °C (linia punctată: p cerută)`;
  }
}

/* ------------------------------------------------------------------ 3D */
const SV = { s3: null };
function porneste3D() {
  const el = $("#st3d"); if (!el) return;
  import(BAZA_COMUN + "turbo3d.js?v=3").then(m => { SV.s3 = m.creeazaStandTurbo(el, { laClic: (k, et) => alegeComp(k, et) }); vedere3d(PASI[pasActiv].vedere); })
    .catch(e => { el.innerHTML = `<p class="nota">Standul 3D nu a putut fi încărcat (${esc(e.message)}): este necesar un browser cu WebGL. Componentele se pot alege din listă:</p><div class="rand-butoane">${Object.keys(COMP).map(k => `<button type="button" data-c3="${k}">${COMP[k][0]}</button>`).join("")}</div>`; $$("#st3d [data-c3]").forEach(b => b.addEventListener("click", () => alegeComp(b.dataset.c3))); });
}
function actualizeaza3D() {
  if (!SV.s3) return; const c = citiri(), pr = P(), L = liniiOBD();
  SV.s3.seteaza({ n: sim.merge ? sim.n : 0, pos: sim.merge ? c.pos / 100 : MD.cursa(pr, sim.vacMontat ? sim.vac : 0, def()) / pr.smax, vacMontat: sim.vacMontat, vac: sim.vacMontat ? sim.vac : 0, pompeaza: sim.t - sim.tPomp < 0.6,
    comp: sim.compMontat, s: MD.cursa(pr, sim.vacMontat ? sim.vac : 0, def()), termo: sim.termo, T: [c.T1, c.T2, c.T3, c.T4], obdConectat: sim.obd, obd: { titlu: "1.5 dCi · Date curente", linii: L ? L.slice(0, 5) : null },
    transparent: sim.transparent, Tgaz: sim.merge ? 180 + sim.n * 0.09 : 25 });
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaSAA6(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date, { num, regresie }), cel = { t61: {}, t62: {}, t63: {} }, F = Number.isFinite;
  MD.REG.concat([["sp"]]).forEach(([k]) => { const r = o.rand[k]; cel.t61[k] = { pic: F(r.pic) ? fx(r.pic, 3) : "", eps: F(r.eps) ? fx(r.eps, 2) : "" }; });
  const sp = o.rand.sp, rez = [
    ["p<sub>1</sub> = p<sub>atm</sub> − Δp<sub>filtru</sub>", F(num(D.date.patm)) ? `${fx(num(D.date.patm) - MD.DPF, 3)} bar` : "—"],
    ["Sarcină plină: π<sub>c</sub> = p<sub>2</sub>/p<sub>1</sub> (6.1)", F(sp.pic) ? `<span style="color:var(--accent)">${fx(sp.pic, 3)}</span>` : "—"],
    ["Sarcină plină: T<sub>2s</sub> = T<sub>1</sub>·π<sub>c</sub><sup>(k−1)/k</sup> (6.2)", F(sp.T2s) ? `${fx(sp.T2s, 1)} °C` : "—"],
    ["Sarcină plină: η<sub>c</sub> = (T<sub>2s</sub> − T<sub>1</sub>)/(T<sub>2</sub> − T<sub>1</sub>) (6.3)", F(sp.eta) ? `<span style="color:var(--accent)">${fx(sp.eta, 3)}</span>` : "—"],
    ["Sarcină plină: ε<sub>IC</sub> = (T<sub>2</sub> − T<sub>3</sub>)/(T<sub>2</sub> − T<sub>amb</sub>) (6.4)", F(sp.eps) ? `<span style="color:var(--accent)">${fx(sp.eps, 3)}</span>` : "—"],
    ["Depresiunea de început a deplasării tijei (extrapolare)", F(o.v0) ? `${fx(o.v0, 0)} mbar` : "—"],
    ["Cursa maximă a tijei", F(o.smax) ? `${fx(o.smax, 2)} mm` : "—"],
    ["Scăderea depresiunii în 1 min (etanșeitatea membranei)", F(o.scurg) ? `${fx(o.scurg, 0)} mbar` : "—"],
    ["Timpul de răspuns t<sub>90</sub> la accelerarea liberă", F(o.lag) ? `${fx(o.lag, 1)} s` : "—"],
    ["Regimul 3000 rot/min pe stand: π<sub>c</sub>, η<sub>c</sub>", F(o.rand.n3000.pic) ? `${fx(o.rand.n3000.pic, 3)}; ${F(o.rand.n3000.eta) ? fx(o.rand.n3000.eta, 2) : "—"} (ΔT mic – precizie redusă)` : "—"]];
  const verdicte = [];
  if (F(sp.eta)) verdicte.push(sp.eta >= 0.62 && sp.eta <= 0.8 ? { tip: "ok", text: `η<sub>c</sub> = ${fx(sp.eta, 2)} – în domeniul uzual 0,65…0,78.` } : { tip: "atentie", text: `η<sub>c</sub> = ${fx(sp.eta, 2)} – în afara domeniului uzual (0,65…0,78): verificați citirile T1, T2.` });
  if (F(sp.eps)) verdicte.push(sp.eps >= 0.6 && sp.eps <= 0.86 ? { tip: "ok", text: `ε<sub>IC</sub> = ${fx(sp.eps, 2)} – intercooler eficient (uzual 0,6…0,85).` } : { tip: "atentie", text: `ε<sub>IC</sub> = ${fx(sp.eps, 2)} – în afara domeniului uzual 0,6…0,85.` });
  if (F(o.scurg)) verdicte.push(o.scurg <= 20 ? { tip: "ok", text: `Depresiunea scade cu ${fx(o.scurg, 0)} mbar/min – membrana actuatorului este etanșă.` } : { tip: "atentie", text: `Depresiunea scade cu ${fx(o.scurg, 0)} mbar/min – membrana actuatorului este neetanșă (presiune de supraalimentare insuficientă).` });
  const r30 = t.t61.n3000 || {}, pc = num(r30.pcer), pR = num(r30.preal); if (F(pc) && F(pR)) verdicte.push(pR < pc - 0.04 ? { tip: "atentie", text: "La 3000 rot/min presiunea reală este mult sub cea cerută: pierderi pe circuit, actuator neetanș sau palete VGT gripate." } : pR > pc + 0.04 ? { tip: "atentie", text: "Presiunea reală depășește presiunea cerută (overboost): VGT blocat închis." } : { tip: "ok", text: "Presiunea reală urmărește presiunea cerută – reglajul funcționează." });
  const pts = (k) => MD.REG.map(([r]) => [num(t.t61[r].n), num(t.t61[r][k])]).filter(p => F(p[0]) && F(p[1]));
  const serii = [{ tip: "linie", pts: pts("pcer"), culoare: 1, punctat: true }, { tip: "pct", pts: pts("pcer"), culoare: 1 }, { tip: "linie", pts: pts("preal"), culoare: 0 }, { tip: "pct", pts: pts("preal"), culoare: 0 }];
  const D2 = MD.drum(P()); serii.push({ tip: "linie", pts: D2.map(d => [d.n, d.preal]), culoare: 2, gros: 1 }); const s = t.t61.sp; if (F(num(s.n))) serii.push({ tip: "pct", pts: [[num(s.n), num(s.preal)]], culoare: 3, r: 6 });
  return { celule: cel, rele: {}, rezultate: rez, verdicte, titluGrafic: "Presiunea de supraalimentare p = f(n): standul fără sarcină și proba de drum la sarcină plină (ca în Fig. 6.2)",
    grafic: { xmin: 500, xmax: 4400, ymin: 0.9, ymax: 2.7, xticks: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000], yticks: [1, 1.4, 1.8, 2.2, 2.6], xlab: "n [rot/min]", ylab: "p [bar abs.]", serii },
    legenda: [["p cerută – stand", "var(--serie-1)", "pct"], ["p reală – stand", "var(--serie-0)", "pct"], ["p reală – drum, sarcină plină", "var(--serie-2)"], ["rândul de sarcină plină", "var(--serie-3)", "pct"]],
    principal: { eticheta: "πc la sarcină plină", valoare: F(sp.pic) ? +sp.pic.toFixed(2) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Motorul nu se pornește cu admisia turbosuflantei deschisă (fără filtru sau furtun): rotorul compresorului se rotește cu peste 100 000 rot/min și poate aspira obiecte sau provoca amputări.</li>
<li>Carcasa turbinei și colectorul de evacuare ating 600…900 °C: se folosesc mănuși termoizolante; senzorii de temperatură se montează numai cu motorul rece.</li>
<li>Furtunurile de supraalimentare sunt sub presiune (până la ≈ 1,5 bar relativ): nu se desfac colierele cu motorul pornit.</li>
<li>Accelerările libere se fac numai la comanda cadrului didactic, fără a depăși turația prescrisă pentru stand.</li></ul></div>
<h2>6.1. Scopul lucrării</h2>
<p>Determinarea presiunii de supraalimentare în funcție de turație, verificarea actuatorului wastegate / VGT și evaluarea eficienței intercoolerului și a compresorului pe baza temperaturilor și presiunilor măsurate.</p>
<h2>6.2. Noțiuni teoretice</h2>
<p>Supraalimentarea crește densitatea aerului admis și, deci, puterea litrică, permițând motoare de cilindree mai mică (downsizing). Turbosuflanta folosește energia gazelor de evacuare; presiunea de supraalimentare se limitează prin supapa de bypass (wastegate), care deviază o parte din gaze pe lângă turbină, sau prin modificarea unghiului paletelor statorului turbinei (geometrie variabilă, VGT), soluție care asigură presiune mare și la turații mici. Actuatorii sunt pneumatici (vacuum) sau electrici, comandați de ECU în buclă închisă după semnalul senzorului MAP. Variantele constructive și funcționarea lor se urmăresc în tabul „Animație (3D)”.</p>
<p>Prin comprimare aerul se încălzește; intercoolerul răcește aerul, crescând densitatea și reducând tendința de detonație și emisiile de NO<sub>x</sub>.</p>
<div class="ec"><span>π<sub>c</sub> = p<sub>2</sub> / p<sub>1</sub></span><span class="nr">(6.1)</span></div>
<div class="ec"><span>T<sub>2s</sub> = T<sub>1</sub> · π<sub>c</sub><sup>(k−1)/k</sup></span><span class="nr">(6.2)</span></div>
<div class="ec"><span>η<sub>c</sub> = (T<sub>2s</sub> − T<sub>1</sub>) / (T<sub>2</sub> − T<sub>1</sub>)</span><span class="nr">(6.3)</span></div>
<div class="ec"><span>ε<sub>IC</sub> = (T<sub>2</sub> − T<sub>3</sub>) / (T<sub>2</sub> − T<sub>amb</sub>)</span><span class="nr">(6.4)</span></div>
<p>unde p<sub>1</sub>, T<sub>1</sub> sunt presiunea și temperatura absolute la intrarea în compresor, p<sub>2</sub>, T<sub>2</sub> la ieșirea din compresor, T<sub>3</sub> la ieșirea din intercooler, T<sub>2s</sub> – temperatura la sfârșitul comprimării izentropice, k = 1,4 – exponentul adiabatic al aerului, iar T<sub>amb</sub> – temperatura mediului. Temperaturile se introduc în kelvini.</p>
<figure><img src="img/fig6_1.jpg" alt="Fig. 6.1" loading="lazy"><figcaption>Fig. 6.1. Schema sistemului de supraalimentare și punctele de măsură</figcaption></figure>
<figure><img src="img/fig6_2.jpg" alt="Fig. 6.2" loading="lazy"><figcaption>Fig. 6.2. Presiunea de supraalimentare și caracteristica actuatorului (exemplu)</figcaption></figure>
<h2>6.3. Aparatură și echipamente</h2>
<ul><li>Stand motor supraalimentat (1.5 dCi), cu sistem de exhaustare</li><li>Tester OBD (presiune de supraalimentare cerută / reală, poziția actuatorului, temperatura aerului)</li><li>Termocupluri sau senzori de temperatură montați înainte și după intercooler</li><li>Pompă de vacuum manuală cu manometru, comparator cu suport magnetic</li><li>Turbosuflante secționate (wastegate și VGT)</li></ul>
<h3>Observații pentru efectuarea și interpretarea măsurărilor</h3>
<ul>
<li><b>Presiunile pentru randamentul compresorului.</b> p<sub>1</sub> se ia egală cu presiunea atmosferică citită de tester (BARO) minus pierderea din filtru, Δp<sub>filtru</sub> ≈ 0,02 bar; p<sub>2</sub> se aproximează cu presiunea reală citită de senzorul MAP (pierderea din intercooler se neglijează).</li>
<li><b>Regimul de sarcină plină</b> se ia din datalogul probei de drum (treapta a 3-a, pedala la fund), la ≈ 2500 rot/min: pe standul fără frână diferențele de temperatură sunt prea mici pentru un randament precis.</li>
<li><b>Verificarea actuatorului:</b> etanșeitatea membranei (depresiunea la început și după 1 minut) și răspunsul la accelerarea liberă – presiunea maximă de supraalimentare și timpul de răspuns t<sub>90</sub>.</li>
</ul>
<h2>6.4. Modul de lucru (în simulator)</h2>
<ol><li>Turbosuflantele secționate și sistemul de supraalimentare pe stand: identificarea componentelor.</li><li>Caracteristica actuatorului pneumatic (pompa de vacuum, comparatorul) și etanșeitatea membranei.</li><li>Presiunea cerută / reală, poziția actuatorului și T<sub>1</sub>, T<sub>2</sub>, T<sub>3</sub> la turațiile din Tabelul 6.1.</li><li>Accelerarea liberă înregistrată cu testerul (turbo-lag).</li><li>Datalogul de drum la sarcină plină.</li></ol>
<h2>6.6. Prelucrarea datelor</h2>
<p>Se calculează π<sub>c</sub> (p<sub>1</sub> ≈ presiunea atmosferică minus pierderea din filtru), T<sub>2s</sub>, η<sub>c</sub> și ε<sub>IC</sub> pentru fiecare regim. Se trasează p = f(n) (cerut / real) și caracteristica actuatorului; se determină depresiunea de început a deplasării tijei.</p>
<h2>6.7. Interpretarea rezultatelor</h2>
<ul><li>Pe standul fără frână presiunea de supraalimentare rămâne mică în regim stabilizat; valorile de sarcină plină (orientativ 1,8…2,5 bar absolut la motoarele actuale) se obțin pe banc cu frână sau din datalog de drum.</li>
<li>O presiune reală mult sub cea cerută indică pierderi pe circuit (furtunuri, intercooler), actuator blocat sau neetanș, palete VGT gripate; o presiune peste cea cerută (overboost) indică wastegate blocat închis (sau VGT blocat închis).</li>
<li>Randamentul izentropic al compresorului este orientativ 0,65…0,78; eficiența intercoolerului 0,6…0,85.</li></ul>
<h2>6.8. Relevanță practică</h2>
<p>Turbosuflanta este prezentă pe marea majoritate a motoarelor noi, inclusiv la hibride; turbosuflantele cu asistare electrică (e-turbo) și controlul presiunii pentru Euro 7 sunt direcții actuale de cercetare și proiectare.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu de calcul</h2>
<p>La sarcină plină și 2500 rot/min: p<sub>atm</sub> = 1,000 bar, p<sub>1</sub> = 0,98 bar, p<sub>2</sub> = 2,20 bar, T<sub>1</sub> = 25 °C, T<sub>2</sub> = 135 °C, T<sub>3</sub> = 45 °C, T<sub>amb</sub> = 20 °C.</p>
<div class="ec"><span>π<sub>c</sub> = 2,20 / 0,98 = 2,245</span><span class="nr">(6.5)</span></div>
<div class="ec"><span>T<sub>2s</sub> = 298,15 · 2,245<sup>0,2857</sup> = 375,6 K = 102,5 °C</span><span class="nr">(6.6)</span></div>
<div class="ec"><span>η<sub>c</sub> = (102,5 − 25) / (135 − 25) = 0,70</span><span class="nr">(6.7)</span></div>
<div class="ec"><span>ε<sub>IC</sub> = (135 − 45) / (135 − 20) = 0,78</span><span class="nr">(6.8)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Cât crește densitatea aerului admis prin supraalimentare cu intercooler față de motorul atmosferic, pentru valorile din exemplu (p = 2,20 bar, T<sub>3</sub> = 45 °C, față de 1,0 bar și 20 °C)?</p>
<details class="sol"><summary>Rezolvare</summary><p>ρ/ρ<sub>0</sub> = (p/p<sub>0</sub>)·(T<sub>0</sub>/T) = 2,20 · 293,15/318,15 = 2,03 – densitatea se dublează; fără intercooler (135 °C) raportul ar fi doar 2,20·293,15/408,15 = 1,58.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Caracteristica actuatorului: 0 mm la 100 și 150 mbar, 2,5 mm la 250 mbar, 7,5 mm la 450 mbar, 10 mm de la 550 mbar. Determinați depresiunea de început a deplasării tijei și panta.</p>
<details class="sol"><summary>Rezolvare</summary><p>Panta = (7,5 − 2,5)/(450 − 250) = 0,025 mm/mbar; începutul: 250 − 2,5/0,025 = 150 mbar; cursa completă la 150 + 10/0,025 = 550 mbar.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>La 2500 rot/min, sarcină plină, testerul arată p cerută = 2,25 bar și p reală = 1,55 bar; poziția actuatorului VGT este 100 %. Diagnostic?</p>
<details class="sol"><summary>Rezolvare</summary><p>ECU comandă închiderea maximă dar presiunea nu crește: pierdere pe circuitul de aer (furtun fisurat, colier, intercooler), palete VGT gripate deschise sau actuator neetanș. Se verifică etanșeitatea circuitului cu aer sub presiune și actuatorul cu pompa de vacuum.</p></details></div>`;
}
const INTREBARI = [
  ["De ce motoarele supraalimentate de cilindree mică au consum mai redus decât cele atmosferice de putere egală?", "La sarcini parțiale (majoritatea timpului) lucrează la sarcină relativă mai mare, cu pierderi de pompaj și de frecare mai mici; masa și frecările motorului mic sunt mai mici, iar energia gazelor de evacuare este recuperată parțial de turbină."],
  ["Comparați funcționarea wastegate și VGT la turație mică.", "La turație mică wastegate este închis, dar turbina (dimensionată pentru turații mari) primește gaze cu viteză mică – presiune redusă; VGT închide paletele, secțiunea de curgere scade, viteza gazelor pe roată crește și presiunea de supraalimentare se obține de la turații mai mici."],
  ["Ce efecte are răcirea intermediară a aerului?", "Densitate mai mare (mai mult aer în cilindru, putere mai mare), temperatură de ardere mai mică (NO<sub>x</sub> mai puține, detonație evitată la benzină), solicitare termică mai mică a pistoanelor și supapelor."],
  ["Ce este turbo-lag-ul și prin ce soluții poate fi redus?", "Întârzierea creșterii presiunii la accelerare, cât timp rotorul accelerează; se reduce prin VGT, twin-scroll, rotoare mici și ușoare (lagăre cu bile), turbosuflante în trepte, asistare electrică (e-turbo) sau compresor electric."]
];
const TEST = [
  { q: "Raportul de comprimare π<sub>c</sub> pentru p<sub>1</sub> = 0,98 bar și p<sub>2</sub> = 2,20 bar este:", o: ["1,22", "2,245", "2,20", "0,445"], c: 1, e: "π<sub>c</sub> = p<sub>2</sub>/p<sub>1</sub>." },
  { q: "Paletele VGT închise la turație mică:", o: ["reduc presiunea", "cresc viteza gazelor pe roată și presiunea", "deviază gazele pe lângă turbină", "opresc turbina"], c: 1, e: "Secțiune mică – viteză mare." },
  { q: "Presiunea reală peste cea cerută (overboost) indică:", o: ["furtun fisurat", "wastegate / VGT blocat închis", "filtru colmatat", "intercooler eficient"], c: 1, e: "Reglajul nu mai poate limita presiunea." },
  { q: "Eficiența intercoolerului ε<sub>IC</sub> = (T<sub>2</sub> − T<sub>3</sub>)/(T<sub>2</sub> − T<sub>amb</sub>) pentru 135, 45 și 20 °C este:", o: ["0,67", "0,78", "0,33", "1,28"], c: 1, e: "90/115." },
  { q: "Actuatorul pneumatic se verifică:", o: ["cu motorul la turație maximă", "cu pompa de vacuum și comparatorul, motorul oprit", "cu multimetrul", "numai vizual"], c: 1, e: "Caracteristica cursă–depresiune și etanșeitatea membranei." }
];
const CSS = `<style>
.saa6-scena #st3d .m3d { height:clamp(380px, 58vh, 620px); }
.saa6-afis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.saa6-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .saa6-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .saa6-afis b { font-size:1.02rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; }
.obd-g { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); gap:.6rem; }
.obd-ecran { background:#06121d; color:#cfe3f5; border-radius:10px; padding:.5rem .7rem; font:13px system-ui; } .obd-ecran h4 { margin:0 0 .3rem; color:#7fb7e8; font-size:.85rem; }
.obd-ecran table { width:100%; border-collapse:collapse; } .obd-ecran td { padding:.18rem 0; } .obd-ecran td:last-child { text-align:right; font:700 14px 'Courier New',monospace; color:#6dff8e; } .obd-ecran td.al { color:#ffb02e !important; }
.termo-lcd { background:#b5c2a6; color:#1b2416; border-radius:10px; padding:.5rem .7rem; display:grid; grid-template-columns:1fr 1fr; gap:.3rem; font:13px system-ui; } .termo-lcd b { font:700 15px 'Courier New',monospace; }
#cv-dl, #cv-act { width:100%; height:260px; display:block; }
#comp-desc { min-height:2.4em; }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); } .pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; } .pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; } .pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; } .pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; } .pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; align-items:center; } .pas-ctl button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); } .pas-ctl .camp { display:block; margin:.35rem 0; } .pas-ctl input[type=range] { width:100%; }
@media (max-width:900px){ .saa6-afis { grid-template-columns:repeat(3,minmax(0,1fr)); } .obd-g { grid-template-columns:1fr; } }
</style>`;

/* ------------------------------------------------------------------ definiția lucrării */
const COLT = [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "pcer", t: "p cerut [bar]", intrare: true }, { k: "preal", t: "p real [bar]", intrare: true }, { k: "pos", t: "Poziție actuator [%]", intrare: true },
  { k: "T1", t: "T<sub>1</sub> [°C]", intrare: true }, { k: "T2", t: "T<sub>2</sub> [°C]", intrare: true }, { k: "T3", t: "T<sub>3</sub> [°C]", intrare: true }, { k: "pic", t: "π<sub>c</sub>" }, { k: "eps", t: "ε<sub>IC</sub>" }];
Cadru.porneste({
  disc: "SAA", nr: 6, cod: "saa-l6",
  titlu: "Sistemul de supraalimentare – presiunea de supraalimentare și actuatorii turbosuflantei",
  scurt: "Sistemul de supraalimentare",
  subtitlu: "Laborator virtual – standul 1.5 dCi cu turbosuflantă VGT: caracteristica actuatorului, presiunea cerută / reală, randamentul compresorului, eficiența intercoolerului, turbo-lag-ul",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261026); },
  date: [{ k: "patm", et: "p atmosferică (BARO) [bar]", v: 1.0, fix: true }, { k: "Ta", et: "T<sub>amb</sub> (T4) [°C]", v: 20, fix: true }, { k: "dpf", et: "Δp filtru de aer [bar]", v: 0.02, fix: true }, { k: "k", et: "k (aer)", v: 1.4, fix: true }],
  tabele: [
    { id: "t61", titlu: "Tabelul 6.1. Presiunea și temperaturile în sistemul de supraalimentare", antetRand: "Regim", nota: "Stand fără sarcină, regim stabilizat; rândul „sarcină plină” – din datalogul probei de drum, la ≈ 2500 rot/min. Presiunile sunt absolute.",
      randuri: [{ k: "ral", et: "ralanti" }, { k: "n1500", et: "1500" }, { k: "n2000", et: "2000" }, { k: "n2500", et: "2500" }, { k: "n3000", et: "3000" }, { k: "sp", et: "sarcină plină (drum)" }], coloane: COLT },
    { id: "t62", titlu: "Tabelul 6.2. Caracteristica actuatorului pneumatic", antetRand: "Depresiune [mbar]", randuri: [{ k: "s", et: "Cursă [mm]" }], coloane: MD.VAC.map(v => ({ k: "a" + v, t: String(v), intrare: true })) },
    { id: "t63", titlu: "Tabelul 6.3. Etanșeitatea actuatorului și răspunsul la accelerarea liberă", antetRand: "Mărimea",
      randuri: [{ k: "v0", et: "Depresiunea inițială [mbar]" }, { k: "v1", et: "Depresiunea după 1 min [mbar]" }, { k: "pmax", et: "p max la accelerare liberă [bar]" }, { k: "t90", et: "Timpul de răspuns t<sub>90</sub> [s]" }], coloane: [{ k: "v", t: "Valoarea", intrare: true }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaSAA6,
  intrebari() {
    return [
      { id: "q1", u: "–", text: "Raportul de comprimare π<sub>c</sub> la sarcină plină (relația 6.1, p<sub>1</sub> = p<sub>atm</sub> − 0,02 bar):", textSimplu: "πc la sarcină plină" },
      { id: "q2", u: "–", text: "Randamentul izentropic al compresorului η<sub>c</sub> la sarcină plină (relațiile 6.2–6.3):", textSimplu: "ηc la sarcină plină" },
      { id: "q3", u: "–", text: "Eficiența intercoolerului ε<sub>IC</sub> la sarcină plină (relația 6.4):", textSimplu: "εIC la sarcină plină" },
      { id: "q4", u: "mbar", text: "Depresiunea de început a deplasării tijei actuatorului (extrapolarea zonei liniare din Tabelul 6.2 la cursa 0):", textSimplu: "Depresiunea de început a deplasării tijei" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    MD.REG.forEach(([k]) => { if (t.t61[k].T2 === "") l.push(`Tabelul 6.1: ${NUME_R[k]}`); }); if (t.t61.sp.T2 === "") l.push("Tabelul 6.1: sarcină plină");
    const a = MD.VAC.filter(v => t.t62.s["a" + v] !== "").length; if (a < 7) l.push(`Tabelul 6.2: ${a}/7 trepte`);
    ["v0", "v1", "pmax", "t90"].forEach(k => { if (t.t63[k].v === "") l.push(`Tabelul 6.3: ${k}`); });
    return l;
  },
  exemplu(D) {
    const pr = MD.parametri(1); D.date.patm = pr.patm; D.date.Ta = pr.Ta;
    MD.REG.forEach(([k, n]) => { const r = MD.regim(pr, n || pr.nRal, ""); Object.assign(D.t.t61[k], { n: String(n || pr.nRal), pcer: r.pcer.toFixed(2), preal: r.preal.toFixed(2), pos: String(r.pos), T1: r.T1.toFixed(1), T2: r.T2.toFixed(1), T3: r.T3.toFixed(1) }); });
    const s = MD.drum(pr).reduce((a, b) => Math.abs(b.n - 2500) < Math.abs(a.n - 2500) ? b : a); Object.assign(D.t.t61.sp, { n: String(s.n), pcer: s.pcer.toFixed(2), preal: s.preal.toFixed(2), pos: String(s.pos), T1: s.T1.toFixed(1), T2: s.T2.toFixed(1), T3: s.T3.toFixed(1) });
    MD.VAC.forEach(v => { D.t.t62.s["a" + v] = (Math.round(MD.cursa(pr, v, "") * 100) / 100).toFixed(2); });
    const r = MD.raspuns(pr, ""); D.t.t63.v0.v = "600"; D.t.t63.v1.v = String(Math.round(600 - pr.leak)); D.t.t63.pmax.v = r.pmax.toFixed(2); D.t.t63.t90.v = r.t90.toFixed(1);
  },
  animatie: {
    titluTab: "Animație: turbosuflanta (3D)", titlu: "Funcționarea turbosuflantei și variantele constructive",
    intro: `<p>Alegeți varianta constructivă și modificați turația și pedala: urmăriți aerul (albastru) și gazele (portocaliu), rotorul, organul de reglare (clapeta wastegate sau paletele VGT) și actuatorul, presiunea reală față de cea cerută de ECU. Butonul <b>Accelerare bruscă</b> arată turbo-lag-ul fiecărei variante. Secțiunea (sfert decupat) și modul transparent arată interiorul; treceți cu mouse-ul peste componente.</p>`,
    dupa: `<p class="nota">Rotația rotorului este afișată mult încetinită (în realitate 100 000…200 000 rot/min). Dinamica este calitativă, pentru comparația variantelor.</p>`,
    modul: "turbo3d.js?v=3", functie: "creeazaAnimatieTurbo"
  },
  referat: {
    scop: "Determinarea presiunii de supraalimentare în funcție de turație, verificarea actuatorului VGT și evaluarea eficienței intercoolerului și a compresorului pe baza temperaturilor și presiunilor măsurate.",
    relatii: "π<sub>c</sub> = p<sub>2</sub>/p<sub>1</sub>; &nbsp; T<sub>2s</sub> = T<sub>1</sub>·π<sub>c</sub><sup>(k−1)/k</sup>; &nbsp; η<sub>c</sub> = (T<sub>2s</sub> − T<sub>1</sub>)/(T<sub>2</sub> − T<sub>1</sub>); &nbsp; ε<sub>IC</sub> = (T<sub>2</sub> − T<sub>3</sub>)/(T<sub>2</sub> − T<sub>amb</sub>).",
    varianta: () => `Standul propriu: p atmosferică ${fx(P().patm, 3)} bar, T<sub>amb</sub> ${fx(P().Ta, 1)} °C, actuatorul, compresorul și intercoolerul proprii, datalogurile proprii.`,
    indicatii: "Comentați p = f(n) pe stand și la sarcină plină, caracteristica actuatorului (începutul deplasării, cursa, etanșeitatea), randamentul compresorului și eficiența intercoolerului față de valorile uzuale, turbo-lag-ul; comparați wastegate și VGT…"
  },
  subsol: "Modelul: regimurile stabilizate pe standul fără sarcină (presiunea cerută / reală, poziția VGT, T1, T2, T3 din randamentul compresorului și eficiența intercoolerului), caracteristica și etanșeitatea actuatorului, accelerarea liberă (răspunsul de ordinul întâi cu timp mort) și datalogul de drum la sarcină plină. Parametrii sunt individuali.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena saa6-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="st3d"><p class="nota">Se încarcă standul 3D…</p></div>
      <div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-tr"> Carcase transparente (turbosuflanta, intercoolerul, filtrul)</label><button type="button" data-v="tot">Vedere generală</button><button type="button" data-v="turbo">Turbosuflanta</button><button type="button" data-v="act">Actuatorul</button><button type="button" data-v="sect">Secționate</button><button type="button" data-v="aparate">Aparatele</button></div>
      <p class="nota" id="comp-desc">Clic pe o componentă (pe stand sau pe turbosuflantele secționate). Particulele: albastru – aerul, portocaliu – gazele de evacuare.</p>
      <div class="saa6-afis"><div><span>Motor</span><b id="af-st">—</b></div><div><span>p reală (MAP)</span><b id="af-p">—</b></div><div><span>p cerută</span><b id="af-pc">—</b></div><div><span>VGT</span><b id="af-vgt">—</b></div><div><span>Vacuum</span><b id="af-vac">—</b></div><div><span>Cursa tijei</span><b id="af-s">—</b></div></div>
      <div class="instr" data-panou="obd"><h3>Testerul OBD și termometrul cu termocuple</h3><div class="obd-g"><div class="obd-ecran"><h4>1.5 dCi · Date curente</h4><table id="obd-tab"></table></div><div class="termo-lcd" id="termo-tab"></div></div></div>
      <div class="instr" data-panou="act" hidden><h3>Caracteristica actuatorului (Tabelul 6.2)</h3><canvas id="cv-act" aria-label="Cursa tijei în funcție de depresiune"></canvas></div>
      <div class="instr" data-panou="dl" hidden><h3>Datalogul testerului</h3><canvas id="cv-dl" aria-label="Datalogul"></canvas><p class="nota" id="dl-cit"></p></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari"><summary>Defecte de diagnosticat (mod demonstrativ)</summary>
        <label class="camp">Situația <select id="in-defect" data-blocat-eval><option value="none">sistem în stare bună</option><option value="vgt">palete VGT gripate (deschise)</option><option value="fisura">furtun de supraalimentare fisurat</option><option value="membrana">membrana actuatorului neetanșă</option><option value="overboost">VGT blocat închis (overboost)</option></select></label></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiestePasi();
      if (!MOD.eval) { C.D.date.patm = P().patm; C.D.date.Ta = P().Ta; C.construiesteDateLucru(); }
      $("#in-defect").addEventListener("change", e => { sim.defect = e.target.value; if (sim.merge) sim.st = { ...MD.regim(P(), sim.nT, def()) }; });
      $("#ck-tr").addEventListener("change", e => { sim.transparent = e.target.checked; });
      $$(".saa6-scena [data-v]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v)));
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval(Pp, C) { Object.assign(C.D.date, { patm: Pp.patm, Ta: Pp.Ta }); sim.defect = "none"; const d = $("#in-defect"); if (d) d.disabled = true; },
    reset() { Object.assign(sim, { merge: false, n: 0, nT: 0, st: null, vacMontat: false, compMontat: false, vac: 0, tV0: null, termo: false, obd: false, acc: null }); },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * sim.rapid, pr = P();
      sim.t += dt;
      // motorul: turația (τ ≈ 0,6 s), presiunile (τ ≈ 1 s), temperaturile (τ ≈ 8 s) spre echilibrul modelului
      if (sim.merge) { sim.n += (sim.nT - sim.n) * Math.min(1, h / 0.6); const e = echilibru(sim.nT), s = sim.st;
        ["pcer", "preal", "pos"].forEach(k => { s[k] += (e[k] - s[k]) * Math.min(1, dt / 1); }); ["T1", "T2", "T3"].forEach(k => { s[k] += (e[k] - s[k]) * Math.min(1, dt / 8); }); }
      else sim.n += (0 - sim.n) * Math.min(1, h / 0.5);
      // actuatorul: scurgerea prin membrană
      if (sim.vacMontat && sim.vac > 0) sim.vac = Math.max(0, sim.vac - MD.scurgere(pr, def()) / 60 * dt);
      if (!vizibil) return;
      actualizeaza3D();
      const now = performance.now();
      if (now - (this._ts || 0) > 250) { this._ts = now; actualizeazaPasi(); deseneaza(); C.stare(1, sim.merge ? `motor pornit – ${Math.round(sim.n / 10) * 10} rot/min` : "motor oprit", sim.merge ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { deseneaza(); },
    formule() { return []; }
  }
});
