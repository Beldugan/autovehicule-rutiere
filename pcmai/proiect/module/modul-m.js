/* Modulul M – dinamică multicorp: mecanismul motorului (MAS, MAC, motocicletă), reductorul acționării electrice cu analiza
   torsională (BEV, autoutilitară), mecanismele hibridelor (planetarul serie-paralel, linia de arbori P2 / P0, grupul electrogen serie).
   Toate rezultatele provin din solverul intern (multicorp.js); animațiile sunt vizualizări ale soluției cinematice interne. */
import { creeazaScena, grafic, lim, fx, tabelVerificare, concluzie, comutatorStudii, V3 } from "./scena.js";
import * as MC from "./multicorp.js";
import { mecanismulMotor, reductorEV, planetar, linieArbori } from "./macheta3d.js";
import { motorReal } from "./motor-real.js?v=5";

const T3 = (s) => `<span class="mod-prov">${s}</span>`;
const nr = (v, d = 2) => fx(v, d);
const interp = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; for (let j = 1; j < xs.length; j++) if (xs[j] >= x) return ys[j - 1] + (x - xs[j - 1]) * (ys[j] - ys[j - 1]) / (xs[j] - xs[j - 1]); return ys[ys.length - 1]; };

/* ------------------------------------------------------------------ datele motorului din proiect */
function dateMotor(ctx, sursa = "0D") {
  const { tip, R, S } = ctx; if (!R) return null;
  if (tip === "MAS" || tip === "MAC") {
    const r = R, d = r.date, X = window.PCMAI_EXTRA;
    let pa, src;
    if (sursa === "0D" && X) { try { pa = X.pAlfa0D(r, X.model0D(r)); src = "modelul 0D Vibe–Woschni (cap. 12 al îndrumarului)"; } catch (e) { pa = null; } }
    if (!pa) { const xs = r.diagrama.map((q) => q.alfa), ys = r.diagrama.map((q) => q.p); pa = []; for (let a = 0; a <= 720; a++) pa.push([a, interp(xs, ys, a)]); src = "diagrama ciclului de calcul (cap. 8)"; }
    const mase = X ? X.MASE[d.tip] : { m_p: 0.4, m_b: 0.8 };
    return { D: r.D_r / 1000, S: r.S_r / 1000, lam: d.lam, i: d.i_cil, tau: d.tau, n: d.n_P, P_ind: r.P_ind, pa, src, m_p: mase.m_p, m_b: mase.m_b, eticheta: `${d.tip} ${d.P_nom} kW la ${d.n_P} rot/min`,
      eps: d.eps, tip: d.tip, dist: { dsa: d.dsa, isa: d.isa, dse: d.dse, ise: d.ise } };
  }
  if (tip === "MOTO" && R.r) {
    const r = R.r, d = S.d, pa = R.pa.map((q) => [q[0], q[2]]);
    return { D: r.D_cil / 1000, S: r.S_cil / 1000, lam: d.lam, i: 1, tau: d.tau, n: d.n_P, P_ind: null, pa, src: "diagrama indicată a motorului (cap. 5 al îndrumarului)", m_p: S.m.m_p, m_b: S.m.m_b, eticheta: `${d.tau}T, ${fx(r.V_h ? r.V_h * 1000 : Math.PI * r.D_cil ** 2 / 4 * r.S_cil / 1000, 0)} cm³`, eps: d.eps || 10, tip: "MAS" };
  }
  return null;
}
/** modelul cu două mase concentrate al îndrumarului (relațiile cap. 13), pentru comparație */
function douaMase(g, m, n, pAlfa, per, pc = 0.1) {
  const R = g.R, lam = R / g.L, om = n * Math.PI / 30, Ap = Math.PI * g.D * g.D / 4, mbp = m.k_bp * m.m_b, mbm = m.m_b - mbp, mj = m.m_gp + mbp, out = { T: [], Z: [], N: [], M: [], F: [], a: [], Rm: [] };
  for (let al = 0; al <= per; al++) {
    const a = al * Math.PI / 180, acc = R * om * om * (Math.cos(a) + lam * Math.cos(2 * a)), F = (pAlfa(al) - pc) * 1e6 * Ap - mj * acc, b = Math.asin(lam * Math.sin(a));
    const T = F * Math.sin(a + b) / Math.cos(b), Z = F * Math.cos(a + b) / Math.cos(b) - mbm * R * om * om;
    out.a.push(acc); out.F.push(F); out.N.push(F * Math.tan(b)); out.T.push(T); out.Z.push(Z); out.M.push(T * R); out.Rm.push(Math.hypot(T, Z));
  }
  return out;
}

/* ------------------------------------------------------------------ interfața comună */
function schelet(el, titlu, sub) {
  el.innerHTML = `<div class="card"><div class="mod-antet"><div><h2>${titlu}</h2><p class="nota">${sub}</p></div>${T3("simulator intern · corpuri rigide, mișcare plană")}</div>
    <div class="mod-studii"></div><div class="mod-corp"></div></div>`;
  return { studii: el.querySelector(".mod-studii"), corp: el.querySelector(".mod-corp") };
}
let SC = null, STUDIU = null;
/** zona unui studiu; scena 3D este una singură (un renderer) și se mută în zona studiului deschis */
function zonaLucru(corp, comenziHTML, parHTML) {
  corp.innerHTML = `<div class="mod-grila"><div><div class="mod-scena"></div><div class="mod-comenzi">${comenziHTML}</div></div>
    <div><div class="mod-par">${parHTML}</div></div></div><div class="mod-rez"></div><div class="mod-graf-grila"></div><div class="mod-ver"></div>`;
  let gaz = corp.querySelector(".mod-scena");
  if (!SC) { SC = creeazaScena(gaz, { prov: "vizualizare cinematică internă" }); SC.grup = new SC.THREE.Group(); SC.scene.add(SC.grup); SC.animatie((dt) => STUDIU && STUDIU.pas && STUDIU.pas(dt)); }
  else { gaz.replaceWith(SC.gazda); gaz = SC.gazda; }
  SC.goleste(SC.grup); SC.hud(""); SC.legenda(null);
  return { scena: gaz, sc3: SC, comenzi: corp.querySelector(".mod-comenzi"), par: corp.querySelector(".mod-par"), rez: corp.querySelector(".mod-rez"), graf: corp.querySelector(".mod-graf-grila"), ver: corp.querySelector(".mod-ver") };
}
const camp = (k, et, v, pas = "any", u = "") => `<label><span>${et}${u ? ` [${u}]` : ""}</span><input type="number" step="${pas}" data-p="${k}" value="${v}"></label>`;
const citeste = (cont) => { const o = {}; cont.querySelectorAll("[data-p]").forEach((x) => { o[x.dataset.p] = x.type === "checkbox" ? x.checked : x.tagName === "SELECT" ? x.value : parseFloat(x.value); }); return o; };
const comenziAnim = (u = "°RAC", max = 720) => `<button type="button" data-a="play">⏸ Pauză</button><label>viteza <input type="range" data-a="viteza" min="0.05" max="2" step="0.05" value="0.5"></label><label>α <input type="range" data-a="alfa" min="0" max="${max}" step="1" value="0"><output data-a="alfaV">0</output> ${u}</label>`;
function legaAnim(z, st, max) {
  const b = z.comenzi.querySelector('[data-a="play"]'), sl = z.comenzi.querySelector('[data-a="alfa"]'), vz = z.comenzi.querySelector('[data-a="viteza"]'), o = z.comenzi.querySelector('[data-a="alfaV"]');
  b.addEventListener("click", () => { st.ruleaza = !st.ruleaza; b.textContent = st.ruleaza ? "⏸ Pauză" : "▶ Pornește"; });
  sl.addEventListener("input", () => { st.alfa = +sl.value; st.ruleaza = false; b.textContent = "▶ Pornește"; });
  vz.addEventListener("input", () => { st.viteza = +vz.value; });
  st.viteza = +vz.value; st.ruleaza = true;
  return (a) => { sl.max = max; if (document.activeElement !== sl) sl.value = Math.round(a); o.textContent = Math.round(a); };
}

/* ------------------------------------------------------------------ studiul: mecanismul motorului proiectat */
function studiuMecanism(corp, ctx, dm) {
  const per = dm.tau === 2 ? 360 : 720, ord = MC.ordineAprindere(dm.i, dm.tau);
  const par = `${camp("m_p", "masa pistonului", dm.m_p, 0.01, "kg")}${camp("m_b", "masa bielei", dm.m_b, 0.01, "kg")}${camp("k_gp", "grup piston / piston", 1.3, 0.05)}
    ${camp("k_bp", "centrul de masă al bielei l<sub>A</sub>/L", 0.275, 0.005)}${camp("cJ", "J<sub>G</sub> / (m<sub>b</sub>·l<sub>A</sub>·l<sub>B</sub>)", 1, 0.05)}
    ${camp("e", "dezaxarea", 0, 0.5, "mm")}${camp("n", "turația", dm.n, 100, "rot/min")}${ctx.tip === "MOTO" ? "" : `<label>p(α) din<select data-p="sursa"><option value="0D">modelul 0D</option><option value="calc">ciclul de calcul</option></select></label>`}`;
  const z = zonaLucru(corp, comenziAnim("°RAC", per), par), sc3 = z.sc3;
  const st = { alfa: 0, ruleaza: true, viteza: 0.5 };
  const afis = legaAnim(z, st, per);
  const G = {
    acc: grafic(z.graf, "Accelerația pistonului: soluția multicorp exactă și relația îndrumarului"),
    forte: grafic(z.graf, "Forțele pe axa cilindrului 1 (gaze, inerție, rezultantă)"),
    tz: grafic(z.graf, "Forța normală N și forțele pe maneton T, Z"),
    mom: grafic(z.graf, `Momentul cilindrului 1 și momentul total (${dm.i} cil., ordinea ${ord.ordine})`),
    pol: grafic(z.graf, "Diagrama polară a sarcinii pe fusul maneton (T – Z)", 260)
  };
  let sim = null, dm2 = null, mt = null, g = null, m = null, mec = null, pMax = 1, pFun = null, Fmax = 1;
  function calc() {
    const p = citeste(z.par), d2 = p.sursa ? dateMotor(ctx, p.sursa) : dm;
    g = { R: d2.S / 2, L: d2.S / 2 / d2.lam, e: (p.e || 0) / 1000, D: d2.D };
    const lA = p.k_bp * g.L; m = { m_gp: p.k_gp * p.m_p, m_b: p.m_b, lA, J_G: p.cJ * p.m_b * lA * (g.L - lA), k_bp: p.k_bp };
    const xs = d2.pa.map((q) => q[0]), ys = d2.pa.map((q) => q[1]); pFun = (a) => interp(xs, ys, ((a % per) + per) % per);
    const om = p.n * Math.PI / 30;
    sim = MC.simuleazaMecanism(g, m, om, pFun, { pas: 1, aMax: per });
    dm2 = douaMase(g, m, p.n, pFun, per);
    mt = MC.momentTotal(sim.alfa, sim.M, ord.dec, per);
    pMax = Math.max(...ys); Fmax = Math.max(...sim.Fg.map(Math.abs), ...sim.S.map(Math.abs));
    sc3.goleste(sc3.grup);
    mec = motorReal({ D: g.D, S: d2.S, L: g.L, i: d2.i, man: ord.man, e: g.e, eps: d2.eps || 10, tip: d2.tip, tau: d2.tau, dist: d2.dist, dec: ord.dec }); sc3.grup.add(mec.G);
    const Lm = d2.i * mec.pas + g.L; sc3.incadreaza([Lm * 0.9, g.L * 1.6, Lm * 1.25], [0, g.L * 0.75, 0]); { const t = sc3.ctl.target; sc3.camera.position.sub(t).multiplyScalar(1.22).add(t); sc3.camera.far *= 1.5; sc3.camera.updateProjectionMatrix(); sc3.ctl.update(); }
    sc3.et = { Fg: sc3.eticheta(""), N: sc3.eticheta(""), T: sc3.eticheta("") };
    rezultate(p, d2);
  }
  function rezultate(p, d2) {
    const mx = (a) => Math.max(...a.map(Math.abs)), om = p.n * Math.PI / 30;
    const Mi = d2.P_ind ? 9549.3 * d2.P_ind / p.n : null;
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Mărime (cilindrul 1)</th><th class="num">Multicorp</th><th class="num">Îndrumar (2 mase)</th><th>Unitate</th></tr></thead><tbody>
      <tr><td>Accelerația la PMI a(0)</td><td class="num">${nr(sim.a[0], 0)}</td><td class="num">${nr(dm2.a[0], 0)}</td><td>m/s²</td></tr>
      <tr><td>Viteza maximă a pistonului</td><td class="num">${nr(mx(sim.v), 2)}</td><td class="num">—</td><td>m/s</td></tr>
      <tr><td>Forța normală maximă N</td><td class="num">${nr(mx(sim.N) / 1e3, 2)}</td><td class="num">${nr(mx(dm2.N) / 1e3, 2)}</td><td>kN</td></tr>
      <tr><td>Forța tangențială maximă T</td><td class="num">${nr(Math.max(...sim.T) / 1e3, 2)}</td><td class="num">${nr(Math.max(...dm2.T) / 1e3, 2)}</td><td>kN</td></tr>
      <tr><td>Sarcina maximă pe maneton R<sub>m</sub></td><td class="num">${nr(Math.max(...sim.Rm) / 1e3, 2)}</td><td class="num">${nr(Math.max(...dm2.Rm) / 1e3, 2)}</td><td>kN</td></tr>
      <tr><td>Momentul maxim al cilindrului</td><td class="num">${nr(Math.max(...sim.M), 1)}</td><td class="num">${nr(Math.max(...dm2.M), 1)}</td><td>N·m</td></tr>
      <tr class="sectiune"><td colspan="4">Motorul (${d2.i} cilindri)</td></tr>
      <tr><td>Momentul mediu indicat M<sub>med</sub></td><td class="num">${nr(mt.med, 1)}</td><td class="num">${nr(MC.momentTotal(sim.alfa, dm2.M, ord.dec, per).med, 1)}</td><td>N·m</td></tr>
      <tr><td>Momentul total: max / min</td><td class="num">${nr(mt.max, 0)} / ${nr(mt.min, 0)}</td><td class="num">—</td><td>N·m</td></tr>
      <tr><td>Gradul de neuniformitate (M<sub>max</sub>−M<sub>min</sub>)/M<sub>med</sub></td><td class="num">${nr(mt.neunif, 2)}</td><td class="num">—</td><td>–</td></tr>
      <tr class="sectiune"><td colspan="4">Diagnosticul solverului</td></tr>
      <tr><td>Iterații Newton (max) / reziduul de închidere</td><td class="num" colspan="2">${sim.itMax} / ${sim.rezMax.toExponential(1)} m</td><td></td></tr>
      <tr><td>Bilanțul lucrului pe ciclu: gaze → arbore</td><td class="num" colspan="2">${nr(sim.Wgaz, 2)} J → ${nr(sim.Wmot, 2)} J (abatere ${sim.bilant.toExponential(1)})</td><td></td></tr>
      </tbody></table></div><p class="nota">p(α): ${d2.src}; turația ${p.n} rot/min, ω = ${nr(om, 1)} rad/s. Masele: grupul piston ${nr(m.m_gp, 3)} kg, biela ${nr(m.m_b, 3)} kg cu J<sub>G</sub> = ${nr(m.J_G * 1e4, 3)}·10⁻⁴ kg·m².</p>`;
    const conc = [];
    conc.push(concluzie(sim.inchidere < 1e-9 ? "ok" : "rau", `Închiderea cinematică |A + L·u − B| ≤ ${sim.inchidere.toExponential(1)} m pe tot ciclul (soluția Newton converge în cel mult ${sim.itMax} iterații).`));
    conc.push(concluzie(sim.bilant < 1e-6 ? "ok" : "av", `Lucrul forțelor de presiune pe ciclu (${nr(sim.Wgaz, 1)} J) se regăsește la arbore (${nr(sim.Wmot, 1)} J): forțele de inerție au lucru mecanic nul pe un ciclu periodic.`));
    if (Mi) { const dM = (mt.med / Mi - 1) * 100; conc.push(concluzie(Math.abs(dM) < 5 ? "ok" : "av", `Momentul mediu din dinamică (${nr(mt.med, 1)} N·m) față de momentul indicat al calculului termic 9549·P<sub>i</sub>/n = ${nr(Mi, 1)} N·m: abatere ${nr(dM, 1)} % (prag 5 %; diferența vine din p(α) ${p.sursa === "calc" ? "a ciclului de calcul" : "a modelului 0D"} față de φ<sub>r</sub>·p<sub>it</sub>).`)); }
    const dJ = Math.abs(Math.max(...sim.T) / Math.max(...dm2.T) - 1) * 100;
    conc.push(concluzie(p.cJ === 1 ? (dJ < 3 ? "ok" : "av") : "nd", p.cJ === 1 ? `Cu J<sub>G</sub> = m<sub>b</sub>·l<sub>A</sub>·l<sub>B</sub> biela rigidă este dinamic echivalentă cu cele două mase ale îndrumarului; diferența de ${nr(dJ, 2)} % la T<sub>max</sub> provine numai din termenii în λ³… neglijați în relațiile aproximative.` : `Cu J<sub>G</sub> ≠ m<sub>b</sub>·l<sub>A</sub>·l<sub>B</sub> modelul cu două mase nu mai este exact: diferența la T<sub>max</sub> este ${nr(dJ, 2)} %. Momentul de inerție real al bielei se obține din CAD sau prin pendulare.`));
    z.ver.innerHTML = `<h3>Concluzii</h3>${conc.join("")}`;
    grafice();
  }
  function grafice() {
    const k = Math.round(st.alfa) % per, pt = (arr, sc = 1) => [[sim.alfa[k], arr[k] * sc]];
    const xt = Array.from({ length: per / 90 + 1 }, (_, j) => j * 90), base = { xmin: 0, xmax: per, xticks: xt, xlab: "α [°RAC]" };
    G.acc.deseneaza(Object.assign({}, base, { ylab: "a [m/s²]", ...ylim([sim.a, dm2.a]), serii: [{ tip: "linie", pts: sim.alfa.map((a, j) => [a, sim.a[j]]), culoare: 0 }, { tip: "linie", punctat: true, pts: sim.alfa.map((a, j) => [a, dm2.a[j]]), culoare: 1 }, { tip: "pct", pts: pt(sim.a), culoare: 0 }], legenda: [["multicorp (exact)", 0], ["îndrumar: Rω²(cos α + λ cos 2α)", 1]] }));
    const kN = (a) => a.map((v) => v / 1e3), F = sim.Fg.map((v, j) => v + sim.Fj[j]);
    G.forte.deseneaza(Object.assign({}, base, { ylab: "F [kN]", ...ylim([kN(sim.Fg), kN(sim.Fj), kN(F)]), serii: [{ tip: "linie", pts: sim.alfa.map((a, j) => [a, sim.Fg[j] / 1e3]), culoare: 1 }, { tip: "linie", pts: sim.alfa.map((a, j) => [a, sim.Fj[j] / 1e3]), culoare: 3 }, { tip: "linie", pts: sim.alfa.map((a, j) => [a, F[j] / 1e3]), culoare: 0 }, { tip: "pct", pts: pt(F, 1e-3), culoare: 0 }], legenda: [["F<sub>g</sub> gaze", 1], ["F<sub>j</sub> inerție", 3], ["F = F<sub>g</sub> + F<sub>j</sub>", 0]] }));
    G.tz.deseneaza(Object.assign({}, base, { ylab: "F [kN]", ...ylim([kN(sim.N), kN(sim.T), kN(sim.Z)]), serii: [{ tip: "linie", pts: sim.alfa.map((a, j) => [a, sim.N[j] / 1e3]), culoare: 2 }, { tip: "linie", pts: sim.alfa.map((a, j) => [a, sim.T[j] / 1e3]), culoare: 0 }, { tip: "linie", pts: sim.alfa.map((a, j) => [a, sim.Z[j] / 1e3]), culoare: 3 }, { tip: "pct", pts: pt(sim.T, 1e-3), culoare: 0 }], legenda: [["N (cilindru)", 2], ["T (tangențială)", 0], ["Z (radială, cu forța centrifugă a bielei)", 3]] }));
    G.mom.deseneaza(Object.assign({}, base, { ylab: "M [N·m]", ...ylim([sim.M, mt.Mt]), serii: [{ tip: "linie", pts: sim.alfa.map((a, j) => [a, sim.M[j]]), culoare: 4, gros: 1.4 }, { tip: "linie", pts: mt.Mt.map((v, j) => [j, v]), culoare: 0 }, { tip: "linie", punctat: true, pts: [[0, mt.med], [per, mt.med]], culoare: 2 }, { tip: "pct", pts: [[k, mt.Mt[k]]], culoare: 0 }], legenda: [["cilindrul 1", 4], ["total", 0], ["medie", 2]] }));
    const lT = lim(sim.T.map((v) => v / 1e3), true), lZ = lim(sim.Z.map((v) => v / 1e3), true);
    G.pol.deseneaza({ xmin: lT[0], xmax: lT[1], ymin: lZ[0], ymax: lZ[1], xlab: "T [kN]", ylab: "Z [kN]", serii: [{ tip: "linie", pts: sim.T.map((v, j) => [v / 1e3, sim.Z[j] / 1e3]), culoare: 0, gros: 1.4 }, { tip: "pct", pts: [[sim.T[k] / 1e3, sim.Z[k] / 1e3]], culoare: 1 }] });
  }
  const ylim = (arrs) => { const l = lim(arrs.flat(), true); return { ymin: l[0], ymax: l[1] }; };
  z.par.addEventListener("change", calc);
  calc();
  let tg = 0;
  return {
    pas(dt) {
      if (!sim) return;
      if (st.ruleaza) st.alfa = (st.alfa + dt * st.viteza * 360) % per;
      const a = st.alfa, om = sim ? 1 : 1, stari = [];
      for (let k = 0; k < dm.i; k++) {
        const ak = (((a - ord.dec[k]) % per) + per) % per, kin = MC.cinematicaExacta(g, ak, om);
        stari.push({ yB: kin.yB, th: kin.th, p: pFun(ak) });
      }
      const j = Math.round(a) % per, f = { Fg: sim.Fg[j], N: sim.N[j], S: sim.S[j], T: sim.T[j], Z: sim.Z[j] };
      mec.pozeaza(a, stari, f, (g.L * 0.9) / Fmax, 0.05, pMax);
      const s = mec.sageti; sc3.et.Fg.pune(s.Fg.position); sc3.et.Fg.text(`F<sub>g</sub> <b>${nr(f.Fg / 1e3, 1)} kN</b>`);
      sc3.et.N.pune(s.N.position); sc3.et.N.text(`N <b>${nr(f.N / 1e3, 2)} kN</b>`); sc3.et.T.pune(s.T.position); sc3.et.T.text(`T <b>${nr(f.T / 1e3, 1)} kN</b>`);
      sc3.hud(`α = <b>${Math.round(a)}°</b> RAC (cil. 1) · p = <b>${nr(pFun(a), 2)} MPa</b><br>M<sub>1</sub> = <b>${nr(sim.M[j], 0)} N·m</b> · M<sub>total</sub> = <b>${nr(mt.Mt[j], 0)} N·m</b>`);
      afis(a);
      tg += dt; if (tg > 0.12) { tg = 0; grafice(); }
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ studiul: testul cinematic de referință */
function studiuReferinta(corp, ctx, varianta) {
  const R0 = varianta === "moto" ? { R: 0.05790 / 2, L: 0.1, D: 0.0524, n: 6000, eps: 10 } : { R: 0.048, L: 0.192, D: 0.08, w: 233 };
  const om = R0.w || R0.n * Math.PI / 30, lam = R0.R / R0.L;
  const z = zonaLucru(corp, comenziAnim("°", 360), `<p class="nota" style="grid-column:1/-1">Mișcarea impusă numai arborelui (ω = ${nr(om, 1)} rad/s); masele nu influențează cinematica unui mecanism rigid cu mișcare impusă. Se compară soluția multicorp exactă cu relațiile aproximative ale îndrumarului și cu relația geometrică exactă.</p>`), sc3 = z.sc3;
  const st = { alfa: 0, ruleaza: true }; const afis = legaAnim(z, st, 360);
  const geo = { R: R0.R, L: R0.L, e: 0, D: R0.D };
  sc3.goleste(sc3.grup); const mec = motorReal({ D: R0.D, S: 2 * R0.R, L: R0.L, i: 1, man: [0], eps: R0.eps || 10, tip: "MAS", tau: 4, dec: [0] }); sc3.grup.add(mec.G);
  Object.values(mec.sageti).forEach((s) => (s.visible = false));
  sc3.incadreaza([0.35, 0.22, 0.42], [0, R0.L * 0.8, 0]); { const t = sc3.ctl.target; sc3.camera.position.sub(t).multiplyScalar(1.22).add(t); sc3.ctl.update(); }
  const et = sc3.eticheta("");
  const rows = [], K = [], AL = [];
  for (let a = 0; a <= 360; a += 10) { const k = MC.cinematicaExacta(geo, a, om), ind = MC.cinematicaIndrumar(R0.R, lam, om, a); rows.push([a, ind.x * 1e3, (Math.sqrt((R0.R + R0.L) ** 2) - k.yB) * 1e3, MC.xExact(R0.R, R0.L, a) * 1e3, ind.v, -k.yBd, ind.a, -k.yBdd]); }
  for (let a = 0; a <= 360; a += 1) { K.push(MC.cinematicaExacta(geo, a, om)); AL.push(a); }
  const k90 = MC.cinematicaExacta(geo, 90, om), i0 = MC.cinematicaIndrumar(R0.R, lam, om, 0), i90 = MC.cinematicaIndrumar(R0.R, lam, om, 90), i180 = MC.cinematicaIndrumar(R0.R, lam, om, 180);
  const ver = varianta === "moto"
    ? [["Cilindreea", "V<sub>h</sub>", Math.PI * R0.D ** 2 / 4 * 2 * R0.R * 1e6, 124.86, "cm³", 2, 0.01], ["Viteza medie a pistonului", "c<sub>m</sub>", 2 * 2 * R0.R * R0.n / 60, 11.58, "m/s", 2, 0.05],
       ["Deplasarea exactă la 90°", "x(90°)", (R0.R + R0.L - k90.yB) * 1e3, MC.xExact(R0.R, R0.L, 90) * 1e3, "mm", 4, 1e-6]]
    : [["Cursa", "S = 2r", 2 * R0.R * 1e3, 96, "mm", 3, 1e-9], ["Lungimea bielei", "l = r/λ", R0.L * 1e3, 192, "mm", 3, 1e-9], ["Turația", "n = 30ω/π", om * 30 / Math.PI, 2224.99, "rot/min", 2, 0.001],
       ["Deplasarea la 90° – relația îndrumarului", "x(90°)", i90.x * 1e3, 54, "mm", 4, 1e-6], ["Deplasarea la 90° – multicorp (exactă)", "x(90°)", (R0.R + R0.L - k90.yB) * 1e3, 54.0968, "mm", 4, 1e-3],
       ["Viteza la 90° – multicorp", "v(90°)", -k90.yBd, 11.184, "m/s", 3, 1e-3], ["Accelerația la 0°", "a(0°)", i0.a, 3257.34, "m/s²", 2, 1e-4],
       ["Accelerația la 90° – relația îndrumarului", "a(90°)", i90.a, -651.468, "m/s²", 3, 1e-4], ["Accelerația la 180°", "a(180°)", i180.a, -1954.404, "m/s²", 3, 1e-4]];
  z.rez.innerHTML = tabelVerificare(ver) + `<details><summary>Tabelul de eșantionare la 0°, 10°, …, 360°</summary><div class="tabel-container"><table class="tabel compact"><thead><tr><th class="num">α [°]</th><th class="num">x îndrumar [mm]</th><th class="num">x multicorp [mm]</th><th class="num">x exact [mm]</th><th class="num">v îndrumar [m/s]</th><th class="num">v multicorp [m/s]</th><th class="num">a îndrumar [m/s²]</th><th class="num">a multicorp [m/s²]</th></tr></thead><tbody>
    ${rows.map((r) => `<tr>${r.map((v, j) => `<td class="num">${nr(v, j === 0 ? 0 : j < 4 ? 4 : j < 6 ? 3 : 2)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
  z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie("ok", `Cursa calculată este ${nr(2 * R0.R * 1e3, 1)} mm pentru r = ${nr(R0.R * 1e3, 2)} mm; mecanismul este coerent (l > r).`)}
    ${concluzie("ok", `La 90° relația aproximativă dă x = ${nr(i90.x * 1e3, 4)} mm, soluția exactă ${nr((R0.R + R0.L - k90.yB) * 1e3, 4)} mm: diferența de ${nr((R0.R + R0.L - k90.yB - i90.x) * 1e3, 4)} mm este de model (seria în λ trunchiată), nu o eroare numerică.`)}
    ${concluzie("ok", `Viteza la 90° este aceeași în ambele modele (${nr(-k90.yBd, 3)} m/s), iar accelerația exactă la 90° (${nr(-k90.yBdd, 1)} m/s²) diferă de cea aproximativă (${nr(i90.a, 1)} m/s²) prin termenii de ordin superior în λ.`)}`;
  const Gx = grafic(z.graf, "Deplasarea pistonului x(α)"), Gv = grafic(z.graf, "Viteza v(α)"), Ga = grafic(z.graf, "Accelerația a(α)");
  const desen = () => {
    const k = Math.round(st.alfa) % 361, b = { xmin: 0, xmax: 360, xticks: [0, 90, 180, 270, 360], xlab: "α [°]" };
    const xi = AL.map((a) => MC.cinematicaIndrumar(R0.R, lam, om, a));
    Gx.deseneaza(Object.assign({}, b, { ymin: 0, ymax: Math.ceil(2 * R0.R * 1e3 / 10) * 10, ylab: "x [mm]", serii: [{ tip: "linie", pts: AL.map((a, j) => [a, (R0.R + R0.L - K[j].yB) * 1e3]), culoare: 0 }, { tip: "linie", punctat: true, pts: AL.map((a, j) => [a, xi[j].x * 1e3]), culoare: 1 }, { tip: "pct", pts: [[k, (R0.R + R0.L - K[k].yB) * 1e3]], culoare: 0 }], legenda: [["multicorp", 0], ["îndrumar", 1]] }));
    const lv = lim(K.map((q) => -q.yBd)); Gv.deseneaza(Object.assign({}, b, { ymin: lv[0], ymax: lv[1], ylab: "v [m/s]", serii: [{ tip: "linie", pts: AL.map((a, j) => [a, -K[j].yBd]), culoare: 0 }, { tip: "linie", punctat: true, pts: AL.map((a, j) => [a, xi[j].v]), culoare: 1 }, { tip: "pct", pts: [[k, -K[k].yBd]], culoare: 0 }] }));
    const la = lim(K.map((q) => -q.yBdd)); Ga.deseneaza(Object.assign({}, b, { ymin: la[0], ymax: la[1], ylab: "a [m/s²]", serii: [{ tip: "linie", pts: AL.map((a, j) => [a, -K[j].yBdd]), culoare: 0 }, { tip: "linie", punctat: true, pts: AL.map((a, j) => [a, xi[j].a]), culoare: 1 }, { tip: "pct", pts: [[k, -K[k].yBdd]], culoare: 0 }] }));
  };
  desen();
  let tg = 0;
  return {
    pas(dt) {
      if (st.ruleaza) st.alfa = (st.alfa + dt * (st.viteza || 0.5) * 360) % 360;
      const k = MC.cinematicaExacta(geo, st.alfa, om); mec.pozeaza(st.alfa, [{ yB: k.yB, p: 0.1 }], null, 0, 0, 1);
      et.pune(V3(0, k.yB + R0.D * 0.6, 0)); et.text(`x = <b>${nr((R0.R + R0.L - k.yB) * 1e3, 2)} mm</b> · v = <b>${nr(-k.yBd, 2)} m/s</b>`);
      sc3.hud(`α = <b>${Math.round(st.alfa)}°</b> · a = <b>${nr(-k.yBdd, 0)} m/s²</b> · ${varianta === "moto" ? "monocilindru 52,4 × 57,9 mm" : "r = 48 mm, l = 192 mm, ω = 233 rad/s"}`);
      afis(st.alfa); tg += dt; if (tg > 0.15) { tg = 0; desen(); }
    },
    raport() { return z.rez.innerHTML.replace(/<details>[\s\S]*<\/details>/, "") + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ studiile acționărilor electrice și hibride (în modul-m-ed.js) */
import { studiuReductor, studiuReductorReper, studiuPlanetar, studiuLinieP2, studiuGrupElectrogen } from "./modul-m-ed.js";

/* ------------------------------------------------------------------ montarea */
function listaStudii(ctx) {
  const t = ctx.tip, arch = ctx.S && ctx.S.hib ? ctx.S.hib.arch : null;
  if (t === "MAS" || t === "MAC") return [{ id: "mec", nume: "Mecanismul motorului proiectat" }, { id: "ref", nume: "Test cinematic de referință" }];
  if (t === "MOTO") return [{ id: "mec", nume: "Mecanismul monocilindrului" }, { id: "refm", nume: "Reperul monocilindrului 4T" }, { id: "ref", nume: "Test cinematic de referință" }];
  if (t === "BEV" || t === "LCV") return [{ id: "red", nume: "Reductorul și vibrațiile torsionale" }, { id: "redref", nume: "Test de referință al angrenării" }];
  if (t === "HEV") return [arch === "PS" ? { id: "pl", nume: "Planetarul serie-paralel (Willis)" } : arch === "S" ? { id: "ge", nume: "Grupul electrogen serie" } : { id: "p2", nume: "Linia de arbori P2 (K0)" },
    ...(arch !== "PS" ? [{ id: "pl", nume: "Planetar – test de referință" }] : []), ...(arch !== "P2" ? [{ id: "p2", nume: "Paralel P2 – test de referință" }] : []), { id: "p0", nume: "Mild hybrid P0 – starter-generator" }, { id: "redref", nume: "Angrenarea – test de referință" }];
  return [];
}

export default {
  monteaza(el, ctx, shell) {
    const sk = schelet(el, "Modulul M · dinamică multicorp", "Mecanismele propulsorului proiectat ca sistem de corpuri rigide legate prin articulații: pozițiile din ecuațiile de închidere, vitezele și accelerațiile din constrângeri, forțele și momentele din ecuațiile Newton–Euler; pentru transmisii, turațiile, cuplurile, forțele din dantură și frecvențele proprii torsionale.");
    let idActiv = null, c = ctx;
    const H = { zonaLucru, camp, citeste, comenziAnim, legaAnim };
    function porneste(id) {
      idActiv = id; STUDIU = null;
      const fac = {
        mec: (z) => studiuMecanism(z, c, dateMotor(c)), ref: (z) => studiuReferinta(z, c, "excel"), refm: (z) => studiuReferinta(z, c, "moto"),
        red: (z) => studiuReductor(z, c, H), redref: (z) => studiuReductorReper(z, c, H), pl: (z) => studiuPlanetar(z, c, H),
        p2: (z) => studiuLinieP2(z, c, H, false), p0: (z) => studiuLinieP2(z, c, H, true), ge: (z) => studiuGrupElectrogen(z, c, H)
      };
      try { STUDIU = fac[id](sk.corp); shell.stareModul("M", "ok", "calculat"); }
      catch (e) { console.error(e); sk.corp.insertAdjacentHTML("beforeend", `<div class="alerta">Studiul nu s-a putut calcula: ${e.message}</div>`); shell.stareModul("M", "inv", "eroare de calcul"); }
    }
    const lista = listaStudii(c);
    if (!lista.length) { sk.corp.innerHTML = `<div class="mod-incomplet">Neaplicabil pentru acest tip.</div>`; return { actualizeaza() {} }; }
    comutatorStudii(sk.studii, lista, porneste, lista[0].id);
    porneste(lista[0].id);
    return { actualizeaza(n) { c = n; porneste(idActiv); }, arata(b) { if (SC) SC.activ(b); } };
  },
  raport(ctx) { return raportM(ctx); }
};

function raportM(ctx) {
  const dm = dateMotor(ctx);
  if (dm) {
    const per = dm.tau === 2 ? 360 : 720, ord = MC.ordineAprindere(dm.i, dm.tau), g = { R: dm.S / 2, L: dm.S / 2 / dm.lam, e: 0, D: dm.D }, lA = 0.275 * g.L;
    const m = { m_gp: 1.3 * dm.m_p, m_b: dm.m_b, lA, J_G: dm.m_b * lA * (g.L - lA) }, xs = dm.pa.map((q) => q[0]), ys = dm.pa.map((q) => q[1]);
    const s = MC.simuleazaMecanism(g, m, dm.n * Math.PI / 30, (a) => interp(xs, ys, a), { pas: 1, aMax: per }), mt = MC.momentTotal(s.alfa, s.M, ord.dec, per);
    const mx = (a) => Math.max(...a.map(Math.abs));
    return `<p>Mecanismul bielă-manivelă al motorului proiectat (${dm.eticheta}): D = ${nr(dm.D * 1e3, 1)} mm, S = ${nr(dm.S * 1e3, 1)} mm, L = ${nr(g.L * 1e3, 1)} mm, ${dm.i} cilindri, ordinea ${ord.ordine}; p(α) din ${dm.src}.</p>
      <table class="tabel"><tbody><tr><td>Accelerația la PMI</td><td>${nr(s.a[0], 0)} m/s²</td></tr><tr><td>Forța normală maximă</td><td>${nr(mx(s.N) / 1e3, 2)} kN</td></tr><tr><td>Forța tangențială maximă</td><td>${nr(Math.max(...s.T) / 1e3, 2)} kN</td></tr>
      <tr><td>Sarcina maximă pe maneton</td><td>${nr(Math.max(...s.Rm) / 1e3, 2)} kN</td></tr><tr><td>Momentul total: mediu / max / min</td><td>${nr(mt.med, 1)} / ${nr(mt.max, 0)} / ${nr(mt.min, 0)} N·m</td></tr>
      <tr><td>Închiderea cinematică / bilanțul lucrului</td><td>${s.inchidere.toExponential(1)} m / ${s.bilant.toExponential(1)}</td></tr></tbody></table>`;
  }
  return `<p>Rezultatele studiilor modulului M pentru acest tip de propulsie se tipăresc din pagina modulului (studiul deschis).</p>`;
}
