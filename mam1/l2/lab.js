/* MAM I – Lucrarea 2. Condiționarea semnalelor și conversia analog-digitală.
   Simulator în stilul Tinkercad Circuits: sursă dublă 12 V / 5 V, generator de funcții, placă de test cu divizoarele, filtrul RC,
   comutatorul intrării PA0, potențiometrul cu motorul care cuplează zgomot și comutatorul de treaptă; STM32F103 „Blue Pill”
   cu ST-Link, editor de cod cu schițele lucrării, monitor și plotter serial (cu cursoare), osciloscop cu 2 canale și multimetru.
   Parametrii componentelor sunt individuali. */
"use strict";
const MD = MODELE["mam1-l2"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, t: 0, t0: 0, gen: true, fi: 3, sw0: "gen", motor: false, step: false, alfa: 0.35,
  R: { R1a: 27, R2a: 10, R1b: 10, R2b: 20 },
  camp: { fs: "1000", Ts: "10", N: "8", a: "0.2" }, sketch: "stm_div", fw: null,
  serial: [], tSer: 0, tx: 0, monitor: "plot", liber: {}, vb: null,
  osc: { tdiv: 1e-3, ruleaza: true, ch: [{ s: "nc", vdiv: 0.5, poz: -3 }, { s: "nc", vdiv: 0.5, poz: 1 }], acq: null, tAcq: 0 },
  dmm: { s: "nc", v: 0, tA: 0 },
  al: null, tAl: 0, cur: [40, 60], per: 1,
  buf: { t: [], x: [], m: [], e: [] }, trepte: [], flt: null, tS: 0
};
const FGEN = [20, 50, 100, 159, 200, 500, 900, 1000, 1100, 1300, 2000];
sim.fi = FGEN.indexOf(100);
const fGen = () => FGEN[sim.fi];
const VPP = 2.0, OFF = 1.65;

/* ------------------------------------------------------------------ semnalele nodurilor */
let gauss = (() => { let s = null; return () => { if (s !== null) { const v = s; s = null; return v; } let u, v, r; do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; r = u * u + v * v; } while (!r || r >= 1); const k = Math.sqrt(-2 * Math.log(r) / r); s = v * k; return u * k; }; })();
function fReal() { return fGen() * (1 + P().eg); }
function nodV(n, t) {
  const p = P();
  if (!sim.run) return 0;
  switch (n) {
    case "v12": return p.u12;
    case "v5": return p.u5;
    case "v33": return p.vdd;
    case "gnd": return 0;
    case "gen": return sim.gen ? OFF + VPP / 2 * Math.sin(2 * Math.PI * fReal() * t) : 0;
    case "rc": { if (!sim.gen) return 0; const f = fReal(), h = MD.H(p, f), ph = -Math.atan(f / MD.fc(p)); return OFF + VPP / 2 * h * Math.sin(2 * Math.PI * f * t + ph); }
    case "pa0": return nodV(sim.sw0 === "rc" ? "rc" : "gen", t);
    case "div12": return MD.uDiv(p, "d12", sim.R.R1a, sim.R.R2a);
    case "div5": return MD.uDiv(p, "d5", sim.R.R1b, sim.R.R2b);
    case "pa1": return 0.35 + sim.alfa * 1.3 + (sim.step ? 1.0 : 0) + (sim.motor ? gauss() * p.sig * p.vdd / 4096 : 0);
  }
  return 0;
}
function adc(U) { const p = P(); return Math.max(0, Math.min(4095, Math.floor(U / p.vdd * 4096 + (Math.random() - 0.5) * 0.9))); }

/* ------------------------------------------------------------------ schițele (cod editabil) */
const PROG = {
  stm_div: { titlu: "stm32_divizor", desc: "Divizoarele pe PA2 și PA3" },
  stm_alias: { titlu: "stm32_esantionare", desc: "Eșantionare pe PA0 (aliasing)" },
  stm_filtre: { titlu: "stm32_filtre", desc: "Filtre numerice pe PA1" }
};
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
function cod(k) {
  switch (k) {
    case "stm_div": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}   ${C_("// STM32duino, bluepill_f103c8")}

${K_("void")} setup() { Serial.begin(${N_("115200")}); analogReadResolution(${N_("12")}); }

${K_("void")} loop() {
  ${K_("int")} N2 = analogRead(PA2), N3 = analogRead(PA3);
  Serial.print(${S_('"PA2: N = "')}); Serial.print(N2);
  Serial.print(${S_('"  U = "')}); Serial.print(N2 * ${N_("3.3")} / ${N_("4096")}, ${N_("3")});
  Serial.print(${S_('"   PA3: N = "')}); Serial.print(N3);
  Serial.print(${S_('"  U = "')}); Serial.println(N3 * ${N_("3.3")} / ${N_("4096")}, ${N_("3")});
  delay(${N_("500")});
}`;
    case "stm_alias": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}
${C_("// 200 de eșantioane pe PA0 la frecvența fs, apoi trimiterea lor (Serial Plotter)")}
${K_("const")} ${K_("uint32_t")} FS = ${sel("fs", [["500", "500"], ["1000", "1000"], ["2000", "2000"]])};      ${C_("// Hz")}
${K_("uint16_t")} x[${N_("200")}];

${K_("void")} setup() { Serial.begin(${N_("115200")}); analogReadResolution(${N_("12")}); }

${K_("void")} loop() {
  ${K_("uint32_t")} t = micros();
  ${K_("for")} (${K_("int")} i = ${N_("0")}; i &lt; ${N_("200")}; i++) {
    ${K_("while")} (micros() - t &lt; ${N_("1000000UL")} / FS) { }
    t += ${N_("1000000UL")} / FS;
    x[i] = analogRead(PA0);
  }
  ${K_("for")} (${K_("int")} i = ${N_("0")}; i &lt; ${N_("200")}; i++) Serial.println(x[i]);
  delay(${N_("2000")});
}`;
    case "stm_filtre": return `${K_("#include")} ${S_("&lt;Arduino.h&gt;")}
${C_("// medie mobilă și filtru exponențial, eșantionare cu perioada TS")}
${K_("const")} ${K_("int")} TS = ${sel("Ts", [["5", "5"], ["10", "10"], ["20", "20"]])};          ${C_("// ms")}
${K_("const")} ${K_("int")} N = ${sel("N", [["4", "4"], ["8", "8"], ["16", "16"]])};
${K_("const")} ${K_("float")} ALFA = ${sel("a", [["0.5", "0.5"], ["0.2", "0.2"], ["0.05", "0.05"]])};
${K_("int")} buf[${N_("16")}]; ${K_("int")} idx = ${N_("0")}; ${K_("long")} sum = ${N_("0")}; ${K_("float")} y = ${N_("0")};

${K_("void")} setup() { Serial.begin(${N_("115200")}); analogReadResolution(${N_("12")}); }

${K_("void")} loop() {
  ${K_("static")} ${K_("uint32_t")} t0 = ${N_("0")}; ${K_("if")} (millis() - t0 &lt; TS) ${K_("return")}; t0 += TS;
  ${K_("int")} x = analogRead(PA1);
  sum += x - buf[idx]; buf[idx] = x; idx = (idx + ${N_("1")}) % N;
  ${K_("float")} ma = (${K_("float")})sum / N;
  y = ALFA * x + (${N_("1")} - ALFA) * y;
  Serial.print(x); Serial.print(${S_("' '")}); Serial.print(ma); Serial.print(${S_("' '")}); Serial.println(y);
}`;
  }
  return "";
}
function snapshot(k) { const c = sim.camp; return k === "stm_alias" ? { prog: k, fs: +c.fs } : k === "stm_filtre" ? { prog: k, Ts: +c.Ts, N: +c.N, a: +c.a } : { prog: k }; }

/* ------------------------------------------------------------------ programul în execuție (timp simulat) */
function pasProgram(dt) {
  const fw = sim.fw; if (!fw) return;
  sim.t += dt;
  if (fw.prog === "stm_filtre") {
    const Ts = fw.Ts / 1000; if (!sim.tS) sim.tS = sim.t;
    while (sim.tS <= sim.t) {
      const x = adc(nodV("pa1", sim.tS)), F = sim.flt;
      F.sum += x - F.b[F.i]; F.b[F.i] = x; F.i = (F.i + 1) % fw.N; const ma = F.sum / fw.N;
      F.y = F.ini ? fw.a * x + (1 - fw.a) * F.y : x; F.ini = true;
      const B = sim.buf; sim.nTot = (sim.nTot || 0) + 1; B.t.push(sim.tS); B.x.push(x); B.m.push(ma); B.e.push(F.y);
      if (B.t.length > 3000) { B.t.shift(); B.x.shift(); B.m.shift(); B.e.shift(); }
      sim.tS += Ts;
    }
  }
}
function linieSerial() {
  const fw = sim.fw; if (!sim.run || !fw) return;
  const p = P(), out = [];
  if (fw.prog === "stm_div") { if (performance.now() - sim.tSer < 500) return; const a = adc(nodV("div12")), b = adc(nodV("div5")); out.push(`PA2: N = ${a}  U = ${(a * 3.3 / 4096).toFixed(3)}   PA3: N = ${b}  U = ${(b * 3.3 / 4096).toFixed(3)}`); }
  if (fw.prog === "stm_alias") {
    if (performance.now() - sim.tAl < 2600) return; sim.tAl = performance.now();
    const t0 = Math.random() * 10, N = []; for (let i = 0; i < 200; i++) N.push(adc(nodV("pa0", t0 + i / fw.fs))); sim.al = { N, fs: fw.fs, f: fGen(), sw: sim.sw0 };
    N.forEach(v => out.push(String(v)));
  }
  if (fw.prog === "stm_filtre") { const B = sim.buf, n = B.t.length, noi = Math.min(40, (sim.nTot || 0) - (sim.nPr || 0)); for (let i = n - noi; i < n; i++) out.push(`${B.x[i]} ${B.m[i].toFixed(2)} ${B.e[i].toFixed(2)}`); sim.nPr = sim.nTot; }
  sim.tSer = performance.now();
  if (!out.length) return;
  out.forEach(l => sim.serial.push(l)); while (sim.serial.length > 300) sim.serial.shift();
  sim.tx = performance.now(); afiseazaSerial();
  void p;
}
function afiseazaSerial() { const el = $("#tk-serial"); if (!el || el.hidden) return; el.textContent = sim.serial.slice(-120).join("\n"); el.scrollTop = el.scrollHeight; }

/* ------------------------------------------------------------------ plotterul serial (cu cursoare) */
const PL = { W: 760, H: 210, l: 44, r: 10, t: 10, b: 22 };
function deseneazaPlotter() {
  const cv = $("#tk-plot"); if (!cv || cv.hidden) return;
  const dpr = devicePixelRatio || 1, w = cv.clientWidth || PL.W, sc = w / PL.W;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(PL.H * sc * dpr); cv.style.height = Math.round(PL.H * sc) + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
  g.fillStyle = "#fff"; g.fillRect(0, 0, PL.W, PL.H);
  const X0 = PL.l, X1 = PL.W - PL.r, Y0 = PL.t, Y1 = PL.H - PL.b;
  g.strokeStyle = "#e6e6e6"; g.lineWidth = 1; g.font = "9px system-ui"; g.fillStyle = "#777";
  const fw = sim.fw || {}, cit = $("#plot-cit");
  let serii = [], ymin = 0, ymax = 4096, n = 0;
  if (fw.prog === "stm_alias" && sim.al) { serii = [[sim.al.N, "#1477d1"]]; n = 200; const mn = Math.min(...sim.al.N), mx = Math.max(...sim.al.N); ymin = Math.max(0, mn - 150); ymax = Math.min(4096, mx + 150); }
  else if (fw.prog === "stm_filtre" && sim.buf.t.length) { const k = Math.max(0, sim.buf.t.length - 500); serii = [[sim.buf.x.slice(k), "#9aa3ad"], [sim.buf.m.slice(k), "#1477d1"], [sim.buf.e.slice(k), "#e0661b"]]; n = 500; const all = serii[0][0]; ymin = Math.min(...all) - 40; ymax = Math.max(...all) + 40; }
  for (let j = 0; j <= 4; j++) { const y = Y0 + (Y1 - Y0) * j / 4; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.textAlign = "right"; g.fillText(Math.round(ymax - (ymax - ymin) * j / 4), X0 - 3, y + 3); }
  for (let i = 0; i <= 10; i++) { const x = X0 + (X1 - X0) * i / 10; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); if (n) { g.textAlign = "center"; g.fillText(Math.round(n * i / 10), x, Y1 + 11); } }
  if (!serii.length) { g.fillStyle = "#999"; g.textAlign = "center"; g.font = "11px system-ui"; g.fillText(sim.run ? "Plotterul afișează schițele stm32_esantionare și stm32_filtre" : "Porniți simularea", (X0 + X1) / 2, (Y0 + Y1) / 2); if (cit) cit.textContent = ""; return; }
  const X = i => X0 + (X1 - X0) * i / (n - 1), Y = v => Y1 - (v - ymin) / (ymax - ymin) * (Y1 - Y0);
  serii.forEach(([a, c]) => { g.strokeStyle = c; g.lineWidth = 1.3; g.beginPath(); a.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke(); if (fw.prog === "stm_alias") { g.fillStyle = c; a.forEach((v, i) => { g.beginPath(); g.arc(X(i), Y(v), 1.4, 0, 7); g.fill(); }); } });
  if (fw.prog === "stm_alias") {
    sim.cur.forEach((c, j) => { const x = X(c); g.strokeStyle = j ? "#d32f2f" : "#2e7d32"; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle; g.fillRect(x - 6, Y0, 12, 10); g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(j ? "B" : "A", x, Y0 + 8); });
    const m = masuraCursoare(); if (cit) cit.innerHTML = `A = ${sim.cur[0]}, B = ${sim.cur[1]} · Δn = ${m.dn} eșantioane · Δt = ${fx(m.dt * 1000, 1)} ms · ${sim.per} ${sim.per === 1 ? "perioadă" : "perioade"} între cursoare → <b>f aparentă = ${Number.isFinite(m.f) ? fx(m.f, 1) + " Hz" : "—"}</b> · V<sub>pp</sub> = <b>${fx(m.vpp, 3)} V</b>`;
  } else if (cit) { const L = sim.buf.x.length; cit.innerHTML = `<span style="color:#7d8790">■ x (brut)</span> · <span style="color:#1477d1">■ medie mobilă N = ${fw.N}</span> · <span style="color:#e0661b">■ exponențial α = ${String(fw.a).replace(".", ",")}</span> · ${L} eșantioane în memorie (T<sub>s</sub> = ${fw.Ts} ms)`; }
}
function masuraCursoare() {
  const a = sim.al, p = P(); if (!a) return { dn: 0, dt: 0, f: NaN, vpp: 0 };
  const dn = Math.abs(sim.cur[1] - sim.cur[0]), dt = dn / a.fs, f = dn ? sim.per / dt : NaN;
  const vpp = (Math.max(...a.N) - Math.min(...a.N)) * p.vdd / 4096;
  return { dn, dt, f, vpp };
}
function legaPlotter() {
  const cv = $("#tk-plot"); let act = -1;
  const idx = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * PL.W; return Math.max(0, Math.min(199, Math.round((x - PL.l) / (PL.W - PL.l - PL.r) * 199))); };
  cv.addEventListener("pointerdown", e => { if ((sim.fw || {}).prog !== "stm_alias") return; const i = idx(e); act = Math.abs(i - sim.cur[0]) <= Math.abs(i - sim.cur[1]) ? 0 : 1; sim.cur[act] = i; cv.setPointerCapture(e.pointerId); deseneazaPlotter(); });
  cv.addEventListener("pointermove", e => { if (act < 0) return; sim.cur[act] = idx(e); deseneazaPlotter(); });
  cv.addEventListener("pointerup", () => { act = -1; });
  $("#plot-per").addEventListener("change", e => { sim.per = +e.target.value; deseneazaPlotter(); });
}

/* ------------------------------------------------------------------ osciloscopul și multimetrul */
const TDIV = [20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3, 10e-3, 20e-3, 50e-3];
const VDIV = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
const CUL = ["#f2d600", "#1fb6ff"];
function fmtT(s) { return s >= 1e-3 ? fx(s * 1e3, 0) + " ms" : fx(s * 1e6, 0) + " µs"; }
const OS = { x: 412, y: 62, w: 392, h: 216 };
function net(s) { return PIN[s] ? PIN[s].net : "nc"; }
function achizitie() {
  const o = sim.osc, W = o.tdiv * 10, N = 1000, dt = W / N, f = fReal();
  let t0 = sim.t + Math.random() * 0.01; if (sim.gen) { const T = 1 / f; t0 = Math.ceil(t0 / T) * T - o.tdiv; }   // declanșare pe CH1 (front crescător prin offset)
  const pts = [[], []], m = [{}, {}];
  for (let c = 0; c < 2; c++) {
    const n = net(o.ch[c].s); if (!PIN[o.ch[c].s]) { for (let i = 0; i <= N; i++) pts[c].push(null); continue; }
    let mn = 1e9, mx = -1e9, s = 0;
    for (let i = 0; i <= N; i++) { const v = nodV(n, t0 + i * dt) + (Math.random() - 0.5) * 0.004; pts[c].push(SEMNALE.achizitie(v, o.ch[c].vdiv, 8, 8, o.ch[c].poz)); mn = Math.min(mn, v); mx = Math.max(mx, v); s += v; }
    const per = ["gen", "rc", "pa0"].includes(n) && sim.gen && sim.run;
    if (per) { const A = n === "gen" || (n === "pa0" && sim.sw0 === "gen") ? VPP : VPP * MD.H(P(), f); mn = OFF - A / 2; mx = OFF + A / 2; }
    m[c] = { vpp: (mx - mn) * (1 + (Math.random() - 0.5) * 0.002), vavg: s / (N + 1), f: per && W * f >= 1 ? f * (1 + (Math.random() - 0.5) * 2e-4) : NaN };
  }
  o.acq = { pts, N, m };
}
function deseneazaOsc() {
  const g = $("#osc-urme"); if (!g) return;
  const o = sim.osc, a = o.acq, dy = OS.h / 8;
  let s = "";
  if (a && sim.run) for (let c = 1; c >= 0; c--) {
    const ch = o.ch[c]; if (!PIN[ch.s]) continue;
    const y0 = OS.y + OS.h / 2 - ch.poz * dy;
    let d = ""; a.pts[c].forEach((v, i) => { if (v === null) return; const x = OS.x + i / a.N * OS.w, y = Math.max(OS.y, Math.min(OS.y + OS.h, y0 - v / ch.vdiv * dy)); d += (d ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); });
    s += `<path d="${d}" fill="none" stroke="${CUL[c]}" stroke-width="1.4"/><path d="M${OS.x - 1},${y0} l-7,-4 v8 z" fill="${CUL[c]}"/>`;
  }
  g.innerHTML = s;
  const lin = [];
  if (a && sim.run) a.m.forEach((m, c) => { if (!PIN[o.ch[c].s]) return; lin.push(`CH${c + 1}: Vpp ${fx(m.vpp, 3)} V · Vavg ${fx(m.vavg, 3)} V${Number.isFinite(m.f) ? ` · Freq ${fx(m.f, 1)} Hz` : ""}`); });
  $("#osc-m").textContent = lin.join("   ");
  $("#osc-h").textContent = `${o.ruleaza ? "RUN" : "STOP"}   H ${fmtT(o.tdiv)}/div   CH1 ${fx(o.ch[0].vdiv, o.ch[0].vdiv < 0.1 ? 2 : 1)} V/div   CH2 ${fx(o.ch[1].vdiv, o.ch[1].vdiv < 0.1 ? 2 : 1)} V/div`;
  $("#osc-runb").textContent = o.ruleaza ? "STOP" : "RUN";
  $("#osc-cit").innerHTML = lin.join(" &nbsp;|&nbsp; ");
}
function citesteDMM() {
  const el = $("#dmm-v"); if (!el) return;
  if (!sim.run) { el.textContent = "- - - -"; sim.dmm.v = 0; return; }
  const n = net(sim.dmm.s); let v;
  if (!PIN[sim.dmm.s]) v = (Math.random() - 0.5) * 0.002;
  else if (["gen", "rc", "pa0"].includes(n)) v = sim.gen ? OFF : 0;
  else if (n === "pa1") v = 0.35 + sim.alfa * 1.3 + (sim.step ? 1 : 0);
  else v = nodV(n, sim.t);
  v = Math.round((v + (Math.random() - 0.5) * 0.0012) * 1000) / 1000;
  sim.dmm.v = Math.max(0, v); el.textContent = sim.dmm.v.toFixed(3) + " V";
}

/* ------------------------------------------------------------------ planșa (SVG, stil Tinkercad) */
const PIN = {};
function pin(id, x, y, et, n) { PIN[id] = { x, y, et, net: n || id }; return `<rect class="tk-pin" data-pin="${id}" x="${x - 3.6}" y="${y - 3.6}" width="7.2" height="7.2" rx="1"/>`; }
const W_ = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3.4}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="2.6" fill="${c}"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="2.6" fill="${c}"/>`;
function header(x, y, n, pas, cul) { let s = `<rect x="${x - 5}" y="${y - 5}" width="${(n - 1) * pas + 10}" height="10" rx="1.5" fill="${cul || "#202020"}"/>`; for (let i = 0; i < n; i++) s += `<rect x="${x + i * pas - 2}" y="${y - 2}" width="4" height="4" fill="#5a5a5a"/>`; return s; }
const BENZI = ["#000", "#7a4a1b", "#c62828", "#ef6c00", "#f9d71c", "#2e7d32", "#1565c0", "#7b1fa2", "#888", "#fff"];
function rezistor(x, y, kOhm, vert, id) {   // rezistor cu benzile de culoare (2 cifre + multiplicator + toleranță aurie)
  const v = kOhm * 1000, e = Math.floor(Math.log10(v)) - 1, d = Math.round(v / 10 ** e), b = [Math.floor(d / 10), d % 10, e];
  const L = 46, H = 12, tr = vert ? `rotate(90 ${x} ${y})` : "";
  return `<g ${id ? `id="${id}" class="tk-rez" data-rez="${id}" style="cursor:pointer"` : ""} transform="${tr}"><line x1="${x - L / 2 - 10}" y1="${y}" x2="${x + L / 2 + 10}" y2="${y}" stroke="#9aa0a6" stroke-width="2"/><rect x="${x - L / 2}" y="${y - H / 2}" width="${L}" height="${H}" rx="6" fill="#e8d3a6" stroke="#a88a55"/>
    ${b.map((k, i) => `<rect x="${x - L / 2 + 7 + i * 7}" y="${y - H / 2}" width="3.6" height="${H}" fill="${BENZI[k]}"/>`).join("")}<rect x="${x + L / 2 - 11}" y="${y - H / 2}" width="3.6" height="${H}" fill="#c9a640"/></g>`;
}
function comutator(x, y, id, et1, et2, stg, titlu) {
  return `<g id="${id}" class="tk-sw" style="cursor:pointer"><rect x="${x - 22}" y="${y - 9}" width="44" height="18" rx="3" fill="#2b2b2b"/><rect id="${id}-c" x="${stg ? x - 19 : x + 1}" y="${y - 6}" width="18" height="12" rx="2" fill="#d9dde3"/>
  <text x="${x - 26}" y="${y + 3}" font-size="8.5" fill="#444" text-anchor="end">${et1}</text><text x="${x + 26}" y="${y + 3}" font-size="8.5" fill="#444">${et2}</text><text x="${x}" y="${y + 22}" font-size="9" fill="#444" text-anchor="middle">${titlu}</text></g>`;
}
const BX = 380, BY = 400;
function planseSVG() {
  const bx = BX, by = BY;
  let s = `<svg id="tk-svg" viewBox="0 0 1300 790" role="img" aria-label="Planșa de lucru: sursă dublă, generator de funcții, placă de test cu divizoare, filtru RC și sursă de zgomot, STM32 Blue Pill, osciloscop și multimetru">
<defs>
 <filter id="umbra" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter>
 <pattern id="tk-gauri" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#f3f3f1"/><rect x="3.5" y="3.5" width="3" height="3" fill="#b9b9b5"/></pattern>
</defs>
<rect x="-2000" y="-2000" width="5300" height="4790" fill="#fbfbfb" id="tk-fundal"/>`;
  // ---- sursa de laborator dublă
  s += `<g class="tk-comp" data-comp="psu" filter="url(#umbra)"><rect x="40" y="30" width="300" height="160" rx="8" fill="#e6e6e6" stroke="#b5b5b5"/>
  <rect x="56" y="46" width="120" height="44" rx="4" fill="#2a0d0d"/><text id="psu-a" x="166" y="78" font-size="22" fill="#ff4b3a" text-anchor="end" font-family="monospace">12.00</text><text x="170" y="62" font-size="8" fill="#ff8a7a">V</text>
  <rect x="190" y="46" width="120" height="44" rx="4" fill="#2a0d0d"/><text id="psu-b" x="300" y="78" font-size="22" fill="#ff4b3a" text-anchor="end" font-family="monospace">5.00</text>
  <text x="56" y="108" font-size="9" fill="#555">CH1 0…30 V · lim. 0,10 A</text><text x="190" y="108" font-size="9" fill="#555">CH2 5 V fix · lim. 0,10 A</text>
  <text x="56" y="128" font-size="11" fill="#333" font-weight="700">Sursă de laborator dublă</text>
  ${[[90, "#d32f2f", "+12 V"], [170, "#d32f2f", "+5 V"], [250, "#222", "GND"]].map(([x, c, t]) => `<circle cx="${x}" cy="166" r="8" fill="${c}" stroke="#555"/><text x="${x}" y="152" font-size="9" text-anchor="middle" fill="#333">${t}</text>`).join("")}</g>`;
  s += pin("v12", 90, 166, "+12 V (sursa)", "v12") + pin("v5", 170, 166, "+5 V (sursa)", "v5") + pin("gndP", 250, 166, "GND (sursa)", "gnd");
  // ---- generatorul de funcții
  s += `<g class="tk-comp" data-comp="gen" filter="url(#umbra)"><rect x="40" y="215" width="300" height="160" rx="8" fill="#e6e6e6" stroke="#b5b5b5"/>
  <rect x="56" y="231" width="186" height="64" rx="4" fill="#173a2a"/><text id="gen-l1" x="66" y="259" font-size="20" fill="#7dffa0" font-family="monospace">100 Hz</text><text id="gen-l2" x="66" y="283" font-size="11" fill="#7dffa0" font-family="monospace">∿ 2.00 Vpp  +1.65 V</text>
  <g class="tk-btn" data-gb="-" style="cursor:pointer"><rect x="252" y="231" width="36" height="26" rx="4" fill="#444"/><text x="270" y="249" font-size="13" fill="#fff" text-anchor="middle">◀</text></g>
  <g class="tk-btn" data-gb="+" style="cursor:pointer"><rect x="294" y="231" width="36" height="26" rx="4" fill="#444"/><text x="312" y="249" font-size="13" fill="#fff" text-anchor="middle">▶</text></g>
  <g id="gen-out" style="cursor:pointer"><rect x="270" y="266" width="58" height="24" rx="4" fill="#3a3a3a"/><text x="299" y="282" font-size="10" fill="#fff" text-anchor="middle">OUTPUT</text></g><circle id="gen-led" cx="320" cy="300" r="4" fill="#3cff4a"/>
  <text x="56" y="318" font-size="11" fill="#333" font-weight="700">Generator de funcții</text><text x="56" y="334" font-size="9" fill="#666">sinus · ◀ ▶ frecvența · OUTPUT</text>
  <circle cx="290" cy="352" r="7" fill="#d32f2f"/><circle cx="318" cy="352" r="7" fill="#222"/><text x="290" y="343" font-size="9" text-anchor="middle" fill="#333">+</text><text x="318" y="343" font-size="9" text-anchor="middle" fill="#333">−</text></g>`;
  s += pin("genO", 290, 352, "Ieșirea generatorului", "gen");
  // ---- osciloscopul
  s += `<g class="tk-comp" data-comp="osc" filter="url(#umbra)"><rect x="390" y="30" width="436" height="300" rx="10" fill="#d9d9d9" stroke="#a9a9a9"/>
  <rect x="${OS.x - 6}" y="${OS.y - 6}" width="${OS.w + 12}" height="${OS.h + 30}" rx="4" fill="#0b0e12"/>
  ${Array.from({ length: 11 }, (_, i) => `<line x1="${OS.x + i * OS.w / 10}" y1="${OS.y}" x2="${OS.x + i * OS.w / 10}" y2="${OS.y + OS.h}" stroke="rgba(150,170,190,${i === 5 ? .5 : .18})"/>`).join("")}
  ${Array.from({ length: 9 }, (_, j) => `<line x1="${OS.x}" y1="${OS.y + j * OS.h / 8}" x2="${OS.x + OS.w}" y2="${OS.y + j * OS.h / 8}" stroke="rgba(150,170,190,${j === 4 ? .5 : .18})"/>`).join("")}
  <path d="M${OS.x + OS.w / 10},${OS.y} l-5,-5 h10 z" fill="#ff9b3d"/>
  <g id="osc-urme"></g><text id="osc-h" x="${OS.x + 2}" y="${OS.y + OS.h + 11}" font-size="9" fill="#9fb3c8" font-family="monospace"></text><text id="osc-m" x="${OS.x + 2}" y="${OS.y + OS.h + 21}" font-size="8.4" fill="#ffe96b" font-family="monospace"></text>
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
  // ---- placa de test
  s += `<g class="tk-comp" data-comp="bb" filter="url(#umbra)"><rect x="${bx}" y="${by}" width="560" height="300" rx="6" fill="url(#tk-gauri)" stroke="#d2d2cc"/>
  <line x1="${bx + 10}" y1="${by + 8}" x2="${bx + 550}" y2="${by + 8}" stroke="#e53935" stroke-width="1.5"/><line x1="${bx + 10}" y1="${by + 292}" x2="${bx + 550}" y2="${by + 292}" stroke="#1e63d6" stroke-width="1.5"/>
  <text x="${bx + 14}" y="${by + 22}" font-size="8" fill="#999">placă de test – 60 de coloane</text></g>`;
  // divizorul pentru 12 V (R1a sus, R2a jos), nodul PA2
  const xa = bx + 60, xb = bx + 150;
  s += `<text x="${xa}" y="${by + 40}" font-size="9" text-anchor="middle" fill="#444" font-weight="700">Divizor 12 V</text>` + rezistor(xa, by + 90, sim.R.R1a, true, "R1a") + rezistor(xa, by + 200, sim.R.R2a, true, "R2a");
  s += `<text id="R1a-t" x="${xa + 14}" y="${by + 94}" font-size="9" fill="#444">R1 ${sim.R.R1a} kΩ</text><text id="R2a-t" x="${xa + 14}" y="${by + 204}" font-size="9" fill="#444">R2 ${sim.R.R2a} kΩ</text>`;
  s += `<text x="${xb}" y="${by + 40}" font-size="9" text-anchor="middle" fill="#444" font-weight="700">Divizor 5 V</text>` + rezistor(xb, by + 90, sim.R.R1b, true, "R1b") + rezistor(xb, by + 200, sim.R.R2b, true, "R2b");
  s += `<text id="R1b-t" x="${xb + 14}" y="${by + 94}" font-size="9" fill="#444">R1 ${sim.R.R1b} kΩ</text><text id="R2b-t" x="${xb + 14}" y="${by + 204}" font-size="9" fill="#444">R2 ${sim.R.R2b} kΩ</text>`;
  // filtrul RC
  const xr = bx + 280, yr = by + 90;
  s += `<text x="${xr + 30}" y="${by + 40}" font-size="9" text-anchor="middle" fill="#444" font-weight="700">Filtru RC</text>` + rezistor(xr, yr, 10) + `<text x="${xr}" y="${yr - 12}" font-size="9" fill="#444" text-anchor="middle">R 10 kΩ</text>
   <line x1="${xr + 33}" y1="${yr}" x2="${xr + 60}" y2="${yr}" stroke="#9aa0a6" stroke-width="2"/><line x1="${xr + 60}" y1="${yr}" x2="${xr + 60}" y2="${yr + 30}" stroke="#9aa0a6" stroke-width="2"/>
   <g class="tk-comp" data-comp="cap"><ellipse cx="${xr + 60}" cy="${yr + 44}" rx="13" ry="15" fill="#e8a33a" stroke="#a5651a"/><text x="${xr + 60}" y="${yr + 47}" font-size="7" text-anchor="middle" fill="#3b2400">104</text></g>
   <line x1="${xr + 60}" y1="${yr + 59}" x2="${xr + 60}" y2="${by + 292}" stroke="#9aa0a6" stroke-width="2"/><text x="${xr + 78}" y="${yr + 48}" font-size="9" fill="#444">C 100 nF</text>`;
  // comutatorul S1 (PA0 ← generator / RC)
  s += comutator(bx + 330, by + 175, "sw0", "GEN", "RC", sim.sw0 === "gen", "S1: intrarea PA0");
  // potențiometrul, motorul (sursa de zgomot), comutatoarele S2 și S3
  const xp = bx + 470, yp = by + 80;
  s += `<g class="tk-comp" data-comp="pot"><g id="pot" style="cursor:grab"><rect x="${xp - 31}" y="${yp - 26}" width="62" height="58" rx="6" fill="#2c66b8" stroke="#123a75" filter="url(#umbra)"/><circle cx="${xp}" cy="${yp}" r="23" fill="#d9dde3" stroke="#7f868e"/><circle cx="${xp}" cy="${yp}" r="16" fill="#eef0f3"/><path id="potAc" d="M${xp},${yp} l0,-19" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/></g><text x="${xp}" y="${yp - 32}" font-size="9" text-anchor="middle" fill="#444">Potențiometru (nivel PA1)</text></g>`;
  s += `<g class="tk-comp" data-comp="motor"><circle id="motor" cx="${xp + 10}" cy="${by + 230}" r="26" fill="#9aa3ad" stroke="#5f6770" filter="url(#umbra)"/><circle cx="${xp + 10}" cy="${by + 230}" r="6" fill="#444"/><g id="motorAx"><line x1="${xp + 10}" y1="${by + 230}" x2="${xp + 10}" y2="${by + 210}" stroke="#333" stroke-width="3"/></g><text x="${xp + 10}" y="${by + 268}" font-size="9" text-anchor="middle" fill="#444">Motor c.c. (zgomot)</text></g>`;
  s += comutator(xp - 52, by + 160, "sw2", "oprit", "pornit", !sim.motor, "S2: motor") + comutator(xp + 48, by + 160, "sw3", "0", "+1 V", !sim.step, "S3: treaptă");
  s += `<path d="M${xp - 20},${by + 196} q20,-8 40,0 t40,0" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="3 3"/><text x="${xp + 10}" y="${by + 206}" font-size="8" text-anchor="middle" fill="#888">cablu lung lângă motor</text>`;
  // pinii de pe placă
  s += pin("div12", xa, by + 145, "Nodul divizorului 12 V (spre PA2)", "div12") + pin("div5", xb, by + 145, "Nodul divizorului 5 V (spre PA3)", "div5") + pin("genBB", xr - 40, yr, "Intrarea filtrului RC (generator)", "gen") + pin("rc", xr + 60, yr, "Ieșirea filtrului RC (pe C)", "rc") + pin("sw0o", bx + 330, by + 210, "Ieșirea comutatorului S1 (PA0)", "pa0") + pin("pa1n", xp, by + 125, "Nodul PA1 (potențiometru + zgomot)", "pa1") + pin("gndBB", bx + 530, by + 292, "Rândul − (GND)", "gnd") + pin("v12BB", xa, by + 55, "+12 V pe placă", "v12") + pin("v5BB", xb, by + 55, "+5 V pe placă", "v5");
  // ---- STM32 Blue Pill + ST-Link
  const px = 1010, py = 470;
  s += `<g class="tk-comp" data-comp="bp" filter="url(#umbra)"><rect x="${px}" y="${py}" width="232" height="86" rx="4" fill="#1f4fbf"/>${header(px + 12, py + 8, 20, 11.2)}${header(px + 12, py + 78, 20, 11.2)}
  <g transform="translate(${px + 120} ${py + 43}) rotate(45)"><rect x="-17" y="-17" width="34" height="34" rx="2" fill="#262626"/></g><text x="${px + 120}" y="${py + 46}" font-size="5.5" fill="#bbb" text-anchor="middle" font-family="monospace">STM32F103</text>
  <rect x="${px - 12}" y="${py + 32}" width="18" height="22" rx="3" fill="#c9cdd2"/><rect x="${px + 50}" y="${py + 26}" width="14" height="9" fill="#f2c94c"/><rect x="${px + 50}" y="${py + 38}" width="14" height="9" fill="#f2c94c"/>
  <text x="${px + 170}" y="${py + 50}" font-size="10" fill="#e8eeff" font-weight="700">BLUE PILL</text><rect id="ledTX" x="${px + 200}" y="${py + 58}" width="7" height="5" fill="#5a4a1a"/>
  ${["GND", "GND", "3.3", "NRST", "PB11", "PB10", "PB1", "PB0", "PA7", "PA6", "PA5", "PA4", "PA3", "PA2", "PA1", "PA0"].map((t, i) => `<text x="${px + 12 + (19 - i) * 11.2}" y="${py + 70}" font-size="4.6" fill="#fff" transform="rotate(-90 ${px + 12 + (19 - i) * 11.2} ${py + 70})">${t}</text>`).join("")}</g>
  <g filter="url(#umbra)"><rect x="${px + 120}" y="${py - 70}" width="110" height="44" rx="6" fill="#b9bec4" stroke="#7f858b"/><text x="${px + 175}" y="${py - 44}" font-size="10" text-anchor="middle" fill="#222" font-weight="700">ST-LINK V2</text></g>`;
  const BPd = i => [px + 12 + i * 11.2, py + 78], BPu = i => [px + 12 + i * 11.2, py + 8];
  s += pin("PA0", ...BPd(4), "PA0 (ADC1_IN0)", "pa0") + pin("PA1", ...BPd(5), "PA1 (ADC1_IN1)", "pa1") + pin("PA2", ...BPd(6), "PA2 (ADC1_IN2)", "div12") + pin("PA3", ...BPd(7), "PA3 (ADC1_IN3)", "div5") + pin("v33", ...BPd(17), "3.3V (STM32)", "v33") + pin("gndS", ...BPd(19), "GND (STM32)", "gnd");
  // ---- firele
  const fire = [
    [[[90, 174], [90, 380], [xa, 380], [xa, by + 55]], "#e53935"], [[[170, 174], [170, 368], [xb + 6, 368], [xb + 6, by + 30], [xb, by + 30], [xb, by + 55]], "#ff7043"],
    [[[250, 174], [250, 196], [356, 196], [356, by + 300], [bx + 10, by + 300], [bx + 10, by + 292]], "#222"],
    [[[xa, by + 112], [xa, by + 178]], "#9aa0a6", 2], [[[xb, by + 112], [xb, by + 178]], "#9aa0a6", 2],
    [[[xa, by + 222], [xa, by + 292]], "#9aa0a6", 2], [[[xb, by + 222], [xb, by + 292]], "#9aa0a6", 2],
    [[[290, 359], [290, 392], [xr - 40, 392], [xr - 40, yr]], "#2fa84f"], [[[318, 359], [318, 386], [372, 386], [372, by + 296], [bx + 20, by + 296], [bx + 20, by + 292]], "#222"],
    [[[xr - 40, yr], [xr - 33, yr]], "#9aa0a6", 2],
    [[[xr - 40, yr], [xr - 40, by + 150], [bx + 318, by + 150], [bx + 318, by + 166]], "#2fa84f", 2.4], [[[xr + 60, yr + 4], [xr + 72, yr + 4], [xr + 72, by + 150], [bx + 342, by + 150], [bx + 342, by + 166]], "#8e24aa", 2.4],
    [[[xa, by + 145], [xa + 0, by + 145], [xa, 742], [BPd(6)[0], 742], BPd(6)], "#00acc1"], [[[xb, by + 145], [xb + 20, by + 145], [xb + 20, 730], [BPd(7)[0], 730], BPd(7)], "#26a69a"],
    [[[bx + 330, by + 210], [bx + 330, 754], [BPd(4)[0], 754], BPd(4)], "#f2c230"], [[[xp, by + 112], [xp, by + 125], [xp - 14, by + 125], [xp - 14, 718], [BPd(5)[0], 718], BPd(5)], "#ef6c00"],
    [[BPd(17), [BPd(17)[0], py + 120], [xp - 24, py + 120], [xp - 24, yp + 34], [xp - 8, yp + 34]], "#e53935"], [[BPd(19), [BPd(19)[0], py + 132], [bx + 548, py + 132], [bx + 548, by + 292], [bx + 530, by + 292]], "#222"],
    [[[xp + 8, yp + 34], [xp + 8, yp + 40], [bx + 545, yp + 40], [bx + 545, by + 292]], "#222", 2.4],
    [[[px + 135, py - 26], [px + 135, py + 8]], "#6a1b9a", 2.6], [[[px + 150, py - 26], [px + 150, py + 8]], "#00897b", 2.6], [[[px + 165, py - 26], [px + 165, py + 8]], "#222", 2.6], [[[px + 180, py - 26], [px + 180, py + 8]], "#e53935", 2.6]
  ];
  s += `<g id="tk-fire" style="pointer-events:none">${fire.map(([p, c, w]) => W_(p, c, w)).join("")}</g>`;
  s += `<g style="pointer-events:none">${W_([[914, 283], [914, 345], [bx + 552, 345], [bx + 552, by + 292], [bx + 540, by + 292]], "#222", 2.4)}</g>`;
  s += `<g id="tk-sonde"></g><g id="tk-tip" style="pointer-events:none" visibility="hidden"><rect rx="4" fill="#2b2b2b" opacity=".92"/><text font-size="11" fill="#fff"></text></g>`;
  s += `<text id="tk-timp" x="650" y="22" text-anchor="middle" font-size="12" fill="#555"></text><text id="tk-av" x="${bx + 280}" y="${by + 318}" text-anchor="middle" font-size="11" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
const SONDE = [{ id: "dmm", x0: 994, y0: 283, cul: "#d32f2f", et: "V" }, { id: "ch0", x0: 432, y0: 340, cul: CUL[0], et: "1" }, { id: "ch1", x0: 474, y0: 340, cul: CUL[1], et: "2" }];
const LOC_SONDE = { dmm: [1060, 360], ch0: [560, 372], ch1: [610, 372] };
function sursaSonda(id) { return id === "dmm" ? sim.dmm.s : sim.osc.ch[+id.slice(2)].s; }
function seteazaSonda(id, s) { if (id === "dmm") sim.dmm.s = s; else sim.osc.ch[+id.slice(2)].s = s; }
function capatSonda(sd) { const s = sursaSonda(sd.id); return PIN[s] ? [PIN[s].x, PIN[s].y] : sim.liber[sd.id] || LOC_SONDE[sd.id]; }
function cale(sd, tx, ty) { const cy = Math.max(sd.y0, ty) + 60; return `M${sd.x0},${sd.y0} C${sd.x0},${cy} ${tx},${cy} ${tx},${ty + 30}`; }
function desenSonde() {
  const g = $("#tk-sonde"); if (!g) return;
  g.innerHTML = SONDE.map(sd => { const [tx, ty] = capatSonda(sd);
    return `<path id="lead-${sd.id}" d="${cale(sd, tx, ty)}" fill="none" stroke="${sd.cul}" stroke-width="3" opacity=".9" style="pointer-events:none"/>
      <g class="tk-sonda" data-sonda="${sd.id}" transform="translate(${tx},${ty})" style="cursor:grab"><path d="M0,0 l-4,8 v22 h8 v-22 z" fill="${sd.cul}" stroke="#222" stroke-width="1"/><circle cx="0" cy="36" r="9" fill="${sd.cul}" stroke="#222"/><text x="0" y="40" font-size="10" text-anchor="middle" font-weight="700" fill="#111">${sd.et}</text></g>`; }).join("");
  $$("#tk-sonde .tk-sonda").forEach(el => legaSonda(el));
}
function ptSVG(e) { const svg = $("#tk-svg"), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function celMaiAproape(x, y) { let best = null, dmin = 18; Object.entries(PIN).forEach(([k, q]) => { const d = Math.hypot(q.x - x, q.y - y); if (d < dmin) { dmin = d; best = k; } }); return best; }
function legaSonda(el) {
  const id = el.dataset.sonda, sd = SONDE.find(x => x.id === id);
  el.addEventListener("pointerdown", e => {
    e.stopPropagation(); el.setPointerCapture(e.pointerId); sim.trag = true;
    const p0 = ptSVG(e), [tx0, ty0] = capatSonda(sd), dx = p0.x - tx0, dy = p0.y - ty0;
    const muta = ev => { const p = ptSVG(ev), x = p.x - dx, y = p.y - dy; el.setAttribute("transform", `translate(${x},${y})`); $("#lead-" + id).setAttribute("d", cale(sd, x, y)); evidentiaza(celMaiAproape(x, y)); };
    const gata = ev => { el.removeEventListener("pointermove", muta); el.removeEventListener("pointerup", gata); sim.trag = false;
      const p = ptSVG(ev), x = p.x - dx, y = p.y - dy, best = celMaiAproape(x, y);
      if (best) seteazaSonda(id, best); else { seteazaSonda(id, "nc"); sim.liber[id] = [x, y]; }
      evidentiaza(null); desenSonde(); achizitie(); deseneazaOsc(); citesteDMM(); };
    el.addEventListener("pointermove", muta); el.addEventListener("pointerup", gata);
  });
}
function evidentiaza(k) { $$("#tk-svg .tk-pin").forEach(r => r.classList.toggle("aproape", r.dataset.pin === k)); arataTip(k); }
function arataTip(k) {
  const g = $("#tk-tip"); if (!g) return; if (!k) { g.setAttribute("visibility", "hidden"); return; }
  const q = PIN[k], t = g.querySelector("text"), r = g.querySelector("rect");
  t.textContent = q.et; t.setAttribute("x", q.x + 12); t.setAttribute("y", q.y - 12);
  r.setAttribute("x", q.x + 6); r.setAttribute("y", q.y - 26); r.setAttribute("width", q.et.length * 6.3 + 12); r.setAttribute("height", 20); g.setAttribute("visibility", "visible");
}
const VB0 = [0, 0, 1300, 790];
function seteazaVB(vb) { sim.vb = vb; $("#tk-svg").setAttribute("viewBox", vb.map(v => v.toFixed(1)).join(" ")); }
function potRot() { const a = (-135 + 270 * sim.alfa) * Math.PI / 180, xp = BX + 470, yp = BY + 80; $("#potAc").setAttribute("d", `M${xp},${yp} l${(Math.sin(a) * 19).toFixed(1)},${(-Math.cos(a) * 19).toFixed(1)}`); }
function comutAfis() {
  const set = (id, stg) => { const c = $(`#${id}-c`), x = +c.getAttribute("x"), base = stg ? 0 : 20; const g = $(`#${id} rect`); const x0 = +g.getAttribute("x") + 3; c.setAttribute("x", x0 + base); void x; };
  set("sw0", sim.sw0 === "gen"); set("sw2", !sim.motor); set("sw3", !sim.step);
}
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
  potRot();
  const el = $("#pot"), xp = BX + 470, yp = BY + 80; let act = false;
  const set = e => { const p = ptSVG(e); let u = Math.atan2(p.x - xp, yp - p.y) * 180 / Math.PI; u = Math.max(-135, Math.min(135, u)); sim.alfa = Math.round((u + 135) / 270 * 1000) / 1000; potRot(); };
  el.addEventListener("pointerdown", e => { e.stopPropagation(); act = true; el.setPointerCapture(e.pointerId); set(e); });
  el.addEventListener("pointermove", e => { if (act) set(e); }); el.addEventListener("pointerup", () => { act = false; });
  $("#sw0").addEventListener("click", e => { e.stopPropagation(); sim.sw0 = sim.sw0 === "gen" ? "rc" : "gen"; comutAfis(); achizitie(); deseneazaOsc(); });
  $("#sw2").addEventListener("click", e => { e.stopPropagation(); sim.motor = !sim.motor; comutAfis(); });
  $("#sw3").addEventListener("click", e => { e.stopPropagation(); sim.step = !sim.step; if (sim.run) sim.trepte.push({ t: sim.t, sus: sim.step }); comutAfis(); citesteDMM(); });
  $("#gen-out").addEventListener("click", e => { e.stopPropagation(); sim.gen = !sim.gen; genAfis(); achizitie(); deseneazaOsc(); });
  $$("[data-gb]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); sim.fi = Math.max(0, Math.min(FGEN.length - 1, sim.fi + (b.dataset.gb === "+" ? 1 : -1))); genAfis(); achizitie(); deseneazaOsc(); }));
  $$("[data-ob]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation(); const k = b.dataset.ob, o = sim.osc;
    if (k === "run") { o.ruleaza = !o.ruleaza; deseneazaOsc(); return; }
    if (k.startsWith("tdiv")) { const i = TDIV.indexOf(o.tdiv) + (k.endsWith("+") ? 1 : -1); o.tdiv = TDIV[Math.max(0, Math.min(TDIV.length - 1, i))]; }
    else { const c = k[1] === "1" ? 0 : 1, i = VDIV.indexOf(o.ch[c].vdiv) + (k.endsWith("+") ? 1 : -1); o.ch[c].vdiv = VDIV[Math.max(0, Math.min(VDIV.length - 1, i))]; }
    achizitie(); deseneazaOsc();
  }));
  $$(".tk-rez").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); inspector("rez:" + g.dataset.rez); }));
  $$(".tk-comp").forEach(g => g.addEventListener("click", e => { if (e.target.closest("[data-ob],[data-gb],#gen-out,#pot,.tk-sw,.tk-rez")) return; inspector(g.dataset.comp); }));
}
function genAfis() {
  const on = sim.gen && sim.run;
  $("#gen-led").setAttribute("fill", sim.gen ? "#3cff4a" : "#333"); $("#gen-l1").textContent = `${fGen()} Hz`;
  $("#gen-l1").setAttribute("opacity", on ? 1 : 0.25); $("#gen-l2").setAttribute("opacity", on ? 1 : 0.25);
  $("#psu-a").setAttribute("opacity", sim.run ? 1 : 0.2); $("#psu-b").setAttribute("opacity", sim.run ? 1 : 0.2);
}
const INSP = {
  psu: () => ["Sursă de laborator dublă", [["CH1", "12,00 V (afișat)"], ["CH2", "5,00 V (fix)"], ["Limitare curent", "0,10 A"], ["Notă", "tensiunea reală se măsoară cu multimetrul"]]],
  gen: () => ["Generator de funcții", [["Formă", "sinus"], ["Frecvență", fGen() + " Hz (afișat)"], ["Amplitudine", "2,00 Vpp"], ["Offset", "+1,65 V"], ["Ieșire", sim.gen ? "pornită" : "oprită"]]],
  osc: () => ["Osciloscop", [["Timp/div", fmtT(sim.osc.tdiv)], ["CH1", (PIN[sim.osc.ch[0].s] || {}).et || "neconectat"], ["CH2", (PIN[sim.osc.ch[1].s] || {}).et || "neconectat"], ["Cuplaj", "DC, 1 MΩ"]]],
  dmm: () => ["Multimetru", [["Mod", "V DC (valoare medie)"], ["Sonda roșie", (PIN[sim.dmm.s] || {}).et || "neconectată"], ["Sonda neagră", "GND"]]],
  bp: () => ["STM32F103C8 „Blue Pill”", [["ADC", "12 biți, U<sub>ref</sub> = VDDA ≈ 3,3 V"], ["Intrări", "PA0 (S1), PA1 (zgomot), PA2 (div. 12 V), PA3 (div. 5 V)"], ["Program", sim.fw ? PROG[sim.fw.prog].titlu : "—"]]],
  pot: () => ["Potențiometru", [["Rol", "nivelul continuu pe PA1"], ["Poziție", fx(sim.alfa * 100, 1) + " %"]]],
  motor: () => ["Motor de curent continuu", [["Rol", "sursă de zgomot cuplat inductiv pe cablul PA1"], ["Stare", sim.motor ? "pornit" : "oprit"]]],
  cap: () => ["Condensator ceramic", [["Marcaj", "104 = 100 nF"], ["Toleranță", "±10 % (X7R)"]]],
  bb: () => ["Placă de test", [["Rânduri", "+ (12 V) sus, − (GND) jos"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k) { el.hidden = true; return; }
  if (k.startsWith("rez:")) {
    const id = k.slice(4), et = { R1a: "R1 – divizorul 12 V", R2a: "R2 – divizorul 12 V", R1b: "R1 – divizorul 5 V", R2b: "R2 – divizorul 5 V" }[id];
    el.innerHTML = `<div class="tk-insp-t">Rezistor ${et}<button type="button" aria-label="Închide">✕</button></div><div class="tk-insp-r"><span>Rezistență</span><b><select id="insp-r"${sim.run ? " disabled" : ""}>${MD.E24.map(v => `<option value="${v}"${v === sim.R[id] ? " selected" : ""}>${v} kΩ</option>`).join("")}</select></b></div><div class="tk-insp-r"><span>Toleranță</span><b>±1 % (banda aurie: ±5 % la seria E24 – aici rezistoare de precizie)</b></div>${sim.run ? `<div class="tk-insp-r"><span></span><b style="color:#b45309">Opriți simularea pentru a schimba rezistorul (NSSM).</b></div>` : ""}`;
    el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
    const s = $("#insp-r"); if (s) s.addEventListener("change", () => { sim.R[id] = +s.value; redeseneazaRez(id); });
    return;
  }
  if (!INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}
function redeseneazaRez(id) {
  const g = $("#" + id), x = id.endsWith("a") ? BX + 60 : BX + 150, y = id.startsWith("R1") ? BY + 90 : BY + 200;
  const tmp = document.createElementNS("http://www.w3.org/2000/svg", "g"); tmp.innerHTML = rezistor(x, y, sim.R[id], true, id);
  const nou = tmp.firstElementChild; g.replaceWith(nou); nou.addEventListener("click", e => { e.stopPropagation(); inspector("rez:" + id); });
  $("#" + id + "-t").textContent = `${id.startsWith("R1") ? "R1" : "R2"} ${sim.R[id]} kΩ`;
}
function avertizari() {
  const p = P(), av = [];
  if (sim.run && MD.uDiv(p, "d12", sim.R.R1a, sim.R.R2a) > p.vdd) av.push("PA2 > 3,3 V!");
  if (sim.run && MD.uDiv(p, "d5", sim.R.R1b, sim.R.R2b) > p.vdd) av.push("PA3 > 3,3 V!");
  $("#tk-av").textContent = av.length ? "⚠ " + av.join(" ") + " Tensiunea la intrarea ADC depășește U_ref – alegeți alt divizor." : "";
}

/* ------------------------------------------------------------------ editorul și simularea */
function afiseazaCod() {
  $("#tk-sk").innerHTML = Object.entries(PROG).map(([k, p]) => `<option value="${k}"${k === sim.sketch ? " selected" : ""}>${p.desc} (${p.titlu})</option>`).join("");
  $("#tk-cod").innerHTML = cod(sim.sketch).split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value; }); });
  $("#tk-sk").disabled = sim.run; $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  sim.fw = snapshot(sim.sketch); sim.run = true; sim.t0 = performance.now(); sim.t = 0; sim.tS = 0; sim.al = null; sim.tAl = 0;
  sim.buf = { t: [], x: [], m: [], e: [] }; sim.trepte = []; sim.nTot = 0; sim.nPr = 0; sim.flt = { b: new Array(16).fill(0), i: 0, sum: 0, y: 0, ini: false };
  if (sim.fw.prog === "stm_filtre") { const x0 = adc(nodV("pa1", 0)); sim.flt.b.fill(x0, 0, sim.fw.N); sim.flt.sum = x0 * sim.fw.N; }
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  genAfis(); afiseazaCod(); actualizeazaFw(); achizitie(); deseneazaOsc(); citesteDMM(); avertizari();
  if (sim.fw.prog !== "stm_div") arataMonitor("plot");
}
function opresteSim() {
  sim.run = false; sim.fw = null;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza"); $("#tk-timp").textContent = "";
  genAfis(); afiseazaCod(); actualizeazaFw(); deseneazaOsc(); citesteDMM(); avertizari(); deseneazaPlotter();
}
function actualizeazaFw() {
  const f = sim.fw; const d = !f ? "—" : PROG[f.prog].titlu + (f.prog === "stm_alias" ? ` (f_s = ${f.fs} Hz)` : f.prog === "stm_filtre" ? ` (T_s = ${f.Ts} ms, N = ${f.N}, α = ${String(f.a).replace(".", ",")})` : "");
  if ($("#fw-stm")) $("#fw-stm").textContent = d;
}
function arataMonitor() { afiseazaSerial(); deseneazaPlotter(); }

/* ------------------------------------------------------------------ analiza filtrelor (σ și întârzierea la treaptă) */
function analizaFiltre() {
  const B = sim.buf, fw = sim.fw, n = B.t.length; if (!fw || fw.prog !== "stm_filtre" || n < 100) return { er: "Prea puține eșantioane: lăsați programul să ruleze." };
  const st = sim.trepte.filter(s => s.t > B.t[0]); const ultima = st[st.length - 1];
  if (!ultima) return { er: "Nu există nicio treaptă în memorie: după cel puțin 6 s de zgomot (motorul pornit), comutați S3." };
  const iS = B.t.findIndex(t => t >= ultima.t), dupa = n - iS;
  if (dupa < 160) return { er: `Așteptați încă ${fx((160 - dupa) * fw.Ts / 1000, 1)} s după treaptă.` };
  const prec = st.length > 1 ? st[st.length - 2].t : -1e9;
  const i0 = Math.max(B.t.findIndex(t => t >= prec + 2.5), 0), lung = iS - i0;
  if (lung < 400) return { er: `Fereastra liniștită dinaintea treptei are ${lung} eșantioane; sunt necesare cel puțin 400 (≈ ${fx(400 * fw.Ts / 1000, 0)} s fără să comutați S3).` };
  if (!sim.motor) return { er: "Porniți motorul (S2): fără zgomot abaterea standard este doar cea de cuantizare." };
  const sd = a => { const v = a.slice(i0, iS), m = v.reduce((x, y) => x + y, 0) / v.length; return Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / (v.length - 1)); };
  const med = (a, i, j) => { const v = a.slice(i, j); return v.reduce((x, y) => x + y, 0) / v.length; };
  const pre = med(B.x, iS - 100, iS), post = med(B.x, iS + 60, iS + 160), D = post - pre;
  const intarziere = a => { const p0 = med(a, iS - 100, iS), prag = p0 + 0.632 * D; for (let i = iS; i < n; i++) if ((D > 0 && a[i] >= prag) || (D < 0 && a[i] <= prag)) return (B.t[i] - ultima.t) * 1000; return NaN; };
  return { n: lung, s: { raw: sd(B.x), m: sd(B.m), e: sd(B.e) }, d: { raw: intarziere(B.x), m: intarziere(B.m), e: intarziere(B.e) }, D };
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const rot = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
function inregDiv(e) {
  if (!sim.run) return Cadru.mesajTemporar("Porniți simularea (sursa se alimentează odată cu standul).", "atentie");
  const n = net(sim.dmm.s), U = sim.dmm.v;
  const map = { v12: ["d12", "Uin"], v5: ["d5", "Uin"], div12: ["d12", "Um"], div5: ["d5", "Um"] }[n];
  if (!map) return Cadru.mesajTemporar("Puneți sonda roșie a multimetrului pe +12 V sau +5 V (U_in) ori pe nodul unui divizor (U_out).", "atentie");
  const [d, c] = map, R1 = d === "d12" ? sim.R.R1a : sim.R.R1b, R2 = d === "d12" ? sim.R.R2a : sim.R.R2b;
  const cel = [{ t: "t21", r: d, c, v: U.toFixed(3) }];
  if (c === "Um") cel.push({ t: "t21", r: d, c: "R1", v: String(R1) }, { t: "t21", r: d, c: "R2", v: String(R2) });
  const ok = Cadru.inregistreaza(e, { log: c === "Uin" ? { m: "uin", d, U } : { m: "div", d, U, R1, R2 }, celule: cel });
  if (ok) msg(`Tabelul 2.1 (${d === "d12" ? "12 V" : "5 V"}): ${c === "Uin" ? "U_in" : `U_out (R1 = ${R1} kΩ, R2 = ${R2} kΩ)`} = ${fx(U, 3)} V.`);
}
function inregRC(e) {
  const a = sim.osc.acq, f = fGen();
  if (!sim.run || !sim.gen) return Cadru.mesajTemporar("Porniți simularea și ieșirea generatorului (OUTPUT).", "atentie");
  if (!MD.FREC.includes(f)) return Cadru.mesajTemporar("Tabelul 2.2 se completează la 20, 100, 159, 500 și 2000 Hz (butoanele ◀ ▶ ale generatorului).", "atentie");
  if (net(sim.osc.ch[0].s) !== "gen" || net(sim.osc.ch[1].s) !== "rc") return Cadru.mesajTemporar("CH1 pe intrarea filtrului (generator), CH2 pe ieșirea filtrului (condensator).", "atentie");
  if (!a || !Number.isFinite(a.m[0].f)) return Cadru.mesajTemporar("Alegeți o bază de timp la care pe ecran apare cel puțin o perioadă (măsurătoarea Freq).", "atentie");
  const uin = rot(a.m[0].vpp, 3), uout = rot(a.m[1].vpp, 3);
  const ok = Cadru.inregistreaza(e, { log: { m: "rc", f, uin, uout }, celule: [{ t: "t22", r: "f" + f, c: "Uin", v: uin.toFixed(3) }, { t: "t22", r: "f" + f, c: "Uout", v: uout.toFixed(3) }] });
  if (ok) msg(`Tabelul 2.2, ${f} Hz: U_in = ${fx(uin, 3)} Vpp, U_out = ${fx(uout, 3)} Vpp.`);
}
function inregAlias(e) {
  const fw = sim.fw || {}, a = sim.al, f = fGen();
  if (fw.prog !== "stm_alias") return Cadru.mesajTemporar("Porniți simularea cu schița stm32_esantionare și deschideți plotterul serial.", "atentie");
  if (fw.fs !== 1000) return Cadru.mesajTemporar("Tabelul 2.3 cere f_s = 1000 Hz (constanta FS din program).", "atentie");
  if (!MD.FAL.includes(f)) return Cadru.mesajTemporar("Alegeți la generator 100, 900 sau 1100 Hz.", "atentie");
  if (!a || a.f !== f || a.sw !== sim.sw0) return Cadru.mesajTemporar("Așteptați următorul set de 200 de eșantioane după ultima modificare.", "atentie");
  const m = masuraCursoare();
  if (a.sw === "gen") {
    if (!Number.isFinite(m.f) || m.dn < 3) return Cadru.mesajTemporar("Așezați cursoarele A și B (clic/tragere pe plotter) pe două maxime ale semnalului aparent și indicați câte perioade cuprind.", "atentie");
    const fa = rot(m.f, 1);
    const ok = Cadru.inregistreaza(e, { log: { m: "fap", f, fa }, celule: [{ t: "t23", r: "f" + f, c: "fap", v: fa.toFixed(1) }] });
    if (ok) msg(`Tabelul 2.3, ${f} Hz: frecvența aparentă = ${fx(fa, 1)} Hz (Δn = ${m.dn}, ${sim.per} per.).`);
  } else {
    const am = rot(m.vpp, 3);
    const ok = Cadru.inregistreaza(e, { log: { m: "amp", f, a: am }, celule: [{ t: "t23", r: "f" + f, c: "amp", v: am.toFixed(3) }] });
    if (ok) msg(`Tabelul 2.3, ${f} Hz cu filtrul RC: amplitudinea eșantioanelor (vârf-vârf) = ${fx(am, 3)} V.`);
  }
}
function inregFiltre(e) {
  const fw = sim.fw || {};
  if (fw.prog !== "stm_filtre") return Cadru.mesajTemporar("Porniți simularea cu schița stm32_filtre.", "atentie");
  if (fw.Ts !== 10) return Cadru.mesajTemporar("Tabelul 2.4 se completează cu T_s = 10 ms (eșantionare la 100 Hz).", "atentie");
  const r = analizaFiltre(); if (r.er) return Cadru.mesajTemporar(r.er, "atentie");
  const km = "m" + fw.N, ke = { 0.5: "e50", 0.2: "e20", 0.05: "e05" }[fw.a];
  const v = [["raw", r.s.raw, r.d.raw], [km, r.s.m, r.d.m], [ke, r.s.e, r.d.e]].map(([k, s, d]) => [k, rot(s, 2), rot(d, 0)]);
  const ok = Cadru.inregistreaza(e, { log: v.map(([k, s, d]) => ({ m: "flt", k, s, del: d })), celule: v.flatMap(([k, s, d]) => [{ t: "t24", r: k, c: "sig", v: s.toFixed(2) }, { t: "t24", r: k, c: "del", v: String(d) }]) });
  if (ok) msg(`Tabelul 2.4: σ brut ${fx(v[0][1], 2)} LSB; medie mobilă N = ${fw.N}: σ ${fx(v[1][1], 2)} LSB, întârziere ${v[1][2]} ms; exponențial α = ${String(fw.a).replace(".", ",")}: σ ${fx(v[2][1], 2)} LSB, întârziere ${v[2][2]} ms (fereastra: ${r.n} eșantioane).`);
}

/* ------------------------------------------------------------------ pașii lucrării (panoul din dreapta) */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const sonda = (id, netw) => net(sursaSonda(id)) === netw;
const PASI = [
  { t: "Divizoarele de tensiune", tab: "Tabelul 2.1", zona: [20, 20, 1080, 760], pini: ["v12", "v5", "div12", "div5"], schita: "stm_div",
    banda: "Pasul 1 · Multimetrul (sonda roșie V) măsoară U<sub>in</sub> la bornele sursei și U<sub>out</sub> pe nodurile divizoarelor (marcate cu portocaliu).",
    instr: [`Apăsați <b>▶ Pornește simularea</b> (bara de sus a planșei). Schița implicită <i>stm32_divizor</i> afișează pe monitorul serial și codurile ADC ale pinilor PA2 și PA3.`, `Trageți vârful sondei roșii <b>V</b> a multimetrului pe borna <b>+12 V</b> a sursei; citiți tensiunea și apăsați <b>„● U (multimetru) → Tabelul 2.1”</b> – se completează U<sub>in</sub> pentru divizorul de 12 V.`, `Mutați sonda <b>V</b> pe nodul divizorului de 12 V (punctul dintre R1 și R2) și apăsați din nou butonul – se completează U<sub>out</sub>.`, `Repetați pentru borna <b>+5 V</b> și nodul divizorului de 5 V.`, `Verificați că tensiunea nodurilor rămâne sub 3,3 V (limita pinilor STM32). Pentru a încerca alt rezistor: opriți simularea și dați clic pe el.`],
    ver: () => [[sim.run, "simularea pornită"], [["v12", "v5", "div12", "div5"].includes(net(sim.dmm.s)), "sonda V pe o bornă a sursei sau pe nodul unui divizor"]],
    prog: () => [["d12", "Uin"], ["d12", "Um"], ["d5", "Uin"], ["d5", "Um"]].filter(([r, c]) => pe("t21", r, c)).length, tot: 4,
    buton: ["● U (multimetru) → Tabelul 2.1", () => inregDiv] },
  { t: "Filtrul RC", tab: "Tabelul 2.2", zona: [20, 20, 960, 700], pini: ["genBB", "rc"], schita: null,
    banda: "Pasul 2 · CH1 (galben) pe intrarea filtrului, CH2 (albastru) pe condensator. Osciloscopul măsoară automat Vpp pe ambele canale.",
    instr: [`Pe generatorul de semnal apăsați <b>OUTPUT</b> (pornit) și reglați frecvența cu <b>◀ ▶</b> la <b>20 Hz</b>.`, `Trageți sonda <b>1</b> (CH1) a osciloscopului pe intrarea filtrului (capătul din stânga al rezistorului R = 10 kΩ) și sonda <b>2</b> (CH2) pe condensatorul C = 100 nF.`, `Apăsați <b>T/div +</b> / <b>T/div −</b> pe osciloscop până se văd 1–3 perioade și apar măsurătorile automate (Freq, Vpp).`, `Apăsați <b>„● U<sub>in</sub>, U<sub>out</sub> Vpp → Tabelul 2.2”</b>.`, `Repetați la <b>100, 159, 500 și 2000 Hz</b>, reajustând de fiecare dată T/div. Observați cum semnalul de pe CH2 scade și rămâne în urmă față de CH1.`],
    ver: () => [[sim.run && sim.gen, "simularea și generatorul pornite"], [sonda("ch0", "gen"), "CH1 pe intrarea filtrului"], [sonda("ch1", "rc"), "CH2 pe condensator"], [MD.FREC.includes(fGen()), `frecvența ${fGen()} Hz este una din cele 5 cerute`], [!!(sim.osc.acq && Number.isFinite(sim.osc.acq.m[0].f)), "cel puțin o perioadă pe ecran (Freq afișat)"]],
    prog: () => MD.FREC.filter(f => pe("t22", "f" + f, "Uout")).length, tot: 5,
    buton: ["● U<sub>in</sub>, U<sub>out</sub> Vpp → Tabelul 2.2", () => inregRC] },
  { t: "Aliasing", tab: "Tabelul 2.3", zona: [20, 190, 1280, 600], pini: ["genO", "sw0o", "PA0"], schita: "stm_alias",
    banda: "Pasul 3 · Generatorul → S1 (pe GEN) → PA0. STM32 eșantionează cu 1 kHz; plotterul de sub planșă arată cele 200 de eșantioane: semnalul pare de altă frecvență.",
    instr: [`Apăsați <b>■ Oprește simularea</b>; în panoul de cod alegeți schița <i>stm32_esantionare</i> (FS = 1000) și apăsați <b>▶ Pornește simularea</b>.`, `Dați clic pe comutatorul <b>S1</b> până ajunge pe poziția <b>GEN</b> (semnalul generatorului ajunge direct la PA0).`, `Reglați generatorul la <b>100 Hz</b> (◀ ▶).`, `Pe <b>plotterul serial</b> dați clic / trageți: cursorul <b>A</b> pe un maxim al semnalului eșantionat, cursorul <b>B</b> pe un maxim mai depărtat; în lista „Perioade între cursoare” alegeți câte perioade cuprind.`, `Apăsați <b>„● f aparentă (cursoare) → Tabelul 2.3”</b>.`, `Repetați la <b>900 Hz</b> și <b>1100 Hz</b> și comparați cu f<sub>a</sub> = |f − k·f<sub>s</sub>|.`],
    ver: () => [[sim.run && (sim.fw || {}).prog === "stm_alias", "rulează stm32_esantionare"], [(sim.fw || {}).fs === 1000, "FS = 1000 Hz"], [sim.sw0 === "gen", "S1 pe GEN"], [MD.FAL.includes(fGen()), `frecvența ${fGen()} Hz este 100, 900 sau 1100 Hz`]],
    prog: () => MD.FAL.filter(f => pe("t23", "f" + f, "fap")).length, tot: 3,
    buton: ["● f aparentă (cursoare) → Tabelul 2.3", () => inregAlias] },
  { t: "Filtrul RC înaintea ADC", tab: "Tabelul 2.3 (ultima coloană)", zona: [20, 190, 1280, 600], pini: ["rc", "sw0o", "PA0"], schita: "stm_alias",
    banda: "Pasul 4 · S1 pe RC: ADC-ul primește semnalul filtrat. Comparați amplitudinea eșantioanelor (Vpp în plotter) la 100, 900 și 1100 Hz.",
    instr: [`Lăsați schița <i>stm32_esantionare</i> pornită și dați clic pe <b>S1</b> până ajunge pe <b>RC</b> (semnalul trece prin filtrul RC înainte de PA0).`, `Generatorul la <b>100 Hz</b>; așteptați pe plotter un set nou de eșantioane.`, `Apăsați <b>„● amplitudine (plotter) → Tabelul 2.3”</b> (amplitudinea vârf-vârf a eșantioanelor).`, `Repetați la <b>900 Hz</b> și <b>1100 Hz</b>. Observați: aliasul de 100 Hz rămâne vizibil, doar atenuat – un filtru RC de ordinul 1 nu este suficient ca filtru anti-aliasing.`],
    ver: () => [[sim.run && (sim.fw || {}).prog === "stm_alias" && (sim.fw || {}).fs === 1000, "rulează stm32_esantionare cu FS = 1000"], [sim.sw0 === "rc", "S1 pe RC"], [MD.FAL.includes(fGen()), `frecvența ${fGen()} Hz este 100, 900 sau 1100 Hz`]],
    prog: () => MD.FAL.filter(f => pe("t23", "f" + f, "amp")).length, tot: 3,
    buton: ["● amplitudine (plotter) → Tabelul 2.3", () => inregAlias] },
  { t: "Filtre numerice", tab: "Tabelul 2.4", zona: [370, 380, 930, 420], pini: ["pa1n", "PA1"], schita: "stm_filtre",
    banda: "Pasul 5 · Motorul (S2) cuplează zgomot pe firul PA1; S3 aplică o treaptă de 1 V. Plotterul: gri = brut, albastru = medie mobilă, portocaliu = exponențial.",
    instr: [`Apăsați <b>■ Oprește simularea</b>, alegeți schița <i>stm32_filtre</i> și setați în cod T<sub>s</sub> = 10 ms, <b>N = 4</b>, <b>α = 0,5</b>; apăsați <b>▶ Pornește simularea</b>.`, `Dați clic pe comutatorul <b>S2</b> (pornește motorul – semnalul cu zgomot) și așteptați ≈ 6 s fără să atingeți nimic.`, `Dați clic pe <b>S3</b> (treapta de semnal) și așteptați încă ≈ 2 s.`, `Apăsați <b>„● σ și întârzierea → Tabelul 2.4”</b>: se completează rândurile „fără filtru”, media pe N eșantioane și filtrul exponențial α.`, `Repetați pentru (N; α) = <b>(8; 0,2)</b> și <b>(16; 0,05)</b>: oprire, modificare în cod, pornire, S2, așteptare, S3, înregistrare.`],
    ver: () => { const fw = sim.fw || {}; const a = fw.prog === "stm_filtre" ? analizaFiltre() : { er: "x" }; return [[sim.run && fw.prog === "stm_filtre", "rulează stm32_filtre"], [fw.Ts === 10, "T<sub>s</sub> = 10 ms"], [sim.motor, "motorul pornit (S2)"], [!a.er, a.er && fw.prog === "stm_filtre" ? a.er : "zgomot înregistrat și treaptă aplicată"]]; },
    prog: () => Object.keys(MD.FILTRE).filter(k => pe("t24", k, "sig")).length, tot: 7,
    buton: ["● σ și întârzierea → Tabelul 2.4", () => inregFiltre] }
];
let pasActiv = 0;
/* indiciile pas cu pas: ce se conectează / se apasă, în ordine (comun/ghid-pasi.js → ghidIndicii) */
const giP = p => `#tk-svg [data-pin="${p}"]`, giR = () => ".pas.activ [data-inreg]", giS = "#tk-start", giSd = k => `#tk-svg [data-sonda="${k}"]`;
const GI_SK = { stm_div: "stm32_divizor", stm_alias: "stm32_esantionare", stm_filtre: "stm32_filtre" };
function giSchita(prog, camp, ok) {
  const o = [[giS, "Opriți simularea (■ Oprește simularea)", !sim.run || ok],
    ["#tk-sk", `În panoul { } Cod alegeți schița <b>${GI_SK[prog]}</b>`, ok || (!sim.run && sim.sketch === prog)]];
  Object.entries(camp).forEach(([k, v]) => o.push([`#tk-cod [data-cf="${k}"]`, `Setați în cod <b>${{ fs: "FS", Ts: "TS", N: "N", a: "ALFA" }[k]} = ${String(v).replace(".", ",")}</b>`, ok || (!sim.run && String(sim.camp[k]) === String(v))]));
  o.push([giS, "Apăsați <b>▶ Pornește simularea</b>", ok]); return o;
}
function giFrec(f) { const c = fGen(); return [`#tk-svg [data-gb="${c < f ? "+" : "-"}"]`, `Generatorul la <b>${f} Hz</b> (butoanele ◀ ▶; acum ${c} Hz)`, c === f]; }
const giSonda = (sd, pin, n, txt) => [[giSd(sd), giP(pin)], txt, net(sd === "dmm" ? sim.dmm.s : sim.osc.ch[+sd.slice(2)].s) === n];
PASI[0].ind = () => {
  const C = [["d12", "Uin", "v12", "borna <b>+12 V</b> a sursei"], ["d12", "Um", "div12", "nodul divizorului de 12 V (între R1 și R2)"], ["d5", "Uin", "v5", "borna <b>+5 V</b> a sursei"], ["d5", "Um", "div5", "nodul divizorului de 5 V"]].find(c => !pe("t21", c[0], c[1]));
  const o = [[giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run]]; if (!C) return o;
  return [...o, giSonda("dmm", C[2], C[2], `Trageți sonda roșie <b>V</b> a multimetrului pe ${C[3]}`), [giR(), `Apăsați <b>„● U (multimetru) → Tabelul 2.1”</b> (${C[1] === "Uin" ? "U<sub>in</sub>" : "U<sub>out</sub>"})`, false]];
};
PASI[1].ind = () => {
  const f = MD.FREC.find(x => !pe("t22", "f" + x, "Uout")), a = sim.osc.acq;
  const o = [[giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run], ["#gen-out", "Pe generator apăsați <b>OUTPUT</b> (pornit)", sim.gen],
    giSonda("ch0", "genBB", "gen", "Trageți sonda <b>1</b> (CH1) pe intrarea filtrului (stânga lui R = 10 kΩ)"), giSonda("ch1", "rc", "rc", "Trageți sonda <b>2</b> (CH2) pe condensatorul C = 100 nF")];
  if (!f) return o;
  return [...o, giFrec(f), [`#tk-svg [data-ob="tdiv${10 * sim.osc.tdiv * f > 5 ? "-" : "+"}"]`, `Apăsați <b>T/div ${10 * sim.osc.tdiv * f > 5 ? "−" : "+"}</b> pe osciloscop până apar 1–3 perioade și măsurătorile Freq, Vpp (acum ${fmtT(sim.osc.tdiv)}/div)`, !!(a && Number.isFinite(a.m[0].f)) && fGen() === f && 10 * sim.osc.tdiv * f <= 5],
    [giR(), `Apăsați <b>„● U<sub>in</sub>, U<sub>out</sub> Vpp → Tabelul 2.2”</b> (${f} Hz)`, false]];
};
PASI[2].ind = () => {
  const fw = sim.fw || {}, ok = sim.run && fw.prog === "stm_alias" && fw.fs === 1000, f = MD.FAL.find(x => !pe("t23", "f" + x, "fap"));
  const o = [...giSchita("stm_alias", { fs: "1000" }, ok), ["#sw0", "Dați clic pe comutatorul <b>S1</b> până ajunge pe <b>GEN</b>", sim.sw0 === "gen"], ["#gen-out", "Generatorul: <b>OUTPUT</b> pornit", sim.gen]];
  if (!f) return o;
  const m = sim.al ? masuraCursoare() : { dn: 0 }, nou = !!(sim.al && sim.al.f === f && sim.al.sw === sim.sw0);
  return [...o, giFrec(f), ["#tk-plot", "Pe plotter: așteptați setul nou, apoi clic / tragere – cursorul <b>A</b> pe un maxim, <b>B</b> pe un maxim mai depărtat", nou && m.dn >= 3],
    ["#plot-per", "Alegeți câte <b>perioade</b> cuprind cursoarele", nou && m.dn >= 3 && sim.per > 1],
    [giR(), `Apăsați <b>„● f aparentă (cursoare) → Tabelul 2.3”</b> (${f} Hz)`, false]];
};
PASI[3].ind = () => {
  const fw = sim.fw || {}, ok = sim.run && fw.prog === "stm_alias" && fw.fs === 1000, f = MD.FAL.find(x => !pe("t23", "f" + x, "amp"));
  const o = [...giSchita("stm_alias", { fs: "1000" }, ok), ["#sw0", "Dați clic pe <b>S1</b> până ajunge pe <b>RC</b>", sim.sw0 === "rc"], ["#gen-out", "Generatorul: <b>OUTPUT</b> pornit", sim.gen]];
  if (!f) return o;
  return [...o, giFrec(f), ["#tk-plot", "Așteptați pe plotter un set nou de eșantioane", !!(sim.al && sim.al.f === f && sim.al.sw === sim.sw0)],
    [giR(), `Apăsați <b>„● amplitudine (plotter) → Tabelul 2.3”</b> (${f} Hz)`, false]];
};
let giMot = null, giS3 = null;
PASI[4].ind = () => {
  const C = [[4, "0.5", "m4"], [8, "0.2", "m8"], [16, "0.05", "m16"]].find(c => !pe("t24", c[2], "sig")); if (!C) return [[giR(), "Tabelul 2.4 este complet", true]];
  const fw = sim.fw || {}, ok = sim.run && fw.prog === "stm_filtre" && fw.Ts === 10 && fw.N === C[0] && String(fw.a) === C[1];
  const a = ok ? analizaFiltre() : { er: "x" };
  if (ok && sim.motor) { if (giMot === null) giMot = sim.t; } else giMot = null;
  if (ok && giMot !== null) { const t = sim.trepte.filter(x => x.t > giMot); giS3 = t.length ? t[t.length - 1].t : null; } else giS3 = null;
  return [...giSchita("stm_filtre", { Ts: "10", N: String(C[0]), a: C[1] }, ok),
    ["#sw2", "Dați clic pe <b>S2</b> (pornește motorul – semnalul cu zgomot)", ok && sim.motor],
    ["#tk-plot", `Așteptați ≈ 6 s fără să atingeți nimic${giMot !== null && sim.t - giMot < 6 ? ` (încă ${fx(6 - (sim.t - giMot), 0)} s)` : ""}`, ok && sim.motor && (giS3 !== null || sim.t - giMot >= 6)],
    ["#sw3", "Dați clic pe <b>S3</b> (treapta de semnal)", ok && giS3 !== null],
    ["#tk-plot", "Așteptați ≈ 2 s să se completeze răspunsul la treaptă pe plotter", ok && !a.er],
    [giR(), `Apăsați <b>„● σ și întârzierea → Tabelul 2.4”</b> (N = ${C[0]}, α = ${C[1].replace(".", ",")})`, false]];
};

function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol><ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată pe planșă</button><button type="button" class="primar lat" data-inreg="${i}">${p.buton[0]}</button></div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => alegePas(+b.dataset.vezi, true)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].buton[1]()(e); actualizeazaPasi(); }));
  ghidPasi(PASI, alegePas); ghidIndicii(PASI, () => pasActiv);
  alegePas(0, false);
}
function alegePas(i, zoom) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$("#tk-svg .tk-pin").forEach(r => r.classList.toggle("tinta", p.pini.includes(r.dataset.pin)));
  $("#tk-pas-banda").innerHTML = p.banda;
  if (zoom) seteazaVB(p.zona.slice());
  if (p.schita && !sim.run && sim.sketch !== p.schita) { sim.sketch = p.schita; afiseazaCod(); }
  actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  const v = PASI[pasActiv].ver();
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = v.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaMAM2(D) {
  const t = D.t, cel = { t21: {}, t22: {}, t23: {}, t24: {} }, rele = { t21: {}, t22: {} };
  ["d12", "d5"].forEach(k => { const r = t.t21[k], R1 = num(r.R1), R2 = num(r.R2), Ui = Number.isFinite(num(r.Uin)) ? num(r.Uin) : (k === "d12" ? 12 : 5), Uc = Ui * R2 / (R1 + R2), Um = num(r.Um), ab = (Um - Uc) / Uc * 100;
    cel.t21[k] = { Uc: Number.isFinite(Uc) ? fx(Uc, 3) : "", ab: Number.isFinite(ab) ? fx(ab, 2) : "" }; rele.t21[k] = { ab: Math.abs(ab) > 2 }; });
  const fcs = [], pts = [];
  MD.FREC.forEach(f => { const r = t.t22["f" + f], ui = num(r.Uin), uo = num(r.Uout), A = 20 * Math.log10(uo / ui), Ac = -10 * Math.log10(1 + (f / 159.15) ** 2);
    cel.t22["f" + f] = { A: Number.isFinite(A) ? fx(A, 2) : "", Ac: fx(Ac, 2) };
    if (Number.isFinite(A)) { pts.push([f, A]); if (A < -1) fcs.push(f / Math.sqrt(10 ** (-A / 10) - 1)); } });
  const fcE = fcs.length ? fcs.reduce((a, b) => a + b, 0) / fcs.length : NaN;
  MD.FAL.forEach(f => { cel.t23["f" + f] = { fac: String(MD.alias(f, 1000)) }; });
  const s0 = num(t.t24.raw.sig);
  Object.keys(MD.FILTRE).forEach(k => { const s = num(t.t24[k].sig), red = s0 / s, F = MD.FILTRE[k], teo = F.t === "x" ? 1 : F.t === "m" ? Math.sqrt(F.n) : Math.sqrt((2 - F.a) / F.a);
    cel.t24[k] = { red: Number.isFinite(red) && k !== "raw" ? `${fx(red, 2)} (teor. ${fx(teo, 2)})` : k === "raw" ? "1" : "", delc: String(MD.intTeor(k, 10)) }; });
  const rez = [
    ["Frecvența de tăiere nominală (R = 10 kΩ, C = 100 nF)", "f<sub>c</sub> = 1/(2π·10<sup>4</sup>·10<sup>−7</sup>) = 159,2 Hz"],
    ["Frecvența de tăiere reală, din atenuările măsurate (f<sub>c</sub> = f/√(10<sup>−A/10</sup> − 1), media punctelor cu A &lt; −1 dB)", Number.isFinite(fcE) ? `<span style="color:var(--accent)">${fx(fcE, 1)} Hz</span> (C real ≈ ${fx(1 / (2 * Math.PI * 1e4 * fcE) * 1e9, 1)} nF)` : "—"],
    ["Divizorul pentru 12 V: tensiunea maximă a rețelei de bord (14,5 V la încărcare; impulsuri de 16 V)", Number.isFinite(num(t.t21.d12.R1)) ? `U<sub>PA2</sub> = ${fx(16 * num(t.t21.d12.R2) / (num(t.t21.d12.R1) + num(t.t21.d12.R2)), 2)} V la 16 V` : "—"],
    ["Reducerea σ prin medie mobilă (√N) / filtrul exponențial (√((2 − α)/α))", "N = 4, 8, 16: 2; 2,83; 4 · α = 0,5; 0,2; 0,05: 1,73; 3; 6,24"]
  ];
  const verdicte = [];
  if (Number.isFinite(fcE)) verdicte.push(Math.abs(fcE / 159.15 - 1) > 0.03 ? { tip: "atentie", text: `Frecvența de tăiere reală (${fx(fcE, 0)} Hz) diferă de cea nominală: condensatorul ceramic are toleranța ±10 %. Pentru filtre precise se folosesc condensatoare C0G/NP0 sau cu film (±1…5 %).` } : { tip: "ok", text: "Frecvența de tăiere măsurată corespunde valorii nominale în limita toleranțelor." });
  const um12 = num(t.t21.d12.R1); if (Number.isFinite(um12) && 16 * num(t.t21.d12.R2) / (um12 + num(t.t21.d12.R2)) > 3.3) verdicte.push({ tip: "atentie", text: "Divizorul ales pentru 12 V depășește 3,3 V la tensiunea maximă a rețelei de bord (14,5…16 V): în autoturism se dimensionează pentru 16 V și se adaugă protecție (rezistor serie, diodă de limitare)." });
  const serii = [{ tip: "pct", pts, culoare: 0, r: 4 }, { tip: "linie", pts: Array.from({ length: 60 }, (_, i) => { const f = 10 * 10 ** (i / 59 * 2.6); return [f, -10 * Math.log10(1 + (f / 159.15) ** 2)]; }), culoare: 1, punctat: true }];
  if (Number.isFinite(fcE)) serii.push({ tip: "linie", pts: Array.from({ length: 60 }, (_, i) => { const f = 10 * 10 ** (i / 59 * 2.6); return [f, -10 * Math.log10(1 + (f / fcE) ** 2)]; }), culoare: 2 });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Caracteristica de frecvență a filtrului RC: A = f(f)",
    grafic: { xmin: 10, xmax: 4000, xlog: true, ymin: -30, ymax: 2, xlab: "f [Hz]", ylab: "A [dB]", serii, yticks: [-30, -25, -20, -15, -10, -5, -3, 0] },
    legenda: [["măsurat (Tabelul 2.2)", "var(--serie-0)", "pct"], ["teoretic, f<sub>c</sub> = 159 Hz", "var(--serie-1)"], ["cu f<sub>c</sub> estimată", "var(--serie-2)"]],
    principal: { eticheta: "f<sub>c</sub> estimată [Hz]", valoare: Number.isFinite(fcE) ? +fcE.toFixed(1) : null }
  };
}

/* ------------------------------------------------------------------ figurile (SVG generat) */
function figRC() {
  const W = 640, H = 230, X = f => 50 + (Math.log10(f) - 1) / 2.6 * 270, Y = a => 20 + (-a) / 30 * 170;
  let c = ""; for (let i = 0; i <= 60; i++) { const f = 10 * 10 ** (i / 60 * 2.6); c += (i ? "L" : "M") + X(f).toFixed(1) + "," + Y(-10 * Math.log10(1 + (f / 159) ** 2)).toFixed(1); }
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig-svg" role="img" aria-label="Fig. 2.1"><g font-size="10" fill="currentColor">`;
  [10, 100, 1000].forEach(f => { s += `<line x1="${X(f)}" y1="20" x2="${X(f)}" y2="190" stroke="currentColor" opacity=".15"/><text x="${X(f)}" y="204" text-anchor="middle">${f}</text>`; });
  [0, -10, -20, -30].forEach(a => { s += `<line x1="50" y1="${Y(a)}" x2="320" y2="${Y(a)}" stroke="currentColor" opacity=".15"/><text x="44" y="${Y(a) + 3}" text-anchor="end">${a}</text>`; });
  s += `<path d="${c}" fill="none" stroke="#1f5f9e" stroke-width="2"/><line x1="${X(159)}" y1="${Y(-3)}" x2="${X(159)}" y2="190" stroke="#c0492b" stroke-dasharray="4 3"/><text x="${X(159) + 4}" y="${Y(-3) - 4}" fill="#c0492b">f_c = 159 Hz, −3 dB</text><text x="185" y="222" text-anchor="middle">f [Hz]</text><text x="14" y="110" transform="rotate(-90 14 110)" text-anchor="middle">A [dB]</text>`;
  // aliasing: semnal 900 Hz eșantionat cu 1 kHz
  const x0 = 360, w = 260, T = 0.012, Xt = t => x0 + t / T * w, Yv = v => 105 - v * 60;
  let sg = ""; for (let i = 0; i <= 600; i++) { const t = i / 600 * T; sg += (i ? "L" : "M") + Xt(t).toFixed(1) + "," + Yv(Math.sin(2 * Math.PI * 900 * t)).toFixed(1); }
  let al = ""; for (let i = 0; i <= 200; i++) { const t = i / 200 * T; al += (i ? "L" : "M") + Xt(t).toFixed(1) + "," + Yv(-Math.sin(2 * Math.PI * 100 * t)).toFixed(1); }
  s += `<path d="${sg}" fill="none" stroke="currentColor" opacity=".35" stroke-width="1"/><path d="${al}" fill="none" stroke="#c0492b" stroke-width="1.6" stroke-dasharray="5 3"/>`;
  for (let k = 0; k <= 12; k++) { const t = k / 1000; s += `<circle cx="${Xt(t)}" cy="${Yv(Math.sin(2 * Math.PI * 900 * t))}" r="3.5" fill="#1f5f9e"/>`; }
  s += `<line x1="${x0}" y1="105" x2="${x0 + w}" y2="105" stroke="currentColor" opacity=".3"/><text x="${x0 + w / 2}" y="190" text-anchor="middle">semnal 900 Hz (gri), eșantioane la 1 kHz (puncte)</text><text x="${x0 + w / 2}" y="204" text-anchor="middle" fill="#c0492b">aliasul aparent: 100 Hz (roșu)</text></g></svg>`;
  return s;
}
function figFiltre() {
  const W = 640, H = 210, Xs = k => 40 + k / 120 * 570, Yv = v => 170 - v * 120;
  let r = 1234567; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647, g = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return (s - 3) * 0.7; };
  const x = [], ma = [], ex = []; let y = 0; const b = [];
  for (let k = 0; k <= 120; k++) { const v = (k >= 30 ? 1 : 0) + 0.12 * g(); x.push(v); b.push(v); if (b.length > 8) b.shift(); ma.push(b.reduce((a, c) => a + c, 0) / b.length); y = k ? 0.2 * v + 0.8 * y : v; ex.push(y); }
  const p = a => a.map((v, k) => (k ? "L" : "M") + Xs(k).toFixed(1) + "," + Yv(v).toFixed(1)).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="fig-svg" role="img" aria-label="Fig. 2.2"><g font-size="10" fill="currentColor"><line x1="40" y1="${Yv(0)}" x2="610" y2="${Yv(0)}" stroke="currentColor" opacity=".2"/><line x1="40" y1="${Yv(1)}" x2="610" y2="${Yv(1)}" stroke="currentColor" opacity=".2"/><line x1="40" y1="${Yv(0.632)}" x2="610" y2="${Yv(0.632)}" stroke="currentColor" opacity=".25" stroke-dasharray="3 3"/><text x="36" y="${Yv(0.632) + 3}" text-anchor="end">63 %</text>
  <path d="${p(x)}" fill="none" stroke="#9aa3ad" stroke-width="1"/><path d="${p(ma)}" fill="none" stroke="#1f5f9e" stroke-width="2"/><path d="${p(ex)}" fill="none" stroke="#e0661b" stroke-width="2"/>
  <text x="330" y="200" text-anchor="middle">eșantionul k (T_s = 10 ms) · gri: semnal cu zgomot · albastru: medie mobilă N = 8 · portocaliu: exponențial α = 0,2</text></g></svg>`;
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Tensiunile folosite sunt de cel mult 12 V c.c.; generatorul de semnal și sursa se conectează numai cu ieșirea dezactivată.</li>
<li>Divizoarele pentru semnalele de 12 V se verifică cu multimetrul înainte de legarea la microcontroler (tensiunea la intrarea ADC ≤ U<sub>ref</sub>).</li>
<li>Masa osciloscopului se leagă numai la masa standului; nu se leagă sonda de masă la alt potențial.</li>
<li>Condensatoarele electrolitice se montează respectând polaritatea.</li></ul></div>
<h2>2.1. Scopul lucrării</h2>
<p>Studiul lanțului de achiziție senzor – condiționare – ADC – prelucrare numerică: adaptarea nivelului prin divizoare, filtrarea analogică RC, alegerea frecvenței de eșantionare, observarea fenomenului de aliasing și compararea filtrelor numerice (medie mobilă, filtru exponențial) după reducerea zgomotului și întârzierea introdusă.</p>
<h2>2.2. Noțiuni teoretice</h2>
<p>Semnalele senzorilor auto sunt afectate de zgomot electromagnetic (aprindere, motoare, convertoare), iar nivelurile lor (5 V, 12 V) nu corespund întotdeauna domeniului ADC. Condiționarea cuprinde adaptarea nivelului (divizor, amplificator), protecția intrării (rezistor serie, diodă) și filtrarea trece-jos înaintea eșantionării.</p>
<div class="ec"><span>U<sub>out</sub> = U<sub>in</sub>·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>)</span><span class="nr">(2.1)</span></div>
<div class="ec"><span>f<sub>c</sub> = 1/(2·π·R·C)</span><span class="nr">(2.2)</span></div>
<p>Teorema eșantionării cere o frecvență de eșantionare mai mare decât dublul frecvenței maxime din semnal. Dacă semnalul conține componente peste f<sub>s</sub>/2, ele apar după eșantionare la o frecvență falsă (aliasing, Fig. 2.1); de aceea filtrul analogic se pune înaintea ADC.</p>
<div class="ec"><span>f<sub>s</sub> &gt; 2·f<sub>max</sub></span><span class="nr">(2.3)</span></div>
<div class="ec"><span>f<sub>a</sub> = |f − k·f<sub>s</sub>|, &nbsp; k întreg ales astfel încât f<sub>a</sub> ≤ f<sub>s</sub>/2</span><span class="nr">(2.4)</span></div>
<figure>${figRC()}<figcaption>Fig. 2.1. Caracteristica filtrului RC și apariția aliasingului la eșantionarea unui semnal de 900 Hz cu 1 kHz</figcaption></figure>
<p>Filtrele numerice din ECU reduc zgomotul rămas. Media mobilă pe N eșantioane reduce abaterea standard a zgomotului alb de √N ori, dar întârzie semnalul cu aproximativ (N − 1)/2 perioade de eșantionare. Filtrul exponențial (trece-jos de ordinul 1) necesită o singură variabilă de memorie (Fig. 2.2):</p>
<div class="ec"><span>y<sub>k</sub> = (1/N)·Σ<sub>i=0…N−1</sub> x<sub>k−i</sub></span><span class="nr">(2.5)</span></div>
<div class="ec"><span>y<sub>k</sub> = α·x<sub>k</sub> + (1 − α)·y<sub>k−1</sub></span><span class="nr">(2.6)</span></div>
<div class="ec"><span>τ ≈ T<sub>s</sub>·(1 − α)/α</span><span class="nr">(2.7)</span></div>
<figure>${figFiltre()}<figcaption>Fig. 2.2. Filtrarea numerică a unui semnal cu zgomot la o variație de tip treaptă</figcaption></figure>
<pre class="cod">// medie mobilă (N = 8) și filtru exponențial (α = 0,2), eșantionare la 100 Hz
const int N = 8; int buf[N]; int idx = 0; long sum = 0; float y = 0;
void loop() {
  static uint32_t t0 = 0; if (millis() - t0 &lt; 10) return; t0 += 10;
  int x = analogRead(A0);
  sum += x - buf[idx]; buf[idx] = x; idx = (idx + 1) % N;
  float ma = (float)sum / N;
  y = 0.2 * x + 0.8 * y;
  Serial.print(x); Serial.print(' '); Serial.print(ma); Serial.print(' '); Serial.println(y);
}</pre>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Divizorul pentru „12 V”.</b> Cu R<sub>1</sub> = 27 kΩ și R<sub>2</sub> = 10 kΩ, 12 V dau 3,24 V – dar rețeaua de bord are 13,8…14,5 V cu motorul pornit și impulsuri de până la 16 V (ISO 16750-2): la 14,5 V pe pin ar ajunge 3,92 V, peste VDDA. Divizorul se dimensionează pentru tensiunea maximă (de exemplu R<sub>1</sub> = 39 kΩ, R<sub>2</sub> = 10 kΩ → 3,27 V la 16 V) și se protejează intrarea cu un rezistor serie și diode de limitare (sau o diodă Zener de 3,3 V). În simulator se poate alege orice rezistor din seria E24 (clic pe rezistor, cu simularea oprită).</li>
<li><b>Încărcarea divizorului de către ADC.</b> ADC-ul STM32F103 încarcă un condensator de eșantionare de ≈ 8 pF prin impedanța sursei; la un divizor cu R<sub>1</sub>‖R<sub>2</sub> ≈ 7 kΩ timpul de eșantionare implicit (STM32duino) este suficient, dar la impedanțe mari se mărește timpul de eșantionare sau se pune un condensator de ≈ 10…100 nF chiar la pin. Același condensator, împreună cu R<sub>1</sub>‖R<sub>2</sub>, formează și un filtru trece-jos.</li>
<li><b>Mărimile din Tabelul 2.2.</b> Atenuarea se calculează din valori vârf-vârf (sau efective) măsurate cu osciloscopul, la aceeași mărime pentru intrare și ieșire; generatorul are 2 Vpp cu offset +1,65 V (în domeniul ADC). Componenta continuă trece prin filtru neatenuată.</li>
<li><b>Filtrul RC nu este un filtru anti-aliasing suficient.</b> La 900 Hz filtrul cu f<sub>c</sub> = 159 Hz atenuează doar de ≈ 5,8 ori (−15 dB): aliasul de 100 Hz rămâne vizibil (Tabelul 2.3, ultima coloană). Un filtru anti-aliasing eficient are ordin mai mare sau se folosește supraeșantionarea (f<sub>s</sub> mult mai mare) urmată de filtrare numerică și decimare.</li>
<li><b>Întârzierea mediei mobile.</b> (N − 1)/2·T<sub>s</sub> este întârzierea de grup (deplasarea în timp a semnalului lent). Tabelul 2.4 cere însă timpul până la 63 % dintr-o treaptă: la media mobilă acesta este ⌈0,632·N⌉ eșantioane (N = 8 → 6 eșantioane, 60 ms), iar ieșirea ajunge la 100 % după exact N eșantioane.</li>
<li><b>Relația (2.7).</b> τ ≈ T<sub>s</sub>(1 − α)/α este o aproximație bună pentru α mic; constanta de timp exactă a filtrului discret este τ = −T<sub>s</sub>/ln(1 − α) (α = 0,5: 14,4 ms, nu 10 ms; α = 0,2: 44,8 ms; α = 0,05: 195 ms la T<sub>s</sub> = 10 ms). Pragul de 63 % este atins după ⌈ln 0,368/ln(1 − α)⌉ eșantioane. Pentru proiectare: α = T<sub>s</sub>/(τ + T<sub>s</sub>).</li>
<li><b>Reducerea zgomotului prin filtrul exponențial</b> nu este √N, ci √((2 − α)/α): α = 0,5 → 1,73; α = 0,2 → 3; α = 0,05 → 6,24. Un filtru exponențial cu α = 2/(N + 1) reduce zgomotul la fel ca media mobilă pe N eșantioane.</li>
<li><b>Zgomotul motorului</b> nu este pur alb: conține impulsuri (scântei la colector) și componente periodice; impulsurile izolate se elimină mai bine cu un filtru median. În simulator zgomotul este gaussian, cu abaterea standard individuală.</li></ul></div>
<h2>2.4. Modul de lucru (în simulator)</h2>
<ol><li>Divizoare: porniți simularea (orice schiță) și măsurați cu multimetrul tensiunile sursei (+12 V, +5 V) și ale nodurilor divizoarelor (Tabelul 2.1). Verificați că tensiunea pe PA2/PA3 nu depășește 3,3 V. Pentru a schimba un rezistor opriți simularea și dați clic pe el. Schița <i>stm32_divizor</i> afișează pe monitorul serial și codurile ADC.</li>
<li>Filtrul RC: CH1 pe intrarea filtrului, CH2 pe condensator; pentru 20, 100, 159, 500 și 2000 Hz (◀ ▶ la generator) înregistrați U<sub>in</sub> și U<sub>out</sub> vârf-vârf (Tabelul 2.2).</li>
<li>Aliasing: schița <i>stm32_esantionare</i> cu FS = 1000; comutatorul S1 pe GEN; la 100, 900 și 1100 Hz așezați cursoarele plotterului pe două maxime ale semnalului aparent (indicați numărul de perioade cuprinse) și înregistrați frecvența aparentă (Tabelul 2.3).</li>
<li>Comutați S1 pe RC și înregistrați amplitudinea eșantioanelor pentru aceleași frecvențe (ultima coloană a Tabelului 2.3).</li>
<li>Filtre numerice: schița <i>stm32_filtre</i> cu T<sub>s</sub> = 10 ms; porniți motorul (S2), așteptați cel puțin 6 s, apoi comutați treapta (S3) și, după încă 2 s, înregistrați σ și întârzierile. Repetați pentru (N, α) = (4; 0,5), (8; 0,2), (16; 0,05) – Tabelul 2.4.</li></ol>
<h2>2.7. Interpretarea rezultatelor</h2>
<ul><li>La f<sub>c</sub> atenuarea filtrului RC este −3 dB; peste f<sub>c</sub> scade cu ≈ 20 dB pe decadă.</li>
<li>Frecvența aparentă egală cu f<sub>a</sub> calculată confirmă aliasingul; un semnal cu alias nu poate fi corectat după eșantionare, ci doar prevenit prin filtrare analogică. Diferențele mici dintre f<sub>a</sub> măsurată și cea calculată provin din abaterea de frecvență a generatorului (la 900 Hz, 0,5 % din 900 Hz = 4,5 Hz se regăsesc integral în aliasul de 100 Hz).</li>
<li>Filtrele puternice (N mare, α mic) reduc zgomotul, dar întârzie semnalul: pentru reglare în buclă închisă (lucrarea 9) întârzierea contează mai mult decât netezimea.</li></ul>
<h2>2.8. Relevanță practică</h2>
<p>Alegerea frecvenței de eșantionare și a filtrelor este o decizie de proiectare în orice ECU: semnalele de detonație se eșantionează cu zeci de kHz, presiunea din colector sincron cu unghiul arborelui cotit, iar temperaturile la câțiva herți. Filtrele numerice și evaluarea lor sunt teme frecvente în lucrările de cercetare și de licență.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Divizor cu R<sub>1</sub> = 27 kΩ, R<sub>2</sub> = 10 kΩ la 12 V; filtru cu R = 10 kΩ, C = 100 nF; semnal de 900 Hz eșantionat cu 1 kHz; filtru exponențial cu α = 0,2 la T<sub>s</sub> = 10 ms:</p>
<div class="ec"><span>U<sub>out</sub> = 12·10/(27 + 10) = 3,24 V</span><span class="nr">(2.8)</span></div>
<div class="ec"><span>f<sub>c</sub> = 1/(2·π·10<sup>4</sup>·10<sup>−7</sup>) = 159 Hz</span><span class="nr">(2.9)</span></div>
<div class="ec"><span>f<sub>a</sub> = |900 − 1·1000| = 100 Hz</span><span class="nr">(2.10)</span></div>
<div class="ec"><span>τ ≈ 10·(1 − 0,2)/0,2 = 40 ms &nbsp; (exact: −10/ln 0,8 = 44,8 ms)</span><span class="nr">(2.11)</span></div>
<div class="ec"><span>media pe N = 8: σ redus de √8 = 2,8 ori</span><span class="nr">(2.12)</span></div>
<p>Atenuarea filtrului se calculează cu A = 20·lg(U<sub>out</sub>/U<sub>in</sub>) și se compară cu −10·lg(1 + (f/f<sub>c</sub>)<sup>2</sup>).</p>
<div class="problema"><h3>Problema 1</h3><p>La 500 Hz osciloscopul arată U<sub>in</sub> = 2,00 Vpp și U<sub>out</sub> = 0,62 Vpp. Calculați atenuarea și frecvența de tăiere reală.</p><details class="sol"><summary>Rezolvare</summary><p>A = 20·lg(0,62/2) = −10,17 dB; 10<sup>10,17/10</sup> = 10,4 → f<sub>c</sub> = 500/√(10,4 − 1) = 163 Hz (C ≈ 97,6 nF).</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Un semnal de 2300 Hz se eșantionează cu 1 kHz. Ce frecvență apare? Dar cu 2 kHz?</p><details class="sol"><summary>Rezolvare</summary><p>f<sub>s</sub> = 1 kHz: k = 2 → |2300 − 2000| = 300 Hz. f<sub>s</sub> = 2 kHz: k = 1 → |2300 − 2000| = 300 Hz (tot sub f<sub>s</sub>/2 = 1000 Hz).</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Proiectați divizorul pentru tensiunea bateriei (maximum 16 V) la intrarea de 3,3 V cu R<sub>2</sub> = 10 kΩ și calculați rezoluția în tensiunea bateriei (ADC 12 biți).</p><details class="sol"><summary>Rezolvare</summary><p>R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) ≤ 3,3/16 = 0,206 → R<sub>1</sub> ≥ 38,5 kΩ → 39 kΩ (raport 0,204, 16 V → 3,27 V). Rezoluția: 0,806 mV/0,204 = 3,95 mV pe tensiunea bateriei.</p></details></div>`;
}
const INTREBARI = [
  ["Ce rol are filtrul RC înaintea convertorului A/D?", "Atenuează componentele de frecvență mare (zgomot, perturbații) înainte de eșantionare, pentru ca ele să nu apară după eșantionare ca alias la frecvențe joase, unde nu mai pot fi separate de semnalul util; condensatorul servește și ca rezervor de sarcină pentru condensatorul de eșantionare al ADC."],
  ["La ce frecvență apare un semnal de 1,3 kHz eșantionat cu 1 kHz?", "k = 1: f<sub>a</sub> = |1300 − 1000| = 300 Hz."],
  ["De ce media mobilă întârzie semnalul?", "Ieșirea este media ultimelor N eșantioane, deci o variație nouă intră cu ponderea 1/N și este „diluată” de valorile vechi; ieșirea ajunge la valoarea finală abia după N eșantioane, iar centrul ferestrei este cu (N − 1)/2 eșantioane în urma momentului curent."],
  ["Calculați α pentru un filtru exponențial cu τ = 100 ms la T<sub>s</sub> = 5 ms.", "Din (2.7): α = T<sub>s</sub>/(τ + T<sub>s</sub>) = 5/105 = 0,0476 (exact: α = 1 − e<sup>−T<sub>s</sub>/τ</sup> = 0,0488)."],
  ["Proiectați un divizor pentru un semnal de 0…5 V la o intrare de 0…3,3 V.", "R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) ≤ 0,66; de exemplu R<sub>1</sub> = 10 kΩ, R<sub>2</sub> = 20 kΩ → 3,33 V la 5 V (la limită), sau mai sigur R<sub>1</sub> = 12 kΩ, R<sub>2</sub> = 20 kΩ → 3,13 V; cu rezistoare de 1 % și verificare cu multimetrul. La senzorii ratiometrici se folosește aceeași referință (5 V divizat) sau se măsoară și tensiunea de alimentare a senzorului."]
];
const TEST = [
  { q: "Frecvența de tăiere a filtrului RC cu R = 10 kΩ și C = 100 nF este:", o: ["15,9 Hz", "159 Hz", "1,59 kHz", "1 kHz"], c: 1, e: "1/(2π·10<sup>4</sup>·10<sup>−7</sup>)." },
  { q: "Un semnal de 1100 Hz eșantionat cu 1 kHz apare la:", o: ["1100 Hz", "900 Hz", "100 Hz", "0 Hz"], c: 2, e: "|1100 − 1000| = 100 Hz." },
  { q: "La frecvența de tăiere, atenuarea unui filtru RC de ordinul 1 este:", o: ["0 dB", "−3 dB", "−6 dB", "−20 dB"], c: 1, e: "|H| = 1/√2." },
  { q: "Media mobilă pe 16 eșantioane reduce abaterea standard a zgomotului alb de:", o: ["16 ori", "8 ori", "4 ori", "2 ori"], c: 2, e: "√16 = 4." },
  { q: "Cu R<sub>1</sub> = 27 kΩ și R<sub>2</sub> = 10 kΩ, la 14,5 V (motorul pornit) pe intrarea ADC ajung:", o: ["3,24 V", "3,92 V", "2,85 V", "14,5 V"], c: 1, e: "14,5·10/37 = 3,92 V &gt; 3,3 V – divizorul trebuie dimensionat pentru tensiunea maximă." },
  { q: "Ce filtru are cea mai mare întârziere la treaptă (T<sub>s</sub> = 10 ms)?", o: ["medie mobilă N = 16", "exponențial α = 0,5", "exponențial α = 0,05", "fără filtru"], c: 2, e: "α = 0,05: 63 % după 20 de eșantioane (200 ms); media N = 16 – după 11 (110 ms)." }
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
#tk-svg { width:100%; height:auto; aspect-ratio:1300/790; display:block; touch-action:none; user-select:none; font-family:system-ui,sans-serif; }
.tk-pin { fill:transparent; stroke:transparent; cursor:crosshair; } .tk-pin:hover, .tk-pin.aproape { fill:rgba(20,119,209,.35); stroke:#1477d1; stroke-width:1.2; }
.tk-comp { cursor:pointer; }
.tk-ajutor { margin:.3rem .6rem 0; font:11px system-ui,sans-serif; color:#888; pointer-events:none; }
.tk-insp { position:absolute; right:.6rem; top:.6rem; width:270px; background:#fff; border:1px solid #d8dde3; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.15); font:12.5px system-ui,sans-serif; color:#333; }
.tk-insp select { font:12px system-ui; }
.tk-insp-t { display:flex; justify-content:space-between; align-items:center; padding:.5rem .6rem; font-weight:700; border-bottom:1px solid #eee; } .tk-insp-t button { border:0; background:none; cursor:pointer; color:#777; }
.tk-insp-r { display:flex; justify-content:space-between; gap:.6rem; padding:.3rem .6rem; } .tk-insp-r span { color:#777; } .tk-insp-r b { font-weight:600; text-align:right; }
.tk-jos:has(.tk-cod[hidden]) { grid-template-columns:1fr; }
.tk-jos { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(0,1fr); border-top:1px solid #e3e3e3; }
.tk-cod { border-left:1px solid #e3e3e3; background:#fff; display:flex; flex-direction:column; min-width:0; }
.tk-cod[hidden] { display:none; }
.tk-cod-sus { display:flex; gap:.4rem; padding:.4rem .5rem; border-bottom:1px solid #eee; align-items:center; font:12px system-ui,sans-serif; color:#555; } .tk-cod-sus select { font:12px system-ui,sans-serif; padding:.2rem; border:1px solid #cfd4da; border-radius:4px; background:#fff; color:#222; max-width:100%; }
#tk-cod { margin:0; padding:.5rem .3rem; overflow:auto; background:#fff; color:#1f1f1f; font:11.5px/1.5 ui-monospace,Consolas,"Courier New",monospace; white-space:pre; max-height:260px; }
.cd-ln { display:inline-block; width:2.2em; color:#a8a8a8; text-align:right; margin-right:.8em; user-select:none; }
.cd-k { color:#0b62b5; font-weight:600; } .cd-s { color:#b2502b; } .cd-c { color:#6a8759; font-style:italic; } .cd-n { color:#7a3fb0; }
.cd-f { min-width:5.5ch; background:#fff8d6; color:#5b3d00; border:1px solid #e0b84a; border-radius:3px; font:inherit; padding:0 .2rem; } .cd-f:disabled { background:#f1f1f1; color:#777; border-color:#ccc; }
.tk-blocat { background:#fff4e5; color:#8a5300; font:12px system-ui,sans-serif; padding:.35rem .6rem; border-bottom:1px solid #f1d7a8; }
.tk-ser-bara { display:flex; gap:.4rem; padding:.35rem .5rem; border-top:1px solid #eee; } .tk-ser-bara button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.2rem .6rem; font:12px system-ui,sans-serif; cursor:pointer; color:#333; } .tk-ser-bara button.activ { background:#e8f1fb; border-color:#1477d1; }
#tk-serial { margin:0; flex:1 1 auto; min-height:90px; max-height:150px; overflow:auto; background:#fff; border-top:1px solid #eee; color:#222; padding:.4rem .6rem; font:12px/1.4 ui-monospace,Consolas,monospace; }
#tk-plotw { padding:.35rem .6rem .5rem; background:#fff; color:#333; font:11.5px system-ui,sans-serif; }
.plot-cap { display:flex; flex-wrap:wrap; gap:.3rem .8rem; align-items:center; margin-bottom:.3rem; } .plot-cap span { color:#777; } .plot-cap label { margin-left:auto; white-space:nowrap; display:inline-flex; gap:.3rem; align-items:center; }
#tk-plot { width:100%; display:block; cursor:ew-resize; touch-action:none; border:1px solid #e3e3e3; }
#plot-cit { margin:.3rem 0 0; min-height:2.6em; }
.fw { font-size:.8rem; } .fw b { font-family:ui-monospace,monospace; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; }
.fig-svg { width:100%; max-width:680px; height:auto; color:var(--text); }
#osc-cit { margin:.15rem .6rem .3rem; font:12px ui-monospace,Consolas,monospace; color:#555; min-height:1.2em; }
.tk-pas-banda { position:absolute; left:.6rem; bottom:.5rem; max-width:min(520px,60%); background:rgba(20,119,209,.93); color:#fff; border-radius:6px; padding:.4rem .6rem; font:12.5px/1.35 system-ui,sans-serif; box-shadow:0 3px 10px rgba(0,0,0,.2); pointer-events:none; }
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
.sim-grila:fullscreen .sim-scena.tk, .sim-grila.ecran-plin .sim-scena.tk { display:block; }
.sim-grila:fullscreen #tk-svg, .sim-grila.ecran-plin #tk-svg { height:calc(100vh - 21rem); min-height:320px; aspect-ratio:auto; }
@media (max-width:900px){ .tk-jos { grid-template-columns:1fr; } .tk-cod { border-left:0; border-top:1px solid #e3e3e3; } .tk-pas-banda { position:static; max-width:none; border-radius:0; } }
</style>`;
Cadru.porneste({
  disc: "MAM1", nr: 2, cod: "mam1-l2",
  titlu: "Condiționarea semnalelor și conversia analog-digitală",
  scurt: "Condiționarea semnalelor și ADC",
  subtitlu: "Laborator virtual – divizoare, filtru RC, aliasing și filtre numerice pe STM32F103, osciloscop, multimetru și plotter serial",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261012); },
  date: [{ k: "fs", et: "f<sub>s</sub> (Tabelul 2.3) [Hz]", v: 1000, fix: true }, { k: "Ts", et: "T<sub>s</sub> (Tabelul 2.4) [ms]", v: 10, fix: true }, { k: "R", et: "R filtru [kΩ]", v: 10, fix: true }, { k: "C", et: "C filtru [nF]", v: 100, fix: true }],
  tabele: [
    { id: "t21", titlu: "Tabelul 2.1. Divizorul de tensiune", antetRand: "Divizor", nota: "U<sub>out</sub> calculat = U<sub>in</sub>·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) cu U<sub>in</sub> măsurat; abaterea = (U<sub>out</sub> măsurat − calculat)/calculat.",
      randuri: [{ k: "d12", et: "12 V → PA2" }, { k: "d5", et: "5 V → PA3" }],
      coloane: [{ k: "R1", t: "R<sub>1</sub> [kΩ]", intrare: true }, { k: "R2", t: "R<sub>2</sub> [kΩ]", intrare: true }, { k: "Uin", t: "U<sub>in</sub> [V]", intrare: true }, { k: "Uc", t: "U<sub>out</sub> calculat [V]" }, { k: "Um", t: "U<sub>out</sub> măsurat [V]", intrare: true }, { k: "ab", t: "Abatere [%]" }] },
    { id: "t22", titlu: "Tabelul 2.2. Filtrul RC (R = 10 kΩ, C = 100 nF)", antetRand: "f [Hz]", nota: "A = 20·lg(U<sub>out</sub>/U<sub>in</sub>); A calculat = −10·lg(1 + (f/f<sub>c</sub>)<sup>2</sup>) cu f<sub>c</sub> = 159,2 Hz (nominal).",
      randuri: MD.FREC.map(f => ({ k: "f" + f, et: String(f) })),
      coloane: [{ k: "Uin", t: "U<sub>in</sub> [Vpp]", intrare: true }, { k: "Uout", t: "U<sub>out</sub> [Vpp]", intrare: true }, { k: "A", t: "A [dB]" }, { k: "Ac", t: "A calculat [dB]" }] },
    { id: "t23", titlu: "Tabelul 2.3. Aliasing (f<sub>s</sub> = 1 kHz)", antetRand: "f semnal [Hz]",
      randuri: MD.FAL.map(f => ({ k: "f" + f, et: String(f) })),
      coloane: [{ k: "fap", t: "f aparentă măsurată [Hz]", intrare: true }, { k: "fac", t: "f<sub>a</sub> calculată [Hz]" }, { k: "amp", t: "Cu filtru RC: amplitudine (vârf-vârf) [V]", intrare: true }] },
    { id: "t24", titlu: "Tabelul 2.4. Filtre numerice (T<sub>s</sub> = 10 ms)", antetRand: "Filtru", nota: "Întârzierea teoretică = numărul de eșantioane până la 63 % din treaptă × T<sub>s</sub>.",
      randuri: [{ k: "raw", et: "fără filtru" }, { k: "m4", et: "medie mobilă N = 4" }, { k: "m8", et: "medie mobilă N = 8" }, { k: "m16", et: "medie mobilă N = 16" }, { k: "e50", et: "exponențial α = 0,5" }, { k: "e20", et: "exponențial α = 0,2" }, { k: "e05", et: "exponențial α = 0,05" }],
      coloane: [{ k: "sig", t: "σ [LSB]", intrare: true }, { k: "red", t: "Reducere σ [ori]" }, { k: "del", t: "Întârziere la treaptă (63 %) [ms]", intrare: true }, { k: "delc", t: "Întârziere teoretică [ms]" }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaMAM2,
  intrebari(D, R, Pp) {
    const f2 = Pp && Pp.fq2 ? Pp.fq2 : 1300, tau = Pp && Pp.tau ? Pp.tau : 100;
    return [
      { id: "q1", u: "Hz", text: "Frecvența de tăiere reală a filtrului RC de pe standul vostru, determinată din atenuările măsurate în Tabelul 2.2:", textSimplu: "Frecvența de tăiere reală" },
      { id: "q2", u: "Hz", text: `La ce frecvență apare un semnal de ${fmt(f2, 0)} Hz eșantionat cu 1 kHz?`, textSimplu: "Frecvența aparentă (alias)" },
      { id: "q3", u: "", text: `Coeficientul α al filtrului exponențial pentru τ = ${tau} ms la T<sub>s</sub> = 5 ms (relația 2.7, α = T<sub>s</sub>/(τ + T<sub>s</sub>)):`, textSimplu: "Coeficientul α" },
      { id: "q4", u: "LSB", text: "Abaterea standard a zgomotului fără filtru (Tabelul 2.4):", textSimplu: "Abaterea standard a zgomotului" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    ["d12", "d5"].forEach(k => { if (t.t21[k].Uin === "" || t.t21[k].Um === "") l.push(`Tabelul 2.1: divizorul ${k === "d12" ? "12 V" : "5 V"}`); });
    const a = MD.FREC.filter(f => t.t22["f" + f].Uout !== "").length; if (a < 5) l.push(`Tabelul 2.2: ${a}/5 frecvențe`);
    const b = MD.FAL.filter(f => t.t23["f" + f].fap !== "").length; if (b < 3) l.push(`Tabelul 2.3: ${b}/3 frecvențe aparente`);
    const c = MD.FAL.filter(f => t.t23["f" + f].amp !== "").length; if (c < 3) l.push(`Tabelul 2.3: ${c}/3 amplitudini cu filtrul RC`);
    const d = Object.keys(MD.FILTRE).filter(k => t.t24[k].sig !== "").length; if (d < 7) l.push(`Tabelul 2.4: ${d}/7 filtre`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t21.d12, { R1: "27", R2: "10", Uin: "12.000", Um: "3.240" }); Object.assign(t.t22.f159, { Uin: "2.000", Uout: "1.414" }); Object.assign(t.t23.f900, { fap: "100.0" }); },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul de lucru la scară reală: sursa dublă cu generatorul de funcții așezat deasupra, osciloscopul, multimetrul, placa de test cu divizoarele de 12 V și 5 V, filtrul RC, comutatorul S1 al intrării PA0, potențiometrul pe PA1 cu motorul de c.c. lângă cablu (sursa de zgomot) și comutatoarele S2, S3, STM32 „Blue Pill” cu ST-Link V2 și laptopul cu programul. Montajul urmărește simulatorul (comutatoarele, potențiometrul, motorul, ecranele, sondele). Rotiți, apropiați sau depărtați vederea.</p>`,
    modul: "montaj3d.js?v=1", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, 0, 1300, 790], construieste: L => montaj3dL2(L), cam: [0.0, 0.6, 0.86], tinta: [0.0, 0.03, -0.01],
      vederi: { tot: [[0.0, 0.6, 0.86], [0.0, 0.03, -0.01], "Ansamblu"], placa: [[-0.04, 0.15, 0.28], [-0.04, 0.0, 0.12], "Placa de test"], stm: [[0.22, 0.14, 0.28], [0.2, 0.0, 0.12], "Blue Pill"], aparate: [[-0.25, 0.33, 0.4], [-0.25, 0.1, -0.2], "Aparatele"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Condiționarea semnalelor în calculatorul motorului",
    intro: `<p>Calculatorul motorului citește senzorii ca în lucrare: MAP-ul (analogic, filtrat RC la intrare și eșantionat sincron cu unghiul arborelui cotit), senzorul de detonație (eșantionat cu zeci de kHz, filtrat trece-bandă), temperaturile (câțiva herți, filtrate puternic). Porniți motorul și comparați pe osciloscop MAP-ul (CH1) cu semnalul CKP (CH2), apoi alegeți și senzorul de detonație.</p>`,
    dupa: `<p class="nota">Semnalele sunt tipice; machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "map", canale: ["ckp"] })
  },
  referat: {
    scop: "Studiul lanțului senzor – condiționare – ADC – prelucrare numerică: divizoare, filtrul RC, aliasingul și filtrele numerice (medie mobilă, exponențial).",
    relatii: "U<sub>out</sub> = U<sub>in</sub>·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>); &nbsp; f<sub>c</sub> = 1/(2πRC); &nbsp; f<sub>a</sub> = |f − k·f<sub>s</sub>|; &nbsp; y<sub>k</sub> = α·x<sub>k</sub> + (1 − α)·y<sub>k−1</sub>; &nbsp; τ ≈ T<sub>s</sub>(1 − α)/α.",
    varianta: () => "Standul cu componentele proprii fiecărui student: tensiunile sursei, toleranțele rezistoarelor și condensatorului, abaterea de frecvență a generatorului, zgomotul cuplat de motor.",
    indicatii: "Comentați abaterile divizoarelor (toleranțe), frecvența de tăiere reală, frecvențele aparente față de cele calculate, eficiența filtrului RC ca anti-aliasing, compromisul zgomot – întârziere al filtrelor numerice…"
  },
  subsol: "Modelul: STM32F103 cu ADC de 12 biți referit la VDDA, filtru RC de ordinul 1 (R ±1 %, C ±10 %), divizoare cu rezistoare de 1 %, generator sinusoidal 2 Vpp + 1,65 V cu abatere de frecvență, zgomot gaussian cuplat de motor. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      ${ghidSectiune()}
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Circuite</b> · Stand MAM I – Lucrarea 2</span>
        <button type="button" id="tk-fit" title="Încadrează tot">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div>
        <div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <p class="tk-ajutor">Rotița = zoom · tragere pe fundal = deplasare · trageți sondele (V, 1, 2) pe pini · clic pe comutatoare (S1, S2, S3) · clic pe un rezistor = valoarea · ◀ ▶ frecvența generatorului</p>
      <p class="nota" id="osc-cit"></p>
      <div class="tk-jos">
        <div id="tk-plotw"><div class="plot-cap"><b>Plotter serial</b> <span>clic sau tragere pe grafic = cursoarele A și B</span>
          <label>Perioade între cursoare <select id="plot-per">${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select></label></div>
          <canvas id="tk-plot" aria-label="Plotterul serial"></canvas><p id="plot-cit"></p></div>
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – STM32 Blue Pill</b><label style="margin-left:auto">Schiță <select id="tk-sk"></select></label></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
          <div class="tk-ser-bara"><b>Monitor serial</b></div>
          <pre id="tk-serial"></pre>
        </div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Programul și mesajele</h2>
      <p class="fw">Program încărcat: <b id="fw-stm">—</b></p>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Valorile intră în tabele numai din aparate, cu simularea pornită. „Arată pe planșă” mărește zona de lucru și marchează punctele de măsură.</p>
    </aside>
  </div>`,
    init(C) {
      legaPlansa(); desenSonde(); afiseazaCod(); actualizeazaFw(); genAfis(); legaPlotter(); arataMonitor("plot");
      $("#tk-sk").addEventListener("change", e => { sim.sketch = e.target.value; afiseazaCod(); });
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => seteazaVB(VB0.slice()));
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      deseneazaOsc(); citesteDMM();
      C.mesaj("Porniți simularea și măsurați cu multimetrul +12 V, +5 V și nodurile divizoarelor (Tabelul 2.1).", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.serial = []; },
    cadru(dt, C, vizibil) {
      const acum = performance.now();
      if (sim.run) pasProgram(Math.min(dt, 0.1));
      if (acum - sim.tSer > 100) linieSerial();
      if (!vizibil) return;
      if (sim.run && sim.osc.ruleaza && acum - sim.osc.tAcq > 160) { sim.osc.tAcq = acum; achizitie(); deseneazaOsc(); }
      if (acum - sim.dmm.tA > 330) { sim.dmm.tA = acum; citesteDMM(); }
      if (acum - (this._tp || 0) > 120) { this._tp = acum; deseneazaPlotter(); }
      $("#ledTX").setAttribute("fill", sim.run && acum - sim.tx < 60 ? "#ffd04a" : "#5a4a1a");
      if (sim.motor && sim.run) $("#motorAx").setAttribute("transform", `rotate(${(acum * 1.2) % 360} ${BX + 480} ${BY + 230})`);
      if (acum - (this._ts || 0) > 300) {
        this._ts = acum; avertizari(); actualizeazaPasi();
        if (sim.run) { const t = Math.floor((acum - sim.t0) / 1000); $("#tk-timp").textContent = `Timp de simulare: ${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; }
        C.stare(1, sim.run ? "simulare pornită" : "simulare oprită", sim.run ? "inc" : ""); C.stare(2, sim.run && sim.fw ? `STM32: ${PROG[sim.fw.prog].titlu}` : "");
      }
    },
    redeseneaza() { deseneazaOsc(); deseneazaPlotter(); },
    formule() {
      const f = fGen(), r = [["Filtrul RC (2.2)", `f<sub>c</sub> = 1/(2π·10<sup>4</sup>·10<sup>−7</sup>) = 159,2 Hz; la ${f} Hz: A = −10·lg(1 + (${f}/159,2)<sup>2</sup>) = <span class="rez">${fx(-10 * Math.log10(1 + (f / 159.15) ** 2), 2)} dB</span>`],
        ["Aliasing (2.4), f<sub>s</sub> = 1 kHz", `f<sub>a</sub> = |${f} − ${Math.round(f / 1000)}·1000| = <span class="rez">${MD.alias(f, 1000)} Hz</span>`],
        ["Divizoarele (2.1), nominal", `12·${sim.R.R2a}/(${sim.R.R1a} + ${sim.R.R2a}) = <span class="rez">${fx(12 * sim.R.R2a / (sim.R.R1a + sim.R.R2a), 3)} V</span>; 5·${sim.R.R2b}/(${sim.R.R1b} + ${sim.R.R2b}) = <span class="rez">${fx(5 * sim.R.R2b / (sim.R.R1b + sim.R.R2b), 3)} V</span>`]];
      const fw = sim.fw; if (fw && fw.prog === "stm_filtre") r.push(["Filtrele numerice (2.5–2.7)", `σ: medie N = ${fw.N} → ÷${fx(Math.sqrt(fw.N), 2)}; exponențial α = ${String(fw.a).replace(".", ",")} → ÷${fx(Math.sqrt((2 - fw.a) / fw.a), 2)}; τ ≈ ${fx(fw.Ts * (1 - fw.a) / fw.a, 1)} ms`]);
      return r;
    }
  }
});

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL2(L) {
  const { V3, mm } = L, R = 0xe53935, N = 0x222222;
  const PS = L.sursaDubla([-0.45, 0, -0.17], { ecrane: [[56, 46, 120, 44], [190, 46, 120, 44]], roty: 0.15 }), G = L.generator([-0.45, 0.142, -0.17], { ecran: [56, 231, 186, 64], roty: 0.15 });
  const O = L.osciloscop([-0.12, 0, -0.21], { ecran: [406, 56, 404, 246] }), DM = L.multimetru([0.15, 0, -0.2], { ecran: [888, 58, 132, 54], cul: 0x3b3f45, et: "Multimetru digital (V⎓)" });
  const PC = L.laptop([0.43, 0, -0.17], { roty: -0.35, cod: () => L.textCod(), titlu: () => `Arduino IDE – ${(PROG[sim.sketch] || {}).titlu || ""}.ino` });
  const BB = L.placaTest([-0.04, 0, 0.13]), BS = L.placaTest([0.2, 0, 0.13], { coloane: 30, et: "Placa de test a plăcii STM32" });
  const BP = L.bluePill(BS, 6), SL = L.stLink([0.235, 0, 0.0]);
  const g = (c, r) => BB.gaura(c, r), s = (c, r) => BS.gaura(c, r);
  // sursa: +12 V, +5 V, GND
  L.cablu(PS.borne[0], g(3, "j"), R, { burta: 0.1, dupontB: true }); L.cablu(PS.borne[1], g(15, "j"), 0xff7043, { burta: 0.12, dupontB: true }); L.cablu(PS.borne[2], g(1, "-s"), N, { burta: 0.14, dupontB: true });
  L.fir(g(15, "i"), g(12, "+s"), 0xff7043);
  // divizorul de 12 V (PA2) și cel de 5 V (PA3)
  L.rezistor(g(3, "h"), g(7, "h"), sim.R.R1a * 1000, { et: `R1 = ${sim.R.R1a} kΩ (divizorul de 12 V)` }); L.rezistor(g(7, "g"), g(11, "g"), sim.R.R2a * 1000, { et: `R2 = ${sim.R.R2a} kΩ (divizorul de 12 V)` }); L.fir(g(11, "j"), g(9, "-s"), N);
  L.rezistor(g(15, "h"), g(19, "h"), sim.R.R1b * 1000, { et: `R1 = ${sim.R.R1b} kΩ (divizorul de 5 V)` }); L.rezistor(g(19, "g"), g(23, "g"), sim.R.R2b * 1000, { et: `R2 = ${sim.R.R2b} kΩ (divizorul de 5 V)` }); L.fir(g(23, "j"), g(19, "-s"), N);
  // generatorul → filtrul RC (R 10 kΩ, C 100 nF)
  L.cablu(G.iesire, g(30, "j"), 0x2fa84f, { burta: 0.16, crocodil: true }); L.cablu(G.iesire.clone().add(V3(mm(12), 0, 0)), g(24, "-s"), N, { burta: 0.18, crocodil: true });
  L.rezistor(g(30, "h"), g(34, "h"), 10000, { et: "R = 10 kΩ (filtrul RC)" }); L.condCeramic(g(34, "g"), g(36, "g"), { et: "C = 100 nF (filtrul RC), f_c ≈ 159 Hz" }); L.fir(g(36, "j"), g(29, "-s"), N);
  // comutatorul S1: GEN / RC → PA0
  const s1 = L.comutator(g(40, "c"), g(42, "c"), { et: "S1: intrarea PA0 (GEN ↔ RC)" }); L.fir(g(30, "f"), g(40, "a"), 0x2fa84f); L.fir(g(34, "f"), g(42, "a"), 0x8e24aa);
  // potențiometrul (PA1), motorul și comutatoarele S2, S3
  const pot = L.potentiometru(g(47, "b"), g(51, "b"), { et: "Potențiometru 10 kΩ – cursorul la PA1" }); L.fir(g(47, "e"), g(45, "+j"), R); L.fir(g(51, "e"), g(46, "-j"), N);
  const s2 = L.comutator(g(54, "c"), g(56, "c"), { et: "S2: motorul (oprit / pornit)" }), s3 = L.comutator(g(60, "c"), g(62, "c"), { et: "S3: treapta de +1 V pe PA1" });
  L.fir(g(54, "e"), g(48, "+s"), 0xff7043); const MO = L.motorCC([0.06, 0, 0.245], { roty: Math.PI }); L.fir(g(56, "a"), MO.borne[0], R, { h: 10 }); L.fir(g(55, "-j"), MO.borne[1], N, { h: 10 });
  L.fir(g(60, "a"), g(58, "+j"), R); L.rezistor(g(61, "d"), g(57, "d"), 22000, { et: "Rezistorul treptei (S3)" }); L.fir(g(57, "a"), g(49, "a"), 0xef6c00);
  // STM32: alimentarea, intrările PA0…PA3, ST-Link
  L.fir(BP.pin("3V3"), s(20, "+j"), R); L.fir(BP.pin("GND"), s(21, "-j"), N); L.fir(s(1, "+j"), g(59, "+j"), R); L.fir(s(2, "-j"), g(60, "-j"), N); L.fir(g(61, "-j"), g(61, "-s"), N);
  L.fir(g(41, "e"), BP.pin("PA0"), 0xf2c230); L.fir(g(49, "c"), BP.pin("PA1"), 0xef6c00, { prin: [V3(0.09, mm(18), 0.215)] }); L.fir(g(7, "j"), BP.pin("PA2"), 0x00acc1); L.fir(g(19, "j"), BP.pin("PA3"), 0x26a69a);
  [["3V3", R, 3], ["SWDIO", 0x6a1b9a, 1], ["SWCLK", 0x00897b, 0], ["GND", N, 2]].forEach(([n, c, i]) => L.fir(BP.swd(n), SL.pin(i), c, { h: 14 }));
  L.cabluUSB(V3(0.235 - 0.032, 0.0045, 0.0), PC.usb);
  // masele aparatelor și sondele mobile
  L.cablu(DM.com, g(52, "-s"), N, { burta: 0.05 }); O.ch.forEach((p, i) => L.cablu(p.clone().add(V3(0, mm(-8), 0)), g(40 + i * 2, "-s"), N, { r: 0.8, burta: 0.04, crocodil: true }));
  const P3 = { v12: PS.borne[0], v5: PS.borne[1], gndP: PS.borne[2], genO: G.iesire, div12: g(7, "i"), div5: g(19, "i"), genBB: g(30, "i"), rc: g(34, "i"), sw0o: g(41, "d"), pa1n: g(49, "d"), gndBB: g(40, "-j"),
    PA0: BP.pin("PA0", "b"), PA1: BP.pin("PA1", "b"), PA2: BP.pin("PA2", "b"), PA3: BP.pin("PA3", "b"), v33: BP.pin("3V3", "b"), gndS: s(10, "-j") };
  const sd = [L.sonda(O.ch[0], 0xf2d600, V3(-0.08, 0.003, -0.02), { osc: true, et: "Sonda CH1 a osciloscopului" }), L.sonda(O.ch[1], 0x1fb6ff, V3(-0.05, 0.003, 0.0), { osc: true, et: "Sonda CH2 a osciloscopului" }), L.sonda(DM.v, 0xd32f2f, V3(0.12, 0.003, -0.05), { et: "Sonda V a multimetrului" })];
  return { actualizeaza() {
    pot.set(sim.alfa); s1.set(sim.sw0 === "gen"); s2.set(!sim.motor); s3.set(!sim.step); MO.set(sim.motor); G.set(sim.gen);
    BP.led(sim.run ? 0.6 : 0);
    sd[0].muta(P3[sim.osc.ch[0].s] || null); sd[1].muta(P3[sim.osc.ch[1].s] || null); sd[2].muta(P3[sim.dmm.s] || null);
  } };
}
