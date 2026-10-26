/* MF – Lucrarea 5. Regimuri de curgere. Experiența lui Reynolds.
   Simulator: aparatul Reynolds 3D realist – rezervorul de nivel constant din acril cu alimentare, preaplin, grilă de liniștire și
   termometru, vasul de colorant cu acul injector în axa intrării profilate, tubul de sticlă d = 10 mm, robinetul de reglare cu roata
   de manevră, furtunul de ieșire, vasul gradat de 1 L și cronometrul. Firul de colorant se vede ca linie (laminar), oscilant și cu
   pufuri (tranziție) sau amestecat în toată secțiunea (turbulent); tranziția are histerezis. Parametrii sunt individuali. */
"use strict";
const MD = MODELE["mf-l5"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea aparatului */
const sim = {
  t: 0, viteza: 1, manusi: false, alim: false, plin: false, tRep: 0, a: 0, aEf: 0, st: "laminar", colorant: false, nivColorant: 1,
  colectare: false, Vvas: 0, crono: 0, cronoMerge: false, tAdev: 0, err: 0, dir: 0, ultStCol: null, stTranz: [], aspect: ""
};
let SV3 = null;
const Q = () => sim.alim && sim.plin ? MD.debit(P(), sim.aEf) : 0;          // [L/s]
const reAdev = () => MD.Re(P(), Q());
function actualizeazaRegim() { sim.st = Q() > 0 ? MD.regim(P(), reAdev(), sim.st, sim.tRep) : "laminar"; }
const NUME_ST = { laminar: "linie dreaptă, subțire – laminar", tranzitie: "oscilant, cu pufuri intermitente – tranziție", turbulent: "amestecat rapid în toată secțiunea – turbulent" };

/* ------------------------------------------------------------------ comenzi */
function seteazaA(a) {
  const nou = Math.max(0, Math.min(100, Math.round(a * 2) / 2)), d = nou - sim.a;
  if (Math.abs(d) >= 10) { sim.tRep = Math.min(sim.tRep, 40); Cadru.mesajTemporar("Robinetul se manevrează lent: o deschidere bruscă perturbă curgerea (tranziția apare mai devreme).", "atentie"); }
  sim.dir = d > 0 ? 1 : d < 0 ? -1 : sim.dir; sim.a = nou; actualizeaza();
}
function comutaAlim() {
  if (!sim.alim && !sim.manusi) Cadru.mesajTemporar("Pentru colorant sunt necesare mănușile; alimentarea se deschide lent, în prezența cadrului didactic.", "atentie");
  sim.alim = !sim.alim; if (!sim.alim) { sim.tRep = 0; } actualizeaza();
}
function comutaColorant() {
  if (!sim.manusi) return Cadru.mesajTemporar("NSSM: colorantul se manipulează cu mănuși.", "pericol");
  sim.colorant = !sim.colorant; actualizeaza();
}
function startColectare() {
  if (sim.colectare) return opresteColectare();
  if (Q() <= 0) return Cadru.mesajTemporar("Nu curge apă: alimentarea și robinetul de reglare.", "atentie");
  if (sim.Vvas > 0.001) return Cadru.mesajTemporar("Goliți întâi vasul gradat.", "atentie");
  sim.colectare = true; sim.tAdev = 0; sim.crono = 0; sim.cronoMerge = true; sim.err = (Math.random() - 0.5) * 0.3; sim.stColectare = sim.st; sim.stMix = false; actualizeaza();
}
function opresteColectare() {
  if (!sim.colectare) return; sim.colectare = false; sim.cronoMerge = false; sim.crono = Math.max(0, Math.round((sim.tAdev + sim.err) * 100) / 100);
  if (sim.crono < 5) Cadru.mesajTemporar("Timpul de colectare este prea scurt (< 5 s): eroarea de pornire / oprire a cronometrului devine mare.", "atentie");
  actualizeaza();
}
function golesteVas() { if (sim.colectare) return; sim.Vvas = 0; sim.crono = 0; actualizeaza(); }
const Vcitit = () => Math.round(sim.Vvas / 0.01) * 0.01;

/* ------------------------------------------------------------------ înregistrări */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregT(e) {
  if (!sim.plin) return Cadru.mesajTemporar("Umpleți rezervorul (alimentarea deschisă).", "atentie");
  const v = Math.round(P().T * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "T", v }, celule: [{ t: "t50", r: "T", c: "v", v: v.toFixed(1) }] }); if (ok) msg(`Tabelul 5.0: temperatura apei ${fx(v, 1)} °C.`);
}
function verifMasurare() {
  if (sim.colectare) { Cadru.mesajTemporar("Opriți întâi colectarea.", "atentie"); return false; }
  if (!(sim.Vvas > 0.02) || !(sim.crono > 0)) { Cadru.mesajTemporar("Colectați apă în vasul gradat cu cronometrul pornit (Start / Stop colectare).", "atentie"); return false; }
  if (sim.Vvas > 1.0) { Cadru.mesajTemporar("Vasul a dat pe dinafară (> 1 L): golire și repetare.", "atentie"); return false; }
  if (sim.stMix) { Cadru.mesajTemporar("Regimul s-a schimbat în timpul colectării: repetați la debit constant.", "atentie"); return false; }
  return true;
}
function inregRand(e) {
  if (!verifMasurare()) return;
  const asp = $("#sel-asp").value; if (!asp) return Cadru.mesajTemporar("Alegeți aspectul firului de colorant observat.", "atentie");
  const T = Cadru.D.t; let k = null; for (let i = 1; i <= 8; i++) if (T.t52["r" + i].V === "") { k = "r" + i; break; } if (!k) return Cadru.mesajTemporar("Tabelul 5.2 este plin (8 determinări).", "atentie");
  const V = Vcitit(), t = sim.crono;
  const ok = Cadru.inregistreaza(e, { log: { m: "q", k, a: sim.a, V, t, st: sim.stColectare, asp }, celule: [{ t: "t52", r: k, c: "V", v: V.toFixed(2) }, { t: "t52", r: k, c: "t", v: t.toFixed(2) }, { t: "t52", r: k, c: "asp", v: asp }] });
  if (ok) { msg(`Tabelul 5.2, determinarea ${k.slice(1)}: V = ${fx(V, 2)} L în t = ${fx(t, 2)} s; aspect: ${asp}. Goliți vasul.`); }
}
function inregCrit(e, k) {
  if (!verifMasurare()) return;
  const cond = { sus1: [sim.dir > 0 && sim.stColectare === "tranzitie", "La creșterea lentă a debitului, colectați exact când firul începe să oscileze (regim de tranziție)."],
    sus2: [sim.dir > 0 && sim.stColectare === "turbulent", "Creșteți debitul până când colorantul se amestecă în toată secțiunea (turbulent) și colectați."],
    jos: [sim.dir < 0 && sim.stColectare === "laminar", "La scăderea lentă a debitului, colectați imediat ce firul redevine o linie (laminar)."] }[k];
  if (!cond[0]) return Cadru.mesajTemporar(cond[1], "atentie");
  const V = Vcitit(), t = sim.crono;
  const ok = Cadru.inregistreaza(e, { log: { m: "q", k, a: sim.a, V, t, st: sim.stColectare, dir: sim.dir }, celule: [{ t: "t52b", r: k, c: "V", v: V.toFixed(2) }, { t: "t52b", r: k, c: "t", v: t.toFixed(2) }] });
  if (ok) msg(`Tabelul 5.2b (${{ sus1: "începutul oscilației, crescător", sus2: "amestec complet, crescător", jos: "redevine laminar, descrescător" }[k]}): V = ${fx(V, 2)} L, t = ${fx(t, 2)} s.`);
}

/* ------------------------------------------------------------------ pașii */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const nRand = () => [1, 2, 3, 4, 5, 6, 7, 8].filter(i => pe("t52", "r" + i, "V")).length;
const ctlRob = `<div class="rand-butoane"><span class="nota">Robinet:</span><button type="button" data-da="-5">−5 %</button><button type="button" data-da="-1">−1 %</button><button type="button" data-da="-0.5">−0,5</button><button type="button" data-da="0.5">+0,5</button><button type="button" data-da="1">+1 %</button><button type="button" data-da="5">+5 %</button><b class="af-a"></b></div>
  <div class="rand-butoane"><button type="button" class="b-col">Start colectare (furtunul în vas + cronometru)</button><button type="button" class="b-gol">Golește vasul</button><button type="button" class="b-colo">Colorant: deschide</button></div>`;
const selAsp = `<label class="camp">Aspectul firului observat <select id="sel-asp"><option value=""></option>${MD.ASPECT.map(a => `<option>${a}</option>`).join("")}</select></label>`;
const PASI = [
  { t: "Pregătirea", tab: "Tabelul 5.0 – temperatura", v3: "tot",
    instr: ["NSSM: mănuși pentru colorant; tubul de sticlă nu se lovește; apa scursă se șterge.", "Deschideți alimentarea (lent): rezervorul se umple până la preaplin. Robinetul de reglare închis.", "Lăsați apa în repaus 5–10 minute (timp accelerat), apoi citiți temperatura apei."],
    ver: () => [[sim.manusi, "mănuși"], [sim.plin, sim.alim ? (sim.plin ? "rezervorul plin, nivel constant" : "se umple…") : "alimentarea închisă"], [sim.tRep >= 300, `repaus: ${fx(Math.min(sim.tRep, 600) / 60, 1)} min`]],
    prog: () => pe("t50", "T", "v") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși</label><button type="button" id="b-alim">Deschide alimentarea</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp ×10</label></div>`,
    buton: [["● Temperatura apei → Tabelul 5.0", inregT]] },
  { t: "Regimul laminar", tab: "Tabelul 5.2", v3: "intrare",
    instr: ["Deschideți colorantul și foarte puțin robinetul de reglare: firul de colorant este o linie dreaptă.", "Colectați apă în vasul gradat (≥ 10 s): Start / Stop colectare; citiți V și t.", "Alegeți aspectul observat și înregistrați. Faceți 2 determinări în regim laminar."],
    ver: () => [[sim.colorant, "colorantul deschis"], [Q() > 0, "apa curge"], [!sim.colectare && sim.Vvas > 0.02, "colectare încheiată"]],
    prog: () => Math.min(2, nRand()), tot: 2, ctl: ctlRob + selAsp, buton: [["● V, t și aspectul → Tabelul 5.2", inregRand]] },
  { t: "Creșterea debitului", tab: "Tabelele 5.2 și 5.2b", v3: "tub",
    instr: ["Creșteți lent debitul (câte 0,5…1 %), așteptând câteva secunde după fiecare pas.", "Când firul începe să oscileze, colectați: „● începutul oscilației”. Continuați până la amestecul complet: „● amestec complet”.", "Faceți și determinări în tranziție și în turbulent (Tabelul 5.2)."],
    ver: () => [[sim.dir > 0, "debitul crește"], [sim.st !== "laminar", `regim: ${NUME_ST[sim.st].split(" – ")[1]}`]],
    prog: () => ["sus1", "sus2"].filter(k => pe("t52b", k, "V")).length, tot: 2, ctl: ctlRob + selAsp,
    buton: [["● V, t – începutul oscilației → Tabelul 5.2b", e => inregCrit(e, "sus1")], ["● V, t – amestec complet → Tabelul 5.2b", e => inregCrit(e, "sus2")], ["● V, t și aspectul → Tabelul 5.2", inregRand]] },
  { t: "Scăderea debitului", tab: "Tabelul 5.2b – Re critic inferior", v3: "tub",
    instr: ["Din regim turbulent, scădeți lent debitul.", "Când firul redevine o linie dreaptă, colectați: „● redevine laminar”.", "Completați Tabelul 5.2 până la cel puțin 6 determinări în toate cele trei regimuri."],
    ver: () => [[sim.dir < 0, "debitul scade"], [nRand() >= 6, `determinări: ${nRand()}/6`]],
    prog: () => (pe("t52b", "jos", "V") ? 1 : 0) + Math.min(6, nRand()), tot: 7, ctl: ctlRob + selAsp,
    buton: [["● V, t – redevine laminar → Tabelul 5.2b", e => inregCrit(e, "jos")], ["● V, t și aspectul → Tabelul 5.2", inregRand]] },
  { t: "Re în sistemele autovehiculului", tab: "Tabelul 5.3", v3: "tot",
    instr: ["Calculați Re = v·d/ν pentru fiecare curgere din Tabelul 5.3 (fila Determinări) și stabiliți regimul.", "Comparați: uleiul curge laminar în galerii, lichidul de răcire și aerul – turbulent."],
    ver: () => [[MD.AUTO.every(x => pe("t53", x.k, "Re")), "Tabelul 5.3 completat"]], prog: () => MD.AUTO.filter(x => pe("t53", x.k, "Re")).length, tot: 6, ctl: "", buton: [] }
];
let pasActiv = 0;
const VEDERI = { tot: [[0.1, 0.85, 2.0], [0.0, 0.25, 0.0]], intrare: [[-0.38, 0.36, 0.22], [-0.42, 0.3, 0.0]], tub: [[-0.1, 0.36, 0.3], [-0.1, 0.3, 0.0]], vas: [[0.55, 0.3, 0.55], [0.55, 0.1, 0.15]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small>${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol><ul class="pas-ver"></ul><div class="pas-ctl">${p.ctl}</div>${p.buton.map(([t], j) => `<button type="button" class="primar lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].buton[+b.dataset.j][1](e); actualizeazaPasi(); }));
  const ck = $("#ck-man"); if (ck) ck.addEventListener("change", e => { sim.manusi = e.target.checked; actualizeaza(); });
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.viteza = e.target.checked ? 10 : 1; }));
  const ba = $("#b-alim"); if (ba) ba.addEventListener("click", comutaAlim);
  $$("[data-da]").forEach(b => b.addEventListener("click", () => seteazaA(sim.a + +b.dataset.da)));
  $$(".b-col").forEach(b => b.addEventListener("click", startColectare)); $$(".b-gol").forEach(b => b.addEventListener("click", golesteVas)); $$(".b-colo").forEach(b => b.addEventListener("click", comutaColorant));
  alegePas(0);
}
function alegePas(i) { pasActiv = i; $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i)); $("#banda").innerHTML = `Pasul ${i + 1} · ${PASI[i].instr[0]}`; vedere3d(PASI[i].v3); actualizeazaPasi(); }
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  $$(".b-col").forEach(b => { b.textContent = sim.colectare ? "■ Stop colectare (furtunul la scurgere + cronometru)" : "▶ Start colectare (furtunul în vas + cronometru)"; b.classList.toggle("activ", sim.colectare); });
  $$(".b-colo").forEach(b => { b.textContent = sim.colorant ? "Colorant: închide" : "Colorant: deschide"; b.classList.toggle("activ", sim.colorant); });
  const ba = $("#b-alim"); if (ba) { ba.textContent = sim.alim ? "Închide alimentarea" : "Deschide alimentarea"; ba.classList.toggle("activ", sim.alim); }
  $$(".af-a").forEach(el => el.textContent = `deschidere ${fx(sim.a, 1)} %`);
}
function afisaje() {
  const e = $("#afis"); if (!e) return;
  e.innerHTML = `<div><span>Temperatura apei (termometru)</span><b>${sim.plin ? fx(P().T, 1) + " °C" : "—"}</b></div><div><span>Robinetul de reglare</span><b>${fx(sim.a, 1)} %</b></div>
    <div><span>Vasul gradat</span><b>${fx(Vcitit(), 2)} L</b></div><div><span>Cronometrul</span><b>${fx(sim.crono, 2)} s</b></div><div><span>Repaus în rezervor</span><b>${fx(Math.min(sim.tRep, 900) / 60, 1)} min</b></div>`;
  const f = $("#fir"); if (f) f.textContent = !sim.colorant ? "Colorantul închis." : Q() <= 0 ? "Apa nu curge." : `Firul de colorant: ${NUME_ST[sim.st].split(" – ")[0]}.`;
}
function sincron3d() {
  if (!SV3) return; const p = P();
  SV3.seteaza({ v: Q() / 1000 / (Math.PI * 0.0001 / 4), st: sim.st, gamma: MD.gamma(p, reAdev(), sim.st), colorant: sim.colorant && Q() > 0, alim: sim.alim, a: sim.a, colectare: sim.colectare, Vvas: sim.Vvas, crono: sim.crono, T: p.T, nivColorant: sim.nivColorant });
}
function actualizeaza() { afisaje(); sincron3d(); actualizeazaPasi(); }
function laClic3d(k) {
  if (k === "alim") return comutaAlim();
  if (k === "robColorant" || k === "colorant") return comutaColorant();
  if (k === "robinet") return seteazaA(sim.a + 1);
  if (k === "crono" || k === "vas") return startColectare();
  const et = { rezervor: "Rezervorul de nivel constant: preaplinul menține sarcina constantă; grila liniștește apa.", termometru: `Termometrul: ${fx(P().T, 1)} °C.`, tub: "Tubul de sticlă: d = 10 mm interior, intrare profilată (fără desprinderi la intrare)." }[k];
  if (et) Cadru.mesajTemporar(et, "");
}

/* ------------------------------------------------------------------ calcule */
function calculeazaMF5(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), F = Number.isFinite, cel = { t50: {}, t52: {}, t52b: {}, t53: {} }, rele = { t52: {} };
  cel.t50.T = { nu: F(o.nu) ? fx(o.nu, 3) : "" };
  const reg = re => re < 2300 ? "laminar" : re < 4000 ? "tranziție" : "turbulent";
  for (let i = 1; i <= 8; i++) { const r = o.rand["r" + i]; cel.t52["r" + i] = { Q: F(r.Q) ? fx(r.Q, 4) : "", v: F(r.v) ? fx(r.v, 3) : "", Re: F(r.Re) ? fx(r.Re, 0) : "", calc: F(r.Re) ? reg(r.Re) : "" };
    const asp = t.t52["r" + i].asp, rc = F(r.Re) ? reg(r.Re) : "", ia = MD.ASPECT.indexOf(asp); rele.t52["r" + i] = { calc: ia >= 0 && !!rc && ["laminar", "tranziție", "turbulent"][ia] !== rc }; }
  ["sus1", "sus2", "jos"].forEach(k => { const r = o.crit[k]; cel.t52b[k] = { Q: F(r.Q) ? fx(r.Q, 4) : "", v: F(r.v) ? fx(r.v, 3) : "", Re: F(r.Re) ? fx(r.Re, 0) : "" }; });
  MD.AUTO.forEach(x => { cel.t53[x.k] = { d: x.d, v: String(x.v).replace(".", ","), nu: String(x.nu).replace(".", ",") }; });
  const rez = [["ν(T) din Tabelul 5.1", F(o.nu) ? `${fx(o.nu, 3)} mm²/s la ${fx(o.T, 1)} °C` : "—"], ["Re critic superior (începutul oscilației)", F(o.crit.sus1.Re) ? `<span style="color:var(--accent)">${fx(o.crit.sus1.Re, 0)}</span>` : "—"],
    ["Re la amestecul complet", F(o.crit.sus2.Re) ? fx(o.crit.sus2.Re, 0) : "—"], ["Re critic inferior (redevine laminar)", F(o.crit.jos.Re) ? `<span style="color:var(--accent)">${fx(o.crit.jos.Re, 0)}</span>` : "—"]];
  const verdicte = [];
  if (F(o.crit.sus1.Re) && F(o.crit.jos.Re)) verdicte.push({ tip: "ok", text: `Histerezis: Re critic la creșterea debitului (${fx(o.crit.sus1.Re, 0)}) este mai mare decât la scădere (${fx(o.crit.jos.Re, 0)}) – regimul laminar persistă instabil în lipsa perturbațiilor.` });
  const pts = [1, 2, 3, 4, 5, 6, 7, 8].map(i => o.rand["r" + i]).filter(r => F(r.Re)).map((r, j) => [r.Re, j + 1]);
  return { celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Determinările pe axa numărului Reynolds (zone: laminar < 2300 < tranziție < 4000 < turbulent)",
    grafic: { xmin: 0, xmax: Math.max(8000, ...pts.map(p => p[0] * 1.1)), ymin: 0, ymax: 9, xlab: "Re", ylab: "determinarea", serii: [{ tip: "linie", pts: [[2300, 0], [2300, 9]], culoare: 1, punctat: true }, { tip: "linie", pts: [[4000, 0], [4000, 9]], culoare: 3, punctat: true }, { tip: "pct", pts, culoare: 0, r: 5 }] },
    legenda: [["determinări", "var(--serie-0)", "pct"], ["Re = 2300", "var(--serie-1)"], ["Re = 4000", "var(--serie-3)"]], principal: { eticheta: "Re critic superior", valoare: F(o.crit.sus1.Re) ? Math.round(o.crit.sus1.Re) : null } };
}

/* ------------------------------------------------------------------ conținut */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Aparatul se alimentează de la rețeaua de apă sau de la bancul hidraulic numai în prezența cadrului didactic; robinetele se manevrează lent.</li>
<li>Tubul de sticlă al aparatului nu se lovește și nu se strânge excesiv în suporturi; la spargere se oprește alimentarea și se anunță cadrul didactic.</li>
<li>Colorantul (fluoresceină sau permanganat de potasiu diluat) se manipulează cu mănuși; nu se varsă pe piele sau pe haine.</li>
<li>Apa scursă se șterge imediat; aparatura electrică a bancului hidraulic nu se atinge cu mâinile ude.</li></ul></div>
<h2>5.1. Scopul lucrării</h2>
<p>Vizualizarea regimurilor de curgere laminar, de tranziție și turbulent, determinarea numărului Reynolds critic și aplicarea criteriului Reynolds la curgerile din sistemele autovehiculului: ungere, răcire, alimentare cu combustibil și admisia aerului.</p>
<h2>5.2. Noțiuni teoretice</h2>
<p>Osborne Reynolds (1883) a arătat că într-o conductă există două regimuri de curgere. În regimul laminar particulele se deplasează în straturi paralele, iar un fir de colorant rămâne o linie subțire; în regimul turbulent apar fluctuații de viteză și vârtejuri, iar colorantul se amestecă rapid în toată secțiunea (Fig. 5.1). Regimul este dat de numărul Reynolds, raportul dintre forțele de inerție și cele de vâscozitate:</p>
<div class="ec"><span>Re = v·d/ν = ρ·v·d/η</span><span class="nr">(5.1)</span></div>
<div class="ec"><span>v = Q/A = 4·Q/(π·d²)</span><span class="nr">(5.2)</span></div>
<figure><img src="img/fig5_1.jpg" alt="Fig. 5.1" loading="lazy"><figcaption>Fig. 5.1. Aparatul Reynolds: firul de colorant în regim laminar și turbulent</figcaption></figure>
<p>Pentru conducte circulare: Re &lt; 2300 – regim laminar; 2300 &lt; Re &lt; 4000 – regim de tranziție (instabil); Re &gt; 4000 – regim turbulent. Valoarea critică poate crește mult (până la 10⁴ și peste) dacă intrarea este foarte netedă și apa este perfect liniștită, dar regimul laminar redevine stabil numai sub ≈ 2300. Pentru secțiuni necirculare (canale de răcire, galerii de ulei) se folosește diametrul hidraulic d<sub>h</sub> = 4·A/P, unde P este perimetrul udat.</p>
<p>Regimul determină distribuția vitezelor în secțiune (Fig. 5.2): în regim laminar profilul este parabolic, cu viteza maximă egală cu dublul vitezei medii; în regim turbulent profilul este aplatizat, iar viteza maximă este cu doar 15…25 % mai mare decât cea medie. Tot regimul determină pierderile de sarcină (lucrarea 6) și transferul de căldură (mult mai intens în regim turbulent).</p>
<figure><img src="img/fig5_2.jpg" alt="Fig. 5.2" loading="lazy"><figcaption>Fig. 5.2. Distribuția vitezelor în regim laminar și turbulent</figcaption></figure>
<p>Vâscozitatea cinematică a apei scade cu temperatura (Tabelul 5.1), deci la același debit numărul Reynolds crește când apa se încălzește; efectul este mult mai puternic la ulei (lucrarea 1).</p>
<h3>Tabelul 5.1. Vâscozitatea cinematică a apei</h3>
<div class="tabel-scroll"><table class="tabel"><thead><tr><th>t [°C]</th>${MD.TNU.map(r => `<th>${r[0]}</th>`).join("")}</tr></thead><tbody><tr><td>ν [mm²/s]</td>${MD.TNU.map(r => `<td>${String(r[1]).replace(".", ",")}</td>`).join("")}</tr></tbody></table></div>
<div class="nota-indrumar"><h3>Completări față de îndrumarul tipărit</h3><ul>
<li><b>Tabelul 5.0 și 5.2b.</b> Temperatura apei se notează separat (Tabelul 5.0), iar punctele critice – începutul oscilației și amestecul complet la creșterea debitului, revenirea la laminar la scăderea lui – într-un tabel separat (5.2b), din care rezultă Re critic superior și inferior.</li>
<li><b>Repausul apei și manevrarea lentă.</b> În simulator, ca în realitate, Re critic superior depinde de cât de liniștită este apa: fără repaus sau după o manevră bruscă a robinetului tranziția apare aproape de 2300.</li>
<li><b>Cronometrarea.</b> Timpul de colectare se pornește și se oprește manual (eroare de ± 0,1…0,2 s): colectați cel puțin 10…20 s.</li></ul></div>
<h2>5.4. Modul de lucru (în simulator)</h2>
<ol><li>Alimentarea, repausul 5–10 min, temperatura apei.</li><li>Regim laminar: colorant, debit mic, V și t.</li><li>Creșterea lentă a debitului: începutul oscilației, amestecul complet; determinări în tranziție și turbulent.</li><li>Scăderea lentă: revenirea la laminar.</li><li>Tabelul 5.3: Re pentru curgerile din autovehicul.</li></ol>
<h2>5.7. Interpretarea rezultatelor</h2>
<ul><li>Regimul observat se compară cu cel prezis de numărul Reynolds; tranziția apare de obicei între 2000 și 4000, în funcție de perturbațiile de la intrare.</li>
<li>Re critic la creșterea debitului este mai mare decât la scăderea lui, deoarece regimul laminar poate persista instabil dacă nu există perturbații.</li>
<li>Se explică de ce uleiul curge laminar în galerii (vâscozitate mare), iar lichidul de răcire și aerul curg turbulent.</li>
<li>Se discută influența temperaturii: încălzirea apei cu 10 °C crește Re cu ≈ 20–30 %, iar încălzirea uleiului de la 20 la 100 °C crește Re de ≈ 15 ori.</li></ul>
<h2>5.8. Relevanță practică</h2>
<p>Regimul de curgere stabilește modul de calcul al pierderilor de presiune și al transferului de căldură. Canalele de răcire ale plăcilor de răcire din bateriile de tracțiune ale vehiculelor electrice au diametre hidraulice mici și pot lucra la numere Reynolds de câteva sute, în regim laminar, cu transfer de căldură redus – de aceea se folosesc nervuri sau turbulatoare. În admisia motorului, regimul turbulent și profilul de viteză influențează precizia debitmetrului de aer cu film cald, montat de aceea după o porțiune dreaptă sau după o grilă de liniștire.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>d = 10 mm, apă la 20 °C (ν = 1,004 mm²/s). Determinarea 1: 0,5 L în 60 s; determinarea 2: 1,0 L în 20 s.</p>
<div class="ec"><span>A = π·0,01²/4 = 7,854·10<sup>−5</sup> m²</span><span class="nr">(5.3)</span></div>
<div class="ec"><span>Q<sub>1</sub> = 0,5·10<sup>−3</sup>/60 = 8,33·10<sup>−6</sup> m³/s; v<sub>1</sub> = 0,106 m/s</span><span class="nr">(5.4–5.5)</span></div>
<div class="ec"><span>Re<sub>1</sub> = 0,106·0,01/(1,004·10<sup>−6</sup>) = 1057 (laminar)</span><span class="nr">(5.6)</span></div>
<div class="ec"><span>v<sub>2</sub> = 5·10<sup>−5</sup>/7,854·10<sup>−5</sup> = 0,637 m/s; Re<sub>2</sub> = 6340 (turbulent)</span><span class="nr">(5.7–5.8)</span></div>
<p>Pentru ulei în galeria principală (d = 8 mm, v = 2 m/s): la 0 °C Re = 28, iar la 100 °C Re = 1455 – regimul rămâne laminar. Pentru lichidul de răcire în furtun (d = 32 mm, v = 1,5 m/s, ν = 0,8 mm²/s) Re = 60 000 – turbulent. În tubulatura de admisie (d = 70 mm, v = 30 m/s, ν = 15 mm²/s) Re = 140 000.</p>
<div class="problema"><h3>Problema 1</h3><p>Calculați diametrul hidraulic al unui canal dreptunghiular de 4 × 20 mm și Re pentru lichid de răcire la v = 0,8 m/s, ν = 0,8 mm²/s.</p><details class="sol"><summary>Rezolvare</summary><p>d<sub>h</sub> = 4·80/48 = 6,67 mm; Re = 0,8·0,00667/0,8·10<sup>−6</sup> = 6670 – turbulent.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Ce debit (L/min) corespunde lui Re = 2300 în tubul de 10 mm, cu apă la 15 °C?</p><details class="sol"><summary>Rezolvare</summary><p>v = 2300·1,139·10<sup>−6</sup>/0,01 = 0,262 m/s; Q = 0,262·7,854·10<sup>−5</sup> = 2,06·10<sup>−5</sup> m³/s = 1,23 L/min.</p></details></div>`;
}
const INTREBARI = [
  ["Ce reprezintă fizic numărul Reynolds?", "Raportul dintre forțele de inerție și forțele de vâscozitate (ρv²/d raportat la ηv/d²); la Re mic vâscozitatea amortizează perturbațiile (laminar), la Re mare inerția le amplifică (turbulent)."],
  ["Care sunt valorile critice ale numărului Reynolds pentru conducte circulare?", "Re ≈ 2300 – sub această valoare regimul laminar este stabil; 2300…4000 – tranziție; peste 4000 – turbulent. Re critic superior poate fi mult mai mare la intrare netedă și apă liniștită."],
  ["Cum se calculează diametrul hidraulic pentru un canal dreptunghiular de 4 × 20 mm?", "d<sub>h</sub> = 4A/P = 4·80/(2·(4 + 20)) = 6,67 mm."],
  ["De ce uleiul rece curge laminar în galeriile motorului?", "Vâscozitatea uleiului rece este foarte mare (ν ≈ 170…570 mm²/s), deci Re = v·d/ν este de ordinul zecilor – mult sub 2300."],
  ["De ce regimul turbulent favorizează răcirea?", "Fluctuațiile de viteză amestecă fluidul în secțiune, subțiază stratul limită termic de lângă perete și cresc coeficientul de transfer de căldură (Nu ~ Re<sup>0,8</sup>)."]
];
const TEST = [
  { q: "Re pentru v = 0,106 m/s, d = 10 mm, ν = 1,004 mm²/s este:", o: ["106", "1057", "10 570", "2300"], c: 1, e: "0,106·0,01/1,004·10⁻⁶." },
  { q: "În regim laminar viteza maximă în axă este:", o: ["egală cu viteza medie", "dublul vitezei medii", "cu 20 % mai mare", "jumătate din medie"], c: 1, e: "Profil parabolic." },
  { q: "Diametrul hidraulic al unui canal 4 × 20 mm este:", o: ["4 mm", "6,67 mm", "12 mm", "20 mm"], c: 1, e: "4A/P." },
  { q: "La încălzirea apei de la 10 la 20 °C, la același debit, Re:", o: ["scade", "crește cu ≈ 30 %", "nu se schimbă", "se dublează"], c: 1, e: "ν scade de la 1,306 la 1,004 mm²/s." },
  { q: "Re critic la creșterea debitului față de cel la scădere este:", o: ["mai mic", "mai mare", "egal", "nedefinit"], c: 1, e: "Histerezis – laminarul persistă fără perturbații." }
];
const CSS = `<style>
.mf5-3d .m3d { height:clamp(380px, 56vh, 620px); }
.mf5-scena { position:relative; }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.mf5-banda { margin:.4rem 0; background:color-mix(in srgb, var(--accent) 12%, var(--suprafata)); border-left:4px solid var(--accent); padding:.35rem .6rem; border-radius:6px; font-size:.86rem; }
.mf5-afis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:.4rem; margin:.5rem 0; } .mf5-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .mf5-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .mf5-afis b { font-size:1.05rem; }
.mf5-vederi { display:flex; flex-wrap:wrap; gap:.3rem; margin:.3rem 0; } .mf5-vederi button { font-size:.8rem; padding:.2rem .55rem; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); } .pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; } .pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; } .pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; } .pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; } .pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; align-items:center; } .pas-ctl button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); } .pas-ctl .camp { margin:.35rem 0; } .pas-corp > button.lat { margin-top:.3rem; }
.sim-grila:fullscreen .mf5-scena, .sim-grila.ecran-plin .mf5-scena { display:block; } .sim-grila:fullscreen .mf5-3d .m3d, .sim-grila.ecran-plin .mf5-3d .m3d { height:calc(100vh - 16rem); }
</style>`;
Cadru.porneste({
  disc: "MF", nr: 5, cod: "mf-l5",
  titlu: "Regimuri de curgere. Experiența lui Reynolds",
  scurt: "Experiența lui Reynolds",
  subtitlu: "Laborator virtual – aparatul Reynolds: firul de colorant în regim laminar, de tranziție și turbulent, numărul Reynolds critic superior și inferior",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261025); },
  date: [{ k: "d", et: "d tub [mm]", v: 10, fix: true }, { k: "V", et: "Vasul gradat [L]", v: 1, fix: true }],
  tabele: [
    { id: "t50", titlu: "Tabelul 5.0. Temperatura apei", antetRand: "", randuri: [{ k: "T", et: "Temperatura apei [°C]" }], coloane: [{ k: "v", t: "Valoare", intrare: true }, { k: "nu", t: "ν (Tabelul 5.1) [mm²/s]" }] },
    { id: "t52", titlu: "Tabelul 5.2. Determinări", antetRand: "Nr.", nota: "Q = V/t; v = 4Q/(πd²); Re = v·d/ν (d = 10 mm, ν la temperatura apei). Regimul calculat se compară cu aspectul observat.",
      randuri: [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ k: "r" + i, et: String(i) })),
      coloane: [{ k: "V", t: "V [L]", intrare: true }, { k: "t", t: "t [s]", intrare: true }, { k: "Q", t: "Q [L/s]" }, { k: "v", t: "v [m/s]" }, { k: "Re", t: "Re" }, { k: "asp", t: "Aspectul firului / regim", intrare: true, tip: "select", optiuni: MD.ASPECT }, { k: "calc", t: "Regim după Re" }] },
    { id: "t52b", titlu: "Tabelul 5.2b. Punctele critice", antetRand: "Punct", randuri: [{ k: "sus1", et: "Firul începe să oscileze (debit crescător)" }, { k: "sus2", et: "Colorantul se amestecă în toată secțiunea (crescător)" }, { k: "jos", et: "Firul redevine linie (debit descrescător)" }],
      coloane: [{ k: "V", t: "V [L]", intrare: true }, { k: "t", t: "t [s]", intrare: true }, { k: "Q", t: "Q [L/s]" }, { k: "v", t: "v [m/s]" }, { k: "Re", t: "Re" }] },
    { id: "t53", titlu: "Tabelul 5.3. Numărul Reynolds în sistemele autovehiculului", antetRand: "Curgere", randuri: MD.AUTO.map(x => ({ k: x.k, et: x.et })),
      coloane: [{ k: "d", t: "d [mm]" }, { k: "v", t: "v [m/s]" }, { k: "nu", t: "ν [mm²/s]" }, { k: "Re", t: "Re", intrare: true }, { k: "reg", t: "Regim", intrare: true, tip: "select", optiuni: ["laminar", "tranziție", "turbulent"] }] }
  ],
  inaltimeGrafic: 260,
  calculeaza: calculeazaMF5,
  intrebari() {
    return [
      { id: "q1", u: "", text: "Re critic superior (firul începe să oscileze, Tabelul 5.2b):", textSimplu: "Re critic superior" },
      { id: "q2", u: "", text: "Re critic inferior (firul redevine linie, Tabelul 5.2b):", textSimplu: "Re critic inferior" },
      { id: "q3", u: "", text: "Re pentru uleiul din galeria principală la 100 °C (d = 8 mm, v = 2 m/s, ν = 11 mm²/s):", textSimplu: "Re ulei 100 °C" },
      { id: "q4", u: "mm", text: "Diametrul hidraulic al unui canal dreptunghiular de 4 × 20 mm:", textSimplu: "diametrul hidraulic 4 × 20 mm" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t; if (t.t50.T.v === "") l.push("Tabelul 5.0: temperatura");
    const n = [1, 2, 3, 4, 5, 6, 7, 8].filter(i => t.t52["r" + i].V !== "").length; if (n < 6) l.push(`Tabelul 5.2: ${n}/6 determinări`);
    ["sus1", "sus2", "jos"].forEach(k => { if (t.t52b[k].V === "") l.push(`Tabelul 5.2b: ${k}`); });
    const m = MD.AUTO.filter(x => t.t53[x.k].Re !== "").length; if (m < 6) l.push(`Tabelul 5.3: ${m}/6`);
    return l;
  },
  exemplu(D) { const t = D.t; t.t50.T.v = "20"; Object.assign(t.t52.r1, { V: "0.5", t: "60" }); Object.assign(t.t52.r2, { V: "1.0", t: "20" }); },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Curgerile din autoturism: ulei, lichid de răcire, aer",
    intro: `<p>Uleiul din galeriile motorului curge laminar (vâscozitate mare), lichidul de răcire și aerul din admisie – turbulent. Debitmetrul de aer cu film cald (MAF) este montat după o porțiune dreaptă, pentru un profil de viteze stabil. Selectați debitmetrul în machetă.</p>`,
    dupa: `<p class="nota">Macheta este comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "maf" })
  },
  referat: {
    scop: "Vizualizarea regimurilor de curgere, determinarea numărului Reynolds critic superior și inferior și aplicarea criteriului Reynolds la curgerile din autovehicul.",
    relatii: "Re = v·d/ν; &nbsp; v = 4Q/(πd²); &nbsp; d<sub>h</sub> = 4A/P.",
    varianta: () => "Aparatul propriu fiecărui student: temperatura apei, diametrul real al tubului, caracteristica robinetului, Re critic superior și inferior.",
    indicatii: "Comparați regimul observat cu cel calculat, discutați histerezisul tranziției, influența temperaturii și a perturbațiilor și regimurile din sistemele autovehiculului…"
  },
  subsol: "Modelul: debitul în funcție de deschiderea robinetului, ν(T) din Tabelul 5.1, tranziția cu histerezis (Re critic superior dependent de liniștirea apei, Re critic inferior ≈ 2000…2250), cronometrare manuală cu eroare. Vizualizarea: particule de colorant transportate cu profilul de viteze parabolic / turbulent și perturbate după regim.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena mf5-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="st3d" class="mf5-3d"><p class="nota">Se încarcă aparatul Reynolds 3D…</p></div>
      <div class="mf5-vederi"><span class="nota">Vedere:</span>${[["tot", "Ansamblu"], ["intrare", "Intrarea și acul de colorant"], ["tub", "Tubul (firul de colorant)"], ["vas", "Vasul gradat și cronometrul"]].map(([k, t]) => `<button type="button" data-v3="${k}">${t}</button>`).join("")}</div>
      <p class="mf5-banda" id="banda"></p>
      <div class="mf5-afis" id="afis"></div>
      <p class="nota" id="fir"></p>
      <p class="nota">Trageți = rotire · rotița = zoom · clic pe robinetul de alimentare (albastru), pe robinetul colorantului (verde), pe roata robinetului de reglare (+1 %), pe cronometru sau pe vasul gradat (start / stop colectare).</p>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
    </aside>
  </div>`,
    init(C) {
      construiestePasi(); ecranComplet($(".sim-grila"), $("#btn-ecran")); afisaje();
      $$("[data-v3]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v3)));
      import(BAZA_COMUN + "aparate3d.js?v=8").then(m => { SV3 = m.creeazaReynolds($("#st3d"), { laClic: laClic3d }); sincron3d(); })
        .catch(e => { console.warn(e); $("#st3d").innerHTML = `<p class="nota">Aparatul 3D nu poate fi afișat (WebGL). Urmăriți descrierea firului de colorant de mai jos.</p>`; });
      C.mesaj("Pasul 1: mănuși, alimentarea deschisă, repaus 5–10 minute, apoi temperatura apei.", "");
    },
    reset() { Object.assign(sim, { alim: false, plin: false, tRep: 0, a: 0, aEf: 0, st: "laminar", colorant: false, colectare: false, Vvas: 0, crono: 0 }); },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * (sim.colectare ? 1 : sim.viteza);
      sim.t += dt;
      if (sim.alim) { if (!sim.plin) { sim.tUmpl = (sim.tUmpl || 0) + dt; if (sim.tUmpl > 20) sim.plin = true; } else if (sim.a < 0.5) sim.tRep += dt; }
      sim.aEf += (sim.a - sim.aEf) * (1 - Math.exp(-dt / 1.2));
      const stAnt = sim.st; actualizeazaRegim(); if (sim.colectare && sim.st !== sim.stColectare) sim.stMix = true;
      if (stAnt !== sim.st && sim.st !== "laminar" && sim.a > 0) sim.tRep = Math.min(sim.tRep, sim.tRep);   // starea se păstrează (histerezis)
      if (sim.colorant && Q() > 0) sim.nivColorant = Math.max(0, sim.nivColorant - dt / 3000);
      if (sim.colectare) { sim.tAdev += h; sim.Vvas += Q() * h; sim.crono = sim.tAdev; if (sim.Vvas > 1.02) { opresteColectare(); C.mesajTemporar("Vasul gradat s-a umplut (1 L): colectarea a fost oprită.", "atentie"); } }
      if (!vizibil) return; const now = performance.now();
      if (now - (this._td || 0) > 120) { this._td = now; afisaje(); sincron3d(); }
      if (now - (this._ts || 0) > 400) { this._ts = now; actualizeazaPasi(); C.stare(1, sim.alim ? "alimentare deschisă" : "alimentare închisă", sim.alim ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() {},
    formule() { return []; }
  }
});
