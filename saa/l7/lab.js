/* SAA – Lucrarea 7. Sistemul de pornire și bilanțul energetic al sistemelor stop-start și mild-hybrid 48 V (standul 1.4 MPI).
   Simulator: standul 3D cu motorul 1.4 MPI, volantul cu coroana, demarorul cu releu și reductor planetar (carcasele pot fi făcute
   transparente), alternatorul, bateria EFB/AGM cu IBS, cablurile de plus și de masă, consumatorii, panoul cu cheia și siguranța pompei;
   pe cărucior: osciloscopul cu cleștele ampermetric DC, multimetrul (U2/U3), testerul de baterie; masa cu panopliile (demaror secționat,
   BSG 48 V, baterie 48 V, DC/DC). Panoul din dreapta conduce lucrarea pas cu pas; oscilogramele se citesc cu cursoarele A și B
   (vârful, media, durata, integrala pe fereastră) și se pot exporta CSV. Tabul „Animație” arată cuplarea demarorului și sistemul 48 V. */
"use strict";
const MD = MODELE["saa-l7"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);
const cl = (x, a, b) => Math.max(a, Math.min(b, x));

/* ------------------------------------------------------------------ starea */
const sim = {
  t: 0, rapid: 1, defect: "none", ochelari: false, bijuterii: false, comp: {}, transparent: false,
  tester: false, testT: null, testRez: null, sig: true, cleste: null, osc: false, dmm: null, cons: false,
  crank: false, tCrank: 0, tUltimaAntr: -1e9, merge: false, tRun: 0, consStart: false, capt: { antr: null, porn: null }, viz: "antr", cA: 0, cB: 0, live: null, oscVer: 0
};
const def = () => sim.defect === "none" ? "" : sim.defect;
const DTs = MD.DT, PAUZA = 30;

/* ------------------------------------------------------------------ componentele (identificare) */
const COMP = {
  pinion: ["Pinionul cu roata liberă", "Pinionul angrenează coroana numai la pornire; roata liberă cu role transmite cuplul spre motor și se decuplează când motorul pornește (indusul nu este antrenat la turații mari)."],
  furca: ["Furca de cuplare", "Pârghia acționată de plonjorul releului împinge pinionul spre coroană; arcul o readuce la eliberarea cheii."],
  arbore: ["Arborele cu caneluri elicoidale", "Pinionul se rotește ușor în timp ce avansează și intră mai ușor între dinții coroanei."],
  carcasaF: ["Carcasa din față", "Aluminiu turnat, cu nasul deschis spre coroană și flanșa de prindere pe carcasa ambreiajului."],
  releu: ["Releul electromagnetic (solenoidul)", "Bobina de atragere și bobina de menținere trag plonjorul: acesta împinge pinionul (prin furcă) și închide puntea de contact a circuitului de putere."],
  borne: ["Bornele 30, 50 și M", "30 – plus permanent de la baterie (cablu gros); 50 – comanda de pornire; M – legătura releu → indus."],
  reductor: ["Reductorul planetar", "i ≈ 4…5: indus mic și rapid, cuplu mare la pinion – soluția demaroarelor moderne și a celor întărite pentru stop-start."],
  stator: ["Statorul cu magneți permanenți", "Jugul de oțel cu magneți de ferită (excitație permanentă); demaroarele mari folosesc bobine de excitație serie."],
  indus: ["Indusul (rotorul)", "Bobinaj din bare de cupru; la rotorul blocat curentul este limitat numai de rezistențele circuitului – de aici vârful de curent."],
  colector: ["Colectorul și periile", "Comută curentul în bobinaj; uzura periilor și a colectorului crește căderea de tensiune și curentul."],
  capac: ["Capacul din spate", "Lagărul indusului și port-periile."],
  coroana: ["Coroana volantului", "≈ 110…130 dinți; raportul pinion–coroană ≈ 1:11…1:13 face ca turația de antrenare să fie ≈ 150…250 rot/min."],
  volant: ["Volantul", "Masa de inerție a motorului; poartă coroana dințată."],
  baterie: ["Bateria EFB / AGM", "Bateriile pentru stop-start suportă mult mai multe cicluri de descărcare parțială decât cele clasice (EFB – plăci cu aditivi de carbon; AGM – electrolit absorbit în separatoare din fibră de sticlă)."],
  ibs: ["Senzorul de baterie IBS", "Pe borna (−): curent, tensiune, temperatură → SOC, SOH, capacitatea de pornire; ECU inhibă stop-start-ul sub un prag."],
  prefuse: ["Siguranța de putere (pre-fuse)", "Protejează cablurile alternatorului și ale consumatorilor; circuitul demarorului nu are siguranță."],
  cablu: ["Cablurile de plus", "Cablul de putere al demarorului (25…35 mm²) și cablul de încărcare de la alternator."],
  masa: ["Circuitul de masă", "Cablul baterie (−) → bloc și banda de masă; o legătură slăbită produce căderi mari de tensiune la pornire."],
  alternator: ["Alternatorul", "Reîncarcă bateria după pornire; regulatorul menține 14,0…14,8 V; la ralanti curentul disponibil este limitat."],
  curea: ["Cureaua Poly-V și întinzătorul", "Antrenează alternatorul; la mild-hybrid cureaua transmite cuplul în ambele sensuri (întinzător cu două brațe)."],
  cheie: ["Contactul cu cheie", "Poziția START alimentează borna 50 (la stop-start comanda vine de la ECU prin releul de pornire)."],
  sigPompa: ["Siguranța pompei de combustibil", "Se scoate pentru a împiedica pornirea în timpul măsurării antrenării."],
  ecu: ["Calculatorul motorului", "Strategia stop-start: oprește motorul la staționare și îl repornește la eliberarea frânei / apăsarea ambreiajului, dacă IBS permite."],
  consumatori: ["Consumatorii", "Proiectoarele și electroventilatorul – folosiți la măsurarea curentului de încărcare cu sarcină."],
  bsg: ["Alternatorul-demaror BSG 48 V", "Mașină electrică antrenată prin curea, cu invertor: repornire, recuperare la frânare (8…15 kW), asistare."],
  bat48: ["Bateria 48 V Li-ion", "0,4…1 kWh, sub pragul de 60 V c.c.; stochează energia recuperată."],
  dcdc: ["Convertorul DC/DC 48/12 V", "Alimentează rețeaua de 12 V și bateria de 12 V din sistemul de 48 V."],
  motor: ["Motorul 1.4 MPI", "Motorul standului (4 cilindri în linie, injecție multipunct)."]
};
const APARATE = { osc: "Osciloscopul", cleste: "Cleștele ampermetric DC", dmm: "Multimetrul", tester: "Testerul de baterie" };
const NCOMP = Object.keys(COMP).length, MINCOMP = 12;
function alegeComp(k, et) {
  if (!COMP[k]) { $("#comp-desc").innerHTML = esc(et || APARATE[k] || ""); return; }
  sim.comp[k] = true; $("#comp-desc").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}${et ? `<br><span class="nota">${esc(et)}</span>` : ""}`; actualizeazaPasi();
}

/* ------------------------------------------------------------------ pașii */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const pauzaRamasa = () => Math.max(0, PAUZA - (sim.t - sim.tUltimaAntr));
const BTN_ANTR = `<div class="rand-butoane"><button type="button" class="primar" data-antr>Cheia pe START</button><button type="button" data-elib>Eliberează cheia</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10 (pauze)</label></div>`;
const OSC_CTL = (f) => `<div class="rand-butoane"><button type="button" data-io="ivf" data-f="${f}">● I vârf → T 7.1</button><button type="button" data-io="umin" data-f="${f}">● U min → T 7.1</button><button type="button" data-io="iantr" data-f="${f}">● I, U antrenare (medie A–B) → T 7.1</button><button type="button" data-io="tp" data-f="${f}">● t<sub>p</sub> = B − A → T 7.1</button></div>`;
const PASI = [
  { t: "Identificarea și NSSM", tab: "panopliile și sistemul pe stand", vedere: "masa", panou: "inst",
    instr: ["NSSM: bateria poate debita sute de amperi – fără inele, brățări, ceas; nu se scurtcircuitează bornele; hidrogenul degajat este exploziv; electrolitul este coroziv – ochelari și mănuși.",
      `Pe panoplii (masa din stânga) și pe stand identificați componentele (clic pe ele): pinionul, furca, releul, bornele, reductorul, indusul, colectorul, coroana, bateria, IBS, cablurile, BSG, bateria 48 V, DC/DC (minimum ${MINCOMP}).`],
    ver: () => [[sim.ochelari, "ochelari și mănuși de protecție"], [sim.bijuterii, "inele, brățări, ceas îndepărtate"], [Object.keys(sim.comp).length >= MINCOMP, `componente identificate: ${Object.keys(sim.comp).length}/${NCOMP} (minimum ${MINCOMP})`]],
    prog: () => (sim.ochelari ? 1 : 0) + (sim.bijuterii ? 1 : 0) + (Object.keys(sim.comp).length >= MINCOMP ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-och"> Ochelari și mănuși</label><label class="bifa"><input type="checkbox" id="ck-bij"> Fără inele / ceas</label></div>
      <div class="rand-butoane"><button type="button" data-v="masa">Masa cu panopliile</button><button type="button" data-v="dem">Demarorul pe stand</button><button type="button" data-v="bat">Bateria</button></div>` },
  { t: "Testul bateriei", tab: "Tabelul 7.0 (completare)", vedere: "bat", panou: "inst",
    instr: ["Motorul oprit, consumatorii opriți. Conectați testerul de baterie: clema roșie pe borna (+), apoi clema neagră pe borna (−). Pe eticheta bateriei se citesc capacitatea C<sub>n</sub> și curentul CCA nominal (în Date de lucru).",
      "Porniți testul (≈ 3 s) și înregistrați tensiunea în gol, rezistența internă, CCA estimat și starea (SOH) în Tabelul 7.0."],
    ver: () => [[!sim.merge && !sim.crank, "motor oprit"], [!sim.cons, "consumatori opriți"], [sim.tester, "testerul conectat"], [!!sim.testRez, sim.testRez ? "test finalizat" : sim.testT != null ? "testare…" : "testul nepornit"]],
    prog: () => ["U0", "Ri", "CCA", "SOH"].filter(k => pe("t70", k, "v")).length, tot: 4,
    ctl: `<div class="rand-butoane"><button type="button" data-tb>Conectează testerul</button><button type="button" class="primar" id="b-test">Pornește testul</button></div>`,
    buton: ["● Rezultatele → Tabelul 7.0", e => inregTester(e)] },
  { t: "Pregătirea măsurării", tab: "pornirea împiedicată, cleștele, osciloscopul", vedere: "dem", panou: "osc",
    instr: ["Împiedicați pornirea motorului: scoateți siguranța pompei de combustibil din panoul standului (metoda indicată de cadrul didactic).",
      "Montați cleștele ampermetric (zero făcut, săgeata spre demaror) pe cablul (+) al demarorului; conectați osciloscopul: CH1 – cleștele, CH2 – tensiunea la bornele bateriei."],
    ver: () => [[!sim.tester, "testerul de baterie deconectat"], [!sim.sig, sim.sig ? "siguranța pompei este montată (motorul ar porni)" : "siguranța pompei scoasă – pornire împiedicată"], [sim.cleste === "dem", "cleștele pe cablul (+) al demarorului"], [sim.osc, "osciloscopul conectat (CH1 clește, CH2 baterie)"]],
    prog: () => (!sim.sig ? 1 : 0) + (sim.cleste === "dem" ? 1 : 0) + (sim.osc ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" data-tb>Deconectează testerul</button><button type="button" id="b-sig">Scoate siguranța pompei</button><button type="button" id="b-cl-dem">Cleștele pe cablul demarorului</button><button type="button" id="b-osc">Conectează osciloscopul</button></div>` },
  { t: "Antrenarea și oscilograma", tab: "Tabelul 7.1 – vârf, medie, minim, t<sub>p</sub>; T 7.2", vedere: "dem", panou: "osc",
    instr: ["Antrenați motorul 3…5 s: „Cheia pe START”, apoi „Eliberează cheia” (o antrenare nu depășește 10 s; pauză minimum 30 s între antrenări). Oscilograma se salvează automat.",
      "Cu cursoarele A și B: fereastra care cuprinde vârful → I<sub>vârf</sub> și U<sub>min</sub>; fereastra pe zona de antrenare stabilizată (după vârf, înainte de eliberare) → curentul și tensiunea medii; A pe începutul și B pe sfârșitul curentului → t<sub>p</sub>.",
      "Fereastra care cuprinde tot curentul → integrala (relațiile 7.3–7.4) în Tabelul 7.2, rândul „antrenare”. Oscilograma se poate exporta CSV pentru calculul în Excel / Python."],
    ver: () => { const o = sim.capt.antr; return [[!sim.sig && sim.cleste === "dem" && sim.osc, "pornire împiedicată, clește și osciloscop (pasul 3)"], [!!o, o ? `oscilograma antrenării: t<sub>p</sub> ≈ ${fx(o.tp, 2)} s` : "oscilograma nu este înregistrată"], [!!o && o.tp >= 2.8 && o.tp <= 5.5, "antrenare de 3…5 s"]]; },
    prog: () => ["ivf", "umin", "iantr", "tp"].filter(k => pe("t71", "v", k)).length + (pe("t72", "antr", "E") ? 1 : 0), tot: 5,
    ctl: BTN_ANTR + OSC_CTL("antr") + `<div class="rand-butoane"><button type="button" data-io="int" data-f="antr">● Integrala A–B → T 7.2 (antrenare)</button></div>` },
  { t: "Căderile de tensiune pe circuit", tab: "Tabelul 7.1 – ΔU (+) și ΔU masă", vedere: "dem", panou: "inst",
    instr: ["Conectați multimetrul (V c.c.) în punctul U2: sonda roșie pe borna (+) a bateriei, sonda neagră pe borna 30 a demarorului (căderea pe circuitul de plus).",
      "Antrenați motorul și, după ≈ 1 s de antrenare, înregistrați indicația; eliberați cheia. După pauză, repetați în punctul U3: sonda roșie pe carcasa demarorului, sonda neagră pe borna (−) a bateriei (circuitul de masă)."],
    ver: () => [[!sim.sig, "pornire împiedicată"], [!!sim.dmm, sim.dmm ? `multimetrul în punctul ${sim.dmm}` : "multimetrul neconectat"], [sim.crank && sim.tCrank >= 1, sim.crank ? (sim.tCrank >= 1 ? "antrenare – indicație stabilă" : "antrenare – indicația se stabilizează…") : "motorul nu este antrenat"]],
    prog: () => ["dup", "dum"].filter(k => pe("t71", "v", k)).length, tot: 2,
    ctl: `<div class="rand-butoane"><button type="button" data-dmm="U2">Multimetrul în U2 (circuit +)</button><button type="button" data-dmm="U3">Multimetrul în U3 (masă)</button><button type="button" data-dmm="">Deconectează</button></div>` + BTN_ANTR,
    buton: ["● Indicația multimetrului → Tabelul 7.1", e => inregDU(e)] },
  { t: "Pornirea reală", tab: "Tabelul 7.2 – rândul „pornirea reală”", vedere: "dem", panou: "osc",
    instr: ["Deconectați multimetrul; montați la loc siguranța pompei. Cleștele rămâne pe cablul demarorului.",
      "Porniți motorul (cheia pe START; motorul pornește singur, cheia se eliberează la pornire). Pe oscilograma pornirii, cu fereastra A–B care cuprinde tot curentul, înregistrați integrala în Tabelul 7.2 (rândul „pornirea reală”). Opriți motorul."],
    ver: () => [[!sim.dmm, "multimetrul deconectat"], [sim.sig, "siguranța pompei montată"], [sim.cleste === "dem" && sim.osc, "cleștele pe cablul demarorului, osciloscopul conectat"], [!!sim.capt.porn, sim.capt.porn ? "oscilograma pornirii înregistrată" : "oscilograma pornirii – neînregistrată"]],
    prog: () => pe("t72", "porn", "E") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><button type="button" data-dmm="">Deconectează multimetrul</button><button type="button" id="b-sig2">Montează siguranța pompei</button><button type="button" data-oprire>Oprește motorul</button></div>` + BTN_ANTR + `<div class="rand-butoane"><button type="button" class="primar" data-io="int" data-f="porn">● Integrala A–B → T 7.2 (pornirea reală)</button></div>` },
  { t: "Reîncărcarea bateriei", tab: "Tabelul 7.3; bilanțul – Tabelul 7.4", vedere: "bat", panou: "inst",
    instr: ["Cu motorul oprit, mutați cleștele pe cablul (+) principal al bateriei (curentul de încărcare / descărcare a bateriei).",
      "Porniți motorul fără consumatori și înregistrați curentul de încărcare și tensiunea bateriei la momentele din Tabelul 7.3 (± 1,5 s).",
      "Opriți motorul, porniți consumatorii (proiectoarele, ventilatorul), reporniți și înregistrați rândul „cu consumatori”. Bilanțul stop-start (Tabelul 7.4) se calculează în tabul Determinări cu scenariul vostru."],
    ver: () => [[sim.cleste === "inc", "cleștele pe cablul principal al bateriei"], [sim.sig, "siguranța pompei montată"], [sim.merge, sim.merge ? `motor pornit – t = ${fx(sim.tRun, 0)} s ${sim.consStart ? "(cu consumatori)" : "(fără consumatori)"}` : "motorul oprit"], [!sim.merge || sim.cons === sim.consStart, "consumatorii nemodificați de la pornire"]],
    prog: () => MD.MOM.filter(s => pe("t73", "f", "a" + s)).length + MD.MOM.filter(s => pe("t73", "c", "a" + s)).length, tot: 14,
    ctl: `<div class="rand-butoane"><button type="button" id="b-cl-inc">Cleștele pe cablul bateriei</button><button type="button" id="b-cons">Pornește consumatorii</button><button type="button" data-oprire>Oprește motorul</button></div>` + BTN_ANTR,
    buton: ["● Citirea → Tabelul 7.3", e => inregInc(e)] }
];
let pasActiv = 0;
const VEDERI = { tot: [[1.6, 1.25, 1.8], [0.15, 0.55, 0.15]], dem: [[0.25, 0.75, 0.75], [-0.22, 0.52, 0.12]], bat: [[0.5, 0.95, 0.95], [0.78, 0.5, 0.22]], masa: [[-0.5, 1.3, 1.35], [-1.05, 0.86, 0.5]], aparate: [[1.6, 1.15, 1.5], [1.15, 0.65, 0.6]] };
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
  $$(".instr[data-panou]").forEach(el => { el.hidden = el.dataset.panou !== p.panou; });
  if (i === 3 && sim.capt.antr) arataCapt("antr"); if (i === 5 && sim.capt.porn) arataCapt("porn");
  vedere3d(p.vedere); actualizeazaPasi(); deseneaza();
}

/* ------------------------------------------------------------------ comenzile */
function on(sel, f) { $$(sel).forEach(b => b.addEventListener("click", f)); }
function msg(t) { $("#msg-inreg").innerHTML = t; }
function legaComenzi() {
  $("#ck-och").addEventListener("change", e => { sim.ochelari = e.target.checked; actualizeazaPasi(); }); $("#ck-bij").addEventListener("change", e => { sim.bijuterii = e.target.checked; actualizeazaPasi(); });
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked ? 10 : 1; $$(".ck-rapid").forEach(x => x.checked = e.target.checked); }));
  $$("#pasi [data-v]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v)));
  on("[data-tb]", () => { if (sim.merge || sim.crank) return Cadru.mesajTemporar("Testul bateriei se face cu motorul oprit.", "atentie"); sim.tester = !sim.tester; sim.testT = null; sim.testRez = null; });
  on("#b-test", () => { if (!sim.tester) return Cadru.mesajTemporar("Conectați testerul la bornele bateriei.", "atentie"); if (sim.cons) return Cadru.mesajTemporar("Opriți consumatorii: testul se face cu bateria în repaus.", "atentie"); sim.testT = sim.t; sim.testRez = null; });
  const sig = () => { if (sim.merge || sim.crank) return Cadru.mesajTemporar("Siguranța se manevrează cu contactul oprit.", "atentie"); sim.sig = !sim.sig; };
  on("#b-sig", sig); on("#b-sig2", sig);
  const clest = k => { if (sim.crank) return Cadru.mesajTemporar("Nu în timpul antrenării.", "atentie"); sim.cleste = sim.cleste === k ? null : k; };
  on("#b-cl-dem", () => clest("dem")); on("#b-cl-inc", () => clest("inc"));
  on("#b-osc", () => { sim.osc = !sim.osc; });
  on("[data-dmm]", e => { const k = e.currentTarget.dataset.dmm; if (sim.crank) return Cadru.mesajTemporar("Mutați sondele numai cu cheia eliberată.", "atentie"); sim.dmm = k || null; });
  on("#b-cons", () => { sim.cons = !sim.cons; });
  on("[data-antr]", () => antrenare());
  on("[data-elib]", () => elibereaza());
  on("[data-oprire]", () => { if (sim.crank) return; sim.merge = false; sim.tRun = 0; });
  $$("[data-io]").forEach(b => b.addEventListener("click", e => inregOsc(e, b.dataset.io, b.dataset.f)));
}
function antrenare() {
  if (!sim.ochelari || !sim.bijuterii) return Cadru.mesajTemporar("NSSM: ochelari, mănuși și fără inele / ceas (pasul 1).", "atentie");
  if (sim.merge) return Cadru.mesajTemporar("Motorul funcționează – opriți-l înainte de o nouă pornire.", "atentie");
  if (sim.crank) return;
  if (sim.tester) return Cadru.mesajTemporar("Deconectați testerul de baterie înainte de pornire.", "atentie");
  const r = pauzaRamasa(); if (r > 0) return Cadru.mesajTemporar(`NSSM: pauză între antrenări – mai așteptați ${Math.ceil(r)} s (se poate accelera cu „Timp ×10”).`, "atentie");
  sim.crank = true; sim.tCrank = 0; sim.t0Crank = performance.now(); sim.live = null; sim.capF = sim.sig ? "porn" : "antr";
  Cadru.mesajTemporar(sim.sig ? "Cheia pe START: motorul este antrenat și va porni." : "Cheia pe START: antrenare cu pornirea împiedicată – eliberați cheia după 3…5 s.", "");
}
function elibereaza(auto) {
  if (!sim.crank) return;
  sim.tCrank = (performance.now() - sim.t0Crank) / 1000; sim.crank = false; sim.tUltimaAntr = sim.t; const tp = Math.round(sim.tCrank * 100) / 100, pr = P();
  const pornit = sim.sig && sim.tCrank >= MD.efectiv(pr, def()).tF;
  if (pornit) { sim.merge = true; sim.tRun = 0; sim.consStart = sim.cons; }
  if (sim.osc && sim.cleste === "dem") {
    if (pornit) { sim.capt.porn = MD.oscilograma(pr, "porn", 0, def()); arataCapt("porn"); msg("Oscilograma pornirii reale a fost salvată."); }
    else if (tp >= 0.3) { sim.capt.antr = MD.oscilograma(pr, "antr", tp, def()); arataCapt("antr"); msg(`Oscilograma antrenării a fost salvată (t<sub>p</sub> ≈ ${fx(tp, 2)} s).`); }
  }
  if (auto === "10s") Cadru.mesajTemporar("NSSM: antrenarea a fost întreruptă la 10 s.", "atentie");
  else if (pornit) Cadru.mesajTemporar("Motorul a pornit (ralanti ≈ 800 rot/min); cheia a revenit pe contact.", "ok");
  sim.live = null; sim.oscVer++;
}
function arataCapt(f) {
  const o = sim.capt[f]; if (!o) return; sim.viz = f; const ix = MD.indiciCurent(o);
  sim.cA = Math.max(0, ix[0] - 25); sim.cB = Math.min(o.i.length - 1, ix[1] + 25);
  const a = $("#cur-a"), b = $("#cur-b"); if (a) { a.max = b.max = o.i.length - 1; a.value = sim.cA; b.value = sim.cB; }
  $$("[data-capt]").forEach(x => x.classList.toggle("activ", x.dataset.capt === f)); sim.oscVer++; deseneazaOsc();
}

/* ------------------------------------------------------------------ înregistrările */
function inregTester(e) {
  if (!sim.testRez) return Cadru.mesajTemporar("Efectuați testul bateriei.", "atentie");
  const r = sim.testRez;
  const ok = Cadru.inregistreaza(e, { log: { m: "bat", U0: r.U0, Ri: r.Ri, CCA: r.CCA, SOH: r.SOH }, celule: [{ t: "t70", r: "U0", c: "v", v: r.U0.toFixed(2) }, { t: "t70", r: "Ri", c: "v", v: r.Ri.toFixed(2) }, { t: "t70", r: "CCA", c: "v", v: String(r.CCA) }, { t: "t70", r: "SOH", c: "v", v: String(r.SOH) }] });
  if (ok) msg(`Tabelul 7.0: U<sub>0</sub> = ${fx(r.U0, 2)} V, R<sub>i</sub> = ${fx(r.Ri, 2)} mΩ, CCA = ${r.CCA} A, SOH = ${r.SOH} %.`);
}
function inregOsc(e, k, f) {
  const o = sim.capt[f]; if (!o) return Cadru.mesajTemporar(f === "porn" ? "Înregistrați întâi oscilograma pornirii reale (pasul 6)." : "Înregistrați întâi oscilograma antrenării (pasul 4).", "atentie");
  if (sim.viz !== f) { arataCapt(f); return Cadru.mesajTemporar("Am afișat oscilograma corespunzătoare – poziționați cursoarele A și B.", "atentie"); }
  const i0 = Math.min(sim.cA, sim.cB), i1 = Math.max(sim.cA, sim.cB), w = MD.fereastra(o, i0, i1), ix = MD.indiciCurent(o), N = o.i.length;
  if (f === "antr" && k !== "int" && !(o.tp >= 2.8 && o.tp <= 5.5)) return Cadru.mesajTemporar(`Tabelul 7.1 cere o antrenare de 3…5 s (aceasta: ${fx(o.tp, 2)} s). Repetați antrenarea.`, "atentie");
  const iPk = o.i.indexOf(Math.max(...o.i)), iUm = o.u.indexOf(Math.min(...o.u));
  const base = { m: "osc", f, tp: f === "porn" ? 0 : o.tp, k, i0, i1 };
  let log, cel, t;
  if (k === "ivf") { if (iPk < i0 || iPk > i1) return Cadru.mesajTemporar("Fereastra A–B nu cuprinde vârful curentului.", "atentie"); log = { ...base, v: w.imax }; cel = [{ t: "t71", r: "v", c: "ivf", v: w.imax.toFixed(1) }]; t = `I<sub>vârf</sub> = ${fx(w.imax, 1)} A`; }
  else if (k === "umin") { if (iUm < i0 || iUm > i1) return Cadru.mesajTemporar("Fereastra A–B nu cuprinde minimul tensiunii.", "atentie"); log = { ...base, v: w.umin }; cel = [{ t: "t71", r: "v", c: "umin", v: w.umin.toFixed(2) }]; t = `U<sub>min</sub> = ${fx(w.umin, 2)} V`; }
  else if (k === "iantr") {
    const a0 = Math.round((MD.PRE + 0.03 + 0.15) / DTs), b0 = Math.round((MD.PRE + o.tk) / DTs) - 5;
    if (i0 < a0) return Cadru.mesajTemporar("Cursorul A trebuie pus după vârf (zona de antrenare stabilizată).", "atentie");
    if (i1 > b0) return Cadru.mesajTemporar("Cursorul B trebuie pus înainte de eliberarea cheii.", "atentie");
    if (w.dt < 0.5) return Cadru.mesajTemporar("Fereastra de mediere trebuie să aibă cel puțin 0,5 s (mai multe compresii).", "atentie");
    log = { ...base, v: w.imed, u: w.umed }; cel = [{ t: "t71", r: "v", c: "iantr", v: w.imed.toFixed(1) }, { t: "t71", r: "v", c: "uantr", v: w.umed.toFixed(2) }]; t = `I<sub>antrenare</sub> = ${fx(w.imed, 1)} A, U<sub>antrenare</sub> = ${fx(w.umed, 2)} V (medii pe ${fx(w.dt, 2)} s)`; }
  else if (k === "tp") { if (Math.abs(i0 - ix[0]) > 5 || Math.abs(i1 - ix[1]) > 5) return Cadru.mesajTemporar(`Puneți A pe începutul curentului și B pe sfârșitul lui (± 0,01 s; pragul ${MD.PRAG} A). Folosiți butoanele ◀ ▶ pentru reglajul fin.`, "atentie");
    log = { ...base, v: w.dt }; cel = [{ t: "t71", r: "v", c: "tp", v: w.dt.toFixed(2) }]; t = `t<sub>p</sub> = ${fx(w.dt, 3)} s`; }
  else if (k === "int") { if (i0 > ix[0] || i1 < ix[1]) return Cadru.mesajTemporar("Fereastra A–B trebuie să cuprindă tot curentul (de la cuplarea releului până la anularea curentului).", "atentie");
    log = { ...base, E: w.E, Q: w.Q, Pmax: w.Pmax, Pmed: w.Pmed }; cel = [["E", w.E, 0], ["Q", w.Q, 1], ["Pmax", w.Pmax, 0], ["Pmed", w.Pmed, 0]].map(([c, v, n]) => ({ t: "t72", r: f, c, v: v.toFixed(n) }));
    t = `E<sub>p</sub> = ${w.E} J, Q<sub>p</sub> = ${fx(w.Q, 1)} mAh, P<sub>max</sub> = ${w.Pmax} W, P<sub>medie</sub> = ${w.Pmed} W`; }
  if (Cadru.inregistreaza(e, { log, celule: cel })) msg(`${k === "int" ? "Tabelul 7.2" : "Tabelul 7.1"}: ${t}.`);
}
function inregDU(e) {
  if (!sim.dmm) return Cadru.mesajTemporar("Conectați multimetrul în U2 sau U3.", "atentie");
  if (!sim.crank || sim.tCrank < 1) return Cadru.mesajTemporar("Citirea se face în timpul antrenării, după ≈ 1 s.", "atentie");
  if (sim.capF !== "antr") return Cadru.mesajTemporar("Măsurarea se face cu pornirea împiedicată (siguranța pompei scoasă).", "atentie");
  const k = sim.dmm === "U2" ? "p" : "m", v = MD.cadere(P(), k, def());
  const ok = Cadru.inregistreaza(e, { log: { m: "du", k, v }, celule: [{ t: "t71", r: "v", c: k === "p" ? "dup" : "dum", v: v.toFixed(2) }] });
  if (ok) msg(`Tabelul 7.1: ΔU ${k === "p" ? "circuit (+)" : "circuit masă"} = ${fx(v, 2)} V. Eliberați cheia.`);
}
function inregInc(e) {
  if (sim.cleste !== "inc") return Cadru.mesajTemporar("Cleștele trebuie mutat pe cablul (+) principal al bateriei.", "atentie");
  if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie");
  if (sim.cons !== sim.consStart) return Cadru.mesajTemporar("Consumatorii au fost modificați după pornire: opriți motorul și reporniți în configurația dorită.", "atentie");
  const s = MD.MOM.find(m => Math.abs(sim.tRun - m) <= 1.5); if (s == null) return Cadru.mesajTemporar(`t = ${fx(sim.tRun, 1)} s: citirile se fac la ${MD.MOM.join(", ")} s după pornire (± 1,5 s).`, "atentie");
  const k = sim.consStart ? "c" : "f", z = MD.incarcare(P(), s, sim.consStart, def());
  const cel = [{ t: "t73", r: k, c: "a" + s, v: z.I.toFixed(1) }]; if (k === "f") cel.push({ t: "t73", r: "u", c: "a" + s, v: z.U.toFixed(2) });
  const ok = Cadru.inregistreaza(e, { log: { m: "inc", k, s, I: z.I, U: z.U }, celule: cel });
  if (ok) msg(`Tabelul 7.3 (${k === "f" ? "fără" : "cu"} consumatori, t = ${s} s): I<sub>înc</sub> = ${fx(z.I, 1)} A${k === "f" ? `, U<sub>bat</sub> = ${fx(z.U, 2)} V` : ""}.`);
}

/* ------------------------------------------------------------------ valorile instantanee */
function curentCrank() { const p = MD.efectiv(P(), def()); return MD.curent(p, sim.tCrank, Infinity, sim.capF === "porn" ? p.tF : Infinity); }
function stareCurenta() {
  const pr = P(), p = MD.efectiv(pr, def());
  let iDem = 0, U = p.U0, iBat = 0, n = 0;
  if (sim.crank) { iDem = curentCrank(); U = p.U0 - p.Ri * iDem / 1000; iBat = -iDem; n = p.ncr * (1 + 0.08 * Math.sin(sim.tCrank * 2 * Math.PI * p.ncr / 30)); }
  else if (sim.merge) { const z = MD.incarcare(pr, sim.tRun, sim.cons, def()); U = z.U; iBat = z.I; n = 800; }
  else if (sim.cons) { iBat = -(pr.Pst / 12.4); U = p.U0 - 0.2; }
  return { iDem, U, iBat, n };
}
function textDmm() {
  if (!sim.dmm) return ""; const p = MD.efectiv(P(), def());
  if (!sim.crank) return "0.00";
  const R = sim.dmm === "U2" ? p.Rp : p.Rm, v = sim.tCrank < 1 ? R * curentCrank() / 1000 : MD.cadere(P(), sim.dmm === "U2" ? "p" : "m", def());
  return v.toFixed(2);
}
function liniiTester() {
  if (!sim.tester) return null;
  if (sim.testT == null) return ["BATTERY TESTER", "EN  " + P().CCAn + " A", "apăsați TEST"];
  if (!sim.testRez) return ["TESTARE " + ".".repeat(1 + Math.floor((sim.t - sim.testT) * 3) % 4)];
  const r = sim.testRez; return [`U0   ${r.U0.toFixed(2)} V`, `Ri   ${r.Ri.toFixed(2)} mΩ`, `CCA  ${r.CCA} A`, `SOH  ${r.SOH} %`];
}

/* ------------------------------------------------------------------ osciloscopul */
/** desenează ecranul osciloscopului (în aplicație și pe textura 3D): CH1 curentul, CH2 tensiunea, cursoarele A/B */
function desOsc(g, W, H, conectat, cuCursoare) {
  g.fillStyle = "#04080c"; g.fillRect(0, 0, W, H);
  const m = { l: 6, r: 6, t: 22, b: 18 }, w = W - m.l - m.r, h = H - m.t - m.b;
  g.strokeStyle = "#1c2a36"; g.lineWidth = 1; g.setLineDash([2, 3]);
  for (let k = 0; k <= 10; k++) { g.beginPath(); g.moveTo(m.l + k * w / 10, m.t); g.lineTo(m.l + k * w / 10, m.t + h); g.stroke(); }
  for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(m.l, m.t + k * h / 8); g.lineTo(m.l + w, m.t + k * h / 8); g.stroke(); }
  g.setLineDash([]);
  const fs = Math.max(10, Math.round(H / 26));
  g.font = `${fs}px system-ui`; g.fillStyle = "#ffd400"; g.textAlign = "left"; g.fillText("CH1 100 A/div", m.l + 2, fs + 2); g.fillStyle = "#3ad1ff"; g.fillText("CH2 1 V/div (6…14 V)", m.l + W * 0.3, fs + 2);
  if (!conectat) { g.fillStyle = "#567"; g.font = `bold ${fs * 1.6}px system-ui`; g.textAlign = "center"; g.fillText("NO SIGNAL", W / 2, H / 2); return; }
  const o = sim.crank ? sim.live : sim.capt[sim.viz];
  if (!o) { g.fillStyle = "#6a7d8f"; g.textAlign = "center"; g.font = `${fs * 1.2}px system-ui`; g.fillText("aștept declanșarea (CH1 > 20 A)…", W / 2, H / 2); return; }
  const N = o.i.length, T = (N - 1) * DTs, X = k => m.l + k / (N - 1) * w, YI = i => m.t + h - i / 800 * h, YU = u => m.t + h - (u - 6) / 8 * h;
  g.fillStyle = "#9fb3c6"; g.textAlign = "right"; g.fillText(`${fx(T / 10, 2)} s/div · ${o.f === "porn" ? "pornire" : "antrenare"}`, W - m.r - 2, fs + 2);
  const trace = (arr, Y, col) => { g.strokeStyle = col; g.lineWidth = Math.max(1.2, W / 500); g.beginPath(); const pas = Math.max(1, Math.floor(N / w));
    for (let k = 0; k < N; k += pas) { let lo = Infinity, hi = -Infinity; for (let j = k; j < Math.min(N, k + pas); j++) { lo = Math.min(lo, arr[j]); hi = Math.max(hi, arr[j]); } const x = X(k); if (k === 0) g.moveTo(x, Y(hi)); else g.lineTo(x, Y(hi)); if (lo !== hi) g.lineTo(x, Y(lo)); } g.stroke(); };
  g.save(); g.beginPath(); g.rect(m.l, m.t, w, h); g.clip(); trace(o.u, YU, "#3ad1ff"); trace(o.i, YI, "#ffd400"); g.restore();
  if (cuCursoare && !sim.crank) {
    [[sim.cA, "#ffffff", "A"], [sim.cB, "#ff9f43", "B"]].forEach(([k, c, n]) => { const x = X(k); g.strokeStyle = c; g.setLineDash([5, 4]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); g.setLineDash([]); g.fillStyle = c; g.textAlign = "center"; g.fillText(n, x, H - 4); });
    g.fillStyle = "rgba(255,159,67,.08)"; g.fillRect(X(Math.min(sim.cA, sim.cB)), m.t, X(Math.max(sim.cA, sim.cB)) - X(Math.min(sim.cA, sim.cB)), h);
  }
}
function deseneazaOsc() {
  const cv = $("#cv-osc"); if (!cv || !cv.getClientRects().length) return;
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = 250; cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); desOsc(g, W, H, sim.osc && sim.cleste === "dem", true);
  const o = sim.capt[sim.viz], c = $("#osc-cit"); if (!c) return;
  if (!o || sim.crank) { c.innerHTML = sim.crank ? "Înregistrare în curs…" : "Nicio oscilogramă salvată."; return; }
  const a = sim.cA, b = sim.cB, w = MD.fereastra(o, Math.min(a, b), Math.max(a, b));
  c.innerHTML = `<div><b>A</b> t = ${fx(o.t[a], 3)} s · i = ${fx(o.i[a], 1)} A · u = ${fx(o.u[a], 2)} V</div><div><b>B</b> t = ${fx(o.t[b], 3)} s · i = ${fx(o.i[b], 1)} A · u = ${fx(o.u[b], 2)} V</div>
    <div><b>Δt = ${fx(w.dt, 3)} s</b> · între A și B: i<sub>max</sub> ${fx(w.imax, 1)} A · i<sub>med</sub> ${fx(w.imed, 1)} A · u<sub>min</sub> ${fx(w.umin, 2)} V · u<sub>med</sub> ${fx(w.umed, 2)} V</div>
    <div>Math: ∫u·i dt = <b>${w.E} J</b> · ∫i dt = <b>${fx(w.Q, 1)} mAh</b> · p<sub>max</sub> ${w.Pmax} W · p<sub>medie</sub> ${w.Pmed} W</div>`;
}
function exportOsc() {
  const o = sim.capt[sim.viz]; if (!o) return Cadru.mesajTemporar("Nicio oscilogramă salvată.", "atentie");
  const L = ["t [s];i [A];u [V]"]; o.t.forEach((t, k) => L.push(`${t};${o.i[k]};${o.u[k]}`));
  const blob = new Blob(["﻿" + L.join("\r\n").replace(/\./g, ",")], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `saa-l7-oscilograma-${o.f}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ------------------------------------------------------------------ afișaje */
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (sel, on, t1, t0) => $$(sel).forEach(b => { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); });
  s("[data-tb]", sim.tester, "Deconectează testerul", "Conectează testerul"); s("#b-sig", !sim.sig, "Montează siguranța pompei", "Scoate siguranța pompei"); s("#b-sig2", sim.sig, "✓ Siguranța montată (scoate)", "Montează siguranța pompei");
  s("#b-cl-dem", sim.cleste === "dem", "✓ Cleștele pe cablul demarorului", "Cleștele pe cablul demarorului"); s("#b-cl-inc", sim.cleste === "inc", "✓ Cleștele pe cablul bateriei", "Cleștele pe cablul bateriei");
  s("#b-osc", sim.osc, "✓ Osciloscop conectat", "Conectează osciloscopul"); s("#b-cons", sim.cons, "Oprește consumatorii", "Pornește consumatorii");
  $$("[data-dmm]").forEach(b => b.classList.toggle("activ", (b.dataset.dmm || null) === sim.dmm));
  $$("[data-antr]").forEach(b => { b.classList.toggle("activ", sim.crank); b.textContent = sim.crank ? `START… ${fx(sim.tCrank, 1)} s` : pauzaRamasa() > 0 ? `Cheia pe START (pauză ${Math.ceil(pauzaRamasa())} s)` : "Cheia pe START"; });
  const c = stareCurenta();
  $("#af-st").textContent = sim.crank ? `antrenare ${Math.round(c.n)} rot/min` : sim.merge ? "pornit 800 rot/min" : "oprit";
  $("#af-i").textContent = sim.cleste ? `${fx(sim.cleste === "dem" ? c.iDem : c.iBat, 1)} A` : "—";
  $("#af-u").textContent = fx(c.U, 2) + " V"; $("#af-dmm").textContent = sim.dmm ? textDmm() + " V" : "—";
  $("#af-sig").textContent = sim.sig ? "montată" : "scoasă"; $("#af-t").textContent = sim.merge ? `${fx(sim.tRun, 0)} s` : "—";
}
function deseneaza() {
  const L = liniiTester(); $("#lcd-tester").innerHTML = L ? L.map(l => `<div>${esc(l)}</div>`).join("") : "<div>testerul nu este conectat</div>";
  $("#lcd-dmm").innerHTML = sim.dmm ? `<b>${textDmm()}</b> V DC <span>${sim.dmm === "U2" ? "U2: (+) baterie → borna 30" : "U3: carcasă demaror → (−) baterie"}</span>` : "<span>multimetrul nu este conectat</span>";
  const c = stareCurenta();
  $("#lcd-cl").innerHTML = sim.cleste ? `<b>${fx(sim.cleste === "dem" ? c.iDem : c.iBat, 1)}</b> A <span>${sim.cleste === "dem" ? "cablul demarorului" : "cablul bateriei (+ încărcare / − descărcare)"}</span>` : "<span>cleștele nu este montat</span>";
  deseneazaOsc();
}

/* ------------------------------------------------------------------ 3D */
const SV = { s3: null };
function porneste3D() {
  const el = $("#st3d"); if (!el) return;
  const pr = P();
  import(BAZA_COMUN + "pornire3d.js?v=1").then(m => { SV.s3 = m.creeazaStandPornire(el, { laClic: (k, et) => alegeComp(k, et), etichetaBaterie: `${pr.tip} 12 V ${pr.Cn} Ah`, etichetaBaterie2: `${pr.CCAn} A (EN) · START-STOP`, deseneazaOsc: (g, W, H, on) => desOsc(g, W, H, on && sim.cleste === "dem", true) }); vedere3d(PASI[pasActiv].vedere); })
    .catch(e => { el.innerHTML = `<p class="nota">Standul 3D nu a putut fi încărcat (${esc(e.message)}): este necesar un browser cu WebGL. Componentele se pot alege din listă:</p><div class="rand-butoane">${Object.keys(COMP).map(k => `<button type="button" data-c3="${k}">${COMP[k][0]}</button>`).join("")}</div>`; $$("#st3d [data-c3]").forEach(b => b.addEventListener("click", () => alegeComp(b.dataset.c3))); });
}
function actualizeaza3D() {
  if (!SV.s3) return; const c = stareCurenta(), p = MD.efectiv(P(), def());
  const cupl = sim.crank ? cl(sim.tCrank / 0.03, 0, 1) : 0;
  SV.s3.seteaza({ nMot: c.n, cupl, nDem: sim.crank ? c.n * 11 * 4.5 : 0, bobina: sim.crank ? 1 : 0, contact: sim.crank && sim.tCrank > 0.03 ? 1 : 0, cleste: sim.cleste, osc: sim.osc, dmm: sim.dmm, tester: sim.tester, cons: sim.cons, sig: sim.sig,
    cheie: sim.crank ? 2 : sim.merge ? 1 : 0, transparent: sim.transparent, iDem: c.iDem, iInc: sim.merge ? Math.max(0, c.iBat) : 0, oscVer: sim.oscVer, dmmText: sim.dmm ? textDmm() : "", testerLinii: liniiTester() });
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaSAA7(D) {
  const o = MD.prelucreaza(D.t, D.date, { num, regresie }), F = Number.isFinite, kJ = v => F(v) ? fx(v / 1000, 2) : "";
  const cel = { t74: { Ep: { v: kJ(o.Ep) }, Pc: { v: F(o.Pc) ? fx(o.Pc, 0) + " W" : "" }, ts: { v: F(o.ts) ? fx(o.ts, 0) + " s" : "" }, Ec: { v: kJ(o.Eciclu) }, ti: { v: F(o.tinc) ? fx(o.tinc, 1) : "" }, N: { v: F(o.Nmax) ? fx(o.Nmax, 1) : "" }, Er: { v: kJ(o.Erec) }, nc: { v: F(o.cicluri) ? fx(o.cicluri, 1) : "" } } };
  const rez = [
    ["P<sub>el</sub> = U<sub>bat</sub>·I<sub>antrenare</sub> (7.1)", F(o.Pel) ? `${fx(o.Pel, 0)} W` : "—"],
    ["R<sub>circuit (+)</sub> = ΔU<sub>(+)</sub>/I (7.2)", F(o.Rp) ? `<span style="color:var(--accent)">${fx(o.Rp, 2)} mΩ</span>` : "—"],
    ["R<sub>circuit masă</sub> = ΔU<sub>masă</sub>/I (7.2)", F(o.Rm) ? `${fx(o.Rm, 2)} mΩ` : "—"],
    ["R<sub>i</sub> din oscilogramă = (U<sub>0</sub> − U<sub>min</sub>)/I<sub>vârf</sub>", F(o.RiOsc) ? `${fx(o.RiOsc, 2)} mΩ${F(o.Ri) ? ` (tester: ${fx(o.Ri, 2)} mΩ)` : ""}` : "—"],
    ["Pornirea reală: E<sub>p</sub> (7.3), Q<sub>p</sub> (7.4)", F(o.porn.E) ? `<span style="color:var(--accent)">${fx(o.porn.E, 0)} J</span>; ${fx(o.porn.Q, 1)} mAh` : "—"],
    ["Antrenarea împiedicată: E, Q", F(o.antr.E) ? `${fx(o.antr.E, 0)} J; ${fx(o.antr.Q, 1)} mAh` : "—"],
    ["Sarcina primită de baterie în 120 s (fără consumatori)", F(o.Qinc120) ? `${fx(o.Qinc120, 0)} mAh` : "—"],
    ["E<sub>ciclu</sub> = E<sub>p</sub> + P<sub>c</sub>·t<sub>s</sub> (7.5)", F(o.Eciclu) ? `${fx(o.Eciclu / 1000, 2)} kJ` : "—"],
    ["t<sub>înc</sub> = E<sub>ciclu</sub>/(η<sub>înc</sub>·U<sub>înc</sub>·I<sub>înc</sub>) (7.6), cu I<sub>înc</sub>, U<sub>înc</sub> la 10 s", F(o.tinc) ? `<span style="color:var(--accent)">${fx(o.tinc, 1)} s</span>` : "—"],
    ["N<sub>max</sub> = ΔSOC·C<sub>n</sub>·U<sub>n</sub>·3600/E<sub>ciclu</sub> (7.7)", F(o.Nmax) ? `<span style="color:var(--accent)">${fx(o.Nmax, 1)}</span>` : "—"],
    ["E<sub>rec</sub> ≤ η<sub>rec</sub>·P<sub>BSG</sub>·t<sub>fr</sub> (7.8)", F(o.Erec) ? `${fx(o.Erec / 1000, 1)} kJ = ${F(o.cicluri) ? fx(o.cicluri, 1) : "—"} cicluri stop-start` : "—"]];
  const v = [];
  if (F(o.Umin)) v.push(o.Umin >= 9.6 ? { tip: "ok", text: `U<sub>min</sub> = ${fx(o.Umin, 2)} V ≥ 9,6 V – bateria și circuitul susțin pornirea.` } : { tip: "atentie", text: `U<sub>min</sub> = ${fx(o.Umin, 2)} V < 9,6 V – baterie descărcată / uzată sau rezistențe mari pe circuit.` });
  if (F(o.dUp)) v.push(o.dUp <= 0.5 ? { tip: "ok", text: `ΔU<sub>(+)</sub> = ${fx(o.dUp, 2)} V ≤ 0,5 V – circuitul de plus în stare bună.` } : { tip: "atentie", text: `ΔU<sub>(+)</sub> = ${fx(o.dUp, 2)} V > 0,5 V – borne oxidate / cablu deteriorat pe circuitul de plus.` });
  if (F(o.dUm)) v.push(o.dUm <= 0.3 ? { tip: "ok", text: `ΔU<sub>masă</sub> = ${fx(o.dUm, 2)} V ≤ 0,3 V – masa în stare bună.` } : { tip: "atentie", text: `ΔU<sub>masă</sub> = ${fx(o.dUm, 2)} V > 0,3 V – legătura de masă slăbită sau oxidată.` });
  if (F(o.SOH)) v.push(o.SOH >= 80 ? { tip: "ok", text: `SOH = ${fx(o.SOH, 0)} % – bateria corespunzătoare.` } : { tip: "atentie", text: `SOH = ${fx(o.SOH, 0)} % – bateria trebuie înlocuită (prag uzual 70…80 %).` });
  const t3 = D.t.t73, cf = num(t3.c.a0), ff = num(t3.f.a0); if (F(cf) && F(ff) && cf < ff - 3) v.push({ tip: "ok", text: `Cu consumatorii porniți, la ralanti curentul de încărcare este limitat (${fx(cf, 1)} A față de ${fx(ff, 1)} A): alternatorul nu acoperă tot necesarul – de aceea ECU crește turația de ralanti sau inhibă stop-start-ul.` });
  if (F(o.Ep) && F(o.Pc)) v.push({ tip: "ok", text: `Energia consumatorilor în oprire (${fx(o.Pc * o.ts / 1000, 1)} kJ) este de ${fx(o.Pc * o.ts / o.Ep, 1)} ori mai mare decât energia pornirii (${fx(o.Ep / 1000, 2)} kJ).` });
  // graficul: puterea instantanee și energia cumulată la pornirea reală (Fig. 7.3)
  let grafic = null, titlu = "Puterea instantanee și energia cumulată la pornirea reală (ca în Fig. 7.3) – după înregistrarea în Tabelul 7.2";
  if (F(o.porn.E)) {
    const c = MD.oscilograma(P(), "porn", 0, def()), pp = [], ee = []; let E = 0;
    c.t.forEach((t, k) => { const p = c.u[k] * c.i[k]; E += p * DTs; if (k % 3 === 0) { pp.push([t, p / 1000]); ee.push([t, E / 1000]); } });
    const T = c.t[c.t.length - 1];
    grafic = { xmin: 0, xmax: Math.ceil(T * 10) / 10, ymin: 0, ymax: 7, xticks: Array.from({ length: Math.floor(T / 0.2) + 1 }, (_, k) => +(k * 0.2).toFixed(1)), yticks: [0, 1, 2, 3, 4, 5, 6, 7], xlab: "t [s]", ylab: "p [kW]  /  E [kJ]",
      serii: [{ tip: "linie", pts: pp, culoare: 1, gros: 1.4 }, { tip: "linie", pts: ee, culoare: 3, gros: 2.2 }], adnotari: [{ x: T * 0.6, y: E / 1000, text: `E_p ≈ ${fx(E / 1000, 2)} kJ`, dy: -8 }] };
  }
  return { celule: cel, rele: {}, rezultate: rez, verdicte: v, titluGrafic: titlu, grafic, legenda: grafic ? [["p = u·i [kW]", "var(--serie-1)"], ["energia cumulată E [kJ]", "var(--serie-3)"]] : null,
    principal: { eticheta: "Ep la pornire [J]", valoare: F(o.porn.E) ? Math.round(o.porn.E) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Bateria poate debita sute de amperi: se interzice scurtcircuitarea bornelor cu scule metalice; se îndepărtează inelele, brățările și ceasurile.</li>
<li>Bateria degajă hidrogen (exploziv): nu se produc scântei sau flacără lângă baterie; clemele se conectează și deconectează cu consumatorii opriți; primul se deconectează polul negativ.</li>
<li>Electrolitul este coroziv: se folosesc ochelari de protecție și mănuși; în caz de contact se spală imediat cu multă apă.</li>
<li>La testele de antrenare motorul se rotește: se păstrează distanța față de curele și fulii; pornirea se împiedică numai prin metoda indicată de cadrul didactic (siguranța pompei de combustibil sau a injecției), iar o antrenare nu depășește 10 s, cu pauză de minimum 30 s.</li>
<li>Sistemul de 48 V (sub pragul de 60 V c.c. al înaltei tensiuni) poate produce arcuri electrice periculoase la curenți mari: conectorii sistemului 48 V nu se manipulează în cadrul lucrării.</li></ul></div>
<h2>7.1. Scopul lucrării</h2>
<p>Determinarea curentului absorbit de demaror, a tensiunii bateriei și a căderilor de tensiune pe circuit la pornire; calculul energiei consumate la o pornire și al timpului de reîncărcare a bateriei; întocmirea bilanțului energetic al unui ciclu stop-start și compararea cu soluția mild-hybrid 48 V.</p>
<h2>7.2. Noțiuni teoretice</h2>
<p>Demarorul este un motor de curent continuu cu excitație serie sau cu magneți permanenți și reductor, cuplat prin releul electromagnetic (solenoid) și pinion cu coroana volantei. La cuplare curentul atinge un vârf (rotor blocat), apoi scade la valoarea de antrenare, cu pulsații la fiecare compresie. Tensiunea bateriei în timpul antrenării și căderile de tensiune pe cablurile de putere și de masă arată starea bateriei și a circuitului. Construcția și secvența de cuplare se urmăresc în tabul „Animație (3D)”.</p>
${EC("P<sub>el</sub> = U<sub>bat</sub> · I<sub>antrenare</sub> [W]", "7.1")}${EC("R<sub>circuit</sub> = ΔU / I [Ω]", "7.2")}
<p>Energia consumată la o pornire se obține integrând puterea instantanee pe durata antrenării t<sub>p</sub>. Oscilograma se exportă ca fișier de date (N eșantioane la intervalul Δt), iar integrala se calculează numeric:</p>
${EC("E<sub>p</sub> = ∫<sub>0</sub><sup>t<sub>p</sub></sup> u(t)·i(t) dt ≈ Σ<sub>k=1</sub><sup>N</sup> u<sub>k</sub>·i<sub>k</sub>·Δt [J]", "7.3")}${EC("Q<sub>p</sub> = (1/3,6) · Σ<sub>k=1</sub><sup>N</sup> i<sub>k</sub>·Δt [mAh]", "7.4")}
<p>Sistemul stop-start oprește motorul la staționare și îl repornește la eliberarea frânei sau la apăsarea ambreiajului. Într-un ciclu, bateria furnizează energia pornirii și energia consumatorilor în timpul opririi (puterea P<sub>c</sub>, pe durata t<sub>s</sub>); alternatorul o reface ulterior cu un curent de încărcare I<sub>înc</sub>, cu randamentul de încărcare η<sub>înc</sub>. Numărul de opriri pe care bateria le poate susține fără reîncărcare este limitat de fereastra admisă a stării de încărcare ΔSOC (senzorul de baterie IBS inhibă stop-start-ul sub un prag):</p>
${EC("E<sub>ciclu</sub> = E<sub>p</sub> + P<sub>c</sub> · t<sub>s</sub>", "7.5")}${EC("t<sub>înc</sub> = E<sub>ciclu</sub> / (η<sub>înc</sub> · U<sub>înc</sub> · I<sub>înc</sub>)", "7.6")}${EC("N<sub>max</sub> = ΔSOC · C<sub>n</sub> · U<sub>n</sub> · 3600 / E<sub>ciclu</sub>", "7.7")}
<p>unde C<sub>n</sub> [Ah] și U<sub>n</sub> [V] sunt capacitatea și tensiunea nominală ale bateriei. La sistemele mild-hybrid 48 V, alternatorul-demaror antrenat prin curea (BSG) repornește motorul silențios și rapid și recuperează energie la frânare, limitată de puterea BSG P<sub>BSG</sub> și de durata frânării t<sub>fr</sub>:</p>
${EC("E<sub>rec</sub> ≤ η<sub>rec</sub> · P<sub>BSG</sub> · t<sub>fr</sub> [J]", "7.8")}
<figure><img src="img/fig7_1.jpg" alt="Fig. 7.1" loading="lazy"><figcaption>Fig. 7.1. Circuitul de pornire și punctele de măsură</figcaption></figure>
<figure><img src="img/fig7_2.jpg" alt="Fig. 7.2" loading="lazy"><figcaption>Fig. 7.2. Curentul de pornire și tensiunea bateriei (exemplu)</figcaption></figure>
<figure><img src="img/fig7_3.jpg" alt="Fig. 7.3" loading="lazy"><figcaption>Fig. 7.3. Puterea și energia cumulată la o pornire (stânga); bilanțul energetic al unui ciclu stop-start (dreapta) – valori exemplificative</figcaption></figure>
<figure><img src="img/fig7_4.jpg" alt="Fig. 7.4" loading="lazy"><figcaption>Fig. 7.4. Arhitectura mild-hybrid 48 V (schemă de principiu)</figcaption></figure>
<h2>7.3. Aparatură și echipamente</h2>
<ul><li>Stand motor (1.4 MPI și/sau 1.5 dCi)</li><li>Clește ampermetric de curent continuu (min. 600 A) conectat la osciloscop</li><li>Osciloscop auto cu export al datelor (CSV), multimetru digital</li><li>Tester de baterie (conductanță)</li><li>Consumatori electrici ai standului (faruri, ventilator)</li><li>PC cu Excel sau Python pentru integrarea numerică</li><li>Panoplii cu demaror, alternator și componente stop-start / 48 V</li></ul>
<div class="nota-indrumar"><h3>Completări față de îndrumarul tipărit</h3><ul>
<li><b>Tabelul 7.0</b> conține rezultatele testerului de baterie (pasul 2 din modul de lucru): tensiunea în gol, rezistența internă, CCA estimat și starea SOH; capacitatea C<sub>n</sub> și CCA nominal se citesc pe eticheta bateriei.</li>
<li><b>Tabelul 7.1</b> are în plus tensiunea medie în timpul antrenării U<sub>antrenare</sub>, citită pe aceeași fereastră cu I<sub>antrenare</sub>, pentru relația (7.1). Mărimile se citesc pe oscilogramă cu cursoarele A și B (eșantionare Δt = 2 ms); I<sub>antrenare</sub> este media pe zona stabilizată, după vârf, pe cel puțin 0,5 s.</li>
<li><b>Tabelul 7.2</b> are două rânduri: antrenarea cu pornirea împiedicată (3…5 s) și pornirea reală (motorul pornește după ≈ 1 s). În bilanțul stop-start (Tabelul 7.4) se folosește energia <b>pornirii reale</b>. Integrala se ia pe fereastra care cuprinde tot curentul; fișierul CSV exportat permite verificarea în Excel / Python.</li>
<li>În relația (7.6) I<sub>înc</sub> și U<sub>înc</sub> sunt valorile din Tabelul 7.3 la 10 s după pornire, fără consumatori; η<sub>înc</sub> = η<sub>rec</sub> = 0,85.</li>
<li>Scenariul bilanțului (P<sub>c</sub>, t<sub>s</sub>, ΔSOC, P<sub>BSG</sub>, t<sub>fr</sub>) și bateria (tip, C<sub>n</sub>, CCA) sunt individuale și apar în Date de lucru; la fel parametrii bateriei, ai circuitului și ai demarorului de pe standul fiecărui student.</li></ul></div>
<h2>7.4. Modul de lucru (în simulator)</h2>
<ol><li>Panopliile și sistemul de pornire pe stand: identificarea componentelor (demaror, releu, pinion, reductor, baterie EFB/AGM, IBS, BSG 48 V, DC/DC).</li><li>Testul bateriei cu testerul de conductanță (Tabelul 7.0).</li><li>Pornirea împiedicată (siguranța pompei), cleștele pe cablul (+) al demarorului, osciloscopul.</li><li>Antrenarea de 3…5 s, oscilograma: vârful, curentul și tensiunea de antrenare, tensiunea minimă, durata, integrala (Tabelele 7.1 și 7.2).</li><li>Căderile de tensiune pe circuitul de plus (U2) și de masă (U3) cu multimetrul (Tabelul 7.1).</li><li>Pornirea reală: oscilograma și energia unei porniri (Tabelul 7.2).</li><li>Reîncărcarea bateriei fără și cu consumatori (Tabelul 7.3); bilanțul stop-start și mild-hybrid (Tabelul 7.4).</li></ol>
<h2>7.6. Prelucrarea datelor</h2>
<p>Se calculează puterea electrică absorbită, rezistența circuitelor de plus și de masă, energia E<sub>p</sub> și sarcina Q<sub>p</sub> consumate la pornire, apoi mărimile din Tabelul 7.4. Se trasează puterea instantanee și energia cumulată în funcție de timp (Fig. 7.3).</p>
<h2>7.7. Interpretarea rezultatelor</h2>
<ul><li>La o baterie în stare bună, tensiunea în timpul antrenării nu scade sub ≈ 9,6…10 V la 20 °C.</li>
<li>Căderea de tensiune pe circuitul de plus nu trebuie să depășească ≈ 0,5 V, iar pe circuitul de masă ≈ 0,2…0,3 V; valori mai mari indică borne oxidate sau cabluri deteriorate.</li>
<li>Energia unei porniri este de ordinul a câtorva kilojouli, mult mai mică decât energia consumată de consumatori în timpul unei opriri de zeci de secunde; de aceea sistemul stop-start se inhibă când starea de încărcare scade sau când consumatorii mari sunt porniți.</li>
<li>Energia recuperabilă de un BSG la o singură frânare poate acoperi mai multe cicluri stop-start, ceea ce explică eficiența sistemelor mild-hybrid în trafic urban.</li></ul>
<h2>7.8. Relevanță practică</h2>
<p>Dimensionarea bateriei, a alternatorului și a strategiei de management al energiei la bord pentru sistemele stop-start și mild-hybrid 48 V este o temă actuală de proiectare, direct legată de reducerea emisiilor de CO<sub>2</sub> în ciclurile urbane.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu de calcul</h2>
<p>E<sub>p</sub> = 2,8 kJ, P<sub>c</sub> = 400 W, t<sub>s</sub> = 30 s, baterie de 70 Ah și 12 V, ΔSOC = 10 %, I<sub>înc</sub> = 40 A la U<sub>înc</sub> = 14 V, η<sub>înc</sub> = 0,85:</p>
${EC("E<sub>ciclu</sub> = 2,8 + 0,4 · 30 = 14,8 kJ", "7.9")}${EC("t<sub>înc</sub> = 14 800 / (0,85 · 14 · 40) ≈ 31 s", "7.10")}${EC("N<sub>max</sub> = 0,1 · 70 · 12 · 3600 / 14 800 ≈ 20", "7.11")}${EC("E<sub>rec</sub> ≤ 0,85 · 10 000 · 4 = 34 000 J = 34 kJ (BSG de 10 kW, frânare de 4 s)", "7.12")}
<div class="problema"><h3>Problema 1</h3><p>O oscilogramă exportată are N = 600 de eșantioane la Δt = 2 ms; media produselor u<sub>k</sub>·i<sub>k</sub> este 2100 W, iar media curentului 185 A. Calculați E<sub>p</sub> și Q<sub>p</sub>.</p>
<details class="sol"><summary>Rezolvare</summary><p>t<sub>p</sub> = 600 · 0,002 = 1,2 s; E<sub>p</sub> = Σ u<sub>k</sub>i<sub>k</sub>Δt = 2100 · 1,2 = 2520 J; Q<sub>p</sub> = 185 · 1,2 / 3,6 = 61,7 mAh – adică ≈ 0,09 % din capacitatea unei baterii de 70 Ah.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>La antrenare, cu I = 180 A, multimetrul indică 0,72 V între borna (+) a bateriei și borna 30 și 0,14 V pe circuitul de masă. Calculați rezistențele și formulați diagnosticul.</p>
<details class="sol"><summary>Rezolvare</summary><p>R<sub>(+)</sub> = 0,72/180 = 4,0 mΩ (> 0,5 V admis) – bornă oxidată sau cablu deteriorat; se măsoară pe porțiuni (bornă–clemă, clemă–cablu, cablu–borna 30) pentru localizare. R<sub>masă</sub> = 0,14/180 = 0,78 mΩ – corect. Puterea pierdută pe circuitul de plus: 0,72 · 180 ≈ 130 W.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Un autoturism cu stop-start face într-un traseu urban 25 de opriri de câte 40 s, cu P<sub>c</sub> = 500 W și E<sub>p</sub> = 2,5 kJ. Ce sarcină pierde bateria (12 V) dacă alternatorul nu ar reîncărca între opriri? Câte frânări cu un BSG de 12 kW, de 3 s, ar recupera această energie (η<sub>rec</sub> = 0,85)?</p>
<details class="sol"><summary>Rezolvare</summary><p>E<sub>ciclu</sub> = 2,5 + 0,5 · 40 = 22,5 kJ; total 25 · 22,5 = 562,5 kJ → Q = 562 500 / (12 · 3600) = 13 Ah (≈ 19 % dintr-o baterie de 70 Ah – peste fereastra ΔSOC admisă, de aceea IBS inhibă stop-start-ul). E<sub>rec</sub> = 0,85 · 12 000 · 3 = 30,6 kJ pe frânare → ≈ 19 frânări.</p></details></div>`;
}
const INTREBARI = [
  ["De ce curentul are un vârf la începutul pornirii?", "La cuplare indusul este în repaus (rotor blocat): tensiunea contraelectromotoare este nulă, iar curentul este limitat numai de rezistențele bateriei, cablurilor, periilor și bobinajului (câțiva mΩ) – sute de amperi. Pe măsură ce indusul se rotește, t.e.m. crește și curentul scade la valoarea de antrenare; la fiecare compresie cuplul rezistent crește și curentul pulsează."],
  ["Cum se calculează energia unei porniri din oscilograma curentului și a tensiunii?", "Se exportă eșantioanele (u<sub>k</sub>, i<sub>k</sub>) la pasul Δt, se calculează puterea instantanee p<sub>k</sub> = u<sub>k</sub>·i<sub>k</sub> și se însumează p<sub>k</sub>·Δt pe toată durata curentului (relația 7.3); sarcina se obține analog din Σ i<sub>k</sub>·Δt (7.4). Fereastra trebuie să cuprindă tot curentul, inclusiv vârful."],
  ["De ce energia consumată în timpul opririi este mai importantă decât energia pornirii în bilanțul stop-start?", "O pornire durează ≈ 1 s la ≈ 2 kW (câțiva kJ), în timp ce consumatorii (climatizare, ventilator, lumini, multimedia – sute de wați) funcționează zeci de secunde cu motorul oprit: P<sub>c</sub>·t<sub>s</sub> este de 3…10 ori mai mare decât E<sub>p</sub>."],
  ["De ce sistemele stop-start necesită baterii de tip EFB/AGM și senzor de baterie?", "Bateria trece printr-un număr mare de cicluri de descărcare parțială; bateriile clasice se sulfatează și pierd rapid capacitatea, EFB și AGM rezistă de 2…4 ori mai multe cicluri și acceptă curenți de încărcare mai mari. Senzorul IBS măsoară curentul, tensiunea și temperatura și estimează SOC/SOH, astfel încât ECU să inhibe stop-start-ul înainte ca bateria să nu mai poată asigura repornirea."],
  ["Ce avantaje energetice aduce un sistem mild-hybrid 48 V față de un sistem stop-start clasic?", "BSG-ul recuperează energie la frânare (kilojouli – zeci de kJ pe frânare), care acoperă consumatorii în opriri și repornirile; repornirea este rapidă și silențioasă, permite oprirea motorului încă din rulare (sub ≈ 20 km/h) și navigarea cu motorul oprit, iar asistarea la accelerare reduce sarcina motorului termic. La 48 V curenții sunt de 4 ori mai mici decât la 12 V pentru aceeași putere."]
];
const TEST = [
  { q: "Vârful curentului de pornire apare:", o: ["la eliberarea cheii", "la cuplarea releului, cu indusul încă nemișcat", "după pornirea motorului", "la fiecare compresie"], c: 1, e: "Rotor blocat: t.e.m. nulă, curent limitat numai de rezistențe." },
  { q: "Căderea de tensiune admisă pe circuitul de plus al demarorului este de aproximativ:", o: ["0,05 V", "0,5 V", "2 V", "5 V"], c: 1, e: "Peste ≈ 0,5 V – borne oxidate sau cablu deteriorat; pe masă ≈ 0,2…0,3 V." },
  { q: "Pentru E<sub>p</sub> = 2,8 kJ, P<sub>c</sub> = 400 W și t<sub>s</sub> = 30 s, energia pe ciclu este:", o: ["3,2 kJ", "14,8 kJ", "12 kJ", "2,8 kJ"], c: 1, e: "2,8 + 0,4·30 = 14,8 kJ." },
  { q: "Senzorul IBS este montat:", o: ["pe demaror", "pe borna (−) a bateriei", "pe alternator", "în ECU"], c: 1, e: "Măsoară curentul prin șuntul de pe borna negativă, tensiunea și temperatura." },
  { q: "Bateria de 48 V a unui sistem mild-hybrid:", o: ["este de înaltă tensiune (portocaliu)", "este sub pragul de 60 V c.c.", "alimentează direct becurile", "înlocuiește bateria de 12 V"], c: 1, e: "Sub 60 V c.c. – nu este înaltă tensiune; rețeaua de 12 V rămâne, alimentată prin DC/DC." }
];
const CSS = `<style>
.saa7-scena #st3d .m3d { height:clamp(380px, 58vh, 620px); }
.saa7-afis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.saa7-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .saa7-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .saa7-afis b { font-size:.98rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; }
.lcd-g { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.6rem; }
.lcd { border-radius:10px; padding:.5rem .7rem; font:13px system-ui; min-height:4.6rem; } .lcd h4 { margin:0 0 .3rem; font-size:.8rem; }
.lcd b { font:700 22px 'Courier New',monospace; } .lcd span { display:block; font-size:.75rem; opacity:.8; margin-top:.2rem; }
.lcd.dmm { background:#b5c2a6; color:#1b2416; } .lcd.cl { background:#2b2f35; color:#e6f5e6; } .lcd.cl b { color:#9dff9d; }
.lcd.tb { background:#0d1b12; color:#6dff8e; font-family:'Courier New',monospace; } .lcd.tb div { font-weight:700; }
#cv-osc { width:100%; height:250px; display:block; border-radius:8px; }
.osc-cit { font-size:.82rem; line-height:1.45; margin-top:.35rem; } .osc-cit b { color:var(--accent); }
.cursoare { display:grid; grid-template-columns:auto minmax(0,1fr) auto auto; gap:.3rem .5rem; align-items:center; font-size:.84rem; margin:.35rem 0; } .cursoare input[type=range] { width:100%; }
.cursoare button { padding:.15rem .5rem; }
#comp-desc { min-height:2.4em; }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); } .pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; } .pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; } .pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; } .pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; } .pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; align-items:center; } .pas-ctl button.activ, .instr button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); }
.anim-pornire .ap-bara { display:flex; flex-wrap:wrap; gap:.5rem 1rem; align-items:end; margin-bottom:.5rem; } .anim-pornire .ap-butoane { display:flex; flex-wrap:wrap; gap:.4rem; }
.anim-pornire .ap-scena .m3d { height:clamp(340px, 52vh, 560px); }
.anim-pornire .ap-jos { display:grid; grid-template-columns:minmax(0,1fr) 440px; gap:.8rem; margin-top:.6rem; align-items:start; } .anim-pornire .ap-desc { margin:0; font-size:.9rem; }
.anim-pornire .ap-faza { background:var(--suprafata-2); border-radius:8px; padding:.5rem; font-size:.86rem; } .anim-pornire .ap-faza b { display:block; min-height:2.6em; margin-bottom:.3rem; } .anim-pornire canvas { width:100%; height:auto; border-radius:6px; }
@media (max-width:900px){ .saa7-afis { grid-template-columns:repeat(3,minmax(0,1fr)); } .lcd-g { grid-template-columns:1fr; } .anim-pornire .ap-jos { grid-template-columns:1fr; } }
</style>`;

/* ------------------------------------------------------------------ definiția lucrării */
const MOM = MD.MOM;
Cadru.porneste({
  disc: "SAA", nr: 7, cod: "saa-l7",
  titlu: "Sistemul de pornire și bilanțul energetic al sistemelor stop-start și mild-hybrid 48 V",
  scurt: "Sistemul de pornire și stop-start",
  subtitlu: "Laborator virtual – standul 1.4 MPI: oscilograma curentului de pornire, căderile de tensiune, energia unei porniri, reîncărcarea bateriei, bilanțul stop-start și mild-hybrid 48 V",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261026); },
  date: [{ k: "Cn", et: "C<sub>n</sub> baterie [Ah]", v: 70, fix: true }, { k: "CCAn", et: "CCA nominal (EN) [A]", v: 680, fix: true }, { k: "Un", et: "U<sub>n</sub> [V]", v: 12, fix: true },
    { k: "Pc", et: "P<sub>c</sub> consumatori în oprire [W]", v: 400, fix: true }, { k: "ts", et: "t<sub>s</sub> durata opririi [s]", v: 30, fix: true }, { k: "dsoc", et: "ΔSOC admis [–]", v: 0.1, fix: true }, { k: "etaInc", et: "η<sub>înc</sub> [–]", v: 0.85, fix: true },
    { k: "Pbsg", et: "P<sub>BSG</sub> [kW]", v: 10, fix: true }, { k: "tfr", et: "t<sub>fr</sub> frânare [s]", v: 4, fix: true }, { k: "etaRec", et: "η<sub>rec</sub> [–]", v: 0.85, fix: true }],
  tabele: [
    { id: "t70", titlu: "Tabelul 7.0. Testul bateriei (completare)", antetRand: "Mărimea", randuri: [{ k: "U0", et: "Tensiunea în gol U<sub>0</sub> [V]" }, { k: "Ri", et: "Rezistența internă R<sub>i</sub> [mΩ]" }, { k: "CCA", et: "CCA estimat [A]" }, { k: "SOH", et: "Starea bateriei SOH [%]" }], coloane: [{ k: "v", t: "Valoarea", intrare: true }] },
    { id: "t71", titlu: "Tabelul 7.1. Determinări la pornire (antrenare cu pornirea împiedicată)", antetRand: "Mărime", nota: "Vârful, mediile, minimul și durata – citite pe oscilogramă cu cursoarele A și B; ΔU – cu multimetrul în punctele U2 și U3 (Fig. 7.1).",
      randuri: [{ k: "v", et: "Valoare" }], coloane: [{ k: "ivf", t: "I<sub>vârf</sub> [A]", intrare: true }, { k: "iantr", t: "I<sub>antrenare</sub> [A]", intrare: true }, { k: "uantr", t: "U<sub>antrenare</sub> [V]", intrare: true }, { k: "umin", t: "U<sub>bat. min.</sub> [V]", intrare: true },
        { k: "dup", t: "ΔU<sub>circuit (+)</sub> [V]", intrare: true }, { k: "dum", t: "ΔU<sub>circuit masă</sub> [V]", intrare: true }, { k: "tp", t: "t<sub>p</sub> [s]", intrare: true }] },
    { id: "t72", titlu: "Tabelul 7.2. Energia consumată la pornire", antetRand: "Oscilograma", nota: "Integrala numerică pe fereastra A–B care cuprinde tot curentul (relațiile 7.3 și 7.4); P<sub>medie</sub> = E<sub>p</sub>/Δt.",
      randuri: [{ k: "antr", et: "antrenare (pornire împiedicată)" }, { k: "porn", et: "pornirea reală" }], coloane: [{ k: "E", t: "E<sub>p</sub> [J]", intrare: true }, { k: "Q", t: "Q<sub>p</sub> [mAh]", intrare: true }, { k: "Pmax", t: "P<sub>max</sub> [W]", intrare: true }, { k: "Pmed", t: "P<sub>medie</sub> [W]", intrare: true }] },
    { id: "t73", titlu: "Tabelul 7.3. Reîncărcarea bateriei după pornire", antetRand: "t după pornire [s]",
      randuri: [{ k: "f", et: "I<sub>înc</sub> fără consumatori [A]" }, { k: "c", et: "I<sub>înc</sub> cu consumatori [A]" }, { k: "u", et: "U<sub>bat</sub> [V]" }], coloane: MOM.map(s => ({ k: "a" + s, t: String(s), intrare: true })) },
    { id: "t74", titlu: "Tabelul 7.4. Bilanțul energetic al unui ciclu stop-start", antetRand: "Mărime", nota: "Se calculează automat din Tabelele 7.2 și 7.3 și din scenariul individual (Date de lucru).",
      randuri: [{ k: "Ep", et: "Energia unei porniri E<sub>p</sub> [kJ]" }, { k: "Pc", et: "Puterea consumatorilor în oprire P<sub>c</sub>" }, { k: "ts", et: "Durata opririi t<sub>s</sub>" }, { k: "Ec", et: "Energia pe ciclu E<sub>ciclu</sub> [kJ]" }, { k: "ti", et: "Timpul de reîncărcare t<sub>înc</sub> [s]" },
        { k: "N", et: "Numărul maxim de opriri N<sub>max</sub> [–]" }, { k: "Er", et: "Energia recuperabilă cu BSG 48 V E<sub>rec</sub> [kJ]" }, { k: "nc", et: "Cicluri stop-start acoperite de o frânare [–]" }], coloane: [{ k: "v", t: "Valoare" }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaSAA7,
  intrebari() {
    return [
      { id: "q1", u: "J", text: "Energia unei porniri reale E<sub>p</sub> (relația 7.3, Tabelul 7.2):", textSimplu: "Ep la pornirea reală" },
      { id: "q2", u: "mΩ", text: "Rezistența circuitului de plus R<sub>circuit (+)</sub> = ΔU<sub>(+)</sub>/I<sub>antrenare</sub> (relația 7.2):", textSimplu: "Rezistența circuitului de plus" },
      { id: "q3", u: "s", text: "Timpul de reîncărcare după un ciclu stop-start t<sub>înc</sub> (relația 7.6, cu scenariul vostru):", textSimplu: "Timpul de reîncărcare tînc" },
      { id: "q4", u: "–", text: "Numărul maxim de opriri fără reîncărcare N<sub>max</sub> (relația 7.7):", textSimplu: "Numărul maxim de opriri Nmax" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    ["U0", "Ri", "CCA", "SOH"].forEach(k => { if (t.t70[k].v === "") l.push(`Tabelul 7.0: ${k}`); });
    ["ivf", "iantr", "uantr", "umin", "dup", "dum", "tp"].forEach(k => { if (t.t71.v[k] === "") l.push(`Tabelul 7.1: ${k}`); });
    ["antr", "porn"].forEach(r => { if (t.t72[r].E === "") l.push(`Tabelul 7.2: ${r === "porn" ? "pornirea reală" : "antrenarea"}`); });
    ["f", "c", "u"].forEach(r => { const n = MOM.filter(s => t.t73[r]["a" + s] !== "").length; if (n < MOM.length) l.push(`Tabelul 7.3: rândul ${r === "f" ? "fără consumatori" : r === "c" ? "cu consumatori" : "U bat"} ${n}/${MOM.length}`); });
    return l;
  },
  exemplu(D) {
    const pr = MD.parametri(1), T = D.t;
    Object.assign(D.date, { Cn: pr.Cn, CCAn: pr.CCAn, Pc: pr.Pc, ts: pr.ts, dsoc: pr.dsoc, Pbsg: pr.Pbsg, tfr: pr.tfr });
    const b = MD.tester(pr, ""); T.t70.U0.v = b.U0.toFixed(2); T.t70.Ri.v = b.Ri.toFixed(2); T.t70.CCA.v = String(b.CCA); T.t70.SOH.v = String(b.SOH);
    const a = MD.oscilograma(pr, "antr", 4, ""), ix = MD.indiciCurent(a), w = MD.fereastra(a, ix[0], ix[1]), m = MD.fereastra(a, ix[0] + 120, ix[1] - 60);
    Object.assign(T.t71.v, { ivf: w.imax.toFixed(1), iantr: m.imed.toFixed(1), uantr: m.umed.toFixed(2), umin: w.umin.toFixed(2), dup: MD.cadere(pr, "p", "").toFixed(2), dum: MD.cadere(pr, "m", "").toFixed(2), tp: w.dt.toFixed(2) });
    const wi = MD.fereastra(a, ix[0] - 10, ix[1] + 10); Object.assign(T.t72.antr, { E: String(wi.E), Q: wi.Q.toFixed(1), Pmax: String(wi.Pmax), Pmed: String(wi.Pmed) });
    const p = MD.oscilograma(pr, "porn", 0, ""), jx = MD.indiciCurent(p), wp = MD.fereastra(p, jx[0] - 10, jx[1] + 10); Object.assign(T.t72.porn, { E: String(wp.E), Q: wp.Q.toFixed(1), Pmax: String(wp.Pmax), Pmed: String(wp.Pmed) });
    MOM.forEach(s => { const f = MD.incarcare(pr, s, false, ""), c = MD.incarcare(pr, s, true, ""); T.t73.f["a" + s] = f.I.toFixed(1); T.t73.c["a" + s] = c.I.toFixed(1); T.t73.u["a" + s] = f.U.toFixed(2); });
  },
  animatie: {
    titluTab: "Animație: pornirea (3D)", titlu: "Demarorul – cuplarea și antrenarea; sistemul mild-hybrid 48 V",
    intro: `<p>Alegeți varianta: demarorul clasic, demarorul cu reductor planetar (întărit pentru stop-start) – amândouă secționate – sau arhitectura mild-hybrid 48 V. Butonul <b>Pornire</b> parcurge secvența: releul trage plonjorul, furca împinge pinionul în coroană, contactele principale se închid (vârful de curent), antrenarea cu pulsații, pornirea motorului cu decuplarea roții libere și revenirea. La varianta 48 V urmăriți fluxurile de energie (verde – 48 V, galben – 12 V) la repornire, recuperare, asistare și oprire. Treceți cu mouse-ul peste componente.</p>`,
    dupa: `<p class="nota">Rotațiile sunt mult încetinite (indusul se rotește în realitate cu 2000…10 000 rot/min). Curentul și puterea din grafic sunt calitative, pentru urmărirea fazelor.</p>`,
    modul: "pornire3d.js?v=1", functie: "creeazaAnimatiePornire"
  },
  referat: {
    scop: "Determinarea curentului absorbit de demaror, a tensiunii bateriei și a căderilor de tensiune pe circuit la pornire; calculul energiei consumate la o pornire și al timpului de reîncărcare a bateriei; întocmirea bilanțului energetic al unui ciclu stop-start și compararea cu soluția mild-hybrid 48 V.",
    relatii: "P<sub>el</sub> = U<sub>bat</sub>·I<sub>antrenare</sub>; &nbsp; R = ΔU/I; &nbsp; E<sub>p</sub> ≈ Σ u<sub>k</sub>·i<sub>k</sub>·Δt; &nbsp; Q<sub>p</sub> = Σ i<sub>k</sub>·Δt/3,6; &nbsp; E<sub>ciclu</sub> = E<sub>p</sub> + P<sub>c</sub>·t<sub>s</sub>; &nbsp; t<sub>înc</sub> = E<sub>ciclu</sub>/(η<sub>înc</sub>·U<sub>înc</sub>·I<sub>înc</sub>); &nbsp; N<sub>max</sub> = ΔSOC·C<sub>n</sub>·U<sub>n</sub>·3600/E<sub>ciclu</sub>; &nbsp; E<sub>rec</sub> ≤ η<sub>rec</sub>·P<sub>BSG</sub>·t<sub>fr</sub>.",
    varianta: () => { const p = P(); return `Standul propriu: bateria ${p.tip} ${p.Cn} Ah / ${p.CCAn} A, demarorul și circuitul propriu; scenariul: P<sub>c</sub> = ${p.Pc} W, t<sub>s</sub> = ${p.ts} s, ΔSOC = ${fx(p.dsoc * 100, 0)} %, P<sub>BSG</sub> = ${p.Pbsg} kW, t<sub>fr</sub> = ${p.tfr} s.`; },
    indicatii: "Comentați forma oscilogramei (vârful, pulsațiile), tensiunea minimă și căderile pe circuit față de valorile admise, starea bateriei, energia unei porniri față de energia consumatorilor în oprire, limitarea curentului de încărcare cu consumatori, numărul de opriri și aportul BSG 48 V…"
  },
  subsol: "Modelul: bateria (U<sub>0</sub>, R<sub>i</sub>, CCA), oscilograma pornirii la 2 ms (vârful la rotor blocat, antrenarea cu pulsații la fiecare compresie, pornirea motorului), căderile de tensiune pe circuitul de plus și de masă, curentul de încărcare după pornire fără / cu consumatori și scenariul de bilanț. Parametrii sunt individuali.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena saa7-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="st3d"><p class="nota">Se încarcă standul 3D…</p></div>
      <div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-tr"> Carcasele demarorului transparente</label><button type="button" data-vv="tot">Vedere generală</button><button type="button" data-vv="dem">Demarorul</button><button type="button" data-vv="bat">Bateria</button><button type="button" data-vv="masa">Panopliile</button><button type="button" data-vv="aparate">Aparatele</button></div>
      <p class="nota" id="comp-desc">Clic pe o componentă (pe stand sau pe panoplii). Particulele: roșu – curentul de pornire, albastru – întoarcerea prin masă, verde – încărcarea.</p>
      <div class="saa7-afis"><div><span>Motor</span><b id="af-st">—</b></div><div><span>Cleștele</span><b id="af-i">—</b></div><div><span>U baterie</span><b id="af-u">—</b></div><div><span>Multimetru</span><b id="af-dmm">—</b></div><div><span>Siguranța pompei</span><b id="af-sig">—</b></div><div><span>t de la pornire</span><b id="af-t">—</b></div></div>
      <div class="instr" data-panou="inst"><h3>Aparatele</h3><div class="lcd-g"><div class="lcd cl" id="lcd-cl"></div><div class="lcd dmm" id="lcd-dmm"></div><div class="lcd tb" id="lcd-tester"></div></div></div>
      <div class="instr" data-panou="osc" hidden><h3>Osciloscopul (CH1 – cleștele, CH2 – tensiunea bateriei)</h3>
        <div class="rand-butoane"><button type="button" data-capt="antr">Oscilograma antrenării</button><button type="button" data-capt="porn">Oscilograma pornirii</button><button type="button" id="b-csv-osc">Exportă CSV</button></div>
        <canvas id="cv-osc" aria-label="Oscilograma curentului și a tensiunii"></canvas>
        <div class="cursoare"><b>A</b><input type="range" id="cur-a" min="0" max="100" step="1" value="0"><button type="button" data-fin="a-1">◀</button><button type="button" data-fin="a1">▶</button>
          <b>B</b><input type="range" id="cur-b" min="0" max="100" step="1" value="100"><button type="button" data-fin="b-1">◀</button><button type="button" data-fin="b1">▶</button></div>
        <div class="osc-cit" id="osc-cit"></div></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari"><summary>Defecte de diagnosticat (mod demonstrativ)</summary>
        <label class="camp">Situația <select id="in-defect" data-blocat-eval><option value="none">sistem în stare bună</option><option value="oxid">bornă (+) oxidată</option><option value="masa">legătură de masă slăbită</option><option value="baterie">baterie descărcată / uzată</option><option value="demaror">demaror cu frecări mari (bucșe uzate)</option></select></label></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiestePasi();
      if (!MOD.eval) { const p = P(); Object.assign(C.D.date, { Cn: p.Cn, CCAn: p.CCAn, Pc: p.Pc, ts: p.ts, dsoc: p.dsoc, Pbsg: p.Pbsg, tfr: p.tfr }); C.construiesteDateLucru(); }
      $("#in-defect").addEventListener("change", e => { sim.defect = e.target.value; sim.capt = { antr: null, porn: null }; sim.testRez = null; sim.oscVer++; deseneaza(); });
      $("#ck-tr").addEventListener("change", e => { sim.transparent = e.target.checked; });
      $$(".saa7-scena [data-vv]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.vv)));
      $$("[data-capt]").forEach(b => b.addEventListener("click", () => { if (!sim.capt[b.dataset.capt]) return Cadru.mesajTemporar("Oscilograma nu a fost înregistrată încă.", "atentie"); arataCapt(b.dataset.capt); }));
      $("#b-csv-osc").addEventListener("click", exportOsc);
      const ca = $("#cur-a"), cb = $("#cur-b");
      ca.addEventListener("input", () => { sim.cA = +ca.value; sim.oscVer++; deseneazaOsc(); }); cb.addEventListener("input", () => { sim.cB = +cb.value; sim.oscVer++; deseneazaOsc(); });
      $$("[data-fin]").forEach(b => b.addEventListener("click", () => { const k = b.dataset.fin, d = k.endsWith("-1") ? -1 : 1, el = k[0] === "a" ? ca : cb; el.value = cl(+el.value + d, 0, +el.max); el.dispatchEvent(new Event("input")); }));
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval(Pp, C) { Object.assign(C.D.date, { Cn: Pp.Cn, CCAn: Pp.CCAn, Pc: Pp.Pc, ts: Pp.ts, dsoc: Pp.dsoc, Pbsg: Pp.Pbsg, tfr: Pp.tfr }); sim.defect = "none"; const d = $("#in-defect"); if (d) d.disabled = true; },
    reset() { Object.assign(sim, { crank: false, merge: false, tRun: 0, tester: false, testT: null, testRez: null, sig: true, cleste: null, osc: false, dmm: null, cons: false, capt: { antr: null, porn: null }, live: null, tUltimaAntr: -1e9 }); sim.oscVer++; },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * sim.rapid, pr = P();
      sim.t += dt;
      if (sim.crank) {
        sim.tCrank = (performance.now() - sim.t0Crank) / 1000; const p = MD.efectiv(pr, def());
        if (sim.capF === "porn" && sim.tCrank >= p.tF + 0.15) elibereaza();
        else if (sim.tCrank >= 10) elibereaza("10s");
      }
      if (sim.merge) sim.tRun += sim.tRun < 1.6 ? h : dt;   // citirea de la 0 s se face în timp real, apoi se poate accelera
      if (sim.testT != null && !sim.testRez && sim.t - sim.testT >= 3) sim.testRez = MD.tester(pr, def());
      if (!vizibil) return;
      const now = performance.now();
      if (sim.crank && sim.osc && sim.cleste === "dem" && now - (this._tl || 0) > 160) { this._tl = now; sim.live = MD.oscilograma(pr, sim.capF === "porn" ? "porn" : "antr", Math.max(0.05, Math.round(sim.tCrank * 100) / 100), def());
        if (sim.capF !== "porn") { const n = Math.round((MD.PRE + sim.tCrank) / DTs); ["t", "i", "u"].forEach(k => sim.live[k] = sim.live[k].slice(0, n)); }
        else { const n = Math.round((MD.PRE + sim.tCrank) / DTs); ["t", "i", "u"].forEach(k => sim.live[k] = sim.live[k].slice(0, Math.min(sim.live[k].length, n))); }
        sim.oscVer++; }
      actualizeaza3D();
      if (now - (this._ts || 0) > 200) { this._ts = now; actualizeazaPasi(); deseneaza(); C.stare(1, sim.crank ? `antrenare – ${fx(sim.tCrank, 1)} s` : sim.merge ? "motor pornit – 800 rot/min" : "motor oprit", sim.crank || sim.merge ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { deseneaza(); },
    formule() { return []; }
  }
});
