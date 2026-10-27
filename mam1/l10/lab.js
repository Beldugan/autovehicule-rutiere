/* MAM I – Lucrarea 10. Magistrala CAN: construirea mesajelor, arbitrajul și decodarea semnalelor.
   Simulatorul în stilul Tinkercad: trei noduri (Arduino Mega + MCP2515 + TJA1050) – A „Motor” (0x0C8 la 10 ms), B „Pedală” (0x0B4 la 20 ms),
   C „Monitor” – pe cablul torsadat de 2 m, terminările de 120 Ω (jumperul J1), butonul comun D3, multimetrul (Ω), osciloscopul pe CAN-H /
   CAN-L cu decodarea cadrului; cadrele construite bit cu bit (CRC-15, umplerea de biți), arbitrajul, încărcarea, cadrele de eroare,
   TEC / error passive / bus off. Pașii lucrării sunt afișați la vedere, cu verificări automate. */
"use strict";
const MD = MODELE["mam1-l10"];
const fx = (v, n) => fmt(v, n);
function P() { return Cadru.P; }

/* ------------------------------------------------------------------ starea standului */
const sim = {
  run: false, tS: 0, jA: true, jB: false, jC: true, canl: false, rpm: null, T: null, ped: null, mm: false,
  camp: { BIT: "500", XTAL: "MCP_8MHZ" }, fw: null, bus: null, serial: [], tx: 0, ist: [],
  osc: { ch: [{ s: "H" }, { s: "L" }], tdiv: 0.00005, id: "C8", acq: null }, arbVazut: false, obs: { term: "", canl: "", sim: "" }
};
const TDIV = [0.000002, 0.000005, 0.00001, 0.00002, 0.00005];
let SV3 = null;
function init() { if (sim.rpm === null && P()) { sim.rpm = P().rpm0; sim.T = P().T0; sim.ped = P().ped0; } }
const fbit = () => sim.fw ? sim.fw.fbit : 500000, tbit = () => 1 / fbit();

/* ------------------------------------------------------------------ magistrala (simulare la nivel de cadru) */
function pornesteBus() {
  sim.bus = { free: sim.tS, nodes: { A: { next: sim.tS + 0.0007, pend: null, tec: 0, stare: "error active" }, B: { next: sim.tS + 0.0041, pend: null, tec: 0, stare: "error active" } },
    last: {}, stat: { t0: sim.tS, n: { C8: 0, B4: 0 }, err: 0, bits: 0 }, win: null, tot: { t0: sim.tS, n: { C8: 0, B4: 0 }, err: 0 }, arb: null, ev: [], tPr: sim.tS, rx: {} };
}
function dateMsg(k) { return k === "C8" ? MD.codMotor(sim.rpm, sim.T) : MD.codPedala(sim.ped); }
function defectTx(nod) { return (nod === "B" && sim.canl) || (nod === "A" && sim.fw.xtal !== "MCP_8MHZ"); }
function pasBus() {
  const b = sim.bus; if (!b) return; const tb = tbit();
  for (let g = 0; g < 50; g++) {
    // mesajele periodice devin disponibile
    [["A", "C8"], ["B", "B4"]].forEach(([n, k]) => { const nd = b.nodes[n]; if (nd.stare === "bus off") return; if (!nd.pend && nd.next <= sim.tS) { nd.pend = { k, t: nd.next }; nd.next += MD.MSG[k].per; } });
    const cand = Object.entries(b.nodes).filter(([, nd]) => nd.pend && nd.stare !== "bus off"); if (!cand.length) break;
    const tr = Math.min(...cand.map(([, nd]) => nd.pend.t)), start = Math.max(tr, b.free); if (start > sim.tS) break;
    const cont = cand.filter(([, nd]) => nd.pend.t <= start + 1e-12).sort((x, y) => MD.MSG[x[1].pend.k].id - MD.MSG[y[1].pend.k].id);
    const [nW, w] = cont[0], k = w.pend.k, data = dateMsg(k), fr = MD.cadru(MD.MSG[k].id, data);
    if (cont.length > 1 && b.arbCere) { b.arb = { ordine: cont.map(([, nd]) => "0x" + MD.MSG[nd.pend.k].id.toString(16).toUpperCase().padStart(3, "0")), t: start }; b.arbCere = false; sim.arbVazut = true;
      seriala(`[C] arbitraj la t = ${fx((start - b.tot.t0) * 1000, 3)} ms: ${b.arb.ordine.join(" și ")} pornesc simultan → câștigă ${b.arb.ordine[0]} (ID mai mic); ${b.arb.ordine[1]} se retransmite imediat după`); }
    if (defectTx(nW)) {
      const dur = MD.ERRBITS * tb; b.free = start + dur; w.tec += 8; b.stat.err++; b.tot.err++;
      b.last.err = { t: start, nod: nW, k, data };
      if (w.tec >= 256) { w.stare = "bus off"; w.pend = null; seriala(`[C] cadru de eroare (nodul ${nW}); TEC ${nW} = ${w.tec} → BUS OFF: nodul ${nW} s-a deconectat de la magistrală`); }
      else { const st = w.tec >= 128 ? "error passive" : "error active"; if (st !== w.stare) seriala(`[C] TEC ${nW} = ${w.tec} → nodul ${nW} trece în ${st}`); w.stare = st; }
      continue;
    }
    const dur = (fr.n + MD.IFS) * tb; b.free = start + dur; w.tec = Math.max(0, w.tec - 1); w.pend = null;
    b.last[k] = { t: start, data, fr }; b.stat.n[k]++; b.stat.bits += fr.n + MD.IFS; b.tot.n[k]++; b.rx[k] = { data, t: start };
  }
  if (sim.tS - b.stat.t0 >= 1) { const s = b.stat, S = s.bits * tb / (sim.tS - s.t0) * 100; b.win = { n: { ...s.n }, err: s.err, S, nC8: b.last.C8 ? b.last.C8.fr.n : NaN, nB4: b.last.B4 ? b.last.B4.fr.n : NaN, xtal: sim.fw.xtal, fbit: fbit() };
    seriala(`[C] 1 s: 0x0C8 ${s.n.C8} cadre · 0x0B4 ${s.n.B4} cadre · cadre de eroare ${s.err} · încărcare ${fx(S, 2)} % · TEC A/B ${b.nodes.A.tec}/${b.nodes.B.tec}`);
    b.stat = { t0: sim.tS, n: { C8: 0, B4: 0 }, err: 0, bits: 0 }; }
  if (sim.tS - b.tPr >= 0.25) { b.tPr = sim.tS; const m = b.rx.C8, p = b.rx.B4;
    seriala(`[C] ${m ? `0x0C8 [8] ${MD.hex(m.data)} → n = ${fx(MD.decMotor(m.data).rpm, 2)} rot/min, ϑ = ${MD.decMotor(m.data).T} °C` : "0x0C8 —"} | ${p ? `0x0B4 [8] ${MD.hex(p.data)} → poz = ${fx(MD.decPedala(p.data).p, 1)} %` : "0x0B4 —"}`);
    sim.ist.push({ t: sim.tS, rpm: m ? MD.decMotor(m.data).rpm : null, p: p ? MD.decPedala(p.data).p : null }); if (sim.ist.length > 300) sim.ist.shift(); }
}
function declanseaza() {
  if (!sim.run || !sim.bus) return Cadru.mesajTemporar("Porniți simularea (alimentarea nodurilor).", "atentie");
  const b = sim.bus, t = Math.max(sim.tS, b.free) + 0.0002;
  ["A", "B"].forEach(n => { const nd = b.nodes[n]; if (nd.stare !== "bus off") nd.pend = { k: n === "A" ? "C8" : "B4", t }; });
  b.arbCere = true; sim._d3 = performance.now(); seriala("[A, B] butonul D3 apăsat: ambele noduri încarcă mesajul în bufferul de transmisie în același moment"); actualizeaza();
}
function comanda(txt) {
  const s = String(txt).trim().toLowerCase(); if (!s) return; seriala("> " + s);
  if (!sim.run || !sim.bus) return seriala("(nodurile nu sunt alimentate)");
  if (s === "r") { const b = sim.bus; b.tot = { t0: sim.tS, n: { C8: 0, B4: 0 }, err: 0 }; b.stat = { t0: sim.tS, n: { C8: 0, B4: 0 }, err: 0, bits: 0 }; b.win = null; b.arb = null; seriala("[C] statisticile au fost resetate"); }
  else seriala("comenzi (nodul C): r = resetează statisticile");
}
function seriala(l) { sim.serial.push(l); while (sim.serial.length > 300) sim.serial.shift(); sim.tx = performance.now(); afiseazaSerial(); }
function afiseazaSerial() { const el = $("#tk-serial"); if (!el) return; el.textContent = sim.serial.slice(-120).join("\n"); el.scrollTop = el.scrollHeight; }

/* ------------------------------------------------------------------ osciloscopul (CAN-H / CAN-L cu decodare) */
function nivel(bit, faraTerm, canlPierdut) { const p = P(); return bit ? [p.vR, p.vR] : [p.vH, canlPierdut ? p.vR : p.vL]; }
function achizitie() {
  const o = sim.osc, b = sim.bus; if (!b) { o.acq = null; return; }
  const L = o.id === "ERR" ? b.last.err : b.last[o.id]; if (!L) { o.acq = { pts: [[], []], m: {} }; return; }
  const tb = tbit(), W = o.tdiv * 10, pre = o.tdiv, faraT = !(sim.jA && sim.jC), p = P();
  let bits, stuff, err = o.id === "ERR";
  if (err) { const fr = MD.cadru(MD.MSG[L.k].id, L.data); bits = fr.bits.slice(0, 1).concat(Array(6).fill(0), Array(8).fill(1)); stuff = bits.map(() => 0); }
  else { bits = L.fr.bits; stuff = L.fr.stuff; }
  const N = 800, pts = [[], []], tauR = faraT ? 0.28e-6 : 0.1e-6, canlP = err && L.nod === "B";
  for (let i = 0; i <= N; i++) {
    const t = -pre + W * i / N, k = Math.floor(t / tb);
    let vh, vl;
    if (t < 0 || k >= bits.length) { vh = p.vR; vl = p.vR; }
    else { const [h, l] = nivel(bits[k], faraT, canlP), dt = t - k * tb, prev = k > 0 ? bits[k - 1] : 1;
      if (prev !== bits[k]) { const [h0, l0] = nivel(prev, faraT, canlP), tau = bits[k] ? tauR : 0.04e-6, a = Math.exp(-dt / tau);
        vh = h + (h0 - h) * a; vl = l + (l0 - l) * a;
        if (faraT && !bits[k]) { const r = 0.35 * Math.exp(-dt / 0.15e-6) * Math.cos(2 * Math.PI * dt / 0.12e-6); vh += r; vl -= r; } }
      else { vh = h; vl = l; } }
    pts[0].push([i / N, vh]); pts[1].push([i / N, vl]);
  }
  const m = err ? { err: true, nod: L.nod } : { tbit: tb * 1e6, n: bits.length, tf: bits.length * tb * 1e6, nStuff: stuff.reduce((a, x) => a + x, 0), id: MD.MSG[o.id].id, data: L.data };
  o.acq = { pts, m, bits, stuff, tb, pre, W };
}
function oscAfis() {
  const g = $("#osc-tr"); if (!g) return;
  const o = sim.osc, a = o.acq, X0 = 46, Y0 = 476, W = 404, H = 248, cul = ["#f2d600", "#3ddc84"], y = v => Y0 + H / 2 - (v - 2.5) * (H / 8);
  let s = "";
  if (a && a.pts[0].length) {
    a.pts.forEach((pts, c) => { s += `<polyline fill="none" stroke="${cul[c]}" stroke-width="1.5" points="${pts.map(([u, v]) => `${(X0 + u * W).toFixed(1)},${Math.max(Y0 + 1, Math.min(Y0 + H - 1, y(v))).toFixed(1)}`).join(" ")}"/>`; });
    if (!a.m.err && o.tdiv <= 0.00002) { // banda de decodare cu biții de umplere
      const nV = Math.ceil(a.W / a.tb); for (let k = 0; k < Math.min(a.bits.length, nV); k++) { const x0 = X0 + (k * a.tb + a.pre) / a.W * W, x1 = X0 + ((k + 1) * a.tb + a.pre) / a.W * W; if (x0 > X0 + W) break;
        s += `<rect x="${x0.toFixed(1)}" y="${Y0 + H - 22}" width="${(x1 - x0 - 0.6).toFixed(1)}" height="14" fill="${a.stuff[k] ? "#c62828" : k === 0 ? "#6a1b9a" : k <= 11 ? "#1565c0" : "#2e7d32"}" opacity=".75"/><text x="${((x0 + x1) / 2).toFixed(1)}" y="${Y0 + H - 11}" font-size="8" fill="#fff" text-anchor="middle">${a.bits[k]}</text>`; } }
  } else s += `<text x="${X0 + W / 2}" y="${Y0 + H / 2}" fill="#9aa" font-size="13" text-anchor="middle">${sim.run ? "așteaptă un cadru…" : "nodurile nealimentate"}</text>`;
  g.innerHTML = s;
  const m = a ? a.m : {};
  $("#osc-h").textContent = `CH1 CAN-H 1V  CH2 CAN-L 1V  ${fmtT(o.tdiv)}/div  Trig: ${o.id === "ERR" ? "cadru de eroare" : "CAN ID 0x" + MD.MSG[o.id].id.toString(16).toUpperCase().padStart(3, "0")}`;
  $("#osc-m").textContent = m.err ? `Cadru de eroare (nodul ${m.nod}): 6 biți dominanți + delimitator` : m.n ? `Bit ${fx(m.tbit, 2)} µs · cadru ${fx(m.tf, 1)} µs · ${m.n} biți (${m.nStuff} de umplere) · DATA ${MD.hex(m.data)}` : "";
}
const fmtT = s => s >= 1e-3 ? `${+(s * 1000).toFixed(3)} ms` : `${+(s * 1e6).toFixed(1)} µs`;
function citireR() { if (!sim.mm) return null; if (sim.run) return NaN; const r = MD.rezistenta(P(), sim.jA, sim.jC); return isFinite(r) ? r + (Math.random() - 0.5) * 0.04 : Infinity; }

/* ------------------------------------------------------------------ comenzile standului */
function cereOprit(m) { if (sim.run) { Cadru.mesajTemporar(`NSSM: ${m} numai cu alimentarea nodurilor oprită.`, "pericol"); return false; } return true; }
function comutaJ(n) { if (!cereOprit("Terminările se schimbă")) return; sim["j" + n] = !sim["j" + n]; actualizeaza(); }
function comutaCanl() { if (!cereOprit("Firele magistralei se desfac și se refac")) return; sim.canl = !sim.canl; actualizeaza(); }
function setRpm(v) { sim.rpm = Math.max(0, Math.min(8000, v)); actualizeaza(); }
function setT(v) { sim.T = Math.max(-40, Math.min(150, v)); actualizeaza(); }
function setPed(v) { sim.ped = Math.max(0, Math.min(100, v)); actualizeaza(); }

/* ------------------------------------------------------------------ planșa în stilul Tinkercad */
const NODX = { A: 40, B: 470, C: 900 }, NY = 30, BUSY = 360;
function nodSVG(n, titlu, extra) {
  const x = NODX[n], y = NY;
  return `<g data-k="mega${n}" class="tk-comp" filter="url(#umbra)"><rect x="${x}" y="${y}" width="230" height="160" rx="8" fill="#00878f" stroke="#005a60"/><rect x="${x + 20}" y="${y + 6}" width="180" height="10" rx="1.5" fill="#202020"/>
    <g transform="translate(${x + 120} ${y + 80}) rotate(45)"><rect x="-22" y="-22" width="44" height="44" rx="2" fill="#262626"/></g><text x="${x + 12}" y="${y + 150}" font-size="10" fill="#e8ffff" font-weight="800">MEGA 2560 · nodul ${n}</text>
    <rect id="led${n}10" x="${x + 14}" y="${y + 40}" width="8" height="5" fill="#1a3a1a"/><text x="${x + 26}" y="${y + 45}" font-size="6" fill="#fff">ON</text></g>
    <text x="${x + 115}" y="${y - 4}" font-size="12" text-anchor="middle" fill="#333" font-weight="800">${titlu}</text>
    <g data-k="mcp${n}" class="tk-comp" filter="url(#umbra)"><rect x="${x + 50}" y="${y + 190}" width="130" height="90" rx="5" fill="#1e63d6" stroke="#0d3a8a"/><rect x="${x + 64}" y="${y + 206}" width="34" height="34" rx="2" fill="#111"/><text x="${x + 81}" y="${y + 226}" font-size="6" fill="#bbb" text-anchor="middle">MCP2515</text>
      <rect x="${x + 108}" y="${y + 210}" width="26" height="22" rx="2" fill="#111"/><text x="${x + 121}" y="${y + 224}" font-size="5.5" fill="#bbb" text-anchor="middle">TJA1050</text><rect x="${x + 140}" y="${y + 206}" width="24" height="10" rx="4" fill="#cfd5db" stroke="#888"/><text x="${x + 152}" y="${y + 226}" font-size="6" fill="#fff" text-anchor="middle">8 MHz</text>
      <text x="${x + 115}" y="${y + 272}" font-size="8" fill="#e6ecff" text-anchor="middle">CAN-H  CAN-L</text><rect x="${x + 90}" y="${y + 278}" width="16" height="12" fill="#3ddc84" stroke="#000"/><rect x="${x + 124}" y="${y + 278}" width="16" height="12" fill="#3ddc84" stroke="#000"/></g>
    <g data-k="j${n}" class="tk-comp"><rect x="${x + 64}" y="${y + 250}" width="22" height="12" rx="2" fill="#222"/><rect id="j${n}10" x="${x + 64}" y="${y + 248}" width="22" height="9" rx="2" fill="#ffeb3b" stroke="#000"/><text x="${x + 75}" y="${y + 245}" font-size="7" fill="#fff" text-anchor="middle" font-weight="700">J1</text></g>
    ${[0, 1, 2, 3].map(i => `<line x1="${x + 70 + i * 10}" y1="${y + 160}" x2="${x + 70 + i * 10}" y2="${y + 190}" stroke="${["#ff9800", "#8e24aa", "#00897b", "#795548"][i]}" stroke-width="2"/>`).join("")}${extra || ""}`;
}
function planseSVG() {
  let s = `<svg id="tk-svg" viewBox="0 -14 1300 814" role="img" aria-label="Planșa: nodurile A (Motor), B (Pedală) și C (Monitor) cu MCP2515 și TJA1050, cablul torsadat cu terminările J1, butonul comun D3, multimetrul și osciloscopul pe CAN-H / CAN-L">
<defs><filter id="umbra" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".22"/></filter></defs>
<rect x="-2000" y="-2000" width="5300" height="4800" fill="#fbfbfb"/>`;
  s += nodSVG("A", "A – Motor (0x0C8, 10 ms)", `<g data-k="senzA" class="tk-comp"><rect x="${NODX.A + 160}" y="${NY + 20}" width="62" height="60" rx="6" fill="#eceff1" stroke="#90a4ae"/><text x="${NODX.A + 191}" y="${NY + 36}" font-size="7" text-anchor="middle" fill="#37474f">turație / NTC</text><text id="srcA" x="${NODX.A + 191}" y="${NY + 54}" font-size="9" text-anchor="middle" fill="#c62828" font-weight="700" font-family="ui-monospace,monospace"></text><text id="srcA2" x="${NODX.A + 191}" y="${NY + 70}" font-size="9" text-anchor="middle" fill="#c62828" font-weight="700" font-family="ui-monospace,monospace"></text></g>`);
  s += nodSVG("B", "B – Pedală (0x0B4, 20 ms)", `<g data-k="senzB" class="tk-comp"><rect x="${NODX.B + 160}" y="${NY + 20}" width="62" height="60" rx="6" fill="#eceff1" stroke="#90a4ae"/><circle cx="${NODX.B + 191}" cy="${NY + 46}" r="13" fill="#263238"/><line id="potB" x1="${NODX.B + 191}" y1="${NY + 46}" x2="${NODX.B + 191}" y2="${NY + 35}" stroke="#fff" stroke-width="3"/><text id="srcB" x="${NODX.B + 191}" y="${NY + 74}" font-size="9" text-anchor="middle" fill="#c62828" font-weight="700" font-family="ui-monospace,monospace"></text></g>
    <g data-k="canl" class="tk-comp"><rect x="${NODX.B + 118}" y="${BUSY - 36}" width="90" height="30" fill="transparent"/><circle cx="${NODX.B + 132}" cy="${BUSY - 22}" r="9" fill="#fff" stroke="#c62828" stroke-width="2"/><text x="${NODX.B + 132}" y="${BUSY - 18}" font-size="10" text-anchor="middle">✂</text><text id="canlT" x="${NODX.B + 150}" y="${BUSY - 16}" font-size="9" fill="#c62828" font-weight="700"></text></g>`);
  s += nodSVG("C", "C – Monitor (recepție, decodare)", `<g data-k="oled" class="tk-comp" filter="url(#umbra)"><rect x="${NODX.C + 236}" y="${NY + 10}" width="64" height="0" fill="none"/></g>`);
  /* ---- cablul torsadat (CAN-H galben, CAN-L verde) cu derivațiile */
  let tw = ""; for (let x = 30; x < 1270; x += 12) tw += `<path d="M${x},${BUSY} q3,-6 6,0 t6,0" fill="none" stroke="#f2d600" stroke-width="2.5"/><path d="M${x},${BUSY + 8} q3,6 6,0 t6,0" fill="none" stroke="#3ddc84" stroke-width="2.5"/>`;
  s += `<g data-k="cablu" class="tk-comp">${tw}<text x="650" y="${BUSY + 30}" font-size="10" text-anchor="middle" fill="#555">cablu torsadat 2 m · CAN-H (galben) / CAN-L (verde)</text></g>
    ${["A", "B", "C"].map(n => `<path d="M${NODX[n] + 98},${NY + 290} V${BUSY}" stroke="#f2d600" stroke-width="2.5"/><path id="l${n}10" d="M${NODX[n] + 132},${NY + 290} V${BUSY + 8}" stroke="#3ddc84" stroke-width="2.5"/>`).join("")}`;
  /* ---- butonul comun D3, multimetrul, OLED-ul nodului C */
  s += `<g data-k="d3" class="tk-comp" filter="url(#umbra)"><rect x="790" y="460" width="120" height="80" rx="8" fill="#eceff1" stroke="#90a4ae"/><circle cx="850" cy="492" r="20" fill="#1e88e5" stroke="#0d47a1" stroke-width="3"/><text x="850" y="532" font-size="9" text-anchor="middle" fill="#37474f" font-weight="700">buton D3 (A și B)</text></g>
    <g data-k="dmm" class="tk-comp" filter="url(#umbra)"><rect x="610" y="440" width="160" height="300" rx="16" fill="#f2b705" stroke="#a37a00"/><rect x="624" y="456" width="132" height="54" rx="4" fill="#bfd0b0" stroke="#222"/>
      <text id="dmm10" x="748" y="494" font-size="24" text-anchor="end" fill="#1d2414" font-family="ui-monospace,monospace" font-weight="700">----</text><circle cx="690" cy="580" r="40" fill="#262626"/><line id="dmmK10" x1="690" y1="580" x2="690" y2="546" stroke="#f2b705" stroke-width="5"/>
      <text x="690" y="650" font-size="10" text-anchor="middle" fill="#3b2a00" font-weight="700">MULTIMETRU Ω</text><text x="690" y="668" font-size="9" text-anchor="middle" fill="#3b2a00">CAN-H – CAN-L</text><circle cx="650" cy="712" r="9" fill="#111"/><circle cx="730" cy="712" r="9" fill="#d32f2f"/></g>
    <path id="mmFir" d="M650,712 C620,620 ${NODX.C + 132},${BUSY + 120} ${NODX.C + 132},${BUSY + 10} M730,712 C760,620 ${NODX.C + 98},${BUSY + 100} ${NODX.C + 98},${BUSY}" fill="none" stroke="#d32f2f" stroke-width="2.5" opacity="0" style="pointer-events:none"/>
    <g data-k="oledC" class="tk-comp" filter="url(#umbra)"><rect x="930" y="430" width="300" height="200" rx="6" fill="#16337a" stroke="#0b1d48"/><rect x="940" y="454" width="280" height="166" rx="3" fill="#050608" stroke="#333"/><g id="oled10" font-family="ui-monospace,Consolas,monospace"></g><text x="1080" y="446" font-size="8" fill="#cfd8ff" text-anchor="middle">OLED nodul C · I²C</text></g>`;
  /* ---- osciloscopul */
  s += `<g data-k="osc" class="tk-comp" filter="url(#umbra)"><rect x="20" y="440" width="560" height="350" rx="12" fill="#2c3036"/><rect x="40" y="458" width="416" height="296" rx="4" fill="#050a0e" stroke="#111"/>
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${46 + i * 40.4}" y1="476" x2="${46 + i * 40.4}" y2="724" stroke="#1f3a44" stroke-width="${i === 5 ? 1.2 : .6}"/>`).join("")}${Array.from({ length: 9 }, (_, i) => `<line x1="46" y1="${476 + i * 31}" x2="450" y2="${476 + i * 31}" stroke="#1f3a44" stroke-width="${i === 4 ? 1.2 : .6}"/>`).join("")}
    <g id="osc-tr"></g><text id="osc-h" x="48" y="470" font-size="9.5" fill="#cfe8ff" font-family="ui-monospace,monospace"></text><text id="osc-m" x="48" y="744" font-size="9.5" fill="#7dff8a" font-family="ui-monospace,monospace"></text>
    <text x="520" y="476" font-size="11" text-anchor="middle" fill="#e6ebf0" font-weight="700">OSCILOSCOP</text><text x="520" y="490" font-size="8" text-anchor="middle" fill="#aab">decodare CAN</text>
    ${[0, 1, 2].map(i => `<circle cx="${488 + (i % 2) * 40}" cy="${520 + i * 40}" r="13" fill="#4a4f56" stroke="#111"/>`).join("")}
    <circle cx="490" cy="740" r="10" fill="#f2d600" stroke="#111"/><circle cx="550" cy="740" r="10" fill="#3ddc84" stroke="#111"/><text x="490" y="770" font-size="9" text-anchor="middle" fill="#fff">CH1</text><text x="550" y="770" font-size="9" text-anchor="middle" fill="#fff">CH2</text></g>
    <path d="M490,740 C480,620 ${NODX.A + 98},${BUSY + 150} ${NODX.A + 98},${BUSY + 2} M550,740 C560,620 ${NODX.A + 132},${BUSY + 130} ${NODX.A + 132},${BUSY + 10}" fill="none" stroke="#666" stroke-width="2.5" style="pointer-events:none"/>`;
  s += `<text id="tk-av" x="650" y="410" text-anchor="middle" font-size="12" fill="#c62828" font-weight="700"></text>`;
  return s + `</svg>`;
}
function oledTxt() {
  const b = sim.bus; if (!b) return null; const m = b.rx.C8, p = b.rx.B4, w = b.win;
  return { titlu: "CAN monitor 500k", linii: [m ? `0C8 n=${MD.decMotor(m.data).rpm.toFixed(1)}` : "0C8 --", m ? `    T=${MD.decMotor(m.data).T} C` : "", p ? `0B4 poz=${MD.decPedala(p.data).p.toFixed(1)}%` : "0B4 --", w ? `S=${w.S.toFixed(2)}% err=${w.err}` : "S=--", `TEC A/B ${b.nodes.A.tec}/${b.nodes.B.tec}`] };
}
function planseAfis() {
  if (!$("#tk-svg")) return; init();
  ["A", "B", "C"].forEach(n => { const j = $(`#j${n}10`); j.setAttribute("opacity", sim["j" + n] ? 1 : 0.15); $(`#led${n}10`).setAttribute("fill", sim.run ? "#3cff4a" : "#1a3a1a"); });
  $("#lB10").setAttribute("stroke-dasharray", sim.canl ? "6 10" : "0"); $("#canlT").textContent = sim.canl ? "CAN-L întrerupt" : "";
  $("#srcA").textContent = `${fx(sim.rpm, 0)} rpm`; $("#srcA2").textContent = `${sim.T} °C`; $("#srcB").textContent = `${fx(sim.ped, 1)} %`;
  const pa = (-135 + 270 * sim.ped / 100) * Math.PI / 180; $("#potB").setAttribute("x2", (NODX.B + 191 + 11 * Math.sin(pa)).toFixed(1)); $("#potB").setAttribute("y2", (NY + 46 - 11 * Math.cos(pa)).toFixed(1));
  const r = citireR(); $("#dmm10").textContent = r === null ? "----" : Number.isNaN(r) ? "Err" : !isFinite(r) ? "O.L." : r.toFixed(1); $("#mmFir").setAttribute("opacity", sim.mm ? 0.9 : 0);
  const o = sim.run ? oledTxt() : null; $("#oled10").innerHTML = o ? `<text x="946" y="472" font-size="13" fill="#ffd400">${esc(o.titlu)}</text>` + o.linii.map((l, i) => `<text x="946" y="${496 + i * 24}" font-size="15" fill="#5fd3ff">${esc(l)}</text>`).join("") : "";
  $("#tk-av").textContent = sim.mm && sim.run ? "Ω se măsoară numai cu alimentarea oprită" : !(sim.jA && sim.jC) ? "⚠ terminare lipsă" : sim.canl ? "✂ CAN-L întrerupt la nodul B" : sim.fw && sim.fw.xtal !== "MCP_8MHZ" ? "⚠ cristalul MCP2515 este de 8 MHz" : "";
  oscAfis();
}
const INSP = {
  megaA: () => ["Nodul A – Motor", [["Mesaj", "0x0C8, DLC 8, la 10 ms"], ["Semnale", "turația (octeții 0–1, ×0,25), temperatura (octetul 2, −40)"], ["TEC", sim.bus ? sim.bus.nodes.A.tec + " (" + sim.bus.nodes.A.stare + ")" : "—"]]],
  megaB: () => ["Nodul B – Pedală", [["Mesaj", "0x0B4, DLC 8, la 20 ms"], ["Semnal", "poziția (octetul 0, ×0,4 %)"], ["TEC", sim.bus ? sim.bus.nodes.B.tec + " (" + sim.bus.nodes.B.stare + ")" : "—"]]],
  megaC: () => ["Nodul C – Monitor", [["Rol", "recepționează tot, decodează după DBC, calculează încărcarea"], ["Comenzi", "r = resetează statisticile"]]],
  mcpA: () => INSP.mcp(), mcpB: () => INSP.mcp(), mcpC: () => INSP.mcp(),
  mcp: () => ["MCP2515 + TJA1050", [["SPI", "SI D51, SO D50, SCK D52, CS D53, INT D2"], ["Cristal", "8 MHz (MCP_8MHZ în program)"], ["J1", "terminare 120 Ω pe modul"]]],
  jA: () => ["Jumperul J1 – nodul A", [["Stare", sim.jA ? "pus (120 Ω)" : "scos"]]], jB: () => ["Jumperul J1 – nodul B", [["Stare", sim.jB ? "pus" : "scos (nodul de la mijloc)"]]], jC: () => ["Jumperul J1 – nodul C", [["Stare", sim.jC ? "pus (120 Ω)" : "scos"]]],
  cablu: () => ["Cablul torsadat", [["Lungime", "2 m"], ["Terminări", "120 Ω la capete (A și C)"], ["R CAN-H – CAN-L", "≈ 60 Ω cu ambele terminări"]]],
  d3: () => ["Butonul comun D3", [["Rol", "declanșează transmisia simultană pe A și B (arbitraj)"]]],
  dmm: () => ["Multimetrul", [["Mod", sim.mm ? "Ω între CAN-H și CAN-L" : "oprit (clic = Ω)"]]],
  osc: () => ["Osciloscopul", [["CH1 / CH2", "CAN-H / CAN-L la nodul A"], ["Declanșare", sim.osc.id === "ERR" ? "cadru de eroare" : "ID 0x" + MD.MSG[sim.osc.id].id.toString(16).toUpperCase()]]],
  senzA: () => ["Sursele nodului A", [["Turație", fx(sim.rpm, 0) + " rot/min"], ["Temperatură", sim.T + " °C"]]], senzB: () => ["Pedala (nodul B)", [["Poziție", fx(sim.ped, 1) + " %"]]], canl: () => ["CAN-L la nodul B", [["Stare", sim.canl ? "întrerupt" : "legat"], ["Clic", "desface / reface (alimentarea oprită)"]]], oledC: () => ["OLED nodul C", [["Conținut", "valorile decodate, încărcarea, erorile"]]]
};
function inspector(k) {
  const el = $("#tk-insp"); if (!el) return;
  if (!k || !INSP[k]) { el.hidden = true; return; }
  const [t, r] = INSP[k]();
  el.innerHTML = `<div class="tk-insp-t">${t}<button type="button" aria-label="Închide">✕</button></div>${r.map(([a, b]) => `<div class="tk-insp-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
  el.hidden = false; el.querySelector("button").addEventListener("click", () => { el.hidden = true; });
}
function laClic3d(k) {
  if (k === "jA" || k === "jB" || k === "jC") return comutaJ(k[1]);
  if (k === "canl") return comutaCanl();
  if (k === "d3") return declanseaza();
  if (k === "dmm") { sim.mm = !sim.mm; return actualizeaza(); }
  inspector(k);
}

/* ------------------------------------------------------------------ panourile de sub planșă */
function panou() {
  const el = $("#tk-pompa"); if (!el) return; init();
  el.innerHTML = `<b>Terminări (J1)</b>${["A", "B", "C"].map(n => `<button type="button" data-j="${n}" class="${sim["j" + n] ? "activ" : ""}">nod ${n}: ${sim["j" + n] ? "120 Ω" : "—"}</button>`).join("")}<button type="button" data-canl="1" class="${sim.canl ? "primar" : ""}">✂ CAN-L nod B ${sim.canl ? "întrerupt" : "legat"}</button>
    <button type="button" data-mm="1" class="${sim.mm ? "activ" : ""}">Multimetru Ω ${sim.mm ? "✓" : ""}</button>
    <span class="sep"></span><b>Nod A</b>${[875, 1500, 3000, 6000].map(v => `<button type="button" data-rpm="${v}" class="${sim.rpm === v ? "activ" : ""}">${v} rpm</button>`).join("")}<button type="button" data-t="-5">T −5</button><button type="button" data-t="5">T +5</button>
    <span class="sep"></span><b>Nod B</b>${[0, 20, 50, 100].map(v => `<button type="button" data-ped="${v}" class="${sim.ped === v ? "activ" : ""}">${v} %</button>`).join("")}
    <span class="sep"></span><button type="button" data-d3="1" class="primar">🔘 Buton D3 (transmisie simultană)</button><button type="button" data-r="1">r – resetează statisticile (C)</button>`;
  $$("[data-j]", el).forEach(b => b.addEventListener("click", () => comutaJ(b.dataset.j)));
  $$("[data-canl]", el).forEach(b => b.addEventListener("click", comutaCanl));
  $$("[data-mm]", el).forEach(b => b.addEventListener("click", () => { sim.mm = !sim.mm; actualizeaza(); }));
  $$("[data-rpm]", el).forEach(b => b.addEventListener("click", () => setRpm(+b.dataset.rpm)));
  $$("[data-t]", el).forEach(b => b.addEventListener("click", () => setT(sim.T + +b.dataset.t)));
  $$("[data-ped]", el).forEach(b => b.addEventListener("click", () => setPed(+b.dataset.ped)));
  $$("[data-d3]", el).forEach(b => b.addEventListener("click", declanseaza));
  $$("[data-r]", el).forEach(b => b.addEventListener("click", () => comanda("r")));
}
function oscCtl() {
  const el = $("#tk-osc"); if (!el) return; const o = sim.osc;
  el.innerHTML = `<b>Osciloscop</b><span>CH1 CAN-H · CH2 CAN-L (la nodul A)</span><label>Declanșare <select data-oid="1">${[["C8", "CAN ID 0x0C8"], ["B4", "CAN ID 0x0B4"], ["ERR", "cadru de eroare"]].map(([k, t]) => `<option value="${k}"${o.id === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <button type="button" data-td="-1">T/div −</button><span class="osc-v">${fmtT(o.tdiv)}/div</span><button type="button" data-td="1">T/div +</button><span class="osc-v">1 V/div</span>`;
  $$("[data-oid]", el).forEach(s => s.addEventListener("change", () => { o.id = s.value; achizitie(); actualizeaza(); }));
  $$("[data-td]", el).forEach(b => b.addEventListener("click", () => { const i = TDIV.indexOf(o.tdiv) + +b.dataset.td; o.tdiv = TDIV[Math.max(0, Math.min(TDIV.length - 1, i))]; oscCtl(); achizitie(); oscAfis(); }));
}
function afisaje() {
  const e = $("#afis"); if (!e) return; const b = sim.bus, w = b && b.win;
  e.innerHTML = `<div><span>R CAN-H – CAN-L</span><b>${(() => { const r = citireR(); return r === null ? "—" : Number.isNaN(r) ? "alimentare pornită" : !isFinite(r) ? "O.L." : fx(r, 1) + " Ω"; })()}</b></div>
    <div><span>Ultima secundă (C)</span><b>${w ? `0C8 ${w.n.C8} · 0B4 ${w.n.B4} · err ${w.err} · S ${fx(w.S, 2)} %` : "—"}</b></div>
    <div><span>Nodurile A / B</span><b>${b ? `${b.nodes.A.stare} (TEC ${b.nodes.A.tec}) / ${b.nodes.B.stare} (TEC ${b.nodes.B.tec})` : "—"}</b></div>
    <div><span>Arbitraj</span><b>${b && b.arb ? b.arb.ordine.join(" → ") : "—"}</b></div>`;
}
function sincron3d() { if (!SV3 && Cadru.anim && Cadru.anim.vedere) SV3 = Cadru.anim; }
function actualizeaza() { panou(); afisaje(); planseAfis(); sincron3d(); actualizeazaPasi(); }

/* ------------------------------------------------------------------ plotterul */
function plotter() {
  const cv = $("#tk-plot"); if (!cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const ist = sim.ist, t1 = ist.length ? ist[ist.length - 1].t : 20, t0 = t1 - 20, pts = ist.filter(e => e.t >= t0);
  const L = 40, R = 40, T = 8, B = 20, X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y1 = v => T + (8000 - v) / 8000 * (H - T - B), Y2 = v => T + (100 - v) / 100 * (H - T - B);
  g.font = "10px system-ui"; g.strokeStyle = "#eee";
  for (let i = 0; i <= 4; i++) { const y = T + i * (H - T - B) / 4; g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke(); g.fillStyle = "#1565c0"; g.fillText(String(8000 - i * 2000), 2, y + 3); g.fillStyle = "#2e7d32"; g.fillText(String(100 - i * 25), W - R + 4, y + 3); }
  [["rpm", "#1565c0", Y1], ["p", "#2e7d32", Y2]].forEach(([k, c, Y]) => { g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); let a = false; pts.forEach(p => { if (p[k] === null) { a = false; return; } a ? g.lineTo(X(p.t), Y(p[k])) : g.moveTo(X(p.t), Y(p[k])); a = true; }); g.stroke(); });
  g.fillStyle = "#1565c0"; g.fillText("n decodat [rot/min]", L + 6, T + 9); g.fillStyle = "#2e7d32"; g.fillText("poziția pedalei [%]", L + 130, T + 9);
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
const busOk = () => sim.run && sim.bus && sim.fw.fbit === 500000 && sim.fw.xtal === "MCP_8MHZ";
function inregR(e) {
  if (sim.run) return Cadru.mesajTemporar("NSSM: rezistența se măsoară cu alimentarea nodurilor oprită.", "pericol");
  if (!sim.mm) return Cadru.mesajTemporar("Conectați multimetrul (Ω) între CAN-H și CAN-L.", "atentie");
  if (!sim.jA || !sim.jC || sim.jB) return Cadru.mesajTemporar("Tabelul 10.2: terminările J1 la nodurile A și C (capetele), fără J1 la nodul B.", "atentie");
  const r = +citireR().toFixed(1);
  if (Cadru.inregistreaza(e, { log: { m: "r", r, ta: sim.jA, tc: sim.jC }, celule: [{ t: "t102", r: "R", c: "mas", v: r.toFixed(1) }] })) msg(`Tabelul 10.2: R CAN-H – CAN-L = ${fx(r, 1)} Ω.`);
}
function inregDbc(e) {
  if (!busOk()) return Cadru.mesajTemporar("Porniți simularea cu 500 kbit/s și MCP_8MHZ; toate nodurile pe magistrală.", "atentie");
  const b = sim.bus, m = b.rx.C8, p = b.rx.B4; if (!m || !p || sim.tS - m.t > 0.05 || sim.tS - p.t > 0.05) return Cadru.mesajTemporar("Nodul C trebuie să recepționeze ambele mesaje (0x0C8 și 0x0B4).", "atentie");
  const hm = MD.hex(m.data), hp = MD.hex(p.data), dm = MD.decMotor(m.data);
  if (Math.abs(dm.rpm - sim.rpm) > 0.25 || dm.T !== Math.round(sim.T) || Math.abs(MD.decPedala(p.data).p - sim.ped) > 0.4) return Cadru.mesajTemporar("Așteptați recepția valorilor curente (după schimbare).", "atentie");
  if (Cadru.inregistreaza(e, { log: [{ m: "dbc", k: "rpm", oct: hm, rpm: sim.rpm, T: sim.T }, { m: "dbc", k: "temp", oct: hm, rpm: sim.rpm, T: sim.T }, { m: "dbc", k: "poz", oct: hp, src: sim.ped }],
    celule: [{ t: "t101", r: "rpm", c: "oct", v: hm }, { t: "t101", r: "rpm", c: "src", v: String(sim.rpm) }, { t: "t101", r: "temp", c: "oct", v: hm }, { t: "t101", r: "temp", c: "src", v: String(sim.T) }, { t: "t101", r: "poz", c: "oct", v: hp }, { t: "t101", r: "poz", c: "src", v: fx(sim.ped, 1).replace(",", ".") }] })) {
    msg(`Tabelul 10.1: 0x0C8 = ${hm} (n = ${fx(dm.rpm, 2)} rot/min, ϑ = ${dm.T} °C), 0x0B4 = ${hp} (poz = ${fx(MD.decPedala(p.data).p, 1)} %).`); }
}
function inregOsc(e) {
  if (!busOk()) return Cadru.mesajTemporar("Porniți simularea cu 500 kbit/s și MCP_8MHZ.", "atentie");
  const a = sim.osc.acq; if (!a || !a.m || !a.m.n) return Cadru.mesajTemporar("Osciloscopul declanșat pe un cadru 0x0C8 sau 0x0B4.", "atentie");
  if (sim.osc.tdiv < 0.00005 && sim.osc.id === "C8") return Cadru.mesajTemporar("Pentru durata cadrului întreg alegeți 50 µs/div (cadrul are ≈ 240 µs).", "atentie");
  const m = a.m, oct = MD.hex(m.data), id = m.id, log = { m: "osc", id, oct, n: m.n, tf: +m.tf.toFixed(1), tbit: +m.tbit.toFixed(2) };
  const cel = id === 0xC8 ? [{ t: "t102", r: "tbit", c: "mas", v: m.tbit.toFixed(2) }, { t: "t102", r: "tC8", c: "mas", v: m.tf.toFixed(1) }, { t: "t102", r: "nC8", c: "mas", v: String(m.n) }] : [{ t: "t102", r: "nB4", c: "mas", v: String(m.n) }];
  if (Cadru.inregistreaza(e, { log, celule: cel })) msg(id === 0xC8 ? `Tabelul 10.2: bit ${fx(m.tbit, 2)} µs, cadrul 0x0C8 ${fx(m.tf, 1)} µs, ${m.n} biți (${m.nStuff} de umplere).` : `Tabelul 10.2: cadrul 0x0B4 are ${m.n} biți (${m.nStuff} de umplere).`);
}
function inregLoad(e) {
  if (!busOk()) return Cadru.mesajTemporar("Porniți simularea cu 500 kbit/s și MCP_8MHZ.", "atentie");
  const w = sim.bus.win; if (!w || w.err || !(sim.jA && sim.jC) || sim.canl) return Cadru.mesajTemporar("Așteptați statistica pe 1 s a nodului C, cu magistrala corectă (fără erori).", "atentie");
  const S = +w.S.toFixed(3);
  if (Cadru.inregistreaza(e, { log: { m: "load", S, nC8: w.nC8, nB4: w.nB4 }, celule: [{ t: "t102", r: "S", c: "mas", v: S.toFixed(3) }] })) msg(`Tabelul 10.2: încărcarea măsurată de nodul C = ${fx(S, 3)} %.`);
}
function inregDef(e) {
  if (!busOk()) return Cadru.mesajTemporar("Porniți simularea cu 500 kbit/s și MCP_8MHZ.", "atentie");
  const b = sim.bus, dt = sim.tS - b.tot.t0; if (dt < 1) return Cadru.mesajTemporar("Observați cel puțin 1 s (de la pornire sau de la resetarea statisticilor).", "atentie");
  const faraT = !(sim.jA && sim.jC), k = sim.canl ? "canl" : faraT ? "term" : "sim";
  if (k === "sim" && !b.arb) return Cadru.mesajTemporar("Apăsați butonul D3 (transmisie simultană) și urmăriți ordinea mesajelor.", "atentie");
  if (sim.canl && faraT) return Cadru.mesajTemporar("Câte un singur defect o dată.", "atentie");
  const obs = sim.obs[k]; if (!obs) return Cadru.mesajTemporar("Alegeți observația în comenzile pasului.", "atentie");
  const nC8 = +(b.tot.n.C8 / dt).toFixed(1), nB4 = +(b.tot.n.B4 / dt).toFixed(1), err = b.tot.err;
  if (Cadru.inregistreaza(e, { log: { m: "def", k, nC8, nB4, err, arb: b.arb ? b.arb.ordine.join(",") : "", obs }, celule: [{ t: "t103", r: k, c: "nC8", v: nC8.toFixed(1) }, { t: "t103", r: k, c: "nB4", v: nB4.toFixed(1) }, { t: "t103", r: k, c: "err", v: String(err) }, { t: "t103", r: k, c: "obs", v: obs }] }))
    msg(`Tabelul 10.3 (${{ sim: "transmisie simultană", term: "fără o terminare", canl: "CAN-L întrerupt" }[k]}): 0x0C8 ${fx(nC8, 1)}/s, 0x0B4 ${fx(nB4, 1)}/s, ${err} cadre de eroare.`);
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const nT102 = () => ["tbit", "tC8", "nC8", "nB4", "R", "S"].filter(k => pe("t102", k, "mas")).length, nT103 = () => ["sim", "term", "canl"].filter(k => pe("t103", k, "err")).length;
const selObs = k => `<label class="camp" style="margin:.2rem 0">Observația (${{ sim: "transmisie simultană", term: "fără o terminare", canl: "CAN-L întrerupt" }[k]}) <select data-obs="${k}"><option value=""></option>${MD.OBS.map(o => `<option${sim.obs[k] === o ? " selected" : ""}>${o}</option>`).join("")}</select></label>`;
const PASI = [
  { t: "Magistrala și terminările", tab: "R ≈ 60 Ω", v3: "tot",
    banda: "Pasul 1 · Cu alimentarea oprită: nodurile A și C la capete cu J1 (120 Ω), nodul B la mijloc fără J1; rezistența CAN-H – CAN-L ≈ 60 Ω. Magistrala standului nu se leagă la vehicule.",
    instr: ["Verificați pe planșă: J1 pus la nodurile <b>A</b> și <b>C</b>, scos la <b>B</b>; CAN-H (galben) și CAN-L (verde) legate la toate nodurile.",
      "Cu simularea oprită (nodurile nealimentate) apăsați <b>Multimetru Ω</b> – sondele pe CAN-H și CAN-L.",
      "Citiți ≈ 60 Ω (două rezistențe de 120 Ω în paralel) și apăsați <b>„● R → Tabelul 10.2”</b>.",
      "Scoateți J1 la nodul C: multimetrul arată ≈ 120 Ω; puneți-l la loc. Opriți multimetrul."],
    ctl: () => "",
    ver: () => [[!sim.run, "alimentarea oprită"], [sim.jA && sim.jC && !sim.jB, "J1 la A și C, fără J1 la B"], [sim.mm, "multimetrul pe Ω"], [pe("t102", "R", "mas"), "R înregistrat"]],
    prog: () => pe("t102", "R", "mas") ? 1 : 0, tot: 1, butoane: [["● R → Tabelul 10.2", inregR, "primar"]] },
  { t: "Baza de date și decodarea", tab: "Tabelul 10.1", v3: "tot",
    banda: "Pasul 2 · Nodul A trimite 0x0C8 la 10 ms (turația ×0,25 în octeții 0–1, temperatura +40 în octetul 2), nodul B trimite 0x0B4 la 20 ms (poziția ×0,4 % în octetul 0); nodul C recepționează și decodează.",
    instr: ["Opriți multimetrul și apăsați <b>▶ Pornește simularea</b> (alimentarea nodurilor; programul cu CAN_500KBPS și MCP_8MHZ).",
      "Pe nodul A alegeți turația <b>875</b> rot/min (și eventual temperatura), pe nodul B pedala (de ex. <b>20 %</b>).",
      "Pe monitorul serial și pe OLED-ul nodului C apar octeții recepționați și valorile decodate cu (10.1) și (10.2).",
      "Apăsați <b>„● Octeții și valorile → Tabelul 10.1”</b>; verificați decodarea în tabel (x brut, valoarea fizică) față de valoarea de la sursă."],
    ctl: () => `<div class="rand-mic"><button type="button" data-rpm2="875">875 rot/min</button><button type="button" data-ped2="20">pedala 20 %</button></div>`,
    ver: () => [[busOk(), "nodurile alimentate, 500 kbit/s"], [!!(sim.bus && sim.bus.rx.C8 && sim.bus.rx.B4), "ambele mesaje recepționate de C"], [pe("t101", "rpm", "oct") && pe("t101", "poz", "oct"), "Tabelul 10.1 completat"]],
    prog: () => pe("t101", "rpm", "oct") && pe("t101", "poz", "oct") ? 1 : 0, tot: 1, butoane: [["● Octeții și valorile → Tabelul 10.1", inregDbc, "primar"]] },
  { t: "Bitul și cadrul pe osciloscop", tab: "Tabelul 10.2", v3: "osc",
    banda: "Pasul 3 · CH1 CAN-H, CH2 CAN-L; declanșare pe ID 0x0C8: durata unui bit (2 µs la 500 kbit/s), durata cadrului și numărul de biți, inclusiv biții de umplere (după 5 biți identici).",
    instr: ["Declanșarea osciloscopului pe <b>CAN ID 0x0C8</b>; T/div = <b>5 µs</b>: se văd biții (banda de decodare: SOF violet, ID albastru, restul verde, biții de umplere roșii).",
      "Treceți la <b>50 µs/div</b>: cadrul întreg; apăsați <b>„● Bitul și cadrul → Tabelul 10.2”</b>.",
      "Comutați declanșarea pe <b>0x0B4</b> și apăsați din nou (numărul de biți ai cadrului 0x0B4).",
      "Comparați cu valorile calculate în tabel: 108 biți fără umplere + biții de umplere (depind de date)."],
    ctl: () => `<div class="rand-mic"><button type="button" data-oid2="C8">Trig 0x0C8</button><button type="button" data-oid2="B4">Trig 0x0B4</button><button type="button" data-tdv="0.000005">5 µs/div</button><button type="button" data-tdv="0.00005">50 µs/div</button></div>`,
    ver: () => { const m = sim.osc.acq && sim.osc.acq.m; return [[busOk(), "nodurile alimentate"], [!!(m && m.n), m && m.n ? `cadru 0x${m.id.toString(16).toUpperCase()}: ${m.n} biți, ${fx(m.tf, 1)} µs` : "cadrul afișat"], [pe("t102", "nC8", "mas"), "0x0C8 înregistrat"], [pe("t102", "nB4", "mas"), "0x0B4 înregistrat"]]; },
    prog: () => ["tbit", "tC8", "nC8", "nB4"].filter(k => pe("t102", k, "mas")).length, tot: 4, butoane: [["● Bitul și cadrul → Tabelul 10.2", inregOsc, "primar"]] },
  { t: "Încărcarea magistralei", tab: "Tabelul 10.2", v3: "tot",
    banda: "Pasul 4 · Nodul C măsoară timpul ocupat de cadre într-o secundă; calculul (10.4) folosește biții cadrelor (+ 3 biți de pauză) și frecvența lor.",
    instr: ["Magistrala corectă (fără defecte); așteptați linia „1 s: …” a nodului C pe monitorul serial.",
      "Apăsați <b>„● Încărcarea → Tabelul 10.2”</b>; comparați cu valoarea calculată din biții măsurați la pasul 3.",
      "Calculați încărcarea unei rețele de motor tipice (Întrebarea 4): 20 de mesaje de 125 de biți la 10 ms."],
    ctl: () => "",
    ver: () => [[!!(sim.bus && sim.bus.win), sim.bus && sim.bus.win ? `S = ${fx(sim.bus.win.S, 2)} %` : "statistica pe 1 s"], [pe("t102", "S", "mas"), "încărcarea înregistrată"]],
    prog: () => pe("t102", "S", "mas") ? 1 : 0, tot: 1, butoane: [["● Încărcarea → Tabelul 10.2", inregLoad, "primar"]] },
  { t: "Arbitrajul", tab: "Tabelul 10.3", v3: "tot",
    banda: "Pasul 5 · Butonul D3 declanșează transmisia simultană pe nodurile A și B: bit cu bit, dominantul (0) acoperă recesivul (1); câștigă ID-ul mai mic, iar celălalt se retransmite imediat după.",
    instr: ["Apăsați <b>r</b> (resetează statisticile nodului C), apoi <b>🔘 Buton D3</b>.",
      "Pe monitorul serial urmăriți ordinea: 0x0B4 (0000 1011 0100) câștigă față de 0x0C8 (0000 1100 1000) la al 5-lea bit al ID-ului.",
      "După cel puțin 1 s alegeți observația și apăsați <b>„● Situația → Tabelul 10.3”</b>."],
    ctl: () => `<div class="rand-mic"><button type="button" data-r2="1">r – reset statistici</button><button type="button" data-d32="1" class="primar">🔘 Buton D3</button></div>${selObs("sim")}`,
    ver: () => [[!!(sim.bus && sim.bus.arb), sim.bus && sim.bus.arb ? `ordinea: ${sim.bus.arb.ordine.join(" → ")}` : "transmisia simultană"], [pe("t103", "sim", "err"), "rândul înregistrat"]],
    prog: () => pe("t103", "sim", "err") ? 1 : 0, tot: 1, butoane: [["● Situația → Tabelul 10.3", inregDef, "primar"]] },
  { t: "Defectele magistralei", tab: "Tabelul 10.3", v3: "osc",
    banda: "Pasul 6 · Fără terminarea de la nodul C: reflexii pe fronturi, dar comunicația continuă. CAN-L întrerupt la nodul B: transmisiile lui B eșuează – cadre de eroare, TEC +8 la fiecare, error passive la 128, bus off la 256.",
    instr: ["Opriți simularea, scoateți <b>J1 la nodul C</b>, porniți; osciloscop pe 0x0C8, 5 µs/div: fronturile au oscilații și revin mai lent. După 1 s alegeți observația și apăsați <b>„● Situația → Tabelul 10.3”</b>.",
      "Opriți simularea, puneți J1 la loc și apăsați <b>✂ CAN-L nod B</b> (întrerupt); porniți simularea.",
      "Urmăriți pe monitorul serial cadrele de eroare și TEC-ul nodului B (error passive, apoi bus off); osciloscopul cu declanșare pe „cadru de eroare”.",
      "După 1 s alegeți observația și înregistrați. La final opriți simularea și refaceți CAN-L."],
    ctl: () => `${selObs("term")}${selObs("canl")}<div class="rand-mic"><button type="button" data-oid2="ERR">Trig cadru de eroare</button><button type="button" data-oid2="C8">Trig 0x0C8</button></div>`,
    ver: () => [[!(sim.jA && sim.jC) || sim.canl, !(sim.jA && sim.jC) ? "terminare lipsă" : sim.canl ? "CAN-L întrerupt la B" : "un defect aplicat"], [pe("t103", "term", "err"), "fără o terminare – înregistrat"], [pe("t103", "canl", "err"), "CAN-L întrerupt – înregistrat"]],
    prog: () => ["term", "canl"].filter(k => pe("t103", k, "err")).length, tot: 2, butoane: [["● Situația → Tabelul 10.3", inregDef, "primar"]] }
];
let pasActiv = 0;
/* indiciile pas cu pas: ce se conectează / se apasă, în ordine (comun/ghid-pasi.js → ghidIndicii) */
const giK = k => `#tk-svg [data-k="${k}"]`, giA = s => ".pas.activ " + s, giR = (j = 0) => `.pas.activ [data-inreg][data-j="${j}"]`, giS = "#tk-start", giPm = s => "#tk-pompa " + s, giO = s => "#tk-osc " + s;
const giJ = (n, pus) => [[giK("j" + n), giPm(`[data-j="${n}"]`)], `${pus ? "Puneți" : "Scoateți"} <b>J1 la nodul ${n}</b>${sim.run ? " (cu simularea oprită)" : ""}`, sim["j" + n] === pus];
const giStop = txt => [giS, `Opriți simularea (■)${txt ? " – " + txt : ""}`, !sim.run];
const giCfgBus = () => [["#tk-cod [data-cf=\"BIT\"]", "În cod: <b>CAN_500KBPS</b> și <b>MCP_8MHZ</b>", sim.run ? busOk() : String(sim.camp.BIT) === "500" && sim.camp.XTAL === "MCP_8MHZ"]];
const giStart = () => [giS, "Apăsați <b>▶ Pornește simularea</b> (alimentarea nodurilor)", busOk()];
const giMag = () => [...(sim.canl ? [[[giK("canl"), giPm("[data-canl]")], "Refaceți <b>CAN-L</b> la nodul B", false]] : []), ...["A", "C"].filter(n => !sim["j" + n]).map(n => giJ(n, true)), ...(sim.jB ? [giJ("B", false)] : [])];
const giMagCuStop = () => { const m = giMag(); return m.length && sim.run ? [giStop("pentru a reface magistrala"), ...m] : m; };
const giAstept1s = () => ["#tk-serial", "Așteptați cel puțin 1 s (linia „1 s: …” a nodului C)", !!(sim.bus && sim.tS - sim.bus.tot.t0 >= 1)];
const giObs = k => [giA(`[data-obs="${k}"]`), "Alegeți <b>observația</b> în comenzile pasului", !!sim.obs[k]];
PASI[0].ind = () => {
  if (!pe("t102", "R", "mas")) return [giStop("rezistența se măsoară fără alimentare"), ...giMag(), [[giPm("[data-mm]"), giK("dmm")], "Apăsați <b>Multimetru Ω</b> (sondele pe CAN-H și CAN-L)", sim.mm],
    [giR(0), "Apăsați <b>„● R → Tabelul 10.2”</b> (multimetrul arată ≈ 60 Ω)", false]];
  if (!sim.jC && sim.mm && !sim.run) sim.giJc = true;
  return [[[giK("jC"), giPm('[data-j="C"]')], "Scoateți <b>J1 la nodul C</b>: multimetrul arată ≈ 120 Ω (o singură terminare)", !!sim.giJc],
    [[giK("jC"), giPm('[data-j="C"]')], "Puneți la loc <b>J1 la nodul C</b>", !!sim.giJc && sim.jC],
    [[giPm("[data-mm]"), giK("dmm")], "Opriți multimetrul (Multimetru Ω)", !!sim.giJc && !sim.mm]];
};
PASI[1].ind = () => { const rx = sim.bus && sim.bus.rx;
  return [...giMagCuStop(), [[giPm("[data-mm]"), giK("dmm")], "Opriți multimetrul", !sim.mm || sim.run], ...giCfgBus(), giStart(),
    [[giA('[data-rpm2="875"]'), giPm('[data-rpm="875"]')], "Nodul A: turația <b>875</b> rot/min", sim.rpm === 875 || pe("t101", "rpm", "oct")],
    [[giA('[data-ped2="20"]'), giPm('[data-ped="20"]')], "Nodul B: pedala <b>20 %</b>", sim.ped === 20 || pe("t101", "poz", "oct")],
    ["#tk-serial", "Urmăriți octeții recepționați pe monitorul serial și pe OLED-ul nodului C", !!(rx && rx.C8 && rx.B4)],
    [giR(0), "Apăsați <b>„● Octeții și valorile → Tabelul 10.1”</b>", pe("t101", "rpm", "oct") && pe("t101", "poz", "oct")]]; };
PASI[2].ind = () => {
  const m = sim.osc.acq && sim.osc.acq.m, o = [...giMagCuStop(), ...giCfgBus(), giStart()];
  const trig = id => [[giA(`[data-oid2="${id}"]`), giO("[data-oid]")], `Declanșarea pe <b>CAN ID 0x0${id}</b>`, sim.osc.id === id];
  if (!pe("t102", "nC8", "mas")) return [...o, trig("C8"), [giA('[data-tdv="0.000005"]'), "<b>5 µs/div</b>: priviți biții (SOF, ID, umplere)", sim.osc.tdiv >= 0.00005 || sim.osc.tdiv === 0.000005],
    [giA('[data-tdv="0.00005"]'), "<b>50 µs/div</b>: cadrul întreg", sim.osc.tdiv >= 0.00005 && !!(m && m.n)], [giR(0), "Apăsați <b>„● Bitul și cadrul → Tabelul 10.2”</b> (0x0C8)", false]];
  if (!pe("t102", "nB4", "mas")) return [...o, trig("B4"), ["#tk-svg", "Așteptați cadrul 0x0B4 pe ecran", !!(m && m.n && m.id === 0xB4)], [giR(0), "Apăsați <b>„● Bitul și cadrul → Tabelul 10.2”</b> (0x0B4)", false]];
  return o;
};
PASI[3].ind = () => { const w = sim.bus && sim.bus.win;
  return [...giMagCuStop(), ...giCfgBus(), giStart(), ["#tk-serial", "Așteptați linia „1 s: …” a nodului C (fără erori)", !!(w && !w.err)], [giR(0), "Apăsați <b>„● Încărcarea → Tabelul 10.2”</b>", pe("t102", "S", "mas")]]; };
PASI[4].ind = () => { const b = sim.bus;
  return [...giMagCuStop(), ...giCfgBus(), giStart(), [[giA("[data-r2]"), giPm("[data-r]")], "Apăsați <b>r</b> (resetează statisticile nodului C)", !!(b && (b.arb || b.arbCere || sim.serial.slice(-60).some(l => /statisticile au fost resetate/.test(l)))) || pe("t103", "sim", "err")],
    [[giA("[data-d32]"), giPm("[data-d3]"), giK("d3")], "Apăsați <b>🔘 Buton D3</b> (transmisie simultană)", !!(b && b.arb) || pe("t103", "sim", "err")],
    giAstept1s(), giObs("sim"), [giR(0), "Apăsați <b>„● Situația → Tabelul 10.3”</b>", pe("t103", "sim", "err")]]; };
PASI[5].ind = () => {
  if (!pe("t103", "term", "err")) { const ok = !sim.jC && sim.jA && !sim.canl;
    return [...(ok ? [] : [giStop("terminările se schimbă numai fără alimentare"), ...(sim.canl ? [[[giK("canl"), giPm("[data-canl]")], "Refaceți <b>CAN-L</b>", false]] : []), ...(sim.jA ? [] : [giJ("A", true)]), giJ("C", false)]),
      ...giCfgBus(), giStart(), [[giA('[data-oid2="C8"]'), giO("[data-oid]")], "Osciloscop: declanșare pe <b>0x0C8</b>, 5 µs/div – priviți fronturile", sim.osc.id === "C8"],
      giAstept1s(), giObs("term"), [giR(0), "Apăsați <b>„● Situația → Tabelul 10.3”</b> (fără o terminare)", false]]; }
  if (!pe("t103", "canl", "err")) { const ok = sim.jA && sim.jC && sim.canl;
    return [...(ok ? [] : [giStop("firele se desfac numai fără alimentare"), ...(sim.jC ? [] : [giJ("C", true)]), [[giK("canl"), giPm("[data-canl]")], "Apăsați <b>✂ CAN-L nod B</b> (întrerupt)", sim.canl]]),
      ...giCfgBus(), giStart(), [[giA('[data-oid2="ERR"]'), giO("[data-oid]")], "Osciloscop: declanșare pe <b>cadru de eroare</b>; urmăriți TEC-ul nodului B pe monitorul serial", sim.osc.id === "ERR"],
      giAstept1s(), giObs("canl"), [giR(0), "Apăsați <b>„● Situația → Tabelul 10.3”</b> (CAN-L întrerupt)", false]]; }
  return [giStop("la final"), ...giMag()];
};

const VEDERI = { tot: [[0.0, 0.62, 0.86], [0.0, 0.05, -0.02]], osc: [[-0.15, 0.3, 0.45], [-0.15, 0.1, -0.2]] };
function vedere3d(v) { if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small style="font-weight:400;color:var(--text-sec)">${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol>${p.ctl && p.ctl() ? `<div class="pas-ctl">${p.ctl()}</div>` : ""}<ul class="pas-ver"></ul>
    <div class="pas-but"><button type="button" class="secundar" data-vezi="${i}">🔍 Arată în montajul 3D</button>${p.butoane.map(([t, , c], j) => `<button type="button" class="${c} lat" data-inreg="${i}" data-j="${j}">${t}</button>`).join("")}</div></div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas, true)));
  $$("#pasi [data-vezi]").forEach(b => b.addEventListener("click", () => { Cadru.arataTab("anim"); setTimeout(() => vedere3d(PASI[+b.dataset.vezi].v3), 600); }));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].butoane[+b.dataset.j][1](e); actualizeazaPasi(); }));
  $$("#pasi [data-rpm2]").forEach(b => b.addEventListener("click", () => setRpm(+b.dataset.rpm2)));
  $$("#pasi [data-ped2]").forEach(b => b.addEventListener("click", () => setPed(+b.dataset.ped2)));
  $$("#pasi [data-oid2]").forEach(b => b.addEventListener("click", () => { sim.osc.id = b.dataset.oid2; oscCtl(); achizitie(); actualizeaza(); }));
  $$("#pasi [data-tdv]").forEach(b => b.addEventListener("click", () => { sim.osc.tdiv = +b.dataset.tdv; oscCtl(); achizitie(); oscAfis(); }));
  $$("#pasi [data-r2]").forEach(b => b.addEventListener("click", () => comanda("r")));
  $$("#pasi [data-d32]").forEach(b => b.addEventListener("click", declanseaza));
  $$("#pasi [data-obs]").forEach(s => s.addEventListener("change", () => { sim.obs[s.dataset.obs] = s.value; }));
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
const PROG = { titlu: "can_motor" };
const C_ = s => `<span class="cd-c">${s}</span>`, K_ = s => `<span class="cd-k">${s}</span>`, S_ = s => `<span class="cd-s">${s}</span>`, N_ = s => `<span class="cd-n">${s}</span>`;
const sel = (k, opts) => `<select class="cd-f" data-cf="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(sim.camp[k]) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`;
function cod() {
  return `${K_("#include")} ${S_("&lt;mcp_can.h&gt;")}                     ${C_("// biblioteca mcp_can (Cory Fowler)")}
MCP_CAN CAN0(${N_("53")});                               ${C_("// CS pe pinul 53 (Mega), INT pe D2")}
${C_("// nodul A „Motor”: 0x0C8 la 10 ms (nodul B: 0x0B4 la 20 ms; nodul C: recepție)")}
${K_("void")} setup() {
  CAN0.begin(MCP_ANY, ${sel("BIT", [["500", "CAN_500KBPS"], ["250", "CAN_250KBPS"], ["125", "CAN_125KBPS"]])}, ${sel("XTAL", [["MCP_8MHZ", "MCP_8MHZ"], ["MCP_16MHZ", "MCP_16MHZ"]])});  ${C_("// cristalul modulului: 8 MHz")}
  CAN0.setMode(MCP_NORMAL);
  attachInterrupt(digitalPinToInterrupt(${N_("3")}), simultan, FALLING);   ${C_("// butonul comun D3")}
}
${K_("void")} loop() {
  ${K_("uint16_t")} raw = rpm / ${N_("0.25")};                      ${C_("// factor 0,25 rot/min/bit (10.1)")}
  ${K_("byte")} d[${N_("8")}] = { lowByte(raw), highByte(raw), (${K_("byte")})(tempMotor + ${N_("40")}), ${N_("0")},${N_("0")},${N_("0")},${N_("0")},${N_("0")} };
  CAN0.sendMsgBuf(${N_("0x0C8")}, ${N_("0")}, ${N_("8")}, d);                ${C_("// ID standard, DLC 8")}
  delay(${N_("10")});
}`;
}
function afiseazaCod() {
  $("#tk-cod").innerHTML = cod().split("\n").map((l, i) => `<span class="cd-ln">${i + 1}</span>${l}`).join("\n");
  $$("#tk-cod [data-cf]").forEach(el => { el.disabled = sim.run; el.addEventListener("change", () => { sim.camp[el.dataset.cf] = el.value; }); });
  $("#tk-blocat").hidden = !sim.run;
}
function pornesteSim() {
  if (sim.run) { opresteSim(); return; }
  if (sim.mm) { sim.mm = false; Cadru.mesajTemporar("Multimetrul (Ω) a fost deconectat înainte de alimentare.", ""); }
  sim.fw = { fbit: Number(sim.camp.BIT) * 1000, xtal: sim.camp.XTAL }; sim.run = true; pornesteBus();
  seriala(`[A, B, C] can_motor / can_pedala / can_monitor | ${sim.camp.BIT} kbit/s | ${sim.fw.xtal} | terminări: ${["A", "B", "C"].filter(n => sim["j" + n]).join(", ") || "—"}${sim.canl ? " | CAN-L întrerupt la B" : ""}`);
  if (sim.fw.xtal !== "MCP_8MHZ") seriala("(modulele au cristal de 8 MHz: cu MCP_16MHZ nodul A transmite la jumătate din rata de biți)");
  $("#tk-start").textContent = "■ Oprește simularea"; $("#tk-start").classList.add("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function opresteSim() {
  sim.run = false; sim.fw = null; sim.bus = null;
  $("#tk-start").textContent = "▶ Pornește simularea"; $("#tk-start").classList.remove("ruleaza");
  afiseazaCod(); actualizeazaFw(); actualizeaza();
}
function actualizeazaFw() { if ($("#fw-mega")) $("#fw-mega").textContent = sim.fw ? `${PROG.titlu} / can_pedala / can_monitor (${sim.fw.fbit / 1000} kbit/s, ${sim.fw.xtal})` : "—"; }

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaMAM10(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date || {}, { num }), F = Number.isFinite, cel = { t101: {}, t102: {} };
  cel.t101.rpm = { brut: F(o.brutRpm) ? String(o.brutRpm) : "", fiz: F(o.rpm) ? fx(o.rpm, 2) + " rot/min" : "" };
  cel.t101.temp = { brut: F(o.brutT) ? String(o.brutT) : "", fiz: F(o.T) ? o.T + " °C" : "" };
  cel.t101.poz = { brut: F(o.brutP) ? String(o.brutP) : "", fiz: F(o.p) ? fx(o.p, 1) + " %" : "" };
  const nC8m = num(t.t102.nC8.mas);
  cel.t102 = { tbit: { calc: fx(o.tbit, 2) }, tC8: { calc: F(o.nC8c) ? fx(o.nC8c * o.tbit, 1) : "" }, nC8: { calc: F(o.nC8c) ? String(o.nC8c) : "" }, nB4: { calc: F(o.nB4c) ? String(o.nB4c) : "" },
    R: { calc: fx(60, 1) }, S: { calc: F(o.S) ? fx(o.S, 3) : "" } };
  const rez = [
    ["Turația decodată (10.1), (10.2)", F(o.rpm) ? `${fx(o.rpm, 2)} rot/min (x brut = ${o.brutRpm})` : "—"],
    ["Temperatura / poziția pedalei", `${F(o.T) ? o.T + " °C" : "—"} / ${F(o.p) ? fx(o.p, 1) + " %" : "—"}`],
    ["Biți pe cadrul 0x0C8: măsurat / calculat", `${F(nC8m) ? nC8m : "—"} / ${F(o.nC8c) ? o.nC8c : "—"}`],
    ["Încărcarea (10.4) din biții măsurați", F(o.S) ? `<span style="color:var(--accent)">${fx(o.S, 3)} %</span>` : "—"],
    ["Rețea de motor tipică (20 × 125 biți la 10 ms)", fx(MD.incarcareTipica(20, 125, 0.01, MD.FBIT), 1) + " %"]
  ];
  const verdicte = [];
  if (F(nC8m) && F(o.nC8c)) verdicte.push(nC8m === o.nC8c ? { tip: "ok", text: `Numărul de biți măsurat (${nC8m}) coincide cu cel calculat: 108 biți ai cadrului de 8 octeți + ${nC8m - 108} biți de umplere, care depind de valorile transmise.` } : { tip: "atentie", text: "Numărul de biți diferă de cel calculat din octeții din Tabelul 10.1: valorile s-au schimbat între cele două înregistrări (umplerea depinde de date)." });
  if (F(o.S)) verdicte.push({ tip: "ok", text: `Cele două mesaje ocupă magistrala ${fx(o.S, 2)} % din timp; o rețea de motor reală, cu zeci de mesaje la 10 ms, ajunge la 30…50 %, motiv pentru care se trece la CAN FD.` });
  const r = t.t103.canl; if (r.err !== "") verdicte.push({ tip: "ok", text: `Cu CAN-L întrerupt, nodul B a produs ${r.err} cadre de eroare (TEC +8 la fiecare: 128 → error passive, 256 → bus off), după care s-a deconectat singur; nodul A a comunicat în continuare.` });
  const dm = MD.parseHex(t.t101.rpm.oct), pts = [], st = [];
  if (dm.length === 8) { const fr = MD.cadru(0xC8, dm); fr.bits.forEach((b, k) => { pts.push([k, b], [k + 1, b]); if (fr.stuff[k]) st.push([k + 0.5, 1.15]); }); }
  return { celule: cel, rezultate: rez, verdicte, titluGrafic: "Cadrul 0x0C8 reconstruit din octeții din Tabelul 10.1 (1 = recesiv, 0 = dominant; punctele marchează biții de umplere)",
    grafic: pts.length ? { xmin: 0, xmax: pts[pts.length - 1][0], ymin: -0.2, ymax: 1.4, xlab: "bitul (t / tbit)", ylab: "nivel logic", serii: [{ tip: "linie", pts, culoare: 0 }, { tip: "pct", pts: st, culoare: 1, r: 3 }] } : null,
    legenda: [["CAN-H − CAN-L (logic)", "var(--serie-0)"], ["bit de umplere", "var(--serie-1)", "pct"]], principal: { eticheta: "încărcarea magistralei [%]", valoare: F(o.S) ? +o.S.toFixed(3) : null } };
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Nodurile CAN se leagă și se deconectează numai cu alimentarea oprită; nu se leagă magistrala standului la vehicule reale (priza OBD).</li>
<li>Rezistențele de terminare de 120 Ω se montează la capetele magistralei; măsurarea rezistenței se face cu alimentarea oprită.</li>
<li>Masa osciloscopului se leagă la masa comună a nodurilor.</li></ul></div>
<h2>10.1. Scopul lucrării</h2>
<p>Realizarea unei rețele CAN cu două sau trei noduri (microcontroler + controler MCP2515 + transceiver), definirea mesajelor și a semnalelor într-o bază de date (DBC), transmiterea și decodarea valorilor fizice, observarea arbitrajului, a cadrelor de eroare și calculul încărcării magistralei. Verificarea fizică a magistralei pe vehicul face obiectul disciplinei Diagnosticarea autovehiculelor (lucrarea 1).</p>
<h2>10.2. Noțiuni teoretice</h2>
<p>CAN este o magistrală serială cu acces multiplu: toate nodurile citesc toate mesajele, iar fiecare mesaj are un identificator care stabilește conținutul și prioritatea. Un cadru standard conține câmpul de start, identificatorul de 11 biți, câmpurile de control, până la 8 octeți de date, suma de control CRC, confirmarea și sfârșitul de cadru (Fig. 10.1).</p>
<p>Dacă două noduri încep să transmită simultan, fiecare citește magistrala bit cu bit: bitul dominant (0) acoperă bitul recesiv (1). Nodul care transmite 1 și citește 0 pierde arbitrajul și se oprește fără ca mesajul câștigător să fie deteriorat; câștigă identificatorul cu valoarea cea mai mică.</p>
<figure>${fig101()}<figcaption>Fig. 10.1. Structura cadrului CAN și arbitrajul între două noduri (0x0B4 și 0x0C8)</figcaption></figure>
<p>Semnalele (turație, temperatură, viteză) sunt împachetate în octeții de date; baza de date DBC definește poziția, lungimea, factorul și decalajul fiecăruia. Încărcarea magistralei se calculează din lungimea cadrelor N<sub>k</sub> (≈ 111…130 de biți pentru 8 octeți) și frecvența lor f<sub>k</sub>:</p>
<div class="ec"><span>x<sub>fiz</sub> = x<sub>brut</sub> · factor + offset</span><span class="nr">(10.1)</span></div>
<div class="ec"><span>x<sub>brut</sub> = B<sub>1</sub> · 256 + B<sub>0</sub></span><span class="nr">(10.2)</span></div>
<div class="ec"><span>t<sub>bit</sub> = 1 / f<sub>bit</sub></span><span class="nr">(10.3)</span></div>
<div class="ec"><span>S = Σ<sub>k</sub> N<sub>k</sub> · f<sub>k</sub> / f<sub>bit</sub> · 100 &nbsp; [%]</span><span class="nr">(10.4)</span></div>
<pre class="cod">#include &lt;mcp_can.h&gt;
MCP_CAN CAN0(53);                                   // CS pe pinul 53 (Mega)
void setup() { CAN0.begin(MCP_ANY, CAN_500KBPS, MCP_8MHZ); CAN0.setMode(MCP_NORMAL); }
void loop() {                                       // nodul „motor”: ID 0x0C8 la 10 ms
  uint16_t raw = rpm / 0.25;                        // factor 0,25 rot/min/bit
  byte d[8] = { lowByte(raw), highByte(raw), (byte)(tempMotor + 40), 0,0,0,0,0 };
  CAN0.sendMsgBuf(0x0C8, 0, 8, d);
  delay(10);
}</pre>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Lungimea cadrului.</b> Cadrul standard cu 8 octeți are 108 biți de la SOF până la sfârșitul EOF (1 + 11 + 3 + 4 + 64 + 15 + 1 + 2 + 7), plus 3 biți de pauză (IFS) până la cadrul următor; după fiecare 5 biți identici, între SOF și CRC, transmițătorul inserează un bit de valoare opusă (umplerea de biți), astfel că lungimea reală depinde de date (≈ 111…130 de biți cu pauza). Osciloscopul din simulator decodează cadrul și marchează biții de umplere; în Tabelul 10.2 „biți pe cadru” înseamnă SOF…EOF, iar calculul încărcării adaugă cei 3 biți de pauză.</li>
<li><b>Nodul C</b> (monitorul) înlocuiește adaptorul USB-CAN: recepționează toate cadrele, le decodează după DBC, numără cadrele și cadrele de eroare pe fiecare secundă și calculează încărcarea; comanda „r” resetează statisticile. Tabelul 10.3 consemnează numărul de cadre pe secundă și cadrele de eroare de la pornire sau de la resetare.</li>
<li><b>Arbitrajul.</b> 0x0B4 = 000 1011 0100 și 0x0C8 = 000 1100 1000 sunt identice până la al 5-lea bit al ID-ului, unde 0x0B4 transmite 0 (dominant) și câștigă. Mesajul pierzător nu se pierde: controlerul îl retransmite automat imediat după.</li>
<li><b>Defectele.</b> Pe magistrala scurtă (2 m) și la 500 kbit/s, lipsa unei terminări nu produce erori: se văd oscilații pe fronturi și revenirea mai lentă în starea recesivă (marja de siguranță scade). Cu CAN-L întrerupt la nodul B, transmisiile lui B eșuează: fiecare cadru de eroare crește TEC cu 8; la 128 nodul trece în „error passive”, la 256 în „bus off” – după 32 de încercări se deconectează singur, iar restul rețelei continuă. Recepția corectă scade TEC cu 1.</li>
<li><b>Cristalul.</b> Modulele MCP2515 au de regulă cristal de 8 MHz; dacă programul folosește MCP_16MHZ, nodul transmite la jumătate din rata de biți și produce numai erori (verificare din fișa de montaj, opțională în simulator).</li></ul></div>
<h2>10.3. Aparatură și echipamente</h2>
<ul><li>2–3 noduri: Arduino Mega + modul MCP2515 cu transceiver TJA1050 (cristal de 8 MHz); cablu torsadat de 2 m; rezistențe de terminare de 120 Ω</li>
<li>Adaptor USB-CAN (CANable / PCAN-USB sau echivalent) cu programul SavvyCAN pentru monitorizare; alternativ, un al treilea nod care afișează mesajele pe portul serial</li>
<li>Osciloscop cu două canale, multimetru; senzorii de la lucrările anterioare ca surse de date</li></ul>
<h2>10.4. Modul de lucru (în simulator)</h2>
<ol><li>Nodurile pe magistrală cu terminările la capete; cu alimentarea oprită se măsoară rezistența CAN-H – CAN-L (≈ 60 Ω).</li>
<li>Baza de date: 0x0C8 „Motor” (turație, factor 0,25; temperatură, decalaj −40 °C) și 0x0B4 „Pedală” (poziție, factor 0,4 %) – Tabelul 10.1; nodul C decodează valorile.</li>
<li>Cu osciloscopul se măsoară durata unui bit și a unui cadru și se numără biții (Tabelul 10.2); se calculează încărcarea.</li>
<li>Arbitraj: ambele noduri transmit simultan (butonul D3); se observă ordinea mesajelor recepționate.</li>
<li>Se scoate o terminare, apoi se desface CAN-L la un nod; se observă cadrele de eroare și numărătoarele de erori (Tabelul 10.3).</li></ol>
<h2>10.7. Interpretarea rezultatelor</h2>
<ul><li>Mesajul cu identificatorul mai mic are prioritate; la încărcare mare mesajele cu prioritate mică sunt întârziate.</li>
<li>Lipsa unei terminări produce reflexii; pe o magistrală scurtă și lentă comunicația poate continua, dar marginea de siguranță scade.</li>
<li>Un nod care produce multe erori trece în starea „error passive” și apoi „bus off”, deconectându-se singur pentru a nu bloca rețeaua.</li></ul>
<h2>10.8. Relevanță practică</h2>
<p>Definirea mesajelor, a bazelor de date DBC și analiza încărcării rețelelor sunt activități curente ale inginerilor de rețele auto. Arhitecturile actuale folosesc CAN FD (până la 64 de octeți și rate mai mari) și Ethernet auto, cu aceleași principii de definire a semnalelor.</p>`;
function fig101() {
  const fr = MD.cadru(0xC8, MD.codMotor(875, 83)), X0 = 40, W = 580, n = fr.n, x = k => X0 + k / n * W;
  let s = `<svg viewBox="0 0 660 250" class="fig-svg" role="img" aria-label="Fig. 10.1"><g font-size="10" fill="currentColor">`;
  let d = `M${X0},30`; fr.bits.forEach((b, k) => { const y = b ? 30 : 60; d += ` L${x(k).toFixed(1)},${y} L${x(k + 1).toFixed(1)},${y}`; });
  s += `<text x="${X0}" y="18">cadrul 0x0C8 (875 rot/min, 83 °C) – ${n} biți, ${fr.nStuff} de umplere (roșu)</text><path d="${d}" fill="none" stroke="#1f5f9e" stroke-width="1.4"/>`;
  fr.stuff.forEach((st, k) => { if (st) s += `<rect x="${x(k).toFixed(1)}" y="64" width="${(W / n).toFixed(2)}" height="6" fill="#c62828"/>`; });
  const camp = [["SOF", 0, 1], ["ID (11)", 1, 12], ["RTR IDE r0 DLC", 12, 19], ["DATE (64)", 19, 83], ["CRC (15)", 83, n - 10], ["ACK", n - 9, n - 7], ["EOF (7)", n - 7, n]];
  camp.forEach(([t, a, b], i) => { s += `<line x1="${x(a)}" y1="76" x2="${x(a)}" y2="84" stroke="currentColor"/><text x="${((x(a) + x(b)) / 2).toFixed(1)}" y="${96 + (i % 2) * 11}" text-anchor="middle" font-size="9">${t}</text>`; });
  // arbitrajul
  const ia = MD.cadru(0xB4, MD.codPedala(20)).bits.slice(0, 12), ib = MD.cadru(0xC8, MD.codMotor(875, 83)).bits.slice(0, 12), Y = 150, w = 34;
  s += `<text x="${X0}" y="${Y - 14}">arbitrajul (SOF + ID): nodul B 0x0B4, nodul A 0x0C8, magistrala = ȘI logic (dominant 0)</text>`;
  [["B 0x0B4", ia, 0], ["A 0x0C8", ib, 1], ["magistrala", ia.map((v, i) => v & ib[i]), 2]].forEach(([t, bits, r]) => { s += `<text x="${X0}" y="${Y + 14 + r * 26}">${t}</text>`;
    bits.forEach((v, i) => { const pierdut = r === 1 && i >= 5; s += `<rect x="${X0 + 80 + i * w}" y="${Y + r * 26}" width="${w - 3}" height="20" rx="3" fill="${pierdut ? "none" : v ? "#90caf9" : "#1f5f9e"}" stroke="${pierdut ? "#c62828" : "none"}" stroke-dasharray="3 2"/><text x="${X0 + 80 + i * w + w / 2 - 1}" y="${Y + 14 + r * 26}" text-anchor="middle" fill="${v || pierdut ? "currentColor" : "#fff"}">${pierdut ? "–" : v}</text>`; }); });
  s += `<text x="${X0 + 80 + 5 * w}" y="${Y + 92}" fill="#c62828">bitul 5 al ID-ului: A transmite 1, citește 0 → pierde arbitrajul și ascultă</text>`;
  return s + `</g></svg>`;
}
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>Se recepționează 0x0C8 cu octeții AC 0D 7B …; la 500 kbit/s, 0x0C8 la 10 ms și 0x0B4 la 20 ms, fiecare ≈ 125 de biți:</p>
<div class="ec"><span>x<sub>brut</sub> = 13 · 256 + 172 = 3500</span><span class="nr">(10.5)</span></div>
<div class="ec"><span>n = 3500 · 0,25 = 875 rot/min</span><span class="nr">(10.6)</span></div>
<div class="ec"><span>ϑ = 123 − 40 = 83 °C</span><span class="nr">(10.7)</span></div>
<div class="ec"><span>t<sub>bit</sub> = 1 / 500 000 = 2 µs</span><span class="nr">(10.8)</span></div>
<div class="ec"><span>S = 125 · (100 + 50) / 500 000 · 100 = 3,75 %</span><span class="nr">(10.9)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Codificați în octeții mesajului 0x0C8 turația de 2400 rot/min și temperatura de 95 °C.</p><details class="sol"><summary>Rezolvare</summary><p>x<sub>brut</sub> = 2400 / 0,25 = 9600 = 0x2580 → B0 = 0x80, B1 = 0x25; temperatura 95 + 40 = 135 = 0x87. Octeții: 80 25 87 00 00 00 00 00.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Care este perioada minimă de repetare posibilă pentru un mesaj de 125 de biți la 500 kbit/s dacă ar fi singurul pe magistrală? Dar la 125 kbit/s?</p><details class="sol"><summary>Rezolvare</summary><p>125 · 2 µs = 250 µs (4000 de mesaje/s); la 125 kbit/s, 125 · 8 µs = 1 ms.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Un nod produce cadre de eroare la fiecare transmisie. După câte încercări ajunge în error passive și după câte în bus off?</p><details class="sol"><summary>Rezolvare</summary><p>TEC crește cu 8 la fiecare eroare de transmisie: 128/8 = 16 încercări până la error passive și 256/8 = 32 până la bus off.</p></details></div>`;
}
const INTREBARI = [
  ["Cum se stabilește prioritatea mesajelor CAN?", "Prin identificator: în timpul arbitrajului bit cu bit, bitul dominant (0) acoperă bitul recesiv (1), deci identificatorul cu valoarea numerică cea mai mică are prioritatea cea mai mare. ID-urile se aleg la proiectarea rețelei după importanța și urgența semnalelor."],
  ["Ce se întâmplă cu mesajul nodului care pierde arbitrajul?", "Nodul se oprește din transmis imediat ce citește un bit dominant în locul celui recesiv transmis, trece în recepție (citește mesajul câștigător, care nu este deteriorat) și reîncearcă automat transmisia după terminarea cadrului curent. Mesajul nu se pierde, ci este doar întârziat."],
  ["Decodați turația pentru octeții 40 1F și factorul 0,25.", "x<sub>brut</sub> = 0x1F · 256 + 0x40 = 31 · 256 + 64 = 8000; n = 8000 · 0,25 = 2000 rot/min."],
  ["Calculați încărcarea magistralei pentru 20 de mesaje de 125 de biți la 10 ms, la 500 kbit/s.", "S = 20 · 125 · 100 / 500 000 · 100 = 50 %."],
  ["Ce avantaje aduce CAN FD?", "Câmp de date de până la 64 de octeți (față de 8) și rată de biți mai mare în faza de date (2…5 Mbit/s, arbitrajul rămâne la rata nominală), deci mai puține cadre pentru aceeași informație, încărcare mai mică, CRC mai puternic și transfer rapid (de ex. actualizări software, date ADAS), păstrând principiul arbitrajului CAN."]
];
const TEST = [
  { q: "La 500 kbit/s durata unui bit este:", o: ["0,5 µs", "2 µs", "5 µs", "500 µs"], c: 1, e: "t<sub>bit</sub> = 1/500 000 = 2 µs." },
  { q: "Între 0x0B4 și 0x0C8, arbitrajul îl câștigă:", o: ["0x0C8", "0x0B4", "cel care pornește primul", "niciunul – coliziune"], c: 1, e: "ID-ul mai mic are prioritate (dominantul 0 acoperă recesivul)." },
  { q: "Cu ambele terminări de 120 Ω, rezistența CAN-H – CAN-L este:", o: ["≈ 30 Ω", "≈ 60 Ω", "≈ 120 Ω", "≈ 240 Ω"], c: 1, e: "Două rezistențe de 120 Ω în paralel." },
  { q: "Octeții AC 0D cu factorul 0,25 dau turația:", o: ["875 rot/min", "3500 rot/min", "44 045 rot/min", "1102 rot/min"], c: 0, e: "0x0DAC = 3500; 3500 · 0,25 = 875." },
  { q: "Un bit de umplere se inserează după:", o: ["fiecare octet", "5 biți identici consecutivi", "câmpul CRC", "fiecare 8 biți"], c: 1, e: "Asigură fronturi pentru sincronizare." },
  { q: "Un nod cu TEC peste 255:", o: ["transmite cu prioritate", "intră în bus off și se deconectează", "resetează rețeaua", "trece în error active"], c: 1, e: "Bus off – nu mai participă la comunicație." }
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
Cadru.porneste({
  disc: "MAM1", nr: 10, cod: "mam1-l10",
  titlu: "Magistrala CAN: construirea mesajelor, arbitrajul și decodarea semnalelor",
  scurt: "Magistrala CAN",
  subtitlu: "Laborator virtual – trei noduri Arduino Mega + MCP2515 + TJA1050 pe cablul torsadat cu terminări de 120 Ω, mesajele 0x0C8 „Motor” și 0x0B4 „Pedală” definite în DBC, osciloscopul cu decodarea cadrului (biții de umplere), arbitrajul, încărcarea magistralei și defectele (terminare lipsă, CAN-L întrerupt: cadre de eroare, error passive, bus off)",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261031); },
  date: [{ k: "fbit", et: "f<sub>bit</sub> [bit/s]", v: 500000, fix: true }, { k: "fC8", et: "f 0x0C8 [Hz]", v: 100, fix: true }, { k: "fB4", et: "f 0x0B4 [Hz]", v: 50, fix: true }],
  tabele: [
    { id: "t101", titlu: "Tabelul 10.1. Baza de date a mesajelor și decodarea", antetRand: "ID · Nume · Perioadă · Semnal · Octeți · Factor · Offset", nota: "Octeții recepționați de nodul C (hex, toți cei 8); x brut din (10.2) (sau octetul simplu); valoarea fizică din (10.1); valoarea la sursă – afișată de nodul transmițător.",
      randuri: [{ k: "rpm", et: "0x0C8 · Motor · 10 ms · turație · 0–1 · 0,25 · 0 · rot/min" }, { k: "temp", et: "0x0C8 · Motor · 10 ms · temperatură · 2 · 1 · −40 · °C" }, { k: "poz", et: "0x0B4 · Pedală · 20 ms · poziție · 0 · 0,4 · 0 · %" }],
      coloane: [{ k: "oct", t: "Octeți recepționați (hex)", intrare: true, text: true }, { k: "brut", t: "x brut" }, { k: "fiz", t: "Valoare fizică" }, { k: "src", t: "Valoare la sursă", intrare: true, neg: true }] },
    { id: "t102", titlu: "Tabelul 10.2. Măsurători pe magistrală", antetRand: "Mărime", nota: "Măsurat: osciloscopul (decodarea cadrului), multimetrul (alimentarea oprită), nodul C (încărcarea pe 1 s). Calculat: (10.3), cadrul construit din octeții din Tabelul 10.1 (CRC și umplerea de biți), 120 ∥ 120 Ω, (10.4) cu biții măsurați + 3 biți de pauză.",
      randuri: [{ k: "tbit", et: "t<sub>bit</sub> [µs]" }, { k: "tC8", et: "Durata cadrului 0x0C8 [µs]" }, { k: "nC8", et: "Biți pe cadru 0x0C8" }, { k: "nB4", et: "Biți pe cadru 0x0B4" }, { k: "R", et: "R CAN-H – CAN-L [Ω]" }, { k: "S", et: "Încărcarea S [%]" }],
      coloane: [{ k: "mas", t: "Valoare măsurată", intrare: true }, { k: "calc", t: "Valoare calculată" }] },
    { id: "t103", titlu: "Tabelul 10.3. Defecte și arbitraj", antetRand: "Situație", nota: "Cadre pe secundă recepționate de nodul C și cadrele de eroare numărate de la pornire / de la resetarea statisticilor (comanda „r”).",
      randuri: [{ k: "sim", et: "Transmisie simultană" }, { k: "term", et: "Fără o terminare" }, { k: "canl", et: "CAN-L întrerupt la un nod" }],
      coloane: [{ k: "nC8", t: "0x0C8 recepționate [1/s]", intrare: true }, { k: "nB4", t: "0x0B4 recepționate [1/s]", intrare: true }, { k: "err", t: "Cadre de eroare", intrare: true }, { k: "obs", t: "Observații", intrare: true, tip: "select", optiuni: MD.OBS }] }
  ],
  inaltimeGrafic: 240,
  calculeaza: calculeazaMAM10,
  intrebari() {
    return [
      { id: "q1", u: "rot/min", text: "Turația pentru octeții 40 1F și factorul 0,25 (Întrebarea 3):", textSimplu: "turația din 40 1F" },
      { id: "q2", u: "%", text: "Încărcarea pentru 20 de mesaje de 125 de biți la 10 ms, la 500 kbit/s (Întrebarea 4):", textSimplu: "încărcarea rețelei tipice" },
      { id: "q3", u: "", text: "Numărul de biți ai cadrului 0x0C8 măsurat pe osciloscop (Tabelul 10.2):", textSimplu: "biți pe cadrul 0x0C8" },
      { id: "q4", u: "%", text: "Încărcarea calculată cu (10.4) din biții măsurați (Tabelul 10.2):", textSimplu: "încărcarea calculată" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    if (t.t101.rpm.oct === "" || t.t101.poz.oct === "") l.push("Tabelul 10.1: octeții recepționați");
    const a = ["tbit", "tC8", "nC8", "nB4", "R", "S"].filter(k => t.t102[k].mas !== "").length; if (a < 6) l.push(`Tabelul 10.2: ${a}/6 mărimi`);
    const b = ["sim", "term", "canl"].filter(k => t.t103[k].err !== "").length; if (b < 3) l.push(`Tabelul 10.3: ${b}/3 situații`);
    return l;
  },
  exemplu(D) { const t = D.t; Object.assign(t.t101.rpm, { oct: "AC 0D 7B 00 00 00 00 00", src: "875" }); Object.assign(t.t101.temp, { oct: "AC 0D 7B 00 00 00 00 00", src: "83" }); Object.assign(t.t102.tbit, { mas: "2.00" }); },
  animatie: {
    titluTab: "Montajul real (3D)", titlu: "Montajul real al lucrării – aceleași legături ca în planșa Tinkercad",
    intro: `<p>Rețeaua de laborator: trei plăci Arduino Mega cu modulele MCP2515 + TJA1050 (A – Motor, B – Pedală, C – Monitor cu OLED), cablul torsadat de 2 m cu derivații, jumperele J1 de terminare la capete, butonul comun D3, multimetrul și osciloscopul cu sondele pe CAN-H / CAN-L. Ecranele sunt cele din planșă.</p>`,
    modul: "montaj3d.js?v=2", functie: "creeazaMontaj",
    optiuni: { svgVB: [0, -14, 1300, 814], construieste: L => montaj3dL10(L), cam: VEDERI.tot[0], tinta: VEDERI.tot[1], laClic: k => laClic3d(k),
      vederi: { tot: [...VEDERI.tot, "Ansamblu"], osc: [...VEDERI.osc, "Osciloscopul"] } }
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Rețelele de comunicație ale autovehiculului",
    intro: `<p>În automobil, calculatoarele comunică pe mai multe magistrale CAN (motor și transmisie, șasiu, caroserie), LIN pentru nodurile simple și Ethernet auto pentru ADAS, legate printr-un gateway. Selectați în machetă senzorii și calculatoarele: tipul de semnal arată pe ce magistrală ajung datele (CAN, LIN, Ethernet).</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "esc" })
  },
  atelierSenzori: { intro: `<p>Senzorii transmit valorile fie analogic, fie pe magistrale (CAN, LIN, SENT); alegeți un senzor din listă pentru a vedea semnalul și verificările.</p>`, optiuni: { initial: "esc" } },
  referat: {
    scop: "Realizarea unei rețele CAN cu trei noduri, definirea mesajelor în DBC, decodarea valorilor fizice, măsurarea bitului și a cadrului, încărcarea magistralei, arbitrajul și efectul defectelor.",
    relatii: "x<sub>fiz</sub> = x<sub>brut</sub>·factor + offset; &nbsp; x<sub>brut</sub> = B<sub>1</sub>·256 + B<sub>0</sub>; &nbsp; t<sub>bit</sub> = 1/f<sub>bit</sub>; &nbsp; S = Σ N<sub>k</sub>f<sub>k</sub>/f<sub>bit</sub>·100.",
    varianta: () => "Exemplarul propriu al fiecărui student: rezistențele de terminare, rezistența cablului, nivelurile transceiverelor și valorile inițiale ale semnalelor (turația, temperatura, poziția pedalei).",
    indicatii: "Comparați octeții cu valorile fizice, numărul de biți măsurat cu cel calculat (biții de umplere), încărcarea măsurată cu cea calculată, ordinea la arbitraj și efectul defectelor (TEC, error passive, bus off)…"
  },
  subsol: "Modelul: cadre standard CAN 2.0A construite bit cu bit (CRC-15, umplerea de biți), arbitraj pe ID, pauză de 3 biți, terminări 120 Ω cu toleranță, cadre de eroare de 18 biți, TEC +8 / −1, error passive la 128, bus off la 256. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena tk">
      ${ghidSectiune()}
      <div class="tk-bara">
        <span class="tk-logo">⚡ <b>Stand</b> · MAM I – Lucrarea 10</span>
        <button type="button" id="tk-fit" title="Închide fereastra de detalii">⤢ Încadrează</button>
        <button type="button" id="btn-ecran" title="Ecran complet">⛶ Ecran complet</button>
        <button type="button" id="tk-codb" class="activ">{ } Cod</button>
        <button type="button" id="tk-start" class="tk-start">▶ Pornește simularea</button>
      </div>
      <div class="tk-plansa">${planseSVG()}<div class="tk-insp" id="tk-insp" hidden></div><div class="tk-pas-banda" id="tk-pas-banda"></div></div>
      <div class="tk-pompa" id="tk-pompa"></div>
      <div class="tk-osc" id="tk-osc"></div>
      <div class="tk-afis" id="afis"></div>
      <p class="tk-ajutor">„Pornește simularea” = alimentarea nodurilor · clic pe jumperele J1, pe ✂ (CAN-L la nodul B), pe butonul D3, pe multimetru · terminările și firele se schimbă numai cu alimentarea oprită · clic pe celelalte componente = detalii. Montajul real în 3D este în fila „Montajul real (3D)”.</p>
      <div class="tk-jos">
        <div class="tk-cod" id="tk-codp">
          <div class="tk-cod-sus"><b>Cod – nodul A (Arduino Mega 2560)</b><span style="margin-left:auto">${PROG.titlu}.ino</span></div>
          <div id="tk-blocat" class="tk-blocat" hidden>Opriți simularea pentru a modifica codul.</div>
          <pre id="tk-cod"></pre>
        </div>
        <div class="tk-ser"><div class="tk-cod-sus"><b>Monitor serial (nodul C)</b><span style="margin-left:auto">115200 baud</span></div><pre id="tk-serial"></pre>
          <div class="tk-ser-in"><input id="ser-in" placeholder="trimite (r)" aria-label="Text de trimis pe portul serial"><button type="button" id="ser-tx">Trimite</button></div>
          <div class="tk-cod-sus"><b>Plotter – valorile decodate</b></div>
          <canvas id="tk-plot" aria-label="Plotterul: turația și poziția pedalei decodate"></canvas></div>
      </div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Programul și mesajele</h2>
      <p class="fw">Programe încărcate: <b id="fw-mega">—</b></p>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <p class="nota">Lucrați în ordinea pașilor din chenarul de deasupra planșei. Valorile intră în tabele numai din aparate (multimetru, osciloscop) și din nodul C.</p>
    </aside>
  </div>`,
    init(C) {
      init(); afiseazaCod(); actualizeazaFw(); oscCtl(); actualizeaza();
      $("#tk-start").addEventListener("click", pornesteSim);
      $("#tk-codb").addEventListener("click", () => { const p = $("#tk-codp"); p.hidden = !p.hidden; $("#tk-codb").classList.toggle("activ", !p.hidden); });
      $("#tk-fit").addEventListener("click", () => inspector(null));
      const tx = () => { const i = $("#ser-in"); if (i.value.trim()) comanda(i.value); i.value = ""; };
      $("#ser-tx").addEventListener("click", tx); $("#ser-in").addEventListener("keydown", e => { if (e.key === "Enter") tx(); });
      construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $$("#tk-svg [data-k]").forEach(g => g.addEventListener("click", e => { e.stopPropagation(); laClic3d(g.dataset.k); }));
      C.mesaj("Urmați pașii din chenarul „Desfășurarea lucrării – pas cu pas”; începeți cu magistrala și terminările (NSSM).", "");
    },
    reset() { if (sim.run && $("#tk-start")) opresteSim(); sim.giJc = false; Object.assign(sim, { serial: [], ist: [], jA: true, jB: false, jC: true, canl: false, rpm: null, mm: false, arbVazut: false, obs: { term: "", canl: "", sim: "" } }); init(); },
    cadru(dt, C, vizibil) {
      init(); const acum = performance.now(); sim.tS += Math.min(dt || 0.016, 0.1); if (sim.run) pasBus();
      if (!vizibil) { if (C.tabActiv === "anim" && acum - (this._t3 || 0) > 200) { this._t3 = acum; achizitie(); planseAfis(); sincron3d(); } return; }
      if (acum - (this._to || 0) > 200) { this._to = acum; achizitie(); planseAfis(); }
      if (acum - (this._ts || 0) > 400) { this._ts = acum; afisaje(); plotter(); sincron3d(); actualizeazaPasi(); panouDacaSchimbat();
        C.stare(1, sim.run ? "nodurile alimentate" : "alimentarea oprită", sim.run ? "inc" : ""); C.stare(2, sim.bus && sim.bus.win ? `S ≈ ${fx(sim.bus.win.S, 2)} % · erori ${sim.bus.win.err}` : "—"); }
    },
    redeseneaza() { plotter(); },
    formule() {
      const r = [], b = sim.bus; if (!b || !b.rx.C8) return r; const d = b.rx.C8.data;
      r.push(["Valoarea brută (10.2)", `x<sub>brut</sub> = ${d[1]} · 256 + ${d[0]} = <span class="rez">${d[1] * 256 + d[0]}</span>`]);
      r.push(["Turația (10.1)", `n = ${d[1] * 256 + d[0]} · 0,25 = <span class="rez">${fx((d[1] * 256 + d[0]) * 0.25, 2)} rot/min</span>`]);
      if (b.win) r.push(["Încărcarea (10.4)", `S = <span class="rez">${fx(b.win.S, 3)} %</span> (nodul C, ultima secundă)`]);
      return r;
    }
  }
});
let _panouK = "";
function panouDacaSchimbat() { const k = [sim.jA, sim.jB, sim.jC, sim.canl, sim.mm, sim.rpm, sim.T, sim.ped, sim.run].join(); if (k !== _panouK) { _panouK = k; panou(); } }

/* ------------------------------------------------------------------ montajul real 3D (aceleași legături ca planșa) */
function montaj3dL10(L) {
  const { THREE, V3, mm, M } = L, R = 0xe53935, N = 0x222222;
  const mat = o => new THREE.MeshStandardMaterial(o);
  const NX = { A: -0.42, B: -0.02, C: 0.38 }, ZB = 0.2, mods = {}, jump = {};
  ["A", "B", "C"].forEach(n => {
    const MG = L.arduinoMega([NX[n], 0, -0.02]);
    const G = L.grup([NX[n], 0, 0.1]);
    const pcb = L.box(mm(44), mm(1.6), mm(28), M.pcbA, G, 0, mm(8), 0, mm(0.5)); L.k_(pcb, "mcp" + n, `Modulul MCP2515 + TJA1050 al nodului ${n} (cristal 8 MHz)`);
    L.box(mm(10), mm(2), mm(10), M.negru, G, mm(-10), mm(9.5), 0, mm(0.3)); L.box(mm(6), mm(2), mm(5), M.negru, G, mm(6), mm(9.5), mm(-4), mm(0.3)); L.box(mm(8), mm(3), mm(3), M.crom, G, mm(14), mm(10), mm(6), mm(1));
    for (let i = 0; i < 2; i++) L.box(mm(7), mm(8), mm(7), M.albastru, G, mm(-4 + i * 8), mm(13), mm(13), mm(1));
    const j = L.box(mm(5), mm(5), mm(2.5), mat({ color: 0xffeb3b }), G, mm(16), mm(12), mm(-8), mm(0.5)); L.k_(j, "j" + n, `Jumperul J1 (terminare 120 Ω) – nodul ${n}`); jump[n] = j;
    [["D51", 0xff9800], ["D50", 0x8e24aa], ["D52", 0x00897b], ["D53", 0x795548], ["D2", 0x9e9e9e], ["5V", R], ["GND", N]].forEach(([p, c], i) => L.fir(L.lume(G, V3(mm(-18), mm(9), mm(-12 + i * 4))), MG.pin(p), c, { h: 30 }));
    mods[n] = { G, H: L.lume(G, V3(mm(-4), mm(18), mm(13))), L: L.lume(G, V3(mm(4), mm(18), mm(13))) };
    if (n !== "C") L.fir(L.lume(G, V3(mm(18), mm(9), mm(-12))), MG.pin("D3"), 0x1e88e5, { h: 26 });
    if (n === "C") { const OL = L.oled([NX.C + 0.16, 0, 0.0], { ecran: [940, 454, 280, 166] }); [[0, "5V", R], [1, "GND", N], [2, "D20", 0x1e88e5], [3, "D21", 0x43a047]].forEach(([i, p, c]) => L.fir(OL.pin(i), MG.pin(p), c, { h: 26 })); }
  });
  /* cablul torsadat cu derivațiile la fiecare nod */
  const pts = (dy, dz) => { const a = []; for (let i = 0; i <= 120; i++) { const x = -0.62 + i * 1.24 / 120, ph = i * 0.9; a.push(V3(x, mm(4) + dy + Math.sin(ph) * mm(1.6), ZB + dz + Math.cos(ph) * mm(1.6))); } return a; };
  const ch = L.tub(pts(0, 0), mm(1.1), mat({ color: 0xf2d600, roughness: 0.5 }), L.sc, 600, 8), cl = L.tub(pts(0, 0).map(p => p.clone().add(V3(0, 0, 0))).map((p, i) => V3(p.x, mm(4) - Math.sin(i * 0.9) * mm(1.6), ZB - Math.cos(i * 0.9) * mm(1.6))), mm(1.1), mat({ color: 0x3ddc84, roughness: 0.5 }), L.sc, 600, 8);
  L.k_(ch, "cablu", "Cablul torsadat de 2 m – CAN-H (galben)"); L.k_(cl, "cablu", "Cablul torsadat de 2 m – CAN-L (verde)");
  const tapL = {};
  ["A", "B", "C"].forEach(n => { L.tub([mods[n].H, mods[n].H.clone().add(V3(0, mm(20), mm(30))), V3(NX[n] - mm(4), mm(8), ZB)], mm(1), mat({ color: 0xf2d600 })); tapL[n] = L.tub([mods[n].L, mods[n].L.clone().add(V3(0, mm(18), mm(34))), V3(NX[n] + mm(4), mm(8), ZB)], mm(1), mat({ color: 0x3ddc84 })); L.k_(tapL[n], n === "B" ? "canl" : "cablu", n === "B" ? "Derivația CAN-L la nodul B (clic = desface / reface, alimentarea oprită)" : "Derivația CAN-L"); });
  /* butonul D3, multimetrul, osciloscopul, laptopul */
  const BT = L.grup([-0.22, 0, 0.3]); L.box(mm(40), mm(16), mm(40), M.griDes, BT, 0, mm(8), 0, mm(3)); const bt = L.cyl(mm(10), mm(10), mm(8), M.albastru, BT, 0, mm(20), 0, "y", 24); L.k_(bt, "d3", "Butonul comun D3 (transmisie simultană pe A și B)");
  const DM = L.multimetru([0.17, 0, -0.24], { ecran: [624, 456, 132, 54], et: "Multimetru (Ω între CAN-H și CAN-L)" });
  const O = L.osciloscop([-0.25, 0, -0.27], { ecran: [40, 458, 416, 296] });
  const PC = L.laptop([0.5, 0, -0.2], { roty: -0.4, cod: () => L.textCod(), titlu: () => "Arduino IDE – can_motor.ino" });
  const sd = [L.sonda(O.ch[0], 0xf2d600, V3(-0.3, 0.003, -0.1), { osc: true, et: "Sonda CH1 (CAN-H)" }), L.sonda(O.ch[1], 0x3ddc84, V3(-0.22, 0.003, -0.1), { osc: true, et: "Sonda CH2 (CAN-L)" })];
  sd[0].muta(mods.A.H); sd[1].muta(mods.A.L);
  const vm = [L.sonda(DM.com, 0x111111, V3(0.12, 0.003, -0.12), { et: "Sonda COM a multimetrului" }), L.sonda(DM.v, 0xd32f2f, V3(0.2, 0.003, -0.12), { et: "Sonda V/Ω a multimetrului" })];
  void PC;
  return { actualizeaza() {
    ["A", "B", "C"].forEach(n => { jump[n].visible = sim["j" + n]; });
    tapL.B.visible = !sim.canl; bt.position.y = performance.now() - (sim._d3 || 0) < 300 ? mm(16) : mm(20);
    vm[0].muta(sim.mm ? mods.C.L : null); vm[1].muta(sim.mm ? mods.C.H : null); DM.mod(sim.mm ? "R" : "OFF");
  } };
}
