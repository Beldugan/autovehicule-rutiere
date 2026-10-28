/* Post-procesarea 3D a câmpurilor calculate de solverele modulului F (în maniera post-procesoarelor CFD):
   • cilindruCFD – domeniul de calcul din cilindru: rețeaua de suprafață a chiulasei, a canalelor și a supapelor (închise),
     planul de secțiune cu rețeaua de volume finite și contururile mărimii alese (p, T, u), vectorii vitezei, pistonul mobil;
   • placaCFD – placa de răcire a bateriei: placa inferioară, câmpul de temperatură al plăcii (cu rețeaua), canalele în serpentină
     colorate după temperatura lichidului, racordurile de intrare și ieșire, modulele bateriei, capacul transparent. */
import { THREE, V3, turboColor, matCAE, matCarcasa, contur, sageata } from "./scena.js";

const mRetea = (culoare = 0x2b6f8f, op = 1) => new THREE.MeshStandardMaterial({ color: culoare, roughness: 0.6, metalness: 0.1, transparent: op < 1, opacity: op, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
/** suprafață „cu rețea” (ca în pre-procesoarele CFD): fețele colorate + muchiile celulelor */
function cuRetea(geo, culoare, culLinie = 0x0f2f3f, op = 1) {
  const m = new THREE.Mesh(geo, mRetea(culoare, op)); m.userData.faraCadru = false;
  const l = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: culLinie, transparent: true, opacity: 0.55 })); l.userData.faraCadru = true; m.add(l); return m;
}

/* ------------------------------------------------------------------ cilindrul */
export function cilindruCFD(o) {
  const G = new THREE.Group(), D = o.D, R = o.S / 2, L = o.L, Vc = (Math.PI * D * D / 4) * o.S / (o.eps - 1), hc = Vc / (Math.PI * D * D / 4);
  const yTDC = R + L, yHead = yTDC + hc, Nr = o.Nr || 8;
  // chiulasa (fața camerei), canalele de admisie și de evacuare cu supapele închise – rețea de suprafață
  const fata = cuRetea(new THREE.CircleGeometry(D / 2, 48, 0, Math.PI * 2).rotateX(Math.PI / 2), 0x2b6f8f); fata.position.y = yHead; G.add(fata);
  const canal = (sg, cul) => { const pts = [V3(sg * 0.2 * D, yHead + 0.02 * D, 0), V3(sg * 0.25 * D, yHead + 0.5 * D, 0), V3(sg * 0.65 * D, yHead + 0.95 * D, 0), V3(sg * 1.3 * D, yHead + 1.15 * D, 0)];
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.16 * D, 18, false); const m = cuRetea(g, cul, 0x1a1a1a, 0.95); G.add(m);
    const sup = cuRetea(new THREE.CylinderGeometry(0.16 * D, 0.12 * D, 0.04 * D, 32, 2), 0xd06a1c); sup.position.set(sg * 0.2 * D, yHead + 0.02 * D, 0); G.add(sup);
    const tija = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * D, 0.025 * D, 0.9 * D, 10), matCAE(0x8a95a0)); tija.position.set(sg * 0.2 * D, yHead + 0.47 * D, 0); G.add(tija); };
  canal(1, 0x3b82f6); canal(-1, 0xc8382c);
  const buj = cuRetea(new THREE.CylinderGeometry(0.06 * D, 0.06 * D, 0.5 * D, 16, 3), 0xe0c050); buj.position.set(0, yHead + 0.25 * D, 0.15 * D); G.add(buj);
  // cămașa cilindrului (carcasă: transparentă / secționată)
  const lin = contur(new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 1.12, D / 2 * 1.12, o.S + hc + 0.1 * D, 64, 1, true), matCarcasa(0xcfd4d9)), 30, 0.4); lin.position.y = yHead - (o.S + hc + 0.1 * D) / 2; G.add(lin);
  // pistonul
  const piston = contour(new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 0.99, D / 2 * 0.99, 0.5 * D, 64), matCAE(0xf07c1c))); G.add(piston);
  // domeniul gazului: suprafața laterală (semi-transparentă) și planul de secțiune x–y cu rețeaua
  const lat = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 0.995, D / 2 * 0.995, 1, 64, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); lat.userData.faraCadru = true; G.add(lat);
  let plan = null, linii = null, Nax = 0;
  const sageti = []; for (let k = 0; k < 7; k++) { const s = sageata(0x111827, 0.01 * D); s.userData.faraCadru = true; G.add(s); sageti.push(s); }
  function retea(N) {
    if (plan) { G.remove(plan, linii); plan.geometry.dispose(); linii.geometry.dispose(); }
    Nax = N; const g = new THREE.PlaneGeometry(D, 1, Nr * 2, N); g.translate(0, 0.5, 0);
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    plan = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); plan.userData.faraCadru = true; G.add(plan);
    linii = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: 0x0b1620, transparent: true, opacity: 0.45 })); linii.userData.faraCadru = true; G.add(linii);
    const lc = lat.geometry; if (!lc.attributes.color) lc.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(lc.attributes.position.count * 3), 3));
  }
  retea(o.N || 20);
  const col = new THREE.Color();
  /** yB = poziția bolțului (din cinematica exactă); camp = { valori pe celule de la chiulasă (0) la piston (N−1) }, vmin, vmax; u = viteza pe celule */
  function pozeaza(alfa, camp, vmin, vmax, u, scU) {
    const a = alfa * Math.PI / 180, yB = R * Math.cos(a) + Math.sqrt(L * L - (R * Math.sin(a)) ** 2), top = yB + (yHead - yTDC) * 0 + 0.0;
    const yP = top, h = yHead - yP; piston.position.y = yP - 0.25 * D;
    [plan, linii].forEach((m) => { m.scale.y = h; m.position.y = yP; });
    lat.scale.y = h; lat.position.y = yP + h / 2;
    const N = camp.length, val = (y01) => { const c = Math.min(N - 1, Math.max(0, Math.floor((1 - y01) * N))); return camp[c]; };
    const pc = plan.geometry.attributes.position, cc = plan.geometry.attributes.color;
    for (let j = 0; j < pc.count; j++) { const y = pc.getY(j); turboColor((val(y) - vmin) / Math.max(1e-12, vmax - vmin), col); cc.setXYZ(j, col.r, col.g, col.b); }
    cc.needsUpdate = true;
    const pl = lat.geometry.attributes.position, cl = lat.geometry.attributes.color;
    for (let j = 0; j < pl.count; j++) { const y = pl.getY(j) + 0.5; turboColor((val(y) - vmin) / Math.max(1e-12, vmax - vmin), col); cl.setXYZ(j, col.r, col.g, col.b); }
    cl.needsUpdate = true;
    sageti.forEach((s, k) => { const y01 = (k + 0.5) / sageti.length, c = Math.min(N - 1, Math.floor((1 - y01) * N)), uu = u ? u[c] : 0; s.seteaza(V3(-D * 0.28 + (k % 2) * D * 0.56, yP + y01 * h, 0.001), V3(0, -1, 0), -uu * scU); });
  }
  return { G, pozeaza, retea, yHead, hc };
}
function contour(m) { return contur(m, 30, 0.35); }

/* ------------------------------------------------------------------ placa de răcire */
export function placaCFD(rz, o) {
  const G = new THREE.Group(), { nx, ny } = rz, Lx = o.Lx, Ly = o.Ly, t = o.t;
  // placa inferioară (suport), placa de răcire cu câmpul de temperatură, capacul transparent
  const baza = contur(new THREE.Mesh(new THREE.BoxGeometry(Lx * 1.08, 0.006, Ly * 1.1), matCAE(0x9aa1a8, { metalness: 0.5 })), 30, 0.5); baza.position.y = -0.045; G.add(baza);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 20), matCAE(0x3a3f45)); g.position.set(a * Lx * 0.5, -0.04, b * Ly * 0.52); G.add(g); });
  const gp = new THREE.PlaneGeometry(Lx, Ly, nx, ny); gp.rotateX(-Math.PI / 2);
  gp.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(gp.attributes.position.count * 3), 3));
  const placa = new THREE.Mesh(gp, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })); G.add(placa);
  const linii = new THREE.LineSegments(new THREE.WireframeGeometry(gp), new THREE.LineBasicMaterial({ color: 0x0b1620, transparent: true, opacity: 0.25 })); linii.userData.faraCadru = true; G.add(linii);
  const corp = contur(new THREE.Mesh(new THREE.BoxGeometry(Lx * 1.04, t * 3, Ly * 1.06), matCarcasa(0xb9c1c9)), 30, 0.5); corp.position.y = -t * 1.6; G.add(corp);
  const capac = contur(new THREE.Mesh(new THREE.BoxGeometry(Lx * 1.08, 0.006, Ly * 1.1), matCarcasa(0xe6eaee)), 30, 0.5); capac.position.y = 0.11; G.add(capac);
  // modulele bateriei (carcase)
  const mods = o.module || { nx: 4, ny: 2 };
  for (let a = 0; a < mods.nx; a++) for (let b = 0; b < mods.ny; b++) { const m = contur(new THREE.Mesh(new THREE.BoxGeometry(Lx / mods.nx * 0.86, 0.09, Ly / mods.ny * 0.86), matCarcasa(0x8fa6bd)), 30, 0.45); m.position.set(-Lx / 2 + (a + 0.5) * Lx / mods.nx, 0.05, -Ly / 2 + (b + 0.5) * Ly / mods.ny); G.add(m); }
  // canalul în serpentină, colorat după temperatura lichidului
  const dx = Lx / nx, dy = Ly / ny, pts = rz.drum.map((s) => { let zc = 0; s.cel.forEach((c) => (zc += Math.floor(c / nx))); zc /= s.cel.length; return V3(-Lx / 2 + (s.i + 0.5) * dx, -0.012, -Ly / 2 + (zc + 0.5) * dy); });
  const cur = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05), seg = Math.min(1200, pts.length * 2), tub = new THREE.TubeGeometry(cur, seg, Math.max(0.006, o.lc * 0.35), 10, false);
  tub.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(tub.attributes.position.count * 3), 3));
  const canal = new THREE.Mesh(tub, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1 })); G.add(canal);
  // racordurile: intrare (rece, albastru) și ieșire (cald, portocaliu)
  const p0 = pts[0], p1 = pts[pts.length - 1];
  [[p0, 0x2f7de1, "in"], [p1, 0xf07c1c, "out"]].forEach(([p, c]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 20), matCAE(c)); r.position.set(p.x, p.y + 0.16, p.z); G.add(r);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 24), matCAE(0x9aa1a8)); f.position.set(p.x, 0.115, p.z); G.add(f); });
  const col = new THREE.Color();
  function coloreaza(z, Tmin, Tmax) {
    const pc = gp.attributes.position, cc = gp.attributes.color;
    for (let j = 0; j < pc.count; j++) { const x = pc.getX(j), zz = pc.getZ(j), i = Math.min(nx - 1, Math.max(0, Math.floor((x + Lx / 2) / dx))), k = Math.min(ny - 1, Math.max(0, Math.floor((zz + Ly / 2) / dy)));
      turboColor((z.T[k * nx + i] - Tmin) / Math.max(1e-9, Tmax - Tmin), col); cc.setXYZ(j, col.r, col.g, col.b); }
    cc.needsUpdate = true;
    const tc = tub.attributes.color, n = tub.parameters.tubularSegments, rs = tub.parameters.radialSegments;
    for (let a = 0; a <= n; a++) { const s = a / n, j = Math.min(z.Tf.length - 1, Math.round(s * (z.Tf.length - 1))), Tf = z.Tf[j];
      turboColor((Tf - Tmin) / Math.max(1e-9, Tmax - Tmin), col); for (let b = 0; b <= rs; b++) tc.setXYZ(a * (rs + 1) + b, col.r, col.g, col.b); }
    tc.needsUpdate = true;
  }
  return { G, coloreaza, linii, canal, intrare: p0, iesire: p1 };
}
