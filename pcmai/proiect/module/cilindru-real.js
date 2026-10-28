/* Cilindrul real al motorului proiectat, pentru animația ciclului (modulul S):
   • chiulasa cu cameră de ardere în acoperiș (MAS, 4 supape) sau plată cu cameră în piston (MAC), canalele de admisie (două
     ramuri care se unesc) și de evacuare, scaunele, ghidurile, supapele înclinate cu arcuri, talere și tacheți-pahar, doi arbori
     cu came (profilul camei generat din fazele distribuției), bujia sau injectorul central;
   • blocul cu cămașa cilindrului și cămașa de apă (lichidul), pistonul cu segmenți și bolț, biela în dublu T cu capac și
     șuruburi, arborele cotit cu brațe și contragreutăți – cinematica exactă;
   • gazul din cilindru (volumul real: cilindrul + camera de ardere) colorat după temperatura din modelul 0D, frontul flăcării din
     bujie (MAS) sau jeturile de combustibil și flacăra difuzivă (MAC), fluxurile de gaze proaspete și arse prin canale.
   Axa cilindrului pe Y, arborele cotit pe X; admisia pe +z, evacuarea pe −z. α = 0 la PMI-admisie. */
import { THREE, V3, matCAE, matCarcasa, contur } from "./scena.js";

const RAD = Math.PI / 180;
const lege = (phi, dur, L) => (phi >= 0 && phi <= dur ? L * Math.pow(Math.sin((Math.PI * phi) / dur), 2) : 0);
const mod = (a, p) => ((a % p) + p) % p;
const metal = (c, o = {}) => matCAE(c, Object.assign({ metalness: 0.6, roughness: 0.3 }, o));
// profilul se dă de sus în jos; LatheGeometry cere ordinea de jos în sus pentru normale spre exterior (altfel fețele de sus nu se văd)
const ordine = (pts) => (pts.length && pts[0][1] > pts[pts.length - 1][1] ? pts.slice().reverse() : pts);
const lathe = (pts, n = 64) => new THREE.LatheGeometry(ordine(pts).map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), n);
const fara = (o) => { o.traverse((x) => (x.userData.faraCadru = true)); return o; };
const C = (m, a = 32, op = 0.3) => contur(m, a, op);

export function cilindruReal(o) {
  const G = new THREE.Group(), D = o.D, R = o.S / 2, L = o.L, mac = o.tip === "MAC", Ap = (Math.PI * D * D) / 4, Vc = (Ap * o.S) / (o.eps - 1);
  const dist = o.dist || { dsa: 10, isa: 45, dse: 45, ise: 10 }, Lmax = Math.min(0.1 * D, 0.011);
  const durA = 180 + dist.isa + dist.dsa, durE = 180 + dist.dse + dist.ise;
  const Lad = (a) => lege(mod(a + dist.dsa, 720), durA, Lmax), Lev = (a) => lege(mod(a - (540 - dist.dse), 720), durE, Lmax);
  // camera de ardere: acoperiș în două pante (MAS) sau chiulasă plată cu cameră în piston (MAC); volumul total = V_c
  const th = (mac ? 0 : 22) * RAD, hr = mac ? 0 : Math.min((D / 2) * Math.tan(th), 1.6 * Vc / Ap), thR = Math.atan(hr / (D / 2));
  const vBol = mac ? 0.72 * Vc : 0, hs = Math.max(0.006 * D, (Vc - vBol) / Ap - hr * (1 - 4 / (3 * Math.PI)));   // înălțimea de strivire (squish)
  const hp = 0.48 * D, yPMI = R + L + hp, yDeck = yPMI + hs, yApex = yDeck + hr;          // fața pistonului la PMI, planul chiulasei, coama acoperișului
  const yRoof = (z) => yDeck + hr * Math.max(0, 1 - Math.abs(z) / (D / 2));
  const mC = matCarcasa(0xc9cdd2), mCh = matCarcasa(0xd3d6da);

  /* ---------------- blocul: cămașa, cămașa de apă, peretele, carterul */
  const ext = (sh, y0, y1, m) => { const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 64 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return C(new THREE.Mesh(g, m), 35, 0.3); };
  const cerc = (r, gaura) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); if (gaura) { const h = new THREE.Path(); h.absarc(0, 0, gaura, 0, Math.PI * 2, true); s.holes.push(h); } return s; };
  const dreptGaura = (w, d, rg) => { const s = new THREE.Shape(); s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.closePath(); const h = new THREE.Path(); h.absarc(0, 0, rg, 0, Math.PI * 2, true); s.holes.push(h); return s; };
  const yB0 = R + 0.3 * D, W = 1.55 * D;
  G.add(ext(cerc(0.57 * D, 0.5 * D), yB0, yDeck, mC));
  G.add(ext(cerc(0.66 * D, 0.57 * D), yB0 + 0.4 * D, yDeck - 0.04 * D, matCarcasa(0x3d8fe0, { transparent: true, opacity: 0.7 })));
  G.add(ext(dreptGaura(W, W * 0.95, 0.66 * D), yB0, yDeck, mC));
  G.add(ext(dreptGaura(W, W * 1.05, 0.95 * D), -R - 0.45 * D, yB0, mC));

  /* ---------------- chiulasa: placa de foc cu acoperișul camerei, corpul, capacul culbutorilor */
  const yCh1 = yApex + 1.15 * D;
  { const sh = new THREE.Shape(); sh.moveTo(-W / 2, -W * 0.6); sh.lineTo(W / 2, -W * 0.6); sh.lineTo(W / 2, W * 0.6); sh.lineTo(-W / 2, W * 0.6); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: yCh1 - yDeck, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, yDeck, 0); G.add(C(new THREE.Mesh(g, mCh), 35, 0.3)); }
  // fața camerei de ardere (acoperișul) – suprafață metalică vizibilă la secționare
  const roof = new THREE.Mesh(new THREE.CircleGeometry(D / 2, 64).rotateX(-Math.PI / 2), metal(0x8d949b, { side: THREE.DoubleSide }));
  { const p = roof.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, yRoof(p.getZ(k)) - 0.0005 * D); roof.geometry.computeVertexNormals(); } fara(roof); G.add(roof);
  const yCam = yApex + 1.0 * D;
  { const sh = new THREE.Shape(); const w = W * 0.98, d = W * 1.18, r = 0.25 * D; sh.moveTo(-w / 2 + r, -d / 2); sh.lineTo(w / 2 - r, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); sh.lineTo(w / 2, d / 2 - r); sh.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); sh.lineTo(-w / 2 + r, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); sh.lineTo(-w / 2, -d / 2 + r); sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.55 * D, bevelEnabled: true, bevelThickness: 0.05 * D, bevelSize: 0.05 * D, bevelSegments: 3 }); g.rotateX(-Math.PI / 2); g.translate(0, yCh1, 0); G.add(C(new THREE.Mesh(g, matCarcasa(0x8f98a2, { metalness: 0.4 })), 35, 0.3)); }

  /* ---------------- canalele: admisie (+z, două ramuri) și evacuare (−z) */
  const xv = mac ? 0.21 * D : 0.22 * D, zvA = mac ? 0.2 * D : 0.21 * D, dA = (mac ? 0.33 : 0.37) * D, dE = (mac ? 0.3 : 0.32) * D;
  const tub = (pts, r, m) => C(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, r, 28, false), m), 50, 0.2);
  const mPA = matCarcasa(0x8fb3d9), mPE = matCarcasa(0xd9a08f);
  const drumA = [], drumE = [];
  [-1, 1].forEach((sx) => { const a = [V3(sx * xv, yRoof(zvA) + 0.02 * D, zvA), V3(sx * xv, yRoof(zvA) + 0.35 * D, zvA + 0.12 * D), V3(sx * xv * 0.5, yRoof(zvA) + 0.62 * D, 0.62 * D), V3(0, yRoof(zvA) + 0.72 * D, 0.95 * D)];
    G.add(tub(a, dA * 0.5, mPA)); drumA.push(a);
    const e = [V3(sx * xv, yRoof(zvA) + 0.02 * D, -zvA), V3(sx * xv, yRoof(zvA) + 0.3 * D, -zvA - 0.1 * D), V3(sx * xv * 0.5, yRoof(zvA) + 0.45 * D, -0.6 * D), V3(0, yRoof(zvA) + 0.5 * D, -0.95 * D)];
    G.add(tub(e, dE * 0.5, mPE)); drumE.push(e); });
  G.add(tub([V3(0, yRoof(zvA) + 0.72 * D, 0.95 * D), V3(0, yRoof(zvA) + 0.85 * D, 1.35 * D), V3(0, yRoof(zvA) + 1.1 * D, 1.75 * D)], 0.27 * D, matCarcasa(0x5b8fd6)));
  G.add(tub([V3(0, yRoof(zvA) + 0.5 * D, -0.95 * D), V3(0, yRoof(zvA) + 0.4 * D, -1.35 * D), V3(0, yRoof(zvA) - 0.1 * D, -1.65 * D)], 0.23 * D, matCarcasa(0xc8704f, { metalness: 0.5 })));

  /* ---------------- supapele, arcurile, tachetii, arborii cu came */
  const rbc = 0.15 * D, dc = 1.0 * D / Math.cos(th) + 0.0, supape = [];
  const camA = new THREE.Group(), camE = new THREE.Group();
  const prof = (dv, Ls) => [[0, -0.05 * D], [dv / 2, -0.05 * D], [dv / 2, -0.03 * D], [dv * 0.38, 0], [dv * 0.18, 0.06 * D], [0.05 * D, 0.13 * D], [0.03 * D, 0.2 * D], [0.03 * D, Ls], [0, Ls]];
  const arcG = (() => { const P = []; for (let k = 0; k <= 200; k++) { const a = (k / 200) * Math.PI * 2 * 6.5; P.push(V3(0.11 * D * Math.cos(a), k / 200, 0.11 * D * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 400, 0.012 * D, 6); })();
  [1, -1].forEach((sg) => [-1, 1].forEach((sx) => {
    const adm = sg > 0, dv = adm ? dA : dE, seat = V3(sx * xv, yRoof(sg * zvA), sg * zvA), yTop = dc - rbc;
    const fix = new THREE.Group(); fix.position.copy(seat); fix.rotation.x = sg * th; G.add(fix);
    const sv = new THREE.Group(); fix.add(sv);
    sv.add(C(new THREE.Mesh(lathe(prof(dv, yTop - 0.1 * D), 48), metal(adm ? 0xc3c7cc : 0xa0938a)), 35, 0.35));
    const tachet = C(new THREE.Mesh(new THREE.CylinderGeometry(0.13 * D, 0.13 * D, 0.11 * D, 32), metal(0x9aa0a6))); tachet.position.y = yTop - 0.055 * D; sv.add(tachet);
    const taler = C(new THREE.Mesh(new THREE.CylinderGeometry(0.13 * D, 0.06 * D, 0.035 * D, 28), metal(0xa7adb4))); taler.position.y = yTop - 0.15 * D; sv.add(taler);
    const ghid = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * D, 0.045 * D, 0.32 * D, 16), metal(0xa08a68)); ghid.position.y = 0.45 * D; fix.add(ghid);
    const scaun = new THREE.Mesh(new THREE.TorusGeometry(dv * 0.47, 0.016 * D, 8, 40).rotateX(Math.PI / 2), metal(0x5b6168)); fix.add(scaun);
    const y0 = 0.62 * D, arc = new THREE.Mesh(arcG, metal(0x7d838a)); arc.position.y = y0; const hA = yTop - 0.17 * D - y0; arc.scale.y = hA; fix.add(arc);
    fara(fix); supape.push({ sv, arc, hA, adm });
  }));
  // arborii cu came: axele (paralele cu X) pe axele supapelor; lobii construiți din legea de ridicare
  [[camA, 1], [camE, -1]].forEach(([cam, sg]) => {
    const c0 = V3(0, yRoof(sg * zvA), sg * zvA).add(V3(0, Math.cos(th), sg * Math.sin(th)).multiplyScalar(dc)); cam.position.copy(c0); G.add(cam);
    cam.add(C(new THREE.Mesh(new THREE.CylinderGeometry(0.08 * D, 0.08 * D, 1.5 * D, 24).rotateZ(Math.PI / 2), metal(0x9ba1a8))));
    [-1, 1].forEach((sx) => { const sh = new THREE.Shape(), N = 160;
      for (let k = 0; k <= N; k++) { const psi = (k / N) * Math.PI * 2, a = 2 * (psi + Math.PI / 2) / RAD, r = rbc + (sg > 0 ? Lad(a) : Lev(a)); k ? sh.lineTo(r * Math.cos(psi), r * Math.sin(psi)) : sh.moveTo(r * Math.cos(psi), r * Math.sin(psi)); }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12 * D, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -0.06 * D); g.rotateY(-Math.PI / 2);
      const lob = C(new THREE.Mesh(g, metal(0x9ba1a8))); lob.position.x = sx * xv; lob.rotation.x = sg * th; cam.add(lob); });
    const roata = C(new THREE.Mesh(new THREE.CylinderGeometry(0.5 * D, 0.5 * D, 0.1 * D, 48).rotateZ(Math.PI / 2), metal(0xb8bec5))); roata.position.x = -0.9 * D; cam.add(roata);
    fara(cam);
  });
  // bujia (MAS, în coama acoperișului) sau injectorul (MAC, central)
  const yVarf = yApex - 0.01 * D;
  { const b = new THREE.Group(); b.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008 * D, 0.008 * D, 0.03 * D, 8), metal(0x6b6b6b)));
    const pts = mac ? [[0, 0], [0.03 * D, 0.02 * D], [0.05 * D, 0.3 * D], [0.07 * D, 0.35 * D], [0.07 * D, 1.2 * D], [0, 1.2 * D]] : [[0, 0], [0.035 * D, 0.01 * D], [0.06 * D, 0.2 * D], [0.1 * D, 0.24 * D], [0.1 * D, 0.36 * D], [0.06 * D, 0.4 * D], [0.06 * D, 1.15 * D], [0, 1.15 * D]];
    b.add(C(new THREE.Mesh(lathe(pts, 32), metal(mac ? 0x8a9199 : 0xe9e6df, { metalness: mac ? 0.7 : 0.1 }))));
    const bob = C(new THREE.Mesh(new THREE.CylinderGeometry(0.11 * D, 0.11 * D, 0.5 * D, 24), matCAE(0x26292d))); bob.position.y = 1.35 * D; b.add(bob);
    b.position.y = yVarf; fara(b); G.add(b); }

  /* ---------------- pistonul, bolțul, biela, arborele cotit */
  const rp = D / 2 * 0.993, pp = (() => { const P = []; const yt = hp;
    if (mac) { const rb = 0.33 * D, hb = vBol / (Math.PI * rb * rb) * 1.5; P.push([0, yt - hb]); for (let k = 1; k <= 10; k++) { const a = (k / 10) * Math.PI / 2; P.push([0.1 * D + (rb - 0.1 * D) * Math.sin(a), yt - hb + hb * (1 - Math.cos(a))]); } P.push([rp - 0.03 * D, yt]); }
    else P.push([0, yt], [rp - 0.03 * D, yt]);
    P.push([rp, yt - 0.02 * D]);
    [0.07, 0.12, 0.18].forEach((f) => { const y = yt - f * D; P.push([rp, y + 0.012 * D], [rp - 0.04 * D, y + 0.012 * D], [rp - 0.04 * D, y - 0.012 * D], [rp, y - 0.012 * D]); });
    P.push([rp * 0.996, -0.42 * D], [rp * 0.9, -0.42 * D], [rp * 0.9, 0.05 * D], [0.18 * D, 0.2 * D], [0, 0.2 * D]); return P; })();
  const piston = new THREE.Group(); piston.add(C(new THREE.Mesh(lathe(pp, 72), matCarcasa(0xc6cacf, { metalness: 0.45, roughness: 0.3 })), 30, 0.25));   // secționabil: camera din piston și jeturile se văd în secțiune
  [0.07, 0.12, 0.18].forEach((f, j) => { const s = new THREE.Mesh(new THREE.TorusGeometry(rp - 0.018 * D, 0.011 * D, 8, 64).rotateX(Math.PI / 2), metal(j < 2 ? 0x3a3f45 : 0x8f969d)); s.position.y = hp - f * D; piston.add(s); });
  piston.add(C(new THREE.Mesh(new THREE.CylinderGeometry(0.12 * D, 0.12 * D, 0.84 * D, 32).rotateZ(Math.PI / 2), metal(0xaab0b6))));
  [-1, 1].forEach((sx) => { const u = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * D, 0.17 * D, 0.14 * D, 24).rotateZ(Math.PI / 2), metal(0xc6cacf)); u.position.x = sx * 0.22 * D; piston.add(u); });
  fara(piston); G.add(piston);
  const biela = new THREE.Group();
  { const Rb = 0.37 * D, Rs = 0.19 * D, sh = new THREE.Shape(), ws = 0.13 * D, wb = 0.26 * D;
    sh.absarc(0, L, Rs, -0.55, Math.PI + 0.55, false); sh.lineTo(-wb / 2, Rb * 0.8); sh.absarc(0, 0, Rb, Math.PI - 0.6, Math.PI * 2 + 0.6, false); sh.lineTo(ws / 2, L - Rs * 0.85); sh.closePath();
    [[0, 0, 0.27 * D], [0, L, 0.125 * D]].forEach(([x, y, r]) => { const h = new THREE.Path(); h.absarc(x, y, r, 0, Math.PI * 2, true); sh.holes.push(h); });
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.22 * D, bevelEnabled: true, bevelThickness: 0.015 * D, bevelSize: 0.012 * D, bevelSegments: 2, curveSegments: 32 }); g.translate(0, 0, -0.11 * D); g.rotateY(Math.PI / 2);
    biela.add(C(new THREE.Mesh(g, metal(0x9fa6ad))));
    const inima = new THREE.Shape(); inima.moveTo(-0.07 * D, Rb * 1.05); inima.lineTo(0.07 * D, Rb * 1.05); inima.lineTo(0.045 * D, L - Rs * 1.2); inima.lineTo(-0.045 * D, L - Rs * 1.2); inima.closePath();
    [-1, 1].forEach((sg) => { const gi = new THREE.ExtrudeGeometry(inima, { depth: 0.04 * D, bevelEnabled: false }); gi.translate(0, 0, -0.02 * D); gi.rotateY(Math.PI / 2); const m = new THREE.Mesh(gi, metal(0x7d848b)); m.position.x = sg * 0.1 * D; biela.add(m); });
    [-1, 1].forEach((sg) => { const s = C(new THREE.Mesh(new THREE.CylinderGeometry(0.035 * D, 0.035 * D, 0.6 * D, 12), metal(0x5b6168))); s.position.set(0, -0.05 * D, sg * 0.34 * D); biela.add(s); });
    biela.add(new THREE.Mesh(new THREE.BoxGeometry(0.25 * D, 0.006 * D, 0.82 * D), metal(0x30353b))); }
  fara(biela); G.add(biela);
  const cot = new THREE.Group();
  { const sh = new THREE.Shape(); sh.absarc(0, R, 0.3 * D, -0.3, Math.PI + 0.3, false); sh.absarc(0, -0.05 * D, R * 1.2, Math.PI + 0.35, Math.PI * 2 - 0.35, false); sh.closePath();
    [-1, 1].forEach((sx) => { const g = new THREE.ExtrudeGeometry(sh, { depth: 0.15 * D, bevelEnabled: true, bevelThickness: 0.015 * D, bevelSize: 0.015 * D, bevelSegments: 2, curveSegments: 32 }); g.translate(0, 0, -0.075 * D); g.rotateY(Math.PI / 2);
      const w = C(new THREE.Mesh(g, metal(0x8f969d))); w.position.x = sx * 0.21 * D; cot.add(w);
      const f = C(new THREE.Mesh(new THREE.CylinderGeometry(0.27 * D, 0.27 * D, 0.3 * D, 40).rotateZ(Math.PI / 2), metal(0xb0b6bd))); f.position.x = sx * 0.43 * D; cot.add(f); });
    const man = C(new THREE.Mesh(new THREE.CylinderGeometry(0.25 * D, 0.25 * D, 0.3 * D, 40).rotateZ(Math.PI / 2), metal(0xb0b6bd))); man.position.y = R; cot.add(man); }
  fara(cot); G.add(cot);

  /* ---------------- gazul: volumul real dintre piston și chiulasă, colorat după temperatură */
  const NR = 10, NF = 72, PG = [], IG = [];
  const vf = (r, f, sus) => PG.push(r * Math.cos(f), sus ? 1 : 0, r * Math.sin(f));
  for (let i = 0; i <= NR; i++) for (let j = 0; j < NF; j++) vf((D / 2) * 0.995 * (i / NR), (j / NF) * Math.PI * 2, true);       // fața de sus (sub acoperiș)
  const baza = PG.length / 3; for (let j = 0; j < NF; j++) vf((D / 2) * 0.995, (j / NF) * Math.PI * 2, false);                 // inelul de jos (pe piston)
  for (let i = 0; i < NR; i++) for (let j = 0; j < NF; j++) { const a = i * NF + j, b = i * NF + ((j + 1) % NF), c = a + NF, d = b + NF; IG.push(a, c, b, b, c, d); }
  for (let j = 0; j < NF; j++) { const a = NR * NF + j, b = NR * NF + ((j + 1) % NF), c = baza + j, d = baza + ((j + 1) % NF); IG.push(a, b, c, b, d, c); }
  const fund = baza + NF; PG.push(0, 0, 0); for (let j = 0; j < NF; j++) IG.push(fund, baza + j, baza + ((j + 1) % NF));
  const gG = new THREE.BufferGeometry(); gG.setAttribute("position", new THREE.Float32BufferAttribute(PG, 3)); gG.setIndex(IG);
  const gm = new THREE.MeshStandardMaterial({ color: 0x3366ff, transparent: true, opacity: 0.6, roughness: 0.4, depthWrite: false, side: THREE.DoubleSide, emissive: 0x000000 });
  const gaz = new THREE.Mesh(gG, gm); gaz.renderOrder = 1; fara(gaz); G.add(gaz);
  const planCrown = new THREE.Plane(V3(0, 1, 0), 0);
  const flM = new THREE.MeshStandardMaterial({ color: 0xffb04a, emissive: 0xff6a00, emissiveIntensity: 1.5, transparent: true, opacity: 0.6, depthWrite: false, clippingPlanes: [planCrown] });
  const gFl = new THREE.SphereGeometry(1, 64, 40), bazaFl = Float32Array.from(gFl.attributes.position.array), zgomot = new Float32Array(gFl.attributes.position.count);
  for (let k = 0; k < zgomot.length; k++) { const x = bazaFl[3 * k], y = bazaFl[3 * k + 1], z = bazaFl[3 * k + 2];   // frontul încrețit de turbulență: sumă de armonici pe direcții
    zgomot[k] = 0.5 * Math.sin(7 * x + 3 * y) * Math.cos(6 * z - 2 * y) + 0.3 * Math.sin(13 * y + 11 * z) * Math.cos(9 * x) + 0.2 * Math.sin(23 * x - 17 * z + 5 * y); }
  let ampFl = -1; const increteste = (amp) => { if (Math.abs(amp - ampFl) < 1e-3) return; ampFl = amp; const P = gFl.attributes.position.array; for (let k = 0; k < zgomot.length; k++) { const f = 1 + amp * zgomot[k]; P[3 * k] = bazaFl[3 * k] * f; P[3 * k + 1] = bazaFl[3 * k + 1] * f; P[3 * k + 2] = bazaFl[3 * k + 2] * f; } gFl.attributes.position.needsUpdate = true; gFl.computeVertexNormals(); };
  const flacara = new THREE.Mesh(gFl, flM); fara(flacara); G.add(flacara);
  const jeturi = new THREE.Group(); G.add(jeturi);
  for (let k = 0; k < 7; k++) { const j = new THREE.Mesh(new THREE.ConeGeometry(0.05 * D, 1, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xe0a100, emissive: 0xc77800, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); j.userData.k = k; fara(j); jeturi.add(j); }
  // fluxurile prin canale: particule care se deplasează proporțional cu ridicarea supapelor
  const flux = (drumuri, cul) => { const n = 260, g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), curbe = drumuri.map((d) => new THREE.CatmullRomCurve3(d.slice().reverse())), s = Float32Array.from({ length: n }, () => Math.random());
    g.setAttribute("position", new THREE.BufferAttribute(P, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: cul, size: 0.035 * D, transparent: true, opacity: 0.9, depthWrite: false })); fara(pts); pts.frustumCulled = false; G.add(pts);
    const off = Array.from({ length: n }, () => V3((Math.random() - 0.5) * 0.18 * D, (Math.random() - 0.5) * 0.18 * D, (Math.random() - 0.5) * 0.18 * D));
    return (v, dt, intrare) => { pts.visible = v > 0.02; if (!pts.visible) return; for (let k = 0; k < n; k++) { s[k] = (s[k] + dt * v * 1.6) % 1; const c = curbe[k % curbe.length], t = intrare ? s[k] : 1 - s[k], q = c.getPoint(t); P[3 * k] = q.x + off[k].x; P[3 * k + 1] = q.y + off[k].y; P[3 * k + 2] = q.z + off[k].z; } g.attributes.position.needsUpdate = true; }; };
  const fluxA = flux(drumA, 0x3aa0ff), fluxE = flux(drumE, 0xff8a3a);
  const col = new THREE.Color(); let tP = 0;

  return {
    G, yHead: yDeck,
    /** opt (opțional, modulul F): { rf – raza frontului calculată, zbarcire – amplitudinea încrețirii, tFl – culoarea gazelor arse (0…1), jet: { S, teta } } */
    pozeaza(alfa, T, xb, dxb, Tmin, Tmax, injectie, culoare, opt = {}) {
      const a = alfa * RAD, yA = R * Math.cos(a), zA = R * Math.sin(a), yBolt = yA + Math.sqrt(L * L - zA * zA);
      piston.position.y = yBolt; cot.rotation.x = a;
      const dir = V3(0, yBolt - yA, -zA); biela.position.set(0, yA, zA); biela.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
      // supapele și arborii cu came (la jumătate din turație)
      const la = Lad(alfa), le = Lev(alfa); supape.forEach((q) => { const l = q.adm ? la : le; q.sv.position.y = -l; q.arc.scale.y = q.hA - l; });
      camA.rotation.x = camE.rotation.x = (alfa / 2) * RAD;
      // gazul: fața de jos pe piston, fața de sus sub acoperiș; culoarea după temperatură
      const yCr = yBolt + hp, p = gG.attributes.position;
      for (let k = 0; k < baza; k++) p.setY(k, yRoof(p.getZ(k)) - 0.002 * D);
      for (let k = baza; k <= fund; k++) p.setY(k, yCr + 0.002 * D);
      p.needsUpdate = true; gG.computeVertexNormals();
      culoare(Math.max(0, Math.min(1, (T - Tmin) / (Tmax - Tmin))), col); gm.color.copy(col); gm.emissive.copy(col).multiplyScalar(0.35);
      planCrown.constant = -yCr;
      // frontul flăcării: volumul ars ≈ x_b·V (sferă din bujie, limitată de alezaj); la MAC: jeturile și flacăra difuzivă în camera din piston
      const V = Ap * (yDeck - yCr) + Vc - vBol, rf = Math.cbrt(Math.max(0, Math.min(1, xb)) * V * 3 / (2 * Math.PI));
      flacara.visible = xb > 0.002 && xb < 0.995; const rr = Math.min(rf, D / 2 * 0.99);
      if (opt.rf != null) { const r_ = Math.min(opt.rf, 1.5 * D); flacara.visible = opt.rf > 0 && (xb < 0.995); flacara.scale.set(r_, r_, r_); flacara.position.y = yVarf; increteste(opt.zbarcire || 0);
        if (opt.tFl != null) { culoare(opt.tFl, col); flM.color.copy(col); flM.emissive.copy(col); } }
      else if (mac) { flacara.scale.set(rr, Math.min(rf, (yApex - yCr) + 0.25 * D), rr); flacara.position.y = yCr + 0.02 * D; increteste(mac ? 0.12 : 0); }
      else { flacara.scale.set(rr, rr * 0.9, rr); flacara.position.y = yVarf; }
      flM.emissiveIntensity = 0.6 + 8 * Math.min(1, dxb * 20); flM.opacity = 0.35 + 0.4 * Math.min(1, dxb * 30);
      jeturi.visible = !!injectie && mac;
      if (opt.jet) jeturi.visible = opt.jet.S > 0;
      jeturi.children.forEach((j) => { const u = (j.userData.k / 7) * Math.PI * 2, ln = opt.jet ? opt.jet.S : D * 0.38 * (injectie || 0), d = V3(Math.cos(u), -0.5, Math.sin(u)).normalize(), lat = opt.jet ? Math.max(0.2, (ln * Math.tan((opt.jet.teta * RAD) / 2)) / (0.05 * D)) : 1; j.scale.set(lat, Math.max(1e-3, ln), lat); j.quaternion.setFromUnitVectors(V3(0, 1, 0), d.clone().negate()); j.position.set(0, yVarf, 0).addScaledVector(d, ln / 2); });
      // fluxurile: admisia în timpul ridicării supapelor de admisie, evacuarea la ridicarea celor de evacuare
      const dt = Math.min(0.1, Math.abs(alfa - tP) / 360 + 0.004); tP = alfa;
      fluxA(la / Lmax, dt, true); fluxE(le / Lmax, dt, false);
    }
  };
}
