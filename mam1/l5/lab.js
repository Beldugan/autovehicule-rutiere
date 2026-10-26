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
function sincron3d() {
  if (!SV3) return;
  const mm = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  SV3.seteaza({ prel: pRel(), etalon: etalonTxt().toFixed(1), mod: sim.mod, lent: sim.lent, coliere: sim.coliere.map((c, i) => c && sim.desprins !== i), desprins: sim.desprins, ochelari: sim.ochelari,
    run: sim.run, rec: !!sim.rec, tx: sim.run && performance.now() - sim.tx < 80, oled: sim.run ? oledTxt() : null,
    dmm: { mod: sim.dmm.mod, txt: sim.dmm.txt, u: sim.dmm.u, r: sim.dmm.s.dmmR, b: sim.dmm.s.dmmB }, ceas: mm(sim.tS), ceasP: sim.etans && !sim.etans.gata ? `test etanșeitate ${fx(sim.tS - sim.etans.t0, 0)} s` : (sim.viteza > 1 ? "timp ×" + sim.viteza : "timp real") });
}
function actualizeaza() { citesteDMM(); panou(); afisaje(); sincron3d(); actualizeazaPasi(); }
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
    instr: ["Puneți ochelarii de protecție și strângeți cele trei coliere (clic pe ele sau butoanele de sub stand).", "Porniți simularea; înregistrați p<sub>atm</sub> citit de BMP280.", "Pompa pe <b>Vid</b>, câteva curse până la ≈ −50 kPa, apoi „Test de etanșeitate” și urmăriți etalonul 60 s (scădere admisă &lt; 0,5 kPa)."],
    ctl: () => `<div class="rand-mic"><button type="button" data-et="1">Test de etanșeitate (60 s)</button></div>${ctlVit()}`,
    ver: () => [[sim.ochelari, "ochelarii puși"], [strans(), "colierele strânse"], [sim.run, "programul rulează"], [!!(sim.etans && sim.etans.gata && sim.etans.ok), sim.etans && sim.etans.gata ? `etanșeitate: ${fx(sim.etans.dp, 2)} kPa în 60 s` : "testul de etanșeitate"]],
    prog: () => (pe("t52", "patm", "v") ? 1 : 0) + (sim.etans && sim.etans.ok ? 1 : 0), tot: 2,
    butoane: [["● p<sub>atm</sub> (BMP280) → Tabelul 5.2", inregPatm, "primar"]] },
  { t: "U la presiunea atmosferică", tab: "Tabelul 5.1 – punctul 4", v3: "placa",
    banda: "Pasul 2 · Supapa deschisă (presiune relativă 0), multimetrul V⎓: sonda − pe TP GND, sonda + pe TP U MAP.",
    instr: ["Deschideți supapa lentă până când etalonul arată 0,0 kPa, apoi închideți-o.", "Multimetrul pe <b>V⎓</b>, sondele pe TP U MAP (+) și TP GND (−).", "„● p, U → Tabelul 5.1”."],
    ctl: () => "",
    ver: () => [[sim.run, "senzorul alimentat"], [sim.dmm.mod === "V" && sim.dmm.s.dmmR === "tU" && sim.dmm.s.dmmB === "tGND", "multimetrul pe U MAP / GND"], [Math.abs(etalonTxt()) < 0.6, "presiunea relativă ≈ 0"]],
    prog: () => pe("t51", "p4", "u") ? 1 : 0, tot: 1,
    butoane: [["● p (etalon), U (multimetru) → Tabelul 5.1", inregPt, "primar"]] },
  { t: "Vid în trepte", tab: "Tabelul 5.1 – punctele 1…3", v3: "pneu",
    banda: "Pasul 3 · Pompa pe Vid: curse (plină sau ¼) până la −30, −50, −70 kPa relativ (±6 kPa); după fiecare treaptă așteptați stabilizarea și înregistrați.",
    instr: ["Pompa pe <b>Vid</b>. Cu curse plină / ¼ ajungeți aproape de −30 kPa; ajustați cu supapa lentă.", "Așteptați câteva secunde (aerul destins se încălzește înapoi) și înregistrați.", "Repetați la −50 și −70 kPa (≈ 30 kPa absolut, ca la ralanti în decelerare)."],
    ctl: () => "",
    ver: () => [[strans(), "montaj etanș"], [stabil(), "presiunea stabilizată"], [sim.dmm.mod === "V" && sim.dmm.s.dmmR === "tU", "multimetrul pe U MAP"]],
    prog: () => [1, 2, 3].filter(i => pe("t51", "p" + i, "u")).length, tot: 3,
    butoane: [["● p (etalon), U (multimetru) → Tabelul 5.1", inregPt, "primar"]] },
  { t: "Suprapresiune în trepte", tab: "Tabelul 5.1 – punctele 5…7", v3: "pneu",
    banda: "Pasul 4 · Pompa pe Presiune: +30, +60, +90 kPa relativ. Presiunea absolută = p<sub>atm</sub> + p<sub>rel</sub> (≈ 190 kPa la +90).",
    instr: ["Eliberați vidul (supapa lentă), pompa pe <b>Presiune</b>.", "Treptele +30, +60, +90 kPa relativ (nu se depășește +100 kPa).", "La fiecare treaptă: stabilizare, apoi înregistrare."],
    ctl: () => "",
    ver: () => [[sim.mod === "pres", "pompa pe presiune"], [strans(), "colierele strânse (altfel furtunul sare!)"], [stabil(), "presiunea stabilizată"]],
    prog: () => [5, 6, 7].filter(i => pe("t51", "p" + i, "u")).length, tot: 3,
    butoane: [["● p (etalon), U (multimetru) → Tabelul 5.1", inregPt, "primar"]] },
  { t: "Eliberarea bruscă", tab: "Tabelul 5.2 – timpul de răspuns", v3: "pneu",
    banda: "Pasul 5 · Suprapresiune ≥ +40 kPa, apoi „Eliberare rapidă + înregistrare”: programul eșantionează U la 10 ms. Pe înregistrare: timpul de la 90 % la 10 % din treaptă.",
    instr: ["Pompați la ≈ +60…+90 kPa, programul pornit.", "„Eliberare rapidă + înregistrare” (butonul albastru al pompei).", "Pe plotter: cursorul 90 % pe primul eșantion sub U<sub>90</sub>, cursorul 10 % pe primul eșantion sub U<sub>10</sub>; înregistrați Δt."],
    ctl: () => `<div class="rand-mic"><button type="button" data-rapid="1" class="primar">▶ Eliberare rapidă + înregistrare</button></div>
      <div class="rand-mic">${[["t90", "cursor 90 %"], ["t10", "cursor 10 %"]].map(([k, t]) => `<button type="button" data-ck="${k}" class="${sim.cur.k === k ? "activ" : ""}">${t}</button>`).join("")}</div>
      <label class="cur-l">t [ms] <input type="range" id="cur-t" min="0" max="990" step="10" value="${sim.cur[sim.cur.k]}"></label>
      <div class="rand-mic"><button type="button" data-dc="-10">◀ 10 ms</button><button type="button" data-dc="10">10 ms ▶</button></div><p class="nota" id="cur-info"></p>`,
    ver: () => [[sim.run, "programul rulează"], [!!sim.inreg || !!sim.rec, sim.rec ? "înregistrare…" : "eliberarea înregistrată"]],
    prog: () => pe("t52", "tr", "v") ? 1 : 0, tot: 1,
    butoane: [["● Δt (90 % → 10 %) → Tabelul 5.2", inregTr, "primar"]] },
  { t: "Calibrarea în program, densitatea", tab: "Tabelul 5.3", v3: "placa",
    banda: "Pasul 6 · Opriți simularea, introduceți în cod A și B din regresia voastră, porniți. Comparați p calculat de program cu etalonul la ralanti, la p<sub>atm</sub> și supraalimentat; notați ρ.",
    instr: ["Calculați a și b (fila Determinări) și treceți-le în Tabelul 5.2.", "Opriți simularea, scrieți A = a și B = b în program, porniți.", "Ralanti: vid până la ≈ 35 kPa absolut; atmosferic: supapa deschisă; supraalimentat: ≈ 170 kPa absolut. Înregistrați de pe OLED p și ρ."],
    ctl: () => "",
    ver: () => [[sim.run && sim.fw && !(Math.abs(sim.fw.A - 0.01851) < 1e-9), "programul cu A, B proprii"], [strans() && stabil(), "presiunea stabilizată"]],
    prog: () => Object.keys(MD.PG).filter(k => pe("t53", k, "pP")).length, tot: 3,
    butoane: [["● p, ρ (OLED) → Tabelul 5.3", inregPg, "primar"]] }
];
let pasActiv = 0;
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
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Senzorul de 2,5 bar.</b> Treptele de suprapresiune până la +90 kPa (≈ 190 kPa absolut) cer un senzor MAP pentru motoare supraalimentate (20…250 kPa → 0,4…4,65 V, a ≈ 0,0185 V/kPa – valorile din exemplu); un MAP de 1 bar (10…115 kPa) ar ieși din domeniu peste ≈ +14 kPa.</li>
<li><b>Manometrul etalon este de presiune relativă,</b> iar BMP280 dă presiunea atmosferică; în Tabelul 5.1 p<sub>abs</sub> = p<sub>atm</sub>(BMP280) + p<sub>rel</sub> se calculează automat. Manometrul pompei (cadran în bar) servește doar la orientare.</li>
<li><b>Tensiunea cu multimetrul sau din program.</b> Senzorul este ratiometric: U = U<sub>5V</sub>/5 · (a<sub>0</sub>p + b<sub>0</sub>). Multimetrul măsoară tensiunea absolută, programul calculează N·5/1024 = U·5/U<sub>5V</sub>. Dacă tensiunea USB nu este exact 5 V, panta măsurată cu multimetrul diferă de cea „văzută” de program (≈ 1…3 %) – ECU calibrează senzorii ratiometric, cu propria referință de 5 V. Abaterea apare în Tabelul 5.3.</li>
<li><b>Stabilizarea după o cursă.</b> La comprimare aerul se încălzește (la destindere se răcește), apoi revine la temperatura camerei în câteva secunde: presiunea „se mai mișcă” puțin după fiecare cursă; citirile se fac după stabilizare. Mica scurgere a montajului scade lent depresiunea – de aici testul de etanșeitate.</li>
<li><b>Timpul de răspuns.</b> La eliberarea bruscă presiunea scade aproape exponențial (constanta de timp a descărcării prin supapă și furtun, câteva zeci de ms); senzorul MAP propriu-zis răspunde în ≈ 1 ms. Cu eșantionarea la 10 ms se măsoară timpul de la 90 % la 10 % din treaptă (≈ 2,2 τ), cu rezoluția de 10 ms. S-a adăugat Tabelul 5.3: verificarea calibrării în program și densitatea aerului în trei regimuri; temperatura aerului se ia de la BMP280.</li></ul></div>
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
.m5-3d .m3d { height:clamp(400px, 58vh, 640px); }
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
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Stand</b> · MAM I – Lucrarea 5</span>
        <button type="button" id="tk-fit" title="Încadrează tot">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa"><div id="st3d" class="m5-3d"><p class="nota" style="padding:1rem">Se încarcă standul 3D…</p></div><div class="tk-insp" id="tk-insp" hidden></div><div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-pompa" id="tk-pompa"></div>
      <div class="tk-dmm" id="tk-dmm"></div>
      <div class="tk-afis" id="afis"></div>
      <div class="tk-vederi"><span>Vedere:</span>${[["tot", "Ansamblu"], ["pneu", "Pompa, teul și etalonul"], ["placa", "Placa de test"]].map(([k, t]) => `<button type="button" data-v3="${k}">${t}</button>`).join("")}</div>
      <p class="tk-ajutor">Trageți = rotire · dreapta-trageți = deplasare · rotița = zoom · clic pe pompă = o cursă; clic pe selectorul galben (vid / presiune), pe supapa lentă (cromată), pe butonul albastru (eliberare rapidă), pe coliere, pe ochelari, pe punctele de test (sondele multimetrului) și pe comutatorul multimetrului</p>
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
      <h2>Desfășurarea lucrării</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Valorile intră în tabele numai din aparate și din program. „Arată pe stand” orientează vederea 3D.</p>
    </aside>
  </div>`,
    init(C) {
      sim.p = P().patm; afiseazaCod(); actualizeazaFw(); dmmCtl(); actualizeaza();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => vedere3d("tot"));
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) trimiteSerial(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      $$("[data-ved]").forEach(b => b.addEventListener("click", () => { if (b.dataset.ved === "rec" && !sim.inreg) return Cadru.mesajTemporar("Nu există încă o eliberare înregistrată.", "atentie"); sim.vedere = b.dataset.ved; comutaVedere(); }));
      $$("[data-v3]").forEach(b => b.addEventListener("click", () => vedere3d(b.dataset.v3)));
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      import(BAZA_COMUN + "aparate3d.js?v=9").then(m => { SV3 = m.creeazaStandMAP($("#st3d"), { laClic: laClic3d }); sincron3d(); })
        .catch(e => { console.warn("Standul 3D nu s-a încărcat:", e); $("#st3d").innerHTML = `<p class="nota" style="padding:1rem">Standul 3D nu poate fi afișat pe acest dispozitiv (WebGL). Lucrați cu comenzile și afișajele de mai jos.</p>`; });
      C.mesaj("Pasul 1: ochelarii, colierele strânse, apoi porniți simularea și citiți presiunea atmosferică.", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.serial = []; sim.ist = []; sim.inreg = null; sim.tS = 0; if (Cadru.P) sim.p = P().patm; },
    cadru(dt, C, vizibil) {
      const acum = performance.now(), h = Math.min(dt || 0.016, 0.1) * (sim.rec ? 1 : sim.viteza);
      let rest = h; while (rest > 1e-9) { const d = Math.min(0.01, rest); rest -= d; sim.tS += d; pasPneumatic(d); if (sim.run) pasProgram(); }
      if (sim.etans && !sim.etans.gata && sim.tS - sim.etans.t0 >= 60) { const dp = etalonTxt() - sim.etans.p0; sim.etans.gata = true; sim.etans.dp = dp; sim.etans.ok = strans() && Math.abs(dp) < 0.5;
        Cadru.mesajTemporar(sim.etans.ok ? `Etanșeitate bună: ${fx(dp, 2)} kPa în 60 s.` : `Montajul pierde ${fx(dp, 2)} kPa în 60 s: verificați colierele.`, sim.etans.ok ? "" : "atentie"); }
      if (!vizibil) return;
      if (acum - (this._to || 0) > 120) { this._to = acum; citesteDMM(); afisaje(); plotter(); sincron3d(); }
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
