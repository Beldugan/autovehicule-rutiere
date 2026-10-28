/* Studiul „Optimizarea canalului de admisie”: planul de experimente numerice (hipercub latin) pe parametrii canalului,
   simulările CFD 3D (Web Workers în paralel), designul ales recalculat pe rețea fină cu animația 3D (domeniul, supapa și pistonul
   mobile, planurile de secțiune, vectorii, particulele-trasor) și tabloul de post-procesare: câmpul vitezei cu vectori la mai multe
   unghiuri, norul de puncte masă reținută – tumble, datele paralele, evoluțiile masei, tumble/swirl și energiei cinetice turbulente. */
import { fx, concluzie } from "./scena.js";
import { creeazaGeometrie } from "./cfd2d.js?v=2";
import { scenaPort3D, culoareJet } from "./port3d.js?v=8";
import { bielaMEF, chiulasaTermic } from "./fem2d.js?v=2";

const nr = (v, d = 2) => fx(v, d);
/* ------------------------------------------------------------------ scala de culori „albastru–roșu” a post-procesoarelor */
function culoare(x) { x = Math.max(0, Math.min(1, x)); const st = [[0, [0, 0, 255]], [0.25, [0, 200, 255]], [0.5, [40, 220, 60]], [0.75, [255, 220, 0]], [1, [220, 20, 20]]];
  for (let k = 1; k < st.length; k++) if (x <= st[k][0]) { const [a, ca] = st[k - 1], [b, cb] = st[k], t = (x - a) / (b - a); return ca.map((c, j) => Math.round(c + (cb[j] - c) * t)); } return st[4][1]; }
const css = (c) => `rgb(${c.join(",")})`;
function pregatesteCanvas(cv) { const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 400, h = cv.clientHeight || 260; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); return { g, w, h }; }

/** câmpul vitezei pe secțiune: contur neted, pereți gri, vectori, bara de culori, unghiul de RAC */
export function desenCamp(cv, cadru, geo, vmax, titluA) {
  const { g, w, h } = pregatesteCanvas(cv); const { nx, ny } = geo;
  g.fillStyle = "#f2f4f6"; g.fillRect(0, 0, w, h);
  const ml = 70, mt = 26, sc = Math.min((w - ml - 10) / nx, (h - mt - 8) / ny), ox = ml + (w - ml - 10 - sc * nx) / 2, oy = mt;
  const off = document.createElement("canvas"); off.width = nx; off.height = ny; const ox2 = off.getContext("2d"), img = ox2.createImageData(nx, ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i, k = ((ny - 1 - j) * nx + i) * 4, t = cadru.T[c];
    let rgb; if (t === 0) rgb = culoare(cadru.M[c] / vmax); else if (t === 1) rgb = [196, 201, 207]; else if (t === 2) rgb = [150, 156, 163]; else rgb = [120, 126, 133];
    img.data[k] = rgb[0]; img.data[k + 1] = rgb[1]; img.data[k + 2] = rgb[2]; img.data[k + 3] = 255; }
  ox2.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(off, ox, oy, nx * sc, ny * sc);
  // vectorii vitezei (albi, cu contur închis), lungimea proporțională cu viteza
  const pas = Math.max(2, Math.round(nx / 28)), Lm = pas * sc * 0.95;
  g.lineWidth = 1;
  for (let j = 1; j < ny; j += pas) for (let i = 1; i < nx; i += pas) { const c = j * nx + i; if (cadru.T[c]) continue; const U = cadru.U[c], V = cadru.V[c], m = Math.hypot(U, V); if (m < vmax * 0.02) continue;
    const l = Math.min(1, m / vmax) * Lm, x = ox + (i + 0.5) * sc, y = oy + (ny - j - 0.5) * sc, ux = U / m, uy = -V / m, x2 = x + ux * l, y2 = y + uy * l;
    [["#1b2733", 2.2], ["#ffffff", 1]].forEach(([s, lw]) => { g.strokeStyle = s; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.moveTo(x2, y2); g.lineTo(x2 - (ux * 0.35 - uy * 0.22) * l, y2 - (uy * 0.35 + ux * 0.22) * l); g.moveTo(x2, y2); g.lineTo(x2 - (ux * 0.35 + uy * 0.22) * l, y2 - (uy * 0.35 - ux * 0.22) * l); g.stroke(); }); }
  // bara de culori și eticheta unghiului
  const bx = 14, by = mt + 18, bh = Math.min(h - by - 20, 170), grd = g.createLinearGradient(0, by + bh, 0, by); [0, 0.25, 0.5, 0.75, 1].forEach((t) => grd.addColorStop(t, css(culoare(t))));
  g.fillStyle = grd; g.fillRect(bx, by, 12, bh); g.strokeStyle = "#333"; g.strokeRect(bx, by, 12, bh);
  g.fillStyle = "#111"; g.font = "10px system-ui"; g.textAlign = "left"; g.fillText("Viteza: modul (m/s)", 4, by - 8);
  for (let k = 0; k <= 5; k++) { const v = (vmax * k) / 5, y = by + bh - (bh * k) / 5; g.fillText(v.toFixed(1), bx + 16, y + 3); }
  g.font = "italic 11px system-ui"; g.textAlign = "center"; g.fillText(titluA, ox + (nx * sc) / 2, 16);
}

/** grafic liniar în stilul post-procesorului (grilă fină, ramă, legendă în colț) */
export function desenLinie(cv, serii, xlab, ylab, titlu, xm = null) {
  const { g, w, h } = pregatesteCanvas(cv), m = { l: 58, r: 12, t: 26, b: 36 }, W = w - m.l - m.r, H = h - m.t - m.b;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  const pts = serii.flatMap((s) => s.pts).filter((p) => Number.isFinite(p[1]));
  if (!pts.length) return;
  let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  if (y1 === y0) { y1 += 1; y0 -= 1; } const dy = (y1 - y0) * 0.06; y0 -= dy; y1 += dy;
  const X = (x) => m.l + ((x - x0) / (x1 - x0)) * W, Y = (y) => m.t + H - ((y - y0) / (y1 - y0)) * H;
  g.strokeStyle = "#d9dde1"; g.lineWidth = 1; g.font = "9px system-ui"; g.fillStyle = "#333";
  for (let k = 0; k <= 8; k++) { const x = x0 + ((x1 - x0) * k) / 8; g.beginPath(); g.moveTo(X(x), m.t); g.lineTo(X(x), m.t + H); g.stroke(); g.textAlign = "center"; g.fillText(x.toFixed(0), X(x), m.t + H + 12); }
  for (let k = 0; k <= 6; k++) { const y = y0 + ((y1 - y0) * k) / 6; g.beginPath(); g.moveTo(m.l, Y(y)); g.lineTo(m.l + W, Y(y)); g.stroke(); g.textAlign = "right"; g.fillText(Math.abs(y) < 0.01 && y !== 0 ? y.toExponential(1) : y.toPrecision(3), m.l - 4, Y(y) + 3); }
  g.strokeStyle = "#555"; g.strokeRect(m.l, m.t, W, H);
  serii.forEach((s) => { g.strokeStyle = s.c || "#d9534f"; g.lineWidth = s.lw || 1.2; g.setLineDash(s.dash || []); g.beginPath(); let f = true; s.pts.forEach(([x, y]) => { if (!Number.isFinite(y)) { f = true; return; } f ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y)); f = false; }); g.stroke(); g.setLineDash([]); });
  if (xm != null) { g.strokeStyle = "#1d4f91"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(xm), m.t); g.lineTo(X(xm), m.t + H); g.stroke(); g.setLineDash([]); }
  g.fillStyle = "#111"; g.font = "10px system-ui"; g.textAlign = "center"; g.fillText(xlab, m.l + W / 2, h - 6); g.fillText(titlu, m.l + W / 2, 14);
  g.save(); g.translate(12, m.t + H / 2); g.rotate(-Math.PI / 2); g.fillText(ylab, 0, 0); g.restore();
  // legenda
  const lw = 130; g.fillStyle = "#fff"; g.strokeStyle = "#999"; g.fillRect(m.l + W - lw - 4, m.t + 4, lw, 14 * serii.length + 4); g.strokeRect(m.l + W - lw - 4, m.t + 4, lw, 14 * serii.length + 4);
  serii.forEach((s, k) => { const y = m.t + 14 + k * 14; g.strokeStyle = s.c || "#d9534f"; g.setLineDash(s.dash || []); g.beginPath(); g.moveTo(m.l + W - lw, y - 3); g.lineTo(m.l + W - lw + 18, y - 3); g.stroke(); g.setLineDash([]); g.fillStyle = "#222"; g.textAlign = "left"; g.fillText(s.nume, m.l + W - lw + 22, y); });
}

/** norul de puncte al designurilor (masa reținută – tumble), cu designul de bază și designul selectat */
export function desenNor(cv, D, sel, baza) {
  const { g, w, h } = pregatesteCanvas(cv), m = { l: 64, r: 14, t: 14, b: 44 }, W = w - m.l - m.r, H = h - m.t - m.b;
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); if (!D.length) return null;
  const xs = D.map((d) => d.rez.mIVC * 1e6), ys = D.map((d) => d.rez.tumble);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); const ex = (x1 - x0 || 1) * 0.08, ey = (y1 - y0 || 0.1) * 0.1; x0 -= ex; x1 += ex; y0 -= ey; y1 += ey;
  const X = (x) => m.l + ((x - x0) / (x1 - x0)) * W, Y = (y) => m.t + H - ((y - y0) / (y1 - y0)) * H;
  g.strokeStyle = "#e1e4e8"; g.font = "10px system-ui"; g.fillStyle = "#333";
  for (let k = 0; k <= 7; k++) { const x = x0 + ((x1 - x0) * k) / 7; g.beginPath(); g.moveTo(X(x), m.t); g.lineTo(X(x), m.t + H); g.stroke(); g.textAlign = "center"; g.fillText(x.toFixed(1), X(x), m.t + H + 13); }
  for (let k = 0; k <= 6; k++) { const y = y0 + ((y1 - y0) * k) / 6; g.beginPath(); g.moveTo(m.l, Y(y)); g.lineTo(m.l + W, Y(y)); g.stroke(); g.textAlign = "right"; g.fillText(y.toFixed(2), m.l - 4, Y(y) + 3); }
  g.strokeStyle = "#444"; g.strokeRect(m.l, m.t, W, H);
  g.font = "bold 13px system-ui"; g.fillStyle = "#111"; g.textAlign = "center"; g.fillText("Masa_cilindru [mg]", m.l + W / 2, h - 8);
  g.save(); g.translate(14, m.t + H / 2); g.rotate(-Math.PI / 2); g.fillText("Tumble_Y", 0, 0); g.restore();
  const pos = D.map((d) => [X(d.rez.mIVC * 1e6), Y(d.rez.tumble)]);
  pos.forEach(([x, y], k) => { g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fillStyle = k === sel ? "#0b3d3a" : "#2a8a84"; g.fill(); if (k === sel) { g.strokeStyle = "#000"; g.lineWidth = 2; g.strokeRect(x - 9, y - 9, 18, 18); g.lineWidth = 1; } });
  if (baza != null && pos[baza]) { const [x, y] = pos[baza]; g.fillStyle = "rgba(29,79,145,.35)"; g.strokeStyle = "#1d4f91"; g.fillRect(x - 7, y - 7, 14, 14); g.strokeRect(x - 7, y - 7, 14, 14); }
  return pos;
}

/** datele paralele pe axe radiale (diagrama „spider”): toate designurile, cel selectat îngroșat, cu valorile în casete */
export function desenParalel(cv, D, axe, sel) {
  const { g, w, h } = pregatesteCanvas(cv); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); if (!D.length) return;
  const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) * 0.36, n = axe.length;
  const lim = axe.map((a) => { const v = D.map(a.f); const mi = Math.min(...v), ma = Math.max(...v); return [mi, ma === mi ? mi + 1 : ma]; });
  const P = (k, t) => { const an = -Math.PI / 2 + (k / n) * Math.PI * 2; return [cx + R * t * Math.cos(an), cy + R * t * Math.sin(an)]; };
  g.strokeStyle = "#cfd4da"; g.lineWidth = 1; for (let r = 1; r <= 4; r++) { g.beginPath(); for (let k = 0; k <= n; k++) { const [x, y] = P(k % n, r / 4); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  axe.forEach((a, k) => { const [x, y] = P(k, 1.0); g.strokeStyle = "#666"; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
    g.fillStyle = "#111"; g.font = "bold 10px system-ui"; g.textAlign = x < cx - 5 ? "right" : x > cx + 5 ? "left" : "center"; g.fillText(a.nume, x + (x < cx ? -4 : 4), y + (y < cy ? -6 : 14)); });
  const linie = (d, st, lw) => { g.strokeStyle = st; g.lineWidth = lw; g.beginPath(); axe.forEach((a, k) => { const t = 0.15 + 0.85 * (a.f(d) - lim[k][0]) / (lim[k][1] - lim[k][0]), [x, y] = P(k, t); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); };
  D.forEach((d, k) => { if (k !== sel) linie(d, "rgba(42,138,132,.38)", 1); });
  if (D[sel]) { linie(D[sel], "#000", 2.6); axe.forEach((a, k) => { const v = a.f(D[sel]), t = 0.15 + 0.85 * (v - lim[k][0]) / (lim[k][1] - lim[k][0]), [x, y] = P(k, t), s = a.fmt(v);
    g.font = "11px system-ui"; const tw = g.measureText(s).width + 8; g.fillStyle = "#f4f2e6"; g.strokeStyle = "#333"; g.lineWidth = 1; g.fillRect(x - tw / 2, y - 9, tw, 17); g.strokeRect(x - tw / 2, y - 9, tw, 17); g.fillStyle = "#111"; g.textAlign = "center"; g.fillText(s, x, y + 4); }); }
}

/* ------------------------------------------------------------------ studiul */
function hipercub(N, seed = 7) {
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const perm = () => { const a = Array.from({ length: N }, (_, k) => k); for (let k = N - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  const p1 = perm(), p2 = perm(), p3 = perm();
  return Array.from({ length: N }, (_, k) => ({ theta: 15 + 30 * (p1[k] + rnd()) / N, b: -0.25 + 0.5 * (p2[k] + rnd()) / N, hps: 0.1 + 0.35 * (p3[k] + rnd()) / N }));
}


export function studiuPort(corp, ctx, U) {
  const t = ctx.tip, R = ctx.R;
  let g, n, eti;
  if (t === "MAS" || t === "MAC") { const d = R.date; g = { D: R.D_r / 1000, S: R.S_r / 1000, L: R.S_r / 2 / d.lam / 1000, eps: d.eps, dsa: d.dsa, isa: d.isa, dse: d.dse, ise: d.ise, tipMotor: d.tip, Lmax: 0.1 * R.D_r / 1000 }; n = d.n_P; eti = `${d.tip}, D × S = ${nr(R.D_r, 1)} × ${nr(R.S_r, 1)} mm, ε = ${d.eps}`; }
  else { const r = R.r, d = ctx.S.d; g = { D: r.D_cil / 1000, S: r.S_cil / 1000, L: r.S_cil / 2 / d.lam / 1000, eps: d.eps || 10, dsa: 20, isa: 50, dse: 50, ise: 20, tipMotor: "MAS", Lmax: 0.1 * r.D_cil / 1000 }; n = d.n_P; eti = `motocicletă 4T, D × S = ${nr(r.D_cil, 1)} × ${nr(r.S_cil, 1)} mm`; }
  const p0 = t === "MOTO" ? 1e5 : R.date.p_s * 1e6, T0 = t === "MOTO" ? 300 : R.date.T_s, aIVC = 180 + g.isa;
  /* solicitările motorului proiectat: presiunea pe ciclu → forța în bielă S(α) (gaze + inerție); biela prin MEF; câmpul termic al chiulasei */
  const S3 = (() => { let pa, mp, mb, Qw = null; const X = window.PCMAI_EXTRA;
    if (t === "MOTO") { pa = R.pa.map((q) => [q[0], q[2]]); mp = ctx.S.m.m_p; mb = ctx.S.m.m_b; }
    else { const Z = X.model0D(R); pa = X.pAlfa0D(R, Z); mp = X.MASE[R.date.tip].m_p; mb = X.MASE[R.date.tip].m_b; Qw = Z.Qw; }
    const Ap = Math.PI * g.D * g.D / 4, Rm = g.S / 2, lam = Rm / g.L, om = n * Math.PI / 30, mj = 1.3 * mp + 0.275 * mb, xs = pa.map((q) => q[0]);
    const pI = (a) => { let k = xs.findIndex((x) => x >= a); if (k <= 0) return pa[Math.max(0, k)][1]; const f = (a - xs[k - 1]) / (xs[k] - xs[k - 1]); return pa[k - 1][1] + f * (pa[k][1] - pa[k - 1][1]); };
    const forta = []; for (let a = 0; a <= 720; a++) { const ar = a * Math.PI / 180, acc = Rm * om * om * (Math.cos(ar) + lam * Math.cos(2 * ar)), F = (pI(a) - 0.1) * 1e6 * Ap - mj * acc; forta.push(F / Math.cos(Math.asin(lam * Math.sin(ar)))); }
    const fe = bielaMEF({ D: g.D, L: g.L }), mx = (v) => v.reduce((m, x) => Math.max(m, x), 0), vC = mx(fe.comp), vT = mx(fe.intin);
    let sMax = 0, aMax = 0; forta.forEach((S, a) => { const v = (S >= 0 ? vC : vT) * Math.abs(S) / 1e6; if (v > sMax) { sMax = v; aMax = a; } });
    const qM = Qw != null ? 0.35 * Qw * 1000 * (n / 120) / Ap : 1.0e6;
    const termic = chiulasaTermic({ D: g.D, xv: -0.25 * g.D, dv: 0.42 * g.D, q: qM });
    /* tabelul ciclului pentru simularea 3D completă: temperaturile din cilindrul închis (modelul 0D), cele două zone la ardere,
       evacuarea liberă (orificiu compresibil, destinderea izentropă a gazelor rămase) */
    const ciclu = (() => { const Rg = 287, ga = 1.33, Vc = Ap * g.S / (g.eps - 1), xP = (a) => { const r = a * Math.PI / 180; return Rm * (1 - Math.cos(r)) + g.L - Math.sqrt(g.L * g.L - (Rm * Math.sin(r)) ** 2); }, Vf = (a) => Vc + Ap * xP(a);
      const aIVC = 180 + g.isa, aEVO = 540 - g.dse, Z = t === "MOTO" ? null : window.PCMAI_EXTRA.model0D(R), pP = (a) => pI(a) * 1e6;
      const TIVC = Z ? Z.arr[0].T : 330, Tz = (a) => { if (!Z) return TIVC * pP(a) * Vf(a) / (pP(aIVC) * Vf(aIVC)); const f = a - 360, A = Z.arr, j = Math.max(0, Math.min(A.length - 1, Math.round((f - A[0].phi) / (A[1].phi - A[0].phi)))); return A[j].T; };
      const xbZ = (a) => { if (!Z) return 0; const A = Z.arr, f = a - 360, j = Math.max(0, Math.min(A.length - 1, Math.round((f - A[0].phi) / (A[1].phi - A[0].phi)))); return A[j].x; };
      const aS = Z ? 360 + Z.vp[0][1] : 345, pS = pP(aS), TS = Tz(aS);
      const T = { Tm: [], Tu: [], Tb: [], xb: [], yb: [], div: [], inchis: [], evac: [] };
      // evacuarea liberă
      const durE = 180 + g.dse + g.ise, Le = (a) => { const f = ((a - aEVO) % 720 + 720) % 720; return f <= durE ? g.Lmax * Math.sin(Math.PI * f / durE) ** 2 : 0; }, Ae = (a) => Math.PI * 0.42 * g.D * Le(a);
      const pE = 1.05e5, TE0 = Tz(aEVO), pE0 = pP(aEVO), VE0 = Vf(aEVO), mE0 = pE0 * VE0 / (Rg * TE0), ev = {}; let m = mE0;
      for (let a = aEVO; a <= 720 + 1e-9; a += 0.25) { const V = Vf(a), p = pE0 * Math.pow(m / mE0, ga) * Math.pow(VE0 / V, ga), Tg = p * V / (m * Rg), r = pE / p, rc = Math.pow(2 / (ga + 1), ga / (ga - 1));
        const psi = p <= pE ? 0 : r <= rc ? Math.sqrt(ga) * Math.pow(2 / (ga + 1), (ga + 1) / (2 * (ga - 1))) : Math.sqrt(2 * ga / (ga - 1) * (Math.pow(r, 2 / ga) - Math.pow(r, (ga + 1) / ga)));
        const mdot = 0.7 * Ae(a) * p / Math.sqrt(Rg * Tg) * psi, dVdt = (Vf(a + 0.25) - V) / (0.25 * Math.PI / 180 / om);
        if (Math.abs(a - Math.round(a)) < 1e-9) ev[Math.round(a)] = { Tm: Tg, div: dVdt / V + mdot / m, p };
        m = Math.max(1e-9, m - mdot * 0.25 * Math.PI / 180 / om); }
      for (let a = 0; a <= 720; a++) {
        const inch = a >= aIVC && a < aEVO, evc = a >= aEVO, xb = inch ? xbZ(a) : 0, Tm = evc ? ev[a].Tm : inch ? Tz(a) : TIVC;
        const Tu = inch && a >= aS ? TS * Math.pow(pP(a) / pS, 0.35 / 1.35) : Tm;
        let Tb = xb > 0.05 ? Math.min(3200, Math.max(Tu, (Tm - (1 - xb) * Tu) / xb)) : Tu + 2000;
        const yb = xb * Tb / (xb * Tb + (1 - xb) * Tu || 1);
        T.Tm.push(Tm); T.Tu.push(Tu); T.Tb.push(Tb); T.xb.push(xb); T.yb.push(yb); T.div.push(evc ? ev[a].div : 0); T.inchis.push(inch ? 1 : 0); T.evac.push(evc ? 1 : 0); }
      const p_ = (a) => (a >= aEVO && ev[Math.round(a)] ? ev[Math.round(a)].p : pP(a));
      return Object.assign(T, { T0, Tr: T.Tm[720], aIVC, aEVO, aS, p: p_, TbMax: Math.max(...T.Tb.filter((x, k) => T.xb[k] > 0.05)), Le, a90: (() => { for (let a = aS; a < aEVO; a++) if (T.xb[a] >= 0.9) return a; return aS + 40; })() }); })();
    return { forta, fe, sMax, aMax, Smax: Math.max(...forta), Smin: Math.min(...forta), termic, qM, qEstimat: Qw == null, vC, vT, ciclu }; })();
  corp.innerHTML = `<div class="po-bara"><label>designuri <select data-p="N"><option>12</option><option selected>24</option><option>36</option></select></label>
      <label>rețeaua planului <select data-p="nx"><option value="14">14 celule pe alezaj</option><option value="16" selected>16 celule pe alezaj</option><option value="20">20 celule pe alezaj</option></select></label>
      <label>rețeaua designului afișat <select data-p="nd"><option value="24">24 celule pe alezaj</option><option value="28" selected>28 celule pe alezaj</option><option value="36">36 celule pe alezaj</option></select></label>
      <button type="button" class="primar" data-a="run">Rulează planul de experimente 3D</button><div class="mod-progres"><i></i></div><span class="po-stare nota"></span></div>
    <p class="nota">Calcul CFD 3D al canalului de admisie și al cilindrului motorului proiectat (${eti}, ${n} rot/min, faze dsa ${g.dsa}° / îsa ${g.isa}°, ridicarea maximă ${nr(g.Lmax * 1e3, 1)} mm), de la deschiderea admisiei până la PMS-comprimare. Parametrii canalului: unghiul θ, deplasarea cotului b și înălțimea înainte de scaun h<sub>ps</sub>. Unghiurile sunt în °RAC cu 0 = PMS la începutul admisiei; tumble pozitiv = tumble direct (jetul trece peste supapă spre evacuare și coboară pe cămașa de acolo).</p>
    <h3 class="po-h">Simularea 3D a ciclului complet – admisia, comprimarea, arderea, destinderea, evacuarea (designul afișat)</h3>
    <div class="po-3d"><div class="po-3d-sc mod-scena"><p class="nota" style="padding:1rem">Se calculează designul de bază…</p></div></div>
    <div class="po-faze" role="group" aria-label="Faza"><span>Faza:</span><button type="button" data-f="tot" aria-pressed="true">Ciclul complet</button><button type="button" data-f="adm">Admisia</button><button type="button" data-f="comp">Comprimarea</button><button type="button" data-f="ard">Arderea</button><button type="button" data-f="dest">Destinderea</button><button type="button" data-f="evac">Evacuarea</button>
      <span class="po-sep"></span><button type="button" data-a="pas-">◀ 1°</button><button type="button" data-a="ingheata">❄ Îngheață</button><button type="button" data-a="pas+">1° ▶</button>
      <label>mărimea afișată <select data-a="camp"><option value="v">viteza</option><option value="T">temperatura</option></select></label></div>
    <div class="po-anim"><button type="button" data-a="play">⏸ Pauză</button><label>viteza <select data-a="vit"><option value="10">×0,25</option><option value="20">×0,5</option><option value="40" selected>×1</option><option value="80">×2</option></select></label>
      <label>α <input type="range" data-a="alfa" min="0" max="720" step="1" value="0" style="width:280px"></label><output data-a="av">0</output>°RAC
      <label><input type="checkbox" data-v="contur" checked> secțiunea mediană</label><label><input type="checkbox" data-v="orizontal" checked> planul orizontal</label><label><input type="checkbox" data-v="vectori" checked> vectori</label><label><input type="checkbox" data-v="particule" checked> particule</label><label><input type="checkbox" data-v="mef" checked> biela – tensiuni (MEF)</label><label><input type="checkbox" data-v="termic"> chiulasa – temperatură</label>
      <label>scala vitezei <input type="number" data-a="vmax" min="5" step="5" style="width:5rem"> m/s</label><label title="aerul cu viteza sub acest procent din scală nu se colorează (zonele în repaus, de exemplu canalul cu supapa închisă)">pragul de afișare <input type="number" data-a="prag" value="4" min="0" max="50" step="1" style="width:4rem"> %</label></div>
    <h3 class="po-h">Tabloul de post-procesare</h3>
    <div class="po-tablou">
      <div class="po-col"><div class="po-pan"><div class="po-t" data-t="c0"></div><canvas class="po-c"></canvas></div><div class="po-pan"><div class="po-t" data-t="c1"></div><canvas class="po-c"></canvas></div><div class="po-pan"><div class="po-t" data-t="c2"></div><canvas class="po-c"></canvas></div></div>
      <div class="po-col po-mij"><div class="po-pan"><div class="po-t">Optimizare canal admisie: Masa_cilindru vs. Tumble</div><canvas class="po-c po-nor"></canvas></div><div class="po-pan"><div class="po-t">Optimizare canal admisie: Date paralele</div><canvas class="po-c po-par"></canvas></div></div>
      <div class="po-col"><div class="po-pan"><div class="po-t" data-t="m"></div><canvas class="po-c"></canvas></div><div class="po-pan"><div class="po-t" data-t="tb"></div><canvas class="po-c"></canvas></div><div class="po-pan"><div class="po-t" data-t="k"></div><canvas class="po-c"></canvas></div></div>
    </div>
    <div class="po-tablou po-sol"><div class="po-pan"><div class="po-t" data-t="mef">Biela – tensiunea echivalentă von Mises (MEF)</div><canvas class="po-c po-mef"></canvas></div><div class="po-pan"><div class="po-t">Chiulasa – temperatura plăcii de foc (regim staționar)</div><canvas class="po-c po-ter"></canvas></div></div>
    <div class="mod-rez"></div><div class="mod-ver"></div>`;
  const $q = (s) => corp.querySelector(s), cvs = [...corp.querySelectorAll(".po-col:first-child canvas")], cvR = [...corp.querySelectorAll(".po-col:last-child canvas")];
  const st = { D: [], sel: 0, baza: 0, det: null, k: 0, ruleaza: true, vit: 40, W: [], wd: null, v3: null, gata: 0 };
  const axe = [{ nume: "Canal_θ", f: (d) => d.par.theta, fmt: (v) => v.toFixed(1) }, { nume: "Cot_b/D", f: (d) => d.par.b, fmt: (v) => v.toFixed(3) }, { nume: "PreScaun_h/D", f: (d) => d.par.hps, fmt: (v) => v.toFixed(3) },
    { nume: "Masa_cilindru", f: (d) => d.rez.mIVC * 1e6, fmt: (v) => v.toFixed(1) }, { nume: "TKE_cilindru", f: (d) => d.rez.tke, fmt: (v) => v.toFixed(2) }, { nume: "Tumble", f: (d) => d.rez.tumble, fmt: (v) => v.toFixed(3) }];
  const titlu = (k, s) => { const e = corp.querySelector(`[data-t="${k}"]`); if (e) e.textContent = s; };
  const lucrator = () => new Worker(new URL("./port-worker.js?v=5", import.meta.url), { type: "module" });
  const stare = (s) => { $q(".po-stare").textContent = s; };
  function ruleaza() {
    st.W.forEach((w) => w.terminate()); st.W = [];
    const N = +$q('[data-p="N"]').value, Ng = +$q('[data-p="nx"]').value, des = [{ theta: 30, b: 0, hps: 0.25 }].concat(hipercub(N - 1)).map((par, k) => ({ k, par }));
    const nW = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
    st.D = []; st.baza = 0; st.N = N; st.gata = 0; st.nW = nW; st.best = null; $q(".mod-progres i").style.width = "0%";
    stare(`se simulează în 3D ${N} designuri (${nW} fire de calcul în paralel)…`);
    for (let w = 0; w < nW; w++) { const W = lucrator(); W.onmessage = mesaj; W.onerror = (e) => stare("eroare în simulare: " + e.message); W.postMessage({ tip: "doe", designs: des.filter((_, k) => k % nW === w), g, n, N: Ng, p0, T0, itP: 25, particule: 1 }); st.W.push(W); }
    detaliu(0);
  }
  function detaliu(k) {
    st.sel = k; const d = st.D[k] || { par: { theta: 30, b: 0, hps: 0.25 } }, N = +$q('[data-p="nd"]').value;
    stare(`se calculează în 3D designul ${k} pe rețeaua fină (${N} celule pe alezaj)…`);
    if (st.wd) st.wd.terminate(); st.wd = lucrator(); st.wd.onmessage = mesaj; st.wd.onerror = (e) => stare("eroare în simulare: " + e.message);
    const cc = S3.ciclu; st.wd.postMessage({ tip: "detaliu", par: d.par, g, n, N, pasCadru: 2, p0, T0, itP: 30, particule: 3000, a1: 720,
      ciclu: { T0: cc.T0, Tr: cc.Tr, Tm: cc.Tm, Tu: cc.Tu, Tb: cc.Tb, xb: cc.xb, yb: cc.yb, div: cc.div, inchis: cc.inchis, evac: cc.evac } });
    redesen();
  }
  function mesaj(e) {
    const m = e.data;
    if (m.tip === "design") { st.D[m.k] = { par: m.par, rez: m.rez }; const nf = st.D.filter(Boolean).length; $q(".mod-progres i").style.width = `${(nf / st.N) * 100}%`; stare(`design ${nf} din ${st.N} simulat în 3D…`); redesen(); }
    if (m.tip === "gata" && ++st.gata === st.nW) {
      const D = st.D, nm = (f) => { const v = D.map(f), a = Math.min(...v), b = Math.max(...v); return (x) => (x - a) / (b - a || 1); }, ft = nm((d) => d.rez.tumble), fm = nm((d) => d.rez.mIVC);
      let best = 0; D.forEach((d, k) => { if (ft(d.rez.tumble) + fm(d.rez.mIVC) > ft(D[best].rez.tumble) + fm(D[best].rez.mIVC)) best = k; });
      st.best = best; stare(`${D.length} designuri simulate în 3D; designul de compromis: ${best}. Clic pe un punct din nor pentru alt design.`); rezultate(); detaliu(best); }
    if (m.tip === "progres") stare(`designul ${st.sel} pe rețeaua fină: α = ${Math.round(m.a)}°RAC…`);
    if (m.tip === "detaliu") {
      st.det = m; st.k = 0; const v = [];
      { const kk = m.K.filter((q) => q[0] >= 340 && q[0] <= 360).map((q) => q[1]); if (kk.length) window.PCMAI_CFD = { uTDC: Math.sqrt((2 / 3) * kk.reduce((x, y) => x + y, 0) / kk.length), design: st.sel }; }
      m.cadre.forEach((c) => { if (c.a < 30 || c.a > 200) return; for (let j = 0; j < c.M.length; j += 2) if (!c.T[j]) v.push(c.M[j]); }); v.sort((a, b) => a - b);
      st.vmax = Math.max(5, Math.ceil((v.length ? v[Math.floor(v.length * 0.99)] : 50) / 5) * 5); $q('[data-a="vmax"]').value = st.vmax;
      if (st.v3) st.v3.distruge(); const gz = $q(".po-3d-sc"); gz.innerHTML = "";
      st.v3 = scenaPort3D(gz, creeazaGeometrie(g, m.par), m, { fe: S3.fe, forta: S3.forta, sMax: S3.sMax, termic: S3.termic }); st.v3.st.vmax = st.vmax; st.v3.st.prag = Math.max(0, +$q('[data-a="prag"]').value || 0) / 100; corp.querySelectorAll("[data-v]").forEach((x) => (st.v3.st[x.dataset.v] = x.checked));
      st.v3.st.camp = $q('[data-a="camp"]').value; legendaCamp(); st.v3.coloreazaChiulasa(); leg2();
      stare(`designul ${st.sel} (rețea ${m.nx} × ${m.ny} × ${m.nz} = ${m.celule.toLocaleString("ro-RO")} celule, ${nr(m.ms / 1000, 1)} s): m = ${nr(m.mIVC * 1e6, 1)} mg, η_v = ${nr(m.etaV, 3)}, C_d = ${nr(m.CdM, 3)}`);
      redesen(); rezultate(); }
  }
  function leg2() { if (!st.v3) return; const v = st.v3.st;
    if (v.mef) st.v3.legenda2("Tensiunea echivalentă (von Mises) – biela", `MEF, starea plană de tensiune · scara: maximul pe ciclu (α = ${S3.aMax}°)`, 0, S3.sMax, "MPa");
    else if (v.termic) st.v3.legenda2("Temperatura – chiulasa", "conducție staționară, placa de foc", S3.termic.Tmin, S3.termic.Tmax, "°C"); else st.v3.legenda2(null); }
  function desenMEF(a) { const cv = $q(".po-mef"), { g: c2, w, h } = pregatesteCanvas(cv), fe = S3.fe, S = S3.forta[Math.round(Math.max(0, Math.min(720, a)))], camp = S >= 0 ? fe.comp : fe.intin;
    c2.fillStyle = "#f2f4f6"; c2.fillRect(0, 0, w, h); const xs = fe.nod.map((p) => p[0]), ys = fe.nod.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sc = Math.min((w - 190) / (y1 - y0), (h - 30) / (x1 - x0)), ox = 150, oy = h / 2;   // biela culcată (axa pe orizontală)
    const P = (p) => [ox + (p[1] - y0) * sc, oy - p[0] * sc]; let vmx = 0, kmx = 0;
    fe.T.forEach((t) => { const v = (camp[t[0]] + camp[t[1]] + camp[t[2]]) / 3 * Math.abs(S) / 1e6; const c = culoareJet(v / S3.sMax); c2.fillStyle = `rgb(${c.join(",")})`; c2.strokeStyle = c2.fillStyle; c2.beginPath(); t.forEach((q, j) => { const [X, Y] = P(fe.nod[q]); j ? c2.lineTo(X, Y) : c2.moveTo(X, Y); }); c2.closePath(); c2.fill(); c2.stroke(); });
    fe.nod.forEach((p, k) => { const v = camp[k] * Math.abs(S) / 1e6; if (v > vmx) { vmx = v; kmx = k; } });
    c2.strokeStyle = "#1b2026"; c2.lineWidth = 0.8; c2.beginPath(); fe.contur.forEach(([a1, b1]) => { const [X1, Y1] = P(fe.nod[a1]), [X2, Y2] = P(fe.nod[b1]); c2.moveTo(X1, Y1); c2.lineTo(X2, Y2); }); c2.stroke();
    const [mx, my] = P(fe.nod[kmx]); c2.fillStyle = "#d62020"; c2.fillRect(mx + 6, my - 20, 34, 15); c2.fillStyle = "#fff"; c2.font = "bold 10px system-ui"; c2.fillText("Max", mx + 11, my - 9); c2.strokeStyle = "#d62020"; c2.beginPath(); c2.moveTo(mx, my); c2.lineTo(mx + 6, my - 12); c2.stroke();
    // legenda verticală
    c2.font = "10px system-ui"; for (let k = 0; k < 10; k++) { const tt = 1 - k / 9, c = culoareJet(tt); c2.fillStyle = `rgb(${c.join(",")})`; c2.fillRect(10, 34 + k * 17, 14, 17); c2.fillStyle = "#111"; c2.fillText((S3.sMax * tt).toFixed(1) + (k ? "" : " Max"), 28, 46 + k * 17); }
    c2.font = "bold 10px system-ui"; c2.fillText("σ_ech von Mises [MPa]", 8, 14); c2.font = "10px system-ui"; c2.fillText(`α = ${Math.round(a)}°RAC · S = ${nr(S / 1000, 1)} kN (${S >= 0 ? "compresiune" : "întindere"}) · max ${nr(vmx, 1)} MPa`, 8, 27); }
  function desenTermic() { const cv = $q(".po-ter"), { g: c2, w, h } = pregatesteCanvas(cv), th = S3.termic; c2.fillStyle = "#f2f4f6"; c2.fillRect(0, 0, w, h);
    const sc = Math.min((w - 110) / (2 * th.XH), (h - 30) / (2 * th.ZH)), ox = 100, oy = 18;
    for (let k = 0; k < th.nz; k++) for (let i = 0; i < th.nx; i++) { const c = k * th.nx + i; if (th.tip[c]) { c2.fillStyle = "#1b2026"; } else { const col = culoareJet((th.T[c] - th.Tmin) / (th.Tmax - th.Tmin)); c2.fillStyle = `rgb(${col.join(",")})`; } c2.fillRect(ox + i * th.dx * sc, oy + k * th.dz * sc, th.dx * sc + 0.6, th.dz * sc + 0.6); }
    c2.font = "10px system-ui"; for (let k = 0; k < 10; k++) { const tt = 1 - k / 9, c = culoareJet(tt); c2.fillStyle = `rgb(${c.join(",")})`; c2.fillRect(8, 30 + k * 17, 14, 17); c2.fillStyle = "#111"; c2.fillText((th.Tmin + (th.Tmax - th.Tmin) * tt).toFixed(0), 26, 42 + k * 17); }
    c2.font = "bold 10px system-ui"; c2.fillText("T [°C]", 8, 14); c2.font = "10px system-ui"; c2.fillText("admisie ←   → evacuare", ox + th.XH * sc - 55, h - 4); }
  function cadru(a) { const C = st.det.cadre; let b = C[0]; for (const c of C) if (Math.abs(c.a - a) < Math.abs(b.a - a)) b = c; return b; }
  function redesen() {
    desenMEF(st.k); desenTermic();
    const D = st.D.filter(Boolean), pos = desenNor($q(".po-nor"), D, st.sel, st.baza); st.pos = pos;
    desenParalel($q(".po-par"), D, axe, st.sel);
    if (st.det) {
      const geo = { nx: st.det.nx, ny: st.det.ny }, ang = [st.k, 90, aIVC];
      ang.forEach((a, j) => { titlu("c" + j, `Optimizare canal admisie: ${Math.round(a)} °RAC – Design ${st.sel} · secțiunea z = 0`); desenCamp(cvs[j], cadru(a), geo, st.vmax, `Unghiul de RAC: ${a.toFixed(1)} (°)`); });
      const base = st.D[st.baza], cuB = base && st.sel !== st.baza;
      titlu("m", `Masa în cilindru – Design ${st.sel}`); desenLinie(cvR[0], [{ nume: "Masa_cilindru", pts: st.det.M.filter((q, j) => j % 4 === 0).map(([a, m]) => [a, m * 1e6]) }], "Unghiul de RAC (°)", "Masa în cilindru (mg)", "Masa în cilindru", st.k);
      titlu("tb", `Tumble, tumble transversal și swirl – Design ${st.sel}`); desenLinie(cvR[1], [{ nume: "Tumble", pts: st.det.T }, { nume: "Tumble transversal", pts: st.det.X, c: "#2a8a84" }, { nume: "Swirl", pts: st.det.W, c: "#1d4f91" }, ...(cuB ? [{ nume: "Tumble (bază, plan)", pts: base.rez.T, c: "#7a8796", dash: [4, 3] }] : [])], "Unghiul de RAC (°)", "raportul (–)", "Mișcarea încărcăturii", st.k);
      titlu("k", `TKE – Design ${st.sel}`); desenLinie(cvR[2], [{ nume: "TKE cilindru", pts: st.det.K }, ...(cuB ? [{ nume: "TKE (bază, plan)", pts: base.rez.K, c: "#7a8796", dash: [4, 3] }] : [])], "Unghiul de RAC (°)", "TKE (m²/s²)", "Energia cinetică turbulentă rezolvată în cilindru", st.k);
    }
  }
  function rezultate() {
    const D = st.D, b = D[st.baza], s = D[st.sel]; if (!b || !s || !D.length) return;
    $q(".mod-rez").innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Design</th><th class="num">θ [°]</th><th class="num">b/D</th><th class="num">h<sub>ps</sub>/D</th><th class="num">Tumble (PME)</th><th class="num">Swirl (PME)</th><th class="num">m reținută [mg]</th><th class="num">η<sub>v</sub></th><th class="num">TKE max compr. [m²/s²]</th><th class="num">C<sub>d</sub> mediu</th></tr></thead><tbody>
      ${D.map((d, k) => `<tr${k === st.sel ? ' style="font-weight:600"' : ""}><td>${k}${k === st.baza ? " (bază)" : ""}${k === st.best ? " (compromis)" : ""}</td><td class="num">${nr(d.par.theta, 1)}</td><td class="num">${nr(d.par.b, 3)}</td><td class="num">${nr(d.par.hps, 3)}</td><td class="num">${nr(d.rez.tumble, 3)}</td><td class="num">${nr(d.rez.swirl, 3)}</td><td class="num">${nr(d.rez.mIVC * 1e6, 1)}</td><td class="num">${nr(d.rez.etaV, 3)}</td><td class="num">${nr(d.rez.tke, 2)}</td><td class="num">${nr(d.rez.Cd, 3)}</td></tr>`).join("")}</tbody></table></div>
      <p class="nota">Modelul: ecuațiile Euler incompresibile 3D cu compresibilitate uniformă după închiderea supapei (Mach mic), rețea carteziană decalată cu frontiere imersate (pistonul și supapa mobile), advecție semi-lagrangiană cu interpolare triliniară, proiecție cu ecuația Poisson (SOR roșu-negru). Masa reținută provine din modelul de umplere 0D al cilindrului cu coeficientul de debit al supapei obținut din câmpul 3D. TKE este energia cinetică a fluctuațiilor rezolvate față de câmpul filtrat local (fără model de turbulență); particulele-trasor sunt fără masă.</p>`;
    let dT = null; if (st.det && JSON.stringify(st.det.par) === JSON.stringify(s.par)) { const at = (a) => (st.det.T.find((q) => q[0] >= a) || [0, 0])[1]; dT = at(180); }
    const corr = (() => { const x = D.map((d) => d.rez.mIVC), y = D.map((d) => d.rez.tumble), mx = x.reduce((a, c) => a + c, 0) / x.length, my = y.reduce((a, c) => a + c, 0) / y.length; let sxy = 0, sx = 0, sy = 0; x.forEach((v, k) => { sxy += (v - mx) * (y[k] - my); sx += (v - mx) ** 2; sy += (y[k] - my) ** 2; }); return sxy / Math.sqrt(sx * sy || 1); })();
    $q(".mod-ver").innerHTML = `<h3>Concluzii</h3>${concluzie(corr < 0 ? "ok" : "av", `Coeficientul de corelație între masa reținută și tumble pe cele ${D.length} designuri este ${nr(corr, 2)}: ${corr < 0 ? "canalele care generează mai mult tumble restrâng debitul (compromisul umplere – mișcarea încărcăturii)" : "în domeniul explorat nu apare compromisul tipic umplere – tumble"}.`)}
      ${concluzie("ok", `Designul ${st.sel} față de cel de bază: tumble ${nr(s.rez.tumble, 3)} (bază ${nr(b.rez.tumble, 3)}), masa reținută ${nr(s.rez.mIVC * 1e6, 1)} mg (bază ${nr(b.rez.mIVC * 1e6, 1)} mg), TKE la sfârșitul comprimării ${nr(s.rez.tke, 2)} (bază ${nr(b.rez.tke, 2)}) m²/s².`)}
      ${dT != null ? concluzie(Math.abs(dT - s.rez.tumble) < 0.3 * Math.max(0.3, Math.abs(dT)) ? "ok" : "av", `Studiul de rețea: tumble la PME ${nr(s.rez.tumble, 3)} pe rețeaua planului și ${nr(dT, 3)} pe rețeaua fină (${st.det.N} celule pe alezaj)${Math.abs(dT - s.rez.tumble) < 0.3 * Math.max(0.3, Math.abs(dT)) ? "" : ": rețeaua planului este prea grosieră pentru valori absolute; ierarhia designurilor se verifică recalculând câteva designuri pe rețeaua fină"}.`) : ""}
      ${concluzie(Math.abs(S3.fe.sigMed / S3.fe.sigAn - 1) < 0.02 ? "ok" : "av", `Biela (MEF, ${S3.fe.n} noduri, ${S3.fe.ne} elemente): tensiunea medie la mijlocul tijei, pentru 1 N, este ${S3.fe.sigMed.toExponential(4)} Pa față de F/A = ${S3.fe.sigAn.toExponential(4)} Pa. Forța în bielă pe ciclu: ${nr(S3.Smax / 1000, 1)} kN la compresiune, ${nr(-S3.Smin / 1000, 1)} kN la întindere; tensiunea echivalentă maximă ${nr(S3.sMax, 1)} MPa la α = ${S3.aMax}° (concentrarea la racordarea tijei cu ochiul).`)}
      ${concluzie(S3.termic.bilant < 1e-6 ? "ok" : "av", `Chiulasa: fluxul mediu de căldură pe camera de ardere ${nr(S3.qM / 1e6, 2)} MW/m²${S3.qEstimat ? " (valoare de referință; modelul 0D nu este disponibil pentru acest tip)" : " (35 % din căldura cedată pereților în modelul 0D)"}; ${nr(S3.termic.Qin, 0)} W intrați = ${nr(S3.termic.Qout, 0)} W preluați de lichid; temperatura maximă ${nr(S3.termic.Tmax, 0)} °C, pe puntea dintre supape spre evacuare.`)}
      ${concluzie("nd", "Fără model de turbulență și fără perete vâscos, valorile absolute ale tumble-ului și TKE au incertitudinea rețelei; ierarhia designurilor și tendințele sunt rezultatul utilizabil al studiului.")}`;
  }
  $q('[data-a="run"]').addEventListener("click", ruleaza);
  $q(".po-nor").addEventListener("click", (e) => { if (!st.pos) return; const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let b = -1, dm = 1e9; st.pos.forEach(([px, py], k) => { const d = Math.hypot(px - x, py - y); if (d < dm) { dm = d; b = k; } }); if (b >= 0 && dm < 20) detaliu(b); });
  const bp = $q('[data-a="play"]'), sl = $q('[data-a="alfa"]');
  const cc = S3.ciclu, FAZE = { tot: [0, 720], adm: [0, cc.aIVC], comp: [cc.aIVC, cc.aS], ard: [cc.aS - 5, cc.a90 + 10], dest: [cc.aS, cc.aEVO], evac: [cc.aEVO, 720] };
  st.faza = FAZE.tot;
  const opreste = (b) => { st.ruleaza = !b; bp.textContent = st.ruleaza ? "⏸ Pauză" : "▶ Pornește"; const g_ = $q('[data-a="ingheata"]'); g_.setAttribute("aria-pressed", b); g_.textContent = b ? "❄ Înghețat – reia" : "❄ Îngheață"; };
  corp.querySelectorAll(".po-faze [data-f]").forEach((b) => b.addEventListener("click", () => { corp.querySelectorAll(".po-faze [data-f]").forEach((x) => x.setAttribute("aria-pressed", x === b)); st.faza = FAZE[b.dataset.f]; st.k = st.faza[0]; opreste(false); redesen(); }));
  $q('[data-a="ingheata"]').addEventListener("click", () => opreste(st.ruleaza));
  [["pas-", -1], ["pas+", 1]].forEach(([a, d]) => $q(`[data-a="${a}"]`).addEventListener("click", () => { opreste(true); st.k = Math.max(0, Math.min(720, Math.round(st.k) + d)); redesen(); }));
  $q('[data-a="camp"]').addEventListener("change", (e) => { if (!st.v3) return; st.v3.st.camp = e.target.value; st.v3.st.reface = true; legendaCamp(); });
  function legendaCamp() { if (!st.v3) return; if (st.v3.st.camp === "T") { st.v3.st.Tmin = Math.round(cc.T0 / 50) * 50; st.v3.st.Tmax = Math.ceil(cc.TbMax / 100) * 100; st.v3.legenda(st.v3.st.Tmax, (x) => nr(x, 0), "Temperatura", "K", st.v3.st.Tmin); } else st.v3.legenda(st.vmax, (x) => nr(x, 0)); }
  bp.addEventListener("click", () => opreste(st.ruleaza));
  $q('[data-a="vit"]').addEventListener("change", (e) => { st.vit = +e.target.value; });
  sl.addEventListener("input", () => { st.k = +sl.value; st.ruleaza = false; bp.textContent = "▶ Pornește"; redesen(); });
  $q('[data-a="vmax"]').addEventListener("change", (e) => { st.vmax = Math.max(1, +e.target.value || st.vmax); if (st.v3) { st.v3.st.vmax = st.vmax; st.v3.legenda(st.vmax, (x) => nr(x, 0)); } redesen(); });
  $q('[data-a="prag"]').addEventListener("change", (e) => { if (st.v3) { st.v3.st.prag = Math.max(0, +e.target.value || 0) / 100; st.v3.st.reface = true; } });
  corp.querySelectorAll("[data-v]").forEach((x) => x.addEventListener("change", () => { if (st.v3) { st.v3.st[x.dataset.v] = x.checked; st.v3.st.reface = true; if (x.dataset.v === "termic") st.v3.coloreazaChiulasa(); leg2(); } }));
  window.addEventListener("resize", () => redesen());
  ruleaza();
  let tg = 0;
  return {
    pas(dt) { if (!st.det) return; const [fa, fb] = st.faza; if (st.ruleaza) { st.k += dt * st.vit; if (st.k > fb || st.k < fa) st.k = fa; } const c = cadru(st.k);
      if (st.v3) { st.v3.pozeaza(st.k); const a = Math.round(st.k), fz = a < cc.aIVC ? "admisia" : a < cc.aS ? "comprimarea" : a < cc.a90 ? "arderea" : a < cc.aEVO ? "destinderea" : "evacuarea", la = (k) => ((st.det[k] || []).find((q) => q[0] >= c.a) || [0, 0])[1];
        st.v3.sc.hud(`α = <b>${a}°</b> RAC · <b>${fz}</b> · supapa de admisie ${nr((c.L || 0) * 1e3, 1)} mm · de evacuare ${nr((c.LE || 0) * 1e3, 1)} mm<br>p = <b>${nr(cc.p(a) / 1e6, 2)} MPa</b> · T medie = <b>${nr(cc.Tm[a], 0)} K</b>${cc.xb[a] > 0.001 ? ` · x<sub>b</sub> = <b>${nr(cc.xb[a] * 100, 0)} %</b>` : ""} · tumble ${nr(la("T"), 2)} · TKE ${nr(la("K"), 1)} m²/s²`); }
      tg += dt; if (tg > 0.12) { tg = 0; desenMEF(st.k); const geo = { nx: st.det.nx, ny: st.det.ny }; titlu("c0", `Optimizare canal admisie: ${Math.round(st.k)} °RAC – Design ${st.sel} · secțiunea z = 0`); desenCamp(cvs[0], c, geo, st.vmax, `Unghiul de RAC: ${c.a.toFixed(1)} (°)`); if (document.activeElement !== sl) sl.value = Math.round(st.k); $q('[data-a="av"]').textContent = Math.round(st.k); } },
    raport() { return $q(".mod-rez").innerHTML + $q(".mod-ver").innerHTML; },
    distruge() { st.W.forEach((w) => w.terminate()); if (st.wd) st.wd.terminate(); if (st.v3) st.v3.distruge(); }
  };
}
