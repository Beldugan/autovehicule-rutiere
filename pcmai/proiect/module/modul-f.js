/* Modulul F – câmpuri: curgerea în canalul de admisie și mișcarea încărcăturii (planul de experimente numerice CFD 3D), arderea,
   comprimarea în cilindru (volume finite 1D pe rețea mobilă, ecuațiile Euler), placa de răcire a bateriei (conducția în placă
   cuplată cu lichidul din canalele în serpentină). Fiecare câmp are testul de referință analitic și studiul de rețea. */
import { grafic, lim, fx, tabelVerificare, concluzie, comutatorStudii, turboColor } from "./scena.js";
import { creeazaCompresie, izentrop, placaRacire } from "./cfd.js";
import { placaCFD } from "./cfd3d.js";
import { cilindruReal } from "./cilindru-real.js?v=5";
import { ardereMAS, testFlacaraLibera, sprayMAC } from "./ardere.js?v=2";
import { studiuPort } from "./port-ui.js?v=11";
import { creeazaUI } from "./ui.js";

const U = creeazaUI("post-procesare a câmpurilor calculate");
const nr = (v, d = 2) => fx(v, d);
const serie = (xs, ys, culoare, o = {}) => Object.assign({ tip: "linie", pts: xs.map((x, j) => [x, ys[j]]), culoare }, o);
const yl = (arrs, cu0 = true) => { const l = lim(arrs.flat(), cu0); return { ymin: l[0], ymax: l[1] }; };
const cuPct = (s) => [s, { tip: "pct", pts: s.pts, culoare: s.culoare }];
const asteapta = () => new Promise((r) => setTimeout(r, 0));

/* ------------------------------------------------------------------ geometria motorului proiectat */
function geoMotor(ctx) {
  const { tip, R, S } = ctx; if (!R) return null;
  if (tip === "MAS" || tip === "MAC") { const d = R.date; return { D: R.D_r / 1000, S: R.S_r / 1000, L: R.S_r / 2 / d.lam / 1000, eps: d.eps, n: d.n_P, tip: d.tip, dist: { dsa: d.dsa, isa: d.isa, dse: d.dse, ise: d.ise }, p0: R.p_a * 1e6, T0: R.T_a, n1: R.n_1, pc: R.p_c * 1e6, Tc: R.T_c, et: `${d.tip}, ${d.P_nom} kW la ${d.n_P} rot/min` }; }
  if (tip === "MOTO" && R.r) { const r = R.r, d = S.d; return { D: r.D_cil / 1000, S: r.S_cil / 1000, L: r.S_cil / 2 / d.lam / 1000, eps: d.eps || 10, n: d.n_P, tip: "MAS", p0: 0.9e5, T0: 330, et: `motocicletă ${d.tau}T` }; }
  return null;
}

/* ================================================================== comprimarea în cilindru */
function studiuCompresie(corp, ctx, referinta) {
  const gm = referinta ? { D: 0.08, S: 0.08, L: 0.14, eps: 10, n: 2000, p0: 1e5, T0: 300, et: "cilindrul de referință D = S = 80 mm, ε = 10" } : geoMotor(ctx);
  if (!gm) { corp.innerHTML = `<div class="mod-incomplet">Lipsesc dimensiunile motorului (capitolele de calcul termic și dimensionare).</div>`; return null; }
  const par = `${U.camp("N", "numărul de volume finite (rețeaua de bază)", referinta ? 40 : 40, 10)}${U.camp("dA", "pasul de înregistrare", 1, 0.5, "°RAC")}${U.camp("n", "turația", gm.n, 100, "rot/min")}
    ${U.camp("p0", "presiunea la PME (α = 180°)", nr(gm.p0 / 1e5, 4).replace(",", "."), 0.01, "bar")}${U.camp("T0", "temperatura la PME", Math.round(gm.T0), 1, "K")}${U.camp("eps", "raportul de comprimare ε", gm.eps, 0.1)}
    ${U.alege("cmp", "mărimea afișată", [["T", "temperatura T"], ["p", "presiunea p"], ["u", "viteza u"]], "T")}`;
  const z = U.zonaLucru(corp, "", par), sc3 = z.sc3;
  const st = U.redare(z, 181, (k) => `${180 + k}° RAC`, 2);
  const G = { p: grafic(z.graf, "Presiunea medie în cilindru: volume finite și izentropa"), T: grafic(z.graf, "Temperatura medie a gazului"), m: grafic(z.graf, "Conservarea masei: abaterea relativă ΔM/M₀"), c: grafic(z.graf, "Profilul în lungul cilindrului (de la chiulasă la piston) la unghiul curent") };
  let S0 = null, cil = null, ret = [], lim3 = null;
  async function calc() {
    const p = U.citeste(z.par), o = { D: gm.D, S: gm.S, L: gm.L, eps: p.eps, n: p.n, p0: p.p0 * 1e5, T0: p.T0, a0: 180, a1: 360 };
    z.rez.innerHTML = `<p class="nota">Se rezolvă comprimarea pe trei rețele și doi pași…</p>`; z.ver.innerHTML = "";
    const N0 = Math.max(10, Math.round(p.N)), caz = [[N0 / 2, p.dA], [N0, p.dA], [N0 * 2, p.dA], [N0, p.dA / 2]];
    ret = [];
    for (const [N, dA] of caz) { await asteapta(); const s = creeazaCompresie(Object.assign({}, o, { N: Math.round(N), dAlfa: dA })); const t0 = performance.now(); s.avanseaza(360); ret.push({ N: Math.round(N), dA, s, ms: performance.now() - t0 }); }
    S0 = ret[1].s; const iz = izentrop(o.p0, o.T0, p.eps), f = S0.iesire[S0.iesire.length - 1];
    lim3 = { T: [o.T0, f.Tmax], p: [o.p0 / 1e5, f.p / 1e5 * 1.02], u: [-Math.max(...S0.iesire.map((q) => Math.max(...q.camp.u.map(Math.abs)))), 0] };
    U.SC.goleste(U.SC.grup); cil = cilindruReal({ D: gm.D, S: gm.S, L: gm.L, eps: p.eps, tip: gm.tip || "MAS", dist: gm.dist }); U.SC.grup.add(cil.G);
    cil.pozeaza(180, gm.T0, 0, 0, gm.T0, gm.T0 + 1, 0, turboColor); sc3.vedere("sect", [-1, 0, 0]); sc3.incadreaza([1, 0.35, 0.45], [0, 0, 0]); { const t = sc3.ctl.target; sc3.camera.position.sub(t).multiplyScalar(1.1).add(t); sc3.ctl.update(); }
    const fin = ret.map((r) => r.s.iesire[r.s.iesire.length - 1]);
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Rețeaua / pasul</th><th class="num">p la PMS [bar]</th><th class="num">T la PMS [K]</th><th class="num">ΔM/M₀ maxim</th><th class="num">pași de timp</th><th class="num">timp de calcul [ms]</th></tr></thead><tbody>
      ${ret.map((r, k) => `<tr><td>${r.N} volume, ${nr(r.dA, 1)}°</td><td class="num">${nr(fin[k].p / 1e5, 3)}</td><td class="num">${nr(fin[k].T, 2)}</td><td class="num">${Math.max(...r.s.iesire.map((q) => Math.abs(q.dM))).toExponential(1)}</td><td class="num">${r.s.pasi}</td><td class="num">${nr(r.ms, 0)}</td></tr>`).join("")}
      <tr><td><b>Izentropa</b> p₀ε<sup>γ</sup>, T₀ε<sup>γ−1</sup></td><td class="num">${nr(iz.p2 / 1e5, 3)}</td><td class="num">${nr(iz.T2, 2)}</td><td></td><td></td><td></td></tr>
      ${!referinta && gm.pc ? `<tr><td>Calculul termic (politropa n₁ = ${nr(gm.n1, 3)})</td><td class="num">${nr(gm.pc / 1e5, 3)}</td><td class="num">${nr(gm.Tc, 2)}</td><td></td><td></td><td></td></tr>` : ""}</tbody></table></div>
      <p class="nota">Ecuațiile Euler 1D pe rețea mobilă (formularea arbitrar lagrangian-euleriană): reconstrucție MUSCL, fluxuri HLL pe fețele mobile, integrare Runge–Kutta de ordinul 2; pistonul este peretele mobil al domeniului, chiulasa perete fix. Gazul: aer, γ = 1,4, R = 287 J/(kg·K), fără transfer de căldură.</p>`;
    const eP = Math.abs(fin[2].p - fin[1].p) / fin[2].p * 100, ordin = Math.log(Math.abs(fin[0].p - fin[1].p) / Math.max(1e-12, Math.abs(fin[1].p - fin[2].p))) / Math.log(2);
    z.ver.innerHTML = `<h3>Verificare</h3>${tabelVerificare([["Presiunea la PMS", "p_c", f.p / 1e5, iz.p2 / 1e5, "bar", 3, 0.5], ["Temperatura la PMS", "T_c", f.T, iz.T2, "K", 2, 0.5], ["Masa din cilindru la PMS", "M", f.M * 1e6, S0.M0 * 1e6, "mg", 3, 0.01]], "Comprimarea adiabatică – reper izentrop")}
      <h3>Concluzii</h3>${concluzie(eP < 0.5 ? "ok" : "av", `Dublarea rețelei schimbă presiunea finală cu ${nr(eP, 3)} %; ordinul aparent al convergenței este ${Number.isFinite(ordin) ? nr(ordin, 2) : "—"}.`)}
      ${concluzie("ok", `Masa se conservă la precizia mașinii (abaterea maximă ${Math.max(...S0.iesire.map((q) => Math.abs(q.dM))).toExponential(1)}): fluxurile de pe fețele mobile sunt conservative.`)}
      ${!referinta && gm.pc ? concluzie("av", `Calculul termic folosește politropa n₁ = ${nr(gm.n1, 3)} &lt; γ (căldura cedată pereților): p<sub>c</sub> = ${nr(gm.pc / 1e5, 2)} bar față de ${nr(f.p / 1e5, 2)} bar adiabatic. Diferența (${nr((f.p - gm.pc) / gm.pc * 100, 1)} %) măsoară efectul transferului de căldură, care lipsește din acest model.`) : ""}
      ${concluzie("nd", "Mișcarea încărcăturii (tumble, swirl) și gradienții radiali nu există într-un model 1D: aceștia rezultă din studiul canalului de admisie.")}`;
    grafice();
  }
  const cel = (k) => S0.iesire[Math.max(0, Math.min(S0.iesire.length - 1, Math.round(k)))];
  function grafice() {
    if (!S0) return; const A = S0.iesire, a = A.map((q) => q.a), q = cel(st.k), xt = [180, 210, 240, 270, 300, 330, 360];
    G.p.deseneaza({ xmin: 180, xmax: 360, xticks: xt, xlab: "α [°RAC]", ylab: "p [bar]", ...yl([A.map((r) => r.p / 1e5)]), serii: [serie(a, A.map((r) => r.pIs / 1e5), 1, { punctat: true }), serie(a, A.map((r) => r.p / 1e5), 0), ...ret.filter((_, k) => k !== 1).map((r, k) => serie(r.s.iesire.map((x) => x.a), r.s.iesire.map((x) => x.p / 1e5), 2 + k, { gros: 0.6 })), { tip: "pct", pts: [[q.a, q.p / 1e5]], culoare: 0 }],
      legenda: [["volume finite", 0], ["izentropa", 1], ["alte rețele / pași", 2]] });
    G.T.deseneaza({ xmin: 180, xmax: 360, xticks: xt, xlab: "α [°RAC]", ylab: "T [K]", ...yl([A.map((r) => r.T)], false), serii: [serie(a, A.map((r) => r.TIs), 1, { punctat: true }), serie(a, A.map((r) => r.T), 0), { tip: "pct", pts: [[q.a, q.T]], culoare: 0 }], legenda: [["volume finite", 0], ["izentropa", 1]] });
    G.m.deseneaza({ xmin: 180, xmax: 360, xticks: xt, xlab: "α [°RAC]", ylab: "ΔM/M₀ × 10¹⁵", ...yl([A.map((r) => r.dM * 1e15)]), serii: [serie(a, A.map((r) => r.dM * 1e15), 3)] });
    const cmp = U.citeste(z.par).cmp, v = cmp === "T" ? q.camp.T : cmp === "p" ? q.camp.p.map((x) => x / 1e5) : q.camp.u, N = v.length, xs = v.map((_, j) => (j + 0.5) / N);
    G.c.deseneaza({ xmin: 0, xmax: 1, xlab: "poziția relativă (0 = chiulasa, 1 = pistonul)", ylab: { T: "T [K]", p: "p [bar]", u: "u [m/s]" }[cmp], ...yl([v], cmp === "u"), serii: cuPct(serie(xs, v, 0, { gros: 1.4 })) });
  }
  z.par.addEventListener("change", (e) => { if (e.target.dataset.p === "cmp") { grafice(); return; } calc(); });
  calc();
  let tg = 0;
  return {
    pas(dt) {
      if (!S0 || !cil) return;
      if (st.ruleaza) st.k = (st.k + dt * 30 * st.viteza / 2) % 181;
      const q = cel(st.k), cmp = U.citeste(z.par).cmp, scU = gm.D * 0.02;
      const v = cmp === "T" ? q.camp.T : cmp === "p" ? q.camp.p.map((x) => x / 1e5) : q.camp.u, l = lim3[cmp];
      const vm = cmp === "u" ? v.reduce((x, y) => x + Math.abs(y), 0) / v.length : v.reduce((x, y) => x + y, 0) / v.length; void scU;
      cil.pozeaza(q.a, vm, 0, 0, cmp === "u" ? 0 : l[0], cmp === "u" ? Math.max(1e-9, -l[0]) : l[1], 0, turboColor);
      U.SC.legenda({ T: "Temperatura", p: "Presiunea", u: "Viteza axială" }[cmp], l[0], l[1], { T: "K", p: "bar", u: "m/s" }[cmp]);
      U.SC.hud(`α = <b>${nr(q.a, 0)}°</b> RAC · comprimarea<br>p = <b>${nr(q.p / 1e5, 2)} bar</b> · T = <b>${nr(q.T, 0)} K</b> · izentropa: ${nr(q.pIs / 1e5, 2)} bar`);
      st.afis(); tg += dt; if (tg > 0.2) { tg = 0; grafice(); }
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ================================================================== placa de răcire a bateriei */
function dateBaterie(ctx) {
  const R = ctx.R, c = R && (ctx.tip === "LCV" ? (R.cFull || R.c) : R.c);
  if (c && c.bat) { const b = c.bat, E = window.EV || window.LCV, em = (c.drives && c.drives[0] && c.drives[0].em) || c.em, U0 = b.U_nom ?? b.U_n, R0 = b.U_nom != null && E && E.rPack ? E.rPack(b, 25) : b.R0;
    if (U0 > 0 && R0 > 0) { const P = em && em.P ? em.P * 0.5 : b.P_dis ? b.P_dis * 0.5 : 30, En = b.E_nom ?? b.E;
      return { U: U0, Rint: R0, P, E: En, et: `${b.ns ? `${b.ns}s${b.np}p, ` : ""}${nr(U0, 0)} V, ${nr(En, 1)} kWh` }; } }
  return { U: 300, Rint: 0.15, P: 30, E: 1.5, et: "baterie hibridă de referință 300 V" };
}
function studiuPlaca(corp, ctx, referinta) {
  const b = dateBaterie(ctx), I0 = b.P * 1e3 / b.U, Q0 = referinta ? 1000 : Math.round(I0 * I0 * b.Rint);
  const par = `${referinta ? "" : `${U.camp("P", "puterea de descărcare susținută", nr(b.P, 1).replace(",", "."), 1, "kW")}${U.camp("Ri", "rezistența internă a pachetului", nr(b.Rint, 4).replace(",", "."), 0.001, "Ω")}`}
    ${U.camp("Q", "căldura generată (I²·R<sub>int</sub>)", Q0, 10, "W")}${U.camp("md", "debitul de lichid", 0.1, 0.01, "kg/s")}${U.camp("Tin", "temperatura la intrare", 25, 1, "°C")}${U.camp("h", "coeficientul de convecție în canal", 1500, 50, "W/(m²·K)")}
    ${U.camp("Lx", "lungimea plăcii", 1.2, 0.05, "m")}${U.camp("Ly", "lățimea plăcii", 0.8, 0.05, "m")}${U.camp("t", "grosimea plăcii (aluminiu)", 3, 0.5, "mm")}${U.camp("np", "numărul de treceri ale canalului", 8, 1)}${U.camp("lc", "lățimea canalului", 20, 1, "mm")}
    ${U.alege("nx", "rețeaua", [["60", "60 × 40"], ["90", "90 × 60"], ["120", "120 × 80"]], "90")}`;
  const z = U.zonaLucru(corp, "", par), sc3 = z.sc3;
  const G = { tf: grafic(z.graf, "Temperatura lichidului în lungul canalului"), tp: grafic(z.graf, "Temperatura plăcii pe linia mediană (x)"), r: grafic(z.graf, "Studiul de rețea: T<sub>max</sub> placă și ΔT lichid") };
  let rz = null, vis = null, rs = [];
  async function calc() {
    const p = U.citeste(z.par);
    if (!referinta && (z.par.querySelector('[data-p="P"]') === document.activeElement || z.par.querySelector('[data-p="Ri"]') === document.activeElement || calc.dinPR)) { const I = p.P * 1e3 / b.U; z.par.querySelector('[data-p="Q"]').value = Math.round(I * I * p.Ri); p.Q = Math.round(I * I * p.Ri); }
    calc.dinPR = false;
    const o = (nx) => ({ Lx: p.Lx, Ly: p.Ly, t: p.t / 1000, k: 205, Q: p.Q, md: p.md, cp: 4180, Tin: p.Tin, h: p.h, lc: p.lc / 1000, nTreceri: Math.round(p.np), nx, ny: Math.round(nx * 2 / 3), module: { nx: 4, ny: 2, umplere: 0.86 } });
    z.rez.innerHTML = `<p class="nota">Se rezolvă placa pe trei rețele…</p>`; z.ver.innerHTML = "";
    rs = []; for (const nx of [60, 90, 120]) { await asteapta(); const t0 = performance.now(), r = placaRacire(o(nx)); r.ms = performance.now() - t0; r.nxg = nx; rs.push(r); }
    rz = rs.find((r) => r.nxg === +p.nx) || rs[1];
    U.SC.goleste(U.SC.grup); vis = placaCFD(rz, o(rz.nxg)); U.SC.grup.add(vis.G); vis.coloreaza(rz, p.Tin, rz.Tmax);
    sc3.vedere("transp"); sc3.incadreaza([0.55, 0.75, 0.9], [0, 0, 0]);
    U.SC.legenda("Temperatura", p.Tin, rz.Tmax, "°C"); U.SC.hud(`Q = <b>${nr(p.Q, 0)} W</b> · ṁ = <b>${nr(p.md, 3)} kg/s</b><br>T<sub>max</sub> placă = <b>${nr(rz.Tmax, 2)} °C</b> · T ieșire lichid = <b>${nr(p.Tin + rz.dTf, 2)} °C</b>`);
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Rețeaua</th><th class="num">T<sub>max</sub> placă [°C]</th><th class="num">T medie [°C]</th><th class="num">ΔT lichid [K]</th><th class="num">bilanț lichid</th><th class="num">iterații cuplaj / GC</th><th class="num">timp [ms]</th></tr></thead><tbody>
      ${rs.map((r) => `<tr${r === rz ? ' style="font-weight:600"' : ""}><td>${r.nx} × ${r.ny}</td><td class="num">${nr(r.Tmax, 3)}</td><td class="num">${nr(r.Tmed, 3)}</td><td class="num">${nr(r.dTf, 4)}</td><td class="num">${r.bilantLichid.toExponential(1)}</td><td class="num">${r.it} / ${r.itCG}</td><td class="num">${nr(r.ms, 0)}</td></tr>`).join("")}</tbody></table></div>
      <table class="tabel"><tbody><tr><td>Lungimea canalului; viteza; Re</td><td>${nr(rz.Lcan, 2)} m; ${nr(rz.w, 3)} m/s; ${nr(rz.Re, 0)} (${rz.Re < 2300 ? "laminar" : "turbulent"})</td></tr><tr><td>Pierderea de presiune (Darcy–Weisbach + coturi)</td><td>${nr(rz.dp / 1000, 2)} kPa; puterea de pompare ${nr(rz.dp * p.md / 998, 2)} W</td></tr>
      ${referinta ? "" : `<tr><td>Bateria proiectată</td><td>${b.et}; I = ${nr(p.P * 1e3 / b.U, 1)} A la ${nr(p.P, 1)} kW</td></tr>`}</tbody></table>
      <p class="nota">Conducția în planul plăcii (volume finite, gradient conjugat precondiționat), sursele uniforme pe amprenta modulelor, schimbul convectiv către lichid; lichidul se calculează prin marș în lungul canalului (soluția exponențială NTU pe fiecare celulă), iterând cuplajul până la închiderea bilanțului.</p>`;
    const dTan = p.Q / (p.md * 4180), eR = Math.abs(rs[2].Tmax - rs[1].Tmax);
    z.ver.innerHTML = `<h3>Verificare</h3>${tabelVerificare([["Încălzirea lichidului", "ΔT_f", rz.dTf, dTan, "K", 4, 0.1], ["Căldura preluată de lichid", "ṁ·c_p·ΔT", p.md * 4180 * rz.dTf, p.Q, "W", 2, 0.1]], "Bilanțul global – reper Q / (ṁ·c<sub>p</sub>)")}
      <h3>Concluzii</h3>${concluzie(eR < 0.25 ? "ok" : "av", `Între rețelele 90 × 60 și 120 × 80, temperatura maximă a plăcii se schimbă cu ${nr(eR, 3)} K.`)}
      ${concluzie(rz.Tmax - p.Tin < 15 ? "ok" : "av", `Neuniformitatea plăcii este ${nr(rz.Tmax - rz.Tmin, 2)} K, iar temperatura maximă depășește intrarea lichidului cu ${nr(rz.Tmax - p.Tin, 2)} K${rz.Tmax - p.Tin < 15 ? "" : ": se mărește debitul, numărul de treceri sau coeficientul de convecție"}.`)}
      ${concluzie("nd", "Temperatura celulelor este mai mare decât a plăcii (rezistențele termice ale modulului și ale materialului de interfață nu sunt modelate); coeficientul de convecție este un dat, nu rezultă din câmpul de curgere din canal.")}`;
    grafice(p);
  }
  function grafice(p) {
    if (!rz) return; const n = rz.Tf.length, xs = Array.from({ length: n }, (_, k) => (k / (n - 1)) * rz.Lcan);
    G.tf.deseneaza({ xmin: 0, xmax: rz.Lcan, xlab: "lungimea parcursă în canal [m]", ylab: "T lichid [°C]", ...yl([Array.from(rz.Tf)], false), serii: [serie(xs, Array.from(rz.Tf), 0)] });
    const j = Math.floor(rz.ny / 2), xp = Array.from({ length: rz.nx }, (_, i) => (i + 0.5) / rz.nx * p.Lx), vp = xp.map((_, i) => rz.T[j * rz.nx + i]);
    G.tp.deseneaza({ xmin: 0, xmax: p.Lx, xlab: "x [m]", ylab: "T placă [°C]", ...yl([vp], false), serii: [serie(xp, vp, 1)] });
    const ns = rs.map((r) => r.nx * r.ny);
    G.r.deseneaza({ xmin: 0, xmax: Math.max(...ns) * 1.1, xlab: "numărul de celule", ylab: "T_max − T_in [K] · ΔT lichid [K]", ...yl([rs.map((r) => r.Tmax - p.Tin), rs.map((r) => r.dTf)]), serii: [...cuPct(serie(ns, rs.map((r) => r.Tmax - p.Tin), 0)), ...cuPct(serie(ns, rs.map((r) => r.dTf), 2))], legenda: [["T_max − T_in", 0], ["ΔT lichid", 2]] });
  }
  z.par.addEventListener("change", (e) => { if (e.target.dataset.p === "P" || e.target.dataset.p === "Ri") calc.dinPR = true; calc(); });
  calc();
  return { raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}

/* ================================================================== arderea / injecția */
function studiuArdere(corp, ctx) {
  const R = ctx.R, X = window.PCMAI_EXTRA, gm = geoMotor(ctx), mac = ctx.tip === "MAC";
  if (!gm || !X || !R.date) { corp.innerHTML = `<div class="mod-incomplet">Arderea se calculează pentru MAS și MAC (lipsesc rezultatele calculului termic).</div>`; return null; }
  const d = R.date, Z = X.model0D(R), A = Z.arr, phiArr = A.map((q) => q.phi), vp0 = Z.vp;
  const intp = (f, k) => { let j = phiArr.findIndex((x) => x >= f); if (j <= 0) return A[Math.max(0, j)][k]; const a = A[j - 1], b = A[j], t = (f - a.phi) / (b.phi - a.phi); return a[k] + t * (b[k] - a[k]); };
  const pf = (f) => intp(f, "p") * 1e6, Tf = (f) => intp(f, "T"), cm = (gm.S * gm.n) / 30, phi0 = vp0[0][1];
  const cfd = window.PCMAI_CFD && window.PCMAI_CFD.uTDC;
  const par = mac
    ? `${U.camp("pinj", "presiunea de injecție", 1600, 50, "bar")}${U.camp("d0", "diametrul orificiilor", 0.13, 0.01, "mm")}${U.camp("nh", "numărul de orificii", 7, 1)}${U.camp("cd", "coeficientul de debit", 0.7, 0.01)}${U.camp("soi", "începutul injecției (° față de PMI)", Math.round(phi0 - 6), 0.5)}${U.camp("rb", "raza camerei din piston", nr(0.33 * gm.D * 1000, 1).replace(",", "."), 0.5, "mm")}`
    : `${U.alege("usrc", "intensitatea turbulenței u'", [["cm", "0,75 · c_m (corelație)"], ...(cfd ? [["cfd", "din CFD 3D al canalului"]] : [])], "cm")}${U.camp("up", "u' la aprindere", nr(0.75 * cm, 2).replace(",", "."), 0.1, "m/s")}${U.camp("phis", "aprinderea – scânteia (° față de PMI)", phi0 - 8, 0.5)}${U.camp("lam", "coeficientul excesului de aer λ", d.alfa ?? 1, 0.01)}${U.camp("xr", "fracția de gaze reziduale", nr(d.g_r ?? 0.06, 3).replace(",", "."), 0.005)}${U.camp("N", "eșantioane de volum", 12000, 1000)}`;
  const z = U.zonaLucru(corp, mac ? "" : `<button type="button" data-a="calib">Avansul pentru MFB50 al legii Vibe</button>`, par), sc3 = z.sc3;
  const cil = cilindruReal({ D: gm.D, S: gm.S, L: gm.L, eps: gm.eps, tip: d.tip, dist: gm.dist }); U.SC.grup.add(cil.G);
  sc3.vedere("sect", [-1, 0, 0]); sc3.incadreaza([1, 0.25, 0.35], [0, 0, 0]); { const t = sc3.ctl.target; t.y += 0.15 * gm.D; sc3.camera.position.sub(t).multiplyScalar(0.8).add(t); sc3.ctl.update(); }
  const Tmn = Math.min(...A.map((q) => q.T)), Tmx = Math.max(Z.T_max, 2900);
  U.SC.legenda("Temperatura gazelor", Tmn, Tmx, "K", (v) => nr(v, 0));
  const G = mac ? { s: grafic(z.graf, "Penetrația jeturilor (Hiroyasu–Arai) și raza camerei din piston"), x: grafic(z.graf, "Fracția arsă: modelul 0D (Vibe) și momentul autoaprinderii"), p: grafic(z.graf, "Presiunea și temperatura în cilindru (modelul 0D)") }
    : { x: grafic(z.graf, "Fracția de masă arsă: front de flacără (3D cvasidimensional) și legea Vibe (0D)"), r: grafic(z.graf, "Raza și aria frontului de flacără în camera reală"), v: grafic(z.graf, "Viteza laminară S_L, viteza de antrenare u' + S_L"), p: grafic(z.graf, "Presiunea: modelul cu front de flacără (adiabatic) și modelul 0D") };
  let Q = null, a0 = 0, a1 = 0;
  function calc() {
    const p = U.citeste(z.par);
    if (!mac) {
      if (p.usrc === "cfd" && cfd) { p.up = cfd; z.par.querySelector('[data-p="up"]').value = nr(cfd, 2).replace(",", "."); }
      const t0 = performance.now();
      Q = ardereMAS({ D: gm.D, S: gm.S, L: gm.L, eps: gm.eps, n: gm.n, lambda: p.lam, xr: p.xr, phiS: p.phis, pf, Ts: Tf(p.phis), uP: p.up, N: Math.round(p.N) }); Q.ms = performance.now() - t0;
      const vib = (f) => vp0.reduce((s_, [fr, f0, df, m]) => s_ + fr * (f <= f0 ? 0 : 1 - Math.exp(-6.908 * Math.pow((f - f0) / df, m + 1))), 0);
      const ang = (x) => { for (let f = -60; f < 150; f += 0.05) if (vib(f) >= x) return f; return NaN; };
      Q.vibe = { MFB10: ang(0.1), MFB50: ang(0.5), MFB90: ang(0.9), f: vib };
      const pmQ = Math.max(...Q.out.map((q) => q.p)), kq = Q.out.findIndex((q) => q.p === pmQ), Tz = testFlacaraLibera();
      a0 = Math.floor(p.phis - 25); a1 = Math.ceil(Q.out[Q.out.length - 1].phi + 10);
      z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Mărime</th><th class="num">Front de flacără (3D cvasidimensional)</th><th class="num">Legea Vibe (0D, modulul S)</th><th>Unitate</th></tr></thead><tbody>
        <tr><td>MFB10 / MFB50 / MFB90</td><td class="num">${nr(Q.MFB10, 1)} / ${nr(Q.MFB50, 1)} / ${nr(Q.MFB90, 1)}</td><td class="num">${nr(Q.vibe.MFB10, 1)} / ${nr(Q.vibe.MFB50, 1)} / ${nr(Q.vibe.MFB90, 1)}</td><td>° după PMI</td></tr>
        <tr><td>Durata arderii 10–90 %</td><td class="num">${nr(Q.MFB90 - Q.MFB10, 1)}</td><td class="num">${nr(Q.vibe.MFB90 - Q.vibe.MFB10, 1)}</td><td>°RAC</td></tr>
        <tr><td>Presiunea maximă / unghiul ei</td><td class="num">${nr(pmQ / 1e6, 3)} la ${nr(Q.out[kq].phi, 1)}°</td><td class="num">${nr(Z.p_max, 3)} la ${nr(Z.phi_pmax, 1)}°</td><td>MPa</td></tr>
        <tr><td>Viteza laminară la aprindere; u'; scara Taylor λ<sub>T</sub></td><td class="num" colspan="2">${nr(Q.out[0].SL, 3)} m/s; ${nr(p.up, 2)} m/s (c<sub>m</sub> = ${nr(cm, 2)} m/s); ${nr(Q.lamT * 1e3, 3)} mm</td><td></td></tr>
        <tr><td>Camera de ardere: înălțimea acoperișului; jocul de strivire; ΔT<sub>ad</sub></td><td class="num" colspan="2">${nr(Q.hr * 1e3, 1)} mm; ${nr(Q.hs * 1e3, 2)} mm; ${nr(Q.dTad, 0)} K</td><td></td></tr>
        <tr><td>Pași de calcul / timp</td><td class="num" colspan="2">${Q.out.length} pași de 0,5°, ${Math.round(p.N)} eșantioane de volum, ${nr(Q.ms, 0)} ms</td><td></td></tr></tbody></table></div>
        <p class="nota">Modelul cvasidimensional cu front de flacără (Blizard–Keck): frontul sferic pornește din bujie și înglobează amestecul cu viteza u' + S<sub>L</sub>; amestecul înglobat arde în spatele frontului cu timpul λ<sub>T</sub>/S<sub>L</sub>. Aria frontului este partea sferei aflată în camera reală (cilindrul cu pistonul la unghiul curent și acoperișul în două pante), calculată prin eșantionarea volumului. Viteza laminară Metghalchi–Keck pentru benzină. Presiunea rezultă din bilanțul volumelor celor două zone (gaze nearse comprimate izentrop, gaze arse cu T<sub>u</sub> + ΔT<sub>ad</sub>), fără transfer de căldură.</p>`;
      const dm = Q.MFB50 - Q.vibe.MFB50;
      z.ver.innerHTML = `<h3>Verificare</h3>${tabelVerificare([["Raza flăcării sferice libere după 4 ms", "r_f", Tz.r * 1e3, Tz.rAn * 1e3, "mm", 4, 0.5]], "Reperul analitic: flacăra sferică liberă, r = (ρ<sub>u</sub>/ρ<sub>b</sub>)·S<sub>L</sub>·t")}
        <h3>Concluzii</h3>${concluzie(Math.abs(dm) < 6 ? "ok" : "av", `Frontul de flacără dă MFB50 la ${nr(Q.MFB50, 1)}° după PMI, față de ${nr(Q.vibe.MFB50, 1)}° în legea Vibe adoptată (diferența ${nr(dm, 1)}°). ${Math.abs(dm) < 6 ? "Legea Vibe a proiectului este compatibilă cu viteza de ardere a camerei reale." : dm > 0 ? "Cu turbulența aleasă arderea este mai lentă decât legea Vibe: se mărește avansul la aprindere sau mișcarea încărcăturii (tumble)." : "Cu turbulența aleasă arderea este mai rapidă decât legea Vibe: avansul la aprindere poate fi redus."}`)}
        ${concluzie("ok", `Arderea începe lent (nucleul laminar, ${nr(Q.MFB10 - p.phis, 1)}° de la scânteie până la 10 % ars), se accelerează când frontul devine turbulent și se încheie când frontul atinge pereții (aria scade) – forma în S a curbei Vibe rezultă din geometria camerei.`)}
        ${concluzie("nd", "Modelul nu rezolvă turbulența și chimia în fiecare punct: u' este un parametru (din corelație sau din CFD-ul canalului), iar detonația și stingerea flăcării la pereți nu sunt modelate. Presiunea este adiabatică, deci mai mare decât în modelul 0D cu transfer de căldură.")}`;
    } else {
      const mf = Z.m_f, rb = p.rb / 1000, t0 = performance.now();
      Q = sprayMAC({ pInj: p.pinj, d0: p.d0 / 1000, gauri: Math.round(p.nh), Cd: p.cd, rhoL: 830, mf, soi: p.soi, n: gm.n, pf, Tf, Rbol: rb }); Q.ms = performance.now() - t0; Q.soi = p.soi;
      a0 = Math.floor(p.soi - 15); a1 = Math.ceil(Math.max(p.soi + Q.durInj + 30, vp0[1] ? vp0[1][1] + vp0[1][2] : 60));
      const dsoc = Q.soc - phi0, eS = Math.abs(Q.s1 - Q.s2) / Q.s2 * 100;
      z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Mărime</th><th class="num">Valoare</th><th>Unitate</th></tr></thead><tbody>
        <tr><td>Doza pe ciclu (din calculul termic)</td><td class="num">${nr(mf * 1e6, 2)}</td><td>mg</td></tr>
        <tr><td>Debitul injectorului / durata injecției</td><td class="num">${nr(Q.mdot * 1e3, 2)} g/s / ${nr(Q.tInj * 1e3, 3)} ms = ${nr(Q.durInj, 1)}°RAC</td><td></td></tr>
        <tr><td>Timpul de rupere a jetului</td><td class="num">${nr(Q.out[0].tb * 1e6, 1)}</td><td>µs</td></tr>
        <tr><td>Unghiul conului jetului</td><td class="num">${nr(Q.out[Math.min(5, Q.out.length - 1)].teta, 1)}</td><td>°</td></tr>
        <tr><td>Întârzierea la autoaprindere (Wolfer, integrată)</td><td class="num">${nr(Q.intarziere, 2)}° = ${nr(Q.intarziere / (6 * gm.n) * 1e3, 3)} ms</td><td></td></tr>
        <tr><td>Începutul arderii: jeturi + întârziere / legea Vibe (0D)</td><td class="num">${nr(Q.soc, 1)}° / ${nr(phi0, 1)}°</td><td>față de PMI</td></tr>
        <tr><td>Jetul atinge peretele camerei din piston</td><td class="num">${Q.impact != null ? nr(Q.impact, 1) + "°" : "nu"}</td><td></td></tr></tbody></table></div>
        <p class="nota">Penetrația jetului: corelația Hiroyasu–Arai (înainte de rupere S = 0,39·√(2Δp/ρ<sub>l</sub>)·t, după rupere S = 2,95·(Δp/ρ<sub>a</sub>)<sup>1/4</sup>·√(d<sub>0</sub>·t)), cu densitatea aerului din cilindru la fiecare unghi (modelul 0D). Întârzierea la autoaprindere: Wolfer, τ = 0,44·p<sup>−1,19</sup>·e<sup>4650/T</sup> ms, integrată pe condițiile variabile (∫dt/τ = 1).</p>`;
      z.ver.innerHTML = `<h3>Verificare</h3>${tabelVerificare([["Penetrația la timpul de rupere: ramura dinainte / de după", "S(t_b)", Q.s1 * 1e3, Q.s2 * 1e3, "mm", 3, 1]], "Continuitatea corelației Hiroyasu–Arai")}
        <h3>Concluzii</h3>${concluzie(Math.abs(dsoc) < 3 ? "ok" : "av", `Cu injecția începută la ${nr(p.soi, 1)}° și întârzierea calculată, arderea începe la ${nr(Q.soc, 1)}° față de ${nr(phi0, 1)}° în legea Vibe (diferența ${nr(dsoc, 1)}°)${Math.abs(dsoc) < 3 ? "" : ": se ajustează începutul injecției"}.`)}
        ${concluzie(Q.impact != null ? "av" : "ok", Q.impact != null ? `Jetul atinge peretele camerei din piston la ${nr(Q.impact, 1)}° (combustibil pe perete: fum, HC) – se reduce presiunea de injecție, se mărește numărul de orificii sau raza camerei.` : "Jeturile nu ating peretele camerei din piston în timpul injecției.")}
        ${concluzie("nd", "Vaporizarea, lungimea lichidă și arderea difuzivă nu sunt rezolvate în câmp; degajarea căldurii rămâne cea din modelul 0D (două legi Vibe).")}`;
    }
    const sl = z.comenzi.querySelector('[data-a="t"]'); if (sl) { sl.min = a0; sl.max = a1; sl.step = 0.5; } if (st.k < a0 || st.k > a1) st.k = a0;
    grafice();
  }
  const st = U.redare(z, 1, (k) => `${Math.round(k)}°`, 2); let tg = 0;
  function grafice() {
    if (!Q) return; const k = st.k;
    if (!mac) { const O = Q.out, f = O.map((q) => q.phi), fx_ = Array.from({ length: Math.round(a1 - a0) + 1 }, (_, j) => a0 + j);
      G.x.deseneaza({ xmin: a0, xmax: a1, xlab: "φ [° față de PMI-ardere]", ylab: "x_b", ymin: 0, ymax: 1.05, serii: [serie(fx_, fx_.map(Q.vibe.f), 1, { punctat: true }), serie(f, O.map((q) => q.xb), 0), serie(f, O.map((q) => q.xe), 2, { gros: 1 }), { tip: "pct", pts: [[k, xbLa(k)]], culoare: 0 }], legenda: [["front de flacără: arsă", 0], ["înglobată de front", 2], ["Vibe (0D)", 1]] });
      G.r.deseneaza({ xmin: a0, xmax: a1, xlab: "φ [°]", ylab: "r_f [mm] · A_f [cm²]", ...yl([O.map((q) => (q.xe < 0.999 ? q.rf * 1e3 : 0)), O.map((q) => q.Af * 1e4)]), serii: [serie(f, O.map((q) => (q.xe < 0.999 ? q.rf * 1e3 : NaN)), 0), serie(f, O.map((q) => q.Af * 1e4), 3)], legenda: [["raza frontului [mm]", 0], ["aria frontului [cm²]", 3]] });
      G.v.deseneaza({ xmin: a0, xmax: a1, xlab: "φ [°]", ylab: "viteza [m/s]", ...yl([O.map((q) => q.ST), O.map((q) => q.SL)]), serii: [serie(f, O.map((q) => q.SL), 1), serie(f, O.map((q) => q.ST), 0)], legenda: [["S_L (laminară)", 1], ["u' + S_L (antrenare)", 0]] });
      G.p.deseneaza({ xmin: a0, xmax: a1, xlab: "φ [°]", ylab: "p [MPa]", ...yl([O.map((q) => q.p / 1e6), fx_.map((x) => pf(x) / 1e6)]), serii: [serie(fx_, fx_.map((x) => pf(x) / 1e6), 1, { punctat: true }), serie(f, O.map((q) => q.p / 1e6), 0)], legenda: [["front de flacără (adiabatic)", 0], ["modelul 0D (Woschni)", 1]] }); }
    else { const O = Q.out, f = O.map((q) => q.phi), fx_ = Array.from({ length: Math.round(a1 - a0) + 1 }, (_, j) => a0 + j), rb = U.citeste(z.par).rb;
      G.s.deseneaza({ xmin: a0, xmax: a1, xlab: "φ [° față de PMI-ardere]", ylab: "S [mm]", ...yl([O.map((q) => q.Sliber * 1e3), [rb * 1.1]]), serii: [serie(f, O.map((q) => q.Sliber * 1e3), 0), serie([a0, a1], [rb, rb], 3, { punctat: true })], legenda: [["penetrația jetului", 0], ["raza camerei din piston", 3]] });
      const vib = (x) => vp0.reduce((s_, [fr, f0, df, m]) => s_ + fr * (x <= f0 ? 0 : 1 - Math.exp(-6.908 * Math.pow((x - f0) / df, m + 1))), 0);
      G.x.deseneaza({ xmin: a0, xmax: a1, xlab: "φ [°]", ylab: "x_b", ymin: 0, ymax: 1.05, serii: [serie(fx_, fx_.map(vib), 0), serie([Q.soc, Q.soc], [0, 1], 3, { punctat: true }), serie([Q.soi, Q.soi], [0, 1], 2, { punctat: true })], legenda: [["Vibe (0D)", 0], ["autoaprinderea calculată", 3], ["începutul injecției", 2]] });
      G.p.deseneaza({ xmin: a0, xmax: a1, xlab: "φ [°]", ylab: "p [MPa] · T/1000 [K]", ...yl([fx_.map((x) => pf(x) / 1e6), fx_.map((x) => Tf(x) / 1000)]), serii: [serie(fx_, fx_.map((x) => pf(x) / 1e6), 0), serie(fx_, fx_.map((x) => Tf(x) / 1000), 1)], legenda: [["p", 0], ["T/1000", 1]] }); }
  }
  const xbLa = (f) => { const O = Q.out; if (f <= O[0].phi) return 0; const q = O.find((x) => x.phi >= f); return q ? q.xb : 1; };
  z.par.addEventListener("change", () => calc());
  const bc = z.comenzi.querySelector('[data-a="calib"]');
  if (bc) bc.addEventListener("click", () => { bc.disabled = true; bc.textContent = "se caută avansul…"; setTimeout(() => {
    const p = U.citeste(z.par), tinta = Q.vibe.MFB50, mfb = (fs) => ardereMAS({ D: gm.D, S: gm.S, L: gm.L, eps: gm.eps, n: gm.n, lambda: p.lam, xr: p.xr, phiS: fs, pf, Ts: Tf(fs), uP: p.up, N: 5000 }).MFB50;
    let a = -70, b = 0; if (!(mfb(a) < tinta)) { bc.textContent = "MFB50 nu poate fi atins cu u' ales"; bc.disabled = false; return; }
    for (let it = 0; it < 12; it++) { const c = (a + b) / 2, v = mfb(c); if (!Number.isFinite(v) || v > tinta) b = c; else a = c; }
    z.par.querySelector('[data-p="phis"]').value = ((a + b) / 2).toFixed(1); bc.disabled = false; bc.textContent = "Avansul pentru MFB50 al legii Vibe"; calc(); }, 30); });
  calc();
  return {
    pas(dt) {
      if (!Q) return; const N = a1 - a0; if (st.ruleaza) st.k = a0 + ((st.k - a0 + dt * 12 * st.viteza) % N + N) % N; if (st.k < a0 || st.k > a1) st.k = a0;
      const f = st.k, alfa = 360 + f, T = Tf(f);
      if (!mac) { const O = Q.out, q = f < O[0].phi ? null : O.find((x) => x.phi >= f) || O[O.length - 1], up = U.citeste(z.par).up;
        cil.pozeaza(alfa, q ? q.Tu : T, q ? q.xb : 0, 0, Tmn, Tmx, 0, turboColor, { rf: q ? q.rf : 0, zbarcire: q ? Math.min(0.18, 0.04 * up / q.SL * (1 - Math.exp(-q.rf / (0.03 * gm.D)))) : 0, tFl: q ? (q.Tb - Tmn) / (Tmx - Tmn) : 1 });
        U.SC.hud(`φ = <b>${nr(f, 1)}°</b> față de PMI · ${f < U.citeste(z.par).phis ? "comprimarea" : "arderea"}<br>${q ? `x<sub>b</sub> = <b>${nr(q.xb * 100, 1)} %</b> · r<sub>f</sub> = <b>${nr(q.rf * 1e3, 1)} mm</b> · T<sub>u</sub> = ${nr(q.Tu, 0)} K · T<sub>b</sub> = ${nr(q.Tb, 0)} K` : `T = ${nr(T, 0)} K`}`); }
      else { const O = Q.out, q = f < Q.soi ? null : O.find((x) => x.phi >= f), xb = vp0.reduce((s_, [fr, f0, df, m]) => s_ + fr * (f <= f0 ? 0 : 1 - Math.exp(-6.908 * Math.pow((f - f0) / df, m + 1))), 0);
        cil.pozeaza(alfa, T, f >= (Q.soc ?? 99) ? xb : 0, 0.02, Tmn, Tmx, 0, turboColor, { jet: { S: q && (q.injecteaza || f < Q.soi + Q.durInj + 3) ? q.S : 0, teta: q ? q.teta : 20 } });
        U.SC.hud(`φ = <b>${nr(f, 1)}°</b> față de PMI · ${q && q.injecteaza ? "injecția" : f >= (Q.soc ?? 99) ? "arderea" : "comprimarea"}<br>${q ? `penetrația ${nr(q.Sliber * 1e3, 1)} mm · ` : ""}T = ${nr(T, 0)} K · x<sub>b</sub> = ${nr(xb * 100, 0)} %`); }
      st.afis(); tg += dt; if (tg > 0.2) { tg = 0; grafice(); }
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ montarea */
function listaStudii(ctx) {
  const t = ctx.tip, m4 = t === "MOTO" && ctx.S && ctx.S.d && +ctx.S.d.tau === 4;
  if (t === "MAS" || t === "MAC" || m4) return [{ id: "port", nume: "Canalul de admisie – curgere și tumble (CFD 3D)" }, { id: "comp", nume: "Comprimarea în cilindrul proiectat" }, { id: "cref", nume: "Test de referință: comprimarea izentropă" }, { id: "ard", nume: t === "MAC" ? "Injecția și arderea (jeturi, autoaprindere)" : "Arderea – frontul de flacără" }];
  if (t === "MOTO") return [{ id: "comp", nume: "Comprimarea în cilindru" }, { id: "cref", nume: "Test de referință: comprimarea izentropă" }];
  if (t === "BEV" || t === "LCV") return [{ id: "placa", nume: "Placa de răcire a bateriei proiectate" }, { id: "pref", nume: "Test de referință: placa la 1000 W" }];
  if (t === "HEV") return [{ id: "placa", nume: "Placa de răcire a bateriei" }, { id: "pref", nume: "Test de referință: placa la 1000 W" }, { id: "cref", nume: "Test de referință: comprimarea izentropă" }];
  return [];
}
export default {
  monteaza(el, ctx, shell) {
    const sk = U.schelet(el, "Modulul F · câmpuri în cilindru și în placa de răcire", "Câmpurile de curgere, presiune și temperatură rezolvate pe rețele de volume finite: canalul de admisie și mișcarea încărcăturii (plan de experimente numerice pe parametrii canalului), comprimarea în cilindru, placa de răcire a bateriei. Fiecare câmp are reperul analitic și studiul de rețea.", "simulator intern · volume finite");
    let id0 = null, c = ctx;
    function porneste(id) {
      id0 = id; if (U.studiu && U.studiu.distruge) U.studiu.distruge(); U.studiu = null;
      const f = { port: (k) => studiuPort(k, c, U), comp: (k) => studiuCompresie(k, c, false), cref: (k) => studiuCompresie(k, c, true), ard: (k) => studiuArdere(k, c), placa: (k) => studiuPlaca(k, c, false), pref: (k) => studiuPlaca(k, c, true) };
      try { U.studiu = f[id](sk.corp); if (U.studiu) U.studiu.gazda = sk.corp; shell.stareModul("F", "ok", "calculat"); }
      catch (e) { console.error(e); sk.corp.insertAdjacentHTML("beforeend", `<div class="alerta">Studiul nu s-a putut calcula: ${e.message}</div>`); shell.stareModul("F", "inv", "eroare de calcul"); }
    }
    const lista = listaStudii(c);
    if (!lista.length) { sk.corp.innerHTML = `<div class="mod-incomplet">Nu există studii de câmp pentru acest tip.</div>`; return { actualizeaza() {}, arata() {} }; }
    comutatorStudii(sk.studii, lista, porneste, lista[0].id); porneste(lista[0].id);
    return { actualizeaza(n) { c = n; porneste(id0); }, arata(b) { U.activ = b; if (U.SC) U.SC.activ(b); } };
  },
  raport(ctx) {
    const t = ctx.tip, gm = geoMotor(ctx), rows = [];
    if (gm) { const s = creeazaCompresie({ D: gm.D, S: gm.S, L: gm.L, eps: gm.eps, n: gm.n, p0: gm.p0, T0: gm.T0, N: 40, a0: 180, a1: 360, dAlfa: 1 }); s.avanseaza(360); const f = s.iesire[s.iesire.length - 1], iz = izentrop(gm.p0, gm.T0, gm.eps);
      rows.push([`Comprimarea adiabatică (40 volume): p / T la PMS`, `${nr(f.p / 1e5, 2)} bar / ${nr(f.T, 1)} K (izentropa ${nr(iz.p2 / 1e5, 2)} bar / ${nr(iz.T2, 1)} K)`]); }
    if (t === "BEV" || t === "LCV" || t === "HEV") { const b = dateBaterie(ctx), I = b.P * 1e3 / b.U, Q = I * I * b.Rint, r = placaRacire({ Lx: 1.2, Ly: 0.8, t: 0.003, k: 205, Q, md: 0.1, cp: 4180, Tin: 25, h: 1500, lc: 0.02, nTreceri: 8, nx: 90, ny: 60 });
      rows.push([`Placa de răcire: Q = ${nr(Q, 0)} W la ${nr(b.P, 1)} kW, ṁ = 0,1 kg/s`, `T<sub>max</sub> placă ${nr(r.Tmax, 2)} °C, ΔT lichid ${nr(r.dTf, 3)} K (bilanț ${nr(Q / 418, 3)} K)`]); }
    if (t === "MAS" || t === "MAC") rows.push(["Canalul de admisie", "planul de experimente CFD 3D se rulează în modulul F (tabelul designurilor și concluziile se preiau în memoriu din studiu)"]);
    return rows.length ? `<table class="tabel"><tbody>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody></table>` : "";
  }
};
