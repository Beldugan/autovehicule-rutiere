/* Modulul M – studiile acționărilor electrice și ale hibridelor: reductorul cu analiza torsională (diagrama Campbell),
   testul angrenării, planetarul (relația Willis), linia de arbori P2 cu ambreiajul K0, starter-generatorul P0, grupul electrogen serie. */
import { grafic, lim, fx, tabelVerificare, concluzie, V3, THREE, MAT, sageata } from "./scena.js";
import * as MC from "./multicorp.js";
import { reductorEV, roataDintata, planetar, linieArbori } from "./macheta3d.js";

const nr = (v, d = 2) => fx(v, d);
const W = (n) => n * Math.PI / 30;

/* ------------------------------------------------------------------ datele acționării electrice din proiect */
function dateEM(ctx) {
  const R = ctx.R, tip = ctx.tip;
  let c = null, hist = null, veh = null;
  if (tip === "BEV" && R && R.c) { c = R.c; hist = R.r1 && R.r1.hist; }
  if (tip === "LCV" && R && (R.cFull || R.c)) { c = R.cFull || R.c; hist = R.route && R.route.hist; }
  if (!c) return null;
  const d0 = c.drives[0], em = d0.em; veh = c.veh;
  return { P: em.P, T: em.T_max, n: em.n_max, i: Array.isArray(d0.i) ? d0.i[0] : d0.i, eta: d0.eta || 0.97, m: veh.m, rw: veh.rw, hist, nume: ctx.S && ctx.S.key };
}

/* ------------------------------------------------------------------ reductorul proiectului: turații, cupluri, forțe, NVH */
export function studiuReductor(corp, ctx, H) {
  const e = dateEM(ctx);
  if (!e) { corp.innerHTML = `<div class="mod-incomplet">Lipsesc datele acționării (capitolul 3).</div>`; return null; }
  // numerele de dinți: căutarea combinației cu raportul cel mai apropiat de cel din proiect (z1 = 17…23, z3 = 15…21, i1 ≈ √i)
  let z1 = 19, z2 = 60, z3 = 17, z4 = 48, best = Infinity;
  for (let a = 17; a <= 23; a++) for (let c = 15; c <= 21; c++) { const b = Math.round(a * Math.sqrt(e.i) * 1.05), d = Math.round(c * e.i / (b / a)), er = Math.abs((b / a) * (d / c) / e.i - 1); if (er < best - 1e-9) { best = er; z1 = a; z2 = b; z3 = c; z4 = d; } }
  const H0 = e.hist ? e.hist.length - 1 : 0;
  const par = `${H.camp("z1", "z<sub>1</sub> pinion treapta 1", z1, 1)}${H.camp("z2", "z<sub>2</sub> roata treptei 1", z2, 1)}${H.camp("z3", "z<sub>3</sub> pinion treapta 2", z3, 1)}${H.camp("z4", "z<sub>4</sub> coroana diferențialului", z4, 1)}
    ${H.camp("m1", "modulul treptei 1", 2, 0.25, "mm")}${H.camp("m2", "modulul treptei 2", 2.75, 0.25, "mm")}${H.camp("eta", "randamentul unei trepte", 0.985, 0.005)}
    ${H.camp("Jr", "J rotor", +(0.0004 * e.P).toFixed(4), 0.001, "kg·m²")}${H.camp("k1", "rigiditatea arborelui rotorului", 15000, 1000, "N·m/rad")}${H.camp("khs", "rigiditatea planetarelor (ambele)", 12000, 500, "N·m/rad")}
    <label>punctul de funcționare<select data-p="punct"><option value="Tmax">cuplul maxim (pornire)</option><option value="Pmax">puterea maximă la n<sub>max</sub></option>${e.hist ? `<option value="ciclu">punctul din simularea capitolului 5</option>` : ""}</select></label>
    ${e.hist ? `<label>momentul t [s]<input type="range" data-p="t" min="0" max="${H0}" step="1" value="${Math.round(H0 * 0.47)}"></label>` : ""}`;
  const z = H.zonaLucru(corp, `<button type="button" data-a="play">⏸ Pauză</button><label>încetinire <input type="range" data-a="viteza" min="0.002" max="0.05" step="0.002" value="0.01"></label>`, par), sc3 = z.sc3;
  const st = { ruleaza: true, k: 0.01, fi: 0 };
  z.comenzi.querySelector('[data-a="play"]').addEventListener("click", (ev) => { st.ruleaza = !st.ruleaza; ev.target.textContent = st.ruleaza ? "⏸ Pauză" : "▶ Pornește"; });
  z.comenzi.querySelector('[data-a="viteza"]').addEventListener("input", (ev) => { st.k = +ev.target.value; });
  const Gc = grafic(z.graf, "Diagrama Campbell: ordinele de rotație și de angrenare față de frecvențele proprii torsionale", 260), Gm = grafic(z.graf, "Formele proprii ale lanțului torsional (raportate la arborele motorului)", 220);
  let red = null, r = null, et = null;
  function calc() {
    const p = H.citeste(z.par), i12 = p.z2 / p.z1, i34 = p.z4 / p.z3, i = i12 * i34;
    let n1, T1, sursa;
    if (p.punct === "Pmax") { n1 = e.n; T1 = e.P * 1e3 / W(e.n); sursa = "puterea maximă la turația maximă"; }
    else if (p.punct === "ciclu" && e.hist) { const h = e.hist[Math.min(H0, Math.round(p.t))]; T1 = h[10]; n1 = Math.abs(h[11]) * 30 / Math.PI; sursa = `simularea capitolului 5, t = ${Math.round(p.t)} s (v = ${nr(h[1], 1)} km/h)`; }
    else { n1 = Math.min(e.n, e.P * 1e3 / e.T / (Math.PI / 30)); T1 = e.T; sursa = "cuplul maxim la turația de bază"; }
    const s1 = MC.treapta(p.z1, p.z2, n1, T1, p.m1, p.eta), s2 = MC.treapta(p.z3, p.z4, Math.abs(s1.n2), s1.M2, p.m2, p.eta);
    const Pin = T1 * W(n1), Pout = s2.M2 * W(Math.abs(s2.n2)), Pp = Pin - Pout;
    // reacțiunile lagărelor arborelui intermediar (roata 2 la 0,3·l, pinionul 3 la 0,7·l)
    const F2 = V3(0, s1.Fr, s1.Ft), F3 = V3(0, -s2.Fr, -s2.Ft), RB = F2.clone().multiplyScalar(0.3).add(F3.clone().multiplyScalar(0.7)), RA = F2.clone().add(F3).sub(RB);
    // lanțul torsional raportat la arborele motorului
    const J = [p.Jr, 0.00025 + 0.004 / (i12 * i12), 0.06 / (i * i), (e.m * e.rw * e.rw + 4 * 0.9) / (i * i)], k = [p.k1, 60000 / (i12 * i12), p.khs / (i * i)];
    const md = MC.modTorsional(J, k);
    r = { p, i, i12, i34, n1, T1, sursa, s1, s2, Pin, Pout, Pp, RA, RB, md, J, k };
    // macheta
    sc3.goleste(sc3.grup); red = reductorEV([p.z1, p.z2, p.z3, p.z4], [p.m1 / 1000, p.m2 / 1000]); red.G.position.set(0, 0.09, 0.05); sc3.grup.add(red.G);
    sc3.incadreaza([0.9, 0.45, 0.35], [0, 0, 0]);
    et = { a1: sc3.eticheta(""), a2: sc3.eticheta(""), a3: sc3.eticheta(""), f1: sc3.eticheta(""), f2: sc3.eticheta("") };
    rezultate();
  }
  function rezultate() {
    const { p, s1, s2, md } = r, f1 = s1.f, f2 = s2.f, nmax = e.n;
    const ord = [[1, "rotația rotorului (ordinul 1)"], [p.z1, `angrenarea 1 (ordinul ${p.z1})`], [p.z3 * p.z1 / p.z2, `angrenarea 2 (ordinul ${nr(p.z3 * p.z1 / p.z2, 2)})`]];
    const rez = []; md.slice(1).forEach((m, j) => ord.forEach(([o, nume]) => { const nc = 60 * m.f / o; if (nc > 300 && nc < nmax) rez.push([j + 1, m.f, nume, nc]); }));
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Mărime</th><th class="num">Treapta 1</th><th class="num">Treapta 2</th><th>Unitate</th></tr></thead><tbody>
      <tr><td>Raportul (total i = ${nr(r.i, 3)}; proiect ${nr(e.i, 3)})</td><td class="num">${nr(r.i12, 3)}</td><td class="num">${nr(r.i34, 3)}</td><td>–</td></tr>
      <tr><td>Turația de intrare / de ieșire</td><td class="num">${nr(r.n1, 0)} / ${nr(s1.n2, 0)}</td><td class="num">${nr(-s1.n2, 0)} / ${nr(-s2.n2 * -1, 0)}</td><td>rot/min</td></tr>
      <tr><td>Cuplul de intrare / de ieșire</td><td class="num">${nr(r.T1, 1)} / ${nr(s1.M2, 1)}</td><td class="num">${nr(s1.M2, 1)} / ${nr(s2.M2, 1)}</td><td>N·m</td></tr>
      <tr><td>Diametrele de divizare d<sub>pinion</sub> / d<sub>roată</sub></td><td class="num">${nr(s1.d1 * 1e3, 1)} / ${nr(s1.d2 * 1e3, 1)}</td><td class="num">${nr(s2.d1 * 1e3, 1)} / ${nr(s2.d2 * 1e3, 1)}</td><td>mm</td></tr>
      <tr><td>Forța tangențială / radială în dantură</td><td class="num">${nr(s1.Ft / 1e3, 2)} / ${nr(s1.Fr / 1e3, 2)}</td><td class="num">${nr(s2.Ft / 1e3, 2)} / ${nr(s2.Fr / 1e3, 2)}</td><td>kN</td></tr>
      <tr><td>Frecvența de angrenare f = z·n/60</td><td class="num">${nr(f1, 0)}</td><td class="num">${nr(f2, 0)}</td><td>Hz</td></tr>
      <tr class="sectiune"><td colspan="4">Arborele intermediar și bilanțul puterii</td></tr>
      <tr><td>Reacțiunile lagărelor A / B</td><td class="num" colspan="2">${nr(r.RA.length() / 1e3, 2)} / ${nr(r.RB.length() / 1e3, 2)} kN</td><td></td></tr>
      <tr><td>Puterea la intrare / la ieșire / pierderile</td><td class="num" colspan="2">${nr(r.Pin / 1e3, 2)} / ${nr(r.Pout / 1e3, 2)} / ${nr(r.Pp / 1e3, 3)} kW</td><td></td></tr>
      <tr class="sectiune"><td colspan="4">Frecvențele proprii torsionale (lanțul liber–liber: rotor – treapta 1 – diferențial – vehicul)</td></tr>
      ${md.map((m, j) => `<tr><td>Modul ${j}${j === 0 ? " (de corp rigid)" : ""}</td><td class="num" colspan="2">${nr(m.f, j === 0 ? 3 : 1)} Hz</td><td>${m.forma.map((v) => nr(v, 2)).join(" · ")}</td></tr>`).join("")}
      </tbody></table></div><p class="nota">Punctul de funcționare: ${r.sursa}. Momentele de inerție și rigiditățile sunt valori adoptate (de înlocuit cu datele CAD și de catalog).</p>`;
    z.ver.innerHTML = `<h3>Concluzii</h3>
      ${concluzie(Math.abs(r.i / e.i - 1) < 0.02 ? "ok" : "av", `Raportul realizat cu dinții aleși este ${nr(r.i, 3)}, față de ${nr(e.i, 3)} în proiect (abatere ${nr((r.i / e.i - 1) * 100, 2)} %, prag 2 %).`)}
      ${concluzie(Math.abs(r.Pp - (r.Pin - r.Pout)) < 1e-6 ? "ok" : "rau", `Bilanțul puterii se închide: P<sub>intrare</sub> − P<sub>ieșire</sub> = ${nr(r.Pp, 1)} W, egal cu pierderile din cele două angrenări (η = ${p.eta} pe treaptă).`)}
      ${concluzie(rez.length ? "av" : "ok", rez.length ? `Încrucișări în domeniul de turație (0…${nmax} rot/min): ${rez.map(([j, f, nume, nc]) => `modul ${j} (${nr(f, 0)} Hz) cu ${nume} la <b>${nr(nc, 0)} rot/min</b>`).join("; ")}. Se verifică amortizarea și amplitudinea excitației (rigiditatea variabilă a angrenării) înainte de a trage o concluzie de zgomot.` : "Nicio încrucișare a ordinelor considerate cu modurile proprii în domeniul de turație.")}
      ${concluzie("nd", "Zgomotul radiat nu se poate concluziona din acest model: lipsesc structura carcasei, rigiditatea variabilă a danturii și excitațiile electromagnetice documentate.")}`;
    const fmax = Math.max(...md.map((m) => m.f)) * 1.15, xs = [0, nmax];
    Gc.deseneaza({ xmin: 0, xmax: nmax, ymin: 0, ymax: Math.min(fmax, p.z1 * nmax / 60 * 1.05), xlab: "n motor [rot/min]", ylab: "f [Hz]",
      serii: [...ord.map(([o], j) => ({ tip: "linie", pts: xs.map((n) => [n, o * n / 60]), culoare: j })), ...md.slice(1).map((m) => ({ tip: "linie", punctat: true, pts: xs.map((n) => [n, m.f]), culoare: 3 })), { tip: "pct", pts: rez.map(([, f, , nc]) => [nc, f]), culoare: 4, r: 6, gol: true }],
      legenda: [...ord.map(([, nume], j) => [nume, j]), ["frecvențe proprii", 3], ["rezonanțe posibile", 4, "gol"]] });
    Gm.deseneaza({ xmin: 0, xmax: 3, ymin: -1.1, ymax: 1.1, xticks: [0, 1, 2, 3], fmtX: (v) => ["rotor", "treapta 1", "diferențial", "vehicul"][Math.round(v)] || "", xlab: "inerția", ylab: "amplitudine relativă",
      serii: md.slice(1).map((m, j) => ({ tip: "linie", pts: m.forma.map((v, q) => [q, v]), culoare: j })), legenda: md.slice(1).map((m, j) => [`modul ${j + 1}: ${nr(m.f, 1)} Hz`, j]) });
  }
  z.par.addEventListener("change", calc); z.par.addEventListener("input", (ev) => { if (ev.target.type === "range") calc(); });
  calc();
  return {
    pas(dt) {
      if (!red) return;
      if (st.ruleaza) st.fi += W(r.n1) * dt * st.k;
      const sc = 0.06 / Math.max(r.s1.Ft, r.s2.Ft, 1);
      red.pozeaza(st.fi, r.i12, r.i34, r.s1.Ft, r.s2.Ft, sc);
      const g = red.G.position;
      et.a1.pune(V3(-0.12, 0.15, 0).add(g)); et.a1.text(`motor <b>${nr(r.n1, 0)} rot/min</b> · ${nr(r.T1, 0)} N·m`);
      et.a2.pune(V3(0.12, -red.a12 + 0.06, 0.05).add(g)); et.a2.text(`intermediar <b>${nr(-r.s1.n2, 0)} rot/min</b>`);
      et.a3.pune(V3(0.12, -red.a12 - 0.05, -red.a34).add(g)); et.a3.text(`diferențial <b>${nr(r.s2.n2 * -1 * -1, 0)} rot/min</b> · ${nr(r.s2.M2, 0)} N·m`);
      et.f1.pune(red.contact1.clone().add(g)); et.f1.text(`F<sub>t1</sub> <b>${nr(r.s1.Ft / 1e3, 2)} kN</b> · f<sub>z1</sub> ${nr(r.s1.f, 0)} Hz`);
      et.f2.pune(red.contact2.clone().add(g)); et.f2.text(`F<sub>t2</sub> <b>${nr(r.s2.Ft / 1e3, 2)} kN</b>`);
      sc3.hud(`P = <b>${nr(r.Pin / 1e3, 1)} kW</b> · i = <b>${nr(r.i, 3)}</b> · animație încetinită de ${nr(1 / st.k, 0)} ori`);
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ testul angrenării de referință */
export function studiuReductorReper(corp, ctx, H) {
  const par = `${H.camp("z1", "z<sub>1</sub>", 20, 1)}${H.camp("z2", "z<sub>2</sub>", 60, 1)}${H.camp("n1", "n<sub>1</sub>", 6000, 100, "rot/min")}${H.camp("T1", "cuplul de intrare", 30, 1, "N·m")}${H.camp("eta", "randamentul", 1, 0.005)}`;
  const z = H.zonaLucru(corp, `<span class="nota">Animația este încetinită de 200 de ori; pentru a rezolva 2 kHz cu 20 de puncte pe perioadă pasul ar fi 25 µs.</span>`, par), sc3 = z.sc3;
  let g1, g2, r, fi = 0, sa;
  function calc() {
    const p = H.citeste(z.par); r = Object.assign(MC.treapta(p.z1, p.z2, p.n1, p.T1, 2, p.eta), { p });
    sc3.goleste(sc3.grup); const M = MAT();
    g1 = roataDintata(p.z1, 0.0035, 0.03, M.otel); g2 = roataDintata(p.z2, 0.0035, 0.03, M.otelI); const a = 0.0035 * (p.z1 + p.z2) / 2;
    g2.position.y = -a; sc3.grup.add(g1, g2);
    [0, -a].forEach((y) => { const ar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 16).rotateZ(Math.PI / 2), M.crom); ar.position.y = y; sc3.grup.add(ar); });
    sa = sageata(0xe53935, 0.003); sc3.grup.add(sa);
    sc3.incadreaza([0.32, 0.0, 0.32], [0, -a / 2, 0]);
    r.et = [sc3.eticheta(""), sc3.eticheta("")];
    const pBal = r.P1 - r.M2 * W(Math.abs(r.n2)), ok = p.z1 === 20 && p.z2 === 60 && p.n1 === 6000 && p.T1 === 30 && p.eta === 1;
    z.rez.innerHTML = (ok ? tabelVerificare([["Turația roții conduse", "n<sub>2</sub>", r.n2, -2000, "rot/min", 2, 1e-9], ["Frecvența de angrenare", "f = z<sub>1</sub>·n<sub>1</sub>/60", r.f, 2000, "Hz", 1, 1e-9],
      ["Puterea de intrare", "P = M·ω", r.P1 / 1e3, 18.85, "kW", 3, 0.01], ["Cuplul de ieșire (ideal)", "|M<sub>2</sub>|", r.M2, 90, "N·m", 2, 1e-9]]) : "") +
      `<table class="tabel"><tbody><tr><td>n<sub>2</sub></td><td class="num">${nr(r.n2, 1)} rot/min</td></tr><tr><td>f<sub>angrenare</sub> / f<sub>rotație</sub></td><td class="num">${nr(r.f, 1)} Hz / ${nr(p.n1 / 60, 1)} Hz</td></tr>
      <tr><td>P<sub>1</sub> / P<sub>2</sub></td><td class="num">${nr(r.P1 / 1e3, 3)} / ${nr(r.M2 * W(Math.abs(r.n2)) / 1e3, 3)} kW</td></tr><tr><td>Bilanțul puterii (cu porturile orientate)</td><td class="num">${nr(pBal, 3)} W</td></tr></tbody></table>`;
    z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie("ok", `Raportul cinematic este ${nr(p.z2 / p.z1, 3)}; semnul negativ al lui n<sub>2</sub> arată sensul opus al angrenării exterioare.`)}
      ${concluzie("ok", `Frecvența de angrenare (${nr(r.f, 0)} Hz) este de ${p.z1} ori frecvența de rotație a pinionului (${nr(p.n1 / 60, 1)} Hz): ordinele nu se confundă.`)}
      ${concluzie(p.eta === 1 ? "ok" : "av", p.eta === 1 ? "În modelul ideal fără pierderi puterea de ieșire este egală cu cea de intrare (bilanț nul)." : `Cu η = ${p.eta} puterea livrată scade cu ${nr(pBal, 1)} W.`)}`;
  }
  z.par.addEventListener("change", calc); calc();
  return { pas(dt) { fi += W(r.p.n1) * dt / 200; g1.rotation.x = fi; g2.rotation.x = -fi * r.p.z1 / r.p.z2 + Math.PI / r.p.z2; const a = 0.0035 * (r.p.z1 + r.p.z2) / 2;
      sa.seteaza(V3(0, -0.0035 * r.p.z1 / 2, -0.05), V3(0, 0, 1), 0.05); r.et[0].pune(V3(0, 0.05, 0)); r.et[0].text(`pinion z<sub>1</sub> = ${r.p.z1} · <b>${nr(r.p.n1, 0)} rot/min</b>`);
      r.et[1].pune(V3(0, -a - 0.07, 0)); r.et[1].text(`roata z<sub>2</sub> = ${r.p.z2} · <b>${nr(r.n2, 0)} rot/min</b> · ${nr(r.M2, 0)} N·m`); z.sc3.hud(`f<sub>angrenare</sub> = <b>${nr(r.f, 0)} Hz</b>`); },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}

/* ------------------------------------------------------------------ planetarul (Willis) */
export function studiuPlanetar(corp, ctx, H) {
  const hib = ctx.S && ctx.S.hib, ps = hib && hib.arch === "PS";
  const par = `${H.camp("Ns", "N<sub>s</sub> soare", 30, 1)}${H.camp("Nr", "N<sub>r</sub> coroană", 78, 1)}${H.camp("nc", "n<sub>c</sub> termic (port-sateliți)", 2000, 50, "rot/min")}${H.camp("nr", "n<sub>r</sub> coroană (MG2, ieșire)", 1000, 50, "rot/min")}${H.camp("Tc", "T<sub>c</sub> cuplul termicului", 100, 5, "N·m")}`;
  const z = H.zonaLucru(corp, `<span class="nota">Termicul pe port-sateliți, MG1 pe soare, MG2 și ieșirea pe coroană. Animație încetinită de 100 de ori.</span>`, par), sc3 = z.sc3;
  const Gl = grafic(z.graf, "Nomograma turațiilor (diagrama pârghiei): soare – port-sateliți – coroană"), Gp = grafic(z.graf, "Bilanțul puterilor la porturile planetarului");
  let pl, r, f = { s: 0, c: 0, r: 0 }, et;
  function calc() {
    const p = H.citeste(z.par); r = MC.willis(p.Ns, p.Nr, { nc: p.nc, nr: p.nr, Tc: p.Tc }); r.p = p;
    sc3.goleste(sc3.grup); pl = planetar(p.Ns, p.Nr, Math.round((p.Nr - p.Ns) / 2)); sc3.grup.add(pl.G); sc3.incadreaza([0.36, 0.14, 0.3], [0, 0, 0]);
    et = [sc3.eticheta(""), sc3.eticheta(""), sc3.eticheta("")];
    const ref = p.Ns === 30 && p.Nr === 78 && p.nc === 2000 && p.nr === 1000 && p.Tc === 100;
    const lim1 = { P: 30e3, T: 60, n: 10000 }, ok1 = Math.abs(r.ns) <= lim1.n && Math.abs(r.Ts) <= lim1.T && Math.abs(r.Ps * 1e3) <= lim1.P;
    z.rez.innerHTML = (ref ? tabelVerificare([["Turația soarelui (MG1)", "n<sub>s</sub>", r.ns, 4600, "rot/min", 1, 1e-9], ["Cuplul la soare", "T<sub>s</sub>", r.Ts, -27.7778, "N·m", 4, 1e-4], ["Cuplul la coroană", "T<sub>r</sub>", r.Tr, -72.2222, "N·m", 4, 1e-4],
      ["Puterea termicului", "P<sub>c</sub>", r.Pc, 20.944, "kW", 3, 0.01], ["Puterea la soare", "P<sub>s</sub>", r.Ps, -13.381, "kW", 3, 0.01], ["Puterea la coroană", "P<sub>r</sub>", r.Pr, -7.563, "kW", 3, 0.01]]) : "") +
      `<table class="tabel"><tbody><tr><td>Condiția de montaj N<sub>s</sub> + 2N<sub>p</sub> = N<sub>r</sub></td><td class="num">${p.Ns} + 2·${nr(r.Np, 1)} = ${p.Nr}</td></tr>
      <tr><td>Raportul k = N<sub>r</sub>/N<sub>s</sub>${ps ? ` (proiect: ${nr(hib.k, 2)})` : ""}</td><td class="num">${nr(r.k, 3)}</td></tr>
      <tr><td>Turațiile s / c / r</td><td class="num">${nr(r.ns, 0)} / ${nr(r.nc, 0)} / ${nr(r.nr, 0)} rot/min</td></tr>
      <tr><td>Cuplurile s / c / r</td><td class="num">${nr(r.Ts, 3)} / ${nr(r.Tc, 1)} / ${nr(r.Tr, 3)} N·m</td></tr>
      <tr><td>Puterile s / c / r și suma</td><td class="num">${nr(r.Ps, 3)} / ${nr(r.Pc, 3)} / ${nr(r.Pr, 3)} kW · Σ = ${nr(r.Ps + r.Pc + r.Pr, 6)} kW</td></tr></tbody></table>`;
    z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie("ok", `Relația Willis (N<sub>s</sub> + N<sub>r</sub>)·ω<sub>c</sub> = N<sub>s</sub>·ω<sub>s</sub> + N<sub>r</sub>·ω<sub>r</sub> fixează a treia turație: impunând n<sub>c</sub> și n<sub>r</sub> rezultă n<sub>s</sub> = ${nr(r.ns, 0)} rot/min.`)}
      ${concluzie(Math.abs(r.Ps + r.Pc + r.Pr) < 1e-9 ? "ok" : "rau", `Suma puterilor la porturi este ${nr((r.Ps + r.Pc + r.Pr) * 1e3, 6)} W: planetarul ideal nu stochează și nu disipă energie.`)}
      ${concluzie(r.Ps < 0 ? "ok" : "av", r.Ps < 0 ? `P<sub>s</sub> < 0: MG1 preia ${nr(-r.Ps, 2)} kW mecanic, deci funcționează ca generator (semnul se judecă după putere, nu după sensul de rotație).` : `P<sub>s</sub> > 0: MG1 furnizează putere (motor).`)}
      ${concluzie(ok1 ? "ok" : "rau", `Limitele adoptate pentru MG1 (±30 kW, ±60 N·m, 10 000 rot/min): ${ok1 ? "respectate" : "depășite – punctul nu este admisibil"}.`)}`;
    const k = r.k, xs = [0, 1 / (1 + k) * 0 + k / (1 + k), 1];
    // pe axa x: soarele la 0, port-sateliții la k/(1+k), coroana la 1 (distanțele proporționale cu numerele de dinți)
    Gl.deseneaza({ xmin: -0.05, xmax: 1.05, ...(() => { const l = lim([r.ns, r.nc, r.nr, 0]); return { ymin: l[0], ymax: l[1] }; })(), xticks: xs, fmtX: (v) => (v === 0 ? "S (MG1)" : v === 1 ? "R (MG2, ieșire)" : "C (termic)"), xlab: "", ylab: "n [rot/min]",
      serii: [{ tip: "linie", pts: [[0, r.ns], [xs[1], r.nc], [1, r.nr]], culoare: 0 }, { tip: "pct", pts: [[0, r.ns], [xs[1], r.nc], [1, r.nr]], culoare: 1 }, { tip: "linie", punctat: true, pts: [[0, 0], [1, 0]], culoare: 3 }] });
    Gp.deseneaza({ xmin: 0, xmax: 3, ymin: Math.min(r.Ps, r.Pr, r.Pc, 0) * 1.2, ymax: Math.max(r.Ps, r.Pr, r.Pc, 0) * 1.2 + 0.01, xticks: [0.5, 1.5, 2.5], fmtX: (v) => ["soare", "port-sateliți", "coroană"][Math.floor(v)], xlab: "portul", ylab: "P [kW]",
      serii: [[0.5, r.Ps], [1.5, r.Pc], [2.5, r.Pr]].map(([x, y], j) => ({ tip: "linie", gros: 16, pts: [[x, 0], [x, y]], culoare: j })) });
  }
  z.par.addEventListener("change", calc); calc();
  return { pas(dt) { const k = dt / 100; f.s += W(r.ns) * k; f.c += W(r.nc) * k; f.r += W(r.nr) * k; pl.pozeaza(f.s, f.c, f.r);
      et[0].pune(V3(0.08, 0, 0)); et[0].text(`soare (MG1) <b>${nr(r.ns, 0)} rot/min</b> · ${nr(r.Ps, 2)} kW`); et[1].pune(V3(-0.09, pl.a, 0)); et[1].text(`port-sateliți (termic) <b>${nr(r.nc, 0)}</b> · ${nr(r.Pc, 2)} kW`);
      et[2].pune(V3(0.03, -pl.a - pl.rpl * 1.9, 0)); et[2].text(`coroană (MG2) <b>${nr(r.nr, 0)}</b> · ${nr(r.Pr, 2)} kW`); z.sc3.hud(`Willis: (N<sub>s</sub>+N<sub>r</sub>)·n<sub>c</sub> = N<sub>s</sub>·n<sub>s</sub> + N<sub>r</sub>·n<sub>r</sub>`); },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}

/* ------------------------------------------------------------------ linia de arbori P2 (K0) și starter-generatorul P0 */
export function studiuLinieP2(corp, ctx, H, p0) {
  const par = p0
    ? `${H.camp("n", "turația termicului", 1000, 50, "rot/min")}${H.camp("kc", "raportul curelei n<sub>EM</sub>/n<sub>MAI</sub>", 2.5, 0.1)}${H.camp("Pem", "puterea EM (limită)", 10, 0.5, "kW")}${H.camp("Tem", "cuplul EM (limită)", 50, 1, "N·m")}${H.camp("eta", "randamentul EM + invertor", 0.9, 0.01)}${H.camp("U", "tensiunea bateriei", 48, 1, "V")}${H.camp("aux", "auxiliari", 0.5, 0.1, "kW")}${H.camp("Ilim", "limita de curent", 250, 5, "A")}`
    : `${H.camp("n", "turația arborelui comun", 2000, 50, "rot/min")}${H.camp("Pi", "puterea termicului", 15, 0.5, "kW")}${H.camp("Pe", "puterea EM", 5, 0.5, "kW")}${H.camp("eta", "η electric-mecanic EM", 0.9, 0.01)}${H.camp("etaI", "randamentul termicului", 0.32, 0.01)}${H.camp("Hi", "puterea calorifică", 43, 0.5, "MJ/kg")}<label>K0<select data-p="k0"><option value="1">închis (termic + EM)</option><option value="0">deschis (EV, termicul oprit)</option></select></label>`;
  const z = H.zonaLucru(corp, `<span class="nota">${p0 ? "Starter-generatorul (P0) antrenat prin curea de arborele cotit." : "Termic → K0 → arbore comun cu EM → cutie de viteze. Cu K0 deschis EM antrenează roțile fără să rotească termicul."} Animație încetinită de 150 de ori.</span>`, par), sc3 = z.sc3;
  const Gp = grafic(z.graf, p0 ? "Puterea mecanică maximă a starter-generatorului în funcție de turația termicului" : "Cuplurile pe arborele comun în funcție de împărțirea puterii (20 kW la 2000 rot/min)");
  let l, r, fI = 0, fE = 0, fB = 0, et;
  function calc() {
    const p = H.citeste(z.par);
    sc3.goleste(sc3.grup); l = linieArbori({ p0 }); sc3.grup.add(l.G); sc3.incadreaza([0.6, 0.55, 1.05], [-0.15, 0.02, 0]); et = [sc3.eticheta(""), sc3.eticheta(""), sc3.eticheta("")];
    if (p0) {
      const nE = p.n * p.kc, Plim = Math.min(p.Pem * 1e3, p.Tem * W(nE)), Pel = p.Pem * 1e3 / p.eta, I = Pel / p.U, It = (Pel + p.aux * 1e3) / p.U, nx = p.Pem * 1e3 / p.Tem / (Math.PI / 30);
      r = { p, nE, Plim, Pel, I, It, nx, Ti: 0, Te: Plim / W(nE) };
      const ref = p.kc === 2.5 && p.Pem === 10 && p.Tem === 50 && p.eta === 0.9 && p.U === 48 && p.aux === 0.5;
      z.rez.innerHTML = (ref ? tabelVerificare([["Puterea electrică la 10 kW mecanic", "P<sub>el</sub>", Pel / 1e3, 11.111, "kW", 3, 0.01], ["Curentul fără auxiliari", "I", I, 231.48, "A", 2, 0.01], ["Curentul cu auxiliari", "I<sub>t</sub>", It, 241.90, "A", 2, 0.01],
        ...(p.n === 1000 ? [["Turația EM la 1000 rot/min", "n<sub>EM</sub>", nE, 2500, "rot/min", 0, 1e-9], ["Puterea permisă de 50 N·m", "50·ω<sub>EM</sub>", 50 * W(nE) / 1e3, 13.09, "kW", 2, 0.05]] : []), ["Turația EM sub care domină cuplul", "n<sub>x</sub>", nx, 1910, "rot/min", 0, 0.05]]) : "") +
        `<table class="tabel"><tbody><tr><td>n<sub>EM</sub> = ${p.kc}·n<sub>MAI</sub></td><td class="num">${nr(nE, 0)} rot/min</td></tr><tr><td>Puterea mecanică disponibilă</td><td class="num">${nr(Plim / 1e3, 2)} kW (${Plim < p.Pem * 1e3 ? "limita de cuplu" : "limita de putere"} activă)</td></tr>
        <tr><td>Curentul la asistența maximă, cu auxiliari</td><td class="num">${nr(It, 2)} A · rezerva ${nr(p.Ilim - It, 2)} A</td></tr></tbody></table>`;
      z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie(It <= p.Ilim ? "ok" : "rau", `La ${p.Pem} kW mecanic și ${p.aux} kW auxiliari, I ≈ ${nr(It, 2)} A; rezerva față de limita adoptată de ${p.Ilim} A este ${nr(p.Ilim - It, 2)} A.`)}
        ${concluzie("ok", `Sub ${nr(nx, 0)} rot/min ale EM (${nr(nx / p.kc, 0)} rot/min ale termicului) limita de cuplu (${p.Tem} N·m) devine dominantă.`)}
        ${concluzie("nd", "P0 nu are mod EV independent de termic: EM este legat permanent de arborele cotit prin curea.")}`;
      const ns = Array.from({ length: 61 }, (_, j) => 500 + j * 100);
      Gp.deseneaza({ xmin: 500, xmax: 6500, ymin: 0, ymax: Math.ceil(p.Pem * 1.3), xlab: "n MAI [rot/min]", ylab: "P EM [kW]", serii: [{ tip: "linie", pts: ns.map((n) => [n, Math.min(p.Pem, p.Tem * W(n * p.kc) / 1e3)]), culoare: 0 }, { tip: "linie", punctat: true, pts: ns.map((n) => [n, p.Tem * W(n * p.kc) / 1e3]), culoare: 1 }, { tip: "pct", pts: [[p.n, Plim / 1e3]], culoare: 1 }], legenda: [["P disponibilă", 0], ["limita de cuplu", 1]] });
    } else {
      const k0 = p.k0 !== "0", w = W(p.n), Pi = k0 ? p.Pi * 1e3 : 0, Pe = k0 ? p.Pe * 1e3 : (p.Pi + p.Pe) * 1e3, Ti = Pi / w, Te = Pe / w, mf = Pi / (p.etaI * p.Hi * 1e6) * 3600;
      r = { p, k0, Ti, Te, Pel: Pe / p.eta, mf };
      const ref = p.n === 2000 && p.Pi === 15 && p.Pe === 5 && k0 && p.eta === 0.9 && p.etaI === 0.32 && p.Hi === 43;
      z.rez.innerHTML = (ref ? tabelVerificare([["Cuplul termicului", "T<sub>MAI</sub>", Ti, 71.62, "N·m", 2, 0.01], ["Cuplul EM", "T<sub>EM</sub>", Te, 23.87, "N·m", 2, 0.02], ["Cuplul pe arbore", "T", Ti + Te, 95.49, "N·m", 2, 0.01],
        ["Puterea electrică a EM", "P<sub>el</sub>", Pe / p.eta / 1e3, 5.556, "kW", 3, 0.01], ["Debitul de combustibil", "ṁ<sub>c</sub>", mf, 3.924, "kg/h", 3, 0.01]]) : "") +
        `<table class="tabel"><tbody><tr><td>Starea K0</td><td class="num">${k0 ? "închis" : "deschis – termicul oprit, arborele lui nu urmează roțile"}</td></tr><tr><td>T<sub>MAI</sub> + T<sub>EM</sub></td><td class="num">${nr(Ti, 2)} + ${nr(Te, 2)} = ${nr(Ti + Te, 2)} N·m</td></tr>
        <tr><td>Puterea electrică / debitul de combustibil</td><td class="num">${nr(Pe / p.eta / 1e3, 3)} kW / ${nr(mf, 3)} kg/h</td></tr></tbody></table>`;
      z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie("ok", "Cuplurile termicului și ale EM se însumează pe același arbore (aceeași turație): T = (P<sub>MAI</sub> + P<sub>EM</sub>)/ω.")}
        ${concluzie(k0 ? "nd" : "ok", k0 ? "Tranziția EV → termic cere sincronizarea turației și închiderea K0; inerțiile și pierderile ambreiajului nu sunt în acest model staționar." : "Cu K0 deschis, arborele termicului este oprit: modul EV nu forțează termicul să urmeze turația roților.")}`;
      const Ps = Array.from({ length: 21 }, (_, j) => j);
      Gp.deseneaza({ xmin: 0, xmax: 20, ymin: 0, ymax: 100, xlab: "P termic [kW] (din 20 kW)", ylab: "T [N·m]", serii: [{ tip: "linie", pts: Ps.map((x) => [x, x * 1e3 / W(2000)]), culoare: 1 }, { tip: "linie", pts: Ps.map((x) => [x, (20 - x) * 1e3 / W(2000)]), culoare: 0 }, { tip: "linie", punctat: true, pts: [[0, 95.49], [20, 95.49]], culoare: 2 }], legenda: [["T termic", 1], ["T EM", 0], ["T total", 2]] });
    }
  }
  z.par.addEventListener("change", calc); calc();
  return { pas(dt) { const k = dt / 150, p = r.p;
      if (p0) { fI += W(p.n) * k; fB += W(r.nE) * k; l.pozeaza(fI, fI, true, fB, 0, r.Te, 0.004); et[0].pune(V3(-0.68, 0.12, 0.25)); et[0].text(`starter-generator <b>${nr(r.nE, 0)} rot/min</b> · ${nr(r.Plim / 1e3, 1)} kW`); et[1].pune(V3(-0.45, 0.38, 0)); et[1].text(`termic <b>${nr(p.n, 0)} rot/min</b>`); et[2].arata(false); }
      else { fE += W(p.n) * k; if (r.k0) fI = fE; l.pozeaza(fI, fE, r.k0, 0, r.Ti, r.Te, 0.003); et[0].pune(V3(-0.45, 0.38, 0)); et[0].text(`termic <b>${nr(r.Ti, 1)} N·m</b>${r.k0 ? "" : " · oprit"}`); et[1].pune(V3(0, 0.2, 0)); et[1].text(`EM <b>${nr(r.Te, 1)} N·m</b>`); et[2].pune(V3(-0.17, -0.16, 0)); et[2].text(`K0 <b>${r.k0 ? "închis" : "deschis"}</b>`); }
      z.sc3.hud(p0 ? "P0: EM pe curea, raport fix față de termic" : `arbore comun: <b>${nr(p.n, 0)} rot/min</b> · T = <b>${nr(r.Ti + r.Te, 2)} N·m</b>`); },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}

/* ------------------------------------------------------------------ grupul electrogen al hibridului serie */
export function studiuGrupElectrogen(corp, ctx, H) {
  const par = `${H.camp("Ji", "J termic + volant", 0.15, 0.01, "kg·m²")}${H.camp("Jg", "J generator", 0.04, 0.005, "kg·m²")}${H.camp("kc", "rigiditatea cuplajului", 2500, 100, "N·m/rad")}${H.camp("cil", "numărul de cilindri (4T)", 4, 1)}${H.camp("n", "turația de lucru", 2500, 100, "rot/min")}`;
  const z = H.zonaLucru(corp, `<span class="nota">Arborele grupului electrogen (termic – cuplaj – generator) și arborele de tracțiune (EM – reductor – roți) nu au legătură mecanică.</span>`, par), sc3 = z.sc3;
  const Gc = grafic(z.graf, "Diagrama Campbell a grupului electrogen: ordinul principal de aprindere față de frecvența proprie a cuplajului");
  let r, fi = 0, gr, ga, et;
  function calc() {
    const p = H.citeste(z.par), md = MC.modTorsional([p.Ji, p.Jg], [p.kc]), f = md[1].f, ord = p.cil / 2, nCrit = 60 * f / ord;
    r = { p, f, ord, nCrit };
    sc3.goleste(sc3.grup); const M = MAT();
    gr = new THREE.Group(); ga = new THREE.Group(); sc3.grup.add(gr, ga);
    const bloc = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.24), M.fonta); bloc.position.set(-0.3, 0.05, 0.25); sc3.grup.add(bloc);
    const gen = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 40).rotateZ(Math.PI / 2), M.vopsea); gen.position.set(0.05, 0, 0.25); sc3.grup.add(gen);
    const ar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 16).rotateZ(Math.PI / 2), M.otel); ar1.position.set(-0.1, 0, 0); gr.add(ar1); gr.position.z = 0.25;
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), M.alb); sp.position.set(-0.1, 0, 0); gr.add(sp);
    const em = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 40).rotateZ(Math.PI / 2), M.albastru); em.position.set(-0.15, 0, -0.25); sc3.grup.add(em);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.2), M.alu); red.position.set(0.05, -0.04, -0.25); sc3.grup.add(red);
    const ar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.7, 16).rotateZ(Math.PI / 2), M.otel); ar2.position.set(0.2, -0.1, 0); ga.add(ar2); ga.position.z = -0.25;
    [-0.15, 0.55].forEach((x) => { const ro = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 40).rotateZ(Math.PI / 2), M.cauc); ro.position.set(x, -0.1, 0); ga.add(ro); });
    sc3.incadreaza([0.6, 0.5, 0.95], [0.05, 0, 0]); et = [sc3.eticheta(""), sc3.eticheta("")];
    const s = (window.PCMAI_SISTEM_REF || null); void s;
    z.rez.innerHTML = `<table class="tabel"><tbody><tr><td>Frecvența proprie a cuplajului termic–generator</td><td class="num">${nr(f, 2)} Hz</td></tr><tr><td>Ordinul principal de excitație (${p.cil} cil., 4T)</td><td class="num">${nr(ord, 1)}</td></tr>
      <tr><td>Turația critică n<sub>cr</sub> = 60·f/ordin</td><td class="num">${nr(nCrit, 0)} rot/min</td></tr><tr><td>Raportul turației de lucru față de n<sub>cr</sub></td><td class="num">${nr(p.n / nCrit, 2)}</td></tr></tbody></table>
      ${tabelVerificare([["Puterea DC a tracțiunii la 20 kW la roți", "20/(0,95·0,90)", 20 / (0.95 * 0.9), 23.392, "kW", 3, 0.01], ["Cu 1 kW auxiliari", "P<sub>DC</sub>", 20 / (0.95 * 0.9) + 1, 24.392, "kW", 3, 0.01], ["Puterea termicului la SOC constant", "P<sub>DC</sub>/0,90", (20 / (0.95 * 0.9) + 1) / 0.9, 27.102, "kW", 3, 0.01], ["Randamentul combustibil–roată", "0,32·0,90·0,90·0,95", 0.32 * 0.9 * 0.9 * 0.95, 0.246, "–", 3, 0.2]], "Echilibrul grupului electrogen (punct staționar)")}`;
    z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie(p.n > 1.4 * nCrit ? "ok" : "av", `Turația de lucru (${p.n} rot/min) ${p.n > 1.4 * nCrit ? "este suficient de departe" : "este apropiată"} de turația critică a cuplajului (${nr(nCrit, 0)} rot/min); la pornire și oprire rezonanța se traversează rapid.`)}
      ${concluzie("ok", "Turația termicului nu este impusă cinematic de viteza vehiculului (arbori separați) – condiția structurală a arhitecturii serie pure.")}`;
    const ns = [0, 6000];
    Gc.deseneaza({ xmin: 0, xmax: 6000, ymin: 0, ymax: Math.max(f * 2, 220), xlab: "n [rot/min]", ylab: "f [Hz]", serii: [{ tip: "linie", pts: ns.map((n) => [n, ord * n / 60]), culoare: 0 }, { tip: "linie", pts: ns.map((n) => [n, n / 60]), culoare: 2 }, { tip: "linie", punctat: true, pts: ns.map((n) => [n, f]), culoare: 3 }, { tip: "pct", pts: [[nCrit, f]], culoare: 1, r: 6, gol: true }], legenda: [[`ordinul ${ord}`, 0], ["ordinul 1", 2], ["frecvența proprie", 3]] });
  }
  z.par.addEventListener("change", calc); calc();
  return { pas(dt) { fi += W(r.p.n) * dt / 150; gr.rotation.x = fi; ga.rotation.x = fi * 0.4; et[0].pune(V3(-0.3, 0.28, 0.25)); et[0].text(`grup electrogen <b>${r.p.n} rot/min</b>`); et[1].pune(V3(-0.15, 0.18, -0.25)); et[1].text("tracțiune: EM – reductor – roți"); z.sc3.hud(`f<sub>cuplaj</sub> = <b>${nr(r.f, 1)} Hz</b> · n<sub>cr</sub> = <b>${nr(r.nCrit, 0)} rot/min</b>`); },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}
