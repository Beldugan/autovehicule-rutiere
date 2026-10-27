/* MAM I – Lucrarea 8. Senzori inerțiali (IMU): unghiurile de ruliu și tangaj, filtrul complementar.
   Simulatorul în stilul Tinkercad: suportul rotativ cu raportorul digital, MPU-6050 (I²C, D20/D21) și ADXL377 (A8…A10, 3,3 V),
   Arduino Mega cu OLED, programul la 100 Hz (unghiurile din accelerații, integrarea giroscopului, filtrul complementar), comenzile
   de statistică / mediere / derivă, înclinarea lentă și rapidă, vibrațiile, testul de șoc cu ciocanul de cauciuc; monitorul serial
   și plotterul. Pașii lucrării sunt afișați la vedere, cu verificări automate; valorile intră în tabele numai din program și raportor. */
"use strict";
const MD = MODELE["mam1-l8"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, tS: 0, phi: 0, om: 0, ep: 0, mot: null, vib: false, viteza: 1, v3: false, bratari: false, ciocan: 0,
  camp: { ALPHA: "0.98", COR: "true", FS: "1000" }, fw: null, pr: null, serial: [], tx: 0, ist: [], bw: 0
};
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const DT = MD.DT, RD = 180 / Math.PI;
const raportor = () => Math.round(sim.phi * 10) / 10;
const repaus = () => !sim.mot && !sim.vib;
let SV3 = null;

/* ------------------------------------------------------------------ mișcarea suportului */
function rotesteLa(A, rapid) {
  if (sim.mot) return Cadru.mesajTemporar("Așteptați terminarea mișcării suportului.", "atentie");
  if (!sim.bratari) return Cadru.mesajTemporar("NSSM: fixați întâi cablurile I²C cu brățări pe axul suportului (rezervă de lungime), ca rotirea să nu le smulgă.", "pericol");
  const A0 = sim.phi; if (Math.abs(A - A0) < 0.05) return;
  const Tm = rapid ? P().Tr : Math.abs(A - A0) / 20 + 0.3;
  sim.mot = { t0: sim.tS, A0, dA: A - A0, Tm, rapid };
  if (rapid && sim.pr && sim.pr.cal === null) sim.pr.step = { t0: sim.tS, phi0: sim.pr.phi, dA: A - A0, t90: null };
  actualizeaza();
}
function pasMiscare(d) {
  const m = sim.mot; if (!m) { sim.om = 0; sim.ep = 0; return; }
  const t = sim.tS - m.t0, [p, w, e] = MD.profil(t, 1, m.Tm);
  sim.phi = m.A0 + m.dA * p; sim.om = m.dA * w; sim.ep = m.dA * e;
  if (t >= m.Tm) { sim.phi = m.A0 + m.dA; sim.om = 0; sim.ep = 0; sim.mot = null; }
}

/* ------------------------------------------------------------------ MPU-6050: eșantioanele brute */
let vibY = 0, vibZ = 0;
function esantion() {
  const p = P(), a = MD.acc(p, sim.phi, sim.om, sim.ep);
  if (sim.vib) { vibY = 0.6 * vibY + 0.12 * gauss(); vibZ = 0.6 * vibZ + 0.12 * gauss(); } else { vibY = vibZ = 0; }
  const q = g => Math.max(-32768, Math.min(32767, Math.round(g * 16384)));
  const ax = q(a.ax + gauss() * p.sa), ay = q(a.ay + vibY + gauss() * p.sa), az = q(a.az + vibZ + gauss() * p.sa);
  const gq = w => Math.max(-32768, Math.min(32767, Math.round(w * 131)));
  const gx = gq(MD.gyro(p, sim.om) + sim.bw + gauss() * p.sgn), gy = gq(p.bgy + gauss() * p.sgn), gz = gq(p.bgz + gauss() * p.sgn);
  return { ax, ay, az, gx, gy, gz };
}

/* ------------------------------------------------------------------ programul (100 Hz) */
function pornesteProgram() {
  sim.pr = { tAcc: 0, gx0: 0, cal: sim.fw.cor ? { n: 0, s: 0, miscat: false } : null, phiG: 0, phi: 0, last: null, tPr: 0, cmd: null, rez: {}, step: null, buf: [] };
  seriala(`imu_filtru | MPU-6050 0x68 (SDA D20, SCL D21) · ADXL377 A8/A9/A10 la ${sim.fw.fs} Hz | ALPHA = ${sim.fw.alpha} (τ = ${fx(MD.tau(sim.fw.alpha), 3)} s) | CORECTIE = ${sim.fw.cor}`);
  if (sim.fw.cor) seriala("calibrare: 1000 de eșantioane în repaus (10 s) – nu mișcați suportul…");
}
function pasProgram(d) {
  const pr = sim.pr; if (!pr) return;
  pr.tAcc += d;
  while (pr.tAcc >= DT) { pr.tAcc -= DT; ciclu(); }
}
function ciclu() {
  const pr = sim.pr, s = esantion(), al = sim.fw.alpha;
  if (pr.cal) { const c = pr.cal; c.n++; c.s += s.gx; if (!repaus()) c.miscat = true;
    if (c.n >= 1000) { pr.gx0 = c.s / c.n; pr.cal = null; seriala(`gx0 = ${pr.gx0.toFixed(1)} LSB (${fx(pr.gx0 / 131, 3)} °/s)${c.miscat ? " ⚠ suportul s-a mișcat în timpul calibrării – reporniți" : ""}`); pr.calMiscat = c.miscat; }
    return; }
  const Ax = s.ax / 16384, Ay = s.ay / 16384, Az = s.az / 16384, wx = (s.gx - pr.gx0) / 131;
  const pa = Math.atan2(Ay, Az) * RD, ta = Math.atan2(-Ax, Math.hypot(Ay, Az)) * RD;
  pr.phiG += wx * DT; pr.phi = al * (pr.phi + wx * DT) + (1 - al) * pa;
  pr.buf.push(pa); if (pr.buf.length > 50) pr.buf.shift();
  pr.last = { Ax, Ay, Az, wx, pa, ta, phiG: pr.phiG, phi: pr.phi, raw: s };
  pr.tPr += DT;
  if (pr.tPr >= 0.1 - 1e-9) { pr.tPr = 0; seriala(`φacc ${fs(pa, 2)} | φg ${fs(pr.phiG, 2)} | φ ${fs(pr.phi, 2)} | θacc ${fs(ta, 2)} | raportor ${fx(raportor(), 1)}`);
    sim.ist.push({ t: sim.tS, r: sim.phi, a: pa, g: pr.phiG, f: pr.phi }); if (sim.ist.length > 400) sim.ist.shift(); }
  /* comenzile în curs */
  const c = pr.cmd;
  if (c) {
    if (!repaus()) c.miscat = true;
    if (c.tip === "s") { c.v.push([Ax, Ay, Az, s.gx / 131, s.gy / 131, s.gz / 131]);
      if (c.v.length >= 1000) { const n = c.v.length, m = [0, 1, 2, 3, 4, 5].map(i => c.v.reduce((a, r) => a + r[i], 0) / n), sd = [0, 1, 2, 3, 4, 5].map(i => Math.sqrt(c.v.reduce((a, r) => a + (r[i] - m[i]) ** 2, 0) / (n - 1)));
        pr.rez.s = { m, sd, miscat: c.miscat, phi: sim.phi }; pr.cmd = null;
        seriala(`statistica 1000 eș.: medii ax ${fs(m[0], 4)} ay ${fs(m[1], 4)} az ${fs(m[2], 4)} g · ωx ${fs(m[3], 3)} ωy ${fs(m[4], 3)} ωz ${fs(m[5], 3)} °/s`);
        seriala(`                    σ    ax ${fs(sd[0], 4)} ay ${fs(sd[1], 4)} az ${fs(sd[2], 4)} g · ωx ${fs(sd[3], 3)} ωy ${fs(sd[4], 3)} ωz ${fs(sd[5], 3)} °/s${c.miscat ? " ⚠ mișcare" : ""}`); } }
    else if (c.tip === "m") { c.v.push([Ay, Az]);
      if (c.v.length >= 100) { const ay = c.v.reduce((a, r) => a + r[0], 0) / 100, az = c.v.reduce((a, r) => a + r[1], 0) / 100;
        pr.rez.m = { ay, az, pa: Math.atan2(ay, az) * RD, phiR: raportor(), miscat: c.miscat }; pr.cmd = null;
        seriala(`media 100 eș.: ay ${fs(ay, 4)} g, az ${fs(az, 4)} g → φacc ${fs(pr.rez.m.pa, 2)}° (raportor ${fx(raportor(), 1)}°)${c.miscat ? " ⚠ mișcare" : ""}`); } }
    else if (c.tip === "d") { const t = sim.tS - c.t0; if (t > 50) c.v.push(pr.phi);
      if (t >= 60 - 1e-6) { const n = c.v.length, m = c.v.reduce((a, b) => a + b, 0) / n, sg = Math.sqrt(c.v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
        pr.rez.d = { dg: pr.phiG, df: pr.phi - c.phi0, sigma: sg, miscat: c.miscat, alpha: al, cor: sim.fw.cor }; pr.cmd = null;
        seriala(`deriva 60 s: Δφg = ${fs(pr.phiG, 2)}° · Δφ (filtru) = ${fs(pr.rez.d.df, 3)}° · σφ (ultimele 10 s) = ${fs(sg, 3)}°${c.miscat ? " ⚠ mișcare" : ""}`); } }
  }
  /* înclinarea rapidă: t90 al filtrului */
  const st = pr.step;
  if (st && st.t90 === null && (pr.phi - st.phi0) * Math.sign(st.dA) >= 0.9 * Math.abs(st.dA)) { st.t90 = Math.round((sim.tS - st.t0) * 1000 / 10) * 10; st.alpha = al; st.cor = sim.fw.cor;
    pr.rez.t = st; seriala(`înclinare rapidă ${fx(st.dA, 0)}°: filtrul atinge 90 % după t90 = ${st.t90} ms`); }
  if (st && st.t90 === null && sim.tS - st.t0 > 15) pr.step = null;
}
const fs = (v, n) => (v >= 0 ? " " : "") + v.toFixed(n);
function comanda(txt) {
  const s = String(txt).trim().toLowerCase(); if (!s) return; seriala("> " + s);
  if (!sim.run || !sim.pr) return seriala("(programul nu rulează)");
  const pr = sim.pr; if (pr.cal) return seriala("(calibrarea este în curs)");
  if (pr.cmd) return seriala("(o comandă este în curs)");
  if (s === "s") { pr.cmd = { tip: "s", v: [], miscat: false }; seriala("statistică pe 1000 de eșantioane (10 s)…"); }
  else if (s === "m") { pr.cmd = { tip: "m", v: [], miscat: false }; seriala("mediere pe 100 de eșantioane (1 s)…"); }
  else if (s === "d") { pr.phiG = 0; pr.phi = pr.buf.length ? pr.buf.reduce((x, y) => x + y, 0) / pr.buf.length : 0; pr.cmd = { tip: "d", v: [], miscat: false, t0: sim.tS, phi0: pr.phi }; seriala("test de derivă 60 s: φg = 0, φ = media φacc pe 0,5 s; nu mișcați suportul…"); }
  else if (s === "z") { pr.phiG = 0; pr.phi = pr.last ? pr.last.pa : 0; seriala("φg = 0, φ = φacc"); }
  else seriala("comenzi: s = statistică 1000 eș., m = mediere 1 s, d = derivă 60 s, z = zero φg");
  actualizeaza();
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 300) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-120).join("\n"); el.scrollTop = el.scrollHeight; }

/* ------------------------------------------------------------------ testul de șoc (ADXL377) */
function loveste() {
  if (!sim.run || !sim.pr) return Cadru.mesajTemporar("Porniți simularea: impulsul îl înregistrează programul.", "atentie");
  if (!sim.v3) return Cadru.mesajTemporar("ADXL377 nu este alimentat la 3,3 V.", "pericol");
  if (sim.mot) return Cadru.mesajTemporar("Așteptați oprirea suportului.", "atentie");
  const p = P(), A = p.Apk * (1 + 0.08 * gauss()), D = p.Dsoc * (1 + 0.04 * gauss()), r = MD.capturaSoc(A, D, sim.fw.fs, Math.random());
  sim.ciocan = performance.now(); sim.pr.rez.soc = { ...r, f: sim.fw.fs };
  seriala(r.det ? `ADXL377 @ ${sim.fw.fs} Hz: șoc pe Z – vârf ${fx(r.pk, 1)} g, durata ${fx(r.dur, 2)} ms (${r.n} eșantioane)` : `ADXL377 @ ${sim.fw.fs} Hz: impulsul nu a fost prins (vârf citit ${fx(r.pk, 1)} g, sub pragul de 5 g)`);
  actualizeaza();
}

/* ------------------------------------------------------------------ planșa în stilul Tinkercad */
const AX = [300, 270];
function planseSVG() {
  const W = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
  let s = `<svg id="tk-svg" viewBox="0 0 1300 560" role="img" aria-label="Planșa: suportul rotativ cu raportorul digital, MPU-6050 și ADXL377, ciocanul de cauciuc, Arduino Mega cu OLED și selectorul de alimentare al ADXL377">
<defs><filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter>
 <linearGradient id="gAlu8" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7eb"/><stop offset="1" stop-color="#9aa2aa"/></linearGradient></defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb"/>`;
  /* ---- suportul rotativ (vedere în lungul axei X) */
  s += `<g data-k="suport" class="tk-comp" filter="url(#umbra)"><rect x="110" y="470" width="380" height="24" rx="4" fill="#f07c1e" stroke="#a0520f"/><rect x="${AX[0] - 22}" y="${AX[1]}" width="44" height="200" rx="4" fill="#f07c1e" stroke="#a0520f"/>
    <text x="300" y="512" font-size="10" text-anchor="middle" fill="#a0520f" font-weight="700">suport rotativ imprimat 3D · axa X = ruliu</text></g>
    <g id="scara8" style="pointer-events:none">${[-60, -45, -30, -15, 0, 15, 30, 45, 60].map(a => { const r = a * Math.PI / 180, x1 = AX[0] + 170 * Math.sin(r), y1 = AX[1] - 170 * Math.cos(r), x2 = AX[0] + 182 * Math.sin(r), y2 = AX[1] - 182 * Math.cos(r);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#999" stroke-width="1.5"/><text x="${(AX[0] + 196 * Math.sin(r)).toFixed(1)}" y="${(AX[1] - 196 * Math.cos(r) + 4).toFixed(1)}" font-size="9" text-anchor="middle" fill="#888">${a}°</text>`; }).join("")}</g>
    <g data-k="platforma" class="tk-comp" id="plat8"><g filter="url(#umbra)"><rect x="${AX[0] - 150}" y="${AX[1] - 22}" width="300" height="18" rx="3" fill="#f39a4a" stroke="#a0520f"/>
      <g data-k="mpu" class="tk-comp"><rect x="${AX[0] - 90}" y="${AX[1] - 52}" width="64" height="30" rx="3" fill="#1f5fbf" stroke="#0d2c7a"/><rect x="${AX[0] - 66}" y="${AX[1] - 44}" width="16" height="14" fill="#111"/><text x="${AX[0] - 58}" y="${AX[1] - 56}" font-size="9" text-anchor="middle" fill="#0d2c7a" font-weight="800">MPU-6050</text>
        <path d="M${AX[0] - 30},${AX[1] - 46} h-10 m10,0 v10" stroke="#fff" stroke-width="1.4" fill="none"/><text x="${AX[0] - 34}" y="${AX[1] - 26}" font-size="6" fill="#fff">Y Z</text></g>
      <g data-k="adxl" class="tk-comp"><rect x="${AX[0] - 4}" y="${AX[1] - 44}" width="30" height="22" rx="2" fill="#6a1b9a" stroke="#38006b"/><text x="${AX[0] + 11}" y="${AX[1] - 48}" font-size="8" text-anchor="middle" fill="#38006b" font-weight="800">ADXL377</text></g>
      <g data-k="raportor" class="tk-comp"><rect x="${AX[0] + 40}" y="${AX[1] - 62}" width="96" height="40" rx="5" fill="#ffd54f" stroke="#a37a00"/><rect x="${AX[0] + 48}" y="${AX[1] - 56}" width="80" height="24" rx="2" fill="#bfd0b0" stroke="#222"/>
        <text id="rap8" x="${AX[0] + 124}" y="${AX[1] - 38}" font-size="16" text-anchor="end" fill="#1d2414" font-family="ui-monospace,monospace" font-weight="700">0.0°</text></g>
      <path d="M${AX[0] - 120},${AX[1] - 4} q-10,20 0,30" fill="none" stroke="#222" stroke-width="2"/></g></g>
    <circle cx="${AX[0]}" cy="${AX[1]}" r="12" fill="url(#gAlu8)" stroke="#555" style="pointer-events:none"/><circle cx="${AX[0]}" cy="${AX[1]}" r="4" fill="#333" style="pointer-events:none"/>
    <g data-k="bratari" class="tk-comp"><rect x="${AX[0] + 14}" y="${AX[1] + 30}" width="18" height="10" rx="3" id="brat8" fill="#ddd" stroke="#666"/><rect x="${AX[0] + 14}" y="${AX[1] + 70}" width="18" height="10" rx="3" id="brat8b" fill="#ddd" stroke="#666"/><text x="${AX[0] + 38}" y="${AX[1] + 60}" font-size="9" fill="#555" id="brat8t">cabluri nefixate</text></g>`;
  /* ---- ciocanul de cauciuc */
  s += `<g data-k="ciocan" class="tk-comp" id="cioc8" filter="url(#umbra)"><rect x="500" y="300" width="110" height="12" rx="4" fill="#8d6e63" stroke="#5d4037"/><rect x="480" y="282" width="36" height="48" rx="8" fill="#212121"/><text x="560" y="332" font-size="9" text-anchor="middle" fill="#5d4037" font-weight="700">ciocan de cauciuc</text></g>
    <path id="loviturq" d="M${AX[0] + 160},${AX[1] - 8} l18,-10 m-18,10 l18,10 m-18,-10 l22,0" stroke="#e53935" stroke-width="3" opacity="0"/>`;
  /* ---- selectorul de alimentare al ADXL377 */
  s += `<g data-k="v33" class="tk-comp" filter="url(#umbra)"><rect x="660" y="390" width="160" height="70" rx="8" fill="#eceff1" stroke="#90a4ae"/><text x="740" y="408" font-size="10" text-anchor="middle" fill="#37474f" font-weight="700">alimentare ADXL377</text>
    <rect x="690" y="418" width="100" height="26" rx="13" fill="#cfd8dc"/><circle id="v33k" cx="703" cy="431" r="11" fill="#9e9e9e"/><text x="740" y="456" font-size="9" text-anchor="middle" fill="#37474f" id="v33t">deconectat</text></g>`;
  /* ---- Arduino Mega 2560 și OLED */
  const MX = 900, MY = 30;
  s += `<g data-k="mega" class="tk-comp" filter="url(#umbra)"><rect x="${MX}" y="${MY}" width="340" height="232" rx="8" fill="#00878f" stroke="#005a60"/>
    <rect x="${MX - 14}" y="${MY + 160}" width="46" height="40" rx="3" fill="url(#gAlu8)" stroke="#666"/><g transform="translate(${MX + 170} ${MY + 120}) rotate(45)"><rect x="-30" y="-30" width="60" height="60" rx="2" fill="#262626"/></g>
    <text x="${MX + 170}" y="${MY + 123}" font-size="7" fill="#bbb" text-anchor="middle" font-family="monospace">ATMEGA2560</text><rect x="${MX + 30}" y="${MY + 6}" width="250" height="12" rx="1.5" fill="#202020"/>
    <rect x="${MX + 60}" y="${MY + 214}" width="230" height="12" rx="1.5" fill="#202020"/><text x="${MX + 230}" y="${MY + 208}" font-size="6.5" fill="#fff" text-anchor="middle">A8 A9 A10</text><text x="${MX + 95}" y="${MY + 208}" font-size="6.5" fill="#fff" text-anchor="middle">3V3 5V GND</text><text x="${MX + 250}" y="${MY + 30}" font-size="6.5" fill="#fff" text-anchor="middle">SDA 20 · SCL 21</text>
    <text x="${MX + 40}" y="${MY + 190}" font-size="13" fill="#e8ffff" font-weight="800">ARDUINO MEGA 2560</text>
    <rect id="ledON8" x="${MX + 60}" y="${MY + 60}" width="8" height="5" fill="#1a3a1a"/><text x="${MX + 72}" y="${MY + 65}" font-size="6" fill="#fff">ON</text><rect id="ledTX8" x="${MX + 60}" y="${MY + 72}" width="8" height="5" fill="#5a4a1a"/><text x="${MX + 72}" y="${MY + 77}" font-size="6" fill="#fff">TX</text></g>
    <g data-k="rst" class="tk-comp"><rect x="${MX + 20}" y="${MY + 92}" width="18" height="18" rx="2" fill="#ccc" stroke="#555"/><circle cx="${MX + 29}" cy="${MY + 101}" r="5.5" fill="#c62828"/><text x="${MX + 29}" y="${MY + 122}" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">RESET</text></g>
    <path id="usb8" d="M${MX - 14},${MY + 180} C${MX - 60},${MY + 180} ${MX - 60},${MY + 300} ${MX - 20},${MY + 330}" fill="none" stroke="#bbb" stroke-width="6"/>`;
  s += `<g data-k="oled" class="tk-comp" filter="url(#umbra)"><rect x="930" y="300" width="230" height="170" rx="6" fill="#16337a" stroke="#0b1d48"/><rect x="940" y="324" width="210" height="132" rx="3" fill="#050608" stroke="#333"/><g id="oled8" font-family="ui-monospace,Consolas,monospace"></g><text x="1045" y="316" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED 0,96" SSD1306 · I²C 0x3C</text></g>`;
  /* ---- firele: MPU → 5V/GND/D20/D21, ADXL → 3V3 (selector)/GND/A8…A10, OLED pe I²C */
  s += `<g style="pointer-events:none">
    ${W([[AX[0] - 10, AX[1] + 40], [AX[0] - 10, 530], [640, 530], [640, 20], [1150, 20], [1150, 36]], "#1e88e5", 2.2)}${W([[AX[0] - 4, AX[1] + 40], [AX[0] - 4, 536], [646, 536], [646, 14], [1158, 14], [1158, 36]], "#43a047", 2.2)}
    ${W([[AX[0] + 4, AX[1] + 40], [AX[0] + 4, 542], [870, 542], [870, 250], [1130, 250], [1130, 244]], "#8e24aa", 2.2)}${W([[AX[0] + 10, AX[1] + 40], [AX[0] + 10, 548], [876, 548], [876, 256], [1140, 256], [1140, 244]], "#ab47bc", 2.2)}
    ${W([[820, 431], [850, 431], [850, 270], [985, 270], [985, 244]], "#ff9800", 2.4)}${W([[AX[0] + 16, AX[1] + 40], [AX[0] + 16, 520], [700, 520], [700, 460]], "#ff9800", 2.2)}
    ${W([[1102, 300], [1102, 280], [1170, 280], [1170, 262]], "#1e88e5", 2)}${W([[1120, 300], [1120, 286], [1180, 286], [1180, 262]], "#43a047", 2)}</g>
    <text x="300" y="20" text-anchor="middle" font-size="12" fill="#555">vedere în lungul axei X – ruliul φ se citește pe raportorul digital</text>
    <text id="tk-av" x="740" y="370" text-anchor="middle" font-size="12" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
function oledTxt() {
  const v = sim.pr && sim.pr.last;
  if (sim.pr && sim.pr.cal) return { titlu: "IMU - calibrare", linii: [`gx0: ${sim.pr.cal.n}/1000`, "nu miscati", "suportul"] };
  if (!v) return { titlu: "IMU", linii: ["pornire..."] };
  return { titlu: `IMU a=${sim.fw.alpha} ${sim.fw.cor ? "COR" : "fara cor"}`, linii: [`acc ${fs(v.pa, 1)}`, `gyr ${fs(v.phiG, 1)}`, `flt ${fs(v.phi, 1)}`, `th  ${fs(v.ta, 1)}`] };
}
function planseAfis() {
  if (!$("#tk-svg")) return;
  $("#plat8").setAttribute("transform", `rotate(${sim.phi.toFixed(2)} ${AX[0]} ${AX[1]})`);
  $("#rap8").textContent = fx(raportor(), 1) + "°";
  const bc = sim.bratari ? "#212121" : "#ddd"; $("#brat8").setAttribute("fill", bc); $("#brat8b").setAttribute("fill", bc); $("#brat8t").textContent = sim.bratari ? "cabluri fixate cu brățări" : "cabluri nefixate";
  $("#v33k").setAttribute("cx", sim.v3 ? 777 : 703); $("#v33k").setAttribute("fill", sim.v3 ? "#2e7d32" : "#9e9e9e"); $("#v33t").textContent = sim.v3 ? "3,3 V ✓" : "deconectat";
  const ag = (performance.now() - sim.ciocan) < 300; $("#cioc8").setAttribute("transform", ag ? `translate(-150 ${-40})` : ""); $("#loviturq").setAttribute("opacity", ag ? 1 : 0);
  const o = sim.run ? oledTxt() : null; $("#oled8").innerHTML = o ? `<text x="946" y="342" font-size="12" fill="#ffd400">${esc(o.titlu)}</text>` + o.linii.map((l, i) => `<text x="946" y="${364 + i * 22}" font-size="14" fill="#5fd3ff">${esc(l)}</text>`).join("") : "";
  $("#ledON8").setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a"); $("#ledTX8").setAttribute("fill", sim.run && performance.now() - sim.tx < 80 ? "#ffd04a" : "#5a4a1a"); $("#usb8").setAttribute("stroke", sim.run ? "#222" : "#bbb");
  $("#tk-av").textContent = sim.vib ? "vibrații pe suport (motorul de test)" : !sim.bratari ? "fixați cablurile cu brățări înainte de rotire" : "";
}
const INSP = {
  mpu: () => ["MPU-6050 (GY-521)", [["Interfață", "I²C 0x68 (AD0 la masă), SDA D20, SCL D21"], ["Domenii", "±2 g (16 384 LSB/g), ±250 °/s (131 LSB/(°/s))"], ["Montaj", "axa X în lungul axului de rotație"]]],
  adxl: () => ["ADXL377", [["Domeniu", "±200 g, analogic, 6,5 mV/g, zero la 1,65 V"], ["Alimentare", "3,3 V (se distruge la 5 V)"], ["Ieșiri", "X/Y/Z → A8/A9/A10"], ["Rezoluție cu ADC-ul Mega", "≈ 0,75 g/LSB (10 biți, 5 V)"]]],
  raportor: () => ["Raportorul digital", [["Rezoluție", "0,1°"], ["Citire", fx(raportor(), 1) + "°"]]],
  suport: () => ["Suportul rotativ", [["Ruliu", fx(sim.phi, 1) + "°"], ["Distanța modulului de ax", fx(P().r * 1000, 0) + " mm"]]],
  platforma: () => INSP.suport(),
  bratari: () => ["Brățările cablurilor", [["Stare", sim.bratari ? "fixate (clic = desfacere)" : "nefixate (clic = fixare)"]]],
  ciocan: () => ["Ciocanul de cauciuc", [["Utilizare", "numai pe zona marcată a suportului, lovitură ușoară"], ["Clic", "lovește suportul (testul de șoc)"]]],
  v33: () => ["Alimentarea ADXL377", [["Stare", sim.v3 ? "3,3 V (pinul 3V3 al Mega)" : "deconectat"]]],
  mega: () => ["Arduino Mega 2560", [["Program", sim.fw ? `ALPHA = ${sim.fw.alpha}, CORECTIE = ${sim.fw.cor}, ADXL la ${sim.fw.fs} Hz` : "—"], ["Ciclu IMU", "10 ms (100 Hz)"], ["gx0", sim.pr ? fx(sim.pr.gx0 / 131, 3) + " °/s" : "—"]]],
  oled: () => ["OLED SSD1306", [["Conținut", "φ din accelerometru, din giroscop, din filtru, θ"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}
function comutaV3() { if (sim.run) return Cadru.mesajTemporar("Alimentarea modulelor se schimbă numai cu placa nealimentată (simularea oprită).", "atentie"); sim.v3 = !sim.v3; actualizeaza(); }
function comutaBratari() { if (sim.mot) return; sim.bratari = !sim.bratari; actualizeaza(); }
function laClic3d(k) {
  if (k === "ciocan") return loveste();
  if (k === "v33") return comutaV3();
  if (k === "bratari") return comutaBratari();
  if (k === "rst") { if (sim.run) { seriala("— RESET —"); pornesteProgram(); actualizeaza(); } return; }
  inspector(k);
}

/* ------------------------------------------------------------------ panourile de sub planșă */
function panou() {
  const el = $("#tk-pompa"); if (!el) return;
  el.innerHTML = `<b>Montaj</b><button type="button" data-v3="1" class="${sim.v3 ? "activ" : "slab"}">ADXL377: ${sim.v3 ? "3,3 V ✓" : "neconectat"}</button><button type="button" data-br="1" class="${sim.bratari ? "activ" : "slab"}">Brățări cabluri ${sim.bratari ? "✓" : "—"}</button>
    <span class="sep"></span><b>Înclinare lentă</b>${MD.UNGHIURI.map(u => `<button type="button" data-un="${u}" class="${Math.abs(sim.phi - u) < 0.05 ? "activ" : ""}">${u}°</button>`).join("")}
    <button type="button" data-rap="30" class="primar">⚡ Rapid 0 → 30°</button><button type="button" data-rap="0">⚡ Rapid → 0°</button>
    <span class="sep"></span><button type="button" data-vib="1" class="${sim.vib ? "activ" : ""}">〰 Vibrații ${sim.vib ? "pornite" : "oprite"}</button><button type="button" data-cio="1">🔨 Lovește suportul</button>
    <button type="button" data-vit="1" class="${sim.viteza > 1 ? "activ" : ""}" title="Accelerează timpul simulării pentru testele lungi (60 s)">⏩ Timp ×${sim.viteza}</button>
    <span class="sep"></span><b>Program</b><button type="button" data-cmd="s">s – statistică 10 s</button><button type="button" data-cmd="m">m – mediere 1 s</button><button type="button" data-cmd="d">d – derivă 60 s</button>`;
  $$("[data-v3]", el).forEach(b => b.addEventListener("click", comutaV3));
  $$("[data-br]", el).forEach(b => b.addEventListener("click", comutaBratari));
  $$("[data-un]", el).forEach(b => b.addEventListener("click", () => rotesteLa(+b.dataset.un, false)));
  $$("[data-rap]", el).forEach(b => b.addEventListener("click", () => rotesteLa(+b.dataset.rap, true)));
  $$("[data-vib]", el).forEach(b => b.addEventListener("click", () => { sim.vib = !sim.vib; actualizeaza(); }));
  $$("[data-cio]", el).forEach(b => b.addEventListener("click", loveste));
  $$("[data-vit]", el).forEach(b => b.addEventListener("click", comutaViteza));
  $$("[data-cmd]", el).forEach(b => b.addEventListener("click", () => comanda(b.dataset.cmd)));
}
function comutaViteza() { sim.viteza = sim.viteza > 1 ? 1 : 10; actualizeaza(); }
function afisaje() {
  const e = $("#afis"); if (!e) return; const v = sim.pr && sim.pr.last, c = sim.pr && sim.pr.cmd;
  e.innerHTML = `<div><span>Raportor</span><b>${fx(raportor(), 1)}°</b></div><div><span>φ acc / gir / filtru</span><b>${v ? `${fx(v.pa, 1)} / ${fx(v.phiG, 1)} / ${fx(v.phi, 1)}°` : "—"}</b></div>
    <div><span>Comanda în curs</span><b>${sim.pr && sim.pr.cal ? `calibrare ${sim.pr.cal.n}/1000` : c ? (c.tip === "d" ? `derivă ${fx(sim.tS - c.t0, 0)}/60 s` : `${c.tip} ${c.v.length}/${c.tip === "s" ? 1000 : 100}`) : "—"}</b></div><div><span>Timp</span><b>×${sim.viteza}</b></div>`;
}
function sincron3d() { if (!SV3 && Cadru.anim && Cadru.anim.vedere) SV3 = Cadru.anim; }
function actualizeaza() { panou(); afisaje(); planseAfis(); sincron3d(); actualizeazaPasi(); }

/* ------------------------------------------------------------------ plotterul unghiurilor */
function plotter() {
  const cv = $("#tk-plot"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const ist = sim.ist, t1 = ist.length ? ist[ist.length - 1].t : 20, t0 = t1 - 20, pts = ist.filter(e => e.t >= t0);
  const y0 = -20, y1 = 80, L = 36, R = 8, T = 8, B = 20, X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = v => T + (y1 - Math.max(y0, Math.min(y1, v))) / (y1 - y0) * (H - T - B);
  g.font = "10px system-ui"; g.fillStyle = "#666"; g.strokeStyle = "#eee";
  for (let v = y0; v <= y1; v += 20) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke(); g.fillText(String(v), 4, Y(v) + 3); }
  for (let t = Math.ceil(t0 / 5) * 5; t <= t1; t += 5) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), H - B); g.stroke(); g.fillText((t - t1).toFixed(0) + " s", X(t) - 10, H - 6); }
  [["r", "#222", "raportor"], ["a", "#ef6c00", "φacc"], ["g", "#2e7d32", "φg"], ["f", "#1565c0", "φ filtru"]].forEach(([k, c, n], i) => { g.strokeStyle = c; g.lineWidth = 1.5; g.beginPath(); pts.forEach((p, j) => j ? g.lineTo(X(p.t), Y(p[k])) : g.moveTo(X(p.t), Y(p[k]))); g.stroke(); g.fillStyle = c; g.fillText(n, L + 6 + i * 70, T + 9); });
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const rez = k => sim.run && sim.pr && sim.pr.rez[k];
function inregRep(e) {
  const r = rez("s"); if (!r) return Cadru.mesajTemporar("Rulați comanda „s” (statistică pe 1000 de eșantioane) cu suportul în repaus, pe orizontală.", "atentie");
  if (r.miscat || Math.abs(r.phi) > 0.05) return Cadru.mesajTemporar("Statistica trebuie făcută cu suportul nemișcat, la 0° (fără vibrații).", "atentie");
  const k = ["ax", "ay", "az", "wx", "wy", "wz"], m = r.m.map((v, i) => +v.toFixed(i < 3 ? 4 : 3)), sd = r.sd.map((v, i) => +v.toFixed(i < 3 ? 4 : 3));
  const log = { m: "rep" }; k.forEach((c, i) => { log[c] = m[i]; log["s" + c] = sd[i]; });
  const cel = []; k.forEach((c, i) => { cel.push({ t: "t81", r: "med", c, v: m[i].toFixed(i < 3 ? 4 : 3) }); cel.push({ t: "t81", r: "sd", c, v: sd[i].toFixed(i < 3 ? 4 : 3) }); });
  if (Cadru.inregistreaza(e, { log, celule: cel })) msg(`Tabelul 8.1: az = ${fx(m[2], 4)} g, ωx = ${fx(m[3], 3)} °/s (eroarea de zero a giroscopului).`);
}
function inregPhi(e) {
  const r = rez("m"); if (!r) return Cadru.mesajTemporar("Rulați comanda „m” (mediere 1 s) după oprirea suportului.", "atentie");
  if (r.miscat) return Cadru.mesajTemporar("Suportul s-a mișcat în timpul medierii: repetați „m”.", "atentie");
  const u = MD.UNGHIURI.find(x => Math.abs(r.phiR - x) < 0.05); if (u === undefined || Math.abs(sim.phi - r.phiR) > 0.05) return Cadru.mesajTemporar("Tabelul 8.2 se completează la 0, 15, 30, 45 și 60° pe raportor.", "atentie");
  const ay = +r.ay.toFixed(4), az = +r.az.toFixed(4), k = "u" + u;
  if (Cadru.inregistreaza(e, { log: { m: "phi", k, phiR: r.phiR, ay, az }, celule: [{ t: "t82", r: k, c: "phiR", v: fx(r.phiR, 1).replace(",", ".") }, { t: "t82", r: k, c: "ay", v: ay.toFixed(4) }, { t: "t82", r: k, c: "az", v: az.toFixed(4) }] }))
    msg(`Tabelul 8.2, ${u}°: ay = ${fx(ay, 4)} g, az = ${fx(az, 4)} g → φacc = ${fx(r.pa, 2)}°.`);
}
function inregDr(e) {
  const r = rez("d"); if (!r) return Cadru.mesajTemporar("Rulați testul de derivă de 60 s (comanda „d”) cu suportul nemișcat.", "atentie");
  if (r.miscat) return Cadru.mesajTemporar("Suportul s-a mișcat în timpul testului: repetați.", "atentie");
  if (r.cor && sim.pr.calMiscat) return Cadru.mesajTemporar("Calibrarea gx0 a fost făcută cu suportul în mișcare: reporniți programul.", "atentie");
  const k = r.cor ? "cu" : "fara", d = +r.dg.toFixed(3);
  if (Cadru.inregistreaza(e, { log: { m: "dr", k, d, cor: r.cor }, celule: [{ t: "t84", r: k, c: "d", v: d.toFixed(3) }] }))
    msg(`Tabelul 8.4 (${r.cor ? "cu" : "fără"} corecția erorii de zero): Δφg în 60 s = ${fx(d, 3)}°.`);
}
function inregCf(e) {
  const r = rez("d"), t = rez("t"); if (!r || !t) return Cadru.mesajTemporar("Pentru α curent: testul „d” de 60 s în repaus, apoi „⚡ Rapid 0 → 30°” (pornit de la 0°).", "atentie");
  if (r.cor || t.cor) return Cadru.mesajTemporar("Tabelul 8.3 se completează cu CORECTIE = false (deriva filtrului devine vizibilă).", "atentie");
  if (r.miscat) return Cadru.mesajTemporar("Suportul s-a mișcat în timpul testului de derivă: repetați.", "atentie");
  if (Math.abs(t.dA - 30) > 0.1 || r.alpha !== sim.fw.alpha || t.alpha !== sim.fw.alpha) return Cadru.mesajTemporar("Înclinarea rapidă trebuie să fie 0 → 30°, cu același α.", "atentie");
  const k = MD.cheieA(sim.fw.alpha), sigma = +r.sigma.toFixed(3), drift = +r.df.toFixed(3);
  if (Cadru.inregistreaza(e, { log: { m: "cf", k, alpha: sim.fw.alpha, cor: false, sigma, drift, t90: t.t90 }, celule: [{ t: "t83", r: k, c: "sigma", v: sigma.toFixed(3) }, { t: "t83", r: k, c: "drift", v: drift.toFixed(3) }, { t: "t83", r: k, c: "t90", v: String(t.t90) }] }))
    msg(`Tabelul 8.3, α = ${sim.fw.alpha}: σ = ${fx(sigma, 3)}°, deriva = ${fx(drift, 3)}°, t90 = ${t.t90} ms.`);
}
function inregSoc(e) {
  const r = rez("soc"); if (!r) return Cadru.mesajTemporar("Loviți ușor suportul cu ciocanul de cauciuc (programul înregistrează impulsul).", "atentie");
  const k = MD.cheieF(r.f), apk = +r.pk.toFixed(1), dur = +r.dur.toFixed(2);
  if (Cadru.inregistreaza(e, { log: { m: "soc", k, f: r.f, apk, dur, n: r.n }, celule: [{ t: "t85", r: k, c: "apk", v: apk.toFixed(1) }, { t: "t85", r: k, c: "dur", v: dur.toFixed(2) }, { t: "t85", r: k, c: "n", v: String(r.n) }] }))
    msg(`Tabelul 8.5, ${r.f} Hz: vârf ${fx(apk, 1)} g, durata ${fx(dur, 2)} ms (${r.n} eșantioane).`);
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const nT82 = () => MD.UNGHIURI.filter(u => pe("t82", "u" + u, "ay")).length, nT83 = () => MD.ALFE.filter(a => pe("t83", MD.cheieA(a), "t90")).length;
const nT84 = () => ["fara", "cu"].filter(k => pe("t84", k, "d")).length, nT85 = () => MD.FS.filter(f => pe("t85", MD.cheieF(f), "apk")).length;
const PASI = [
  { t: "Pregătirea montajului (NSSM)", tab: "3,3 V, brățări, pornire", v3: "tot",
    banda: "Pasul 1 · ADXL377 numai la 3,3 V; cablurile I²C fixate cu brățări, cu rezervă de lungime; programul pornește cu calibrarea giroscopului (10 s, suportul nemișcat).",
    instr: ["Verificați legăturile (clic pe componente): MPU-6050 – 5 V, GND, SDA <b>D20</b>, SCL <b>D21</b>; ADXL377 – <b>3,3 V</b>, GND, X/Y/Z pe <b>A8/A9/A10</b>.",
      "Apăsați <b>ADXL377: neconectat</b> → <b>3,3 V ✓</b> (selectorul de alimentare de pe planșă).",
      "Apăsați <b>Brățări cabluri</b> (cablurile fixate pe axul suportului).",
      "Suportul la <b>0°</b> pe raportor. Apăsați <b>▶ Pornește simularea</b> și nu mișcați suportul 10 s: programul calibrează eroarea de zero a giroscopului (gx0).",
      "Urmăriți pe OLED și pe plotter unghiurile: din accelerometru, din giroscop și din filtru."],
    ctl: () => "",
    ver: () => [[sim.v3, "ADXL377 la 3,3 V"], [sim.bratari, "cablurile fixate cu brățări"], [sim.run, "programul rulează"], [!!(sim.pr && !sim.pr.cal && sim.pr.last), sim.pr && sim.pr.cal ? `calibrare ${sim.pr.cal.n}/1000` : "calibrarea terminată, unghiurile afișate"]],
    prog: () => { const v = [sim.v3, sim.bratari, sim.run, !!(sim.pr && !sim.pr.cal && sim.pr.last)].filter(Boolean).length; if (v === 4) sim.p1ok = true; return sim.p1ok ? 4 : v; }, tot: 4, butoane: [] },
  { t: "Senzorul în repaus", tab: "Tabelul 8.1", v3: "suport",
    banda: "Pasul 2 · Modulul în repaus, pe orizontală: media și abaterea standard pe 1000 de eșantioane pentru fiecare axă; ωx mediu = eroarea de zero a giroscopului.",
    instr: ["Suportul la <b>0°</b>, vibrațiile oprite.",
      "Apăsați <b>s – statistică 10 s</b> (sau trimiteți „s” pe monitorul serial) și nu atingeți suportul până la rezultat.",
      "Citiți pe monitorul serial mediile și abaterile standard: az ≈ 1 g, ax și ay ≈ 0, ωx, ωy, ωz ≈ eroarea de zero.",
      "Apăsați <b>„● Medii și σ → Tabelul 8.1”</b>."],
    ctl: () => `<div class="rand-mic"><button type="button" data-un2="0">Suportul la 0°</button><button type="button" data-cmd2="s">s – statistică 10 s</button><button type="button" data-vit2="1">⏩ Timp ×10</button></div>`,
    ver: () => [[Math.abs(sim.phi) < 0.05 && repaus(), "suportul la 0°, în repaus"], [!!rez("s"), rez("s") ? `az = ${fx(rez("s").m[2], 4)} g, ωx = ${fx(rez("s").m[3], 3)} °/s` : "statistica pe 1000 de eșantioane"], [pe("t81", "med", "az"), "Tabelul 8.1 completat"]],
    prog: () => pe("t81", "med", "az") ? 1 : 0, tot: 1, butoane: [["● Medii și σ → Tabelul 8.1", inregRep, "primar"]] },
  { t: "Ruliul din accelerometru", tab: "Tabelul 8.2", v3: "suport",
    banda: "Pasul 3 · Suportul înclinat lent la 0, 15, 30, 45, 60° pe raportor; media pe 1 s a lui ay și az → φacc = atan2(ay, az) și eroarea față de raportor.",
    instr: ["Înclinați suportul <b>lent</b> la <b>0°</b> („Înclinare lentă”) și așteptați oprirea.",
      "Apăsați <b>m – mediere 1 s</b>; pe monitorul serial apar ay, az și φacc.",
      "Apăsați <b>„● ay, az → Tabelul 8.2”</b>.",
      "Repetați la <b>15, 30, 45, 60°</b>.",
      "Porniți <b>〰 Vibrații</b> câteva secunde și observați pe plotter cum φacc devine zgomotos, iar φ din filtru rămâne liniștit; opriți vibrațiile."],
    ctl: () => `<div class="rand-mic">${MD.UNGHIURI.map(u => `<button type="button" data-un2="${u}">${u}°</button>`).join("")}<button type="button" data-cmd2="m">m – mediere 1 s</button></div>`,
    ver: () => [[repaus(), "suportul oprit, fără vibrații"], [!!rez("m"), rez("m") ? `φacc = ${fx(rez("m").pa, 2)}° la ${fx(rez("m").phiR, 1)}°` : "media pe 1 s"], [nT82() >= 5, `unghiuri înregistrate: ${nT82()}/5`]],
    prog: nT82, tot: 5, butoane: [["● ay, az → Tabelul 8.2", inregPhi, "primar"]] },
  { t: "Deriva giroscopului", tab: "Tabelul 8.4", v3: "suport",
    banda: "Pasul 4 · Modulul nemișcat 60 s: integrarea vitezei unghiulare fără corecția erorii de zero (CORECTIE = false), apoi cu corecție (CORECTIE = true, gx0 măsurat la pornire).",
    instr: ["Apăsați <b>■ Oprește simularea</b>, alegeți în cod <b>CORECTIE = false</b>, apoi <b>▶ Pornește simularea</b>.",
      "Suportul la 0°, nemișcat. Apăsați <b>d – derivă 60 s</b> (cu <b>⏩ Timp ×10</b> durează 6 s) și așteptați rezultatul Δφg.",
      "Apăsați <b>„● Deriva 60 s → Tabelul 8.4”</b>.",
      "Opriți simularea, alegeți <b>CORECTIE = true</b>, porniți (calibrarea 10 s, nemișcat) și repetați testul „d”; înregistrați."],
    ctl: () => `<div class="rand-mic"><button type="button" data-cmd2="d">d – derivă 60 s</button><button type="button" data-vit2="1">⏩ Timp ×10</button></div>`,
    ver: () => [[!!sim.fw, sim.fw ? `programul cu CORECTIE = ${sim.fw.cor}` : "programul pornit"], [!!rez("d"), rez("d") ? `Δφg = ${fx(rez("d").dg, 2)}° în 60 s` : "testul de 60 s"], [pe("t84", "fara", "d"), "fără corecție înregistrat"], [pe("t84", "cu", "d"), "cu corecție înregistrat"]],
    prog: nT84, tot: 2, butoane: [["● Deriva 60 s → Tabelul 8.4", inregDr, "primar"]] },
  { t: "Filtrul complementar", tab: "Tabelul 8.3", v3: "suport",
    banda: "Pasul 5 · Pentru α = 0,90 · 0,98 · 0,995 (CORECTIE = false): zgomotul și deriva filtrului în 60 s de repaus, apoi întârzierea la înclinarea rapidă 0 → 30° (t90).",
    instr: ["Opriți simularea, alegeți în cod <b>ALPHA = 0.90</b> și <b>CORECTIE = false</b>, porniți simularea.",
      "Suportul la 0°: apăsați <b>d – derivă 60 s</b> (deriva și zgomotul σ al filtrului în repaus).",
      "Apăsați <b>⚡ Rapid 0 → 30°</b> (o mișcare de ≈ 0,1 s – peste ±250 °/s giroscopul se saturează); programul afișează t90 al filtrului.",
      "Apăsați <b>„● σ, derivă, t90 → Tabelul 8.3”</b>, apoi <b>⚡ Rapid → 0°</b>.",
      "Repetați pentru <b>ALPHA = 0.98</b> și <b>0.995</b>. Comparați pe plotter: α mic – zgomot mare, răspuns rapid; α mare – zgomot mic, revenire lentă după saturație."],
    ctl: () => `<div class="rand-mic"><button type="button" data-un2="0">0° (lent)</button><button type="button" data-cmd2="d">d – derivă 60 s</button><button type="button" data-rap2="30" class="primar">⚡ Rapid 0 → 30°</button><button type="button" data-rap2="0">⚡ Rapid → 0°</button><button type="button" data-vit2="1">⏩ Timp ×10</button></div>`,
    ver: () => [[!!sim.fw && !sim.fw.cor, sim.fw ? `ALPHA = ${sim.fw.alpha}, CORECTIE = ${sim.fw.cor}` : "programul pornit"], [!!rez("d") && rez("d").alpha === (sim.fw && sim.fw.alpha), rez("d") ? `σ = ${fx(rez("d").sigma, 3)}°, derivă ${fx(rez("d").df, 3)}°` : "testul de 60 s"], [!!rez("t"), rez("t") ? `t90 = ${rez("t").t90} ms` : "înclinarea rapidă 0 → 30°"], [nT83() >= 3, `valori α înregistrate: ${nT83()}/3`]],
    prog: nT83, tot: 3, butoane: [["● σ, derivă, t90 → Tabelul 8.3", inregCf, "primar"]] },
  { t: "Testul de șoc (ADXL377)", tab: "Tabelul 8.5", v3: "suport",
    banda: "Pasul 6 · ADXL377 citit la 100 Hz, 1 kHz și 4 kHz: lovitură ușoară cu ciocanul de cauciuc pe zona marcată; vârful accelerației și durata impulsului.",
    instr: ["Opriți simularea, alegeți în cod <b>FS_ADXL = 100</b> și porniți.",
      "Apăsați <b>🔨 Lovește suportul</b> (sau clic pe ciocan): programul prinde impulsul și afișează vârful și durata.",
      "Apăsați <b>„● Vârf, durată → Tabelul 8.5”</b>.",
      "Repetați cu <b>FS_ADXL = 1000</b> și <b>4000</b>. La 100 Hz impulsul de ≈ 2 ms se pierde; la 1 kHz vârful este subestimat; de aceea airbagul eșantionează la câțiva kHz."],
    ctl: () => `<div class="rand-mic"><button type="button" data-cio2="1" class="primar">🔨 Lovește suportul</button></div>`,
    ver: () => [[!!sim.fw, sim.fw ? `ADXL377 la ${sim.fw.fs} Hz` : "programul pornit"], [!!rez("soc"), rez("soc") ? `vârf ${fx(rez("soc").pk, 1)} g, ${fx(rez("soc").dur, 2)} ms` : "lovitura înregistrată"], [nT85() >= 3, `frecvențe înregistrate: ${nT85()}/3`]],
    prog: nT85, tot: 3, butoane: [["● Vârf, durată → Tabelul 8.5", inregSoc, "primar"]] }
];
let pasActiv = 0;
/* indiciile pas cu pas: ce se conectează / se apasă, în ordine (comun/ghid-pasi.js → ghidIndicii) */
const giK = k => `#tk-svg [data-k="${k}"]`, giA = s => ".pas.activ " + s, giR = (j = 0) => `.pas.activ [data-inreg][data-j="${j}"]`, giS = "#tk-start", giPm = s => "#tk-pompa " + s;
const GI_CF = { ALPHA: "ALPHA", COR: "CORECTIE", FS: "FS_ADXL" };
function giCfg(camp, ok) {
  const o = [[giS, "Opriți simularea (■) pentru a modifica programul", !sim.run || ok]];
  Object.entries(camp).forEach(([k, v]) => o.push([`#tk-cod [data-cf="${k}"]`, `Setați în cod <b>${GI_CF[k]} = ${v}</b>`, ok || (!sim.run && String(sim.camp[k]) === String(v))]));
  o.push([giS, "Apăsați <b>▶ Pornește simularea</b> și nu mișcați suportul 10 s (calibrarea gx0)", ok], ["#tk-serial", "Așteptați sfârșitul calibrării (10 s)", ok && !!sim.pr && !sim.pr.cal]);
  return o;
}
const giCmd = (c, txt, gata) => [[giA(`[data-cmd2="${c}"]`), giPm(`[data-cmd="${c}"]`)], txt, gata];
const giUnghi = u => [[giA(`[data-un2="${u}"]`), giPm(`[data-un="${u}"]`)], `Suportul la <b>${u}°</b> (înclinare lentă) și așteptați oprirea`, Math.abs(sim.phi - u) < 0.05 && repaus()];
const giVit = () => [[giA("[data-vit2]"), giPm("[data-vit]")], "Opțional: <b>⏩ Timp ×10</b>", sim.viteza > 1];
const giFaraVib = () => sim.vib ? [[giPm("[data-vib]"), "Opriți <b>〰 Vibrațiile</b>", false]] : [];
const giCmdRul = c => !!(sim.pr && sim.pr.cmd && sim.pr.cmd.tip === c);
PASI[0].ind = () => [[[giK("v33"), giPm("[data-v3]")], "Apăsați <b>ADXL377: neconectat</b> → <b>3,3 V ✓</b>", sim.v3],
  [[giK("bratari"), giPm("[data-br]")], "Apăsați <b>Brățări cabluri</b>", sim.bratari], giUnghi(0),
  [giS, "Apăsați <b>▶ Pornește simularea</b> și nu mișcați suportul 10 s", sim.run], ["#tk-serial", "Așteptați calibrarea gx0 (10 s), apoi urmăriți OLED-ul și plotterul", !!(sim.pr && !sim.pr.cal && sim.pr.last)]];
PASI[1].ind = () => { const r = rez("s"), ok = !!(r && !r.miscat && Math.abs(r.phi) <= 0.05);
  return [[giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run], ...giFaraVib(), giUnghi(0), giVit(), giCmd("s", "Apăsați <b>s – statistică 10 s</b> și nu atingeți suportul", ok || giCmdRul("s")),
    ["#tk-serial", "Așteptați rezultatul pe monitorul serial", ok], [giR(0), "Apăsați <b>„● Medii și σ → Tabelul 8.1”</b>", pe("t81", "med", "az")]]; };
PASI[2].ind = () => {
  const u = MD.UNGHIURI.find(x => !pe("t82", "u" + x, "ay")), o = [[giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run], ...giFaraVib()];
  if (u === undefined) {
    if (sim.vib) { if (sim.giVibT0 == null) sim.giVibT0 = sim.tS; if (sim.tS - sim.giVibT0 >= 3) sim.giVib = true; } else sim.giVibT0 = null;
    return [[giS, "Apăsați <b>▶ Pornește simularea</b>", sim.run || sim.giVib], [giPm("[data-vib]"), "Porniți <b>〰 Vibrații</b>", sim.vib || !!sim.giVib],
      ["#tk-plot", "Urmăriți pe plotter ≈ 3 s: φacc devine zgomotos, φ din filtru rămâne liniștit", !!sim.giVib], [giPm("[data-vib]"), "Opriți <b>〰 Vibrațiile</b>", !!sim.giVib && !sim.vib]];
  }
  const r = rez("m"), ok = !!(r && !r.miscat && Math.abs(r.phiR - u) < 0.05);
  return [...o, giUnghi(u), giCmd("m", "Apăsați <b>m – mediere 1 s</b>", ok || giCmdRul("m")), ["#tk-serial", "Așteptați ay, az, φacc pe monitorul serial", ok], [giR(0), `Apăsați <b>„● ay, az → Tabelul 8.2”</b> (${u}°)`, false]];
};
PASI[3].ind = () => {
  const k = ["fara", "cu"].find(x => !pe("t84", x, "d")); if (!k) return [[giR(0), "Tabelul 8.4 este complet", true]];
  const cor = k === "cu", ok = sim.run && !!sim.fw && sim.fw.cor === cor, r = rez("d"), gata = !!(ok && r && !r.miscat && r.cor === cor);
  return [...giCfg({ COR: String(cor) }, ok), ...giFaraVib(), giUnghi(0), giVit(), giCmd("d", "Apăsați <b>d – derivă 60 s</b> și nu mișcați suportul", gata || giCmdRul("d")),
    ["#tk-serial", "Așteptați rezultatul Δφg", gata], [giR(0), `Apăsați <b>„● Deriva 60 s → Tabelul 8.4”</b> (${cor ? "cu" : "fără"} corecție)`, false]];
};
PASI[4].ind = () => {
  const a = MD.ALFE.find(x => !pe("t83", MD.cheieA(x), "t90")); if (a === undefined) return [[giR(0), "Tabelul 8.3 este complet", true]];
  const ok = sim.run && !!sim.fw && !sim.fw.cor && sim.fw.alpha === a, r = rez("d"), t = rez("t"), dOk = !!(ok && r && !r.miscat && r.alpha === a), tOk = !!(ok && t && t.alpha === a && Math.abs(t.dA - 30) <= 0.1);
  return [...giCfg({ ALPHA: String(a), COR: "false" }, ok), ...giFaraVib(), [[giA('[data-un2="0"]'), giPm('[data-un="0"]')], "Suportul la <b>0°</b>", Math.abs(sim.phi) < 0.05 || tOk], giVit(),
    giCmd("d", "Apăsați <b>d – derivă 60 s</b> (repaus)", dOk || giCmdRul("d")), ["#tk-serial", "Așteptați rezultatul testului de derivă", dOk],
    [[giA('[data-rap2="30"]'), giPm('[data-rap="30"]')], "Apăsați <b>⚡ Rapid 0 → 30°</b> și așteptați t90", tOk],
    [giR(0), `Apăsați <b>„● σ, derivă, t90 → Tabelul 8.3”</b> (α = ${a}), apoi <b>⚡ Rapid → 0°</b>`, false]];
};
PASI[5].ind = () => {
  const f = MD.FS.find(x => !pe("t85", MD.cheieF(x), "apk")); if (f === undefined) return [[giR(0), "Tabelul 8.5 este complet", true]];
  const ok = sim.run && !!sim.fw && sim.fw.fs === f, r = rez("soc");
  return [...giCfg({ FS: String(f) }, ok), [[giA("[data-cio2]"), giPm("[data-cio]"), giK("ciocan")], "Apăsați <b>🔨 Lovește suportul</b>", !!(ok && r && r.f === f)],
    [giR(0), `Apăsați <b>„● Vârf, durată → Tabelul 8.5”</b> (${f} Hz)`, false]];
};

const VEDERI = { tot: [[0.0, 0.55, 0.8], [0.0, 0.08, -0.02]], suport: [[-0.18, 0.32, 0.42], [-0.18, 0.12, -0.02]], mega: [[0.22, 0.28, 0.38], [0.22, 0.0, 0.08]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl && p.ctl() ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată în montajul 3D</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => { Cadru.arataTab("anim"); setTimeout(() => vedere3d(PASI[+b.dataset.vezi].v3), 600); }));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-un2]").forEach(b => b.addEventListener("click", () => rotesteLa(+b.dataset.un2, false)));
  $$("#pasi [data-rap2]").forEach(b => b.addEventListener("click", () => rotesteLa(+b.dataset.rap2, true)));
  $$("#pasi [data-cmd2]").forEach(b => b.addEventListener("click", () => comanda(b.dataset.cmd2)));
  $$("#pasi [data-vit2]").forEach(b => b.addEventListener("click", comutaViteza));
  $$("#pasi [data-cio2]").forEach(b => b.addEventListener("click", loveste));
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
  if (!$("#pasi .pas")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ editorul și simularea */
const PROG = { titlu: "imu_filtru" };
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
function cod() {
  return `${K_("#include")} ${S_("&lt;Wire.h&gt;")}                       ${C_("// MPU-6050 la 0x68, registre direct")}
${K_("const")} ${K_("float")} DT = ${N_("0.01")}, ALPHA = ${sel("ALPHA", [["0.9", "0.90"], ["0.98", "0.98"], ["0.995", "0.995"]])};        ${C_("// (8.5), (8.6): τ = α·Δt/(1 − α)")}
${K_("const")} ${K_("bool")} CORECTIE = ${sel("COR", [["true", "true"], ["false", "false"]])};             ${C_("// scade eroarea de zero gx0")}
${K_("const")} ${K_("int")} FS_ADXL = ${sel("FS", [["100", "100"], ["1000", "1000"], ["4000", "4000"]])};              ${C_("// Hz, A8…A10 (testul de șoc)")}
${K_("float")} phi = ${N_("0")}, phiG = ${N_("0")}, gx0 = ${N_("0")};

${K_("void")} setup() {
  Wire.begin(); scrie(${N_("0x6B")}, ${N_("0")});                    ${C_("// trezește MPU-6050")}
  scrie(${N_("0x1C")}, ${N_("0x00")}); scrie(${N_("0x1B")}, ${N_("0x00")});     ${C_("// ±2 g, ±250 °/s")}
  ${K_("if")} (CORECTIE) gx0 = mediaGx(${N_("1000")});            ${C_("// 10 s în repaus")}
}
${K_("void")} loop() {                                ${C_("// la fiecare 10 ms")}
  readMPU(ax, ay, az, gx, gy, gz);              ${C_("// valori brute, int16")}
  ${K_("float")} Ay = ay / ${N_("16384.0")}, Az = az / ${N_("16384.0")}, Ax = ax / ${N_("16384.0")};
  ${K_("float")} wx = (gx - gx0) / ${N_("131.0")};                ${C_("// °/s")}
  ${K_("float")} phiAcc = atan2(Ay, Az) * ${N_("57.2958")};         ${C_("// (8.1)")}
  ${K_("float")} thAcc = atan2(-Ax, sqrt(Ay*Ay + Az*Az)) * ${N_("57.2958")}; ${C_("// (8.2)")}
  phiG += wx * DT;                              ${C_("// (8.3)")}
  phi = ALPHA * (phi + wx * DT) + (${N_("1")} - ALPHA) * phiAcc;  ${C_("// (8.5)")}
  comenzi();                                    ${C_("// s, m, d, z – monitorul serial")}
  ${K_("if")} (soc()) capturaADXL(FS_ADXL);              ${C_("// vârf și durată, prag 5 g")}
  afiseaza(phiAcc, phiG, phi, thAcc);
}`;
}
function afiseazaCod() {
  $("#tk-cod").innerHTML = cod().split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value; }); });
  $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  if (!sim.v3) return Cadru.mesajTemporar("NSSM: conectați ADXL377 la 3,3 V înainte de alimentarea plăcii (selectorul de pe planșă).", "pericol");
  sim.fw = { alpha: Number(sim.camp.ALPHA), cor: sim.camp.COR === "true", fs: Number(sim.camp.FS) }; sim.run = true; pornesteProgram();
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.pr = null;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} (ALPHA = ${sim.fw.alpha}, CORECTIE = ${sim.fw.cor}, FS = ${sim.fw.fs} Hz)` : "—"; }

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaMAM8(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date || {}, { num }), F = Number.isFinite, cel = { t82: {}, t83: {}, t84: {} };
  MD.UNGHIURI.forEach(u => { const x = o.err["u" + u]; cel.t82["u" + u] = { pa: F(x.pa) ? fx(x.pa, 2) : "", e: F(x.e) ? fx(x.e, 2) : "" }; });
  MD.ALFE.forEach(a => { cel.t83[MD.cheieA(a)] = { tau: fx(MD.tau(a), 3) }; });
  ["fara", "cu"].forEach(k => { const v = num(t.t84[k].d); cel.t84[k] = { bg: F(v) ? fx(v / 60, 4) : "" }; });
  const cf = MD.ALFE.map(a => { const r = t.t83[MD.cheieA(a)]; return [a, num(r.sigma), num(r.drift), num(r.t90)]; });
  const pts = MD.UNGHIURI.map(u => [num(t.t82["u" + u].phiR), o.err["u" + u].e]).filter(x => F(x[0]) && F(x[1]));
  const rez = [
    ["Eroarea medie a ruliului din accelerometru", F(o.errMed) ? `<span style="color:var(--accent)">${fx(o.errMed, 2)}°</span>` : "—"],
    ["Eroarea de zero a giroscopului (8.4), fără corecție", F(o.bg) ? `${fx(o.bg, 3)} °/s (${fx(o.bg * 60, 1)}° în 60 s)` : "—"],
    ["Deriva după corecția gx0", F(o.bgc) ? `${fx(o.bgc * 60, 2)}° în 60 s` : "—"],
    ["τ pentru α = 0,90 / 0,98 / 0,995 (Δt = 10 ms)", MD.ALFE.map(a => fx(MD.tau(a), 3) + " s").join(" / ")],
    ["t90 la înclinarea rapidă", cf.some(x => F(x[3])) ? cf.map(x => F(x[3]) ? `${x[0]}: ${x[3]} ms` : "").filter(Boolean).join(" · ") : "—"]
  ];
  const verdicte = [];
  if (F(o.errMed)) verdicte.push({ tip: o.errMed < 2 ? "ok" : "atentie", text: `Ruliul din accelerometru diferă de raportor cu ${fx(o.errMed, 2)}° în medie (verificarea standului: 30 ± 2°). Abaterea vine din erorile de zero și de scală ale accelerometrului și din montajul modulului pe platformă, ușor rotit față de raportor.` });
  if (F(o.bg)) verdicte.push({ tip: "ok", text: `Integrarea fără corecție acumulează ${fx(Math.abs(o.bg) * 60, 1)}° în 60 s; corecția erorii de zero o reduce${F(o.bgc) ? ` la ${fx(Math.abs(o.bgc) * 60, 2)}°` : ""}, dar nu o elimină (eroarea de zero variază în timp și cu temperatura).` });
  if (cf.filter(x => F(x[1])).length >= 2) verdicte.push({ tip: "ok", text: "Cu α mai mare zgomotul filtrului scade, dar deriva (abaterea staționară ≈ b<sub>g</sub>·τ) și revenirea după saturația giroscopului la înclinarea rapidă cresc: α se alege după dinamica aplicației." });
  return { celule: cel, rezultate: rez, verdicte, titluGrafic: "Eroarea ruliului din accelerometru față de raportor",
    grafic: { xmin: -5, xmax: 65, ymin: Math.min(-2, ...pts.map(x => x[1] * 1.2)), ymax: Math.max(2, ...pts.map(x => x[1] * 1.2)), xlab: "φ raportor [°]", ylab: "φacc − φ raportor [°]", serii: [{ tip: "linie", pts, culoare: 0 }, { tip: "pct", pts, culoare: 0, r: 4 }] },
    legenda: [["eroarea φacc", "var(--serie-0)"]], principal: { eticheta: "eroarea medie a ruliului [°]", valoare: F(o.errMed) ? +o.errMed.toFixed(3) : null } };
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Modulele se fixează cu șuruburi pe suportul rotativ; suportul se lovește numai cu ciocanul de cauciuc, pe zona indicată, la testul de șoc.</li>
<li>Accelerometrul ADXL377 se alimentează la 3,3 V; nu se leagă la 5 V.</li>
<li>Cablurile I²C se leagă cu lungime de rezervă și se fixează cu brățări, astfel încât rotirea suportului să nu le smulgă.</li></ul></div>
<h2>8.1. Scopul lucrării</h2>
<p>Citirea accelerometrului și a giroscopului unui modul MEMS (MPU-6050), calculul unghiurilor de ruliu și tangaj din accelerații, integrarea vitezei unghiulare și observarea derivei, apoi fuziunea celor două prin filtrul complementar; măsurarea unui șoc cu accelerometrul de domeniu mare ADXL377.</p>
<h2>8.2. Noțiuni teoretice</h2>
<p>Senzorii inerțiali MEMS sunt folosiți în automobil pentru ESC (viteza de girație, accelerația laterală), airbag (accelerații de impact), navigație și ADAS. Accelerometrul măsoară accelerația specifică, inclusiv gravitația; în repaus, din componentele ei rezultă înclinarea. Giroscopul măsoară viteza unghiulară, a cărei integrare dă unghiul, dar cu derivă din cauza erorii de zero (Fig. 8.1).</p>
<div class="ec"><span>φ<sub>acc</sub> = atan2(a<sub>y</sub>, a<sub>z</sub>)</span><span class="nr">(8.1)</span></div>
<div class="ec"><span>θ<sub>acc</sub> = atan2(−a<sub>x</sub>, √(a<sub>y</sub>² + a<sub>z</sub>²))</span><span class="nr">(8.2)</span></div>
<div class="ec"><span>φ<sub>g,k</sub> = φ<sub>g,k−1</sub> + ω<sub>x</sub> · Δt</span><span class="nr">(8.3)</span></div>
<div class="ec"><span>Δφ<sub>derivă</sub> = b<sub>g</sub> · t</span><span class="nr">(8.4)</span></div>
<p>Filtrul complementar combină unghiul din giroscop (bun pe termen scurt) cu cel din accelerometru (bun pe termen lung): primul trece printr-un filtru trece-sus, al doilea printr-un filtru trece-jos cu aceeași constantă de timp τ.</p>
<div class="ec"><span>φ<sub>k</sub> = α · (φ<sub>k−1</sub> + ω<sub>x</sub> · Δt) + (1 − α) · φ<sub>acc,k</sub></span><span class="nr">(8.5)</span></div>
<div class="ec"><span>α = τ / (τ + Δt)</span><span class="nr">(8.6)</span></div>
<figure>${fig81()}<figcaption>Fig. 8.1. Unghiul de ruliu din accelerometru, din integrarea giroscopului și din filtrul complementar (simulare cu modelul standului)</figcaption></figure>
<p>Pentru MPU-6050 în domeniile ±2 g și ±250 °/s, sensibilitățile sunt 16 384 LSB/g și 131 LSB/(°/s).</p>
<pre class="cod">const float DT = 0.01, ALPHA = 0.98; float phi = 0;
void loop() {                          // la fiecare 10 ms
  readMPU(ax, ay, az, gx, gy, gz);        // valori brute, int16
  float Ay = ay / 16384.0, Az = az / 16384.0;
  float wx = (gx - gx0) / 131.0;          // °/s, gx0 = eroarea de zero măsurată în repaus
  float phiAcc = atan2(Ay, Az) * 57.2958;
  phi = ALPHA * (phi + wx * DT) + (1 - ALPHA) * phiAcc;
}</pre>
<h3>Observații pentru efectuarea și interpretarea măsurărilor</h3>
<ul>
<li><b>Programul de măsurare</b> are constantele CORECTIE (calibrarea erorii de zero gx0 pe 1000 de eșantioane la pornire, cu suportul nemișcat) și FS_ADXL (frecvența de citire a ADXL377 la testul de șoc), precum și comenzile pe monitorul serial: „s” (statistica pe 1000 de eșantioane), „m” (media pe 1 s), „d” (testul de 60 s: deriva giroscopului și a filtrului, zgomotul σ al filtrului pe ultimele 10 s) și „z”.</li>
<li><b>Deriva filtrului.</b> Filtrul complementar nu derivă nelimitat: eroarea de zero necorectată b<sub>g</sub> produce o abatere staționară ≈ b<sub>g</sub>·τ, atinsă în câteva constante de timp. De aceea deriva filtrului în 60 s se măsoară cu CORECTIE = false; cu corecție ea ar fi practic nulă.</li>
<li><b>Întârzierea la înclinarea rapidă.</b> O înclinare de 30° făcută cu mâna în ≈ 0,1 s depășește domeniul de ±250 °/s al giroscopului: partea pierdută prin saturație este recuperată numai prin ramura accelerometrului, cu constanta de timp τ. t90 este timpul de la începutul mișcării până când filtrul ajunge la 90 % din treaptă; la α = 0,995 el ajunge la câteva secunde. Pentru mișcări rapide se alege domeniul ±500 sau ±1000 °/s (registrul 0x1B).</li>
<li><b>Deriva giroscopului</b> se determină integrând viteza unghiulară 60 s cu modulul nemișcat, fără și cu corecția erorii de zero.</li>
<li><b>Testul de șoc.</b> Cu ADC-ul de 10 biți al plăcii Mega (5 V) rezoluția ADXL377 este ≈ 0,75 g/LSB, deci în repaus citirea sare între 0 și 1,5 g; pentru rezoluție mai bună se folosește STM32 (12 biți, 3,3 V). Funcția analogRead durează ≈ 112 µs, deci 4 kHz pe trei canale este aproape de limita plăcii. La 100 Hz un impuls de ≈ 2 ms se pierde, iar la 1 kHz vârful este subestimat – de aceea senzorii de airbag eșantionează la câțiva kHz.</li>
<li><b>Accelerațiile de mișcare.</b> Modulul se află la câțiva centimetri de axul de rotație: în timpul rotirii, accelerațiile tangențială și centripetă se adaugă gravitației și perturbă φ<sub>acc</sub> – vizibil la înclinarea rapidă și cu vibrațiile pornite.</li>
</ul>
<h2>8.3. Aparatură și echipamente</h2>
<ul><li>Module MPU-6050 (6 axe, I²C) și ADXL377 (±200 g, analogic)</li>
<li>Suport rotativ imprimat 3D cu raportor digital (referință de unghi)</li>
<li>Standul de lucru cu Arduino Mega / STM32F103 și afișaj OLED; PC cu Serial Plotter, Excel sau Python</li></ul>
<h2>8.4. Modul de lucru (în simulator)</h2>
<ol><li>Cu modulul în repaus pe orizontală se înregistrează 1000 de eșantioane; media și abaterea standard pe fiecare axă și eroarea de zero a giroscopului (Tabelul 8.1).</li>
<li>Se înclină suportul la 0, 15, 30, 45 și 60° față de raportor și se calculează ruliul din accelerometru (Tabelul 8.2).</li>
<li>Cu modulul nemișcat se integrează viteza unghiulară fără și cu corecția erorii de zero, 60 s (Tabelul 8.4).</li>
<li>Filtrul complementar pentru α = 0,90; 0,98; 0,995: zgomotul, deriva și răspunsul la înclinarea rapidă (Tabelul 8.3).</li>
<li>Test de șoc: ADXL377 citit la 100 Hz, 1 kHz și 4 kHz; vârful accelerației și durata impulsului (Tabelul 8.5).</li></ol>
<h2>8.7. Interpretarea rezultatelor</h2>
<ul><li>Unghiul din accelerometru este corect în repaus, dar perturbat de accelerațiile de mișcare și de vibrații.</li>
<li>Unghiul din giroscop urmărește bine mișcările rapide, dar deriva se acumulează; corecția erorii de zero o reduce, dar nu o elimină.</li>
<li>Un α mare reduce zgomotul, dar corectează lent deriva; α se alege după dinamica aplicației (τ de ordinul a 0,5…2 s).</li></ul>
<h2>8.8. Relevanță practică</h2>
<p>Fuziunea datelor inerțiale este folosită în ESC, în detectarea răsturnării, în navigație și în vehiculele autonome, unde filtrul Kalman extinde principiul filtrului complementar. Algoritmii de estimare a stării vehiculului sunt o direcție importantă de cercetare. Senzorul de girație și accelerații al ESC este prezentat în fila „Pe autovehicul (3D)”.</p>`;
function fig81() {
  const p = MD.parametri(20261029), X0 = 50, W = 560, Hh = 170, T = 12, x = t => X0 + t / T * W, y = v => 20 + (40 - v) / 60 * Hh;
  let phi = 0, pg = 0, a = [], g = [], f = [], r = [], rnd = mulberry32(7), gs = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (let k = 0; k <= T / MD.DT; k++) { const t = k * MD.DT, tr = t < 2 ? 0 : t < 3 ? 30 * (t - 2) : t < 7 ? 30 : t < 8 ? 30 - 30 * (t - 7) : 0, w = t >= 2 && t < 3 ? 30 : t >= 7 && t < 8 ? -30 : 0;
    const ac = MD.acc(p, tr, w, 0), pa = Math.atan2(ac.ay + gs() * 0.02, ac.az + gs() * 0.02) * 180 / Math.PI, wx = w + 0.8 + gs() * 0.1; pg += wx * MD.DT; phi = 0.98 * (phi + wx * MD.DT) + 0.02 * pa;
    if (k % 4 === 0) { a.push([x(t), y(pa)]); g.push([x(t), y(pg)]); f.push([x(t), y(phi)]); r.push([x(t), y(tr)]); } }
  const L = (pts, c, w) => `<path d="M${pts.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" L")}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
  return `<svg viewBox="0 0 660 230" class="fig-svg" role="img" aria-label="Fig. 8.1"><g font-size="10" fill="currentColor"><line x1="${X0}" y1="${y(0)}" x2="${X0 + W}" y2="${y(0)}" stroke="currentColor" stroke-opacity=".3"/>
    ${[0, 10, 20, 30, 40].map(v => `<text x="${X0 - 6}" y="${y(v) + 3}" text-anchor="end">${v}°</text>`).join("")}${[0, 2, 4, 6, 8, 10, 12].map(t => `<text x="${x(t)}" y="212" text-anchor="middle">${t} s</text>`).join("")}
    ${L(a, "#ef6c00", 1)}${L(g, "#2e7d32", 1.6)}${L(f, "#1565c0", 2)}${L(r, "currentColor", 1)}
    <text x="${X0 + 8}" y="226" fill="#ef6c00">φacc (zgomotos)</text><text x="${X0 + 130}" y="226" fill="#2e7d32">φ giroscop (derivă)</text><text x="${X0 + 270}" y="226" fill="#1565c0">φ filtru α = 0,98</text><text x="${X0 + 400}" y="226">raportor</text></g></svg>`;
}
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>În repaus înclinat se citesc a<sub>y</sub> = 0,500 g și a<sub>z</sub> = 0,866 g; filtrul lucrează la Δt = 10 ms cu τ = 0,49 s; eroarea de zero a giroscopului este b<sub>g</sub> = 0,3 °/s:</p>
<div class="ec"><span>φ<sub>acc</sub> = atan2(0,500; 0,866) = 30,0°</span><span class="nr">(8.7)</span></div>
<div class="ec"><span>α = 0,49 / (0,49 + 0,01) = 0,98</span><span class="nr">(8.8)</span></div>
<div class="ec"><span>Δφ<sub>derivă</sub> = 0,3 · 60 = 18° în 60 s</span><span class="nr">(8.9)</span></div>
<div class="problema"><h3>Problema 1</h3><p>MPU-6050 (±2 g) dă în repaus a<sub>y</sub> = 4096 LSB și a<sub>z</sub> = 15 826 LSB. Calculați ruliul.</p><details class="sol"><summary>Rezolvare</summary><p>a<sub>y</sub> = 4096/16 384 = 0,25 g; a<sub>z</sub> = 0,966 g; φ = atan2(0,25; 0,966) = 14,5°.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Ce abatere staționară produce în filtrul complementar cu α = 0,98 (Δt = 10 ms) o eroare de zero necorectată de 0,5 °/s?</p><details class="sol"><summary>Rezolvare</summary><p>τ = 0,98 · 0,01 / 0,02 = 0,49 s; abaterea ≈ b<sub>g</sub>·τ = 0,5 · 0,49 = 0,25° (față de 30° în 60 s la integrarea simplă).</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Un impuls de șoc semisinusoidal durează 2 ms. Câte eșantioane cad în impuls la 1 kHz și la 4 kHz? Ce se întâmplă la 100 Hz?</p><details class="sol"><summary>Rezolvare</summary><p>La 1 kHz 2 eșantioane (vârful poate fi ratat cu până la ≈ 30 %), la 4 kHz 8 eșantioane; la 100 Hz perioada este 10 ms – impulsul cade de cele mai multe ori între două eșantioane și nu este văzut.</p></details></div>`;
}
const INTREBARI = [
  ["De ce accelerometrul poate măsura înclinarea numai în repaus sau la mișcare uniformă?", "Accelerometrul măsoară accelerația specifică = accelerația proprie minus gravitația. Numai când accelerația proprie este nulă (repaus sau mișcare rectilinie uniformă) citirea este doar gravitația, din care rezultă înclinarea; la accelerare, frânare, viraj sau vibrații componentele se adaugă și unghiul calculat este greșit."],
  ["Ce este deriva giroscopului și cum se reduce?", "Integrarea vitezei unghiulare acumulează eroarea de zero (și zgomotul): unghiul crește liniar cu timpul (b<sub>g</sub>·t). Se reduce prin măsurarea erorii de zero în repaus și scăderea ei (calibrare), compensarea cu temperatura, senzori mai buni și, mai ales, prin fuziunea cu o referință absolută (accelerometrul, în filtrul complementar sau Kalman)."],
  ["Calculați α pentru τ = 1 s și Δt = 5 ms.", "α = τ/(τ + Δt) = 1/1,005 = 0,995."],
  ["Ce senzor inerțial folosește sistemul ESC și ce mărimi măsoară?", "Senzorul combinat de girație și accelerații (în consola centrală, aproape de centrul de masă): viteza de girație (rotația în jurul axei verticale) și accelerația laterală, uneori și longitudinală; ESC le compară cu girația dorită, calculată din unghiul volanului și viteză."],
  ["De ce la airbag se folosesc accelerometre cu domeniu mare și eșantionare rapidă?", "La impact accelerațiile ating zeci–sute de g în câteva milisecunde; decizia de declanșare trebuie luată în 10…30 ms. Un domeniu mic s-ar satura, iar o eșantionare lentă ar rata sau ar subestima vârful și forma impulsului (Tabelul 8.5)."]
];
const TEST = [
  { q: "În repaus, pe orizontală, un accelerometru MEMS cu axa Z în sus indică:", o: ["az = 0", "az ≈ +1 g", "az ≈ 9,81 g", "ax = 1 g"], c: 1, e: "Măsoară accelerația specifică: reacțiunea la gravitație, +1 g pe Z." },
  { q: "Ruliul pentru ay = 0,5 g și az = 0,866 g este:", o: ["15°", "30°", "45°", "60°"], c: 1, e: "atan2(0,5; 0,866) = 30°." },
  { q: "Integrarea unei erori de zero de 0,3 °/s timp de 60 s dă:", o: ["0,3°", "5°", "18°", "60°"], c: 2, e: "Δφ = b<sub>g</sub>·t = 18°." },
  { q: "Pentru Δt = 10 ms și α = 0,98, constanta de timp a filtrului este:", o: ["0,01 s", "0,1 s", "0,49 s", "4,9 s"], c: 2, e: "τ = α·Δt/(1 − α) = 0,49 s." },
  { q: "Un α mai mare în filtrul complementar:", o: ["mărește zgomotul", "reduce zgomotul, dar corectează mai lent deriva", "elimină deriva", "nu schimbă nimic"], c: 1, e: "Ramura accelerometrului are pondere mai mică (filtrare mai puternică, τ mai mare)." },
  { q: "ADXL377 se alimentează:", o: ["la 5 V", "la 3,3 V", "la 12 V", "de la pinul A8"], c: 1, e: "NSSM: la 5 V modulul se distruge." }
];
const CSS = `<style>
.tk { padding:0 !important; overflow:hidden; background:#fff; color:#222; }
.tk-bara { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; padding:.45rem .6rem; background:#fff; border-bottom:1px solid #e3e3e3; }
.tk-logo { font:600 .9rem system-ui,sans-serif; color:#333; margin-right:auto; } .tk-logo b { color:#1477d1; }
.tk-bara button { border:1px solid #cfd4da; background:#fff; color:#333; border-radius:4px; padding:.32rem .7rem; font:600 .82rem system-ui,sans-serif; cursor:pointer; }
.tk-bara button.activ { background:#e8f1fb; border-color:#1477d1; color:#0d5ea8; }
.tk-bara .tk-start { background:#2e9e44; border-color:#2e9e44; color:#fff; } .tk-bara .tk-start.ruleaza { background:#d6452f; border-color:#d6452f; }
.tk-plansa { position:relative; background:#eef1f3; border-bottom:1px solid #e3e3e3; min-height:120px; }
#tk-svg { width:100%; height:auto; aspect-ratio:1300/560; display:block; user-select:none; font-family:system-ui,sans-serif; background:#fbfbfb; }
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
Cadru.porneste({
  disc: "MAM1", nr: 8, cod: "mam1-l8",
  titlu: "Senzori inerțiali (IMU): unghiurile de ruliu și tangaj, filtrul complementar",
  scurt: "Senzori inerțiali (IMU)",
  subtitlu: "Laborator virtual – MPU-6050 pe suportul rotativ cu raportor digital, ADXL377 pentru testul de șoc, Arduino Mega cu OLED: ruliul din accelerometru, deriva giroscopului, filtrul complementar și eșantionarea impulsurilor de șoc",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261029); },
  date: [{ k: "dt", et: "Δt [s]", v: MD.DT, fix: true }, { k: "sa", et: "sensibilitate acc. [LSB/g]", v: 16384, fix: true }, { k: "sg", et: "sensibilitate gir. [LSB/(°/s)]", v: 131, fix: true }],
  tabele: [
    { id: "t81", titlu: "Tabelul 8.1. Senzorul în repaus", antetRand: "Mărime", nota: "1000 de eșantioane (10 s) cu modulul nemișcat, pe orizontală – comanda „s”. ωx mediu = eroarea de zero a giroscopului b<sub>g</sub>.",
      randuri: [{ k: "med", et: "Medie" }, { k: "sd", et: "Abatere standard" }],
      coloane: [{ k: "ax", t: "a<sub>x</sub> [g]", intrare: true }, { k: "ay", t: "a<sub>y</sub> [g]", intrare: true }, { k: "az", t: "a<sub>z</sub> [g]", intrare: true }, { k: "wx", t: "ω<sub>x</sub> [°/s]", intrare: true }, { k: "wy", t: "ω<sub>y</sub> [°/s]", intrare: true }, { k: "wz", t: "ω<sub>z</sub> [°/s]", intrare: true }] },
    { id: "t82", titlu: "Tabelul 8.2. Unghiul de ruliu din accelerometru", antetRand: "φ nominal [°]", nota: "Media pe 1 s (comanda „m”) după oprirea suportului; φ<sub>acc</sub> din (8.1); eroarea = φ<sub>acc</sub> − φ<sub>raportor</sub>.",
      randuri: MD.UNGHIURI.map(u => ({ k: "u" + u, et: String(u) })),
      coloane: [{ k: "phiR", t: "φ raportor [°]", intrare: true }, { k: "ay", t: "a<sub>y</sub> [g]", intrare: true }, { k: "az", t: "a<sub>z</sub> [g]", intrare: true }, { k: "pa", t: "φ<sub>acc</sub> [°]" }, { k: "e", t: "Eroare [°]" }] },
    { id: "t84", titlu: "Tabelul 8.4. Deriva giroscopului în 60 s", antetRand: "Integrarea", nota: "Modulul nemișcat; Δφ<sub>g</sub> din integrarea (8.3) în 60 s (comanda „d”); b<sub>g</sub> = Δφ<sub>g</sub>/60 (8.4).",
      randuri: [{ k: "fara", et: "fără corecția erorii de zero" }, { k: "cu", et: "cu corecția gx0 (calibrare la pornire)" }],
      coloane: [{ k: "d", t: "Δφ<sub>g</sub> în 60 s [°]", intrare: true }, { k: "bg", t: "b<sub>g</sub> echivalent [°/s]" }] },
    { id: "t83", titlu: "Tabelul 8.3. Filtrul complementar (CORECTIE = false)", antetRand: "α", nota: "τ din (8.6) la Δt = 10 ms; σ – zgomotul lui φ pe ultimele 10 s ale testului „d”; deriva = φ(60 s) − φ(0); t90 – de la începutul înclinării rapide 0 → 30° până la 90 % din treaptă.",
      randuri: MD.ALFE.map(a => ({ k: MD.cheieA(a), et: fmt(a, a === 0.995 ? 3 : 2) })),
      coloane: [{ k: "tau", t: "τ [s]" }, { k: "sigma", t: "Zgomot în repaus σ [°]", intrare: true }, { k: "drift", t: "Deriva în 60 s [°]", intrare: true }, { k: "t90", t: "Întârziere la înclinare rapidă t90 [ms]", intrare: true }] },
    { id: "t85", titlu: "Tabelul 8.5. Testul de șoc cu ADXL377", antetRand: "Eșantionare", nota: "Lovitură ușoară cu ciocanul de cauciuc; vârful pe axa Z și durata (eșantioanele consecutive peste 10 % din vârf) din program.",
      randuri: MD.FS.map(f => ({ k: MD.cheieF(f), et: f >= 1000 ? f / 1000 + " kHz" : f + " Hz" })),
      coloane: [{ k: "apk", t: "Vârful accelerației [g]", intrare: true }, { k: "dur", t: "Durata impulsului [ms]", intrare: true }, { k: "n", t: "Eșantioane în impuls", intrare: true }] }
  ],
  inaltimeGrafic: 280,
  calculeaza: calculeazaMAM8,
  intrebari() {
    return [
      { id: "q1", u: "", text: "α pentru τ = 1 s și Δt = 5 ms (Întrebarea 3), cu 4 zecimale:", textSimplu: "α pentru τ = 1 s" },
      { id: "q2", u: "°/s", text: "Eroarea de zero a giroscopului (în valoare absolută), din deriva în 60 s fără corecție (Tabelul 8.4):", textSimplu: "b<sub>g</sub>" },
      { id: "q3", u: "°", text: "Eroarea medie (în valoare absolută) a ruliului din accelerometru față de raportor (Tabelul 8.2):", textSimplu: "eroarea medie a ruliului" },
      { id: "q4", u: "s", text: "Constanta de timp τ a filtrului cu α = 0,995 la Δt = 10 ms:", textSimplu: "τ pentru α = 0,995" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    if (t.t81.med.az === "") l.push("Tabelul 8.1: statistica în repaus");
    const a = MD.UNGHIURI.filter(u => t.t82["u" + u].ay !== "").length; if (a < 5) l.push(`Tabelul 8.2: ${a}/5 unghiuri`);
    const b = ["fara", "cu"].filter(k => t.t84[k].d !== "").length; if (b < 2) l.push(`Tabelul 8.4: ${b}/2 rânduri`);
    const c = MD.ALFE.filter(x => t.t83[MD.cheieA(x)].t90 !== "").length; if (c < 3) l.push(`Tabelul 8.3: ${c}/3 valori α`);
    const f = MD.FS.filter(x => t.t85[MD.cheieF(x)].apk !== "").length; if (f < 3) l.push(`Tabelul 8.5: ${f}/3 frecvențe`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t82.u30, { phiR: "30.0", ay: "0.5000", az: "0.8660" }); Object.assign(t.t84.fara, { d: "18.000" }); },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul la scară reală: suportul rotativ imprimat 3D cu axul pe rulmenți, platforma cu MPU-6050, ADXL377 și raportorul digital, cablurile fixate cu brățări pe ax, ciocanul de cauciuc, Arduino Mega cu OLED și laptopul. Platforma se rotește cu ruliul din simulator; ecranele raportorului și al OLED-ului sunt cele din planșă; clic pe ciocan = lovitura de test.</p>`,
    modul: "montaj3d.js?v=2", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, 0, 1300, 560], construieste: L => montaj3dL8(L), cam: VEDERI.tot[0], tinta: VEDERI.tot[1], laClic: k => laClic3d(k),
      vederi: { tot: [...VEDERI.tot, "Ansamblu"], suport: [...VEDERI.suport, "Suportul și senzorii"], mega: [...VEDERI.mega, "Arduino Mega"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Senzorul de girație și accelerații al ESC",
    intro: `<p>Sistemul ESC folosește un senzor inerțial combinat (viteza de girație și accelerațiile laterală și longitudinală), montat în consola centrală, aproape de centrul de masă; calculatorul de airbag are propriile accelerometre de domeniu mare, iar senzorii de impact sunt în față și în lateral. Selectați senzorul ESC în machetă: amplasarea, mufa și semnalul.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "esc" })
  },
  atelierSenzori: { intro: `<p>Senzorul de girație și accelerații al ESC este preselectat: modelul 3D, mufa și verificările (eroarea de zero în repaus, semnalul la viraj, calibrarea după înlocuire). Puteți alege și alți senzori din listă.</p>`, optiuni: { initial: "esc" } },
  referat: {
    scop: "Citirea unui IMU MEMS, calculul ruliului din accelerații, integrarea giroscopului și deriva lui, filtrul complementar și eșantionarea unui impuls de șoc.",
    relatii: "φ<sub>acc</sub> = atan2(a<sub>y</sub>, a<sub>z</sub>); &nbsp; θ<sub>acc</sub> = atan2(−a<sub>x</sub>, √(a<sub>y</sub>² + a<sub>z</sub>²)); &nbsp; φ<sub>g,k</sub> = φ<sub>g,k−1</sub> + ω<sub>x</sub>Δt; &nbsp; φ<sub>k</sub> = α(φ<sub>k−1</sub> + ω<sub>x</sub>Δt) + (1 − α)φ<sub>acc,k</sub>; &nbsp; α = τ/(τ + Δt).",
    varianta: () => "Exemplarul propriu al fiecărui student: erorile de zero și de scală ale accelerometrului pe fiecare axă, zgomotul, erorile de zero ale giroscopului, montajul modulului pe platformă, distanța față de ax, viteza înclinării rapide și impulsul de șoc al suportului.",
    indicatii: "Comparați φ<sub>acc</sub> cu raportorul, deriva fără și cu corecție, efectul lui α asupra zgomotului, derivei și întârzierii (saturația giroscopului), efectul vibrațiilor și frecvența de eșantionare necesară la șoc…"
  },
  subsol: "Modelul: MPU-6050 cu erori de zero și de scală, zgomot alb, saturație ±250 °/s, accelerații cinematice la distanța r de ax; programul la 100 Hz; ADXL377 6,5 mV/g citit cu ADC de 10 biți; impuls de șoc semisinusoidal cu oscilație amortizată. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      ${ghidSectiune()}
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Stand</b> · MAM I – Lucrarea 8</span>
        <button type="button" id="tk-fit" title="Închide fereastra de detalii">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div><div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-pompa" id="tk-pompa"></div>
      <div class="tk-afis" id="afis"></div>
      <p class="tk-ajutor">Înclinați suportul cu butoanele (lent sau rapid) · clic pe selectorul ADXL377, pe brățări, pe ciocan · comenzile programului: s, m, d, z (butoane sau monitorul serial) · clic pe celelalte componente = detalii. Montajul real în 3D este în fila „Montajul real (3D)”.</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – Arduino Mega 2560</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite (s, m, d, z)" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div>
          <div class="tk-cod-sus"><b>Plotter serial – unghiul de ruliu</b></div>
          <canvas id="tk-plot" aria-label="Plotterul serial: ruliul din accelerometru, giroscop și filtru"></canvas></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Programul și mesajele</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Lucrați în ordinea pașilor din chenarul de deasupra planșei. Valorile intră în tabele numai din program și de pe raportor.</p>
    </aside>
  </div>`,
    init(C) {
      afiseazaCod(); actualizeazaFw(); actualizeaza();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => inspector(null));
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) comanda(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $$("#tk-svg [data-k]").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); laClic3d(g.dataset.k); }));
      C.mesaj("Urmați pașii din chenarul „Desfășurarea lucrării – pas cu pas”; începeți cu pregătirea montajului (NSSM).", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.p1ok = false; sim.p3ok = false; sim.giCabVazut = false; Object.assign(sim, { serial: [], ist: [], phi: 0, om: 0, ep: 0, mot: null, vib: false, viteza: 1, v3: false, bratari: false, bw: 0 }); },
    cadru(dt, C, vizibil) {
      const acum = performance.now(); let rest = Math.min(dt || 0.016, 0.1) * sim.viteza;
      while (rest > 1e-9) { const d = Math.min(0.005, rest); rest -= d; sim.tS += d; pasMiscare(d); sim.bw += -sim.bw * d / 200 + 0.001 * Math.sqrt(d) * gauss(); if (sim.run) pasProgram(d); }
      if (!vizibil) { if (C.tabActiv === "anim" && acum - (this._t3 || 0) > 80) { this._t3 = acum; planseAfis(); sincron3d(); } return; }
      if (acum - (this._to || 0) > 60) { this._to = acum; planseAfis(); }
      if (acum - (this._ts || 0) > 300) { this._ts = acum; afisaje(); plotter(); sincron3d(); actualizeazaPasi(); panouDacaSchimbat();
        C.stare(1, sim.run ? "programul rulează" : "programul oprit", sim.run ? "inc" : ""); C.stare(2, `ruliu ${fx(raportor(), 1)}° · timp ×${sim.viteza}`); }
    },
    redeseneaza() { plotter(); },
    formule() {
      const r = [], v = sim.pr && sim.pr.last; if (!v) return r;
      r.push(["Ruliul din accelerometru (8.1)", `φ<sub>acc</sub> = atan2(${fx(v.Ay, 4)}; ${fx(v.Az, 4)}) = <span class="rez">${fx(v.pa, 2)}°</span>`]);
      r.push(["Constanta de timp (8.6)", `τ = ${sim.fw.alpha} · 0,01 / (1 − ${sim.fw.alpha}) = <span class="rez">${fx(MD.tau(sim.fw.alpha), 3)} s</span>`]);
      r.push(["Filtrul complementar (8.5)", `φ = <span class="rez">${fx(v.phi, 2)}°</span> (giroscop ${fx(v.phiG, 2)}°)`]);
      return r;
    }
  }
});
let _panouK = "";
function panouDacaSchimbat() { const k = [Math.round(sim.phi * 10), !!sim.mot, sim.vib, sim.viteza, sim.v3, sim.bratari].join(); if (k !== _panouK) { _panouK = k; panou(); } }

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL8(L) {
  const { THREE, V3, mm, M } = L, R = 0xe53935, N = 0x222222;
  const mat = o => new THREE.MeshStandardMaterial(o);
  const SX = -0.18, SZ = -0.02, HA = 0.13;
  /* suportul imprimat 3D: baza, doi stâlpi, axul X */
  const S = L.grup([SX, 0, SZ]);
  L.box(0.26, mm(8), 0.12, M.pla, S, 0, mm(4), 0, mm(2));
  [-0.11, 0.11].forEach(x => { const st = L.box(mm(16), HA + mm(14), mm(40), M.pla, S, x, (HA + mm(14)) / 2, 0, mm(2)); L.k_(st, "suport", "Suportul rotativ imprimat 3D (axul X = ruliu)"); L.cyl(mm(11), mm(11), mm(8), M.otel, S, x, HA, 0, "x", 24); });
  L.cyl(mm(4), mm(4), 0.25, M.crom, S, 0, HA, 0, "x", 16);
  /* platforma rotativă cu modulele și raportorul */
  const PL = new THREE.Group(); PL.position.set(SX, HA, SZ); L.sc.add(PL);
  const pl = L.box(0.18, mm(6), 0.11, mat({ color: 0xf39a4a, roughness: 0.6 }), PL, 0, mm(14), 0, mm(1.5)); L.k_(pl, "platforma", "Platforma rotativă (ruliul se citește pe raportor)");
  L.box(mm(20), mm(14), mm(20), M.pla, PL, 0, mm(5), 0, mm(2));
  const mpu = L.box(mm(21), mm(1.6), mm(16), M.pcbA, PL, mm(-40), mm(18.5), mm(-20), mm(0.4)); L.k_(mpu, "mpu", "MPU-6050 (GY-521): axa X în lungul axului; SDA D20, SCL D21");
  L.box(mm(4), mm(1), mm(4), M.negru, PL, mm(-40), mm(19.6), mm(-20), mm(0.2));
  for (let i = 0; i < 8; i++) L.cyl(mm(0.32), mm(0.32), mm(6), M.aur, PL, mm(-48 + i * 2.54), mm(21), mm(-27), "y", 6);
  const ad = L.box(mm(13), mm(1.6), mm(13), mat({ color: 0x6a1b9a, roughness: 0.45 }), PL, mm(-10), mm(18.5), mm(-22), mm(0.4)); L.k_(ad, "adxl", "ADXL377 (±200 g, analogic, 3,3 V) → A8/A9/A10");
  const rp = L.box(mm(60), mm(20), mm(30), M.galben, PL, mm(45), mm(27), mm(20), mm(3)); L.k_(rp, "raportor", "Raportorul (înclinometrul) digital – referința de unghi");
  L.planB(L.OG.adauga([AX[0] + 48, AX[1] - 56, 80, 24], 320, 96), mm(46), mm(14), PL, mm(45), mm(37.2), mm(20), -Math.PI / 2);
  /* brățările pe ax și cablul flexibil */
  const br = [-0.06, 0.06].map(x => L.cyl(mm(6), mm(6), mm(4), M.negru, S, x, HA, 0, "x", 16));
  br.forEach(b => L.k_(b, "bratari", "Brățări pe axul suportului (cablurile cu rezervă de lungime)"));
  /* ciocanul de cauciuc */
  const CI = new THREE.Group(); CI.position.set(-0.02, mm(14), 0.12); L.sc.add(CI);
  const coada = L.cyl(mm(6), mm(6), 0.2, mat({ color: 0x8d6e63, roughness: 0.6 }), CI, 0.1, 0, 0, "x", 16), cap = L.cyl(mm(16), mm(16), mm(45), M.cauciuc, CI, 0, 0, 0, "z", 24);
  L.k_(coada, "ciocan", "Ciocanul de cauciuc – clic = lovitura de test (pe zona marcată)"); L.k_(cap, "ciocan", "Ciocanul de cauciuc – clic = lovitura de test");
  /* Arduino Mega, OLED, laptopul */
  const MG = L.arduinoMega([0.2, 0, 0.04]), OL = L.oled([0.36, 0, 0.12], { ecran: [940, 324, 210, 132] });
  const PC = L.laptop([0.48, 0, -0.18], { roty: -0.4, cod: () => L.textCod(), titlu: () => "PlatformIO – imu_filtru.cpp" });
  L.cabluUSB(MG.pin("D0").clone().set(0.2 - 0.06, 0.009, 0.025), PC.usb);
  /* cablurile: de la capătul axului (cleme) la Mega */
  const cl = L.box(mm(20), mm(12), mm(30), M.negru, S, 0.13, mm(14), 0.03, mm(1)); L.k_(cl, "suport", "Clemele de legătură ale cablului flexibil");
  const pc = i => L.lume(S, V3(0.13, mm(21), 0.03 + mm(-10 + i * 3)));
  [["5V", R], ["GND", N], ["D20", 0x1e88e5], ["D21", 0x43a047], ["3V3", 0xff9800], ["A8", 0x8e24aa], ["A9", 0xab47bc], ["A10", 0xce93d8]].forEach(([n, c], i) => L.fir(pc(i), MG.pin(n), c, { h: 30 }));
  L.tub([[SX + 0.06, HA, SZ], [SX + 0.1, HA - 0.03, SZ + 0.02], [SX + 0.13, mm(30), SZ + 0.03]], mm(2), M.gri);
  [[0, "5V", R], [1, "GND", N], [2, "D20", 0x1e88e5], [3, "D21", 0x43a047]].forEach(([i, n, c]) => L.fir(OL.pin(i), MG.pin(n), c, { h: 26 }));
  return { actualizeaza() {
    PL.rotation.x = sim.phi * Math.PI / 180;
    const ag = performance.now() - sim.ciocan < 300; CI.position.set(ag ? SX + 0.11 : -0.02, ag ? HA : mm(14), ag ? SZ + 0.02 : 0.12);
    br.forEach(b => { b.visible = sim.bratari; });
    MG.led("ON", sim.run ? 1 : 0); MG.led("TX", sim.run && performance.now() - sim.tx < 80 ? 1 : 0);
  } };
}
