/* MAM I – Lucrarea 1. Microcontrolere: intrări/ieșiri, convertor A/D, timere, întreruperi și PWM.
   Simulator: standul de lucru (Arduino Mega 2560, STM32F103 „Blue Pill” cu ST-Link, placă de test cu potențiometre,
   buton și LED-uri, generator de semnal), editorul VS Code + PlatformIO cu programele lucrării (compilare, încărcare,
   monitor serial), osciloscop cu 2 canale (măsurători automate) și multimetru. Parametrii plăcilor sunt individuali. */
"use strict";
const MD = MODELE["mam1-l1"];
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea standului */
const sim = {
  alfa: 0.5, alfaS: 0.4, buton: false, gen: true, fw: { mega: null, stm: null }, editor: "mega_adc",
  camp: { stare: "HIGH", stareS: "HIGH", val: 128, cs: "1", icr: 799, ocr: 199, isr: "dw" },
  serial: { mega: [], stm: [] }, tSer: 0, tx: 0, run: false, placaCod: "mega", sketch: { mega: "mega_gpio", stm: "stm_gpio" }, liber: {}, vb: null,
  osc: { tdiv: 10e-6, ruleaza: true, ch: [{ s: "nc", vdiv: 2, poz: -3 }, { s: "nc", vdiv: 2, poz: 1 }], acq: null, tAcq: 0 },
  dmm: { s: "nc", v: 0, tA: 0 }, eventBtn: null
};
function P() { return Cadru.P; }
const PIN_ET = { pin11: "D11 (OC1A)", pin9: "D9 (OC2B)", pin13: "D13 (LED)", pin2: "D2 (INT4)", A0: "A0 (potențiometru)", v5: "5V", PB12: "PB12 (LED STM32)", PA0: "PA0 (potențiometru STM32)", v33: "3V3", off: "—" };

/* ------------------------------------------------------------------ programele (proiecte PlatformIO) */
const PROG = {
  mega_gpio: { placa: "mega", titlu: "mega_gpio", desc: "Ieșire digitală (D13)" },
  mega_adc: { placa: "mega", titlu: "mega_adc", desc: "Convertorul A/D (A0)" },
  mega_aw: { placa: "mega", titlu: "mega_pwm_implicit", desc: "analogWrite() pe D9" },
  mega_t1: { placa: "mega", titlu: "mega_timer1_pwm", desc: "Timer1 Fast PWM pe D11" },
  mega_isr: { placa: "mega", titlu: "mega_intrerupere", desc: "Întreruperea externă pe D2" },
  stm_gpio: { placa: "stm", titlu: "stm32_gpio", desc: "Ieșire digitală (PB12)" },
  stm_adc: { placa: "stm", titlu: "stm32_adc", desc: "ADC 12 biți (PA0)" }
};
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
const inp = (k, w) => `<input class="cd-f" data-cf="${k}" type="number" value="${sim.camp[k]}" style="width:${w}ch">`;
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
function cod(k) {
  switch (k) {
    case "mega_gpio": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}

${K_("void")} setup() {
  pinMode(${N_("13")}, OUTPUT);
  digitalWrite(${N_("13")}, ${sel("stare", [["HIGH", "HIGH"], ["LOW", "LOW"]])});   ${C_("// LED + 220 Ω spre masă")}
}
${K_("void")} loop() { }`;
    case "mega_adc": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}

${K_("void")} setup() { Serial.begin(${N_("115200")}); }

${K_("void")} loop() {
  ${K_("int")} N = analogRead(A0);              ${C_("// 0…1023, referința = AVCC")}
  ${K_("float")} U = N * ${N_("5.0")} / ${N_("1024")};            ${C_("// presupune U_ref = 5,000 V")}
  Serial.print(${S_('"N = "')}); Serial.print(N);
  Serial.print(${S_('"   U = "')}); Serial.println(U, ${N_("3")});
  delay(${N_("200")});
}`;
    case "mega_aw": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}

${K_("void")} setup() {
  pinMode(${N_("9")}, OUTPUT);
  analogWrite(${N_("9")}, ${inp("val", 4)});   ${C_("// 0…255; D9 = OC2B (Timer2, PWM cu fază corectă, P = 64)")}
}
${K_("void")} loop() { }`;
    case "mega_t1": return `${C_("// Timer1, Fast PWM cu TOP = ICR1 (modul 14), pe pinul 11 (OC1A)")}
${K_("#include")} ${S_("&lt;Arduino.h&gt;")}

${K_("void")} setup() {
  pinMode(${N_("11")}, OUTPUT);
  TCCR1A = _BV(COM1A1) | _BV(WGM11);
  TCCR1B = _BV(WGM13) | _BV(WGM12) | ${sel("cs", [["1", "_BV(CS10)"], ["8", "_BV(CS11)"], ["64", "_BV(CS11) | _BV(CS10)"], ["256", "_BV(CS12)"], ["1024", "_BV(CS12) | _BV(CS10)"]])};   ${C_("// prescaler P")}
  ICR1  = ${inp("icr", 8)};             ${C_("// TOP")}
  OCR1A = ${inp("ocr", 8)};             ${C_("// pragul de comparare")}
}
${K_("void")} loop() { }`;
    case "mega_isr": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}

${K_("volatile")} ${K_("uint16_t")} n = ${N_("0")};
${sel("isr", [["dw", "void isr() { digitalWrite(13, !digitalRead(13)); n++; }"], ["port", "void isr() { PINB = _BV(PB7); n++; }            // D13 = PB7"], ["ser", "void isr() { Serial.print(n); digitalWrite(13, !digitalRead(13)); n++; }"]])}

${K_("void")} setup() {
  Serial.begin(${N_("115200")});
  pinMode(${N_("13")}, OUTPUT);
  pinMode(${N_("2")}, INPUT);
  attachInterrupt(digitalPinToInterrupt(${N_("2")}), isr, RISING);   ${C_("// D2 = INT4")}
}
${K_("void")} loop() { }`;
    case "stm_gpio": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}   ${C_("// STM32duino, placa bluepill_f103c8")}

${K_("void")} setup() {
  pinMode(PB12, OUTPUT);
  digitalWrite(PB12, ${sel("stareS", [["HIGH", "HIGH"], ["LOW", "LOW"]])});   ${C_("// LED + 220 Ω spre masă")}
}
${K_("void")} loop() { }`;
    case "stm_adc": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}

${K_("void")} setup() { Serial.begin(${N_("115200")}); analogReadResolution(${N_("12")}); }

${K_("void")} loop() {
  ${K_("int")} N = analogRead(PA0);             ${C_("// 0…4095, referința = VDDA")}
  ${K_("float")} U = N * ${N_("3.3")} / ${N_("4096")};
  Serial.print(${S_('"N = "')}); Serial.print(N);
  Serial.print(${S_('"   U = "')}); Serial.println(U, ${N_("4")});
  delay(${N_("200")});
}`;
  }
  return "";
}
function snapshot(k) {
  const c = sim.camp;
  switch (k) {
    case "mega_gpio": return { prog: k, stare: c.stare === "HIGH" };
    case "mega_aw": return { prog: k, val: Math.round(c.val) };
    case "mega_t1": return { prog: k, P: +c.cs, top: Math.round(c.icr), ocr: Math.round(c.ocr) };
    case "mega_isr": return { prog: k, isr: c.isr };
    case "stm_gpio": return { prog: k, stare: c.stareS === "HIGH" };
    default: return { prog: k };
  }
}
function verificaCod(k) {
  const c = sim.camp;
  if (k === "mega_aw" && !(c.val >= 0 && c.val <= 255 && Number.isInteger(+c.val))) return ["src/main.cpp:5: warning: valoarea pentru analogWrite() trebuie să fie un întreg 0…255"];
  if (k === "mega_t1") {
    if (!(Number.isInteger(+c.icr) && c.icr >= 1 && c.icr <= 65535)) return ["src/main.cpp:9:11: error: ICR1 este un registru de 16 biți (1…65535)"];
    if (!(Number.isInteger(+c.ocr) && c.ocr >= 0 && c.ocr <= 65535)) return ["src/main.cpp:10:11: error: OCR1A este un registru de 16 biți (0…65535)"];
  }
  return null;
}

/* ------------------------------------------------------------------ semnalele de pe pini */
function pinMega() { return sim.fw.mega || {}; }
/** descrierea semnalului: { tip: "dc", v } sau { tip: "pwm", T, ton, v, faza } sau { tip: "isr" } */
function net(s) { return PIN[s] ? PIN[s].net : "nc"; }
function semnal(s) {
  const p = P(), fw = pinMega(), fs = sim.fw.stm || {};
  if (!sim.run) return { tip: "dc", v: 0 };
  switch (s) {
    case "led": { const v = semnal("pin13"); return v.tip === "dc" ? { tip: "dc", v: v.v > 2 ? p.vf : 0 } : { tip: "dc", v: p.vf / 2 }; }
    case "v5": return { tip: "dc", v: p.vcc };
    case "v33": return { tip: "dc", v: p.vdd };
    case "A0": return { tip: "dc", v: sim.alfa * p.vcc };
    case "PA0": return { tip: "dc", v: sim.alfaS * p.vdd };
    case "pin11": {
      if (fw.prog !== "mega_t1") return { tip: "dc", v: 0 };
      const T = fw.P * (fw.top + 1) / p.fclk; if (fw.ocr >= fw.top) return { tip: "dc", v: p.vcc };
      return { tip: "pwm", T, ton: (fw.ocr + 1) / (fw.top + 1) * T, v: p.vcc };
    }
    case "pin9": {
      if (fw.prog !== "mega_aw") return { tip: "dc", v: 0 };
      if (fw.val <= 0) return { tip: "dc", v: 0 }; if (fw.val >= 255) return { tip: "dc", v: p.vcc };
      const T = 64 * 510 / p.fclk; return { tip: "pwm", T, ton: fw.val / 255 * T, v: p.vcc, centrat: true };
    }
    case "pin2": return sim.gen ? { tip: "pwm", T: 1e-3, ton: 0.5e-3, v: 5.0 } : { tip: "dc", v: sim.buton ? 5.0 : 0 };
    case "pin13": {
      if (fw.prog === "mega_gpio") return { tip: "dc", v: MD.uPin(p, "mega", fw.stare ? 1 : 0) };
      if (fw.prog === "mega_isr") return sim.gen ? { tip: "isr" } : { tip: "dc", v: sim.led13 ? MD.uPin(p, "mega", 1) : 0.006 };
      return { tip: "dc", v: 0 };
    }
    case "PB12": return fs.prog === "stm_gpio" ? { tip: "dc", v: MD.uPin(p, "stm", fs.stare ? 1 : 0) } : { tip: "dc", v: 0 };
  }
  return { tip: "dc", v: 0 };
}
function latenta(fw) { const p = P(); const j = (Math.random() - 0.5) * 0.38; return fw.isr === "port" ? p.latP + j * 0.5 : fw.isr === "ser" ? p.lat + 16.5 + Math.random() * 3 : p.lat + j; }
/** o achiziție a osciloscopului: fereastra de 10 diviziuni, declanșare pe frontul crescător al CH1, 1 div pre-declanșare */
function achizitie() {
  const o = sim.osc, W = o.tdiv * 10, N = 1200, t0 = -o.tdiv, dt = W / N;
  const s1 = semnal(net(o.ch[0].s)), fw = pinMega();
  const lat = latenta(fw);
  const pts = [[], []], s = [s1, semnal(net(o.ch[1].s))];
  // pentru D2 (generator) ↔ D13 (întrerupere): D13 comută după latență la fiecare front crescător al lui D2
  let stareInit = Math.random() < 0.5 ? 1 : 0;
  const valoare = (sg, t) => {
    if (sg.tip === "dc") return sg.v * (1 + (Math.random() - 0.5) * 0.002);
    if (sg.tip === "pwm") { const ph = ((t % sg.T) + sg.T) % sg.T; const pp = sg.centrat ? Math.abs(ph - sg.T / 2) < sg.ton / 2 : ph < sg.ton; return pp ? sg.v : 0; }
    if (sg.tip === "isr") { const T = 1e-3; const k = Math.floor((t - lat * 1e-6) / T); const st = (stareInit + (k + 1)) % 2; return st ? MD.uPin(P(), "mega", 1) : 0.006; }
    return 0;
  };
  for (let c = 0; c < 2; c++) for (let i = 0; i <= N; i++) { const t = t0 + i * dt; pts[c].push(!PIN[o.ch[c].s] ? null : SEMNALE.achizitie(valoare(s[c], t), o.ch[c].vdiv, 8, 8, o.ch[c].poz)); }
  // măsurătorile automate
  const m = {};
  if (s1.tip === "pwm") { m.f = 1 / s1.T * (1 + (Math.random() - 0.5) * 4e-5); m.dc = s1.ton / s1.T * 100 + (Math.random() - 0.5) * 0.04; m.vavg = s1.ton / s1.T * s1.v; }
  if (net(o.ch[0].s) === "pin2" && net(o.ch[1].s) === "pin13" && fw.prog === "mega_isr" && sim.gen) m.lat = lat;
  o.acq = { pts, t0, dt, N, m };
}
function evenimentButon() {
  // apăsarea butonului: fronturi multiple (vibrația contactelor), capturate dacă CH1 = D2
  const o = sim.osc, fw = pinMega();
  if (fw.prog === "mega_isr") { const k = 3 + Math.floor(Math.random() * 3); sim.n = (sim.n || 0) + k; for (let i = 0; i < k; i++) sim.led13 = !sim.led13; }
  if (net(o.ch[0].s) !== "pin2" || sim.gen) return;
  const W = o.tdiv * 10, N = 1200, t0 = -o.tdiv, dt = W / N, fr = [0]; let t = 0; const nb = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < nb * 2 - 1; i++) { t += (40e-6 + Math.random() * 400e-6) * (1 + i * 0.4); fr.push(t); }
  const lat = latenta(fw);
  const pts = [[], []];
  for (let i = 0; i <= N; i++) {
    const tt = t0 + i * dt; let k = fr.filter(x => x <= tt).length; const v1 = k % 2 ? 5 : 0;
    let tog = 0; if (fw.prog === "mega_isr") { for (let j = 0; j < fr.length; j += 2) if (tt >= fr[j] + lat * 1e-6) tog++; }
    pts[0].push(v1); pts[1].push(!PIN[o.ch[1].s] ? null : net(o.ch[1].s) === "pin13" ? ((tog % 2) ? MD.uPin(P(), "mega", 1) : 0.006) : valoareDC(net(o.ch[1].s)));
  }
  o.acq = { pts, t0, dt, N, m: net(o.ch[1].s) === "pin13" && fw.prog === "mega_isr" ? { lat, bounce: nb } : {} };
  o.ruleaza = false; deseneazaOsc();
}
function valoareDC(s) { const sg = semnal(s); return sg.tip === "dc" ? sg.v : 0; }

/* ------------------------------------------------------------------ instrumentele (pe planșa de lucru, ca în Tinkercad Circuits) */
const TDIV = [0.5e-6, 1e-6, 2e-6, 5e-6, 10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3];
const VDIV = [0.5, 1, 2, 5];
const CUL = ["#f2d600", "#1fb6ff"];
function fmtT(s) { return s >= 1e-3 ? fx(s * 1e3, 0) + " ms" : s >= 1e-6 ? fx(s * 1e6, s < 1e-5 ? (s < 1e-6 ? 2 : 1) : 0).replace(",0", "") + " µs" : fx(s * 1e9, 0) + " ns"; }
function fmtF(f) { return f >= 1000 ? fx(f / 1000, 4) + " kHz" : fx(f, 2) + " Hz"; }
// ecranul osciloscopului de pe planșă
const OS = { x: 412, y: 62, w: 392, h: 216 };
function deseneazaOsc() {
  const g = $("#osc-urme"); if (!g) return;
  const o = sim.osc, a = o.acq, dx = OS.w / 10, dy = OS.h / 8;
  let s = "";
  if (a && sim.run) for (let c = 1; c >= 0; c--) {
    const ch = o.ch[c]; if (!PIN[ch.s]) continue;
    const y0 = OS.y + OS.h / 2 - ch.poz * dy;
    let d = ""; a.pts[c].forEach((v, i) => { if (v === null) return; const x = OS.x + i / a.N * OS.w, y = Math.max(OS.y, Math.min(OS.y + OS.h, y0 - v / ch.vdiv * dy)); d += (d ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); });
    s += `<path d="${d}" fill="none" stroke="${CUL[c]}" stroke-width="1.6"/><path d="M${OS.x - 1},${y0} l-7,-4 v8 z" fill="${CUL[c]}"/>`;
  }
  g.innerHTML = s;
  const m = a && sim.run ? a.m : {}, lin = [];
  if (m.f) lin.push(`Freq ${fmtF(m.f)}`, `+Duty ${fx(m.dc, 2)} %`, `Vavg ${fx(m.vavg, 3)} V`);
  if (m.lat) lin.push(`Delay 1↑→2 ${fx(m.lat, 2)} µs`);
  if (m.bounce) lin.push(`${m.bounce * 2 - 1} fronturi pe D2 (vibrație)`);
  $("#osc-m").textContent = lin.join("  ·  ");
  $("#osc-h").textContent = `${o.ruleaza ? "RUN" : "STOP"}   H ${fmtT(o.tdiv)}/div   CH1 ${fx(o.ch[0].vdiv, 1)} V/div   CH2 ${fx(o.ch[1].vdiv, 1)} V/div`;
  $("#osc-runb").textContent = o.ruleaza ? "STOP" : "RUN";
  $("#osc-cit").textContent = lin.join("   ·   ");
}
function citesteDMM() {
  const el = $("#dmm-v"); if (!el) return;
  if (!sim.run) { el.textContent = "- - - -"; sim.dmm.v = 0; return; }
  if (!PIN[sim.dmm.s]) { sim.dmm.v = Math.round((Math.random() - 0.5) * 0.004 * 1000) / 1000; el.textContent = Math.abs(sim.dmm.v).toFixed(3) + " V"; return; }
  const sg = semnal(PIN[sim.dmm.s].net);
  let v = sg.tip === "dc" ? sg.v : sg.tip === "pwm" ? sg.ton / sg.T * sg.v : sg.tip === "isr" ? MD.uPin(P(), "mega", 1) / 2 : 0;
  v = Math.round((v + (Math.random() - 0.5) * 0.0014) * 1000) / 1000;
  sim.dmm.v = Math.max(0, v); el.textContent = sim.dmm.v.toFixed(3) + " V";
}
function linieSerial() {
  if (!sim.run) return;
  const fw = pinMega(), fs = sim.fw.stm || {}, p = P(), out = [];
  if (fw.prog === "mega_adc") { const U = sim.alfa * p.vcc, N = Math.max(0, Math.min(1023, MD.codADC(p, "mega", U) + (Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0))); sim.nMega = N; out.push(["mega", `N = ${N}   U = ${(N * 5.0 / 1024).toFixed(3)}`]); }
  if (fw.prog === "mega_isr" && fw.isr === "ser" && sim.gen) out.push(["mega", `${(sim.n = (sim.n || 0) + 200)}${sim.n + 1}${sim.n + 2}…`]);
  if (fs.prog === "stm_adc") { const U = sim.alfaS * p.vdd, N = Math.max(0, Math.min(4095, MD.codADC(p, "stm", U) + Math.round((Math.random() - 0.5) * 4))); sim.nStm = N; out.push(["stm", `N = ${N}   U = ${(N * 3.3 / 4096).toFixed(4)}`]); }
  if (!out.length) return;
  out.forEach(([b, l]) => { const a = sim.serial[b]; a.push(l); while (a.length > 200) a.shift(); });
  sim.tx = performance.now();
  afiseazaSerial();
}
function afiseazaSerial() { const el = $("#tk-serial"); if (!el || el.hidden) return; el.textContent = sim.serial[sim.placaCod].join("\n"); el.scrollTop = el.scrollHeight; }

/* ------------------------------------------------------------------ planșa de lucru (SVG, stil Tinkercad Circuits) */
// pinii pe care se pot pune sondele: poziție, denumire (ca în Tinkercad), rețeaua electrică
const PIN = {};
function pin(id, x, y, et, net) { PIN[id] = { x, y, et, net: net || id }; return `<rect class="tk-pin" data-pin="${id}" x="${x - 3.6}" y="${y - 3.6}" width="7.2" height="7.2" rx="1"/>`; }
const W_ = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3.4}" stroke-linejoin="round" stroke-linecap="round"/>` + `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="2.6" fill="${c}"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="2.6" fill="${c}"/>`;
function header(x, y, n, pas, cul) { let s = `<rect x="${x - 5}" y="${y - 5}" width="${(n - 1) * pas + 10}" height="10" rx="1.5" fill="${cul || "#202020"}"/>`; for (let i = 0; i < n; i++) s += `<rect x="${x + i * pas - 2}" y="${y - 2}" width="4" height="4" fill="#5a5a5a"/>`; return s; }
function planseSVG() {
  let s = `<svg id="tk-svg" viewBox="0 0 1300 790" role="img" aria-label="Planșa de lucru: Arduino Mega 2560, placa de test, STM32 Blue Pill, generator de funcții, osciloscop și multimetru">
<defs>
 <filter id="umbra" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter>
 <pattern id="tk-gauri" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#f3f3f1"/><rect x="3.5" y="3.5" width="3" height="3" fill="#b9b9b5"/></pattern>
 <radialGradient id="tk-led" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe7c2"/><stop offset=".45" stop-color="rgba(255,60,40,.85)"/><stop offset="1" stop-color="rgba(255,40,30,0)"/></radialGradient>
 <linearGradient id="tk-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a5c"/><stop offset="1" stop-color="#c81e14"/></linearGradient>
</defs>
<rect x="-2000" y="-2000" width="5300" height="4790" fill="#fbfbfb" id="tk-fundal"/>`;
  // ---- generatorul de funcții
  s += `<g class="tk-comp" data-comp="gen" filter="url(#umbra)"><rect x="40" y="40" width="300" height="160" rx="8" fill="#e6e6e6" stroke="#b5b5b5"/>
  <rect x="56" y="56" width="170" height="70" rx="4" fill="#173a2a"/><text id="gen-l1" x="66" y="84" font-size="18" fill="#7dffa0" font-family="monospace">1.000 kHz</text><text id="gen-l2" x="66" y="108" font-size="12" fill="#7dffa0" font-family="monospace">⎍  5.00 Vpp   +2.50 V</text>
  ${[0, 1, 2].map(i => `<circle cx="${252 + (i % 2) * 40}" cy="${70 + Math.floor(i / 2) * 44}" r="14" fill="#444"/><line x1="${252 + (i % 2) * 40}" y1="${70 + Math.floor(i / 2) * 44}" x2="${252 + (i % 2) * 40}" y2="${58 + Math.floor(i / 2) * 44}" stroke="#ddd" stroke-width="2"/>`).join("")}
  <g id="gen-out" style="cursor:pointer"><rect x="276" y="104" width="54" height="22" rx="4" fill="#3a3a3a"/><text x="303" y="119" font-size="10" fill="#fff" text-anchor="middle">OUTPUT</text></g><circle id="gen-led" cx="321" cy="136" r="4" fill="#3cff4a"/>
  <text x="56" y="146" font-size="11" fill="#333" font-weight="700">Generator de funcții</text><text x="56" y="162" font-size="10" fill="#666">Frecvență · Amplitudine · Offset</text>
  <circle cx="290" cy="180" r="7" fill="#d32f2f"/><circle cx="318" cy="180" r="7" fill="#222"/><text x="290" y="172" font-size="9" text-anchor="middle" fill="#333">+</text><text x="318" y="172" font-size="9" text-anchor="middle" fill="#333">−</text></g>`;
  // ---- osciloscopul
  s += `<g class="tk-comp" data-comp="osc" filter="url(#umbra)"><rect x="390" y="30" width="436" height="300" rx="10" fill="#d9d9d9" stroke="#a9a9a9"/>
  <rect x="${OS.x - 6}" y="${OS.y - 6}" width="${OS.w + 12}" height="${OS.h + 30}" rx="4" fill="#0b0e12"/>
  ${Array.from({ length: 11 }, (_, i) => `<line x1="${OS.x + i * OS.w / 10}" y1="${OS.y}" x2="${OS.x + i * OS.w / 10}" y2="${OS.y + OS.h}" stroke="rgba(150,170,190,${i === 5 ? .5 : .18})"/>`).join("")}
  ${Array.from({ length: 9 }, (_, j) => `<line x1="${OS.x}" y1="${OS.y + j * OS.h / 8}" x2="${OS.x + OS.w}" y2="${OS.y + j * OS.h / 8}" stroke="rgba(150,170,190,${j === 4 ? .5 : .18})"/>`).join("")}
  <path d="M${OS.x + OS.w / 10},${OS.y} l-5,-5 h10 z" fill="#ff9b3d"/>
  <g id="osc-urme"></g><text id="osc-h" x="${OS.x + 2}" y="${OS.y + OS.h + 11}" font-size="9" fill="#9fb3c8" font-family="monospace"></text><text id="osc-m" x="${OS.x + 2}" y="${OS.y + OS.h + 21}" font-size="9.5" fill="#ffe96b" font-family="monospace"></text>
  <text x="404" y="47" font-size="10" fill="#333" font-weight="700">Osciloscop – 2 canale</text>
  ${[["tdiv-", "T/div −", 420], ["tdiv+", "T/div +", 478], ["v1-", "CH1 V −", 548], ["v1+", "CH1 V +", 606], ["v2-", "CH2 V −", 676], ["v2+", "CH2 V +", 734]].map(([k, t, x]) => `<g class="tk-btn" data-ob="${k}" style="cursor:pointer"><rect x="${x}" y="306" width="54" height="18" rx="3" fill="#f4f4f4" stroke="#999"/><text x="${x + 27}" y="319" font-size="9" text-anchor="middle" fill="#222">${t}</text></g>`).join("")}
  <g class="tk-btn" data-ob="run" style="cursor:pointer"><rect x="770" y="40" width="46" height="20" rx="3" fill="#c62828"/><text id="osc-runb" x="793" y="54" font-size="10" fill="#fff" text-anchor="middle" font-weight="700">STOP</text></g>
  <circle cx="432" cy="333" r="7" fill="${CUL[0]}" stroke="#555"/><circle cx="474" cy="333" r="7" fill="${CUL[1]}" stroke="#555"/><text x="432" y="349" font-size="9" text-anchor="middle" fill="#333">CH1</text><text x="474" y="349" font-size="9" text-anchor="middle" fill="#333">CH2</text></g>`;
  // ---- multimetrul
  s += `<g class="tk-comp" data-comp="dmm" filter="url(#umbra)"><rect x="866" y="36" width="176" height="262" rx="14" fill="#3b3f45"/><rect x="876" y="46" width="156" height="242" rx="10" fill="#4a4f56"/>
  <rect x="888" y="58" width="132" height="54" rx="4" fill="#bfd0b0" stroke="#222" stroke-width="2"/><text id="dmm-v" x="1012" y="96" font-size="25" fill="#1d2414" text-anchor="end" font-family="monospace" font-weight="700">- - - -</text>
  ${[["A", 900], ["V", 954], ["Ω", 1008]].map(([t, x]) => `<rect x="${x - 18}" y="128" width="36" height="22" rx="4" fill="${t === "V" ? "#f2b705" : "#6c727a"}"/><text x="${x}" y="143" font-size="12" text-anchor="middle" fill="${t === "V" ? "#222" : "#ddd"}" font-weight="700">${t}</text>`).join("")}
  <circle cx="954" cy="200" r="38" fill="#2a2d31" stroke="#666"/><line x1="954" y1="200" x2="954" y2="168" stroke="#f2b705" stroke-width="4"/><text x="954" y="252" font-size="10" fill="#ddd" text-anchor="middle">Multimetru · V DC</text>
  <circle cx="914" cy="276" r="7" fill="#222" stroke="#999"/><circle cx="994" cy="276" r="7" fill="#d32f2f" stroke="#999"/><text x="914" y="266" font-size="8" fill="#ccc" text-anchor="middle">COM</text><text x="994" y="266" font-size="8" fill="#ccc" text-anchor="middle">V</text></g>`;
  // ---- Arduino Mega 2560
  const mx = 40, my = 400;
  s += `<g class="tk-comp" data-comp="mega" filter="url(#umbra)"><rect x="${mx}" y="${my}" width="470" height="222" rx="9" fill="#00878f"/>
  ${[[14, 14], [14, 208], [456, 14], [456, 208], [380, 110]].map(([x, y]) => `<circle cx="${mx + x}" cy="${my + y}" r="5.5" fill="#fff" stroke="#00656b"/>`).join("")}
  <rect x="${mx - 16}" y="${my + 40}" width="56" height="46" rx="3" fill="#c9cdd2" stroke="#8a9096"/><rect x="${mx - 12}" y="${my + 140}" width="58" height="40" rx="4" fill="#1b1b1b"/>
  <rect x="${mx + 190}" y="${my + 70}" width="84" height="84" rx="2" fill="#262626"/><text x="${mx + 232}" y="${my + 110}" fill="#bbb" font-size="8" text-anchor="middle" font-family="monospace">ATMEGA2560</text><text x="${mx + 232}" y="${my + 122}" fill="#888" font-size="7" text-anchor="middle" font-family="monospace">16AU</text>
  <rect x="${mx + 92}" y="${my + 52}" width="26" height="26" fill="#262626"/><rect x="${mx + 130}" y="${my + 60}" width="22" height="9" rx="3" fill="#dcdcdc"/>
  <text x="${mx + 300}" y="${my + 185}" fill="#fff" font-size="15" font-weight="800" font-family="sans-serif">ARDUINO</text><text x="${mx + 300}" y="${my + 201}" fill="#fff" font-size="10" font-family="sans-serif">MEGA 2560</text>
  <circle cx="${mx + 420}" cy="${my + 60}" r="4" fill="#3cff4a"/><text x="${mx + 420}" y="${my + 74}" fill="#fff" font-size="7" text-anchor="middle">ON</text>
  <rect id="ledL" x="${mx + 180}" y="${my + 34}" width="8" height="5" fill="#6b4a12"/><text x="${mx + 192}" y="${my + 39}" fill="#fff" font-size="7">L</text>
  <rect id="ledTX" x="${mx + 140}" y="${my + 34}" width="8" height="5" fill="#5a4a1a"/><text x="${mx + 151}" y="${my + 39}" fill="#fff" font-size="7">TX</text>
  ${header(mx + 150, my + 14, 10, 12)}${header(mx + 285, my + 14, 8, 12)}${header(mx + 150, my + 206, 8, 12)}${header(mx + 265, my + 206, 16, 12)}${header(mx + 452, my + 30, 2, 12).replace('width="22"', 'width="22"')}
  ${["SCL", "SDA", "AREF", "GND", "13", "12", "~11", "~10", "~9", "~8"].map((t, i) => `<text x="${mx + 150 + i * 12}" y="${my + 30}" font-size="5.6" fill="#fff" text-anchor="middle" transform="rotate(-90 ${mx + 150 + i * 12} ${my + 30})">${t}</text>`).join("")}
  ${["~7", "~6", "~5", "~4", "~3", "~2", "TX→1", "RX←0"].map((t, i) => `<text x="${mx + 285 + i * 12}" y="${my + 30}" font-size="5.6" fill="#fff" transform="rotate(-90 ${mx + 285 + i * 12} ${my + 30})" text-anchor="end" dx="-1">${t}</text>`).join("")}
  ${["", "IOREF", "RESET", "3.3V", "5V", "GND", "GND", "Vin"].map((t, i) => `<text x="${mx + 150 + i * 12}" y="${my + 198}" font-size="5.6" fill="#fff" transform="rotate(-90 ${mx + 150 + i * 12} ${my + 198})">${t}</text>`).join("")}
  ${Array.from({ length: 16 }, (_, i) => `<text x="${mx + 265 + i * 12}" y="${my + 198}" font-size="5.6" fill="#fff" transform="rotate(-90 ${mx + 265 + i * 12} ${my + 198})">A${i}</text>`).join("")}
  <text x="${mx + 230}" y="${my + 50}" fill="#fff" font-size="8" font-weight="700">DIGITAL (PWM~)</text><text x="${mx + 300}" y="${my + 166}" fill="#fff" font-size="8" font-weight="700">ANALOG IN</text><text x="${mx + 150}" y="${my + 166}" fill="#fff" font-size="8" font-weight="700">POWER</text></g>`;
  const D = n => [mx + 150 + (13 - n + 4) * 12, my + 14], Dlo = n => [mx + 285 + (7 - n) * 12, my + 14], PWR = i => [mx + 150 + i * 12, my + 206], AN = i => [mx + 265 + i * 12, my + 206];
  s += pin("pin13", ...D(13), "Pinul digital 13 (LED L, PB7)") + pin("pin11", ...D(11), "Pinul digital 11 ~ (OC1A)") + pin("pin9", ...D(9), "Pinul digital 9 ~ (OC2B)") + pin("pin2", ...Dlo(2), "Pinul digital 2 ~ (INT4)") + pin("A0", ...AN(0), "Pinul analogic A0") + pin("v5", ...PWR(4), "5V") + pin("gndM", ...PWR(5), "GND", "gnd") + pin("v33M", ...PWR(3), "3.3V", "v33");
  // ---- placa de test (breadboard)
  const bx = 560, by = 380;
  s += `<g class="tk-comp" data-comp="bb" filter="url(#umbra)"><rect x="${bx}" y="${by}" width="430" height="280" rx="6" fill="url(#tk-gauri)" stroke="#d2d2cc"/>
  <line x1="${bx + 10}" y1="${by + 6}" x2="${bx + 420}" y2="${by + 6}" stroke="#e53935" stroke-width="1.5"/><line x1="${bx + 10}" y1="${by + 30}" x2="${bx + 420}" y2="${by + 30}" stroke="#1e63d6" stroke-width="1.5"/>
  <line x1="${bx + 10}" y1="${by + 250}" x2="${bx + 420}" y2="${by + 250}" stroke="#e53935" stroke-width="1.5"/><line x1="${bx + 10}" y1="${by + 274}" x2="${bx + 420}" y2="${by + 274}" stroke="#1e63d6" stroke-width="1.5"/>
  <rect x="${bx}" y="${by + 132}" width="430" height="14" fill="#e9e9e4"/>
  ${Array.from({ length: 30 }, (_, i) => `<text x="${bx + 16 + i * 13.5}" y="${by + 44}" font-size="5.5" fill="#999" text-anchor="middle">${i + 1}</text>`).join("")}</g>`;
  // potențiometrul (A0)
  s += `<g class="tk-comp" data-comp="pot"><g id="pot" style="cursor:grab"><rect x="${bx + 52}" y="${by + 70}" width="62" height="58" rx="6" fill="#2c66b8" stroke="#123a75" filter="url(#umbra)"/><circle cx="${bx + 83}" cy="${by + 96}" r="23" fill="#d9dde3" stroke="#7f868e"/><circle cx="${bx + 83}" cy="${by + 96}" r="16" fill="#eef0f3"/><path id="potAc" d="M${bx + 83},${by + 96} l0,-19" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/></g>
  ${[0, 1, 2].map(i => `<rect x="${bx + 66 + i * 17}" y="${by + 128}" width="4" height="12" fill="#9aa0a6"/>`).join("")}<text x="${bx + 83}" y="${by + 64}" font-size="9" text-anchor="middle" fill="#444">Potențiometru 10 kΩ</text></g>`;
  // butonul (D2) cu rezistorul de 10 kΩ spre masă
  s += `<g class="tk-comp" data-comp="btn"><g id="btn" style="cursor:pointer"><rect x="${bx + 270}" y="${by + 150}" width="40" height="40" rx="3" fill="#2b2b2b" filter="url(#umbra)"/><circle id="btnC" cx="${bx + 290}" cy="${by + 170}" r="11" fill="#555" stroke="#111"/></g>
  ${[[268, 152], [308, 152], [268, 188], [308, 188]].map(([x, y]) => `<rect x="${bx + x}" y="${by + y}" width="4" height="4" fill="#9aa0a6"/>`).join("")}<text x="${bx + 290}" y="${by + 205}" font-size="9" text-anchor="middle" fill="#444">Buton (D2)</text>
  <rect x="${bx + 316}" y="${by + 214}" width="40" height="11" rx="5" fill="#e8d3a6" stroke="#a88a55"/><rect x="${bx + 322}" y="${by + 214}" width="3" height="11" fill="#7a4a1b"/><rect x="${bx + 328}" y="${by + 214}" width="3" height="11" fill="#222"/><rect x="${bx + 334}" y="${by + 214}" width="3" height="11" fill="#f39c12"/><rect x="${bx + 345}" y="${by + 214}" width="3" height="11" fill="#c9a640"/><text x="${bx + 336}" y="${by + 236}" font-size="8" text-anchor="middle" fill="#444">10 kΩ</text></g>`;
  // rezistorul de 220 Ω și LED-ul (D13)
  s += `<g class="tk-comp" data-comp="led"><rect x="${bx + 196}" y="${by + 84}" width="46" height="12" rx="6" fill="#e8d3a6" stroke="#a88a55"/>${[[203, "#c62828"], [210, "#c62828"], [217, "#7a4a1b"], [230, "#c9a640"]].map(([x, c]) => `<rect x="${bx + x}" y="${by + 84}" width="3.4" height="12" fill="${c}"/>`).join("")}
  <line x1="${bx + 186}" y1="${by + 90}" x2="${bx + 196}" y2="${by + 90}" stroke="#9aa0a6" stroke-width="2"/><line x1="${bx + 242}" y1="${by + 90}" x2="${bx + 262}" y2="${by + 90}" stroke="#9aa0a6" stroke-width="2"/><text x="${bx + 219}" y="${by + 78}" font-size="8" text-anchor="middle" fill="#444">220 Ω</text>
  <circle id="ledG" cx="${bx + 275}" cy="${by + 80}" r="26" fill="url(#tk-led)" opacity="0"/><path d="M${bx + 265},${by + 90} v-14 a10,10 0 0 1 20,0 v14 z" fill="url(#tk-cap)" stroke="#8a1610"/><path id="ledR" d="M${bx + 265},${by + 90} v-14 a10,10 0 0 1 20,0 v14 z" fill="#ffd1c9" opacity="0"/>
  <rect x="${bx + 262}" y="${by + 90}" width="26" height="4" fill="#c81e14"/><line x1="${bx + 270}" y1="${by + 94}" x2="${bx + 270}" y2="${by + 106}" stroke="#9aa0a6" stroke-width="2"/><line x1="${bx + 280}" y1="${by + 94}" x2="${bx + 280}" y2="${by + 110}" stroke="#9aa0a6" stroke-width="2"/><text x="${bx + 300}" y="${by + 80}" font-size="9" fill="#444">LED</text></g>`;
  s += pin("pot", bx + 85, by + 140, "Cursorul potențiometrului (A0)", "A0") + pin("ledA", bx + 270, by + 108, "Anodul LED-ului", "led") + pin("rez", bx + 186, by + 90, "Rezistorul 220 Ω (spre D13)", "pin13") + pin("gndBB", bx + 400, by + 274, "Rândul − (GND)", "gnd") + pin("v5BB", bx + 400, by + 250, "Rândul + (5V)", "v5") + pin("btnD2", bx + 268, by + 192, "Butonul (D2)", "pin2");
  // ---- STM32 Blue Pill + ST-Link + placa de test mică
  const px = 1040, py = 440;
  s += `<g class="tk-comp" data-comp="bp" filter="url(#umbra)"><rect x="${px}" y="${py}" width="232" height="86" rx="4" fill="#1f4fbf"/>${header(px + 12, py + 8, 20, 11.2)}${header(px + 12, py + 78, 20, 11.2)}
  <g transform="translate(${px + 120} ${py + 43}) rotate(45)"><rect x="-17" y="-17" width="34" height="34" rx="2" fill="#262626"/></g><text x="${px + 120}" y="${py + 46}" font-size="5.5" fill="#bbb" text-anchor="middle" font-family="monospace">STM32F103</text>
  <rect x="${px - 12}" y="${py + 32}" width="18" height="22" rx="3" fill="#c9cdd2"/><rect x="${px + 50}" y="${py + 26}" width="14" height="9" fill="#f2c94c"/><rect x="${px + 50}" y="${py + 38}" width="14" height="9" fill="#f2c94c"/>
  <text x="${px + 170}" y="${py + 50}" font-size="10" fill="#e8eeff" font-weight="700">BLUE PILL</text>
  ${["PB12", "PB13", "PB14", "PB15", "PA8"].map((t, i) => `<text x="${px + 12 + i * 11.2}" y="${py + 22}" font-size="4.6" fill="#fff" transform="rotate(-90 ${px + 12 + i * 11.2} ${py + 22})" text-anchor="end">${t}</text>`).join("")}
  ${["GND", "GND", "3.3", "NRST", "PB11", "PB10", "PB1", "PB0", "PA7", "PA6", "PA5", "PA4", "PA3", "PA2", "PA1", "PA0"].map((t, i) => `<text x="${px + 12 + (19 - i) * 11.2}" y="${py + 70}" font-size="4.6" fill="#fff" transform="rotate(-90 ${px + 12 + (19 - i) * 11.2} ${py + 70})">${t}</text>`).join("")}</g>
  <g filter="url(#umbra)"><rect x="${px + 120}" y="${py - 70}" width="110" height="44" rx="6" fill="#b9bec4" stroke="#7f858b"/><text x="${px + 175}" y="${py - 44}" font-size="10" text-anchor="middle" fill="#222" font-weight="700">ST-LINK V2</text></g>
  <g filter="url(#umbra)"><rect x="${px}" y="${py + 120}" width="232" height="140" rx="5" fill="url(#tk-gauri)" stroke="#d2d2cc"/><line x1="${px + 8}" y1="${py + 128}" x2="${px + 224}" y2="${py + 128}" stroke="#e53935" stroke-width="1.5"/><line x1="${px + 8}" y1="${py + 252}" x2="${px + 224}" y2="${py + 252}" stroke="#1e63d6" stroke-width="1.5"/></g>
  <g id="potS" style="cursor:grab"><rect x="${px + 28}" y="${py + 160}" width="54" height="50" rx="6" fill="#2c66b8" stroke="#123a75"/><circle cx="${px + 55}" cy="${py + 183}" r="18" fill="#d9dde3" stroke="#7f868e"/><path id="potSAc" d="M${px + 55},${py + 183} l0,-14" stroke="#2b2b2b" stroke-width="3.5" stroke-linecap="round"/></g><text x="${px + 55}" y="${py + 226}" font-size="8" text-anchor="middle" fill="#444">10 kΩ (PA0)</text>
  <rect x="${px + 120}" y="${py + 176}" width="40" height="11" rx="5" fill="#e8d3a6" stroke="#a88a55"/><text x="${px + 140}" y="${py + 200}" font-size="8" text-anchor="middle" fill="#444">220 Ω</text>
  <circle id="ledSG" cx="${px + 185}" cy="${py + 170}" r="22" fill="url(#tk-led)" opacity="0"/><path d="M${px + 176},${py + 182} v-12 a9,9 0 0 1 18,0 v12 z" fill="url(#tk-cap)" stroke="#8a1610"/><text x="${px + 200}" y="${py + 168}" font-size="8" fill="#444">LED PB12</text>`;
  const BPu = i => [px + 12 + i * 11.2, py + 8], BPd = i => [px + 12 + i * 11.2, py + 78];
  s += pin("PB12", ...BPu(0), "PB12 (ieșire, LED)") + pin("PA0", ...BPd(4), "PA0 (ADC1_IN0)") + pin("v33", ...BPd(17), "3.3V (STM32)") + pin("gndS", ...BPd(19), "GND (STM32)", "gnd");
  // ---- firele (culorile ca pe stand)
  const fire = [
    [[PWR(4), [PWR(4)[0], 700], [600, 700], [600, by + 250]], "#e53935"], [[PWR(5), [PWR(5)[0], 712], [612, 712], [612, by + 274]], "#222"],
    [[[bx + 66, by + 140], [bx + 66, by + 250]], "#e53935"], [[[bx + 100, by + 140], [bx + 100, by + 274]], "#222"],
    [[AN(0), [AN(0)[0], 688], [bx + 84, 688], [bx + 84, by + 142]], "#f2c230"],
    [[D(13), [D(13)[0], 372], [bx + 186, 372], [bx + 186, by + 90]], "#ff8a1f"],
    [[[bx + 280, by + 110], [bx + 280, by + 30]], "#222"],
    [[Dlo(2), [Dlo(2)[0], 360], [bx + 268, 360], [bx + 268, by + 150]], "#2fa84f"], [[[bx + 312, by + 150], [bx + 312, by + 6]], "#e53935"],
    [[[bx + 316, by + 219], [bx + 290, by + 219], [bx + 290, by + 192]], "#9aa0a6"], [[[bx + 356, by + 219], [bx + 370, by + 219], [bx + 370, by + 274]], "#222"],
    [[[bx + 400, by + 250], [bx + 418, by + 250], [bx + 418, by + 6], [bx + 400, by + 6]], "#e53935"], [[[bx + 400, by + 274], [bx + 424, by + 274], [bx + 424, by + 30], [bx + 400, by + 30]], "#222"],
    [[[290, 187], [290, 352], [Dlo(2)[0] - 2, 352], [Dlo(2)[0] - 2, my + 14]], "#2fa84f"], [[[318, 187], [318, 340], [bx - 10, 340], [bx - 10, by + 30], [bx + 10, by + 30]], "#222"],
    [[BPd(17), [BPd(17)[0], py + 128]], "#e53935"], [[BPd(19), [BPd(19)[0], py + 252]], "#222"],
    [[BPd(4), [BPd(4)[0], py + 105], [px + 55, py + 105], [px + 55, py + 160]], "#f2c230"], [[BPu(0), [BPu(0)[0], py - 18], [px - 20, py - 18], [px - 20, py + 181], [px + 120, py + 181]], "#ff8a1f"],
    [[[px + 160, py + 181], [px + 176, py + 181]], "#9aa0a6"], [[[px + 194, py + 182], [px + 194, py + 252]], "#222"],
    [[[px + 135, py - 26], [px + 135, py + 8]], "#6a1b9a", 2.6], [[[px + 150, py - 26], [px + 150, py + 8]], "#00897b", 2.6], [[[px + 165, py - 26], [px + 165, py + 8]], "#222", 2.6], [[[px + 180, py - 26], [px + 180, py + 8]], "#e53935", 2.6]
  ];
  s += `<g id="tk-fire" style="pointer-events:none">${fire.map(([p, c, w]) => W_(p, c, w)).join("")}</g>`;
  // ---- cablurile instrumentelor (masele fixe) și sondele mobile
  s += `<g style="pointer-events:none">${W_([[914, 283], [914, 330], [bx + 425, 330], [bx + 425, by + 284], [bx + 400, by + 284], [bx + 400, by + 274]], "#222", 2.4)}${W_([[318, 187], [318, 340]], "#222", 2.4)}</g>`;
  s += `<g id="tk-sonde"></g><g id="tk-tip" style="pointer-events:none" visibility="hidden"><rect rx="4" fill="#2b2b2b" opacity=".92"/><text font-size="11" fill="#fff"></text></g>`;
  s += `<text id="tk-timp" x="650" y="22" text-anchor="middle" font-size="12" fill="#555"></text>`;
  return s + `</svg>`;
}
// sondele: capătul fix (borna instrumentului) și vârful mobil
const SONDE = [
  { id: "dmm", x0: 994, y0: 283, cul: "#d32f2f", et: "V" },
  { id: "ch0", x0: 432, y0: 340, cul: CUL[0], et: "1" },
  { id: "ch1", x0: 474, y0: 340, cul: CUL[1], et: "2" }
];
const LOC_SONDE = { dmm: [1010, 360], ch0: [430, 372], ch1: [472, 386] };
function sursaSonda(id) { return id === "dmm" ? sim.dmm.s : sim.osc.ch[+id.slice(2)].s; }
function seteazaSonda(id, s) { if (id === "dmm") sim.dmm.s = s; else sim.osc.ch[+id.slice(2)].s = s; }
function capatSonda(sd) { const s = sursaSonda(sd.id); return PIN[s] ? [PIN[s].x, PIN[s].y] : sim.liber[sd.id] || LOC_SONDE[sd.id]; }
function cale(sd, tx, ty) { const cy = Math.max(sd.y0, ty) + 60; return `M${sd.x0},${sd.y0} C${sd.x0},${cy} ${tx},${cy} ${tx},${ty + 30}`; }
function desenSonde() {
  const g = $("#tk-sonde"); if (!g) return;
  g.innerHTML = SONDE.map(sd => {
    const [tx, ty] = capatSonda(sd);
    return `<path id="lead-${sd.id}" d="${cale(sd, tx, ty)}" fill="none" stroke="${sd.cul}" stroke-width="3" opacity=".9" style="pointer-events:none"/>
      <g class="tk-sonda" data-sonda="${sd.id}" transform="translate(${tx},${ty})" style="cursor:grab"><path d="M0,0 l-4,8 v22 h8 v-22 z" fill="${sd.cul}" stroke="#222" stroke-width="1"/><circle cx="0" cy="36" r="9" fill="${sd.cul}" stroke="#222"/><text x="0" y="40" font-size="10" text-anchor="middle" font-weight="700" fill="#111">${sd.et}</text></g>`;
  }).join("");
  $$("#tk-sonde .tk-sonda").forEach(el => legaSonda(el));
}
function ptSVG(e) { const svg = $("#tk-svg"), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function legaSonda(el) {
  const id = el.dataset.sonda, sd = SONDE.find(x => x.id === id);
  el.addEventListener("pointerdown", e => {
    e.stopPropagation(); el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing"; sim.tragSonda = true;
    const p0 = ptSVG(e), [tx0, ty0] = capatSonda(sd), dx = p0.x - tx0, dy = p0.y - ty0;
    const muta = ev => { const p = ptSVG(ev), x = p.x - dx, y = p.y - dy; el.setAttribute("transform", `translate(${x},${y})`); $("#lead-" + id).setAttribute("d", cale(sd, x, y)); evidentiazaPin({ x, y }); };
    const gata = ev => {
      el.removeEventListener("pointermove", muta); el.removeEventListener("pointerup", gata); sim.tragSonda = false;
      const p = ptSVG(ev), x = p.x - dx, y = p.y - dy; let best = null, dmin = 18;
      Object.entries(PIN).forEach(([k, q]) => { const d = Math.hypot(q.x - x, q.y - y); if (d < dmin) { dmin = d; best = k; } });
      if (best) seteazaSonda(id, best); else { seteazaSonda(id, "nc"); sim.liber[id] = [x, y]; }
      evidentiazaPin(null); desenSonde(); achizitie(); deseneazaOsc(); citesteDMM();
    };
    el.addEventListener("pointermove", muta); el.addEventListener("pointerup", gata);
  });
}
function evidentiazaPin(p) {
  $$("#tk-svg .tk-pin").forEach(r => r.classList.remove("aproape"));
  if (!p) { arataTip(null); return; }
  let best = null, dmin = 18; Object.entries(PIN).forEach(([k, q]) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < dmin) { dmin = d; best = k; } });
  if (best) { $(`#tk-svg [data-pin="${best}"]`).classList.add("aproape"); arataTip(best); } else arataTip(null);
}
function arataTip(k) {
  const g = $("#tk-tip"); if (!g) return;
  if (!k) { g.setAttribute("visibility", "hidden"); return; }
  const q = PIN[k], t = g.querySelector("text"), r = g.querySelector("rect");
  t.textContent = q.et; t.setAttribute("x", q.x + 12); t.setAttribute("y", q.y - 12);
  const w = q.et.length * 6.3 + 12; r.setAttribute("x", q.x + 6); r.setAttribute("y", q.y - 26); r.setAttribute("width", w); r.setAttribute("height", 20);
  g.setAttribute("visibility", "visible");
}
// zoom și deplasare (ca în Tinkercad: rotița = zoom, tragere pe fundal = deplasare)
const VB0 = [0, 0, 1300, 790];
function seteazaVB(vb) { sim.vb = vb; $("#tk-svg").setAttribute("viewBox", vb.map(v => v.toFixed(1)).join(" ")); }
function legaPlansa() {
  const svg = $("#tk-svg"); sim.vb = VB0.slice();
  svg.addEventListener("wheel", e => {
    e.preventDefault(); const p = ptSVG(e), k = e.deltaY > 0 ? 1.12 : 1 / 1.12, [x, y, w, h] = sim.vb;
    const nw = Math.max(260, Math.min(1900, w * k)), nh = nw * h / w;
    seteazaVB([p.x - (p.x - x) * nw / w, p.y - (p.y - y) * nh / h, nw, nh]);
  }, { passive: false });
  let pan = null;
  $("#tk-fundal").addEventListener("pointerdown", e => { pan = { x: e.clientX, y: e.clientY, vb: sim.vb.slice() }; svg.setPointerCapture(e.pointerId); inspector(null); });
  svg.addEventListener("pointermove", e => {
    if (pan) { const r = svg.getBoundingClientRect(), s = pan.vb[2] / r.width; seteazaVB([pan.vb[0] - (e.clientX - pan.x) * s, pan.vb[1] - (e.clientY - pan.y) * s, pan.vb[2], pan.vb[3]]); return; }
    const t = e.target; if (t.classList && t.classList.contains("tk-pin")) arataTip(t.dataset.pin); else if (!sim.tragSonda) arataTip(null);
  });
  svg.addEventListener("pointerup", () => { pan = null; });
  // potențiometrele
  const unghi = a => -135 + 270 * a;
  const potRot = () => {
    const a1 = unghi(sim.alfa) * Math.PI / 180, a2 = unghi(sim.alfaS) * Math.PI / 180;
    $("#potAc").setAttribute("d", `M643,476 l${(Math.sin(a1) * 19).toFixed(1)},${(-Math.cos(a1) * 19).toFixed(1)}`);
    $("#potSAc").setAttribute("d", `M1095,623 l${(Math.sin(a2) * 14).toFixed(1)},${(-Math.cos(a2) * 14).toFixed(1)}`);
  };
  potRot();
  const trage = (id, cx, cy, k) => {
    const el = $(id); let act = false;
    const set = e => { const p = ptSVG(e); let u = Math.atan2(p.x - cx, cy - p.y) * 180 / Math.PI; u = Math.max(-135, Math.min(135, u)); sim[k] = Math.round((u + 135) / 270 * 1000) / 1000; potRot(); };
    el.addEventListener("pointerdown", e => { e.stopPropagation(); act = true; el.setPointerCapture(e.pointerId); set(e); });
    el.addEventListener("pointermove", e => { if (act) set(e); });
    el.addEventListener("pointerup", () => { act = false; });
    el.addEventListener("wheel", e => { e.preventDefault(); e.stopPropagation(); sim[k] = Math.max(0, Math.min(1, sim[k] - Math.sign(e.deltaY) * 0.005)); potRot(); }, { passive: false });
  };
  trage("#pot", 643, 476, "alfa"); trage("#potS", 1095, 623, "alfaS");
  const b = $("#btn");
  b.addEventListener("pointerdown", e => { e.stopPropagation(); sim.buton = true; $("#btnC").setAttribute("r", "9.5"); $("#btnC").setAttribute("fill", "#333"); if (!sim.gen && sim.run) evenimentButon(); });
  ["pointerup", "pointerleave"].forEach(ev => b.addEventListener(ev, () => { sim.buton = false; $("#btnC").setAttribute("r", "11"); $("#btnC").setAttribute("fill", "#555"); }));
  $("#gen-out").addEventListener("click", e => { e.stopPropagation(); sim.gen = !sim.gen; genAfis(); achizitie(); deseneazaOsc(); });
  $$("[data-ob]").forEach(el => el.addEventListener("click", e => {
    e.stopPropagation(); const k = el.dataset.ob, o = sim.osc;
    if (k === "run") { o.ruleaza = !o.ruleaza; deseneazaOsc(); return; }
    if (k.startsWith("tdiv")) { const i = TDIV.indexOf(o.tdiv) + (k.endsWith("+") ? 1 : -1); o.tdiv = TDIV[Math.max(0, Math.min(TDIV.length - 1, i))]; }
    else { const c = k[1] === "1" ? 0 : 1, i = VDIV.indexOf(o.ch[c].vdiv) + (k.endsWith("+") ? 1 : -1); o.ch[c].vdiv = VDIV[Math.max(0, Math.min(VDIV.length - 1, i))]; }
    achizitie(); deseneazaOsc();
  }));
  $$(".tk-comp").forEach(g => g.addEventListener("click", e => { if (e.target.closest("[data-ob],#gen-out,#pot,#potS,#btn")) return; inspector(g.dataset.comp); }));
}
function genAfis() { $("#gen-led").setAttribute("fill", sim.gen ? "#3cff4a" : "#333"); $("#gen-l1").setAttribute("opacity", sim.gen && sim.run ? 1 : 0.25); $("#gen-l2").setAttribute("opacity", sim.gen && sim.run ? 1 : 0.25); }
// panoul de proprietăți al componentei selectate (ca inspectorul din Tinkercad)
const INSP = {
  gen: () => ["Generator de funcții", [["Formă de undă", "dreptunghiulară"], ["Frecvență", "1 kHz"], ["Amplitudine", "5 Vpp"], ["Offset", "2,5 V"], ["Ieșire", sim.gen ? "pornită" : "oprită"]]],
  osc: () => ["Osciloscop", [["Timp pe diviziune", fmtT(sim.osc.tdiv)], ["CH1", (PIN[sim.osc.ch[0].s] || {}).et || "neconectat"], ["CH2", (PIN[sim.osc.ch[1].s] || {}).et || "neconectat"], ["Declanșare", "front crescător CH1, 2,5 V"]]],
  dmm: () => ["Multimetru", [["Mod", "tensiune (V)"], ["Sonda roșie", (PIN[sim.dmm.s] || {}).et || "neconectată"], ["Sonda neagră", "GND"]]],
  mega: () => ["Arduino Mega 2560", [["Microcontroler", "ATmega2560, 16 MHz"], ["Alimentare", "USB (5 V nominal)"], ["Program", sim.fw.mega ? PROG[sim.fw.mega.prog].titlu : "—"]]],
  bp: () => ["STM32F103C8 „Blue Pill”", [["Nucleu", "ARM Cortex-M3, 72 MHz"], ["Programator", "ST-Link V2"], ["Program", sim.fw.stm ? PROG[sim.fw.stm.prog].titlu : "—"]]],
  pot: () => ["Potențiometru", [["Rezistență", "10 kΩ"], ["Poziție", fx(sim.alfa * 100, 1) + " %"]]],
  btn: () => ["Buton", [["Tip", "buton cu 4 terminale"], ["Rezistor de coborâre", "10 kΩ spre GND"]]],
  led: () => ["LED", [["Culoare", "roșu"], ["Rezistor serie", "220 Ω"]]],
  bb: () => ["Placă de test", [["Mărime", "jumătate (30 de coloane)"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}
function actualizeazaLeduri(acum) {
  const fw = pinMega(), fs = sim.fw.stm || {};
  let v = 0;
  if (sim.run) { if (fw.prog === "mega_gpio") v = fw.stare ? 1 : 0; else if (fw.prog === "mega_isr") v = sim.gen ? 0.5 : (sim.led13 ? 1 : 0); }
  $("#ledR").setAttribute("opacity", v * 0.7); $("#ledG").setAttribute("opacity", v * 0.95); $("#ledL").setAttribute("fill", v ? "#ffc23a" : "#6b4a12");
  $("#ledTX").setAttribute("fill", sim.run && acum - sim.tx < 60 ? "#ffd04a" : "#5a4a1a");
  $("#ledSG").setAttribute("opacity", sim.run && fs.prog === "stm_gpio" && fs.stare ? 0.95 : 0);
}

/* ------------------------------------------------------------------ editorul de cod și simularea (ca în Tinkercad) */
function afiseazaCod() {
  const pl = sim.placaCod, k = sim.sketch[pl];
  $("#tk-sk").innerHTML = Object.entries(PROG).filter(([, p]) => p.placa === pl).map(([kk, p]) => `<option value="${kk}"${kk === k ? " selected" : ""}>${p.desc} (${p.titlu})</option>`).join("");
  $("#tk-cod").innerHTML = cod(k).split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.tagName === "SELECT" ? el.value : num(el.value); }); });
  $("#tk-sk").disabled = sim.run; $("#tk-blocat").hidden = !sim.run;
  afiseazaSerial();
}
function eroriCompilare() {
  const out = [];
  ["mega", "stm"].forEach(pl => { const k = sim.sketch[pl], e = verificaCod(k); if (e) out.push([PROG[k].titlu, e[0]]); });
  return out;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  const er = eroriCompilare(), bara = $("#tk-erori");
  const grave = er.filter(([, m]) => m.includes("error"));
  if (grave.length) { bara.hidden = false; bara.innerHTML = grave.map(([t, m]) => `<b>${t}</b>: ${m}`).join("<br>"); return; }
  bara.hidden = !er.length; bara.innerHTML = er.map(([t, m]) => `<b>${t}</b>: ${m}`).join("<br>");
  sim.fw = { mega: snapshot(sim.sketch.mega), stm: snapshot(sim.sketch.stm) };
  sim.run = true; sim.t0 = performance.now(); sim.n = 0; sim.led13 = false; sim.nMega = undefined; sim.nStm = undefined;
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  genAfis(); afiseazaCod(); actualizeazaFw(); achizitie(); deseneazaOsc(); citesteDMM();
}
function opresteSim() {
  sim.run = false; sim.fw = { mega: null, stm: null };
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza"); $("#tk-timp").textContent = "";
  genAfis(); afiseazaCod(); actualizeazaFw(); deseneazaOsc(); citesteDMM();
}
function actualizeazaFw() {
  const f = sim.fw.mega, s = sim.fw.stm;
  const d = f => !f ? "—" : PROG[f.prog].titlu + (f.prog === "mega_t1" ? ` (P = ${f.P}, ICR1 = ${f.top}, OCR1A = ${f.ocr})` : f.prog === "mega_aw" ? ` (valoare ${f.val})` : f.prog === "mega_isr" ? ` (ISR: ${{ dw: "digitalWrite", port: "PINB", ser: "Serial + digitalWrite" }[f.isr]})` : f.stare !== undefined ? ` (${f.stare ? "HIGH" : "LOW"})` : "");
  if ($("#fw-mega")) { $("#fw-mega").textContent = d(f); $("#fw-stm").textContent = d(s); }
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const rot = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
function inregGPIO(e) {
  const s = net(sim.dmm.s), fw = sim.fw.mega || {}, fs = sim.fw.stm || {};
  let placa, stare;
  if (s === "pin13" && fw.prog === "mega_gpio") { placa = "mega"; stare = fw.stare; }
  else if (s === "PB12" && fs.prog === "stm_gpio") { placa = "stm"; stare = fs.stare; }
  else return Cadru.mesajTemporar("Porniți simularea cu schița de ieșire digitală (mega_gpio sau stm32_gpio) și trageți sonda roșie a multimetrului pe pinul de ieșire (13 sau PB12).", "atentie");
  const U = sim.dmm.v, r = stare ? "UOH" : "UOL";
  const ok = Cadru.inregistreaza(e, { log: { m: "gpio", placa, stare: stare ? 1 : 0, U }, celule: [{ t: "t11", r, c: placa, v: U.toFixed(3) }] });
  if (ok) msg(`Tabelul 1.1: ${r} ${placa === "mega" ? "Arduino Mega" : "STM32F103"} = ${fx(U, 3)} V.`);
}
function inregADC(e, placa) {
  const fw = placa === "mega" ? sim.fw.mega || {} : sim.fw.stm || {}, pin = placa === "mega" ? "A0" : "PA0";
  if (fw.prog !== (placa === "mega" ? "mega_adc" : "stm_adc")) return Cadru.mesajTemporar(`Porniți simularea cu schița ${placa === "mega" ? "mega_adc" : "stm32_adc"} și deschideți monitorul serial.`, "atentie");
  if (net(sim.dmm.s) !== pin) return Cadru.mesajTemporar(`Puneți sonda multimetrului pe ${pin} (cursorul potențiometrului).`, "atentie");
  const N = placa === "mega" ? sim.nMega : sim.nStm; if (N === undefined) return Cadru.mesajTemporar("Așteptați prima linie pe monitorul serial.", "atentie");
  const tb = placa === "mega" ? "t12" : "t12b", chei = placa === "mega" ? ["p1", "p2", "p3", "p4", "p5"] : ["s1", "s2", "s3"], r = $("#sel-punct-" + placa).value;
  const U = sim.dmm.v;
  const alt = chei.filter(k => k !== r).map(k => num(Cadru.D.t[tb][k].U)).filter(Number.isFinite);
  if (alt.some(u => Math.abs(u - U) < 0.3)) return Cadru.mesajTemporar("Alegeți poziții ale potențiometrului distanțate cu cel puțin 0,3 V, pe tot domeniul.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "adc", placa, U, N }, celule: [{ t: tb, r, c: "U", v: U.toFixed(3) }, { t: tb, r, c: "N", v: String(N) }] });
  if (ok) { msg(`Tabelul ${placa === "mega" ? "1.2" : "1.2b"}, punctul ${r.slice(1)}: U = ${fx(U, 3)} V, N = ${N}.`); const i = chei.indexOf(r); if (i < chei.length - 1) $("#sel-punct-" + placa).value = chei[i + 1]; }
}
function inregPWM(e) {
  const fw = sim.fw.mega || {}, a = sim.osc.acq;
  if (fw.prog === "mega_aw") {
    if (fw.val !== 128) return Cadru.mesajTemporar("Pentru rândul analogWrite() folosiți analogWrite(9, 128).", "atentie");
    if (net(sim.osc.ch[0].s) !== "pin9" || !a || !a.m.f) return Cadru.mesajTemporar("Conectați CH1 al osciloscopului pe D9 și ajustați baza de timp până apar măsurătorile automate.", "atentie");
    const f = rot(a.m.f, 1), dc = rot(a.m.dc, 2);
    const ok = Cadru.inregistreaza(e, { log: { m: "aw", f, dc }, celule: [{ t: "t13", r: "aw", c: "f", v: f.toFixed(1) }, { t: "t13", r: "aw", c: "dc", v: dc.toFixed(2) }] });
    if (ok) msg(`Tabelul 1.3 (analogWrite): f = ${fx(f, 1)} Hz, DC = ${fx(dc, 2)} %.`); return;
  }
  if (fw.prog !== "mega_t1") return Cadru.mesajTemporar("Porniți simularea cu schița mega_timer1_pwm (sau mega_pwm_implicit pentru rândul analogWrite).", "atentie");
  if (fw.P !== 1 || fw.top !== 799 || !MD.OCR.includes(fw.ocr)) return Cadru.mesajTemporar("Tabelul 1.3 se completează cu P = 1 (CS10), ICR1 = 799 și OCR1A = 199, 399 sau 599.", "atentie");
  if (net(sim.osc.ch[0].s) !== "pin11" || !a || !a.m.f) return Cadru.mesajTemporar("Conectați CH1 al osciloscopului pe D11 (OC1A) și alegeți o bază de timp potrivită (de ex. 10 µs/div).", "atentie");
  if (net(sim.dmm.s) !== "pin11") return Cadru.mesajTemporar("Puneți și sonda multimetrului pe D11 pentru tensiunea medie.", "atentie");
  const f = Math.round(a.m.f), dc = rot(a.m.dc, 2), um = sim.dmm.v, r = "o" + fw.ocr;
  const ok = Cadru.inregistreaza(e, { log: { m: "pwm", ocr: fw.ocr, f, dc, um }, celule: [{ t: "t13", r, c: "f", v: String(f) }, { t: "t13", r, c: "dc", v: dc.toFixed(2) }, { t: "t13", r, c: "um", v: um.toFixed(3) }] });
  if (ok) msg(`Tabelul 1.3 (OCR1A = ${fw.ocr}): f = ${f} Hz, DC = ${fx(dc, 2)} %, U_med = ${fx(um, 3)} V.`);
}
function inregLat(e) {
  const fw = sim.fw.mega || {}, a = sim.osc.acq;
  if (fw.prog !== "mega_isr" || fw.isr === "ser") return Cadru.mesajTemporar("Porniți simularea cu schița mega_intrerupere cu rutina digitalWrite() sau cu scrierea directă în PINB.", "atentie");
  if (!a || !a.m.lat) return Cadru.mesajTemporar("CH1 pe D2, CH2 pe D13, generatorul pornit (sau o apăsare de buton cu osciloscopul în așteptare) și baza de timp de 1…2 µs/div.", "atentie");
  const col = fw.isr === "port" ? "port" : "dw", r = ["m1", "m2", "m3"].find(k => Cadru.D.t.t14[k][col] === "") || "m3";
  const v = rot(a.m.lat, 2);
  const ok = Cadru.inregistreaza(e, { log: { m: "lat", v: col, t: v }, celule: [{ t: "t14", r, c: col, v: v.toFixed(2) }] });
  if (ok) msg(`Tabelul 1.4 (${col === "dw" ? "digitalWrite" : "PINB"}), măsurarea ${r.slice(1)}: ${fx(v, 2)} µs.`);
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaMAM1(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), cel = { t12: {}, t12b: {}, t13: {}, t14: {} }, rele = { t12: {} };
  const pts = [];
  ["p1", "p2", "p3", "p4", "p5"].forEach(k => { const U = num(t.t12[k].U), N = num(t.t12[k].N), Nc = Number.isFinite(U) ? Math.floor(U * 1024 / 5) : NaN, ab = Number.isFinite(N) && Number.isFinite(Nc) ? N - Nc : NaN;
    cel.t12[k] = { Nc: Number.isFinite(Nc) ? String(Nc) : "", ab: Number.isFinite(ab) ? (ab > 0 ? "+" : "") + ab : "" }; rele.t12[k] = { ab: Math.abs(ab) > 2 }; if (Number.isFinite(U) && Number.isFinite(N)) pts.push([U, N]); });
  ["s1", "s2", "s3"].forEach(k => { const U = num(t.t12b[k].U), N = num(t.t12b[k].N), Nc = Number.isFinite(U) ? Math.floor(U * 4096 / 3.3) : NaN, ab = Number.isFinite(N) && Number.isFinite(Nc) ? N - Nc : NaN;
    cel.t12b[k] = { Nc: Number.isFinite(Nc) ? String(Nc) : "", ab: Number.isFinite(ab) ? (ab > 0 ? "+" : "") + ab : "" }; });
  [...MD.OCR.map(c => ["o" + c, c]), ["aw", null]].forEach(([k, c]) => { const dcc = c === null ? 128 / 255 * 100 : MD.dc(c, 799); cel.t13[k] = { dcc: fx(dcc, 2), umc: c === null ? "—" : fx(dcc / 100 * 5, 3) }; });
  const med = col => { const v = ["m1", "m2", "m3"].map(k => num(t.t14[k][col])).filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
  const lDw = med("dw"), lP = med("port");
  const rez = [
    ["Rezoluția ADC: Arduino Mega (10 biți, 5 V) / STM32F103 (12 biți, 3,3 V)", `${fx(5 / 1024 * 1000, 2)} mV / ${fx(3.3 / 4096 * 1000, 3)} mV`],
    ["Tensiunea de referință reală estimată (panta N = f(U), Tabelul 1.2)", Number.isFinite(o.uref) ? `<span style="color:var(--accent)">${fx(o.uref, 3)} V</span>` : "min. un punct cu N ≥ 50"],
    ["Frecvența reală a ceasului (f<sub>PWM</sub>·800)", Number.isFinite(o.fclk) ? `${fx(o.fclk, 4)} MHz (abatere ${fx((o.fclk / 16 - 1) * 100, 2)} %)` : "—"],
    ["Latența medie a întreruperii: digitalWrite() / PINB", `${Number.isFinite(lDw) ? fx(lDw, 2) + " µs" : "—"} / ${Number.isFinite(lP) ? fx(lP, 2) + " µs" : "—"}`]
  ];
  const verdicte = [];
  if (Number.isFinite(o.uref)) verdicte.push(Math.abs(o.uref - 5) > 0.05 ? { tip: "atentie", text: `Abaterile din Tabelul 1.2 nu sunt erori ale convertorului: placa este alimentată prin USB cu ≈ ${fx(o.uref, 2)} V, iar ADC-ul folosește această tensiune (AVCC) ca referință. Codul N rămâne proporțional cu poziția potențiometrului (montaj ratiometric); greșit este doar calculul U = N·5,0/1024 din program.` } : { tip: "ok", text: "Tensiunea de referință este practic 5 V – abaterile sunt de ordinul zgomotului (±1…2 LSB)." });
  if (Number.isFinite(lDw) && Number.isFinite(lP)) verdicte.push({ tip: "ok", text: `Scrierea directă în registru reduce latența de ≈ ${fx(lDw / lP, 1)} ori: digitalWrite() caută în tabele portul și bitul pinului și verifică timerul asociat.` });
  const serii = [{ tip: "pct", pts, culoare: 0 }, { tip: "linie", pts: [[0, 0], [5, 1024]], culoare: 1, punctat: true }];
  if (Number.isFinite(o.uref)) serii.push({ tip: "linie", pts: [[0, -0.5], [5, 5 * 1024 / o.uref - 0.5]], culoare: 2 });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Caracteristica convertorului A/D al plăcii Arduino Mega: N = f(U)",
    grafic: { xmin: 0, xmax: 5, ymin: 0, ymax: 1100, xticks: [0, 1, 2, 3, 4, 5], xlab: "U [V]", ylab: "N [–]", serii },
    legenda: [["citiri (Tabelul 1.2)", "var(--serie-0)", "pct"], ["ideal, U_ref = 5 V", "var(--serie-1)"], ["cu U_ref estimată", "var(--serie-2)"]],
    principal: { eticheta: "U_ref estimată [V]", valoare: Number.isFinite(o.uref) ? +o.uref.toFixed(3) : null }
  };
}

/* ------------------------------------------------------------------ conținut didactic (după îndrumar, revizuit) */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Standul se alimentează numai după verificarea cablajului de către cadrul didactic; sursa de laborator se setează la 5 V cu limitarea curentului la 0,5 A.</li>
<li>Montajul se modifică numai cu alimentarea deconectată (cablul USB scos și sursa oprită); nu se scurtcircuitează pinii plăcii – un pin al ATmega2560 suportă cel mult 40 mA, iar un pin al STM32F103 cel mult 25 mA.</li>
<li>Pe STM32F103 intrările sunt de 3,3 V: nu se aplică 5 V pe pinii care nu sunt marcați „FT” (5 V tolerant).</li>
<li>Componentele CMOS se manipulează după descărcarea electricității statice (atingerea plăcii metalice de montaj).</li>
<li>Cablurile USB și de măsură se așază astfel încât să nu poată fi agățate; nu se consumă lichide lângă stand.</li></ul></div>
<h2>1.1. Scopul lucrării</h2>
<p>Cunoașterea resurselor unui microcontroler folosit ca unitate de control didactică și programarea lor în C: ieșiri și intrări digitale, întreruperi externe, convertorul analog-digital, timere și generarea semnalelor PWM. Se măsoară cu osciloscopul frecvența PWM, factorul de umplere și latența întreruperii și se compară cu valorile calculate.</p>
<h2>1.2. Noțiuni teoretice</h2>
<p>O unitate de control electronic (ECU) conține un microcontroler care citește senzorii prin intrări digitale, convertorul analog-digital (ADC), timere de captură și interfețe seriale (I²C, SPI, CAN) și comandă actuatorii prin ieșiri digitale și PWM (Fig. 1.1). În laborator se folosesc Arduino Mega 2560 (ATmega2560, 8 biți, 16 MHz, ADC de 10 biți, 5 V) și STM32F103 (ARM Cortex-M3, 32 de biți, 72 MHz, ADC de 12 biți, 3,3 V) – acesta din urmă este mai apropiat de microcontrolerele auto pe 32 de biți.</p>
<figure><img src="img/fig1_1.jpg" alt="Fig. 1.1 Resursele microcontrolerului" loading="lazy"><figcaption>Fig. 1.1. Resursele microcontrolerului și legătura lor cu senzorii și actuatorii standului</figcaption></figure>
<p>Convertorul A/D cu n biți împarte domeniul 0…U<sub>ref</sub> în 2<sup>n</sup> trepte; mărimea unei trepte (LSB) este rezoluția în tensiune. Codul obținut pentru o tensiune U este:</p>
<div class="ec"><span>LSB = U<sub>ref</sub>/2<sup>n</sup></span><span class="nr">(1.1)</span></div>
<div class="ec"><span>N = ⌊U·2<sup>n</sup>/U<sub>ref</sub>⌋, &nbsp; 0 ≤ N ≤ 2<sup>n</sup> − 1</span><span class="nr">(1.2)</span></div>
<div class="ec"><span>U ≈ N·LSB</span><span class="nr">(1.3)</span></div>
<p>Semnalul PWM (modulație în lățimea impulsului) are frecvența fixă și durata stării active variabilă; valoarea medie a tensiunii este proporțională cu factorul de umplere DC. Frecvența se obține din ceasul timerului f<sub>clk</sub>, prescalerul P și valoarea maximă de numărare TOP:</p>
<div class="ec"><span>f<sub>PWM</sub> = f<sub>clk</sub>/(P·(TOP + 1))</span><span class="nr">(1.4)</span></div>
<div class="ec"><span>DC = t<sub>on</sub>/T·100 = (OCR + 1)/(TOP + 1)·100 [%]</span><span class="nr">(1.5)</span></div>
<div class="ec"><span>U<sub>med</sub> = DC/100·U<sub>s</sub></span><span class="nr">(1.6)</span></div>
<figure><img src="img/fig1_2.jpg" alt="Fig. 1.2 Semnale PWM și cuantizarea ADC" loading="lazy"><figcaption>Fig. 1.2. Semnale PWM cu factori de umplere diferiți și cuantizarea ADC pe 10 biți</figcaption></figure>
<p>Funcția analogWrite() din Arduino generează PWM de ≈ 490 Hz (pe Mega, pinii 4 și 13, legați de timerul 0, au ≈ 980 Hz). Pentru actuatori auto (lucrarea 9) se folosesc 16…25 kHz, peste pragul audibil, configurând direct timerul. Întreruperile permit reacția la evenimente fără interogare continuă; latența lor (câteva microsecunde) se măsoară cu osciloscopul, între frontul semnalului de intrare și frontul ieșirii comutate în rutina de întrerupere.</p>
<pre class="cod">// Timer1, Fast PWM cu TOP = ICR1 (modul 14), 20 kHz pe pinul 11 (OC1A)
void setup() {
  pinMode(11, OUTPUT);
  TCCR1A = _BV(COM1A1) | _BV(WGM11);
  TCCR1B = _BV(WGM13) | _BV(WGM12) | _BV(CS10);   // P = 1
  ICR1 = 799;                 // f = 16 MHz / 800 = 20 kHz
  OCR1A = 199;                // DC = 200 / 800 = 25 %
  attachInterrupt(digitalPinToInterrupt(2), isr, RISING);
}
volatile uint16_t n = 0;
void isr() { digitalWrite(13, !digitalRead(13)); n++; }
void loop() { int N = analogRead(A0); float U = N * 5.0 / 1024; }</pre>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Relația (1.2).</b> În textul tipărit, paranteza din relația (1.2) apare ca o integrală (∫): este o eroare de tipărire – corect este partea întreagă ⌊…⌋ (trunchierea), iar codul este limitat la 2<sup>n</sup> − 1 (1023 la 10 biți), deci U = U<sub>ref</sub> nu dă 1024.</li>
<li><b>Montaj ratiometric.</b> Potențiometrul este alimentat de la aceeași tensiune care servește drept referință ADC-ului (AVCC), deci codul N depinde numai de poziția cursorului, nu și de tensiunea de alimentare. Abaterile din Tabelul 1.2 apar pentru că N calculat presupune 5,000 V, iar placa alimentată prin USB are 4,7…4,95 V. Același principiu se folosește la senzorii auto (pedală, MAP, TPS), alimentați de ECU cu referința de 5 V a convertorului.</li>
<li><b>Valorile de referință din Tabelul 1.1.</b> Foaia de catalog ATmega2560 garantează U<sub>OH</sub> ≥ 4,2 V la 20 mA (V<sub>CC</sub> = 5 V) și U<sub>OL</sub> ≤ 0,9 V la 20 mA; valoarea de 0,5 V corespunde unor curenți mici. Cu LED-ul legat spre masă, în starea LOW prin pin nu trece curent și U<sub>OL</sub> ≈ 0; pentru U<sub>OL</sub> sub sarcină LED-ul se leagă la +5 V. Pentru STM32F103: U<sub>OH</sub> ≥ V<sub>DD</sub> − 0,4 V și U<sub>OL</sub> ≤ 0,4 V la 8 mA.</li>
<li><b>Frecvența reală.</b> Placa Mega folosește un rezonator ceramic de 16 MHz (toleranță ±0,5 %), deci f<sub>PWM</sub> măsurată diferă de 20 000 Hz cu până la ±100 Hz; din ea se obține frecvența reală a ceasului (întrebarea 2). analogWrite() pe D9 folosește timerul 2 în modul PWM cu fază corectă: f = 16 MHz/(64·510) = 490,2 Hz și DC = valoare/255.</li>
<li><b>Latența întreruperii.</b> Cu attachInterrupt() și digitalWrite() latența este de 4…5 µs (salvarea registrelor, apelul prin pointer, căutarea pinului în tabele); scriind direct 1 în bitul registrului PINB (D13 = PB7), pinul se inversează în mai puțin de 1 µs. Tabelul 1.4 are o coloană suplimentară pentru această variantă. O rutină cu Serial.print() întârzie comutarea cu zeci de µs.</li>
<li><b>Butonul ca sursă de întrerupere.</b> Contactul mecanic vibrează 0,5…5 ms și produce mai multe fronturi: întreruperea se execută de mai multe ori (n crește cu mai mult de 1). Pentru măsurarea latenței se folosește generatorul de semnal; butonul se tratează prin filtrare RC sau prin program (debounce).</li>
<li><b>Aparatura.</b> Laboratorul are acum osciloscopul Rigol DS1074Z Plus (70 MHz, 1 GSa/s, 4 canale), cu măsurători automate de frecvență, factor de umplere, valoare medie și întârziere între canale; simulatorul îl reproduce.</li></ul></div>
<h2>1.4. Modul de lucru (în simulator)</h2>
<ol><li>În editor (VS Code + PlatformIO) deschideți proiectul <i>mega_gpio</i>, alegeți HIGH, apoi LOW, și încărcați programul de fiecare dată (→ Upload); măsurați cu multimetrul tensiunea pe D13 (Tabelul 1.1). Repetați cu <i>stm32_gpio</i> pe PB12.</li>
<li>ADC: încărcați <i>mega_adc</i>, deschideți monitorul serial, puneți multimetrul pe A0 și, pentru 5 poziții ale potențiometrului (rotiți-l cu mouse-ul), înregistrați U și N (Tabelul 1.2).</li>
<li>PWM implicit: <i>mega_pwm_implicit</i> cu analogWrite(9, 128); măsurați cu osciloscopul frecvența și factorul de umplere pe D9.</li>
<li>PWM configurat: <i>mega_timer1_pwm</i>; măsurați pe D11 frecvența, factorul de umplere și tensiunea medie pentru OCR1A = 199, 399 și 599 (Tabelul 1.3).</li>
<li>Întrerupere externă: <i>mega_intrerupere</i>; generatorul pe D2, CH1 pe D2, CH2 pe D13, baza de timp 1 µs/div; înregistrați de trei ori întârzierea dintre fronturi, pentru ambele variante ale rutinei (Tabelul 1.4). Opriți generatorul și apăsați butonul pentru a vedea vibrația contactelor.</li>
<li>Repetați măsurarea ADC pe STM32F103 (<i>stm32_adc</i>, PA0, 12 biți, 3,3 V) și comparați rezoluțiile (Tabelul 1.2b).</li></ol>
<h2>1.7. Interpretarea rezultatelor</h2>
<ul><li>Abaterile ADC de ±1…2 LSB sunt normale (zgomot, neliniaritate); abateri mai mari indică o tensiune de referință diferită de 5 V (alimentarea prin USB are adesea 4,7…4,9 V).</li>
<li>Frecvența PWM măsurată trebuie să coincidă cu cea calculată, în limita toleranței rezonatorului; factorul de umplere poate diferi cu o treaptă de numărare.</li>
<li>Latența întreruperii crește dacă rutina conține operații lente (Serial.print); rutinele de întrerupere se păstrează scurte.</li>
<li>STM32F103 are o rezoluție de ≈ 6 ori mai bună în tensiune, dar domeniul de intrare este 0…3,3 V: senzorii auto de 5 V se adaptează prin divizoare (lucrarea 2).</li></ul>
<h2>1.8. Relevanță practică</h2>
<p>Configurarea directă a timerelor, a convertorului A/D și a întreruperilor este baza programării oricărei unități de control auto; aceleași noțiuni se regăsesc la microcontrolerele auto (Infineon AURIX, NXP S32), unde sunt accesate prin straturile de drivere AUTOSAR (MCAL).</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Arduino Mega (U<sub>ref</sub> = 5 V, n = 10) și STM32F103 (U<sub>ref</sub> = 3,3 V, n = 12); U = 2,50 V; Timer1 cu f<sub>clk</sub> = 16 MHz, P = 1, TOP = 799, OCR1A = 199, alimentare 5 V:</p>
<div class="ec"><span>LSB<sub>Mega</sub> = 5/1024 = 4,88 mV; &nbsp; LSB<sub>STM32</sub> = 3,3/4096 = 0,806 mV</span><span class="nr">(1.7–1.8)</span></div>
<div class="ec"><span>N = ⌊2,50·1024/5⌋ = 512</span><span class="nr">(1.9)</span></div>
<div class="ec"><span>f<sub>PWM</sub> = 16·10<sup>6</sup>/(1·800) = 20 000 Hz; &nbsp; DC = 200/800·100 = 25 %; &nbsp; U<sub>med</sub> = 0,25·5 = 1,25 V</span><span class="nr">(1.10–1.12)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Calculați TOP pentru 25 kHz cu f<sub>clk</sub> = 16 MHz și P = 1. Câte trepte are factorul de umplere și ce rezoluție în biți rezultă?</p><details class="sol"><summary>Rezolvare</summary><p>TOP = 16·10<sup>6</sup>/25 000 − 1 = 639; 640 de trepte → log<sub>2</sub>640 ≈ 9,3 biți. La 20 kHz (TOP = 799) rezoluția este ≈ 9,6 biți.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Pe placa alimentată prin USB cu 4,85 V, potențiometrul (alimentat tot de la 4,85 V) este la jumătate. Ce cod N se citește și ce tensiune afișează programul care calculează U = N·5,0/1024?</p><details class="sol"><summary>Rezolvare</summary><p>U = 2,425 V și U<sub>ref</sub> = 4,85 V → N = ⌊2,425·1024/4,85⌋ = 512; programul afișează 512·5/1024 = 2,500 V, cu 75 mV mai mult decât indică multimetrul.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Un senzor auto de 0,5…4,5 V se citește cu STM32F103 (3,3 V) printr-un divizor R1–R2. Alegeți R2 = 20 kΩ și calculați R1 astfel încât 5 V să corespundă la 3,2 V. Ce rezoluție în tensiunea senzorului rezultă?</p><details class="sol"><summary>Rezolvare</summary><p>R2/(R1 + R2) = 0,64 → R1 = 11,25 kΩ (valoare standard 11 kΩ, raport 0,645 → 3,23 V). Rezoluția raportată la senzor: 0,806 mV/0,645 = 1,25 mV, de patru ori mai bună decât la Mega (4,88 mV).</p></details></div>`;
}
const INTREBARI = [
  ["Care este rezoluția în tensiune a unui ADC de 12 biți cu referință de 5 V?", "LSB = 5/4096 = 1,22 mV."],
  ["Cum se alege frecvența PWM pentru un actuator auto și de ce nu se folosesc 490 Hz?", "Frecvența trebuie să fie mult mai mare decât inversul constantei de timp electrice L/R a bobinei, ca curentul să aibă ondulații mici, și peste pragul audibil (≈ 16…20 kHz), ca bobina să nu „cânte”; la frecvențe prea mari cresc pierderile de comutație în tranzistoare. La 490 Hz curentul pulsează, actuatorul vibrează și zgomotul este audibil."],
  ["Calculați TOP pentru 25 kHz cu f<sub>clk</sub> = 16 MHz și P = 1.", "TOP = f<sub>clk</sub>/(P·f) − 1 = 16·10<sup>6</sup>/25 000 − 1 = 639."],
  ["De ce rutina de întrerupere trebuie să fie scurtă?", "Cât timp rulează, celelalte întreruperi de aceeași prioritate (la AVR – toate) sunt blocate: se pierd evenimente, cresc latențele celorlalte rutine și se perturbă temporizările (millis(), comunicațiile). Prelucrările lungi se mută în programul principal, iar rutina doar marchează evenimentul."],
  ["Ce precauții se iau când un senzor de 5 V se leagă la un microcontroler de 3,3 V?", "Se folosește un divizor rezistiv (sau un amplificator cu câștig subunitar), eventual cu diode de limitare sau un rezistor serie, pentru ca tensiunea pe pin să nu depășească 3,3 V nici la defect; se folosesc pinii „FT” doar pentru semnale digitale; referința și alimentarea senzorului se aleg astfel încât măsurarea să rămână ratiometrică."]
];
const TEST = [
  { q: "Rezoluția unui ADC de 10 biți cu U<sub>ref</sub> = 5 V este:", o: ["0,49 mV", "4,88 mV", "9,77 mV", "19,5 mV"], c: 1, e: "5/1024." },
  { q: "Cu f<sub>clk</sub> = 16 MHz, P = 8 și TOP = 999, f<sub>PWM</sub> în modul Fast PWM este:", o: ["2 kHz", "16 kHz", "20 kHz", "1 kHz"], c: 0, e: "16·10<sup>6</sup>/(8·1000) = 2000 Hz." },
  { q: "Pentru OCR = 399 și TOP = 799 factorul de umplere este:", o: ["49,9 %", "50 %", "40 %", "75 %"], c: 1, e: "(399 + 1)/(799 + 1) = 0,5." },
  { q: "Dacă placa este alimentată cu 4,8 V și potențiometrul tot de la 4,8 V, la jumătatea cursei N este:", o: ["≈ 491", "512", "≈ 533", "1023"], c: 1, e: "Montaj ratiometric: N depinde numai de raportul U/U<sub>ref</sub> = 0,5." },
  { q: "Un buton legat direct la o intrare de întrerupere produce de obicei:", o: ["o singură întrerupere", "mai multe întreruperi (vibrația contactelor)", "nicio întrerupere", "o întrerupere la eliberare"], c: 1, e: "Contactul mecanic vibrează câteva milisecunde." },
  { q: "Ce valoare maximă poate avea codul unui ADC de 12 biți?", o: ["4096", "4095", "2048", "1023"], c: 1, e: "2<sup>12</sup> − 1." }
];

/* ------------------------------------------------------------------ definiția lucrării */
const CSS = `<style>
.tk { padding:0 !important; overflow:hidden; background:#fff; color:#222; }
.tk-bara { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; padding:.45rem .6rem; background:#fff; border-bottom:1px solid #e3e3e3; }
.tk-logo { font:600 .9rem system-ui,sans-serif; color:#333; margin-right:auto; } .tk-logo b { color:#1477d1; }
.tk-unelte { display:flex; gap:.15rem; } .tk-unelte i { font-style:normal; color:#9a9a9a; padding:.2rem .4rem; border-radius:4px; }
.tk-bara button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.32rem .7rem; font:600 .82rem system-ui,sans-serif; cursor:pointer; }
.tk-bara button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; }
.tk-bara .tk-start { background:#2e9e44; border-color:#2e9e44; color:#fff; } .tk-bara .tk-start.ruleaza { background:#d6452f; border-color:#d6452f; }
.tk-corp { display:flex; min-height:520px; background:#fbfbfb; }
.tk-plansa { position:relative; flex:1 1 auto; min-width:0; }
#tk-svg { width:100%; height:100%; min-height:520px; display:block; touch-action:none; user-select:none; font-family:system-ui,sans-serif; }
.tk-pin { fill:transparent; stroke:transparent; cursor:crosshair; } .tk-pin:hover, .tk-pin.aproape { fill:rgba(20,119,209,.35); stroke:#1477d1; stroke-width:1.2; }
.tk-comp { cursor:pointer; }
.tk-ajutor { position:absolute; left:.6rem; bottom:.4rem; margin:0; font:11px system-ui,sans-serif; color:#888; pointer-events:none; }
.tk-insp { position:absolute; right:.6rem; top:.6rem; width:250px; background:#fff; border:1px solid #d8dde3; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.15); font:12.5px system-ui,sans-serif; color:#333; }
.tk-insp-t { display:flex; justify-content:space-between; align-items:center; padding:.5rem .6rem; font-weight:700; border-bottom:1px solid #eee; } .tk-insp-t button { border:0; background:none; cursor:pointer; color:#777; }
.tk-insp-r { display:flex; justify-content:space-between; gap:.6rem; padding:.3rem .6rem; } .tk-insp-r span { color:#777; } .tk-insp-r b { font-weight:600; text-align:right; }
.tk-cod { flex:0 0 370px; max-width:40%; border-left:1px solid #e3e3e3; background:#fff; display:flex; flex-direction:column; }
.tk-cod[hidden] { display:none; }
.tk-cod-sus { display:flex; gap:.4rem; padding:.4rem .5rem; border-bottom:1px solid #eee; align-items:center; font:12px system-ui,sans-serif; color:#555; } .tk-cod-sus select { font:12px system-ui,sans-serif; padding:.2rem; border:1px solid #cfd4da; border-radius:4px; background:#fff; color:#222; max-width:100%; }
#tk-cod { flex:1 1 auto; margin:0; padding:.5rem .3rem; overflow:auto; background:#fff; color:#1f1f1f; font:12px/1.5 ui-monospace,Consolas,"Courier New",monospace; white-space:pre; min-height:250px; max-height:430px; }
.cd-ln { display:inline-block; width:2.4em; color:#a8a8a8; text-align:right; margin-right:.9em; user-select:none; }
.cd-k { color:#0b62b5; font-weight:600; } .cd-s { color:#b2502b; } .cd-c { color:#6a8759; font-style:italic; } .cd-n { color:#7a3fb0; }
.cd-f { min-width:5.5ch; background:#fff8d6; color:#5b3d00; border:1px solid #e0b84a; border-radius:3px; font:inherit; padding:0 .2rem; max-width:100%; } .cd-f:disabled { background:#f1f1f1; color:#777; border-color:#ccc; }
.tk-blocat { background:#fff4e5; color:#8a5300; font:12px system-ui,sans-serif; padding:.35rem .6rem; border-bottom:1px solid #f1d7a8; }
.tk-erori { background:#fde8e6; color:#9b1c10; font:12px ui-monospace,monospace; padding:.4rem .6rem; border-bottom:1px solid #f3b9b1; }
.tk-ser-bara { display:flex; gap:.4rem; padding:.35rem .5rem; border-top:1px solid #eee; } .tk-ser-bara button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.2rem .6rem; font:12px system-ui,sans-serif; cursor:pointer; color:#333; } .tk-ser-bara button.activ { background:#e8f1fb; border-color:#1477d1; }
#tk-serial { margin:0; height:150px; overflow:auto; background:#fff; border-top:1px solid #eee; color:#222; padding:.4rem .6rem; font:12px/1.4 ui-monospace,Consolas,monospace; }
.fw { font-size:.8rem; } .fw b { font-family:ui-monospace,monospace; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; }
.sim-grila:fullscreen .tk-corp, .sim-grila.ecran-plin .tk-corp { min-height:calc(100vh - 5rem); }
@media (max-width:860px){ .tk-corp { flex-direction:column; } .tk-cod { max-width:none; flex-basis:auto; border-left:0; border-top:1px solid #e3e3e3; } #tk-svg { min-height:360px; } }
</style>`;
Cadru.porneste({
  disc: "MAM1", nr: 1, cod: "mam1-l1",
  titlu: "Microcontrolere: intrări/ieșiri, convertor A/D, timere, întreruperi și PWM",
  scurt: "Microcontrolere: I/O, ADC, PWM",
  subtitlu: "Laborator virtual – standul cu Arduino Mega 2560 și STM32F103, VS Code + PlatformIO, osciloscop și multimetru",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261005); },
  date: [{ k: "fclk", et: "f<sub>clk</sub> nominal [MHz]", v: 16, fix: true }, { k: "uref", et: "U<sub>ref</sub> nominal Mega [V]", v: 5, fix: true }, { k: "urefS", et: "U<sub>ref</sub> nominal STM32 [V]", v: 3.3, fix: true }],
  tabele: [
    { id: "t11", titlu: "Tabelul 1.1. Nivelurile logice (ieșire cu LED + 220 Ω spre masă)", antetRand: "Mărime",
      randuri: [{ k: "UOH", et: "U<sub>OH</sub> [V] (ref. ≥ 4,2 / ≥ 2,9)" }, { k: "UOL", et: "U<sub>OL</sub> [V] (ref. ≤ 0,9 / ≤ 0,4)" }],
      coloane: [{ k: "mega", t: "Arduino Mega", intrare: true }, { k: "stm", t: "STM32F103", intrare: true }] },
    { id: "t12", titlu: "Tabelul 1.2. Convertorul A/D (Arduino Mega, 10 biți)", antetRand: "Punct", nota: "N calculat = ⌊U·1024/5⌋ (U<sub>ref</sub> nominal 5 V); abaterea = N citit − N calculat.",
      randuri: ["p1", "p2", "p3", "p4", "p5"].map((k, i) => ({ k, et: String(i + 1) })),
      coloane: [{ k: "U", t: "U multimetru [V]", intrare: true }, { k: "N", t: "N citit", intrare: true }, { k: "Nc", t: "N calculat" }, { k: "ab", t: "Abatere [LSB]" }] },
    { id: "t12b", titlu: "Tabelul 1.2b. Convertorul A/D (STM32F103, 12 biți)", antetRand: "Punct", nota: "N calculat = ⌊U·4096/3,3⌋.",
      randuri: ["s1", "s2", "s3"].map((k, i) => ({ k, et: String(i + 1) })),
      coloane: [{ k: "U", t: "U multimetru [V]", intrare: true }, { k: "N", t: "N citit", intrare: true }, { k: "Nc", t: "N calculat" }, { k: "ab", t: "Abatere [LSB]" }] },
    { id: "t13", titlu: "Tabelul 1.3. Semnalul PWM (Timer1, TOP = 799, P = 1; ultimul rând – analogWrite(9, 128))", antetRand: "OCR1A",
      randuri: [{ k: "o199", et: "199" }, { k: "o399", et: "399" }, { k: "o599", et: "599" }, { k: "aw", et: "analogWrite 128" }],
      coloane: [{ k: "f", t: "f măsurat [Hz]", intrare: true }, { k: "dc", t: "DC măsurat [%]", intrare: true }, { k: "dcc", t: "DC calculat [%]" }, { k: "um", t: "U<sub>med</sub> măsurat [V]", intrare: true }, { k: "umc", t: "U<sub>med</sub> calculat [V]" }] },
    { id: "t14", titlu: "Tabelul 1.4. Latența întreruperii (D2 ↑ → comutarea D13)", antetRand: "Măsurare",
      randuri: [{ k: "m1", et: "1" }, { k: "m2", et: "2" }, { k: "m3", et: "3" }],
      coloane: [{ k: "dw", t: "ISR cu digitalWrite() [µs]", intrare: true }, { k: "port", t: "ISR cu PINB (direct) [µs]", intrare: true }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaMAM1,
  intrebari(D, R, Pp) {
    const f = Pp && Pp.fT ? Pp.fT : 25000;
    return [
      { id: "q1", u: "V", text: "Tensiunea de referință reală a ADC-ului plăcii Mega (alimentarea prin USB), estimată din Tabelul 1.2 (U<sub>ref</sub> ≈ U·1024/N):", textSimplu: "Tensiunea de referință reală estimată" },
      { id: "q2", u: "MHz", text: "Frecvența reală a ceasului plăcii Mega, dedusă din f<sub>PWM</sub> măsurată în Tabelul 1.3 (f<sub>clk</sub> = f<sub>PWM</sub>·P·(TOP + 1)):", textSimplu: "Frecvența reală a ceasului" },
      { id: "q3", u: "", text: `Valoarea TOP (ICR1) pentru f<sub>PWM</sub> = ${fmt(f / 1000, f % 1000 ? 1 : 0)} kHz cu f<sub>clk</sub> = 16 MHz și P = 1:`, textSimplu: "Valoarea TOP pentru frecvența cerută" },
      { id: "q4", u: "µs", text: "Latența medie a întreruperii cu digitalWrite() în rutină (Tabelul 1.4):", textSimplu: "Latența medie a întreruperii" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    ["UOH", "UOL"].forEach(r => ["mega", "stm"].forEach(c => { if (t.t11[r][c] === "") l.push(`Tabelul 1.1: ${r} ${c === "mega" ? "Mega" : "STM32"}`); }));
    const a = ["p1", "p2", "p3", "p4", "p5"].filter(k => t.t12[k].N !== "").length; if (a < 5) l.push(`Tabelul 1.2: ${a}/5 puncte`);
    const b = ["s1", "s2", "s3"].filter(k => t.t12b[k].N !== "").length; if (b < 3) l.push(`Tabelul 1.2b: ${b}/3 puncte`);
    const c = MD.OCR.filter(k => t.t13["o" + k].f !== "").length; if (c < 3) l.push(`Tabelul 1.3: ${c}/3 valori OCR1A`);
    if (t.t13.aw.f === "") l.push("Tabelul 1.3: rândul analogWrite");
    const d = ["m1", "m2", "m3"].filter(k => t.t14[k].dw !== "").length; if (d < 3) l.push(`Tabelul 1.4: ${d}/3 măsurări cu digitalWrite()`);
    return l;
  },
  exemplu(D) {
    const t = D.t;
    Object.assign(t.t12.p3, { U: "2.500", N: "512" }); Object.assign(t.t13.o199, { f: "20000", dc: "25.00", um: "1.250" });
  },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul de lucru la scară reală: Arduino Mega 2560, placa de test cu potențiometrul (A0), LED-ul cu rezistorul de 220 Ω (D13) și butonul cu rezistorul de 10 kΩ (D2), STM32 „Blue Pill” cu ST-Link V2, generatorul de funcții, osciloscopul și multimetrul. Montajul urmărește simulatorul: LED-urile, potențiometrele, butonul, ecranele aparatelor și sondele mutate pe planșă. Rotiți, apropiați sau depărtați vederea; treceți cu mouse-ul peste componente.</p>`,
    modul: "montaj3d.js?v=1", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, 0, 1300, 790], construieste: L => montaj3dL1(L), cam: [0.0, 0.56, 0.82], tinta: [0.0, 0.03, -0.01],
      vederi: { tot: [[0.0, 0.56, 0.82], [0.0, 0.03, -0.01], "Ansamblu"], placa: [[0.0, 0.14, 0.26], [0.0, 0.0, 0.12], "Placa de test"], mega: [[-0.26, 0.17, 0.3], [-0.25, 0.0, 0.12], "Arduino Mega"], stm: [[0.26, 0.15, 0.3], [0.24, 0.0, 0.12], "Blue Pill"], aparate: [[-0.1, 0.32, 0.4], [-0.15, 0.08, -0.2], "Aparatele"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Microcontrolerele din autoturism – intrări analogice și ieșiri PWM",
    intro: `<p>Fiecare calculator al autoturismului conține un microcontroler ca cel din laborator. Porniți motorul: pe CH1 este pedala de accelerație (intrare analogică citită de ADC-ul calculatorului motorului), pe CH2 poziția clapetei, comandată de același calculator prin PWM cu punte H (lucrarea 9). Alegeți și alți senzori ai motorului pentru a vedea tipurile de semnale (analogice, de frecvență, PWM).</p>`,
    dupa: `<p class="nota">Semnalele sunt tipice; machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "app", canale: ["tps"] })
  },
  referat: {
    scop: "Programarea resurselor microcontrolerului (ieșiri digitale, ADC, timere, PWM, întreruperi) și măsurarea nivelurilor logice, a caracteristicii ADC, a semnalului PWM și a latenței întreruperii.",
    relatii: "LSB = U<sub>ref</sub>/2<sup>n</sup>; &nbsp; N = ⌊U·2<sup>n</sup>/U<sub>ref</sub>⌋; &nbsp; f<sub>PWM</sub> = f<sub>clk</sub>/(P·(TOP + 1)); &nbsp; DC = (OCR + 1)/(TOP + 1)·100; &nbsp; U<sub>med</sub> = DC·U<sub>s</sub>/100.",
    varianta: () => "Standul cu plăcile proprii fiecărui student: tensiunea de alimentare prin USB, rezonatorul de 16 MHz, etajele de ieșire, neliniaritatea ADC-ului și latența întreruperii.",
    indicatii: "Comentați abaterile ADC (montajul ratiometric), diferența dintre frecvența PWM măsurată și cea nominală, valorile U_OH/U_OL față de catalog, latența celor două variante de rutină și efectul vibrației butonului…"
  },
  subsol: "Modelul: ATmega2560 la 16 MHz (rezonator ceramic) alimentat prin USB, ADC de 10 biți referit la AVCC, Timer1 Fast PWM, Timer2 PWM cu fază corectă, întreruperea externă INT4; STM32F103 cu ADC de 12 biți referit la VDDA. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Circuite</b> · Stand MAM I – Lucrarea 1</span>
        <span class="tk-unelte" aria-hidden="true"><i title="Rotire">⟳</i><i title="Ștergere">🗑</i><i title="Anulare">↶</i><i title="Refacere">↷</i><i title="Notițe">✎</i></span>
        <button type="button" id="tk-fit" title="Încadrează tot">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-corp">
        <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div>
          <p class="tk-ajutor">Rotița = zoom · tragere pe fundal = deplasare · trageți vârfurile sondelor (V, 1, 2) pe pini · rotiți potențiometrele · apăsați butonul · OUTPUT pornește generatorul · clic pe o componentă = proprietăți</p></div>
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><select disabled><option>Text</option></select>
            <select id="tk-placa"><option value="mega">1 (Arduino Mega 2560)</option><option value="stm">2 (STM32 Blue Pill)</option></select></div>
          <div class="tk-cod-sus"><label>Schiță <select id="tk-sk"></select></label></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <div id="tk-erori" class="tk-erori" hidden></div>
          <pre id="tk-cod"></pre>
          <div class="tk-ser-bara"><button type="button" id="tk-serb">Monitor serial</button><button type="button" id="tk-serc">Golește</button></div>
          <pre id="tk-serial" hidden></pre>
        </div>
      </div>
      <p class="nota" id="osc-cit" style="margin:.35rem 0 0"></p>
    </div>
    <aside class="card sim-comenzi">
      <h2>Programele în execuție</h2>
      <p class="fw">Arduino Mega: <b id="fw-mega">—</b><br>STM32F103: <b id="fw-stm">—</b></p>
      <h2>Înregistrare în tabele</h2>
      <button type="button" class="primar lat" id="btn-t11">● U<sub>OH</sub>/U<sub>OL</sub> (multimetru) → Tabelul 1.1</button>
      <div class="rand-butoane"><label class="camp" style="margin:0">Punct <select id="sel-punct-mega">${[1, 2, 3, 4, 5].map(i => `<option value="p${i}">${i}</option>`).join("")}</select></label><button type="button" class="primar" id="btn-t12">● U, N Mega → Tabelul 1.2</button></div>
      <div class="rand-butoane"><label class="camp" style="margin:0">Punct <select id="sel-punct-stm">${[1, 2, 3].map(i => `<option value="s${i}">${i}</option>`).join("")}</select></label><button type="button" class="primar" id="btn-t12b">● U, N STM32 → Tabelul 1.2b</button></div>
      <button type="button" class="primar lat" id="btn-t13">● f, DC (osciloscop), U<sub>med</sub> → Tabelul 1.3</button>
      <button type="button" class="primar lat" id="btn-t14">● Întârzierea D2→D13 → Tabelul 1.4</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Valorile se trec în tabele numai din aparate (multimetru, monitorul serial, măsurătorile osciloscopului), cu simularea pornită.</p>
    </aside>
  </div>`,
    init(C) {
      legaPlansa(); desenSonde(); afiseazaCod(); actualizeazaFw(); genAfis();
      $("#tk-placa").addEventListener("change", e => { sim.placaCod = e.target.value; afiseazaCod(); });
      $("#tk-sk").addEventListener("change", e => { sim.sketch[sim.placaCod] = e.target.value; afiseazaCod(); });
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-serb").addEventListener("click", () => { const s = $("#tk-serial"); s.hidden = !s.hidden; $("#tk-serb").classList.toggle("activ", !s.hidden); afiseazaSerial(); });
      $("#tk-serc").addEventListener("click", () => { sim.serial[sim.placaCod] = []; afiseazaSerial(); });
      $("#tk-fit").addEventListener("click", () => seteazaVB(VB0.slice()));
      $("#btn-t11").addEventListener("click", inregGPIO);
      $("#btn-t12").addEventListener("click", e => inregADC(e, "mega"));
      $("#btn-t12b").addEventListener("click", e => inregADC(e, "stm"));
      $("#btn-t13").addEventListener("click", inregPWM);
      $("#btn-t14").addEventListener("click", inregLat);
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      deseneazaOsc(); citesteDMM();
      C.mesaj("Alegeți schița mega_gpio (HIGH) în panoul de cod, porniți simularea și trageți sonda roșie a multimetrului pe pinul 13.", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); Object.assign(sim, { serial: { mega: [], stm: [] }, n: 0, led13: false, nMega: undefined, nStm: undefined }); },
    cadru(dt, C, vizibil) {
      const acum = performance.now();
      if (acum - sim.tSer > 200) { sim.tSer = acum; linieSerial(); }
      if (!vizibil) return;
      if (sim.run && sim.osc.ruleaza && acum - sim.osc.tAcq > 140) { sim.osc.tAcq = acum; achizitie(); deseneazaOsc(); }
      if (acum - sim.dmm.tA > 330) { sim.dmm.tA = acum; citesteDMM(); }
      actualizeazaLeduri(acum);
      if (acum - (this._ts || 0) > 300) {
        this._ts = acum;
        if (sim.run) { const t = Math.floor((acum - sim.t0) / 1000); $("#tk-timp").textContent = `Timp de simulare: ${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor(t / 60) % 60).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; }
        C.stare(1, sim.run ? "simulare pornită" : "simulare oprită", sim.run ? "inc" : ""); C.stare(2, sim.run && sim.fw.mega ? `Mega: ${PROG[sim.fw.mega.prog].titlu} · STM32: ${PROG[sim.fw.stm.prog].titlu}` : "");
      }
    },
    redeseneaza() { deseneazaOsc(); },
    formule() {
      const fw = sim.fw.mega || {}, p = P();
      const r = [["Convertorul A/D (1.1–1.2)", `LSB = 5/1024 = 4,883 mV; N = ⌊${fx(sim.alfa * p.vcc, 3)}·1024/5⌋ = ${Math.floor(sim.alfa * p.vcc * 1024 / 5)} (cu U<sub>ref</sub> = 5 V)`]];
      if (fw.prog === "mega_t1") { const f = 16e6 / (fw.P * (fw.top + 1)); r.push(["PWM Timer1 (1.4–1.6)", `f = 16·10<sup>6</sup>/(${fw.P}·${fw.top + 1}) = <span class="rez">${fx(f, 1)} Hz</span>; DC = ${fw.ocr + 1}/${fw.top + 1}·100 = <span class="rez">${fx(Math.min(100, MD.dc(fw.ocr, fw.top)), 2)} %</span>; U<sub>med</sub> = <span class="rez">${fx(Math.min(1, (fw.ocr + 1) / (fw.top + 1)) * 5, 3)} V</span>`]); }
      if (fw.prog === "mega_aw") r.push(["PWM Timer2 (analogWrite)", `f = 16·10<sup>6</sup>/(64·510) = <span class="rez">490,2 Hz</span>; DC = ${fw.val}/255·100 = <span class="rez">${fx(fw.val / 2.55, 2)} %</span>`]);
      return r;
    }
  }
});

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL1(L) {
  const { V3, mm } = L, G = L.generator([-0.44, 0, -0.17], { ecran: [56, 56, 170, 70], roty: 0.18 }), O = L.osciloscop([-0.13, 0, -0.21], { ecran: [406, 56, 404, 246] });
  const DM = L.multimetru([0.15, 0, -0.2], { ecran: [888, 58, 132, 54], cul: 0x3b3f45, et: "Multimetru digital (V⎓)" }), PC = L.laptop([0.43, 0, -0.17], { roty: -0.35, cod: () => L.textCod(), titlu: () => `PlatformIO – ${(PROG[sim.editor] || {}).titlu || ""}.cpp` });
  const MG = L.arduinoMega([-0.25, 0, 0.13]), BB = L.placaTest([0.0, 0, 0.13]), BS = L.placaTest([0.235, 0, 0.13], { coloane: 30, et: "Placa de test mică (400 de puncte)" });
  const BP = L.bluePill(BS, 6), SL = L.stLink([0.27, 0, 0.0], { roty: 0 });
  const g = (c, r) => BB.gaura(c, r), s = (c, r) => BS.gaura(c, r), R = 0xe53935, N = 0x222222;
  // alimentarea plăcii de test din Mega și legăturile dintre șine
  L.fir(MG.pin("5V"), g(2, "+j"), R); L.fir(MG.pin("GND"), g(3, "-j"), N); L.fir(g(49, "+j"), g(49, "+s"), R); L.fir(g(48, "-j"), g(48, "-s"), N);
  // potențiometrul pe A0
  const pot = L.potentiometru(g(5, "b"), g(9, "b"), { et: "Potențiometru 10 kΩ – cursorul la A0" }); L.fir(g(5, "e"), g(5, "+j"), R); L.fir(g(9, "e"), g(8, "-j"), N); L.fir(g(7, "e"), MG.pin("A0"), 0xf2c230);
  // D13 → 220 Ω → LED → GND
  L.fir(MG.pin("D13"), g(20, "j"), 0xff8a1f); L.rezistor(g(20, "h"), g(24, "h"), 220); const led = L.led(g(24, "f"), g(25, "f"), 0xff2a1a, { et: "LED roșu (D13)" }); L.fir(g(25, "j"), g(24, "-s"), N);
  // butonul pe D2 cu rezistorul de 10 kΩ spre masă; generatorul pe același nod
  const btn = L.buton(V3((g(33, "e").x + g(37, "f").x) / 2, BB.H, (g(33, "e").z + g(37, "f").z) / 2).sub(V3(0, BB.H, 0)).add(V3(0, BB.H, 0)), { et: "Butonul (D2)", cul: 0xd32f2f });
  L.fir(MG.pin("D2"), g(33, "b"), 0x2fa84f); L.fir(g(37, "j"), g(37, "+s"), R); L.rezistor(g(33, "d"), g(29, "d"), 10000); L.fir(g(29, "a"), g(29, "-j"), N);
  L.cablu(G.iesire, g(33, "a"), 0x2fa84f, { burta: 0.12, crocodil: true }); L.cablu(G.iesire.clone().add(V3(mm(12), 0, 0)), g(30, "-j"), N, { burta: 0.14, crocodil: true });
  // Blue Pill: 3,3 V și masa, LED-ul pe PB12, potențiometrul pe PA0, ST-Link pe SWD
  L.fir(BP.pin("3V3"), s(20, "+j"), R); L.fir(BP.pin("GND"), s(21, "-j"), N); L.fir(s(1, "-j"), s(1, "-s"), N);
  L.rezistor(s(6, "i"), s(2, "i"), 220); const ledS = L.led(s(2, "g"), s(1, "g"), 0xff2a1a, { et: "LED roșu (PB12)" }); L.fir(s(1, "j"), s(2, "-s"), N);
  const potS = L.potentiometru(s(26, "b"), s(30, "b"), { et: "Potențiometru 10 kΩ – cursorul la PA0" }); L.fir(s(26, "e"), s(24, "+j"), R); L.fir(s(30, "e"), s(25, "-j"), N); L.fir(s(28, "a"), BP.pin("PA0"), 0xf2c230);
  [["3V3", R, 3], ["SWDIO", 0x6a1b9a, 1], ["SWCLK", 0x00897b, 0], ["GND", N, 2]].forEach(([n, c, i]) => L.fir(BP.swd(n), SL.pin(i), c, { capete: true, h: 14 }));
  L.cabluUSB(MG.pin("D0").clone().set(-0.31, 0.009, 0.115), PC.usb); L.cabluUSB(SL.pin(0).clone().set(0.27 - 0.032, 0.0045, 0.0), PC.usb.clone().add(V3(0, 0, 0.03)));
  // masele fixe ale aparatelor și sondele mobile
  L.cablu(DM.com, g(45, "-s"), N, { burta: 0.05 }); O.ch.forEach((p, i) => L.cablu(p.clone().add(V3(0, mm(-8), 0)), g(40 + i * 2, "-s"), N, { r: 0.8, burta: 0.04, crocodil: true }));
  const P3 = { pin11: MG.pin("D11"), pin9: MG.pin("D9"), pin13: MG.pin("D13"), pin2: MG.pin("D2"), A0: MG.pin("A0"), v5: MG.pin("5V"), PB12: BP.pin("PB12"), PA0: BP.pin("PA0", "b"), v33: BP.pin("3V3", "b"),
    pot: g(7, "c"), ledA: g(24, "g"), rez: g(20, "i"), gndBB: g(40, "-j"), v5BB: g(40, "+j"), btnD2: g(33, "c"), gndS: s(10, "-j") };
  const sd = [L.sonda(O.ch[0], 0xf2d600, V3(-0.05, 0.003, 0.0), { osc: true, et: "Sonda CH1 a osciloscopului" }), L.sonda(O.ch[1], 0x1fb6ff, V3(-0.02, 0.003, 0.02), { osc: true, et: "Sonda CH2 a osciloscopului" }), L.sonda(DM.v, 0xd32f2f, V3(0.12, 0.003, -0.05), { et: "Sonda V a multimetrului" })];
  const at = (id, k) => { const v = $(id); return v ? Number(v.getAttribute(k)) || 0 : 0; };
  return { actualizeaza() {
    pot.set(sim.alfa); potS.set(sim.alfaS); btn.set(sim.buton); G.set(sim.gen);
    led.set(Math.min(1, at("#ledR", "opacity") / 0.7)); ledS.set(at("#ledSG", "opacity"));
    const f = id => ($(id) || { getAttribute: () => "" }).getAttribute("fill");
    MG.led("L", f("#ledL") === "#ffc23a" ? 1 : 0); MG.led("TX", f("#ledTX") === "#ffd04a" ? 1 : 0); MG.led("ON", 1); BP.led(sim.run ? 0.6 : 0);
    sd[0].muta(P3[sim.osc.ch[0].s] || null); sd[1].muta(P3[sim.osc.ch[1].s] || null); sd[2].muta(P3[sim.dmm.s] || null);
  } };
}
