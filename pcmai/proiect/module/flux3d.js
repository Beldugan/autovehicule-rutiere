/* Macheta fluxurilor de putere (modulul S): vehiculul cu componentele lanțului de propulsie și legăturile dintre ele;
   pe fiecare legătură se deplasează particule cu viteza proporțională cu puterea transmisă, în sensul ei
   (albastru – electric, portocaliu – mecanic, verde – recuperare, chihlimbar – combustibil). Unități: metri. */
import { THREE, V3, MAT, mat, RoundedBoxGeometry, CAE, matCAE, matCarcasa, contur } from "./scena.js";

const CUL = { el: 0x3d8bfd, mec: 0xff8a3d, reg: 0x34c759, comb: 0xf2b705 };

function corpVehicul(G, M, tipV) {
  const moto = tipV === "MOTO", lcv = tipV === "LCV";
  const L = moto ? 2.1 : lcv ? 4.6 : 4.1, B = moto ? 0.7 : 1.75, Hh = moto ? 1.0 : lcv ? 2.0 : 1.45, ax = moto ? 0.72 : lcv ? 1.55 : 1.33;
  let caroserie;
  if (moto) { caroserie = new THREE.Mesh(new RoundedBoxGeometry(L, Hh - 0.3, 0.35, 4, 0.12), matCarcasa(0xd9dde2)); caroserie.position.set(0, 0.3 + (Hh - 0.3) / 2, 0); }
  else {
    // silueta laterală (x în lungul vehiculului, y în sus), extrudată pe lățime cu racordări mari
    const h0 = 0.2, sh = new THREE.Shape(), xf = L / 2, xr = -L / 2, rr0 = lcv ? 0.4 : 0.37, H = Hh;
    sh.moveTo(xr + 0.05, h0 + 0.1);
    sh.lineTo(-ax - rr0, h0 + 0.1); sh.absarc(-ax, h0 + 0.12, rr0, Math.PI, 0, true); sh.lineTo(ax - rr0, h0 + 0.1); sh.absarc(ax, h0 + 0.12, rr0, Math.PI, 0, true);
    sh.lineTo(xf - 0.05, h0 + 0.1);
    if (lcv) { sh.quadraticCurveTo(xf, h0 + 0.12, xf, h0 + 0.55); sh.lineTo(xf - 0.25, H - 0.35); sh.quadraticCurveTo(xf - 0.55, H, xf - 0.9, H); sh.lineTo(xr + 0.05, H); sh.lineTo(xr, H - 0.05); sh.lineTo(xr, h0 + 0.15); }
    else { sh.quadraticCurveTo(xf + 0.02, h0 + 0.15, xf, h0 + 0.5); sh.quadraticCurveTo(xf - 0.25, h0 + 0.72, xf - 1.0, h0 + 0.8); sh.quadraticCurveTo(xf - 1.55, H, xf - 2.0, H);
      sh.lineTo(xr + 1.25, H); sh.quadraticCurveTo(xr + 0.6, H - 0.05, xr + 0.25, h0 + 0.85); sh.quadraticCurveTo(xr - 0.02, h0 + 0.7, xr, h0 + 0.4); sh.lineTo(xr + 0.05, h0 + 0.1); }
    const lat = B - 0.24, g = new THREE.ExtrudeGeometry(sh, { depth: lat, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 5, curveSegments: 24 }); g.translate(0, 0, -lat / 2);
    caroserie = new THREE.Mesh(g, matCarcasa(0xdde2e8));
    // geamurile (vizibile în vederea opacă)
    if (!lcv) { const gw = new THREE.Shape(); gw.moveTo(xf - 1.05, h0 + 0.83); gw.quadraticCurveTo(xf - 1.5, H - 0.04, xf - 2.0, H - 0.04); gw.lineTo(xr + 1.25, H - 0.04); gw.quadraticCurveTo(xr + 0.7, H - 0.08, xr + 0.35, h0 + 0.86); gw.closePath();
      const gg = new THREE.ExtrudeGeometry(gw, { depth: B + 0.04, bevelEnabled: false }); gg.translate(0, 0, -(B + 0.04) / 2); const geam = new THREE.Mesh(gg, matCarcasa(0x5b6f86, { roughness: 0.1, metalness: 0.3 })); geam.scale.set(1, 1, 1); G.add(geam); }
  }
  contur(caroserie, 35, 0.35); G.add(caroserie);
  const podea = new THREE.Mesh(new THREE.BoxGeometry(L * 0.92, 0.04, moto ? 0.22 : B * 0.92), M.gri); podea.position.y = 0.18; G.add(podea);
  const roti = [], rr = moto ? 0.3 : lcv ? 0.34 : 0.32;
  const poz = moto ? [[ax, 0], [-ax, 0]] : [[ax, B / 2 - 0.12], [ax, -B / 2 + 0.12], [-ax, B / 2 - 0.12], [-ax, -B / 2 + 0.12]];
  poz.forEach(([x, z]) => { const r = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.78, rr * 0.22, 14, 36), M.cauc); r.add(t);
    const j = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.6, rr * 0.6, 0.14, 24).rotateX(Math.PI / 2), matCAE(0xb9c0c7, { metalness: 0.6 })); r.add(j);
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, rr * 1.1, 0.02), M.otelI); s.rotation.z = k * Math.PI / 5; s.position.z = 0.075 * Math.sign(z || 1); r.add(s); }
    r.position.set(x, rr, z); G.add(r); roti.push(r); });
  return { roti, rr, L, B, ax };
}

/** arh: "BEV" | "LCV" | "MOTO_E" | "P0" | "P2" | "S" | "PS" | "PHEV" */
export function schemaFlux(arh) {
  const M = MAT(), G = new THREE.Group(), tipV = arh === "LCV" ? "LCV" : arh === "MOTO_E" ? "MOTO" : "AUTO";
  const v = corpVehicul(G, M, tipV), N = {}, ax = v.ax, moto = tipV === "MOTO";
  const cutie = (k, w, h, d, p, m, et) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15), m); o.position.set(...p); o.castShadow = true; contur(o, 30, 0.4); G.add(o); N[k] = { o, p: V3(...p), et, h }; return o; };
  const cil = (k, r, l, p, m, et, axa = "z") => { const g = new THREE.CylinderGeometry(r, r, l, 32); if (axa === "z") g.rotateX(Math.PI / 2); else if (axa === "x") g.rotateZ(Math.PI / 2); const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = true; contur(o, 30, 0.4); G.add(o); N[k] = { o, p: V3(...p), et, h: r * 2 }; return o; };
  const roataF = v.roti[0].position.clone(), roataF2 = moto ? null : v.roti[1].position.clone(), roataS = moto ? v.roti[1].position.clone() : v.roti[2].position.clone();
  N.roti = { p: moto ? roataS.clone() : V3(ax, v.rr, 0), et: "roți", h: 0.3 };
  const electric = arh !== "P0";
  // bateria
  if (moto) cutie("bat", 0.5, 0.25, 0.22, [0, 0.55, 0], matCAE(CAE.dif), "baterie");
  else if (arh === "BEV" || arh === "LCV") cutie("bat", v.L * 0.55, 0.12, v.B * 0.75, [-0.1, 0.27, 0], matCAE(CAE.dif), "baterie");
  else cutie("bat", 0.7, 0.22, 0.9, [-1.25, 0.36, 0], matCAE(CAE.dif), arh === "P0" ? "baterie 48 V" : "baterie");
  if (arh === "BEV" || arh === "LCV" || arh === "MOTO_E") {
    if (moto) { cutie("inv", 0.18, 0.12, 0.14, [0.25, 0.55, 0], matCAE(CAE.lagar), "invertor"); cil("em", 0.11, 0.16, [-0.35, 0.42, 0], matCAE(CAE.rotor), "motor electric"); N.roti.p = roataS.clone(); }
    else { cutie("inv", 0.3, 0.14, 0.35, [ax + 0.05, 0.62, 0.25], matCAE(CAE.lagar), "invertor"); cil("em", 0.13, 0.32, [ax - 0.05, 0.42, 0.2], matCAE(CAE.rotor), "motor electric", "z"); cutie("red", 0.26, 0.28, 0.2, [ax, 0.38, -0.08], matCAE(CAE.lagar), "reductor"); }
  }
  if (arh === "P0" || arh === "P2" || arh === "PHEV") {
    cutie("ice", 0.5, 0.42, 0.62, [ax + 0.18, 0.62, 0.15], matCAE(0x9aa1a8), "motor termic"); cutie("rez", 0.55, 0.2, 0.7, [-1.85, 0.32, 0], mat({ color: 0x6b5a2e, roughness: 0.6 }), "rezervor");
    if (arh === "P0") { cil("em", 0.08, 0.14, [ax + 0.5, 0.45, 0.45], matCAE(CAE.lagar), "starter-generator"); cutie("red", 0.4, 0.3, 0.32, [ax + 0.12, 0.5, -0.4], matCAE(CAE.lagar), "cutie de viteze"); }
    else { cil("k0", 0.12, 0.05, [ax + 0.18, 0.55, -0.2], matCAE(CAE.piston), "ambreiaj K0"); cil("em", 0.15, 0.18, [ax + 0.18, 0.55, -0.36], matCAE(CAE.rotor), "mașina electrică"); cutie("red", 0.4, 0.3, 0.3, [ax + 0.12, 0.48, -0.62], matCAE(CAE.lagar), "cutie de viteze"); cutie("inv", 0.28, 0.12, 0.3, [ax - 0.35, 0.72, -0.35], matCAE(CAE.lagar), "invertor"); }
  }
  if (arh === "MOTO_T") { cutie("rez", 0.42, 0.2, 0.3, [0.25, 0.9, 0], mat({ color: 0x6b5a2e, roughness: 0.6 }), "rezervor"); cutie("ice", 0.32, 0.36, 0.26, [0.05, 0.45, 0], matCAE(0x9aa1a8), "motor termic"); cutie("red", 0.2, 0.2, 0.2, [-0.25, 0.4, 0], matCAE(CAE.lagar), "cutie de viteze"); N.roti.p = roataS.clone(); }
  if (arh === "S") { cutie("ice", 0.45, 0.4, 0.5, [ax + 0.25, 0.62, 0.3], matCAE(0x9aa1a8), "motor termic"); cil("gen", 0.13, 0.2, [ax + 0.25, 0.6, -0.08], matCAE(CAE.arbore), "generator"); cutie("rez", 0.55, 0.2, 0.7, [-1.85, 0.32, 0], mat({ color: 0x6b5a2e, roughness: 0.6 }), "rezervor");
    cutie("inv", 0.3, 0.14, 0.35, [ax - 0.5, 0.7, 0], matCAE(CAE.lagar), "invertoare / magistrala DC"); cil("em", 0.14, 0.3, [ax - 0.05, 0.42, -0.35], matCAE(CAE.rotor), "motor de tracțiune"); cutie("red", 0.22, 0.26, 0.2, [ax, 0.36, -0.6], matCAE(CAE.lagar), "reductor"); }
  if (arh === "PS") { cutie("ice", 0.45, 0.4, 0.5, [ax + 0.25, 0.62, 0.35], matCAE(0x9aa1a8), "motor termic"); cil("pl", 0.16, 0.08, [ax + 0.25, 0.55, 0.03], matCAE(CAE.soare), "planetar"); cil("mg1", 0.12, 0.14, [ax + 0.25, 0.55, -0.15], matCAE(CAE.arbore), "MG1 (soare)");
    cil("em", 0.14, 0.2, [ax - 0.12, 0.45, -0.32], matCAE(CAE.rotor), "MG2 (coroană)"); cutie("red", 0.2, 0.24, 0.18, [ax, 0.36, -0.6], matCAE(CAE.lagar), "reductor final"); cutie("inv", 0.3, 0.14, 0.35, [ax - 0.55, 0.72, 0], matCAE(CAE.lagar), "invertoare"); cutie("rez", 0.55, 0.2, 0.7, [-1.85, 0.32, 0], mat({ color: 0x6b5a2e, roughness: 0.6 }), "rezervor"); }
  // legăturile: [de la, la, tip, cheia puterii]
  const L = [];
  if (arh === "BEV" || arh === "LCV" || arh === "MOTO_E") L.push(["bat", "inv", "el", "Pb"], ["inv", "em", "el", "Pem"], moto ? ["em", "roti", "mec", "Pw"] : ["em", "red", "mec", "Pw"], ...(moto ? [] : [["red", "roti", "mec", "Pw"]]));
  if (arh === "MOTO_T") L.push(["rez", "ice", "comb", "Pf"], ["ice", "red", "mec", "Pice"], ["red", "roti", "mec", "Pw"]);
  if (arh === "P0") L.push(["rez", "ice", "comb", "Pf"], ["ice", "red", "mec", "Pice"], ["red", "roti", "mec", "Pw"], ["em", "ice", "mec", "Pem"], ["bat", "em", "el", "Pb"]);
  if (arh === "P2" || arh === "PHEV") L.push(["rez", "ice", "comb", "Pf"], ["ice", "k0", "mec", "Pice"], ["k0", "em", "mec", "Pice"], ["em", "red", "mec", "Pax"], ["red", "roti", "mec", "Pw"], ["bat", "inv", "el", "Pb"], ["inv", "em", "el", "Pem"]);
  if (arh === "S") L.push(["rez", "ice", "comb", "Pf"], ["ice", "gen", "mec", "Pice"], ["gen", "inv", "el", "Pgen"], ["bat", "inv", "el", "Pb"], ["inv", "em", "el", "Pem"], ["em", "red", "mec", "Pw"], ["red", "roti", "mec", "Pw"]);
  if (arh === "PS") L.push(["rez", "ice", "comb", "Pf"], ["ice", "pl", "mec", "Pice"], ["pl", "mg1", "mec", "P1m"], ["mg1", "inv", "el", "P1e"], ["pl", "em", "mec", "Pring"], ["bat", "inv", "el", "Pb"], ["inv", "em", "el", "P2e"], ["em", "red", "mec", "Pw"], ["red", "roti", "mec", "Pw"]);
  const leg = [], NP = 14; let tot = 0;
  L.forEach(([a, b, tp, k]) => {
    if (!N[a] || !N[b]) return;
    const pa = N[a].p.clone(), pb = N[b].p.clone(), mid = pa.clone().lerp(pb, 0.5); mid.y = Math.max(pa.y, pb.y) + 0.18 + pa.distanceTo(pb) * 0.08;
    const cur = new THREE.QuadraticBezierCurve3(pa, mid, pb);
    const tub = new THREE.Mesh(new THREE.TubeGeometry(cur, 32, 0.02, 10, false), new THREE.MeshStandardMaterial({ color: CUL[tp], transparent: true, opacity: 0.35, emissive: CUL[tp], emissiveIntensity: 0.2 }));
    tub.userData.faraCadru = true; G.add(tub);
    leg.push({ cur, tp, k, s: Array.from({ length: NP }, (_, j) => j / NP), tub, i0: tot }); tot += NP;
  });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), tot); im.userData.faraCadru = true; G.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), s0 = V3(0, 0, 0);
  let P = {};
  return {
    G, N, roti: v.roti, rr: v.rr, legaturi: leg,
    seteaza(puteri) { P = puteri; },
    anim(dt, vMs) {
      v.roti.forEach((r) => { r.rotation.z -= (vMs || 0) / v.rr * dt; });
      leg.forEach((l) => {
        let p = P[l.k] || 0; const reg = l.tp !== "comb" && p < 0;
        const sc = Math.min(1, Math.abs(p) / 40), w = Math.sign(p) * (0.15 + 0.85 * sc) * 0.9;
        l.tub.material.opacity = Math.abs(p) > 0.05 ? 0.3 + 0.5 * sc : 0.08;
        const col = CUL[reg && l.tp === "mec" ? "reg" : reg ? "reg" : l.tp];
        l.tub.material.color.setHex(col); l.tub.material.emissive.setHex(col);
        l.s.forEach((s, j) => { let sN = s + w * dt; sN = ((sN % 1) + 1) % 1; l.s[j] = sN;
          const vis = Math.abs(p) > 0.05, sz = vis ? 0.6 + sc : 0; m4.compose(l.cur.getPoint(sN), q, vis ? V3(sz, sz, sz) : s0); im.setMatrixAt(l.i0 + j, m4); im.setColorAt(l.i0 + j, c.setHex(col)); });
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  };
}

/* ------------------------------------------------------------------ cilindrul motorului cu arderea (vizualizarea modelului 0D) */
export function cilindruArdere(o) {
  const G = new THREE.Group(), D = o.D, R = o.S / 2, L = o.L, hc = o.S / (o.eps - 1), yHead = R + L + 0.6 * D + hc, mC = matCarcasa();
  const yJos = R * 1.15;
  const lin = contur(new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 1.25, D / 2 * 1.25, yHead - yJos, 64, 1, false), mC), 30, 0.5);
  // alezajul: cilindru interior (fețele interioare apar la secționare); blocul ca tub cu pereți groși
  const sh = new THREE.Shape(); sh.absarc(0, 0, D * 0.82, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, D / 2 * 1.005, 0, Math.PI * 2, true); sh.holes.push(h);
  const gB = new THREE.ExtrudeGeometry(sh, { depth: yHead - yJos, bevelEnabled: false, curveSegments: 64 }); gB.rotateX(-Math.PI / 2); gB.translate(0, yJos, 0);
  const bloc = contur(new THREE.Mesh(gB, mC), 30, 0.5); G.add(bloc); void lin;
  const cap = contur(new THREE.Mesh(new THREE.BoxGeometry(D * 1.7, 0.45 * D, D * 1.7), mC), 30, 0.5); cap.position.y = yHead + 0.225 * D; G.add(cap);
  [-1, 1].forEach((sg) => { const port = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.17 * D, 0.17 * D, 0.7 * D, 24).rotateZ(Math.PI / 2 - sg * 0.5), mC)); port.position.set(sg * 0.55 * D, yHead + 0.3 * D, 0); G.add(port);
    const sup = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.15 * D, 0.03 * D, 0.06 * D, 24), matCAE(sg < 0 ? 0x3b82f6 : 0xc8382c))); sup.position.set(sg * 0.22 * D, yHead - 0.01 * D, 0); G.add(sup); });
  const bujie = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.05 * D, 0.05 * D, 0.5 * D, 16), matCAE(o.tip === "MAC" ? 0x8b939c : 0xf2f2f2))); bujie.position.set(0, yHead + 0.2 * D, 0); G.add(bujie);
  const piston = contur(new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 0.985, D / 2 * 0.985, 0.7 * D, 64), matCAE(CAE.piston))); G.add(piston);
  const biela = contur(new THREE.Mesh(new THREE.BoxGeometry(0.14 * D, 1, 0.1 * D), matCAE(CAE.biela))); biela.scale.y = L; biela.position.y = L / 2; piston.position.y = R + L; G.add(biela);
  const man = new THREE.Group(); G.add(man); const brat = contur(new THREE.Mesh(new THREE.BoxGeometry(0.2 * D, R * 1.5, 0.3 * D), matCAE(CAE.arbore))); brat.position.y = R * 0.45; man.add(brat);
  const fus = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.22 * D, 0.22 * D, 0.6 * D, 32).rotateZ(Math.PI / 2), matCAE(CAE.arbore))); man.add(fus);
  const gm = new THREE.MeshStandardMaterial({ color: 0x3366ff, transparent: true, opacity: 0.82, roughness: 0.5, emissive: 0x000000, depthWrite: false, side: THREE.DoubleSide });
  const gaz = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 0.97, D / 2 * 0.97, 1, 64, 1, false), gm); gaz.userData.faraCadru = true; G.add(gaz);
  const flM = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff6a00, emissiveIntensity: 1.2, transparent: true, opacity: 0.55, depthWrite: false });
  const flacara = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), flM); flacara.userData.faraCadru = true; G.add(flacara);
  const jeturi = new THREE.Group(); G.add(jeturi);
  for (let k = 0; k < 6; k++) { const j = new THREE.Mesh(new THREE.ConeGeometry(0.04 * D, 1, 10), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb000, emissiveIntensity: 0.6, transparent: true, opacity: 0.6, depthWrite: false })); j.userData.faraCadru = true; j.userData.k = k; jeturi.add(j); }
  return {
    G, yHead,
    pozeaza(alfa, T, xb, dxb, Tmin, Tmax, injectie, culoare) {
      const a = alfa * Math.PI / 180, yA = R * Math.cos(a), zA = R * Math.sin(a), yB = yA + Math.sqrt(L * L - zA * zA);
      piston.position.y = yB + 0.2 * D; man.rotation.x = a;
      const dir = V3(0, yB - yA, -zA), len = dir.length(); biela.scale.y = len; biela.position.set(0, (yA + yB) / 2, zA / 2); biela.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
      const top = yB + 0.55 * D, h = Math.max(1e-4, yHead - top); gaz.scale.y = h; gaz.position.y = top + h / 2;
      culoare(Math.max(0, Math.min(1, (T - Tmin) / (Tmax - Tmin))), gm.color); gm.emissive.copy(gm.color).multiplyScalar(0.25);
      // frontul flăcării (MAS: sferă din bujie, volumul ars ~ fracția arsă) / jeturile și arderea difuzivă (MAC)
      const Vg = Math.PI * D * D / 4 * h, rf = Math.cbrt(Math.max(0, Math.min(1, xb)) * Vg * 3 / (2 * Math.PI));
      flacara.visible = xb > 0.002 && xb < 0.999; flacara.scale.set(Math.min(rf, D / 2), Math.min(rf, h), Math.min(rf, D / 2)); flacara.position.y = yHead; flacara.rotation.x = Math.PI;
      flM.emissiveIntensity = 0.4 + 6 * Math.min(1, dxb * 20);
      jeturi.visible = !!injectie;
      jeturi.children.forEach((j) => { const u = j.userData.k / 6 * Math.PI * 2, ln = D * 0.42 * (injectie || 0); j.scale.y = Math.max(1e-3, ln); const d = V3(Math.cos(u), -0.45, Math.sin(u)).normalize(); j.quaternion.setFromUnitVectors(V3(0, 1, 0), d.clone().negate()); j.position.set(0, yHead - 0.02 * D, 0).addScaledVector(d, ln / 2); });
    }
  };
}
