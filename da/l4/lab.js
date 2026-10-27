/* DA – Lucrarea 4. Sistemul de alimentare MAS și analiza gazelor de evacuare.
   Simulator: motorul K7J pe stand (3D), trusa de presiune pe turul de combustibil (manometru 0…6 bar), vasul gradat pe retur
   cu testul activ al pompei, testerul Launch X431 (date live, sonda λ, corecțiile de amestec) și analizorul de gaze AVL
   (CO, CO₂, HC, O₂, λ Brettschneider). Fiecare student are motorul propriu și un defect ascuns al sistemului de alimentare.
   Panoul din dreapta conduce lucrarea pas cu pas. */
"use strict";
const MD = MODELE["da-l4"];
function P() { return Cadru.P; }
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea standului */
const sim = {
  t: 0, contact: false, merge: false, rpm: 0, ect: 86, tUlei: 84, manusi: false, ext: false, exh: false, rapid: false,
  avl: { pornit: false, tInc: 0, etans: false, zero: false, sonda: false },
  man: { depres: false, montat: false, tPrime: -99, tOprit: null, p: 0, pAf: 0 }, regFurtun: true,
  deb: { retur: false, activ: false, t: 0, V: 0 },
  reg: "ralanti", tReg: 0, prov: "", tProv: 0, cilR: 2,
  gas: { CO: 0, CO2: 0, HC: 0, O2: 20.9 }, lamBuf: [], stftAf: 0
};
const DUR_PRIME = 5;

/* ------------------------------------------------------------------ fizica (legătura cu modelul) */
function regModel() { return sim.reg === "r2500" ? "r2500" : "ralanti"; }
function provActiv() { return sim.merge && sim.reg === "r2500" ? sim.prov : ""; }
function tinta() { return MD.stare(P(), regModel(), provActiv()); }
/** presiunea adevărată din rampă [bar] */
function pAdevarat() {
  const p = P(), M = sim.man;
  if (sim.merge) return MD.pRampa(p, regModel(), !sim.regFurtun);
  if (sim.contact && sim.t - M.tPrime <= DUR_PRIME) return MD.pRampa(p, "contact");
  if (sim.deb.activ) return MD.pRampa(p, "contact");
  if (M.depres) return 0;
  if (M.tOprit !== null) return MD.pRetinere(p, sim.t - M.tOprit);
  return MD.pRetinere(p, 3000);
}
function pColAf() { const p = P(), d = p.defect.tip; return sim.merge ? MD.pCol(p, regModel()) + (d === "aer" && sim.reg === "ralanti" ? 6 : 0) + (provActiv() === "aer" ? 4 : 0) : p.patm; }
function avlGata() { return sim.avl.pornit && sim.avl.tInc >= 60 && sim.avl.etans && sim.avl.zero; }
function gazeStabile() {
  if (!(sim.merge && sim.avl.sonda && avlGata() && sim.tReg >= 10 && (!provActiv() || sim.tProv >= 10) && sim.tUlei >= 80)) return false;
  const g = tinta(), a = sim.gas;     // analizorul a ajuns la valorile stabile (răspunsul T90)
  return Math.abs(a.CO - g.CO) < 0.008 && Math.abs(a.CO2 - g.CO2) < 0.06 && Math.abs(a.HC - g.HC) < 3 && Math.abs(a.O2 - g.O2) < 0.015;
}
function gazeAfisate() { const g = sim.gas; return { CO: Math.max(0, Math.round(g.CO * 100) / 100), CO2: Math.round(g.CO2 * 10) / 10, HC: Math.max(0, Math.round(g.HC)), O2: Math.max(0, Math.round(g.O2 * 100) / 100) }; }

/* ------------------------------------------------------------------ desenele instrumentelor (aparate de atelier) */
function defsInstr(P) {
  return `<defs><radialGradient id="${P}-crom" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c3c9cf"/><stop offset=".8" stop-color="#7c848c"/><stop offset="1" stop-color="#d8dde2"/></radialGradient>
    <radialGradient id="${P}-cadran" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9ebe6"/></radialGradient>
    <linearGradient id="${P}-sticla" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${P}-alama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset=".5" stop-color="#c9a043"/><stop offset="1" stop-color="#8a6a1f"/></linearGradient>
    <linearGradient id="${P}-corp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5058"/><stop offset="1" stop-color="#25292e"/></linearGradient>
    <linearGradient id="${P}-capac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d636a"/><stop offset="1" stop-color="#2f3439"/></linearGradient>
    <linearGradient id="${P}-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfaf3"/><stop offset="1" stop-color="#ece8d6"/></linearGradient>
    <filter id="${P}-umbra" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="2" flood-opacity=".35"/></filter></defs>`;
}
/** manometru de atelier: ramă cromată, cadran alb, ac roșu cu contraac; o: {unit, maj, et, marca, benzi:[[v0,v1,cul]], s2:{max, maj, unit}, max2 (acul de maxim)} */
function svgGauge(P, cx, cy, r, max, val, o = {}) {
  const a0 = -225, a1 = 45, ang = (v, m = max) => (a0 + (a1 - a0) * cl(v / m, 0, 1)) * Math.PI / 180, pt = (a, rr) => `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  const maj = o.maj || max / 10;
  let s = `<g filter="url(#${P}-umbra)"><circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="url(#${P}-crom)" stroke="#5b6168"/><circle cx="${cx}" cy="${cy}" r="${r + 1.5}" fill="#3a3f45"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${P}-cadran)"/></g>`;
  (o.benzi || []).forEach(([v0, v1, c]) => { const A = ang(v0), B = ang(v1), lg = (B - A) > Math.PI ? 1 : 0; s += `<path d="M${pt(A, r - 5)} A${r - 5},${r - 5} 0 ${lg} 1 ${pt(B, r - 5)}" fill="none" stroke="${c}" stroke-width="6" opacity=".85"/>`; });
  for (let v = 0; v <= max + 1e-9; v += maj / 5) {
    const a = ang(v), M = Math.abs(v / maj - Math.round(v / maj)) < 1e-6, h = Math.abs(v / maj * 2 - Math.round(v / maj * 2)) < 1e-6, l = M ? 10 : h ? 7 : 4.5;
    s += `<line x1="${pt(a, r - 2).split(",")[0]}" y1="${pt(a, r - 2).split(",")[1]}" x2="${pt(a, r - 2 - l).split(",")[0]}" y2="${pt(a, r - 2 - l).split(",")[1]}" stroke="#151515" stroke-width="${M ? 1.8 : 0.9}"/>`;
    if (M) { const [x, y] = pt(a, r - 20).split(","); s += `<text x="${x}" y="${+y + 3.5}" font-size="${r > 55 ? 10.5 : 9}" text-anchor="middle" fill="#151515" font-weight="600">${String(Math.round(v * 10) / 10).replace(".", ",")}</text>`; }
  }
  if (o.s2) { const m2 = o.s2.max; for (let v = 0; v <= m2 + 1e-9; v += o.s2.maj) { const a = (a0 + (a1 - a0) * cl(v / m2 * (o.s2.f || 1), 0, 1)) * Math.PI / 180; if (v / m2 * (o.s2.f || 1) > 1.0001) break; const [x, y] = pt(a, r * 0.48).split(","); s += `<circle cx="${pt(a, r * 0.6).split(",")[0]}" cy="${pt(a, r * 0.6).split(",")[1]}" r="1" fill="#c62828"/><text x="${x}" y="${+y + 3}" font-size="7" text-anchor="middle" fill="#c62828">${v}</text>`; }
    s += `<text x="${cx}" y="${cy - r * 0.28}" font-size="7.5" text-anchor="middle" fill="#c62828">${o.s2.unit}</text>`; }
  s += `<text x="${cx}" y="${cy + r * 0.42}" font-size="10" text-anchor="middle" fill="#222" font-weight="700">${o.unit || "bar"}</text>`;
  if (o.marca) s += `<text x="${cx}" y="${cy + r * 0.6}" font-size="7" text-anchor="middle" fill="#555" letter-spacing="1">${o.marca}</text>`;
  if (o.max2 != null) { const a = ang(o.max2); s += `<line x1="${cx}" y1="${cy}" x2="${pt(a, r - 6).split(",")[0]}" y2="${pt(a, r - 6).split(",")[1]}" stroke="#1d4ed8" stroke-width="1.6" opacity=".8"/>`; }
  const a = ang(val), [nx, ny] = pt(a, r - 6).split(","), [kx, ky] = pt(a + Math.PI, r * 0.18).split(",");
  s += `<line x1="${kx}" y1="${ky}" x2="${nx}" y2="${ny}" stroke="#c62828" stroke-width="2.6" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r * 0.09}" fill="#1b1b1b"/><circle cx="${cx}" cy="${cy}" r="${r * 0.04}" fill="#888"/>`;
  s += `<path d="M${cx - r * 0.9},${cy - r * 0.2} A${r},${r} 0 0 1 ${cx + r * 0.5},${cy - r * 0.85} L${cx + r * 0.2},${cy - r * 0.55} A${r * 0.7},${r * 0.7} 0 0 0 ${cx - r * 0.6},${cy - r * 0.05}z" fill="url(#${P}-sticla)"/>`;
  if (o.et) s += `<text x="${cx}" y="${cy + r + 24}" font-size="10.5" text-anchor="middle" fill="${o.culEt || "currentColor"}" font-weight="600">${o.et}</text>`;
  return s;
}
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 11}" text-anchor="${o.a || "middle"}" fill="${o.f || "currentColor"}" font-weight="${o.w || 400}"${o.fam ? ` font-family="${o.fam}"` : ""}${o.halo ? ` paint-order="stroke" style="stroke:var(--suprafata,#fff);stroke-width:4px;stroke-linejoin:round"` : ""}>${s}</text>`;

/** trusa de presiune pe turul de combustibil: adaptor în T cu ventil Schrader, furtun, manometru cu glicerină, robinet de golire; regulatorul pe rampă */
function desenPres() {
  const el = $("#svg-pres"); if (!el) return;
  const Pf = "pr", M = sim.man, p = M.montat ? M.pAf : 0, P0 = P();
  let s = defsInstr(Pf) + `<defs><linearGradient id="${Pf}-tub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1f4"/><stop offset=".35" stop-color="#aab2ba"/><stop offset="1" stop-color="#5e666e"/></linearGradient>
    <linearGradient id="${Pf}-negru" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f55"/><stop offset="1" stop-color="#121417"/></linearGradient>
    <linearGradient id="${Pf}-verde" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e7d4f"/><stop offset=".5" stop-color="#5fbf86"/><stop offset="1" stop-color="#1f5e3a"/></linearGradient>
    <pattern id="${Pf}-imp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#23272c"/><line x1="0" y1="0" x2="0" y2="6" stroke="#4b525a" stroke-width="2"/></pattern></defs>`;
  // racordul trusei: furtunul vine de la adaptorul în T de pe turul de combustibil (rampa, regulatorul și adaptorul – pe macheta 3D)
  s += txt(300, 40, "Trusa de presiune pe turul de combustibil", { fs: 12, w: 700 });
  s += txt(300, 60, M.montat ? "adaptorul în T montat pe tur; furtunul trusei conectat la ventilul Schrader" : "trusa nemontată (adaptorul în T se vede pe macheta 3D)", { fs: 10 });
  s += txt(300, 78, sim.regFurtun ? "furtunul de depresiune al regulatorului: conectat la colector" : "furtunul de depresiune al regulatorului: deconectat și obturat", { fs: 10 });
  if (M.montat) s += `<path d="M150,250 C300,250 520,250 612,226" fill="none" stroke="url(#${Pf}-imp)" stroke-width="9" stroke-linecap="round"/><rect x="604" y="214" width="20" height="18" rx="3" fill="url(#${Pf}-alama)" stroke="#6b5214"/>${txt(150, 270, "← de la adaptorul în T (tur)", { fs: 9.5, a: "start" })}`;
  // manometrul trusei (0…6 bar, scală dublă psi), robinetul de golire
  s += `<g filter="url(#${Pf}-umbra)"><rect x="604" y="58" width="40" height="160" rx="8" fill="url(#${Pf}-negru)"/></g>`;
  s += svgGauge(Pf, 712, 140, 80, 6, p, { maj: 0.5, unit: "bar", marca: "GLYCERINE · CL 1,6", s2: { max: 80, maj: 20, unit: "psi", f: 6 / 87 * 80 / 6 } });
  s += `<rect x="660" y="236" width="104" height="20" rx="5" fill="url(#${Pf}-alama)" stroke="#6b5214"/><circle cx="790" cy="246" r="11" fill="#d32f2f" stroke="#7f1010"/>${txt(790, 274, "golire", { fs: 9 })}<path d="M800,246 C830,250 830,285 810,295" fill="none" stroke="#cfe3f0" stroke-width="5" opacity=".8"/>`;
  s += txt(712, 290, M.montat ? `citire: ${fx(p, 2)} bar` : "trusa nemontată", { fs: 13, w: 700, halo: true });
  // X431: presiunea din colector
  s += `<g filter="url(#${Pf}-umbra)"><rect x="40" y="176" width="210" height="46" rx="8" fill="#1d2228" stroke="#000"/><rect x="40" y="176" width="210" height="12" rx="6" fill="#c62828"/></g>${txt(145, 185, "LAUNCH X431 · MAP", { fs: 8.5, f: "#fff", w: 700 })}`;
  s += txt(145, 212, sim.contact || sim.merge ? `p_col = ${fx(pColAf(), 1)} kPa` : "—", { fs: 14, f: "#9fe6c0", w: 700, fam: "monospace" });
  el.innerHTML = s;
}
/** vasul gradat pe retur (2 L) și cronometrul testului activ al pompei */
function desenDebit() {
  const el = $("#svg-debit"); if (!el) return;
  const Pf = "db", D = sim.deb, X = 430, Y0 = 40, H = 220, W = 90, yV = v => Y0 + H - v / 2 * (H - 10);
  let s = defsInstr(Pf) + `<defs><linearGradient id="${Pf}-sticla" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe3f2" stop-opacity=".6"/><stop offset=".25" stop-color="#ffffff" stop-opacity=".25"/><stop offset=".75" stop-color="#f6fbff" stop-opacity=".1"/><stop offset="1" stop-color="#a9c3d8" stop-opacity=".6"/></linearGradient>
    <linearGradient id="${Pf}-benz" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0b24a" stop-opacity=".85"/><stop offset=".5" stop-color="#f6d77a" stop-opacity=".75"/><stop offset="1" stop-color="#c9952a" stop-opacity=".9"/></linearGradient></defs>`;
  // furtunul de retur (de la regulator) introdus în vas
  s += `<path d="M120,60 C260,20 ${X + 30},10 ${X + 40},${Y0 + 30}" fill="none" stroke="${D.retur ? "#2f6f9e" : "#9aa3ac"}" stroke-width="7" stroke-linecap="round"/>${txt(130, 48, D.retur ? "returul introdus în vasul gradat" : "returul conectat la rezervor", { fs: 10, a: "start" })}`;
  if (D.activ) s += `<path d="M${X + 40},${Y0 + 34} V${yV(D.V) - 2}" stroke="#f0c75a" stroke-width="3" opacity=".9"/>`;
  // vasul gradat 2000 mL
  s += `<rect x="${X - 8}" y="${Y0 + H}" width="${W + 16}" height="10" rx="3" fill="#3b3f45"/><path d="M${X},${Y0} V${Y0 + H} H${X + W} V${Y0}" fill="url(#${Pf}-sticla)" stroke="#7f9db8" stroke-width="1.5"/>`;
  s += `<rect x="${X + 1}" y="${yV(D.V)}" width="${W - 2}" height="${Y0 + H - yV(D.V)}" fill="url(#${Pf}-benz)"/>`;
  for (let k = 1; k <= 40; k++) { const v = k * 0.05, y = yV(v), mj = k % 2 === 0, l = k % 10 === 0; s += `<line x1="${X + W}" y1="${y}" x2="${X + W - (l ? 26 : mj ? 16 : 8)}" y2="${y}" stroke="#1b2733" stroke-width="${l ? 1.2 : 0.6}"/>`; if (l) s += txt(X + W - 30, y + 4, `${fx(v, 1)} L`, { fs: 10, a: "end", w: 700, f: "#1b2733" }); }
  s += txt(X + W / 2, Y0 + H + 26, `vas gradat 2000 mL – citire: ${fx(Math.round(D.V / 0.05) * 0.05, 2)} L`, { fs: 12, w: 700, halo: true });
  // cronometrul / starea testului activ
  s += `<g filter="url(#${Pf}-umbra)"><rect x="590" y="70" width="190" height="120" rx="40" fill="url(#${Pf}-corp)" stroke="#000"/><rect x="672" y="56" width="26" height="18" rx="5" fill="url(#${Pf}-crom)"/></g><rect x="612" y="98" width="146" height="54" rx="6" fill="#a7b39b"/>`;
  s += txt(750, 138, fx(D.t, 1), { fs: 32, a: "end", w: 700, f: "#1d2618", fam: "'Courier New', monospace" }) + txt(685, 172, "cronometru [s]", { fs: 9.5, f: "#d8dde2" });
  s += `<g filter="url(#${Pf}-umbra)"><rect x="40" y="150" width="260" height="96" rx="10" fill="#1d2228" stroke="#000"/><rect x="40" y="150" width="260" height="16" rx="8" fill="#c62828"/></g>${txt(170, 162, "LAUNCH X431 · Test activ", { fs: 9.5, f: "#fff", w: 700 })}`;
  s += txt(170, 196, "Pompa de combustibil – 60 s", { fs: 12, f: "#e6ebf0", w: 600 }) + txt(170, 224, D.activ ? `ACTIVĂ ${fx(60 - D.t, 0)} s` : D.t >= 60 ? "test încheiat" : "oprită", { fs: 14, f: D.activ ? "#6dff8e" : "#9aa3ac", w: 700, fam: "monospace" });
  el.innerHTML = s;
}
/** ecranul testerului Launch X431: date live și semnalul sondei λ amonte */
function desenX431() {
  const el = $("#svg-x431"); if (!el) return;
  const g = tinta(), viu = sim.merge, p = P();
  const lam1 = viu && sim.lamBuf.length ? sim.lamBuf[sim.lamBuf.length - 1][1] : 0.45;
  const rows = [["Turația motorului", viu ? fx(sim.rpm, 0) : "0", "rot/min"], ["Temperatura lichidului de răcire", fx(sim.ect, 0), "°C"], ["Presiunea în colector (MAP)", fx(pColAf(), 1), "kPa"],
    ["Tensiunea sondei λ amonte", viu ? fx(lam1, 3) : "0,450", "V"], ["Tensiunea sondei λ aval", viu ? fx(0.66 + 0.02 * Math.sin(sim.t * 0.3), 3) : "0,450", "V"],
    ["Corecția pe termen scurt (STFT)", viu ? fx(sim.stftAf, 1) : "0,0", "%"], ["Corecția pe termen lung (LTFT)", viu ? fx(g.ltft, 1) : fx(MD.stare(p, "ralanti", "").ltft, 1), "%"],
    ["Durata injecției", viu ? fx((sim.reg === "r2500" ? 2.1 : 2.7) * (1 + (g.ltft + sim.stftAf) / 100), 2) : "0,00", "ms"], ["Bucla de reglare λ", viu && sim.ect > 70 ? "închisă" : "deschisă", ""]];
  let s = `<defs><linearGradient id="xb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f46"/><stop offset="1" stop-color="#16191d"/></linearGradient></defs>`;
  s += `<rect x="6" y="6" width="808" height="318" rx="22" fill="url(#xb)" stroke="#000"/><rect x="26" y="22" width="768" height="286" rx="6" fill="#f4f6f8"/>`;
  s += `<rect x="26" y="22" width="768" height="26" rx="6" fill="#c62828"/>${txt(36, 40, "LAUNCH X-431 PRO", { fs: 12, a: "start", f: "#fff", w: 800 })}${txt(784, 40, "Renault · K7J 1.4 MPI · Sistem injecție · Date live", { fs: 10.5, a: "end", f: "#ffe1e1" })}`;
  rows.forEach(([n, v, u], i) => { const y = 66 + i * 26; s += `<rect x="34" y="${y - 15}" width="410" height="22" fill="${i % 2 ? "#ffffff" : "#e9eef3"}"/>${txt(42, y, n, { fs: 11, a: "start", f: "#1b2733" })}${txt(392, y, v, { fs: 12, a: "end", f: "#0b2a4a", w: 700, fam: "monospace" })}${txt(400, y, u, { fs: 10, a: "start", f: "#5d6b7a" })}`; });
  // graficul sondei λ amonte (ultimele 10 s)
  const X0 = 462, X1 = 784, Y0 = 60, Y1 = 290, yv = v => Y1 - v / 1.0 * (Y1 - Y0);
  s += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="#07120d"/>`;
  for (let k = 1; k < 10; k++) s += `<line x1="${X0 + (X1 - X0) * k / 10}" y1="${Y0}" x2="${X0 + (X1 - X0) * k / 10}" y2="${Y1}" stroke="rgba(120,200,160,.15)"/>`;
  [0.2, 0.4, 0.45, 0.6, 0.8].forEach(v => { s += `<line x1="${X0}" y1="${yv(v)}" x2="${X1}" y2="${yv(v)}" stroke="rgba(120,200,160,${v === 0.45 ? 0.45 : 0.15})"${v === 0.45 ? ' stroke-dasharray="4 3"' : ""}/>${txt(X0 + 3, yv(v) - 2, fx(v, 2), { fs: 8, a: "start", f: "#9fe6c0" })}`; });
  const B = sim.lamBuf.filter(([t]) => t >= sim.t - 10);
  if (B.length > 1) s += `<polyline points="${B.map(([t, v]) => `${(X0 + (t - sim.t + 10) / 10 * (X1 - X0)).toFixed(1)},${yv(v).toFixed(1)}`).join(" ")}" fill="none" stroke="#ffe14d" stroke-width="1.8"/>`;
  s += txt((X0 + X1) / 2, Y0 - 6, "Sonda λ amonte [V] – 1 s/div", { fs: 10, f: "#1b2733", w: 700 }) + txt(X1 - 4, Y0 + 12, "bogat", { fs: 9, a: "end", f: "#ffe14d" }) + txt(X1 - 4, Y1 - 5, "sărac", { fs: 9, a: "end", f: "#ffe14d" });
  el.innerHTML = s;
}
/** sonda de prelevare reală: pre-filtru cu separator de apă, furtun, mâner cauciucat, țeavă din inox cu vârf flexibil și clemă cu arc;
    introdusă ≥ 30 cm în țeava de evacuare sau așezată pe suport */
function sondaPrelevare(I, inEvac, motor) {
  let s = `<defs><linearGradient id="${I}-inox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".3" stop-color="#c3c9cf"/><stop offset=".6" stop-color="#8b939b"/><stop offset="1" stop-color="#5a6168"/></linearGradient>
    <linearGradient id="${I}-inoxV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a6168"/><stop offset=".4" stop-color="#f4f6f8"/><stop offset=".7" stop-color="#a9b0b7"/><stop offset="1" stop-color="#5a6168"/></linearGradient>
    <linearGradient id="${I}-teava" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e2dc"/><stop offset=".25" stop-color="#b9a98f"/><stop offset=".55" stop-color="#8a6f52"/><stop offset=".8" stop-color="#5c4632"/><stop offset="1" stop-color="#3a2c20"/></linearGradient>
    <linearGradient id="${I}-maner" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b3f45"/><stop offset=".45" stop-color="#16181b"/><stop offset="1" stop-color="#2b2f34"/></linearGradient>
    <linearGradient id="${I}-sticla" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe3f2" stop-opacity=".7"/><stop offset=".3" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#9fb8cc" stop-opacity=".7"/></linearGradient>
    <radialGradient id="${I}-fum" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9aa3ac" stop-opacity=".45"/><stop offset="1" stop-color="#9aa3ac" stop-opacity="0"/></radialGradient></defs>`;
  // racordul analizorului și furtunul spre pre-filtru
  s += `<rect x="604" y="238" width="16" height="22" rx="3" fill="#8a949e" stroke="#555"/><path d="M620,249 C650,250 640,290 668,286" fill="none" stroke="#1a1c1f" stroke-width="7" stroke-linecap="round"/>`;
  // pre-filtrul cu separator de apă (corp transparent, element filtrant, apă condensată)
  s += `<rect x="664" y="200" width="34" height="96" rx="7" fill="url(#${I}-sticla)" stroke="#6f8aa0"/><rect x="671" y="212" width="20" height="62" rx="3" fill="#f3f1ea" stroke="#cfc8b8"/>`;
  for (let k = 0; k < 9; k++) s += `<line x1="671" y1="${216 + k * 7}" x2="691" y2="${216 + k * 7}" stroke="#d8d0bd" stroke-width="1"/>`;
  s += `<rect x="666" y="282" width="30" height="12" rx="4" fill="#9cc7e6" opacity=".7"/><rect x="660" y="190" width="42" height="12" rx="3" fill="#c62828"/><rect x="660" y="294" width="42" height="9" rx="3" fill="#c62828"/>`;
  s += txt(681, 318, "pre-filtru / separator apă", { fs: 9 });
  if (inEvac) {
    // țeava de evacuare (inox decolorat termic) cu sonda introdusă ≥ 30 cm
    s += `<path d="M681,190 C681,150 700,150 742,158" fill="none" stroke="#1a1c1f" stroke-width="7" stroke-linecap="round"/>`;
    s += `<rect x="842" y="128" width="158" height="44" fill="url(#${I}-teava)"/><ellipse cx="842" cy="150" rx="9" ry="22" fill="#2a2420" stroke="#6b5a48"/><ellipse cx="842" cy="150" rx="6" ry="18" fill="#0d0b0a"/>`;
    s += `<line x1="852" y1="153" x2="992" y2="153" stroke="#c3c9cf" stroke-width="4" stroke-dasharray="7 5" opacity=".75"/><path d="M992,153 q6,-1 8,4" fill="none" stroke="#c3c9cf" stroke-width="4" opacity=".75"/>`;
    s += `<path d="M852,${190} H992" stroke="#37474f" stroke-width="1"/><path d="M852,186 v8 M992,186 v8" stroke="#37474f" stroke-width="1"/>` + txt(922, 205, "≥ 30 cm în țeavă", { fs: 10, w: 700 });
    // mânerul, țeava sondei și clema cu arc pe marginea țevii
    s += `<rect x="742" y="146" width="60" height="18" rx="7" fill="url(#${I}-maner)"/>`;
    for (let k = 0; k < 7; k++) s += `<line x1="${750 + k * 7}" y1="148" x2="${750 + k * 7}" y2="162" stroke="#4a4f55" stroke-width="1.6"/>`;
    s += `<rect x="802" y="149" width="12" height="12" rx="2" fill="url(#${I}-inox)"/><rect x="814" y="150" width="40" height="7" fill="url(#${I}-inox)"/>`;
    s += `<path d="M826,150 L826,120 Q826,112 834,112 L850,112 Q856,112 856,120 L856,132" fill="none" stroke="url(#${I}-inoxV)" stroke-width="4" stroke-linecap="round"/><path d="M826,128 q-8,4 0,8 q-8,4 0,8" fill="none" stroke="#8b939b" stroke-width="2"/>`;
    if (motor) for (let k = 0; k < 3; k++) { const ph = (performance.now() / 900 + k / 3) % 1; s += `<circle cx="${838 - ph * 70}" cy="${150 - ph * 25 + k * 6}" r="${10 + ph * 26}" fill="url(#${I}-fum)" opacity="${1 - ph}"/>`; }
    s += txt(790, 100, "clemă cu arc pe țeavă", { fs: 9.5 }) + txt(772, 186, "mâner", { fs: 9 });
  } else {
    // sonda pe suportul analizorului (vertical), cu vârful flexibil în sus
    s += `<path d="M681,190 C681,150 740,250 772,236" fill="none" stroke="#1a1c1f" stroke-width="7" stroke-linecap="round"/>`;
    s += `<rect x="756" y="176" width="34" height="14" rx="3" fill="#7f8891" stroke="#4b5259"/><path d="M790,183 h28 v-150" fill="none" stroke="#9aa3ac" stroke-width="5"/>`;
    s += `<rect x="764" y="180" width="18" height="62" rx="7" fill="url(#${I}-maner)"/>`;
    for (let k = 0; k < 7; k++) s += `<line x1="766" y1="${188 + k * 7}" x2="780" y2="${188 + k * 7}" stroke="#4a4f55" stroke-width="1.6"/>`;
    s += `<rect x="767" y="168" width="12" height="13" rx="2" fill="url(#${I}-inox)"/><rect x="770" y="40" width="7" height="130" fill="url(#${I}-inoxV)"/>`;
    s += `<path d="M773,40 C773,20 790,14 800,20" fill="none" stroke="url(#${I}-inoxV)" stroke-width="7" stroke-linecap="round"/><path d="M773,32 C774,22 786,16 798,19" fill="none" stroke="#6b737c" stroke-width="1" stroke-dasharray="2 2"/>`;
    s += `<path d="M778,120 q10,-4 10,-14 v-16" fill="none" stroke="url(#${I}-inoxV)" stroke-width="3"/>`;
    s += txt(850, 60, "vârf flexibil", { fs: 9.5, a: "start" }) + txt(850, 120, "sondă inox Ø 8 mm", { fs: 9.5, a: "start" }) + txt(850, 214, "mâner + clemă", { fs: 9.5, a: "start" }) + txt(850, 250, "pe suport", { fs: 10.5, a: "start", w: 700 });
    s += `<path d="M806,22 L846,57 M790,110 L846,117 M792,205 L846,210" stroke="var(--text-sec, #888)" stroke-width=".8"/>`;
  }
  return s;
}

/** analizorul de gaze AVL (4 gaze + λ), cu sonda de prelevare */
function desenAVL() {
  const el = $("#svg-avl"); if (!el) return;
  const A = sim.avl, I = el.dataset.pre || "av", g = gazeAfisate(), lam = MD.brettschneider(g.CO, g.CO2, g.HC, g.O2), ok = avlGata();
  const masoara = ok && A.sonda;
  let s = `<defs><linearGradient id="${I}-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f5f7"/><stop offset="1" stop-color="#c9d0d7"/></linearGradient><linearGradient id="${I}-e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1f3a"/><stop offset="1" stop-color="#06101f"/></linearGradient>
    <filter id="${I}-u" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="1.5" dy="3" stdDeviation="3" flood-opacity=".35"/></filter></defs>`;
  s += `<g filter="url(#${I}-u)"><rect x="10" y="12" width="600" height="300" rx="14" fill="url(#${I}-c)" stroke="#8a949e"/></g><rect x="10" y="12" width="600" height="30" rx="14" fill="#0b4ea2"/><rect x="10" y="28" width="600" height="14" fill="#0b4ea2"/>`;
  s += txt(26, 33, "AVL DiGas · analizor de gaze 4 componente + λ", { fs: 12, a: "start", f: "#fff", w: 800 });
  s += `<rect x="28" y="54" width="440" height="240" rx="8" fill="url(#${I}-e)" stroke="#000"/>`;
  const L = [["CO", masoara ? fx(g.CO, 2) : "-.--", "% vol"], ["CO₂", masoara ? fx(g.CO2, 1) : "--.-", "% vol"], ["HC", masoara ? String(g.HC) : "----", "ppm hex"], ["O₂", masoara ? fx(g.O2, 2) : (A.zero ? "20,90" : "-.--"), "% vol"], ["λ", masoara && Number.isFinite(lam) ? fx(lam, 3) : "-.---", "Brettschn."]];
  L.forEach(([n, v, u], i) => { const y = 92 + i * 40; s += txt(46, y, n, { fs: 18, a: "start", f: "#7fb4ff", w: 700 }) + txt(352, y, v, { fs: 28, a: "end", f: "#e9f2ff", w: 700, fam: "'Courier New', monospace" }) + txt(362, y, u, { fs: 11, a: "start", f: "#7fb4ff" }); });
  s += txt(46, 284, `n = ${sim.merge ? fx(sim.rpm, 0) : "0"} rot/min · T ulei = ${fx(sim.tUlei, 0)} °C`, { fs: 12, a: "start", f: "#9fc4ff" });
  const st = !A.pornit ? "oprit" : A.tInc < 60 ? `încălzire ${fx(60 - A.tInc, 0)} s` : !A.etans ? "test de etanșeitate necesar" : !A.zero ? "aducere la zero necesară" : !A.sonda ? "gata – introduceți sonda" : !sim.merge ? "motor oprit" : sim.tReg < 15 || (provActiv() && sim.tProv < 15) ? "stabilizare…" : "MĂSURARE – valori stabile";
  s += `<rect x="484" y="54" width="112" height="240" rx="8" fill="#e3e8ee" stroke="#9aa5b1"/>` + txt(540, 76, "Stare", { fs: 11, f: "#1b2733", w: 700 });
  st.split(" – ").forEach((l, i) => { s += txt(540, 100 + i * 16, l, { fs: 10.5, f: st.startsWith("MĂSURARE") ? "#1b7f3b" : "#8a4b00", w: 700 }); });
  [["PORNIT", A.pornit], ["ÎNCĂLZIT", A.tInc >= 60], ["ETANȘ", A.etans], ["ZERO", A.zero], ["SONDĂ", A.sonda]].forEach(([n, on], i) => { const y = 150 + i * 26; s += `<circle cx="502" cy="${y}" r="6" fill="${on ? "#2e9e44" : "#9aa3ac"}"/>` + txt(514, y + 4, n, { fs: 10, a: "start", f: "#1b2733", w: 600 }); });
  s += sondaPrelevare(I, A.sonda, sim.merge);
  el.innerHTML = s;
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const RG = ["ralanti", "r2500"], PROV = ["aer", "rateu", "pres"];
const NUME_PROV = { aer: "Aer fals (furtun de vacuum desprins)", rateu: "Rateu – injector decuplat", pres: "Presiune mare (furtunul regulatorului deconectat)" };
const PASI = [
  { t: "Pregătirea", tab: "NSSM, analizor, motor cald", vedere: "gen", panou: "prep",
    instr: ["NSSM: extinctorul la îndemână, mănuși, fără surse de scântei; exhaustarea montată la țeava de evacuare.", "Porniți analizorul de gaze pentru încălzire (≈ 60 s), apoi faceți testul de etanșeitate a traseului de prelevare și aducerea la zero cu aer curat.", "Motorul este cald: lichid de răcire ≥ 80 °C, ulei ≥ 80 °C (senzorul analizorului)."],
    ver: () => [[sim.manusi && sim.ext && sim.exh, "mănuși, extinctor, exhaustare"], [sim.avl.pornit && sim.avl.tInc >= 60, sim.avl.pornit ? `analizor încălzit (${fx(Math.min(60, sim.avl.tInc), 0)}/60 s)` : "analizorul oprit"], [sim.avl.etans, "test de etanșeitate trecut"], [sim.avl.zero, "adus la zero cu aer curat"]],
    prog: () => (sim.manusi && sim.ext && sim.exh ? 1 : 0) + (avlGata() ? 1 : 0) + (sim.ect >= 80 ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși</label><label class="bifa"><input type="checkbox" id="ck-ext"> Extinctor</label><label class="bifa"><input type="checkbox" id="ck-exh"> Exhaustare</label></div>
      <div class="rand-butoane"><button type="button" id="b-avl">Pornește analizorul</button><button type="button" id="b-etans">Test de etanșeitate</button><button type="button" id="b-zero">Aducere la zero (aer curat)</button></div>` },
  { t: "Presiunea combustibilului", tab: "Tabelul 4.1 – contact, ralanti, fără vacuum", vedere: "adm", panou: "pres",
    instr: ["Cu motorul oprit depresurizați sistemul (siguranța pompei scoasă, motorul pornit până se oprește), apoi montați manometrul pe ventilul Schrader al turului.", "Puneți contactul: pompa amorsează ≈ 5 s – citiți presiunea și p<sub>col</sub> (X431) în acest interval.", "Porniți motorul; la ralanti citiți presiunea și p<sub>col</sub>.", "Deconectați și obturați furtunul de depresiune al regulatorului: citiți presiunea, apoi reconectați furtunul."],
    ver: () => [[sim.man.montat, "manometrul montat pe tur"], [sim.contact, "contact pus"], [sim.merge ? sim.reg === "ralanti" : sim.contact && sim.t - sim.man.tPrime <= DUR_PRIME, sim.merge ? (sim.reg === "ralanti" ? "motor la ralanti" : "readuceți motorul la ralanti") : sim.contact && sim.t - sim.man.tPrime <= DUR_PRIME ? `pompa amorsează (${fx(DUR_PRIME - (sim.t - sim.man.tPrime), 0)} s)` : "pompa nu funcționează – luați și puneți contactul"], [sim.regFurtun, sim.regFurtun ? "furtunul regulatorului conectat" : "furtunul regulatorului deconectat și obturat"]],
    prog: () => ["contact", "ralanti", "faravac"].filter(k => pe("t41", k, "p")).length, tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" id="b-depres">Depresurizează sistemul</button><button type="button" id="b-mont">Montează manometrul</button></div>
      <div class="rand-butoane"><button type="button" id="b-contact">Contact</button><button type="button" class="primar" id="b-porn">Pornește motorul</button><button type="button" id="b-stop">Oprește</button></div>
      <div class="rand-butoane"><button type="button" id="b-regf">Deconectează furtunul regulatorului</button></div>`,
    buton: ["● Presiunea și p<sub>col</sub> → Tabelul 4.1", e => inregPres(e)] },
  { t: "Menținerea presiunii", tab: "Tabelul 4.1 – după 5 min", vedere: "adm", panou: "pres",
    instr: ["Cu manometrul montat și furtunul regulatorului conectat, opriți motorul (de la ralanti).", "Nu mai puneți contactul: urmăriți presiunea 5 minute (bifați „timp accelerat” pentru ×10).", "După 5 minute înregistrați presiunea."],
    ver: () => [[sim.man.montat, "manometrul montat"], [!sim.merge && sim.man.tOprit !== null, sim.man.tOprit !== null ? `motor oprit de ${fx(sim.t - sim.man.tOprit, 0)} s` : "opriți motorul"], [sim.man.tOprit !== null && sim.t - sim.man.tOprit >= 300, "≥ 300 s de la oprire"]],
    prog: () => pe("t41", "dupa5", "p") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><button type="button" id="b-stop2">Oprește motorul</button><label class="bifa"><input type="checkbox" id="ck-rapid"> Timp accelerat ×10</label></div>`,
    buton: ["● Presiunea după 5 min → Tabelul 4.1", e => inregRetinere(e)] },
  { t: "Debitul pompei", tab: "Tabelul 4.1 – Q_p", vedere: "adm", panou: "debit",
    instr: ["Motorul oprit, contactul pus: introduceți conducta de retur în vasul gradat.", "Acționați pompa 60 s cu testul activ X431 și citiți volumul colectat.", "Readuceți returul la rezervor și returnați combustibilul (vas închis, etichetat)."],
    ver: () => [[!sim.merge, "motorul oprit"], [sim.contact, "contact pus"], [sim.deb.retur, "returul în vasul gradat"], [sim.deb.t >= 60, sim.deb.activ ? `pompa acționată ${fx(sim.deb.t, 0)}/60 s` : sim.deb.t >= 60 ? "60 s încheiate" : "testul activ neefectuat"]],
    prog: () => pe("t41", "debit", "p") ? 1 : 0, tot: 1,
    ctl: `<div class="rand-butoane"><button type="button" id="b-contact3">Contact</button></div><div class="rand-butoane"><button type="button" id="b-retur">Returul în vasul gradat</button><button type="button" class="primar" id="b-test">Test activ pompă 60 s (X431)</button><button type="button" id="b-golvas">Golește vasul în rezervor</button></div>
      <label class="bifa"><input type="checkbox" id="ck-rapid2"> Timp accelerat ×10</label>`,
    buton: ["● Volumul în 60 s → Tabelul 4.1", e => inregDebit(e)] },
  { t: "Gazele – motor normal", tab: "Tabelul 4.2", vedere: "ev", panou: "gaze",
    instr: ["Demontați trusa (cu motorul oprit), porniți motorul cald; sonda analizorului ≥ 30 cm în țeava de evacuare.", "La ralanti, după stabilizare (≈ 15 s), înregistrați gazele, λ, turația și corecțiile STFT/LTFT (X431).", "Repetați la ≈ 2500 rot/min."],
    ver: () => [[avlGata(), "analizorul gata (încălzit, etanș, zero)"], [sim.avl.sonda, "sonda în evacuare"], [sim.merge, "motorul pornit"], [!provActiv(), "fără defect provocat"], [gazeStabile(), gazeStabile() ? "valori stabile" : "stabilizare…"]],
    prog: () => RG.filter(k => pe("t42", k, "CO")).length, tot: 2,
    ctl: `<div class="rand-butoane"><button type="button" id="b-sonda">Sonda în țeava de evacuare</button></div><div class="rand-butoane"><button type="button" id="b-contact4">Contact</button><button type="button" class="primar" id="b-porn2">Pornește motorul</button><button type="button" id="b-stop4">Oprește</button></div>
      <div class="rand-butoane"><button type="button" data-reg="ralanti">Ralanti</button><button type="button" data-reg="r2500">≈ 2500 rot/min</button></div>`,
    buton: ["● Gazele, n, STFT/LTFT → Tabelul 4.2", e => inregGaze(e, false)] },
  { t: "Defecte provocate", tab: "Tabelul 4.3 (≈ 2500 rot/min)", vedere: "adm", panou: "gaze",
    instr: ["Motorul la ≈ 2500 rot/min, sonda în evacuare. Provocați câte un defect, cel mult 1–2 minute (catalizatorul se supraîncălzește).", "După stabilizare (≈ 15 s) înregistrați gazele și corecțiile; alegeți explicația.", "Reveniți la normal între defecte."],
    ver: () => [[sim.merge && sim.reg === "r2500", "motorul la ≈ 2500 rot/min"], [!!provActiv(), provActiv() ? `${NUME_PROV[provActiv()]} – ${fx(sim.tProv, 0)} s` : "niciun defect provocat"], [gazeStabile(), gazeStabile() ? "valori stabile" : "stabilizare…"]],
    prog: () => PROV.filter(k => pe("t43", k, "CO")).length, tot: 3,
    ctl: `<div class="rand-butoane">${PROV.map(k => `<button type="button" data-prov="${k}">${{ aer: "Aer fals", rateu: "Rateu (injector decuplat)", pres: "Presiune mare" }[k]}</button>`).join("")}<button type="button" data-prov="">Revenire la normal</button></div>
      <label class="camp">Injectorul decuplat (test activ X431) <select id="sel-cil">${[1, 2, 3, 4].map(c => `<option value="${c}"${c === 2 ? " selected" : ""}>cilindrul ${c}</option>`).join("")}</select></label>
      <label class="camp">Explicația <select id="sel-expl"><option value=""></option>${MD.EXPLICATII.map(x => `<option>${x}</option>`).join("")}</select></label>`,
    buton: ["● Gazele cu defectul provocat → Tabelul 4.3", e => inregGaze(e, true)] },
  { t: "Diagnosticul", tab: "Tabelul 4.4", vedere: "gen", panou: "diag",
    instr: ["Comparați presiunile (contact / ralanti / fără vacuum / după 5 min), debitul și corecțiile LTFT la ralanti și la 2500 rot/min.", "Folosiți tiparele: presiune care scade repede după oprire → supapă de reținere sau injector neetanș; presiune care nu urmărește p<sub>col</sub> → regulator; debit mic → filtru/pompă; LTFT mare pozitiv la ralanti → aer fals; comutare lentă a sondei → sondă îmbătrânită.", "Alegeți defectul ascuns al motorului vostru."],
    ver: () => [[["contact", "ralanti", "faravac", "dupa5", "debit"].every(k => pe("t41", k, "p")), "Tabelul 4.1 complet"], [RG.every(k => pe("t42", k, "CO")), "Tabelul 4.2 complet"], [PROV.every(k => pe("t43", k, "CO")), "Tabelul 4.3 complet"]],
    prog: () => pe("t44", "d", "cauza") ? 1 : 0, tot: 1,
    ctl: `<label class="camp">Defectul identificat <select id="sel-diag"><option value=""></option>${MD.optiuniDiag().map(o => `<option>${o}</option>`).join("")}</select></label>`,
    buton: ["● Diagnosticul → Tabelul 4.4", e => inregDiag(e)] }
];
let pasActiv = 0;
function construiestePasi() {
  $("#pasi").innerHTML = PASI.map((p, i) => `<li class="pas" data-pas="${i}"><button type="button" class="pas-cap"><span class="pas-nr">${i + 1}</span><span>${p.t}<br><small>${p.tab}</small></span><span class="pas-prog"></span></button>
    <div class="pas-corp"><ol>${p.instr.map(x => `<li>${x}</li>`).join("")}</ol><ul class="pas-ver"></ul><div class="pas-ctl">${p.ctl}</div>${p.buton ? `<button type="button" class="primar lat" data-inreg="${i}">${p.buton[0]}</button>` : ""}</div></li>`).join("");
  $$("#pasi .pas-cap").forEach(b => b.addEventListener("click", () => alegePas(+b.closest(".pas").dataset.pas)));
  $$("#pasi [data-inreg]").forEach(b => b.addEventListener("click", e => { PASI[+b.dataset.inreg].buton[1](e); actualizeazaPasi(); }));
  legaComenzi();
  alegePas(0);
}
function alegePas(i) {
  pasActiv = i; const p = PASI[i];
  $$("#pasi .pas").forEach(el => el.classList.toggle("activ", +el.dataset.pas === i));
  $$(".instr").forEach(el => { el.hidden = !el.dataset.panou.split(" ").includes(p.panou); });
  const bv = document.querySelector(`#motor3d .m3d-vederi [data-v="${p.vedere}"]`); if (bv) bv.click();
  if (p.panou === "diag") rezumat();
  deseneazaPanou(true); actualizeazaPasi();
}
function deseneazaPanou(tot) {
  const pn = PASI[pasActiv].panou;
  if (tot || pn === "pres") desenPres();
  if (tot || pn === "debit") desenDebit();
  if (tot || pn === "gaze") { desenAVL(); desenX431(); }
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (id, on, t1, t0) => { const b = $(id); if (b) { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); } };
  s("#b-avl", sim.avl.pornit, "✓ Analizor pornit", "Pornește analizorul"); s("#b-etans", sim.avl.etans, "✓ Etanșeitate OK", "Test de etanșeitate"); s("#b-zero", sim.avl.zero, "✓ Zero OK", "Aducere la zero (aer curat)");
  s("#b-depres", sim.man.depres, "✓ Sistem depresurizat", "Depresurizează sistemul"); s("#b-mont", sim.man.montat, "Demontează manometrul", "Montează manometrul");
  ["#b-contact", "#b-contact3", "#b-contact4"].forEach(id => s(id, sim.contact, "Contact: pus", "Contact: luat")); s("#b-regf", !sim.regFurtun, "Reconectează furtunul regulatorului", "Deconectează furtunul regulatorului");
  s("#b-retur", sim.deb.retur, "Returul înapoi la rezervor", "Returul în vasul gradat"); s("#b-sonda", sim.avl.sonda, "Scoate sonda", "Sonda în țeava de evacuare");
  $$("[data-reg]").forEach(b => b.classList.toggle("activ", sim.merge && b.dataset.reg === sim.reg));
  $$("[data-prov]").forEach(b => b.classList.toggle("activ", sim.merge && b.dataset.prov === sim.prov && !!b.dataset.prov));
  $("#af-st").textContent = sim.merge ? "motor pornit" : sim.contact ? "contact pus" : "contact luat"; $("#af-n").textContent = fx(sim.rpm, 0);
  $("#af-T").textContent = `${fx(sim.ect, 0)} / ${fx(sim.tUlei, 0)}`; $("#af-p").textContent = sim.man.montat ? fx(sim.man.pAf, 2) : "—"; $("#af-prov").textContent = provActiv() ? { aer: "aer fals", rateu: `rateu cil. ${sim.cilR}`, pres: "presiune mare" }[provActiv()] : "—";
}
function rezumat() {
  const t = Cadru.D.t, el = $("#rezumat"); if (!el) return;
  const v = (tb, r, c) => t[tb][r][c] === "" ? "—" : String(t[tb][r][c]).replace(".", ",");
  el.innerHTML = `<table class="tabel"><thead><tr><th>Mărime</th><th>Valoare</th><th>p<sub>col</sub> [kPa]</th></tr></thead><tbody>
    <tr><td>p<sub>r</sub> la contact [bar]</td><td>${v("t41", "contact", "p")}</td><td>${v("t41", "contact", "pcol")}</td></tr>
    <tr><td>p<sub>r</sub> la ralanti [bar]</td><td>${v("t41", "ralanti", "p")}</td><td>${v("t41", "ralanti", "pcol")}</td></tr>
    <tr><td>p<sub>r</sub> fără vacuum [bar]</td><td>${v("t41", "faravac", "p")}</td><td>${v("t41", "faravac", "pcol")}</td></tr>
    <tr><td>p<sub>r</sub> după 5 min [bar]</td><td>${v("t41", "dupa5", "p")}</td><td></td></tr>
    <tr><td>V în 60 s [L]</td><td>${v("t41", "debit", "p")}</td><td></td></tr>
    <tr><td>LTFT ralanti / 2500 [%]</td><td>${v("t42", "ralanti", "ltft")} / ${v("t42", "r2500", "ltft")}</td><td></td></tr>
    <tr><td>CO / HC / O₂ la ralanti</td><td>${v("t42", "ralanti", "CO")} % / ${v("t42", "ralanti", "HC")} ppm / ${v("t42", "ralanti", "O2")} %</td><td></td></tr>
    <tr><td>Presiune mare provocată: λ / STFT</td><td>${v("t43", "pres", "lamA")} / ${v("t43", "pres", "stft")} %</td><td></td></tr></tbody></table>
    <p class="nota">Semnalul sondei λ amonte se urmărește pe ecranul X431 (pasul 5): comutare rapidă 0,1…0,8 V ≈ 1 Hz – sondă bună; lentă și cu amplitudine mică – sondă îmbătrânită.</p>`;
}

/* ------------------------------------------------------------------ comenzile */
function on(id, f) { const b = $(id); if (b) b.addEventListener("click", f); }
function porneste() {
  if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul.", "atentie");
  if (!sim.exh || !sim.ext) return Cadru.mesajTemporar("NSSM: exhaustarea montată și extinctorul la îndemână înainte de pornire.", "pericol");
  if (sim.deb.retur) return Cadru.mesajTemporar("Readuceți întâi returul la rezervor.", "atentie");
  sim.merge = true; sim.reg = "ralanti"; sim.tReg = 0; sim.prov = ""; sim.man.depres = false; sim.man.tOprit = null; sim.lamBuf = [];
}
function opreste() { if (!sim.merge) return; sim.merge = false; sim.prov = ""; sim.man.tOprit = sim.t; }
function legaComenzi() {
  $("#ck-man").addEventListener("change", e => { sim.manusi = e.target.checked; }); $("#ck-ext").addEventListener("change", e => { sim.ext = e.target.checked; }); $("#ck-exh").addEventListener("change", e => { sim.exh = e.target.checked; });
  [$("#ck-rapid"), $("#ck-rapid2")].forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked; $("#ck-rapid").checked = $("#ck-rapid2").checked = sim.rapid; }));
  on("#b-avl", () => { sim.avl.pornit = true; });
  on("#b-etans", () => { if (!sim.avl.pornit || sim.avl.tInc < 60) return Cadru.mesajTemporar("Așteptați încălzirea analizorului.", "atentie"); if (sim.avl.sonda) return Cadru.mesajTemporar("Testul de etanșeitate se face cu sonda obturată, în afara evacuării.", "atentie"); sim.avl.etans = true; Cadru.mesajTemporar("Testul de etanșeitate a traseului de prelevare: trecut.", "ok"); });
  on("#b-zero", () => { if (!sim.avl.etans) return Cadru.mesajTemporar("Faceți întâi testul de etanșeitate.", "atentie"); if (sim.avl.sonda) return Cadru.mesajTemporar("Aducerea la zero se face cu aer curat, cu sonda scoasă din evacuare.", "atentie"); sim.avl.zero = true; Cadru.mesajTemporar("Analizorul a fost adus la zero (O₂ = 20,9 %).", "ok"); });
  on("#b-depres", () => { if (sim.merge || sim.contact) return Cadru.mesajTemporar("Depresurizarea se face de la motor oprit: scoateți siguranța pompei, porniți motorul până se oprește, apoi luați contactul.", "atentie"); sim.man.depres = true; sim.man.tOprit = null; Cadru.mesajTemporar("Sistemul a fost depresurizat (siguranța pompei remontată după).", "ok"); });
  on("#b-mont", () => {
    if (sim.merge || sim.contact) return Cadru.mesajTemporar("NSSM: trusa se montează / demontează cu motorul oprit și contactul luat.", "pericol");
    if (!sim.man.montat && !sim.man.depres) return Cadru.mesajTemporar("NSSM: depresurizați întâi sistemul – benzina sub presiune ar țâșni din ventilul Schrader.", "pericol");
    if (!sim.manusi) return Cadru.mesajTemporar("NSSM: puneți mănușile.", "atentie");
    sim.man.montat = !sim.man.montat; if (!sim.man.montat) { sim.man.depres = true; Cadru.mesajTemporar("Trusa demontată după golirea presiunii prin robinetul de golire (combustibilul colectat în vas închis).", "ok"); }
  });
  const contact = () => { if (sim.merge) return opreste(); sim.contact = !sim.contact; if (sim.contact) { sim.man.tPrime = sim.t; sim.man.depres = false; sim.man.tOprit = null; } else if (sim.t - sim.man.tPrime <= DUR_PRIME + 0.01) { sim.man.tOprit = sim.t; } };
  ["#b-contact", "#b-contact3", "#b-contact4"].forEach(id => on(id, contact)); on("#b-stop4", opreste);
  on("#b-porn", porneste); on("#b-porn2", porneste);
  on("#b-stop", opreste); on("#b-stop2", () => { if (!sim.merge) return Cadru.mesajTemporar("Motorul este deja oprit; porniți-l la ralanti și opriți-l pentru a începe testul.", "atentie"); if (sim.reg !== "ralanti" || !sim.regFurtun) return Cadru.mesajTemporar("Opriți motorul de la ralanti, cu furtunul regulatorului conectat.", "atentie"); opreste(); });
  on("#b-regf", () => { sim.regFurtun = !sim.regFurtun; });
  on("#b-retur", () => { if (sim.merge) return Cadru.mesajTemporar("Returul se mută cu motorul oprit.", "atentie"); if (sim.deb.activ) return; sim.deb.retur = !sim.deb.retur; });
  on("#b-test", () => { if (sim.merge) return Cadru.mesajTemporar("Testul activ al pompei se face cu motorul oprit.", "atentie"); if (!sim.contact) return Cadru.mesajTemporar("Puneți contactul (X431 comunică cu ECU).", "atentie"); if (!sim.deb.retur) return Cadru.mesajTemporar("Introduceți întâi returul în vasul gradat.", "atentie"); if (sim.deb.V > 0.01) return Cadru.mesajTemporar("Goliți întâi vasul.", "atentie"); sim.deb.activ = true; sim.deb.t = 0; });
  on("#b-golvas", () => { if (sim.deb.activ) return; sim.deb.V = 0; sim.deb.t = 0; });
  on("#b-sonda", () => { if (!sim.avl.sonda && !sim.manusi) return Cadru.mesajTemporar("NSSM: mănuși – țeava de evacuare depășește 200 °C.", "pericol"); sim.avl.sonda = !sim.avl.sonda; });
  $$("[data-reg]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); if (b.dataset.reg === "ralanti" && sim.prov) sim.prov = ""; sim.reg = b.dataset.reg; sim.tReg = 0; actualizeazaPasi(); }));
  $$("[data-prov]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.prov; if (!k) { sim.prov = ""; sim.tReg = 0; return; }
    if (!sim.merge || sim.reg !== "r2500") return Cadru.mesajTemporar("Defectele se provoacă la ≈ 2500 rot/min.", "atentie");
    if (sim.prov && sim.prov !== k) return Cadru.mesajTemporar("Reveniți întâi la normal: câte un singur defect provocat.", "atentie");
    sim.prov = k; sim.tProv = 0; sim.cilR = +$("#sel-cil").value;
  }));
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregPres(e) {
  const M = sim.man; if (!M.montat) return Cadru.mesajTemporar("Montați manometrul pe tur.", "atentie");
  let k;
  if (sim.merge) { if (sim.reg !== "ralanti") return Cadru.mesajTemporar("Citirile se fac la ralanti.", "atentie"); if (sim.tReg < 4) return Cadru.mesajTemporar("Așteptați stabilizarea ralantiului.", "atentie"); k = sim.regFurtun ? "ralanti" : "faravac"; }
  else if (sim.contact && sim.t - M.tPrime <= DUR_PRIME) { if (sim.t - M.tPrime < 1.5) return Cadru.mesajTemporar("Așteptați ca presiunea să se stabilizeze (≈ 1,5 s).", "atentie"); k = "contact"; }
  else return Cadru.mesajTemporar("Puneți contactul (citire în timpul amorsării pompei) sau porniți motorul.", "atentie");
  const p = Math.round(M.pAf * 100) / 100, pcol = Math.round(pColAf() * 10) / 10;
  const ok = Cadru.inregistreaza(e, { log: { m: "pres", k, p, pcol }, celule: [{ t: "t41", r: k, c: "p", v: p.toFixed(2) }, { t: "t41", r: k, c: "pcol", v: pcol.toFixed(1) }] });
  if (ok) msg(`Tabelul 4.1 (${{ contact: "contact pus", ralanti: "ralanti", faravac: "fără vacuum la regulator" }[k]}): p_r = ${fx(p, 2)} bar, p_col = ${fx(pcol, 1)} kPa.`);
}
function inregRetinere(e) {
  const M = sim.man; if (!M.montat) return Cadru.mesajTemporar("Montați manometrul.", "atentie");
  if (sim.merge || M.tOprit === null) return Cadru.mesajTemporar("Opriți motorul de la ralanti și așteptați 5 minute.", "atentie");
  const t = sim.t - M.tOprit; if (t < 300) return Cadru.mesajTemporar(`Au trecut doar ${fx(t, 0)} s din 300 s.`, "atentie");
  const p = Math.round(M.pAf * 100) / 100;
  const ok = Cadru.inregistreaza(e, { log: { m: "pres", k: "dupa5", p, t: Math.round(t) }, celule: [{ t: "t41", r: "dupa5", c: "p", v: p.toFixed(2) }] });
  if (ok) msg(`Tabelul 4.1: presiunea după ${fx(t, 0)} s de la oprire = ${fx(p, 2)} bar.`);
}
function inregDebit(e) {
  const D = sim.deb; if (D.activ) return Cadru.mesajTemporar("Așteptați sfârșitul celor 60 s.", "atentie");
  if (D.t < 60 || D.V <= 0) return Cadru.mesajTemporar("Efectuați testul activ al pompei 60 s cu returul în vasul gradat.", "atentie");
  const V = Math.round(D.V / 0.05) * 0.05;
  const ok = Cadru.inregistreaza(e, { log: { m: "debit", V: +V.toFixed(2), t: 60 }, celule: [{ t: "t41", r: "debit", c: "p", v: V.toFixed(2) }] });
  if (ok) msg(`Tabelul 4.1: în 60 s s-au colectat ${fx(V, 2)} L → Q_p = ${fx(V, 2)} l/min.`);
}
function inregGaze(e, cuProv) {
  if (!gazeStabile()) return Cadru.mesajTemporar(!avlGata() ? "Pregătiți analizorul (pasul 1)." : !sim.avl.sonda ? "Introduceți sonda în evacuare." : !sim.merge ? "Porniți motorul." : sim.tUlei < 80 ? "Uleiul trebuie să fie ≥ 80 °C." : "Așteptați stabilizarea valorilor (≈ 15 s).", "atentie");
  const pv = provActiv(); if (cuProv && !pv) return Cadru.mesajTemporar("Provocați un defect (≈ 2500 rot/min).", "atentie");
  if (!cuProv && pv) return Cadru.mesajTemporar("Reveniți la normal pentru Tabelul 4.2.", "atentie");
  const g = gazeAfisate(), lam = Math.round(MD.brettschneider(g.CO, g.CO2, g.HC, g.O2) * 1000) / 1000, stft = Math.round(sim.stftAf * 10) / 10, ltft = tinta().ltft, n = Math.round(sim.rpm / 10) * 10;
  const r = cuProv ? pv : sim.reg, tb = cuProv ? "t43" : "t42";
  let expl = ""; if (cuProv) { expl = $("#sel-expl").value; if (!expl) return Cadru.mesajTemporar("Alegeți explicația tiparului de emisii.", "atentie"); }
  const cel = [["CO", g.CO.toFixed(2)], ["CO2", g.CO2.toFixed(1)], ["HC", String(g.HC)], ["O2", g.O2.toFixed(2)], ["lamA", lam.toFixed(3)], ["stft", stft.toFixed(1)], ["ltft", ltft.toFixed(1)]].map(([c, v]) => ({ t: tb, r, c, v }));
  if (!cuProv) cel.push({ t: tb, r, c: "n", v: String(n) }); else cel.push({ t: tb, r, c: "expl", v: expl });
  const ok = Cadru.inregistreaza(e, { log: { m: "gaze", reg: cuProv ? "r2500" : sim.reg, prov: pv, cil: pv === "rateu" ? sim.cilR : undefined, CO: g.CO, CO2: g.CO2, HC: g.HC, O2: g.O2, lam, stft, ltft, n }, celule: cel });
  if (ok) msg(`Tabelul ${cuProv ? "4.3" : "4.2"} (${cuProv ? NUME_PROV[pv] : sim.reg === "ralanti" ? "ralanti" : "2500 rot/min"}): CO ${fx(g.CO, 2)} %, CO₂ ${fx(g.CO2, 1)} %, HC ${g.HC} ppm, O₂ ${fx(g.O2, 2)} %, λ ${fx(lam, 3)}, STFT ${fx(stft, 1)} %, LTFT ${fx(ltft, 1)} %.`);
}
function inregDiag(e) {
  const v = $("#sel-diag").value; if (!v) return Cadru.mesajTemporar("Alegeți defectul.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "diag", v }, celule: [{ t: "t44", r: "d", c: "cauza", v }] });
  if (ok) msg(`Tabelul 4.4: ${v}.`);
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaDA4(D) {
  const t = D.t, o = MD.prelucreaza(t, { num }), cel = { t41: {}, t42: {}, t43: {} }, rele = { t41: {}, t42: {}, t43: {} };
  const v = (r, c) => num(t.t41[r][c]), pc = v("contact", "p");
  const dif = r => v(r, "p") - v(r, "pcol") / 100;
  cel.t41.contact = { dif: fx(dif("contact"), 2), presc: "2,8…3,2 bar", concl: Number.isFinite(pc) ? (pc >= 2.8 && pc <= 3.2 ? "în limite" : "în afara limitelor – pompa / regulatorul") : "" };
  rele.t41.contact = { concl: Number.isFinite(pc) && (pc < 2.8 || pc > 3.2) };
  const dd = dif("contact") - dif("ralanti");
  cel.t41.ralanti = { dif: fx(dif("ralanti"), 2), presc: "p_r − p_col = const. (Δ ≤ 0,1 bar)", concl: Number.isFinite(dd) ? (Math.abs(dd) <= 0.1 ? `Δ = ${fx(dd, 2)} bar – regulatorul urmărește p_col` : `Δ = ${fx(dd, 2)} bar – regulatorul nu urmărește p_col`) : "" };
  rele.t41.ralanti = { concl: Number.isFinite(dd) && Math.abs(dd) > 0.1 };
  const fv = v("faravac", "p");
  cel.t41.faravac = { dif: fx(dif("faravac"), 2), presc: "≈ p_r la contact", concl: Number.isFinite(fv) && Number.isFinite(pc) ? (Math.abs(fv - pc) <= 0.1 ? "crește la valoarea nominală – regulator bun" : "diferă de valoarea nominală") : "" };
  const p5 = v("dupa5", "p");
  cel.t41.dupa5 = { dif: "", presc: "≥ 2,0 bar", concl: Number.isFinite(p5) ? (p5 >= 2.0 ? "se menține" : "scade repede – supapa de reținere sau un injector neetanș") : "" };
  rele.t41.dupa5 = { concl: Number.isFinite(p5) && p5 < 2.0 };
  const Q = o.Qp;
  cel.t41.debit = { dif: Number.isFinite(Q) ? `Q_p = ${fx(Q, 2)} l/min` : "", presc: "≥ 1,45 l/min", concl: Number.isFinite(Q) ? (Q >= 1.45 ? "debit suficient" : "debit insuficient – filtru colmatat / pompă uzată") : "" };
  rele.t41.debit = { concl: Number.isFinite(Q) && Q < 1.45 };
  RG.forEach(k => { const l = o.lam[k]; cel.t42[k] = { lamC: fx(l, 3) }; rele.t42[k] = { lamC: Number.isFinite(l) && Math.abs(l - 1) > 0.03 }; });
  PROV.forEach(k => { cel.t43[k] = { lamC: fx(o.lam[k], 3) }; });
  const rez = [
    ["Δ(p<sub>r</sub> − p<sub>col</sub>) între contact și ralanti (4.6)", Number.isFinite(dd) ? `${fx(dd, 2)} bar` : "—"],
    ["Debitul pompei Q<sub>p</sub> = V/t (4.2)", Number.isFinite(Q) ? `${fx(Q, 2)} l/min (minim 1,45)` : "—"],
    ["λ calculat (Brettschneider) – ralanti / 2500 rot/min", `${fx(o.lam.ralanti, 3)} / <span style='color:var(--accent)'>${fx(o.lam.r2500, 3)}</span>`],
    ["λ calculat – aer fals / rateu / presiune mare", `${fx(o.lam.aer, 3)} / ${fx(o.lam.rateu, 3)} / ${fx(o.lam.pres, 3)}`],
    ["Limita la inspecția tehnică (turație ridicată)", "λ = 0,97…1,03; CO ≤ 0,2 % vol"]
  ];
  const verdicte = [];
  const l25 = o.lam.r2500, co25 = num(t.t42.r2500.CO);
  if (Number.isFinite(l25)) verdicte.push(l25 >= 0.97 && l25 <= 1.03 && co25 <= 0.2 ? { tip: "ok", text: `La 2500 rot/min λ = ${fx(l25, 3)} și CO = ${fx(co25, 2)} %: motorul trece testul de emisii al inspecției tehnice.` } : { tip: "atentie", text: `La 2500 rot/min λ = ${fx(l25, 3)}, CO = ${fx(co25, 2)} %: în afara limitelor ITP.` });
  const lt = num(t.t42.ralanti.ltft);
  if (Number.isFinite(lt) && Math.abs(lt) > 8) verdicte.push({ tip: "atentie", text: `LTFT la ralanti = ${fx(lt, 1)} %: ECU compensează permanent un ${lt > 0 ? "amestec sărac (aer fals, presiune / debit mic)" : "amestec bogat (presiune mare, injector care picură)"}.` });
  if (Number.isFinite(o.lam.rateu) && o.lam.rateu > 1.02) verdicte.push({ tip: "ok", text: `La rateu λ calculat = ${fx(o.lam.rateu, 3)} > 1 este „fals”: oxigenul provine din cilindrul fără ardere, nu dintr-un exces de aer.` });
  // graficul: presiunea relativă din rampă în funcție de p_col (Fig. 4.2 cu valorile proprii)
  const patm = v("contact", "pcol"), serii = [];
  if (Number.isFinite(pc) && Number.isFinite(patm)) serii.push({ tip: "linie", pts: [[20, pc - (patm - 20) / 100], [105, pc - (patm - 105) / 100]], culoare: 0, punctat: true });
  [["contact", 0], ["ralanti", 1], ["faravac", 2]].forEach(([k, c]) => { const x = v(k, "pcol"), y = v(k, "p"); if (Number.isFinite(x) && Number.isFinite(y)) serii.push({ tip: "pct", pts: [[x, y]], culoare: c, r: 6 }); });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Presiunea relativă din rampă în funcție de presiunea din colector (Fig. 4.2 cu valorile proprii)",
    grafic: { xmin: 20, xmax: 105, ymin: 1.5, ymax: 3.5, xticks: [20, 30, 40, 50, 60, 70, 80, 90, 100], yticks: [1.5, 2, 2.5, 3, 3.5], xlab: "p_col [kPa] (absolută)", ylab: "p_r [bar] (relativă)", serii },
    legenda: [["regulator ideal: p_r − p_col = const.", "var(--serie-0)"], ["contact pus", "var(--serie-0)", "pct"], ["ralanti", "var(--serie-1)", "pct"], ["fără vacuum la regulator", "var(--serie-2)", "pct"]],
    principal: { eticheta: "λ 2500 rot/min", valoare: Number.isFinite(l25) ? +l25.toFixed(3) : null }
  };
}

/* ------------------------------------------------------------------ conținut didactic */
const FR2 = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Benzina este inflamabilă: racordurile trusei de presiune se montează cu motorul oprit, după depresurizarea sistemului (siguranța pompei scoasă, motorul pornit până la oprire); scurgerile se colectează cu material absorbant.</li>
<li>Fumatul, flacăra deschisă și sculele care produc scântei sunt interzise lângă stand; extinctorul cu pulbere sau CO₂ trebuie să fie la îndemână.</li>
<li>Combustibilul colectat la testul de debit se păstrează numai în vase închise și etichetate și se returnează în rezervor la indicația cadrului didactic.</li>
<li>Gazele de evacuare se evacuează prin instalația de exhaustare; sonda analizorului se introduce minimum 30 cm în țeava de evacuare și se manevrează cu mănuși (țeava depășește 200 °C).</li>
<li>Defectele provocate (furtun desprins, injector decuplat) se mențin cel mult 1–2 minute, pentru a nu supraîncălzi catalizatorul.</li></ul></div>
<h2>4.1. Scopul lucrării</h2>
<p>Verificarea pompei de combustibil și a regulatorului de presiune (presiune, debit, menținerea presiunii); măsurarea compoziției gazelor de evacuare la ralanti și la turație ridicată; calculul coeficientului λ din concentrații și corelarea lui cu semnalul sondei λ și cu corecțiile de amestec; recunoașterea tiparului de emisii al unor defecte tipice.</p>
<h2>4.2. Noțiuni teoretice</h2>
<p>Alimentarea se diagnostichează indirect, prin compoziția gazelor și corecțiile de amestec, sau pe componente: pompă și regulator, injectoare, senzor de sarcină. Înainte se verifică etanșeitatea camerelor de ardere (lucrarea 3), aprinderea și alimentarea electrică, iar motorul se aduce la temperatura normală. Motorul K7J are injecție indirectă multipunct, cu injectoare în colectorul de admisie.</p>
<figure><img src="img/fig4_1.jpg" alt="Fig. 4.1 Sistemul de alimentare cu retur și punctele de măsură" loading="lazy"><figcaption>Fig. 4.1. Sistemul de alimentare cu retur și punctele de măsură</figcaption></figure>
<p>La sistemele cu retur, regulatorul de pe rampă este comandat de presiunea din colector, astfel încât diferența dintre presiunea combustibilului și presiunea din colector rămâne constantă (Fig. 4.2). La ralanti presiunea relativă din rampă scade; dacă furtunul regulatorului se deconectează, presiunea urcă la valoarea nominală și nu mai variază cu regimul. La sistemele fără retur regulatorul este în modulul pompei, iar presiunea este constantă.</p>
<div class="ec"><span>p<sub>r</sub> − p<sub>col</sub> = const.</span><span class="nr">(4.1)</span></div>
<div class="ec"><span>Q<sub>p</sub> = ${FR2("V", "t")} &nbsp; [l/min]</span><span class="nr">(4.2)</span></div>
<figure><img src="img/fig4_2.jpg" alt="Fig. 4.2" loading="lazy"><figcaption>Fig. 4.2. Presiunea relativă din rampă în funcție de presiunea absolută din colector</figcaption></figure>
<p>Coeficientul excesului de aer λ este raportul dintre masa de aer reală și masa de aer teoretic necesară arderii complete (L<sub>0</sub> ≈ 14,7 kg aer/kg benzină). Catalizatorul cu trei căi reduce simultan CO, HC și NOₓ numai într-o fereastră îngustă în jurul valorii λ = 1 (Fig. 4.3), de aceea sonda λ și ECU mențin amestecul în această fereastră.</p>
<div class="ec"><span>λ = ${FR2("m<sub>a</sub>", "L<sub>0</sub>·m<sub>c</sub>")}</span><span class="nr">(4.3)</span></div>
<figure><img src="img/fig4_3.jpg" alt="Fig. 4.3" loading="lazy"><figcaption>Fig. 4.3. Eficiența de conversie a catalizatorului cu trei căi în funcție de λ</figcaption></figure>
<p>Analizorul măsoară CO, CO₂ și HC prin absorbție în infraroșu și O₂ cu un senzor electrochimic, iar λ se calculează cu formula Brettschneider (concentrațiile în % vol, HC în ppm echivalent n-hexan; H<sub>cv</sub> = 1,7261 și O<sub>cv</sub> = 0,0176 sunt rapoartele atomice H/C și O/C ale benzinei, K<sub>1</sub> = 6·10⁻⁴):</p>
<div class="ec"><span>λ = ${FR2("[CO₂] + [CO]/2 + [O₂] + (H<sub>cv</sub>/4 · 3,5/(3,5 + [CO]/[CO₂]) − O<sub>cv</sub>/2)·([CO₂] + [CO])", "(1 + H<sub>cv</sub>/4 − O<sub>cv</sub>/2)·([CO₂] + [CO] + K<sub>1</sub>·[HC])")}</span><span class="nr">(4.4)</span></div>
<p>Tiparul emisiilor pentru defectele tipice (motor cald): amestec bogat – CO crește, O₂ scade, λ &lt; 1, corecții negative; aer fals după senzorul de sarcină – O₂ crește, λ &gt; 1, corecții pozitive; rateuri – HC crește mult, O₂ crește, λ calculat &gt; 1 „fals” (oxigenul nears nu provine din exces de aer); scăpări în evacuare înaintea sondei – O₂ crește, λ &gt; 1 fals, corecții pozitive. Un motor în stare bună are CO ≈ 0, HC foarte mic, O₂ ≈ 0…0,5 %, CO₂ &gt; 14 % și λ = 1 ± 0,03.</p>
<p>Corelarea dintre analizor și ECU se urmărește pe semnalul sondei λ amonte (Fig. 4.4): sonda funcțională comută rapid între amestec bogat și sărac, iar sonda îmbătrânită comută lent și cu amplitudine mică.</p>
<figure><img src="img/fig4_4.jpg" alt="Fig. 4.4" loading="lazy"><figcaption>Fig. 4.4. Semnalul sondei λ amonte pe osciloscop: sondă funcțională (CH1) și sondă îmbătrânită (CH2) (1 s/div, 200 mV/div)</figcaption></figure>
<p>La inspecția tehnică, pentru motoarele cu aprindere prin scânteie cu catalizator și sondă λ, testul se face la ralanti și la turație ridicată (≥ 2000 rot/min), cu motorul cald; la turație ridicată λ trebuie să fie între 0,97 și 1,03, iar CO sub limitele din Directiva 2014/45/UE și RNTR 1 (tipic 0,3 % vol la ralanti și 0,2 % vol la turație ridicată). Consumul orar Q<sub>h</sub> (kg/h) și consumul specific c<sub>e</sub> caracterizează economicitatea:</p>
<div class="ec"><span>c<sub>e</sub> = ${FR2("1000·Q<sub>h</sub>", "P<sub>e</sub>")} &nbsp; [g/kWh]</span><span class="nr">(4.5)</span></div>
<h2>4.4. Modul de lucru (în simulator)</h2>
<p>Urmați pașii din panoul „Desfășurarea lucrării”: pregătirea și analizorul, presiunea combustibilului (contact, ralanti, fără vacuum), menținerea presiunii 5 minute, debitul pompei 60 s, gazele la ralanti și la 2500 rot/min, trei defecte provocate și diagnosticul defectului ascuns al motorului vostru.</p>
<h2>4.7. Interpretarea rezultatelor</h2>
<ul><li>Presiune corectă la contact, dar care scade repede după oprire → supapa de reținere a pompei sau un injector neetanș.</li>
<li>Presiune care nu variază cu presiunea din colector → regulator blocat sau furtun de vacuum desprins ori fisurat.</li>
<li>λ măsurat de analizor diferit de λ „văzut” de ECU (corecții mari, sondă care indică altceva) → scăpări în evacuare, sondă îmbătrânită sau aer fals în traseul de prelevare.</li>
<li>HC mult crescut cu O₂ ridicat → combustibil nears din cauza rateurilor; rateurile repetate distrug catalizatorul.</li>
<li>Corecții pozitive mari și λ &gt; 1 → aer fals; corecții negative și λ &lt; 1 → amestec bogat (presiune mare, injector care picură).</li></ul>
<h2>4.8. Relevanță practică</h2>
<p>Analiza gazelor și corelarea ei cu datele ECU se folosesc la inspecția tehnică, în service și la validarea calibrărilor. Metodele de inspecție se schimbă: mai multe state măsoară deja numărul de particule la motoarele diesel, iar Euro 7 (Regulamentul (UE) 2024/1257) introduce monitorizarea emisiilor la bord (OBM), cu date accesibile prin priza OBD.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>La contact pus p<sub>r</sub> = 3,0 bar (p<sub>col</sub> = 100 kPa), la ralanti p<sub>r</sub> = 2,35 bar (p<sub>col</sub> = 35 kPa); în 60 s se colectează 1,7 l; gazele la 2500 rot/min: CO = 0,20 %, CO₂ = 14,8 %, O₂ = 0,25 %, HC = 40 ppm.</p>
<div class="ec"><span>Δ(p<sub>r</sub> − p<sub>col</sub>) = (3,0 − 1,00) − (2,35 − 0,35) = 0 bar</span><span class="nr">(4.6)</span></div>
<div class="ec"><span>Q<sub>p</sub> = 1,7/1 = 1,7 l/min ≥ 1,45 l/min</span><span class="nr">(4.7)</span></div>
<div class="ec"><span>λ = ${FR2("14,8 + 0,1 + 0,25 + (0,4315·0,9962 − 0,0088)·15,0", "1,4227·(15,0 + 0,024)")} ≈ 1,004</span><span class="nr">(4.8)</span></div>
<p>Cu aceeași formulă, pentru aerul fals provocat (CO = 0,05 %, CO₂ = 13,6 %, O₂ = 1,9 %, HC = 60 ppm) rezultă λ ≈ 1,09, iar pentru rateu (CO = 0,30 %, CO₂ = 12,9 %, O₂ = 2,4 %, HC = 900 ppm) λ ≈ 1,07 – valoare „falsă”, deoarece oxigenul provine din amestecul nears.</p>
<div class="problema"><h3>Problema 1 (întrebarea 6 din îndrumar)</h3><p>Calculați λ pentru CO = 1,8 %, CO₂ = 13,9 %, O₂ = 0,15 %, HC = 180 ppm și interpretați rezultatul.</p>
<details class="sol"><summary>Rezolvare</summary><p>[CO]/[CO₂] = 0,1295; 3,5/3,6295 = 0,9643; numărătorul: 13,9 + 0,9 + 0,15 + (0,4315·0,9643 − 0,0088)·15,7 = 14,95 + 6,395 = 21,35; numitorul: 1,4227·(15,7 + 0,108) = 22,49; λ ≈ 0,949. Amestec bogat (≈ 5 %): CO mare, O₂ mic; cauze – presiune mare (regulator), injector care picură, senzor de sarcină / temperatură eronat. Corecțiile ECU ar trebui să fie negative.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Regulatorul menține p<sub>r</sub> − p<sub>col</sub> = 3,0 bar (presiune relativă la contact 3,0 bar, p<sub>atm</sub> = 101 kPa). Ce presiune relativă trebuie să indice manometrul la ralanti, cu p<sub>col</sub> = 33 kPa? Dar cu furtunul regulatorului deconectat?</p>
<details class="sol"><summary>Rezolvare</summary><p>p<sub>r</sub> = 3,0 − (101 − 33)/100 = 2,32 bar. Fără vacuum regulatorul „vede” presiunea atmosferică: p<sub>r</sub> = 3,0 bar. Diferența de presiune pe injector crește de la 3,0 la 3,68 bar, iar debitul injectorului (∝ √Δp) crește cu √(3,68/3,0) − 1 ≈ 11 % → amestec bogat, corecții negative.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Un motor consumă la sarcină parțială 4,2 kg/h de benzină și dezvoltă 15 kW. Care este consumul specific? Câtă benzină trimite pompa înapoi prin retur dacă debitează 1,7 l/min (ρ = 0,74 kg/l)?</p>
<details class="sol"><summary>Rezolvare</summary><p>c<sub>e</sub> = 1000·4,2/15 = 280 g/kWh. Pompa debitează 1,7·60·0,74 = 75,5 kg/h, deci prin retur se întorc ≈ 71 kg/h – sistemul cu retur răcește combustibilul și menține presiunea, dar încălzește benzina din rezervor (vapori, de aceea sistemele moderne sunt fără retur).</p></details></div>`;
}
const INTREBARI = [
  ["De ce presiunea din rampă este mai mică la ralanti decât cu contactul pus, la un sistem cu retur?", "Regulatorul este comandat de presiunea din colector: la ralanti p<sub>col</sub> este mică (≈ 35 kPa abs.), membrana regulatorului deschide mai mult returul, iar p<sub>r</sub> scade astfel încât p<sub>r</sub> − p<sub>col</sub> rămâne constantă. Debitul injectorului depinde doar de durata injecției."],
  ["Ce indică o presiune care scade rapid după oprirea motorului?", "Supapa de reținere a pompei neetanșă (combustibilul se întoarce în rezervor), un injector care picură sau regulatorul neetanș. Se izolează prin strângerea succesivă a conductelor de tur și retur."],
  ["Definiți λ. De ce catalizatorul cu trei căi funcționează eficient doar în jurul valorii λ = 1?", "λ = m<sub>a</sub>/(L<sub>0</sub>·m<sub>c</sub>). Oxidarea CO și HC cere oxigen (λ ≥ 1), reducerea NOₓ cere lipsa lui (λ ≤ 1); numai în fereastra îngustă din jurul lui λ = 1 (cu stocarea de oxigen a ceriului) ambele reacții au loc simultan."],
  ["Cum arată gazele de evacuare la un rateu și de ce λ calculat este „fals”?", "HC crește mult (combustibil nears / film de pe pereți), O₂ crește (aerul cilindrului fără ardere), CO₂ scade. λ calculat > 1, deși amestecul cilindrilor care ard nu este sărac – oxigenul nu provine dintr-un exces de aer."],
  ["Ce semn au corecțiile de amestec la un aer fals și de ce?", "Pozitive: aerul nemăsurat sărăcește amestecul, sonda λ indică sărac, iar ECU mărește durata injecției (STFT imediat, LTFT prin adaptare)."],
  ["Calculați λ pentru CO = 1,8 %, CO₂ = 13,9 %, O₂ = 0,15 %, HC = 180 ppm și interpretați rezultatul.", "λ ≈ 0,95 – amestec bogat (vezi Problema 1)."],
  ["Ce este monitorizarea emisiilor la bord (OBM) introdusă de Euro 7?", "Supravegherea continuă, de către calculatorul vehiculului, a emisiilor reale (cu senzori și modele), cu memorarea depășirilor și accesul la date prin priza OBD – pentru inspecție și supravegherea pieței."]
];
const TEST = [
  { q: "La un sistem cu retur, cu furtunul regulatorului deconectat, presiunea din rampă la ralanti:", o: ["scade", "crește la valoarea nominală", "rămâne cea de la ralanti", "devine zero"], c: 1, e: "Regulatorul vede presiunea atmosferică și menține p<sub>r</sub> nominală." },
  { q: "Un motor sănătos, cald, la 2500 rot/min are tipic:", o: ["CO 2 %, O₂ 0 %", "CO ≈ 0, CO₂ > 14 %, O₂ < 0,5 %, λ ≈ 1", "HC 900 ppm, O₂ 2,4 %", "CO₂ 10 %, λ 1,2"], c: 1, e: "Catalizatorul la λ ≈ 1 oxidează CO și HC aproape complet." },
  { q: "Corecții negative mari și λ < 1 indică:", o: ["aer fals", "amestec bogat (presiune mare, injector care picură)", "rateuri", "evacuare spartă"], c: 1, e: "ECU scade durata injecției pentru că sonda indică bogat." },
  { q: "HC foarte mare cu O₂ ridicat și λ calculat > 1 indică:", o: ["amestec sărac", "rateuri (combustibil nears)", "presiune mare", "catalizator nou"], c: 1, e: "λ calculat este „fals”: oxigenul provine din cilindrul fără ardere." },
  { q: "Sonda λ amonte îmbătrânită se recunoaște prin:", o: ["tensiune constantă 0,45 V", "comutare lentă, amplitudine mică", "tensiune > 1 V", "comutare de 10 Hz"], c: 1, e: "Sonda bună comută 0,1…0,8 V la ≈ 1 Hz (Fig. 4.4)." },
  { q: "Debitul minim al pompei (K7J, retur) este:", o: ["0,5 l/min", "≥ 1,45 l/min", "10 l/min", "nu se verifică"], c: 1, e: "Valoarea minimă admisă; un debit mic indică filtru colmatat sau pompă uzată." }
];

/* ------------------------------------------------------------------ 3D și stil */
const SV = { m3d: null };
function porneste3D() {
  const el = $("#motor3d"); if (!el) return;
  import(BAZA_COMUN + "motor3d.js?v=15").then(m => { SV.m3d = m.creeazaStand(el, { etichete: { inj1: "inj. 1", inj2: "inj. 2", inj3: "inj. 3", inj4: "inj. 4", map: "MAP", reg: "regulator", l1: "sonda λ amonte", l2: "sonda λ aval" }, onSelect: () => {} }); })
    .catch(e => { el.innerHTML = `<p class="nota">Modelul 3D nu a putut fi încărcat (${esc(e.message)}).</p>`; });
}
const CSS = `<style>
.da4-scena #motor3d .m3d { height:300px; }
.da4-afis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.da4-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .da4-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .da4-afis b { font-size:1.05rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; }
.instr svg { width:100%; height:auto; display:block; color:var(--text); }
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
.pas-ctl .camp { margin:.35rem 0; }
.sim-grila:fullscreen .da4-scena, .sim-grila.ecran-plin .da4-scena { display:block; }
@media (max-width:900px){ .da4-afis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>`;

/* ------------------------------------------------------------------ definiția lucrării */
Cadru.porneste({
  disc: "DA", nr: 4, cod: "da-l4",
  titlu: "Sistemul de alimentare MAS și analiza gazelor de evacuare",
  scurt: "Alimentarea MAS și analiza gazelor",
  subtitlu: "Laborator virtual – standul K7J 1.4 MPI: presiunea și debitul combustibilului, analizorul de gaze AVL, testerul X431",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261024); },
  date: [{ k: "L0", et: "L<sub>0</sub> [kg aer/kg benzină]", v: 14.7, fix: true }, { k: "Hcv", et: "H<sub>cv</sub> (H/C)", v: 1.7261, fix: true }, { k: "Ocv", et: "O<sub>cv</sub> (O/C)", v: 0.0176, fix: true }, { k: "K1", et: "K<sub>1</sub>", v: 0.0006, fix: true }],
  tabele: [
    { id: "t41", titlu: "Tabelul 4.1. Presiunea și debitul combustibilului", antetRand: "Mărime",
      randuri: [{ k: "contact", et: "p<sub>r</sub> la punerea contactului [bar]" }, { k: "ralanti", et: "p<sub>r</sub> la ralanti [bar]" }, { k: "faravac", et: "p<sub>r</sub> fără vacuum la regulator [bar]" }, { k: "dupa5", et: "p<sub>r</sub> după 5 min de la oprire [bar]" }, { k: "debit", et: "V colectat în 60 s [l]" }],
      coloane: [{ k: "p", t: "Valoare măsurată", intrare: true }, { k: "pcol", t: "p<sub>col</sub> [kPa]", intrare: true }, { k: "dif", t: "p<sub>r</sub> − p<sub>col</sub> [bar] / Q<sub>p</sub>" }, { k: "presc", t: "Valoare prescrisă" }, { k: "concl", t: "Concluzie" }] },
    { id: "t42", titlu: "Tabelul 4.2. Gazele de evacuare – motor în stare normală", antetRand: "Regim",
      randuri: [{ k: "ralanti", et: "Ralanti" }, { k: "r2500", et: "≈ 2500 rot/min" }],
      coloane: [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "CO", t: "CO [% vol]", intrare: true }, { k: "CO2", t: "CO₂ [% vol]", intrare: true }, { k: "HC", t: "HC [ppm]", intrare: true }, { k: "O2", t: "O₂ [% vol]", intrare: true }, { k: "lamA", t: "λ analizor", intrare: true }, { k: "lamC", t: "λ calculat (4.4)" }, { k: "stft", t: "STFT [%]", intrare: true }, { k: "ltft", t: "LTFT [%]", intrare: true }] },
    { id: "t43", titlu: "Tabelul 4.3. Gazele de evacuare – defecte provocate (≈ 2500 rot/min)", antetRand: "Defect",
      randuri: [{ k: "aer", et: "Aer fals" }, { k: "rateu", et: "Rateu cilindru" }, { k: "pres", et: "Presiune mare" }],
      coloane: [{ k: "CO", t: "CO [%]", intrare: true }, { k: "CO2", t: "CO₂ [%]", intrare: true }, { k: "HC", t: "HC [ppm]", intrare: true }, { k: "O2", t: "O₂ [%]", intrare: true }, { k: "lamA", t: "λ analizor", intrare: true }, { k: "lamC", t: "λ calculat" }, { k: "stft", t: "STFT [%]", intrare: true }, { k: "ltft", t: "LTFT [%]", intrare: true }, { k: "expl", t: "Explicație", intrare: true, tip: "select", optiuni: MD.EXPLICATII, manualEval: true }] },
    { id: "t44", titlu: "Tabelul 4.4. Diagnosticul defectului ascuns", antetRand: "",
      randuri: [{ k: "d", et: "Defectul" }],
      coloane: [{ k: "cauza", t: "Defectul identificat", intrare: true, tip: "select", optiuni: MD.optiuniDiag(), manualEval: true }] }
  ],
  inaltimeGrafic: 300,
  calculeaza: calculeazaDA4,
  intrebari() {
    return [
      { id: "q1", u: "bar", text: "Variația Δ(p<sub>r</sub> − p<sub>col</sub>) între contact și ralanti, din Tabelul 4.1 al vostru (relația 4.6):", textSimplu: "Δ(pr − pcol) între contact și ralanti" },
      { id: "q2", u: "l/min", text: "Debitul pompei Q<sub>p</sub> măsurat de voi:", textSimplu: "Debitul pompei Qp" },
      { id: "q3", u: "", text: "λ calculat cu formula Brettschneider la ≈ 2500 rot/min, motor normal (Tabelul 4.2):", textSimplu: "λ calculat la 2500 rot/min (motor normal)" },
      { id: "q4", u: "", text: "λ calculat cu formula Brettschneider la rateul provocat (Tabelul 4.3):", textSimplu: "λ calculat la rateu (Tabelul 4.3)" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    ["contact", "ralanti", "faravac", "dupa5", "debit"].forEach(k => { if (t.t41[k].p === "") l.push(`Tabelul 4.1: ${{ contact: "presiunea la contact", ralanti: "presiunea la ralanti", faravac: "presiunea fără vacuum", dupa5: "presiunea după 5 min", debit: "debitul pompei" }[k]}`); });
    RG.forEach(k => { if (t.t42[k].CO === "") l.push(`Tabelul 4.2: ${k === "ralanti" ? "ralanti" : "2500 rot/min"}`); });
    PROV.forEach(k => { if (t.t43[k].CO === "") l.push(`Tabelul 4.3: ${NUME_PROV[k]}`); });
    if (t.t44.d.cauza === "") l.push("Tabelul 4.4: diagnosticul");
    return l;
  },
  exemplu(D) {
    const t = D.t;
    Object.assign(t.t41.contact, { p: "3.00", pcol: "100.0" }); Object.assign(t.t41.ralanti, { p: "2.35", pcol: "35.0" }); Object.assign(t.t41.faravac, { p: "3.00", pcol: "35.0" }); t.t41.dupa5.p = "2.70"; t.t41.debit.p = "1.70";
    Object.assign(t.t42.r2500, { n: "2500", CO: "0.20", CO2: "14.8", HC: "40", O2: "0.25", lamA: "1.004", stft: "1.0", ltft: "0.5" });
    Object.assign(t.t43.aer, { CO: "0.05", CO2: "13.6", HC: "60", O2: "1.90", lamA: "1.093" }); Object.assign(t.t43.rateu, { CO: "0.30", CO2: "12.9", HC: "900", O2: "2.40", lamA: "1.074" });
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Motorul în autoturism – injectoarele, sondele λ și catalizatorul",
    intro: `<p>Pe autoturism, ECU menține amestecul la λ = 1 cu ajutorul sondei λ amonte; sonda aval supraveghează catalizatorul (semnal aproape constant când catalizatorul stochează oxigen). Porniți motorul și urmăriți pe osciloscop sonda λ amonte (CH1) și comanda injectorului 1 (CH2): la accelerare amestecul se îmbogățește, la decelerare injecția se întrerupe și sonda indică sărac.</p>`,
    dupa: `<p class="nota">Macheta este comună cu celelalte lucrări; semnalele sunt tipice, nu cele ale motorului vostru individual.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "l1", canale: ["inj1"] })
  },
  referat: {
    scop: "Verificarea pompei de combustibil și a regulatorului de presiune, măsurarea compoziției gazelor de evacuare, calculul λ cu formula Brettschneider, corelarea cu corecțiile de amestec ale ECU și diagnosticul unui defect al sistemului de alimentare.",
    relatii: "p<sub>r</sub> − p<sub>col</sub> = const.; &nbsp; Q<sub>p</sub> = V/t; &nbsp; λ = m<sub>a</sub>/(L<sub>0</sub>·m<sub>c</sub>); &nbsp; λ Brettschneider (4.4); &nbsp; c<sub>e</sub> = 1000·Q<sub>h</sub>/P<sub>e</sub>.",
    varianta: () => "Motorul propriu fiecărui student: presiunea nominală a regulatorului, presiunea din colector, debitul pompei, adaptarea amestecului, eficiența catalizatorului și un defect ascuns al sistemului de alimentare.",
    indicatii: "Comentați presiunile și diferența p_r − p_col, menținerea presiunii și debitul, comparați gazele și λ cu limitele ITP, explicați tiparul fiecărui defect provocat și justificați diagnosticul defectului ascuns…"
  },
  subsol: "Modelul: regulator comandat de presiunea din colector (sistem cu retur), menținerea presiunii după oprire, debitul pompei, ardere cu echilibrul apă–gaz (K = 3,5), catalizator limitat de oxigen, bucla închisă a ECU (STFT/LTFT), λ calculat cu formula Brettschneider. Fiecare student are motorul propriu și un defect ascuns al sistemului de alimentare.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena da4-scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="motor3d"><p class="nota">Se încarcă motorul 3D…</p></div>
      <div class="da4-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>Turație [rot/min]</span><b id="af-n">0</b></div><div><span>Lichid / ulei [°C]</span><b id="af-T">—</b></div><div><span>Presiune rampă [bar]</span><b id="af-p">—</b></div><div><span>Defect provocat</span><b id="af-prov">—</b></div></div>
      <div class="instr" data-panou="prep"><h3>Pregătirea standului și a analizorului</h3><svg id="svg-avl0" data-pre="av0" viewBox="0 0 1000 330" role="img" aria-label="Analizorul de gaze"></svg><p class="nota">Analizorul are nevoie de încălzire, de testul de etanșeitate al traseului de prelevare și de aducerea la zero cu aer curat înainte de orice măsurare.</p></div>
      <div class="instr" data-panou="pres" hidden><h3>Trusa de presiune pe turul de combustibil</h3><svg id="svg-pres" viewBox="0 0 860 300" role="img" aria-label="Rampa de combustibil, regulatorul, adaptorul în T și manometrul"></svg></div>
      <div class="instr" data-panou="debit" hidden><h3>Debitul pompei – vasul gradat pe retur</h3><svg id="svg-debit" viewBox="0 0 820 300" role="img" aria-label="Vasul gradat, cronometrul și testul activ X431"></svg></div>
      <div class="instr" data-panou="gaze" hidden><h3>Analizorul de gaze AVL și testerul X431</h3><svg id="svg-avl" viewBox="0 0 1000 330" role="img" aria-label="Analizorul de gaze AVL"></svg><svg id="svg-x431" viewBox="0 0 820 330" role="img" aria-label="Testerul Launch X431 – date live" style="margin-top:.5rem"></svg></div>
      <div class="instr" data-panou="diag" hidden><h3>Rezumatul măsurărilor</h3><div id="rezumat" class="tabel-scroll"></div></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari" data-doar-demo><summary>Defectul (mod demonstrativ)</summary><p class="nota" id="def-demo"></p></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiestePasi();
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      $("#def-demo").textContent = MD.eticheta(P().defect);
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval() { const d = $("#def-demo"); if (d) d.textContent = ""; },
    reset() { Object.assign(sim, { contact: false, merge: false, rpm: 0, prov: "", regFurtun: true }); sim.man = { depres: false, montat: false, tPrime: -99, tOprit: null, p: 0, pAf: 0 }; sim.deb = { retur: false, activ: false, t: 0, V: 0 }; },
    cadru(dt0, C, vizibil) {
      const dt = Math.min(0.05, dt0 || 0.016) * (sim.rapid ? 10 : 1), p = P();
      sim.t += dt;
      if (sim.avl.pornit) sim.avl.tInc += dt;
      if (sim.merge) { sim.tReg += dt; if (provActiv()) sim.tProv += dt; }
      const nT = sim.merge ? (sim.reg === "r2500" ? 2500 : p.nRal) : 0;
      sim.rpm += (nT - sim.rpm) * (1 - Math.exp(-dt / 0.5));
      // presiunea din rampă (manometrul cu glicerină, amortizat)
      const pT = sim.man.montat ? pAdevarat() : 0;
      sim.man.pAf += (pT - sim.man.pAf) * (1 - Math.exp(-dt / 0.35)); if (sim.man.montat) sim.man.pAf += (Math.random() - 0.5) * (sim.merge ? 0.012 : 0.002);
      // debitul pompei în vasul gradat
      if (!sim.merge && sim.man.tPrime > -90 && sim.t - sim.man.tPrime > DUR_PRIME && (sim.man.tOprit === null || sim.man.tOprit < sim.man.tPrime)) sim.man.tOprit = sim.man.tPrime + DUR_PRIME;
      if (sim.deb.activ) { const d = Math.min(dt, 60 - sim.deb.t); sim.deb.V += MD.debitPompa(p) / 60 * d; sim.deb.t += d; if (sim.deb.t >= 60) { sim.deb.activ = false; sim.man.tOprit = sim.t; } }
      // gazele (răspunsul analizorului T90 ≈ 9 s) și corecțiile
      const g = tinta(), k = 1 - Math.exp(-dt / 2.5);
      const tg = sim.merge && sim.avl.sonda && avlGata() ? g : { CO: 0, CO2: 0, HC: 0, O2: 20.9 };
      ["CO", "CO2", "HC", "O2"].forEach(x => { sim.gas[x] += (tg[x] - sim.gas[x]) * k; });
      if (sim.merge && sim.avl.sonda && sim.tReg > 12) { sim.gas.CO += (Math.random() - 0.5) * 0.002; sim.gas.HC += (Math.random() - 0.5) * 0.6; sim.gas.O2 += (Math.random() - 0.5) * 0.003; }
      const sl = MD.sondaLambda(p);
      if (sim.merge) {
        const ph = Math.sin(2 * Math.PI * sl.f * (sim.reg === "r2500" ? 1 : 0.6) * sim.t), bog = g.lamMix < 0.99 ? 0.25 : g.lamMix > 1.02 ? -0.25 : 0;
        const v = cl((sl.vmin + sl.vmax) / 2 + (sl.vmax - sl.vmin) / 2 * Math.tanh(ph * (p.defect.tip === "sonda" ? 1 : 6)) + bog, 0.05, 0.9);
        sim.lamBuf.push([sim.t, v]); while (sim.lamBuf.length && sim.lamBuf[0][0] < sim.t - 11) sim.lamBuf.shift();
        sim.stftAf = g.stft + (provActiv() ? 0.6 : 1.4) * Math.sin(2 * Math.PI * sl.f * sim.t * 0.7);
      }
      if (sim.merge && provActiv() && sim.tProv > 120 && !this._av) { this._av = true; C.mesajTemporar("NSSM: defectul provocat durează de peste 2 minute – catalizatorul se supraîncălzește! Reveniți la normal.", "pericol"); }
      if (!provActiv()) this._av = false;
      if (SV.m3d) SV.m3d.seteaza({ rpm: sim.rpm, ect: sim.ect, tps: sim.merge && sim.reg === "r2500" ? 9 : 0, selectat: null, decuplat: provActiv() === "rateu" ? { ["inj" + sim.cilR]: true } : {}, vent: false, tEv: sim.merge ? 420 : 160, eticheteVizibile: true,
        teTur: sim.man.montat, regFurtun: !!sim.regFurtun, furtune: [sim.man.montat ? { k: "teTur", c: 0x23272c } : null, sim.deb && sim.deb.retur ? { k: "retur", c: 0x2f6f9e, r: 0.005 } : null].filter(Boolean) });
      if (!vizibil) return;
      const now = performance.now();
      if (now - (this._td || 0) > 150) { this._td = now; deseneazaPanou(false); if (PASI[pasActiv].panou === "prep") desenAVL0(); }
      if (now - (this._ts || 0) > 300) { this._ts = now; actualizeazaPasi();
        C.stare(1, sim.merge ? `motor pornit – ${sim.reg === "r2500" ? "≈ 2500 rot/min" : "ralanti"}` : sim.contact ? "contact pus" : "contact luat", sim.merge ? "inc" : ""); C.stare(2, `pasul ${pasActiv + 1}: ${PASI[pasActiv].t}`); }
    },
    redeseneaza() { deseneazaPanou(true); desenAVL0(); },
    formule() {
      const r = [], g = gazeAfisate();
      if (sim.man.montat && (sim.merge || sim.contact)) r.push(["Regulatorul (4.1)", `p<sub>r</sub> − p<sub>col</sub> = ${fx(sim.man.pAf, 2)} − ${fx(pColAf() / 100, 3)} = <span class="rez">${fx(sim.man.pAf - pColAf() / 100, 2)} bar</span>`]);
      if (sim.deb.t > 0) r.push(["Debitul pompei (4.2)", `Q<sub>p</sub> = ${fx(sim.deb.V, 2)} l / ${fx(sim.deb.t / 60, 2)} min = <span class="rez">${fx(sim.deb.V / Math.max(sim.deb.t / 60, 1e-6), 2)} l/min</span>`]);
      if (gazeStabile()) r.push(["λ Brettschneider (4.4)", `CO ${fx(g.CO, 2)} · CO₂ ${fx(g.CO2, 1)} · HC ${g.HC} · O₂ ${fx(g.O2, 2)} → <span class="rez">λ = ${fx(MD.brettschneider(g.CO, g.CO2, g.HC, g.O2), 3)}</span>`]);
      return r;
    }
  }
});
/** analizorul în pasul de pregătire (același desen, alt element) */
function desenAVL0() { const a = $("#svg-avl"), b = $("#svg-avl0"); if (!b) return; const id = a ? a.id : null; if (a) a.id = "svg-avl-tmp"; b.id = "svg-avl"; desenAVL(); b.id = "svg-avl0"; if (a) a.id = id; }
