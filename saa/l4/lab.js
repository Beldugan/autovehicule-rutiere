/* SAA – Lucrarea 4. Sistemul de ungere – caracteristica presiunii uleiului (standul K7J 1.4 MPI din laborator).
   Simulator: macheta 3D a motorului K7J de pe stand – aceeași ca la celelalte lucrări – secționată / transparentă / opacă, cu
   sistemul de ungere în interior: arborele cotit, bielele și pistoanele (ordinea de aprindere 1-3-4-2), arborele cu came și supapele,
   pompa cu roți dințate evolventice antrenată prin lanț, supapa de siguranță cu plonjor și arc, sorbul, filtrul cu elementul pliat,
   galeria principală, lagărele cu pelicula de ulei, axele culbutorilor, uleiul din baie; debitele ramurilor după model (animație
   încetinită de 30 de ori). Manocontactul se demontează animat, se montează adaptorul și manometrul de control pe furtun, sonda
   termometrului în tubul jojei. Aparatele: manometrul, termometrul, testerul OBD, panoul standului; multimetrul; panoplia cu pompe
   (roți dințate, gerotor, palete cu debit variabil). Parametrii sunt individuali. */
"use strict";
const MD = MODELE["saa-l4"];
function P() { return Cadru.P; }
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const fx = (v, n) => fmt(v, n);
const ET_REG = { ral: "ralanti", n1500: "1500 rot/min", n2000: "2000 rot/min", n2500: "2500 rot/min", n3000: "3000 rot/min", n3500: "3500 rot/min" };

/* ------------------------------------------------------------------ starea standului */
const sim = {
  t: 0, contact: false, merge: false, n: 0, reg: "ral", T: 24, p: 0, rapid: false, manusi: false, ochelari: false, defect: "none",
  senzor: true, man: false, etans: false, mm: false, rot: 0, comp: {}, pompe: {}, part: [], picaturi: [], picF: [], selectat: null,
  vSw: 0, vMan: 0, pAc: 0, Tafis: 24, nAfis: 0, dripLeft: 0, vedere: "stand"
};
function nTinta() { return sim.merge ? MD.nr(P(), sim.reg) : 0; }
function pAdev() { return MD.presiune(P(), sim.n, sim.T, sim.defect); }
function stabil() { return sim.merge && Math.abs(sim.n - nTinta()) < 3 && Math.abs(sim.p - pAdev()) < 0.02; }
function randT(T) { const r = MD.TEMP.find(x => Math.abs(T - x) <= 2.5); return r == null ? null : r; }

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
/* ------------------------------------------------------------------ geometrie: roți dințate cu profil evolventic */
/** profilul unei roți dințate evolventice (α = 20°), centrată în 0,0; dintele 0 este orientat pe axa +x */
function profilEvolventa(z, m, alfa = 20) {
  const a = alfa * Math.PI / 180, r = m * z / 2, rb = r * Math.cos(a), ra = r + m, rf = r - 1.25 * m;
  const inv = x => Math.tan(x) - x, psi = Math.PI / (2 * z) + inv(a);
  const unghi = rho => { if (rho <= rb) return psi; const t = Math.sqrt(rho * rho / (rb * rb) - 1); return psi - (t - Math.atan(t)); };
  const pts = [];
  for (let k = 0; k < z; k++) {
    const c = 2 * Math.PI * k / z, fl = [];
    for (let i = 0; i <= 8; i++) { const rho = Math.max(rf, rb) + (ra - Math.max(rf, rb)) * i / 8; fl.push([rho, unghi(rho)]); }
    pts.push([rf, c - unghi(rf)]);
    fl.forEach(([rho, u]) => pts.push([rho, c - u]));
    for (let i = 1; i < 4; i++) pts.push([ra, c - unghi(ra) + 2 * unghi(ra) * i / 4]);
    fl.slice().reverse().forEach(([rho, u]) => pts.push([rho, c + u]));
    pts.push([rf, c + unghi(rf)]);
    for (let i = 1; i < 4; i++) pts.push([rf, c + unghi(rf) + (2 * Math.PI / z - 2 * unghi(rf)) * i / 4]);
  }
  return "M" + pts.map(([rho, u]) => `${(rho * Math.cos(u)).toFixed(2)},${(rho * Math.sin(u)).toFixed(2)}`).join("L") + "Z";
}
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const RAD = Math.PI / 180;

/* ------------------------------------------------------------------ elementele circuitului (identificare pe macheta 3D) */
const COMP = {
  carter: ["Baia de ulei (carterul)", "Rezervorul de ulei al motorului (≈ 4,9 l cu filtrul la K7J); din galerii și din chiulasă uleiul revine aici prin gravitație. Nivelul scade puțin cu motorul pornit (uleiul aflat în circuit)."],
  sorb: ["Sorbul cu sită", "Clopotul de aspirație cu sită de sârmă, aproape de fundul băii: reține impuritățile mari înaintea pompei."],
  pompa: ["Pompa de ulei cu roți dințate", "Montată în baie, la capătul distribuției, antrenată de arborele cotit prin lanț. Pompă volumetrică: uleiul este purtat între dinți și carcasă de la aspirație la refulare; debitul ∝ turație (Q = V·n·η<sub>v</sub>)."],
  supapa: ["Supapa de siguranță (în corpul pompei)", "Plonjor apăsat de un arc: la presiunea de deschidere (≈ 4,5…5 bar) plonjorul se deplasează, descoperă orificiul de retur și surplusul trece înapoi la aspirație – palierul caracteristicii."],
  filtru: ["Filtrul de ulei (cartuș înșurubat)", "Element din hârtie pliată în jurul unui tub central perforat; membrana antiretur păstrează uleiul în filtru la oprire, supapa de bypass ocolește elementul colmatat sau uleiul rece foarte vâscos."],
  galerie: ["Galeria principală de ungere", "Canal găurit pe lungimea blocului, pe partea admisiei; din el pleacă găurile spre fiecare lagăr palier, coloana spre chiulasă și racordul manocontactului."],
  lagare: ["Lagărele paliere și de bielă (cuzineți)", "Uleiul intră în cuzinetul palier și, prin găurile oblice din arborele cotit, ajunge la fusurile maneton. Pelicula portantă hidrodinamică are 2…20 µm; jocul mărit prin uzură scade presiunea, mai ales la cald."],
  came: ["Arborele cu came și axele culbutorilor", "Coloana din bloc alimentează axele tubulare ale culbutorilor; prin orificii uleiul stropește culbutorii, camele și supapele, apoi se scurge spre baie prin canalele de retur."],
  presUlei: ["Manocontactul de presiune a uleiului", "Pe bloc, pe partea admisiei, lângă filtru. Contact normal închis: aprinde martorul de presiune sub ≈ 0,3…0,5 bar. În lucrare se demontează și în locul lui se montează manometrul de control."]
};
const NCOMP = Object.keys(COMP).length;
const ET3D = { carter: "baia de ulei", sorb: "sorb", pompa: "pompa de ulei", supapa: "supapa de siguranță", filtru: "filtrul", galerie: "galeria principală", lagare: "lagăre", came: "arborele cu came", presUlei: "manocontact" };
function alegeComp(k, focus = true) { if (!COMP[k]) return; sim.comp[k] = true; sim.selectat = k; $("#comp-desc").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}`; if (SV.m3d) SV.m3d.selecteaza(k, focus); actualizeazaPasi(); }

/** debitele relative: pompa (∝ n), prin motor (p/p_liniar) și prin supapa de siguranță */
function debite() {
  const pr = P(); if (!sim.merge && sim.n < 30) return { Q: 0, Qm: 0, Qr: 0, desch: 0 };
  const Q = sim.n / 3500, mu = Math.pow(MD.niu(pr, sim.T) / MD.niu(pr, 90), pr.m);
  let a = pr.a90, b = pr.b90; if (sim.defect === "lagare") { b *= sim.T > 70 ? 0.62 : 0.85; a *= 0.6; }
  const lin = Math.max(0.05, (a + b * sim.n / 1000) * mu * (sim.defect === "diluat" ? 0.72 : 1));
  const fr = cl(1 - sim.p / lin, 0, 1), rel = sim.defect === "supapa" ? 2.2 : pr.pRel;
  return { Q, Qm: Q * (1 - fr), Qr: Q * fr, desch: cl((sim.p - rel * 0.86) / (rel * 0.14), 0, 1) };
}

/* ------------------------------------------------------------------ macheta 3D (motorul K7J de pe stand, secționat) */
const SV = { m3d: null };
function porneste3D() {
  const el = $("#motor3d"); if (!el) return;
  import(BAZA_COMUN + "motor3d.js?v=15").then(m => { SV.m3d = m.creeazaStand(el, { interior: true, mod: "sectionat", etichete: ET3D, onSelect: k => alegeComp(k, false) }); })
    .catch(e => { el.innerHTML = `<p class="nota">Macheta 3D nu a putut fi încărcată (${esc(e.message)}): este necesar un browser cu WebGL. Componentele se pot alege din listă:</p><div class="rand-butoane">${Object.keys(COMP).map(k => `<button type="button" data-c3="${k}">${COMP[k][0]}</button>`).join("")}</div>`; $$("#motor3d [data-c3]").forEach(b => b.addEventListener("click", () => alegeComp(b.dataset.c3))); });
}
function actualizeaza3D() {
  if (!SV.m3d) { sim.vSw = sim.senzor ? 0 : 1; sim.vMan = sim.man ? 1 : 0; return; }
  SV.m3d.seteaza({ rpm: sim.n, tps: 0, selectat: sim.selectat, vent: false, tEv: sim.merge ? 380 : 120, eticheteVizibile: true,
    ulei: { ...debite(), p: sim.p, senzor: sim.senzor, man: sim.man, pAfis: sim.pAc, Tafis: sim.Tafis, term: true } });
  const us = SV.m3d.stare.uleiStare || { sw: sim.senzor ? 0 : 1, ad: sim.man ? 1 : 0 };
  sim.vSw = us.sw || 0; sim.vMan = us.ad || 0;
}

/* ------------------------------------------------------------------ aparatele de măsură (manometrul, termometrul, testerul OBD, panoul standului) */
function aparateSVG() {
  const Pf = "ap";
  let s = defsInstr(Pf) + `<defs>
    <linearGradient id="${Pf}-cauciuc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b3f44"/><stop offset="1" stop-color="#0d0f11"/></linearGradient>
    <linearGradient id="${Pf}-galben" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9a400"/><stop offset=".5" stop-color="#ffcf2e"/><stop offset="1" stop-color="#c79200"/></linearGradient>
    <radialGradient id="${Pf}-led" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe0d0"/><stop offset=".35" stop-color="#ff3b1f"/><stop offset="1" stop-color="#ff3b1f" stop-opacity="0"/></radialGradient>
    <radialGradient id="${Pf}-ledG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff1c8"/><stop offset=".35" stop-color="#ff9a1f"/><stop offset="1" stop-color="#ff9a1f" stop-opacity="0"/></radialGradient></defs>`;
  s += `<g id="ap-man"></g>`;
  // termometrul digital cu sondă K
  s += `<g transform="translate(270 22) scale(.86)" filter="url(#${Pf}-umbra)"><rect width="122" height="218" rx="18" fill="url(#${Pf}-galben)" stroke="#7a5a00"/><rect x="10" y="12" width="102" height="194" rx="11" fill="#2b2f34"/>
    <rect x="18" y="24" width="86" height="56" rx="5" fill="#a7b39b"/><text id="ap-T" x="98" y="64" text-anchor="end" font-size="27" font-family="'Courier New',monospace" font-weight="700" fill="#1d2618">--</text><text x="24" y="38" font-size="9" fill="#1d2618" font-weight="700">°C</text><text x="98" y="38" font-size="8" text-anchor="end" fill="#1d2618">T1  K</text>
    ${[[34, 112, "ON"], [88, 112, "HOLD"], [34, 150, "°C/°F"], [88, 150, "MAX"]].map(([x, y, t]) => `<rect x="${x - 20}" y="${y - 12}" width="40" height="24" rx="11" fill="#3e444a" stroke="#111"/><text x="${x}" y="${y + 4}" font-size="8" text-anchor="middle" fill="#d6dbe0">${t}</text>`).join("")}
    <text x="61" y="190" font-size="9" text-anchor="middle" fill="#ffcf2e" font-weight="700" letter-spacing="1">THERMOMETER</text></g>`;
  s += txt(322, 228, "termometru (sonda în tubul jojei)", { fs: 10 });
  // testerul OBD
  s += `<g transform="translate(430 22) scale(.86)" filter="url(#${Pf}-umbra)"><rect width="150" height="216" rx="14" fill="#1f2328" stroke="#000"/><rect x="10" y="12" width="130" height="102" rx="5" fill="#081521"/>
    <text x="20" y="32" font-size="9.5" fill="#7fb7e8">K7J · Date curente</text><text x="20" y="54" font-size="9" fill="#9fb3c6">Turație motor</text><text id="ap-n" x="130" y="82" text-anchor="end" font-size="26" font-family="'Courier New',monospace" font-weight="700" fill="#6dff8e">0</text><text x="130" y="100" text-anchor="end" font-size="9" fill="#9fb3c6">rot/min</text>
    <rect x="22" y="130" width="106" height="20" rx="4" fill="#2d333a"/><text x="75" y="144" font-size="9" text-anchor="middle" fill="#cfd5db">◀  OK  ▶</text><circle cx="75" cy="178" r="17" fill="#2d333a" stroke="#111"/><text x="75" y="182" font-size="9" text-anchor="middle" fill="#cfd5db">ESC</text></g>`;
  s += txt(494, 228, "tester OBD (turația)", { fs: 10 });
  // panoul standului: martorii din bord și cheia de contact
  s += `<g transform="translate(620 22) scale(.86)" filter="url(#${Pf}-umbra)"><rect width="146" height="216" rx="8" fill="#111417" stroke="#000"/>
    <rect x="12" y="14" width="122" height="70" rx="10" fill="#050607" stroke="#2b3035"/>
    <g transform="translate(42 50)"><circle r="22" fill="url(#${Pf}-led)" id="ap-halo" opacity="0"/><path id="ap-lampa" d="M-18,6 H6 L16,-2 L20,-1 L21,-4 L14,-5 L5,1 H-4 V-4 H2 V-7 H-10 V-4 H-6 V1 H-14 L-18,-2 Z M18,1 Q20,5 18,7 Q16,5 18,1 Z" fill="#2a1b0c" stroke="#3a2a10" stroke-width=".8"/></g>
    <g transform="translate(104 50)"><circle r="22" fill="url(#${Pf}-ledG)" id="ap-halo2" opacity="0"/><path id="ap-baterie" d="M-14,-8 h28 v16 h-28 z M-9,-12 v4 M9,-12 v4 M-10,0 h6 M4,0 h6 M7,-3 v6" fill="none" stroke="#2a1b0c" stroke-width="2"/></g>
    <text x="73" y="98" font-size="8.5" text-anchor="middle" fill="#9aa1a8">presiune ulei · încărcare</text>
    <circle cx="73" cy="152" r="34" fill="#2b3035" stroke="#000"/><circle cx="73" cy="152" r="24" fill="url(#${Pf}-crom)"/><g id="ap-cheie"><rect x="69" y="122" width="8" height="40" rx="2" fill="#1b1d20"/><rect x="62" y="116" width="22" height="14" rx="6" fill="#1b1d20"/></g>
    <text x="40" y="196" font-size="8" fill="#9aa1a8">0</text><text x="98" y="128" font-size="8" fill="#9aa1a8">I</text><text x="108" y="150" font-size="8" fill="#9aa1a8">II</text></g>`;
  s += txt(683, 228, "panoul standului", { fs: 10 });
  s += `<text id="ap-et" x="890" y="40" font-size="11" text-anchor="middle" font-weight="700" fill="currentColor"></text><text id="ap-et2" x="890" y="58" font-size="10" text-anchor="middle" fill="currentColor" opacity=".8"></text><text id="ap-st" x="890" y="110" font-size="12" text-anchor="middle" font-weight="700" fill="currentColor"></text>`;
  return s;
}
function construiesteAparate() { const el = $("#svg-ap"); if (el) el.innerHTML = aparateSVG(); }
function actualizeazaAparate() {
  const el = $("#svg-ap"); if (!el || !el.getClientRects().length) return;
  const pr = P(), g = $("#ap-man"), cx = 118, cy = 118, R = 84;
  g.innerHTML = sim.man && sim.vMan > 0.97
    ? `<circle cx="${cx}" cy="${cy}" r="${R + 18}" fill="url(#ap-cauciuc)"/>` + svgGauge("ap", cx, cy, R, 10, sim.pAc, { maj: 1, unit: "bar", marca: "OIL PRESSURE · GLYCERINE", s2: { max: 140, maj: 20, unit: "psi", f: 140 / 145.04 }, benzi: [[0, 0.5, "#d32f2f"]] }) + txt(cx, 238, "manometru de control 0…10 bar", { fs: 10 })
    : `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--linie)" stroke-dasharray="6 5"/>` + txt(cx, cy - 4, "manometrul de control", { fs: 11, f: "var(--text-sec)" }) + txt(cx, cy + 14, sim.man ? "se montează…" : "(nemontat)", { fs: 10, f: "var(--text-sec)" });
  $("#ap-T").textContent = fx(sim.Tafis, 1); $("#ap-n").textContent = fx(sim.nAfis, 0);
  const lampa = sim.contact && sim.senzor && sim.vSw < 0.02 && sim.p < pr.pSw, bat = sim.contact && !sim.merge;
  $("#ap-lampa").setAttribute("fill", lampa ? "#ff4a26" : "#2a1b0c"); $("#ap-halo").setAttribute("opacity", lampa ? 0.75 : 0);
  $("#ap-baterie").setAttribute("stroke", bat ? "#ffb02e" : "#2a1b0c"); $("#ap-halo2").setAttribute("opacity", bat ? 0.6 : 0);
  $("#ap-cheie").setAttribute("transform", `rotate(${sim.merge ? 75 : sim.contact ? 45 : 0} 73 152)`);
  const [a, b] = sim.senzor ? (sim.vSw > 0.002 ? ["se înșurubează manocontactul…", ""] : ["manocontactul montat", "fișa conectată"]) : sim.man ? (sim.vMan < 0.97 ? ["se înșurubează adaptorul…", ""] : ["manometrul montat", "în locul manocontactului"]) : (sim.vSw < 0.98 ? ["se deșurubează manocontactul…", ""] : ["racordul deschis", "nu porniți motorul!"]);
  $("#ap-et").textContent = a; $("#ap-et2").textContent = b;
  $("#ap-st").textContent = sim.merge ? `motor pornit – ${ET_REG[sim.reg]}` : sim.contact ? "contact pus" : "motor oprit";
}

/* ------------------------------------------------------------------ panoplia cu pompe de ulei (desene după piesele reale) */
const POMPE = {
  roti: ["Pompa cu roți dințate exterioare", "Două roți cu profil evolventic în angrenare: uleiul este transportat pe la periferie, în golurile dintre dinți și carcasă; în zona de angrenare dinții îl împing spre refulare. Robustă, debit ∝ turație; folosită la K7J."],
  rotor: ["Pompa cu rotor (gerotor)", "Rotor interior cu z = 4 dinți în rotor exterior cu z + 1 = 5 lobi, excentric; ambele se rotesc în același sens (raport 5:4), camerele dintre lobi cresc la aspirație și scad la refulare. Montată de obicei direct pe arborele cotit."],
  palete: ["Pompa cu palete și debit variabil", "Paletele din rotor sunt apăsate pe un inel pivotant; excentricitatea inelului dă cilindreea. Presiunea din galerie (sau o electrovalvă comandată de ECU) rotește inelul spre centru împotriva arcului: debitul scade – mai puțină putere absorbită."]
};
function panopliaSVG() {
  const Pf = "pn";
  let s = defsInstr(Pf) + `<defs><linearGradient id="${Pf}-al" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6e9ec"/><stop offset=".5" stop-color="#b8bfc6"/><stop offset="1" stop-color="#8a9198"/></linearGradient><linearGradient id="${Pf}-ot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f4f6"/><stop offset=".5" stop-color="#a9b0b7"/><stop offset="1" stop-color="#5b626a"/></linearGradient><radialGradient id="${Pf}-ul" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#c98f2e"/><stop offset="1" stop-color="#7a4c12"/></radialGradient></defs>`;
  s += `<rect x="4" y="4" width="992" height="262" rx="12" fill="#5d4a36" stroke="#2b2118"/><rect x="14" y="14" width="972" height="242" rx="8" fill="#e8e1d4"/>`;
  const panou = (cx, k) => { s += `<g data-pompa="${k}" style="cursor:pointer"><rect x="${cx - 150}" y="26" width="300" height="200" rx="10" fill="#f6f2ea" stroke="${sim.pompe[k] ? "#2e9e44" : "#b9ad95"}" stroke-width="${sim.pompe[k] ? 3 : 1.5}"/>`; };
  // roți dințate exterioare (profil evolventic, z = 10)
  const m = 7, z = 10, rp = m * z / 2;
  panou(170, "roti"); s += `<rect x="80" y="${120 - rp - m - 12}" width="180" height="${2 * rp + 2 * m + 24}" rx="34" fill="url(#${Pf}-al)" stroke="#555"/>
    <circle cx="${170 - rp}" cy="120" r="${rp + m + 1}" fill="url(#${Pf}-ul)"/><circle cx="${170 + rp}" cy="120" r="${rp + m + 1}" fill="url(#${Pf}-ul)"/>
    <rect x="160" y="${120 + rp - 4}" width="20" height="40" fill="url(#${Pf}-ul)"/><rect x="160" y="${120 - rp - 36}" width="20" height="40" fill="url(#${Pf}-ul)"/>
    <g id="pn-r1" transform="translate(${170 - rp} 120)"><path d="${profilEvolventa(z, m)}" fill="url(#${Pf}-ot)" stroke="#333"/><circle r="8" fill="#333"/></g><g id="pn-r2" transform="translate(${170 + rp} 120)"><path d="${profilEvolventa(z, m)}" fill="url(#${Pf}-ot)" stroke="#333"/><circle r="8" fill="#333"/></g>
    ${txt(170, 214, "roți dințate exterioare", { fs: 12, w: 700, f: "#2b2118" })}${txt(170, 42, "refulare ↑", { fs: 9, f: "#2b2118" })}</g>`;
  // gerotor: rotor exterior 5 lobi, rotor interior 4 dinți (profil conjugat aproximat), excentricitate e
  panou(500, "rotor"); s += `<circle cx="500" cy="120" r="84" fill="url(#${Pf}-al)" stroke="#555"/><path d="M430,120 A70,70 0 0 1 500,50 L500,78 A42,42 0 0 0 458,120 Z" fill="#c98f2e" opacity=".55"/><path d="M570,120 A70,70 0 0 1 500,190 L500,162 A42,42 0 0 0 542,120 Z" fill="#7a4c12" opacity=".55"/>
    <g id="pn-ext"><circle cx="500" cy="120" r="70" fill="url(#${Pf}-ot)" stroke="#333"/><path d="${(() => { let d = ""; for (let i = 0; i <= 200; i++) { const a = i / 200 * 2 * Math.PI, rr = 52 - 10 * Math.cos(5 * a); d += `${i ? "L" : "M"}${(500 + rr * Math.cos(a)).toFixed(1)},${(120 + rr * Math.sin(a)).toFixed(1)}`; } return d; })()}Z" fill="url(#${Pf}-ul)" stroke="#333"/></g>
    <g id="pn-int"><path d="${(() => { let d = ""; for (let i = 0; i <= 200; i++) { const a = i / 200 * 2 * Math.PI, rr = 40 - 9 * Math.cos(4 * a); d += `${i ? "L" : "M"}${(rr * Math.cos(a)).toFixed(1)},${(rr * Math.sin(a)).toFixed(1)}`; } return d; })()}Z" fill="url(#${Pf}-ot)" stroke="#333"/><circle r="11" fill="#333"/><rect x="-3" y="-13" width="6" height="5" fill="#111"/></g>
    ${txt(500, 214, "rotor (gerotor) 4/5", { fs: 12, w: 700, f: "#2b2118" })}</g>`;
  // palete cu inel pivotant
  panou(830, "palete"); s += `<circle cx="830" cy="120" r="84" fill="url(#${Pf}-al)" stroke="#555"/><g id="pn-inelG"><circle id="pn-inel" cx="842" cy="120" r="62" fill="url(#${Pf}-ul)" stroke="#2b2f34" stroke-width="8"/></g>
    <g id="pn-rot"></g><path id="pn-arcV" d="" stroke="#c62828" stroke-width="2.6" fill="none"/>${txt(830, 214, "palete – debit variabil", { fs: 12, w: 700, f: "#2b2118" })}</g>`;
  return s;
}
function construiestePanoplia() {
  const el = $("#svg-pan"); if (!el) return; el.innerHTML = panopliaSVG();
  $$("#svg-pan [data-pompa]").forEach(g => g.addEventListener("click", () => { const k = g.dataset.pompa; sim.pompe[k] = true; $("#pompa-desc").innerHTML = `<b>${POMPE[k][0]}.</b> ${POMPE[k][1]}`; construiestePanoplia(); actualizeazaPasi(); }));
}
function animaPanoplia(dt) {
  if (!$("#pn-r1") || !$("#svg-pan").getClientRects().length) return; sim.rotP = (sim.rotP || 0) + dt * 40;
  const a = sim.rotP, z = 10, rp = 35;
  $("#pn-r1").setAttribute("transform", `translate(${170 - rp} 120) rotate(${a.toFixed(2)})`); $("#pn-r2").setAttribute("transform", `translate(${170 + rp} 120) rotate(${(180 + 180 / z - a).toFixed(2)})`);
  // gerotor: interiorul (4 dinți) se rotește în jurul centrului deplasat cu e; exteriorul (5 lobi) cu 4/5 din viteză
  const e = 10; $("#pn-int").setAttribute("transform", `translate(${500 + e} 120) rotate(${a.toFixed(2)})`); $("#pn-ext").setAttribute("transform", `rotate(${(a * 4 / 5).toFixed(2)} 500 120)`);
  // palete: excentricitatea inelului scade cu presiunea (comandă hidraulică), paletele ating mereu inelul
  const ex = 12 * (1 - 0.7 * cl((sim.p - 1.5) / 3, 0, 1)), Rr = 58; $("#pn-inel").setAttribute("cx", 830 + ex);
  let g = `<circle cx="830" cy="120" r="34" fill="url(#pn-ot)" stroke="#333"/>`;
  for (let i = 0; i < 7; i++) { const u = (a + i * 360 / 7) * RAD, dd = ex * Math.cos(u) + Math.sqrt(Rr * Rr - ex * ex * Math.sin(u) * Math.sin(u)) - 1;
    g += `<rect x="24" y="-3.5" width="${(dd - 24).toFixed(1)}" height="7" fill="#d5dade" stroke="#444" stroke-width=".7" transform="translate(830 120) rotate(${(a + i * 360 / 7).toFixed(2)})"/>`; }
  g += `<circle cx="830" cy="120" r="9" fill="#333"/>`; $("#pn-rot").innerHTML = g;
  let d = `M${905 + ex * 0},${120}`; for (let i = 1; i <= 8; i++) d += ` L${(905 + ex + (960 - 905 - ex) * i / 8).toFixed(1)},${120 + (i % 2 ? -7 : 7)}`; $("#pn-arcV").setAttribute("d", d);
}

/* ------------------------------------------------------------------ multimetrul (verificarea manocontactului) */
function rSw() { if (!sim.senzor || !sim.mm) return null; return sim.merge && sim.p > P().pSw ? "OL" : P().rSw; }
function desenMultimetru() {
  const el = $("#svg-mm"); if (!el) return;
  const Pf = "mm", R = rSw();
  let s = defsInstr(Pf) + `<defs><linearGradient id="${Pf}-galben" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9a400"/><stop offset=".5" stop-color="#ffcf2e"/><stop offset="1" stop-color="#c79200"/></linearGradient></defs>`;
  s += `<g filter="url(#${Pf}-umbra)"><rect x="40" y="16" width="200" height="300" rx="22" fill="url(#${Pf}-galben)" stroke="#7a5a00"/><rect x="56" y="30" width="168" height="270" rx="12" fill="#2b2f34"/></g>`;
  s += `<rect x="70" y="44" width="140" height="64" rx="6" fill="#a7b39b"/>${txt(200, 92, R == null ? "" : R === "OL" ? "0.L" : fx(R, 2), { fs: 34, a: "end", w: 700, f: "#1d2618", fam: "'Courier New',monospace" })}${txt(78, 60, "Ω", { fs: 13, a: "start", f: "#1d2618", w: 700 })}`;
  s += `<circle cx="140" cy="190" r="48" fill="#16191d" stroke="#000"/><circle cx="140" cy="190" r="34" fill="#3a3f45"/><rect x="136" y="150" width="8" height="34" rx="3" fill="#ffd36b" transform="rotate(-30 140 190)"/>${txt(140, 132, "V~  V⎓  Ω  ⧉", { fs: 10, f: "#cfd5db" })}${txt(92, 160, "Ω", { fs: 13, f: "#ffd36b", w: 700 })}`;
  s += `<circle cx="100" cy="270" r="11" fill="#111" stroke="#c62828" stroke-width="3"/><circle cx="180" cy="270" r="11" fill="#111" stroke="#333" stroke-width="3"/>${txt(100, 294, "VΩ", { fs: 9, f: "#cfd5db" })}${txt(180, 294, "COM", { fs: 9, f: "#cfd5db" })}`;
  // manocontactul pe bloc, cu fișa și firele multimetrului
  s += `<rect x="460" y="150" width="200" height="120" fill="url(#${Pf}-crom)" opacity=".6" stroke="#666"/>${txt(560, 290, "blocul motor (masă)", { fs: 10 })}`;
  s += `<rect x="520" y="110" width="40" height="44" rx="4" fill="#2b2f34" stroke="#000"/><rect x="530" y="96" width="20" height="16" fill="#c9a043"/>${txt(600, 104, sim.senzor ? "manocontact montat" : "manocontact demontat", { fs: 10.5, a: "start", w: 700 })}`;
  if (sim.mm) s += `<path d="M100,270 C200,330 420,60 540,98" stroke="#c62828" stroke-width="4" fill="none"/><path d="M180,270 C260,340 420,300 600,240" stroke="#1b1b1b" stroke-width="4" fill="none"/><circle cx="600" cy="240" r="7" fill="#2b2f34" stroke="#000"/>`;
  s += txt(560, 60, sim.merge ? `motor pornit · p = ${fx(sim.p, 2)} bar` : "motor oprit · p = 0", { fs: 12, w: 700 }) + txt(560, 330, R == null ? "" : R === "OL" ? "contact deschis (presiune peste prag) – martorul stins" : "contact închis (fără presiune) – martorul aprins", { fs: 11.5, w: 600 });
  el.innerHTML = s;
}

/* ------------------------------------------------------------------ graficul în timp real */
function deseneazaLive() {
  const cv = $("#cv-live"); if (!cv || !cv.getClientRects().length) return;
  const t = Cadru.D.t, nR = num(Cadru.D.date.nRal) || P().nRal, serii = [];
  MD.TEMP.forEach((T, j) => { const pts = MD.TURATII.map(k => [k === "ral" ? nR : MD.NREG[k], num(t.t41["t" + T][k])]).filter(p => Number.isFinite(p[1])); if (pts.length) serii.push({ tip: "linie", pts, culoare: j }, { tip: "pct", pts, culoare: j }); });
  serii.push({ tip: "pct", pts: [[sim.n, sim.p]], culoare: 4, r: 7 });
  serii.push({ tip: "linie", pts: [[0, 0.5], [4000, 0.5]], culoare: css("--text-sec"), punctat: true, gros: 1 });
  deseneazaGrafic(cv, { xmin: 0, xmax: 4000, ymin: 0, ymax: 6, xticks: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000], yticks: [0, 1, 2, 3, 4, 5, 6], xlab: "n [rot/min]", ylab: "p ulei [bar]", serii });
}

/* ------------------------------------------------------------------ pașii lucrării */
const pe = (r, c) => Cadru.D.t.t41[r][c] !== "";
const PASI = [
  { t: "Identificarea", tab: "panoplia cu pompe, Fig. 4.1", panou: "pan",
    instr: ["NSSM: mănuși de nitril și ochelari; uleiul cald (80…110 °C) provoacă arsuri.", "Pe panoplie, faceți clic pe fiecare tip de pompă de ulei (roți dințate, rotor, debit variabil).", "Pe macheta 3D a motorului (secționată sau transparentă), identificați elementele circuitului de ungere din Fig. 4.1 – clic pe ele sau pe etichete; rotiți macheta pentru a le vedea din alte unghiuri."],
    ver: () => [[sim.manusi && sim.ochelari, "mănuși și ochelari"], [Object.keys(sim.pompe).length >= 3, `pompe identificate: ${Object.keys(sim.pompe).length}/3`], [Object.keys(sim.comp).length >= 7, `elemente ale circuitului: ${Object.keys(sim.comp).length}/${NCOMP} (minim 7)`]],
    prog: () => (sim.manusi && sim.ochelari ? 1 : 0) + (Object.keys(sim.pompe).length >= 3 ? 1 : 0) + (Object.keys(sim.comp).length >= 7 ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><label class="bifa"><input type="checkbox" id="ck-man"> Mănuși de nitril</label><label class="bifa"><input type="checkbox" id="ck-och"> Ochelari</label></div>` },
  { t: "Montarea manometrului", tab: "motor rece, oprit", panou: "stand",
    instr: ["Cu motorul rece și oprit, deconectați fișa și demontați manocontactul de presiune de pe galeria principală.", "Montați manometrul 0…10 bar cu adaptorul potrivit; fixați furtunul departe de curea și de colectorul de evacuare.", "Porniți scurt motorul și verificați etanșarea racordului."],
    ver: () => [[!sim.senzor, "manocontactul demontat"], [sim.man, "manometrul montat"], [sim.etans, "etanșarea verificată"]],
    prog: () => (!sim.senzor ? 1 : 0) + (sim.man ? 1 : 0) + (sim.etans ? 1 : 0), tot: 3,
    ctl: `<div class="rand-butoane"><button type="button" id="b-sw">Demontează manocontactul</button><button type="button" id="b-man">Montează manometrul</button></div><div class="rand-butoane"><button type="button" id="b-etans">Pornește scurt și verifică etanșarea</button></div>` },
  { t: "Presiunea la încălzire", tab: "Tabelul 4.1 – 40, 60, 80 °C", panou: "stand",
    instr: ["Porniți motorul: uleiul se încălzește (cu atât mai repede cu cât turația e mai mare; „timp accelerat” ×10).", "La 40 °C (±2,5 °C) citiți presiunea la toate turațiile, de la ralanti la 3500 rot/min (pentru palierul supapei de siguranță) – rapid, temperatura crește.", "La 60 și 80 °C citiți presiunea la ralanti și la 2000 rot/min."],
    ver: () => [[sim.man, "manometrul montat"], [sim.merge, sim.merge ? `motor pornit – ${ET_REG[sim.reg]}` : "motorul oprit"], [randT(sim.T) != null, randT(sim.T) != null ? `ulei ${fx(sim.T, 1)} °C – rândul ${randT(sim.T)} °C` : `ulei ${fx(sim.T, 1)} °C – în afara rândurilor (40/60/80/90 ±2,5 °C)`], [stabil(), stabil() ? "presiune stabilă" : "stabilizare…"]],
    prog: () => MD.TURATII.filter(k => pe("t40", k)).length + ["t60", "t80"].reduce((a, r) => a + ["ral", "n2000"].filter(k => pe(r, k)).length, 0), tot: 10,
    ctl: `<div class="rand-butoane"><button type="button" id="b-contact">Contact</button><button type="button" class="primar" id="b-porn">Pornește motorul</button><button type="button" id="b-stop">Oprește</button></div>
      <div class="rand-butoane">${MD.TURATII.map(k => `<button type="button" data-reg="${k}">${k === "ral" ? "ralanti" : MD.NREG[k]}</button>`).join("")}</div>
      <label class="bifa"><input type="checkbox" id="ck-rapid"> Timp accelerat ×10 (încălzirea)</label>`,
    buton: ["● Presiunea → Tabelul 4.1", e => inregP(e)] },
  { t: "Caracteristica la 90 °C", tab: "Tabelul 4.1 – 90 °C", panou: "stand",
    instr: ["Lăsați uleiul să ajungă la ≈ 90 °C.", "Citiți presiunea la toate turațiile, de la ralanti la 3500 rot/min: caracteristica completă p = f(n)."],
    ver: () => [[sim.merge, "motor pornit"], [Math.abs(sim.T - 90) <= 2.5, `ulei ${fx(sim.T, 1)} °C (90 ± 2,5)`], [stabil(), stabil() ? "presiune stabilă" : "stabilizare…"]],
    prog: () => MD.TURATII.filter(k => pe("t90", k)).length, tot: 6,
    ctl: `<div class="rand-butoane">${MD.TURATII.map(k => `<button type="button" data-reg="${k}">${k === "ral" ? "ralanti" : MD.NREG[k]}</button>`).join("")}</div><label class="bifa"><input type="checkbox" id="ck-rapid2"> Timp accelerat ×10</label>`,
    buton: ["● Presiunea → Tabelul 4.1", e => inregP(e)] },
  { t: "Manocontactul", tab: "Tabelul 4.2", panou: "mm",
    instr: ["Opriți motorul și așteptați răcirea uleiului sub 50 °C (NSSM: nu se desface nimic la cald).", "Demontați manometrul și remontați manocontactul (verificați etanșarea).", "Cu multimetrul pe Ω: la motor oprit contactul trebuie să fie închis (≈ 0 Ω, martorul aprins); cu motorul pornit – deschis (0.L)."],
    ver: () => [[!sim.merge || sim.senzor, sim.merge ? "motor pornit" : "motor oprit"], [sim.T < 50 || sim.senzor, `ulei ${fx(sim.T, 1)} °C (< 50 °C pentru remontare)`], [sim.senzor && !sim.man, "manocontactul remontat"], [sim.mm, "multimetrul conectat (Ω)"]],
    prog: () => ["oprit", "pornit"].filter(k => Cadru.D.t.t42[k].R !== "").length, tot: 2,
    ctl: `<div class="rand-butoane"><button type="button" id="b-stop2">Oprește motorul</button><label class="bifa"><input type="checkbox" id="ck-rapid3"> Timp accelerat ×10 (răcirea)</label></div>
      <div class="rand-butoane"><button type="button" id="b-man2">Demontează manometrul</button><button type="button" id="b-sw2">Remontează manocontactul</button></div>
      <div class="rand-butoane"><button type="button" id="b-mm">Conectează multimetrul</button><button type="button" id="b-porn2">Pornește motorul (ralanti)</button></div>`,
    buton: ["● Rezistența → Tabelul 4.2", e => inregSw(e)] }
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
  $("#panou-pan").hidden = p.panou !== "pan"; $("#panou-mm").hidden = p.panou !== "mm";
  if (SV.m3d && i === 0) SV.m3d.vedere([-0.26, 0.4, 1.45], [0, 0.06, 0]);
  desenMultimetru(); actualizeazaPasi();
}
function actualizeazaPasi() {
  if (!$("#pasi")) return;
  PASI.forEach((p, i) => { const el = $(`#pasi [data-pas="${i}"]`), n = p.prog(); el.querySelector(".pas-prog").textContent = `${n}/${p.tot}`; el.classList.toggle("gata", n >= p.tot); });
  $(`#pasi [data-pas="${pasActiv}"] .pas-ver`).innerHTML = PASI[pasActiv].ver().map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
  const s = (id, on, t1, t0) => { const b = $(id); if (b) { b.textContent = on ? t1 : t0; b.classList.toggle("activ", !!on); } };
  s("#b-sw", !sim.senzor, "✓ Manocontact demontat", "Demontează manocontactul"); s("#b-man", sim.man, "✓ Manometru montat", "Montează manometrul"); s("#b-etans", sim.etans, "✓ Etanș", "Pornește scurt și verifică etanșarea");
  s("#b-contact", sim.contact, "Contact: pus", "Contact: luat"); s("#b-man2", !sim.man, "✓ Manometru demontat", "Demontează manometrul"); s("#b-sw2", sim.senzor, "✓ Manocontact montat", "Remontează manocontactul"); s("#b-mm", sim.mm, "✓ Multimetru conectat", "Conectează multimetrul");
  $$("[data-reg]").forEach(b => b.classList.toggle("activ", sim.merge && b.dataset.reg === sim.reg));
  $("#af-st").textContent = sim.merge ? "motor pornit" : sim.contact ? "contact pus" : "contact luat"; $("#af-n").textContent = fx(sim.n, 0); $("#af-T").textContent = fx(sim.T, 1);
  $("#af-p").textContent = sim.man ? fx(sim.p, 2) : "—"; $("#af-r").textContent = randT(sim.T) != null ? `${randT(sim.T)} °C` : "—";
}

/* ------------------------------------------------------------------ comenzile */
function on(id, f) { const b = $(id); if (b) b.addEventListener("click", f); }
function porneste() {
  if (!sim.manusi) return Cadru.mesajTemporar("NSSM: mănuși și ochelari (pasul 1).", "atentie");
  if (!sim.senzor && !sim.man) return Cadru.mesajTemporar("NSSM: racordul senzorului este deschis – montați manometrul sau remontați manocontactul (uleiul ar țâșni).", "pericol");
  sim.contact = true; sim.merge = true; sim.reg = "ral";
}
function opreste() { sim.merge = false; }
function legaComenzi() {
  $("#ck-man").addEventListener("change", e => { sim.manusi = e.target.checked; }); $("#ck-och").addEventListener("change", e => { sim.ochelari = e.target.checked; });
  ["#ck-rapid", "#ck-rapid2", "#ck-rapid3"].forEach(id => $(id).addEventListener("change", e => { sim.rapid = e.target.checked; ["#ck-rapid", "#ck-rapid2", "#ck-rapid3"].forEach(j => $(j).checked = sim.rapid); }));
  const rece = () => { if (sim.merge) { Cadru.mesajTemporar("NSSM: se lucrează la racord numai cu motorul oprit.", "pericol"); return false; } if (sim.T > 50) { Cadru.mesajTemporar(`NSSM: uleiul are ${fx(sim.T, 0)} °C – nu se desface nimic la cald (așteptați răcirea sub 50 °C).`, "pericol"); return false; } if (!sim.manusi) { Cadru.mesajTemporar("Mănuși de nitril.", "atentie"); return false; } return true; };
  on("#b-sw", () => { if (!rece()) return; if (sim.man) return Cadru.mesajTemporar("Pe racord este montat manometrul.", "atentie"); sim.senzor = !sim.senzor; sim.mm = false; if (!sim.senzor) sim.dripLeft = 5; });
  on("#b-man", () => { if (!rece()) return; if (sim.senzor) return Cadru.mesajTemporar("Demontați întâi manocontactul.", "atentie"); sim.man = !sim.man; sim.etans = false; });
  on("#b-etans", () => { if (!sim.man) return Cadru.mesajTemporar("Montați manometrul.", "atentie"); porneste(); if (sim.merge) { sim.etans = true; Cadru.mesajTemporar("Racordul manometrului este etanș (fără scurgeri).", "ok"); } });
  on("#b-contact", () => { if (sim.merge) return opreste(); sim.contact = !sim.contact; });
  on("#b-porn", porneste); on("#b-porn2", () => { if (!sim.senzor) return Cadru.mesajTemporar("Remontați manocontactul.", "atentie"); porneste(); });
  on("#b-stop", opreste); on("#b-stop2", opreste);
  on("#b-man2", () => { if (!rece()) return; if (!sim.man) return; sim.man = false; });
  on("#b-sw2", () => { if (!rece()) return; if (sim.man) return Cadru.mesajTemporar("Demontați întâi manometrul.", "atentie"); sim.senzor = true; });
  on("#b-mm", () => { if (!sim.senzor) return Cadru.mesajTemporar("Remontați manocontactul.", "atentie"); sim.mm = !sim.mm; sim.contact = sim.contact; });
  $$("[data-reg]").forEach(b => b.addEventListener("click", () => { if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie"); sim.reg = b.dataset.reg; actualizeazaPasi(); }));
}

/* ------------------------------------------------------------------ înregistrările */
function msg(t) { $("#msg-inreg").textContent = t; }
function inregP(e) {
  if (!sim.man) return Cadru.mesajTemporar("Montați manometrul (pasul 2).", "atentie");
  if (!sim.merge) return Cadru.mesajTemporar("Porniți motorul.", "atentie");
  if (!stabil()) return Cadru.mesajTemporar("Așteptați stabilizarea turației și a presiunii.", "atentie");
  const T = Math.round(sim.T * 10) / 10, r = randT(T); if (r == null) return Cadru.mesajTemporar(`Uleiul are ${fx(T, 1)} °C: citirile se fac la 40, 60, 80 sau 90 °C (± 2,5 °C).`, "atentie");
  const p = Math.round(sim.p * 100) / 100, n = Math.round(sim.n), k = sim.reg;
  const ok = Cadru.inregistreaza(e, { log: { m: "p", k, n, T, p }, celule: [{ t: "t41", r: "t" + r, c: k, v: p.toFixed(2) }] });
  if (ok) { msg(`Tabelul 4.1 (${r} °C, ${ET_REG[k]}): p = ${fx(p, 2)} bar (ulei ${fx(T, 1)} °C, n = ${n} rot/min).`); deseneazaLive(); }
}
function inregSw(e) {
  const R = rSw(); if (R == null) return Cadru.mesajTemporar("Remontați manocontactul și conectați multimetrul.", "atentie");
  const st = sim.merge ? "pornit" : "oprit"; if (sim.merge && !stabil()) return Cadru.mesajTemporar("Așteptați stabilizarea presiunii.", "atentie");
  const v = R === "OL" ? "OL" : R.toFixed(2);
  const ok = Cadru.inregistreaza(e, { log: { m: "sw", st, R: v }, celule: [{ t: "t42", r: st, c: "R", v }] });
  if (ok) msg(`Tabelul 4.2 (motor ${st}): R = ${v === "OL" ? "0.L (circuit deschis)" : fx(R, 2) + " Ω"}.`);
}

/* ------------------------------------------------------------------ calculele determinărilor */
function calculeazaSAA4(D) {
  const t = D.t, o = MD.prelucreaza(t, D.date, { num, regresie }), cel = { t41: {}, t42: {} }, rele = { t41: {}, t42: {} };
  MD.TEMP.forEach(T => { cel.t41["t" + T] = { panta: fx(o.panta[T], 2) }; });
  const Rof = t.t42.oprit.R, Ron = t.t42.pornit.R;
  cel.t42.oprit = { lampa: Rof === "" ? "" : "aprins", concl: Rof === "" ? "" : num(Rof) < 2 ? "contact închis – corect" : "contact întrerupt – manocontact defect" };
  cel.t42.pornit = { lampa: Ron === "" ? "" : Ron === "OL" ? "stins" : "aprins", concl: Ron === "" ? "" : Ron === "OL" ? "contact deschis peste prag – corect" : "contact închis cu presiune – manocontact sau presiune prea mică" };
  rele.t42.oprit = { concl: Rof !== "" && !(num(Rof) < 2) }; rele.t42.pornit = { concl: Ron !== "" && Ron !== "OL" };
  const p90 = o.pRal90, b90 = o.panta[90];
  const rez = [
    ["Panta Δp/Δn la 90 °C (zona liniară)", Number.isFinite(b90) ? `<span style='color:var(--accent)'>${fx(b90, 3)} bar/1000 rot/min</span>` : "—"],
    ["Panta la 40 / 60 / 80 °C", MD.TEMP.slice(0, 3).map(T => fx(o.panta[T], 2)).join(" / ") + " bar/1000 rot/min"],
    ["Presiunea la ralanti cald (90 °C)", Number.isFinite(p90) ? `${fx(p90, 2)} bar` : "—"],
    ["Palierul supapei de siguranță (40 °C) și turația de deschidere", Number.isFinite(o.nDesch) ? `${fx(o.palier, 2)} bar de la ≈ ${fx(o.nDesch, 0)} rot/min` : "—"],
    ["Raportul p(2000, 40 °C) / p(2000, 90 °C)", fx(o.raport, 2)],
    ["Vâscozitatea uleiului 5W-30 la 40 / 90 °C (Walther)", `${fx(MD.niu(P(), 40), 1)} / ${fx(MD.niu(P(), 90), 1)} mm²/s`]
  ];
  const verdicte = [];
  if (Number.isFinite(b90)) verdicte.push(b90 >= 0.7 ? { tip: "ok", text: `La cald presiunea crește cu ${fx(b90, 2)} bar la fiecare 1000 rot/min (≥ 0,7 – regula practică): pompa și lagărele în stare bună.` } : { tip: "atentie", text: `Panta la cald ${fx(b90, 2)} bar/1000 rot/min este sub 0,7: lagăre uzate sau ulei diluat.` });
  if (Number.isFinite(p90)) verdicte.push(p90 > 0.8 ? { tip: "ok", text: `La ralanti cald p = ${fx(p90, 2)} bar – clar peste pragul de avertizare (0,3…0,5 bar).` } : { tip: "atentie", text: `La ralanti cald p = ${fx(p90, 2)} bar – prea aproape de pragul martorului.` });
  if (Number.isFinite(o.raport)) verdicte.push({ tip: "ok", text: `La 40 °C presiunea este de ${fx(o.raport, 2)} ori mai mare decât la 90 °C: vâscozitatea scade de ${fx(MD.niu(P(), 40) / MD.niu(P(), 90), 1)} ori.` });
  const nR = num(D.date.nRal) || P().nRal, serii = [], leg = [];
  MD.TEMP.forEach((T, j) => { const pts = MD.TURATII.map(k => [k === "ral" ? nR : MD.NREG[k], num(t.t41["t" + T][k])]).filter(p => Number.isFinite(p[1])); if (pts.length) { serii.push({ tip: "linie", pts, culoare: j }, { tip: "pct", pts, culoare: j }); leg.push([`ulei ${T} °C`, `var(--serie-${j})`, "pct"]); } });
  serii.push({ tip: "linie", pts: [[0, 0.5], [4000, 0.5]], culoare: css("--text-sec"), punctat: true, gros: 1 }); leg.push(["prag de avertizare ≈ 0,5 bar", "var(--text-sec)"]);
  return { celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Caracteristica presiunii uleiului p = f(n) la diferite temperaturi (Fig. 4.2 cu valorile proprii)",
    grafic: { xmin: 0, xmax: 4000, ymin: 0, ymax: 6, xticks: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000], yticks: [0, 1, 2, 3, 4, 5, 6], xlab: "n [rot/min]", ylab: "p ulei [bar]", serii }, legenda: leg,
    principal: { eticheta: "panta la 90 °C [bar/1000 rot/min]", valoare: Number.isFinite(b90) ? +b90.toFixed(3) : null } };
}

/* ------------------------------------------------------------------ conținut didactic */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>Manometrul se montează în locul senzorului de presiune numai cu motorul rece și oprit; înainte de pornire se verifică etanșarea racordului.</li>
<li>Uleiul cald (80…110 °C) provoacă arsuri: nu se desface niciun element al circuitului de ungere cu motorul cald; se folosesc mănuși de nitril.</li>
<li>Uleiul scurs se colectează imediat (pericol de alunecare); uleiul uzat și lavetele îmbibate se depun în recipientele destinate deșeurilor periculoase.</li>
<li>Furtunul manometrului se fixează departe de curea și de colectorul de evacuare.</li></ul></div>
<h2>4.1. Scopul lucrării</h2>
<p>Determinarea experimentală a presiunii uleiului în funcție de turație și temperatură și verificarea senzorului sau manocontactului de presiune. Se analizează rolul pompelor de ulei cu debit variabil în reducerea consumului de combustibil.</p>
<h2>4.2. Noțiuni teoretice</h2>
<p>Sistemul de ungere sub presiune asigură formarea peliculei portante în lagăre, răcirea pistoanelor (duze de răcire), ungerea turbosuflantei (la motoarele supraalimentate) și alimentarea elementelor hidraulice (tachete, variatorul de fază). Pompa antrenată de motor are debitul proporțional cu turația; presiunea este limitată de supapa de siguranță. Presiunea depinde de rezistența hidraulică a circuitului și de vâscozitatea uleiului, care scade puternic cu temperatura.</p>
<figure><img src="img/fig4_1.jpg" alt="Fig. 4.1 Schema circuitului de ungere și punctele de măsură" loading="lazy"><figcaption>Fig. 4.1. Schema circuitului de ungere și punctele de măsură</figcaption></figure>
<div class="ec"><span>Q<sub>p</sub> = V<sub>g</sub>·n·η<sub>v</sub> &nbsp;·&nbsp; p ≈ Q·R(ν) ≤ p<sub>supapă</sub></span><span class="nr">(4.1)</span></div>
<p>Motoarele actuale folosesc pompe cu debit variabil (cu palete și inel excentric sau cu două trepte de presiune), comandate de ECU: presiunea se menține redusă la sarcini mici, reducând puterea absorbită de pompă, și se ridică la sarcini și turații mari. Uleiurile de vâscozitate redusă (0W-20, 0W-16) au același scop.</p>
<figure><img src="img/fig4_2.jpg" alt="Fig. 4.2 Caracteristica presiunii uleiului" loading="lazy"><figcaption>Fig. 4.2. Caracteristica presiunii uleiului (exemplu)</figcaption></figure>
<p>Vâscozitatea cinematică a uleiului în funcție de temperatură urmează relația Walther (ca la Mecanica fluidelor, lucrarea 1): lg lg(ν + 0,7) = A + B·lg T. Pentru un ulei 5W-30, ν scade de ≈ 4,5 ori între 40 și 90 °C; rezistența lagărelor (regim mixt) și scăpările pompei fac ca presiunea să scadă mai puțin decât vâscozitatea.</p>
<h2>4.3. Aparatură și echipamente</h2>
<ul><li>Stand motor K7J cu racord pentru senzorul de presiune a uleiului</li><li>Manometru de ulei 0…10 bar cu set de adaptoare</li><li>Termometru (sondă în locul jojei)</li><li>Tester OBD (turația), multimetru</li><li>Panoplie cu pompe de ulei (cu roți dințate, cu rotor, cu debit variabil)</li></ul>
<h2>4.4. Modul de lucru (în simulator)</h2>
<p>Urmați pașii din panoul „Desfășurarea lucrării”: identificarea pompelor și a circuitului, montarea manometrului cu motorul rece, citirile la 40 °C (toată caracteristica), 60 și 80 °C (ralanti și 2000 rot/min), caracteristica completă la 90 °C și verificarea manocontactului cu multimetrul, după răcire.</p>
<h2>4.6. Prelucrarea datelor</h2>
<p>Se trasează p = f(n) pentru fiecare temperatură. Se calculează panta Δp/Δn [bar/1000 rot/min] în zona de creștere liniară (regresie liniară) și turația la care se deschide supapa de siguranță (intersecția dreptei cu palierul).</p>
<h2>4.7. Interpretarea rezultatelor</h2>
<ul><li>Regula practică: pentru motorul cald sunt necesari aproximativ 0,7 bar la fiecare 1000 rot/min; la ralanti cald presiunea trebuie să fie clar peste pragul de avertizare (≈ 0,3…0,5 bar).</li>
<li>Presiunea scăzută la cald și normală la rece indică uzura lagărelor sau ulei diluat cu combustibil; presiunea mare la rece este normală (vâscozitate mare).</li>
<li>La pompele cu debit variabil apare un salt de presiune la comutarea treptei, vizibil pe caracteristică.</li></ul>
<h2>4.8. Relevanță practică</h2>
<p>Reducerea pierderilor mecanice prin managementul ungerii (pompe variabile, uleiuri de vâscozitate mică) este o direcție activă de cercetare și proiectare pentru respectarea limitelor de CO₂.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu (Fig. 4.2)</h2>
<p>La 90 °C presiunea crește de la ≈ 1,25 bar la ralanti (800 rot/min) la ≈ 2,6 bar la 2500 rot/min: panta = (2,6 − 1,25)/(2,5 − 0,8) = 0,79 bar/1000 rot/min ≥ 0,7 – motor în stare bună. La 40 °C dreapta atinge palierul supapei de siguranță (5 bar) la ≈ 3700 rot/min.</p>
<div class="problema"><h3>Problema 1</h3><p>Pe dreapta de la 40 °C presiunea este 2,0 bar la 800 rot/min și 3,5 bar la 2000 rot/min; supapa de siguranță limitează la 4,7 bar. La ce turație se deschide supapa?</p>
<details class="sol"><summary>Rezolvare</summary><p>Panta = (3,5 − 2,0)/(2,0 − 0,8) = 1,25 bar/1000 rot/min; n = 0,8 + (4,7 − 2,0)/1,25 = 2,96 → ≈ 2960 rot/min. Peste această turație surplusul de debit se întoarce în carter prin supapă.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Pompa cu roți dințate are cilindreea V<sub>g</sub> = 12 cm³/rot și randamentul volumetric 0,85. Ce debit dă la 3000 rot/min? Ce putere absoarbe la 4 bar (randament total 0,6)?</p>
<details class="sol"><summary>Rezolvare</summary><p>Q = 12·3000·0,85 = 30 600 cm³/min = 30,6 l/min = 5,1·10⁻⁴ m³/s; P = Q·p/η = 5,1·10⁻⁴·4·10⁵/0,6 = 340 W. O pompă cu debit variabil care menține 2 bar la sarcini mici absoarbe ≈ jumătate – reducere de consum ≈ 1 %.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Motorul cald are la ralanti 0,6 bar și la 2000 rot/min 1,1 bar, iar la rece valori normale. Ce concluzie trageți?</p>
<details class="sol"><summary>Rezolvare</summary><p>Panta la cald = 0,5/1,2 = 0,42 bar/1000 rot/min, mult sub 0,7: lagăre uzate (joc mărit) sau ulei diluat cu combustibil (vâscozitate mică). Se verifică nivelul și mirosul uleiului, apoi jocul în lagăre.</p></details></div>`;
}
const INTREBARI = [
  ["De ce presiunea uleiului scade când crește temperatura?", "Vâscozitatea uleiului scade puternic cu temperatura (relația Walther): rezistența hidraulică a lagărelor scade, iar scăpările interne ale pompei cresc, deci la același debit presiunea este mai mică."],
  ["Care este rolul supapei de siguranță și al supapei de bypass a filtrului?", "Supapa de siguranță limitează presiunea maximă (palierul) și protejează filtrul și garniturile, mai ales la rece. Supapa de bypass ocolește filtrul colmatat sau uleiul rece foarte vâscos, pentru ca lagărele să nu rămână fără ulei."],
  ["Ce avantaj aduce o pompă de ulei cu debit variabil?", "Livrează doar debitul necesar: presiune mică la sarcini mici (putere absorbită mai mică, consum și CO₂ mai mici) și presiune mare la sarcini și turații mari."],
  ["Ce riscuri apar dacă se folosește un ulei cu vâscozitate mai mică decât cea prescrisă?", "Pelicula portantă devine prea subțire la cald și sarcină mare: contact metal-metal în lagăre, uzură, presiune scăzută, martorul se poate aprinde la ralanti; consum crescut de ulei."]
];
const TEST = [
  { q: "Debitul unei pompe de ulei cu roți dințate este, în principal:", o: ["independent de turație", "proporțional cu turația", "proporțional cu temperatura", "invers proporțional cu turația"], c: 1, e: "Pompă volumetrică: Q = V<sub>g</sub>·n·η<sub>v</sub>." },
  { q: "Palierul de pe caracteristica p = f(n) apare datorită:", o: ["filtrului", "supapei de siguranță", "manocontactului", "termostatului"], c: 1, e: "Peste presiunea de deschidere, surplusul se întoarce în carter." },
  { q: "Regula practică pentru motorul cald:", o: ["0,1 bar/1000 rot/min", "≈ 0,7 bar/1000 rot/min", "5 bar la ralanti", "presiune constantă"], c: 1, e: "Valoare minimă orientativă; sub ea – uzură sau ulei diluat." },
  { q: "Presiune normală la rece și mică la cald indică:", o: ["supapa de siguranță blocată", "uzura lagărelor sau ulei diluat", "filtru nou", "termometru defect"], c: 1, e: "La cald vâscozitatea mică scoate în evidență jocurile mărite." },
  { q: "Manocontactul de presiune este, cu motorul oprit:", o: ["deschis (0.L)", "închis (≈ 0 Ω), martorul aprins", "la 5 V", "deconectat"], c: 1, e: "Contact normal închis: se deschide peste ≈ 0,3…0,5 bar." }
];
const CSS = `<style>
.saa4-afis { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:.4rem; margin:.5rem 0; }
.saa4-afis div { background:var(--suprafata-2); border-radius:8px; padding:.35rem .5rem; } .saa4-afis span { display:block; font-size:.72rem; color:var(--text-sec); } .saa4-afis b { font-size:1.05rem; }
#svg-ap, #svg-pan, #svg-mm { width:100%; height:auto; display:block; color:var(--text); }
.saa4-3d .m3d { height:clamp(380px, 62vh, 620px); }

#comp-desc, #pompa-desc { min-height:2.4em; }
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
@media (max-width:900px){ .saa4-afis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>`;

/* ------------------------------------------------------------------ definiția lucrării */
Cadru.porneste({
  disc: "SAA", nr: 4, cod: "saa-l4",
  titlu: "Sistemul de ungere – caracteristica presiunii uleiului",
  scurt: "Sistemul de ungere",
  subtitlu: "Laborator virtual – standul K7J 1.4 MPI: manometrul de ulei, termometrul, manocontactul, panoplia cu pompe",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261024); },
  date: [{ k: "nRal", et: "Turația de ralanti [rot/min]", v: 800 }, { k: "ulei", et: "Uleiul", v: "5W-30", fix: true, text: true }, { k: "pAv", et: "Pragul martorului [bar]", v: 0.5, fix: true }],
  tabele: [
    { id: "t41", titlu: "Tabelul 4.1. Presiunea uleiului [bar]", antetRand: "T ulei", nota: "La 40 °C și la 90 °C se citește toată caracteristica (ralanti … 3500 rot/min); la 60 și 80 °C – ralanti și 2000 rot/min. Toleranța de temperatură: ± 2,5 °C.",
      randuri: MD.TEMP.map(T => ({ k: "t" + T, et: `${T} °C` })),
      coloane: MD.TURATII.map(k => ({ k, t: k === "ral" ? "ralanti" : `${MD.NREG[k]} rot/min`, intrare: true })).concat([{ k: "panta", t: "Δp/Δn [bar/1000 rot/min]" }]) },
    { id: "t42", titlu: "Tabelul 4.2. Verificarea manocontactului de presiune", antetRand: "Motor",
      randuri: [{ k: "oprit", et: "oprit (contact pus)" }, { k: "pornit", et: "pornit, ralanti" }],
      coloane: [{ k: "R", t: "R [Ω] (0.L = deschis → „OL”)", intrare: true }, { k: "lampa", t: "Martorul" }, { k: "concl", t: "Concluzie" }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaSAA4,
  intrebari() {
    return [
      { id: "q1", u: "bar/1000 rot/min", text: "Panta Δp/Δn a caracteristicii voastre la 90 °C (zona liniară, regresie):", textSimplu: "Panta Δp/Δn la 90 °C" },
      { id: "q2", u: "bar", text: "Presiunea uleiului la ralanti cald (90 °C):", textSimplu: "Presiunea la ralanti cald (90 °C)" },
      { id: "q3", u: "rot/min", text: "Turația la care se deschide supapa de siguranță la 40 °C (intersecția dreptei cu palierul):", textSimplu: "Turația de deschidere a supapei de siguranță (40 °C)" },
      { id: "q4", u: "", text: "Raportul presiunilor la 2000 rot/min între 40 °C și 90 °C:", textSimplu: "Raportul p(2000, 40 °C)/p(2000, 90 °C)" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t.t41;
    const a = MD.TURATII.filter(k => t.t40[k] !== "").length; if (a < 6) l.push(`Tabelul 4.1, 40 °C: ${a}/6 turații`);
    ["t60", "t80"].forEach(r => { ["ral", "n2000"].forEach(k => { if (t[r][k] === "") l.push(`Tabelul 4.1, ${r.slice(1)} °C: ${k === "ral" ? "ralanti" : "2000 rot/min"}`); }); });
    const b = MD.TURATII.filter(k => t.t90[k] !== "").length; if (b < 6) l.push(`Tabelul 4.1, 90 °C: ${b}/6 turații`);
    ["oprit", "pornit"].forEach(k => { if (D.t.t42[k].R === "") l.push(`Tabelul 4.2: motor ${k}`); });
    return l;
  },
  exemplu(D) {
    const pr = MD.parametri(1); D.date.nRal = pr.nRal;
    MD.TEMP.forEach(T => MD.TURATII.forEach(k => { if (T === 40 || T === 90 || k === "ral" || k === "n2000") D.t.t41["t" + T][k] = MD.presiune(pr, MD.nr(pr, k), T, "").toFixed(2); }));
    D.t.t42.oprit.R = pr.rSw.toFixed(2); D.t.t42.pornit.R = "OL";
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Ungerea motorului pe autoturism",
    intro: `<p>Uleiul circulă prin motor: baie (carter) → sorb → pompa de ulei → filtru → galeria principală → lagărele arborelui cotit → arborele cu came → retur în carter. Alegeți temperatura și apăsați <b>Pornire la rece</b>: urmăriți presiunea și timpul în care uleiul ajunge la lagăre și la arborele cu came.</p>`,
    dupa: `<p class="nota">Macheta este comună cu Mecanica fluidelor (lucrarea 1 – vâscozitatea uleiurilor).</p>`,
    optiuni: () => ({ sistem: "ungere" })
  },
  referat: {
    scop: "Determinarea presiunii uleiului în funcție de turație și temperatură, a pantei caracteristicii și a turației de deschidere a supapei de siguranță; verificarea manocontactului de presiune.",
    relatii: "Q = V<sub>g</sub>·n·η<sub>v</sub>; &nbsp; p ≈ Q·R(ν) ≤ p<sub>supapă</sub>; &nbsp; Δp/Δn [bar/1000 rot/min] prin regresie liniară; &nbsp; lg lg(ν + 0,7) = A + B·lg T.",
    varianta: D => `Motorul propriu: turația de ralanti ${fmt(num(D.date.nRal), 0)} rot/min, uleiul 5W-30 cu vâscozitatea proprie, presiunea de deschidere a supapei de siguranță și pragul manocontactului individuale.`,
    indicatii: "Comparați panta la cald cu regula de 0,7 bar/1000 rot/min, explicați efectul temperaturii (vâscozitatea), palierul supapei de siguranță, verificarea manocontactului și avantajul pompelor cu debit variabil…"
  },
  subsol: "Modelul: pompă volumetrică (debit ∝ turație, scăpări la cald), rezistența lagărelor ∝ ν<sup>m</sup>, supapă de siguranță cu palier, vâscozitatea Walther a uleiului 5W-30, manocontact normal închis. Parametrii (pantă, palier, vâscozitate, ralanti, prag) sunt individuali.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `${CSS}<div class="sim-grila">
    <div class="card sim-scena scena">
      <div id="motor3d" class="saa4-3d"></div>
      <svg id="svg-ap" viewBox="0 0 1000 250" role="img" aria-label="Manometrul de control, termometrul, testerul OBD și panoul standului"></svg>
      <p class="nota" id="comp-desc">Clic pe o componentă a circuitului de ungere (pe macheta 3D) pentru descrierea ei.</p>
      <div class="saa4-afis"><div><span>Stare</span><b id="af-st">—</b></div><div><span>Turație [rot/min]</span><b id="af-n">0</b></div><div><span>Ulei [°C]</span><b id="af-T">—</b></div><div><span>Presiune ulei [bar]</span><b id="af-p">—</b></div><div><span>Rândul tabelului</span><b id="af-r">—</b></div></div>
      <div id="panou-pan"><h3>Panoplia cu pompe de ulei</h3><svg id="svg-pan" viewBox="0 0 1000 270" role="img" aria-label="Pompe de ulei: roți dințate, rotor, palete cu debit variabil"></svg><p class="nota" id="pompa-desc">Clic pe fiecare pompă.</p></div>
      <div id="panou-mm" hidden><h3>Verificarea manocontactului cu multimetrul</h3><svg id="svg-mm" viewBox="0 0 800 340" role="img" aria-label="Multimetrul conectat la manocontact"></svg></div>
      <div class="grafic-mic"><canvas id="cv-live" height="230" aria-label="Presiunea uleiului în funcție de turație"></canvas></div>
    </div>
    <aside class="card sim-comenzi tk-pasi">
      <h2>Desfășurarea lucrării</h2>
      <ol class="pasi" id="pasi"></ol>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari"><summary>Defecte de diagnosticat (mod demonstrativ)</summary>
        <label class="camp">Situația <select id="in-defect" data-blocat-eval><option value="none">motor în stare bună</option><option value="lagare">lagăre uzate (joc mărit)</option><option value="diluat">ulei diluat cu combustibil</option><option value="supapa">supapa de siguranță blocată deschisă</option></select></label></details>
    </aside>
  </div>`,
    init(C) {
      porneste3D(); construiesteAparate(); construiestePanoplia(); construiestePasi();
      sim.T = P().T0; sim.Tafis = sim.T;
      if (!MOD.eval) { C.D.date.nRal = P().nRal; C.construiesteDateLucru(); }
      $("#in-defect").addEventListener("change", e => { sim.defect = e.target.value; });
      C.mesaj("Urmați pașii din panoul „Desfășurarea lucrării”.", "");
    },
    aplicaEval(P, C) { Object.assign(C.D.date, { nRal: P.nRal }); sim.defect = "none"; sim.T = P.T0; const d = $("#in-defect"); if (d) d.disabled = true; },
    reset() { Object.assign(sim, { contact: false, merge: false, n: 0, senzor: true, man: false, etans: false, mm: false, T: P().T0, Tafis: P().T0, nAfis: 0, vSw: 0, vMan: 0, pAc: 0 }); },
    cadru(dt0, C, vizibil) {
      const dt = Math.min(0.05, dt0 || 0.016), dtT = dt * (sim.rapid ? 10 : 1), pr = P();
      sim.t += dt;
      const nt = nTinta(); sim.n += (nt - sim.n) * (1 - Math.exp(-dt / 0.5)); if (Math.abs(nt - sim.n) < 1.5) sim.n = nt;
      if (sim.merge) sim.T = Math.min(96, sim.T + MD.incalzire(sim.n, sim.T) * dtT); else sim.T = Math.max(pr.T0, sim.T - 0.012 * (sim.T - pr.T0) * dtT);
      const pT = pAdev(); sim.p += (pT - sim.p) * (1 - Math.exp(-dt / 0.35)); if (Math.abs(pT - sim.p) < 0.004) sim.p = pT;
      // aparatele: acul manometrului amortizat de glicerină (cu pulsații mici ale pompei), termometrul 1 citire/s, testerul OBD 2/s
      const puls = sim.merge ? 0.012 * Math.sin(sim.t * 37) * (sim.reg === "ral" ? 1.6 : 1) : 0;
      sim.pAc += ((sim.man ? sim.p : 0) + puls - sim.pAc) * (1 - Math.exp(-dt / 0.3)); if (sim.pAc < 0) sim.pAc = 0;
      sim._tT = (sim._tT || 0) + dt; if (sim._tT > 1) { sim._tT = 0; sim.Tafis = Math.round(sim.T * 10) / 10; }
      sim._tN = (sim._tN || 0) + dt; if (sim._tN > 0.5) { sim._tN = 0; sim.nAfis = Math.round(sim.n); }
      if (!vizibil) return;
      actualizeaza3D(); actualizeazaAparate(); animaPanoplia(dt);
      const now = performance.now();
      if (now - (this._ts || 0) > 250) { this._ts = now; actualizeazaPasi(); if (PASI[pasActiv].panou === "mm") desenMultimetru(); deseneazaLive();
        C.stare(1, sim.merge ? `motor pornit – ${ET_REG[sim.reg]}` : "motor oprit", sim.merge ? "inc" : ""); C.stare(2, `ulei ${fx(sim.T, 1)} °C · pasul ${pasActiv + 1}`); }
    },
    redeseneaza() { deseneazaLive(); },
    formule() {
      const pr = P(), r = [];
      r.push(["Vâscozitatea uleiului (Walther)", `ν(${fx(sim.T, 1)} °C) = <span class="rez">${fx(MD.niu(pr, sim.T), 1)} mm²/s</span> (la 90 °C: ${fx(MD.niu(pr, 90), 1)})`]);
      if (sim.man && sim.merge) r.push(["Presiunea pe 1000 rot/min", `p/n = ${fx(sim.p, 2)}/${fx(sim.n / 1000, 2)} = <span class="rez">${fx(sim.p / (sim.n / 1000), 2)} bar/1000 rot/min</span>`]);
      return r;
    }
  }
});
