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
  // rola întinzătoare automată: braț pivotant cu arc, rolă netedă pe rulment (apasă pe spatele curelei, pe ramura lungă)
  const PT = { y: 0.075, z: 0.125, r: 0.032 };
  const intinz = new THREE.Group(); intinz.position.set(XP, PT.y, PT.z); g.add(intinz); rot.intinz = intinz;
  intinz.add(lathe([[0.008, -0.016], [PT.r - 0.002, -0.016], [PT.r, -0.012], [PT.r + 0.0008, 0], [PT.r, 0.012], [PT.r - 0.002, 0.016], [0.008, 0.016]], MP.rola));
  intinz.add(lathe([[0.008, 0.016], [0.02, 0.016], [0.02, 0.02], [0.008, 0.02]], MP.negru));                                // capacul de praf al rulmentului
  cyl(0.006, 0.006, 0.006, M.crom, 0.022, 0, 0, "x", intinz);
  { const piv = { y: 0.15, z: 0.065 }, dy = PT.y - piv.y, dz = PT.z - piv.z, L = Math.hypot(dy, dz);
    const brat = box(0.012, L + 0.03, 0.026, MP.aluCast, XP - 0.024, (PT.y + piv.y) / 2, (PT.z + piv.z) / 2); brat.rotation.x = Math.atan2(dz, dy) * -1;
    cyl(0.022, 0.022, 0.03, MP.aluCast, XP - 0.036, piv.y, piv.z, "x");                                                    // carcasa arcului spiral
    cyl(0.008, 0.008, 0.01, M.crom, XP - 0.016, piv.y, piv.z, "x");
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.002, 6, 24, Math.PI * 1.6), M.otel); arc.rotation.y = Math.PI / 2; arc.position.set(XP - 0.02, piv.y, piv.z); add(arc);
    box(0.004, 0.012, 0.003, M.galben, XP - 0.02, piv.y + 0.018, piv.z, g);                                              // indicatorul de tensiune
  }
  // cureaua Poly-V (6 nervuri), calculată ca tangente exterioare/interioare la cele trei fulii
  { const P = [{ u: 0, v: 0, r: 0.074 + 0.003 }, { u: PT.z, v: PT.y, r: -(PT.r + 0.0008) }, { u: 0.19, v: 0.205, r: 0.028 + 0.003 }, { u: PW.z, v: PW.y, r: PW.r + 0.003 }];   // r < 0: fulia atinge spatele curelei
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
  return { grup: g, rot, XP,
    roteste(d) {
      rot.fulia.rotation.x -= d; rot.altern.rotation.x -= d * 0.077 / 0.031; rot.intinz.rotation.x += d * 0.077 / 0.0328; rot.pompa.rotation.x -= d * 0.077 / 0.05;
      rot.sCurea = (rot.sCurea || 0) + d * 0.077; rot.marcaje.pozitie(rot.sCurea);
    } };
}

/** construiește motorul; întoarce grupul, componentele selectabile și ancorele etichetelor/sondelor */
export function construiesteMotor(opt = {}) {
  const M = MAT(), g = new THREE.Group(), comp = {}, ancore = {}, conectori = {}, rot = {};
  const { add, box, rbox, cyl, tub } = ajutoare(g);
  const grupC = (k, nume) => { const gg = new THREE.Group(); gg.userData.c = k; gg.name = nume || k; g.add(gg); comp[k] = gg; return gg; };
  const XC = [-0.135, -0.045, 0.045, 0.135];     // pozițiile cilindrilor pe axa x

  // ---------------- blocul motor (fontă) cu nervuri, carterul inferior, chiulasa, capacul
  rbox(0.46, 0.36, 0.27, 0.012, M.fonta, -0.01, 0.07, 0);
  for (const s of [1, -1]) for (let i = 0; i < 6; i++) box(0.012, 0.3, 0.014, M.fonta, -0.2 + i * 0.08, 0.06, s * 0.142);
  rbox(0.44, 0.15, 0.29, 0.02, M.aluMat, -0.01, -0.185, -0.005);                 // baia de ulei
  for (let i = 0; i < 7; i++) box(0.006, 0.12, 0.3, M.aluMat, -0.2 + i * 0.065, -0.19, -0.005);
  cyl(0.012, 0.012, 0.03, M.otel, 0.12, -0.27, -0.06);                         // bușonul de golire
  rbox(0.47, 0.12, 0.25, 0.01, M.alu, -0.01, 0.31, 0);                           // chiulasa (aluminiu)
  rbox(0.42, 0.08, 0.2, 0.03, M.plastic, -0.02, 0.405, 0.005);                   // capacul culbutorilor
  for (let i = 0; i < 5; i++) box(0.36, 0.006, 0.01, M.plastic, -0.02, 0.447, -0.06 + i * 0.03);
  cyl(0.026, 0.026, 0.025, M.galben, 0.09, 0.455, 0.05);                         // bușonul de umplere cu ulei
  // bobina de inducție (DIS) și fișele de înaltă tensiune către bujii
  rbox(0.11, 0.05, 0.08, 0.008, M.plastic, -0.04, 0.47, -0.02);
  XC.forEach((x, i) => { cyl(0.012, 0.012, 0.05, M.cauciuc, x, 0.43, -0.085); tub([[-0.04 + (i - 1.5) * 0.02, 0.47, -0.06], [(-0.04 + x) / 2, 0.5, -0.09], [x, 0.46, -0.09]], 0.004, M.cauciuc); });
  // filtrul de ulei, demarorul, tija de nivel
  cyl(0.045, 0.045, 0.11, M.albastru, 0.08, -0.02, 0.19, "z");
  cyl(0.045, 0.045, 0.16, M.otel, -0.3, -0.02, 0.17, "x");
  tub([[0.16, 0.26, 0.13], [0.17, 0.4, 0.17], [0.17, 0.46, 0.18]], 0.004, M.galben);

  // ---------------- partea distribuției (+x): carcasa curelei de distribuție și transmisia accesoriilor
  rbox(0.05, 0.56, 0.24, 0.02, new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.75 }), 0.25, 0.15, 0.0);                     // carcasa curelei de distribuție
  const acc = transmisieAccesorii({ M }); g.add(acc.grup); Object.assign(rot, acc.rot); const XP = acc.XP;
  ancore.distributie = new THREE.Vector3(XP, 0.1, 0.0);

  // ---------------- partea volantului (−x): carcasa ambreiajului cu fereastră, coroana dințată 60−2, senzorul CKP
  const clopot = cyl(0.19, 0.17, 0.16, M.alu, -0.33, 0.0, 0.0, "x");
  cyl(0.15, 0.13, 0.25, M.alu, -0.53, -0.02, 0.0, "x");                           // cutia de viteze
  rbox(0.12, 0.2, 0.18, 0.02, M.alu, -0.6, -0.07, 0.08);
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
  const conducta = tub([[-0.29, 0.33, 0.28], [-0.36, 0.34, 0.28], [-0.44, 0.4, 0.28], [-0.52, 0.47, 0.25]], 0.045, M.cauciuc);
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.004, 6, 20), M.cauciuc); r.position.set(-0.36 - i * 0.022, 0.345 + i * 0.012, 0.28); r.rotation.y = Math.PI / 2; g.add(r); }
  { const c = grupC("iat", "Senzorul IAT"); cyl(0.01, 0.01, 0.03, M.plastic, -0.42, 0.44, 0.28, "y", c); conectori.iat = rbox(0.02, 0.016, 0.02, 0.004, M.albastru, -0.42, 0.46, 0.28, c); ancore.iat = new THREE.Vector3(-0.42, 0.47, 0.28); }
  if (opt.filtruAer !== false) { rbox(0.28, 0.12, 0.22, 0.03, M.plastic, -0.6, 0.5, 0.24); }
  // rampa de combustibil și injectoarele
  cyl(0.011, 0.011, 0.38, M.crom, -0.0, 0.29, 0.165, "x");
  tub([[0.19, 0.29, 0.165], [0.24, 0.32, 0.21], [0.3, 0.33, 0.29]], 0.005, M.otel);
  XC.forEach((x, i) => { const k = "inj" + (i + 1), c = grupC(k, `Injectorul cilindrului ${i + 1}`);
    cyl(0.011, 0.009, 0.06, M.verde, x, 0.25, 0.155, "y", c);
    conectori[k] = rbox(0.026, 0.016, 0.02, 0.004, M.plasticGri, x, 0.305, 0.185, c); ancore[k] = new THREE.Vector3(x, 0.315, 0.19); });
  // supapa canistrei
  { const c = grupC("can", "Supapa de purjare a canistrei"); cyl(0.022, 0.022, 0.05, M.plastic, 0.18, 0.4, 0.36, "z", c); conectori.can = rbox(0.022, 0.016, 0.02, 0.004, M.plasticGri, 0.18, 0.43, 0.36, c); tub([[0.18, 0.4, 0.33], [0.12, 0.38, 0.32], [0.05, 0.35, 0.33]], 0.006, M.cauciuc); ancore.can = new THREE.Vector3(0.18, 0.44, 0.36); }

  // ---------------- evacuarea (−z): galeria din fontă, scutul termic, sonda λ amonte, catalizatorul, sonda λ aval
  const gal = [];
  XC.forEach((x, i) => gal.push(tub([[x, 0.29, -0.13], [x, 0.27, -0.19], [x * 0.5, 0.2, -0.23], [0.0, 0.14, -0.25]], 0.022, M.ruginaCald)));
  cyl(0.04, 0.04, 0.06, M.ruginaCald, 0.0, 0.12, -0.25, "y");
  const scut = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.36, 24, 1, true, Math.PI * 0.45, Math.PI * 0.65), M.scut); scut.rotation.z = Math.PI / 2; scut.position.set(0, 0.25, -0.2); add(scut);
  { const c = grupC("l1", "Sonda λ amonte"); const s = cyl(0.009, 0.009, 0.05, M.crom, 0.05, 0.13, -0.29, "y", c); s.rotation.x = -0.6; cyl(0.012, 0.012, 0.012, M.otel, 0.05, 0.11, -0.28, "y", c);
    tub([[0.05, 0.16, -0.31], [0.08, 0.3, -0.33], [0.1, 0.42, -0.3]], 0.0035, M.cauciuc, c); conectori.l1 = rbox(0.03, 0.018, 0.02, 0.004, M.violet, 0.1, 0.43, -0.3, c); ancore.l1 = new THREE.Vector3(0.05, 0.16, -0.31); }
  if (opt.stand !== false) {
    const linieEv = [[0.0, 0.1, -0.25], [0.02, 0.0, -0.3], [0.0, -0.15, -0.34], [-0.15, -0.3, -0.36], [-0.45, -0.34, -0.36]];
    tub(linieEv, 0.024, M.ruginaCald);
    const cat = linieEv[3];
    rbox(0.22, 0.11, 0.13, 0.04, M.scut, cat[0] - 0.08, cat[1], cat[2]);
    { const c = grupC("l2", "Sonda λ aval"); const p = linieEv[3]; cyl(0.009, 0.009, 0.05, M.crom, p[0] - 0.24, p[1] + 0.015, p[2], "y", c);
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
    tub([[-0.665, YG, ZG], [-0.72, -0.22, -0.29], [-0.78, -0.25, -0.26]], 0.024, M.ruginaCald);
    cyl(0.045, 0.045, 0.008, M.otel, -0.78, -0.25, -0.26, "x");                                                                         // flanșa spre țeava intermediară
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
  rbox(0.07, 0.07, 0.08, 0.012, M.alu, -0.27, 0.31, 0.04);
  { const c = grupC("ect", "Senzorul de temperatură CTS"); cyl(0.012, 0.012, 0.03, M.alama, -0.27, 0.355, 0.06, "y", c); conectori.ect = rbox(0.022, 0.02, 0.024, 0.004, M.verde, -0.27, 0.38, 0.06, c); ancore.ect = new THREE.Vector3(-0.27, 0.39, 0.06); }
  if (opt.stand !== false) tub([[-0.3, 0.31, 0.04], [-0.4, 0.28, -0.05], [-0.38, 0.2, -0.45], [-0.2, 0.18, -0.8]], 0.018, M.cauciuc);
  else tub([[-0.3, 0.31, 0.04], [-0.38, 0.3, -0.1], [-0.3, 0.28, -0.35], [-0.2, 0.25, -0.5]], 0.018, M.cauciuc);

  // fasciculul de cabluri (tub gofrat) care leagă conectorii
  const traseu = ["ect", "clap", "tps", "inj1", "inj2", "inj3", "inj4", "map", "can"].map(k => ancore[k].clone().add(new THREE.Vector3(0, 0.03, 0)));
  tub(traseu.map(v => [v.x, v.y, v.z]), 0.009, M.cauciuc, g, 160);
  // marcarea zonei pentru materiale fierbinți
  const matCald = M.ruginaCald;
  return { grup: g, comp, ancore, conectori, rot, M, XC, matCald,
    /** actualizarea animației: st = { rpm, tps (0…100), ect, selectat, decuplat{}, timp } */
    actualizeaza(st, dt) {
      const w = (st.rpm || 0) / 60 * 2 * Math.PI;
      const vis = w * dt / 30;                                 // rotația afișată (încetinită ×30 pentru a se vedea)
      rot.volant.rotation.x -= vis; acc.roteste(vis);
      rot.clapeta.rotation.y = (st.tps || 0) / 100 * Math.PI / 2 * 0.95;
      matCald.emissiveIntensity = Math.max(0, Math.min(0.9, ((st.tEv || 20) - 480) / 500));
      Object.entries(conectori).forEach(([k, m]) => { if (!m.userData.y0) m.userData.y0 = m.position.y; m.position.y = m.userData.y0 + (st.decuplat && st.decuplat[k] ? 0.03 : 0); });
      Object.entries(comp).forEach(([k, gg]) => {
        const sel = k === st.selectat, pulse = sel ? 0.35 + 0.25 * Math.sin((st.timp || 0) * 5) : 0;
        gg.traverse(o => { if (o.isMesh) { if (!o.userData.mOrig) { o.userData.mOrig = o.material; o.material = o.material.clone(); } o.material.emissive = o.material.emissive || new THREE.Color(0); o.material.emissive.setHex(sel ? 0xffb020 : 0x000000); o.material.emissiveIntensity = pulse; } });
      });
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
  const mot = construiesteMotor({ stand: true }); scene.add(mot.grup);
  const M = mot.M;
  // cadrul standului (țevi rectangulare vopsite), roți, radiatorul cu electroventilator, bateria, panoul cu ECU
  const st3 = new THREE.Group(); scene.add(st3);
  const tv = (a, b) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B); const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, L, 0.04), M.stand); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = m.receiveShadow = true; st3.add(m); };
  const y0 = -0.74, X0 = -0.8, X1 = 0.75, Z0 = -0.6, Z1 = 0.6;
  [[X0, Z0, X1, Z0], [X0, Z1, X1, Z1], [X0, Z0, X0, Z1], [X1, Z0, X1, Z1], [-0.1, Z0, -0.1, Z1]].forEach(([a, b, c, d]) => tv([a, y0, b], [c, y0, d]));
  [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]].forEach(([x, z]) => { tv([x, y0, z * 4], [x, -0.3, z]); });
  [[X0, Z0], [X0, Z1], [X1, Z0], [X1, Z1]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 24), M.cauciuc); r.rotation.x = Math.PI / 2; r.position.set(x, -0.77, z); r.castShadow = true; st3.add(r); });
  // suporturile elastice ale motorului
  [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 20), M.cauciuc); s.position.set(x, -0.29, z); st3.add(s); });
  // radiatorul (în fața evacuării) și ventilatorul
  const rad = new THREE.Group(); rad.position.set(-0.05, 0.05, -0.85); st3.add(rad);
  const nucleu = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.04), new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.7, metalness: 0.5 })); rad.add(nucleu);
  for (let i = 0; i < 40; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.37, 0.042), M.aluMat); f.position.x = -0.3 + i * 0.0155; rad.add(f); }
  [-0.33, 0.33].forEach(x => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.06), M.plastic); c.position.x = x; rad.add(c); });
  const vent = new THREE.Group(); vent.position.set(0, 0, 0.06); rad.add(vent);
  const carcV = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 40), M.plastic); vent.add(carcV);
  const pal = new THREE.Group(); vent.add(pal);
  for (let k = 0; k < 7; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.006), M.plastic); p.position.set(Math.cos(k / 7 * Math.PI * 2) * 0.08, Math.sin(k / 7 * Math.PI * 2) * 0.08, 0); p.rotation.z = k / 7 * Math.PI * 2; p.rotation.x = 0.4; pal.add(p); }
  tv([-0.35, y0, -0.6], [-0.35, -0.15, -0.85]); tv([0.25, y0, -0.6], [0.25, -0.15, -0.85]);
  // vasul de expansiune
  const vas = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.14, 0.1, 3, 0.02), M.lichid); vas.position.set(0.45, 0.32, -0.45); st3.add(vas);
  // bateria
  const bat = new THREE.Group(); bat.position.set(0.5, -0.62, 0.32); st3.add(bat);
  const bc = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.19, 0.17, 3, 0.01), M.baterie); bc.castShadow = true; bat.add(bc);
  [[-0.08, 0xc62828], [0.08, 0x222222]].forEach(([x, c]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 16), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); b.position.set(x, 0.105, 0.04); bat.add(b); });
  // panoul de comandă cu ECU, cheia de contact și priza OBD
  const pan = new THREE.Group(); pan.position.set(0.68, -0.25, 0.45); pan.rotation.y = -0.6; st3.add(pan);
  const pl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.55, 0.45), M.stand); pan.add(pl);
  const ecu = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.18, 0.24, 2, 0.006), M.alu); ecu.position.set(-0.025, 0.1, 0); pan.add(ecu);
  const obd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), M.plastic); obd.position.set(-0.02, -0.15, 0.1); pan.add(obd);
  const cheie = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 24), M.crom); cheie.rotation.z = Math.PI / 2; cheie.position.set(-0.02, -0.15, -0.12); pan.add(cheie);
  tv([0.68, y0, 0.45], [0.68, -0.52, 0.45]);
  // fascicul ECU → motor
  { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.66, -0.15, 0.45), new THREE.Vector3(0.45, 0.1, 0.4), new THREE.Vector3(0.2, 0.4, 0.38), new THREE.Vector3(0.0, 0.42, 0.3)]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.008, 10), M.cauciuc); m.castShadow = true; scene.add(m); }

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
  // etichete
  const elEt = cont.querySelector(".m3d-etichete");
  const ET = optiuni.etichete || {};
  const et = Object.keys(mot.ancore).filter(k => ET[k]).map(k => { const d = document.createElement("div"); d.className = "m3d-eticheta"; d.textContent = ET[k]; d.dataset.c = k; d.addEventListener("click", () => optiuni.onSelect && optiuni.onSelect(k)); elEt.appendChild(d); return { k, el: d }; });
  // vederi prestabilite
  const VEDERI = { gen: [[1.25, 1.0, 1.45], [-0.05, 0.15, 0]], adm: [[0.15, 0.85, 1.05], [-0.05, 0.3, 0.22]], ev: [[0.95, 0.45, -0.55], [0.0, 0.1, -0.28]], vol: [[-0.75, 0.55, 0.55], [-0.27, 0.15, 0.0]], dist: [[0.95, 0.35, 0.35], [0.28, 0.1, 0.05]], sus: [[0.0, 1.6, 0.01], [0, 0.2, 0]] };
  const NUME_V = { gen: "general", adm: "admisie", ev: "evacuare / λ", vol: "volant / CKP", dist: "distribuție", sus: "de sus" };
  const cv = cont.querySelector(".m3d-vederi");
  cv.innerHTML = Object.keys(VEDERI).map(k => `<button type="button" data-v="${k}">${NUME_V[k]}</button>`).join("");
  let zbor = null;
  const zboara = (p, t) => { zbor = { p0: camera.position.clone(), t0: ctl.target.clone(), p1: new THREE.Vector3(...p), t1: new THREE.Vector3(...t), k: 0 }; };
  cv.querySelectorAll("button").forEach(b => b.addEventListener("click", () => zboara(...VEDERI[b.dataset.v])));
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
    mot.actualizeaza(stare, dt);
    if (stare.vent) pal.rotation.z += dt * 25;
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
    stare,
    seteaza(s) { Object.assign(stare, s); },
    selecteaza(k, focus) { stare.selectat = k; if (focus && mot.ancore[k]) { const A = mot.ancore[k].clone(), dir = camera.position.clone().sub(ctl.target).normalize(); zboara([A.x + dir.x * 0.75, A.y + Math.max(0.25, dir.y * 0.75), A.z + dir.z * 0.75], [A.x, A.y, A.z]); } },
    sonda: arataSonda,
    distruge() { cancelAnimationFrame(raf); window.removeEventListener("schimbare-tema", temaFundal); renderer.dispose(); }
  };
}
