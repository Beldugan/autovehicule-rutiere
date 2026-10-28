/* Web Worker: rulează simulările CFD 2D ale canalului de admisie (planul experimentelor numerice și detaliul unui design). */
import * as F from "./cfd2d.js";
const rar = (a, k) => a.filter((_, j) => j % k === 0);
onmessage = (e) => {
  const d = e.data;
  if (d.tip === "doe") {
    d.designs.forEach((par, k) => {
      const geo = F.creeazaGeometrie(d.g, par), s = F.creeazaSolver(geo, { nx: d.nx }), ser = s.ruleaza(d.n, 0, 360, 1, null, 40), f = F.umplere0D(geo, ser, { n: d.n, p0: d.p0, T0: d.T0 });
      const at = (a) => ser.find((r) => r.a >= a) || ser[ser.length - 1], tke = ser.filter((r) => r.a >= 300).reduce((m, r) => Math.max(m, r.tke), 0);
      postMessage({ tip: "design", k, par, rez: { tumble: at(180).tumble, mIVC: f.mIVC, etaV: f.etaV, tke, Cd: f.CdM,
        T: rar(ser, 2).map((r) => [r.a, r.tumble]), K: rar(ser, 2).map((r) => [r.a, r.tke]), M: rar(f.serie, 8).map((q) => [q.a, q.m]) } });
    });
    postMessage({ tip: "gata" });
  } else if (d.tip === "detaliu") {
    const geo = F.creeazaGeometrie(d.g, d.par), s = F.creeazaSolver(geo, { nx: d.nx }), cadre = [];
    const ser = s.ruleaza(d.n, 0, 360, 1, (a) => { if (Math.round(a) % d.pasCadru === 0) { const c = s.camp(); cadre.push({ a, M: c.M, U: c.U, V: c.V, T: c.T }); } }, 50);
    const f = F.umplere0D(geo, ser, { n: d.n, p0: d.p0, T0: d.T0 });
    postMessage({ tip: "detaliu", par: d.par, nx: s.nx, ny: s.ny, x0: s.x0, y0: s.y0, dx: s.dx, cadre, lm: geo.lm, wP: geo.wP, D: geo.D, xv: geo.xv, dv: geo.dv,
      T: ser.map((r) => [r.a, r.tumble]), K: ser.map((r) => [r.a, r.tke]), Cd: ser.map((r) => [r.a, r.Cd]), L: ser.map((r) => [r.a, r.L]), M: f.serie.map((q) => [q.a, q.m]), mIVC: f.mIVC, etaV: f.etaV, CdM: f.CdM },
      cadre.flatMap((c) => [c.M.buffer, c.U.buffer, c.V.buffer, c.T.buffer]));
  }
};
