/* Turbosuflanta 3D (realistă, materiale PBR) – generatorul comun și cele două scene care îl folosesc:
   • creeazaAnimatieTurbo – animația funcționării, cu variantele constructive: fără reglare, wastegate pneumatic, wastegate electric,
     geometrie variabilă (VGT) cu actuator pneumatic + electrovalvă EVRV, VGT cu actuator electric, twin-scroll, turbo cu asistare electrică;
     curgerea aerului și a gazelor (particule), secțiunea (sfert decupat, suprafețele tăiate vopsite roșu) și modul transparent;
   • creeazaStandTurbo – standul motorului 1.5 dCi cu turbosuflanta VGT, intercoolerul, filtrul, EVRV, aparatele de măsură (pompa de vacuum
     cu manometru, comparatorul pe suport magnetic, termocuplele T1/T2/T3 cu termometrul cu 4 canale, testerul OBD) și masa cu cele două
     turbosuflante secționate (wastegate și VGT) pentru identificare.
   Axa turbosuflantei este axa X (compresorul spre +X, turbina spre −X); unități: metri. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); m.envMapIntensity = 0.75; return m; };
const RB = (a, b, c, r = 0.004) => new RoundedBoxGeometry(a, b, c, 2, Math.min(r, a / 2.01, b / 2.01, c / 2.01));
function texCanvas(w, h, f, rep) { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
function ecran(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, x: c.getContext("2d"), t }; }

/* ------------------------------------------------------------------ materiale */
function materiale() {
  // fonta turnată (carcasa turbinei): textură granulară
  const tFonta = texCanvas(128, 128, (x, w, h) => { x.fillStyle = "#6e665f"; x.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { const v = 70 + Math.random() * 60; x.fillStyle = `rgba(${v + 20},${v + 10},${v},.35)`; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } }, [3, 3]);
  const tAluT = texCanvas(128, 128, (x, w, h) => { x.fillStyle = "#b9bec3"; x.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { const v = 160 + Math.random() * 60; x.fillStyle = `rgba(${v},${v + 3},${v + 6},.4)`; x.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4); } }, [3, 3]);
  return {
    fonta: mat({ color: 0x8a7f78, map: tFonta, roughness: 0.82, metalness: 0.45, emissive: 0xff3300, emissiveIntensity: 0, side: THREE.DoubleSide }),
    aluT: mat({ color: 0xd5d9dd, map: tAluT, roughness: 0.55, metalness: 0.7, side: THREE.DoubleSide }),
    aluL: mat({ color: 0xd9dde1, roughness: 0.22, metalness: 0.95 }),
    otel: mat({ color: 0x8e959c, roughness: 0.4, metalness: 0.85 }), crom: mat({ color: 0xeef1f4, roughness: 0.12, metalness: 1 }),
    inconel: mat({ color: 0x8f8a82, roughness: 0.35, metalness: 0.9, emissive: 0xff3300, emissiveIntensity: 0 }),
    chra: mat({ color: 0x6e7378, roughness: 0.6, metalness: 0.6, side: THREE.DoubleSide }),
    negru: mat({ color: 0x1b1d20, roughness: 0.55 }), cauc: mat({ color: 0x131416, roughness: 0.88, side: THREE.DoubleSide }), plastic: mat({ color: 0x24272b, roughness: 0.5, side: THREE.DoubleSide }),
    cupru: mat({ color: 0xc87533, roughness: 0.3, metalness: 0.95 }), alama: mat({ color: 0xc9a043, roughness: 0.3, metalness: 1 }), magnet: mat({ color: 0x5b6470, roughness: 0.3, metalness: 0.8 }),
    taiat: mat({ color: 0xc8202a, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }), galben: mat({ color: 0xf2b705, roughness: 0.55 }),
    ulei: mat({ color: 0xe0a238, emissive: 0x7a4300, emissiveIntensity: 0.3, roughness: 0.25 }), albastru: mat({ color: 0x1f5fbf, roughness: 0.5 }), rosu: mat({ color: 0xc62828, roughness: 0.45 })
  };
}

/* ------------------------------------------------------------------ geometrii: corpuri de revoluție în jurul axei X, volute */
/** corp de revoluție plin: poligonul închis [[x, r], …] rotit de la th0 la th1 (cu capace pe fețele tăiate dacă nu e închis) */
function revSolid(poly, th0 = 0, th1 = Math.PI * 2, seg = 48) {
  const P = poly.concat([poly[0]]), N = P.length, pos = [], idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j <= seg; j++) { const th = th0 + (th1 - th0) * j / seg, [x, r] = P[i]; pos.push(x, r * Math.cos(th), r * Math.sin(th)); }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function capRev(poly, th) { const s = new THREE.Shape(poly.map(([x, r]) => new THREE.Vector2(x, r))); const g = new THREE.ShapeGeometry(s); g.rotateX(th); return g; }
/** volută (tub spiralat cu secțiune inelară): centrul la x0, rază de centru Rc0→Rc1, raza tubului r0→r1, unghiul θ de la a0 la a1;
    w = grosimea peretelui; întoarce { ext, int, capete[], cale(u) } */
function voluta(x0, Rc0, Rc1, r0, r1, a0, a1, w, segU = 64, segV = 24, taie = null) {
  const C = u => { const th = a0 + (a1 - a0) * u, R = Rc0 + (Rc1 - Rc0) * u; return { th, R, r: r0 + (r1 - r0) * u }; };
  const tub = (dr, flip) => { const pos = [], idx = [];
    for (let i = 0; i <= segU; i++) { const { th, R, r } = C(i / segU), rr = Math.max(0.001, r + dr);
      for (let j = 0; j <= segV; j++) { const ph = j / segV * Math.PI * 2, rad = R + rr * Math.cos(ph), ax = x0 + rr * Math.sin(ph); pos.push(ax, rad * Math.cos(th), rad * Math.sin(th)); } }
    for (let i = 0; i < segU; i++) for (let j = 0; j < segV; j++) { const a = i * (segV + 1) + j, b = a + segV + 1; if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const inel = u => { const { th, R, r } = C(u), s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2); const h = new THREE.Path(); h.absarc(0, 0, Math.max(0.001, r - w), 0, Math.PI * 2, true); s.holes.push(h);
    const g = new THREE.ShapeGeometry(s, 24); // plan (ax, rad) → spațiu
    const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const ax = p.getX(k), rd = p.getY(k), rad = R + rd; p.setXYZ(k, x0 + ax, rad * Math.cos(th), rad * Math.sin(th)); } g.computeVertexNormals(); return g; };
  return { ext: tub(0, false), int: tub(-w, true), capete: [inel(0), inel(1)], C };
}
/** palete de rotor (compresor / turbină): profilul meridional [[x, r]] extrudat cu grosimea t, răsucit cu tw(x) [rad] */
function paleta(prof, t, tw) {
  const s = new THREE.Shape(prof.map(([x, r]) => new THREE.Vector2(x, r))), g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 4, steps: 1 });
  g.translate(0, 0, -t / 2); const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const x = p.getX(k), r = p.getY(k), z = p.getZ(k), a = tw(x, r); p.setXYZ(k, x, r * Math.cos(a) - z * Math.sin(a), r * Math.sin(a) + z * Math.cos(a)); }
  g.computeVertexNormals(); return g;
}

/* ------------------------------------------------------------------ generatorul turbosuflantei
   opt: { tip: "fix" | "wg" | "vgt" | "twin" | "eturbo", act: "pres" | "vac" | "el" | null, sectiune: bool }
   întoarce { G, rotor, carcase[], taiate[], clic[], seteaza(u), cai{ aer, gaz, wg }, ancore{} } */
export function construiesteTurbo(opt = {}) {
  const M = opt.M || materiale(), G = new THREE.Group(), tip = opt.tip || "vgt", act = opt.act === undefined ? (tip === "vgt" ? "vac" : tip === "fix" ? null : "pres") : opt.act;
  const S = !!opt.sectiune, TH0 = S ? Math.PI * 0.5 : 0, TH1 = Math.PI * 2;          // secțiunea: se decupează sfertul θ ∈ (0, π/2) – sus, spre privitor
  const carcase = [], taiate = [], clic = [], ancore = {};
  const k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const mesh = (g, m, par = G) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const carc = (g, m, k, et, par = G) => { const o = mesh(g, m.clone(), par); o.userData.m0 = { t: o.material.transparent, op: o.material.opacity }; carcase.push(o); if (k) k_(o, k, et); return o; };
  const rev = (poly, m, k, et, par = G, inchis = false) => { const a0 = inchis ? 0 : TH0, o = carc(revSolid(poly, a0, TH1, 56), m, k, et, par); if (S && !inchis) [a0, TH1].forEach(th => taiate.push(mesh(capRev(poly, th), M.taiat, par))); return o; };
  const cyl = (r1, r2, h, m, x, y, z, ax = "x", par = G, seg = 32) => { const o = mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m, par); o.position.set(x, y, z); if (ax === "x") o.rotation.z = Math.PI / 2; else if (ax === "z") o.rotation.x = Math.PI / 2; return o; };
  const tub = (pts, r, m, par = G, seg = 40, rs = 10) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => Array.isArray(p) ? V3(...p) : p)), seg, r, rs), m, par);
  const vol = (x0, Rc0, Rc1, r0, r1, a0, a1, w, m, k, et) => { const v = voluta(x0, Rc0, Rc1, r0, r1, a0, a1, w); const o = carc(v.ext, m, k, et); carc(v.int, m); if (S) v.capete.forEach(c => taiate.push(mesh(c, M.taiat))); return { o, C: v.C }; };

  /* ========== COMPRESORUL (+X): carcasa din aluminiu turnat, roata cu 6 + 6 palete (principale și intermediare) */
  const XC = 0.052;
  rev([[0.118, 0.0285], [0.118, 0.0325], [0.112, 0.0325], [0.108, 0.031], [0.084, 0.031], [0.07, 0.034], [0.06, 0.044], [0.052, 0.05], [0.046, 0.05], [0.046, 0.047], [0.054, 0.043], [0.064, 0.031], [0.07, 0.0265], [0.082, 0.0255], [0.112, 0.0255]],
    M.aluT, "carcasaC", "Carcasa compresorului (aluminiu turnat): intrarea axială, difuzorul și voluta");
  const thC = opt.thC || 0, thT = opt.thT ?? Math.PI / 4;
  const vC = vol(XC, 0.056, 0.064, 0.011, 0.021, -Math.PI * 0.12 + thC, Math.PI * 1.75 + thC, 0.0035, M.aluT, "carcasaC", "Voluta compresorului – aerul comprimat se colectează și iese tangențial");
  { const { th, R, r } = vC.C(1), P0 = V3(XC, R * Math.cos(th), R * Math.sin(th)), T = V3(0, -Math.sin(th), Math.cos(th)), P1 = P0.clone().addScaledVector(T, 0.07);
    const g = new THREE.CylinderGeometry(r, r, 0.07, 32, 1, true), o = carc(g, M.aluT, "carcasaC", "Ieșirea compresorului spre intercooler"); o.position.copy(P0.clone().add(P1).multiplyScalar(0.5)); o.quaternion.setFromUnitVectors(V3(0, 1, 0), T);
    const fl = mesh(new THREE.TorusGeometry(r + 0.001, 0.0035, 10, 36), M.aluT); fl.position.copy(P1); fl.quaternion.setFromUnitVectors(V3(0, 0, 1), T); ancore.iesC = P1.clone(); ancore.iesCdir = T.clone(); ancore.rIesC = r; }
  rev([[0.046, 0.012], [0.046, 0.05], [0.041, 0.052], [0.04, 0.012]], M.aluT, "carcasaC", "Placa din spate a compresorului (cu etanșarea arborelui)");
  ancore.intC = V3(0.118, 0, 0);
  // roata compresorului (aliaj de aluminiu frezat)
  const rotor = new THREE.Group(); G.add(rotor);
  rev([[0.083, 0], [0.083, 0.0045], [0.075, 0.007], [0.06, 0.011], [0.05, 0.019], [0.047, 0.023], [0.047, 0]], M.aluL, "rotC", "Roata compresorului (aluminiu, 6 palete principale + 6 intermediare)", rotor, true);
  for (let k = 0; k < 12; k++) { const pr = k % 2 === 0 ? [[0.082, 0.0055], [0.082, 0.0245], [0.074, 0.0248], [0.062, 0.025], [0.052, 0.0295], [0.048, 0.0298], [0.048, 0.022], [0.052, 0.018], [0.062, 0.011], [0.074, 0.0075]]
      : [[0.068, 0.0095], [0.068, 0.0248], [0.062, 0.025], [0.052, 0.0295], [0.048, 0.0298], [0.048, 0.022], [0.052, 0.018], [0.062, 0.011]];
    const b = mesh(paleta(pr, 0.0011, (x, r) => -0.95 * Math.pow(Math.max(0, (x - 0.05) / 0.032), 1.6) * (0.6 + 0.4 * r / 0.025) - 0.25 * Math.max(0, (0.056 - x) / 0.008)), M.aluL, rotor); b.rotation.x = k / 12 * Math.PI * 2; k_(b, "rotC", "Roata compresorului (aluminiu, 6 palete principale + 6 intermediare)"); }
  cyl(0.0035, 0.0035, 0.012, M.crom, 0.087, 0, 0, "x", rotor, 6);                                                                            // piulița roții
  /* ========== CARCASA CENTRALĂ (lagărele, ungerea, răcirea cu apă) */
  rev([[0.04, 0.012], [0.04, 0.036], [0.035, 0.036], [0.033, 0.03], [0.012, 0.031], [0.006, 0.036], [-0.016, 0.036], [-0.022, 0.03], [-0.028, 0.03], [-0.03, 0.034], [-0.034, 0.034], [-0.034, 0.012]],
    M.chra, "chra", "Carcasa centrală (CHRA): lagărele radiale flotante, lagărul axial, canalele de ulei și de apă");
  cyl(0.009, 0.01, 0.022, M.chra, 0.008, 0.042, 0, "y"); cyl(0.0035, 0.0035, 0.024, M.alama, 0.008, 0.052, 0, "y"); k_(G.children[G.children.length - 2], "ungere", "Intrarea uleiului de ungere (din galeria motorului)"); ancore.ulei = V3(0.008, 0.064, 0);
  { const f = mesh(RB(0.03, 0.008, 0.026, 0.002), M.chra); f.position.set(0.008, -0.04, 0); k_(f, "ungere", "Returul uleiului – liber, spre baie (flanșa jos)"); ancore.retur = V3(0.008, -0.044, 0); }
  [-1, 1].forEach(s => { const o = cyl(0.0055, 0.0055, 0.016, M.alama, -0.006, 0, s * 0.04, "z"); k_(o, "apa", "Racordurile de apă (răcirea carcasei centrale după oprirea motorului)"); });
  // arborele și lagărele (vizibile în secțiune / transparent)
  cyl(0.0045, 0.0045, 0.16, M.crom, 0.005, 0, 0, "x", rotor, 16);
  [0.024, -0.012].forEach(x => { const o = cyl(0.0085, 0.0085, 0.01, M.alama, x, 0, 0, "x"); k_(o, "lagare", "Lagărele radiale flotante (bucșe de bronz în film de ulei)"); });
  { const o = cyl(0.014, 0.014, 0.003, M.alama, 0.034, 0, 0); k_(o, "lagare", "Lagărul axial (preia forța axială a rotorului)"); }
  /* ========== TURBINA (−X): carcasa din fontă, roata din Inconel */
  const XT = -0.05, twin = tip === "twin";
  rev([[-0.034, 0.014], [-0.034, 0.05], [-0.04, 0.052], [-0.044, 0.042], [-0.05, 0.034], [-0.062, 0.03], [-0.07, 0.03], [-0.104, 0.031], [-0.104, 0.046], [-0.112, 0.046], [-0.112, 0.0255], [-0.07, 0.0255], [-0.062, 0.025], [-0.054, 0.027], [-0.046, 0.03], [-0.038, 0.03]],
    M.fonta, "carcasaT", "Carcasa turbinei (fontă / oțel refractar): voluta, ieșirea axială spre downpipe");
  let vT;
  if (twin) { vT = vol(XT + 0.006, 0.056, 0.064, 0.008, 0.016, thT, thT - Math.PI * 1.87, 0.003, M.fonta, "carcasaT", "Voluta twin-scroll – canalul 1 (cilindrii 1 și 4)"); vol(XT - 0.012, 0.056, 0.064, 0.008, 0.016, thT, thT - Math.PI * 1.87, 0.003, M.fonta, "carcasaT", "Voluta twin-scroll – canalul 2 (cilindrii 2 și 3)"); }
  else vT = vol(XT, 0.056, 0.066, 0.012, 0.023, thT, thT - Math.PI * 1.87, 0.0035, M.fonta, "carcasaT", "Voluta turbinei – gazele intră tangențial și se accelerează spre roată");
  { const { th, R, r } = vT.C(0), P0 = V3(XT, R * Math.cos(th), R * Math.sin(th)), T = V3(0, Math.sin(th), -Math.cos(th)), P1 = P0.clone().addScaledVector(T, 0.05);
    const W = twin ? 0.05 : 0.046, H = twin ? 0.034 : 0.046, gi = carc(RB(W, H, 0.05, 0.006), M.fonta, "carcasaT", "Intrarea gazelor (flanșa pe colectorul de evacuare)"); gi.position.copy(P0.clone().add(P1).multiplyScalar(0.5)).add(V3(twin ? -0.003 : 0, 0, 0)); gi.quaternion.setFromUnitVectors(V3(0, 0, 1), T);
    const fl = carc(RB(0.072, 0.07, 0.01, 0.004), M.fonta, "carcasaT", "Flanșa de intrare pe colectorul de evacuare" + (twin ? " (două canale separate)" : "")); fl.position.copy(P1); fl.quaternion.setFromUnitVectors(V3(0, 0, 1), T);
    ancore.intT = P1.clone(); ancore.intTdir = T.clone(); }
  ancore.iesT = V3(-0.112, 0, 0);
  // roata turbinei (11 palete radiale, exducer răsucit), sudată pe arbore
  rev([[-0.036, 0], [-0.036, 0.023], [-0.04, 0.02], [-0.05, 0.011], [-0.064, 0.0075], [-0.07, 0.006], [-0.07, 0]], M.inconel, "rotT", "Roata turbinei (superaliaj Inconel, sudată pe arbore)", rotor, true);
  for (let k = 0; k < 11; k++) { const b = mesh(paleta([[-0.037, 0.02], [-0.037, 0.0235], [-0.045, 0.0235], [-0.056, 0.022], [-0.068, 0.02], [-0.068, 0.0075], [-0.058, 0.009], [-0.048, 0.013]], 0.0012,
      (x) => 0.75 * Math.pow(Math.max(0, (-0.05 - x) / 0.018), 1.4)), M.inconel, rotor); b.rotation.x = k / 11 * Math.PI * 2; k_(b, "rotT", "Roata turbinei (superaliaj Inconel, sudată pe arbore)"); }
  /* ========== GEOMETRIA VARIABILĂ: inelul cu 11 palete directoare pivotante, inelul de comandă, maneta exterioară */
  const vane = [];
  let inelCmd = null;
  if (tip === "vgt") {
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2, P = new THREE.Group(); P.position.set(XT, 0.034 * Math.cos(a), 0.034 * Math.sin(a)); G.add(P); P.userData.a = a;
      const sh = new THREE.Shape(); sh.moveTo(-0.0075, 0); sh.quadraticCurveTo(-0.003, 0.0022, 0.0075, 0.0004); sh.lineTo(0.0075, -0.0004); sh.quadraticCurveTo(-0.003, -0.0012, -0.0075, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.011, bevelEnabled: false }); g.translate(0, 0, -0.0055); g.rotateY(Math.PI / 2);   // coarda în planul YZ, lățimea pe X
      const o = mesh(g, M.inconel, P); k_(o, "palete", "Paletele directoare VGT – închise: secțiune mică, viteză mare a gazelor (presiune la turații mici); deschise: debit mare");
      cyl(0.0012, 0.0012, 0.03, M.otel, 0.012, 0, 0, "x", P, 6); vane.push(P); }
    inelCmd = mesh(new THREE.TorusGeometry(0.041, 0.0018, 6, 64), M.otel); inelCmd.rotation.y = Math.PI / 2; inelCmd.position.x = -0.03; k_(inelCmd, "inel", "Inelul de comandă – rotește simultan toate paletele");
    ancore.vgt = V3(-0.026, -0.05, 0.03);
  }
  /* ========== WASTEGATE: clapeta în ieșirea turbinei, axul, maneta exterioară */
  let clapeta = null;
  if (tip === "wg" || tip === "twin" || tip === "eturbo" || tip === "fix") {
    const port = cyl(0.0085, 0.0085, 0.006, M.fonta, -0.1, 0.014, 0, "x"); k_(port, "wg", "Orificiul wastegate (ocolirea turbinei)");
    if (tip !== "fix") { clapeta = new THREE.Group(); clapeta.position.set(-0.104, 0.03, 0); G.add(clapeta);
      const d = cyl(0.0095, 0.0095, 0.0025, M.inconel, 0, -0.016, 0, "x", clapeta); k_(d, "wg", "Clapeta wastegate – se deschide pentru a limita presiunea de supraalimentare");
      const br = mesh(RB(0.003, 0.018, 0.006, 0.001), M.inconel, clapeta); br.position.set(-0.0015, -0.007, 0);
      cyl(0.0022, 0.0022, 0.062, M.otel, 0, 0, 0.026, "z", clapeta, 10); }
  }
  /* ========== MANETA ȘI ACTUATORUL: actuatorul pe consola carcasei compresorului, tija paralelă cu axa, maneta pe axul organului de reglare
     wastegate: maneta pe axul clapetei (sus); VGT: maneta pe axul de comandă al inelului (jos) */
  const A = { tija: null, motor: null, roti: [], piv: null, L: 0, xA: 0, sg: 1 };
  if (act) {
    const vg = tip === "vgt", ZL = vg ? 0.046 : 0.056, piv = vg ? new THREE.Group() : clapeta;
    if (vg) { piv.position.set(-0.03, -0.045, 0); G.add(piv); cyl(0.0025, 0.0025, ZL + 0.006, M.otel, 0, 0, ZL / 2, "z", piv, 10); }
    const L = vg ? 0.042 : 0.066, sg = vg ? -1 : 1; A.piv = piv; A.L = L; A.sg = sg;
    const man = mesh(RB(0.006, L + 0.008, 0.004, 0.0015), M.otel, piv); man.position.set(0, sg * L / 2, ZL); k_(man, "maneta", vg ? "Maneta axului de comandă VGT (rotește inelul de comandă)" : "Maneta axului clapetei wastegate");
    cyl(0.0032, 0.0032, 0.008, M.crom, 0, sg * L, ZL + 0.003, "z", piv, 10);
    const yA = piv.position.y + sg * L, xA = 0.035; A.xA = xA; A.y = yA; A.z = ZL;
    const xP = piv.position.x;                                                   // capătul tijei (la manetă) în repaus
    A.tija = cyl(0.0021, 0.0021, xA - xP, M.crom, (xA + xP) / 2, yA, ZL, "x", G, 10); A.x0 = (xA + xP) / 2;
    k_(A.tija, "tija", "Tija actuatorului (lungime reglabilă – fixează presiunea de supraalimentare / poziția paletelor)");
    const brk = mesh(RB(0.012, Math.abs(yA) - 0.03, 0.026, 0.002), M.otel); brk.position.set(xA + 0.012, sg * (Math.abs(yA) + 0.03) / 2, ZL - 0.008);
    if (act === "pres" || act === "vac") {
      const GA = new THREE.Group(); GA.position.set(xA + 0.012, yA, ZL); G.add(GA);
      const can = carc(revSolid([[-0.012, 0.0], [-0.012, 0.024], [-0.008, 0.029], [-0.003, 0.031], [-0.003, 0.0325], [0.003, 0.0325], [0.003, 0.031], [0.008, 0.029], [0.012, 0.024], [0.012, 0.0]], 0, Math.PI * 2, 48), M.otel, "actuator",
        act === "vac" ? "Actuatorul pneumatic cu vacuum: depresiunea dată de EVRV trage membrana și tija, contra arcului" : "Actuatorul pneumatic (presiune): presiunea de supraalimentare împinge membrana contra arcului și deschide wastegate", GA);
      const memb = mesh(new THREE.CylinderGeometry(0.0285, 0.0285, 0.0015, 40), M.cauc, GA); memb.rotation.z = Math.PI / 2; memb.userData.interior = true;
      const arc = mesh(new THREE.TorusGeometry(0.012, 0.0012, 6, 24), M.crom, GA); arc.rotation.y = Math.PI / 2; arc.position.x = 0.006;
      cyl(0.003, 0.003, 0.016, M.alama, 0.019, 0.012, 0, "x", GA, 10); A.memb = memb;
      ancore.nip = V3(xA + 0.04, yA + 0.012, ZL);
    } else {
      const GA = new THREE.Group(); GA.position.set(xA + 0.03, yA, ZL - 0.004); G.add(GA);
      carc(RB(0.06, 0.044, 0.04, 0.006), M.plastic, "actuator", "Actuatorul electric: motor de c.c., reductor cu roți dințate, senzor de poziție (Hall); comandat PWM de ECU", GA);
      carc(RB(0.022, 0.014, 0.02, 0.003), M.negru, "actuator", "Mufa actuatorului electric (alimentare, PWM / CAN, senzorul de poziție)", GA).position.set(0.018, sg * 0.026, 0);
      A.motor = cyl(0.01, 0.01, 0.032, M.otel, 0.008, -sg * 0.008, 0.004, "x", GA, 24); A.motor.userData.interior = true;
      [[-0.006, 0.006, 0.011, 22], [0.006, -0.006, 0.006, 12], [-0.016, -0.004, 0.009, 18]].forEach(([x, y, r, n], i) => { const gr = new THREE.Group(); gr.position.set(x, y * sg, -0.008 + i * 0.006); GA.add(gr);
        const g = new THREE.CylinderGeometry(r, r, 0.0035, n * 2); const p = g.attributes.position; for (let q = 0; q < p.count; q++) { const xx = p.getX(q), zz = p.getZ(q), a = Math.atan2(zz, xx); if (Math.hypot(xx, zz) > r * 0.95) { const f = 1 + 0.09 * Math.sign(Math.sin(a * n)); p.setX(q, xx * f); p.setZ(q, zz * f); } }
        g.computeVertexNormals(); const o = mesh(g, M.alama, gr); o.rotation.x = Math.PI / 2; A.roti.push(gr); });
      ancore.mufa = V3(xA + 0.048, yA + sg * 0.033, ZL - 0.004);
    }
    ancore.act = V3(xA + 0.02, yA, ZL);
  }
  /* ========== MOTORUL ELECTRIC (turbo cu asistare electrică, 48 V): statorul cu bobinaj, magneții rotorului pe arbore */
  let stator = null;
  if (tip === "eturbo") {
    stator = mesh(revSolid([[0.03, 0.013], [0.03, 0.028], [0.018, 0.028], [0.018, 0.013]], 0, Math.PI * 2, 40), M.cupru); stator.userData.interior = true; k_(stator, "emotor", "Motorul electric pe arborele turbosuflantei (48 V): accelerează rotorul până când gazele preiau antrenarea");
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, o = mesh(RB(0.012, 0.004, 0.006, 0.001), M.magnet, rotor); o.position.set(0.024, Math.cos(a) * 0.009, Math.sin(a) * 0.009); o.rotation.x = a; }
    cyl(0.004, 0.004, 0.03, M.negru, 0.024, 0.045, 0.0, "y"); ancore.cablu = V3(0.024, 0.06, 0);
  }
  /* ---------- căile de curgere (pentru particule), în coordonatele grupului */
  const spir = (C, u0, u1, n, dx = 0) => Array.from({ length: n }, (_, k) => { const { th, R } = C(u0 + (u1 - u0) * k / (n - 1)); return V3(XC + dx, R * Math.cos(th), R * Math.sin(th)); });
  const cAer = [V3(0.135, 0.004, 0.0), V3(0.1, 0.006, 0.004), V3(0.08, 0.012, 0.006), V3(0.06, 0.024, 0.01), ...spir(vC.C, 0.05, 1, 16).map(p => p.setX(XC)), ancore.iesC.clone().add(ancore.iesCdir.clone().multiplyScalar(0.03))];
  const spT = (u0, u1, n, x) => Array.from({ length: n }, (_, k) => { const { th, R } = vT.C(u0 + (u1 - u0) * k / (n - 1)); return V3(x, R * Math.cos(th), R * Math.sin(th)); });
  const cGaz = [ancore.intT.clone().add(ancore.intTdir.clone().multiplyScalar(0.03)), ...spT(0, 0.95, 16, XT), V3(XT, 0.03, -0.012), V3(-0.055, 0.016, -0.006), V3(-0.075, 0.008, -0.002), V3(-0.13, 0.004, 0)];
  const cWg = [ancore.intT.clone().add(ancore.intTdir.clone().multiplyScalar(0.03)), ...spT(0, 0.18, 4, XT), V3(-0.085, 0.028, 0.004), V3(-0.1, 0.016, 0), V3(-0.13, 0.012, 0)];
  /* ---------- starea: rot [rad], vgt (0 deschis … 1 închis), wg (0 închis … 1 deschis), cursa tijei 0…1, emotor 0…1, Tgaz [°C] */
  function seteaza(u) {
    rotor.rotation.x = u.rot || 0;
    if (vane.length) { const v = u.vgt ?? 0.5; vane.forEach(P => { P.rotation.x = P.userData.a + Math.PI / 2 + 0.25 + 0.9 * (1 - v); }); inelCmd.rotation.x = 0.25 * v; }
    const sU = u.tija ?? (tip === "vgt" ? (u.vgt ?? 0.5) : (u.wg || 0)), fi = (tip === "vgt" ? 0.55 : 0.6) * sU;
    if (clapeta) clapeta.rotation.z = -(u.wg || 0) * 0.6;
    if (A.piv && tip === "vgt") A.piv.rotation.z = fi;
    if (A.tija) { const dx = tip === "vgt" ? A.L * Math.sin(fi) : A.L * Math.sin(0.6 * (u.wg || 0)); A.tija.position.x = A.x0 + dx; if (A.memb) A.memb.position.x = dx * 0.6; }
    A.roti.forEach((g, i) => { g.rotation.z = sU * (i === 0 ? -14 : i === 1 ? 6 : -2.2); });
    if (stator) stator.material.emissive && (stator.material = stator.material);
    const T = u.Tgaz ?? 20; M.fonta.emissiveIntensity = Math.max(0, Math.min(0.6, (T - 640) / 500)); M.inconel.emissiveIntensity = Math.max(0, Math.min(0.5, (T - 600) / 500));
  }
  seteaza({});
  return { G, M, rotor, carcase, taiate, clic, seteaza, ancore, cai: { aer: cAer, gaz: cGaz, wg: cWg }, tip, act, stator };
}

/* ------------------------------------------------------------------ scena de bază */
function scena(gazda, cam0, tinta, o = {}) {
  gazda.innerHTML = `<div class="m3d a3d"><canvas></canvas><div class="m3d-ajutor">trageți = rotire · rotița = zoom</div></div>`;
  const cont = gazda.querySelector(".m3d"), canvas = cont.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 2, 0.005, 30); camera.position.set(...cam0);
  const ctl = new OrbitControls(camera, canvas); ctl.target.set(...tinta); ctl.enableDamping = true; ctl.minDistance = o.min || 0.08; ctl.maxDistance = o.max || 3; ctl.maxPolarAngle = Math.PI * 0.6;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(...(o.sun || [0.8, 1.6, 1.0])); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const L = o.umbra || 0.6; Object.assign(sun.shadow.camera, { left: -L, right: L, top: L, bottom: -L, near: 0.1, far: 6 }); sun.shadow.bias = -0.0004; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50555a, 0.5));
  const tema = () => { const t = document.documentElement.getAttribute("data-theme"), inchis = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); scene.background = new THREE.Color(inchis ? 0x1a1f25 : 0xdfe4e8); if (o.tema) o.tema(inchis); };
  tema(); window.addEventListener("schimbare-tema", tema);
  return { cont, canvas, renderer, scene, camera, ctl, tema,
    porneste(fn) { let tP = performance.now(); const bucla = t => { requestAnimationFrame(bucla); const dt = Math.min(0.1, (t - tP) / 1000); tP = t; if (!cont.getClientRects().length) return; fn(dt);
      ctl.update(); const w = cont.clientWidth, h = cont.clientHeight; if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } renderer.render(scene, camera); }; requestAnimationFrame(bucla); } };
}
function interactiune(S, clic, laClic) {
  const tip = document.createElement("div"); tip.className = "a3d-tip"; tip.hidden = true; S.cont.appendChild(tip);
  const rc = new THREE.Raycaster(), mp = new THREE.Vector2(); let jos = null;
  const tinta = e => { const r = S.canvas.getBoundingClientRect(); mp.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(mp, S.camera); const h = rc.intersectObjects(clic.filter(o => o.visible && isVis(o)), false)[0]; return h ? h.object : null; };
  const isVis = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  S.canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
  S.canvas.addEventListener("pointerup", e => { if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return; const o = tinta(e); if (o && laClic) laClic(o.userData.k, o.userData.et); });
  S.canvas.addEventListener("pointermove", e => { if (e.buttons) { tip.hidden = true; return; } const o = tinta(e); S.canvas.style.cursor = o ? "pointer" : "";
    if (o) { const r = S.cont.getBoundingClientRect(); tip.textContent = o.userData.et; tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 10) + "px"; tip.hidden = false; } else tip.hidden = true; });
  S.canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
}
/** particule pe căi (aer: albastru, gaze: portocaliu); fluxurile se setează cu actualizeaza({cheie: viteza}) */
function particule(par, cai, raza = 0.0022) {
  let NP = 0; cai.forEach(c => { c.curba = new THREE.CatmullRomCurve3(c.pts); c.L = c.curba.getLength(); c.s = Array.from({ length: c.n }, (_, k) => k / c.n); NP += c.n; });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(raza, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }), NP); im.renderOrder = 5; par.add(im);
  let j = 0; const cc = new THREE.Color(); cai.forEach(c => { for (let k = 0; k < c.n; k++) im.setColorAt(j++, cc.setHex(c.col)); });
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s1 = V3(1, 1, 1), s0 = V3(0, 0, 0);
  return { im, actualizeaza(v, dt) { let j = 0; cai.forEach(c => { const w = v[c.k] || 0; c.s.forEach((s, k) => { let sN = (s + w * dt / c.L) % 1; if (!(sN >= 0 && sN < 1)) sN = 0; c.s[k] = sN; m4.compose(c.curba.getPointAt(sN), q0, w > 1e-4 ? s1 : s0); im.setMatrixAt(j++, m4); }); }); im.instanceMatrix.needsUpdate = true; } };
}
function aplicaTransparent(carcase, on) { carcase.forEach(o => { const m = o.material; m.transparent = on || o.userData.m0.t; m.opacity = on ? 0.18 : o.userData.m0.op; m.depthWrite = !on; m.needsUpdate = true; o.castShadow = !on; }); }

/* ===================================================================== ANIMAȚIA: funcționarea turbosuflantei și variantele constructive */
export const VARIANTE = {
  fix: { n: "Geometrie fixă, fără reglare", tip: "fix", act: null, tau: 1.25, d: "Turbina antrenează compresorul cu toată energia gazelor; presiunea crește continuu cu turația și sarcina (turbosuflantă mică pentru a evita supra-presiunea: răspuns bun, dar presiune mică la turații mari). Soluție veche sau la motoare staționare / utilaje." },
  wgP: { n: "Wastegate cu actuator pneumatic (presiune)", tip: "wg", act: "pres", tau: 1.15, d: "Presiunea de supraalimentare acționează direct membrana actuatorului; la depășirea pragului arcului, tija deschide clapeta wastegate și o parte din gaze ocolesc turbina. Simplu, robust; reglaj fix (eventual modulat de o electrovalvă)." },
  wgE: { n: "Wastegate cu actuator electric", tip: "wg", act: "el", tau: 1.1, d: "ECU comandă motorul actuatorului (PWM) și citește poziția: clapeta poate fi ținută închisă la sarcini parțiale mici sau deschisă complet la pornirea la rece (încălzire rapidă a catalizatorului). Uzual la motoarele pe benzină actuale (1.0–2.0 TSI / TCe)." },
  vgtV: { n: "Geometrie variabilă (VGT) – actuator pneumatic + EVRV", tip: "vgt", act: "vac", tau: 0.8, d: "Paletele directoare din jurul roții turbinei se rotesc împreună (inelul de comandă). Închise la turații mici: secțiune mică, viteză mare a gazelor → presiune mare devreme; deschise la turații mari: debit mare, fără supra-presiune. Electrovalva EVRV modulează vacuumul pompei; ECU reglează în buclă închisă după senzorul MAP (ex. 1.5 dCi)." },
  vgtE: { n: "Geometrie variabilă (VGT) – actuator electric", tip: "vgt", act: "el", tau: 0.7, d: "Actuatorul electric (motor + reductor + senzor de poziție) rotește direct maneta VGT: răspuns rapid și precis, diagnoză proprie, poziție cunoscută. Standard la motoarele diesel Euro 6." },
  twin: { n: "Twin-scroll (cu wastegate)", tip: "twin", act: "el", tau: 0.85, d: "Carcasa turbinei are două canale separate, alimentate de cilindri care nu se perturbă (1-4 și 2-3): impulsurile de presiune ajung neamortizate pe roată → răspuns mai bun la turații mici, golire mai bună a cilindrilor." },
  eturbo: { n: "Turbo cu asistare electrică (e-turbo, 48 V)", tip: "eturbo", act: "el", tau: 0.25, d: "Un motor electric montat pe arbore accelerează rotorul la cererea de putere, înainte ca gazele să aibă energie suficientă: practic fără turbo-lag; la sarcini mari poate funcționa ca generator. Folosit la motoare hibride performante." }
};
export function creeazaAnimatieTurbo(gazda, opt = {}) {
  gazda.innerHTML = `<div class="ta-grila"><div class="ta-scena"></div><div class="ta-panou">
    <label class="camp">Varianta constructivă <select class="ta-var">${Object.keys(VARIANTE).map(k => `<option value="${k}">${VARIANTE[k].n}</option>`).join("")}</select></label>
    <p class="nota ta-desc"></p>
    <label class="camp">Turația motorului: <b class="ta-nv">2000</b> rot/min <input type="range" class="ta-n" min="900" max="4500" step="50" value="2000"></label>
    <label class="camp">Pedala de accelerație: <b class="ta-qv">60</b> % <input type="range" class="ta-q" min="0" max="100" step="1" value="60"></label>
    <div class="rand-butoane"><button type="button" class="ta-acc">Accelerare bruscă (0 → 100 %)</button></div>
    <div class="rand-butoane"><label class="bifa"><input type="checkbox" class="ta-sect" checked> Secțiune</label><label class="bifa"><input type="checkbox" class="ta-tr"> Transparent</label><label class="bifa"><input type="checkbox" class="ta-part" checked> Fluxuri</label></div>
    <div class="ta-afis"><div><span>p supraalimentare</span><b class="ta-p">—</b></div><div><span>p cerută (ECU)</span><b class="ta-pc">—</b></div><div><span>turația turbinei</span><b class="ta-nt">—</b></div><div><span class="ta-cmdE">comanda</span><b class="ta-cmd">—</b></div></div>
    <canvas class="ta-gr" height="150"></canvas></div></div>
    <style>.ta-grila{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:.8rem}.ta-scena .m3d{height:clamp(380px,62vh,640px)}.ta-panou .camp{display:block;margin:.4rem 0}.ta-panou input[type=range]{width:100%}.ta-panou select{width:100%}
    .ta-afis{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin:.5rem 0}.ta-afis div{background:var(--suprafata-2);border-radius:8px;padding:.3rem .5rem}.ta-afis span{display:block;font-size:.72rem;color:var(--text-sec)}.ta-afis b{font-size:1rem}
    .ta-gr{width:100%;display:block;border:1px solid var(--linie);border-radius:8px}.a3d-tip{position:absolute;background:rgba(20,24,30,.88);color:#fff;font:12px system-ui,sans-serif;padding:.2rem .45rem;border-radius:4px;pointer-events:none;white-space:nowrap;z-index:3}
    @media(max-width:900px){.ta-grila{grid-template-columns:1fr}}</style>`;
  const $q = s => gazda.querySelector(s);
  const S = scena($q(".ta-scena"), [0.56, 0.38, 0.68], [0.0, 0.2, 0.0], { min: 0.12, max: 1.5, umbra: 0.4 }), sc = S.scene;
  // soclul de prezentare (oțel vopsit) și podeaua
  const pod = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), mat({ color: 0x8e979c, roughness: 0.8 })); pod.rotation.x = -Math.PI / 2; pod.receiveShadow = true; sc.add(pod);
  const soclu = new THREE.Mesh(RB(0.36, 0.06, 0.26, 0.01), mat({ color: 0x2b2f35, roughness: 0.5, metalness: 0.4 })); soclu.position.y = 0.03; soclu.receiveShadow = soclu.castShadow = true; sc.add(soclu);
  const M = materiale(); let T = null, P = null, cheie = null; const clic = [];
  const tub = (pts, r, m) => { const o = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), 40, r, 16), m); o.castShadow = true; return o; };
  const st = { n: 2000, q: 0.6, w: 0.3, b: 0.3, u: 0.5, rot: 0, sect: true, tr: false, part: true, hist: [], tAcc: -1, Tg: 500 };
  function construieste(k) {
    if (T) { sc.remove(T.G); T.G.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const V = VARIANTE[k]; T = construiesteTurbo({ M, tip: V.tip, act: V.act, sectiune: st.sect }); cheie = k;
    const G = T.G; G.position.set(0, 0.2, 0); sc.add(G);
    // conductele de legătură (scurte): aerul din filtru, refularea spre intercooler, colectorul de evacuare, downpipe
    const mC = M.cauc, mE = mat({ color: 0x6b4a33, roughness: 0.8, metalness: 0.5, side: THREE.DoubleSide });
    G.add(tub([[0.118, 0, 0], [0.16, 0, 0], [0.2, 0.0, 0.02]], 0.03, mC)); { const c = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.003, 8, 32), M.otel); c.position.set(0.124, 0, 0); c.rotation.y = Math.PI / 2; G.add(c); }
    { const a = T.ancore.iesC, d = T.ancore.iesCdir; G.add(tub([[a.x, a.y, a.z], [a.x + d.x * 0.04, a.y + d.y * 0.04, a.z + d.z * 0.04], [a.x + 0.02, a.y + d.y * 0.065, a.z + d.z * 0.065]], T.ancore.rIesC + 0.002, mC)); }
    { const a = T.ancore.intT, d = T.ancore.intTdir; const cl = tub([[a.x, a.y, a.z], [a.x + d.x * 0.05, a.y + d.y * 0.05, a.z + d.z * 0.05], [a.x - 0.02 + d.x * 0.09, a.y + d.y * 0.09, a.z + d.z * 0.09]], 0.02, mE); cl.material = mE; G.add(cl); }
    G.add(tub([[-0.112, 0, 0], [-0.15, 0, 0], [-0.19, -0.03, 0]], 0.026, mE));
    // EVRV (electrovalva de vacuum) la VGT pneumatic, furtunul de vacuum; conectorul electric la actuatoarele electrice; cablul motorului e-turbo
    if (V.act === "vac") { const ev = new THREE.Group(); const a = T.ancore.nip, E0 = [a.x + 0.035, a.y - 0.03, a.z + 0.07]; ev.position.set(...E0); G.add(ev); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.04, 24), M.negru); c.castShadow = true; ev.add(c);
      const b = new THREE.Mesh(RB(0.03, 0.022, 0.02, 0.003), M.negru); b.position.y = 0.028; ev.add(b); [-1, 1].forEach(s => { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8), M.alama); n.rotation.z = Math.PI / 2; n.position.set(s * 0.02, -0.006, 0); ev.add(n); });
      c.userData = { k: "evrv", et: "Electrovalva EVRV: ECU modulează (PWM) depresiunea transmisă actuatorului" }; clic.push(c);
      G.add(tub([[a.x, a.y, a.z], [a.x + 0.012, a.y - 0.01, a.z + 0.03], [E0[0] - 0.02, E0[1] - 0.006, E0[2]]], 0.0028, M.cauc)); G.add(tub([[E0[0] + 0.02, E0[1] - 0.006, E0[2]], [E0[0] + 0.05, E0[1] - 0.01, E0[2] + 0.01], [E0[0] + 0.09, E0[1] - 0.02, E0[2] + 0.03]], 0.0028, M.cauc)); }
    if (V.act === "el" && T.ancore.mufa) { const a = T.ancore.mufa; G.add(tub([[a.x, a.y, a.z], [a.x + 0.02, a.y + 0.04, a.z + 0.01], [a.x + 0.06, a.y + 0.07, a.z + 0.03]], 0.004, M.negru)); }
    if (T.ancore.cablu) { const a = T.ancore.cablu; G.add(tub([[a.x, a.y, a.z], [a.x, a.y + 0.04, a.z + 0.02], [a.x + 0.05, a.y + 0.07, a.z + 0.05]], 0.0045, M.albastru)); }
    if (V.act === "pres") { const a = T.ancore.nip, b = T.ancore.iesC; G.add(tub([[a.x, a.y, a.z], [a.x + 0.02, a.y, a.z - 0.01], [b.x + 0.01, b.y - 0.01, b.z + 0.01]], 0.0025, M.cauc)); }
    // particulele
    if (P) { sc.remove(P.im); P.im.geometry.dispose(); }
    const cai = [{ k: "aer", pts: T.cai.aer, n: 70, col: 0x7fd3ff }, { k: "gaz", pts: T.cai.gaz, n: 70, col: 0xff7a1a }];
    if (V.tip !== "vgt") cai.push({ k: "wg", pts: T.cai.wg, n: 22, col: 0xffc04a });
    const PG = new THREE.Group(); PG.position.copy(G.position); sc.add(PG); P = particule(PG, cai); P.G = PG;
    aplicaTransparent(T.carcase, st.tr); T.taiate.forEach(o => o.visible = !st.tr); $q(".ta-desc").textContent = V.d;
    $q(".ta-cmdE").textContent = V.tip === "vgt" ? "închiderea paletelor VGT" : V.tip === "fix" ? "reglaj" : V.tip === "eturbo" ? "wastegate / motor electric" : "deschiderea wastegate";
    st.hist = [];
  }
  interactiune(S, { filter: f => [...(T ? T.clic : []), ...clic].filter(f) }, (k, et) => opt.laClic && opt.laClic(k, et));
  // (lista de obiecte clicabile se citește la fiecare eveniment)
  construieste("vgtV");
  const sel = $q(".ta-var"); sel.value = "vgtV"; sel.addEventListener("change", () => construieste(sel.value));
  $q(".ta-n").addEventListener("input", e => { st.n = +e.target.value; $q(".ta-nv").textContent = st.n; });
  $q(".ta-q").addEventListener("input", e => { st.q = +e.target.value / 100; $q(".ta-qv").textContent = e.target.value; st.tAcc = -1; });
  $q(".ta-acc").addEventListener("click", () => { st.q = 0; st.tAcc = 0; st.w = 0.08; st.hist = []; });
  $q(".ta-sect").addEventListener("change", e => { st.sect = e.target.checked; construieste(cheie); });
  $q(".ta-tr").addEventListener("change", e => { st.tr = e.target.checked; aplicaTransparent(T.carcase, st.tr); T.taiate.forEach(o => o.visible = !st.tr); });
  $q(".ta-part").addEventListener("change", e => { st.part = e.target.checked; P.G.visible = st.part; });
  const cv = $q(".ta-gr");
  function grafic() {
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight; if (!W) return; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext("2d"), cs = getComputedStyle(document.documentElement); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = cs.getPropertyValue("--suprafata").trim() || "#fff"; g.fillRect(0, 0, W, H);
    const X = i => 30 + i / 300 * (W - 38), Y = v => H - 18 - v / 1.6 * (H - 30);
    g.strokeStyle = cs.getPropertyValue("--linie").trim() || "#ccc"; g.strokeRect(30, 8, W - 38, H - 26); g.fillStyle = cs.getPropertyValue("--text-sec").trim() || "#666"; g.font = "10px system-ui";
    [0, 0.5, 1, 1.5].forEach(v => { g.fillText(v.toFixed(1).replace(".", ","), 4, Y(v) + 3); }); g.fillText("bar (rel.) · ultimele 15 s", 36, 20);
    const h = st.hist; [["pc", "#e08a00", [5, 4]], ["b", "#1f6fd0", []]].forEach(([k, c, d]) => { g.strokeStyle = c; g.setLineDash(d); g.lineWidth = 1.8; g.beginPath(); h.forEach((p, i) => { const x = X(i + 300 - h.length), y = Y(p[k]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }); g.setLineDash([]);
    g.fillStyle = "#1f6fd0"; g.fillText("reală", W - 80, 20); g.fillStyle = "#e08a00"; g.fillText("cerută", W - 45, 20);
  }
  let tAf = 0, tGr = 0;
  S.porneste(dt => {
    if (!T) return;
    const V = VARIANTE[cheie];
    if (st.tAcc >= 0) { st.tAcc += dt; st.q = st.tAcc < 0.6 ? 0 : 1; if (st.tAcc > 0.6) { $q(".ta-q").value = 100; $q(".ta-qv").textContent = "100"; } if (st.tAcc > 8) st.tAcc = -1; }
    const n = st.n, q = st.q, x = n / 4500;
    // presiunea cerută de ECU [bar rel.]: crește cu sarcina; limitată la turații mici și mari
    const pc = q * Math.min(1.3, 1.45 * Math.min(1, Math.max(0, (n - 900) / 1300))) * (n > 3800 ? 1 - 0.2 * (n - 3800) / 700 : 1);
    // energia disponibilă la turbină (relativ) și eficacitatea turbinei după poziția organului de reglare
    const E = Math.max(0.02, q) * Math.pow(x, 1.25) * (0.35 + 0.65 * q);
    let u = st.u, ef;
    if (V.tip === "vgt") { u += (Math.max(-1, Math.min(1, (pc - st.b) * 3)) * 0.9 - (u - 0.5) * 0.05) * dt; u = Math.max(0.05, Math.min(1, u)); ef = 0.75 + 2.4 * u * (1 - 0.55 * x); }   // u = închiderea VGT
    else if (V.tip === "fix") { u = 0; ef = 1.15; }
    else { const dorit = st.b > pc + 0.02 ? 1 : st.b < pc - 0.05 ? 0 : u; u += (dorit - u) * Math.min(1, dt * (V.act === "el" ? 4 : 2)); ef = (V.tip === "twin" ? 2.1 : 1.85) * (1 - 0.85 * u); }   // u = deschiderea wastegate
    let wEq = Math.min(1, Math.sqrt(E * ef) * 1.1), asist = 0;
    if (V.tip === "eturbo" && pc - st.b > 0.08 && q > 0.3) { asist = Math.min(1, (pc - st.b) * 2); wEq = Math.max(wEq, Math.min(1, Math.sqrt(pc / 1.6) * 1.02)); }
    const tau = V.tip === "eturbo" && asist ? 0.18 : V.tau * (1.2 - 0.5 * x);
    st.w += (wEq - st.w) * Math.min(1, dt / tau); st.u = u; st.b = Math.max(0, Math.min(1.7, 1.6 * st.w * st.w - 0.02));
    if (V.tip === "fix") st.b = Math.min(1.9, st.b);
    st.Tg = 300 + 550 * q * (0.4 + 0.6 * x);
    const nt = Math.round((15000 + 165000 * st.w) / 100) * 100;
    st.rot += nt / 60 * 2 * Math.PI * dt / 3000;                                                         // afișarea rotației, mult încetinită
    T.seteaza({ rot: st.rot, vgt: V.tip === "vgt" ? u : 0, wg: V.tip === "vgt" ? 0 : u, tija: u, Tgaz: st.Tg });
    if (T.stator) { T.stator.material.emissive = new THREE.Color(0x3399ff); T.stator.material.emissiveIntensity = asist * 0.9; }
    const fl = 0.04 + 0.18 * x * (0.4 + 0.6 * q);
    P.actualizeaza({ aer: fl * (0.6 + 0.6 * st.b), gaz: fl * (V.tip === "vgt" ? 1 + 0.9 * u : 1 - 0.7 * u), wg: V.tip === "vgt" ? 0 : fl * 1.3 * u }, dt);
    tGr += dt; if (tGr > 0.05) { tGr = 0; st.hist.push({ b: st.b, pc }); if (st.hist.length > 300) st.hist.shift(); }
    tAf += dt; if (tAf > 0.2) { tAf = 0; $q(".ta-p").textContent = (1.0 + st.b).toFixed(2).replace(".", ",") + " bar abs."; $q(".ta-pc").textContent = (1.0 + pc).toFixed(2).replace(".", ",") + " bar abs.";
      $q(".ta-nt").textContent = nt.toLocaleString("ro-RO") + " rot/min"; $q(".ta-cmd").textContent = V.tip === "fix" ? "—" : V.tip === "eturbo" && asist > 0.05 ? `motor electric ${Math.round(asist * 100)} %` : Math.round(u * 100) + " %"; grafic(); }
  });
  return { varianta(k) { sel.value = k; construieste(k); } };
}

/* ===================================================================== STANDUL: motorul 1.5 dCi cu turbosuflanta VGT, intercoolerul, aparatele de măsură
   stare: { n (rot/min), pos (0…1 închiderea VGT), vacMontat, vac (mbar), comp (comparator montat), s (mm), termo (termocuple montate), T:[T1,T2,T3,T4],
            obd:{titlu, linii}, obdConectat, transparent, Tgaz } */
export function creeazaStandTurbo(gazda, opt = {}) {
  const S = scena(gazda, [1.55, 1.25, 1.85], [-0.05, 0.55, 0.15], { min: 0.15, max: 5, umbra: 1.6, sun: [1.5, 3, 2] }), sc = S.scene;
  const M = materiale(), clic = [], k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const add = (o, par = sc) => { o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const box = (w, h, d, m, x, y, z, r = 0.006, par = sc) => { const o = add(new THREE.Mesh(RB(w, h, d, r), m), par); o.position.set(x, y, z); return o; };
  const cyl = (r1, r2, h, m, x, y, z, ax = "y", par = sc, seg = 32) => { const o = add(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m), par); o.position.set(x, y, z); if (ax === "x") o.rotation.z = Math.PI / 2; else if (ax === "z") o.rotation.x = Math.PI / 2; return o; };
  const tub = (pts, r, m, par = sc, seg = 48, rs = 14) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => Array.isArray(p) ? V3(...p) : p.clone())), seg, r, rs), m), par);
  const colier = (p, dir, r) => { const o = add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.002, 0.0028, 8, 32), M.crom)); o.position.copy(p); o.quaternion.setFromUnitVectors(V3(0, 0, 1), dir.clone().normalize()); return o; };
  const carcase = [];
  const carc = o => { o.material = o.material.clone(); o.userData.m0 = { t: o.material.transparent, op: o.material.opacity }; carcase.push(o); return o; };
  // podeaua (rășină epoxidică cu marcaj), peretele
  const pod = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 7), mat({ color: 0x8d949b, roughness: 0.4, metalness: 0.1 }))); pod.rotation.x = -Math.PI / 2; pod.castShadow = false;
  const per = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), mat({ color: 0xe9ecef, roughness: 0.9 }))); per.position.set(0, 1.7, -1.4); per.castShadow = false;
  [-1, 1].forEach(s => { const l = add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 5), mat({ color: 0xf2c94c, roughness: 0.6 }))); l.rotation.x = -Math.PI / 2; l.position.set(s * 1.25, 0.001, 0.3); l.castShadow = false; });
  /* ---------- cadrul standului (oțel vopsit albastru) și suporții motorului */
  const albastru = mat({ color: 0x1f3f8f, roughness: 0.45, metalness: 0.4 });
  [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([x, z]) => box(0.05, 0.36, 0.05, albastru, x, 0.18, z, 0.004));
  [-0.32, 0.32].forEach(z => box(1.2, 0.05, 0.05, albastru, 0, 0.36, z, 0.004)); [-0.55, 0.55].forEach(x => box(0.05, 0.05, 0.69, albastru, x, 0.36, 0, 0.004));
  [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([x, z]) => cyl(0.03, 0.03, 0.03, M.cauc, x, 0.015, z));
  [-0.3, 0.3].forEach(x => { box(0.06, 0.06, 0.06, M.cauc, x, 0.41, -0.05, 0.01); box(0.03, 0.1, 0.08, albastru, x, 0.47, -0.05, 0.004); });
  /* ---------- motorul 1.5 dCi (K9K): blocul din fontă, chiulasa din aluminiu, capacul culbutorilor, baia de ulei, distribuția */
  const fontaB = mat({ color: 0x55595e, roughness: 0.7, metalness: 0.5 }), aluC = mat({ color: 0xa9afb5, roughness: 0.55, metalness: 0.6 });
  const bloc = box(0.46, 0.27, 0.22, fontaB, 0, 0.64, -0.05, 0.01); k_(bloc, "motor", "Blocul motor 1.5 dCi (K9K) – 4 cilindri, injecție common-rail, turbosuflantă VGT");
  for (let k = 0; k < 5; k++) box(0.012, 0.22, 0.012, fontaB, -0.2 + k * 0.1, 0.64, 0.062, 0.003);
  box(0.47, 0.11, 0.22, aluC, 0, 0.83, -0.05, 0.01);
  const capac = box(0.44, 0.07, 0.19, M.plastic, 0, 0.92, -0.05, 0.02); k_(capac, "motor", "Capacul culbutorilor (1.5 dCi)");
  { const e = ecran(256, 64); e.x.fillStyle = "#24272b"; e.x.fillRect(0, 0, 256, 64); e.x.fillStyle = "#c9ced3"; e.x.font = "bold 40px system-ui"; e.x.textAlign = "center"; e.x.fillText("dCi", 128, 46); e.t.needsUpdate = true;
    const pl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), new THREE.MeshBasicMaterial({ map: e.t }))); pl.rotation.x = -Math.PI / 2; pl.position.set(0.08, 0.956, -0.04); pl.castShadow = false; }
  cyl(0.022, 0.022, 0.02, M.galben, -0.12, 0.965, -0.08); box(0.46, 0.08, 0.2, fontaB, 0, 0.47, -0.05, 0.01);
  box(0.05, 0.42, 0.24, M.plastic, 0.26, 0.7, -0.05, 0.01);                                    // capacul distribuției
  cyl(0.08, 0.08, 0.05, M.otel, -0.27, 0.56, -0.05, "x"); cyl(0.13, 0.13, 0.02, M.otel, -0.31, 0.6, -0.05, "x");   // volantul
  // rampa common-rail și injectoarele (pe partea de admisie, spre spate)
  cyl(0.011, 0.011, 0.36, M.otel, 0, 0.9, -0.14, "x"); for (let k = 0; k < 4; k++) { cyl(0.009, 0.009, 0.08, M.otel, -0.15 + k * 0.1, 0.95, -0.1); tub([[-0.15 + k * 0.1, 0.99, -0.1], [-0.15 + k * 0.1, 0.99, -0.13], [-0.15 + k * 0.1, 0.9, -0.14]], 0.003, M.otel); }
  // colectorul de admisie din plastic cu corpul clapetei și senzorul MAP
  box(0.42, 0.06, 0.07, M.plastic, 0, 0.8, -0.2, 0.012); cyl(0.034, 0.034, 0.06, aluC, 0.24, 0.8, -0.2, "x");
  const map = box(0.03, 0.02, 0.024, M.negru, 0.12, 0.84, -0.2, 0.004); k_(map, "map", "Senzorul MAP (presiunea de supraalimentare reală, după intercooler) – ECU reglează VGT după el");
  /* ---------- turbosuflanta VGT (montată pe colectorul de evacuare, pe partea din față) */
  const T = construiesteTurbo({ M, tip: "vgt", act: "vac", thC: -Math.PI * 1.25 });
  const TP = V3(-0.06, 0.6, 0.23); T.G.position.copy(TP); sc.add(T.G); T.carcase.forEach(o => carcase.push(o)); T.clic.forEach(o => clic.push(o));
  const W = p => p.clone().add(TP);
  // colectorul de evacuare (fontă): 4 canale din chiulasă, flanșa pe intrarea turbinei
  const mEv = mat({ color: 0x6b5446, roughness: 0.75, metalness: 0.5, emissive: 0xff3300, emissiveIntensity: 0 }), FL = W(T.ancore.intT);
  for (let k = 0; k < 4; k++) { const x = -0.15 + k * 0.1; tub([[x, 0.79, 0.06], [x, 0.79, 0.11], [x * 0.6 + FL.x * 0.4, 0.74, 0.19], [FL.x + (x - FL.x) * 0.15, FL.y + 0.04, FL.z], [FL.x, FL.y, FL.z]], 0.017, mEv); }
  box(0.4, 0.05, 0.012, mEv, 0, 0.79, 0.066, 0.004); k_(sc.children[sc.children.length - 1], "colector", "Colectorul de evacuare (fontă) – gazele spre turbină");
  // downpipe: ieșirea turbinei → jos → evacuarea standului (furtun flexibil spre exhaustare)
  const IE = W(T.ancore.iesT); tub([[IE.x, IE.y, IE.z], [IE.x - 0.05, IE.y, IE.z], [IE.x - 0.12, IE.y - 0.08, IE.z + 0.02], [IE.x - 0.16, 0.3, IE.z + 0.05], [IE.x - 0.18, 0.15, IE.z + 0.2]], 0.026, M.otel);
  { const fx = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(IE.x - 0.18, 0.15, IE.z + 0.2), V3(IE.x - 0.25, 0.07, IE.z + 0.05), V3(-0.55, 0.06, -0.6), V3(-0.6, 0.5, -1.25), V3(-0.6, 1.9, -1.32)]), 80, 0.05, 16),
      mat({ map: texCanvas(16, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#2a2a2a" : "#4d4d4d"; x.fillRect(0, i * 8, w, 8); } }, [1, 60]), roughness: 0.7, metalness: 0.6, side: THREE.DoubleSide }))); fx.castShadow = true; }
  // ungerea turbosuflantei: tur din galeria blocului, retur în baie
  { const a = W(T.ancore.ulei), b = W(T.ancore.retur); const t1 = tub([[a.x, a.y, a.z], [a.x, a.y + 0.03, a.z], [a.x + 0.04, a.y + 0.06, a.z - 0.1], [0.05, 0.6, 0.06]], 0.0035, M.otel); k_(t1, "ungere", "Conducta de ulei sub presiune spre lagărele turbosuflantei");
    const t2 = tub([[b.x, b.y, b.z], [b.x, b.y - 0.04, b.z], [b.x + 0.02, 0.48, 0.03], [b.x + 0.03, 0.47, 0.05]], 0.008, M.cauc); k_(t2, "ungere", "Returul uleiului (liber, prin gravitație, în baie)"); }
  /* ---------- traseul aerului: filtrul (cu debitmetru MAF) → compresorul → intercooler → colectorul de admisie */
  const filtru = box(0.26, 0.12, 0.2, M.plastic, 0.5, 0.98, 0.25, 0.02); k_(filtru, "filtru", "Filtrul de aer (carcasa) – p1 ≈ p atmosferică minus pierderea din filtru"); carc(filtru);
  box(0.25, 0.012, 0.19, M.negru, 0.5, 1.01, 0.25, 0.003); box(0.03, 0.42, 0.03, albastru, 0.56, 0.72, 0.25, 0.003);
  const maf = cyl(0.03, 0.03, 0.07, M.negru, 0.42, 0.97, 0.38, "z"); k_(maf, "maf", "Debitmetrul de aer (MAF)");
  const IC = W(T.ancore.intC), TC = [[0.42, 0.97, 0.42], [0.4, 0.94, 0.47], [0.3, 0.8, 0.42], [IC.x + 0.12, IC.y + 0.02, IC.z + 0.04], [IC.x + 0.05, IC.y, IC.z], [IC.x, IC.y, IC.z]];
  const h1 = tub(TC, 0.03, M.cauc); k_(h1, "aer1", "Furtunul de aer filtru → compresor (aici se montează termocuplul T1)"); colier(IC.clone().add(V3(0.012, 0, 0)), V3(1, 0, 0), 0.03);
  const OC = W(T.ancore.iesC), dC = T.ancore.iesCdir.clone();
  // intercoolerul aer-aer (miezul cu țevi plate și lamele, bazinele din poliamidă), montat în fața standului
  const ICp = V3(0.28, 0.33, 0.44), tIC = texCanvas(64, 64, (x, w, h) => { x.fillStyle = "#9da3a9"; x.fillRect(0, 0, w, h); x.fillStyle = "#6e747a"; for (let i = 0; i < 16; i++) x.fillRect(0, i * 4, w, 1.2); x.fillStyle = "#c5cacf"; for (let i = 0; i < 32; i++) x.fillRect(i * 2, 0, 0.6, h); }, [5, 3]);
  const miez = box(0.34, 0.17, 0.05, mat({ map: tIC, roughness: 0.45, metalness: 0.7 }), ICp.x, ICp.y, ICp.z, 0.004); k_(miez, "intercooler", "Intercoolerul (răcitorul aerului de supraalimentare) – T2 la intrare, T3 la ieșire"); carc(miez);
  [-1, 1].forEach(s => { const b = box(0.04, 0.19, 0.06, M.plastic, ICp.x + s * 0.19, ICp.y, ICp.z, 0.01); k_(b, "intercooler", "Bazinul intercoolerului (poliamidă)"); carc(b); });
  box(0.42, 0.02, 0.02, albastru, ICp.x, ICp.y - 0.11, ICp.z - 0.03, 0.003); [-0.15, 0.15].forEach(dx => box(0.02, 0.07, 0.02, albastru, ICp.x + dx, ICp.y - 0.15, ICp.z - 0.06, 0.003));
  const ICin = V3(ICp.x - 0.19, ICp.y + 0.05, ICp.z + 0.035), ICout = V3(ICp.x + 0.19, ICp.y + 0.05, ICp.z + 0.035);
  const h2p = [[OC.x, OC.y, OC.z], [OC.x + dC.x * 0.05, OC.y + dC.y * 0.05, OC.z + dC.z * 0.05], [OC.x + 0.02, ICin.y + 0.1, OC.z + 0.12], [ICin.x - 0.02, ICin.y + 0.06, ICin.z + 0.04], [ICin.x, ICin.y, ICin.z]];
  const h2 = tub(h2p, 0.027, M.cauc); k_(h2, "aer2", "Furtunul compresor → intercooler (aerul comprimat și cald; termocuplul T2)"); colier(OC.clone().addScaledVector(dC, 0.012), dC, 0.027);
  const h3p = [[ICout.x, ICout.y, ICout.z], [ICout.x + 0.04, ICout.y + 0.08, ICout.z + 0.02], [0.4, 0.75, 0.32], [0.38, 0.86, 0.0], [0.32, 0.82, -0.16], [0.27, 0.8, -0.2]];
  const h3 = tub(h3p, 0.028, M.cauc); k_(h3, "aer3", "Furtunul intercooler → colectorul de admisie (aerul răcit; termocuplul T3)");
  /* ---------- electrovalva EVRV pe consolă, conductele de vacuum (pompa de vacuum de pe motor → EVRV → actuator) */
  const NIP = W(T.ancore.nip), EV = V3(0.17, 0.5, 0.33);
  const evrv = new THREE.Group(); evrv.position.copy(EV); sc.add(evrv);
  { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.045, 24), M.negru), evrv); k_(c, "evrv", "Electrovalva EVRV: ECU modulează PWM depresiunea transmisă actuatorului VGT");
    const b = add(new THREE.Mesh(RB(0.034, 0.024, 0.024, 0.003), M.negru), evrv); b.position.y = 0.032; k_(b, "evrv", "Mufa electrovalvei EVRV");
    [-1, 1].forEach(s => { const n = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.022, 8), M.alama), evrv); n.rotation.z = Math.PI / 2; n.position.set(s * 0.022, -0.01, 0); }); }
  box(0.04, 0.06, 0.004, M.otel, EV.x, EV.y - 0.02, EV.z - 0.02, 0.002);
  const vacEV = tub([[NIP.x, NIP.y, NIP.z], [NIP.x + 0.03, NIP.y - 0.02, NIP.z + 0.05], [EV.x - 0.06, EV.y - 0.03, EV.z + 0.02], [EV.x - 0.024, EV.y - 0.01, EV.z]], 0.0028, M.cauc);
  tub([[EV.x + 0.024, EV.y - 0.01, EV.z], [EV.x + 0.08, EV.y + 0.02, EV.z - 0.05], [0.3, 0.6, 0.0], [0.27, 0.62, -0.03]], 0.0028, M.cauc);
  /* ---------- aparatele de măsură pe căruciorul de atelier (dreapta-față) */
  const CA = V3(1.05, 0, 0.62), gri = mat({ color: 0x3b3f45, roughness: 0.55, metalness: 0.3 }), rosu = mat({ color: 0xc62828, roughness: 0.45, metalness: 0.2 });
  box(0.5, 0.025, 0.36, rosu, CA.x, 0.62, CA.z, 0.006); box(0.5, 0.025, 0.36, rosu, CA.x, 0.25, CA.z, 0.006);
  [[-0.23, -0.16], [0.23, -0.16], [-0.23, 0.16], [0.23, 0.16]].forEach(([x, z]) => { box(0.02, 0.6, 0.02, gri, CA.x + x, 0.33, CA.z + z, 0.003); cyl(0.025, 0.025, 0.02, M.cauc, CA.x + x, 0.025, CA.z + z, "z"); });
  // pompa manuală de vacuum cu manometru (tip Mityvac): corpul, mânerul, cadranul 0…1000 mbar
  const PV = new THREE.Group(); PV.position.set(CA.x - 0.1, 0.665, CA.z - 0.05); PV.rotation.y = 0.5; sc.add(PV);
  { const corp = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 24), M.rosu), PV); corp.rotation.z = Math.PI / 2; corp.position.y = 0.02;
    const man = add(new THREE.Mesh(RB(0.03, 0.09, 0.028, 0.008), M.negru), PV); man.position.set(-0.05, -0.02, 0); man.rotation.z = 0.25;
    const tr = add(new THREE.Mesh(RB(0.025, 0.07, 0.016, 0.006), M.negru), PV); tr.position.set(-0.01, -0.015, 0); tr.rotation.z = -0.35; PV.userData.tr = tr;
    const cad = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 40), M.crom), PV); cad.position.set(0.06, 0.05, 0); cad.rotation.x = Math.PI / 2;
    k_(corp, "pompaVac", "Pompa manuală de vacuum cu manometru (0…1000 mbar) – se racordează la actuatorul VGT"); k_(cad, "pompaVac", "Manometrul pompei de vacuum (depresiunea aplicată)"); }
  const eVac = ecran(256, 256); { const o = add(new THREE.Mesh(new THREE.CircleGeometry(0.031, 40), new THREE.MeshBasicMaterial({ map: eVac.t })), PV); o.position.set(0.06, 0.05, 0.0095); o.castShadow = false; }
  const furtVac = tub([[0, 0, 0], [0, 0, 0.01]], 0.003, M.cauc); furtVac.visible = false;
  // comparatorul cu cadran pe suport magnetic (palpatorul pe capătul tijei actuatorului)
  const CMP = new THREE.Group(); sc.add(CMP);
  const ROD = V3(T.G.position.x + 0.035 - 0.002, T.G.position.y - 0.087, T.G.position.z + 0.046);                        // capătul tijei, la actuator
  { const base = box(0.05, 0.04, 0.03, mat({ color: 0x5a6068, roughness: 0.4, metalness: 0.6 }), 0.26, 0.405, 0.32, 0.004, CMP); k_(base, "comparator", "Suportul magnetic al comparatorului (fixat pe cadrul standului)");
    cyl(0.006, 0.006, 0.01, rosu, 0.26, 0.43, 0.32, "z", CMP, 12);
    tub([[0.26, 0.425, 0.32], [0.24, 0.5, 0.31], [0.12, 0.52, 0.29], [ROD.x + 0.09, ROD.y, ROD.z]], 0.0045, M.crom, CMP, 30, 8);
    const corp = cyl(0.026, 0.026, 0.014, M.crom, ROD.x + 0.09, ROD.y + 0.006, ROD.z, "z", CMP, 40); k_(corp, "comparator", "Comparatorul cu cadran (0,01 mm) – măsoară cursa tijei actuatorului");
    const pal = cyl(0.002, 0.002, 0.06, M.crom, ROD.x + 0.045, ROD.y, ROD.z, "x", CMP, 8); CMP.userData.pal = pal; }
  const eCmp = ecran(256, 256); { const o = add(new THREE.Mesh(new THREE.CircleGeometry(0.023, 40), new THREE.MeshBasicMaterial({ map: eCmp.t })), CMP); o.position.set(ROD.x + 0.09, ROD.y + 0.006, ROD.z + 0.0075); o.castShadow = false; }
  // termocuplele tip K (T1, T2, T3) în furtunuri și T4 (aerul ambiant), cablurile spre termometrul cu 4 canale
  const TERM = new THREE.Group(); sc.add(TERM); const TM = V3(CA.x + 0.12, 0.66, CA.z + 0.05);
  const termo = box(0.08, 0.025, 0.15, M.galben, TM.x, TM.y, TM.z, 0.01, TERM); termo.rotation.x = -0.2; k_(termo, "termometru", "Termometrul cu 4 canale (termocuple tip K): T1, T2, T3 și T4 = aerul ambiant");
  const eT = ecran(256, 200); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.05), new THREE.MeshBasicMaterial({ map: eT.t })), TERM); o.position.set(TM.x, TM.y + 0.016, TM.z - 0.03); o.rotation.x = -Math.PI / 2 - 0.2; o.castShadow = false; }
  const crvP = pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p)));
  const pT = [crvP(TC).getPointAt(0.55), crvP(h2p).getPointAt(0.45), crvP(h3p).getPointAt(0.2)];
  const culT = [0xffd400, 0xff7a00, 0x2e9e44];
  pT.forEach((p, i) => { const s = cyl(0.0022, 0.0022, 0.06, M.crom, p.x, p.y + 0.045, p.z, "y", TERM, 8); k_(s, "termocuplu", `Termocuplul T${i + 1} (${["intrarea compresorului", "ieșirea compresorului", "ieșirea intercoolerului"][i]})`);
    const m = box(0.016, 0.012, 0.008, mat({ color: culT[i], roughness: 0.5 }), p.x, p.y + 0.08, p.z, 0.002, TERM);
    tub([[p.x, p.y + 0.085, p.z], [p.x + 0.05, p.y + 0.15, p.z + 0.05], [(p.x + TM.x) / 2, 0.74, (p.z + TM.z) / 2 + 0.1], [TM.x, TM.y + 0.02, TM.z - 0.08]], 0.0018, mat({ color: culT[i], roughness: 0.5 }), TERM, 40, 6); });
  // testerul OBD pe cărucior, cu cablul spre priza OBD a standului
  const OB = new THREE.Group(); OB.position.set(CA.x - 0.05, 0.71, CA.z + 0.1); OB.rotation.set(-0.9, -0.2, 0); sc.add(OB);
  { const c = add(new THREE.Mesh(RB(0.13, 0.2, 0.034, 0.012), mat({ color: 0x1f6fd0, roughness: 0.7 })), OB); k_(c, "obd", "Testerul OBD: presiunea cerută / reală, poziția VGT, BARO, datalog");
    add(new THREE.Mesh(RB(0.115, 0.18, 0.03, 0.008), M.negru), OB).position.z = 0.004; }
  const eO = ecran(320, 260); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.081), new THREE.MeshBasicMaterial({ map: eO.t })), OB); o.position.set(0, 0.035, 0.0195); o.castShadow = false; }
  const cabluObd = tub([[CA.x - 0.05, 0.7, CA.z + 0.02], [CA.x - 0.2, 0.55, CA.z - 0.1], [0.45, 0.45, 0.25], [0.35, 0.42, 0.2]], 0.0035, M.negru);
  const priza = box(0.04, 0.02, 0.03, M.negru, 0.35, 0.41, 0.2, 0.004); k_(priza, "obd", "Priza de diagnoză OBD a standului");
  /* ---------- masa cu turbosuflantele secționate (wastegate și VGT) */
  const MS = V3(-0.95, 0, 0.55);
  box(0.8, 0.03, 0.5, mat({ color: 0xd9dcd5, roughness: 0.55 }), MS.x, 0.78, MS.z, 0.006);
  [[-0.37, -0.22], [0.37, -0.22], [-0.37, 0.22], [0.37, 0.22]].forEach(([x, z]) => box(0.03, 0.78, 0.03, gri, MS.x + x, 0.39, MS.z + z, 0.003));
  const sect = [];
  [["wg", "pres", -0.19, "Turbosuflantă cu wastegate (secționată)"], ["vgt", "vac", 0.19, "Turbosuflantă cu geometrie variabilă (secționată)"]].forEach(([tip, act, dx, et]) => {
    const t = construiesteTurbo({ M: materiale(), tip, act, sectiune: true }); t.G.position.set(MS.x + dx, 0.9, MS.z); t.G.rotation.y = 0.35; sc.add(t.G); t.clic.forEach(o => { clic.push(o); o.userData.et = "[secționată] " + o.userData.et; o.userData.sect = tip; });
    box(0.07, 0.05, 0.05, gri, MS.x + dx, 0.82, MS.z, 0.004);
    const e = ecran(512, 96); e.x.fillStyle = "#f5f5f0"; e.x.fillRect(0, 0, 512, 96); e.x.fillStyle = "#1b2733"; e.x.font = "bold 30px system-ui"; e.x.textAlign = "center"; e.x.fillText(tip === "wg" ? "WASTEGATE" : "GEOMETRIE VARIABILĂ (VGT)", 256, 42); e.x.font = "22px system-ui"; e.x.fillText("secționată – sfert decupat", 256, 78); e.t.needsUpdate = true;
    const pl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.03), new THREE.MeshBasicMaterial({ map: e.t }))); pl.position.set(MS.x + dx, 0.797, MS.z + 0.19); pl.rotation.x = -Math.PI / 2 + 0.4; pl.castShadow = false;
    sect.push(t); });
  // particulele în turbosuflanta de pe stand
  const PG = new THREE.Group(); PG.position.copy(TP); sc.add(PG);
  const P = particule(PG, [{ k: "aer", pts: T.cai.aer, n: 50, col: 0x7fd3ff }, { k: "gaz", pts: T.cai.gaz, n: 50, col: 0xff7a1a }]);
  interactiune(S, clic, opt.laClic);
  /* ---------- starea */
  const V = { n: 0, pos: 0.7, vacMontat: false, vac: 0, comp: false, s: 0, termo: false, T: [20, 20, 20, 20], obd: null, obdConectat: false, transparent: false, Tgaz: 20, sectAnim: true };
  let rot = 0, ultTr = null, kV = "", kC = "", kT = "", kO = "", rotS = 0, ts = 0;
  function cadranVac(v) { const { x, c } = eVac, R = 128; x.fillStyle = "#fbfbf7"; x.beginPath(); x.arc(R, R, R, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = "#333"; x.stroke();
    const ang = q => (-225 + 270 * q / 1000) * Math.PI / 180; for (let i = 0; i <= 50; i++) { const a = ang(i * 20), M5 = i % 5 === 0; x.strokeStyle = "#111"; x.lineWidth = M5 ? 4 : 1.6; x.beginPath(); x.moveTo(R + Math.cos(a) * 118, R + Math.sin(a) * 118); x.lineTo(R + Math.cos(a) * (M5 ? 96 : 106), R + Math.sin(a) * (M5 ? 96 : 106)); x.stroke();
      if (i % 10 === 0) { x.fillStyle = "#111"; x.font = "bold 20px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(i * 20), R + Math.cos(a) * 76, R + Math.sin(a) * 76); } }
    x.fillStyle = "#c62828"; x.font = "bold 18px system-ui"; x.fillText("mbar vacuum", R, R + 52); const a = ang(v); x.strokeStyle = "#c62828"; x.lineWidth = 6; x.beginPath(); x.moveTo(R - Math.cos(a) * 20, R - Math.sin(a) * 20); x.lineTo(R + Math.cos(a) * 108, R + Math.sin(a) * 108); x.stroke(); x.fillStyle = "#111"; x.beginPath(); x.arc(R, R, 10, 0, 7); x.fill(); eVac.t.needsUpdate = true; }
  function cadranCmp(s) { const { x, c } = eCmp, R = 128; x.fillStyle = "#ffffff"; x.beginPath(); x.arc(R, R, R, 0, 7); x.fill();
    for (let i = 0; i < 100; i++) { const a = i / 100 * Math.PI * 2 - Math.PI / 2, M5 = i % 10 === 0; x.strokeStyle = "#111"; x.lineWidth = M5 ? 3 : 1.2; x.beginPath(); x.moveTo(R + Math.cos(a) * 120, R + Math.sin(a) * 120); x.lineTo(R + Math.cos(a) * (M5 ? 100 : 110), R + Math.sin(a) * (M5 ? 100 : 110)); x.stroke();
      if (M5) { x.fillStyle = "#111"; x.font = "bold 18px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(i), R + Math.cos(a) * 84, R + Math.sin(a) * 84); } }
    x.strokeStyle = "#555"; x.lineWidth = 2; x.beginPath(); x.arc(R, R + 40, 24, 0, 7); x.stroke(); const am = (s % 10) / 10 * Math.PI * 2 - Math.PI / 2; x.strokeStyle = "#111"; x.lineWidth = 3; x.beginPath(); x.moveTo(R, R + 40); x.lineTo(R + Math.cos(am) * 20, R + 40 + Math.sin(am) * 20); x.stroke();
    x.fillStyle = "#111"; x.font = "12px system-ui"; x.fillText("0,01 mm", R, R + 76); const a = (s % 1) * Math.PI * 2 - Math.PI / 2; x.strokeStyle = "#c62828"; x.lineWidth = 4; x.beginPath(); x.moveTo(R, R); x.lineTo(R + Math.cos(a) * 112, R + Math.sin(a) * 112); x.stroke(); x.fillStyle = "#111"; x.beginPath(); x.arc(R, R, 8, 0, 7); x.fill(); eCmp.t.needsUpdate = true; }
  function lcdT(T, on) { const { x, c } = eT; x.fillStyle = "#b5c2a6"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1b2416"; x.font = "bold 34px 'Courier New',monospace"; x.textAlign = "left";
    ["T1", "T2", "T3", "T4"].forEach((k, i) => { x.font = "bold 20px system-ui"; x.fillText(k, 12, 40 + i * 46); x.font = "bold 36px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(on ? T[i].toFixed(1) : "----", 236, 42 + i * 46); x.textAlign = "left"; }); eT.t.needsUpdate = true; }
  function ecranObd(o) { const { x, c } = eO; x.fillStyle = "#06121d"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1f6fd0"; x.fillRect(0, 0, c.width, 34); x.fillStyle = "#fff"; x.font = "bold 17px system-ui"; x.textAlign = "left"; x.fillText(o && o.titlu || "Tester OBD", 10, 23);
    if (!o || !o.linii) { x.fillStyle = "#567"; x.font = "17px system-ui"; x.fillText("deconectat", 10, 74); } else o.linii.forEach(([e, v, al], i) => { x.fillStyle = "#9fb3c6"; x.font = "15px system-ui"; x.fillText(e, 10, 66 + i * 32); x.fillStyle = al ? "#ffb02e" : "#6dff8e"; x.font = "bold 19px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(v, c.width - 10, 66 + i * 32); x.textAlign = "left"; });
    eO.t.needsUpdate = true; }
  cadranVac(0); cadranCmp(0); lcdT(V.T, false); ecranObd(null);
  let furtKey = "";
  S.porneste(dt => {
    ts += dt;
    if (V.transparent !== ultTr) { ultTr = V.transparent; aplicaTransparent(carcase, V.transparent); }
    const nt = V.n > 50 ? 25000 + 40 * V.n : 0; rot += nt / 60 * 2 * Math.PI * dt / 3000;
    T.seteaza({ rot, vgt: V.pos, tija: V.pos, Tgaz: V.Tgaz });
    mEv.emissiveIntensity = Math.max(0, Math.min(0.5, (V.Tgaz - 600) / 500));
    // turbosuflantele secționate: rotorul se rotește încet, paletele / clapeta se mișcă demonstrativ
    rotS += dt * 0.8; const d = 0.5 + 0.5 * Math.sin(ts * 0.6); sect.forEach(t => t.seteaza({ rot: rotS, vgt: d, wg: d * 0.8, tija: d }));
    const fl = V.n > 50 ? 0.03 + V.n / 4000 * 0.15 : 0; P.actualizeaza({ aer: fl, gaz: fl * 1.2 }, dt);
    // furtunul de vacuum: la EVRV (normal) sau la pompa manuală (proba actuatorului)
    vacEV.visible = !V.vacMontat; furtVac.visible = V.vacMontat;
    if (V.vacMontat && furtKey !== "p") { furtKey = "p"; PV.updateMatrixWorld(true); const A = PV.localToWorld(V3(0.1, 0.02, 0)); furtVac.geometry.dispose(); furtVac.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A, A.clone().add(V3(0.06, 0.02, 0.02)), V3((A.x + NIP.x) / 2, 0.75, (A.z + NIP.z) / 2 + 0.1), NIP.clone().add(V3(0.03, -0.03, 0.04)), NIP]), 60, 0.003, 8); }
    if (!V.vacMontat) furtKey = "";
    PV.userData.tr.rotation.z = -0.35 + (V.vacMontat ? 0.25 * Math.max(0, Math.sin(ts * 5)) * (V.pompeaza ? 1 : 0) : 0);
    CMP.visible = V.comp; const pal = CMP.userData.pal; pal.position.x = ROD.x + 0.045 + 0.012 * V.pos * 0;
    TERM.visible = V.termo; OB.visible = true; cabluObd.visible = V.obdConectat;
    const k1 = Math.round(V.vac); if (k1 + "" !== kV) { kV = k1 + ""; cadranVac(k1); }
    const k2 = V.s.toFixed(2); if (V.comp && k2 !== kC) { kC = k2; cadranCmp(V.s); }
    const k3 = V.termo + "|" + V.T.map(v => v.toFixed(1)).join(); if (k3 !== kT) { kT = k3; lcdT(V.T, V.termo); }
    const k4 = JSON.stringify(V.obd); if (k4 !== kO) { kO = k4; ecranObd(V.obd); }
  });
  return { seteaza(o) { Object.assign(V, o); }, vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); } };
}
