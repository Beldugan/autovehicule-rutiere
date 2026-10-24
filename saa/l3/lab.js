/* SAA – Lucrarea 3. Sistemul de injecție common-rail – reglarea presiunii în rampă și injecția multiplă (standul 1.5 dCi).
   Simulator: schema sistemului common-rail (Delphi DCR, injectoare cu electrovalvă) animată, tester OBD cu înregistrare de date
   și cursoare, osciloscop cu clește de curent pe injectorul cilindrului 1 (cursoare). Panoul din dreapta conduce lucrarea.
   Parametrii sunt individuali (harta presiunii, eroarea staționară, dinamica reglajului, profilul injecției). */
"use strict";
const MD = MODELE["saa-l3"];
function P() { return Cadru.P; }
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const fx = (v, n) => fmt(v, n);
const RPM = { ral: 800, n1500: 1500, n2000: 2000, n2500: 2500, n3000: 3000, acc: 3000 };
const ET_REG = { antr: "antrenare", ral: "ralanti", n1500: "1500 rot/min", n2000: "2000 rot/min", n2500: "2500 rot/min", n3000: "3000 rot/min", acc: "accelerare bruscă" };

/* ------------------------------------------------------------------ starea standului */
const sim = {
  contact: false, merge: false, cr: false, tCr: 0, reg: "ral", n: 0, ect: 22, rapid: 1, t: 0,
  pc: 0, p: 1, v: 0, mod: "acc", imv: 50, obd: false, cleste: false, ochelari: false, racorduri: false, ident: new Set(),
  log: { buf: [], stop: false, A: null, B: null },
  osc: { tdiv: 0.5e-3, run: true, A: 0.0012, B: 0.0028, prof: null, k: null }
};

/* ------------------------------------------------------------------ modelul în timp real */
function regInj() {   // regimul pentru profilul injecției
  if (!sim.merge) return null;
  if (sim.reg === "acc") return "acc";
  if (sim.reg === "n2000") return "n2000";
  if (sim.reg === "ral") return sim.ect < 60 ? "rr" : "rc";
  return null;
}
function profil(k) {   // lista impulsurilor injectorului 1 față de începutul injecției principale [s]: [start, durata, tip]
  const p = P(); if (!k) { const n = sim.n || 800; return [[-0.0007, p.tp * 1e-3, "pre"], [0, (0.5 + n / 6000) * 1e-3, "pr"]]; }
  const L = [], dt = p.dt[k] * 1e-3, ti = p.ti[k] * 1e-3, tp = p.tp * 1e-3, nr = MD.INJ[k].nr;
  if (nr >= 3) L.push([-dt - p.dt2 * 1e-3, tp * 0.9, "pre 1"]);
  L.push([-dt, tp, nr >= 3 ? "pre 2" : "pre"]); L.push([0, ti, "principală"]);
  if (nr >= 4) L.push([ti + p.dpost * 1e-3, tp * 1.2, "post"]);
  return L;
}
function curent(t, L) {   // curentul injectorului (electrovalvă: vârf de atragere + palier de menținere)
  let I = 0;
  for (const [t0, d] of L) {
    const u = t - t0; if (u < 0) continue;
    if (u <= d) { const atr = Math.min(d, 0.16e-3); I += u < atr ? 19 * (1 - Math.exp(-u / 0.035e-3)) : 10.5 + 1.2 * ((u * 20000) % 1 - 0.5); }
    else { const I1 = d <= 0.16e-3 ? 19 * (1 - Math.exp(-d / 0.035e-3)) : 10.5; I += I1 * Math.exp(-(u - d) / 0.02e-3) - 1.2 * Math.exp(-(u - d) / 0.06e-3) * (u - d < 0.25e-3 ? 1 : 0); }
  }
  return I + (Math.random() - 0.5) * 0.25;
}
function pas(dt) {
  const p = P();
  sim.t += dt;
  // turația
  let nT = 0;
  if (sim.cr) { sim.tCr += dt; nT = 240; if (sim.tCr > 2.6) { sim.cr = false; sim.merge = true; sim.reg = "ral"; } }
  else if (sim.merge) nT = sim.reg === "ral" ? (sim.ect < 60 ? 950 : 800) : RPM[sim.reg];
  sim.n += (nT - sim.n) * (1 - Math.exp(-dt / (sim.reg === "acc" ? 0.35 : 0.5)));
  if (!sim.merge && !sim.cr && sim.n < 20) sim.n = 0;
  // temperatura
  sim.ect += ((sim.merge ? 88 : 22) - sim.ect) * (1 - Math.exp(-dt * sim.rapid / (sim.merge ? 420 : 3000)));
  if (sim.rapid > 1 && sim.ect > 84) sim.rapid = 1;
  // presiunea cerută și reglajul (ordinul 2)
  const pcNou = sim.cr ? MD.pCer(p, "antr") : sim.merge ? (sim.reg === "acc" ? p.pAcc : MD.pCer(p, sim.reg)) : 0;
  if (pcNou !== sim.pc) { sim.mod = pcNou > sim.pc ? "acc" : "dec"; sim.pc = pcNou; }
  const es = sim.cr ? p.esAntr : p.es, ps = sim.merge || sim.cr ? sim.pc * (1 + es / 100) : 1;
  const w = sim.mod === "acc" ? p.wA : p.wD, z = sim.mod === "acc" ? p.zA : p.zD;
  const h = 0.0005; for (let t = 0; t < dt; t += h) { const a = w * w * (ps - sim.p) - 2 * z * w * sim.v; sim.v += a * h; sim.p += sim.v * h; }
  if (!sim.merge && !sim.cr) { sim.p += (1 - sim.p) * (1 - Math.exp(-dt / 2)); sim.v = 0; }
  const kReg = sim.cr ? "antr" : sim.reg === "acc" ? "n3000" : sim.reg;
  sim.imv = sim.merge || sim.cr ? cl(MD.imv(p, kReg) - 0.025 * (ps - sim.p) + (Math.random() - 0.5) * 0.4, 5, 95) : 0;
  // înregistrarea
  if (!sim.log.stop && (sim.contact || sim.merge)) { sim.log.buf.push([sim.t, sim.n, sim.pc, sim.p, sim.imv]); while (sim.log.buf.length && sim.log.buf[0][0] < sim.t - 30) sim.log.buf.shift(); }
}

/* ------------------------------------------------------------------ schema sistemului (Fig. 3.1, animată) */
const COMP = {
  rez: ["Rezervorul de combustibil", "Motorină la presiunea atmosferică; returul injectoarelor și al pompei se întoarce aici (răcit)."],
  filtru: ["Filtrul de motorină cu separator de apă", "Reține impuritățile (injectoarele au jocuri de câțiva µm) și apa; are încălzitor electric."],
  pjp: ["Pompa de transfer (joasă presiune)", "Integrată în pompa de înaltă presiune (Delphi DFP): aspiră combustibilul din rezervor, 4…6 bar."],
  pip: ["Pompa de înaltă presiune Delphi DFP1", "Pompă cu pistonașe radiale antrenată de cureaua de distribuție; debitează în rampă până la 1600 bar."],
  imv: ["Regulatorul de debit IMV (Inlet Metering Valve)", "Electrovalvă proporțională pe aspirația pompei de înaltă presiune, comandată PWM de ECU. La Delphi este normal deschisă: un factor de umplere mai mare închide valva (debit mai mic)."],
  rampa: ["Rampa comună (rail)", "Acumulator de presiune care alimentează toate injectoarele; amortizează pulsațiile pompei și ale injecțiilor."],
  senz: ["Senzorul de presiune din rampă", "Membrană metalică cu mărci tensometrice; semnal ≈ 0,5…4,5 V spre ECU (bucla închisă de presiune)."],
  inj: ["Injectoarele Delphi cu electrovalvă", "Comandate de ECU în curent (vârf de atragere ≈ 18…20 A, palier de menținere ≈ 10…12 A), de 2…4 ori pe ciclu; returul de comandă merge la rezervor."],
  ecu: ["Calculatorul motorului (ECU Delphi DCM)", "Citește turația (CKP), sarcina (pedala, MAF), temperaturile și presiunea din rampă; comandă IMV, injectoarele, EGR și turbosuflanta."],
  obd: ["Priza de diagnoză OBD", "Testerul citește presiunea cerută / reală, comanda IMV, turația și temperatura combustibilului; înregistrează datele."]
};
function schemaSVG() {
  const p = sim.p, k = cl(p / 1500, 0, 1), cul = `rgb(${Math.round(60 + 195 * k)},${Math.round(120 - 80 * k)},${Math.round(200 - 170 * k)})`;
  const inj = regInj(), faza = (sim.t * Math.max(sim.n, 1) / 120) % 1, act = sim.merge ? Math.floor(faza * 4) : -1;
  const c = (id, s) => `<g class="cr-comp${sim.ident.has(id) ? " ident" : ""}" data-comp="${id}">${s}</g>`;
  let s = `<rect x="0" y="0" width="900" height="300" fill="none"/>`;
  // conductele de joasă presiune și retur
  s += `<path d="M95,250 L95,170 L175,170" fill="none" stroke="#3a7bd5" stroke-width="5"/><path d="M215,170 L285,170" fill="none" stroke="#3a7bd5" stroke-width="5"/>`;
  s += `<path d="M330,215 L330,270 L60,270 L60,250" fill="none" stroke="#7fb3ff" stroke-width="3" stroke-dasharray="7 5"/><path d="M455,135 L455,120 M545,135 L545,120 M635,135 L635,120 M725,135 L725,120 M455,120 L725,120 L770,120 L770,278 L60,278 L60,252" fill="none" stroke="#7fb3ff" stroke-width="3" stroke-dasharray="7 5"/>`;
  // înalta presiune
  s += `<path d="M375,175 L400,175 L400,60 L420,60" fill="none" stroke="${cul}" stroke-width="7"/>`;
  [455, 545, 635, 725].forEach((x, i) => { s += `<path d="M${x},70 L${x},100" stroke="${cul}" stroke-width="5"/>`; });
  s += c("rez", `<rect x="25" y="210" width="110" height="60" rx="8" fill="#d7dbe0" stroke="#7a8088"/><rect x="29" y="236" width="102" height="30" fill="#e8c46a" opacity=".75"/><text x="80" y="228" text-anchor="middle" font-size="11" fill="#333">rezervor</text>`);
  s += c("filtru", `<rect x="175" y="145" width="40" height="55" rx="6" fill="#f2f2f2" stroke="#777"/><text x="195" y="215" text-anchor="middle" font-size="10" fill="currentColor">filtru</text>`);
  s += c("pjp", `<circle cx="300" cy="170" r="16" fill="#9fb3c8" stroke="#555"/><text x="300" y="174" text-anchor="middle" font-size="9" fill="#111">PJP</text>`);
  s += c("pip", `<rect x="318" y="140" width="62" height="74" rx="10" fill="#8d949c" stroke="#555"/><text x="349" y="230" text-anchor="middle" font-size="10" fill="currentColor">pompa ÎP</text><g transform="translate(349 177) rotate(${(sim.t * sim.n * 3) % 360})"><path d="M-14,0 L14,0 M0,-14 L0,14" stroke="#333" stroke-width="3"/></g>`);
  s += c("imv", `<rect x="318" y="118" width="34" height="22" rx="3" fill="#2b2f35"/><text x="335" y="133" text-anchor="middle" font-size="9" fill="#ffd23f">IMV</text>`);
  s += c("rampa", `<rect x="420" y="45" width="330" height="26" rx="13" fill="${cul}" stroke="#333"/><text x="585" y="40" text-anchor="middle" font-size="11" fill="currentColor">rampa comună</text>`);
  s += c("senz", `<rect x="750" y="49" width="30" height="18" rx="3" fill="#2b2f35"/><text x="765" y="90" text-anchor="middle" font-size="9" fill="currentColor">senzor p</text>`);
  [455, 545, 635, 725].forEach((x, i) => {
    const on = act === [0, 2, 3, 1][i] && sim.merge;
    s += c("inj", `<rect x="${x - 9}" y="100" width="18" height="44" rx="4" fill="${on ? "#ffb02e" : "#c9cdd2"}" stroke="#555"/><path d="M${x - 4},144 L${x},156 L${x + 4},144z" fill="#555"/><text x="${x}" y="172" text-anchor="middle" font-size="10" fill="currentColor">inj. ${i + 1}</text>${on ? `<path d="M${x},158 l-10,26 h20z" fill="#ffd23f" opacity=".6"/>` : ""}`);
  });
  s += `<rect x="430" y="186" width="310" height="58" rx="8" fill="none" stroke="currentColor" opacity=".35"/><text x="585" y="236" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">motorul 1.5 dCi – cilindrii 1…4 (ordinea 1-3-4-2)</text>`;
  s += c("ecu", `<rect x="805" y="150" width="80" height="70" rx="6" fill="#b7bcc2" stroke="#555"/><text x="845" y="182" text-anchor="middle" font-size="11" fill="#111" font-weight="700">ECU</text><text x="845" y="198" text-anchor="middle" font-size="9" fill="#222">Delphi DCM</text>`);
  s += `<path d="M780,58 L845,58 L845,150" fill="none" stroke="#2e8b57" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M805,200 L790,200 L790,290 L300,290 L300,140 L318,129" fill="none" stroke="#c0492b" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  s += `<path d="M805,185 L480,185 L470,150" fill="none" stroke="#c0492b" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  s += c("obd", `<rect x="828" y="245" width="36" height="20" rx="3" fill="#2b2f35"/><text x="846" y="282" text-anchor="middle" font-size="9" fill="currentColor">OBD${sim.obd ? " ●" : ""}</text>`);
  if (sim.obd) s += `<path d="M864,255 C890,255 895,230 900,220" fill="none" stroke="#333" stroke-width="4"/>`;
  if (sim.cleste) s += `<g><rect x="470" y="176" width="26" height="16" rx="7" fill="#ff8a1f" stroke="#7a3d00"/><text x="483" y="203" text-anchor="middle" font-size="8.5" fill="currentColor">clește</text></g>`;
  // manometrul rampei
  const a = (-225 + 270 * cl(p / 2000, 0, 1)) * Math.PI / 180;
  s += `<circle cx="585" cy="270" r="0"/><g transform="translate(860 70)"><circle r="30" fill="#f6f6f2" stroke="#333" stroke-width="3"/><line x1="0" y1="0" x2="${Math.cos(a) * 24}" y2="${Math.sin(a) * 24}" stroke="#c62828" stroke-width="2.5"/><circle r="3" fill="#222"/><text y="14" text-anchor="middle" font-size="7" fill="#333">bar ×100</text></g>`;
  s += `<text x="20" y="306" font-size="10" fill="currentColor" opacity=".7">— joasă presiune   ⋯ retur   — înaltă presiune (culoarea: presiunea)   ⋯ semnale ECU</text>`;
  return s;
}

/* ------------------------------------------------------------------ testerul OBD cu înregistrare și cursoare */
const LG = { W: 760, H: 280, X0: 52, X1: 700, Y0: 22, Y1: 236 };
function desenLog() {
  const cv = $("#cv-log"); if (!cv) return;
  const dpr = devicePixelRatio || 1, sc = (cv.clientWidth || LG.W) / LG.W;
  if (cv.width !== Math.round(LG.W * sc * dpr)) { cv.width = Math.round(LG.W * sc * dpr); cv.height = Math.round(LG.H * sc * dpr); cv.style.height = Math.round(LG.H * sc) + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
  g.fillStyle = "#0e1620"; g.fillRect(0, 0, LG.W, LG.H);
  const B = sim.log.buf, tn = B.length ? B[B.length - 1][0] : 0, T0 = tn - 20, { X0, X1, Y0, Y1 } = LG, Pm = 1600;
  const X = t => X0 + (t - T0) / 20 * (X1 - X0), Y = v => Y1 - v / Pm * (Y1 - Y0), Yn = n => Y1 - n / 4000 * (Y1 - Y0);
  g.strokeStyle = "rgba(140,180,220,.15)"; g.font = "10px system-ui"; g.fillStyle = "#9fb3c8";
  for (let i = 0; i <= 10; i++) { const x = X0 + (X1 - X0) * i / 10; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.textAlign = "center"; g.fillText(`${-20 + i * 2} s`, x, Y1 + 13); }
  for (let v = 0; v <= Pm; v += 200) { const y = Y(v); g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.textAlign = "right"; g.fillText(v, X0 - 4, y + 3); }
  g.textAlign = "left"; g.fillStyle = "#e9f2ff"; g.font = "bold 11px system-ui"; g.fillText("Tester OBD – înregistrare: p cerută (gri), p reală (verde) [bar], turația (albastru, 0…4000)", X0, 14);
  const linie = (ix, f, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); let s0 = false; B.forEach(r => { if (r[0] < T0) return; const x = X(r[0]), y = f(r[ix]); s0 ? g.lineTo(x, y) : g.moveTo(x, y); s0 = true; }); g.stroke(); };
  linie(1, Yn, "#4da3ff", 1.2); linie(2, Y, "#b8c2cc", 1.4); linie(3, Y, "#6dff8e", 1.8);
  const L = sim.log;
  if (L.stop) {
    g.fillStyle = "#ff6b6b"; g.font = "bold 11px system-ui"; g.fillText("STOP – înregistrare oprită (trageți cursoarele A și B)", X0 + 360, Y0 + 14);
    const val = t => { let best = null; for (const r of B) if (!best || Math.abs(r[0] - t) < Math.abs(best[0] - t)) best = r; return best; };
    [["A", L.A, "#ffd23f"], ["B", L.B, "#ff8a3d"]].forEach(([n, t, c]) => { if (t === null) return; const x = X(t); g.strokeStyle = c; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.setLineDash([]); g.fillStyle = c; g.fillRect(x - 7, Y0, 14, 12); g.fillStyle = "#111"; g.textAlign = "center"; g.fillText(n, x, Y0 + 10); g.textAlign = "left"; });
    if (L.A !== null && L.B !== null) {
      const a = val(L.A), b = val(L.B), p0 = a[3], pf = b[2], y90 = Y(p0 + 0.9 * (pf * (1 + P().es / 100) - p0));
      g.strokeStyle = "rgba(255,210,63,.6)"; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(X0, y90); g.lineTo(X1, y90); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#ffd23f"; g.fillText("90 % din variație", X1 - 90, y90 - 4);
    }
  }
  $("#log-cit").innerHTML = L.stop && L.A !== null && L.B !== null ? citireLog().txt : L.stop ? "Clic pe grafic: întâi cursorul A (momentul comenzii), apoi B (p reală la 90 % din variație)." : "Înregistrare în curs… apăsați STOP după manevră.";
}
function citireLog() {
  const L = sim.log, B = L.buf, val = t => { let best = null; for (const r of B) if (!best || Math.abs(r[0] - t) < Math.abs(best[0] - t)) best = r; return best; };
  const a = val(L.A), b = val(L.B), seg = B.filter(r => r[0] >= Math.min(L.A, L.B) && r[0] <= Math.max(L.A, L.B));
  const sus = b[2] > a[3], ext = seg.length ? (sus ? Math.max(...seg.map(r => r[3])) : Math.min(...seg.map(r => r[3]))) : NaN;
  // extremul se caută și după B, până la 1,5 s (suprareglajul poate apărea după 90 %)
  const dupa = B.filter(r => r[0] >= L.B && r[0] <= L.B + 1.5).map(r => r[3]);
  const extT = sus ? Math.max(ext, ...dupa) : Math.min(ext, ...dupa);
  return { a, b, dt: L.B - L.A, p0: a[3], pf: b[2], ext: extT, sus,
    txt: `A: t = ${fx(a[0] - b[0] + (L.B - L.A), 2)} s · p<sub>c</sub> = ${Math.round(a[2])} · p = ${Math.round(a[3])} bar &nbsp;|&nbsp; B: p<sub>c</sub> = ${Math.round(b[2])} · p = ${Math.round(b[3])} bar &nbsp;|&nbsp; <b>Δt = ${fx(L.B - L.A, 3)} s</b> · p ${sus ? "max" : "min"} (până la 1,5 s după B) = <b>${Math.round(extT)} bar</b>` };
}
function legaLog() {
  const cv = $("#cv-log");
  cv.addEventListener("pointerdown", e => {
    const L = sim.log; if (!L.stop || !L.buf.length) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * LG.W, tn = L.buf[L.buf.length - 1][0], t = tn - 20 + (x - LG.X0) / (LG.X1 - LG.X0) * 20;
    if (L.A === null || (L.B !== null && Math.abs(t - L.A) < Math.abs(t - L.B))) L.A = t; else L.B = t;
    const mut = ev => { const xx = (ev.clientX - r.left) / r.width * LG.W, tt = tn - 20 + (xx - LG.X0) / (LG.X1 - LG.X0) * 20; if (Math.abs(tt - L.A) < Math.abs(tt - (L.B ?? 1e9))) L.A = tt; else L.B = tt; desenLog(); };
    cv.setPointerCapture(e.pointerId); cv.onpointermove = mut; cv.onpointerup = () => { cv.onpointermove = null; };
    desenLog();
  });
}

/* ------------------------------------------------------------------ osciloscopul (clește de curent pe injectorul 1) */
const OS = { W: 760, H: 280, X0: 40, X1: 720, Y0: 22, Y1: 236 };
const TDIVS = [0.2e-3, 0.5e-3, 1e-3];
function achizitieOsc() { const k = regInj(); sim.osc.k = k; sim.osc.prof = sim.merge ? profil(k) : null; sim.osc.n = sim.n; }
function desenOsc() {
  const cv = $("#cv-osc"); if (!cv) return;
  const dpr = devicePixelRatio || 1, sc = (cv.clientWidth || OS.W) / OS.W;
  if (cv.width !== Math.round(OS.W * sc * dpr)) { cv.width = Math.round(OS.W * sc * dpr); cv.height = Math.round(OS.H * sc * dpr); cv.style.height = Math.round(OS.H * sc) + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
  g.fillStyle = "#07120d"; g.fillRect(0, 0, OS.W, OS.H);
  const { X0, X1, Y0, Y1 } = OS, o = sim.osc, W = o.tdiv * 10;
  g.strokeStyle = "rgba(120,200,160,.18)"; g.font = "10px system-ui"; g.fillStyle = "#9fe6c0";
  for (let i = 0; i <= 10; i++) { const x = X0 + (X1 - X0) * i / 10; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); }
  for (let j = 0; j <= 8; j++) { const y = Y0 + (Y1 - Y0) * j / 8; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.textAlign = "right"; g.fillText(25 - j * 3.75 > -5 ? fx(25 - j * 3.75, 0) : "", X0 - 3, y + 3); }
  g.textAlign = "left"; g.fillStyle = "#e9f2ff"; g.font = "bold 11px system-ui"; g.fillText(`Osciloscop · clește de curent pe injectorul 1 · ${fx(o.tdiv * 1000, 1)} ms/div · 3,75 A/div · ${o.run ? "RUN" : "STOP"}`, X0, 14);
  if (!sim.cleste) { g.fillStyle = "#9fe6c0"; g.fillText("Cleștele de curent nu este montat pe cablul injectorului 1.", X0 + 160, 130); return; }
  if (!o.prof) { g.fillStyle = "#9fe6c0"; g.fillText("Motor oprit – fără comenzi ale injectorului.", X0 + 200, 130); return; }
  const t0 = o.prof[0][0] - o.tdiv, X = t => X0 + (t - t0) / W * (X1 - X0), Y = I => Y1 - (I + 5) / 30 * (Y1 - Y0);
  g.strokeStyle = "#ffd23f"; g.lineWidth = 1.5; g.beginPath();
  for (let i = 0; i <= 1400; i++) { const t = t0 + W * i / 1400, I = curent(t, o.prof); i ? g.lineTo(X(t), Y(I)) : g.moveTo(X(t), Y(I)); } g.stroke();
  g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.moveTo(X0, Y(0)); g.lineTo(X1, Y(0)); g.stroke();
  [["A", o.A, "#4fd6ff"], ["B", o.B, "#ff6bd6"]].forEach(([n, t, c]) => { const x = X(t0 + t); g.strokeStyle = c; g.setLineDash([5, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.setLineDash([]); g.fillStyle = c; g.fillRect(x - 7, Y0, 14, 12); g.fillStyle = "#111"; g.textAlign = "center"; g.fillText(n, x, Y0 + 10); g.textAlign = "left"; });
  const dt = Math.abs(o.B - o.A);
  $("#osc-cit").innerHTML = `n = ${Math.round(o.n)} rot/min · <b>Δt (A–B) = ${fx(dt * 1000, 3)} ms</b> → Δφ = 6·10<sup>−3</sup>·${Math.round(o.n)}·${fx(dt * 1000, 3)} = ${fx(6e-3 * o.n * dt * 1000, 2)} °RAC`;
}
function legaOsc() {
  const cv = $("#cv-osc");
  cv.addEventListener("pointerdown", e => {
    const o = sim.osc, r = cv.getBoundingClientRect(), W = o.tdiv * 10;
    const tAt = ev => cl(((ev.clientX - r.left) / r.width * OS.W - OS.X0) / (OS.X1 - OS.X0) * W, 0, W);
    const t = tAt(e), k = Math.abs(t - o.A) < Math.abs(t - o.B) ? "A" : "B"; o[k] = t;
    cv.setPointerCapture(e.pointerId); cv.onpointermove = ev => { o[k] = tAt(ev); desenOsc(); }; cv.onpointerup = () => { cv.onpointermove = null; };
    desenOsc();
  });
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const PASI = [
  { t: "Pregătirea și identificarea", tab: "NSSM, Fig. 3.1", panou: "schema",
    instr: ["Echipament de protecție; NU se slăbește niciun racord de înaltă presiune.", "Identificați pe schemă componentele sistemului (clic pe fiecare): cel puțin pompa, IMV, rampa, senzorul de presiune, injectoarele, ECU.", "Cu motorul oprit și contactul luat conectați testerul OBD și montați cleștele de curent pe cablul injectorului 1."],
    ver: () => [[sim.ochelari && sim.racorduri, "NSSM confirmate"], [sim.ident.size >= 6, `componente identificate: ${sim.ident.size}/6`], [sim.obd, "testerul OBD conectat"], [sim.cleste, "cleștele pe cablul injectorului 1"]],
    prog: () => (sim.ochelari && sim.racorduri ? 1 : 0) + (sim.ident.size >= 6 ? 1 : 0) + (sim.obd ? 1 : 0) + (sim.cleste ? 1 : 0), tot: 4,
    ctl: `<label class="bifa"><input type="checkbox" id="ck-och"> Ochelari și mănuși</label><label class="bifa"><input type="checkbox" id="ck-rac"> Nu se intervine pe racordurile de înaltă presiune</label>
      <div class="rand-butoane"><button type="button" id="b-obd">Conectează testerul OBD</button><button type="button" id="b-cl">Montează cleștele pe inj. 1</button></div>
      <p class="nota" id="comp-info">Clic pe o componentă din schemă.</p>` },
  { t: "Ralanti rece – profilul injecției", tab: "Tabelul 3.3 (ralanti rece)", panou: "osc",
    instr: ["Puneți contactul și porniți motorul rece (demarorul ≈ 2,5 s).", "Pe osciloscop numărați injecțiile pe ciclu (impulsurile injectorului 1).", "Cursorul A la începutul ultimei pre-injecții, B la începutul injecției principale → Δt; apoi A și B la începutul și sfârșitul principalei → durata.", "Alegeți numărul de injecții și înregistrați."],
    ver: () => [[sim.cleste, "cleștele montat"], [sim.merge && sim.reg === "ral", "motor la ralanti"], [sim.ect < 60, `motor rece (${fx(sim.ect, 0)} °C < 60 °C)`]],
    prog: () => ["dt", "ti", "nr"].filter(c => pe("t33", "rr", c)).length, tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" id="b-contact">Contact</button><button type="button" class="primar" id="b-porn">Pornește (demaror)</button><button type="button" id="b-stop">Oprește</button></div>` + ctlOsc(),
    buton: null },
  { t: "Încălzirea motorului", tab: "lichid ≥ 80 °C", panou: "obd",
    instr: ["Lăsați motorul la ralanti până la temperatura de funcționare (în simulator încălzirea poate fi accelerată).", "Urmăriți pe tester: presiunea reală urmărește presiunea cerută; turația de ralanti scade la rece → cald."],
    ver: () => [[sim.merge, "motor pornit"], [sim.ect >= 80, `lichid de răcire ${fx(sim.ect, 0)} °C`]],
    prog: () => sim.ect >= 80 ? 1 : 0, tot: 1,
    ctl: `<button type="button" class="lat" id="b-rapid">⏩ Încălzire accelerată (simulare ×160)</button>` },
  { t: "Presiunea în regim stabilizat", tab: "Tabelul 3.1", panou: "obd",
    instr: ["Rândul „antrenare”: opriți motorul, apoi apăsați „Pornește (demaror)” și înregistrați în timpul antrenării (primele ≈ 2,5 s).", "La ralanti cald, 1500, 2000, 2500 și 3000 rot/min așteptați stabilizarea (≈ 3 s) și înregistrați p cerută, p reală și comanda IMV."],
    ver: () => [[sim.ect >= 80, "motor cald"], [sim.cr || sim.merge, sim.cr ? "antrenare în curs" : sim.merge ? `regim: ${ET_REG[sim.reg]}` : "motor oprit"], [sim.cr || stabil(), "regim stabilizat"]],
    prog: () => MD.CHEI.filter(k => pe("t31", k, "pr")).length, tot: 6,
    ctl: `<div class="rand-butoane"><button type="button" id="b-porn2">Pornește (demaror)</button><button type="button" id="b-stop2">Oprește</button></div>
      <div class="rand-butoane">${["ral", "n1500", "n2000", "n2500", "n3000"].map(k => `<button type="button" data-reg="${k}">${ET_REG[k]}</button>`).join("")}</div>`,
    buton: ["● p cerută, p reală, IMV → Tabelul 3.1", e => inregStat(e)] },
  { t: "Răspunsul dinamic al reglajului", tab: "Tabelul 3.2", panou: "obd",
    instr: ["La ralanti cald porniți înregistrarea (RUN) și apăsați „Accelerare bruscă” (presiunea cerută sare la valoarea de sarcină).", "După stabilizare (≈ 3 s) apăsați „Decelerare”; după încă ≈ 3 s apăsați STOP.", "Pentru fiecare treaptă: cursorul A pe momentul saltului presiunii cerute, cursorul B unde presiunea reală atinge linia de 90 % → înregistrați."],
    ver: () => [[sim.ect >= 80 && sim.merge, "motor cald, pornit"], [sim.log.stop, "înregistrarea oprită (STOP)"], [sim.log.A !== null && sim.log.B !== null, "cursoarele A și B așezate"]],
    prog: () => ["acc", "dec"].filter(k => pe("t32", k, "tr")).length, tot: 2,
    ctl: `<div class="rand-butoane"><button type="button" class="primar" id="b-acc">Accelerare bruscă</button><button type="button" id="b-dec">Decelerare (ralanti)</button></div>
      <div class="rand-butoane"><button type="button" id="b-logrun">RUN / STOP înregistrare</button></div>`,
    buton: ["● Treapta dintre cursoare → Tabelul 3.2", e => inregDyn(e)] },
  { t: "Profilul injecției la cald", tab: "Tabelul 3.3", panou: "osc",
    instr: ["Ralanti cald, 2000 rot/min și în timpul accelerării (după „Accelerare bruscă”): numărați injecțiile și măsurați cu cursoarele Δt pre–principală și durata principalei.", "Observați: la turație mare numărul injecțiilor scade, iar unghiul Δφ al aceluiași Δt crește."],
    ver: () => [[sim.cleste, "cleștele montat"], [sim.merge && sim.ect >= 80, "motor cald"], [!!regInj() && regInj() !== "rr", regInj() ? `regim: ${{ rc: "ralanti cald", n2000: "2000 rot/min", acc: "accelerare" }[regInj()] || "—"}` : "alegeți ralanti, 2000 sau accelerare"]],
    prog: () => ["rc", "n2000", "acc"].reduce((s, k) => s + ["dt", "ti"].filter(c => pe("t33", k, c)).length, 0), tot: 6,
    ctl: `<div class="rand-butoane"><button type="button" data-reg2="ral">ralanti</button><button type="button" data-reg2="n2000">2000 rot/min</button><button type="button" data-reg2="acc">accelerare</button></div>` + ctlOsc("2"),
    buton: null },
  { t: "Încheierea", tab: "oprire, demontare", panou: "schema",
    instr: ["Opriți motorul, luați contactul și abia apoi demontați cleștele de curent și testerul."],
    ver: () => [[!sim.merge, "motor oprit"], [!sim.contact, "contact luat"], [!sim.cleste, "cleștele demontat"]],
    prog: () => (!sim.merge && !sim.contact && !sim.cleste && Cadru.D.log.length > 0) ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><button type="button" id="b-stop3">Oprește motorul</button><button type="button" id="b-contact3">Contact</button><button type="button" id="b-cl2">Demontează cleștele</button></div>` }
];
function ctlOsc(s = "") {
  return `<div class="rand-butoane"><button type="button" data-osc="run">RUN / STOP osciloscop</button><button type="button" data-osc="tdiv">Timp/div</button></div>
    <label class="camp">Injecții pe ciclu (numărate) <select data-nr="${s}">${["", 1, 2, 3, 4, 5].map(v => `<option>${v}</option>`).join("")}</select></label>
    <div class="pas-but"><button type="button" class="primar lat" data-ri="dt">● Δt pre–principală (A–B) → Tabelul 3.3</button><button type="button" class="primar lat" data-ri="ti">● Durata principalei (A–B) → Tabelul 3.3</button></div>`;
}
let pasActiv = 0;
function stabil() { const B = sim.log.buf; if (!sim.merge || B.length < 60) return false; const u = B.slice(-60); return Math.abs(u[u.length - 1][1] - RPM[sim.reg]) < 40 && Math.max(...u.map(r => r[3])) - Math.min(...u.map(r => r[3])) < 0.03 * sim.pc + 6; }
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small>${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol><ul class="pas-ver"></ul><div class="pas-ctl">${p.ctl}</div>${p.buton ? `<button type="button" class="primar lat" data-inreg="${i}">${p.buton[0]}</button>` : ""}</div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].buton[1](e); actualizeazaPasi(); }));
  legaComenzi(); alegePas(0);
}
function alegePas(i) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$(".instr").forEach(el => { el.hidden = el.dataset.panou !== p.panou && !(el.dataset.panou === "schema" && p.panou !== "schema" && false); });
  desenLog(); desenOsc(); actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (sel, on, t1, t0) => $$(sel).forEach(b => { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); });
  s("#b-obd", sim.obd, "✓ Tester OBD conectat", "Conectează testerul OBD"); s("#b-cl", sim.cleste, "✓ Clește pe inj. 1", "Montează cleștele pe inj. 1");
  s("#b-contact, #b-contact3", sim.contact, "Contact: pus", "Contact: luat"); s("#b-logrun", !sim.log.stop, "STOP înregistrare", "RUN înregistrare");
  $$("[data-reg]").forEach(b => b.classList.toggle("activ", sim.merge && sim.reg === b.dataset.reg)); $$("[data-reg2]").forEach(b => b.classList.toggle("activ", sim.merge && sim.reg === b.dataset.reg2));
  $("#af-st").textContent = sim.cr ? "antrenare" : sim.merge ? ET_REG[sim.reg] : sim.contact ? "contact pus" : "contact luat";
  $("#af-n").textContent = fx(sim.n, 0); $("#af-T").textContent = fx(sim.ect, 0);
  $("#af-pc").textContent = sim.merge || sim.cr ? fx(sim.pc, 0) : "—"; $("#af-p").textContent = fx(sim.p, 0); $("#af-imv").textContent = sim.merge || sim.cr ? fx(sim.imv, 1) : "—";
}

/* ------------------------------------------------------------------ comenzile */
function porneste() {
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie");
  if (sim.merge || sim.cr) return;
  sim.cr = true; sim.tCr = 0; sim.reg = "ral";
}
function opreste() { sim.merge = false; sim.cr = false; }
function legaComenzi() {
  const on = (sel, f) => $$(sel).forEach(b => b.addEventListener("click", () => { f(b); actualizeazaPasi(); }));
  $("#ck-och").addEventListener("change", e => { sim.ochelari = e.target.checked; actualizeazaPasi(); });
  $("#ck-rac").addEventListener("change", e => { sim.racorduri = e.target.checked; actualizeazaPasi(); });
  on("#b-obd", () => { if (sim.contact) return Cadru.mesajTemporar("Testerul se conectează cu contactul luat.", "atentie"); sim.obd = !sim.obd; });
  const clamp = () => { if (sim.merge || sim.contact) return Cadru.mesajTemporar("NSSM: cleștele se montează / demontează numai cu motorul oprit și contactul întrerupt.", "pericol"); sim.cleste = !sim.cleste; };
  on("#b-cl, #b-cl2", clamp);
  on("#b-contact, #b-contact3", () => { if (sim.cr) return; sim.contact = !sim.contact; if (!sim.contact) opreste(); });
  on("#b-porn, #b-porn2", porneste); on("#b-stop, #b-stop2, #b-stop3", opreste);
  on("#b-rapid", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); sim.rapid = 160; });
  on("[data-reg]", b => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); sim.reg = b.dataset.reg; });
  on("[data-reg2]", b => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); sim.reg = b.dataset.reg2; });
  on("#b-acc", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); if (sim.reg !== "ral") return Cadru.mesajTemporar("Accelerarea bruscă se face de la ralanti.", "atentie"); if (sim.log.stop) { sim.log.stop = false; sim.log.A = sim.log.B = null; } sim.reg = "acc"; });
  on("#b-dec", () => { if (!sim.merge) return; sim.reg = "ral"; });
  on("#b-logrun", () => { const L = sim.log; L.stop = !L.stop; if (!L.stop) { L.A = L.B = null; } desenLog(); });
  on("[data-osc]", b => { const o = sim.osc; if (b.dataset.osc === "run") o.run = !o.run; else { o.tdiv = TDIVS[(TDIVS.indexOf(o.tdiv) + 1) % TDIVS.length]; o.A = Math.min(o.A, o.tdiv * 10); o.B = Math.min(o.B, o.tdiv * 10); } desenOsc(); });
  $$("[data-ri]").forEach(b => b.addEventListener("click", e => { inregInj(e, b.dataset.ri, b.closest(".pas-ctl").querySelector("[data-nr]").value); actualizeazaPasi(); }));
  $("#svg-schema").addEventListener("click", e => { const g = e.target.closest("[data-comp]"); if (!g) return; const k = g.dataset.comp; sim.ident.add(k); $("#comp-info").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}`; $("#comp-info2").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}`; actualizeazaPasi(); });
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregStat(e) {
  if (!sim.obd) return Cadru.mesajTemporar("Conectați testerul OBD.", "atentie");
  let k;
  if (sim.cr) { if (sim.tCr < 1.2) return Cadru.mesajTemporar("Așteptați creșterea presiunii la antrenare (≈ 1 s).", "atentie"); k = "antr"; }
  else { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul (sau antrenați pentru rândul „antrenare”).", "atentie"); if (sim.ect < 80) return Cadru.mesajTemporar("Încălziți motorul (≥ 80 °C).", "atentie"); if (sim.reg === "acc") return; if (!stabil()) return Cadru.mesajTemporar("Așteptați stabilizarea turației și a presiunii.", "atentie"); k = sim.reg; }
  const u = sim.log.buf.slice(-40), med = i => u.reduce((s, r) => s + r[i], 0) / u.length;
  const pc = Math.round(med(2)), pr = Math.round(med(3)), imv = Math.round(med(4) * 10) / 10, n = Math.round(med(1) / 10) * 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "stat", reg: k, n, pc, pr, imv }, celule: [{ t: "t31", r: k, c: "n", v: String(n) }, { t: "t31", r: k, c: "pc", v: String(pc) }, { t: "t31", r: k, c: "pr", v: String(pr) }, { t: "t31", r: k, c: "imv", v: imv.toFixed(1) }] });
  if (ok) msg(`Tabelul 3.1 (${ET_REG[k]}): p cerută ${pc} bar, p reală ${pr} bar, IMV ${fx(imv, 1)} %.`);
}
function inregDyn(e) {
  const L = sim.log; if (!L.stop || L.A === null || L.B === null) return Cadru.mesajTemporar("Opriți înregistrarea (STOP) și așezați cursoarele A și B.", "atentie");
  const c = citireLog(); if (c.dt <= 0) return Cadru.mesajTemporar("Cursorul A trebuie să fie înaintea lui B.", "atentie");
  if (Math.abs(c.pf - c.a[2]) < 200) return Cadru.mesajTemporar("Între A și B nu există un salt al presiunii cerute: A trebuie pus chiar pe momentul comenzii.", "atentie");
  if (Math.abs(Math.max(c.pf, c.a[2]) - P().pAcc) > 25) return Cadru.mesajTemporar("Analizați treptele produse de „Accelerare bruscă” (ralanti → sarcină) și „Decelerare” (sarcină → ralanti).", "atentie");
  const tip = c.pf > c.a[2] ? "acc" : "dec", p0 = Math.round(c.p0), pf = Math.round(c.pf), pmax = Math.round(c.ext), tr = Math.round(c.dt * 1000) / 1000;
  const ok = Cadru.inregistreaza(e, { log: { m: "dyn", tip, p0, pf, pmax, tr }, celule: [{ t: "t32", r: tip, c: "p0", v: String(p0) }, { t: "t32", r: tip, c: "pf", v: String(pf) }, { t: "t32", r: tip, c: "pmax", v: String(pmax) }, { t: "t32", r: tip, c: "tr", v: tr.toFixed(3) }] });
  if (ok) msg(`Tabelul 3.2 (${tip === "acc" ? "accelerare" : "decelerare"}): p₀ = ${p0}, p cerut final = ${pf}, p ${tip === "acc" ? "max" : "min"} = ${pmax} bar, t_r = ${fx(tr, 3)} s.`);
}
function inregInj(e, col, nr) {
  const o = sim.osc, k = o.k;
  if (!sim.cleste || !o.prof || !k) return Cadru.mesajTemporar("Cleștele montat, motorul la ralanti (rece sau cald), la 2000 rot/min sau în accelerare.", "atentie");
  if (k === "rr" && pasActiv !== 1) return Cadru.mesajTemporar("Motorul este încă rece: acesta este rândul „ralanti rece” (pasul 2).", "atentie");
  if (!nr) return Cadru.mesajTemporar("Alegeți numărul de injecții pe ciclu numărate pe ecran.", "atentie");
  const v = Math.round(Math.abs(o.B - o.A) * 1e6) / 1000;
  const ok = Cadru.inregistreaza(e, { log: { m: col, reg: k, v, nr: +nr, n: Math.round(o.n) }, celule: [{ t: "t33", r: k, c: col, v: v.toFixed(3) }, { t: "t33", r: k, c: "nr", v: String(nr) }, { t: "t33", r: k, c: "n", v: String(Math.round(o.n / 10) * 10) }] });
  if (ok) msg(`Tabelul 3.3 (${{ rr: "ralanti rece", rc: "ralanti cald", n2000: "2000 rot/min", acc: "accelerare" }[k]}): ${col === "dt" ? "Δt pre–principală" : "durata principalei"} = ${fx(v, 3)} ms, ${nr} injecții/ciclu.`);
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaSAA3(D) {
  const t = D.t, cel = { t31: {}, t32: {}, t33: {} }, rele = { t31: {}, t32: {} }, pc = [], pr = [];
  MD.CHEI.forEach(k => { const a = num(t.t31[k].pc), b = num(t.t31[k].pr), d = (b - a) / a * 100; cel.t31[k] = { dp: Number.isFinite(d) ? (d > 0 ? "+" : "") + fx(d, 2) : "" }; rele.t31[k] = { dp: Math.abs(d) > 5 && k !== "antr" };
    const n = num(t.t31[k].n); if (Number.isFinite(n) && Number.isFinite(a)) pc.push([n, a]); if (Number.isFinite(n) && Number.isFinite(b)) pr.push([n, b]); });
  ["acc", "dec"].forEach(k => { const r = t.t32[k], pf = num(r.pf), pm = num(r.pmax), p0 = num(r.p0), s = (pm - pf) / pf * 100 * (k === "dec" ? -1 : 1);
    cel.t32[k] = { sig: Number.isFinite(s) ? fx(Math.max(0, s), 1) : "", es: k === "acc" ? (Number.isFinite(num(t.t31.n3000.pr)) ? "vezi Tabelul 3.1" : "") : "" };
    rele.t32[k] = { sig: s > 10 }; void p0; });
  Object.keys(MD.INJ).forEach(k => { const n = num(t.t33[k].n), dt = num(t.t33[k].dt), f = 6e-3 * n * dt; cel.t33[k] = { dphi: Number.isFinite(f) ? fx(f, 2) : "" }; });
  const rez = [
    ["Abaterea staționară medie Δp (ralanti cald … 3000 rot/min)", (() => { const v = ["ral", "n1500", "n2000", "n2500", "n3000"].map(k => { const a = num(t.t31[k].pc), b = num(t.t31[k].pr); return (b - a) / a * 100; }).filter(Number.isFinite); return v.length ? `${fx(v.reduce((x, y) => x + y, 0) / v.length, 2)} %` : "—"; })()],
    ["Suprareglajul și timpul de răspuns la accelerare", Number.isFinite(num(t.t32.acc.tr)) ? `σ = ${cel.t32.acc.sig} %, t<sub>r</sub> = ${fx(num(t.t32.acc.tr), 3)} s` : "—"],
    ["Unghiul pre-injecție – principală la ralanti cald / 2000 rot/min", `${cel.t33.rc.dphi || "—"} / ${cel.t33.n2000.dphi || "—"} °RAC`]
  ];
  const verdicte = [];
  if (Number.isFinite(num(t.t32.acc.tr)) && Number.isFinite(num(t.t32.dec.tr))) verdicte.push({ tip: "ok", text: `Creșterea presiunii (t<sub>r</sub> = ${fx(num(t.t32.acc.tr), 2)} s) este mai rapidă decât scăderea (${fx(num(t.t32.dec.tr), 2)} s): la creștere pompa debitează cu IMV deschis, la scădere presiunea scade numai prin injecții și prin scăpările de comandă ale injectoarelor (sistemul Delphi nu are regulator de descărcare pe rampă).` });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Presiunea cerută și presiunea reală în rampă în funcție de turație (Tabelul 3.1)",
    grafic: { xmin: 0, xmax: 3200, ymin: 0, ymax: 1400, xlab: "n [rot/min]", ylab: "p [bar]", serii: [{ tip: "linie", pts: pc.sort((a, b) => a[0] - b[0]), culoare: 1, punctat: true }, { tip: "pct", pts: pr, culoare: 0, r: 5 }, { tip: "linie", pts: pr.slice().sort((a, b) => a[0] - b[0]), culoare: 0 }] },
    legenda: [["p cerută", "var(--serie-1)"], ["p reală", "var(--serie-0)"]],
    principal: { eticheta: "t<sub>r</sub> accelerare [s]", valoare: Number.isFinite(num(t.t32.acc.tr)) ? num(t.t32.acc.tr) : null }
  };
}

/* ------------------------------------------------------------------ figura răspunsului (teorie) */
function figRaspuns() {
  const W = 680, H = 230, X = t => 50 + t / 2 * 280, Y = p => 200 - p / 1500 * 175;
  let a = "", b = "", ps = 300, v = 0, p = 300; for (let i = 0; i <= 400; i++) { const t = i / 200; const pc = t < 0.2 ? 300 : 1300; if (i) { for (let k = 0; k < 10; k++) { const ac = 14 * 14 * (pc - p) - 2 * 0.6 * 14 * v; v += ac * 0.0005; p += v * 0.0005; } } a += (i ? "L" : "M") + X(t).toFixed(1) + "," + Y(pc).toFixed(1); b += (i ? "L" : "M") + X(t).toFixed(1) + "," + Y(p).toFixed(1); }
  void ps;
  const XI = t => 400 + t / 4 * 260, YI = I => 200 - I / 22 * 160, L = [[0.4, 0.22], [1.8, 0.5]];
  let c = ""; for (let i = 0; i <= 500; i++) { const tm = i / 500 * 4; let I = 0; for (const [t0, d] of L) { const u = tm - t0; if (u < 0) continue; if (u <= d) I += u < Math.min(d, 0.16) ? 19 * (1 - Math.exp(-u / 0.035)) : 10.5; else I += (d <= 0.16 ? 19 : 10.5) * Math.exp(-(u - d) / 0.02); } c += (i ? "L" : "M") + XI(tm).toFixed(1) + "," + YI(I).toFixed(1); }
  return `<svg viewBox="0 0 ${W} ${H}" class="fig-svg" role="img" aria-label="Fig. 3.2"><g font-size="10" fill="currentColor">
  ${[0, 500, 1000, 1500].map(q => `<line x1="50" y1="${Y(q)}" x2="330" y2="${Y(q)}" stroke="currentColor" opacity=".15"/><text x="44" y="${Y(q) + 3}" text-anchor="end">${q}</text>`).join("")}
  <path d="${a}" fill="none" stroke="#8a929b" stroke-width="1.6" stroke-dasharray="5 3"/><path d="${b}" fill="none" stroke="#1f5f9e" stroke-width="2"/><text x="190" y="220" text-anchor="middle">t [s] – p cerută (punctat) și p reală</text>
  <path d="${c}" fill="none" stroke="#c0492b" stroke-width="1.8"/><text x="530" y="220" text-anchor="middle">t [ms] – curentul injectorului: pre-injecție + principală</text>
  <text x="${XI(0.5)}" y="${YI(21)}" text-anchor="middle">pre</text><text x="${XI(2.05)}" y="${YI(21)}" text-anchor="middle">principală</text><text x="${XI(1.1)}" y="${YI(14)}" text-anchor="middle">Δt</text></g></svg>`;
}

/* ------------------------------------------------------------------ conținutul didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li><b>PERICOL – ÎNALTĂ PRESIUNE</b> (până la 1600…2000 bar): se interzice slăbirea oricărui racord de înaltă presiune; un jet de motorină sub presiune poate penetra pielea și provoca leziuni grave. Lucrarea nu presupune intervenții pe circuitul de combustibil.</li>
<li>Injectoarele piezoelectrice sunt comandate cu tensiuni de până la ≈ 200 V: conectorii injectoarelor nu se desfac, iar cleștele de curent se montează pe cablul injectorului numai cu motorul oprit și contactul întrerupt.</li>
<li>Turbosuflanta și colectorul de evacuare ating temperaturi foarte mari: cablurile osciloscopului și ale cleștelui se fixează departe de ele și de curea.</li>
<li>Accelerările bruște se fac numai la comanda cadrului didactic, fără a depăși turația prescrisă pentru stand.</li></ul></div>
<h2>3.1. Scopul lucrării</h2>
<p>Determinarea caracteristicii presiunii în rampă în funcție de turație, a răspunsului dinamic al reglajului de presiune (timp de răspuns, suprareglaj) și a caracteristicii regulatorului de debit; vizualizarea profilului injecției multiple și a modului în care numărul de injecții pe ciclu variază cu regimul.</p>
<h2>3.2. Noțiuni teoretice</h2>
<p>La sistemul common-rail generarea presiunii este separată de injecție: pompa de înaltă presiune alimentează o rampă comună, din care injectoarele comandate electric injectează de mai multe ori pe ciclu. ECU citește presiunea cerută dintr-o hartă, în funcție de turație și de debitul injectat, și o reglează în buclă închisă pe baza senzorului de presiune din rampă (semnal ≈ 0,5…4,5 V), acționând regulatorul de debit de la pompă (IMV, comandă PWM) și, la unele sisteme, un regulator de presiune pe rampă.</p>
<figure><svg viewBox="0 0 900 312" class="fig-svg schema-fig" role="img" aria-label="Fig. 3.1">${schemaSVG()}</svg><figcaption>Fig. 3.1. Schema sistemului common-rail și punctele de măsură (în simulator schema este animată și se poate da clic pe componente)</figcaption></figure>
<p>Calitatea reglajului se apreciază prin răspunsul la o variație bruscă a presiunii cerute: timpul de răspuns t<sub>r</sub> (până la atingerea a 90 % din variația cerută), suprareglajul σ și eroarea staționară.</p>
<div class="ec"><span>σ = (p<sub>max</sub> − p<sub>cerut</sub>)/p<sub>cerut</sub>·100 [%]</span><span class="nr">(3.1)</span></div>
<div class="ec"><span>Δp = (p<sub>real</sub> − p<sub>cerut</sub>)/p<sub>cerut</sub>·100 [%]</span><span class="nr">(3.2)</span></div>
<p>Injecția este împărțită în una sau două pre-injecții (reduc viteza de creștere a presiunii în cilindru, deci zgomotul de ardere și NO<sub>x</sub>), injecția principală și post-injecții (reduc funinginea și, la nevoie, ridică temperatura gazelor pentru regenerarea filtrului de particule). Numărul injecțiilor este mai mare la ralanti și la rece și scade la turații mari, unde timpul disponibil pe ciclu este mic. Pe oscilograma curentului unui injector cu electrovalvă fiecare injecție apare ca un vârf de atragere urmat de un palier de menținere; distanța în timp dintre injecții se transformă în unghi de rotație al arborelui cotit:</p>
<div class="ec"><span>Δφ = 6·10<sup>−3</sup>·n·Δt [°RAC] (n în rot/min, Δt în ms)</span><span class="nr">(3.3)</span></div>
<figure>${figRaspuns()}<figcaption>Fig. 3.2. Răspunsul presiunii în rampă la o accelerare bruscă și profilul curentului unui injector (valori exemplificative)</figcaption></figure>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Tipul sistemului pe standul 1.5 dCi (K9K).</b> Motorul K9K a fost echipat fie cu sistemul Delphi (injectoare cu electrovalvă, pompă DFP1 cu regulator de debit IMV, fără regulator de presiune pe rampă), fie cu sistemul Continental/Siemens (injectoare piezoelectrice, pompă cu regulator de volum VCV și regulator de presiune PCV pe pompă). Simulatorul reproduce varianta Delphi; la injectoarele piezo oscilograma de curent arată un impuls de încărcare la deschidere și unul de descărcare (de semn opus) la închidere, nu un palier de menținere, iar tensiunea de comandă ajunge la 100…200 V.</li>
<li><b>Comanda IMV.</b> La Delphi regulatorul IMV este <i>normal deschis</i>: factorul de umplere (curentul) mai mare închide valva. De aceea comanda IMV <i>scade</i> când crește debitul cerut (turație și presiune mai mari) și este minimă la antrenare (valva complet deschisă pentru creșterea rapidă a presiunii). La sistemele cu regulator normal închis tendința este inversă.</li>
<li><b>Eroarea staționară.</b> Relația (3.2) se aplică în regim stabilizat; la antrenare presiunea reală este sistematic sub cea cerută (pompa se rotește cu ≈ 120 rot/min), iar ECU nu permite injecția sub un prag minim (≈ 150…200 bar).</li>
<li><b>Răspunsul la decelerare.</b> La sistemele fără regulator de descărcare, presiunea scade numai prin injecții și prin scăpările de comandă ale injectoarelor, deci mai lent decât crește; la decelerare suprareglajul (subreglajul) este practic zero, iar t<sub>r</sub> se măsoară până la 90 % din scădere.</li>
<li><b>Timpul de răspuns</b> se măsoară de la momentul comenzii (saltul presiunii cerute în înregistrarea testerului), nu de la apăsarea pedalei; înregistrarea testerului OBD are 20…50 de valori pe secundă, deci t<sub>r</sub> are o incertitudine de ≈ 0,02…0,05 s – pentru valori precise se folosește semnalul senzorului de presiune pe osciloscop.</li>
<li><b>Durata injecției</b> măsurată pe curent (durata comenzii) este mai mare decât durata reală a jetului: acul se ridică cu o întârziere de ≈ 0,1…0,2 ms și se închide cu întârziere după tăierea curentului. Numărul și pozițiile injecțiilor depind de calibrare (temperatura lichidului, sarcina, regenerarea DPF).</li></ul></div>
<h2>3.4. Modul de lucru (în simulator)</h2>
<p>Panoul „Desfășurarea lucrării” conduce lucrarea în șapte pași: pregătirea și identificarea componentelor, profilul injecției la ralanti rece, încălzirea, presiunea în regim stabilizat (Tabelul 3.1), răspunsul dinamic cu înregistrarea testerului și cursoare (Tabelul 3.2), profilul injecției la cald (Tabelul 3.3) și încheierea.</p>
<h2>3.7. Interpretarea rezultatelor</h2>
<ul><li>Presiunea cerută crește cu turația și sarcina; în regim stabilizat presiunea reală o urmărește cu abateri de câteva procente.</li>
<li>La o accelerare bruscă timpul de răspuns este de ordinul zecimilor de secundă, iar suprareglajul este mic; un răspuns lent limitează cuplul disponibil la accelerare.</li>
<li>La ralanti apar de regulă 1–2 pre-injecții și injecția principală; la turații mari numărul lor scade. Valorile depind de calibrarea motorului.</li></ul>
<h2>3.8. Relevanță practică</h2>
<p>Reglarea presiunii și strategia de injecție multiplă sunt principalele mijloace de reducere a zgomotului și a emisiilor la motoarele diesel și o temă actuală de cercetare pentru Euro 7. Diagnoza injectoarelor (corecții pe cilindri, testul de retur) se face la disciplina Diagnosticarea autovehiculelor.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>La n = 800 rot/min, un interval de 1,5 ms între pre-injecție și injecția principală corespunde unui unghi:</p>
<div class="ec"><span>Δφ = 6·10<sup>−3</sup>·800·1,5 = 7,2 °RAC</span><span class="nr">(3.4)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Presiunea cerută sare de la 300 la 1350 bar; presiunea reală atinge maximul de 1430 bar și se stabilizează la 1335 bar. Calculați σ și Δp.</p><details class="sol"><summary>Rezolvare</summary><p>σ = (1430 − 1350)/1350·100 = 5,9 %; Δp = (1335 − 1350)/1350·100 = −1,1 %.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Cât reprezintă 1 ms la 3000 rot/min? Dar 0,7 ms la 2000 rot/min?</p><details class="sol"><summary>Rezolvare</summary><p>Δφ = 6·10<sup>−3</sup>·3000·1 = 18 °RAC; 6·10<sup>−3</sup>·2000·0,7 = 8,4 °RAC.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>La ralanti cald comanda IMV este 42 %, la 3000 rot/min 24 %. Ce tip de regulator are sistemul?</p><details class="sol"><summary>Rezolvare</summary><p>Comanda scade când debitul necesar crește → regulator normal deschis (Delphi IMV): curentul mai mic deschide mai mult valva.</p></details></div>`;
}
const INTREBARI = [
  ["De ce presiunea cerută în rampă crește cu turația și sarcina?", "Timpul disponibil pentru injecție scade cu turația, iar debitul injectat crește cu sarcina; pentru a injecta mai mult combustibil într-un timp mai scurt și cu o pulverizare fină (picături mici, amestec rapid cu aerul) este necesară o presiune mai mare."],
  ["Ce factori influențează timpul de răspuns al reglajului de presiune?", "Debitul maxim al pompei (turația ei), volumul rampei și al conductelor (capacitatea hidraulică), modulul de elasticitate al motorinei (temperatura), dinamica regulatorului IMV și parametrii regulatorului din ECU; la scădere – debitul injectat și scăpările injectoarelor."],
  ["Cum reduce pre-injecția zgomotul de ardere?", "Arde o cantitate mică de combustibil înaintea injecției principale și încălzește încărcătura; întârzierea la autoaprindere a principalei scade, se ard mai puține picături acumulate, iar viteza de creștere a presiunii (dp/dφ) și vârful de presiune sunt mai mici."],
  ["De ce numărul de injecții pe ciclu scade la turații mari?", "Fereastra unghiulară de injecție corespunde unui timp tot mai scurt; injectorul are un timp minim între comenzi (închidere–redeschidere) și o durată minimă de comandă, deci nu mai încap toate injecțiile. În plus, la sarcini mari zgomotul de ardere este mascat de celelalte zgomote."],
  ["Cât reprezintă, în grade de rotație a arborelui cotit, un interval de 1 ms la 3000 rot/min?", "Δφ = 6·10<sup>−3</sup>·3000·1 = 18 °RAC."]
];
const TEST = [
  { q: "La 2000 rot/min, Δt = 0,8 ms corespunde la:", o: ["1,6 °RAC", "9,6 °RAC", "16 °RAC", "0,96 °RAC"], c: 1, e: "6·10<sup>−3</sup>·2000·0,8." },
  { q: "Suprareglajul pentru p<sub>cerut</sub> = 1200 bar și p<sub>max</sub> = 1290 bar:", o: ["7,5 %", "6,9 %", "90 %", "0,75 %"], c: 0, e: "90/1200." },
  { q: "IMV-ul Delphi este:", o: ["normal închis", "normal deschis", "un regulator de presiune pe rampă", "un senzor"], c: 1, e: "Curentul mai mare închide valva." },
  { q: "Pe curentul unui injector cu electrovalvă se vede:", o: ["numai un palier constant", "vârf de atragere urmat de palier de menținere", "impulsuri de 200 V", "o sinusoidă"], c: 1, e: "Atragerea rapidă a armăturii cere curent mare; menținerea – curent mai mic." },
  { q: "Post-injecția servește la:", o: ["reducerea zgomotului de ardere", "arderea funinginii și creșterea temperaturii pentru regenerarea DPF", "pornirea la rece", "răcirea injectorului"], c: 1, e: "Reduce funinginea și ridică temperatura gazelor." },
  { q: "De ce presiunea scade mai lent decât crește la sistemul Delphi?", o: ["pompa se oprește", "nu există regulator de descărcare: presiunea scade doar prin injecții și scăpări", "senzorul este lent", "ECU întârzie comanda"], c: 1, e: "Fără supapă de descărcare pe rampă." }
];

/* ------------------------------------------------------------------ definiția lucrării */
const CSS = `<style>
.saa3-scena .instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; }
#svg-schema { width:100%; height:auto; display:block; color:var(--text); }
.cr-comp { cursor:pointer; } .cr-comp:hover { filter:drop-shadow(0 0 4px #1477d1); } .cr-comp.ident { filter:drop-shadow(0 0 2px #2e9e44); }
.saa3-afis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.saa3-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .saa3-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .saa3-afis b { font-size:1.05rem; }
#cv-log, #cv-osc { width:100%; display:block; border-radius:8px; cursor:crosshair; touch-action:none; }
#log-cit, #osc-cit { font-size:.86rem; min-height:1.3em; }
.tk-pasi .pasi { list-style:none; margin:.4rem 0; padding:0; display:grid; gap:.45rem; }
.pas { border:1px solid var(--linie); border-radius:8px; background:var(--suprafata); }
.pas.activ { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.pas-cap { width:100%; display:flex; gap:.5rem; align-items:center; text-align:left; background:none; border:0; padding:.5rem .6rem; font:600 .9rem system-ui,sans-serif; color:var(--text); cursor:pointer; }
.pas-cap small { font-weight:400; color:var(--text-sec); }
.pas-nr { flex:0 0 1.6rem; height:1.6rem; border-radius:50%; display:grid; place-items:center; background:var(--suprafata-2); font-size:.8rem; }
.pas.gata .pas-nr { background:#2e9e44; color:#fff; } .pas.activ .pas-nr { background:var(--accent); color:#fff; }
.pas-prog { margin-left:auto; font:600 .75rem system-ui; color:var(--text-sec); white-space:nowrap; }
.pas-corp { padding:0 .6rem .6rem; font-size:.86rem; } .pas:not(.activ) .pas-corp { display:none; }
.pas-corp ol { margin:.2rem 0 .4rem; padding-left:1.2rem; } .pas-corp li { margin:.15rem 0; }
.pas-ver { list-style:none; padding:0 !important; margin:.3rem 0 .5rem !important; font-size:.82rem; }
.pas-ver li::before { content:"○ "; color:var(--text-sec); } .pas-ver li.ok::before { content:"✓ "; color:#2e9e44; font-weight:700; } .pas-ver li.ok { color:var(--text-sec); }
.pas-ctl .rand-butoane { margin:.3rem 0; } .pas-ctl button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); }
.pas-but { display:flex; flex-direction:column; gap:.35rem; margin-top:.35rem; }
.fig-svg { width:100%; max-width:760px; height:auto; color:var(--text); }
.sim-grila:fullscreen .saa3-scena, .sim-grila.ecran-plin .saa3-scena { display:block; }
@media (max-width:900px){ .saa3-afis { grid-template-columns:repeat(3,minmax(0,1fr)); } }
</style>`;
Cadru.porneste({
  disc: "SAA", nr: 3, cod: "saa-l3",
  titlu: "Sistemul de injecție common-rail – reglarea presiunii în rampă și injecția multiplă",
  scurt: "Injecția common-rail",
  subtitlu: "Laborator virtual – standul 1.5 dCi (Delphi DCR): tester OBD cu înregistrare, osciloscop cu clește de curent",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261025); },
  date: [{ k: "motor", et: "Motorul", v: "1.5 dCi K9K", fix: true, text: true }, { k: "sistem", et: "Sistemul de injecție", v: "Delphi DCR, injectoare cu electrovalvă", fix: true, text: true }],
  tabele: [
    { id: "t31", titlu: "Tabelul 3.1. Presiunea în rampă în regim stabilizat", antetRand: "Regim",
      randuri: MD.CHEI.map(k => ({ k, et: ET_REG[k] })),
      coloane: [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "pc", t: "p cerută [bar]", intrare: true }, { k: "pr", t: "p reală [bar]", intrare: true }, { k: "dp", t: "Δp [%]" }, { k: "imv", t: "IMV DC [%]", intrare: true }, { k: "obs", t: "Observații", intrare: true, tip: "select", optiuni: ["regim stabil", "presiune sub cea cerută (antrenare)", "oscilații"], manualEval: true }] },
    { id: "t32", titlu: "Tabelul 3.2. Răspunsul dinamic al reglajului de presiune", antetRand: "Treapta",
      randuri: [{ k: "acc", et: "accelerare" }, { k: "dec", et: "decelerare" }],
      coloane: [{ k: "p0", t: "p inițial [bar]", intrare: true }, { k: "pf", t: "p cerut final [bar]", intrare: true }, { k: "pmax", t: "p maxim / minim [bar]", intrare: true }, { k: "tr", t: "t<sub>r</sub> (90 %) [s]", intrare: true }, { k: "sig", t: "σ [%]" }, { k: "es", t: "Eroare staționară" }] },
    { id: "t33", titlu: "Tabelul 3.3. Profilul injecției", antetRand: "Regim",
      randuri: [{ k: "rr", et: "ralanti rece" }, { k: "rc", et: "ralanti cald" }, { k: "n2000", et: "2000 rot/min" }, { k: "acc", et: "accelerare" }],
      coloane: [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "nr", t: "Nr. injecții / ciclu", intrare: true }, { k: "dt", t: "Δt pre–principală [ms]", intrare: true }, { k: "dphi", t: "Δφ [°RAC]" }, { k: "ti", t: "Durata injecției principale [ms]", intrare: true }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaSAA3,
  intrebari() {
    return [
      { id: "q1", u: "°RAC", text: "Unghiul dintre pre-injecție și injecția principală la 2000 rot/min (Tabelul 3.3, relația 3.3):", textSimplu: "Δφ la 2000 rot/min" },
      { id: "q2", u: "%", text: "Suprareglajul σ al presiunii la accelerarea bruscă (Tabelul 3.2):", textSimplu: "Suprareglajul la accelerare" },
      { id: "q3", u: "s", text: "Timpul de răspuns t<sub>r</sub> (90 %) la accelerarea bruscă:", textSimplu: "Timpul de răspuns la accelerare" },
      { id: "q4", u: "%", text: "Eroarea staționară Δp a reglajului la 2000 rot/min (Tabelul 3.1):", textSimplu: "Eroarea staționară la 2000 rot/min" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = MD.CHEI.filter(k => t.t31[k].pr !== "").length; if (a < 6) l.push(`Tabelul 3.1: ${a}/6 regimuri`);
    ["acc", "dec"].forEach(k => { if (t.t32[k].tr === "") l.push(`Tabelul 3.2: ${k === "acc" ? "accelerare" : "decelerare"}`); });
    Object.keys(MD.INJ).forEach(k => { if (t.t33[k].dt === "" || t.t33[k].ti === "") l.push(`Tabelul 3.3: ${{ rr: "ralanti rece", rc: "ralanti cald", n2000: "2000 rot/min", acc: "accelerare" }[k]}`); });
    return l;
  },
  exemplu(D) { Object.assign(D.t.t33.rc, { n: "800", nr: "3", dt: "1.5", ti: "0.48" }); },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Senzorii și actuatorii motorului în autoturism",
    intro: `<p>Macheta comună a autoturismului (motor pe benzină). Senzorul de presiune din rampă al motorului diesel funcționează ca senzorul de presiune al combustibilului de la injecția directă de benzină: membrană cu mărci tensometrice și semnal 0,5…4,5 V. Urmăriți senzorul de turație (CKP) care sincronizează injecțiile.</p>`,
    dupa: `<p class="nota">Machetă comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "ckp", canale: ["inj1"] })
  },
  referat: {
    scop: "Caracteristica presiunii în rampă în funcție de turație, răspunsul dinamic al reglajului de presiune, comanda regulatorului de debit IMV și profilul injecției multiple la sistemul common-rail.",
    relatii: "σ = (p<sub>max</sub> − p<sub>cerut</sub>)/p<sub>cerut</sub>·100; &nbsp; Δp = (p<sub>real</sub> − p<sub>cerut</sub>)/p<sub>cerut</sub>·100; &nbsp; Δφ = 6·10<sup>−3</sup>·n·Δt.",
    varianta: () => "Standul propriu fiecărui student: harta presiunii cerute, eroarea staționară, dinamica reglajului, comanda IMV și pozițiile injecțiilor.",
    indicatii: "Comentați caracteristica p = f(n), eroarea staționară, diferența dintre răspunsul la creștere și la scădere, comanda IMV și variația numărului de injecții cu regimul…"
  },
  subsol: "Modelul: sistem Delphi DCR (pompă DFP1 cu IMV normal deschis, fără regulator de descărcare), reglaj de presiune de ordinul 2, injectoare cu electrovalvă (vârf de atragere ≈ 19 A, menținere ≈ 10,5 A), 2–4 injecții pe ciclu după regim. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena saa3-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <h3 style="margin:2.2rem 0 .3rem">Schema sistemului common-rail – standul 1.5 dCi</h3>
      <svg id="svg-schema" viewBox="0 0 900 312" role="img" aria-label="Schema sistemului common-rail"></svg>
      <p class="nota" id="comp-info2">Clic pe o componentă pentru descrierea ei.</p>
      <div class="saa3-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>Turație [rot/min]</span><b id="af-n">0</b></div><div><span>Lichid [°C]</span><b id="af-T">—</b></div><div><span>p cerută [bar]</span><b id="af-pc">—</b></div><div><span>p reală [bar]</span><b id="af-p">—</b></div><div><span>IMV [%]</span><b id="af-imv">—</b></div></div>
      <div class="instr" data-panou="obd" hidden><canvas id="cv-log" height="280" aria-label="Înregistrarea testerului OBD"></canvas><p id="log-cit"></p></div>
      <div class="instr" data-panou="osc" hidden><canvas id="cv-osc" height="280" aria-label="Osciloscop – curentul injectorului 1"></canvas><p id="osc-cit"></p><p class="nota">Trageți cursoarele A și B pe ecran.</p></div>
      <div class="instr" data-panou="schema"></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
    </aside>
  </div>`,
    init(C) {
      $("#svg-schema").innerHTML = schemaSVG();
      construiestePasi(); legaLog(); legaOsc();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    reset() { Object.assign(sim, { contact: false, merge: false, cr: false, n: 0, p: 1, pc: 0, v: 0 }); sim.log = { buf: [], stop: false, A: null, B: null }; },
    cadru(dt0, C, vizibil) {
      const dt = Math.min(0.05, dt0 || 0.016); pas(dt);
      if (sim.osc.run && performance.now() - (this._to || 0) > 250) { this._to = performance.now(); achizitieOsc(); }
      if (!vizibil) return;
      if (performance.now() - (this._ts || 0) > 120) { this._ts = performance.now(); $("#svg-schema").innerHTML = schemaSVG(); }
      const pn = PASI[pasActiv].panou;
      if (pn === "obd" && !sim.log.stop) desenLog();
      if (pn === "osc" && sim.osc.run && performance.now() - (this._tv || 0) > 250) { this._tv = performance.now(); desenOsc(); }
      if (performance.now() - (this._tp || 0) > 300) { this._tp = performance.now(); actualizeazaPasi(); C.stare(1, sim.cr ? "antrenare" : sim.merge ? `motor pornit – ${ET_REG[sim.reg]}` : sim.contact ? "contact pus" : "contact luat", sim.merge ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { desenLog(); desenOsc(); },
    formule() {
      const p = P(), r = [];
      if (sim.merge) r.push(["Abaterea presiunii (3.2)", `Δp = (${fx(sim.p, 0)} − ${fx(sim.pc, 0)})/${fx(sim.pc, 0)}·100 = <span class="rez">${fx((sim.p - sim.pc) / sim.pc * 100, 2)} %</span>`]);
      if (sim.osc.prof) { const d = Math.abs(sim.osc.B - sim.osc.A) * 1000; r.push(["Unghiul (3.3)", `Δφ = 6·10<sup>−3</sup>·${Math.round(sim.osc.n)}·${fx(d, 3)} = <span class="rez">${fx(6e-3 * sim.osc.n * d, 2)} °RAC</span>`]); }
      void p; return r;
    }
  }
});
