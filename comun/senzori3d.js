/* Atelierul senzorilor: alegerea senzorului (listă sau clic în macheta autoturismului), modelul 3D al senzorului real,
   mufa cu pin-out-ul și verificările animate (multimetru, osciloscop, tester). Modul ES încărcat la cerere de cadru (tabul „Senzorii (3D)”).
   Modelele 3D sunt construite procedural, în milimetri. */
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { MAT } from "./motor3d.js?v=15";
import { SENZORI } from "./senzori-date.js?v=1";

const CAT = () => globalThis.CATALOG_SENZORI;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fr = x => x - Math.floor(x);
const virg = (x, d) => x.toFixed(d).replace(".", ",");
function eIntunecat() { const t = document.documentElement.getAttribute("data-theme"); return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); }

/* ================================================================== pozițiile pinilor (comune pentru 3D, SVG și animații) */
function asezarePini(n) {
  if (!n) return { L: 0, H: 0, p: [] };
  const randuri = n <= 4 ? 1 : n <= 8 ? 2 : 3, pe = Math.ceil(n / randuri), pas = 4.2;
  const p = []; for (let i = 0; i < n; i++) { const r = Math.floor(i / pe), c = i % pe, nr = Math.min(pe, n - r * pe); p.push([(c - (nr - 1) / 2) * pas, (r - (randuri - 1) / 2) * 4.6]); }
  return { L: pe * pas + 4.5, H: randuri * 4.6 + 4.2, p };
}
const CULORI = { roșu: "#d42a2a", negru: "#222", alb: "#f2f2f2", gri: "#8b9096", verde: "#21a043", galben: "#e8c21a", maro: "#7b4a24", albastru: "#2563eb", violet: "#7c3aed", portocaliu: "#f08c00" };
function culoriFir(s) { return String(s).split(/[\s/(]/).map(x => CULORI[x]).filter(Boolean); }

/* ================================================================== modelele 3D */
function construiesteModel(fam, o, nPini) {
  const M = MAT();
  const pa = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.62, metalness: 0.02 });
  const paGri = new THREE.MeshStandardMaterial({ color: 0x5e646b, roughness: 0.55, metalness: 0.02 });
  const paAlb = new THREE.MeshStandardMaterial({ color: 0xd9dcdf, roughness: 0.55 });
  const aur = new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.25, metalness: 1 });
  const sticla = new THREE.MeshPhysicalMaterial({ color: 0xbcd8ff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.45, thickness: 1 });
  const negruLuc = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.15, metalness: 0.4 });
  const cablu = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.75 });
  Object.values({ pa, paGri, paAlb, aur, sticla, negruLuc, cablu }).forEach(m => m.envMapIntensity = 0.6);
  const R = new THREE.Group(); const anim = [];
  const add = (geo, m, p = R) => { const x = new THREE.Mesh(geo, m); x.castShadow = x.receiveShadow = true; p.add(x); return x; };
  const cyl = (r1, r2, h, m, x, y, z, ax = "y", p = R, seg = 40) => { const c = add(new THREE.CylinderGeometry(r1, r2, h, seg), m, p); c.position.set(x, y, z); if (ax === "x") c.rotation.z = Math.PI / 2; if (ax === "z") c.rotation.x = Math.PI / 2; return c; };
  const box = (w, h, d, m, x, y, z, r = 0, p = R) => { const b = add(r ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d), m, p); b.position.set(x, y, z); return b; };
  const tor = (Ra, r, m, x, y, z, ax = "y", p = R) => { const t = add(new THREE.TorusGeometry(Ra, r, 10, 40), m, p); t.position.set(x, y, z); if (ax === "y") t.rotation.x = Math.PI / 2; if (ax === "x") t.rotation.y = Math.PI / 2; return t; };
  const hex = (s, h, m, x, y, z, p = R) => { const c = add(new THREE.CylinderGeometry(s / Math.sqrt(3), s / Math.sqrt(3), h, 6), m, p); c.position.set(x, y, z); return c; };
  const inel = (Re, Ri, h, m, x, y, z, ax = "y", p = R) => { const sh = new THREE.Shape(); sh.absarc(0, 0, Re, 0, Math.PI * 2); const g = new THREE.Path(); g.absarc(0, 0, Ri, 0, Math.PI * 2, true); sh.holes.push(g);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 2, curveSegments: 48 }); geo.translate(0, 0, -h / 2); const x0 = add(geo, m, p); x0.position.set(x, y, z); if (ax === "y") x0.rotation.x = Math.PI / 2; if (ax === "x") x0.rotation.y = Math.PI / 2; return x0; };
  const filet = (d, L, m, y0, p = R) => { const n = Math.max(3, Math.floor(L / 1.5)); cyl(d / 2 - 0.6, d / 2 - 0.6, L, m, 0, y0 + L / 2, 0, "y", p); for (let i = 0; i < n; i++) tor(d / 2 - 0.55, 0.55, m, 0, y0 + 0.75 + i * L / n, 0, "y", p); };
  const tub = (pts, r, m, p = R) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v))), 64, r, 12, false), m, p);
  /** mufa senzorului (partea tată, cu pinii vizibili): fața de contact spre +y; returnează grupul */
  function mufa(x, y, z, rot = [0, 0, 0], culoare = pa) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(...rot); R.add(g);
    if (!nPini) return g;
    const A = asezarePini(nPini), L = A.L + 2, D = A.H + 2, Hs = 6, Hb = 7, t = 1.1;
    box(L, Hb, D, culoare, 0, Hb / 2, 0, 1.2, g);
    box(L, Hs, t, culoare, 0, Hb + Hs / 2, D / 2 - t / 2, 0, g); box(L, Hs, t, culoare, 0, Hb + Hs / 2, -D / 2 + t / 2, 0, g);
    box(t, Hs, D, culoare, L / 2 - t / 2, Hb + Hs / 2, 0, 0, g); box(t, Hs, D, culoare, -L / 2 + t / 2, Hb + Hs / 2, 0, 0, g);
    box(L - 2 * t, 0.3, D - 2 * t, negruLuc, 0, Hb + 0.2, 0, 0, g);
    A.p.forEach(([px, pz], i) => { box(0.8, 5.2, i === 0 ? 0.8 : 0.8, aur, px, Hb + 2.6, pz, 0, g); if (i === 0) box(1.2, 0.3, 1.2, paAlb, px - 1.6, Hb + Hs + 0.05, -D / 2 + 0.5, 0, g); });
    box(L * 0.4, 2.2, 2.2, culoare, 0, Hb + Hs - 2, D / 2 + 1.1, 0.4, g);           // clema de blocare
    box(1.6, Hs - 1, 1.2, culoare, -L / 2 + t + 0.8, Hb + Hs / 2, 0, 0, g);              // nervura de codificare
    return g;
  }
  const mufaCablu = (pts, ...rest) => { tub(pts, 2.4, cablu); const q = pts[pts.length - 1]; return mufa(q[0], q[1], q[2], ...rest); };

  switch (fam) {
    case "filet": {
      const metal = o.corp === "metal" ? M.otel : M.alama;
      const s = o.hex, df = o.filet;
      if (o.varf === "ntc") { cyl(2.6, 2.6, 9, M.alama, 0, -4.5, 0); add(new THREE.SphereGeometry(2.6, 24, 12), M.alama).position.set(0, -9, 0); filet(df, 10, M.alama, 0); hex(s, 8, M.alama, 0, 14, 0); cyl(s * 0.42, s * 0.46, 10, pa, 0, 23, 0); tor(s * 0.45, 0.9, M.cauciuc, 0, 10.5, 0); mufa(0, 28, 0); }
      else if (o.varf === "ntcAer") { for (let i = 0; i < 3; i++) { const a = i * 2.09; cyl(0.6, 0.6, 12, pa, Math.cos(a) * 3, -6, Math.sin(a) * 3); } add(new THREE.SphereGeometry(1.4, 16, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.4 })).position.set(0, -8, 0); cyl(4, 4, 2, pa, 0, -12, 0); filet(df, 9, pa, 0); hex(s, 6, pa, 0, 12, 0); cyl(5, 5, 6, pa, 0, 18, 0); mufa(0, 21, 0); }
      else if (o.varf === "presiune") { cyl(2.5, 2.5, 4, metal, 0, -2, 0); filet(df, 11, metal, 0); tor(df / 2 + 0.6, 0.9, M.cauciuc, 0, 11.6, 0); hex(s, 8, metal, 0, 16, 0); if (o.schrader) cyl(2, 2, 3, M.alama, 0, -4.5, 0); cyl(s * 0.5, s * 0.5, 7, o.corp === "metal" ? M.otel : pa, 0, 23.5, 0); cyl(s * 0.42, s * 0.42, 4, pa, 0, 29, 0); mufa(0, 31, 0); }
      else if (o.varf === "lambda" || o.varf === "egt") {
        const lam = o.varf === "lambda";
        if (lam) { cyl(6.2, 6.2, 22, M.otel, 0, -11, 0); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; box(1.4, 3.2, 1.4, negruLuc, Math.cos(a) * 6.1, -6 - (i % 2) * 9, Math.sin(a) * 6.1); } add(new THREE.SphereGeometry(6.2, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.otel).position.set(0, -22, 0); }
        else { cyl(1.6, 1.6, 40, M.otel, 0, -20, 0); add(new THREE.SphereGeometry(1.6, 12, 8), M.otel).position.set(0, -40, 0); }
        filet(df, lam ? 12 : 8, M.otel, 0); hex(s, lam ? 8 : 6, M.otel, 0, (lam ? 12 : 8) + 4, 0); cyl(s * 0.36, s * 0.3, 18, M.otel, 0, (lam ? 12 : 8) + 17, 0); cyl(3.4, 3, 8, M.cauciuc, 0, (lam ? 12 : 8) + 30, 0);
        const y0 = (lam ? 12 : 8) + 34;
        let pts = [[0, y0, 0], [0, y0 + 30, 0], [20, y0 + 70, 10], [70, y0 + 90, 10], [120, y0 + 92, 0]];
        if (o.modul) { tub(pts, 2.4, cablu); box(60, 22, 40, M.alu, 160, y0 + 92, 0, 3); for (let i = 0; i < 6; i++) box(2, 22, 40, M.aluMat, 136 + i * 9, y0 + 92, 0, 0.5); mufa(195, y0 + 92, 0, [0, 0, -Math.PI / 2]); }
        else mufaCablu(pts, [0, 0, -Math.PI / 2]);
      }
      break;
    }
    case "flansa": {
      const d = o.d, L = o.L;
      cyl(d / 2, d / 2, L, pa, 0, -L / 2, 0); cyl(d / 2 - 0.5, d / 2 - 0.5, 0.6, negruLuc, 0, -L - 0.1, 0); tor(d / 2 + 0.3, 1.1, M.cauciuc, 0, -8, 0);
      if (o.plat) { cyl(d / 2 + 6, d / 2 + 6, 5, pa, 0, 2.5, 0); for (let i = 0; i < 3; i++) { const a = i * 2.09; cyl(3.5, 3.5, 5.2, M.otel, Math.cos(a) * (d / 2 + 3), 2.5, Math.sin(a) * (d / 2 + 3)); } mufa(0, 5, 0); break; }
      box(d + 22, 5, d * 0.9, pa, 9, 2.5, 0, 2); inel(4.5, 3, 5.4, M.otel, d / 2 + 10, 2.5, 0); box(d * 0.9, 12, d * 0.8, pa, 0, 10, 0, 2);
      if (o.mufa === "cablu") mufaCablu([[0, 16, 0], [0, 40, 0], [-10, 80, 20], [-40, 110, 30]], [0, 0, Math.PI / 2]);
      else mufa(0, 16, 0);
      break;
    }
    case "bloc": {
      const { w, h, d } = o;
      box(w, h, d, pa, 0, 0, 0, 3);
      for (const sx of [-1, 1]) { box(9, 4, 12, pa, sx * (w / 2 + 3.5), -h / 2 + 2, 0, 1.5); inel(3.5, 2.3, 4.4, M.alama, sx * (w / 2 + 5), -h / 2 + 2, 0); }
      if (o.stut === 1) { cyl(5, 5, 8, pa, 0, -h / 2 - 4, 0); tor(5.2, 1, M.cauciuc, 0, -h / 2 - 5, 0); if (o.ntc) { for (let i = 0; i < 3; i++) { const a = i * 2.09; cyl(0.5, 0.5, 6, pa, Math.cos(a) * 2.5, -h / 2 - 11, Math.sin(a) * 2.5); } add(new THREE.SphereGeometry(1.2, 12, 8), M.cupru).position.set(0, -h / 2 - 13, 0); } }
      if (o.stut === 2) for (const sz of [-1, 1]) { cyl(3.2, 3.6, 18, pa, sz * w * 0.22, 0, d / 2 + 9, "z"); tor(3.6, 0.8, pa, sz * w * 0.22, 0, d / 2 + 14, "z"); }
      if (o.ax) { cyl(4, 4, 14, M.otel, 0, -h / 2 - 7, 0); box(24, 3, 6, M.otel, 8, -h / 2 - 14, 0, 1); }
      mufa(w / 2, 0, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "maf": {
      const tubM = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.5, side: THREE.DoubleSide }); tubM.envMapIntensity = 0.6;
      add(new THREE.CylinderGeometry(34, 34, 110, 48, 1, true), tubM).rotation.z = Math.PI / 2;
      for (const sx of [-1, 1]) inel(40, 33.5, 5, pa, sx * 55, 0, 0, "x");
      inel(33.5, 30, 2, M.aluMat, -52, 0, 0, "x"); for (let i = -3; i <= 3; i++) { box(1, 0.6, 62, M.aluMat, -52, i * 8, 0); box(1, 62, 0.6, M.aluMat, -52, 0, i * 8); }
      box(26, 26, 20, pa, 0, 40, 0, 3); box(60, 14, 22, pa, 0, 58, 0, 3); box(10, 60, 4, paGri, 0, 6, 0, 1.5);
      mufa(30, 58, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "clapeta": {
      const corp = box(80, 74, 50, M.alu, 0, 0, 0, 5);
      const bore = new THREE.MeshStandardMaterial({ color: 0x6d7379, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }); bore.envMapIntensity = 0.6;
      const tb = add(new THREE.CylinderGeometry(27, 27, 51, 48, 1, true), bore); tb.rotation.x = Math.PI / 2; tb.position.set(-10, 0, 0);
      inel(36, 27, 4, M.alu, -10, 0, 26, "z"); inel(36, 27, 4, M.alu, -10, 0, -26, "z");
      const disc = add(new THREE.CylinderGeometry(26.5, 26.5, 1.4, 48), M.otel); disc.position.set(-10, 0, 0); disc.rotation.x = Math.PI / 2;
      const ax = cyl(2.2, 2.2, 62, M.otel, -10, 0, 0, "x"); anim.push(t => { const a = 0.15 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.8)); disc.rotation.set(Math.PI / 2 - a, 0, 0); });
      cyl(14, 14, 50, M.otel, 22, -22, 0, "z"); cyl(12, 12, 2, M.alama, 22, -22, 26, "z");
      box(18, 70, 56, pa, 46, 4, 0, 5); mufa(55, 18, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "pedala": {
      box(46, 56, 36, pa, 0, 0, 0, 4); for (const sz of [-1, 1]) inel(4, 2.6, 5, M.otel, -18, 26, sz * 14, "z");
      const brat = new THREE.Group(); brat.position.set(0, -10, 0); R.add(brat);
      box(8, 150, 12, pa, 0, -75, 0, 3, brat); box(60, 10, 80, M.cauciuc, 0, -155, 0, 4, brat); for (let i = -3; i <= 3; i++) box(56, 1.2, 2, negruLuc, 0, -149.4, i * 10, 0, brat);
      brat.rotation.z = 0.35; anim.push(t => { brat.rotation.z = 0.35 - 0.25 * (0.5 + 0.5 * Math.sin(t * 0.9)); });
      mufa(-23, 6, 0, [0, 0, Math.PI / 2]);
      break;
    }
    case "knock": {
      inel(13, 4.2, 9, pa, 0, 0, 0); inel(5.5, 4.2, 10, M.otel, 0, 0, 0); inel(13.2, 10, 1, M.alama, 0, -5, 0);
      box(18, 9, 12, pa, 18, 0, 0, 2); mufa(27, 0, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "nivRez": {
      cyl(13, 13, 9, o.frana ? paAlb : pa, 0, 0, 0); mufa(0, 4.5, 0, [0, 0, 0], o.frana ? paAlb : pa);
      cyl(2.6, 2.6, 34, paAlb, 0, -21, 0); const pl = cyl(7, 7, 12, o.frana ? M.galben : paAlb, 0, -20, 0); tor(7.2, 0.7, M.cauciuc, 0, -3, 0);
      anim.push(t => { pl.position.y = -26 + 9 * (0.5 + 0.5 * Math.sin(t * 0.8)); });
      break;
    }
    case "contact": {
      cyl(10, 10, 38, paAlb, 0, 0, 0, "x"); for (let i = 0; i < 6; i++) tor(10.2, 0.7, paAlb, -12 + i * 3, 0, 0, "x");
      const pl = cyl(3, 3, 14, pa, -24, 0, 0, "x"); anim.push(t => { pl.position.x = -24 + 4 * (0.5 + 0.5 * Math.sin(t * 1.5)); });
      box(4, 26, 14, paAlb, 7, 0, 0, 1.5); mufa(19, 0, 0, [0, 0, -Math.PI / 2], paAlb);
      break;
    }
    case "uzura": {
      box(14, 10, 6, pa, 0, 0, 0, 2); tub([[0, -5, 0], [0, -12, 0], [-6, -16, 0], [6, -16, 0], [0, -12, 0.1]], 0.6, M.cupru);
      mufaCablu([[7, 0, 0], [40, 10, 0], [80, 40, 10], [120, 50, 10]], [0, 0, -Math.PI / 2]);
      break;
    }
    case "sas": {
      inel(42, 22, 14, pa, 0, 0, 0); for (const [x, z, r] of [[-20, 25, 8], [12, 28, 6]]) { cyl(r, r, 4, paAlb, x, 8, z); for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; box(1.2, 4, 1.6, paAlb, x + Math.cos(a) * r, 8, z + Math.sin(a) * r); } }
      const rot = inel(24, 21, 16, paGri, 0, 0, 0); anim.push(t => { rot.rotation.z = t * 0.6; });
      box(22, 14, 16, pa, 46, 0, 0, 2); mufa(57, 0, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "modul": {
      const { w, h, d } = o; const m = o.culoare === "alu" ? M.alu : o.culoare === "plasticGri" ? paGri : pa;
      if (o.hidraulic) {
        box(w, h, d, M.alu, 0, 0, 0, 3); for (let i = 0; i < 6; i++) { const x = -w / 2 + 10 + (i % 3) * (w - 20) / 2, z = i < 3 ? -d / 4 : d / 4; cyl(4, 4, 6, M.alama, x, h / 2 + 3, z); hex(8, 3, M.alama, x, h / 2 + 7, z); }
        cyl(18, 18, 40, M.otel, 0, 0, -d / 2 - 20, "z"); box(w + 6, h * 0.7, 22, pa, 0, -2, d / 2 + 11, 3); mufa(w / 2 + 3, 0, d / 2 + 11, [0, 0, -Math.PI / 2]);
        break;
      }
      box(w, h, d, m, 0, 0, 0, 3);
      if (o.grila) for (let i = 0; i < 7; i++) box(w * 0.7, 0.8, 1.6, negruLuc, 0, h / 2 + 0.1, -d * 0.3 + i * d * 0.1);
      if (o.sticla) box(w * 0.6, 1, d * 0.6, sticla, 0, h / 2 + 0.5, 0);
      if (o.urechi) for (const sx of [-1, 1]) { box(10, 3, 12, m, sx * (w / 2 + 4), -h / 2 + 1.5, 0, 1); inel(3.5, 2.2, 3.4, M.alama, sx * (w / 2 + 5.5), -h / 2 + 1.5, 0); }
      mufa(w / 2, 0, 0, [0, 0, -Math.PI / 2], m === M.alu ? pa : m);
      break;
    }
    case "tpms": {
      box(42, 16, 22, paGri, 0, 0, 0, 5); box(30, 0.4, 14, M.aluMat, 0, 8.1, 0);
      const v = new THREE.Group(); v.position.set(-18, 4, 0); v.rotation.z = 0.5; R.add(v);
      cyl(4.5, 4.5, 40, M.alu, 0, 20, 0, "y", v); for (let i = 0; i < 12; i++) tor(4.4, 0.35, M.alu, 0, 28 + i * 0.9, 0, "y", v); hex(9, 4, M.alu, 0, 8, 0, v); cyl(4.8, 4.8, 9, negruLuc, 0, 44, 0, "y", v); tor(5, 1, M.cauciuc, 0, 3, 0, "y", v);
      break;
    }
    case "parghie": {
      box(36, 30, 24, pa, 0, 0, 0, 3); inel(4, 2.5, 4, M.otel, -24, -10, 0, "z"); box(8, 6, 6, pa, -20, -10, 0, 1);
      const p = new THREE.Group(); p.position.set(0, 0, 14); R.add(p); cyl(3, 3, 6, M.otel, 0, 0, 0, "z", p); box(70, 4, 6, M.otel, 32, 0, 3, 1, p);
      add(new THREE.SphereGeometry(4, 16, 8), M.otel, p).position.set(66, 0, 3); cyl(2, 2, 70, M.otel, 66, -35, 3, "y", p);
      anim.push(t => { p.rotation.z = 0.25 * Math.sin(t * 0.8); });
      mufa(18, 0, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "radar": {
      box(80, 64, 26, pa, 0, 0, 0, 4);
      if (o.lidar) box(70, 22, 2, negruLuc, 0, 6, 13.5, 1); else { const ra = add(new THREE.SphereGeometry(120, 32, 16, -0.3, 0.6, Math.PI / 2 - 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.35 })); ra.position.set(0, 0, -107); }
      for (const sx of [-1, 1]) { box(10, 10, 6, pa, sx * 46, 20, -6, 1.5); inel(3, 2, 6, M.alama, sx * 48, 20, -6, "z"); }
      mufa(0, -32, -6, [Math.PI, 0, 0]);
      break;
    }
    case "camera": {
      const fata = o.fata;
      box(fata ? 70 : 30, fata ? 30 : 24, fata ? 50 : 26, pa, 0, 0, 0, 4);
      cyl(fata ? 7 : 6, fata ? 7 : 6, 10, pa, 0, 0, fata ? 28 : 16, "z"); cyl(fata ? 5.5 : 4.5, fata ? 5.5 : 4.5, 1, sticla, 0, 0, fata ? 33.6 : 21.6, "z"); cyl(fata ? 4 : 3, fata ? 4 : 3, 0.5, negruLuc, 0, 0, fata ? 33 : 21, "z");
      if (fata) { box(80, 2, 30, pa, 0, 17, 22, 1); box(4, 30, 30, pa, -38, 2, 22, 1); box(4, 30, 30, pa, 38, 2, 22, 1); }
      mufa(0, 0, fata ? -25 : -13, [-Math.PI / 2, 0, 0]);
      if (!fata) cyl(3, 3, 8, M.alama, 12, 0, -16, "z");
      break;
    }
    case "pdc": {
      cyl(8, 8, 14, M.aluMat, 0, 0, 0, "z"); cyl(7.4, 7.4, 0.6, M.alu, 0, 0, 7.2, "z"); tor(8.1, 0.9, M.cauciuc, 0, 0, 5, "z");
      box(20, 22, 18, pa, 0, 0, -14, 3); for (const sx of [-1, 1]) box(3, 26, 4, pa, sx * 12, 0, -10, 1); mufa(0, 0, -23, [-Math.PI / 2, 0, 0]);
      break;
    }
    case "ploaie": {
      box(52, 9, 34, pa, 0, 0, 0, 4); const l = add(new THREE.SphereGeometry(14, 32, 12, 0, Math.PI * 2, 0, 0.5), sticla); l.position.set(0, -24, 0);
      box(40, 0.6, 26, new THREE.MeshStandardMaterial({ color: 0x2f6aa8, roughness: 0.2 }), 0, 4.8, 0); mufa(26, 0, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "ibs": {
      inel(10, 8.2, 16, M.aluMat, 0, 0, 0); box(20, 16, 18, M.aluMat, 14, 0, 0, 1); cyl(3, 3, 26, M.otel, 14, 0, 0, "z");
      box(40, 20, 30, pa, 44, 0, 0, 3); box(70, 3, 18, M.cupru, 95, 0, 0, 1); mufa(44, 10, 0);
      break;
    }
    case "plutitor": {
      cyl(60, 60, 8, pa, 0, 0, 0); cyl(48, 52, 10, pa, 0, 9, 0); for (const x of [-25, 0]) { cyl(4, 4, 24, pa, x, 24, 22, "y"); tor(4.2, 0.6, pa, x, 32, 22); }
      mufa(25, 14, -10);
      cyl(5, 5, 180, M.otel, 0, -95, 0); cyl(36, 36, 140, new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.6, transparent: true, opacity: 0.55 }), 0, -110, 0);
      box(30, 50, 3, paAlb, 30, -120, 36, 1); const brat = new THREE.Group(); brat.position.set(30, -120, 40); R.add(brat);
      tub([[0, 0, 0], [40, -10, 0], [110, -20, 0]], 1, M.otel, brat); box(30, 14, 40, M.galben, 120, -20, 0, 5, brat);
      anim.push(t => { brat.rotation.z = 0.35 * Math.sin(t * 0.6); });
      break;
    }
    case "covoras": {
      box(320, 2, 260, new THREE.MeshStandardMaterial({ color: 0xe9e3c6, roughness: 0.8 }), 0, 0, 0, 0.8);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) cyl(14, 14, 0.6, new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4 }), -120 + i * 60, 1.3, -90 + j * 60);
      mufaCablu([[160, 0, 0], [200, 0, 0], [240, 10, 30], [280, 20, 40]], [0, 0, -Math.PI / 2]);
      break;
    }
    case "tempAer": {
      cyl(4, 4, 18, pa, 0, 0, 0, "x"); for (let i = 0; i < 4; i++) box(0.8, 6, 6, pa, -9 - i * 1.2, 0, 0); box(14, 12, 10, pa, 12, 0, 0, 2); box(6, 3, 18, pa, 12, -7, 0, 1);
      mufa(19, 0, 0, [0, 0, -Math.PI / 2]);
      break;
    }
    case "rezolver": {
      const k = o.mic ? 0.6 : 1, Re = 60 * k, Ri = 38 * k;
      inel(Re, Ri, 18, M.otel, 0, 0, 0, "z"); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; box(8 * k, 10 * k, 22, M.cupru, Math.cos(a) * (Ri + 6 * k), Math.sin(a) * (Ri + 6 * k), 0, 1).rotation.z = a; }
      const rot = new THREE.Group(); R.add(rot); const sh = new THREE.Shape(); for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, r = (Ri - 6 * k) * (0.82 + 0.18 * Math.cos(3 * a)); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const hl = new THREE.Path(); hl.absarc(0, 0, 10 * k, 0, Math.PI * 2, true); sh.holes.push(hl); const geo = new THREE.ExtrudeGeometry(sh, { depth: 16, bevelEnabled: false }); geo.translate(0, 0, -8); add(geo, M.otel, rot);
      anim.push(t => { rot.rotation.z = t * 0.8; });
      mufaCablu([[Re, 0, 0], [Re + 30, 0, 0], [Re + 60, 20, 10], [Re + 90, 30, 10]], [0, 0, -Math.PI / 2]);
      break;
    }
    case "curent": {
      box(70, 50, 26, pa, 0, 0, 0, 4); inel(16, 12, 28, M.otel, 0, 0, 0, "z"); box(160, 10, 40, M.cupru, 0, 0, 0, 1).rotation.y = Math.PI / 2;
      mufa(0, 25, 0);
      break;
    }
    case "solar": {
      cyl(16, 18, 8, pa, 0, 0, 0); add(new THREE.SphereGeometry(13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9fb7d6, roughness: 0.1, transmission: 0.5, transparent: true, opacity: 0.6 })).position.set(0, 4, 0);
      box(3, 3, 1, negruLuc, 0, 6, 0); mufa(0, -4, 0, [Math.PI, 0, 0]);
      break;
    }
    case "cuplu": {
      cyl(10, 10, 160, M.otel, 0, 0, 0, "x"); inel(36, 11, 40, pa, 0, 0, 0, "x"); box(30, 26, 30, pa, 0, 40, 0, 3); mufa(0, 53, 0);
      for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; box(1.2, 1.2, 3, M.otel, -22, Math.cos(a) * 11, Math.sin(a) * 11); }
      break;
    }
    case "catarama": {
      box(70, 22, 30, pa, 0, 0, 0, 6); box(26, 4, 22, new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.4 }), 18, 11.5, 0, 2); box(6, 4, 22, M.otel, -38, 0, 0, 0.5);
      mufaCablu([[35, 0, 0], [60, -10, 0], [90, -40, 0], [110, -70, 0]], [0, 0, -Math.PI / 2]);
      break;
    }
    case "cheie": {
      box(62, 14, 34, pa, 0, 0, 0, 7); for (let i = 0; i < 3; i++) box(14, 2, 10, M.cauciuc, -16 + i * 16, 7.5, 0, 1); box(48, 3, 10, M.otel, 52, 0, 0, 1); inel(5, 3, 3, M.otel, -32, 0, 0);
      break;
    }
    case "cmu": {
      box(120, 2, 80, new THREE.MeshStandardMaterial({ color: 0x1e6b37, roughness: 0.5 }), 0, 0, 0);
      [[-30, 10, 18, 18], [10, -15, 12, 24], [30, 20, 10, 10], [-40, -25, 8, 8]].forEach(([x, z, w, d]) => box(w, 2.5, d, negruLuc, x, 2.2, z));
      for (let i = 0; i < 6; i++) box(3, 4, 3, M.alama, -50 + i * 6, 3, 36);
      mufa(50, 1, 0, [0, 0, -Math.PI / 2]);
      for (let i = 0; i < 4; i++) tub([[-55 + i * 6, 3, -40], [-55 + i * 6, 3, -70], [-80 + i * 10, 0, -110]], 1, new THREE.MeshStandardMaterial({ color: i === 3 ? 0x111111 : 0xc0392b }));
      break;
    }
    default: box(30, 20, 20, pa, 0, 0, 0, 3); mufa(15, 0, 0, [0, 0, -Math.PI / 2]);
  }
  return { grup: R, anim };
}

/* ================================================================== desenul mufei (SVG) */
function svgMufa(pini) {
  if (!pini.length) return `<div class="sz-faramufa">Senzorul nu are mufă: este un modul radio cu baterie proprie. Comunicarea se verifică doar cu testerul dedicat.</div>`;
  const n = pini.length, A = asezarePini(n), k = 12, W = A.L * k + 60, H = A.H * k + 90, cx = W / 2, cy = 30 + A.H * k / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${Math.min(W, 360)}" role="img" aria-label="Fața mufei senzorului, cu numerotarea pinilor">`;
  s += `<rect x="${cx - A.L * k / 2 - 6}" y="${cy - A.H * k / 2 - 6}" width="${A.L * k + 12}" height="${A.H * k + 12}" rx="9" fill="#2b2e33" stroke="#111" stroke-width="2"/>`;
  s += `<rect x="${cx - A.L * k / 2}" y="${cy - A.H * k / 2}" width="${A.L * k}" height="${A.H * k}" rx="5" fill="#0d0e10"/>`;
  s += `<rect x="${cx - A.L * k * 0.2}" y="${cy - A.H * k / 2 - 16}" width="${A.L * k * 0.4}" height="10" rx="3" fill="#2b2e33" stroke="#111"/>`;       // clema
  s += `<rect x="${cx - A.L * k / 2}" y="${cy - 9}" width="8" height="18" fill="#2b2e33"/>`;                                                      // codificare
  A.p.forEach(([px, pz], i) => {
    const x = cx + px * k, y = cy + pz * k, c = culoriFir(pini[i][2]);
    s += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="#d8b25a" stroke="#7a5a1a"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a1a">${pini[i][0]}</text>`;
    if (c.length) { const rand = Math.round((pz - A.p[0][1]) / 4.6), nr = Math.round(A.H / 4.6 - 0.9), xf = x + (nr > 1 ? (rand - (nr - 1) / 2) * 7 : 0); s += `<line x1="${xf}" y1="${cy + A.H * k / 2 + 6}" x2="${xf}" y2="${H - 6}" stroke="${c[0]}" stroke-width="5" stroke-linecap="round"/>`; if (c[1]) s += `<line x1="${xf}" y1="${cy + A.H * k / 2 + 6}" x2="${xf}" y2="${H - 6}" stroke="${c[1]}" stroke-width="2" stroke-dasharray="4 4"/>`; }
  });
  return s + `</svg>`;
}

/* ================================================================== bancul de verificare animat (canvas) */
const W = 720, H = 300;
function fmtVal(t, v) {
  if (t.ap === "ohm") { if (!isFinite(v)) return ["OL", "MΩ"]; if (v >= 1e6) return [virg(v / 1e6, 2), "MΩ"]; if (v >= 1000) return [virg(v / 1000, v >= 1e4 ? 1 : 2), "kΩ"]; return [virg(v, v < 10 ? 2 : 1), "Ω"]; }
  if (t.ap === "v") return [virg(v, t.dec ?? 2), "V"];
  if (t.ap === "ma") return v >= 1000 ? [virg(v / 1000, 2), "A"] : [virg(v, 1), "mA"];
  return [String(v), ""];
}
class Banc {
  constructor(cv, test, pini) { this.cv = cv; this.t = test; this.pini = pini; this.d = 0; this.t0 = performance.now(); }
  stare(d) { this.d = d; this.t0 = performance.now(); }
  stim(now) { const st = this.t.stim; if (!st) return { s: 0.5, txt: "" }; const u = fr(now / 10000); let s = u < 0.5 ? u * 2 : 2 - u * 2; s = Math.max(0, Math.min(1, s * 1.15 - 0.075)); const v = st.a + (st.b - st.a) * s; return { s, txt: `${st.n}: ${st.u ? virg(v, Math.abs(st.b - st.a) < 10 ? 1 : 0) + " " + st.u : ""}` }; }
  pozPin(id, A, cx, cy, k) {
    const i = this.pini.findIndex(p => String(p[0]) === String(id));
    if (i >= 0) return [cx + A.p[i][0] * k, cy + A.p[i][1] * k];
    return null;
  }
  deseneaza(now, culText) {
    const cv = this.cv, dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || W, sc = w / W;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(H * sc * dpr); cv.style.height = Math.round(H * sc) + "px"; }
    const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0); g.clearRect(0, 0, W, H);
    const T = this.t, d = this.d, { s, txt } = this.stim(now), apr = Math.min(1, (now - this.t0) / 900), e = apr * apr * (3 - 2 * apr);
    g.font = "12px system-ui,sans-serif"; g.textBaseline = "middle";
    // --- stimul
    if (T.stim) { g.fillStyle = culText; g.fillText(txt, 20, 280); g.fillStyle = "rgba(127,127,127,.25)"; g.fillRect(330, 274, 370, 12); g.fillStyle = "#f08c00"; g.fillRect(330, 274, 370 * s, 12); }
    // --- partea vehiculului: mufa sau priza OBD
    const terminale = {};
    if (T.ap === "tester") {
      g.fillStyle = "#2b2e33"; g.beginPath(); g.roundRect(70, 110, 120, 60, 10); g.fill(); g.fillStyle = "#0d0e10"; g.fillRect(82, 122, 96, 36);
      for (let i = 0; i < 16; i++) { g.fillStyle = "#d8b25a"; g.fillRect(88 + (i % 8) * 11, 128 + Math.floor(i / 8) * 14, 6, 8); }
      g.fillStyle = culText; g.fillText("Priza de diagnoză OBD (16 pini)", 52, 190);
      terminale.obd = [190, 140];
    } else {
      const A = asezarePini(this.pini.length), k = Math.min(13, 200 / (A.L || 1), 120 / (A.H || 1)), cx = 150, cy = 112;
      const eticheta = { deconectat: "Mufa decuplată – pinii senzorului", conectat: "Mufa cuplată – sonde prin spatele mufei", cablaj: "Mufa decuplată – partea cablajului, contact pus", serie: "Aparatul înseriat în circuit" }[T.mufa] || "";
      g.fillStyle = culText; g.fillText(eticheta, 20, 18);
      if (A.p.length) {
        g.fillStyle = "#2b2e33"; g.beginPath(); g.roundRect(cx - A.L * k / 2 - 6, cy - A.H * k / 2 - 6, A.L * k + 12, A.H * k + 12, 9); g.fill();
        g.fillStyle = "#0d0e10"; g.fillRect(cx - A.L * k / 2, cy - A.H * k / 2, A.L * k, A.H * k);
        A.p.forEach(([px, pz], i) => { const x = cx + px * k, y = cy + pz * k; const activ = [...(T.pini || []), ...(T.pini2 || [])].some(q => String(q) === String(this.pini[i][0]));
          g.fillStyle = activ ? "#ffd23f" : "#d8b25a"; g.fillRect(x - 6, y - 6, 12, 12); g.fillStyle = "#111"; g.font = "bold 10px system-ui"; g.textAlign = "center"; g.fillText(this.pini[i][0], x, y + 0.5); g.textAlign = "left"; g.font = "12px system-ui,sans-serif";
          const c = culoriFir(this.pini[i][2]); if (c.length && T.mufa !== "cablaj") { g.strokeStyle = c[0]; g.lineWidth = 4; g.beginPath(); g.moveTo(x, cy + A.H * k / 2 + 6); g.bezierCurveTo(x, cy + A.H * k / 2 + 40, x + (i - A.p.length / 2) * 6, 200, x + (i - A.p.length / 2) * 8, 228); g.stroke(); } });
        if (T.mufa !== "cablaj") { g.fillStyle = culText; g.fillText(T.mufa === "deconectat" ? "spre senzor" : "spre ECU (cablaj)", cx - 40, 240); }
      }
      // terminale exterioare (masă, rezistor de măsură, alt senzor)
      [...(T.pini || []), ...(T.pini2 || [])].forEach((p, j) => {
        if (this.pozPin(p, A, cx, cy, k) || terminale[p]) return;
        const x = 30 + Object.keys(terminale).length * 95, y = 215;
        g.strokeStyle = culText; g.fillStyle = culText; g.lineWidth = 1.5;
        if (/^mas|șasiu/.test(p)) { g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.moveTo(x - 6, y + 4); g.lineTo(x + 6, y + 4); g.moveTo(x - 2, y + 8); g.lineTo(x + 2, y + 8); g.moveTo(x, y); g.lineTo(x, y - 8); g.stroke(); g.fillText(p === "masa" ? "masă" : p, x + 14, y + 2); }
        else if (p === "rez") { g.strokeRect(x - 12, y - 6, 24, 12); g.fillText("115 Ω", x + 16, y); }
        else { g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); g.fillText(p, x + 10, y); }
        terminale[p] = [x, y - 8];
      });
      this._A = [A, cx, cy, k];
    }
    const tinta = p => { if (terminale[p]) return terminale[p]; const [A, cx, cy, k] = this._A; return this.pozPin(p, A, cx, cy, k) || [cx, cy]; };
    const sonda = (din, la, cul, groasa) => { const x = din[0] + (la[0] - din[0]) * e, y = din[1] + (la[1] - din[1]) * e; g.strokeStyle = cul; g.lineWidth = groasa ? 4 : 2.5; g.beginPath(); g.moveTo(din[0], din[1]); g.bezierCurveTo(din[0] - 60, din[1] + 40, x + 40, y + 90, x, y + 14); g.stroke(); g.fillStyle = cul; g.beginPath(); g.moveTo(x - 3, y + 14); g.lineTo(x, y + 2); g.lineTo(x + 3, y + 14); g.fill(); };
    // --- aparatul
    if (T.ap === "ohm" || T.ap === "v" || T.ap === "ma") {
      const X = 470, Y = 22;
      g.fillStyle = "#f2c230"; g.beginPath(); g.roundRect(X, Y, 170, 230, 16); g.fill(); g.fillStyle = "#2b2e33"; g.beginPath(); g.roundRect(X + 10, Y + 10, 150, 210, 10); g.fill();
      g.fillStyle = "#b9c9a8"; g.fillRect(X + 22, Y + 22, 126, 56);
      let v = T.val(s, d); if (e < 1) v = NaN; const [txtV, u] = isNaN(v) ? ["- - - -", ""] : fmtVal(T, v);
      g.fillStyle = "#1c2416"; g.font = "bold 30px ui-monospace,Consolas,monospace"; g.textAlign = "right"; g.fillText(txtV, X + 128, Y + 52); g.font = "13px system-ui"; g.fillText(u, X + 145, Y + 66); g.textAlign = "left";
      g.font = "11px system-ui"; g.fillStyle = "#ddd"; g.fillText(T.apN || (T.ap === "ohm" ? "Ω  ohmmetru" : T.ap === "v" ? "V⎓  voltmetru" : "mA  ampermetru"), X + 26, Y + 92);
      g.strokeStyle = "#999"; g.lineWidth = 3; g.beginPath(); g.arc(X + 85, Y + 140, 30, 0, 7); g.stroke(); const ua = T.ap === "ohm" ? -0.4 : T.ap === "v" ? -2.4 : 0.8; g.beginPath(); g.moveTo(X + 85, Y + 140); g.lineTo(X + 85 + 26 * Math.cos(ua), Y + 140 + 26 * Math.sin(ua)); g.stroke();
      const jR = [X + (T.ap === "ma" ? 40 : 130), Y + 200], jC = [X + 85, Y + 200];
      [[X + 40, "mA", "#c33"], [X + 85, "COM", "#222"], [X + 130, "VΩ", "#c33"]].forEach(([x, t2, c]) => { g.fillStyle = "#111"; g.beginPath(); g.arc(x, Y + 200, 8, 0, 7); g.fill(); g.strokeStyle = c; g.lineWidth = 2; g.stroke(); g.fillStyle = "#ccc"; g.font = "9px system-ui"; g.textAlign = "center"; g.fillText(t2, x, Y + 185); g.textAlign = "left"; });
      sonda(jR, tinta(T.pini[0]), "#d42a2a"); sonda(jC, tinta(T.pini[1]), "#222");
    } else if (T.ap === "osc") {
      const X = 330, Y = 10, Wd = 370, Hd = 236;
      g.fillStyle = "#2b2e33"; g.beginPath(); g.roundRect(X - 10, Y - 4, Wd + 20, Hd + 12, 10); g.fill();
      g.fillStyle = "#07120d"; g.fillRect(X, Y, Wd, Hd - 18);
      g.strokeStyle = "rgba(120,200,160,.18)"; g.lineWidth = 1; for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(X + i * Wd / 10, Y); g.lineTo(X + i * Wd / 10, Y + Hd - 18); g.stroke(); } for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(X, Y + j * (Hd - 18) / 8); g.lineTo(X + Wd, Y + j * (Hd - 18) / 8); g.stroke(); }
      const per = typeof T.sc.per === "function" ? T.sc.per(s) : T.sc.per, [v0, v1] = T.sc.v, t = now / 1000;
      const T0 = T.sc.roll ? t - per : Math.floor(t * 4) / 4 - per * 0 ;
      const N = 900, y = v => Y + (Hd - 18) * (1 - (v - v0) / (v1 - v0));
      if (e >= 1) {
        const ch = [[], []]; for (let i = 0; i <= N; i++) { const tt = T0 + per * i / N; let r = T.unda(tt, T.sc.roll ? this.stim(tt * 1000).s : s, d); if (!Array.isArray(r)) r = [r]; r.forEach((q, c) => ch[c].push([X + Wd * i / N, y(typeof q === "boolean" ? +q : q)])); }
        [["#ffd23f", ch[0]], ["#3fd0ff", ch[1]]].forEach(([c, P]) => { if (!P.length) return; g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); P.forEach(([px, py], i) => { const yy = Math.max(Y, Math.min(Y + Hd - 18, py)); i ? g.lineTo(px, yy) : g.moveTo(px, yy); }); g.stroke(); });
      }
      g.fillStyle = "#9fe6c0"; g.font = "11px system-ui"; g.fillText(T.sc.div || "", X + 4, Y + Hd - 8);
      g.fillStyle = "#ffd23f"; g.fillText("CH1", X + Wd - 70, Y + Hd - 8); if (T.pini2) { g.fillStyle = "#3fd0ff"; g.fillText("CH2", X + Wd - 36, Y + Hd - 8); }
      sonda([X - 4, Y + 60], tinta(T.pini[0]), "#e0b400"); if (T.pini2) sonda([X - 4, Y + 110], tinta(T.pini2[0]), "#00a8d8");
      if (T.pini[1] && T.pini[1] !== "masa") sonda([X - 4, Y + 160], tinta(T.pini[1]), "#222"); else if (terminale.masa) sonda([X - 4, Y + 160], terminale.masa, "#222");
    } else if (T.ap === "tester") {
      const X = 370, Y = 14;
      g.fillStyle = "#1f2a36"; g.beginPath(); g.roundRect(X, Y, 330, 240, 14); g.fill(); g.fillStyle = "#0e1620"; g.fillRect(X + 12, Y + 12, 306, 216);
      g.fillStyle = "#4da3ff"; g.font = "bold 12px system-ui"; g.fillText("Date live", X + 22, Y + 28);
      if (e >= 1) T.randuri.forEach(([et, f], i) => { const yy = Y + 52 + i * 26; g.fillStyle = "#9fb3c8"; g.font = "12px system-ui"; g.fillText(et, X + 22, yy); g.fillStyle = "#e9f2ff"; g.font = "bold 12px ui-monospace,Consolas,monospace"; g.textAlign = "right"; g.fillText(String(f(s, d)).replace(/(\d)\.(\d)/g, "$1,$2"), X + 306, yy); g.textAlign = "left"; g.strokeStyle = "rgba(255,255,255,.06)"; g.beginPath(); g.moveTo(X + 22, yy + 12); g.lineTo(X + 306, yy + 12); g.stroke(); });
      const dtc = T.dtc[d] || ""; g.font = "12px system-ui"; g.fillStyle = dtc ? "#ff6b6b" : "#6bdc8b"; g.fillText(dtc ? "DTC " + dtc : "Fără coduri de defect memorate", X + 22, Y + 214);
      g.strokeStyle = "#444"; g.lineWidth = 5; g.beginPath(); g.moveTo(terminale.obd[0], terminale.obd[1]); g.bezierCurveTo(260, 140, 300, 200, X, Y + 180); g.stroke();
    }
  }
}

/* ================================================================== interfața */
export function creeaza(gazda, optiuni = {}) {
  const C = CAT();
  if (!C) { gazda.innerHTML = `<p class="nota">Catalogul senzorilor nu este încărcat.</p>`; return; }
  const optg = C.GRUPE.map(gr => `<optgroup label="${esc(gr)}">${C.LISTA.filter(x => x.sistem === gr && SENZORI[x.id]).map(x => `<option value="${x.id}">${esc(x.n)}</option>`).join("")}</optgroup>`).join("");
  gazda.innerHTML = `<div class="sz">
    <div class="sz-bara"><label>Senzorul <select class="sz-sel">${optg}</select></label><span class="nota">sau clic pe un senzor în machetă (senzorii fără loc în machetă se aleg din listă)</span></div>
    <div class="sz-grila">
      <div class="sz-masina"><p class="nota">Se încarcă macheta…</p></div>
      <div class="sz-detalii">
        <h3 class="sz-nume"></h3><p class="sz-sist nota"></p>
        <div class="sz-3d"><canvas aria-label="Modelul 3D al senzorului"></canvas><span class="sz-ajutor">trageți = rotire · rotița = zoom</span></div>
        <p class="sz-princ"></p>
        <h4>Mufa și pin-out-ul</h4>
        <div class="sz-mufa"></div>
        <div class="tabel-scroll"><table class="tabel sz-pini"></table></div>
        <p class="nota">Pin-out tipic (exemplu Bosch / Continental / VAG). Numerotarea și culorile firelor se iau întotdeauna din schema electrică a modelului reparat.</p>
      </div>
    </div>
    <h3>Verificarea senzorului</h3>
    <div class="sz-teste"></div>
  </div>`;
  const $ = s => gazda.querySelector(s), sel = $(".sz-sel");

  /* --- vizualizatorul 3D al senzorului */
  const cv3 = $(".sz-3d canvas");
  const ren = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); ren.outputColorSpace = THREE.SRGBColorSpace; ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.1; ren.shadowMap.enabled = true;
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 1, 5000), ctl = new OrbitControls(cam, cv3);
  ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2;
  sc.add(new THREE.HemisphereLight(0xf2f6ff, 0x50545a, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(200, 400, 250); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sc.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.8); fill.position.set(-300, 100, -200); sc.add(fill);
  { const pm = new THREE.PMREMGenerator(ren), s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: "varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}", fragmentShader: "varying vec3 p; void main(){float h=normalize(p).y; vec3 c=mix(vec3(.3,.31,.33),vec3(1.,1.,1.02),smoothstep(-.2,.5,h)); c+=vec3(.6)*smoothstep(.85,.95,normalize(p).x); gl_FragColor=vec4(c,1.);}" })));
    sc.environment = pm.fromScene(s, 0.04).texture; }
  const sol = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.ShadowMaterial({ opacity: 0.25 })); sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; sc.add(sol);
  let model = null, animM = [];
  function puneModel(id) {
    if (model) { sc.remove(model); model.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const D = SENZORI[id]; const { grup, anim } = construiesteModel(D.m[0], D.m[1] || {}, D.pini.length); model = grup; animM = anim; sc.add(model);
    const bb = new THREE.Box3().setFromObject(model), c = bb.getCenter(new THREE.Vector3()), r = bb.getSize(new THREE.Vector3()).length() / 2;
    model.position.sub(c); sol.position.y = bb.min.y - c.y - 0.5; sol.scale.setScalar(r * 1.6);
    Object.assign(sun.shadow.camera, { left: -r * 2, right: r * 2, top: r * 2, bottom: -r * 2, near: 1, far: r * 20 }); sun.shadow.camera.updateProjectionMatrix(); sun.position.set(r * 2, r * 4, r * 2.5);
    cam.position.set(r * 2.2, r * 1.5, r * 2.8); cam.near = r / 50; cam.far = r * 40; cam.updateProjectionMatrix(); ctl.target.set(0, 0, 0); ctl.minDistance = r * 1.2; ctl.maxDistance = r * 8;
  }

  /* --- alegerea senzorului */
  let banci = [];
  function alege(id, dinLista) {
    const x = C.dupaId[id], D = SENZORI[id]; if (!x || !D) return;
    sel.value = id;
    $(".sz-nume").textContent = x.n; $(".sz-sist").textContent = `${x.sistem} · semnal: ${C.TIPURI[x.tip].n}`;
    $(".sz-princ").innerHTML = `<b>Principiu:</b> ${esc(x.princ)}. <b>Valori tipice:</b> ${esc(x.val)}.`;
    puneModel(id);
    $(".sz-mufa").innerHTML = svgMufa(D.pini);
    $(".sz-pini").innerHTML = D.pini.length ? `<thead><tr><th>Pin</th><th>Funcția</th><th>Fir (tipic)</th><th>Valoare / legătura</th></tr></thead><tbody>${D.pini.map(p => `<tr><td><b>${p[0]}</b></td><td>${esc(p[1])}</td><td>${culoriFir(p[2]).map(c => `<span class="sz-fir" style="background:${c}"></span>`).join("")} ${esc(p[2])}</td><td>${esc(p[3])}</td></tr>`).join("")}</tbody>` : "";
    const zona = $(".sz-teste");
    zona.innerHTML = D.teste.map((t, i) => `<div class="card sz-test"><h4>Verificarea ${i + 1}. ${esc(t.t)}</h4><p class="sz-pasi"><b>Procedură:</b> ${esc(t.pasi)}</p>
      <div class="sz-stari" role="group" aria-label="Starea senzorului">${t.def.map((q, j) => `<button type="button" data-st="${j}" class="${j ? "" : "activ"}">${j ? "Defect: " : ""}${esc(q[0])}</button>`).join("")}</div>
      <canvas class="sz-banc" aria-label="Animația verificării"></canvas><p class="sz-concl"><b>${esc(t.def[0][0])}:</b> ${esc(t.def[0][1])}</p></div>`).join("");
    banci = [...zona.querySelectorAll(".sz-test")].map((el, i) => {
      const b = new Banc(el.querySelector("canvas"), D.teste[i], D.pini);
      el.querySelectorAll("[data-st]").forEach(bt => bt.addEventListener("click", () => { const j = +bt.dataset.st; b.stare(j); el.querySelectorAll("[data-st]").forEach(z => z.classList.toggle("activ", z === bt)); el.querySelector(".sz-concl").innerHTML = `<b>${esc(D.teste[i].def[j][0])}:</b> ${esc(D.teste[i].def[j][1])}`; }));
      return b;
    });
    if (dinLista && v3d && x.k) v3d.selecteaza(x.k);
  }
  sel.addEventListener("change", () => alege(sel.value, true));

  /* --- macheta autoturismului (sistemul „senzori” în modul catalog) */
  let v3d = null;
  import("./vehicul3d.js?v=31").then(m => { v3d = m.creeaza($(".sz-masina"), { sistem: "senzori", catalog: true, laSelectare: k => { const x = C.dupaK[k]; if (x) alege(x.id, false); } }); })
    .catch(e => { $(".sz-masina").innerHTML = `<p class="nota">Macheta nu a putut fi încărcată (${esc(e.message)}).</p>`; });

  alege(optiuni.initial || "ckp", false);

  /* --- bucla de animație (doar când tabul este vizibil) */
  let raf = 0, tp = performance.now();
  function bucla(now) {
    raf = requestAnimationFrame(bucla);
    if (!gazda.getClientRects().length) return;
    const dt = (now - tp) / 1000; tp = now;
    const w = cv3.clientWidth, h = cv3.clientHeight; if (w && (cv3.width !== Math.round(w * ren.getPixelRatio()) || cv3.height !== Math.round(h * ren.getPixelRatio()))) { ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    animM.forEach(f => f(now / 1000)); ctl.update(); ren.render(sc, cam);
    const cul = getComputedStyle(gazda).color;
    banci.forEach(b => { const r = b.cv.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) b.deseneaza(now, cul); });
    void dt;
  }
  raf = requestAnimationFrame(bucla);
  return { alege, banci: () => banci, distruge() { cancelAnimationFrame(raf); ren.dispose(); v3d?.distruge(); } };
}
