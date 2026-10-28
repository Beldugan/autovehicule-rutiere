/* Web Worker: simulările CFD 3D ale canalului de admisie și ale cilindrului (planul experimentelor numerice și detaliul unui design). */
import * as F from "./cfd2d.js?v=2";
import { creeazaSolver3D } from "./cfdcil3d.js?v=1";
const rar = (a, k) => a.filter((_, j) => j % k === 0);
// convenția de semn: tumble pozitiv = tumble „direct” (jetul trece peste supapă spre partea evacuării și coboară pe cămașa de acolo)
const semn = (ser) => ser.forEach((r) => { r.tumble = -r.tumble; });
function calcul(d, par, N, pasCadru, laCadru) {
  const geo = F.creeazaGeometrie(d.g, par), s = creeazaSolver3D(geo, { N, particule: d.particule || 2500 });
  const ser = s.ruleaza(d.n, 0, 360, 1, d.itP || 30, pasCadru, laCadru ? (a, r, c) => { if (c) laCadru(c, s); } : null);
  semn(ser);
  const f = F.umplere0D(geo, ser, { n: d.n, p0: d.p0, T0: d.T0 });
  return { s, ser, f, geo };
}
onmessage = (e) => {
  const d = e.data;
  if (d.tip === "doe") {
    d.designs.forEach(({ k, par }) => {
      const { ser, f } = calcul(d, par, d.N, 0, null);
      const at = (a) => ser.find((r) => r.a >= a) || ser[ser.length - 1], tke = ser.filter((r) => r.a >= 300).reduce((m, r) => Math.max(m, r.tke), 0);
      postMessage({ tip: "design", k, par, rez: { tumble: at(180).tumble, swirl: at(180).swirl, mIVC: f.mIVC, etaV: f.etaV, tke, Cd: f.CdM,
        T: rar(ser, 2).map((r) => [r.a, r.tumble]), K: rar(ser, 2).map((r) => [r.a, r.tke]), M: rar(f.serie, 8).map((q) => [q.a, q.m]) } });
    });
    postMessage({ tip: "gata" });
  } else if (d.tip === "detaliu") {
    const cadre = [], buf = [];
    const t0 = Date.now();
    const { s, ser, f, geo } = calcul(d, d.par, d.N, d.pasCadru, (c) => {
      cadre.push(c); buf.push(c.M.buffer, c.U.buffer, c.V.buffer, c.T.buffer, c.Mh.buffer, c.Uh.buffer, c.Wh.buffer, c.Th.buffer, c.P.buffer, c.Pv.buffer);
      if (cadre.length % 10 === 0) postMessage({ tip: "progres", a: c.a });
    });
    postMessage({ tip: "detaliu", par: d.par, N: d.N, nx: s.nx, ny: s.ny, nz: s.nz, h: s.h, x0: s.x0, y0: s.y0, z0: s.z0, celule: s.n, ms: Date.now() - t0, cadre,
      T: ser.map((r) => [r.a, r.tumble]), X: ser.map((r) => [r.a, r.cross]), W: ser.map((r) => [r.a, r.swirl]), K: ser.map((r) => [r.a, r.tke]), Cd: ser.map((r) => [r.a, r.Cd]),
      M: f.serie.map((q) => [q.a, q.m]), mIVC: f.mIVC, etaV: f.etaV, CdM: f.CdM }, buf);
  }
};
