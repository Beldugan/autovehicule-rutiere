/* SAA – Lucrarea 4. Sistemul de ungere – caracteristica presiunii uleiului (standul K7J 1.4 MPI turbo din laborator).
   Simulator: (1) motorul K7J desenat din piesele lui reale (partea admisiei: bloc, chiulasă, capac, galerie de admisie, filtru,
   manocontact, tubul jojei, distribuție, alternator), demontarea/montarea animată a manocontactului și a adaptorului manometrului, manometrul de control cu glicerină, termometrul cu sondă K în tubul jojei,
   testerul OBD și panoul standului cu martorii din bord; (2) secțiunea longitudinală prin motor: mecanismul bielă-manivelă real
   (ordinea de aprindere 1-3-4-2), distribuția, lanțul și pompa cu roți dințate evolventice, supapa de siguranță cu plonjor și arc,
   răcitorul, filtrul în secțiune, galeria, lagărele, axul culbutorilor, turbosuflanta; debitele ramurilor după model (animație
   încetinită de 40 de ori). Panoplia cu pompe (roți dințate, gerotor, palete cu debit variabil). Parametrii sunt individuali. */
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

/* ------------------------------------------------------------------ elementele circuitului (identificare) */
const COMP = {
  carter: ["Baia de ulei (carterul)", "Rezervorul de ulei al motorului (≈ 4,9 l cu filtrul la K7J); din galerii și din chiulasă uleiul revine aici prin gravitație."],
  sorb: ["Sorbul cu sită", "Clopotul de aspirație cu sită de sârmă, aproape de fundul băii: reține impuritățile mari înaintea pompei."],
  pompa: ["Pompa de ulei cu roți dințate", "Montată în baie, sub lagărul palier 1, antrenată de arborele cotit prin lanț. Pompă volumetrică: uleiul este purtat între dinți și carcasă de la aspirație la refulare; debitul ∝ turație (Q = V·n·η<sub>v</sub>)."],
  supapa: ["Supapa de siguranță (în corpul pompei)", "Piston (plonjor) apăsat de un arc: la presiunea de deschidere (≈ 4,5…5 bar) plonjorul se deplasează, descoperă orificiul de retur și surplusul trece înapoi la aspirație – palierul caracteristicii."],
  filtru: ["Filtrul de ulei (cartuș înșurubat)", "Element din hârtie pliată în jurul unui tub central perforat; membrana antiretur păstrează uleiul în filtru la oprire, supapa de bypass ocolește elementul colmatat sau uleiul rece foarte vâscos."],
  racitor: ["Răcitorul de ulei (schimbător ulei–lichid de răcire)", "Pachet de plăci montat între bloc și filtru: lichidul de răcire limitează temperatura uleiului la sarcini mari și îl încălzește mai repede la pornirea la rece."],
  galerie: ["Galeria principală de ungere", "Canal găurit pe lungimea blocului; din el pleacă găurile spre fiecare lagăr palier, coloana spre chiulasă și conducta turbosuflantei. La capătul ei este manocontactul."],
  lagare: ["Lagărele paliere și de bielă (cuzineți)", "Uleiul intră în cuzinetul palier și, prin găurile oblice din arborele cotit, ajunge la fusurile maneton. Pelicula portantă hidrodinamică are 2…20 µm; jocul mărit prin uzură scade presiunea, mai ales la cald."],
  came: ["Axul culbutorilor și arborele cu came", "Coloana din bloc alimentează axul tubular al culbutorilor; prin orificii uleiul stropește culbutorii, camele și supapele, apoi se scurge spre baie prin canalele de retur."],
  turbo: ["Turbosuflanta – ungerea lagărelor", "Conducta de alimentare din galerie ungerea lagărelor arborelui turbinei (≈ 100 000 rot/min); uleiul se întoarce liber în baie prin conducta de retur."],
  senzor: ["Manocontactul / racordul manometrului", "Contact normal închis: aprinde martorul de presiune sub ≈ 0,3…0,5 bar. În lucrare se demontează și în locul lui se montează manometrul de control."]
};
const NCOMP = Object.keys(COMP).length;

/* ------------------------------------------------------------------ secțiunea longitudinală prin motor (vedere „Circuitul de ungere”) */
const SX = { YC: 330, r: 32, l: 120, CIL: [320, 460, 600, 740], PAL: [250, 390, 530, 670, 810], OF: [0, 540, 180, 360], C: [118, 528], z: 9, m: 4.6 };
SX.ra1 = [SX.C[0] - SX.m * SX.z / 2, SX.C[1] + 7]; SX.ra2 = [SX.C[0] + SX.m * SX.z / 2, SX.C[1] + 7];
/** puncte pe cercul de divizare al unei roți a pompei, între unghiurile a0 și a1 [°] */
function arcRoata(c, a0, a1) { const r = SX.m * SX.z / 2, out = []; for (let i = 0; i <= 14; i++) { const a = (a0 + (a1 - a0) * i / 14) * RAD; out.push([+(c[0] + r * Math.cos(a)).toFixed(1), +(c[1] + r * Math.sin(a)).toFixed(1)]); } return out; }
/** traseele uleiului: puncte și fracțiunea de debit (q: „pompa” – tot debitul, „motor” – debitul prin motor, „retur” – prin supapă) */
const TRASEE = [
  { id: "asp", q: "pompa", f: 1, n: 10, pts: [[360, 503], [360, 490], [272, 490], [272, 458]] },
  { id: "ref", q: "motor", f: 1, n: 16, pts: [[234, 408], [234, 205], [204, 205], [196, 226], [196, 330], [178, 340], [160, 300], [160, 228], [160, 192], [248, 186], [248, 268]] },
  { id: "gal", q: "motor", f: 1, n: 22, pts: [[248, 268], [880, 268]] },
  ...SX.PAL.map((x, i) => ({ id: "pal" + i, q: "motor", f: 0.14, n: 3, pts: [[x, 268], [x, 314]] })),
  { id: "col", q: "motor", f: 0.18, n: 12, pts: [[822, 268], [822, 60], [256, 60]] },
  { id: "tur", q: "motor", f: 0.1, n: 9, pts: [[880, 268], [914, 268], [914, 104], [996, 104], [996, 132]] },
  { id: "trt", q: "motor", f: 0.1, n: 9, pts: [[996, 190], [996, 214], [944, 214], [944, 470], [876, 470]] },
  { id: "ia", q: "pompa", f: 1, n: 12, pts: [[118, 615], [118, 572], ...arcRoata(SX.ra1, 70, 290), [118, 492], [118, 448]], inset: 1, roata: 1 },
  { id: "ib", q: "pompa", f: 1, n: 12, pts: [[118, 572], ...arcRoata(SX.ra2, 110, -110), [118, 492]], inset: 1, roata: 1 },
  { id: "ir", q: "retur", f: 1, n: 7, pts: [[124, 462], [145, 462], [145, 496], [190, 496], [190, 604], [118, 604]], inset: 1 }
];
function traseuGeom(t) { let tot = 0; t.L = t.pts.slice(1).map((p, i) => { const l = Math.hypot(p[0] - t.pts[i][0], p[1] - t.pts[i][1]); tot += l; return l; }); t.tot = tot; }
TRASEE.forEach(traseuGeom);
function pctTraseu(t, s) { let r = s * t.tot; for (let i = 0; i < t.L.length; i++) { if (r <= t.L[i]) { const a = t.pts[i], b = t.pts[i + 1], f = r / t.L[i]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } r -= t.L[i]; } return t.pts[t.pts.length - 1]; }
const linie = (pts, o) => `<path d="M${pts.map(p => p.join(",")).join("L")}" fill="none" ${o}/>`;

function defsSectiune(P) {
  return `<defs>
    <filter id="${P}-turnare" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="z"/><feColorMatrix in="z" type="matrix" values="0 0 0 0 .45  0 0 0 0 .47  0 0 0 0 .5  0 0 0 .55 0" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="gz"/><feBlend in="SourceGraphic" in2="gz" mode="multiply"/></filter>
    <pattern id="${P}-has" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#a7adb3"/><line x1="0" y1="0" x2="0" y2="8" stroke="#80868c" stroke-width="1.1"/></pattern>
    <pattern id="${P}-hasAl" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" fill="#c9ced3"/><line x1="0" y1="0" x2="0" y2="10" stroke="#9ea4aa" stroke-width="1"/><line x1="4" y1="0" x2="4" y2="10" stroke="#9ea4aa" stroke-width=".6"/></pattern>
    <linearGradient id="${P}-ulei" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98f2e"/><stop offset="1" stop-color="#6e4310"/></linearGradient>
    <linearGradient id="${P}-otel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".45" stop-color="#aeb5bc"/><stop offset="1" stop-color="#5d646c"/></linearGradient>
    <linearGradient id="${P}-otelV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b727a"/><stop offset=".4" stop-color="#e9edf0"/><stop offset="1" stop-color="#7b828a"/></linearGradient>
    <linearGradient id="${P}-piston" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa1a8"/><stop offset=".35" stop-color="#e3e6e9"/><stop offset="1" stop-color="#8a9198"/></linearGradient>
    <linearGradient id="${P}-cuz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c98a"/><stop offset="1" stop-color="#9c7432"/></linearGradient>
    <linearGradient id="${P}-baie" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5259"/><stop offset="1" stop-color="#23272c"/></linearGradient>
    <linearGradient id="${P}-filtru" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c2f66"/><stop offset=".35" stop-color="#3d74c8"/><stop offset=".6" stop-color="#1b4e9b"/><stop offset="1" stop-color="#0a2550"/></linearGradient>
    <linearGradient id="${P}-turbo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d8378"/><stop offset=".5" stop-color="#6a5f55"/><stop offset="1" stop-color="#3f3832"/></linearGradient>
    <radialGradient id="${P}-flacara" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".4" stop-color="#ffb02e" stop-opacity=".9"/><stop offset="1" stop-color="#ff5a00" stop-opacity="0"/></radialGradient>
    <clipPath id="${P}-clipA"><circle cx="${SX.C[0]}" cy="${SX.C[1]}" r="100"/></clipPath>
    <clipPath id="${P}-clipBaie"><path d="M238,372 H872 L860,524 H250 Z"/></clipPath></defs>`;
}
function sectiuneSVG() {
  const Pf = "sx", { YC, CIL, PAL } = SX;
  let s = defsInstr(Pf) + defsSectiune(Pf);
  // baia de ulei (tablă ambutisată) cu uleiul
  s += `<g data-comp="carter"><path d="M232,370 H878 L866,530 H244 Z" fill="url(#${Pf}-baie)" stroke="#111" stroke-width="1.5"/><path d="M238,372 H872 L860,524 H250 Z" fill="#2f353b"/>
    <g clip-path="url(#${Pf}-clipBaie)"><rect id="sx-ulei" x="238" y="470" width="640" height="70" fill="url(#${Pf}-ulei)" opacity=".92"/><path id="sx-val" d="" fill="none" stroke="#e9b45a" stroke-width="1.2" opacity=".8"/></g>
    <rect x="548" y="526" width="26" height="9" rx="2" fill="#7c848c" stroke="#222"/>${txt(561, 548, "bușon golire", { fs: 8.5 })}</g>`;
  // blocul motor (fontă, secțiune hașurată) – cămășile cilindrilor și pereții paliери
  s += `<path d="M228,140 H880 V370 H872 V276 H238 V370 H228 Z" fill="url(#${Pf}-has)" stroke="#4a4f55" stroke-width="1.4"/>`;
  CIL.forEach((x, i) => { s += `<rect x="${x - 50}" y="140" width="100" height="136" fill="#eef0f2" stroke="#6b7178"/>`; if (i < 3) s += `<rect x="${x + 50}" y="140" width="40" height="136" fill="url(#${Pf}-has)" stroke="#4a4f55"/><rect x="${x + 58}" y="150" width="24" height="96" rx="3" fill="#7fb2d9" opacity=".75"/>`; });
  s += `<rect x="236" y="150" width="26" height="96" rx="3" fill="#7fb2d9" opacity=".75"/><rect x="796" y="150" width="20" height="96" rx="3" fill="#7fb2d9" opacity=".75"/>`;
  // pereții paliери cu capacele și cuzineții
  s += `<g data-comp="lagare">`;
  PAL.forEach(x => { s += `<path d="M${x - 16},276 H${x + 16} V${YC - 18} H${x - 16} Z M${x - 16},${YC + 18} H${x + 16} V346 H${x - 16} Z" fill="url(#${Pf}-has)" stroke="#4a4f55"/><rect x="${x - 20}" y="346" width="40" height="10" rx="2" fill="url(#${Pf}-has)" stroke="#4a4f55"/><rect x="${x - 3}" y="342" width="6" height="18" fill="#5d646b"/>
    <rect x="${x - 16}" y="${YC - 18}" width="32" height="3.5" fill="url(#${Pf}-cuz)" stroke="#6b4f1f" stroke-width=".5"/><rect x="${x - 16}" y="${YC + 14.5}" width="32" height="3.5" fill="url(#${Pf}-cuz)" stroke="#6b4f1f" stroke-width=".5"/>
    <line class="sx-film" x1="${x - 16}" y1="${YC - 14.5}" x2="${x + 16}" y2="${YC - 14.5}" stroke="#d9a441" stroke-width="1.4"/><line class="sx-film" x1="${x - 16}" y1="${YC + 14.5}" x2="${x + 16}" y2="${YC + 14.5}" stroke="#d9a441" stroke-width="1.4"/>`; });
  s += `</g>`;
  // chiulasa (aliaj de aluminiu), camerele de ardere, capacul culbutorilor
  s += `<path d="M228,72 H880 V140 H228 Z" fill="url(#${Pf}-hasAl)" stroke="#5d646b" stroke-width="1.4"/><path d="M236,36 Q236,26 250,26 H858 Q872,26 872,36 V72 H236 Z" fill="#c7ccd1" stroke="#5d646b"/><path d="M236,36 Q236,26 250,26 H858 Q872,26 872,36 V44 H236 Z" fill="#dfe3e6"/>`;
  CIL.forEach(x => { s += `<path d="M${x - 46},140 Q${x - 40},122 ${x},120 Q${x + 40},122 ${x + 46},140 Z" fill="#eef0f2" stroke="#6b7178"/><rect id="sx-fl${x}" x="${x - 44}" y="122" width="88" height="40" fill="url(#${Pf}-flacara)" opacity="0"/>`;
    s += `<rect x="${x - 2.5}" y="114" width="5" height="6" fill="#e9e4d6" stroke="#777" stroke-width=".5"/><rect x="${x - 1}" y="120" width="2" height="3" fill="#555"/>`; });
  s += `<g data-comp="came"><rect x="244" y="54" width="612" height="11" rx="5.5" fill="url(#${Pf}-otel)" stroke="#444"/><path class="sx-canal" d="M256,60 H850" stroke="#d9a441" stroke-width="4"/>${txt(548, 50, "axul culbutorilor (tubular, plin cu ulei)", { fs: 8.5, f: "#27313a" })}
    <rect x="236" y="82" width="636" height="12" rx="6" fill="url(#${Pf}-otel)" stroke="#444"/><g id="sx-came"></g>${txt(548, 105, "arborele cu came", { fs: 8.5, f: "#27313a" })}</g>`;
  s += `<g id="sx-supape"></g>`;
  // galeria principală, găurile spre paliere, coloana spre chiulasă
  s += `<g data-comp="galerie"><path d="M246,268 H884" stroke="#3b2a0c" stroke-width="9" fill="none"/><path class="sx-canal" d="M246,268 H884" stroke="#d9a441" stroke-width="5.5" fill="none"/>`;
  PAL.forEach(x => { s += `<path class="sx-canal" d="M${x},268 V313" stroke="#d9a441" stroke-width="3.5"/>`; });
  s += `<path d="M822,268 V60" stroke="#3b2a0c" stroke-width="7"/><path class="sx-canal" d="M822,268 V60" stroke="#d9a441" stroke-width="3.8"/>${txt(560, 262, "galeria principală", { fs: 9.5, w: 700, f: "#2a1d06", halo: true })}</g>`;
  // retur din chiulasă (canal de scurgere) și joja cu sonda termometrului
  s += `<path d="M862,140 V372" stroke="#55585c" stroke-width="7"/><path d="M862,140 V372" stroke="#2f353b" stroke-width="4"/>`;
  s += `<path d="M846,20 V512" stroke="#2b2f34" stroke-width="5"/><path d="M846,20 V510" stroke="#9aa1a8" stroke-width="2"/><circle cx="846" cy="16" r="5" fill="#ffd400" stroke="#8a7300"/>${txt(846, 10, "tubul jojei – sonda termometrului", { fs: 8.5, a: "end" })}`;
  // arborele cotit, biele, pistoane (desenate dinamic)
  s += `<g id="sx-mobil"></g>`;
  // lanțul de antrenare a pompei
  s += `<rect x="200" y="${YC - 7}" width="40" height="14" fill="url(#${Pf}-otel)" stroke="#444"/><rect x="218" y="${YC - 19}" width="9" height="38" rx="2" fill="#555b62" stroke="#222"/>
    <rect x="218.5" y="${YC - 19}" width="8" height="${436 - YC + 19 + 15}" rx="4" fill="none" stroke="#2b2b2b" stroke-width="2.4" stroke-dasharray="2.4 1.2" id="sx-lant"/>`;
  // pompa (vedere laterală) și sorbul
  s += `<g data-comp="pompa"><rect x="236" y="406" width="58" height="52" rx="6" fill="url(#${Pf}-hasAl)" stroke="#444"/><rect x="218" y="420" width="9" height="32" rx="2" fill="#555b62" stroke="#222"/><rect x="226" y="432" width="12" height="8" fill="#777"/>${txt(265, 436, "A", { fs: 10, w: 700 })}</g>`;
  s += `<g data-comp="sorb"><path d="M272,458 V490 H360 V500" stroke="#555b62" stroke-width="10" fill="none"/><path class="sx-canal" d="M272,458 V490 H360 V500" stroke="#d9a441" stroke-width="5" fill="none"/><path d="M336,500 H384 L392,516 H328 Z" fill="#7b8189" stroke="#222"/>${[0, 1, 2, 3, 4, 5, 6].map(k => `<line x1="${334 + k * 9}" y1="510" x2="${334 + k * 9}" y2="516" stroke="#d5dbe1" stroke-width=".8"/>`).join("")}<line x1="330" y1="513" x2="390" y2="513" stroke="#d5dbe1" stroke-width=".8"/></g>`;
  // refularea: canalul ascendent → răcitor → filtru → galerie
  s += `<path d="M234,406 V205 H204" stroke="#3b2a0c" stroke-width="7" fill="none"/><path class="sx-canal" d="M234,406 V205 H204" stroke="#d9a441" stroke-width="4" fill="none"/>
    <path d="M160,190 H248 V268" stroke="#3b2a0c" stroke-width="7" fill="none"/><path class="sx-canal" d="M160,190 H248 V268" stroke="#d9a441" stroke-width="4" fill="none"/>`;
  s += `<g data-comp="racitor"><rect x="116" y="194" width="92" height="24" rx="3" fill="#9aa3ab" stroke="#3d444b"/>${[0, 1, 2, 3, 4].map(k => `<line x1="118" y1="${198 + k * 4.5}" x2="206" y2="${198 + k * 4.5}" stroke="${k % 2 ? "#5aa0d8" : "#c48a2a"}" stroke-width="2"/>`).join("")}
    <path d="M116,200 H96 V160" stroke="#3b82c4" stroke-width="6" fill="none"/><path d="M116,212 H86 V160" stroke="#3b82c4" stroke-width="6" fill="none"/>${txt(92, 152, "lichid de răcire", { fs: 8.5 })}</g>`;
  s += `<g data-comp="filtru"><path d="M114,222 H206 V350 Q206,362 194,362 H126 Q114,362 114,350 Z" fill="url(#${Pf}-filtru)" stroke="#0a2a5a"/>
    <path d="M122,230 H198 V346 H122 Z" fill="#2f353b"/><path d="M128,234 H192 V342 H128 Z" fill="#efe6cf"/>${Array.from({ length: 15 }, (_, k) => `<line x1="${130 + k * 4.2}" y1="236" x2="${130 + k * 4.2}" y2="340" stroke="#c6b58a" stroke-width="1.1"/>`).join("")}
    <rect x="152" y="234" width="16" height="108" fill="#8d949b" stroke="#555"/>${Array.from({ length: 9 }, (_, k) => `<circle cx="160" cy="${242 + k * 11.5}" r="2.2" fill="#2f353b"/>`).join("")}
    <path d="M122,226 Q140,236 152,228 M168,228 Q180,236 198,226" stroke="#7b1f1f" stroke-width="2.4" fill="none"/>
    <rect x="152" y="342" width="16" height="10" fill="#5d646b"/><rect id="sx-bypass" x="155" y="344" width="10" height="5" fill="#d9dde1"/>
    ${txt(160, 378, "filtru: element pliat, tub central,", { fs: 8.5 })}${txt(160, 389, "membrană antiretur, bypass", { fs: 8.5 })}</g>`;
  // turbosuflanta (carcasa centrală cu lagărele)
  s += `<g data-comp="turbo"><path d="M914,268 V104 H996 V124" stroke="#2b2f34" stroke-width="6" fill="none"/><path class="sx-canal" d="M914,268 V104 H996 V124" stroke="#d9a441" stroke-width="3" fill="none"/>
    <path d="M996,192 V214 H944 V470 H878" stroke="#2b2f34" stroke-width="8" fill="none"/><path class="sx-canal" d="M996,192 V214 H944 V470 H878" stroke="#a87a2c" stroke-width="4" fill="none" opacity=".8"/>
    <circle cx="940" cy="160" r="36" fill="url(#${Pf}-turbo)" stroke="#2b241f"/><circle cx="1058" cy="160" r="32" fill="#c3c8cd" stroke="#555"/><rect x="964" y="132" width="66" height="58" rx="6" fill="url(#${Pf}-hasAl)" stroke="#444"/>
    <rect x="936" y="156" width="124" height="8" fill="url(#${Pf}-otel)" stroke="#333"/><rect x="976" y="150" width="14" height="20" fill="url(#${Pf}-cuz)"/><rect x="1004" y="150" width="14" height="20" fill="url(#${Pf}-cuz)"/>
    <g id="sx-rotT">${[0, 1, 2, 3, 4, 5].map(k => `<rect x="935" y="128" width="4" height="64" fill="#9c9188" transform="rotate(${k * 30} 940 160)"/>`).join("")}</g><g id="sx-rotC">${[0, 1, 2, 3, 4, 5].map(k => `<rect x="1056" y="132" width="4" height="56" fill="#eef1f3" stroke="#888" stroke-width=".5" transform="rotate(${k * 30} 1058 160)"/>`).join("")}</g>
    ${txt(997, 92, "turbosuflanta", { fs: 9.5, w: 700 })}${txt(1000, 234, "retur liber în baie", { fs: 8.5, a: "start" })}</g>`;
  // racordul de la capătul galeriei: manocontact sau adaptorul manometrului + manometrul
  s += `<g data-comp="senzor"><rect x="880" y="260" width="18" height="16" fill="url(#${Pf}-alama)" stroke="#6b5214"/><g id="sx-sw"><path d="M898,258 h10 l3,4 v12 l-3,4 h-10 z" fill="url(#${Pf}-alama)" stroke="#6b5214"/><rect x="911" y="262" width="14" height="12" rx="2" fill="#1e2226"/><rect x="925" y="265.5" width="7" height="5" fill="#c9a043"/><path d="M932,268 C946,268 948,250 962,246" stroke="#2e7d32" stroke-width="2.2" fill="none"/></g>
    <g id="sx-hose"><path d="M898,268 C930,268 960,300 985,330" stroke="#151515" stroke-width="6" fill="none"/></g></g>`;
  s += `<g id="sx-man"></g>`;
  // detaliul A–A: pompa în secțiune transversală (roți dințate evolventice, supapa de siguranță)
  s += `<path d="M236,432 L210,452" stroke="#333" stroke-dasharray="3 2"/>${txt(118, 420, "secțiunea A–A prin pompă", { fs: 9.5, w: 700 })}`;
  s += `<g data-comp="supapa"><circle cx="${SX.C[0]}" cy="${SX.C[1]}" r="102" fill="#f4f5f6" stroke="#333" stroke-width="1.5"/><g clip-path="url(#${Pf}-clipA)">
    <rect x="10" y="420" width="220" height="220" fill="url(#${Pf}-hasAl)"/>
    <circle cx="${SX.ra1[0]}" cy="${SX.ra1[1]}" r="${SX.m * (SX.z / 2 + 1) + 1}" fill="url(#${Pf}-ulei)"/><circle cx="${SX.ra2[0]}" cy="${SX.ra2[1]}" r="${SX.m * (SX.z / 2 + 1) + 1}" fill="url(#${Pf}-ulei)"/>
    <rect x="103" y="440" width="30" height="${SX.C[1] - 440}" fill="url(#${Pf}-ulei)"/><rect x="103" y="${SX.C[1] + 20}" width="30" height="${640 - SX.C[1]}" fill="url(#${Pf}-ulei)"/>
    <rect x="133" y="456" width="56" height="12" fill="#2f353b"/><rect x="133" y="457" width="56" height="10" fill="url(#${Pf}-ulei)" opacity=".85"/>
    <path d="M145,468 V496 H190 V604 H118" stroke="#2f353b" stroke-width="11" fill="none"/><path id="sx-retC" d="M145,468 V496 H190 V604 H118" stroke="#8a5a14" stroke-width="7" fill="none"/>
    <rect id="sx-plj" x="134" y="457" width="16" height="10" rx="1.5" fill="url(#${Pf}-otel)" stroke="#444" stroke-width=".6"/><path id="sx-arc" d="" stroke="#e3e6e9" stroke-width="1.6" fill="none"/><rect x="189" y="454" width="8" height="16" fill="#5d646b"/>
    <g id="sx-ga" transform="translate(${SX.ra1[0]} ${SX.ra1[1]})"><path d="${profilEvolventa(SX.z, SX.m)}" fill="url(#${Pf}-otel)" stroke="#2b2f34" stroke-width=".8"/><circle r="6" fill="#4b5157"/><rect x="-1.5" y="-7" width="3" height="4" fill="#222"/></g>
    <g id="sx-gb" transform="translate(${SX.ra2[0]} ${SX.ra2[1]})"><path d="${profilEvolventa(SX.z, SX.m)}" fill="url(#${Pf}-otel)" stroke="#2b2f34" stroke-width=".8"/><circle r="6" fill="#4b5157"/></g>
    <g id="sx-partA"></g></g>
    ${txt(70, 452, "refulare", { fs: 8.5, w: 700 })}${txt(70, 616, "aspirație", { fs: 8.5, w: 700 })}${txt(196, 448, "supapă", { fs: 8.5, a: "end" })}</g>`;
  s += `<g id="sx-part"></g><g id="sx-pic"></g>`;
  // afișajele: termometrul și turația (OBD)
  s += `<g transform="translate(900 520)"><rect width="92" height="46" rx="6" fill="#f2c200" stroke="#7a6000"/><rect x="6" y="6" width="80" height="24" rx="3" fill="#a7b39b"/><text id="sx-T" x="82" y="25" text-anchor="end" font-size="17" font-family="'Courier New',monospace" font-weight="700" fill="#1d2618">--</text>${txt(46, 41, "°C ulei (sonda K)", { fs: 7.5, f: "#2b2100" })}</g>`;
  s += `<g transform="translate(998 520)"><rect width="92" height="46" rx="6" fill="#1d2228" stroke="#000"/><rect x="6" y="6" width="80" height="24" rx="3" fill="#0b1b14"/><text id="sx-n" x="82" y="25" text-anchor="end" font-size="17" font-family="'Courier New',monospace" font-weight="700" fill="#6dff8e">0</text>${txt(46, 41, "rot/min · tester OBD", { fs: 7.5, f: "#cfd5db" })}</g>`;
  s += `<path d="M846,20 C870,-4 960,20 946,520" stroke="#222" stroke-width="1.6" fill="none" opacity=".7"/>`;
  s += `<text id="sx-scala" x="244" y="626" font-size="9.5" fill="currentColor" opacity=".75"></text>`;
  return s;
}
function construiesteSectiune() {
  const el = $("#svg-sx"); if (!el) return; el.innerHTML = sectiuneSVG();
  $$("#svg-sx [data-comp]").forEach(g => { g.style.cursor = "pointer"; g.addEventListener("click", ev => { ev.stopPropagation(); alegeComp(g.dataset.comp); }); });
  // particulele de ulei pe fiecare traseu
  sim.part = [];
  TRASEE.forEach(t => { const g = $(t.inset ? "#sx-partA" : "#sx-part"); for (let k = 0; k < t.n; k++) { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("r", t.inset ? 2.4 : 2); c.setAttribute("fill", "#ffe7a3"); c.setAttribute("opacity", 0); g.appendChild(c); sim.part.push({ t, s: k / t.n + Math.random() * 0.3 / t.n, el: c }); } });
  sim.picaturi = [];
}
function alegeComp(k) { sim.comp[k] = true; sim.selectat = k; $("#comp-desc").innerHTML = `<b>${COMP[k][0]}.</b> ${COMP[k][1]}`; actualizeazaPasi(); }

/** debitele relative: pompa (∝ n), prin motor (p/p_liniar) și prin supapa de siguranță */
function debite() {
  const pr = P(); if (!sim.merge && sim.n < 30) return { Q: 0, Qm: 0, Qr: 0, desch: 0 };
  const Q = sim.n / 3500, mu = Math.pow(MD.niu(pr, sim.T) / MD.niu(pr, 90), pr.m);
  let a = pr.a90, b = pr.b90; if (sim.defect === "lagare") { b *= sim.T > 70 ? 0.62 : 0.85; a *= 0.6; }
  const lin = Math.max(0.05, (a + b * sim.n / 1000) * mu * (sim.defect === "diluat" ? 0.72 : 1));
  const fr = cl(1 - sim.p / lin, 0, 1), rel = sim.defect === "supapa" ? 2.2 : pr.pRel;
  return { Q, Qm: Q * (1 - fr), Qr: Q * fr, desch: cl((sim.p - rel * 0.86) / (rel * 0.14), 0, 1) };
}
/** cursa supapei (0…1) în funcție de unghiul ciclului φ [°RAC]; admisie 350…590, evacuare 140…380 */
function cursaSupapa(phi, adm) { const [a, d] = adm ? [350, 240] : [140, 240]; const x = ((phi - a) % 720 + 720) % 720; return x < d ? Math.pow(Math.sin(Math.PI * x / d), 2) : 0; }
const VIZ = 1 / 40;   // animația încetinită: 1 s de animație = 1/40 s real (altfel rotația ar fi doar o pată)
function actualizeazaSectiune(dt) {
  const el = $("#svg-sx"); if (!el || !el.getClientRects().length) return;
  const pr = P(), { YC, r, l, CIL, PAL, OF } = SX, D = debite(), k = cl(sim.p / 5, 0, 1);
  sim.th = ((sim.th || 0) + sim.n / 60 * 360 * dt * VIZ) % 720;
  const th = sim.th;
  // arborele cotit, bielele și pistoanele (proiecție laterală – mecanismul bielă-manivelă)
  let m = "";
  const pinY = a => YC - r * Math.cos(a * RAD);
  PAL.forEach((x, i) => { m += `<circle cx="${x}" cy="${YC}" r="14" fill="url(#sx-otel)" stroke="#333"/>`; });
  PAL.forEach((x, i) => { const x0 = i === 0 ? 236 : x - 24, x1 = i === 4 ? 850 : x + 24; m += `<rect x="${x0}" y="${YC - 14}" width="${x1 - x0}" height="28" fill="url(#sx-otel)" stroke="#333" stroke-width=".8"/>`; });
  CIL.forEach((x, i) => {
    const a = th + (i === 1 || i === 2 ? 180 : 0), ca = Math.cos(a * RAD), py = pinY(a), sa = Math.sin(a * RAD), yb = YC - (r * ca + Math.sqrt(l * l - r * r * sa * sa));
    const cwy = YC + 38 * ca, y1 = Math.min(py, cwy) - 15, y2 = Math.max(py, cwy) + 15;
    // brațele (cu contragreutăți) văzute din lateral, fusul maneton, găurile de ungere oblice
    [x - 46, x + 30].forEach(xw => { m += `<rect x="${xw}" y="${y1.toFixed(1)}" width="16" height="${(y2 - y1).toFixed(1)}" rx="5" fill="#7d858d" stroke="#3d434a" stroke-width=".8"/>`; });
    m += `<rect x="${x - 30}" y="${(py - 13).toFixed(1)}" width="60" height="26" rx="4" fill="url(#sx-otel)" stroke="#333" stroke-width=".8"/><path d="M${x - 62},${YC} L${x - 8},${py.toFixed(1)}" stroke="#3b2a0c" stroke-width="1.6" stroke-dasharray="3 2"/>`;
    // pistonul (secționat: capul cu segmenții, mantaua, bolțul)
    const pt = yb - 22;
    m += `<rect x="${x - 48}" y="${pt.toFixed(1)}" width="96" height="17" rx="2" fill="url(#sx-piston)" stroke="#555"/>${[4, 8.5, 13].map(d => `<line x1="${x - 48}" y1="${(pt + d).toFixed(1)}" x2="${x + 48}" y2="${(pt + d).toFixed(1)}" stroke="#3d4349" stroke-width="1.5"/>`).join("")}
      <rect x="${x - 48}" y="${(pt + 17).toFixed(1)}" width="7" height="29" fill="url(#sx-piston)" stroke="#555" stroke-width=".7"/><rect x="${x + 41}" y="${(pt + 17).toFixed(1)}" width="7" height="29" fill="url(#sx-piston)" stroke="#555" stroke-width=".7"/><rect x="${x - 41}" y="${(yb - 5).toFixed(1)}" width="82" height="10" rx="5" fill="url(#sx-otel)" stroke="#444" stroke-width=".7"/>`;
    // biela (văzută din lateral: corpul în I, piciorul, capul cu capacul și cuzineții)
    m += `<path d="M${x - 5},${yb.toFixed(1)} L${x - 8},${(py - 18).toFixed(1)} H${x + 8} L${x + 5},${yb.toFixed(1)} Z" fill="url(#sx-otelV)" stroke="#333" stroke-width=".8"/><rect x="${x - 9}" y="${(yb - 9).toFixed(1)}" width="18" height="18" rx="4" fill="url(#sx-otelV)" stroke="#333" stroke-width=".8"/>
      <rect x="${x - 13}" y="${(py - 21).toFixed(1)}" width="26" height="42" rx="5" fill="url(#sx-otelV)" stroke="#333" stroke-width=".8"/><line x1="${x - 13}" y1="${py.toFixed(1)}" x2="${x + 13}" y2="${py.toFixed(1)}" stroke="#333" stroke-width="1"/><rect x="${x - 11}" y="${(py - 15).toFixed(1)}" width="22" height="30" rx="3" fill="url(#sx-cuz)" opacity=".85"/><rect x="${x - 9}" y="${(py - 12).toFixed(1)}" width="18" height="24" rx="2" fill="url(#sx-otel)"/>`;
    // aprinderea (ordinea 1-3-4-2): flacăra în camera de ardere la începutul destinderii
    const phi = ((th - OF[i]) % 720 + 720) % 720, fl = $(`#sx-fl${x}`);
    if (fl) fl.setAttribute("opacity", sim.merge && phi < 40 ? ((1 - phi / 40) * 0.9).toFixed(2) : 0);
    sim.pinY = sim.pinY || []; sim.pinY[i] = py;
  });
  $("#sx-mobil").innerHTML = m;
  // camele (proiecție laterală) și supapele: arborele cu came la jumătatea turației
  let c = "", v = "";
  CIL.forEach((x, i) => {
    const phi = ((th - OF[i]) % 720 + 720) % 720;
    [[x - 22, true], [x + 22, false]].forEach(([xv, adm]) => {
      const L = cursaSupapa(phi, adm), Lop = cursaSupapa(phi + 360, adm), dy = 7 * L;   // arborele cu came la ½ din turație: vârful camei e sus după 360 °RAC
      c += `<rect x="${xv - 8}" y="${(79 - 7 * Lop).toFixed(1)}" width="16" height="${(18 + 7 * Lop + dy).toFixed(1)}" rx="7" fill="url(#sx-otelV)" stroke="#333" stroke-width=".7"/>`;
      v += `<rect x="${xv - 2}" y="${(97 + dy).toFixed(1)}" width="4" height="28" fill="#8d949b"/><path d="M${xv - 12},${(129 + dy).toFixed(1)} L${xv - 2},${(124 + dy).toFixed(1)} H${xv + 2} L${xv + 12},${(129 + dy).toFixed(1)} V${(131 + dy).toFixed(1)} H${xv - 12} Z" fill="#7a8188" stroke="#333" stroke-width=".6"/>`;
      let sp = `M${xv - 6},${(102 + dy).toFixed(1)}`; for (let j = 1; j <= 6; j++) sp += ` L${xv + (j % 2 ? 6 : -6)},${(102 + dy + (114 - 102 - dy) * j / 6).toFixed(1)}`;
      v += `<path d="${sp}" stroke="#c6cbd0" stroke-width="1.3" fill="none"/><rect x="${xv - 7}" y="${(97 + dy).toFixed(1)}" width="14" height="5" rx="1" fill="#4b5157"/>`;
    });
  });
  $("#sx-came").innerHTML = c; $("#sx-supape").innerHTML = v;
  // lanțul pompei
  $("#sx-lant").setAttribute("stroke-dashoffset", (-th * 0.6).toFixed(1));
  // pompa A–A: roțile în angrenare (raport 1:1), turația pompei ≈ n (lanț 1:1 la K7J ≈ 0,8)
  const ap = th * 0.8;
  $("#sx-ga").setAttribute("transform", `translate(${SX.ra1[0]} ${SX.ra1[1]}) rotate(${ap.toFixed(2)})`);
  $("#sx-gb").setAttribute("transform", `translate(${SX.ra2[0]} ${SX.ra2[1]}) rotate(${(180 + 180 / SX.z - ap).toFixed(2)})`);
  // supapa de siguranță: deplasarea plonjorului ∝ (p − p_deschidere); arcul se comprimă
  const x0 = 134 + D.desch * 16;
  $("#sx-plj").setAttribute("x", x0.toFixed(1));
  let d = `M${x0 + 16},462`; const xe = 189, nsp = 7; for (let i = 1; i <= nsp * 2; i++) d += ` L${(x0 + 16 + (xe - x0 - 16) * i / (nsp * 2)).toFixed(1)},${i % 2 ? 457.5 : 466.5}`; $("#sx-arc").setAttribute("d", d);
  $("#sx-retC").setAttribute("stroke", D.Qr > 0.004 ? "#d9a441" : "#6e4a12");
  // uleiul din baie: nivelul scade când uleiul circulă (≈ 0,5 l în galerii și chiulasă) și revine lent la oprire
  sim.circ = (sim.circ || 0) + ((D.Q > 0 ? Math.min(1, D.Q * 2.2) : 0) - (sim.circ || 0)) * (1 - Math.exp(-dt / (D.Q > 0 ? 3 : 18)));
  const niv = 466 + 12 * sim.circ, und = sim.merge ? 1.2 + 1.5 * (sim.n / 3500) : 0;
  $("#sx-ulei").setAttribute("y", niv.toFixed(1));
  let w = `M238,${niv}`; for (let x = 238; x <= 878; x += 16) w += ` L${x},${(niv + und * Math.sin(x / 23 + sim.t * 6)).toFixed(1)}`; $("#sx-val").setAttribute("d", w);
  // culoarea uleiului în canale: presiunea (mai închis = presiune mai mare)
  $$("#svg-sx .sx-canal").forEach(e => e.setAttribute("stroke", D.Q > 0 ? `hsl(${42 - 16 * k}, ${72 + 18 * k}%, ${56 - 14 * k}%)` : "#a77b33"));
  $$("#svg-sx .sx-film").forEach(e => { e.setAttribute("stroke-width", D.Q > 0 ? (1.2 + 2.2 * k).toFixed(2) : 0.8); e.setAttribute("stroke", D.Q > 0 ? "#e2a93f" : "#9c7432"); });
  // particulele: viteza ∝ debitul fiecărei ramuri (încetinită ca rotația)
  const omP = sim.merge || sim.n > 30 ? sim.n * 0.8 / 60 * 2 * Math.PI * VIZ : 0;
  sim.part.forEach(pt => { const t = pt.t, q = t.q === "pompa" ? D.Q : t.q === "motor" ? D.Qm : D.Qr, vit = t.roata ? omP * SX.m * SX.z / 2 / t.tot : q * t.f * (t.inset ? 1.6 : 1) * 2400 * VIZ * 8 / t.tot;
    pt.s = (pt.s + vit * dt) % 1; const [x, y] = pctTraseu(t, pt.s); pt.el.setAttribute("cx", x.toFixed(1)); pt.el.setAttribute("cy", y.toFixed(1)); pt.el.setAttribute("opacity", q * t.f > 0.004 ? 0.9 : 0); });
  // picăturile care se scurg din chiulasă, de pe arborele cotit și din lagăre spre baie
  if (D.Qm > 0.01 && Math.random() < D.Qm * dt * 60) { const i = Math.floor(Math.random() * 4); sim.picaturi.push({ x: SX.CIL[i] + (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 20), y: (sim.pinY ? sim.pinY[i] : YC) + 20, vy: 20 }); }
  if (D.Qm > 0.01 && Math.random() < D.Qm * dt * 25) sim.picaturi.push({ x: 862, y: 150, vy: 30, canal: 1 });
  if (!D.Q && sim.circ > 0.05 && Math.random() < sim.circ * dt * 10) sim.picaturi.push({ x: 862, y: 150, vy: 20, canal: 1 });
  sim.picaturi.forEach(p => { p.vy += 380 * dt; p.y += p.vy * dt; });
  sim.picaturi = sim.picaturi.filter(p => p.y < niv);
  if (sim.picaturi.length > 60) sim.picaturi.splice(0, sim.picaturi.length - 60);
  $("#sx-pic").innerHTML = sim.picaturi.map(p => `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="1.6" ry="${(2 + Math.min(4, p.vy / 80)).toFixed(1)}" fill="#e3a943" opacity=".9"/>`).join("");
  // turbosuflanta
  sim.thT = ((sim.thT || 0) + (sim.merge ? 1 : 0) * (40 + sim.n / 10) * dt * 4) % 360;
  $("#sx-rotT").setAttribute("transform", `rotate(${sim.thT.toFixed(1)} 940 160)`); $("#sx-rotC").setAttribute("transform", `rotate(${sim.thT.toFixed(1)} 1058 160)`);
  // racordul: manocontact sau furtunul manometrului
  $("#sx-sw").style.display = sim.senzor ? "" : "none"; $("#sx-hose").style.display = sim.man ? "" : "none";
  $("#sx-man").innerHTML = sim.man ? svgGauge("sx", 1030, 380, 50, 10, sim.pAc, { maj: 2, unit: "bar", benzi: [[0, 0.5, "#d32f2f"]] }) : "";
  $("#sx-T").textContent = fx(sim.Tafis, 1); $("#sx-n").textContent = fx(sim.nAfis, 0);
  $("#sx-scala").textContent = sim.merge ? `Animație încetinită de 40 de ori: arborele cotit face real ${fx(sim.n / 60, 1)} rot/s, pompa ≈ ${fx(sim.n * 0.8 / 60, 1)} rot/s; ordinea de aprindere 1-3-4-2.` : "Motor oprit: uleiul din galerii și din chiulasă se scurge înapoi în baie.";
  $$("#svg-sx [data-comp]").forEach(g => g.classList.toggle("sel", g.dataset.comp === sim.selectat));
}

/* ------------------------------------------------------------------ vederea „Standul” (fotografia standului K7J + aparatele de măsură) */
/* motorul K7J desenat din piesele lui reale, văzut din partea admisiei (fără fotografii) */
const ST = { sw: [214, 292], joja: [586, 104], gauge: [884, 236], R: 80, fund: 400 };
function standSVG() {
  const Pf = "ft", [bx, by] = ST.sw;
  let s = defsInstr(Pf) + defsSectiune(Pf) + `<defs>
    <linearGradient id="${Pf}-fonta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a9097"/><stop offset=".5" stop-color="#6b7178"/><stop offset="1" stop-color="#4c5157"/></linearGradient>
    <linearGradient id="${Pf}-alu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e6e9"/><stop offset=".55" stop-color="#b9bfc5"/><stop offset="1" stop-color="#8f969d"/></linearGradient>
    <linearGradient id="${Pf}-aluV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa1a8"/><stop offset=".5" stop-color="#e6e9ec"/><stop offset="1" stop-color="#8f969d"/></linearGradient>
    <linearGradient id="${Pf}-tabla" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f45"/><stop offset=".4" stop-color="#23272b"/><stop offset="1" stop-color="#111316"/></linearGradient>
    <linearGradient id="${Pf}-pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d4248"/><stop offset=".45" stop-color="#1b1e21"/><stop offset="1" stop-color="#0c0d0f"/></linearGradient>
    <linearGradient id="${Pf}-plV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c0d0f"/><stop offset=".45" stop-color="#40464c"/><stop offset="1" stop-color="#0c0d0f"/></linearGradient>
    <radialGradient id="${Pf}-filtruF" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#6b9be0"/><stop offset=".55" stop-color="#1f56a8"/><stop offset="1" stop-color="#0a2550"/></radialGradient>
    <linearGradient id="${Pf}-hex" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dd97"/><stop offset=".3" stop-color="#d4ab4c"/><stop offset=".55" stop-color="#9b7724"/><stop offset=".8" stop-color="#d9b55e"/><stop offset="1" stop-color="#7f5f17"/></linearGradient>
    <linearGradient id="${Pf}-cauciuc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b3f44"/><stop offset="1" stop-color="#0d0f11"/></linearGradient>
    <linearGradient id="${Pf}-galben" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9a400"/><stop offset=".5" stop-color="#ffcf2e"/><stop offset="1" stop-color="#c79200"/></linearGradient>
    <radialGradient id="${Pf}-led" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe0d0"/><stop offset=".35" stop-color="#ff3b1f"/><stop offset="1" stop-color="#ff3b1f" stop-opacity="0"/></radialGradient>
    <radialGradient id="${Pf}-ledG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff1c8"/><stop offset=".35" stop-color="#ff9a1f"/><stop offset="1" stop-color="#ff9a1f" stop-opacity="0"/></radialGradient></defs>`;
  const surub = (x, y, r = 4.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${Pf}-crom)" stroke="#444" stroke-width=".6"/><path d="M${x - r * 0.55},${y} h${r * 1.1}" stroke="#555" stroke-width=".8"/>`;
  // cadrul standului (profile de oțel vopsite negru) și suporturile motorului
  s += `<rect x="20" y="398" width="740" height="14" rx="2" fill="#15171a"/><rect x="40" y="412" width="12" height="10" fill="#15171a"/><rect x="728" y="412" width="12" height="10" fill="#15171a"/>`;
  s += `<g id="ft-motor">`;
  // cutia de viteze (carcasa ambreiajului, aluminiu turnat) – stânga
  s += `<path d="M30,120 Q24,250 46,372 H120 V120 Z" fill="url(#${Pf}-aluV)" stroke="#6b7178" filter="url(#${Pf}-turnare)"/>${[150, 230, 310].map(y => surub(110, y)).join("")}${txt(70, 390, "cutia de viteze", { fs: 9 })}`;
  // baia de ulei (tablă ambutisată, neagră) cu flanșa și bușonul de golire
  s += `<path d="M132,330 H640 L628,378 Q622,392 604,392 H170 Q150,392 146,378 Z" fill="url(#${Pf}-tabla)" stroke="#000"/><rect x="126" y="326" width="520" height="8" rx="2" fill="#2b2f34" stroke="#000" stroke-width=".6"/>
    ${Array.from({ length: 11 }, (_, k) => surub(146 + k * 48, 330, 3.2)).join("")}<rect x="560" y="388" width="20" height="9" rx="2" fill="url(#${Pf}-crom)" stroke="#333"/>${txt(380, 368, "baia de ulei", { fs: 9.5, f: "#c3c8cd" })}`;
  // blocul motor (fontă turnată, cu nervuri și dopuri de golire a apei)
  s += `<rect x="120" y="164" width="530" height="164" fill="url(#${Pf}-fonta)" stroke="#33383d" filter="url(#${Pf}-turnare)"/>
    ${[190, 300, 410, 520].map(x => `<path d="M${x},170 L${x - 8},326 H${x + 14} L${x + 10},170 Z" fill="#7b8188" opacity=".7"/>`).join("")}
    ${[250, 470].map(x => `<circle cx="${x}" cy="196" r="11" fill="url(#${Pf}-crom)" stroke="#444"/><circle cx="${x}" cy="196" r="7" fill="none" stroke="#777"/>`).join("")}`;
  // chiulasa (aliaj de aluminiu) și garnitura
  s += `<rect x="112" y="108" width="546" height="56" fill="url(#${Pf}-alu)" stroke="#6b7178" filter="url(#${Pf}-turnare)"/><rect x="114" y="161" width="542" height="4" fill="#1d1f22"/>${[150, 260, 370, 480, 590].map(x => surub(x, 118, 3.4)).join("")}`;
  // capacul culbutorilor (aluminiu, nervurat) cu bușonul galben de umplere
  s += `<path d="M126,108 V74 Q126,58 146,58 H622 Q642,58 642,74 V108 Z" fill="url(#${Pf}-alu)" stroke="#7b8288"/>${Array.from({ length: 22 }, (_, k) => `<line x1="${150 + k * 21}" y1="64" x2="${150 + k * 21}" y2="104" stroke="#9aa1a8" stroke-width="2.4"/><line x1="${151.5 + k * 21}" y1="64" x2="${151.5 + k * 21}" y2="104" stroke="#f2f4f6" stroke-width="1"/>`).join("")}
    ${[140, 300, 460, 628].map(x => surub(x, 100, 3.6)).join("")}
    <g transform="translate(300 52)"><rect x="-24" y="-4" width="48" height="10" rx="2" fill="#b39a00"/><path d="M-22,-4 Q-22,-26 0,-26 Q22,-26 22,-4 Z" fill="#ffd400" stroke="#9c8300"/><rect x="-5" y="-30" width="10" height="26" rx="3" fill="#ffdf33" stroke="#9c8300"/></g>`;
  // capacul curelei de distribuție (plastic negru nervurat), fulia arborelui cotit, alternatorul cu cureaua
  s += `<path d="M650,64 H712 Q726,64 726,80 V300 Q726,330 698,336 H650 Z" fill="url(#${Pf}-plV)" stroke="#000"/>${Array.from({ length: 9 }, (_, k) => `<line x1="660" y1="${84 + k * 26}" x2="716" y2="${84 + k * 26}" stroke="#454b51" stroke-width="2"/>`).join("")}
    <path d="M700,350 L744,250" stroke="#191a1c" stroke-width="9"/><path d="M676,370 L722,252" stroke="#191a1c" stroke-width="9"/><path id="ft-curea" d="M700,350 L744,250 M676,370 L722,252" stroke="#3a3d41" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
    <circle cx="736" cy="228" r="34" fill="url(#${Pf}-aluV)" stroke="#555"/><g id="ft-alt">${Array.from({ length: 10 }, (_, k) => `<rect x="734" y="200" width="4" height="12" fill="#5b6168" transform="rotate(${k * 36} 736 228)"/>`).join("")}</g><circle cx="736" cy="228" r="12" fill="url(#${Pf}-crom)" stroke="#333"/>${txt(736, 278, "", { fs: 1 })}
    <circle cx="690" cy="360" r="30" fill="#2b2f34" stroke="#000"/><g id="ft-fulie"><circle cx="690" cy="360" r="24" fill="url(#${Pf}-crom)" stroke="#333"/>${[0, 1, 2, 3, 4].map(k => `<ellipse cx="690" cy="344" rx="5" ry="7" fill="#3a3f45" transform="rotate(${k * 72} 690 360)"/>`).join("")}<rect x="688" y="336" width="4" height="7" fill="#ffd400"/></g><circle cx="690" cy="360" r="6" fill="#222"/>`;
  // galeria de admisie (plastic negru): 4 tubulaturi care coboară în fața blocului spre colector, clapeta de accelerație
  s += `<g>${[198, 312, 426, 540].map(x => `<path d="M${x - 26},132 C${x - 34},170 ${x - 30},196 ${x - 16},214 H${x + 26} C${x + 18},196 ${x + 20},166 ${x + 26},132 Z" fill="url(#${Pf}-plV)" stroke="#000"/><rect x="${x - 30}" y="126" width="60" height="10" rx="2" fill="#16181b" stroke="#000"/>${surub(x - 22, 131, 3)}${surub(x + 22, 131, 3)}`).join("")}
    <path d="M150,206 H592 Q606,206 606,222 V240 Q606,256 590,256 H150 Q138,256 138,240 V222 Q138,206 150,206 Z" fill="url(#${Pf}-pl)" stroke="#000"/><path d="M160,214 H584" stroke="#4a5056" stroke-width="2"/>
    <rect x="104" y="212" width="40" height="38" rx="6" fill="url(#${Pf}-aluV)" stroke="#555"/><circle cx="124" cy="231" r="12" fill="#2b2f34" stroke="#111"/><path d="M104,231 C80,231 70,200 60,190" stroke="#111" stroke-width="3" fill="none"/>
    ${txt(372, 238, "galeria de admisie", { fs: 9.5, f: "#aeb5bc" })}</g>`;
  // filtrul de ulei (cartuș înșurubat pe bloc, văzut dinspre capăt) și suportul lui
  s += `<rect x="352" y="262" width="76" height="60" rx="8" fill="url(#${Pf}-fonta)" stroke="#33383d"/><circle cx="390" cy="292" r="38" fill="#0a2550"/><circle cx="390" cy="292" r="35" fill="url(#${Pf}-filtruF)" stroke="#061a3a"/>
    ${Array.from({ length: 16 }, (_, k) => `<path d="M${390 + 35 * Math.cos(k * 22.5 * RAD)},${292 + 35 * Math.sin(k * 22.5 * RAD)} L${390 + 27 * Math.cos(k * 22.5 * RAD)},${292 + 27 * Math.sin(k * 22.5 * RAD)}" stroke="#061a3a" stroke-width="3"/>`).join("")}
    <circle cx="390" cy="292" r="20" fill="#2a5fae" stroke="#0a2550"/><text x="390" y="295" font-size="7" text-anchor="middle" fill="#dce8fa" font-weight="700">FILTRU</text>${txt(390, 344, "", { fs: 1 })}`;
  // tubul jojei cu sonda termometrului (în locul jojei)
  s += `<path d="M576,318 C572,260 586,200 ${ST.joja[0]},${ST.joja[1] + 12}" stroke="#2b2f34" stroke-width="7" fill="none"/><path d="M576,318 C572,260 586,200 ${ST.joja[0]},${ST.joja[1] + 12}" stroke="#7b8288" stroke-width="3" fill="none"/>
    <rect x="${ST.joja[0] - 6}" y="${ST.joja[1] - 8}" width="12" height="22" rx="3" fill="#1b1d20" stroke="#000"/><rect x="${ST.joja[0] - 4}" y="${ST.joja[1] - 18}" width="8" height="12" fill="#c62828"/>
    `;
  // bosajul manocontactului pe bloc (partea admisiei, sub colector) și orificiul filetat
  s += `<path d="M${bx - 4},${by - 20} H${bx + 26} V${by + 20} H${bx - 4} Q${bx - 10},${by} ${bx - 4},${by - 20} Z" fill="url(#${Pf}-fonta)" stroke="#33383d"/><ellipse cx="${bx - 3}" cy="${by}" rx="4" ry="16" fill="#9aa1a8" stroke="#444"/><ellipse id="ft-gaura" cx="${bx - 3}" cy="${by}" rx="2.6" ry="7" fill="#1b1612" opacity="0"/>`;
  s += `<g id="ft-sw"></g><g id="ft-adapt"></g>`;
  // cablajul motorului (fascicul în manșon) spre manocontact
  s += `<path id="ft-fir" d="M${bx - 74},${by} C${bx - 110},${by} ${bx - 120},${by - 60} ${bx - 60},${by - 112} S ${bx + 100},${by - 150} ${bx + 160},${by - 176}" stroke="#1b1d20" stroke-width="5" fill="none"/>`;
  s += `</g><g id="ft-pic"></g>`;
  // etichete pe desen
  const et = (x1, y1, x2, y2, t, a = "start") => `<path d="M${x1},${y1} L${x2},${y2}" stroke="currentColor" stroke-width=".8" opacity=".7"/><circle cx="${x1}" cy="${y1}" r="2.2" fill="#ffb300"/><text x="${x2 + (a === "end" ? -3 : 3)}" y="${y2 + 3.5}" font-size="10" text-anchor="${a}" fill="currentColor" font-weight="600">${t}</text>`;
  s += et(bx - 30, by + 14, 120, 426, "manocontactul de presiune a uleiului", "start");
  s += et(372, 312, 430, 426, "filtrul de ulei");
  s += et(ST.joja[0], ST.joja[1] - 14, 520, 22, "tubul jojei – sonda termometrului", "end");
  s += et(300, 30, 250, 22, "bușonul de umplere cu ulei", "end");
  // furtunul manometrului (de la adaptor la manometru)
  s += `<path id="ft-furtun" d="" stroke="#141414" stroke-width="7" fill="none" stroke-linecap="round" opacity="0"/><g id="ft-man"></g>`;
  // termometrul de atelier (sonda K în tubul jojei)
  const TX = 40, TY = 470, OX = 250, PX = 470;
  s += `<path d="M${ST.joja[0]},${ST.joja[1] - 18} C${ST.joja[0] - 30},10 40,0 16,180 S 20,440 ${TX + 48},${TY - 8}" stroke="#202020" stroke-width="2.4" fill="none" opacity=".85"/>`;
  s += `<g transform="translate(${TX} ${TY}) scale(.78)" filter="url(#${Pf}-umbra)"><rect width="122" height="218" rx="18" fill="url(#${Pf}-galben)" stroke="#7a5a00"/><rect x="10" y="12" width="102" height="194" rx="11" fill="#2b2f34"/>
    <rect x="18" y="24" width="86" height="56" rx="5" fill="#a7b39b"/><text id="ft-T" x="98" y="64" text-anchor="end" font-size="27" font-family="'Courier New',monospace" font-weight="700" fill="#1d2618">--</text><text x="24" y="38" font-size="9" fill="#1d2618" font-weight="700">°C</text><text x="98" y="38" font-size="8" text-anchor="end" fill="#1d2618">T1  K</text>
    ${[[34, 112, "ON"], [88, 112, "HOLD"], [34, 150, "°C/°F"], [88, 150, "MAX"]].map(([x, y, t]) => `<rect x="${x - 20}" y="${y - 12}" width="40" height="24" rx="11" fill="#3e444a" stroke="#111"/><text x="${x}" y="${y + 4}" font-size="8" text-anchor="middle" fill="#d6dbe0">${t}</text>`).join("")}
    <text x="61" y="190" font-size="9" text-anchor="middle" fill="#ffcf2e" font-weight="700" letter-spacing="1">THERMOMETER</text><rect x="44" y="-10" width="34" height="12" rx="3" fill="#222"/></g>`;
  s += txt(TX + 48, 656, "termometru (sondă K)", { fs: 10 });
  s += `<g transform="translate(${OX - 90} ${TY}) scale(.78)" filter="url(#${Pf}-umbra)"><rect width="150" height="216" rx="14" fill="#1f2328" stroke="#000"/><rect x="10" y="12" width="130" height="102" rx="5" fill="#081521"/>
    <text x="20" y="32" font-size="9.5" fill="#7fb7e8">K7J · Date curente</text><text x="20" y="54" font-size="9" fill="#9fb3c6">Turație motor</text><text id="ft-n" x="130" y="82" text-anchor="end" font-size="26" font-family="'Courier New',monospace" font-weight="700" fill="#6dff8e">0</text><text x="130" y="100" text-anchor="end" font-size="9" fill="#9fb3c6">rot/min</text>
    <rect x="22" y="130" width="106" height="20" rx="4" fill="#2d333a"/><text x="75" y="144" font-size="9" text-anchor="middle" fill="#cfd5db">◀  OK  ▶</text><circle cx="75" cy="178" r="17" fill="#2d333a" stroke="#111"/><text x="75" y="182" font-size="9" text-anchor="middle" fill="#cfd5db">ESC</text></g>`;
  s += txt(OX - 31, 656, "tester OBD (turația)", { fs: 10 });
  s += `<g transform="translate(${PX - 150} ${TY}) scale(.78)" filter="url(#${Pf}-umbra)"><rect width="146" height="216" rx="8" fill="#111417" stroke="#000"/>
    <rect x="12" y="14" width="122" height="70" rx="10" fill="#050607" stroke="#2b3035"/>
    <g transform="translate(42 50)"><circle r="22" fill="url(#${Pf}-led)" id="ft-halo" opacity="0"/><path id="ft-lampa" d="M-18,6 H6 L16,-2 L20,-1 L21,-4 L14,-5 L5,1 H-4 V-4 H2 V-7 H-10 V-4 H-6 V1 H-14 L-18,-2 Z M18,1 Q20,5 18,7 Q16,5 18,1 Z" fill="#2a1b0c" stroke="#3a2a10" stroke-width=".8"/></g>
    <g transform="translate(104 50)"><circle r="22" fill="url(#${Pf}-ledG)" id="ft-halo2" opacity="0"/><path id="ft-baterie" d="M-14,-8 h28 v16 h-28 z M-9,-12 v4 M9,-12 v4 M-10,0 h6 M4,0 h6 M7,-3 v6" fill="none" stroke="#2a1b0c" stroke-width="2"/></g>
    <text x="73" y="98" font-size="8.5" text-anchor="middle" fill="#9aa1a8">presiune ulei · încărcare</text>
    <circle cx="73" cy="152" r="34" fill="#2b3035" stroke="#000"/><circle cx="73" cy="152" r="24" fill="url(#${Pf}-crom)"/><g id="ft-cheie"><rect x="69" y="122" width="8" height="40" rx="2" fill="#1b1d20"/><rect x="62" y="116" width="22" height="14" rx="6" fill="#1b1d20"/></g>
    <text x="40" y="196" font-size="8" fill="#9aa1a8">0</text><text x="98" y="128" font-size="8" fill="#9aa1a8">I</text><text x="108" y="150" font-size="8" fill="#9aa1a8">II</text></g>`;
  s += txt(PX - 93, 656, "panoul standului", { fs: 10 });
  s += `<text id="ft-et" x="${ST.gauge[0]}" y="${ST.gauge[1] + ST.R + 84}" font-size="10.5" text-anchor="middle" font-weight="700" fill="currentColor"></text>`;
  s += `<text id="ft-stare" x="760" y="22" font-size="12" font-weight="700" text-anchor="end" fill="currentColor"></text>`;
  return s;
}
function construiesteStand() { const el = $("#svg-ft"); if (el) el.innerHTML = standSVG(); sim.picF = []; }
/** manocontactul (desen realist): corp hexagonal din alamă, filet, izolator negru cu borna tip lamelă și fișa cu fir */
function desenManocontact(x, y, rotit, cuFisa) {
  const f = (rotit * 6) % 1, fete = [0, 1, 2].map(j => (((j + f) / 3) * 26).toFixed(1));
  return `<g transform="translate(${x} ${y})">
    <rect x="0" y="-7" width="14" height="14" fill="#a68a3c"/>${Array.from({ length: 7 }, (_, k) => `<line x1="${2 + k * 2}" y1="-7" x2="${1 + k * 2}" y2="7" stroke="#6d5718" stroke-width=".8"/>`).join("")}
    <path d="M-22,-15 h22 v30 h-22 z" fill="url(#ft-hex)" stroke="#5b4510"/>${fete.map(o => `<line x1="-22" y1="${-15 + +o * 30 / 26}" x2="0" y2="${-15 + +o * 30 / 26}" stroke="#7a5c16" stroke-width="1"/>`).join("")}
    <path d="M-40,-11 h18 v22 h-18 z" fill="#15181b" stroke="#000"/><rect x="-52" y="-3" width="13" height="6" fill="#d8c27a" stroke="#8a7330" stroke-width=".6"/>
    ${cuFisa ? `<path d="M-74,-9 h22 v18 h-22 z" fill="#2b2f34" stroke="#000"/><path d="M-74,0 C-100,0 -110,-30 -150,-40" stroke="#2e7d32" stroke-width="3.2" fill="none"/>` : ""}</g>`;
}
/** adaptorul manometrului cu furtunul */
function desenAdaptor(x, y, rotit) {
  const f = (rotit * 6) % 1;
  return `<g transform="translate(${x} ${y})"><rect x="0" y="-6" width="14" height="12" fill="#a68a3c"/><path d="M-18,-13 h18 v26 h-18 z" fill="url(#ft-hex)" stroke="#5b4510"/><line x1="-18" y1="${(-13 + f * 26).toFixed(1)}" x2="0" y2="${(-13 + f * 26).toFixed(1)}" stroke="#7a5c16"/>
    <rect x="-34" y="-8" width="16" height="16" fill="#c9cdd1" stroke="#555"/><path d="M-46,-11 h12 v22 h-12 z" fill="url(#ft-hex)" stroke="#5b4510"/><path d="M-46,0 h-14" stroke="#141414" stroke-width="8"/></g>`;
}
function actualizeazaStand(dt) {
  const el = $("#svg-ft"); if (!el || !el.getClientRects().length) return;
  const pr = P(), [GX, GY] = ST.gauge;
  // vibrația motorului pe tampoane (mai puternică la ralanti, la frecvența de aprindere)
  const A = sim.merge ? (sim.reg === "ral" ? 0.9 : 0.45) : 0, f2 = sim.n / 30;
  $("#ft-motor").setAttribute("transform", A ? `translate(${(A * Math.sin(sim.t * f2 * 2 * Math.PI * 0.13)).toFixed(2)} ${(A * 0.7 * Math.cos(sim.t * f2 * 2 * Math.PI * 0.11)).toFixed(2)})` : "");
  // manocontactul: desfacerea/înșurubarea animată (≈ 6 ture de filet)
  sim.vSw += ((sim.senzor ? 0 : 1) - sim.vSw) * Math.min(1, dt / 0.45); sim.vMan += ((sim.man ? 1 : 0) - sim.vMan) * Math.min(1, dt / 0.45);
  if (Math.abs(sim.vSw - (sim.senzor ? 0 : 1)) < 0.004) sim.vSw = sim.senzor ? 0 : 1;
  if (Math.abs(sim.vMan - (sim.man ? 1 : 0)) < 0.004) sim.vMan = sim.man ? 1 : 0;
  const [bx, by] = ST.sw;
  $("#ft-sw").innerHTML = sim.vSw < 0.999 ? desenManocontact(bx - sim.vSw * 70, by, sim.vSw, sim.vSw < 0.02) : "";
  $("#ft-adapt").innerHTML = sim.vMan > 0.001 ? desenAdaptor(bx - (1 - sim.vMan) * 60, by, sim.vMan) : "";
  $("#ft-gaura").setAttribute("opacity", sim.vSw > 0.6 && sim.vMan < 0.4 ? 1 : 0);
  $("#ft-furtun").setAttribute("opacity", sim.vMan > 0.95 ? 1 : 0);
  $("#ft-furtun").setAttribute("d", `M${bx - 60},${by} C${bx - 110},${by + 30} ${bx - 100},${by + 92} ${bx}, ${by + 92} S ${GX - 40},${by + 100} ${GX},${GY + ST.R + 24}`);
  $("#ft-fir").setAttribute("opacity", sim.vSw < 0.02 ? 1 : 0);
  // picurarea uleiului din orificiul deschis (după demontare, câteva picături)
  if (!sim.senzor && !sim.man && sim.vSw > 0.9 && (sim.dripLeft || 0) > 0 && Math.random() < dt * 3) { sim.picF.push({ x: bx - 6, y: by + 8, vy: 0 }); sim.dripLeft--; }
  sim.picF.forEach(p => { p.vy += 300 * dt; p.y += p.vy * dt; }); sim.picF = sim.picF.filter(p => p.y < ST.fund);
  $("#ft-pic").innerHTML = sim.picF.map(p => `<ellipse cx="${p.x}" cy="${p.y.toFixed(1)}" rx="2.4" ry="3.6" fill="#b07a24"/>`).join("");
  $("#ft-et").textContent = sim.senzor ? (sim.vSw > 0.001 ? "se înșurubează manocontactul…" : "manocontactul montat pe bloc (cu fișa conectată)") : sim.man ? (sim.vMan < 0.999 ? "se înșurubează adaptorul manometrului…" : "manometrul montat în locul manocontactului") : (sim.vSw < 0.999 ? "se deșurubează manocontactul…" : "racord deschis – nu porniți motorul!");
  // manometrul de control (cadran glicerină, husă de cauciuc)
  const g = $("#ft-man");
  if (sim.man) { const cx = GX, cy = GY, R = ST.R;
    g.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${R + 18}" fill="url(#ft-cauciuc)"/><rect x="${cx - 9}" y="${cy + R + 6}" width="18" height="18" fill="url(#ft-hex)"/>` + svgGauge("ft", cx, cy, R, 10, sim.pAc, { maj: 1, unit: "bar", marca: "OIL PRESSURE · GLYCERINE", s2: { max: 140, maj: 20, unit: "psi", f: 140 / 145.04 }, benzi: [[0, 0.5, "#d32f2f"]] }) + `<ellipse cx="${cx + 18}" cy="${cy - R * 0.72}" rx="6" ry="3" fill="#fff" opacity=".55"/>` + txt(cx, cy - R - 28, "manometru de control 0…10 bar", { fs: 10.5, w: 600 });
  } else g.innerHTML = txt(GX, GY, "manometrul de control", { fs: 11, f: "var(--text-sec)" }) + txt(GX, GY + 16, "(nemontat)", { fs: 10, f: "var(--text-sec)" });
  // afișajele aparatelor (termometrul: 1 actualizare/s; testerul: 2/s, ca aparatele reale)
  $("#ft-T").textContent = fx(sim.Tafis, 1); $("#ft-n").textContent = fx(sim.nAfis, 0);
  // martorii: presiune ulei (manocontact închis) și încărcare (alternatorul nu debitează cu motorul oprit)
  const lampa = sim.contact && sim.senzor && sim.p < pr.pSw, bat = sim.contact && !sim.merge;
  $("#ft-lampa").setAttribute("fill", lampa ? "#ff4a26" : "#2a1b0c"); $("#ft-halo").setAttribute("opacity", lampa ? 0.75 : 0);
  $("#ft-baterie").setAttribute("stroke", bat ? "#ffb02e" : "#2a1b0c"); $("#ft-halo2").setAttribute("opacity", bat ? 0.6 : 0);
  $("#ft-cheie").setAttribute("transform", `rotate(${sim.merge ? 75 : sim.contact ? 45 : 0} 73 152)`);
  // fulia arborelui cotit, alternatorul și cureaua (încetinite ca în secțiune)
  sim.thF = ((sim.thF || 0) + sim.n / 60 * 360 * dt * VIZ) % 360;
  $("#ft-fulie").setAttribute("transform", `rotate(${sim.thF.toFixed(1)} 690 360)`); $("#ft-alt").setAttribute("transform", `rotate(${(sim.thF * 2.6).toFixed(1)} 736 228)`);
  $("#ft-curea").setAttribute("stroke-dashoffset", (-sim.thF * 0.42).toFixed(1));
  $("#ft-stare").textContent = sim.merge ? `motor pornit – ${ET_REG[sim.reg]}` : sim.contact ? "contact pus – motor oprit" : "";
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
    instr: ["NSSM: mănuși de nitril și ochelari; uleiul cald (80…110 °C) provoacă arsuri.", "Pe panoplie, faceți clic pe fiecare tip de pompă de ulei (roți dințate, rotor, debit variabil).", "În vederea „Circuitul de ungere (secțiune)”, identificați elementele circuitului din Fig. 4.1 (clic pe ele)."],
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
  aratVedere(i === 0 ? "sectiune" : "stand");
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

function aratVedere(v) {
  sim.vedere = v; $("#svg-ft").style.display = v === "stand" ? "" : "none"; $("#svg-sx").style.display = v === "sectiune" ? "" : "none";
  $$("[data-vedere]").forEach(b => b.classList.toggle("activ", b.dataset.vedere === v));
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
<p>Sistemul de ungere sub presiune asigură formarea peliculei portante în lagăre, răcirea pistoanelor (duze de răcire), ungerea turbosuflantei și alimentarea elementelor hidraulice (tachete, variatorul de fază). Pompa antrenată de motor are debitul proporțional cu turația; presiunea este limitată de supapa de siguranță. Presiunea depinde de rezistența hidraulică a circuitului și de vâscozitatea uleiului, care scade puternic cu temperatura.</p>
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
#svg-ft, #svg-sx, #svg-pan, #svg-mm { width:100%; height:auto; display:block; color:var(--text); }
#svg-sx [data-comp].sel { filter:drop-shadow(0 0 3px #ffb300) drop-shadow(0 0 6px #ffb300); }
.saa4-vederi { display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:.4rem; } .saa4-vederi button.activ { background:color-mix(in srgb, var(--accent) 18%, var(--suprafata)); border-color:var(--accent); }
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
      <div class="saa4-vederi"><button type="button" data-vedere="stand">Motorul și aparatele</button><button type="button" data-vedere="sectiune">Circuitul de ungere (secțiune)</button></div>
      <svg id="svg-ft" viewBox="0 0 1000 660" role="img" aria-label="Motorul K7J (partea admisiei) cu manometrul, termometrul, testerul OBD și panoul de comandă"></svg>
      <svg id="svg-sx" viewBox="0 0 1100 640" role="img" aria-label="Secțiune prin motorul K7J: circuitul de ungere animat" style="display:none"></svg>
      <p class="nota" id="comp-desc">În secțiune: clic pe o componentă a circuitului pentru descrierea ei.</p>
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
      construiesteSectiune(); construiesteStand(); construiestePanoplia(); construiestePasi();
      $$("[data-vedere]").forEach(b => b.addEventListener("click", () => aratVedere(b.dataset.vedere)));
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
      actualizeazaStand(dt); actualizeazaSectiune(dt); animaPanoplia(dt);
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
