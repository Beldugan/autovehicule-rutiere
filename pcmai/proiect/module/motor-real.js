/* Macheta realistă a motorului proiectat, construită din dimensiunile calculate (D, S, L, ε, i, distribuția):
   arbore cotit cu fusuri racordate, brațe cu contragreutăți și găuri de ungere, fulie poly-V, pinion de distribuție și volant cu
   coroană dințată evolventică; biele cu secțiune în dublu T, capac, șuruburi, cuzineți; pistoane cu canale de segmenți, segmenți,
   bolț și umeri (cameră în piston la MAC); bloc cu cămășile de apă, pereți transversali și capace de palier, baie de ulei;
   chiulasă cu supape (talere, tije, arcuri, talere de arc) acționate de doi arbori cu came ale căror profile sunt generate din
   fazele distribuției proiectului, curea de distribuție, galerii de admisie și evacuare, bujii sau injectoare.
   Sistemul de coordonate: x – axa arborelui cotit, y – axa cilindrilor (în sus), z – transversal (+z admisie, −z evacuare). */
import { THREE, V3, sageata, turboColor, CAE, matCAE, matCarcasa, contur } from "./scena.js";
import { roata, fulie } from "./angrenaj.js";

const ax = (g) => { g.rotateZ(Math.PI / 2); return g; };
const lathe = (pts, seg = 64) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg); return g; };
const latheX = (pts, seg = 64) => ax(lathe(pts, seg));
/** profil de fus cu racordări la capete (r, lungime, raza racordării) – pentru lathe pe axa X */
const profilFus = (r, l, rr, n = 5) => { const P = [[0, -l / 2]]; for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI / 2; P.push([r - rr + rr * Math.sin(a), -l / 2 + rr - rr * Math.cos(a)]); }
  for (let k = n; k >= 0; k--) { const a = (k / n) * Math.PI / 2; P.push([r - rr + rr * Math.sin(a), l / 2 - rr + rr * Math.cos(a)]); } P.push([0, l / 2]); return P; };
/** forma 2D → extrudată și așezată în planul (z, y), grosimea pe X */
function extrudZY(sh, t, bev = 0.15) {
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: bev > 0, bevelThickness: t * bev, bevelSize: t * bev * 0.8, bevelSegments: 2, curveSegments: 28 });
  g.translate(0, 0, -t / 2); g.rotateY(-Math.PI / 2); return g;
}
const lift = (phi, dur, L) => (phi >= 0 && phi <= dur ? L * Math.pow(Math.sin((Math.PI * phi) / dur), 2) : 0);
const mod = (a, p) => ((a % p) + p) % p;

export function motorReal(o) {
  const G = new THREE.Group(), D = o.D, R = o.S / 2, L = o.L, i = o.i, e = o.e || 0, mac = o.tip === "MAC", doiT = o.tau === 2;
  const pas = Math.max(1.14 * D, D + 0.008), x0 = -((i - 1) * pas) / 2, xs = Array.from({ length: i }, (_, k) => x0 + k * pas);
  const dist = o.dist || { dsa: 10, isa: 45, dse: 45, ise: 10 }, dec = o.dec || xs.map(() => 0);
  const rj = 0.29 * D, rp = 0.255 * D, lj = 0.21 * D, tw = 0.17 * D, hpC = 0.42 * D, hc = o.S / (o.eps - 1);
  const yDeck = R + L + hpC + hc, mC = matCarcasa(), mA = matCAE(CAE.arbore), mP = matCAE(CAE.piston), mB = matCAE(CAE.biela), mL = matCAE(CAE.lagar, { metalness: 0.45, roughness: 0.3 });
  const mOtel = matCAE(0xb7bec6, { metalness: 0.75, roughness: 0.28 }), mInchis = matCAE(0x30353b, { metalness: 0.4 }), mSup = matCAE(0x8a6fd0, { metalness: 0.5 }), mArc = matCAE(0x4f86c6, { metalness: 0.6 });
  const C = (m) => contur(m, 32, 0.32);

  /* ---------------- arborele cotit */
  const ac = new THREE.Group(); G.add(ac);
  const xF = xs[0] - pas * 0.5 - lj * 0.5, xR = xs[i - 1] + pas * 0.5 + lj * 0.5;
  const gFus = latheX(profilFus(rj, lj, 0.03 * D)), gPin = latheX(profilFus(rp, 0.54 * D - 2 * tw * 0.05, 0.025 * D));
  const xl = [xs[0] - pas / 2]; for (let k = 0; k < i - 1; k++) xl.push(xs[k] + pas / 2); xl.push(xs[i - 1] + pas / 2);
  xl.forEach((x) => { const f = C(new THREE.Mesh(gFus, mA)); f.position.x = x; f.castShadow = true; ac.add(f);
    const h = new THREE.Mesh(ax(new THREE.CylinderGeometry(0.035 * D, 0.035 * D, 0.01, 12)), mInchis); h.rotation.z = 0; h.position.set(x, rj, 0); h.rotation.x = Math.PI / 2; ac.add(h); });
  const gBrat = (() => { const rw = rp * 1.42, Rc = R * 1.12, sh = new THREE.Shape();
    sh.absarc(0, R, rw, -0.15, Math.PI + 0.15, false); sh.lineTo(-rj * 1.15, 0.05 * D); sh.absarc(0, 0, Rc, Math.PI + 0.25, Math.PI * 2 - 0.25, false); sh.lineTo(rj * 1.15, 0.05 * D); sh.closePath();
    return extrudZY(sh, tw, 0.18); })();
  xs.forEach((x, k) => {
    const th = (o.man[k] * Math.PI) / 180, br = new THREE.Group(); br.rotation.x = -th; br.position.x = x; ac.add(br);
    [-1, 1].forEach((sg) => { const w = C(new THREE.Mesh(gBrat, mA)); w.position.x = sg * (0.27 * D + tw / 2); w.castShadow = true; br.add(w);
      // gaura de echilibrare în contragreutate
      const g = new THREE.Mesh(ax(new THREE.CylinderGeometry(0.06 * D, 0.06 * D, tw * 1.02, 16)), mInchis); g.position.set(sg * (0.27 * D + tw / 2), -R * 0.72, R * 0.35 * sg); br.add(g); });
    const pin = C(new THREE.Mesh(gPin, mA)); pin.position.set(0, R, 0); br.add(pin);
    const gu = new THREE.Mesh(ax(new THREE.CylinderGeometry(0.03 * D, 0.03 * D, 0.01, 12)), mInchis); gu.position.set(0, R + rp, 0); gu.rotation.x = Math.PI / 2; br.add(gu);
  });
  // capătul din față: trepte, pinionul distribuției, fulia poly-V; spate: flanșa și volantul cu coroana
  const nas = C(new THREE.Mesh(latheX([[0, 0], [rj * 0.95, 0], [rj * 0.95, 0.12 * D], [rj * 0.75, 0.12 * D], [rj * 0.75, 0.52 * D], [rj * 0.6, 0.52 * D], [rj * 0.6, 0.85 * D], [0, 0.85 * D]]), mA)); nas.rotation.z = Math.PI; nas.position.x = xF - lj / 2 + 0.0; ac.add(nas);
  const mPin = matCAE(0xb8c0c8, { metalness: 0.7, roughness: 0.3 });
  const zPin = 21, mPinion = (2 * rj * 1.0) / zPin; const pinD = C(new THREE.Mesh(roata(zPin, mPinion, { b: 0.11 * D, butuc: rj * 0.75 }), mPin)); pinD.position.x = xF - lj / 2 - 0.3 * D; ac.add(pinD);
  const rFul = 0.68 * D, ful = C(new THREE.Mesh(fulie(rFul, 0.2 * D, 6), mA)); ful.position.x = xF - lj / 2 - 0.68 * D; ac.add(ful);
  const fl = C(new THREE.Mesh(latheX([[0, 0], [rj * 1.5, 0], [rj * 1.5, 0.1 * D], [0, 0.1 * D]]), mA)); fl.position.x = xR + lj / 2; ac.add(fl);
  const rV = Math.max(1.32 * R + rj * 2, 1.45 * D), mV = 0.003 * (D / 0.08), zV = Math.round((2 * rV) / mV);
  const volant = C(new THREE.Mesh(latheX([[rj * 0.6, 0], [rV * 0.98, 0], [rV * 0.98, 0.16 * D], [rV * 0.6, 0.16 * D], [rV * 0.55, 0.07 * D], [rj * 1.5, 0.07 * D], [rj * 1.5, 0.2 * D], [rj * 0.6, 0.2 * D]]), mA));
  volant.position.x = xR + lj / 2 + 0.1 * D; volant.castShadow = true; ac.add(volant);
  const coroana = C(new THREE.Mesh(roata(zV, mV, { b: 0.1 * D, butuc: rV * 0.975 }), mOtel)); coroana.position.x = volant.position.x + 0.08 * D; ac.add(coroana);
  // cuzineții paliери (galben, ficși)
  xl.forEach((x) => { const s = new THREE.Mesh(ax(new THREE.CylinderGeometry(rj * 1.07, rj * 1.07, lj * 0.92, 40, 1, true)), mL); s.material.side = THREE.DoubleSide; s.position.x = x; G.add(s); });

  /* ---------------- bielele (dublu T, capac, șuruburi, cuzineți) */
  const Rb = rp * 1.42, Rs = 0.19 * D, tb = 0.22 * D;
  const formaBiela = (cuGol) => { const sh = new THREE.Shape(), ws = 0.13 * D, wb = 0.24 * D;
    sh.absarc(0, L, Rs, -0.55, Math.PI + 0.55, false); sh.lineTo(-wb / 2, Rb * 0.78); sh.absarc(0, 0, Rb, Math.PI - 0.6, Math.PI * 2 + 0.6, false); sh.lineTo(ws / 2, L - Rs * 0.85); sh.closePath();
    const h1 = new THREE.Path(); h1.absarc(0, 0, rp * 1.06, 0, Math.PI * 2, true); sh.holes.push(h1);
    const h2 = new THREE.Path(); h2.absarc(0, L, 0.125 * D, 0, Math.PI * 2, true); sh.holes.push(h2);
    if (cuGol) { const g = new THREE.Path(), a = Rb * 1.05, b = L - Rs * 1.25, w1 = 0.07 * D, w2 = 0.045 * D; g.moveTo(-w1, a); g.lineTo(w1, a); g.lineTo(w2, b); g.lineTo(-w2, b); g.closePath(); sh.holes.push(g); }
    return sh; };
  const gRama = extrudZY(formaBiela(true), tb, 0.12), gInima = (() => { const sh = new THREE.Shape(), a = Rb * 1.0, b = L - Rs * 1.2, w1 = 0.075 * D, w2 = 0.05 * D; sh.moveTo(-w1, a); sh.lineTo(w1, a); sh.lineTo(w2, b); sh.lineTo(-w2, b); sh.closePath(); return extrudZY(sh, tb * 0.36, 0); })();
  const gSurub = new THREE.CylinderGeometry(0.035 * D, 0.035 * D, Rb * 1.5, 12), gCap = new THREE.CylinderGeometry(0.06 * D, 0.06 * D, 0.06 * D, 6);
  const biele = [], pistoane = [], gaze = [];
  /* ---------------- pistoanele (profil de revoluție cu canale, cameră la MAC) */
  const yt = hpC, yb = -0.45 * D, rP = D / 2 * 0.992, g1 = 0.022 * D, gd = 0.04 * D;
  const prof = (() => { const P = [];
    if (mac) { P.push([0, yt - 0.17 * D]); for (let k = 1; k <= 8; k++) { const a = (k / 8) * Math.PI / 2; P.push([0.12 * D + 0.18 * D * Math.sin(a), yt - 0.17 * D + 0.17 * D * (1 - Math.cos(a))]); } P.push([rP - 0.03 * D, yt]); }
    else { P.push([0, yt + 0.02 * D], [0.25 * D, yt + 0.012 * D], [rP - 0.03 * D, yt]); }
    P.push([rP, yt - 0.02 * D]);
    [0.07, 0.13, 0.2].forEach((f) => { const y0 = yt - f * D; P.push([rP, y0 + g1 / 2], [rP - gd, y0 + g1 / 2], [rP - gd, y0 - g1 / 2], [rP, y0 - g1 / 2]); });
    P.push([rP * 0.995, yb], [rP * 0.9, yb], [rP * 0.9, 0.05 * D], [0.2 * D, 0.2 * D], [0, 0.2 * D]); return P; })();
  const gPiston = lathe(prof, 72), gSeg = new THREE.TorusGeometry(rP - gd * 0.45, g1 * 0.42, 6, 64);
  xs.forEach((x) => {
    const b = new THREE.Group();
    const rama = C(new THREE.Mesh(gRama, mB)); rama.castShadow = true; b.add(rama); b.add(C(new THREE.Mesh(gInima, mB)));
    const cuz = new THREE.Mesh(ax(new THREE.CylinderGeometry(rp * 1.06, rp * 1.06, tb * 0.9, 32, 1, true)), mL); cuz.material = mL.clone(); cuz.material.side = THREE.DoubleSide; b.add(cuz);
    const buc = new THREE.Mesh(ax(new THREE.CylinderGeometry(0.125 * D, 0.125 * D, tb * 0.9, 24, 1, true)), cuz.material); buc.position.y = L; b.add(buc);
    const sep = new THREE.Mesh(new THREE.BoxGeometry(tb * 1.02, 0.006 * D, Rb * 2.05), mInchis); b.add(sep);
    [-1, 1].forEach((sg) => { const s = C(new THREE.Mesh(gSurub, mOtel)); s.position.set(0, -Rb * 0.15, sg * rp * 1.26); b.add(s); const cp = C(new THREE.Mesh(gCap, mOtel)); cp.position.set(0, -Rb * 0.92, sg * rp * 1.26); b.add(cp); });
    b.position.x = x; G.add(b); biele.push(b);
    const p = new THREE.Group(), cp = C(new THREE.Mesh(gPiston, mP)); cp.castShadow = true; p.add(cp);
    [0.07, 0.13, 0.2].forEach((f, j) => { const s = new THREE.Mesh(gSeg, j < 2 ? mInchis : mOtel); s.rotation.x = Math.PI / 2; s.position.y = yt - f * D; p.add(s); });
    const bolt = C(new THREE.Mesh(ax(new THREE.CylinderGeometry(0.12 * D, 0.12 * D, D * 0.84, 24)), mOtel)); p.add(bolt);
    [-1, 1].forEach((sg) => { const u = new THREE.Mesh(ax(new THREE.CylinderGeometry(0.17 * D, 0.17 * D, 0.13 * D, 24)), mP); u.position.x = sg * 0.2 * D; p.add(u); });
    p.position.set(x, R + L, e); G.add(p); pistoane.push(p);
    const gm = new THREE.MeshStandardMaterial({ color: 0x3366ff, transparent: true, opacity: 0.72, roughness: 0.4, depthWrite: false, emissive: 0x112244, emissiveIntensity: 0.5 });
    const gz = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 * 0.985, D / 2 * 0.985, 1, 48), gm); gz.position.set(x, 0, e); gz.scale.y = 1e-3; gz.userData.faraCadru = true; G.add(gz); gaze.push(gz);
  });

  /* ---------------- blocul motor: cămășile cilindrilor, cămașa de apă, peretele exterior, puntea, pereții transversali, capacele de palier */
  const Lb = i * pas + 0.32 * D, Wb = 1.62 * D, yCam = R + L - 0.5 * D, ySep = -0.08 * D, yPunte = yDeck;
  const ext = (sh, y0, y1) => { const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 48 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g; };
  const drept = (w, d, r = 0) => { const s = new THREE.Shape(); if (!r) { s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.closePath(); return s; }
    s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2); return s; };
  const gaura = (sh, w, d, r) => { const s = drept(w, d, r), h = new THREE.Path(s.getPoints(8).reverse()); sh.holes.push(h); };
  // peretele exterior al zonei cilindrilor (cu cămașa de apă în interior)
  { const sh = drept(Lb, Wb, 0.08 * D); gaura(sh, Lb - 0.16 * D, Wb - 0.16 * D, 0.06 * D); G.add(C(new THREE.Mesh(ext(sh, yCam, yPunte - 0.06 * D), mC))); }
  // cămășile (siameze) – inele în jurul alezajelor
  xs.forEach((x) => { const sh = new THREE.Shape(); sh.absarc(x, e, D / 2 + 0.07 * D, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(x, e, D / 2 * 1.003, 0, Math.PI * 2, true); sh.holes.push(h);
    const m = C(new THREE.Mesh(ext(sh, yCam - 0.1 * D, yPunte), mC)); G.add(m); });
  // puntea superioară cu alezajele, găurile șuruburilor de chiulasă și canalele de apă
  { const sh = drept(Lb, Wb, 0.08 * D); xs.forEach((x) => { const h = new THREE.Path(); h.absarc(x, e, D / 2 * 1.003, 0, Math.PI * 2, true); sh.holes.push(h); });
    for (let k = 0; k <= i; k++) [-1, 1].forEach((sg) => { const h = new THREE.Path(); h.absarc(x0 - pas / 2 + k * pas, sg * (D / 2 + 0.17 * D), 0.045 * D, 0, Math.PI * 2, true); sh.holes.push(h); });
    xs.forEach((x) => [-1, 1].forEach((sg) => { const h = new THREE.Path(); h.absarc(x + pas * 0.28, sg * (D / 2 + 0.115 * D), 0.03 * D, 0, Math.PI * 2, true); sh.holes.push(h); }));
    G.add(C(new THREE.Mesh(ext(sh, yPunte - 0.06 * D, yPunte), mC))); }
  // carterul superior (fusta blocului) până sub axa arborelui
  { const sh = drept(Lb, Wb * 1.08, 0.06 * D); gaura(sh, Lb - 0.14 * D, Wb * 1.08 - 0.14 * D, 0.04 * D); G.add(C(new THREE.Mesh(ext(sh, ySep - 0.35 * D, yCam), mC))); }
  // pereții transversali cu locașurile lagărelor paliere și capacele cu șuruburi
  xl.forEach((x) => {
    const sh = new THREE.Shape(), w = Wb * 0.98; sh.moveTo(-w / 2, ySep); sh.lineTo(-rj * 1.1, ySep); sh.absarc(0, 0, rj * 1.1, Math.PI + Math.asin(ySep / (rj * 1.1)) * -1, -Math.asin(ySep / (rj * 1.1)), true);
    sh.lineTo(w / 2, ySep); sh.lineTo(w / 2, yCam); sh.lineTo(-w / 2, yCam); sh.closePath();
    const pw = C(new THREE.Mesh(extrudZY(sh, lj * 0.9, 0), mC)); pw.position.x = x; G.add(pw);
    const cs = new THREE.Shape(), wc = rj * 3.2; cs.moveTo(-wc / 2, ySep); cs.lineTo(-rj * 1.1, ySep); cs.absarc(0, 0, rj * 1.1, Math.PI - Math.asin(-ySep / (rj * 1.1)), Math.asin(-ySep / (rj * 1.1)) + 0, false);
    cs.lineTo(wc / 2, ySep); cs.lineTo(wc / 2, -rj * 1.45); cs.quadraticCurveTo(0, -rj * 2.1, -wc / 2, -rj * 1.45); cs.closePath();
    const cap = C(new THREE.Mesh(extrudZY(cs, lj * 0.9, 0.05), mC)); cap.position.x = x; G.add(cap);
    [-1, 1].forEach((sg) => { const s = C(new THREE.Mesh(new THREE.CylinderGeometry(0.045 * D, 0.045 * D, 0.5 * D, 12), mOtel)); s.position.set(x, -rj * 1.2, sg * rj * 1.35); G.add(s);
      const cp = C(new THREE.Mesh(new THREE.CylinderGeometry(0.075 * D, 0.075 * D, 0.07 * D, 6), mOtel)); cp.position.set(x, -rj * 1.55 - 0.1 * D, sg * rj * 1.35); G.add(cp); });
  });
  // baia de ulei cu bazinul și sorbul pompei
  { const yJ = ySep - 0.35 * D, yF = -R * 1.25 - 0.7 * D, sh = drept(Lb * 0.98, Wb * 1.06, 0.1 * D); gaura(sh, Lb * 0.98 - 0.06 * D, Wb * 1.06 - 0.06 * D, 0.07 * D);
    G.add(C(new THREE.Mesh(ext(sh, yF + 0.04 * D, yJ), mC)));
    const fund = C(new THREE.Mesh(new THREE.BoxGeometry(Lb * 0.98, 0.04 * D, Wb * 1.06), mC)); fund.position.y = yF + 0.02 * D; G.add(fund);
    const ul = new THREE.Mesh(new THREE.BoxGeometry(Lb * 0.94, 0.25 * D, Wb * 1.0), new THREE.MeshStandardMaterial({ color: 0xd99a2b, transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false })); ul.position.y = yF + 0.165 * D; ul.userData.faraCadru = true; G.add(ul);
    const sorb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x0, ySep - 0.1 * D, Wb * 0.3), V3(x0 + pas * 0.3, yF + 0.6 * D, Wb * 0.3), V3(x0 + pas * 0.5, yF + 0.12 * D, 0.1 * D)]), 24, 0.05 * D, 10), mOtel); G.add(sorb); }

  /* ---------------- chiulasa, supapele, arborii cu came, distribuția */
  const hCh = 0.62 * D, yCh = yPunte;
  { const sh = drept(Lb, Wb * 1.04, 0.05 * D); xs.forEach((x) => [-1, 1].forEach((sg) => [-1, 1].forEach((sx) => { const h = new THREE.Path(); h.absarc(x + sx * 0.2 * D, sg * 0.2 * D, (sg > 0 ? 0.17 : 0.145) * D, 0, Math.PI * 2, true); sh.holes.push(h); })));
    G.add(C(new THREE.Mesh(ext(sh, yCh, yCh + 0.12 * D), mC))); }
  { const sh = drept(Lb, Wb * 1.04, 0.05 * D); gaura(sh, Lb - 0.12 * D, Wb * 1.04 - 0.12 * D, 0.04 * D); G.add(C(new THREE.Mesh(ext(sh, yCh + 0.12 * D, yCh + hCh), mC))); }
  const ycam = yCh + hCh + 0.12 * D, rbc = 0.13 * D, Lmax = Math.min(0.12 * D, 0.012), zv = 0.2 * D;
  const capac = C(new THREE.Mesh(new THREE.BoxGeometry(Lb * 0.97, 0.06 * D, Wb * 0.95), mC)); capac.position.y = ycam + 0.42 * D; G.add(capac);
  const capacL = (() => { const sh = drept(Lb * 0.97, Wb * 0.95, 0.12 * D); gaura(sh, Lb * 0.97 - 0.08 * D, Wb * 0.95 - 0.08 * D, 0.1 * D); return C(new THREE.Mesh(ext(sh, yCh + hCh, ycam + 0.39 * D), mC)); })(); G.add(capacL);
  const durA = 180 + dist.isa + dist.dsa, durE = 180 + dist.dse + dist.ise;
  const camA = new THREE.Group(), camE = new THREE.Group(); camA.position.set(0, ycam, zv); camE.position.set(0, ycam, -zv); G.add(camA, camE);
  const arbCam = latheX([[0, -Lb / 2 - 0.25 * D], [0.075 * D, -Lb / 2 - 0.25 * D], [0.075 * D, Lb / 2], [0, Lb / 2]], 24);
  [camA, camE].forEach((c) => c.add(C(new THREE.Mesh(arbCam, mOtel))));
  const supape = [];
  const lobGeom = (offs, adm) => { const sh = new THREE.Shape(), N = 120;
    for (let k = 0; k <= N; k++) { const psi = (k / N) * Math.PI * 2, al = 2 * (psi - Math.PI / 2) * 180 / Math.PI - offs;
      const L_ = adm ? lift(mod(al + dist.dsa, 720), durA, Lmax) : lift(mod(al - (540 - dist.dse), 720), durE, Lmax), r = rbc + L_;
      k ? sh.lineTo(r * Math.cos(psi), r * Math.sin(psi)) : sh.moveTo(r * Math.cos(psi), r * Math.sin(psi)); }
    return extrudZY(sh, 0.1 * D, 0.06); };
  const gTija = new THREE.CylinderGeometry(0.028 * D, 0.028 * D, 1, 12), gArc = (() => { const P = []; for (let k = 0; k <= 160; k++) { const a = (k / 160) * Math.PI * 2 * 6; P.push(V3(0.1 * D * Math.cos(a), (k / 160), 0.1 * D * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 320, 0.013 * D, 6); })();
  if (!doiT) xs.forEach((x, k) => {
    [true, false].forEach((adm) => [-1, 1].forEach((sx) => {
      const c = adm ? camA : camE, lob = C(new THREE.Mesh(lobGeom(dec[k], adm), mOtel)); lob.position.x = x + sx * 0.2 * D; c.add(lob);
      const sv = new THREE.Group(), zz = adm ? zv : -zv, rT = (adm ? 0.165 : 0.14) * D;
      const taler = C(new THREE.Mesh(lathe([[0, 0], [rT, 0], [rT, 0.025 * D], [0.045 * D, 0.09 * D], [0.028 * D, 0.13 * D], [0, 0.13 * D]], 40), mSup)); sv.add(taler);
      const yTop = ycam - rbc - yCh, tija = new THREE.Mesh(gTija, mSup); tija.scale.y = yTop - 0.13 * D; tija.position.y = 0.13 * D + (yTop - 0.13 * D) / 2; sv.add(tija);
      const tl = C(new THREE.Mesh(lathe([[0.03 * D, 0], [0.12 * D, 0], [0.12 * D, 0.025 * D], [0.03 * D, 0.03 * D]], 24), mOtel)); tl.position.y = yTop - 0.12 * D; sv.add(tl);
      const tachet = C(new THREE.Mesh(new THREE.CylinderGeometry(0.11 * D, 0.11 * D, 0.1 * D, 24), mOtel)); tachet.position.y = yTop - 0.05 * D; sv.add(tachet);
      const arc = new THREE.Mesh(gArc, mArc); arc.position.y = yCh + 0.13 * D; const yArc0 = yCh + 0.13 * D, hArc = yTop + yCh - 0.12 * D - yArc0; arc.scale.y = hArc; G.add(arc); arc.position.set(x + sx * 0.2 * D, yArc0, zz);
      sv.position.set(x + sx * 0.2 * D, yCh, zz); G.add(sv); supape.push({ sv, arc, adm, k, hArc, yArc0, tl, yTop });
    }));
    // bujia (MAS) sau injectorul (MAC)
    const bj = C(new THREE.Mesh(lathe(mac ? [[0, -0.05 * D], [0.05 * D, 0], [0.07 * D, 0.5 * D], [0.1 * D, 0.55 * D], [0.1 * D, 0.95 * D], [0, 0.95 * D]] : [[0, -0.03 * D], [0.04 * D, 0], [0.07 * D, 0.2 * D], [0.11 * D, 0.25 * D], [0.11 * D, 0.4 * D], [0.07 * D, 0.45 * D], [0.07 * D, 0.95 * D], [0, 0.95 * D]], 24), matCAE(mac ? 0x7f8790 : 0xf2f2f2))); bj.position.set(x, yCh, 0); G.add(bj);
  });
  // roțile arborilor cu came, roata de pe arborele cotit și cureaua de distribuție
  const xD = xF - lj / 2 - 0.3 * D, rCam = 2 * rj * 1.0;
  if (!doiT) [camA, camE].forEach((c) => { const r = C(new THREE.Mesh(fulie(rCam, 0.11 * D, 0, 2 * zPin), mPin)); r.position.x = xD; c.add(r); });
  if (!doiT) { const pts = [], add = (cx, cy, cz, r, a0, a1, n = 18) => { for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; pts.push(V3(xD, cy + r * Math.sin(a), cz + r * Math.cos(a))); } };
    add(0, ycam, zv, rCam + 0.005, Math.PI * 0.5, -Math.PI * 0.05); add(0, 0, 0, rj + 0.006, Math.PI * 0.1, -Math.PI * 1.1); add(0, ycam, -zv, rCam + 0.005, Math.PI * 1.05, Math.PI * 0.5);
    const cur = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, 0.012 * D, 6, true), matCAE(0x1d2024)); cur.scale.set(1, 1, 1); G.add(cur); }
  // galeria de admisie (+z) și de evacuare (−z)
  const mAdm = matCarcasa(0x3b82f6, { roughness: 0.5 }), mEv = matCarcasa(0xc8382c, { roughness: 0.45, metalness: 0.4 });
  xs.forEach((x) => {
    G.add(C(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, yCh + 0.35 * D, Wb * 0.52), V3(x, yCh + 0.45 * D, Wb * 0.95), V3(x, yCh + 1.0 * D, Wb * 1.15), V3(x * 0.6, yCh + 1.6 * D, Wb * 0.95)]), 32, 0.16 * D, 16), mAdm)));
    G.add(C(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, yCh + 0.3 * D, -Wb * 0.52), V3(x, yCh + 0.25 * D, -Wb * 0.85), V3(x * 0.55, yCh - 0.2 * D, -Wb * 1.0), V3(x * 0.15, yCh - 0.9 * D, -Wb * 1.0)]), 32, 0.13 * D, 14), mEv)));
  });
  const plenum = C(new THREE.Mesh(ax(new THREE.CylinderGeometry(0.42 * D, 0.42 * D, Lb * 0.75, 32)), mAdm)); plenum.position.set(0, yCh + 1.75 * D, Wb * 0.85); G.add(plenum);
  const colector = C(new THREE.Mesh(new THREE.CylinderGeometry(0.2 * D, 0.2 * D, 0.8 * D, 24), mEv)); colector.position.set(0, yCh - 1.25 * D, -Wb * 1.0); G.add(colector);

  /* ---------------- săgețile forțelor pe cilindrul 1 */
  const s = { Fg: sageata(0xd61f1f, 0.045 * D), N: sageata(0x15803d, 0.045 * D), S: sageata(0x7c3aed, 0.045 * D), T: sageata(0x1d4ed8, 0.045 * D), Z: sageata(0x111827, 0.045 * D) };
  Object.values(s).forEach((a) => G.add(a));

  function pozeaza(alfa, stari, f, sc, pMin, pMax) {
    ac.rotation.x = (alfa * Math.PI) / 180;
    xs.forEach((x, k) => {
      const st = stari[k], a = ((alfa - o.man[k]) * Math.PI) / 180, A = V3(x, R * Math.cos(a), R * Math.sin(a)), yB = st.yB;
      pistoane[k].position.set(x, yB, e);
      const b = biele[k], dir = V3(0, yB - A.y, e - A.z);
      b.position.copy(A); b.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
      const top = yB + yt, h = Math.max(0.0005, yDeck - top), gz = gaze[k]; gz.scale.y = h; gz.position.y = top + h / 2;
      turboColor(Math.max(0, Math.min(1, (st.p - pMin) / (pMax - pMin))), gz.material.color);
    });
    // distribuția: arborii cu came la jumătate din turație, supapele după fazele proiectului
    camA.rotation.x = camE.rotation.x = (alfa / 2) * Math.PI / 180;
    supape.forEach((q) => { const ak = mod(alfa - dec[q.k], 720), Lv = q.adm ? lift(mod(ak + dist.dsa, 720), durA, Lmax) : lift(mod(ak - (540 - dist.dse), 720), durE, Lmax);
      q.sv.position.y = yCh - Lv; q.arc.scale.y = q.hArc - Lv; });
    if (f) {
      const x = xs[0], a = (alfa * Math.PI) / 180, A = V3(x, R * Math.cos(a), R * Math.sin(a)), yB = stari[0].yB;
      s.Fg.seteaza(V3(x, yB + yt + Math.abs(f.Fg) * sc, e), V3(0, -1, 0), Math.abs(f.Fg) * sc * Math.sign(f.Fg));
      s.N.seteaza(V3(x, yB - 0.1 * D, e + Math.sign(-f.N || 1) * D * 0.52), V3(0, 0, 1), f.N * sc);
      const u = V3(0, yB - A.y, e - A.z).normalize(); s.S.seteaza(V3(x + D * 0.32, (A.y + yB) / 2, (A.z + e) / 2), u, -f.S * sc);
      const t = V3(0, -Math.sin(a), Math.cos(a)), r = V3(0, -Math.cos(a), -Math.sin(a));
      s.T.seteaza(A.clone().add(V3(-D * 0.36, 0, 0)), t, f.T * sc); s.Z.seteaza(A.clone().add(V3(-D * 0.36, 0, 0)), r, f.Z * sc);
    }
  }
  return { G, pozeaza, sageti: s, xs, yHead: yDeck, pas, supape };
}
