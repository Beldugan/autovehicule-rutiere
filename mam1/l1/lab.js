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
  serial: [], tSer: 0, tx: 0, inc: null, panou: "term",
  osc: { tdiv: 10e-6, ruleaza: true, ch: [{ s: "pin11", vdiv: 2, poz: -3 }, { s: "off", vdiv: 2, poz: 1 }], acq: null, tAcq: 0 },
  dmm: { s: "A0", v: 0, tA: 0 }, eventBtn: null
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
  ICR1  = ${inp("icr", 6)};             ${C_("// TOP")}
  OCR1A = ${inp("ocr", 6)};             ${C_("// pragul de comparare")}
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
function semnal(s) {
  const p = P(), fw = pinMega(), fs = sim.fw.stm || {};
  switch (s) {
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
  const s1 = semnal(o.ch[0].s), fw = pinMega();
  const lat = latenta(fw);
  const pts = [[], []], s = [s1, semnal(o.ch[1].s)];
  // pentru D2 (generator) ↔ D13 (întrerupere): D13 comută după latență la fiecare front crescător al lui D2
  let stareInit = Math.random() < 0.5 ? 1 : 0;
  const valoare = (sg, t) => {
    if (sg.tip === "dc") return sg.v * (1 + (Math.random() - 0.5) * 0.002);
    if (sg.tip === "pwm") { const ph = ((t % sg.T) + sg.T) % sg.T; const pp = sg.centrat ? Math.abs(ph - sg.T / 2) < sg.ton / 2 : ph < sg.ton; return pp ? sg.v : 0; }
    if (sg.tip === "isr") { const T = 1e-3; const k = Math.floor((t - lat * 1e-6) / T); const st = (stareInit + (k + 1)) % 2; return st ? MD.uPin(P(), "mega", 1) : 0.006; }
    return 0;
  };
  for (let c = 0; c < 2; c++) for (let i = 0; i <= N; i++) { const t = t0 + i * dt; pts[c].push(o.ch[c].s === "off" ? null : valoare(s[c], t)); }
  // măsurătorile automate
  const m = {};
  if (s1.tip === "pwm") { m.f = 1 / s1.T * (1 + (Math.random() - 0.5) * 4e-5); m.dc = s1.ton / s1.T * 100 + (Math.random() - 0.5) * 0.04; m.vavg = s1.ton / s1.T * s1.v; }
  if (o.ch[0].s === "pin2" && o.ch[1].s === "pin13" && fw.prog === "mega_isr" && sim.gen) m.lat = lat;
  o.acq = { pts, t0, dt, N, m };
}
function evenimentButon() {
  // apăsarea butonului: fronturi multiple (vibrația contactelor), capturate dacă CH1 = D2
  const o = sim.osc, fw = pinMega();
  if (fw.prog === "mega_isr") { const k = 3 + Math.floor(Math.random() * 3); sim.n = (sim.n || 0) + k; for (let i = 0; i < k; i++) sim.led13 = !sim.led13; }
  if (o.ch[0].s !== "pin2" || sim.gen) return;
  const W = o.tdiv * 10, N = 1200, t0 = -o.tdiv, dt = W / N, fr = [0]; let t = 0; const nb = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < nb * 2 - 1; i++) { t += (40e-6 + Math.random() * 400e-6) * (1 + i * 0.4); fr.push(t); }
  const lat = latenta(fw);
  const pts = [[], []];
  for (let i = 0; i <= N; i++) {
    const tt = t0 + i * dt; let k = fr.filter(x => x <= tt).length; const v1 = k % 2 ? 5 : 0;
    let tog = 0; if (fw.prog === "mega_isr") { for (let j = 0; j < fr.length; j += 2) if (tt >= fr[j] + lat * 1e-6) tog++; }
    pts[0].push(v1); pts[1].push(o.ch[1].s === "off" ? null : o.ch[1].s === "pin13" ? ((tog % 2) ? MD.uPin(P(), "mega", 1) : 0.006) : valoareDC(o.ch[1].s));
  }
  o.acq = { pts, t0, dt, N, m: o.ch[1].s === "pin13" && fw.prog === "mega_isr" ? { lat, bounce: nb } : {} };
  o.ruleaza = false; $("#osc-run").textContent = "RUN"; deseneazaOsc();
}
function valoareDC(s) { const sg = semnal(s); return sg.tip === "dc" ? sg.v : 0; }

/* ------------------------------------------------------------------ osciloscopul (stil Rigol DS1074Z Plus) */
const TDIV = [0.5e-6, 1e-6, 2e-6, 5e-6, 10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3];
const VDIV = [0.5, 1, 2, 5];
const CUL = ["#f5e33b", "#3fd2ff"];
function fmtT(s) { return s >= 1e-3 ? fx(s * 1e3, 0) + " ms" : s >= 1e-6 ? fx(s * 1e6, s < 1e-5 ? (s < 1e-6 ? 2 : 1) : 0).replace(",0", "") + " µs" : fx(s * 1e9, 0) + " ns"; }
function fmtF(f) { return f >= 1000 ? fx(f / 1000, 4) + " kHz" : fx(f, 2) + " Hz"; }
function deseneazaOsc() {
  const cv = $("#cv-osc"); if (!cv || !cv.getClientRects().length) return;
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = "#04070a"; g.fillRect(0, 0, W, H);
  const dx = W / 10, dy = H / 8; g.strokeStyle = "rgba(160,170,180,.22)"; g.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(i * dx, 0); g.lineTo(i * dx, H); g.stroke(); }
  for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * dy); g.lineTo(W, j * dy); g.stroke(); }
  g.strokeStyle = "rgba(200,210,220,.45)"; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  const o = sim.osc, a = o.acq;
  // marcajul declanșării
  g.fillStyle = "#ff9b3d"; g.beginPath(); g.moveTo(dx, 0); g.lineTo(dx - 5, -1); g.lineTo(dx, 9); g.lineTo(dx + 5, -1); g.fill();
  if (a) for (let c = 1; c >= 0; c--) {
    const ch = o.ch[c]; if (ch.s === "off") continue;
    const y0 = H / 2 - ch.poz * dy;
    g.fillStyle = CUL[c]; g.font = "bold 11px ui-monospace,monospace"; g.fillText(String(c + 1), 3, y0 + 4); g.beginPath(); g.moveTo(12, y0); g.lineTo(18, y0 - 4); g.lineTo(18, y0 + 4); g.fill();
    g.strokeStyle = CUL[c]; g.lineWidth = 1.6; g.beginPath();
    a.pts[c].forEach((v, i) => { const x = i / a.N * W, y = y0 - v / ch.vdiv * dy; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }
  // bara de stare și măsurători
  const m = a ? a.m : {}, lin = [];
  if (m.f) lin.push(`Freq(1) = ${fmtF(m.f)}`, `+Duty(1) = ${fx(m.dc, 2)} %`, `Vavg(1) = ${fx(m.vavg, 3)} V`);
  if (m.lat) lin.push(`Delay(1↑→2) = ${fx(m.lat, 2)} µs`);
  if (m.bounce) lin.push(`fronturi D2: ${m.bounce * 2 - 1} (vibrația contactelor)`);
  $("#osc-cit").textContent = lin.join("   ·   ") || (a ? "Nicio măsurătoare automată pentru semnalele afișate." : "");
  $("#osc-stare").textContent = `${o.ruleaza ? "RUN" : "STOP"} · H ${fmtT(o.tdiv)}/div · CH1 ${fx(o.ch[0].vdiv, 1)} V/div · CH2 ${fx(o.ch[1].vdiv, 1)} V/div · T ↑ CH1 2,50 V · 1 GSa/s`;
}

/* ------------------------------------------------------------------ multimetrul */
function citesteDMM() {
  const s = sim.dmm.s, sg = semnal(s);
  let v = sg.tip === "dc" ? sg.v : sg.tip === "pwm" ? sg.ton / sg.T * sg.v : sg.tip === "isr" ? MD.uPin(P(), "mega", 1) / 2 : 0;
  v = Math.round((v + (Math.random() - 0.5) * 0.0014) * 1000) / 1000;
  sim.dmm.v = Math.max(0, v);
  $("#dmm-v").textContent = sim.dmm.v.toFixed(3);
}

/* ------------------------------------------------------------------ monitorul serial */
function linieSerial() {
  const fw = pinMega(), fs = sim.fw.stm || {}, p = P(), out = [];
  if (fw.prog === "mega_adc") { const U = sim.alfa * p.vcc, N = Math.max(0, Math.min(1023, MD.codADC(p, "mega", U) + (Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0))); sim.nMega = N; out.push(`[Mega]  N = ${N}   U = ${(N * 5.0 / 1024).toFixed(3)}`); }
  if (fw.prog === "mega_isr" && fw.isr === "ser" && sim.gen) out.push(`[Mega]  ${(sim.n = (sim.n || 0) + 200)}…`);
  if (fs.prog === "stm_adc") { const U = sim.alfaS * p.vdd, N = Math.max(0, Math.min(4095, MD.codADC(p, "stm", U) + Math.round((Math.random() - 0.5) * 4))); sim.nStm = N; out.push(`[STM32] N = ${N}   U = ${(N * 3.3 / 4096).toFixed(4)}`); }
  if (!out.length) return;
  sim.serial.push(...out); while (sim.serial.length > 14) sim.serial.shift(); sim.tx = performance.now();
  const el = $("#serial"); if (el && sim.panou === "serial") { el.textContent = sim.serial.join("\n"); el.scrollTop = el.scrollHeight; }
}

/* ------------------------------------------------------------------ standul (SVG) */
const XY = { pin11: [216.7, 50], pin9: [240.1, 50], pin13: [193.3, 50], pin2: [336, 50], A0: [276.5, 232], v5: [213.3, 232], PB12: [586, 279], PA0: [536, 371], v33: [676, 371], off: [0, 0] };
function standSVG() {
  let s = `<svg viewBox="0 0 900 430" id="stand" role="img" aria-label="Standul de lucru: Arduino Mega 2560, placa de test, STM32F103, generatorul de semnal" style="width:100%;height:auto;display:block;touch-action:none">
<defs>
 <pattern id="gauri" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#f4f1ea"/><rect x="3" y="3" width="3" height="3" rx=".6" fill="#2e2e2e" opacity=".55"/></pattern>
 <linearGradient id="met" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9bec4"/><stop offset="1" stop-color="#8d939a"/></linearGradient>
 <radialGradient id="ledOn" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff2c8"/><stop offset=".35" stop-color="#ff4a3a"/><stop offset="1" stop-color="rgba(255,40,30,0)"/></radialGradient>
 <linearGradient id="buton" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#444"/><stop offset="1" stop-color="#111"/></linearGradient>
</defs>
<rect width="900" height="430" rx="10" fill="#9aa1a8"/><rect x="6" y="6" width="888" height="418" rx="8" fill="url(#met)"/>
<rect x="6" y="250" width="888" height="16" fill="#c9cdd1" stroke="#7b8187"/><text x="14" y="262" font-size="9" fill="#555">șină DIN 35 mm</text>`;
  // Arduino Mega 2560
  s += `<g id="mega"><rect x="40" y="40" width="440" height="205" rx="8" fill="#127c9c" stroke="#0b5269" stroke-width="2"/>
  ${[[52, 52], [52, 232], [468, 52], [468, 232], [400, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#d9dde1" stroke="#7a8288"/>`).join("")}
  <rect x="22" y="82" width="52" height="42" rx="3" fill="#c7cbd0" stroke="#6e757b"/><rect x="28" y="90" width="40" height="26" fill="#9aa0a6"/>
  <rect x="24" y="170" width="54" height="38" rx="4" fill="#1b1b1b"/><circle cx="42" cy="189" r="9" fill="#333"/>
  <rect x="215" y="105" width="78" height="78" rx="3" fill="#1d1f22"/><circle cx="224" cy="114" r="3" fill="#33373b"/>
  <text x="254" y="140" fill="#c9ced3" font-size="8" text-anchor="middle" font-family="monospace">ATMEGA2560</text><text x="254" y="152" fill="#9aa0a6" font-size="7" text-anchor="middle" font-family="monospace">16AU 2534</text>
  <rect x="108" y="96" width="26" height="26" rx="2" fill="#1d1f22"/><text x="121" y="131" fill="#d6edf4" font-size="6" text-anchor="middle">16U2</text>
  <rect x="150" y="108" width="20" height="8" rx="3" fill="#cfd3d6"/><text x="160" y="126" fill="#d6edf4" font-size="6" text-anchor="middle">16.000</text>
  <text x="330" y="205" fill="#e8f6fa" font-size="13" font-weight="700" font-family="sans-serif">ARDUINO</text><text x="330" y="220" fill="#e8f6fa" font-size="10" font-family="sans-serif">MEGA 2560</text>
  <circle cx="440" cy="110" r="4" fill="#3cff4a"/><text x="440" y="125" font-size="6" fill="#e8f6fa" text-anchor="middle">ON</text>
  <circle id="ledL" cx="250" cy="80" r="3.6" fill="#5a3b0a"/><text x="262" y="83" font-size="6" fill="#e8f6fa">L</text>
  <circle id="ledTX" cx="150" cy="80" r="3" fill="#4a3a14"/><text x="157" y="83" font-size="6" fill="#e8f6fa">TX</text>
  <rect x="140" y="44" width="122" height="14" fill="#151515"/><rect x="270" y="44" width="168" height="14" fill="#151515"/>
  ${Array.from({ length: 10 }, (_, i) => `<rect x="${144 + i * 11.7}" y="48" width="5" height="5" fill="#d8b46a"/>`).join("")}
  ${Array.from({ length: 14 }, (_, i) => `<rect x="${274 + i * 11.9}" y="48" width="5" height="5" fill="#d8b46a"/>`).join("")}
  ${["SCL", "SDA", "AREF", "GND", "13", "12", "11", "10", "9", "8"].map((t, i) => `<text x="${146.5 + i * 11.7}" y="66" font-size="5.5" fill="#e8f6fa" text-anchor="middle">${t}</text>`).join("")}${["7", "6", "5", "4", "3", "2", "1", "0", "14", "15", "16", "17", "18", "19"].map((t, i) => `<text x="${276.5 + i * 11.9}" y="66" font-size="6" fill="#e8f6fa" text-anchor="middle">${t}</text>`).join("")}<text x="190" y="76" font-size="6" fill="#e8f6fa">PWM ~ (2…13)   DIGITAL</text>
  <rect x="160" y="226" width="96" height="14" fill="#151515"/><rect x="270" y="226" width="196" height="14" fill="#151515"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${164 + i * 11.7}" y="230" width="5" height="5" fill="#d8b46a"/>`).join("")}
  ${Array.from({ length: 16 }, (_, i) => `<rect x="${274 + i * 11.9}" y="230" width="5" height="5" fill="#d8b46a"/>`).join("")}
  ${["", "IORF", "RST", "3V3", "5V", "GND", "GND", "VIN"].map((t, i) => `<text x="${166.5 + i * 11.7}" y="223" font-size="5" fill="#e8f6fa" text-anchor="middle">${t}</text>`).join("")}${Array.from({ length: 16 }, (_, i) => `<text x="${276.5 + i * 11.9}" y="223" font-size="5" fill="#e8f6fa" text-anchor="middle">A${i}</text>`).join("")}<text x="330" y="214" font-size="6" fill="#e8f6fa">ANALOG IN</text>
  <rect x="462" y="70" width="14" height="150" fill="#151515"/></g>`;
  // placa de test (breadboard) cu potențiometrul, butonul, LED-ul și rezistorul
  s += `<g><rect x="510" y="30" width="370" height="200" rx="5" fill="url(#gauri)" stroke="#c9c2b3"/>
  <line x1="514" y1="42" x2="876" y2="42" stroke="#d33" stroke-width="1.4"/><line x1="514" y1="218" x2="876" y2="218" stroke="#23c" stroke-width="1.4"/>
  <g id="pot" style="cursor:grab"><rect x="545" y="95" width="70" height="70" rx="8" fill="#2c66b8" stroke="#163a6b"/><circle cx="580" cy="130" r="27" fill="#1b2430" stroke="#0b0f14" stroke-width="2"/><circle cx="580" cy="130" r="20" fill="#3a4654"/><line id="potAc" x1="580" y1="130" x2="580" y2="110" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <text x="580" y="182" font-size="8" text-anchor="middle" fill="#333">10 kΩ (A0)</text></g>
  <g id="btn" style="cursor:pointer"><rect x="660" y="150" width="34" height="34" rx="3" fill="#1d1d1d"/><circle id="btnC" cx="677" cy="167" r="10" fill="url(#buton)" stroke="#000"/><text x="677" y="196" font-size="8" text-anchor="middle" fill="#333">buton D2</text></g>
  <g><rect x="720" y="88" width="36" height="12" rx="5" fill="#e3c99a" stroke="#9c8156"/><rect x="727" y="88" width="3" height="12" fill="#c22"/><rect x="733" y="88" width="3" height="12" fill="#c22"/><rect x="739" y="88" width="3" height="12" fill="#7a4a1b"/><rect x="748" y="88" width="3" height="12" fill="#c9a640"/><text x="738" y="84" font-size="8" text-anchor="middle" fill="#333">220 Ω</text>
    <circle id="ledG" cx="800" cy="94" r="20" fill="url(#ledOn)" opacity="0"/><path d="M790,94 a10,10 0 0 1 20,0 v12 h-20 z" fill="#c0201a" stroke="#7a1410"/><circle id="ledR" cx="800" cy="94" r="7" fill="#e33" opacity=".25"/><text x="800" y="124" font-size="8" text-anchor="middle" fill="#333">LED D13</text></g>
  <path d="M213,238 C213,290 530,10 560,108" fill="none" stroke="#d32f2f" stroke-width="3"/><path d="M225,238 C230,300 540,280 600,158" fill="none" stroke="#222" stroke-width="3"/>
  <path d="M276,238 C276,270 520,250 580,160" fill="none" stroke="#f2c230" stroke-width="3"/>
  <path d="M193,48 C193,10 690,10 724,94" fill="none" stroke="#ff8a1f" stroke-width="3"/><path d="M336,48 C336,20 650,40 668,152" fill="none" stroke="#2fa84f" stroke-width="3"/></g>`;
  // STM32 Blue Pill + ST-Link + potențiometrul STM32
  s += `<g><rect x="500" y="290" width="260" height="78" rx="4" fill="#1f4fbf" stroke="#12307a" stroke-width="2"/>
  <rect x="505" y="292" width="250" height="9" fill="#151515"/><rect x="505" y="357" width="250" height="9" fill="#151515"/>
  ${Array.from({ length: 20 }, (_, i) => `<rect x="${509 + i * 12.4}" y="294" width="4" height="4" fill="#d8b46a"/><rect x="${509 + i * 12.4}" y="359" width="4" height="4" fill="#d8b46a"/>`).join("")}
  <g transform="translate(625 329) rotate(45)"><rect x="-19" y="-19" width="38" height="38" rx="2" fill="#1d1f22"/></g><text x="625" y="332" font-size="6" fill="#c9ced3" text-anchor="middle" font-family="monospace">STM32F103</text>
  <rect x="486" y="318" width="20" height="22" rx="3" fill="#c7cbd0"/><rect x="560" y="310" width="16" height="10" fill="#e8c21a"/><rect x="560" y="322" width="16" height="10" fill="#e8c21a"/>
  <circle cx="700" cy="314" r="3" fill="#ff4848"/><circle id="ledS" cx="586" cy="279" r="6" fill="#e33" opacity=".25"/><text x="600" y="282" font-size="7" fill="#333">LED PB12</text>
  <text x="705" y="345" font-size="9" fill="#dfe8ff" font-weight="700">BLUE PILL</text></g>
  <g><rect x="780" y="300" width="100" height="40" rx="5" fill="url(#met)" stroke="#555"/><text x="830" y="324" font-size="9" text-anchor="middle" fill="#222" font-weight="700">ST-LINK V2</text><path d="M780,320 C770,330 770,335 760,330" stroke="#555" stroke-width="3" fill="none"/></g>
  <g id="potS" style="cursor:grab"><rect x="512" y="378" width="40" height="40" rx="5" fill="#2c66b8"/><circle cx="532" cy="398" r="14" fill="#1b2430"/><line id="potSAc" x1="532" y1="398" x2="532" y2="387" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><text x="560" y="402" font-size="8" fill="#333">10 kΩ (PA0)</text></g>
  <path d="M536,368 C536,374 532,376 532,382" stroke="#f2c230" stroke-width="2.5" fill="none"/>`;
  // generatorul de semnal
  s += `<g id="gen" style="cursor:pointer"><rect x="40" y="290" width="230" height="120" rx="6" fill="#d7dade" stroke="#6f767c"/><rect x="52" y="302" width="150" height="54" rx="3" fill="#0c1b12"/>
  <text id="genT1" x="60" y="324" font-size="15" fill="#6dff8e" font-family="monospace">1.000000 kHz</text><text id="genT2" x="60" y="345" font-size="11" fill="#6dff8e" font-family="monospace">⎍ 5.00 Vpp  +2.50 V</text>
  <rect x="212" y="306" width="46" height="22" rx="3" fill="#2a2a2a"/><text x="235" y="321" font-size="9" fill="#fff" text-anchor="middle">Output</text>
  <circle id="genLed" cx="235" cy="340" r="5" fill="#3cff4a"/><text x="60" y="380" font-size="10" fill="#333">Generator de funcții – ieșire pe D2 (50 Ω)</text><text x="60" y="396" font-size="9" fill="#555">clic: pornește / oprește ieșirea</text>
  <path d="M270,330 C330,330 320,120 336,58" fill="none" stroke="#2fa84f" stroke-width="2" stroke-dasharray="4 3"/></g>`;
  // marcajele sondelor
  s += `<g id="sonde"></g></svg>`;
  return s;
}
function actualizeazaSonde() {
  const g = $("#sonde"); if (!g) return;
  const m = [[sim.osc.ch[0].s, CUL[0], "1"], [sim.osc.ch[1].s, CUL[1], "2"], [sim.dmm.s, "#ff4d4d", "V"]];
  g.innerHTML = m.filter(x => x[0] !== "off" && XY[x[0]]).map(([s, c, t], i) => { const [x, y] = XY[s]; const dy = -22 - i * 4; return `<line x1="${x}" y1="${y}" x2="${x + 8 * i}" y2="${y + dy}" stroke="${c}" stroke-width="2"/><circle cx="${x + 8 * i}" cy="${y + dy}" r="8" fill="${c}" stroke="#000"/><text x="${x + 8 * i}" y="${y + dy + 4}" font-size="10" font-weight="700" text-anchor="middle" fill="#000">${t}</text>`; }).join("");
}
function legaStand() {
  const unghi = a => -135 + 270 * a;
  const roteste = (el, a, cx, cy, L) => { const u = unghi(a) * Math.PI / 180; el.setAttribute("x2", cx + Math.sin(u) * L); el.setAttribute("y2", cy - Math.cos(u) * L); };
  const potRot = () => { roteste($("#potAc"), sim.alfa, 580, 130, 20); roteste($("#potSAc"), sim.alfaS, 532, 398, 11); };
  potRot();
  const trage = (id, cx, cy, k) => {
    const el = $(id); let act = false;
    const set = e => { const svg = $("#stand"), r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 900, y = (e.clientY - r.top) / r.height * 430; let u = Math.atan2(x - cx, cy - y) * 180 / Math.PI; u = Math.max(-135, Math.min(135, u)); sim[k] = Math.round((u + 135) / 270 * 1000) / 1000; potRot(); };
    el.addEventListener("pointerdown", e => { act = true; el.setPointerCapture(e.pointerId); set(e); });
    el.addEventListener("pointermove", e => { if (act) set(e); });
    el.addEventListener("pointerup", () => { act = false; });
    el.addEventListener("wheel", e => { e.preventDefault(); sim[k] = Math.max(0, Math.min(1, sim[k] - Math.sign(e.deltaY) * 0.005)); potRot(); }, { passive: false });
  };
  trage("#pot", 580, 130, "alfa"); trage("#potS", 532, 398, "alfaS");
  const b = $("#btn");
  b.addEventListener("pointerdown", () => { sim.buton = true; $("#btnC").setAttribute("r", "8.5"); if (!sim.gen) evenimentButon(); });
  ["pointerup", "pointerleave"].forEach(ev => b.addEventListener(ev, () => { sim.buton = false; $("#btnC").setAttribute("r", "10"); }));
  $("#gen").addEventListener("click", () => { sim.gen = !sim.gen; $("#genLed").setAttribute("fill", sim.gen ? "#3cff4a" : "#333"); $("#genT1").setAttribute("opacity", sim.gen ? 1 : 0.25); $("#genT2").setAttribute("opacity", sim.gen ? 1 : 0.25); });
}
function actualizeazaLeduri(acum) {
  const fw = pinMega(), fs = sim.fw.stm || {};
  let v = 0;
  if (fw.prog === "mega_gpio") v = fw.stare ? 1 : 0; else if (fw.prog === "mega_isr") v = sim.gen ? 0.5 : (sim.led13 ? 1 : 0);
  $("#ledR").setAttribute("opacity", 0.25 + 0.75 * v); $("#ledG").setAttribute("opacity", v * 0.9); $("#ledL").setAttribute("fill", v ? `rgba(255,190,40,${0.4 + 0.6 * v})` : "#5a3b0a");
  $("#ledTX").setAttribute("fill", acum - sim.tx < 60 ? "#ffd04a" : "#4a3a14");
  $("#ledS").setAttribute("opacity", fs.prog === "stm_gpio" && fs.stare ? 1 : 0.25);
}

/* ------------------------------------------------------------------ editorul și compilarea */
function afiseazaCod() {
  const k = sim.editor;
  $("#cd-titlu").textContent = `${PROG[k].titlu} › src › main.cpp`;
  $("#cd-cod").innerHTML = cod(k).split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#cd-cod [data-cf]").forEach(el => el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.tagName === "SELECT" ? el.value : num(el.value); }));
  $$("#cd-lista button").forEach(b => b.classList.toggle("activ", b.dataset.p === k));
  $("#cd-env").textContent = PROG[k].placa === "mega" ? "env:megaatmega2560" : "env:bluepill_f103c8";
}
function terminal(lin, cls) { const t = $("#term"); t.insertAdjacentHTML("beforeend", `<div class="${cls || ""}">${lin}</div>`); t.scrollTop = t.scrollHeight; }
function incarca(doarBuild) {
  if (sim.inc) return;
  const k = sim.editor, pr = PROG[k], mega = pr.placa === "mega", err = verificaCod(k);
  panou("term"); $("#term").innerHTML = "";
  const env = mega ? "megaatmega2560" : "bluepill_f103c8", fl = mega ? 2900 + Math.round(Math.random() * 3000) : 13800 + Math.round(Math.random() * 4000);
  const pasi = [
    [`Processing ${env} (platform: ${mega ? "atmelavr" : "ststm32"}; board: ${env}; framework: arduino)`, ""],
    ["--------------------------------------------------------------------------------", "slab"],
    [`Compiling .pio/build/${env}/src/main.cpp.o`, ""]
  ];
  if (err && err[0].includes("error")) pasi.push([err[0], "err"], ["*** [.pio/build/" + env + "/src/main.cpp.o] Error 1", "err"], ["========================= [FAILED] Took 1.84 seconds =========================", "err"]);
  else {
    if (err) pasi.push([err[0], "warn"]);
    pasi.push([`Linking .pio/build/${env}/firmware.elf`, ""], [`RAM:   [=         ]   ${mega ? "9.6% (used 788 bytes from 8192 bytes)" : "5.2% (used 1064 bytes from 20480 bytes)"}`, ""],
      [`Flash: [${mega ? "          ]   " + fx(fl / 253952 * 100, 1).replace(",", ".") + "% (used " + fl + " bytes from 253952 bytes)" : "==        ]  " + fx(fl / 65536 * 100, 1).replace(",", ".") + "% (used " + fl + " bytes from 65536 bytes)"}`, ""]);
    if (!doarBuild) {
      if (mega) pasi.push(["Configuring upload protocol... AVAILABLE: wiring  CURRENT: upload_protocol = wiring", ""], ["Looking for upload port... Auto-detected: /dev/ttyACM0", ""], [`Uploading .pio/build/${env}/firmware.hex`, ""], ["avrdude: AVR device initialized and ready to accept instructions", ""], [`avrdude: writing flash (${fl} bytes): ████████████████████ 100%`, ""], [`avrdude: ${fl} bytes of flash verified`, "ok"]);
      else pasi.push(["Configuring upload protocol... CURRENT: upload_protocol = stlink", ""], ["Open On-Chip Debugger 0.12.0 – Info : STLINK V2J37S7 (API v2) VID:PID 0483:3748", ""], ["Info : Target voltage: " + P().vdd.toFixed(3), ""], ["** Programming Started **", ""], ["** Programming Finished **", "ok"], ["** Verified OK **", "ok"], ["** Resetting Target **", ""]);
      pasi.push([`========================= [SUCCESS] Took ${fx(2.4 + Math.random() * 1.5, 2).replace(",", ".")} seconds =========================`, "ok"]);
    } else pasi.push([`========================= [SUCCESS] Took ${fx(1.2 + Math.random() * 0.6, 2).replace(",", ".")} seconds =========================`, "ok"]);
  }
  sim.inc = true; let i = 0;
  const urm = () => {
    if (i >= pasi.length) {
      sim.inc = false;
      if (!doarBuild && !(err && err[0].includes("error"))) { sim.fw[pr.placa] = snapshot(k); sim.n = 0; sim.led13 = false; actualizeazaFw(); if (k.endsWith("adc")) setTimeout(() => panou("serial"), 600); }
      return;
    }
    terminal(pasi[i][0], pasi[i][1]); i++; setTimeout(urm, 90 + Math.random() * 180);
  };
  urm();
}
function actualizeazaFw() {
  const f = sim.fw.mega, s = sim.fw.stm;
  const d = f => !f ? "—" : PROG[f.prog].titlu + (f.prog === "mega_t1" ? ` (P = ${f.P}, ICR1 = ${f.top}, OCR1A = ${f.ocr})` : f.prog === "mega_aw" ? ` (valoare ${f.val})` : f.prog === "mega_isr" ? ` (ISR: ${{ dw: "digitalWrite", port: "PINB", ser: "Serial + digitalWrite" }[f.isr]})` : f.stare !== undefined ? ` (${f.stare ? "HIGH" : "LOW"})` : "");
  $("#fw-mega").textContent = d(f); $("#fw-stm").textContent = d(s);
}
function panou(p) { sim.panou = p; $$("[data-pn]").forEach(b => b.classList.toggle("activ", b.dataset.pn === p)); $("#term").hidden = p !== "term"; $("#serial").hidden = p !== "serial"; if (p === "serial") { $("#serial").textContent = sim.serial.join("\n"); } }

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const rot = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
function inregGPIO(e) {
  const s = sim.dmm.s, fw = sim.fw.mega || {}, fs = sim.fw.stm || {};
  let placa, stare;
  if (s === "pin13" && fw.prog === "mega_gpio") { placa = "mega"; stare = fw.stare; }
  else if (s === "PB12" && fs.prog === "stm_gpio") { placa = "stm"; stare = fs.stare; }
  else return Cadru.mesajTemporar("Încărcați programul de ieșire digitală (mega_gpio sau stm32_gpio) și puneți sonda multimetrului pe pinul de ieșire (D13 sau PB12).", "atentie");
  const U = sim.dmm.v, r = stare ? "UOH" : "UOL";
  const ok = Cadru.inregistreaza(e, { log: { m: "gpio", placa, stare: stare ? 1 : 0, U }, celule: [{ t: "t11", r, c: placa, v: U.toFixed(3) }] });
  if (ok) msg(`Tabelul 1.1: ${r} ${placa === "mega" ? "Arduino Mega" : "STM32F103"} = ${fx(U, 3)} V.`);
}
function inregADC(e, placa) {
  const fw = placa === "mega" ? sim.fw.mega || {} : sim.fw.stm || {}, pin = placa === "mega" ? "A0" : "PA0";
  if (fw.prog !== (placa === "mega" ? "mega_adc" : "stm_adc")) return Cadru.mesajTemporar(`Încărcați programul ${placa === "mega" ? "mega_adc" : "stm32_adc"} și deschideți monitorul serial.`, "atentie");
  if (sim.dmm.s !== pin) return Cadru.mesajTemporar(`Puneți sonda multimetrului pe ${pin} (cursorul potențiometrului).`, "atentie");
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
    if (sim.osc.ch[0].s !== "pin9" || !a || !a.m.f) return Cadru.mesajTemporar("Conectați CH1 al osciloscopului pe D9 și ajustați baza de timp până apar măsurătorile automate.", "atentie");
    const f = rot(a.m.f, 1), dc = rot(a.m.dc, 2);
    const ok = Cadru.inregistreaza(e, { log: { m: "aw", f, dc }, celule: [{ t: "t13", r: "aw", c: "f", v: f.toFixed(1) }, { t: "t13", r: "aw", c: "dc", v: dc.toFixed(2) }] });
    if (ok) msg(`Tabelul 1.3 (analogWrite): f = ${fx(f, 1)} Hz, DC = ${fx(dc, 2)} %.`); return;
  }
  if (fw.prog !== "mega_t1") return Cadru.mesajTemporar("Încărcați programul mega_timer1_pwm (sau mega_pwm_implicit pentru rândul analogWrite).", "atentie");
  if (fw.P !== 1 || fw.top !== 799 || !MD.OCR.includes(fw.ocr)) return Cadru.mesajTemporar("Tabelul 1.3 se completează cu P = 1 (CS10), ICR1 = 799 și OCR1A = 199, 399 sau 599.", "atentie");
  if (sim.osc.ch[0].s !== "pin11" || !a || !a.m.f) return Cadru.mesajTemporar("Conectați CH1 al osciloscopului pe D11 (OC1A) și alegeți o bază de timp potrivită (de ex. 10 µs/div).", "atentie");
  if (sim.dmm.s !== "pin11") return Cadru.mesajTemporar("Puneți și sonda multimetrului pe D11 pentru tensiunea medie.", "atentie");
  const f = Math.round(a.m.f), dc = rot(a.m.dc, 2), um = sim.dmm.v, r = "o" + fw.ocr;
  const ok = Cadru.inregistreaza(e, { log: { m: "pwm", ocr: fw.ocr, f, dc, um }, celule: [{ t: "t13", r, c: "f", v: String(f) }, { t: "t13", r, c: "dc", v: dc.toFixed(2) }, { t: "t13", r, c: "um", v: um.toFixed(3) }] });
  if (ok) msg(`Tabelul 1.3 (OCR1A = ${fw.ocr}): f = ${f} Hz, DC = ${fx(dc, 2)} %, U_med = ${fx(um, 3)} V.`);
}
function inregLat(e) {
  const fw = sim.fw.mega || {}, a = sim.osc.acq;
  if (fw.prog !== "mega_isr" || fw.isr === "ser") return Cadru.mesajTemporar("Încărcați programul mega_intrerupere cu rutina digitalWrite() sau cu scrierea directă în PINB.", "atentie");
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
.mam-bara { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; margin:.4rem 0; }
.vs { background:#1e1e1e; color:#d4d4d4; border-radius:8px; overflow:hidden; border:1px solid #333; font:12.5px/1.45 ui-monospace,Consolas,"Cascadia Code",monospace; }
.vs-sus { display:flex; align-items:center; gap:.5rem; background:#2d2d2d; padding:.3rem .6rem; color:#ccc; font:12px system-ui,sans-serif; }
.vs-sus b { color:#fff; font-weight:600; } .vs-sus .env { margin-left:auto; color:#e7a43a; }
.vs-corp { display:grid; grid-template-columns:170px 1fr; min-height:300px; }
.vs-lista { background:#252526; padding:.4rem 0; border-right:1px solid #333; font:12px system-ui,sans-serif; }
.vs-lista div { padding:.2rem .7rem; color:#9da5b4; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
.vs-lista button { display:block; width:100%; text-align:left; background:none; border:0; color:#ccc; padding:.25rem .9rem; cursor:pointer; font:12px ui-monospace,monospace; }
.vs-lista button:hover { background:#2a2d2e; } .vs-lista button.activ { background:#37373d; color:#fff; }
.vs-lista small { display:block; color:#888; font:10.5px system-ui,sans-serif; }
#cd-cod { margin:0; padding:.6rem .4rem; white-space:pre; overflow:auto; max-height:320px; background:#1e1e1e; color:#d4d4d4; }
.cd-ln { display:inline-block; width:2.4em; color:#858585; text-align:right; margin-right:1em; user-select:none; }
.cd-k { color:#569cd6; } .cd-s { color:#ce9178; } .cd-c { color:#6a9955; } .cd-n { color:#b5cea8; }
.cd-f { background:#3c3c3c; color:#ffd479; border:1px solid #6d6d6d; border-radius:3px; font:inherit; padding:0 .2rem; max-width:100%; }
.vs-bara { display:flex; gap:.3rem; background:#007acc; padding:.25rem .5rem; align-items:center; flex-wrap:wrap; }
.vs-bara button { background:transparent; border:1px solid rgba(255,255,255,.35); color:#fff; border-radius:3px; padding:.15rem .55rem; cursor:pointer; font:12px system-ui,sans-serif; }
.vs-bara button.activ { background:rgba(255,255,255,.22); } .vs-bara span { color:#e8f4ff; font:11px system-ui,sans-serif; margin-left:auto; }
#term, #serial { margin:0; height:150px; overflow:auto; background:#181818; color:#cccccc; padding:.4rem .6rem; white-space:pre-wrap; font:11.5px/1.4 ui-monospace,Consolas,monospace; }
#term .ok { color:#89d185; } #term .err { color:#f48771; } #term .warn { color:#cca700; } #term .slab { color:#6b6b6b; }
.rigol { background:#2b2e33; border-radius:8px; padding:.5rem; color:#dfe3e8; }
.rigol canvas { width:100%; height:260px; display:block; border-radius:3px; }
.rigol .mam-bara label { font-size:.78rem; color:#cfd5db; } .rigol select { background:#1a1d21; color:#e9edf1; border:1px solid #555; border-radius:3px; }
#osc-run { background:#c62828; color:#fff; border:0; border-radius:4px; padding:.25rem .8rem; font-weight:700; }
.rigol .mam-bara { display:grid; grid-template-columns:auto repeat(3, minmax(0,1fr)); gap:.35rem .6rem; align-items:end; } .rigol .mam-bara label { display:flex; flex-direction:column; gap:.1rem; } .rigol .mam-bara select { width:100%; }
#osc-stare { font:11px ui-monospace,monospace; color:#9fb3c8; } #osc-cit { font:12px ui-monospace,monospace; color:#ffe96b; min-height:1.2em; margin:.3rem 0 0; }
.dmm { display:flex; align-items:center; gap:.8rem; background:#e9b400; border-radius:12px; padding:.5rem .7rem; color:#222; }
.dmm .ecr { background:#a9b59a; border:3px solid #333; border-radius:6px; padding:.2rem .6rem; font:700 1.9rem/1 "DSEG7 Classic",ui-monospace,monospace; color:#1b2015; min-width:7.5rem; text-align:right; }
.dmm select { font-size:.8rem; }
.fw { font-size:.8rem; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; } .fw b { font-family:ui-monospace,monospace; }
@media (max-width:720px){ .vs-corp { grid-template-columns:1fr; } .vs-lista { display:flex; flex-wrap:wrap; } .vs-lista div { width:100%; } .vs-lista button { width:auto; } }
</style>`;
const SURSE = ["pin11", "pin9", "pin13", "pin2", "A0", "PB12", "PA0", "off"];
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
    <div class="card sim-scena scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      ${standSVG()}
      <p class="nota" style="margin:.3rem 0">Rotiți potențiometrele cu mouse-ul (sau rotița), apăsați butonul D2, clic pe generator pentru a-i porni/opri ieșirea. Marcajele colorate arată unde sunt sondele.</p>
      <div class="vs">
        <div class="vs-sus"><b>VS Code</b> · PlatformIO <span id="cd-titlu"></span><span class="env" id="cd-env"></span></div>
        <div class="vs-corp">
          <div class="vs-lista" id="cd-lista"><div>Proiecte</div>${Object.entries(PROG).map(([k, p]) => `<button type="button" data-p="${k}">${p.titlu}<small>${p.desc}</small></button>`).join("")}</div>
          <pre id="cd-cod"></pre>
        </div>
        <div class="vs-bara"><button type="button" id="btn-build" title="PlatformIO: Build">✓ Build</button><button type="button" id="btn-up" title="PlatformIO: Upload">→ Upload</button><button type="button" data-pn="term" class="activ">TERMINAL</button><button type="button" data-pn="serial">SERIAL MONITOR (115200)</button><span>UTF-8 · C++ · PlatformIO</span></div>
        <pre id="term">Selectați un proiect din stânga, modificați câmpurile galbene și apăsați → Upload.</pre><pre id="serial" hidden></pre>
      </div>
      <div class="rigol" style="margin-top:.6rem">
        <div class="mam-bara"><b style="color:#fff">RIGOL DS1074Z Plus</b>
          <label>Timp/div <select id="osc-t">${TDIV.map(v => `<option value="${v}">${fmtT(v)}</option>`).join("")}</select></label>
          ${[0, 1].map(c => `<label style="color:${CUL[c]}">CH${c + 1} <select data-och="${c}">${SURSE.map(s => `<option value="${s}">${PIN_ET[s]}</option>`).join("")}</select></label><label>V/div <select data-ov="${c}">${VDIV.map(v => `<option value="${v}">${fx(v, 1)}</option>`).join("")}</select></label>`).join("")}
          <button type="button" id="osc-run">STOP</button>
        </div>
        <canvas id="cv-osc" height="260" aria-label="Ecranul osciloscopului"></canvas>
        <div id="osc-stare"></div><p id="osc-cit"></p>
      </div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Multimetrul (DC V)</h2>
      <div class="dmm"><div class="ecr" id="dmm-v">0.000</div><div><b>V DC</b><br><label>Sonda + pe <select id="dmm-s">${["A0", "pin11", "pin9", "pin13", "pin2", "v5", "PB12", "PA0", "v33"].map(s => `<option value="${s}">${PIN_ET[s]}</option>`).join("")}</select></label><br><small>COM la GND</small></div></div>
      <h2>Programele încărcate</h2>
      <p class="fw">Arduino Mega: <b id="fw-mega">—</b><br>STM32F103: <b id="fw-stm">—</b></p>
      <h2>Înregistrare în tabele</h2>
      <button type="button" class="primar lat" id="btn-t11">● U<sub>OH</sub>/U<sub>OL</sub> (multimetru) → Tabelul 1.1</button>
      <div class="rand-butoane"><label class="camp" style="margin:0">Punct <select id="sel-punct-mega">${[1, 2, 3, 4, 5].map(i => `<option value="p${i}">${i}</option>`).join("")}</select></label><button type="button" class="primar" id="btn-t12">● U, N Mega → Tabelul 1.2</button></div>
      <div class="rand-butoane"><label class="camp" style="margin:0">Punct <select id="sel-punct-stm">${[1, 2, 3].map(i => `<option value="s${i}">${i}</option>`).join("")}</select></label><button type="button" class="primar" id="btn-t12b">● U, N STM32 → Tabelul 1.2b</button></div>
      <button type="button" class="primar lat" id="btn-t13">● f, DC (osciloscop), U<sub>med</sub> → Tabelul 1.3</button>
      <button type="button" class="primar lat" id="btn-t14">● Întârzierea D2→D13 → Tabelul 1.4</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Valorile se trec în tabele numai din aparate: multimetrul, monitorul serial și măsurătorile automate ale osciloscopului.</p>
    </aside>
  </div>`,
    init(C) {
      legaStand(); afiseazaCod(); actualizeazaFw(); actualizeazaSonde();
      $$("#cd-lista button").forEach(b => b.addEventListener("click", () => { sim.editor = b.dataset.p; afiseazaCod(); }));
      $("#btn-build").addEventListener("click", () => incarca(true));
      $("#btn-up").addEventListener("click", () => incarca(false));
      $$("[data-pn]").forEach(b => b.addEventListener("click", () => panou(b.dataset.pn)));
      $("#osc-t").value = String(sim.osc.tdiv);
      $("#osc-t").addEventListener("change", e => { sim.osc.tdiv = +e.target.value; achizitie(); deseneazaOsc(); });
      $$("[data-och]").forEach(s => { const c = +s.dataset.och; s.value = sim.osc.ch[c].s; s.addEventListener("change", () => { sim.osc.ch[c].s = s.value; actualizeazaSonde(); achizitie(); deseneazaOsc(); }); });
      $$("[data-ov]").forEach(s => { const c = +s.dataset.ov; s.value = String(sim.osc.ch[c].vdiv); s.addEventListener("change", () => { sim.osc.ch[c].vdiv = +s.value; deseneazaOsc(); }); });
      $("#osc-run").addEventListener("click", () => { sim.osc.ruleaza = !sim.osc.ruleaza; $("#osc-run").textContent = sim.osc.ruleaza ? "STOP" : "RUN"; deseneazaOsc(); });
      $("#dmm-s").value = sim.dmm.s; $("#dmm-s").addEventListener("change", e => { sim.dmm.s = e.target.value; actualizeazaSonde(); citesteDMM(); });
      $("#btn-t11").addEventListener("click", inregGPIO);
      $("#btn-t12").addEventListener("click", e => inregADC(e, "mega"));
      $("#btn-t12b").addEventListener("click", e => inregADC(e, "stm"));
      $("#btn-t13").addEventListener("click", inregPWM);
      $("#btn-t14").addEventListener("click", inregLat);
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      ["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, () => setTimeout(deseneazaOsc, 120)));
      achizitie(); citesteDMM();
      C.mesaj("Începeți cu proiectul mega_gpio: alegeți HIGH, încărcați programul (→ Upload) și măsurați cu multimetrul pe D13.", "");
    },
    reset() { Object.assign(sim, { fw: { mega: null, stm: null }, serial: [], n: 0, led13: false, nMega: undefined, nStm: undefined }); if ($("#fw-mega")) actualizeazaFw(); },
    cadru(dt, C, vizibil) {
      const acum = performance.now();
      if (acum - sim.tSer > 200) { sim.tSer = acum; linieSerial(); }
      if (!vizibil) return;
      if (sim.osc.ruleaza && acum - sim.osc.tAcq > 140) { sim.osc.tAcq = acum; achizitie(); deseneazaOsc(); }
      if (acum - sim.dmm.tA > 330) { sim.dmm.tA = acum; citesteDMM(); }
      actualizeazaLeduri(acum);
      if (acum - (this._ts || 0) > 300) { this._ts = acum; const fw = sim.fw.mega; C.stare(1, fw ? `Mega: ${PROG[fw.prog].titlu}` : "Mega: fără program", fw ? "inc" : ""); C.stare(2, sim.fw.stm ? `STM32: ${PROG[sim.fw.stm.prog].titlu}` : ""); }
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
