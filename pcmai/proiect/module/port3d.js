/* Scena 3D animată a simulării CFD a canalului de admisie și a cilindrului, cu motorul real în jurul domeniului de calcul:
   • chiulasa (bloc de aluminiu secționat) străbătută de canalele de admisie și de evacuare, scaunele și ghidurile supapelor,
     arcurile, talerele, tachetii-pahar și arborii cu came (profilul camei construit din legea de ridicare a proiectului);
   • blocul cilindrilor cu cămașa și cămașa de apă (lichidul de răcire), bujia;
   • pistonul cu segmenții, bolțul, biela și arborele cotit – cinematica exactă bielă–manivelă;
   • câmpul calculat: secțiunea mediană și planul orizontal colorate după modulul vitezei, vectorii, particulele-trasor
     cu dârele lor (liniile de curent ale ultimelor grade de rotație), interpolate între cadre pentru o animație continuă.
   Vederile Opac / Transparent / Secționat se aplică pieselor fixe (chiulasa, blocul, canalele). */
import { THREE, V3, matCAE, matCarcasa, contur, creeazaScena } from "./scena.js";

export function culoareJet(x) { x = Math.max(0, Math.min(1, x)); const st = [[0, [0, 0, 255]], [0.25, [0, 200, 255]], [0.5, [40, 220, 60]], [0.75, [255, 220, 0]], [1, [220, 20, 20]]];
  for (let k = 1; k < st.length; k++) if (x <= st[k][0]) { const [a, ca] = st[k - 1], [b, cb] = st[k], t = (x - a) / (b - a); return ca.map((c, j) => Math.round(c + (cb[j] - c) * t)); } return st[4][1]; }
const RAD = Math.PI / 180;
const lege = (phi, dur, L) => (phi >= 0 && phi <= dur ? L * Math.pow(Math.sin((Math.PI * phi) / dur), 2) : 0);
const fara = (o) => { o.traverse((x) => (x.userData.faraCadru = true)); return o; };
const lin = (c) => (c / 255) ** 2.2;
const metal = (c, o = {}) => matCAE(c, Object.assign({ metalness: 0.55, roughness: 0.32 }, o));

/** extrudarea unui contur din planul x–z pe verticală (de la y0 în jos, pe înălțimea H) */
function extrudat(shape, H, y0, material) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, curveSegments: 64 }); g.rotateX(Math.PI / 2); g.translate(0, y0, 0);
  return contur(new THREE.Mesh(g, material), 35, 0.3);
}
const cerc = (r, cx = 0, cz = 0) => { const p = new THREE.Path(); p.absarc(cx, cz, r, 0, Math.PI * 2, true); return p; };
const discShape = (r, rint) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); if (rint) s.holes.push(cerc(rint)); return s; };

export function scenaPort3D(gazda, geo, R, ext = {}) {
  const sc = creeazaScena(gazda, { prov: "post-procesare CFD 3D · simulator intern", umbra: 0.35 });
  const G = new THREE.Group(); sc.scene.add(G); sc.grup = G;
  const g = geo.g, D = geo.D, rP = geo.wP / 2, Rm = g.S / 2, Lb = g.L, hc = geo.hc, xv = geo.xv, dvs = geo.dv;
  const dse = g.dse ?? g.isa, ise = g.ise ?? g.dsa;
  const Le = (a) => lege((((a - (540 - dse)) % 720) + 720) % 720, 180 + dse + ise, g.Lmax);   // legea supapei de evacuare (vizualizare)
  const lmA = geo.lm.filter((q, k) => k === 0 || q[1] >= -0.001), lmE = lmA.map(([x, y]) => [-x, y]);
  const yPort = Math.max(...lmA.map((q) => q[1])) + rP, yH = Math.max(0.95 * D, yPort + 0.18 * D);   // fața superioară a chiulasei
  const XH = 0.82 * D, ZH = 0.62 * D;

  /* ---------------- chiulasa: bloc secționat, canalele (pereții domeniului de calcul), scaunele, ghidurile */
  const sh = new THREE.Shape(); sh.moveTo(-XH, -ZH); sh.lineTo(XH, -ZH); sh.lineTo(XH, ZH); sh.lineTo(-XH, ZH); sh.closePath();
  const gCh = new THREE.BoxGeometry(2 * XH, yH, 2 * ZH, 64, 20, 48); gCh.translate(0, yH / 2, 0); gCh.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(gCh.attributes.position.count * 3).fill(1), 3));
  const chiulasa = contur(new THREE.Mesh(gCh, matCarcasa(0xd3d6da, { vertexColors: true })), 35, 0.3); G.add(chiulasa);
  const tub = (pts, cul) => { const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => V3(x, y, 0)), false, "centripetal"); const m = contur(new THREE.Mesh(new THREE.TubeGeometry(c, 200, rP, 40, false), matCarcasa(cul)), 50, 0.18); G.add(m); return m; };
  tub(lmA, 0x9fb8d0); tub(lmE, 0xd2aaa0);
  // flanșele colectoarelor la ieșirea canalelor din chiulasă
  [[lmA, 0x8fa3b5], [lmE, 0xb98e84]].forEach(([lm, c]) => { const q = lm[lm.length - 1], f = contur(new THREE.Mesh(new THREE.CylinderGeometry(rP * 1.55, rP * 1.55, 0.05 * D, 40), metal(c)), 30, 0.3); f.rotation.z = Math.PI / 2; f.position.set(q[0] + Math.sign(q[0]) * 0.02 * D, q[1], 0); G.add(f); });
  [xv, -xv].forEach((x) => { const s = contur(new THREE.Mesh(new THREE.TorusGeometry(dvs * 0.53, 0.025 * D, 12, 48).rotateX(Math.PI / 2), metal(0x6f7780)), 30, 0.3); s.position.set(x, 0.012 * D, 0); G.add(s);
    const gh = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * D, 0.055 * D, 0.42 * D, 20), metal(0xa08a68)); gh.position.set(x, yPort + 0.1 * D, 0); fara(gh); G.add(gh); });

  /* ---------------- blocul cilindrilor: cămașa, cămașa de apă (lichidul), blocul secționat */
  const Hb = hc + g.S + 0.75 * D;
  const bloc = extrudat((() => { const s = new THREE.Shape(); s.moveTo(-XH, -ZH); s.lineTo(XH, -ZH); s.lineTo(XH, ZH); s.lineTo(-XH, ZH); s.closePath(); s.holes.push(cerc(0.64 * D)); return s; })(), Hb, 0, matCarcasa(0xc9ccd0)); G.add(bloc);
  const camasa = extrudat(discShape(0.56 * D, 0.5 * D), Hb, 0, matCarcasa(0x9aa2ab)); G.add(camasa);
  const apa = extrudat(discShape(0.64 * D, 0.56 * D), Hb * 0.85, -0.04 * D, matCarcasa(0x4c9be0, { opacity: 0.75, transparent: true })); G.add(apa);

  /* ---------------- supapele, arcurile, talerele, tachetii, arborii cu came */
  const yTijaSus = yH + 0.32 * D;
  const profil = (Ls) => [[0, -geo.tv], [dvs * 0.53, -geo.tv], [dvs * 0.53, -geo.tv * 0.45], [dvs * 0.42, -geo.tv * 0.05], [dvs * 0.2, 0.06 * D], [0.06 * D, 0.14 * D], [0.035 * D, 0.24 * D], [0.035 * D, Ls], [0.03 * D, Ls + 0.01 * D], [0, Ls + 0.01 * D]].map(([r, y]) => new THREE.Vector2(r, y));
  function ansambluSupapa(x, culS, legea) {
    const A = new THREE.Group(); A.position.x = x;
    const sup = contur(new THREE.Mesh(new THREE.LatheGeometry(profil(yTijaSus), 64), metal(culS)), 35, 0.35); A.add(sup);
    // arcul elicoidal (lungimea se modifică odată cu ridicarea), talerul, tachetul-pahar
    const spire = 7, Ra = 0.11 * D, pts = []; for (let k = 0; k <= spire * 32; k++) { const t = k / (spire * 32), f = t * spire * Math.PI * 2; pts.push(V3(Ra * Math.cos(f), t, Ra * Math.sin(f))); }
    const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), spire * 48, 0.014 * D, 8, false), metal(0x7d838a, { metalness: 0.6 })); A.add(arc);
    const taler = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.13 * D, 0.08 * D, 0.04 * D, 32), metal(0xa7adb4)), 30, 0.35); A.add(taler);
    const tachet = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.15 * D, 0.15 * D, 0.2 * D, 40), metal(0x8d96a0)), 30, 0.35); A.add(tachet);
    const yArc0 = yH + 0.005 * D;
    // arborele cu came: profilul polar r(ψ) = r0 + L(α), cu ψ = −90° − α/2 (contactul pe verticală cu tachetul plan)
    const r0 = 0.125 * D, Lm = g.Lmax, cs = new THREE.Shape(); for (let k = 0; k <= 360; k++) { const psi = k * RAD, a = (((2 * (-Math.PI / 2 - psi)) / RAD) % 720 + 720) % 720, r = r0 + legea(a); const X = r * Math.cos(psi), Y = r * Math.sin(psi); k ? cs.lineTo(X, Y) : cs.moveTo(X, Y); }
    const camG = new THREE.ExtrudeGeometry(cs, { depth: 0.13 * D, bevelEnabled: true, bevelThickness: 0.008 * D, bevelSize: 0.006 * D, bevelSegments: 1, curveSegments: 4 }); camG.translate(0, 0, -0.065 * D);
    const cama = contur(new THREE.Mesh(camG, metal(0x9ba1a8)), 30, 0.35); const yCam = yTijaSus + 0.2 * D + 0.01 * D + r0; cama.position.y = yCam; A.add(cama);
    // arborele cu came în lungul axei arborelui cotit (z): tubul, fusurile cu capacele lagărelor (fixate în chiulasă), flanșa roții de distribuție
    const arb = new THREE.Group(); arb.position.y = yCam; A.add(arb);
    arb.add(new THREE.Mesh(new THREE.CylinderGeometry(0.065 * D, 0.065 * D, 1.5 * D, 32).rotateX(Math.PI / 2), metal(0x9ba1a8)));
    [-0.42, 0.42].forEach((zz) => { const f = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.1 * D, 0.1 * D, 0.12 * D, 32).rotateX(Math.PI / 2), metal(0xb7bdc4)), 30, 0.3); f.position.z = zz * D; arb.add(f);
      const cap = contur(new THREE.Mesh(new THREE.BoxGeometry(0.3 * D, 0.13 * D, 0.13 * D), matCarcasa(0xc9cdd2)), 30, 0.35); cap.position.set(0, 0.075 * D, zz * D); arb.add(cap);
      const su = contur(new THREE.Mesh(new THREE.BoxGeometry(0.3 * D, 0.13 * D, 0.13 * D), matCarcasa(0xc9cdd2)), 30, 0.35); su.position.set(0, -0.08 * D, zz * D); arb.add(su);
      [-1, 1].forEach((sx) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * D, 0.022 * D, 0.03 * D, 6), metal(0x5b6168)); b.position.set(sx * 0.11 * D, 0.155 * D, zz * D); arb.add(b); }); });
    const roata = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.22 * D, 0.22 * D, 0.08 * D, 48).rotateX(Math.PI / 2), metal(0xaeb4bb)), 30, 0.3); roata.position.z = 0.78 * D; arb.add(roata);
    const ax = arb;
    fara(A); G.add(A);
    return (a) => { const L = legea(a); sup.position.y = -L; const ySus = yTijaSus - L; taler.position.y = ySus - 0.12 * D; tachet.position.y = ySus + 0.1 * D;
      const lA = taler.position.y - 0.02 * D - yArc0; arc.position.y = yArc0; arc.scale.y = Math.max(0.05 * D, lA); cama.rotation.z = (a / 2) * RAD; };
  }
  const supA = ansambluSupapa(xv, 0xb7bcc2, geo.Lv), supE = ansambluSupapa(-xv, 0x9a8f88, Le);

  /* ---------------- bujia */
  const buj = new THREE.Group(); buj.position.set(0, 0, -0.3 * D);
  const el = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * D, 0.03 * D, 0.06 * D, 12), metal(0x777777)); el.position.y = -0.03 * D; buj.add(el);
  const cor = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * D, 0.07 * D, 0.32 * D, 24), metal(0x8a8f96)); cor.position.y = 0.16 * D; buj.add(cor);
  const hex = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.12 * D, 0.12 * D, 0.1 * D, 6), metal(0xb0b5bb)), 30, 0.4); hex.position.y = yH + 0.06 * D; buj.add(hex);
  const izo = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * D, 0.075 * D, 0.32 * D, 24), matCAE(0xf4f1ea, { roughness: 0.25 })); izo.position.y = yH + 0.27 * D; buj.add(izo);
  if (g.tipMotor !== "MAC") { fara(buj); G.add(buj); }

  /* ---------------- pistonul, segmenții, bolțul, biela, arborele cotit */
  const Hp = 0.62 * D, pr = [[0, 0], [0.497 * D, 0], [0.497 * D, -0.05 * D], [0.49 * D, -0.05 * D], [0.49 * D, -0.07 * D], [0.497 * D, -0.07 * D], [0.497 * D, -0.1 * D], [0.49 * D, -0.1 * D], [0.49 * D, -0.12 * D], [0.497 * D, -0.12 * D], [0.497 * D, -0.15 * D], [0.49 * D, -0.15 * D], [0.49 * D, -0.175 * D], [0.497 * D, -0.175 * D], [0.497 * D, -Hp], [0.45 * D, -Hp], [0.45 * D, -0.2 * D], [0, -0.2 * D]].map(([r, y]) => new THREE.Vector2(r, y));
  const piston = new THREE.Group();
  piston.add(contur(new THREE.Mesh(new THREE.LatheGeometry(pr.slice().reverse(), 72), metal(0xc6cacf, { metalness: 0.5 })), 30, 0.3));
  [-0.06, -0.11, -0.162].forEach((y) => { const s = new THREE.Mesh(new THREE.TorusGeometry(0.494 * D, 0.008 * D, 8, 64).rotateX(Math.PI / 2), metal(0x3a3f45)); s.position.y = y * D; piston.add(s); });
  const yBolt = -0.36 * D, bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * D, 0.11 * D, 0.86 * D, 32), metal(0xaab0b6)); bolt.rotation.x = Math.PI / 2; bolt.position.y = yBolt; piston.add(bolt);
  fara(piston); G.add(piston);
  const biela = new THREE.Group(); let bielaCul = null;
  if (ext.fe) {   // biela din rețeaua de elemente finite: fețele (grosimea pe nod) și pereții laterali, culorile = tensiunea von Mises
    const fe = ext.fe, P = [], I = [], idx = [];
    const v = (k, sg) => { P.push(fe.nod[k][0], fe.nod[k][1], (sg * fe.grosimeNod[k]) / 2); idx.push(k); return idx.length - 1; };
    const sus = fe.nod.map((_, k) => v(k, 1)), jos = fe.nod.map((_, k) => v(k, -1));
    fe.T.forEach(([a1, b1, c1]) => { I.push(sus[a1], sus[b1], sus[c1], jos[a1], jos[c1], jos[b1]); });
    fe.contur.forEach(([a1, b1]) => { const q = [v(a1, 1), v(b1, 1), v(b1, -1), v(a1, -1)]; I.push(q[0], q[2], q[1], q[0], q[3], q[2]); });
    const gB = new THREE.BufferGeometry(); gB.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); gB.setIndex(I); gB.computeVertexNormals();
    gB.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(idx.length * 3).fill(0.7), 3));
    const mB = new THREE.Mesh(gB, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide })); biela.add(mB);
    const muchii = new THREE.LineSegments(new THREE.EdgesGeometry(gB, 40), new THREE.LineBasicMaterial({ color: 0x1b2026, transparent: true, opacity: 0.35 })); biela.add(muchii);
    bielaCul = (S, smax) => { const camp = S >= 0 ? fe.comp : fe.intin, A = Math.abs(S), cc = gB.attributes.color.array;
      for (let j = 0; j < idx.length; j++) { const c = culoareJet((camp[idx[j]] * A) / 1e6 / smax); cc[3 * j] = lin(c[0]); cc[3 * j + 1] = lin(c[1]); cc[3 * j + 2] = lin(c[2]); } gB.attributes.color.needsUpdate = true; };
    const uz = new THREE.Mesh(new THREE.CylinderGeometry(fe.ri2, fe.ri2, 0.32 * D, 40, 1, true), metal(0xb08d57)); uz.rotation.x = Math.PI / 2; uz.position.y = -Lb; biela.add(uz);
  } else {
    const ochi = (r, y, l) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 32), metal(0x9aa0a6)); m.rotation.x = Math.PI / 2; m.position.y = y; biela.add(m); };
    ochi(0.15 * D, 0, 0.28 * D); ochi(0.27 * D, -Lb, 0.3 * D);
    const corp = new THREE.Mesh(new THREE.BoxGeometry(0.14 * D, Lb, 0.22 * D), metal(0x9aa0a6)); corp.position.y = -Lb / 2; biela.add(corp);
  }
  fara(biela); G.add(biela);
  const yPinPMI = -(hc) + yBolt, yC = yPinPMI - (Rm + Lb);   // centrul arborelui cotit
  const cot = new THREE.Group(); cot.position.y = yC;
  { const brat = new THREE.Shape(); brat.absarc(0, Rm, 0.3 * D, 0, Math.PI, false); brat.absarc(0, -0.15 * D, 0.62 * D, Math.PI * 1.15, Math.PI * 1.85, false); brat.closePath();
    [-0.2, 0.2].forEach((z) => { const gw = new THREE.ExtrudeGeometry(brat, { depth: 0.12 * D, bevelEnabled: false, curveSegments: 24 }); gw.translate(0, 0, z * D - (z < 0 ? 0.12 * D : 0)); cot.add(contur(new THREE.Mesh(gw, metal(0x8f969d, { metalness: 0.6 })), 30, 0.35)); });
    // manetonul (fusul bielei) numai între brațe, în lagărul bielei; fusurile paliere numai în exteriorul brațelor (biela se rotește liber între ele)
    const man = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.255 * D, 0.255 * D, 0.42 * D, 40), metal(0xb0b6bd)), 30, 0.3); man.rotation.x = Math.PI / 2; man.position.y = Rm; cot.add(man);
    [-1, 1].forEach((sg) => { const pal = contur(new THREE.Mesh(new THREE.CylinderGeometry(0.27 * D, 0.27 * D, 0.38 * D, 40), metal(0xb0b6bd)), 30, 0.3); pal.rotation.x = Math.PI / 2; pal.position.z = sg * 0.51 * D; cot.add(pal); }); }
  fara(cot); G.add(cot);

  /* ---------------- câmpul calculat: planurile colorate, vectorii, particulele cu dâre */
  const { nx, ny, nz, h, x0, y0, z0 } = R;
  const tex = (a, b) => { const t = new THREE.DataTexture(new Uint8Array(a * b * 4), a, b, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  const tZ = tex(nx, ny), tY = tex(nx, nz);
  const mPl = (t) => new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const pZ = new THREE.Mesh(new THREE.PlaneGeometry(nx * h, ny * h), mPl(tZ)); pZ.position.set(x0 + nx * h / 2, y0 + ny * h / 2, 0); pZ.renderOrder = 2; fara(pZ); G.add(pZ);
  const pY = new THREE.Mesh(new THREE.PlaneGeometry(nx * h, nz * h).rotateX(-Math.PI / 2), mPl(tY)); pY.position.set(x0 + nx * h / 2, 0, z0 + nz * h / 2); pY.renderOrder = 2; fara(pY); G.add(pY);
  const pas = Math.max(1, Math.round(nx / 30)), nvec = Math.ceil(nx / pas) * Math.ceil(ny / pas);
  const gV = new THREE.BufferGeometry(); gV.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(nvec * 18), 3));
  const vec = new THREE.LineSegments(gV, new THREE.LineBasicMaterial({ color: 0x0b0f14, transparent: true, opacity: 0.8 })); vec.renderOrder = 3; vec.position.z = 0.002 * D; vec.frustumCulled = false; fara(vec); G.add(vec);
  const C = R.cadre, NP = C[0].P.length / 3, NT = 4;   // dâra: ultimele NT cadre (2 °RAC fiecare)
  const gT = new THREE.BufferGeometry(); gT.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(NP * NT * 6), 3)); gT.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(NP * NT * 6), 3));
  const dare = new THREE.LineSegments(gT, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })); dare.frustumCulled = false; dare.renderOrder = 4; fara(dare); G.add(dare);
  const gP = new THREE.BufferGeometry(); gP.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3)); gP.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3));
  const part = new THREE.Points(gP, new THREE.PointsMaterial({ size: 0.028 * D, vertexColors: true, sizeAttenuation: true })); part.frustumCulled = false; fara(part); G.add(part);
  const st = { vmax: 50, prag: 0.04, camp: "v", Tmin: 300, Tmax: 2600, pMin: 0, pMax: 6e6, pGal: 1e5, pf: null, contur: true, orizontal: true, vectori: true, particule: true, termic: false, mef: true, sMax: 1 };
  // câmpul termic al chiulasei: T(x, z) pe placa de foc, scăzând exponențial spre fața superioară (grosimea de pătrundere ≈ 0,25·D)
  function coloreazaChiulasa() { const cc = gCh.attributes.color.array, pp = gCh.attributes.position.array, th = ext.termic;
    for (let j = 0; j < cc.length / 3; j++) { if (!st.termic || !th) { cc[3 * j] = cc[3 * j + 1] = cc[3 * j + 2] = 1; continue; }
      const x = pp[3 * j], y = pp[3 * j + 1], z = pp[3 * j + 2], i = Math.max(0, Math.min(th.nx - 1, Math.floor((x + th.XH) / th.dx))), k = Math.max(0, Math.min(th.nz - 1, Math.floor((z + th.ZH) / th.dz)));
      let T = th.T[k * th.nx + i]; if (th.tip[k * th.nx + i]) T = th.Tmin; T = th.Tmin + (T - th.Tmin) * Math.exp(-y / (0.25 * D));
      const c = culoareJet((T - th.Tmin) / (th.Tmax - th.Tmin)); cc[3 * j] = lin(c[0]) * 1.25; cc[3 * j + 1] = lin(c[1]) * 1.25; cc[3 * j + 2] = lin(c[2]) * 1.25; }
    gCh.attributes.color.needsUpdate = true; }
  // legenda în stilul programelor de calcul structural (bara verticală cu valorile, Max / Min)
  const leg2 = document.createElement("div"); leg2.className = "po-leg2"; gazda.appendChild(leg2);
  function legenda2(titlu, sub, vmin, vmax, u) { if (titlu == null) { leg2.hidden = true; return; } leg2.hidden = false;
    leg2.innerHTML = `<b>${titlu}</b><br><span>${sub}</span><br><span>Unitate: ${u}</span><div class="po-leg2-b">${Array.from({ length: 10 }, (_, k) => { const t = 1 - k / 9, c = culoareJet(t); return `<div><i style="background:rgb(${c.join(",")})"></i>${(vmin + (vmax - vmin) * t).toPrecision(4)}${k === 0 ? " Max" : k === 9 ? " Min" : ""}</div>`; }).join("")}</div>`; }
  /** presiunea: în cilindru presiunea ciclului (uniformă, ipoteza Mach mic), în canale presiunea din galerii */
  function umpleP(t, T, a, b, pc, sectZ) { const d = t.image.data; for (let s_ = 0; s_ < a * b; s_++) { const q = s_ * 4; if (T[s_]) { d[q + 3] = 0; continue; }
    const cil_ = !sectZ || y0 + (Math.floor(s_ / a) + 0.5) * h < 0, pv = cil_ ? pc : st.pGal, c = culoareJet((pv - st.pMin) / (st.pMax - st.pMin)); d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = 235; } t.needsUpdate = true; }
  function umpleT(t, V, T, a, b) { const d = t.image.data; for (let s_ = 0; s_ < a * b; s_++) { const q = s_ * 4; if (T[s_]) { d[q + 3] = 0; continue; } const c = culoareJet((V[s_] - st.Tmin) / (st.Tmax - st.Tmin)); d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = 235; } t.needsUpdate = true; }
  function umple(t, M, T, a, b) { const d = t.image.data; for (let s = 0; s < a * b; s++) { const q = s * 4; if (T[s]) { d[q + 3] = 0; continue; } const v = M[s] / st.vmax; if (v < st.prag) { d[q + 3] = 0; continue; } const c = culoareJet(v); d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = Math.round(120 + 120 * Math.min(1, (v - st.prag) / 0.15)); } /* aerul practic în repaus (sub prag) nu se colorează */ t.needsUpdate = true; }
  let ultimCadru = -1;
  function pozeaza(a) {
    // mișcarea continuă a pieselor (cinematica exactă), câmpul din cadrul cel mai apropiat, particulele interpolate între cadre
    supA(a); supE(a);
    if (bielaCul && st.mef && ext.forta) bielaCul(ext.forta[Math.max(0, Math.min(ext.forta.length - 1, Math.round(a)))], st.sMax);
    const yp = geo.yPiston(a); piston.position.y = yp;
    const ar = a * RAD, pin = V3(0, yp + yBolt, 0), cp = V3(Rm * Math.sin(ar), yC + Rm * Math.cos(ar), 0);
    biela.position.copy(pin); biela.rotation.z = Math.atan2(cp.x - pin.x, -(cp.y - pin.y)); cot.rotation.z = -ar;
    const dA = C.length > 1 ? C[1].a - C[0].a : 2, kf = Math.max(0, Math.min(C.length - 1, (a - C[0].a) / dA)), k0 = Math.floor(kf), k1 = Math.min(C.length - 1, k0 + 1), f = kf - k0, c = C[Math.round(kf)];
    pZ.visible = st.contur; pY.visible = st.orizontal; vec.visible = st.vectori; part.visible = dare.visible = st.particule;
    if (Math.round(kf) !== ultimCadru || st.reface) { ultimCadru = Math.round(kf); st.reface = false;
      const tC = st.camp === "T" && c.Tz, pC = st.camp === "p" && st.pf, pc = pC ? st.pf(a) : 0;
      if (st.contur) (pC ? umpleP(tZ, c.T, nx, ny, pc, true) : tC ? umpleT(tZ, c.Tz, c.T, nx, ny) : umple(tZ, c.M, c.T, nx, ny));
      if (st.orizontal) { (pC ? umpleP(tY, c.Th, nx, nz, pc, false) : tC ? umpleT(tY, c.Thz, c.Th, nx, nz) : umple(tY, c.Mh, c.Th, nx, nz)); pY.position.y = c.yh; }
      if (st.vectori) { const A = gV.attributes.position.array; let q = 0; const L = pas * h * 1.1;
        for (let j = 0; j < ny; j += pas) for (let i = 0; i < nx; i += pas) { const s = i + nx * j, U = c.U[s], V = c.V[s], m = Math.hypot(U, V), x = x0 + (i + 0.5) * h, y = y0 + (j + 0.5) * h;
          if (c.T[s] || m < 0.03 * st.vmax) { A.fill(0, q, q + 18); q += 18; continue; }
          const l = Math.min(1, m / st.vmax) * L, ux = U / m, uy = V / m, x2 = x + ux * l, y2 = y + uy * l, ah = 0.35 * l, aw = 0.2 * l;
          A.set([x, y, 0, x2, y2, 0, x2, y2, 0, x2 - ux * ah - uy * aw, y2 - uy * ah + ux * aw, 0, x2, y2, 0, x2 - ux * ah + uy * aw, y2 - uy * ah - ux * aw, 0], q); q += 18; }
        gV.attributes.position.needsUpdate = true; } }
    if (st.particule) {
      const A = gP.attributes.position.array, Cc = gP.attributes.color.array, TA = gT.attributes.position.array, TC = gT.attributes.color.array, P0 = C[k0].P, P1 = C[k1].P, V0 = C[k0].Pv;
      const lim = 0.25 * D; // salt mai mare decât atât între cadre = particulă reinjectată (fără dâră)
      for (let k = 0; k < NP; k++) { const i3 = k * 3; let X = P0[i3];
        const modT = st.camp === "T" && C[k0].Pt, modP = st.camp === "p" && st.pf;
        if (X !== X || (!modT && !modP && V0[k] < st.prag * st.vmax)) { A[i3] = 0; A[i3 + 1] = 1e3; A[i3 + 2] = 0; TA.fill(0, k * NT * 6, (k + 1) * NT * 6); continue; }
        let x = X, y = P0[i3 + 1], z = P0[i3 + 2]; const X1 = P1[i3];
        if (X1 === X1 && Math.abs(X1 - X) + Math.abs(P1[i3 + 1] - y) + Math.abs(P1[i3 + 2] - z) < lim) { x += (X1 - X) * f; y += (P1[i3 + 1] - y) * f; z += (P1[i3 + 2] - z) * f; }
        A[i3] = x; A[i3 + 1] = y; A[i3 + 2] = z;
        const col = culoareJet(modP ? ((y < 0 ? st.pf(a) : st.pGal) - st.pMin) / (st.pMax - st.pMin) : modT ? (C[k0].Pt[k] - st.Tmin) / (st.Tmax - st.Tmin) : V0[k] / st.vmax), r = lin(col[0]), gg = lin(col[1]), b = lin(col[2]); Cc[i3] = r; Cc[i3 + 1] = gg; Cc[i3 + 2] = b;
        // dâra: segmentele dintre pozițiile din cadrele anterioare
        let ax = x, ay = y, az = z;
        for (let s = 0; s < NT; s++) { const kk = k0 - s, q = (k * NT + s) * 6; if (kk < 0) { TA.fill(0, q, q + 6); continue; } const Pp = C[kk].P, bx = Pp[i3], by = Pp[i3 + 1], bz = Pp[i3 + 2];
          if (bx !== bx || Math.abs(bx - ax) + Math.abs(by - ay) + Math.abs(bz - az) > lim) { TA.fill(0, q, q + 6 * (NT - s)); TC.fill(0, q, q + 6 * (NT - s)); break; }
          TA[q] = ax; TA[q + 1] = ay; TA[q + 2] = az; TA[q + 3] = bx; TA[q + 4] = by; TA[q + 5] = bz; const w = 1 - s / NT;
          TC[q] = r * w + (1 - w); TC[q + 1] = gg * w + (1 - w); TC[q + 2] = b * w + (1 - w); TC[q + 3] = TC[q] * 0.8 + 0.2; TC[q + 4] = TC[q + 1] * 0.8 + 0.2; TC[q + 5] = TC[q + 2] * 0.8 + 0.2; ax = bx; ay = by; az = bz; } }
      gP.attributes.position.needsUpdate = gP.attributes.color.needsUpdate = gT.attributes.position.needsUpdate = gT.attributes.color.needsUpdate = true; }
    return c;
  }
  if (bielaCul && ext.forta) st.sMax = ext.sMax || 1;
  pozeaza(0); coloreazaChiulasa();
  sc.vedere("sect", [0, 0, -1]); sc.incadreaza([0.5, 0.25, 1.0], [0, 0, 0]);
  { const t = sc.ctl.target; t.y += 0.15 * D; sc.camera.position.sub(t).multiplyScalar(1.4).add(t); sc.ctl.update(); }
  function legenda(vmax, f, titlu = "Viteza: modul", u = "m/s", vmin = 0) { sc.legenda(titlu, vmin, vmax, u, f); const b = gazda.querySelector(".bara-c"); if (b) b.style.background = `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((t) => `rgb(${culoareJet(t).join(",")})`).join(",")})`; }
  return { sc, st, pozeaza, legenda, legenda2, coloreazaChiulasa, distruge() { sc.distruge(); } };
}
