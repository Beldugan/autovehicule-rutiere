/* MF – Lucrarea 3. Legea lui Pascal: transmiterea hidraulică a forței în sistemul de frânare.
   Simulator: pedală cu dinamometru, servofrână cu vacuum (pompă Mityvac), pompă centrală tandem în secțiune,
   manometre pe cele două circuite, etrier cu celulă de forță în locul discului. */
"use strict";
const M3 = MODELE["mf-l3"];
const { TREPTE1, TREPTE2, DM } = M3;

/* ------------------------------------------------------------------ starea simulatorului */
const sim = { Fp: 0, tinta: null, tine: 0, vac: 0, defect: "none", p1: 0, p2: 0, Fc: 0, pAf1: 0, pAf2: 0, vAf: 0, sp: 0, etichete: true, zgomot: 0 };
function P() { return Cadru.P; }
function prEfectiv() {
  const pr = Object.assign({}, P());
  if (sim.defect === "gripat") pr.etaP *= 0.78;
  if (sim.defect === "garnitura") pr.etaC *= 0.80;
  if (sim.defect === "secundar") pr.dp2 = 0.12;
  return pr;
}
function FpAfisat() { return Math.round((sim.Fp + sim.zgomot) * 10) / 10; }
function servoActiv() { return sim.vac > 0.05; }
function calculeazaStare() {
  const pr = prEfectiv(), c = M3.citiri(sim.Fp, sim.vac, pr);
  sim.p1 = c.p1; sim.p2 = c.p2; sim.Fc = c.Fc;
  const aer = sim.defect === "aer" ? 4000 : 0; // mm³ de aer în circuit (pedală moale)
  sim.sp = sim.Fp > 0.5 ? M3.cursaPedala(M3.stare(sim.Fp, sim.vac, pr).p1, pr) + aer * (sim.p1 / (1 + sim.p1)) / M3.aria(DM) * M3.ip(pr) : 0;
}

/* ------------------------------------------------------------------ desenul: fotografia standului, animată */
/* Coordonatele componentelor în fotografia standului (1536 × 760 px). Pedala și tija sunt straturi decupate din aceeași
   fotografie: pedala se rotește în jurul articulației, tija (cu furca) se deplasează odată cu punctul de prindere. */
const FOTO = {
  piv: [288, 86], furca: [238, 242], ped: [50, 45], tija: [205, 208], talpa: [112, 315],
  g0: { cx: 445.3, cy: 61, r: 37.5 }, g1: { cx: 1062.3, cy: 225.3, r: 41.5 }, g2: { cx: 1002, cy: 401.7, r: 41.5 },
  lcd: { x: 1228, y: 556, w: 145, h: 53 }, fer: { x: 739, y: 279, w: 140, h: 47 }
};
const PXMM_PED = 463.7 / 280;           // scara pedalei în fotografie [px/mm]
const SV = { g: null };
function rotPct(x, y, th) {             // rotire antiorară (vizual) cu th [rad] în jurul articulației pedalei
  const [px, py] = FOTO.piv, dx = x - px, dy = y - py;
  return [px + dx * Math.cos(th) + dy * Math.sin(th), py - dx * Math.sin(th) + dy * Math.cos(th)];
}
/** cadran de manometru desenat peste cadranul din fotografie (rama rămâne cea reală) */
function cadranFoto(parent, o) {
  const { cx, cy, r } = o, g = mk("g", {}, parent), max = o.max, a0 = -135, a1 = 135;
  mk("circle", { cx, cy, r: r + 0.6, fill: "url(#gCadran)" }, g);
  const ang = v => (a0 + (a1 - a0) * v / max) * Math.PI / 180, P = (rr, v) => [cx + rr * Math.sin(ang(v)), cy - rr * Math.cos(ang(v))];
  if (o.rosu != null) { const [x1, y1] = P(r - 5, o.rosu), [x2, y2] = P(r - 5, max); mk("path", { d: `M${x1} ${y1} A ${r - 5} ${r - 5} 0 0 1 ${x2} ${y2}`, fill: "none", stroke: "#c62828", "stroke-width": 3.2 }, g); }
  for (let v = 0; v <= max + 1e-9; v += o.min) {
    const maj = Math.abs(v / o.maj - Math.round(v / o.maj)) < 1e-6, [x1, y1] = P(r - 2.5, v), [x2, y2] = P(r - (maj ? 9 : 5.5), v);
    mk("line", { x1, y1, x2, y2, stroke: "#151515", "stroke-width": maj ? 1.4 : 0.6 }, g);
    if (maj) { const [xt, yt] = P(r * 0.6, v), t = mk("text", { x: xt, y: yt + r * 0.07, "font-size": r * 0.2, "text-anchor": "middle", fill: "#151515", "font-family": "Arial, sans-serif", "font-weight": 700 }, g); t.textContent = o.et ? o.et(v) : v; }
  }
  const tu = mk("text", { x: cx, y: cy + r * 0.38, "font-size": r * 0.19, "text-anchor": "middle", fill: "#222", "font-family": "Arial, sans-serif", "font-weight": 700 }, g); tu.textContent = o.unit;
  const ts = mk("text", { x: cx, y: cy + r * 0.58, "font-size": r * 0.14, "text-anchor": "middle", fill: "#555", "font-family": "Arial, sans-serif" }, g); ts.textContent = o.sub || "";
  const umbra = mk("polygon", { points: `0,${-(r - 7)} -2.2,3 -1.4,${r * 0.2} 1.4,${r * 0.2} 2.2,3`, fill: "#000", opacity: 0.25, filter: "url(#fBlur1)" }, g);
  const ac = mk("polygon", { points: `0,${-(r - 7)} -2.2,3 -1.4,${r * 0.2} 1.4,${r * 0.2} 2.2,3`, fill: "#111" }, g);
  mk("circle", { cx, cy, r: r * 0.11, fill: "url(#gOtelR)", stroke: "#333", "stroke-width": 0.6 }, g);
  mk("path", { d: `M${cx - r + 3} ${cy - 4} A ${r - 3} ${r - 3} 0 0 1 ${cx + r * 0.4} ${cy - r + 4} Q ${cx - r * 0.2} ${cy - r * 0.5} ${cx - r + 3} ${cy - 4} Z`, fill: "url(#gSticla)" }, g);
  return v => {
    const a = a0 + (a1 - a0) * clamp(v, -max * 0.02, max * 1.03) / max;
    ac.setAttribute("transform", `translate(${cx},${cy}) rotate(${a})`); umbra.setAttribute("transform", `translate(${cx + 1.5},${cy + 2.2}) rotate(${a})`);
  };
}
function eticheta(parent, x, y, x2, y2, text, ancora) {
  mk("line", { x1: x, y1: y, x2, y2, stroke: "#1b2a3a", "stroke-width": 1.2 }, parent);
  mk("circle", { cx: x, cy: y, r: 3, fill: "#1b2a3a" }, parent);
  const t = mk("text", { x: x2 + (ancora === "end" ? -5 : 5), y: y2 + 5, "text-anchor": ancora || "start", "font-size": 15, "font-weight": 600, fill: "#10202f", "font-family": "system-ui, sans-serif" }, parent);
  t.textContent = text;
  requestAnimationFrame(() => { try { const b = t.getBBox(); const r = mk("rect", { x: b.x - 5, y: b.y - 2, width: b.width + 10, height: b.height + 4, rx: 5, fill: "#ffffff", opacity: 0.88, stroke: "#c5ced8" }, parent); parent.insertBefore(r, t); } catch (e) { } });
}
function construiesteSVG() {
  const svg = $("#svg-pascal"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs);
  grad(defs, "gLichid", [[0, "#f3d27a"], [1, "#c7962b"]]);
  grad(defs, "gLCDf", [[0, "#a7b39b"], [1, "#909d86"]]);
  const cp = mk("clipPath", { id: "cTija" }, defs); mk("rect", { x: 0, y: 0, width: 448, height: 760 }, cp);
  const cf = mk("clipPath", { id: "cFer" }, defs); mk("rect", { x: FOTO.fer.x, y: FOTO.fer.y, width: FOTO.fer.w, height: FOTO.fer.h, rx: 4 }, cf);
  const g = mk("g", {}, svg); SV.g = g;
  mk("image", { href: "img/sim_stand.jpg", x: 0, y: 0, width: 1536, height: 760, preserveAspectRatio: "none" }, g);
  // pedala (strat decupat) și tija cu furca
  SV.gPed = mk("g", {}, g);
  mk("image", { href: "img/sim_pedala.png", x: FOTO.ped[0], y: FOTO.ped[1], width: 295, height: 485 }, SV.gPed);
  const gt = mk("g", { "clip-path": "url(#cTija)" }, g);
  SV.gTija = mk("g", {}, gt);
  mk("image", { href: "img/sim_tija.png", x: FOTO.tija[0], y: FOTO.tija[1], width: 247, height: 66 }, SV.gTija);
  // fereastra de secțiune a pompei centrale: pistoanele reale, animate
  const gw = mk("g", { "clip-path": "url(#cFer)" }, g), f = FOTO.fer, yc = f.y + f.h / 2;
  mk("rect", { x: f.x, y: f.y, width: f.w, height: f.h, fill: "#2a2d31" }, gw);
  SV.ferLichid = mk("rect", { x: f.x, y: yc - 15, width: f.w, height: 30, fill: "url(#gLichid)", opacity: 0.85 }, gw);
  SV.ferPist = [0, 1].map(k => { const p = mk("g", {}, gw); mk("rect", { x: 0, y: yc - 14, width: 34, height: 28, rx: 2, fill: "url(#gOtel)" }, p); [2, 28].forEach(x => mk("rect", { x, y: yc - 15, width: 5, height: 30, rx: 1.5, fill: "#151515" }, p)); mk("rect", { x: -30, y: yc - 5, width: 30, height: 10, fill: "url(#gCrom)" }, p); return p; });
  SV.ferArc = [0, 1].map(() => mk("path", { d: "", fill: "none", stroke: "#9aa1a8", "stroke-width": 1.6 }, gw));
  // cadranele manometrelor (scări corecte) și afișajele
  SV.vacuum = cadranFoto(g, Object.assign({}, FOTO.g0, { max: 1, maj: 0.5, min: 0.1, unit: "−bar", sub: "vacuum", et: v => String(v).replace(".", ",") }));
  SV.man1 = cadranFoto(g, Object.assign({}, FOTO.g1, { max: 160, maj: 40, min: 10, rosu: 120, unit: "bar", sub: "circuit 1" }));
  SV.man2 = cadranFoto(g, Object.assign({}, FOTO.g2, { max: 160, maj: 40, min: 10, rosu: 120, unit: "bar", sub: "circuit 2" }));
  const L = FOTO.lcd;
  mk("rect", { x: L.x, y: L.y, width: L.w, height: L.h, rx: 3, fill: "url(#gLCDf)" }, g);
  SV.lcdF = mk("text", { x: L.x + L.w - 8, y: L.y + L.h - 11, "text-anchor": "end", "font-size": 34, "font-family": "'Courier New', monospace", "font-weight": 700, fill: "#1d2618" }, g);
  const tu = mk("text", { x: L.x + 7, y: L.y + 16, "font-size": 12, "font-family": "Arial, sans-serif", fill: "#26301f" }, g); tu.textContent = "F [N]";
  // dinamometrul pedalei (traductor pe talpă + afișaj portabil)
  SV.cablu = mk("path", { d: "", fill: "none", stroke: "#1a1a1a", "stroke-width": 3, "stroke-linecap": "round" }, g);
  mk("rect", { x: 18, y: 150, width: 150, height: 66, rx: 9, fill: "url(#gNegru)", stroke: "#000" }, g);
  mk("rect", { x: 26, y: 158, width: 134, height: 38, rx: 3, fill: "url(#gLCDf)" }, g);
  SV.lcdFp = mk("text", { x: 152, y: 188, "text-anchor": "end", "font-size": 26, "font-family": "'Courier New', monospace", "font-weight": 700, fill: "#1d2618" }, g);
  const tf = mk("text", { x: 30, y: 170, "font-size": 10, "font-family": "Arial, sans-serif", fill: "#26301f" }, g); tf.textContent = "Fp [N]";
  const tf2 = mk("text", { x: 93, y: 210, "font-size": 9.5, "text-anchor": "middle", "font-family": "Arial, sans-serif", fill: "#d8dde2" }, g); tf2.textContent = "dinamometru pedală 0…500 N";
  // rigla pentru cursa pedalei
  const yR = 524, x0 = FOTO.talpa[0];
  mk("rect", { x: x0 - 22, y: yR, width: 245, height: 18, rx: 2, fill: "url(#gCrom)", stroke: "#6b737c" }, g);
  for (let mm = 0; mm <= 130; mm += 1) {
    const x = x0 + mm * PXMM_PED, l = mm % 10 === 0 ? 8 : mm % 5 === 0 ? 5.5 : 3;
    if (x > x0 + 220) break;
    mk("line", { x1: x, y1: yR, x2: x, y2: yR + l, stroke: "#1b1b1b", "stroke-width": mm % 10 ? 0.5 : 0.9 }, g);
    if (mm % 20 === 0) { const t = mk("text", { x, y: yR + 16.5, "font-size": 7.5, "text-anchor": "middle", fill: "#1b1b1b", "font-family": "Arial, sans-serif" }, g); t.textContent = mm; }
  }
  SV.indic = mk("path", { d: "", fill: "#d32f2f", stroke: "#7f1010", "stroke-width": 0.6 }, g);
  // cotele L și l (varianta individuală)
  SV.cote = mk("g", {}, g);
  // etichete
  SV.et = mk("g", {}, g);
  eticheta(SV.et, 288, 86, 175, 40, "Articulația pedalei", "end");
  eticheta(SV.et, 430, 100, 395, 16, "Rezervor de vacuum + vacuummetru", "end");
  eticheta(SV.et, 600, 180, 640, 14, "Servofrâna cu vacuum Ø250 mm");
  eticheta(SV.et, 820, 160, 900, 58, "Rezervorul lichidului de frână");
  eticheta(SV.et, 1062, 184, 1150, 118, "Manometru circuit 1 (spre etrier)");
  eticheta(SV.et, 800, 310, 705, 468, "Pompa centrală tandem (fereastră de secțiune)");
  eticheta(SV.et, 1002, 452, 905, 528, "Manometru circuit 2 (circuit închis cu dop)", "end");
  eticheta(SV.et, 1400, 180, 1520, 14, "Etrier flotant – celula de forță între plăcuțe", "end");
  eticheta(SV.et, 1300, 610, 1240, 690, "Afișajul celulei de forță", "end");
  prefixeazaId(svg, "p3-");
  actualizeazaCote();
  actualizeazaSVG();
}
function actualizeazaCote() {
  if (!SV.cote) return;
  SV.cote.innerHTML = "";
  const l = P().l, [px, py] = FOTO.piv, g = SV.cote;
  const t = mk("text", { x: 22, y: 132, "font-size": 15, "font-weight": 700, fill: "#0d2a52", "font-family": "system-ui, sans-serif" }, g);
  t.textContent = `L = 280 mm · l = ${l} mm · i_p = ${fmt(280 / l, 2)}`;
  requestAnimationFrame(() => { try { const b = t.getBBox(); const r = mk("rect", { x: b.x - 5, y: b.y - 2, width: b.width + 10, height: b.height + 4, rx: 5, fill: "#fff", opacity: 0.9, stroke: "#9fb3c8" }, g); g.insertBefore(r, t); } catch (e) { } });
}
function actualizeazaSVG() {
  if (!SV.g) return;
  const th = Math.atan2(sim.sp, M3.L);                            // unghiul pedalei din cursa tălpii
  SV.gPed.setAttribute("transform", `rotate(${-th * 180 / Math.PI} ${FOTO.piv[0]} ${FOTO.piv[1]})`);
  const [fx, fy] = rotPct(FOTO.furca[0], FOTO.furca[1], th);
  SV.gTija.setAttribute("transform", `translate(${fx - FOTO.furca[0]},${fy - FOTO.furca[1]})`);
  const [tx, ty] = rotPct(FOTO.talpa[0], FOTO.talpa[1] + 200, th);
  SV.indic.setAttribute("d", `M${tx} 522 l-6 -10 h12 z`);
  const [cx, cy] = rotPct(72, 400, th);
  SV.cablu.setAttribute("d", `M93 216 C 93 300, ${cx - 40} ${cy - 40}, ${cx} ${cy}`);
  SV.lcdFp.textContent = FpAfisat().toFixed(0);
  SV.vacuum(sim.vAf); SV.man1(sim.pAf1); SV.man2(sim.pAf2);
  SV.lcdF.textContent = Math.round(sim.Fc).toString();
  // pistoanele din fereastra de secțiune: cursa reală s_m = s_p/i_p (2 px/mm)
  const f = FOTO.fer, yc = f.y + f.h / 2, sm = sim.sp / M3.ip(P()), s2 = Math.max(0, sm - 1.5) * 0.85 + Math.min(sm, 1.5);
  const x1 = f.x + 18 + sm * 2, x2 = f.x + 86 + s2 * 2;
  SV.ferPist[0].setAttribute("transform", `translate(${x1},0)`); SV.ferPist[1].setAttribute("transform", `translate(${x2},0)`);
  const arc = (a, b) => { let d = `M${a} ${yc}`; const n = 7; for (let i = 1; i <= n; i++) d += ` L${a + (b - a) * i / n} ${yc + (i % 2 ? -10 : 10)}`; return d; };
  SV.ferArc[0].setAttribute("d", arc(x1 + 34, x2 - 30)); SV.ferArc[1].setAttribute("d", arc(x2 + 34, f.x + f.w));
  SV.ferLichid.setAttribute("fill", `hsl(${42 - 30 * clamp(sim.p1 / 120, 0, 1)}, 75%, ${58 - 10 * clamp(sim.p1 / 120, 0, 1)}%)`);
  SV.et.style.display = sim.etichete ? "" : "none";
  SV.cote.style.display = sim.etichete ? "" : "none";
}

/* ------------------------------------------------------------------ comenzi și înregistrare */
function seteazaF(F) { sim.Fp = clamp(F, 0, 420); sim.tinta = null; }
function inregistreaza(e) {
  const F = FpAfisat(), srv = servoActiv();
  const trepte = srv ? TREPTE2 : TREPTE1, tb = srv ? "t32" : "t31";
  const T = trepte.reduce((a, b) => Math.abs(b - F) < Math.abs(a - F) ? b : a, trepte[0]);
  const p1 = Math.round(sim.p1 * 10) / 10, p2 = Math.round(sim.p2 * 10) / 10, Fc = Math.round(sim.Fc);
  let msg, celule = [];
  if (srv && (sim.vac < 0.6 || sim.vac > 0.7)) msg = `Citire salvată în jurnal, dar vacuumul (${fmt(sim.vac, 2)} bar) nu este în intervalul 0,6…0,7 bar cerut pentru Tabelul 3.2.`;
  else if (Math.abs(F - T) > 3) msg = `Citire salvată în jurnal (F_p = ${fmt(F, 1)} N), dar forța nu corespunde unei trepte din tabel (${trepte.join(", ")} N).`;
  else {
    celule.push({ t: tb, r: String(T), c: "p", v: p1.toFixed(1) }, { t: tb, r: String(T), c: "Fc", v: String(Fc) });
    if (!srv) celule.push({ t: tb, r: String(T), c: "p2", v: p2.toFixed(1) });
    msg = `Tabelul ${srv ? "3.2" : "3.1"}: F_p = ${T} N → p = ${fmt(p1, 1)} bar${srv ? "" : `, p₂ = ${fmt(p2, 1)} bar`}, F_c = ${Fc} N.`;
    if (p1 > 120) msg += " Atenție: peste 120 bar (limita NSSM a standului).";
  }
  const ok = Cadru.inregistreaza(e, { log: { Fp: F, vac: +sim.vac.toFixed(3), servo: srv, p1, p2, Fc }, celule });
  if (ok) { $("#msg-inreg").textContent = msg; deseneazaLive(); }
}
function masoaraCursa(e) {
  if (servoActiv()) return Cadru.mesajTemporar("Cursa pedalei se măsoară fără vacuum în servofrână (descărcați vacuumul).", "atentie");
  if (Math.abs(FpAfisat() - 300) > 3) return Cadru.mesajTemporar("Aduceți forța pe pedală la 300 N, apoi citiți poziția tălpii pe riglă.", "atentie");
  const s = Math.round(sim.sp * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { cursa: s }, celule: [{ t: "t33", r: "s", c: "s", v: s.toFixed(1) }] });
  if (ok) $("#msg-inreg").textContent = `Tabelul 3.3: cursa pedalei de la 0 la 300 N = ${fmt(s, 1)} mm.`;
}

/* ------------------------------------------------------------------ grafic în timp real */
function deseneazaLive() {
  const cv = $("#cv-live"); if (!cv || !cv.getClientRects().length) return;
  const t = Cadru.D.t, pts1 = TREPTE1.map(F => [F, num((t.t31[F] || {}).p)]).filter(p => p[1] > 0), pts2 = TREPTE2.map(F => [F, num((t.t32[F] || {}).p)]).filter(p => p[1] > 0);
  const i = M3.ip(P()), Am = M3.aria(DM);
  deseneazaGrafic(cv, { xmin: 0, xmax: 400, xticks: [0, 50, 100, 150, 200, 250, 300, 350, 400], ymin: 0, ymax: 160, yticks: [0, 20, 40, 60, 80, 100, 120, 140, 160], xlab: "F_p [N]", ylab: "p [bar]", serii: [
    { tip: "linie", pts: [[0, 0], [400, 400 * i / Am * 10]], culoare: 0, punctat: true },
    { tip: "pct", pts: pts1, culoare: 0 }, { tip: "pct", pts: pts2, culoare: 1 },
    { tip: "pct", pts: [[FpAfisat(), sim.p1]], culoare: 2, r: 6 }] });
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaL3(D) {
  const o = M3.prelucreaza(D.t, D.date, { num });
  const cel = { t31: {}, t32: {}, t33: {} }, rele = { t31: {}, t32: {} };
  TREPTE1.forEach(F => { const r = o.r1[F] || {}; cel.t31[F] = { pc: fmt(r.pc, 1), etaP: fmt(r.etaP, 3), Fcc: fmt(r.Fcc, 0), etaC: fmt(r.etaC, 3), dp: num(D.t.t31[F].p) > 0 && num(D.t.t31[F].p2) > 0 ? fmt((1 - num(D.t.t31[F].p2) / num(D.t.t31[F].p)) * 100, 1) + " %" : "" };
    rele.t31[F] = { etaP: r.etaP < 0.85 || r.etaP > 0.99, etaC: r.etaC < 0.85 || r.etaC > 1.0, dp: num(D.t.t31[F].p) > 0 && (1 - num(D.t.t31[F].p2) / num(D.t.t31[F].p)) > 0.03 }; });
  TREPTE2.forEach(F => { const r = o.r2[F] || {}; cel.t32[F] = { pf: fmt(r.pf, 1), k: fmt(r.k, 2) }; });
  const s = num(D.t.t33.s.s);
  cel.t33.s = { sm: fmt(s / o.ip, 1), V: fmt(s / o.ip * o.Am / 1000, 2), Vc: fmt(0.3 * o.Ac / 1000, 3) };
  // saturația servofrânei: prima treaptă la care factorul scade cu > 8 % față de maxim
  const ks = TREPTE2.map(F => [F, (o.r2[F] || {}).k]).filter(x => x[1] > 0);
  const kmax = Math.max(0, ...ks.filter(x => x[0] >= 50).map(x => x[1]));
  const sat = ks.find(x => x[0] >= 100 && x[1] < kmax * 0.92);
  const rez = [
    ["Raportul pedalei i<sub>p</sub> = L/l", `${M3.L}/${fmt(num(D.date.l), 0)} = ${fmt(o.ip, 2)}`],
    ["Ariile A<sub>m</sub> (d<sub>m</sub> = 22,22 mm) / A<sub>c</sub>", `${fmt(o.Am, 1)} / ${fmt(o.Ac, 1)} mm²`],
    ["Raportul ariilor A<sub>c</sub>/A<sub>m</sub> (3.7)", fmt(o.Ac / o.Am, 2)],
    ["Randamentul pedalei η<sub>p</sub> (medie, F ≥ 100 N)", `<span style='color:var(--accent)'>${fmt(o.etaP, 3)}</span>`],
    ["Randamentul etrierului η<sub>c</sub> (medie)", fmt(o.etaC, 3)],
    ["Factorul de amplificare la 100 N", fmt(o.k100, 2)],
    ["Punctul de saturație al servofrânei", sat ? `între ${TREPTE2[TREPTE2.indexOf(sat[0]) - 1]} și ${sat[0]} N` : (ks.length > 4 ? "nu a fost atins (≤ 300 N)" : "—")],
    ["Forța de frânare la roată la 200 N (fără servo)", Number.isFinite(o.Fr200) ? `F<sub>f</sub> = ${fmt(o.Fr200 * 0.30 / 0.11, 0)} N · M<sub>f</sub> = ${fmt(o.Fr200 * 0.30, 0)} N·m · F<sub>r</sub> = ${fmt(o.Fr200, 0)} N` : "—"],
    ["Cursa pompei pentru 0,3 mm la etrier (3.8)", `${fmt(o.sm03, 2)} mm`]
  ];
  const verdicte = [];
  if (Number.isFinite(o.etaP)) verdicte.push(o.etaP >= 0.85 ? { tip: "ok", text: `η<sub>p</sub> = ${fmt(o.etaP, 3)} – în intervalul normal 0,85…0,98.` } : { tip: "atentie", text: `η<sub>p</sub> = ${fmt(o.etaP, 3)} este sub 0,85: frecări mari în articulațiile pedalei sau la tija servofrânei.` });
  if (Number.isFinite(o.etaC)) verdicte.push(o.etaC >= 0.85 ? { tip: "ok", text: `η<sub>c</sub> = ${fmt(o.etaC, 3)} – garnitura pistonului etrierului este în stare bună.` } : { tip: "atentie", text: `η<sub>c</sub> = ${fmt(o.etaC, 3)} – frecare mare la garnitura etrierului (piston gripat / garnitură uzată).` });
  const dps = TREPTE1.map(F => num(D.t.t31[F].p) > 5 ? 1 - num(D.t.t31[F].p2) / num(D.t.t31[F].p) : NaN).filter(Number.isFinite);
  if (dps.length) { const m = dps.reduce((a, b) => a + b, 0) / dps.length; verdicte.push(m > 0.03 ? { tip: "atentie", text: `Circuitul 2 are presiunea cu ${fmt(m * 100, 1)} % mai mică: defect al pompei centrale tandem (etanșarea pistonului secundar).` } : { tip: "ok", text: `Presiunile pe cele două circuite diferă cu ${fmt(m * 100, 1)} % (< 2–3 %): pompa tandem este în regulă.` }); }
  if (Number.isFinite(s) && s > 0) verdicte.push(s > 35 ? { tip: "atentie", text: `Cursa pedalei de ${fmt(s, 0)} mm la 300 N este mare: aer în circuit sau conducte elastice (vezi lucrarea 2).` } : { tip: "ok", text: `Cursa pedalei la 300 N: ${fmt(s, 0)} mm – pedală fermă.` });
  const i = o.ip, Am = o.Am;
  const serii = [
    { tip: "linie", pts: [[0, 0], [400, 400 * i / Am * 10]], culoare: 0, punctat: true },
    { tip: "pct", pts: TREPTE1.map(F => [F, num(D.t.t31[F].p)]).filter(p => p[1] > 0), culoare: 0 },
    { tip: "pct", pts: TREPTE2.map(F => [F, num(D.t.t32[F].p)]).filter(p => p[1] > 0), culoare: 1 },
    { tip: "linie", pts: TREPTE2.map(F => [F, num(D.t.t32[F].p)]).filter(p => p[1] > 0), culoare: 1 }
  ];
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Presiunea în circuit p(F<sub>p</sub>) – fără și cu servofrână",
    grafic: { xmin: 0, xmax: 320, xticks: [0, 50, 100, 150, 200, 250, 300], ymin: 0, ymax: 160, yticks: [0, 20, 40, 60, 80, 100, 120, 140, 160], xlab: "F_p [N]", ylab: "p [bar]", serii },
    legenda: [["fără servofrână", "var(--serie-0)", "pct"], ["teoretic ideal (η = 1)", "var(--serie-0)"], ["cu servofrână (0,6…0,7 bar)", "var(--serie-1)", "pct"]],
    principal: { eticheta: "η_p mediu", valoare: Number.isFinite(o.etaP) ? +o.etaP.toFixed(3) : null }, o
  };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<figure><img src="img/stand.jpg" alt="Standul de frânare hidraulică: pedală, servofrână, pompă centrală tandem, manometre și etrier" loading="lazy"></figure>
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Standul se verifică înainte de lucru: conductele și racordurile fără scurgeri, manometrele cu acul la zero, dispozitivele de fixare strânse.</li>
<li>Nu se introduc degetele între plăcuțele etrierului, între celula de forță și etrier sau în articulațiile pedalei când se acționează pedala.</li>
<li>Pedala se apasă progresiv; forța pe pedală nu depășește 400 N, iar presiunea în circuit 120 bar.</li>
<li>Lichidul de frână se manipulează cu mănuși și ochelari; scurgerile se șterg imediat.</li>
<li>Pompa de vid se conectează și se deconectează numai cu motorul/pompa oprită.</li></ul></div>
<h2>3.1. Scopul lucrării</h2>
<p>Verificarea legii lui Pascal și a legii fundamentale a hidrostaticii pe un circuit real de frânare: determinarea presiunii create de pompa centrală, a forței de strângere la etrier și a raportului de amplificare a forței, cu și fără servofrână. Se calculează randamentul transmisiei hidraulice și forța de frânare la roată.</p>
<h2>3.2. Noțiuni teoretice</h2>
<p>În lichidul în repaus presiunea într-un punct este aceeași pe toate direcțiile și crește cu adâncimea după legea fundamentală a hidrostaticii. Legea lui Pascal este consecința ei: o variație de presiune produsă într-un punct al lichidului se transmite integral în toate punctele lui.</p>
<div class="ec"><span>p = p<sub>0</sub> + ρ·g·h</span><span class="nr">(3.1)</span></div>
<div class="ec"><span>Δp<sub>A</sub> = Δp<sub>B</sub> &nbsp; (Pascal)</span><span class="nr">(3.2)</span></div>
<p>În circuitul de frânare diferența de nivel dintre pompa centrală și etrier este sub 1 m, deci termenul ρ·g·h (sub 0,1 bar) este neglijabil față de presiunea de lucru (20…150 bar); presiunea este practic aceeași în tot circuitul.</p>
<figure><img src="img/fig3_1.jpg" alt="Fig. 3.1 Standul de frânare" loading="lazy"><figcaption>Fig. 3.1. Standul de frânare: pedală cu dinamometru, pompă centrală, manometru, etrier cu celulă de forță</figcaption></figure>
<p>Pedala este o pârghie cu raportul i<sub>p</sub> = L/l (uzual 3…5). Forța pe tija pompei centrale, presiunea în circuit și forța de strângere la etrier sunt:</p>
<div class="ec"><span>F<sub>t</sub> = F<sub>p</sub> · i<sub>p</sub> · η<sub>p</sub></span><span class="nr">(3.3)</span></div>
<div class="ec"><span>p = F<sub>t</sub> / A<sub>m</sub></span><span class="nr">(3.4)</span></div>
<div class="ec"><span>F<sub>c</sub> = p · A<sub>c</sub> · η<sub>c</sub></span><span class="nr">(3.5)</span></div>
<div class="ec"><span>A = π·d²/4</span><span class="nr">(3.6)</span></div>
<p>Raportul dintre forța la etrier și forța pe tijă este egal cu raportul ariilor A<sub>c</sub>/A<sub>m</sub>: forța se multiplică, dar, conform conservării volumului (și a lucrului mecanic), cursa pistonului etrierului este de atâtea ori mai mică decât cursa pistonului pompei centrale.</p>
<div class="ec"><span>F<sub>c</sub>/F<sub>t</sub> = A<sub>c</sub>/A<sub>m</sub></span><span class="nr">(3.7)</span></div>
<div class="ec"><span>s<sub>c</sub>·A<sub>c</sub> = s<sub>m</sub>·A<sub>m</sub> &nbsp; (conservarea volumului)</span><span class="nr">(3.8)</span></div>
<p>Servofrâna cu vacuum (sau servofrâna electromecanică, la vehiculele electrice și hibride) adaugă o forță proporțională cu forța pe pedală; factorul de amplificare este uzual 4…7, până la punctul de saturație (Fig. 3.2), după care presiunea crește doar cu forța șoferului. Forța maximă de asistare este Δp<sub>vacuum</sub>·A<sub>membrană</sub>.</p>
<figure><img src="img/fig3_2.jpg" alt="Fig. 3.2 Presiunea în funcție de forța pe pedală" loading="lazy"><figcaption>Fig. 3.2. Presiunea în circuit în funcție de forța pe pedală, fără și cu servofrână</figcaption></figure>
<p>Forța de frecare la un disc (două plăcuțe, coeficientul de frecare μ), momentul de frânare la raza efectivă r<sub>ef</sub> și forța de frânare la roata cu raza dinamică r<sub>d</sub> sunt:</p>
<div class="ec"><span>F<sub>f</sub> = 2·μ·F<sub>c</sub></span><span class="nr">(3.9)</span></div>
<div class="ec"><span>M<sub>f</sub> = F<sub>f</sub>·r<sub>ef</sub></span><span class="nr">(3.10)</span></div>
<div class="ec"><span>F<sub>r</sub> = M<sub>f</sub>/r<sub>d</sub></span><span class="nr">(3.11)</span></div>
<h2>3.4. Modul de lucru (în simulator)</h2>
<ol><li>Citiți pe stand brațele pedalei (L și l) și diametrul pistonului etrierului (varianta voastră); d<sub>m</sub> = 22,22 mm.</li>
<li>Fără vacuum în servofrână, apăsați pedala în trepte de 50 N până la 300 N; la fiecare treaptă înregistrați presiunile pe cele două circuite și forța la etrier (Tabelul 3.1).</li>
<li>La 300 N citiți cursa pedalei pe riglă (Tabelul 3.3).</li>
<li>Creați vacuum de 0,6…0,7 bar cu pompa Mityvac și repetați măsurătorile cu treptele 25…300 N (Tabelul 3.2); identificați saturația.</li>
<li>Descărcați vacuumul și eliberați pedala.</li></ol>
<h2>3.7. Interpretarea rezultatelor</h2>
<ul><li>Randamentele trebuie să fie 0,85…0,98; valori mai mici indică frecări mari în articulațiile pedalei sau garnituri uzate. La 50 N randamentul aparent este mai mic din cauza arcului de revenire al pompei centrale.</li>
<li>Presiunile pe cele două circuite ale pompei tandem trebuie să fie egale (diferențe sub 2–3 %).</li>
<li>Forța se multiplică de A<sub>c</sub>/A<sub>m</sub> ori între pompa centrală și etrier, dar cursa se reduce în același raport (conservarea energiei).</li>
<li>Factorul de amplificare și punctul de saturație al servofrânei stabilesc forța maximă de frânare pe care o poate obține șoferul.</li></ul>
<h2>3.8. Relevanță practică</h2>
<p>Legea lui Pascal stă la baza tuturor sistemelor hidraulice ale autovehiculului: frâna, ambreiajul hidraulic, servodirecția hidraulică, suspensia hidropneumatică, cricul hidraulic și elevatorul din service. La vehiculele electrice, frâna electrohidraulică (de exemplu Bosch iBooster sau sistemele integrate „brake-by-wire”) păstrează circuitul hidraulic clasic, dar generează presiunea cu un motor electric, care dozează separat frânarea recuperativă și cea cu frecare.</p>`;

function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>F<sub>p</sub> = 200 N, i<sub>p</sub> = 4, d<sub>m</sub> = 22,22 mm, d<sub>c</sub> = 54 mm. Fără servofrână s-au măsurat p = 18,9 bar și F<sub>c</sub> = 4150 N.</p>
<div class="ec"><span>A<sub>m</sub> = π·22,22²/4 = 387,8 mm²; &nbsp; A<sub>c</sub> = π·54²/4 = 2290 mm²; &nbsp; A<sub>c</sub>/A<sub>m</sub> = 5,91</span><span class="nr">(3.12–3.14)</span></div>
<div class="ec"><span>η<sub>p</sub> = p·A<sub>m</sub>/(F<sub>p</sub>·i<sub>p</sub>) = 18,9·10⁵·387,8·10⁻⁶/(200·4) = 0,92</span><span class="nr">(3.15)</span></div>
<div class="ec"><span>η<sub>c</sub> = F<sub>c</sub>/(p·A<sub>c</sub>) = 4150/(18,9·10⁵·2290·10⁻⁶) = 4150/4329 = 0,96</span><span class="nr">(3.16)</span></div>
<div class="ec"><span>F<sub>f</sub> = 2·0,40·4150 = 3320 N; &nbsp; M<sub>f</sub> = 3320·0,11 = 365 N·m; &nbsp; F<sub>r</sub> = 365/0,30 = 1217 N</span><span class="nr">(3.17–3.19)</span></div>
<p>Cu servofrâna activă, la aceeași forță pe pedală s-au măsurat 92 bar; factorul de amplificare este 92/18,9 = 4,9. Deplasarea pistonului etrierului cu 0,2 mm (jocul plăcuțelor) cere la pompa centrală s<sub>m</sub> = 0,2·5,91 = 1,2 mm pentru un etrier – în realitate cursa pedalei este mai mare din cauza jocurilor, a elasticității conductelor și a compresibilității lichidului (lucrarea 2).</p>
<p><button type="button" data-scenariu="exemplu">Reproduce exemplul în simulator (i<sub>p</sub> = 4, d<sub>c</sub> = 54 mm, 200 N)</button></p>
<div class="problema"><h3>Problema 1</h3><p>Ce forță trebuie aplicată pe pedală (i<sub>p</sub> = 4, η<sub>p</sub> = 0,92, fără servofrână) pentru 100 bar în circuit? Este realistă pentru un șofer?</p>
<details class="sol"><summary>Rezolvare</summary><p>F<sub>t</sub> = p·A<sub>m</sub> = 100·10⁵·387,8·10⁻⁶ = 3878 N; F<sub>p</sub> = 3878/(4·0,92) = 1054 N – imposibil de obținut constant de un șofer obișnuit (≈ 500 N max.); de aceea servofrâna este obligatorie.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Diametrul pistonului etrierului crește de la 54 la 57 mm. Cu cât crește forța de strângere la aceeași presiune? Dar volumul de lichid necesar pentru 0,2 mm cursă?</p>
<details class="sol"><summary>Rezolvare</summary><p>F<sub>c</sub> ~ d²: (57/54)² = 1,114 → +11,4 %. Volumul crește în același raport: 0,2·2552 = 510 mm³ față de 458 mm³ – cursa pedalei crește.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Servofrâna cu membrana Ø250 mm lucrează cu vacuum 0,65 bar. Care este forța maximă de asistare? La ce forță pe pedală se saturează dacă factorul de amplificare este 4,9 (i<sub>p</sub> = 4, η<sub>p</sub> = 0,92)?</p>
<details class="sol"><summary>Rezolvare</summary><p>F<sub>as,max</sub> = 0,65·10⁵·π·0,25²/4 = 3190 N. Asistarea este (k − 1)·F<sub>p</sub>·i<sub>p</sub>·η<sub>p</sub> = 3,9·3,68·F<sub>p</sub> = 14,4·F<sub>p</sub> → saturație la F<sub>p</sub> ≈ 3190/14,4 = 222 N (cu pierderile membranei, ceva mai devreme).</p></details></div>`;
}
const INTREBARI = [
  ["Enunțați legea fundamentală a hidrostaticii și legea lui Pascal.", "p = p₀ + ρgh: presiunea crește liniar cu adâncimea. Pascal: o variație de presiune produsă într-un punct al unui lichid în repaus se transmite integral în toate punctele lui."],
  ["De ce diferența de nivel dintre pompa centrală și etrier nu influențează practic presiunea în circuit?", "ρgh pentru h &lt; 1 m este sub 0,1 bar, neglijabil față de 20…150 bar de lucru."],
  ["Cum se modifică forța la etrier dacă diametrul pistonului etrierului crește de la 54 la 57 mm?", "Crește cu raportul ariilor (57/54)² = 1,114, adică cu ≈ 11 %, la aceeași presiune; crește însă și volumul de lichid necesar (cursa pedalei)."],
  ["Ce se întâmplă cu presiunea în circuit dacă servofrâna își pierde vacuumul?", "Asistarea dispare: la aceeași forță pe pedală presiunea scade de ≈ 4…7 ori; frâna funcționează, dar cere o forță foarte mare."],
  ["De ce sistemul de frânare are două circuite independente (pompa tandem)?", "Pentru siguranță: la o scurgere într-un circuit, celălalt (de regulă în diagonală) asigură încă cel puțin jumătate din forța de frânare (cerință legală)."]
];
const TEST = [
  { q: "Într-un lichid în repaus, presiunea într-un punct:", o: ["depinde de direcție", "este aceeași pe toate direcțiile", "este zero", "depinde doar de volum"], c: 1, e: "Proprietatea presiunii hidrostatice; de aici legea lui Pascal." },
  { q: "Raportul F<sub>c</sub>/F<sub>t</sub> între etrier și pompa centrală este (ideal):", o: ["d<sub>c</sub>/d<sub>m</sub>", "A<sub>c</sub>/A<sub>m</sub>", "A<sub>m</sub>/A<sub>c</sub>", "1"], c: 1, e: "La aceeași presiune forțele sunt proporționale cu ariile (3.7)." },
  { q: "Dacă forța se multiplică de 6 ori între pompă și etrier, cursa pistonului etrierului:", o: ["crește de 6 ori", "rămâne aceeași", "scade de 6 ori", "scade de 36 de ori"], c: 2, e: "Conservarea volumului s<sub>c</sub>A<sub>c</sub> = s<sub>m</sub>A<sub>m</sub> – lucrul mecanic se conservă." },
  { q: "Termenul ρgh pentru o diferență de nivel de 0,8 m de lichid de frână este aproximativ:", o: ["0,08 bar", "8 bar", "80 bar", "0,8 bar"], c: 0, e: "1050·9,81·0,8 ≈ 8 240 Pa ≈ 0,08 bar." },
  { q: "După punctul de saturație al servofrânei, presiunea:", o: ["nu mai crește deloc", "crește doar cu forța șoferului (panta mică)", "scade", "crește exponențial"], c: 1, e: "Asistarea a atins Δp<sub>vac</sub>·A<sub>membrană</sub>; restul vine doar de la pedală." },
  { q: "Randamentul aparent η<sub>p</sub> la forțe mici (50 N) este mai mic deoarece:", o: ["lichidul se comprimă", "arcul de revenire al pompei preia o parte din forță", "manometrul nu citește", "temperatura este mică"], c: 1, e: "Forța arcului (≈ 40 N pe tijă) contează mult la forțe mici." }
];

/* ------------------------------------------------------------------ definiția lucrării */
Cadru.porneste({
  disc: "MF", nr: 3, cod: "mf-l3",
  titlu: "Legea lui Pascal: transmiterea hidraulică a forței în sistemul de frânare",
  scurt: "Legea lui Pascal în sistemul de frânare",
  subtitlu: "Laborator virtual – stand de frânare hidraulică cu servofrână",
  parametri: M3.parametri,
  parametriDemo() { return Object.assign(M3.parametri(20261001), { l: sim.lDemo || 70, dc: sim.dcDemo || 54, etaP: 0.94, etaC: 0.96, kS: 4.9, etaM: 0.86, dp2: 0.01, eP: 0, eF: 0 }); },
  date: [
    { k: "L", et: "L pedală [mm]", v: 280, fix: true }, { k: "l", et: "l pedală [mm]", v: 70 },
    { k: "dm", et: "d<sub>m</sub> pompă [mm]", v: 22.22, fix: true }, { k: "dc", et: "d<sub>c</sub> etrier [mm]", v: 54 },
    { k: "mu", et: "μ plăcuțe", v: 0.40, fix: true }, { k: "ref", et: "r<sub>ef</sub> disc [m]", v: 0.11, fix: true }, { k: "rd", et: "r<sub>d</sub> roată [m]", v: 0.30, fix: true }
  ],
  tabele: [
    { id: "t31", titlu: "Tabelul 3.1. Determinări fără servofrână", antetRand: "F<sub>p</sub> [N]",
      randuri: TREPTE1.map(F => ({ k: String(F), et: String(F) })),
      coloane: [{ k: "p", t: "p măsurat [bar]", intrare: true }, { k: "p2", t: "p circuit 2 [bar]", intrare: true }, { k: "dp", t: "Δp₁₋₂" }, { k: "pc", t: "p calculat (η = 1) [bar]" }, { k: "etaP", t: "η<sub>p</sub>" }, { k: "Fc", t: "F<sub>c</sub> măsurat [N]", intrare: true }, { k: "Fcc", t: "F<sub>c</sub> = p·A<sub>c</sub> [N]" }, { k: "etaC", t: "η<sub>c</sub>" }] },
    { id: "t32", titlu: "Tabelul 3.2. Determinări cu servofrână (vacuum 0,6…0,7 bar)", antetRand: "F<sub>p</sub> [N]", nota: "Treptele 250 și 300 N servesc la identificarea punctului de saturație.",
      randuri: TREPTE2.map(F => ({ k: String(F), et: String(F) })),
      coloane: [{ k: "p", t: "p măsurat [bar]", intrare: true }, { k: "pf", t: "p fără servo [bar]" }, { k: "k", t: "Factor de amplificare" }, { k: "Fc", t: "F<sub>c</sub> măsurat [N]", intrare: true }] },
    { id: "t33", titlu: "Tabelul 3.3. Cursa pedalei și conservarea volumului", antetRand: "",
      randuri: [{ k: "s", et: "0 → 300 N (fără servo)" }],
      coloane: [{ k: "s", t: "s<sub>p</sub> pedală [mm]", intrare: true }, { k: "sm", t: "s<sub>m</sub> = s<sub>p</sub>/i<sub>p</sub> [mm]" }, { k: "V", t: "V dislocat [cm³]" }, { k: "Vc", t: "V pentru 0,3 mm la etrier [cm³]" }] }
  ],
  calculeaza: calculeazaL3,
  intrebari(D) {
    return [
      { id: "q1", u: "", text: "Randamentul mediu al pedalei η<sub>p</sub> din Tabelul 3.1 al vostru (treptele de la 100 N în sus):", textSimplu: "Randamentul mediu η_p (Tabelul 3.1, F ≥ 100 N)" },
      { id: "q2", u: "×", text: "Factorul de amplificare al servofrânei voastre la F<sub>p</sub> = 100 N:", textSimplu: "Factorul de amplificare la 100 N" },
      { id: "q3", u: "N", text: `Forța de frânare la roată F<sub>r</sub> la F<sub>p</sub> = 200 N fără servofrână, cu F<sub>c</sub> măsurat de voi, μ = 0,40, r<sub>ef</sub> = 0,11 m, r<sub>d</sub> = 0,30 m:`, textSimplu: "Forța de frânare la roată la 200 N (fără servo)" },
      { id: "q4", u: "mm", text: `Ce cursă trebuie să facă pistonul pompei centrale pentru ca pistonul etrierului vostru (d<sub>c</sub> = ${fmt(num(D.date.dc), 0)} mm) să se deplaseze 0,3 mm?`, textSimplu: `Cursa pompei centrale pentru 0,3 mm la etrierul d_c = ${num(D.date.dc)} mm` }
    ];
  },
  cerinte(D) {
    const l = [], a = TREPTE1.filter(F => D.t.t31[F].p !== "").length, b = TREPTE2.filter(F => D.t.t32[F].p !== "").length;
    if (a < 6) l.push(`Tabelul 3.1: ${a}/6 trepte`);
    if (b < 5) l.push(`Tabelul 3.2: cel puțin 5 trepte (${b} completate)`);
    if (D.t.t33.s.s === "") l.push("Tabelul 3.3: cursa pedalei la 300 N");
    return l;
  },
  exemplu(D) {
    const pr = Object.assign(M3.parametri(1), { l: 70, dc: 54, etaP: 0.92 * 1.0, etaC: 0.96, kS: 4.9, etaM: 0.95, dp2: 0.01, eP: 0, eF: 0 });
    TREPTE1.forEach(F => { const s = M3.stare(F, 0, pr); D.t.t31[F].p = s.p1.toFixed(1); D.t.t31[F].p2 = s.p2.toFixed(1); D.t.t31[F].Fc = s.Fc.toFixed(0); });
    TREPTE2.forEach(F => { const s = M3.stare(F, 0.65, pr); D.t.t32[F].p = s.p1.toFixed(1); D.t.t32[F].Fc = s.Fc.toFixed(0); });
    D.t.t33.s.s = M3.cursaPedala(M3.stare(300, 0, pr).p1, pr).toFixed(1);
    Object.assign(D.date, { l: 70, dc: 54 });
  },
  scenariu(id, C) {
    sim.lDemo = 70; sim.dcDemo = 54; $("#in-l").value = 70; $("#in-dc").value = 54; C.P = C.parametri(); Object.assign(C.D.date, { l: 70, dc: 54 });
    sim.vac = 0; sim.defect = "none"; $("#in-defect").value = "none"; construiesteSVG(); sim.tinta = 200;
    C.mesajTemporar("Exemplul: i_p = 4, d_c = 54 mm; pedala se apasă până la 200 N. Comparați cu p ≈ 18–19 bar și F_c ≈ 4150 N; apoi pompați vacuum și repetați (≈ 90 bar).", "");
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Legea lui Pascal în circuitul de frânare al autoturismului",
    intro: `<p>Pe autoturism, aceeași presiune creată de pompa centrală ajunge – conform legii lui Pascal – în toate cele patru etriere, indiferent de lungimea și traseul conductelor. Etrierele din față au pistoane mai mari (Ø54 mm) decât cele din spate (Ø38 mm), deci la aceeași presiune strâng discul cu o forță mai mare: repartiția frânării pe punți se obține din raportul ariilor. Comparați presiunea și forța de frânare <b>cu și fără servofrână</b> la aceeași forță pe pedală.</p>`,
    dupa: `<p class="nota">Forța pe pistonul unui etrier față este F<sub>c</sub> = p·A<sub>c</sub>; pentru ca șoferul să obțină 100 bar fără servofrână i-ar trebui peste 1000 N pe pedală.</p>`,
    optiuni: () => ({ sistem: "frana", arataForte: true })
  },
  referat: {
    scop: "Verificarea legii lui Pascal pe un circuit real de frânare: presiunea creată de pompa centrală, forța la etrier, randamentele transmisiei și factorul de amplificare al servofrânei.",
    relatii: "F<sub>t</sub> = F<sub>p</sub>·i<sub>p</sub>·η<sub>p</sub>; &nbsp; p = F<sub>t</sub>/A<sub>m</sub>; &nbsp; F<sub>c</sub> = p·A<sub>c</sub>·η<sub>c</sub>; &nbsp; s<sub>c</sub>A<sub>c</sub> = s<sub>m</sub>A<sub>m</sub>; &nbsp; F<sub>f</sub> = 2μF<sub>c</sub>; &nbsp; F<sub>r</sub> = F<sub>f</sub>·r<sub>ef</sub>/r<sub>d</sub>.",
    varianta: D => `Standul vostru: L = 280 mm, l = ${fmt(num(D.date.l), 0)} mm (i<sub>p</sub> = ${fmt(280 / num(D.date.l), 2)}), d<sub>c</sub> = ${fmt(num(D.date.dc), 0)} mm.`,
    indicatii: "Comparați randamentele cu 0,85…0,98, explicați abaterea la 50 N, comentați factorul de amplificare și saturația servofrânei, diferența dintre circuite și conservarea volumului…"
  },
  subsol: "Modelul: pedală-pârghie cu randament η<sub>p</sub>, arc de revenire al pompei (40 N), servofrână cu raport de amplificare constant până la Δp<sub>vac</sub>·A<sub>membrană</sub>, etrier cu randament η<sub>c</sub>. Fiecare student are standul (l, d<sub>c</sub>), randamentele și erorile instrumentelor proprii.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `<div class="sim-grila">
    <div class="card sim-scena scena">
      <svg id="svg-pascal" viewBox="0 0 1536 760" role="img" aria-label="Fotografia standului de frânare, animată: pedală cu dinamometru, servofrână cu vacuum, pompă centrală tandem cu fereastră de secțiune, manometre și etrier cu celulă de forță"></svg>
      <div class="afisaje">
        <div class="afisaj"><span>Forța pe pedală</span><b id="af-F">0</b><small>N (dinamometru)</small></div>
        <div class="afisaj"><span>Presiunea – circuit 1 / 2</span><b id="af-p">0,0</b><small>bar</small></div>
        <div class="afisaj"><span>Forța la etrier</span><b id="af-Fc">0</b><small>N (celula de forță)</small></div>
        <div class="afisaj"><span>Vacuum servofrână</span><b id="af-v">0,00</b><small>bar</small></div>
      </div>
      <div class="grafic-mic"><canvas id="cv-live" height="230" aria-label="Presiunea în funcție de forța pe pedală"></canvas></div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-ochelari"> Ochelari și mănuși de nitril</label>
      <label class="bifa"><input type="checkbox" id="ck-verif"> Racorduri fără scurgeri, manometre la zero</label>
      <h2>Standul vostru</h2>
      <p class="nota" id="nota-stand"></p>
      <div class="doua" data-doar-demo>
        <label class="camp">l pedală [mm]<select id="in-l">${M3.BRATE.map(v => `<option>${v}</option>`).join("")}</select></label>
        <label class="camp">d<sub>c</sub> etrier [mm]<select id="in-dc">${M3.ETRIERE.map(v => `<option>${v}</option>`).join("")}</select></label>
      </div>
      <h2>Pedala</h2>
      <p class="nota">Țineți apăsat pentru creștere continuă; reglați fin cu butoanele sau tastele ↑ ↓ (Shift = pas 10 N).</p>
      <div class="rand-butoane">
        <button type="button" class="tine" id="btn-elib">▼ Eliberează (ține)</button>
        <button type="button" class="tine" id="btn-apasa">▲ Apasă (ține)</button>
      </div>
      <div class="roata-butoane">
        <button type="button" data-dF="-10">−10</button><button type="button" data-dF="-1">−1</button><button type="button" data-dF="-0.5">−0,5</button>
        <button type="button" data-dF="0.5">+0,5</button><button type="button" data-dF="1">+1</button><button type="button" data-dF="10">+10</button>
      </div>
      <label class="camp" data-doar-demo>Du forța la <span class="inline"><select id="sel-tinta">${[...new Set([...TREPTE1, ...TREPTE2])].sort((a, b) => a - b).map(F => `<option>${F}</option>`).join("")}</select><button type="button" id="btn-tinta">Apasă</button></span></label>
      <h2>Servofrâna</h2>
      <div class="rand-butoane">
        <button type="button" id="btn-vac">Pompează vacuum (Mityvac)</button>
        <button type="button" id="btn-vac0">Descarcă vacuumul</button>
      </div>
      <button type="button" class="primar lat" id="btn-inreg">● Înregistrează citirile în tabel</button>
      <button type="button" class="lat" id="btn-cursa">Citește cursa pedalei pe riglă (la 300 N)</button>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari">
        <summary>Defecte de diagnosticat (mod demonstrativ)</summary>
        <label class="camp">Situația <select id="in-defect" data-blocat-eval>
          <option value="none">fără defect</option><option value="gripat">articulațiile pedalei gripate</option><option value="garnitura">garnitura pistonului etrierului uzată</option>
          <option value="secundar">pierdere la pistonul secundar (circuitul 2)</option><option value="aer">aer în circuit (pedală moale)</option></select></label>
      </details>
      <details class="setari"><summary>Afișare</summary><label class="bifa"><input type="checkbox" id="ck-et" checked> Etichete pe schemă</label></details>
    </aside>
  </div>`,
    init(C) {
      construiesteSVG();
      const tine = (btn, dir) => {
        const on = e => { e.preventDefault(); sim.tinta = null; sim.tine = dir; btn.classList.add("apasat"); };
        const off = () => { if (sim.tine === dir) sim.tine = 0; btn.classList.remove("apasat"); };
        btn.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, off));
      };
      tine($("#btn-apasa"), 1); tine($("#btn-elib"), -1);
      $$("[data-dF]").forEach(b => b.addEventListener("click", () => seteazaF(sim.Fp + num(b.dataset.dF))));
      $("#btn-tinta").addEventListener("click", () => { sim.tinta = num($("#sel-tinta").value); });
      $("#btn-vac").addEventListener("click", () => { sim.vac += (0.86 - sim.vac) * 0.16; });
      $("#btn-vac0").addEventListener("click", () => { sim.vac = 0; });
      $("#btn-inreg").addEventListener("click", inregistreaza);
      $("#btn-cursa").addEventListener("click", masoaraCursa);
      $("#in-defect").addEventListener("change", e => { sim.defect = e.target.value; });
      $("#ck-et").addEventListener("change", e => { sim.etichete = e.target.checked; });
      ["#in-l", "#in-dc"].forEach(id => $(id).addEventListener("change", () => { sim.lDemo = num($("#in-l").value); sim.dcDemo = num($("#in-dc").value); C.P = C.parametri(); Object.assign(C.D.date, { l: sim.lDemo, dc: sim.dcDemo }); C.construiesteDateLucru(); construiesteSVG(); notaStand(); C.recalculeaza(); C.salveaza(); }));
      document.addEventListener("keydown", e => {
        if (!$("#tab-sim").classList.contains("activ") || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); seteazaF(sim.Fp + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1)); }
        if (e.key === "Enter") inregistreaza(e);
      });
      $("#in-l").value = C.P.l; $("#in-dc").value = C.P.dc; sim.lDemo = C.P.l; sim.dcDemo = C.P.dc;
      notaStand();
      C.mesaj("Verificați standul (NSSM), apoi apăsați pedala în trepte de 50 N fără vacuum în servofrână.", "");
    },
    aplicaEval(P, C) {
      Object.assign(C.D.date, { l: P.l, dc: P.dc });
      ["#in-l", "#in-dc", "#in-defect"].forEach(id => { const el = $(id); if (el) el.disabled = true; });
      sim.defect = "none"; sim.vac = 0; sim.Fp = 0;
      if (SV.g) { construiesteSVG(); notaStand(); }
    },
    reset() { Object.assign(sim, { Fp: 0, vac: 0, tinta: null }); },
    cadru(dt, C, vizibil) {
      if (sim.tine) sim.Fp = clamp(sim.Fp + sim.tine * 45 * dt, 0, 420);
      if (sim.tinta !== null) { const d = sim.tinta - sim.Fp, pas = 60 * dt; if (Math.abs(d) <= pas) { sim.Fp = sim.tinta; sim.tinta = null; } else sim.Fp += Math.sign(d) * pas; }
      sim.vac = Math.max(0, sim.vac - 0.0015 * dt * (sim.vac > 0 ? 1 : 0));                 // mică scăpare de vacuum
      if (servoActiv() && sim.Fp > 5) sim.vac = Math.max(0, sim.vac - 0.0004 * dt * sim.Fp / 100); // consumul servofrânei
      sim.zgomot += ((Math.random() - 0.5) * 0.6 - sim.zgomot) * Math.min(1, dt * 4);
      calculeazaStare();
      const a = 1 - Math.exp(-dt / 0.12);
      sim.pAf1 += (sim.p1 - sim.pAf1) * a; sim.pAf2 += (sim.p2 - sim.pAf2) * a; sim.vAf += (sim.vac - sim.vAf) * a;
      if (!vizibil) return;
      actualizeazaSVG();
      const now = performance.now();
      if (now - (this._ta || 0) > 120) {
        this._ta = now;
        $("#af-F").textContent = fmt(FpAfisat(), 1); $("#af-p").textContent = `${fmt(sim.p1, 1)} / ${fmt(sim.p2, 1)}`; $("#af-Fc").textContent = fmt(sim.Fc, 0); $("#af-v").textContent = fmt(sim.vac, 2);
        C.stare(1, servoActiv() ? `cu servofrână – vacuum ${fmt(sim.vac, 2)} bar` : "fără servofrână", servoActiv() ? "inc" : "");
        C.stare(2, `i_p = ${fmt(M3.ip(P()), 2)} · d_c = ${P().dc} mm`);
        if (sim.p1 > 120 || sim.Fp > 400) C.mesajAuto("Peste limitele NSSM (400 N / 120 bar)! Eliberați pedala.", "pericol");
        else if (!$("#ck-ochelari").checked || !$("#ck-verif").checked) C.mesajAuto("Bifați verificările NSSM înainte de a apăsa pedala.", "atentie");
        else C.mesajAuto("");
      }
      if (now - (this._tl || 0) > 250) { this._tl = now; deseneazaLive(); }
    },
    redeseneaza() { deseneazaLive(); },
    formule(C) {
      const F = FpAfisat(), pr = P(), i = M3.ip(pr), Am = M3.aria(DM), Ac = M3.aria(pr.dc);
      return [
        ["Raportul pedalei", `i<sub>p</sub> = L/l = 280/${pr.l} = <span class="rez">${fmt(i, 2)}</span>`],
        ["Presiunea ideală (3.3–3.4), η<sub>p</sub> = 1", `p = F<sub>p</sub>·i<sub>p</sub>/A<sub>m</sub> = ${fmt(F, 1)}·${fmt(i, 2)}/${fmt(Am, 1)} = <span class="rez">${fmt(F * i / Am * 10, 1)} bar</span>`],
        ["Randamentul aparent", F > 5 && sim.p1 > 0.5 ? `η<sub>p</sub> = p·A<sub>m</sub>/(F<sub>p</sub>·i<sub>p</sub>) = <span class="rez">${fmt(sim.p1 / 10 * Am / (F * i), 3)}</span>${servoActiv() ? " (cu servofrână: factor de amplificare)" : ""}` : "—"],
        ["Forța la etrier (3.5), η<sub>c</sub> = 1", `F<sub>c</sub> = p·A<sub>c</sub> = ${fmt(sim.p1, 1)}·10⁵·${fmt(Ac, 0)}·10⁻⁶ = <span class="rez">${fmt(sim.p1 / 10 * Ac, 0)} N</span>`],
        ["Raportul ariilor (3.7)", `A<sub>c</sub>/A<sub>m</sub> = <span class="rez">${fmt(Ac / Am, 2)}</span> · cursa pedalei s<sub>p</sub> = ${fmt(sim.sp, 1)} mm`]
      ];
    }
  }
});
function notaStand() { const p = P(); $("#nota-stand").innerHTML = `L = 280 mm, l = <b>${p.l} mm</b> (i<sub>p</sub> = ${fmt(280 / p.l, 2)}), pompa centrală d<sub>m</sub> = 22,22 mm, etrier d<sub>c</sub> = <b>${p.dc} mm</b>, servofrână cu membrana Ø250 mm.`; }
