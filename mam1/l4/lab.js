/* MAM I – Lucrarea 4. Senzori de temperatură: liniarizare și constanta de timp.
   Simulator în stilul Tinkercad Circuits: stativul cu mănunchiul de senzori (NTC auto, LM35, DS18B20 în sondă, termocuplu K și
   termometrul etalon), recipientul izolat cu apă caldă (în secțiune), paharul cu apă la temperatura camerei, placa de test cu
   divizorul NTC (Rp = 10 kΩ), conectorul X2, rezistența de 4,7 kΩ a magistralei 1-Wire și modulul MAX6675, Arduino Mega cu OLED,
   multimetrul cu sonde, editorul programului, monitorul serial și plotterul serial. Timpul se poate accelera pentru stabilizări.
   Parametrii sunt individuali. */
"use strict";
const MD = MODELE["mam1-l4"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }
const SZ = MD.SENZ, CUL = { ntc: "#138a72", lm: "#e0661b", ds: "#1f5f9e", tc: "#c0392b" }, SCURT = { ntc: "NTC", lm: "LM35", ds: "DS18B20", tc: "TK" };

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, tS: 0, viteza: 1, poz: "aer", tPoz: 0, Ts: null, manusi: false, dec: false,
  dmm: { mod: "OFF", v: null, txt: "", tA: 0, s: { dmmR: "nc", dmmB: "nc" } }, liber: {},
  camp: { B: "3450", n: "16", res: "12" }, fw: null, pr: null, serial: [], tx: 0, vb: null, trag: false,
  rec: null, inreg: null, cursor: { k: "ntc", t: 0 }, ist: [], vedere: "live", anim: null, bx: 300, by: 470
};
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function initTermic() { const p = P(); sim.Ts = { ntc: p.Ta + 2.3, lm: p.Ta + 2.6, ds: p.Ta + 1.9, tc: p.Ta + 2.8, et: p.Ta + 1.2 }; sim.tPoz = 0; }
const medTip = () => sim.poz === "aer" ? "aer" : "apa";
const Tm = () => MD.mediu(P(), sim.poz, sim.tS);
const POZ = { aer: [300, 470], pahar: [172, 712], apa: [400, 712] };
let SV3 = null;                                   // standul 3D (aparate3d.js)
const VEDERI = { tot: [[0.0, 0.56, 1.05], [-0.05, 0.14, 0]], senzori: [[-0.24, 0.3, 0.46], [-0.19, 0.12, 0.02]], placa: [[0.13, 0.2, 0.28], [0.11, 0.01, 0.04]], dmm: [[0.26, 0.27, 0.42], [0.17, 0.03, 0.05]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function linieOled() {
  const v = sim.pr && sim.pr.last, f = (x, d) => Number.isFinite(x) ? x.toFixed(d).padStart(7, " ") : "     —";
  return { titlu: sim.fw ? `TEMP[C] B=${sim.fw.B}${sim.rec ? " REC " + (sim.rec.k * 0.5).toFixed(0) + "s" : ""}` : "", linii: v ? [`NTC ${f(v.ntc, 2)}`, `LM35${f(v.lm, 2)}`, `DS  ${f(v.ds, 3)}`, `TK  ${f(v.tc, 2)}`] : ["pornire..."] };
}
function sincron3d(rapid) {
  if (!SV3) return;
  const mm = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  SV3.seteaza({ poz: sim.poz, rapid, et: etalon().toFixed(1), oled: linieOled(), run: sim.run, rec: !!sim.rec, dec: sim.dec, manusi: sim.manusi, tx: sim.run && performance.now() - sim.tx < 80,
    dmm: { mod: sim.dmm.mod, txt: sim.dmm.mod === "OFF" ? "" : ($("#dmm-v").textContent || ""), u: $("#dmm-u").textContent || "", r: sim.dmm.s.dmmR, b: sim.dmm.s.dmmB },
    ceas: mm(sim.tS), ceasP: `${{ aer: "în aer", pahar: "în pahar", apa: "în apa caldă" }[sim.poz]} ${mm(sim.tPoz)}${sim.viteza > 1 ? " · ×" + sim.viteza : ""}`, Tw: MD.mediu(P(), "apa", sim.tS) });
}
function laClic3d(k) {
  if (k === "pahar") return mutaPoz("pahar");
  if (k === "termos") return mutaPoz("apa");
  if (k === "aer" || (k === "senzori" && sim.poz !== "aer")) return mutaPoz("aer");
  if (k === "x2") { sim.dec = !sim.dec; desenStativ(); citesteDMM(); actualizeazaPasi(); return sincron3d(); }
  if (k === "manusi") { sim.manusi = !sim.manusi; instrumenteAfis(); actualizeazaPasi(); return sincron3d(); }
  if (k === "rst") return resetMega();
  if (k === "dmmKnob") { sim.dmm.mod = { OFF: "V", V: "R", R: "OFF" }[sim.dmm.mod]; citesteDMM(); dmmCtl(); actualizeazaPasi(); return sincron3d(); }
  if (PIN[k]) { const id = ["tGND", "n2"].includes(k) ? "dmmB" : "dmmR"; sim.dmm.s[id] = k; desenSonde(); citesteDMM(); dmmCtl(); actualizeazaPasi(); return sincron3d(); }
  inspector({ dmm: "dmm", senzori: "senzori" }[k] || k);
}
/* comenzile multimetrului (sub planșă) */
const TP_OPT = [["nc", "liberă"], ["tUs", "TP Us (A0)"], ["t5V", "TP 5V"], ["tLM", "TP LM35 (A1)"], ["tGND", "TP GND"], ["n1", "NTC 1"], ["n2", "NTC 2"]];
function dmmCtl() {
  const el = $("#tk-dmm"); if (!el) return;
  el.innerHTML = `<b>Multimetru</b>${[["OFF", "OFF"], ["V", "V⎓"], ["R", "Ω"]].map(([m, t]) => `<button type="button" data-dm="${m}" class="${sim.dmm.mod === m ? "activ" : ""}">${t}</button>`).join("")}
    <label>sonda <span style="color:#d32f2f;font-weight:800">+</span> <select data-ds="dmmR">${TP_OPT.map(([k, t]) => `<option value="${k}"${sim.dmm.s.dmmR === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <label>sonda <b>−</b> <select data-ds="dmmB">${TP_OPT.map(([k, t]) => `<option value="${k}"${sim.dmm.s.dmmB === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <span class="tk-dmm-v">${sim.dmm.mod === "OFF" ? "" : sim.dmm.txt}</span>`;
  $$("[data-dm]", el).forEach(b => b.addEventListener("click", () => { sim.dmm.mod = b.dataset.dm; citesteDMM(); dmmCtl(); actualizeazaPasi(); sincron3d(); }));
  $$("[data-ds]", el).forEach(s => s.addEventListener("change", () => { sim.dmm.s[s.dataset.ds] = s.value; desenSonde(); citesteDMM(); dmmCtl(); actualizeazaPasi(); sincron3d(); }));
}
const NUME_POZ = { aer: "în aer (deasupra recipientelor)", pahar: "în paharul cu apă la temperatura camerei", apa: "în apa caldă din recipientul izolat" };
/** abaterea maximă a senzorilor (și a etalonului) față de mediu */
const abatere = () => Math.max(...["ntc", "lm", "ds", "tc", "et"].map(k => Math.abs(sim.Ts[k] - Tm())));
function stabil(sit) { return sim.poz === sit && (sit === "aer" ? sim.tPoz >= 300 && abatere() < 0.3 : sim.tPoz >= 60 && abatere() < 0.15); }
const etalon = () => MD.citE(P(), sim.Ts.et);

/* ------------------------------------------------------------------ circuitul (multimetrul) */
function vNod(id) {
  const p = P(); if (!sim.run) return 0;
  const us = sim.dec ? p.vcc * 0.99999 : MD.uNTC(p, sim.Ts.ntc, medTip());
  return { t5V: p.vcc, tGND: 0, n2: 0, tUs: us, n1: sim.dec ? 0 : us, tLM: 0.01 * (sim.Ts.lm + p.eLM) }[id] ?? NaN;
}
function ohmIntre(a, b) {       // [kΩ], Infinity sau null (măsurare nepermisă)
  if (a === b) return 0;
  const k = [a, b].sort().join("-");
  if (k === "n1-n2") return sim.dec ? MD.rNTC(P(), sim.Ts.ntc) / 1000 : null;
  if (sim.run) return null;
  if (k === "t5V-tUs") return sim.dec ? P().Rpa / 1000 : null;
  if (k === "tGND-tUs" || k === "n1-tGND" || k === "n2-tUs") return sim.dec ? (k === "tGND-tUs" ? Infinity : MD.rNTC(P(), sim.Ts.ntc) / 1000) : null;
  return Infinity;
}

/* ------------------------------------------------------------------ programul */
const PROG = { titlu: "temperaturi", desc: "NTC, LM35, DS18B20 și termocuplu K pe OLED și serial" };
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
function cod() {
  return `${K_("#include")} ${S_("&lt;Adafruit_SSD1306.h&gt;")}   ${C_("// OLED 128×64, I²C 0x3C")}
${K_("#include")} ${S_("&lt;DallasTemperature.h&gt;")}  ${C_("// DS18B20 pe 1-Wire (D2, 4,7 kΩ la 5 V)")}
${K_("#include")} ${S_("&lt;max6675.h&gt;")}            ${C_("// termocuplu K: SCK 52, CS 53, SO 50")}
${K_("const")} ${K_("float")} RP = ${N_("10000")}, R0 = ${N_("2500")}, T0 = ${N_("298.15")}, B = ${sel("B", [["3350", "3350"], ["3450", "3450"], ["3550", "3550"], ["3977", "3977"]])};
${K_("const")} ${K_("int")} NMED = ${sel("n", [["1", "1"], ["4", "4"], ["16", "16"]])};    ${C_("// eșantioane ADC mediate pentru NTC")}
${K_("const")} ${K_("int")} RES = ${sel("res", [["9", "9"], ["10", "10"], ["11", "11"], ["12", "12"]])};    ${C_("// rezoluția DS18B20 [biți]")}
OneWire ow(${N_("2")}); DallasTemperature ds(&amp;ow); MAX6675 tk(${N_("52")}, ${N_("53")}, ${N_("50")});
${K_("float")} tDS; ${K_("int")} nRec = ${N_("-1")};

${K_("float")} ntcTemp(${K_("int")} pin) {
  ${K_("long")} s = ${N_("0")}; ${K_("for")} (${K_("int")} i = ${N_("0")}; i &lt; NMED; i++) s += analogRead(pin);
  ${K_("float")} u = s * ${N_("5.0")} / ${N_("1024")} / NMED;
  ${K_("float")} r = RP * u / (${N_("5.0")} - u);                 ${C_("// (4.1)")}
  ${K_("float")} invT = ${N_("1.0")} / T0 + log(r / R0) / B;          ${C_("// (4.2)")}
  ${K_("return")} ${N_("1.0")} / invT - ${N_("273.15")};
}
${K_("void")} setup() {
  Serial.begin(${N_("115200")}); oled.begin(SSD1306_SWITCHCAPVCC, ${N_("0x3C")});
  ds.begin(); ds.setResolution(RES); ds.setWaitForConversion(${K_("false")}); ds.requestTemperatures();
}
${K_("void")} loop() {                                ${C_("// la fiecare 500 ms")}
  ${K_("float")} tN = ntcTemp(A0), tL = analogRead(A1) * ${N_("500.0")} / ${N_("1024")};   ${C_("// LM35: 10 mV/°C")}
  ${K_("if")} (ds.isConversionComplete()) { tDS = ds.getTempCByIndex(${N_("0")}); ds.requestTemperatures(); }
  ${K_("float")} tK = tk.readCelsius();                   ${C_("// MAX6675: 0,25 °C, conversie 220 ms")}
  afiseaza(tN, tL, tDS, tK);
  ${K_("if")} (Serial.available() &amp;&amp; Serial.read() == ${S_("'r'")}) nRec = ${N_("0")};    ${C_("// treapta: 121 eșantioane")}
  ${K_("if")} (nRec &gt;= ${N_("0")}) { scrieCSV(nRec * ${N_("0.5")}, tN, tL, tDS, tK); ${K_("if")} (++nRec &gt; ${N_("120")}) nRec = ${N_("-1")}; }
  ${K_("else")} scrieLinie(tN, tL, tDS, tK);
  asteapta500ms();
}`;
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 400) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-150).join("\n"); el.scrollTop = el.scrollHeight; }
const tS = () => (sim.tS - (sim.pr ? sim.pr.t0 : 0)).toFixed(1).padStart(7, " ");
function pornesteProgram() {
  const p = P();
  sim.pr = { t0: sim.tS, tN: sim.tS + 0.5, dsStart: sim.tS, dsVal: NaN, last: null };
  seriala(`Senzori de temperatură | B = ${sim.fw.B} K, NMED = ${sim.fw.n}, DS18B20 ${sim.fw.res} biți (conversie ${fx(MD.tConv(p, sim.fw.res) * 1000, 0)} ms)`);
}
/** un eșantion al programului (citire live) la momentul curent */
function esantionLive() {
  const p = P(), pr = sim.pr, fw = sim.fw;
  const ntc = MD.citNTC(p, sim.Ts.ntc, medTip(), fw, Math.random, sim.dec), lm = MD.citLM(p, sim.Ts.lm, Math.random);
  if (sim.tS - pr.dsStart >= MD.tConv(p, fw.res)) { pr.dsVal = MD.citDS(p, sim.Ts.ds, fw.res); pr.dsStart = pr.tN; }
  const tc = MD.citTK(p, sim.Ts.tc, Math.random);
  return { ntc, lm, ds: pr.dsVal, tc };
}
const f2 = v => Number.isFinite(v) ? v.toFixed(2) : "  — ";
function pasProgram() {
  const pr = sim.pr; if (!pr) return;
  while (pr.tN <= sim.tS + 1e-9) {
    let v;
    if (sim.rec) {
      const r = sim.rec, k = r.k; v = { ntc: r.s.ntc[k], lm: r.s.lm[k], ds: r.s.ds[k], tc: r.s.tc[k] };
      seriala(`${(k * MD.DT).toFixed(1)};${v.ntc.toFixed(2)};${v.lm.toFixed(2)};${v.ds.toFixed(4)};${v.tc.toFixed(2)}`);
      r.k++;
      if (r.k >= MD.NS) { sim.inreg = { s: r.s, cfg: r.cfg, Te: r.s.te, ok: r.ok, logat: false, nr: (sim.inreg ? sim.inreg.nr : 0) + 1 }; sim.rec = null; pr.dsStart = pr.tN; pr.dsVal = v.ds;
        seriala(`STOP – treapta înregistrată (121 eșantioane, 60 s). Etalon la 60 s: ${fx(r.s.te, 1)} °C`); sim.vedere = "rec"; sim.cursor.t = 0; comutaVedere(); }
    } else {
      v = esantionLive();
      seriala(`[${tS()} s] NTC ${f2(v.ntc).padStart(6)}  LM35 ${f2(v.lm).padStart(6)}  DS ${Number.isFinite(v.ds) ? v.ds.toFixed(4) : "   —   "}  TK ${f2(v.tc).padStart(6)} °C`);
    }
    pr.last = v; sim.ist.push({ t: pr.tN, v }); while (sim.ist.length > 240) sim.ist.shift();
    pr.tN += MD.DT;
  }
}
function trimiteSerial(txt) {
  if (!sim.run || !sim.pr) return Cadru.mesajTemporar("Porniți simularea (placa alimentată, programul rulează).", "atentie");
  seriala(`> ${txt}`);
  if (txt.trim() === "r") seriala("Comanda „r” pornește înregistrarea; pentru treaptă folosiți butonul pasului 4 (senzorii se introduc simultan în apa caldă la t = 0).");
}
function resetMega() { if (!sim.run) return; sim.rec = null; seriala("— RESET —"); pornesteProgram(); oledAfis(); }

/* ------------------------------------------------------------------ treapta */
function pornesteTreapta() {
  if (!sim.run || !sim.fw) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  if (sim.rec) return Cadru.mesajTemporar("Înregistrarea este în curs.", "atentie");
  if (sim.dec) return Cadru.mesajTemporar("Cuplați conectorul X2 al NTC-ului.", "atentie");
  if (sim.poz !== "aer") return Cadru.mesajTemporar("Treapta pornește cu senzorii în aer (stativul ridicat).", "atentie");
  if (!sim.manusi) return Cadru.mesajTemporar("NSSM: puneți mănușile termoizolante înainte de a lucra la recipientul cu apă caldă.", "pericol");
  const p = P(), ok = Math.max(...SZ.map(k => Math.abs(sim.Ts[k] - p.Ta))) < 0.6;
  if (!ok) Cadru.mesajTemporar("Atenție: senzorii nu sunt stabilizați la temperatura aerului – ϑ0 diferă între senzori (lăsați-i mai mult în aer).", "atentie");
  const T0s = { ...sim.Ts }, Tw = MD.mediu(p, "apa", sim.tS);
  mutaPoz("apa", true);
  // eșantionul 0 este exact la momentul introducerii
  sim.pr.tN = sim.tS;
  sim.rec = { k: 0, s: MD.treapta(p, sim.fw, T0s, Tw, Math.random), cfg: { ...sim.fw }, ok };
  seriala("> r"); seriala("t[s];NTC;LM35;DS18B20;TK   (senzorii introduși în apa caldă la t = 0)");
  sim.vedere = "live"; comutaVedere();
}

/* ------------------------------------------------------------------ planșa (SVG, stil Tinkercad) */
const PIN = {};
function pin(id, x, y, et) { PIN[id] = { x, y, et }; return `<circle class="tk-pin" data-pin="${id}" cx="${x}" cy="${y}" r="7"/>`; }
const MG = { x: 840, y: 440 }, HDR = i => [MG.x + 70 + i * 11.2, MG.y + 222];
const BB = { x: 552, y: 446, w: 280, h: 262 };
const TPX = { t5V: [578, 470], tGND: [578, 690], tUs: [712, 512], tLM: [712, 560], n1: [606, 664], n2: [634, 664] };
const X2 = { x: 586, y: 596 };
const CAP = { ntc: [575, 616], lm: [668, 470], ds: [770, 470], tc: [744, 622] };     // capetele cablurilor pe placa de test
const LX = { ntc: -34, lm: -15, ds: 1, tc: 17, et: 35 }, TOP = { ntc: -88, lm: -132, ds: -128, tc: -168, et: -236 };
function sondaSVG() {
  // mănunchiul de senzori, cu vârfurile la (0, 0)
  let s = `<g id="manunchi">`;
  // NTC auto: vârf de alamă, hexagon, carcasă cu conector
  s += `<g transform="translate(${LX.ntc} 0)"><path d="M-5,-30 L-5,-4 Q0,3 5,-4 L5,-30z" fill="url(#gAlama)" stroke="#7a5a10" stroke-width=".7"/><rect x="-6" y="-34" width="12" height="5" fill="url(#gAlama)" stroke="#7a5a10" stroke-width=".6"/>${[0, 1, 2, 3].map(k => `<line x1="-5.5" y1="${-33 + k * 1.2}" x2="5.5" y2="${-32.5 + k * 1.2}" stroke="#7a5a10" stroke-width=".4"/>`).join("")}
    <path d="M-11,-48 L-6,-52 L6,-52 L11,-48 L11,-36 L6,-34 L-6,-34 L-11,-36z" fill="url(#gAlama)" stroke="#6b4c0c"/><line x1="-6" y1="-52" x2="-6" y2="-34" stroke="#6b4c0c" stroke-width=".6"/><line x1="6" y1="-52" x2="6" y2="-34" stroke="#6b4c0c" stroke-width=".6"/>
    <rect x="-8" y="-86" width="16" height="35" rx="3" fill="url(#gNegru)"/><rect x="-6" y="-80" width="12" height="9" rx="1.5" fill="#3a3f45"/><text x="0" y="-60" font-size="4.5" fill="#9aa" text-anchor="middle" transform="rotate(-90 0 -60)">CTS</text></g>`;
  // LM35 în tub termocontractabil
  s += `<g transform="translate(${LX.lm} 0)"><path d="M-4.5,-130 L-4.5,-14 Q-6,-10 -6,-6 Q-6,2 0,2 Q6,2 6,-6 Q6,-10 4.5,-14 L4.5,-130z" fill="#202326" stroke="#000" stroke-width=".6"/><path d="M-3,-128 L-3,-16" stroke="#555" stroke-width="1" opacity=".6"/><text x="0" y="-70" font-size="4.5" fill="#bbb" text-anchor="middle" transform="rotate(-90 0 -70)">LM35</text></g>`;
  // DS18B20 în sondă de inox
  s += `<g transform="translate(${LX.ds} 0)"><path d="M-4,-80 L-4,-3 Q0,3 4,-3 L4,-80z" fill="url(#gInox)" stroke="#6e7780" stroke-width=".7"/><rect x="-4.6" y="-84" width="9.2" height="6" rx="1" fill="#2b2f35"/><path d="M-2.8,-84 L-2.8,-126 L2.8,-126 L2.8,-84z" fill="#1b1d20"/><text x="0" y="-40" font-size="4" fill="#59616a" text-anchor="middle" transform="rotate(-90 0 -40)">DS18B20</text></g>`;
  // termocuplul K manta 1,5 mm cu mânerul și minifișa verde
  s += `<g transform="translate(${LX.tc} 0)"><path d="M-1.6,-120 L-1.6,-1 Q0,1.5 1.6,-1 L1.6,-120z" fill="url(#gInox)" stroke="#6e7780" stroke-width=".5"/><rect x="-4" y="-150" width="8" height="32" rx="2" fill="#3c4248"/><rect x="-6" y="-168" width="12" height="18" rx="2" fill="#2e8b3e"/><text x="0" y="-157" font-size="5" fill="#fff" text-anchor="middle" font-weight="700">K</text></g>`;
  // termometrul etalon (stilou digital)
  s += `<g transform="translate(${LX.et} 0)"><path d="M-1.8,-112 L-1.8,-1 Q0,1.5 1.8,-1 L1.8,-112z" fill="url(#gInox)" stroke="#6e7780" stroke-width=".5"/><path d="M-9,-236 L9,-236 L9,-122 L4,-112 L-4,-112 L-9,-122z" fill="#f4f5f6" stroke="#8a9097"/><rect x="-7" y="-226" width="14" height="44" rx="2" fill="#bfd0b0" stroke="#222" stroke-width=".8"/><text id="et-lcd" x="0" y="-204" font-size="7.5" font-family="ui-monospace,monospace" font-weight="700" fill="#1d2414" text-anchor="middle" transform="rotate(-90 0 -204)"></text><circle cx="0" cy="-166" r="3.5" fill="#d32f2f"/><text x="0" y="-146" font-size="4.6" fill="#555" text-anchor="middle" transform="rotate(-90 0 -146)">ETALON 0,1 °C</text></g>`;
  // clema stativului (bară de aluminiu cu șuruburi)
  s += `<rect x="-46" y="-104" width="94" height="12" rx="3" fill="url(#gAlu)" stroke="#6d757d"/>${[-40, 42].map(x => `<circle cx="${x}" cy="-98" r="3" fill="#555"/>`).join("")}<rect x="-80" y="-102" width="36" height="8" rx="2" fill="url(#gAlu)" stroke="#6d757d"/></g>`;
  return s;
}
function planseSVG() {
  let s = `<svg id="tk-svg" viewBox="0 0 1300 800" role="img" aria-label="Planșa: stativul cu senzorii de temperatură, recipientul izolat cu apă caldă, paharul cu apă, placa de test cu divizorul NTC, Arduino Mega cu OLED, multimetru">
<defs>
 <filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".25"/></filter>
 <linearGradient id="gAlu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7eb"/><stop offset="1" stop-color="#9aa2aa"/></linearGradient>
 <linearGradient id="gRod" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d959d"/><stop offset=".4" stop-color="#f1f3f5"/><stop offset="1" stop-color="#7a828a"/></linearGradient>
 <linearGradient id="gInox" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b949c"/><stop offset=".45" stop-color="#f4f6f8"/><stop offset="1" stop-color="#7d868e"/></linearGradient>
 <linearGradient id="gAlama" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a9802a"/><stop offset=".45" stop-color="#f3d77c"/><stop offset="1" stop-color="#8f6a1c"/></linearGradient>
 <linearGradient id="gNegru" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4047"/><stop offset="1" stop-color="#101214"/></linearGradient>
 <linearGradient id="gTermos" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7e868e"/><stop offset=".3" stop-color="#eef1f4"/><stop offset=".55" stop-color="#b9c0c7"/><stop offset="1" stop-color="#6c747c"/></linearGradient>
 <linearGradient id="gApaC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9a07a" stop-opacity=".55"/><stop offset="1" stop-color="#c8603a" stop-opacity=".7"/></linearGradient>
 <linearGradient id="gApaR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3f7" stop-opacity=".55"/><stop offset="1" stop-color="#7fb6dc" stop-opacity=".65"/></linearGradient>
 <linearGradient id="gSticla" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".15" stop-color="#fff" stop-opacity=".05"/><stop offset=".85" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>
 <linearGradient id="gLemn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b98b"/><stop offset="1" stop-color="#b48f5c"/></linearGradient>
 <radialGradient id="gBanana" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#d9b44a"/><stop offset="1" stop-color="#7a5c10"/></radialGradient>
 <clipPath id="clipTermos"><rect x="334" y="540" width="132" height="196"/></clipPath>
</defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb" id="tk-fundal"/>
<rect x="0" y="744" width="545" height="20" fill="url(#gLemn)" stroke="#9b7746"/><text x="10" y="790" font-size="10" fill="#8a6a3a">masa de lucru (suprafață separată de fierbător)</text>`;
  /* ---- recipientul izolat (secțiune) cu apă caldă */
  s += `<g class="tk-comp" data-comp="termos" filter="url(#umbra)">
    <path d="M318,528 L482,528 L482,736 Q482,746 472,746 L328,746 Q318,746 318,736z" fill="url(#gTermos)" stroke="#5e666e"/>
    <path d="M330,536 L470,536 L470,734 L330,734z" fill="#fdfdfd" stroke="#9aa2aa"/><text x="400" y="742" font-size="6.5" text-anchor="middle" fill="#555">vid</text>
    <path d="M334,540 L466,540 L466,730 Q466,736 460,736 L340,736 Q334,736 334,730z" fill="#cfd5db" stroke="#8a929a"/>
    <rect id="apa-c" x="335" y="566" width="130" height="169" fill="url(#gApaC)"/>
    <path d="M335,566 Q367,562 400,566 T465,566" fill="none" stroke="#fff" stroke-opacity=".7"/>
    <text x="400" y="520" font-size="10" text-anchor="middle" fill="#444" font-weight="700">recipient izolat (secțiune)</text>
    <text id="t-apa" x="400" y="726" font-size="9" text-anchor="middle" fill="#5a1d06"></text></g>
    <g id="abur" style="pointer-events:none">${[0, 1, 2].map(i => `<path class="abur abur${i}" d="M${370 + i * 28},530 q-8,-14 0,-28 q8,-14 0,-28" fill="none" stroke="#c9d3dc" stroke-width="5" stroke-linecap="round"/>`).join("")}</g>
    <g class="tk-comp" data-comp="capac"><rect x="492" y="728" width="44" height="16" rx="3" fill="url(#gTermos)" stroke="#5e666e"/><rect x="500" y="720" width="28" height="9" rx="2" fill="#2f3439"/><text x="514" y="716" font-size="7" text-anchor="middle" fill="#555">capac</text></g>`;
  /* ---- paharul cu apă la temperatura camerei */
  s += `<g class="tk-comp" data-comp="pahar"><rect x="116" y="602" width="112" height="140" fill="url(#gApaR)" opacity=".0"/>
    <path d="M114,588 L230,588 L226,740 Q226,746 220,746 L124,746 Q118,746 118,740z" fill="rgba(220,240,250,.25)" stroke="#9fb7c6" stroke-width="1.6"/>
    <path d="M118,622 L226,622 L226,740 Q226,745 220,745 L124,745 Q118,745 118,740z" fill="url(#gApaR)"/>
    <path d="M114,588 L230,588 L226,740 Q226,746 220,746 L124,746 Q118,746 118,740z" fill="url(#gSticla)"/>
    ${[640, 670, 700].map((y, i) => `<line x1="210" y1="${y}" x2="222" y2="${y}" stroke="#7d9aab"/><text x="208" y="${y + 3}" font-size="6" text-anchor="end" fill="#59727f">${400 - i * 100}</text>`).join("")}
    <text x="172" y="580" font-size="10" text-anchor="middle" fill="#444" font-weight="700">pahar – apă la temperatura camerei</text></g>`;
  /* ---- stativul */
  s += `<g class="tk-comp" data-comp="stativ" filter="url(#umbra)"><rect x="24" y="732" width="150" height="14" rx="3" fill="#2f3439"/><rect x="56" y="210" width="9" height="524" rx="3" fill="url(#gRod)" stroke="#6d757d" stroke-width=".6"/></g>
    <g id="brat"></g><g id="cabluri" style="pointer-events:none"></g><g id="g-man" class="tk-comp" data-comp="senzori" style="cursor:pointer">${sondaSVG()}</g>`;
  /* ---- mănușile */
  s += `<g id="manusi" class="tk-comp" data-comp="manusi" style="cursor:pointer"><path d="M250,744 q-6,-22 2,-36 l6,-10 q4,-4 7,1 l-3,12 l3,-20 q3,-5 7,0 l-1,20 l4,-22 q4,-4 7,1 l-2,22 l5,-17 q4,-3 6,2 l-4,24 q-2,16 -8,23z" fill="#3949ab" stroke="#1a237e"/><text id="manusi-t" x="268" y="778" font-size="8" text-anchor="middle" fill="#1a237e" font-weight="700"></text></g>`;
  /* ---- placa de test (breadboard) */
  s += `<g class="tk-comp" data-comp="bb" filter="url(#umbra)"><rect x="${BB.x}" y="${BB.y}" width="${BB.w}" height="${BB.h}" rx="6" fill="#f3f1ea" stroke="#cfcac0"/>
    <line x1="${BB.x + 8}" y1="${BB.y + 12}" x2="${BB.x + BB.w - 8}" y2="${BB.y + 12}" stroke="#d32f2f" stroke-width="1.2"/><line x1="${BB.x + 8}" y1="${BB.y + BB.h - 12}" x2="${BB.x + BB.w - 8}" y2="${BB.y + BB.h - 12}" stroke="#1565c0" stroke-width="1.2"/>
    ${Array.from({ length: 24 }, (_, i) => Array.from({ length: 2 }, (_, j) => `<rect x="${BB.x + 14 + i * 10.8}" y="${BB.y + 16 + j * 7}" width="3" height="3" fill="#bdb8ad"/><rect x="${BB.x + 14 + i * 10.8}" y="${BB.y + BB.h - 26 + j * 7}" width="3" height="3" fill="#bdb8ad"/>`).join("")).join("")}
    <text x="${BB.x + 8}" y="${BB.y + BB.h + 14}" font-size="9" fill="#666">placa de test: divizorul NTC, LM35, 1-Wire, MAX6675</text></g>`;
  // Rp 10 kΩ (maro-negru-portocaliu-maro)
  s += `<g class="tk-comp" data-comp="rp"><line x1="642" y1="470" x2="642" y2="482" stroke="#999" stroke-width="2"/><rect x="636" y="482" width="12" height="28" rx="5" fill="#8fb8de" stroke="#5b7f9f"/>${["#7b4a12", "#111", "#e67e22", "#7b4a12"].map((c, i) => `<rect x="636" y="${486 + i * 5.5}" width="12" height="2.6" fill="${c}"/>`).join("")}<line x1="642" y1="510" x2="642" y2="512" stroke="#999" stroke-width="2"/><text x="652" y="496" font-size="8" fill="#333">Rp 10 kΩ 1 %</text></g>`;
  // nodul divizorului spre A0 și X2
  s += `<path d="M642,512 L712,512 M642,512 L642,606 L626,606" fill="none" stroke="#1f5f9e" stroke-width="2.2"/>`;
  // 4,7 kΩ pull-up 1-Wire
  s += `<g class="tk-comp" data-comp="pu"><line x1="796" y1="470" x2="796" y2="486" stroke="#999" stroke-width="2"/><rect x="790" y="486" width="12" height="26" rx="5" fill="#d9c49a" stroke="#9d8a5c"/>${["#f1c40f", "#8e44ad", "#c0392b", "#d4ac0d"].map((c, i) => `<rect x="790" y="${489 + i * 5.2}" width="12" height="2.5" fill="${c}"/>`).join("")}<path d="M796,512 L796,530 L770,530" fill="none" stroke="#999" stroke-width="2"/><text x="806" y="500" font-size="7.5" fill="#333">4,7 kΩ</text></g>`;
  // conectorul X2 (NTC)
  s += `<g id="x2" class="tk-comp" data-comp="x2" style="cursor:pointer"></g>`;
  // MAX6675
  s += `<g class="tk-comp" data-comp="max" filter="url(#umbra)"><rect x="722" y="600" width="92" height="92" rx="4" fill="#b71c1c" stroke="#6d0f0f"/><rect x="752" y="634" width="30" height="22" rx="2" fill="#1b1b1b"/><text x="767" y="648" font-size="5" fill="#bbb" text-anchor="middle">MAX6675</text>
    <rect x="730" y="606" width="34" height="18" rx="2" fill="#2e7d32" stroke="#1b4d1e"/>${[0, 1].map(i => `<circle cx="${738 + i * 17}" cy="615" r="5" fill="url(#gAlu)" stroke="#555"/><line x1="${735 + i * 17}" y1="615" x2="${741 + i * 17}" y2="615" stroke="#333" stroke-width="1.4"/>`).join("")}<text x="737" y="632" font-size="6" fill="#fff">+</text><text x="754" y="632" font-size="6" fill="#fff">−</text>
    ${["GND", "VCC", "SCK", "CS", "SO"].map((t, i) => `<rect x="806" y="${640 + i * 9}" width="6" height="5" fill="#c9a227"/><text x="804" y="${644 + i * 9}" font-size="5" fill="#fff" text-anchor="end">${t}</text>`).join("")}
    <text x="768" y="685" font-size="7" fill="#fff" text-anchor="middle">modul termocuplu K</text></g>`;
  // conexiunile LM35 și DS18B20 pe placă
  s += `<g style="pointer-events:none"><rect x="660" y="466" width="22" height="9" rx="2" fill="#222"/><text x="671" y="463" font-size="6.5" text-anchor="middle" fill="#333">LM35: +Vs  Vout  GND</text>
    <path d="M664,475 L664,470 M671,475 L671,560 L712,560 M678,475 L678,690" fill="none" stroke="#666" stroke-width="1.6"/>
    <rect x="760" y="466" width="22" height="9" rx="2" fill="#222"/><text x="771" y="463" font-size="6.5" text-anchor="middle" fill="#333">DS18B20: GND DQ VDD</text>
    <path d="M764,475 L764,690 M771,475 L771,530 M778,475 L778,470" fill="none" stroke="#666" stroke-width="1.6"/></g>`;
  // punctele de test
  const TPC = { t5V: "#c62828", tGND: "#111", tUs: "#f9d71c", tLM: "#ff9800", n1: "#9e9e9e", n2: "#9e9e9e" }, TPT = { t5V: "TP 5V", tGND: "TP GND", tUs: "TP Us (A0)", tLM: "TP LM35 (A1)", n1: "NTC 1", n2: "NTC 2" };
  s += Object.entries(TPX).map(([k, [x, y]]) => `<g style="pointer-events:none"><circle cx="${x}" cy="${y}" r="${k[0] === "n" ? 7 : 9}" fill="${TPC[k]}" stroke="#000"/><circle cx="${x}" cy="${y}" r="4.5" fill="url(#gBanana)"/><text x="${x + (k === "n1" ? -2 : k === "n2" ? 2 : 0)}" y="${y + (k === "tGND" || k[0] === "n" ? 18 : -12)}" font-size="7.5" text-anchor="${k === "n1" ? "end" : k === "n2" ? "start" : "middle"}" fill="#222" font-weight="700">${TPT[k]}</text></g>`).join("");
  s += Object.entries(TPX).map(([k, [x, y]]) => pin(k, x, y, { t5V: "TP 5V (alimentarea divizorului = Uref)", tGND: "TP GND (masa)", tUs: "TP Us – nodul divizorului, intrarea A0", tLM: "TP LM35 – ieșirea Vout, intrarea A1", n1: "NTC pin 1 (partea senzorului a lui X2)", n2: "NTC pin 2 (partea senzorului a lui X2)" }[k])).join("");
  /* ---- Arduino Mega 2560 */
  s += `<g class="tk-comp" data-comp="mega" filter="url(#umbra)"><rect x="${MG.x}" y="${MG.y}" width="430" height="232" rx="8" fill="#00878f" stroke="#005a60"/>
    <rect x="${MG.x - 14}" y="${MG.y + 30}" width="46" height="40" rx="3" fill="url(#gAlu)" stroke="#666"/><rect x="${MG.x - 8}" y="${MG.y + 150}" width="40" height="36" rx="4" fill="#1b1b1b"/>
    <g transform="translate(${MG.x + 230} ${MG.y + 118}) rotate(45)"><rect x="-34" y="-34" width="68" height="68" rx="2" fill="#262626"/></g><text x="${MG.x + 230}" y="${MG.y + 121}" font-size="7" fill="#bbb" text-anchor="middle" font-family="monospace">ATMEGA2560</text>
    <rect x="${MG.x + 60}" y="${MG.y + 6}" width="${36 * 9.5}" height="12" rx="1.5" fill="#202020"/>${Array.from({ length: 36 }, (_, i) => `<rect x="${MG.x + 64 + i * 9.5}" y="${MG.y + 9}" width="4" height="5" fill="#5a5a5a"/>`).join("")}
    <rect x="${MG.x + 64}" y="${MG.y + 216}" width="${26 * 11.2}" height="12" rx="1.5" fill="#202020"/>
    ${["IOREF", "RESET", "3.3V", "5V", "GND", "GND", "Vin", "", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"].map((t, i) => t ? `<text x="${HDR(i)[0]}" y="${MG.y + 210}" font-size="5.5" fill="#fff" text-anchor="end" transform="rotate(-90 ${HDR(i)[0]} ${MG.y + 210})">${t}</text>` : "").join("")}
    ${Array.from({ length: 26 }, (_, i) => `<rect x="${HDR(i)[0] - 2}" y="${MG.y + 220}" width="4" height="4" fill="#5a5a5a"/>`).join("")}
    <rect x="${MG.x + 404}" y="${MG.y + 40}" width="20" height="160" rx="1.5" fill="#202020"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${MG.x + 407}" y="${MG.y + 44 + i * 9.8}" width="4" height="4" fill="#5a5a5a"/><rect x="${MG.x + 416}" y="${MG.y + 44 + i * 9.8}" width="4" height="4" fill="#5a5a5a"/>`).join("")}<text x="${MG.x + 400}" y="${MG.y + 200}" font-size="5.5" fill="#fff" text-anchor="end">50 52 53</text>
    <text x="${MG.x + 300}" y="${MG.y + 70}" font-size="13" fill="#e8ffff" font-weight="800">ARDUINO</text><text x="${MG.x + 300}" y="${MG.y + 86}" font-size="11" fill="#e8ffff">MEGA 2560</text>
    <text x="${MG.x + 340}" y="${MG.y + 26}" font-size="5.5" fill="#fff">D2</text>
    <rect id="ledL" x="${MG.x + 92}" y="${MG.y + 40}" width="8" height="5" fill="#5a4a1a"/><text x="${MG.x + 104}" y="${MG.y + 45}" font-size="6" fill="#fff">L</text><rect id="ledTX" x="${MG.x + 92}" y="${MG.y + 52}" width="8" height="5" fill="#5a4a1a"/><text x="${MG.x + 104}" y="${MG.y + 57}" font-size="6" fill="#fff">TX</text><rect id="ledON" x="${MG.x + 92}" y="${MG.y + 64}" width="8" height="5" fill="#1a3a1a"/><text x="${MG.x + 104}" y="${MG.y + 69}" font-size="6" fill="#fff">ON</text></g>
    <g id="mega-rst" style="cursor:pointer"><rect x="${MG.x + 46}" y="${MG.y + 92}" width="18" height="18" rx="2" fill="#ccc" stroke="#555"/><circle cx="${MG.x + 55}" cy="${MG.y + 101}" r="5.5" fill="#c62828"/><text x="${MG.x + 55}" y="${MG.y + 122}" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">RESET</text></g>`;
  s += `<path id="usb" d="M${MG.x - 14},${MG.y + 50} C${MG.x - 40},${MG.y + 50} ${MG.x - 30},${MG.y - 20} ${MG.x - 4},${MG.y - 40}" fill="none" stroke="#333" stroke-width="6"/><text x="${MG.x + 4}" y="${MG.y - 44}" font-size="9" fill="#555">USB – PC</text>`;
  // firele dintre placa de test și Mega
  const W = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 2.4}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const hx = k => MG.x + 64 + k * 9.5 + 2;
  s += `<g style="pointer-events:none">${W([[712, 512], [836, 512], [836, 708], [HDR(8)[0], 708], [HDR(8)[0], HDR(8)[1] + 4]], "#f9d71c")}${W([[712, 560], [830, 560], [830, 714], [HDR(9)[0], 714], [HDR(9)[0], HDR(9)[1] + 4]], "#ff9800")}
    ${W([[BB.x + BB.w - 8, BB.y + 12], [BB.x + BB.w + 10, BB.y + 12], [BB.x + BB.w + 10, 726], [HDR(3)[0], 726], [HDR(3)[0], HDR(3)[1] + 4]], "#e53935")}${W([[BB.x + BB.w - 8, BB.y + BB.h - 12], [BB.x + BB.w + 4, BB.y + BB.h - 12], [BB.x + BB.w + 4, 732], [HDR(4)[0], 732], [HDR(4)[0], HDR(4)[1] + 4]], "#222")}
    ${W([[771, 530], [826, 530], [826, 430], [hx(31), 430], [hx(31), MG.y + 12]], "#8e24aa")}
    ${[0, 1, 2].map(i => W([[812, 658 + i * 9], [826 + i * 0, 658 + i * 9], [826, 740 + i * 5], [MG.x + 440 + i * 5, 740 + i * 5], [MG.x + 440 + i * 5, MG.y + 186 - i * 10], [MG.x + 418, MG.y + 186 - i * 10]], ["#43a047", "#1e88e5", "#fdd835"][i], 1.6)).join("")}</g>`;
  /* ---- afișajul OLED */
  s += `<g class="tk-comp" data-comp="oled" filter="url(#umbra)"><rect x="880" y="40" width="200" height="176" rx="6" fill="#16337a" stroke="#0b1d48"/>${["GND", "VCC", "SCL", "SDA"].map((t, i) => `<rect x="${942 + i * 14}" y="46" width="6" height="8" fill="#c9a227"/><text x="${945 + i * 14}" y="64" font-size="6" fill="#fff" text-anchor="middle">${t}</text>`).join("")}
    <rect x="888" y="72" width="184" height="118" rx="3" fill="#050608" stroke="#333"/><g id="oled" font-family="ui-monospace,Consolas,monospace"></g><text x="980" y="206" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED 0,96" SSD1306 · I²C 0x3C</text></g>`;
  s += `<g style="pointer-events:none">${[0, 1, 2, 3].map(k => W([[945 + k * 14, 54], [945 + k * 14, 32 - k * 5], [1088 + k * 5, 32 - k * 5], [1088 + k * 5, 414 + k * 5], [hx([30, 32, 35, 34][k]), 414 + k * 5], [hx([30, 32, 35, 34][k]), 452]], ["#222", "#e53935", "#1e88e5", "#43a047"][k], 2)).join("")}</g>`;
  /* ---- ceasul de laborator */
  s += `<g class="tk-comp" data-comp="ceas" filter="url(#umbra)"><rect x="1110" y="60" width="160" height="140" rx="10" fill="#26292e"/><rect x="1120" y="72" width="140" height="54" rx="4" fill="#0f1a12" stroke="#000"/><text id="ceas-t" x="1190" y="108" font-size="24" text-anchor="middle" fill="#7dff8a" font-family="ui-monospace,monospace" font-weight="700"></text>
    <text id="ceas-p" x="1190" y="146" font-size="9.5" text-anchor="middle" fill="#ddd"></text><text id="ceas-v" x="1190" y="164" font-size="9" text-anchor="middle" fill="#ffcc80"></text><text x="1190" y="188" font-size="8" fill="#9aa3ad" text-anchor="middle">cronometru laborator (timp simulat)</text></g>`;
  /* ---- multimetrul */
  s += `<g class="tk-comp" data-comp="dmm" filter="url(#umbra)" transform="translate(124 0)"><rect x="476" y="34" width="210" height="350" rx="20" fill="#f2b705"/><rect x="490" y="48" width="182" height="322" rx="14" fill="#3b3f45"/>
    <rect x="504" y="62" width="154" height="66" rx="5" fill="#bfd0b0" stroke="#222" stroke-width="2"/><text id="dmm-v" x="650" y="108" font-size="28" fill="#1d2414" text-anchor="end" font-family="ui-monospace,monospace" font-weight="700"></text><text id="dmm-u" x="652" y="122" font-size="10" fill="#1d2414" text-anchor="end" font-family="ui-monospace,monospace"></text><text x="510" y="76" font-size="8" fill="#1d2414">AUTO</text>
    <circle cx="581" cy="222" r="52" fill="#2a2d31" stroke="#666"/><g id="dmm-buton"><circle cx="581" cy="222" r="34" fill="#4a4f56" stroke="#111"/><rect x="577" y="182" width="8" height="34" rx="3" fill="#f2b705"/></g>
    ${[["OFF", -60], ["V⎓", 0], ["Ω", 60]].map(([t, a]) => { const x = 581 + 66 * Math.sin(a * Math.PI / 180), y = 222 - 66 * Math.cos(a * Math.PI / 180); return `<g class="dmm-poz" data-mod="${t === "V⎓" ? "V" : t === "Ω" ? "R" : "OFF"}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="14" fill="rgba(255,255,255,.06)"/><text x="${x}" y="${y + 4}" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">${t}</text></g>`; }).join("")}
    <circle cx="530" cy="340" r="9" fill="#111" stroke="#999"/><circle cx="632" cy="340" r="9" fill="#d32f2f" stroke="#999"/><text x="530" y="326" font-size="8" fill="#ccc" text-anchor="middle">COM</text><text x="632" y="326" font-size="8" fill="#ccc" text-anchor="middle">VΩ</text></g>`;
  s += `<g id="tk-sonde"></g><g id="tk-tip" style="pointer-events:none" visibility="hidden"><rect rx="4" fill="#2b2b2b" opacity=".92"/><text font-size="11" fill="#fff"></text></g>`;
  s += `<text id="tk-av" x="260" y="60" text-anchor="middle" font-size="11" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
/* stativul, cablurile și conectorul X2 (depind de poziția mănunchiului) */
function desenStativ() {
  const bx = sim.bx, by = sim.by, yb = by - 98;
  $("#g-man").setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
  $("#brat").innerHTML = `<rect x="52" y="${yb - 9}" width="18" height="18" rx="3" fill="#3c4248"/><circle cx="61" cy="${yb}" r="3" fill="#aab"/><rect x="66" y="${yb - 3.5}" width="${Math.max(0, bx - 80 - 66)}" height="7" rx="3" fill="url(#gRod)" stroke="#6d757d" stroke-width=".5"/>`;
  const C = (k, end, cul, w, dx) => { const x0 = bx + LX[k] + (dx || 0), y0 = by + TOP[k]; const [x1, y1] = end; return `<path d="M${x0},${y0} C${x0},${y0 - 45} ${x1 - 90},${y1 - 70} ${x1},${y1}" fill="none" stroke="${cul}" stroke-width="${w}" stroke-linecap="round" opacity=".95"/>`; };
  let s = C("ntc", [X2.x - 6, X2.y + 10], "#2b2f35", 5) + C("lm", [664, 468], "#c62828", 1.4, -1.5) + C("lm", [671, 468], "#f9a825", 1.4) + C("lm", [678, 468], "#222", 1.4, 1.5);
  s += C("ds", [771, 468], "#1b1d20", 4) + C("tc", [738, 612], "#2e7d32", 1.6, -1) + C("tc", [755, 612], "#eee", 1.6, 1);
  $("#cabluri").innerHTML = s;
  $("#x2").innerHTML = `<rect x="${X2.x + 16}" y="${X2.y}" width="22" height="22" rx="3" fill="#202326" stroke="#000"/><rect x="${sim.dec ? X2.x - 16 : X2.x - 6}" y="${X2.y + 1}" width="22" height="20" rx="3" fill="#4a5058" stroke="#000"/>
    <path d="M${X2.x - 6},${X2.y + 11} L${X2.x - 20},${X2.y + 11}" stroke="#2b2f35" stroke-width="5"/><path d="M${TPX.n1[0]},${TPX.n1[1] - 7} L${TPX.n1[0]},${X2.y + 22} M${TPX.n2[0]},${TPX.n2[1] - 7} L${TPX.n2[0]},${X2.y + 26} L${X2.x + 2},${X2.y + 26}" stroke="#777" stroke-width="1.4" fill="none"/>
    <text x="${X2.x + 16}" y="${X2.y - 6}" font-size="9" text-anchor="middle" fill="#333" font-weight="700">X2 ${sim.dec ? "decuplat" : "cuplat"}</text>`;
  $("#abur").style.opacity = sim.poz === "apa" ? 0.45 : 1;
}
function mutaPoz(poz, instant) {
  if (sim.rec) return Cadru.mesajTemporar("Înregistrarea treptei este în curs.", "atentie");
  if ((poz === "apa" || sim.poz === "apa") && poz !== sim.poz && !sim.manusi) return Cadru.mesajTemporar("NSSM: puneți mănușile termoizolante înainte de a manevra senzorii la recipientul cu apă caldă.", "pericol");
  if (poz === sim.poz) return;
  const [x1, y1] = POZ[poz], x0 = sim.bx, y0 = sim.by;
  sim.poz = poz; sim.tPoz = 0;
  if (instant) { sim.anim = { t: 0, d: 0.35, x0, y0, x1, y1 }; } else sim.anim = { t: 0, d: 1.1, x0, y0, x1, y1 };
  sincron3d(instant); actualizeazaPasi();
}
function animaStativ(h) {
  const a = sim.anim; if (!a) return;
  a.t += h; const f = Math.min(1, a.t / a.d), yu = POZ.aer[1];
  // ridicare – deplasare – coborâre
  const f1 = Math.min(1, f * 3), f2 = Math.max(0, Math.min(1, f * 3 - 1)), f3 = Math.max(0, f * 3 - 2);
  const yA = a.y0 + (Math.min(a.y0, yu) - a.y0) * f1, x = a.x0 + (a.x1 - a.x0) * f2, y = f3 > 0 ? Math.min(a.y0, yu) + (a.y1 - Math.min(a.y0, yu)) * f3 : yA;
  sim.bx = x; sim.by = y; desenStativ();
  if (f >= 1) sim.anim = null;
}
const SONDE = [{ id: "dmmR", x0: 756, y0: 349, cul: "#d32f2f", et: "+" }, { id: "dmmB", x0: 654, y0: 349, cul: "#222", et: "−" }];
const LOC_SONDE = { dmmR: [790, 400], dmmB: [620, 400] };
function capatSonda(sd) { const s = sim.dmm.s[sd.id]; return PIN[s] ? [PIN[s].x, PIN[s].y] : sim.liber[sd.id] || LOC_SONDE[sd.id]; }
function cale(sd, tx, ty) { const cy = Math.max(sd.y0, ty) + 50; return `M${sd.x0},${sd.y0} C${sd.x0},${cy} ${tx},${cy} ${tx},${ty + 30}`; }
function desenSonde() {
  const g = $("#tk-sonde"); if (!g) return;
  g.innerHTML = SONDE.map(sd => { const [tx, ty] = capatSonda(sd);
    return `<path id="lead-${sd.id}" d="${cale(sd, tx, ty)}" fill="none" stroke="${sd.cul}" stroke-width="3" opacity=".9" style="pointer-events:none"/>
      <g class="tk-sonda" data-sonda="${sd.id}" transform="translate(${tx},${ty})" style="cursor:grab"><path d="M0,0 l-3,7 v24 h6 v-24 z" fill="#c9cdd2" stroke="#222" stroke-width=".8"/><rect x="-6" y="28" width="12" height="34" rx="4" fill="${sd.cul}" stroke="#111"/><text x="0" y="50" font-size="10" text-anchor="middle" font-weight="900" fill="#fff">${sd.et}</text></g>`; }).join("");
  $$("#tk-sonde .tk-sonda").forEach(el => legaSonda(el));
}
function ptSVG(e) { const svg = $("#tk-svg"), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function celMaiAproape(x, y) { let best = null, dmin = 16; Object.entries(PIN).forEach(([k, q]) => { const d = Math.hypot(q.x - x, q.y - y); if (d < dmin) { dmin = d; best = k; } }); return best; }
function legaSonda(el) {
  const id = el.dataset.sonda, sd = SONDE.find(x => x.id === id);
  el.addEventListener("pointerdown", e => {
    e.stopPropagation(); el.setPointerCapture(e.pointerId); sim.trag = true;
    const p0 = ptSVG(e), [tx0, ty0] = capatSonda(sd), dx = p0.x - tx0, dy = p0.y - ty0;
    const muta = ev => { const p = ptSVG(ev), x = p.x - dx, y = p.y - dy; el.setAttribute("transform", `translate(${x},${y})`); $("#lead-" + id).setAttribute("d", cale(sd, x, y)); evidentiaza(celMaiAproape(x, y)); };
    const gata = ev => { el.removeEventListener("pointermove", muta); el.removeEventListener("pointerup", gata); sim.trag = false;
      const p = ptSVG(ev), x = p.x - dx, y = p.y - dy, best = celMaiAproape(x, y);
      if (best) sim.dmm.s[id] = best; else { sim.dmm.s[id] = "nc"; sim.liber[id] = [x, y]; }
      evidentiaza(null); desenSonde(); citesteDMM(); actualizeazaPasi(); };
    el.addEventListener("pointermove", muta); el.addEventListener("pointerup", gata);
  });
}
function evidentiaza(k) { $$("#tk-svg .tk-pin").forEach(r => r.classList.toggle("aproape", r.dataset.pin === k)); arataTip(k); }
function arataTip(k) {
  const g = $("#tk-tip"); if (!g) return; if (!k) { g.setAttribute("visibility", "hidden"); return; }
  const q = PIN[k], t = g.querySelector("text"), r = g.querySelector("rect");
  t.textContent = q.et; t.setAttribute("x", q.x + 14); t.setAttribute("y", q.y - 14);
  r.setAttribute("x", q.x + 8); r.setAttribute("y", q.y - 28); r.setAttribute("width", q.et.length * 6.3 + 12); r.setAttribute("height", 20); g.setAttribute("visibility", "visible");
}
const VB0 = [0, 0, 1300, 800];
function seteazaVB(vb) { sim.vb = vb; $("#tk-svg").setAttribute("viewBox", vb.map(v => v.toFixed(1)).join(" ")); }

/* ------------------------------------------------------------------ instrumentele */
function citesteDMM() {
  const el = $("#dmm-v"), u = $("#dmm-u"); if (!el) return;
  const m = sim.dmm.mod, a = sim.dmm.s.dmmR, b = sim.dmm.s.dmmB;
  $("#dmm-buton").setAttribute("transform", `rotate(${m === "OFF" ? -60 : m === "V" ? 0 : 60} 581 222)`);
  if (m === "OFF") { el.textContent = ""; u.textContent = ""; sim.dmm.v = null; sim.dmm.txt = ""; return; }
  if (m === "V") {
    const v = (PIN[a] ? vNod(a) : 0) - (PIN[b] ? vNod(b) : 0) + (Math.random() - 0.5) * 0.0006;
    const r = Math.round(v * 1000) / 1000; sim.dmm.v = r; sim.dmm.txt = r.toFixed(3) + " V"; el.textContent = r.toFixed(3); u.textContent = "V DC"; return;
  }
  if (!PIN[a] || !PIN[b]) { el.textContent = "O.L"; u.textContent = "MΩ"; sim.dmm.v = Infinity; sim.dmm.txt = "OL"; return; }
  let R = ohmIntre(a, b);
  if (R === null) { el.textContent = "Err"; u.textContent = sim.dec ? "tensiune!" : "decuplați X2"; sim.dmm.v = null; sim.dmm.txt = "—"; return; }
  if (!isFinite(R)) { el.textContent = "O.L"; u.textContent = "MΩ"; sim.dmm.v = Infinity; sim.dmm.txt = "OL"; return; }
  R = R * (1 + (Math.random() - 0.5) * 0.0015);
  const ohm = Math.round(R * 1000);
  sim.dmm.v = ohm; sim.dmm.txt = R < 10 ? fx(R, 3) + " kΩ" : fx(R, 2) + " kΩ";
  el.textContent = R < 10 ? R.toFixed(3) : R.toFixed(2); u.textContent = "kΩ";
}
function oledAfis() {
  const g = $("#oled"); if (!g) return;
  if (!sim.run) { g.innerHTML = ""; return; }
  const v = sim.pr && sim.pr.last, fw = sim.fw;
  let s = `<rect x="890" y="74" width="180" height="26" fill="#050608"/><text x="896" y="91" font-size="11.5" fill="#ffd400">TEMP [°C] B=${fw.B}${sim.rec ? "  ●REC" : ""}</text>`;
  if (!v) { s += `<text x="896" y="120" font-size="12" fill="#5fd3ff">pornire…</text>`; g.innerHTML = s; return; }
  const L = [["NTC", v.ntc, 2], ["LM35", v.lm, 2], ["DS", v.ds, 3], ["TK", v.tc, 2]];
  s += L.map(([n, x, d], i) => `<text x="896" y="${116 + i * 18}" font-size="12.5" fill="#5fd3ff">${n.padEnd(5, " ").replace(/ /g, " ")}${Number.isFinite(x) ? x.toFixed(d).padStart(8, " ").replace(/ /g, " ") : "     —"}</text>`).join("");
  if (sim.rec) s += `<text x="1066" y="182" font-size="10" fill="#ff5252" text-anchor="end">${(sim.rec.k * 0.5).toFixed(1)} s</text>`;
  g.innerHTML = s;
}
function instrumenteAfis() {
  $("#ledON").setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a"); $("#usb").setAttribute("stroke", sim.run ? "#222" : "#bbb");
  $("#ledL").setAttribute("fill", sim.rec ? "#ffd04a" : "#5a4a1a");
  $("#et-lcd").textContent = etalon().toFixed(1);
  const p = P(), Tw = MD.mediu(p, "apa", sim.tS);
  $("#t-apa").textContent = "";
  const mm = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  $("#ceas-t").textContent = mm(sim.tS);
  $("#ceas-p").textContent = `${{ aer: "în aer", pahar: "în pahar", apa: "în apa caldă" }[sim.poz]} de ${mm(sim.tPoz)}`;
  $("#ceas-v").textContent = sim.viteza > 1 ? `timp accelerat ×${sim.viteza}` : "timp real";
  $("#manusi-t").textContent = sim.manusi ? "mănuși ✓" : "mănuși (clic)";
  $("#manusi").style.opacity = sim.manusi ? 0.5 : 1;
  // culoarea apei calde ~ temperatură
  $("#apa-c").setAttribute("opacity", Math.min(1, 0.4 + (Tw - 20) / 60).toFixed(2));
}

/* ------------------------------------------------------------------ plotterul serial */
function plotter() {
  const cv = $("#tk-plot"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const rec = sim.vedere === "rec" && sim.inreg;
  let serii, t0, t1;
  if (rec) { const s = sim.inreg.s; serii = SZ.map(k => ({ k, pts: s[k].map((v, i) => [i * MD.DT, v]) })); t0 = 0; t1 = 60; }
  else { const ist = sim.ist; t1 = ist.length ? ist[ist.length - 1].t : 60; t0 = t1 - 60; serii = SZ.map(k => ({ k, pts: ist.filter(e => e.t >= t0 && Number.isFinite(e.v[k]) && e.v[k] > -60).map(e => [e.t, e.v[k]]) })); }
  let mn = Infinity, mx = -Infinity; serii.forEach(s => s.pts.forEach(p => { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); }));
  if (!isFinite(mn)) { mn = 20; mx = 30; } if (mx - mn < 2) { const c = (mx + mn) / 2; mn = c - 1; mx = c + 1; }
  const pad = (mx - mn) * 0.08; mn -= pad; mx += pad;
  const L = 38, R = 8, T = 8, B = 20, X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = v => T + (mx - v) / (mx - mn) * (H - T - B);
  g.font = "10px system-ui"; g.fillStyle = "#666"; g.strokeStyle = "#eee"; g.lineWidth = 1;
  const pasY = (mx - mn) > 20 ? 10 : (mx - mn) > 8 ? 2 : (mx - mn) > 3 ? 1 : 0.5;
  for (let v = Math.ceil(mn / pasY) * pasY; v <= mx; v += pasY) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke(); g.fillText(v.toFixed(pasY < 1 ? 1 : 0), 4, Y(v) + 3); }
  for (let t = Math.ceil(t0 / 10) * 10; t <= t1; t += 10) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), H - B); g.stroke(); g.fillText(rec ? t + " s" : (t - (sim.pr ? sim.pr.t0 : 0)).toFixed(0), X(t) - 8, H - 6); }
  serii.forEach(s => { g.strokeStyle = CUL[s.k]; g.lineWidth = 1.6; g.beginPath(); s.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke(); });
  if (rec) {
    const k = sim.cursor.k, c = MD.trecere(sim.inreg.s[k]), tc = sim.cursor.t;
    g.setLineDash([4, 3]); g.strokeStyle = CUL[k]; g.beginPath(); g.moveTo(L, Y(c.tt)); g.lineTo(W - R, Y(c.tt)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "#111"; g.beginPath(); g.moveTo(X(tc), T); g.lineTo(X(tc), H - B); g.stroke();
    const v = sim.inreg.s[k][Math.round(tc / MD.DT)];
    g.fillStyle = "#111"; g.beginPath(); g.arc(X(tc), Y(v), 3.5, 0, 7); g.fill();
  }
  // legenda
  let x = L + 6; SZ.forEach(k => { g.fillStyle = CUL[k]; g.fillRect(x, T + 4, 10, 3); g.fillStyle = "#333"; g.fillText(SCURT[k], x + 13, T + 9); x += g.measureText(SCURT[k]).width + 26; });
  g.fillStyle = "#888"; g.fillText(rec ? "înregistrarea treptei" : "live (ultimele 60 s)", W - R - 110, T + 9);
}
function comutaVedere() {
  $$("[data-ved]").forEach(b => b.classList.toggle("activ", b.dataset.ved === sim.vedere));
  cursorAfis();
}
function cursorAfis() {
  const el = $("#cur-info"); if (!el) return;
  if (!sim.inreg) { el.innerHTML = "Nicio treaptă înregistrată."; return; }
  const k = sim.cursor.k, s = sim.inreg.s[k], i = Math.round(sim.cursor.t / MD.DT), c = MD.trecere(s);
  el.innerHTML = `<b style="color:${CUL[k]}">${MD.NUME[k]}</b>: ϑ0 = ${fx(s[0], k === "ds" ? 4 : 2)} °C, ϑ∞ (60 s) = ${fx(s[s.length - 1], k === "ds" ? 4 : 2)} °C → ϑ(τ) = ${fx(c.tt, 2)} °C<br>cursor: t = <b>${fx(sim.cursor.t, 1)} s</b>, ϑ = <b>${fx(s[i], k === "ds" ? 4 : 2)} °C</b>${s[i] >= c.tt ? (i > 0 && s[i - 1] >= c.tt ? " (≥ ϑ(τ), dar nu primul)" : " ✓ primul eșantion ≥ ϑ(τ)") : " (< ϑ(τ))"}`;
  const r = $("#cur-t"); if (r) r.value = sim.cursor.t;
}

/* ------------------------------------------------------------------ interacțiunile cu planșa */
function legaPlansa() {
  const svg = $("#tk-svg"); sim.vb = VB0.slice();
  svg.addEventListener("wheel", e => { e.preventDefault(); const p = ptSVG(e), k = e.deltaY > 0 ? 1.12 : 1 / 1.12, [x, y, w, h] = sim.vb; const nw = Math.max(260, Math.min(1900, w * k)), nh = nw * h / w; seteazaVB([p.x - (p.x - x) * nw / w, p.y - (p.y - y) * nh / h, nw, nh]); }, { passive: false });
  let pan = null;
  $("#tk-fundal").addEventListener("pointerdown", e => { pan = { x: e.clientX, y: e.clientY, vb: sim.vb.slice() }; svg.setPointerCapture(e.pointerId); inspector(null); });
  svg.addEventListener("pointermove", e => {
    if (pan) { const r = svg.getBoundingClientRect(), s = pan.vb[2] / r.width; seteazaVB([pan.vb[0] - (e.clientX - pan.x) * s, pan.vb[1] - (e.clientY - pan.y) * s, pan.vb[2], pan.vb[3]]); return; }
    const t = e.target; if (t.classList && t.classList.contains("tk-pin")) arataTip(t.dataset.pin); else if (!sim.trag) arataTip(null);
  });
  svg.addEventListener("pointerup", () => { pan = null; });
  $$(".dmm-poz").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); sim.dmm.mod = g.dataset.mod; citesteDMM(); actualizeazaPasi(); }));
  $("#x2").addEventListener("click", e => { e.stopPropagation(); sim.dec = !sim.dec; desenStativ(); citesteDMM(); actualizeazaPasi(); });
  $("#mega-rst").addEventListener("click", e => { e.stopPropagation(); resetMega(); });
  $("#manusi").addEventListener("click", e => { e.stopPropagation(); sim.manusi = !sim.manusi; instrumenteAfis(); actualizeazaPasi(); });
  [["pahar", "pahar"], ["termos", "apa"]].forEach(([c, p]) => $(`[data-comp="${c}"]`).addEventListener("dblclick", e => { e.stopPropagation(); mutaPoz(p); }));
  $$(".tk-comp").forEach(g => g.addEventListener("click", e => { if (e.target.closest(".dmm-poz,#x2,#mega-rst,#manusi")) return; inspector(g.dataset.comp); }));
}
const INSP = {
  termos: () => ["Recipient izolat (vas Dewar)", [["Conținut", "apă caldă, ≈ 60 °C (umplut de cadrul didactic)"], ["Apa acum", fx(MD.mediu(P(), "apa", sim.tS), 2) + " °C (se răcește lent)"], ["Acțiune", `<button type="button" class="ins-poz" data-p="apa">Introdu senzorii</button>`]]],
  pahar: () => ["Pahar cu apă", [["Temperatura", "a camerei (puțin sub ea prin evaporare)"], ["Rol", "răcirea rapidă a senzorilor după apa caldă"], ["Acțiune", `<button type="button" class="ins-poz" data-p="pahar">Introdu senzorii</button>`]]],
  capac: () => ["Capacul recipientului", [["Stare", "scos (pentru introducerea senzorilor)"]]],
  stativ: () => ["Stativ cu clemă", [["Poziția senzorilor", NUME_POZ[sim.poz]], ["Acțiune", `<button type="button" class="ins-poz" data-p="aer">Ridică în aer</button>`]]],
  senzori: () => ["Mănunchiul de senzori", [["NTC auto", "CTS, carcasă de alamă M12, ≈ 2,5 kΩ la 25 °C"], ["LM35", "în tub termocontractabil, 10 mV/°C"], ["DS18B20", "sondă de inox Ø 6 mm, 1-Wire"], ["Termocuplu K", "manta Ø 1,5 mm, joncțiune izolată"], ["Etalon", "termometru digital, rezoluție 0,1 °C, ±0,1 °C"], ["Poziție", NUME_POZ[sim.poz]]]],
  manusi: () => ["Mănuși termoizolante", [["Stare", sim.manusi ? "purtate" : "pe masă"]]],
  bb: () => ["Placa de test", [["Divizor", "5 V – Rp 10 kΩ – nod (A0) – NTC – masă"], ["LM35", "+Vs = 5 V, Vout → A1"], ["DS18B20", "DQ → D2, pull-up 4,7 kΩ"], ["MAX6675", "SPI: SCK 52, CS 53, SO 50"]]],
  rp: () => ["Rezistența Rp", [["Valoare nominală", "10 kΩ, 1 % (maro-negru-portocaliu-maro)"]]],
  pu: () => ["Rezistența de pull-up 1-Wire", [["Valoare", "4,7 kΩ între DQ și 5 V"]]],
  x2: () => ["Conectorul X2 al NTC-ului", [["Stare", sim.dec ? "decuplat" : "cuplat"], ["Rol", "separă NTC-ul de divizor pentru măsurarea rezistenței"]]],
  max: () => ["Modul MAX6675", [["Intrare", "termocuplu K (verde +, alb −)"], ["Rezoluție", "0,25 °C, conversie ≈ 220 ms"], ["Compensare", "joncțiunea rece pe placă (eroare ±1…2 °C)"]]],
  mega: () => ["Arduino Mega 2560", [["ADC", "10 biți, referința = 5 V al plăcii"], ["Alimentare", sim.run ? "USB (pornit)" : "oprită"], ["Program", sim.fw ? PROG.titlu : "—"]]],
  oled: () => ["Afișaj OLED SSD1306", [["Rezoluție", "128×64"], ["Conținut", "temperaturile celor patru senzori"]]],
  ceas: () => ["Cronometru", [["Timp simulat", fx(sim.tS, 1) + " s"], ["Viteză", "×" + sim.viteza]]],
  dmm: () => ["Multimetru", [["Mod", { OFF: "oprit", V: "V c.c.", R: "ohmmetru" }[sim.dmm.mod]], ["Sonda +", (PIN[sim.dmm.s.dmmR] || {}).et || "liberă"], ["Sonda −", (PIN[sim.dmm.s.dmmB] || {}).et || "liberă"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
  $$(".ins-poz", el).forEach(b => b.addEventListener("click", () => { mutaPoz(b.dataset.p); el.hidden = true; }));
}
function avertizari() {
  const av = [];
  if (sim.run && sim.dec) av.push("NTC deconectat: programul calculează ≈ −99 °C (ECU ar afișa −40 °C și ar memora un cod de defect)");
  if (sim.poz === "apa" && !sim.manusi) av.push("NSSM: mănușile!");
  $("#tk-av").textContent = av.length ? "⚠ " + av.join(" · ") : "";
}

/* ------------------------------------------------------------------ editorul și simularea */
function afiseazaCod() {
  $("#tk-cod").innerHTML = cod().split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value; actualizeazaPasi(); }); });
  $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  sim.fw = { B: +sim.camp.B, n: +sim.camp.n, res: +sim.camp.res }; sim.run = true;
  pornesteProgram();
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); oledAfis(); instrumenteAfis(); citesteDMM(); avertizari(); actualizeazaPasi();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.pr = null; sim.rec = null;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza");
  afiseazaCod(); actualizeazaFw(); oledAfis(); instrumenteAfis(); citesteDMM(); avertizari(); actualizeazaPasi();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} (B = ${sim.fw.B} K, NMED = ${sim.fw.n}, DS ${sim.fw.res} biți)` : "—"; }
function seteazaViteza(v) { sim.viteza = v; $$("[data-vit]").forEach(b => b.classList.toggle("activ", +b.dataset.vit === v)); instrumenteAfis(); }

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const fmtV = (k, v) => v.toFixed(k === "ds" ? 4 : 2);
function inregSt(e) {
  const sit = sim.poz;
  if (!sim.run || !sim.pr || !sim.pr.last) return Cadru.mesajTemporar("Porniți simularea (programul afișează temperaturile).", "atentie");
  if (sim.rec) return Cadru.mesajTemporar("Așteptați sfârșitul înregistrării treptei.", "atentie");
  if (sit === "pahar") return Cadru.mesajTemporar("Tabelul 4.1 se completează în aer sau în apa caldă.", "atentie");
  if (sim.dec) return Cadru.mesajTemporar("Cuplați conectorul X2 (NTC-ul este deconectat).", "atentie");
  if (!stabil(sit)) return Cadru.mesajTemporar(sit === "aer" ? `Stabilizare: senzorii trebuie să stea cel puțin 5 minute în aer (acum ${fx(sim.tPoz / 60, 1)} min) și indicațiile să nu mai varieze. Folosiți accelerarea timpului.` : "Așteptați stabilizarea în apa caldă (indicațiile încă variază).", "atentie");
  if (!(sim.fw.res === 12)) return Cadru.mesajTemporar("Tabelul 4.1 se completează cu DS18B20 la 12 biți (RES = 12).", "atentie");
  const v = { ...sim.pr.last }, Te = etalon();
  const ok = Cadru.inregistreaza(e, { log: { m: "st", sit, ts: Math.round(sim.tS), Te, v, cfg: { ...sim.fw } }, celule: [{ t: "t41", r: sit, c: "et", v: Te.toFixed(1) }, ...SZ.map(k => ({ t: "t41", r: sit, c: k, v: fmtV(k, v[k]) }))] });
  if (ok) msg(`Tabelul 4.1 (${sit === "aer" ? "aer" : "apă caldă"}): etalon ${fx(Te, 1)} °C; NTC ${fx(v.ntc, 2)}, LM35 ${fx(v.lm, 2)}, DS18B20 ${fx(v.ds, 4)}, TK ${fx(v.tc, 2)} °C.`);
}
function sitDiv() {
  const sit = sim.poz; if (sit === "pahar") { Cadru.mesajTemporar("Tabelul 4.3 se completează în aer sau în apa caldă.", "atentie"); return null; }
  if (!stabil(sit)) { Cadru.mesajTemporar(sit === "aer" ? "Senzorii trebuie să fie stabilizați în aer (≥ 5 min)." : "Așteptați stabilizarea în apa caldă.", "atentie"); return null; }
  return sit;
}
const peMasa = id => ["tGND", "n2"].includes(id);
function inregUs(e) {
  if (!sim.run) return Cadru.mesajTemporar("Porniți simularea (divizorul este alimentat de placă).", "atentie");
  if (sim.dmm.mod !== "V") return Cadru.mesajTemporar("Comutați multimetrul pe V⎓.", "atentie");
  if (sim.dec) return Cadru.mesajTemporar("Cuplați X2: Us se măsoară cu NTC-ul în circuit.", "atentie");
  if (!peMasa(sim.dmm.s.dmmB) || !["tUs", "n1"].includes(sim.dmm.s.dmmR)) return Cadru.mesajTemporar("Sonda − pe TP GND, sonda + pe TP Us.", "atentie");
  const sit = sitDiv(); if (!sit) return;
  const U = sim.dmm.v, Te = etalon();
  const ok = Cadru.inregistreaza(e, { log: { m: "us", sit, U, Te }, celule: [{ t: "t43", r: sit, c: "us", v: U.toFixed(3) }, { t: "t43", r: sit, c: "te", v: Te.toFixed(1) }] });
  if (ok) msg(`Tabelul 4.3 (${sit === "aer" ? "aer" : "apă caldă"}): Us = ${fx(U, 3)} V, etalon ${fx(Te, 1)} °C.`);
}
function inregUref(e) {
  if (!sim.run) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  if (sim.dmm.mod !== "V") return Cadru.mesajTemporar("Comutați multimetrul pe V⎓.", "atentie");
  if (!peMasa(sim.dmm.s.dmmB) || sim.dmm.s.dmmR !== "t5V") return Cadru.mesajTemporar("Sonda − pe TP GND, sonda + pe TP 5V.", "atentie");
  const U = sim.dmm.v;
  const ok = Cadru.inregistreaza(e, { log: { m: "uref", U }, celule: ["aer", "apa"].map(r => ({ t: "t43", r, c: "uref", v: U.toFixed(3) })) });
  if (ok) msg(`Tabelul 4.3: Uref = ${fx(U, 3)} V (tensiunea USB a plăcii, nu exact 5 V).`);
}
function inregR(e) {
  if (sim.dmm.mod !== "R") return Cadru.mesajTemporar("Comutați multimetrul pe Ω.", "atentie");
  if (!sim.dec) return Cadru.mesajTemporar("Decuplați conectorul X2 (clic pe el): rezistența se măsoară cu NTC-ul separat de divizor.", "atentie");
  const pr_ = [sim.dmm.s.dmmR, sim.dmm.s.dmmB].sort().join("-"); if (pr_ !== "n1-n2") return Cadru.mesajTemporar("Sondele pe pinii NTC 1 și NTC 2.", "atentie");
  const sit = sitDiv(); if (!sit) return;
  const R = sim.dmm.v, Te = etalon();
  const ok = Cadru.inregistreaza(e, { log: { m: "rm", sit, R, Te }, celule: [{ t: "t43", r: sit, c: "rm", v: String(R) }] });
  if (ok) msg(`Tabelul 4.3 (${sit === "aer" ? "aer" : "apă caldă"}): R NTC măsurat = ${R} Ω (etalon ${fx(Te, 1)} °C). Cuplați X2 la loc.`);
}
function inregTau(e) {
  const r = sim.inreg; if (!r) return Cadru.mesajTemporar("Înregistrați întâi treapta (butonul „▶ Treaptă”).", "atentie");
  if (r.cfg.res !== 12) return Cadru.mesajTemporar("Tabelul 4.2 se completează din treapta înregistrată cu DS18B20 la 12 biți.", "atentie");
  const k = sim.cursor.k, s = r.s[k], c = MD.trecere(s), i = Math.round(sim.cursor.t / MD.DT);
  if (!(s[i] >= c.tt) || (i > 0 && s[i - 1] >= c.tt)) return Cadru.mesajTemporar(`Puneți cursorul pe primul eșantion care atinge ϑ(τ) = ${fx(c.tt, 2)} °C (${MD.NUME[k]}).`, "atentie");
  const tau = i * MD.DT, log = [];
  if (!r.logat) log.push({ m: "tr", cfg: r.cfg, Te: r.Te, s: r.s, ok: r.ok, nr: r.nr });
  log.push({ m: "tau", k, t0: s[0], tinf: s[s.length - 1], tau, nr: r.nr });
  const ok = Cadru.inregistreaza(e, { log, celule: [{ t: "t42", r: k, c: "t0", v: fmtV(k, s[0]) }, { t: "t42", r: k, c: "tinf", v: fmtV(k, s[s.length - 1]) }, { t: "t42", r: k, c: "tau", v: tau.toFixed(1) }] });
  if (ok) { r.logat = true; msg(`Tabelul 4.2 (${MD.NUME[k]}): ϑ0 = ${fmtV(k, s[0])} °C, ϑ∞ = ${fmtV(k, s[s.length - 1])} °C, τ ≈ ${fx(tau, 1)} s.`); }
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const ctlPoz = () => `<div class="rand-mic">${[["aer", "↑ Aer"], ["pahar", "Pahar"], ["apa", "Apă caldă"]].map(([p, t]) => `<button type="button" data-poz="${p}">${t}</button>`).join("")}<button type="button" data-man="1">🧤 Mănuși</button></div>
  <div class="rand-mic"><span class="nota" style="align-self:center">Timp:</span>${[1, 10, 30, 60].map(v => `<button type="button" data-vit="${v}" class="${sim.viteza === v ? "activ" : ""}">×${v}</button>`).join("")}</div>`;
const SIT = s => s === "aer" ? "aer" : "apa";
const PASI = [
  { t: "Stabilizarea în aer", tab: "Tabelul 4.1 – aer", v3: "tot", zona: [0, 0, 1300, 800], pini: [],
    banda: "Pasul 1 · Senzorii au fost ținuți în mână la montare (sunt mai calzi). Lăsați-i în aer cel puțin 5 minute (accelerați timpul) și înregistrați indicațiile de pe OLED și ale etalonului.",
    instr: ["Porniți simularea (programul afișează cele patru temperaturi pe OLED și pe monitorul serial).", "Stativul ridicat: senzorii în aer. Accelerați timpul (×10…×60) și urmăriți plotterul până când curbele devin orizontale.", "După cel puțin 5 minute: „● citiri → Tabelul 4.1”."],
    ctl: ctlPoz,
    ver: () => [[sim.run, "programul rulează"], [!sim.dec, "X2 cuplat"], [sim.poz === "aer", "senzorii în aer"], [sim.poz === "aer" && sim.tPoz >= 300, `≥ 5 min în aer (${fx(sim.tPoz / 60, 1)} min)`], [sim.poz === "aer" && abatere() < 0.3, "indicațiile stabilizate"]],
    prog: () => ["et", ...SZ].filter(c => pe("t41", "aer", c)).length, tot: 5,
    butoane: [["● citiri (OLED + etalon) → Tabelul 4.1", inregSt, "primar"]] },
  { t: "Divizorul NTC în aer", tab: "Tabelul 4.3 – aer", v3: "dmm", zona: [540, 20, 560, 720], pini: ["tUs", "t5V", "tGND", "n1", "n2"],
    banda: "Pasul 2 · Multimetrul V⎓: sonda − pe TP GND, + pe TP Us (Us), apoi pe TP 5V (Uref). Apoi decuplați X2, Ω pe NTC 1 – NTC 2 (rezistența măsurată).",
    instr: ["Multimetrul pe <b>V⎓</b>, sonda − pe TP GND, sonda + pe TP Us → „● Us”.", "Sonda + pe TP 5V → „● Uref” (alimentarea divizorului).", "Decuplați X2 (clic pe conector), multimetrul pe <b>Ω</b>, sondele pe NTC 1 și NTC 2 → „● R”. Observați pe OLED ce afișează programul cu NTC-ul deconectat.", "Cuplați X2 la loc."],
    ctl: () => "",
    ver: () => [[sim.run, "programul rulează"], [stabil("aer"), "senzorii stabilizați în aer"], [sim.dmm.mod !== "OFF", "multimetrul pornit"], [peMasa(sim.dmm.s.dmmB) || [sim.dmm.s.dmmR, sim.dmm.s.dmmB].sort().join() === "n1,n2", "sonda − pe masă / sondele pe NTC"]],
    prog: () => ["us", "uref", "rm"].filter(c => pe("t43", "aer", c)).length, tot: 3,
    butoane: [["● Us → Tabelul 4.3", inregUs, "primar"], ["● Uref → Tabelul 4.3", inregUref, "secundar"], ["● R NTC → Tabelul 4.3", inregR, "secundar"]] },
  { t: "Apă caldă, după stabilizare", tab: "Tabelele 4.1 și 4.3 – apă", v3: "senzori", zona: [0, 300, 900, 500], pini: ["tUs", "t5V", "tGND", "n1", "n2"],
    banda: "Pasul 3 · Mănușile, apoi senzorii în recipientul cu apă caldă. După stabilizare: citirile (Tabelul 4.1) și măsurătorile divizorului (Tabelul 4.3).",
    instr: ["Puneți mănușile termoizolante (clic pe ele sau butonul de mai jos).", "„Apă caldă”: stativul coboară senzorii în recipient (conexiunile rămân deasupra apei).", "Așteptați stabilizarea (≥ 1 min, indicațiile constante) și înregistrați: citirile → Tabelul 4.1; Us, Uref, R → Tabelul 4.3."],
    ctl: ctlPoz,
    ver: () => [[sim.manusi, "mănușile puse"], [sim.poz === "apa", "senzorii în apa caldă"], [stabil("apa"), "indicațiile stabilizate"]],
    prog: () => ["et", ...SZ].filter(c => pe("t41", "apa", c)).length + ["us", "uref", "rm"].filter(c => pe("t43", "apa", c)).length, tot: 8,
    butoane: [["● citiri (OLED + etalon) → Tabelul 4.1", inregSt, "primar"], ["● Us → Tabelul 4.3", inregUs, "secundar"], ["● Uref → Tabelul 4.3", inregUref, "secundar"], ["● R NTC → Tabelul 4.3", inregR, "secundar"]] },
  { t: "Treapta de temperatură", tab: "Tabelul 4.2", v3: "senzori", zona: [0, 150, 900, 650], pini: [],
    banda: "Pasul 4 · Senzorii, stabilizați în aer, se introduc simultan în apa caldă; programul înregistrează 121 de eșantioane (60 s). Pe înregistrare: ϑ0, ϑ∞, ϑ(τ) = ϑ0 + 0,632(ϑ∞ − ϑ0) și τ.",
    instr: ["Răciți senzorii: ≈ 1 min în pahar, apoi în aer până se stabilizează (≥ 3…5 min, accelerați timpul).", "Timp ×1, mănușile puse: „▶ Treaptă” (trimite „r” și coboară senzorii la t = 0).", "După 60 s: alegeți senzorul, mutați cursorul pe primul eșantion care atinge ϑ(τ) și înregistrați (repetați pentru toți cei patru).", "Comparați: termocuplul cel mai rapid, NTC-ul auto cel mai lent; DS18B20 are în plus întârzierea conversiei."],
    ctl: () => `${ctlPoz()}<div class="rand-mic"><button type="button" data-trp="1" class="primar">▶ Treaptă (r + introducere)</button></div>
      <div class="rand-mic">${SZ.map(k => `<button type="button" data-cur="${k}" class="${sim.cursor.k === k ? "activ" : ""}" style="border-left:4px solid ${CUL[k]}">${SCURT[k]}</button>`).join("")}</div>
      <label class="cur-l">cursor t [s] <input type="range" id="cur-t" min="0" max="60" step="0.5" value="${sim.cursor.t}"></label>
      <div class="rand-mic"><button type="button" data-dcur="-0.5">◀ 0,5 s</button><button type="button" data-dcur="0.5">0,5 s ▶</button></div>
      <p class="nota" id="cur-info"></p>`,
    ver: () => [[sim.run, "programul rulează"], [sim.manusi, "mănușile puse"], [!!sim.inreg || !!sim.rec, sim.rec ? `înregistrare: ${fx(sim.rec.k * 0.5, 1)} / 60 s` : "treapta înregistrată"], [!!(sim.inreg && sim.inreg.ok), "pornită din aer, cu senzorii stabilizați"]],
    prog: () => SZ.filter(k => pe("t42", k, "tau")).length, tot: 4,
    butoane: [["● ϑ0, ϑ∞, τ (cursor) → Tabelul 4.2", inregTau, "primar"]] },
  { t: "Liniarizarea NTC", tab: "Tabelul 4.3 – calcul", v3: "placa", zona: [540, 20, 560, 720], pini: [],
    banda: "Pasul 5 · Din Us și Uref: R = Rp·Us/(Uref − Us) (4.1), apoi ϑ cu modelul B (4.2) și din tabelul constructorului; comparați cu etalonul și cu rezistența măsurată.",
    instr: ["Calculele apar în coloanele Tabelului 4.3 (fila Determinări) și în rezultate.", "Comparați ϑ model B și ϑ din tabel cu etalonul; eroarea vine din toleranța R25 și B a exemplarului, din Rp (1 %) și din forma reală a caracteristicii.", "Opțional: opriți simularea, schimbați B în program (de ex. 3977) și observați eroarea pe OLED."],
    ctl: () => `<div class="tabel-scroll"><table class="tabel mic"><thead><tr><th>ϑ [°C]</th>${MD.TABEL.filter(r => r[0] >= 0 && r[0] <= 100).map(r => `<th>${r[0]}</th>`).join("")}</tr></thead><tbody><tr><td>R [Ω]</td>${MD.TABEL.filter(r => r[0] >= 0 && r[0] <= 100).map(r => `<td>${r[1]}</td>`).join("")}</tr></tbody></table></div><p class="nota">Tabelul constructorului (NTC 2,5 kΩ la 25 °C).</p>`,
    ver: () => [[pe("t43", "aer", "us") && pe("t43", "aer", "uref"), "Us, Uref în aer"], [pe("t43", "apa", "us") && pe("t43", "apa", "uref"), "Us, Uref în apă caldă"], [pe("t43", "aer", "rm") && pe("t43", "apa", "rm"), "rezistențele măsurate"]],
    prog: () => ["aer", "apa"].filter(s => pe("t43", s, "us") && pe("t43", s, "uref") && pe("t43", s, "rm")).length, tot: 2,
    butoane: [] }
];
let pasActiv = 0;
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată pe planșă</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => alegePas(+b.dataset.vezi, true)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-poz]").forEach(b => b.addEventListener("click", () => mutaPoz(b.dataset.poz)));
  $$("#pasi [data-man]").forEach(b => b.addEventListener("click", () => { sim.manusi = !sim.manusi; instrumenteAfis(); actualizeazaPasi(); }));
  $$("#pasi [data-vit]").forEach(b => b.addEventListener("click", () => seteazaViteza(+b.dataset.vit)));
  $$("#pasi [data-trp]").forEach(b => b.addEventListener("click", () => { seteazaViteza(1); pornesteTreapta(); }));
  $$("#pasi [data-cur]").forEach(b => b.addEventListener("click", () => { sim.cursor.k = b.dataset.cur; $$("#pasi [data-cur]").forEach(x => x.classList.toggle("activ", x === b)); if (sim.inreg) { sim.vedere = "rec"; comutaVedere(); } cursorAfis(); }));
  $$("#pasi [data-dcur]").forEach(b => b.addEventListener("click", () => { sim.cursor.t = Math.max(0, Math.min(60, sim.cursor.t + +b.dataset.dcur)); if (sim.inreg) { sim.vedere = "rec"; comutaVedere(); } cursorAfis(); }));
  const ct = $("#cur-t"); if (ct) ct.addEventListener("input", () => { sim.cursor.t = +ct.value; if (sim.inreg) { sim.vedere = "rec"; comutaVedere(); } cursorAfis(); });
  alegePas(0, false); cursorAfis();
}
function alegePas(i, zoom) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$("#tk-svg .tk-pin").forEach(r => r.classList.toggle("tinta", p.pini.includes(r.dataset.pin)));
  $("#tk-pas-banda").innerHTML = p.banda;
  if (zoom) { seteazaVB(p.zona.slice()); vedere3d(p.v3); }
  if (i === 3 && sim.inreg) { sim.vedere = "rec"; comutaVedere(); }
  actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  const v = PASI[pasActiv].ver();
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = v.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ calculele determinărilor */
const U_ = { num, regresie: (xs, ys) => regresie(xs, ys) };
function calculeazaMAM4(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date || {}, U_), cel = { t42: {}, t43: {} }, F = Number.isFinite;
  SZ.forEach(k => { const x = o.tau[k]; cel.t42[k] = { tt: F(x.tt) ? fx(x.tt, 2) : "", t95: F(x.t95) ? fx(x.t95, 1) : "" }; });
  ["aer", "apa"].forEach(s => { const r = o.r[s]; cel.t43[s] = { rc: F(r.rc) ? fx(r.rc, 0) : "", tb: F(r.tb) ? fx(r.tb, 2) : "", ttab: F(r.ttab) ? fx(r.ttab, 2) : "" }; });
  const er = s => SZ.map(k => F(o.err[s][k]) ? `${SCURT[k]} ${o.err[s][k] >= 0 ? "+" : ""}${fx(o.err[s][k], 2)}` : "").filter(Boolean).join(" · ") || "—";
  const rez = [
    ["Erorile față de etalon în aer [°C]", er("aer")],
    ["Erorile față de etalon în apa caldă [°C]", er("apa")],
    ["Constantele de timp τ [s]", SZ.map(k => F(o.tau[k].tau) ? `${SCURT[k]} <span style="color:var(--accent)">${fx(o.tau[k].tau, 1)}</span>` : "").filter(Boolean).join(" · ") || "—"],
    ...["aer", "apa"].map(s => { const r = o.r[s]; return [`NTC ${s === "aer" ? "în aer" : "în apa caldă"} (4.1, 4.2)`, F(r.rc) ? `R calculat ${fx(r.rc, 0)} Ω${F(r.rm) ? ` (măsurat ${fx(r.rm, 0)} Ω, ${fx((r.rc / r.rm - 1) * 100, 2)} %)` : ""}; ϑ model B = ${fx(r.tb, 2)} °C, tabel ${fx(r.ttab, 2)} °C${F(r.te) ? `, etalon ${fx(r.te, 1)} °C` : ""}` : "—"]; })
  ];
  const verdicte = [];
  const ra = o.r.apa;
  if (F(ra.tb) && F(ra.te)) verdicte.push(Math.abs(ra.tb - ra.te) < 0.6 ? { tip: "ok", text: `În apa caldă modelul B dă ${fx(ra.tb, 2)} °C față de ${fx(ra.te, 1)} °C la etalon (eroare ${fx(ra.tb - ra.te, 2)} °C): precizie bună pe domeniul restrâns.` } : { tip: "atentie", text: `Modelul B se abate cu ${fx(ra.tb - ra.te, 2)} °C de la etalon: toleranța R25 și B a exemplarului și Rp (1 %) contează – ECU folosește tabele de calibrare pe mai multe puncte.` });
  if (F(o.tau.tc.tau) && F(o.tau.ntc.tau)) verdicte.push({ tip: "ok", text: `Termocuplul (τ ≈ ${fx(o.tau.tc.tau, 1)} s) este de ${fx(o.tau.ntc.tau / o.tau.tc.tau, 1)} ori mai rapid decât NTC-ul auto (τ ≈ ${fx(o.tau.ntc.tau, 1)} s): masa termică a carcasei de alamă întârzie indicația; t95 ≈ ${fx(3 * o.tau.ntc.tau, 0)} s.` });
  const elm = o.err.apa.lm; if (F(elm) && Math.abs(elm) > 0.6) verdicte.push({ tip: "atentie", text: `LM35 are în apa caldă eroarea ${fx(elm, 2)} °C: programul presupune referința ADC = 5,0 V, iar tensiunea USB nu este exact 5 V (LM35 nu este ratiometric) – se folosește referința internă sau se măsoară Uref.` });
  // graficul: ultima treaptă înregistrată
  const tr = [...(D.log || [])].reverse().find(l => l.m === "tr");
  const serii = [], legenda = [];
  if (tr) SZ.forEach((k, i) => { serii.push({ tip: "linie", pts: tr.s[k].map((v, j) => [j * MD.DT, v]), culoare: i }); legenda.push([MD.NUME[k], `var(--serie-${i})`]);
    const x = o.tau[k]; if (F(x.tau) && F(x.tt)) serii.push({ tip: "pct", pts: [[x.tau, x.tt]], culoare: i, r: 5 }); });
  let ymin = 15, ymax = 65; if (tr) { const all = SZ.flatMap(k => tr.s[k]); ymin = Math.floor(Math.min(...all) / 5) * 5; ymax = Math.ceil(Math.max(...all) / 5) * 5; }
  return {
    celule: cel, rezultate: rez, verdicte, titluGrafic: "Răspunsul la treapta de temperatură (înregistrarea programului) și punctele ϑ(τ)",
    grafic: { xmin: 0, xmax: 60, ymin, ymax, xlab: "t [s]", ylab: "ϑ [°C]", serii },
    legenda,
    principal: { eticheta: "τ NTC [s]", valoare: F(o.tau.ntc.tau) ? o.tau.ntc.tau : null }
  };
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Apa caldă (≤ 70 °C) se manipulează în recipient izolat, cu capac, așezat stabil pe masă; se folosesc mănuși termoizolante.</li>
<li>Senzorii se introduc în apă numai cu conexiunile electrice deasupra nivelului lichidului; plăcile electronice se țin departe de recipient.</li>
<li>Fierbătorul se folosește numai de cadrul didactic, pe o suprafață separată de standuri.</li>
<li>Termocuplul se manevrează cu grijă: vârful fierbinte nu se atinge imediat după scoaterea din apă.</li></ul></div>
<h2>4.1. Scopul lucrării</h2>
<p>Compararea a patru tipuri de senzori de temperatură folosiți în automobil și în dezvoltarea de prototipuri – termistorul NTC auto, senzorul integrat analogic LM35, senzorul digital DS18B20 și termocuplul tip K – prin precizie, liniarizare și timp de răspuns; calculul temperaturii din tensiunea divizorului NTC și determinarea constantei de timp.</p>
<h2>4.2. Noțiuni teoretice</h2>
<p>Senzorul de temperatură a lichidului de răcire și cel al aerului admis sunt termistoare NTC, a căror rezistență scade exponențial cu temperatura. Termistorul este legat în serie cu o rezistență R<sub>p</sub> din ECU, alimentată la 5 V; ECU măsoară tensiunea pe NTC și calculează rezistența, apoi temperatura, prin modelul cu parametrul B sau prin ecuația Steinhart–Hart:</p>
<div class="ec"><span>R<sub>NTC</sub> = R<sub>p</sub> · U<sub>s</sub> / (U<sub>ref</sub> − U<sub>s</sub>)</span><span class="nr">(4.1)</span></div>
<div class="ec"><span>1/T = 1/T<sub>0</sub> + (1/B) · ln(R<sub>NTC</sub>/R<sub>0</sub>)</span><span class="nr">(4.2)</span></div>
<div class="ec"><span>1/T = A + B<sub>1</sub> · ln R + C · (ln R)<sup>3</sup> &nbsp; (Steinhart–Hart, T în K)</span><span class="nr">(4.3)</span></div>
<p>LM35 dă o tensiune proporțională cu temperatura (10 mV/°C). DS18B20 transmite digital (1-Wire), cu rezoluție de 0,0625 °C și precizie de ±0,5 °C. Termocuplul generează o tensiune termoelectrică de ≈ 41 µV/°C, citită de un convertor dedicat (MAX6675), și acoperă temperaturile mari din evacuare.</p>
<p>Senzorul se comportă ca un sistem de ordinul 1: la o variație bruscă a temperaturii mediului, indicația urmează o exponențială. Constanta de timp τ este timpul în care indicația parcurge 63,2 % din variație (Fig. 4.1); ea depinde de masa senzorului și de contactul termic.</p>
<div class="ec"><span>ϑ(t) = ϑ<sub>0</sub> + (ϑ<sub>∞</sub> − ϑ<sub>0</sub>) · (1 − e<sup>−t/τ</sup>)</span><span class="nr">(4.4)</span></div>
<div class="ec"><span>ϑ(τ) = ϑ<sub>0</sub> + 0,632 · (ϑ<sub>∞</sub> − ϑ<sub>0</sub>)</span><span class="nr">(4.5)</span></div>
<figure><img src="img/fig4_1.jpg" alt="Fig. 4.1 Răspunsul senzorilor la treaptă și divizorul NTC" loading="lazy"><figcaption>Fig. 4.1. Răspunsul senzorilor la o treaptă de temperatură (exemplificativ) și divizorul de tensiune al NTC</figcaption></figure>
<pre class="cod">const float RP = 10000, R0 = 2500, T0 = 298.15, B = 3450;
float ntcTemp(int pin) {
  float u = analogRead(pin) * 5.0 / 1024;
  float r = RP * u / (5.0 - u);
  float invT = 1.0 / T0 + log(r / R0) / B;
  return 1.0 / invT - 273.15;          // °C
}</pre>
<h3>Tabelul constructorului (NTC 2,5 kΩ la 25 °C)</h3>
<div class="tabel-scroll"><table class="tabel mic"><thead><tr><th>ϑ [°C]</th>${MD.TABEL.map(r => `<th>${r[0]}</th>`).join("")}</tr></thead><tbody><tr><td>R [Ω]</td>${MD.TABEL.map(r => `<td>${r[1]}</td>`).join("")}</tr></tbody></table></div>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>U<sub>ref</sub> măsurat (Tabelul 4.3).</b> Relația (4.1) conține tensiunea de alimentare a divizorului. Pe stand aceasta este tensiunea USB a plăcii (4,85…5,02 V), nu exact 5 V; s-a adăugat în Tabelul 4.3 coloana U<sub>ref</sub>, măsurată la TP 5V. Programul nu are nevoie de ea: ADC-ul are referința tot la 5 V al plăcii, deci raportul N/1024 = U<sub>s</sub>/U<sub>ref</sub> (măsurare ratiometrică, ca în ECU).</li>
<li><b>LM35 nu este ratiometric.</b> Ieșirea lui (10 mV/°C) nu depinde de alimentare, dar programul o convertește cu referința de 5,0 V presupusă: la U<sub>USB</sub> = 4,90 V indicația este cu 2 % prea mare (≈ +1,2 °C la 60 °C). Rezoluția este 500/1024 ≈ 0,49 °C. Se îmbunătățește cu referința internă de 1,1 V (0,11 °C) sau cu un ADC extern.</li>
<li><b>Rezoluția NTC-ului depinde de temperatură.</b> Cu R<sub>p</sub> = 10 kΩ și un NTC de 2,5 kΩ, un pas al ADC-ului înseamnă ≈ 0,14 °C la 22 °C, dar ≈ 0,5 °C la 60 °C (U<sub>s</sub> mică). De aceea programul mediază NMED = 16 eșantioane, iar unele ECU comută a doua rezistență de polarizare la motor cald.</li>
<li><b>Autoîncălzirea NTC-ului.</b> Curentul divizorului (≈ 0,4 mA) disipă ≈ 0,4 mW în termistor; în aer (≈ 2,5 mW/K) indicația crește cu ≈ 0,15 °C, în apă efectul este neglijabil.</li>
<li><b>DS18B20 la 12 biți.</b> Conversia durează ≈ 750 ms; programul nu o așteaptă (setWaitForConversion(false)), ci citește rezultatul gata la trecerea următoare prin buclă (500 ms) – valoarea se actualizează la ≈ 1 s și are o întârziere suplimentară de ≈ 0,5…1 s, care se adaugă la τ măsurat. Tabelul 4.1 și treapta se fac la RES = 12.</li>
<li><b>MAX6675.</b> Rezoluția este 0,25 °C (valoare trunchiată), iar compensarea joncțiunii reci se face cu senzorul de pe modul, cu o eroare de ±1…2 °C – termocuplul este rapid, dar nu precis la temperaturi joase.</li>
<li><b>ϑ<sub>∞</sub> la 60 s.</b> După 60 s NTC-ul auto (τ ≈ 9…15 s) a parcurs 98…99,8 % din treaptă; ϑ<sub>∞</sub> citit la 60 s este puțin mai mic decât temperatura apei, deci τ rezultă puțin subestimat. τ se citește la primul eșantion (la 0,5 s) care atinge ϑ(τ); se poate interpola între eșantioane sau se face regresia ln(ϑ<sub>∞</sub> − ϑ) = f(t), a cărei pantă este −1/τ.</li>
<li><b>Etalonul pe același stativ.</b> Termometrul etalon (rezoluție 0,1 °C) stă în mănunchiul senzorilor, la aceeași adâncime; după fiecare schimbare de mediu toate indicațiile se stabilizează înainte de citire. Recipientul izolat se răcește lent (≈ 0,1 °C/min), de aceea citirile se iau simultan.</li>
<li><b>Răcirea înainte de treaptă.</b> După apa caldă, în aer NTC-ul se răcește foarte lent (constanta de timp în aer este de ≈ 10 ori mai mare). Senzorii se răcesc întâi în paharul cu apă la temperatura camerei, apoi se lasă în aer până la stabilizare.</li></ul></div>
<h2>4.4. Modul de lucru (în simulator)</h2>
<ol><li>Porniți simularea; după cel puțin 5 minute în aer înregistrați citirile (Tabelul 4.1).</li>
<li>Măsurați U<sub>s</sub>, U<sub>ref</sub> și rezistența NTC (X2 decuplat) – Tabelul 4.3.</li>
<li>Cu mănușile, introduceți senzorii în apa caldă; după stabilizare – Tabelele 4.1 și 4.3.</li>
<li>Răciți senzorii (pahar, apoi aer), apoi faceți treapta aer → apă caldă și determinați τ pentru fiecare senzor (Tabelul 4.2).</li>
<li>Comparați temperatura NTC calculată cu modelul B și cu tabelul constructorului.</li></ol>
<h2>4.7. Interpretarea rezultatelor</h2>
<ul><li>NTC-ul are sensibilitate mare, dar caracteristică neliniară; eroarea lui depinde de toleranța lui R<sub>p</sub> și de modelul folosit (modelul B este precis pe un domeniu restrâns).</li>
<li>Termocuplul este cel mai rapid (masă mică), senzorul NTC auto cel mai lent (carcasă metalică) – aceasta explică de ce temperatura motorului afișată de ECU „rămâne în urmă” la încălzire.</li>
<li>DS18B20 este precis și ușor de cablat, dar lent la conversie (≈ 750 ms la 12 biți) – potrivit pentru mărimi lente.</li></ul>
<h2>4.8. Relevanță practică</h2>
<p>Liniarizarea termistoarelor și compensarea întârzierii senzorilor se folosesc în calibrarea ECU (corecțiile de pornire la rece, protecția motorului) și în managementul termic al bateriilor vehiculelor electrice, unde zeci de NTC-uri sunt citite de BMS.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>R<sub>p</sub> = 10 kΩ, U<sub>ref</sub> = 5 V, R<sub>0</sub> = 2,5 kΩ la T<sub>0</sub> = 298,15 K, B = 3450 K; se citește U<sub>s</sub> = 0,50 V:</p>
<div class="ec"><span>R<sub>NTC</sub> = 10 000 · 0,50/(5 − 0,50) = 1111 Ω</span><span class="nr">(4.6)</span></div>
<div class="ec"><span>1/T = 1/298,15 + (1/3450) · ln(1111/2500) = 3,119·10<sup>−3</sup> K<sup>−1</sup></span><span class="nr">(4.7)</span></div>
<div class="ec"><span>T = 320,6 K</span><span class="nr">(4.8)</span></div>
<div class="ec"><span>ϑ = 47,5 °C</span><span class="nr">(4.9)</span></div>
<div class="ec"><span>treaptă 22 → 60 °C: ϑ(τ) = 22 + 0,632 · 38 = 46 °C</span><span class="nr">(4.10)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Calculați temperatura pentru U<sub>s</sub> = 0,30 V în condițiile exemplului.</p><details class="sol"><summary>Rezolvare</summary><p>R = 10 000·0,30/4,70 = 638,3 Ω; 1/T = 1/298,15 + ln(638,3/2500)/3450 = 2,9583·10<sup>−3</sup> K<sup>−1</sup>; T = 338,0 K, ϑ ≈ 64,9 °C.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>U<sub>s</sub> = 0,50 V a fost măsurată cu U<sub>ref</sub> real = 4,90 V. Ce temperatură rezultă cu U<sub>ref</sub> = 4,90 V și cât este eroarea dacă se folosește 5 V?</p><details class="sol"><summary>Rezolvare</summary><p>R = 10 000·0,50/4,40 = 1136 Ω; 1/T = 1/298,15 + ln(1136/2500)/3450 = 3,1255·10<sup>−3</sup> ⇒ ϑ = 46,8 °C. Cu 5 V (1111 Ω) rezultă 47,5 °C: eroare ≈ +0,7 °C. Programul de pe placă nu are această eroare, pentru că ADC-ul folosește aceeași referință (ratiometric).</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>La o treaptă 22 → 60 °C, NTC-ul indică 40 °C după 8 s. Estimați τ (sistem de ordinul 1).</p><details class="sol"><summary>Rezolvare</summary><p>1 − e<sup>−8/τ</sup> = 18/38 = 0,474 ⇒ τ = −8/ln(0,526) = 12,5 s; t<sub>95</sub> ≈ 3τ ≈ 37 s.</p></details></div>
<div class="problema"><h3>Problema 4</h3><p>LM35 este citit cu analogRead(A1)·500/1024, iar tensiunea USB este 4,92 V. Ce indică programul la 60,0 °C?</p><details class="sol"><summary>Rezolvare</summary><p>U = 0,600 V, N = 0,600/4,92·1024 = 124,9 → 124; ϑ = 124·500/1024 = 60,5 °C (ideal ar fi 61,0 °C din cauza referinței, minus trunchierea).</p></details></div>`;
}
const INTREBARI = [
  ["De ce ECU măsoară tensiunea pe NTC și nu direct rezistența?", "ADC-ul convertește tensiuni; cu divizorul alimentat din aceeași referință de 5 V ca ADC-ul, raportul U<sub>s</sub>/U<sub>ref</sub> depinde numai de R<sub>NTC</sub>/R<sub>p</sub> (ratiometric), deci variațiile alimentării se anulează. Circuitul este simplu, ieftin și permite diagnoza întreruperii și a scurtului (U<sub>s</sub> ≈ U<sub>ref</sub> sau ≈ 0)."],
  ["Ce temperatură afișează ECU la întreruperea circuitului NTC și de ce?", "La întrerupere U<sub>s</sub> urcă la ≈ U<sub>ref</sub> (R „infinit”), ceea ce corespunde unei temperaturi foarte mici; ECU limitează și afișează −40 °C (capătul inferior al tabelei) și memorează un cod de defect (de ex. P0118 – semnal mare), apoi folosește o valoare de substituție. În simulator, programul fără limitare calculează ≈ −99 °C. La scurt la masă se afișează temperatura maximă (≈ 140 °C)."],
  ["Calculați temperatura pentru U<sub>s</sub> = 0,30 V în condițiile exemplului.", "R = 10 000·0,30/4,70 = 638 Ω; 1/T = 1/298,15 + ln(638/2500)/3450 ⇒ T ≈ 338,0 K, ϑ ≈ 64,9 °C."],
  ["Ce factori influențează constanta de timp a unui senzor?", "Masa și căldura specifică a elementului sensibil și a carcasei (alama NTC-ului auto, teaca de inox), contactul termic dintre element și carcasă (pastă, aer), coeficientul de transfer termic cu mediul – depinde de mediu (apă ≫ aer) și de viteza lui (curgere, agitare). La senzorii digitali se adaugă timpul de conversie."],
  ["Ce senzor ați alege pentru temperatura gazelor de evacuare și de ce?", "Termocuplul tip K (sau un senzor rezistiv cu platină PT200 pentru EGT): domeniu până la ≈ 1000…1200 °C, vârf subțire cu răspuns rapid și robustețe; NTC-urile, LM35 și DS18B20 nu rezistă (≤ 125…150 °C)."]
];
const TEST = [
  { q: "Rezistența unui termistor NTC:", o: ["crește liniar cu temperatura", "scade exponențial cu temperatura", "nu depinde de temperatură", "crește exponențial"], c: 1, e: "Coeficient de temperatură negativ." },
  { q: "Pentru U<sub>s</sub> = 0,50 V, R<sub>p</sub> = 10 kΩ și U<sub>ref</sub> = 5 V, R<sub>NTC</sub> este:", o: ["1000 Ω", "1111 Ω", "900 Ω", "2500 Ω"], c: 1, e: "10 000·0,5/4,5." },
  { q: "Constanta de timp τ este timpul în care indicația parcurge:", o: ["50 %", "63,2 %", "95 %", "100 %"], c: 1, e: "1 − e<sup>−1</sup> = 0,632." },
  { q: "Cel mai rapid dintre senzorii lucrării este:", o: ["NTC auto", "DS18B20 în sondă", "termocuplul K", "LM35"], c: 2, e: "Masă termică mică." },
  { q: "La întreruperea firului NTC, ECU afișează de regulă:", o: ["140 °C", "−40 °C", "0 °C", "ultima valoare"], c: 1, e: "U<sub>s</sub> → U<sub>ref</sub>, temperatura minimă a tabelei." },
  { q: "LM35 citit de Arduino cu referința 5 V la o tensiune USB de 4,90 V indică:", o: ["corect", "cu ≈ 2 % prea mult", "cu ≈ 2 % prea puțin", "zero"], c: 1, e: "Programul presupune 5,0 V; 5/4,9 = 1,02." }
];

/* ------------------------------------------------------------------ definiția lucrării */
const CSS = `<style>
.tk { padding:0 !important; overflow:hidden; background:#fff; color:#222; }
.tk-bara { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; padding:.45rem .6rem; background:#fff; border-bottom:1px solid #e3e3e3; }
.tk-logo { font:600 .9rem system-ui,sans-serif; color:#333; margin-right:auto; } .tk-logo b { color:#1477d1; }
.tk-bara button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.32rem .7rem; font:600 .82rem system-ui,sans-serif; cursor:pointer; }
.tk-bara button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; }
.tk-bara .tk-start { background:#2e9e44; border-color:#2e9e44; color:#fff; } .tk-bara .tk-start.ruleaza { background:#d6452f; border-color:#d6452f; }
.tk-plansa { position:relative; background:#fbfbfb; border-bottom:1px solid #e3e3e3; }
#tk-svg { width:100%; height:auto; aspect-ratio:1300/800; display:block; touch-action:none; user-select:none; font-family:system-ui,sans-serif; }
.tk-pin { fill:transparent; stroke:transparent; cursor:crosshair; } .tk-pin:hover, .tk-pin.aproape { fill:rgba(20,119,209,.35); stroke:#1477d1; stroke-width:1.2; }
.tk-comp { cursor:pointer; }
.m4-3d .m3d { height:clamp(400px, 58vh, 640px); }
.tk-plansa.cu3d #tk-svg { display:none; }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.tk-dmm, .tk-vederi { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; padding:.35rem .6rem; font:12.5px system-ui,sans-serif; color:#333; border-bottom:1px solid #eee; }
.tk-dmm button, .tk-vederi button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.2rem .55rem; font:600 12px system-ui; cursor:pointer; } .tk-dmm button.activ { background:#f2b705; border-color:#c99700; }
.tk-dmm select { font:12px system-ui; } .tk-dmm-v { margin-left:auto; font:700 14px ui-monospace,monospace; background:#bfd0b0; color:#1d2414; padding:.1rem .5rem; border-radius:3px; min-width:7ch; text-align:right; }
.abur { opacity:.0; animation:abur 3.2s ease-in-out infinite; } .abur1 { animation-delay:1.05s; } .abur2 { animation-delay:2.1s; }
@keyframes abur { 0% { opacity:0; transform:translateY(8px); } 35% { opacity:.55; } 100% { opacity:0; transform:translateY(-26px); } }
.tk-ajutor { margin:.3rem .6rem 0; font:11px system-ui,sans-serif; color:#888; pointer-events:none; }
.tk-insp { position:absolute; right:.6rem; top:.6rem; width:290px; background:#fff; border:1px solid #d8dde3; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.15); font:12.5px system-ui,sans-serif; color:#333; }
.tk-insp-t { display:flex; justify-content:space-between; align-items:center; padding:.5rem .6rem; font-weight:700; border-bottom:1px solid #eee; } .tk-insp-t button { border:0; background:none; cursor:pointer; color:#777; }
.tk-insp-r { display:flex; justify-content:space-between; gap:.6rem; padding:.3rem .6rem; } .tk-insp-r span { color:#777; } .tk-insp-r b { font-weight:600; text-align:right; }
.tk-insp-r button { font:12px system-ui; padding:.15rem .5rem; border:1px solid #1477d1; color:#0d5ea8; background:#e8f1fb; border-radius:4px; cursor:pointer; }
.tk-jos { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); border-top:1px solid #e3e3e3; }
.tk-jos:has(.tk-cod[hidden]) { grid-template-columns:1fr; }
.tk-cod { background:#fff; display:flex; flex-direction:column; min-width:0; } .tk-cod[hidden] { display:none; }
.tk-ser { border-left:1px solid #e3e3e3; display:flex; flex-direction:column; min-width:0; background:#fff; }
.tk-cod-sus { display:flex; gap:.4rem; padding:.4rem .5rem; border-bottom:1px solid #eee; align-items:center; font:12px system-ui,sans-serif; color:#555; }
.tk-cod-sus button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.1rem .5rem; font:11.5px system-ui; cursor:pointer; color:#333; } .tk-cod-sus button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; }
#tk-cod { margin:0; padding:.5rem .3rem; overflow:auto; background:#fff; color:#1f1f1f; font:11.5px/1.5 ui-monospace,Consolas,"Courier New",monospace; white-space:pre; max-height:420px; }
.cd-ln { display:inline-block; width:2.2em; color:#a8a8a8; text-align:right; margin-right:.8em; user-select:none; }
.cd-k { color:#0b62b5; font-weight:600; } .cd-s { color:#b2502b; } .cd-c { color:#6a8759; font-style:italic; } .cd-n { color:#7a3fb0; }
.cd-f { min-width:5.5ch; background:#fff8d6; color:#5b3d00; border:1px solid #e0b84a; border-radius:3px; font:inherit; padding:0 .2rem; } .cd-f:disabled { background:#f1f1f1; color:#777; border-color:#ccc; }
.tk-blocat { background:#fff4e5; color:#8a5300; font:12px system-ui,sans-serif; padding:.35rem .6rem; border-bottom:1px solid #f1d7a8; }
#tk-serial { margin:0; flex:1 1 auto; min-height:120px; max-height:200px; overflow:auto; background:#fff; color:#222; padding:.4rem .6rem; font:11.5px/1.4 ui-monospace,Consolas,monospace; }
#tk-plot { width:100%; height:190px; display:block; border-top:1px solid #eee; }
.tk-ser-in { display:flex; gap:.3rem; padding:.35rem .5rem; border-top:1px solid #eee; } .tk-ser-in input { flex:1; font:12px ui-monospace,monospace; padding:.2rem .4rem; border:1px solid #cfd4da; border-radius:4px; } .tk-ser-in button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.2rem .6rem; font:12px system-ui; cursor:pointer; color:#333; }
.fw { font-size:.8rem; } .fw b { font-family:ui-monospace,monospace; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; }
.tk-pas-banda { position:absolute; left:.6rem; bottom:.5rem; max-width:min(560px,62%); background:rgba(20,119,209,.93); color:#fff; border-radius:6px; padding:.4rem .6rem; font:12.5px/1.35 system-ui,sans-serif; box-shadow:0 3px 10px rgba(0,0,0,.2); pointer-events:none; }
.tk-pas-banda:empty { display:none; }
.tk-pin.tinta { fill:rgba(255,152,0,.35); stroke:#ff6d00; stroke-width:2; animation:pulsPin 1.1s ease-in-out infinite; }
@keyframes pulsPin { 50% { stroke-width:4.5; fill:rgba(255,152,0,.7); } }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); }
.pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; }
.pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; }
.pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; }
.pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-but { display:flex; flex-direction:column; gap:.35rem; }
.pas-ctl { margin:.3rem 0; } .rand-mic { display:flex; flex-wrap:wrap; gap:.3rem; margin:.25rem 0; } .rand-mic button { padding:.25rem .55rem; font-size:.8rem; } .rand-mic button.activ { outline:2px solid var(--accent); }
.cur-l { display:flex; align-items:center; gap:.4rem; font-size:.8rem; } .cur-l input { flex:1; }
table.mic { font-size:.72rem; } table.mic th, table.mic td { padding:.15rem .3rem; }
.sim-grila:fullscreen .sim-scena.tk, .sim-grila.ecran-plin .sim-scena.tk { display:block; }
.sim-grila:fullscreen #tk-svg, .sim-grila.ecran-plin #tk-svg { height:calc(100vh - 25rem); min-height:320px; aspect-ratio:auto; }
.sim-grila:fullscreen .m4-3d .m3d, .sim-grila.ecran-plin .m4-3d .m3d { height:calc(100vh - 27rem); min-height:320px; }
@media (max-width:900px){ .tk-jos { grid-template-columns:1fr; } .tk-ser { border-left:0; border-top:1px solid #e3e3e3; } .tk-pas-banda { position:static; max-width:none; border-radius:0; } }
</style>`;
Cadru.porneste({
  disc: "MAM1", nr: 4, cod: "mam1-l4",
  titlu: "Senzori de temperatură: liniarizare și constanta de timp",
  scurt: "Senzori de temperatură",
  subtitlu: "Laborator virtual – NTC auto, LM35, DS18B20 și termocuplu K pe Arduino Mega cu OLED: precizia față de etalon, divizorul NTC și modelul B, treapta de temperatură și constanta de timp",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261025); },
  date: [{ k: "Rp", et: "R<sub>p</sub> [Ω]", v: 10000, fix: true }, { k: "R0", et: "R<sub>0</sub> la 25 °C [Ω]", v: 2500, fix: true }, { k: "T0", et: "T<sub>0</sub> [K]", v: 298.15, fix: true }, { k: "B", et: "B [K]", v: 3450, fix: true }],
  tabele: [
    { id: "t41", titlu: "Tabelul 4.1. Precizia senzorilor", antetRand: "Situație", nota: "Citirile programului (OLED / monitorul serial) și ale termometrului etalon, după stabilizare; DS18B20 la 12 biți.",
      randuri: [{ k: "aer", et: "Aer, temperatura camerei" }, { k: "apa", et: "Apă caldă, după stabilizare" }],
      coloane: [{ k: "et", t: "Etalon [°C]", intrare: true }, { k: "ntc", t: "NTC [°C]", intrare: true }, { k: "lm", t: "LM35 [°C]", intrare: true }, { k: "ds", t: "DS18B20 [°C]", intrare: true }, { k: "tc", t: "Termocuplu K [°C]", intrare: true }] },
    { id: "t42", titlu: "Tabelul 4.2. Constanta de timp", antetRand: "Senzor", nota: "Din înregistrarea treptei aer → apă caldă (121 de eșantioane la 0,5 s): ϑ0 = primul eșantion, ϑ∞ = ultimul (60 s), τ = momentul primului eșantion ≥ ϑ(τ).",
      randuri: SZ.map(k => ({ k, et: MD.NUME[k] })),
      coloane: [{ k: "t0", t: "ϑ0 [°C]", intrare: true }, { k: "tinf", t: "ϑ∞ [°C]", intrare: true }, { k: "tt", t: "ϑ(τ) [°C]" }, { k: "tau", t: "τ [s]", intrare: true }, { k: "t95", t: "t95 ≈ 3τ [s]" }] },
    { id: "t43", titlu: "Tabelul 4.3. Liniarizarea NTC", antetRand: "Situație", nota: "U<sub>s</sub> și U<sub>ref</sub> cu multimetrul (X2 cuplat); R<sub>NTC</sub> măsurat cu ohmmetrul (X2 decuplat); R<sub>NTC</sub> calculat cu (4.1), R<sub>p</sub> = 10 kΩ; ϑ model B cu (4.2); ϑ din tabelul constructorului prin interpolare în ln R.",
      randuri: [{ k: "aer", et: "Aer" }, { k: "apa", et: "Apă caldă" }],
      coloane: [{ k: "us", t: "U<sub>s</sub> [V]", intrare: true }, { k: "uref", t: "U<sub>ref</sub> [V]", intrare: true }, { k: "rc", t: "R<sub>NTC</sub> calculat [Ω]" }, { k: "rm", t: "R<sub>NTC</sub> măsurat [Ω]", intrare: true }, { k: "tb", t: "ϑ model B [°C]" }, { k: "ttab", t: "ϑ tabel [°C]" }, { k: "te", t: "ϑ etalon [°C]", intrare: true }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaMAM4,
  intrebari() {
    return [
      { id: "q1", u: "°C", text: "Eroarea NTC-ului față de etalon în apa caldă, ϑ<sub>NTC</sub> − ϑ<sub>etalon</sub> (Tabelul 4.1):", textSimplu: "Eroarea NTC în apa caldă" },
      { id: "q2", u: "s", text: "Constanta de timp a NTC-ului auto, τ (Tabelul 4.2):", textSimplu: "τ NTC" },
      { id: "q3", u: "s", text: "Constanta de timp a termocuplului K, τ (Tabelul 4.2):", textSimplu: "τ termocuplu" },
      { id: "q4", u: "°C", text: "Temperatura pentru U<sub>s</sub> = 0,30 V în condițiile exemplului (R<sub>p</sub> = 10 kΩ, U<sub>ref</sub> = 5 V, R<sub>0</sub> = 2,5 kΩ, B = 3450 K):", textSimplu: "ϑ pentru Us = 0,30 V" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = ["aer", "apa"].reduce((n, s) => n + ["et", ...SZ].filter(c => t.t41[s][c] !== "").length, 0); if (a < 10) l.push(`Tabelul 4.1: ${a}/10 valori`);
    const b = SZ.filter(k => t.t42[k].tau !== "").length; if (b < 4) l.push(`Tabelul 4.2: ${b}/4 senzori`);
    const c = ["aer", "apa"].reduce((n, s) => n + ["us", "uref", "rm", "te"].filter(x => t.t43[s][x] !== "").length, 0); if (c < 8) l.push(`Tabelul 4.3: ${c}/8 valori`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t43.apa, { us: "0.500", uref: "5.000", te: "47.5" }); Object.assign(t.t42.ntc, { t0: "22.00", tinf: "60.00", tau: "12.0" }); },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Senzorul de temperatură a lichidului de răcire în autoturism",
    intro: `<p>Senzorul de temperatură a lichidului de răcire (CTS/ECT) este un termistor NTC în carcasa termostatului, legat la calculatorul motorului printr-un divizor cu rezistența de polarizare din ECU. Selectați-l în machetă: amplasarea, mufa și semnalul. Constanta lui de timp explică de ce temperatura afișată „rămâne în urmă” la încălzire.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "ect" })
  },
  atelierSenzori: { intro: `<p>Senzorul de temperatură a lichidului de răcire (NTC) este preselectat: modelul 3D, mufa și verificările (rezistența la rece și la cald, tensiunea pe divizor, întreruperea). Puteți alege și senzorul de temperatură a aerului admis sau alți senzori din listă.</p>`, optiuni: { initial: "ect" } },
  referat: {
    scop: "Compararea senzorilor de temperatură NTC auto, LM35, DS18B20 și termocuplu K prin precizie, liniarizare și timp de răspuns; calculul temperaturii din tensiunea divizorului NTC și determinarea constantei de timp.",
    relatii: "R<sub>NTC</sub> = R<sub>p</sub>·U<sub>s</sub>/(U<sub>ref</sub> − U<sub>s</sub>); &nbsp; 1/T = 1/T<sub>0</sub> + (1/B)·ln(R/R<sub>0</sub>); &nbsp; ϑ(t) = ϑ<sub>0</sub> + (ϑ<sub>∞</sub> − ϑ<sub>0</sub>)(1 − e<sup>−t/τ</sup>); &nbsp; ϑ(τ) = ϑ<sub>0</sub> + 0,632(ϑ<sub>∞</sub> − ϑ<sub>0</sub>).",
    varianta: () => "Exemplarele proprii fiecărui student: R25 și B ale NTC-ului, toleranța lui Rp, erorile LM35, DS18B20 și ale compensării termocuplului, tensiunea USB, constantele de timp și temperaturile aerului și apei.",
    indicatii: "Comentați erorile fiecărui senzor față de etalon (inclusiv efectul referinței ADC asupra LM35), diferența dintre R calculat și măsurat, modelul B față de tabel, ordinea constantelor de timp și efectul conversiei DS18B20…"
  },
  subsol: "Modelul: NTC cu caracteristica ln(R/R0) = B·x + K·x² (exemplar propriu), divizor ratiometric cu Rp 1 %, autoîncălzire, ADC 10 biți cu zgomot; LM35 citit cu referința USB; DS18B20 cu conversie fără blocare; MAX6675 cu compensarea joncțiunii reci; senzori de ordinul 1 (τ în apă, ≈ 10τ în aer). Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Circuite</b> · Stand MAM I – Lucrarea 4</span>
        <button type="button" id="tk-fit" title="Încadrează tot">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa"><div id="st3d" class="m4-3d"></div>${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div>
        <div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-dmm" id="tk-dmm"></div>
      <div class="tk-vederi" id="tk-vederi" hidden><span>Vedere:</span>${[["tot", "Ansamblu"], ["senzori", "Senzori și recipiente"], ["placa", "Placa de test"], ["dmm", "Multimetru"]].map(([k, t]) => `<button type="button" data-v3="${k}">${t}</button>`).join("")}</div>
      <p class="tk-ajutor" id="aj-3d" hidden>Trageți = rotire · dreapta-trageți = deplasare · rotița = zoom · clic pe pahar / vasul Dewar / stativ = mută senzorii · clic pe un punct de test = sonda multimetrului (+, sau − pe GND / NTC 2) · clic pe comutatorul rotativ, pe X2, pe mănuși, pe RESET · celelalte obiecte = detalii</p>
      <p class="tk-ajutor" id="aj-svg">Rotița = zoom · tragere pe fundal = deplasare · clic pe componente = detalii (dublu clic pe pahar / recipient = introduce senzorii) · trageți sondele multimetrului pe punctele de test · clic pe comutatorul rotativ, pe X2, pe mănuși și pe RESET</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – Arduino Mega 2560</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite (de ex. r)" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div>
          <div class="tk-cod-sus"><b>Plotter serial</b><span style="margin-left:auto"></span><button type="button" data-ved="live" class="activ">Live</button><button type="button" data-ved="rec">Treapta înregistrată</button></div>
          <canvas id="tk-plot" aria-label="Plotterul serial: temperaturile celor patru senzori"></canvas></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Valorile intră în tabele numai din aparate și din înregistrarea programului. „Arată pe planșă” mărește zona de lucru și marchează punctele de măsură.</p>
    </aside>
  </div>`,
    init(C) {
      initTermic(); [sim.bx, sim.by] = POZ.aer;
      legaPlansa(); desenSonde(); desenStativ(); afiseazaCod(); actualizeazaFw(); instrumenteAfis(); oledAfis(); citesteDMM();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => { seteazaVB(VB0.slice()); vedere3d("tot"); });
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) trimiteSerial(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      $$("[data-ved]").forEach(b => b.addEventListener("click", () => { if (b.dataset.ved === "rec" && !sim.inreg) return Cadru.mesajTemporar("Nu există încă o treaptă înregistrată.", "atentie"); sim.vedere = b.dataset.ved; comutaVedere(); }));
      construiestePasi(); dmmCtl();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $$("[data-v3]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v3)));
      import(BAZA_COMUN + "aparate3d.js?v=4").then(m => { SV3 = m.creeazaStandTemp($("#st3d"), { laClic: laClic3d }); $(".tk-plansa").classList.add("cu3d"); $("#tk-vederi").hidden = false; $("#aj-3d").hidden = false; $("#aj-svg").hidden = true; sincron3d(true); })
        .catch(e => { console.warn("Standul 3D nu s-a încărcat:", e); $("#st3d").remove(); });
      C.mesaj("Pasul 1: porniți simularea și lăsați senzorii să se stabilizeze în aer (cel puțin 5 minute – accelerați timpul).", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.serial = []; sim.ist = []; sim.inreg = null; sim.tS = 0; if (Cadru.P) initTermic(); },
    cadru(dt, C, vizibil) {
      const acum = performance.now(), hR = Math.min(dt || 0.016, 0.1), h = hR * sim.viteza;
      animaStativ(hR);
      // integrarea termică (pași de cel mult 0,05 s)
      const p = P(); let rest = h;
      while (rest > 1e-9) { const d = Math.min(0.05, rest); rest -= d; sim.tS += d; sim.tPoz += d;
        const T = Tm(), m = medTip(); ["ntc", "lm", "ds", "tc", "et"].forEach(k => { sim.Ts[k] += (T - sim.Ts[k]) * (1 - Math.exp(-d / MD.tau(p, k, m))); });
        if (sim.run) pasProgram(); }
      if (!vizibil) return;
      if (acum - sim.dmm.tA > 300) { sim.dmm.tA = acum; citesteDMM(); const v = $(".tk-dmm-v"); if (v) v.textContent = sim.dmm.mod === "OFF" ? "" : sim.dmm.txt; }
      if (acum - (this._to || 0) > 120) { this._to = acum; oledAfis(); instrumenteAfis(); plotter(); sincron3d(); }
      $("#ledTX").setAttribute("fill", sim.run && acum - sim.tx < 60 ? "#ffd04a" : "#5a4a1a");
      if (acum - (this._ts || 0) > 300) {
        this._ts = acum; avertizari(); actualizeazaPasi(); if (pasActiv === 3) cursorAfis();
        C.stare(1, sim.run ? "placa alimentată" : "alimentare oprită", sim.run ? "inc" : ""); C.stare(2, sim.rec ? `înregistrare treaptă ${fx(sim.rec.k * 0.5, 1)} s` : `senzorii ${NUME_POZ[sim.poz].replace(/ \(.*\)/, "")}`);
      }
    },
    redeseneaza() { desenStativ(); plotter(); },
    formule() {
      const r = [], p = P(); if (!p || !sim.Ts) return r;
      const us = MD.uNTC(p, sim.Ts.ntc, medTip()), R = 10000 * us / (5 - us);
      r.push(["Divizorul NTC (4.1)", `R = 10 000 · ${fx(us, 3)}/(5 − ${fx(us, 3)}) = <span class="rez">${fx(R, 0)} Ω</span> (cu U<sub>ref</sub> = 5 V)`]);
      r.push(["Modelul B (4.2)", `ϑ = 1/(1/298,15 + ln(${fx(R, 0)}/2500)/3450) − 273,15 = <span class="rez">${fx(MD.tB(R, 3450), 2)} °C</span>`]);
      if (sim.inreg) { const c = MD.trecere(sim.inreg.s[sim.cursor.k]); r.push([`ϑ(τ) ${MD.NUME[sim.cursor.k]} (4.5)`, `${fx(c.t0, 2)} + 0,632·(${fx(c.tinf, 2)} − ${fx(c.t0, 2)}) = <span class="rez">${fx(c.tt, 2)} °C</span>`]); }
      return r;
    }
  }
});
