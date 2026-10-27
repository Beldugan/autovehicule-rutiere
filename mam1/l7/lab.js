/* MAM I – Lucrarea 7. Senzori ultrasonici de parcare: timpul de propagare și compensarea cu temperatura.
   Simulatorul în stilul Tinkercad: rigla de 2 m cu ținta pe cărucior (lemn, carton, metal, burete; 0°, 30°, 60°), modulele HC-SR04 și
   JSN-SR04T, DS18B20 în aerul de pe traseu, aeroterma (acționată de cadrul didactic), Arduino Mega cu OLED, buzzerul și LED-urile zonelor,
   osciloscopul pe TRIG / ECHO, programul cu pulseIn, monitorul serial și plotterul. Pașii lucrării sunt afișați la vedere, cu verificări
   automate; valorile intră în tabele numai din aparate și din program. */
"use strict";
const MD = MODELE["mam1-l7"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, tS: 0, d: 50, tinta: "lemn", unghi: 0, aero: false, Tp: null, Tds: null, vol: "mare", viteza: 1,
  camp: { COMP: "true", Z1: "100", Z2: "50", Z3: "25" }, fw: null, pr: null, serial: [], tx: 0, ping: { hc: -9, jsn: -9 },
  osc: { ch: [{ s: "nc" }, { s: "nc" }], tdiv: 0.001, ruleaza: true, acq: null }, ist: [], esecJ: {}, buz: false
};
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const TDIV = [0.0002, 0.0005, 0.001, 0.002, 0.005];
const TPING = 0.06, TFER = 0.5, ECHO_RISE = { hc: 0.00046, jsn: 0.00062 };
const tintaStd = () => sim.tinta !== "burete" && sim.unghi === 0;
const tDS = () => Math.round(sim.Tds / 0.0625) * 0.0625;
let SV3 = null;
function initTemp() { if (sim.Tp === null && P()) { sim.Tp = P().Taer; sim.Tds = P().Taer + P().eDS; } }

/* ------------------------------------------------------------------ aerul: aeroterma și DS18B20 */
function pasTermic(dt) {
  initTemp(); const p = P(), d = dt * sim.viteza, tinta = sim.aero ? p.Tcald : p.Taer, tau = sim.aero ? 15 : 40;
  sim.Tp += (tinta - sim.Tp) * (1 - Math.exp(-d / tau));
  sim.Tds += (sim.Tp + p.eDS - sim.Tds) * (1 - Math.exp(-d / 8));
}

/* ------------------------------------------------------------------ programul (pulseIn, media pe 0,5 s, zonele) */
const cheieScena = () => [sim.d, sim.tinta, sim.unghi].join();
function pornesteProgram() {
  sim.pr = { tPing: 0, m: 0, acc: { hc: [], jsn: [] }, tL: sim.tS, last: null, cheie: cheieScena(), ult: { hc: null, jsn: null }, hits: [], nWin: 0 };
  seriala(`parcare_us | HC-SR04 TRIG D30 / ECHO D31 · JSN-SR04T TRIG D32 / ECHO D33 · DS18B20 D22 | COMP = ${sim.fw.comp} | zone ${sim.fw.z.join(" / ")} cm`);
}
function pasProgram(dt) {
  const pr = sim.pr; if (!pr) return; const p = P();
  if (cheieScena() !== pr.cheie) { pr.cheie = cheieScena(); pr.acc = { hc: [], jsn: [] }; pr.tL = sim.tS; pr.hits = []; pr.nWin = 0; }
  pr.tPing += dt;
  while (pr.tPing >= TPING) {
    pr.tPing -= TPING; const m = pr.m ? "jsn" : "hc"; pr.m ^= 1;
    const t = MD.masura(p, m, sim.tinta, sim.unghi, sim.d, sim.Tp, Math.random, gauss);
    pr.acc[m].push(t); pr.ult[m] = { t, tS: sim.tS, d: sim.d }; sim.ping[m] = sim.tS;
    if (m === "hc") { const dd = MD.dDin(t, 20); pr.hits.push(t > 0 && Math.abs(dd - sim.d) < 6); if (pr.hits.length > 16) pr.hits.shift(); }
  }
  if (sim.tS - pr.tL >= TFER) {
    pr.tL = sim.tS; pr.nWin++;
    const T = tDS(), Tc = sim.fw.comp ? T : 20, med = a => { const v = a.filter(x => x > 0); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0; };
    const tH = med(pr.acc.hc), tJ = med(pr.acc.jsn); pr.acc = { hc: [], jsn: [] };
    const L = { tH, tJ, T, Tc, d: sim.d, Tp: sim.Tp, d0H: tH ? MD.dDin(tH, 20) : NaN, dcH: tH ? MD.dDin(tH, T) : NaN, d0J: tJ ? MD.dDin(tJ, 20) : NaN, dcJ: tJ ? MD.dDin(tJ, T) : NaN };
    L.dH = tH ? MD.dDin(tH, Tc) : NaN; L.dJ = tJ ? MD.dDin(tJ, Tc) : NaN; L.zona = MD.zona(L.dH, sim.fw.z); L.nWin = pr.nWin;
    pr.last = L;
    if (sim.tinta === "lemn" && sim.unghi === 0 && sim.d <= 40 && pr.nWin >= 2) sim.esecJ[sim.d] = !(Math.abs(L.dJ - sim.d) < 1.5);
    const f = (v, n) => Number.isFinite(v) ? v.toFixed(n) : "—";
    seriala(`HC ${f(L.dH, 2).padStart(6)} cm (t ${tH ? tH.toFixed(1) : "—"} µs) | JSN ${f(L.dJ, 2).padStart(6)} cm | T ${T.toFixed(2)} °C | d20 ${f(L.d0H, 2)} / dT ${f(L.dcH, 2)} | ${L.zona}`);
    sim.ist.push({ t: sim.tS, h: L.dH, j: L.dJ }); if (sim.ist.length > 400) sim.ist.shift();
  }
}
function detectie() { const h = sim.pr ? sim.pr.hits : []; if (h.length < 16) return null; const f = h.filter(Boolean).length / h.length; return f > 0.9 ? "da" : f < 0.1 ? "nu" : "intermitent"; }
function comanda(txt) {
  const s = String(txt).trim().toLowerCase(); if (!s) return; seriala("> " + s);
  if (!sim.run) return seriala("(programul nu rulează)");
  if (s === "t") seriala(`DS18B20: ${tDS().toFixed(4)} °C`); else seriala("comenzi: t = citește temperatura");
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 300) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-120).join("\n"); el.scrollTop = el.scrollHeight; }
/** buzzerul și LED-urile zonelor (comandate de program) */
function zonaCur() { return sim.run && sim.pr && sim.pr.last ? sim.pr.last.zona : "—"; }
function pasBuzzer() {
  const z = zonaCur(), per = { "ton rar": 0.5, "ton des": 0.2 }[z];
  sim.buz = z === "continuu" ? true : per ? (sim.tS % per) < 0.06 : false;
}
const LEDZ = { liber: "verde", "ton rar": "galben", "ton des": "roșu", continuu: "roșu" };

/* ------------------------------------------------------------------ osciloscopul (TRIG și ECHO) */
const PUNCTE = { nc: "neconectat", trigH: "D30 – TRIG HC-SR04", echoH: "D31 – ECHO HC-SR04", trigJ: "D32 – TRIG JSN-SR04T", echoJ: "D33 – ECHO JSN-SR04T" };
const MODP = { trigH: "hc", echoH: "hc", trigJ: "jsn", echoJ: "jsn" };
function achizitie() {
  const o = sim.osc, s1 = o.ch[0].s, s2 = o.ch[1].s, m = MODP[s2] || MODP[s1];
  if (!m || !sim.pr || !sim.pr.ult[m]) { o.acq = { tr: null }; return; }
  const u = sim.pr.ult[m], W = o.tdiv * 10, t0 = -o.tdiv, X = t => (t - t0) / W;
  const r = ECHO_RISE[m], tE = u.t * 1e-6, f = u.t > 0 ? r + tE : r + 0.038;
  const puls = (a, b) => [[0, 0], [X(a), 0], [X(a), 5], [X(b), 5], [X(b), 0], [1, 0]].map(([x, v]) => [Math.max(0, Math.min(1, x)), v]);
  const pts = [s1 !== "nc" && MODP[s1] === m ? puls(0, 10e-6) : s1 !== "nc" ? [[0, 0], [1, 0]] : [], s2 !== "nc" && MODP[s2] === m ? puls(r, f) : s2 !== "nc" ? [[0, 0], [1, 0]] : []];
  const ms = {}; ms.f = 1 / (2 * TPING);
  if (s2 !== "nc" && MODP[s2] === m && u.t > 0 && f < t0 + W) ms.w = u.t;
  o.acq = { tr: 0, m: ms, pts, mod: m, Tp: sim.Tp };
}
function oscAfis() {
  const g = $("#osc-tr"); if (!g) return;
  const o = sim.osc, a = o.acq, X0 = 46, Y0 = 476, W = 404, H = 248, cul = ["#f2d600", "#1fb6ff"];
  const y = (c, v) => Y0 + H / 2 - (v / 2 + (c === 0 ? 1 : -3)) * (H / 8);
  let s = "";
  if (a && a.tr !== null) a.pts.forEach((pts, c) => { if (!pts.length) return; s += `<polyline fill="none" stroke="${cul[c]}" stroke-width="1.8" points="${pts.map(([u, v]) => `${(X0 + u * W).toFixed(1)},${y(c, v).toFixed(1)}`).join(" ")}"/>`; });
  else s += `<text x="${X0 + W / 2}" y="${Y0 + H / 2}" fill="#9aa" font-size="13" text-anchor="middle">${sim.run ? "conectați sondele pe TRIG / ECHO" : "fără semnal"}</text>`;
  s += `<text x="${X0 + W * 0.1 - 3}" y="${Y0 - 4}" fill="#ff9800" font-size="11">▼</text>`;
  g.innerHTML = s;
  const m = a && a.m ? a.m : {};
  $("#osc-h").textContent = `CH1 2V ${o.ch[0].s === "nc" ? "—" : PUNCTE[o.ch[0].s].split(" ")[0]}  CH2 2V ${o.ch[1].s === "nc" ? "—" : PUNCTE[o.ch[1].s].split(" ")[0]}  ${fmtT(o.tdiv)}/div  Trig ↑ ${o.ruleaza ? "RUN" : "STOP"}`;
  $("#osc-m").textContent = a && a.tr !== null ? `CH2 +Width ${Number.isFinite(m.w) ? (m.w / 1000).toFixed(3) + " ms" : "----"}   Freq ${m.f ? m.f.toFixed(2) + " Hz" : "--"}` : "";
}
const fmtT = s => s >= 1e-3 ? `${+(s * 1000).toFixed(3)} ms` : `${+(s * 1e6).toFixed(1)} µs`;

/* ------------------------------------------------------------------ comenzile standului */
function mutaTinta(d) {
  if (!Number.isFinite(d)) return; d = Math.max(3, Math.min(220, Math.round(d))); sim.d = d; actualizeaza();
}
function seteazaTinta(t) { sim.tinta = t; actualizeaza(); }
function seteazaUnghi(u) { sim.unghi = u; actualizeaza(); }
function comutaAero() {
  sim.aero = !sim.aero; Cadru.mesajTemporar(sim.aero ? "NSSM: aeroterma este pornită de cadrul didactic, departe de materiale inflamabile și neîndreptată spre persoane. Aerul de pe traseul ultrasunetelor se încălzește; urmăriți DS18B20." : "Aeroterma oprită: aerul revine la temperatura camerei.", sim.aero ? "atentie" : ""); actualizeaza();
}
function comutaVol() { sim.vol = sim.vol === "mic" ? "mare" : "mic"; actualizeaza(); }

/* ------------------------------------------------------------------ planșa în stilul Tinkercad */
const XR = d => 160 + d * 5, YH = 86, YJ = 156;
const TP7 = { trigH: [1205, 336], echoH: [1205, 360], trigJ: [1205, 384], echoJ: [1205, 408] };
function planseSVG() {
  const W = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
  let s = `<svg id="tk-svg" viewBox="0 -14 1300 814" role="img" aria-label="Planșa: rigla cu ținta pe cărucior, modulele HC-SR04 și JSN-SR04T, DS18B20, aeroterma, placa de test cu LED-urile zonelor și buzzerul, Arduino Mega cu OLED și osciloscopul">
<defs><filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter>
 <linearGradient id="gAlu7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7eb"/><stop offset="1" stop-color="#9aa2aa"/></linearGradient>
 <pattern id="hasura7" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#d8d2c4"/><line x1="0" y1="0" x2="0" y2="10" stroke="#a89f8c" stroke-width="3"/></pattern></defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb"/>`;
  /* ---- rigla de 2 m (două rigle de 1 m cap la cap) */
  let gr = ""; for (let d = 0; d <= 220; d++) { const x = XR(d), h = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5; gr += `<line x1="${x}" y1="200" x2="${x}" y2="${200 + h}" stroke="#333" stroke-width="${d % 10 ? 0.6 : 1.1}"/>`; if (d % 10 === 0) gr += `<text x="${x}" y="226" font-size="${d % 50 ? 8 : 10}" text-anchor="middle" fill="#333"${d % 50 ? "" : ' font-weight="700"'}>${d}</text>`; }
  s += `<g data-k="rigla" class="tk-comp"><rect x="150" y="196" width="1110" height="34" rx="2" fill="#f4d35e" stroke="#b28e1a"/>${gr}<line x1="${XR(100)}" y1="196" x2="${XR(100)}" y2="230" stroke="#b28e1a" stroke-width="2"/><text x="1255" y="244" font-size="9" text-anchor="end" fill="#666">riglă 2 m [cm] (2 × 1 m)</text></g>`;
  /* ---- peretele laboratorului */
  s += `<g data-k="perete" class="tk-comp"><rect x="1272" y="10" width="26" height="220" fill="url(#hasura7)" stroke="#8a826f"/><text x="1266" y="20" font-size="9" text-anchor="end" fill="#666">perete la ${MD.PERETE} cm →</text></g>`;
  /* ---- suportul cu modulele (vedere laterală, fasciculele spre dreapta) */
  s += `<g data-k="suport" class="tk-comp" filter="url(#umbra)"><rect x="96" y="30" width="14" height="196" rx="2" fill="url(#gAlu7)" stroke="#7c848c"/><rect x="70" y="222" width="70" height="10" rx="2" fill="url(#gAlu7)" stroke="#7c848c"/></g>
  <g data-k="hc" class="tk-comp" filter="url(#umbra)"><rect x="112" y="${YH - 30}" width="20" height="60" rx="2" fill="#1f5fbf" stroke="#0d2c7a"/>
    <rect x="132" y="${YH - 26}" width="16" height="22" rx="3" fill="#cfd5db" stroke="#777"/><rect x="132" y="${YH + 4}" width="16" height="22" rx="3" fill="#cfd5db" stroke="#777"/>
    <text x="122" y="${YH - 36}" font-size="9" text-anchor="middle" fill="#0d2c7a" font-weight="800">HC-SR04</text><text x="156" y="${YH - 16}" font-size="7" fill="#555">T</text><text x="156" y="${YH + 20}" font-size="7" fill="#555">R</text></g>
  <g data-k="jsn" class="tk-comp" filter="url(#umbra)"><rect x="112" y="${YJ - 14}" width="38" height="28" rx="6" fill="#202226"/><rect x="146" y="${YJ - 12}" width="6" height="24" rx="2" fill="#3a3d42"/>
    <text x="128" y="${YJ + 28}" font-size="9" text-anchor="middle" fill="#202226" font-weight="800">JSN-SR04T</text></g>
  <g data-k="ds" class="tk-comp" filter="url(#umbra)"><path d="M172,112 h14 v10 a7,7 0 0 1 -14,0z" fill="#111"/><text x="190" y="124" font-size="8" fill="#333" font-weight="700">DS18B20</text><text id="ds7" x="190" y="134" font-size="8" fill="#c62828" font-family="ui-monospace,monospace"></text></g>
  <g id="unde7" style="pointer-events:none"></g>`;
  /* ---- căruciorul cu ținta (se trage pe riglă) */
  s += `<g data-k="tinta" class="tk-comp" id="carut7" style="cursor:ew-resize"><g id="carutG"></g></g>`;
  /* ---- aeroterma (numai cadrul didactic) */
  s += `<g data-k="aero" class="tk-comp" filter="url(#umbra)"><rect x="260" y="276" width="120" height="96" rx="12" fill="#d9822b" stroke="#8a4b10"/><rect x="272" y="286" width="96" height="46" rx="5" fill="#3b2a1a"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="276" y1="${290 + i * 7}" x2="364" y2="${290 + i * 7}" stroke="#7a5a3a" stroke-width="2"/>`).join("")}
    <rect id="aeroInc" x="274" y="288" width="92" height="42" rx="4" fill="#ff5722" opacity="0"/><circle id="aeroLed" cx="364" cy="352" r="6" fill="#333"/>
    <text x="320" y="356" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">AEROTERMĂ</text><text x="320" y="388" font-size="9" text-anchor="middle" fill="#8a4b10" font-weight="700">numai cadrul didactic</text></g>
    <g id="aeroFlux" opacity="0" style="pointer-events:none">${[0, 1, 2].map(i => `<path d="M${290 + i * 30},270 C${280 + i * 30},250 ${300 + i * 30},236 ${290 + i * 30},${YJ + 30}" fill="none" stroke="#ff7043" stroke-width="3" stroke-dasharray="6 5" marker-end=""/>`).join("")}</g>`;
  /* ---- placa de test: LED-urile zonelor și buzzerul */
  s += `<g data-k="bb" class="tk-comp" filter="url(#umbra)"><rect x="600" y="276" width="270" height="140" rx="6" fill="#f4f3ee" stroke="#c9c6bd"/>
    ${Array.from({ length: 24 }, (_, i) => `<rect x="${612 + i * 10.5}" y="290" width="3" height="3" fill="#555"/><rect x="${612 + i * 10.5}" y="402" width="3" height="3" fill="#555"/>`).join("")}
    ${[["V", 650, "#2e9e44", "D34"], ["G", 700, "#f2b705", "D35"], ["R", 750, "#d32f2f", "D36"]].map(([k, x, c, p]) => `<rect x="${x - 4}" y="356" width="8" height="22" rx="2" fill="#e6cfa0" stroke="#a88"/><circle id="led7${k}" cx="${x}" cy="336" r="11" fill="${c}" opacity=".35" stroke="#555"/><text x="${x}" y="394" font-size="8" text-anchor="middle" fill="#333">${p} · 220 Ω</text>`).join("")}
    <text x="735" y="410" font-size="8" text-anchor="middle" fill="#555"></text></g>
    <g data-k="buzzer" class="tk-comp" filter="url(#umbra)"><circle cx="820" cy="340" r="22" fill="#151515"/><circle cx="820" cy="340" r="4" fill="#444"/><text x="820" y="376" font-size="8" text-anchor="middle" fill="#333">buzzer D8 · 100 Ω</text><text id="vol7" x="820" y="390" font-size="8" text-anchor="middle" fill="#c62828" font-weight="700"></text></g>
    <g id="buzUnde" style="pointer-events:none" opacity="0"><path d="M846,322 a24,24 0 0 1 0,36" fill="none" stroke="#1477d1" stroke-width="2.5"/><path d="M854,314 a34,34 0 0 1 0,52" fill="none" stroke="#1477d1" stroke-width="2"/></g>`;
  /* ---- Arduino Mega 2560 (barete D22…D53) */
  const MX = 900, MY = 270;
  s += `<g data-k="mega" class="tk-comp" filter="url(#umbra)"><rect x="${MX}" y="${MY}" width="340" height="232" rx="8" fill="#00878f" stroke="#005a60"/>
    <rect x="${MX - 14}" y="${MY + 160}" width="46" height="40" rx="3" fill="url(#gAlu7)" stroke="#666"/><g transform="translate(${MX + 170} ${MY + 120}) rotate(45)"><rect x="-30" y="-30" width="60" height="60" rx="2" fill="#262626"/></g>
    <text x="${MX + 170}" y="${MY + 123}" font-size="7" fill="#bbb" text-anchor="middle" font-family="monospace">ATMEGA2560</text><rect x="${MX + 30}" y="${MY + 6}" width="250" height="12" rx="1.5" fill="#202020"/>
    <rect x="${MX + 296}" y="${MY + 30}" width="26" height="180" rx="1.5" fill="#202020"/><text x="${MX + 286}" y="${MY + 26}" font-size="6.5" fill="#fff" text-anchor="middle">22…53</text>
    <text x="${MX + 40}" y="${MY + 200}" font-size="13" fill="#e8ffff" font-weight="800">ARDUINO MEGA 2560</text>
    <rect id="ledON7" x="${MX + 60}" y="${MY + 60}" width="8" height="5" fill="#1a3a1a"/><text x="${MX + 72}" y="${MY + 65}" font-size="6" fill="#fff">ON</text><rect id="ledTX7" x="${MX + 60}" y="${MY + 72}" width="8" height="5" fill="#5a4a1a"/><text x="${MX + 72}" y="${MY + 77}" font-size="6" fill="#fff">TX</text></g>
    ${Object.entries(TP7).map(([k, [x, y]]) => `<g data-k="${k}" class="tk-comp"><rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${k.startsWith("trig") ? "#ff9800" : "#ffeb3b"}" stroke="#000"/><text x="${x - 11}" y="${y + 3}" font-size="8" text-anchor="end" fill="#fff" font-weight="800">${PUNCTE[k].split(" – ")[0]} ${k.startsWith("trig") ? "TRIG" : "ECHO"} ${k.endsWith("H") ? "HC" : "JSN"}</text></g>`).join("")}
    <g data-k="rst" class="tk-comp"><rect x="${MX + 20}" y="${MY + 92}" width="18" height="18" rx="2" fill="#ccc" stroke="#555"/><circle cx="${MX + 29}" cy="${MY + 101}" r="5.5" fill="#c62828"/><text x="${MX + 29}" y="${MY + 122}" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">RESET</text></g>
    <path id="usb7" d="M${MX - 14},${MY + 180} C${MX - 60},${MY + 180} ${MX - 60},${MY + 300} ${MX - 20},${MY + 330}" fill="none" stroke="#bbb" stroke-width="6"/>`;
  s += `<g data-k="oled" class="tk-comp" filter="url(#umbra)"><rect x="930" y="560" width="230" height="170" rx="6" fill="#16337a" stroke="#0b1d48"/><rect x="940" y="584" width="210" height="132" rx="3" fill="#050608" stroke="#333"/><g id="oled7" font-family="ui-monospace,Consolas,monospace"></g><text x="1045" y="576" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED 0,96" SSD1306 · I²C</text></g>`;
  /* ---- osciloscopul */
  s += `<g data-k="osc" class="tk-comp" filter="url(#umbra)"><rect x="20" y="440" width="560" height="350" rx="12" fill="#2c3036"/><rect x="40" y="458" width="416" height="296" rx="4" fill="#050a0e" stroke="#111"/>
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${46 + i * 40.4}" y1="476" x2="${46 + i * 40.4}" y2="724" stroke="#1f3a44" stroke-width="${i === 5 ? 1.2 : .6}"/>`).join("")}${Array.from({ length: 9 }, (_, i) => `<line x1="46" y1="${476 + i * 31}" x2="450" y2="${476 + i * 31}" stroke="#1f3a44" stroke-width="${i === 4 ? 1.2 : .6}"/>`).join("")}
    <g id="osc-tr"></g><text id="osc-h" x="48" y="470" font-size="9.5" fill="#cfe8ff" font-family="ui-monospace,monospace"></text><text id="osc-m" x="48" y="744" font-size="10" fill="#7dff8a" font-family="ui-monospace,monospace"></text>
    <text x="520" y="476" font-size="11" text-anchor="middle" fill="#e6ebf0" font-weight="700">OSCILOSCOP</text><text x="520" y="490" font-size="8" text-anchor="middle" fill="#aab">2 canale · 100 MHz</text>
    ${[0, 1, 2].map(i => `<circle cx="${488 + (i % 2) * 40}" cy="${520 + i * 40}" r="13" fill="#4a4f56" stroke="#111"/>`).join("")}
    <circle cx="490" cy="740" r="10" fill="#f2d600" stroke="#111"/><circle cx="550" cy="740" r="10" fill="#1fb6ff" stroke="#111"/><text x="490" y="770" font-size="9" text-anchor="middle" fill="#fff">CH1</text><text x="550" y="770" font-size="9" text-anchor="middle" fill="#fff">CH2</text></g>`;
  /* ---- firele: modulele → D30…D33, DS18B20 → D22, LED-urile → D34…D36, buzzer → D8, OLED → I²C */
  const F = (i, c, y0, xp) => W([[104, y0], [86, y0], [86, 250 + i * 5], [590, 250 + i * 5], [590, 262 + i * 4], [xp, 262 + i * 4], [xp, 270]], c, 2.2);
  s += `<g style="pointer-events:none">
    ${W([[112, YH - 14], [104, YH - 14]], "#ff9800", 2.2)}${W([[112, YH - 4], [104, YH - 4]], "#ffeb3b", 2.2)}${W([[112, YJ - 6], [104, YJ - 6]], "#ff6f00", 2.2)}${W([[112, YJ + 4], [104, YJ + 4]], "#fdd835", 2.2)}
    ${F(0, "#ff9800", YH - 14, 1196)}${F(1, "#ffeb3b", YH - 4, 1203)}${F(2, "#ff6f00", YJ - 6, 1210)}${F(3, "#fdd835", YJ + 4, 1217)}
    ${W([[179, 128], [179, 244], [588, 244], [588, 258], [1189, 258], [1189, 270]], "#43a047", 2)}
    ${W([[650, 416], [650, 520], [880, 520], [880, 480], [1196, 480], [1196, 470]], "#2e9e44", 2)}${W([[700, 416], [700, 526], [884, 526], [884, 486], [1203, 486], [1203, 470]], "#f2b705", 2)}${W([[750, 416], [750, 532], [888, 532], [888, 492], [1210, 492], [1210, 470]], "#d32f2f", 2)}
    ${W([[820, 362], [820, 420], [892, 420], [892, 300], [1020, 300], [1020, 288]], "#8e24aa", 2)}
    ${W([[1102, 560], [1102, 540], [1170, 540], [1170, 502]], "#1e88e5", 2)}${W([[1120, 560], [1120, 546], [1180, 546], [1180, 502]], "#43a047", 2)}</g>`;
  s += `<g id="sonde7" style="pointer-events:none"></g><text id="tk-av" x="660" y="452" text-anchor="middle" font-size="12" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
function tintaSVG() {
  const x = XR(sim.d), u = sim.unghi;
  const forma = { lemn: `<rect x="0" y="-58" width="50" height="100" fill="#d7a86e" stroke="#8a5a2b"/><path d="M8,-50 h34 M8,-30 h34 M8,-10 h34 M8,10 h34" stroke="#b9874a"/>`,
    carton: `<rect x="0" y="-80" width="8" height="132" fill="#b08355" stroke="#6d4a26"/>`, metal: `<rect x="0" y="-80" width="6" height="132" fill="url(#gAlu7)" stroke="#555"/>`,
    burete: `<rect x="0" y="-62" width="44" height="104" rx="8" fill="#ffe066" stroke="#c9a227"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${8 + (i % 3) * 14}" cy="${-50 + i * 12}" r="3" fill="#e0b934"/>`).join("")}` }[sim.tinta];
  return `<g transform="translate(${x} 128)"><g transform="rotate(${-u} 0 0)">${forma}</g><rect x="-6" y="52" width="58" height="14" rx="3" fill="#455a64"/><circle cx="4" cy="68" r="4" fill="#222"/><circle cx="44" cy="68" r="4" fill="#222"/>
    <path d="M0,-92 V72" stroke="#c62828" stroke-width="1.2" stroke-dasharray="3 3"/><text x="0" y="-96" font-size="10" text-anchor="middle" fill="#c62828" font-weight="700">${sim.d} cm${u ? ` · ${u}°` : ""}</text></g>`;
}
function oledTxt() {
  const v = sim.pr && sim.pr.last, f = (x, d, w) => Number.isFinite(x) ? x.toFixed(d).padStart(w, " ") : "  —";
  if (!v) return { titlu: "PARCARE US", linii: ["pornire..."] };
  return { titlu: `PARCARE US ${sim.fw.comp ? "COMP" : "20C"}`, linii: [`HC ${f(v.dH, 1, 6)} cm`, `JSN${f(v.dJ, 1, 6)} cm`, `T ${v.T.toFixed(2)} C`, `${v.zona}`] };
}
function planseAfis() {
  if (!$("#tk-svg")) return; initTemp();
  $("#carutG").innerHTML = tintaSVG();
  $("#ds7").textContent = sim.run ? tDS().toFixed(2) + " °C" : "";
  /* undele: emisia de la modul și ecoul de la țintă (stilizat) */
  let u = ""; const xt = XR(sim.d);
  [["hc", YH, "#1477d1"], ["jsn", YJ, "#6a1b9a"]].forEach(([m, y, c]) => { const a = sim.tS - sim.ping[m]; if (!sim.run || a > 0.1) return; const f = a / 0.1, r = 20 + f * (xt - 150), ec = sim.pr && sim.pr.ult[m] && sim.pr.ult[m].t > 0;
    u += `<path d="M${150 + r * 0.98},${y - r * 0.18} a${r},${r} 0 0 1 0,${r * 0.36}" fill="none" stroke="${c}" stroke-width="2" opacity="${(1 - f).toFixed(2)}"/>`;
    if (ec && f > 0.4) { const r2 = (f - 0.4) / 0.6 * (xt - 150); u += `<path d="M${xt - r2 * 0.98},${y - r2 * 0.16} a${r2},${r2} 0 0 0 0,${r2 * 0.32}" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="4 3" opacity="${(1 - f * 0.6).toFixed(2)}"/>`; } });
  $("#unde7").innerHTML = u;
  $("#aeroInc").setAttribute("opacity", sim.aero ? 0.8 : 0); $("#aeroLed").setAttribute("fill", sim.aero ? "#ff1744" : "#333"); $("#aeroFlux").setAttribute("opacity", sim.aero ? 0.85 : 0);
  const z = zonaCur(), led = LEDZ[z];
  [["V", "verde"], ["G", "galben"], ["R", "roșu"]].forEach(([k, n]) => { const on = led === n; $("#led7" + k).setAttribute("opacity", on ? 1 : 0.3); });
  $("#buzUnde").setAttribute("opacity", sim.buz ? (sim.vol === "mic" ? 0.45 : 1) : 0); $("#vol7").textContent = `volum ${sim.vol}`;
  const o = sim.run ? oledTxt() : null; $("#oled7").innerHTML = o ? `<text x="946" y="602" font-size="12" fill="#ffd400">${esc(o.titlu)}</text>` + o.linii.map((l, i) => `<text x="946" y="${624 + i * 22}" font-size="14" fill="#5fd3ff">${esc(l)}</text>`).join("") : "";
  $("#ledON7").setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a"); $("#ledTX7").setAttribute("fill", sim.run && performance.now() - sim.tx < 80 ? "#ffd04a" : "#5a4a1a"); $("#usb7").setAttribute("stroke", sim.run ? "#222" : "#bbb");
  const sd = [["#f2d600", [490, 740]], ["#1fb6ff", [550, 740]]];
  $("#sonde7").innerHTML = sim.osc.ch.map((c, i) => { const t = TP7[c.s]; if (!t) return ""; const [x0, y0] = sd[i][1];
    return `<path d="M${x0},${y0} C${x0},${y0 + 50} ${t[0] - 260},${t[1] + 260} ${t[0] - 20},${t[1] + 8}" fill="none" stroke="${sd[i][0]}" stroke-width="3.2" opacity=".95"/><rect x="${t[0] - 24}" y="${t[1] - 3}" width="18" height="7" rx="3" fill="${sd[i][0]}"/>`; }).join("");
  $("#tk-av").textContent = sim.aero ? "⚠ aeroterma pornită – numai cadrul didactic" : sim.vol === "mare" && sim.run ? "reduceți volumul buzzerului (NSSM)" : "";
  oscAfis();
}
const INSP = {
  hc: () => ["Modulul HC-SR04", [["Traductoare", "2 × piezoceramice deschise, 40 kHz (T emițător, R receptor)"], ["Legături", "VCC 5 V, TRIG D30, ECHO D31, GND"], ["Domeniu", "2…400 cm, fascicul ≈ ±15°"], ["Ultima citire", sim.pr && sim.pr.last && Number.isFinite(sim.pr.last.dH) ? fx(sim.pr.last.dH, 2) + " cm" : "—"]]],
  jsn: () => ["Modulul JSN-SR04T", [["Traductor", "unul singur, etanș (tip senzor de parcare auto), emisie și recepție"], ["Legături", "5 V, TRIG D32, ECHO D33, GND"], ["Zona moartă", "≈ 20…25 cm (oscilația liberă a traductorului)"], ["Ultima citire", sim.pr && sim.pr.last && Number.isFinite(sim.pr.last.dJ) ? fx(sim.pr.last.dJ, 2) + " cm" : "—"]]],
  ds: () => ["Senzorul de temperatură DS18B20", [["Legătura", "D22, 1-Wire, pull-up 4,7 kΩ"], ["Rezoluție", "0,0625 °C (12 biți), eroare ±0,5 °C"], ["Amplasare", "în aerul de pe traseul ultrasunetelor"], ["Citire", sim.Tds !== null ? fx(tDS(), 4) + " °C" : "—"]]],
  tinta: () => ["Ținta pe cărucior", [["Material", MD.TINTE[sim.tinta].et], ["Unghi", sim.unghi + "°"], ["Distanța (riglă)", sim.d + " cm"], ["Mutare", "trageți căruciorul sau butoanele de sub planșă"]]],
  rigla: () => ["Rigla", [["Lungime", "2 m (două rigle de 1 m cap la cap), diviziuni 1 mm"], ["Origine", "fața traductoarelor"]]],
  perete: () => ["Peretele laboratorului", [["Distanța", MD.PERETE + " cm"], ["Efect", "ecou de fundal când ținta nu întoarce ecoul spre modul"]]],
  aero: () => ["Aeroterma", [["Utilizare", "numai cadrul didactic, departe de materiale inflamabile"], ["Stare", sim.aero ? "pornită" : "oprită"], ["Efect", "încălzește aerul dintre modul și țintă"]]],
  bb: () => ["LED-urile zonelor", [["Verde (D34)", "liber"], ["Galben (D35)", "ton rar"], ["Roșu (D36)", "ton des / continuu"], ["Rezistoare", "220 Ω"]]],
  buzzer: () => ["Buzzerul", [["Legătura", "D8 prin 100 Ω"], ["Volum", sim.vol + " (clic pe buzzer = comutare)"], ["Zona", zonaCur()]]],
  mega: () => ["Arduino Mega 2560", [["Măsurare", "pulseIn(ECHO, HIGH, 30000) – rezoluție 1 µs, timeout 30 ms"], ["Ciclu", "HC și JSN alternativ la 60 ms, media pe 0,5 s"], ["Program", sim.fw ? `COMP = ${sim.fw.comp}, zone ${sim.fw.z.join("/")} cm` : "—"]]],
  oled: () => ["OLED SSD1306", [["Conținut", "d HC, d JSN, T, zona"]]],
  osc: () => ["Osciloscopul", [["CH1", PUNCTE[sim.osc.ch[0].s]], ["CH2", PUNCTE[sim.osc.ch[1].s]], ["Baza de timp", fmtT(sim.osc.tdiv) + "/div"], ["Măsurare", "+Width pe CH2 = durata ECHO"]]],
  suport: () => ["Suportul modulelor", [["Montaj", "fețele traductoarelor în dreptul originii riglei"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}
function laClic3d(k) {
  if (k === "aero") return comutaAero();
  if (k === "buzzer") return comutaVol();
  if (k === "rst") { if (sim.run) { seriala("— RESET —"); pornesteProgram(); actualizeaza(); } return; }
  if (k === "trigH" || k === "trigJ") { sim.osc.ch[0].s = k; oscCtl(); return actualizeaza(); }
  if (k === "echoH" || k === "echoJ") { sim.osc.ch[1].s = k; oscCtl(); return actualizeaza(); }
  inspector(k);
}
function tragereTinta() {
  const svg = $("#tk-svg"), g = $("#carut7"); if (!svg || !g) return; let trag = false;
  const xSvg = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()).x; };
  g.addEventListener("pointerdown", e => { trag = true; g.setPointerCapture(e.pointerId); e.preventDefault(); });
  g.addEventListener("pointermove", e => { if (trag) { const d = Math.round((xSvg(e) - 160) / 5); if (d !== sim.d) mutaTinta(d); } });
  g.addEventListener("pointerup", () => { trag = false; });
}

/* ------------------------------------------------------------------ panourile de sub planșă */
const DISTB = [5, 10, 15, 20, 22, 24, 25, 30, 40, 50, 75, 100, 150, 200];
function panou() {
  const el = $("#tk-pompa"); if (!el) return;
  el.innerHTML = `<b>Ținta</b>${Object.keys(MD.TINTE).map(k => `<button type="button" data-ti="${k}" class="${sim.tinta === k ? "activ" : ""}">${MD.TINTE[k].et}</button>`).join("")}
    <span class="sep"></span><b>Unghi</b>${[0, 30, 60].map(u => `<button type="button" data-un="${u}" class="${sim.unghi === u ? "activ" : ""}">${u}°</button>`).join("")}
    <span class="sep"></span><b>Distanța</b>${DISTB.map(d => `<button type="button" data-di="${d}" class="${sim.d === d ? "activ" : ""}">${d}</button>`).join("")}<button type="button" data-dd="-1">−1 cm</button><button type="button" data-dd="1">+1 cm</button><span>cm</span>
    <span class="sep"></span><button type="button" data-vol="1" class="${sim.vol === "mic" ? "activ" : "slab"}">🔈 Volum buzzer: ${sim.vol}</button>
    <button type="button" data-aero="1" class="${sim.aero ? "primar" : ""}">🔥 Aerotermă (cadrul didactic): ${sim.aero ? "PORNITĂ" : "oprită"}</button>
    <button type="button" data-vit="1" class="${sim.viteza > 1 ? "activ" : ""}" title="Accelerează numai procesele termice (încălzirea aerului și inerția DS18B20)">⏩ Timp termic ×${sim.viteza > 1 ? 10 : 1}</button>`;
  $$("[data-ti]", el).forEach(b => b.addEventListener("click", () => seteazaTinta(b.dataset.ti)));
  $$("[data-un]", el).forEach(b => b.addEventListener("click", () => seteazaUnghi(+b.dataset.un)));
  $$("[data-di]", el).forEach(b => b.addEventListener("click", () => mutaTinta(+b.dataset.di)));
  $$("[data-dd]", el).forEach(b => b.addEventListener("click", () => mutaTinta(sim.d + +b.dataset.dd)));
  $$("[data-vol]", el).forEach(b => b.addEventListener("click", comutaVol));
  $$("[data-aero]", el).forEach(b => b.addEventListener("click", comutaAero));
  $$("[data-vit]", el).forEach(b => b.addEventListener("click", () => { sim.viteza = sim.viteza > 1 ? 1 : 10; panou(); }));
}
function oscCtl() {
  const el = $("#tk-osc"); if (!el) return; const o = sim.osc;
  const sel = (i, opt) => `<select data-ch="${i}">${opt.map(k => `<option value="${k}"${o.ch[i].s === k ? " selected" : ""}>${PUNCTE[k]}</option>`).join("")}</select>`;
  el.innerHTML = `<b>Osciloscop</b><label>CH1 ${sel(0, ["nc", "trigH", "trigJ"])}</label><label>CH2 ${sel(1, ["nc", "echoH", "echoJ"])}</label>
    <button type="button" data-td="-1">T/div −</button><span class="osc-v">${fmtT(o.tdiv)}/div</span><button type="button" data-td="1">T/div +</button>
    <span class="osc-v">2 V/div</span><span>Trig: CH1 front ↑ · Măsurare: CH2 +Width</span>
    <button type="button" data-rs="1" class="${o.ruleaza ? "" : "activ"}">${o.ruleaza ? "■ Stop" : "▶ Run"}</button>`;
  $$("[data-ch]", el).forEach(s => s.addEventListener("change", () => { o.ch[+s.dataset.ch].s = s.value; achizitie(); actualizeaza(); }));
  $$("[data-td]", el).forEach(b => b.addEventListener("click", () => { const i = TDIV.indexOf(o.tdiv) + +b.dataset.td; o.tdiv = TDIV[Math.max(0, Math.min(TDIV.length - 1, i))]; oscCtl(); achizitie(); oscAfis(); }));
  $$("[data-rs]", el).forEach(b => b.addEventListener("click", () => { o.ruleaza = !o.ruleaza; oscCtl(); }));
}
function afisaje() {
  const e = $("#afis"); if (!e) return; const v = sim.pr && sim.pr.last, det = detectie();
  e.innerHTML = `<div><span>Ținta pe riglă</span><b>${sim.d} cm · ${sim.tinta} · ${sim.unghi}°</b></div><div><span>DS18B20</span><b>${sim.Tds !== null ? fx(tDS(), 2) + " °C" : "—"}</b></div>
    <div><span>Program (HC / JSN)</span><b>${sim.run && v ? `${Number.isFinite(v.dH) ? fx(v.dH, 2) : "—"} / ${Number.isFinite(v.dJ) ? fx(v.dJ, 2) : "—"} cm` : "—"}</b></div>
    <div><span>Ecou HC de la țintă</span><b>${det === null ? (sim.run ? "se observă (≈ 2 s)…" : "—") : det}</b></div><div><span>Zona</span><b>${zonaCur()}</b></div>`;
}
function sincron3d() { if (!SV3 && Cadru.anim && Cadru.anim.vedere) SV3 = Cadru.anim; }
function actualizeaza() { panou(); afisaje(); planseAfis(); sincron3d(); actualizeazaPasi(); }

/* ------------------------------------------------------------------ plotterul distanțelor */
function plotter() {
  const cv = $("#tk-plot"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const ist = sim.ist, t1 = ist.length ? ist[ist.length - 1].t : 30, t0 = t1 - 30, pts = ist.filter(e => e.t >= t0);
  const mx = 350, L = 40, R = 8, T = 8, B = 20, X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = v => T + (mx - Math.min(mx, v)) / mx * (H - T - B);
  g.font = "10px system-ui"; g.fillStyle = "#666"; g.strokeStyle = "#eee";
  for (let v = 0; v <= mx; v += 50) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke(); g.fillText(String(v), 4, Y(v) + 3); }
  for (let t = Math.ceil(t0 / 5) * 5; t <= t1; t += 5) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), H - B); g.stroke(); g.fillText((t - t1).toFixed(0) + " s", X(t) - 10, H - 6); }
  [["h", "#1565c0"], ["j", "#8e24aa"]].forEach(([k, c]) => { g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); let a = false; pts.forEach(p => { if (!Number.isFinite(p[k])) { a = false; return; } a ? g.lineTo(X(p.t), Y(p[k])) : g.moveTo(X(p.t), Y(p[k])); a = true; }); g.stroke(); });
  g.fillStyle = "#1565c0"; g.fillText("d HC [cm]", L + 6, T + 9); g.fillStyle = "#8e24aa"; g.fillText("d JSN [cm]", L + 70, T + 9);
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const ultimaOk = () => { const v = sim.pr && sim.pr.last; return v && v.nWin >= 2 && v.d === sim.d ? v : null; };
function cereProgram() { if (!sim.run || !sim.pr) { Cadru.mesajTemporar("Porniți simularea: distanțele le calculează programul.", "atentie"); return null; } const v = ultimaOk(); if (!v) { Cadru.mesajTemporar("Așteptați ≈ 1 s după mutarea țintei: programul face media măsurărilor pe 0,5 s.", "atentie"); return null; } return v; }
const aerCamera = () => !sim.aero && Math.abs(sim.Tp - P().Taer) < 0.3;
function inregOsc(e) {
  const a = sim.osc.acq;
  if (!sim.run) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  if (sim.d !== MD.DREF || !tintaStd()) return Cadru.mesajTemporar(`Tabelul 7.0 se completează cu ținta (lemn, carton sau metal, 0°) la ${MD.DREF} cm.`, "atentie");
  if (sim.osc.ch[0].s !== "trigH" || sim.osc.ch[1].s !== "echoH") return Cadru.mesajTemporar("CH1 pe D30 (TRIG HC-SR04) și CH2 pe D31 (ECHO HC-SR04).", "atentie");
  if (!a || !a.m || !Number.isFinite(a.m.w)) return Cadru.mesajTemporar("Impulsul ECHO trebuie să fie întreg pe ecran (T/div ≥ 0,5 ms) pentru măsurarea +Width.", "atentie");
  if (!aerCamera()) return Cadru.mesajTemporar("Tabelul 7.0 se completează cu aerul la temperatura camerei (aeroterma oprită și răcită).", "atentie");
  const t = a.m.w, T = +tDS().toFixed(4);
  const ok = Cadru.inregistreaza(e, { log: { m: "osc", t, Tp: +a.Tp.toFixed(3), T }, celule: [{ t: "t70", r: "e50", c: "t", v: String(t) }, { t: "t70", r: "e50", c: "T", v: T.toFixed(2) }] });
  if (ok) msg(`Tabelul 7.0: durata ECHO = ${t} µs la ${MD.DREF} cm, ϑ = ${fx(T, 2)} °C.`);
}
function inregD(e) {
  const v = cereProgram(); if (!v) return;
  if (!MD.DIST.includes(sim.d)) return Cadru.mesajTemporar(`Tabelul 7.1 se completează la ${MD.DIST.join(", ")} cm.`, "atentie");
  if (!tintaStd()) return Cadru.mesajTemporar("Tabelul 7.1: ținta de lemn, carton sau metal, perpendiculară (0°).", "atentie");
  if (!aerCamera()) return Cadru.mesajTemporar("Tabelul 7.1 se completează cu aerul camerei (aeroterma oprită și răcită).", "atentie");
  if (!Number.isFinite(v.dH) || !Number.isFinite(v.dJ)) return Cadru.mesajTemporar("Unul din module nu are ecou: verificați ținta.", "atentie");
  const k = "d" + sim.d, hc = +v.dH.toFixed(2), jsn = +v.dJ.toFixed(2);
  const ok = Cadru.inregistreaza(e, { log: { m: "d", k, d: sim.d, hc, jsn, Tp: +v.Tp.toFixed(3), Tc: v.Tc }, celule: [{ t: "t71", r: k, c: "hc", v: hc.toFixed(2) }, { t: "t71", r: k, c: "jsn", v: jsn.toFixed(2) }] });
  if (ok) msg(`Tabelul 7.1, ${sim.d} cm: HC-SR04 ${fx(hc, 2)} cm, JSN-SR04T ${fx(jsn, 2)} cm.`);
}
function inregTinta(e) {
  const v = cereProgram(); if (!v) return;
  if (sim.d !== MD.DREF) return Cadru.mesajTemporar(`Țintele și unghiurile se compară la ${MD.DREF} cm.`, "atentie");
  const i = MD.CAZURI.findIndex(([t, u]) => t === sim.tinta && u === sim.unghi); if (i < 0) return Cadru.mesajTemporar("Combinația țintă–unghi nu este în Tabelul 7.3 (lemn 0°/30°/60°, carton 0°, metal 0°, burete 0°).", "atentie");
  const det = detectie(); if (!det) return Cadru.mesajTemporar("Observați ecoul ≈ 2 s (16 măsurări HC-SR04) după poziționarea țintei.", "atentie");
  const k = "c" + i, f = x => Number.isFinite(x) ? x.toFixed(2) : "—";
  const ok = Cadru.inregistreaza(e, { log: { m: "tinta", k, tinta: sim.tinta, unghi: sim.unghi, det, hc: Number.isFinite(v.dH) ? +v.dH.toFixed(2) : null, Tp: +v.Tp.toFixed(3) }, celule: [{ t: "t73", r: k, c: "dr", v: String(sim.d) }, { t: "t73", r: k, c: "hc", v: f(v.dH) }, { t: "t73", r: k, c: "jsn", v: f(v.dJ) }, { t: "t73", r: k, c: "det", v: det }] });
  if (ok) msg(`Tabelul 7.3: ${MD.TINTE[sim.tinta].et}, ${sim.unghi}° → HC ${f(v.dH)} cm, ecou de la țintă: ${det}.`);
}
function inregJmin(e) {
  const v = cereProgram(); if (!v) return;
  if (sim.tinta !== "lemn" || sim.unghi !== 0 || sim.d > 40) return Cadru.mesajTemporar("Distanța minimă JSN-SR04T: cubul de lemn la 0°, apropiat de la 40 cm în pași de 1 cm.", "atentie");
  if (!(Math.abs(v.dJ - sim.d) < 1.5)) return Cadru.mesajTemporar("La această distanță citirea JSN-SR04T nu mai urmărește rigla: depărtați ținta cu 1 cm.", "atentie");
  if (sim.esecJ[sim.d - 1] !== true) return Cadru.mesajTemporar(`Verificați întâi la ${sim.d - 1} cm (−1 cm): distanța minimă sigură este ultima la care citirea urmărește rigla.`, "atentie");
  const jsn = +v.dJ.toFixed(2);
  const ok = Cadru.inregistreaza(e, { log: { m: "jmin", d: sim.d, jsn, Tp: +v.Tp.toFixed(3), Tc: v.Tc }, celule: [{ t: "t73", r: "jmin", c: "dr", v: String(sim.d) }, { t: "t73", r: "jmin", c: "hc", v: Number.isFinite(v.dH) ? v.dH.toFixed(2) : "—" }, { t: "t73", r: "jmin", c: "jsn", v: jsn.toFixed(2) }, { t: "t73", r: "jmin", c: "det", v: "da" }] });
  if (ok) msg(`Tabelul 7.3: distanța minimă sigură JSN-SR04T ≈ ${sim.d} cm (la ${sim.d - 1} cm citirea nu mai urmărește rigla).`);
}
function inregT(e) {
  const v = cereProgram(); if (!v) return; const p = P();
  if (sim.d !== MD.DREF || !tintaStd()) return Cadru.mesajTemporar(`Tabelul 7.2: ținta (lemn, carton sau metal, 0°) la ${MD.DREF} cm pe riglă.`, "atentie");
  const k = sim.aero ? "cald" : "cam";
  if (k === "cam" && !aerCamera()) return Cadru.mesajTemporar("Aerul nu a revenit la temperatura camerei: așteptați.", "atentie");
  if (k === "cald" && Math.abs(sim.Tp - p.Tcald) > 0.3) return Cadru.mesajTemporar("Aerul se încălzește încă: așteptați regimul stabil (temperatura DS18B20 nu mai crește).", "atentie");
  if (Math.abs(sim.Tds - sim.Tp - p.eDS) > 0.15) return Cadru.mesajTemporar("DS18B20 are inerție termică: așteptați să se stabilizeze citirea.", "atentie");
  if (!v.tH) return Cadru.mesajTemporar("HC-SR04 nu are ecou.", "atentie");
  const T = +v.T.toFixed(4), t = +v.tH.toFixed(1), d0 = +MD.dDin(t, 20).toFixed(2), dc = +MD.dDin(t, T).toFixed(2);
  const ok = Cadru.inregistreaza(e, { log: { m: "T", k, T, t, d0, dc, Tp: +v.Tp.toFixed(3) }, celule: [{ t: "t72", r: k, c: "T", v: T.toFixed(2) }, { t: "t72", r: k, c: "t", v: t.toFixed(1) }, { t: "t72", r: k, c: "d0", v: d0.toFixed(2) }, { t: "t72", r: k, c: "dc", v: dc.toFixed(2) }] });
  if (ok) msg(`Tabelul 7.2 (${k === "cam" ? "aerul camerei" : "aer încălzit"}): ϑ = ${fx(T, 2)} °C, t = ${fx(t, 1)} µs, d fără compensare ${fx(d0, 2)} cm, cu compensare ${fx(dc, 2)} cm.`);
}
function inregZona(e) {
  const v = cereProgram(); if (!v) return;
  const i = MD.ZONE.indexOf(v.zona); if (i < 0) return Cadru.mesajTemporar("Programul nu are o distanță validă (fără ecou).", "atentie");
  const k = "z" + i, dm = +v.dH.toFixed(2);
  const ok = Cadru.inregistreaza(e, { log: { m: "zona", k, dm, zona: v.zona, z: sim.fw.z.slice() }, celule: [{ t: "t74", r: k, c: "dr", v: String(sim.d) }, { t: "t74", r: k, c: "dm", v: dm.toFixed(2) }, { t: "t74", r: k, c: "sem", v: v.zona }, { t: "t74", r: k, c: "led", v: LEDZ[v.zona] }] });
  if (ok) msg(`Tabelul 7.4: la ${sim.d} cm (măsurat ${fx(dm, 2)} cm) – ${v.zona}, LED ${LEDZ[v.zona]}.`);
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const nT71 = () => MD.DIST.filter(d => pe("t71", "d" + d, "hc")).length, nT73 = () => [...MD.CAZURI.map((_, i) => "c" + i), "jmin"].filter(k => pe("t73", k, "det")).length;
const nT72 = () => ["cam", "cald"].filter(k => pe("t72", k, "T")).length, nT74 = () => MD.ZONE.filter((_, i) => pe("t74", "z" + i, "dm")).length;
const PASI = [
  { t: "Pregătirea montajului (NSSM)", tab: "5 V, buzzer, ținta la 50 cm", v3: "tot",
    banda: "Pasul 1 · Montajul alimentat numai la 5 V (USB); buzzerul la volum mic; ținta se mută pe riglă fără să lovească modulele. Programul pornește și afișează distanțele.",
    instr: ["Verificați legăturile pe planșă: HC-SR04 – TRIG <b>D30</b>, ECHO <b>D31</b>; JSN-SR04T – TRIG <b>D32</b>, ECHO <b>D33</b>; DS18B20 pe <b>D22</b> (pull-up 4,7 kΩ); LED-urile pe D34…D36, buzzerul pe D8 (clic pe componente = detalii).",
      "Apăsați <b>🔈 Volum buzzer</b> până când arată <b>mic</b> (clic și pe buzzer).",
      "Apăsați <b>▶ Pornește simularea</b>: placa Mega se alimentează prin USB (5 V) și rulează programul <i>parcare_us</i>.",
      "Alegeți ținta <b>cub de lemn 100 mm</b>, unghiul <b>0°</b> și distanța <b>50</b> cm (sau trageți căruciorul pe riglă).",
      "Urmăriți pe OLED și pe monitorul serial distanțele HC și JSN, temperatura DS18B20 și zona."],
    ctl: () => "",
    ver: () => [[sim.vol === "mic", "buzzerul la volum mic"], [sim.run, "programul rulează (5 V prin USB)"], [sim.tinta === "lemn" && sim.unghi === 0 && sim.d === 50, "cubul de lemn la 50 cm, 0°"], [!!ultimaOk(), "distanțele afișate de program"]],
    prog: () => { const v = [sim.vol === "mic", sim.run, sim.tinta === "lemn" && sim.unghi === 0 && sim.d === 50, !!ultimaOk()].filter(Boolean).length; if (v === 4) sim.p1ok = true; return sim.p1ok ? 4 : v; }, tot: 4, butoane: [] },
  { t: "Impulsul ECHO pe osciloscop", tab: "Tabelul 7.0", v3: "osc",
    banda: "Pasul 2 · CH1 pe TRIG (D30), CH2 pe ECHO (D31) al HC-SR04, ținta la 50 cm: durata impulsului ECHO (+Width) este timpul de ecou t_ecou ≈ 2,9 ms.",
    instr: ["Clic pe pinul <b>D30 TRIG HC</b> (CH1) și pe <b>D31 ECHO HC</b> (CH2) – sau alegeți-le în panoul osciloscopului.",
      "Reglați <b>T/div</b> = 0,5 ms sau 1 ms: se vede impulsul TRIG de 10 µs, apoi, după emisia celor 8 perioade de 40 kHz, impulsul ECHO întreg.",
      "Citiți <b>CH2 +Width</b> (durata ECHO) și temperatura DS18B20 de pe OLED.",
      "Apăsați <b>„● Durata ECHO → Tabelul 7.0”</b>; distanța c·t/2 se calculează în tabel. Comparați cu rigla (50 cm)."],
    ctl: () => `<div class="rand-mic"><button type="button" data-sonde="1">Sondele pe D30 / D31</button><button type="button" data-tdv="0.0005">0,5 ms/div</button><button type="button" data-tdv="0.001">1 ms/div</button><button type="button" data-di2="50">Ținta la 50 cm</button></div>`,
    ver: () => { const a = sim.osc.acq; return [[sim.osc.ch[0].s === "trigH", "CH1 pe D30 (TRIG HC)"], [sim.osc.ch[1].s === "echoH", "CH2 pe D31 (ECHO HC)"], [!!(a && a.m && Number.isFinite(a.m.w)), a && a.m && Number.isFinite(a.m.w) ? `+Width = ${a.m.w} µs` : "impulsul ECHO întreg pe ecran"], [sim.d === MD.DREF && tintaStd(), "ținta la 50 cm, 0°"]]; },
    prog: () => pe("t70", "e50", "t") ? 1 : 0, tot: 1, butoane: [["● Durata ECHO → Tabelul 7.0", inregOsc, "primar"]] },
  { t: "Distanțele 5 … 200 cm", tab: "Tabelul 7.1", v3: "rigla",
    banda: "Pasul 3 · Ținta (cubul de lemn, 0°) la 5, 10, 25, 50, 100, 200 cm: distanța calculată de program pentru ambele module, cu aerul camerei.",
    instr: ["Ținta <b>cub de lemn</b>, <b>0°</b>, aeroterma oprită.",
      "Mutați ținta la <b>5</b> cm (butonul „5” sau trăgând căruciorul) și așteptați ≈ 1 s (media pe 0,5 s).",
      "Apăsați <b>„● d HC, d JSN → Tabelul 7.1”</b>.",
      "Repetați pentru <b>10, 25, 50, 100, 200</b> cm. Observați: JSN-SR04T nu măsoară sub ≈ 20 cm (afișează aproape aceeași valoare), iar eroarea relativă este mare la distanțe mici."],
    ctl: () => `<div class="rand-mic">${MD.DIST.map(d => `<button type="button" data-di2="${d}">${d} cm</button>`).join("")}</div>`,
    ver: () => [[sim.tinta !== "burete" && sim.unghi === 0, "ținta reflectantă, 0°"], [!sim.aero, "aeroterma oprită"], [MD.DIST.includes(sim.d) && !!ultimaOk(), MD.DIST.includes(sim.d) ? `ținta la ${sim.d} cm, citire stabilă` : "ținta la o distanță din tabel"], [nT71() >= 6, `distanțe înregistrate: ${nT71()}/6`]],
    prog: nT71, tot: 6, butoane: [["● d HC, d JSN → Tabelul 7.1", inregD, "primar"]] },
  { t: "Ținte, unghiuri, distanța minimă", tab: "Tabelul 7.3", v3: "rigla",
    banda: "Pasul 4 · La 50 cm: cubul de lemn la 0°, 30°, 60°, panoul de carton, panoul metalic și buretele – ecoul vine de la țintă? Apoi distanța minimă sigură a JSN-SR04T.",
    instr: ["Distanța <b>50</b> cm. Pentru fiecare țintă din tabel (lemn 0°, carton 0°, metal 0°, lemn 30°, lemn 60°, burete 0°): alegeți ținta și unghiul, așteptați ≈ 2 s și urmăriți dacă HC-SR04 măsoară ținta, peretele din spate sau nimic.",
      "Apăsați <b>„● Ecoul țintei → Tabelul 7.3”</b> pentru fiecare caz.",
      "Distanța minimă JSN: cubul de lemn la 0°, mutați ținta de la <b>30</b> cm spre module cu <b>−1 cm</b>, până când citirea JSN nu mai urmărește rigla.",
      "Reveniți cu <b>+1 cm</b> la ultima poziție corectă și apăsați <b>„● Distanța minimă JSN → Tabelul 7.3”</b>."],
    ctl: () => `<div class="rand-mic">${MD.CAZURI.map(([t, u]) => `<button type="button" data-caz="${t},${u}">${t} ${u}°</button>`).join("")}</div><div class="rand-mic"><button type="button" data-di2="50">50 cm</button><button type="button" data-di2="30">30 cm</button><button type="button" data-dd2="-1">−1 cm</button><button type="button" data-dd2="1">+1 cm</button></div>`,
    ver: () => { const det = detectie(); return [[sim.d === MD.DREF || sim.d <= 40, `ținta la ${sim.d} cm`], [det !== null, det !== null ? `ecoul HC de la țintă: ${det}` : "observarea ecoului (≈ 2 s)"], [MD.CAZURI.every((_, i) => pe("t73", "c" + i, "det")), `cazuri înregistrate: ${MD.CAZURI.filter((_, i) => pe("t73", "c" + i, "det")).length}/6`], [pe("t73", "jmin", "dr"), "distanța minimă JSN înregistrată"]]; },
    prog: nT73, tot: 7, butoane: [["● Ecoul țintei → Tabelul 7.3", inregTinta, "primar"], ["● Distanța minimă JSN → Tabelul 7.3", inregJmin, "primar"]] },
  { t: "Compensarea cu temperatura", tab: "Tabelul 7.2", v3: "aero",
    banda: "Pasul 5 · Ținta fixă la 50 cm. Cu aerul camerei și cu aerul încălzit local de aerotermă (cadrul didactic): t_ecou, d fără compensare (20 °C) și d cu compensare (DS18B20).",
    instr: ["Ținta (cub de lemn, 0°) la <b>50</b> cm; aeroterma oprită și aerul la temperatura camerei.",
      "Așteptați ca temperatura DS18B20 să fie constantă și apăsați <b>„● ϑ, t, d → Tabelul 7.2”</b> (rândul „aerul camerei”).",
      "<b>Cadrul didactic</b> pornește aeroterma (<b>🔥 Aerotermă</b>). Urmăriți creșterea temperaturii și scăderea timpului de ecou; d fără compensare scade, d cu compensare rămâne ≈ 50 cm. Pentru a nu aștepta, puteți folosi <b>⏩ Timp termic ×10</b>.",
      "Când temperatura nu mai crește, apăsați din nou <b>„● ϑ, t, d → Tabelul 7.2”</b> (rândul „aer încălzit”).",
      "Cadrul didactic oprește aeroterma."],
    ctl: () => `<div class="rand-mic"><button type="button" data-di2="50">Ținta la 50 cm</button><button type="button" data-aero2="1">🔥 Aerotermă (cadrul didactic)</button><button type="button" data-vit2="1">⏩ Timp termic ×10</button></div>`,
    ver: () => [[sim.d === MD.DREF && tintaStd(), "ținta la 50 cm, 0°"], [Math.abs(sim.Tds - sim.Tp - P().eDS) < 0.15 && (aerCamera() || (sim.aero && Math.abs(sim.Tp - P().Tcald) < 0.3)), `temperatura stabilă (${fx(tDS(), 2)} °C)`], [pe("t72", "cam", "T"), "aerul camerei înregistrat"], [pe("t72", "cald", "T"), "aerul încălzit înregistrat"]],
    prog: nT72, tot: 2, butoane: [["● ϑ, t, d → Tabelul 7.2", inregT, "primar"]] },
  { t: "Zonele de avertizare", tab: "Tabelul 7.4", v3: "bb",
    banda: "Pasul 6 · Pragurile programului: > Z1 liber · Z2…Z1 ton rar · Z3…Z2 ton des · < Z3 continuu. Pentru fiecare zonă: distanța măsurată, sunetul și LED-ul.",
    instr: ["Aeroterma oprită. Pragurile implicite sunt Z1 = 100, Z2 = 50, Z3 = 25 cm (în cod; se pot schimba cu simularea oprită).",
      "Mutați ținta în fiecare zonă: de ex. <b>150</b> cm (liber), <b>75</b> cm (ton rar), <b>40</b> cm (ton des), <b>15</b> cm (continuu).",
      "Ascultați buzzerul (undele lângă el) și urmăriți LED-ul aprins; apăsați <b>„● Zona → Tabelul 7.4”</b> în fiecare zonă.",
      "Răspundeți la întrebarea 5: ce praguri ați alege pentru un autoturism?"],
    ctl: () => `<div class="rand-mic">${[150, 75, 40, 15].map(d => `<button type="button" data-di2="${d}">${d} cm</button>`).join("")}</div>`,
    ver: () => [[!!ultimaOk(), `zona curentă: ${zonaCur()}`], [nT74() >= 4, `zone înregistrate: ${nT74()}/4`]],
    prog: nT74, tot: 4, butoane: [["● Zona → Tabelul 7.4", inregZona, "primar"]] }
];
let pasActiv = 0;
/* indiciile pas cu pas: ce se conectează / se apasă, în ordine (comun/ghid-pasi.js → ghidIndicii) */
const giK = k => `#tk-svg [data-k="${k}"]`, giA = s => ".pas.activ " + s, giR = (j = 0) => `.pas.activ [data-inreg][data-j="${j}"]`, giS = "#tk-start", giPm = s => "#tk-pompa " + s, giO = s => "#tk-osc " + s;
const giStart = () => [giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run];
const giTinta = (t, u) => [[giPm(`[data-ti="${t}"]`), `Ținta: <b>${MD.TINTE[t].et}</b>`, sim.tinta === t], [giPm(`[data-un="${u}"]`), `Unghiul <b>${u}°</b>`, sim.unghi === u]];
const giDist = d => [[giA(`[data-di2="${d}"]`), giPm(`[data-di="${d}"]`), "#carut7"], `Mutați ținta la <b>${d} cm</b> (buton sau trageți căruciorul)`, sim.d === d];
const giAero = () => [giPm("[data-aero]"), "Aeroterma <b>oprită</b> (așteptați revenirea aerului la temperatura camerei)", !sim.aero];
const giAsteapta = () => ["#tk-serial", "Așteptați ≈ 1 s citirea stabilă a programului", !!ultimaOk()];
PASI[0].ind = () => [[[giPm("[data-vol]"), giK("buzzer")], "Apăsați <b>🔈 Volum buzzer</b> până la <b>mic</b>", sim.vol === "mic"], giStart(), ...giTinta("lemn", 0), giDist(50), giAsteapta()];
PASI[1].ind = () => { const a = sim.osc.acq, w = !!(a && a.m && Number.isFinite(a.m.w));
  return [giStart(), giAero(), ...giTinta("lemn", 0).map(x => [x[0], x[1], x[2] || tintaStd()]), giDist(50),
    [[giK("trigH"), giO('[data-ch="0"]')], "Clic pe pinul <b>D30 TRIG HC</b> (CH1)", sim.osc.ch[0].s === "trigH"],
    [[giK("echoH"), giO('[data-ch="1"]')], "Clic pe pinul <b>D31 ECHO HC</b> (CH2)", sim.osc.ch[1].s === "echoH"],
    [[giA('[data-tdv="0.0005"]'), giO('[data-td="1"]')], "Baza de timp <b>0,5 ms/div</b> (impulsul ECHO întreg, apare +Width)", w],
    [giR(0), "Apăsați <b>„● Durata ECHO → Tabelul 7.0”</b>", pe("t70", "e50", "t")]]; };
PASI[2].ind = () => { const d = MD.DIST.find(x => !pe("t71", "d" + x, "hc")); const o = [giStart(), giAero(), ...giTinta("lemn", 0).map(x => [x[0], x[1], x[2] || tintaStd()])];
  return d === undefined ? o : [...o, giDist(d), giAsteapta(), [giR(0), `Apăsați <b>„● d HC, d JSN → Tabelul 7.1”</b> (${d} cm)`, false]]; };
PASI[3].ind = () => {
  const i = MD.CAZURI.findIndex((_, j) => !pe("t73", "c" + j, "det")), o = [giStart()];
  if (i >= 0) { const [t, u] = MD.CAZURI[i];
    return [...o, giDist(50), [[giA(`[data-caz="${t},${u}"]`), giPm(`[data-ti="${t}"]`)], `Alegeți ținta <b>${MD.TINTE[t].et}</b>, unghiul <b>${u}°</b>`, sim.tinta === t && sim.unghi === u],
      ["#tk-serial", "Așteptați ≈ 2 s (16 măsurări HC-SR04)", detectie() !== null], [giR(0), `Apăsați <b>„● Ecoul țintei → Tabelul 7.3”</b> (${t} ${u}°)`, false]]; }
  if (pe("t73", "jmin", "dr")) return o;
  const v = ultimaOk(), urm = !!(v && Math.abs(v.dJ - sim.d) < 1.5);
  const fail = Object.keys(sim.esecJ).map(Number).filter(d => sim.esecJ[d] === true && sim.esecJ[d + 1] === false && d < 40), dF = fail.length ? Math.max(...fail) : null;   // ultima pereche: la d eșuează, la d + 1 măsoară corect
  return [...o, ...giTinta("lemn", 0), [[giA('[data-di2="30"]'), giPm('[data-di="30"]')], "Ținta la <b>30 cm</b>", sim.d <= 40],
    ["#tk-serial", `Așteptați ≈ 1 s citirea JSN la ${sim.d} cm`, !!v || dF !== null],
    [[giA('[data-dd2="-1"]'), giPm('[data-dd="-1"]')], `Apăsați <b>−1 cm</b> (acum ${sim.d} cm${v ? `, JSN ${fx(v.dJ, 1)} cm` : ""}) până când citirea JSN nu mai urmărește rigla`, dF !== null],
    dF !== null && sim.d > dF + 1 ? [[giA('[data-dd2="-1"]'), giPm('[data-dd="-1"]')], `Apăsați <b>−1 cm</b> până la ${dF + 1} cm (acum ${sim.d} cm)`, false]
      : [[giA('[data-dd2="1"]'), giPm('[data-dd="1"]')], dF !== null ? `Apăsați <b>+1 cm</b> – înapoi la ${dF + 1} cm, ultima poziție corectă (la ${dF} cm JSN nu mai măsoară corect)` : "Apăsați +1 cm", dF !== null && sim.d === dF + 1],
    ["#tk-serial", `Așteptați ≈ 1 s citirea JSN la ${sim.d} cm`, dF !== null && sim.d === dF + 1 && urm],
    [giR(1), "Apăsați <b>„● Distanța minimă JSN → Tabelul 7.3”</b>", false]];
};
PASI[4].ind = () => {
  const o = [giStart(), ...giTinta("lemn", 0).map(x => [x[0], x[1], x[2] || tintaStd()]), giDist(50)], p = P(), stab = Math.abs(sim.Tds - sim.Tp - p.eDS) < 0.15;
  if (!pe("t72", "cam", "T")) return [...o, giAero(), ["#tk-serial", `Așteptați temperatura DS18B20 constantă (${fx(tDS(), 2)} °C)`, aerCamera() && stab], [giR(0), "Apăsați <b>„● ϑ, t, d → Tabelul 7.2”</b> (aerul camerei)", false]];
  if (!pe("t72", "cald", "T")) return [...o, [[giA("[data-aero2]"), giPm("[data-aero]")], "<b>Cadrul didactic</b> pornește aeroterma (🔥)", sim.aero],
    [[giA("[data-vit2]"), giPm("[data-vit]")], "Opțional: <b>⏩ Timp termic ×10</b>", sim.viteza > 1 || (sim.aero && Math.abs(sim.Tp - p.Tcald) < 0.3)],
    ["#tk-serial", `Așteptați până când temperatura nu mai crește (${fx(tDS(), 2)} °C)`, sim.aero && Math.abs(sim.Tp - p.Tcald) < 0.3 && stab], [giR(0), "Apăsați <b>„● ϑ, t, d → Tabelul 7.2”</b> (aer încălzit)", false]];
  return [...o, [[giA("[data-aero2]"), giPm("[data-aero]")], "Cadrul didactic oprește aeroterma", !sim.aero]];
};
PASI[5].ind = () => {
  const i = MD.ZONE.findIndex((_, j) => !pe("t74", "z" + j, "dm")), o = [giStart(), giAero()]; if (i < 0) return o;
  const d = [150, 75, 40, 15][i], z = sim.pr && sim.pr.last && sim.pr.last.zona;
  return [...o, giDist(d), [giK("buzzer"), `Ascultați buzzerul și urmăriți LED-ul (zona „${MD.ZONE[i]}”)`, !!ultimaOk() && z === MD.ZONE[i]], [giR(0), `Apăsați <b>„● Zona → Tabelul 7.4”</b> (${MD.ZONE[i]})`, false]];
};

const VEDERI = { tot: [[0.05, 0.75, 1.15], [-0.05, 0.05, 0.05]], osc: [[-0.22, 0.3, 0.38], [-0.25, 0.1, -0.22]], rigla: [[-0.3, 0.45, 0.95], [-0.2, 0.05, 0.22]], aero: [[-0.5, 0.35, 0.75], [-0.55, 0.08, 0.15]], bb: [[0.0, 0.3, 0.45], [0.0, 0.0, 0.03]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl && p.ctl() ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată în montajul 3D</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => { Cadru.arataTab("anim"); setTimeout(() => vedere3d(PASI[+b.dataset.vezi].v3), 600); }));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-di2]").forEach(b => b.addEventListener("click", () => mutaTinta(+b.dataset.di2)));
  $$("#pasi [data-dd2]").forEach(b => b.addEventListener("click", () => mutaTinta(sim.d + +b.dataset.dd2)));
  $$("#pasi [data-caz]").forEach(b => b.addEventListener("click", () => { const [t, u] = b.dataset.caz.split(","); sim.tinta = t; sim.unghi = +u; actualizeaza(); }));
  $$("#pasi [data-tdv]").forEach(b => b.addEventListener("click", () => { sim.osc.tdiv = +b.dataset.tdv; oscCtl(); achizitie(); oscAfis(); }));
  $$("#pasi [data-sonde]").forEach(b => b.addEventListener("click", () => { sim.osc.ch[0].s = "trigH"; sim.osc.ch[1].s = "echoH"; oscCtl(); achizitie(); actualizeaza(); }));
  $$("#pasi [data-aero2]").forEach(b => b.addEventListener("click", comutaAero));
  $$("#pasi [data-vit2]").forEach(b => b.addEventListener("click", () => { sim.viteza = sim.viteza > 1 ? 1 : 10; panou(); }));
  ghidPasi(PASI, alegePas); ghidIndicii(PASI, () => pasActiv);
  alegePas(0, false);
}
function alegePas(i) {
  if (i < 0 || i >= PASI.length) return;
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $("#tk-pas-banda").innerHTML = p.banda;
  actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi .pas")) return; initTemp();
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ editorul și simularea */
const PROG = { titlu: "parcare_us" };
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
function cod() {
  return `${K_("#include")} ${S_("&lt;DallasTemperature.h&gt;")}        ${C_("// DS18B20 pe D22, pull-up 4,7 kΩ")}
${K_("#include")} ${S_("&lt;Adafruit_SSD1306.h&gt;")}          ${C_("// OLED 128×64, I²C 0x3C")}
${K_("const")} ${K_("bool")} COMP = ${sel("COMP", [["true", "true"], ["false", "false"]])};                 ${C_("// compensarea cu temperatura (7.1)")}
${K_("const")} ${K_("int")} Z1 = ${sel("Z1", [["100", "100"], ["120", "120"], ["150", "150"]])}, Z2 = ${sel("Z2", [["50", "50"], ["60", "60"], ["75", "75"]])}, Z3 = ${sel("Z3", [["25", "25"], ["20", "20"], ["30", "30"]])};  ${C_("// pragurile zonelor [cm]")}
${K_("const")} ${K_("byte")} TRIG[${N_("2")}] = {${N_("30")}, ${N_("32")}}, ECHO[${N_("2")}] = {${N_("31")}, ${N_("33")}};  ${C_("// HC-SR04, JSN-SR04T")}
${K_("const")} ${K_("byte")} LED_V = ${N_("34")}, LED_G = ${N_("35")}, LED_R = ${N_("36")}, BUZ = ${N_("8")};

${K_("float")} dist(${K_("byte")} i, ${K_("float")} tempC) {           ${C_("// (7.1), (7.2)")}
  digitalWrite(TRIG[i], HIGH); delayMicroseconds(${N_("10")}); digitalWrite(TRIG[i], LOW);
  ${K_("unsigned long")} t = pulseIn(ECHO[i], HIGH, ${N_("30000")});    ${C_("// µs; 0 = fără ecou (timeout 30 ms)")}
  ${K_("if")} (!t) ${K_("return")} ${N_("0")};
  ${K_("float")} c = ${N_("331.3")} + ${N_("0.606")} * tempC;                  ${C_("// m/s")}
  ${K_("return")} c * t * ${N_("1e-6")} / ${N_("2")} * ${N_("100")};                    ${C_("// cm")}
}
${K_("void")} loop() {
  ${K_("float")} T = ds.getTempCByIndex(${N_("0")});            ${C_("// °C (12 biți, 0,0625 °C)")}
  ${K_("float")} dHC = medie(${N_("0")}, COMP ? T : ${N_("20.0")});          ${C_("// HC și JSN alternativ, la 60 ms")}
  ${K_("float")} dJSN = medie(${N_("1")}, COMP ? T : ${N_("20.0")});         ${C_("// media pe 0,5 s")}
  ${K_("if")} (dHC == ${N_("0")}) zona(${N_("0")});                       ${C_("// fără ecou: totul stins")}
  ${K_("else if")} (dHC &gt; Z1) zona(${N_("1")});                 ${C_("// liber: LED verde")}
  ${K_("else if")} (dHC &gt; Z2) zona(${N_("2")});                 ${C_("// ton rar (2 Hz): LED galben")}
  ${K_("else if")} (dHC &gt; Z3) zona(${N_("3")});                 ${C_("// ton des (5 Hz): LED roșu")}
  ${K_("else")} zona(${N_("4")});                                ${C_("// ton continuu: LED roșu")}
  afiseaza(dHC, dJSN, T);                       ${C_("// OLED + serial: d20 și dT")}
}`;
}
function afiseazaCod() {
  $("#tk-cod").innerHTML = cod().split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value; }); });
  $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  const z = [Number(sim.camp.Z1), Number(sim.camp.Z2), Number(sim.camp.Z3)];
  if (!(z[0] > z[1] && z[1] > z[2])) return Cadru.mesajTemporar("Pragurile trebuie să fie descrescătoare: Z1 > Z2 > Z3.", "atentie");
  sim.fw = { comp: sim.camp.COMP === "true", z }; sim.run = true; pornesteProgram();
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.pr = null; sim.buz = false;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} (COMP = ${sim.fw.comp}, zone ${sim.fw.z.join("/")} cm)` : "—"; }

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaMAM7(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date || {}, { num }), F = Number.isFinite, cel = { t70: {}, t71: {}, t72: {} };
  const t0 = num(t.t70.e50.t), T0 = num(t.t70.e50.T);
  cel.t70.e50 = { c: F(T0) ? fx(MD.c(T0), 2) : "", d: F(t0) && F(T0) ? fx(MD.dDin(t0, T0), 2) : "" };
  MD.DIST.forEach(d => { const e = o.err["d" + d]; cel.t71["d" + d] = { ehc: F(e.hc) ? fx(e.hc, 2) : "", ejsn: F(e.jsn) ? fx(e.jsn, 2) : "" }; });
  ["cam", "cald"].forEach(k => { const x = o.eps[k]; cel.t72[k] = { c: F(x.c) ? fx(x.c, 2) : "", e0: F(x.d0) ? fx((x.d0 - MD.DREF) / MD.DREF * 100, 2) : "", ec: F(x.dc) ? fx((x.dc - MD.DREF) / MD.DREF * 100, 2) : "", eps: F(x.e) ? fx(x.e, 2) : "" }; });
  const ph = MD.DIST.map(d => [d, num(t.t71["d" + d].hc)]).filter(x => F(x[1])), pj = MD.DIST.map(d => [d, num(t.t71["d" + d].jsn)]).filter(x => F(x[1]));
  const ab = pts => pts.map(([d, v]) => [d, Math.abs(v - d)]);
  const ec = o.eps.cald, ecam = o.eps.cam;
  const rez = [
    ["Distanța din durata ECHO (7.2), la 50 cm", F(t0) && F(T0) ? `${fx(MD.dDin(t0, T0), 2)} cm` : "—"],
    ["Eroarea medie HC-SR04 (25…200 cm)", F(o.errHC) ? `<span style="color:var(--accent)">${fx(o.errHC, 2)} %</span>` : "—"],
    ["Viteza sunetului (7.1): camera / încălzit", F(ecam.c) || F(ec.c) ? `${F(ecam.c) ? fx(ecam.c, 1) : "—"} / ${F(ec.c) ? fx(ec.c, 1) : "—"} m/s` : "—"],
    ["εd față de 20 °C (7.3), aer încălzit", F(ec.e) ? `<span style="color:var(--accent)">${fx(ec.e, 2)} %</span>` : "—"],
    ["d fără / cu compensare, aer încălzit", F(ec.d0) ? `${fx(ec.d0, 2)} / ${fx(ec.dc, 2)} cm` : "—"],
    ["Distanța minimă sigură JSN-SR04T", t.t73.jmin.dr !== "" ? `${t.t73.jmin.dr} cm` : "—"]
  ];
  const verdicte = [];
  if (F(o.errHC)) verdicte.push({ tip: o.errHC < 3 ? "ok" : "atentie", text: `HC-SR04 măsoară cu eroarea medie de ${fx(o.errHC, 2)} % între 25 și 200 cm.${F(o.err.d5.hc) ? ` La 5 cm eroarea relativă este ${fx(o.err.d5.hc, 1)} %: o abatere constantă de ≈ 0,5…1 cm (întârzierea detecției ecoului, poziția feței traductorului) contează mult la distanțe mici.` : ""}` });
  if (F(o.err.d5.jsn) || F(o.err.d10.jsn)) verdicte.push({ tip: "ok", text: "JSN-SR04T nu măsoară sub distanța lui minimă (oscilația liberă a traductorului unic după emisie maschează ecoul): la 5 și 10 cm afișează aproape aceeași valoare, ≈ 20…25 cm." });
  if (F(ec.e)) verdicte.push({ tip: "ok", text: `Încălzirea aerului cu ${F(ecam.c) ? fx(num(t.t72.cald.T) - num(t.t72.cam.T), 1) : "—"} °C mărește viteza sunetului cu ${fx(ec.e, 2)} % față de 20 °C; fără compensare distanța ar fi ${fx(ec.d0, 2)} cm, cu compensare ${fx(ec.dc, 2)} cm (≈ 0,18 %/°C).` });
  return { celule: cel, rezultate: rez, verdicte, titluGrafic: "Eroarea absolută a distanței măsurate în funcție de distanța reală",
    grafic: { xmin: 0, xmax: 210, ymin: 0, ymax: Math.max(3, ...ab(ph).map(x => x[1] * 1.15), ...ab(pj).map(x => Math.min(25, x[1]) * 1.1)), xlab: "distanța pe riglă [cm]", ylab: "|d − d riglă| [cm]",
      serii: [{ tip: "linie", pts: ab(ph), culoare: 0 }, { tip: "pct", pts: ab(ph), culoare: 0, r: 4 }, { tip: "linie", pts: ab(pj).map(([d, v]) => [d, Math.min(25, v)]), culoare: 1 }, { tip: "pct", pts: ab(pj).map(([d, v]) => [d, Math.min(25, v)]), culoare: 1, r: 4 }] },
    legenda: [["HC-SR04", "var(--serie-0)"], ["JSN-SR04T (limitat la 25 cm pe grafic)", "var(--serie-1)"]], principal: { eticheta: "eroarea medie HC-SR04 [%]", valoare: F(o.errHC) ? +o.errHC.toFixed(3) : null } };
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Montajul se alimentează numai la 5 V (portul USB al plăcii); conexiunile se fac și se modifică numai cu placa nealimentată.</li>
<li>Țintele se mută pe riglă fără a lovi modulele; căruciorul nu se lasă pe marginea mesei.</li>
<li>Buzzerul se folosește la volum redus (rezistorul serie, lucru de scurtă durată), pentru a nu deranja și a nu obosi auzul.</li>
<li>Aeroterma (sursa de aer cald) se acționează numai de cadrul didactic, departe de materiale inflamabile, fără a fi îndreptată spre persoane sau spre cablaje; nu se atinge grila caldă.</li></ul></div>
<h2>7.1. Scopul lucrării</h2>
<p>Măsurarea distanței cu senzori ultrasonici de tipul celor folosiți la asistența la parcare, determinarea timpului de propagare a ecoului pe osciloscop, a domeniului de măsurare și a influenței țintei, precum și compensarea vitezei sunetului cu temperatura aerului.</p>
<h2>7.2. Noțiuni teoretice</h2>
<p>Traductorul piezoceramic emite un tren scurt de impulsuri ultrasonice (40 kHz la modulele de laborator, 40…58 kHz la senzorii auto); unda se reflectă de obstacol și revine. Modulul ține ieșirea ECHO în 1 logic pe durata dintre emisie și sosirea ecoului (Fig. 7.1). Distanța este jumătate din drumul parcurs de sunet în timpul t<sub>ecou</sub>, cu viteza sunetului dependentă de temperatura aerului:</p>
<div class="ec"><span>c = 331,3 + 0,606 · ϑ &nbsp; [m/s], ϑ în °C</span><span class="nr">(7.1)</span></div>
<div class="ec"><span>d = c · t<sub>ecou</sub> / 2</span><span class="nr">(7.2)</span></div>
<div class="ec"><span>ε<sub>d</sub> = (c(ϑ) − c(ϑ<sub>ref</sub>)) / c(ϑ<sub>ref</sub>) · 100 &nbsp; [%]</span><span class="nr">(7.3)</span></div>
<p>Dacă programul folosește o viteză fixă (de exemplu cea de la 20 °C), la altă temperatură distanța afișată are eroarea relativă ε<sub>d</sub> (≈ 0,18 %/°C). Senzorii auto au un singur traductor pentru emisie și recepție: după emisie membrana mai oscilează un timp (oscilația liberă), în care ecoul nu poate fi deosebit – de aici distanța minimă de ≈ 20…25 cm. Ecoul scade cu distanța și cu unghiul țintei (reflexie speculară: o suprafață înclinată trimite unda în altă direcție) și este slab la materialele moi, poroase, care absorb ultrasunetele.</p>
<figure>${fig71()}<figcaption>Fig. 7.1. Impulsurile TRIG și ECHO ale modulului ultrasonic și timpul de ecou</figcaption></figure>
<pre class="cod">float dist(float tempC){ digitalWrite(TRIG,HIGH); delayMicroseconds(10); digitalWrite(TRIG,LOW);
  unsigned long t = pulseIn(ECHO,HIGH,30000); float c = 331.3+0.606*tempC;
  return c*t*1e-6/2*100; } // cm
// zone: &gt;100 cm liber; 50…100 ton rar; 25…50 ton des; &lt;25 continuu</pre>
<h2>7.3. Aparatură și echipamente</h2>
<ul><li>Module ultrasonice HC-SR04 (laborator) și JSN-SR04T (traductor etanș, de tip auto); senzor de temperatură DS18B20</li>
<li>Riglă de 1 m (două, pentru 2 m); ținte: cub de lemn 100 mm, panou de carton, panou metalic, țintă înclinabilă la 30° și 60°, țintă moale (burete)</li>
<li>Arduino Mega cu OLED, buzzer și LED-uri pentru zonele de avertizare; osciloscop; aerotermă mică (sursă de aer cald, acționată de cadrul didactic)</li></ul>
<h2>7.4. Modul de lucru (în simulator)</h2>
<ol><li>Cu osciloscopul pe ECHO se vizualizează impulsul a cărui durată este timpul de ecou, pentru o țintă la 50 cm (Tabelul 7.0).</li>
<li>Se măsoară distanțele de 5, 10, 25, 50, 100 și 200 cm cu ambele module; se calculează eroarea (Tabelul 7.1).</li>
<li>Se compară țintele și unghiurile la 50 cm și se determină distanța minimă a JSN-SR04T (Tabelul 7.3).</li>
<li>La aceeași distanță se măsoară cu și fără compensarea de temperatură, cu aerul camerei și cu aerul încălzit local (Tabelul 7.2).</li>
<li>Se verifică zonele de avertizare: tonul buzzerului și LED-urile (Tabelul 7.4).</li></ol>
<h2>7.7. Interpretarea rezultatelor</h2>
<ul><li>Eroarea relativă este mare la distanțe mici (abaterea constantă) și crește din nou la distanțe mari (ecou slab, zgomot).</li>
<li>JSN-SR04T are o distanță minimă de ≈ 20…25 cm din cauza oscilației libere a traductorului unic.</li>
<li>Fără compensare, eroarea crește cu ≈ 0,18 %/°C față de temperatura de referință.</li></ul>
<h2>7.8. Relevanță practică</h2>
<p>Senzorii de parcare (PDC), asistentul de parcare automată și detecția unghiului mort la viteză mică folosesc același principiu; ECU compensează temperatura (senzorul de temperatură exterioară), filtrează ecourile multiple, detectează murdăria sau gheața pe membrană (oscilația liberă se schimbă) și combină mai mulți senzori pentru localizarea obstacolului. Senzorii sunt prezentați în fila „Pe autovehicul (3D)”.</p>`;
function fig71() {
  const X0 = 50, W = 560, x = t => X0 + t / 4 * W;           // t în ms, fereastra 4 ms
  const tr = 0.4, r = tr + 0.46, e = r + 2.92;
  let s = `<svg viewBox="0 0 660 230" class="fig-svg" role="img" aria-label="Fig. 7.1"><g font-size="10" fill="currentColor">`;
  s += `<text x="${X0 - 44}" y="44">TRIG</text><path d="M${X0},50 L${x(tr)},50 L${x(tr)},20 L${x(tr) + 4},20 L${x(tr) + 4},50 L${X0 + W},50" fill="none" stroke="#c0492b" stroke-width="1.8"/>`;
  let b = ""; for (let i = 0; i < 16; i++) { const a = x(tr + 0.02) + i * 1.6; b += `${i ? "L" : "M"}${a.toFixed(1)},${i % 2 ? 98 : 78}`; }
  s += `<text x="${X0 - 44}" y="92">40 kHz</text><path d="M${X0},88 L${x(tr + 0.02)},88 ${b.replace("M", "L")} L${X0 + W},88" fill="none" stroke="#1f5f9e" stroke-width="1.2"/><text x="${x(tr) + 34}" y="76">8 perioade (200 µs)</text>`;
  s += `<text x="${X0 - 44}" y="144">ECHO</text><path d="M${X0},150 L${x(r)},150 L${x(r)},120 L${x(e)},120 L${x(e)},150 L${X0 + W},150" fill="none" stroke="#2e7d32" stroke-width="1.8"/>`;
  s += `<line x1="${x(r)}" y1="172" x2="${x(e)}" y2="172" stroke="currentColor"/><path d="M${x(r)},168 v8 M${x(e)},168 v8" stroke="currentColor"/><text x="${(x(r) + x(e)) / 2}" y="188" text-anchor="middle">t<tspan font-size="7">ecou</tspan> ≈ 2,92 ms la 50 cm (20 °C) → d = c·t/2</text>`;
  s += `<text x="${x(e) + 6}" y="116">ecoul sosit</text><text x="${x(tr) - 4}" y="14" text-anchor="middle">10 µs</text><text x="${X0}" y="220">0</text><text x="${X0 + W}" y="220" text-anchor="end">4 ms</text>`;
  return s + `</g></svg>`;
}
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Ecoul unei ținte sosește după t = 2,92 ms la ϑ = 20 °C:</p>
<div class="ec"><span>c<sub>20</sub> = 331,3 + 0,606 · 20 = 343,4 m/s</span><span class="nr">(7.4)</span></div>
<div class="ec"><span>d = 343,4 · 2,92 · 10<sup>−3</sup> / 2 = 0,501 m</span><span class="nr">(7.5)</span></div>
<div class="ec"><span>la 35 °C: c<sub>35</sub> = 352,5 m/s; ε<sub>d</sub> = (352,5 − 343,4) / 343,4 · 100 = 2,6 %</span><span class="nr">(7.6)</span></div>
<p>Eroarea de 2,6 % înseamnă ≈ 1,3 cm la 50 cm, dacă programul nu compensează temperatura.</p>
<div class="problema"><h3>Problema 1</h3><p>Un senzor de parcare fără compensare este calibrat la 20 °C. Ce distanță afișează, iarna la −10 °C, pentru un obstacol aflat la 30 cm?</p><details class="sol"><summary>Rezolvare</summary><p>c(−10) = 325,24 m/s; t = 2·0,30/325,24 = 1,845 ms; d afișat = 343,42·1,845·10<sup>−3</sup>/2 = 0,3168 m ≈ 31,7 cm (cu 5,3 % mai mult – obstacolul pare mai departe, situația periculoasă).</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Ce rezoluție în distanță dă funcția pulseIn (1 µs) la 20 °C? Dar timeout-ul de 30 ms?</p><details class="sol"><summary>Rezolvare</summary><p>Δd = c·Δt/2 = 343,4 · 10<sup>−6</sup>/2 = 0,17 mm; d<sub>max</sub> = 343,4 · 0,030/2 = 5,15 m.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Oscilația liberă a traductorului JSN-SR04T durează 1,3 ms după începutul emisiei. Care este distanța minimă măsurabilă la 20 °C?</p><details class="sol"><summary>Rezolvare</summary><p>d<sub>min</sub> = c · t / 2 = 343,4 · 1,3 · 10<sup>−3</sup>/2 = 0,223 m ≈ 22 cm.</p></details></div>`;
}
const INTREBARI = [
  ["De ce distanța este jumătate din drumul parcurs de sunet?", "Unda parcurge drumul de la traductor la obstacol și înapoi: în timpul t<sub>ecou</sub> sunetul străbate de două ori distanța, deci d = c·t/2."],
  ["Ce eroare apare la −10 °C fără compensare de temperatură?", "c(−10) = 331,3 − 6,06 = 325,24 m/s față de 343,42 m/s la 20 °C: ε<sub>d</sub> = −5,3 %, adică distanța afișată este cu ≈ 5,6 % mai mare decât cea reală (≈ 2,8 cm la 50 cm) – obstacolul pare mai departe."],
  ["De ce senzorul nu măsoară distanțe foarte mici?", "Senzorul cu un singur traductor (JSN-SR04T, senzorii auto) nu poate recepționa cât timp membrana mai oscilează după emisie (oscilația liberă, ≈ 1…1,5 ms): ecoul unui obstacol apropiat sosește în acest interval și nu se poate deosebi. La modulele cu emițător și receptor separate apar cuplajul direct și durata trenului de 8 impulsuri; distanța minimă este mai mică (≈ 2 cm)."],
  ["Ce ținte sunt greu de detectat?", "Suprafețele înclinate (reflexia speculară trimite unda în altă parte), obiectele subțiri sau mici (stâlpi, lanțuri, bare), materialele moi și poroase (burete, zăpadă afânată, haine), țintele foarte joase sau foarte înalte față de fascicul și obstacolele aflate prea aproape (zona moartă)."],
  ["Ce praguri ale zonelor de avertizare ați propune pentru un autoturism?", "Uzual: avertizarea începe la ≈ 120…150 cm în spate (≈ 80…100 cm în față), tonul se îndesește progresiv, iar tonul continuu apare la ≈ 30 cm, peste distanța minimă de măsurare și cu rezervă pentru oprire; pragurile țin seama de viteza de manevră și de compensarea temperaturii."]
];
const TEST = [
  { q: "Distanța măsurată cu un senzor ultrasonic este:", o: ["c · t", "c · t / 2", "2 · c · t", "t / c"], c: 1, e: "Sunetul parcurge distanța dus-întors." },
  { q: "Viteza sunetului în aer la 20 °C este aproximativ:", o: ["300 m/s", "331 m/s", "343 m/s", "1500 m/s"], c: 2, e: "c = 331,3 + 0,606 · 20 = 343,4 m/s." },
  { q: "Fără compensare, încălzirea aerului face ca distanța afișată să fie:", o: ["mai mare decât cea reală", "mai mică decât cea reală", "aceeași", "zero"], c: 1, e: "Sunetul ajunge mai repede, t scade, iar calculul cu c la 20 °C dă o distanță mai mică." },
  { q: "Distanța minimă a senzorului cu traductor unic este determinată de:", o: ["frecvența de 40 kHz", "oscilația liberă a membranei după emisie", "rezoluția pulseIn", "temperatura aerului"], c: 1, e: "Ecoul sosit în timpul oscilației libere nu poate fi deosebit." },
  { q: "O țintă plană înclinată la 60° față de axa senzorului:", o: ["dă un ecou mai puternic", "poate să nu fie detectată (unda se reflectă în altă direcție)", "se măsoară la jumătate din distanță", "nu influențează măsurarea"], c: 1, e: "Reflexia speculară trimite unda în afara fasciculului receptorului." },
  { q: "Aeroterma din laborator se acționează:", o: ["de oricare student", "numai de cadrul didactic, departe de materiale inflamabile", "numai cu montajul nealimentat", "îndreptată spre modulul Arduino"], c: 1, e: "NSSM." }
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
.tk-osc, .tk-pompa { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; padding:.35rem .6rem; font:12.5px system-ui,sans-serif; color:#333; border-bottom:1px solid #eee; }
.tk-osc button, .tk-pompa button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.2rem .55rem; font:600 12px system-ui; cursor:pointer; }
.tk-osc button.activ, .tk-pompa button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; } .tk-pompa button.slab { background:#fff3e0; border-color:#ff9800; color:#8a4b00; } .tk-pompa button.primar { background:#c62828; border-color:#c62828; color:#fff; }
.tk-osc select { font:12px system-ui; max-width:15rem; } .osc-v { font:700 12px ui-monospace,monospace; background:#0f1a12; color:#7dff8a; padding:.1rem .4rem; border-radius:3px; }
.tk-pompa .sep { width:1px; height:1.2rem; background:#ddd; margin:0 .3rem; }
.tk-afis { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:.3rem .8rem; padding:.4rem .6rem; font:12px system-ui,sans-serif; border-bottom:1px solid #eee; } .tk-afis div { display:flex; justify-content:space-between; gap:.5rem; } .tk-afis span { color:#777; } .tk-afis b { font-family:ui-monospace,monospace; }
.tk-ajutor { margin:.3rem .6rem; font:11px system-ui,sans-serif; color:#888; }
.tk-insp { position:absolute; right:.6rem; top:.6rem; width:300px; background:#fff; border:1px solid #d8dde3; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.15); font:12.5px system-ui,sans-serif; color:#333; z-index:4; }
.tk-insp-t { display:flex; justify-content:space-between; align-items:center; padding:.5rem .6rem; font-weight:700; border-bottom:1px solid #eee; } .tk-insp-t button { border:0; background:none; cursor:pointer; color:#777; }
.tk-insp-r { display:flex; justify-content:space-between; gap:.6rem; padding:.3rem .6rem; } .tk-insp-r span { color:#777; } .tk-insp-r b { font-weight:600; text-align:right; }
.tk-jos { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); border-top:1px solid #e3e3e3; } .tk-jos:has(.tk-cod[hidden]) { grid-template-columns:1fr; }
.tk-cod { background:#fff; display:flex; flex-direction:column; min-width:0; } .tk-cod[hidden] { display:none; }
.tk-ser { border-left:1px solid #e3e3e3; display:flex; flex-direction:column; min-width:0; background:#fff; }
.tk-cod-sus { display:flex; gap:.4rem; padding:.4rem .5rem; border-bottom:1px solid #eee; align-items:center; font:12px system-ui,sans-serif; color:#555; }
#tk-cod { margin:0; padding:.5rem .3rem; overflow:auto; background:#fff; color:#1f1f1f; font:11.5px/1.5 ui-monospace,Consolas,"Courier New",monospace; white-space:pre; max-height:440px; }
.cd-ln { display:inline-block; width:2.2em; color:#a8a8a8; text-align:right; margin-right:.8em; user-select:none; }
.cd-k { color:#0b62b5; font-weight:600; } .cd-s { color:#b2502b; } .cd-c { color:#6a8759; font-style:italic; } .cd-n { color:#7a3fb0; }
.cd-f { background:#fff8d6; color:#5b3d00; border:1px solid #e0b84a; border-radius:3px; font:inherit; padding:0 .2rem; } .cd-f:disabled { background:#f1f1f1; color:#777; border-color:#ccc; }
.tk-blocat { background:#fff4e5; color:#8a5300; font:12px system-ui,sans-serif; padding:.35rem .6rem; border-bottom:1px solid #f1d7a8; }
#tk-serial { margin:0; flex:1 1 auto; min-height:120px; max-height:200px; overflow:auto; background:#fff; color:#222; padding:.4rem .6rem; font:11.5px/1.4 ui-monospace,Consolas,monospace; }
#tk-plot { width:100%; height:170px; display:block; border-top:1px solid #eee; }
.tk-ser-in { display:flex; gap:.3rem; padding:.35rem .5rem; border-top:1px solid #eee; } .tk-ser-in input { flex:1; font:12px ui-monospace,monospace; padding:.2rem .4rem; border:1px solid #cfd4da; border-radius:4px; } .tk-ser-in button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.2rem .6rem; font:12px system-ui; cursor:pointer; color:#333; }
.fw { font-size:.8rem; } .fw b { font-family:ui-monospace,monospace; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; }
.fig-svg { width:100%; max-width:680px; height:auto; color:var(--text); }
.tk-pas-banda { position:absolute; left:.6rem; bottom:.5rem; max-width:min(560px,62%); background:rgba(20,119,209,.93); color:#fff; border-radius:6px; padding:.4rem .6rem; font:12.5px/1.35 system-ui,sans-serif; box-shadow:0 3px 10px rgba(0,0,0,.2); pointer-events:none; z-index:2; }
.tk-pas-banda:empty { display:none; }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; }
.pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas:not(.activ) .pas-corp { display:none; }
.pas-but { display:flex; flex-direction:column; gap:.35rem; }
.rand-mic { display:flex; flex-wrap:wrap; gap:.3rem; margin:.25rem 0; } .rand-mic button { padding:.25rem .55rem; font-size:.8rem; }
.sim-grila:fullscreen .sim-scena.tk, .sim-grila.ecran-plin .sim-scena.tk { display:block; }
@media (max-width:900px){ .tk-jos { grid-template-columns:1fr; } .tk-ser { border-left:0; border-top:1px solid #e3e3e3; } .tk-pas-banda { position:static; max-width:none; border-radius:0; } }
</style>`;
const DET = ["da", "intermitent", "nu"];
Cadru.porneste({
  disc: "MAM1", nr: 7, cod: "mam1-l7",
  titlu: "Senzori ultrasonici de parcare: timpul de propagare și compensarea cu temperatura",
  scurt: "Senzori ultrasonici de parcare",
  subtitlu: "Laborator virtual – modulele HC-SR04 și JSN-SR04T pe rigla de 2 m, ținte de lemn, carton, metal și burete, DS18B20 și aeroterma, Arduino Mega cu OLED, buzzer și LED-uri, osciloscopul pe TRIG / ECHO: timpul de ecou, domeniul de măsurare, ținta și compensarea vitezei sunetului cu temperatura",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261028); },
  date: [{ k: "dref", et: "d riglă pentru 7.0 și 7.2 [cm]", v: MD.DREF, fix: true }, { k: "c20", et: "c(20 °C) [m/s]", v: 343.42, fix: true }],
  tabele: [
    { id: "t70", titlu: "Tabelul 7.0. Impulsul ECHO pe osciloscop (HC-SR04, ținta la 50 cm)", antetRand: "Măsurare", nota: "t = CH2 +Width (durata ECHO); ϑ de pe OLED (DS18B20); c din (7.1), d = c·t/2 (7.2). Comparați d cu rigla.",
      randuri: [{ k: "e50", et: "d riglă = 50 cm" }],
      coloane: [{ k: "t", t: "t<sub>ecou</sub> [µs]", intrare: true }, { k: "T", t: "ϑ [°C]", intrare: true }, { k: "c", t: "c [m/s]" }, { k: "d", t: "d = c·t/2 [cm]" }] },
    { id: "t71", titlu: "Tabelul 7.1. Distanța măsurată", antetRand: "d riglă [cm]", nota: "Ținta reflectantă la 0°, aerul camerei; d din program (media pe 0,5 s, cu compensarea de temperatură). Eroarea = (d − d<sub>riglă</sub>)/d<sub>riglă</sub>·100.",
      randuri: MD.DIST.map(d => ({ k: "d" + d, et: String(d) })),
      coloane: [{ k: "hc", t: "d HC-SR04 [cm]", intrare: true }, { k: "jsn", t: "d JSN-SR04T [cm]", intrare: true }, { k: "ehc", t: "Eroare HC [%]" }, { k: "ejsn", t: "Eroare JSN [%]" }] },
    { id: "t73", titlu: "Tabelul 7.3. Ținta, unghiul și distanța minimă", antetRand: "Ținta", nota: "La 50 cm: ecoul HC-SR04 de la țintă observat 16 măsurări (≈ 2 s): da / intermitent / nu (atunci se măsoară peretele sau nimic). Ultimul rând: cea mai mică distanță la care JSN-SR04T urmărește rigla (±1,5 cm).",
      randuri: [...MD.CAZURI.map(([t, u], i) => ({ k: "c" + i, et: `${MD.TINTE[t].et}, ${u}°` })), { k: "jmin", et: "JSN-SR04T – distanța minimă sigură" }],
      coloane: [{ k: "dr", t: "d riglă [cm]", intrare: true }, { k: "hc", t: "d HC [cm]", intrare: true }, { k: "jsn", t: "d JSN [cm]", intrare: true }, { k: "det", t: "Ecou de la țintă", intrare: true, tip: "select", optiuni: DET }] },
    { id: "t72", titlu: "Tabelul 7.2. Compensarea cu temperatura (d riglă = 50 cm)", antetRand: "Condiții", nota: "ϑ – DS18B20; t – durata medie a ecoului HC-SR04 din program; d fără compensare cu c(20 °C), cu compensare cu c(ϑ). ε<sub>d</sub> din (7.3) față de 20 °C.",
      randuri: [{ k: "cam", et: "aerul camerei" }, { k: "cald", et: "aer încălzit local" }],
      coloane: [{ k: "T", t: "ϑ [°C]", intrare: true }, { k: "t", t: "t<sub>ecou</sub> [µs]", intrare: true }, { k: "d0", t: "d fără comp. [cm]", intrare: true }, { k: "dc", t: "d cu comp. [cm]", intrare: true }, { k: "c", t: "c(ϑ) [m/s]" }, { k: "e0", t: "Eroare fără [%]" }, { k: "ec", t: "Eroare cu [%]" }, { k: "eps", t: "ε<sub>d</sub> [%]" }] },
    { id: "t74", titlu: "Tabelul 7.4. Zonele de avertizare", antetRand: "Zona", nota: "Pragurile din program (implicit 100 / 50 / 25 cm). d măsurat = HC-SR04; semnalul = tonul buzzerului; LED-ul aprins.",
      randuri: MD.ZONE.map((z, i) => ({ k: "z" + i, et: z })),
      coloane: [{ k: "dr", t: "d riglă [cm]", intrare: true }, { k: "dm", t: "d măsurat [cm]", intrare: true }, { k: "sem", t: "Semnal sonor", intrare: true, tip: "select", optiuni: MD.ZONE }, { k: "led", t: "LED", intrare: true, tip: "select", optiuni: ["verde", "galben", "roșu"] }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaMAM7,
  intrebari() {
    return [
      { id: "q1", u: "%", text: "Eroarea relativă ε<sub>d</sub> (în valoare absolută) a unui senzor necompensat, calibrat la 20 °C, când aerul are −10 °C (Întrebarea 2):", textSimplu: "εd la −10 °C" },
      { id: "q2", u: "cm", text: "Distanța pentru t<sub>ecou</sub> = 2,92 ms la 20 °C (exemplul rezolvat):", textSimplu: "d pentru 2,92 ms" },
      { id: "q3", u: "%", text: "ε<sub>d</sub> față de 20 °C pentru aerul încălzit, din temperatura măsurată (Tabelul 7.2):", textSimplu: "εd aer încălzit" },
      { id: "q4", u: "%", text: "Eroarea medie (în valoare absolută) a HC-SR04 între 25 și 200 cm (Tabelul 7.1):", textSimplu: "eroarea medie HC" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    if (t.t70.e50.t === "") l.push("Tabelul 7.0: durata ECHO");
    const a = MD.DIST.filter(d => t.t71["d" + d].hc !== "").length; if (a < 6) l.push(`Tabelul 7.1: ${a}/6 distanțe`);
    const b = [...MD.CAZURI.map((_, i) => "c" + i), "jmin"].filter(k => t.t73[k].det !== "").length; if (b < 7) l.push(`Tabelul 7.3: ${b}/7 rânduri`);
    const c = ["cam", "cald"].filter(k => t.t72[k].T !== "").length; if (c < 2) l.push(`Tabelul 7.2: ${c}/2 condiții`);
    const z = MD.ZONE.filter((_, i) => t.t74["z" + i].dm !== "").length; if (z < 4) l.push(`Tabelul 7.4: ${z}/4 zone`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t70.e50, { t: "2920", T: "20.00" }); Object.assign(t.t71.d50, { hc: "50.62", jsn: "50.95" }); Object.assign(t.t72.cald, { T: "35.00", t: "2847.0", d0: "48.89", dc: "50.18" }); },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul la scară reală: rigla pe masă cu ținta pe cărucior (la distanțele mari ținta trece pe un stativ, după marginea mesei), suportul cu HC-SR04 și JSN-SR04T, DS18B20 în aerul de pe traseu, aeroterma, placa de test cu LED-urile zonelor și buzzerul, Arduino Mega cu OLED, osciloscopul cu sondele pe TRIG / ECHO și laptopul. Montajul urmărește simulatorul: ținta se mută cu distanța și unghiul aleși, fasciculul HC-SR04 se vede cât timp programul rulează, LED-urile și ecranele sunt cele din planșă.</p>`,
    modul: "montaj3d.js?v=2", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, -14, 1300, 814], construieste: L => montaj3dL7(L), cam: VEDERI.tot[0], tinta: VEDERI.tot[1], laClic: k => laClic3d(k),
      vederi: { tot: [...VEDERI.tot, "Ansamblu"], rigla: [...VEDERI.rigla, "Rigla și ținta"], osc: [...VEDERI.osc, "Osciloscopul"], aero: [...VEDERI.aero, "Aeroterma și DS18B20"], bb: [...VEDERI.bb, "LED-uri și Mega"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Senzorii de parcare pe autovehicul",
    intro: `<p>Senzorii de parcare (PDC) sunt montați în barele de protecție, de regulă câte 4 în spate și 4…6 în față; fiecare are un traductor piezoceramic etanș, ca JSN-SR04T, și transmite distanța (sau timpul de ecou) către modulul de asistență la parcare, care compensează temperatura exterioară și comandă avertizarea sonoră și grafică. Selectați senzorul de parcare spate în machetă: amplasarea, mufa și semnalul.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "pdcS1" })
  },
  atelierSenzori: { intro: `<p>Senzorul de parcare este preselectat: modelul 3D, mufa și verificările (semnalul de ecou, membrana, influența temperaturii). Puteți alege și alți senzori din listă.</p>`, optiuni: { initial: "pdcS1" } },
  referat: {
    scop: "Măsurarea distanței cu senzori ultrasonici de parcare: timpul de ecou pe osciloscop, domeniul de măsurare, influența țintei și a unghiului, distanța minimă, compensarea vitezei sunetului cu temperatura și zonele de avertizare.",
    relatii: "c = 331,3 + 0,606·ϑ; &nbsp; d = c·t<sub>ecou</sub>/2; &nbsp; ε<sub>d</sub> = (c(ϑ) − c(ϑ<sub>ref</sub>))/c(ϑ<sub>ref</sub>)·100.",
    varianta: () => "Exemplarul propriu al fiecărui student: temperatura camerei și a aerului încălzit, eroarea DS18B20, întârzierile proprii ale celor două module, distanța minimă a JSN-SR04T și reflectanța țintelor.",
    indicatii: "Comparați distanța din durata ECHO cu rigla (întârzierea proprie a modulului), eroarea la distanțe mici și mari, comportarea JSN-SR04T sub distanța minimă, ținta înclinată și buretele, efectul aerului încălzit cu și fără compensare și pragurile zonelor…"
  },
  subsol: "Modelul: d = c(ϑ)·t/2 cu întârzierea proprie a detecției ecoului, jitter de câteva µs, ecoul ∝ R·e<sup>−(θ/θb)²</sup>·(30/d)<sup>1,2</sup> comparat cu pragul modulului, peretele la 3,1 m, distanța minimă a traductorului unic, aerul încălzit (ordinul 1) și inerția DS18B20. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      ${ghidSectiune()}
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Stand</b> · MAM I – Lucrarea 7</span>
        <button type="button" id="tk-fit" title="Închide fereastra de detalii">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div><div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-pompa" id="tk-pompa"></div>
      <div class="tk-osc" id="tk-osc"></div>
      <div class="tk-afis" id="afis"></div>
      <p class="tk-ajutor">Trageți căruciorul pe riglă sau folosiți butoanele „Distanța” · clic pe pinii D30 / D32 (CH1) și D31 / D33 (CH2) · clic pe buzzer = volumul · aeroterma o pornește numai cadrul didactic · clic pe celelalte componente = detalii. Montajul real în 3D este în fila „Montajul real (3D)”.</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – Arduino Mega 2560</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite (de ex. t)" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div>
          <div class="tk-cod-sus"><b>Plotter serial – distanțele</b></div>
          <canvas id="tk-plot" aria-label="Plotterul serial: distanțele HC și JSN"></canvas></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Programul și mesajele</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Lucrați în ordinea pașilor din chenarul de deasupra planșei. Valorile intră în tabele numai din aparate (osciloscop, DS18B20) și din program.</p>
    </aside>
  </div>`,
    init(C) {
      initTemp(); afiseazaCod(); actualizeazaFw(); oscCtl(); actualizeaza();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => inspector(null));
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) comanda(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $$("#tk-svg [data-k]").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); if (g.dataset.k !== "tinta") laClic3d(g.dataset.k); }));
      $("#carut7").addEventListener("dblclick", () => inspector("tinta"));
      tragereTinta();
      C.mesaj("Urmați pașii din chenarul „Desfășurarea lucrării – pas cu pas”; începeți cu pregătirea montajului (NSSM).", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.p1ok = false; sim.p3ok = false; sim.giCabVazut = false; Object.assign(sim, { serial: [], ist: [], d: 50, tinta: "lemn", unghi: 0, aero: false, Tp: null, Tds: null, vol: "mare", viteza: 1, esecJ: {}, buz: false }); initTemp(); },
    cadru(dt, C, vizibil) {
      const acum = performance.now(), d = Math.min(dt || 0.016, 0.1);
      sim.tS += d; pasTermic(d); if (sim.run) pasProgram(d); pasBuzzer();
      if (!vizibil) { if (C.tabActiv === "anim" && acum - (this._t3 || 0) > 120) { this._t3 = acum; if (sim.osc.ruleaza) achizitie(); planseAfis(); sincron3d(); } return; }
      if (acum - (this._to || 0) > 80) { this._to = acum; if (sim.osc.ruleaza && acum - (this._ta || 0) > 250) { this._ta = acum; achizitie(); } planseAfis(); }
      if (acum - (this._ts || 0) > 400) { this._ts = acum; afisaje(); plotter(); sincron3d(); actualizeazaPasi(); panouDacaSchimbat();
        C.stare(1, sim.run ? "programul rulează" : "programul oprit", sim.run ? "inc" : ""); C.stare(2, `ținta ${sim.d} cm · ϑ ≈ ${fx(sim.Tds, 1)} °C`); }
    },
    redeseneaza() { plotter(); },
    formule() {
      const r = [], v = sim.pr && sim.pr.last; if (!v || !v.tH) return r;
      r.push(["Viteza sunetului (7.1)", `c = 331,3 + 0,606 · ${fx(v.T, 2)} = <span class="rez">${fx(MD.c(v.T), 2)} m/s</span>`]);
      r.push(["Distanța (7.2)", `d = ${fx(MD.c(v.T), 2)} · ${fx(v.tH, 1)}·10<sup>−6</sup> / 2 = <span class="rez">${fx(v.dcH, 2)} cm</span>`]);
      r.push(["Eroarea fără compensare (7.3)", `ε<sub>d</sub> = (${fx(MD.c(v.T), 2)} − 343,42)/343,42 · 100 = <span class="rez">${fx((MD.c(v.T) - MD.C20) / MD.C20 * 100, 2)} %</span>`]);
      return r;
    }
  }
});
let _panouK = "";
function panouDacaSchimbat() { const k = [sim.d, sim.tinta, sim.unghi, sim.aero, sim.vol, sim.viteza].join(); if (k !== _panouK) { _panouK = k; panou(); } }

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL7(L) {
  const { THREE, V3, mm, M } = L, R = 0xe53935, N = 0x222222;
  const mat = o => new THREE.MeshStandardMaterial(o);
  const X0 = -0.70, ZR = 0.25, YH3 = 0.075, YJ3 = 0.115;
  /* rigla de 1,5 m pe masă (cu gradații) */
  const e = L.ecran(4096, 64); { const x = e.x; x.fillStyle = "#f4d35e"; x.fillRect(0, 0, 4096, 64); x.fillStyle = "#222"; for (let i = 0; i <= 1500; i += 10) { const u = i / 1500 * 4096, h = i % 100 === 0 ? 30 : i % 50 === 0 ? 22 : 12; x.fillRect(u, 0, i % 100 ? 1.5 : 2.5, h); if (i % 100 === 0) { x.font = "bold 20px sans-serif"; x.fillText(String(i / 10), u + 4, 54); } } e.t.needsUpdate = true; }
  const rig = L.box(1.5, mm(3), mm(32), mat({ color: 0xf4d35e, roughness: 0.6 }), L.sc, X0 + 0.75, mm(1.5), ZR + mm(38), mm(0.5)); L.k_(rig, "rigla", "Rigla (2 × 1 m); originea la fața traductoarelor");
  L.plan(e.t, 1.5, mm(31), L.sc, X0 + 0.75, mm(3.05), ZR + mm(38));
  /* suportul cu modulele */
  const S = L.grup([X0, 0, ZR]);
  L.box(mm(70), mm(6), mm(80), M.alu, S, mm(-40), mm(3), 0, mm(1)); L.box(mm(6), 0.17, mm(40), M.alu, S, mm(-30), 0.085, 0, mm(1));
  const hc = L.box(mm(2), mm(20), mm(45), M.pcbA, S, mm(-18), YH3, 0, mm(0.4)); L.k_(hc, "hc", "HC-SR04 (emițător T și receptor R separate, 40 kHz): TRIG D30, ECHO D31");
  [-13, 13].forEach(dz => { const c = L.cyl(mm(8), mm(8), mm(12), M.alu, S, mm(-11), YH3, mm(dz), "x", 28); L.k_(c, "hc", "Traductorul piezoceramic al HC-SR04 (plasa metalică)"); L.cyl(mm(6.5), mm(6.5), mm(0.6), M.negruMat, S, mm(-4.8), YH3, mm(dz), "x", 24); });
  L.box(mm(6), mm(3), mm(10), M.crom, S, mm(-17), YH3 + mm(6), 0, mm(1));
  const js = L.cyl(mm(11), mm(11), mm(26), M.negru, S, mm(-13), YJ3, 0, "x", 32); L.k_(js, "jsn", "Traductorul etanș al JSN-SR04T (tip senzor de parcare auto): TRIG D32, ECHO D33");
  L.cyl(mm(9), mm(9), mm(0.6), M.negruMat, S, mm(0.4), YJ3, 0, "x", 28);
  const jb = L.box(mm(41), mm(1.6), mm(28), M.pcbA, L.sc, X0 + 0.06, mm(9), ZR - 0.11, mm(0.4)); L.k_(jb, "jsn", "Placa electronică a JSN-SR04T (cablul de 2,5 m spre traductor)");
  L.tub([[X0 - mm(26), YJ3, ZR], [X0 - 0.05, YJ3 - 0.02, ZR - 0.03], [X0 + 0.02, mm(14), ZR - 0.08], [X0 + 0.04, mm(10), ZR - 0.11]], mm(2), M.negru);
  /* DS18B20 pe un stâlpișor în aerul de pe traseu */
  L.cyl(mm(2), mm(2), 0.16, M.alu, L.sc, X0 + 0.06, 0.08, ZR - 0.05, "y", 10);
  const ds = L.cyl(mm(2.5), mm(2.5), mm(5), M.negru, L.sc, X0 + 0.06, 0.165, ZR - 0.035, "z", 16); L.k_(ds, "ds", "DS18B20 (TO-92) în aerul dintre modul și țintă: D22, pull-up 4,7 kΩ");
  /* fasciculul HC-SR04 (con translucid) */
  const conG = new THREE.Group(); conG.position.set(X0, YH3, ZR); conG.rotation.z = -Math.PI / 2; L.sc.add(conG);
  const geoC = new THREE.CylinderGeometry(1, 0, 1, 32, 1, true); geoC.translate(0, 0.5, 0);
  const con = new THREE.Mesh(geoC, new THREE.MeshBasicMaterial({ color: 0x42a5f5, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); conG.add(con);
  /* căruciorul cu țintele (pe stativ după marginea mesei) */
  const T = L.grup([X0 + 0.5, 0, ZR]);
  L.box(mm(110), mm(14), mm(70), mat({ color: 0x455a64, roughness: 0.5 }), T, mm(55), mm(10), 0, mm(2));
  [[10, -30], [100, -30], [10, 30], [100, 30]].forEach(([dx, dz]) => L.cyl(mm(6), mm(6), mm(6), M.cauciuc, T, mm(dx), mm(5), mm(dz), "z", 16));
  const stativ = new THREE.Group(); T.add(stativ); L.cyl(mm(9), mm(9), 0.78, M.negru, stativ, mm(55), -0.39, 0, "y", 16); [0, 2.1, 4.2].forEach(a => { const p = L.cyl(mm(5), mm(5), 0.82, M.negru, stativ, mm(55) + Math.cos(a) * 0.14, -0.4, Math.sin(a) * 0.14, "y", 10); p.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); });
  const TG = new THREE.Group(); TG.position.set(0, mm(17), 0); T.add(TG);
  const ti = {
    lemn: L.box(0.1, 0.1, 0.1, mat({ color: 0xd7a86e, roughness: 0.75 }), TG, 0.05, 0.05, 0, mm(2)),
    carton: L.box(mm(5), 0.17, 0.2, mat({ color: 0xb08355, roughness: 0.9 }), TG, mm(2.5), 0.085, 0, mm(1)),
    metal: L.box(mm(2), 0.17, 0.2, M.alu, TG, mm(1), 0.085, 0, mm(0.5)),
    burete: L.box(0.09, 0.11, 0.12, mat({ color: 0xffe066, roughness: 1 }), TG, 0.045, 0.055, 0, mm(8))
  };
  Object.entries(ti).forEach(([k, o]) => L.k_(o, "tinta", `Ținta: ${MD.TINTE[k].et}`));
  /* aeroterma (numai cadrul didactic), suflă spre traseul ultrasunetelor */
  const A = L.grup([-0.45, 0, 0.02]);
  const ab = L.box(0.13, 0.15, 0.1, mat({ color: 0xd9822b, roughness: 0.5 }), A, 0, 0.085, 0, mm(10)); L.k_(ab, "aero", "Aeroterma (sursă de aer cald) – numai cadrul didactic; clic = pornire / oprire");
  L.box(0.1, 0.09, mm(4), M.negru, A, 0, 0.095, 0.05, mm(2));
  const grila = L.box(0.096, 0.086, mm(2), mat({ color: 0x3b2a1a, emissive: 0xff3d00, emissiveIntensity: 0 }), A, 0, 0.095, 0.053, mm(1));
  const flux = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7043, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  flux.rotation.x = Math.PI / 2; flux.position.set(-0.45, 0.095, 0.16); L.sc.add(flux);
  /* placa de test cu LED-urile zonelor și buzzerul; Arduino Mega, OLED, laptopul, osciloscopul */
  const bb = L.placaTest([-0.05, 0, 0.06], { coloane: 30, et: "Placa de test: LED-urile zonelor (D34…D36, 220 Ω) și buzzerul (D8, 100 Ω)" });
  const LED = [[6, 0x2e9e44, "D34"], [12, 0xf2b705, "D35"], [18, 0xd32f2f, "D36"]].map(([c, cul, p]) => {
    L.rezistor(bb.gaura(c + 1, "f"), bb.gaura(c + 1, "j"), 220); const l = L.led(bb.gaura(c, "e"), bb.gaura(c + 1, "e"), cul, { k: "bb", et: `LED ${p}` }); return { l, p, a: bb.gaura(c, "a") }; });
  const bz = L.cyl(mm(6), mm(6), mm(9), M.negru, L.sc, ...bb.gaura(25, "d").toArray().map((v, i) => i === 1 ? v + mm(4.5) : v), "y", 24); L.k_(bz, "buzzer", "Buzzerul (D8 prin 100 Ω) – clic = volumul");
  L.rezistor(bb.gaura(27, "f"), bb.gaura(27, "j"), 100);
  const MG = L.arduinoMega([0.17, 0, 0.06]), OL = L.oled([0.33, 0, 0.13], { ecran: [940, 584, 210, 132] });
  const PC = L.laptop([0.5, 0, -0.18], { roty: -0.4, cod: () => L.textCod(), titlu: () => "PlatformIO – parcare_us.cpp" });
  L.cabluUSB(MG.pin("D0").clone().set(0.17 - 0.06, 0.009, 0.045), PC.usb);
  const O = L.osciloscop([-0.25, 0, -0.25], { ecran: [40, 458, 416, 296] });
  /* firele */
  const pinHC = i => L.lume(S, V3(mm(-20), YH3 - mm(10), mm(-4.5 + i * 3)));
  [["5V", R], ["D30", 0xff9800], ["D31", 0xffeb3b], ["GND", N]].forEach(([n, c], i) => L.fir(pinHC(i), MG.pin(n), c, { h: 60 }));
  const pinJ = i => L.lume(jb, V3(mm(-20), mm(1), mm(-4.5 + i * 3)));
  [["5V", R], ["D32", 0xff6f00], ["D33", 0xfdd835], ["GND2", N]].forEach(([n, c], i) => L.fir(pinJ(i), MG.pin(n), c, { h: 50 }));
  L.fir(V3(X0 + 0.06, 0.16, ZR - 0.035), MG.pin("D22"), 0x43a047, { h: 40 });
  LED.forEach(x => L.fir(x.a, MG.pin(x.p), 0x00897b, { h: 30 }));
  L.fir(bb.gaura(25, "a"), MG.pin("D8"), 0x8e24aa, { h: 30 });
  [[0, "5V", R], [1, "GND", N], [2, "D20", 0x1e88e5], [3, "D21", 0x43a047]].forEach(([i, n, c]) => L.fir(OL.pin(i), MG.pin(n), c, { h: 26 }));
  /* sondele osciloscopului */
  const TPS = { trigH: () => MG.pin("D30"), echoH: () => MG.pin("D31"), trigJ: () => MG.pin("D32"), echoJ: () => MG.pin("D33") };
  const sd = [L.sonda(O.ch[0], 0xf2d600, V3(-0.2, 0.003, -0.08), { osc: true, et: "Sonda CH1 a osciloscopului" }), L.sonda(O.ch[1], 0x1fb6ff, V3(-0.12, 0.003, -0.07), { osc: true, et: "Sonda CH2 a osciloscopului" })];
  return { actualizeaza() {
    const x = X0 + sim.d / 100; T.position.x = x; stativ.visible = x > 0.76;
    TG.rotation.y = sim.unghi * Math.PI / 180; Object.entries(ti).forEach(([k, o]) => { o.visible = k === sim.tinta; });
    con.visible = sim.run; { const l = Math.max(0.03, sim.d / 100), r = Math.min(0.09, l * 0.27); conG.scale.set(r, l, r); }
    grila.material.emissiveIntensity = sim.aero ? 1.4 : 0; flux.material.opacity = sim.aero ? 0.16 : 0;
    const led = LEDZ[zonaCur()]; LED.forEach((q, i) => q.l.set(led === ["verde", "galben", "roșu"][i] ? 1 : 0));
    MG.led("ON", sim.run ? 1 : 0); MG.led("TX", sim.run && performance.now() - sim.tx < 80 ? 1 : 0); MG.led("L", sim.buz ? 0.8 : 0);
    sd.forEach((q, i) => { const f = TPS[sim.osc.ch[i].s]; q.muta(f ? f() : null); });
  } };
}
