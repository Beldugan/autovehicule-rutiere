/* Roți dințate cu profil evolventic real (cerc de bază, flancuri evolventice, cerc de picior, racordare), drepte sau înclinate
   (elicoidale), exterioare sau interioare (coroane); canelura și butucul; axa roții pe X. Unități: metri. */
import { THREE } from "./scena.js";

const inv = (a) => Math.tan(a) - a;

/** conturul (lista de puncte [x, y]) al unei danturi exterioare: z dinți, raza de divizare rp, cap ra, picior rf, unghiul de presiune alfa */
export function profilDantura(z, rp, ra, rf, alfa = (20 * Math.PI) / 180, nInv = 7) {
  const rb = rp * Math.cos(alfa), pas = (2 * Math.PI) / z, psi = Math.PI / (2 * z) + inv(alfa), P = [];
  const flanc = (sem, k0) => {
    const pts = [], r0 = Math.max(rb, rf);
    for (let j = 0; j <= nInv; j++) { const r = r0 + ((ra - r0) * j) / nInv, ar = Math.acos(Math.min(1, rb / r)), phi = psi - inv(ar); pts.push([r, k0 + sem * phi]); }
    return pts;
  };
  for (let k = 0; k < z; k++) {
    const c = k * pas, dr = flanc(-1, c).reverse(), st = flanc(1, c);
    // piciorul dintelui (de la golul anterior) – racordare radială până la cercul de picior
    const aR = c - psi - 0.12 * pas;
    P.push([rf, aR - 0.08 * pas]);
    if (rf < rb) P.push([rf, c - psi + (inv(alfa) - 0) * 0 - 0.02 * pas], [rb, c - psi + inv(alfa)]);
    // flancul stâng (de la bază spre cap), capul (arc), flancul drept (de la cap spre bază)
    st.slice().reverse().forEach(([r, a]) => P.push([r, c - (a - c)])); // oglindire în jurul axei dintelui
    const aCap = st[st.length - 1][1] - c; for (let j = 1; j < 4; j++) P.push([ra, c - aCap + (2 * aCap * j) / 4]);
    st.forEach(([r, a]) => P.push([r, a]));
    if (rf < rb) P.push([rf, c + psi + 0.02 * pas]);
    P.push([rf, c + psi + 0.12 * pas]);
    void dr;
  }
  return P.map(([r, a]) => [r * Math.cos(a), r * Math.sin(a)]);
}

/** roata dințată: o = { b (lățimea), beta (unghiul de înclinare, rad), alfa, butuc: raza găurii, interior: coroană (raza exterioară o.Rext), spite: număr de goluri } */
export function roata(z, m, o = {}) {
  const b = o.b ?? 10 * m, rp = (m * z) / 2, beta = o.beta || 0, alfa = o.alfa ?? (20 * Math.PI) / 180;
  let sh;
  if (o.interior) {
    // coroana: golurile ei sunt „dinții” unui contur exterior cu capul la rp + 1,25 m și piciorul la rp − m
    sh = new THREE.Shape(); sh.absarc(0, 0, o.Rext ?? rp + 4 * m, 0, Math.PI * 2, false);
    const h = new THREE.Path(), P = profilDantura(z, rp, rp + 1.25 * m, rp - m, alfa);
    P.forEach(([x, y], j) => (j ? h.lineTo(x, y) : h.moveTo(x, y))); h.closePath(); sh.holes.push(h);
  } else {
    const P = profilDantura(z, rp, rp + m, rp - 1.25 * m, alfa);
    sh = new THREE.Shape(); P.forEach(([x, y], j) => (j ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
    const rh = o.butuc ?? Math.max(0.004, rp * 0.22);
    const g = new THREE.Path(); g.absarc(0, 0, rh, 0, Math.PI * 2, true); sh.holes.push(g);
    // golurile de ușurare ale discului (roțile mari)
    if (o.spite && rp > 0.05) { const r1 = rh * 1.8, r2 = rp - 3 * m; if (r2 > r1 * 1.4) for (let k = 0; k < o.spite; k++) { const a0 = (k / o.spite) * Math.PI * 2, da = (Math.PI * 2) / o.spite * 0.32, hp = new THREE.Path();
      hp.absarc(0, 0, r2, a0 - da, a0 + da, false); hp.absarc(0, 0, r1, a0 + da * 0.75, a0 - da * 0.75, true); hp.closePath(); sh.holes.push(hp); } }
  }
  const pasi = beta ? 8 : 1;
  const g = new THREE.ExtrudeGeometry(sh, { depth: b, steps: pasi, bevelEnabled: true, bevelThickness: m * 0.15, bevelSize: m * 0.12, bevelSegments: 1, curveSegments: 32 });
  g.translate(0, 0, -b / 2);
  if (beta) { // răsucirea elicoidală: unghiul crește liniar cu poziția axială (tg β / r_p)
    const p = g.attributes.position, k = Math.tan(beta) / rp;
    for (let j = 0; j < p.count; j++) { const x = p.getX(j), y = p.getY(j), zz = p.getZ(j), a = zz * k * (o.interior ? -1 : 1); p.setXY(j, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)); }
    g.computeVertexNormals();
  }
  g.rotateY(Math.PI / 2); // axa pe X
  return g;
}

/** fulia cu caneluri poly-V / roata de curea dințată, axa pe X */
export function fulie(r, b, caneluri = 6, dintata = 0) {
  if (dintata) { // roată de curea dințată (dinți trapezoidali mici)
    const sh = new THREE.Shape(), N = dintata, pas = (2 * Math.PI) / N, rr = r - 0.0015;
    for (let k = 0; k < N; k++) { const a = k * pas; [[rr, a], [r, a + pas * 0.15], [r, a + pas * 0.55], [rr, a + pas * 0.7]].forEach(([q, t], j) => (k === 0 && j === 0 ? sh.moveTo(q * Math.cos(t), q * Math.sin(t)) : sh.lineTo(q * Math.cos(t), q * Math.sin(t)))); }
    const h = new THREE.Path(); h.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true); sh.holes.push(h);
    const g = new THREE.ExtrudeGeometry(sh, { depth: b, bevelEnabled: false }); g.translate(0, 0, -b / 2); g.rotateY(Math.PI / 2); return g;
  }
  const P = [new THREE.Vector2(r * 0.25, -b / 2), new THREE.Vector2(r * 1.04, -b / 2)];
  const w = (b * 0.8) / caneluri;
  for (let k = 0; k < caneluri; k++) { const y0 = -b * 0.4 + k * w; P.push(new THREE.Vector2(r, y0), new THREE.Vector2(r * 0.94, y0 + w / 2), new THREE.Vector2(r, y0 + w)); }
  P.push(new THREE.Vector2(r * 1.04, b / 2), new THREE.Vector2(r * 0.25, b / 2));
  const g = new THREE.LatheGeometry(P, 64); g.rotateZ(Math.PI / 2); return g;
}
