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

/* ------------------------------------------------------------------ desenul */
const SV = { g: null };
const SC = 0.9; // px/mm pentru pedală
function construiesteSVG() {
  const svg = $("#svg-pascal"); svg.innerHTML = "";
  const defs = mk("defs", {}, svg); defsComune(defs); filtre(defs);
  grad(defs, "gBazaA", [[0, "#4166a8"], [0.5, "#27467e"], [1, "#132a52"]]);
  grad(defs, "gBooster", [[0, "#4a4f57"], [0.3, "#1d2025"], [0.7, "#0c0e10"], [1, "#2d3238"]]);
  grad(defs, "gLichid", [[0, "#f0cc6a"], [1, "#c99a2a"]]);
  grad(defs, "gRez", [[0, "#fffdf3", 0.95], [1, "#e9e2c8", 0.9]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gEtrier", [[0, "#e7e9ec"], [0.35, "#b9bec4"], [0.7, "#8f969d"], [1, "#6d747b"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const g = mk("g", {}, svg); SV.g = g;
  const pr = P(), l = pr.l;
  // placa de bază
  mk("rect", { x: 14, y: 408, width: 872, height: 26, rx: 5, fill: "url(#gBazaA)", stroke: "#0d1d3a" }, g);
  mk("rect", { x: 14, y: 408, width: 872, height: 4, fill: "#6d93d1", opacity: 0.6 }, g);
  [30, 870].forEach(x => mk("rect", { x: x - 12, y: 432, width: 24, height: 8, rx: 2, fill: "#1b1b1b" }, g));
  // coloana pedalei
  const px = 110, py = 70;
  mk("rect", { x: px - 14, y: py - 18, width: 28, height: 342, rx: 3, fill: "url(#gAlbastruO)", stroke: "#0d2240" }, g);
  mk("rect", { x: px - 30, y: 396, width: 60, height: 14, rx: 2, fill: "url(#gAlbastru)" }, g);
  // rigla pentru cursa pedalei
  const yR = py + M3.L * SC + 22;
  mk("rect", { x: px - 6, y: yR, width: 150, height: 14, fill: "#f4e7b5", stroke: "#8a7a3d" }, g);
  for (let mm = 0; mm <= 160; mm += 2) mk("line", { x1: px + mm * 0.9, y1: yR, x2: px + mm * 0.9, y2: yR + (mm % 10 ? 4 : 8), stroke: "#3a2f0e", "stroke-width": 0.6 }, g);
  for (let mm = 0; mm <= 160; mm += 20) { const t = mk("text", { x: px + mm * 0.9, y: yR + 13, "font-size": 6, "text-anchor": "middle", fill: "#3a2f0e" }, g); t.textContent = mm / 10; }
  // pedala (grup rotit în jurul articulației)
  const gp = mk("g", {}, g); SV.gPed = gp; SV.piv = [px, py];
  mk("path", { d: `M${px - 6} ${py} L${px + 6} ${py} L${px + 5} ${py + M3.L * SC} L${px - 5} ${py + M3.L * SC} Z`, fill: "url(#gNegru)" }, gp);
  mk("rect", { x: px - 20, y: py + M3.L * SC - 6, width: 22, height: 44, rx: 4, fill: "#1a1a1a" }, gp);
  for (let k = 0; k < 6; k++) mk("line", { x1: px - 18, y1: py + M3.L * SC - 2 + k * 7, x2: px, y2: py + M3.L * SC - 2 + k * 7, stroke: "#444", "stroke-width": 1.2 }, gp);
  // dinamometrul pe talpă
  mk("rect", { x: px - 58, y: py + M3.L * SC - 2, width: 36, height: 34, rx: 4, fill: "#f08a1c", stroke: "#8a4a07" }, gp);
  SV.dinamo = afisajLCD(gp, px - 104, py + M3.L * SC - 46, 74, 22, { unit: "N" });
  SV.sagF = mk("path", { d: "", fill: "#d32f2f" }, gp);
  // indicator pe riglă (vârful tălpii)
  SV.indic = mk("path", { d: "", fill: "#d32f2f" }, g);
  mk("circle", { cx: px, cy: py, r: 9, fill: "url(#gOtelR)", stroke: "#333" }, g);
  // tija (punctul de prindere la distanța l)
  SV.yT = py + l * SC;
  SV.tija = mk("rect", { x: px, y: SV.yT - 3, width: 190, height: 6, rx: 3, fill: "url(#gCrom)" }, g);
  SV.tijaArt = mk("circle", { cx: px, cy: SV.yT, r: 5, fill: "url(#gOtelR)", stroke: "#333" }, g);
  // cote L și l
  const cota = (x, y1, y2, txt) => { mk("line", { x1: x, y1, x2: x, y2, stroke: "#24303d", "stroke-width": 0.8, "marker-end": "" }, g); [y1, y2].forEach(y => mk("line", { x1: x - 4, y1: y, x2: x + 4, y2: y, stroke: "#24303d", "stroke-width": 0.8 }, g)); const t = mk("text", { x: x - 6, y: (y1 + y2) / 2 + 4, "font-size": 11, "text-anchor": "end", style: "fill:var(--text)", "font-weight": 700 }, g); t.textContent = txt; };
  cota(px - 30, py, py + M3.L * SC, `L = ${M3.L}`); cota(px + 26, py, SV.yT, `l = ${l}`);
  // servofrâna
  const bx = 300, by = SV.yT, bR = 70;
  SV.bx = bx;
  mk("rect", { x: bx - 6, y: by + bR - 6, width: 50, height: 410 - by - bR + 6, fill: "url(#gAlbastruO)" }, g);
  mk("ellipse", { cx: bx + 50, cy: by, rx: 50, ry: bR, fill: "url(#gBooster)", stroke: "#000" }, g);
  for (let k = -3; k <= 3; k++) mk("ellipse", { cx: bx + 50 + k * 8, cy: by, rx: 4, ry: bR - 4 - Math.abs(k) * 3, fill: "none", stroke: "#3c4249", "stroke-width": 1 }, g);
  mk("rect", { x: bx - 20, y: by - 14, width: 26, height: 28, rx: 6, fill: "#151719" }, g); // burduful tijei
  const tb = mk("text", { x: bx + 50, y: by + bR + 20, "font-size": 10, "text-anchor": "middle", style: "fill:var(--text-sec)" }, g); tb.textContent = "servofrână Ø250";
  // furtunul de vacuum și pompa Mityvac + vacuummetru
  mk("path", { d: `M${bx + 70} ${by - bR + 10} C ${bx + 90} ${by - bR - 40}, ${bx - 40} ${by - bR - 30}, ${bx - 70} 300`, fill: "none", stroke: "#111", "stroke-width": 7, "stroke-linecap": "round" }, g);
  mk("rect", { x: bx - 92, y: 300, width: 44, height: 70, rx: 8, fill: "#c62828", stroke: "#6d0f0f" }, g);
  mk("rect", { x: bx - 84, y: 368, width: 28, height: 36, rx: 4, fill: "#1a1a1a" }, g);
  SV.vacuum = manometru(g, bx - 70, 270, 26, { max: 1, unit: "bar", pasMaj: 0.2, pasMin: 0.05, subtitlu: "vacuum", eticheta: v => (-v).toFixed(1).replace(".", ",") });
  // pompa centrală tandem în secțiune
  const mx = 410, my = by, mL = 170;
  SV.mx = mx; SV.my = my;
  mk("rect", { x: mx, y: my - 26, width: mL, height: 52, rx: 8, fill: "url(#gCrom)", stroke: "#4c535c" }, g);
  mk("rect", { x: mx + 10, y: my - 15, width: mL - 26, height: 30, fill: "#2a2f35" }, g);           // alezajul (secțiune)
  SV.lichid = mk("rect", { x: mx + 10, y: my - 14, width: mL - 26, height: 28, fill: "url(#gLichid)" }, g);
  SV.pist = [0, 1].map(k => mk("rect", { x: 0, y: my - 14, width: 22, height: 28, rx: 3, fill: "url(#gOtel)", stroke: "#333" }, g));
  SV.arc = [0, 1].map(() => mk("path", { d: "", fill: "none", stroke: "#555", "stroke-width": 1.6 }, g));
  // rezervorul
  mk("rect", { x: mx + 20, y: my - 86, width: 120, height: 56, rx: 10, fill: "url(#gRez)", stroke: "#b9b19a" }, g);
  SV.rezL = mk("rect", { x: mx + 23, y: my - 66, width: 114, height: 34, rx: 6, fill: "#e6c35c", opacity: 0.8 }, g);
  mk("rect", { x: mx + 66, y: my - 102, width: 28, height: 18, rx: 4, fill: "#1a1a1a" }, g);
  [mx + 45, mx + 110].forEach(x => mk("rect", { x: x - 6, y: my - 32, width: 12, height: 8, fill: "#c9bfa0" }, g));
  // racordurile și conductele: primar → manometru 1 → etrier; secundar → manometru 2 (dop)
  const cx = 770, cy = 230;
  SV.cond1 = mk("path", { d: `M${mx + mL} ${my - 8} H ${640} V ${cy - 30} H ${cx - 40}`, fill: "none", stroke: "#b87333", "stroke-width": 6, "stroke-linejoin": "round" }, g);
  SV.cond2 = mk("path", { d: `M${mx + 120} ${my + 26} V ${330} H ${640}`, fill: "none", stroke: "#b87333", "stroke-width": 6, "stroke-linejoin": "round" }, g);
  SV.man1 = manometru(g, 640, my - 70, 40, { max: 160, unit: "bar", pasMaj: 20, pasMin: 5, rosu: 120, subtitlu: "circuit 1" });
  SV.man2 = manometru(g, 640, 330, 34, { max: 160, unit: "bar", pasMaj: 40, pasMin: 10, rosu: 120, subtitlu: "circuit 2" });
  mk("rect", { x: 680, y: 324, width: 16, height: 12, rx: 2, fill: "url(#gAlama)" }, g);
  SV.lcdP = afisajLCD(g, 696, my - 92, 74, 22, { unit: "bar", fundal: "#cfe6ff" });
  // etrierul flotant în secțiune, cu celula de forță în locul discului
  const dcPx = P().dc * 1.1;
  mk("rect", { x: cx - 40, y: cy - 70, width: 120, height: 140, rx: 14, fill: "url(#gEtrier)", stroke: "#5b6269" }, g);
  mk("rect", { x: cx - 30, y: cy - dcPx / 2, width: 34, height: dcPx, fill: "#2a2f35" }, g);                    // cilindrul etrierului
  SV.pistE = mk("rect", { x: cx - 28, y: cy - dcPx / 2 + 2, width: 30, height: dcPx - 4, rx: 4, fill: "url(#gCromO)", stroke: "#444" }, g);
  SV.placa1 = mk("rect", { x: cx + 4, y: cy - 34, width: 10, height: 68, fill: "#4d4a46" }, g);
  SV.celula = mk("rect", { x: cx + 15, y: cy - 22, width: 30, height: 44, rx: 3, fill: "#2f6f3f", stroke: "#123" }, g);
  mk("rect", { x: cx + 46, y: cy - 34, width: 10, height: 68, fill: "#4d4a46" }, g);
  const tdc = mk("text", { x: cx + 20, y: cy + 92, "font-size": 11, "text-anchor": "middle", style: "fill:var(--text)", "font-weight": 700 }, g); tdc.textContent = `etrier d_c = ${P().dc} mm`;
  mk("rect", { x: 800, y: 330, width: 84, height: 50, rx: 6, fill: "#1c2026" }, g);
  SV.lcdF = afisajLCD(g, 806, 344, 72, 26, { unit: "N", fundal: "#cfdcb5" });
  mk("path", { d: `M${cx + 30} ${cy + 22} C ${cx + 30} 300, 820 300, 830 330`, fill: "none", stroke: "#111", "stroke-width": 2.5 }, g);
  // etichete
  SV.et = mk("g", { "font-size": 11, style: "fill:var(--text)" }, g);
  const et = (x, y, x2, y2, t) => { mk("line", { x1: x, y1: y, x2, y2, style: "stroke:var(--text-sec)", "stroke-width": 0.8 }, SV.et); const e = mk("text", { x: x2 + (x2 >= x ? 3 : -3), y: y2 + 4, "text-anchor": x2 >= x ? "start" : "end" }, SV.et); e.textContent = t; };
  et(px + 8, py - 6, 150, 30, "Articulația pedalei");
  et(bx + 70, by + 40, 385, 250, "Servofrâna cu vacuum");
  et(mx + 80, my, 500, 380, "Pompa centrală tandem (secțiune)");
  et(mx + 80, my - 80, 470, 22, "Rezervor");
  et(cx + 30, cy - 22, 806, 128, "Celula de forță");
  et(cx - 13, cy + 20, 700, 392, "Pistonul etrierului");
  prefixeazaId(svg, "p3-");
  actualizeazaSVG();
}
function actualizeazaSVG() {
  if (!SV.g) return;
  const [px, py] = SV.piv, Lp = M3.L * SC, l = P().l;
  const ung = Math.atan2(sim.sp * SC, Lp);                       // talpa pedalei se deplasează cu cursa s_p
  SV.gPed.setAttribute("transform", `rotate(${-ung * 180 / Math.PI} ${px} ${py})`);
  const dxT = l * SC * Math.sin(ung);                           // deplasarea punctului de prindere a tijei
  SV.tija.setAttribute("x", px + dxT); SV.tijaArt.setAttribute("cx", px + dxT);
  SV.dinamo(FpAfisat().toFixed(0));
  const xt = px + Lp * Math.sin(ung), yR = py + Lp + 22;
  SV.indic.setAttribute("d", `M${xt} ${yR - 2} l-5 -8 h10 z`);
  SV.sagF.setAttribute("d", sim.Fp > 1 ? `M${px - 120} ${py + Lp + 16} h ${50} v -6 l 14 10 l -14 10 v -6 h -50 z` : "");
  // pistoanele pompei centrale (cursa s_m = s_p / i_p, exagerată ×2 pentru vizibilitate)
  const sm = sim.sp / M3.ip(P()) * 2 * 0.9;
  SV.pist[0].setAttribute("x", SV.mx + 12 + sm); SV.pist[1].setAttribute("x", SV.mx + 82 + sm * 0.85);
  SV.arc.forEach((a, k) => { const x0 = k ? SV.mx + 104 + sm * 0.85 : SV.mx + 34 + sm, x1 = k ? SV.mx + 154 : SV.mx + 82 + sm * 0.85; let d = `M${x0} ${SV.my}`; const n = 7; for (let i = 1; i <= n; i++) d += ` L${x0 + (x1 - x0) * i / n} ${SV.my + (i % 2 ? -9 : 9)}`; a.setAttribute("d", d); });
  const k = clamp(sim.p1 / 120, 0, 1);
  SV.lichid.setAttribute("opacity", 0.75 + 0.25 * k);
  [SV.cond1, SV.cond2].forEach((c, i) => c.setAttribute("stroke", `hsl(${25 - 25 * clamp((i ? sim.p2 : sim.p1) / 120, 0, 1)}, ${45 + 45 * k}%, ${48 - 8 * k}%)`));
  SV.man1(sim.pAf1); SV.man2(sim.pAf2); SV.vacuum(sim.vAf);
  SV.lcdP(sim.p1.toFixed(1)); SV.lcdF(Math.round(sim.Fc).toString());
  const dE = clamp(sim.p1 / 40, 0, 1) * 4;
  SV.pistE.setAttribute("transform", `translate(${dE},0)`); SV.placa1.setAttribute("transform", `translate(${dE},0)`);
  SV.et.style.display = sim.etichete ? "" : "none";
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
      <svg id="svg-pascal" viewBox="0 0 900 450" role="img" aria-label="Stand de frânare: pedală cu dinamometru, servofrână, pompă centrală tandem în secțiune, manometre și etrier cu celulă de forță"></svg>
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
