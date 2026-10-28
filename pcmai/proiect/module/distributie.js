/* Transmisiile prin curea ale motorului (în planul (z, y), axa roților pe X):
   • roțile de curea dințată (profil HTD: dinți rotunjiți, flanșe de ghidare, butuc, găuri de ușurare, șurub central, semn de calaj);
   • cureaua de distribuție: traseul calculat geometric (tangentele exterioare / interioare dintre roți, arcele de înfășurare,
     roțile de întindere pe spatele curelei), banda cu dinții trapezoidali care se deplasează odată cu rotația arborelui cotit;
   • cureaua poly-V a agregatelor (secțiune cu nervuri în V) – același calcul de traseu;
   • rola de întindere cu excentric și braț, pompa de apă, alternatorul, compresorul de climatizare. */
import { THREE, V3, matCAE, contur } from "./scena.js";

const TAU = Math.PI * 2;
/** traseul unei curele înfășurate pe roțile r = [{ c: [z, y], r, spate }] date în sens trigonometric (spate = rolă pe spatele curelei) */
export function traseuCurea(roti) {
  const n = roti.length, rho = roti.map((q) => (q.spate ? -q.r : q.r)), tan = [];
  for (let k = 0; k < n; k++) { const A = roti[k], B = roti[(k + 1) % n], dx = B.c[0] - A.c[0], dy = B.c[1] - A.c[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const a = (rho[k] - rho[(k + 1) % n]) / L, b = -Math.sqrt(Math.max(0, 1 - a * a)), nx = a * ux - b * uy, ny = a * uy + b * ux;
    tan.push({ p0: [A.c[0] + rho[k] * nx, A.c[1] + rho[k] * ny], p1: [B.c[0] + rho[(k + 1) % n] * nx, B.c[1] + rho[(k + 1) % n] * ny], n: [nx, ny] }); }
  // segmentele: arcul pe roata k (de la intrare la ieșire), apoi tangenta k → k+1
  const seg = []; let s = 0;
  for (let k = 0; k < n; k++) { const q = roti[k], tin = tan[(k - 1 + n) % n].p1, tout = tan[k].p0, a0 = Math.atan2(tin[1] - q.c[1], tin[0] - q.c[0]), a1 = Math.atan2(tout[1] - q.c[1], tout[0] - q.c[0]);
    let da = q.spate ? -(((a0 - a1) % TAU) + TAU) % TAU : (((a1 - a0) % TAU) + TAU) % TAU; const l = Math.abs(da) * q.r;
    seg.push({ tip: "arc", k, a0, da, l, s0: s }); s += l; q.infasurare = Math.abs(da);
    const t = tan[k], lt = Math.hypot(t.p1[0] - t.p0[0], t.p1[1] - t.p0[1]); seg.push({ tip: "lin", k, p0: t.p0, p1: t.p1, n: t.n, l: lt, s0: s }); s += lt; }
  const L = s;
  /** punctul, tangenta și normala spre fața dințată la abscisa curbilinie s */
  function la(sq) { sq = ((sq % L) + L) % L; let lo = 0, hi = seg.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (seg[m].s0 <= sq) lo = m; else hi = m - 1; }
    const g = seg[lo], f = (sq - g.s0) / (g.l || 1);
    if (g.tip === "lin") { const tx = (g.p1[0] - g.p0[0]) / g.l, ty = (g.p1[1] - g.p0[1]) / g.l; return { p: [g.p0[0] + (g.p1[0] - g.p0[0]) * f, g.p0[1] + (g.p1[1] - g.p0[1]) * f], t: [tx, ty], in: [-g.n[0], -g.n[1]] }; }
    const q = roti[g.k], a = g.a0 + g.da * f, sg = Math.sign(g.da) || 1, er = [Math.cos(a), Math.sin(a)];
    return { p: [q.c[0] + q.r * er[0], q.c[1] + q.r * er[1]], t: [-er[1] * sg, er[0] * sg], in: q.spate ? er : [-er[0], -er[1]] }; }
  return { L, la, seg, roti };
}

/** banda curelei: secțiunea transversală prof = [[x (lățime), h (spre spate)]] închisă, măturată de-a lungul traseului, în planul x = x0 */
export function banda(tr, prof, x0, mat, N = 600) {
  const P = [], I = [], m = prof.length;
  for (let k = 0; k <= N; k++) { const q = tr.la((k / N) * tr.L), bx = -q.in[0], by = -q.in[1];
    prof.forEach(([x, h]) => P.push(x0 + x, q.p[1] + by * h, q.p[0] + bx * h)); }
  for (let k = 0; k < N; k++) for (let j = 0; j < m; j++) { const a = k * m + j, b = k * m + ((j + 1) % m), c = a + m, d = b + m; I.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  const me = new THREE.Mesh(g, mat); me.material.side = THREE.DoubleSide; return me;
}
/** dinții curelei de distribuție (InstancedMesh), deplasați cu faza s (abscisa curbilinie a unui dinte) */
export function dintiCurea(tr, pas, b, hD, x0, mat) {
  const N = Math.round(tr.L / pas), p = tr.L / N, sh = new THREE.Shape(); sh.moveTo(-0.32 * p, 0); sh.lineTo(-0.22 * p, -hD); sh.lineTo(0.22 * p, -hD); sh.lineTo(0.32 * p, 0); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: b, bevelEnabled: false }); g.translate(0, 0, -b / 2);   // în planul (t, n), lățimea pe z local
  const im = new THREE.InstancedMesh(g, mat, N), M = new THREE.Matrix4(), bz = V3(0, 0, 0), bt = V3(0, 0, 0), bn = V3(0, 0, 0);
  function faza(s0) { for (let k = 0; k < N; k++) { const q = tr.la(s0 + k * p); bt.set(0, q.t[1], q.t[0]); bn.set(0, -q.in[1], -q.in[0]); bz.set(1, 0, 0);
      M.makeBasis(bt, bn, bz); M.setPosition(x0, q.p[1], q.p[0]); im.setMatrixAt(k, M); } im.instanceMatrix.needsUpdate = true; }
  faza(0); return { im, faza, N, pas: p };
}

/** roată de curea dințată HTD (axa pe X): N dinți, raza de divizare r, lățimea b; o = { flanse, gauri, butuc, culoare } */
export function roataDintata(N, r, b, o = {}) {
  const G = new THREE.Group(), mat = matCAE(o.culoare ?? 0xaeb4bb, { metalness: 0.7, roughness: 0.3 }), adanc = Math.min(0.45 * (TAU * r) / N, 0.12 * r);
  const sh = new THREE.Shape(), M = N * 14;
  for (let k = 0; k <= M; k++) { const a = (k / M) * TAU, f = ((a * N) / TAU) % 1, d = Math.abs(f - 0.5) < 0.3 ? adanc * Math.sqrt(Math.max(0, 1 - ((f - 0.5) / 0.3) ** 2)) : 0, rr = r - 0.004 * r - d;
    k ? sh.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : sh.moveTo(rr * Math.cos(a), rr * Math.sin(a)); }
  const rb = o.butuc ?? 0.28 * r, gauri = o.gauri ?? 0; const ax = new THREE.Path(); ax.absarc(0, 0, rb * 0.45, 0, TAU, true); sh.holes.push(ax);
  // coroana dințată (plină pe toată lățimea) și discul (mai subțire) cu găurile de ușurare
  const coroana = new THREE.Shape(); coroana.curves = sh.curves; coroana.holes = [(() => { const p = new THREE.Path(); p.absarc(0, 0, r * 0.82, 0, TAU, true); return p; })()];
  const disc = new THREE.Shape(); disc.absarc(0, 0, r * 0.84, 0, TAU, false); disc.holes.push(ax);
  for (let k = 0; k < gauri; k++) { const a = (k / gauri) * TAU + 0.3, p = new THREE.Path(), rc = (r * 0.84 + rb) / 2, rg = Math.min((r * 0.84 - rb) * 0.36, (Math.PI * rc) / gauri * 0.62); p.absarc(rc * Math.cos(a), rc * Math.sin(a), rg, 0, TAU, true); disc.holes.push(p); }
  const ext = (s, d) => { const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.04, bevelSize: d * 0.03, bevelSegments: 1, curveSegments: 24 }); g.translate(0, 0, -d / 2); g.rotateY(Math.PI / 2); return g; };
  G.add(contur(new THREE.Mesh(ext(coroana, b), mat), 40, 0.3));
  G.add(contur(new THREE.Mesh(ext(disc, b * 0.45), mat), 40, 0.3));
  const bu = contur(new THREE.Mesh(new THREE.CylinderGeometry(rb, rb, b * 1.25, 36).rotateZ(Math.PI / 2), mat), 40, 0.3); G.add(bu);
  const sur = contur(new THREE.Mesh(new THREE.CylinderGeometry(rb * 0.42, rb * 0.42, b * 0.3, 6).rotateZ(Math.PI / 2), matCAE(0x5b6168, { metalness: 0.7 })), 30, 0.4); sur.position.x = -b * 0.75; G.add(sur);
  if (o.flanse) [-1, 1].forEach((sg) => { const f = contur(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.1, b * 0.08, 64).rotateZ(Math.PI / 2), mat), 30, 0.3); f.position.x = sg * b * 0.54; G.add(f); });
  const semn = new THREE.Mesh(new THREE.BoxGeometry(b * 0.5, r * 0.12, r * 0.03), matCAE(0xf4f4f4)); semn.position.set(-b * 0.25, r * 0.7, 0); G.add(semn);
  return G;
}
/** rolă netedă (de întindere / de ghidare) cu rulment */
export function rola(r, b) {
  const G = new THREE.Group(), m = matCAE(0xc9ced4, { metalness: 0.75, roughness: 0.25 });
  G.add(contur(new THREE.Mesh(new THREE.LatheGeometry([[r * 0.55, -b / 2], [r, -b / 2], [r * 1.04, -b * 0.45], [r * 1.04, b * 0.45], [r, b / 2], [r * 0.55, b / 2]].map(([a, y]) => new THREE.Vector2(a, y)), 48).rotateZ(Math.PI / 2), m), 40, 0.3));
  G.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, b * 0.9, 32).rotateZ(Math.PI / 2), matCAE(0x3a3f45, { metalness: 0.6 })));
  G.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, b * 1.2, 6).rotateZ(Math.PI / 2), matCAE(0x7f868e, { metalness: 0.7 })));
  return G;
}
/** fulie poly-V (n nervuri) */
export function fuliePolyV(r, b, n = 6, culoare = 0x9aa1a8) {
  const P = [[r * 0.3, -b / 2], [r * 1.05, -b / 2]], w = (b * 0.86) / n; for (let k = 0; k < n; k++) { const y0 = -b * 0.43 + k * w; P.push([r, y0], [r * 0.95, y0 + w / 2], [r, y0 + w]); }
  P.push([r * 1.05, b / 2], [r * 0.3, b / 2]);
  return contur(new THREE.Mesh(new THREE.LatheGeometry(P.map(([a, y]) => new THREE.Vector2(a, y)), 72).rotateZ(Math.PI / 2), matCAE(culoare, { metalness: 0.7, roughness: 0.3 })), 40, 0.25);
}
