/* MAM I – Lucrarea 5. Senzorul de presiune absolută din colector (MAP): calibrare și calculul densității aerului.
   Simulator cu standul 3D realist: pompa manuală de vid/presiune cu manometru, furtunurile de 6 mm cu coliere, teul, manometrul etalon
   digital, senzorul MAP pe colțar, placa de test cu BMP280 și punctele de test, Arduino Mega cu OLED, multimetrul, ochelarii de protecție;
   editorul programului (parametrii calibrării), monitorul și plotterul serial (eliberarea bruscă eșantionată la 10 ms). Parametrii sunt individuali. */
"use strict";
const MD = MODELE["mam1-l5"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, tS: 0, viteza: 1, p: 101.3, dth: 0, mod: "vid", frac: 1, lent: false, rel: false, coliere: [false, false, false], desprins: -1, ochelari: false,
  dmm: { mod: "OFF", v: null, txt: "", u: "", s: { dmmR: "nc", dmmB: "nc" } }, camp: { A: "0.01851", B: "0.0246" }, fw: null, pr: null, serial: [], tx: 0,
  ist: [], rec: null, inreg: null, cur: { k: "t90", t90: 0, t10: 0 }, vedere: "live", etans: null
};
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pApp = () => sim.p + sim.dth;                         // presiunea absolută din circuit [kPa]
const pRel = () => pApp() - P().patm;
const etalonTxt = () => sim.desprins === 2 ? 0 : MD.etalon(P(), pRel());
const strans = () => sim.coliere.every(Boolean) && sim.desprins < 0;
const stabil = () => Math.abs(sim.dth) < 0.05 && !sim.lent && !sim.rel && !sim.rec;
let SV3 = null;

/* ------------------------------------------------------------------ pneumatica */
function pasPneumatic(d) {
  const p = P(), pa = p.patm;
  sim.dth *= Math.exp(-d / 3);
  if (sim.desprins >= 0) { sim.p = pa; sim.dth = 0; return; }
  const tl = sim.coliere.every(Boolean) ? p.tLeak : p.tLeak / 200;
  sim.p = pa + (sim.p - pa) * Math.exp(-d / tl);
  if (sim.lent) sim.p = pa + (sim.p - pa) * Math.exp(-d / p.tSlow);
  if (sim.rel) { sim.p = pa + (sim.p - pa) * Math.exp(-d / p.tRel); sim.dth = 0; if (Math.abs(sim.p - pa) < 0.02) sim.rel = false; }
  // NSSM: furtunul fără colier sare la suprapresiune
  if (pRel() > 30) { const i = sim.coliere.findIndex(c => !c); if (i >= 0) { sim.desprins = i; sim.p = pa; sim.dth = 0; Cadru.mesajTemporar(`NSSM: furtunul ${["pompei", "senzorului MAP", "manometrului etalon"][i]} a sărit de pe racord (colierul nu era strâns)! Presiunea s-a descărcat brusc. Montați-l la loc și strângeți colierul.`, "pericol"); sincron3d(); } }
}
function cursaPompa(frac) {
  if (!sim.ochelari) return Cadru.mesajTemporar("NSSM: puneți ochelarii de protecție înainte de a lucra cu pompa.", "pericol");
  if (sim.rec) return;
  if (sim.desprins >= 0) return Cadru.mesajTemporar("Un furtun este desprins: montați-l (clic pe colierul lui).", "atentie");
  const p = P(), p0 = sim.p, p1 = MD.cursa(p, p0, sim.mod), dp = (p1 - p0) * (frac || 1);
  sim.p = p0 + dp; sim.dth += 0.015 * dp;
  if (pApp() - p.patm > 100) { sim.p = p.patm + 99.6; sim.dth = 0; Cadru.mesajTemporar("Supapa de siguranță a pompei s-a deschis: presiunea nu depășește 200 kPa absolut (≈ 1 bar peste presiunea atmosferică).", "atentie"); }
  if (SV3) SV3.cursa();
  actualizeaza();
}
function eliberareRapida() {
  if (sim.desprins >= 0) return;
  if (sim.run && sim.fw && Math.abs(pRel()) >= 40 && !sim.rec) {
    const p = P(), s = MD.eliberare(p, pApp(), Math.random);
    sim.rec = { k: 0, s, p0: pApp(), t0: sim.tS }; sim.pr.tN = sim.tS + 0.05;
    seriala("> r"); seriala("Înregistrare rapidă: 100 eșantioane la 10 ms (U [V]); supapa se deschide după al 5-lea eșantion");
  }
  sim.rel = true; sim.lent = false; actualizeaza();
}

/* ------------------------------------------------------------------ programul */
const PROG = { titlu: "map_calibrare" };
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
const inp = k => `<input class="cd-f cd-in" data-cf="${k}" value="${sim.camp[k]}" inputmode="decimal" size="8">`;
function cod() {
  return `${K_("#include")} ${S_("&lt;Adafruit_BMP280.h&gt;")}     ${C_("// presiunea atmosferică și temperatura aerului (I²C 0x76)")}
${K_("#include")} ${S_("&lt;Adafruit_SSD1306.h&gt;")}    ${C_("// OLED 128×64, I²C 0x3C")}
${K_("const")} ${K_("float")} A = ${inp("A")}, B = ${inp("B")};   ${C_("// V/kPa, V – din calibrare (Tabelul 5.2)")}
Adafruit_BMP280 bmp; ${K_("bool")} rapid = ${K_("false")};

${K_("void")} setup() { Serial.begin(${N_("115200")}); bmp.begin(${N_("0x76")}); oled.begin(SSD1306_SWITCHCAPVCC, ${N_("0x3C")}); }
${K_("void")} loop() {
  ${K_("if")} (Serial.available() &amp;&amp; Serial.read() == ${S_("'r'")}) rapid = ${K_("true")};
  ${K_("if")} (rapid) {                                ${C_("// răspunsul dinamic: 100 eșantioane la 10 ms")}
    ${K_("for")} (${K_("int")} i = ${N_("0")}; i &lt; ${N_("100")}; i++) { Serial.println(analogRead(A0) * ${N_("5.0")} / ${N_("1024")}, ${N_("4")}); delayMicroseconds(${N_("9880")}); }
    rapid = ${K_("false")};
  }
  ${K_("float")} u = analogRead(A0) * ${N_("5.0")} / ${N_("1024")};
  ${K_("float")} p = (u - B) / A;                      ${C_("// kPa absolut (5.6)")}
  ${K_("float")} T = ${N_("273.15")} + bmp.readTemperature();     ${C_("// K")}
  ${K_("float")} rho = p * ${N_("1000")} / (${N_("287.0")} * T);         ${C_("// kg/m³ (5.7)")}
  ${K_("float")} pa = bmp.readPressure() / ${N_("1000")};         ${C_("// kPa")}
  afiseaza(u, p, rho, pa, T); scrieSerial(u, p, rho, pa, T);
  delay(${N_("100")});
}`;
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 400) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-150).join("\n"); el.scrollTop = el.scrollHeight; }
function pornesteProgram() { sim.pr = { t0: sim.tS, tN: sim.tS + 0.1, tL: 0, last: null }; seriala(`MAP – calibrare | A = ${sim.fw.A} V/kPa, B = ${sim.fw.B} V`); }
function pasProgram() {
  const pr = sim.pr; if (!pr) return; const p = P();
  if (sim.rec) {
    const r = sim.rec;
    while (r.k < MD.NS && sim.tS >= r.t0 + r.k * MD.DTS) { seriala(r.s[r.k].toFixed(4)); r.k++; }
    if (r.k >= MD.NS) { sim.inreg = { s: r.s, p0: r.p0, logat: false, nr: (sim.inreg ? sim.inreg.nr : 0) + 1 }; sim.rec = null; seriala("STOP – 100 eșantioane (1 s)"); sim.vedere = "rec"; const c = MD.treceri(r.s); sim.cur.t90 = 0; sim.cur.t10 = 0; comutaVedere(); pr.tN = sim.tS + 0.1; }
    return;
  }
  while (pr.tN <= sim.tS + 1e-9) {
    const u = MD.uProg(p, pApp(), Math.random), pp = (u - sim.fw.B) / sim.fw.A, T = MD.bmpT(p) + gauss() * 0.01, rho = pp * 1000 / (MD.RA * (T + 273.15)), pa = MD.bmpP(p) + Math.round(gauss() * 1.2) / 100;
    pr.last = { u, p: pp, rho, pa, T };
    sim.ist.push({ t: pr.tN, u }); while (sim.ist.length > 300) sim.ist.shift();
    if (pr.tN - pr.tL >= 0.5 - 1e-9) { pr.tL = pr.tN; seriala(`U = ${u.toFixed(3)} V  p = ${pp.toFixed(1)} kPa  ρ = ${rho.toFixed(3)} kg/m³  p_atm(BMP280) = ${pa.toFixed(2)} kPa  T = ${T.toFixed(2)} °C`); }
    pr.tN += 0.1;
  }
}
function trimiteSerial(txt) {
  if (!sim.run || !sim.pr) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  seriala(`> ${txt}`);
  if (txt.trim() === "r") seriala("Pentru răspunsul dinamic folosiți „Eliberare rapidă + înregistrare” (pasul 5): comanda „r” și deschiderea supapei se fac împreună.");
}
function resetMega() { if (!sim.run) return; sim.rec = null; seriala("— RESET —"); pornesteProgram(); }

/* ------------------------------------------------------------------ multimetrul */
function vNod(id) { const p = P(); if (!sim.run) return 0; return { tU: MD.uMAP(p, pApp()), t5V: p.vs, tGND: 0 }[id] ?? 0; }
function citesteDMM() {
  const m = sim.dmm.mod, a = sim.dmm.s.dmmR, b = sim.dmm.s.dmmB;
  if (m === "OFF") { sim.dmm.v = null; sim.dmm.txt = ""; sim.dmm.u = ""; return; }
  if (m === "R") { sim.dmm.v = null; sim.dmm.txt = sim.run ? "Err" : "O.L"; sim.dmm.u = sim.run ? "tensiune!" : "MΩ"; return; }
  if (a === "nc" || b === "nc") { sim.dmm.v = 0; sim.dmm.txt = "0.000"; sim.dmm.u = "V DC"; return; }
  const v = Math.round((vNod(a) - vNod(b) + (Math.random() - 0.5) * 0.0006) * 1000) / 1000; sim.dmm.v = v; sim.dmm.txt = v.toFixed(3); sim.dmm.u = "V DC";
}
const TP_OPT = [["nc", "liberă"], ["tU", "TP U MAP (A0)"], ["t5V", "TP 5V"], ["tGND", "TP GND"]];
function dmmCtl() {
  const el = $("#tk-dmm"); if (!el) return;
  el.innerHTML = `<b>Multimetru</b>${[["OFF", "OFF"], ["V", "V⎓"], ["R", "Ω"]].map(([m, t]) => `<button type="button" data-dm="${m}" class="${sim.dmm.mod === m ? "activ" : ""}">${t}</button>`).join("")}
    <label>sonda <span style="color:#d32f2f;font-weight:800">+</span> <select data-ds="dmmR">${TP_OPT.map(([k, t]) => `<option value="${k}"${sim.dmm.s.dmmR === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <label>sonda <b>−</b> <select data-ds="dmmB">${TP_OPT.map(([k, t]) => `<option value="${k}"${sim.dmm.s.dmmB === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <span class="tk-dmm-v" id="dmm-afis"></span>`;
  $$("[data-dm]", el).forEach(b => b.addEventListener("click", () => { sim.dmm.mod = b.dataset.dm; citesteDMM(); dmmCtl(); actualizeaza(); }));
  $$("[data-ds]", el).forEach(s => s.addEventListener("change", () => { sim.dmm.s[s.dataset.ds] = s.value; citesteDMM(); actualizeaza(); }));
}

/* ------------------------------------------------------------------ panoul de comandă (sub standul 3D) și sincronizarea */
function panou() {
  const el = $("#tk-pompa"); if (!el) return;
  el.innerHTML = `<b>Pompa</b><button type="button" data-pm="vid" class="${sim.mod === "vid" ? "activ" : ""}">Vid</button><button type="button" data-pm="pres" class="${sim.mod === "pres" ? "activ" : ""}">Presiune</button>
    <button type="button" data-cs="1" class="primar">Cursă plină</button><button type="button" data-cs="0.25">¼ cursă</button>
    <button type="button" data-lent="1" class="${sim.lent ? "activ" : ""}">Supapa lentă ${sim.lent ? "deschisă" : "închisă"}</button><button type="button" data-rap="1">Eliberare rapidă${sim.run ? " + înregistrare" : ""}</button>
    <span class="sep"></span><b>Coliere</b>${["pompă", "MAP", "etalon"].map((t, i) => `<button type="button" data-col="${i}" class="${sim.coliere[i] && sim.desprins !== i ? "activ" : "slab"}">${t} ${sim.desprins === i ? "⚠ desprins" : sim.coliere[i] ? "✓" : "slăbit"}</button>`).join("")}
    <button type="button" data-och="1" class="${sim.ochelari ? "activ" : ""}">🥽 Ochelari${sim.ochelari ? " ✓" : ""}</button>`;
  $$("[data-pm]", el).forEach(b => b.addEventListener("click", () => { sim.mod = b.dataset.pm; actualizeaza(); }));
  $$("[data-cs]", el).forEach(b => b.addEventListener("click", () => cursaPompa(+b.dataset.cs)));
  $$("[data-lent]", el).forEach(b => b.addEventListener("click", () => { sim.lent = !sim.lent; actualizeaza(); }));
  $$("[data-rap]", el).forEach(b => b.addEventListener("click", eliberareRapida));
  $$("[data-col]", el).forEach(b => b.addEventListener("click", () => comutaColier(+b.dataset.col)));
  $$("[data-och]", el).forEach(b => b.addEventListener("click", () => { sim.ochelari = !sim.ochelari; actualizeaza(); }));
}
function comutaColier(i) {
  if (sim.desprins === i) { sim.desprins = -1; sim.coliere[i] = true; Cadru.mesajTemporar("Furtunul a fost montat la loc și colierul strâns.", ""); }
  else { if (!sim.coliere[i] && false) return; sim.coliere[i] = !sim.coliere[i]; }
  actualizeaza();
}
function afisaje() {
  const p = P(), e = $("#afis");
  if (!e) return;
  const v = sim.pr && sim.pr.last;
  e.innerHTML = `<div><span>Manometru etalon</span><b>${fx(etalonTxt(), 1)} kPa rel.</b></div><div><span>Manometrul pompei</span><b>${fx(pRel() / 100, 2)} bar</b></div>
    <div><span>Multimetru</span><b>${sim.dmm.mod === "OFF" ? "—" : sim.dmm.txt + " " + (sim.dmm.u || "")}</b></div>
    <div><span>OLED</span><b>${sim.run && v ? `U ${v.u.toFixed(3)} V · p ${v.p.toFixed(1)} kPa · ρ ${v.rho.toFixed(3)}` : "—"}</b></div>`;
  const d = $("#dmm-afis"); if (d) d.textContent = sim.dmm.mod === "OFF" ? "" : `${sim.dmm.txt} ${sim.dmm.u}`;
}
function oledTxt() {
  const v = sim.pr && sim.pr.last, f = (x, d, w) => Number.isFinite(x) ? x.toFixed(d).padStart(w, " ") : "—";
  return { titlu: `MAP A=${sim.fw ? sim.fw.A : ""}${sim.rec ? " REC" : ""}`, linii: v ? [`U  ${f(v.u, 3, 6)} V`, `p  ${f(v.p, 1, 6)} kPa`, `rho${f(v.rho, 3, 6)}`, `pa ${f(v.pa, 2, 6)} T${v.T.toFixed(1)}`] : ["pornire..."] };
}
/* ------------------------------------------------------------------ planșa în stilul Tinkercad (schema de conectare a standului) */
const TPL5 = { tU: [600, 640], t5V: [690, 640], tGND: [780, 640] };
const SOND5 = { dmmR: { x0: 846, y0: 330, cul: "#d32f2f", rep: [880, 400] }, dmmB: { x0: 734, y0: 330, cul: "#222", rep: [700, 400] } };
function planseSVG() {
  const W = (pts, c, w, id) => `<path ${id ? `id="${id}" ` : ""}d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const furt = (d, id) => `<path id="${id}" d="${d}" fill="none" stroke="#a9d6ea" stroke-width="11" stroke-linecap="round" opacity=".9"/><path d="${d}" fill="none" stroke="#e9f7fd" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
  const colier = (i, x, y, rot) => `<g data-k="colier${i}" class="tk-comp" transform="translate(${x} ${y}) rotate(${rot})"><rect id="col${i}" x="-9" y="-10" width="18" height="20" rx="3" fill="#cfd5db" stroke="#7d858d" stroke-width="1.5"/><rect x="-3" y="-15" width="6" height="7" rx="1.5" fill="#9aa2aa"/></g>`;
  let s = `<svg id="tk-svg" viewBox="0 -14 1300 814" role="img" aria-label="Planșa: pompa de vid / presiune, teul, manometrul etalon, senzorul MAP, placa de test cu BMP280, Arduino Mega cu OLED, multimetrul">
<defs><filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter>
 <pattern id="tk-gauri" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#f3f3f1"/><rect x="3.5" y="3.5" width="3" height="3" fill="#b9b9b5"/></pattern>
 <linearGradient id="gAlu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7eb"/><stop offset="1" stop-color="#9aa2aa"/></linearGradient>
 <linearGradient id="gAlama" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d77a"/><stop offset="1" stop-color="#a87c1c"/></linearGradient></defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb" id="tk-fundal"/>`;
  /* ---- pompa manuală de vid / presiune cu manometru */
  s += `<g data-k="pompa" class="tk-comp" filter="url(#umbra)"><path d="M40,150 Q40,118 72,118 L250,118 Q282,118 282,150 L282,176 Q282,206 250,206 L72,206 Q40,206 40,176z" fill="#c62828"/>
    <path d="M70,206 L120,330 Q126,346 142,340 L168,330 Q178,324 172,310 L140,206z" fill="#2b2f35"/><path d="M150,206 L210,318 Q216,332 230,326 L246,318 Q256,312 250,300 L200,206z" fill="#455a64"/>
    <text x="70" y="146" font-size="12" fill="#fff" font-weight="700">POMPĂ DE VID / PRESIUNE</text><text x="70" y="162" font-size="10" fill="#ffd8d8">clic = o cursă</text></g>`;
  s += `<g data-k="pompa" class="tk-comp" filter="url(#umbra)"><circle cx="205" cy="74" r="58" fill="#e9ecef" stroke="#555" stroke-width="3"/><circle cx="205" cy="74" r="50" fill="#fbfbf7"/>
    ${Array.from({ length: 21 }, (_, i) => { const a = (-135 + i * 13.5) * Math.PI / 180, r1 = 48, r2 = i % 5 === 0 ? 38 : 43; return `<line x1="${205 + r1 * Math.sin(a)}" y1="${74 - r1 * Math.cos(a)}" x2="${205 + r2 * Math.sin(a)}" y2="${74 - r2 * Math.cos(a)}" stroke="#222" stroke-width="${i % 5 ? 1 : 2}"/>`; }).join("")}
    ${[["−1", -135], ["−0,5", -67.5], ["0", 0], ["0,5", 67.5], ["1", 135]].map(([t, a]) => `<text x="${205 + 29 * Math.sin(a * Math.PI / 180)}" y="${78 - 29 * Math.cos(a * Math.PI / 180)}" font-size="9" text-anchor="middle" fill="#222">${t}</text>`).join("")}
    <text x="205" y="104" font-size="8" text-anchor="middle" fill="#666">bar</text><line id="pm-ac" x1="205" y1="74" x2="205" y2="30" stroke="#c62828" stroke-width="3" stroke-linecap="round"/><circle cx="205" cy="74" r="5" fill="#222"/></g>`;
  s += `<g data-k="selector" class="tk-comp"><rect x="96" y="96" width="62" height="22" rx="5" fill="#f2b705" stroke="#a37a00"/><text id="pm-sel" x="127" y="111" font-size="11" text-anchor="middle" fill="#222" font-weight="800">VID</text></g>
    <g data-k="lent" class="tk-comp"><circle cx="300" cy="140" r="13" fill="url(#gAlu)" stroke="#666"/><circle id="pm-lent" cx="300" cy="140" r="5" fill="#666"/><text x="300" y="168" font-size="9" text-anchor="middle" fill="#444">supapă lentă</text></g>
    <g data-k="rapid" class="tk-comp"><circle cx="300" cy="196" r="12" fill="#1e63d6" stroke="#0d3b8a"/><text x="300" y="222" font-size="9" text-anchor="middle" fill="#444">eliberare rapidă</text></g>`;
  /* ---- furtunurile, teul, colierele */
  s += furt("M282,162 C330,162 360,162 412,162", "fu0") + furt("M452,162 C500,162 520,150 548,150", "fu1") + furt("M432,182 C432,220 432,240 432,262", "fu2");
  s += `<g data-k="tee" class="tk-comp" filter="url(#umbra)"><rect x="410" y="148" width="44" height="28" rx="4" fill="url(#gAlama)" stroke="#7a5a10"/><rect x="420" y="170" width="24" height="18" rx="3" fill="url(#gAlama)" stroke="#7a5a10"/><text x="432" y="140" font-size="10" text-anchor="middle" fill="#555">teu de alamă</text></g>`;
  s += colier(0, 296, 162, 90) + colier(2, 432, 256, 0);
  /* ---- manometrul etalon digital */
  s += `<g data-k="etalon" class="tk-comp" filter="url(#umbra)"><rect x="352" y="262" width="160" height="150" rx="12" fill="#2b2f35"/><rect x="368" y="284" width="128" height="52" rx="4" fill="#bfd0b0" stroke="#111"/><text id="et-v" x="488" y="320" font-size="24" fill="#1d2414" text-anchor="end" font-family="ui-monospace,monospace" font-weight="700">0.0</text><text x="374" y="296" font-size="8" fill="#1d2414">kPa rel.</text>
    <text x="432" y="362" font-size="11" text-anchor="middle" fill="#e6ebf0" font-weight="700">Manometru etalon</text><text x="432" y="378" font-size="9" text-anchor="middle" fill="#aab4be">−100…+200 kPa · 0,1 kPa</text></g>`;
  /* ---- senzorul MAP pe colțarul de aluminiu */
  s += `<g data-k="map" class="tk-comp" filter="url(#umbra)"><rect x="540" y="80" width="150" height="14" rx="2" fill="url(#gAlu)" stroke="#7c848c"/><rect x="676" y="80" width="14" height="150" rx="2" fill="url(#gAlu)" stroke="#7c848c"/>
    <rect x="548" y="118" width="110" height="64" rx="10" fill="#1f2226"/><rect x="540" y="140" width="14" height="20" rx="3" fill="#1f2226"/><circle cx="572" cy="132" r="5" fill="url(#gAlu)" stroke="#333"/><circle cx="636" cy="168" r="5" fill="url(#gAlu)" stroke="#333"/>
    <rect x="610" y="182" width="40" height="26" rx="3" fill="#2b2f35"/>${[0, 1, 2].map(k => `<rect x="${617 + k * 10}" y="200" width="5" height="6" fill="#c9a227"/>`).join("")}
    <text x="603" y="152" font-size="11" text-anchor="middle" fill="#e6ebf0" font-weight="800">MAP</text><text x="603" y="166" font-size="8" text-anchor="middle" fill="#9aa">2,5 bar abs.</text></g>`;
  s += colier(1, 540, 150, 90);   // după racordul senzorului MAP, ca să rămână accesibil la clic
  /* ---- multimetrul */
  s += `<g data-k="dmm" class="tk-comp" filter="url(#umbra)"><rect x="700" y="36" width="190" height="300" rx="18" fill="#f2b705"/><rect x="712" y="48" width="166" height="276" rx="12" fill="#3b3f45"/>
    <rect x="726" y="62" width="138" height="58" rx="5" fill="#bfd0b0" stroke="#222" stroke-width="2"/><text id="dmm5-v" x="856" y="102" font-size="26" fill="#1d2414" text-anchor="end" font-family="ui-monospace,monospace" font-weight="700"></text><text id="dmm5-u" x="858" y="115" font-size="9" fill="#1d2414" text-anchor="end"></text>
    <text x="795" y="300" font-size="10" fill="#ddd" text-anchor="middle">Multimetru</text>
    <circle cx="734" cy="322" r="8" fill="#111" stroke="#999"/><circle cx="846" cy="322" r="8" fill="#d32f2f" stroke="#999"/></g>
    <g data-k="dmmKnob" class="tk-comp"><circle cx="795" cy="200" r="46" fill="#2a2d31" stroke="#666"/><g id="dmm5-k"><circle cx="795" cy="200" r="30" fill="#4a4f56" stroke="#111"/><rect x="791" y="164" width="8" height="30" rx="3" fill="#f2b705"/></g>
    ${[["OFF", -60], ["V⎓", 0], ["Ω", 60]].map(([t, a]) => `<text x="${795 + 58 * Math.sin(a * Math.PI / 180)}" y="${204 - 58 * Math.cos(a * Math.PI / 180)}" font-size="11" text-anchor="middle" fill="#fff" font-weight="700">${t}</text>`).join("")}</g>`;
  /* ---- OLED, cronometrul, ochelarii */
  s += `<g data-k="oled" class="tk-comp" filter="url(#umbra)"><rect x="930" y="40" width="200" height="176" rx="6" fill="#16337a" stroke="#0b1d48"/>${["GND", "VCC", "SCL", "SDA"].map((t, i) => `<rect x="${992 + i * 14}" y="46" width="6" height="8" fill="#c9a227"/><text x="${995 + i * 14}" y="64" font-size="6" fill="#fff" text-anchor="middle">${t}</text>`).join("")}
    <rect x="938" y="72" width="184" height="118" rx="3" fill="#050608" stroke="#333"/><g id="oled5" font-family="ui-monospace,Consolas,monospace"></g><text x="1030" y="206" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED 0,96" SSD1306 · I²C</text></g>`;
  s += `<g data-k="ceas" class="tk-comp" filter="url(#umbra)"><rect x="1150" y="40" width="130" height="82" rx="8" fill="#3b3f45"/><rect x="1160" y="50" width="110" height="40" rx="4" fill="#0f1a12"/><text id="ceas5" x="1215" y="78" font-size="20" text-anchor="middle" fill="#7dff8a" font-family="ui-monospace,monospace">00:00</text><text id="ceas5p" x="1215" y="110" font-size="8.5" text-anchor="middle" fill="#ddd"></text></g>
    <g data-k="ochelari" class="tk-comp"><rect x="1156" y="150" width="112" height="72" fill="transparent"/><path d="M1160,170 q20,-26 44,0 q8,6 16,0 q24,-26 44,0 l0,14 q-22,26 -44,0 q-8,-6 -16,0 q-22,26 -44,0z" fill="#cfe8ff" stroke="#555" stroke-width="2" opacity=".9"/><text id="och5" x="1215" y="214" font-size="10" text-anchor="middle" fill="#444" font-weight="700">ochelari: nu</text></g>`;
  /* ---- placa de test cu BMP280 și punctele de test */
  s += `<g data-k="bb" class="tk-comp" filter="url(#umbra)"><rect x="440" y="440" width="460" height="230" rx="6" fill="url(#tk-gauri)" stroke="#d2d2cc"/><line x1="450" y1="448" x2="890" y2="448" stroke="#e53935" stroke-width="1.5"/><line x1="450" y1="470" x2="890" y2="470" stroke="#1e63d6" stroke-width="1.5"/><text x="452" y="663" font-size="8" fill="#999">placă de test</text></g>`;
  s += `<g data-k="bmp" class="tk-comp" filter="url(#umbra)"><rect x="470" y="500" width="78" height="64" rx="4" fill="#5b2c8f"/><rect x="498" y="520" width="18" height="18" rx="2" fill="#c9cdd2"/><circle cx="507" cy="529" r="2" fill="#333"/><text x="509" y="556" font-size="8" fill="#fff" text-anchor="middle">BMP280</text>${[0, 1, 2, 3].map(k => `<rect x="${478 + k * 16}" y="494" width="6" height="8" fill="#c9a227"/>`).join("")}</g>`;
  s += Object.entries(TPL5).map(([k, [x, y]]) => `<g data-k="${k}" class="tk-comp"><circle cx="${x}" cy="${y}" r="12" fill="${k === "tGND" ? "#111" : k === "t5V" ? "#c62828" : "#f2f2f2"}" stroke="#000"/><circle cx="${x}" cy="${y}" r="5" fill="url(#gAlama)"/><text x="${x}" y="${y - 18}" font-size="9.5" text-anchor="middle" fill="#333" font-weight="700">${{ tU: "TP U MAP", t5V: "TP 5V", tGND: "TP GND" }[k]}</text></g>`).join("");
  /* ---- Arduino Mega 2560 */
  const MX = 940, MY = 430, H = i => [MX + 64 + i * 11.2, MY + 222];
  s += `<g data-k="mega" class="tk-comp" filter="url(#umbra)"><rect x="${MX}" y="${MY}" width="340" height="232" rx="8" fill="#00878f" stroke="#005a60"/>
    <rect x="${MX - 14}" y="${MY + 30}" width="46" height="40" rx="3" fill="url(#gAlu)" stroke="#666"/><rect x="${MX - 8}" y="${MY + 150}" width="40" height="36" rx="4" fill="#1b1b1b"/>
    <g transform="translate(${MX + 200} ${MY + 118}) rotate(45)"><rect x="-30" y="-30" width="60" height="60" rx="2" fill="#262626"/></g><text x="${MX + 200}" y="${MY + 121}" font-size="7" fill="#bbb" text-anchor="middle" font-family="monospace">ATMEGA2560</text>
    <rect x="${MX + 60}" y="${MY + 6}" width="270" height="12" rx="1.5" fill="#202020"/><rect x="${MX + 58}" y="${MY + 216}" width="${26 * 11.2}" height="12" rx="1.5" fill="#202020"/>
    ${["IOREF", "RESET", "3.3V", "5V", "GND", "GND", "Vin", "", "A0", "A1", "A2", "A3"].map((t, i) => t ? `<text x="${H(i)[0]}" y="${MY + 210}" font-size="5.5" fill="#fff" text-anchor="end" transform="rotate(-90 ${H(i)[0]} ${MY + 210})">${t}</text>` : "").join("")}
    <text x="${MX + 250}" y="${MY + 70}" font-size="13" fill="#e8ffff" font-weight="800">ARDUINO</text><text x="${MX + 250}" y="${MY + 86}" font-size="11" fill="#e8ffff">MEGA 2560</text>
    <rect id="ledL" x="${MX + 92}" y="${MY + 40}" width="8" height="5" fill="#5a4a1a"/><text x="${MX + 104}" y="${MY + 45}" font-size="6" fill="#fff">L</text><rect id="ledTX" x="${MX + 92}" y="${MY + 52}" width="8" height="5" fill="#5a4a1a"/><text x="${MX + 104}" y="${MY + 57}" font-size="6" fill="#fff">TX</text><rect id="ledON" x="${MX + 92}" y="${MY + 64}" width="8" height="5" fill="#1a3a1a"/><text x="${MX + 104}" y="${MY + 69}" font-size="6" fill="#fff">ON</text></g>
    <g data-k="rst" class="tk-comp"><rect x="${MX + 46}" y="${MY + 92}" width="18" height="18" rx="2" fill="#ccc" stroke="#555"/><circle cx="${MX + 55}" cy="${MY + 101}" r="5.5" fill="#c62828"/><text x="${MX + 55}" y="${MY + 122}" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">RESET</text></g>
    <path id="usb5" d="M${MX - 14},${MY + 50} C${MX - 60},${MY + 50} ${MX - 50},${MY - 30} ${MX - 10},${MY - 50}" fill="none" stroke="#bbb" stroke-width="6"/>`;
  /* ---- firele: senzorul MAP, BMP280, punctele de test, OLED */
  const hx = k => MX + 64 + k * 9.5;
  s += `<g style="pointer-events:none">
    ${W([[619, 206], [619, 420], [520, 420], [520, 448]], "#e53935", 3)}${W([[629, 206], [629, 412], [540, 412], [540, 470]], "#222", 3)}${W([[639, 206], [639, 404], [600, 404], [600, 628]], "#2fa84f", 3)}
    ${W([[H(3)[0], H(3)[1] + 6], [H(3)[0], 700], [470, 700], [470, 448], [460, 448]], "#e53935", 3)}${W([[H(4)[0], H(4)[1] + 6], [H(4)[0], 712], [458, 712], [458, 470], [450, 470]], "#222", 3)}
    ${W([[600, 652], [600, 724], [H(8)[0], 724], [H(8)[0], H(8)[1] + 6]], "#f2c230", 3)}${W([[690, 652], [690, 664], [700, 664], [700, 448]], "#c62828", 1.6)}${W([[780, 652], [780, 664], [800, 664], [800, 470]], "#222", 1.6)}
    ${W([[481, 494], [481, 448]], "#e53935", 2.4)}${W([[497, 494], [497, 470]], "#222", 2.4)}${W([[513, 494], [513, 482], [hx(26), 482], [hx(26), MY + 12]], "#1e88e5", 2.4)}${W([[529, 494], [529, 488], [hx(25), 488], [hx(25), MY + 12]], "#43a047", 2.4)}
    ${[0, 1, 2, 3].map(k => W([[995 + k * 14, 54], [995 + k * 14, 26 - k * 4], [1138 + k * 5, 26 - k * 4], [1138 + k * 5, 400 + k * 5], [k < 2 ? H(4 - k)[0] : hx(26 - k + 2), 400 + k * 5], [k < 2 ? H(4 - k)[0] : hx(26 - k + 2), k < 2 ? MY + 216 : MY + 12]], ["#222", "#e53935", "#1e88e5", "#43a047"][k], 2)).join("")}</g>`;
  s += `<g id="sonde5" style="pointer-events:none"></g><text id="tk-av" x="190" y="440" text-anchor="middle" font-size="12" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
function planseAfis() {
  if (!$("#tk-svg")) return;
  const a = Math.max(-135, Math.min(135, pRel() / 100 * 135)) * Math.PI / 180; $("#pm-ac").setAttribute("x2", (205 + 44 * Math.sin(a)).toFixed(1)); $("#pm-ac").setAttribute("y2", (74 - 44 * Math.cos(a)).toFixed(1));
  $("#pm-sel").textContent = sim.mod === "vid" ? "VID" : "PRES."; $("#pm-lent").setAttribute("fill", sim.lent ? "#2e9e44" : "#666");
  [0, 1, 2].forEach(i => { const c = $("#col" + i), ok = sim.coliere[i] && sim.desprins !== i; c.setAttribute("fill", sim.desprins === i ? "#ff5252" : ok ? "#cfd5db" : "#ffb74d"); const f = $("#fu" + i); if (f) f.setAttribute("stroke-dasharray", sim.desprins === i ? "6 8" : ""); });
  $("#et-v").textContent = sim.desprins === 2 ? "0.0" : etalonTxt().toFixed(1);
  $("#dmm5-v").textContent = sim.dmm.mod === "OFF" ? "" : sim.dmm.txt; $("#dmm5-u").textContent = sim.dmm.mod === "OFF" ? "" : sim.dmm.u;
  $("#dmm5-k").setAttribute("transform", `rotate(${{ OFF: -60, V: 0, R: 60 }[sim.dmm.mod]} 795 200)`);
  const o = sim.run ? oledTxt() : null; $("#oled5").innerHTML = o ? `<text x="944" y="90" font-size="12" fill="#ffd400">${esc(o.titlu)}</text>` + o.linii.map((l, i) => `<text x="944" y="${114 + i * 18}" font-size="13" fill="#5fd3ff">${esc(l)}</text>`).join("") : "";
  const mm = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`; $("#ceas5").textContent = mm(sim.tS); $("#ceas5p").textContent = sim.viteza > 1 ? "timp ×" + sim.viteza : "timp real";
  $("#och5").textContent = sim.ochelari ? "ochelari: purtați ✓" : "ochelari: nu";
  $("#ledON").setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a"); $("#ledTX").setAttribute("fill", sim.run && performance.now() - sim.tx < 80 ? "#ffd04a" : "#5a4a1a"); $("#ledL").setAttribute("fill", sim.rec ? "#ffd04a" : "#5a4a1a"); $("#usb5").setAttribute("stroke", sim.run ? "#222" : "#bbb");
  $("#sonde5").innerHTML = Object.entries(SOND5).map(([k, d]) => { const t = TPL5[sim.dmm.s[k]] || d.rep, cy = Math.max(d.y0, t[1]) + 40;
    return `<path d="M${d.x0},${d.y0} C${d.x0},${cy} ${t[0]},${cy} ${t[0]},${t[1] + 6}" fill="none" stroke="${d.cul}" stroke-width="3.2"/><rect x="${t[0] - 4}" y="${t[1] - 30}" width="8" height="30" rx="3" fill="${d.cul}"/><line x1="${t[0]}" y1="${t[1]}" x2="${t[0]}" y2="${t[1] + 8}" stroke="#aaa" stroke-width="2"/>`; }).join("");
  $("#tk-av").textContent = sim.desprins >= 0 ? "⚠ furtun desprins – clic pe colierul lui" : !strans() ? "colier slăbit – strângeți-l înainte de presiune" : "";
}
function sincron3d() {
  if (!SV3 && Cadru.anim && Cadru.anim.seteaza) SV3 = Cadru.anim;
  if (!SV3) return;
  const mm = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  SV3.seteaza({ prel: pRel(), etalon: etalonTxt().toFixed(1), mod: sim.mod, lent: sim.lent, coliere: sim.coliere.map((c, i) => c && sim.desprins !== i), desprins: sim.desprins, ochelari: sim.ochelari,
    run: sim.run, rec: !!sim.rec, tx: sim.run && performance.now() - sim.tx < 80, oled: sim.run ? oledTxt() : null,
    dmm: { mod: sim.dmm.mod, txt: sim.dmm.txt, u: sim.dmm.u, r: sim.dmm.s.dmmR, b: sim.dmm.s.dmmB }, ceas: mm(sim.tS), ceasP: sim.etans && !sim.etans.gata ? `test etanșeitate ${fx(sim.tS - sim.etans.t0, 0)} s` : (sim.viteza > 1 ? "timp ×" + sim.viteza : "timp real") });
}
function actualizeaza() { citesteDMM(); panou(); afisaje(); planseAfis(); sincron3d(); actualizeazaPasi(); }
function laClic3d(k) {
  if (k === "pompa") return cursaPompa(sim.frac);
  if (k === "selector") { sim.mod = sim.mod === "vid" ? "pres" : "vid"; return actualizeaza(); }
  if (k === "lent") { sim.lent = !sim.lent; return actualizeaza(); }
  if (k === "rapid") return eliberareRapida();
  if (/^colier\d$/.test(k)) return comutaColier(+k.slice(6));
  if (k === "ochelari") { sim.ochelari = !sim.ochelari; return actualizeaza(); }
  if (k === "rst") return resetMega();
  if (k === "dmmKnob") { sim.dmm.mod = { OFF: "V", V: "R", R: "OFF" }[sim.dmm.mod]; dmmCtl(); return actualizeaza(); }
  if (["tU", "t5V", "tGND"].includes(k)) { sim.dmm.s[k === "tGND" ? "dmmB" : "dmmR"] = k; dmmCtl(); return actualizeaza(); }
  inspector(k);
}
const INSP = {
  map: () => ["Senzorul MAP", [["Tip", "presiune absolută, 2,5 bar (20…250 kPa)"], ["Ieșire", "0,4…4,65 V, ratiometric la 5 V"], ["Conector", "+5 V · masă · semnal"]]],
  etalon: () => ["Manometrul etalon digital", [["Mărime", "presiune relativă (față de atmosferă)"], ["Domeniu", "−100…+200 kPa"], ["Rezoluție", "0,1 kPa"], ["Indicație", fx(etalonTxt(), 1) + " kPa"]]],
  tee: () => ["Teu de alamă", [["Rol", "leagă pompa, senzorul MAP și manometrul etalon"]]],
  bmp: () => ["BMP280", [["Mărimi", "presiunea atmosferică (±0,12 hPa relativ) și temperatura"], ["Magistrală", "I²C 0x76 (SDA 20, SCL 21)"]]],
  bb: () => ["Placa de test", [["TP U MAP", "semnalul senzorului (A0)"], ["TP 5V / GND", "alimentarea senzorului de la placă"]]],
  mega: () => ["Arduino Mega 2560", [["ADC", "10 biți, referința = 5 V al plăcii"], ["Alimentare", sim.run ? "USB (pornit)" : "oprită"]]],
  oled: () => ["OLED SSD1306", [["Conținut", "U, p calculat, ρ, p<sub>atm</sub>, T"]]],
  dmm: () => ["Multimetru", [["Mod", { OFF: "oprit", V: "V c.c.", R: "ohmmetru" }[sim.dmm.mod]]]],
  ceas: () => ["Cronometru", [["Timp simulat", fx(sim.tS, 1) + " s"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}

/* ------------------------------------------------------------------ plotterul */
function plotter() {
  const cv = $("#tk-plot"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const rec = sim.vedere === "rec" && sim.inreg; let pts, t0, t1;
  if (rec) { pts = sim.inreg.s.map((u, i) => [i * 10, u]); t0 = 0; t1 = 990; }
  else { const ist = sim.ist; t1 = ist.length ? ist[ist.length - 1].t : 30; t0 = t1 - 30; pts = ist.filter(e => e.t >= t0).map(e => [e.t, e.u]); }
  let mn = Math.min(...pts.map(p => p[1]), Infinity), mx = Math.max(...pts.map(p => p[1]), -Infinity);
  if (!isFinite(mn)) { mn = 0; mx = 5; } if (mx - mn < 0.2) { const c = (mx + mn) / 2; mn = c - 0.1; mx = c + 0.1; } const pad = (mx - mn) * 0.08; mn -= pad; mx += pad;
  const L = 42, R = 8, T = 8, B = 20, X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = v => T + (mx - v) / (mx - mn) * (H - T - B);
  g.font = "10px system-ui"; g.fillStyle = "#666"; g.strokeStyle = "#eee";
  const py = (mx - mn) > 2 ? 0.5 : (mx - mn) > 0.6 ? 0.2 : 0.05;
  for (let v = Math.ceil(mn / py) * py; v <= mx; v += py) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke(); g.fillText(v.toFixed(2), 4, Y(v) + 3); }
  const px = rec ? 100 : 5; for (let t = Math.ceil(t0 / px) * px; t <= t1; t += px) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), H - B); g.stroke(); g.fillText(rec ? t + " ms" : (t - (sim.pr ? sim.pr.t0 : 0)).toFixed(0) + " s", X(t) - 10, H - 6); }
  g.strokeStyle = "#2e7d32"; g.lineWidth = 1.6; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
  if (rec) { const c = MD.treceri(sim.inreg.s); g.setLineDash([4, 3]); [["90 %", c.u90, "#c62828"], ["10 %", c.u10, "#1565c0"]].forEach(([t, u, cl]) => { g.strokeStyle = cl; g.beginPath(); g.moveTo(L, Y(u)); g.lineTo(W - R, Y(u)); g.stroke(); g.fillStyle = cl; g.fillText(t, W - R - 30, Y(u) - 3); }); g.setLineDash([]);
    [["t90", "#c62828"], ["t10", "#1565c0"]].forEach(([k, cl]) => { const t = sim.cur[k]; g.strokeStyle = cl; g.lineWidth = sim.cur.k === k ? 2 : 1; g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), H - B); g.stroke(); g.fillStyle = cl; g.beginPath(); g.arc(X(t), Y(sim.inreg.s[Math.round(t / 10)]), 3.5, 0, 7); g.fill(); }); }
  g.fillStyle = "#888"; g.fillText(rec ? "eliberarea bruscă (eșantioane la 10 ms)" : "U [V] – live (ultimele 30 s)", L + 6, T + 9);
}
function comutaVedere() { $$("[data-ved]").forEach(b => b.classList.toggle("activ", b.dataset.ved === sim.vedere)); cursorAfis(); }
function cursorAfis() {
  const el = $("#cur-info"); if (!el) return;
  if (!sim.inreg) { el.innerHTML = "Nicio eliberare înregistrată."; return; }
  const s = sim.inreg.s, c = MD.treceri(s), t = sim.cur[sim.cur.k], u = s[Math.round(t / 10)];
  el.innerHTML = `U<sub>0</sub> = ${fx(c.u0, 3)} V, U<sub>∞</sub> = ${fx(c.uInf, 3)} V → U<sub>90</sub> = ${fx(c.u90, 3)} V, U<sub>10</sub> = ${fx(c.u10, 3)} V<br>cursor ${sim.cur.k === "t90" ? "90 %" : "10 %"}: t = <b>${t} ms</b>, U = <b>${fx(u, 4)} V</b> · t<sub>90</sub> = ${sim.cur.t90} ms, t<sub>10</sub> = ${sim.cur.t10} ms → Δt = <b>${sim.cur.t10 - sim.cur.t90} ms</b>`;
  const r = $("#cur-t"); if (r) r.value = t;
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregPatm(e) {
  if (!sim.run || !sim.pr || !sim.pr.last) return Cadru.mesajTemporar("Porniți simularea (programul citește BMP280).", "atentie");
  const p = P(), v = MD.bmpP(p), T = MD.bmpT(p);
  const ok = Cadru.inregistreaza(e, { log: { m: "patm", v, T }, celule: [{ t: "t52", r: "patm", c: "v", v: v.toFixed(2) }] });
  if (ok) msg(`Tabelul 5.2: p_atm (BMP280) = ${fx(v, 2)} kPa (T aer = ${fx(T, 2)} °C).`);
}
function inregPt(e) {
  if (!sim.run) return Cadru.mesajTemporar("Porniți simularea: senzorul MAP este alimentat din 5 V al plăcii.", "atentie");
  if (!strans()) return Cadru.mesajTemporar("Strângeți toate colierele (montajul trebuie să fie etanș).", "atentie");
  if (sim.dmm.mod !== "V" || sim.dmm.s.dmmR !== "tU" || sim.dmm.s.dmmB !== "tGND") return Cadru.mesajTemporar("Multimetrul pe V⎓, sonda + pe TP U MAP, sonda − pe TP GND.", "atentie");
  if (!stabil()) return Cadru.mesajTemporar("Așteptați stabilizarea presiunii (după o cursă a pompei aerul se încălzește / răcește câteva secunde) și închideți supapa.", "atentie");
  const prel = etalonTxt(), U = sim.dmm.v; let k = -1, dm = 7;
  MD.TINTE.forEach((t, i) => { const d = Math.abs(prel - t); if (d < dm) { dm = d; k = i + 1; } });
  if (k < 0) return Cadru.mesajTemporar(`Presiunea relativă trebuie să fie aproape de una dintre treptele ${MD.TINTE.join(", ")} kPa (±6 kPa). Acum: ${fx(prel, 1)} kPa.`, "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "pt", k, prel, U }, celule: [{ t: "t51", r: "p" + k, c: "prel", v: prel.toFixed(1) }, { t: "t51", r: "p" + k, c: "u", v: U.toFixed(3) }] });
  if (ok) msg(`Tabelul 5.1, punctul ${k}: p relativ = ${fx(prel, 1)} kPa, U = ${fx(U, 3)} V.`);
}
function inregTr(e) {
  const r = sim.inreg; if (!r) return Cadru.mesajTemporar("Faceți întâi eliberarea rapidă cu înregistrare (programul pornit, |p rel| ≥ 40 kPa).", "atentie");
  const c = MD.treceri(r.s);
  if (sim.cur.t90 !== c.t90 || sim.cur.t10 !== c.t10) return Cadru.mesajTemporar("Puneți cursorul 90 % pe primul eșantion care trece de U90 și cursorul 10 % pe primul eșantion care trece de U10.", "atentie");
  const log = []; if (!r.logat) log.push({ m: "tr", s: r.s, p0: r.p0, nr: r.nr }); log.push({ m: "t9", t90: sim.cur.t90, t10: sim.cur.t10, nr: r.nr });
  const ok = Cadru.inregistreaza(e, { log, celule: [{ t: "t52", r: "tr", c: "v", v: String(sim.cur.t10 - sim.cur.t90) }] });
  if (ok) { r.logat = true; msg(`Tabelul 5.2: timpul de răspuns (90 % → 10 %) = ${sim.cur.t10 - sim.cur.t90} ms.`); }
}
function inregPg(e) {
  if (!sim.run || !sim.pr || !sim.pr.last) return Cadru.mesajTemporar("Porniți simularea cu parametrii calibrării în program.", "atentie");
  if (Math.abs(sim.fw.A - 0.01851) < 1e-9 && Math.abs(sim.fw.B - 0.0246) < 1e-9) return Cadru.mesajTemporar("Introduceți în program A și B din calibrarea voastră (Tabelul 5.2), nu valorile din exemplu (opriți simularea, modificați, porniți).", "atentie");
  if (!strans() || !stabil()) return Cadru.mesajTemporar("Montaj etanș și presiune stabilizată.", "atentie");
  const prel = etalonTxt(), pabs = MD.bmpP(P()) + prel, k = Math.abs(prel) < 1 ? "atm" : pabs >= 25 && pabs <= 45 ? "ral" : pabs >= 150 && pabs <= 195 ? "sup" : null;
  if (!k) return Cadru.mesajTemporar("Regimurile: ralanti ≈ 25…45 kPa absolut, presiunea atmosferică (supapa deschisă) sau supraalimentat ≈ 150…195 kPa absolut.", "atentie");
  const v = sim.pr.last, pE = Math.round((MD.bmpP(P()) + prel) * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "pg", k, pE, pP: Math.round(v.p * 10) / 10, rho: Math.round(v.rho * 1000) / 1000, T: Math.round(v.T * 100) / 100, A: sim.fw.A, B: sim.fw.B },
    celule: [{ t: "t53", r: k, c: "pE", v: pE.toFixed(1) }, { t: "t53", r: k, c: "pP", v: v.p.toFixed(1) }, { t: "t53", r: k, c: "T", v: v.T.toFixed(2) }, { t: "t53", r: k, c: "rho", v: v.rho.toFixed(3) }] });
  if (ok) msg(`Tabelul 5.3 (${MD.PG[k].et.replace(/<[^>]+>/g, "")}): p etalon = ${fx(pE, 1)} kPa, p program = ${fx(v.p, 1)} kPa, ρ = ${fx(v.rho, 3)} kg/m³.`);
}
function testEtans() {
  if (!strans()) return Cadru.mesajTemporar("Strângeți colierele.", "atentie");
  if (pRel() > -40) return Cadru.mesajTemporar("Pentru test faceți vid de cel puțin −40 kPa (pompa pe „Vid”).", "atentie");
  if (!stabil()) return Cadru.mesajTemporar("Așteptați câteva secunde stabilizarea după ultima cursă (și închideți supapa).", "atentie");
  sim.etans = { t0: sim.tS, p0: etalonTxt(), gata: false }; Cadru.mesajTemporar("Test de etanșeitate: urmăriți manometrul etalon 60 s (puteți accelera timpul).", "");
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const ctlVit = () => `<div class="rand-mic"><span class="nota" style="align-self:center">Timp:</span>${[1, 10, 30].map(v => `<button type="button" data-vit="${v}" class="${sim.viteza === v ? "activ" : ""}">×${v}</button>`).join("")}</div>`;
const PASI = [
  { t: "p<sub>atm</sub> și etanșeitatea", tab: "Tabelul 5.2 – p<sub>atm</sub>", v3: "pneu",
    banda: "Pasul 1 · Ochelarii, colierele strânse; programul pornit citește presiunea atmosferică cu BMP280. Testul de etanșeitate: vid de ≈ −50 kPa, apoi 60 s fără pompare.",
    instr: [`Dați clic pe <b>ochelarii de protecție</b> și pe cele <b>trei coliere</b> ale furtunurilor (sau pe butoanele de sub stand) – colierele se strâng.`, `Apăsați <b>▶ Pornește simularea</b>: BMP280 afișează presiunea atmosferică pe OLED.`, `Apăsați <b>„● p<sub>atm</sub> (BMP280) → Tabelul 5.2”</b>.`, `Dați clic pe selectorul galben al pompei până la <b>Vid</b>, apoi dați clic pe pompă (fiecare clic = o cursă) până la ≈ −50 kPa pe manometrul etalon.`, `Apăsați <b>Test de etanșeitate (60 s)</b> și urmăriți etalonul: scăderea admisă este sub 0,5 kPa în 60 s.`],
    ctl: () => `<div class="rand-mic"><button type="button" data-et="1">Test de etanșeitate (60 s)</button></div>${ctlVit()}`,
    ver: () => [[sim.ochelari, "ochelarii puși"], [strans(), "colierele strânse"], [sim.run, "programul rulează"], [!!(sim.etans && sim.etans.gata && sim.etans.ok), sim.etans && sim.etans.gata ? `etanșeitate: ${fx(sim.etans.dp, 2)} kPa în 60 s` : "testul de etanșeitate"]],
    prog: () => (pe("t52", "patm", "v") ? 1 : 0) + (sim.etans && sim.etans.ok ? 1 : 0), tot: 2,
    butoane: [["● p<sub>atm</sub> (BMP280) → Tabelul 5.2", inregPatm, "primar"]] },
  { t: "U la presiunea atmosferică", tab: "Tabelul 5.1 – punctul 4", v3: "placa",
    banda: "Pasul 2 · Supapa deschisă (presiune relativă 0), multimetrul V⎓: sonda − pe TP GND, sonda + pe TP U MAP.",
    instr: [`Dați clic pe <b>supapa lentă</b> până când manometrul etalon arată <b>0,0 kPa</b>, apoi închideți-o.`, `Comutatorul multimetrului pe <b>V⎓</b>; sonda <b>+</b> pe <b>TP U MAP</b>, sonda <b>−</b> pe <b>TP GND</b>.`, `Apăsați <b>„● p (etalon), U (multimetru) → Tabelul 5.1”</b>.`],
    ctl: () => "",
    ver: () => [[sim.run, "senzorul alimentat"], [sim.dmm.mod === "V" && sim.dmm.s.dmmR === "tU" && sim.dmm.s.dmmB === "tGND", "multimetrul pe U MAP / GND"], [Math.abs(etalonTxt()) < 0.6, "presiunea relativă ≈ 0"]],
    prog: () => pe("t51", "p4", "u") ? 1 : 0, tot: 1,
    butoane: [["● p (etalon), U (multimetru) → Tabelul 5.1", inregPt, "primar"]] },
  { t: "Vid în trepte", tab: "Tabelul 5.1 – punctele 1…3", v3: "pneu",
    banda: "Pasul 3 · Pompa pe Vid: curse (plină sau ¼) până la −30, −50, −70 kPa relativ (±6 kPa); după fiecare treaptă așteptați stabilizarea și înregistrați.",
    instr: [`Selectorul pompei pe <b>Vid</b>. Dați clic pe pompă (curse pline sau ¼) până aproape de <b>−30 kPa</b>; ajustați fin cu supapa lentă.`, `Așteptați câteva secunde: aerul destins se reîncălzește și presiunea se stabilizează.`, `Apăsați <b>„● p (etalon), U (multimetru) → Tabelul 5.1”</b>.`, `Repetați la <b>−50 kPa</b> și <b>−70 kPa</b> (≈ 30 kPa absolut, ca la ralanti în decelerare).`],
    ctl: () => "",
    ver: () => [[strans(), "montaj etanș"], [stabil(), "presiunea stabilizată"], [sim.dmm.mod === "V" && sim.dmm.s.dmmR === "tU", "multimetrul pe U MAP"]],
    prog: () => [1, 2, 3].filter(i => pe("t51", "p" + i, "u")).length, tot: 3,
    butoane: [["● p (etalon), U (multimetru) → Tabelul 5.1", inregPt, "primar"]] },
  { t: "Suprapresiune în trepte", tab: "Tabelul 5.1 – punctele 5…7", v3: "pneu",
    banda: "Pasul 4 · Pompa pe Presiune: +30, +60, +90 kPa relativ. Presiunea absolută = p<sub>atm</sub> + p<sub>rel</sub> (≈ 190 kPa la +90).",
    instr: [`Eliberați vidul cu supapa lentă (etalonul la 0) și treceți selectorul pompei pe <b>Presiune</b>.`, `Pompați până la <b>+30 kPa</b>, așteptați stabilizarea și apăsați <b>„● p (etalon), U (multimetru) → Tabelul 5.1”</b>.`, `Repetați la <b>+60 kPa</b> și <b>+90 kPa</b> (nu depășiți +100 kPa).`],
    ctl: () => "",
    ver: () => [[sim.mod === "pres", "pompa pe presiune"], [strans(), "colierele strânse (altfel furtunul sare!)"], [stabil(), "presiunea stabilizată"]],
    prog: () => [5, 6, 7].filter(i => pe("t51", "p" + i, "u")).length, tot: 3,
    butoane: [["● p (etalon), U (multimetru) → Tabelul 5.1", inregPt, "primar"]] },
  { t: "Eliberarea bruscă", tab: "Tabelul 5.2 – timpul de răspuns", v3: "pneu",
    banda: "Pasul 5 · Suprapresiune ≥ +40 kPa, apoi „Eliberare rapidă + înregistrare”: programul eșantionează U la 10 ms. Pe înregistrare: timpul de la 90 % la 10 % din treaptă.",
    instr: [`Cu programul pornit, pompați la ≈ +60…+90 kPa.`, `Apăsați <b>„Eliberare rapidă + înregistrare”</b> (butonul albastru al pompei): presiunea scade brusc, iar programul înregistrează răspunsul senzorului.`, `Pe plotter: cursorul <b>90 %</b> pe primul eșantion sub U<sub>90</sub>, cursorul <b>10 %</b> pe primul eșantion sub U<sub>10</sub>.`, `Apăsați <b>„● Δt (90 % → 10 %) → Tabelul 5.2”</b>.`],
    ctl: () => `<div class="rand-mic"><button type="button" data-rapid="1" class="primar">▶ Eliberare rapidă + înregistrare</button></div>
      <div class="rand-mic">${[["t90", "cursor 90 %"], ["t10", "cursor 10 %"]].map(([k, t]) => `<button type="button" data-ck="${k}" class="${sim.cur.k === k ? "activ" : ""}">${t}</button>`).join("")}</div>
      <label class="cur-l">t [ms] <input type="range" id="cur-t" min="0" max="990" step="10" value="${sim.cur[sim.cur.k]}"></label>
      <div class="rand-mic"><button type="button" data-dc="-10">◀ 10 ms</button><button type="button" data-dc="10">10 ms ▶</button></div><p class="nota" id="cur-info"></p>`,
    ver: () => [[sim.run, "programul rulează"], [!!sim.inreg || !!sim.rec, sim.rec ? "înregistrare…" : "eliberarea înregistrată"]],
    prog: () => pe("t52", "tr", "v") ? 1 : 0, tot: 1,
    butoane: [["● Δt (90 % → 10 %) → Tabelul 5.2", inregTr, "primar"]] },
  { t: "Calibrarea în program, densitatea", tab: "Tabelul 5.3", v3: "placa",
    banda: "Pasul 6 · Opriți simularea, introduceți în cod A și B din regresia voastră, porniți. Comparați p calculat de program cu etalonul la ralanti, la p<sub>atm</sub> și supraalimentat; notați ρ.",
    instr: [`În fila <b>Determinări</b> citiți a, b și eroarea de liniaritate din regresie și treceți-le în Tabelul 5.2.`, `Apăsați <b>■ Oprește simularea</b>, scrieți în program <b>A = a</b> și <b>B = b</b>, apoi <b>▶ Pornește simularea</b>.`, `<b>Ralanti:</b> vid până la ≈ 35 kPa absolut, apoi <b>„● p, ρ (OLED) → Tabelul 5.3”</b>.`, `<b>Atmosferic:</b> supapa deschisă (0 kPa relativ), apoi înregistrați.`, `<b>Supraalimentat:</b> presiune până la ≈ 170 kPa absolut (≈ +70 kPa relativ), apoi înregistrați.`],
    ctl: () => "",
    ver: () => [[sim.run && sim.fw && !(Math.abs(sim.fw.A - 0.01851) < 1e-9), "programul cu A, B proprii"], [strans() && stabil(), "presiunea stabilizată"]],
    prog: () => Object.keys(MD.PG).filter(k => pe("t53", k, "pP")).length, tot: 3,
    butoane: [["● p, ρ (OLED) → Tabelul 5.3", inregPg, "primar"]] }
];
let pasActiv = 0;
/* indiciile pas cu pas: ce se conectează / se apasă, în ordine (comun/ghid-pasi.js → ghidIndicii) */
const giK = k => `#tk-svg [data-k="${k}"]`, giA = s => ".pas.activ " + s, giR = (j = 0) => `.pas.activ [data-inreg][data-j="${j}"]`, giS = "#tk-start", giPm = s => "#tk-pompa " + s;
function giPrep() {
  return [[[giK("ochelari"), giPm("[data-och]")], "Puneți <b>ochelarii de protecție</b> (clic pe ei)", sim.ochelari],
    ...["pompă", "MAP", "etalon"].map((t, i) => [[giK("colier" + i), giPm(`[data-col="${i}"]`)], `Strângeți colierul furtunului <b>${t}</b> (clic)`, sim.coliere[i] && sim.desprins !== i]),
    [giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run]];
}
const giDmm = () => [[["#tk-dmm [data-dm=\"V\"]", giK("dmmKnob")], "Multimetrul pe <b>V⎓</b>", sim.dmm.mod === "V"],
  ["#tk-dmm [data-ds=\"dmmR\"]", "Sonda <b>+</b> pe <b>TP U MAP</b>", sim.dmm.s.dmmR === "tU"], ["#tk-dmm [data-ds=\"dmmB\"]", "Sonda <b>−</b> pe <b>TP GND</b>", sim.dmm.s.dmmB === "tGND"]];
/** aducerea presiunii relative la ținta T [kPa] (±tol), apoi supapa închisă și stabilizarea */
function giTinta(T, tol, cond) {
  const pr = etalonTxt(), aici = Math.abs(pr - T) <= tol, o = [];
  if (T === 0) o.push([[giPm("[data-lent]"), giK("lent")], `Deschideți <b>supapa lentă</b> până la 0,0 kPa (acum ${fx(pr, 1)} kPa)`, aici || (sim.lent && Math.abs(pr) < 0.6)]);
  else {
    const mod = T < 0 ? "vid" : "pres", peste = mod === "vid" ? pr < T - tol : pr > T + tol;
    o.push([[giPm(`[data-pm="${mod}"]`), giK("selector")], `Selectorul pompei pe <b>${mod === "vid" ? "Vid" : "Presiune"}</b>`, sim.mod === mod || aici]);
    const L = [giPm("[data-lent]"), giK("lent")];
    if (sim.lent && !aici) o.push(peste ? [L, `Așteptați: supapa lentă este deschisă și presiunea revine spre ${T > 0 ? "+" : ""}${T} kPa (acum ${fx(pr, 1)} kPa) – închideți-o când ajunge acolo`, false]
      : [L, `Închideți <b>supapa lentă</b> (presiunea a trecut de ${T > 0 ? "+" : ""}${T} kPa), apoi pompați din nou`, false]);
    else if (peste && !sim.lent) o.push([L, `Ați depășit ținta (${fx(pr, 1)} kPa): deschideți <b>supapa lentă</b>`, false]);
    else o.push([[giPm('[data-cs="1"]'), giK("pompa")], `Pompați (cursă plină / ¼ cursă) până la ≈ <b>${T > 0 ? "+" : ""}${T} kPa</b> (acum ${fx(pr, 1)} kPa)`, aici || (cond && cond())]);
  }
  o.push([[giPm("[data-lent]"), giK("lent")], "Închideți <b>supapa lentă</b>", !sim.lent], [giK("etalon"), "Așteptați stabilizarea presiunii (câteva secunde)", stabil()]);
  return o;
}
PASI[0].ind = () => {
  const o = [...giPrep(), [giR(0), "Apăsați <b>„● p<sub>atm</sub> (BMP280) → Tabelul 5.2”</b>", pe("t52", "patm", "v")]], E = sim.etans;
  if (E && E.gata && E.ok) return o;
  if (E && !E.gata) return [...o, [giA('[data-vit="30"]'), `Așteptați 60 s (accelerați timpul ×30) – ${fx(sim.tS - E.t0, 0)} s`, false]];
  const pr = etalonTxt();
  return [...o, [[giPm('[data-pm="vid"]'), giK("selector")], "Selectorul pompei pe <b>Vid</b>", sim.mod === "vid" || pr <= -44],
    [[giPm('[data-cs="1"]'), giK("pompa")], `Pompați până la ≈ <b>−50 kPa</b> pe manometrul etalon (acum ${fx(pr, 1)} kPa)`, pr <= -44],
    [[giPm("[data-lent]"), giK("lent")], "Închideți <b>supapa lentă</b>", !sim.lent],
    [giK("etalon"), "Așteptați câteva secunde stabilizarea presiunii (după ultima cursă)", stabil()],
    [giA("[data-et]"), E && E.gata ? `Pierdere ${fx(E.dp, 2)} kPa: verificați colierele și repetați <b>testul de etanșeitate</b>` : "Apăsați <b>Test de etanșeitate (60 s)</b>", false]];
};
PASI[1].ind = () => [...giPrep(), ...giTinta(0, 0.6), ...giDmm(), [giR(0), "Apăsați <b>„● p (etalon), U (multimetru) → Tabelul 5.1”</b>", pe("t51", "p4", "u")]];
function giPuncte(idx) {
  const i = idx.find(k => !pe("t51", "p" + k, "u")); if (!i) return [[giR(0), "Punctele sunt în tabel", true]];
  const T = MD.TINTE[i - 1];
  return [...giPrep(), ...giDmm(), ...giTinta(T, 5), [giR(0), `Apăsați <b>„● p (etalon), U (multimetru) → Tabelul 5.1”</b> (${T > 0 ? "+" : ""}${T} kPa)`, false]];
}
PASI[2].ind = () => giPuncte([3, 2, 1]);
PASI[3].ind = () => giPuncte([5, 6, 7]);
PASI[4].ind = () => {
  const r = sim.inreg;
  if (!r || sim.rec) return [...giPrep(), ...(sim.rec ? [] : giTinta(75, 15).slice(0, -2)),
    [[giA("[data-rapid]"), giPm("[data-rap]")], "Apăsați <b>„▶ Eliberare rapidă + înregistrare”</b>", !!sim.rec], [giK("etalon"), "Așteptați sfârșitul înregistrării (1 s)", false]];
  const c = MD.treceri(r.s);
  return [[giA('[data-ck="t90"]'), "Alegeți <b>cursor 90 %</b>", sim.cur.k === "t90" || sim.cur.t90 === c.t90],
    [giA("#cur-t"), "Mutați cursorul pe primul eșantion sub U<sub>90</sub> (◀ ▶ 10 ms)", sim.cur.t90 === c.t90],
    [giA('[data-ck="t10"]'), "Alegeți <b>cursor 10 %</b>", sim.cur.k === "t10" || sim.cur.t10 === c.t10],
    [giA("#cur-t"), "Mutați cursorul pe primul eșantion sub U<sub>10</sub>", sim.cur.t10 === c.t10],
    [giR(0), "Apăsați <b>„● Δt (90 % → 10 %) → Tabelul 5.2”</b>", pe("t52", "tr", "v")]];
};
PASI[5].ind = () => {
  const ex = sim.fw && Math.abs(sim.fw.A - 0.01851) < 1e-9 && Math.abs(sim.fw.B - 0.0246) < 1e-9, ok = sim.run && sim.fw && !ex;
  const camp = String(sim.camp.A) !== "0.01851" || String(sim.camp.B) !== "0.0246";
  const o = [[giS, "Opriți simularea (■) pentru a scrie A și B", !sim.run || ok], [`#tk-cod [data-cf="A"]`, "Scrieți în cod <b>A</b> și <b>B</b> din regresia voastră (fila Determinări)", ok || camp],
    [giS, "Apăsați <b>▶ Pornește simularea</b>", ok]];
  const k = ["ral", "atm", "sup"].find(x => !pe("t53", x, "pP")); if (!k) return o;
  const patm = MD.bmpP(P()), T = k === "atm" ? 0 : k === "ral" ? Math.round(35 - patm) : Math.round(170 - patm);
  return [...o, ...giPrep().slice(0, 4), ...giTinta(T, k === "atm" ? 0.6 : 8), [giR(0), `Apăsați <b>„● p, ρ (OLED) → Tabelul 5.3”</b> (${{ ral: "ralanti", atm: "atmosferic", sup: "supraalimentat" }[k]})`, false]];
};

const VEDERI = { tot: [[0.02, 0.4, 0.82], [-0.02, 0.07, 0]], pneu: [[-0.22, 0.26, 0.42], [-0.2, 0.04, 0.02]], placa: [[0.12, 0.22, 0.32], [0.1, 0.01, 0.03]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată pe stand</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => alegePas(+b.dataset.vezi, true)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-et]").forEach(b => b.addEventListener("click", testEtans));
  $$("#pasi [data-vit]").forEach(b => b.addEventListener("click", () => { sim.viteza = +b.dataset.vit; $$("#pasi [data-vit]").forEach(x => x.classList.toggle("activ", x === b)); }));
  $$("#pasi [data-rapid]").forEach(b => b.addEventListener("click", eliberareRapida));
  $$("#pasi [data-ck]").forEach(b => b.addEventListener("click", () => { sim.cur.k = b.dataset.ck; $$("#pasi [data-ck]").forEach(x => x.classList.toggle("activ", x === b)); if (sim.inreg) { sim.vedere = "rec"; comutaVedere(); } cursorAfis(); }));
  $$("#pasi [data-dc]").forEach(b => b.addEventListener("click", () => { sim.cur[sim.cur.k] = Math.max(0, Math.min(990, sim.cur[sim.cur.k] + +b.dataset.dc)); if (sim.inreg) { sim.vedere = "rec"; comutaVedere(); } cursorAfis(); }));
  const ct = $("#cur-t"); if (ct) ct.addEventListener("input", () => { sim.cur[sim.cur.k] = +ct.value; if (sim.inreg) { sim.vedere = "rec"; comutaVedere(); } cursorAfis(); });
  ghidPasi(PASI, alegePas); ghidIndicii(PASI, () => pasActiv);
  alegePas(0, false);
}
function alegePas(i, zoom) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $("#tk-pas-banda").innerHTML = p.banda;
  if (zoom) vedere3d(p.v3);
  if (i === 4 && sim.inreg) { sim.vedere = "rec"; comutaVedere(); }
  actualizeazaPasi(); cursorAfis();
}
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  const v = PASI[pasActiv].ver();
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = v.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ editorul și simularea */
function afiseazaCod() {
  $("#tk-cod").innerHTML = cod().split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value.replace(",", "."); }); });
  $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  const A = Number(sim.camp.A), B = Number(sim.camp.B);
  if (!(A > 0.005 && A < 0.05) || !(Math.abs(B) < 1)) return Cadru.mesajTemporar("Valori nepermise pentru A (0,005…0,05 V/kPa) sau B (−1…1 V).", "atentie");
  sim.fw = { A, B }; sim.run = true; pornesteProgram();
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.pr = null; sim.rec = null;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} (A = ${sim.fw.A} V/kPa, B = ${sim.fw.B} V)` : "—"; }

/* ------------------------------------------------------------------ calculele determinărilor */
const U_ = { num, regresie };
function calculeazaMAM5(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date || {}, U_), F = Number.isFinite, cel = { t51: {}, t53: {} };
  const pa = F(o.patm) ? o.patm : 101.3;
  for (let i = 1; i <= 7; i++) { const r = t.t51["p" + i], pr_ = num(r.prel), u = num(r.u), pabs = pa + pr_, ur = o.a * pabs + o.b;
    cel.t51["p" + i] = { pabs: F(pabs) ? fx(pabs, 1) : "", ureg: F(ur) && F(pabs) ? fx(ur, 3) : "", ab: F(ur) && F(u) ? fx((u - ur) * 1000, 1) : "" }; }
  Object.keys(MD.PG).forEach(k => { const r = t.t53[k], pE = num(r.pE), pP = num(r.pP), T = num(r.T);
    cel.t53[k] = { err: F(pE) && F(pP) ? fx(pP - pE, 1) : "", rhoc: F(pE) && F(T) ? fx(pE * 1000 / (MD.RA * (T + 273.15)), 3) : "" }; });
  const rez = [
    ["Caracteristica (regresie 5.4, 5.5)", F(o.a) ? `U = <span style="color:var(--accent)">${fx(o.a, 5)}</span>·p + <span style="color:var(--accent)">${fx(o.b, 4)}</span> [V, kPa]` : "—"],
    ["Eroarea de liniaritate", F(o.elin) ? `${fx(o.dmax * 1000, 1)} mV / domeniu = <span style="color:var(--accent)">${fx(o.elin, 2)} %</span>` : "—"],
    ["Relația inversă (5.6)", F(o.a) ? `p = (U − ${fx(o.b, 4)})/${fx(o.a, 5)} kPa` : "—"],
    ["Timpul de răspuns la eliberare", F(o.tr) ? `${fx(o.tr, 0)} ms (90 % → 10 %)` : "—"],
    ["Densitatea aerului (5.7)", Object.keys(MD.PG).map(k => { const r = t.t53[k]; return F(num(r.rho)) ? `${MD.PG[k].et.split(" (")[0]}: ${fx(num(r.rho), 3)} kg/m³` : ""; }).filter(Boolean).join(" · ") || "—"]
  ];
  const verdicte = [];
  if (F(o.elin)) verdicte.push(o.elin < 1.5 ? { tip: "ok", text: `Eroarea de liniaritate ${fx(o.elin, 2)} % < 1…2 %: senzorul este bun.` } : { tip: "atentie", text: `Eroarea de liniaritate ${fx(o.elin, 2)} % este mare: verificați punctele (stabilizarea, conversia relativ → absolut).` });
  if (F(o.a)) { const ab = o.b - MD.B0N; verdicte.push({ tip: Math.abs(ab) < 0.04 ? "ok" : "atentie", text: `b = ${fx(o.b, 4)} V față de valoarea nominală a senzorului de 2,5 bar (${fx(MD.B0N, 4)} V); panta ${fx(o.a, 5)} V/kPa față de ${fx(MD.A0N, 5)} V/kPa nominal${Math.abs(o.a / MD.A0N - 1) > 0.006 ? " – multimetrul măsoară tensiunea absolută, iar senzorul este ratiometric (5 V al plăcii)" : ""}.` }); }
  const ra = num(t.t53.ral.rho), rs = num(t.t53.atm.rho); if (F(ra) && F(rs)) verdicte.push({ tip: "ok", text: `Densitatea la ralanti (${fx(ra, 3)} kg/m³) este de ${fx(rs / ra, 2)} ori mai mică decât la sarcină plină (${fx(rs, 3)} kg/m³) – de aici variația duratei de injecție.` });
  const pts = o.pts.map(p => [p[0], p[1]]), lin = F(o.a) ? [[20, o.a * 20 + o.b], [210, o.a * 210 + o.b]] : [];
  return { celule: cel, rezultate: rez, verdicte, titluGrafic: "Caracteristica senzorului MAP: U = f(p<sub>abs</sub>)",
    grafic: { xmin: 0, xmax: 220, ymin: 0, ymax: 5, xlab: "p abs [kPa]", ylab: "U [V]", serii: [{ tip: "pct", pts, culoare: 0, r: 4 }, ...(lin.length ? [{ tip: "linie", pts: lin, culoare: 1, punctat: true }] : [])] },
    legenda: [["puncte măsurate", "var(--serie-0)", "pct"], ["regresia", "var(--serie-1)"]], principal: { eticheta: "a [V/kPa]", valoare: F(o.a) ? +o.a.toFixed(5) : null } };
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Presiunea din montaj nu depășește 200 kPa absolut (≈ 1 bar peste presiunea atmosferică); furtunurile se fixează cu coliere, niciodată doar prin presare.</li>
<li>Manometrul pompei de anvelope indică presiune relativă: presiunea absolută este presiunea atmosferică plus indicația manometrului.</li>
<li>Se poartă ochelari de protecție la lucrul cu pompa; eliberarea presiunii se face lent, prin supapă.</li>
<li>Senzorul MAP provenit din dezmembrări se curăță în prealabil de urmele de combustibil; se lucrează fără surse de foc în apropiere.</li></ul></div>
<h2>5.1. Scopul lucrării</h2>
<p>Calibrarea unui senzor MAP auto în domeniul de vid (sub presiunea atmosferică) și de suprapresiune, cu o pompă manuală și un manometru etalon; determinarea caracteristicii prin regresie, a erorii de liniaritate și calculul densității aerului, mărimea din care ECU determină masa de aer aspirată (metoda speed-density, studiată la Sisteme auxiliare, lucrarea 2).</p>
<h2>5.2. Noțiuni teoretice</h2>
<p>Senzorul MAP măsoară presiunea absolută din colectorul de admisie printr-o membrană de siliciu cu piezorezistențe în punte Wheatstone și un circuit de condiționare integrat; ieșirea este o tensiune de 0,4…4,65 V, liniară cu presiunea. La un motor aspirat presiunea variază între ≈ 25 kPa (decelerare) și presiunea atmosferică; la un motor supraalimentat ajunge la 200…250 kPa.</p>
<div class="ec"><span>p<sub>abs</sub> = p<sub>atm</sub> + p<sub>rel</sub></span><span class="nr">(5.1)</span></div>
<div class="ec"><span>Δp<sub>vid</sub> = p<sub>atm</sub> − p<sub>abs</sub></span><span class="nr">(5.2)</span></div>
<div class="ec"><span>U = a · p<sub>abs</sub> + b</span><span class="nr">(5.3)</span></div>
<figure>${figMAP()}<figcaption>Fig. 5.1. Montajul de calibrare și caracteristica senzorului MAP (valori exemplificative)</figcaption></figure>
<p>Parametrii a și b se determină prin regresie liniară din n puncte măsurate; din caracteristica inversă ECU calculează presiunea, iar cu temperatura aerului admis – densitatea (ecuația de stare a gazului perfect, R<sub>a</sub> = 287 J/(kg·K)):</p>
<div class="ec"><span>a = (n Σ p<sub>i</sub>U<sub>i</sub> − Σ p<sub>i</sub> Σ U<sub>i</sub>) / (n Σ p<sub>i</sub><sup>2</sup> − (Σ p<sub>i</sub>)<sup>2</sup>)</span><span class="nr">(5.4)</span></div>
<div class="ec"><span>b = U<sub>med</sub> − a · p<sub>med</sub></span><span class="nr">(5.5)</span></div>
<div class="ec"><span>p = (U − b)/a</span><span class="nr">(5.6)</span></div>
<div class="ec"><span>ρ = p / (R<sub>a</sub> · T) &nbsp; [kg/m³]</span><span class="nr">(5.7)</span></div>
<pre class="cod">const float A = 0.01851, B = 0.0246;   // V/kPa, V – din calibrare
void loop() {
  float u = analogRead(A0) * 5.0 / 1024;
  float p = (u - B) / A;                 // kPa absolut
  float T = 273.15 + tempAer();          // K (lucrarea 4)
  float rho = p * 1000 / (287.0 * T);    // kg/m3
  delay(100);
}</pre>
<h2>5.4. Modul de lucru (în simulator)</h2>
<ol><li>Ochelari, coliere strânse; p<sub>atm</sub> cu BMP280; testul de etanșeitate.</li><li>U la presiunea atmosferică.</li><li>Vid: −30, −50, −70 kPa relativ.</li><li>Suprapresiune: +30, +60, +90 kPa relativ.</li><li>Eliberarea bruscă înregistrată la 10 ms.</li><li>Parametrii calibrării în program: p și ρ la ralanti, atmosferic și supraalimentat.</li></ol>
<h2>5.7. Interpretarea rezultatelor</h2>
<ul><li>Un senzor MAP sănătos are eroarea de liniaritate sub 1…2 %; o deplasare a lui b indică deriva senzorului sau o referință de 5 V diferită.</li>
<li>Confuzia dintre presiunea relativă și cea absolută este o sursă frecventă de erori: la 1 bar pe manometrul pompei, presiunea absolută este ≈ 200 kPa.</li>
<li>Densitatea aerului la ralanti este de aproximativ două ori mai mică decât la sarcină plină – de aici variația duratei de injecție.</li></ul>
<h2>5.8. Relevanță practică</h2>
<p>Calibrarea senzorilor de presiune și modelele de calcul al masei de aer sunt folosite la dezvoltarea sistemelor de management al motorului și în cercetare (combustibili alternativi, supraalimentare). Aceiași senzori măsoară presiunea în rezervorul de combustibil, în circuitul de frânare și presiunea atmosferică pentru corecția de altitudine.</p>`;
function figMAP() {
  const X = p => 300 + (p - 0) * 1.4, Y = u => 210 - u * 38;
  let s = `<svg viewBox="0 0 640 250" class="fig-svg" role="img" aria-label="Fig. 5.1"><g font-size="10" fill="currentColor">`;
  // montajul
  s += `<rect x="20" y="90" width="70" height="30" rx="10" fill="#c62828" opacity=".85"/><text x="55" y="108" text-anchor="middle" fill="#fff">pompă</text><path d="M90,105 H150" stroke="#7fb6dc" stroke-width="5"/><rect x="146" y="98" width="16" height="14" fill="#c9a043"/>
    <path d="M162,105 H220" stroke="#7fb6dc" stroke-width="5"/><rect x="218" y="90" width="44" height="30" rx="4" fill="#222"/><text x="240" y="108" text-anchor="middle" fill="#fff">MAP</text>
    <path d="M154,98 V60" stroke="#7fb6dc" stroke-width="5"/><circle cx="154" cy="45" r="17" fill="none" stroke="currentColor"/><text x="154" y="49" text-anchor="middle">p<tspan font-size="7">rel</tspan></text><text x="154" y="20" text-anchor="middle">manometru etalon</text>
    <text x="240" y="140" text-anchor="middle">U → A0</text><text x="120" y="160" text-anchor="middle">BMP280: p<tspan font-size="7">atm</tspan>, T</text>`;
  [0, 1, 2, 3, 4, 5].forEach(u => { s += `<line x1="${X(20)}" y1="${Y(u)}" x2="${X(220)}" y2="${Y(u)}" stroke="currentColor" opacity=".12"/><text x="${X(20) - 6}" y="${Y(u) + 3}" text-anchor="end">${u}</text>`; });
  [20, 60, 100, 140, 180, 220].forEach(p => { s += `<text x="${X(p)}" y="224" text-anchor="middle">${p}</text>`; });
  s += `<line x1="${X(20)}" y1="${Y(0.4)}" x2="${X(250 > 220 ? 220 : 250)}" y2="${Y(0.4 + 200 * 0.01848)}" stroke="#1f5f9e" stroke-width="2.2"/><text x="${X(120)}" y="${Y(2.6)}" fill="#1f5f9e">U = 0,0185·p + 0,03</text>
    <line x1="${X(101.3)}" y1="${Y(0)}" x2="${X(101.3)}" y2="${Y(5)}" stroke="#c0492b" stroke-dasharray="4 3"/><text x="${X(101.3) + 4}" y="${Y(4.7)}" fill="#c0492b">p<tspan font-size="7">atm</tspan></text>
    <text x="${X(60)}" y="${Y(4.4)}">vid</text><text x="${X(160)}" y="${Y(4.4)}">suprapresiune</text><text x="${X(120)}" y="244" text-anchor="middle">p<tspan font-size="7">abs</tspan> [kPa]</text><text x="${X(20) - 30}" y="${Y(2.5)}" transform="rotate(-90 ${X(20) - 30} ${Y(2.5)})" text-anchor="middle">U [V]</text></g></svg>`;
  return s;
}
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Puncte (30 kPa; 0,58 V) și (101,3 kPa; 1,90 V); la funcționare se citesc U = 1,20 V și temperatura aerului de 27 °C:</p>
<div class="ec"><span>a = (1,90 − 0,58)/(101,3 − 30) = 0,01851 V/kPa</span><span class="nr">(5.8)</span></div>
<div class="ec"><span>b = 0,58 − 0,01851 · 30 = 0,0246 V</span><span class="nr">(5.9)</span></div>
<div class="ec"><span>p = (1,20 − 0,0246)/0,01851 = 63,5 kPa</span><span class="nr">(5.10)</span></div>
<div class="ec"><span>ρ = 63 500/(287 · 300) = 0,737 kg/m³</span><span class="nr">(5.11)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Ce presiune absolută corespunde unei indicații de 0,8 bar pe manometrul pompei, la p<sub>atm</sub> = 101 kPa? Ce tensiune dă senzorul din exemplu?</p><details class="sol"><summary>Rezolvare</summary><p>p<sub>abs</sub> = 101 + 80 = 181 kPa; U = 0,01851·181 + 0,0246 = 3,37 V.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Calculați densitatea aerului la 100 kPa și 40 °C.</p><details class="sol"><summary>Rezolvare</summary><p>ρ = 100 000/(287·313,15) = 1,113 kg/m³.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Senzorul are în realitate b = 0,0246 + 0,05 V (derivă), iar programul folosește vechea valoare. Ce eroare de presiune rezultă și cum afectează amestecul la ralanti (35 kPa)?</p><details class="sol"><summary>Rezolvare</summary><p>Δp = 0,05/0,01851 = 2,7 kPa în plus; la 35 kPa înseamnă +7,7 % masă de aer calculată → combustibil în plus ≈ 7,7 % (amestec bogat), corectat parțial de reglarea lambda.</p></details></div>`;
}
const INTREBARI = [
  ["Care este diferența dintre presiunea absolută, relativă și diferențială?", "Absolută: față de vid (zero absolut). Relativă (manometrică): față de presiunea atmosferică locală – negativă la vid. Diferențială: între două puncte oarecare (de ex. înainte și după filtrul de particule)."],
  ["Ce presiune absolută corespunde unei indicații de 0,8 bar pe manometrul pompei, la p<sub>atm</sub> = 101 kPa?", "p<sub>abs</sub> = 101 + 80 = 181 kPa."],
  ["De ce un motor supraalimentat are nevoie de un senzor MAP cu domeniu mai mare?", "Presiunea de supraalimentare ajunge la 200…250 kPa absolut; un senzor de 1 bar (până la ≈ 115 kPa) s-ar satura, iar ECU nu ar mai putea calcula masa de aer și nu ar putea limita presiunea (protecția motorului)."],
  ["Calculați densitatea aerului la 100 kPa și 40 °C.", "ρ = 100 000/(287·313,15) ≈ 1,113 kg/m³."],
  ["Cum afectează o eroare de 5 % a senzorului MAP dozajul amestecului?", "Masa de aer calculată (speed-density) este proporțională cu p: o eroare de +5 % dă cu ≈ 5 % mai mult combustibil (amestec bogat), −5 % – amestec sărac; reglarea lambda corectează parțial în buclă închisă, dar nu la sarcină plină / pornire la rece."]
];
const TEST = [
  { q: "La p<sub>atm</sub> = 100 kPa, un vid de 70 kPa pe manometru înseamnă presiunea absolută:", o: ["70 kPa", "30 kPa", "170 kPa", "100 kPa"], c: 1, e: "100 − 70." },
  { q: "Senzorul MAP măsoară:", o: ["presiunea relativă", "presiunea absolută", "debitul de aer", "temperatura"], c: 1, e: "Membrană cu vid de referință." },
  { q: "Pentru U = 1,20 V, a = 0,01851 V/kPa, b = 0,0246 V, presiunea este:", o: ["63,5 kPa", "64,8 kPa", "101,3 kPa", "35,0 kPa"], c: 0, e: "(1,20 − 0,0246)/0,01851." },
  { q: "Densitatea aerului la 63,5 kPa și 27 °C este:", o: ["1,18 kg/m³", "0,737 kg/m³", "0,52 kg/m³", "0,95 kg/m³"], c: 1, e: "63 500/(287·300)." },
  { q: "La 1 bar pe manometrul pompei, presiunea absolută este aproximativ:", o: ["100 kPa", "200 kPa", "1 kPa", "300 kPa"], c: 1, e: "p<sub>atm</sub> + 100 kPa." },
  { q: "Un furtun de presiune se fixează:", o: ["prin presare pe racord", "cu colier", "cu bandă adezivă", "nu contează"], c: 1, e: "NSSM: altfel sare de pe racord." }
];
const CSS = `<style>
.tk { padding:0 !important; overflow:hidden; background:#fff; color:#222; }
.tk-bara { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; padding:.45rem .6rem; background:#fff; border-bottom:1px solid #e3e3e3; }
.tk-logo { font:600 .9rem system-ui,sans-serif; color:#333; margin-right:auto; } .tk-logo b { color:#1477d1; }
.tk-bara button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.32rem .7rem; font:600 .82rem system-ui,sans-serif; cursor:pointer; }
.tk-bara button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; }
.tk-bara .tk-start { background:#2e9e44; border-color:#2e9e44; color:#fff; } .tk-bara .tk-start.ruleaza { background:#d6452f; border-color:#d6452f; }
.tk-plansa { position:relative; background:#eef1f3; border-bottom:1px solid #e3e3e3; min-height:120px; }
#tk-svg { width:100%; height:auto; aspect-ratio:1300/814; display:block; user-select:none; font-family:system-ui,sans-serif; background:#fbfbfb; }
#tk-svg .tk-comp { cursor:pointer; } #tk-svg .tk-comp:hover { filter:brightness(1.06) drop-shadow(0 0 3px rgba(20,119,209,.6)); }
.a3d-tip { position:absolute; background:rgba(20,24,30,.88); color:#fff; font:12px system-ui,sans-serif; padding:.2rem .45rem; border-radius:4px; pointer-events:none; white-space:nowrap; z-index:3; }
.tk-dmm, .tk-vederi, .tk-pompa { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; padding:.35rem .6rem; font:12.5px system-ui,sans-serif; color:#333; border-bottom:1px solid #eee; }
.tk-dmm button, .tk-vederi button, .tk-pompa button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.2rem .55rem; font:600 12px system-ui; cursor:pointer; }
.tk-dmm button.activ { background:#f2b705; border-color:#c99700; } .tk-pompa button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; } .tk-pompa button.slab { background:#fff3e0; border-color:#ff9800; color:#8a4b00; } .tk-pompa button.primar { background:#c62828; border-color:#c62828; color:#fff; }
.tk-pompa .sep { width:1px; height:1.2rem; background:#ddd; margin:0 .3rem; }
.tk-dmm select { font:12px system-ui; } .tk-dmm-v { margin-left:auto; font:700 14px ui-monospace,monospace; background:#bfd0b0; color:#1d2414; padding:.1rem .5rem; border-radius:3px; min-width:7ch; text-align:right; }
.tk-afis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:.3rem .8rem; padding:.4rem .6rem; font:12px system-ui,sans-serif; border-bottom:1px solid #eee; } .tk-afis div { display:flex; justify-content:space-between; gap:.5rem; } .tk-afis span { color:#777; } .tk-afis b { font-family:ui-monospace,monospace; }
.tk-ajutor { margin:.3rem .6rem; font:11px system-ui,sans-serif; color:#888; }
.tk-insp { position:absolute; right:.6rem; top:.6rem; width:290px; background:#fff; border:1px solid #d8dde3; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.15); font:12.5px system-ui,sans-serif; color:#333; z-index:4; }
.tk-insp-t { display:flex; justify-content:space-between; align-items:center; padding:.5rem .6rem; font-weight:700; border-bottom:1px solid #eee; } .tk-insp-t button { border:0; background:none; cursor:pointer; color:#777; }
.tk-insp-r { display:flex; justify-content:space-between; gap:.6rem; padding:.3rem .6rem; } .tk-insp-r span { color:#777; } .tk-insp-r b { font-weight:600; text-align:right; }
.tk-jos { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); border-top:1px solid #e3e3e3; } .tk-jos:has(.tk-cod[hidden]) { grid-template-columns:1fr; }
.tk-cod { background:#fff; display:flex; flex-direction:column; min-width:0; } .tk-cod[hidden] { display:none; }
.tk-ser { border-left:1px solid #e3e3e3; display:flex; flex-direction:column; min-width:0; background:#fff; }
.tk-cod-sus { display:flex; gap:.4rem; padding:.4rem .5rem; border-bottom:1px solid #eee; align-items:center; font:12px system-ui,sans-serif; color:#555; }
.tk-cod-sus button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.1rem .5rem; font:11.5px system-ui; cursor:pointer; color:#333; } .tk-cod-sus button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; }
#tk-cod { margin:0; padding:.5rem .3rem; overflow:auto; background:#fff; color:#1f1f1f; font:11.5px/1.5 ui-monospace,Consolas,"Courier New",monospace; white-space:pre; max-height:420px; }
.cd-ln { display:inline-block; width:2.2em; color:#a8a8a8; text-align:right; margin-right:.8em; user-select:none; }
.cd-k { color:#0b62b5; font-weight:600; } .cd-s { color:#b2502b; } .cd-c { color:#6a8759; font-style:italic; } .cd-n { color:#7a3fb0; }
.cd-f { background:#fff8d6; color:#5b3d00; border:1px solid #e0b84a; border-radius:3px; font:inherit; padding:0 .2rem; } .cd-f:disabled { background:#f1f1f1; color:#777; border-color:#ccc; }
.tk-blocat { background:#fff4e5; color:#8a5300; font:12px system-ui,sans-serif; padding:.35rem .6rem; border-bottom:1px solid #f1d7a8; }
#tk-serial { margin:0; flex:1 1 auto; min-height:120px; max-height:200px; overflow:auto; background:#fff; color:#222; padding:.4rem .6rem; font:11.5px/1.4 ui-monospace,Consolas,monospace; }
#tk-plot { width:100%; height:190px; display:block; border-top:1px solid #eee; }
.tk-ser-in { display:flex; gap:.3rem; padding:.35rem .5rem; border-top:1px solid #eee; } .tk-ser-in input { flex:1; font:12px ui-monospace,monospace; padding:.2rem .4rem; border:1px solid #cfd4da; border-radius:4px; } .tk-ser-in button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.2rem .6rem; font:12px system-ui; cursor:pointer; color:#333; }
.fw { font-size:.8rem; } .fw b { font-family:ui-monospace,monospace; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; }
.fig-svg { width:100%; max-width:680px; height:auto; color:var(--text); }
.tk-pas-banda { position:absolute; left:.6rem; bottom:.5rem; max-width:min(560px,62%); background:rgba(20,119,209,.93); color:#fff; border-radius:6px; padding:.4rem .6rem; font:12.5px/1.35 system-ui,sans-serif; box-shadow:0 3px 10px rgba(0,0,0,.2); pointer-events:none; z-index:2; }
.tk-pas-banda:empty { display:none; }
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
.sim-grila:fullscreen .sim-scena.tk, .sim-grila.ecran-plin .sim-scena.tk { display:block; }
.sim-grila:fullscreen .m5-3d .m3d, .sim-grila.ecran-plin .m5-3d .m3d { height:calc(100vh - 30rem); min-height:320px; }
@media (max-width:900px){ .tk-jos { grid-template-columns:1fr; } .tk-ser { border-left:0; border-top:1px solid #e3e3e3; } .tk-pas-banda { position:static; max-width:none; border-radius:0; } }
</style>`;
Cadru.porneste({
  disc: "MAM1", nr: 5, cod: "mam1-l5",
  titlu: "Senzorul de presiune absolută din colector (MAP): calibrare și calculul densității aerului",
  scurt: "Senzorul MAP: calibrare",
  subtitlu: "Laborator virtual – pompa de vid și presiune, manometrul etalon, BMP280, senzorul MAP pe Arduino Mega cu OLED: caracteristica prin regresie, eroarea de liniaritate, răspunsul dinamic și densitatea aerului",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261026); },
  date: [{ k: "Ra", et: "R<sub>a</sub> [J/(kg·K)]", v: 287, fix: true }, { k: "A0", et: "a nominal [V/kPa]", v: 0.01848, fix: true }, { k: "B0", et: "b nominal [V]", v: 0.0304, fix: true }],
  tabele: [
    { id: "t51", titlu: "Tabelul 5.1. Calibrarea senzorului MAP", antetRand: "Punct", nota: "p relativ de pe manometrul etalon; p<sub>abs</sub> = p<sub>atm</sub>(BMP280, Tabelul 5.2) + p<sub>rel</sub>; U cu multimetrul (TP U MAP – TP GND); regresia U = a·p<sub>abs</sub> + b.",
      randuri: MD.TINTE.map((t, i) => ({ k: "p" + (i + 1), et: `${i + 1} (≈ ${t > 0 ? "+" : ""}${t} kPa)` })),
      coloane: [{ k: "prel", t: "p manometru (relativă) [kPa]", intrare: true }, { k: "pabs", t: "p<sub>abs</sub> [kPa]" }, { k: "u", t: "U [V]", intrare: true }, { k: "ureg", t: "U regresie [V]" }, { k: "ab", t: "Abatere [mV]" }] },
    { id: "t52", titlu: "Tabelul 5.2. Rezultatele calibrării", antetRand: "Mărime", nota: "a, b și eroarea de liniaritate din regresie (rezultatele de mai jos); p<sub>atm</sub> de la BMP280; timpul de răspuns din înregistrarea eliberării (90 % → 10 %).",
      randuri: [{ k: "a", et: "a [V/kPa]" }, { k: "b", et: "b [V]" }, { k: "elin", et: "Eroare de liniaritate [%]" }, { k: "patm", et: "p<sub>atm</sub> (BMP280) [kPa]" }, { k: "tr", et: "Timp de răspuns la eliberare [ms]" }],
      coloane: [{ k: "v", t: "Valoare", intrare: true }] },
    { id: "t53", titlu: "Tabelul 5.3. Verificarea calibrării în program și densitatea aerului", antetRand: "Regim", nota: "p etalon = p<sub>atm</sub> + p<sub>rel</sub>; p program și ρ de pe OLED (cu A, B din calibrarea voastră); T de la BMP280; ρ calculat = p<sub>etalon</sub>/(R<sub>a</sub>·T).",
      randuri: Object.keys(MD.PG).map(k => ({ k, et: MD.PG[k].et })),
      coloane: [{ k: "pE", t: "p etalon abs. [kPa]", intrare: true }, { k: "pP", t: "p program [kPa]", intrare: true }, { k: "err", t: "Eroare [kPa]" }, { k: "T", t: "T aer [°C]", intrare: true }, { k: "rho", t: "ρ program [kg/m³]", intrare: true }, { k: "rhoc", t: "ρ calculat [kg/m³]" }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaMAM5,
  intrebari() {
    return [
      { id: "q1", u: "V/kPa", text: "Panta caracteristicii a (regresia 5.4, Tabelul 5.1):", textSimplu: "a" },
      { id: "q2", u: "V", text: "Ordonata la origine b (5.5):", textSimplu: "b" },
      { id: "q3", u: "%", text: "Eroarea de liniaritate a senzorului:", textSimplu: "eroarea de liniaritate" },
      { id: "q4", u: "kg/m³", text: "Densitatea aerului la 100 kPa și 40 °C (Întrebarea 4):", textSimplu: "ρ la 100 kPa și 40 °C" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = [1, 2, 3, 4, 5, 6, 7].filter(i => t.t51["p" + i].u !== "").length; if (a < 7) l.push(`Tabelul 5.1: ${a}/7 puncte`);
    const b = ["a", "b", "elin", "patm", "tr"].filter(k => t.t52[k].v !== "").length; if (b < 5) l.push(`Tabelul 5.2: ${b}/5 mărimi`);
    const c = Object.keys(MD.PG).filter(k => t.t53[k].pP !== "").length; if (c < 3) l.push(`Tabelul 5.3: ${c}/3 regimuri`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t51.p1, { prel: "-71.3", u: "0.580" }); Object.assign(t.t51.p4, { prel: "0.0", u: "1.900" }); t.t52.patm.v = "101.30"; },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul de calibrare la scară reală: pompa manuală de vid / presiune cu manometru, furtunurile de 6 mm cu coliere, teul de alamă, manometrul etalon digital, senzorul MAP pe colțarul de aluminiu, placa de test cu BMP280 și punctele de test, Arduino Mega cu OLED, multimetrul, ochelarii de protecție și cronometrul. Montajul urmărește simulatorul; clic pe pompă = o cursă, clic pe selector, supape, coliere, ochelari, puncte de test și comutatorul multimetrului ca pe planșă. Rotiți, apropiați sau depărtați vederea.</p>`,
    modul: "aparate3d.js?v=10", functie: "creeazaStandMAP", optiuni: { laClic: k => laClic3d(k) },
    dupa: `<div class="tk-vederi" style="border:0;padding:.5rem 0 0"><span>Vedere:</span>${[["tot", "Ansamblu"], ["pneu", "Pompa, teul și etalonul"], ["placa", "Placa de test"]].map(([k, t]) => `<button type="button" data-v3="${k}">${t}</button>`).join("")}</div>`
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Senzorul MAP în autoturism",
    intro: `<p>Senzorul de presiune absolută din colector (MAP, adesea combinat cu temperatura aerului – TMAP) este montat pe colectorul de admisie. Selectați-l în machetă: amplasarea, mufa și semnalul.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "map" })
  },
  atelierSenzori: { intro: `<p>Senzorul MAP este preselectat: modelul 3D, mufa cu 3 (sau 4 pini la TMAP) și verificările (tensiunea la contact pus, cu vid aplicat cu pompa, la accelerare). Puteți alege și alți senzori din listă.</p>`, optiuni: { initial: "map" } },
  referat: {
    scop: "Calibrarea senzorului MAP în vid și suprapresiune, determinarea caracteristicii prin regresie, a erorii de liniaritate și a timpului de răspuns; calculul densității aerului.",
    relatii: "p<sub>abs</sub> = p<sub>atm</sub> + p<sub>rel</sub>; &nbsp; U = a·p<sub>abs</sub> + b; &nbsp; p = (U − b)/a; &nbsp; ρ = p/(R<sub>a</sub>·T).",
    varianta: () => "Exemplarul propriu al fiecărui student: panta, decalajul și curbura senzorului, tensiunea USB, presiunea atmosferică și temperatura, erorile etalonului și ale BMP280, volumul circuitului, scurgerea și constanta de timp a descărcării.",
    indicatii: "Comentați caracteristica și eroarea de liniaritate, diferența relativ/absolut, diferența dintre măsurarea cu multimetrul și citirea ratiometrică din program, timpul de răspuns și densitatea aerului în cele trei regimuri…"
  },
  subsol: "Modelul: senzor MAP de 2,5 bar ratiometric (exemplar propriu, curbură mică), ADC 10 biți cu zgomot, circuit pneumatic izoterm cu tranzitoriu termic după fiecare cursă, scurgere lentă (mare cu colier slăbit), supapă de siguranță la +100 kPa, descărcare exponențială la eliberare, BMP280 și etalon cu erori proprii. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      ${ghidSectiune()}
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Stand</b> · MAM I – Lucrarea 5</span>
        <button type="button" id="tk-fit" title="Încadrează tot">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div><div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-pompa" id="tk-pompa"></div>
      <div class="tk-dmm" id="tk-dmm"></div>
      <div class="tk-afis" id="afis"></div>
      <p class="tk-ajutor">Clic pe pompă = o cursă · clic pe selectorul galben (vid / presiune), pe supapa lentă, pe butonul albastru (eliberare rapidă), pe coliere, pe ochelari, pe punctele de test (sondele multimetrului: + pe TP U / TP 5V, − pe TP GND), pe comutatorul multimetrului și pe RESET · celelalte componente = detalii. Montajul real în 3D este în tabul „Montajul real (3D)”.</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – Arduino Mega 2560</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div>
          <div class="tk-cod-sus"><b>Plotter serial</b><span style="margin-left:auto"></span><button type="button" data-ved="live" class="activ">Live</button><button type="button" data-ved="rec">Eliberarea înregistrată</button></div>
          <canvas id="tk-plot" aria-label="Plotterul serial: tensiunea senzorului MAP"></canvas></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Programul și mesajele</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Valorile intră în tabele numai din aparate și din program. „Arată pe stand” orientează vederea 3D.</p>
    </aside>
  </div>`,
    init(C) {
      sim.p = P().patm; afiseazaCod(); actualizeazaFw(); dmmCtl(); actualizeaza();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => { inspector(null); planseAfis(); });
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) trimiteSerial(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      $$("[data-ved]").forEach(b => b.addEventListener("click", () => { if (b.dataset.ved === "rec" && !sim.inreg) return Cadru.mesajTemporar("Nu există încă o eliberare înregistrată.", "atentie"); sim.vedere = b.dataset.ved; comutaVedere(); }));
      $$("[data-v3]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v3)));
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $$("#tk-svg [data-k]").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); laClic3d(g.dataset.k); }));
      planseAfis();
      C.mesaj("Pasul 1: ochelarii, colierele strânse, apoi porniți simularea și citiți presiunea atmosferică.", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.serial = []; sim.ist = []; sim.inreg = null; sim.tS = 0; if (Cadru.P) sim.p = P().patm; },
    cadru(dt, C, vizibil) {
      const acum = performance.now(), h = Math.min(dt || 0.016, 0.1) * (sim.rec ? 1 : sim.viteza);
      let rest = h; while (rest > 1e-9) { const d = Math.min(0.01, rest); rest -= d; sim.tS += d; pasPneumatic(d); if (sim.run) pasProgram(); }
      if (sim.etans && !sim.etans.gata && sim.tS - sim.etans.t0 >= 60) { const dp = etalonTxt() - sim.etans.p0; sim.etans.gata = true; sim.etans.dp = dp; sim.etans.ok = strans() && Math.abs(dp) < 0.5;
        Cadru.mesajTemporar(sim.etans.ok ? `Etanșeitate bună: ${fx(dp, 2)} kPa în 60 s.` : `Montajul pierde ${fx(dp, 2)} kPa în 60 s: verificați colierele.`, sim.etans.ok ? "" : "atentie"); }
      if (!vizibil) { if (C.tabActiv === "anim" && acum - (this._t3 || 0) > 120) { this._t3 = acum; citesteDMM(); planseAfis(); sincron3d(); } return; }
      if (acum - (this._to || 0) > 120) { this._to = acum; citesteDMM(); afisaje(); planseAfis(); plotter(); sincron3d(); }
      if (acum - (this._ts || 0) > 400) { this._ts = acum; actualizeazaPasi(); if (pasActiv === 4) cursorAfis();
        C.stare(1, sim.run ? "placa alimentată" : "alimentare oprită", sim.run ? "inc" : ""); C.stare(2, `p = ${fx(pApp(), 1)} kPa abs. (${fx(pRel(), 1)} rel.)`); }
    },
    redeseneaza() { plotter(); },
    formule() {
      const r = [], p = P(); if (!p) return r;
      r.push(["Presiunea absolută (5.1)", `p<sub>abs</sub> = ${fx(MD.bmpP(p), 2)} + (${fx(etalonTxt(), 1)}) = <span class="rez">${fx(MD.bmpP(p) + etalonTxt(), 1)} kPa</span>`]);
      const v = sim.pr && sim.pr.last; if (v && sim.fw) { r.push(["Presiunea din program (5.6)", `p = (${fx(v.u, 3)} − ${sim.fw.B})/${sim.fw.A} = <span class="rez">${fx(v.p, 1)} kPa</span>`]); r.push(["Densitatea (5.7)", `ρ = ${fx(v.p * 1000, 0)}/(287·${fx(v.T + 273.15, 2)}) = <span class="rez">${fx(v.rho, 3)} kg/m³</span>`]); }
      return r;
    }
  }
});
