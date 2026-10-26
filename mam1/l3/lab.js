/* MAM I – Lucrarea 3. Senzorul pedalei de accelerație cu două piste: plauzibilitate și reacția la defect.
   Simulator în stilul Tinkercad Circuits: senzorul pedalei pe suportul imprimat 3D cu pârghie și raportor, cutia de
   conexiuni cu bornele 1…6, cutia de defecte (S1, S2, S3, rezistorul de 2,2 kΩ, punctele de test), Arduino Mega cu afișaj
   OLED și LED-ul EPC, multimetru V/Ω cu două sonde, editorul programului de verificare și monitorul serial.
   Circuitul se rezolvă nodal (cablajul rezultă din identificarea pinilor făcută de student). Parametrii sunt individuali. */
"use strict";
const MD = MODELE["mam1-l3"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, t: 0, t0: 0, teta: 0, tetaAnt: 0, vTeta: 0, auto: 0, dec: true,
  ident: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" }, as: null, f: { s1: false, s2: false, s3: false },
  dmm: { mod: "OFF", v: null, txt: "", tA: 0, s: { dmmR: "nc", dmmB: "nc" } }, liber: {},
  camp: { eps: "0.2", n: "5" }, fw: null, pr: null, serial: [], tx: 0, vb: null, trag: false,
  exp: null, testRez: null, p3: { mn: 99, mx: -1 }
};
const sCur = () => sim.teta / MD.TETA_MAX * 100;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* ------------------------------------------------------------------ circuitul */
function circ() { return MD.circuit(P(), sCur(), sim.as || {}, sim.f, sim.dec || !sim.run); }
function vNod(id) {
  if (!sim.run) return 0;
  const c = circ();
  if (/^p\d$/.test(id)) return c.pin[+id[1]];
  return { tA0: c.A0, tA1: c.A1, t5V: P().vcc, tGND: 0 }[id] ?? NaN;
}
function ohmIntre(a, b) {       // [kΩ] sau Infinity; numai cu alimentarea oprită și conectorul X1 decuplat
  if (a === b) return 0;
  const pa = /^p\d$/.test(a), pb = /^p\d$/.test(b);
  if (pa && pb) return MD.ohm(P(), sCur(), +a[1], +b[1]);
  const k = [a, b].sort().join("-");
  if (k === "tA0-tGND" || k === "tA1-tGND") return MD.RPD;
  return Infinity;
}

/* ------------------------------------------------------------------ programul (bucla în timp simulat) */
const PROG = { titlu: "pedala_app", desc: "Verificarea pedalei cu două piste (OLED + serial)" };
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
function cod() {
  return `${K_("#include")} ${S_("&lt;Wire.h&gt;")}
${K_("#include")} ${S_("&lt;Adafruit_SSD1306.h&gt;")}     ${C_("// OLED 0,96\" 128×64, I²C 0x3C (SDA 20, SCL 21)")}
Adafruit_SSD1306 oled(${N_("128")}, ${N_("64")}, &amp;Wire);

${K_("const")} ${K_("float")} EPS = ${sel("eps", [["0.05", "0.05"], ["0.1", "0.10"], ["0.2", "0.20"], ["0.3", "0.30"], ["0.4", "0.40"], ["0.5", "0.50"]])};          ${C_("// pragul de plauzibilitate [V]")}
${K_("const")} ${K_("int")} NCONF = ${sel("n", [["1", "1"], ["3", "3"], ["5", "5"], ["10", "10"]])};           ${C_("// eșantioane consecutive pentru confirmare")}
${K_("int")} cnt = ${N_("0")}; ${K_("bool")} fault = ${K_("false")}; ${K_("uint32_t")} tFirst, k = ${N_("0")};

${K_("void")} setup() {
  Serial.begin(${N_("115200")}); pinMode(${N_("13")}, OUTPUT);          ${C_("// D13 = lampa EPC")}
  oled.begin(SSD1306_SWITCHCAPVCC, ${N_("0x3C")});
}
${K_("void")} loop() {
  ${K_("float")} u1 = analogRead(A0) * ${N_("5.0")} / ${N_("1024")}, u2 = analogRead(A1) * ${N_("5.0")} / ${N_("1024")};
  ${K_("bool")} bad = (u1 &lt; ${N_("0.25")} || u1 &gt; ${N_("4.75")} || u2 &lt; ${N_("0.25")} || u2 &gt; ${N_("4.75")} || fabs(u1 - ${N_("2")}*u2) &gt; EPS);
  ${K_("if")} (bad &amp;&amp; cnt == ${N_("0")}) tFirst = millis();
  cnt = bad ? cnt + ${N_("1")} : ${N_("0")};
  ${K_("if")} (cnt == NCONF) { fault = ${K_("true")}; Serial.print(${S_('"DEFECT confirmat, t_conf = "')}); Serial.println(millis() - tFirst); }
  ${K_("float")} s = fault ? ${N_("0")} : (u1 - ${N_("0.75")}) / ${N_("3.5")} * ${N_("100")};     ${C_("// mod de avarie: cerere 0 %")}
  digitalWrite(${N_("13")}, fault);
  ${K_("if")} (++k % ${N_("10")} == ${N_("0")}) afiseaza(u1, u2, s);          ${C_("// OLED: ≈ 20…27 ms pe I²C la 100 kHz")}
  ${K_("if")} (Serial.available() &amp;&amp; Serial.read() == ${S_("'t'")}) pornesteTest10s();
  delay(${N_("10")});
}`;
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 300) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-120).join("\n"); el.scrollTop = el.scrollHeight; }
const tS = () => (sim.t * 1000).toFixed(0).padStart(6, " ");
function pornesteProgram() {
  sim.pr = { tN: 0, k: 0, cnt: 0, fault: false, motiv: "", tFirst: 0, tc: null, u1: 0, u2: 0, s: 0, inv: 0, al: 0, test: null, tLin: 0, oled: null, uConf: null };
  seriala(`[${tS()} ms] Pedala APP – verificare 2 piste | EPS = ${Number(sim.fw.eps).toFixed(2)} V, NCONF = ${sim.fw.n}`);
}
function pasProgram(dt) {
  const pr = sim.pr, fw = sim.fw; if (!pr || !fw) return;
  const p = P();
  sim.t += dt;
  while (pr.tN <= sim.t) {
    const c = circ(), misc = Math.abs(sim.vTeta) > 2;
    let v0 = c.A0 + gauss() * p.sig, v1 = c.A1 + gauss() * p.sig;
    if (misc && Math.random() < p.pSp) v0 *= 1 - (0.06 + Math.random() * 0.14);           // ridicarea cursorului pe pista uzată
    const n0 = MD.adc(p, v0), n1 = MD.adc(p, v1), u1 = MD.uProg(n0), u2 = MD.uProg(n1), bad = MD.invalid(u1, u2, fw.eps);
    if (bad && pr.cnt === 0) pr.tFirst = pr.tN;
    pr.cnt = bad ? pr.cnt + 1 : 0;
    if (bad) pr.inv++;
    if (pr.cnt === fw.n) {
      pr.al++; const tc = (pr.tN - pr.tFirst) * 1000, m = MD.motiv(u1, u2, fw.eps);
      if (!pr.fault) { pr.fault = true; pr.motiv = m; pr.tc = tc; pr.uConf = [u1, u2];
        if (sim.exp && !sim.exp.rez && pr.tN >= sim.exp.t0) { sim.exp.rez = "da"; sim.exp.tc = tc; sim.exp.u = [u1, u2]; } }
      seriala(`[${String(Math.round(pr.tN * 1000)).padStart(6, " ")} ms] DEFECT confirmat (${m}): U1 = ${u1.toFixed(3)} V, U2 = ${u2.toFixed(3)} V, ΔU = ${Math.abs(u1 - 2 * u2).toFixed(3)} V; t_conf = ${tc.toFixed(1)} ms`);
    }
    pr.u1 = u1; pr.u2 = u2; pr.s = pr.fault ? 0 : (u1 - 0.75) / 3.5 * 100;
    pr.k++;
    let dur = p.Tl;
    if (pr.k % 10 === 0) { pr.oled = { u1, u2, s: pr.s, fault: pr.fault, motiv: pr.motiv }; dur += p.tO; }
    pr.tN += dur / 1000;
    if (pr.test && pr.tN - pr.test.t0 >= 10) {
      const inv = pr.inv - pr.test.inv0, al = pr.al - pr.test.al0;
      seriala(`[${tS()} ms] TEST 10 s: eșantioane invalide = ${inv}, confirmări (alarme) = ${al}${pr.test.dist < 100 ? "  (pârghia nu a fost acționată suficient!)" : ""}`);
      sim.testRez = { eps: fw.eps, n: fw.n, inv, al, dist: pr.test.dist }; pr.test = null;
    }
  }
  if (pr.test) pr.test.dist += Math.abs(sim.vTeta) * dt;
  if (sim.t - pr.tLin >= 0.5) { pr.tLin = sim.t; seriala(`[${tS()} ms] U1 = ${pr.u1.toFixed(3)}  U2 = ${pr.u2.toFixed(3)}  ΔU = ${Math.abs(pr.u1 - 2 * pr.u2).toFixed(3)}  s = ${pr.s.toFixed(1)} %  ${pr.fault ? "DEFECT" : "NORMAL"}`); }
  if (sim.exp && !sim.exp.rez && sim.t - sim.exp.t0 > 1.5) { sim.exp.rez = "nu"; sim.exp.tc = null; sim.exp.u = [pr.u1, pr.u2]; }
}
function trimiteSerial(txt) {
  if (!sim.run || !sim.pr) return Cadru.mesajTemporar("Porniți simularea (placa alimentată, programul rulează).", "atentie");
  seriala(`> ${txt}`);
  if (txt.trim() === "t") { sim.pr.test = { t0: sim.pr.tN, inv0: sim.pr.inv, al0: sim.pr.al, dist: 0 }; seriala(`[${tS()} ms] TEST 10 s pornit – acționați pedala pe toată cursa`); }
}
function resetMega() {
  if (!sim.run) return;
  sim.pr = null; sim.exp = null; seriala("— RESET —"); pornesteProgram(); oledAfis(); ledAfis();
}

/* ------------------------------------------------------------------ planșa (SVG, stil Tinkercad) */
const PIN = {};
function pin(id, x, y, et) { PIN[id] = { x, y, et }; return `<circle class="tk-pin" data-pin="${id}" cx="${x}" cy="${y}" r="7"/>`; }
const PV = { x: 225, y: 268 };                                   // pivotul pârghiei
const pt = (fi, r) => [PV.x + r * Math.sin(fi * Math.PI / 180), PV.y - r * Math.cos(fi * Math.PI / 180)];
const CUL_PIN = { 1: "#d32f2f", 2: "#ef9a9a", 3: "#6d4c41", 4: "#2e7d32", 5: "#bcaaa4", 6: "#f9d71c" };
const BR = { x: 40, y: 438 }, SOCK = i => [BR.x + 50 + (i - 1) * 58, BR.y + 52];
const FB = { x: 476, y: 438 }, TP = { tA0: [FB.x + 50, FB.y + 178], tA1: [FB.x + 112, FB.y + 178], t5V: [FB.x + 174, FB.y + 178], tGND: [FB.x + 236, FB.y + 178] };
const MG = { x: 840, y: 440 }, HDR = i => [MG.x + 70 + i * 11.2, MG.y + 222];   // header-ul de jos: 0 IOREF, 1 RESET, 2 3.3V, 3 5V, 4 GND, 5 GND, 6 Vin, 8… A0…
function planseSVG() {
  let s = `<svg id="tk-svg" viewBox="0 0 1300 800" role="img" aria-label="Planșa: senzorul pedalei pe suport cu raportor, cutia de conexiuni, cutia de defecte, Arduino Mega cu OLED, multimetru">
<defs>
 <filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".25"/></filter>
 <pattern id="pla" width="6" height="3" patternUnits="userSpaceOnUse"><rect width="6" height="3" fill="#f07c1e"/><rect width="6" height="1" fill="#d96a12" opacity=".7"/></pattern>
 <linearGradient id="gAlu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7eb"/><stop offset="1" stop-color="#9aa2aa"/></linearGradient>
 <linearGradient id="gNegru" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4047"/><stop offset="1" stop-color="#101214"/></linearGradient>
 <radialGradient id="gBanana" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#d9b44a"/><stop offset="1" stop-color="#7a5c10"/></radialGradient>
</defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb" id="tk-fundal"/>`;
  /* ---- standul pedalei: profil de aluminiu, suport imprimat 3D, senzorul, raportorul, pârghia */
  s += `<g class="tk-comp" data-comp="stand" filter="url(#umbra)"><rect x="34" y="388" width="392" height="22" rx="3" fill="url(#gAlu)" stroke="#7c848c"/>${[0, 1, 2, 3].map(k => `<rect x="${54 + k * 100}" y="395" width="40" height="8" rx="4" fill="#5f666d"/>`).join("")}
    <path d="M70,388 L70,150 Q70,128 92,128 L360,128 Q382,128 382,150 L382,388z" fill="url(#pla)" stroke="#b9560c"/>${[[92, 150], [360, 150], [92, 366], [360, 366]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#fbfbfb" stroke="#b9560c"/><circle cx="${x}" cy="${y}" r="4.5" fill="url(#gAlu)" stroke="#555"/>`).join("")}
    <text x="226" y="378" font-size="9" text-anchor="middle" fill="#7a3a06">suport imprimat 3D (PLA)</text></g>`;
  // raportorul (acril transparent, 0…70°)
  let r_ = `<path d="M${pt(-12, 182).join(",")} A182,182 0 0 1 ${pt(72, 182).join(",")} L${pt(72, 132).join(",")} A132,132 0 0 0 ${pt(-12, 132).join(",")}z" fill="rgba(200,230,255,.35)" stroke="#7aa7c7"/>`;
  for (let g = -10; g <= 70; g++) { const L = g % 10 === 0 ? 16 : g % 5 === 0 ? 11 : 6, [x1, y1] = pt(g, 182), [x2, y2] = pt(g, 182 - L); r_ += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1d3557" stroke-width="${g % 10 ? 0.6 : 1.2}"/>`; if (g % 10 === 0) { const [xt, yt] = pt(g, 156); r_ += `<text x="${xt.toFixed(1)}" y="${(yt + 3).toFixed(1)}" font-size="9" text-anchor="middle" fill="#1d3557" font-weight="700">${g}</text>`; } }
  s += `<g class="tk-comp" data-comp="rap">${r_}<text x="${pt(30, 140)[0]}" y="${pt(30, 140)[1]}" font-size="8" text-anchor="middle" fill="#1d3557">raportor [°]</text></g>`;
  // senzorul pedalei (carcasă neagră cu urechi, conector cu 6 pini)
  s += `<g class="tk-comp" data-comp="senzor" filter="url(#umbra)"><path d="M${PV.x - 78},${PV.y - 12} Q${PV.x - 78},${PV.y - 24} ${PV.x - 66},${PV.y - 24} L${PV.x + 66},${PV.y - 24} Q${PV.x + 78},${PV.y - 24} ${PV.x + 78},${PV.y - 12} L${PV.x + 78},${PV.y + 12} Q${PV.x + 78},${PV.y + 24} ${PV.x + 66},${PV.y + 24} L${PV.x - 66},${PV.y + 24} Q${PV.x - 78},${PV.y + 24} ${PV.x - 78},${PV.y + 12}z" fill="url(#gNegru)"/>
    <circle cx="${PV.x - 64}" cy="${PV.y}" r="6" fill="url(#gAlu)" stroke="#333"/><circle cx="${PV.x + 64}" cy="${PV.y}" r="6" fill="url(#gAlu)" stroke="#333"/>
    <circle cx="${PV.x}" cy="${PV.y}" r="44" fill="url(#gNegru)" stroke="#000"/><circle cx="${PV.x}" cy="${PV.y}" r="34" fill="#1b1e22" stroke="#3a3f45"/><text x="${PV.x}" y="${PV.y + 32}" font-size="6" text-anchor="middle" fill="#8a9097">HELLA 6PV · 2 piste</text>
    <path d="M${PV.x + 30},${PV.y + 30} L${PV.x + 66},${PV.y + 66} L${PV.x + 98},${PV.y + 66} L${PV.x + 98},${PV.y + 36} L${PV.x + 58},${PV.y + 20}z" fill="url(#gNegru)" stroke="#000"/><rect x="${PV.x + 70}" y="${PV.y + 40}" width="24" height="22" rx="2" fill="#2b2f35"/>${[0, 1, 2].map(k => `<rect x="${PV.x + 73 + k * 7}" y="${PV.y + 44}" width="4" height="5" fill="#c9a227"/><rect x="${PV.x + 73 + k * 7}" y="${PV.y + 53}" width="4" height="5" fill="#c9a227"/>`).join("")}</g>`;
  // pârghia izolantă (rotită de teta)
  s += `<g id="parghie" style="cursor:grab"><g id="parghie-r"><rect x="${PV.x - 9}" y="${PV.y - 196}" width="18" height="196" rx="8" fill="#f2f2ee" stroke="#9a9a90"/><rect x="${PV.x - 13}" y="${PV.y - 204}" width="26" height="24" rx="10" fill="#e6e1c8" stroke="#9a9a90"/><line x1="${PV.x}" y1="${PV.y - 182}" x2="${PV.x}" y2="${PV.y - 128}" stroke="#c62828" stroke-width="1.6"/><circle cx="${PV.x}" cy="${PV.y}" r="13" fill="url(#gAlu)" stroke="#555"/><circle cx="${PV.x}" cy="${PV.y}" r="4" fill="#333"/></g></g>`;
  s += `<text id="teta-t" x="${PV.x}" y="36" font-size="13" text-anchor="middle" fill="#1d3557" font-weight="700"></text>`;
  // cablul senzorului spre cutia de conexiuni
  s += `<path d="M${PV.x + 98},${PV.y + 52} C${PV.x + 150},${PV.y + 52} 330,420 300,${BR.y + 6}" fill="none" stroke="#1b1b1b" stroke-width="7"/>`;
  /* ---- cutia de conexiuni cu bornele 1…6 și conectorul X1 */
  s += `<g class="tk-comp" data-comp="br" filter="url(#umbra)"><rect x="${BR.x}" y="${BR.y}" width="380" height="96" rx="6" fill="#2f3439" stroke="#111"/><text x="${BR.x + 10}" y="${BR.y + 16}" font-size="10" fill="#e6ebf0" font-weight="700">Cutia de conexiuni – pinii conectorului senzorului</text>
    ${[1, 2, 3, 4, 5, 6].map(i => { const [x, y] = SOCK(i); return `<circle cx="${x}" cy="${y}" r="13" fill="${CUL_PIN[i]}" stroke="#111"/><circle cx="${x}" cy="${y}" r="7" fill="url(#gBanana)" stroke="#5a430b"/><circle cx="${x}" cy="${y}" r="3" fill="#111"/><text x="${x}" y="${y - 18}" font-size="11" text-anchor="middle" fill="#fff" font-weight="800">${i}</text>`; }).join("")}
    <text x="${BR.x + 10}" y="${BR.y + 88}" font-size="8.5" fill="#aab4be">borne de 4 mm · culoarea inelului = culoarea firului din cablajul senzorului</text></g>`;
  s += `<g id="x1" class="tk-comp" data-comp="x1" style="cursor:pointer"></g>`;
  s += [1, 2, 3, 4, 5, 6].map(i => pin("p" + i, ...SOCK(i), `Borna ${i} (pinul ${i} al senzorului)`)).join("");
  /* ---- cutia de defecte */
  s += `<g class="tk-comp" data-comp="fb" filter="url(#umbra)"><rect x="${FB.x}" y="${FB.y}" width="310" height="214" rx="8" fill="#1f4e8c" stroke="#0e2b52"/><text x="${FB.x + 12}" y="${FB.y + 18}" font-size="10.5" fill="#fff" font-weight="700">Cutia de simulare a defectelor</text>
    <rect x="${FB.x + 228}" y="${FB.y + 118}" width="54" height="14" rx="7" fill="#e8d3a6" stroke="#a88a55"/>${["#c62828", "#c62828", "#c62828"].map((c, k) => `<rect x="${FB.x + 236 + k * 8}" y="${FB.y + 118}" width="4" height="14" fill="${c}"/>`).join("")}<rect x="${FB.x + 268}" y="${FB.y + 118}" width="4" height="14" fill="#c9a640"/><text x="${FB.x + 255}" y="${FB.y + 146}" font-size="8.5" text-anchor="middle" fill="#dfe8ff">2,2 kΩ</text>
    ${Object.entries(TP).map(([k, [x, y]]) => `<circle cx="${x}" cy="${y}" r="12" fill="${k === "tGND" ? "#111" : k === "t5V" ? "#c62828" : "#f2f2f2"}" stroke="#000"/><circle cx="${x}" cy="${y}" r="6" fill="url(#gBanana)"/><text x="${x}" y="${y - 17}" font-size="9.5" text-anchor="middle" fill="#fff" font-weight="700">${{ tA0: "TP A0", tA1: "TP A1", t5V: "TP 5V", tGND: "TP GND" }[k]}</text>`).join("")}</g>`;
  [["s1", 62, "S1", "întrerupere", "semnal pistă 2"], ["s2", 152, "S2", "scurt la masă", "semnal pistă 1"], ["s3", 242, "S3", "R serie 2,2 kΩ", "pistă 2"]].forEach(([k, dx, t, a, b]) => {
    s += `<g id="sw-${k}" class="tk-sw" data-sw="${k}" style="cursor:pointer"><rect x="${FB.x + dx - 22}" y="${FB.y + 42}" width="44" height="54" rx="5" fill="#d9dde3" stroke="#555"/><circle cx="${FB.x + dx}" cy="${FB.y + 69}" r="10" fill="url(#gAlu)" stroke="#555"/><line id="sw-${k}-l" x1="${FB.x + dx}" y1="${FB.y + 69}" x2="${FB.x + dx}" y2="${FB.y + 49}" stroke="#333" stroke-width="5" stroke-linecap="round"/><circle id="sw-${k}-led" cx="${FB.x + dx + 15}" cy="${FB.y + 48}" r="3.5" fill="#400"/>
      <text x="${FB.x + dx}" y="${FB.y + 110}" font-size="10" text-anchor="middle" fill="#fff" font-weight="800">${t}</text><text x="${FB.x + dx}" y="${FB.y + 122}" font-size="7.5" text-anchor="middle" fill="#dfe8ff">${a}</text><text x="${FB.x + dx}" y="${FB.y + 132}" font-size="7.5" text-anchor="middle" fill="#dfe8ff">${b}</text></g>`;
  });
  s += Object.entries(TP).map(([k, [x, y]]) => pin(k, x, y, { tA0: "Punct de test A0 (semnalul spre A0)", tA1: "Punct de test A1 (semnalul spre A1)", t5V: "Punct de test 5 V (alimentarea senzorului)", tGND: "Punct de test GND" }[k])).join("");
  /* ---- Arduino Mega 2560 */
  s += `<g class="tk-comp" data-comp="mega" filter="url(#umbra)"><rect x="${MG.x}" y="${MG.y}" width="430" height="232" rx="8" fill="#00878f" stroke="#005a60"/>
    <rect x="${MG.x - 14}" y="${MG.y + 30}" width="46" height="40" rx="3" fill="url(#gAlu)" stroke="#666"/><rect x="${MG.x - 8}" y="${MG.y + 150}" width="40" height="36" rx="4" fill="#1b1b1b"/>
    <g transform="translate(${MG.x + 230} ${MG.y + 118}) rotate(45)"><rect x="-34" y="-34" width="68" height="68" rx="2" fill="#262626"/></g><text x="${MG.x + 230}" y="${MG.y + 121}" font-size="7" fill="#bbb" text-anchor="middle" font-family="monospace">ATMEGA2560</text>
    <rect x="${MG.x + 60}" y="${MG.y + 6}" width="${36 * 9.5}" height="12" rx="1.5" fill="#202020"/>${Array.from({ length: 36 }, (_, i) => `<rect x="${MG.x + 64 + i * 9.5}" y="${MG.y + 9}" width="4" height="5" fill="#5a5a5a"/>`).join("")}
    <rect x="${MG.x + 64}" y="${MG.y + 216}" width="${26 * 11.2}" height="12" rx="1.5" fill="#202020"/>
    ${["IOREF", "RESET", "3.3V", "5V", "GND", "GND", "Vin", "", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"].map((t, i) => t ? `<text x="${HDR(i)[0]}" y="${MG.y + 210}" font-size="5.5" fill="#fff" text-anchor="end" transform="rotate(-90 ${HDR(i)[0]} ${MG.y + 210})">${t}</text>` : "").join("")}
    ${Array.from({ length: 26 }, (_, i) => `<rect x="${HDR(i)[0] - 2}" y="${MG.y + 220}" width="4" height="4" fill="#5a5a5a"/>`).join("")}
    <text x="${MG.x + 330}" y="${MG.y + 70}" font-size="13" fill="#e8ffff" font-weight="800">ARDUINO</text><text x="${MG.x + 330}" y="${MG.y + 86}" font-size="11" fill="#e8ffff">MEGA 2560</text>
    <rect id="ledL" x="${MG.x + 92}" y="${MG.y + 40}" width="8" height="5" fill="#5a4a1a"/><text x="${MG.x + 104}" y="${MG.y + 45}" font-size="6" fill="#fff">L</text><rect id="ledTX" x="${MG.x + 92}" y="${MG.y + 52}" width="8" height="5" fill="#5a4a1a"/><text x="${MG.x + 104}" y="${MG.y + 57}" font-size="6" fill="#fff">TX</text><rect id="ledON" x="${MG.x + 92}" y="${MG.y + 64}" width="8" height="5" fill="#1a3a1a"/><text x="${MG.x + 104}" y="${MG.y + 69}" font-size="6" fill="#fff">ON</text></g>
    <g id="mega-rst" style="cursor:pointer"><rect x="${MG.x + 46}" y="${MG.y + 92}" width="18" height="18" rx="2" fill="#ccc" stroke="#555"/><circle cx="${MG.x + 55}" cy="${MG.y + 101}" r="5.5" fill="#c62828"/><text x="${MG.x + 55}" y="${MG.y + 122}" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">RESET</text></g>`;
  s += `<path id="usb" d="M${MG.x - 14},${MG.y + 50} C${MG.x - 70},${MG.y + 50} ${MG.x - 60},${MG.y - 40} ${MG.x - 20},${MG.y - 60}" fill="none" stroke="#333" stroke-width="6"/><text x="${MG.x - 20}" y="${MG.y - 66}" font-size="9" fill="#555" text-anchor="middle">USB – PC</text>`;
  /* ---- afișajul OLED (galben/albastru) și LED-ul EPC */
  s += `<g class="tk-comp" data-comp="oled" filter="url(#umbra)"><rect x="880" y="40" width="200" height="176" rx="6" fill="#16337a" stroke="#0b1d48"/>${["GND", "VCC", "SCL", "SDA"].map((t, i) => `<rect x="${942 + i * 14}" y="46" width="6" height="8" fill="#c9a227"/><text x="${945 + i * 14}" y="64" font-size="6" fill="#fff" text-anchor="middle">${t}</text>`).join("")}
    <rect x="888" y="72" width="184" height="118" rx="3" fill="#050608" stroke="#333"/><g id="oled" font-family="ui-monospace,Consolas,monospace"></g><text x="980" y="206" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED 0,96" SSD1306 · I²C 0x3C</text></g>`;
  s += `<g class="tk-comp" data-comp="epc" filter="url(#umbra)"><rect x="1110" y="70" width="150" height="120" rx="8" fill="#26292e"/><circle id="epc" cx="1185" cy="118" r="20" fill="#3a2a00" stroke="#000"/><text x="1185" y="124" font-size="13" text-anchor="middle" font-weight="900" fill="#1a1200" id="epc-t">EPC</text><text x="1185" y="160" font-size="9" fill="#ddd" text-anchor="middle">lampa EPC (D13 + rezistor)</text><text x="1185" y="176" font-size="8" fill="#9aa3ad" text-anchor="middle">defect pedală / clapetă</text></g>`;
  // firele fixe: OLED (I²C, 5V, GND) și LED-ul EPC
  const W = (pts, c, w) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const hx = k => MG.x + 64 + k * 9.5 + 2, cul = ["#222", "#e53935", "#1e88e5", "#43a047"], dst = [30, 32, 35, 34];   // GND, 5V, SCL (21), SDA (20)
  s += `<g style="pointer-events:none">${[0, 1, 2, 3].map(k => W([[945 + k * 14, 54], [945 + k * 14, 32 - k * 5], [1088 + k * 5, 32 - k * 5], [1088 + k * 5, 414 + k * 5], [hx(dst[k]), 414 + k * 5], [hx(dst[k]), 452]], cul[k], 2)).join("")}
    ${W([[1185, 190], [1185, 232], [1086, 232], [1086, 406], [hx(13), 406], [hx(13), 452]], "#ff9800", 2.4)}</g>`;
  /* ---- multimetrul cu comutator rotativ și două sonde */
  s += `<g class="tk-comp" data-comp="dmm" filter="url(#umbra)"><rect x="476" y="34" width="210" height="350" rx="20" fill="#f2b705"/><rect x="490" y="48" width="182" height="322" rx="14" fill="#3b3f45"/>
    <rect x="504" y="62" width="154" height="66" rx="5" fill="#bfd0b0" stroke="#222" stroke-width="2"/><text id="dmm-v" x="650" y="108" font-size="28" fill="#1d2414" text-anchor="end" font-family="ui-monospace,monospace" font-weight="700"></text><text id="dmm-u" x="652" y="122" font-size="10" fill="#1d2414" text-anchor="end" font-family="ui-monospace,monospace"></text><text id="dmm-a" x="510" y="76" font-size="8" fill="#1d2414">AUTO</text>
    <circle cx="581" cy="222" r="52" fill="#2a2d31" stroke="#666"/><g id="dmm-buton"><circle cx="581" cy="222" r="34" fill="#4a4f56" stroke="#111"/><rect x="577" y="182" width="8" height="34" rx="3" fill="#f2b705"/></g>
    ${[["OFF", -60], ["V⎓", 0], ["Ω", 60]].map(([t, a]) => { const x = 581 + 66 * Math.sin(a * Math.PI / 180), y = 222 - 66 * Math.cos(a * Math.PI / 180); return `<g class="dmm-poz" data-mod="${t === "V⎓" ? "V" : t === "Ω" ? "R" : "OFF"}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="14" fill="rgba(255,255,255,.06)"/><text x="${x}" y="${y + 4}" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">${t}</text></g>`; }).join("")}
    <circle cx="530" cy="340" r="9" fill="#111" stroke="#999"/><circle cx="632" cy="340" r="9" fill="#d32f2f" stroke="#999"/><text x="530" y="326" font-size="8" fill="#ccc" text-anchor="middle">COM</text><text x="632" y="326" font-size="8" fill="#ccc" text-anchor="middle">VΩ</text></g>`;
  s += `<g id="tk-cablaj" style="pointer-events:none"></g><g id="tk-sonde"></g><g id="tk-tip" style="pointer-events:none" visibility="hidden"><rect rx="4" fill="#2b2b2b" opacity=".92"/><text font-size="11" fill="#fff"></text></g>`;
  s += `<text id="tk-timp" x="650" y="790" text-anchor="middle" font-size="12" fill="#555"></text><text id="tk-av" x="230" y="595" text-anchor="middle" font-size="11" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
/* cablajul dintre bornele 1…6 și placă (rezultat din identificarea pinilor) și conectorul X1 */
function desenCablaj() {
  const g = $("#tk-cablaj"), x1 = $("#x1"); if (!g) return;
  const W = (pts, c, w, op) => `<path d="M${pts.map(p => p.join(",")).join(" L")}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round" opacity="${op || 1}"/>`;
  let s = "";
  const xc = 432, yc = BR.y + 96 + 18;
  if (sim.as) {
    const dest = { "5V": HDR(3), GND: HDR(4), A0: [FB.x, FB.y + 150], A1: [FB.x, FB.y + 164] };
    [1, 2, 3, 4, 5, 6].forEach(i => { const [x, y] = SOCK(i), d = dest[sim.as[i]]; if (!d) return; const yb = yc + 20 + i * 9;
      s += W([[x, y + 13], [x, yb], [xc + 10, yb]], CUL_PIN[i], 3.2) + (sim.dec ? "" : W([[xc + 40, yb], [d === dest.A0 || d === dest.A1 ? FB.x - 20 : 812, yb], ...(d === dest.A0 || d === dest.A1 ? [[FB.x - 20, d[1]], d] : [[812, 704], [d[0], 704], [d[0], d[1] + 6]])], CUL_PIN[i], 3.2)); });
    // în cutia de defecte: A0 → S2 → ieșire, A1 → S1 → (S3) → ieșire, apoi spre placă
    s += W([[FB.x, FB.y + 150], [FB.x + 300, FB.y + 150]], "#9be7a1", 2) + W([[FB.x, FB.y + 164], [FB.x + 300, FB.y + 164]], "#fff59d", 2);
    s += W([[FB.x + 310, FB.y + 150], [826, FB.y + 150], [826, 690], [HDR(8)[0], 690], [HDR(8)[0], HDR(8)[1] + 6]], "#2e7d32", 3) + W([[FB.x + 310, FB.y + 164], [818, FB.y + 164], [818, 698], [HDR(9)[0], 698], [HDR(9)[0], HDR(9)[1] + 6]], "#f9d71c", 3);
    s += W([[TP.t5V[0], TP.t5V[1] + 12], [TP.t5V[0], 668], [HDR(3)[0] - 0.01, 668]], "#c62828", 1.5, 0.5) + W([[TP.tGND[0], TP.tGND[1] + 12], [TP.tGND[0], 662], [HDR(4)[0], 662]], "#222", 1.5, 0.5);
  }
  g.innerHTML = s;
  x1.innerHTML = `<rect x="${xc}" y="${yc + 20}" width="22" height="64" rx="3" fill="#202326" stroke="#000"/><rect x="${sim.dec ? xc + 52 : xc + 24}" y="${yc + 22}" width="24" height="60" rx="3" fill="#33383e" stroke="#000"/><text x="${xc + 30}" y="${yc + 98}" font-size="10" text-anchor="middle" fill="#333" font-weight="700">X1 ${sim.dec ? "decuplat" : "cuplat"}</text>`;
}
const SONDE = [{ id: "dmmR", x0: 632, y0: 349, cul: "#d32f2f", et: "+" }, { id: "dmmB", x0: 530, y0: 349, cul: "#222", et: "−" }];
const LOC_SONDE = { dmmR: [700, 410], dmmB: [455, 410] };
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
function celMaiAproape(x, y) { let best = null, dmin = 18; Object.entries(PIN).forEach(([k, q]) => { const d = Math.hypot(q.x - x, q.y - y); if (d < dmin) { dmin = d; best = k; } }); return best; }
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

/* ------------------------------------------------------------------ instrumentele: multimetrul, OLED-ul, LED-urile */
function citesteDMM() {
  const el = $("#dmm-v"), u = $("#dmm-u"); if (!el) return;
  const m = sim.dmm.mod, a = sim.dmm.s.dmmR, b = sim.dmm.s.dmmB;
  $("#dmm-buton").setAttribute("transform", `rotate(${m === "OFF" ? -60 : m === "V" ? 0 : 60} 581 222)`);
  if (m === "OFF") { el.textContent = ""; u.textContent = ""; sim.dmm.v = null; sim.dmm.txt = ""; return; }
  if (m === "V") {
    const v = (PIN[a] ? vNod(a) : 0) - (PIN[b] ? vNod(b) : 0) + (Math.random() - 0.5) * 0.0008;
    const r = Math.round(v * 1000) / 1000; sim.dmm.v = r; sim.dmm.txt = r.toFixed(3) + " V"; el.textContent = r.toFixed(3); u.textContent = "V DC"; return;
  }
  // ohmmetru
  if (sim.run) { el.textContent = "Err"; u.textContent = "tensiune!"; sim.dmm.v = null; sim.dmm.txt = "—"; return; }
  if (!PIN[a] || !PIN[b]) { el.textContent = "O.L"; u.textContent = "MΩ"; sim.dmm.v = Infinity; sim.dmm.txt = "OL"; return; }
  let R = sim.dec ? ohmIntre(a, b) : NaN;
  if (!sim.dec) { el.textContent = "Err"; u.textContent = "decuplați X1"; sim.dmm.v = null; sim.dmm.txt = "—"; return; }
  if (!isFinite(R)) { el.textContent = "O.L"; u.textContent = "MΩ"; sim.dmm.v = Infinity; sim.dmm.txt = "OL"; return; }
  R = R * (1 + (Math.random() - 0.5) * 0.002);
  const ohm = Math.round(R * 1000 * (R < 1 ? 10 : 1)) / (R < 1 ? 10 : 1);
  sim.dmm.v = ohm; sim.dmm.txt = R < 1 ? fx(ohm, 1) + " Ω" : fx(ohm / 1000, 3) + " kΩ";
  el.textContent = R < 1 ? ohm.toFixed(1) : (ohm / 1000).toFixed(3); u.textContent = R < 1 ? "Ω" : "kΩ";
}
function oledAfis() {
  const g = $("#oled"); if (!g) return;
  if (!sim.run) { g.innerHTML = ""; return; }
  const o = sim.pr && sim.pr.oled, fw = sim.fw;
  let s = `<rect x="890" y="74" width="180" height="26" fill="#050608"/><text x="896" y="91" font-size="12" fill="#ffd400">PEDALA APP ε=${Number(fw.eps).toFixed(2)} N=${fw.n}</text>`;
  if (!o) { s += `<text x="896" y="120" font-size="12" fill="#5fd3ff">pornire…</text>`; g.innerHTML = s; return; }
  s += `<text x="896" y="114" font-size="12" fill="#5fd3ff">U1 ${o.u1.toFixed(3)}  U2 ${o.u2.toFixed(3)}</text><text x="896" y="132" font-size="12" fill="#5fd3ff">ΔU ${Math.abs(o.u1 - 2 * o.u2).toFixed(3)} V</text><text x="896" y="150" font-size="12" fill="#5fd3ff">s  ${o.s.toFixed(1).padStart(5, " ")} %</text>`;
  s += o.fault ? `<rect x="892" y="158" width="176" height="28" fill="#5fd3ff"/><text x="896" y="170" font-size="10.5" fill="#050608" font-weight="700">DEFECT – AVARIE, s = 0 %</text><text x="896" y="182" font-size="9.5" fill="#050608">${o.motiv}</text>`
    : `<text x="896" y="176" font-size="12" fill="#5fd3ff">STARE: NORMAL</text>`;
  g.innerHTML = s;
}
function ledAfis() {
  const on = sim.run && sim.pr && sim.pr.fault;
  $("#epc").setAttribute("fill", on ? "#ffb300" : "#3a2a00"); $("#epc").setAttribute("filter", on ? "drop-shadow(0 0 10px #ffb300)" : "");
  $("#ledL").setAttribute("fill", on ? "#ffd04a" : "#5a4a1a"); $("#ledON").setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a");
  $("#usb").setAttribute("stroke", sim.run ? "#222" : "#bbb");
  ["s1", "s2", "s3"].forEach(k => { $(`#sw-${k}-l`).setAttribute("y2", sim.f[k] ? FB.y + 89 : FB.y + 49); $(`#sw-${k}-led`).setAttribute("fill", sim.f[k] ? "#ff3d00" : "#400"); });
}
function parghieAfis() {
  $("#parghie-r").setAttribute("transform", `rotate(${sim.teta} ${PV.x} ${PV.y})`);
  $("#teta-t").textContent = `θ = ${fx(sim.teta, 1)}°  →  s = ${fx(sCur(), 1)} %`;
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
  // pârghia: tragere, cu pas de 0,5°
  const pg = $("#parghie"); let act = false;
  const set = e => { const p = ptSVG(e); let a = Math.atan2(p.x - PV.x, PV.y - p.y) * 180 / Math.PI; seteazaTeta(Math.round(a * 2) / 2); };
  pg.addEventListener("pointerdown", e => { if (sim.auto > 0) return; e.stopPropagation(); act = true; pg.setPointerCapture(e.pointerId); set(e); });
  pg.addEventListener("pointermove", e => { if (act) set(e); }); pg.addEventListener("pointerup", () => { act = false; });
  $$("[data-sw]").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); comutaDefect(g.dataset.sw); }));
  $$(".dmm-poz").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); sim.dmm.mod = g.dataset.mod; citesteDMM(); actualizeazaPasi(); }));
  $("#x1").addEventListener("click", e => { e.stopPropagation(); comutaX1(); });
  $("#mega-rst").addEventListener("click", e => { e.stopPropagation(); resetMega(); });
  $$(".tk-comp").forEach(g => g.addEventListener("click", e => { if (e.target.closest("#parghie,[data-sw],.dmm-poz,#x1,#mega-rst")) return; inspector(g.dataset.comp); }));
}
function seteazaTeta(a) { sim.teta = Math.max(0, Math.min(MD.TETA_MAX, a)); parghieAfis(); }
function comutaX1() {
  if (sim.run) return Cadru.mesajTemporar("NSSM: conectorul se cuplează și se decuplează numai cu alimentarea oprită.", "pericol");
  if (sim.dec && !sim.as) return Cadru.mesajTemporar("Cablajul spre placă nu este montat: identificați întâi pinii (pasul 1).", "atentie");
  sim.dec = !sim.dec; desenCablaj(); citesteDMM(); actualizeazaPasi();
}
function comutaDefect(k) {
  sim.f[k] = !sim.f[k]; ledAfis(); citesteDMM();
  const unul = ["s1", "s2", "s3"].filter(x => sim.f[x]).length === 1;
  if (sim.f[k] && sim.run && sim.pr && !sim.pr.fault && unul && Math.abs(sim.teta - MD.S_DEF * 0.6) < 1e-6) sim.exp = { k, t0: sim.t, eps: sim.fw.eps, n: sim.fw.n, rez: null, tc: null, u: null };
  else if (!sim.f[k] && sim.exp && sim.exp.k === k && !sim.exp.rez) sim.exp = null;
  actualizeazaPasi();
}
const INSP = {
  stand: () => ["Standul pedalei", [["Suport", "imprimat 3D (PLA), pe profil de aluminiu 20×20"], ["Pârghie", "izolantă, cursă 0…60° (s = θ/60·100 %)"]]],
  rap: () => ["Raportor", [["Domeniu", "−10…70°"], ["Diviziune", "1° (citire la 0,5°)"], ["Poziția pârghiei", fx(sim.teta, 1) + "°"]]],
  senzor: () => ["Senzorul pedalei (din dezmembrări)", [["Tip", "potențiometric, 2 piste (Hella 6PV / VW)"], ["Conector", "6 pini"], ["Pista 2", "≈ jumătate din pista 1 (rezistor serie)"]]],
  br: () => ["Cutia de conexiuni", [["Borne", "1…6 = pinii conectorului senzorului"], ["Utilizare", "măsurarea rezistențelor (alimentare oprită, X1 decuplat) și a tensiunilor"]]],
  x1: () => ["Conectorul X1", [["Stare", sim.dec ? "decuplat" : "cuplat"], ["Rol", "separă senzorul de placă pentru măsurarea rezistențelor"]]],
  fb: () => ["Cutia de defecte", [["S1", "întrerupe firul semnalului spre A1"], ["S2", "pune la masă firul semnalului spre A0"], ["S3", "introduce 2,2 kΩ în serie pe firul spre A1"], ["Intrări placă", "pull-down 22 kΩ pe A0 și A1"]]],
  mega: () => ["Arduino Mega 2560", [["ADC", "10 biți, U<sub>ref</sub> = AVCC = 5 V al plăcii"], ["Alimentare", sim.run ? "USB (pornit)" : "oprită"], ["Program", sim.fw ? PROG.titlu : "—"]]],
  oled: () => ["Afișaj OLED SSD1306", [["Rezoluție", "128×64, zonă galbenă sus (16 linii) + albastră"], ["Magistrală", "I²C 0x3C, SDA 20 / SCL 21"], ["Actualizare", "≈ 20…27 ms (blochează bucla)"]]],
  epc: () => ["Lampa EPC", [["Comandă", "D13 (activă în modul de avarie)"], ["Stare", sim.pr && sim.pr.fault ? "aprinsă" : "stinsă"]]],
  dmm: () => ["Multimetru", [["Mod", { OFF: "oprit", V: "V c.c.", R: "ohmmetru" }[sim.dmm.mod]], ["Sonda +", (PIN[sim.dmm.s.dmmR] || {}).et || "liberă"], ["Sonda −", (PIN[sim.dmm.s.dmmB] || {}).et || "liberă"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}
function avertizari() {
  const av = [];
  if (sim.run && sim.as) { const c = circ(); if (Object.values(sim.as).filter(v => v === "A0").length !== 1 || Object.values(sim.as).filter(v => v === "A1").length !== 1) av.push("cablaj neobișnuit: verificați identificarea pinilor"); if (c.A0 > 4.9 || c.A1 > 4.9) av.push("intrare la 5 V"); }
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
  if (!sim.as) return Cadru.mesajTemporar("Montați întâi cablajul (pasul 1: identificarea pinilor).", "atentie");
  if (sim.dec) return Cadru.mesajTemporar("Cuplați conectorul X1 înainte de alimentarea plăcii.", "atentie");
  sim.fw = { eps: +sim.camp.eps, n: +sim.camp.n }; sim.run = true; sim.t0 = performance.now(); sim.t = 0; sim.exp = null; sim.p3 = { mn: 99, mx: -1 };
  pornesteProgram();
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); oledAfis(); ledAfis(); citesteDMM(); avertizari(); actualizeazaPasi();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.pr = null; sim.exp = null; sim.auto = 0;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza"); $("#tk-timp").textContent = "";
  afiseazaCod(); actualizeazaFw(); oledAfis(); ledAfis(); citesteDMM(); avertizari(); actualizeazaPasi();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} (EPS = ${sim.fw.eps.toFixed(2)} V, NCONF = ${sim.fw.n})` : "—"; }

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const nOhm = () => (Cadru.D.log || []).filter(l => l.m === "ohm").length;
function inregOhm(e) {
  const a = sim.dmm.s.dmmR, b = sim.dmm.s.dmmB;
  if (sim.dmm.mod !== "R") return Cadru.mesajTemporar("Comutați multimetrul pe Ω.", "atentie");
  if (sim.run) return Cadru.mesajTemporar("NSSM: rezistența se măsoară numai cu alimentarea oprită.", "pericol");
  if (!sim.dec && sim.as) return Cadru.mesajTemporar("Decuplați conectorul X1 (altfel măsurați și circuitele plăcii).", "atentie");
  if (!/^p\d$/.test(a) || !/^p\d$/.test(b) || a === b) return Cadru.mesajTemporar("Puneți cele două sonde pe două borne diferite (1…6) ale cutiei de conexiuni.", "atentie");
  const R = sim.dmm.v, s = Math.round(sCur() * 100) / 100;
  const ok = Cadru.inregistreaza(e, { log: { m: "ohm", a: +a[1], b: +b[1], s, R: isFinite(R) ? R : "OL" } });
  if (ok) msg(`Jurnal: R(${a[1]}–${b[1]}) = ${sim.dmm.txt} la θ = ${fx(sim.teta, 1)}° (${nOhm()} măsurători).`);
}
function inregIdent(e) {
  if (sim.run) return Cadru.mesajTemporar("Opriți alimentarea (simularea) înainte de a monta cablajul.", "atentie");
  if (nOhm() < 6) return Cadru.mesajTemporar(`Identificarea se face din măsurători: ${nOhm()}/6 rezistențe notate în jurnal (inclusiv cu pârghia în alte poziții).`, "atentie");
  const id = {}; for (let p = 1; p <= 6; p++) { const v = $(`#id-p${p}`).value; if (!v) return Cadru.mesajTemporar(`Alegeți funcția pinului ${p}.`, "atentie"); id[p] = v; }
  const ok = Cadru.inregistreaza(e, { log: { m: "ident", id }, celule: [1, 2, 3, 4, 5, 6].map(p => ({ t: "t30", r: "p" + p, c: "fn", v: id[p] })) });
  if (!ok) return;
  sim.ident = id; sim.as = MD.cablaj(id); sim.dec = true; desenCablaj();
  msg("Tabelul 3.0 completat; cablajul s-a montat conform identificării (5 V și GND ale plăcii, semnalul pistei 1 spre A0 prin S2, al pistei 2 spre A1 prin S1/S3). Cuplați X1.");
}
function gridS() { for (const s of MD.POZ) if (Math.abs(sim.teta - s * 0.6) < 1e-6) return s; return null; }
function inregU(e) {
  if (!sim.run) return Cadru.mesajTemporar("Cuplați X1 și porniți simularea (placa alimentată).", "atentie");
  if (sim.dmm.mod !== "V") return Cadru.mesajTemporar("Comutați multimetrul pe V⎓.", "atentie");
  if (sim.f.s1 || sim.f.s2 || sim.f.s3) return Cadru.mesajTemporar("Tabelul 3.1 se ridică fără defecte: aduceți S1, S2, S3 în poziția normală.", "atentie");
  const r = sim.dmm.s.dmmR, b = sim.dmm.s.dmmB, s = gridS();
  if (!["tGND", "p3", "p5"].includes(b)) return Cadru.mesajTemporar("Sonda − pe TP GND (masa).", "atentie");
  if (r !== "tA0" && r !== "tA1") return Cadru.mesajTemporar("Sonda + pe TP A0 (pista 1) sau TP A1 (pista 2).", "atentie");
  if (s === null) return Cadru.mesajTemporar("Aduceți pârghia exact la 0, 12, 24, 36, 48 sau 60° (s = 0, 20, …, 100 %).", "atentie");
  const n = r === "tA0" ? "A0" : "A1", U = sim.dmm.v, col = n === "A0" ? "U1" : "U2";
  const ok = Cadru.inregistreaza(e, { log: { m: "u", s, n, U, as: sim.as, f: { ...sim.f } }, celule: [{ t: "t31", r: "s" + s, c: col, v: U.toFixed(3) }] });
  if (ok) msg(`Tabelul 3.1, s = ${s} %: ${col} = ${fx(U, 3)} V.`);
}
const DEF_RAND = { s1: "d1", s2: "d2", s3: "d3" };
function inregDef(e) {
  const fw = sim.fw;
  if (!sim.run || !fw) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  if (fw.eps !== 0.2 || fw.n !== 5) return Cadru.mesajTemporar("Tabelul 3.2 se completează cu EPS = 0,20 V și NCONF = 5 (opriți simularea, modificați programul).", "atentie");
  const x = sim.exp;
  if (!x) return Cadru.mesajTemporar(`Pârghia la ${MD.S_DEF * 0.6}° (s = ${MD.S_DEF} %), fără defect confirmat (RESET), apoi închideți UN comutator de defect.`, "atentie");
  if (!x.rez) return Cadru.mesajTemporar("Așteptați reacția programului (confirmare sau 1,5 s fără reacție).", "atentie");
  const [u1, u2] = x.u, k = DEF_RAND[x.k], tc = x.tc === null ? null : Math.round(x.tc * 10) / 10;
  const cel = [{ t: "t32", r: k, c: "U1", v: u1.toFixed(3) }, { t: "t32", r: k, c: "U2", v: u2.toFixed(3) }, { t: "t32", r: k, c: "tc", v: tc === null ? "" : tc.toFixed(1) }];
  const ok = Cadru.inregistreaza(e, { log: { m: "def", k, s: MD.S_DEF, f: { s1: x.k === "s1", s2: x.k === "s2", s3: x.k === "s3" }, u1, u2, tc, n: x.n, eps: x.eps }, celule: cel });
  if (ok) msg(`Tabelul 3.2 (${x.k.toUpperCase()}): U1 = ${fx(u1, 3)} V, U2 = ${fx(u2, 3)} V, ${tc === null ? "defectul NU a fost detectat" : `t_conf = ${fx(tc, 1)} ms`}. Completați în tabel verificarea care a detectat și reacția; apoi deschideți comutatorul și apăsați RESET.`);
}
function inregCmp(e) {
  const fw = sim.fw; if (!sim.run || !fw) return Cadru.mesajTemporar("Porniți simularea.", "atentie");
  const k = Object.keys(MD.CONFIG).find(c => MD.CONFIG[c].eps === fw.eps && MD.CONFIG[c].n === fw.n);
  if (!k) return Cadru.mesajTemporar("Configurațiile cerute: (EPS; NCONF) = (0,10; 1), (0,20; 5), (0,40; 10).", "atentie");
  const T = sim.testRez; if (!T || T.eps !== fw.eps || T.n !== fw.n || T.dist < 100) return Cadru.mesajTemporar("Faceți testul de 10 s: trimiteți „t” pe monitorul serial și acționați pedala pe toată cursa (butonul „Acționează pârghia”).", "atentie");
  const x = sim.exp; if (!x || x.k !== "s3" || x.eps !== fw.eps || x.n !== fw.n || !x.rez) return Cadru.mesajTemporar(`Apoi verificați deriva: pârghia la ${MD.S_DEF * 0.6}°, RESET, închideți S3 și așteptați reacția.`, "atentie");
  const tc = x.tc === null ? null : Math.round(x.tc * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "cmp", k, inv: T.inv, al: T.al, det: x.rez, tc }, celule: [{ t: "t33", r: k, c: "inv", v: String(T.inv) }, { t: "t33", r: k, c: "al", v: String(T.al) }, { t: "t33", r: k, c: "det", v: x.rez }, { t: "t33", r: k, c: "tc", v: tc === null ? "" : tc.toFixed(1) }] });
  if (ok) msg(`Tabelul 3.3 (ε = ${fx(fw.eps, 2)} V, N = ${fw.n}): ${T.inv} eșantioane invalide, ${T.al} alarme în 10 s; deriva 2,2 kΩ ${x.rez === "da" ? `detectată în ${fx(tc, 1)} ms` : "nedetectată"}.`);
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const PASI = [
  { t: "Identificarea pinilor", tab: "Tabelul 3.0", zona: [20, 20, 700, 660], pini: ["p1", "p2", "p3", "p4", "p5", "p6"],
    banda: "Pasul 1 · Alimentarea oprită, X1 decuplat, multimetrul pe Ω. Măsurați rezistențele între borne: alimentare–masă = constantă, cu cursorul = variază cu pârghia, între piste = O.L.",
    instr: ["Simularea oprită, conectorul X1 decuplat (clic pe el), multimetrul pe <b>Ω</b>.", "Sondele pe două borne → „● R → jurnal”. Măsurați perechile și repetați cu pârghia în altă poziție: rezistența dintre cursor și capete se modifică.", "Perechile cu O.L. aparțin unor piste diferite; perechea cu rezistența cea mai mare dintr-o pistă = capetele pistei (alimentare și masă).", "Alegeți funcția fiecărui pin și apăsați „Trece în Tabelul 3.0 și montează cablajul”. Atenție: pista 2 are rezistența totală ≈ dublă (rezistor în serie la +5 V)."],
    ctl: () => `<div class="id-grila">${[1, 2, 3, 4, 5, 6].map(p => `<label>Pin ${p}<select id="id-p${p}"><option value=""></option>${MD.FUNCTII.map(f => `<option${sim.ident[p] === f ? " selected" : ""}>${f}</option>`).join("")}</select></label>`).join("")}</div>`,
    ver: () => [[!sim.run, "alimentarea oprită"], [sim.dec, "conectorul X1 decuplat"], [sim.dmm.mod === "R", "multimetrul pe Ω"], [/^p/.test(sim.dmm.s.dmmR) && /^p/.test(sim.dmm.s.dmmB), "sondele pe borne"], [nOhm() >= 6, `măsurători în jurnal: ${nOhm()}/6`]],
    prog: () => [1, 2, 3, 4, 5, 6].filter(p => pe("t30", "p" + p, "fn")).length, tot: 6,
    butoane: [["● R → jurnal", inregOhm, "secundar"], ["● Trece în Tabelul 3.0 și montează cablajul", inregIdent, "primar"]] },
  { t: "Caracteristicile pistelor", tab: "Tabelul 3.1", zona: [20, 20, 800, 720], pini: ["tA0", "tA1", "tGND"],
    banda: "Pasul 2 · Pârghia la 0, 12, 24, 36, 48, 60° (s = 0…100 %). Multimetrul V⎓: sonda − pe TP GND, sonda + pe TP A0 (U1), apoi pe TP A1 (U2).",
    instr: ["Cuplați X1 și porniți simularea (placa alimentată prin USB alimentează și senzorul).", "Multimetrul pe <b>V⎓</b>, sonda − pe TP GND.", "Pentru fiecare poziție: pârghia la unghiul cerut (tragere sau butoanele de mai jos), sonda + pe TP A0 → înregistrare, apoi pe TP A1 → înregistrare.", "Măsurați și TP 5V: tensiunea USB nu este exact 5 V."],
    ctl: () => `<div class="rand-mic">${[0, 12, 24, 36, 48, 60].map(a => `<button type="button" data-teta="${a}">${a}°</button>`).join("")}</div><div class="rand-mic"><button type="button" data-dteta="-0.5">−0,5°</button><button type="button" data-dteta="0.5">+0,5°</button></div>`,
    ver: () => [[sim.run, "placa alimentată"], [sim.dmm.mod === "V", "multimetrul pe V⎓"], [["tGND", "p3", "p5"].includes(sim.dmm.s.dmmB), "sonda − la masă"], [["tA0", "tA1"].includes(sim.dmm.s.dmmR), "sonda + pe TP A0 / TP A1"], [gridS() !== null, `pârghia la o poziție din tabel (θ = ${fx(sim.teta, 1)}°)`]],
    prog: () => MD.POZ.reduce((n, s) => n + (pe("t31", "s" + s, "U1") ? 1 : 0) + (pe("t31", "s" + s, "U2") ? 1 : 0), 0), tot: 12,
    butoane: [["● U (multimetru) → Tabelul 3.1", inregU, "primar"]] },
  { t: "Programul de verificare", tab: "OLED · monitor serial", zona: [440, 0, 860, 520], pini: [],
    banda: "Pasul 3 · Programul citește A0 și A1 la ≈ 10 ms, verifică domeniul și plauzibilitatea și afișează pe OLED U1, U2, ΔU, cursa s și starea.",
    instr: ["Programul are EPS = 0,20 V și NCONF = 5 (cu simularea oprită se pot schimba în cod).", "Parcurgeți toată cursa pârghiei (0 → 60°) și urmăriți pe OLED ΔU și cursa calculată s.", "Comparați U1 de pe OLED cu U1 măsurat cu multimetrul: diferența provine din referința ADC (5 V al plăcii)."],
    ctl: () => `<div class="rand-mic"><button type="button" data-auto="1">↔ Acționează pârghia (10 s)</button></div>`,
    ver: () => [[sim.run && sim.fw && sim.fw.eps === 0.2 && sim.fw.n === 5, "rulează programul cu EPS = 0,20 V, NCONF = 5"], [sim.p3.mn <= 0.5 && sim.p3.mx >= 59.5, "cursa completă parcursă"], [!(sim.pr && sim.pr.fault), "fără defect confirmat"]],
    prog: () => (sim.p3.mn <= 0.5 && sim.p3.mx >= 59.5 ? 1 : 0) + (sim.run && sim.fw && sim.fw.eps === 0.2 ? 1 : 0), tot: 2,
    butoane: [] },
  { t: "Defectele simulate", tab: "Tabelul 3.2", zona: [440, 0, 860, 700], pini: [],
    banda: `Pasul 4 · Pârghia la ${MD.S_DEF * 0.6}° (s = ${MD.S_DEF} %). RESET, apoi închideți un singur comutator S1, S2 sau S3. Monitorul serial afișează t_conf; OLED-ul și lampa EPC – reacția.`,
    instr: [`Pârghia la <b>${MD.S_DEF * 0.6}°</b>; programul fără defect (RESET dacă EPC este aprinsă).`, "Închideți <b>un</b> comutator (S1, S2 sau S3) și așteptați reacția.", "Înregistrați: U1, U2 și t<sub>conf</sub> intră automat; în tabel alegeți verificarea care a detectat și reacția.", "Deschideți comutatorul, apăsați RESET (defectul rămâne memorat, ca în ECU, până la repornire) și treceți la următorul."],
    ctl: () => `<div class="rand-mic"><button type="button" data-teta="${MD.S_DEF * 0.6}">${MD.S_DEF * 0.6}°</button><button type="button" data-rst="1">RESET placă</button></div>`,
    ver: () => [[sim.run && sim.fw && sim.fw.eps === 0.2 && sim.fw.n === 5, "EPS = 0,20 V, NCONF = 5"], [Math.abs(sim.teta - MD.S_DEF * 0.6) < 1e-6, `pârghia la ${MD.S_DEF * 0.6}°`], [!!sim.exp, sim.exp ? `defect ${sim.exp.k.toUpperCase()} aplicat` : "un comutator închis după RESET"], [!!(sim.exp && sim.exp.rez), sim.exp && sim.exp.rez ? (sim.exp.rez === "da" ? `confirmat în ${fx(sim.exp.tc, 1)} ms` : "nedetectat în 1,5 s") : "reacția programului"]],
    prog: () => ["d1", "d2", "d3"].filter(k => pe("t32", k, "U1")).length, tot: 3,
    butoane: [["● U1, U2, t_conf → Tabelul 3.2", inregDef, "primar"]] },
  { t: "Compromisul ε – N", tab: "Tabelul 3.3", zona: [440, 0, 860, 700], pini: [],
    banda: "Pasul 5 · Pentru fiecare configurație: testul de 10 s cu pedala acționată (alarme false din uzura pistei), apoi deriva de 2,2 kΩ (S3) – detectare și timp.",
    instr: ["Opriți simularea, setați în cod (EPS; NCONF) = (0,10; 1), (0,20; 5) sau (0,40; 10), porniți.", "Trimiteți „t” pe monitorul serial și acționați pârghia 10 s (butonul de mai jos).", `Apoi pârghia la ${MD.S_DEF * 0.6}°, RESET, închideți S3 și așteptați reacția; înregistrați.`, "Comparați: pragul mic și confirmarea scurtă dau alarme false; pragul mare nu mai vede deriva."],
    ctl: () => `<div class="rand-mic"><button type="button" data-ser="t">Trimite „t” (test 10 s)</button><button type="button" data-auto="1">↔ Acționează pârghia (10 s)</button></div><div class="rand-mic"><button type="button" data-teta="${MD.S_DEF * 0.6}">${MD.S_DEF * 0.6}°</button><button type="button" data-rst="1">RESET placă</button></div>`,
    ver: () => { const fw = sim.fw || {}, k = Object.keys(MD.CONFIG).find(c => MD.CONFIG[c].eps === fw.eps && MD.CONFIG[c].n === fw.n), T = sim.testRez;
      return [[!!k, k ? `configurația (${fw.eps.toFixed(2)}; ${fw.n})` : "o configurație din tabel"], [!!(T && T.eps === fw.eps && T.n === fw.n && T.dist >= 100), T ? `testul de 10 s: ${T.inv} invalide, ${T.al} alarme` : "testul de 10 s"], [!!(sim.exp && sim.exp.k === "s3" && sim.exp.rez), "deriva (S3) verificată"]]; },
    prog: () => Object.keys(MD.CONFIG).filter(k => pe("t33", k, "inv")).length, tot: 3,
    butoane: [["● rezultatele → Tabelul 3.3", inregCmp, "primar"]] }
];
let pasActiv = 0;
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată pe planșă</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => alegePas(+b.dataset.vezi, true)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-teta]").forEach(b => b.addEventListener("click", () => { if (sim.auto > 0) return; seteazaTeta(+b.dataset.teta); actualizeazaPasi(); }));
  $$("#pasi [data-dteta]").forEach(b => b.addEventListener("click", () => { if (sim.auto > 0) return; seteazaTeta(sim.teta + +b.dataset.dteta); actualizeazaPasi(); }));
  $$("#pasi [data-auto]").forEach(b => b.addEventListener("click", () => { if (!sim.run) return Cadru.mesajTemporar("Porniți simularea.", "atentie"); sim.auto = 10; sim.tAuto = 0; }));
  $$("#pasi [data-rst]").forEach(b => b.addEventListener("click", resetMega));
  $$("#pasi [data-ser]").forEach(b => b.addEventListener("click", () => trimiteSerial(b.dataset.ser)));
  $$("#pasi .id-grila select").forEach(s => s.addEventListener("change", () => { sim.ident[+s.id.slice(4)] = s.value; }));
  alegePas(0, false);
}
function alegePas(i, zoom) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$("#tk-svg .tk-pin").forEach(r => r.classList.toggle("tinta", p.pini.includes(r.dataset.pin)));
  $("#tk-pas-banda").innerHTML = p.banda;
  if (zoom) seteazaVB(p.zona.slice());
  actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  const v = PASI[pasActiv].ver();
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = v.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
}

/* ------------------------------------------------------------------ calculele determinărilor */
function regresie(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  const k = sxy / sxx; return { k, a: my - k * mx };
}
function calculeazaMAM3(D) {
  const t = D.t, cel = { t31: {}, t32: {} }, rele = { t31: {}, t32: {} }, eps = 0.2;
  const xs = [], ys = [], p1 = [], p2 = [], p2x2 = [];
  MD.POZ.forEach(s => { const r = t.t31["s" + s], u1 = num(r.U1), u2 = num(r.U2); if (Number.isFinite(u1)) { xs.push(s); ys.push(u1); p1.push([s, u1]); } if (Number.isFinite(u2)) { p2.push([s, u2]); p2x2.push([s, 2 * u2]); } });
  const g = xs.length >= 3 ? regresie(xs, ys) : null;
  let dmax = 0, dUmax = 0;
  MD.POZ.forEach(s => { const r = t.t31["s" + s], u1 = num(r.U1), u2 = num(r.U2), dU = Math.abs(u1 - 2 * u2), reg = g ? g.a + g.k * s : NaN, ab = u1 - reg;
    if (Number.isFinite(ab)) dmax = Math.max(dmax, Math.abs(ab)); if (Number.isFinite(dU)) dUmax = Math.max(dUmax, dU);
    cel.t31["s" + s] = { teta: fx(0.6 * s, 0), dU: Number.isFinite(dU) ? fx(dU, 3) : "", Ureg: Number.isFinite(reg) ? fx(reg, 3) : "", ab: Number.isFinite(ab) ? fx(ab * 1000, 1) : "" };
    rele.t31["s" + s] = { dU: dU > eps }; });
  const dlin = g && ys.length ? dmax / (Math.max(...ys) - Math.min(...ys)) * 100 : NaN;
  ["d1", "d2", "d3"].forEach(k => { const r = t.t32[k], dU = Math.abs(num(r.U1) - 2 * num(r.U2)); cel.t32[k] = { dU: Number.isFinite(dU) ? fx(dU, 3) : "" }; rele.t32[k] = { dU: dU > eps }; });
  const rez = [
    ["Parametrii pistei 1 (regresie liniară, 3.1)", g ? `U<sub>1,0</sub> = <span style="color:var(--accent)">${fx(g.a, 3)} V</span>, k<sub>1</sub> = <span style="color:var(--accent)">${fx(g.k, 5)} V/%</span>` : "—"],
    ["Eroarea de liniaritate (3.6)", Number.isFinite(dlin) ? `δ<sub>lin</sub> = ${fx(dmax * 1000, 1)} mV / ${fx(Math.max(...ys) - Math.min(...ys), 3)} V = <span style="color:var(--accent)">${fx(dlin, 2)} %</span>` : "—"],
    ["ΔU maxim fără defect (3.5)", ys.length ? `${fx(dUmax, 3)} V față de ε = 0,20 V (rezervă ${fx(eps - dUmax, 3)} V)` : "—"],
    ["Cursa calculată în program cu valorile nominale (U<sub>1,0</sub> = 0,75 V, k<sub>1</sub> = 0,035 V/%)", g ? `la s = 0: ${fx((g.a - 0.75) / 0.035, 1)} %; la s = 100: ${fx((g.a + 100 * g.k - 0.75) / 0.035, 1)} %` : "—"]
  ];
  const verdicte = [];
  if (ys.length >= 4) verdicte.push(dUmax < eps * 0.6 ? { tip: "ok", text: `ΔU rămâne sub ${fx(dUmax, 3)} V pe toată cursa: pragul ε = 0,2 V are o rezervă suficientă față de dispersia normală.` } : { tip: "atentie", text: `ΔU ajunge la ${fx(dUmax, 3)} V spre capătul cursei (încărcarea pistei 2 de către intrare și neliniaritatea): rezerva față de ε = 0,2 V este mică – risc de alarme false la un senzor uzat.` });
  if (g && Math.abs(g.a - 0.75) > 0.02) verdicte.push({ tip: "atentie", text: `U<sub>1,0</sub> măsurat (${fx(g.a, 3)} V) diferă de valoarea nominală din program (0,75 V): cursa afișată are un decalaj de ${fx((g.a - 0.75) / 0.035, 1)} %. ECU învață poziția de repaus a pedalei la fiecare punere a contactului.` });
  const d3 = t.t32.d3; if (Number.isFinite(num(d3.U1))) { const dU = Math.abs(num(d3.U1) - 2 * num(d3.U2)); verdicte.push(dU > eps ? { tip: "ok", text: `Deriva de 2,2 kΩ dă ΔU = ${fx(dU, 3)} V > ε: numai verificarea de plauzibilitate o detectează (ambele piste sunt în domeniu).` } : { tip: "atentie", text: `Deriva de 2,2 kΩ dă doar ΔU = ${fx(dU, 3)} V ≤ ε: la această poziție defectul NU este detectat.` }); }
  const lin = g ? [[0, g.a], [100, g.a + 100 * g.k]] : [];
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Caracteristicile pistelor: U = f(s)",
    grafic: { xmin: 0, xmax: 100, ymin: 0, ymax: 5, xlab: "s [%]", ylab: "U [V]", serii: [{ tip: "pct", pts: p1, culoare: 0, r: 4 }, { tip: "pct", pts: p2, culoare: 1, r: 4 }, { tip: "pct", pts: p2x2, culoare: 2, r: 3 }, ...(lin.length ? [{ tip: "linie", pts: lin, culoare: 0, punctat: true }] : [])] },
    legenda: [["U1 (pista 1)", "var(--serie-0)", "pct"], ["U2 (pista 2)", "var(--serie-1)", "pct"], ["2·U2 (comparat cu U1)", "var(--serie-2)", "pct"], ["regresia U1", "var(--serie-0)"]],
    principal: { eticheta: "k<sub>1</sub> [V/%]", valoare: g ? +g.k.toFixed(5) : null }
  };
}

/* ------------------------------------------------------------------ figura 3.1 */
function figPiste() {
  const W = 660, H = 250, X = s => 50 + s * 2.6, Y = u => 210 - u * 38;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig-svg" role="img" aria-label="Fig. 3.1"><g font-size="10" fill="currentColor">`;
  [0, 1, 2, 3, 4, 5].forEach(u => { s += `<line x1="50" y1="${Y(u)}" x2="310" y2="${Y(u)}" stroke="currentColor" opacity=".12"/><text x="44" y="${Y(u) + 3}" text-anchor="end">${u}</text>`; });
  [0, 20, 40, 60, 80, 100].forEach(x => { s += `<text x="${X(x)}" y="224" text-anchor="middle">${x}</text>`; });
  s += `<rect x="50" y="${Y(5)}" width="260" height="${Y(4.75) - Y(5)}" fill="#c0492b" opacity=".15"/><rect x="50" y="${Y(0.25)}" width="260" height="${Y(0) - Y(0.25)}" fill="#c0492b" opacity=".15"/>`;
  s += `<line x1="${X(0)}" y1="${Y(0.75)}" x2="${X(100)}" y2="${Y(4.25)}" stroke="#1f5f9e" stroke-width="2.2"/><line x1="${X(0)}" y1="${Y(0.375)}" x2="${X(100)}" y2="${Y(2.125)}" stroke="#e0661b" stroke-width="2.2"/>`;
  s += `<text x="${X(70)}" y="${Y(3.4) - 6}" fill="#1f5f9e">U1 = 0,75 + 0,035·s</text><text x="${X(62)}" y="${Y(1.6) + 16}" fill="#e0661b">U2 = U1/2</text><text x="180" y="240" text-anchor="middle">s [%]</text><text x="14" y="120" transform="rotate(-90 14 120)" text-anchor="middle">U [V]</text><text x="300" y="${Y(4.85)}" text-anchor="end" fill="#c0492b">&gt; 4,75 V: scurt la +5 V</text><text x="300" y="${Y(0.05)}" text-anchor="end" fill="#c0492b">&lt; 0,25 V: întrerupere / scurt la masă</text>`;
  // logica
  const B = (x, y, w, h, t, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c || "none"}" stroke="currentColor" opacity=".9"/><text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle">${t}</text>`;
  s += B(350, 20, 130, 30, "citește U1 (A0), U2 (A1)") + B(350, 66, 130, 30, "0,25 ≤ U1, U2 ≤ 4,75 ?") + B(350, 112, 130, 30, "|U1 − 2·U2| ≤ ε ?") + B(350, 158, 130, 30, "cnt = 0") + B(510, 112, 130, 30, "cnt++ ≥ N ?") + B(510, 168, 130, 40, "DEFECT: s = 0 %, EPC", "rgba(192,73,43,.18)");
  s += `<path d="M415,50 v16 M415,96 v16 M415,142 v16 M480,81 h50 v31 M480,127 h30 M575,142 v26" stroke="currentColor" fill="none" marker-end=""/><text x="420" y="108" font-size="9">da</text><text x="420" y="154" font-size="9">da</text><text x="490" y="76" font-size="9">nu</text><text x="486" y="122" font-size="9">nu</text><text x="580" y="160" font-size="9">da</text></g></svg>`;
  return s;
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Senzorul provenit din dezmembrări se verifică vizual (conector, carcasă) înainte de montare; se fixează pe suportul standului, nu se ține în mână în timpul măsurătorilor.</li>
<li>Conectorul senzorului se cuplează și se decuplează numai cu alimentarea oprită; nu se aplică tensiune pe pinii de semnal. Rezistențele se măsoară numai fără tensiune.</li>
<li>Simularea defectelor (întrerupere, scurt la masă) se face numai prin comutatoarele sau punțile pregătite pe stand, nu prin atingerea firelor cu scule metalice.</li>
<li>Pârghia de acționare este din material izolant; se evită strivirea degetelor la capătul cursei.</li></ul></div>
<h2>3.1. Scopul lucrării</h2>
<p>Ridicarea caracteristicilor celor două piste ale senzorului pedalei de accelerație, calculul erorii de liniaritate și implementarea în microcontroler a verificărilor pe care le face ECU: domeniul valid al fiecărei piste, plauzibilitatea între piste și trecerea în modul de avarie. Lucrarea introduce principiile siguranței funcționale (ISO 26262).</p>
<h2>3.2. Noțiuni teoretice</h2>
<p>Pedala de accelerație electronică (drive-by-wire) are doi senzori independenți – potențiometrici sau, la vehiculele actuale, Hall fără contact – alimentați separat. A doua pistă dă de regulă o tensiune pe jumătate din prima sau o caracteristică decalată, astfel încât un scurtcircuit între piste să poată fi detectat. ECU citește ambele semnale și le compară permanent (Fig. 3.1).</p>
<div class="ec"><span>U<sub>1</sub> = U<sub>1,0</sub> + k<sub>1</sub>·s</span><span class="nr">(3.1)</span></div>
<div class="ec"><span>U<sub>2</sub> = U<sub>1</sub>/2</span><span class="nr">(3.2)</span></div>
<div class="ec"><span>s = (U<sub>1</sub> − U<sub>1,0</sub>)/k<sub>1</sub> &nbsp; [%]</span><span class="nr">(3.3)</span></div>
<p>Verificările implementate în ECU sunt: (1) verificarea domeniului – o tensiune sub ≈ 0,25 V indică întrerupere sau scurt la masă, peste ≈ 4,75 V scurt la +5 V; (2) verificarea plauzibilității – diferența dintre prima pistă și dublul celei de-a doua trebuie să rămână sub un prag ε; (3) confirmarea – defectul se validează doar dacă persistă un număr de eșantioane consecutive, pentru a nu reacționa la zgomot.</p>
<div class="ec"><span>0,25 ≤ U<sub>1,2</sub> ≤ 4,75 &nbsp; [V]</span><span class="nr">(3.4)</span></div>
<div class="ec"><span>ΔU = |U<sub>1</sub> − 2·U<sub>2</sub>| ≤ ε</span><span class="nr">(3.5)</span></div>
<figure>${figPiste()}<figcaption>Fig. 3.1. Caracteristicile celor două piste (valori exemplificative) și logica de verificare din ECU</figcaption></figure>
<p>Liniaritatea se apreciază prin abaterea maximă față de dreapta de regresie, raportată la domeniul de ieșire:</p>
<div class="ec"><span>δ<sub>lin</sub> = max|U<sub>i</sub> − (a·s<sub>i</sub> + b)| / (U<sub>max</sub> − U<sub>min</sub>)·100 &nbsp; [%]</span><span class="nr">(3.6)</span></div>
<pre class="cod">const float EPS = 0.2; const int NCONF = 5; int cnt = 0; bool fault = false;
void loop() {
  float u1 = analogRead(A0) * 5.0 / 1024, u2 = analogRead(A1) * 5.0 / 1024;
  bool bad = (u1 &lt; 0.25 || u1 &gt; 4.75 || u2 &lt; 0.25 || u2 &gt; 4.75 || fabs(u1 - 2*u2) &gt; EPS);
  cnt = bad ? cnt + 1 : 0;
  if (cnt &gt;= NCONF) fault = true;               // defect confirmat
  float s = fault ? 0 : (u1 - 0.75) / 3.5 * 100; // mod de avarie: cerere 0 %
  delay(10);
}</pre>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Pinii senzorului (pasul 1).</b> Standul folosește o pedală cu conector cu 6 pini, cu pin-out-ul tipic VW/Hella: 1 – +5 V pista 2, 2 – +5 V pista 1, 3 – masă pista 1, 4 – semnal pista 1, 5 – masă pista 2, 6 – semnal pista 2. Pinii se identifică cu ohmmetrul, cu alimentarea oprită și conectorul decuplat: între alimentarea și masa unei piste rezistența este constantă, între cursor și capete ea variază cu pârghia, iar între piste diferite aparatul arată O.L. Pista 2 are un rezistor în serie la +5 V (de aceea dă jumătate din tensiune), deci rezistența ei totală este ≈ dublă. Identificarea s-a adăugat ca Tabelul 3.0.</li>
<li><b>Măsurare ratiometrică.</b> Senzorul este alimentat din 5 V al plăcii, iar ADC-ul are referința tot la acești 5 V (AVCC). Programul calculează U = N·5,0/1024, adică <i>raportul</i> U/U<sub>alim</sub> înmulțit cu 5 – independent de tensiunea reală a USB (4,8…5,0 V). Multimetrul arată tensiunile absolute, de aceea diferă puțin de cele de pe OLED. ECU lucrează la fel: alimentează senzorii din propria referință de 5 V și o folosește ca referință a ADC.</li>
<li><b>Rezistențele de pull-down ale intrărilor.</b> Intrările A0 și A1 au pe stand câte 22 kΩ la masă, ca intrările ECU: un fir întrerupt dă ≈ 0 V (detectat de verificarea domeniului), nu o intrare „în aer” cu valori aleatoare. Pull-down-ul încarcă puțin pista 2 (care are rezistența internă mai mare din cauza rezistorului serie), de aceea ΔU crește ușor spre capătul cursei chiar la un senzor bun.</li>
<li><b>Poziția pentru Tabelul 3.2.</b> Efectul rezistenței serie de 2,2 kΩ crește cu tensiunea pistei: la s = 0 ΔU rămâne sub 0,1 V (defectul nu este detectat), iar la 40 % este la limita lui ε = 0,2 V (depinde de senzor). Tabelul 3.2 se completează de aceea la s = 60 % (θ = 36°), unde deriva este detectată sigur. Este și o concluzie a lucrării: deriva unei piste se vede numai când pedala este apăsată.</li>
<li><b>Timpul de confirmare.</b> Programul măsoară timpul dintre primul eșantion invalid și confirmare: (N − 1)·T<sub>bucla</sub>. Bucla nu durează 10 ms, ci 10 ms + conversiile ADC (≈ 0,2 ms) + actualizarea OLED-ului (≈ 20…27 ms pe I²C la 100 kHz, la fiecare a zecea trecere), deci t<sub>conf</sub> pentru N = 5 este ≈ 41 ms sau ≈ 65 ms. Timpul total de reacție mai cuprinde și intervalul până la primul eșantion (≤ o perioadă). În ECU verificările rulează într-un task periodic fix (de exemplu 10 ms, OSEK/AUTOSAR), iar afișajul nu blochează bucla.</li>
<li><b>Cursa calculată în program.</b> Relația s = (u1 − 0,75)/3,5·100 folosește valorile nominale; pentru senzorul vostru se folosesc U<sub>1,0</sub> și k<sub>1</sub> din regresie. ECU învață poziția de repaus a pedalei la fiecare punere a contactului, ca să compenseze toleranțele și uzura.</li>
<li><b>Memorarea defectului și reacția.</b> În program, ca în ECU, defectul confirmat rămâne memorat până la repornire (RESET). Reacția reală este gradată: la defectul unei singure piste ECU continuă cu cealaltă, cu cuplu și viteză de creștere limitate (lampa EPC aprinsă); la piste neplauzibile sau la ambele defecte motorul trece la ralanti ridicat (≈ 1200…1500 rot/min), iar pedala de frână are prioritate (brake override). „Cerere 0 %” este starea sigură a cererii de cuplu.</li>
<li><b>Contorul de confirmare.</b> Contorul care revine la 0 la primul eșantion valid nu confirmă defectele intermitente (contact imperfect). În ECU se folosesc contoare de tip „up/down” (crește la eșantionul invalid, scade mai lent la cel valid), care confirmă și defectele intermitente.</li>
<li><b>Alarmele false (pasul 5).</b> La un potențiometru uzat cursorul se desprinde scurt de pistă când pedala se mișcă: apar eșantioane izolate cu U1 mai mic. Cu ε mic și N = 1 acestea produc alarme false; N mai mare le filtrează. Senzorii actuali sunt Hall fără contact (fără uzură), cu ieșiri analogice sau digitale SENT.</li></ul></div>
<h2>3.4. Modul de lucru (în simulator)</h2>
<ol><li>Identificați pinii cu ohmmetrul (alimentare oprită, X1 decuplat), completați Tabelul 3.0; cablajul se montează conform identificării.</li>
<li>Cuplați X1, porniți simularea, ridicați caracteristicile cu multimetrul pe TP A0 și TP A1 la s = 0, 20, …, 100 % (Tabelul 3.1).</li>
<li>Urmăriți programul de verificare pe OLED pe toată cursa.</li>
<li>La s = 60 % simulați întreruperea pistei 2 (S1), scurtul la masă al pistei 1 (S2) și rezistența serie de 2,2 kΩ (S3); notați reacția (Tabelul 3.2).</li>
<li>Pentru (ε; N) = (0,10; 1), (0,20; 5), (0,40; 10) faceți testul de 10 s cu pedala acționată și verificarea derivei (Tabelul 3.3).</li></ol>
<h2>3.7. Interpretarea rezultatelor</h2>
<ul><li>Un senzor sănătos are ΔU mult sub ε pe toată cursa; o creștere a lui ΔU spre capătul cursei indică uzura pistei potențiometrice (sau încărcarea ei de către intrare).</li>
<li>Întreruperea și scurtul sunt detectate de verificarea domeniului; deriva unei piste (rezistență de contact) numai de verificarea de plauzibilitate – de aici necesitatea redundanței.</li>
<li>Un prag ε prea mic produce alarme false; unul prea mare întârzie sau împiedică detectarea unui defect periculos (accelerare nedorită).</li></ul>
<h2>3.8. Relevanță practică</h2>
<p>Redundanța senzorilor și verificările de plauzibilitate sunt mecanisme de siguranță cerute de ISO 26262 pentru funcțiile de accelerare, frânare și direcție. Proiectarea acestor verificări (praguri, timpi de confirmare, reacții) face parte din activitatea inginerilor de software și de siguranță funcțională din industria auto.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>U<sub>1,0</sub> = 0,75 V, k<sub>1</sub> = 0,035 V/%; la s = 40 % se citesc U<sub>1</sub> = 2,15 V și U<sub>2</sub> = 0,95 V (pista 2 are o rezistență de contact în serie):</p>
<div class="ec"><span>s = (2,15 − 0,75)/0,035 = 40 %</span><span class="nr">(3.7)</span></div>
<div class="ec"><span>ΔU = |2,15 − 2·0,95| = 0,25 V &gt; ε = 0,2 V ⇒ defect de plauzibilitate</span><span class="nr">(3.8)</span></div>
<p>Ambele piste sunt în domeniul valid, deci numai verificarea de plauzibilitate detectează defectul. După 5 eșantioane consecutive (≈ 40…50 ms) defectul se confirmă, iar cererea de cuplu se limitează.</p>
<div class="problema"><h3>Problema 1</h3><p>Calculați ΔU pentru U<sub>1</sub> = 3,20 V și U<sub>2</sub> = 1,62 V. Este plauzibilă măsurătoarea pentru ε = 0,2 V?</p><details class="sol"><summary>Rezolvare</summary><p>ΔU = |3,20 − 3,24| = 0,04 V ≤ 0,2 V – plauzibilă; s = (3,20 − 0,75)/0,035 = 70 %.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Pista 2 are rezistența internă (Thévenin) de 0,6 kΩ la s = 60 % și U<sub>2</sub> = 1,40 V în gol. Intrarea are 22 kΩ la masă. Ce tensiune citește programul cu un contact imperfect de 2,2 kΩ în serie?</p><details class="sol"><summary>Rezolvare</summary><p>U<sub>2</sub>' = 1,40·22/(22 + 2,2 + 0,6) = 1,24 V; cu U<sub>1</sub> = 2,85 V: ΔU = |2,85 − 2,48| = 0,37 V &gt; 0,2 V – detectat.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Bucla programului durează 10,3 ms, iar OLED-ul se actualizează la fiecare a zecea trecere în 24 ms. Între ce limite este t<sub>conf</sub> pentru N = 5? Dar pentru N = 10?</p><details class="sol"><summary>Rezolvare</summary><p>N = 5: 4·10,3 = 41,2 ms (fără actualizarea OLED în fereastră) … 41,2 + 24 = 65,2 ms. N = 10: 9·10,3 = 92,7 ms + 24 ms = 116,7 ms (fereastra de 10 eșantioane cuprinde întotdeauna o actualizare, uneori la capăt): 92,7…116,7 ms.</p></details></div>`;
}
const INTREBARI = [
  ["De ce pedala are două piste cu caracteristici diferite și nu două piste identice?", "Pentru ca un scurtcircuit între piste (cele două semnale devin egale) să fie detectabil: cu U<sub>2</sub> = U<sub>1</sub>/2 un scurt dă ΔU = U<sub>1</sub> &gt; ε. La piste identice scurtul ar trece neobservat. Alimentările și masele separate fac ca un singur defect să nu afecteze ambele piste."],
  ["Ce defect detectează verificarea domeniului și ce defect detectează numai verificarea de plauzibilitate?", "Domeniul: întreruperile (cu pull-down → ≈ 0 V), scurtul la masă și scurtul la +5 V. Plauzibilitatea: deriva unei piste (rezistență de contact, uzură, umiditate), scurtul între piste – semnale aflate în domeniu, dar incoerente."],
  ["Ce se întâmplă dacă defectul nu se confirmă pe mai multe eșantioane?", "Un singur eșantion perturbat (zgomot, desprinderea cursorului) ar declanșa modul de avarie: alarme false, coduri memorate și pierderea puterii fără motiv. Confirmarea pe N eșantioane filtrează perturbațiile, cu prețul unei întârzieri de (N − 1)·T."],
  ["Ce reacție este sigură la un defect al pedalei?", "Limitarea cererii de cuplu (la cerere 0 % sau ralanti ridicat), aprinderea lămpii EPC, memorarea codului; la defectul unei singure piste se poate continua cu cealaltă cu cuplu limitat. Niciodată menținerea ultimei cereri, care ar putea însemna accelerare nedorită."],
  ["Calculați ΔU pentru U<sub>1</sub> = 3,20 V și U<sub>2</sub> = 1,62 V. Este plauzibilă măsurătoarea pentru ε = 0,2 V?", "ΔU = |3,20 − 3,24| = 0,04 V ≤ 0,2 V: măsurătoarea este plauzibilă."]
];
const TEST = [
  { q: "Pista 2 a pedalei dă jumătate din tensiunea pistei 1 pentru că:", o: ["consumă mai puțin", "un scurt între piste devine detectabil", "ADC-ul are 2 canale", "așa e mai precis"], c: 1, e: "Semnalele egale (scurt) dau ΔU = U<sub>1</sub>." },
  { q: "Un fir de semnal întrerupt, cu pull-down la intrare, este detectat de:", o: ["verificarea de plauzibilitate", "verificarea domeniului (U &lt; 0,25 V)", "nicio verificare", "contorul de confirmare"], c: 1, e: "Intrarea trage la ≈ 0 V." },
  { q: "O rezistență de contact pe pista 2 este detectată de:", o: ["verificarea domeniului", "verificarea de plauzibilitate", "ambele", "niciuna, niciodată"], c: 1, e: "Ambele piste rămân în domeniu, dar ΔU crește." },
  { q: "ΔU pentru U<sub>1</sub> = 2,15 V și U<sub>2</sub> = 0,95 V este:", o: ["0,05 V", "0,25 V", "1,20 V", "0,10 V"], c: 1, e: "|2,15 − 1,90|." },
  { q: "Cu bucla de 10,3 ms și NCONF = 5, timpul de la primul eșantion invalid la confirmare este cel puțin:", o: ["10,3 ms", "41,2 ms", "51,5 ms", "5 ms"], c: 1, e: "(5 − 1)·10,3 ms." },
  { q: "Reacția sigură la un defect confirmat al pedalei este:", o: ["menținerea ultimei valori", "cerere de cuplu limitată / ralanti, lampa EPC", "accelerare maximă", "oprirea imediată a direcției asistate"], c: 1, e: "Starea sigură este limitarea cuplului." }
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
.tk-ajutor { margin:.3rem .6rem 0; font:11px system-ui,sans-serif; color:#888; pointer-events:none; }
.tk-insp { position:absolute; right:.6rem; top:.6rem; width:280px; background:#fff; border:1px solid #d8dde3; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.15); font:12.5px system-ui,sans-serif; color:#333; }
.tk-insp-t { display:flex; justify-content:space-between; align-items:center; padding:.5rem .6rem; font-weight:700; border-bottom:1px solid #eee; } .tk-insp-t button { border:0; background:none; cursor:pointer; color:#777; }
.tk-insp-r { display:flex; justify-content:space-between; gap:.6rem; padding:.3rem .6rem; } .tk-insp-r span { color:#777; } .tk-insp-r b { font-weight:600; text-align:right; }
.tk-jos { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); border-top:1px solid #e3e3e3; }
.tk-jos:has(.tk-cod[hidden]) { grid-template-columns:1fr; }
.tk-cod { background:#fff; display:flex; flex-direction:column; min-width:0; } .tk-cod[hidden] { display:none; }
.tk-ser { border-left:1px solid #e3e3e3; display:flex; flex-direction:column; min-width:0; background:#fff; }
.tk-cod-sus { display:flex; gap:.4rem; padding:.4rem .5rem; border-bottom:1px solid #eee; align-items:center; font:12px system-ui,sans-serif; color:#555; }
#tk-cod { margin:0; padding:.5rem .3rem; overflow:auto; background:#fff; color:#1f1f1f; font:11.5px/1.5 ui-monospace,Consolas,"Courier New",monospace; white-space:pre; max-height:300px; }
.cd-ln { display:inline-block; width:2.2em; color:#a8a8a8; text-align:right; margin-right:.8em; user-select:none; }
.cd-k { color:#0b62b5; font-weight:600; } .cd-s { color:#b2502b; } .cd-c { color:#6a8759; font-style:italic; } .cd-n { color:#7a3fb0; }
.cd-f { min-width:5.5ch; background:#fff8d6; color:#5b3d00; border:1px solid #e0b84a; border-radius:3px; font:inherit; padding:0 .2rem; } .cd-f:disabled { background:#f1f1f1; color:#777; border-color:#ccc; }
.tk-blocat { background:#fff4e5; color:#8a5300; font:12px system-ui,sans-serif; padding:.35rem .6rem; border-bottom:1px solid #f1d7a8; }
#tk-serial { margin:0; flex:1 1 auto; min-height:180px; max-height:300px; overflow:auto; background:#fff; color:#222; padding:.4rem .6rem; font:11.5px/1.4 ui-monospace,Consolas,monospace; }
.tk-ser-in { display:flex; gap:.3rem; padding:.35rem .5rem; border-top:1px solid #eee; } .tk-ser-in input { flex:1; font:12px ui-monospace,monospace; padding:.2rem .4rem; border:1px solid #cfd4da; border-radius:4px; } .tk-ser-in button { border:1px solid #cfd4da; background:#fff; border-radius:4px; padding:.2rem .6rem; font:12px system-ui; cursor:pointer; color:#333; }
.fw { font-size:.8rem; } .fw b { font-family:ui-monospace,monospace; }
pre.cod { background:#1e1e1e; color:#d4d4d4; padding:.7rem .9rem; border-radius:6px; overflow:auto; font:12.5px/1.45 ui-monospace,Consolas,monospace; }
.fig-svg { width:100%; max-width:680px; height:auto; color:var(--text); }
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
.pas-ctl { margin:.3rem 0; } .rand-mic { display:flex; flex-wrap:wrap; gap:.3rem; margin:.25rem 0; } .rand-mic button { padding:.25rem .55rem; font-size:.8rem; }
.id-grila { display:grid; grid-template-columns:1fr 1fr; gap:.3rem .5rem; } .id-grila label { display:flex; flex-direction:column; font-size:.78rem; gap:.1rem; } .id-grila select { font-size:.8rem; }
.sim-grila:fullscreen .sim-scena.tk, .sim-grila.ecran-plin .sim-scena.tk { display:block; }
.sim-grila:fullscreen #tk-svg, .sim-grila.ecran-plin #tk-svg { height:calc(100vh - 23rem); min-height:320px; aspect-ratio:auto; }
@media (max-width:900px){ .tk-jos { grid-template-columns:1fr; } .tk-ser { border-left:0; border-top:1px solid #e3e3e3; } .tk-pas-banda { position:static; max-width:none; border-radius:0; } }
</style>`;
const SEL_VER = ["domeniu – U1 < 0,25 V", "domeniu – U2 < 0,25 V", "plauzibilitate – ΔU > ε", "niciuna"];
const SEL_REAC = ["mod de avarie: cerere 0 %, EPC aprinsă", "fără reacție"];
Cadru.porneste({
  disc: "MAM1", nr: 3, cod: "mam1-l3",
  titlu: "Senzorul pedalei de accelerație cu două piste: plauzibilitate și reacția la defect",
  scurt: "Pedala de accelerație cu două piste",
  subtitlu: "Laborator virtual – identificarea pinilor, caracteristicile pistelor, programul de verificare pe Arduino Mega cu OLED, defecte simulate și compromisul prag – confirmare",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261024); },
  date: [{ k: "eps", et: "ε (Tabelele 3.1, 3.2) [V]", v: 0.2, fix: true }, { k: "n", et: "N confirmări (Tabelul 3.2)", v: 5, fix: true }, { k: "Rpd", et: "Pull-down A0/A1 [kΩ]", v: 22, fix: true }, { k: "sdef", et: "Poziția pentru Tabelul 3.2 [%]", v: MD.S_DEF, fix: true }],
  tabele: [
    { id: "t30", titlu: "Tabelul 3.0. Identificarea pinilor senzorului", antetRand: "Pinul", nota: "Din măsurătorile de rezistență cu alimentarea oprită și conectorul decuplat (jurnalul de măsurători).",
      randuri: [1, 2, 3, 4, 5, 6].map(p => ({ k: "p" + p, et: String(p) })),
      coloane: [{ k: "fn", t: "Funcția", intrare: true, tip: "select", optiuni: MD.FUNCTII }] },
    { id: "t31", titlu: "Tabelul 3.1. Caracteristicile pistelor", antetRand: "s [%]", nota: "U1, U2 cu multimetrul (TP A0, TP A1 față de GND); ΔU = |U1 − 2U2|; regresia U1 = U<sub>1,0</sub> + k<sub>1</sub>·s; abaterea = U1 − U1 regresie.",
      randuri: MD.POZ.map(s => ({ k: "s" + s, et: String(s) })),
      coloane: [{ k: "teta", t: "θ [°]" }, { k: "U1", t: "U1 [V]", intrare: true }, { k: "U2", t: "U2 [V]", intrare: true }, { k: "dU", t: "ΔU [V]" }, { k: "Ureg", t: "U1 regresie [V]" }, { k: "ab", t: "Abatere [mV]" }] },
    { id: "t32", titlu: `Tabelul 3.2. Defecte simulate (s = ${MD.S_DEF} %, ε = 0,20 V, N = 5)`, antetRand: "Defect simulat", nota: "U1, U2 de pe OLED (U = N·5/1024); t<sub>conf</sub> de pe monitorul serial (de la primul eșantion invalid la confirmare).",
      randuri: [{ k: "d1", et: "Întrerupere semnal pistă 2 (S1)" }, { k: "d2", et: "Scurt la masă semnal pistă 1 (S2)" }, { k: "d3", et: "Rezistență serie 2,2 kΩ pe pista 2 (S3)" }],
      coloane: [{ k: "U1", t: "U1 [V]", intrare: true }, { k: "U2", t: "U2 [V]", intrare: true }, { k: "dU", t: "ΔU [V]" }, { k: "ver", t: "Verificarea care detectează", intrare: true, tip: "select", optiuni: SEL_VER, manualEval: true }, { k: "tc", t: "Timp de confirmare [ms]", intrare: true }, { k: "reac", t: "Reacție", intrare: true, tip: "select", optiuni: SEL_REAC, manualEval: true }] },
    { id: "t33", titlu: "Tabelul 3.3. Compromisul prag – confirmare", antetRand: "Configurația", nota: `Testul de 10 s cu pedala acționată pe toată cursa (alarme false); deriva de 2,2 kΩ la s = ${MD.S_DEF} %.`,
      randuri: [{ k: "c1", et: "ε = 0,10 V; N = 1" }, { k: "c2", et: "ε = 0,20 V; N = 5" }, { k: "c3", et: "ε = 0,40 V; N = 10" }],
      coloane: [{ k: "inv", t: "Eșantioane invalide în 10 s", intrare: true }, { k: "al", t: "Alarme (confirmări) în 10 s", intrare: true }, { k: "det", t: "Deriva 2,2 kΩ detectată", intrare: true, tip: "select", optiuni: ["da", "nu"] }, { k: "tc", t: "t<sub>conf</sub> derivă [ms]", intrare: true }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaMAM3,
  intrebari() {
    return [
      { id: "q1", u: "V", text: "U<sub>1,0</sub> – ordonata la origine a regresiei U1 = f(s) (Tabelul 3.1):", textSimplu: "U1,0 din regresie" },
      { id: "q2", u: "V/%", text: "k<sub>1</sub> – panta regresiei U1 = f(s):", textSimplu: "k1 din regresie" },
      { id: "q3", u: "%", text: "Eroarea de liniaritate a pistei 1, δ<sub>lin</sub> (relația 3.6):", textSimplu: "Eroarea de liniaritate" },
      { id: "q4", u: "V", text: `ΔU la s = ${MD.S_DEF} % cu rezistența serie de 2,2 kΩ pe pista 2 (Tabelul 3.2):`, textSimplu: "ΔU cu deriva de 2,2 kΩ" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = [1, 2, 3, 4, 5, 6].filter(p => t.t30["p" + p].fn !== "").length; if (a < 6) l.push(`Tabelul 3.0: ${a}/6 pini`);
    const b = MD.POZ.reduce((n, s) => n + (t.t31["s" + s].U1 !== "" ? 1 : 0) + (t.t31["s" + s].U2 !== "" ? 1 : 0), 0); if (b < 12) l.push(`Tabelul 3.1: ${b}/12 valori`);
    const c = ["d1", "d2", "d3"].filter(k => t.t32[k].U1 !== "").length; if (c < 3) l.push(`Tabelul 3.2: ${c}/3 defecte`);
    const d = ["c1", "c2", "c3"].filter(k => t.t33[k].inv !== "").length; if (d < 3) l.push(`Tabelul 3.3: ${d}/3 configurații`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t31.s40, { U1: "2.150", U2: "1.075" }); Object.assign(t.t32.d3, { U1: "2.150", U2: "0.950" }); },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Standul de lucru la scară reală: senzorul pedalei de accelerație (două piste) pe suportul imprimat 3D, cu pârghia izolantă și raportorul din acril, cutia de conexiuni cu bornele 1…6, conectorul X1, cutia de simulare a defectelor (S1, S2, S3, punctele de test), Arduino Mega 2560 cu afișajul OLED și lampa EPC, multimetrul cu sondele și laptopul cu programul. Cablajul dintre borne și placă apare după identificarea pinilor; montajul urmărește simulatorul (pârghia, comutatoarele, X1, sondele, ecranele). Rotiți, apropiați sau depărtați vederea.</p>`,
    modul: "montaj3d.js?v=1", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, 0, 1300, 800], construieste: L => montaj3dL3(L), cam: [0.0, 0.58, 0.86], tinta: [-0.02, 0.04, 0.0],
      vederi: { tot: [[0.0, 0.58, 0.86], [-0.02, 0.04, 0.0], "Ansamblu"], pedala: [[-0.3, 0.2, 0.42], [-0.37, 0.08, 0.04], "Pedala"], cutii: [[-0.15, 0.25, 0.45], [-0.18, 0.02, 0.2], "Cutiile"], mega: [[0.24, 0.2, 0.4], [0.24, 0.02, 0.1], "Mega și OLED"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Pedala de accelerație electronică în autoturism",
    intro: `<p>Pedala de accelerație cu două piste este legată la calculatorul motorului, care comandă clapeta electronică (drive-by-wire). Selectați pedala în machetă: pistele, alimentările separate și semnalele pe osciloscop.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "app" })
  },
  atelierSenzori: { intro: `<p>Pedala de accelerație (APP) este preselectată: modelul 3D al modulului de pedală, mufa cu 6 pini și verificările cu osciloscopul (pistă bună, întrerupere locală, raport greșit între piste). Puteți alege și alți senzori din listă.</p>`, optiuni: { initial: "app" } },
  referat: {
    scop: "Ridicarea caracteristicilor pistelor senzorului pedalei de accelerație, eroarea de liniaritate, verificările de domeniu și plauzibilitate implementate în microcontroler și reacția la defecte simulate.",
    relatii: "U<sub>1</sub> = U<sub>1,0</sub> + k<sub>1</sub>·s; &nbsp; U<sub>2</sub> = U<sub>1</sub>/2; &nbsp; 0,25 ≤ U<sub>1,2</sub> ≤ 4,75 V; &nbsp; ΔU = |U<sub>1</sub> − 2U<sub>2</sub>| ≤ ε; &nbsp; δ<sub>lin</sub> = max|U<sub>i</sub> − (a·s<sub>i</sub> + b)|/(U<sub>max</sub> − U<sub>min</sub>)·100.",
    varianta: () => "Senzorul propriu fiecărui student: caracteristicile și neliniaritatea pistelor, rezistențele lor, tensiunea USB, durata buclei și a actualizării OLED, uzura pistei.",
    indicatii: "Comentați identificarea pinilor, linearitatea, ΔU pe cursă față de ε, ce verificare detectează fiecare defect, timpii de confirmare și compromisul dintre alarmele false și detectarea derivei…"
  },
  subsol: "Modelul: senzor potențiometric cu două piste (pista 2 cu rezistor serie), alimentat din 5 V al plăcii (ratiometric), intrări cu pull-down 22 kΩ, ADC 10 biți referit la AVCC, bucla de 10 ms + ADC + OLED, desprinderi ale cursorului la mișcare. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Circuite</b> · Stand MAM I – Lucrarea 3</span>
        <button type="button" id="tk-fit" title="Încadrează tot">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div>
        <div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <p class="tk-ajutor">Rotița = zoom · tragere pe fundal = deplasare · trageți pârghia (pas 0,5°) și sondele multimetrului (+, −) pe borne · clic pe comutatorul rotativ (OFF / V⎓ / Ω), pe S1–S3, pe X1 și pe RESET</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – Arduino Mega 2560</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite (de ex. t)" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <p class="fw">Program încărcat: <b id="fw-mega">—</b></p>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Valorile intră în tabele numai din aparate. „Arată pe planșă” mărește zona de lucru și marchează punctele de măsură.</p>
    </aside>
  </div>`,
    init(C) {
      legaPlansa(); desenSonde(); desenCablaj(); afiseazaCod(); actualizeazaFw(); parghieAfis(); ledAfis(); oledAfis(); citesteDMM();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => seteazaVB(VB0.slice()));
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) trimiteSerial(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      C.mesaj("Pasul 1: cu alimentarea oprită și X1 decuplat, identificați pinii senzorului cu ohmmetrul.", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.serial = []; },
    cadru(dt, C, vizibil) {
      const acum = performance.now(), h = Math.min(dt || 0.016, 0.1);
      if (sim.auto > 0) { sim.tAuto = (sim.tAuto || 0) + h; sim.auto -= h; seteazaTeta(Math.round((30 - 30 * Math.cos(2 * Math.PI * 0.5 * sim.tAuto)) * 10) / 10); if (sim.auto <= 0) { sim.auto = 0; seteazaTeta(Math.round(sim.teta * 2) / 2); } }
      sim.vTeta = (sim.teta - sim.tetaAnt) / h; sim.tetaAnt = sim.teta;
      if (sim.run) { pasProgram(h); sim.p3.mn = Math.min(sim.p3.mn, sim.teta); sim.p3.mx = Math.max(sim.p3.mx, sim.teta); }
      if (!vizibil) return;
      if (acum - sim.dmm.tA > 300) { sim.dmm.tA = acum; citesteDMM(); }
      if (acum - (this._to || 0) > 100) { this._to = acum; oledAfis(); ledAfis(); }
      $("#ledTX").setAttribute("fill", sim.run && acum - sim.tx < 60 ? "#ffd04a" : "#5a4a1a");
      if (acum - (this._ts || 0) > 300) {
        this._ts = acum; avertizari(); actualizeazaPasi();
        if (sim.run) { const t = Math.floor((acum - sim.t0) / 1000); $("#tk-timp").textContent = `Timp de simulare: ${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; }
        C.stare(1, sim.run ? "placa alimentată" : "alimentare oprită", sim.run ? "inc" : ""); C.stare(2, sim.pr && sim.pr.fault ? "DEFECT confirmat – EPC" : sim.run ? "program: NORMAL" : "");
      }
    },
    redeseneaza() { parghieAfis(); },
    formule() {
      const r = [], p = sim.pr;
      r.push(["Cursa (pârghia)", `s = θ/60·100 = ${fx(sim.teta, 1)}/60·100 = <span class="rez">${fx(sCur(), 1)} %</span>`]);
      if (p) { r.push(["Plauzibilitatea (3.5)", `ΔU = |${fx(p.u1, 3)} − 2·${fx(p.u2, 3)}| = <span class="rez">${fx(Math.abs(p.u1 - 2 * p.u2), 3)} V</span> ${Math.abs(p.u1 - 2 * p.u2) > sim.fw.eps ? "&gt;" : "≤"} ε = ${fx(sim.fw.eps, 2)} V`]);
        r.push(["Cursa calculată în program (3.3, nominal)", `s = (${fx(p.u1, 3)} − 0,75)/3,5·100 = <span class="rez">${fx((p.u1 - 0.75) / 3.5 * 100, 1)} %</span>`]); }
      return r;
    }
  }
});

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL3(L) {
  const { V3, mm, M, THREE } = L, R = 0xe53935, N = 0x222222, CP = { 1: 0xd32f2f, 2: 0xef9a9a, 3: 0x6d4c41, 4: 0x2e7d32, 5: 0xbcaaa4, 6: 0xf9d71c };
  const eticheta = (w, h, f) => { const e = L.ecran(w, h); f(e.x, w, h); e.t.needsUpdate = true; return e.t; };
  const banana = (p, cul) => { const g = L.grup(p); L.cyl(mm(4.2), mm(4.2), mm(16), L.M.plastic.clone ? new THREE.MeshStandardMaterial({ color: cul, roughness: 0.5 }) : M.plastic, g, 0, mm(10), 0, "y", 18); L.cyl(mm(2), mm(2), mm(4), M.alu, g, 0, mm(1), 0, "y", 10); return p.clone().add(V3(0, mm(18), 0)); };
  /* ---- standul pedalei: profil de aluminiu, suportul imprimat 3D, raportorul, senzorul cu două piste, pârghia */
  const PG = L.grup([-0.37, 0, 0.04], 0.3);
  L.k_(L.box(0.2, mm(20), mm(20), M.alu, PG, 0, mm(10), 0, mm(1.5)), "stand", "Profil de aluminiu 20 × 20 mm (baza standului)");
  [-1, 1].forEach(sx => L.box(mm(2), mm(20), mm(20), M.negru, PG, sx * 0.101, mm(10), 0, mm(0.8)));
  L.k_(L.box(0.16, 0.13, mm(6), M.pla, PG, 0, mm(20) + 0.065, 0, mm(3)), "stand", "Suportul imprimat 3D (PLA) – fixează senzorul pedalei");
  [-1, 1].forEach(sx => L.box(mm(6), mm(30), mm(30), M.pla, PG, sx * 0.06, mm(35), mm(-17), mm(2)));
  [[-0.068, 0.142], [0.068, 0.142], [-0.068, 0.03], [0.068, 0.03]].forEach(([x, y]) => L.cyl(mm(3), mm(3), mm(3), M.crom, PG, x, y, mm(4.5), "z", 16));
  const yP = 0.068, zF = mm(3);
  { const g = new THREE.RingGeometry(0.066, 0.092, 72, 1, (90 - 72) * Math.PI / 180, 84 * Math.PI / 180);
    const t = eticheta(1024, 1024, (x, w) => { x.clearRect(0, 0, w, w); const c = w / 2, k = w / 2 / 0.092; x.strokeStyle = "#1d3557"; x.fillStyle = "#1d3557"; x.font = "bold 34px sans-serif"; x.textAlign = "center";
      for (let a = -12; a <= 72; a++) { const r0 = 0.092 * k - 4, l = a % 10 === 0 ? 46 : a % 5 === 0 ? 30 : 16, s = Math.sin(a * Math.PI / 180), cc = Math.cos(a * Math.PI / 180); x.lineWidth = a % 10 ? 2 : 4; x.beginPath(); x.moveTo(c + r0 * s, c - r0 * cc); x.lineTo(c + (r0 - l) * s, c - (r0 - l) * cc); x.stroke();
        if (a % 10 === 0) x.fillText(String(a), c + (r0 - 76) * s, c - (r0 - 76) * cc + 12); } });
    const m = new THREE.MeshStandardMaterial({ color: 0xd6ecff, map: t, transparent: true, opacity: 0.75, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    const r = new THREE.Mesh(g, m); r.position.set(0, yP, zF + mm(1)); PG.add(r); L.k_(r, "rap", "Raportorul din acril (0…70°)"); }
  const SN = L.grup(V3(0, yP, zF), 0, PG);
  L.k_(L.box(mm(72), mm(26), mm(16), M.negru, SN, 0, 0, mm(8), mm(6)), "senzor", "Senzorul pedalei de accelerație cu două piste (6 pini: 2 × alimentare, 2 × masă, 2 × semnal)");
  L.k_(L.cyl(mm(22), mm(22), mm(14), M.negruMat, SN, 0, 0, mm(10), "z", 40), "senzor", "Senzorul pedalei – carcasa traductorului (Hall / potențiometric, două piste)");
  [-1, 1].forEach(sx => { L.cyl(mm(3.6), mm(3.6), mm(3), M.crom, SN, sx * mm(30), 0, mm(16.5), "z", 14); });
  const con = L.box(mm(24), mm(20), mm(14), M.negru, SN, mm(42), mm(-26), mm(8), mm(2)); L.k_(con, "senzor", "Conectorul senzorului (6 pini)");
  const PR = L.grup(V3(0, 0, mm(18)), 0, SN);
  L.k_(L.box(mm(18), 0.1, mm(8), M.alb, PR, 0, 0.05, 0, mm(4)), "parghie", "Pârghia izolantă (unghiul θ se citește pe raportor)");
  L.box(mm(26), mm(22), mm(10), L.M.bej, PR, 0, 0.098, 0, mm(5)); L.box(mm(1.5), mm(50), mm(0.5), L.M.rosu, PR, 0, 0.07, mm(4.3), mm(0.2)); L.cyl(mm(10), mm(10), mm(10), M.crom, PR, 0, 0, 0, "z", 24);
  PG.updateMatrixWorld(true); const conW = con.getWorldPosition(new THREE.Vector3());
  /* ---- cutia de conexiuni (bornele 1…6) */
  const BX = L.grup([-0.33, 0, 0.215], 0);
  L.k_(L.box(0.19, mm(45), mm(70), M.gri, BX, 0, mm(22.5), 0, mm(4)), "br", "Cutia de conexiuni – pinii 1…6 ai conectorului senzorului (borne de 4 mm)");
  L.plan(eticheta(1024, 380, (x, w, h) => { x.fillStyle = "#2f3439"; x.fillRect(0, 0, w, h); x.fillStyle = "#e6ebf0"; x.font = "bold 40px sans-serif"; x.fillText("CUTIA DE CONEXIUNI – SENZORUL PEDALEI", 30, 60); x.font = "bold 54px sans-serif"; x.textAlign = "center"; for (let i = 1; i <= 6; i++) x.fillText(String(i), w / 2 + (i - 3.5) * 0.03 / 0.19 * w, 150); }), 0.188, mm(69), BX, 0, mm(45.1), 0);
  const SO = {};
  for (let i = 1; i <= 6; i++) { const x = (i - 3.5) * 0.03; L.cyl(mm(7), mm(7), mm(3), new THREE.MeshStandardMaterial({ color: CP[i], roughness: 0.45 }), BX, x, mm(46.5), mm(8), "y", 24); L.k_(L.cyl(mm(4), mm(4), mm(6), M.aur, BX, x, mm(49), mm(8), "y", 18), "p" + i, `Borna ${i} (pinul ${i} al senzorului)`); L.cyl(mm(1.8), mm(1.8), mm(0.2), M.negru, BX, x, mm(52.05), mm(8), "y", 12); BX.updateMatrixWorld(true); SO[i] = BX.localToWorld(V3(x, mm(52), mm(8))); }
  L.tub([conW, conW.clone().add(V3(0.02, -0.03, 0.03)), V3(-0.27, mm(6), 0.16), V3(-0.33, mm(10), 0.17), V3(-0.33, mm(22), 0.18)], mm(3.5), M.negru);
  /* ---- conectorul X1 (cuplat / decuplat) */
  const X1 = V3(-0.17, 0, 0.29), xA = L.box(mm(18), mm(14), mm(34), M.negru, null || L.sc, X1.x, mm(7), X1.z, mm(2)), xB = L.box(mm(20), mm(14), mm(34), M.gri, L.sc, X1.x + mm(19), mm(7), X1.z, mm(2));
  L.k_(xA, "x1", "Conectorul X1 (partea cablajului senzorului)"); L.k_(xB, "x1", "Conectorul X1 (partea plăcii) – decuplat pentru măsurarea rezistențelor");
  const xin = i => V3(X1.x - mm(9), mm(7), X1.z - mm(12) + (i - 1) * mm(4.8)), xout = i => V3(xB.position.x + mm(10), mm(7), X1.z - mm(12) + (i - 1) * mm(4.8));
  /* ---- cutia de simulare a defectelor */
  const FB = L.grup([-0.03, 0, 0.16], 0);
  L.k_(L.box(0.155, mm(45), mm(107), new THREE.MeshStandardMaterial({ color: 0x1f4e8c, roughness: 0.5 }), FB, 0, mm(22.5), 0, mm(4)), "fb", "Cutia de simulare a defectelor (S1 întrerupere pistă 2, S2 scurt la masă pistă 1, S3 R serie 2,2 kΩ)");
  L.plan(eticheta(1024, 700, (x, w, h) => { x.fillStyle = "#1f4e8c"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.font = "bold 40px sans-serif"; x.fillText("SIMULAREA DEFECTELOR", 24, 54); x.font = "bold 46px sans-serif"; x.textAlign = "center";
    [["S1", "întrerupere", 0.2], ["S2", "scurt la masă", 0.5], ["S3", "R serie 2,2 kΩ", 0.8]].forEach(([t, d, u]) => { x.fillText(t, u * w, 300); x.font = "28px sans-serif"; x.fillText(d, u * w, 340); x.font = "bold 46px sans-serif"; });
    x.font = "bold 30px sans-serif"; [["TP A0", 0.14], ["TP A1", 0.38], ["TP 5V", 0.62], ["TP GND", 0.86]].forEach(([t, u]) => x.fillText(t, u * w, 560)); x.fillText("IN A0  IN A1", 0.16 * w, 120); x.fillText("OUT A0  OUT A1", 0.82 * w, 120); }), 0.153, mm(105), FB, 0, mm(45.1), 0);
  const SW = {}; [["s1", -0.047], ["s2", 0], ["s3", 0.047]].forEach(([k, x]) => { L.cyl(mm(5), mm(5), mm(4), M.crom, FB, x, mm(47), mm(-6), "y", 6); const b = L.grup(V3(x, mm(49), mm(-6)), 0, FB); const bat = L.cyl(mm(1.6), mm(2.2), mm(16), M.crom, b, 0, mm(8), 0, "y", 14); L.k_(bat, "sw-" + k, `Comutatorul ${k.toUpperCase()}`);
    const lm = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff3d00, emissiveIntensity: 0 }); L.mesh(new THREE.SphereGeometry(mm(2.2), 14, 10), lm, FB, x + mm(11), mm(46), mm(-6)); SW[k] = { b, lm }; });
  FB.updateMatrixWorld(true); const fw = (x, y, z) => FB.localToWorld(V3(x, y, z));
  L.rezistor(fw(0.035, mm(45), mm(16)), fw(0.06, mm(45), mm(16)), 2200, { h: 2, et: "Rezistorul serie de 2,2 kΩ (defectul S3)" });
  const TPW = {}; [["tA0", -0.056, 0xf2f2f2], ["tA1", -0.019, 0xf2f2f2], ["t5V", 0.019, 0xc62828], ["tGND", 0.056, 0x111111]].forEach(([k, x, c]) => { L.cyl(mm(6), mm(6), mm(3), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), FB, x, mm(46.5), mm(36), "y", 20); L.k_(L.cyl(mm(3.6), mm(3.6), mm(6), M.aur, FB, x, mm(49), mm(36), "y", 16), k, { tA0: "Punct de test A0", tA1: "Punct de test A1", t5V: "Punct de test 5 V", tGND: "Punct de test GND" }[k]); TPW[k] = fw(x, mm(52), mm(36)); });
  const IN = { A0: fw(-0.065, mm(48), mm(-38)), A1: fw(-0.05, mm(48), mm(-38)) }, OUT = { A0: fw(0.05, mm(48), mm(-38)), A1: fw(0.065, mm(48), mm(-38)) };
  [[IN.A0, 0x2e7d32], [IN.A1, 0xf9d71c], [OUT.A0, 0x2e7d32], [OUT.A1, 0xf9d71c]].forEach(([p, c]) => { const l = FB.worldToLocal(p.clone()); L.cyl(mm(4.5), mm(4.5), mm(4), new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }), FB, l.x, mm(46.5), l.z, "y", 18); });
  /* ---- Arduino Mega, OLED, lampa EPC, multimetrul, laptopul */
  const MG = L.arduinoMega([0.18, 0, 0.15]);
  const OL = L.oled([0.33, 0, 0.07], { ecran: [888, 72, 184, 118], roty: -0.3 });
  ["GND", "5V", "D21", "D20"].forEach((n, i) => L.fir(OL.pin(i), MG.pin(n === "5V" ? "5V" : n === "GND" ? "GND2" : n), [N, R, 0x1e88e5, 0x43a047][i]));
  const EP = L.grup([0.36, 0, -0.06], -0.4); L.k_(L.box(mm(80), mm(46), mm(56), M.gri, EP, 0, mm(23), 0, mm(5)), "epc", "Lampa de avarie EPC (D13 + rezistor)");
  const lm = new THREE.MeshStandardMaterial({ color: 0x3a2a00, emissive: 0xffb300, emissiveIntensity: 0, roughness: 0.2 }); L.cyl(mm(12), mm(12), mm(4), lm, EP, 0, mm(30), mm(28), "z", 28);
  L.planB(eticheta(256, 96, (x, w, h) => { x.fillStyle = "#26292e"; x.fillRect(0, 0, w, h); x.fillStyle = "#ddd"; x.font = "bold 46px sans-serif"; x.textAlign = "center"; x.fillText("EPC", w / 2, 66); }), mm(30), mm(11), EP, 0, mm(9), mm(28.2));
  const sEPC = L.stralucire(EP, V3(0, mm(30), mm(33)), 0xffb300, mm(60)); EP.updateMatrixWorld(true);
  L.fir(EP.localToWorld(V3(mm(-10), mm(46), mm(-20))), MG.pin("D13"), 0xff9800); L.fir(EP.localToWorld(V3(mm(10), mm(46), mm(-20))), MG.pin("GND_T"), N);
  const DM = L.multimetru([-0.08, 0, -0.2], { ecran: [504, 62, 154, 66], et: "Multimetru digital (V⎓, Ω) cu două sonde" });
  const PC = L.laptop([0.43, 0, -0.17], { roty: -0.35, cod: () => L.textCod(), titlu: () => `Arduino IDE – ${PROG.titlu}.ino` });
  L.cabluUSB(V3(0.18 - 0.0582, 0.01, 0.1389), PC.usb);
  // ieșirile cutiei de defecte spre A0 / A1 și punctele de test 5 V / GND legate la placă
  L.fir(OUT.A0, MG.pin("A0"), 0x2e7d32); L.fir(OUT.A1, MG.pin("A1"), 0xf9d71c);
  /* ---- cablajul variabil: bornele → X1 → destinațiile alese la identificarea pinilor */
  let dyn = [], cheie = "";
  const reface = () => {
    dyn.forEach(o => { L.sc.remove(o); }); dyn = []; const n0 = L.sc.children.length;
    const dest = { "5V": MG.pin("5V"), GND: MG.pin("GND"), A0: IN.A0, A1: IN.A1 };
    for (let i = 1; i <= 6; i++) { const top = banana(SO[i], CP[i]); L.cablu(top, xin(i), CP[i], { r: 0.9, burta: 0.03, db: V3(mm(-20), mm(6), 0) });
      if (sim.as && dest[sim.as[i]]) L.cablu(xout(i), dest[sim.as[i]], CP[i], { r: 0.9, burta: 0.04, da: V3(mm(20), mm(4), 0), dupontB: true }); }
    dyn = L.sc.children.slice(n0);
  };
  const sd = [L.sonda(DM.v, 0xd32f2f, V3(-0.03, 0.003, -0.06), { et: "Sonda + a multimetrului" }), L.sonda(DM.com, 0x1b1d20, V3(-0.13, 0.003, -0.06), { et: "Sonda − (COM) a multimetrului" })];
  const P3 = Object.assign({}, TPW); for (let i = 1; i <= 6; i++) P3["p" + i] = SO[i].clone().add(V3(0, mm(1), 0));
  const f = id => ($(id) || { getAttribute: () => "" }).getAttribute("fill");
  return { actualizeaza() {
    PR.rotation.z = -sim.teta * Math.PI / 180;
    const k = JSON.stringify(sim.as) + sim.dec; if (k !== cheie) { cheie = k; reface(); }
    xB.position.x = X1.x + mm(sim.dec ? 44 : 19);
    ["s1", "s2", "s3"].forEach(q => { SW[q].b.rotation.z = sim.f[q] ? -0.45 : 0.45; SW[q].lm.emissiveIntensity = sim.f[q] ? 2.5 : 0; });
    const avarie = sim.run && sim.pr && sim.pr.fault; lm.emissiveIntensity = avarie ? 2.6 : 0; sEPC.material.opacity = avarie ? 0.9 : 0;
    MG.led("ON", sim.run ? 1 : 0); MG.led("L", f("#ledL") === "#ffd04a" ? 1 : 0); MG.led("TX", f("#ledTX") === "#ffd04a" ? 1 : 0);
    DM.mod(sim.dmm.mod); sd[0].muta(P3[sim.dmm.s.dmmR] || null); sd[1].muta(P3[sim.dmm.s.dmmB] || null);
  } };
}
