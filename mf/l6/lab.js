/* MF – Lucrarea 6. Pierderi de sarcină longitudinale și locale într-un circuit de răcire.
   Simulator: fotografia standului de podea (randată din modelul 3D, ca în Fig. 6.1) cu suprapuneri animate; modelul 3D separat în fila „Standul (3D)” – rezervorul, pompa centrifugă cu cutia de comandă, robinetul de reglare,
   conducta d = 17 mm cu prizele 1–2 la 1,5 m, lărgirea 17/26 mm transparentă (prizele 3–4), îngustarea, priza 5, cotul 90°, priza 6,
   robinetul cu bilă, priza 7, rotametrul, debitmetrul cu turbină; panoul cu 7 piezometre (colector presurizat, supapă, pompă de mână),
   furtunurile cu robinete de aerisire; pompa electrică de 12 V cu sursa de laborator și manometrul pentru punctul de funcționare.
   Parametrii (rugozitatea, ξ, caracteristicile pompelor) sunt individuali. */
"use strict";
const MD = MODELE["mf-l6"];
function P() { return Cadru.P; }
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea standului */
const sim = {
  t: 0, viteza: 1, pompa: false, a: 40, bila: true, aer: [false, false, false, false, false, false, false], erAer: [], off: 500,
  p12: false, sursa: false, q: 0, tStab: 0, niv: [500, 500, 500, 500, 500, 500, 500], zg: [0, 0, 0, 0, 0, 0, 0], kPa: 0, etichete: true, nssm1: false, nssm2: false
};
for (let i = 0; i < 7; i++) sim.erAer[i] = (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 45);
let SV3 = null;
const aerisit = () => sim.aer.every(Boolean);
const curge = () => (sim.pompa && !sim.p12) || (sim.p12 && sim.sursa);
/** debitul țintă [L/s] după starea pompei și a robinetelor */
function Qtinta() {
  if (sim.p12) return sim.sursa ? MD.punctFunctionare(P(), !sim.bila).Q * Math.min(1, Math.pow(sim.a / 100, 0.6)) : 0;
  return sim.pompa ? MD.debit(P(), sim.a, !sim.bila) : 0;
}
const Qaf = () => Math.round((sim.q + (curge() ? sim.zgQ || 0 : 0)) * 1000) / 1000;
const Hpompa12 = () => { const p = P(), q = sim.q / 1000; return Math.max(0, p.H0 - p.aP * q * q); };
/** nivelurile reale ale piezometrelor [mm] */
function nivAdev() {
  const c = [0, 0, 0, 0, 0, 0, 0];
  if (sim.q > 0.001) { const d = MD.dh(P(), sim.q, !sim.bila).map(x => x * 1000); c[1] = -d[0]; c[2] = c[1] - d[1]; c[3] = c[2]; c[4] = c[3] - d[2]; c[5] = c[4] - d[3]; c[6] = c[5] - d[4]; }
  const m = c.reduce((s, x) => s + x, 0) / 7;
  return c.map((x, i) => sim.off + x - m + (sim.aer[i] ? 0 : sim.erAer[i] * (curge() ? 1 : 0.3)));
}
const citire = () => sim.niv.map((v, i) => Math.round(v + sim.zg[i]));

/* ------------------------------------------------------------------ comenzi */
function pornestePompa() {
  if (sim.p12) return Cadru.mesajTemporar("Pompa standului este demontată (circuitul lucrează cu pompa de 12 V).", "atentie");
  if (sim.pompa) return;
  if (!sim.nssm1 || !sim.nssm2) return Cadru.mesajTemporar("Bifați verificările NSSM înainte de a porni pompa.", "atentie");
  if (sim.a < 15 || sim.a > 85) Cadru.mesajTemporar("NSSM: pompa se pornește cu robinetul de reglare parțial deschis (≈ 30…60 %).", "atentie");
  sim.pompa = true; actualizeaza();
}
function oprestePompa() {
  if (!sim.pompa) return;
  if (sim.a > 30) Cadru.mesajTemporar("NSSM: înainte de oprire se închide lent robinetul de reglare (lovitura de berbec).", "atentie");
  sim.pompa = false; actualizeaza();
}
function seteazaA(a) { sim.a = Math.max(0, Math.min(100, Math.round(a))); sim.tStab = 0; actualizeaza(); }
function comutaBila() { sim.bila = !sim.bila; sim.tStab = 0; actualizeaza(); }
function aeriseste(i) {
  if (!curge()) return Cadru.mesajTemporar("Aerisirea se face cu apa în circulație (pompa pornită).", "atentie");
  const lista = i == null ? [0, 1, 2, 3, 4, 5, 6] : [i];
  lista.forEach(k => sim.aer[k] = true); sim.tStab = 0;
  Cadru.mesajTemporar(i == null ? "Robinetele de aerisire s-au deschis pe rând până la ieșirea apei fără bule; prizele și furtunurile sunt aerisite." : `Priza ${i + 1} aerisită (${sim.aer.filter(Boolean).length}/7).`, "");
  actualizeaza();
}
function aerColector(d) { sim.off = Math.max(-400, Math.min(1400, sim.off + d)); actualizeaza(); }
function comutaP12() {
  if (sim.pompa) return Cadru.mesajTemporar("Opriți întâi pompa standului.", "atentie");
  if (sim.sursa) return Cadru.mesajTemporar("Opriți întâi ieșirea sursei de laborator.", "atentie");
  sim.p12 = !sim.p12; actualizeaza();
}
function comutaSursa() {
  if (!sim.p12) return Cadru.mesajTemporar("Montați întâi pompa electrică de 12 V în locul pompei standului.", "atentie");
  sim.sursa = !sim.sursa; sim.tStab = 0; actualizeaza();
}

/* ------------------------------------------------------------------ înregistrări */
function msg(t) { $("#msg-inreg").textContent = t; }
const stabil = () => curge() && Math.abs(sim.q - Qtinta()) < 0.0015 && sim.tStab > 3;
function inregT(e) {
  const v = Math.round(P().T * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "T", v }, celule: [{ t: "t60", r: "T", c: "v", v: v.toFixed(1) }] }); if (ok) msg(`Tabelul 6.0: temperatura apei ${fx(v, 1)} °C.`);
}
function verifCitire() {
  if (!curge()) { Cadru.mesajTemporar("Nu circulă apă prin circuit.", "atentie"); return null; }
  if (!aerisit()) { Cadru.mesajTemporar(`Prizele nu sunt aerisite (${sim.aer.filter(Boolean).length}/7): bulele de aer din furtunuri falsifică nivelurile.`, "atentie"); return null; }
  if (!stabil()) { Cadru.mesajTemporar("Așteptați stabilizarea debitului și a nivelurilor (câteva secunde după manevră).", "atentie"); return null; }
  const L = citire(); if (L.some(x => x < 5 || x > 995)) { Cadru.mesajTemporar("Un nivel este în afara scalei: reglați presiunea din colector (supapa de aer / pompa de mână).", "atentie"); return null; }
  return L;
}
const difer = L => [L[0] - L[1], L[1] - L[2], L[3] - L[4], L[4] - L[5], L[5] - L[6]];
function inregRand(e) {
  if (sim.p12) return Cadru.mesajTemporar("Tabelul 6.2 se completează cu pompa standului.", "atentie");
  if (!sim.bila) return Cadru.mesajTemporar("Robinetul cu bilă trebuie să fie complet deschis pentru Tabelul 6.2.", "atentie");
  const L = verifCitire(); if (!L) return;
  const T = Cadru.D.t; let k = null; for (let i = 1; i <= 5; i++) if (T.t62["r" + i].Q === "") { k = i; break; }
  if (!k) return Cadru.mesajTemporar("Tabelul 6.2 este complet (5 debite).", "atentie");
  const Q = Qaf();
  if (k === 1 && sim.a < 100) return Cadru.mesajTemporar("Prima determinare se face la debitul maxim (robinetul de reglare 100 %).", "atentie");
  if (k > 1) { const Qp = num(T.t62["r" + (k - 1)].Q); if (!(Q < Qp - 0.03)) return Cadru.mesajTemporar("Micșorați debitul cu robinetul de reglare (cu cel puțin 0,03 L/s față de determinarea anterioară).", "atentie"); }
  if (Q < 0.12) return Cadru.mesajTemporar("Debitul este prea mic: diferențele de nivel devin comparabile cu eroarea de citire (Q ≥ 0,12 L/s).", "atentie");
  const dh = difer(L), r = "r" + k;
  const ok = Cadru.inregistreaza(e, { log: { m: "h", k: r, a: sim.a, partial: false, Q, dh, niv: L }, celule: [{ t: "t62", r, c: "Q", v: Q.toFixed(3) }, ...["h12", "h23", "h45", "h56", "h67"].map((c, j) => ({ t: "t62", r, c, v: String(dh[j]) }))] });
  if (ok) msg(`Tabelul 6.2, determinarea ${k}: Q = ${fx(Q, 3)} L/s; niveluri ${L.join(" / ")} mm → Δh = ${dh.join("; ")} mm.`);
}
function inregPartial(e) {
  if (sim.p12) return Cadru.mesajTemporar("Determinarea se face cu pompa standului.", "atentie");
  if (sim.bila) return Cadru.mesajTemporar("Închideți parțial robinetul cu bilă (clic pe pârghie).", "atentie");
  const L = verifCitire(); if (!L) return; const Q = Qaf(), dh = difer(L);
  const ok = Cadru.inregistreaza(e, { log: { m: "h", k: "p", a: sim.a, partial: true, Q, dh, niv: L }, celule: [{ t: "t64", r: "p", c: "Q", v: Q.toFixed(3) }, { t: "t64", r: "p", c: "h12", v: String(dh[0]) }, { t: "t64", r: "p", c: "h67", v: String(dh[4]) }] });
  if (ok) msg(`Tabelul 6.4: robinetul parțial închis – Q = ${fx(Q, 3)} L/s, Δh₁₋₂ = ${dh[0]} mm, Δh₆₋₇ = ${dh[4]} mm.`);
}
function inregPF(e, k) {
  if (!sim.p12 || !sim.sursa) return Cadru.mesajTemporar("Montați pompa de 12 V și porniți sursa de laborator.", "atentie");
  if (sim.a < 100) return Cadru.mesajTemporar("Robinetul de reglare complet deschis (circuitul echivalent).", "atentie");
  if (k === "d" && !sim.bila) return Cadru.mesajTemporar("Pentru „deschis” robinetul cu bilă trebuie să fie complet deschis.", "atentie");
  if (k === "p" && sim.bila) return Cadru.mesajTemporar("Pentru „parțial închis” rotiți pârghia robinetului cu bilă.", "atentie");
  if (!stabil()) return Cadru.mesajTemporar("Așteptați stabilizarea debitului.", "atentie");
  const Q = Qaf(), p = Math.round(sim.kPa * 10) / 10, H = p / 9.81;
  const ok = Cadru.inregistreaza(e, { log: { m: "pf", partial: k === "p", Q, H, p }, celule: [{ t: "t65", r: k, c: "Q", v: Q.toFixed(3) }, { t: "t65", r: k, c: "p", v: p.toFixed(1) }] });
  if (ok) msg(`Tabelul 6.5 (${k === "d" ? "robinet deschis" : "parțial închis"}): Q = ${fx(Q, 3)} L/s, p = ${fx(p, 1)} kPa (H = ${fx(H, 2)} m).`);
}

/* ------------------------------------------------------------------ fotografia standului + suprapunerile animate */
const FOTO = {
  pa: [[719.8, 346.7], [758.1, 346.7], [796.4, 346.7], [834.6, 346.7], [872.9, 346.7], [911.2, 346.7], [949.5, 346.7]],
  pb: [[718.6, 45.5], [757.8, 45.5], [797.1, 45.5], [836.3, 45.5], [875.5, 45.5], [914.7, 45.5], [953.9, 45.5]],
  pr: [[549.6, 429.2], [1053.6, 429.2], [1097.3, 427.5], [1147.7, 427.5], [1218.2, 429.2], [1266.6, 478.9], [1263.9, 544.6]],
  db: [1240.3, 653], tm: [284, 535.9], led: [602.9, 579.3], bStart: [590.4, 588.4], bStop: [590.7, 609.2], roata: [475.7, 575.1],
  bv: [1271.6, 508.5], rot0: [1260.7, 622.5], rot1: [1262.8, 570.7], lar: [1077.2, 1167.8, 423, 435.4], sup: [987.5, 26.9], pm: [673.3, 121.4],
  pompa: [532.6, 659.5], rez: [233.8, 394.4, 576.4, 718.3], sr: [718.1, 780.9], md: [500.7, 603], p12: [534.6, 765.5], cot: [1268.6, 429.2], ret: [869.6, 693.2]
};
const pzXY = (i, mm) => { const a = FOTO.pa[i], b = FOTO.pb[i], f = mm / 1000; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
const SV = {};
function etichetaFoto(parent, x, y, x2, y2, text, ancora) {
  mk("line", { x1: x, y1: y, x2, y2, stroke: "#1b2a3a", "stroke-width": 1.2 }, parent);
  mk("circle", { cx: x, cy: y, r: 3, fill: "#1b2a3a" }, parent);
  const t = mk("text", { x: x2 + (ancora === "end" ? -5 : 5), y: y2 + 5, "text-anchor": ancora || "start", "font-size": 15, "font-weight": 600, fill: "#10202f", "font-family": "system-ui, sans-serif" }, parent);
  t.textContent = text;
  requestAnimationFrame(() => { try { const b = t.getBBox(); const r = mk("rect", { x: b.x - 5, y: b.y - 2, width: b.width + 10, height: b.height + 4, rx: 5, fill: "#ffffff", opacity: 0.88, stroke: "#c5ced8" }, parent); parent.insertBefore(r, t); } catch (e) { } });
}
const txt = (parent, x, y, s, o = {}) => { const t = mk("text", Object.assign({ x, y, "font-size": 14, fill: "#10202f", "font-family": "system-ui, sans-serif", "font-weight": 700 }, o), parent); t.textContent = s; return t; };
function zonaClic(parent, el, attrs, k, titlu) {
  const r = mk(el, Object.assign({ fill: "transparent", style: "cursor:pointer" }, attrs), parent);
  mk("title", {}, r).textContent = titlu; r.addEventListener("click", e => laClic3d(k, e)); return r;
}
function lcd(parent, x, y, w, h, fs, culoare) {
  mk("rect", { x: x - 2, y: y - 2, width: w + 4, height: h + 4, rx: 3, fill: "#111" }, parent);
  mk("rect", { x, y, width: w, height: h, rx: 2, fill: culoare === "verde" ? "#0e1a14" : "url(#gLCDf)" }, parent);
  return txt(parent, x + w - 4, y + h * 0.78, "", { "text-anchor": "end", "font-size": fs, "font-family": "'Courier New', monospace", fill: culoare === "verde" ? "#7dff8a" : "#1f2a12" });
}
function construiesteSVG() {
  const svg = $("#svg-pierderi"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs);
  grad(defs, "gLCDf", [[0, "#b9c7b0"], [1, "#a3b39a"]]);
  grad(defs, "gApaTub", [[0, "#3f86c4", 0.9], [0.35, "#8fc3ea", 0.85], [0.65, "#7fb8e4", 0.85], [1, "#2f74b3", 0.9]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const g = mk("g", {}, svg); SV.g = g;
  SV.img = mk("image", { href: "img/sim_stand.jpg", x: 0, y: 0, width: 1536, height: 790, preserveAspectRatio: "none" }, g);
  const F = FOTO;
  // coloanele piezometrelor, meniscurile și bulele de aer
  SV.col = []; SV.men = []; SV.bule = [];
  for (let i = 0; i < 7; i++) {
    SV.col.push(mk("polygon", { points: "", fill: "url(#gApaTub)" }, g));
    SV.men.push(mk("line", { stroke: "#0b3a63", "stroke-width": 2 }, g));
    SV.bule.push([0, 1].map(() => mk("ellipse", { rx: 2.6, ry: 4, fill: "url(#gBula)", opacity: 0 }, g)));
  }
  SV.citiri = F.pb.map(([x, y]) => txt(g, x, y - 8, "", { "text-anchor": "middle", "font-size": 11, fill: "#0b3a63" }));
  // particulele din tronsonul transparent (lărgirea 17/26 mm)
  const [xl0, xl1, yls, ylj] = F.lar;
  SV.part = []; for (let k = 0; k < 26; k++) SV.part.push({ s: Math.random(), r: Math.random() * 2 - 1, el: mk("circle", { r: 1.6, fill: "#ffffff", opacity: 0 }, g) });
  // debitmetrul cu turbină (afișaj) + afișajul mărit
  SV.dbTxt = lcd(g, F.db[0] - 36, F.db[1] - 13, 70, 24, 16, "verde");
  const dbx = 1330, dby = 600;
  mk("line", { x1: F.db[0] + 36, y1: F.db[1], x2: dbx, y2: dby + 30, stroke: "#4a6276", "stroke-dasharray": "4 3" }, g);
  mk("rect", { x: dbx, y: dby, width: 180, height: 70, rx: 10, fill: "#263238", stroke: "#0f1417" }, g);
  txt(g, dbx + 10, dby + 16, "DEBITMETRU CU TURBINĂ", { "font-size": 10, fill: "#cfd6dd", "font-weight": 600 });
  SV.dbMare = lcd(g, dbx + 10, dby + 24, 160, 38, 28, "verde");
  txt(g, dbx + 172, dby + 84, "L/s", { "text-anchor": "end", "font-size": 12, fill: "#33414e" });
  // termometrul digital al rezervorului
  SV.tmTxt = lcd(g, F.tm[0] - 24, F.tm[1] - 9, 48, 18, 13);
  // LED-ul cutiei de comandă
  SV.led = mk("circle", { cx: F.led[0], cy: F.led[1], r: 4.5, fill: "#223322", stroke: "#111" }, g);
  // robinetul de reglare: deschiderea
  mk("rect", { x: F.roata[0] - 44, y: F.roata[1] - 58, width: 88, height: 22, rx: 5, fill: "#ffffff", opacity: 0.92, stroke: "#9aa6b1" }, g);
  SV.aTxt = txt(g, F.roata[0], F.roata[1] - 42, "", { "text-anchor": "middle", "font-size": 13 });
  // robinetul cu bilă: pârghia
  SV.maner = mk("g", {}, g);
  mk("rect", { x: 0, y: -4, width: 46, height: 8, rx: 3, fill: "#1f5aa6", stroke: "#0b2c5a" }, SV.maner);
  mk("circle", { cx: 0, cy: 0, r: 4.5, fill: "url(#gCrom)", stroke: "#555" }, SV.maner);
  // rotametrul: plutitorul
  SV.plut = mk("path", { d: "", fill: "#c62828", stroke: "#7f1010" }, g);
  // pompa de 12 V: manometrul și sursa
  SV.p12 = mk("g", {}, g);
  mk("circle", { cx: F.md[0], cy: F.md[1], r: 13, fill: "url(#gLCDf)", stroke: "#333" }, SV.p12);
  SV.mdTxt = txt(SV.p12, F.md[0], F.md[1] + 4.5, "", { "text-anchor": "middle", "font-size": 11, "font-family": "'Courier New', monospace", fill: "#1d2414" });
  SV.srTxt = lcd(SV.p12, F.sr[0] - 46, F.sr[1] - 10, 92, 17, 11, "verde");
  etichetaFoto(SV.p12, F.p12[0] - 20, F.p12[1], 400, 770, "Pompă electrică 12 V", "end");
  etichetaFoto(SV.p12, F.sr[0] - 46, F.sr[1] - 4, 660, 742, "Sursă de laborator", "end");
  const mdx = 160, mdy = 640;
  mk("line", { x1: F.md[0] - 13, y1: F.md[1], x2: mdx + 150, y2: mdy + 30, stroke: "#4a6276", "stroke-dasharray": "4 3" }, SV.p12);
  mk("rect", { x: mdx - 140, y: mdy, width: 150, height: 66, rx: 10, fill: "#eef1f3", stroke: "#4b5259" }, SV.p12);
  txt(SV.p12, mdx - 130, mdy + 16, "MANOMETRU REFULARE", { "font-size": 10, fill: "#33414e", "font-weight": 600 });
  SV.mdMare = lcd(SV.p12, mdx - 130, mdy + 24, 110, 34, 24);
  txt(SV.p12, mdx + 6, mdy + 52, "kPa", { "text-anchor": "end", "font-size": 11, fill: "#33414e" });
  // zonele de clic
  zonaClic(g, "circle", { cx: F.bStart[0], cy: F.bStart[1], r: 10 }, "start", "Pornire pompă (I)");
  zonaClic(g, "circle", { cx: F.bStop[0], cy: F.bStop[1], r: 11 }, "stop", "Oprire pompă (0)");
  zonaClic(g, "circle", { cx: F.roata[0], cy: F.roata[1], r: 18 }, "reglare", "Robinetul de reglare: clic = −5 %, Shift+clic = +5 %");
  zonaClic(g, "rect", { x: F.bv[0] - 12, y: F.bv[1] - 20, width: 64, height: 40 }, "bila", "Robinetul cu bilă: deschis / parțial închis");
  F.pr.forEach(([x, y], i) => zonaClic(g, "rect", i < 5 ? { x: x - 12, y: y - 46, width: 24, height: 40 } : { x: x + 4, y: y - 14, width: 40, height: 28 }, "aerisire", `Priza ${i + 1}: robinetul de aerisire`));
  zonaClic(g, "rect", { x: F.pm[0] - 18, y: F.pm[1] - 80, width: 36, height: 160 }, "pompaAer", "Pompa de mână a colectorului: ridică nivelurile cu ≈ 50 mm");
  zonaClic(g, "circle", { cx: F.sup[0], cy: F.sup[1], r: 12 }, "aer", "Supapa de aer a colectorului: coboară nivelurile cu ≈ 50 mm");
  zonaClic(g, "rect", { x: F.db[0] - 40, y: F.db[1] - 20, width: 80, height: 40 }, "debitmetru", "Debitmetrul cu turbină");
  zonaClic(g, "rect", { x: F.tm[0] - 28, y: F.tm[1] - 14, width: 56, height: 28 }, "termometru", "Termometrul digital");
  zonaClic(g, "rect", { x: F.sr[0] - 40, y: F.sr[1] - 14, width: 80, height: 22 }, "sursa", "Sursa de laborator 12 V: pornește / oprește");
  // etichetele
  SV.et = mk("g", { "pointer-events": "none" }, g);
  etichetaFoto(SV.et, 300, 650, 150, 560, "Rezervor", "end");
  etichetaFoto(SV.et, 284, 527, 210, 470, "Termometru", "end");
  etichetaFoto(SV.et, 532, 660, 470, 740, "Pompă centrifugă", "end");
  etichetaFoto(SV.et, 610, 560, 640, 500, "Cutia de comandă");
  etichetaFoto(SV.et, 465, 565, 380, 440, "Robinet de reglare", "end");
  etichetaFoto(SV.et, 800, 431, 780, 480, "Conductă d = 17 mm, L₁₋₂ = 1,5 m");
  etichetaFoto(SV.et, 1120, 423, 1080, 370, "Lărgire 17/26 · îngustare");
  etichetaFoto(SV.et, 1268, 432, 1330, 400, "Cot 90°");
  etichetaFoto(SV.et, 1300, 508, 1360, 470, "Robinet cu bilă");
  etichetaFoto(SV.et, 1268, 596, 1360, 550, "Rotametru");
  etichetaFoto(SV.et, 960, 200, 1010, 200, "Panou cu 7 piezometre");
  etichetaFoto(SV.et, 673, 150, 610, 240, "Pompă de mână", "end");
  etichetaFoto(SV.et, 992, 27, 1040, 40, "Supapă de aer");
  etichetaFoto(SV.et, 549, 410, 480, 360, "Prize de presiune 1…7 (aerisire)", "end");
  etichetaFoto(SV.et, 870, 690, 900, 740, "Retur transparent");
  SV.et.style.display = sim.etichete ? "" : "none";
  prefixeazaId(svg, "v6-");
}
function actualizeazaSVG() {
  if (!SV.g) return;
  const F = FOTO, L = citire();
  SV.img.setAttribute("href", sim.p12 ? "img/sim_stand_p12.jpg" : "img/sim_stand.jpg");
  sim.niv.forEach((_, i) => {
    const mm = Math.max(-30, Math.min(1030, L[i])), [xb, yb] = pzXY(i, -30), [xt, yt] = pzXY(i, mm), w = 3.4;
    SV.col[i].setAttribute("points", `${xb - w},${yb} ${xb + w},${yb} ${xt + w},${yt} ${xt - w},${yt}`);
    SV.men[i].setAttribute("x1", xt - w - 0.5); SV.men[i].setAttribute("x2", xt + w + 0.5); SV.men[i].setAttribute("y1", yt); SV.men[i].setAttribute("y2", yt); SV.men[i].setAttribute("opacity", mm > 0 && mm < 1030 ? 1 : 0);
    SV.bule[i].forEach((b, j) => { const mb = mm * (0.25 + 0.35 * j) + Math.sin(sim.t * 2 + i + j) * 6, [x, y] = pzXY(i, mb); b.setAttribute("cx", x); b.setAttribute("cy", y); b.setAttribute("opacity", !sim.aer[i] && mm > 40 ? 0.9 : 0); });
    SV.citiri[i].textContent = L[i] < 0 ? "<0" : L[i] > 1000 ? ">1000" : L[i];
  });
  const q = curge() ? Qaf() : 0;
  SV.dbTxt.textContent = q.toFixed(3); SV.dbMare.textContent = q.toFixed(3);
  SV.tmTxt.textContent = `${fx(P().T, 1)}°`;
  SV.led.setAttribute("fill", sim.pompa ? "#3cff4a" : "#223322");
  SV.aTxt.textContent = `a = ${sim.a} %`;
  SV.maner.setAttribute("transform", `translate(${F.bv[0]},${F.bv[1]}) rotate(${sim.bila ? 0 : -51})`);
  const fr = Math.min(1, sim.q / 0.5), yp = F.rot0[1] - 4 - fr * (F.rot0[1] - F.rot1[1] - 8) + (sim.q > 0 ? Math.sin(sim.t * 9) * 0.8 : 0), xp = F.rot0[0] + (F.rot1[0] - F.rot0[0]) * fr;
  SV.plut.setAttribute("d", `M${xp - 5} ${yp - 4} L${xp + 5} ${yp - 4} L${xp + 2} ${yp + 4} L${xp - 2} ${yp + 4} Z`);
  SV.p12.style.display = sim.p12 ? "" : "none";
  if (sim.p12) { SV.mdTxt.textContent = fx(sim.kPa, 1); SV.mdMare.textContent = fx(sim.kPa, 1); SV.srTxt.textContent = sim.sursa ? "12.0V " + (1.2 + 4.1 * sim.q).toFixed(2) + "A" : "OFF"; }
}
function miscaParticule(dt) {
  if (!SV.part) return;
  const [xl0, xl1, yls, ylj] = FOTO.lar, yc = (yls + ylj) / 2, R = (ylj - yls) / 2 - 1;
  const vel = (curge() ? sim.q : 0) / 1000 / (Math.PI * 0.017 * 0.017 / 4), v2 = vel * Math.pow(17 / 26, 2);
  SV.part.forEach(p => { p.s = (p.s + v2 * (1.15 - p.r * p.r * 0.4) * dt / 0.27) % 1; p.el.setAttribute("cx", xl0 + 6 + p.s * (xl1 - xl0 - 12)); p.el.setAttribute("cy", yc + p.r * R); p.el.setAttribute("opacity", vel > 0.02 ? 0.85 : 0); });
}

/* ------------------------------------------------------------------ comenzi, afișaje, grafic */
function actualizeazaButoane() {
  const s = (sel, f) => { const b = $(sel); if (b) f(b); };
  s("#b-start", b => b.classList.toggle("activ", sim.pompa));
  s("#b-bila", b => { b.textContent = sim.bila ? "Robinetul cu bilă: deschis (clic = parțial închis)" : "Robinetul cu bilă: parțial închis (clic = deschis)"; b.classList.toggle("activ", !sim.bila); });
  s("#b-p12", b => { b.textContent = sim.p12 ? "Remontează pompa standului" : "Montează pompa de 12 V"; b.classList.toggle("activ", sim.p12); });
  s("#b-sursa", b => { b.textContent = sim.sursa ? "Sursa 12 V: oprește ieșirea" : "Sursa 12 V: pornește ieșirea"; b.classList.toggle("activ", sim.sursa); });
  $$(".af-a").forEach(el => el.textContent = `deschidere ${sim.a} %`);
  const ns = $("#nota-stand");
  if (ns) ns.textContent = `${sim.p12 ? "Pompa de 12 V montată" : sim.pompa ? "Pompa standului pornită" : "Pompa standului oprită"} · prize aerisite: ${sim.aer.filter(Boolean).length}/7${curge() ? (stabil() ? " · debit stabilizat" : " · se stabilizează…") : ""}.`;
}
function afisaje() {
  const s = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  s("#af-Q", curge() ? fx(Qaf(), 3) : "0,000"); s("#af-T", fx(P().T, 1)); s("#af-a", sim.a);
  s("#af-4n", sim.p12 ? "Manometru refulare" : "Robinet cu bilă"); s("#af-4", sim.p12 ? fx(sim.kPa, 1) : sim.bila ? "deschis" : "parțial"); s("#af-4u", sim.p12 ? "kPa" : sim.bila ? "complet deschis" : "închis ≈ 35°");
  const L = citire(), pz = $("#piez");
  if (pz) pz.innerHTML = L.map((v, i) => `<div class="${v < 5 || v > 995 ? "afara" : ""}"><span>${i + 1}</span><b>${v < 0 ? "< 0" : v > 1000 ? "> 1000" : v}</b></div>`).join("");
}
function deseneazaLive() {
  const cv = $("#cv-live"); if (!cv || !cv.getClientRects().length) return;
  const L = citire(), pts = L.map((v, i) => [i + 1, v]);
  deseneazaGrafic(cv, { xmin: 0.5, xmax: 7.5, ymin: 0, ymax: 1000, xticks: [1, 2, 3, 4, 5, 6, 7], yticks: [0, 200, 400, 600, 800, 1000], fmtX: v => String(v), xlab: "priza piezometrică", ylab: "nivelul [mm]",
    serii: [{ tip: "linie", pts, culoare: 0 }, { tip: "pct", pts, culoare: 0, r: 4.5 }] });
}
function sincron3d() {
  if (!SV3 && Cadru.anim && Cadru.anim.seteaza) SV3 = Cadru.anim;
  if (!SV3) return;
  SV3.seteaza({ pompa: sim.pompa, Q: sim.q, Qaf: curge() ? Qaf() : 0, h: citire(), a: sim.a, bila: sim.bila, T: Math.round(P().T * 10) / 10, aerisit: aerisit(), p12: sim.p12, sursa: sim.sursa,
    U12: sim.p12 && sim.sursa ? 12.0 : 0, I12: sim.p12 && sim.sursa ? 1.2 + 4.1 * sim.q : 0, kPa: sim.p12 && sim.sursa ? sim.kPa : 0 });
}
const VEDERI = { tot: [[0.2, 1.55, 4.7], [0.2, 1.0, -0.2]], pompa: [[-0.45, 0.75, 1.35], [-0.75, 0.35, 0]], piezo: [[0.45, 1.6, 1.55], [0.39, 1.55, -0.62]],
  largire: [[1.15, 1.2, 0.85], [1.2, 0.9, 0]], vertical: [[2.1, 0.75, 1.0], [1.65, 0.6, 0]], p12: [[0.0, 0.75, 1.6], [-0.25, 0.25, 0.3]] };
function vedere3d(v) { sincron3d(); if (SV3 && VEDERI[v]) SV3.vedere(...VEDERI[v]); }
function actualizeaza() { afisaje(); actualizeazaSVG(); sincron3d(); actualizeazaButoane(); }
let aerPas = 0;
function laClic3d(k, e) {
  if (k === "start" || k === "pompa") return sim.pompa ? null : pornestePompa();
  if (k === "stop") return oprestePompa();
  if (k === "reglare") return seteazaA(sim.a + (e && e.shiftKey ? 5 : -5));
  if (k === "bila") return comutaBila();
  if (k === "aerisire") { const i = sim.aer.indexOf(false); return aeriseste(i < 0 ? aerPas++ % 7 : i); }
  if (k === "aer") return aerColector(-50);
  if (k === "pompaAer") return aerColector(50);
  if (k === "sursa") return comutaSursa();
  if (k === "p12") return comutaP12();
  const et = { termometru: `Termometrul: ${fx(P().T, 1)} °C.`, debitmetru: curge() ? `Debitmetrul: ${fx(Qaf(), 3)} L/s.` : "Debitmetrul: 0,000 L/s.", rezervor: "Rezervorul: circuitul este închis, apa revine prin returul transparent.",
    largire: "Lărgirea bruscă 17/26 mm: viteza scade de ≈ 2,3 ori; prizele 3 și 4 sunt pe tronsonul de 26 mm.", ingustare: "Îngustarea bruscă 26/17 mm (între prizele 4 și 5).", cot: "Cotul 90° cu rază mică (r/d ≈ 1): între prizele 5 și 6 sunt 0,30 m de țeavă dreaptă.",
    piezo: `Piezometrele: ${citire().join(" / ")} mm.`, rotametru: "Rotametrul: plutitorul indică debitul orientativ (L/min).", manometru: `Manometrul: ${fx(sim.kPa, 1)} kPa.` }[k];
  if (et) Cadru.mesajTemporar(et, "");
}

/* ------------------------------------------------------------------ calcule */
function calculeazaMF6(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), F = Number.isFinite, cel = { t60: {}, t63: {}, t64: {}, t65: {} }, T = num(t.t60.T.v), ny = F(T) ? MD.nu(T) : NaN;
  cel.t60.T = { nu: F(ny) ? fx(ny, 3) : "" };
  const f = (v, n) => F(v) ? fx(v, n) : "";
  for (let i = 1; i <= 5; i++) { const r = o.r["r" + i]; cel.t63["r" + i] = { v: f(r.v, 3), re: f(r.re, 0), lm: f(r.lm, 4), lb: f(r.lb, 4), lc: f(r.lc, 4), xc: f(r.xc, 3), xi: f(r.xi, 3), xr: f(r.xr, 3) }; }
  // Tabelul 6.4 – robinetul parțial închis
  const A1 = Math.PI * MD.D1 * MD.D1 / 4, rp = t.t64.p, Qp = num(rp.Q) / 1000, vp = Qp / A1, kp = vp * vp / 2 / MD.G, lp = num(rp.h12) / 1000 / (MD.L12 / MD.D1 * kp), xp = (num(rp.h67) / 1000 - lp * MD.L67 / MD.D1 * kp) / kp;
  cel.t64.p = { v: f(vp, 3), lm: f(lp, 4), xr: f(xp, 2) };
  // Tabelul 6.5 – punctul de funcționare
  const Qd = o.Qop, Qpp = Math.sqrt(4 / (1e7 + 2 * o.M)) * 1000;
  ["d", "p"].forEach(k => { const p = num(t.t65[k].p); cel.t65[k] = { H: F(p) ? fx(p / 9.81, 2) : "", Qc: f(k === "d" ? Qd : Qpp, 3) }; });
  const xrMed = [1, 2, 3, 4, 5].map(i => o.r["r" + i].xr).filter(F), xiMed = [1, 2, 3, 4, 5].map(i => o.r["r" + i].xi).filter(F), med = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
  const rez = [["ν(T)", F(ny) ? `${fx(ny, 3)} mm²/s la ${fx(T, 1)} °C` : "—"],
    ["λ măsurat la debitul maxim", F(o.lm1) ? `<span style="color:var(--accent)">${fx(o.lm1, 4)}</span> (Blasius ${f(o.r.r1.lb, 4)}, Colebrook ${f(o.r.r1.lc, 4)})` : "—"],
    ["ξ cot (media)", F(o.xcMed) ? fx(o.xcMed, 3) : "—"], ["ξ îngustare (media)", F(med(xiMed)) ? fx(med(xiMed), 3) : "—"], ["ξ robinet deschis (media) / parțial închis", `${F(med(xrMed)) ? fx(med(xrMed), 3) : "—"} / ${F(xp) ? fx(xp, 2) : "—"}`],
    ["Σξ circuit echivalent", F(o.sumXi) ? fx(o.sumXi, 2) : "—"], ["M [s²/m⁵]", F(o.M) ? `<span style="color:var(--accent)">${fx(o.M / 1e7, 3)}·10⁷</span>` : "—"],
    ["Q punct de funcționare (H = 4 − 10⁷Q²)", F(Qd) ? `${fx(Qd, 3)} L/s; cu M dublat ${fx(Qpp, 3)} L/s` : "—"]];
  const verdicte = [];
  if (F(o.lm1) && F(o.r.r1.lb)) { const ab = (o.lm1 / o.r.r1.lb - 1) * 100; verdicte.push({ tip: Math.abs(ab) <= 10 ? "ok" : "atentie", text: `λ măsurat diferă de Blasius cu ${fx(ab, 1)} % ${Math.abs(ab) <= 10 ? "(abatere normală, 5…10 %)" : "– verificați citirile și temperatura"}.` }); }
  if (F(o.xcMed)) verdicte.push({ tip: o.xcMed >= 0.45 && o.xcMed <= 1.05 ? "ok" : "atentie", text: `ξ cot = ${fx(o.xcMed, 2)}: Tabelul 6.1 dă 0,5…1,0 pentru cotul cu rază mică.` });
  const h23 = num(t.t62.r1.h23); if (F(h23) && h23 < 0) verdicte.push({ tip: "ok", text: `La lărgire cota piezometrică crește (Δh₂₋₃ = ${h23} mm) deși se pierde energie: scăderea sarcinii cinetice (v₁² − v₂²)/2g = ${fx((o.r.r1.v ** 2 - (o.r.r1.v * (17 / 26) ** 2) ** 2) / 2 / MD.G * 1000, 0)} mm este mai mare decât pierderea Borda–Carnot ${fx(o.r.r1.hExpTeor * 1000, 0)} mm.` });
  const pts = [1, 2, 3, 4, 5].map(i => o.r["r" + i]).filter(r => F(r.re) && F(r.lm) && r.lm > 0).map(r => [r.re, r.lm]);
  const reG = []; for (let x = 3.6; x <= 5.01; x += 0.05) reG.push(Math.pow(10, x));
  return { celule: cel, rezultate: rez, verdicte, titluGrafic: "Diagrama Moody (detaliu): λ măsurat față de Blasius și Colebrook (k = 0,0015 mm)",
    grafic: { xmin: 4000, xmax: 100000, ymin: 0.015, ymax: 0.05, xlog: true, ylog: true, xlab: "Re", ylab: "λ", serii: [
      { tip: "linie", pts: reG.map(r => [r, 0.3164 / Math.pow(r, 0.25)]), culoare: 1 }, { tip: "linie", pts: reG.map(r => [r, MD.colebrook(r, 0.0015 / 17)]), culoare: 3, punctat: true },
      { tip: "linie", pts: reG.filter(r => r < 4300).map(r => [r, 64 / r]), culoare: 2 }, { tip: "pct", pts, culoare: 0, r: 5 }] },
    legenda: [["λ măsurat", "var(--serie-0)", "pct"], ["Blasius", "var(--serie-1)"], ["Colebrook (țeavă netedă)", "var(--serie-3)"]], principal: { eticheta: "λ măsurat (debitul maxim)", valoare: F(o.lm1) ? Math.round(o.lm1 * 10000) / 10000 : null } };
}

/* ------------------------------------------------------------------ conținut */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Standul se alimentează de la priza cu protecție diferențială; pompa se pornește cu robinetul de reglare parțial deschis și se oprește după închiderea lentă a acestuia.</li>
<li>Manometrele diferențiale (piezometrele) se aerisesc numai cu robinetele de izolare deschise conform schemei afișate; nu se desfac furtunurile sub presiune.</li>
<li>Dacă standul are manometre diferențiale cu mercur, acestea nu se înclină și nu se desfac; orice scurgere de mercur se anunță imediat cadrului didactic.</li>
<li>Apa scursă se șterge imediat; nu se ating părțile electrice cu mâinile ude.</li></ul></div>
<h2>6.1. Scopul lucrării</h2>
<p>Determinarea experimentală a coeficientului de rezistență hidraulică λ pentru o conductă dreaptă și a coeficienților de pierdere locală ξ pentru cot, lărgire bruscă, îngustare bruscă și robinet (sau termostat), comparația cu relațiile de calcul și trasarea caracteristicii circuitului pentru stabilirea punctului de funcționare al pompei de lichid de răcire.</p>
<h2>6.2. Noțiuni teoretice</h2>
<p>În curgerea unui lichid real o parte din energie se disipă prin frecare. Pierderea de sarcină totală între două secțiuni este suma pierderilor longitudinale (distribuite) pe tronsoanele drepte și a pierderilor locale la schimbările de direcție și de secțiune:</p>
<div class="ec"><span>h<sub>r</sub> = h<sub>d</sub> + h<sub>l</sub></span><span class="nr">(6.1)</span></div>
<div class="ec"><span>h<sub>d</sub> = λ·(L/d)·v²/(2g) &nbsp; (Darcy–Weisbach)</span><span class="nr">(6.2)</span></div>
<div class="ec"><span>h<sub>l</sub> = ξ·v²/(2g)</span><span class="nr">(6.3)</span></div>
<p>Pe un tronson drept orizontal, cu diametru constant, viteza nu se modifică, deci pierderea de sarcină este egală cu diferența cotelor piezometrice măsurate la capete: h<sub>d</sub> = Δh = Δp/(ρg). Standul are prize de presiune înainte și după fiecare element, legate la panoul de piezometre.</p>
<p>Coeficientul λ depinde de numărul Reynolds și de rugozitatea relativă k/d (diagrama Moody, Fig. 6.2):</p>
<div class="ec"><span>laminar: λ = 64/Re</span><span class="nr">(6.4)</span></div>
<div class="ec"><span>turbulent neted (Blasius, Re &lt; 10⁵): λ = 0,3164/Re<sup>0,25</sup></span><span class="nr">(6.5)</span></div>
<div class="ec"><span>Colebrook–White: 1/√λ = −2·lg(2,51/(Re·√λ) + k/(3,71·d))</span><span class="nr">(6.6)</span></div>
<figure><img src="img/fig6_2.jpg" alt="Fig. 6.2" loading="lazy"><figcaption>Fig. 6.2. Diagrama Moody: coeficientul λ în funcție de Re și de rugozitatea relativă k/d</figcaption></figure>
<p>Rugozități absolute orientative k: țevi trase de cupru, PVC, PE – 0,0015 mm; țevi de oțel noi – 0,05 mm; furtun de cauciuc – 0,01…0,03 mm; fontă – 0,25 mm.</p>
<p>Coeficienții de pierdere locală se determină experimental, cu excepția lărgirii bruște, pentru care teorema impulsului conduce la relația Borda–Carnot (raportat la viteza din amonte v<sub>1</sub>); la îngustare ξ se raportează la viteza din conducta mică:</p>
<div class="ec"><span>lărgire: h<sub>l</sub> = (v<sub>1</sub> − v<sub>2</sub>)²/(2g)</span><span class="nr">(6.7)</span></div>
<div class="ec"><span>ξ<sub>1</sub> = (1 − A<sub>1</sub>/A<sub>2</sub>)²</span><span class="nr">(6.8)</span></div>
<div class="ec"><span>îngustare: ξ ≈ 0,5·(1 − A<sub>mic</sub>/A<sub>mare</sub>)</span><span class="nr">(6.9)</span></div>
<h3>Tabelul 6.1. Coeficienți de pierdere locală orientativi</h3>
<div class="tabel-scroll"><table class="tabel"><thead><tr><th>Element</th><th>ξ</th></tr></thead><tbody>
<tr><td>Cot 90° cu rază mică (r/d ≈ 1)</td><td>0,5 … 1,0</td></tr><tr><td>Cot 90° cu rază mare (r/d ≥ 3)</td><td>0,2 … 0,3</td></tr><tr><td>Intrare din rezervor cu muchie vie</td><td>0,5</td></tr>
<tr><td>Ieșire în rezervor</td><td>1,0</td></tr><tr><td>Robinet cu bilă, complet deschis</td><td>0,05 … 0,2</td></tr><tr><td>Termostat de motor, complet deschis</td><td>2 … 5</td></tr><tr><td>Radiator (raportat la viteza din furtun)</td><td>5 … 15</td></tr></tbody></table></div>
<p>Însumând pierderile pe un circuit și exprimând viteza prin debit, pierderea totală devine proporțională cu pătratul debitului; M este modulul de rezistență hidraulică al circuitului [s²/m⁵]. Pompa de lichid de răcire lucrează în punctul în care sarcina ei, H(Q), este egală cu pierderea circuitului (Fig. 6.3):</p>
<div class="ec"><span>h<sub>r</sub> = (λ·L/d + Σξ)·v²/(2g) = M·Q²</span><span class="nr">(6.10)</span></div>
<div class="ec"><span>M = 8·(λ·L/d + Σξ)/(g·π²·d⁴)</span><span class="nr">(6.11)</span></div>
<div class="ec"><span>H(Q) = M·Q²</span><span class="nr">(6.12)</span></div>
<figure><img src="img/fig6_3.jpg" alt="Fig. 6.3" loading="lazy"><figcaption>Fig. 6.3. Punctul de funcționare al pompei electrice de lichid de răcire în circuit</figcaption></figure>
<h2>6.3. Aparatură și echipamente (în simulator)</h2>
<ul><li>Standul pentru pierderi de sarcină: rezervor, pompă centrifugă, robinet de reglare, conductă dreaptă d = 17 mm (L = 1,5 m între prizele 1–2), lărgire bruscă 17/26 mm (prizele 2–3), îngustare bruscă 26/17 mm (4–5), cot 90° (5–6, 0,30 m de țeavă între prize), robinet cu bilă (6–7, 0,20 m), rotametru și debitmetru cu turbină, termometru digital.</li>
<li>Panoul cu 7 piezometre de sticlă cu scală milimetrică și colector presurizat (pompă de mână și supapă de aer); furtunuri transparente cu robinete de aerisire la prize.</li>
<li>Pompa electrică de lichid de răcire de 12 V, sursa de laborator și manometrul digital pe refulare.</li></ul>
<h3>Observații pentru efectuarea și interpretarea măsurărilor</h3>
<ul>
<li><b>Poziția prizelor.</b> Prizele 3 și 4 sunt pe tronsonul de 26 mm; Δh₂₋₃ conține lărgirea (cota piezometrică crește, Δh negativ), iar Δh₄₋₅ – îngustarea și variația sarcinii cinetice.</li>
<li><b>Calculul ξ.</b> Din Δh se scade pierderea longitudinală pe țeava dintre prize (cu λ măsurat): cot 0,30 m, robinet 0,20 m, îngustare 0,15 m (și variația sarcinii cinetice (v₁² − v₂²)/2g).</li>
<li><b>Panoul presurizat.</b> Perna de aer din colector deplasează toate nivelurile cu aceeași valoare, fără să schimbe diferențele; se folosește pentru a aduce nivelurile în scală.</li>
<li><b>Determinările suplimentare:</b> temperatura apei (pentru vâscozitate), pierderile cu robinetul parțial închis și punctul de funcționare al pompei de 12 V (intersecția caracteristicii pompei cu caracteristica rețelei).</li>
</ul>
<h2>6.4. Modul de lucru (în simulator)</h2>
<ol><li>Pornirea pompei cu robinetul parțial deschis, aerisirea prizelor, temperatura apei.</li><li>Debitul maxim: Q și nivelurile celor 7 piezometre.</li><li>Încă 4 debite micșorate cu robinetul de reglare.</li><li>Robinetul cu bilă parțial închis.</li><li>Pompa de 12 V: Q și presiunea în punctul de funcționare, cu robinetul deschis și parțial închis.</li></ol>
<h2>6.7. Interpretarea rezultatelor</h2>
<ul><li>λ măsurat se compară cu valorile Blasius și Colebrook; abaterile de 5–10 % sunt normale (citirea nivelurilor, temperatura, rugozitatea reală).</li>
<li>Punctele (Re, λ) se plasează pe diagrama Moody; pentru țevi netede ele trebuie să urmeze curba netedă.</li>
<li>Coeficienții ξ măsurați se compară cu Tabelul 6.1; la debite mici incertitudinea lor crește, deoarece diferențele de nivel sunt mici.</li>
<li>Se explică de ce la lărgirea bruscă cota piezometrică crește deși există o pierdere de energie.</li>
<li>Se discută efectul închiderii termostatului asupra caracteristicii circuitului și asupra debitului pompei.</li></ul>
<h2>6.8. Relevanță practică</h2>
<p>Circuitul de răcire al motorului și cel al bateriei de tracțiune sunt dimensionate cu aceleași relații: pierderile din radiator, termostat, supapele de comutare și plăcile de răcire determină debitul pompei și consumul ei de energie. Pompele electrice moderne (reglate de unitatea de control) își adaptează turația la necesarul de răcire, reducând consumul. Tot pierderi de sarcină se măsoară la filtrele de ulei, de combustibil și de aer: creșterea căderii de presiune arată colmatarea, iar supapa de ocolire a filtrului de ulei se deschide la o diferență de presiune prestabilită.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>d = 17 mm, L = 1,5 m, Q = 0,40 L/s, apă la 20 °C; Δh₁₋₂ = 352 mm.</p>
<div class="ec"><span>v = 4·0,40·10⁻³/(π·0,017²) = 1,762 m/s; v²/2g = 0,1583 m</span><span class="nr">(6.13–6.14)</span></div>
<div class="ec"><span>Re = 1,762·0,017/1,004·10⁻⁶ = 29 840</span><span class="nr">(6.15)</span></div>
<div class="ec"><span>λ<sub>măs</sub> = 0,352/(1,5/0,017·0,1583) = 0,0252; λ<sub>Blasius</sub> = 0,0241; λ<sub>Colebrook</sub> = 0,0238</span><span class="nr">(6.16–6.18)</span></div>
<p>Cotul: Δh₅₋₆ = 170 mm, pierderea pe 0,30 m de țeavă 0,0252·0,30/0,017·0,1583 = 0,070 m:</p>
<div class="ec"><span>ξ<sub>cot</sub> = (0,170 − 0,070)/0,1583 = 0,63</span><span class="nr">(6.19)</span></div>
<p>Lărgirea 17/26 mm: v₂ = 1,762·(17/26)² = 0,753 m/s:</p>
<div class="ec"><span>h<sub>l</sub> = (1,762 − 0,753)²/(2·9,81) = 0,052 m; &nbsp; Δh<sub>piez</sub> = 0,1583 − 0,0289 − 0,052 = 0,077 m (creștere)</span><span class="nr">(6.20–6.21)</span></div>
<p>Circuitul echivalent (L = 4,0 m, două coturi, o lărgire, o îngustare, termostatul deschis, Σξ = 2·0,63 + 0,33 + 0,29 + 2,5 = 4,38):</p>
<div class="ec"><span>h<sub>r</sub> = (0,0252·4,0/0,017 + 4,38)·0,1583 = 1,63 m; &nbsp; M = 1,63/(0,40·10⁻³)² = 1,02·10⁷ s²/m⁵</span><span class="nr">(6.22–6.23)</span></div>
<p>Pompa: H = 4 − 1,0·10⁷·Q²; 4 − 10⁷Q² = 1,02·10⁷Q² ⇒ Q = 0,445 L/s, H = 2,02 m. Cu M dublat (termostat parțial închis) Q ≈ 0,36 L/s.</p>
<div class="problema"><h3>Problema 1</h3><p>Radiatorul (ξ = 10 raportat la viteza din furtunul de 17 mm) se colmatează și ξ devine 25. Cu cât crește M al circuitului din exemplu?</p><details class="sol"><summary>Rezolvare</summary><p>ΔM = 8·15/(9,81·π²·0,017⁴) = 1,48·10⁷ s²/m⁵ – modulul se dublează aproximativ, iar debitul scade la ≈ 0,32 L/s.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Ce coeficient ξ are lărgirea bruscă 17/26 mm după Borda–Carnot?</p><details class="sol"><summary>Rezolvare</summary><p>ξ = (1 − (17/26)²)² = (1 − 0,4275)² = 0,328.</p></details></div>`;
}
const INTREBARI = [
  ["Care este diferența dintre pierderile de sarcină longitudinale și cele locale?", "Pierderile longitudinale sunt distribuite pe lungimea tronsoanelor drepte (frecare la perete, proporționale cu L/d), cele locale apar concentrat la schimbările de direcție sau de secțiune (cot, lărgire, robinet) prin desprinderi și vârtejuri."],
  ["De ce depinde coeficientul λ în regim laminar și în regim turbulent rugos?", "În regim laminar numai de Re (λ = 64/Re); în regim turbulent rugos numai de rugozitatea relativă k/d (λ independent de Re)."],
  ["Cum se determină experimental coeficientul ξ al unui cot?", "Se măsoară Δh între prizele de dinainte și de după cot, se scade pierderea longitudinală pe țeava dreaptă dintre prize (λ·L/d·v²/2g) și se împarte la v²/2g."],
  ["Ce este caracteristica unui circuit hidraulic și cum se determină punctul de funcționare al pompei?", "Curba h = M·Q² a pierderilor circuitului; punctul de funcționare este intersecția ei cu caracteristica H(Q) a pompei."],
  ["Cum se modifică debitul de lichid de răcire când radiatorul se colmatează parțial?", "Crește ξ al radiatorului, deci M; caracteristica circuitului devine mai abruptă și intersecția cu curba pompei se mută la debit mai mic și sarcină mai mare."]
];
const TEST = [
  { q: "λ măsurat pentru Δh = 352 mm pe 1,5 m, d = 17 mm, v²/2g = 0,1583 m este:", o: ["0,0152", "0,0252", "0,0352", "0,252"], c: 1, e: "0,352/(88,2·0,1583)." },
  { q: "La lărgirea bruscă cota piezometrică:", o: ["scade întotdeauna", "poate crește, deși se pierde energie", "rămâne constantă", "devine negativă"], c: 1, e: "Scăderea sarcinii cinetice depășește pierderea." },
  { q: "ξ Borda–Carnot pentru lărgirea 17/26 mm este:", o: ["0,11", "0,33", "0,57", "1,0"], c: 1, e: "(1 − 0,4275)²." },
  { q: "Pierderea totală a circuitului crește cu debitul:", o: ["liniar", "cu pătratul debitului", "cu radical din debit", "nu depinde"], c: 1, e: "h = M·Q² (regim turbulent)." },
  { q: "Dacă M se dublează, debitul pompei cu H = 4 − 10⁷Q² (M inițial 10⁷):", o: ["scade la jumătate", "scade cu ≈ 18 %", "crește", "rămâne același"], c: 1, e: "√(4/2·10⁷) → √(4/3·10⁷): 0,447 → 0,365 L/s." }
];
const CSS = `<style>
#svg-pierderi { width:100%; height:auto; display:block; border-radius:10px; background:#e9edf0; }
.mf6-piez { display:grid; grid-template-columns:repeat(7,1fr); gap:.3rem; margin:.3rem 0 .6rem; } .mf6-piez div { background:var(--suprafata-2); border-radius:6px; padding:.25rem; text-align:center; } .mf6-piez span { display:block; font-size:.7rem; color:var(--text-sec); } .mf6-piez b { font:600 .95rem 'Courier New', monospace; } .mf6-piez .afara b { color:#c62828; }
.mf6-vederi { display:flex; flex-wrap:wrap; gap:.3rem; margin:.5rem 0 0; } .mf6-vederi button { font-size:.8rem; padding:.2rem .55rem; }
#b-start.activ, #b-bila.activ, #b-p12.activ, #b-sursa.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); }
.sim-comenzi button.lat { margin-top:.3rem; }
</style>`;
const H = ["h12", "h23", "h45", "h56", "h67"], HT = ["Δh₁₋₂ [mm]", "Δh₂₋₃ [mm]", "Δh₄₋₅ [mm]", "Δh₅₋₆ [mm]", "Δh₆₋₇ [mm]"];
Cadru.porneste({
  disc: "MF", nr: 6, cod: "mf-l6",
  titlu: "Pierderi de sarcină longitudinale și locale într-un circuit de răcire",
  scurt: "Pierderi de sarcină",
  subtitlu: "Laborator virtual – standul pentru pierderi de sarcină: λ pe conducta dreaptă, ξ pentru lărgire, îngustare, cot și robinet, caracteristica circuitului și punctul de funcționare al pompei de 12 V",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261026); },
  date: [{ k: "d", et: "d conductă [mm]", v: 17, fix: true }, { k: "L", et: "L₁₋₂ [m]", v: 1.5, fix: true }, { k: "D", et: "D lărgire [mm]", v: 26, fix: true }],
  tabele: [
    { id: "t60", titlu: "Tabelul 6.0. Temperatura apei", antetRand: "", randuri: [{ k: "T", et: "Temperatura apei [°C]" }], coloane: [{ k: "v", t: "Valoare", intrare: true }, { k: "nu", t: "ν [mm²/s]" }] },
    { id: "t62", titlu: "Tabelul 6.2. Determinări", antetRand: "Nr.", nota: "Δh = diferența nivelurilor piezometrelor (amonte − aval). Δh₂₋₃ este negativ: după lărgire cota piezometrică crește. Determinarea 1 la debitul maxim, apoi debite descrescătoare.",
      randuri: [1, 2, 3, 4, 5].map(i => ({ k: "r" + i, et: String(i) })), coloane: [{ k: "Q", t: "Q [L/s]", intrare: true }, ...H.map((k, j) => ({ k, t: HT[j], intrare: true }))] },
    { id: "t63", titlu: "Tabelul 6.3. Rezultate", antetRand: "Nr.", nota: "d = 17 mm, ν la temperatura apei; λ măsurat din Δh₁₋₂; ξ = (Δh − λ·L<sub>prize</sub>/d·v²/2g)/(v²/2g), la îngustare scăzând și (v₁² − v₂²)/2g; Colebrook cu k = 0,0015 mm.",
      randuri: [1, 2, 3, 4, 5].map(i => ({ k: "r" + i, et: String(i) })),
      coloane: [{ k: "v", t: "v [m/s]" }, { k: "re", t: "Re" }, { k: "lm", t: "λ măsurat" }, { k: "lb", t: "λ Blasius" }, { k: "lc", t: "λ Colebrook" }, { k: "xc", t: "ξ cot" }, { k: "xi", t: "ξ îngustare" }, { k: "xr", t: "ξ robinet" }] },
    { id: "t64", titlu: "Tabelul 6.4. Robinetul cu bilă parțial închis", antetRand: "", randuri: [{ k: "p", et: "Parțial închis" }],
      coloane: [{ k: "Q", t: "Q [L/s]", intrare: true }, { k: "h12", t: "Δh₁₋₂ [mm]", intrare: true }, { k: "h67", t: "Δh₆₋₇ [mm]", intrare: true }, { k: "v", t: "v [m/s]" }, { k: "lm", t: "λ" }, { k: "xr", t: "ξ robinet" }] },
    { id: "t65", titlu: "Tabelul 6.5. Punctul de funcționare – pompa electrică de 12 V", antetRand: "Robinetul cu bilă", nota: "H = p/(ρg) (p în kPa ⇒ H = p/9,81 m). Q calculat: intersecția H = 4 − 10⁷Q² cu M·Q² (M din Tabelul 6.3, dublat pentru „parțial închis”).",
      randuri: [{ k: "d", et: "Deschis" }, { k: "p", et: "Parțial închis" }], coloane: [{ k: "Q", t: "Q măsurat [L/s]", intrare: true }, { k: "p", t: "p refulare [kPa]", intrare: true }, { k: "H", t: "H [m]" }, { k: "Qc", t: "Q calculat [L/s]" }] }
  ],
  inaltimeGrafic: 280,
  calculeaza: calculeazaMF6,
  intrebari() {
    return [
      { id: "q1", u: "", text: "λ măsurat la debitul maxim (determinarea 1):", textSimplu: "λ măsurat la debitul maxim" },
      { id: "q2", u: "", text: "ξ cot – media celor 5 determinări:", textSimplu: "ξ cot mediu" },
      { id: "q3", u: "s²/m⁵", text: "M al circuitului echivalent (L = 4,0 m, d = 17 mm, λ de la debitul maxim, Σξ = 2·ξ<sub>cot</sub> + (1 − A₁/A₂)² + ξ<sub>îngustare</sub> mediu + 2,5):", textSimplu: "modulul de rezistență M" },
      { id: "q4", u: "L/s", text: "Debitul în punctul de funcționare cu pompa H = 4 − 1,0·10⁷·Q² și M de la întrebarea anterioară:", textSimplu: "Q punct de funcționare" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t; if (t.t60.T.v === "") l.push("Tabelul 6.0: temperatura");
    const n = [1, 2, 3, 4, 5].filter(i => t.t62["r" + i].Q !== "").length; if (n < 5) l.push(`Tabelul 6.2: ${n}/5 debite`);
    if (t.t64.p.Q === "") l.push("Tabelul 6.4: robinetul parțial închis");
    ["d", "p"].forEach(k => { if (t.t65[k].Q === "") l.push(`Tabelul 6.5: ${k === "d" ? "deschis" : "parțial închis"}`); });
    return l;
  },
  exemplu(D) { const t = D.t; t.t60.T.v = "20"; Object.assign(t.t62.r1, { Q: "0.40", h12: "352", h23: "-77", h45: "210", h56: "170", h67: "68" }); },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)", titlu: "Circuitul de răcire al motorului: pompa, termostatul, radiatorul",
    intro: `<p>Pompa de lichid de răcire lucrează în punctul în care sarcina ei egalează pierderile circuitului: furtunuri, coturi, chiulasă, termostat și radiator. Termostatul parțial închis sau radiatorul colmatat măresc modulul de rezistență M și reduc debitul.</p>`,
    dupa: `<p class="nota">Macheta este comună cu celelalte lucrări.</p>`,
    optiuni: () => ({ sistem: "racire" })
  },
  referat: {
    scop: "Determinarea experimentală a lui λ pentru conducta dreaptă și a coeficienților ξ pentru lărgire, îngustare, cot și robinet, comparația cu relațiile de calcul și punctul de funcționare al pompei de lichid de răcire.",
    relatii: "h<sub>d</sub> = λ·L/d·v²/2g; &nbsp; h<sub>l</sub> = ξ·v²/2g; &nbsp; λ = 0,3164/Re<sup>0,25</sup>; &nbsp; h<sub>r</sub> = M·Q², M = 8(λL/d + Σξ)/(gπ²d⁴).",
    varianta: () => "Standul propriu fiecărui student: temperatura apei, diametrul și rugozitatea reale ale conductei, coeficienții ξ ai elementelor, caracteristicile pompelor.",
    indicatii: "Comparați λ cu Blasius și Colebrook și plasați punctele pe diagrama Moody, comparați ξ cu Tabelul 6.1, explicați creșterea cotei piezometrice la lărgire, discutați efectul termostatului asupra debitului…"
  },
  subsol: "Modelul: λ după Colebrook cu diametrul și rugozitatea reale ale exemplarului, coeficienții ξ individuali, Borda–Carnot la lărgire, debitul în funcție de deschiderea robinetului de reglare, nivelurile piezometrelor cu perna de aer din colector, erori de citire de ± 1…2 mm, bule de aer până la aerisire; pompa de 12 V cu H = H₀ − a·Q².",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  animatie: {
    titluTab: "Standul (3D)", titlu: "Standul pentru pierderi de sarcină – modelul 3D",
    intro: `<p>Același stand, în 3D: rotiți cu mouse-ul, rotița = zoom. Starea (pompa, robinetele, aerisirea, nivelurile) este cea din simulator. Clic pe butoanele cutiei de comandă, pe roata roșie (−5 %, Shift+clic +5 %), pe pârghia robinetului cu bilă, pe bilele albastre ale prizelor, pe supapa / pompa de mână a colectorului.</p>`,
    modul: "aparate3d.js?v=10", functie: "creeazaPierderi", optiuni: { laClic: (k, e) => laClic3d(k, e) },
    dupa: `<div class="mf6-vederi"><span class="nota">Vedere:</span>${[["tot", "Ansamblu"], ["pompa", "Pompa și robinetul de reglare"], ["piezo", "Panoul de piezometre"], ["largire", "Lărgirea și îngustarea"], ["vertical", "Cot, robinet cu bilă, debitmetru"], ["p12", "Pompa de 12 V"]].map(([k, t]) => `<button type="button" data-v3="${k}">${t}</button>`).join("")}</div>`
  },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena scena-foto">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <svg id="svg-pierderi" viewBox="0 0 1536 790" role="img" aria-label="Standul pentru pierderi de sarcină: rezervor, pompă centrifugă cu cutie de comandă, robinet de reglare, conducta de 17 mm cu prizele 1–7, lărgirea și îngustarea, cotul, robinetul cu bilă, rotametrul, debitmetrul cu turbină, returul și panoul cu 7 piezometre"></svg>
      <div class="afisaje">
        <div class="afisaj"><span>Debitmetru</span><b id="af-Q">0,000</b><small>L/s</small></div>
        <div class="afisaj"><span>Temperatura apei</span><b id="af-T">—</b><small>°C</small></div>
        <div class="afisaj"><span>Robinet de reglare</span><b id="af-a">40</b><small>% deschidere</small></div>
        <div class="afisaj"><span id="af-4n">Robinet cu bilă</span><b id="af-4">deschis</b><small id="af-4u"></small></div>
      </div>
      <p class="nota">Citirea piezometrelor [mm]:</p><div class="mf6-piez" id="piez"></div>
      <div class="grafic-mic"><canvas id="cv-live" height="220" aria-label="Nivelurile piezometrelor 1…7, în timp real"></canvas></div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-nssm1"> Priză cu protecție diferențială, mâini uscate, podea uscată</label>
      <label class="bifa"><input type="checkbox" id="ck-nssm2"> Furtunurile fixate; nu se desfac sub presiune</label>
      <h2>Standul vostru</h2>
      <p class="nota" id="nota-stand"></p>
      <div class="rand-butoane"><button type="button" id="b-start">I Pornire pompă</button><button type="button" id="b-stop">0 Oprire pompă</button></div>
      <button type="button" class="lat" id="b-aer">Aerisește toate prizele (robinetele de aerisire)</button>
      <label class="bifa"><input type="checkbox" id="ck-rapid"> Timp accelerat ×5 (stabilizarea)</label>
      <button type="button" class="lat" id="b-T">● Temperatura apei → Tabelul 6.0</button>
      <h2>Robinetele</h2>
      <p class="nota">Robinetul de reglare (roata roșie; clic pe roată = −5 %, Shift+clic = +5 %; tastele ↑ ↓):</p>
      <div class="roata-butoane">
        <button type="button" data-da="-10">−10</button><button type="button" data-da="-5">−5</button><button type="button" data-da="-1">−1</button>
        <button type="button" data-da="1">+1</button><button type="button" data-da="5">+5</button><button type="button" data-da="10">+10</button>
      </div>
      <p class="nota"><b class="af-a"></b></p>
      <button type="button" class="lat" id="b-bila">Robinetul cu bilă: deschis</button>
      <h2>Colectorul piezometrelor</h2>
      <p class="nota">Dacă un nivel iese din scală, mutați toate nivelurile împreună (diferențele nu se schimbă).</p>
      <div class="rand-butoane"><button type="button" data-off="50">Pompa de mână (+50 mm)</button><button type="button" data-off="-50">Supapa de aer (−50 mm)</button></div>
      <h2>Înregistrare</h2>
      <button type="button" class="primar lat" id="b-rand">● Q și nivelurile → Tabelul 6.2</button>
      <button type="button" class="lat" id="b-part">● Robinet cu bilă parțial închis: Q, Δh₁₋₂, Δh₆₋₇ → Tab. 6.4</button>
      <h2>Pompa electrică de 12 V</h2>
      <div class="rand-butoane"><button type="button" id="b-p12">Montează pompa de 12 V</button><button type="button" id="b-sursa">Sursa 12 V: pornește ieșirea</button></div>
      <button type="button" class="lat" id="b-pfd">● Q și p – robinet cu bilă deschis → Tab. 6.5</button>
      <button type="button" class="lat" id="b-pfp">● Q și p – parțial închis → Tab. 6.5</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari"><summary>Afișare</summary>
        <label class="bifa"><input type="checkbox" id="ck-et" checked> Etichete pe fotografie</label>
      </details>
    </aside>
  </div>`,
    init(C) {
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      construiesteSVG();
      $("#ck-nssm1").addEventListener("change", e => { sim.nssm1 = e.target.checked; });
      $("#ck-nssm2").addEventListener("change", e => { sim.nssm2 = e.target.checked; });
      $("#ck-rapid").addEventListener("change", e => { sim.viteza = e.target.checked ? 5 : 1; });
      $("#b-start").addEventListener("click", pornestePompa); $("#b-stop").addEventListener("click", oprestePompa);
      $("#b-aer").addEventListener("click", () => aeriseste(null));
      $("#b-T").addEventListener("click", inregT);
      $$("[data-da]").forEach(b => b.addEventListener("click", () => seteazaA(sim.a + +b.dataset.da)));
      $$("[data-off]").forEach(b => b.addEventListener("click", () => aerColector(+b.dataset.off)));
      $("#b-bila").addEventListener("click", comutaBila);
      $("#b-rand").addEventListener("click", inregRand); $("#b-part").addEventListener("click", inregPartial);
      $("#b-p12").addEventListener("click", comutaP12); $("#b-sursa").addEventListener("click", comutaSursa);
      $("#b-pfd").addEventListener("click", e => inregPF(e, "d")); $("#b-pfp").addEventListener("click", e => inregPF(e, "p"));
      $("#ck-et").addEventListener("change", e => { sim.etichete = e.target.checked; SV.et.style.display = sim.etichete ? "" : "none"; });
      document.addEventListener("click", e => { const b = e.target.closest("[data-v3]"); if (b) vedere3d(b.dataset.v3); });
      document.addEventListener("keydown", e => {
        if (!$("#tab-sim").classList.contains("activ") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); seteazaA(sim.a + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 5 : 1)); }
      });
      actualizeaza();
      C.mesaj("Bifați NSSM, porniți pompa cu robinetul de reglare parțial deschis, aerisiți prizele și citiți temperatura apei.", "");
    },
    reset() { Object.assign(sim, { pompa: false, a: 40, bila: true, aer: [false, false, false, false, false, false, false], off: 500, p12: false, sursa: false, q: 0, tStab: 0 }); if (SV.g) actualizeaza(); },
    cadru(dt0, C, vizibil) {
      const h = Math.min(0.05, dt0 || 0.016), dt = h * sim.viteza;
      sim.t += dt; sim.tStab += dt;
      const qt = Qtinta(); sim.q += (qt - sim.q) * (1 - Math.exp(-dt / 0.9)); if (Math.abs(sim.q - qt) < 1e-5) sim.q = qt;
      const L = nivAdev(); sim.niv = sim.niv.map((v, i) => v + (L[i] - v) * (1 - Math.exp(-dt / 1.6)));
      if (now() - (this._tz || 0) > 350) { this._tz = now(); const fq = Math.min(1, sim.q / 0.4);
        sim.zg = sim.zg.map((_, i) => (Math.random() - 0.5) * (curge() ? 2.2 * fq : 0) + (sim.aer[i] || !curge() ? 0 : Math.sin(sim.t * 3 + i) * 8));
        sim.zgQ = curge() ? (Math.random() - 0.5) * 0.002 : 0; }
      if (sim.p12) sim.kPa = sim.sursa ? Hpompa12() * 9.81 + (Math.random() - 0.5) * 0.08 : 0;
      const t = now();
      if (C.tabActiv === "anim" && t - (this._t3 || 0) > 150) { this._t3 = t; sincron3d(); }
      if (!vizibil) return;
      miscaParticule(h);
      if (t - (this._td || 0) > 100) { this._td = t; afisaje(); actualizeazaSVG(); }
      if (t - (this._ts || 0) > 400) { this._ts = t; actualizeazaButoane(); deseneazaLive(); C.stare(1, curge() ? `Q = ${fx(Qaf(), 3)} L/s` : "pompa oprită", curge() ? "inc" : ""); C.stare(2, sim.p12 ? "pompa de 12 V" : `prize aerisite ${sim.aer.filter(Boolean).length}/7`); }
    },
    redeseneaza() { deseneazaLive(); },
    formule() { return []; }
  }
});
function now() { return performance.now(); }
