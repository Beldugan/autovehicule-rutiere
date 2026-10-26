/* Motor 3D: motorul K7J 1.4 MPI (8 supape, transversal) cu senzorii și actuatorii lui, construit procedural cu materiale PBR.
   Folosit (1) ca stand de laborator în simulatorul lucrărilor de diagnoză și (2) montat în autovehiculul 3D.
   Sistemul de coordonate al motorului: x = axa arborelui cotit (+x = partea distribuției), y = în sus, z = +admisie / −evacuare. Unități: metri. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

export const MAT = () => fixEnv({
  fonta: new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.82, metalness: 0.45 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xb7bcc2, roughness: 0.42, metalness: 0.85 }),
  aluMat: new THREE.MeshStandardMaterial({ color: 0x9da3aa, roughness: 0.65, metalness: 0.7 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.55, metalness: 0.05 }),
  plasticGri: new THREE.MeshStandardMaterial({ color: 0x5c626a, roughness: 0.5, metalness: 0.05 }),
  cauciuc: new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.92, metalness: 0 }),
  crom: new THREE.MeshStandardMaterial({ color: 0xe4e8ec, roughness: 0.14, metalness: 1 }),
  otel: new THREE.MeshStandardMaterial({ color: 0x8a9199, roughness: 0.35, metalness: 0.95 }),
  rugina: new THREE.MeshStandardMaterial({ color: 0x6e4429, roughness: 0.9, metalness: 0.35 }),
  ruginaCald: new THREE.MeshStandardMaterial({ color: 0x6e4429, roughness: 0.9, metalness: 0.35, emissive: 0xff3a00, emissiveIntensity: 0 }),
  alama: new THREE.MeshStandardMaterial({ color: 0xc9a043, roughness: 0.3, metalness: 1 }),
  galben: new THREE.MeshStandardMaterial({ color: 0xe9c234, roughness: 0.45, metalness: 0.05 }),
  verde: new THREE.MeshStandardMaterial({ color: 0x2c7a3a, roughness: 0.45, metalness: 0.05 }),
  albastru: new THREE.MeshStandardMaterial({ color: 0x1f4f9a, roughness: 0.45, metalness: 0.1 }),
  violet: new THREE.MeshStandardMaterial({ color: 0x6b3a8c, roughness: 0.5, metalness: 0.05 }),
  stand: new THREE.MeshStandardMaterial({ color: 0x23406e, roughness: 0.5, metalness: 0.35 }),
  scut: new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide }),
  lichid: new THREE.MeshPhysicalMaterial({ color: 0x9be36b, roughness: 0.1, transmission: 0.5, transparent: true, opacity: 0.75 }),
  baterie: new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.6 }),
  cupru: new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.35, metalness: 1 })
});

function fixEnv(o) { Object.values(o).forEach(m => { m.envMapIntensity = 0.55; }); return o; }
/** funcțiile de construcție (corpuri simple) legate de grupul g */
function ajutoare(g) {
  const add = (o, p = g) => { o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const box = (w, h, d, m, x, y, z, p) => { const o = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), p); o.position.set(x, y, z); return o; };
  const rbox = (w, h, d, r, m, x, y, z, p) => { const o = add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m), p); o.position.set(x, y, z); return o; };
  const cyl = (r1, r2, h, m, x, y, z, ax = "y", p, seg = 32) => { const o = add(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m), p); o.position.set(x, y, z); if (ax === "x") o.rotation.z = Math.PI / 2; if (ax === "z") o.rotation.x = Math.PI / 2; return o; };
  const tub = (pts, r, m, p, seg) => { const c = new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v)), false, "catmullrom", 0.3); return add(new THREE.Mesh(new THREE.TubeGeometry(c, seg || Math.max(24, pts.length * 12), r, 12, false), m), p); };
  return { add, box, rbox, cyl, tub };
}

/** transmisia accesoriilor (cureaua Poly-V): fulia arborelui cotit cu amortizor, rola întinzătoare automată, alternatorul, pompa de apă.
   Coordonate locale ca ale motorului: x = axa arborelui cotit (planul curelei la x = XP), y = în sus, z = +admisie; originea pe axa arborelui cotit.
   roteste(d): rotește ansamblul când arborele cotit se rotește cu unghiul d [rad]. */
export function transmisieAccesorii(opt = {}) {
  const M = opt.M || MAT(), g = new THREE.Group(), rot = {};
  const { add, box, rbox, cyl, tub } = ajutoare(g);
  const XP = 0.315;                                                              // planul curelei de accesorii
  const MP = { fulie: new THREE.MeshStandardMaterial({ color: 0x70757d, roughness: 0.42, metalness: 0.8 }), damper: new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.95 }),
    curea: new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.82, metalness: 0 }), alu: new THREE.MeshStandardMaterial({ color: 0xc3c8cd, roughness: 0.38, metalness: 0.9 }),
    aluCast: new THREE.MeshStandardMaterial({ color: 0xa9afb6, roughness: 0.6, metalness: 0.75 }), negru: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.55 }),
    rosu: new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.5 }), rola: new THREE.MeshStandardMaterial({ color: 0xd6dade, roughness: 0.3, metalness: 0.95 }) };
  fixEnv(MP);
  /** corp de revoluție în jurul axei x, din profilul [[r, x], …] */
  const lathe = (prof, m, seg = 64) => { const geo = new THREE.LatheGeometry(prof.map(([r, x]) => new THREE.Vector2(r, x)), seg); geo.rotateZ(-Math.PI / 2); const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; return o; };
  /** profil de fulie Poly-V: n caneluri între x0 și x1, rază exterioară R, adâncime h */
  const profilPolyV = (R, h, x0, x1, n) => { const pts = [], w = (x1 - x0) / n; for (let k = 0; k < n; k++) { const a = x0 + k * w; pts.push([R, a], [R - h, a + w / 2]); } pts.push([R, x1]); return pts; };
  // fulia arborelui cotit cu amortizor de vibrații torsionale
  const fulia = new THREE.Group(); fulia.position.set(XP, 0, 0); g.add(fulia); rot.fulia = fulia;
  { const R = 0.074;
    fulia.add(lathe([[0.012, -0.03], [0.03, -0.03], [0.03, -0.012], [0.05, -0.012], [0.05, -0.02], [R + 0.003, -0.02], ...profilPolyV(R, 0.0035, -0.016, 0.012, 6), [R + 0.003, 0.012], [R + 0.003, 0.016], [0.058, 0.016], [0.058, 0.004], [0.022, 0.004], [0.022, 0.012], [0.012, 0.012]], MP.fulie));
    fulia.add(lathe([[0.05, -0.012], [0.058, -0.012], [0.058, 0.004], [0.05, 0.004]], MP.damper));      // inelul de cauciuc al amortizorului
    const surub = cyl(0.011, 0.011, 0.014, M.crom, 0.018, 0, 0, "x", fulia);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; box(0.006, 0.012, 0.005, M.otel, 0.019, Math.cos(a) * 0.009, Math.sin(a) * 0.009, fulia).rotation.x = a; }
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; cyl(0.006, 0.006, 0.006, M.plastic, 0.005, Math.cos(a) * 0.036, Math.sin(a) * 0.036, "x", fulia); }   // găurile de extracție
    box(0.004, 0.012, 0.003, M.galben, 0.016, R - 0.004, 0, fulia);                                              // reperul de calare
  }
  // alternatorul: carcasă din aluminiu în două părți, ventilator, fulie Poly-V, capac posterior cu borna B+ și conector
  const altern = new THREE.Group(); altern.position.set(0.0, 0.205, 0.19); g.add(altern);
  { const RA = 0.064;
    const corp = new THREE.Group(); corp.position.x = 0.4; corp.scale.x = -1; altern.add(corp);   // corpul, oglindit: partea de antrenare (ventilator, fulie) spre +x
    corp.add(lathe([[0.03, 0.135], [0.05, 0.135], [RA - 0.004, 0.14], [RA, 0.15], [RA, 0.195], [RA - 0.004, 0.2], [0.035, 0.205]], MP.aluCast));   // carcasa față
    corp.add(lathe([[0.035, 0.2], [RA - 0.003, 0.202], [RA + 0.001, 0.21], [RA + 0.001, 0.27], [RA - 0.006, 0.278], [0.03, 0.28]], MP.alu));     // carcasa spate
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const f = box(0.04, 0.003, 0.012, MP.negru, 0.24, Math.cos(a) * (RA + 0.0012), Math.sin(a) * (RA + 0.0012), corp); f.rotation.x = a; }  // fantele de ventilație
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.2; const f = box(0.006, 0.026, 0.006, MP.aluCast, 0.142, Math.cos(a) * 0.047, Math.sin(a) * 0.047, corp); f.rotation.x = a; }  // spițele carcasei față
    cyl(0.02, 0.02, 0.012, MP.negru, 0.29, 0, 0, "x", corp);                                                              // capacul posterior (plastic)
    corp.add(lathe([[0.012, 0.28], [0.052, 0.28], [0.054, 0.29], [0.04, 0.3], [0.012, 0.3]], MP.negru));
    // urechile de prindere și articulația pe bloc
    [[0.0, -1], [Math.PI, 1]].forEach(([a, s2]) => { const u = box(0.02, 0.03, 0.026, MP.aluCast, 0.17, -0.07, s2 * 0.02 - 0.01, corp); cyl(0.008, 0.008, 0.11, M.otel, 0.2, -0.074, 0.0 + s2 * 0.0, "x", corp); });
    box(0.03, 0.09, 0.022, M.fonta, 0.24, -0.1, -0.03, corp);                                                             // suportul alternatorului pe bloc
    // borna B+ cu capișon roșu și cablul spre demaror, conectorul regulatorului
    cyl(0.005, 0.005, 0.016, M.alama, 0.3, 0.03, 0.02, "x", corp);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 10), MP.rosu); cap.scale.set(1.3, 1, 1); cap.position.set(0.305, 0.03, 0.02); corp.add(cap);
    tub([[0.31, 0.03, 0.02], [0.33, 0.0, 0.07], [0.36, -0.16, 0.06], [0.5, -0.26, 0.06]], 0.0045, M.cauciuc, corp);
    rbox(0.02, 0.022, 0.024, 0.004, M.plasticGri, 0.295, -0.025, 0.03, corp);
    // ventilatorul și fulia (se rotesc)
    const rotor = new THREE.Group(); rotor.position.set(0, 0, 0); altern.add(rotor); rot.altern = rotor;
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2; const pal = box(0.014, 0.026, 0.0025, MP.alu, 0.279, Math.cos(a) * 0.04, Math.sin(a) * 0.04, rotor); pal.rotation.x = a + 0.35; }
    rotor.add(lathe([[0.012, 0.268], [0.056, 0.268], [0.056, 0.272], [0.012, 0.272]], MP.alu));                              // discul ventilatorului
    const ra = 0.028;
    rotor.add(lathe([[0.008, XP - 0.022], [ra + 0.003, XP - 0.022], ...profilPolyV(ra, 0.0035, XP - 0.016, XP + 0.012, 6), [ra + 0.003, XP + 0.012], [ra + 0.003, XP + 0.015], [0.008, XP + 0.015]], MP.fulie));
    cyl(0.007, 0.007, 0.03, M.otel, XP - 0.03, 0, 0, "x", rotor);                                                          // arborele
    cyl(0.009, 0.009, 0.008, M.crom, XP + 0.019, 0, 0, "x", rotor);                                                        // piulița
  }
  // pompa de apă: carcasa pe bloc, butucul și fulia Poly-V antrenată de cureaua de accesorii
  const PW = { y: 0.215, z: -0.075, r: 0.047 };
  cyl(0.036, 0.04, 0.03, MP.aluCast, XP - 0.045, PW.y, PW.z, "x");                                                    // corpul pompei (iese prin carcasa distribuției)
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.5; cyl(0.005, 0.005, 0.034, M.otel, XP - 0.045, PW.y + Math.cos(a) * 0.043, PW.z + Math.sin(a) * 0.043, "x"); }
  const pompa = new THREE.Group(); pompa.position.set(XP, PW.y, PW.z); g.add(pompa); rot.pompa = pompa;
  pompa.add(lathe([[0.008, -0.03], [0.016, -0.03], [0.016, -0.022], [PW.r + 0.003, -0.022], ...profilPolyV(PW.r, 0.0035, -0.016, 0.012, 6), [PW.r + 0.003, 0.012], [PW.r + 0.003, 0.015], [0.03, 0.015], [0.03, 0.006], [0.016, 0.006], [0.016, 0.012], [0.008, 0.012]], MP.fulie));
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; cyl(0.004, 0.004, 0.006, M.crom, 0.014, Math.cos(a) * 0.011, Math.sin(a) * 0.011, "x", pompa); }   // șuruburile fuliei
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3; cyl(0.006, 0.006, 0.005, MP.negru, 0.013, Math.cos(a) * 0.022, Math.sin(a) * 0.022, "x", pompa); }  // degajările fuliei
  // compresorul de climatizare (cu cilindree variabilă): cuplaj electromagnetic cu fulie Poly-V, corp din aluminiu turnat, chiulasa cu racordurile
  const PC = { y: -0.04, z: 0.21, r: 0.055 };
  { const C = new THREE.Group(); C.position.set(0, PC.y, PC.z); g.add(C);
    C.add(lathe([[0.02, 0.135], [0.05, 0.135], [0.058, 0.145], [0.06, 0.16], [0.06, 0.25], [0.056, 0.262], [0.04, 0.27], [0.03, 0.29]], MP.aluCast));    // corpul
    C.add(lathe([[0.012, 0.128], [0.052, 0.128], [0.055, 0.135], [0.012, 0.135]], MP.alu));                                                              // chiulasa (capacul posterior)
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; cyl(0.004, 0.004, 0.14, M.otel, 0.2, Math.cos(a) * 0.054, Math.sin(a) * 0.054, "x", C); }   // șuruburile de asamblare
    [[0.07, 1], [-0.07, -1]].forEach(([y, s2]) => { box(0.03, 0.028, 0.03, MP.aluCast, 0.16, y, 0, C); box(0.03, 0.028, 0.03, MP.aluCast, 0.255, y, 0, C); cyl(0.007, 0.007, 0.13, M.otel, 0.205, y, 0, "x", C); });   // urechile de prindere
    box(0.12, 0.03, 0.06, M.fonta, 0.2, -0.085, -0.05, C);                                                                                             // suportul pe bloc
    // racordurile: aspirație (Ø mare, de la vaporizator) și refulare (spre condensator), cu flanșe și șuruburi
    [[0.16, 0.012, 0.028, 0.012], [0.16, -0.012, 0.022, 0.009]].forEach(([x, z, h, r]) => { rbox(0.024, 0.016, 0.024, 0.004, MP.alu, x, 0.064, z, C); cyl(r, r, h, MP.alu, x, 0.075 + h / 2, z, "y", C); cyl(0.0035, 0.0035, 0.02, M.crom, x + 0.012, 0.07, z, "y", C); });
    rbox(0.022, 0.016, 0.02, 0.004, M.plasticGri, 0.24, 0.0, 0.066, C); tub([[0.24, 0.0, 0.076], [0.22, 0.02, 0.1], [0.12, 0.08, 0.1]], 0.0035, M.cauciuc, C);   // supapa de comandă și bobina cuplajului
    // cuplajul electromagnetic: bobina fixă, fulia pe rulment, discul de antrenare cu arcuri lamelare
    const fc = new THREE.Group(); fc.position.x = 0; C.add(fc); rot.comp = fc;
    fc.add(lathe([[0.018, XP - 0.03], [PC.r + 0.003, XP - 0.03], ...profilPolyV(PC.r, 0.0035, XP - 0.016, XP + 0.012, 6), [PC.r + 0.003, XP + 0.012], [PC.r + 0.003, XP + 0.014], [0.018, XP + 0.014]], MP.fulie));
    fc.add(lathe([[0.008, XP + 0.015], [0.046, XP + 0.015], [0.046, XP + 0.019], [0.008, XP + 0.019]], MP.alu));                                         // discul de antrenare
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const l = box(0.003, 0.034, 0.012, M.otel, XP + 0.021, Math.cos(a) * 0.026, Math.sin(a) * 0.026, fc); l.rotation.x = a; }
    cyl(0.012, 0.012, 0.008, M.crom, XP + 0.023, 0, 0, "x", fc);
    cyl(0.05, 0.05, 0.02, MP.negru, XP - 0.042, 0, 0, "x", C);                                                                                          // bobina
  }
  const portAC = { asp: new THREE.Vector3(0.16, PC.y + 0.103, PC.z + 0.012), ref: new THREE.Vector3(0.16, PC.y + 0.097, PC.z - 0.012) };
  // rola întinzătoare automată: braț pivotant cu arc, rolă netedă pe rulment (apasă pe spatele curelei, pe ramura lungă)
  const PT = { y: 0.09, z: 0.13, r: 0.032 };
  const intinz = new THREE.Group(); intinz.position.set(XP, PT.y, PT.z); g.add(intinz); rot.intinz = intinz;
  intinz.add(lathe([[0.008, -0.016], [PT.r - 0.002, -0.016], [PT.r, -0.012], [PT.r + 0.0008, 0], [PT.r, 0.012], [PT.r - 0.002, 0.016], [0.008, 0.016]], MP.rola));
  intinz.add(lathe([[0.008, 0.016], [0.02, 0.016], [0.02, 0.02], [0.008, 0.02]], MP.negru));                                // capacul de praf al rulmentului
  cyl(0.006, 0.006, 0.006, M.crom, 0.022, 0, 0, "x", intinz);
  { const piv = { y: 0.148, z: 0.058 }, dy = PT.y - piv.y, dz = PT.z - piv.z, L = Math.hypot(dy, dz);
    const brat = box(0.012, L + 0.03, 0.026, MP.aluCast, XP - 0.024, (PT.y + piv.y) / 2, (PT.z + piv.z) / 2); brat.rotation.x = Math.atan2(dz, dy) * -1;
    cyl(0.022, 0.022, 0.03, MP.aluCast, XP - 0.036, piv.y, piv.z, "x");                                                    // carcasa arcului spiral
    cyl(0.008, 0.008, 0.01, M.crom, XP - 0.016, piv.y, piv.z, "x");
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.002, 6, 24, Math.PI * 1.6), M.otel); arc.rotation.y = Math.PI / 2; arc.position.set(XP - 0.02, piv.y, piv.z); add(arc);
    box(0.004, 0.012, 0.003, M.galben, XP - 0.02, piv.y + 0.018, piv.z, g);                                              // indicatorul de tensiune
  }
  // cureaua Poly-V (6 nervuri), calculată ca tangente exterioare/interioare la cele trei fulii
  { const P = [{ u: 0, v: 0, r: 0.074 + 0.003 }, { u: PC.z, v: PC.y, r: PC.r + 0.003 }, { u: PT.z, v: PT.y, r: -(PT.r + 0.0008) }, { u: 0.19, v: 0.205, r: 0.028 + 0.003 }, { u: PW.z, v: PW.y, r: PW.r + 0.003 }];   // r < 0: fulia atinge spatele curelei
    const tang = (a, b) => { const dx = b.u - a.u, dy = b.v - a.v, L = Math.hypot(dx, dy), A = (b.r - a.r) / L, B = Math.sqrt(1 - A * A), du = dx / L, dv = dy / L, nu = A * du - B * dv, nv = A * dv + B * du;
      return [{ u: a.u - a.r * nu, v: a.v - a.r * nv }, { u: b.u - b.r * nu, v: b.v - b.r * nv }]; };
    const T = P.map((p, k) => tang(p, P[(k + 1) % P.length]));
    const pts = [];
    P.forEach((p, k) => {
      const tin = T[(k + P.length - 1) % P.length][1], tout = T[k][0];
      let a0 = Math.atan2(tin.v - p.v, tin.u - p.u), a1 = Math.atan2(tout.v - p.v, tout.u - p.u);
      if (p.r > 0) { while (a1 < a0) a1 += 2 * Math.PI; } else { while (a1 > a0) a1 -= 2 * Math.PI; }
      const n = Math.max(4, Math.round(Math.abs(a1 - a0) * Math.abs(p.r) / 0.004)), R = Math.abs(p.r);
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([p.u + R * Math.cos(a), p.v + R * Math.sin(a), p.r > 0 ? 1 : -1]); }
    });
    // secțiunea curelei: spate plat (exterior) și 6 nervuri în V (interior); w = lățimea pe x, t = grosimea
    const w = 0.021, t = 0.0045, sec = [[-w / 2, 0], [w / 2, 0]];
    for (let k = 6; k >= 0; k--) { const x = -w / 2 + w * k / 6; sec.push([x, -t]); if (k) sec.push([x - w / 12, -t - 0.002]); }
    sec.push([-w / 2, 0]);
    const N = pts.length, S = sec.length, pos = [], idx = [];
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = pts[(i + 1) % N], o = pts[(i + N - 1) % N], tu = q[0] - o[0], tv = q[1] - o[1], tl = Math.hypot(tu, tv) || 1;
      let nu = tv / tl, nv = -tu / tl;                                                     // normala spre exteriorul buclei (sens trigonometric)
      sec.forEach(([x, d]) => pos.push(XP + x, p[1] + nv * d, p[0] + nu * d));
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < S - 1; k++) { const a = i * S + k, b = ((i + 1) % N) * S + k; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const curea = new THREE.Mesh(geo, MP.curea); curea.castShadow = true; g.add(curea);
    // inscripția de pe spatele curelei (marcaje care se deplasează odată cu cureaua)
    const marc = new THREE.Group(); g.add(marc); rot.marcaje = { grup: marc, pts, L: 0 };
    let L = 0; const cum = [0]; for (let i = 1; i < N; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); } L += Math.hypot(pts[0][0] - pts[N - 1][0], pts[0][1] - pts[N - 1][1]); rot.marcaje.L = L; rot.marcaje.cum = cum;
    const mMarc = new THREE.MeshStandardMaterial({ color: 0xc9c9c9, roughness: 0.8 });
    for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0008, 0.01), mMarc); marc.add(m); }
    rot.marcaje.pozitie = s0 => {
      marc.children.forEach((m, k) => {
        let d = ((s0 + k * L / 8) % L + L) % L, i = 1; while (i < N && cum[i] < d) i++;
        const a = pts[i - 1], b = pts[i % N], f = (d - cum[i - 1]) / ((i < N ? cum[i] : L) - cum[i - 1] || 1);
        const u = a[0] + (b[0] - a[0]) * f, v = a[1] + (b[1] - a[1]) * f, tu = b[0] - a[0], tv = b[1] - a[1], tl = Math.hypot(tu, tv) || 1;
        m.position.set(XP, v + (-tu / tl) * 0.0004, u + (tv / tl) * 0.0004); m.rotation.x = -Math.atan2(tv, tu);
      });
    };
    rot.marcaje.pozitie(0);
  }
  return { grup: g, rot, XP, portAC,
    roteste(d) {
      rot.fulia.rotation.x -= d; rot.altern.rotation.x -= d * 0.077 / 0.031; rot.intinz.rotation.x += d * 0.077 / 0.0328; rot.pompa.rotation.x -= d * 0.077 / 0.05; rot.comp.rotation.x -= d * 0.077 / 0.058;
      rot.sCurea = (rot.sCurea || 0) + d * 0.077; rot.marcaje.pozitie(rot.sCurea);
    } };
}

/* ------------------------------------------------------------------ sistemul de răcire */
let texFin = null;
/** textura nucleului: țevi plate orizontale din aluminiu și lamele ondulate (fante „louver”) între ele */
function texturaNucleu() {
  if (texFin) return texFin;
  const c = document.createElement("canvas"); c.width = 128; c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "#24272b"; x.fillRect(0, 0, 128, 64);
  for (let k = 0; k < 4; k++) {
    const y0 = k * 16;
    x.fillStyle = "#b9bfc6"; x.fillRect(0, y0, 128, 5);                       // țeava plată
    x.fillStyle = "#6f767e"; x.fillRect(0, y0 + 5, 128, 1);
    x.strokeStyle = "#8b9299"; x.lineWidth = 1.2; x.beginPath();               // lamela ondulată
    for (let i = 0; i <= 32; i++) { const xx = i * 4, yy = y0 + 6 + (i % 2 ? 9 : 1); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
    x.stroke();
  }
  texFin = new THREE.CanvasTexture(c); texFin.wrapS = texFin.wrapT = THREE.RepeatWrapping; texFin.colorSpace = THREE.SRGBColorSpace; texFin.anisotropy = 4;
  return texFin;
}
/** radiatorul cu curgere transversală (bazine laterale din plastic), electroventilatorul cu carcasă, vasul de expansiune,
    furtunurile (superior, inferior, aerisire, alimentare, încălzire) și, opțional, condensatorul instalației A/C.
    Coordonatele sunt ale motorului; opt: { xc, yR, zR (planul nucleului), vas: [x,y,z], incalzire: [x,y,z], ac: bool, suportVas: bool } */
function sistemRacire(M, opt) {
  const g = new THREE.Group(), rot = {}, ancore = {}, out = { grup: g, rot, ancore };
  const { add, box, rbox, cyl, tub } = ajutoare(g);
  const W = 0.6, H = 0.36, D = 0.027, xc = opt.xc, yR = opt.yR, zR = opt.zR;
  const R = new THREE.Group(); R.position.set(xc, yR, zR); g.add(R); R.updateMatrixWorld(true);
  const mP = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.55, metalness: 0.05 });
  const mLic = new THREE.MeshStandardMaterial({ color: 0xff5fa2, roughness: 0.2, transparent: true, opacity: 0.8 });
  const mVas = new THREE.MeshPhysicalMaterial({ color: 0xf2f0e6, roughness: 0.35, transmission: 0.35, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const mFurt = M.cauciuc, mClema = M.otel;
  // nucleul (țevi + lamele), plăcile colectoare și bazinele laterale
  const t = texturaNucleu().clone(); t.needsUpdate = true; t.repeat.set(W / 0.045, H / 0.044);
  const mNuc = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.6 });
  const mMuchie = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.5, metalness: 0.7 });
  const nuc = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [mMuchie, mMuchie, mMuchie, mMuchie, mNuc, mNuc]); nuc.castShadow = nuc.receiveShadow = true; R.add(nuc);
  out.ref = { R, nuc, W, H, tL: -(W / 2 + 0.031), tD: W / 2 + 0.031 };
  box(W + 0.004, 0.014, D + 0.004, M.aluMat, 0, H / 2 + 0.007, 0, R); box(W + 0.004, 0.014, D + 0.004, M.aluMat, 0, -H / 2 - 0.007, 0, R);   // tablele laterale de rigidizare
  [-1, 1].forEach(s => {
    box(0.006, H + 0.03, 0.044, M.aluMat, s * (W / 2 + 0.003), 0, 0, R);                                                                      // placa colectoare
    for (let k = 0; k < 14; k++) box(0.008, 0.01, 0.05, M.aluMat, s * (W / 2 + 0.006), -H / 2 + 0.01 + k * (H - 0.02) / 13, 0, R);           // urechile de sertizare
    rbox(0.05, H + 0.05, 0.05, 0.012, mP, s * (W / 2 + 0.031), 0, 0, R);                                                                      // bazinul din poliamidă
    for (let k = 0; k < 5; k++) box(0.004, H + 0.02, 0.054, mP, s * (W / 2 + 0.031), 0, -0.02 + k * 0.01, R).scale.set(1, 1, 0.2);
    [H / 2 + 0.04, -H / 2 - 0.04].forEach(y => { cyl(0.008, 0.006, 0.03, M.cauciuc, s * (W / 2 + 0.031), y, 0, "y", R); });             // știfturile de prindere cu tampoane
  });
  const tL = -(W / 2 + 0.031), tD = W / 2 + 0.031;
  const racord = (x, y, z, ax, r = 0.017, L = 0.045) => { cyl(r, r, L, mP, x, y, z, ax, R); const b = add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.001, 0.003, 6, 20), mP), R); b.position.set(x, y, z); if (ax === "z") { b.position.z += L / 2 - 0.006; } };
  racord(tL, H / 2 - 0.035, 0.045, "z");                                                     // intrarea (de la termostat)
  racord(tD, -H / 2 + 0.035, 0.045, "z");                                                    // ieșirea (spre pompa de apă)
  cyl(0.004, 0.004, 0.025, mP, tL, H / 2 + 0.035, 0.0, "y", R);                              // ștuțul de aerisire
  cyl(0.009, 0.009, 0.02, new THREE.MeshStandardMaterial({ color: 0x2a6fd6, roughness: 0.4 }), tD, -H / 2 - 0.035, 0.012, "y", R);   // bușonul de golire
  const wp = v => R.localToWorld(new THREE.Vector3(...v));
  // electroventilatorul: carcasă (difuzor) cu inel, elice cu 7 pale curbate, motorul pe brațe
  const zV = 0.042;
  { const sh = new THREE.Shape(); sh.moveTo(-W / 2, -H / 2); sh.lineTo(W / 2, -H / 2); sh.lineTo(W / 2, H / 2); sh.lineTo(-W / 2, H / 2); sh.lineTo(-W / 2, -H / 2);
    const gaura = new THREE.Path(); gaura.absarc(0, 0, 0.168, 0, Math.PI * 2, true); sh.holes.push(gaura);
    const pl = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false, curveSegments: 48 }), mP), R); pl.position.z = zV - 0.02;
    [[0, H / 2 - 0.004, W, 0.008, 0.03], [0, -H / 2 + 0.004, W, 0.008, 0.03], [W / 2 - 0.004, 0, 0.008, H, 0.03], [-W / 2 + 0.004, 0, 0.008, H, 0.03]].forEach(([x, y, w, h, d]) => box(w, h, d, mP, x, y, zV - 0.028, R));
    const inel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.55, side: THREE.DoubleSide })), R); inel.rotation.x = Math.PI / 2; inel.position.z = zV + 0.006;
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; const b = box(0.012, 0.14, 0.008, mP, Math.cos(a) * 0.11, Math.sin(a) * 0.11, zV + 0.05, R); b.rotation.z = a - Math.PI / 2; }   // brațele motorului
    cyl(0.046, 0.046, 0.055, M.otel, 0, 0, zV + 0.065, "z", R);                               // motorul electric
    cyl(0.048, 0.048, 0.008, mP, 0, 0, zV + 0.094, "z", R);
    rbox(0.026, 0.018, 0.02, 0.004, M.plasticGri, 0.055, 0.02, zV + 0.08, R);                  // conectorul
    tub([[0.06, 0.02, zV + 0.092].map((v, i) => v + [xc, yR, zR][i]), [xc + 0.12, yR + 0.1, zR + 0.16], [xc + 0.16, yR + 0.22, zR + 0.22]], 0.004, M.cauciuc, g);
    const vent = new THREE.Group(); vent.position.z = zV + 0.012; R.add(vent); rot.vent = vent;
    const hub = add(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.03, 32), mP), vent); hub.rotation.x = Math.PI / 2;
    const pala = new THREE.Shape(); const N = 12, r0 = 0.04, r1 = 0.158;
    for (let i = 0; i <= N; i++) { const u = i / N, r = r0 + (r1 - r0) * u, a = 0.22 + 0.55 * u * u; pala.lineTo ? (i ? pala.lineTo(r * Math.cos(a), r * Math.sin(a)) : pala.moveTo(r * Math.cos(a), r * Math.sin(a))) : 0; }
    for (let i = N; i >= 0; i--) { const u = i / N, r = r0 + (r1 - r0) * u, a = -0.22 + 0.45 * u * u - 0.05 * u; pala.lineTo(r * Math.cos(a), r * Math.sin(a)); }
    const gP = new THREE.ExtrudeGeometry(pala, { depth: 0.003, bevelEnabled: false });
    for (let k = 0; k < 7; k++) { const gr = new THREE.Group(); gr.rotation.z = k / 7 * Math.PI * 2; vent.add(gr); const m = add(new THREE.Mesh(gP, mP), gr); m.rotation.x = 0.38; }
  }
  // condensatorul A/C (în fața radiatorului), filtrul deshidrator și conductele de agent frigorific
  if (opt.ac) {
    const tc = texturaNucleu().clone(); tc.needsUpdate = true; tc.repeat.set(W / 0.04, H / 0.05);
    const mC = new THREE.MeshStandardMaterial({ map: tc, color: 0x9aa0a6, roughness: 0.6, metalness: 0.5 });
    const cond = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, H - 0.03, 0.016), [mMuchie, mMuchie, mMuchie, mMuchie, mC, mC]); cond.position.z = -0.035; R.add(cond);
    cyl(0.022, 0.022, 0.24, M.alu, W / 2 + 0.07, -0.01, -0.035, "y", R);                     // filtrul deshidrator
    const mAl = M.alu, V3 = (x, y, z) => new THREE.Vector3(x, y, z), pa = opt.portAC;
    const linie = (pts, r) => { const c = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35); add(new THREE.Mesh(new THREE.TubeGeometry(c, 90, r, 10, false), mAl)); return c; };
    // racordul de intrare al condensatorului și ventilul de expansiune (pe peretele parafoc) cu blocul de racorduri
    const inCond = wp([W / 2 + 0.012, H / 2 - 0.045, -0.035]);
    rbox(0.022, 0.03, 0.022, 0.004, mAl, inCond.x, inCond.y, inCond.z, g);
    const VE = V3(0.27, 0.32, 0.545); rbox(0.05, 0.05, 0.03, 0.006, mAl, VE.x, VE.y, VE.z, g); box(0.07, 0.07, 0.006, mP, VE.x, VE.y, VE.z + 0.02, g);
    // conducta de refulare (gaz fierbinte, înaltă presiune): compresor → condensator
    const cRef = pa ? linie([pa.ref.clone().add(V3(0, 0.02, 0)), V3(0.17, 0.06, 0.27), V3(0.2, -0.1, 0.3), V3(0.27, -0.2, 0.15), V3(0.26, -0.2, -0.1), V3(0.26, -0.17, -0.38), V3(0.37, -0.12, -0.45), V3(0.37, 0.05, -0.58), V3(inCond.x + 0.02, inCond.y - 0.01, inCond.z - 0.02), inCond], 0.0065) : null;   // pe sub fulii, ocolind bazinul radiatorului
    // conducta de aspirație (vapori reci, joasă presiune, Ø mare): ventilul de expansiune → compresor
    const cAsp = pa ? linie([V3(VE.x - 0.012, VE.y - 0.02, VE.z - 0.016), V3(0.25, 0.27, 0.48), V3(0.2, 0.17, 0.4), V3(0.17, 0.11, 0.31), pa.asp.clone().add(V3(0, 0.03, 0)), pa.asp], 0.009) : null;
    // conducta de lichid (înaltă presiune): filtrul deshidrator → ventilul de expansiune, cu senzorul de presiune
    const top = wp([W / 2 + 0.07, 0.125, -0.035]);
    const cL = linie([top, top.clone().add(V3(0, 0.06, 0.02)), V3(0.39, 0.32, -0.42), V3(0.31, 0.475, -0.12), V3(0.31, 0.47, 0.25), V3(0.29, 0.38, 0.46), V3(VE.x + 0.012, VE.y + 0.01, VE.z - 0.016)], 0.005);   // pe deasupra carcasei distribuției
    // prizele de service (H roșu pe lichid, L albastru pe aspirație)
    const ph = cL.getPointAt(0.42); cyl(0.007, 0.007, 0.02, M.alama, ph.x, ph.y + 0.012, ph.z, "y", g); cyl(0.009, 0.009, 0.014, new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 }), ph.x, ph.y + 0.027, ph.z, "y", g);
    if (pa) { const pl = V3(0.2, 0.17, 0.4); cyl(0.008, 0.008, 0.02, M.alama, pl.x, pl.y + 0.015, pl.z, "y", g); cyl(0.01, 0.01, 0.014, new THREE.MeshStandardMaterial({ color: 0x1f5fd0, roughness: 0.4 }), pl.x, pl.y + 0.03, pl.z, "y", g); }
    const ps = cL.getPointAt(0.18);
    const sAC = new THREE.Group(); sAC.position.copy(ps); g.add(sAC);
    cyl(0.009, 0.009, 0.01, M.alama, 0, 0.004, 0, "y", sAC); cyl(0.0105, 0.0105, 0.012, M.otel, 0, 0.014, 0, "y", sAC);   // piulița hexagonală pe ventilul Schrader
    cyl(0.011, 0.011, 0.025, mP, 0, 0.033, 0, "y", sAC); rbox(0.02, 0.012, 0.018, 0.003, M.plasticGri, 0, 0.052, 0, sAC);
    tub([[0, 0.058, 0], [0.0, 0.1, 0.02], [-0.05, 0.14, 0.08]], 0.0035, M.cauciuc, sAC);
    // blocul de climatizare din habitaclu (carcasă translucidă): vaporizatorul, radiatorul de încălzire, suflanta, clapetele de amestec
    const mHV = new THREE.MeshPhysicalMaterial({ color: 0x3a3f46, roughness: 0.5, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    rbox(0.62, 0.3, 0.26, 0.03, mHV, 0.02, 0.3, 0.72, g);
    const te = texturaNucleu().clone(); te.needsUpdate = true; te.repeat.set(5, 3);
    const mEv = new THREE.MeshStandardMaterial({ map: te, color: 0xc8d4e0, roughness: 0.6, metalness: 0.5 });
    const ev = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.04), [mMuchie, mMuchie, mMuchie, mMuchie, mEv, mEv]); ev.position.set(0.15, 0.3, 0.63); g.add(ev);   // vaporizatorul
    tub([[VE.x, VE.y, VE.z + 0.02], [0.24, 0.32, 0.6], [0.22, 0.32, 0.63]], 0.006, mAl, g);
    const sc = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 32), mHV)); sc.position.set(0.42, 0.28, 0.76);         // carcasa suflantei
    cyl(0.04, 0.04, 0.07, M.otel, 0.42, 0.18, 0.76, "y", g); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; box(0.004, 0.1, 0.02, mP, 0.42 + Math.cos(a) * 0.075, 0.28, 0.76 + Math.sin(a) * 0.075, g).rotation.y = -a; }
    box(0.16, 0.012, 0.18, M.otel, -0.06, 0.38, 0.72, g).rotation.x = 0.5;                                                              // clapeta de amestec
    [[-0.25, 0.47, 0.8], [0.0, 0.47, 0.82], [0.25, 0.47, 0.8]].forEach(([x, y, z]) => rbox(0.12, 0.08, 0.08, 0.02, mHV, x, y, z, g));   // gurile de distribuție (parbriz, centru, picioare)
    out.ac = sAC; ancore.ac = ps.clone().add(new THREE.Vector3(0, 0.06, 0));
    out.acAnc = { H: ph.clone().add(V3(0, 0.034, 0)), L: pa ? V3(0.2, 0.17 + 0.037, 0.4) : null, VE, cLic: cL, cAsp, cRef, inCond, evap: ev.position.clone() };
  }
  if (!opt.ac && opt.portAC) [[opt.portAC.ref, 0xc62828, 0.011], [opt.portAC.asp, 0x1f5fd0, 0.013]].forEach(([p, c, r]) => cyl(r, r, 0.012, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), p.x, p.y + 0.004, p.z, "y"));   // capacele de protecție ale racordurilor (stand fără circuit A/C)
  // furtunul superior: termostat → bazinul din stânga (sus); furtunul inferior: bazinul din dreapta (jos) → pompa de apă
  const IN = wp([tL, H / 2 - 0.035, 0.075]), OUT = wp([tD, -H / 2 + 0.035, 0.075]);
  const T = new THREE.Vector3(...(opt.T || [-0.33, 0.31, 0.04])), P = new THREE.Vector3(...(opt.P || [0.255, 0.2, -0.15])), RT = new THREE.Vector3(...(opt.retur || [-0.2, 0.14, 0.145]));
  const clema = (p, dir) => { const c = add(new THREE.Mesh(new THREE.TorusGeometry(0.0195, 0.0025, 6, 20), mClema)); c.position.copy(p); c.lookAt(p.clone().add(dir)); };
  const sup = [T, new THREE.Vector3(-0.39, 0.305, -0.02), new THREE.Vector3(-0.42, Math.max(0.27, IN.y + 0.05), (T.z + IN.z) / 2), new THREE.Vector3(IN.x, IN.y + 0.03, IN.z + 0.1), IN];
  out.ref.sup = tub(sup.map(v => [v.x, v.y, v.z]), 0.018, mFurt, g, 80); out.ref.supPts = sup; clema(sup[0].clone().add(new THREE.Vector3(-0.012, 0, 0)), new THREE.Vector3(1, 0, 0)); clema(IN.clone().add(new THREE.Vector3(0, 0, 0.012)), new THREE.Vector3(0, 0, 1));
  const inf = [OUT, OUT.clone().add(new THREE.Vector3(0, 0.02, 0.1)), new THREE.Vector3(P.x + 0.105, (OUT.y + P.y) / 2 - 0.05, (OUT.z + P.z) / 2), P.clone().add(new THREE.Vector3(0.02, -0.03, -0.09)), P];
  out.ref.inf = tub(inf.map(v => [v.x, v.y, v.z]), 0.017, mFurt, g, 80); out.ref.infPts = inf; out.ref.IN = IN; out.ref.OUT = OUT; out.ref.T = T; out.ref.P = P; clema(OUT.clone().add(new THREE.Vector3(0, 0, 0.012)), new THREE.Vector3(0, 0, 1)); clema(P.clone().add(new THREE.Vector3(0, 0, -0.012)), new THREE.Vector3(0, 0, 1));
  // ștuțurile pe motor: ieșirea termostatului și intrarea în pompa de apă
  cyl(0.017, 0.017, 0.04, M.alu, T.x + 0.015, T.y, T.z, "x"); cyl(0.017, 0.017, 0.05, M.aluMat, P.x, P.y, P.z + 0.02, "z");
  // vasul de expansiune (polipropilenă translucidă) cu lichid G12, bușon cu supapă, repere MIN/MAX
  { const [vx, vy, vz] = opt.vas, V = new THREE.Group(); V.position.set(vx, vy, vz); g.add(V); V.updateMatrixWorld(true); out.ref.vas = V;
    add(new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.12, 0.1, 4, 0.02), mVas), V);
    const lic = add(new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.07, 0.09, 3, 0.015), mLic), V); lic.position.y = -0.02; out.ref.lic = lic;
    cyl(0.026, 0.026, 0.012, mVas, 0.035, 0.066, 0, "y", V);
    const busV = new THREE.Group(); V.add(busV); out.ref.busV = busV; out.ref.capVas = V.localToWorld(new THREE.Vector3(0.035, 0.1, 0));
    cyl(0.03, 0.03, 0.022, new THREE.MeshStandardMaterial({ color: 0x1f4fb0, roughness: 0.45 }), 0.035, 0.083, 0, "y", busV);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; box(0.004, 0.02, 0.006, new THREE.MeshStandardMaterial({ color: 0x1f4fb0, roughness: 0.45 }), 0.035 + Math.cos(a) * 0.03, 0.083, Math.sin(a) * 0.03, busV).rotation.y = -a; }
    box(0.03, 0.002, 0.002, M.plastic, -0.045, 0.015, -0.051, V); box(0.03, 0.002, 0.002, M.plastic, -0.045, -0.035, -0.051, V);   // MAX / MIN
    cyl(0.004, 0.004, 0.02, mVas, -0.05, 0.066, 0, "y", V);                                 // ștuțul de aerisire
    cyl(0.008, 0.008, 0.025, mVas, -0.04, -0.07, 0.02, "y", V);                              // ieșirea spre circuit
    if (opt.suportVas) box(0.12, 0.012, 0.08, M.otel, 0, -0.066, 0, V);
    const nV = V.localToWorld(new THREE.Vector3(-0.05, 0.078, 0)), iV = V.localToWorld(new THREE.Vector3(-0.04, -0.085, 0.02));
    const aer = wp([tL, H / 2 + 0.05, 0.0]);
    tub([[aer.x, aer.y, aer.z], [aer.x, aer.y + 0.06, aer.z + 0.03], [(aer.x + nV.x) / 2, Math.max(aer.y, nV.y) + 0.08, (aer.z + nV.z) / 2], [nV.x, nV.y + 0.05, nV.z], [nV.x, nV.y, nV.z]], 0.0045, mFurt, g, 60);
    tub([[iV.x, iV.y, iV.z], [iV.x, iV.y - 0.05, iV.z + 0.02], [(iV.x + T.x) / 2, T.y + 0.11, (iV.z + T.z) / 2 + 0.02], [T.x + 0.03, T.y + 0.02, T.z - 0.04], [T.x + 0.04, T.y - 0.01, T.z - 0.005]], 0.007, mFurt, g, 60);
  }
  // furtunurile radiatorului de încălzire (habitaclu): tur de la carcasa termostatului, retur în bloc
  { const [hx, hy, hz] = opt.incalzire;
    cyl(0.009, 0.009, 0.03, M.alu, T.x + 0.06, T.y, T.z + 0.05, "z"); cyl(0.009, 0.009, 0.03, M.alu, RT.x, RT.y, RT.z, "z");
    out.ref.incTur = [[T.x + 0.06, T.y, T.z + 0.06], [T.x + 0.07, T.y - 0.04, T.z + 0.14], [T.x + 0.1, 0.2, (T.z + hz) / 2], [hx + 0.04, hy + 0.04, hz - 0.15], [hx + 0.04, hy + 0.04, hz - 0.075]];
    out.ref.incRet = [[hx - 0.04, hy - 0.04, hz - 0.075], [hx - 0.04, hy - 0.04, hz - 0.15], [(RT.x + hx) / 2, 0.17, (RT.z + hz) / 2], [RT.x, RT.y, RT.z + 0.1], [RT.x, RT.y, RT.z + 0.01]];
    out.ref.incT = tub(out.ref.incTur, 0.009, mFurt, g, 60);   // turul: sub tubulatura de aer, ocolind debitmetrul
    out.ref.incR = tub(out.ref.incRet.slice().reverse(), 0.009, mFurt, g, 60);
    // țevile radiatorului de încălzire (trec prin peretele parafoc) cu colierele furtunurilor
    [[hx + 0.04, hy + 0.04], [hx - 0.04, hy - 0.04]].forEach(([x, y]) => { cyl(0.0095, 0.0095, 0.08, M.alu, x, y, hz - 0.036, "z"); const c = add(new THREE.Mesh(new THREE.TorusGeometry(0.0115, 0.002, 6, 16), mClema)); c.position.set(x, y, hz - 0.068); });
    const ti = texturaNucleu().clone(); ti.needsUpdate = true; ti.repeat.set(4, 3);
    const mI = new THREE.MeshStandardMaterial({ map: ti, roughness: 0.6, metalness: 0.5 });
    const inc = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.035), [mMuchie, mMuchie, mMuchie, mMuchie, mI, mI]); inc.position.set(hx, hy, hz + 0.02); g.add(inc); out.ref.inc = inc;
    box(0.03, 0.17, 0.045, mP, hx + 0.115, hy, hz + 0.02);
  }
  return out;
}

/* ======================================================================= interiorul motorului și sistemul de ungere
   (macheta secționată / transparentă): arborele cotit cu manetoanele, contragreutățile și găurile de ungere, bielele, pistoanele cu
   segmenți, cuzineții paliери cu pelicula de ulei, arborele cu came cu supapele (ordinea de aprindere 1-3-4-2), axele culbutorilor,
   pompa de ulei cu roți dințate evolventice antrenată prin lanț, supapa de siguranță cu plonjor și arc, sorbul cu sită, filtrul cu
   elementul pliat, galeria principală cu găurile spre paliere, coloana spre chiulasă, manocontactul, uleiul din baie.
   Coordonatele motorului (axa arborelui cotit pe x, la y = 0). */
/** profilul evolventic al unei roți dințate (α = 20°): puncte [x, y] în jurul originii, dintele 0 pe axa +x */
export function profilRoata(z, m, alfa = 20) {
  const a = alfa * Math.PI / 180, r = m * z / 2, rb = r * Math.cos(a), ra = r + m, rf = r - 1.25 * m;
  const inv = x => Math.tan(x) - x, psi = Math.PI / (2 * z) + inv(a);
  const u = rho => { if (rho <= rb) return psi; const t = Math.sqrt(rho * rho / (rb * rb) - 1); return psi - (t - Math.atan(t)); };
  const pts = [];
  for (let k = 0; k < z; k++) {
    const c = 2 * Math.PI * k / z, r0 = Math.max(rf, rb), fl = [];
    for (let i = 0; i <= 6; i++) { const rho = r0 + (ra - r0) * i / 6; fl.push([rho, u(rho)]); }
    pts.push([rf, c - u(rf)]); fl.forEach(([rho, w]) => pts.push([rho, c - w]));
    for (let i = 1; i < 3; i++) pts.push([ra, c - u(ra) + 2 * u(ra) * i / 3]);
    fl.slice().reverse().forEach(([rho, w]) => pts.push([rho, c + w])); pts.push([rf, c + u(rf)]);
    for (let i = 1; i < 3; i++) pts.push([rf, c + u(rf) + (2 * Math.PI / z - 2 * u(rf)) * i / 3]);
  }
  return pts.map(([rho, w]) => [rho * Math.cos(w), rho * Math.sin(w)]);
}
/** cursa relativă a supapei (0…1) la unghiul ciclului φ [°RAC]; centrul profilului c, durata 240° */
function cursaSupapa(phi, c) { const x = ((phi - (c - 120)) % 720 + 720) % 720; return x < 240 ? Math.pow(Math.sin(Math.PI * x / 240), 2) : 0; }
const OF_CIL = [0, 540, 180, 360];          // decalajul ciclului fiecărui cilindru [°RAC] – ordinea de aprindere 1-3-4-2
const C_ADM = 470, C_EV = 250;              // centrele profilelor camelor de admisie / evacuare [°RAC după PMI-aprindere]

function interiorMotor(g, M, XC, grupC, comp, ancore) {
  const I = new THREE.Group(); I.name = "interior"; g.add(I);
  const { add, box, rbox, cyl, tub } = ajutoare(I);
  const R = 0.035, L = 0.178, HC = 0.03, MAL = [-0.18, -0.09, 0, 0.09, 0.18];
  const mUlei = new THREE.MeshPhysicalMaterial({ color: 0xb8741a, emissive: 0x3a1c00, emissiveIntensity: 0.25, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const mCanal = new THREE.MeshStandardMaterial({ color: 0xe0a238, emissive: 0x7a4300, emissiveIntensity: 0.3, roughness: 0.25 });
  const mPiston = new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.32, metalness: 0.85 });
  const mCuz = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.3, metalness: 0.95, side: THREE.DoubleSide });
  const mFilm = new THREE.MeshStandardMaterial({ color: 0xffb52e, emissive: 0xff8a00, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const mGeam = new THREE.MeshStandardMaterial({ color: 0xc3c8cd, roughness: 0.4, metalness: 0.8, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide });
  const mHartie = new THREE.MeshStandardMaterial({ color: 0xeee2c0, roughness: 0.9 });
  const mFlacara = new THREE.MeshBasicMaterial({ color: 0xffa31a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  fixEnv({ mUlei, mCanal, mPiston, mCuz, mFilm, mGeam, mHartie });
  const st = { th: 0, sw: 0, ad: 0, circ: 0, flacari: [] };

  // ---------- arborele cotit (se rotește în jurul axei x)
  const arb = new THREE.Group(); I.add(arb);
  MAL.forEach(x => cyl(0.024, 0.024, 0.026, M.otel, x, 0, 0, "x", arb, 32));
  cyl(0.019, 0.019, 0.12, M.otel, 0.255, 0, 0, "x", arb); cyl(0.045, 0.045, 0.012, M.otel, -0.204, 0, 0, "x", arb, 40);
  XC.forEach((x, i) => {
    const s = i === 0 || i === 3 ? 1 : -1;
    cyl(0.021, 0.021, 0.03, M.crom, x, s * R, 0, "x", arb, 32);                                                    // fusul maneton
    [-1, 1].forEach(d => { const xw = x + d * 0.021;
      rbox(0.012, R + 0.046, 0.046, 0.008, M.otel, xw, s * (R + 0.046) / 2 - s * 0.012, 0, arb);               // brațul
      const cg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.012, 32, 1, false, 0, Math.PI), M.otel), arb);   // contragreutatea (semidisc)
      cg.position.set(xw, 0, 0); cg.rotation.set(s > 0 ? Math.PI : 0, 0, Math.PI / 2);
    });
    tub([[x - 0.045, 0, 0], [x - 0.02, s * R * 0.6, 0], [x, s * R, 0]], 0.0028, mCanal, arb);                    // gaura oblică de ungere palier → maneton
  });
  // roata de lanț a pompei și roata dințată a distribuției pe capătul arborelui
  const rLant = 0.022;
  cyl(rLant, rLant, 0.008, M.otel, 0.205, 0, 0, "x", arb, 32); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; box(0.008, 0.005, 0.004, M.otel, 0.205, Math.cos(a) * (rLant + 0.002), Math.sin(a) * (rLant + 0.002), arb).rotation.x = a; }
  cyl(0.031, 0.031, 0.022, M.plastic, 0.24, 0, 0, "x", arb, 40);
  // cuzineții paliери și pelicula de ulei
  const filme = [];
  MAL.forEach(x => { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0262, 0.0262, 0.024, 32, 1, true), mCuz)); c.rotation.z = Math.PI / 2; c.position.set(x, 0, 0);
    const f = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0252, 0.0252, 0.022, 32, 1, true), mFilm)); f.rotation.z = Math.PI / 2; f.position.set(x, 0, 0); filme.push(f);
    box(0.026, 0.03, 0.07, M.fonta, x, -0.042, 0).userData.carcasa = true; });                                  // capacele lagărelor
  // ---------- pistoane și biele
  const piston = [], biela = [];
  XC.forEach((x, i) => {
    const p = new THREE.Group(); p.position.x = x; I.add(p); piston.push(p);
    cyl(0.0392, 0.0392, 0.048, mPiston, 0, 0.006, 0, "y", p, 40);
    [0.025, 0.019, 0.013].forEach(y => { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.0394, 0.0011, 6, 40), M.otel), p); r.rotation.x = Math.PI / 2; r.position.y = y; });
    cyl(0.009, 0.009, 0.062, M.crom, 0, 0, 0, "x", p, 20);                                                          // bolțul
    const b = new THREE.Group(); I.add(b); biela.push(b);
    cyl(0.031, 0.031, 0.02, M.otel, 0, 0, 0, "x", b, 32); cyl(0.0215, 0.0215, 0.021, mCuz, 0, 0, 0, "x", b, 24);   // capul bielei cu cuzineții
    box(0.014, L - 0.05, 0.019, M.otel, 0, L / 2, 0, b); box(0.006, L - 0.06, 0.024, M.otel, 0, L / 2, 0, b);    // corpul în I
    cyl(0.0145, 0.0145, 0.02, M.otel, 0, L, 0, "x", b, 24);                                                         // piciorul bielei
    [-1, 1].forEach(d => cyl(0.004, 0.004, 0.03, M.crom, 0, -0.012, d * 0.022, "y", b));                            // șuruburile capacului
    const fl = add(new THREE.Mesh(new THREE.CircleGeometry(0.036, 32), mFlacara.clone())); fl.rotation.x = -Math.PI / 2; fl.position.set(x, 0.246, 0); st.flacari.push(fl);
  });
  // cămășile cilindrilor (fac parte din bloc)
  XC.forEach(x => { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0405, 0.0405, 0.15, 40, 1, true), M.fonta)); c.position.set(x, 0.175, 0); c.userData.carcasa = true; });
  // ---------- arborele cu came, supapele, axele culbutorilor
  const came = new THREE.Group(); came.position.set(0, 0.338, 0); I.add(came);
  cyl(0.012, 0.012, 0.46, M.otel, -0.01, 0, 0, "x", came, 24);
  const lobForma = new THREE.Shape(); for (let k = 0; k <= 72; k++) { const a = k / 72 * Math.PI * 2, d = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)), r = 0.015 + 0.0075 * Math.pow(Math.max(0, Math.cos(d * 1.5)), 2); k ? lobForma.lineTo(r * Math.cos(a), r * Math.sin(a)) : lobForma.moveTo(r * Math.cos(a), r * Math.sin(a)); }
  const gLob = new THREE.ExtrudeGeometry(lobForma, { depth: 0.012, bevelEnabled: false, curveSegments: 4 }); gLob.translate(0, 0, -0.006); gLob.rotateY(Math.PI / 2);
  const supape = [];
  XC.forEach((x, i) => [[x - 0.017, C_ADM], [x + 0.017, C_EV]].forEach(([xv, c]) => {
    const lg = new THREE.Group(); lg.position.x = xv; lg.rotation.x = Math.PI + (OF_CIL[i] + c) / 2 * Math.PI / 180; came.add(lg); add(new THREE.Mesh(gLob, M.crom), lg);
    const v = new THREE.Group(); v.position.set(xv, 0, 0); I.add(v);
    cyl(0.0035, 0.0035, 0.062, M.otel, 0, 0.289, 0, "y", v, 12); cyl(0.0145, 0.004, 0.006, M.otel, 0, 0.256, 0, "y", v, 24);   // tija și talerul
    cyl(0.009, 0.009, 0.004, M.crom, 0, 0.318, 0, "y", v, 16);                                                      // talerul arcului
    const arc = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 49 }, (_, k) => new THREE.Vector3(0.008 * Math.cos(k * 0.65), k / 48, 0.008 * Math.sin(k * 0.65)))), 96, 0.0011, 5), M.otel), I);
    arc.position.set(xv, 0.28, 0); supape.push({ v, arc, c, i });
  }));
  [-1, 1].forEach(d => { cyl(0.0065, 0.0065, 0.44, M.otel, -0.01, 0.356, d * 0.032, "x", I, 16); });
  // ---------- uleiul din baie
  const baie = grupC("carter", "Baia de ulei"); const ulei = add(new THREE.Mesh(new THREE.BoxGeometry(0.41, 1, 0.255), mUlei), baie); ulei.position.set(-0.01, -0.21, -0.005);
  ancore.carter = new THREE.Vector3(-0.15, -0.2, 0.13);
  // ---------- pompa de ulei (în baie, sub palierul 5, antrenată prin lanț de arborele cotit)
  const PP = new THREE.Vector3(0.165, -0.14, 0), z1 = -0.0165, z2 = 0.0165;
  const gP = grupC("pompa", "Pompa de ulei cu roți dințate"); const gPa = ajutoare(gP);
  gPa.rbox(0.04, 0.062, 0.088, 0.008, mGeam, PP.x, PP.y, PP.z);
  const prof = profilRoata(10, 0.0033), forma = new THREE.Shape(); prof.forEach(([x, y], k) => k ? forma.lineTo(x, y) : forma.moveTo(x, y));
  const gRoata = new THREE.ExtrudeGeometry(forma, { depth: 0.03, bevelEnabled: false, curveSegments: 2 }); gRoata.translate(0, 0, -0.015);
  const roti = [z1, z2].map(z => { const o = new THREE.Group(); o.position.set(PP.x, PP.y, z); o.rotation.y = Math.PI / 2; gP.add(o); const m = add(new THREE.Mesh(gRoata, M.crom), o); cyl(0.005, 0.005, 0.05, M.otel, 0, 0, 0, "z", o); return m; });
  cyl(0.026, 0.026, 0.008, M.otel, 0.205, PP.y, z1, "x", gP, 32); for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; gPa.box(0.008, 0.005, 0.004, M.otel, 0.205, PP.y + Math.cos(a) * 0.028, z1 + Math.sin(a) * 0.028).rotation.x = a; }
  const rotP = new THREE.Group(); rotP.position.set(0.205, PP.y, z1); gP.add(rotP);
  ancore.pompa = new THREE.Vector3(PP.x, PP.y + 0.035, 0.05);
  // lanțul (bucla în planul x = 0,205) cu zalele care se deplasează
  const bucla = []; for (let k = 0; k <= 20; k++) { const a = Math.PI * k / 20; bucla.push(new THREE.Vector3(0.205, rLant * Math.sin(a) * 1.0 + 0.0, rLant * Math.cos(a) + 0.0)); }
  for (let k = 0; k <= 20; k++) { const a = Math.PI + Math.PI * k / 20; bucla.push(new THREE.Vector3(0.205, PP.y + 0.028 * Math.sin(a), z1 + 0.028 * Math.cos(a))); }
  const cLant = new THREE.CatmullRomCurve3(bucla, true, "centripetal");
  add(new THREE.Mesh(new THREE.TubeGeometry(cLant, 160, 0.0018, 6, true), M.otel), gP);
  const zale = new THREE.InstancedMesh(new THREE.BoxGeometry(0.009, 0.006, 0.006), M.crom, 60); gP.add(zale);
  // supapa de siguranță în corpul pompei: alezajul, plonjorul, arcul, dopul; canalul de retur spre aspirație
  const gS = grupC("supapa", "Supapa de siguranță"); const gSa = ajutoare(gS), ZB = 0.05, YB = PP.y + 0.022;
  gSa.cyl(0.0085, 0.0085, 0.046, mGeam, PP.x, YB, ZB + 0.01, "z", gS, 20);
  const plj = gSa.cyl(0.0068, 0.0068, 0.012, M.crom, PP.x, YB, ZB - 0.006, "z", gS, 20);
  const arcS = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 49 }, (_, k) => new THREE.Vector3(0.0055 * Math.cos(k * 0.8), 0.0055 * Math.sin(k * 0.8), k / 48))), 96, 0.001, 5), M.otel), gS);
  arcS.position.set(PP.x, YB, 0);
  gSa.cyl(0.009, 0.009, 0.006, M.otel, PP.x, YB, ZB + 0.034, "z", gS, 6);
  const retur = gSa.tub([[PP.x, YB - 0.006, ZB + 0.006], [PP.x, YB - 0.03, ZB + 0.01], [PP.x, PP.y - 0.03, 0.03], [PP.x, PP.y - 0.034, 0.0]], 0.003, mCanal.clone());
  ancore.supapa = new THREE.Vector3(PP.x, YB + 0.01, ZB + 0.03);
  // sorbul: țeava de aspirație, clopotul cu sită
  const gSo = grupC("sorb", "Sorbul cu sită"); const gSoa = ajutoare(gSo);
  gSoa.tub([[PP.x, PP.y - 0.03, 0], [PP.x - 0.02, -0.2, 0], [0.09, -0.222, 0], [0.06, -0.226, 0]], 0.0075, M.otel);
  gSoa.cyl(0.02, 0.036, 0.014, M.otel, 0.06, -0.232, 0, "y", gSo, 32);
  for (let k = 0; k < 3; k++) { const t = add(new THREE.Mesh(new THREE.TorusGeometry(0.012 + k * 0.009, 0.0007, 4, 32), M.crom), gSo); t.rotation.x = Math.PI / 2; t.position.set(0.06, -0.24, 0); }
  for (let k = 0; k < 8; k++) gSoa.box(0.07, 0.0007, 0.0012, M.crom, 0.06, -0.24, 0, gSo).rotation.y = k * Math.PI / 8;
  ancore.sorb = new THREE.Vector3(0.06, -0.225, 0.04);
  // filtrul: elementul pliat, tubul central perforat, membrana antiretur, supapa de bypass (cartușul exterior e în motor)
  const gF = grupC("filtru", "Filtrul de ulei"); const gFa = ajutoare(gF), FZ = 0.19;
  for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; gFa.box(0.0012, 0.02, 0.092, mHartie, 0.08 + Math.cos(a) * 0.027, -0.02 + Math.sin(a) * 0.027, FZ + 0.004).rotation.z = a; }
  gFa.cyl(0.0125, 0.0125, 0.096, M.otel, 0.08, -0.02, FZ + 0.004, "z", gF, 20);
  const mem = add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0025, 6, 32), new THREE.MeshStandardMaterial({ color: 0x8b1d1d, roughness: 0.6 })), gF); mem.position.set(0.08, -0.02, 0.142);
  gFa.cyl(0.006, 0.006, 0.008, M.crom, 0.08, -0.02, 0.243, "z", gF, 12);
  ancore.filtru = new THREE.Vector3(0.08, 0.03, 0.24);
  // ---------- galeriile de ulei
  const gG = grupC("galerie", "Galeria principală de ungere"); const gGa = ajutoare(gG);
  const YG = -0.012, ZG = 0.104;
  const canal = (pts, r = 0.0045, p = gG) => ajutoare(p).tub(pts, r, mCanal);
  canal([[0.165, PP.y + 0.03, -0.0], [0.17, -0.09, 0.07], [0.13, -0.05, 0.12], [0.11, -0.04, 0.137]]);                                  // pompa → filtru
  canal([[0.08, -0.02, 0.137], [0.07, -0.016, 0.118], [0.05, YG, ZG]]);                                                                  // filtru → galerie
  canal([[0.2, YG, ZG], [-0.215, YG, ZG]], 0.0055);                                                                                    // galeria principală
  MAL.forEach(x => canal([[x, YG, ZG], [x, -0.004, 0.06], [x, 0, 0.027]], 0.003));                                                     // găurile spre paliere
  canal([[-0.215, YG, ZG], [-0.218, 0.12, 0.1], [-0.218, 0.3, 0.075], [-0.215, 0.356, 0.032]], 0.0038);                                // coloana spre chiulasă
  [-1, 1].forEach(d => canal([[-0.215, 0.356, d * 0.032], [0.21, 0.356, d * 0.032]], 0.0042));                                          // axele culbutorilor (tubulare, pline cu ulei)
  canal([[-0.06, YG, ZG], [-0.06, -0.03, 0.125], [-0.06, -0.035, 0.137]], 0.003);                                                      // racordul manocontactului
  ancore.galerie = new THREE.Vector3(-0.1, YG + 0.03, ZG + 0.03);
  const gL = grupC("lagare", "Lagărele paliere și de bielă"); ancore.lagare = new THREE.Vector3(0, -0.02, 0.06);
  filme.forEach(f => { I.remove(f); gL.add(f); });
  const gC = grupC("came", "Arborele cu came și axele culbutorilor"); ancore.came = new THREE.Vector3(0.0, 0.37, 0.05);
  // ---------- manocontactul de presiune (pe bloc, partea admisiei) – se poate demonta; adaptorul cu furtunul manometrului
  const gM = grupC("presUlei", "Manocontactul de presiune a uleiului");
  const sw = new THREE.Group(); sw.position.set(-0.06, -0.035, 0.137); gM.add(sw); const swa = ajutoare(sw);
  swa.cyl(0.0105, 0.0105, 0.011, M.alama, 0, 0, 0.007, "z", sw, 6); swa.cyl(0.006, 0.006, 0.008, M.alama, 0, 0, -0.001, "z", sw, 16);
  swa.cyl(0.0085, 0.0085, 0.016, M.plastic, 0, 0, 0.02, "z", sw, 20); swa.box(0.006, 0.0012, 0.008, M.alama, 0, 0, 0.032);
  const fisa = new THREE.Group(); sw.add(fisa); ajutoare(fisa).rbox(0.016, 0.014, 0.014, 0.003, M.plasticGri, 0, 0, 0.038); ajutoare(fisa).tub([[0, 0, 0.045], [0, 0.03, 0.06], [-0.04, 0.12, 0.06], [-0.12, 0.25, 0.1]], 0.0028, M.verde);
  ancore.presUlei = new THREE.Vector3(-0.06, -0.02, 0.17);
  const adapt = new THREE.Group(); adapt.position.set(-0.06, -0.035, 0.137); gM.add(adapt); const ada = ajutoare(adapt);
  ada.cyl(0.0105, 0.0105, 0.01, M.alama, 0, 0, 0.006, "z", adapt, 6); ada.cyl(0.006, 0.006, 0.014, M.crom, 0, 0, 0.018, "z", adapt, 16); ada.cyl(0.009, 0.009, 0.01, M.alama, 0, 0, 0.03, "z", adapt, 6);
  adapt.visible = false;
  // ---------- picăturile care revin în baie (canalele de retur din chiulasă) și particulele de ulei pe trasee
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const TR = [
    { q: "Q", n: 14, c: [V(0.06, -0.232, 0), V(0.09, -0.222, 0), V(PP.x - 0.02, -0.2, 0), V(PP.x, PP.y - 0.03, 0)] },
    { q: "Qm", n: 14, c: [V(PP.x, PP.y + 0.03, 0), V(0.17, -0.09, 0.07), V(0.13, -0.05, 0.12), V(0.11, -0.04, 0.137), V(0.115, -0.02, 0.2), V(0.09, -0.02, 0.2), V(0.08, -0.02, 0.15), V(0.07, -0.016, 0.118), V(0.05, YG, ZG)] },
    { q: "Qm", n: 30, c: [V(0.05, YG, ZG), V(-0.215, YG, ZG)] },
    ...MAL.map(x => ({ q: "Qm", f: 0.18, n: 3, c: [V(x, YG, ZG), V(x, -0.004, 0.06), V(x, 0, 0.027)] })),
    { q: "Qm", f: 0.25, n: 12, c: [V(-0.215, YG, ZG), V(-0.218, 0.12, 0.1), V(-0.218, 0.3, 0.075), V(-0.215, 0.356, 0.032)] },
    ...[-1, 1].map(d => ({ q: "Qm", f: 0.12, n: 14, c: [V(-0.215, 0.356, d * 0.032), V(0.21, 0.356, d * 0.032)] })),
    { q: "Qr", n: 6, c: [V(PP.x, YB - 0.006, ZB + 0.006), V(PP.x, YB - 0.03, ZB + 0.01), V(PP.x, PP.y - 0.03, 0.03), V(PP.x, PP.y - 0.034, 0.0)] }
  ];
  let NP = 0; TR.forEach(t => { t.curba = new THREE.CatmullRomCurve3(t.c, false, "centripetal"); t.L = t.curba.getLength(); t.s = Array.from({ length: t.n }, (_, k) => k / t.n); NP += t.n; });
  const mPart = new THREE.MeshBasicMaterial({ color: 0xfff1b8 });
  const part = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0032, 8, 6), mPart, NP); gG.add(part);
  const pic = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0028, 8, 6), mUlei, 40); I.add(pic); const picS = [];
  // marcăm piesele interioare (nu se estompează și nu se secționează)
  [I, baie, gP, gS, gSo, gF, gG, gL, gC, gM].forEach(o => o.traverse(m => { if (m.isMesh && !m.userData.carcasa) m.userData.interior = true; }));
  came.parent.remove(came); gC.add(came);
  const mat4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sc1 = new THREE.Vector3(1, 1, 1), sc0 = new THREE.Vector3(0, 0, 0);

  /** actualizarea: u = { Q, Qm, Qr (debite relative 0…1), desch (supapa 0…1), p [bar], senzor, man, curge } ; vis = rotația afișată a arborelui [rad] */
  return function (u, dt, vis, merge) {
    st.th += vis; const th = st.th, thD = th * 180 / Math.PI;
    arb.rotation.x = -th;
    XC.forEach((x, i) => {
      const s = i === 0 || i === 3 ? 1 : -1, yP = s * R * Math.cos(th), zP = -s * R * Math.sin(th), yb = yP + Math.sqrt(L * L - zP * zP);
      piston[i].position.y = yb; biela[i].position.set(x, yP, zP); biela[i].rotation.x = Math.atan2(-zP, yb - yP);
      const phi = ((thD - OF_CIL[i]) % 720 + 720) % 720; st.flacari[i].material.opacity = merge && phi < 45 ? 0.85 * (1 - phi / 45) : 0;
    });
    came.rotation.x = -th / 2;
    supape.forEach(o => { const phi = ((thD - OF_CIL[o.i]) % 720 + 720) % 720, l = 0.0075 * cursaSupapa(phi, o.c); o.v.position.y = -l; o.arc.scale.y = 0.036 - l; o.arc.position.y = 0.28 + 0.002; });
    // pompa: raportul de transmisie al lanțului 22/28; roțile în angrenare (sens opus, decalate cu jumătate de pas)
    const thP = th * rLant / 0.028; roti[0].rotation.z = thP; roti[1].rotation.z = -thP + Math.PI / 10; rotP.rotation.x = -thP;
    zale.count = 60; for (let k = 0; k < 60; k++) { const p = cLant.getPointAt(((k / 60 + th * rLant / cLant.getLength()) % 1 + 1) % 1); mat4.compose(p, q0, sc1); zale.setMatrixAt(k, mat4); } zale.instanceMatrix.needsUpdate = true;
    // supapa de siguranță: plonjorul se deplasează, arcul se comprimă
    const d = u.desch || 0; plj.position.z = ZB - 0.006 + 0.014 * d; arcS.position.z = ZB + d * 0.014; arcS.scale.z = (0.031 - 0.014 * d) / 1;
    retur.material.emissiveIntensity = 0.3 + 0.9 * d;
    // pelicula portantă din lagăre (strălucește cu presiunea) și nivelul din baie (scade când uleiul circulă)
    filme.forEach(f => { f.material.emissiveIntensity = Math.min(1.2, (u.p || 0) / 4); f.material.opacity = (u.p || 0) > 0.05 ? 0.9 : 0.35; });
    st.circ += ((u.Q > 0.01 ? Math.min(1, u.Q * 2.2) : 0) - st.circ) * (1 - Math.exp(-dt / (u.Q > 0.01 ? 3 : 15)));
    const yN = -0.17 - 0.016 * st.circ; ulei.scale.y = yN + 0.255; ulei.position.y = -0.255 + (yN + 0.255) / 2;
    // particulele (viteza ∝ debitul ramurii; aceeași încetinire ca rotația)
    const k30 = 0.21, fl = { Q: u.Q || 0, Qm: u.Qm || 0, Qr: u.Qr || 0 };
    let j = 0; TR.forEach((t, it) => { const q = fl[t.q] * (t.f || 1), v = k30 * q * (t.q === "Qr" ? 0.6 : 1) / Math.max(0.15, t.f || 1), pl = u.plin ? u.plin[it] ?? 1 : 1;
      t.s.forEach((s0, k) => { const s = (s0 + v * dt / t.L) % 1; t.s[k] = s; const p = t.curba.getPointAt(s); mat4.compose(p, q0, q > 0.003 && s <= pl ? sc1 : sc0); part.setMatrixAt(j++, mat4); }); });
    part.instanceMatrix.needsUpdate = true;
    // picăturile din chiulasă și de pe arborele cotit
    if ((u.Qm || 0) > 0.02 && Math.random() < u.Qm * dt * 40) picS.push({ p: V(Math.random() < 0.5 ? -0.225 : 0.215, 0.25, (Math.random() - 0.5) * 0.15), v: 0 });
    if ((u.Qm || 0) > 0.02 && Math.random() < u.Qm * dt * 50) { const i = Math.floor(Math.random() * 4); picS.push({ p: V(XC[i] + (Math.random() - 0.5) * 0.05, -0.03, (Math.random() - 0.5) * 0.06), v: 0 }); }
    if (!(u.Q > 0.01) && st.circ > 0.05 && Math.random() < st.circ * dt * 8) picS.push({ p: V(Math.random() < 0.5 ? -0.225 : 0.215, 0.25, 0), v: 0 });
    picS.forEach(p => { p.v += 9.81 * dt * 0.08; p.p.y -= p.v * dt; }); for (let k = picS.length - 1; k >= 0; k--) if (picS[k].p.y < yN || picS.length > 40) picS.splice(k, 1);
    pic.count = picS.length; picS.forEach((p, k) => { mat4.compose(p.p, q0, sc1); pic.setMatrixAt(k, mat4); }); pic.instanceMatrix.needsUpdate = true;
    // manocontactul: deșurubarea (≈ 6 ture) și montarea adaptorului manometrului
    st.sw += ((u.senzor === false ? 1 : 0) - st.sw) * Math.min(1, dt / 0.5); if (Math.abs(st.sw - (u.senzor === false ? 1 : 0)) < 0.003) st.sw = u.senzor === false ? 1 : 0;
    st.ad += ((u.man ? 1 : 0) - st.ad) * Math.min(1, dt / 0.5); if (Math.abs(st.ad - (u.man ? 1 : 0)) < 0.003) st.ad = u.man ? 1 : 0;
    sw.visible = st.sw < 0.99; sw.position.z = 0.137 + st.sw * 0.06; sw.rotation.z = st.sw * Math.PI * 12; fisa.visible = st.sw < 0.02;
    adapt.visible = st.ad > 0.01; adapt.position.z = 0.137 + (1 - st.ad) * 0.05; adapt.rotation.z = (1 - st.ad) * Math.PI * 10;
    return { sw: st.sw, ad: st.ad };
  };
}

/* ======================================================================= varianta diesel common-rail (standul 1.5 dCi, Delphi DCR)
   pe aceeași machetă: pompa de înaltă presiune Delphi DFP1 cu pompa de transfer și regulatorul IMV (antrenată de cureaua de
   distribuție), rampa comună cu senzorul de presiune, injectoarele cu electrovalvă și conductele de înaltă presiune, returul,
   filtrul de motorină cu separator de apă, rezervorul de pe stand, bujiile incandescente. */
function sistemCR(g, M, XC, grupC, ancore, conectori) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mJP = new THREE.MeshStandardMaterial({ color: 0x2f7fd0, emissive: 0x0a2a55, emissiveIntensity: 0.4, roughness: 0.3 });
  const mRet = new THREE.MeshStandardMaterial({ color: 0x5aa0d8, roughness: 0.4 });
  const mIP = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, roughness: 0.22, metalness: 0.95, emissive: 0xff2a00, emissiveIntensity: 0 });
  const mMot = new THREE.MeshStandardMaterial({ color: 0xd8b04a, roughness: 0.3, transparent: true, opacity: 0.85 });
  fixEnv({ mJP, mRet, mIP });
  // rezervorul (pe cadrul standului), filtrul cu separator de apă
  const gR = grupC("rez", "Rezervorul de combustibil"); const ra = ajutoare(gR);
  ra.rbox(0.26, 0.14, 0.2, 0.02, M.plastic, -0.56, -0.6, 0.38); ra.cyl(0.03, 0.03, 0.03, M.plasticGri, -0.5, -0.515, 0.38, "y", gR);
  ancore.rez = V(-0.56, -0.52, 0.42);
  const gF = grupC("filtru", "Filtrul de motorină cu separator de apă"); const fa = ajutoare(gF);
  fa.cyl(0.04, 0.04, 0.13, M.alu, 0.46, 0.12, 0.34, "y", gF, 32); fa.cyl(0.045, 0.045, 0.03, M.plastic, 0.46, 0.2, 0.34, "y", gF, 32);
  fa.cyl(0.006, 0.006, 0.02, new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 }), 0.46, 0.05, 0.34, "y", gF);   // bușonul de purjare a apei
  conectori.filtru = fa.rbox(0.02, 0.016, 0.02, 0.004, M.plasticGri, 0.49, 0.21, 0.34); ancore.filtru = V(0.46, 0.23, 0.34);
  // pompa de înaltă presiune (corpul din aluminiu, axul cu roata curelei de distribuție), pompa de transfer, IMV
  const PX = 0.195, PY = 0.3, PZ = 0.2;
  const gP = grupC("pip", "Pompa de înaltă presiune Delphi DFP1"); const pa = ajutoare(gP);
  pa.cyl(0.038, 0.038, 0.07, M.alu, PX, PY, PZ, "x", gP, 40); pa.rbox(0.05, 0.06, 0.06, 0.008, M.aluMat, PX - 0.01, PY + 0.035, PZ);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; pa.cyl(0.008, 0.008, 0.02, M.alu, PX - 0.005, PY + Math.cos(a) * 0.04, PZ + Math.sin(a) * 0.04, "x", gP, 6); }   // cele 3 pistonașe radiale (capacele)
  pa.cyl(0.03, 0.03, 0.012, M.plastic, 0.245, PY, PZ, "x", gP, 32);                                                                                // roata curelei (în carcasa distribuției)
  ancore.pip = V(PX, PY + 0.07, PZ + 0.03);
  const gT = grupC("pjp", "Pompa de transfer (joasă presiune)"); ajutoare(gT).cyl(0.03, 0.03, 0.03, M.aluMat, PX - 0.048, PY, PZ, "x", gT, 32); ancore.pjp = V(PX - 0.06, PY - 0.02, PZ + 0.04);
  const gI = grupC("imv", "Regulatorul de debit IMV"); const ia = ajutoare(gI);
  ia.cyl(0.012, 0.012, 0.03, M.plastic, PX - 0.01, PY + 0.08, PZ, "y", gI, 20); conectori.imv = ia.rbox(0.02, 0.016, 0.022, 0.004, M.plasticGri, PX - 0.01, PY + 0.1, PZ + 0.01); ancore.imv = V(PX - 0.01, PY + 0.11, PZ + 0.01);
  // rampa comună (oțel forjat) cu racordurile și senzorul de presiune
  const RY = 0.48, RZ = 0.165;
  const gRa = grupC("rampa", "Rampa comună"); const rpa = ajutoare(gRa);
  const rampa = rpa.cyl(0.014, 0.014, 0.36, mIP, -0.01, RY, RZ, "x", gRa, 32);
  XC.forEach(x => rpa.cyl(0.009, 0.009, 0.02, M.otel, x, RY - 0.016, RZ - 0.004, "y", gRa, 6));
  for (const x of [-0.12, 0.1]) { rpa.box(0.016, 0.05, 0.02, M.aluMat, x, RY - 0.03, RZ - 0.02); }                                             // suporturile pe chiulasă
  ancore.rampa = V(0.02, RY + 0.02, RZ);
  const gS = grupC("senz", "Senzorul de presiune din rampă"); const sa = ajutoare(gS);
  sa.cyl(0.011, 0.011, 0.03, M.otel, -0.205, RY, RZ, "x", gS, 6); sa.cyl(0.01, 0.01, 0.02, M.plastic, -0.23, RY, RZ, "x", gS, 20); conectori.senz = sa.rbox(0.018, 0.02, 0.022, 0.004, M.plasticGri, -0.248, RY, RZ);
  ancore.senz = V(-0.24, RY + 0.02, RZ);
  // conductele de înaltă presiune: pompă → rampă, rampă → injectoare
  const ip = [];
  ip.push(ajutoare(g).tub([[PX - 0.01, PY + 0.065, PZ - 0.02], [PX - 0.02, 0.43, PZ - 0.02], [0.19, RY, RZ + 0.01], [0.17, RY, RZ]], 0.0042, mIP));
  // injectoarele Delphi cu electrovalvă (verticale, pe partea admisiei a chiulasei)
  // injectoarele Delphi cu electrovalvă: ușor înclinate, prin capacul chiulasei, cu duza (6 orificii) în centrul camerei de ardere
  const inj = [], jeturi = [], IT = 0.256, IZT = 0.024, IZS = 0.062, ISUS = 0.49;
  const gJ = grupC("inj", "Injectoarele Delphi cu electrovalvă");
  const sus = V(0, ISUS - IT, IZS - IZT).normalize(), qJ = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), sus);
  // geometria unui jet (con cu vârful în duză, orientat după −y) și cele 6 direcții ale orificiilor (unghiul conului de pulverizare 150°)
  const gCon = new THREE.ConeGeometry(1, 1, 14, 1, true); gCon.translate(0, -0.5, 0);   // vârful în origine, corpul spre −y
  // transparența jetului: lichid compact la ieșirea din orificiu, picături tot mai rare spre vârf (atomizare)
  const cG = document.createElement("canvas"); cG.width = 4; cG.height = 64; { const x = cG.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(0.5, "#f0f0f0"); gr.addColorStop(1, "#a0a0a0"); x.fillStyle = gr; x.fillRect(0, 0, 4, 64); }
  const texJ = new THREE.CanvasTexture(cG);
  const DIR = Array.from({ length: 6 }, (_, k) => { const fi = k / 6 * Math.PI * 2 + 0.26, a = 70 * Math.PI / 180; return V(Math.sin(a) * Math.cos(fi), -Math.cos(a), Math.sin(a) * Math.sin(fi)); });
  XC.forEach((x, i) => {
    const J = new THREE.Group(); J.position.set(x, IT, IZT); J.quaternion.copy(qJ); gJ.add(J); const ja = ajutoare(J);
    ja.cyl(0.0035, 0.0045, 0.022, M.otel, 0, 0.011, 0, "y", J, 16);                                                                   // duza
    ja.cyl(0.0085, 0.0085, 0.15, M.otel, 0, 0.097, 0, "y", J, 24);                                                                    // corpul (portinjectorul)
    ja.cyl(0.013, 0.013, 0.028, M.crom, 0, 0.186, 0, "y", J, 6);                                                                      // piulița de prindere
    const sol = ja.cyl(0.012, 0.012, 0.024, M.plastic.clone(), 0, 0.212, 0, "y", J, 20);                                              // electrovalva
    conectori["cr" + (i + 1)] = ja.rbox(0.02, 0.014, 0.02, 0.004, M.plasticGri, 0, 0.23, -0.012);
    ja.cyl(0.0042, 0.0042, 0.02, M.otel, 0.012, 0.18, 0, "x", J, 10);                                                                 // racordul de înaltă presiune
    J.updateMatrixWorld(true); const intr = J.localToWorld(V(0.022, 0.18, 0));
    ip.push(ajutoare(g).tub([[x, RY - 0.025, RZ - 0.004], [x + 0.012, RY - 0.045, RZ - 0.03], [intr.x + 0.004, intr.y + 0.004, intr.z + 0.02], [intr.x, intr.y, intr.z]], 0.0035, mIP));
    inj.push(sol);
    // jetul de combustibil pulverizat (6 conuri), în camera de ardere, sub vârful duzei
    const P = new THREE.Group(); P.position.set(x, IT - 0.003, IZT); I_ADD(P);
    const mJ = new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: texJ, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mJ2 = new THREE.MeshBasicMaterial({ color: 0x9fd0ff, alphaMap: texJ, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mN = new THREE.MeshBasicMaterial({ color: 0xbfd8ee, transparent: true, opacity: 0, depthWrite: false });
    const conuri = DIR.map(d => { const m = new THREE.Mesh(gCon, mJ); m.quaternion.setFromUnitVectors(V(0, -1, 0), d); P.add(m); const e = new THREE.Mesh(gCon, mJ2); e.scale.set(2.3, 1.08, 2.3); m.add(e); return m; });
    const nor = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mN); nor.scale.set(0, 0, 0); P.add(nor);                          // norul de vapori după injecție
    jeturi.push({ P, conuri, mJ, mJ2, mN, nor });
  });
  function I_ADD(o) { g.add(o); }
  ancore.inj = V(XC[0], 0.51, IZS);
  // returul injectoarelor (furtune înlănțuite pe electrovalve) și al pompei, spre rezervor; turul de joasă presiune: rezervor → filtru → pompa de transfer
  const ret = ajutoare(g).tub([[XC[0] - 0.016, ISUS - 0.03, IZS - 0.004], ...XC.map(x => [x + 0.01, ISUS - 0.012, IZS - 0.016]), [0.2, 0.47, 0.1], [0.32, 0.3, 0.2], [0.4, 0.0, 0.35], [-0.2, -0.4, 0.42], [-0.5, -0.52, 0.4]], 0.0032, mRet);
  const tur1 = ajutoare(g).tub([[-0.6, -0.52, 0.36], [-0.3, -0.45, 0.45], [0.3, -0.2, 0.42], [0.46, 0.0, 0.36], [0.46, 0.05, 0.34]], 0.0045, mJP);
  const tur2 = ajutoare(g).tub([[0.46, 0.2, 0.32], [0.38, 0.32, 0.28], [0.25, 0.31, 0.24], [PX - 0.064, PY, PZ]], 0.0045, mJP);
  // bujiile incandescente (pe partea evacuării) cu bara de alimentare
  { const { cyl, tub } = ajutoare(g); XC.forEach(x => { cyl(0.004, 0.004, 0.03, M.otel, x, 0.385, -0.07, "y"); cyl(0.006, 0.006, 0.008, M.crom, x, 0.402, -0.07, "y"); });
    tub(XC.map(x => [x, 0.408, -0.07]), 0.0022, M.cupru); }
  // kitul de măsurare a returului: furtunele transparente de pe racordurile de retur ale fiecărui injector spre eprubetele gradate (suport pe partea admisiei)
  const gK = new THREE.Group(); gK.visible = false; g.add(gK); const ka = ajutoare(gK), KY = 0.6, KZ = 0.3, KH = 0.13, KR = 0.011;
  const mSt = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.002, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const mFT = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.2, transmission: 0.6, transparent: true, opacity: 0.6 });
  const mMotK = new THREE.MeshStandardMaterial({ color: 0xd8c25a, roughness: 0.2, transparent: true, opacity: 0.85 });
  ka.box(0.36, 0.012, 0.05, M.otel, (XC[0] + XC[3]) / 2, KY - 0.006, KZ); ka.box(0.36, 0.012, 0.012, M.otel, (XC[0] + XC[3]) / 2, KY + KH * 0.75, KZ - 0.02);
  [XC[0] - 0.05, XC[3] + 0.05].forEach(x => ka.box(0.01, 0.4, 0.01, M.otel, x, KY - 0.2 + 0.07, KZ - 0.02));
  const kitNiv = XC.map((x, i) => {
    ka.cyl(KR, KR, KH, mSt, x, KY + KH / 2, KZ, "y", gK, 24).castShadow = false;
    for (let k = 1; k <= 6; k++) ka.box(k % 2 ? 0.006 : 0.01, 0.0008, 0.0008, M.plastic, x - KR * 0.4, KY + k * KH / 6.6, KZ + KR + 0.0004);
    const liq = ka.cyl(KR - 0.0012, KR - 0.0012, 1, mMotK, x, KY, KZ, "y", gK, 24); liq.scale.y = 0.0001; liq.castShadow = false;
    ka.tub([[x + 0.01, ISUS - 0.012, IZS - 0.016], [x + 0.012, ISUS + 0.03, IZS + 0.02], [x + 0.004, KY + KH + 0.06, KZ - 0.01], [x, KY + KH + 0.012, KZ]], 0.0028, mFT);
    return liq; });
  ancore.kitRetur = V((XC[0] + XC[3]) / 2, KY + KH + 0.03, KZ);
  gK.traverse(m => { if (m.isMesh) m.userData.interior = true; });
  // particulele de combustibil pe trasee
  const TR = [
    { q: "jp", n: 18, curba: new THREE.CatmullRomCurve3([V(-0.6, -0.52, 0.36), V(-0.3, -0.45, 0.45), V(0.3, -0.2, 0.42), V(0.46, 0.0, 0.36), V(0.46, 0.05, 0.34), V(0.46, 0.2, 0.32), V(0.38, 0.32, 0.28), V(0.25, 0.31, 0.24), V(PX - 0.064, PY, PZ)]) },
    { q: "ip", n: 8, curba: new THREE.CatmullRomCurve3([V(PX - 0.01, PY + 0.065, PZ - 0.02), V(PX - 0.02, 0.43, PZ - 0.02), V(0.19, RY, RZ + 0.01), V(0.17, RY, RZ)]) },
    { q: "ip", n: 18, curba: new THREE.CatmullRomCurve3([V(0.17, RY, RZ), V(-0.19, RY, RZ)]) },
    { q: "ret", n: 22, curba: new THREE.CatmullRomCurve3([V(XC[0] - 0.016, ISUS - 0.03, IZS - 0.004), ...XC.map(x => V(x + 0.01, ISUS - 0.012, IZS - 0.016)), V(0.2, 0.47, 0.1), V(0.32, 0.3, 0.2), V(0.4, 0.0, 0.35), V(-0.2, -0.4, 0.42), V(-0.5, -0.52, 0.4)]) }
  ];
  let NP = 0; TR.forEach(t => { t.L = t.curba.getLength(); t.s = Array.from({ length: t.n }, (_, k) => k / t.n); NP += t.n; });
  const part = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0034, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); g.add(part);
  // piesele sistemului rămân opace în modurile „transparent” / „secționat” ale machetei
  [gR, gF, gP, gT, gI, gRa, gS, gJ, ...ip, ret, tur1, tur2, part, ...jeturi.map(j => j.P)].forEach(o => o.traverse(m => { if (m.isMesh) m.userData.interior = true; }));
  const cul = { jp: new THREE.Color(0x9fd2ff), ip: new THREE.Color(0xff6a3d), ret: new THREE.Color(0xcfe6ff) };
  let j0 = 0; TR.forEach(t => { for (let k = 0; k < t.n; k++) part.setColorAt(j0++, cul[t.q]); });
  const mat4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), s0 = new THREE.Vector3(0, 0, 0);
  let th = 0;
  /** u = { p (bar), imv (%), n (rot/min), merge } */
  return function (u, dt, vis) {
    th += vis; const thD = th * 180 / Math.PI, p = u.p || 0, merge = !!u.merge;
    mIP.emissiveIntensity = Math.min(0.55, p / 2800); mIP.emissive.setHSL(0.03, 1, 0.45);
    // injecțiile ciclului: u.prof = [[start (°RAC față de PMI), durată (°RAC)], …] (pilot, principală, post); implicit pilot + principală
    const prof = u.prof && u.prof.length ? u.prof : [[-7, 1.5], [-2, 5]], inject = merge || !!u.antrenare;
    const Lmax = Math.min(0.036, 0.034 * Math.sqrt(Math.max(p, 50) / 1000)), FADE = 26;
    inj.forEach((m, i) => {
      const phi = ((thD - OF_CIL[i]) % 720 + 720) % 720; let act = false, L = 0, op = 0, nor = 0;
      if (inject) prof.forEach(([a0, d0]) => {
        const d = (((phi - (720 + a0)) % 720) + 720) % 720, dur = Math.max(1.2, d0), k = Math.min(1, Math.sqrt(dur / 5));
        if (d < dur) { act = true; L = Math.max(L, Lmax * k * Math.min(1, (d + 0.6) / Math.max(1.5, dur * 0.6))); op = Math.max(op, 0.95); }
        else if (d < dur + FADE) { const f = (d - dur) / FADE; L = Math.max(L, Lmax * k * (1 + 0.25 * f)); op = Math.max(op, 0.95 * (1 - f) * (1 - f)); nor = Math.max(nor, Math.sin(Math.PI * f) * k); }
      });
      m.material.emissive = m.material.emissive || new THREE.Color(0); m.material.emissive.setHex(act ? 0x33ff66 : 0); m.material.emissiveIntensity = act ? 0.9 : 0;
      const j = jeturi[i], w = Math.max(0.0001, L * (act ? 0.13 : 0.18));
      j.conuri.forEach(c => { c.visible = L > 0.0005; c.scale.set(w, Math.max(0.0001, L), w); }); j.mJ.opacity = op; j.mJ2.opacity = op * 0.55;
      j.mN.opacity = 0.35 * nor; j.nor.scale.setScalar(nor > 0.01 ? 0.012 + 0.02 * nor : 0.0001); j.nor.position.y = -0.008;
    });
    const v = { jp: 0.05 + 0.25 * (u.n || 0) / 4000, ip: 0.03 + 0.12 * (u.n || 0) / 4000 * (u.imv || 50) / 50, ret: 0.04 + 0.08 * (u.n || 0) / 4000 };
    let j = 0; TR.forEach(t => { const on = (u.n || 0) > 20 && (u.contact !== false); t.s.forEach((s0_, k) => { const s = (s0_ + v[t.q] * dt / t.L) % 1; t.s[k] = s; mat4.compose(t.curba.getPointAt(s), q0, on ? s1 : s0); part.setMatrixAt(j++, mat4); }); });
    part.instanceMatrix.needsUpdate = true;
    const K = u.kit || {}; gK.visible = !!K.vizibil; ret.visible = !K.vizibil;
    if (K.vizibil) kitNiv.forEach((l, i) => { const h = Math.max(0.0001, Math.min(1, ((K.V || [])[i] || 0) / (K.max || 30)) * KH * 0.92); l.scale.y = h; l.position.y = KY + h / 2; });
    return { th };
  };
}

/* ======================================================================= circuitul de răcire vizibil (macheta transparentă / secționată)
   pompa de apă cu rotorul, cămașa de apă din bloc și chiulasă, termostatul cu element de ceară în carcasa lui, circuitul mic (bypass),
   furtunul superior, radiatorul, furtunul inferior, radiatorul de încălzire, vasul de expansiune; lichidul curge cu debitul și
   temperatura din model (culoarea particulelor: albastru = rece … roșu = fierbinte). */
function interiorRacire(g, M, rac, grupC, ancore, rot, carcT) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), ref = rac.ref; g.updateMatrixWorld(true);
  const { add, box, cyl, tub } = ajutoare(g);
  const marc = o => o.traverse(m => { if (m.isMesh) m.userData.interior = true; });
  const mGeam = new THREE.MeshStandardMaterial({ color: 0xc3c8cd, roughness: 0.4, metalness: 0.7, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const mCam = new THREE.MeshStandardMaterial({ color: 0x5fa8e0, roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false });
  // termostatul (în carcasa transparentă): talerul supapei, capsula cu ceară, arcul, rama, supapa de aerisire
  const gT = grupC("termostat", "Termostatul cu element de ceară"); const ta = ajutoare(gT);
  ta.cyl(0.024, 0.024, 0.003, M.otel, -0.3, 0.31, 0.04, "x", gT, 32);                                                        // flanșa (scaunul)
  const taler = ta.cyl(0.019, 0.019, 0.003, M.alama, -0.298, 0.31, 0.04, "x", gT, 32);                                      // talerul supapei
  const capsula = ta.cyl(0.009, 0.009, 0.026, M.alama, -0.28, 0.31, 0.04, "x", gT, 24);                                   // capsula cu ceară
  [-1, 1].forEach(d => ta.box(0.03, 0.003, 0.004, M.otel, -0.29, 0.31 + d * 0.016, 0.04));                                  // rama
  const arcT = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 41 }, (_, k) => V(k / 40, 0.014 * Math.cos(k * 0.9), 0.014 * Math.sin(k * 0.9)))), 80, 0.0012, 5), M.otel), gT);
  arcT.position.set(-0.296, 0.31, 0.04);
  ta.cyl(0.002, 0.002, 0.006, M.otel, -0.3, 0.33, 0.04, "x", gT, 8);                                                        // supapa de aerisire (bila)
  ancore.termostat = V(-0.29, 0.35, 0.06);
  // pompa de apă: rotorul cu palete în corpul pompei (antrenat de cureaua de accesorii)
  const gP = grupC("pompaApa", "Pompa de apă"); const rotor = new THREE.Group(); rotor.position.set(0.262, 0.215, -0.075); gP.add(rotor);
  ajutoare(rotor).cyl(0.03, 0.03, 0.003, M.otel, 0, 0, 0, "x", rotor, 32);
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const p = ajutoare(rotor).box(0.01, 0.024, 0.003, M.otel, -0.006, Math.cos(a) * 0.016, Math.sin(a) * 0.016); p.rotation.x = -a + 0.5; }
  ancore.pompaApa = V(0.27, 0.27, -0.075);
  // cămașa de apă (canale în bloc și chiulasă) și circuitul mic (bypass) spre aspirația pompei
  const cam = [[0.25, 0.2, -0.1], [0.2, 0.13, -0.085], [0.0, 0.15, -0.085], [-0.2, 0.16, -0.08], [-0.225, 0.2, 0.0], [-0.2, 0.22, 0.08], [0.0, 0.19, 0.085], [0.19, 0.2, 0.08], [0.2, 0.275, 0.06], [0.0, 0.3, 0.07], [-0.2, 0.31, 0.06], [-0.255, 0.31, 0.045]];
  const camasa = tub(cam, 0.011, mCam);
  const byp = [[-0.27, 0.285, 0.02], [-0.27, 0.22, -0.06], [-0.18, 0.06, -0.15], [0.1, 0.06, -0.16], [0.24, 0.15, -0.15], [ref.P.x, ref.P.y, ref.P.z]];
  const gB = grupC("bypass", "Circuitul mic (bypass)"); ajutoare(gB).tub(byp, 0.008, M.cauciuc); ancore.bypass = V(0.0, 0.08, -0.17);
  // grupuri selectabile: radiatorul, electroventilatorul, vasul de expansiune, furtunurile, radiatorul de încălzire
  const gR = grupC("radiator", "Radiatorul"); gR.attach(ref.nuc); ancore.radiator = ref.R.localToWorld(V(0, ref.H / 2 + 0.03, 0.03));
  const gV = grupC("ventilator", "Electroventilatorul"); gV.attach(rot.vent); ancore.ventilator = ref.R.localToWorld(V(0.0, 0.0, 0.13));
  const gX = grupC("vas", "Vasul de expansiune cu bușonul"); gX.attach(ref.vas); ancore.vas = ref.capVas.clone();
  const gS = grupC("furtSup", "Furtunul superior (tur radiator)"); gS.attach(ref.sup); { const p = ref.supPts[2]; ancore.furtSup = p.clone().add(V(0, 0.04, 0)); }
  const gI = grupC("furtInf", "Furtunul inferior (retur radiator)"); gI.attach(ref.inf); { const p = ref.infPts[2]; ancore.furtInf = p.clone().add(V(0, 0.03, 0)); ancore.ir = ref.infPts[1].clone(); }
  const gH = grupC("incalzire", "Radiatorul de încălzire (habitaclu)"); gH.attach(ref.inc); ancore.incalzire = ref.inc.getWorldPosition(V()).add(V(0, 0.1, 0));
  [gT, gP, gR, gV, gX, gH].forEach(marc); camasa.userData.interior = true; gB.traverse(m => { if (m.isMesh) m.userData.interior = true; });
  // traseele lichidului (particule)
  const RW = v => ref.R.localToWorld(V(...v));
  const zF = 0.03, coreP = [RW([ref.tL + 0.03, ref.H / 2 - 0.035, zF]), RW([0, ref.H / 4, zF]), RW([0, -ref.H / 4, zF]), RW([ref.tD - 0.03, -ref.H / 2 + 0.035, zF])];
  const TR = [
    { k: "Q", n: 34, tA: "Tr", tB: "Tm", c: new THREE.CatmullRomCurve3([ref.P.clone(), ...cam.map(p => V(...p))]) },
    { k: "B", n: 14, tA: "Tm", tB: "Tm", c: new THREE.CatmullRomCurve3(byp.map(p => V(...p))) },
    { k: "X", n: 16, tA: "Tm", tB: "Tm", c: new THREE.CatmullRomCurve3(ref.supPts.map(p => p.clone())) },
    { k: "X", n: 16, tA: "Tm", tB: "Tr", c: new THREE.CatmullRomCurve3([ref.IN.clone(), ...coreP, ref.OUT.clone()]) },
    { k: "X", n: 16, tA: "Tr", tB: "Tr", c: new THREE.CatmullRomCurve3(ref.infPts.map(p => p.clone())) },
    { k: "H", n: 10, tA: "Tm", tB: "Th", c: new THREE.CatmullRomCurve3(ref.incTur.map(p => V(...p))) },
    { k: "H", n: 10, tA: "Th", tB: "Th", c: new THREE.CatmullRomCurve3(ref.incRet.map(p => V(...p))) }
  ];
  let NP = 0; TR.forEach(t => { t.L = t.c.getLength(); t.s = Array.from({ length: t.n }, (_, k) => k / t.n); NP += t.n; });
  const part = new THREE.InstancedMesh(new THREE.SphereGeometry(0.005, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); part.userData.interior = true; g.add(part);
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s1 = V(1, 1, 1), s0 = V(0, 0, 0), col = new THREE.Color();
  const culT = T => col.setHSL(0.62 * (1 - Math.max(0, Math.min(1, (T - 20) / 75))), 0.9, 0.5);
  let x0 = 0;
  /** u = { Tm, Tr, x (deschiderea 0…1), Q (debitul pompei 0…1), capVas (bușonul montat) } */
  return function (u, dt) {
    const x = u.x || 0, Q = u.Q || 0, Tm = u.Tm ?? 20, Tr = u.Tr ?? 20, Th = Tm - 8;
    taler.position.x = -0.298 + 0.009 * x; capsula.position.x = -0.28 + 0.002 * x; arcT.scale.x = 0.018 - 0.006 * x; arcT.position.x = -0.296 + 0.009 * x;
    rotor.rotation.x = rot.pompa ? rot.pompa.rotation.x : rotor.rotation.x;
    if (ref.busV) ref.busV.visible = u.capVas !== false;
    const fl = { Q: Q, B: Q * (1 - 0.85 * x), X: Q * (0.005 + 0.995 * x), H: Q * 0.15 }, T = { Tm, Tr, Th };
    let j = 0;
    TR.forEach(t => { const v = 0.3 * fl[t.k]; t.s.forEach((s, k) => { const sN = (s + v * dt / t.L) % 1; t.s[k] = sN;
      m4.compose(t.c.getPointAt(sN), q0, fl[t.k] > 0.002 ? s1 : s0); part.setMatrixAt(j, m4); part.setColorAt(j, culT(T[t.tA] + (T[t.tB] - T[t.tA]) * sN)); j++; }); });
    part.instanceMatrix.needsUpdate = true; if (part.instanceColor) part.instanceColor.needsUpdate = true;
    return {};
  };
}

/* ======================================================================= injecția multipunct secvențială: jeturile de benzină în poarta de admisie
   (2 jeturi înguste pe injector, îndreptate spre talerul supapei de admisie), exact în fereastra de injecție a fiecărui cilindru:
   injecția se termină înainte de deschiderea supapei de admisie (≈ 330 °RAC în ciclu), durata = t_i·n·6 [°RAC]. */
function pulverizareMPI(g, mpi) {
  const cG = document.createElement("canvas"); cG.width = 4; cG.height = 64; { const x = cG.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(0.5, "#eaeaea"); gr.addColorStop(1, "#7a7a7a"); x.fillStyle = gr; x.fillRect(0, 0, 4, 64); }
  const tex = new THREE.CanvasTexture(cG), gCon = new THREE.ConeGeometry(1, 1, 14, 1, true); gCon.translate(0, -0.5, 0);
  const jet = mpi.map(({ tip, ax }) => {
    const G = new THREE.Group(); G.position.copy(tip); g.add(G);
    const m = new THREE.MeshBasicMaterial({ color: 0xd2ecff, alphaMap: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const m2 = new THREE.MeshBasicMaterial({ color: 0x6fb2e6, alphaMap: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const per = new THREE.Vector3(1, 0, 0).cross(ax).normalize();
    const conuri = [-1, 1].map(s2 => { const d = ax.clone().applyAxisAngle(per, s2 * 0.1); const c = new THREE.Mesh(gCon, m); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d); G.add(c); const e = new THREE.Mesh(gCon, m2); e.scale.set(2.4, 1.05, 2.4); c.add(e); return c; });
    const pel = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshBasicMaterial({ color: 0xe8c860, transparent: true, opacity: 0, depthWrite: false })); G.add(pel);   // pelicula de benzină pe taler
    G.traverse(o => { if (o.isMesh) o.userData.interior = true; });
    return { G, conuri, m, m2, pel };
  });
  let th = 0;
  /** u = { ti [ms], n [rot/min], activ } */
  return function (u, dt, vis) {
    th += vis; const thD = th * 180 / Math.PI, n = u.n || 0, ti = u.activ ? (u.ti || 0) : 0, dur = Math.max(1.5, ti * n * 6 / 1000), FADE = 28, Lm = 0.085;
    jet.forEach((j, i) => {
      const phi = ((thD - OF_CIL[i]) % 720 + 720) % 720, d = (((phi - (330 - dur)) % 720) + 720) % 720;
      let L = 0, op = 0, pl = 0;
      if (ti > 0 && n > 50 && !(u.oprite && u.oprite[i + 1])) { if (d < dur) { L = Lm * Math.min(1, (d + 0.8) / 4); op = 1; } else if (d < dur + FADE) { const f = (d - dur) / FADE; L = Lm * (1 + 0.1 * f); op = (1 - f) * (1 - f); pl = Math.sin(Math.PI * Math.min(1, f * 1.2)); } }
      const w = Math.max(0.0001, L * 0.14);
      j.conuri.forEach(c => { c.visible = L > 0.0005; c.scale.set(w, Math.max(0.0001, L), w); }); j.m.opacity = op; j.m2.opacity = op * 0.6;
      j.pel.position.copy(mpi[i].ax).multiplyScalar(Lm); j.pel.scale.setScalar(pl > 0.01 ? 0.008 + 0.006 * pl : 0.0001); j.pel.material.opacity = 0.5 * pl;
    });
  };
}
/* ======================================================================= turbosuflanta cu geometrie variabilă (VGT) a motorului 1.5 dCi
   carcasa turbinei (fontă, parțial transparentă) cu paletele directoare mobile pe inelul de comandă, roata turbinei, carcasa centrală
   cu lagărele și conductele de ulei (tur din galeria blocului, retur liber în baie), roata și carcasa compresorului, actuatorul
   pneumatic (capsula cu membrană, tija, pârghia) comandat de electrovalva EVRV prin furtunul de depresiune; colectorul de evacuare
   racordat la turbină, țeava de evacuare (downpipe) spre catalizator; aerul: filtrul → compresorul → intercoolerul → corpul clapetei. */
function turbosuflanta(g, M, grupC, ancore) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), { add, box, rbox, cyl, tub } = ajutoare(g);
  const TX = -0.02, TY = 0.15, TZ = -0.37, CX = 0.105;                  // axa turbinei (paralelă cu arborele cotit)
  const mFonta = new THREE.MeshStandardMaterial({ color: 0x6e4429, roughness: 0.85, metalness: 0.35, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, emissive: 0xff3a00, emissiveIntensity: 0 });
  const mAluT = new THREE.MeshStandardMaterial({ color: 0xc3c8cd, roughness: 0.4, metalness: 0.85, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
  const mUlei = new THREE.MeshStandardMaterial({ color: 0xe0a238, emissive: 0x7a4300, emissiveIntensity: 0.3, roughness: 0.25 });
  fixEnv({ mFonta, mAluT, mUlei });
  const gT = grupC("turbo", "Turbosuflanta cu geometrie variabilă");
  const ta = ajutoare(gT);
  const melc = (x, R, r, m) => { const o = add(new THREE.Mesh(new THREE.TorusGeometry(R, r, 16, 48, Math.PI * 1.85), m), gT); o.position.set(x, TY, TZ); o.rotation.y = Math.PI / 2; return o; };
  // turbina: carcasa în spirală, paletele directoare (VGT), roata
  melc(TX, 0.058, 0.026, mFonta); ta.cyl(0.042, 0.042, 0.03, mFonta, TX - 0.006, TY, TZ, "x", gT, 40);
  ta.cyl(0.03, 0.026, 0.05, M.ruginaCald, TX - 0.05, TY, TZ, "x", gT, 32);                                                  // ieșirea axială
  const rotT = new THREE.Group(); rotT.position.set(TX, TY, TZ); gT.add(rotT);
  ajutoare(rotT).cyl(0.009, 0.006, 0.026, M.otel, 0, 0, 0, "x", rotT, 16);
  for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2; const p = ajutoare(rotT).box(0.022, 0.024, 0.0018, M.crom, 0, Math.cos(a) * 0.017, Math.sin(a) * 0.017); p.rotation.x = a + Math.PI / 2; p.rotation.y = 0.35; }
  const palete = [];
  for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2, P0 = new THREE.Group(); P0.position.set(TX + 0.004, TY + Math.cos(a) * 0.036, TZ + Math.sin(a) * 0.036); gT.add(P0);
    const pa = ajutoare(P0).box(0.014, 0.0022, 0.016, M.otel, 0, 0, 0.004); P0.userData.a = a; palete.push(P0); ajutoare(P0).cyl(0.0022, 0.0022, 0.03, M.otel, -0.012, 0, 0, "x", P0, 8); }
  const inel = add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.0025, 6, 48), M.otel), gT); inel.rotation.y = Math.PI / 2; inel.position.set(TX + 0.022, TY, TZ);
  // carcasa centrală cu lagărele (cuzineți flotanți) și arborele
  ta.cyl(0.028, 0.028, 0.06, M.aluMat, 0.045, TY, TZ, "x", gT, 32); ta.cyl(0.005, 0.005, CX - TX, M.crom, (CX + TX) / 2, TY, TZ, "x", gT, 12);
  // compresorul: carcasa în spirală (aluminiu, transparentă), roata, intrarea axială, ieșirea tangențială
  melc(CX, 0.052, 0.024, mAluT); ta.cyl(0.04, 0.04, 0.03, mAluT, CX + 0.008, TY, TZ, "x", gT, 40); ta.cyl(0.03, 0.032, 0.05, M.alu, CX + 0.05, TY, TZ, "x", gT, 32);
  const rotC = new THREE.Group(); rotC.position.set(CX, TY, TZ); gT.add(rotC);
  ajutoare(rotC).cyl(0.004, 0.012, 0.028, M.crom, 0.004, 0, 0, "x", rotC, 16);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const p = ajutoare(rotC).box(0.024, 0.02, 0.0015, M.alu, 0.004, Math.cos(a) * 0.016, Math.sin(a) * 0.016); p.rotation.x = a + Math.PI / 2; p.rotation.y = -0.3; }
  ancore.turbo = V(0.045, TY + 0.06, TZ - 0.02);
  // actuatorul VGT: capsula cu membrană pe suport, tija, pârghia pe axul inelului de comandă; furtunul de depresiune spre EVRV
  const gA = grupC("vgt", "Actuatorul geometriei variabile (VGT)"); const aa = ajutoare(gA);
  aa.cyl(0.034, 0.034, 0.026, M.otel, 0.07, TY - 0.075, TZ - 0.035, "z", gA, 32); aa.cyl(0.026, 0.034, 0.012, M.otel, 0.07, TY - 0.075, TZ - 0.054, "z", gA, 32);
  aa.box(0.03, 0.05, 0.006, M.otel, 0.07, TY - 0.045, TZ - 0.02);                                                          // suportul pe carcasa centrală
  const tija = aa.cyl(0.0025, 0.0025, 0.09, M.crom, 0.02, TY - 0.075, TZ - 0.035, "x", gA, 8);
  const parg = new THREE.Group(); parg.position.set(TX + 0.03, TY - 0.05, TZ - 0.035); gA.add(parg); ajutoare(parg).box(0.008, 0.032, 0.006, M.otel, 0, -0.014, 0);
  aa.tub([[0.07, TY - 0.075, TZ - 0.062], [0.08, TY - 0.06, TZ - 0.1], [0.2, 0.3, -0.3], [0.3, 0.42, -0.2]], 0.0035, M.cauciuc);
  aa.rbox(0.03, 0.026, 0.024, 0.004, M.plastic, 0.3, 0.44, -0.2); ancore.vgt = V(0.07, TY - 0.04, TZ - 0.07);
  // ungerea: tur din galeria blocului (conductă metalică) spre partea de sus a carcasei centrale, retur liber în baie
  const gU = grupC("ungTurbo", "Ungerea turbosuflantei"); const ua = ajutoare(gU);
  const tur = [[0.06, -0.01, -0.136], [0.08, 0.05, -0.2], [0.06, 0.2, -0.3], [0.045, TY + 0.04, TZ + 0.005], [0.045, TY + 0.028, TZ]];
  const ret = [[0.045, TY - 0.028, TZ], [0.045, TY - 0.06, TZ + 0.01], [0.05, -0.03, -0.25], [0.05, -0.13, -0.16], [0.05, -0.15, -0.14]];
  ua.tub(tur, 0.0032, M.otel); ua.tub(ret, 0.007, M.cauciuc); ua.cyl(0.006, 0.006, 0.012, M.alama, 0.045, TY + 0.034, TZ, "y", gU, 6);
  ancore.ungTurbo = V(0.06, 0.22, -0.3);
  // colectorul → intrarea turbinei; ieșirea turbinei → downpipe (racordat la linia de evacuare a standului)
  tub([[0.0, 0.12, -0.25], [0.0, 0.11, -0.3], [TX + 0.01, TY - 0.06, TZ + 0.035]], 0.024, M.ruginaCald);
  const down = [[TX - 0.075, TY, TZ], [-0.13, 0.12, -0.38], [-0.14, 0.0, -0.38], [-0.12, -0.15, -0.37], [-0.15, -0.3, -0.36]];
  tub(down, 0.025, M.ruginaCald);
  // traseul aerului: filtrul → compresorul; compresorul → intercooler (în fața standului) → corpul clapetei
  const aerIn = [[-0.52, 0.47, 0.22], [-0.42, 0.56, 0.05], [-0.1, 0.55, -0.2], [0.2, 0.32, -0.37], [CX + 0.075, TY, TZ]];
  tub(aerIn, 0.03, M.cauciuc, g, 120);
  const iesC = [[CX, TY + 0.075, TZ - 0.02], [CX + 0.05, TY + 0.12, TZ - 0.08], [0.32, 0.12, -0.48], [0.42, -0.1, -0.5]];
  tub(iesC, 0.024, M.cauciuc, g, 80);
  const gI = grupC("intercooler", "Intercoolerul (răcitorul aerului de supraalimentare)"); const ia = ajutoare(gI);
  ia.rbox(0.07, 0.24, 0.3, 0.01, M.aluMat, 0.45, -0.25, -0.35); for (let k = 0; k < 14; k++) ia.box(0.072, 0.004, 0.27, M.alu, 0.45, -0.355 + k * 0.016, -0.35);
  ancore.intercooler = V(0.45, -0.1, -0.35);
  const iesI = [[0.42, -0.38, -0.2], [0.35, -0.42, 0.05], [0.0, -0.1, 0.42], [-0.3, 0.26, 0.34], [-0.36, 0.34, 0.28], [-0.29, 0.33, 0.28]];
  tub(iesI, 0.028, M.cauciuc, g, 120);
  [gT, gA, gU, gI].forEach(o => o.traverse(m => { if (m.isMesh) m.userData.interior = true; }));
  // particulele: gazele de evacuare (portocaliu), aerul (albastru deschis), uleiul (chihlimbar)
  const C3 = pts => new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
  const spir = (x, R, n) => Array.from({ length: n }, (_, k) => { const a = -Math.PI / 2 + k / (n - 1) * Math.PI * 1.7; return [x, TY + Math.cos(a) * R, TZ + Math.sin(a) * R]; });
  const TR = [
    { k: "g", n: 30, c: C3([[0.0, 0.14, -0.25], [0.0, 0.11, -0.3], ...spir(TX, 0.05, 8), [TX, TY, TZ], ...down]) , col: 0xff6a1a },
    { k: "a", n: 30, c: C3([...aerIn, [CX, TY, TZ], ...spir(CX, 0.048, 6).reverse(), ...iesC, [0.45, -0.25, -0.35], ...iesI]), col: 0x9fdcff },
    { k: "u", n: 10, c: C3(tur), col: 0xffc04a }, { k: "u", n: 8, c: C3(ret), col: 0xffc04a }
  ];
  let NP = 0; TR.forEach(t => { t.L = t.c.getLength(); t.s = Array.from({ length: t.n }, (_, k) => k / t.n); NP += t.n; });
  const part = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); part.userData.interior = true; g.add(part);
  let j0 = 0; const cc = new THREE.Color(); TR.forEach(t => { for (let k = 0; k < t.n; k++) part.setColorAt(j0++, cc.setHex(t.col)); });
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s1 = V(1, 1, 1), s0 = V(0, 0, 0);
  let thT = 0, vgtF = 0.8;
  /** u = { n (rot/min motor), boost [bar rel], vgt (0 deschis … 1 închis), sarcina (0…1) } */
  return function (u, dt) {
    const n = u.n || 0, nt = n > 50 ? 25000 + 60000 * Math.min(1, (u.boost || 0) / 1.2) + 8 * n : 0;     // turația reală a turbinei [rot/min]
    thT += nt / 60 * 2 * Math.PI * dt / 2000;                                                                       // afișată mult încetinit
    rotT.rotation.x = -thT; rotC.rotation.x = -thT;
    vgtF += ((u.vgt ?? 0.8) - vgtF) * Math.min(1, dt / 0.3);
    palete.forEach(p => { p.rotation.x = p.userData.a + Math.PI / 2 + (0.25 + 0.75 * (1 - vgtF)) * 0.9; });              // închis: palete aproape tangențiale (secțiune mică)
    inel.rotation.x = vgtF * 0.25; tija.position.x = 0.02 - 0.012 * vgtF; parg.rotation.z = -0.5 + 0.9 * vgtF;
    mFonta.emissiveIntensity = Math.min(0.5, n / 9000 + (u.sarcina || 0) * 0.3);
    const fl = { g: n / 3500 * (0.4 + 0.6 * (u.sarcina || 0)), a: n / 3500 * (1 + (u.boost || 0)), u: n > 50 ? 0.4 + n / 5000 : 0 };
    let j = 0; TR.forEach(t => { const v = 0.35 * fl[t.k]; t.s.forEach((s, k) => { const sN = (s + v * dt / t.L) % 1; t.s[k] = sN; m4.compose(t.c.getPointAt(sN), q0, fl[t.k] > 0.01 ? s1 : s0); part.setMatrixAt(j++, m4); }); });
    part.instanceMatrix.needsUpdate = true;
  };
}

/** construiește motorul; întoarce grupul, componentele selectabile și ancorele etichetelor/sondelor */
export { sistemRacire };
/* ======================================================================= post-tratarea gazelor la motorul diesel (1.5 dCi Euro 6)
   recircularea gazelor (EGR): conducta din colectorul de evacuare prin răcitorul EGR spre supapa electrică (motor + senzor de poziție)
   pe colectorul de admisie; linia de evacuare: catalizatorul de oxidare (DOC) și filtrul de particule (DPF) într-o carcasă, senzorii de
   temperatură înainte / după DPF, senzorul de presiune diferențială cu conductele lui; amestecătorul cu modulul de dozare AdBlue,
   senzorul NOₓ amonte, catalizatorul SCR, senzorul NOₓ aval, țeava finală; rezervorul AdBlue cu pompa și conducta încălzită.
   u = { Tin, Tout (°C), egr (0…1), doza (0…1), merge } */
function postTratare(g, M, grupC, ancore, conectori) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), { add, box, rbox, cyl, tub } = ajutoare(g);
  const mCan = new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.38, metalness: 0.9, emissive: 0xff3a00, emissiveIntensity: 0 });
  const mAlb = new THREE.MeshStandardMaterial({ color: 0x1f5fbf, roughness: 0.5 }), mFunin = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  fixEnv({ mCan, mAlb, mFunin });
  const corpRev = (prof, m, x, y, z, par) => { const geo = new THREE.LatheGeometry(prof.map(([r, xx]) => new THREE.Vector2(r, xx)), 40); geo.rotateZ(-Math.PI / 2); const o = add(new THREE.Mesh(geo, m), par || g); o.position.set(x, y, z); return o; };
  const Y = -0.32, Z = -0.36;
  tub([[-0.15, -0.3, -0.36], [-0.17, -0.315, -0.36], [-0.2, Y, Z]], 0.024, M.ruginaCald);
  // DOC + DPF
  const gD = grupC("dpf", "Catalizatorul de oxidare (DOC) și filtrul de particule (DPF)");
  const can = corpRev([[0.024, 0.2], [0.06, 0.23], [0.072, 0.245], [0.072, 0.6], [0.06, 0.615], [0.024, 0.645]], mCan, 0, Y, Z, gD); can.scale.x = -1; can.position.x = 0;
  [0.25, 0.36, 0.6].forEach(x => { const t = add(new THREE.Mesh(new THREE.TorusGeometry(0.073, 0.003, 6, 40), M.scut), gD); t.rotation.y = Math.PI / 2; t.position.set(-x, Y, Z); });
  // monolitul vizibil (canale ceramice) în modul transparent: DOC (galben) + DPF (gri închis cu funingine)
  const doc = cyl(0.064, 0.064, 0.1, new THREE.MeshStandardMaterial({ color: 0xcfa64a, roughness: 0.6, metalness: 0.4 }), -0.3, Y, Z, "x", gD, 32);
  const dpfM = cyl(0.064, 0.064, 0.22, new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.85 }), -0.48, Y, Z, "x", gD, 32);
  const fun = cyl(0.0645, 0.0645, 0.22, mFunin, -0.48, Y, Z, "x", gD, 32); fun.material.transparent = true;
  [doc, dpfM, fun].forEach(o => { o.userData.interior = true; });
  ancore.dpf = V(-0.45, Y + 0.08, Z);
  // senzorii de temperatură EGT înainte (T1) și după DPF (T2)
  const egt = (x, k, et) => { const c = grupC(k, et); cyl(0.006, 0.006, 0.012, M.otel, x, Y + 0.074, Z, "y", c); cyl(0.004, 0.004, 0.05, M.crom, x, Y + 0.1, Z, "y", c);
    tub([[x, Y + 0.125, Z], [x, Y + 0.18, Z + 0.03], [x + 0.05, -0.05, -0.24]], 0.0025, M.cauciuc, c); conectori[k] = rbox(0.018, 0.014, 0.016, 0.003, M.plasticGri, x + 0.05, -0.045, -0.24, c); ancore[k] = V(x, Y + 0.13, Z); };
  egt(-0.27, "egt1", "Senzorul de temperatură înainte de DPF"); egt(-0.62, "egt2", "Senzorul de temperatură după DPF");
  // senzorul de presiune diferențială cu conductele metalice și furtunele
  { const c = grupC("dp", "Senzorul de presiune diferențială al DPF"); const S = V(-0.47, -0.08, -0.24);
    [[-0.36, -0.465], [-0.6, -0.48]].forEach(([x, xs]) => { cyl(0.006, 0.006, 0.014, M.otel, x, Y + 0.08, Z, "y", c);
      tub([[x, Y + 0.087, Z], [x, -0.18, Z], [(x + xs) / 2, -0.12, (Z + S.z) / 2], [xs, S.y - 0.03, S.z]], 0.0028, M.otel, c, 40); tub([[xs, S.y - 0.03, S.z], [xs, S.y - 0.016, S.z]], 0.0048, M.cauciuc, c); });
    rbox(0.064, 0.036, 0.03, 0.006, M.plastic, S.x, S.y, S.z, c); conectori.dp = rbox(0.022, 0.018, 0.016, 0.004, M.plasticGri, S.x, S.y + 0.004, S.z - 0.022, c); ancore.dp = S.clone().add(V(0, 0.03, 0)); }
  // țeava spre amestecător, modulul de dozare AdBlue, senzorul NOₓ amonte
  tub([[-0.645, Y, Z], [-0.68, Y, Z], [-0.72, Y + 0.01, Z]], 0.024, M.otel);
  const gA = grupC("dozare", "Modulul de dozare AdBlue (injectorul de uree)"); cyl(0.032, 0.032, 0.08, M.scut, -0.76, Y + 0.01, Z, "x", gA, 32);
  const inj = cyl(0.012, 0.012, 0.045, M.otel, -0.75, Y + 0.06, Z, "y", gA, 16); inj.rotation.z = 0.5; conectori.dozare = rbox(0.02, 0.016, 0.018, 0.004, M.plasticGri, -0.735, Y + 0.09, Z, gA); ancore.dozare = V(-0.74, Y + 0.1, Z);
  const jetA = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); jetA.position.set(-0.765, Y + 0.012, Z); jetA.rotation.z = -0.5 + Math.PI; jetA.userData.interior = true; g.add(jetA);
  const nox = (x, k, et) => { const c = grupC(k, et); cyl(0.007, 0.007, 0.012, M.otel, x, Y + 0.04, Z, "y", c); cyl(0.0055, 0.0055, 0.04, M.crom, x, Y + 0.062, Z, "y", c);
    tub([[x, Y + 0.082, Z], [x, Y + 0.13, Z + 0.04], [x + 0.03, Y + 0.17, Z + 0.1]], 0.003, M.cauciuc, c); rbox(0.06, 0.016, 0.04, 0.004, M.plastic, x + 0.03, Y + 0.175, Z + 0.12, c); conectori[k] = rbox(0.018, 0.014, 0.016, 0.003, M.plasticGri, x + 0.065, Y + 0.175, Z + 0.12, c); ancore[k] = V(x, Y + 0.09, Z); };
  nox(-0.7, "nox1", "Senzorul NOₓ amonte");
  // catalizatorul SCR și țeava finală, senzorul NOₓ aval
  tub([[-0.8, Y + 0.01, Z], [-0.83, Y, Z]], 0.024, M.otel);
  const gS = grupC("scr", "Catalizatorul SCR"); corpRev([[0.024, 0.83], [0.062, 0.86], [0.066, 0.87], [0.066, 1.08], [0.062, 1.09], [0.024, 1.12]], M.scut, 0, Y, Z, gS).scale.x = -1;
  ancore.scr = V(-0.97, Y + 0.075, Z);
  tub([[-1.12, Y, Z], [-1.18, Y, Z], [-1.25, Y - 0.02, Z + 0.02], [-1.32, Y - 0.04, Z + 0.06]], 0.024, M.otel);
  nox(-1.17, "nox2", "Senzorul NOₓ aval");
  ancore.coada = V(-1.33, Y - 0.04, Z + 0.06);
  // rezervorul AdBlue (capac albastru), pompa, conducta încălzită spre modulul de dozare
  { const c = grupC("adblue", "Rezervorul AdBlue cu pompa"); rbox(0.24, 0.2, 0.18, 0.02, M.plastic, -0.9, -0.71, 0.05, c); cyl(0.032, 0.032, 0.025, mAlb, -0.84, -0.6, 0.05, "y", c, 24);
    rbox(0.08, 0.05, 0.06, 0.008, M.plasticGri, -0.98, -0.6, 0.05, c); tub([[-0.98, -0.57, 0.05], [-0.95, -0.45, -0.1], [-0.8, -0.3, -0.25], [-0.75, Y + 0.09, Z + 0.02]], 0.0035, M.cauciuc, c, 50); ancore.adblue = V(-0.84, -0.56, 0.05); }
  // EGR: conducta din colectorul de evacuare → răcitorul EGR → supapa electrică pe colectorul de admisie
  { const c = grupC("egr", "Supapa EGR electrică și răcitorul EGR"); const ca = ajutoare(c);
    ca.tub([[0.12, 0.24, -0.22], [0.2, 0.26, -0.2], [0.27, 0.3, -0.12]], 0.013, M.ruginaCald);
    ca.rbox(0.07, 0.06, 0.2, 0.01, M.aluMat, 0.28, 0.33, 0.0); for (let k = 0; k < 8; k++) ca.box(0.072, 0.004, 0.19, M.alu, 0.28, 0.305 + k * 0.007, 0.0);
    ca.tub([[0.28, 0.33, 0.1], [0.26, 0.36, 0.17], [0.2, 0.37, 0.2]], 0.013, M.otel);
    ca.rbox(0.06, 0.05, 0.05, 0.008, M.aluMat, 0.18, 0.37, 0.21); ca.cyl(0.02, 0.02, 0.05, M.plastic, 0.18, 0.41, 0.21, "y", c, 24);
    conectori.egr = ca.rbox(0.022, 0.016, 0.018, 0.004, M.plasticGri, 0.18, 0.44, 0.235); ancore.egr = V(0.18, 0.45, 0.21); }
  const clapEGR = cyl(0.012, 0.012, 0.002, M.otel, 0.18, 0.37, 0.21, "z", g, 20); clapEGR.userData.interior = true;
  return function (u) {
    const T = u.Tdpf ?? 200; mCan.emissiveIntensity = Math.max(0, Math.min(0.8, (T - 450) / 300));
    fun.material.opacity = Math.max(0, Math.min(1, (u.funingine ?? 0.5))); fun.visible = (u.funingine ?? 0.5) > 0.02;
    clapEGR.rotation.y = (u.egr || 0) * Math.PI / 2;
    jetA.material.opacity = u.merge && u.doza ? 0.45 * (0.5 + 0.5 * Math.sin(performance.now() / 120)) : 0; jetA.scale.setScalar(u.doza ? 1 : 0.0001);
  };
}
export function construiesteMotor(opt = {}) {
  const M = MAT(), g = new THREE.Group(), comp = {}, ancore = {}, conectori = {}, rot = {};
  const { add, box, rbox, cyl, tub } = ajutoare(g);
  const grupC = (k, nume) => { const gg = new THREE.Group(); gg.userData.c = k; gg.name = nume || k; g.add(gg); comp[k] = gg; return gg; };
  const XC = [-0.135, -0.045, 0.045, 0.135];     // pozițiile cilindrilor pe axa x

  // ---------------- blocul motor (fontă) cu nervuri, carterul inferior, chiulasa, capacul
  const nC0 = g.children.length;
  rbox(0.46, 0.36, 0.27, 0.012, M.fonta, -0.01, 0.07, 0);
  for (const s of [1, -1]) for (let i = 0; i < 6; i++) box(0.012, 0.3, 0.014, M.fonta, -0.2 + i * 0.08, 0.06, s * 0.142);
  rbox(0.44, 0.15, 0.29, 0.02, M.aluMat, -0.01, -0.185, -0.005);                 // baia de ulei
  for (let i = 0; i < 7; i++) box(0.006, 0.12, 0.3, M.aluMat, -0.2 + i * 0.065, -0.19, -0.005).userData.ascuns = true;
  cyl(0.012, 0.012, 0.03, M.otel, 0.12, -0.27, -0.06);                         // bușonul de golire
  rbox(0.47, 0.12, 0.25, 0.01, M.alu, -0.01, 0.31, 0);                           // chiulasa (aluminiu)
  rbox(0.42, 0.08, 0.2, 0.03, M.plastic, -0.02, 0.405, 0.005);                   // capacul culbutorilor
  for (let i = 0; i < 5; i++) box(0.36, 0.006, 0.01, M.plastic, -0.02, 0.447, -0.06 + i * 0.03);
  cyl(0.026, 0.026, 0.025, M.galben, 0.09, 0.455, 0.05);                         // bușonul de umplere cu ulei
  for (let k = nC0; k < g.children.length; k++) g.children[k].userData.carcasa = true;
  const DCI = opt.varianta === "dci";
  let fise = [], gT = null, vacReg = null, vacDop = null, dop = null, actMPI = null, actTurbo = null, actPost = null;
  if (!DCI) {
  // bobina de inducție (DIS) și fișele de înaltă tensiune către bujii
  rbox(0.11, 0.05, 0.08, 0.008, M.plastic, -0.04, 0.47, -0.02);
  // puțurile bujiilor (cilindrii 1…4, selectabile) cu capișoanele și fișele; bujiile se pot demonta (testele de compresie)
  XC.forEach((x, i) => { const c = grupC("cil" + (i + 1), `Cilindrul ${i + 1} – puțul bujiei`); const ca = ajutoare(c);
    ca.cyl(0.0105, 0.0105, 0.012, M.plastic, x, 0.449, -0.085, "y", c, 20);
    const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0025, 8, 28), M.aluMat), c); r.rotation.x = Math.PI / 2; r.position.set(x, 0.452, -0.085);
    const f = [ca.cyl(0.012, 0.012, 0.05, M.cauciuc, x, 0.43, -0.085), ca.tub([[-0.04 + (i - 1.5) * 0.02, 0.47, -0.06], [(-0.04 + x) / 2, 0.5, -0.09], [x, 0.46, -0.09]], 0.004, M.cauciuc)];
    fise.push(f); ancore["cil" + (i + 1)] = new THREE.Vector3(x, 0.455, -0.085); });
  }
  // filtrul de ulei, demarorul, tija de nivel
  cyl(0.045, 0.045, 0.11, M.albastru, 0.08, -0.02, 0.19, "z").userData.ungereExt = true;
  cyl(0.045, 0.045, 0.16, M.otel, -0.3, -0.02, 0.17, "x");
  tub([[0.16, 0.26, 0.13], [0.17, 0.4, 0.17], [0.17, 0.46, 0.18]], 0.004, M.galben);

  // ---------------- partea distribuției (+x): carcasa curelei de distribuție și transmisia accesoriilor
  rbox(0.05, 0.56, 0.24, 0.02, new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.75 }), 0.25, 0.15, 0.0).userData.carcasa = true;   // carcasa curelei de distribuție
  const acc = transmisieAccesorii({ M }); g.add(acc.grup); Object.assign(rot, acc.rot); const XP = acc.XP;
  ancore.distributie = new THREE.Vector3(XP, 0.1, 0.0);

  /** cutia de viteze automată cu dublu ambreiaj (transaxle): carterul, diferențialul cu flanșele de ieșire, arborele intermediar,
      unitatea mecatronică (blocul hidraulic + TCU) cu pompa electrică și conectorul, maneta selectorului cu cablul */
  function cutieAutomata() {
    const lath = (prof, m, y, z) => { const geo = new THREE.LatheGeometry(prof.map(([r, xx]) => new THREE.Vector2(r, xx)), 48); geo.rotateZ(-Math.PI / 2); const o = add(new THREE.Mesh(geo, m)); o.position.set(0, y, z); return o; };
    lath([[0.12, -0.665], [0.13, -0.655], [0.14, -0.62], [0.15, -0.5], [0.17, -0.44], [0.172, -0.41]], M.aluMat, -0.02, 0);                   // carterul principal
    for (let k = 0; k < 9; k++) { const a = -0.4 + k * 0.42; const nv = box(0.2, 0.012, 0.012, M.aluMat, -0.53, -0.02 + Math.cos(a) * 0.148, Math.sin(a) * 0.148); nv.rotation.x = -a; }   // nervurile
    const DY = -0.087, DZ = 0.335;
    rbox(0.2, 0.15, 0.27, 0.03, M.aluMat, -0.525, -0.085, 0.17);                                                                            // puntea spre diferențial
    lath([[0.05, -0.64], [0.075, -0.625], [0.09, -0.58], [0.09, -0.46], [0.07, -0.42]], M.aluMat, DY, DZ);                                    // carcasa diferențialului
    rbox(0.2, 0.04, 0.24, 0.01, M.alu, -0.53, -0.17, 0.05); cyl(0.01, 0.01, 0.012, M.otel, -0.5, -0.195, 0.05, "y");                      // baia de ulei a cutiei, bușonul
    const flansa = (x, s2) => { cyl(0.045, 0.045, 0.012, M.otel, x, DY, DZ, "x"); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; cyl(0.004, 0.004, 0.02, M.crom, x + s2 * 0.006, DY + Math.cos(a) * 0.032, DZ + Math.sin(a) * 0.032, "x"); } };
    flansa(-0.648, -1);
    cyl(0.018, 0.018, 0.68, M.otel, -0.08, DY, DZ, "x");                                                                                  // arborele intermediar (spre roata dreaptă)
    cyl(0.03, 0.03, 0.03, M.cauciuc, -0.04, DY, DZ, "x"); box(0.03, 0.05, 0.2, M.fonta, -0.04, DY + 0.01, DZ - 0.1);                      // lagărul de sprijin pe bloc
    flansa(0.268, 1);
    ancore.flansaSt = new THREE.Vector3(-0.66, DY, DZ); ancore.flansaDr = new THREE.Vector3(0.28, DY, DZ);
    // unitatea mecatronică (pe partea din față a cutiei)
    const mM = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 });
    rbox(0.19, 0.13, 0.04, 0.008, M.alu, -0.53, 0.06, -0.125);                                                                             // blocul hidraulic (sertarele, electrovalvele)
    for (let k = 0; k < 6; k++) box(0.004, 0.11, 0.008, M.alu, -0.61 + k * 0.032, 0.06, -0.148);
    rbox(0.17, 0.11, 0.022, 0.006, mM, -0.53, 0.06, -0.156);                                                                              // capacul cu TCU integrat
    cyl(0.026, 0.026, 0.08, M.otel, -0.53, 0.145, -0.13, "x"); cyl(0.028, 0.028, 0.012, mM, -0.575, 0.145, -0.13, "x");                   // electropompa de ulei și acumulatorul
    rbox(0.05, 0.026, 0.03, 0.005, mM, -0.47, 0.06, -0.18); box(0.04, 0.006, 0.02, M.plasticGri, -0.47, 0.076, -0.18);                     // conectorul TCU (cu pârghie de blocare)
    tub([[-0.47, 0.06, -0.196], [-0.45, 0.12, -0.22], [-0.38, 0.3, -0.12], [-0.3, 0.42, 0.0]], 0.006, M.cauciuc);                          // cablajul spre rețeaua vehiculului
    ancore.tcu = new THREE.Vector3(-0.53, 0.13, -0.16);
    // arborele selectorului cu maneta și cablul spre maneta din habitaclu
    cyl(0.012, 0.012, 0.04, M.otel, -0.5, 0.15, 0.06, "y"); box(0.012, 0.01, 0.07, M.otel, -0.5, 0.17, 0.09);
    tub([[-0.5, 0.17, 0.125], [-0.48, 0.2, 0.25], [-0.35, 0.18, 0.45], [-0.15, 0.12, 0.62]], 0.005, M.cauciuc);
  }
  // ---------------- partea volantului (−x): carcasa ambreiajului cu fereastră, coroana dințată 60−2, senzorul CKP
  const clopot = cyl(0.19, 0.17, 0.16, M.alu, -0.33, 0.0, 0.0, "x");
  cutieAutomata();
  const volant = new THREE.Group(); volant.position.set(-0.27, 0, 0); g.add(volant); rot.volant = volant;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.025, 64), M.otel); disc.rotation.z = Math.PI / 2; add(disc, volant);
  for (let k = 0; k < 60; k++) { if (k >= 58) continue; const a = k / 60 * Math.PI * 2; const d = box(0.022, 0.012, 0.009, M.crom, 0, Math.cos(a) * 0.17, Math.sin(a) * 0.17, volant); d.rotation.x = -a; }
  // fereastra de inspecție decupată în carcasă (inel întunecat pentru contrast)
  const fereastra = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.004, 6, 48, Math.PI * 0.5), M.plastic); fereastra.rotation.y = Math.PI / 2; fereastra.rotation.z = Math.PI * 0.25; fereastra.position.set(-0.258, 0, 0); g.add(fereastra);
  clopot.material = clopot.material.clone(); clopot.material.transparent = true; clopot.material.opacity = 0.55;
  { const c = grupC("ckp", "Senzorul de turație CKP"); const s = cyl(0.012, 0.012, 0.07, M.plastic, -0.27, 0.21, 0.0, "y", c); cyl(0.02, 0.02, 0.01, M.plastic, -0.27, 0.235, 0.0, "y", c); conectori.ckp = rbox(0.03, 0.02, 0.022, 0.004, M.plasticGri, -0.27, 0.262, 0.0, c); ancore.ckp = new THREE.Vector3(-0.27, 0.27, 0); }
  // senzorul de fază CMP (Hall) pe capătul arborelui cu came
  { const c = grupC("cmp", "Senzorul de fază CMP (Hall)"); cyl(0.014, 0.014, 0.04, M.plastic, -0.255, 0.37, 0.03, "x", c); conectori.cmp = rbox(0.022, 0.026, 0.02, 0.004, M.plasticGri, -0.285, 0.37, 0.03, c); ancore.cmp = new THREE.Vector3(-0.285, 0.39, 0.03); }
  // senzorul de detonație (piezo) pe bloc
  { const c = grupC("knock", "Senzorul de detonație"); cyl(0.02, 0.02, 0.018, M.plastic, 0.0, 0.05, 0.145, "z", c); conectori.knock = rbox(0.02, 0.016, 0.02, 0.004, M.plasticGri, 0.0, 0.08, 0.16, c); ancore.knock = new THREE.Vector3(0, 0.08, 0.16); }

  // ---------------- admisia (+z): plenul, canalele, corpul clapetei, conducta de aer, filtrul de aer
  rbox(0.4, 0.1, 0.11, 0.035, M.plastic, -0.02, 0.33, 0.28);
  XC.forEach(x => tub([[x, 0.33, 0.24], [x, 0.36, 0.19], [x, 0.31, 0.15], [x, 0.29, 0.13]], 0.025, M.plastic));
  { const c = grupC("clap", "Corpul clapetei"); const corp = cyl(0.042, 0.042, 0.07, M.alu, -0.255, 0.33, 0.28, "x", c);
    const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.003, 24), M.crom); cl.position.set(-0.29, 0.33, 0.28); cl.rotation.z = Math.PI / 2; add(cl, c); rot.clapeta = cl;
    rbox(0.04, 0.05, 0.05, 0.006, M.plastic, -0.25, 0.33, 0.34, c);                                   // motorul pas cu pas / de acționare
    conectori.clap = rbox(0.03, 0.02, 0.02, 0.004, M.plasticGri, -0.25, 0.37, 0.355, c); ancore.clap = new THREE.Vector3(-0.25, 0.38, 0.355); }
  { const c = grupC("tps", "Potențiometrul clapetei TPS"); rbox(0.016, 0.05, 0.045, 0.006, M.plastic, -0.215, 0.33, 0.23, c); conectori.tps = rbox(0.02, 0.02, 0.026, 0.004, M.plasticGri, -0.215, 0.365, 0.225, c); ancore.tps = new THREE.Vector3(-0.215, 0.37, 0.225); }
  { const c = grupC("map", "Senzorul MAP"); rbox(0.05, 0.022, 0.04, 0.005, M.plastic, 0.08, 0.392, 0.28, c); conectori.map = rbox(0.024, 0.018, 0.02, 0.004, M.plasticGri, 0.08, 0.41, 0.3, c); ancore.map = new THREE.Vector3(0.08, 0.42, 0.3); }
  if (!DCI) { tub([[-0.29, 0.33, 0.28], [-0.36, 0.34, 0.28], [-0.44, 0.4, 0.28], [-0.52, 0.47, 0.25]], 0.045, M.cauciuc);
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.004, 6, 20), M.cauciuc); r.position.set(-0.36 - i * 0.022, 0.345 + i * 0.012, 0.28); r.rotation.y = Math.PI / 2; g.add(r); } }
  { const c = grupC("iat", "Senzorul IAT"); cyl(0.01, 0.01, 0.03, M.plastic, -0.42, 0.44, 0.28, "y", c); conectori.iat = rbox(0.02, 0.016, 0.02, 0.004, M.albastru, -0.42, 0.46, 0.28, c); ancore.iat = new THREE.Vector3(-0.42, 0.47, 0.28); }
  if (opt.filtruAer !== false) { rbox(0.28, 0.12, 0.22, 0.03, M.plastic, -0.6, 0.5, 0.24); }
  const actCR = DCI ? sistemCR(g, M, XC, grupC, ancore, conectori) : null;
  if (!DCI) {
  // rampa de combustibil și injectoarele
  cyl(0.011, 0.011, 0.38, M.crom, -0.0, 0.29, 0.165, "x");
  tub([[0.19, 0.29, 0.165], [0.24, 0.32, 0.21], [0.3, 0.33, 0.29]], 0.005, M.otel);
  // regulatorul de presiune (sistem cu retur) pe capătul rampei: corpul cu membrană, furtunul de depresiune spre colector, returul
  const gReg = grupC("reg", "Regulatorul de presiune a combustibilului"); const gra = ajutoare(gReg);
  gra.cyl(0.011, 0.011, 0.02, M.crom, -0.2, 0.29, 0.165, "x", gReg); gra.cyl(0.024, 0.024, 0.026, M.crom, -0.225, 0.29, 0.165, "x", gReg, 32); gra.cyl(0.004, 0.004, 0.02, M.otel, -0.245, 0.29, 0.165, "x", gReg);
  vacReg = gra.tub([[-0.255, 0.29, 0.165], [-0.27, 0.31, 0.2], [-0.2, 0.34, 0.25], [-0.15, 0.33, 0.26]], 0.0045, M.cauciuc);
  vacDop = gra.tub([[-0.255, 0.29, 0.165], [-0.27, 0.31, 0.19]], 0.0045, M.cauciuc); dop = gra.cyl(0.006, 0.006, 0.01, new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 }), -0.272, 0.315, 0.195, "y", gReg);
  gra.tub([[-0.225, 0.268, 0.165], [-0.24, 0.2, 0.2], [-0.3, 0.12, 0.25], [-0.38, 0.05, 0.3]], 0.004, M.otel);   // returul spre rezervor
  ancore.reg = new THREE.Vector3(-0.225, 0.32, 0.165); ancore.retur = new THREE.Vector3(-0.38, 0.05, 0.3);
  // adaptorul în T cu ventil Schrader pe turul de combustibil (pentru trusa de presiune)
  gT = new THREE.Group(); g.add(gT); const gta = ajutoare(gT);
  gta.rbox(0.03, 0.016, 0.016, 0.003, M.alama, 0.24, 0.32, 0.21); gta.cyl(0.006, 0.006, 0.02, M.alama, 0.24, 0.335, 0.21, "y", gT, 12); gta.cyl(0.0055, 0.0055, 0.008, M.plastic, 0.24, 0.348, 0.21, "y", gT, 12);
  gT.visible = false; ancore.teTur = new THREE.Vector3(0.24, 0.35, 0.21);
  // injectoarele (injecție secvențială în poarta de admisie): corpul din cupa rampei spre supapa de admisie, duza cu 2 orificii
  const mpi = [];
  XC.forEach((x, i) => { const k = "inj" + (i + 1), c = grupC(k, `Injectorul cilindrului ${i + 1}`);
    const tip = new THREE.Vector3(x, 0.285, 0.11), tinta = new THREE.Vector3(x - 0.017, 0.266, 0.02), ax = tinta.clone().sub(tip).normalize();
    const J = new THREE.Group(); J.position.copy(tip); J.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), ax); c.add(J); const ja = ajutoare(J);
    ja.cyl(0.0035, 0.0045, 0.01, M.otel, 0, 0.005, 0, "y", J, 12); ja.cyl(0.0085, 0.0085, 0.048, M.verde, 0, 0.034, 0, "y", J, 20);
    const or = add(new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0016, 6, 18), M.cauciuc), J); or.rotation.x = Math.PI / 2; or.position.y = 0.012;
    J.updateMatrixWorld(true); const top = J.localToWorld(new THREE.Vector3(0, 0.066, 0.004));
    conectori[k] = rbox(0.022, 0.016, 0.02, 0.004, M.plasticGri, top.x, top.y + 0.006, top.z, c); ancore[k] = top.clone().add(new THREE.Vector3(0, 0.02, 0));
    c.traverse(o => { if (o.isMesh) o.userData.interior = true; }); mpi.push({ tip, ax }); });
  actMPI = opt.interior ? pulverizareMPI(g, mpi) : null;
  // supapa canistrei
  { const c = grupC("can", "Supapa de purjare a canistrei"); cyl(0.022, 0.022, 0.05, M.plastic, 0.18, 0.4, 0.36, "z", c); conectori.can = rbox(0.022, 0.016, 0.02, 0.004, M.plasticGri, 0.18, 0.43, 0.36, c); tub([[0.18, 0.4, 0.33], [0.12, 0.38, 0.32], [0.05, 0.35, 0.33]], 0.006, M.cauciuc); ancore.can = new THREE.Vector3(0.18, 0.44, 0.36); }
  }

  // ---------------- evacuarea (−z): galeria din fontă, scutul termic, sonda λ amonte, catalizatorul, sonda λ aval
  const gal = [];
  XC.forEach((x, i) => gal.push(tub([[x, 0.29, -0.13], [x, 0.27, -0.19], [x * 0.5, 0.2, -0.23], [0.0, 0.14, -0.25]], 0.022, M.ruginaCald)));
  cyl(0.04, 0.04, 0.06, M.ruginaCald, 0.0, 0.12, -0.25, "y");
  const scut = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.36, 24, 1, true, Math.PI * 0.45, Math.PI * 0.65), M.scut); scut.rotation.z = Math.PI / 2; scut.position.set(0, 0.25, -0.2); add(scut);
  { const c = grupC("l1", "Sonda λ amonte"); const s = cyl(0.009, 0.009, 0.05, M.crom, 0.05, 0.13, -0.29, "y", c); s.rotation.x = -0.6; cyl(0.012, 0.012, 0.012, M.otel, 0.05, 0.11, -0.28, "y", c);
    tub([[0.05, 0.16, -0.31], [0.08, 0.3, -0.33], [0.1, 0.42, -0.3]], 0.0035, M.cauciuc, c); conectori.l1 = rbox(0.03, 0.018, 0.02, 0.004, M.violet, 0.1, 0.43, -0.3, c); ancore.l1 = new THREE.Vector3(0.05, 0.16, -0.31); }
  if (opt.stand !== false) {
    const linieEv = DCI ? [[-0.12, -0.15, -0.37], [-0.13, -0.2, -0.365], [-0.14, -0.26, -0.362], [-0.15, -0.3, -0.36], [-0.45, -0.34, -0.36]] : [[0.0, 0.1, -0.25], [0.02, 0.0, -0.3], [0.0, -0.15, -0.34], [-0.15, -0.3, -0.36], [-0.45, -0.34, -0.36]];
    if (!(DCI && opt.postTratare)) tub(DCI ? linieEv.slice(2) : linieEv, 0.024, M.ruginaCald);
    if (DCI) actTurbo = turbosuflanta(g, M, grupC, ancore);
    if (DCI && opt.postTratare) actPost = postTratare(g, M, grupC, ancore, conectori);
    const cat = linieEv[3];
    if (!actPost) rbox(0.22, 0.11, 0.13, 0.04, M.scut, cat[0] - 0.08, cat[1], cat[2]);
    if (!actPost) { const c = grupC("l2", "Sonda λ aval"); const p = linieEv[3]; cyl(0.009, 0.009, 0.05, M.crom, p[0] - 0.24, p[1] + 0.015, p[2], "y", c);
      tub([[p[0] - 0.24, p[1] + 0.045, p[2]], [p[0] - 0.24, p[1] + 0.25, p[2] + 0.02], [p[0] - 0.3, p[1] + 0.35, p[2] + 0.05]], 0.0035, M.cauciuc, c); conectori.l2 = rbox(0.03, 0.018, 0.02, 0.004, M.violet, p[0] - 0.3, p[1] + 0.36, p[2] + 0.05, c); ancore.l2 = new THREE.Vector3(p[0] - 0.24, p[1] + 0.045, p[2]); }
  } else {
    // autoturism 2025: țeava de legătură, catalizatorul apropiat (TWC), sonda λ aval, filtrul de particule GPF cu senzorul de presiune diferențială
    const corpRev = (prof, m, x, y, z) => { const geo = new THREE.LatheGeometry(prof.map(([r, xx]) => new THREE.Vector2(r, xx)), 40); geo.rotateZ(-Math.PI / 2); const o = add(new THREE.Mesh(geo, m)); o.position.set(x, y, z); return o; };
    const inel = (r, x, y, z) => { const t = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.003, 6, 40), M.scut)); t.rotation.y = Math.PI / 2; t.position.set(x, y, z); };
    tub([[0.0, 0.1, -0.25], [0.02, 0.0, -0.3], [-0.04, -0.13, -0.315], [-0.12, -0.195, -0.31], [-0.18, -0.2, -0.31]], 0.024, M.ruginaCald);
    corpRev([[0.024, -0.345], [0.05, -0.32], [0.055, -0.31], [0.055, -0.21], [0.05, -0.2], [0.024, -0.175]], M.scut, 0, -0.2, -0.31);          // catalizatorul cu trei căi
    inel(0.056, -0.31, -0.2, -0.31); inel(0.056, -0.21, -0.2, -0.31);
    tub([[-0.34, -0.2, -0.31], [-0.38, -0.205, -0.305], [-0.425, -0.21, -0.3]], 0.024, M.ruginaCald);
    const YG = -0.21, ZG = -0.3;                                                                                                        // axa filtrului GPF
    corpRev([[0.024, -0.665], [0.055, -0.635], [0.066, -0.62], [0.066, -0.465], [0.055, -0.45], [0.024, -0.42]], M.scut, 0, YG, ZG);      // filtrul de particule (monolit ceramic cu canale închise alternativ)
    inel(0.067, -0.62, YG, ZG); inel(0.067, -0.465, YG, ZG); inel(0.067, -0.5425, YG, ZG);
    tub([[-0.665, YG, ZG], [-0.71, -0.23, -0.29], [-0.735, -0.28, -0.24], [-0.735, -0.3, -0.18]], 0.024, M.ruginaCald);
    cyl(0.045, 0.045, 0.008, M.otel, -0.735, -0.3, -0.178, "z");                                                                        // flanșa spre țeava intermediară
    ancore.evacIesire = new THREE.Vector3(-0.735, -0.3, -0.174);
    // ștuțurile de prelevare a presiunii: P1 pe conul de intrare (înainte de monolit), P2 pe conul de ieșire (după monolit)
    const PR = [{ x: -0.442, xs: -0.515 }, { x: -0.643, xs: -0.545 }];
    PR.forEach(q => { cyl(0.0065, 0.0065, 0.016, M.otel, q.x, YG + 0.052, ZG, "y"); cyl(0.0045, 0.0045, 0.006, M.crom, q.x, YG + 0.063, ZG, "y"); });
    { const c = grupC("gpf", "Senzorul de presiune diferențială al filtrului GPF");
      const yS = -0.045, zS = -0.24;
      // conductele metalice (rezistă la temperatura gazelor) și furtunurile din cauciuc siliconic spre senzor
      PR.forEach(q => {
        tub([[q.x, YG + 0.065, ZG], [q.x, -0.12, ZG], [(q.x + q.xs) / 2, -0.102, (ZG + zS) / 2], [q.xs, -0.1, zS - 0.004]], 0.0028, M.otel, c, 40);
        tub([[q.xs, -0.1, zS - 0.004], [q.xs, -0.09, zS - 0.001], [q.xs, -0.074, zS]], 0.0048, M.cauciuc, c);
        const cl = add(new THREE.Mesh(new THREE.TorusGeometry(0.0055, 0.0012, 6, 16), M.otel), c); cl.rotation.x = Math.PI / 2; cl.position.set(q.xs, -0.078, zS);   // colierul
        cyl(0.003, 0.003, 0.014, M.plastic, q.xs, -0.068, zS, "y", c);                                                                   // racordurile senzorului (P1, P2)
      });
      rbox(0.064, 0.038, 0.03, 0.006, M.plastic, -0.53, yS, zS, c);                                                                      // corpul senzorului (membrană piezorezistivă)
      box(0.05, 0.002, 0.022, M.plasticGri, -0.53, yS + 0.02, zS, c);                                                                     // eticheta
      conectori.gpf = rbox(0.024, 0.02, 0.018, 0.004, M.plasticGri, -0.53, yS + 0.004, zS - 0.024, c);                                   // conectorul cu 3 pini (5 V, masă, semnal)
      box(0.008, 0.004, 0.008, M.plastic, -0.53, yS + 0.016, zS - 0.024, c);                                                             // clema de blocare
      tub([[-0.53, yS + 0.004, zS - 0.034], [-0.53, yS + 0.03, zS - 0.06], [-0.5, 0.08, -0.3], [-0.42, 0.2, -0.33]], 0.004, M.cauciuc, c);  // cablajul spre ECU
      box(0.05, 0.012, 0.09, M.otel, -0.53, yS + 0.02, (zS + -0.14) / 2 + 0.005, c);                                                     // suportul, prins pe carcasa cutiei de viteze
      cyl(0.006, 0.006, 0.012, M.crom, -0.53, yS + 0.028, -0.155, "y", c);
      ancore.gpf = new THREE.Vector3(-0.53, yS + 0.03, zS); }
    { const c = grupC("l2", "Sonda λ aval"); const x = -0.385, y = -0.205, z = -0.305;
      cyl(0.011, 0.011, 0.012, M.otel, x, y + 0.03, z, "y", c); cyl(0.009, 0.009, 0.045, M.crom, x, y + 0.055, z, "y", c);
      tub([[x, y + 0.078, z], [x, y + 0.15, z - 0.01], [x - 0.04, 0.05, -0.33], [x - 0.04, 0.16, -0.33]], 0.0035, M.cauciuc, c); conectori.l2 = rbox(0.03, 0.018, 0.02, 0.004, M.violet, x - 0.04, 0.17, -0.33, c); ancore.l2 = new THREE.Vector3(x, y + 0.08, z); }
  }

  // ---------------- răcirea: carcasa termostatului cu senzorul CTS, furtunurile
  const carcT = rbox(0.07, 0.07, 0.08, 0.012, M.alu, -0.27, 0.31, 0.04);
  { const c = grupC("ect", "Senzorul de temperatură CTS"); cyl(0.012, 0.012, 0.03, M.alama, -0.27, 0.355, 0.06, "y", c); conectori.ect = rbox(0.022, 0.02, 0.024, 0.004, M.verde, -0.27, 0.38, 0.06, c); ancore.ect = new THREE.Vector3(-0.27, 0.39, 0.06); }
  const rac = sistemRacire(M, opt.stand !== false
    ? { xc: -0.02, yR: 0.05, zR: -0.85, vas: [0.2, 0.33, -0.79], suportVas: true, incalzire: [-0.3, 0.2, 0.5], portAC: acc.portAC, ac: !!opt.ac }
    : { xc: -0.02, yR: -0.02, zR: -0.52, vas: [-0.47, 0.3, -0.25], suportVas: true, incalzire: [-0.15, 0.29, 0.68], ac: true, portAC: acc.portAC });
  g.add(rac.grup); rot.vent = rac.rot.vent;
  const actRacire = opt.racire ? interiorRacire(g, M, rac, grupC, ancore, rot, carcT) : null;
  if (rac.ac) { const c = grupC("ac", "Senzorul de presiune A/C"); c.add(rac.ac); ancore.ac = rac.ancore.ac; }

  const actInterior = opt.interior ? interiorMotor(g, M, XC, grupC, comp, ancore) : null;
  // fasciculul de cabluri (tub gofrat) care leagă conectorii
  const traseu = ["ect", "clap", "tps", "inj1", "inj2", "inj3", "inj4", "map", "can"].filter(k => ancore[k]).map(k => ancore[k].clone().add(new THREE.Vector3(0, 0.03, 0)));
  tub(traseu.map(v => [v.x, v.y, v.z]), 0.009, M.cauciuc, g, 160);
  // marcarea zonei pentru materiale fierbinți
  const matCald = M.ruginaCald;
  /** modul de vizualizare a carcasei: "opac", "transparent" (carcasa și accesoriile estompate), "sectionat" (carcasa tăiată în planul
      cilindrilor pe partea admisiei, accesoriile estompate). Piesele interioare și ale sistemului de ungere rămân opace. */
  const planLocal = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0), planSect = planLocal.clone();   // planul de secționare (coordonatele motorului → lume)
  let modCurent = "opac";
  function modCarcasa(mod, latura) {
    modCurent = mod; if (latura) planLocal.normal.set(0, 0, -Math.sign(latura));
    g.traverse(o => {
      if (!o.isMesh || o.userData.interior || o.userData.fixMat) return;
      o.visible = mod === "opac" || !o.userData.ascuns;
      if (!o.userData.m0) o.userData.m0 = o.material;
      if (mod === "opac") { o.material = o.userData.m0; o.castShadow = true; return; }
      const cache = o.userData.mm || (o.userData.mm = {});
      if (!cache[mod]) {
        const f = m => { const c = m.clone(); if (o.userData.carcasa && mod === "sectionat") { c.clippingPlanes = [planSect]; c.clipShadows = true; c.side = THREE.DoubleSide; }
          else { c.transparent = true; c.depthWrite = false; c.opacity = Math.min(c.opacity ?? 1, o.userData.ungereExt ? 0.32 : o.userData.carcasa ? 0.12 : 0.2); } return c; };
        cache[mod] = Array.isArray(o.userData.m0) ? o.userData.m0.map(f) : f(o.userData.m0);
      }
      o.material = cache[mod]; o.castShadow = o.userData.carcasa && mod === "sectionat";
    });
  }
  return { grup: g, comp, ancore, conectori, rot, M, XC, matCald, modCarcasa, mod: () => modCurent, interior: !!actInterior, racire: !!actRacire, acAnc: rac.acAnc,
    /** actualizarea animației: st = { rpm, tps (0…100), ect, selectat, decuplat{}, timp } */
    actualizeaza(st, dt) {
      const w = (st.rpm || 0) / 60 * 2 * Math.PI;
      const vis = w * dt / 30;                                 // rotația afișată (încetinită ×30 pentru a se vedea)
      rot.volant.rotation.x -= vis; acc.roteste(vis); if (st.vent) rot.vent.rotation.z -= dt * 22;
      rot.clapeta.rotation.y = (st.tps || 0) / 100 * Math.PI / 2 * 0.95;
      matCald.emissiveIntensity = Math.max(0, Math.min(0.9, ((st.tEv || 20) - 480) / 500));
      Object.entries(conectori).forEach(([k, m]) => { if (!m.userData.y0) m.userData.y0 = m.position.y; m.position.y = m.userData.y0 + (st.decuplat && st.decuplat[k] ? 0.03 : 0); });
      Object.entries(comp).forEach(([k, gg]) => {
        const sel = k === st.selectat, pulse = sel ? 0.35 + 0.25 * Math.sin((st.timp || 0) * 5) : 0;
        gg.traverse(o => { if (o.isMesh && !Array.isArray(o.material)) { if (!o.userData.mOrig) { o.userData.mOrig = o.material; o.material = o.material.clone(); o.userData.e0 = o.material.emissive ? o.material.emissive.getHex() : 0; o.userData.i0 = o.material.emissiveIntensity || 0; }
          if (!o.material.emissive) return;
          if (sel) { o.material.emissive.setHex(0xffb020); o.material.emissiveIntensity = pulse; } else { o.material.emissive.setHex(o.userData.e0); o.material.emissiveIntensity = o.userData.i0; } } });
      });
      fise.forEach(f => f.forEach(m => { m.visible = !st.bujiiScoase; }));
      if (gT) { gT.visible = !!st.teTur; vacReg.visible = st.regFurtun !== false; vacDop.visible = dop.visible = st.regFurtun === false; }
      if (modCurent === "sectionat") { g.updateMatrixWorld(); planSect.copy(planLocal).applyMatrix4(g.matrixWorld); }
      // valori implicite (lucrările care nu modelează ungerea, răcirea sau injecția): după turație și sarcină
      const rpm = st.rpm || 0, Tl = st.ect ?? 88;
      if (actRacire) actRacire(st.racire || { Tm: Tl, Tr: Math.max(20, Tl - 22), x: Math.max(0, Math.min(1, (Tl - 89) / 13)), Q: rpm / 4000 }, dt);
      if (actMPI) actMPI(st.mpi || { ti: 2.4 + (st.tps || 0) * 0.07, n: rpm, activ: rpm > 50, oprite: Object.fromEntries(Object.keys(st.decuplat || {}).filter(k => st.decuplat[k] && /^inj\d$/.test(k)).map(k => [k.slice(3), true])) }, dt, vis);
      if (actCR) st.crStare = actCR(st.cr || {}, dt, vis);
      if (actPost) actPost(st.post || { Tdpf: rpm > 50 ? 260 : 25, funingine: 0.5, egr: 0, merge: rpm > 50 });
      if (actTurbo) actTurbo(st.turbo || { n: rpm, boost: rpm > 50 ? 0.03 + rpm / 4000 * 0.15 : 0, vgt: 0.8, sarcina: (st.tps || 0) / 100 }, dt);
      if (actInterior) st.uleiStare = actInterior(st.ulei || (rpm > 50 ? { Q: rpm / 3500, Qm: rpm / 3500, Qr: 0, desch: 0, p: 1 + rpm / 1000 } : {}), dt, vis, rpm > 50);
    }
  };
}

/* ======================================================================= standul de laborator (scenă separată) */
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

export function creeazaStand(gazda, optiuni = {}) {
  gazda.innerHTML = `<div class="m3d"><canvas></canvas><div class="m3d-etichete"></div><div class="m3d-vederi"></div><div class="m3d-ajutor">clic pe o componentă = selectare · trageți = rotire · rotița = zoom</div></div>`;
  const cont = gazda.querySelector(".m3d"), canvas = cont.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(35, 2, 0.02, 50); camera.position.set(1.25, 1.0, 1.45);
  const ctl = new OrbitControls(camera, canvas); ctl.target.set(-0.05, 0.15, 0); ctl.enableDamping = true; ctl.minDistance = 0.35; ctl.maxDistance = 5; ctl.maxPolarAngle = Math.PI * 0.62;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(2.5, 4, 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 10 }); sun.shadow.bias = -0.0005; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404448, 0.5));
  // podeaua atelierului (rășină epoxidică) și peretele
  const pod = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0x8d949b, roughness: 0.35, metalness: 0.1 }));
  pod.rotation.x = -Math.PI / 2; pod.position.y = -0.82; pod.receiveShadow = true; scene.add(pod);
  const linii = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.06), new THREE.MeshStandardMaterial({ color: 0xe8c234, roughness: 0.6 })); linii.rotation.x = -Math.PI / 2; linii.position.set(0, -0.818, -1.1); scene.add(linii);
  // motorul
  const mot = construiesteMotor({ stand: true, interior: optiuni.interior !== false, varianta: optiuni.varianta, racire: optiuni.racire !== false, postTratare: !!optiuni.postTratare, ac: !!optiuni.ac }); scene.add(mot.grup);
  const M = mot.M;
  // aparatele sistemului de ungere (numai cu interiorul): manometrul de control pe furtun și termometrul cu sonda în tubul jojei
  const ap = {};
  if (mot.interior) {
    const cadran = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, x: c.getContext("2d"), t }; };
    // manometrul 0…10 bar cu glicerină, în husă de cauciuc, pe suport prins de cadru
    const GM = new THREE.Group(); GM.position.set(-0.3, 0.02, 0.52); GM.rotation.y = -0.12; GM.rotation.x = -0.12; scene.add(GM); GM.updateMatrixWorld(true); ap.man = GM;
    const cm = cadran(512, 512); ap.cadranMan = cm;
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.04, 48), M.cauciuc); b.rotation.x = Math.PI / 2; GM.add(b);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 10, 48), M.crom); r.position.z = 0.02; GM.add(r);
      const f = new THREE.Mesh(new THREE.CircleGeometry(0.049, 64), new THREE.MeshBasicMaterial({ map: cm.t })); f.position.z = 0.0205; GM.add(f);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(0.049, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 0.9, transparent: true, opacity: 0.18, depthWrite: false })); gl.position.z = 0.024; GM.add(gl);
      const rac = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.03, 6), M.alama); rac.position.set(0, -0.07, 0); GM.add(rac); }
    const sup = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.56, 0.012), M.otel); sup.position.set(-0.3, -0.42, 0.5); sup.scale.y = 1.4; scene.add(sup); ap.sup = sup;
    const furtun = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.06, -0.035, 0.177], [-0.06, -0.045, 0.23], [-0.12, -0.13, 0.36], [-0.24, -0.16, 0.48], [-0.3, -0.1, 0.52], GM.localToWorld(new THREE.Vector3(0, -0.085, 0)).toArray()].map(v => new THREE.Vector3(...v))), 80, 0.0045, 10), M.cauciuc);
    scene.add(furtun); ap.furtun = furtun;
    // termometrul digital cu sondă K (sonda introdusă prin tubul jojei până în baie)
    const TM = new THREE.Group(); TM.position.set(0.3, 0.08, 0.56); TM.rotation.y = 0.15; scene.add(TM); TM.updateMatrixWorld(true); ap.term = TM;
    const ct = cadran(256, 128); ap.lcd = ct;
    { const c = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.13, 0.026, 3, 0.008), new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.5 })); TM.add(c);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ map: ct.t })); f.position.set(0, 0.03, 0.0135); TM.add(f);
      [[-0.016, -0.015], [0.016, -0.015], [-0.016, -0.04], [0.016, -0.04]].forEach(([x, y]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.004, 16), M.plastic); b.rotation.x = Math.PI / 2; b.position.set(x, y, 0.014); TM.add(b); });
      const st0 = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.02, 10), M.plastic); st0.position.set(0, 0.075, 0); TM.add(st0); }
    const cab = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.17, 0.465, 0.18], [0.2, 0.53, 0.26], [0.3, 0.4, 0.46], [0.31, 0.2, 0.56], TM.localToWorld(new THREE.Vector3(0, 0.085, 0)).toArray()].map(v => new THREE.Vector3(...v))), 60, 0.002, 8), M.plastic);
    scene.add(cab); ap.cablu = cab;
    ap.deseneaza = (p, T) => {
      const { x } = cm, R = 230, cx = 256, cy = 256, a0 = -225 * Math.PI / 180, a1 = 45 * Math.PI / 180, ang = v => a0 + (a1 - a0) * Math.max(0, Math.min(1, v / 10));
      x.fillStyle = "#fbfbf7"; x.fillRect(0, 0, 512, 512); x.lineCap = "round";
      x.strokeStyle = "#d32f2f"; x.lineWidth = 16; x.beginPath(); x.arc(cx, cy, R - 22, ang(0), ang(0.5)); x.stroke();
      for (let k = 0; k <= 50; k++) { const v = k / 5, a = ang(v), M5 = k % 5 === 0, l = M5 ? 34 : k % 5 === 0 ? 24 : 16;
        x.strokeStyle = "#151515"; x.lineWidth = M5 ? 6 : 2.5; x.beginPath(); x.moveTo(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8)); x.lineTo(cx + Math.cos(a) * (R - 8 - l), cy + Math.sin(a) * (R - 8 - l)); x.stroke();
        if (M5) { x.fillStyle = "#151515"; x.font = "bold 44px system-ui,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(v), cx + Math.cos(a) * (R - 72), cy + Math.sin(a) * (R - 72)); } }
      x.fillStyle = "#222"; x.font = "bold 40px system-ui,sans-serif"; x.fillText("bar", cx, cy + 92); x.font = "22px system-ui,sans-serif"; x.fillStyle = "#555"; x.fillText("OIL PRESSURE · GLYCERINE", cx, cy + 135);
      const a = ang(p); x.strokeStyle = "#c62828"; x.lineWidth = 9; x.beginPath(); x.moveTo(cx - Math.cos(a) * 36, cy - Math.sin(a) * 36); x.lineTo(cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26)); x.stroke();
      x.fillStyle = "#1b1b1b"; x.beginPath(); x.arc(cx, cy, 20, 0, Math.PI * 2); x.fill(); cm.t.needsUpdate = true;
      const l = ct.x; l.fillStyle = "#a7b39b"; l.fillRect(0, 0, 256, 128); l.fillStyle = "#1d2618"; l.font = "bold 76px 'Courier New',monospace"; l.textAlign = "right"; l.textBaseline = "middle"; l.fillText(Number.isFinite(T) ? T.toFixed(1) : "--", 236, 70); l.font = "bold 24px system-ui"; l.textAlign = "left"; l.fillText("°C   T1 K", 12, 20); ct.t.needsUpdate = true;
    };
    ap.deseneaza(0, NaN); ap.ult = [-1, -1];
  }
  // cadrul standului (țevi rectangulare vopsite), roți, radiatorul cu electroventilator, bateria, panoul cu ECU
  const st3 = new THREE.Group(); scene.add(st3);
  const tv = (a, b) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B); const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, L, 0.04), M.stand); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = m.receiveShadow = true; st3.add(m); };
  const y0 = -0.74, X0 = -0.8, X1 = 0.75, Z0 = -0.6, Z1 = 0.6;
  [[X0, Z0, X1, Z0], [X0, Z1, X1, Z1], [X0, Z0, X0, Z1], [X1, Z0, X1, Z1], [-0.1, Z0, -0.1, Z1]].forEach(([a, b, c, d]) => tv([a, y0, b], [c, y0, d]));
  [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]].forEach(([x, z]) => { tv([x, y0, z * 4], [x, -0.3, z]); });
  [[X0, Z0], [X0, Z1], [X1, Z0], [X1, Z1]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 24), M.cauciuc); r.rotation.x = Math.PI / 2; r.position.set(x, -0.77, z); r.castShadow = true; st3.add(r); });
  // suporturile elastice ale motorului
  [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 20), M.cauciuc); s.position.set(x, -0.29, z); st3.add(s); });
  // radiatorul, electroventilatorul și vasul de expansiune fac parte din motor (sistemRacire); aici doar suporturile
  tv([-0.3, y0, Z1], [-0.3, 0.12, 0.52]);
  tv([-0.35, y0, -0.6], [-0.35, -0.15, -0.85]); tv([0.25, y0, -0.6], [0.25, -0.15, -0.85]);
  // bateria
  const bat = new THREE.Group(); bat.position.set(0.5, -0.62, 0.32); st3.add(bat);
  const bc = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.19, 0.17, 3, 0.01), M.baterie); bc.castShadow = true; bat.add(bc);
  [[-0.08, 0xc62828], [0.08, 0x222222]].forEach(([x, c]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 16), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); b.position.set(x, 0.105, 0.04); bat.add(b); });
  // panoul de comandă cu ECU, cheia de contact și priza OBD
  const pan = new THREE.Group(); pan.position.set(0.68, -0.25, 0.45); pan.rotation.y = -0.6; st3.add(pan);
  const pl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.55, 0.45), M.stand); pan.add(pl);
  const ecu = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.18, 0.24, 2, 0.006), M.alu); ecu.position.set(-0.025, 0.1, 0); pan.add(ecu);
  const obd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), M.plastic); obd.position.set(-0.02, -0.15, 0.1); pan.add(obd);
  // calculatorul și priza OBD pot fi identificate (clic) la lucrările care le cer
  pan.updateMatrixWorld(true);
  [[ecu, "ecu", "Calculatorul motorului (ECU)"], [obd, "obd", "Priza de diagnoză OBD"]].forEach(([o, k, n]) => { if (mot.comp[k]) return; const gg = new THREE.Group(); gg.userData.c = k; gg.name = n; pan.add(gg); pan.remove(o); gg.add(o); mot.comp[k] = gg; mot.ancore[k] = o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.06, 0)); });
  const cheie = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 24), M.crom); cheie.rotation.z = Math.PI / 2; cheie.position.set(-0.02, -0.15, -0.12); pan.add(cheie);
  tv([0.68, y0, 0.45], [0.68, -0.52, 0.45]);
  // fascicul ECU → motor
  { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.66, -0.15, 0.45), new THREE.Vector3(0.45, 0.1, 0.4), new THREE.Vector3(0.2, 0.4, 0.38), new THREE.Vector3(0.0, 0.42, 0.3)]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.008, 10), M.cauciuc); m.castShadow = true; scene.add(m); }

  // aparatele de atelier 3D (opțional): testerul OBD, termometrul cu infraroșu (cu raza laser), cronometrul, testerul de presiune al circuitului de răcire
  const AP = {};
  if (optiuni.aparate) {
    const ecr = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, x: c.getContext("2d"), t }; };
    const mA = (o) => { const m = new THREE.MeshStandardMaterial(o); m.envMapIntensity = 0.6; return m; };
    const plan = (G, e, w, h, x, y, z) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: e.t })); o.position.set(x, y, z); G.add(o); return o; };
    const rb = (G, w, h, d, r, m, x, y, z) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); o.position.set(x, y, z); o.castShadow = true; G.add(o); return o; };
    if (optiuni.aparate.includes("obd")) {   // tester OBD în husă de cauciuc, pe suportul panoului
      const G = new THREE.Group(); G.position.set(0.66, 0.06, 0.66); G.rotation.set(-0.35, 0.72, 0); scene.add(G);
      rb(G, 0.13, 0.21, 0.035, 0.012, mA({ color: 0x1f6fd0, roughness: 0.7 }), 0, 0, 0); rb(G, 0.115, 0.19, 0.03, 0.008, mA({ color: 0x1c1f23, roughness: 0.4 }), 0, 0, 0.004);
      const e = ecr(320, 240); plan(G, e, 0.1, 0.075, 0, 0.042, 0.0195);
      [[-0.03, -0.035], [0, -0.035], [0.03, -0.035], [0, -0.065]].forEach(([x, y]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.005, 20), mA({ color: 0x3a4048, roughness: 0.5 })); b.rotation.x = Math.PI / 2; b.position.set(x, y, 0.02); G.add(b); });
      AP.obd = { G, e, k: "" };
    }
    if (optiuni.aparate.includes("ir")) {   // termometrul IR (pistol): corpul, mânerul, trăgaciul, ecranul spre operator, emițătorul laser
      const G = new THREE.Group(); G.position.set(0.72, 0.02, 0.22); scene.add(G);
      const mo = mA({ color: 0xe0561a, roughness: 0.5 }), mn = mA({ color: 0x22262b, roughness: 0.6 });
      rb(G, 0.05, 0.05, 0.15, 0.012, mo, 0, 0, 0); rb(G, 0.035, 0.11, 0.045, 0.01, mn, 0, -0.07, -0.05).rotation.x = -0.25; rb(G, 0.012, 0.03, 0.012, 0.004, mn, 0, -0.032, -0.012);
      const e = ecr(220, 100); const sc = plan(G, e, 0.042, 0.019, 0, 0.004, -0.0755); sc.rotation.y = Math.PI;
      const nas = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.012, 24), mn); nas.rotation.x = Math.PI / 2; nas.position.z = 0.078; G.add(nas);
      const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 1, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); scene.add(laser);
      const punct = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 })); scene.add(punct);
      AP.ir = { G, e, laser, punct, k: "" };
    }
    if (optiuni.aparate.includes("crono")) {   // cronometrul digital, pe panoul standului
      const G = new THREE.Group(); G.position.set(0.6, -0.06, 0.38); G.rotation.set(-0.2, 0.8, 0); scene.add(G);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.016, 48), M.crom); c.rotation.x = Math.PI / 2; G.add(c);
      const e = ecr(220, 100); plan(G, e, 0.05, 0.023, 0, 0.004, 0.0085); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 16), M.otel); b.position.y = 0.045; G.add(b);
      AP.crono = { G, e, k: "" };
    }
    if (optiuni.aparate.includes("presiune") && mot.ancore.vas) {   // testerul de presiune: pompa de mână cu manometru, furtunul și adaptorul pe gâtul vasului
      const G = new THREE.Group(); G.position.set(0.42, 0.42, -0.62); G.rotation.y = -0.6; scene.add(G);
      const mr = mA({ color: 0xc62828, roughness: 0.45 });
      const corp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 32), mr); corp.position.y = -0.04; G.add(corp);
      const pist = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 12), M.crom); pist.position.y = 0.1; G.add(pist);
      const man = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.02), M.plastic); man.position.y = 0.16; G.add(man);
      const cad = new THREE.Group(); cad.position.set(0, 0.02, 0.05); G.add(cad);
      const rama = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.022, 48), M.crom); rama.rotation.x = Math.PI / 2; cad.add(rama);
      const e = ecr(256, 256); plan(cad, e, 0.068, 0.068, 0, 0, 0.0115);
      G.updateMatrixWorld(true); const A = G.localToWorld(new THREE.Vector3(0, -0.14, 0)), B = mot.ancore.vas.clone();
      const furt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A, A.clone().add(new THREE.Vector3(0, -0.08, 0)), new THREE.Vector3((A.x + B.x) / 2, Math.min(A.y, B.y) - 0.05, (A.z + B.z) / 2), B.clone().add(new THREE.Vector3(0, 0.05, 0)), B]), 60, 0.005, 10), M.cauciuc); scene.add(furt);
      const adapt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 24), M.alama); adapt.position.copy(B).add(new THREE.Vector3(0, -0.005, 0)); scene.add(adapt);
      AP.presiune = { G, e, furt, adapt, pist, k: "" };
    }
    if (optiuni.aparate.includes("opac") && mot.ancore.coada) {   // opacimetrul (AVL DiSmoke) pe cărucior, cu sonda în țeava finală
      const G = new THREE.Group(); G.position.set(-1.45, -0.82, 0.25); G.rotation.y = 0.5; scene.add(G);
      rb(G, 0.32, 0.5, 0.3, 0.02, mA({ color: 0xe9ecef, roughness: 0.5 }), 0, 0.27, 0); rb(G, 0.34, 0.03, 0.32, 0.01, mA({ color: 0x2b2f35, roughness: 0.6 }), 0, 0.015, 0);
      [[-0.14, -0.13], [0.14, -0.13], [-0.14, 0.13], [0.14, 0.13]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), M.cauciuc); r.rotation.x = Math.PI / 2; r.position.set(x, -0.0, z); G.add(r); });
      rb(G, 0.24, 0.12, 0.02, 0.006, mA({ color: 0x1c1f23, roughness: 0.4 }), 0, 0.4, 0.152); const e = ecr(320, 160); plan(G, e, 0.2, 0.1, 0, 0.4, 0.163);
      const bandaAVL = new THREE.Mesh(new THREE.BoxGeometry(0.322, 0.03, 0.302), mA({ color: 0xc62828, roughness: 0.5 })); bandaAVL.position.y = 0.5; G.add(bandaAVL);
      G.updateMatrixWorld(true); const A = G.localToWorld(new THREE.Vector3(0.1, 0.3, -0.15)), B = mot.ancore.coada.clone();
      const furt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A, A.clone().add(new THREE.Vector3(0, 0.2, -0.1)), new THREE.Vector3((A.x + B.x) / 2, Math.max(A.y, B.y) + 0.2, (A.z + B.z) / 2), B.clone().add(new THREE.Vector3(-0.06, 0.03, 0.02)), B.clone().add(new THREE.Vector3(0.02, 0, 0))]), 60, 0.007, 10), M.cauciuc); scene.add(furt);
      const sonda = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 12), M.crom); sonda.position.copy(B).add(new THREE.Vector3(0.03, 0.0, 0.0)); sonda.rotation.z = Math.PI / 2; scene.add(sonda);
      AP.opac = { G, e, furt, sonda, k: "" };
    }
    if (optiuni.aparate.includes("cilindru") && mot.ancore.dozare) {   // cilindrul gradat pentru testul de dozare AdBlue (modulul scos din suport, cu duza în cilindru)
      const G = new THREE.Group(); G.position.set(-0.75, -0.82, 0.05); scene.add(G);
      const st = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 32, 1, true), st); c.position.y = 0.16; G.add(c);
      const baza = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.012, 32), st); baza.position.y = 0.006; G.add(baza);
      for (let k = 1; k <= 10; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(k % 5 ? 0.012 : 0.022, 0.0012, 0.001), new THREE.MeshBasicMaterial({ color: 0x1b2733 })); l.position.set(0, 0.012 + k * 0.026, 0.0352); G.add(l); }
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 1, 32), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.6, roughness: 0.1 })); liq.scale.y = 0.0001; G.add(liq);
      const B = mot.ancore.dozare.clone(), A = new THREE.Vector3(-0.75, -0.48, 0.05);
      const furt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([B, B.clone().add(new THREE.Vector3(0, 0.05, 0.1)), new THREE.Vector3(-0.76, -0.3, 0.05), A]), 40, 0.004, 8), M.cauciuc); scene.add(furt);
      const modul = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 16), M.otel); modul.position.copy(A).add(new THREE.Vector3(0, -0.02, 0)); scene.add(modul);
      AP.cil = { G, liq, furt, modul, k: "" };
    }
  }
  function actualizeazaAparate(t) {
    const a = stare.aparate || {};
    if (AP.obd) { const o = a.obd || {}; AP.obd.G.visible = o.vizibil !== false; const k = JSON.stringify(o); if (k !== AP.obd.k) { AP.obd.k = k; const { x, c } = AP.obd.e;
      x.fillStyle = "#06121d"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1f6fd0"; x.fillRect(0, 0, c.width, 30); x.fillStyle = "#fff"; x.font = "bold 16px system-ui"; x.textAlign = "left"; x.fillText(o.titlu || "Date curente", 10, 21);
      (o.linii || []).forEach(([e, v, alerta], i) => { x.fillStyle = "#9fb3c6"; x.font = "15px system-ui"; x.fillText(e, 10, 60 + i * 34); x.fillStyle = alerta ? "#ffb02e" : "#6dff8e"; x.font = "bold 20px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(v, c.width - 10, 60 + i * 34); x.textAlign = "left"; });
      if (!o.linii) { x.fillStyle = "#567"; x.font = "15px system-ui"; x.fillText("deconectat", 10, 70); } AP.obd.e.t.needsUpdate = true; } }
    if (AP.ir) { const o = a.ir || {}, I = AP.ir; I.G.visible = o.vizibil !== false; const tgt = mot.ancore.ir;
      if (tgt) { I.G.lookAt(tgt); } const on = !!o.on && I.G.visible; I.laser.visible = I.punct.visible = on;
      if (on && tgt) { const n = I.G.localToWorld(new THREE.Vector3(0, 0, 0.085)), d = tgt.clone().sub(n), L = d.length(); I.laser.position.copy(n).addScaledVector(d, 0.5); I.laser.scale.y = L; I.laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); I.punct.position.copy(tgt); }
      const txt = on ? (o.T ?? 0).toFixed(1) : "--.-"; if (txt !== I.k) { I.k = txt; const { x, c } = I.e; x.fillStyle = "#1d2228"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#9fe6c0"; x.font = "bold 58px 'Courier New',monospace"; x.textAlign = "right"; x.textBaseline = "middle"; x.fillText(txt, c.width - 12, 56); x.font = "14px system-ui"; x.textAlign = "left"; x.fillText("°C  ε 0,95", 8, 16); I.e.t.needsUpdate = true; } }
    if (AP.opac) { const o = a.opac || {}, O = AP.opac; O.G.visible = !!o.vizibil; O.furt.visible = O.sonda.visible = !!o.vizibil && !!o.sonda;
      const k = JSON.stringify(o); if (o.vizibil && k !== O.k) { O.k = k; const { x, c } = O.e; x.fillStyle = "#0b1a12"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#c62828"; x.fillRect(0, 0, c.width, 26); x.fillStyle = "#fff"; x.font = "bold 15px system-ui"; x.textAlign = "left"; x.fillText("AVL DiSmoke · opacitate", 8, 18);
        x.fillStyle = "#9fe6c0"; x.font = "bold 40px 'Courier New',monospace"; x.textAlign = "right"; x.fillText((o.N ?? 0).toFixed(1) + " %", c.width - 10, 74); x.fillText((o.k ?? 0).toFixed(2), c.width - 70, 128); x.font = "16px system-ui"; x.fillText("m⁻¹", c.width - 10, 128);
        x.textAlign = "left"; x.fillStyle = "#8fb"; x.font = "14px system-ui"; x.fillText(o.mesaj || "", 8, 152); O.e.t.needsUpdate = true; } }
    if (AP.cil) { const o = a.cil || {}, C = AP.cil; C.G.visible = C.furt.visible = C.modul.visible = !!o.vizibil; const h = Math.max(0.0001, Math.min(1, (o.V || 0) / (o.max || 100)) * 0.26); C.liq.scale.y = h; C.liq.position.y = 0.012 + h / 2; }
    if (AP.crono) { const o = a.crono || {}; AP.crono.G.visible = o.vizibil !== false; const tt = o.t || 0, txt = `${String(Math.floor(tt / 60)).padStart(2, "0")}:${String(Math.floor(tt % 60)).padStart(2, "0")}`;
      if (txt !== AP.crono.k) { AP.crono.k = txt; const { x, c } = AP.crono.e; x.fillStyle = "#aab79c"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1b2416"; x.font = "bold 62px 'Courier New',monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, c.width / 2, 54); AP.crono.e.t.needsUpdate = true; } }
    if (AP.presiune) { const o = a.presiune || {}, Pr = AP.presiune, viz = !!o.vizibil; Pr.G.visible = viz; Pr.furt.visible = Pr.adapt.visible = viz && !!o.montat; Pr.pist.position.y = 0.1 - 0.05 * Math.max(0, Math.sin(t * 6)) * (o.pompeaza ? 1 : 0);
      const k = `${(o.p || 0).toFixed(3)}|${(o.max ?? -1).toFixed(3)}`; if (viz && k !== Pr.k) { Pr.k = k; const { x, c } = Pr.e, R = c.width / 2, ang = v => (-225 + 270 * Math.max(0, Math.min(1, v / 2.5))) * Math.PI / 180;
        x.fillStyle = "#fbfbf7"; x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.fill(); x.strokeStyle = "#d32f2f"; x.lineWidth = 12; x.beginPath(); x.arc(R, R, R - 16, ang(1.4), ang(2.5)); x.stroke();
        for (let i = 0; i <= 25; i++) { const a2 = ang(i / 10), M5 = i % 5 === 0; x.strokeStyle = "#111"; x.lineWidth = M5 ? 4 : 2; x.beginPath(); x.moveTo(R + Math.cos(a2) * (R - 8), R + Math.sin(a2) * (R - 8)); x.lineTo(R + Math.cos(a2) * (R - (M5 ? 30 : 20)), R + Math.sin(a2) * (R - (M5 ? 30 : 20))); x.stroke();
          if (M5) { x.fillStyle = "#111"; x.font = "bold 22px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText((i / 10).toFixed(1).replace(".", ","), R + Math.cos(a2) * (R - 52), R + Math.sin(a2) * (R - 52)); } }
        x.fillStyle = "#222"; x.font = "bold 24px system-ui"; x.fillText("bar", R, R + 50); x.font = "13px system-ui"; x.fillText("COOLING SYSTEM", R, R - 46);
        if (o.max != null && o.max > 0) { const am = ang(o.max); x.strokeStyle = "#1d4ed8"; x.lineWidth = 3; x.beginPath(); x.moveTo(R, R); x.lineTo(R + Math.cos(am) * (R - 22), R + Math.sin(am) * (R - 22)); x.stroke(); }
        const ap = ang(o.p || 0); x.strokeStyle = "#c62828"; x.lineWidth = 6; x.beginPath(); x.moveTo(R - Math.cos(ap) * 22, R - Math.sin(ap) * 22); x.lineTo(R + Math.cos(ap) * (R - 20), R + Math.sin(ap) * (R - 20)); x.stroke(); x.fillStyle = "#111"; x.beginPath(); x.arc(R, R, 12, 0, Math.PI * 2); x.fill(); Pr.e.t.needsUpdate = true; } }
  }
  // sondele instrumentului (cablu roșu / negru sau cablul OBD)
  const sonde = new THREE.Group(); scene.add(sonde);
  const matR = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 }), matN = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }), matG = new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.5 });
  const P0 = new THREE.Vector3(0.95, -0.35, 0.85);
  function arataSonda(k, tip) {
    while (sonde.children.length) { const o = sonde.children.pop(); o.geometry.dispose(); }
    if (!k || !mot.ancore[k]) return;
    const A = mot.ancore[k].clone();
    [[tip === "osc" ? matG : matR, 0], [matN, 0.015]].forEach(([m, d]) => {
      const c = new THREE.CatmullRomCurve3([P0.clone().add(new THREE.Vector3(0, 0, d)), new THREE.Vector3((P0.x + A.x) / 2, Math.min(P0.y, A.y) - 0.15, (P0.z + A.z) / 2 + d), A.clone().add(new THREE.Vector3(0.01 + d, 0.03, 0.01))]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.004, 8), m); t.castShadow = true; sonde.add(t);
      const v = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 10), m); v.position.copy(A).add(new THREE.Vector3(0.01 + d, 0.02, 0.01)); sonde.add(v);
    });
  }
  // furtunurile aparatelor (compresometru, tester de pierdere, trusa de presiune, returul în vasul gradat): de la ancora de pe motor spre aparat
  const furt = new THREE.Group(); scene.add(furt); let cheieF = "";
  function furtune(lista) {
    const k = JSON.stringify(lista || []); if (k === cheieF) return; cheieF = k;
    while (furt.children.length) { const o = furt.children.pop(); o.geometry.dispose(); }
    (lista || []).forEach((f, i) => {
      const A = mot.ancore[f.k]; if (!A) return;
      const B = new THREE.Vector3(...(f.spre || [0.95, -0.3, 0.8 - i * 0.08])), m = f.laser ? new THREE.MeshBasicMaterial({ color: 0xff2020 }) : new THREE.MeshStandardMaterial({ color: f.c ?? 0x151515, roughness: 0.55 });
      if (f.laser) { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(B, A.clone()), 1, 0.0012, 6), m); furt.add(t); const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), m); d.position.copy(A); furt.add(d); return; }
      const c = new THREE.CatmullRomCurve3([A.clone(), A.clone().add(new THREE.Vector3(0, 0.12, 0.02)), new THREE.Vector3((A.x + B.x) / 2, Math.max(A.y, B.y) + 0.1, (A.z + B.z) / 2 + 0.15), B]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(c, 64, f.r || 0.006, 10), m); t.castShadow = true; furt.add(t);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.03, 6), mot.M.alama); a.position.copy(A).add(new THREE.Vector3(0, 0.012, 0)); furt.add(a);   // adaptorul / racordul
    });
  }
  // etichete
  const elEt = cont.querySelector(".m3d-etichete");
  const ET = optiuni.etichete || {};
  const et = Object.keys(mot.ancore).filter(k => ET[k]).map(k => { const d = document.createElement("div"); d.className = "m3d-eticheta"; d.textContent = ET[k]; d.dataset.c = k; d.addEventListener("click", () => optiuni.onSelect && optiuni.onSelect(k)); elEt.appendChild(d); return { k, el: d }; });
  // vederi prestabilite
  const VEDERI = { ...(mot.interior ? { ungere: [[-0.26, 0.4, 1.45], [0.0, 0.06, 0.0]] } : {}), ...(mot.racire ? { racire: [[1.25, 0.85, 0.75], [-0.02, 0.12, -0.32]] } : {}), gen: [[1.25, 1.0, 1.45], [-0.05, 0.15, 0]], adm: [[0.15, 0.85, 1.05], [-0.05, 0.3, 0.22]], ev: [[0.95, 0.45, -0.55], [0.0, 0.1, -0.28]], ...(optiuni.postTratare ? { post: [[-0.45, 0.3, -1.45], [-0.7, -0.32, -0.36]], cr: [[0.55, 0.95, 0.75], [0.0, 0.45, 0.15]] } : {}), vol: [[-0.75, 0.55, 0.55], [-0.27, 0.15, 0.0]], dist: [[0.95, 0.35, 0.35], [0.28, 0.1, 0.05]], sus: [[0.0, 1.6, 0.01], [0, 0.2, 0]] };
  const NUME_V = { post: "post-tratare", cr: "common rail", ungere: "ungere (secțiune)", racire: "răcire", gen: "general", adm: "admisie", ev: "evacuare / λ", vol: "volant / CKP", dist: "distribuție", sus: "de sus" };
  const cv = cont.querySelector(".m3d-vederi");
  cv.innerHTML = Object.keys(VEDERI).map(k => `<button type="button" data-v="${k}">${NUME_V[k]}</button>`).join("");
  let zbor = null;
  const zboara = (p, t) => { zbor = { p0: camera.position.clone(), t0: ctl.target.clone(), p1: new THREE.Vector3(...p), t1: new THREE.Vector3(...t), k: 0 }; };
  cv.querySelectorAll("button").forEach(b => b.addEventListener("click", () => zboara(...VEDERI[b.dataset.v])));
  // modul carcasei (machetă opacă / transparentă / secționată)
  const setMod = m => { mot.modCarcasa(m); cv.querySelectorAll("[data-mod]").forEach(b => b.classList.toggle("activ", b.dataset.mod === m)); };
  if (mot.interior || mot.racire) {
    cv.insertAdjacentHTML("beforeend", `<span class="m3d-sep"></span>${[["sectionat", "secționat"], ["transparent", "transparent"], ["opac", "carcasă opacă"]].map(([k, t]) => `<button type="button" data-mod="${k}">${t}</button>`).join("")}`);
    cv.querySelectorAll("[data-mod]").forEach(b => b.addEventListener("click", () => setMod(b.dataset.mod)));
    setMod(optiuni.mod || "opac"); if (optiuni.mod) { zboara(...(VEDERI[optiuni.vedere] || (optiuni.mod === "sectionat" ? VEDERI.ungere : VEDERI.gen))); zbor.k = 0.999; }
  }
  // selectare prin clic (raycasting)
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let jos = null;
  canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return;
    const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(Object.values(mot.comp), true)[0];
    if (hit) { let o = hit.object; while (o && !o.userData.c) o = o.parent; if (o && optiuni.onSelect) optiuni.onSelect(o.userData.c); }
  });
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(mouse, camera); canvas.style.cursor = ray.intersectObjects(Object.values(mot.comp), true).length ? "pointer" : "grab";
  });
  const v3 = new THREE.Vector3();
  function etichete(w, h, sel) {
    const puse = [];
    et.map(e => { mot.ancore[e.k].clone().applyMatrix4(mot.grup.matrixWorld).project(camera); v3.copy(mot.ancore[e.k]).applyMatrix4(mot.grup.matrixWorld).project(camera); return { e, x: (v3.x * 0.5 + 0.5) * w, y: (-v3.y * 0.5 + 0.5) * h, vis: v3.z < 1 }; })
      .sort((a, b) => a.y - b.y).forEach(o => {
        o.e.el.style.display = o.vis ? "" : "none"; if (!o.vis) return;
        let y = o.y; const lw = o.e.el.offsetWidth || 60;
        for (let k = 0; k < 10; k++) { const c = puse.find(p => Math.abs(p.y - y) < 19 && o.x < p.x + p.w + 6 && p.x < o.x + lw + 6); if (!c) break; y = c.y + 20; }
        puse.push({ x: o.x, y, w: lw });
        o.e.el.style.transform = `translate(${o.x}px, ${y}px)`; o.e.el.style.setProperty("--dy", `${o.y - y}px`);
        o.e.el.classList.toggle("sel", o.e.k === sel);
      });
  }
  let stare = { rpm: 0, tps: 0, selectat: null, decuplat: {}, timp: 0, vent: false, tEv: 20, eticheteVizibile: true }, raf = 0, tP = performance.now();
  function bucla(t) {
    raf = requestAnimationFrame(bucla);
    const dt = Math.min(0.1, Math.max(0, (t - tP) / 1000)); tP = t;
    if (!cont.getClientRects().length) return;
    stare.timp += dt;
    mot.actualizeaza(stare, dt); furtune(stare.furtune); if (optiuni.aparate) actualizeazaAparate(stare.timp);
    if (ap.man) { const u = stare.ulei || {}, us = stare.uleiStare || {}; const vm = !!u.man && (us.ad || 0) > 0.97; ap.man.visible = ap.furtun.visible = ap.sup.visible = vm; ap.term.visible = ap.cablu.visible = u.term === true;
      const pm = vm ? (u.pAfis ?? u.p ?? 0) : 0, T = u.Tafis; if (Math.abs(pm - ap.ult[0]) > 0.004 || T !== ap.ult[1]) { ap.deseneaza(pm, T); ap.ult = [pm, T]; } }
    if (stare.rpm > 50) mot.grup.position.set((Math.random() - 0.5) * 0.0008, (Math.random() - 0.5) * 0.0008, 0); else mot.grup.position.set(0, 0, 0);
    if (zbor) { zbor.k = Math.min(1, zbor.k + dt / 0.8); const e = zbor.k * zbor.k * (3 - 2 * zbor.k); camera.position.lerpVectors(zbor.p0, zbor.p1, e); ctl.target.lerpVectors(zbor.t0, zbor.t1, e); if (zbor.k >= 1) zbor = null; }
    ctl.update();
    const w = cont.clientWidth, h = cont.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
    elEt.style.display = stare.eticheteVizibile ? "" : "none";
    if (stare.eticheteVizibile) etichete(w, h, stare.selectat);
  }
  function temaFundal() { const t = document.documentElement.getAttribute("data-theme"), inchis = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); scene.background = new THREE.Color(inchis ? 0x14181d : 0xcfd5db); pod.material.color.set(inchis ? 0x3a3f45 : 0x8d949b); }
  temaFundal(); window.addEventListener("schimbare-tema", temaFundal);
  raf = requestAnimationFrame(bucla);
  return {
    stare, scene, mot, camera, ctl, cont, canvas,
    seteaza(s) { Object.assign(stare, s); },
    modCarcasa: m => mot.interior && setMod(m),
    vedere(pz, tg) { zboara(pz, tg); },
    selecteaza(k, focus) { stare.selectat = k; if (focus && mot.ancore[k]) { const A = mot.ancore[k].clone(), dir = camera.position.clone().sub(ctl.target).normalize(); zboara([A.x + dir.x * 0.75, A.y + Math.max(0.25, dir.y * 0.75), A.z + dir.z * 0.75], [A.x, A.y, A.z]); } },
    sonda: arataSonda,
    distruge() { cancelAnimationFrame(raf); window.removeEventListener("schimbare-tema", temaFundal); renderer.dispose(); }
  };
}
