/* Machetele 3D ale modulelor (construite parametric din datele proiectului; unități: metri):
   • mecanismulMotor – arborele cotit, bielele, pistoanele, cămășile transparente, coloanele de gaz colorate după presiune, săgețile forțelor;
   • roataDintata, reductorEV – reductorul cu două trepte al acționării electrice (motor, arbore intermediar, diferențial, planetare);
   • planetar – mecanismul planetar simplu (soare, sateliți, coroană, port-sateliți);
   • linieArbori – lanțul P2 (motor termic, ambreiaj K0, mașina electrică, cutia) și varianta P0 cu starter-generatorul pe curea. */
import { THREE, V3, mat, MAT, sageata, turboColor, CAE, matCAE, matCarcasa, contur } from "./scena.js";
import { roata } from "./angrenaj.js";

const cil = (r, h, s = 32) => new THREE.CylinderGeometry(r, r, h, s);
const ax = (g) => { g.rotateZ(Math.PI / 2); return g; };   // cilindru cu axa pe X

/* ------------------------------------------------------------------ mecanismul motorului (i cilindri în linie) */
/** o = { D, S, L, i, man: [unghiurile manetoanelor, °], e (dezaxare) } */
export function mecanismulMotor(o) {
  const M = MAT(), G = new THREE.Group(), D = o.D, R = o.S / 2, L = o.L, i = o.i, pas = 1.22 * D, e = o.e || 0;
  const x0 = -((i - 1) * pas) / 2, xs = Array.from({ length: i }, (_, k) => x0 + k * pas);
  const rj = 0.3 * D, rp = 0.26 * D, lw = 0.16 * D;
  const mA = matCAE(CAE.arbore), mP = matCAE(CAE.piston), mB = matCAE(CAE.biela), mL = matCAE(CAE.lagar, { metalness: 0.4, roughness: 0.3 }), mC = matCarcasa();
  // arborele cotit: fusuri, brațe profilate cu contragreutăți, manetoane, volant, fulie
  const ac = new THREE.Group(); G.add(ac);
  const fus = (x0_, x1_) => { const m = contur(new THREE.Mesh(ax(cil(rj, x1_ - x0_)), mA)); m.position.x = (x0_ + x1_) / 2; m.castShadow = true; ac.add(m); };
  const brat = (() => { const rw = rp * 1.5, Rc = R * 1.08, sh = new THREE.Shape();
    sh.absarc(0, R, rw, 0, Math.PI, false); sh.lineTo(-rw * 1.05, 0); sh.absarc(0, 0, Rc, Math.PI, Math.PI * 2, false); sh.lineTo(rw, R);
    const g = new THREE.ExtrudeGeometry(sh, { depth: lw, bevelEnabled: true, bevelThickness: lw * 0.12, bevelSize: lw * 0.12, bevelSegments: 2, curveSegments: 20 }); g.translate(0, 0, -lw / 2); g.rotateY(-Math.PI / 2); return g; })();
  fus(xs[0] - pas * 0.75, xs[0] - pas * 0.32);
  xs.forEach((x, k) => {
    const th = (o.man[k] * Math.PI) / 180;
    const br = new THREE.Group(); br.rotation.x = -th; br.position.x = x; ac.add(br);
    [-1, 1].forEach((sg) => { const w = contur(new THREE.Mesh(brat, mA)); w.position.x = sg * (0.28 * D + lw / 2); w.castShadow = true; br.add(w); });
    const pin = contur(new THREE.Mesh(ax(cil(rp, 0.56 * D)), mA)); pin.position.set(0, R, 0); br.add(pin);
    if (k < i - 1) fus(x + 0.28 * D + lw, x + pas - 0.28 * D - lw);
  });
  fus(xs[i - 1] + 0.28 * D + lw, xs[i - 1] + pas * 0.9);
  const volant = contur(new THREE.Mesh(ax(new THREE.CylinderGeometry(1.3 * R + rj * 2, 1.3 * R + rj * 2, 0.22 * D, 64)), mA)); volant.position.x = xs[i - 1] + pas * 0.9 + 0.11 * D; volant.castShadow = true; ac.add(volant);
  const coroanaV = new THREE.Mesh(ax(new THREE.TorusGeometry(1.3 * R + rj * 2, 0.05 * D, 8, 64)).rotateY(Math.PI / 2), mA); coroanaV.position.x = volant.position.x; ac.add(coroanaV);
  const fulie = contur(new THREE.Mesh(ax(cil(0.62 * D, 0.2 * D, 48)), mA)); fulie.position.x = xs[0] - pas * 0.8; ac.add(fulie);
  // lagărele paliere (cuzineții) – galben
  const xl = [xs[0] - pas * 0.5]; for (let k = 0; k < i - 1; k++) xl.push(xs[k] + pas / 2); xl.push(xs[i - 1] + pas * 0.55);
  xl.forEach((x) => { const l = contur(new THREE.Mesh(ax(new THREE.CylinderGeometry(rj * 1.32, rj * 1.32, 0.17 * D, 40, 1, true)), mL)); l.position.x = x; G.add(l); });
  // biele (cyan), pistoane (portocaliu), coloanele de gaz
  const biele = [], pistoane = [], gaze = [], yHead = R + L + 0.62 * D, hp = 0.82 * D;
  const profilBiela = (() => { const sh = new THREE.Shape(), a = 0.09 * D, b = 0.06 * D; sh.moveTo(-a, 0); sh.lineTo(a, 0); sh.lineTo(b, 1); sh.lineTo(-b, 1); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.09 * D, bevelEnabled: false }); g.translate(0, 0, -0.045 * D); g.rotateY(Math.PI / 2); return g; })();
  xs.forEach((x) => {
    const b = new THREE.Group(); const corp = contur(new THREE.Mesh(profilBiela, mB)); b.add(corp);
    const capM = contur(new THREE.Mesh(ax(cil(rp * 1.55, 0.24 * D)), mB)); b.add(capM);
    const capP = contur(new THREE.Mesh(ax(cil(0.17 * D, 0.22 * D)), mB)); capP.position.y = 1; b.add(capP);
    corp.scale.y = L; capP.position.y = L; b.userData = { corp, capP }; b.position.x = x; G.add(b); biele.push(b); corp.castShadow = true;
    const p = new THREE.Group();
    const corpP = contur(new THREE.Mesh(cil(D / 2 * 0.985, hp * 0.5, 48), mP)); corpP.position.y = hp * 0.44; p.add(corpP); corpP.castShadow = true;
    const fusta = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 0.975, D / 2 * 0.975, hp * 0.5, 48, 1, true), mP); fusta.material = mP.clone(); fusta.material.side = THREE.DoubleSide; fusta.position.y = hp * -0.05; p.add(fusta);
    [0.58, 0.66, 0.74].forEach((f) => { const sg = new THREE.Mesh(new THREE.TorusGeometry(D / 2 * 0.99, 0.008 * D, 6, 48), M.otelI); sg.rotation.x = Math.PI / 2; sg.position.y = hp * f; p.add(sg); });
    const bolt = new THREE.Mesh(ax(cil(0.11 * D, D * 0.82)), M.crom); p.add(bolt);
    p.position.set(x, 0, e); G.add(p); pistoane.push(p);
    const gm = new THREE.MeshStandardMaterial({ color: 0x3366ff, transparent: true, opacity: 0.7, roughness: 0.4, depthWrite: false, emissive: 0x112244, emissiveIntensity: 0.5 });
    const gz = new THREE.Mesh(cil(D / 2 * 0.98, 1, 40), gm); gz.position.set(x, 0, e); gz.scale.y = 1e-3; gz.userData.faraCadru = true; G.add(gz); gaze.push(gz);
  });
  // blocul motor (cu alezajele), carterul și chiulasa – carcase gri: opace, transparente sau secționate
  const Lb = i * pas + 0.36 * D, Wb = 1.55 * D, yJos = R * 1.18 + 0.05 * D, yDeck = yHead;
  const shB = new THREE.Shape(); shB.moveTo(-Lb / 2, -Wb / 2); shB.lineTo(Lb / 2, -Wb / 2); shB.lineTo(Lb / 2, Wb / 2); shB.lineTo(-Lb / 2, Wb / 2); shB.closePath();
  xs.forEach((x) => { const h = new THREE.Path(); h.absarc(x, e, D / 2 * 1.005, 0, Math.PI * 2, true); shB.holes.push(h);
    const j = new THREE.Path(); void j; });
  const gB = new THREE.ExtrudeGeometry(shB, { depth: yDeck - yJos, bevelEnabled: false, curveSegments: 40 }); gB.rotateX(-Math.PI / 2); gB.translate(0, yJos, 0);
  const bloc = contur(new THREE.Mesh(gB, mC), 25, 0.45); G.add(bloc);
  // nervurile cămășii de apă (pe fețele laterale)
  for (let k = 0; k <= i; k++) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.06 * D, (yDeck - yJos) * 0.8, 0.08 * D), mC); n.position.set(-Lb / 2 + k * (Lb / i), (yDeck + yJos) / 2, Wb / 2 + 0.04 * D); G.add(n); const n2 = n.clone(); n2.position.z = -Wb / 2 - 0.04 * D; G.add(n2); }
  const shK = new THREE.Shape(), Wk = Wb * 1.25, yK = -R * 1.9; shK.moveTo(-Wk / 2, yK); shK.lineTo(Wk / 2, yK); shK.lineTo(Wk / 2, yJos); shK.lineTo(-Wk / 2, yJos); shK.closePath();
  const hK = new THREE.Path(); hK.moveTo(-Wk / 2 + 0.06 * D, yK + 0.06 * D); hK.lineTo(Wk / 2 - 0.06 * D, yK + 0.06 * D); hK.lineTo(Wk / 2 - 0.06 * D, yJos - 0.02 * D); hK.lineTo(-Wk / 2 + 0.06 * D, yJos - 0.02 * D); hK.closePath(); shK.holes.push(hK);
  const gK = new THREE.ExtrudeGeometry(shK, { depth: Lb, bevelEnabled: false }); gK.translate(0, 0, -Lb / 2); gK.rotateY(Math.PI / 2);
  const carter = contur(new THREE.Mesh(gK, mC), 25, 0.45); G.add(carter);
  [-1, 1].forEach((sg) => { const cp = new THREE.Mesh(new THREE.BoxGeometry(0.06 * D, yJos - yK, Wk), mC); cp.position.set(sg * (Lb / 2 + 0.03 * D), (yJos + yK) / 2, 0); G.add(contur(cp)); });
  const chiulasa = contur(new THREE.Mesh(new THREE.BoxGeometry(Lb, 0.55 * D, Wb * 1.05), mC), 25, 0.45); chiulasa.position.set(0, yHead + 0.275 * D, e); G.add(chiulasa);
  const capac = contur(new THREE.Mesh(new THREE.BoxGeometry(Lb * 0.96, 0.35 * D, Wb * 0.8), mC), 25, 0.45); capac.position.set(0, yHead + 0.72 * D, e); G.add(capac);
  xs.forEach((x) => { [-1, 1].forEach((sg) => { const port = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * D, 0.16 * D, 0.5 * D, 24).rotateX(Math.PI / 2), mC); port.position.set(x, yHead + 0.25 * D, e + sg * Wb * 0.62); G.add(port); }); });
  // săgețile forțelor pe cilindrul 1
  const s = { Fg: sageata(0xd61f1f, 0.045 * D), N: sageata(0x15803d, 0.045 * D), S: sageata(0x7c3aed, 0.045 * D), T: sageata(0x1d4ed8, 0.045 * D), Z: sageata(0x111827, 0.045 * D) };
  Object.values(s).forEach((a) => G.add(a));
  /** pozează mecanismul: alfa [°] (cilindrul 1), stari[k] = { yB, th, p } pentru fiecare cilindru; f = forțele cilindrului 1 [N] și scara [m/N] */
  function pozeaza(alfa, stari, f, sc, pMin, pMax) {
    ac.rotation.x = (alfa * Math.PI) / 180;
    xs.forEach((x, k) => {
      const st = stari[k], a = ((alfa - o.man[k]) * Math.PI) / 180, A = V3(x, R * Math.cos(a), R * Math.sin(a)), yB = st.yB;
      const p = pistoane[k]; p.position.set(x, yB, e);
      const b = biele[k], dir = V3(0, yB - A.y, e - A.z), len = dir.length();
      b.position.copy(A); b.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
      b.userData.corp.scale.y = len; b.userData.corp.position.y = 0; b.userData.capP.position.y = len;
      const top = yB + hp * 0.69, hg = Math.max(0.0005, yHead - top), gz = gaze[k];
      gz.scale.y = hg; gz.position.y = top + hg / 2;
      turboColor(Math.max(0, Math.min(1, (st.p - pMin) / (pMax - pMin))), gz.material.color);
    });
    if (f) {
      const x = xs[0], a = (alfa * Math.PI) / 180, A = V3(x, R * Math.cos(a), R * Math.sin(a)), yB = stari[0].yB;
      s.Fg.seteaza(V3(x, yB + hp * 0.69 + Math.abs(f.Fg) * sc, e), V3(0, -1, 0), Math.abs(f.Fg) * sc * Math.sign(f.Fg));
      s.N.seteaza(V3(x, yB + hp * 0.2, e + Math.sign(-f.N || 1) * D * 0.52), V3(0, 0, 1), f.N * sc);
      const u = V3(0, yB - A.y, e - A.z).normalize(); s.S.seteaza(V3(x + D * 0.32, (A.y + yB) / 2, (A.z + e) / 2), u, -f.S * sc);
      const t = V3(0, -Math.sin(a), Math.cos(a)), r = V3(0, -Math.cos(a), -Math.sin(a));
      s.T.seteaza(A.clone().add(V3(-D * 0.3, 0, 0)), t, f.T * sc); s.Z.seteaza(A.clone().add(V3(-D * 0.3, 0, 0)), r, f.Z * sc);
    }
  }
  return { G, pozeaza, sageti: s, xs, yHead, pas, ancore: { maneton: (alfa) => { const a = (alfa * Math.PI) / 180; return V3(xs[0], R * Math.cos(a), R * Math.sin(a)); } } };
}

/* ------------------------------------------------------------------ roți dințate */
/** roată dințată cu dinți trapezoidali (profil aproximativ), axa pe X; m = modulul [m], b = lățimea [m] */
export function roataDintata(z, m, b, material, inel = false, beta = 0) {
  const g = roata(z, m, { b, interior: inel, Rext: (m * z) / 2 + 4.5 * m, beta, spite: z > 40 && !inel ? 6 : 0 });
  const ms = new THREE.Mesh(g, material); ms.castShadow = true; return ms;
}

/** rulment (inel exterior, inel interior, bile) – galben, axa pe X */
export function rulment(ri, re, w, mat_ = null) {
  const m = mat_ || matCAE(CAE.lagar, { metalness: 0.45, roughness: 0.3 }), G = new THREE.Group(), t = (re - ri) * 0.28;
  const inel = (r1, r2) => { const pts = [[r1, -w / 2], [r2, -w / 2], [r2, w / 2], [r1, w / 2], [r1, -w / 2]].map(([x, y]) => new THREE.Vector2(x, y)); const g = new THREE.LatheGeometry(pts, 40); g.rotateZ(Math.PI / 2); return contur(new THREE.Mesh(g, m), 40, 0.25); };
  G.add(inel(re - t, re), inel(ri, ri + t));
  const nb = Math.max(8, Math.round(Math.PI * (ri + re) / ((re - ri) * 0.7))), rb = (re - ri) * 0.28, rm = (ri + re) / 2;
  const bile = new THREE.InstancedMesh(new THREE.SphereGeometry(rb, 10, 8), matCAE(0xe0e4e8, { metalness: 0.8, roughness: 0.2 }), nb), m4 = new THREE.Matrix4();
  for (let k = 0; k < nb; k++) { const a = k / nb * Math.PI * 2; m4.makeTranslation(0, rm * Math.cos(a), rm * Math.sin(a)); bile.setMatrixAt(k, m4); } G.add(bile);
  return G;
}
/** carcasă extrudată pe X, în jurul unor axe [(y, z, raza)] – înfășurătoarea convexă a cercurilor */
export function carcasaInfasurata(cerc, x0, x1, material) {
  const P = []; cerc.forEach(([y, z, r]) => { for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; P.push([z + r * Math.cos(a), y + r * Math.sin(a)]); } });
  P.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  P.forEach((p) => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  P.slice().reverse().forEach((p) => { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); });
  const H = lo.slice(0, -1).concat(hi.slice(0, -1)), sh = new THREE.Shape(); H.forEach(([u, v], j) => (j ? sh.lineTo(u, v) : sh.moveTo(u, v))); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }); g.rotateY(Math.PI / 2); g.translate(x0, 0, 0);
  // după rotateY(π/2): (u, v, w) → (w, v, −u); se corectează semnul lui z
  g.scale(1, 1, -1); g.computeVertexNormals();
  return contur(new THREE.Mesh(g, material), 30, 0.5);
}

/** reductorul acționării electrice: z = [z1, z2, z3, z4], module mn = [m12, m34] */
export function reductorEV(z, mn) {
  const G = new THREE.Group(), b1 = 0.022, b2 = 0.03, mR = matCAE(CAE.roata, { metalness: 0.3 }), mD = matCAE(CAE.dif), mA = matCAE(0x9aa3ad, { metalness: 0.6, roughness: 0.3 }), mC = matCarcasa();
  const r = (k, m) => (m * z[k]) / 2, a12 = r(0, mn[0]) + r(1, mn[0]), a34 = r(2, mn[1]) + r(3, mn[1]);
  const x1 = 0.06, x2 = 0.12;
  const ax1 = new THREE.Group(), ax2 = new THREE.Group(), ax3 = new THREE.Group(); G.add(ax1, ax2, ax3);
  ax2.position.set(0, -a12, 0); ax3.position.set(0, -a12, -a34);
  // motorul electric: rotor roșu, capetele bobinajului cyan, carcasa statorului cu nervuri
  const rotor = contur(new THREE.Mesh(ax(cil(0.068, 0.15, 48)), matCAE(CAE.rotor))); rotor.position.x = -0.12; ax1.add(rotor);
  const pachet = contur(new THREE.Mesh(ax(new THREE.CylinderGeometry(0.105, 0.105, 0.14, 48, 1, true)), matCarcasa(CAE.stator))); pachet.position.x = -0.12; G.add(pachet);
  [-1, 1].forEach((sg) => { const cb = new THREE.Mesh(ax(new THREE.TorusGeometry(0.088, 0.016, 10, 48)).rotateY(Math.PI / 2), matCAE(CAE.bobinaj)); cb.position.x = -0.12 + sg * 0.078; G.add(cb); });
  const arb1 = contur(new THREE.Mesh(ax(cil(0.012, 0.36)), mA)); arb1.position.x = -0.05; ax1.add(arb1);
  const carcM = contur(new THREE.Mesh(ax(cil(0.128, 0.22, 64)), mC), 30, 0.5); carcM.position.x = -0.12; G.add(carcM);
  for (let k = 0; k < 5; k++) { const n = new THREE.Mesh(ax(new THREE.TorusGeometry(0.13, 0.006, 6, 48)).rotateY(Math.PI / 2), mC); n.position.x = -0.2 + k * 0.04; G.add(n); }
  const capac = contur(new THREE.Mesh(ax(cil(0.1, 0.02, 48)), mC)); capac.position.x = -0.24; G.add(capac);
  // angrenajele (roșu), diferențialul (cyan), planetarele
  const g1 = contur(roataDintata(z[0], mn[0], b1, mR, false, 0.35), 40, 0.2); g1.position.x = x1; ax1.add(g1);
  const g2 = contur(roataDintata(z[1], mn[0], b1, mR, false, -0.35), 40, 0.2); g2.position.x = x1; ax2.add(g2);
  const arb2 = contur(new THREE.Mesh(ax(cil(0.015, 0.16)), mA)); arb2.position.x = 0.09; ax2.add(arb2);
  const g3 = contur(roataDintata(z[2], mn[1], b2, mR, false, -0.3), 40, 0.2); g3.position.x = x2; ax2.add(g3);
  const g4 = contur(roataDintata(z[3], mn[1], b2, mR, false, 0.3), 40, 0.2); g4.position.x = x2; ax3.add(g4);
  const dif = contur(new THREE.Mesh(new THREE.SphereGeometry(0.048, 32, 20), mD)); dif.scale.set(0.8, 1, 1); dif.position.x = x2 - 0.045; ax3.add(dif);
  const planL = contur(new THREE.Mesh(ax(cil(0.013, 0.4)), mD)); planL.position.x = x2 - 0.25; ax3.add(planL);
  const planR = contur(new THREE.Mesh(ax(cil(0.013, 0.2)), mD)); planR.position.x = x2 + 0.11; ax3.add(planR);
  // rulmenții (galben) – ficși (inelele nu se rotesc în reprezentare)
  [[0, 0, -0.205], [0, 0, -0.035], [0, 0, 0.085]].forEach(([y, zz, x]) => { const b = rulment(0.013, 0.03, 0.016); b.position.set(x, y, zz); G.add(b); });
  [0.035, 0.15].forEach((x) => { const b = rulment(0.016, 0.034, 0.018); b.position.set(x, -a12, 0); G.add(b); });
  [0.065, 0.165].forEach((x) => { const b = rulment(0.03, 0.05, 0.02); b.position.set(x, -a12, -a34); G.add(b); });
  // carcasa reductorului: înfășurătoarea celor trei axe
  const carc = carcasaInfasurata([[0, 0, r(0, mn[0]) + 0.03], [-a12, 0, r(1, mn[0]) + 0.02], [-a12, -a34, r(3, mn[1]) + 0.022]], 0.02, 0.19, mC); G.add(carc);
  const s = { Ft1: sageata(0x111827, 0.004), Ft2: sageata(0x6d28d9, 0.004) }; G.add(s.Ft1, s.Ft2);
  const contact1 = V3(x1, -r(0, mn[0]), 0), contact2 = V3(x2, -a12, -r(2, mn[1]));
  return { G, ax1, ax2, ax3, s, contact1, contact2, a12, a34,
    pozeaza(fi1, i12, i34, F1, F2, sc) { ax1.rotation.x = fi1; ax2.rotation.x = -fi1 / i12; ax3.rotation.x = fi1 / (i12 * i34);
      s.Ft1.seteaza(contact1.clone().add(V3(0.03, 0, -F1 * sc)), V3(0, 0, 1), F1 * sc); s.Ft2.seteaza(contact2.clone().add(V3(0.035, -F2 * sc, 0)), V3(0, 1, 0), F2 * sc); } };
}

/** planetarul simplu: Ns, Nr, Np; modulul m; întoarce { G, pozeaza(fs, fc, fr) } (unghiurile soarelui, port-sateliților, coroanei) */
export function planetar(Ns, Nr, Np, m = 0.0025, b = 0.025) {
  const G = new THREE.Group(), rs = (m * Ns) / 2, rpl = (m * Np) / 2, a = rs + rpl, mC = matCarcasa();
  const soare = contur(roataDintata(Ns, m, b, matCAE(CAE.soare)), 40, 0.25); G.add(soare);
  const coroana = contur(roataDintata(Nr, m, b, matCAE(CAE.coroana), true), 40, 0.25); G.add(coroana);
  const port = new THREE.Group(); G.add(port);
  const mP = matCAE(CAE.port);
  const placa = contur(new THREE.Mesh(ax(cil(a + rpl * 0.55, 0.007, 64)), mP)); placa.position.x = -b * 0.8; port.add(placa);
  const arbC = contur(new THREE.Mesh(ax(cil(0.013, 0.14)), mP)); arbC.position.x = -0.08; port.add(arbC);
  const arbS = contur(new THREE.Mesh(ax(cil(0.008, 0.2)), matCAE(CAE.soare))); arbS.position.x = 0.08; soare.add(arbS);
  const sat = [];
  for (let k = 0; k < 3; k++) { const g = new THREE.Group(), ang = (k / 3) * Math.PI * 2; g.position.set(0, a * Math.cos(ang), a * Math.sin(ang)); port.add(g);
    const p = contur(roataDintata(Np, m, b * 0.96, matCAE(CAE.satelit)), 40, 0.25); g.add(p); const bolt = new THREE.Mesh(ax(cil(0.005, b * 1.9)), mP); g.add(bolt); sat.push(p);
    const rb = rulment(0.0055, 0.011, b * 0.5); g.add(rb); }
  const R0 = m * Nr / 2 + 6 * m, carc = contur(new THREE.Mesh(ax(new THREE.CylinderGeometry(R0, R0, b * 3.4, 96, 1, true)), mC), 30, 0.5); G.add(carc);
  [-1, 1].forEach((sg) => { const f = contur(new THREE.Mesh(ax(new THREE.RingGeometry(0.02, R0, 96).rotateY(Math.PI / 2)), mC)); f.position.x = sg * b * 1.7; G.add(f); const rb = rulment(0.013, 0.026, 0.012); rb.position.x = sg * b * 1.9; G.add(rb); });
  return { G, a, rs, rpl, soare, coroana, port,
    pozeaza(fs, fc, fr) { soare.rotation.x = fs; coroana.rotation.x = fr; port.rotation.x = fc;
      // rotația proprie a sateliților (relativ la port): ω_p,rel = −(ω_s − ω_c)·Ns/Np
      sat.forEach((p) => { p.rotation.x = -((fs - fc) * Ns) / Np + Math.PI / Np; }); } };
}

/** linia de arbori a hibridului paralel: motor termic – K0 – EM – cutie; varianta P0: starter-generatorul pe curea */
export function linieArbori(o = {}) {
  const G = new THREE.Group(), mC = matCarcasa(), mA = matCAE(CAE.arbore), mR = matCAE(CAE.rotor), mK = matCAE(CAE.piston), mL = matCAE(CAE.lagar);
  // motorul termic: bloc, chiulasă, capac, baie (carcase), arborele cotit verde vizibil la secționare
  const bloc = contur(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.26), mC), 30, 0.5); bloc.position.set(-0.45, 0.07, 0); G.add(bloc);
  const ch = contur(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.27), mC), 30, 0.5); ch.position.set(-0.45, 0.265, 0); G.add(ch);
  const baie = contur(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.22), mC), 30, 0.5); baie.position.set(-0.45, -0.13, 0); G.add(baie);
  const arbI = new THREE.Group(); G.add(arbI);
  const ac = contur(new THREE.Mesh(ax(cil(0.02, 0.5)), mA)); ac.position.x = -0.45; arbI.add(ac);
  for (let k = 0; k < 4; k++) { const w = contur(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.05), mA)); w.position.set(-0.6 + k * 0.1, 0.03 * (k % 3 ? -1 : 1), 0); arbI.add(w); }
  for (let k = 0; k < 4; k++) { const p = contur(new THREE.Mesh(cil(0.038, 0.06, 32), matCAE(CAE.piston))); p.position.set(-0.6 + k * 0.1, 0.17, 0); G.add(p); }
  const vol = contur(new THREE.Mesh(ax(cil(0.14, 0.03, 64)), mA)); vol.position.x = -0.22; arbI.add(vol);
  const sp = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.2), matCAE(0xffffff)); sp.position.set(-0.22, 0.1, 0); arbI.add(sp);
  const fulie = contur(new THREE.Mesh(ax(cil(0.07, 0.03, 48)), mA)); fulie.position.x = -0.68; arbI.add(fulie);
  const arbEM = new THREE.Group(); G.add(arbEM);
  const discK0a = contur(new THREE.Mesh(ax(cil(0.11, 0.012, 48)), mK)); discK0a.position.x = -0.17; arbI.add(discK0a);
  const discK0b = contur(new THREE.Mesh(ax(cil(0.11, 0.012, 48)), mK)); arbEM.add(discK0b);
  const em = contur(new THREE.Mesh(ax(cil(0.155, 0.14, 64)), mC), 30, 0.5); G.add(em);
  const rot = contur(new THREE.Mesh(ax(cil(0.1, 0.11, 48)), mR)); arbEM.add(rot);
  [-1, 1].forEach((sg) => { const cb = new THREE.Mesh(ax(new THREE.TorusGeometry(0.12, 0.013, 10, 48)).rotateY(Math.PI / 2), matCAE(CAE.bobinaj)); cb.position.x = sg * 0.062; G.add(cb); });
  const sp2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.18), matCAE(0xffffff)); sp2.position.set(0.09, 0.08, 0); arbEM.add(sp2);
  const arb = contur(new THREE.Mesh(ax(cil(0.016, 0.42)), matCAE(CAE.dif))); arb.position.x = 0.1; arbEM.add(arb);
  [-0.09, 0.1].forEach((x) => { const b = rulment(0.016, 0.034, 0.016, mL); b.position.x = x; G.add(b); });
  const cutie = contur(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.24), mC), 30, 0.5); cutie.position.set(0.32, -0.02, 0); G.add(cutie);
  [0.24, 0.32, 0.4].forEach((x, j) => { const g = contur(roataDintata(30 - j * 6, 0.003, 0.02, matCAE(CAE.roata)), 40, 0.2); g.position.x = x; arbEM.add(g); });
  // starter-generatorul P0 pe curea
  const bsg = new THREE.Group(); bsg.position.set(-0.68, -0.05, 0.22); G.add(bsg);
  const bsgC = contur(new THREE.Mesh(ax(cil(0.065, 0.13, 40)), mC), 30, 0.5); bsgC.position.x = 0.07; bsg.add(bsgC);
  const bsgF = new THREE.Group(); bsg.add(bsgF); const fb = contur(new THREE.Mesh(ax(cil(0.028, 0.03, 32)), mA)); bsgF.add(fb);
  const rbs = contur(new THREE.Mesh(ax(cil(0.045, 0.09, 32)), mR)); rbs.position.x = 0.07; bsgF.add(rbs);
  const sp3 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.05), matCAE(0xffffff)); bsgF.add(sp3);
  const curea = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 8, 64), matCAE(0x1d2024)); curea.scale.set(1, 0.62, 1); curea.rotation.y = Math.PI / 2; curea.position.set(-0.68, -0.025, 0.11); curea.rotation.x = -0.2; G.add(curea);
  bsg.visible = curea.visible = !!o.p0; fulie.visible = !!o.p0;
  const s = { ice: sageata(0xe53935, 0.008), em: sageata(0x1e88e5, 0.008), tot: sageata(0x43a047, 0.008) }; G.add(s.ice, s.em, s.tot);
  return { G, arbI, arbEM, bsg, bsgF, discK0b, s, p0(b) { bsg.visible = curea.visible = fulie.visible = b; },
    pozeaza(fI, fE, k0, fB, Ti, Te, sc) { arbI.rotation.x = fI; arbEM.rotation.x = fE; discK0b.position.x = -0.15 + (k0 ? 0 : 0.03); bsgF.rotation.x = fB;
      s.ice.seteaza(V3(-0.3, 0.36, 0), V3(1, 0, 0), Ti * sc); s.em.seteaza(V3(-0.05, 0.36, 0), V3(1, 0, 0), Te * sc); s.tot.seteaza(V3(0.18, 0.36, 0), V3(1, 0, 0), (Ti + Te) * sc); } };
}
