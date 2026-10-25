/* SAA – Lucrarea 5. Sistemul de răcire și managementul termic (standul K7J 1.4 MPI).
   Simulator: macheta 3D a motorului de pe stand (aceeași ca la celelalte lucrări), transparentă / secționată, cu circuitul de răcire
   vizibil: pompa de apă, cămașa de apă, termostatul cu element de ceară în carcasa lui, circuitul mic, furtunurile, radiatorul,
   electroventilatorul, vasul de expansiune, radiatorul de încălzire; lichidul curge cu debitul și temperatura din model.
   Aparatele: vasul cu apă pe plită cu termostatul demontat, termometrul și șublerul (Tabelul 5.1); testerul OBD și termometrul cu
   infraroșu pe furtunul inferior, cronometrul (Tabelul 5.2); evenimentele electroventilatorului, camera termografică pe radiator;
   testerul de presiune pe vasul de expansiune și pe bușon (Tabelul 5.3). Panoul din dreapta conduce lucrarea pas cu pas. */
"use strict";
const MD = MODELE["saa-l5"];
function P() { return Cadru.P; }
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const fx = (v, n) => fmt(v, n);

/* ------------------------------------------------------------------ starea standului */
const sim = {
  t: 0, rapid: 1, defect: "none", manusi: false, ochelari: false, comp: {}, selectat: null,
  // vasul cu termostatul
  baie: { Tw: 60, s: 0, plita: 0 },
  // motorul
  contact: false, merge: false, rece: true, ts: 0, tOprit: null, Tstop: null, stop: null, ev: [], fanPrec: 0, obd: false, ir: false, termo: false,
  // testerul de presiune
  pres: { montat: false, p: 0, tP: null, bus: false, busDesch: false, pMax: 0 }
};
const def = () => sim.defect === "none" ? "" : sim.defect;
/** starea motorului: în funcționare după modelul de încălzire de la rece; după oprire – răcire liberă */
function motor() {
  const pr = P();
  if (sim.merge) { const s = MD.stare(pr, sim.ts, def()); return { ...s, rpm: 800 + (sim.ts < 60 ? 450 * (1 - sim.ts / 60) : 0) }; }
  if (sim.stop) { const dt = sim.t - sim.stop.t, Tm = pr.Ta + (sim.stop.Tm - pr.Ta) * Math.exp(-dt / 1200), Tr = pr.Ta + (sim.stop.Tr - pr.Ta) * Math.exp(-dt / 900);
    return { Tm, Tr, x: cl((Tm - pr.T0) / pr.dT, 0, 1), fan: sim.contact && Tm > pr.Ton - pr.hist ? 1 : 0, rpm: 0 }; }
  return { Tm: pr.Ta, Tr: pr.Ta, x: 0, fan: 0, rpm: 0 };
}
const MS = () => motor();
function coloana(ts) { const m = MD.TMIN.find(m => Math.abs(ts - m * 60) <= 15); return m == null ? null : m; }
function irCitire(Tr) { return Math.round((Tr + 0.25 * Math.sin(sim.t * 1.7)) * 10) / 10; }

/* ------------------------------------------------------------------ desenele aparatelor */
function defsInstr(P) {
  return `<defs><radialGradient id="${P}-crom" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c3c9cf"/><stop offset=".8" stop-color="#7c848c"/><stop offset="1" stop-color="#d8dde2"/></radialGradient>
    <radialGradient id="${P}-cadran" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9ebe6"/></radialGradient>
    <linearGradient id="${P}-sticla" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${P}-alama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset=".5" stop-color="#c9a043"/><stop offset="1" stop-color="#8a6a1f"/></linearGradient>
    <linearGradient id="${P}-otel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7b828a"/><stop offset=".45" stop-color="#eef1f4"/><stop offset="1" stop-color="#868d95"/></linearGradient>
    <linearGradient id="${P}-galben" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9a400"/><stop offset=".5" stop-color="#ffcf2e"/><stop offset="1" stop-color="#c79200"/></linearGradient>
    <linearGradient id="${P}-apa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3f7" stop-opacity=".75"/><stop offset="1" stop-color="#6fb3dc" stop-opacity=".85"/></linearGradient>
    <linearGradient id="${P}-geam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8f4fb" stop-opacity=".55"/><stop offset=".2" stop-color="#ffffff" stop-opacity=".15"/><stop offset=".85" stop-color="#ffffff" stop-opacity=".1"/><stop offset="1" stop-color="#cfe3ef" stop-opacity=".6"/></linearGradient>
    <linearGradient id="${P}-plita" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f55"/><stop offset="1" stop-color="#1c1f23"/></linearGradient>
    <filter id="${P}-umbra" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="2" flood-opacity=".35"/></filter></defs>`;
}
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 11}" text-anchor="${o.a || "middle"}" fill="${o.f || "currentColor"}" font-weight="${o.w || 400}"${o.fam ? ` font-family="${o.fam}"` : ""}>${s}</text>`;
function svgGauge(P, cx, cy, r, max, val, o = {}) {
  const a0 = -225, a1 = 45, ang = v => (a0 + (a1 - a0) * cl(v / max, 0, 1)) * Math.PI / 180, pt = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  const maj = o.maj || max / 10, nmin = o.nmin || 5;
  let s = `<g filter="url(#${P}-umbra)"><circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="url(#${P}-crom)" stroke="#5b6168"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${P}-cadran)"/></g>`;
  (o.benzi || []).forEach(([v0, v1, c]) => { const [x0, y0] = pt(ang(v0), r - 5), [x1, y1] = pt(ang(v1), r - 5); s += `<path d="M${x0},${y0} A${r - 5},${r - 5} 0 0 1 ${x1},${y1}" fill="none" stroke="${c}" stroke-width="6" opacity=".85"/>`; });
  const N = Math.round(max / maj * nmin);
  for (let k = 0; k <= N; k++) { const v = k * maj / nmin, a = ang(v), M = k % nmin === 0, l = M ? 10 : 5, [xa, ya] = pt(a, r - 2), [xb, yb] = pt(a, r - 2 - l);
    s += `<line x1="${xa.toFixed(1)}" y1="${ya.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="#151515" stroke-width="${M ? 1.8 : 0.9}"/>`;
    if (M) { const [xt, yt] = pt(a, r - 21); s += `<text x="${xt.toFixed(1)}" y="${(yt + 4).toFixed(1)}" font-size="${r > 55 ? 11 : 9.5}" text-anchor="middle" fill="#151515" font-weight="600">${fmt(Math.round(v * 100) / 100, Number.isInteger(maj) ? 0 : 1)}</text>`; } }
  s += txt(cx, cy + r * 0.3, o.unit || "bar", { fs: 10, w: 700, f: "#222" });
  if (o.marca) s += txt(cx, cy - r * 0.32, o.marca, { fs: 7, f: "#555" });
  if (o.max2 != null) { const [xm, ym] = pt(ang(o.max2), r - 6); s += `<line x1="${cx}" y1="${cy}" x2="${xm}" y2="${ym}" stroke="#1d4ed8" stroke-width="1.8" opacity=".85"/>`; }
  const a = ang(val), [nx, ny] = pt(a, r - 6), [kx, ky] = pt(a + Math.PI, r * 0.18);
  s += `<line x1="${kx}" y1="${ky}" x2="${nx}" y2="${ny}" stroke="#c62828" stroke-width="2.6" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r * 0.09}" fill="#1b1b1b"/>`;
  s += `<path d="M${cx - r * 0.9},${cy - r * 0.2} A${r},${r} 0 0 1 ${cx + r * 0.5},${cy - r * 0.85} L${cx + r * 0.2},${cy - r * 0.55} A${r * 0.7},${r * 0.7} 0 0 0 ${cx - r * 0.6},${cy - r * 0.05}z" fill="url(#${P}-sticla)"/>`;
  return s;
}

/* ------------------------------------------------------------------ vasul cu apă, plita, termostatul demontat, termometrul, șublerul */
const PLITA = ["oprită", "încălzire lentă (≈ 0,4 °C/min)", "încălzire rapidă"];
function desenBaie() {
  const cit = $("#baie-cit"); if (cit) cit.textContent = `Termometru: ${fx(sim.baie.Tw, 1)} °C · comparator: cursa ${fx(Math.round(sim.baie.s * 100) / 100, 2)} mm · plita: ${PLITA[sim.baie.plita]} · ${Math.abs(sim.baie.s - MD.cursa(P(), sim.baie.Tw)) < 0.05 ? "cursa stabilizată" : "elementul de ceară se dilată…"}`;
  if (SV.baie) { SV.baie.seteaza({ Tw: sim.baie.Tw, s: sim.baie.s, plita: sim.baie.plita }); return; }
  const el = $("#svg-baie"); if (!el) return; el.style.display = "";
  const Pf = "bv", B = sim.baie, pr = P(), k = 3.6, sp = B.s * k, pin = 22;   // scara: 3,6 px/mm
  let s = defsInstr(Pf);
  // stativul cu tija și sârma de suspendare
  s += `<rect x="96" y="20" width="10" height="300" rx="3" fill="url(#${Pf}-otel)"/><rect x="60" y="314" width="90" height="12" rx="3" fill="#3a3f45"/><rect x="96" y="30" width="250" height="8" rx="3" fill="url(#${Pf}-otel)"/><path d="M300,38 V112" stroke="#777" stroke-width="1.6"/>`;
  // plita electrică cu regulator
  s += `<g filter="url(#${Pf}-umbra)"><rect x="170" y="292" width="300" height="34" rx="6" fill="url(#${Pf}-plita)"/><rect x="190" y="286" width="260" height="8" rx="3" fill="${B.plita ? `rgb(${120 + 60 * B.plita},40,30)` : "#2a2d31"}"/></g>`;
  s += `<g transform="translate(448 309)"><circle r="11" fill="#16191d" stroke="#000"/><rect x="-2" y="-10" width="4" height="9" fill="#ffd36b" transform="rotate(${[-120, 0, 120][B.plita]})"/></g><circle cx="190" cy="309" r="4" fill="${B.plita ? "#ff3b1f" : "#4a1a10"}"/>${txt(318, 342, `plita: ${PLITA[B.plita]}`, { fs: 10.5 })}`;
  // vasul (pahar Berzelius 2 l) cu apă
  const yA = 92;
  s += `<path d="M200,70 L200,282 Q200,288 206,288 L434,288 Q440,288 440,282 L440,70" fill="none" stroke="#9fb6c4" stroke-width="2.5"/>`;
  s += `<path d="M201.5,${yA} L201.5,282 Q201.5,286.5 206,286.5 L434,286.5 Q438.5,286.5 438.5,282 L438.5,${yA} Z" fill="url(#${Pf}-apa)"/>`;
  for (let i = 0; i < 9; i++) s += `<line x1="430" y1="${110 + i * 20}" x2="438" y2="${110 + i * 20}" stroke="#6f8796" stroke-width="1"/>`;
  if (B.Tw > 92) for (let i = 0; i < Math.round((B.Tw - 92) * 1.5); i++) { const x = 215 + ((i * 53) % 210), y = 270 - ((i * 37 + sim.t * 40) % 170); s += `<circle cx="${x}" cy="${y}" r="${1.5 + (i % 3)}" fill="none" stroke="#e8f6ff" stroke-width="1" opacity=".8"/>`; }
  // termostatul (vedere laterală): flanșa, puntea cu știftul, talerul care coboară, capsula cu ceară, arcul, juga inferioară
  const xc = 300, yf = 150;
  s += `<path d="M${xc},112 L${xc - 8},122 M${xc},112 L${xc + 8},122" stroke="#777" stroke-width="1.4"/>`;
  s += `<path d="M${xc - 30},${yf} Q${xc - 30},${yf - 30} ${xc},${yf - 32} Q${xc + 30},${yf - 30} ${xc + 30},${yf}" fill="none" stroke="#9aa1a8" stroke-width="5"/>`;     // puntea superioară
  s += `<rect x="${xc - 56}" y="${yf - 4}" width="112" height="8" rx="2" fill="url(#${Pf}-otel)" stroke="#555"/><rect x="${xc - 6}" y="${yf - 34}" width="12" height="6" rx="1" fill="#555"/>`;   // flanșa și supapa de aerisire
  s += `<rect x="${xc - 2}" y="${yf - 30}" width="4" height="${pin + 36 + sp}" fill="url(#${Pf}-otel)"/>`;                                                     // știftul (pistonul fix în punte)
  s += `<ellipse cx="${xc}" cy="${yf + 6 + sp}" rx="40" ry="5" fill="url(#${Pf}-alama)" stroke="#6b5214"/>`;                                                  // talerul supapei
  s += `<rect x="${xc - 14}" y="${yf + 8 + sp}" width="28" height="46" rx="6" fill="url(#${Pf}-alama)" stroke="#6b5214"/><rect x="${xc - 10}" y="${yf + 52 + sp}" width="20" height="6" rx="2" fill="#8a6a1f"/>`;  // capsula cu ceară
  const yJ = yf + 78; let d = `M${xc - 24},${yf + 10 + sp}`; for (let i = 1; i <= 10; i++) d += ` L${xc + (i % 2 ? 24 : -24)},${(yf + 10 + sp + (yJ - yf - 10 - sp) * i / 10).toFixed(1)}`;
  s += `<path d="${d}" fill="none" stroke="#c6cbd0" stroke-width="2.2"/><path d="M${xc - 40},${yf + 4} L${xc - 34},${yJ} H${xc + 34} L${xc + 40},${yf + 4}" fill="none" stroke="#9aa1a8" stroke-width="4"/>`;  // arcul și juga
  s += txt(xc, yf - 42, `marcaj: ${pr.T0m} °C`, { fs: 10, f: "#1d3b4d", w: 700 });
  // sonda termometrului în apă (lângă termostat)
  s += `<path d="M560,92 C520,40 400,40 372,110" fill="none" stroke="#222" stroke-width="2"/><rect x="369" y="108" width="6" height="110" rx="3" fill="url(#${Pf}-otel)"/>`;
  s += `<g transform="translate(540 34)" filter="url(#${Pf}-umbra)"><rect width="110" height="150" rx="12" fill="url(#${Pf}-galben)" stroke="#7a5a00"/><rect x="8" y="10" width="94" height="130" rx="8" fill="#2b2f34"/><rect x="14" y="18" width="82" height="44" rx="4" fill="#a7b39b"/>
    <text x="90" y="50" text-anchor="end" font-size="23" font-family="'Courier New',monospace" font-weight="700" fill="#1d2618">${fx(B.Tw, 1)}</text><text x="20" y="30" font-size="8" font-weight="700" fill="#1d2618">°C</text>${txt(55, 128, "THERMOMETER", { fs: 8, f: "#ffcf2e", w: 700 })}</g>`;
  // șublerul de adâncime (măsoară cursa talerului față de flanșă) – lupa cu citirea
  s += `<g transform="translate(680 70)"><rect x="0" y="0" width="22" height="200" rx="2" fill="url(#${Pf}-otel)" stroke="#555"/>${Array.from({ length: 21 }, (_, i) => `<line x1="0" y1="${10 + i * 9}" x2="${i % 5 ? 6 : 11}" y2="${10 + i * 9}" stroke="#222"/>`).join("")}
    <rect x="-8" y="${60 + sp}" width="38" height="26" rx="3" fill="#cfd5db" stroke="#555"/><rect x="-60" y="${70 + sp}" width="52" height="5" fill="url(#${Pf}-otel)"/></g>`;
  s += `<path d="M${xc + 40},${yf + 6 + sp} H620" stroke="#d32f2f" stroke-dasharray="4 3" stroke-width="1.2"/>`;
  s += `<g transform="translate(790 140)"><circle r="60" fill="#f6f7f2" stroke="#7b848c" stroke-width="5"/>${txt(0, -26, "șubler (cursa)", { fs: 9.5, f: "#333" })}<text x="0" y="10" font-size="26" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" fill="#222">${fx(Math.round(B.s * 20) / 20, 2)}</text>${txt(0, 30, "mm", { fs: 11, f: "#333", w: 700 })}</g>`;
  s += txt(790, 226, Math.abs(B.s - MD.cursa(pr, B.Tw)) < 0.05 ? "cursa stabilizată" : "elementul de ceară se dilată…", { fs: 10.5, w: 600 });
  el.innerHTML = s;
}

/* ------------------------------------------------------------------ aparatele de pe stand: testerul OBD, termometrul IR, cronometrul */
function desenAparate() {
  const el = $("#svg-ap"); if (!el) return;
  const Pf = "ap", m = MS(), pr = P(), fan = m.fan, ev = sim.ev.slice(-3).reverse();
  let s = defsInstr(Pf);
  // testerul OBD
  s += `<g transform="translate(14 10)" filter="url(#${Pf}-umbra)"><rect width="230" height="214" rx="14" fill="#1f2328" stroke="#000"/><rect x="10" y="12" width="210" height="150" rx="5" fill="#081521"/>
    <text x="20" y="32" font-size="10" fill="#7fb7e8">K7J · Date curente${sim.obd ? "" : " (deconectat)"}</text>`;
  if (sim.obd && (sim.contact || sim.merge)) {
    s += `<text x="20" y="56" font-size="10" fill="#9fb3c6">Temp. lichid răcire</text><text x="210" y="58" text-anchor="end" font-size="20" font-family="'Courier New',monospace" font-weight="700" fill="#6dff8e">${Math.round(m.Tm)} °C</text>
      <text x="20" y="82" font-size="10" fill="#9fb3c6">Turație motor</text><text x="210" y="84" text-anchor="end" font-size="16" font-family="'Courier New',monospace" fill="#6dff8e">${Math.round(m.rpm)} rot/min</text>
      <text x="20" y="106" font-size="10" fill="#9fb3c6">Releu GMV (ventilator)</text><text x="210" y="108" text-anchor="end" font-size="16" font-family="'Courier New',monospace" font-weight="700" fill="${fan ? "#ffb02e" : "#6dff8e"}">${fan ? "ACTIV" : "INACTIV"}</text>
      <text x="20" y="128" font-size="9" fill="#7fb7e8">Evenimente GMV:</text>${ev.map((e, i) => `<text x="110" y="${128 + i * 11}" font-size="9" fill="#cfd5db">${e.ev === "on" ? "cuplat" : "decuplat"} la ${e.T} °C (${mmss(e.ts)})</text>`).join("")}`;
  }
  s += `<rect x="40" y="172" width="150" height="20" rx="4" fill="#2d333a"/><text x="115" y="186" font-size="9" text-anchor="middle" fill="#cfd5db">◀  OK  ▶  ESC</text></g>`;
  // termometrul cu infraroșu (pistol) îndreptat spre furtunul inferior
  s += `<g transform="translate(270 22)" filter="url(#${Pf}-umbra)"><path d="M0,30 Q0,0 30,0 H150 Q170,0 170,24 V52 Q170,70 150,70 H96 L110,170 Q112,184 96,184 H70 Q58,184 58,172 L50,70 H30 Q0,70 0,40 Z" fill="#e05a1a" stroke="#7a2a05"/><rect x="18" y="10" width="92" height="46" rx="5" fill="#1d2228"/>
    <text x="102" y="44" text-anchor="end" font-size="22" font-family="'Courier New',monospace" font-weight="700" fill="#9fe6c0">${sim.ir && (sim.merge || sim.stop) ? fx(irCitire(m.Tr), 1) : "--.-"}</text><text x="24" y="24" font-size="8" fill="#9fe6c0">°C  ε 0,95</text>
    <circle cx="170" cy="38" r="9" fill="#111"/><circle cx="170" cy="38" r="4" fill="${sim.ir ? "#ff2a2a" : "#400"}"/><rect x="74" y="74" width="16" height="30" rx="5" fill="#2b2f34"/></g>`;
  s += txt(355, 230, sim.ir ? "IR pe furtunul inferior (ieșirea radiatorului)" : "termometru IR (neîndreptat)", { fs: 10 });
  // cronometrul (timpul de la pornirea la rece)
  s += `<g transform="translate(480 30)" filter="url(#${Pf}-umbra)"><circle cx="70" cy="80" r="70" fill="url(#${Pf}-crom)" stroke="#555"/><circle cx="70" cy="80" r="58" fill="#f6f7f2"/><rect x="60" y="-2" width="20" height="14" rx="3" fill="#888"/>
    <text x="70" y="88" text-anchor="middle" font-size="24" font-family="'Courier New',monospace" font-weight="700" fill="#222">${sim.merge || sim.stop ? mmss(sim.merge ? sim.ts : sim.stop.ts) : "00:00"}</text>${txt(70, 112, "de la pornire", { fs: 9, f: "#555" })}</g>`;
  const c = sim.merge ? coloana(sim.ts) : null, urm = MD.TMIN.find(mm => mm * 60 > sim.ts + 15);
  s += txt(550, 205, sim.merge ? (c != null ? `● citire acum: t = ${c} min` : urm != null ? `următoarea citire la ${urm} min` : "curba de încălzire completă") : "", { fs: 11, w: 700, f: c != null ? "#c62828" : "currentColor" });
  // panoul standului: cheia, martorul de temperatură, starea ventilatorului
  s += `<g transform="translate(660 12)" filter="url(#${Pf}-umbra)"><rect width="320" height="210" rx="10" fill="#111417"/><rect x="14" y="14" width="292" height="70" rx="10" fill="#050607" stroke="#2b3035"/>
    <g transform="translate(60 50)"><circle r="20" fill="#ff3b1f" opacity="${m.Tm > 115 ? 0.7 : 0}"/><path d="M-3,-14 h6 v14 a7,7 0 1 1 -6,0 z M8,-10 h7 M8,-4 h7" fill="none" stroke="${m.Tm > 115 ? "#ff6a4a" : "#3a2010"}" stroke-width="2"/></g>
    <g transform="translate(160 50)">${fan ? `<circle r="22" fill="#2a7fff" opacity=".25"/>` : ""}${[0, 1, 2, 3].map(i => `<ellipse cx="0" cy="-9" rx="5" ry="10" fill="${fan ? "#6fb7ff" : "#2a3038"}" transform="rotate(${i * 90 + (fan ? (sim.t * 900) % 360 : 0)})"/>`).join("")}<circle r="3" fill="#888"/></g>
    <text x="250" y="46" font-size="9" fill="#9aa1a8" text-anchor="middle">ventilator</text><text x="250" y="62" font-size="13" fill="${fan ? "#ffb02e" : "#6b737a"}" text-anchor="middle" font-weight="700">${fan ? "PORNIT" : "oprit"}</text>
    <circle cx="80" cy="148" r="34" fill="#2b3035"/><circle cx="80" cy="148" r="24" fill="url(#${Pf}-crom)"/><g transform="rotate(${sim.merge ? 75 : sim.contact ? 45 : 0} 80 148)"><rect x="76" y="118" width="8" height="40" rx="2" fill="#1b1d20"/><rect x="69" y="112" width="22" height="14" rx="6" fill="#1b1d20"/></g>
    <text x="200" y="130" font-size="11" fill="#cfd5db">${sim.merge ? "motor pornit – ralanti" : sim.contact ? "contact pus" : "motor oprit"}</text><text x="200" y="150" font-size="10" fill="#9aa1a8">lichid ${fx(m.Tm, 1)} °C</text></g>`;
  el.innerHTML = s;
}
const mmss = t => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/* ------------------------------------------------------------------ camera termografică (radiatorul văzut din față) */
function paletaFier(f) {   // „ironbow”: negru – violet – roșu – portocaliu – galben – alb
  const st = [[0, 0, 0, 0], [0.18, 40, 0, 100], [0.38, 150, 0, 140], [0.58, 230, 60, 30], [0.78, 255, 160, 0], [0.92, 255, 230, 80], [1, 255, 255, 230]];
  f = cl(f, 0, 1); let i = 0; while (i < st.length - 2 && st[i + 1][0] < f) i++;
  const a = st[i], b = st[i + 1], u = (f - a[0]) / (b[0] - a[0]);
  return [0, 1, 2].map(k => Math.round(a[k + 1] + (b[k + 1] - a[k + 1]) * u));
}
function desenTermo() {
  const cv = $("#cv-termo"); if (!cv || !cv.getClientRects().length) return;
  const W = 360, H = 250, g = cv.getContext("2d"); cv.width = W; cv.height = H;
  const m = MS(), pr = P(), x0 = 30, y0 = 24, w = 260, h = 180, colm = sim.defect === "colmatat";
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const img = g.createImageData(w, h), Ta = pr.Ta, camp = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    // radiator cu curgere transversală: intrarea în bazinul stâng (sus), ieșirea în bazinul drept (jos); țevile orizontale se răcesc de la stânga la dreapta
    const u = i / w, v = j / h, tub = Math.floor(v * 30), flux = m.x > 0.02 || sim.defect === "deschis" ? 1 : 0.05;
    let T = m.Tr + (m.Tm - m.Tr) * Math.pow(1 - u, 1.4) * (0.85 + 0.15 * (1 - v));
    if (!flux || m.x < 0.02) T = Ta + (m.Tr - Ta) * (1 - u) * 0.6 + (u < 0.05 ? (m.Tm - Ta) * 0.3 : 0);
    if (colm && (tub % 7 === 3 || (tub > 18 && tub < 23))) T = Ta + (T - Ta) * 0.35;           // canale colmatate – zone reci
    if (u < 0.06) T = m.Tm - 1; if (u > 0.94) T = m.Tr;                                           // bazinele laterale
    if (j % 6 >= 4) T -= 0.08 * (m.Tm - Ta) * 0.25;                                                // lamelele dintre țevi (mai reci)
    camp[j * w + i] = T + 0.15 * Math.sin(i * 0.9 + j * 1.7);
  }
  // domeniul automat al camerei (ca la camerele reale): min … max din imagine
  let Tmin = Infinity, Tmax = -Infinity; camp.forEach(v => { if (v < Tmin) Tmin = v; if (v > Tmax) Tmax = v; }); Tmin = Math.floor(Tmin - 1); Tmax = Math.ceil(Tmax + 1);
  for (let q = 0; q < w * h; q++) { const [r, gg, b] = paletaFier((camp[q] - Tmin) / (Tmax - Tmin)), k = q * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255; }
  g.putImageData(img, x0, y0);
  for (let k = 0; k < 120; k++) { const [r, gg, b] = paletaFier(1 - k / 120); g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(310, y0 + k * 1.5, 16, 1.6); }
  g.fillStyle = "#fff"; g.font = "10px system-ui"; g.fillText(`${Tmax} °C`, 300, y0 - 6); g.fillText(`${Tmin} °C`, 300, y0 + 194);
  g.fillText(`radiator – vedere din față · cameră termografică · ε 0,95`, 30, 16);
  g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(x0 + w / 2 - 8, y0 + h / 2); g.lineTo(x0 + w / 2 + 8, y0 + h / 2); g.moveTo(x0 + w / 2, y0 + h / 2 - 8); g.lineTo(x0 + w / 2, y0 + h / 2 + 8); g.stroke();
  g.fillText(`max ${fx(Tmax - 1, 1)} °C · min ${fx(Tmin + 1, 1)} °C · domeniu automat`, 30, H - 12);
}

/* ------------------------------------------------------------------ testerul de presiune (pompă de mână cu manometru) pe vasul de expansiune / pe bușon */
function desenPres() {
  const el = $("#svg-pres"); if (!el) return;
  const Pf = "pr", R = sim.pres, m = MS();
  let s = defsInstr(Pf);
  // pompa de mână cu manometru 0…2,5 bar și furtunul
  s += `<g filter="url(#${Pf}-umbra)"><rect x="40" y="120" width="60" height="150" rx="10" fill="#c62828" stroke="#7f1010"/><rect x="58" y="60" width="24" height="64" rx="4" fill="url(#${Pf}-otel)"/><rect x="30" y="50" width="80" height="14" rx="6" fill="#222"/></g>`;
  s += svgGauge(Pf, 190, 120, 70, 2.5, R.p, { maj: 0.5, nmin: 5, unit: "bar", marca: "COOLING SYSTEM TESTER", benzi: [[1.4, 2.5, "#d32f2f"]], max2: R.bus ? R.pMax : null });
  s += `<path d="M100,250 C200,310 380,300 ${R.montat || R.bus ? "430,236" : "390,282"}" fill="none" stroke="#1d1d1d" stroke-width="8" stroke-linecap="round"/>`;
  // adaptorul: pe gâtul vasului de expansiune sau cu bușonul montat pe adaptorul de probă
  if (R.montat && !R.bus) s += `<rect x="410" y="205" width="40" height="30" rx="5" fill="url(#${Pf}-alama)" stroke="#6b5214"/>${txt(430, 196, "adaptor pe gâtul vasului de expansiune", { fs: 10, a: "start" })}`;
  if (R.bus) s += `<rect x="410" y="205" width="40" height="30" rx="5" fill="url(#${Pf}-alama)" stroke="#6b5214"/><g transform="translate(430 206)"><rect x="-28" y="-24" width="56" height="24" rx="6" fill="#1f4fb0"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${-25 + i * 6}" y="-24" width="3" height="24" fill="#163a85"/>`).join("")}${R.busDesch ? `<path d="M30,-6 q14,-4 22,4 M30,-12 q18,-8 30,0" stroke="#9fd2ff" stroke-width="2" fill="none"/>` : ""}</g>${txt(470, 170, R.busDesch ? "supapa bușonului s-a deschis (aerul iese)" : "bușonul pe adaptorul de probă", { fs: 10.5, a: "start", w: R.busDesch ? 700 : 400 })}`;
  s += txt(190, 230, `citire: ${fx(R.p, 2)} bar`, { fs: 13, w: 700 });
  if (R.tP != null && !R.bus) s += txt(560, 120, `timp de menținere: ${mmss(sim.t - R.tP)}`, { fs: 12, w: 700 });
  s += txt(560, 90, `lichid ${fx(m.Tm, 1)} °C ${m.Tm > 40 ? "– FIERBINTE: nu se deschide bușonul!" : "– motor rece"}`, { fs: 11, a: "middle", f: m.Tm > 40 ? "#c62828" : "currentColor", w: 700 });
  el.innerHTML = s;
}

/* ------------------------------------------------------------------ graficele în timp real */
function deseneazaLive() {
  const cv = $("#cv-live"); if (!cv || !cv.getClientRects().length) return;
  const pas = PASI[pasActiv].panou, t = Cadru.D.t;
  if (pas === "baie") {
    const pts = MD.TAPA.map(T => [T, num(t.t51.s["a" + T])]).filter(p => Number.isFinite(p[1]));
    deseneazaGrafic(cv, { xmin: 70, xmax: 105, ymin: 0, ymax: 10, xticks: [70, 75, 80, 85, 90, 95, 100, 105], yticks: [0, 2, 4, 6, 8, 10], xlab: "T apă [°C]", ylab: "cursa [mm]",
      serii: [{ tip: "linie", pts, culoare: 0 }, { tip: "pct", pts, culoare: 0 }, { tip: "pct", pts: [[sim.baie.Tw, sim.baie.s]], culoare: 3, r: 7 }] });
  } else {
    const L = sim.hist || [], tm = MD.TMIN.map(mm => [mm, num(t.t52.tm["m" + mm])]).filter(p => Number.isFinite(p[1])), tr = MD.TMIN.map(mm => [mm, num(t.t52.tr["m" + mm])]).filter(p => Number.isFinite(p[1]));
    deseneazaGrafic(cv, { xmin: 0, xmax: 20, ymin: 0, ymax: 120, xticks: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20], yticks: [0, 20, 40, 60, 80, 100, 120], xlab: "t [min]", ylab: "T [°C]",
      serii: [{ tip: "linie", pts: L.map(p => [p[0], p[1]]), culoare: 0, gros: 1.4 }, { tip: "linie", pts: L.map(p => [p[0], p[2]]), culoare: 1, gros: 1.4 }, { tip: "pct", pts: tm, culoare: 0 }, { tip: "pct", pts: tr, culoare: 1 },
        { tip: "linie", pts: [[0, P().Ton], [20, P().Ton]], culoare: css("--text-sec"), punctat: true, gros: 1 }] });
  }
}

/* ------------------------------------------------------------------ pașii lucrării */
const COMP = {
  pompaApa: ["Pompa de apă", "Pompă centrifugă antrenată de cureaua de accesorii (la motoarele noi – electrică sau decuplabilă); debitul crește cu turația."],
  termostat: ["Termostatul cu element de ceară", "Capsula cu ceară se dilată la încălzire și împinge talerul supapei de pe scaun: circuitul mare (radiatorul) se deschide de la T0, complet la ≈ T0 + 12…15 °C."],
  bypass: ["Circuitul mic (bypass)", "Cu termostatul închis lichidul revine direct la pompă, fără radiator: motorul se încălzește repede."],
  radiator: ["Radiatorul", "Schimbător de căldură aluminiu – aer cu țevi plate și lamele, bazine din poliamidă; curgere transversală."],
  ventilator: ["Electroventilatorul", "Comandat de ECU prin releu (GMV) peste pragul de cuplare și oprit sub pragul de decuplare – histerezis de câteva grade."],
  vas: ["Vasul de expansiune cu bușonul", "Preia dilatarea lichidului; bușonul are supapă de presiune (≈ 1,2…1,4 bar) și supapă de vacuum."],
  furtSup: ["Furtunul superior (tur radiator)", "Lichidul fierbinte de la carcasa termostatului spre bazinul de intrare al radiatorului."],
  furtInf: ["Furtunul inferior (retur radiator)", "Lichidul răcit spre aspirația pompei; aici se măsoară temperatura de ieșire din radiator (IR)."],
  incalzire: ["Radiatorul de încălzire (habitaclu)", "Circuit permanent, paralel cu cel mic; dă căldură habitaclului."],
  ect: ["Senzorul de temperatură CTS", "Termistor NTC în carcasa termostatului: temperatura lichidului pentru ECU, tabloul de bord și comanda ventilatorului."]
};
const NCOMP = Object.keys(COMP).length;
const ET3D = { pompaApa: "pompa de apă", termostat: "termostat", bypass: "circuit mic", radiator: "radiator", ventilator: "electroventilator", vas: "vas de expansiune", furtSup: "furtun superior", furtInf: "furtun inferior", incalzire: "radiator încălzire", ect: "CTS" };
function alegeComp(k, focus = true) { if (!COMP[k]) return; sim.comp[k] = true; sim.selectat = k; $("#comp-desc").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}`; if (SV.m3d) SV.m3d.selecteaza(k, focus); actualizeazaPasi(); }
const pe = (t, r, c) => Cadru.D.t[t][r][c] !== "";
const PASI = [
  { t: "Identificarea și NSSM", tab: "circuitul de răcire pe machetă", panou: "ap",
    instr: ["NSSM: bușonul vasului de expansiune NU se deschide cu motorul cald; electroventilatorul poate porni și cu contactul întrerupt; mănuși termoizolante la vasul cu apă caldă; lichidul cu glicol este toxic.", "Pe macheta 3D (transparentă), identificați componentele circuitului de răcire din Fig. 5.1 – clic pe ele sau pe etichete; urmăriți circuitul mic și circuitul mare."],
    ver: () => [[sim.manusi && sim.ochelari, "mănuși termoizolante și ochelari"], [Object.keys(sim.comp).length >= 7, `componente identificate: ${Object.keys(sim.comp).length}/${NCOMP} (minim 7)`]],
    prog: () => (sim.manusi && sim.ochelari ? 1 : 0) + (Object.keys(sim.comp).length >= 7 ? 1 : 0), tot: 2,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși termoizolante</label><label class="bifa"><input type="checkbox" id="ck-och"> Ochelari</label></div>` },
  { t: "Termostatul în vasul cu apă", tab: "Tabelul 5.1", panou: "baie",
    instr: ["Termostatul demontat este suspendat în vasul cu apă (fără să atingă fundul), lângă sonda termometrului.", "Încălziți lent (plita pe „lent”): cursa talerului urmează temperatura cu o mică întârziere (elementul de ceară). Citiți cursa cu șublerul la temperaturile din Tabelul 5.1 (± 0,3 °C), după stabilizare.", "Comparați T0 cu valoarea marcată pe termostat."],
    ver: () => { const c = MD.TAPA.find(T => Math.abs(sim.baie.Tw - T) <= 0.3); return [[sim.manusi, "mănuși termoizolante"], [c != null, c != null ? `apa la ${c} °C` : `apa ${fx(sim.baie.Tw, 1)} °C – între coloanele tabelului`], [Math.abs(sim.baie.s - MD.cursa(P(), sim.baie.Tw)) < 0.05, "cursa stabilizată"]]; },
    prog: () => MD.TAPA.filter(T => pe("t51", "s", "a" + T)).length, tot: 8,
    ctl: `<div class="rand-butoane">${PLITA.map((t, i) => `<button type="button" data-plita="${i}">${["Oprită", "Lent", "Rapid"][i]}</button>`).join("")}</div><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp accelerat ×10</label>`,
    buton: ["● Cursa → Tabelul 5.1", e => inregS(e)] },
  { t: "Curba de încălzire", tab: "Tabelul 5.2", panou: "ap",
    instr: ["Standul rece (lichidul la temperatura mediului). Conectați testerul OBD și îndreptați termometrul IR spre furtunul inferior (ieșirea radiatorului).", "Porniți motorul la ralanti și notați din 2 în 2 minute temperatura lichidului (OBD), temperatura furtunului inferior (IR) și starea ventilatorului (Tabelul 5.2).", "Marcați momentul deschiderii termostatului: creșterea bruscă a temperaturii furtunului inferior."],
    ver: () => { const c = sim.merge ? coloana(sim.ts) : null; return [[sim.obd, "testerul OBD conectat"], [sim.ir, "termometrul IR pe furtunul inferior"], [sim.merge && sim.rece0, sim.merge ? (sim.rece0 ? "motor pornit la rece" : "motorul nu a pornit la rece – readuceți standul la rece") : "motorul oprit"], [c != null, c != null ? `t = ${c} min (± 15 s)` : "așteptați momentul citirii"]]; },
    prog: () => MD.TMIN.filter(mm => pe("t52", "tm", "m" + mm)).length, tot: 8,
    ctl: `<div class="rand-butoane"><button type="button" id="b-obd">Conectează testerul OBD</button><button type="button" id="b-ir">Îndreaptă IR pe furtunul inferior</button></div>
      <div class="rand-butoane"><button type="button" id="b-rece">Standul rece (după 12 h)</button><button type="button" class="primar" id="b-porn">Pornește motorul</button><button type="button" id="b-stop">Oprește</button></div>
      <label class="bifa"><input type="checkbox" class="ck-rapid"> Timp accelerat ×10 (se oprește singur la fiecare citire)</label>`,
    buton: ["● Citirea → Tabelul 5.2", e => inregT(e)] },
  { t: "Electroventilatorul și termografia", tab: "Tabelul 5.3 – cuplare / decuplare", panou: "termo",
    instr: ["Lăsați motorul la ralanti până când electroventilatorul cuplează și decuplează (OBD: releul GMV și evenimentele).", "Notați temperaturile de cuplare și de decuplare (Tabelul 5.3) – histerezisul ventilatorului.", "Examinați radiatorul cu camera termografică: zonele reci indică canale colmatate; verificați furtunurile."],
    ver: () => [[sim.merge, "motor pornit"], [sim.ev.some(e => e.ev === "on"), "ventilatorul a cuplat"], [sim.ev.some(e => e.ev === "off"), "ventilatorul a decuplat"], [sim.termo, "radiatorul examinat cu camera termografică"]],
    prog: () => ["ton", "toff"].filter(k => pe("t53", k, "v")).length + (sim.termo ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" id="b-termo">Examinează radiatorul (termografie)</button><button type="button" id="b-porn2">Pornește motorul</button></div><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp accelerat ×10</label>
      <div class="rand-butoane"><button type="button" data-inv="on">● Cuplarea → Tabelul 5.3</button><button type="button" data-inv="off">● Decuplarea → Tabelul 5.3</button></div>` },
  { t: "Etanșeitatea circuitului și bușonul", tab: "Tabelul 5.3 – presiuni", panou: "pres",
    instr: ["Opriți motorul și așteptați răcirea lichidului sub 40 °C (NSSM: nu se deschide bușonul la cald).", "Scoateți bușonul, montați testerul pe gâtul vasului de expansiune, pompați până la ≈ 1,2 bar și notați presiunea; după 2 minute notați din nou (circuitul etanș: scădere neglijabilă).", "Montați bușonul pe adaptorul de probă și pompați până se deschide supapa lui: presiunea de deschidere (acul de maxim)."],
    ver: () => { const m = MS(); return [[!sim.merge, "motor oprit"], [m.Tm < 40, `lichid ${fx(m.Tm, 1)} °C (< 40 °C)`], [sim.pres.montat || sim.pres.bus, sim.pres.bus ? "bușonul pe adaptorul de probă" : sim.pres.montat ? "testerul pe vasul de expansiune" : "testerul nemontat"]]; },
    prog: () => ["p0", "p2", "cap"].filter(k => pe("t53", k, "v")).length, tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" id="b-stop3">Oprește motorul</button><label class="bifa"><input type="checkbox" class="ck-rapid"> Timp accelerat ×30 (răcirea, menținerea)</label></div>
      <div class="rand-butoane"><button type="button" id="b-tmont">Montează testerul pe vas</button><button type="button" id="b-pompa">Pompează (o cursă)</button><button type="button" id="b-desc">Descarcă presiunea</button></div>
      <div class="rand-butoane"><button type="button" data-ip="p0">● p inițial → Tabelul 5.3</button><button type="button" data-ip="p2">● p după 2 min → Tabelul 5.3</button></div>
      <div class="rand-butoane"><button type="button" id="b-bus">Bușonul pe adaptorul de probă</button><button type="button" data-ip="cap">● p deschidere bușon → Tabelul 5.3</button></div>` }
];
let pasActiv = 0;
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
  $$(".instr[data-panou]").forEach(el => { el.hidden = !(el.dataset.panou === p.panou || (el.dataset.panou === "ap" && (p.panou === "termo" || p.panou === "pres"))); });
  if (p.panou === "pres") { sim.rapid = 30; } $$(".ck-rapid").forEach(c => c.checked = sim.rapid > 1);
  actualizeazaPasi(); deseneazaLive();
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (id, on, t1, t0) => { const b = $(id); if (b) { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); } };
  s("#b-obd", sim.obd, "✓ Tester OBD conectat", "Conectează testerul OBD"); s("#b-ir", sim.ir, "✓ IR pe furtunul inferior", "Îndreaptă IR pe furtunul inferior"); s("#b-termo", sim.termo, "✓ Radiator examinat (termografie)", "Examinează radiatorul (termografie)");
  s("#b-tmont", sim.pres.montat, "Demontează testerul", "Montează testerul pe vas"); s("#b-bus", sim.pres.bus, "Scoate bușonul de pe adaptor", "Bușonul pe adaptorul de probă");
  $$("[data-plita]").forEach(b => b.classList.toggle("activ", +b.dataset.plita === sim.baie.plita));
  const m = MS(); $("#af-st").textContent = sim.merge ? "motor pornit" : sim.contact ? "contact pus" : "motor oprit"; $("#af-T").textContent = fx(m.Tm, 1); $("#af-Tr").textContent = fx(m.Tr, 1);
  $("#af-x").textContent = fx(m.x * P().smax, 1); $("#af-v").textContent = m.fan ? "pornit" : "oprit"; $("#af-t").textContent = sim.merge ? mmss(sim.ts) : "—";
}

/* ------------------------------------------------------------------ comenzile */
function on(id, f) { const b = $(id); if (b) b.addEventListener("click", f); }
function porneste() {
  if (!sim.manusi) return Cadru.mesajTemporar("NSSM: mănuși și ochelari (pasul 1).", "atentie");
  if (sim.pres.montat || sim.pres.bus) return Cadru.mesajTemporar("Demontați testerul de presiune și montați bușonul înainte de pornire.", "atentie");
  if (sim.merge) return;
  sim.rece0 = sim.rece; sim.rece = false; sim.contact = true; sim.merge = true; sim.ts = 0; sim.stop = null; sim.ev = []; sim.hist = []; sim.fanPrec = 0;
  if (!sim.rece0) Cadru.mesajTemporar("Motorul nu este rece: curba de încălzire se trasează numai de la standul rece (butonul „Standul rece”).", "atentie");
}
function opreste() { if (!sim.merge) return; const m = MS(); sim.stop = { t: sim.t, Tm: m.Tm, Tr: m.Tr, ts: sim.ts }; sim.merge = false; sim.contact = false; }
function legaComenzi() {
  $("#ck-man").addEventListener("change", e => { sim.manusi = e.target.checked; }); $("#ck-och").addEventListener("change", e => { sim.ochelari = e.target.checked; });
  $$(".ck-rapid").forEach(c => c.addEventListener("change", e => { sim.rapid = e.target.checked ? (PASI[pasActiv].panou === "pres" ? 30 : 10) : 1; $$(".ck-rapid").forEach(x => x.checked = e.target.checked); }));
  $$("[data-plita]").forEach(b => b.addEventListener("click", () => { if (!sim.manusi) return Cadru.mesajTemporar("NSSM: mănuși termoizolante.", "atentie"); sim.baie.plita = +b.dataset.plita; actualizeazaPasi(); }));
  on("#b-obd", () => { sim.obd = !sim.obd; }); on("#b-ir", () => { sim.ir = !sim.ir; });
  on("#b-rece", () => { if (sim.merge) return Cadru.mesajTemporar("Opriți întâi motorul.", "atentie"); sim.rece = true; sim.stop = null; sim.ev = []; sim.hist = []; Cadru.mesajTemporar("Standul a stat peste noapte: lichidul la temperatura mediului.", "ok"); });
  on("#b-porn", porneste); on("#b-porn2", porneste); on("#b-stop", opreste); on("#b-stop3", opreste);
  on("#b-termo", () => { if (!sim.merge) return Cadru.mesajTemporar("Termografia se face cu motorul cald, în funcționare.", "atentie"); sim.termo = true; });
  $$("[data-inv]").forEach(b => b.addEventListener("click", e => inregV(e, b.dataset.inv)));
  const R = sim.pres;
  on("#b-tmont", () => { if (sim.merge) return Cadru.mesajTemporar("Opriți motorul.", "atentie"); if (MS().Tm > 40) return Cadru.mesajTemporar(`NSSM: lichidul are ${fx(MS().Tm, 0)} °C – bușonul nu se deschide la cald (opăriri).`, "pericol"); if (R.bus) return Cadru.mesajTemporar("Scoateți întâi bușonul de pe adaptorul de probă.", "atentie"); R.montat = !R.montat; R.p = 0; R.tP = null; });
  on("#b-pompa", () => { if (!R.montat && !R.bus) return Cadru.mesajTemporar("Montați testerul.", "atentie"); if (R.bus) { if (R.p < P().pCap) R.p = Math.min(P().pCap, R.p + 0.12); R.pMax = Math.max(R.pMax, R.p); if (R.p >= P().pCap - 1e-9) { R.busDesch = true; R.p = P().pCap - 0.06; } } else { R.p = Math.min(1.6, R.p + 0.1); R.tP = sim.t; } });
  on("#b-desc", () => { R.p = 0; R.tP = null; R.pMax = 0; R.busDesch = false; });
  on("#b-bus", () => { if (sim.merge) return; if (MS().Tm > 40) return Cadru.mesajTemporar("NSSM: bușonul nu se deschide la cald.", "pericol"); R.bus = !R.bus; R.montat = false; R.p = 0; R.pMax = 0; R.busDesch = false; R.tP = null; });
  $$("[data-ip]").forEach(b => b.addEventListener("click", e => inregP(e, b.dataset.ip)));
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregS(e) {
  const B = sim.baie, pr = P(), T = Math.round(B.Tw * 100) / 100, c = MD.TAPA.find(x => Math.abs(T - x) <= 0.3);
  if (c == null) return Cadru.mesajTemporar(`Apa are ${fx(T, 1)} °C: citirile se fac la ${MD.TAPA.join(", ")} °C (± 0,3 °C).`, "atentie");
  if (Math.abs(B.s - MD.cursa(pr, B.Tw)) >= 0.05) return Cadru.mesajTemporar("Cursa nu s-a stabilizat: încălziți mai lent (plita pe „lent” sau oprită) și așteptați.", "atentie");
  const s = Math.round(B.s * 20) / 20;
  const ok = Cadru.inregistreaza(e, { log: { m: "s", T, s }, celule: [{ t: "t51", r: "s", c: "a" + c, v: s.toFixed(2) }] });
  if (ok) { msg(`Tabelul 5.1 (${c} °C): cursa = ${fx(s, 2)} mm (apa ${fx(T, 1)} °C).`); deseneazaLive(); }
}
function inregT(e) {
  if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie");
  if (!sim.rece0) return Cadru.mesajTemporar("Curba de încălzire se trasează de la standul rece.", "atentie");
  if (!sim.obd || !sim.ir) return Cadru.mesajTemporar("Conectați testerul OBD și îndreptați termometrul IR.", "atentie");
  const c = coloana(sim.ts); if (c == null) return Cadru.mesajTemporar(`Citirile se fac la 0, 2, 4 … 14 min (± 15 s); acum ${mmss(sim.ts)}.`, "atentie");
  const m = MS(), Tm = Math.round(m.Tm), Tr = irCitire(m.Tr), v = m.fan, ts = Math.round(sim.ts);
  const ok = Cadru.inregistreaza(e, { log: { m: "t", ts, Tm, Tr, v }, celule: [{ t: "t52", r: "tm", c: "m" + c, v: String(Tm) }, { t: "t52", r: "tr", c: "m" + c, v: Tr.toFixed(1) }, { t: "t52", r: "v", c: "m" + c, v: String(v) }] });
  if (ok) { msg(`Tabelul 5.2 (t = ${c} min): T motor ${Tm} °C, T ieșire radiator ${fx(Tr, 1)} °C, ventilator ${v}.`); deseneazaLive(); }
}
function inregV(e, ev) {
  const x = sim.ev.slice().reverse().find(z => z.ev === ev); if (!x) return Cadru.mesajTemporar(ev === "on" ? "Ventilatorul nu a cuplat încă." : "Ventilatorul nu a decuplat încă.", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "v", ev, T: x.T, ts: x.ts }, celule: [{ t: "t53", r: ev === "on" ? "ton" : "toff", c: "v", v: String(x.T) }] });
  if (ok) msg(`Tabelul 5.3: ventilatorul ${ev === "on" ? "cuplează" : "decuplează"} la ${x.T} °C.`);
}
function inregP(e, k) {
  const R = sim.pres;
  if (k === "cap") { if (!R.bus || !R.busDesch) return Cadru.mesajTemporar("Pompați cu bușonul pe adaptor până se deschide supapa lui.", "atentie"); }
  else { if (!R.montat || R.p < 0.9) return Cadru.mesajTemporar("Montați testerul pe vas și pompați până la ≈ 1,2 bar.", "atentie"); if (k === "p2" && (R.tP == null || sim.t - R.tP < 118 || sim.t - R.tP > 135)) return Cadru.mesajTemporar(`Citirea a doua se face la 2 min după ultima pompare (acum: ${R.tP == null ? "—" : mmss(sim.t - R.tP)}).`, "atentie"); }
  const v = Math.round((k === "cap" ? R.pMax : R.p) * 100) / 100;
  const ok = Cadru.inregistreaza(e, { log: { m: "p", k, v }, celule: [{ t: "t53", r: k, c: "v", v: v.toFixed(2) }] });
  if (ok) msg(`Tabelul 5.3: ${{ p0: "presiunea inițială", p2: "presiunea după 2 min", cap: "presiunea de deschidere a bușonului" }[k]} = ${fx(v, 2)} bar.`);
}

/* ------------------------------------------------------------------ macheta 3D */
const SV = { m3d: null };
function porneste3D() {
  const eb = $("#baie3d");
  if (eb) import(BAZA_COMUN + "aparate3d.js?v=3").then(m => { SV.baie = m.creeazaBaie(eb); $("#svg-baie").style.display = "none"; }).catch(() => { eb.remove(); });
  const el = $("#motor3d"); if (!el) return;
  import(BAZA_COMUN + "motor3d.js?v=13").then(m => { SV.m3d = m.creeazaStand(el, { racire: true, mod: "transparent", vedere: "racire", aparate: ["obd", "ir", "crono", "presiune"], etichete: ET3D, onSelect: k => alegeComp(k, false) }); $(".saa5-scena").classList.add("cu3d"); })
    .catch(e => { el.innerHTML = `<p class="nota">Macheta 3D nu a putut fi încărcată (${esc(e.message)}): este necesar un browser cu WebGL. Componentele se pot alege din listă:</p><div class="rand-butoane">${Object.keys(COMP).map(k => `<button type="button" data-c3="${k}">${COMP[k][0]}</button>`).join("")}</div>`; $$("#motor3d [data-c3]").forEach(b => b.addEventListener("click", () => alegeComp(b.dataset.c3))); });
}
function actualizeaza3D() {
  const m = MS(), ca = $("#cit-ap");
  if (ca) ca.innerHTML = [sim.obd ? `<b>OBD:</b> ${sim.contact || sim.merge ? `${Math.round(m.Tm)} °C · ${Math.round(m.rpm)} rot/min · GMV ${m.fan ? "ACTIV" : "inactiv"}` : "contact luat"}` : "", sim.ir && (sim.merge || sim.stop) ? `<b>IR furtun inferior:</b> ${fx(irCitire(m.Tr), 1)} °C` : "", sim.merge ? `<b>Cronometru:</b> ${mmss(sim.ts)}` : "",
    pasActiv === 4 && (sim.pres.montat || sim.pres.bus) ? `<b>Tester presiune:</b> ${fx(sim.pres.p, 2)} bar${sim.pres.bus ? ` (max ${fx(sim.pres.pMax, 2)} bar${sim.pres.busDesch ? ", bușonul s-a deschis" : ""})` : sim.pres.tP != null ? ` · menținere ${mmss(sim.t - sim.pres.tP)}` : ""}` : ""].filter(Boolean).join(" &nbsp;·&nbsp; ");
  if (!SV.m3d) return;
  SV.m3d.seteaza({ rpm: m.rpm, tps: 0, selectat: sim.selectat, vent: !!m.fan, tEv: sim.merge ? 200 + m.Tm * 2 : 40, eticheteVizibile: true,
    racire: { Tm: m.Tm, Tr: m.Tr, x: m.x, Q: m.rpm / 4000, capVas: !sim.pres.montat && !sim.pres.bus },
    furtune: [sim.obd ? { k: "obd", c: 0x1f5fd0, r: 0.004, spre: [0.66, 0.0, 0.64] } : null].filter(Boolean),
    aparate: {
      obd: { titlu: "K7J · Date curente" + (sim.obd ? "" : " (deconectat)"), linii: sim.obd && (sim.contact || sim.merge) ? [["Temp. lichid", `${Math.round(m.Tm)} °C`], ["Turație", `${Math.round(m.rpm)} rot/min`], ["Releu GMV", m.fan ? "ACTIV" : "INACTIV", m.fan], ...sim.ev.slice(-2).reverse().map(e => [`GMV ${e.ev === "on" ? "cuplat" : "decuplat"}`, `${e.T} °C ${mmss(e.ts)}`])] : null },
      ir: { on: sim.ir && (sim.merge || !!sim.stop), T: irCitire(m.Tr) },
      crono: { t: sim.merge ? sim.ts : sim.stop ? sim.stop.ts : 0 },
      presiune: { vizibil: pasActiv === 4, montat: sim.pres.montat, p: sim.pres.p, max: sim.pres.bus ? sim.pres.pMax : null }
    } });
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaSAA5(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date, { num, regresie }), pr = P(), rele = {};
  const rez = [
    ["Începutul deschiderii termostatului T0 (extrapolarea dreptei)", Number.isFinite(o.T0) ? `<span style='color:var(--accent)'>${fx(o.T0, 1)} °C</span> (marcaj ${pr.T0m} °C)` : "—"],
    ["Panta cursei ds/dT și cursa la 100 °C", Number.isFinite(o.panta) ? `${fx(o.panta, 3)} mm/°C · ${fx(o.smax, 2)} mm` : "—"],
    ["Temperatura de deschidere completă (cursa maximă)", Number.isFinite(o.T0) && o.panta ? `≈ ${fx(o.T0 + o.smax / o.panta, 1)} °C` : "—"],
    ["Viteza de încălzire în primele 4 min (termostat închis)", Number.isFinite(o.vInc) ? `${fx(o.vInc, 2)} °C/min` : "—"],
    ["Histerezisul ventilatorului T_cuplare − T_decuplare", Number.isFinite(o.hist) ? `${fx(o.hist, 0)} °C` : "—"],
    ["Diferența de temperatură pe radiator la 14 min", Number.isFinite(o.dTrad) ? `${fx(o.dTrad, 1)} °C` : "—"],
    ["Scăderea presiunii la testul de etanșeitate", Number.isFinite(o.scurg) ? `${fx(o.scurg * 2, 2)} bar în 2 min` : "—"],
    ["Căldura evacuată de radiator la 14 min (Q̇ = ṁ·c_p·ΔT, ṁ ≈ 0,22 kg/s, c_p = 3,5 kJ/kg·K)", Number.isFinite(o.dTrad) ? `${fx(0.22 * 3.5 * o.dTrad, 1)} kW (cu termostatul parțial deschis debitul real prin radiator este mai mic)` : "—"]
  ];
  const verdicte = [];
  if (Number.isFinite(o.T0)) verdicte.push(Math.abs(o.T0 - pr.T0m) <= 2 ? { tip: "ok", text: `Termostatul începe să se deschidă la ${fx(o.T0, 1)} °C – în toleranța de ± 2 °C față de marcajul de ${pr.T0m} °C.` } : { tip: "atentie", text: `T0 = ${fx(o.T0, 1)} °C diferă cu peste 2 °C de marcaj (${pr.T0m} °C): termostat necorespunzător.` });
  if (Number.isFinite(o.smax)) verdicte.push(o.smax >= 7 ? { tip: "ok", text: `Cursa la 100 °C: ${fx(o.smax, 2)} mm (≥ 7 mm – cursa nominală atinsă).` } : { tip: "atentie", text: `Cursa la 100 °C de numai ${fx(o.smax, 2)} mm: elementul de ceară este uzat.` });
  const cap = num(t.t53.cap.v); if (Number.isFinite(cap)) verdicte.push(cap >= 1.1 && cap <= 1.5 ? { tip: "ok", text: `Bușonul se deschide la ${fx(cap, 2)} bar – în domeniul uzual (≈ 1,2…1,4 bar).` } : { tip: "atentie", text: `Bușonul se deschide la ${fx(cap, 2)} bar – în afara domeniului; se înlocuiește.` });
  if (Number.isFinite(o.scurg)) verdicte.push(o.scurg * 2 <= 0.05 ? { tip: "ok", text: "Presiunea se menține 2 min: circuitul este etanș." } : { tip: "atentie", text: "Presiunea scade: căutați scurgerea (furtunuri, pompa de apă, garnitura de chiulasă)." });
  const serii = [], leg = [];
  const tm = MD.TMIN.map(m => [m, num(t.t52.tm["m" + m])]).filter(p => Number.isFinite(p[1])), tr = MD.TMIN.map(m => [m, num(t.t52.tr["m" + m])]).filter(p => Number.isFinite(p[1]));
  if (tm.length) { serii.push({ tip: "linie", pts: tm, culoare: 0 }, { tip: "pct", pts: tm, culoare: 0 }); leg.push(["lichid – ieșire motor (OBD)", "var(--serie-0)", "pct"]); }
  if (tr.length) { serii.push({ tip: "linie", pts: tr, culoare: 1 }, { tip: "pct", pts: tr, culoare: 1 }); leg.push(["lichid – ieșire radiator (IR)", "var(--serie-1)", "pct"]); }
  const ton = num(t.t53.ton.v), toff = num(t.t53.toff.v);
  if (Number.isFinite(ton)) { serii.push({ tip: "linie", pts: [[0, ton], [14, ton]], culoare: 3, punctat: true, gros: 1 }); leg.push([`cuplare ventilator ${ton} °C`, "var(--serie-3)"]); }
  if (Number.isFinite(toff)) { serii.push({ tip: "linie", pts: [[0, toff], [14, toff]], culoare: 2, punctat: true, gros: 1 }); leg.push([`decuplare ventilator ${toff} °C`, "var(--serie-2)"]); }
  return { celule: { t51: {}, t52: {}, t53: {} }, rele, rezultate: rez, verdicte, titluGrafic: "Curba de încălzire a motorului (Fig. 5.2 cu valorile proprii)",
    grafic: { xmin: 0, xmax: 14, ymin: 0, ymax: 110, xticks: MD.TMIN, yticks: [0, 20, 40, 60, 80, 100], xlab: "t [min]", ylab: "T [°C]", serii }, legenda: leg,
    principal: { eticheta: "T0 termostat [°C]", valoare: Number.isFinite(o.T0) ? +o.T0.toFixed(1) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Bușonul vasului de expansiune NU se deschide cu motorul cald: lichidul sub presiune (≈ 1…1,5 bar) și peste 90 °C provoacă opăriri grave.</li>
<li>Electroventilatorul poate porni automat chiar cu contactul întrerupt: mâinile și sculele se țin departe de palete; cablurile nu se trec prin zona ventilatorului.</li>
<li>La încercarea termostatului în vasul cu apă caldă se folosesc mănuși termoizolante și clește; vasul se așază stabil pe plită, departe de marginea mesei.</li>
<li>Lichidul de răcire pe bază de etilenglicol este toxic: nu se ingerează, se evită contactul cu pielea, scurgerile se colectează.</li></ul></div>
<h2>5.1. Scopul lucrării</h2>
<p>Determinarea temperaturii de deschidere și a cursei termostatului, trasarea curbei de încălzire a motorului, verificarea comenzii electroventilatorului și cunoașterea circuitelor de management termic ale vehiculelor electrificate.</p>
<h2>5.2. Noțiuni teoretice</h2>
<p>Sistemul de răcire menține motorul la temperatura optimă (≈ 85…105 °C pentru lichid). Termostatul cu element de ceară menține închis circuitul radiatorului (circuitul mic) până la temperatura de deschidere T<sub>0</sub>, scurtând timpul de încălzire; după deschidere lichidul trece prin radiator (circuitul mare). Electroventilatorul este cuplat de ECU la depășirea unui prag și decuplat la o temperatură mai mică (histerezis).</p>
<p>Motoarele actuale folosesc termostate comandate electric (încălzire suplimentară a elementului de ceară), pompe de apă electrice sau decuplabile și supape de control. La vehiculele electrificate, managementul termic include circuitul bateriei de tracțiune (domeniu optim ≈ 15…35 °C), al motorului electric și al invertorului, cuplate cu instalația de climatizare prin chiller și pompă de căldură.</p>
<div class="ec"><span>Q̇ = ṁ·c<sub>p</sub>·(T<sub>ieș, motor</sub> − T<sub>ieș, radiator</sub>) [kW]</span><span class="nr">(5.1)</span></div>
<p>unde ṁ este debitul masic de lichid [kg/s], iar c<sub>p</sub> ≈ 3,5 kJ/(kg·K) căldura specifică a lichidului de răcire (amestec cu 50 % glicol).</p>
<figure><img src="img/fig5_1.jpg" alt="Fig. 5.1 Schema sistemului de răcire și punctele de măsură" loading="lazy"><figcaption>Fig. 5.1. Schema sistemului de răcire și punctele de măsură</figcaption></figure>
<figure><img src="img/fig5_2.jpg" alt="Fig. 5.2 Curba de încălzire și caracteristica termostatului" loading="lazy"><figcaption>Fig. 5.2. Curba de încălzire a motorului și caracteristica termostatului (exemplu)</figcaption></figure>
<figure><img src="img/fig5_3.jpg" alt="Fig. 5.3 Managementul termic al unui vehicul electrificat" loading="lazy"><figcaption>Fig. 5.3. Managementul termic al unui vehicul electrificat (schemă de principiu)</figcaption></figure>
<h2>5.3. Aparatură și echipamente</h2>
<ul><li>Stand motor cu instalație de răcire completă</li><li>Termostat demontat, vas cu apă, plită electrică, termometru digital cu sondă, riglă sau șubler</li><li>Cameră termografică sau termometru cu infraroșu</li><li>Tester OBD (temperatura lichidului, starea ventilatorului)</li><li>Tester de presiune pentru circuitul de răcire și bușon</li></ul>
<h2>5.4. Modul de lucru (în simulator)</h2>
<p>Urmați pașii din panoul „Desfășurarea lucrării”: identificarea componentelor pe macheta 3D, caracteristica termostatului în vasul cu apă, curba de încălzire de la rece (OBD + IR din 2 în 2 minute), cuplarea și decuplarea electroventilatorului și termografia radiatorului, apoi – cu motorul rece – testul de etanșeitate și presiunea de deschidere a bușonului.</p>
<h2>5.6. Prelucrarea datelor</h2>
<p>Se trasează caracteristica termostatului s = f(T) și curbele de încălzire. Se determină T<sub>0</sub> (extrapolarea zonei liniare la s = 0), viteza de încălzire dT/dt înainte de deschiderea termostatului, timpul până la deschidere, histerezisul ventilatorului și diferența de temperatură pe radiator.</p>
<h2>5.7. Interpretarea rezultatelor</h2>
<ul><li>Termostatul este corespunzător dacă începe să se deschidă la ± 2 °C față de valoarea marcată și atinge cursa nominală (≈ 7…10 mm) la aproximativ T<sub>0</sub> + 12…15 °C.</li>
<li>Termostatul blocat deschis produce încălzire lentă și consum mărit; termostatul blocat închis duce la supraîncălzire, cu furtunul inferior rece.</li>
<li>Pe termogramă, zonele reci ale radiatorului indică canale colmatate.</li></ul>
<h2>5.8. Relevanță practică</h2>
<p>Managementul termic este unul dintre domeniile cu cea mai mare cerere de ingineri în industria auto actuală (bateriile de tracțiune, încărcarea rapidă, pompele de căldură) și o temă potrivită pentru proiecte de licență și cercetare.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu (Fig. 5.2)</h2>
<p>Termostatul marcat 86 °C: cursa 1,1 mm la 88 °C și 6,9 mm la 98 °C. Panta = (6,9 − 1,1)/(98 − 88) = 0,58 mm/°C; T<sub>0</sub> = 88 − 1,1/0,58 = 86,1 °C (± 2 °C – corect); cursa nominală de 8 mm se atinge la 86,1 + 8/0,58 ≈ 100 °C.</p>
<div class="problema"><h3>Problema 1</h3><p>La ralanti, înainte de deschiderea termostatului, lichidul se încălzește de la 22 °C la 64 °C în 4 minute. Masa termică a motorului cu lichidul este 16 kJ/K. Ce putere termică primește lichidul?</p>
<details class="sol"><summary>Rezolvare</summary><p>dT/dt = 42/240 = 0,175 K/s; Q̇ = C·dT/dt = 16·0,175 = 2,8 kW (pierderile spre mediu sunt mici la temperaturi mici).</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Debitul prin radiator este 0,2 kg/s, lichidul intră cu 98 °C și iese cu 86 °C (c<sub>p</sub> = 3,5 kJ/kg·K). Ce putere evacuează radiatorul?</p>
<details class="sol"><summary>Rezolvare</summary><p>Q̇ = 0,2·3,5·12 = 8,4 kW – ordinul de mărime al puterii termice la sarcină medie; la ralanti, pe stand, puterea evacuată este de ≈ 3 kW.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Furtunul inferior rămâne rece (≈ 30 °C) când lichidul ajunge la 110 °C, iar ventilatorul funcționează. Diagnostic?</p>
<details class="sol"><summary>Rezolvare</summary><p>Lichidul nu circulă prin radiator: termostatul este blocat închis (sau radiatorul complet colmatat). Se înlocuiește termostatul; motorul nu se folosește până la remediere.</p></details></div>`;
}
const INTREBARI = [
  ["De ce se folosește un termostat, în loc să circule permanent lichidul prin radiator?", "Pentru încălzirea rapidă (circuitul mic): uzura, consumul și emisiile sunt mari la motorul rece; apoi termostatul menține temperatura optimă indiferent de sarcină și de temperatura aerului."],
  ["Care este rolul presurizării circuitului de răcire?", "Crește temperatura de fierbere a lichidului (≈ 120…125 °C la 1,3 bar), evită cavitația pompei și formarea bulelor de vapori pe pereții fierbinți."],
  ["Ce avantaje are o pompă de apă electrică față de una antrenată mecanic?", "Debitul nu mai depinde de turație: se poate opri la pornirea la rece (încălzire mai rapidă), poate funcționa după oprirea motorului (turbo, baterie) și consumă doar puterea necesară."],
  ["De ce bateria de tracțiune trebuie menținută într-un domeniu îngust de temperatură la încărcarea rapidă?", "La rece rezistența internă crește și apare depunerea de litiu (curentul de încărcare se limitează); la cald îmbătrânirea se accelerează și crește riscul de ambalare termică – de aceea se răcește prin chiller sau se preîncălzește."]
];
const TEST = [
  { q: "Termostatul cu ceară închis dirijează lichidul:", o: ["prin radiator", "prin circuitul mic, spre pompă", "în vasul de expansiune", "spre ventilator"], c: 1, e: "Până la T0 lichidul ocolește radiatorul: încălzire rapidă." },
  { q: "Termostatul este corespunzător dacă T0 diferă de marcaj cu cel mult:", o: ["± 0,5 °C", "± 2 °C", "± 10 °C", "nu contează"], c: 1, e: "Și atinge cursa nominală la ≈ T0 + 12…15 °C." },
  { q: "Furtunul inferior rece și motorul supraîncălzit indică:", o: ["termostat blocat deschis", "termostat blocat închis", "bușon defect", "ventilator mereu pornit"], c: 1, e: "Lichidul nu trece prin radiator." },
  { q: "Histerezisul ventilatorului înseamnă:", o: ["aceeași temperatură de cuplare și decuplare", "decuplare la o temperatură mai mică decât cuplarea", "turație variabilă", "pornire numai cu contactul pus"], c: 1, e: "Evită pornirile și opririle repetate." },
  { q: "Bușonul vasului de expansiune se deschide:", o: ["cu motorul cald", "numai cu motorul rece", "oricând", "la ralanti"], c: 1, e: "Lichidul fierbinte sub presiune provoacă opăriri." }
];
const CSS = `<style>
.saa5-3d .m3d { height:clamp(380px, 60vh, 600px); }
.saa5-baie .m3d { height:clamp(320px, 48vh, 460px); }
.cu3d .instr[data-panou="ap"], .cu3d .instr[data-panou="pres"] { display:none !important; }
.saa5-afis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.saa5-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .saa5-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .saa5-afis b { font-size:1.05rem; }
.instr { margin-top:.4rem; } .instr h3 { margin:.2rem 0 .4rem; font-size:1rem; }
.instr svg { width:100%; height:auto; display:block; color:var(--text); }
#cv-termo { width:100%; max-width:480px; display:block; border-radius:8px; margin:.3rem auto; image-rendering:auto; }
#comp-desc { min-height:2.4em; }
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
@media (max-width:900px){ .saa5-afis { grid-template-columns:repeat(3,minmax(0,1fr)); } }
</style>`;

/* ------------------------------------------------------------------ definiția lucrării */
Cadru.porneste({
  disc: "SAA", nr: 5, cod: "saa-l5",
  titlu: "Sistemul de răcire și managementul termic",
  scurt: "Sistemul de răcire",
  subtitlu: "Laborator virtual – standul K7J 1.4 MPI: termostatul în vasul cu apă, curba de încălzire, electroventilatorul, termografia, testul de presiune",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261025); },
  date: [{ k: "T0m", et: "Marcajul termostatului [°C]", v: 86, fix: true }, { k: "lichid", et: "Lichidul de răcire", v: "G12, 50 % glicol", fix: true, text: true }],
  tabele: [
    { id: "t51", titlu: "Tabelul 5.1. Caracteristica termostatului", antetRand: "T apă [°C]", nota: "Citirile se fac la temperaturile din tabel (± 0,3 °C), după stabilizarea cursei (încălzire lentă).",
      randuri: [{ k: "s", et: "cursă [mm]" }], coloane: MD.TAPA.map(T => ({ k: "a" + T, t: `${T}`, intrare: true })) },
    { id: "t52", titlu: "Tabelul 5.2. Curba de încălzire", antetRand: "t [min]", nota: "De la pornirea la rece, la ralanti; citirile la fiecare 2 minute (± 15 s). T motor – OBD; T ieșire radiator – termometrul IR pe furtunul inferior.",
      randuri: [{ k: "tm", et: "T motor [°C]" }, { k: "tr", et: "T ieșire radiator [°C]" }, { k: "v", et: "Ventilator (0/1)" }], coloane: MD.TMIN.map(m => ({ k: "m" + m, t: `${m}`, intrare: true })) },
    { id: "t53", titlu: "Tabelul 5.3. Electroventilatorul, etanșeitatea circuitului și bușonul", antetRand: "Mărimea",
      randuri: [{ k: "ton", et: "T cuplare ventilator [°C]" }, { k: "toff", et: "T decuplare ventilator [°C]" }, { k: "p0", et: "p inițial test etanșeitate [bar]" }, { k: "p2", et: "p după 2 min [bar]" }, { k: "cap", et: "p deschidere bușon [bar]" }],
      coloane: [{ k: "v", t: "Valoarea", intrare: true }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaSAA5,
  intrebari() {
    return [
      { id: "q1", u: "°C", text: "Temperatura de început a deschiderii termostatului T<sub>0</sub> (extrapolarea zonei liniare a caracteristicii la s = 0):", textSimplu: "T0 al termostatului" },
      { id: "q2", u: "°C/min", text: "Viteza de încălzire a lichidului în primele 4 minute (T(4) − T(0))/4:", textSimplu: "Viteza de încălzire în primele 4 min" },
      { id: "q3", u: "°C", text: "Histerezisul electroventilatorului (T cuplare − T decuplare):", textSimplu: "Histerezisul ventilatorului" },
      { id: "q4", u: "°C", text: "Diferența de temperatură pe radiator la t = 14 min (T motor − T ieșire radiator):", textSimplu: "ΔT pe radiator la 14 min" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const a = MD.TAPA.filter(T => t.t51.s["a" + T] !== "").length; if (a < 8) l.push(`Tabelul 5.1: ${a}/8 temperaturi`);
    const b = MD.TMIN.filter(m => t.t52.tm["m" + m] !== "").length; if (b < 8) l.push(`Tabelul 5.2: ${b}/8 citiri`);
    ["ton", "toff", "p0", "p2", "cap"].forEach(k => { if (t.t53[k].v === "") l.push(`Tabelul 5.3: ${{ ton: "cuplarea ventilatorului", toff: "decuplarea ventilatorului", p0: "presiunea inițială", p2: "presiunea după 2 min", cap: "bușonul" }[k]}`); });
    return l;
  },
  exemplu(D) {
    const pr = MD.parametri(1);
    MD.TAPA.forEach(T => { D.t.t51.s["a" + T] = (Math.round(MD.cursa(pr, T) * 20) / 20).toFixed(2); });
    MD.TMIN.forEach(m => { const s = MD.stare(pr, m * 60, ""); D.t.t52.tm["m" + m] = String(Math.round(s.Tm)); D.t.t52.tr["m" + m] = s.Tr.toFixed(1); D.t.t52.v["m" + m] = String(s.fan); });
    D.t.t53.ton.v = String(Math.round(pr.Ton)); D.t.t53.toff.v = String(Math.round(pr.Ton - pr.hist)); D.t.t53.p0.v = "1.20"; D.t.t53.p2.v = (1.2 - 2 * pr.scurg).toFixed(2); D.t.t53.cap.v = pr.pCap.toFixed(2);
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Răcirea motorului pe autoturism",
    intro: `<p>Același motor K7J, montat în autoturism, cu carcasa transparentă: urmăriți lichidul prin circuitul mic și prin radiator. Apăsați <b>Pornire la rece</b>, apoi schimbați viteza: la ralanti și în trafic radiatorul are nevoie de electroventilator, iar la viteză aerul de înaintare este suficient. Încercați și o zi caniculară cu climatizarea pornită și o pantă lungă (sarcină mare).</p>`,
    dupa: `<p class="nota">Culoarea particulelor: albastru – lichid rece, roșu – lichid fierbinte. Timpul este accelerat de 12 ori.</p>`,
    optiuni: () => ({ sistem: "racire" })
  },
  referat: {
    scop: "Determinarea temperaturii de deschidere și a cursei termostatului, trasarea curbei de încălzire a motorului, verificarea comenzii electroventilatorului, a etanșeității circuitului și a bușonului.",
    relatii: "s = s<sub>max</sub>·(T − T<sub>0</sub>)/ΔT; &nbsp; T<sub>0</sub> = −a/b din regresia s = a + b·T; &nbsp; dT/dt = (T(4) − T(0))/4; &nbsp; Q̇ = ṁ·c<sub>p</sub>·ΔT.",
    varianta: D => `Termostatul propriu (marcaj ${P().T0m} °C), motorul și instalația de răcire proprii: puterea termică la ralanti, pragurile ventilatorului, presiunea bușonului.`,
    indicatii: "Comparați T0 cu marcajul, cursa cu valoarea nominală, comentați curba de încălzire (circuitul mic, deschiderea termostatului, ciclurile ventilatorului), termograma radiatorului și testul de presiune; explicați rolul managementului termic la vehiculele electrificate (Fig. 5.3)…"
  },
  subsol: "Modelul: termostat cu ceară (T0, ΔT, cursă individuale), încălzire la ralanti cu două mase termice (motorul, radiatorul), debit împărțit între circuitul mic și radiator, radiator fără aer de înaintare sau cu electroventilator cu histerezis, bușon și scurgeri individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena saa5-scena">
      <div id="motor3d" class="saa5-3d"></div>
      <p class="nota" id="cit-ap" aria-live="polite"></p>
      <p class="nota" id="comp-desc">Clic pe o componentă a circuitului de răcire (pe macheta 3D). Particulele arată curgerea lichidului: albastru – rece, roșu – fierbinte.</p>
      <div class="saa5-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>T motor [°C]</span><b id="af-T">—</b></div><div><span>T ieșire radiator [°C]</span><b id="af-Tr">—</b></div><div><span>Cursa termostatului [mm]</span><b id="af-x">—</b></div><div><span>Ventilator</span><b id="af-v">—</b></div><div><span>Timp</span><b id="af-t">—</b></div></div>
      <div class="instr" data-panou="baie" hidden><h3>Termostatul în vasul cu apă</h3><div id="baie3d" class="saa5-baie"></div><svg id="svg-baie" viewBox="0 0 880 350" role="img" aria-label="Vasul cu apă pe plită, termostatul suspendat, termometrul și șublerul"></svg>
        <p class="nota" id="baie-cit"></p></div>
      <div class="instr" data-panou="ap"><h3>Aparatele pe stand</h3><svg id="svg-ap" viewBox="0 0 990 240" role="img" aria-label="Testerul OBD, termometrul cu infraroșu, cronometrul și panoul standului"></svg></div>
      <div class="instr" data-panou="termo" hidden><h3>Camera termografică – radiatorul</h3><canvas id="cv-termo" width="360" height="250" aria-label="Termograma radiatorului"></canvas></div>
      <div class="instr" data-panou="pres" hidden><h3>Testerul de presiune al circuitului de răcire</h3><svg id="svg-pres" viewBox="0 0 800 300" role="img" aria-label="Pompa de mână cu manometru pe vasul de expansiune sau pe bușon"></svg></div>
      <div class="grafic-mic"><canvas id="cv-live" height="230" aria-label="Graficul în timp real"></canvas></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari"><summary>Defecte de diagnosticat (mod demonstrativ)</summary>
        <label class="camp">Situația <select id="in-defect" data-blocat-eval><option value="none">sistem în stare bună</option><option value="deschis">termostat blocat deschis</option><option value="inchis">termostat blocat închis</option><option value="ventilator">electroventilator defect</option><option value="colmatat">radiator colmatat</option></select></label></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiestePasi();
      if (!MOD.eval) { C.D.date.T0m = P().T0m; C.construiesteDateLucru(); }
      $("#in-defect").addEventListener("change", e => { sim.defect = e.target.value; });
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval(Pp, C) { Object.assign(C.D.date, { T0m: Pp.T0m }); sim.defect = "none"; const d = $("#in-defect"); if (d) d.disabled = true; },
    reset() { Object.assign(sim, { contact: false, merge: false, rece: true, stop: null, ev: [], hist: [], obd: false, ir: false, termo: false }); sim.baie = { Tw: 60, s: 0, plita: 0 }; sim.pres = { montat: false, p: 0, tP: null, bus: false, busDesch: false, pMax: 0 }; },
    cadru(dt0, C, vizibil) {
      const dtR = Math.min(0.05, dt0 || 0.016), pr = P();
      // timpul accelerat se întoarce la ×1 înaintea unei citiri (coloana tabelului)
      if (sim.rapid > 1 && sim.merge && pasActiv === 2) { const urm = MD.TMIN.find(m => m * 60 >= sim.ts - 15); if (urm != null && urm * 60 - sim.ts < 12 && urm * 60 - sim.ts > -15) { sim.rapid = 1; $$(".ck-rapid").forEach(c => c.checked = false); Cadru.mesajTemporar(`Citirea de la ${urm} min: timpul revine la normal.`, "ok"); } }
      if (sim.rapid > 1 && pasActiv === 1 && sim.baie.plita === 2) { const c = MD.TAPA.find(T => T >= sim.baie.Tw - 0.3); if (c != null && c - sim.baie.Tw < 1.5) { sim.baie.plita = 1; Cadru.mesajTemporar(`Aproape de ${c} °C: plita trece pe încălzire lentă.`, "ok"); } }
      const dt = dtR * sim.rapid;
      sim.t += dt;
      if (sim.merge) {
        sim.ts = Math.min(20 * 60 - 1, sim.ts + dt);
        const m = MD.stare(pr, sim.ts, def());
        if (m.fan !== sim.fanPrec) { sim.ev.push({ ev: m.fan ? "on" : "off", T: Math.round(m.Tm), ts: Math.round(sim.ts) }); sim.fanPrec = m.fan; }
        sim.hist = sim.hist || []; if (!sim.hist.length || sim.ts / 60 - sim.hist[sim.hist.length - 1][0] > 0.05) sim.hist.push([sim.ts / 60, m.Tm, m.Tr]);
      }
      // vasul cu apă pe plită: încălzirea (lentă ≈ 0,4 °C/min sau rapidă), pierderile, fierberea; elementul de ceară (τ ≈ 10 s)
      const B = sim.baie, Pw = B.plita === 2 ? 0.9 : B.plita === 1 ? 0.006 * (B.Tw - pr.Ta) + 8.4 * 0.4 / 60 : 0;
      B.Tw = Math.min(100, B.Tw + (Pw - 0.006 * (B.Tw - pr.Ta)) / 8.4 * dt);
      B.s += (MD.cursa(pr, B.Tw) - B.s) * (1 - Math.exp(-dt / 10));
      // testerul de presiune: scurgerea lentă a circuitului
      const R = sim.pres; if (R.montat && R.p > 0) R.p = Math.max(0, R.p - pr.scurg / 60 * dt);
      if (!vizibil) return;
      actualizeaza3D();
      const now = performance.now();
      if (now - (this._ts || 0) > 200) { this._ts = now; actualizeazaPasi(); const pn = PASI[pasActiv].panou;
        if (pn === "baie") desenBaie(); if (pn !== "baie") desenAparate(); if (pn === "termo") desenTermo(); if (pn === "pres") desenPres();
        if (now - (this._tg || 0) > 600) { this._tg = now; deseneazaLive(); }
        const m = MS(); C.stare(1, sim.merge ? `motor pornit – ${mmss(sim.ts)}` : "motor oprit", sim.merge ? "inc" : ""); C.stare(2, `lichid ${fx(m.Tm, 1)} °C · pasul ${pasActiv + 1}`); }
    },
    redeseneaza() { deseneazaLive(); },
    formule() {
      const m = MS(), pr = P(), r = [];
      r.push(["Cursa termostatului (echilibru)", `s(${fx(m.Tm, 1)} °C) = <span class="rez">${fx(MD.cursa(pr, m.Tm), 2)} mm</span>`]);
      if (sim.merge) r.push(["Căldura evacuată de radiator", `Q̇ ≈ ṁ_rad·c_p·(T_m − T_r) = <span class="rez">${fx(0.22 * (0.005 + 0.995 * m.x) * 3.5 * (m.Tm - m.Tr), 2)} kW</span>`]);
      return r;
    }
  }
});
