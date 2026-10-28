/* Machetele 3D ale modulelor (construite parametric din datele proiectului; unități: metri):
   • mecanismulMotor – arborele cotit, bielele, pistoanele, cămășile transparente, coloanele de gaz colorate după presiune, săgețile forțelor;
   • roataDintata, reductorEV – reductorul cu două trepte al acționării electrice (motor, arbore intermediar, diferențial, planetare);
   • planetar – mecanismul planetar simplu (soare, sateliți, coroană, port-sateliți);
   • linieArbori – lanțul P2 (motor termic, ambreiaj K0, mașina electrică, cutia) și varianta P0 cu starter-generatorul pe curea. */
import { THREE, V3, mat, MAT, sageata, turboColor } from "./scena.js";

const cil = (r, h, s = 32) => new THREE.CylinderGeometry(r, r, h, s);
const ax = (g) => { g.rotateZ(Math.PI / 2); return g; };   // cilindru cu axa pe X

/* ------------------------------------------------------------------ mecanismul motorului (i cilindri în linie) */
/** o = { D, S, L, i, man: [unghiurile manetoanelor, °], e (dezaxare) } */
export function mecanismulMotor(o) {
  const M = MAT(), G = new THREE.Group(), D = o.D, R = o.S / 2, L = o.L, i = o.i, pas = 1.22 * D, e = o.e || 0;
  const x0 = -((i - 1) * pas) / 2, xs = Array.from({ length: i }, (_, k) => x0 + k * pas);
  const rj = 0.3 * D, rp = 0.26 * D, lw = 0.16 * D;
  // arborele cotit
  const ac = new THREE.Group(); G.add(ac);
  const fus = (x0_, x1_) => { const m = new THREE.Mesh(ax(cil(rj, x1_ - x0_)), M.otel); m.position.x = (x0_ + x1_) / 2; m.castShadow = true; ac.add(m); };
  fus(xs[0] - pas * 0.75, xs[0] - pas * 0.32);
  xs.forEach((x, k) => {
    const th = (o.man[k] * Math.PI) / 180, py = R * Math.cos(th), pz = R * Math.sin(th);
    const brat = new THREE.Group(); brat.rotation.x = -th; brat.position.x = x; ac.add(brat);
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(lw, R + rj * 1.9, rj * 2.3), M.otel); w.position.set(s * (0.28 * D + lw / 2), R / 2 - rj * 0.15, 0); w.castShadow = true; brat.add(w);
      const cg = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.05, lw, 32, 1, false, Math.PI * 0.62, Math.PI * 0.76), M.otelI); cg.rotation.z = Math.PI / 2; cg.position.set(s * (0.28 * D + lw / 2), 0, 0); brat.add(cg);
    });
    const pin = new THREE.Mesh(ax(cil(rp, 0.56 * D)), M.crom); pin.position.set(0, R, 0); brat.add(pin);
    if (k < i - 1) fus(x + 0.28 * D + lw, x + pas - 0.28 * D - lw);
    void py; void pz;
  });
  fus(xs[i - 1] + 0.28 * D + lw, xs[i - 1] + pas * 0.9);
  const volant = new THREE.Mesh(ax(cil(1.6 * R + rj * 2, 0.22 * D, 48)), M.fonta); volant.position.x = xs[i - 1] + pas * 0.9 + 0.11 * D; volant.castShadow = true; ac.add(volant);
  const roataDint = new THREE.Mesh(ax(cil(0.6 * D, 0.12 * D, 40)), M.otelI); roataDint.position.x = xs[0] - pas * 0.75; ac.add(roataDint);
  // biele, pistoane, cămăși, gaz
  const biele = [], pistoane = [], gaze = [], yHead = R + L + 0.62 * D;
  xs.forEach((x) => {
    const b = new THREE.Group(); const corp = new THREE.Mesh(new THREE.BoxGeometry(0.16 * D, 1, 0.1 * D), M.alu); corp.position.y = 0.5; b.add(corp);
    const capM = new THREE.Mesh(ax(cil(rp * 1.45, 0.24 * D)), M.alu); b.add(capM);
    const capP = new THREE.Mesh(ax(cil(0.17 * D, 0.24 * D)), M.alu); capP.position.y = 1; b.add(capP);
    corp.scale.y = L; corp.position.y = L / 2; capP.position.y = L; b.userData = { corp, capP }; b.position.x = x; G.add(b); biele.push(b); corp.castShadow = true;
    const p = new THREE.Group(); const hp = 0.82 * D;
    const corpP = new THREE.Mesh(cil(D / 2 * 0.985, hp, 40), M.alu); corpP.position.y = hp * 0.28; p.add(corpP); corpP.castShadow = true;
    [0.55, 0.66, 0.77].forEach((f) => { const s = new THREE.Mesh(new THREE.TorusGeometry(D / 2 * 0.985, 0.006 * D, 6, 40), M.otelI); s.rotation.x = Math.PI / 2; s.position.y = hp * (f - 0.22); p.add(s); });
    const bolt = new THREE.Mesh(ax(cil(0.12 * D, D * 0.8)), M.crom); p.add(bolt);
    p.position.x = x; G.add(p); pistoane.push(p);
    const lin = new THREE.Mesh(cil(D / 2 * 1.06, yHead - (L - R) + 0.1 * D, 40), M.sticla); lin.position.set(x, (yHead + L - R) / 2, e); G.add(lin);
    const gm = new THREE.MeshStandardMaterial({ color: 0x3366ff, transparent: true, opacity: 0.55, roughness: 0.4, depthWrite: false, emissive: 0x112244, emissiveIntensity: 0.4 });
    const gz = new THREE.Mesh(cil(D / 2 * 0.98, 1, 36), gm); gz.position.set(x, 0, e); gz.scale.y = 1e-3; gz.userData.faraCadru = true; G.add(gz); gaze.push(gz);
  });
  const chiulasa = new THREE.Mesh(new THREE.BoxGeometry(i * pas + 0.3 * D, 0.5 * D, 1.3 * D), M.fonta); chiulasa.position.set(0, yHead + 0.25 * D, e); chiulasa.material = chiulasa.material.clone(); chiulasa.material.transparent = true; chiulasa.material.opacity = 0.35; G.add(chiulasa);
  // săgețile forțelor pe cilindrul 1
  const s = { Fg: sageata(0xe53935, 0.025 * D), N: sageata(0x43a047, 0.025 * D), S: sageata(0xff9800, 0.025 * D), T: sageata(0x1e88e5, 0.025 * D), Z: sageata(0x8e24aa, 0.025 * D) };
  Object.values(s).forEach((a) => G.add(a));
  const hp = 0.82 * D;
  /** pozează mecanismul: alfa [°] (cilindrul 1), stari[k] = { yB, th, p } pentru fiecare cilindru; f = forțele cilindrului 1 [N] și scara [m/N] */
  function pozeaza(alfa, stari, f, sc, pMin, pMax) {
    ac.rotation.x = (alfa * Math.PI) / 180;
    xs.forEach((x, k) => {
      const st = stari[k], a = ((alfa - o.man[k]) * Math.PI) / 180, A = V3(x, R * Math.cos(a), R * Math.sin(a)), yB = st.yB;
      const p = pistoane[k]; p.position.set(x, yB, e);
      const b = biele[k], dir = V3(0, yB - A.y, e - A.z), len = dir.length();
      b.position.copy(A); b.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
      b.userData.corp.scale.y = len; b.userData.corp.position.y = len / 2; b.userData.capP.position.y = len;
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
export function roataDintata(z, m, b, material, inel = false) {
  const rp = (m * z) / 2, ra = rp + m, rf = rp - 1.25 * m, sh = new THREE.Shape();
  const N = z, dA = (2 * Math.PI) / N;
  for (let k = 0; k < N; k++) {
    const a0 = k * dA, pts = [[rf, a0 - dA * 0.27], [ra, a0 - dA * 0.13], [ra, a0 + dA * 0.13], [rf, a0 + dA * 0.27], [rf, a0 + dA * 0.5]];
    pts.forEach(([r, a], j) => { const x = r * Math.cos(a), y = r * Math.sin(a); if (k === 0 && j === 0) sh.moveTo(x, y); else sh.lineTo(x, y); });
  }
  if (inel) { // coroană cu dantură interioară: conturul exterior + găura cu dinți
    const out = new THREE.Shape(); out.absarc(0, 0, ra + 3.5 * m, 0, Math.PI * 2, false);
    const h = new THREE.Path(); const ri = rp - m, rr = rp + 1.25 * m;
    for (let k = 0; k < N; k++) { const a0 = k * dA, pts = [[rr, a0 - dA * 0.27], [ri, a0 - dA * 0.13], [ri, a0 + dA * 0.13], [rr, a0 + dA * 0.27], [rr, a0 + dA * 0.5]];
      pts.forEach(([r, a], j) => { const x = r * Math.cos(a), y = r * Math.sin(a); if (k === 0 && j === 0) h.moveTo(x, y); else h.lineTo(x, y); }); }
    out.holes.push(h);
    const g = new THREE.ExtrudeGeometry(out, { depth: b, bevelEnabled: false, curveSegments: 48 }); g.translate(0, 0, -b / 2); g.rotateY(Math.PI / 2);
    const ms = new THREE.Mesh(g, material); ms.castShadow = true; return ms;
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, Math.max(rf * 0.28, 0.004), 0, Math.PI * 2, true); sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: b, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -b / 2); g.rotateY(Math.PI / 2);
  const ms = new THREE.Mesh(g, material); ms.castShadow = true; return ms;
}

/** reductorul acționării electrice: z = [z1, z2, z3, z4], module mn = [m12, m34] */
export function reductorEV(z, mn) {
  const M = MAT(), G = new THREE.Group(), b1 = 0.022, b2 = 0.03;
  const r = (k, m) => (m * z[k]) / 2, a12 = r(0, mn[0]) + r(1, mn[0]), a34 = r(2, mn[1]) + r(3, mn[1]);
  const xA = 0, yA = 0, x1 = 0.06, x2 = 0.12;
  const ax1 = new THREE.Group(), ax2 = new THREE.Group(), ax3 = new THREE.Group(); G.add(ax1, ax2, ax3);
  ax2.position.set(0, -a12, 0); ax3.position.set(0, -a12, -a34);
  // motorul electric pe arborele 1
  const stator = new THREE.Mesh(ax(cil(0.11, 0.17, 48)), M.vopsea); stator.position.set(-0.12, yA, 0); stator.castShadow = true; G.add(stator);
  for (let k = 0; k < 16; k++) { const ar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.006, 0.02), M.alu); const a = (k / 16) * Math.PI * 2; ar.position.set(-0.12, Math.cos(a) * 0.113, Math.sin(a) * 0.113); ar.rotation.x = -a; G.add(ar); }
  const rotor = new THREE.Mesh(ax(cil(0.068, 0.15, 32)), M.cupru); rotor.position.x = -0.12; ax1.add(rotor);
  const arb1 = new THREE.Mesh(ax(cil(0.012, 0.3)), M.otel); arb1.position.x = -0.04; ax1.add(arb1);
  const g1 = roataDintata(z[0], mn[0], b1, M.otel); g1.position.x = x1; ax1.add(g1);
  const g2 = roataDintata(z[1], mn[0], b1, M.otelI); g2.position.x = x1; ax2.add(g2);
  const arb2 = new THREE.Mesh(ax(cil(0.014, 0.12)), M.otel); arb2.position.x = 0.09; ax2.add(arb2);
  const g3 = roataDintata(z[2], mn[1], b2, M.otel); g3.position.x = x2; ax2.add(g3);
  const g4 = roataDintata(z[3], mn[1], b2, M.otelI); g4.position.x = x2; ax3.add(g4);
  const dif = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), M.fonta); dif.position.x = x2 - 0.03; ax3.add(dif);
  const planL = new THREE.Mesh(ax(cil(0.012, 0.35)), M.otel); planL.position.x = x2 - 0.2; ax3.add(planL);
  const planR = new THREE.Mesh(ax(cil(0.012, 0.18)), M.otel); planR.position.x = x2 + 0.1; ax3.add(planR);
  const carc = new THREE.Mesh(new THREE.BoxGeometry(0.16, a12 + a34 * 0.0 + Math.max(r(1, mn[0]), r(3, mn[1])) * 2.2, a34 + r(3, mn[1]) * 2.3), M.sticla); carc.position.set(0.09, -a12 / 2, -a34 / 2); G.add(carc);
  const s = { Ft1: sageata(0xe53935, 0.003), Ft2: sageata(0xff9800, 0.003) }; G.add(s.Ft1, s.Ft2);
  const contact1 = V3(x1, -r(0, mn[0]), 0), contact2 = V3(x2, -a12, -r(2, mn[1]));
  return { G, ax1, ax2, ax3, s, contact1, contact2, a12, a34,
    pozeaza(fi1, i12, i34, F1, F2, sc) { ax1.rotation.x = fi1; ax2.rotation.x = -fi1 / i12; ax3.rotation.x = fi1 / (i12 * i34);
      s.Ft1.seteaza(contact1.clone().add(V3(0, 0, -F1 * sc)), V3(0, 0, 1), F1 * sc); s.Ft2.seteaza(contact2.clone().add(V3(0, -F2 * sc, 0)), V3(0, 1, 0), F2 * sc); } };
}

/** planetarul simplu: Ns, Nr, Np; modulul m; întoarce { G, pozeaza(fs, fc, fr) } (unghiurile soarelui, port-sateliților, coroanei) */
export function planetar(Ns, Nr, Np, m = 0.0025, b = 0.025) {
  const M = MAT(), G = new THREE.Group(), rs = (m * Ns) / 2, rpl = (m * Np) / 2, a = rs + rpl;
  const soare = roataDintata(Ns, m, b, M.galben); G.add(soare);
  const coroana = roataDintata(Nr, m, b, M.otelI, true); G.add(coroana);
  const port = new THREE.Group(); G.add(port);
  const placa = new THREE.Mesh(ax(cil(a + rpl * 0.5, 0.006, 48)), M.vopsea); placa.position.x = -b * 0.8; port.add(placa);
  const arbC = new THREE.Mesh(ax(cil(0.012, 0.12)), M.otel); arbC.position.x = -0.07; port.add(arbC);
  const arbS = new THREE.Mesh(ax(cil(0.008, 0.16)), M.galben); arbS.position.x = 0.07; soare.add(arbS);
  const sat = [];
  for (let k = 0; k < 3; k++) { const g = new THREE.Group(), ang = (k / 3) * Math.PI * 2; g.position.set(0, a * Math.cos(ang), a * Math.sin(ang)); port.add(g);
    const p = roataDintata(Np, m, b * 0.96, M.otel); g.add(p); const bolt = new THREE.Mesh(ax(cil(0.005, b * 1.9)), M.crom); bolt.position.x = -b * 0.4; g.add(bolt); sat.push(p); }
  const tambur = new THREE.Mesh(ax(new THREE.CylinderGeometry(m * Nr / 2 + 3.5 * m, m * Nr / 2 + 3.5 * m, 0.006, 64)), M.otelI); tambur.position.x = b * 0.8; coroana.add(tambur);
  return { G, a, rs, rpl, soare, coroana, port,
    pozeaza(fs, fc, fr) { soare.rotation.x = fs; coroana.rotation.x = fr; port.rotation.x = fc;
      // rotația proprie a sateliților (relativ la port): ω_p,rel = −(ω_s − ω_c)·Ns/Np
      sat.forEach((p) => { p.rotation.x = -((fs - fc) * Ns) / Np + Math.PI / Np; }); } };
}

/** linia de arbori a hibridului paralel: motor termic – K0 – EM – cutie; varianta P0: starter-generatorul pe curea */
export function linieArbori(o = {}) {
  const M = MAT(), G = new THREE.Group();
  const bloc = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.26), M.fonta); bloc.position.set(-0.45, 0.05, 0); bloc.castShadow = true; G.add(bloc);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.24), M.negru); cap.position.set(-0.45, 0.27, 0); G.add(cap);
  const arbI = new THREE.Group(); G.add(arbI);
  const vol = new THREE.Mesh(ax(cil(0.14, 0.03, 48)), M.otelI); vol.position.x = -0.22; arbI.add(vol);
  const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.2), M.alb); sp.position.set(-0.22, 0.1, 0); arbI.add(sp);
  const fulie = new THREE.Mesh(ax(cil(0.07, 0.03, 40)), M.otel); fulie.position.x = -0.68; arbI.add(fulie);
  const arbEM = new THREE.Group(); G.add(arbEM);
  const discK0a = new THREE.Mesh(ax(cil(0.11, 0.012, 40)), M.portocaliu); discK0a.position.x = -0.17; arbI.add(discK0a);
  const discK0b = new THREE.Mesh(ax(cil(0.11, 0.012, 40)), M.portocaliu); arbEM.add(discK0b);
  const em = new THREE.Mesh(ax(cil(0.15, 0.12, 48)), M.vopsea); em.position.x = 0.0; G.add(em); em.material = em.material.clone(); em.material.transparent = true; em.material.opacity = 0.55;
  const rot = new THREE.Mesh(ax(cil(0.1, 0.11, 32)), M.cupru); rot.position.x = 0; arbEM.add(rot);
  const sp2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.18), M.alb); sp2.position.set(0.06, 0.08, 0); arbEM.add(sp2);
  const arb = new THREE.Mesh(ax(cil(0.015, 0.3)), M.otel); arb.position.x = 0.05; arbEM.add(arb);
  const cutie = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.24), M.alu); cutie.position.set(0.32, -0.02, 0); cutie.material = cutie.material.clone(); cutie.material.transparent = true; cutie.material.opacity = 0.5; G.add(cutie);
  // starter-generatorul P0 pe curea
  const bsg = new THREE.Group(); bsg.position.set(-0.68, -0.05, 0.22); G.add(bsg);
  const bsgC = new THREE.Mesh(ax(cil(0.065, 0.13, 32)), M.alu); bsgC.position.x = 0.07; bsg.add(bsgC);
  const bsgF = new THREE.Group(); bsg.add(bsgF); const fb = new THREE.Mesh(ax(cil(0.028, 0.03, 32)), M.otel); bsgF.add(fb);
  const sp3 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.05), M.alb); bsgF.add(sp3);
  const curea = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 8, 64), M.cauc); curea.scale.set(1, 0.62, 1); curea.rotation.y = Math.PI / 2; curea.position.set(-0.68, -0.025, 0.11); curea.rotation.x = -0.2; G.add(curea);
  bsg.visible = curea.visible = !!o.p0; fulie.visible = !!o.p0;
  const s = { ice: sageata(0xe53935, 0.008), em: sageata(0x1e88e5, 0.008), tot: sageata(0x43a047, 0.008) }; G.add(s.ice, s.em, s.tot);
  return { G, arbI, arbEM, bsg, bsgF, discK0b, s, p0(b) { bsg.visible = curea.visible = fulie.visible = b; },
    pozeaza(fI, fE, k0, fB, Ti, Te, sc) { arbI.rotation.x = fI; arbEM.rotation.x = fE; discK0b.position.x = -0.15 + (k0 ? 0 : 0.03); bsgF.rotation.x = fB;
      s.ice.seteaza(V3(-0.3, 0.22, 0), V3(1, 0, 0), Ti * sc); s.em.seteaza(V3(-0.05, 0.22, 0), V3(1, 0, 0), Te * sc); s.tot.seteaza(V3(0.18, 0.22, 0), V3(1, 0, 0), (Ti + Te) * sc); } };
}
