/* Macheta realistă a motorului proiectat, construită din dimensiunile calculate (D, S, L, ε, i, distribuția):
   arbore cotit cu fusuri racordate, brațe cu contragreutăți și găuri de ungere, fulie poly-V, pinion de distribuție și volant cu
   coroană dințată evolventică; biele cu secțiune în dublu T, capac, șuruburi, cuzineți; pistoane cu canale de segmenți, segmenți,
   bolț și umeri (cameră în piston la MAC); bloc cu cămășile de apă, pereți transversali și capace de palier, baie de ulei;
   chiulasă cu supape (talere, tije, arcuri, talere de arc) acționate de doi arbori cu came ale căror profile sunt generate din
   fazele distribuției proiectului, curea de distribuție, galerii de admisie și evacuare, bujii sau injectoare.
   Sistemul de coordonate: x – axa arborelui cotit, y – axa cilindrilor (în sus), z – transversal (+z admisie, −z evacuare). */
import { THREE, V3, sageata, turboColor, CAE, matCAE, matCarcasa, contur } from "./scena.js";
import { roata } from "./angrenaj.js";
import { traseuCurea, banda, dintiCurea, roataDintata, rola, fuliePolyV } from "./distributie.js?v=1";

const ax = (g) => { g.rotateZ(Math.PI / 2); return g; };
// LatheGeometry cere profilul de jos în sus (normale spre exterior); profilele de aici sunt date de sus în jos
const ordine = (pts) => (pts.length && pts[0][1] > pts[pts.length - 1][1] ? pts.slice().reverse() : pts);
const lathe = (pts, seg = 64) => { const g = new THREE.LatheGeometry(ordine(pts).map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg); return g; };
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

  /* ---------------- chiulasa (supape înclinate, doi arbori cu came în cap), capacul culbutorilor, bobinele / injectoarele */
  const hCh = 0.62 * D, yCh = yPunte, th = (doiT ? 0 : 24) * Math.PI / 180, zv = 0.2 * D, dc = 1.5 * D, rbc = 0.16 * D, Lmax = Math.min(0.12 * D, 0.012);
  const ycam = yCh + dc * Math.cos(th), zc = zv + dc * Math.sin(th), Wh = Math.max(Wb * 1.04, 2 * zc + 0.55 * D);
  { const sh = drept(Lb, Wh, 0.05 * D); xs.forEach((x) => [-1, 1].forEach((sg) => [-1, 1].forEach((sx) => { const h = new THREE.Path(); h.absarc(x + sx * 0.2 * D, sg * zv, (sg > 0 ? 0.17 : 0.145) * D, 0, Math.PI * 2, true); sh.holes.push(h); })));
    G.add(C(new THREE.Mesh(ext(sh, yCh, yCh + 0.12 * D), mC))); }
  const yCarc = ycam - 0.05 * D;   // planul de separație chiulasă – suportul arborilor cu came
  { const sh = drept(Lb, Wh, 0.05 * D); gaura(sh, Lb - 0.12 * D, Wh - 0.12 * D, 0.04 * D); G.add(C(new THREE.Mesh(ext(sh, yCh + 0.12 * D, yCarc), mC))); }
  // capacul culbutorilor: carcasă rotunjită cu nervuri, bușonul de ulei, bobinele de inducție pe bujii (MAS) / injectoarele (MAC)
  const yCap = ycam + rbc + Lmax + 0.32 * D, mCap = matCarcasa(0x9aa3ad, { metalness: 0.35, roughness: 0.4 });
  { const sh = drept(Lb * 1.0, Wh * 0.98, 0.25 * D); gaura(sh, Lb - 0.1 * D, Wh * 0.98 - 0.1 * D, 0.2 * D); G.add(C(new THREE.Mesh(ext(sh, yCarc, yCap), mCap)));
    const top = C(new THREE.Mesh(ext(drept(Lb, Wh * 0.98, 0.25 * D), yCap, yCap + 0.06 * D), mCap)); G.add(top);
    for (let k = -3; k <= 3; k++) { const n = C(new THREE.Mesh(new THREE.BoxGeometry(Lb * 0.9, 0.05 * D, 0.03 * D), mCap)); n.position.set(0, yCap + 0.08 * D, k * 0.12 * D + (k > 0 ? 0.6 : k < 0 ? -0.6 : 0) * D); if (k) G.add(n); }
    const bus = C(new THREE.Mesh(new THREE.CylinderGeometry(0.17 * D, 0.17 * D, 0.1 * D, 32), matCAE(0xe8b512))); bus.position.set(xs[i - 1] - pas * 0.2, yCap + 0.11 * D, zc * 0.95); G.add(bus); }
  xs.forEach((x) => {
    if (!mac && !doiT) { const bob = new THREE.Group(); bob.add(C(new THREE.Mesh(new THREE.CylinderGeometry(0.1 * D, 0.1 * D, yCap - yCh, 20), matCAE(0x26292d)))); const cap = C(new THREE.Mesh(new THREE.BoxGeometry(0.34 * D, 0.2 * D, 0.42 * D), matCAE(0x1d2024, { roughness: 0.6 }))); cap.position.y = (yCap - yCh) / 2 + 0.16 * D; bob.add(cap);
      const con = C(new THREE.Mesh(new THREE.BoxGeometry(0.16 * D, 0.12 * D, 0.14 * D), matCAE(0x3a3f45))); con.position.set(0, (yCap - yCh) / 2 + 0.2 * D, 0.26 * D); bob.add(con); bob.position.set(x, (yCap + yCh) / 2, 0); G.add(bob); }
    if (mac) { const inj = C(new THREE.Mesh(new THREE.CylinderGeometry(0.06 * D, 0.06 * D, yCap - yCh + 0.25 * D, 20), matCAE(0x8a9199, { metalness: 0.7 }))); inj.position.set(x, (yCap + yCh) / 2 + 0.12 * D, 0); G.add(inj);
      const cn = C(new THREE.Mesh(new THREE.BoxGeometry(0.16 * D, 0.14 * D, 0.2 * D), matCAE(0x1d2024))); cn.position.set(x, yCap + 0.22 * D, 0); G.add(cn); }
  });
  if (mac) { const rampa = C(new THREE.Mesh(ax(new THREE.CylinderGeometry(0.1 * D, 0.1 * D, Lb * 0.9, 24)), matCAE(0x8a9199, { metalness: 0.7 }))); rampa.position.set(0, yCap + 0.35 * D, 0.45 * D); G.add(rampa);
    xs.forEach((x) => G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, yCap + 0.35 * D, 0.4 * D), V3(x, yCap + 0.36 * D, 0.15 * D), V3(x, yCap + 0.22 * D, 0.02 * D)]), 12, 0.022 * D, 8), matCAE(0x8a9199, { metalness: 0.8 })))); }
  const durA = 180 + dist.isa + dist.dsa, durE = 180 + dist.dse + dist.ise;
  const camA = new THREE.Group(), camE = new THREE.Group(); camA.position.set(0, ycam, zc); camE.position.set(0, ycam, -zc); G.add(camA, camE);
  const arbCam = latheX([[0, -Lb / 2 - 0.42 * D], [0.075 * D, -Lb / 2 - 0.42 * D], [0.075 * D, Lb / 2], [0, Lb / 2]], 24);
  [camA, camE].forEach((c) => { c.add(C(new THREE.Mesh(arbCam, mOtel)));
    // fusurile arborelui cu came și capacele lagărelor (fixe, cu câte două șuruburi)
    for (let k = 0; k <= i; k++) { const xj = x0 - pas / 2 + k * pas + (k === 0 ? 0.12 * D : k === i ? -0.12 * D : 0), f = C(new THREE.Mesh(latheX(profilFus(0.12 * D, 0.14 * D, 0.01 * D)), mOtel)); f.position.x = xj; c.add(f); } });
  [zc, -zc].forEach((z) => { for (let k = 0; k <= i; k++) { const xj = x0 - pas / 2 + k * pas + (k === 0 ? 0.12 * D : k === i ? -0.12 * D : 0);
    const cap = C(new THREE.Mesh(new THREE.BoxGeometry(0.16 * D, 0.16 * D, 0.5 * D), mC)); cap.position.set(xj, ycam + 0.08 * D, z); G.add(cap);
    const su = C(new THREE.Mesh(new THREE.BoxGeometry(0.16 * D, 0.18 * D, 0.5 * D), mC)); su.position.set(xj, ycam - 0.14 * D, z); G.add(su);
    [-1, 1].forEach((sg) => { const b = C(new THREE.Mesh(new THREE.CylinderGeometry(0.035 * D, 0.035 * D, 0.06 * D, 6), mOtel)); b.position.set(xj, ycam + 0.19 * D, z + sg * 0.18 * D); G.add(b); }); } });
  const supape = [];
  const lobGeom = (offs, adm) => { const sh = new THREE.Shape(), N = 120;
    for (let k = 0; k <= N; k++) { const psi = (k / N) * Math.PI * 2, al = 2 * (psi + Math.PI / 2) * 180 / Math.PI - offs;
      const L_ = adm ? lift(mod(al + dist.dsa, 720), durA, Lmax) : lift(mod(al - (540 - dist.dse), 720), durE, Lmax), r = rbc + L_;
      k ? sh.lineTo(r * Math.cos(psi), r * Math.sin(psi)) : sh.moveTo(r * Math.cos(psi), r * Math.sin(psi)); }
    return extrudZY(sh, 0.1 * D, 0.06); };
  const gTija = new THREE.CylinderGeometry(0.028 * D, 0.028 * D, 1, 12), gArc = (() => { const P = []; for (let k = 0; k <= 160; k++) { const a = (k / 160) * Math.PI * 2 * 6; P.push(V3(0.1 * D * Math.cos(a), (k / 160), 0.1 * D * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 320, 0.013 * D, 6); })();
  const yTop = dc - rbc;   // vârful tachetului pe axa supapei, în contact cu cercul de bază
  if (!doiT) xs.forEach((x, k) => {
    [true, false].forEach((adm) => [-1, 1].forEach((sx) => {
      const sg = adm ? 1 : -1, c = adm ? camA : camE, lob = C(new THREE.Mesh(lobGeom(dec[k], adm), mOtel)); lob.position.x = x + sx * 0.2 * D; lob.rotation.x = sg * th; c.add(lob);
      const fix = new THREE.Group(); fix.position.set(x + sx * 0.2 * D, yCh, sg * zv); fix.rotation.x = sg * th; G.add(fix);
      const sv = new THREE.Group(), rT = (adm ? 0.165 : 0.14) * D;
      const taler = C(new THREE.Mesh(lathe([[0, 0], [rT, 0], [rT, 0.025 * D], [0.045 * D, 0.09 * D], [0.028 * D, 0.13 * D], [0, 0.13 * D]], 40), mSup)); sv.add(taler);
      const tija = new THREE.Mesh(gTija, mSup); tija.scale.y = yTop - 0.13 * D; tija.position.y = 0.13 * D + (yTop - 0.13 * D) / 2; sv.add(tija);
      const tl = C(new THREE.Mesh(lathe([[0.03 * D, 0], [0.12 * D, 0], [0.12 * D, 0.025 * D], [0.03 * D, 0.03 * D]], 24), mOtel)); tl.position.y = yTop - 0.12 * D; sv.add(tl);
      const tachet = C(new THREE.Mesh(new THREE.CylinderGeometry(0.11 * D, 0.11 * D, 0.1 * D, 24), mOtel)); tachet.position.y = yTop - 0.05 * D; sv.add(tachet);
      const ghid = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * D, 0.045 * D, 0.3 * D, 16), matCAE(0xa08a68, { metalness: 0.6 })); ghid.position.y = 0.42 * D; fix.add(ghid);
      const scaun = new THREE.Mesh(new THREE.TorusGeometry(rT * 0.95, 0.018 * D, 8, 40).rotateX(Math.PI / 2), mInchis); scaun.position.y = 0.01 * D; fix.add(scaun);
      const yArc0 = 0.13 * D + 0.45 * D, hArc = yTop - 0.12 * D - yArc0, arc = new THREE.Mesh(gArc, mArc); arc.position.y = yArc0; arc.scale.y = hArc; fix.add(arc);
      fix.add(sv); supape.push({ sv, arc, adm, k, hArc, yArc0, tl, yTop });
    }));
    // bujia (MAS) sau injectorul (MAC), pe axa cilindrului
    const bj = C(new THREE.Mesh(lathe(mac ? [[0, -0.05 * D], [0.05 * D, 0], [0.07 * D, 0.5 * D], [0.1 * D, 0.55 * D], [0.1 * D, 0.95 * D], [0, 0.95 * D]] : [[0, -0.03 * D], [0.04 * D, 0], [0.07 * D, 0.2 * D], [0.11 * D, 0.25 * D], [0.11 * D, 0.4 * D], [0.07 * D, 0.45 * D], [0.07 * D, 0.95 * D], [0, 0.95 * D]], 24), matCAE(mac ? 0x7f8790 : 0xf2f2f2))); bj.position.set(x, yCh, 0); G.add(bj);
  });

  /* ---------------- distribuția prin curea dințată (în fața motorului) și transmisia agregatelor prin curea poly-V */
  const xD = xF - lj / 2 - 0.3 * D, xA = xF - lj / 2 - 0.72 * D, bC = 0.13 * D, zC = 22, rC = 0.36 * D, rCam = 2 * rC, pasC = (2 * Math.PI * rC) / zC;
  const roti = [], antrenare = [];
  const sprocket = roataDintata(zC, rC, bC * 1.05, { flanse: true, butuc: 0.2 * D }); sprocket.position.x = xD; ac.add(sprocket);
  const nasF = C(new THREE.Mesh(latheX([[0, 0], [rj * 0.75, 0], [rj * 0.75, 0.9 * D], [0, 0.9 * D]]), mA)); nasF.rotation.z = Math.PI; nasF.position.x = xF - lj / 2; ac.add(nasF);
  const amort = new THREE.Group(); amort.add(fuliePolyV(0.68 * D, 0.2 * D, 6, 0x8f969d)); const inel = C(new THREE.Mesh(new THREE.CylinderGeometry(0.5 * D, 0.5 * D, 0.14 * D, 48).rotateZ(Math.PI / 2), matCAE(0x2b2e33))); inel.position.x = -0.16 * D; amort.add(inel);
  amort.position.x = xA; ac.add(amort);
  if (!doiT) {
    [camA, camE].forEach((c) => { const r = roataDintata(2 * zC, rCam, bC, { gauri: 5, butuc: 0.22 * D }); r.position.x = xD - camA.position.x; c.add(r); });
    const pompa = { c: [Wb * 0.42, 0.5 * (ycam + 0) - 0.2 * D], r: 0.3 * D }, intind = { c: [-Wb * 0.42, 0.45 * ycam], r: 0.22 * D, spate: true };
    const tr = traseuCurea([{ c: [0, 0], r: rC }, pompa, { c: [zc, ycam], r: rCam }, { c: [-zc, ycam], r: rCam }, intind]);
    const mCurea = matCAE(0x1b1d20, { roughness: 0.75, metalness: 0.05 }), tb = 0.035 * D;
    G.add(banda(tr, [[-bC / 2, 0], [bC / 2, 0], [bC / 2, tb], [-bC / 2, tb]], xD, mCurea, 900));
    const dinti = dintiCurea(tr, pasC, bC, 0.03 * D, xD, matCAE(0x1b1d20, { roughness: 0.8, side: THREE.DoubleSide })); G.add(dinti.im);
    // pompa de apă (roată dințată + corp), rola de întindere cu excentric și braț
    const rp_ = roataDintata(Math.round((zC * pompa.r) / rC), pompa.r, bC, { gauri: 0, butuc: 0.12 * D }); rp_.position.set(xD, pompa.c[1], pompa.c[0]); G.add(rp_);
    const corpP = C(new THREE.Mesh(new THREE.CylinderGeometry(0.22 * D, 0.28 * D, xF - xD - 0.1 * D, 32).rotateZ(Math.PI / 2), mC)); corpP.position.set((xD + xF) / 2, pompa.c[1], pompa.c[0]); G.add(corpP);
    const ri = rola(intind.r, bC * 1.1); ri.position.set(xD, intind.c[1], intind.c[0]); G.add(ri);
    const brat = C(new THREE.Mesh(new THREE.BoxGeometry(0.06 * D, 0.5 * D, 0.14 * D), mOtel)); brat.position.set(xD + 0.12 * D, intind.c[1] - 0.22 * D, intind.c[0] + 0.08 * D); brat.rotation.x = 0.35; G.add(brat);
    const arcI = C(new THREE.Mesh(new THREE.CylinderGeometry(0.05 * D, 0.05 * D, 0.32 * D, 12), mArc)); arcI.position.set(xD + 0.12 * D, intind.c[1] - 0.5 * D, intind.c[0] + 0.18 * D); arcI.rotation.x = 0.9; G.add(arcI);
    // carcasa din spate a distribuției
    const capD = (() => { const sh = new THREE.Shape(); sh.moveTo(-0.6 * D, -0.5 * D); sh.lineTo(0.75 * D, -0.5 * D); sh.lineTo(zc + rCam * 1.15, ycam - 0.4 * D); sh.absarc(zc, ycam, rCam * 1.15, -0.4, Math.PI * 0.75, false); sh.lineTo(-zc + rCam * 0.8, ycam + rCam * 0.8); sh.absarc(-zc, ycam, rCam * 1.15, Math.PI * 0.25, Math.PI * 1.4, false); sh.closePath(); return sh; })();
    const pl = C(new THREE.Mesh(extrudZY(capD, 0.02 * D, 0), matCarcasa(0x30353b, { roughness: 0.6 }))); pl.position.x = xD + bC * 0.9; G.add(pl);
    roti.push({ tr, dinti, rp_, ri, rPompa: pompa.r, rInt: intind.r });
  }
  // agregatele: alternatorul, compresorul de climatizare, întinzătorul automat; cureaua poly-V
  { const alt = { c: [Wb * 0.62 + 0.3 * D, 0.45 * ycam], r: 0.26 * D }, ac2 = { c: [-Wb * 0.62 - 0.25 * D, 0.05 * D], r: 0.4 * D }, aut = { c: [Wb * 0.55, -0.15 * D], r: 0.24 * D, spate: true };
    const tr2 = traseuCurea([{ c: [0, 0], r: 0.68 * D }, aut, alt, ac2].sort(() => 0));
    const pv = []; const nv = 6, wv = 0.2 * D * 0.86 / nv; pv.push([-0.1 * D, 0.03 * D], [0.1 * D, 0.03 * D]); for (let k = nv - 1; k >= 0; k--) { const x1 = -0.086 * D + (k + 1) * wv, x2 = -0.086 * D + k * wv; pv.push([x1, 0], [(x1 + x2) / 2, -0.02 * D], [x2, 0]); }
    G.add(banda(tr2, pv, xA, matCAE(0x1b1d20, { roughness: 0.8 }), 700));
    const fa = fuliePolyV(alt.r, 0.2 * D, 6, 0xb7bdc4); fa.position.set(xA, alt.c[1], alt.c[0]); G.add(fa);
    const corpA = new THREE.Group(); corpA.position.set(xA + 0.55 * D, alt.c[1], alt.c[0]); G.add(corpA);
    corpA.add(C(new THREE.Mesh(new THREE.CylinderGeometry(0.55 * D, 0.55 * D, 0.75 * D, 40).rotateZ(Math.PI / 2), matCAE(0xc5cad0, { metalness: 0.6 }))));
    for (let k = 0; k < 7; k++) { const n = new THREE.Mesh(new THREE.TorusGeometry(0.555 * D, 0.012 * D, 6, 40).rotateY(Math.PI / 2), matCAE(0x8f969d)); n.position.x = -0.3 * D + k * 0.1 * D; corpA.add(n); }
    const ventil = C(new THREE.Mesh(new THREE.CylinderGeometry(0.42 * D, 0.42 * D, 0.06 * D, 12).rotateZ(Math.PI / 2), matCAE(0x5b6168))); ventil.position.x = -0.42 * D; corpA.add(ventil);
    const fc = fuliePolyV(ac2.r, 0.2 * D, 6, 0xb7bdc4); fc.position.set(xA, ac2.c[1], ac2.c[0]); G.add(fc);
    const corpC = C(new THREE.Mesh(new THREE.CylinderGeometry(0.5 * D, 0.5 * D, 1.1 * D, 40).rotateZ(Math.PI / 2), matCAE(0x6b737c, { metalness: 0.5 }))); corpC.position.set(xA + 0.75 * D, ac2.c[1], ac2.c[0]); G.add(corpC);
    const ra = rola(aut.r, 0.2 * D); ra.position.set(xA, aut.c[1], aut.c[0]); G.add(ra);
    antrenare.push({ fa, fc, ra, rAlt: alt.r, rAc: ac2.r, rAut: aut.r, ventil });
  }
  // filtrul de ulei, electromotorul de pornire, joja
  { const f = C(new THREE.Mesh(new THREE.CylinderGeometry(0.38 * D, 0.38 * D, 0.95 * D, 36), matCAE(0x1d4f91, { metalness: 0.3 }))); f.rotation.x = Math.PI / 2; f.position.set(xs[Math.floor((i - 1) / 2)], ySep - 0.25 * D, Wb * 0.54 + 0.5 * D); G.add(f);
    const st_ = C(new THREE.Mesh(new THREE.CylinderGeometry(0.36 * D, 0.36 * D, 1.4 * D, 32).rotateZ(Math.PI / 2), matCAE(0x5b6168, { metalness: 0.5 }))); st_.position.set(xR - 0.2 * D, -0.25 * D, -Wb * 0.54 - 0.4 * D); G.add(st_);
    const joja = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(xs[0], ySep - 0.3 * D, Wb * 0.5), V3(xs[0], yCh, Wb * 0.62), V3(xs[0], yCh + 1.2 * D, Wb * 0.7)]), 20, 0.03 * D, 8), matCAE(0x9aa1a8)); G.add(joja);
    const man = C(new THREE.Mesh(new THREE.TorusGeometry(0.09 * D, 0.03 * D, 8, 20), matCAE(0xf2c41a))); man.position.set(xs[0], yCh + 1.27 * D, Wb * 0.7); G.add(man); }

  // galeria de admisie (+z) cu clapeta de accelerație și galeria de evacuare (−z)
  const mAdm = matCarcasa(0x3b82f6, { roughness: 0.5 }), mEv = matCarcasa(0xc8382c, { roughness: 0.45, metalness: 0.4 }), zA = Wh * 0.5;
  xs.forEach((x) => {
    G.add(C(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, yCh + 0.35 * D, zA - 0.1 * D), V3(x, yCh + 0.4 * D, zA + 0.35 * D), V3(x, yCh + 0.95 * D, zA + 0.65 * D), V3(x * 0.6, yCh + 1.55 * D, zA + 0.55 * D)]), 32, 0.16 * D, 16), mAdm)));
    G.add(C(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, yCh + 0.3 * D, -zA + 0.1 * D), V3(x, yCh + 0.25 * D, -zA - 0.3 * D), V3(x * 0.55, yCh - 0.2 * D, -zA - 0.45 * D), V3(x * 0.15, yCh - 0.9 * D, -zA - 0.45 * D)]), 32, 0.13 * D, 14), mEv)));
  });
  const plenum = C(new THREE.Mesh(ax(new THREE.CylinderGeometry(0.42 * D, 0.42 * D, Lb * 0.75, 32)), mAdm)); plenum.position.set(0, yCh + 1.7 * D, zA + 0.65 * D); G.add(plenum);
  const clapeta = C(new THREE.Mesh(ax(new THREE.CylinderGeometry(0.3 * D, 0.3 * D, 0.35 * D, 32)), matCAE(0x9aa1a8, { metalness: 0.7 }))); clapeta.position.set(-Lb * 0.375 - 0.17 * D, yCh + 1.7 * D, zA + 0.65 * D); G.add(clapeta);
  const colector = C(new THREE.Mesh(new THREE.CylinderGeometry(0.2 * D, 0.2 * D, 0.8 * D, 24), mEv)); colector.position.set(0, yCh - 1.25 * D, -zA - 0.45 * D); G.add(colector);

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
      q.sv.position.y = -Lv; q.arc.scale.y = q.hArc - Lv; });
    // curelele: cureaua se deplasează cu viteza periferică a roții arborelui cotit; rolele și agregatele se rotesc corespunzător
    const ar = (alfa * Math.PI) / 180;
    roti.forEach((q) => { q.dinti.faza(-rC * ar); q.rp_.rotation.x = ar * rC / q.rPompa; q.ri.rotation.x = -ar * rC / q.rInt; });
    antrenare.forEach((q) => { q.fa.rotation.x = ar * 0.68 * D / q.rAlt; q.fc.rotation.x = ar * 0.68 * D / q.rAc; q.ra.rotation.x = -ar * 0.68 * D / q.rAut; q.ventil.rotation.x = q.fa.rotation.x; });
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
